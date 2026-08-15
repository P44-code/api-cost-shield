const express = require("express");

const protect = require("../middlewares/auth.middleware");
const proxyController = require("../controller/proxy.controller");



const router = express.Router();

router.post("/chat", protect, proxyController.chat);


















module.exports = router;