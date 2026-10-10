const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../db');
const { requireAuth } = require('../middleware/authMiddleware');

// Validar propiedad de la tienda para consultar pedidos
const checkStoreOwnership = async (req, res, next) => {
    try {
        const pool = await poolPromise;
        const storeId = req.params.storeId || req.body.storeId;
        
        if (!storeId) return res.status(400).json({ error: 'storeId requerido' });

        const storeResult = await pool.request()
            .input('tiendaId', sql.Int, storeId)
            .query('SELECT UsuarioId FROM Tiendas WHERE Id = @tiendaId');
            
        if (storeResult.recordset.length === 0) return res.status(404).json({ error: 'Tienda no encontrada' });
        
        if (storeResult.recordset[0].UsuarioId !== req.user.id && req.user.rol !== 'admin') {
            return res.status(403).json({ error: 'No tienes permiso para ver pedidos de esta tienda' });
        }
        
        next();
    } catch (err) {
        res.status(500).json({ error: 'Error del servidor' });
    }
};

// Crear pedido (El cliente hace el pedido)
router.post('/', requireAuth, async (req, res) => {
    const { tiendaId, items, total } = req.body;
    
    try {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            // Insertar Pedido
            const pedidoResult = await transaction.request()
                .input('tiendaId', sql.Int, tiendaId)
                .input('clienteId', sql.Int, req.user.id)
                .input('total', sql.Decimal(10,2), total)
                .query(`
                    INSERT INTO Pedidos (TiendaId, ClienteId, Estado, Total)
                    OUTPUT INSERTED.Id
                    VALUES (@tiendaId, @clienteId, 'Pendiente', @total)
                `);
                
            const pedidoId = pedidoResult.recordset[0].Id;
            
            // Insertar Detalles
            for (const item of items) {
                await transaction.request()
                    .input('pedidoId', sql.Int, pedidoId)
                    .input('productoId', sql.Int, item.id)
                    .input('cantidad', sql.Int, item.quantity)
                    .input('precio', sql.Decimal(10,2), item.price)
                    .query(`
                        INSERT INTO PedidoDetalles (PedidoId, ProductoId, Cantidad, PrecioUnitario)
                        VALUES (@pedidoId, @productoId, @cantidad, @precio)
                    `);
            }
            
            await transaction.commit();
            res.status(201).json({ message: 'Pedido creado exitosamente', pedidoId });
            
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
        
    } catch (err) {
        console.error('Error creating order:', err);
        res.status(500).json({ error: 'Error al crear el pedido' });
    }
});

// Obtener pedidos de una tienda (Para el emprendedor)
router.get('/store/:storeId', requireAuth, checkStoreOwnership, async (req, res) => {
    const { storeId } = req.params;
    try {
        const pool = await poolPromise;
        
        // Obtener pedidos
        const ordersResult = await pool.request()
            .input('tiendaId', sql.Int, storeId)
            .query(`
                SELECT p.Id, p.Estado, p.Total, p.FechaPedido, u.Nombre as Cliente, u.Dni as ClienteDni
                FROM Pedidos p
                JOIN Usuarios u ON p.ClienteId = u.Id
                WHERE p.TiendaId = @tiendaId
                ORDER BY p.FechaPedido DESC
            `);
            
        const pedidos = ordersResult.recordset;
        
        // Para cada pedido, obtener sus items
        for (const pedido of pedidos) {
            const detallesResult = await pool.request()
                .input('pedidoId', sql.Int, pedido.Id)
                .query(`
                    SELECT pd.Cantidad, pd.PrecioUnitario, pr.Nombre 
                    FROM PedidoDetalles pd
                    JOIN Productos pr ON pd.ProductoId = pr.Id
                    WHERE pd.PedidoId = @pedidoId
                `);
            pedido.items = detallesResult.recordset;
        }
        
        res.json(pedidos);
    } catch (err) {
        console.error('Error fetching orders:', err);
        res.status(500).json({ error: 'Error al obtener pedidos' });
    }
});

// Obtener pedidos del cliente autenticado
router.get('/my-orders', requireAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const ordersResult = await pool.request()
            .input('clienteId', sql.Int, req.user.id)
            .query(`
                SELECT p.Id, p.Estado, p.Total, p.FechaPedido, t.Nombre as storeName, t.Id as storeId
                FROM Pedidos p
                JOIN Tiendas t ON p.TiendaId = t.Id
                WHERE p.ClienteId = @clienteId
                ORDER BY p.FechaPedido DESC
            `);
            
        const pedidos = ordersResult.recordset;
        
        for (const pedido of pedidos) {
            const detallesResult = await pool.request()
                .input('pedidoId', sql.Int, pedido.Id)
                .query(`
                    SELECT pd.Cantidad, pd.PrecioUnitario as price, pr.Nombre as name
                    FROM PedidoDetalles pd
                    JOIN Productos pr ON pd.ProductoId = pr.Id
                    WHERE pd.PedidoId = @pedidoId
                `);
            pedido.items = detallesResult.recordset;
            pedido.date = pedido.FechaPedido;
            pedido.status = pedido.Estado;
            pedido.total = pedido.Total;
        }
        
        res.json(pedidos);
    } catch (err) {
        console.error('Error fetching my orders:', err);
        res.status(500).json({ error: 'Error al obtener mis pedidos' });
    }
});

// Actualizar estado del pedido
router.put('/:id/status', requireAuth, async (req, res) => {
    const { id } = req.params;
    const { estado } = req.body;
    
    try {
        const pool = await poolPromise;
        
        // Validar propiedad: El que actualiza debe ser el dueño de la tienda del pedido
        const authCheck = await pool.request()
            .input('pedidoId', sql.Int, id)
            .input('userId', sql.Int, req.user.id)
            .query(`
                SELECT p.Id 
                FROM Pedidos p
                JOIN Tiendas t ON p.TiendaId = t.Id
                WHERE p.Id = @pedidoId AND (t.UsuarioId = @userId OR @userId = (SELECT Id FROM Usuarios WHERE Rol = 'admin'))
            `);
            
        if (authCheck.recordset.length === 0) {
            return res.status(403).json({ error: 'No tienes permiso para actualizar este pedido' });
        }
        
        await pool.request()
            .input('id', sql.Int, id)
            .input('estado', sql.VarChar, estado)
            .query('UPDATE Pedidos SET Estado = @estado WHERE Id = @id');
            
        res.json({ message: 'Estado actualizado' });
    } catch (err) {
        console.error('Error updating order status:', err);
        res.status(500).json({ error: 'Error al actualizar estado del pedido' });
    }
});

module.exports = router;
