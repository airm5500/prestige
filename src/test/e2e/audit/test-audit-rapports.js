/* AUDIT & RAPPROCHEMENTS, onglet Rapports (besoins du 11/10, point 6). Par l'ecran :
 *  - ouvrir l'ecran ne conserve aucun rapport ; « Lancer l'analyse » en conserve un (auteur, periode, resultat) ;
 *  - rapport 1 avec un ecart de stock pose sur un produit, rapport 2 apres l'avoir retire et pose un stock negatif ;
 *  - onglet Rapports : les deux rapports, le plus recent en tete, nombre d'ecarts par controle ;
 *  - comparaison des deux : l'ecart de stock est « resolu », le stock negatif est « nouveau » ;
 *  - « Voir le rapport » l'affiche dans l'onglet Analyse avec un bandeau (ce n'est pas la situation actuelle) ;
 *  - PDF (contenu lu) et Excel ; le PDF s'ouvre dans un onglet du navigateur, aucune fenetre de message.
 * Tout ce qui est pose (stocks, rapports du test) est retire a la fin.
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
const DEBUT = q('SELECT NOW() - INTERVAL 1 SECOND');

const [PS, CIP_S, STOCK_S] = q("SELECT CONCAT_WS('|', s.lg_FAMILLE_ID, f.int_CIP, s.int_NUMBER_AVAILABLE) FROM t_famille_stock s JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID"
  + " WHERE s.lg_EMPLACEMENT_ID = '1' AND f.str_STATUT = 'enable' AND f.int_CIP <> '' AND s.int_NUMBER_AVAILABLE = (SELECT h.qteFinale FROM hmvtproduit h WHERE h.lg_FAMILLE_ID = s.lg_FAMILLE_ID"
  + " AND h.lg_EMPLACEMENT_ID = '1' ORDER BY h.createdAt DESC, h.typeMvt = '05' LIMIT 1) ORDER BY f.str_NAME LIMIT 1").split('|');
/* produit sans aucun mouvement : sur une base ou tous ont deja vendu (banc peuple sur 3 ans), le test en cree un,
   copie d'un produit existant, qu'il retire a la fin */
let [PN, CIP_N, STOCK_N] = q("SELECT CONCAT_WS('|', s.lg_FAMILLE_ID, f.int_CIP, s.int_NUMBER_AVAILABLE) FROM t_famille_stock s JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID"
  + " WHERE s.lg_EMPLACEMENT_ID = '1' AND f.str_STATUT = 'enable' AND f.int_CIP <> '' AND s.int_NUMBER_AVAILABLE >= 0"
  + " AND NOT EXISTS (SELECT 1 FROM hmvtproduit h WHERE h.lg_FAMILLE_ID = s.lg_FAMILLE_ID) ORDER BY f.str_NAME LIMIT 1").split('|');
