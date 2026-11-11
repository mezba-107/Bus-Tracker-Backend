const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({

  name: {
    type: String,
    default: "Admin"
  },

username: {
  type: String,
  required: true,
  unique: true
},

email: {
  type: String,
  required: true,
  unique: true
},

  mobile: {          // ✅ NEW FIELD
    type: String,
    default: ""
  },

  password: {
    type: String,
    required: true
  },
  
  role: {
    type: String,
    default: "admin"
  }
});

module.exports = mongoose.model("Admin", adminSchema);

