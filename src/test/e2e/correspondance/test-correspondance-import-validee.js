/* Correspondance grossistes : l'import des fichiers relit les correspondances VALIDEES (ecran « Correspondance
   grossistes »). Import d'un fichier Copharmed par la vraie fenetre « IMPORTER UNE COMMANDE » :
   - code inconnu des fiches, valide pour F1 : reconnu, ligne de commande sur F1 (avant : non reconnu) ;
   - meme code ecrit en minuscules avec des blancs : reconnu aussi, quantites cumulees sur F1 ;
   - code que la recherche actuelle rattache a A, valide pour B : la decision de l'officine l'emporte, ligne sur B ;
   - code rejete, code seulement propose : non reconnus (seule une validation compte) ;
   - code ordinaire sans correspondance : reconnu comme avant (temoin).
   Rapprochement fichier = traces = lignes de commande ; bilan : ni les correspondances ni t_famille_grossiste ne
   changent a l'import. Tout est retire a la fin. */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }

const URL_PRESTIGE = process.env.E2E_URL || (process.env.BASE || 'http://localhost:8080/prestige');
const WEB_INF = process.env.E2E_WEB_INF || 'D:\\payara5\\payara5\\glassfish\\domains\\domain1\\applications\\prestige\\WEB-INF';
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, BASE, '--raw', '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 28 }).replace(/\r\n/g, '\n').trim();
const lignes = (s) => { const t = q(s); return t ? t.split('\n').map((l) => l.split('\t')) : []; };
const SAUVE = 'e2e_correspondance_sauve4';
const NOM_FICHIER = 'e2e-copharmed-validee';
const G = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_LIBELLE = 'COPHARMED' AND str_STATUT = 'enable' LIMIT 1");

/* fiches Copharmed dont le code (CIP a 7 chiffres) ne designe qu'une fiche active a l'import */
function fiches(n, decalage) {
  const cand = lignes("SELECT fg.lg_FAMILLE_ID, TRIM(fg.str_CODE_ARTICLE) FROM t_famille_grossiste fg JOIN t_famille f ON f.lg_FAMILLE_ID = fg.lg_FAMILLE_ID"
    + " WHERE fg.lg_GROSSISTE_ID = '" + G + "' AND fg.str_STATUT = 'enable' AND f.str_STATUT = 'enable' AND f.bool_DECONDITIONNE = 0"
    + " AND TRIM(fg.str_CODE_ARTICLE) REGEXP '^[0-9]{7}$' ORDER BY f.lg_FAMILLE_ID LIMIT 30 OFFSET " + decalage);
  const P = [];
  for (const [f, c] of cand) {
    if (P.length === n) { break; }
    const k = q("SELECT COUNT(DISTINCT f.lg_FAMILLE_ID) FROM t_famille_grossiste fg JOIN t_famille f ON f.lg_FAMILLE_ID = fg.lg_FAMILLE_ID"
      + " WHERE fg.str_STATUT = 'enable' AND f.str_STATUT = 'enable' AND f.bool_DECONDITIONNE = 0"
      + " AND (f.int_CIP LIKE '" + c + "%' OR f.int_EAN13 LIKE '" + c + "%' OR fg.str_CODE_ARTICLE LIKE '" + c + "%')");
    if (k === '1' && !P.some((x) => x.f === f)) { P.push({ f, c }); }
  }
  return P;
}

