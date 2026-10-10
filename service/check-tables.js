const { poolPromise } = require('./db.js'); 
poolPromise.then(pool => pool.request().query("SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'"))
.then(res => { console.log(res.recordset); process.exit(0); })
.catch(err => { console.error(err); process.exit(1); });
