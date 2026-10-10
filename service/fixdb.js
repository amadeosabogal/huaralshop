const { poolPromise } = require('./db');

async function fix() {
  try {
    const pool = await poolPromise;
    // Drop existing unique constraints
    await pool.request().query("ALTER TABLE Usuarios DROP CONSTRAINT UQ__Usuarios__A6FBF2FBC26EA2B4");
    await pool.request().query("ALTER TABLE Usuarios DROP CONSTRAINT UQ__Usuarios__C030857504178072");
    
    // Create new filtered unique indexes
    await pool.request().query("CREATE UNIQUE NONCLUSTERED INDEX UQ_Usuarios_Dni ON Usuarios(Dni) WHERE Dni IS NOT NULL");
    await pool.request().query("CREATE UNIQUE NONCLUSTERED INDEX UQ_Usuarios_GoogleId ON Usuarios(GoogleId) WHERE GoogleId IS NOT NULL");
    
    console.log("Database constraints updated successfully.");
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

fix();
