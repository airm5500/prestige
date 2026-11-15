/* ONGLET « LISTE RÉSERVE » (15/11) : premiere configuration de la reserve sur une longue liste de produits.
 *
 * Jeu d'essai (retire a la fin) : 6 produits clones (CIP ZZLR1 a ZZLR6, designation « ZZAUDIT LR … »), stocks
 * differents, prevision posee pour la VMJ :
 *   P1 hors reserve, VMJ 18,40 ; P2 hors reserve, VMJ 4,20 ; P3 hors reserve, sans vente (VMJ 0) ;
 *   P4 en reserve, 5 en stock reserve (verrou) ; P5 en reserve, reserve vide, capacite 6 / seuil 3 (a retirer) ;
 *   P6 en reserve, capacite 7 / seuil 3 (reglage).
 * Parcours a la souris : menu Gestion des reserves, onglet LISTE RÉSERVE, recherche, regle 2 jours et seuil ½, coches,
 * saisies dans les cellules, « Enregistrer » confirme dans le bouton.
 * Controles :
 *  - rapprochement grille / base ligne par ligne (stocks, VMJ, en reserve, capacite, seuil) ;
 *  - propositions = regle (capacite = VMJ x 2 arrondie au superieur, seuil = ½ arrondi au superieur), en bleu ;
 *    saisie a la main en violet ; sans vente : « à saisir » ; verrou : cadenas, la case ne bouge pas ;
 *  - bandeau : nombre coche sur toutes les pages, nouveaux, retires, reglages ;
 *  - bilan avant / apres en base : exactement les 5 changements (3 mis en reserve avec leur ligne de stock reserve a 0,
 *    1 retire qui garde capacite et seuil, 1 reglage), P4 intact, aucun mouvement de reserve, rien d'autre ;
 *  - refus : seuil au-dessus de la capacite, refuse par le serveur, affiche dans la colonne État, base inchangee ;
 *  - « Décocher la recherche » : le produit verrouille reste coche, le bouton le dit ;
 *  - rapprochement Excel / base et PDF / base, ligne par ligne ;
 *  - delais (regle du 15/11) : premiere page, Excel et PDF de toute la base sous leur plafond ;
 *  - aucune erreur JavaScript.
 * Lancement seul : node src/test/e2e/stock/test-liste-reserve-1511.js
 */
const C = require('../audits/commun');
const V = require('../outils/vues');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ok, q, exec } = C;
const { fichierEdition } = require('../support/editions');

const EMPL = '1';
const PLAFOND_PAGE_MS = 3000, PLAFOND_EXCEL_MS = 15000, PLAFOND_PDF_MS = 60000;
const P = [
  { k: 1, prevu: 552, res: 0, stockRes: null, cap: null, seuil: null },
  { k: 2, prevu: 126, res: 0, stockRes: null, cap: null, seuil: null },
  { k: 3, prevu: 0, res: 0, stockRes: null, cap: null, seuil: null },
  { k: 4, prevu: 90, res: 1, stockRes: 5, cap: 12, seuil: 4 },
  { k: 5, prevu: 60, res: 1, stockRes: 0, cap: 6, seuil: 3 },
  { k: 6, prevu: 30, res: 1, stockRes: 0, cap: 7, seuil: 3 },
];
const ID = (k) => 'ZZAUDIT-LR-' + k;
const IDS = P.map((x) => "'" + ID(x.k) + "'").join(',');
const lireXlsx = (f) => JSON.parse(execFileSync('python', ['-X', 'utf8', '-c', `import json,sys,openpyxl
wb=openpyxl.load_workbook(sys.argv[1])
print(json.dumps({ws.title:[[c.value for c in r] for r in ws.iter_rows()] for ws in wb.worksheets},ensure_ascii=False,default=str))`, f], { encoding: 'utf8', maxBuffer: 1 << 28 }));
const texte = (f) => execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', f, '-'], { encoding: 'utf8', maxBuffer: 1 << 28 });

