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
  connectionLimit: 10,
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
    console.error("[DB] MySQL connection FAILED:", err.message);
    process.exit(1);
  });

export default pool;
