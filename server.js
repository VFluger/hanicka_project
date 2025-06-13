const Express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
require("dotenv").config();
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");

const app = Express();

mongoose.connect(process.env.MONGO_URL);

// Basic middleware
app.use((req, res, next) => {
  console.log(`${req.method} ON ${req.url}`);
  next();
});
app.use(Express.urlencoded());
app.use(Express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  console.log("Serving root html");
  res.status(201).sendFile(__dirname + "/views/index.html");
});

app.listen("8000", () => {
  console.log("listening on port 8080");
});