function retirer() {
  exec(`DELETE FROM t_suggestion_reserve_detail WHERE lg_FAMILLE_ID IN (${IDS}); DELETE FROM t_mouvement_reserve WHERE lg_FAMILLE_ID IN (${IDS});`
    + ` DELETE FROM t_type_stock_famille WHERE lg_FAMILLE_ID IN (${IDS}); DELETE FROM t_prevision_produit WHERE lg_FAMILLE_ID IN (${IDS});`
    + ` DELETE FROM t_famille_stock WHERE lg_FAMILLE_ID IN (${IDS}); DELETE FROM t_famille WHERE lg_FAMILLE_ID IN (${IDS});`);
}
/* etat en base : id -> bool|capacite|seuil|lignes de stock reserve|stock reserve */
const base = () => Object.fromEntries(q(`SELECT f.lg_FAMILLE_ID, CONCAT_WS('|', COALESCE(f.bool_RESERVE, 0), IFNULL(f.int_SEUIL_RESERVE, 'N'), IFNULL(f.int_SEUIL_MINI_RAYON, 'N'),`
  + ` (SELECT COUNT(*) FROM t_type_stock_famille t WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND t.lg_TYPE_STOCK_ID = '2' AND t.lg_EMPLACEMENT_ID = '${EMPL}'),`
  + ` IFNULL((SELECT SUM(t.int_NUMBER) FROM t_type_stock_famille t WHERE t.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND t.lg_TYPE_STOCK_ID = '2' AND t.lg_EMPLACEMENT_ID = '${EMPL}'), 0))`
  + ` FROM t_famille f WHERE f.lg_FAMILLE_ID IN (${IDS})`).split(/\r?\n/).filter(Boolean).map((l) => l.split('\t')));

