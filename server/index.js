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

// Helper function to map DB row to frontend object format
const parseItem = (row) => {
  if (!row) return null;
  return {
    ...row,
    buyPrice: row.buyPrice !== null ? Number(row.buyPrice) : '',
    costWash: row.costWash !== null ? Number(row.costWash) : 0,
    costRepair: row.costRepair !== null ? Number(row.costRepair) : 0,
    costShip: row.costShip !== null ? Number(row.costShip) : 0,
    costDuty: row.costDuty !== null ? Number(row.costDuty) : 0,
    totalCost: row.totalCost !== null ? Number(row.totalCost) : 0,
    soldPrice: row.soldPrice !== null ? Number(row.soldPrice) : '',
    isReceived: !!row.isReceived,
  };
};

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

// 3. GET all items
app.get('/api/items', async (req, res) => {
  try {
    const queryText = 'SELECT * FROM items ORDER BY "buyDate" DESC, "createdAt" DESC;';
    const result = await db.query(queryText);
    const parsedItems = result.rows.map(parseItem);
    res.json(parsedItems);
  } catch (error) {
    console.error('Error fetching items:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. POST a new item
app.post('/api/items', async (req, res) => {
  const item = req.body;
  try {
    const queryText = `
      INSERT INTO items (
        "id", "name", "buyDate", "buyFrom", "buyPrice", "buyCurrency", "category",
        "costWash", "costRepair", "costShip", "costDuty", "totalCost",
        "sellerName", "sellerPhone", "sellerTrackingNum", "isReceived", "status",
        "soldDate", "soldVia", "soldPrice", "soldCurrency",
        "deliveryName", "deliveryAddr", "deliveryPhone", "trackingNum"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING *;
    `;
    const values = [
      item.id,
      item.name,
      item.buyDate || null,
      item.buyFrom || null,
      item.buyPrice !== '' && item.buyPrice !== null ? Number(item.buyPrice) : null,
      item.buyCurrency || 'KRW',
      item.category || null,
      item.costWash !== '' && item.costWash !== null ? Number(item.costWash) : 0,
      item.costRepair !== '' && item.costRepair !== null ? Number(item.costRepair) : 0,
      item.costShip !== '' && item.costShip !== null ? Number(item.costShip) : 0,
      item.costDuty !== '' && item.costDuty !== null ? Number(item.costDuty) : 0,
      item.totalCost !== '' && item.totalCost !== null ? Number(item.totalCost) : 0,
      item.sellerName || null,
      item.sellerPhone || null,
      item.sellerTrackingNum || null,
      item.isReceived || false,
      item.status || 'selling',
      item.soldDate || null,
      item.soldVia || null,
      item.soldPrice !== '' && item.soldPrice !== null ? Number(item.soldPrice) : null,
      item.soldCurrency || 'KRW',
      item.deliveryName || null,
      item.deliveryAddr || null,
      item.deliveryPhone || null,
      item.trackingNum || null,
    ];
    const result = await db.query(queryText, values);
    res.status(201).json(parseItem(result.rows[0]));
  } catch (error) {
    console.error('Error creating item:', error);
    res.status(500).json({ error: error.message });
  }
});

// 5. PUT update an item
app.put('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  const item = req.body;
  try {
    const queryText = `
      UPDATE items SET
        "name" = $1, "buyDate" = $2, "buyFrom" = $3, "buyPrice" = $4, "buyCurrency" = $5, "category" = $6,
        "costWash" = $7, "costRepair" = $8, "costShip" = $9, "costDuty" = $10, "totalCost" = $11,
        "sellerName" = $12, "sellerPhone" = $13, "sellerTrackingNum" = $14, "isReceived" = $15, "status" = $16,
        "soldDate" = $17, "soldVia" = $18, "soldPrice" = $19, "soldCurrency" = $20,
        "deliveryName" = $21, "deliveryAddr" = $22, "deliveryPhone" = $23, "trackingNum" = $24
      WHERE "id" = $25
      RETURNING *;
    `;
    const values = [
      item.name,
      item.buyDate || null,
      item.buyFrom || null,
      item.buyPrice !== '' && item.buyPrice !== null ? Number(item.buyPrice) : null,
      item.buyCurrency || 'KRW',
      item.category || null,
      item.costWash !== '' && item.costWash !== null ? Number(item.costWash) : 0,
      item.costRepair !== '' && item.costRepair !== null ? Number(item.costRepair) : 0,
      item.costShip !== '' && item.costShip !== null ? Number(item.costShip) : 0,
      item.costDuty !== '' && item.costDuty !== null ? Number(item.costDuty) : 0,
      item.totalCost !== '' && item.totalCost !== null ? Number(item.totalCost) : 0,
      item.sellerName || null,
      item.sellerPhone || null,
      item.sellerTrackingNum || null,
      item.isReceived || false,
      item.status || 'selling',
      item.soldDate || null,
      item.soldVia || null,
      item.soldPrice !== '' && item.soldPrice !== null ? Number(item.soldPrice) : null,
      item.soldCurrency || 'KRW',
      item.deliveryName || null,
      item.deliveryAddr || null,
      item.deliveryPhone || null,
      item.trackingNum || null,
      id
    ];
    const result = await db.query(queryText, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(parseItem(result.rows[0]));
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: error.message });
  }
});

// 6. DELETE an item
app.delete('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM items WHERE "id" = $1 RETURNING *;', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ message: 'Item deleted successfully', id });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  // Initialize database schema on server start
  await initDatabase();
});
