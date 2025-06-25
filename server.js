const Express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const webpush = require("web-push");
const { send } = require("process");

const app = Express();

const publicVapidKey = process.env.PUBLIC_VAPID_KEY;
const privateVapidKey = process.env.PRIVATE_VAPID_KEY;

webpush.setVapidDetails(
  "mailto:vojtovidlo@atlas.cz",
  publicVapidKey,
  privateVapidKey
);

//Database setup
mongoose.connect(process.env.MONGO_URL);

const sessionModel = mongoose.model("Session", {
  token: { type: String, required: true, unique: true },
  person: { type: String, enum: ["vojtik", "hanca"] },
  ip: String,
  userAgent: String,
});

const userModel = mongoose.model("User", {
  person: { type: String, enum: ["vojtik", "hanca"] },
  lastCheckedCompliment: Number,
  lastSendCompliment: Number,
  dailyComplimentId: String,
});

const complimentModel = mongoose.model("Compliment", {
  personTo: { type: String, enum: ["vojtik", "hanca"] },
  text: String,
  createdAt: Number,
  reaction: String,
});

const openCardModel = mongoose.model("openCard", {
  heading: { type: String, unique: true, required: true },
  text: { type: String, required: true },
  seen: { type: Boolean, default: false },
});

const petsModel = mongoose.model("VHPets", {
  name: String,
  type: { type: String, enum: ["cat", "dog", "bunny"], required: true },
  hunger: { type: Number, default: 100 }, // More is better
  cuddleNeed: { type: Number, default: 100 }, // More is better
  playNeed: { type: Number, default: 100 }, // More is better
  lastHungerUpdate: { type: Number, default: Date.now },
  lastCuddleUpdate: { type: Number, default: Date.now },
  lastPlayUpdate: { type: Number, default: Date.now },
});

const usersHomeModel = mongoose.model("VHUsers", {
  name: String,
  hunger: { type: Number, default: 100 },
  tiredness: { type: Number, default: 100 }, // Less is better
  lastHungerUpdate: { type: Number, default: Date.now },
  lastTirednessUpdate: { type: Number, default: Date.now },
  isSleeping: { type: Boolean, default: false },
  lastSleepStart: { type: Number, default: Date.now }, // When the user sleep is starting
  lastSleepEnd: { type: Number }, // When the user sleep is ending
  tirednessRecoveredDuringSleep: { type: Number, default: 0 },
  isKid: { type: Boolean, default: false }, // If true, user is kid (no real user)
});

const foodModel = mongoose.model("VHFood", {
  name: { type: String, enum: ["bread", "pizza", "cake", "soup", "pasta"] },
  hungerValue: { type: Number, default: 20 },
  isForPets: { type: Boolean, default: true },
});

// Basic middleware
app.use((req, res, next) => {
  console.log(`${req.method} ON ${req.url}`);
  next();
});
app.use(Express.urlencoded());
app.use(Express.json());
app.use(cookieParser());

app.use("/", Express.static(__dirname + "/views/"));
app.use("/", Express.static(__dirname + "/public/"));

app.use("/api", async (req, res, next) => {
  //cookie auth
  const token = req.cookies.sesstoken;
  const sessionInDb = await sessionModel.findOne({ token });
  if (!sessionInDb) {
    return res
      .status(400)
      .send({ error: "User not logged in", isLoggedIn: false });
  }
  req.person = sessionInDb.person;
  const userObj = await userModel.findOne({ person: req.person });
  req.user = userObj;

  next();
});

app.post("/login", async (req, res) => {
  const { person, password } = req.body;
  console.log(person, password);

  const setCookie = async () => {
    // Hint cookie
    const oneYear = 1000 * 60 * 60 * 24 * 365; // ms in a year
    res.cookie("hintPerson", person, {
      maxAge: oneYear,
    });

    // Session token
    const token = crypto.randomBytes(64).toString("hex");
    const sessionObj = new sessionModel({
      token,
      ip: req.ip,
      person: person,
      userAgent: req.headers["user-agent"],
    });
    if (req.cookies.sesstoken) {
      //find in db
      const oldSessInDb = await sessionModel.findOne({
        token: req.cookies.sesstoken,
      });
      if (oldSessInDb) {
        await sessionModel.findOneAndDelete({ _id: oldSessInDb["_id"] });
      }
    }
    const sessionObjInDb = await sessionObj.save();
    res.cookie("sesstoken", token, {
      maxAge: oneYear,
      httpOnly: true,
      sameSite: "lax",
    });
  };

  if (person === "hanca" && password === process.env.HANCA) {
    await setCookie();
    return res.send({ success: true });
  }

  if (person === "vojtik" && password === process.env.VOJTIK) {
    await setCookie();
    return res.send({ success: true });
  }
  return res.status(400).send({ error: "Incorrect password" });
});

