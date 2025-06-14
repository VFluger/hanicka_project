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
    return res.redirect("/login");
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
  await compliment.save();
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

const server = app.listen(process.env.PORT || "8080", () => {
  console.log(`listening on port ${server.address().port}`);
});
