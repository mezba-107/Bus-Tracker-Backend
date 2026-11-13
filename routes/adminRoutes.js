const express = require("express");
const router = express.Router();
const adminAuth = require("../middleware/adminAuth");
const { getBuses, createBus, deleteBus, getBusHistory, deleteBusHistory, clearAllHistory } = require("../controllers/adminController");
const { listAdmins, createAdmin, deleteAdmin } = require("../controllers/adminAccountController");
const { saveSchedule } = require("../controllers/scheduleController");

router.get("/dashboard", adminAuth, (req, res) => res.json({ message: "Welcome Admin" }));
router.get("/buses", adminAuth, getBuses);
router.post("/buses", adminAuth, createBus);
router.delete("/buses/:busNo", adminAuth, deleteBus);
router.get("/bus/:busNo/history", adminAuth, getBusHistory);
router.delete("/bus/:busNo/history", adminAuth, deleteBusHistory);
router.delete("/history", adminAuth, clearAllHistory);

// admin accounts
router.get("/admins", adminAuth, listAdmins);
router.post("/admins", adminAuth, createAdmin);
router.delete("/admins/:id", adminAuth, deleteAdmin);
router.put("/schedule/:busNo", adminAuth, saveSchedule);

module.exports = router;
