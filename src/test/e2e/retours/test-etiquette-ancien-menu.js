/* ANCIEN MENU « GESTION ETIQUETTE » : OUVERTURE LENTE (retours du 25/10, point 9).
 *
 * Cause : sans dates saisies, la liste parcourait toutes les etiquettes depuis 1970, avec un filtre texte vide
 * applique sur 5 colonnes. Par les vues (admin), GESTION DU STOCK > Gestion étiquette :
 *  - a l'ouverture, la periode affichee est celle des 7 derniers jours (date de debut = il y a 7 jours, date de fin =
 *    aujourd'hui), et la liste ne contient que les etiquettes de cette periode (meme nombre qu'en base) ;
 *  - la recherche « contient » marche toujours, et la recherche vide garde la periode ;
 *  - dates videes : toute la liste, comme avant ;
 *  - l'ecran est declare dans correctifs-affichage.js (ecrans colles et au style des ecrans de vente) ;
 *  - mesure du chargement a l'ouverture (journalisee pour le rapport des lenteurs) ;
 *  - aucune erreur JavaScript, aucune fenetre du navigateur. Rien n'est ecrit en base.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const COMPTE = "SELECT COUNT(*) FROM t_etiquette WHERE str_STATUT IN ('enable', 'Read') AND lg_EMPLACEMENT_ID LIKE '%'";
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

(async () => {
  const auj = new Date(), il7 = new Date(Date.now() - 7 * 86400000);
  const attendu7 = q(COMPTE + " AND dt_CREATED BETWEEN '" + iso(il7) + " 00:00:00' AND '" + iso(auj) + " 23:59:59'");
  const tout = q(COMPTE);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = [], dialogues = [], appels = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  p.on('requestfinished', async (r) => { if (/\/api\/v1\/etiquette\?/.test(r.url())) { const t = r.timing(); appels.push({ url: r.url(), ms: Math.round(t.responseEnd) }); } });
  const total = () => p.waitForFunction(() => { const g = Ext.ComponentQuery.query('etiquette')[0]; return g && !g.getStore().isLoading() && g.getStore().lastOptions; }, null, { timeout: 60000 })
    .then(() => p.evaluate(() => String(Ext.ComponentQuery.query('etiquette')[0].getStore().getTotalCount())));
  try {
    await connexion(p, 'admin', 'e2etest');
    const t0 = Date.now();
    await ouvrirMenu(p, 'GESTION DU STOCK', 'Gestion étiquette');
    let n = await total();
    const ouverture = Date.now() - t0;
    const dates = await p.evaluate(() => [Ext.getCmp('datedebut').getSubmitValue(), Ext.getCmp('datefin').getSubmitValue()].join('|'));
    ok('À l\'ouverture : période des 7 derniers jours affichée', dates === iso(il7) + '|' + iso(auj), dates);
    ok('À l\'ouverture : seulement les étiquettes des 7 derniers jours (' + attendu7 + ' en base)', n === attendu7 && appels.length > 0 && /datedebut=\d{4}-\d\d-\d\d/.test(appels[0].url), n + ' / ' + (appels[0] || {}).url);
    console.log('MESURE  ouverture du menu jusqu\'à la liste affichée : ' + ouverture + ' ms ; requête liste : ' + (appels[0] || {}).ms + ' ms (' + n + ' étiquettes sur ' + tout + ')');

    const nom = q("SELECT f.str_DESCRIPTION FROM t_etiquette e JOIN t_famille f ON f.lg_FAMILLE_ID = e.lg_FAMILLE_ID WHERE e.str_STATUT IN ('enable', 'Read') AND e.dt_CREATED >= '" + iso(il7) + "' ORDER BY e.dt_CREATED DESC LIMIT 1");
    if (nom) {
      const mot = nom.length > 6 ? nom.substring(2, 6) : nom;
      await p.evaluate((m) => { Ext.getCmp('rechecher').setValue(m); Ext.ComponentQuery.query('etiquette')[0].onRechClick(); }, mot);
      n = await total();
      const enBase = q(COMPTE.replace('COUNT(*) FROM t_etiquette', "COUNT(*) FROM t_etiquette t JOIN t_famille f ON f.lg_FAMILLE_ID = t.lg_FAMILLE_ID").replace(/str_STATUT/, 't.str_STATUT').replace(/lg_EMPLACEMENT_ID/, 't.lg_EMPLACEMENT_ID')
        + " AND t.dt_CREATED BETWEEN '" + iso(il7) + " 00:00:00' AND '" + iso(auj) + " 23:59:59' AND (t.str_NAME LIKE '%" + mot.replace(/'/g, "''") + "%' OR t.str_CODE LIKE '%" + mot.replace(/'/g, "''") + "%' OR f.int_CIP LIKE '%" + mot.replace(/'/g, "''") + "%' OR f.str_DESCRIPTION LIKE '%" + mot.replace(/'/g, "''") + "%' OR f.int_EAN13 LIKE '%" + mot.replace(/'/g, "''") + "%')");
      ok('Recherche « contient » (« ' + mot + ' ») dans la période', Number(n) > 0 && n === enBase, n + ' / ' + enBase);
    }
    await p.evaluate(() => { Ext.getCmp('rechecher').setValue(''); Ext.ComponentQuery.query('etiquette')[0].onRechClick(); });
    n = await total();
    ok('Recherche vide : la période reste appliquée', n === attendu7, n);
    await p.evaluate(() => { Ext.getCmp('datedebut').setValue(null); Ext.getCmp('datefin').setValue(null); Ext.ComponentQuery.query('etiquette')[0].onRechClick(); });
    n = await total();
    ok('Dates vidées : toute la liste, comme avant (' + tout + ')', n === tout, n);
    const declare = await p.evaluate(() => PrestigeAffichage.ECRANS_COLLES.includes('etiquette') && PrestigeAffichage.ECRANS_STYLE_VENTE.includes('etiquette'));
    ok('Écran déclaré dans correctifs-affichage.js', declare);
    ok('Aucune erreur JavaScript, aucune fenêtre du navigateur', erreurs.length === 0 && dialogues.length === 0, erreurs.concat(dialogues).join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
