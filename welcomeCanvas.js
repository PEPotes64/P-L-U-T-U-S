const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');

async function crearTarjetaBienvenida(member) {
    // Creamos el canvas con las medidas de tu dibujo
    const canvas = createCanvas(1000, 562);
    const ctx = canvas.getContext('2d');

    // 1. Cargamos el fondo (puedes cambiar la ruta por defecto o apuntar al archivo que uses)
    try {
        const background = await loadImage('./assets/bienvenida_bg.png');
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    } catch (error) {
        // Fondo de emergencia por si las moscas alv
        ctx.fillStyle = '#1e1e2f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // 2. Capa oscura semitransparente para que resalte el texto
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 3. Dibujar el Avatar del usuario nuevo en un círculo perrón
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

    // 4. Textos de bienvenida (usando fuentes predeterminadas seguras)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 35px sans-serif';
    ctx.fillText('¡BIENVENIDO A LOS PANAS!', 280, 220);

    ctx.fillStyle = '#ffaa00';
    ctx.font = 'bold 45px sans-serif';
    ctx.fillText(member.user.username.toUpperCase(), 280, 280);

    ctx.fillStyle = '#dddddd';
    ctx.font = '22px sans-serif';
    ctx.fillText(`Eres el miembro número #${member.guild.memberCount}`, 280, 330);

    // 5. Retornamos el archivo listo para enviar a Discord
    return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'bienvenida.png' });
}

module.exports = { crearTarjetaBienvenida };
