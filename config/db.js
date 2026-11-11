const mongoose = require("mongoose");
const createDefaultAdmin = require("../utils/createDefaultAdmin");
const createDefaultBuses = require("../utils/createDefaultBuses");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected");

    // ✅ default admin create
    await createDefaultAdmin();
    await createDefaultBuses();
  } catch (error) {
    console.error("MongoDB Error:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
