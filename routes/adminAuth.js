const express = require("express");
const router = express.Router();
const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const adminAuth = require("../middleware/adminAuth");
const { updateProfile, changePassword } = require("../controllers/adminAccountController");

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
      { email: identifier.toLowerCase() },
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
    id: String(admin._id),
    name: admin.name,
    username: admin.username,
    role: admin.role,
    email: admin.email,
    mobile: admin.mobile   // ✅ add this
  });
});

// =====================
// UPDATE PROFILE  (name, username, mobile, email - validated, unique)
// =====================
router.put("/profile", adminAuth, updateProfile);

// =====================
// CHANGE PASSWORD
// =====================
router.post("/change-password", adminAuth, changePassword);

module.exports = router;
