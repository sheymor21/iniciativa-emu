const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '..', 'Jueguiños list por los pibes.txt');
const outputPath = path.join(__dirname, '..', 'data', 'games.json');

const raw = fs.readFileSync(inputPath, 'utf-8');
const lines = raw.split(/\r?\n/);

const games = [];
let currentConsole = null;

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed) continue;

  const consoleMatch = trimmed.match(/^-+\[(.+?)\]-+$/);
  if (consoleMatch) {
    currentConsole = consoleMatch[1].trim();
    continue;
  }

  // Skip non-game lines (e.g. "(End of file...)")
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) continue;

  const parts = trimmed.split(/\s*\|\s*/);
  if (parts.length < 2) continue;

  const name = parts[0].trim();
  const genre = parts[1].trim();

  if (name && currentConsole) {
    games.push({
      id: games.length + 1,
      name,
      console: currentConsole,
      genre,
    });
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(games, null, 2), 'utf-8');

console.log(`Parsed ${games.length} games into ${outputPath}`);
console.log('Consoles:', [...new Set(games.map(g => g.console))].join(', '));
