/* RETOUR DU 15/11 : « saisie de produit périmés onglet analyse : on n'a pas de bouton imprimer ou exporter en excel ».
 *
 * Vrai chemin : menu GESTION DU STOCK › Saisie de produits périmés, clic sur l'onglet « Analyse », dates tapées au
 * clavier, « Actualiser », puis « Imprimer » (nouvel onglet) et « Excel » (téléchargement).
 * Jeu d'essai (laborex_audit, retiré à la fin) : octobre 2024 (mois de ventes du banc, aucun autre périmé), 5
 * saisies sur 3 produits de 2 emplacements, quantités 3, 2, 1, 4, 6 (un produit saisi 2 fois).
 * Rapprochement ligne par ligne, base / écran / impression / Excel :
 *  - synthèse : valeur (vente), valeur (achat), CA, taux, produits, saisies, quantité ;
 *  - emplacements : libellé, saisies, produits, quantité, valeur, part ;
 *  - produits par valeur : CIP, fois, quantité, valeur ;
 *  - évolution par mois : octobre 2024, valeur, CA ;
 *  - l'impression porte la période ; l'Excel a des cellules numériques.
 * Lecture du classeur : openpyxl.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const vues = require('../outils/vues');
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const res = [];
function ok(n, c, d) { res.push(!!c); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN'], { input: s, encoding: 'utf8' }).replace(/\r/g, '').trim();
const M = 'E2E-PAX15-';
const D1 = '2024-10-01', D2 = '2024-11-01';
const ADMIN = q(`SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '${ENV_E2E.LOGIN}'`);
const Z = q(`SELECT f.lg_ZONE_GEO_ID FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.int_PRICE > 0 AND f.int_PAF > 0 AND f.lg_ZONE_GEO_ID IS NOT NULL
  GROUP BY f.lg_ZONE_GEO_ID HAVING COUNT(*) > 3 ORDER BY f.lg_ZONE_GEO_ID LIMIT 2`).split('\n');
const P = q(`(SELECT lg_FAMILLE_ID FROM t_famille WHERE lg_ZONE_GEO_ID = '${Z[0]}' AND str_STATUT = 'enable' AND int_PRICE > 0 AND int_PAF > 0 ORDER BY lg_FAMILLE_ID LIMIT 2)
  UNION ALL (SELECT lg_FAMILLE_ID FROM t_famille WHERE lg_ZONE_GEO_ID = '${Z[1]}' AND str_STATUT = 'enable' AND int_PRICE > 0 AND int_PAF > 0 ORDER BY lg_FAMILLE_ID LIMIT 1)`).split('\n');
/* produit, quantite, jour */
const SAISIES = [[0, 3, '2024-10-05'], [0, 2, '2024-10-20'], [1, 1, '2024-10-10'], [2, 4, '2024-10-15'], [2, 6, '2024-10-28']];
const W = ` FROM t_warehouse w JOIN t_famille f ON f.lg_FAMILLE_ID = w.lg_FAMILLE_ID LEFT JOIN t_zone_geographique z ON z.lg_ZONE_GEO_ID = f.lg_ZONE_GEO_ID
  WHERE w.str_STATUT = 'delete' AND w.dt_CREATED >= '${D1}' AND w.dt_CREATED < '${D2}'`;
const retirer = () => q(`DELETE FROM t_warehouse WHERE lg_WAREHOUSE_ID LIKE '${M}%'`);
const chiffres = (s) => String(s).replace(/[^0-9-]/g, '');
const pct = (s) => Number(String(s).replace(/[%\s ]/g, '').replace(',', '.'));
const lireXlsx = (f) => JSON.parse(execFileSync('python', ['-X', 'utf8', '-c', `import json,sys,openpyxl
wb=openpyxl.load_workbook(sys.argv[1])
print(json.dumps({ws.title:[[c.value for c in r] for r in ws.iter_rows()] for ws in wb.worksheets},ensure_ascii=False,default=str))`, f], { encoding: 'utf8' }));

