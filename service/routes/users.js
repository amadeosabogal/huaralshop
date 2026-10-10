const express = require('express');
const router = express.Router();
const { poolPromise } = require('../db');

// Obtener todos los usuarios
router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query('SELECT Id, Dni, Nombre, Telefono, Rol, GoogleId, FechaCreacion FROM Usuarios');
        res.json(result.recordset.map(u => ({
            id: u.Id,
            dni: u.Dni,
            nombre: u.Nombre,
            telefono: u.Telefono,
            rol: u.Rol,
            googleId: u.GoogleId,
            fechaCreacion: u.FechaCreacion
        })));
    } catch (err) {
        console.error('Error fetching users:', err);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

module.exports = router;
