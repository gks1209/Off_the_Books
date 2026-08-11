const bcrypt = require('bcryptjs');
const db = require('./db');
require('dotenv').config();

const migrate = async () => {
  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  if (!defaultPassword) {
    console.error('ERROR: DEFAULT_ADMIN_PASSWORD environment variable is not defined in server/.env');
    process.exit(1);
  }

  console.log('Starting Database Migration...');

  try {
    // 1. Create users table
    console.log('1. Verifying/Creating users table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Hash password and insert default user
    console.log('2. Inserting default administrator account...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    // Try to insert with id=1, or handle if email exists
    await db.query(`
      INSERT INTO users (id, email, password) 
      VALUES (1, 'default@offthebooks.com', $1) 
      ON CONFLICT (email) DO NOTHING;
    `, [hashedPassword]);

    // Retrieve default user ID
    const userRes = await db.query("SELECT id FROM users WHERE email = 'default@offthebooks.com'");
    if (userRes.rows.length === 0) {
      throw new Error('Failed to find or create default administrator account');
    }
    const defaultUserId = userRes.rows[0].id;
    console.log(`Default user ID identified: ${defaultUserId}`);

    // Reset serial sequence for users table to prevent duplicate pkey violations
    console.log('Resetting users sequence...');
    await db.query(`SELECT setval(pg_get_serial_sequence('users', 'id'), coalesce(max(id), 1)) FROM users;`);

    // 3. Alter items table to add userId
    console.log('3. Checking items table column "userId"...');
    await db.query(`
      ALTER TABLE items 
      ADD COLUMN IF NOT EXISTS "userId" INTEGER REFERENCES users(id) ON DELETE CASCADE;
    `);

    // 4. Migrate existing rows to default user
    console.log('4. Migrating existing rows with NULL userId...');
    const updateRes = await db.query(`
      UPDATE items 
      SET "userId" = $1 
      WHERE "userId" IS NULL;
    `, [defaultUserId]);
    console.log(`Migrated ${updateRes.rowCount} items to default user.`);

    // 5. Set NOT NULL constraint
    console.log('5. Setting "userId" NOT NULL constraint...');
    await db.query(`
      ALTER TABLE items 
      ALTER COLUMN "userId" SET NOT NULL;
    `);

    console.log('Database Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('ERROR: Database Migration failed:', error);
    process.exit(1);
  }
};

migrate();
