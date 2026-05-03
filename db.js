// db.js — MySQL connection pool (mysql2/promise)
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port:     Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
  timezone: "+00:00",        // store/return UTC
  decimalNumbers: true,
});

// Verify connectivity on startup
pool.getConnection()
  .then((conn) => {
    console.log("[DB] MySQL connected successfully.");
    conn.release();
  })
  .catch((err) => {
    console.error("=================================================");
    console.error("[DB] MySQL CONNECTION ERROR");
    console.error("Host:", process.env.DB_HOST);
    console.error("User:", process.env.DB_USER);
    console.error("Database:", process.env.DB_NAME);
    console.error("Error:", err.message);
    if (err.code === 'ECONNREFUSED') {
      console.error("TIP: Connection refused. Check if MySQL is running or if the host/port is correct.");
    } else if (err.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error("TIP: Access denied. Check your DB_USER and DB_PASSWORD.");
    }
    console.error("=================================================");
    process.exit(1);
  });

export default pool;
