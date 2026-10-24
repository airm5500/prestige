'use strict';
/* Pour les scripts Windows : affiche une valeur de config.json (PORT par defaut 3010) sans rien d'autre.
   Usage : node src\lire-config.js PORT  |  node src\lire-config.js JETON  |  node src\lire-config.js VALIDE
   VALIDE affiche OK, ou la raison pour laquelle le service refuserait de demarrer. */
const fs = require('fs');
const path = require('path');
const f = process.env.WHATSAPP_CONFIG || path.join(__dirname, '..', 'config.json');
let c = {};
try { c = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) {
  process.stdout.write(process.argv[2] === 'VALIDE' ? 'config.json absent ou illisible (' + f + ')' : '');
  process.exit(process.argv[2] === 'VALIDE' ? 1 : 0);
}
const cle = process.argv[2];
if (cle === 'VALIDE') {
  const j = String(c.JETON || '');
  const pb = j.length < 16 ? 'JETON absent ou trop court (16 caracteres au moins)' : (/^A_REMPLACER/.test(j) ? 'JETON laisse a sa valeur d\'exemple' : '');
  process.stdout.write(pb || 'OK');
  process.exit(pb ? 1 : 0);
}
process.stdout.write(String(c[cle] !== undefined ? c[cle] : (cle === 'PORT' ? 3010 : '')));
