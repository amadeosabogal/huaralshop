const jwt = require('jsonwebtoken');
const { poolPromise, sql } = require('../db');

const requireAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Falta el token de autenticación' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // 1. Validar la firma del token (si expiró por fecha de creación interna, saltará error)
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 2. Validar que la sesión exista y esté activa en la base de datos
        const pool = await poolPromise;
        const sessionResult = await pool.request()
            .input('jwtKey', sql.VarChar, token)
            .query(`
                SELECT Id, UsuarioId, Estado 
                FROM Sesiones 
                WHERE JwtKey = @jwtKey
            `);
            
        if (sessionResult.recordset.length === 0) {
            return res.status(401).json({ error: 'Sesión no encontrada' });
        }
        
        const session = sessionResult.recordset[0];
        if (session.Estado !== 'activo') {
            return res.status(401).json({ error: 'La sesión está inactiva o ha expirado. Por seguridad, debes iniciar sesión nuevamente.' });
        }

        // 3. Adjuntar información del usuario a la request para que la use el endpoint
        req.user = decoded; 
        req.sessionId = session.Id;
        
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            // Sería buena práctica aquí marcar la sesión como inactiva si no lo está
            return res.status(401).json({ error: 'El token ha expirado' });
        }
        return res.status(401).json({ error: 'Token inválido', detalle: err.message });
    }
};

module.exports = { requireAuth };
