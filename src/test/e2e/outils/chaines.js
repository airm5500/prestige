/* Texte lisible d'un fichier binaire (export .xls), comme « strings -a » puis « strings -a -el » : suites d'au moins
 * 4 caracteres imprimables, en octets simples puis en UTF-16 petit-boutiste. Sans dependance au poste (la commande
 * strings n'existe pas sous Windows). */
const fs = require('fs');

function chaines(fichier) {
  const b = fs.readFileSync(fichier);
  const imprimable = (c) => c === 9 || (c >= 32 && c < 127);
  const sortie = [];
  let cur = '';
  for (let i = 0; i < b.length; i++) {
    if (imprimable(b[i])) { cur += String.fromCharCode(b[i]); } else { if (cur.length >= 4) { sortie.push(cur); } cur = ''; }
  }
  if (cur.length >= 4) { sortie.push(cur); }
  cur = '';
  for (let i = 0; i + 1 < b.length; i += 2) {
    if (b[i + 1] === 0 && imprimable(b[i])) { cur += String.fromCharCode(b[i]); } else { if (cur.length >= 4) { sortie.push(cur); } cur = ''; }
  }
  if (cur.length >= 4) { sortie.push(cur); }
  return sortie.join('\n');
}

module.exports = { chaines };
