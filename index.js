process.on('unhandledRejection', error => {
    console.error('❌ ERROR NO CONTROLADO ALV:', error);
});
process.on('uncaughtException', error => {
    console.error('❌ EXCEPCIÓN CRÍTICA:', error);
});

const http = require('http');
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Plutus ta vivo y pintando al centavo maje! > :v');
}).listen(process.env.PORT || 3000);

const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    ApplicationCommandOptionType,
    StringSelectMenuBuilder,
    ActionRowBuilder,
    AttachmentBuilder
} = require('discord.js');
const mongoose = require('mongoose');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
require('dotenv').config();

const UserXP = require('./UserXP.js');
const Background = require('./Background.js');

// --- MODELOS DE MONGO (FUENTES, PACKS Y TABLAS) ---
const fontSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    nombreId: { type: String, required: true },
    fontUrl: { type: String, required: true },
    precio: { type: Number, default: null },
    nivelMinimo: { type: Number, default: null }
});
const Font = mongoose.models.Font || mongoose.model('Font', fontSchema);

const packSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    nombreId: { type: String, required: true },
    fondoNombreId: { type: String, required: true },
    fuenteNombreId: { type: String, required: true },
    precio: { type: Number, default: null },
    nivelMinimo: { type: Number, default: null }
});
const Pack = mongoose.models.Pack || mongoose.model('Pack', packSchema);

const tablaSchema = new mongoose.Schema({
    guildId: String,
    nombreId: String,
    urlImagen: String,
    precio: { type: Number, default: null },
    nivelMinimo: { type: Number, default: null }
});
const Tabla = mongoose.models.Tabla || mongoose.model('Tabla', tablaSchema);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// TU ID EXCLUSIVA DE PEPO
const PEPO_ID = '1259006426978713620';

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log('✅ Conectado a MongoDB Atlas');
        // Esto borra el índice maldito que causa el error de duplicados
        try {
            await mongoose.connection.collection('backgrounds').dropIndex('guildId_1');
            console.log('🗑️ Índice duplicado guildId_1 eliminado con éxito de MongoDB');
        } catch (e) {
            console.log('ℹ️ El índice guildId_1 ya no existe o ya fue limpiado.');
        }
    })
    .catch(err => console.error('❌ Error al conectar a MongoDB:', err));

// --- COMANDOS SLASH DE PLUTUS (SOLO ARTE, TIENDA COSMÉTICA Y PERFIL) ---
const dataComprar = { name: 'comprar', description: 'Abre la tienda de cosméticos de Plutus gastando tu XP' };
const dataPerfil = { name: 'perfil', description: 'Abre tu armario de fondos, fuentes y tablas' };

const dataCritica = {
    name: 'critica',
    description: 'Genera la tarjeta gráfica para un artista (Exclusivo Pepo)',
    options: [
        { name: 'artista', type: ApplicationCommandOptionType.User, description: 'Artista', required: true },
        { name: 'foto', type: ApplicationCommandOptionType.Attachment, description: 'Dibujo', required: true },
        { name: 'lo_bueno', type: ApplicationCommandOptionType.String, description: 'Lo bueno', required: true },
        { name: 'lo_malo', type: ApplicationCommandOptionType.String, description: 'Lo malo', required: true },
        { name: 'resumen', type: ApplicationCommandOptionType.String, description: 'Resumen', required: true },
        { name: 'positivo', type: ApplicationCommandOptionType.Integer, description: 'Positivo %', required: false },
        { name: 'lineart', type: ApplicationCommandOptionType.Integer, description: 'Lineart %', required: false },
        { name: 'creatividad', type: ApplicationCommandOptionType.Integer, description: 'Creatividad %', required: false },
        { name: 'detalles', type: ApplicationCommandOptionType.Integer, description: 'Detalles %', required: false },
        { name: 'paleta', type: ApplicationCommandOptionType.Integer, description: 'Paleta %', required: false },
        { name: 'pinceles', type: ApplicationCommandOptionType.Integer, description: 'Pinceles %', required: false }
    ]
};

const dataSetBg = {
    name: 'setbg',
    description: 'Sube/asigna un fondo directo a MongoDB (Exclusivo Pepo)',
    options: [
        { name: 'nombre_id', type: ApplicationCommandOptionType.String, description: 'Nombre ID', required: true },
        { name: 'imagen', type: ApplicationCommandOptionType.Attachment, description: 'Imagen', required: true },
        { name: 'precio', type: ApplicationCommandOptionType.Integer, description: 'Precio', required: false },
        { name: 'nivel', type: ApplicationCommandOptionType.Integer, description: 'Nivel', required: false },
        { name: 'usuario', type: ApplicationCommandOptionType.User, description: 'Regalar', required: false }
    ]
};

const dataDelBg = {
    name: 'delbg',
    description: 'Borra un fondo de MongoDB (Exclusivo Pepo)',
    options: [
        { name: 'nombre_id', type: ApplicationCommandOptionType.String, description: 'Nombre ID', required: true }
    ]
};

