/* ═══════════════════════════════════════════════════════════
   OUTFYST — build.js
   ═══════════════════════════════════════════════════════════
   
   Injects environment variables into HTML at build time.
   Vercel runs this automatically during deploy.
   
   Local dev: create .env file, then run: node build.js
   
   ═══════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');

// ── Load .env for local dev ──
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(function (line) {
    line = line.trim();
    if (!line || line.startsWith('#')) return;
    const eq = line.indexOf('=');
    if (eq === -1) return;
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  });
}

// ── Read env vars ──
const vars = {
  WEB3FORMS_ACCESS_KEY: process.env.WEB3FORMS_ACCESS_KEY || '',
  INSTAGRAM_URL: process.env.INSTAGRAM_URL || '#',
  WHATSAPP_URL: process.env.WHATSAPP_URL || '#',
  EMAIL_ADDRESS: process.env.EMAIL_ADDRESS || '#'
};

// ── Create public/ output directory ──
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  fs.rmSync(publicDir, { recursive: true });
}
fs.mkdirSync(publicDir);

// ── Copy site files to public/ ──
const SKIP = ['public', 'node_modules', '.git', '.env', '.vercel', '.gitignore',
  'build.js', 'package.json', 'vercel.json', '.env.example'];

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP.includes(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

copyDir(__dirname, publicDir);

// ── Inject env vars into index.html ──
const htmlPath = path.join(publicDir, 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Replace placeholders
html = html.replace('__WEB3FORMS_ACCESS_KEY__', vars.WEB3FORMS_ACCESS_KEY);
html = html.replace('__INSTAGRAM_URL__', vars.INSTAGRAM_URL);
html = html.replace('__WHATSAPP_URL__', vars.WHATSAPP_URL);
html = html.replace(/__EMAIL_ADDRESS__/g, vars.EMAIL_ADDRESS);

fs.writeFileSync(htmlPath, html, 'utf8');

// ── Remove config files from public (not needed anymore) ──
const configPath = path.join(publicDir, 'js', 'config.js');
const configExPath = path.join(publicDir, 'js', 'config.example.js');
if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
if (fs.existsSync(configExPath)) fs.unlinkSync(configExPath);

// ── Done ──
console.log('✓ Built to /public');
Object.entries(vars).forEach(function ([key, val]) {
  if (!val || val === '#') {
    console.log('  ⚠ ' + key + ' not set');
  } else {
    console.log('  ✓ ' + key + ' injected');
  }
});
