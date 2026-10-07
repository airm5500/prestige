/* « Evolution mensuelle des achats » par fournisseur (menu achatfourManager) : plus de 10 minutes avant la
 * reecriture de proc_statachatfournisseur (V6.9.89), qui garde les memes colonnes et les memes lignes.
 *
 * Par l'ecran : recherche sur 2024-2026, reponse en moins de 10 s ; nombre de lignes = couples (annee, grossiste)
 * ayant des bons de livraison clotures ; montants d'un mois et d'une ligne recoupes par une requete independante ;
 * filtre sur le nom ; aucune erreur JavaScript. Le test n'ecrit rien.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', process.env.DB_TEST || 'capitale', '-sN', '-e', s], { encoding: 'utf8' }).trim();
const MOIS = ['JANVIER', 'FEVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUIELLET', 'AOUT', 'SET', 'OCT', 'NOV', 'DEC'];

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('achatfourManager', 'Achats fournisseurs', ''));
    await p.waitForFunction(() => { const g = Ext.getCmp('achatfourGrid'); return g && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    const recherche = async (du, au, nom) => {
      await p.evaluate(([d, a, n]) => { Ext.getCmp('dt_start_achatfour').setValue(Ext.Date.parse(d, 'Y-m-d')); Ext.getCmp('dt_end_achatfour').setValue(Ext.Date.parse(a, 'Y-m-d')); Ext.getCmp('rechachatfour').setValue(n); }, [du, au, nom]);
      const t = Date.now();
      await p.click('#' + await p.evaluate(() => Ext.ComponentQuery.query('achatfourManager button[text=Rechercher]')[0].getId()));
      await p.waitForFunction(() => !Ext.getCmp('achatfourGrid').getStore().isLoading(), null, { timeout: 120000 });
      return { ms: Date.now() - t, total: await p.evaluate(() => Ext.getCmp('achatfourGrid').getStore().getTotalCount()),
        lignes: await p.evaluate(() => Ext.getCmp('achatfourGrid').getStore().getRange().map((r) => r.data)) };
    };
    const r = await recherche('2024-01-01', '2026-12-31', '');
    const attendu = q("SELECT COUNT(DISTINCT YEAR(b.dt_UPDATED), o.lg_GROSSISTE_ID) FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID WHERE b.str_STATUT = 'is_Closed' AND YEAR(b.dt_UPDATED) BETWEEN 2024 AND 2026");
    ok('Recherche 2024-2026 en moins de 10 s (plus de 10 min avant)', r.ms < 10000, r.ms + ' ms');
    ok('Une ligne par année et par grossiste ayant des livraisons clôturées', String(r.total) === attendu && r.lignes.length === Math.min(20, r.total), r.total + ' / attendu ' + attendu);
    const l = r.lignes[0];
    const sql = q("SELECT GROUP_CONCAT(s ORDER BY m SEPARATOR ',') FROM (SELECT m, (SELECT IFNULL(SUM(b.int_MHT), 0) FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID"
      + " WHERE g.str_LIBELLE = '" + l.LIBELLE.replace(/'/g, "''") + "' AND b.str_STATUT = 'is_Closed' AND YEAR(b.dt_UPDATED) = " + l.ANNEE + " AND MONTH(b.dt_UPDATED) = m) s"
      + " FROM (SELECT 1 m UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12) x) y");
    const ecran = MOIS.map((m) => String(Number(l[m]))).join(',');
    ok('Montants des 12 mois de la 1re ligne = base (' + l.ANNEE + ' ' + l.LIBELLE + ')', ecran === sql, ecran + ' / ' + sql);
    const tri = r.lignes.every((x, i) => i === 0 || (r.lignes[i - 1].ANNEE + r.lignes[i - 1].LIBELLE) <= (x.ANNEE + x.LIBELLE) || r.lignes[i - 1].ANNEE < x.ANNEE);
    ok('Tri par année puis fournisseur', tri);
    const f = await recherche('2025-01-01', '2025-12-31', 'LABOREX');
    ok('Filtre sur le nom (LABOREX, 2025)', f.total > 0 && f.lignes.every((x) => /^LABOREX/i.test(x.LIBELLE) && x.ANNEE === '2025'), JSON.stringify(f.lignes.map((x) => x.ANNEE + ' ' + x.LIBELLE)));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await b.close();
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
