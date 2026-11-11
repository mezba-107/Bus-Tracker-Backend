const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();

const User = require("../models/User");
const Notice = require("../models/Notice");
const driverAuth = require("../middleware/driverAuth");

/* ===============================
   DRIVER LOGIN
================================ */
router.post("/login", async (req, res) => {
  try {
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");

    const driver = await User.findOne({ username, role: "driver" });
    if (!driver) return res.status(404).json({ message: "Driver not found!" });

    // bcrypt hash (normal) OR legacy plain-text password (old accounts edited from admin panel)
    const isHash = typeof driver.password === "string" && driver.password.startsWith("$2");
    const ok = isHash ? await bcrypt.compare(password, driver.password) : driver.password === password;
    if (!ok) return res.status(401).json({ message: "Wrong password!" });

    // upgrade legacy plain-text password to a hash on first successful login
    if (!isHash) {
      driver.password = await bcrypt.hash(password, 10);
      await driver.save();
    }

    const token = jwt.sign({ id: String(driver._id), role: "driver" }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      message: "Login successful!",
      token,
      driver: { id: driver._id, username: driver.username, name: driver.name, assignedBus: driver.assignedBus || null },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error!" });
  }
});

/* ===============================
   MY PROFILE  (no password in response)
================================ */
router.get("/me", driverAuth, async (req, res) => {
  const d = await User.findById(req.driver.id).select("-password");
  if (!d) return res.status(404).json({ message: "Driver not found" });
  res.json(d);
});

/* ===============================
   MY NOTICES
================================ */
router.get("/notices", driverAuth, async (req, res) => {
  const notices = await Notice.find({ driverId: req.driver.id }).sort({ time: -1 });
  res.json(notices);
});

router.put("/notices/:id/seen", driverAuth, async (req, res) => {
  const n = await Notice.findOneAndUpdate(
    { _id: req.params.id, driverId: req.driver.id }, // can only touch own notices
    { seen: true },
    { new: true },
  );
  if (!n) return res.status(404).json({ message: "Notice not found" });
  res.json({ success: true, notice: n });
});

module.exports = router;
