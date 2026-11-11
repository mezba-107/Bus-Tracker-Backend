const express = require("express");
const User = require("../models/User");

const router = express.Router();

/* ===============================
   GET DRIVER PROFILE BY ID
================================ */
router.get("/drivers/:id", async (req, res) => {
  try {
    const driver = await User.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({
        message: "Driver not found"
      });
    }

    res.status(200).json(driver);

  } catch (err) {
    res.status(500).json({
      message: "Server error"
    });
  }
});

module.exports = router;
