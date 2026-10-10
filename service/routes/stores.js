const express = require('express');
const router = express.Router();
const { poolPromise, sql } = require('../db');
const { requireAuth } = require('../middleware/authMiddleware');

// Obtener todas las tiendas
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT Id, UsuarioId, Nombre, Categoria, LogoUrl FROM Tiendas');
        res.json(result.recordset);
    } catch (err) {
        console.error('Error fetching stores:', err);
        res.status(500).json({ error: 'Error al obtener tiendas' });
    }
});

// Obtener detalles y productos de una tienda específica
router.get('/:id/products', async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await poolPromise;
        
        // Obtener la tienda
        const storeResult = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM Tiendas WHERE Id = @id');
            
        if (storeResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Tienda no encontrada' });
        }
        
        const store = storeResult.recordset[0];
        
        // Obtener productos
        const productsResult = await pool.request()
            .input('tiendaId', sql.Int, id)
            .query("SELECT * FROM Productos WHERE TiendaId = @tiendaId AND Estado = 'activo'");
            
        store.products = productsResult.recordset;
        
        res.json(store);
    } catch (err) {
        console.error('Error fetching store products:', err);
        res.status(500).json({ error: 'Error al obtener productos de la tienda' });
    }
});

// Obtener la tienda del usuario autenticado
router.get('/my-store', requireAuth, async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('usuarioId', sql.Int, req.user.id)
            .query('SELECT * FROM Tiendas WHERE UsuarioId = @usuarioId');
        res.json(result.recordset[0] || null);
    } catch (err) {
        console.error('Error fetching my store:', err);
        res.status(500).json({ error: 'Error al obtener tienda' });
    }
});

// Actualizar una tienda
router.put('/:id', requireAuth, async (req, res) => {
    const { nombre, categoria, logoUrl } = req.body;
    const { id } = req.params;
    
    try {
        const pool = await poolPromise;
        
        // Verificar propiedad
        const check = await pool.request()
            .input('id', sql.Int, id)
            .input('userId', sql.Int, req.user.id)
            .query('SELECT * FROM Tiendas WHERE Id = @id AND UsuarioId = @userId');
            
        if (check.recordset.length === 0) {
            return res.status(403).json({ error: 'No autorizado para editar esta tienda' });
        }

        const result = await pool.request()
            .input('id', sql.Int, id)
            .input('nombre', sql.VarChar, nombre)
            .input('categoria', sql.VarChar, categoria || null)
            .input('logoUrl', sql.VarChar(sql.MAX), logoUrl || null)
            .query(`
                UPDATE Tiendas 
                SET Nombre = @nombre, Categoria = @categoria, LogoUrl = @logoUrl
                OUTPUT INSERTED.*
                WHERE Id = @id
            `);
            
        res.json(result.recordset[0]);
    } catch (err) {
        console.error('Error updating store:', err);
        res.status(500).json({ error: 'Error al actualizar la tienda' });
    }
});

// Registrar una nueva tienda (Requiere autenticación)
router.post('/', requireAuth, async (req, res) => {
    const { nombre, categoria, logoUrl } = req.body;
    // req.user viene del token JWT decodificado
    
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('usuarioId', sql.Int, req.user.id)
            .input('nombre', sql.VarChar, nombre)
            .input('categoria', sql.VarChar, categoria || null)
            .input('logoUrl', sql.VarChar(sql.MAX), logoUrl || null)
            .query(`
                INSERT INTO Tiendas (UsuarioId, Nombre, Categoria, LogoUrl)
                OUTPUT INSERTED.*
                VALUES (@usuarioId, @nombre, @categoria, @logoUrl)
            `);
            
        // Actualizamos el rol del usuario a emprendedor si no lo era
        await pool.request()
            .input('userId', sql.Int, req.user.id)
            .query("UPDATE Usuarios SET Rol = 'emprendedor' WHERE Id = @userId AND Rol = 'cliente'");

        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error('Error creating store:', err);
        res.status(500).json({ error: 'Error al crear la tienda' });
    }
});

module.exports = router;
