const Schedule = require("../models/Schedule");
const Meta = require("../models/Meta");
const defaults = require("../data/defaultSchedule.json");

// Runs ONCE: puts the old hard-coded timetable (Bus 01 - 06) into the database.
// After that the admin edits it from the admin panel and nothing is overwritten on restart.
module.exports = async () => {
  try {
    if (await Meta.findOne({ key: "defaultScheduleSeeded" })) return;
    for (const s of defaults) {
      await Schedule.updateOne(
        { busNo: s.busNo },
        { $setOnInsert: { busNo: s.busNo, route: s.route, trips: s.trips, updatedAt: new Date() } },
        { upsert: true },
      );
    }
    await Meta.create({ key: "defaultScheduleSeeded", value: true });
    console.log("🕒 Default bus schedule loaded into the database");
  } catch (err) {
    console.error("❌ Error seeding schedule:", err.message);
  }
};
