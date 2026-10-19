/* MENU « ACTIVITE DES EQUIPES », ONGLET « DONNEES & RECHERCHES » (demande du 13/10).
 *
 * Par les vues : ANALYSE DE GESTION > « Activité des équipes », periode de septembre 2026 saisie au clavier.
 *  - pastilles par type : nombres egaux a ceux de la base (requetes independantes) ;
 *  - clic sur la pastille BL : le journal ne montre que des BL, total = BL de la base ; second clic : tout revient ;
 *  - employe choisi dans la liste : total = ses actions dans la base ;
 *  - recherche d'une reference : la ligne est trouvee ; page suivante ;
 *  - export CSV (bouton) : autant de lignes que le journal filtre ;
 *  - aucune colonne de client dans les reponses ; aucune erreur JavaScript ;
 *  - droit : un profil sans le menu ne le voit pas, les routes repondent 403.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const fs = require('fs');
const { connexion, ouvrirMenu, cliquer, choisir, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = process.env.DB_TEST || 'capitale';
const q = (s) => execFileSync('mariadb', ['--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const D = '2026-09-01', F = '2026-10-01';
const N = {
  VENTE: q(`SELECT COUNT(*) FROM t_preenregistrement WHERE str_STATUT = 'is_Closed' AND b_IS_CANCEL = 0 AND int_PRICE > 0 AND dt_UPDATED >= '${D}' AND dt_UPDATED < '${F}'`),
  BL: q(`SELECT COUNT(*) FROM t_bon_livraison WHERE str_STATUT = 'is_Closed' AND dt_CREATED >= '${D}' AND dt_CREATED < '${F}'`),
  COMMANDE: q(`SELECT COUNT(*) FROM t_order WHERE dt_CREATED >= '${D}' AND dt_CREATED < '${F}'`),
  CONNEXION: q(`SELECT COUNT(*) FROM t_event_log WHERE str_DESCRIPTION LIKE 'Authentification%' AND dt_CREATED >= '${D}' AND dt_CREATED < '${F}'`)
};
/* employe qui a entre des BL en septembre */
const [EMPLOYE, NOM] = q(`SELECT u.lg_USER_ID, TRIM(CONCAT(IFNULL(u.str_FIRST_NAME, ''), ' ', IFNULL(u.str_LAST_NAME, ''))) FROM t_bon_livraison b JOIN t_user u ON u.lg_USER_ID = b.lg_USER_ID`
  + ` WHERE b.str_STATUT = 'is_Closed' AND b.dt_CREATED >= '${D}' AND b.dt_CREATED < '${F}' GROUP BY u.lg_USER_ID ORDER BY COUNT(*) DESC LIMIT 1`).split('\t');
const BL_EMPLOYE = q(`SELECT COUNT(*) FROM t_bon_livraison WHERE str_STATUT = 'is_Closed' AND lg_USER_ID = '${EMPLOYE}' AND dt_CREATED >= '${D}' AND dt_CREATED < '${F}'`);
const ID = 'E2E-AE-SANS', LOGIN = 'e2e-ae-sans', MDP = 'E2e-Ae-Sans-7';
const ROLE_VENDEUR = q("SELECT lg_ROLE_ID FROM t_role WHERE str_NAME = 'Vendeur'");
const retirer = () => q(`DELETE FROM t_role_user WHERE lg_USER_ID = '${ID}'; DELETE FROM t_event_log WHERE lg_USER_ID = '${ID}'; DELETE FROM t_user WHERE lg_USER_ID = '${ID}'`);

