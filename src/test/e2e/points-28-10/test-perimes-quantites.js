/* POINT 6 DU 28/10. « Gestion des péremptions » (peremptionquery), compte e2e. Lecture seule.
 *  - la colonne « Qunatité » s'appelle « Quantité saisie » (quantite du lot a son entree) ;
 *  - une colonne « Quantité restante » montre le stock restant du lot (t_lot.current_stock), ligne par ligne ;
 *  - l'API rend quantiteRestante egale au stock du lot, et quantiteLot inchangee (quantite saisie) ;
 *  - exports CSV et Excel : memes colonnes (quantite saisie, quantite restante) ;
 *  - aucune erreur JavaScript.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();

(async () => {
  const b = await ENV_E2E.lancer(chromium);
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  const erreurs = [];
  p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    /* tous les lots perimes ou proches, sans filtre de periode */
    const api = await p.evaluate(() => fetch('../api/v1/fichearticle/perimes?nbreMois=0&start=0&limit=200').then((r) => r.json()));
    const lignes = (api.data || []);
    ok('Précondition : des lots dans la liste', lignes.length > 0, lignes.length);
    let ecarts = [], restanteAbsente = 0, differentes = 0;
    for (const l of lignes.slice(0, 50)) {
      const [initial, restant] = q(`SELECT int_NUMBER, IFNULL(current_stock, 0) FROM t_lot WHERE lg_LOT_ID = '${l.lgLOTID}'`).split('\t').map(Number);
      if (l.quantiteRestante === undefined || l.quantiteRestante === null) { restanteAbsente++; }
      if (Number(l.quantiteRestante) !== restant || Number(l.quantiteLot) !== initial) { ecarts.push(l.lgLOTID + ' ' + l.quantiteLot + '/' + l.quantiteRestante + ' attendu ' + initial + '/' + restant); }
      if (initial !== restant) { differentes++; }
    }
    ok('API : quantiteRestante = stock restant du lot, quantiteLot = quantité saisie', restanteAbsente === 0 && ecarts.length === 0, ecarts.slice(0, 3).join(' | ') + ' absentes ' + restanteAbsente);
    console.log('  (lots dont la quantité restante diffère de la saisie : ' + differentes + ')');

    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('peremptionquery', 'Gestion des peremptions', ''));
    await p.waitForFunction(() => { const v = Ext.ComponentQuery.query('peremptionquery gridpanel')[0]; return v && v.isVisible(true) && !v.getStore().isLoading(); }, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const e = await p.evaluate(() => {
      const g = Ext.ComponentQuery.query('peremptionquery gridpanel')[0];
      const cols = g.query('gridcolumn').filter((c) => c.isVisible()).map((c) => c.text);
      const ligne = g.getStore().getAt(0);
      const cell = (id) => { const c = g.down('#' + id); if (!c || !ligne) { return null; } const n = g.getView().getCell(ligne, c); return n ? n.dom.innerText.trim() : null; };
      return { cols, saisie: cell('colQuantiteSaisie'), restante: cell('colQuantiteRestante'),
        attendues: ligne ? [ligne.get('quantiteLot'), ligne.get('quantiteRestante')] : null };
    });
    ok('Écran : colonne « Quantité saisie », plus de « Qunatité »', e.cols.includes('Quantité saisie') && !e.cols.some((c) => /Qunatit/.test(c)), e.cols.join(', '));
    ok('Écran : colonne « Quantité restante » juste après', e.cols.indexOf('Quantité restante') === e.cols.indexOf('Quantité saisie') + 1, e.cols.join(', '));
    ok('Écran : la première ligne montre les deux quantités', e.saisie !== null && e.restante !== null
      && e.saisie.replace(/\D/g, '') === String(e.attendues[0]) && e.restante.replace(/\D/g, '') === String(e.attendues[1] || 0), JSON.stringify(e));
    /* exports : memes colonnes que l'ecran */
    const csv = await p.evaluate(() => fetch('../api/v1/fichearticle/perimes/csv?nbreMois=0').then((r) => r.text()));
    const lignesCsv = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim());
    const entete = lignesCsv.find((l) => /Numéro lot/.test(l)) || '';
    const sep = entete.indexOf(';') >= 0 ? ';' : ',';
    const cols = entete.split(sep).map((c) => c.replace(/"/g, '').trim());
    ok('Export CSV : colonnes « Quantité saisie » puis « Quantité restante »', cols.indexOf('Quantité restante') === cols.indexOf('Quantité saisie') + 1 && cols.indexOf('Quantité saisie') > 0, cols.join('|'));
    const premier = lignes[0];
    const ligneCsv = lignesCsv.find((l) => premier && l.split(sep)[0].replace(/"/g, '') === String(premier.numLot)) || '';
    const valeurs = ligneCsv.split(sep).map((c) => c.replace(/"/g, '').trim());
    ok('Export CSV : la quantité restante du lot', !premier || (valeurs[cols.indexOf('Quantité restante')] === String(premier.quantiteRestante || 0)), ligneCsv.slice(0, 200));
    const xls = await p.evaluate(() => fetch('../api/v1/fichearticle/perimes/excel?nbreMois=0').then(async (r) => ({ s: r.status, n: (await r.arrayBuffer()).byteLength })));
    ok('Export Excel : fichier produit', xls.s === 200 && xls.n > 1000, JSON.stringify(xls));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
