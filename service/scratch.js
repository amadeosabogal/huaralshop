const { poolPromise } = require('./db');
async function run() {
    const pool = await poolPromise;
    await pool.request().query(`
        CREATE TABLE Fiados (
            Id INT IDENTITY(1,1) PRIMARY KEY,
            TiendaId INT NOT NULL FOREIGN KEY REFERENCES Tiendas(Id),
            ClienteNombre VARCHAR(100),
            ClienteDni VARCHAR(20),
            Monto DECIMAL(10,2) NOT NULL,
            Fecha DATETIME DEFAULT GETDATE(),
            Estado VARCHAR(20) DEFAULT 'Pendiente',
            Descripcion VARCHAR(MAX)
        );
        CREATE TABLE Ventas (
            Id INT IDENTITY(1,1) PRIMARY KEY,
            TiendaId INT NOT NULL FOREIGN KEY REFERENCES Tiendas(Id),
            Monto DECIMAL(10,2) NOT NULL,
            Fecha DATETIME DEFAULT GETDATE(),
            MetodoPago VARCHAR(50) DEFAULT 'Efectivo',
            Descripcion VARCHAR(MAX)
        );
    `);
    console.log('Tablas creadas');
    process.exit(0);
}
run().catch(console.error);