app.get("/logout", async (req, res) => {
  const token = req.cookies.sesstoken;
  const sessionInDb = await sessionModel.findOneAndDelete({ token });
  if (sessionInDb) {
    return res.send({ success: true });
  }
  res.status(500).send({ error: "internal server error" });
});
let hancaSubscription;
let vojtikSubscription;

const sendNotificationToSO = (person, payload) => {
  console.log(person);
  if (person === "hanca" && vojtikSubscription) {
    console.log("Sending notification to Vojtik");
    return webpush
      .sendNotification(vojtikSubscription, payload)
      .catch((err) => {
        console.error(err);
      });
  }
  if (person === "vojtik" && hancaSubscription) {
    console.log("Sending notification to Hanča");
    return webpush.sendNotification(hancaSubscription, payload).catch((err) => {
      console.error(err);
    });
  }
};

//Notification subscribe
app.post("/subscribe-hanca", (req, res) => {
  hancaSubscription = req.body;
  res.status(201).json({});
});

app.post("/subscribe-vojtik", (req, res) => {
  vojtikSubscription = req.body;
  res.status(201).json({});
});

app.get("/api/user", async (req, res) => {
  return res.send({
    success: true,
    user: req.user,
  });
});

app.get("/api/compliment", async (req, res) => {
  const user = req.user;
  const lastCheckedOn = new Date(user.lastCheckedCompliment);
  if (lastCheckedOn.getDate() === new Date().getDate()) {
    // Get compliment from today
    const complimentObj = await complimentModel.findById(
      user.dailyComplimentId
    );
    console.log(complimentObj);
    return res.send({
      success: true,
      compliment: complimentObj,
      alreadySeen: true,
    });
  }
  // Generate a new compliment

  //Get all compliments for the correct person
  const compliments = await complimentModel.find({ personTo: user.person });
  // Remove yesterdays compliment
  const filteredCompliments = compliments.filter(
    (el) => !el._id.equals(new mongoose.Types.ObjectId(user.dailyComplimentId))
  );
  //Get random one
  const randomCompliment =
    filteredCompliments[Math.floor(Math.random() * filteredCompliments.length)];
  //asign it into the user obj and change lastCheckedCompliment value
  user.dailyComplimentId = randomCompliment["_id"];
  user.lastCheckedCompliment = Date.now();
  await user.save();

  res.send({ success: true, compliment: randomCompliment });
});

app.post("/api/compliment", async (req, res) => {
  console.log(req.body);
  const user = req.user;
  const lastPostedOn = new Date(user.lastSendCompliment);
  if (lastPostedOn.getDay() === new Date().getDay()) {
    // Already posted today
    return res.send({
      error: "User already posted a compliment today",
      hasAlreadyPosted: true,
    });
  }
  // Post to database
  const compliment = new complimentModel({
    // revert person value
    personTo: user.person === "hanca" ? "vojtik" : "hanca",
    text: req.body.complimentText,
    createdAt: Date.now(),
  });
  await compliment.save();
  // update lastPosted variable
  user.lastSendCompliment = Date.now();
  await user.save();
  // Send notification to SO
  const payload = JSON.stringify({
    title: "New Compliment 🐳",
    body: `You have a new compliment from ${
      req.person === "hanca" ? "Hanča" : "Vojtík"
    }!`,
  });
  sendNotificationToSO(user.person, payload);
  res.send({ success: true });
});

//Reactions

app.get("/api/compliment/reaction", async (req, res) => {
  //get compliment by id
  const compliment = await complimentModel.findById(req.query.complimentId);
  //return reaction
  return res.send({ success: true, reaction: compliment.reaction });
});

