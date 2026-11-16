/* LISTE RÉSERVE : IMPORT D'UN FICHIER DE CODES CIP / EAN13 (16/11).
 *
 * Jeu d'essai (retire a la fin) : 6 produits clones (designation « ZZAUDIT IM … ») aux codes inventes (prefixe 81772,
 * absent de la base, verifie au depart) :
 *   I1 CIP 0817721 (zero de tete), pas d'EAN, hors reserve ;
 *   I2 CIP 8177202, EAN 8177200000025, hors reserve ;
 *   I3 CIP 8177203, EAN 0817720000035 (zero de tete), hors reserve ;
 *   I4 CIP 8177204, deja en reserve (stock reserve 0) ;
 *   I5 et I6 : meme EAN 8177200000056 (code ambigu), hors reserve.
 * Fichier CSV : en-tete « CIP », I1 sans son zero, l'EAN de I2 deux fois, le CIP de I2 (meme produit), l'EAN de I3 avec
 * espaces, I4, l'EAN partage, un code inconnu, une cellule de texte.
 * Fichier XLSX : les memes codes en cellules numeriques (zeros de tete perdus par Excel).
 * Parcours a la souris : menu Gestion des reserves, onglet LISTE RÉSERVE, « Importer CIP/EAN », choix du fichier,
 * « Cocher les 3 produit(s) reconnu(s) » confirme dans le bouton, recherche, « Enregistrer » confirme dans le bouton.
 * Controles :
 *  - rapprochement fichier / panneau / base : chaque produit reconnu, ligne par ligne (code lu, par CIP ou EAN13, CIP et
 *    designation en base, stock reserve) ; resume : lus, reconnus, deja en reserve, inconnus, ambigus, doublons ;
 *  - bilan : l'import et la validation n'ecrivent rien en base ; l'enregistrement met exactement I1, I2, I3 en reserve
 *    (ligne de stock reserve a 0), I4, I5, I6 et les autres produits intacts ;
 *  - les coches de la grille = produits reconnus a cocher ; bandeau : 3 nouveaux ;
 *  - second import (XLSX) apres enregistrement : les 4 reconnus sont « Déjà en réserve », rien a cocher ;
 *  - aucune fenetre surgissante, aucune erreur JavaScript ; delai de l'import sous son plafond.
 * Lancement seul : node src/test/e2e/stock/test-liste-reserve-import-1611.js
 */
const C = require('../audits/commun');
const V = require('../outils/vues');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ok, q, exec } = C;

const EMPL = '1';
const PLAFOND_IMPORT_MS = 5000;
const P = [
  { k: 1, cip: '0817721', ean: null, res: 0 },
  { k: 2, cip: '8177202', ean: '8177200000025', res: 0 },
  { k: 3, cip: '8177203', ean: '0817720000035', res: 0 },
  { k: 4, cip: '8177204', ean: null, res: 1 },
  { k: 5, cip: '8177205', ean: '8177200000056', res: 0 },
  { k: 6, cip: '8177206', ean: '8177200000056', res: 0 },
];
const ID = (k) => 'ZZAUDIT-IM-' + k;
const IDS = P.map((x) => "'" + ID(x.k) + "'").join(',');
const INCONNU = '8177299';

function retirer() {
  exec(`DELETE FROM t_suggestion_reserve_detail WHERE lg_FAMILLE_ID IN (${IDS}); DELETE FROM t_mouvement_reserve WHERE lg_FAMILLE_ID IN (${IDS});`
    + ` DELETE FROM t_type_stock_famille WHERE lg_FAMILLE_ID IN (${IDS}); DELETE FROM t_prevision_produit WHERE lg_FAMILLE_ID IN (${IDS});`
    + ` DELETE FROM t_famille_stock WHERE lg_FAMILLE_ID IN (${IDS}); DELETE FROM t_famille WHERE lg_FAMILLE_ID IN (${IDS});`);
}
/* etat en base : id -> bool|capacite|seuil|lignes de stock reserve|stock reserve */
const base = () => Object.fromEntries(q(`SELECT f.lg_FAMILLE_ID, CONCAT_WS('|', COALESCE(f.bool_RESERVE, 0), IFNULL(f.int_SEUIL_RESERVE, 'N'), IFNULL(f.int_SEUIL_MINI_RAYON, 'N'),`
  + ` (SELECT COUNT(*) FROM t_type_stock_famille t WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND t.lg_TYPE_STOCK_ID = '2' AND t.lg_EMPLACEMENT_ID = '${EMPL}'),`
  + ` IFNULL((SELECT SUM(t.int_NUMBER) FROM t_type_stock_famille t WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND t.lg_TYPE_STOCK_ID = '2' AND t.lg_EMPLACEMENT_ID = '${EMPL}'), 0))`
  + ` FROM t_famille f WHERE f.lg_FAMILLE_ID IN (${IDS}) ORDER BY f.lg_FAMILLE_ID`).split(/\r?\n/).filter(Boolean).map((l) => l.split('\t')));
