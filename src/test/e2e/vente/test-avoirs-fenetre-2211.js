/* AVOIRS EN COURS : FENETRE DU TABLEAU DE BORD ET « RAPPELER AVOIR » (retours du 22/11, lot 10, point 1).
 *
 * Jeu d'essai : six ventes en avoir clonees d'une vente cloturee (sans client), prefixe E2E-AVF :
 *  - quatre avoirs en cours d'ages varies (aujourd'hui, 9 j, 45 j, 400 j), montants differents ;
 *  - une vente annulee portant encore le drapeau d'avoir (ne doit figurer ni dans l'alerte ni dans la liste) ;
 *  - un avoir cloture (onglet « Avoir clôturé » seulement).
 * Par les clics (compte e2e), tableau de bord (ecran d'accueil), carte « Alertes » :
 *  - rapprochement : nombre de l'alerte « Avoirs » = base = total de la liste de la fenetre = lignes affichees, vente par
 *    vente (reference, montant), dans l'ordre de l'ecran (date) ; la vente annulee et l'avoir cloture absents ;
 *  - la liste s'ouvre dans une fenetre modale au-dessus du tableau de bord (masque, tableau de bord toujours la), sur
 *    l'onglet « Avoir en cours », depuis le plus ancien avoir en cours ;
 *  - colonne « Rappeler avoir » (plus de « Modifier ») ; un clic ferme la fenetre et ouvre la vente rappelee (meme reference) ;
 *  - menu SERVICE CLIENT > « Liste des avoirs » : ecran habituel (periode du mois), meme colonne, meme exclusion ;
 *  - bilan : ventes d'essai intactes (aucune ecriture par l'ecran), puis retirees ; aucune erreur JS.
 */
const { chromium } = require('playwright-core');
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const { connexion, ouvrirMenu } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 600) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-e', s], { encoding: 'utf8' });

const PFX = 'E2E-AVF';
/* [suffixe, age en jours, montant, annulee, cloturee] */
const VENTES = [['A0', 0, 1250, 0, 0], ['A1', 9, 3400, 0, 0], ['A2', 45, 870, 0, 0], ['A3', 400, 15600, 0, 0], ['AN', 20, 2222, 1, 0], ['AC', 30, 4100, 0, 1]];
const ID = (s) => PFX + '-' + s;
const LISTE = VENTES.map((v) => "'" + ID(v[0]) + "'").join(',');
const REF = (s) => 'E2EAVF' + s;
const OUVERTS = "SELECT p.lg_PREENREGISTREMENT_ID FROM t_preenregistrement p WHERE p.b_IS_AVOIR = 1 AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.dt_CLOTURE_AVOIR IS NULL";
const empreinte = () => q(`SELECT IFNULL(MD5(GROUP_CONCAT(CONCAT_WS('|', lg_PREENREGISTREMENT_ID, str_REF, int_PRICE, b_IS_AVOIR, b_HAS_AVOIR, b_IS_CANCEL, IFNULL(dt_CLOTURE_AVOIR, '-'), dt_UPDATED, str_STATUT) ORDER BY lg_PREENREGISTREMENT_ID)), '-') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (${LISTE})`);

