const mongoose = require("mongoose"); // ✅ MUST ADD

const noticeSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },

  driverName: String,
  driverUsername: String,

  message: String,
  time: {
    type: Date,
    default: Date.now,
  },

  seen: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("Notice", noticeSchema);