app.post("/api/compliment/reaction", async (req, res) => {
  const { complimentId, reaction } = req.body;
  //get compliment by id
  const compliment = await complimentModel.findById(complimentId);
  console.log(compliment);
  let hasAlreadyReaction = false;
  //if reaction present, replace
  if (compliment.reaction) {
    hasAlreadyReaction = true;
  }
  compliment.reaction = reaction;
  try {
    await compliment.save();
  } catch (err) {
    res.status(500).send({ error: err });
  }
  //return success and if replaced
  // send notification to SO
  const payload = JSON.stringify({
    title: "New Reaction 😘",
    body: `You have a new reaction ${reaction} on your compliment from ${
      req.person === "hanca" ? "Hanča" : "Vojtík"
    }!`,
  });
  sendNotificationToSO(compliment.personTo, payload);
  return res.send({ success: true, reaction, hasAlreadyReaction });
});

app.delete("/api/compliment/reaction", async (req, res) => {
  const { complimentId } = req.body;
  //get compliment by id
  const compliment = await complimentModel.findById(complimentId);
  //delete reaction if present
  if (compliment.reaction) {
    compliment.reaction = "";
    return res.send({ success: true, reaction: compliment.reaction });
  }
  res.send({ error: "No reaction on this compliment" });
});

//OPEN WHEN CARDS
app.get("/api/all-cards", async (req, res) => {
  // Get all cards from db
  const cards = await openCardModel.find().lean();
  cards.forEach((el) => delete el["text"]);
  // Return headings and seen
  return res.send({ success: true, cards });
});

app.get("/api/card", async (req, res) => {
  //Get all info of the card
  const card = await openCardModel.findById(req.query.cardId);
  card.seen = true;
  card.save();
  return res.send({ success: true, card });
});

// VIRTUAL HOME

//TODO
// update fnc (update hunger and other stats)
// /api/home/update
const updateHomeAndUser = async (req, res, next) => {
  console.log(req.user);
  if (req.user.person === "hanca") {
    const userVH = await usersHomeModel.findOne({ name: "Hanča" });
    console.log("UserVH: ", userVH);
    req.userVH = userVH;
  }
  if (req.user.person === "vojtik") {
    const userVH = await usersHomeModel.findOne({ name: "Vojtík" });
    console.log("UserVH: ", userVH);
    req.userVH = userVH;
  }
  // Get all pets and users
  const pets = await petsModel.find();
  const users = await usersHomeModel.find();
  // Update hunger
  pets.forEach((pet) => {
    const timeSinceLastHungerUpdate = Math.floor(
      (Date.now() - pet.lastHungerUpdate) / 600000
    ); // in tens of minutes
    const timeSinceLastCuddleUpdate = Math.floor(
      (Date.now() - pet.lastCuddleUpdate) / 600000
    ); // in tens of minutes
    const timeSinceLastPlayUpdate = Math.floor(
      (Date.now() - pet.lastPlayUpdate) / 600000
    ); // in tens of minutes

    if (timeSinceLastHungerUpdate > 0) {
      console.log(`${pet.name} Hunger descrease: `, timeSinceLastHungerUpdate);
      pet.hunger -= timeSinceLastHungerUpdate;
      pet.lastHungerUpdate = Date.now();
      if (pet.hunger < 0) {
        pet.hunger = 0;
      }
    }
    if (timeSinceLastCuddleUpdate > 0) {
      console.log(
        `${pet.name} CuddleNeed descrease: `,
        timeSinceLastCuddleUpdate
      );
      pet.cuddleNeed -= timeSinceLastCuddleUpdate * 2; // 2% per 10 minutes
      pet.lastCuddleUpdate = Date.now();
      if (pet.cuddleNeed < 0) {
        pet.cuddleNeed = 0;
      }
    }
    if (timeSinceLastPlayUpdate > 0) {
      console.log(`${pet.name} PlayNeed descrease: `, timeSinceLastPlayUpdate);
      pet.playNeed -= timeSinceLastPlayUpdate * 2; // 2% per 10 minutes
      pet.lastPlayUpdate = Date.now();
      if (pet.playNeed < 0) {
        pet.playNeed = 0;
      }
    }
    // Save pet
    pet.save();
  });
  // Update hunger and tiredness for users
  users.forEach((user) => {
    const timeSinceLastHungerUpdate = Math.floor(
      (Date.now() - user.lastHungerUpdate) / 600000
    ); // in tens of minutes
    const timeSinceLastTirednessUpdate = Math.floor(
      (Date.now() - user.lastTirednessUpdate) / 600000
    ); // in tens of minutes

    if (timeSinceLastHungerUpdate > 0) {
      console.log(`${user.name} Hunger descrease: `, timeSinceLastHungerUpdate);
      user.hunger -= timeSinceLastHungerUpdate;
      user.lastHungerUpdate = Date.now();
      if (user.hunger < 0) {
        user.hunger = 0;
      }
    }
    if (timeSinceLastTirednessUpdate > 0) {
      console.log(
        `${user.name} Tiredness increase: `,
        timeSinceLastTirednessUpdate
      );
      user.tiredness += timeSinceLastTirednessUpdate;
      user.lastTirednessUpdate = Date.now();
      if (user.tiredness > 100) {
        user.tiredness = 100;
      }
    }

    // if user is sleeping, update tiredness
    if (user.isSleeping) {
      const now = Date.now();
      const sleepStart = user.lastSleepStart;
      const sleepEnd = user.lastSleepEnd;
      const totalSleepDuration = sleepEnd - sleepStart;
      const timeSlept = Math.min(now - sleepStart, totalSleepDuration);
      const sleepPercent = timeSlept / totalSleepDuration;

      const totalTirednessRecovery = Math.floor(100 * sleepPercent);
      const newlyRecovered =
        totalTirednessRecovery - (user.tirednessRecoveredDuringSleep || 0);

      if (newlyRecovered > 0) {
        user.tiredness -= newlyRecovered;
        user.tirednessRecoveredDuringSleep = totalTirednessRecovery;
        if (user.tiredness < 0) user.tiredness = 0;
      }

      if (now >= sleepEnd) {
        //Push notification
        const payload = JSON.stringify({
          title: "Wake up! 💤",
          body: `You have finished sleeping and ready for adventure!`,
        });
        if (req.person === "hanca") {
          sendNotificationToSO("hanca", payload);
        }
        if (req.person === "vojtik") {
          sendNotificationToSO("vojtik", payload);
        }
        user.isSleeping = false;
        user.lastSleepStart = undefined;
        user.lastSleepEnd = undefined;
        user.tirednessRecoveredDuringSleep = 0;
      }
    }

    // Save user
    user.save();
  });
  next();
};

