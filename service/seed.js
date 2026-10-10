const { poolPromise } = require('./db');

async function seed() {
    try {
        const pool = await poolPromise;
        console.log('Seeding data...');

        // Create a dummy user
        await pool.request().query(`
            IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE Dni = '00000000')
            BEGIN
                INSERT INTO Usuarios (Dni, Nombre, Rol, GoogleId) VALUES ('00000000', 'Doña Susej', 'emprendedor', 'fake_google_0')
            END
            
            IF NOT EXISTS (SELECT 1 FROM Usuarios WHERE Dni = '11111111')
            BEGIN
                INSERT INTO Usuarios (Dni, Nombre, Rol, GoogleId) VALUES ('11111111', 'Don Jose', 'emprendedor', 'fake_google_1')
            END
        `);

        // Create stores
        await pool.request().query(`
            DECLARE @idSusej INT = (SELECT Id FROM Usuarios WHERE Dni = '00000000');
            IF NOT EXISTS (SELECT 1 FROM Tiendas WHERE UsuarioId = @idSusej)
            BEGIN
                INSERT INTO Tiendas (UsuarioId, Nombre, Categoria, LogoUrl) 
                VALUES (@idSusej, 'POSTRES DOÑA SUSEJ', 'Postres y Dulces', 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3')
            END

            DECLARE @idJose INT = (SELECT Id FROM Usuarios WHERE Dni = '11111111');
            IF NOT EXISTS (SELECT 1 FROM Tiendas WHERE UsuarioId = @idJose)
            BEGIN
                INSERT INTO Tiendas (UsuarioId, Nombre, Categoria, LogoUrl) 
                VALUES (@idJose, 'POSTRES DON JOSE', 'Postres y Dulces', 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3')
            END
        `);

        console.log('Seeding completed!');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

seed();