const PN_CREE = !PN;
if (PN_CREE) {
  PN = 'E2E-AUDR-PN'; CIP_N = '9990418'; STOCK_N = '0';
  exec(`DELETE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${PN}'; DELETE FROM t_famille WHERE lg_FAMILLE_ID = '${PN}';`
    + `CREATE TEMPORARY TABLE tmp_f SELECT * FROM t_famille WHERE lg_FAMILLE_ID = '${PS}';`
    + `UPDATE tmp_f SET lg_FAMILLE_ID = '${PN}', int_CIP = '${CIP_N}', str_NAME = 'ZZ E2E AUDIT RAPPORTS SANS MOUVEMENT', int_EAN13 = NULL;`
    + 'INSERT INTO t_famille SELECT * FROM tmp_f; DROP TEMPORARY TABLE tmp_f;'
    + `CREATE TEMPORARY TABLE tmp_s SELECT * FROM t_famille_stock WHERE lg_FAMILLE_ID = '${PS}' AND lg_EMPLACEMENT_ID = '1' LIMIT 1;`
    + `UPDATE tmp_s SET lg_FAMILLE_STOCK_ID = '${PN}', lg_FAMILLE_ID = '${PN}', int_NUMBER_AVAILABLE = 0, int_NUMBER = 0;`
    + 'INSERT INTO t_famille_stock SELECT * FROM tmp_s; DROP TEMPORARY TABLE tmp_s;');
}
const stock = (f, v) => exec(`UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = ${v}, int_NUMBER = ${v} WHERE lg_FAMILLE_ID = '${f}' AND lg_EMPLACEMENT_ID = '1'`);
const rapportsDuTest = () => q(`SELECT COUNT(*) FROM t_audit_rapport WHERE created_at >= '${DEBUT}'`);

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const dialogues = [];
  try {
    const ctx = await b.newContext({ viewport: { width: 1500, height: 950 }, acceptDownloads: true });
    const p = await ctx.newPage();
    p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
    await p.goto('http://localhost:8080/prestige/security/index.html', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN_SUPPORT); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 60000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('auditrapprochements', 'Audit & rapprochements', ''));
    await p.waitForFunction(() => document.querySelectorAll('.audit-tuile').length >= 7, null, { timeout: 60000 });
    ok('Ouvrir l\'écran ne conserve aucun rapport', rapportsDuTest() === '0');

    const lancer = async () => {
      const n = +rapportsDuTest();
      await p.click('text=Lancer l\'analyse');
      /* le message « rapport conserve » du lancement precedent est encore affiche : on attend le rapport en base */
      for (let i = 0; i < 120 && +rapportsDuTest() < n + 1; i++) { await p.waitForTimeout(500); }
      await p.waitForFunction((m) => /rapport conservé/.test(Ext.ComponentQuery.query('auditrapprochements #resume')[0].text || ''), n, { timeout: 60000 });
      return +rapportsDuTest() === n + 1;
    };
    stock(PS, +STOCK_S + 7);
    ok('« Lancer l\'analyse » conserve le rapport 1', await lancer());
    const r1 = q(`SELECT CONCAT_WS('|', id, auteur, debut, fin) FROM t_audit_rapport WHERE created_at >= '${DEBUT}' ORDER BY created_at LIMIT 1`).split('|');
    /* auteur = le compte connecte (« Super Admin » sur le banc, compte d'essai e2e-sa sur le poste local) */
    const auteur = q(`SELECT str_FIRST_NAME FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN_SUPPORT}'`);
    ok('Rapport 1 : auteur et période du billetage enregistrés', !!auteur && String(r1[1]).includes(auteur) &&/^\d{4}-\d{2}-01$/.test(r1[2]), r1.slice(1).join(' '));
    await p.waitForTimeout(1100);
    stock(PS, STOCK_S);
    stock(PN, -3);
    ok('« Lancer l\'analyse » conserve le rapport 2', await lancer());

    /* onglet Rapports */
    await p.click('.x-tab:has-text("Rapports")');
    await p.waitForFunction(() => Ext.ComponentQuery.query('auditrapprochements #grilleRapports')[0].getStore().getCount() >= 2, null, { timeout: 20000 });
    const lignes = await p.evaluate(() => Ext.ComponentQuery.query('auditrapprochements #grilleRapports')[0].getStore().getRange().map((r) => r.data));
    const ids = q(`SELECT id FROM t_audit_rapport WHERE created_at >= '${DEBUT}' ORDER BY created_at DESC`).split(/\r?\n/);
    ok('Liste : les deux rapports, le plus récent en tête', lignes[0].id === ids[0] && lignes[1].id === ids[1], lignes.slice(0, 2).map((l) => l.date).join(' / '));
    ok('Liste : nombre d\'écarts par contrôle (stocks négatifs : 1 de plus dans le rapport 2)', lignes[0].resume.STOCK_NEGATIF === lignes[1].resume.STOCK_NEGATIF + 1,
      JSON.stringify([lignes[1].resume, lignes[0].resume]));
    const boutons = () => p.evaluate(() => { const t = Ext.ComponentQuery.query('auditrapprochements #ongletRapports')[0];
      return ['voir', 'comparer', 'pdf', 'excel'].map((k) => !t.down('#' + k).isDisabled()); });
    ok('Aucun rapport coché : boutons inactifs', JSON.stringify(await boutons()) === '[false,false,false,false]');

    /* comparaison des deux */
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('auditrapprochements #grilleRapports')[0]; g.getSelectionModel().select([g.getStore().getAt(0), g.getStore().getAt(1)]); });
    ok('Deux rapports cochés : « Comparer » actif, « Voir » et éditions inactifs', JSON.stringify(await boutons()) === '[false,true,false,false]');
    await p.click('text=Comparer les 2 rapports cochés');
    await p.waitForFunction(() => /Nouveaux écarts/.test(Ext.ComponentQuery.query('auditrapprochements #comparaison')[0].getEl().dom.textContent), null, { timeout: 20000 });
    const comp = await p.evaluate(() => {
      const lignesT = [...document.querySelectorAll('.audit-comp tr')].map((tr) => [...tr.children].map((c) => c.textContent));
      return lignesT;
    });
    const ligne = (titre) => comp.find((l) => l[0].indexOf(titre) === 0) || [];
    ok('Comparaison : l\'écart de stock du produit modifié est résolu', (ligne('Stock / historique')[5] || '').indexOf(CIP_S) >= 0, (ligne('Stock / historique')[5] || '').slice(0, 120));
    ok('Comparaison : le stock négatif est un nouvel écart', (ligne('Stocks négatifs')[4] || '').indexOf(CIP_N) >= 0, (ligne('Stocks négatifs')[4] || '').slice(0, 120));

    /* voir un rapport */
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('auditrapprochements #grilleRapports')[0]; g.getSelectionModel().deselectAll(); g.getSelectionModel().select(g.getStore().getAt(1)); });
    ok('Un rapport coché : « Voir », PDF et Excel actifs', JSON.stringify(await boutons()) === '[true,false,true,true]');
    await p.click('text=Voir le rapport');
    await p.waitForFunction(() => { const b = Ext.ComponentQuery.query('auditrapprochements #bandeau')[0]; return b && b.isVisible() && /Rapport conservé/.test(b.getEl().dom.textContent); }, null, { timeout: 20000 });
    const voir = await p.evaluate(() => ({ actif: Ext.ComponentQuery.query('auditrapprochements')[0].getActiveTab().itemId,
      lignes: Ext.ComponentQuery.query('auditrapprochements #grilleDetail')[0].getStore().getRange().map((r) => r.data.cip) }));
    ok('« Voir » : rapport 1 dans l\'onglet Analyse, bandeau affiché, écart du produit modifié présent', voir.actif === 'ongletAnalyse' && voir.lignes.indexOf(CIP_S) >= 0, voir.actif);
    await p.click('.audit-retour');
    await p.waitForFunction(() => !Ext.ComponentQuery.query('auditrapprochements #bandeau')[0].isVisible(), null, { timeout: 20000 });
    ok('« Revenir à l\'analyse du jour » retire le bandeau sans conserver de rapport', rapportsDuTest() === '2');

    /* editions */
    await p.click('.x-tab:has-text("Rapports")');
    await p.evaluate(() => { const g = Ext.ComponentQuery.query('auditrapprochements #grilleRapports')[0]; g.getSelectionModel().select(g.getStore().getAt(1)); });
    const idPdf = await p.evaluate(() => Ext.ComponentQuery.query('auditrapprochements #pdf')[0].getId());
    /* Chromium sans fenetre telecharge le PDF et l'onglet reste vide : on lit l'adresse demandee par l'onglet */
    const [onglet, demandePdf] = await Promise.all([ctx.waitForEvent('page', { timeout: 20000 }),
      ctx.waitForEvent('request', { predicate: (r) => /rapports\/.+\/pdf/.test(r.url()), timeout: 20000 }).catch(() => null), p.click('#' + idPdf)]);
    ok('PDF : ouvert dans un onglet du navigateur', !!onglet && !!demandePdf && demandePdf.frame().page() === onglet, demandePdf && demandePdf.url());
    const pdf = await p.evaluate(async (id) => { const r = await fetch('../api/v1/audit/rapports/' + id + '/pdf');
      return { type: r.headers.get('content-type'), b64: btoa(String.fromCharCode(...new Uint8Array(await r.arrayBuffer()))) }; }, ids[1]);
    const f = path.join(os.tmpdir(), 'audit-e2e.pdf');
    fs.writeFileSync(f, Buffer.from(pdf.b64, 'base64'));
    const texte = execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', f, '-'], { encoding: 'utf8' });
    fs.unlinkSync(f);
    ok('PDF : titre, synthèse des contrôles et ligne du produit modifié', /application\/pdf/.test(pdf.type) && /Audit & rapprochements/.test(texte)
      && /Stocks négatifs/.test(texte) && texte.indexOf(CIP_S) >= 0, texte.slice(0, 120));
    const xls = await p.evaluate(async (id) => { const r = await fetch('../api/v1/audit/rapports/' + id + '/excel');
      const u = new Uint8Array(await r.arrayBuffer()); return { type: r.headers.get('content-type'), debut: Array.from(u.slice(0, 4)), taille: u.length,
        nom: r.headers.get('content-disposition') }; }, ids[1]);
    ok('Excel : fichier .xls (classeur) téléchargé', /ms-excel/.test(xls.type) && xls.debut.join(',') === '208,207,17,224' && /\.xls/.test(xls.nom), JSON.stringify(xls));
    ok('Aucune fenêtre de message', dialogues.length === 0, dialogues.join(' | '));
  } finally {
    stock(PS, STOCK_S);
    stock(PN, STOCK_N);
    exec(`DELETE FROM t_audit_rapport WHERE created_at >= '${DEBUT}'`);
    await b.close();
    ok('Données retirées (stocks, rapports du test)', rapportsDuTest() === '0'
      && q(`SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${PN}' AND lg_EMPLACEMENT_ID = '1'`) === STOCK_N);
    if (PN_CREE) {
      exec(`DELETE FROM t_famille_stock WHERE lg_FAMILLE_ID = '${PN}'; DELETE FROM t_famille WHERE lg_FAMILLE_ID = '${PN}';`);
    }
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + ' OK');
  process.exit(ko ? 1 : 0);
})();
