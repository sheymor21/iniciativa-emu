require('dotenv').config();
const { createClient } = require('@libsql/client');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables.');
  process.exit(1);
}

const client = createClient({ url, authToken });

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

const schema = `
CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  console TEXT NOT NULL,
  genre TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  author TEXT NOT NULL,
  score INTEGER NOT NULL CHECK(score >= 1 AND score <= 10),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (game_id) REFERENCES games(id)
);

CREATE TABLE IF NOT EXISTS review_votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  review_id INTEGER NOT NULL,
  vote_type TEXT NOT NULL CHECK(vote_type IN ('positive', 'negative')),
  voter TEXT NOT NULL DEFAULT 'anonymous',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (review_id) REFERENCES reviews(id),
  UNIQUE(review_id, voter)
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'user', 'guest')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_games_console ON games(console);
CREATE INDEX IF NOT EXISTS idx_ratings_game ON ratings(game_id);
CREATE INDEX IF NOT EXISTS idx_reviews_game ON reviews(game_id);
CREATE INDEX IF NOT EXISTS idx_votes_review ON review_votes(review_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE TABLE IF NOT EXISTS favorites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (game_id) REFERENCES games(id),
  UNIQUE(user_id, game_id)
);

CREATE TABLE IF NOT EXISTS play_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_id INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (game_id) REFERENCES games(id),
  UNIQUE(user_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_play_orders_user ON play_orders(user_id);
`;

async function setup() {
  console.log('Creating schema...');
  await client.batch(schema.split(/;\s*\n/).filter(s => s.trim()), 'write');

  console.log('Running migrations...');
  try {
    await client.execute(`ALTER TABLE ratings ADD COLUMN author TEXT NOT NULL DEFAULT 'Anónimo'`);
    console.log('Added author column to ratings.');
  } catch (err) {
    if (!err.message.toLowerCase().includes('duplicate column')) {
      throw err;
    }
    console.log('author column already exists.');
  }

  try {
    await client.execute(`ALTER TABLE review_votes ADD COLUMN voter TEXT NOT NULL DEFAULT 'anonymous'`);
    console.log('Added voter column to review_votes.');
  } catch (err) {
    if (!err.message.toLowerCase().includes('duplicate column')) {
      throw err;
    }
    console.log('voter column already exists in review_votes.');
  }

  const gamesPath = path.join(__dirname, '..', 'data', 'games.json');
  const games = JSON.parse(fs.readFileSync(gamesPath, 'utf-8'));

  console.log(`Seeding ${games.length} games...`);

  // Check if games already exist
  const { rows } = await client.execute('SELECT COUNT(*) as count FROM games');
  if (rows[0].count > 0) {
    console.log(`Database already has ${rows[0].count} games. Skipping seed.`);
    console.log('To re-seed, run: DELETE FROM games; DELETE FROM sqlite_sequence WHERE name=\'games\';');
  } else {
    const insertStatements = games.map(game => ({
      sql: 'INSERT INTO games (name, console, genre) VALUES (?, ?, ?)',
      args: [game.name, game.console, game.genre],
    }));
    await client.batch(insertStatements, 'write');
    console.log(`Seeded ${games.length} games.`);
  }

  // Create default admin user if none exists
  const { rows: userCountRows } = await client.execute('SELECT COUNT(*) as count FROM users');
  if (userCountRows[0].count === 0) {
    const adminPin = process.env.ADMIN_PIN;
    if (adminPin) {
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminDisplayName = process.env.ADMIN_DISPLAY_NAME || 'Administrador';
      await client.execute(
        'INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)',
        [adminUsername, hashPassword(adminPin), adminDisplayName, 'admin']
      );
      console.log(`Created default admin user: ${adminUsername}`);
    } else {
      console.log('No users exist. Set ADMIN_PIN in .env to create a default admin.');
    }
  } else {
    console.log(`Database already has ${userCountRows[0].count} users. Skipping default admin.`);
  }

  console.log('Done.');
}

setup().catch(err => {
  console.error(err);
  process.exit(1);
});
