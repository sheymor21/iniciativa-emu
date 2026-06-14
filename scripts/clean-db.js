require('dotenv').config();
const { createClient } = require('@libsql/client');

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error('Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables.');
  process.exit(1);
}

const client = createClient({ url, authToken });

const TABLES = [
  'review_votes',
  'reviews',
  'ratings',
  'favorites',
  'play_orders',
  'games',
];

async function clean() {
  console.log('Cleaning database tables (users are preserved):');
  console.log('  ' + TABLES.join(', '));

  for (const table of TABLES) {
    await client.execute(`DELETE FROM ${table};`);
    console.log(`  - Cleared ${table}`);
  }

  await client.execute("DELETE FROM sqlite_sequence WHERE name='games';");
  console.log('  - Reset games auto-increment');

  console.log('Done. Run `npm run setup-db` to re-seed games.');
}

clean().catch(err => {
  console.error(err);
  process.exit(1);
});
