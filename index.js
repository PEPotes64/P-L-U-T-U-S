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
    AttachmentBuilder,
    ButtonBuilder,
    ButtonStyle
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
        try {
            await mongoose.connection.collection('backgrounds').dropIndex('guildId_1');
            console.log('🗑️ Índice duplicado guildId_1 eliminado con éxito de MongoDB');
        } catch (e) {
            console.log('ℹ️ El índice guildId_1 ya no existe o ya fue limpiado.');
        }
    })
    .catch(err => console.error('❌ Error al conectar a MongoDB:', err));

// --- COMANDOS SLASH DE PLUTUS ---
const dataComprar = { name: 'comprar', description: 'Abre la tienda de cosméticos de Plutus gastando tu XP' };
const dataPerfil = { name: 'perfil', description: 'Abre tu armario de fondos, fuentes y tablas' };

const dataCritica = {
    name: 'critica',
    description: 'Genera la tarjeta gráfica de evaluación por disciplina (Exclusivo Pepo)',
    options: [
        {
            name: 'arte',
            description: 'Evaluar una obra de Arte / Dibujo',
            type: ApplicationCommandOptionType.Subcommand,
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
        },
        {
            name: 'modelado',
            description: 'Evaluar un Modelado 3D',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                { name: 'artista', type: ApplicationCommandOptionType.User, description: 'Creador 3D', required: true },
                { name: 'foto', type: ApplicationCommandOptionType.Attachment, description: 'Render / Imagen', required: true },
                { name: 'lo_bueno', type: ApplicationCommandOptionType.String, description: 'Lo bueno', required: true },
                { name: 'lo_malo', type: ApplicationCommandOptionType.String, description: 'Lo malo', required: true },
                { name: 'resumen', type: ApplicationCommandOptionType.String, description: 'Resumen', required: true },
                { name: 'positivo', type: ApplicationCommandOptionType.Integer, description: 'Positivo %', required: false },
                { name: 'topologia', type: ApplicationCommandOptionType.Integer, description: 'Topología %', required: false },
                { name: 'escultura', type: ApplicationCommandOptionType.Integer, description: 'Escultura/Forma %', required: false },
                { name: 'texturizado', type: ApplicationCommandOptionType.Integer, description: 'Texturizado %', required: false },
                { name: 'iluminacion', type: ApplicationCommandOptionType.Integer, description: 'Iluminación %', required: false },
                { name: 'presentacion', type: ApplicationCommandOptionType.Integer, description: 'Presentación %', required: false }
            ]
        },
        {
            name: 'literatura',
            description: 'Evaluar Historia o Literatura',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                { name: 'artista', type: ApplicationCommandOptionType.User, description: 'Escritor', required: true },
                { name: 'foto', type: ApplicationCommandOptionType.Attachment, description: 'Captura del texto / Portada', required: true },
                { name: 'lo_bueno', type: ApplicationCommandOptionType.String, description: 'Lo bueno', required: true },
                { name: 'lo_malo', type: ApplicationCommandOptionType.String, description: 'Lo malo', required: true },
                { name: 'resumen', type: ApplicationCommandOptionType.String, description: 'Resumen', required: true },
                { name: 'positivo', type: ApplicationCommandOptionType.Integer, description: 'Positivo %', required: false },
                { name: 'estructura', type: ApplicationCommandOptionType.Integer, description: 'Estructura/Ritmo %', required: false },
                { name: 'personajes', type: ApplicationCommandOptionType.Integer, description: 'Personajes %', required: false },
                { name: 'atmosfera', type: ApplicationCommandOptionType.Integer, description: 'Atmósfera %', required: false },
                { name: 'prosa', type: ApplicationCommandOptionType.Integer, description: 'Prosa/Estilo %', required: false },
                { name: 'desenlace', type: ApplicationCommandOptionType.Integer, description: 'Desenlace %', required: false }
            ]
        },
        {
            name: 'fotografia',
            description: 'Evaluar una Fotografía',
            type: ApplicationCommandOptionType.Subcommand,
            options: [
                { name: 'artista', type: ApplicationCommandOptionType.User, description: 'Fotógrafo', required: true },
                { name: 'foto', type: ApplicationCommandOptionType.Attachment, description: 'Fotografía', required: true },
                { name: 'lo_bueno', type: ApplicationCommandOptionType.String, description: 'Lo bueno', required: true },
                { name: 'lo_malo', type: ApplicationCommandOptionType.String, description: 'Lo malo', required: true },
                { name: 'resumen', type: ApplicationCommandOptionType.String, description: 'Resumen', required: true },
                { name: 'positivo', type: ApplicationCommandOptionType.Integer, description: 'Positivo %', required: false },
                { name: 'composicion', type: ApplicationCommandOptionType.Integer, description: 'Composición %', required: false },
                { name: 'iluminacion', type: ApplicationCommandOptionType.Integer, description: 'Iluminación %', required: false },
                { name: 'enfoque', type: ApplicationCommandOptionType.Integer, description: 'Enfoque/Nitidez %', required: false },
                { name: 'color', type: ApplicationCommandOptionType.Integer, description: 'Color/Edición %', required: false },
                { name: 'narrativa', type: ApplicationCommandOptionType.Integer, description: 'Narrativa %', required: false }
            ]
        }
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

