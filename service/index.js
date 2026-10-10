const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { poolPromise } = require('./db');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rutas
const authRoutes = require('./routes/auth');
const storesRoutes = require('./routes/stores');
const productsRoutes = require('./routes/products');
const ordersRoutes = require('./routes/orders');
const salesRoutes = require('./routes/sales');
const creditsRoutes = require('./routes/credits');
const usersRoutes = require('./routes/users');

app.use('/api/auth', authRoutes);
app.use('/api/stores', storesRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/users', usersRoutes);

// Ruta de prueba
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Servidor backend funcionando correctamente' });
});

// Arrancar el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor backend escuchando en el puerto ${PORT}`);
});
