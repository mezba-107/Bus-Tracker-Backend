const bcrypt = require("bcryptjs");
const Admin = require("../models/Admin");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[A-Za-z0-9._-]{3,30}$/;
const clean = (v, max) => String(v ?? "").trim().slice(0, max);

/* LIST all admins (no passwords) */
exports.listAdmins = async (req, res) => {
  try {
    const list = await Admin.find().sort({ createdAt: 1, name: 1 }).select("name username email mobile createdAt").lean();
    res.json(
      list.map((a) => ({
        id: String(a._id),
        name: a.name,
        username: a.username,
        email: a.email,
        mobile: a.mobile || "",
        createdAt: a.createdAt || null,
        isMe: String(a._id) === String(req.admin.id),
      })),
    );
  } catch {
    res.status(500).json({ message: "Failed to load admins" });
  }
};

/* CREATE a new admin: name + email + password. Username is made from the email (can be changed later). */
exports.createAdmin = async (req, res) => {
  try {
    const name = clean(req.body.name, 60);
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!name) return res.status(400).json({ message: "Name is required" });
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "Enter a valid email address" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    if (await Admin.findOne({ email })) {
      return res.status(400).json({ message: "This email already has an admin account" });
    }

    let base = email.split("@")[0].replace(/[^a-z0-9._-]/g, "").slice(0, 24);
    if (base.length < 3) base = (base + "admin").slice(0, 8);
    let username = base;
    for (let n = 2; (await Admin.findOne({ username })) && n < 200; n++) username = `${base}${n}`;

    const admin = await Admin.create({
      name,
      username,
      email,
      password: await bcrypt.hash(password, 10),
      createdBy: String(req.admin.id),
    });

    res.json({ message: "Admin created", admin: { id: String(admin._id), name, username, email } });
  } catch (err) {
    if (err && err.code === 11000) return res.status(400).json({ message: "Email or username already exists" });
    res.status(500).json({ message: "Failed to create admin" });
  }
};

/* DELETE another admin (never yourself, never the last one) */
exports.deleteAdmin = async (req, res) => {
  try {
    const id = String(req.params.id);
    if (id === String(req.admin.id)) {
      return res.status(400).json({ message: "You cannot delete your own account" });
    }
    if ((await Admin.countDocuments()) <= 1) {
      return res.status(400).json({ message: "At least one admin must remain" });
    }
    const deleted = await Admin.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: "Admin not found" });
    res.json({ message: "Admin deleted" });
  } catch {
    res.status(400).json({ message: "Invalid admin id" });
  }
};

/* UPDATE my own profile: name, username, mobile, email (only the fields that are sent) */
exports.updateProfile = async (req, res) => {
  try {
    const me = req.admin.id;
    const b = req.body || {};
    const updates = {};

    if (b.name !== undefined) {
      const name = clean(b.name, 60);
      if (!name) return res.status(400).json({ message: "Name cannot be empty" });
      updates.name = name;
    }
    if (b.username !== undefined) {
      const username = clean(b.username, 30);
      if (!USERNAME_RE.test(username)) {
        return res.status(400).json({ message: "Username: 3-30 letters, numbers, dot, dash or underscore" });
      }
      if (await Admin.findOne({ username, _id: { $ne: me } })) {
        return res.status(400).json({ message: "This username is already taken" });
      }
      updates.username = username;
    }
    // Email is locked: an admin cannot change their email (login id) after the account is created.
    if (b.email !== undefined) {
      const current = await Admin.findById(me).select("email").lean();
      if (!current) return res.status(404).json({ message: "Admin not found" });
      if (String(b.email).trim().toLowerCase() !== String(current.email).toLowerCase()) {
        return res.status(403).json({ message: "Email cannot be changed" });
      }
    }
    if (b.mobile !== undefined) updates.mobile = clean(b.mobile, 20);

    if (Object.keys(updates).length) await Admin.findByIdAndUpdate(me, updates);
    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    if (err && err.code === 11000) return res.status(400).json({ message: "Email or username already exists" });
    res.status(500).json({ message: "Failed to update profile" });
  }
};

/* CHANGE my own password */
exports.changePassword = async (req, res) => {
  try {
    const oldPassword = String((req.body || {}).oldPassword || "");
    const newPassword = String((req.body || {}).newPassword || "");
    if (newPassword.length < 6) return res.status(400).json({ message: "New password must be at least 6 characters" });

    const admin = await Admin.findById(req.admin.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    if (!(await bcrypt.compare(oldPassword, admin.password))) {
      return res.status(400).json({ message: "Current password incorrect" });
    }
    admin.password = await bcrypt.hash(newPassword, 10);
    await admin.save();
    res.json({ message: "Password updated successfully" });
  } catch {
    res.status(500).json({ message: "Failed to change password" });
  }
};
