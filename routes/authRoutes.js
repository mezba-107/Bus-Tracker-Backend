const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const User = require("../models/User");

const router = express.Router();

/* small in-memory brute-force guard: 10 failed logins / 15 min per (IP + ID),
   so one wrong-password user on a shared campus Wi-Fi cannot lock everyone out */
const fails = new Map();
const WINDOW = 15 * 60 * 1000;
const MAX = 10;
function blocked(ip) {
  const f = fails.get(ip);
  if (!f) return false;
  if (Date.now() - f.first > WINDOW) { fails.delete(ip); return false; }
  return f.n >= MAX;
}
function fail(ip) {
  const f = fails.get(ip);
  if (!f || Date.now() - f.first > WINDOW) fails.set(ip, { n: 1, first: Date.now() });
  else f.n++;
}

/**
 * ONE login for the mobile app.
 * Body: { identifier, password }
 * Tries an admin first (email or username), then a driver (username).
 * Response: { role: "admin" | "driver", token, user }
 */
router.post("/login", async (req, res) => {
  const identifier = String(req.body.identifier || "").trim();
  const password = String(req.body.password || "");
  if (!identifier || !password) return res.status(400).json({ message: "Enter ID and password" });

  const ip = `${req.ip}|${identifier.toLowerCase()}`;
  if (blocked(ip)) return res.status(429).json({ message: "Too many attempts. Try again in a few minutes." });

  try {
    /* ---- admin ---- */
    const admin = await Admin.findOne({ $or: [{ email: identifier }, { username: identifier }] });
    if (admin && (await bcrypt.compare(password, admin.password))) {
      const token = jwt.sign({ id: admin._id, role: admin.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
      return res.json({
        role: "admin",
        token,
        user: { id: admin._id, name: admin.name, username: admin.username, email: admin.email },
      });
    }

    /* ---- driver ---- */
    const driver = await User.findOne({ username: identifier, role: "driver" });
    if (driver) {
      const isHash = typeof driver.password === "string" && driver.password.startsWith("$2");
      const ok = isHash ? await bcrypt.compare(password, driver.password) : driver.password === password;
      if (ok) {
        if (!isHash) {
          driver.password = await bcrypt.hash(password, 10);
          await driver.save();
        }
        const token = jwt.sign({ id: String(driver._id), role: "driver" }, process.env.JWT_SECRET, { expiresIn: "7d" });
        return res.json({
          role: "driver",
          token,
          user: { id: driver._id, name: driver.name, username: driver.username, assignedBus: driver.assignedBus || null },
        });
      }
    }

    fail(ip);
    res.status(401).json({ message: "Wrong ID or password" });
  } catch (err) {
    console.log("LOGIN ERROR:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