app.use("/api/home/", updateHomeAndUser);

//Get pets, food, users
app.get("/api/home/:objToGet", async (req, res) => {
  const { objToGet } = req.params;
  if (objToGet === "pets") {
    // Get all pets
    const pets = await petsModel.find().lean();
    return res.send({ success: true, pets });
  }
  if (objToGet === "food") {
    // Get all food
    const food = await foodModel.find().lean();
    return res.send({ success: true, food });
  }
  if (objToGet === "users") {
    // Get all users
    const users = await usersHomeModel.find().lean();
    return res.send({ success: true, users });
  }
  if (objToGet === "current-user") {
    return res.send({
      success: true,
      user: req.userVH,
    });
  }
  return res.status(400).send({ error: "Invalid object to get" });
});

app.post("/api/home/change/rename", async (req, res) => {
  const { id, name, type } = req.body;
  console.log("REQUEST BODY: ", req.body);
  if (!id || !name || !type) {
    return res.status(400).send({ error: "Missing parameters" });
  }

  let objToRename;
  if (type === "user") {
    objToRename = await usersHomeModel.findById(id);
  } else if (type === "pet") {
    objToRename = await petsModel.findById(id);
  } else {
    return res.status(400).send({ error: "Invalid type" });
  }

  if (!objToRename) {
    return res.status(400).send({
      error: `${type} not found`,
    });
  }

  objToRename.name = name;
  await objToRename.save();
  return res.send({ success: true, renamed: objToRename });
});

