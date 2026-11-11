const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const { getBuses, createBus, deleteBus, getBusHistory } = require("../controllers/adminController");

router.get("/dashboard", adminAuth, (req, res) => res.json({ message: "Welcome Admin" }));
router.get("/buses", adminAuth, getBuses);
router.post("/buses", adminAuth, createBus);
router.delete("/buses/:busNo", adminAuth, deleteBus);
router.get("/bus/:busNo/history", adminAuth, getBusHistory);

module.exports = router;
