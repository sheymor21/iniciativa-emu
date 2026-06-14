// Copy this file to js/config.js and fill in your Turso credentials.
// js/config.js is gitignored so you don't commit secrets.
//
// WARNING: exposing a write token in client-side code is insecure.
// Anyone with the token can read and modify your database.
// For a public hobby project this is often acceptable; rotate the token if leaked.
const TURSO_CONFIG = {
  // Full URL shown by: turso db show emu --url
  // It may start with libsql:// or https://; both work.
  // Example: libsql://emu-my-org.turso.io
  url: 'libsql://YOUR_DATABASE_URL.turso.io',

  // Create a token with the Turso CLI:
  //   turso db tokens create emu
  token: 'YOUR_TURSO_AUTH_TOKEN',

  // PIN simple para acceder al panel de administración.
  // Es solo una barrera en la UI: el token expuesto permite
  // que alguien técnico haga cambios sin el PIN.
  adminPin: 'YOUR_ADMIN_PIN',
};
