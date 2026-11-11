const mongoose = require("mongoose");
// tiny key/value store for one-time flags (e.g. "default buses already created")
module.exports = mongoose.model("Meta", new mongoose.Schema({ key: { type: String, unique: true }, value: mongoose.Schema.Types.Mixed }));
