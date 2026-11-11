const express = require("express");
const router = express.Router();
const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const adminAuth = require("../middleware/adminAuth");

// =====================
// ADMIN LOGIN
// =====================
router.post("/login", async (req, res) => {

  // 🔥 email or username input
  const identifier = String(req.body.identifier || "").trim();
  const password = String(req.body.password || "");

  // 🔥 Find admin by email OR username
  const admin = await Admin.findOne({
    $or: [
      { email: identifier },
      { username: identifier }
    ]
  });

  if (!admin) {
    return res.status(401).json({ message: "Admin not found" });
  }

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    return res.status(401).json({ message: "Wrong password" });
  }

  const token = jwt.sign(
    { id: admin._id, role: admin.role },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.json({ token });
});


// =====================
// GET PROFILE
// =====================
router.get("/profile", adminAuth, async (req, res) => {
  const admin = await Admin.findById(req.admin.id).select("-password");

  if (!admin) return res.status(404).json({ message: "Admin not found" });

  res.json({
    name: admin.name,
    username: admin.username,
    role: admin.role,
    email: admin.email,
    mobile: admin.mobile   // ✅ add this
  });
});

// =====================
// UPDATE PROFILE
// =====================
router.put("/profile", adminAuth, async (req, res) => {
  const { name, username, mobile } = req.body;

  await Admin.findByIdAndUpdate(req.admin.id, { name, username, mobile });

  res.json({ message: "Profile updated successfully" });
});

// =====================
// CHANGE PASSWORD
// =====================
router.post("/change-password", adminAuth, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  const admin = await Admin.findById(req.admin.id);

  const isMatch = await bcrypt.compare(oldPassword, admin.password);
  if (!isMatch)
    return res.status(400).json({ message: "Current password incorrect" });

  admin.password = await bcrypt.hash(newPassword, 10);
  await admin.save();

  res.json({ message: "Password updated successfully" });
});

module.exports = router;
