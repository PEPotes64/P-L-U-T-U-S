const mongoose = require('mongoose');

const backgroundSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    nombreId: { type: String, required: true },
    fondoUrl: { type: String, required: true },
    urlImagen: { type: String, required: true },
    precio: { type: Number, default: null },
    nivelMinimo: { type: Number, default: null }
});

module.exports = mongoose.models.Background || mongoose.model('Background', backgroundSchema);