// feed fnc
app.post("/api/home/feed", async (req, res) => {
  if (req.userVH.isSleeping) {
    return res.status(400).send({
      error: "User is sleeping, cannot feed",
      isSleeping: true,
    });
  }
  // foodId, petId, userId
  const { foodId, petId, userId } = req.body;
  //Cant have both petId and userId
  if (!foodId || (!petId && !userId) || (petId && userId)) {
    return res
      .status(400)
      .send({ error: "Missing parameters or both petId and userId present" });
  }
  // Find food in db
  const food = await foodModel.findById(foodId);
  if (!food) {
    return res.status(400).send({ error: "Food not found" });
  }
  let objToFeed;
  let overFed = false;
  if (req.body.petId) {
    // Feed pet
    const pet = await petsModel.findById(petId);
    objToFeed = pet;
  } else {
    // Feed user
    const userHome = await usersHomeModel.findById(userId);
    objToFeed = userHome;
    if (userHome.name === "Vojtík" || userHome.name === "Hanča") {
      // Send notification to Hanča
      const payload = JSON.stringify({
        title: "Your Love is feeding you 🍔",
        body: "Your loving partner is giving you some food!",
      });
      sendNotificationToSO(req.person, payload);
    }
  }
  if (!objToFeed) {
    return res.status(400).send({ error: "Object to feed not found" });
  }
  // Update hunger
  objToFeed.hunger += food.hungerValue;
  if (objToFeed.hunger > 100) {
    objToFeed.hunger = 100;
    overFed = true;
  }
  // Update lastHungerUpdate
  objToFeed.lastHungerUpdate = Date.now();
  // Delete food from db
  await foodModel.findByIdAndDelete(foodId);
  // Save to db
  await objToFeed.save();
  return res.send({ success: true, hunger: objToFeed.hunger, overFed });
});
// cuddle and play fnc
app.post("/api/home/:action", async (req, res) => {
  if (req.userVH.isSleeping) {
    return res.status(400).send({
      error: "User is sleeping, cannot feed",
      isSleeping: true,
    });
  }
  const { action } = req.params;
  const { petId } = req.body;
  // FInd pet in db
  const pet = await petsModel.findById(petId);
  if (!pet) {
    return res.status(400).send({ error: "Pet not found" });
  }
  // Update cuddle or play need
  if (action === "cuddle") {
    pet.cuddleNeed += Math.random() * 30 + 10;
    if (pet.cuddleNeed > 100) {
      pet.cuddleNeed = 100;
    }
    pet.lastCuddleUpdate = Date.now();
  } else if (action === "play") {
    pet.playNeed += Math.random() * 30 + 10;
    if (pet.playNeed > 100) {
      pet.playNeed = 100;
    }
    pet.lastPlayUpdate = Date.now();
  } else {
    return res.status(400).send({ error: "Invalid action" });
  }

  // Save to db
  await pet.save();

  return res.send({
    success: true,
    [action + "Need"]: pet[action + "Need"],
  });
});

