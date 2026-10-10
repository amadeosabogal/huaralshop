const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../db');
const { requireAuth } = require('../middleware/authMiddleware');

// Validar que la tienda pertenece al usuario autenticado (helper middleware)
const checkStoreOwnership = async (req, res, next) => {
    try {
        const pool = await poolPromise;
        
        let tiendaId = req.body.tiendaId; // para POST
        
        // Si es PUT/DELETE, obtener tiendaId del producto
        if (req.params.id) {
            const prodResult = await pool.request()
                .input('id', sql.Int, req.params.id)
                .query('SELECT TiendaId FROM Productos WHERE Id = @id');
            if (prodResult.recordset.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
            tiendaId = prodResult.recordset[0].TiendaId;
        }

        if (!tiendaId) return res.status(400).json({ error: 'TiendaId requerido' });

        const storeResult = await pool.request()
            .input('tiendaId', sql.Int, tiendaId)
            .query('SELECT UsuarioId FROM Tiendas WHERE Id = @tiendaId');
            
        if (storeResult.recordset.length === 0) return res.status(404).json({ error: 'Tienda no encontrada' });
        
        if (storeResult.recordset[0].UsuarioId !== req.user.id && req.user.rol !== 'admin') {
            return res.status(403).json({ error: 'No tienes permiso para gestionar esta tienda' });
        }
        
        next();
    } catch (err) {
        console.error('Error verificando propiedad:', err);
        res.status(500).json({ error: 'Error del servidor' });
    }
};

// Crear producto
router.post('/', requireAuth, checkStoreOwnership, async (req, res) => {
    const { tiendaId, nombre, categoria, precio } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('tiendaId', sql.Int, tiendaId)
            .input('nombre', sql.VarChar, nombre)
            .input('categoria', sql.VarChar, categoria || null)
            .input('precio', sql.Decimal(10,2), precio)
            .query(`
                INSERT INTO Productos (TiendaId, Nombre, Categoria, Precio, Estado)
                OUTPUT INSERTED.*
                VALUES (@tiendaId, @nombre, @categoria, @precio, 'activo')
            `);
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error('Error creating product:', err);
        res.status(500).json({ error: 'Error al crear producto' });
    }
});

// Actualizar producto
router.put('/:id', requireAuth, checkStoreOwnership, async (req, res) => {
    const { nombre, categoria, precio } = req.body;
    const { id } = req.params;
    
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.VarChar, nombre)
            .input('categoria', sql.VarChar, categoria || null)
            .input('precio', sql.Decimal(10,2), precio)
            .query(`
                UPDATE Productos 
                SET Nombre = @nombre, Categoria = @categoria, Precio = @precio
                OUTPUT INSERTED.*
                WHERE Id = @id
            `);
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
});

// "Eliminar" producto (Soft delete)
router.delete('/:id', requireAuth, checkStoreOwnership, async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        await pool.request()
            .input('id', sql.Int, id)
            .query("UPDATE Productos SET Estado = 'inactivo' WHERE Id = @id");
        res.json({ message: 'Producto eliminado (inactivo)' });
    } catch (err) {
        console.error('Error deleting product:', err);
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
});

module.exports = router;
