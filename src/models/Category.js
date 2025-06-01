const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const categorySchema = new Schema({
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, trim: true }
}, { timestamps: true });

categorySchema.index({ name: 1 });

module.exports = mongoose.model("Category", categorySchema);