app.post("/api/home/activity/:activity", async (req, res) => {
  const { activity } = req.params;
  // Sleeping: for random time (1-3 hours)
  // can be ended by user
  // no action allowed while in sleep
  // tiredness goes down by sleeping time in percentage (100min sleep = 1% per minute)
  if (activity === "sleep") {
    if (req.body.endSleep) {
      if (!req.userVH.isSleeping) {
        return res.status(400).send({ error: "User is not sleeping" });
      }
      req.userVH.isSleeping = false;
      req.userVH.lastSleepEnd = undefined;
      req.userVH.lastSleepStart = undefined;
      req.userVH.save();
      return res.send({
        success: true,
        isSleeping: req.userVH.isSleeping,
      });
    }
    if (req.userVH.isSleeping) {
      //Already sleeping, return error
      return res.status(400).send({ error: "User is already sleeping" });
    }
    const sleepTime = Math.floor(Math.random() * 120 + 60); // 60-180 minutes
    req.userVH.isSleeping = true;
    req.userVH.lastSleepStart = Date.now(); // in ms
    req.userVH.lastSleepEnd = Date.now() + sleepTime * 60000; // in ms
    req.userVH.save();
    return res.send({
      success: true,
      sleepTime,
      isSleeping: req.userVH.isSleeping,
      lastSleepStart: req.userVH.lastSleepStart,
      lastSleepEnd: req.userVH.lastSleepEnd,
    });
  }

  if (req.userVH.isSleeping) {
    return res.status(400).send({
      error: "User is sleeping, cannot feed",
      isSleeping: true,
    });
  }

  // TV: instant action, tiredness goes down by 15%
  if (activity === "tv") {
    console.log("tv");
    req.userVH.tiredness -= 15;
    if (req.userVH.tiredness < 0) {
      req.userVH.tiredness = 0;
    }
    await req.userVH.save();
    return res.send({
      success: true,
      tiredness: req.userVH.tiredness,
    });
  }

  // Love: instant action, S.O. notified, random chance of no boner and pregnancy, tiredness goes up by 10%
  if (activity === "love") {
    //Send notification to SO
    const payload = JSON.stringify({
      title: "Love Action ❤️‍🔥",
      body: `Your partner ${req.userVH.name} wants to give you backshots!`,
    });
    sendNotificationToSO(req.person, payload);
    const rand = Math.random();
    if (rand < 0.1) {
      // 10% chance of no boner
      return res.status(400).send({
        error: "No boner, try again later",
        isNoBoner: true,
      });
    } else if (rand < 0.15) {
      // Next 5% chance of pregnancy (total 5%)
      // TODO: kids
      const newKid = new usersHomeModel({
        name: "Unnamed Kid",
        isKid: true,
      });
      await newKid.save();
      req.userVH.tiredness += 10; // Increase tiredness
      if (req.userVH.tiredness > 100) {
        req.userVH.tiredness = 100;
      }
      await req.userVH.save();
      return res.send({
        success: true,
        isPregnant: true,
        tiredness: req.userVH.tiredness,
        newKidId: newKid._id,
      });
    }
    // Normal love action
    req.userVH.tiredness += 10;
    if (req.userVH.tiredness > 100) {
      req.userVH.tiredness = 100;
    }
    await req.userVH.save();
    return res.send({
      success: true,
      tiredness: req.userVH.tiredness,
      isBoner: true,
    });
  }

  // Food: instant action, user chooses food, tiredness linked to food type
  if (activity === "food") {
    // FOODS TO CHOOSE FROM: pizza, pasta, cake, twister, redbull
    const foodValues = {
      pizza: { hungerValue: 30, tirednessValue: 10, isForPets: true },
      pasta: { hungerValue: 20, tirednessValue: 5, isForPets: true },
      soup: { hungerValue: 15, tirednessValue: 2, isForPets: false },
      cake: { hungerValue: 25, tirednessValue: 8, isForPets: true },
      twister: { hungerValue: 15, tirednessValue: 3, isForPets: false },
      redbull: { hungerValue: 10, tirednessValue: -5, isForPets: false }, // Redbull gives energy
    };
    const { foodType } = req.body;
    if (!foodValues[foodType]) {
      return res.status(400).send({ error: "Invalid food type" });
    }
    req.userVH.tiredness += foodValues[foodType].tirednessValue;
    if (req.userVH.tiredness > 100) {
      req.userVH.tiredness = 100;
    }
    // Add food to db
    const food = new foodModel({
      name: foodType,
      hungerValue: foodValues[foodType].hungerValue,
      isForPets: foodValues[foodType].isForPets,
    });
    await food.save();
    await req.userVH.save();
    return res.send({
      success: true,
      hunger: req.userVH.hunger,
      tiredness: req.userVH.tiredness,
      foodType,
    });
  }
});

app.post("/api/home/send/:type", (req, res) => {
  const { type } = req.params;
  let payload;
  switch (type) {
    case "kiss":
      payload = JSON.stringify({
        title: "💋💋 Mwaa!",
        body: `${req.userVH.name} send you a kiss!`,
      });
      break;
    case "cuddle":
      payload = JSON.stringify({
        title: `🥹 ${req.userVH.name} wants to cuddle with you!`,
      });
      break;
    case "notify":
      payload = JSON.stringify({
        title: "Your love wants attention!",
        body: `Give ${req.userVH.name} some attention pleease!`,
      });
      break;
    case "message":
      const { message } = req.body;
      payload = JSON.stringify({
        title: `${req.userVH.name} sends you a message:`,
        body: message,
      });
      break;
    default:
      res.status(400).send({ error: "invalid type of send" });
  }
  console.log(payload);
  sendNotificationToSO(req.person, payload);
  res.send({ success: true });
});

const server = app.listen(process.env.PORT || "8080", () => {
  console.log(`listening on port ${server.address().port}`);
});
