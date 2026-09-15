const fs = require('fs');
const p = 'c:/xampp/htdocs/ar_shooter_game/assets/js/main.js';
let s = fs.readFileSync(p, 'utf8');
const lines = s.split(/\n/);
const line = lines[259];
console.log('before:', JSON.stringify(line));

// Fix: setLoadStatus('...');  -> setLoadStatus('...');
if (line && line.includes("setLoadStatus('Loading models...") && !line.includes("')")) {
  lines[259] = "  setLoadStatus('Loading models...');";
  fs.writeFileSync(p, lines.join('\n'));
  console.log('after:', JSON.stringify(lines[259]));
  console.log('FIXED');
} else if (line && /setLoadStatus\('Loading models\.\.\.'\);/.test(line) === false) {
  // replace any broken variant on that line
  lines[259] = "  setLoadStatus('Loading models...');";
  fs.writeFileSync(p, lines.join('\n'));
  console.log('after:', JSON.stringify(lines[259]));
  console.log('FIXED via fallback');
} else {
  console.log('already ok or unexpected:', [...line].map((c) => c.charCodeAt(0)));
}
