/* PLAN DU 21/11, POINT 6 : colonne « Adresse » affichee dans GESTION DES TIERS-PAYANTS > Clients, juste apres
 * « Téléphone ». Rapprochement ecran / base, ligne par ligne, sur des adresses variees :
 *  - adresse courte, adresse longue (coupee proprement, entiere au survol), adresse vide, accents et apostrophe,
 *    texte qui ressemble a du HTML (affiche tel quel, jamais interprete) ;
 *  - ordre des colonnes : ... Téléphone, Adresse ... ; colonne visible en 1366x768 et 1280x720 sans ascenseur
 *    horizontal ;
 *  - aucune erreur JavaScript. Clients d'essai crees par « Créer client standard », retires a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const { gestes } = require('./outils-clients');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--raw', '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8' }).replace(/\r\n/g, '\n').trim();
const MARQUE = 'E2EADRCOL';
const CLIENTS = [
  ['Court', '0799312111', 'Cocody'],
  ['Long', '0799312112', 'Riviera Palmeraie, lot 1234, villa 56, Rond-point'],
  ['Vide', '0799312113', ''],
  ['Accents', '0799312114', "Yopougon Sicogi, près de l'église Saint-André"],
  ['Balise', '0799312115', '<b>Plateau</b> & <i>Treichville</i>'],
];
const retirerBase = () => {
  const ids = q(`SELECT GROUP_CONCAT(CONCAT("'", lg_CLIENT_ID, "'")) FROM t_client WHERE str_FIRST_NAME LIKE '${MARQUE}%'`);
  if (!ids || ids === 'NULL') { return; }
  q(`DELETE FROM t_compte_client WHERE lg_CLIENT_ID IN (${ids}); DELETE FROM t_client WHERE lg_CLIENT_ID IN (${ids});`);
};

(async () => {
  retirerBase();
  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  let g = null;
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
    const p = await ctx.newPage();
    p.setDefaultTimeout(60000);
    p.on('pageerror', (e) => err.push(e.message));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    g = gestes(p, { ORGANISME: 'AMAT-CI', MARQUE, PREFIXE: MARQUE });
    await g.ouvrirClients();
    /* clients d'essai par « Créer client standard » */
    const id = (item) => p.evaluate((i) => Ext.ComponentQuery.query('addclientstandard #' + i)[0].inputEl.id, item);
    for (const [prenom, tel] of CLIENTS) {
      await p.evaluate(() => Ext.ComponentQuery.query('clientgestion button').find((x) => /client standard/i.test(x.text || '')).btnEl.dom.click());
      await p.waitForFunction(() => Ext.ComponentQuery.query('addclientstandard').some((w) => w.isVisible()), null, { timeout: 10000 });
      await p.waitForTimeout(300);
      await p.fill('#' + await id('nom'), MARQUE); await p.fill('#' + await id('prenoms'), prenom); await p.fill('#' + await id('telephone'), tel);
      const r = p.waitForResponse((x) => /create-standard$/.test(x.url()));
      await p.evaluate(() => Ext.ComponentQuery.query('addclientstandard #enregistrer')[0].btnEl.dom.click());
      await r; await p.waitForTimeout(600);
      await p.evaluate(() => { Ext.ComponentQuery.query('addclientstandard').forEach((w) => w.isVisible() && w.close()); while (Ext.MessageBox.isVisible()) { Ext.MessageBox.hide(); } });
    }
    /* adresses posees en base (la fenetre standard n'a pas de champ adresse) */
    for (const [prenom, , adr] of CLIENTS) {
      q(`UPDATE t_client SET str_ADRESSE = ${adr ? "'" + adr.replace(/'/g, "''") + "'" : 'NULL'} WHERE str_FIRST_NAME = '${MARQUE}' AND str_LAST_NAME = '${prenom}'`);
    }
    ok('Jeu d\'essai : cinq clients créés par l\'écran', q(`SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME = '${MARQUE}'`) === '5');

    for (const [l, h] of [[1366, 768], [1280, 720]]) {
      await p.setViewportSize({ width: l, height: h });
      await p.waitForTimeout(800);
      await g.chercherClients(false);
      const t = l + 'x' + h + ' : ';
      const cols = await p.evaluate(() => Ext.ComponentQuery.query('clientgestion')[0].query('gridcolumn').filter((c) => c.isVisible() && c.dataIndex)
        .map((c) => c.dataIndex));
      const iTel = cols.indexOf('str_TELEPHONE'), iAdr = cols.indexOf('str_ADRESSE');
      ok(t + 'colonne Adresse visible, juste après Téléphone', iAdr > 0 && iAdr === iTel + 1, cols.join(','));
      const lignes = await p.evaluate((m) => {
        const grille = Ext.ComponentQuery.query('clientgestion')[0], vue = grille.getView(), col = grille.down('gridcolumn[dataIndex=str_ADRESSE]');
        return grille.getStore().getRange().filter((r) => (r.get('str_FIRST_LAST_NAME') || '').indexOf(m) >= 0).map((r) => {
          const cell = col ? vue.getCell(r, col) : null, td = cell ? cell.dom : null, inner = td ? td.querySelector('.x-grid-cell-inner') : null;
          return { prenom: r.get('str_LAST_NAME'), texte: inner ? inner.textContent : null, gras: inner ? inner.querySelectorAll('b,i').length : -1,
            bulle: td ? (td.getAttribute('data-qtip') || (inner && inner.getAttribute('data-qtip')) || '') : '',
            coupe: inner ? inner.scrollWidth > inner.clientWidth + 1 : false };
        });
      }, MARQUE);
      const base = {};
      q(`SELECT CONCAT(str_LAST_NAME, '\t', IFNULL(str_ADRESSE, '')) FROM t_client WHERE str_FIRST_NAME = '${MARQUE}'`).split('\n').forEach((x) => { const [a, c] = x.split('\t'); base[a.toUpperCase()] = c || ''; });
      ok(t + 'cinq lignes à l\'écran', lignes.length === 5, lignes.length);
      for (const li of lignes) {
        const attendu = base[String(li.prenom).toUpperCase()];
        ok(t + li.prenom + ' : adresse écran = base, affichée telle quelle', li.texte !== null && li.texte.trim() === attendu && li.gras === 0, JSON.stringify({ ecran: li.texte, base: attendu }));
        if (/long/i.test(li.prenom)) {
          const bulle = li.bulle.replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'");
          ok(t + 'adresse longue : entière au survol', bulle.indexOf(attendu.slice(0, 40)) >= 0, JSON.stringify(li));
        }
      }
      const defile = await p.evaluate(() => { const v = Ext.ComponentQuery.query('clientgestion')[0].getView().getEl().dom; return v.scrollWidth > v.clientWidth + 1; });
      ok(t + 'pas d\'ascenseur horizontal dans la liste', !defile);
    }
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
    const reste = await g.nettoyerClients();
    ok('Clients d\'essai supprimés par l\'écran', reste === 0, reste);
  } catch (x) {
    ok('Déroulé sans erreur', false, x.stack || x.message);
  } finally {
    await b.close();
    retirerBase();
    ok('Aucun client d\'essai en base', q(`SELECT COUNT(*) FROM t_client WHERE str_FIRST_NAME LIKE '${MARQUE}%'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
