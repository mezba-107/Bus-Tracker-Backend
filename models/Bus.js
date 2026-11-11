const mongoose = require("mongoose");

const busSchema = new mongoose.Schema({
  busNo: { type: String, required: true, unique: true, lowercase: true, trim: true },
  driverName: { type: String, default: "No Driver" },
  driverUsername: { type: String, default: "---" },
  driverId: { type: String, default: "---" },

  lat: Number,
  lng: Number,
  heading: { type: Number, default: null }, // degrees, 0 = north
  speed: { type: Number, default: null }, // m/s

  status: { type: String, enum: ["online", "offline"], default: "offline" },
  lastUpdate: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Bus", busSchema);
