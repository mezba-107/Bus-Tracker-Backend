const Admin = require("../models/Admin");
const bcrypt = require("bcryptjs");

const createDefaultAdmin = async () => {
  try {
    const adminExists = await Admin.findOne({ email: "admin@gmail.com" });

    if (adminExists) {
      console.log("✅ Default admin already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);

    const admin = new Admin({
      name: "System Admin",
      username: "admin",
      email: "admin@gmail.com",
      password: hashedPassword
    });

    await admin.save();
    console.log("🟢 Default admin created");

  } catch (err) {
    console.error("❌ Error creating default admin:", err.message);
  }
};

module.exports = createDefaultAdmin;
