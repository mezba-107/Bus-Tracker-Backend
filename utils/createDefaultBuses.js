const Bus = require("../models/Bus");
const Meta = require("../models/Meta");

// Runs ONCE: makes sure Bus 01 - Bus 06 exist. After that the admin controls the fleet
// (a bus the admin deleted is never re-created on restart).
module.exports = async () => {
  try {
    if (await Meta.findOne({ key: "defaultBusesSeeded" })) return;
    for (let i = 1; i <= 6; i++) {
      const busNo = "bus" + String(i).padStart(2, "0");
      await Bus.updateOne({ busNo }, { $setOnInsert: { busNo, status: "offline" } }, { upsert: true });
    }
    await Meta.create({ key: "defaultBusesSeeded", value: true });
    console.log("🚌 Default buses (Bus 01 - Bus 06) ensured");
  } catch (err) {
    console.error("❌ Error seeding buses:", err.message);
  }
};
