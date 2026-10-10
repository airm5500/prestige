/* Dossier ou le serveur ecrit les editions PDF (« /data/reports/pdf/<fichier> » dans les reponses).
 * Il vient de la configuration de l'officine (scr_report_pdf) et change d'un poste a l'autre : REPORTS_PDF s'il est
 * donne, sinon le premier dossier connu qui contient le fichier. */
const fs = require('fs');
const path = require('path');

/* Linux (banc), puis Windows (postes des officines : C:, D: ou F:\CONF\LABOREX\REPORTS, sous-dossier pdf ou non) */
const DOSSIERS = ['/opt/CONF/LABOREX/REPORTS/pdf', '/opt/CONF/LABOREX/REPORTS', '/opt/CONF/reports/pdf']
  .concat(...['C', 'D', 'F'].map((l) => [l + ':\\CONF\\LABOREX\\REPORTS\\pdf', l + ':\\CONF\\LABOREX\\REPORTS']));

/** Chemin du fichier designe par l'URL (ou le nom) d'une edition ; le premier candidat s'il n'existe nulle part. */
function fichierEdition(url) {
  const nom = String(url || '').split('/').pop();
  const dossiers = process.env.REPORTS_PDF ? [process.env.REPORTS_PDF] : DOSSIERS;
  const trouve = dossiers.map((d) => path.join(d, nom)).find((f) => nom && fs.existsSync(f));
  return trouve || path.join(dossiers[0], nom);
}

/** Dossier des editions (celui qui existe), pour les tests qui y cherchent un fichier. */
function dossierEditions() {
  if (process.env.REPORTS_PDF) {
    return process.env.REPORTS_PDF;
  }
  return DOSSIERS.find((d) => fs.existsSync(d) && fs.readdirSync(d).length > 0) || DOSSIERS[0];
}

module.exports = { fichierEdition, dossierEditions };