(async () => {
  retirer();
  q(`INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)`
    + ` VALUES ('${ID}', '${LOGIN}', MD5('${MDP}'), 'E2E', 'SANS DROIT', 'Vendeur', 'enable', '1', NOW(), 0)`);
  q(`INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('${ID}', '${ROLE_VENDEUR}', '${ID}', NOW())`);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const p = await (await b.newContext({ viewport: { width: 1600, height: 900 }, acceptDownloads: true })).newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  const reponses = []; p.on('response', async (r) => { if (/activite-equipes\/journal\?/.test(r.url())) { try { reponses.push(await r.json()); } catch (e) { /* ignore */ } } });
  const store = () => p.evaluate(() => { const s = Ext.ComponentQuery.query('activiteequipes')[0].journal; return { total: s.getTotalCount(), types: Ext.Array.unique(s.collect('type')), charge: !s.isLoading(), n: s.getCount() }; });
  const attendre = () => p.waitForFunction(() => { const s = Ext.ComponentQuery.query('activiteequipes')[0].journal; return !s.isLoading(); }, null, { timeout: 60000 }).then(() => p.waitForTimeout(300));
  const pastilles = () => p.evaluate(() => Array.from(document.querySelectorAll('.ae-pastille')).reduce((o, e) => { o[e.getAttribute('data-type')] = e.querySelector('b').textContent.replace(/\D/g, ''); return o; }, {}));
  try {
    await connexion(p, 'admin', 'e2etest');
    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Activité des équipes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('activiteequipes').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    await attendre();
    await saisir(p, 'activiteequipes #aeDebut', '01/09/2026');
    await saisir(p, 'activiteequipes #aeFin', '30/09/2026');
    await cliquer(p, 'activiteequipes #aeActualiser');
    await attendre();
    const pa = await pastilles();
    ok('Pastilles de septembre = base (ventes, BL, commandes, connexions)', ['VENTE', 'BL', 'COMMANDE', 'CONNEXION'].every((t) => pa[t] === N[t]),
      JSON.stringify(pa) + ' / ' + JSON.stringify(N));

    await p.locator('.ae-pastille[data-type="BL"]').click();
    await attendre();
    let s = await store();
    ok('Pastille BL : uniquement des BL, total = base', s.total === Number(N.BL) && s.types.length === 1 && s.types[0] === 'BL', JSON.stringify(s));
    ok('Pastille BL mise en avant', await p.locator('.ae-pastille.ae-active[data-type="BL"]').count() === 1);

    const nom = await choisir(p, 'activiteequipes #aeEmploye', NOM);
    await attendre();
    s = await store();
    ok('Employé choisi dans la liste + pastille BL : total = ses BL dans la base', s.total === Number(BL_EMPLOYE), nom + ' ' + JSON.stringify(s) + ' / ' + BL_EMPLOYE);

    const ref = await p.evaluate(() => Ext.ComponentQuery.query('activiteequipes')[0].journal.getAt(0).get('reference'));
    await saisir(p, 'activiteequipes #aeRecherche', ref);
    await p.keyboard.press('Enter');
    await attendre();
    s = await store();
    const refs = await p.evaluate(() => Ext.ComponentQuery.query('activiteequipes')[0].journal.collect('reference'));
    ok('Recherche d\'une référence : la ligne est trouvée, rien d\'autre', s.total >= 1 && refs.every((r) => r.indexOf(ref) >= 0), ref + ' ' + JSON.stringify(s));

    /* retour a tout : recherche videe, pastille re-cliquee, employe vide */
    await cliquer(p, 'activiteequipes #aeRecherche');
    await p.keyboard.press('Control+A'); await p.keyboard.press('Backspace');
    await p.locator('.ae-pastille[data-type="BL"]').click();
    await attendre();
    await choisir(p, 'activiteequipes #aeEmploye', 'Tous les employés');
    await attendre();
    s = await store();
    const pa2 = await pastilles();
    const totalTout = Object.values(pa2).reduce((a, x) => a + Number(x), 0);
    ok('Second clic sur la pastille et « Tous les employés » : toutes les actions du mois reviennent', s.total === totalTout && pa2.VENTE === N.VENTE,
      JSON.stringify(s) + ' / ' + totalTout);

    const premiere = await p.evaluate(() => Ext.ComponentQuery.query('activiteequipes')[0].journal.getAt(0).get('reference'));
    await p.locator('.ae-journal .x-tbar-page-next, #aeJournal .x-tbar-page-next').first().click().catch(async () => {
      await cliquer(p, 'activiteequipes pagingtoolbar button[itemId=next]'); });
    await attendre();
    const page2 = await p.evaluate(() => { const s = Ext.ComponentQuery.query('activiteequipes')[0].journal; return { page: s.currentPage, ref: s.getAt(0).get('reference') }; });
    ok('Page suivante : page 2, autres lignes', page2.page === 2 && page2.ref !== premiere, JSON.stringify(page2));

    /* export du journal filtre sur les BL */
    await p.locator('.ae-pastille[data-type="BL"]').click();
    await attendre();
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), cliquer(p, 'activiteequipes #aeExport')]);
    const chemin = await dl.path();
    const lignes = fs.readFileSync(chemin, 'utf8').split('\r\n').filter((x) => x.trim()).length - 1;
    ok('Export CSV (bouton) : un fichier, autant de lignes que les BL du journal', lignes === Number(N.BL) && /activite_equipes_2026-09-01_2026-09-30\.csv/.test(dl.suggestedFilename()),
      dl.suggestedFilename() + ' ' + lignes + ' / ' + N.BL);

    const cles = new Set(); reponses.forEach((r) => (r.data || []).forEach((l) => Object.keys(l).forEach((k) => cles.add(k))));
    ok('Réponses : seulement date, type, employé, référence, montant, détail (aucune colonne de client)',
      [...cles].every((k) => ['date', 'type', 'libelleType', 'employeId', 'employe', 'reference', 'montant', 'detail'].includes(k)), [...cles].join(','));
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));

    /* droit */
    const p2 = await (await b.newContext()).newPage();
    await connexion(p2, LOGIN, MDP);
    const menu = await p2.evaluate(() => { const o = []; Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().cascadeBy((n) => { o.push(n.get('id')); }); return o; });
    const codes = await p2.evaluate(async () => Promise.all(['employes', 'journal?debut=2026-09-01&fin=2026-09-30', 'journal/csv?debut=2026-09-01&fin=2026-09-30']
      .map(async (u) => (await fetch('../api/v1/activite-equipes/' + u)).status)));
    ok('Profil sans le droit : menu absent, routes refusées (403)', menu.indexOf('activiteequipes') < 0 && codes.every((c) => c === 403), codes.join(','));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    retirer();
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