(async () => {
  ok('Préconditions : 3 produits sur 2 emplacements, octobre 2024 sans autre périmé, avec des ventes', P.length === 3
    && q(`SELECT COUNT(*) FROM t_warehouse WHERE str_STATUT = 'delete' AND dt_CREATED >= '${D1}' AND dt_CREATED < '${D2}' AND lg_WAREHOUSE_ID NOT LIKE '${M}%'`) === '0'
    && Number(q(`SELECT IFNULL(SUM(int_PRICE), 0) FROM t_preenregistrement WHERE dt_CREATED >= '${D1}' AND dt_CREATED < '${D2}' AND int_PRICE > 0 AND b_IS_CANCEL = 0 AND str_STATUT = 'is_Closed'`)) > 0);
  retirer();
  q('INSERT INTO t_warehouse (lg_WAREHOUSE_ID, lg_USER_ID, lg_FAMILLE_ID, int_NUM_LOT, int_NUMBER, int_NUMBER_DELETE, dt_CREATED, dt_UPDATED, dt_PEREMPTION, str_STATUT, stock_initial, stock_final) VALUES '
    + SAISIES.map(([i, n, j], k) => `('${M}${k}', '${ADMIN}', '${P[i]}', 'PAX${k}', ${n}, ${n}, '${j} 10:00:00', '${j} 10:00:00', '${j}', 'delete', 20, ${20 - n})`).join(', '));
  /* base : attendu */
  const T = q(`SELECT CONCAT_WS('|', SUM(w.int_NUMBER * f.int_PRICE), SUM(w.int_NUMBER * f.int_PAF), COUNT(DISTINCT w.lg_FAMILLE_ID), COUNT(*), SUM(w.int_NUMBER))${W}`).split('|').map(Number);
  const CA = Number(q(`SELECT SUM(int_PRICE) FROM t_preenregistrement WHERE dt_CREATED >= '${D1}' AND dt_CREATED < '${D2}' AND int_PRICE > 0 AND b_IS_CANCEL = 0 AND str_STATUT = 'is_Closed'`));
  const RATIO = Math.round(T[0] * 10000 / CA) / 100;
  const ZONES = q(`SELECT CONCAT_WS('|', IFNULL(z.str_LIBELLEE, '(sans emplacement)'), COUNT(*), COUNT(DISTINCT w.lg_FAMILLE_ID), SUM(w.int_NUMBER), SUM(w.int_NUMBER * f.int_PRICE))${W}
    GROUP BY z.lg_ZONE_GEO_ID ORDER BY SUM(w.int_NUMBER * f.int_PRICE) DESC`).split('\n').map((l) => l.split('|'));
  const PRODUITS = q(`SELECT CONCAT_WS('|', f.int_CIP, COUNT(*), SUM(w.int_NUMBER), SUM(w.int_NUMBER * f.int_PRICE))${W}
    GROUP BY f.lg_FAMILLE_ID ORDER BY SUM(w.int_NUMBER * f.int_PRICE) DESC`).split('\n').map((l) => l.split('|'));
  ok('Jeu d\'essai : 5 saisies, 3 produits, 2 emplacements, quantité 16, un produit saisi 2 fois', T[3] === 5 && T[2] === 3 && ZONES.length === 2 && T[4] === 16
    && PRODUITS.some((x) => x[1] === '2'), JSON.stringify(T));

  const b = await ENV_E2E.lancer(chromium);
  const err = [];
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'pax15-'));
  try {
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => err.push(e.message));
    await vues.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const lib = await p.evaluate(() => { const n = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'saisieperime', true);
      return n ? [n.parentNode.get('text'), n.get('text')] : null; });
    await vues.ouvrirMenu(p, lib[0], lib[1]);
    await p.waitForFunction(() => Ext.ComponentQuery.query('saisieperimeonglets').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await vues.cliquer(p, 'saisieperimeonglets #sp-analyse');
    await p.waitForFunction(() => !!Ext.ComponentQuery.query('saisieperimeonglets')[0].donnees, null, { timeout: 60000 });
    for (const [champ, v] of [['spDebut', '01/10/2024'], ['spFin', '31/10/2024']]) {
      const id = await p.evaluate((c) => Ext.ComponentQuery.query('saisieperimeonglets #' + c)[0].inputEl.dom.id, champ);
      await p.click('#' + id); await p.keyboard.press('Control+A'); await p.keyboard.type(v); await p.keyboard.press('Tab');
    }
    await p.evaluate(() => { Ext.ComponentQuery.query('saisieperimeonglets')[0].donnees = null; });
    await vues.cliquer(p, 'saisieperimeonglets #spActualiser');
    await p.waitForFunction(() => { const o = Ext.ComponentQuery.query('saisieperimeonglets')[0]; return o.donnees && o.donnees.debut === '2024-10-01'; }, null, { timeout: 60000 });

    const boutons = await p.evaluate(() => ['spImprimer', 'spExcel'].map((i) => { const c = Ext.ComponentQuery.query('saisieperimeonglets #' + i)[0]; return c && c.isVisible(true) ? c.getText() : null; }));
    ok('Onglet Analyse : boutons « Imprimer » et « Excel » visibles', boutons[0] === 'Imprimer' && boutons[1] === 'Excel', JSON.stringify(boutons));

    /* l'ecran : lignes des tableaux */
    const lignes = (racine) => Array.from(racine.querySelectorAll('tr.sp-zone, tr.sp-produit, tr.sp-periode')).map((tr) => [tr.className, ...Array.from(tr.cells).map((c) => c.innerText.trim())]);
    const ecran = await p.evaluate(`(${lignes.toString()})(Ext.ComponentQuery.query('saisieperimeonglets #spContenu')[0].getEl().dom)`);
    const zonesEcran = ecran.filter((l) => /sp-zone/.test(l[0])).map((l) => l.slice(1));
    const prodEcran = ecran.filter((l) => /sp-produit/.test(l[0])).map((l) => l.slice(1));
    const zonesAttendues = ZONES.map((z) => [z[0], z[1], z[2], z[3], z[4]].join('|'));
    ok('Rapprochement écran / base : emplacements (libellé, saisies, produits, quantité, valeur), dans l\'ordre', JSON.stringify(zonesEcran.map((z) => [z[0], chiffres(z[1]), chiffres(z[2]), chiffres(z[3]), chiffres(z[4])].join('|'))) === JSON.stringify(zonesAttendues),
      JSON.stringify(zonesEcran) + ' / ' + JSON.stringify(zonesAttendues));
    const prodAttendus = PRODUITS.map((x) => x.join('|')).sort();
    ok('Rapprochement écran / base : produits (CIP, fois, quantité, valeur)', JSON.stringify(prodEcran.map((x) => [x[0], chiffres(x[3]), chiffres(x[4]), chiffres(x[5])].join('|')).sort()) === JSON.stringify(prodAttendus),
      JSON.stringify(prodEcran));

    /* Imprimer : nouvel onglet avec la periode et les memes lignes */
    const onglet = ctx.waitForEvent('page', { timeout: 30000 }); onglet.catch(() => {});
    await vues.cliquer(p, 'saisieperimeonglets #spImprimer');
    const pi = await onglet;
    await pi.waitForLoadState('domcontentloaded');
    await pi.waitForSelector('tr.sp-zone', { timeout: 15000 });
    const texteImp = await pi.evaluate(() => document.body.innerText);
    const imp = await pi.evaluate(`(${lignes.toString()})(document.body)`);
    ok('Impression : titre et période du 01/10/2024 au 31/10/2024', /Analyse des produits périmés/.test(texteImp) && /Période du 01\/10\/2024 au 31\/10\/2024/.test(texteImp), texteImp.slice(0, 200));
    ok('Rapprochement impression / écran : toutes les lignes des tableaux identiques', JSON.stringify(imp) === JSON.stringify(ecran), JSON.stringify(imp).slice(0, 300));
    ok('Impression : tuiles valeur périmée, CA et taux', new RegExp(chiffres(T[0]).replace(/\B(?=(\d{3})+(?!\d))/g, '\\s?') + ' F').test(texteImp)
      && new RegExp(String(RATIO).replace('.', ',') + ' %').test(texteImp), RATIO);
    await pi.close();

    /* Excel : telechargement, classeur relu */
    const tele = p.waitForEvent('download', { timeout: 60000 }); tele.catch(() => {});
    await vues.cliquer(p, 'saisieperimeonglets #spExcel');
    const dl = await tele;
    const fichier = path.join(dossier, dl.suggestedFilename());
    await dl.saveAs(fichier);
    ok('Excel : fichier .xlsx nommé d\'après la période', /^analyse_perimes_2024-10-01_2024-10-31\.xlsx$/.test(dl.suggestedFilename()), dl.suggestedFilename());
    const X = lireXlsx(fichier);
    ok('Excel : feuilles Synthèse, Emplacements, Produits par valeur, Produits fréquents, Par mois', JSON.stringify(Object.keys(X)) === JSON.stringify(['Synthèse', 'Emplacements', 'Produits par valeur', 'Produits fréquents', 'Par mois']), Object.keys(X));
    const s = X['Synthèse'];
    const syn = Object.fromEntries(s.slice(4).map((l) => [l[0], l[1]]));
    ok('Rapprochement Excel / base : synthèse (valeur vente, valeur achat, CA, taux, produits, saisies, quantité)', syn['Valeur périmée (prix de vente)'] === T[0] && syn['Valeur périmée (prix d\'achat)'] === T[1]
      && syn['Chiffre d\'affaires de la période'] === CA && Math.abs(syn['Taux de péremption (%)'] - RATIO) < 1e-9 && syn['Produits périmés'] === T[2] && syn.Saisies === T[3] && syn['Quantité'] === T[4],
      JSON.stringify(syn) + ' / ' + JSON.stringify([T, CA, RATIO]));
    ok('Excel : période en ligne 2', s[1][0] === 'Du 01/10/2024 au 31/10/2024', s[1][0]);
    const zx = X.Emplacements.slice(4).map((l) => [l[0], l[1], l[2], l[3], l[4]].join('|'));
    ok('Rapprochement Excel / base : emplacements, dans l\'ordre, nombres', JSON.stringify(zx) === JSON.stringify(zonesAttendues)
      && X.Emplacements.slice(4).every((l) => l.slice(1).every((v) => typeof v === 'number')), JSON.stringify(zx));
    ok('Rapprochement Excel / écran : parts des emplacements', X.Emplacements.slice(4).every((l, i) => Math.abs(l[6] - pct(zonesEcran[i][5])) < 1e-9)
      && Math.abs(X.Emplacements.slice(4).reduce((a, l) => a + l[6], 0) - 100) < 0.05, JSON.stringify(X.Emplacements.slice(4).map((l) => l[6])));
    const px = X['Produits par valeur'].slice(4).map((l) => [l[0], l[3], l[4], l[5]].join('|')).sort();
    ok('Rapprochement Excel / base : produits par valeur (CIP, fois, quantité, valeur)', JSON.stringify(px) === JSON.stringify(prodAttendus), JSON.stringify(px));
    ok('Rapprochement Excel / base : produits fréquents = mêmes produits', JSON.stringify(X['Produits fréquents'].slice(4).map((l) => [l[0], l[3], l[4], l[5]].join('|')).sort()) === JSON.stringify(prodAttendus));
    const mx = X['Par mois'].slice(4).find((l) => l[0] === '2024-10');
    ok('Rapprochement Excel / base : octobre 2024 (valeur, CA, taux)', mx && mx[1] === T[0] && mx[2] === CA && Math.abs(mx[3] - RATIO) < 1e-9, JSON.stringify(mx));
    const fin = await p.evaluate(() => Ext.ComponentQuery.query('saisieperimeonglets #spExcel')[0].getText());
    ok('Bouton Excel : confirmation dans le bouton', /Fichier prêt|Excel/.test(fin), fin);
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (x) {
    ok('Déroulement', false, x.stack);
  } finally {
    await b.close();
    retirer();
    fs.rmSync(dossier, { recursive: true, force: true });
    ok('Données d\'essai retirées', q(`SELECT COUNT(*) FROM t_warehouse WHERE lg_WAREHOUSE_ID LIKE '${M}%'`) === '0');
    const n = res.filter(Boolean).length;
    console.log(n + '/' + res.length + (n === res.length ? ' OK' : ' ÉCHEC'));
    process.exit(n === res.length ? 0 : 1);
  }
})();