const autres = () => q(`SELECT CONCAT(COUNT(*), '|', SUM(COALESCE(bool_RESERVE, 0)), '|', SUM(COALESCE(int_SEUIL_RESERVE, 0)), '|', SUM(COALESCE(int_SEUIL_MINI_RAYON, 0)),`
  + ` '|', (SELECT COUNT(*) FROM t_type_stock_famille WHERE lg_TYPE_STOCK_ID = '2'), '|', (SELECT COUNT(*) FROM t_mouvement_reserve)) FROM t_famille WHERE lg_FAMILLE_ID NOT IN (${IDS})`);

/* codes du fichier, dans l'ordre : [cellule, produit attendu ou null] */
const CODES = [
  ['CIP', null], ['817721', 1], ['8177200000025', 2], ['8177200000025', 2], ['8177202', 2], [' 0 817720 000035 ', 3],
  ['8177204', 4], ['8177200000056', null], [INCONNU, null], ['à vérifier', null],
];

(async () => {
  retirer();
  const libres = q("SELECT COUNT(*) FROM t_famille WHERE TRIM(LEADING '0' FROM REPLACE(int_CIP, ' ', '')) LIKE '81772%' OR TRIM(LEADING '0' FROM REPLACE(int_EAN13, ' ', '')) LIKE '81772%'");
  ok('Codes d\'essai absents de la base (préfixe 81772)', libres === '0', libres);
  const modeles = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " WHERE f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND COALESCE(f.bool_RESERVE, 0) = 0 ORDER BY f.lg_FAMILLE_ID LIMIT 6").split(/\r?\n/);
  P.forEach((x, i) => {
    exec(`CREATE TEMPORARY TABLE tmp_f SELECT * FROM t_famille WHERE lg_FAMILLE_ID = '${modeles[i]}';`
      + ` UPDATE tmp_f SET lg_FAMILLE_ID = '${ID(x.k)}', int_CIP = '${x.cip}', int_EAN13 = ${x.ean ? "'" + x.ean + "'" : 'NULL'}, str_NAME = 'ZZAUDIT IM ${x.k}', str_DESCRIPTION = 'ZZAUDIT IM ${x.k} PRODUIT ESSAI',`
      + ` bool_RESERVE = ${x.res}, int_SEUIL_RESERVE = ${x.res ? 9 : 'NULL'}, int_SEUIL_MINI_RAYON = ${x.res ? 4 : 'NULL'}, lg_FAMILLE_PARENT_ID = '${ID(x.k)}';`
      + ` INSERT INTO t_famille SELECT * FROM tmp_f; DROP TEMPORARY TABLE tmp_f;`
      + ` CREATE TEMPORARY TABLE tmp_s SELECT * FROM t_famille_stock WHERE lg_FAMILLE_ID = '${modeles[i]}' AND lg_EMPLACEMENT_ID = '${EMPL}' LIMIT 1;`
      + ` UPDATE tmp_s SET lg_FAMILLE_STOCK_ID = '${ID(x.k)}-S', lg_FAMILLE_ID = '${ID(x.k)}', int_NUMBER = ${5 + 3 * x.k}, int_NUMBER_AVAILABLE = ${5 + 3 * x.k};`
      + ` INSERT INTO t_famille_stock SELECT * FROM tmp_s; DROP TEMPORARY TABLE tmp_s;`
      + ` INSERT INTO t_prevision_produit (lg_FAMILLE_ID, lg_EMPLACEMENT_ID, methode, prevu_mois, dt_CALCUL) VALUES ('${ID(x.k)}', '${EMPL}', 'ESSAI', ${30 * x.k}, NOW());`
      + (x.res ? ` INSERT INTO t_type_stock_famille (lg_TYPE_STOCK_FAMILLE_ID, lg_FAMILLE_ID, lg_TYPE_STOCK_ID, lg_EMPLACEMENT_ID, str_NAME, str_DESCRIPTION, dt_CREATED, dt_UPDATED, str_STATUT, int_NUMBER)`
        + ` VALUES ('${ID(x.k)}-R', '${ID(x.k)}', '2', '${EMPL}', 'ESSAI', 'ESSAI', NOW(), NOW(), 'enable', 0)` : ''));
  });
  const avant = base();
  const autresAvant = autres();
  ok('Jeu d\'essai : 6 produits, I4 seul en réserve', Object.keys(avant).length === 6 && avant[ID(4)] === '1|9|4|1|0' && avant[ID(1)] === '0|N|N|0|0', JSON.stringify(avant));

  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'liste-reserve-import-'));
  const csv = path.join(dossier, 'codes.csv');
  fs.writeFileSync(csv, '﻿' + CODES.map((c) => c[0]).join('\r\n') + '\r\n', 'utf8');
  const xlsx = path.join(dossier, 'codes.xlsx');
  execFileSync('python', ['-X', 'utf8', '-c', `import sys,json,openpyxl
wb=openpyxl.Workbook(); ws=wb.active
for v in json.loads(sys.argv[2]):
    s=v.replace(' ','')
    ws.append([int(s) if s.isdigit() else v])
wb.save(sys.argv[1])`, xlsx, JSON.stringify(CODES.map((c) => c[0]))]);

  const sess = await C.connecter();
  const { p, erreurs } = sess;
  try {
    await p.waitForFunction(() => { const n = Ext.ComponentQuery.query('navigation')[0]; return n && n.getStore().getRootNode().findChild('id', 'reservemanager', true); }, null, { timeout: 60000 });
    const menu = await p.evaluate(() => { const r = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'reservemanager', true); return [r.parentNode.get('text'), r.get('text')]; });
    await V.ouvrirMenu(p, menu[0], menu[1]);
    await p.waitForFunction(() => Ext.getCmp('reservemanagerID'), null, { timeout: 30000 });
    const G = '#reservemanagerID #ongletListe';
    await p.click('#' + await p.evaluate(() => Ext.getCmp('reservemanagerID').down('#ongletListe').tab.getId()));
    const charge = () => p.waitForFunction(() => { const g = Ext.getCmp('reservemanagerID').down('#ongletListe'); return g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await charge();

    const bouton = await p.evaluate(() => { const b = Ext.getCmp('reservemanagerID').down('#ongletListe #lrImporter'); return b && b.isVisible(true) ? b.getText() : null; });
    ok('Bouton « Importer CIP/EAN » visible dans l\'onglet', bouton === 'Importer CIP/EAN', bouton);

    const importer = async (fichier) => {
      const t0 = Date.now();
      const [choix] = await Promise.all([p.waitForEvent('filechooser', { timeout: 10000 }), V.cliquer(p, G + ' #lrImporter')]);
      await choix.setFiles(fichier);
      await p.waitForFunction(() => /reconnu|illisible|Aucun|répond/.test(Ext.getCmp('reservemanagerID').down('#ongletListe #lrImporter').getText())
        || Ext.getCmp('reservemanagerID').down('#ongletListe #lrImport').isVisible(true), null, { timeout: 30000 });
      await p.waitForTimeout(300);
      return Date.now() - t0;
    };
    const panneau = () => p.evaluate(() => { const g = Ext.getCmp('reservemanagerID').down('#ongletListe'), pn = g.down('#lrImport'), gr = pn.down('#lrImportGrille');
      return { visible: pn.isVisible(true), resume: g.down('#lrImportResume').el.dom.innerText, detail: g.down('#lrImportDetail').el.dom.innerText,
        valider: g.down('#lrImportValider').getText(), validerActif: !g.down('#lrImportValider').isDisabled(),
        lignes: gr.getStore().getRange().map((r) => { const tr = gr.getView().getNode(r); return { d: r.data, cellules: tr ? Array.from(tr.querySelectorAll('td')).map((td) => td.innerText.trim()) : [] }; }) }; });

    /* 1. import CSV */
    const dImport = await importer(csv);
    ok('Délai : import du fichier en moins de ' + PLAFOND_IMPORT_MS + ' ms', dImport < PLAFOND_IMPORT_MS, dImport + ' ms');
    let pn = await panneau();
    ok('Panneau du résultat affiché au-dessus de la liste, sans fenêtre surgissante', pn.visible
      && await p.evaluate(() => !Ext.ComponentQuery.query('messagebox, window').some((w) => w.isVisible() && w.modal)));
    ok('Résumé : 8 codes lus, 4 produits reconnus dont 1 déjà en réserve, 1 inconnu, 1 ambigu, 2 en double',
      /8 code\(s\) lu\(s\), 4 produit\(s\) reconnu\(s\) dont 1 déjà en réserve/.test(pn.resume) && /1 inconnu/.test(pn.resume) && /1 ambigu/.test(pn.resume) && /2 en double/.test(pn.resume), pn.resume);
    ok('Détail : le code inconnu, le code ambigu et ses deux produits, les 2 cellules ignorées',
      pn.detail.includes(INCONNU) && /8177200000056 → 8177205 ZZAUDIT IM 5 PRODUIT ESSAI \/ 8177206 ZZAUDIT IM 6 PRODUIT ESSAI/.test(pn.detail) && /2 cellule\(s\) ignorée\(s\)/.test(pn.detail), pn.detail);
    /* rapprochement fichier / panneau / base */
    const attendus = [[1, '817721', 'CIP'], [2, '8177200000025', 'EAN13'], [3, '817720000035', 'EAN13'], [4, '8177204', 'CIP']];
    const enBase = Object.fromEntries(q(`SELECT lg_FAMILLE_ID, CONCAT_WS('|', int_CIP, str_DESCRIPTION) FROM t_famille WHERE lg_FAMILLE_ID IN (${IDS})`).split(/\r?\n/).map((l) => l.split('\t')));
    const ecarts = attendus.filter(([k, code, par], i) => { const l = pn.lignes[i]; if (!l) return true; const b = enBase[ID(k)].split('|');
      return l.d.id !== ID(k) || l.cellules[0] !== code || l.cellules[1] !== par || l.cellules[2] !== b[0] || l.cellules[3] !== b[1] || Number(l.cellules[5]) !== Number(avant[ID(k)].split('|')[4]); });
    ok('Rapprochement fichier / panneau / base, ligne par ligne (code lu, par CIP ou EAN13, CIP, désignation, stock réserve)', pn.lignes.length === 4 && ecarts.length === 0,
      JSON.stringify(pn.lignes.map((l) => l.cellules)));
    ok('État dans le panneau : I1 à I3 « À cocher », I4 « Déjà en réserve »', pn.lignes.map((l) => l.cellules[6]).join('|') === 'À cocher|À cocher|À cocher|Déjà en réserve', pn.lignes.map((l) => l.cellules[6]).join('|'));
    ok('Bouton de validation : « Cocher les 3 produit(s) reconnu(s) »', pn.valider === 'Cocher les 3 produit(s) reconnu(s)' && pn.validerActif, pn.valider);
    ok('Bilan : l\'import n\'écrit rien en base', JSON.stringify(base()) === JSON.stringify(avant) && autres() === autresAvant);
    const changementsAvant = await p.evaluate(() => Object.keys(Ext.getCmp('reservemanagerID').down('#ongletListe').changements).length);
    ok('Rien n\'est coché avant la validation', changementsAvant === 0, changementsAvant);

    /* 2. validation confirmee dans le bouton */
    await V.cliquer(p, G + ' #lrImportValider');
    pn = await panneau();
    ok('Premier clic : le bouton demande « Confirmer : cocher 3 produit(s) ? »', /Confirmer : cocher 3 produit\(s\) \?/.test(pn.valider), pn.valider);
    await p.waitForTimeout(500);
    await V.cliquer(p, G + ' #lrImportValider');
    await p.waitForTimeout(400);
    pn = await panneau();
    ok('Second clic : I1 à I3 « Coché », le bouton dit « Rien à cocher »', pn.lignes.map((l) => l.cellules[6]).join('|') === 'Coché|Coché|Coché|Déjà en réserve' && pn.valider === 'Rien à cocher' && !pn.validerActif,
      pn.lignes.map((l) => l.cellules[6]).join('|') + ' / ' + pn.valider);
    ok('Résumé : « 3 coché(s) : enregistrez pour les mettre en réserve »', /3 coché\(s\) : enregistrez/.test(pn.resume), pn.resume);
    const bandeau = await p.evaluate(() => Ext.getCmp('reservemanagerID').down('#ongletListe #lrCompteur').el.dom.innerText);
    ok('Bandeau : 3 nouveau(x), 0 retiré, 0 réglage', /3 nouveau\(x\), 0 retiré\(s\), 0 réglage/.test(bandeau), bandeau);
    ok('Bilan : la validation n\'écrit rien en base', JSON.stringify(base()) === JSON.stringify(avant) && autres() === autresAvant);

    /* coches de la grille = produits reconnus */
    await V.cliquer(p, G + ' #lrRecherche');
    await p.keyboard.type('ZZAUDIT IM', { delay: 20 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(300);
    await charge();
    const coches = await p.evaluate(() => { const g = Ext.getCmp('reservemanagerID').down('#ongletListe');
      return g.getStore().getRange().map((r) => { const tr = g.getView().getNode(r); return r.get('id') + '=' + (tr ? tr.querySelector('td').innerText.trim() : ''); }).sort().join(' '); });
    ok('Grille : I1 à I4 cochés, I5 et I6 (ambigus) non cochés', coches === [1, 2, 3, 4].map((k) => ID(k) + '=☑').concat([5, 6].map((k) => ID(k) + '=☐')).join(' '), coches);

    /* 3. enregistrement */
    await V.cliquer(p, G + ' #lrEnregistrer');
    await p.waitForTimeout(500);
    await V.cliquer(p, G + ' #lrEnregistrer');
    await p.waitForFunction(() => /enregistré|refus|Échec/.test(Ext.getCmp('reservemanagerID').down('#ongletListe #lrEnregistrer').getText()), null, { timeout: 30000 });
    const fin = await p.evaluate(() => Ext.getCmp('reservemanagerID').down('#ongletListe #lrEnregistrer').getText());
    ok('Enregistrer : « ✓ 3 produit(s) enregistré(s) »', /✓ 3 produit\(s\) enregistré\(s\)/.test(fin), fin);
    await charge();
    pn = await panneau();
    ok('Après enregistrement, le panneau d\'import est fermé', !pn.visible);
    const apres = base();
    const attendu = { ...avant };
    [1, 2, 3].forEach((k) => { attendu[ID(k)] = apres[ID(k)] && /^1\|\d+\|\d+\|1\|0$/.test(apres[ID(k)]) ? apres[ID(k)] : 'attendu 1|cap|seuil|1|0'; });
    ok('Bilan en base : I1, I2, I3 mis en réserve (ligne de stock réserve à 0), I4, I5, I6 intacts', JSON.stringify(apres) === JSON.stringify(attendu), JSON.stringify(apres));
    const [ap1, ap2] = autres().split('|').slice(4).map(Number), [av1, av2] = autresAvant.split('|').slice(4).map(Number);
    ok('Bilan : aucun autre produit modifié, 3 lignes de stock réserve de plus, aucun mouvement de réserve',
      autres().split('|').slice(0, 4).join('|') === autresAvant.split('|').slice(0, 4).join('|') && ap1 === av1 + 3 && ap2 === av2, autres() + ' / ' + autresAvant);

    /* 4. second import, classeur numerique (zeros de tete perdus) */
    await importer(xlsx);
    pn = await panneau();
    ok('XLSX : 8 codes lus, les 4 mêmes produits reconnus, tous déjà en réserve', /8 code\(s\) lu\(s\), 4 produit\(s\) reconnu\(s\) dont 4 déjà en réserve/.test(pn.resume)
      && pn.lignes.map((l) => l.d.id).join() === [1, 2, 3, 4].map(ID).join(), pn.resume + ' ' + pn.lignes.map((l) => l.d.id).join());
    ok('XLSX : rien à cocher, bouton désactivé', pn.valider === 'Rien à cocher' && !pn.validerActif, pn.valider);
    await V.cliquer(p, G + ' #lrImportFermer');
    await p.waitForTimeout(300);
    ok('« Fermer » masque le panneau', !(await panneau()).visible);
    ok('Bilan : le second import n\'écrit rien', JSON.stringify(base()) === JSON.stringify(apres));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await sess.b.close().catch(() => {});
    retirer();
    fs.rmSync(dossier, { recursive: true, force: true });
    ok('Nettoyage : produits d\'essai retirés', q(`SELECT COUNT(*) FROM t_famille WHERE lg_FAMILLE_ID IN (${IDS})`) === '0' && q(`SELECT COUNT(*) FROM t_type_stock_famille WHERE lg_FAMILLE_ID IN (${IDS})`) === '0');
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
