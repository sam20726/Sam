const express = require("express");
const router = express.Router();
const { sayHello } = require("../controllers/helloController");

router.get("/", sayHello);

module.exports = router;
