/* DEMANDE 36 D12 DES APPLICATIONS MOBILES : ECRAN ET EXPORTS DU RAPPORT DES PEREMPTIONS COURTES.
 *
 * Par les vues : GESTION DES COMMANDES > « Péremptions courtes ». Deux lignes d'essai du journal (une acceptee, une
 * refusee) sont posees ; ce que le test etablit :
 *  - l'ecran liste les lignes de la periode, total des valeurs = base ;
 *  - filtre par statut (liste) : seules les lignes de ce statut ;
 *  - statut change dans la grille (liste dans la cellule, sans fenetre) : enregistre en base ;
 *  - export Excel (bouton) : un fichier .xlsx ; export PDF (bouton) : un PDF ;
 *  - aucune erreur JavaScript.
 * Lignes d'essai retirees.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, choisir, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const [BL, PRODUIT, G] = q("SELECT CONCAT_WS('|', b.lg_BON_LIVRAISON_ID, d.lg_FAMILLE_ID, o.lg_GROSSISTE_ID) FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID"
  + " JOIN t_bon_livraison_detail d ON d.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID WHERE b.str_STATUT = 'is_Closed' ORDER BY b.dt_CREATED DESC LIMIT 1").split('|');
const ADMIN = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = 'admin'");
const retirer = () => q("DELETE FROM t_reception_peremption_courte WHERE id LIKE 'E2E-PC-%'");

(async () => {
  retirer();
  q(`INSERT INTO t_reception_peremption_courte (id, lg_BON_LIVRAISON_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, num_lot, dt_peremption, jours_restants, quantite, valeur, decision, motif, statut, lg_USER_ID, created_at)`
    + ` VALUES ('E2E-PC-1', '${BL}', '${PRODUIT}', '${G}', 'E2EPC1', CURDATE() + INTERVAL 60 DAY, 60, 4, 12000, 'ACCEPTE', 'E2E accepté', 'A_TRAITER', '${ADMIN}', NOW()),`
    + ` ('E2E-PC-2', '${BL}', '${PRODUIT}', '${G}', 'E2EPC2', CURDATE() + INTERVAL 30 DAY, 30, 2, 5000, 'REFUSE', 'E2E refusé', 'RECLAME', '${ADMIN}', NOW())`);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 }, acceptDownloads: true })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const grille = () => p.evaluate(() => { const g = Ext.ComponentQuery.query('peremptionscourtes gridpanel')[0], s = g.getStore();
    return { charge: !s.isLoading(), ids: s.collect('id').filter((x) => /^E2E-PC-/.test(x)).sort(), total: s.getProxy().getReader().rawData && s.getProxy().getReader().rawData.valeur }; });
  const attendre = () => p.waitForFunction(() => { const g = Ext.ComponentQuery.query('peremptionscourtes gridpanel')[0]; return g && !g.getStore().isLoading(); }, null, { timeout: 60000 })
    .then(() => p.waitForTimeout(500));
  try {
    await connexion(p, 'admin', 'e2etest');
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Péremptions courtes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('peremptionscourtes').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await attendre();
    let g = await grille();
    const base = q("SELECT SUM(valeur) FROM t_reception_peremption_courte WHERE created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01') AND created_at < CURDATE() + INTERVAL 1 DAY");
    ok('Écran : les deux lignes d\'essai du mois, total des valeurs = base', g.ids.join(',') === 'E2E-PC-1,E2E-PC-2' && Number(g.total) === Number(base), JSON.stringify(g) + ' / ' + base);

    const filtree = p.waitForResponse((r) => /peremptions-courtes\?/.test(r.url()) && /statut=RECLAME/.test(r.url()), { timeout: 30000 });
    await choisir(p, 'peremptionscourtes #pcStatut', 'Réclamé');
    await filtree;
    await attendre();
    g = await grille();
    ok('Filtre statut « Réclamé » : seule la ligne réclamée', g.ids.join(',') === 'E2E-PC-2', JSON.stringify(g));
    const tous = p.waitForResponse((r) => /peremptions-courtes\?/.test(r.url()) && /statut=&|statut=$/.test(r.url()), { timeout: 30000 });
    await choisir(p, 'peremptionscourtes #pcStatut', 'Tous');
    await tous;
    await attendre();

    /* statut change dans la cellule, sans fenetre */
    const cellule = await p.evaluate(() => { const g = Ext.ComponentQuery.query('peremptionscourtes gridpanel')[0], v = g.getView(), s = g.getStore();
      const r = s.findRecord('id', 'E2E-PC-1'), col = g.down('gridcolumn[dataIndex=statut]'); return v.getCell(r, col).dom.id; });
    await p.click('#' + cellule);
    const editeur = p.locator('.x-grid-editor input').first();
    await editeur.waitFor({ timeout: 10000 });
    await editeur.click();
    await p.locator('.x-boundlist:visible .x-boundlist-item').filter({ hasText: 'Avoir reçu' }).first().click();
    await p.waitForTimeout(1500);
    ok('Statut changé dans la grille : « Avoir reçu » enregistré, aucune fenêtre', q("SELECT statut FROM t_reception_peremption_courte WHERE id = 'E2E-PC-1'") === 'AVOIR_RECU'
      && await p.evaluate(() => !Ext.WindowManager.getActive() || !Ext.WindowManager.getActive().isVisible()), q("SELECT statut FROM t_reception_peremption_courte WHERE id = 'E2E-PC-1'"));

    const [xls] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), cliquer(p, 'peremptionscourtes #pcExcel')]);
    ok('Export Excel (bouton) : un fichier .xlsx', /\.xlsx$/.test(xls.suggestedFilename()), xls.suggestedFilename());
    const onglet = p.context().waitForEvent('page', { timeout: 30000 });
    await cliquer(p, 'peremptionscourtes #pcPdf');
    const pdf = await onglet;
    const entete = await p.evaluate(async (u) => { const r = await fetch(u); const a = new Uint8Array(await r.arrayBuffer()); return { type: r.headers.get('content-type'), debut: String.fromCharCode(...a.slice(0, 5)) }; }, pdf.url());
    ok('Export PDF (bouton) : un PDF', /application\/pdf/.test(entete.type) && entete.debut === '%PDF-', JSON.stringify(entete));
    await pdf.close();
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    retirer();
    ok('Lignes d\'essai retirées', q("SELECT COUNT(*) FROM t_reception_peremption_courte WHERE id LIKE 'E2E-PC-%'") === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