const dataSetFont = {
    name: 'setfont',
    description: 'Sube una fuente .ttf/.otf al sistema (Exclusivo Pepo)',
    options: [
        { name: 'nombre_id', type: ApplicationCommandOptionType.String, description: 'Nombre ID de la fuente', required: true },
        { name: 'archivo', type: ApplicationCommandOptionType.Attachment, description: 'Archivo .ttf o .otf', required: true },
        { name: 'precio', type: ApplicationCommandOptionType.Integer, description: 'Precio en XP', required: false },
        { name: 'nivel', type: ApplicationCommandOptionType.Integer, description: 'Nivel mínimo', required: false },
        { name: 'usuario', type: ApplicationCommandOptionType.User, description: 'Regalar a usuario', required: false }
    ]
};

const dataSetPack = {
    name: 'setpack',
    description: 'Crea un Pack (Fondo + Fuente) (Exclusivo Pepo)',
    options: [
        { name: 'nombre_pack', type: ApplicationCommandOptionType.String, description: 'Nombre del Pack', required: true },
        { name: 'fondo_id', type: ApplicationCommandOptionType.String, description: 'Fondo existente', required: true },
        { name: 'fuente_id', type: ApplicationCommandOptionType.String, description: 'Fuente existente', required: true },
        { name: 'precio', type: ApplicationCommandOptionType.Integer, description: 'Precio combo', required: false },
        { name: 'nivel', type: ApplicationCommandOptionType.Integer, description: 'Nivel mínimo', required: false },
        { name: 'usuario', type: ApplicationCommandOptionType.User, description: 'Regalar pack', required: false }
    ]
};

const dataTabla = {
    name: 'settabla',
    description: 'Sube/asigna una tabla o marco translúcido a MongoDB (Exclusivo Pepo)',
    options: [
        { name: 'nombre', type: ApplicationCommandOptionType.String, description: 'Nombre ID de la tabla', required: true },
        { name: 'imagen', type: ApplicationCommandOptionType.Attachment, description: 'Subir imagen desde galería', required: true },
        { name: 'precio', type: ApplicationCommandOptionType.Integer, description: 'Precio en XP', required: false },
        { name: 'nivel', type: ApplicationCommandOptionType.Integer, description: 'Nivel mínimo', required: false }
    ]
};

client.once('ready', async () => {
    console.log(`Bot Plutus prendido como ${client.user.tag} > :v`);

    try {
        const fuentesGuardadas = await Font.find({});
        for (const f of fuentesGuardadas) {
            try {
                const res = await fetch(f.fontUrl);
                const buffer = Buffer.from(await res.arrayBuffer());
                GlobalFonts.register(buffer, f.nombreId);
                console.log(`🔤 Fuente cargada y registrada: ${f.nombreId}`);
            } catch (e) {
                console.error(`Error cargando fuente ${f.nombreId}:`, e);
            }
        }
    } catch (err) {
        console.error("Error al sincronizar fuentes al inicio:", err);
    }

    try {
        const comandosTotales = [
            dataComprar, dataPerfil, dataCritica, dataSetBg, 
            dataDelBg, dataSetFont, dataSetPack, dataTabla
        ];

        for (const [guildId, guild] of client.guilds.cache) {
            await guild.commands.set(comandosTotales);
            console.log(`✅ Comandos de Plutus cargados en: ${guild.name}`);
        }
        console.log('¡Comandos de Plutus listos al 100 alv > :v!');
    } catch (error) {
        console.error('❌ Error cargando comandos:', error);
    }
});

// --- HELPERS DE XP ---
const obtenerXpTotal = (data) => {
    let total = data.xp;
    for (let i = 1; i < data.level; i++) {
        total += (i + 1) * 100;
    }
    return total;
};

const recalcularProgreso = (data, nuevoXpTotal) => {
    let lvl = 1;
    let xpRestante = nuevoXpTotal;
    let xpReq = (lvl + 1) * 100;

    while (xpRestante >= xpReq) {
        xpRestante -= xpReq;
        lvl++;
        xpReq = (lvl + 1) * 100;
    }

    data.level = lvl;
    data.xp = xpRestante;
};

