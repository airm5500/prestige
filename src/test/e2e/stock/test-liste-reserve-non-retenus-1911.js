/* PLAN DU 19/11, POINT 9 : LISTE RÉSERVE, IMPORT D'UN FICHIER DE CODES : CODES NON RETENUS.
 * Avant : au plus 30 codes inconnus sur une ligne (« … » ensuite), seulement le nombre de codes en double, ni export ni
 * impression. Desormais : tous les codes inconnus, les codes en double un par un (désignation, « lu n fois »,
 * « même produit que »), un Excel et une impression des codes non retenus (inconnus, ambigus, en double).
 *
 * Jeu d'essai (retire a la fin) : 4 produits clones « ZZAUDIT NR … » aux codes inventes (prefixe 81773, absent de la
 * base, verifie au depart) : N1 CIP 8177301 ; N2 CIP 8177302, EAN 8177300000029 ; N3 et N4 : meme EAN 8177300000036.
 * Fichier CSV : 45 codes inconnus (8177399001 a 8177399045), l'un lu deux fois ; N1 lu trois fois ; l'EAN de N2 puis le
 * CIP de N2 (meme produit) deux fois ; l'EAN partage de N3 / N4 ; une cellule de texte.
 * Parcours a la souris : menu Gestion des reserves, onglet LISTE RÉSERVE, « Importer CIP/EAN », choix du fichier, puis
 * « Excel des codes non retenus » et « Imprimer ».
 * Controles :
 *  - panneau : les 45 inconnus tous ecrits (aucun « … ») ; 3 codes en double, chacun avec sa designation et son detail ;
 *  - rapprochement panneau / Excel / impression / attendu du fichier, ligne par ligne (motif, code, designation,
 *    detail) ; nombres du resume = nombres des lignes ;
 *  - delais : Excel et impression sous leur plafond ;
 *  - bilan : import, Excel et impression n'ecrivent rien en base ; aucune fenetre surgissante, aucune erreur JavaScript.
 * Lancement seul : node src/test/e2e/stock/test-liste-reserve-non-retenus-1911.js
 */
const C = require('../audits/commun');
const V = require('../outils/vues');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ok, q, exec } = C;

const EMPL = '1';
const PLAFOND_EXCEL_MS = 4000;
const PLAFOND_IMPRESSION_MS = 2000;
const P = [
  { k: 1, cip: '8177301', ean: null },
  { k: 2, cip: '8177302', ean: '8177300000029' },
  { k: 3, cip: '8177303', ean: '8177300000036' },
  { k: 4, cip: '8177304', ean: '8177300000036' },
];
const ID = (k) => 'ZZAUDIT-NR-' + k;
const IDS = P.map((x) => "'" + ID(x.k) + "'").join(',');
const INCONNUS = Array.from({ length: 45 }, (_, i) => '81773990' + String(i + 1).padStart(2, '0'));

function retirer() {
  exec(`DELETE FROM t_type_stock_famille WHERE lg_FAMILLE_ID IN (${IDS}); DELETE FROM t_prevision_produit WHERE lg_FAMILLE_ID IN (${IDS});`
    + ` DELETE FROM t_famille_stock WHERE lg_FAMILLE_ID IN (${IDS}); DELETE FROM t_famille WHERE lg_FAMILLE_ID IN (${IDS});`);
}
const traces = () => q(`SELECT CONCAT_WS('|', (SELECT COUNT(*) FROM t_famille), (SELECT SUM(COALESCE(bool_RESERVE, 0)) FROM t_famille),`
  + ` (SELECT COUNT(*) FROM t_type_stock_famille), (SELECT COUNT(*) FROM t_mouvement_reserve), (SELECT IFNULL(MAX(dt_UPDATED), '-') FROM t_famille WHERE lg_FAMILLE_ID IN (${IDS})))`);

/* fichier : inconnus (le 7e lu deux fois), N1 trois fois, EAN puis CIP de N2 (le CIP deux fois), EAN partage, texte */
const FICHIER = ['CIP', ...INCONNUS.slice(0, 10), '8177301', INCONNUS[6], '8177300000029', ...INCONNUS.slice(10), '8177301', '8177302',
  '8177300000036', '8177302', '8177301', 'à vérifier'];

