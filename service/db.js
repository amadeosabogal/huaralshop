const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
    user: process.env.SQLSERVER_USER,
    password: process.env.SQLSERVER_PASSWORD,
    server: process.env.SQLSERVER_SERVER,
    database: process.env.SQLSERVER_DATABASE,
    port: parseInt(process.env.SQLSERVER_PORT, 10),
    options: {
        encrypt: false, // For testing/local. Set to true if on Azure or required by server.
        trustServerCertificate: true // Trust the self-signed cert
    }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log('✅ Conectado a SQL Server (' + process.env.SQLSERVER_DATABASE + ')');
        return pool;
    })
    .catch(err => {
        console.error('❌ Error al conectar a la base de datos: ', err);
        process.exit(1);
    });

module.exports = {
    sql,
    poolPromise
};