(async () => {
  retirer();
  const modeles = q("SELECT f.lg_FAMILLE_ID FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
    + " WHERE f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND COALESCE(f.bool_RESERVE, 0) = 0 ORDER BY f.lg_FAMILLE_ID LIMIT 6").split(/\r?\n/);
  P.forEach((x, i) => {
    exec(`CREATE TEMPORARY TABLE tmp_f SELECT * FROM t_famille WHERE lg_FAMILLE_ID = '${modeles[i]}';`
      + ` UPDATE tmp_f SET lg_FAMILLE_ID = '${ID(x.k)}', int_CIP = 'ZZLR${x.k}', int_EAN13 = NULL, str_NAME = 'ZZAUDIT LR ${x.k}', str_DESCRIPTION = 'ZZAUDIT LR ${x.k} PRODUIT ESSAI',`
      + ` bool_RESERVE = ${x.res}, int_SEUIL_RESERVE = ${x.cap === null ? 'NULL' : x.cap}, int_SEUIL_MINI_RAYON = ${x.seuil === null ? 'NULL' : x.seuil}, lg_FAMILLE_PARENT_ID = '${ID(x.k)}';`
      + ` INSERT INTO t_famille SELECT * FROM tmp_f; DROP TEMPORARY TABLE tmp_f;`
      + ` CREATE TEMPORARY TABLE tmp_s SELECT * FROM t_famille_stock WHERE lg_FAMILLE_ID = '${modeles[i]}' AND lg_EMPLACEMENT_ID = '${EMPL}' LIMIT 1;`
      + ` UPDATE tmp_s SET lg_FAMILLE_STOCK_ID = '${ID(x.k)}-S', lg_FAMILLE_ID = '${ID(x.k)}', int_NUMBER = ${10 + 7 * x.k}, int_NUMBER_AVAILABLE = ${10 + 7 * x.k};`
      + ` INSERT INTO t_famille_stock SELECT * FROM tmp_s; DROP TEMPORARY TABLE tmp_s;`
      + ` INSERT INTO t_prevision_produit (lg_FAMILLE_ID, lg_EMPLACEMENT_ID, methode, prevu_mois, dt_CALCUL) VALUES ('${ID(x.k)}', '${EMPL}', 'ESSAI', ${x.prevu}, NOW());`
      + (x.res ? ` INSERT INTO t_type_stock_famille (lg_TYPE_STOCK_FAMILLE_ID, lg_FAMILLE_ID, lg_TYPE_STOCK_ID, lg_EMPLACEMENT_ID, str_NAME, str_DESCRIPTION, dt_CREATED, dt_UPDATED, str_STATUT, int_NUMBER)`
        + ` VALUES ('${ID(x.k)}-R', '${ID(x.k)}', '2', '${EMPL}', 'ESSAI', 'ESSAI', NOW(), NOW(), 'enable', ${x.stockRes})` : ''));
  });
  const avant = base();
  const mouvAvant = q(`SELECT COUNT(*) FROM t_mouvement_reserve WHERE lg_FAMILLE_ID IN (${IDS})`);
  const autresAvant = q(`SELECT CONCAT(COUNT(*), '|', SUM(COALESCE(bool_RESERVE, 0)), '|', SUM(COALESCE(int_SEUIL_RESERVE, 0)), '|', SUM(COALESCE(int_SEUIL_MINI_RAYON, 0))) FROM t_famille WHERE lg_FAMILLE_ID NOT IN (${IDS})`);
  ok('Jeu d\'essai : 6 produits, 3 hors réserve, 3 en réserve dont 1 avec stock réserve', Object.keys(avant).length === 6 && avant[ID(4)] === '1|12|4|1|5', JSON.stringify(avant));

  const sess = await C.connecter();
  const { p, api, erreurs } = sess;
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'liste-reserve-'));
  try {
    await p.waitForFunction(() => { const n = Ext.ComponentQuery.query('navigation')[0]; return n && n.getStore().getRootNode().findChild('id', 'reservemanager', true); }, null, { timeout: 60000 });
    const menu = await p.evaluate(() => { const r = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'reservemanager', true); return [r.parentNode.get('text'), r.get('text')]; });
    await V.ouvrirMenu(p, menu[0], menu[1]);
    await p.waitForFunction(() => Ext.getCmp('reservemanagerID'), null, { timeout: 30000 });
    const G = '#reservemanagerID #ongletListe';
    await p.click('#' + await p.evaluate(() => Ext.getCmp('reservemanagerID').down('#ongletListe').tab.getId()));
    const charge = () => p.waitForFunction(() => { const g = Ext.getCmp('reservemanagerID').down('#ongletListe'); return g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    const t0 = Date.now();
    await charge();
    await p.waitForTimeout(300);
    const premierePage = Date.now() - t0;
    ok('Délai : première page (toute la base) affichée en moins de ' + PLAFOND_PAGE_MS + ' ms', premierePage < PLAFOND_PAGE_MS, premierePage + ' ms');
    const totalTous = await p.evaluate(() => Ext.getCmp('reservemanagerID').down('#ongletListe').getStore().getTotalCount());
    const totalBase = Number(q("SELECT COUNT(*) FROM t_famille f JOIN t_famille_stock fs ON fs.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND fs.lg_EMPLACEMENT_ID = '1' AND fs.str_STATUT = 'enable'"
      + " WHERE f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0"));
    ok('Sans filtre : le total de la grille = nombre de produits en base (' + totalBase + ')', totalTous === totalBase && totalBase > 6, totalTous);

    /* recherche */
    await V.cliquer(p, G + ' #lrRecherche');
    await p.keyboard.type('ZZAUDIT LR', { delay: 20 });
    await p.keyboard.press('Enter');
    await p.waitForTimeout(300);
    await charge();
    const lignes = () => p.evaluate(() => { const g = Ext.getCmp('reservemanagerID').down('#ongletListe');
      return g.getStore().getRange().map((r) => { const tr = g.getView().getNode(r); return { id: r.get('id'), d: r.data, cellules: tr ? Array.from(tr.querySelectorAll('td')).map((td) => td.innerText.trim()) : [] }; }); });
    let L = await lignes();
    ok('Recherche « ZZAUDIT LR » : les 6 produits d\'essai', L.length === 6 && L.every((l) => /^ZZAUDIT-LR-/.test(l.id)), L.map((l) => l.id).join(','));
    const vmjBase = (x) => (x.prevu > 0 ? Math.round(x.prevu / 30 * 100) / 100 : 0);
    const ecarts = L.filter((l) => { const x = P.find((y) => ID(y.k) === l.id), b = avant[l.id].split('|');
      return l.d.enReserve !== (b[0] === '1') || String(l.d.capacite === null ? 'N' : l.d.capacite) !== b[1] || String(l.d.seuilMini === null ? 'N' : l.d.seuilMini) !== b[2]
        || l.d.stockReserve !== Number(b[4]) || l.d.stockRayon !== 10 + 7 * x.k || Math.abs((l.d.vmj || 0) - vmjBase(x)) > 1e-9; });
    ok('Rapprochement grille / base, ligne par ligne (en réserve, capacité, seuil, stocks, VMJ = prévision / 30)', ecarts.length === 0, JSON.stringify(ecarts.map((e) => e.d)));
    const cellule = (l, n) => l.cellules[n] || '';
    L = await lignes();
    const l4 = L.find((l) => l.id === ID(4));
    ok('P4 (stock réserve 5) : cadenas, pas de case', /🔒/.test(cellule(l4, 0)) && !/[☐☑]/.test(cellule(l4, 0)), cellule(l4, 0));
    ok('À l\'ouverture, les produits déjà en réserve sont cochés, les autres non', L.filter((l) => /☑|🔒/.test(cellule(l, 0))).map((l) => l.id).sort().join() === [ID(4), ID(5), ID(6)].join(), L.map((l) => cellule(l, 0)).join(''));

    /* regle : 2 jours, seuil ½ */
    await V.cliquer(p, G + ' #lrJours');
    await p.keyboard.press('Control+A');
    await p.keyboard.type('2');
    await p.keyboard.press('Tab');
    await V.cliquer(p, G + ' #lrSeuil button[valeur=DEMI]');
    await p.waitForTimeout(300);

    const caseDe = async (id) => p.locator('.x-grid-row').filter({ hasText: 'ZZLR' + id.slice(-1) }).first().locator('.lr-case, .lr-cadenas');
    for (const k of [1, 2, 3]) { await (await caseDe(ID(k))).click(); await p.waitForTimeout(150); }
    await (await caseDe(ID(4))).click({ force: true }).catch(() => {});
    await (await caseDe(ID(5))).click();
    await p.waitForTimeout(300);
    L = await lignes();
    const vu = (k) => L.find((l) => l.id === ID(k));
    /* P1 : 18,4 x 2 = 36,8 -> 37 ; ½ -> 19 ; P2 : 4,2 x 2 = 8,4 -> 9 ; ½ -> 5 */
    ok('Proposition P1 (VMJ 18,40 × 2 j, ½) : capacité 37, seuil 19, en bleu', /→ 37/.test(cellule(vu(1), 9)) && /→ 19/.test(cellule(vu(1), 10)), cellule(vu(1), 9) + ' / ' + cellule(vu(1), 10));
    ok('Proposition P2 (VMJ 4,20 × 2 j, ½) : capacité 9, seuil 5', /→ 9/.test(cellule(vu(2), 9)) && /→ 5/.test(cellule(vu(2), 10)), cellule(vu(2), 9) + ' / ' + cellule(vu(2), 10));
    ok('P3 sans vente : « à saisir »', /à saisir/.test(cellule(vu(3), 9)) && /à saisir/.test(cellule(vu(3), 10)), cellule(vu(3), 9));
    ok('P4 verrouillé : reste en réserve après le clic', /🔒/.test(cellule(vu(4), 0)) && /verrouillé/.test(cellule(vu(4), 11)), cellule(vu(4), 11));
    ok('P5 décoché : « À retirer »', /☐/.test(cellule(vu(5), 0)) && /À retirer/.test(cellule(vu(5), 11)), cellule(vu(5), 11));
    const couleur = await p.evaluate(() => { const td = document.querySelectorAll('.x-grid-row')[0]; return null; });
    void couleur;

    /* saisies a la main : P2 seuil 3, P3 capacite 4 / seuil 2, P6 capacite 8 */
    const saisirCellule = async (k, col, valeur) => {
      const td = p.locator('.x-grid-row').filter({ hasText: 'ZZLR' + k }).first().locator('td').nth(col);
      await td.click();
      await p.waitForTimeout(250);
      await p.keyboard.press('Control+A');
      await p.keyboard.type(String(valeur));
      await p.keyboard.press('Enter');
      await p.waitForTimeout(250);
    };
    await saisirCellule(2, 10, 3);
    await saisirCellule(3, 9, 4);
    await saisirCellule(3, 10, 2);
    await saisirCellule(6, 9, 8);
    L = await lignes();
    ok('Saisie à la main : valeur en violet avec ✎ (P2 seuil 3, P3 4 / 2, P6 capacité 8)', /3 ✎/.test(cellule(vu(2), 10)) && /4 ✎/.test(cellule(vu(3), 9)) && /2 ✎/.test(cellule(vu(3), 10)) && /8 ✎/.test(cellule(vu(6), 9)),
      [cellule(vu(2), 10), cellule(vu(3), 9), cellule(vu(3), 10), cellule(vu(6), 9)].join(' | '));
    const bandeau = await p.evaluate(() => Ext.getCmp('reservemanagerID').down('#ongletListe #lrCompteur').el.dom.innerText);
    const enResBase = Number(q("SELECT COUNT(*) FROM t_famille f JOIN t_famille_stock fs ON fs.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND fs.lg_EMPLACEMENT_ID = '1' AND fs.str_STATUT = 'enable' WHERE f.str_STATUT = 'enable' AND COALESCE(f.bool_DECONDITIONNE, 0) = 0 AND f.bool_RESERVE = 1"));
    ok('Bandeau : coché sur toutes les pages = base + 3 − 1 ; 3 nouveaux, 1 retiré, 1 réglage', new RegExp('^' + (enResBase + 2) + ' produit').test(bandeau) && /3 nouveau\(x\), 1 retiré\(s\), 1 réglage/.test(bandeau), bandeau + ' (base ' + enResBase + ')');

    /* Enregistrer : confirmation dans le bouton */
    await V.cliquer(p, G + ' #lrEnregistrer');
    const texteBouton = () => p.evaluate(() => Ext.getCmp('reservemanagerID').down('#ongletListe #lrEnregistrer').getText());
    const conf = await texteBouton();
    ok('Premier clic : le bouton demande « Confirmer : 3 mis en réserve, 1 retiré(s), 1 réglage(s) ? »', /Confirmer : 3 mis en réserve, 1 retiré\(s\), 1 réglage\(s\) \?/.test(conf), conf);
    ok('Aucune fenêtre surgissante', await p.evaluate(() => !Ext.ComponentQuery.query('messagebox, window').some((w) => w.isVisible() && w.modal)));
    await p.waitForTimeout(500);
    await V.cliquer(p, G + ' #lrEnregistrer');
    await p.waitForFunction(() => /enregistré/.test(Ext.getCmp('reservemanagerID').down('#ongletListe #lrEnregistrer').getText()), null, { timeout: 30000 });
    ok('Second clic : « ✓ 5 produit(s) enregistré(s) »', /✓ 5 produit\(s\) enregistré\(s\)/.test(await texteBouton()), await texteBouton());
    await charge();
    await p.waitForTimeout(500);

    /* bilan avant / apres */
    const apres = base();
    const attendu = { ...avant };
    attendu[ID(1)] = '1|37|19|1|0'; attendu[ID(2)] = '1|9|3|1|0'; attendu[ID(3)] = '1|4|2|1|0'; attendu[ID(5)] = '0|6|3|0|0'; attendu[ID(6)] = '1|8|3|1|0';
    ok('Bilan en base : 3 mis en réserve (ligne de stock réserve à 0), P5 retiré en gardant 6 / 3, P6 réglé à 8 / 3, P4 intact', JSON.stringify(apres) === JSON.stringify(attendu),
      JSON.stringify(apres) + ' / ' + JSON.stringify(attendu));
    ok('Bilan : aucun mouvement de réserve écrit', q(`SELECT COUNT(*) FROM t_mouvement_reserve WHERE lg_FAMILLE_ID IN (${IDS})`) === mouvAvant);
    ok('Bilan : aucun autre produit modifié', q(`SELECT CONCAT(COUNT(*), '|', SUM(COALESCE(bool_RESERVE, 0)), '|', SUM(COALESCE(int_SEUIL_RESERVE, 0)), '|', SUM(COALESCE(int_SEUIL_MINI_RAYON, 0))) FROM t_famille WHERE lg_FAMILLE_ID NOT IN (${IDS})`) === autresAvant);
    L = await lignes();
    ok('Après enregistrement : grille relue = base (en réserve, capacité, seuil)', L.every((l) => { const b = apres[l.id].split('|');
      return l.d.enReserve === (b[0] === '1') && String(l.d.capacite) === b[1] && String(l.d.seuilMini) === b[2]; }), JSON.stringify(L.map((l) => [l.id, l.d.enReserve, l.d.capacite, l.d.seuilMini])));

    /* refus : seuil au-dessus de la capacite */
    await saisirCellule(6, 10, 20);
    await V.cliquer(p, G + ' #lrEnregistrer');
    await p.waitForTimeout(600);
    await V.cliquer(p, G + ' #lrEnregistrer');
    await p.waitForFunction(() => /refus|enregistré/.test(Ext.getCmp('reservemanagerID').down('#ongletListe #lrEnregistrer').getText()), null, { timeout: 30000 });
    await charge();
    await p.waitForTimeout(500);
    L = await lignes();
    ok('Refus : seuil 20 > capacité 8 refusé, motif dans la colonne État, base inchangée', /Refusé : Le seuil mini rayon \(20\) dépasse la capacité maxi rayon \(8\)/.test(cellule(vu(6), 11)) && base()[ID(6)] === '1|8|3|1|0',
      cellule(vu(6), 11) + ' | ' + base()[ID(6)]);
    await V.cliquer(p, G + ' #lrAnnuler');

    /* Decocher la recherche : P4 reste coche */
    await V.cliquer(p, G + ' #lrDecocherTout');
    await p.waitForFunction(() => /décoché/.test(Ext.getCmp('reservemanagerID').down('#ongletListe #lrDecocherTout').getText()), null, { timeout: 30000 });
    const dec = await p.evaluate(() => Ext.getCmp('reservemanagerID').down('#ongletListe #lrDecocherTout').getText());
    ok('« Décocher la recherche » : 4 décochés, 1 resté coché (stock réserve)', /4 décoché\(s\), 1 restés cochés/.test(dec), dec);
    await V.cliquer(p, G + ' #lrAnnuler');

    /* raccourcis : Ctrl + A coche la page, Espace bascule la ligne choisie */
    await p.locator('.x-grid-row').filter({ hasText: 'ZZLR5' }).first().locator('td').nth(1).click();
    await p.keyboard.press('Control+A');
    await p.waitForTimeout(300);
    L = await lignes();
    const bandeauA = await p.evaluate(() => Ext.getCmp('reservemanagerID').down('#ongletListe #lrCompteur').el.dom.innerText);
    ok('Ctrl + A : toute la page cochée (P5 redevient nouveau)', L.every((l) => /☑|🔒/.test(cellule(l, 0))) && /1 nouveau\(x\), 0 retiré\(s\), 0 réglage/.test(bandeauA), L.map((l) => cellule(l, 0)).join('') + ' | ' + bandeauA);
    await p.keyboard.press('Space');
    await p.waitForTimeout(300);
    L = await lignes();
    const bandeauE = await p.evaluate(() => Ext.getCmp('reservemanagerID').down('#ongletListe #lrCompteur').el.dom.innerText);
    ok('Espace : la ligne choisie (P5) est décochée, plus aucun changement', /☐/.test(cellule(vu(5), 0)) && !/nouveau/.test(bandeauE), cellule(vu(5), 0) + ' | ' + bandeauE);

    /* Excel de la recherche */
    let tele = p.waitForEvent('download', { timeout: 60000 }); tele.catch(() => {});
    await V.cliquer(p, G + ' #lrExcel');
    let dl = await tele;
    let fichier = path.join(dossier, dl.suggestedFilename());
    await dl.saveAs(fichier);
    const X = lireXlsx(fichier)['Liste réserve'];
    const lx = X.slice(4).map((l) => [l[0], l[5], l[6], l[7], l[8], l[9] === null ? 'N' : l[9], l[10] === null ? 'N' : l[10]].join('|')).sort();
    const lb = P.map((x) => { const b = apres[ID(x.k)].split('|'); return ['ZZLR' + x.k, 10 + 7 * x.k, Number(b[4]), vmjBase(x), b[0] === '1' ? 'Oui' : 'Non', b[1] === 'N' ? 'N' : Number(b[1]), b[2] === 'N' ? 'N' : Number(b[2])].join('|'); }).sort();
    ok('Rapprochement Excel / base, ligne par ligne (CIP, stocks, VMJ, en réserve, capacité, seuil)', JSON.stringify(lx) === JSON.stringify(lb), JSON.stringify(lx) + ' / ' + JSON.stringify(lb));
    ok('Excel : en-têtes en ligne 4, filtres en ligne 2', X[3][0] === 'CIP' && X[3][10] === 'Seuil mini rayon' && /Recherche « ZZAUDIT LR »/.test(X[1][0]), JSON.stringify([X[1][0], X[3]]));

    /* PDF de la recherche */
    const pdf = async () => {
      const rep = p.waitForResponse((r) => /reserve\/liste\/pdf/.test(r.url()), { timeout: 180000 });
      const pop = p.waitForEvent('popup', { timeout: 180000 }).catch(() => null);
      await V.cliquer(p, G + ' #lrPdf');
      const o = await (await rep).json();
      const w = await pop;
      let adresse = null;
      if (w) { await w.waitForURL((u) => String(u) !== 'about:blank', { timeout: 30000 }).catch(() => {}); adresse = w.url(); await w.close().catch(() => {}); }
      /* l'adresse que l'utilisateur voit s'ouvrir, pas celle que le test reconstruirait */
      ok("PDF : la fenêtre ouverte pointe sur l'édition, dans l'application", !!adresse && adresse.endsWith('/prestige' + o.url), adresse + ' / ' + o.url);
      const octets = Buffer.from(await p.evaluate(async (u) => Array.from(new Uint8Array(await (await fetch(u)).arrayBuffer())), adresse || o.url));
      /* poste local : un domaine d'essai ecrit ses editions dans le dossier configure de l'officine (celui de domain1),
         que son adresse HTTP ne sert pas ; on lit alors le fichier ecrit */
      let f = path.join(dossier, 'liste.pdf');
      if (octets.slice(0, 4).toString() === '%PDF') { fs.writeFileSync(f, octets); } else { f = fichierEdition(o.url); }
      return { o, t: texte(f) };
    };
    const P1 = await pdf();
    const lp = P.map((x) => { const b = apres[ID(x.k)].split('|');
      const re = new RegExp('ZZLR' + x.k + '\\s+ZZAUDIT LR ' + x.k + ' PRODUIT ESSAI[\\s\\S]*?\\s' + (10 + 7 * x.k) + '\\s+' + b[4] + '\\s+' + vmjBase(x).toFixed(2).replace('.', ',') + '\\s+' + (b[0] === '1' ? 'Oui' : 'Non')
        + '\\s+' + (b[1] === 'N' ? '—' : b[1]) + '\\s+' + (b[2] === 'N' ? '—' : b[2]));
      return re.test(P1.t) ? null : 'ZZLR' + x.k; }).filter(Boolean);
    ok('Rapprochement PDF / base, ligne par ligne', P1.o.lignes === 6 && lp.length === 0 && /LISTE RÉSERVE/.test(P1.t) && /6 produit\(s\) · 5 en réserve · stock réserve total : 5/.test(P1.t), lp.join(',') + ' | ' + P1.t.slice(0, 600));

    /* delais sur toute la base (aucune recherche) */
    await V.cliquer(p, G + ' #lrRecherche');
    await p.keyboard.press('Control+A');
    await p.keyboard.press('Backspace');
    await p.keyboard.press('Enter');
    await charge();
    tele = p.waitForEvent('download', { timeout: 120000 }); tele.catch(() => {});
    let d0 = Date.now();
    await V.cliquer(p, G + ' #lrExcel');
    dl = await tele;
    fichier = path.join(dossier, 'tout.xlsx');
    await dl.saveAs(fichier);
    const dExcel = Date.now() - d0;
    const nx = lireXlsx(fichier)['Liste réserve'].length - 4;
    ok('Délai : Excel de toute la base (' + totalTous + ' produits) en moins de ' + PLAFOND_EXCEL_MS + ' ms, toutes les lignes', dExcel < PLAFOND_EXCEL_MS && nx === totalTous, dExcel + ' ms, ' + nx + ' lignes');
    d0 = Date.now();
    const P2 = await pdf();
    const dPdf = Date.now() - d0;
    ok('Délai : PDF de toute la base en moins de ' + PLAFOND_PDF_MS + ' ms, toutes les lignes', dPdf < PLAFOND_PDF_MS && P2.o.lignes === totalTous, dPdf + ' ms, ' + P2.o.lignes + ' lignes');
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
