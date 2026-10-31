const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { AttachmentBuilder } = require('discord.js');
const fs = require('fs');

async function crearTarjeta(member, tipo = 'welcome') {
    const canvas = createCanvas(1000, 562);
    const ctx = canvas.getContext('2d');

    const rutaFondo = '../bienvenida_bg.png';

    if (fs.existsSync(rutaFondo)) {
        const background = await loadImage(rutaFondo);
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    } else {
        ctx.fillStyle = '#1e1e2f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Capa oscura con un tinte rojizo si es baneo para darle más drama alv :v
    if (tipo === 'ban') {
        ctx.fillStyle = 'rgba(100, 0, 0, 0.5)';
    } else if (tipo === 'goodbye') {
        ctx.fillStyle = 'rgba(50, 50, 50, 0.5)';
    } else {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    }
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Avatar del usuario
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

    // Textos dinámicos según el evento
        const textX = 300; // Ajustamos un cacho a la izquierda

    if (tipo === 'welcome') {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 26px sans-serif'; // Letra más chica para que quepa
        ctx.fillText('¡BIENVENIDO, AHORA ERES UN PANA!', textX, 215);

        ctx.fillStyle = '#ffaa00';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText(member.user.username.toUpperCase(), textX, 260);

        ctx.fillStyle = '#dddddd';
        ctx.font = '18px sans-serif';
        ctx.fillText(`Eres el miembro número #${member.guild.memberCount}`, textX, 300);
    } else if (tipo === 'goodbye') {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText('HA SIDO UN DISGUSTO...', textX, 215);

        ctx.fillStyle = '#ff5555';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText(member.user.username.toUpperCase(), textX, 260);

        ctx.fillStyle = '#dddddd';
        ctx.font = '18px sans-serif';
        ctx.fillText('Se fue alv', textX, 300);
    } else if (tipo === 'ban') {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 26px sans-serif';
        ctx.fillText('USUARIO BANEADO', textX, 215);

        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText(member.user.username.toUpperCase(), textX, 260);

        ctx.fillStyle = '#dddddd';
        ctx.font = '18px sans-serif';
        ctx.fillText('Se lo llevó la verga por infractor alv', textX, 300);
    }

    return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: `${tipo}.png` });
}

module.exports = { crearTarjeta };
