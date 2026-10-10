/* FICHE ARTICLE : VENTES MOYENNES 90 JOURS (retours du 10/10, Q1) — lecture seule.
 * Aperçu (double clic) d'un article vendu ces 90 derniers jours : « Moy. 90 j : x/j · y/sem · z/mois » entre le nom + CIP
 * et la légende Sorties / Achats ; valeurs = total des ventes des 90 derniers jours (requête indépendante) ÷ 90, × 7 ÷ 90, ÷ 3.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', process.env.DB_TEST || 'capitale', '-sN', '-e', s], { encoding: 'utf8' }).trim();
const PERIMETRE = " FROM t_preenregistrement p JOIN t_preenregistrement_detail d ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
  + " WHERE p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5' AND d.int_QUANTITY > 0 AND p.str_STATUT = 'is_Closed'"
  + " AND p.dt_UPDATED >= CURDATE() - INTERVAL 89 DAY";
const [P, CIP, TOTAL] = q("SELECT d.lg_FAMILLE_ID, f.int_CIP, SUM(d.int_QUANTITY)" + PERIMETRE.replace(' WHERE ', ' JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID AND f.str_STATUT = \'enable\' WHERE ')
  + " AND f.int_CIP IS NOT NULL AND f.int_CIP <> '' GROUP BY d.lg_FAMILLE_ID, f.int_CIP HAVING SUM(d.int_QUANTITY) BETWEEN 5 AND 500 ORDER BY SUM(d.int_QUANTITY) DESC LIMIT 1").split('\t');
const fr = (v) => String(v).replace('.', ',');

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    ok('Précondition : un article vendu ces 90 jours (' + TOTAL + ' unités)', P && Number(TOTAL) > 0, CIP);
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('famillemanager', 'Fiche Article', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('famillemanager').length > 0, null, { timeout: 30000 });
    await p.evaluate((cip) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.fmField('rechecher').setValue(cip); g.onRechClick(); }, CIP);
    await p.waitForFunction((P) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; return !g.getStore().isLoading() && g.getStore().findExact('lg_FAMILLE_ID', P) >= 0; }, P, { timeout: 30000 });
    await p.waitForTimeout(500);
    await p.evaluate((P) => { const g = Ext.ComponentQuery.query('famillemanager')[0]; g.getView().getNode(g.getStore().findExact('lg_FAMILLE_ID', P)).setAttribute('data-e2e', 'ligne'); }, P);
    await p.locator('[data-e2e=ligne] td').filter({ visible: true }).nth(2).dblclick({ timeout: 60000 });
    await p.waitForFunction(() => { const b = Ext.getCmp('apercu_fiche_article'); return b.isVisible() && b.getEl().dom.querySelector('.vp-ap-moyennes'); }, null, { timeout: 30000 });
    const a = await p.evaluate(() => { const d = Ext.getCmp('apercu_fiche_article').getEl().dom, t = d.querySelector('.vp-ap-tete');
      const enfants = [...t.children].map((x) => x.className);
      return { texte: d.querySelector('.vp-ap-moyennes').textContent, ordre: enfants }; });
    const t = Number(TOTAL), j = Math.round(t / 90 * 100) / 100, s = Math.round(t * 7 / 90 * 10) / 10, m = Math.round(t / 3 * 10) / 10;
    ok('Moyennes = ventes des 90 derniers jours ÷ 90 / × 7 ÷ 90 / ÷ 3 (' + t + ' unités)', a.texte === 'Moy. 90 j : ' + fr(j) + '/j · ' + fr(s) + '/sem · ' + fr(m) + '/mois', a.texte);
    ok('Placées entre « nom + CIP » et « Sorties / Achats »', JSON.stringify(a.ordre) === JSON.stringify(['vp-ap-nom', 'vp-ap-cip', 'vp-ap-moyennes', 'vp-ap-legende']), JSON.stringify(a.ordre));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
