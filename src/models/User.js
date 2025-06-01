const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, // Remember to hash before saving
    phone: { type: String, trim: true },
    profilePicture: { type: String, default: '' },
    coverPhoto: { type: String, default: '' },
    birthDate: { type: Date },
    about: { type: String, trim: true },
    isAdmin: { type: Boolean, default: false },
    favoriteLists: [{ type: Schema.Types.ObjectId, ref: 'FavoriteList' }],
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
}, { timestamps: true });

// Add index for faster email lookups
userSchema.index({ email: 1 });

module.exports = mongoose.model('User', userSchema);