const dataSetAuto = {
    name: 'setauto',
    description: 'Crea un menú de autoroles de hasta 10 roles (Exclusivo Pepo)',
    options: [
        { name: 'nombre', type: ApplicationCommandOptionType.String, description: 'Nombre identificador único del menú', required: true },
        { name: 'rol1', type: ApplicationCommandOptionType.Role, description: 'Primer rol obligatorio del menú', required: true },
        { name: 'precio', type: ApplicationCommandOptionType.Integer, description: 'Costo en XP para obtenerlos', required: false },
        { name: 'nivel', type: ApplicationCommandOptionType.Integer, description: 'Nivel mínimo requerido', required: false },
        { name: 'pana', type: ApplicationCommandOptionType.User, description: 'Usuario exclusivo que puede usar este menú', required: false },
        { name: 'rol2', type: ApplicationCommandOptionType.Role, description: 'Rol 2', required: false },
        { name: 'rol3', type: ApplicationCommandOptionType.Role, description: 'Rol 3', required: false },
        { name: 'rol4', type: ApplicationCommandOptionType.Role, description: 'Rol 4', required: false },
        { name: 'rol5', type: ApplicationCommandOptionType.Role, description: 'Rol 5', required: false },
        { name: 'rol6', type: ApplicationCommandOptionType.Role, description: 'Rol 6', required: false },
        { name: 'rol7', type: ApplicationCommandOptionType.Role, description: 'Rol 7', required: false },
        { name: 'rol8', type: ApplicationCommandOptionType.Role, description: 'Rol 8', required: false },
        { name: 'rol9', type: ApplicationCommandOptionType.Role, description: 'Rol 9', required: false },
        { name: 'rol10', type: ApplicationCommandOptionType.Role, description: 'Rol 10', required: false }
    ]
};

const dataAutorol = {
    name: 'autorol',
    description: 'Despliega un menú de autoroles en tu posesión',
    options: [
        { name: 'nombre', type: ApplicationCommandOptionType.String, description: 'Nombre del menú de autoroles a desplegar', required: true }
    ]
};

