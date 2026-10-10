const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../db');
const { requireAuth } = require('../middleware/authMiddleware');

const checkStoreOwnership = async (req, res, next) => {
    try {
        const pool = await poolPromise;
        const storeId = req.params.storeId || req.body.tiendaId;
        if (!storeId) return res.status(400).json({ error: 'TiendaId requerido' });

        const storeResult = await pool.request()
            .input('tiendaId', sql.Int, storeId)
            .query('SELECT UsuarioId FROM Tiendas WHERE Id = @tiendaId');
            
        if (storeResult.recordset.length === 0) return res.status(404).json({ error: 'Tienda no encontrada' });
        
        if (storeResult.recordset[0].UsuarioId !== req.user.id && req.user.rol !== 'admin') {
            return res.status(403).json({ error: 'No tienes permiso para gestionar esta tienda' });
        }
        
        next();
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor' });
    }
};

router.get('/store/:storeId', requireAuth, checkStoreOwnership, async (req, res) => {
    const { storeId } = req.params;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('tiendaId', sql.Int, storeId)
            .query('SELECT * FROM Fiados WHERE TiendaId = @tiendaId ORDER BY Fecha DESC');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: 'Error obteniendo fiados' });
    }
});

router.post('/', requireAuth, checkStoreOwnership, async (req, res) => {
    const { tiendaId, clienteNombre, clienteDni, monto, descripcion } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('tiendaId', sql.Int, tiendaId)
            .input('clienteNombre', sql.VarChar, clienteNombre || '')
            .input('clienteDni', sql.VarChar, clienteDni || '')
            .input('monto', sql.Decimal(10,2), monto)
            .input('descripcion', sql.VarChar(sql.MAX), descripcion || '')
            .query(`
                INSERT INTO Fiados (TiendaId, ClienteNombre, ClienteDni, Monto, Descripcion, Estado)
                OUTPUT INSERTED.*
                VALUES (@tiendaId, @clienteNombre, @clienteDni, @monto, @descripcion, 'Pendiente')
            `);
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error creando fiado' });
    }
});

router.put('/:id/pay', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        
        // Check ownership
        const authCheck = await pool.request()
            .input('fiadoId', sql.Int, id)
            .input('userId', sql.Int, req.user.id)
            .query(`
                SELECT f.Id 
                FROM Fiados f
                JOIN Tiendas t ON f.TiendaId = t.Id
                WHERE f.Id = @fiadoId AND (t.UsuarioId = @userId OR @userId = (SELECT Id FROM Usuarios WHERE Rol = 'admin'))
            `);
            
        if (authCheck.recordset.length === 0) {
            return res.status(403).json({ error: 'No tienes permiso' });
        }
        
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                UPDATE Fiados 
                SET Estado = 'Pagado'
                OUTPUT INSERTED.*
                WHERE Id = @id
            `);
            
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error actualizando fiado' });
    }
});

module.exports = router;
