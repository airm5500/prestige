/* ANALYSE DE FREQUENTATION HORAIRE (besoins du 11/10, point 12), sur les ventes du banc en septembre 2026 :
 *  - API REST (plus de JSP pour l'analyse) : totaux identiques au calcul SQL direct ; plages habituelles (10),
 *    toutes les heures (24), toutes les 3 heures (8) ; parts du CA et des ventes qui font 100 % ;
 *  - ecran : choix de la tranche, tableau par tranche avec total, courbes dont l'infobulle donne « % du CA » ;
 *  - ecran ajoute a correctifs-affichage.js ; refus clair d'une periode a l'envers.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8' }).trim();
const LOGIN = process.env.E2E_LOGIN || 'admin';
const DEBUT = '2026-09-01', FIN = '2026-09-30';
const [CA, NB, MONTANT_10H] = q(`SELECT SUM(int_PRICE), COUNT(*), SUM(IF(HOUR(dt_CREATED) = 10, int_PRICE, 0)) FROM t_preenregistrement
  WHERE dt_CREATED >= '${DEBUT}' AND dt_CREATED < '2026-10-01' AND int_PRICE > 0 AND b_IS_CANCEL = 0 AND str_STATUT = 'is_Closed'`).split('\t').map(Number);

(async () => {
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const p = await (await b.newContext({ viewport: { width: 1500, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const api = (t, d = DEBUT, f = FIN) => p.evaluate(async ([t, d, f]) => (await fetch(`../api/v1/frequentation-horaire?debut=${d}&fin=${f}&tranche=${t}`)).json(), [t, d, f]);
  const somme = (l, c) => Math.round(l.reduce((s, x) => s + x[c], 0) * 10) / 10;
  try {
    ok('Précondition : des ventes en septembre 2026 sur le banc', NB > 0, NB);
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForLoadState('networkidle').catch(() => {});
    await p.waitForTimeout(3000);
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });

    const h = await api(0);
    ok('API : totaux = calcul SQL direct (CA, ventes)', h.success && h.total.montant === CA && h.total.ventes === NB, JSON.stringify(h.total));
    ok('Plages habituelles : 10 tranches, de 00:00-06:59 à 20:00-23:59', h.data.length === 10 && h.data[0].tranche === '00:00-06:59' && h.data[9].tranche === '20:00-23:59');
    ok('Parts du CA et des ventes : 100 %', Math.abs(somme(h.data, 'partCa') - 100) <= 0.5 && Math.abs(somme(h.data, 'partVentes') - 100) <= 0.5, somme(h.data, 'partCa'));
    const h1 = await api(1);
    ok('Toutes les heures : 24 tranches, 10 h = calcul SQL', h1.data.length === 24 && h1.data[10].montant === MONTANT_10H, h1.data[10] && h1.data[10].montant);
    const h3 = await api(3);
    ok('Toutes les 3 heures : 8 tranches, mêmes totaux', h3.data.length === 8 && h3.data.reduce((s, x) => s + x.montant, 0) === CA);
    const inv = await api(0, FIN, DEBUT);
    ok('Période à l\'envers : refus clair', !inv.success && /après/.test(inv.msg), inv.msg);

    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('analyseFrequentationOffManager', 'Fréquentation horaire', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('analyseFrequentationOffManager').length > 0, null, { timeout: 30000 });
    await p.evaluate(([d, f]) => { const v = Ext.ComponentQuery.query('analyseFrequentationOffManager')[0];
      v.down('#debut').setValue(Ext.Date.parse(d, 'Y-m-d')); v.down('#fin').setValue(Ext.Date.parse(f, 'Y-m-d')); v.charger(); }, [DEBUT, FIN]);
    await p.waitForFunction(() => Ext.ComponentQuery.query('analyseFrequentationOffManager')[0].donnees.getCount() === 10, null, { timeout: 15000 });
    ok('Écran : 10 tranches par défaut (plages habituelles)', true);
    const total = await p.evaluate(() => Ext.ComponentQuery.query('analyseFrequentationOffManager #grilleFrequentation')[0].getEl().dom.innerText);
    ok('Écran : ligne Total et colonne « % du CA »', /Total/i.test(total) && /% du CA/i.test(total), total.slice(0, 300));
    await p.evaluate(() => { const v = Ext.ComponentQuery.query('analyseFrequentationOffManager')[0]; const c = v.down('#tranche'); c.setValue(1); c.fireEvent('select', c); });
    await p.waitForFunction(() => Ext.ComponentQuery.query('analyseFrequentationOffManager')[0].donnees.getCount() === 24, null, { timeout: 15000 });
    ok('Écran : tranche « Toutes les heures » → 24 lignes', true);
    ok('Impression (plages habituelles) désactivée hors plages habituelles', await p.evaluate(() => Ext.ComponentQuery.query('analyseFrequentationOffManager #imprimer')[0].isDisabled()));
    const bulle = await p.evaluate(() => { const v = Ext.ComponentQuery.query('analyseFrequentationOffManager')[0];
      const s = v.down('#courbeFrequentation').series.get(1); const r = v.donnees.getAt(10); const t = { setTitle: function (x) { this.t = x; } };
      s.tips.renderer.call(t, r); return t.t; });
    ok('Infobulle d\'un pic : part de la tranche dans le CA', /% du CA/.test(bulle) && /ventes/.test(bulle), bulle);
    ok('Écran ajouté à correctifs-affichage.js', await p.evaluate(() => window.PrestigeAffichage.ECRANS_COLLES.includes('analyseFrequentationOffManager')
      && window.PrestigeAffichage.ECRANS_STYLE_VENTE.includes('analyseFrequentationOffManager')));
    ok('Aucune erreur de page', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('deroulement', false, e.stack);
  } finally {
    await b.close();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' verifications');
    process.exit(ko ? 1 : 0);
  }
})();
