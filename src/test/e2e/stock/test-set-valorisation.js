/* SET VALORISATION (besoins du 11/10, lot 4) : valorisation SIMULEE, par l'ecran.
 *  - droit P_SET_VALORISATION donne a aucun role : sans lui, l'API refuse ;
 *  - avec lui (donne le temps du test) : bandeau SIMULATION, valeur de depart = stock de l'officine en base ;
 *  - cible = depart x 1,3 : quantites ajustees, valeur simulee <= cible, ecart < plus grand prix, grille = API ;
 *  - changer de base (PV) efface le resultat ; recherche dans la grille ;
 *  - import d'un fichier CSV (titres francais, une ligne illisible ignoree), calcul sur le fichier ;
 *  - PDF et Excel portent la mention SIMULATION ;
 *  - RIEN n'est ecrit dans le stock ni les fiches (sommes de controle), journal des usages sans ligne de produit ;
 *  - aucune fenetre. Le droit et le journal du test sont retires a la fin.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const ROLE = q("SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.str_LOGIN = '" + ENV_E2E.LOGIN + "' LIMIT 1");
const PRIV = q("SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME = 'P_SET_VALORISATION'");
const DROIT_AJOUTE = 'E2E-SETVALO-DROIT';
const USER = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const empreinte = () => q("SELECT CONCAT((SELECT COALESCE(SUM(CRC32(CONCAT_WS('|', lg_FAMILLE_STOCK_ID, int_NUMBER_AVAILABLE, int_NUMBER, int_UG))), 0) FROM t_famille_stock),"
  + " '/', (SELECT COALESCE(SUM(CRC32(CONCAT_WS('|', lg_FAMILLE_ID, int_PAF, int_PRICE, str_STATUT))), 0) FROM t_famille),"
  + " '/', (SELECT COUNT(*) FROM hmvtproduit), '/', (SELECT COUNT(*) FROM t_famille_stock))");
const DEPART_PA = Number(q("SELECT COALESCE(SUM(fs.int_NUMBER_AVAILABLE * COALESCE(f.int_PAF, 0)), 0) FROM t_famille f JOIN t_famille_stock fs ON fs.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
  + " WHERE fs.lg_EMPLACEMENT_ID = '1' AND f.str_STATUT = 'enable' AND fs.int_NUMBER_AVAILABLE > 0"));
const NB = Number(q("SELECT COUNT(*) FROM t_famille f JOIN t_famille_stock fs ON fs.lg_FAMILLE_ID = f.lg_FAMILLE_ID WHERE fs.lg_EMPLACEMENT_ID = '1' AND f.str_STATUT = 'enable' AND fs.int_NUMBER_AVAILABLE > 0"));
const PRIX_MAX = Number(q("SELECT COALESCE(MAX(COALESCE(f.int_PAF, 0)), 0) FROM t_famille f JOIN t_famille_stock fs ON fs.lg_FAMILLE_ID = f.lg_FAMILLE_ID WHERE fs.lg_EMPLACEMENT_ID = '1' AND f.str_STATUT = 'enable' AND fs.int_NUMBER_AVAILABLE > 0"));
const sp = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const donner = () => exec(`DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '${DROIT_AJOUTE}';`
  + `INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED) SELECT '${DROIT_AJOUTE}', '${ROLE}', '${PRIV}', NOW(), NOW()`
  + ` FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM t_role_privelege WHERE lg_ROLE_ID = '${ROLE}' AND lg_PRIVILEGE_ID = '${PRIV}')`);
const retirer = () => exec(`DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '${DROIT_AJOUTE}'`);

(async () => {
  retirer();
  const debut = q('SELECT NOW()');
  const avant = empreinte();
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'setvalo-'));
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const dialogues = [];
  const connecter = async (p) => {
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.waitForTimeout(1500);
  };
  try {
    ok('Droit P_SET_VALORISATION donné à aucun rôle par défaut', q(`SELECT COUNT(*) FROM t_role_privelege WHERE lg_PRIVILEGE_ID = '${PRIV}'`) === '0');
    /* sans le droit */
    const p0 = await (await b.newContext()).newPage();
    await connecter(p0);
    const refus = await p0.evaluate(async () => (await (await fetch('../api/v1/set-valorisation/depart')).json()));
    const refusCalc = await p0.evaluate(async () => (await (await fetch('../api/v1/set-valorisation/calculer', { method: 'POST',
      headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ source: 'STOCK', base: 'PA', cible: 1000 }) })).json()));
    ok('Sans le droit : départ et calcul refusés', refus.success === false && refusCalc.success === false && /accès/.test(refus.message), refus.message);

    /* avec le droit */
    donner();
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 }, acceptDownloads: true })).newPage();
    await connecter(p);
    await p.evaluate(() => testextjs.app.getController('App').onRedirectTo('setvalorisation', {}));
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('setvalorisation')[0]; return v && v.departStock; }, null, { timeout: 60000 });
    await p.waitForTimeout(800);
    const bandeau = await p.evaluate(() => Ext.ComponentQuery.query('setvalorisation #bandeau')[0].getEl().dom.textContent);
    ok('Bandeau « SIMULATION — ne reflète pas le stock réel »', /SIMULATION — ne reflète pas le stock réel/.test(bandeau), bandeau);
    const info = await p.evaluate(() => Ext.ComponentQuery.query('setvalorisation #infoSource')[0].getEl().dom.textContent);
    ok('Valeur de départ = stock de l\'officine en base (' + sp(DEPART_PA) + ', ' + NB + ' produits)', info.indexOf(sp(DEPART_PA)) >= 0 && info.indexOf(sp(NB) + ' produit') >= 0, info);

    const CIBLE = Math.round(DEPART_PA * 1.3);
    await p.evaluate(() => Ext.ComponentQuery.query('setvalorisation #cible')[0].focus());
    await p.keyboard.type(String(CIBLE));
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => Ext.ComponentQuery.query('setvalorisation')[0].resultat, null, { timeout: 60000 });
    const r = await p.evaluate(() => { const v = Ext.ComponentQuery.query('setvalorisation')[0]; let s = 0, n = 0, haus = 0;
      v.store.each((x) => { s += x.get('valeurAjustee'); n++; if (x.get('qteAjustee') > x.get('qte')) { haus++; } });
      return { o: (({ valeurDepart, valeurObtenue, ecart, cible, nbLignes }) => ({ valeurDepart, valeurObtenue, ecart, cible, nbLignes }))(v.resultat), s, n, haus,
        tuiles: v.down('#tuiles').getEl().dom.textContent, pdf: !v.down('#pdf').isDisabled(), etat: v.down('#etat').getEl().dom.textContent }; });
    ok('Cible ' + sp(CIBLE) + ' : valeur simulée ≤ cible, écart < plus grand prix (' + sp(PRIX_MAX) + ')',
      r.o.valeurObtenue <= CIBLE && r.o.ecart >= 0 && r.o.ecart < Math.max(PRIX_MAX, 1) && r.o.valeurDepart === DEPART_PA, JSON.stringify(r.o));
    ok('Grille : une ligne par produit, total = valeur simulée, quantités en hausse', r.n === NB && Math.abs(r.s - r.o.valeurObtenue) < 1 && r.haus > 0, r.n + ' / ' + r.s + ' / ' + r.haus);
    ok('Tuiles et état : « rien n\'a été écrit dans le stock », PDF et Excel actifs', /Valeur simulée/.test(r.tuiles) && r.tuiles.indexOf(sp(r.o.valeurObtenue)) >= 0
      && /rien n'a été écrit/.test(r.etat) && r.pdf, r.etat);

    /* recherche */
    const designation = q("SELECT f.str_NAME FROM t_famille f JOIN t_famille_stock fs ON fs.lg_FAMILLE_ID = f.lg_FAMILLE_ID WHERE fs.lg_EMPLACEMENT_ID = '1' AND f.str_STATUT = 'enable' AND fs.int_NUMBER_AVAILABLE > 0 ORDER BY f.str_NAME LIMIT 1");
    await p.evaluate(() => Ext.ComponentQuery.query('setvalorisation #recherche')[0].focus());
    await p.keyboard.type(designation.slice(0, 8));
    await p.waitForTimeout(600);
    const filtre = await p.evaluate(() => Ext.ComponentQuery.query('setvalorisation')[0].store.getCount());
    ok('Recherche dans la grille', filtre >= 1 && filtre < NB, filtre + ' ligne(s) pour « ' + designation.slice(0, 8) + ' »');
    await p.evaluate(() => Ext.ComponentQuery.query('setvalorisation #recherche')[0].setValue(''));

    /* editions */
    const pdf = await p.evaluate(async (c) => { const x = await fetch('../api/v1/set-valorisation/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'STOCK', base: 'PA', cible: c }) }); const a = new Uint8Array(await x.arrayBuffer()); return { type: x.headers.get('Content-Type'), b: Array.from(a) }; }, CIBLE);
    fs.writeFileSync(path.join(dossier, 's.pdf'), Buffer.from(pdf.b));
    const textePdf = pdf.type.indexOf('pdf') >= 0 ? execFileSync('pdftotext', ['-layout', path.join(dossier, 's.pdf'), '-'], { encoding: 'utf8' }) : '';
    ok('PDF : mention SIMULATION en titre, en pied et en filigrane', /SIMULATION — NE REFLÈTE PAS LE STOCK RÉEL/.test(textePdf)
      && (textePdf.match(/SIMULATION/g) || []).length >= 3, textePdf.slice(0, 200));
    const [download] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('.setvalorisation .x-btn:has-text("Excel")')]);
    const xlsx = path.join(dossier, 's.xlsx');
    await download.saveAs(xlsx);
    const chaines = execFileSync('unzip', ['-p', xlsx, 'xl/sharedStrings.xml'], { encoding: 'utf8' });
    ok('Excel (bouton de l\'écran) : feuille SIMULATION, mention en tête', /SIMULATION — ne reflète pas le stock réel/.test(chaines)
      && execFileSync('unzip', ['-p', xlsx, 'xl/workbook.xml'], { encoding: 'utf8' }).indexOf('name="SIMULATION"') >= 0, download.suggestedFilename());

    /* base PV : le resultat est efface */
    await p.evaluate(() => Ext.ComponentQuery.query('setvalorisation #base')[0].setValue('PV'));
    await p.waitForTimeout(400);
    const pv = await p.evaluate(() => { const v = Ext.ComponentQuery.query('setvalorisation')[0]; return { n: v.store.getCount(), info: v.down('#infoSource').getEl().dom.textContent, pdf: v.down('#pdf').isDisabled() }; });
    ok('Base « prix de vente » : résultat effacé, départ au prix de vente', pv.n === 0 && /prix de vente/.test(pv.info) && pv.pdf, pv.info);

    /* import d'un fichier */
    const csv = path.join(dossier, 'inventaire.csv');
    fs.writeFileSync(csv, 'Code CIP;Libellé;Qté;PA;Prix de vente\n111;PRODUIT UN;10;1 000;1 500\n222;PRODUIT DEUX;4;2 500;3 000\n333;ILLISIBLE;abc;100;200\n444;PRODUIT QUATRE;0;800;1 000\n');
    await p.click('.setvalorisation .x-btn:has-text("Fichier importé")');
    await p.waitForTimeout(300);
    await p.setInputFiles('.setvalorisation input[type=file]', csv);
    await p.waitForFunction(() => Ext.ComponentQuery.query('setvalorisation')[0].departImport, null, { timeout: 30000 });
    const im = await p.evaluate(() => { const v = Ext.ComponentQuery.query('setvalorisation')[0]; return { info: v.down('#infoSource').getEl().dom.textContent, etat: v.down('#etat').getEl().dom.textContent, n: v.lignesImport.length }; });
    ok('Import : 3 lignes lues, 1 ignorée, colonnes reconnues, départ au prix de vente 27 000', im.n === 3 && /1 ligne\(s\) ignorée/.test(im.info) && /27 000/.test(im.info) && /Colonnes reconnues/.test(im.etat), im.info + ' | ' + im.etat);
    await p.evaluate(() => { const c = Ext.ComponentQuery.query('setvalorisation #cible')[0]; c.setValue(54000); });
    await p.click('.setvalorisation .x-btn:has-text("Calculer la simulation")');
    await p.waitForFunction(() => Ext.ComponentQuery.query('setvalorisation')[0].resultat, null, { timeout: 30000 });
    const ri = await p.evaluate(() => { const v = Ext.ComponentQuery.query('setvalorisation')[0]; const q = {}; v.store.each((x) => { q[x.get('cip')] = x.get('qteAjustee'); });
      return { o: v.resultat.valeurObtenue, q }; });
    ok('Fichier : cible double (54 000) → quantités doublées 20 / 8 / 0', ri.o === 54000 && ri.q['111'] === 20 && ri.q['222'] === 8 && ri.q['444'] === 0, JSON.stringify(ri));

    /* rien n'est ecrit ; journal */
    ok('Rien n\'est écrit dans le stock ni les fiches articles', empreinte() === avant, avant);
    const journal = q(`SELECT GROUP_CONCAT(CONCAT(action, ':', source, ':', base) ORDER BY id) FROM t_set_valorisation_journal WHERE lg_USER_ID = '${USER}' AND created_at >= '${debut}'`);
    ok('Journal des usages (calculs, PDF, Excel ; source, base) sans ligne de produit', /CALCUL:STOCK:PA/.test(journal) && /PDF:STOCK:PA/.test(journal) && /EXCEL:STOCK:PA/.test(journal)
      && /CALCUL:IMPORT:PV/.test(journal) && q("SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 't_set_valorisation_journal'") === '10', journal);
    ok('Aucune fenêtre', dialogues.length === 0, dialogues.join(' | '));
  } finally {
    retirer();
    exec(`DELETE FROM t_set_valorisation_journal WHERE lg_USER_ID = '${USER}' AND created_at >= '${debut}'`);
    fs.rmSync(dossier, { recursive: true, force: true });
    await b.close();
    ok('Droit et journal du test retirés', q(`SELECT COUNT(*) FROM t_role_privelege WHERE lg_PRIVILEGE_ID = '${PRIV}'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
