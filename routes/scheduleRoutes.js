const express = require("express");
const { getAllSchedules } = require("../controllers/scheduleController");

const router = express.Router();
router.get("/", getAllSchedules); // public, read only

module.exports = router;
