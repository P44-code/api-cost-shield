const express = require("express");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth.route");
const teamRoutes = require("./routes/team.route");
const proxyRoutes = require("./routes/proxy.route");
const rateLimit = require("express-rate-limit");
const cors = require("cors");

const app = express();



app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));


const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later",
});




app.use(express.json());
app.use(cookieParser());


app.use("/api/auth", authRoutes)
app.use("/api/team", teamRoutes)
app.use("/api/proxy", limiter, proxyRoutes)



module.exports = app;