// --- RENDERIZADOR CANVAS BLINDADO DE PLUTUS ---
async function generarTarjetaCritica({ 
    dibujoUrl, 
    artistaNombre, 
    artistaAvatarUrl, 
    loBueno, 
    loMalo, 
    resumen, 
    fondoUrl, 
    tablaUrl, 
    positivoPct, 
    stats, 
    fuenteNombre 
}) {
    const width = 1000;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    const fontName = fuenteNombre ? fuenteNombre : 'sans-serif';
    const fontMain = `"${fontName}", sans-serif`;

    const posFinal = Math.max(0, Math.min(100, positivoPct ?? 70));
    const negativoPct = Math.max(0, Math.min(100, 100 - posFinal));

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    let fondoCargadoExitosamente = false;
    if (fondoUrl) {
        try {
            const resBg = await fetch(fondoUrl);
            if (resBg.ok) {
                const bufBg = Buffer.from(await resBg.arrayBuffer());
                const fondoImg = await loadImage(bufBg);
                ctx.drawImage(fondoImg, 0, 0, width, height);
                fondoCargadoExitosamente = true;
            }
        } catch (e) {
            console.error("❌ [CANVAS] Error cargando fondo:", e.message);
        }
    }

    if (!fondoCargadoExitosamente) {
        const grad = ctx.createLinearGradient(0, 0, width, height);
        grad.addColorStop(0, '#1a1035');
        grad.addColorStop(0.5, '#0f172a');
        grad.addColorStop(1, '#090d16');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
    }

            // --- ÚNICO BLOQUE OFICIAL PARA LA TABLA ---
    let tablaRenderizada = false;
    if (tablaUrl) {
        try {
            const resTabla = await fetch(tablaUrl);
            if (resTabla.ok) {
                const bufTabla = Buffer.from(await resTabla.arrayBuffer());
                const imgTabla = await loadImage(bufTabla);

                ctx.save();
                ctx.beginPath();
                // Reemplaza TODO el panel interior con las medidas exactas (X:20, Y:20, Ancho:960, Alto:560, Radio:20)
                ctx.roundRect(20, 20, width - 40, height - 40, 20);
                ctx.clip(); // Recorta para que encaje perfecto en los bordes redondeados
                
                ctx.drawImage(imgTabla, 20, 20, width - 40, height - 40);
                ctx.restore();
                tablaRenderizada = true;
            }
        } catch (e) {
            console.error("⚠️ [CANVAS] Error cargando tabla:", e.message);
        }
    }

    // Si el usuario no tiene tabla equipada o falló, se pinta el panel oscuro clásico de respaldo
    if (!tablaRenderizada) {
        ctx.save();
        ctx.fillStyle = 'rgba(15, 15, 20, 0.75)';
        ctx.beginPath();
        ctx.roundRect(20, 20, width - 40, height - 40, 20);
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }
    
    ctx.restore();

    if (dibujoUrl) {
        try {
            const resDibujo = await fetch(dibujoUrl);
            if (resDibujo.ok) {
                const bufDibujo = Buffer.from(await resDibujo.arrayBuffer());
                const imgDibujo = await loadImage(bufDibujo);
                ctx.save();
                ctx.drawImage(imgDibujo, 40, 40, 380, 370);
                ctx.restore();
            }
        } catch (errDibujo) {
            console.error("❌ [CANVAS] Error al cargar el dibujo:", errDibujo.message);
        }
    }

    const barX = 40;
    const barWidth = 400;
    const barHeight = 16;

    const barYPos = 430;
    ctx.font = `bold 14px ${fontMain}`;
    ctx.fillStyle = '#4CAF50';
    ctx.fillText(`🟢 Positivo: ${posFinal}%`, barX, barYPos);

    ctx.fillStyle = 'rgba(30, 35, 42, 0.8)';
    ctx.beginPath();
    ctx.roundRect(barX, barYPos + 6, barWidth, barHeight, 6);
    ctx.fill();

    if (posFinal > 0) {
        const wVerde = (barWidth * posFinal) / 100;
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.roundRect(barX, barYPos + 6, wVerde, barHeight, 6);
        ctx.fill();
    }

    const barYNeg = 480;
    ctx.fillStyle = '#FF5252';
    ctx.fillText(`🔴 Negativo: ${negativoPct}%`, barX, barYNeg);

    ctx.fillStyle = 'rgba(30, 35, 42, 0.8)';
    ctx.beginPath();
    ctx.roundRect(barX, barYNeg + 6, barWidth, barHeight, 6);
    ctx.fill();

    if (negativoPct > 0) {
        const wRojo = (barWidth * negativoPct) / 100;
        ctx.fillStyle = '#FF5252';
        ctx.beginPath();
        ctx.roundRect(barX, barYNeg + 6, wRojo, barHeight, 6);
        ctx.fill();
    }

    ctx.fillStyle = '#FFD700';
    ctx.font = `bold 22px ${fontMain}`;
    ctx.fillText(`🎨 @${artistaNombre}`, 470, 75);

    try {
        if (artistaAvatarUrl) {
            const resAvatar = await fetch(artistaAvatarUrl);
            if (resAvatar.ok) {
                const bufAvatar = Buffer.from(await resAvatar.arrayBuffer());
                const avatarImg = await loadImage(bufAvatar);

                ctx.save();
                ctx.beginPath();
                ctx.arc(920, 70, 35, 0, Math.PI * 2);
                ctx.clip();
                ctx.drawImage(avatarImg, 885, 35, 70, 70);
                ctx.restore();
            }
        }
    } catch (e) {
        console.error("❌ [CANVAS] Error avatar:", e.message);
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(470, 115);
    ctx.lineTo(950, 115);
    ctx.stroke();

    const wrapText = (context, label, text, colorLabel, x, startY, maxWidth, lineHeight) => {
        context.font = `bold 16px ${fontMain}`;
        context.fillStyle = colorLabel;
        context.fillText(label, x, startY);

        context.font = `15px ${fontMain}`;
        context.fillStyle = '#E2E2E8';

        const words = (text || 'N/A').split(' ');
        let line = '';
        let currentY = startY + 20;

        for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' ';
            let metrics = context.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                context.fillText(line, x, currentY);
                line = words[n] + ' ';
                currentY += lineHeight;
            } else {
                line = testLine;
            }
        }
        context.fillText(line, x, currentY);
        return currentY + 25;
    };

    let nextY = wrapText(ctx, '🟢 LO FUERTE:', loBueno, '#4CAF50', 470, 145, 480, 20);
    nextY = wrapText(ctx, '🔴 EL FRENO:', loMalo, '#FF5252', 470, nextY, 480, 20);
    nextY = wrapText(ctx, '📜 VEREDICTO:', resumen, '#FFB700', 470, nextY, 480, 20);

    const graphYBase = 530;
    const graphMaxHeight = 100;
    const startX = 480;
    const barGap = 90;
    const colWidth = 28;

    ctx.fillStyle = '#FFD700';
    ctx.font = `bold 16px ${fontMain}`;
    ctx.fillText('📊 ANÁLISIS DE HABILIDADES:', 470, Math.max(nextY + 10, 330));

    const obtenerColorRango = (porcentaje) => {
        if (porcentaje < 30) return '#FF5252';
        if (porcentaje < 50) return '#FFB700';
        if (porcentaje < 75) return '#00E676';
        if (porcentaje < 90) return '#00E5FF';
        return '#D500F9';
    };

    stats.forEach((item, index) => {
        const x = startX + (index * barGap);
        const val = Math.max(0, Math.min(100, item.val ?? 50));
        const currentBarHeight = (graphMaxHeight * val) / 100;
        const colorBarra = obtenerColorRango(val);

        ctx.fillStyle = 'rgba(30, 35, 42, 0.8)';
        ctx.beginPath();
        ctx.roundRect(x, graphYBase - graphMaxHeight, colWidth, graphMaxHeight, 8);
        ctx.fill();

        if (val > 0) {
            ctx.fillStyle = colorBarra;
            ctx.beginPath();
            ctx.roundRect(x, graphYBase - currentBarHeight, colWidth, currentBarHeight, 8);
            ctx.fill();
        }

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold 12px ${fontMain}`;
        ctx.fillText(`${val}%`, x - 2, graphYBase - (val > 0 ? currentBarHeight : 0) - 8);

        ctx.fillStyle = '#AAAAAA';
        ctx.font = `bold 11px ${fontMain}`;
        ctx.fillText(item.nombre, x - 10, graphYBase + 20);
    });

    return canvas.toBuffer('image/png');
}

// --- MANEJADOR DE COMANDOS SLASH ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'perfil') {
        try {
            await interaction.deferReply({ ephemeral: true });
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;

            let userXpData = await UserXP.findOne({ userId, guildId });
            const nivelUsuario = userXpData ? userXpData.level : 1;

            const bgsComprados = userXpData?.cartelesComprados || [];
            const bgsGratisLvl = await Background.find({ guildId, precio: null, nivelMinimo: { $ne: null, $lte: nivelUsuario } });
            const bgsPredeterminados = await Background.find({ guildId, precio: null, nivelMinimo: null });
            const nombresBgsGratis = [...bgsGratisLvl, ...bgsPredeterminados].map(b => b.nombreId);
            const todosMisFondos = [...new Set([...nombresBgsGratis, ...bgsComprados])];

            const fuentesCompradas = userXpData?.fuentesCompradas || [];
            const fuentesGratisLvl = await Font.find({ guildId, precio: null, nivelMinimo: { $ne: null, $lte: nivelUsuario } });
            const fuentesPredeterminadas = await Font.find({ guildId, precio: null, nivelMinimo: null });
            const nombresFuentesGratis = [...fuentesGratisLvl, ...fuentesPredeterminadas].map(f => f.nombreId);
            const todasMisFuentes = [...new Set([...nombresFuentesGratis, ...fuentesCompradas])];

            const packsComprados = userXpData?.packsComprados || [];
            const packsGratisLvl = await Pack.find({ guildId, precio: null, nivelMinimo: { $ne: null, $lte: nivelUsuario } });
            const packsPredeterminados = await Pack.find({ guildId, precio: null, nivelMinimo: null });
            const nombresPacksGratis = [...packsGratisLvl, ...packsPredeterminados].map(p => p.nombreId);
            const todosMisPacks = [...new Set([...nombresPacksGratis, ...packsComprados])];

            const tablasCompradas = userXpData?.tablasCompradas || [];
            const tablasGratisLvl = await Tabla.find({ guildId, precio: null, nivelMinimo: { $ne: null, $lte: nivelUsuario } });
            const tablasPredeterminadas = await Tabla.find({ guildId, precio: null, nivelMinimo: null });
            const nombresTablasGratis = [...tablasGratisLvl, ...tablasPredeterminadas].map(t => t.nombreId);
            const todasMisTablas = [...new Set([...nombresTablasGratis, ...tablasCompradas])];

            const perfilEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle(`🎨 Armario de Plutus de ${interaction.user.username}`)
                .setDescription('Elegí y equipá tus cosméticos artísticos.')
                .addFields(
                    { name: '🌅 Fondo Equipado:', value: `\`${userXpData?.cartelEquipado || 'Ninguno'}\``, inline: true },
                                        { name: '🪞 Tabla Equipada:', value: `\`${userXpData?.tablaEquipada || 'Predeterminada'}\``, inline: true }
                )
                .setFooter({ text: 'Plutus • Tesorería y Arte', iconURL: client.user.displayAvatarURL() });

            const componentes = [];

            if (todosMisFondos.length > 0) {
                const menuBgs = new StringSelectMenuBuilder()
                    .setCustomId('equipar_cartel_menu')
                    .setPlaceholder('🖼️ Elegí un Fondo para equipar...')
                    .addOptions(todosMisFondos.map(c => ({ label: `Fondo: ${c}`, value: `equipar_cartel_${c}`, emoji: '🖼️' })));
                componentes.push(new ActionRowBuilder().addComponents(menuBgs));
            }

            if (todasMisFuentes.length > 0) {
                const menuFonts = new StringSelectMenuBuilder()
                    .setCustomId('equipar_fuente_menu')
                    .setPlaceholder('🔤 Elegí una Fuente para equipar...')
                    .addOptions(todasMisFuentes.map(f => ({ label: `Fuente: ${f}`, value: `equipar_fuente_${f}`, emoji: '🔤' })));
                componentes.push(new ActionRowBuilder().addComponents(menuFonts));
            }

            if (todosMisPacks.length > 0) {
                const menuPacks = new StringSelectMenuBuilder()
                    .setCustomId('equipar_pack_menu')
                    .setPlaceholder('📦 Elegí un Pack Combo para equipar...')
                    .addOptions(todosMisPacks.map(p => ({ label: `Pack Combo: ${p}`, value: `equipar_pack_${p}`, emoji: '📦' })));
                componentes.push(new ActionRowBuilder().addComponents(menuPacks));
            }

            if (todasMisTablas.length > 0) {
                const menuTablas = new StringSelectMenuBuilder()
                    .setCustomId('equipar_tabla_menu')
                    .setPlaceholder('🪞 Elegí una Tabla para equipar...')
                    .addOptions(todasMisTablas.map(t => ({ label: `Tabla: ${t}`, value: `equipar_tabla_${t}`, emoji: '🪞' })));
                componentes.push(new ActionRowBuilder().addComponents(menuTablas));
            }
            
            return await interaction.editReply({ embeds: [perfilEmbed], components: componentes });
        } catch (err) {
            console.error("Error en /perfil:", err);
            if (interaction.deferred) await interaction.editReply(`❌ Error al abrir perfil: \`${err.message}\``);
        }
    }

    if (commandName === 'critica') {
        if (interaction.user.id !== PEPO_ID) {
            return await interaction.reply({ content: '❌ Solo Pepo.', ephemeral: true });
        }
        await interaction.deferReply();

        try {
            const artista = interaction.options.getUser('artista');
            const foto = interaction.options.getAttachment('foto');
            const loBueno = interaction.options.getString('lo_bueno');
            const loMalo = interaction.options.getString('lo_malo');
            const resumen = interaction.options.getString('resumen');
            const positivoPct = interaction.options.getInteger('positivo') ?? 70;

            const stats = [
                { nombre: 'Lineart', val: interaction.options.getInteger('lineart') ?? 80 },
                { nombre: 'Creatividad', val: interaction.options.getInteger('creatividad') ?? 85 },
                { nombre: 'Detalles', val: interaction.options.getInteger('detalles') ?? 75 },
                { nombre: 'Paleta', val: interaction.options.getInteger('paleta') ?? 90 },
                { nombre: 'Pinceles', val: interaction.options.getInteger('pinceles') ?? 70 }
            ];

            let datosArtista = await UserXP.findOne({ userId: artista.id, guildId: interaction.guild.id });
            
            const nombreCartel = datosArtista?.cartelEquipado || datosArtista?.cartelEquipada;
            const fuenteNombre = datosArtista?.fuenteEquipada;
            const nombreTabla = datosArtista?.tablaEquipada;

            let urlFondoUsar = null;
            if (nombreCartel && nombreCartel !== 'Ninguno') {
                const regexBg = new RegExp(`^${nombreCartel.trim()}$`, 'i');
                const bgObj = await Background.findOne({ guildId: interaction.guild.id, nombreId: regexBg });
                if (bgObj) {
                    urlFondoUsar = bgObj.fondoUrl || bgObj.urlImagen || bgObj.imageUrl || bgObj.url;
                }
            }

            let urlTablaUsar = null;
            if (nombreTabla && nombreTabla !== 'Predeterminada') {
                const regexTabla = new RegExp(`^${nombreTabla.trim()}$`, 'i');
                const tablaObj = await Tabla.findOne({ guildId: interaction.guild.id, nombreId: regexTabla });
                if (tablaObj) {
                    urlTablaUsar = tablaObj.urlImagen || tablaObj.url || tablaObj.imageUrl;
                }
            }

            const bufferFicha = await generarTarjetaCritica({
                dibujoUrl: foto.url,
                artistaNombre: artista.username,
                artistaAvatarUrl: artista.displayAvatarURL({ extension: 'png', size: 256 }),
                loBueno,
                loMalo,
                resumen,
                fondoUrl: urlFondoUsar,
                tablaUrl: urlTablaUsar,
                positivoPct,
                stats,
                fuenteNombre
            });

            const attachment = new AttachmentBuilder(bufferFicha, { name: `critica_${artista.username}.png` });
            return await interaction.editReply({
                content: `🎨 **EVALUACIÓN OFICIAL DE #SEMANAL PARA** <@${artista.id}>`,
                files: [attachment]
            });
        } catch (error) {
            console.error("❌ Error crítico en /critica:", error);
            return await interaction.editReply('❌ Puchica maje, falló el renderizado de la crítica.');
        }
    }

    if (commandName === 'comprar') {
        await interaction.deferReply();

        const fondosTienda = await Background.find({ guildId: interaction.guild.id, precio: { $ne: null } });
        const fuentesTienda = await Font.find({ guildId: interaction.guild.id, precio: { $ne: null } });
        const packsTienda = await Pack.find({ guildId: interaction.guild.id, precio: { $ne: null } });
        const tablasTienda = await Tabla.find({ guildId: interaction.guild.id, precio: { $ne: null } });
        
        const tiendaEmbed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏛️ Tesorería y Tienda de Arte de Plutus')
            .setDescription('Gasta tu XP acumulada para comprar fondos, fuentes, packs y tablas exclusivas.');

        const opcionesMenu = [];

        fondosTienda.forEach(f => {
            tiendaEmbed.addFields({
                name: `🖼️ Fondo: ${f.nombreId} (${f.precio} XP)`,
                value: `Nivel Mínimo: ${f.nivelMinimo ?? 'Ninguno'}`
            });
            opcionesMenu.push({
                label: `Fondo: ${f.nombreId} (${f.precio} XP)`,
                description: `Req. Nivel ${f.nivelMinimo ?? 1}`,
                value: `comprar_bg_${f.nombreId}`,
                emoji: '🖼️'
            });
        });

        fuentesTienda.forEach(fu => {
            tiendaEmbed.addFields({
                name: `🔤 Fuente: ${fu.nombreId} (${fu.precio} XP)`,
                value: `Nivel Mínimo: ${fu.nivelMinimo ?? 'Ninguno'}`
            });
            opcionesMenu.push({
                label: `Fuente: ${fu.nombreId} (${fu.precio} XP)`,
                description: `Req. Nivel ${fu.nivelMinimo ?? 1}`,
                value: `comprar_font_${fu.nombreId}`,
                emoji: '🔤'
            });
        });

        packsTienda.forEach(p => {
            tiendaEmbed.addFields({
                name: `📦 Pack: ${p.nombreId} (${p.precio} XP)`,
                value: `Nivel Mínimo: ${p.nivelMinimo ?? 'Ninguno'}`
            });
            opcionesMenu.push({
                label: `Pack: ${p.nombreId} (${p.precio} XP)`,
                description: `Req. Nivel ${p.nivelMinimo ?? 1}`,
                value: `comprar_pack_${p.nombreId}`,
                emoji: '📦'
            });
        });

        tablasTienda.forEach(t => {
            tiendaEmbed.addFields({
                name: `🪞 Tabla: ${t.nombreId} (${t.precio} XP)`,
                value: `Nivel Mínimo: ${t.nivelMinimo ?? 'Ninguno'}`
            });
            opcionesMenu.push({
                label: `Tabla: ${t.nombreId} (${t.precio} XP)`,
                description: `Req. Nivel ${t.nivelMinimo ?? 1}`,
                value: `comprar_tabla_${t.nombreId}`,
                emoji: '🪞'
            });
        });

        if (opcionesMenu.length === 0) {
            tiendaEmbed.addFields({ name: '⚠️ Tienda Vacía', value: 'Pepo todavía no ha subido cosméticos a la tienda.' });
            return await interaction.editReply({ embeds: [tiendaEmbed] });
        }

        const menuSelec = new StringSelectMenuBuilder()
            .setCustomId('tienda_menu')
            .setPlaceholder('Elegí un cosmético para comprar...')
            .addOptions(opcionesMenu);

        const fila = new ActionRowBuilder().addComponents(menuSelec);
        await interaction.editReply({ embeds: [tiendaEmbed], components: [fila] });
        return;
    }

    if (commandName === 'setpack') {
        if (interaction.user.id !== PEPO_ID) return await interaction.reply({ content: '❌ Solo Pepo.', ephemeral: true });
        await interaction.deferReply({ ephemeral: true });

        const nombrePack = interaction.options.getString('nombre_pack').toLowerCase().trim();
        const fondoId = interaction.options.getString('fondo_id').toLowerCase().trim();
        const fuenteId = interaction.options.getString('fuente_id').toLowerCase().trim();
        const precio = interaction.options.getInteger('precio');
        const nivel = interaction.options.getInteger('nivel');

        await Pack.findOneAndUpdate(
            { guildId: interaction.guild.id, nombreId: nombrePack },
            { fondoNombreId: fondoId, fuenteNombreId: fuenteId, precio: precio ?? null, nivelMinimo: nivel ?? null },
            { upsert: true, new: true }
        );
        return await interaction.editReply(`📦 ¡Pack Combo **"${nombrePack}"** creado con éxito!`);
    }

    if (commandName === 'setfont') {
        if (interaction.user.id !== PEPO_ID) return await interaction.reply({ content: '❌ Solo Pepo.', ephemeral: true });
        await interaction.deferReply({ ephemeral: true });

        const nombreId = interaction.options.getString('nombre_id').toLowerCase().trim();
        const archivo = interaction.options.getAttachment('archivo');
        const precio = interaction.options.getInteger('precio');
        const nivel = interaction.options.getInteger('nivel');

        const response = await fetch(archivo.url);
        const buffer = Buffer.from(await response.arrayBuffer());
        GlobalFonts.register(buffer, nombreId);

        await Font.findOneAndUpdate(
            { guildId: interaction.guild.id, nombreId },
            { fontUrl: archivo.url, precio: precio ?? null, nivelMinimo: nivel ?? null },
            { upsert: true, new: true }
        );
        return await interaction.editReply(`✅ ¡Fuente **"${nombreId}"** registrada con éxito!`);
    }

        if (commandName === 'setbg') {
        if (interaction.user.id !== PEPO_ID) return await interaction.reply({ content: '❌ Solo Pepo.', ephemeral: true });
        await interaction.deferReply({ ephemeral: true });

        const nombreInput = interaction.options.getString('nombre') || interaction.options.getString('nombre_id');
        const nombreId = nombreInput.toLowerCase().trim();
        const urlImagen = interaction.options.getAttachment('imagen').url;
        const precio = interaction.options.getInteger('precio') || null;
        const nivelMinimo = interaction.options.getInteger('nivel') || null;

        await Background.findOneAndUpdate(
            { guildId: interaction.guild.id, nombreId },
            { guildId: interaction.guild.id, nombreId, fondoUrl: urlImagen, urlImagen, precio, nivelMinimo },
            { upsert: true, new: true }
        );
        return await interaction.editReply(`✅ ¡Fondo **"${nombreId}"** guardado en Mongo al centavo!`);
            
    }
    

    if (commandName === 'delbg') {
        if (interaction.user.id !== PEPO_ID) return await interaction.reply({ content: '❌ Solo Pepo.', ephemeral: true });
        await interaction.deferReply({ ephemeral: true });

        const nombreId = interaction.options.getString('nombre_id').toLowerCase().trim();
        await Background.findOneAndDelete({ guildId: interaction.guild.id, nombreId: new RegExp(`^${nombreId}$`, 'i') });
        return await interaction.editReply(`🗑️ ¡Fondo **"${nombreId}"** eliminado!`);
    }

    if (commandName === 'settabla') {
        if (interaction.user.id !== PEPO_ID) return await interaction.reply({ content: '❌ Solo Pepo.', ephemeral: true });
        await interaction.deferReply({ ephemeral: true });

        const nombreId = interaction.options.getString('nombre').toLowerCase().trim();
        const urlImagen = interaction.options.getAttachment('imagen').url;
        const precio = interaction.options.getInteger('precio') || null;
        const nivelMinimo = interaction.options.getInteger('nivel') || null;

        await Tabla.findOneAndUpdate(
            { guildId: interaction.guild.id, nombreId },
            { urlImagen, precio, nivelMinimo },
            { upsert: true, new: true }
        );
        return await interaction.editReply(`✅ ¡Tabla **"${nombreId}"** guardada con éxito!`);
    }
});

