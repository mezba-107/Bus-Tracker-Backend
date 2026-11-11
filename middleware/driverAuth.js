const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }
  try {
    const decoded = jwt.verify(h.split(" ")[1], process.env.JWT_SECRET);
    if (decoded.role !== "driver") {
      return res.status(403).json({ message: "Driver only" });
    }
    req.driver = decoded; // { id, role }
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};
