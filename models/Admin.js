const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  name: { type: String, default: "Admin" },

  username: { type: String, required: true, unique: true, trim: true },

  email: { type: String, required: true, unique: true, lowercase: true, trim: true },

  mobile: { type: String, default: "" },

  password: { type: String, required: true },

  role: { type: String, default: "admin" },

  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, default: null }, // id of the admin who created this account
});

module.exports = mongoose.model("Admin", adminSchema);