const dataLimpiar = {
    name: 'limpiar',
    description: 'Borra todas las fuentes y tablas de Mongo (Exclusivo Pepo)'
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
            dataDelBg, dataSetFont, dataSetPack, dataTabla, dataSetAuto, dataAutorol, dataLimpiar
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

    let tablaRenderizada = false;
    if (tablaUrl) {
        try {
            const resTabla = await fetch(tablaUrl);
            if (resTabla.ok) {
                const bufTabla = Buffer.from(await resTabla.arrayBuffer());
                const imgTabla = await loadImage(bufTabla);

                ctx.save();
                ctx.beginPath();
                ctx.roundRect(20, 20, width - 40, height - 40, 20);
                ctx.clip();
                
                ctx.globalAlpha = 0.4;
                ctx.drawImage(imgTabla, 20, 20, width - 40, height - 40);
                ctx.restore();
                tablaRenderizada = true;
            }
        } catch (e) {
            console.error("⚠️ [CANVAS] Error cargando tabla:", e.message);
        }
    }

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
            const packsPredeterminadas = await Pack.find({ guildId, precio: null, nivelMinimo: null });
            const nombresPacksGratis = [...packsGratisLvl, ...packsPredeterminadas].map(p => p.nombreId);
            const todosMisPacks = [...new Set([...nombresPacksGratis, ...packsComprados])];

            const tablasCompradas = userXpData?.tablasCompradas || [];
            const tablasGratisLvl = await Tabla.find({ guildId, precio: null, nivelMinimo: { $ne: null, $lte: nivelUsuario } });
            const tablasPredeterminadas = await Tabla.find({ guildId, precio: null, nivelMinimo: null });
            const nombresTablasGratis = [...tablasGratisLvl, ...tablasPredeterminadas].map(t => t.nombreId);
            const todasMisTablas = [...new Set([...nombresTablasGratis, ...tablasCompradas])];

            const nombreCartel = userXpData?.cartelEquipado;
            const fuenteNombre = userXpData?.fuenteEquipada;
            const nombreTabla = userXpData?.tablaEquipada;

            let urlFondoUsar = null;
            if (nombreCartel && nombreCartel !== 'Ninguno') {
                const regexBg = new RegExp(`^${nombreCartel.trim()}$`, 'i');
                const bgObj = await Background.findOne({ guildId, nombreId: regexBg });
                if (bgObj) {
                    urlFondoUsar = bgObj.fondoUrl || bgObj.urlImagen;
                }
            }

            let urlTablaUsar = null;
            if (nombreTabla && nombreTabla !== 'Predeterminada') {
                const regexTabla = new RegExp(`^${nombreTabla.trim()}$`, 'i');
                const tablaObj = await Tabla.findOne({ guildId, nombreId: regexTabla });
                if (tablaObj) {
                    urlTablaUsar = tablaObj.urlImagen || tablaObj.url;
                }
            }

            const bufferArmario = await generarTarjetaCritica({
                dibujoUrl: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
                artistaNombre: interaction.user.username,
                artistaAvatarUrl: interaction.user.displayAvatarURL({ extension: 'png', size: 256 }),
                loBueno: "¡Tus cosméticos actuales combinan de pelos!",
                loMalo: "Ninguno, estás listo para triunfar alv.",
                resumen: "Vista previa de tu armario activo en Plutus.",
                fondoUrl: urlFondoUsar,
                tablaUrl: urlTablaUsar,
                positivoPct: 100,
                stats: [
                    { nombre: 'Nivel', val: userXpData?.level || 1 },
                    { nombre: 'XP', val: Math.min(100, userXpData?.xp || 10) },
                    { nombre: 'Arte', val: 95 },
                    { nombre: 'Estilo', val: 90 },
                    { nombre: 'Facha', val: 100 }
                ],
                fuenteNombre
            });

            const attachment = new AttachmentBuilder(bufferArmario, { name: `perfil_${interaction.user.username}.png` });

            const perfilEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle(`🎨 Armario y Tarjeta Activa de ${interaction.user.username}`)
                .setDescription('Así es como se ve tu tarjeta actualmente con tus cosméticos equipados. Elegí abajo qué cambiar o equipar.')
                .addFields(
                    { name: '🌅 Fondo Equipado:', value: `\`${nombreCartel || 'Ninguno'}\``, inline: true },
                    { name: '🪞 Tabla Equipada:', value: `\`${nombreTabla || 'Predeterminada'}\``, inline: true },
                    { name: '🔤 Fuente Equipada:', value: `\`${fuenteNombre || 'Predeterminada'}\``, inline: true }
                )
                .setImage(`attachment://perfil_${interaction.user.username}.png`)
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
            
            return await interaction.editReply({ embeds: [perfilEmbed], files: [attachment], components: componentes });
        } catch (err) {
            console.error("Error en /perfil:", err);
            if (interaction.deferred) await interaction.editReply(`❌ Error al abrir perfil: \`${err.message}\``);
        }
        }

        if (commandName === 'critica') {
        try {
            await interaction.deferReply();

            const sub = interaction.options.getSubcommand();
            const artistaUser = interaction.options.getUser('artista');
            const fotoAttachment = interaction.options.getAttachment('foto');
            const loBueno = interaction.options.getString('lo_bueno');
            const loMalo = interaction.options.getString('lo_malo');
            const resumen = interaction.options.getString('resumen');
            const positivoPct = interaction.options.getInteger('positivo') ?? 80;

            let stats = [];

            if (sub === 'arte') {
                stats = [
                    { nombre: 'Lineart', val: interaction.options.getInteger('lineart') ?? 80 },
                    { nombre: 'Creatividad', val: interaction.options.getInteger('creatividad') ?? 85 },
                    { nombre: 'Detalles', val: interaction.options.getInteger('detalles') ?? 75 },
                    { nombre: 'Paleta', val: interaction.options.getInteger('paleta') ?? 90 },
                    { nombre: 'Pinceles', val: interaction.options.getInteger('pinceles') ?? 70 }
                ];
            } else if (sub === 'modelado') {
                stats = [
                    { nombre: 'Topología', val: interaction.options.getInteger('topologia') ?? 80 },
                    { nombre: 'Escultura', val: interaction.options.getInteger('escultura') ?? 85 },
                    { nombre: 'Texturizado', val: interaction.options.getInteger('texturizado') ?? 75 },
                    { nombre: 'Iluminación', val: interaction.options.getInteger('iluminacion') ?? 90 },
                    { nombre: 'Presentación', val: interaction.options.getInteger('presentacion') ?? 70 }
                ];
            } else if (sub === 'literatura') {
                stats = [
                    { nombre: 'Estructura', val: interaction.options.getInteger('estructura') ?? 80 },
                    { nombre: 'Personajes', val: interaction.options.getInteger('personajes') ?? 85 },
                    { nombre: 'Atmósfera', val: interaction.options.getInteger('atmosfera') ?? 75 },
                    { nombre: 'Prosa/Estilo', val: interaction.options.getInteger('prosa') ?? 90 },
                    { nombre: 'Desenlace', val: interaction.options.getInteger('desenlace') ?? 70 }
                ];
            } else if (sub === 'fotografia') {
                stats = [
                    { nombre: 'Composición', val: interaction.options.getInteger('composicion') ?? 80 },
                    { nombre: 'Iluminación', val: interaction.options.getInteger('iluminacion') ?? 85 },
                    { nombre: 'Enfoque', val: interaction.options.getInteger('enfoque') ?? 75 },
                    { nombre: 'Color/Edición', val: interaction.options.getInteger('color') ?? 90 },
                    { nombre: 'Narrativa', val: interaction.options.getInteger('narrativa') ?? 70 }
                ];
            }

            const guildId = interaction.guild.id;
            let userXpData = await UserXP.findOne({ userId: artistaUser.id, guildId });
            const nombreCartel = userXpData?.cartelEquipado;
            const fuenteNombre = userXpData?.fuenteEquipada;
            const nombreTabla = userXpData?.tablaEquipada;

            let urlFondoUsar = null;
            if (nombreCartel && nombreCartel !== 'Ninguno') {
                const bgObj = await Background.findOne({ guildId, nombreId: new RegExp(`^${nombreCartel.trim()}$`, 'i') });
                if (bgObj) urlFondoUsar = bgObj.fondoUrl || bgObj.urlImagen;
            }

            let urlTablaUsar = null;
            if (nombreTabla && nombreTabla !== 'Predeterminada') {
                const tablaObj = await Tabla.findOne({ guildId, nombreId: new RegExp(`^${nombreTabla.trim()}$`, 'i') });
                if (tablaObj) urlTablaUsar = tablaObj.urlImagen || tablaObj.url;
            }

            const bufferTarjeta = await generarTarjetaCritica({
                dibujoUrl: fotoAttachment.url,
                artistaNombre: artistaUser.username,
                artistaAvatarUrl: artistaUser.displayAvatarURL({ extension: 'png', size: 256 }),
                loBueno,
                loMalo,
                resumen,
                fondoUrl: urlFondoUsar,
                tablaUrl: urlTablaUsar,
                positivoPct,
                stats,
                fuenteNombre
            });

            const attachment = new AttachmentBuilder(bufferTarjeta, { name: `evaluacion_${artistaUser.username}.png` });
            return await interaction.editReply({ files: [attachment] });

        } catch (err) {
            console.error("Error en /critica:", err);
            if (interaction.deferred) await interaction.editReply(`❌ Error al generar la crítica: \`${err.message}\``);
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

    if (commandName === 'limpiar') {
        if (interaction.user.id !== PEPO_ID) return await interaction.reply({ content: '❌ Solo Pepo.', ephemeral: true });
        await interaction.deferReply({ ephemeral: true });

        try {
            await Font.deleteMany({});
            await Tabla.deleteMany({});
            return await interaction.editReply('🧹 ¡Listo Pepo! Se borraron todas las fuentes y las tablas de MongoDB. Quedaron en ceros alv Bv :v');
        } catch (err) {
            console.error("Error al limpiar mongo:", err);
            return await interaction.editReply('❌ Fallo la limpieza alv.');
        }

            if (commandName === 'setauto') {
        if (interaction.user.id !== PEPO_ID) {
            return await interaction.reply({ content: '❌ Este comando es exclusivo de mi creador Pepo alv.', ephemeral: true });
        }
        await interaction.deferReply({ ephemeral: true });

        const nombreId = interaction.options.getString('nombre').toLowerCase().trim();
        const precio = interaction.options.getInteger('precio') || 0;
        const nivelMinimo = interaction.options.getInteger('nivel') || 1;
        const panaUser = interaction.options.getUser('pana');
        const propietarioId = panaUser ? panaUser.id : null;

        const rolesArray = [];
        for (let i = 1; i <= 10; i++) {
            const rol = interaction.options.getRole(`rol${i}`);
            if (rol) {
                rolesArray.push({
                    roleId: rol.id,
                    label: rol.name,
                    description: `Obtener el rol ${rol.name}`
                });
            }
        }

        if (rolesArray.length === 0) {
            return await interaction.editReply({ content: '❌ Debes agregar al menos un rol al menú.' });
        }

        try {
            await AutoRoleMenu.findOneAndUpdate(
                { guildId: interaction.guild.id, nombreId },
                { guildId: interaction.guild.id, nombreId, roles: rolesArray, precio, nivelMinimo, propietarioId },
                { upsert: true, new: true }
            );

            const tipoTexto = propietarioId ? `🔒 Exclusivo para <@${propietarioId}>` : `🌐 Público (Para todos)`;
            return await interaction.editReply(`✅ ¡Menú de autorol \`${nombreId}\` creado con éxito con ${rolesArray.length} roles!\nTipo: ${tipoTexto}\nRoles: ${rolesArray.map(r => `<@&${r.roleId}>`).join(', ')}`);
        } catch (err) {
            console.error("Error en /setauto:", err);
            return await interaction.editReply(`❌ Error al guardar el menú: \`${err.message}\``);
        }
    }

    if (commandName === 'autorol') {
        try {
            const nombreId = interaction.options.getString('nombre').toLowerCase().trim();
            const guildId = interaction.guild.id;
            const userId = interaction.user.id;

            const menuData = await AutoRoleMenu.findOne({ guildId, nombreId });
            if (!menuData) {
                return await interaction.reply({ content: `❌ No existe ningún menú de autorol con el nombre \`${nombreId}\` alv.`, ephemeral: true });
            }

            if (menuData.propietarioId && menuData.propietarioId !== userId) {
                return await interaction.reply({ content: `❌ Este menú de autoroles es **exclusivo** y pertenece a otro usuario alv. No puedes desplegarlo.`, ephemeral: true });
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`autorol_select_${nombreId}`)
                .setPlaceholder(`📂 Selecciona un rol del menú: ${nombreId}`)
                .addOptions(
                    menuData.roles.map(r => ({
                        label: r.label,
                        value: r.roleId,
                        description: `Reclamar rol ${r.label}`,
                        emoji: '✨'
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle(`✨ Menú de Autoroles: ${nombreId.toUpperCase()}`)
                .setDescription(`Usa el menú desplegable de abajo para equiparte/obtener el rol.\n\n• **Precio:** ${menuData.precio > 0 ? `${menuData.precio} XP` : 'Gratis'}\n• **Nivel Mínimo:** ${menuData.nivelMinimo}`)
                .setFooter({ text: 'Plutus • Sistema de Autoroles', iconURL: client.user.displayAvatarURL() });

            return await interaction.reply({ embeds: [embed], components: [row] });
        } catch (err) {
            console.error("Error en /autorol:", err);
            if (!interaction.replied) await interaction.reply({ content: `❌ Error al desplegar el autorol: \`${err.message}\``, ephemeral: true });
        }
    }
        
    } 
});
         // --- MANEJADOR DE SELECCIONES DE LA TIENDA Y MENÚS ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isStringSelectMenu()) return;

    const { customId, values } = interaction;
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    try {
        // --- MANEJADOR DE AUTOROLES ---
        if (customId.startsWith('autorol_select_')) {
            const nombreId = customId.replace('autorol_select_', '');
            const roleIdSeleccionado = values[0];

            const menuData = await AutoRoleMenu.findOne({ guildId, nombreId });
            if (!menuData) return await interaction.reply({ content: '❌ Este menú ya no existe alv.', ephemeral: true });

            let userXpData = await UserXP.findOne({ userId, guildId });
            const nivelUsuario = userXpData ? userXpData.level : 1;
            const xpUsuario = userXpData ? userXpData.xp : 0;

            if (nivelUsuario < menuData.nivelMinimo) {
                return await interaction.reply({ content: `❌ Necesitas ser **Nivel ${menuData.nivelMinimo}** para reclamar este rol (Tu nivel actual: ${nivelUsuario}).`, ephemeral: true });
            }

            if (menuData.precio > 0 && xpUsuario < menuData.precio) {
                return await interaction.reply({ content: `❌ No tienes suficiente XP. Necesitas **${menuData.precio} XP** (Tienes: ${xpUsuario} XP).`, ephemeral: true });
            }

            const member = interaction.member;
            const role = interaction.guild.roles.cache.get(roleIdSeleccionado);
            if (!role) return await interaction.reply({ content: '❌ El rol seleccionado ya no existe en el servidor.', ephemeral: true });

            if (member.roles.cache.has(roleIdSeleccionado)) {
                await member.roles.remove(roleIdSeleccionado);
                return await interaction.reply({ content: `❌ Te has **quitado** el rol <@&${roleIdSeleccionado}>.`, ephemeral: true });
            } else {
                if (menuData.precio > 0) {
                    userXpData.xp -= menuData.precio;
                    await userXpData.save();
                }
                await member.roles.add(roleIdSeleccionado);
                return await interaction.reply({ content: `✅ ¡Te has equipado con éxito el rol <@&${roleIdSeleccionado}>! ${menuData.precio > 0 ? `(Se te descontaron ${menuData.precio} XP)` : ''}`, ephemeral: true });
            }
        }

        // --- TIENDA (PREVISUALIZACIONES) ---
        if (customId === 'tienda_menu') {
            await interaction.deferReply({ ephemeral: true });
            const opcion = values[0];

            let userXpData = await UserXP.findOne({ userId, guildId });
            if (!userXpData) userXpData = new UserXP({ userId, guildId, xp: 0, level: 1 });

            const xpTotalActual = obtenerXpTotal(userXpData);

            if (opcion.startsWith('comprar_bg_')) {
                const bgId = opcion.replace('comprar_bg_', '');
                const bgObj = await Background.findOne({ guildId, nombreId: bgId });
                if (!bgObj) return await interaction.editReply({ content: '❌ El fondo ya no existe alv.' });

                const canvas = createCanvas(1000, 600);
                const ctx = canvas.getContext('2d');
                
                try {
                    const resBg = await fetch(bgObj.fondoUrl || bgObj.urlImagen);
                    if (resBg.ok) {
                        const img = await loadImage(Buffer.from(await resBg.arrayBuffer()));
                        ctx.drawImage(img, 0, 0, 1000, 600);
                    } else {
                        ctx.fillStyle = '#1a1035';
                        ctx.fillRect(0, 0, 1000, 600);
                    }
                } catch (e) {
                    ctx.fillStyle = '#1a1035';
                    ctx.fillRect(0, 0, 1000, 600);
                }

                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.beginPath();
                ctx.roundRect(150, 220, 700, 160, 20);
                ctx.fill();

                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 36px sans-serif';
                ctx.fillText(`🖼️ FONDO: ${bgId.toUpperCase()}`, 190, 290);

                ctx.fillStyle = '#E2E2E8';
                ctx.font = '22px sans-serif';
                ctx.fillText(`Precio: ${bgObj.precio} XP | Req. Nivel: ${bgObj.nivelMinimo ?? 1}`, 190, 335);

                const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: `preview_bg_${bgId}.png` });
                
                const embedPreview = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle(`🖼️ Previsualización de Fondo: ${bgId}`)
                    .setDescription(`Precio: **${bgObj.precio} XP**\nNivel Mínimo: **${bgObj.nivelMinimo ?? 1}**\nTu XP Actual: **${xpTotalActual} XP**`)
                    .setImage(`attachment://preview_bg_${bgId}.png`);

                const botones = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`exec_comprar_bg_${bgId}`)
                        .setLabel('🛒 Confirmar Compra')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('cancelar_compra')
                        .setLabel('❌ Cancelar')
                        .setStyle(ButtonStyle.Danger)
                );

                return await interaction.editReply({ embeds: [embedPreview], files: [attachment], components: [botones] });
            }

            if (opcion.startsWith('comprar_font_')) {
                const fontId = opcion.replace('comprar_font_', '');
                const fontObj = await Font.findOne({ guildId, nombreId: fontId });
                if (!fontObj) return await interaction.editReply({ content: '❌ La fuente ya no existe alv.' });

                let fuenteRegistrada = 'sans-serif';
                try {
                    const resFont = await fetch(fontObj.fontUrl);
                    if (resFont.ok) {
                        const fontBuffer = Buffer.from(await resFont.arrayBuffer());
                        GlobalFonts.register(fontBuffer, fontId);
                        fuenteRegistrada = fontId;
                    }
                } catch (e) {
                    console.error("Error cargando fuente en preview:", e);
                }

                const canvas = createCanvas(1000, 600);
                const ctx = canvas.getContext('2d');
                
                ctx.fillStyle = '#1a1035';
                ctx.fillRect(0, 0, 1000, 600);

                ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
                ctx.beginPath();
                ctx.roundRect(50, 40, 900, 520, 20);
                ctx.fill();

                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 28px sans-serif';
                ctx.fillText(`🔤 FUENTE: ${fontId.toUpperCase()}`, 90, 95);

                ctx.fillStyle = '#E2E2E8';
                ctx.font = '18px sans-serif';
                ctx.fillText(`Precio: ${fontObj.precio} XP | Req. Nivel: ${fontObj.nivelMinimo ?? 1}`, 90, 130);

                ctx.fillStyle = '#FFFFFF';
                ctx.font = `32px "${fuenteRegistrada}", sans-serif`;
                ctx.fillText("A B C D E F G H I J K L M N O P Q R S T U V W X Y Z", 90, 210);
                ctx.fillText("a b c d e f g h i j k l m n o p q r s t u v w x y z", 90, 280);
                ctx.fillText("1 2 3 4 5 6 7 8 9 0  ! ? # $ @ & + - * /", 90, 350);

                ctx.fillStyle = '#00E5FF';
                ctx.font = `26px "${fuenteRegistrada}", sans-serif`;
                ctx.fillText("Plutus y Pepo armando el imperio del arte alv > :v", 90, 450);

                const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: `preview_font_${fontId}.png` });
                
                const embedPreview = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle(`🔤 Previsualización de Fuente: ${fontId}`)
                    .setDescription(`Precio: **${fontObj.precio} XP**\nNivel Mínimo: **${fontObj.nivelMinimo ?? 1}**\nTu XP Actual: **${xpTotalActual} XP**`)
                    .setImage(`attachment://preview_font_${fontId}.png`);

                const botones = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`exec_comprar_font_${fontId}`)
                        .setLabel('🛒 Confirmar Compra')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('cancelar_compra')
                        .setLabel('❌ Cancelar')
                        .setStyle(ButtonStyle.Danger)
                );

                return await interaction.editReply({ embeds: [embedPreview], files: [attachment], components: [botones] });
            }

            if (opcion.startsWith('comprar_pack_')) {
                const packId = opcion.replace('comprar_pack_', '');
                const packObj = await Pack.findOne({ guildId, nombreId: packId });
                if (!packObj) return await interaction.editReply({ content: '❌ El pack ya no existe alv.' });

                const bgObj = await Background.findOne({ guildId, nombreId: packObj.fondoNombreId });
                const canvas = createCanvas(1000, 600);
                const ctx = canvas.getContext('2d');
                
                try {
                    if (bgObj && (bgObj.fondoUrl || bgObj.urlImagen)) {
                        const resBg = await fetch(bgObj.fondoUrl || bgObj.urlImagen);
                        if (resBg.ok) {
                            const img = await loadImage(Buffer.from(await resBg.arrayBuffer()));
                            ctx.drawImage(img, 0, 0, 1000, 600);
                        } else {
                            ctx.fillStyle = '#1a1035';
                            ctx.fillRect(0, 0, 1000, 600);
                        }
                    } else {
                        ctx.fillStyle = '#1a1035';
                        ctx.fillRect(0, 0, 1000, 600);
                    }
                } catch (e) {
                    ctx.fillStyle = '#1a1035';
                    ctx.fillRect(0, 0, 1000, 600);
                }

                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.beginPath();
                ctx.roundRect(150, 200, 700, 180, 20);
                ctx.fill();

                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 36px sans-serif';
                ctx.fillText(`📦 PACK: ${packId.toUpperCase()}`, 190, 270);

                ctx.fillStyle = '#E2E2E8';
                ctx.font = '20px sans-serif';
                ctx.fillText(`Fondo: ${packObj.fondoNombreId} | Fuente: ${packObj.fuenteNombreId}`, 190, 315);
                ctx.fillText(`Precio: ${packObj.precio} XP | Req. Nivel: ${packObj.nivelMinimo ?? 1}`, 190, 350);

                const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: `preview_pack_${packId}.png` });
                
                const embedPreview = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle(`📦 Previsualización de Pack: ${packId}`)
                    .setDescription(`Incluye Fondo y Fuente.\nPrecio: **${packObj.precio} XP**\nNivel Mínimo: **${packObj.nivelMinimo ?? 1}**\nTu XP Actual: **${xpTotalActual} XP**`)
                    .setImage(`attachment://preview_pack_${packId}.png`);

                const botones = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`exec_comprar_pack_${packId}`)
                        .setLabel('🛒 Confirmar Compra')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('cancelar_compra')
                        .setLabel('❌ Cancelar')
                        .setStyle(ButtonStyle.Danger)
                );

                return await interaction.editReply({ embeds: [embedPreview], files: [attachment], components: [botones] });
            }

            if (opcion.startsWith('comprar_tabla_')) {
                const tablaId = opcion.replace('comprar_tabla_', '');
                const tablaObj = await Tabla.findOne({ guildId, nombreId: tablaId });
                if (!tablaObj) return await interaction.editReply({ content: '❌ La tabla ya no existe alv.' });

                const canvas = createCanvas(1000, 600);
                const ctx = canvas.getContext('2d');
                
                try {
                    const resTabla = await fetch(tablaObj.urlImagen || tablaObj.url);
                    if (resTabla.ok) {
                        const img = await loadImage(Buffer.from(await resTabla.arrayBuffer()));
                        ctx.drawImage(img, 0, 0, 1000, 600);
                    } else {
                        ctx.fillStyle = '#1a1035';
                        ctx.fillRect(0, 0, 1000, 600);
                    }
                } catch (e) {
                    ctx.fillStyle = '#1a1035';
                    ctx.fillRect(0, 0, 1000, 600);
                }

                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.beginPath();
                ctx.roundRect(150, 220, 700, 160, 20);
                ctx.fill();

                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 36px sans-serif';
                ctx.fillText(`🪞 TABLA: ${tablaId.toUpperCase()}`, 190, 290);

                ctx.fillStyle = '#E2E2E8';
                ctx.font = '22px sans-serif';
                ctx.fillText(`Precio: ${tablaObj.precio} XP | Req. Nivel: ${tablaObj.nivelMinimo ?? 1}`, 190, 335);

                const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: `preview_tabla_${tablaId}.png` });
                
                const embedPreview = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle(`🪞 Previsualización de Tabla: ${tablaId}`)
                    .setDescription(`Precio: **${tablaObj.precio} XP**\nNivel Mínimo: **${tablaObj.nivelMinimo ?? 1}**\nTu XP Actual: **${xpTotalActual} XP**`)
                    .setImage(`attachment://preview_tabla_${tablaId}.png`);

                const botones = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`exec_comprar_tabla_${tablaId}`)
                        .setLabel('🛒 Confirmar Compra')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('cancelar_compra')
                        .setLabel('❌ Cancelar')
                        .setStyle(ButtonStyle.Danger)
                );

                return await interaction.editReply({ embeds: [embedPreview], files: [attachment], components: [botones] });
            }
        }

        // --- EQUIPAR COSMÉTICOS DESDE EL PERFIL ---
        if (customId === 'equipar_tabla_menu') {
            await interaction.deferReply({ ephemeral: true });
            const tablaId = values[0].replace('equipar_tabla_', '').trim();
            let userXpData = await UserXP.findOne({ userId, guildId });
            if (!userXpData) userXpData = new UserXP({ userId, guildId });
            userXpData.tablaEquipada = tablaId;
            await userXpData.save();
            return await interaction.editReply({ content: `✅ ¡Te equipaste la tabla **"${tablaId}"** con éxito!` });
        }

        if (customId === 'equipar_cartel_menu') {
            await interaction.deferReply({ ephemeral: true });
            const cartelId = values[0].replace('equipar_cartel_', '');
            let userXpData = await UserXP.findOne({ userId, guildId });
            if (!userXpData) userXpData = new UserXP({ userId, guildId });
            userXpData.cartelEquipado = cartelId;
            await userXpData.save();
            return await interaction.editReply({ content: `🖼️ ¡Te equipaste el fondo **"${cartelId}"** con éxito!` });
        }

        if (customId === 'equipar_fuente_menu') {
            await interaction.deferReply({ ephemeral: true });
            const fuenteId = values[0].replace('equipar_fuente_', '');
            let userXpData = await UserXP.findOne({ userId, guildId });
            if (!userXpData) userXpData = new UserXP({ userId, guildId });
            userXpData.fuenteEquipada = fuenteId;
            await userXpData.save();
            return await interaction.editReply({ content: `🔤 ¡Te equipaste la fuente **"${fuenteId}"** con éxito!` });
        }

        if (customId === 'equipar_pack_menu') {
            await interaction.deferReply({ ephemeral: true });
            const packId = values[0].replace('equipar_pack_', '');
            const packObj = await Pack.findOne({ guildId, nombreId: packId });
            if (!packObj) return await interaction.editReply('❌ El pack ya no existe.');
            let userXpData = await UserXP.findOne({ userId, guildId });
            if (!userXpData) userXpData = new UserXP({ userId, guildId });
            userXpData.cartelEquipado = packObj.fondoNombreId;
            userXpData.fuenteEquipada = packObj.fuenteNombreId;
            await userXpData.save();
            return await interaction.editReply({ content: `📦 ¡Te equipaste el pack combo **"${packId}"** con éxito!` });
        }

    } catch (err) {
        console.error("Error en select menus de Plutus:", err);
    }
});

