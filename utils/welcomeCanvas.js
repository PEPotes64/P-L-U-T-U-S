const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const fs = require('fs'); // Asegúrate de requerir fs

async function crearTarjetaBienvenida(member) {
    const canvas = createCanvas(1000, 562);
    const ctx = canvas.getContext('2d');

    const rutaFondo = './assets/bienvenida_bg.png';

    // Si ya subiste la imagen con el comando, la usa; si no, pinta un fondo chido por defecto alv
    if (fs.existsSync(rutaFondo)) {
        const background = await loadImage(rutaFondo);
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    } else {
        // Fondo de respaldo por si aún no usas el /setcartel
        ctx.fillStyle = '#1e1e2f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Capa oscura semitransparente para que resalte el texto
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dibujar el Avatar del usuario nuevo en un círculo perrón
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatar = await loadImage(avatarURL);

    const x = 100;
    const y = 180;
    const radius = 80;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, x, y, radius * 2, radius * 2);
    ctx.restore();

    // Textos de bienvenida
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 35px sans-serif';
    ctx.fillText('¡BIENVENIDO A LOS PANAS!', 280, 220);

    ctx.fillStyle = '#ffaa00';
    ctx.font = 'bold 45px sans-serif';
    ctx.fillText(member.user.username.toUpperCase(), 280, 280);

    ctx.fillStyle = '#dddddd';
    ctx.font = '22px sans-serif';
    ctx.fillText(`Eres el miembro número #${member.guild.memberCount}`, 280, 330);

    return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'bienvenida.png' });
}

module.exports = { crearTarjetaBienvenida };
