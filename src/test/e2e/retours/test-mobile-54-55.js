/* DEMANDES MOBILES 54 ET 55 (transmission du 25/10).
 *
 * 54 - Cloture Mobile Money par la notification du fournisseur : le poste d'encaissement de la vente reste celui de
 *      la vente (poste de saisie), pas le nom reseau du fournisseur. A lancer avec le simulateur de paiement actif
 *      (proprietes systeme PRESTIGE_PAIEMENTS_FOURNISSEUR=simulateur et PRESTIGE_PAIEMENTS_SIMULATEUR_SECRET).
 *      Parcours : poste « E2E Poste saisie 54 » enregistre dans le navigateur, SERVICE CLIENT > Ventes > Nouvelle
 *      vente, un article ; paiement WAVE avec cloture automatique ; la notification signee arrive d'ailleurs
 *      (en-tete X-Poste « E2E Fournisseur 54 », comme un nom reseau) : vente terminee, poste d'encaissement =
 *      poste de saisie.
 * 55 - GET v1/reception/peremptions-courtes : « peutChangerStatut » au niveau de total et valeur ; vrai pour admin,
 *      faux pour un compte sans le droit P_BL_MOBILE_ACCEPTER_PEREMPTION_COURTE (et le PUT du statut lui est refuse).
 * Tout est retire a la fin (vente, paiement, stock, compte d'essai).
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 300) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const POSTE = 'E2E Poste saisie 54', FOURNISSEUR = 'E2E Fournisseur 54';
const ID = 'E2E-M55', LOGIN = 'e2e-m55', MDP = 'E2e-M55-7';
const ROLE = q("SELECT lg_ROLE_ID FROM t_role WHERE str_NAME = 'Vendeur'");
const [PRODUIT, CIP, STOCK] = q("SELECT f.lg_FAMILLE_ID, f.int_CIP, s.int_NUMBER_AVAILABLE FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
  + " AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' AND s.int_NUMBER_AVAILABLE > 5 AND LENGTH(f.int_CIP) = 7 LIMIT 1").split('\t');
const NUMBER = q("SELECT int_NUMBER FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + PRODUIT + "'");
const ventes = [];

function nettoyer() {
  for (const v of ventes) {
    const det = "(SELECT lg_PREENREGISTREMENT_DETAIL_ID FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "')";
    const regl = q("SELECT IFNULL(lg_REGLEMENT_ID, '') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
    q("DELETE FROM hmvtproduit WHERE lg_PREENREGISTREMENT_DETAIL_ID IN " + det + "; DELETE FROM mvttransaction WHERE vente_id = '" + v + "';"
      + " DELETE FROM vente_reglement WHERE vente_id = '" + v + "'; DELETE FROM t_recettes WHERE str_REF_FACTURE = '" + v + "'; DELETE FROM t_cash_transaction WHERE lg_REGLEMENT_ID = '" + regl + "';"
      + " DELETE FROM t_preenregistrement_compte_client WHERE lg_PREENREGISTREMENT_ID = '" + v + "'; DELETE FROM paiement_mobile WHERE vente_id = '" + v + "';"
      + " DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + v + "'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "';"
      + " DELETE FROM t_reglement WHERE lg_REGLEMENT_ID = '" + regl + "'");
  }
  /* la cloture a destocke l'article : stock remis a sa valeur d'avant le test */
  q("UPDATE t_famille_stock SET int_NUMBER = " + NUMBER + ", int_NUMBER_AVAILABLE = " + STOCK + " WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + PRODUIT + "'");
  q("DELETE FROM t_role_user WHERE lg_USER_ID = '" + ID + "'; DELETE FROM t_event_log WHERE lg_USER_ID = '" + ID + "';"
    + " DELETE FROM t_session_utilisateur WHERE lg_USER_ID = '" + ID + "'; DELETE FROM t_user WHERE lg_USER_ID = '" + ID + "'");
}

