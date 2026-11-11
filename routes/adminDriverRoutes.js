const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Bus = require("../models/Bus");
const Notice = require("../models/Notice");
const adminAuth = require("../middleware/adminAuth");

const router = express.Router();
router.use(adminAuth); // EVERYTHING here is admin-only

const safe = (d) => {
  const o = d.toObject ? d.toObject() : { ...d };
  delete o.password;
  return o;
};

/* CREATE DRIVER */
router.post("/create-driver", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const username = String(req.body.username || "").trim();
    const password = String(req.body.password || "");
    const email = req.body.email ? String(req.body.email).trim() : null;
    const assignedBus = req.body.assignedBus ? String(req.body.assignedBus).trim().toLowerCase() : null;

    if (!name || !username || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (assignedBus && !(await Bus.findOne({ busNo: assignedBus }))) {
      return res.status(400).json({ message: "Selected bus does not exist" });
    }

    const query = email ? { $or: [{ username }, { email }] } : { username };
    if (await User.findOne(query)) {
      return res.status(400).json({ message: "Driver ID or Email already exists!" });
    }

    const driver = await User.create({
      name, username, email, assignedBus,
      password: await bcrypt.hash(password, 10),
      role: "driver",
    });

    res.json({ message: "Driver Created Successfully", driver: safe(driver) });
  } catch (err) {
    console.log("CREATE DRIVER ERROR:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

/* LIST DRIVERS */
router.get("/drivers", async (req, res) => {
  const drivers = await User.find({ role: "driver" }).select("-password");
  res.json(drivers);
});

/* UPDATE DRIVER  (whitelisted fields only, password is hashed) */
router.put("/drivers/:id", async (req, res) => {
  try {
    const update = {};
    for (const k of ["name", "mobile", "address", "email", "note"]) {
      if (req.body[k] !== undefined) update[k] = req.body[k] === "" && k === "email" ? null : req.body[k];
    }
    if (req.body.assignedBus !== undefined) {
      const ab = req.body.assignedBus ? String(req.body.assignedBus).trim().toLowerCase() : null;
      if (ab && !(await Bus.findOne({ busNo: ab }))) {
        return res.status(400).json({ message: "Selected bus does not exist" });
      }
      update.assignedBus = ab;
    }
    if (req.body.password) update.password = await bcrypt.hash(String(req.body.password), 10);

    const driver = await User.findOneAndUpdate({ _id: req.params.id, role: "driver" }, update, { new: true });
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    res.json({ message: "Driver updated successfully", driver: safe(driver) });
  } catch (err) {
    res.status(500).json({ message: "Server error while updating" });
  }
});

/* DELETE DRIVER */
router.delete("/drivers/:id", async (req, res) => {
  try {
    await User.findOneAndDelete({ _id: req.params.id, role: "driver" });
    await Notice.deleteMany({ driverId: req.params.id });
    res.json({ message: "Driver deleted successfully" });
  } catch {
    res.status(500).json({ message: "Server error while deleting" });
  }
});

/* SEND NOTICE */
router.post("/send-notice", async (req, res) => {
  try {
    const { driverId, message } = req.body;
    if (!message || !String(message).trim()) return res.status(400).json({ message: "Message required" });

    const driver = await User.findById(driverId);
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    const notice = await Notice.create({
      driverId: driver._id,
      driverName: driver.name,
      driverUsername: driver.username,
      message: String(message).trim(),
    });
    res.json({ message: "Notice sent successfully", notice });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