function retirer() {
  exec(`DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID IN (${LISTE}); DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN (${LISTE});`);
}
function cloner(modele) {
  const detail = q(`SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '${modele}' LIMIT 1`);
  VENTES.forEach(([s, age, montant, annulee, cloturee]) => {
    const id = ID(s);
    exec(`CREATE TEMPORARY TABLE tp AS SELECT * FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${modele}';`
      + `UPDATE tp SET lg_PREENREGISTREMENT_ID = '${id}', lg_CLIENT_ID = NULL, str_REF = '${REF(s)}', str_REF_TICKET = '${REF(s)}', int_PRICE = ${montant}, int_PRICE_REMISE = 0,`
      + ` b_IS_AVOIR = ${cloturee ? 0 : 1}, b_HAS_AVOIR = ${cloturee ? 1 : 0}, b_IS_CANCEL = ${annulee}, dt_CLOTURE_AVOIR = ${cloturee ? 'NOW() - INTERVAL 1 DAY' : 'NULL'},`
      + ` dt_UPDATED = NOW() - INTERVAL ${age} DAY - INTERVAL ${VENTES.findIndex((v) => v[0] === s)} MINUTE, dt_CREATED = NOW() - INTERVAL ${age} DAY - INTERVAL 1 HOUR;`
      + 'INSERT INTO t_preenregistrement SELECT * FROM tp; DROP TEMPORARY TABLE tp;'
      + `CREATE TEMPORARY TABLE td AS SELECT * FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_DETAIL_ID = '${detail}';`
      + `UPDATE td SET lg_PREENREGISTREMENT_DETAIL_ID = '${id}-D0', lg_PREENREGISTREMENT_ID = '${id}', int_QUANTITY = 3, int_QUANTITY_SERVED = 1, int_AVOIR = 2, int_AVOIR_SERVED = 0,`
      + ` int_PRICE = ${montant}, str_STATUT = 'is_Closed';`
      + 'INSERT INTO t_preenregistrement_detail SELECT * FROM td; DROP TEMPORARY TABLE td;'
      + `UPDATE t_preenregistrement_detail SET b_IS_AVOIR = ${cloturee ? 0 : 1} WHERE lg_PREENREGISTREMENT_DETAIL_ID = '${id}-D0';`);
  });
}