(async () => {
  nettoyer();
  const b = await chromium.launch({ executablePath: ENV_E2E.CHROMIUM, headless: true });
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  try {
    /* ---------- 54 ---------- */
    const p = await ctx.newPage();
    await connexion(p, 'admin', 'e2etest');
    await p.evaluate((n) => window.PrestigePoste.ecrire(n), POSTE);
    const api = (m, u, c, poste) => p.evaluate(async ([m, u, c, poste]) => { const r = await fetch(u, { method: m, headers: { 'Content-Type': 'application/json', 'X-Poste': encodeURIComponent(poste) },
      body: c === undefined ? undefined : JSON.stringify(c) }); const t = await r.text(); let j; try { j = JSON.parse(t); } catch (e) { j = { brut: t.slice(0, 120) }; } j.http = r.status; return j; }, [m, u, c, poste]);
    const cap = await api('GET', '../api/v1/paiements-mobile/capacites', undefined, POSTE);
    ok('Précondition : simulateur de paiement actif', cap.fournisseur === 'simulateur', JSON.stringify(cap).slice(0, 160));
    await ouvrirMenu(p, 'SERVICE CLIENT', 'Ventes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('cloturerventemanager #addBtn').some((x) => x.isVisible(true)), null, { timeout: 60000 });
    await cliquer(p, 'cloturerventemanager #addBtn');
    const produit = 'doventemanager #contenu [xtype=fieldcontainer] #produit';
    await p.waitForFunction((r) => Ext.ComponentQuery.query(r).some((x) => x.isVisible(true)), produit, { timeout: 60000 });
    await p.waitForTimeout(1500);
    await cliquer(p, produit);
    await p.keyboard.type(CIP, { delay: 30 });
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => { const c = testextjs.app.getController('VenteCtr').current; return c && parseInt(c.intPRICE, 10) > 0; }, null, { timeout: 20000 });
    const vente = await p.evaluate(() => testextjs.app.getController('VenteCtr').current.lgPREENREGISTREMENTID);
    ventes.push(vente);
    await p.waitForLoadState('networkidle').catch(() => {});
    const saisie = q("SELECT IFNULL(str_POSTE_SAISIE, '') FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vente + "'");
    ok('Vente commencée par l\'écran : poste de saisie = nom du poste', saisie === POSTE, vente + ' ' + saisie);
    const pm = await api('POST', '../api/v1/paiements-mobile', { venteId: vente, operateur: 'WAVE', cloturer: true }, POSTE);
    const idp = pm.data && pm.data.id;
    ok('Paiement WAVE avec clôture automatique créé', pm.success === true && !!idp, JSON.stringify(pm).slice(0, 200));
    const notif = await api('POST', '../api/v1/paiements-mobile/' + idp + '/simuler?payer=true', undefined, FOURNISSEUR);
    let etat = '';
    for (let i = 0; i < 20; i++) {
      etat = q("SELECT CONCAT_WS('|', str_STATUT, IFNULL(str_POSTE, '(vide)')) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vente + "'");
      if (/^is_Closed/.test(etat)) { break; }
      await p.waitForTimeout(500);
    }
    ok('54 · Clôture par la notification du fournisseur : vente terminée, poste d\'encaissement = poste de la vente', etat === 'is_Closed|' + POSTE,
      etat + ' / ' + JSON.stringify(notif).slice(0, 160));

    /* ---------- 55 ---------- */
    const liste = await api('GET', '../api/v1/reception/peremptions-courtes', undefined, POSTE);
    ok('55 · Admin : peutChangerStatut = true, au niveau de total et valeur', liste.peutChangerStatut === true && 'total' in liste && 'valeur' in liste,
      JSON.stringify({ total: liste.total, valeur: liste.valeur, peutChangerStatut: liste.peutChangerStatut }));
    q("INSERT INTO t_user (lg_USER_ID, str_LOGIN, str_PASSWORD, str_FIRST_NAME, str_LAST_NAME, str_FUNCTION, str_STATUT, lg_EMPLACEMENT_ID, dt_CREATED, int_CONNEXION)"
      + " VALUES ('" + ID + "', '" + LOGIN + "', MD5('" + MDP + "'), 'E2E', 'M55', 'Vendeur', 'enable', '1', NOW(), 0)");
    q("INSERT INTO t_role_user (lg_USER_ROLE_ID, lg_ROLE_ID, lg_USER_ID, dt_CREATED) VALUES ('" + ID + "', '" + ROLE + "', '" + ID + "', NOW())");
    const sansDroit = q("SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_ID = '" + ROLE + "' AND lg_PRIVILEGE_ID = (SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME = 'P_BL_MOBILE_ACCEPTER_PEREMPTION_COURTE')") === '0';
    const p2 = await (await b.newContext()).newPage();
    await p2.goto(require('../outils/vues').BASE + '/security/index.html', { waitUntil: 'domcontentloaded' });
    const r2 = await p2.evaluate(async ([l, m]) => { await fetch('../api/v1/user/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: l, password: m }) });
      const x = await (await fetch('../api/v1/reception/peremptions-courtes')).json();
      const put = await fetch('../api/v1/reception/peremptions-courtes/inconnu/statut?statut=RECLAME', { method: 'PUT' });
      return { peut: x.peutChangerStatut, total: x.total, put: put.status }; }, [LOGIN, MDP]);
    ok('55 · Compte sans le droit : peutChangerStatut = false, et le changement de statut lui est refusé (403)', sansDroit && r2.peut === false && r2.put === 403 && r2.total !== undefined, JSON.stringify(r2));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    nettoyer();
    ok('Données d\'essai retirées, stock remis', q("SELECT COUNT(*) FROM t_user WHERE lg_USER_ID = '" + ID + "'") === '0'
      && q("SELECT int_NUMBER_AVAILABLE FROM t_famille_stock WHERE lg_EMPLACEMENT_ID = '1' AND lg_FAMILLE_ID = '" + PRODUIT + "'") === STOCK
      && ventes.every((v) => q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + v + "'") === '0'));
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
