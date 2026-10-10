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
            .query('SELECT * FROM Ventas WHERE TiendaId = @tiendaId ORDER BY Fecha DESC');
        
        // Also get completed orders sum
        const pedidos = await pool.request()
            .input('tiendaId', sql.Int, storeId)
            .query("SELECT SUM(Total) as TotalPedidos FROM Pedidos WHERE TiendaId = @tiendaId AND Estado = 'Entregado'");

        res.json({
            ventasManuales: result.recordset,
            totalPedidosEntregados: pedidos.recordset[0].TotalPedidos || 0
        });
    } catch (err) {
        res.status(500).json({ error: 'Error obteniendo ventas' });
    }
});

router.post('/', requireAuth, checkStoreOwnership, async (req, res) => {
    const { tiendaId, monto, metodoPago, descripcion } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('tiendaId', sql.Int, tiendaId)
            .input('monto', sql.Decimal(10,2), monto)
            .input('metodoPago', sql.VarChar, metodoPago || 'Efectivo')
            .input('descripcion', sql.VarChar(sql.MAX), descripcion || '')
            .query(`
                INSERT INTO Ventas (TiendaId, Monto, MetodoPago, Descripcion)
                OUTPUT INSERTED.*
                VALUES (@tiendaId, @monto, @metodoPago, @descripcion)
            `);
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: 'Error creando venta' });
    }
});

module.exports = router;
