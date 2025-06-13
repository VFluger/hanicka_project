const Express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

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
  lastCheckedCompliment: String,
  lastSendCompliment: String,
  dailyCompliment: String,
});

const complimentModel = mongoose.model("Compliment", {
  personTo: { type: String, enum: ["vojtik", "hanca"] },
  text: String,
  createdAt: String,
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
    console.log(req.useragent);
    const sessionObj = new sessionModel({
      token,
      ip: req.ip,
      person: person,
      userAgent: req.headers["user-agent"],
    });
    console.log(sessionObj);
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
  const lastCheckedOn = new Date(Number(user.lastCheckedCompliment));
  if (lastCheckedOn.getDay() === new Date().getDay()) {
    // Get compliment from today
    return res.send({
      success: true,
      compliment: user.dailyCompliment,
    });
  }
  // Generate a new compliment

  //Get all compliments for the correct person
  const compliments = await complimentModel.find({ personTo: user.person });
  //Get random one
  const randomCompliment =
    compliments[Math.floor(Math.random() * compliments.length)];
  //asign it into the user obj and change lastCheckedCompliment value
  user.dailyCompliment = randomCompliment.text;
  user.lastCheckedCompliment = Date.now();
  await user.save();

  res.send({ success: true, compliment: randomCompliment.text });
});

app.post("/api/compliment", async (req, res) => {
  const user = req.user;
  const lastPostedOn = new Date(Number(user.lastSendCompliment));
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

const server = app.listen(process.env.PORT || "8080", () => {
  console.log(`listening on port ${server.address().port}`);
});
