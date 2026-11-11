const jwt = require("jsonwebtoken");
const Bus = require("../models/Bus");
const BusHistory = require("../models/BusHistory");

/* ---------- tuning ---------- */
const STALE_AFTER_MS = Number(process.env.BUS_STALE_MS) || 45 * 1000; // no update for 45s -> bus considered offline
const SWEEP_EVERY_MS = Number(process.env.BUS_SWEEP_MS) || 15 * 1000;
const BUS_DB_WRITE_MS = 3 * 1000; // save "latest position" at most every 3s per bus
const HISTORY_WRITE_MS = 30 * 1000; // save a history point at most every 30s per bus

/* ---------- in-memory live state (source of truth for realtime) ---------- */
const live = new Map(); // busNo -> { payload, socketId, lastSeen, lastDbWrite, lastHistoryWrite }

/* ---------- registered buses (admin controls the fleet) ---------- */
let registered = new Set();
let lastLoad = 0;
async function loadRegistered() {
  lastLoad = Date.now();
  try {
    const list = await Bus.find({}, "busNo");
    registered = new Set(list.map((b) => b.busNo));
  } catch (e) {
    console.log("❌ Could not load bus list:", e.message);
  }
}
async function isRegistered(busNo) {
  if (registered.has(busNo)) return true;
  if (Date.now() - lastLoad < 5000) return false; // don't hammer the DB for unknown buses
  await loadRegistered();
  return registered.has(busNo);
}
setInterval(loadRegistered, 60 * 1000).unref?.();
loadRegistered();

const norm = (v) => String(v || "").trim().toLowerCase();
const isNum = (v) => typeof v === "number" && Number.isFinite(v);

function publicPayload(p) {
  return {
    busNo: p.busNo,
    lat: p.lat,
    lng: p.lng,
    heading: p.heading ?? null,
    speed: p.speed ?? null,
    accuracy: p.accuracy ?? null,
    time: p.time,
  };
}

module.exports = (io) => {
  /* ---------- driver authentication (optional for students) ---------- */
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      socket.isDriver = false; // student / viewer: read only
      return next();
    }
    try {
      const d = jwt.verify(token, process.env.JWT_SECRET);
      socket.isDriver = d.role === "driver";
      socket.driverId = d.id;
    } catch {
      socket.isDriver = false;
    }
    next();
  });

  async function markOffline(busNo, reason) {
    const entry = live.get(busNo);
    live.delete(busNo);
    io.emit("busOfflineUpdate", { busNo });
    try {
      await Bus.findOneAndUpdate({ busNo }, { status: "offline", lastUpdate: new Date() });
      await BusHistory.create({ busNo, status: "offline", time: new Date(), driverId: entry?.payload?.driverId });
    } catch (err) {
      console.log(`❌ Offline DB error (${reason}):`, err.message);
    }
  }

  io.on("connection", (socket) => {
    // Every new / re-connected client immediately gets the current live state.
    // This is what makes the student page correct without a manual refresh.
    socket.emit(
      "busSnapshot",
      [...live.values()].map((e) => publicPayload(e.payload)),
    );

    socket.on("requestSnapshot", () => {
      socket.emit(
        "busSnapshot",
        [...live.values()].map((e) => publicPayload(e.payload)),
      );
    });

    /* ================= BUS LIVE LOCATION (driver only) ================= */
    socket.on("busLocation", async (data) => {
      if (!socket.isDriver) return; // spoofing protection
      if (!data) return;

      const busNo = norm(data.busNo);
      const lat = Number(data.lat);
      const lng = Number(data.lng);
      if (!busNo || !isNum(lat) || !isNum(lng)) return;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;

      if (!live.has(busNo) && !(await isRegistered(busNo))) return; // unknown bus number

      const now = Date.now();
      const payload = {
        busNo,
        lat,
        lng,
        heading: isNum(Number(data.heading)) && data.heading !== null ? Number(data.heading) : null,
        speed: isNum(Number(data.speed)) && data.speed !== null ? Number(data.speed) : null,
        accuracy: isNum(Number(data.accuracy)) && data.accuracy !== null ? Number(data.accuracy) : null,
        time: now,
        driverId: String(data.driverId || socket.driverId || ""),
        driverName: data.driverName,
        driverUsername: data.driverUsername,
      };

      const prev = live.get(busNo);
      const entry = prev || { lastDbWrite: 0, lastHistoryWrite: 0 };
      entry.payload = payload;
      entry.socketId = socket.id;
      entry.lastSeen = now;
      live.set(busNo, entry);
      socket.busNo = busNo;

      // 1) BROADCAST FIRST  -> students see it instantly (no DB latency in the path)
      io.emit("busLocationUpdate", publicPayload(payload));

      // 2) persist afterwards, throttled
      if (now - entry.lastDbWrite >= BUS_DB_WRITE_MS || !prev) {
        entry.lastDbWrite = now;
        Bus.findOneAndUpdate(
          { busNo },
          {
            lat, lng,
            heading: payload.heading,
            speed: payload.speed,
            status: "online",
            driverId: payload.driverId,
            driverName: payload.driverName,
            driverUsername: payload.driverUsername,
            lastUpdate: new Date(now),
          },
          { upsert: true },
        ).catch((e) => console.log("❌ Bus save error:", e.message));
      }

      if (now - entry.lastHistoryWrite >= HISTORY_WRITE_MS || !prev) {
        entry.lastHistoryWrite = now;
        BusHistory.create({
          busNo, status: "online", lat, lng,
          driverId: payload.driverId,
          driverName: payload.driverName,
          driverUsername: payload.driverUsername,
          time: new Date(now),
        }).catch((e) => console.log("❌ History save error:", e.message));
      }
    });

    /* ================= BUS OFFLINE (driver pressed Stop) ================= */
    socket.on("busOffline", ({ busNo } = {}) => {
      if (!socket.isDriver) return;
      const n = norm(busNo);
      if (!n) return;
      const entry = live.get(n);
      if (entry && entry.socketId !== socket.id) return; // someone else owns this bus now
      markOffline(n, "stop");
    });

    /* ================= DISCONNECT ================= */
    socket.on("disconnect", () => {
      if (!socket.busNo) return;
      const entry = live.get(socket.busNo);
      // Driver's network may just have blipped: give a short grace period so a
      // quick auto-reconnect does not flicker the bus offline for students.
      const busNo = socket.busNo;
      setTimeout(() => {
        const e = live.get(busNo);
        if (e && e.socketId === socket.id && Date.now() - e.lastSeen > 8000) {
          markOffline(busNo, "disconnect");
        }
      }, 10000);
    });
  });

  /* ---------- stale sweeper: driver app killed / phone died / no signal ---------- */
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [busNo, e] of live) {
      if (now - e.lastSeen > STALE_AFTER_MS) markOffline(busNo, "stale");
    }
  }, SWEEP_EVERY_MS);
  timer.unref?.();

  // On server start nothing is live, so clear any "online" left over from a crash/restart
  Bus.updateMany({ status: "online" }, { status: "offline" }).catch(() => {});

  return { live };
};