(async () => {
  const modele = q("SELECT MIN(p.lg_PREENREGISTREMENT_ID) FROM t_preenregistrement p JOIN t_user u ON u.lg_USER_ID = p.lg_USER_CAISSIER_ID WHERE p.str_STATUT = 'is_Closed' AND COALESCE(p.b_IS_CANCEL, 0) = 0"
    + " AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID = '1' AND EXISTS (SELECT 1 FROM t_preenregistrement_detail d WHERE d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID)"
    + " AND p.dt_UPDATED >= (SELECT MAX(dt_UPDATED) - INTERVAL 30 DAY FROM t_preenregistrement)");
  ok('Préalable : une vente modèle cloturée', !!modele && modele !== 'NULL', modele);
  if (!modele || modele === 'NULL') { process.exit(1); }
  retirer();
  let b = null;
  const erreurs = [];
  try {
    cloner(modele);
    const avant = empreinte();
    const base = q(`SELECT CONCAT_WS('|', p.lg_PREENREGISTREMENT_ID, p.str_REF, p.int_PRICE) FROM (${OUVERTS.replace('SELECT p.lg_PREENREGISTREMENT_ID', 'SELECT p.*')}) p ORDER BY p.dt_UPDATED, p.lg_PREENREGISTREMENT_ID`).split('\n').filter(Boolean);
    const depuis = q(`SELECT DATE_FORMAT(MIN(p.dt_UPDATED), '%d/%m/%Y') FROM (${OUVERTS.replace('SELECT p.lg_PREENREGISTREMENT_ID', 'SELECT p.*')}) p`);
    ok('Jeu varié : 4 avoirs en cours d\'âges et montants différents, 1 vente annulée et 1 avoir clôturé hors des avoirs en cours',
      base.filter((l) => l.startsWith(PFX)).length === 4 && !base.some((l) => l.startsWith(ID('AN')) || l.startsWith(ID('AC'))), base.length + ' en base');

    b = await ENV_E2E.lancer(chromium);
    const ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => erreurs.push(e.message));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.waitForFunction(() => window.testextjs && testextjs.view.tableaubord && Ext.ComponentQuery.query('tableaubord').length, null, { timeout: 90000 });
    const ligneAvoirs = p.locator('tr.tb-clic').filter({ hasText: 'ventes en avoir en cours' }).filter({ visible: true }).first();
    await ligneAvoirs.waitFor({ timeout: 120000 });
    /* les tuiles du jour sont en cache 1 minute : « Actualiser », comme l'utilisateur, pour lire le jeu d'essai */
    const frais = p.waitForResponse((r) => r.url().includes('tableau-bord/tuiles') && r.url().includes('frais=1'), { timeout: 120000 });
    await p.locator('button[data-tb="actualiser"]').filter({ visible: true }).first().click();
    await frais;
    await p.waitForTimeout(1000);
    await ligneAvoirs.waitFor({ timeout: 60000 });
    const texte = (await ligneAvoirs.textContent()).replace(/\s+/g, ' ').trim();
    const nAlerte = Number((texte.match(/([\d\s]+) ventes en avoir en cours/) || [, '-1'])[1].replace(/\s/g, ''));
    ok('Alerte « Avoirs » : ' + nAlerte + ' = base (' + base.length + ', ventes annulées exclues)', nAlerte === base.length, texte);

    /* clic : fenetre modale au-dessus du tableau de bord */
    const [rep] = await Promise.all([
      p.waitForResponse((r) => /api\/v1\/ventestats\?/.test(r.url()) && /avoirStatut=EN_COURS/.test(r.url()), { timeout: 60000 }),
      ligneAvoirs.click(),
    ]);
    const api = await rep.json();
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('venteavoirmanager #gridEnCours')[0]; return g && g.isVisible(true) && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await p.waitForTimeout(600);
    const fen = await p.evaluate(() => {
      const e = Ext.ComponentQuery.query('venteavoirmanager')[0], w = e.up('window'), g = e.down('#gridEnCours'), v = g.getView();
      const masque = Ext.getBody().query('.x-mask').some((m) => m.offsetWidth > 0 && m.offsetHeight > 0);
      return { dansFenetre: !!w, modale: !!(w && w.modal), masque, titre: w ? w.title : '', onglet: e.down('#avoirTabs').getActiveTab().itemId,
        tableauBord: Ext.ComponentQuery.query('tableaubord').some((t) => t.isVisible(true)),
        du: e.down('#dtStart').getRawValue(), total: g.getStore().getTotalCount(),
        entetes: g.columns.map((c) => (c.text || '').replace(/<[^>]*>/g, '').trim()),
        lignes: g.getStore().getRange().map((r) => [r.get('lgPREENREGISTREMENTID'), r.get('strREF'), r.get('intPRICE')].join('|')),
        affiche: Array.from(v.getEl().dom.querySelectorAll('.x-grid-row')).map((n) => n.textContent) };
    });
    ok('Fenêtre modale au-dessus du tableau de bord (masque, tableau de bord toujours là), onglet « Avoir en cours »', fen.dansFenetre && fen.modale && fen.masque && fen.tableauBord && fen.onglet === 'tabEnCours',
      JSON.stringify({ ...fen, lignes: undefined, affiche: undefined, entetes: undefined }));
    ok('Période de la fenêtre : depuis le plus ancien avoir en cours (' + depuis + ')', fen.du === depuis, fen.du);
    ok('Rapprochement : alerte = total de la liste = API = base (' + base.length + ')', fen.total === nAlerte && api.total === base.length && fen.total === base.length, fen.total + ' / ' + api.total);
    const attendues = base.slice(0, 15);
    const ecarts = attendues.map((a, i) => (a === fen.lignes[i] ? null : i + ' ' + fen.lignes[i] + ' / ' + a)).filter(Boolean);
    ok('Lignes de la fenêtre = base, vente par vente (référence, montant, ordre de date)', fen.lignes.length === attendues.length && ecarts.length === 0, ecarts.slice(0, 3).join(' | '));
    ok('Vente annulée et avoir clôturé absents de la fenêtre', !fen.affiche.some((t) => t.includes(REF('AN')) || t.includes(REF('AC'))) && !fen.lignes.some((l) => l.startsWith(ID('AN'))));
    ok('Colonne « Rappeler avoir », plus de « Modifier »', fen.entetes.includes('Rappeler avoir') && !fen.entetes.includes('Modifier'), fen.entetes.join(', '));

    /* « Rappeler avoir » sur A1 : la fenetre se ferme, la vente s'ouvre */
    const icone = await p.evaluate((id) => {
      const g = Ext.ComponentQuery.query('venteavoirmanager #gridEnCours')[0], col = g.down('#colRappelerAvoir') || g.columns.filter((c) => /Modifier|Rappeler/.test(c.text))[0];
      const n = g.getView().getNode(g.getStore().findExact('lgPREENREGISTREMENTID', id)); n.scrollIntoView();
      const img = n.querySelector(g.getView().getCellSelector(col) + ' img'); img.id = 'e2e-rappel'; return { bulle: img.getAttribute('data-qtip') || '' };
    }, ID('A1'));
    await p.click('#e2e-rappel');
    await p.waitForFunction(() => Ext.ComponentQuery.query('doAvoir #refVente').some((c) => c.isVisible(true) && c.getValue()), null, { timeout: 60000 });
    const apres = await p.evaluate(() => ({ fenetres: Ext.ComponentQuery.query('window').filter((w) => w.isVisible() && w.down && w.down('venteavoirmanager')).length,
      ref: Ext.ComponentQuery.query('doAvoir #refVente')[0].getValue() }));
    ok('« Rappeler avoir » : la fenêtre se ferme et la vente rappelée s\'ouvre (même référence)', apres.fenetres === 0 && apres.ref === REF('A1'), JSON.stringify(apres) + ' ' + icone.bulle);

    /* menu : ecran habituel, periode du mois, meme colonne, meme exclusion */
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Liste des avoirs');
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('venteavoirmanager #gridEnCours')[0]; return g && g.isVisible(true) && g.getStore().lastOptions && !g.getStore().isLoading(); }, null, { timeout: 60000 });
    await p.waitForTimeout(600);
    const menu = await p.evaluate(() => { const e = Ext.ComponentQuery.query('venteavoirmanager')[0], g = e.down('#gridEnCours');
      return { fenetre: !!e.up('window'), du: e.down('#dtStart').getRawValue(), entetes: g.columns.map((c) => (c.text || '').trim()),
        lignes: g.getStore().getRange().map((r) => r.get('lgPREENREGISTREMENTID')) }; });
    const debutMois = q("SELECT DATE_FORMAT(CURDATE(), '01/%m/%Y')");
    const duMois = q(`SELECT IFNULL(GROUP_CONCAT(p.lg_PREENREGISTREMENT_ID ORDER BY p.dt_UPDATED, p.lg_PREENREGISTREMENT_ID), '') FROM (${OUVERTS.replace('SELECT p.lg_PREENREGISTREMENT_ID', 'SELECT p.*')}) p WHERE p.dt_UPDATED >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`).split(',').filter(Boolean).slice(0, 15);
    ok('Menu « Liste des avoirs » : écran habituel (pas de fenêtre), du 1er du mois, colonne « Rappeler avoir », lignes = base du mois sans la vente annulée',
      !menu.fenetre && menu.du === debutMois && menu.entetes.includes('Rappeler avoir') && JSON.stringify(menu.lignes) === JSON.stringify(duMois), JSON.stringify(menu) + ' / ' + duMois);

    ok('Bilan : ventes d\'essai intactes (l\'écran n\'écrit rien)', empreinte() === avant);
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Déroulé sans exception', false, x.stack || x);
  } finally {
    if (b) { await b.close(); }
    retirer();
    ok('Nettoyage : ventes d\'essai retirées', q(`SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '${PFX}%'`) === '0'
      && q(`SELECT COUNT(*) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '${PFX}%'`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
