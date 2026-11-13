const mongoose = require("mongoose");

// One document per bus. Same timetable every day.
const scheduleSchema = new mongoose.Schema({
  busNo: { type: String, required: true, unique: true, lowercase: true, trim: true },
  route: { type: String, default: "" }, // short label, e.g. "Campus ↔ Halishahar"
  trips: [
    {
      _id: false,
      trip: { type: String, default: "" }, // Morning / Noon / Evening Return ...
      route: { type: String, default: "" }, // Campus → Halishahar
      time: { type: String, default: "" }, // 7:20 AM → 7:40 AM
    },
  ],
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Schedule", scheduleSchema);
