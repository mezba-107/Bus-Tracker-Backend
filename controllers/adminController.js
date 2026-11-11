const Bus = require("../models/Bus");
const BusHistory = require("../models/BusHistory");
const User = require("../models/User");

// GET ALL BUSES (admin) – includes who is assigned and who is driving right now
exports.getBuses = async (req, res) => {
  try {
    const [buses, drivers] = await Promise.all([
      Bus.find().sort({ busNo: 1 }).lean(),
      User.find({ role: "driver", assignedBus: { $ne: null } }).select("name username assignedBus").lean(),
    ]);

    res.json(
      buses.map((b) => ({
        busNo: b.busNo,
        status: b.status,
        lat: b.lat,
        lng: b.lng,
        lastUpdate: b.lastUpdate,
        currentDriver: b.status === "online" ? { name: b.driverName, username: b.driverUsername } : null,
        assignedDrivers: drivers
          .filter((d) => d.assignedBus === b.busNo)
          .map((d) => ({ name: d.name, username: d.username })),
      })),
    );
  } catch (err) {
    res.status(500).json({ message: "Failed to load buses" });
  }
};

// normalise what the admin typed: "7" -> bus07, "Bus 12" -> bus12, "B-1" -> b-1
function normaliseBusNo(input) {
  const raw = String(input || "").trim().toLowerCase().replace(/\s+/g, "");
  if (/^\d+$/.test(raw)) return "bus" + raw.padStart(2, "0");
  return raw;
}
exports.normaliseBusNo = normaliseBusNo;

// ADD BUS
exports.createBus = async (req, res) => {
  try {
    const busNo = normaliseBusNo(req.body.busNo);
    if (!/^[a-z0-9-]{2,15}$/.test(busNo)) {
      return res.status(400).json({ message: "Enter a bus number like 7 or Bus 07" });
    }
    if (await Bus.findOne({ busNo })) {
      return res.status(400).json({ message: `${busNo.toUpperCase()} already exists` });
    }
    const bus = await Bus.create({ busNo, status: "offline" });
    res.json({ message: "Bus added", bus });
  } catch (err) {
    res.status(500).json({ message: "Failed to add bus" });
  }
};

// DELETE BUS (only when it is not running)
exports.deleteBus = async (req, res) => {
  try {
    const busNo = normaliseBusNo(req.params.busNo);
    const bus = await Bus.findOne({ busNo });
    if (!bus) return res.status(404).json({ message: "Bus not found" });
    if (bus.status === "online") {
      return res.status(400).json({ message: "This bus is running right now. Try again when it is offline." });
    }
    await Bus.deleteOne({ busNo });
    await User.updateMany({ assignedBus: busNo }, { assignedBus: null });
    res.json({ message: "Bus deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete bus" });
  }
};

// GET BUS HISTORY
exports.getBusHistory = async (req, res) => {
  try {
    const busNo = normaliseBusNo(req.params.busNo);
    const history = await BusHistory.find({ busNo }).sort({ time: -1 }).limit(50);
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: "Failed to load history" });
  }
};