let parametre = null, commande = '';
function retirer() {
  if (commande) {
    q(`DELETE FROM ligne_import_grossiste WHERE lg_ORDER_ID = '${commande}'; DELETE FROM t_order_detail WHERE lg_ORDER_ID = '${commande}'; DELETE FROM t_order WHERE lg_ORDER_ID = '${commande}';`);
  }
  if (parametre !== null) {
    q("UPDATE t_parameters SET str_VALUE = '" + parametre.replace(/'/g, "''") + "' WHERE str_KEY = 'KEY_LAST_ORDER_COMMAND_NUMBER'");
  }
  if (q("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = '" + SAUVE + "'") === '1') {
    q('DELETE FROM correspondance_grossiste; INSERT INTO correspondance_grossiste SELECT * FROM ' + SAUVE + '; DROP TABLE ' + SAUVE + ';');
  }
  try {
    for (const f of fs.readdirSync(WEB_INF).filter((x) => x.startsWith(NOM_FICHIER + '-verif'))) { fs.unlinkSync(path.join(WEB_INF, f)); }
  } catch (e) { /* rien a retirer */ }
}

(async () => {
  const P = fiches(5, 400);
  if (!G || P.length < 5) { console.error('Jeu d\'essai introuvable'); process.exit(2); }
  const [F1, A, B, D, F4] = P;
  parametre = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_LAST_ORDER_COMMAND_NUMBER'");
  q('DROP TABLE IF EXISTS ' + SAUVE + '; CREATE TABLE ' + SAUVE + ' AS SELECT * FROM correspondance_grossiste;');
  const codes = ['E2EVAL-01', A.c, 'E2EVAL-03', 'E2EVAL-04', D.c];
  q(`DELETE FROM correspondance_grossiste WHERE cle_grossiste = '${G}' AND code_grossiste IN ('${codes.join("','")}')`);
  const poser = (code, famille, etat, candidats) => q('INSERT INTO correspondance_grossiste (cle_grossiste, lg_GROSSISTE_ID, code_grossiste, lg_FAMILLE_ID, etat, source, motif, score, candidats, lg_USER_VALIDATION, dt_validation, dt_creation, dt_maj)'
    + ` VALUES ('${G}', '${G}', '${code}', ${famille ? "'" + famille + "'" : 'NULL'}, '${etat}', '${etat === 'PROPOSEE' ? 'APPROCHE' : 'HUMAIN'}', 'DESIGNATION', 0.800, '${JSON.stringify(candidats)}',`
    + ` ${etat === 'PROPOSEE' ? 'NULL' : "'" + ENV_E2E.LOGIN + "'"}, ${etat === 'PROPOSEE' ? 'NULL' : 'NOW()'}, NOW(3), NOW(3))`);
  poser('E2EVAL-01', F1.f, 'VALIDEE', [F1.f]);
  poser(A.c, B.f, 'VALIDEE', [A.f, B.f]);
  poser('E2EVAL-03', null, 'REJETEE', [F4.f]);
  poser('E2EVAL-04', null, 'PROPOSEE', [F4.f]);
  const corrAvant = q('SELECT COUNT(*), SUM(CRC32(CONCAT_WS(\'|\', id, etat, IFNULL(lg_FAMILLE_ID,\'\'), nb_confirmations, dt_maj))) FROM correspondance_grossiste');
  const sommes = () => q('CHECKSUM TABLE t_famille_grossiste').split('\t')[1];
  const sommesAvant = sommes();

  const L = [
    { code: 'E2EVAL-01', des: 'E2E VALIDEE INCONNUE', qte: 2, paf: 1210, pu: 1700, f: F1.f },
    { code: A.c, des: 'E2E VALIDEE CONTRE LA RECHERCHE', qte: 3, paf: 870, pu: 1250, f: B.f },
    { code: 'E2EVAL-03', des: 'E2E REJETEE', qte: 1, paf: 500, pu: 700, f: '' },
    { code: 'E2EVAL-04', des: 'E2E SEULEMENT PROPOSEE', qte: 4, paf: 640, pu: 900, f: '' },
    { code: D.c, des: 'E2E TEMOIN', qte: 5, paf: 330, pu: 460, f: D.f },
    { code: ' e2eval-01 ', des: 'E2E VALIDEE INCONNUE BIS', qte: 1, paf: 1210, pu: 1700, f: F1.f },
  ];
  const csv = ['Date;Facture;Ligne;Rubrique;Code;Ref;Designation;Lot;Commandee;Livree;UG;PrixHT;Taxe;PrixPublic']
    .concat(L.map((l, i) => ['08/11/2026', 'E2E-F4', i + 1, '', l.code, '', l.des, '', l.qte, l.qte, 0, l.paf + '.0', '0', l.pu].join(';'))).join('\r\n') + '\r\n';
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-cgv-'));
  const fichier = path.join(dossier, NOM_FICHIER + '.csv');
  fs.writeFileSync(fichier, csv);

  const b = await ENV_E2E.lancer(chromium);
  try {
    const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
    await p.goto(URL_PRESTIGE + '/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 120000 });
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponentWithDataSource('i_order_manager', '', '', ''));
    await p.locator('text=IMPORTER UNE COMMANDE').first().click({ timeout: 30000 });
    await p.waitForFunction(() => Ext.getCmp('xlsxdialog') && Ext.getCmp('formImport') && Ext.getCmp('formImport').rendered, null, { timeout: 15000 });
    await p.setInputFiles('#xlsxdialog input[type=file]', fichier);
    const champ = (nom) => p.evaluate((n) => Ext.getCmp('formImport').down('[name=' + n + ']').inputEl.id, nom);
    await p.click('#' + await champ('modeBL'));
    await p.keyboard.type('COPH');
    await p.locator('.x-boundlist-item:visible', { hasText: /^COPHARMED$/ }).first().click();
    await p.click('#' + await champ('lg_GROSSISTE_ID'));
    await p.keyboard.type('COPHARMED');
    await p.locator('.x-boundlist-item:visible', { hasText: /^COPHARMED$/ }).first().click({ timeout: 20000 });
    const bouton = await p.evaluate(() => Ext.getCmp('formImport').down('button[text=Importer]').id);
    const [reponse] = await Promise.all([
      p.waitForResponse((r) => r.url().includes('/commande?action=import'), { timeout: 120000 }),
      p.click('#' + bouton),
    ]);
    const corps = JSON.parse(await reponse.text());
    commande = corps.orderId || '';
    ok('import : 4 lignes reconnues sur 6 (validees, temoin), rejetee et proposee non reconnues',
      commande && corps.nbReconnus === 4 && corps.nbTotal === 6 && (corps.nonReconnus || []).map((x) => x.cip).sort().join(',') === 'E2EVAL-03,E2EVAL-04', JSON.stringify(corps).slice(0, 250));

    const traces = lignes(`SELECT rang, IFNULL(lg_FAMILLE_ID,''), IFNULL(lg_ORDERDETAIL_ID,''), quantite, code_normalise FROM ligne_import_grossiste WHERE lg_ORDER_ID = '${commande}' ORDER BY rang`);
    const ecarts = L.map((l, i) => (traces[i] || [])[1] === l.f ? null : (i + 1) + ': ' + l.f + ' <> ' + (traces[i] || [])[1]).filter(Boolean);
    ok('traces : chaque ligne rattachee a la fiche attendue (validee > recherche, rejetee et proposee sans fiche)', traces.length === 6 && ecarts.length === 0, ecarts);
    ok('code en minuscules avec des blancs : meme code normalise que la validation', traces[5] && traces[5][4] === 'E2EVAL-01');
    ok('la decision de l\'officine l\'emporte sur la recherche par code : B et non A', traces[1] && traces[1][1] === B.f && traces[1][1] !== A.f);
    const details = new Map(lignes(`SELECT lg_FAMILLE_ID, lg_ORDERDETAIL_ID, int_NUMBER, int_PAF_DETAIL, int_PRICE_DETAIL FROM t_order_detail WHERE lg_ORDER_ID = '${commande}'`).map((x) => [x[0], x]));
    ok('lignes de commande : F1 (2 + 1), B (3), D (5), rien sur A ; prix du fichier repris',
      details.size === 3 && details.get(F1.f) && details.get(F1.f)[2] === '3' && details.get(F1.f)[3] === '1210' && details.get(F1.f)[4] === '1700'
      && details.get(B.f) && details.get(B.f)[2] === '3' && details.get(B.f)[3] === '870' && details.get(D.f) && details.get(D.f)[2] === '5' && !details.has(A.f),
      [...details.values()].map((x) => x.join('/')).join(' ; '));
    ok('trace -> ligne de commande de sa fiche', traces.every((t) => (t[1] ? details.get(t[1]) && details.get(t[1])[1] === t[2] : t[2] === '')));
    ok('bilan : correspondances et t_famille_grossiste inchangees par l\'import',
      q('SELECT COUNT(*), SUM(CRC32(CONCAT_WS(\'|\', id, etat, IFNULL(lg_FAMILLE_ID,\'\'), nb_confirmations, dt_maj))) FROM correspondance_grossiste') === corrAvant && sommes() === sommesAvant);
    const rec = await p.evaluate(async (a) => (await fetch(a.u + '/commande?action=reconciliation-save&orderId=' + a.o, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nonReconnus: [] }) })).json(), { u: URL_PRESTIGE, o: commande });
    ok('reconciliation de la commande d\'essai fermee', rec && rec.success === true);
    await p.close();
  } catch (e) {
    ok('execution sans exception', false, e && e.stack);
  } finally {
    await b.close();
    retirer();
    fs.rmSync(dossier, { recursive: true, force: true });
    ok('remise en etat : commande, traces, correspondances, numero de commande',
      (!commande || q(`SELECT (SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID = '${commande}') + (SELECT COUNT(*) FROM ligne_import_grossiste WHERE lg_ORDER_ID = '${commande}')`) === '0')
      && q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_LAST_ORDER_COMMAND_NUMBER'") === parametre);
  }
  const echecs = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - echecs) + '/' + res.length + ' PASS');
  process.exit(echecs ? 1 : 0);
})();
