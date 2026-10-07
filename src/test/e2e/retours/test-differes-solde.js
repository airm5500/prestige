/* GESTION DES DIFFERES (retours du 07/10) : onglet « Solde » et filtre « État ».
 * Jeu d'essai (retire a la fin) : un client, trois ventes mises en differe (partiellement reglee, non reglee, reglee)
 * et deux reglements, sur septembre et octobre 2026.
 *  - releve d'octobre : solde au debut = ventes - reglements d'avant ; une ligne par operation (date et heure,
 *    debit / credit, solde apres l'operation), ligne « Solde fin Octobre 2026 » ; solde final = somme des restes dus ;
 *  - filtre « État » de la liste : non reglee / partielle / reglee / non soldes / tous, coherents avec les restes ;
 *  - par l'ecran : onglet SOLDE, client choisi, lignes et resume ; aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const exec = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const SORTIE = process.env.SORTIE || '/tmp';
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const EMPL = q("SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN = 'admin'");
const CLIENT = 'e2e-diff-client', COMPTE = 'e2e-diff-compte';

function nettoyer() {
  exec("DELETE FROM mvttransaction WHERE uuid LIKE 'e2e-diff-%';"
    + "DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_ID LIKE 'e2e-diff-%';"
    + "DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'e2e-diff-%';"
    + "DELETE FROM t_compte_client WHERE lg_COMPTE_CLIENT_ID = '" + COMPTE + "';"
    + "DELETE FROM t_client WHERE lg_CLIENT_ID = '" + CLIENT + "';");
}
function vente(id, quand, du, reste) {
  exec("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, int_PRICE, int_PRICE_REMISE, int_CUST_PART, str_STATUT, b_IS_CANCEL,"
    + " lg_TYPE_VENTE_ID, str_TYPE_VENTE, lg_USER_ID, dt_CREATED, dt_UPDATED) VALUES ('e2e-diff-" + id + "', 'E2E-" + id + "', " + du + ", 0, " + du
    + ", 'is_Closed', 0, '1', 'VNO', '" + ADMIN + "', '" + quand + "', '" + quand + "');"
    + "INSERT INTO t_preenregistrement_compte_client (lg_PREENREGISTREMENT_COMPTE_CLIENT_ID, lg_PREENREGISTREMENT_ID, lg_COMPTE_CLIENT_ID, lg_USER_ID,"
    + " str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, int_PRICE_RESTE) VALUES ('e2e-diff-" + id + "', 'e2e-diff-" + id + "', '" + COMPTE + "', '" + ADMIN
    + "', 'is_Closed', '" + quand + "', '" + quand + "', " + du + ", " + reste + ")");
}
function reglement(id, quand, montant) {
  exec("INSERT INTO mvttransaction (uuid, categorie, createdAt, mvtdate, pkey, reference, typeTransaction, caisse, lg_EMPLACEMENT_ID, lg_USER_ID,"
    + " typeMvtCaisseId, organisme, montantRegle, montant, checked) VALUES ('e2e-diff-" + id + "', 0, '" + quand + "', DATE('" + quand + "'), 'e2e-diff-" + id
    + "', 'REG-" + id + "', 2, '" + ADMIN + "', '" + EMPL + "', '" + ADMIN + "', '2', '" + CLIENT + "', " + montant + ", " + montant + ", 1)");
}

(async () => {
  nettoyer();
  exec("INSERT INTO t_client (lg_CLIENT_ID, str_FIRST_NAME, str_LAST_NAME, str_STATUT, dt_CREATED) VALUES ('" + CLIENT + "', 'ZZDIFFERE', 'Essai', 'enable', NOW());"
    + "INSERT INTO t_compte_client (lg_COMPTE_CLIENT_ID, lg_CLIENT_ID, str_STATUT, dt_CREATED) VALUES ('" + COMPTE + "', '" + CLIENT + "', 'enable', NOW())");
  vente('A', '2026-09-15 10:00:00', 10000, 4000);   // partiellement reglee (6 000 payes le 20/09)
  vente('B', '2026-10-03 09:00:00', 6000, 6000);    // non reglee
  vente('C', '2026-10-04 11:00:00', 2000, 0);       // reglee le jour meme
  reglement('R1', '2026-09-20 16:00:00', 6000);
  reglement('R2', '2026-10-04 11:30:00', 2000);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 1000 } })).newPage();
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const api = (u) => p.evaluate(async (u) => JSON.parse(await (await fetch(u)).text()), u);
  try {
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', 'admin'); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app && Ext.ComponentQuery.query('navigation').length, null, { timeout: 120000 });
    await p.waitForTimeout(1500);

    /* ------------------------------------------------ releve */
    const r = await api('../api/v1/reglement/releve?dtStart=2026-10-01&dtEnd=2026-10-31&clientId=' + CLIENT);
    const l = (r.data || []).map((x) => x.type + ':' + x.debit + '/' + x.credit + '=' + x.solde).join(' | ');
    ok('Solde au début d\'octobre = ventes − règlements d\'avant (10 000 − 6 000)', r.soldeInitial === 4000, r.soldeInitial);
    ok('Une ligne par opération, solde après chacune, dans l\'ordre (vente avant son règlement)',
      l === 'VENTE:6000/0=10000 | VENTE:2000/0=12000 | REGLEMENT:0/2000=10000 | MOIS:8000/2000=10000', l);
    ok('Ligne « Solde fin Octobre 2026 » (totaux du mois)', (r.data || []).some((x) => x.type === 'MOIS' && x.libelle === 'Solde fin Octobre 2026'), JSON.stringify(r.data && r.data[3]));
    ok('Date et heure sur chaque opération', (r.data || [])[0] && r.data[0].date === '03/10/2026 09:00', r.data && r.data[0].date);
    const restes = Number(q("SELECT SUM(int_PRICE_RESTE) FROM t_preenregistrement_compte_client WHERE lg_COMPTE_CLIENT_ID = '" + COMPTE + "'"));
    ok('Cohérence : solde final = somme des restes dus des ventes différées', r.soldeFinal === restes, r.soldeFinal + ' / ' + restes);
    const s2 = await api('../api/v1/reglement/releve?dtStart=2026-09-01&dtEnd=2026-10-31&clientId=' + CLIENT);
    ok('Sur deux mois : une ligne de solde par mois, septembre puis octobre', (s2.data || []).filter((x) => x.type === 'MOIS').map((x) => x.libelle + '=' + x.solde).join(',')
      === 'Solde fin Septembre 2026=4000,Solde fin Octobre 2026=10000', JSON.stringify((s2.data || []).filter((x) => x.type === 'MOIS')));
    const faux = await api('../api/v1/reglement/releve?dtStart=2026-10-31&dtEnd=2026-10-01');
    ok('Dates inversées : refus expliqué', faux.success === false && /début/.test(faux.msg), JSON.stringify(faux));
    const absurde = await p.evaluate(async () => (await fetch('../api/v1/reglement/releve?dtStart=abc&dtEnd=31/02/2026')).status);
    ok('Dates illisibles : pas d\'erreur serveur', absurde === 200, absurde);

    /* ------------------------------------------------ filtre Etat */
    const etat = async (e) => ((await api('../api/v1/reglement/liste?dtStart=2026-09-01&dtEnd=2026-10-31&query=&userId=' + CLIENT + '&etat=' + e)).data || []).map((x) => x.reference + ':' + x.etat).sort().join(',');
    const et = { NR: await etat('NON_REGLES'), P: await etat('PARTIELS'), R: await etat('REGLES'), NS: await etat('NON_SOLDES'), T: await etat('TOUS') };
    ok('Filtre État : non réglée (B), partielle (A), réglée (C), non soldés (A, B), tous (A, B, C)',
      et.NR === 'E2E-B:NON_REGLE' && et.P === 'E2E-A:PARTIEL' && et.R === 'E2E-C:REGLE' && et.NS === 'E2E-A:PARTIEL,E2E-B:NON_REGLE' && et.T === 'E2E-A:PARTIEL,E2E-B:NON_REGLE,E2E-C:REGLE', JSON.stringify(et));

    /* ------------------------------------------------ ecran */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('delayed', 'Gestion des différés', ''));
    await p.waitForFunction(() => Ext.ComponentQuery.query('delayed #grilleSolde').length > 0, null, { timeout: 30000 });
    await p.evaluate(() => { const t = Ext.ComponentQuery.query('delayed')[0]; t.setActiveTab(t.down('#grilleSolde')); });
    await p.evaluate((c) => { const g = Ext.ComponentQuery.query('delayed #grilleSolde')[0]; g.down('#soldeDu').setValue(new Date(2026, 9, 1)); g.down('#soldeAu').setValue(new Date(2026, 9, 31));
      const cb = g.down('#soldeClient'); cb.getStore().add({ lgCLIENTID: c, fullName: 'ZZDIFFERE Essai' }); cb.setValue(c); }, CLIENT);
    await p.evaluate(() => Ext.ComponentQuery.query('delayed #grilleSolde button[text=Rechercher]')[0].btnEl.dom.click());
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('delayed #grilleSolde')[0]; return !g.getStore().isLoading() && g.getStore().getCount() === 4; }, null, { timeout: 20000 });
    await p.waitForTimeout(600);
    const ecran = await p.evaluate(() => { const g = Ext.ComponentQuery.query('delayed #grilleSolde')[0]; return { resume: g.down('#soldeResume').getEl().dom.textContent,
      mois: g.getView().getEl().dom.querySelectorAll('.differe-ligne-mois').length, entetes: g.headerCt.getGridColumns().map((c) => c.text).join('|') }; });
    ok('Écran : onglet SOLDE, colonnes date et heure / débit / crédit / solde, ligne de fin de mois, résumé',
      ecran.entetes === 'Date et heure|Opération|Client|Débit|Crédit|Solde' && ecran.mois === 1 && /Solde au début : 4 000/.test(ecran.resume) && /Solde à la fin : 10 000/.test(ecran.resume), JSON.stringify(ecran));
    await p.screenshot({ path: SORTIE + '/differes-solde.png' });
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE 'e2e-diff-%'") === '0' && q("SELECT COUNT(*) FROM mvttransaction WHERE uuid LIKE 'e2e-diff-%'") === '0');
    const ko = res.filter((x) => !x.c).length;
    console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
    process.exit(ko ? 1 : 0);
  }
})();
