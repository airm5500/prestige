/* ETAT DE CONTROLE DES ACHATS : TABLEAU DE BORD ET GROUPE DE GROSSISTES (retours du 10/10, lot 4, Q7) — par l'ecran.
 * Jeu d'essai : 3 BL du 10/01/2025 (periode sans autre BL) :
 *   BL1 LABOREX YOP (groupe 1) saisi le jour meme, controle termine ;
 *   BL2 LABOREX ZONE 3 (groupe 1) saisi 3 jours apres, non controle ;
 *   BL3 DPCI (groupe 2) saisi le lendemain, controle termine.
 * Attendu (seuil 1 jour) : 3 BL, 2 controles (67 %), 2 dans le delai, 1 en retard, delai moyen 1,3 j ; groupe 1 : 2 BL ;
 * seuil porte a 3 jours : plus aucun retard ; filtre groupe dans la liste : grossiste grise, BL du groupe seulement ;
 * le menu ouvre le conteneur a deux onglets, la liste garde son identifiant. Jeu d'essai et seuil remis a la fin.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE], { encoding: 'utf8', input: s });
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const G1 = '51217123167082947316', G1B = '51217123725332335681', G2 = '51217123242587374880';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const P = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' ORDER BY str_NAME LIMIT 1");
const SEUIL = q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_CONTROLE_ACHAT_DELAI_SAISIE_JOURS'), 'ABSENT')");

function nettoyer() {
  exec("SET FOREIGN_KEY_CHECKS = 0; DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-CA-%'; DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-CA-%';"
    + " DELETE FROM t_order WHERE lg_ORDER_ID LIKE 'E2E-CA-%'; SET FOREIGN_KEY_CHECKS = 1;");
  exec(SEUIL === 'ABSENT' ? "DELETE FROM t_parameters WHERE str_KEY = 'KEY_CONTROLE_ACHAT_DELAI_SAISIE_JOURS'"
    : "UPDATE t_parameters SET str_VALUE = '" + SEUIL + "' WHERE str_KEY = 'KEY_CONTROLE_ACHAT_DELAI_SAISIE_JOURS'");
}
function bl(n, grossiste, saisie, controle) {
  const o = 'E2E-CA-O' + n, b = 'E2E-CA-' + n;
  return "INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
    + " VALUES ('" + o + "', '" + o + "', 1, '" + grossiste + "', '" + ADMIN + "', 'is_Closed', '2025-01-09', '2025-01-09', 1000, 1, 0);"
    + "INSERT INTO t_bon_livraison (lg_BON_LIVRAISON_ID, str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA, int_HTTC, lg_ORDER_ID, str_STATUT, dt_CREATED, dt_UPDATED, lg_USER_ID)"
    + " VALUES ('" + b + "', 'E2ECA" + n + "', '2025-01-10', 1000, 0, " + (1000 * n) + ", '" + o + "', 'is_Closed', '" + saisie + "', '" + saisie + "', '" + ADMIN + "');"
    + "INSERT INTO t_bon_livraison_detail (lg_BON_LIVRAISON_DETAIL, lg_GROSSISTE_ID, lg_FAMILLE_ID, lg_BON_LIVRAISON_ID, int_QTE_CMDE, int_QTE_RECUE, int_QTE_UG, int_PAF, int_PRIX_VENTE, prixTarif, lg_ZONE_GEO_ID, str_STATUT, dt_CREATED, dt_UPDATED, checked)"
    + " VALUES ('" + b + "-L', '" + grossiste + "', '" + P + "', '" + b + "', 2, 2, 0, 500, 800, 500, '1', 'is_Closed', '" + saisie + "', '" + saisie + "', " + (controle ? 1 : 0) + ");";
}

(async () => {
  nettoyer();
  exec(bl(1, G1, '2025-01-10 09:00:00', true) + bl(2, G1B, '2025-01-13 09:00:00', false) + bl(3, G2, '2025-01-11 09:00:00', true)
    + "UPDATE t_parameters SET str_VALUE = '1' WHERE str_KEY = 'KEY_CONTROLE_ACHAT_DELAI_SAISIE_JOURS'");
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1366, height: 768 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('etatscontrolemanager', 'Etat de controle des achats', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('controleachats').length > 0 && Ext.ComponentQuery.query('etatscontrolemanager')[0], null, { timeout: 30000 });
    const ouv = await p.evaluate(() => ({ onglets: Ext.ComponentQuery.query('controleachats #ongletsCa button').map((x) => x.getText()),
      liste: Ext.ComponentQuery.query('controleachats')[0].getLayout().getActiveItem().isXType('etatscontrolemanager') }));
    ok('Le menu ouvre « Liste des BL | Tableau de bord », la liste d\'origine affichée', ouv.onglets.join('|') === 'Liste des BL|Tableau de bord' && ouv.liste === true, JSON.stringify(ouv));

    /* liste : filtre groupe */
    await p.evaluate(() => { Ext.getCmp('datedebut').setValue(new Date(2025, 0, 1)); Ext.getCmp('datefin').setValue(new Date(2025, 0, 31)); });
    await p.waitForFunction(() => Ext.getCmp('lg_GROUPE_GROSSISTE_ID').getStore().getCount() > 1, null, { timeout: 30000 });
    const charger = () => p.waitForFunction(() => !Ext.ComponentQuery.query('etatscontrolemanager')[0].getStore().isLoading(), null, { timeout: 60000 });
    await p.evaluate(() => { const c = Ext.getCmp('lg_GROUPE_GROSSISTE_ID'); c.setValue('1'); c.fireEvent('select', c); });
    await p.waitForTimeout(300); await charger();
    let l = await p.evaluate(() => ({ refs: Ext.ComponentQuery.query('etatscontrolemanager')[0].getStore().collect('strREFLIVRAISON').filter((x) => /^E2ECA/.test(x)).sort(), gris: Ext.getCmp('lg_GROSSISTE_ID').isDisabled() }));
    ok('Liste, groupe 1 : grossiste grisé, BL des deux grossistes du groupe seulement', l.gris && JSON.stringify(l.refs) === '["E2ECA1","E2ECA2"]', JSON.stringify(l));
    await p.evaluate(() => { Ext.ComponentQuery.query('etatscontrolemanager')[0].getStore().loadPage(1); });
    await charger();
    const page = await p.evaluate(() => Ext.ComponentQuery.query('etatscontrolemanager')[0].getStore().collect('strREFLIVRAISON').filter((x) => /^E2ECA/.test(x)).sort());
    ok('Pagination : le groupe reste appliqué d\'une page à l\'autre', JSON.stringify(page) === '["E2ECA1","E2ECA2"]', JSON.stringify(page));
    await p.evaluate(() => { const c = Ext.getCmp('lg_GROUPE_GROSSISTE_ID'); c.setValue(''); c.fireEvent('select', c); });
    await p.waitForTimeout(300); await charger();
    l = await p.evaluate(() => ({ refs: Ext.ComponentQuery.query('etatscontrolemanager')[0].getStore().collect('strREFLIVRAISON').filter((x) => /^E2ECA/.test(x)).sort(), gris: Ext.getCmp('lg_GROSSISTE_ID').isDisabled() }));
    ok('« Tous les groupes » : grossiste de nouveau choisissable, les 3 BL', !l.gris && l.refs.length === 3, JSON.stringify(l));

    /* tableau de bord */
    await p.evaluate(() => { const b = Ext.ComponentQuery.query('controleachats #ca-tableau')[0]; b.getEl().dom.setAttribute('data-e2e', 'tab'); });
    await p.click('[data-e2e=tab]');
    await p.waitForFunction(() => { const t = Ext.ComponentQuery.query('controleachats #tableauControle')[0]; return t && t.isVisible() && /BL de la période/.test(t.down('#tbContenu').getEl().dom.textContent); }, null, { timeout: 60000 });
    const lire = () => p.evaluate(() => { const t = Ext.ComponentQuery.query('controleachats #tableauControle')[0], d = t.down('#tbContenu').getEl().dom;
      return { tuiles: [...d.querySelectorAll('.pml-tuile')].map((x) => x.textContent.replace(/\s+/g, ' ').trim()),
        lignes: [...d.querySelectorAll('table.ca-repartition tr')].slice(1).map((x) => [...x.querySelectorAll('td')].map((c) => c.textContent.trim()).join('|')),
        debut: t.down('#tbDebut').getSubmitValue(), seuil: t.down('#tbSeuil').getValue(), modifiable: t.down('#tbEnregistrerSeuil').isVisible() }; });
    let t = await lire();
    ok('Tableau : reprend la période de la liste', t.debut === '2025-01-01', t.debut);
    ok('Tuiles : 3 BL, 2 / 3 contrôlés (67 %), 2 dans le délai (≤ 1 j), 1 en retard, délai moyen 1,3 j',
      /^3\s*BL de la période/.test(t.tuiles[0]) && /^2 \/ 3\s*BL contrôlés\s*67 %/.test(t.tuiles[1]) && /^2\s*Saisis dans le délai\s*67 % · ≤ 1 j/.test(t.tuiles[2])
      && /^1\s*Saisis en retard/.test(t.tuiles[3]) && /^1,3 j\s*Délai moyen/.test(t.tuiles[4]), JSON.stringify(t.tuiles));
    ok('Répartition : groupe LABOREX (2 BL : 1 contrôlé, 1 dans le délai, 1 en retard), ses 2 grossistes, puis DPCI',
      t.lignes[0].startsWith('LABOREX-CI|2|1|50 %|1|1|50 %|1,5 j') && t.lignes.slice(1, 3).every((x) => /^LABOREX-CI (YOP|ZONE 3)\|1\|/.test(x)) && t.lignes[3].startsWith('DPCI|1|1|100 %|1|0|100 %|1 j'),
      JSON.stringify(t.lignes));
    ok('Délai de saisie toléré : 1 jour, modifiable (droit admin)', t.seuil === 1 && t.modifiable, JSON.stringify({ s: t.seuil, m: t.modifiable }));
    await p.evaluate(() => { const t = Ext.ComponentQuery.query('controleachats #tableauControle')[0]; t.down('#tbSeuil').setValue(3); t.down('#tbEnregistrerSeuil').handler(); });
    await p.waitForFunction(() => /≤ 3 j/.test(Ext.ComponentQuery.query('controleachats #tbContenu')[0].getEl().dom.textContent), null, { timeout: 60000 });
    t = await lire();
    ok('Délai porté à 3 jours : enregistré, plus aucun BL en retard', q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_CONTROLE_ACHAT_DELAI_SAISIE_JOURS'") === '3'
      && /^3\s*Saisis dans le délai\s*100 %/.test(t.tuiles[2]) && /^0\s*Saisis en retard/.test(t.tuiles[3]), JSON.stringify(t.tuiles));
    const refus = await p.evaluate(async () => (await fetch('../api/v1/etat-control-bon/tableau-bord/delai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"jours":"x"}' })).json());
    ok('Délai illisible refusé', refus.success === false, JSON.stringify(refus));
    await p.evaluate(() => { const t = Ext.ComponentQuery.query('controleachats #tableauControle')[0], g = t.down('#tbGroupe'); g.setValue('2'); g.fireEvent('select', g); });
    await p.waitForFunction(() => /^1\s*BL de la période/.test(Ext.ComponentQuery.query('controleachats #tbContenu')[0].getEl().dom.querySelector('.pml-tuile').textContent.replace(/\s+/g, ' ').trim()), null, { timeout: 60000 });
    t = await lire();
    ok('Tableau, groupe 2 : grossiste grisé, seul le BL DPCI', t.lignes.length === 2 && t.lignes[0].startsWith('DPCI|1|') && await p.evaluate(() => Ext.ComponentQuery.query('controleachats #tbGrossiste')[0].isDisabled()), JSON.stringify(t.lignes));
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulement du test', false, e.stack || e);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré, délai remis', q("SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE 'E2E-CA-%'") === '0'
      && (SEUIL === 'ABSENT' || q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_CONTROLE_ACHAT_DELAI_SAISIE_JOURS'") === SEUIL));
    const n = res.filter((x) => x.c).length;
    console.log('\n' + n + '/' + res.length + (n === res.length ? ' OK' : ' ECHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
