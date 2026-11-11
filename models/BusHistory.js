const mongoose = require("mongoose");

const busHistorySchema = new mongoose.Schema({
  busNo: { type: String, required: true, lowercase: true, trim: true, index: true },
  status: { type: String, enum: ["online", "offline"], required: true },
  lat: Number,
  lng: Number,
  driverId: String,
  driverName: String,
  driverUsername: String,
  time: { type: Date, default: Date.now },
});

// auto-delete history older than 30 days (prevents the DB from growing forever)
busHistorySchema.index({ time: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model("BusHistory", busHistorySchema);
