const { Pool } = require('pg');
require('dotenv').config();

// Determine if it is connecting to a cloud database (which requires SSL)
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, // Required for cloud databases like Neon/Supabase
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    }
  : {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };

const pool = new Pool(poolConfig);

// Event listener for error handling on idle clients
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle database client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