// --- MANEJADOR DE BOTONES (COMPRAS Y CONFIRMACIONES) ---
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    const { customId } = interaction;

    try {
        if (customId === 'cancelar_compra') {
            return await interaction.update({ content: '❌ Compra cancelada alv.', embeds: [], files: [], components: [] });
        }

        if (customId.startsWith('exec_comprar_')) {
            await interaction.deferUpdate();
            const partes = customId.replace('exec_comprar_', '').split('_');
            const tipo = partes[0];
            const itemId = partes.slice(1).join('_');
            const userId = interaction.user.id;
            const guildId = interaction.guild.id;

            let userXpData = await UserXP.findOne({ userId, guildId });
            if (!userXpData) userXpData = new UserXP({ userId, guildId, xp: 0, level: 1 });
            const xpTotalActual = obtenerXpTotal(userXpData);

            if (tipo === 'bg') {
                const bgObj = await Background.findOne({ guildId, nombreId: itemId });
                if (!bgObj || xpTotalActual < bgObj.precio) return await interaction.followUp({ content: '❌ Error: No tenés suficiente XP o el fondo ya no existe.', ephemeral: true });

                recalcularProgreso(userXpData, xpTotalActual - bgObj.precio);
                if (!userXpData.cartelesComprados) userXpData.cartelesComprados = [];
                if (!userXpData.cartelesComprados.includes(itemId)) userXpData.cartelesComprados.push(itemId);
                userXpData.cartelEquipado = itemId;
                await userXpData.save();
                return await interaction.editReply({ content: `🖼️ ¡Compra exitosa! Te compraste y equipaste el fondo **${itemId}** alv Bv :v.`, embeds: [], files: [], components: [] });
            }

                        if (tipo === 'font') {
                const fontObj = await Font.findOne({ guildId, nombreId: itemId });
                if (!fontObj || xpTotalActual < fontObj.precio) return await interaction.followUp({ content: '❌ Error: No tenés suficiente XP o la fuente ya no existe.', ephemeral: true });

                recalcularProgreso(userXpData, xpTotalActual - fontObj.precio);
                if (!userXpData.fuentesCompradas) userXpData.fuentesCompradas = [];
                if (!userXpData.fuentesCompradas.includes(itemId)) userXpData.fuentesCompradas.push(itemId);
                userXpData.fuenteEquipada = itemId;
                await userXpData.save();
                return await interaction.editReply({ content: `🔤 ¡Compra exitosa! Te compraste y equipaste la fuente **${itemId}** alv Bv :v.`, embeds: [], files: [], components: [] });
            }

            if (tipo === 'pack') {
                const packObj = await Pack.findOne({ guildId, nombreId: itemId });
                if (!packObj || xpTotalActual < packObj.precio) return await interaction.followUp({ content: '❌ Error: No tenés suficiente XP o el pack ya no existe.', ephemeral: true });

                recalcularProgreso(userXpData, xpTotalActual - packObj.precio);
                if (!userXpData.cartelesComprados) userXpData.cartelesComprados = [];
                if (!userXpData.fuentesCompradas) userXpData.fuentesCompradas = [];
                if (!userXpData.packsComprados) userXpData.packsComprados = [];

                if (!userXpData.cartelesComprados.includes(packObj.fondoNombreId)) userXpData.cartelesComprados.push(packObj.fondoNombreId);
                if (!userXpData.fuentesCompradas.includes(packObj.fuenteNombreId)) userXpData.fuentesCompradas.push(packObj.fuenteNombreId);
                if (!userXpData.packsComprados.includes(itemId)) userXpData.packsComprados.push(itemId);

                userXpData.cartelEquipado = packObj.fondoNombreId;
                userXpData.fuenteEquipada = packObj.fuenteNombreId;
                await userXpData.save();
                return await interaction.editReply({ content: `📦 ¡Compra exitosa! Te compraste y equipaste el pack combo **${itemId}** alv Bv :v.`, embeds: [], files: [], components: [] });
            }

            if (tipo === 'tabla') {
                const tablaObj = await Tabla.findOne({ guildId, nombreId: itemId });
                if (!tablaObj || xpTotalActual < tablaObj.precio) return await interaction.followUp({ content: '❌ Error: No tenés suficiente XP o la tabla ya no existe.', ephemeral: true });

                recalcularProgreso(userXpData, xpTotalActual - tablaObj.precio);
                if (!userXpData.tablasCompradas) userXpData.tablasCompradas = [];
                if (!userXpData.tablasCompradas.includes(itemId)) userXpData.tablasCompradas.push(itemId);
                userXpData.tablaEquipada = itemId;
                await userXpData.save();
                return await interaction.editReply({ content: `🪞 ¡Compra exitosa! Te compraste y equipaste la tabla **${itemId}** alv Bv :v.`, embeds: [], files: [], components: [] });
            }
        }
    } catch (err) {
        console.error("Error en botones de compra de Plutus:", err);
    }
});

console.log('🔌 Conectando bot de Plutus...');
client.login(process.env.DISCORD_TOKEN)
    .then(() => console.log('✅ ¡Login exitoso en el bot de Plutus alv!'))
    .catch(err => console.error('❌ ERROR CRÍTICO EN LOGIN ALV:', err));
