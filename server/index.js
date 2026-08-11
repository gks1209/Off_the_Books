const dns = require('dns');
// Enforce resolving IPv4 first to prevent ENETUNREACH errors on networks without IPv6 routing support.
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const db = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database table initialization on startup
const initDatabase = async () => {
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const sqlSchema = fs.readFileSync(schemaPath, 'utf8');
      await db.query(sqlSchema);
      console.log('Database tables verified/initialized successfully.');
    } else {
      console.warn('schema.sql file not found. Skipping table auto-creation.');
    }
  } catch (error) {
    console.error('Error during database initialization:', error);
  }
};

// Routes
// 1. Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Off the Books Backend API' });
});

// 2. Health check route & Database Connection test
app.get('/api/health', async (req, res) => {
  try {
    const dbResult = await db.query('SELECT NOW()');
    res.json({
      status: 'OK',
      serverTime: new Date(),
      database: {
        status: 'Connected',
        timestamp: dbResult.rows[0].now,
      }
    });
  } catch (error) {
    console.error('Database connection test failed:', error.message);
    res.status(500).json({
      status: 'ERROR',
      serverTime: new Date(),
      database: {
        status: 'Disconnected',
        error: error.message
      }
    });
  }
});

// Mount Routes
const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Export app for testing purposes
module.exports = app;

// Start Server (only if not in testing mode)
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, async () => {
    console.log(`Server is running on port ${PORT}`);
    // Initialize database schema on server start
    await initDatabase();
  });
}
