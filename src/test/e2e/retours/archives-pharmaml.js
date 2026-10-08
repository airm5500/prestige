/* Retours du 08/10 (5) : archives PharmaML rangees par type et par mois (commandes/AAAA-MM, vidages/AAAA-MM,
 * infoproduit/AAAA-MM) et journal (log/AAAA-MM). Aide commune des tests : liste recursive et nettoyage. */
const fs = require('fs');
const path = require('path');
const DOSSIER = '/root/prestige/pharmaml';

/** Chemins relatifs de tous les fichiers sous le dossier PharmaML (ex. commandes/2026-10/C_x.xml). */
function fichiers(dossier = DOSSIER, base = '') {
  if (!fs.existsSync(dossier)) { return []; }
  return fs.readdirSync(dossier, { withFileTypes: true }).flatMap((e) => (e.isDirectory()
    ? fichiers(path.join(dossier, e.name), base + e.name + '/') : [base + e.name]));
}
/** Retire les archives (pas le journal) dont le nom correspond. */
function retirer(motif) {
  fichiers().filter((f) => !/^log\//.test(f) && motif.test(path.basename(f))).forEach((f) => fs.unlinkSync(path.join(DOSSIER, f)));
}
module.exports = { DOSSIER, fichiers, retirer };
