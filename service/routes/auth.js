const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { poolPromise, sql } = require('../db');
const { requireAuth } = require('../middleware/authMiddleware');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper function to create JWT and insert into Sesiones
async function createSessionAndToken(user, pool) {
    const token = jwt.sign(
        { id: user.Id, dni: user.Dni, rol: user.Rol },
        process.env.JWT_SECRET,
        { expiresIn: '24h' } // Duración del token
    );

    // Calcular fecha fin (24 horas después)
    const fechaFin = new Date();
    fechaFin.setHours(fechaFin.getHours() + 24);

    // Guardar en la tabla Sesiones
    await pool.request()
        .input('usuarioId', sql.Int, user.Id)
        .input('jwtKey', sql.VarChar, token)
        .input('fechaFin', sql.DateTime, fechaFin)
        .query(`
            INSERT INTO Sesiones (UsuarioId, JwtKey, FechaFin, Estado)
            VALUES (@usuarioId, @jwtKey, @fechaFin, 'activo')
        `);

    return token;
}

// ============================================
// LOGIN CON GOOGLE
// ============================================
router.post('/google-login', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Falta el token de Google' });

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const googleId = payload['sub'];
        const name = payload['name'];
        // const email = payload['email']; // Podríamos guardarlo si agregamos campo en BD

        const pool = await poolPromise;

        // Verificar si existe el usuario por su GoogleId
        let userResult = await pool.request()
            .input('googleId', sql.VarChar, googleId)
            .query('SELECT * FROM Usuarios WHERE GoogleId = @googleId');

        let user = userResult.recordset[0];

        // Si no existe, lo creamos como 'cliente'
        if (!user) {
            const insertResult = await pool.request()
                .input('nombre', sql.VarChar, name)
                .input('googleId', sql.VarChar, googleId)
                .input('rol', sql.VarChar, 'cliente')
                .query(`
                    INSERT INTO Usuarios (Nombre, GoogleId, Rol) 
                    OUTPUT INSERTED.* 
                    VALUES (@nombre, @googleId, @rol)
                `);
            user = insertResult.recordset[0];
        }

        // Crear sesión y token
        const appToken = await createSessionAndToken(user, pool);

        res.json({
            message: 'Inicio de sesión exitoso',
            token: appToken,
            user: {
                id: user.Id,
                nombre: user.Nombre,
                rol: user.Rol,
                dni: user.Dni
            }
        });

    } catch (err) {
        console.error('Error en google-login:', err);
        res.status(401).json({ error: 'Token de Google inválido' });
    }
});

// ============================================
// LOGIN TRADICIONAL
// ============================================
router.post('/login', async (req, res) => {
    const { dni, password } = req.body;

    if (!dni || !password) return res.status(400).json({ error: 'DNI y contraseña requeridos' });

    try {
        const pool = await poolPromise;
        // NOTA: Para producción, se debe usar bcrypt para verificar PasswordHash
        const userResult = await pool.request()
            .input('dni', sql.VarChar, dni)
            .input('password', sql.VarChar, password)
            .query('SELECT * FROM Usuarios WHERE Dni = @dni AND PasswordHash = @password');
            
        const user = userResult.recordset[0];

        if (!user) {
            return res.status(401).json({ error: 'DNI o contraseña incorrectos' });
        }

        const appToken = await createSessionAndToken(user, pool);

        res.json({
            message: 'Inicio de sesión exitoso',
            token: appToken,
            user: {
                id: user.Id,
                nombre: user.Nombre,
                rol: user.Rol,
                dni: user.Dni
            }
        });
    } catch (err) {
        console.error('Error en login:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ============================================
// REGISTRO (REGISTER)
// ============================================
router.post('/register', async (req, res) => {
    const { dni, password, nombre, telefono, rol } = req.body;

    if (!dni || !password || !nombre) {
        return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    // Validar el rol
    const userRole = (rol === 'emprendedor') ? 'emprendedor' : 'cliente';

    try {
        const pool = await poolPromise;
        // Check si el usuario ya existe
        const existingResult = await pool.request()
            .input('dni', sql.VarChar, dni)
            .query('SELECT Id FROM Usuarios WHERE Dni = @dni');

        if (existingResult.recordset.length > 0) {
            return res.status(400).json({ error: 'El DNI ya está registrado' });
        }

        const insertResult = await pool.request()
            .input('dni', sql.VarChar, dni)
            .input('nombre', sql.VarChar, nombre)
            .input('password', sql.VarChar, password) // Omitiendo bcrypt por ahora
            .input('telefono', sql.VarChar, telefono || null)
            .input('rol', sql.VarChar, userRole)
            .query(`
                INSERT INTO Usuarios (Dni, Nombre, PasswordHash, Telefono, Rol)
                OUTPUT INSERTED.*
                VALUES (@dni, @nombre, @password, @telefono, @rol)
            `);

        const user = insertResult.recordset[0];
        const appToken = await createSessionAndToken(user, pool);

        res.json({
            message: 'Registro exitoso',
            token: appToken,
            user: {
                id: user.Id,
                nombre: user.Nombre,
                rol: user.Rol,
                dni: user.Dni
            }
        });
    } catch (err) {
        console.error('Error en register:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ============================================
// CERRAR SESIÓN (LOGOUT)
// ============================================
router.post('/logout', requireAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        // req.sessionId lo obtuvimos gracias al middleware 'requireAuth'
        await pool.request()
            .input('id', sql.Int, req.sessionId)
            .query(`UPDATE Sesiones SET Estado = 'inactivo' WHERE Id = @id`);
            
        res.json({ message: 'Sesión cerrada exitosamente' });
    } catch (err) {
        console.error('Error en logout:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ============================================
// CONSULTA RENIEC
// ============================================
router.get('/reniec/:dni', async (req, res) => {
    const { dni } = req.params;
    try {
        // Usamos fetch nativo de Node.js (disponible en Node 18+)
        const reniecRes = await fetch(`https://api.apis.net.pe/v1/dni?numero=${dni}`);
        if (!reniecRes.ok) {
            return res.status(404).json({ error: 'DNI no encontrado' });
        }
        const data = await reniecRes.json();
        res.json(data);
    } catch (err) {
        console.error('Error consultando RENIEC:', err);
        res.status(500).json({ error: 'Error al consultar RENIEC' });
    }
});

module.exports = router;
