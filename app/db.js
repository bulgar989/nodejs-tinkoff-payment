const mysql = require('mysql');

const dbPool  = mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    database: process.env.MYSQL_NAME,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    multipleStatements: true
});

module.exports = dbPool;
