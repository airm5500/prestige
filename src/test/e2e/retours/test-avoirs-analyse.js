/* LISTE DES AVOIRS — ONGLET ANALYSE (retours du 13/10, point 10). Par l'ecran « Liste des avoirs », admin.
 * Jeu d'essai le 17/09/2026 (jour de ventes du banc, sans avoir) : 3 ventes clonees d'une vente du jour :
 *  - V1 avoir EN COURS : produit A, 2 unites dues a 1 000 F ;
 *  - V2 avoir CLOTURE 48 h apres la vente : produit A, 1 unite a 1 000 F ;
 *  - V3 avoir CLOTURE 24 h apres la vente : produit B, 4 unites a 2 000 F.
 * Attendu : 3 avoirs, 1 en cours (2 000 F dus), 2 clotures (taux 66,7 %), delai moyen 1,5 j, valeur 11 000 F, produit A
 * en tete (2 fois), anciennete de l'avoir en cours dans sa tranche. Ecran : onglets restyles (pastilles), onglet Analyse,
 * tuiles et tableaux ; impression, export et inventaire grises sur l'analyse ; les listes restent inchangees.
 * Ventes d'essai retirees (les lignes restent « is_Process » : les statistiques des produits ne sont pas touchees).
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const JOUR = '2026-09-17';
const V = ['E2E-AVA-V1', 'E2E-AVA-V2', 'E2E-AVA-V3'];
const retirer = () => exec(`DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN ('${V.join("','")}'); DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('${V.join("','")}');`);
const SOURCE = q(`SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE dt_UPDATED >= '${JOUR}' AND dt_UPDATED < '${JOUR}' + INTERVAL 1 DAY AND str_STATUT = 'is_Closed' AND b_IS_CANCEL = 0 AND int_PRICE > 0 ORDER BY dt_UPDATED LIMIT 1`);
const DETAIL = q(`SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${SOURCE}' LIMIT 1`);
const [A, B] = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' AND lg_GROSSISTE_ID IS NOT NULL ORDER BY lg_FAMILLE_ID LIMIT 2").split('\n');

function poser() {
  retirer();
  const vente = (id, heure, ouvert, cloture) => `CREATE TEMPORARY TABLE tp AS SELECT * FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${SOURCE}';`
    + `UPDATE tp SET lg_PREENREGISTREMENT_ID = '${id}', str_REF = '${id.slice(-6)}', str_REF_TICKET = '${id.slice(-6)}', dt_UPDATED = '${JOUR} ${heure}', dt_CREATED = '${JOUR} ${heure}',`
    + ` b_IS_AVOIR = ${ouvert ? 1 : 0}, b_HAS_AVOIR = ${ouvert ? 0 : 1}, dt_CLOTURE_AVOIR = ${cloture ? `'${JOUR} ${heure}' + INTERVAL ${cloture} HOUR` : 'NULL'}, b_IS_CANCEL = 0;`
    + `INSERT INTO t_preenregistrement SELECT * FROM tp; DROP TEMPORARY TABLE tp;`;
  const ligne = (id, produit, qte, servie, pu, ouvert, initial) => `CREATE TEMPORARY TABLE td AS SELECT * FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_DETAIL_ID = '${DETAIL}';`
    + `UPDATE td SET lg_PREENREGISTREMENT_DETAIL_ID = '${id}-D', lg_PREENREGISTREMENT_ID = '${id}', lg_FAMILLE_ID = '${produit}', int_QUANTITY = ${qte}, int_QUANTITY_SERVED = ${servie},`
    + ` int_PRICE_UNITAIR = ${pu}, int_PRICE = ${pu * qte}, int_AVOIR = ${ouvert ? qte - servie : 0}, int_AVOIR_SERVED = ${servie}, int_AVOIR_INITIAL = ${initial}, str_STATUT = 'is_Process';`
    + `INSERT INTO t_preenregistrement_detail SELECT * FROM td; DROP TEMPORARY TABLE td;`
    + (ouvert ? `UPDATE t_preenregistrement_detail SET b_IS_AVOIR = 1 WHERE lg_PREENREGISTREMENT_DETAIL_ID = '${id}-D';` : '');
  exec(vente(V[0], '10:00:00', true, 0) + ligne(V[0], A, 3, 1, 1000, true, 0)
    + vente(V[1], '11:00:00', false, 48) + ligne(V[1], A, 1, 1, 1000, false, 1)
    + vente(V[2], '12:00:00', false, 24) + ligne(V[2], B, 4, 4, 2000, false, 4));
}

(async () => {
  ok('Précondition : un jour de ventes sans avoir, une vente à cloner, deux produits', !!SOURCE && !!DETAIL && !!A && !!B
    && q(`SELECT COUNT(*) FROM t_preenregistrement WHERE dt_UPDATED >= '${JOUR}' AND dt_UPDATED < '${JOUR}' + INTERVAL 1 DAY AND (b_IS_AVOIR = 1 OR b_HAS_AVOIR = 1) AND lg_PREENREGISTREMENT_ID NOT LIKE 'E2E-AVA-%'`) === '0', SOURCE);
  poser();
  const ventes = Number(q(`SELECT COUNT(*) FROM t_preenregistrement WHERE dt_UPDATED >= '${JOUR}' AND dt_UPDATED < '${JOUR}' + INTERVAL 1 DAY AND str_STATUT = 'is_Closed' AND b_IS_CANCEL = 0 AND int_PRICE > 0`));
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const err = [];
  try {
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);

    /* API */
    const api = await p.evaluate(async (j) => (await fetch('../api/v1/ventestats/avoirs/analyse?dtStart=' + j + '&dtEnd=' + j)).json(), JOUR);
    const t = api.total || {};
    ok('Analyse : 3 avoirs, 1 en cours, 2 clôturés, taux de clôture 66,7 %', t.avoirs === 3 && t.enCours === 1 && t.clotures === 2 && t.tauxCloture === 66.7, JSON.stringify(t));
    ok('Part des ventes avec avoir sur les ventes du jour', t.ventes === ventes && t.partVentes === Math.round(3 * 1000 / ventes) / 10, t.ventes + ' / ' + ventes + ' ' + t.partVentes);
    ok('Délai moyen de clôture : 1,5 jour', t.delaiMoyenJours === 1.5, t.delaiMoyenJours);
    ok('Quantités et valeurs : 7 unités, 11 000 F, dont 2 000 F encore dus', t.quantite === 7 && t.valeur === 11000 && t.valeurEnCours === 2000, JSON.stringify(t));
    ok('Produit le plus souvent en avoir : A (2 fois, 3 unités, 2 encore dues)', api.produits[0] && api.produits[0].fois === 2 && api.produits[0].quantite === 3 && api.produits[0].enCours === 2,
      JSON.stringify(api.produits[0]));
    const jours = Number(q(`SELECT DATEDIFF(NOW(), '${JOUR} 10:00:00')`));
    const attendue = jours <= 2 ? '0 à 2 jours' : jours <= 7 ? '3 à 7 jours' : jours <= 30 ? '8 à 30 jours' : 'plus de 30 jours';
    ok('Ancienneté : l\'avoir en cours dans sa tranche (' + jours + ' jours), 2 000 F dus', api.anciennete.find((x) => x.tranche === attendue).avoirs === 1
      && api.anciennete.find((x) => x.tranche === attendue).valeur === 2000 && api.anciennete.reduce((s, x) => s + x.avoirs, 0) === 1, JSON.stringify(api.anciennete));
    ok('Grossistes : la somme des lignes = 3', api.grossistes.reduce((s, g) => s + g.fois, 0) === 3, JSON.stringify(api.grossistes));
    const inv = await p.evaluate(async () => (await fetch('../api/v1/ventestats/avoirs/analyse?dtStart=2026-09-18&dtEnd=2026-09-17')).json());
    ok('Période à l\'envers : refus clair', inv.success === false && /précéder/.test(inv.msg), inv.msg);

    /* ecran */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('venteavoirmanager', 'Liste des avoirs', ''));
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('venteavoirmanager')[0]; return e && e.down('#tabAnalyse'); }, null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    await p.evaluate((j) => { const e = Ext.ComponentQuery.query('venteavoirmanager')[0], d = Ext.Date.parse(j, 'Y-m-d'); e.down('#dtStart').setValue(d); e.down('#dtEnd').setValue(d); }, JOUR);
    const onglets = await p.evaluate(() => { const tp = Ext.ComponentQuery.query('venteavoirmanager #avoirTabs')[0];
      return { titres: tp.items.getRange().map((c) => c.tab.getEl().dom.innerText.trim()), restyle: tp.hasCls('avoir-onglets'),
        rayon: getComputedStyle(tp.items.getAt(2).tab.getEl().dom).borderTopLeftRadius }; });
    ok('Trois onglets restylés : Avoir en cours, Avoir clôturé, Analyse', onglets.restyle && onglets.titres.length === 3 && /Analyse/.test(onglets.titres[2]) && parseFloat(onglets.rayon) >= 10, JSON.stringify(onglets));
    await p.evaluate(() => { const tp = Ext.ComponentQuery.query('venteavoirmanager #avoirTabs')[0]; tp.setActiveTab(tp.down('#tabAnalyse')); });
    await p.waitForFunction(() => !!Ext.ComponentQuery.query('venteavoirmanager')[0].analyseAvoirs, null, { timeout: 30000 });
    const ecran = await p.evaluate(() => { const e = Ext.ComponentQuery.query('venteavoirmanager')[0], d = e.down('#avAnalyseContenu').getEl().dom;
      return { texte: d.innerText.replace(/\s+/g, ' '), produits: d.querySelectorAll('tr.av-produit').length, tuiles: d.querySelectorAll('.pml-tuile').length,
        gris: ['#printPdf', '#exporterExcel', '#creerInventaire'].map((s) => e.down(s).isDisabled()) }; });
    ok('Onglet Analyse : 4 tuiles (avoirs, en cours, taux, délai) et les tableaux', ecran.tuiles === 4 && /Taux de clôture/.test(ecran.texte) && /66,7 %/.test(ecran.texte) && /1,5 j/.test(ecran.texte)
      && /Produits le plus souvent en avoir/.test(ecran.texte) && /Ancienneté/.test(ecran.texte) && /Grossiste habituel/.test(ecran.texte) && ecran.produits === 2, ecran.texte.slice(0, 300));
    ok('Sur l\'analyse : impression, export et inventaire grisés', ecran.gris.every((x) => x), JSON.stringify(ecran.gris));
    /* retour a la liste : les listes restent inchangees */
    await p.evaluate(() => { const tp = Ext.ComponentQuery.query('venteavoirmanager #avoirTabs')[0]; tp.setActiveTab(tp.down('#tabEnCours')); });
    await p.waitForFunction(() => !Ext.ComponentQuery.query('venteavoirmanager #gridEnCours')[0].getStore().isLoading(), null, { timeout: 30000 });
    await p.waitForTimeout(800);
    const liste = await p.evaluate(() => { const e = Ext.ComponentQuery.query('venteavoirmanager')[0], s = e.down('#gridEnCours').getStore();
      return { ids: s.collect('lgPREENREGISTREMENTID'), actifs: ['#printPdf', '#exporterExcel', '#creerInventaire'].map((x) => !e.down(x).isDisabled()) }; });
    ok('Liste « Avoir en cours » : l\'avoir ouvert, boutons de nouveau actifs', liste.ids.includes(V[0]) && !liste.ids.includes(V[1]) && liste.actifs.every((x) => x), JSON.stringify(liste));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulé sans erreur', false, x.message);
  } finally {
    await b.close();
    retirer();
    ok('Ventes d\'essai retirées', q(`SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'E2E-AVA-%'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
