const mongoose = require('mongoose');

const autoRoleMenuSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    nombreId: { type: String, required: true, unique: true }, // Nombre único del menú
    roles: [{ 
        roleId: String, 
        label: String, 
        description: String 
    }], // Lista de roles que incluye este menú
    precio: { type: Number, default: 0 }, // Costo en XP (opcional)
    nivelMinimo: { type: Number, default: 1 }, // Nivel requerido (opcional)
    propietarioId: { type: String, default: null } // Si tiene ID, es EXCLUSIVO de ese usuario
});

module.exports = mongoose.model('AutoRoleMenu', autoRoleMenuSchema);
