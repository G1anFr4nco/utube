const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
    name: { type: String, required: true },
    viewTime: { type: Number, default: 0 },
    categories: { type: [String], default: [] }  // Añade categorías
});

module.exports = mongoose.model('Video', videoSchema);
