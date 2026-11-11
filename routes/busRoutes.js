const express = require("express");
const Bus = require("../models/Bus");

/**
 * PUBLIC, read-only endpoint for the student page.
 * (Live location itself comes through socket.io; this is only a fallback/initial load.)
 * Driver personal info is NOT exposed.
 */
module.exports = (liveMap) => {
  const router = express.Router();

  // every registered bus (student + driver dropdowns). New buses added by admin appear automatically.
  router.get("/list", async (req, res) => {
    try {
      const buses = await Bus.find().sort({ busNo: 1 }).select("busNo -_id").lean();
      res.json(buses);
    } catch {
      res.status(500).json({ message: "Failed to load buses" });
    }
  });

  router.get("/", async (req, res) => {
    try {
      // prefer the in-memory live state; fall back to DB
      if (liveMap && liveMap.size) {
        return res.json(
          [...liveMap.values()].map(({ payload: p }) => ({
            busNo: p.busNo, lat: p.lat, lng: p.lng, heading: p.heading, speed: p.speed, status: "online", lastUpdate: p.time,
          })),
        );
      }
      const buses = await Bus.find({ status: "online" }).select("busNo lat lng heading speed status lastUpdate -_id");
      res.json(buses);
    } catch {
      res.status(500).json({ message: "Failed to load buses" });
    }
  });

  return router;
};
