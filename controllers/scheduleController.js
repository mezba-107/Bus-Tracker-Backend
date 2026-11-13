const Bus = require("../models/Bus");
const Schedule = require("../models/Schedule");
const { normaliseBusNo } = require("./adminController");

const clean = (v, max) => String(v ?? "").trim().slice(0, max);

/* PUBLIC: timetable of every registered bus (students) */
exports.getAllSchedules = async (req, res) => {
  try {
    const [buses, schedules] = await Promise.all([
      Bus.find().sort({ busNo: 1 }).select("busNo -_id").lean(),
      Schedule.find().lean(),
    ]);
    const byBus = new Map(schedules.map((s) => [s.busNo, s]));

    res.set("Cache-Control", "no-cache");
    res.json(
      buses.map((b) => {
        const s = byBus.get(b.busNo);
        return {
          busNo: b.busNo,
          route: s ? s.route : "",
          trips: s ? s.trips : [],
          updatedAt: s ? s.updatedAt : null,
        };
      }),
    );
  } catch (err) {
    res.status(500).json({ message: "Failed to load schedule" });
  }
};

/* ADMIN: replace the timetable of one bus */
exports.saveSchedule = async (req, res) => {
  try {
    const busNo = normaliseBusNo(req.params.busNo);
    if (!(await Bus.findOne({ busNo }))) return res.status(404).json({ message: "Bus not found" });

    const route = clean(req.body.route, 120);
    const rawTrips = Array.isArray(req.body.trips) ? req.body.trips : null;
    if (!rawTrips) return res.status(400).json({ message: "trips must be a list" });
    if (rawTrips.length > 60) return res.status(400).json({ message: "Too many trips (max 60)" });

    const trips = rawTrips
      .map((t) => ({ trip: clean(t && t.trip, 40), route: clean(t && t.route, 120), time: clean(t && t.time, 60) }))
      .filter((t) => t.trip || t.route || t.time); // drop fully empty rows

    if (trips.some((t) => !t.time)) {
      return res.status(400).json({ message: "Every trip needs a time" });
    }

    const saved = await Schedule.findOneAndUpdate(
      { busNo },
      { busNo, route, trips, updatedAt: new Date() },
      { upsert: true, new: true },
    );
    res.json({ message: "Schedule saved", schedule: { busNo, route: saved.route, trips: saved.trips, updatedAt: saved.updatedAt } });
  } catch (err) {
    res.status(500).json({ message: "Failed to save schedule" });
  }
};