(async () => {
  retirer();
  const libres = q("SELECT COUNT(*) FROM t_famille WHERE TRIM(LEADING '0' FROM REPLACE(int_CIP, ' ', '')) LIKE '81773%' OR TRIM(LEADING '0' FROM REPLACE(int_EAN13, ' ', '')) LIKE '81773%'");
  ok('Codes d\'essai absents de la base (préfixe 81773)', libres === '0', libres);
  const modeles = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " WHERE f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND COALESCE(f.bool_RESERVE, 0) = 0 ORDER BY f.lg_FAMILLE_ID LIMIT 4").split(/\r?\n/);
  P.forEach((x, i) => {
    exec(`CREATE TEMPORARY TABLE tmp_f SELECT * FROM t_famille WHERE lg_FAMILLE_ID = '${modeles[i]}';`
      + ` UPDATE tmp_f SET lg_FAMILLE_ID = '${ID(x.k)}', int_CIP = '${x.cip}', int_EAN13 = ${x.ean ? "'" + x.ean + "'" : 'NULL'}, str_NAME = 'ZZAUDIT NR ${x.k}', str_DESCRIPTION = 'ZZAUDIT NR ${x.k} PRODUIT ESSAI',`
      + ` bool_RESERVE = 0, int_SEUIL_RESERVE = NULL, int_SEUIL_MINI_RAYON = NULL, lg_FAMILLE_PARENT_ID = '${ID(x.k)}';`
      + ` INSERT INTO t_famille SELECT * FROM tmp_f; DROP TEMPORARY TABLE tmp_f;`
      + ` CREATE TEMPORARY TABLE tmp_s SELECT * FROM t_famille_stock WHERE lg_FAMILLE_ID = '${modeles[i]}' AND lg_EMPLACEMENT_ID = '${EMPL}' LIMIT 1;`
      + ` UPDATE tmp_s SET lg_FAMILLE_STOCK_ID = '${ID(x.k)}-S', lg_FAMILLE_ID = '${ID(x.k)}', int_NUMBER = ${4 + x.k}, int_NUMBER_AVAILABLE = ${4 + x.k};`
      + ` INSERT INTO t_famille_stock SELECT * FROM tmp_s; DROP TEMPORARY TABLE tmp_s;`);
  });
  const designation = (k) => q(`SELECT CONCAT_WS(' ', CAST(int_CIP AS CHAR), str_DESCRIPTION) FROM t_famille WHERE lg_FAMILLE_ID = '${ID(k)}'`);
  /* lignes attendues, dans l'ordre : inconnus (ordre du fichier), ambigus, en double (ordre du fichier) */
  const attendu = [
    ...INCONNUS.map((c) => ['Inconnu', c, '', 'aucun produit ne porte ce code']),
    ['Ambigu', '8177300000036', designation(3) + ' / ' + designation(4), 'à cocher à la main'],
    ['En double', INCONNUS[6], 'Code inconnu', 'lu 2 fois'],
    ['En double', '8177301', designation(1), 'lu 3 fois'],
    ['En double', '8177302', designation(2), 'lu 2 fois ; même produit que 8177300000029'],
  ];
  const avant = traces();

  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'liste-reserve-nr-'));
  const csv = path.join(dossier, 'codes.csv');
  fs.writeFileSync(csv, '﻿' + FICHIER.join('\r\n') + '\r\n', 'utf8');

  const sess = await C.connecter();
  const { p, erreurs } = sess;
  try {
    await p.waitForFunction(() => { const n = Ext.ComponentQuery.query('navigation')[0]; return n && n.getStore().getRootNode().findChild('id', 'reservemanager', true); }, null, { timeout: 60000 });
    const menu = await p.evaluate(() => { const r = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'reservemanager', true); return [r.parentNode.get('text'), r.get('text')]; });
    await V.ouvrirMenu(p, menu[0], menu[1]);
    await p.waitForFunction(() => Ext.getCmp('reservemanagerID'), null, { timeout: 30000 });
    await p.mouse.move(1200, 700);
    const G = '#reservemanagerID #ongletListe';
    await p.click('#' + await p.evaluate(() => Ext.getCmp('reservemanagerID').down('#ongletListe').tab.getId()));
    await p.waitForFunction(() => { const g = Ext.getCmp('reservemanagerID').down('#ongletListe'); return g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000 });

    const [choix] = await Promise.all([p.waitForEvent('filechooser', { timeout: 10000 }), V.cliquer(p, G + ' #lrImporter')]);
    await choix.setFiles(csv);
    await p.waitForFunction(() => Ext.getCmp('reservemanagerID').down('#ongletListe #lrImport').isVisible(true), null, { timeout: 30000 });
    await p.waitForTimeout(400);
    const pn = await p.evaluate(() => { const g = Ext.getCmp('reservemanagerID').down('#ongletListe');
      const vis = (x) => { const b = g.down(x); return !!b && b.isVisible(true); };
      return { resume: g.down('#lrImportResume').el.dom.innerText, detail: g.down('#lrImportDetail').el.dom.innerText,
        inconnus: Array.from(g.down('#lrImportDetail').el.dom.querySelectorAll('.lr-inconnus')).map((s) => s.innerText).join(''),
        doubles: Array.from(g.down('#lrImportDetail').el.dom.querySelectorAll('.lr-double')).map((s) => s.innerText),
        excel: vis('#lrImportExcel'), imprimer: vis('#lrImportImprimer'), lignes: g.lignesNonRetenus ? g.lignesNonRetenus() : null }; });
    ok('Résumé : 53 codes lus, 45 inconnus, 1 ambigu, 5 lectures en double (compte d\'avant gardé)', /53 code\(s\) lu\(s\)/.test(pn.resume) && /45 inconnu/.test(pn.resume) && /1 ambigu/.test(pn.resume) && /5 en double/.test(pn.resume), pn.resume);
    const ecrits = pn.inconnus.split(/,\s*/).filter(Boolean);
    ok('Panneau : les 45 codes inconnus écrits, sans « … » (avant : 30 au plus)', ecrits.join() === INCONNUS.join() && !/…/.test(pn.detail),
      ecrits.length + ' code(s) ; ' + pn.detail.slice(0, 160));
    const doublesAttendus = attendu.filter((l) => l[0] === 'En double').map((l) => l[1] + ' → ' + l[2] + ' (' + l[3] + ')');
    ok('Panneau : les 3 codes en double, chacun avec sa désignation et son détail', JSON.stringify(pn.doubles) === JSON.stringify(doublesAttendus),
      JSON.stringify(pn.doubles) + ' / ' + JSON.stringify(doublesAttendus));
    ok('Boutons « Excel des codes non retenus » et « Imprimer » visibles', pn.excel && pn.imprimer, JSON.stringify({ excel: pn.excel, imprimer: pn.imprimer }));
    ok('Lignes de l\'écran = attendu du fichier (motif, code, désignation, détail)', JSON.stringify(pn.lignes) === JSON.stringify(attendu),
      JSON.stringify((pn.lignes || []).slice(44)));

    /* Excel */
    const xlsx = path.join(dossier, 'non-retenus.xlsx');
    const t0 = Date.now();
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), V.cliquer(p, G + ' #lrImportExcel')]);
    await dl.saveAs(xlsx);
    const dExcel = Date.now() - t0;
    ok('Délai : Excel en moins de ' + PLAFOND_EXCEL_MS + ' ms', dExcel < PLAFOND_EXCEL_MS, dExcel + ' ms');
    ok('Nom du fichier Excel', dl.suggestedFilename() === 'import_reserve_codes_non_retenus.xlsx', dl.suggestedFilename());
    const lu = JSON.parse(execFileSync('python', ['-X', 'utf8', '-c', `import sys,json,openpyxl
ws=openpyxl.load_workbook(sys.argv[1]).active
print(json.dumps([[('' if c is None else str(c)) for c in r] for r in ws.iter_rows(values_only=True)]))`, xlsx], { encoding: 'utf8' }));
    const entete = lu.findIndex((r) => r[0] === 'Motif');
    const lignesExcel = lu.slice(entete + 1).filter((r) => r.some((c) => c !== '')).map((r) => r.slice(0, 4));
    ok('Excel : titre, codes lus et nombres par motif', lu[0][0] === 'IMPORT LISTE RÉSERVE : CODES NON RETENUS' && lu.some((r) => r[0] === 'Codes lus : ' + (FICHIER.length - 2))
      && lu.some((r) => r[0] === '45 inconnu(s) · 1 ambigu(s) · 3 code(s) en double'), JSON.stringify(lu.slice(0, entete + 1)));
    ok('Rapprochement Excel / écran, ligne par ligne', JSON.stringify(lignesExcel) === JSON.stringify(attendu),
      lignesExcel.length + ' lignes ; ' + JSON.stringify(lignesExcel.slice(44)));
    ok('Excel : codes en texte, zéros et longueur gardés', lignesExcel.every((r, i) => r[1] === attendu[i][1]));

    /* impression : cadre invisible, impression du navigateur */
    const t1 = Date.now();
    await V.cliquer(p, G + ' #lrImportImprimer');
    await p.waitForFunction(() => { const f = document.getElementById('lr-impression-non-retenus');
      return f && f.contentDocument && f.contentDocument.querySelectorAll('table.lr-non-retenus tbody tr').length > 0; }, null, { timeout: 15000 });
    const dImp = Date.now() - t1;
    ok('Délai : impression prête en moins de ' + PLAFOND_IMPRESSION_MS + ' ms', dImp < PLAFOND_IMPRESSION_MS, dImp + ' ms');
    const imp = await p.evaluate(() => { const d = document.getElementById('lr-impression-non-retenus').contentDocument;
      return { titre: d.querySelector('h3').innerText, entete: d.querySelector('p').innerText,
        lignes: Array.from(d.querySelectorAll('table.lr-non-retenus tbody tr')).map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => td.innerText.trim())) }; });
    ok('Impression : titre et nombres', imp.titre === 'IMPORT LISTE RÉSERVE : CODES NON RETENUS' && /53 code\(s\) lu\(s\) · 45 inconnu\(s\) · 1 ambigu\(s\) · 3 code\(s\) en double/.test(imp.entete), imp.entete);
    ok('Rapprochement impression / Excel / écran, ligne par ligne', JSON.stringify(imp.lignes) === JSON.stringify(attendu), imp.lignes.length + ' lignes');
    ok('Aucune fenêtre surgissante', await p.evaluate(() => !Ext.ComponentQuery.query('messagebox, window').some((w) => w.isVisible() && w.modal)));
    ok('Bilan : import, Excel et impression n\'écrivent rien en base', traces() === avant, avant + ' -> ' + traces());
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await sess.b.close().catch(() => {});
    retirer();
    fs.rmSync(dossier, { recursive: true, force: true });
    ok('Nettoyage : produits d\'essai retirés', q(`SELECT COUNT(*) FROM t_famille WHERE lg_FAMILLE_ID IN (${IDS})`) === '0');
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