// --- MANEJADOR DE SELECCIONES DE PLUTUS (TIENDA Y ARMARIO) ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;

    const { customId, values } = interaction;

    try {
        if (customId === 'tienda_menu') {
            await interaction.deferReply({ ephemeral: true });
            const opcion = values[0];
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;

            let userXpData = await UserXP.findOne({ userId, guildId });
            if (!userXpData) userXpData = new UserXP({ userId, guildId, xp: 0, level: 1 });

            const xpTotalActual = obtenerXpTotal(userXpData);

            if (opcion.startsWith('comprar_bg_')) {
                const bgId = opcion.replace('comprar_bg_', '');
                const bgObj = await Background.findOne({ guildId, nombreId: bgId });
                if (!bgObj) return await interaction.editReply('❌ El fondo ya no existe.');
                if (bgObj.nivelMinimo && userXpData.level < bgObj.nivelMinimo) return await interaction.editReply(`❌ Requiere Nivel ${bgObj.nivelMinimo}.`);
                if (xpTotalActual < bgObj.precio) return await interaction.editReply(`❌ Necesitás ${bgObj.precio} XP.`);

                recalcularProgreso(userXpData, xpTotalActual - bgObj.precio);
                if (!userXpData.cartelesComprados) userXpData.cartelesComprados = [];
                if (!userXpData.cartelesComprados.includes(bgId)) userXpData.cartelesComprados.push(bgId);
                userXpData.cartelEquipado = bgId;
                await userXpData.save();
                return await interaction.editReply(`🖼️ ¡Compraste y equipaste el fondo **${bgId}** con éxito!`);
            }

            if (opcion.startsWith('comprar_font_')) {
                const fontId = opcion.replace('comprar_font_', '');
                const fontObj = await Font.findOne({ guildId, nombreId: fontId });
                if (!fontObj) return await interaction.editReply('❌ La fuente ya no existe.');
                if (fontObj.nivelMinimo && userXpData.level < fontObj.nivelMinimo) return await interaction.editReply(`❌ Requiere Nivel ${fontObj.nivelMinimo}.`);
                if (xpTotalActual < fontObj.precio) return await interaction.editReply(`❌ Necesitás ${fontObj.precio} XP.`);

                recalcularProgreso(userXpData, xpTotalActual - fontObj.precio);
                if (!userXpData.fuentesCompradas) userXpData.fuentesCompradas = [];
                if (!userXpData.fuentesCompradas.includes(fontId)) userXpData.fuentesCompradas.push(fontId);
                userXpData.fuenteEquipada = fontId;
                await userXpData.save();
                return await interaction.editReply(`🔤 ¡Compraste y equipaste la fuente **${fontId}** con éxito!`);
            }

            if (opcion.startsWith('comprar_pack_')) {
                const packId = opcion.replace('comprar_pack_', '');
                const packObj = await Pack.findOne({ guildId, nombreId: packId });
                if (!packObj) return await interaction.editReply('❌ El pack ya no existe.');
                if (packObj.nivelMinimo && userXpData.level < packObj.nivelMinimo) return await interaction.editReply(`❌ Requiere Nivel ${packObj.nivelMinimo}.`);
                if (xpTotalActual < packObj.precio) return await interaction.editReply(`❌ Necesitás ${packObj.precio} XP.`);

                recalcularProgreso(userXpData, xpTotalActual - packObj.precio);
                if (!userXpData.cartelesComprados) userXpData.cartelesComprados = [];
                if (!userXpData.fuentesCompradas) userXpData.fuentesCompradas = [];
                if (!userXpData.packsComprados) userXpData.packsComprados = [];

                if (!userXpData.cartelesComprados.includes(packObj.fondoNombreId)) userXpData.cartelesComprados.push(packObj.fondoNombreId);
                if (!userXpData.fuentesCompradas.includes(packObj.fuenteNombreId)) userXpData.fuentesCompradas.push(packObj.fuenteNombreId);
                if (!userXpData.packsComprados.includes(packId)) userXpData.packsComprados.push(packId);

                userXpData.cartelEquipado = packObj.fondoNombreId;
                userXpData.fuenteEquipada = packObj.fuenteNombreId;
                await userXpData.save();
                return await interaction.editReply(`📦 ¡Compraste y equipaste el pack combo **${packId}**!`);
            }

            if (opcion.startsWith('comprar_tabla_')) {
                const tablaId = opcion.replace('comprar_tabla_', '');
                const tablaObj = await Tabla.findOne({ guildId, nombreId: tablaId });
                if (!tablaObj) return await interaction.editReply('❌ La tabla ya no existe.');
                if (tablaObj.nivelMinimo && userXpData.level < tablaObj.nivelMinimo) return await interaction.editReply(`❌ Requiere Nivel ${tablaObj.nivelMinimo}.`);
                if (xpTotalActual < tablaObj.precio) return await interaction.editReply(`❌ Necesitás ${tablaObj.precio} XP.`);

                recalcularProgreso(userXpData, xpTotalActual - tablaObj.precio);
                if (!userXpData.tablasCompradas) userXpData.tablasCompradas = [];
                if (!userXpData.tablasCompradas.includes(tablaId)) userXpData.tablasCompradas.push(tablaId);
                userXpData.tablaEquipada = tablaId;
                await userXpData.save();
                return await interaction.editReply(`🪞 ¡Compraste y equipaste la tabla **${tablaId}** con éxito!`);
            }
        }

        if (customId === 'equipar_tabla_menu') {
            await interaction.deferReply({ ephemeral: true });
            const tablaId = values[0].replace('equipar_tabla_', '').trim();
            let userXpData = await UserXP.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });
            if (!userXpData) userXpData = new UserXP({ userId: interaction.user.id, guildId: interaction.guild.id });
            userXpData.tablaEquipada = tablaId;
            await userXpData.save();
            return await interaction.editReply({ content: `✅ ¡Te equipaste la tabla **"${tablaId}"** con éxito!` });
        }

        if (customId === 'equipar_cartel_menu') {
            await interaction.deferReply({ ephemeral: true });
            const cartelId = values[0].replace('equipar_cartel_', '');
            let userXpData = await UserXP.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });
            if (!userXpData) userXpData = new UserXP({ userId: interaction.user.id, guildId: interaction.guild.id });
            userXpData.cartelEquipado = cartelId;
            await userXpData.save();
            return await interaction.editReply({ content: `🖼️ ¡Te equipaste el fondo **"${cartelId}"** con éxito!` });
        }

        if (customId === 'equipar_fuente_menu') {
            await interaction.deferReply({ ephemeral: true });
            const fuenteId = values[0].replace('equipar_fuente_', '');
            let userXpData = await UserXP.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });
            if (!userXpData) userXpData = new UserXP({ userId: interaction.user.id, guildId: interaction.guild.id });
            userXpData.fuenteEquipada = fuenteId;
            await userXpData.save();
            return await interaction.editReply({ content: `🔤 ¡Te equipaste la fuente **"${fuenteId}"** con éxito!` });
        }

        if (customId === 'equipar_pack_menu') {
            await interaction.deferReply({ ephemeral: true });
            const packId = values[0].replace('equipar_pack_', '');
            const packObj = await Pack.findOne({ guildId: interaction.guild.id, nombreId: packId });
            if (!packObj) return await interaction.editReply('❌ El pack ya no existe.');
            let userXpData = await UserXP.findOne({ userId: interaction.user.id, guildId: interaction.guild.id });
            if (!userXpData) userXpData = new UserXP({ userId: interaction.user.id, guildId: interaction.guild.id });
            userXpData.cartelEquipado = packObj.fondoNombreId;
            userXpData.fuenteEquipada = packObj.fuenteNombreId;
            await userXpData.save();
            return await interaction.editReply({ content: `📦 ¡Te equipaste el pack combo **"${packId}"** con éxito!` });
        }
    } catch (err) {
        console.error("Error en interacciones del bot Plutus:", err);
    }
});

console.log('🔄 Conectando bot de Plutus a Discord...');
client.login(process.env.DISCORD_TOKEN)
    .then(() => console.log('✅ ¡Login exitoso en el bot de Plutus!'))
    .catch(err => console.error('❌ ERROR CRÍTICO EN LOGIN ALV:', err));
           
