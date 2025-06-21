const Express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const { cp } = require("fs");

const app = Express();

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
  hunger: { type: Number, default: 100, min: 0, max: 100 },
  cuddleNeed: { type: Number, default: 100, min: 0, max: 100 }, // More is better
  playNeed: { type: Number, default: 100, min: 0, max: 100 }, // More is better
  lastHungerUpdate: { type: Number, default: Date.now },
  lastCuddleUpdate: { type: Number, default: Date.now },
  lastPlayUpdate: { type: Number, default: Date.now },
});

const usersHomeModel = mongoose.model("VHUsers", {
  name: String,
  hunger: { type: Number, default: 100, min: 0, max: 100 },
  tiredness: { type: Number, default: 100, min: 0, max: 100 },
  lastHungerUpdate: { type: Number, default: Date.now },
  lastTirednessUpdate: { type: Number, default: Date.now },
});

const foodModel = mongoose.model("VHFood", {
  name: { type: String, enum: ["bread", "pizza", "cake", "soup", "pasta"] },
  hungerValue: { type: Number, default: 20, min: 0, max: 100 },
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

//Get pets, food, users
app.get("/api/home/:objToGet", async (req, res) => {
  const { objToGet } = req.params;
  if (objToGet === "pets") {
    // Get all pets
    const pets = await petsModel.find().lean();
    return res.send({ success: true, pets });
  } else if (objToGet === "food") {
    // Get all food
    const food = await foodModel.find().lean();
    return res.send({ success: true, food });
  } else if (objToGet === "users") {
    // Get all users
    const users = await usersHomeModel.find().lean();
    return res.send({ success: true, users });
  }
  return res.status(400).send({ error: "Invalid object to get" });
});

// feed fnc
app.post("/api/home/feed", async (req, res) => {
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

//activities: watch tv, make love, sleep, make food
app.post("/api/home/activity", async (req, res) => {
  const { activity } = req.body;
  // Sleeping: for random time (1-3 hours)
  // can be ended by user
  // no action allowed while in sleep
  // tiredness goes down by sleeping time in percentage (100min sleep = 1% per minute)

  // TV: instant action, can be done twice a day, tiredness goes down by 15%

  // Love: instant action, S.O. notified, random chance of no boner and pregnancy, tiredness goes up by 10%

  // Food: instant action, user chooses food, tiredness linked to food type
});

const server = app.listen(process.env.PORT || "8080", () => {
  console.log(`listening on port ${server.address().port}`);
});
