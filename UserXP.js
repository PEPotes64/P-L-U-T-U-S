const mongoose = require('mongoose');

const userXpSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    guildId: { type: String, required: true },
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    streak: { type: Number, default: 0 },
    lastActiveDate: { type: Date, default: null },
    cartelEquipado: { type: String, default: 'Ninguno' },
    fuenteEquipada: { type: String, default: 'Predeterminada' },
    tablaEquipada: { type: String, default: 'Predeterminada' },
    cartelesComprados: { type: [String], default: [] },
    fuentesCompradas: { type: [String], default: [] },
    packsComprados: { type: [String], default: [] },
    tablasCompradas: { type: [String], default: [] }
});

module.exports = mongoose.models.UserXP || mongoose.model('UserXP', userXpSchema);
