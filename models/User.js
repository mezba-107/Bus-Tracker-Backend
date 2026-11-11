const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  username: String,
email: {
  type: String,
  default: null
},

  password: String,

  mobile: String,
  assignedBus: { type: String, default: null }, // e.g. "bus03"
  address: String,
  note: String,

  role: {
    type: String,
    enum: ["admin", "user", "driver"],
    default: "user"
  }
});


module.exports = mongoose.model("User", userSchema);
