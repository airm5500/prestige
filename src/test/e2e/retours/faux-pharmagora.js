/* Faux service DS Pharmagora pour les tests (le vrai site n'est pas joignable depuis le banc).
 * Sert les deux pages d'exemple fournies (DOLIPRANE 500, cbCprod=506504, rubriques 1 et 3) et un second produit fictif
 * (cbCprod=900001, classe « Antivitamines K ») pour declencher l'interaction paracetamol / AVK.
 *   UV_parCode.php3?Chercher=<cip>  : CIP_A -> lien qUV (presentation), CIP_B -> lien qPX direct, autre -> rien
 *   qUV.php3?cbCuvSemp=506504001I   : lien qPX du produit 506504
 *   qPX.php3?cbCprod=..&curRub=..    : fiche (latin-1) ; les autres rubriques reprennent la rubrique 1
 * etat.panne = true : toutes les reponses en 503. etat.appels compte les requetes recues.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const DOSSIER = path.join(__dirname, '../../resources/monographie');

function demarrer(cipA, cipB) {
  const etat = { panne: false, appels: 0, port: 0 };
  const lire = (f) => fs.readFileSync(path.join(DOSSIER, f));
  const page = (corps) => Buffer.from('<html><body>' + corps + '</body></html>', 'latin1');
  const serveur = http.createServer((req, rep) => {
    etat.appels++;
    const u = new URL(req.url, 'http://x');
    const fin = (code, buf) => { rep.writeHead(code, { 'Content-Type': 'text/html; charset=iso-8859-1' }); rep.end(buf); };
    if (etat.panne) return fin(503, page('indisponible'));
    const n = path.basename(u.pathname);
    if (n === 'UV_parCode.php3') {
      const c = u.searchParams.get('Chercher');
      if (c === cipA) return fin(200, page('<a href="qUV.php3?cbCuvSemp=506504001I">DOLIPRANE 500mg Cpr B/16</a>'));
      if (c === cipB) return fin(200, page('<a href="qPX.php3?cbCprod=900001&curRub=6">PREVISCAN ESSAI</a>'));
      return fin(200, page('Aucun résultat'));
    }
    if (n === 'qUV.php3') return fin(200, page('<a href="qPX.php3?cbCprod=506504&curRub=6">Monographie</a>'));
    if (n === 'qPX.php3') {
      const prod = u.searchParams.get('cbCprod'), rub = u.searchParams.get('curRub');
      let html = lire(rub === '3' ? 'qPX_506504_3.html' : 'qPX_506504_1.html').toString('latin1');
      if (prod === '900001') {
        html = html.split('DOLIPRANE 500 mg cp').join('PREVISCAN ESSAI').split('DOLIPRANE 500mg Cpr').join('PREVISCAN ESSAI').split('cbCprod=506504').join('cbCprod=900001')
          .split('Parac?tamol').join('Antivitamines K').split('Paracétamol').join('Antivitamines K');
      } else if (prod !== '506504') {
        return fin(404, page('inconnu'));
      }
      return fin(200, Buffer.from(html, 'latin1'));
    }
    fin(404, page('inconnu'));
  });
  return new Promise((ok) => serveur.listen(0, '127.0.0.1', () => {
    etat.port = serveur.address().port;
    etat.fermer = () => new Promise((f) => serveur.close(f));
    ok(etat);
  }));
}
module.exports = { demarrer };
