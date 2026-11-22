/* BFR : CARTE DU TABLEAU DE BORD ET MENU « BFR » (ANALYSE DE GESTION), plan du 19/11.
 *
 * BFR = stock valorise (achat) + creances clients (differes, factures tiers payant non reglees, parts tiers payant non
 * facturees) − dettes fournisseurs (« À régler » depuis la date de depart) ; jours = BFR / CA HT (360 j) × 360.
 *
 * Copie de travail (laborex_audit) : la date de depart passe au 01/10/2026 le temps du test (sinon aucune dette), puis
 * elle est remise. Vrai chemin : tableau de bord (carte « BFR ») et menu ANALYSE DE GESTION > BFR.
 *  - rapprochement, composante par composante : carte = menu = API = sources (valorisation du stock, releve des
 *    differes, onglet « À régler », Analyse des marges) = base (calcul SQL independant) ; detail du menu (factures et
 *    parts par organisme, dettes par grossiste) = base, ligne par ligne, et sa somme = la composante ;
 *  - coherence a l'ecran : BFR = stock + creances − dettes ; jours = BFR / CA HT × 360 ; postes non suivis a 0 avec
 *    « non suivi dans Prestige » ; mention « Dettes fournisseurs suivies depuis le 01/10/2026 » ;
 *  - plan du 21/11 : la carte du tableau de bord est retiree (le menu reste) ; la route garde les memes chiffres ;
 *  - droit : sans P_SM_BFR, ni carte, ni menu, et le serveur refuse ;
 *  - bilan : lecture seule, rien n'est ecrit (empreinte des tables) ; aucune erreur JavaScript, aucune fenetre.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 26 }).replace(/\r/g, '').trim();
const LOGIN = ENV_E2E.LOGIN;
const EMPL = q(`SELECT lg_EMPLACEMENT_ID FROM t_user WHERE str_LOGIN = '${LOGIN}'`);
const DEPART0 = q("SELECT IFNULL((SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_REGLEMENT_FRS_DATE_DEPART'), '∅')");
const DEPART = '2026-10-01';
const AUJ = q('SELECT CURDATE()');
const DEMAIN = q('SELECT CURDATE() + INTERVAL 1 DAY');
const DEBUT_CA = q('SELECT CURDATE() - INTERVAL 359 DAY');
const PLAFOND_CARTE_MS = 15000, ECART_TB_MS = 1500;
const PRIV = q("SELECT IFNULL((SELECT lg_PRIVELEGE_ID FROM t_privilege WHERE str_NAME = 'P_SM_BFR'), '')");
const ROLES = q(`SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_user u ON u.lg_USER_ID = ru.lg_USER_ID WHERE u.str_LOGIN = '${LOGIN}'`).split('\n').filter(Boolean);
const n = (v) => Math.round(+v || 0);
const DROITS0 = PRIV ? +q(`SELECT COUNT(*) FROM t_role_privelege WHERE lg_PRIVILEGE_ID = '${PRIV}' AND lg_ROLE_ID IN (${ROLES.map((r) => `'${r}'`).join(',')})`) : 0;

/* ---- base : calculs independants ---- */
const base = () => {
  const stock = n(q(`SELECT (SELECT COALESCE(SUM(s.int_NUMBER_AVAILABLE * f.int_PAF), 0) FROM t_famille_stock s JOIN t_famille f ON f.lg_FAMILLE_ID = s.lg_FAMILLE_ID
    WHERE s.lg_EMPLACEMENT_ID = '${EMPL}' AND f.str_STATUT = 'enable' AND s.str_STATUT = 'enable')
    + (SELECT COALESCE(SUM(t.int_NUMBER * f.int_PAF), 0) FROM t_type_stock_famille t JOIN t_famille f ON f.lg_FAMILLE_ID = t.lg_FAMILLE_ID
    WHERE t.lg_TYPE_STOCK_ID = '2' AND t.lg_EMPLACEMENT_ID = '${EMPL}' AND f.str_STATUT = 'enable' AND t.str_STATUT = 'enable')`));
  const differes = n(q(`SELECT (SELECT COALESCE(SUM(GREATEST(0, tp.int_PRICE - COALESCE((SELECT SUM(m.montantPaye) FROM mvttransaction m WHERE m.pkey = tp.lg_PREENREGISTREMENT_ID), 0))), 0)
    FROM t_preenregistrement_compte_client tp JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = tp.lg_PREENREGISTREMENT_ID
    JOIN t_compte_client cc ON cc.lg_COMPTE_CLIENT_ID = tp.lg_COMPTE_CLIENT_ID JOIN t_client c ON c.lg_CLIENT_ID = cc.lg_CLIENT_ID JOIN t_user u ON u.lg_USER_ID = tp.lg_USER_ID
    WHERE tp.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND u.lg_EMPLACEMENT_ID = '${EMPL}')
    - (SELECT COALESCE(SUM(m.montantRegle), 0) FROM mvttransaction m WHERE m.typeMvtCaisseId = '2' AND m.checked = 1 AND m.lg_EMPLACEMENT_ID = '${EMPL}')`));
  const parOrg = (sql) => q(sql).split('\n').filter(Boolean).map((l) => { const [o, nb, m] = l.split('#'); return { organisme: o || '(sans organisme)', nombre: +nb, montant: n(m) }; });
  const factures = parOrg(`SELECT CONCAT_WS('#', IFNULL(tp.str_FULLNAME, ''), COUNT(*), SUM(f.dbl_MONTANT_RESTANT)) FROM t_facture f LEFT JOIN t_tiers_payant tp ON tp.lg_TIERS_PAYANT_ID = f.str_CUSTOMER
    WHERE f.dbl_MONTANT_RESTANT > 0 GROUP BY f.str_CUSTOMER, tp.str_FULLNAME`);
  const parts = parOrg(`SELECT CONCAT_WS('#', tp.str_FULLNAME, COUNT(*), SUM(c.int_PRICE)) FROM t_tiers_payant tp
    JOIN t_compte_client_tiers_payant cc ON tp.lg_TIERS_PAYANT_ID = cc.lg_TIERS_PAYANT_ID
    JOIN t_preenregistrement_compte_client_tiers_payent c ON cc.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID
    JOIN t_preenregistrement p ON c.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID JOIN t_type_tiers_payant ty ON ty.lg_TYPE_TIERS_PAYANT_ID = tp.lg_TYPE_TIERS_PAYANT_ID
    WHERE p.str_STATUT = 'is_Closed' AND c.str_STATUT_FACTURE = 'unpaid' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 GROUP BY tp.lg_TIERS_PAYANT_ID, tp.str_FULLNAME`);
  const grossistes = q(`SELECT CONCAT_WS('#', g.str_LIBELLE, COUNT(*), SUM(x.du)) FROM (SELECT o.lg_GROSSISTE_ID, GREATEST(0, GREATEST(0, IFNULL(b.int_HTTC, 0))
      - CASE WHEN b.int_MONTANT_REGLE IS NOT NULL THEN GREATEST(0, b.int_MONTANT_REGLE) WHEN b.STATUS = 'REGLE' THEN GREATEST(0, IFNULL(b.int_HTTC, 0)) ELSE 0 END) du
    FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID WHERE b.str_STATUT = 'is_Closed' AND b.dt_DATE_LIVRAISON >= '${DEPART}') x
    JOIN t_grossiste g ON g.lg_GROSSISTE_ID = x.lg_GROSSISTE_ID WHERE x.du > 0 GROUP BY g.lg_GROSSISTE_ID, g.str_LIBELLE`).split('\n').filter(Boolean)
    .map((l) => { const [g, nb, m] = l.split('#'); return { grossiste: g, nombre: +nb, montant: n(m) }; });
  const caHt = n(q(`SELECT COALESCE(SUM(d.int_PRICE) - SUM(IFNULL(d.int_PRICE_REMISE, 0)) - SUM(IFNULL(d.montantTva, 0)), 0)
    FROM t_preenregistrement_detail d JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID
    WHERE p.dt_UPDATED >= '${DEBUT_CA}' AND p.dt_UPDATED < '${DEMAIN}' AND u.lg_EMPLACEMENT_ID = '${EMPL}' AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0
    AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'`));
  const somme = (l) => l.reduce((s, x) => s + x.montant, 0);
  const creances = differes + somme(factures) + somme(parts), dettes = somme(grossistes);
  const bfr = stock + creances - dettes;
  return { stock, differes, factures, parts, grossistes, caHt, creances, dettes, bfr, totalFactures: somme(factures), totalParts: somme(parts),
    jours: caHt > 0 ? Math.round(bfr * 3600 / caHt) / 10 : null };
};
const empreinte = () => q(`SELECT CONCAT_WS('|', (SELECT COUNT(*) FROM t_preenregistrement), (SELECT COUNT(*) FROM t_bon_livraison),
  (SELECT MD5(GROUP_CONCAT(CONCAT_WS('#', lg_BON_LIVRAISON_ID, IFNULL(int_MONTANT_REGLE, '∅'), IFNULL(STATUS, '∅')) ORDER BY lg_BON_LIVRAISON_ID)) FROM t_bon_livraison),
  (SELECT CONCAT(COUNT(*), ':', ROUND(SUM(dbl_MONTANT_RESTANT))) FROM t_facture), (SELECT COUNT(*) FROM reglement_fournisseur),
  (SELECT COUNT(*) FROM t_mvt_caisse), (SELECT COUNT(*) FROM mvttransaction), (SELECT SUM(int_NUMBER_AVAILABLE) FROM t_famille_stock),
  (SELECT MD5(GROUP_CONCAT(str_KEY, '=', IFNULL(str_VALUE, '') ORDER BY str_KEY)) FROM t_parameters),
  (SELECT COUNT(*) FROM t_event_log WHERE typeLog IN (44, 45, 46, 47, 48)))`);
/* listes comparees ligne par ligne, triees (deux organismes peuvent porter le meme nom) */
const memeListe = (ecran, sql, cle) => { const f = (l) => l.map((x) => [x[cle], x.nombre, x.montant].join('#')).sort(); const a = f(ecran), b2 = f(sql); const ec = [];
  for (let i = 0; i < Math.max(a.length, b2.length); i++) { if (a[i] !== b2[i]) { ec.push(a[i] + ' / ' + b2[i]); } }
  return ec; };

(async () => {
  ok('Précondition : migration passée (droit P_SM_BFR, menu « BFR »)', !!PRIV && q("SELECT COUNT(*) FROM t_sous_menu WHERE str_COMPOSANT = 'bfr' AND lg_MENU_ID = '3'") === '1', PRIV);
  if (!PRIV) { process.exit(1); }
  q(`UPDATE t_parameters SET str_VALUE = '${DEPART}' WHERE str_KEY = 'KEY_REGLEMENT_FRS_DATE_DEPART'`);
  const droitsRetires = [];
  let avant = '', B = null;
  try { avant = empreinte(); B = base(); } catch (e) { q(`UPDATE t_parameters SET str_VALUE = '${DEPART0}' WHERE str_KEY = 'KEY_REGLEMENT_FRS_DATE_DEPART'`); throw e; }
  ok('Précondition : stock, différés, factures, parts, dettes et CA HT non nuls (jeu varié)', B.stock > 0 && B.differes !== 0 && B.totalFactures > 0 && B.totalParts > 0 && B.dettes > 0 && B.caHt > 0, JSON.stringify({ ...B, factures: B.factures.length, parts: B.parts.length, grossistes: B.grossistes.length }));
  const b = await ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  const p = await ctx.newPage();
  const err = [], dialogues = [];
  p.on('pageerror', (e) => err.push(e.message));
  p.on('dialog', (d) => { dialogues.push(d.message()); d.dismiss().catch(() => {}); });
  let etape = 'connexion';
  try {
    await connexion(p, LOGIN, 'e2etest');
    const api = (url) => p.evaluate(async (u) => { const r = await fetch(u); const t = await r.text(); try { return JSON.parse(t); } catch (e) { return { brut: t.slice(0, 300) }; } }, url);
    await p.waitForFunction(() => window.testextjs && testextjs.view.tableaubord && Ext.ComponentQuery.query('tableaubord').length, null, { timeout: 90000 });

    const montant = (s) => { const v = String(s || '').replace(/^[+−]\s*/, ''); return (/^-/.test(v) ? -1 : 1) * +v.replace(/[^\d]/g, ''); };
    const lire = (racine) => p.evaluate((r) => { const o = {}; document.querySelectorAll(r + ' [data-bfr]').forEach((e) => { o[e.getAttribute('data-bfr')] = e.innerText.trim(); }); return o; }, racine);
    /* 1. API : sources et base */
    etape = 'api';
    let t = Date.now();
    const A = await api('../api/v1/bfr');
    const dApi = Date.now() - t;
    ok('API : BFR calculé (' + dApi + ' ms, serveur ' + A.dureeMs + ' ms)', A.success === true, JSON.stringify(A).slice(0, 300));
    const valo = await api(`../api/v1/produit/valorisation?mode=0&dtStart=${AUJ}`);
    ok('Stock : BFR = « Valorisation du stock » (total achat, rayon + réserve) = base', A.stock.total === B.stock && valo.data.totalValue === B.stock && A.stock.rayon + A.stock.reserve === A.stock.total,
      A.stock.total + ' / ' + valo.data.totalValue + ' / ' + B.stock);
    const releve = await api(`../api/v1/reglement/releve?dtStart=${DEMAIN}&dtEnd=${DEMAIN}`);
    ok('Différés : BFR = solde global du relevé des différés = base', A.creances.differes === B.differes && releve.soldeGlobalDebut === B.differes, A.creances.differes + ' / ' + releve.soldeGlobalDebut + ' / ' + B.differes);
    ok('Factures tiers payant non réglées : BFR = base (total et ligne par ligne)', A.creances.factures === B.totalFactures && memeListe(A.detail.factures, B.factures, 'organisme').length === 0,
      A.creances.factures + ' / ' + B.totalFactures + ' ' + memeListe(A.detail.factures, B.factures, 'organisme').slice(0, 3).join(' | '));
    ok('Parts tiers payant non facturées : BFR = base (total et ligne par ligne)', A.creances.parts === B.totalParts && memeListe(A.detail.parts, B.parts, 'organisme').length === 0,
      A.creances.parts + ' / ' + B.totalParts + ' ' + memeListe(A.detail.parts, B.parts, 'organisme').slice(0, 3).join(' | '));
    const aRegler = await api('../api/v1/reglements-fournisseurs/a-regler');
    ok('Dettes : BFR = « À régler » (onglet Règlements fournisseurs) = base, par grossiste', A.dettes.fournisseurs === B.dettes && aRegler.total === B.dettes && memeListe(A.detail.grossistes, B.grossistes, 'grossiste').length === 0,
      A.dettes.fournisseurs + ' / ' + aRegler.total + ' / ' + B.dettes + ' ' + memeListe(A.detail.grossistes, B.grossistes, 'grossiste').slice(0, 3).join(' | '));
    const marges = await api(`../api/v1/datareporting/marges/analyse?dtStart=${DEBUT_CA}&dtEnd=${AUJ}&partie=periode`);
    ok('CA HT (360 j) : BFR = Analyse des marges (même période) = base', A.caHt === B.caHt && marges.courante && marges.courante.ht === B.caHt && A.caDebutIso === DEBUT_CA,
      A.caHt + ' / ' + (marges.courante || {}).ht + ' / ' + B.caHt + ' ' + A.caDebutIso);
    ok('Calcul : BFR = stock + créances − dettes ; créances = différés + factures + parts ; jours = BFR / CA HT × 360',
      A.creances.total === A.creances.differes + A.creances.factures + A.creances.parts && A.bfr === A.stock.total + A.creances.total - A.dettes.total
      && A.bfr === B.bfr && A.jours === B.jours, A.bfr + ' / ' + B.bfr + ' ; ' + A.jours + ' / ' + B.jours);
    ok('Postes non suivis à 0 (« non suivi dans Prestige ») et mention de la date de départ',
      A.dettes.fiscalesSociales === 0 && A.dettes.autres === 0 && A.creances.autres === 0 && A.dettes.nonSuivi === 'non suivi dans Prestige'
      && A.mention === 'Dettes fournisseurs suivies depuis le 01/10/2026', A.mention);

    /* 2. tableau de bord : plan du 21/11, la carte BFR est retiree (le menu reste) ; la route reste juste */
    etape = 'tableau de bord';
    const tb = await p.evaluate(() => ({ carte: !!document.querySelector('[data-carte="bfr"]'), menu: !!Ext.ComponentQuery.query('tableaubord')[0].menu('bfr') }));
    ok('Tableau de bord : plus de carte « BFR » (plan du 21/11), le menu « BFR » reste', !tb.carte && tb.menu, JSON.stringify(tb));
    const af = await api('../api/v1/tableau-bord/bfr?frais=1');
    ok('Route du tableau de bord, sans cache : mêmes chiffres que l\'API du menu', af.success && af.bfr === A.bfr, af.bfr + ' / ' + A.bfr);

    /* 3. menu ANALYSE DE GESTION > BFR */
    etape = 'menu';
    t = Date.now();
    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'BFR');
    await p.waitForFunction(() => { const c = Ext.ComponentQuery.query('bfr').find((x) => x.isVisible(true)); return c && c.donnees && document.querySelector('#' + c.getId() + ' [data-bfr="bfr"]'); }, null, { timeout: 120000 });
    const dMenu = Date.now() - t;
    const idMenu = await p.evaluate(() => Ext.ComponentQuery.query('bfr').find((x) => x.isVisible(true)).getId());
    const M = await lire('#' + idMenu);
    const attenduJoursMenu = await p.evaluate((j) => (j === null ? 'non calculable (CA HT nul)' : Ext.util.Format.number(j, '0,000.0') + ' j'), B.jours);
    const champs = { stock: B.stock, differes: B.differes, factures: B.totalFactures, parts: B.totalParts, creances: B.creances, fournisseurs: B.dettes, dettes: B.dettes, bfr: B.bfr, caHt: B.caHt, autresCreances: 0, fiscales: 0, autresDettes: 0 };
    const ecartsMenu = Object.keys(champs).filter((k) => montant(M[k]) !== champs[k]).map((k) => k + ' ' + M[k] + ' / ' + champs[k]);
    ok('Menu « BFR » ouvert par le menu (' + dMenu + ' ms) : chaque composante = base', ecartsMenu.length === 0, ecartsMenu.join(' | '));
    ok('Menu : jours de CA HT = base (' + M.jours + ')', M.jours === attenduJoursMenu, M.jours + ' / ' + attenduJoursMenu);
    ok('Menu : BFR affiché = stock + créances − dettes affichés', montant(M.bfr) === montant(M.stock) + montant(M.creances) - montant(M.dettes));
    const texteMenu = await p.evaluate((id) => document.getElementById(id).innerText, idMenu);
    ok('Menu : mention « Dettes fournisseurs suivies depuis le 01/10/2026 » et postes « non suivi dans Prestige »',
      M.mention.indexOf('Dettes fournisseurs suivies depuis le 01/10/2026') === 0 && (texteMenu.match(/non suivi dans Prestige/g) || []).length >= 3, M.mention);
    const grilles = await p.evaluate(() => { const c = Ext.ComponentQuery.query('bfr').find((x) => x.isVisible(true)); const l = (id, k) => c.down(id).getStore().getRange().map((r) => ({ [k]: r.get(k), nombre: r.get('nombre'), montant: r.get('montant') }));
      return { factures: l('#bfrFactures', 'organisme'), parts: l('#bfrParts', 'organisme'), grossistes: l('#bfrGrossistes', 'grossiste') }; });
    const somme = (l) => l.reduce((s, x) => s + x.montant, 0);
    ok('Détail du menu : factures par organisme = base, somme = composante', memeListe(grilles.factures, B.factures, 'organisme').length === 0 && somme(grilles.factures) === montant(M.factures), memeListe(grilles.factures, B.factures, 'organisme').slice(0, 2).join(' | '));
    ok('Détail du menu : parts par organisme = base, somme = composante', memeListe(grilles.parts, B.parts, 'organisme').length === 0 && somme(grilles.parts) === montant(M.parts));
    ok('Détail du menu : dettes par grossiste = base, somme = composante', memeListe(grilles.grossistes, B.grossistes, 'grossiste').length === 0 && somme(grilles.grossistes) === montant(M.dettes));
    /* onglet « Parts » : vrai clic, la grille s'affiche */
    await p.locator('#' + idMenu + ' .x-tab').filter({ hasText: 'Parts tiers payant non facturées' }).first().click();
    const lignesParts = await p.locator('#' + idMenu + ' .x-grid-row').filter({ visible: true }).count();
    ok('Onglet « Parts tiers payant non facturées » : ses lignes s\'affichent', lignesParts === Math.min(B.parts.length, lignesParts) && lignesParts > 0, lignesParts);

    ok('Rapprochement route du tableau de bord = menu : BFR, stock, créances, dettes', montant(M.bfr) === af.bfr && montant(M.stock) === af.stock.total
      && montant(M.creances) === af.creances.total && montant(M.dettes) === af.dettes.total, JSON.stringify(M));
    /* 4. droit : sans P_SM_BFR */
    etape = 'droit';
    q(`SELECT CONCAT_WS('#', lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID) FROM t_role_privelege WHERE lg_PRIVILEGE_ID = '${PRIV}' AND lg_ROLE_ID IN (${ROLES.map((r) => `'${r}'`).join(',')})`)
      .split('\n').filter(Boolean).forEach((l) => droitsRetires.push(l.split('#')));
    q(`DELETE FROM t_role_privelege WHERE lg_PRIVILEGE_ID = '${PRIV}' AND lg_ROLE_ID IN (${ROLES.map((r) => `'${r}'`).join(',')})`);
    const ctx2 = await b.newContext({ viewport: { width: 1600, height: 1000 } });
    const p2 = await ctx2.newPage();
    p2.on('pageerror', (e) => err.push('p2 ' + e.message));
    await connexion(p2, LOGIN, 'e2etest');
    await p2.waitForFunction(() => window.testextjs && testextjs.view.tableaubord && Ext.ComponentQuery.query('tableaubord').length && document.querySelector('[data-carte="valorisation"]'), null, { timeout: 90000 });
    const sansDroit = await p2.evaluate(async () => ({ carte: !!document.querySelector('[data-carte="bfr"]'), menu: !!Ext.ComponentQuery.query('tableaubord')[0].menu('bfr'),
      api: await (await fetch('../api/v1/bfr')).json(), tb: await (await fetch('../api/v1/tableau-bord/bfr?frais=1')).json() }));
    ok('Sans le droit : ni carte, ni menu, et le serveur refuse (menu et carte)', !sansDroit.carte && !sansDroit.menu && sansDroit.api.interdit === true && sansDroit.tb.interdit === true && sansDroit.api.bfr === undefined, JSON.stringify(sansDroit).slice(0, 200));
    await ctx2.close();
    ok('Aucune erreur JavaScript, aucune fenêtre surgissante', err.length === 0 && dialogues.length === 0, err.concat(dialogues).join(' | '));
  } catch (e) {
    ok('Parcours sans exception (étape ' + etape + ')', false, e.stack);
  } finally {
    await b.close();
    droitsRetires.forEach(([id, role, priv]) => q(`INSERT IGNORE INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED) VALUES ('${id}', '${role}', '${priv}', NOW(), NOW())`));
    ok('Bilan : lecture seule, rien n\'a été écrit (ventes, BL, factures, règlements, caisse, stock, paramètres, journal)', empreinte() === avant, avant + ' / ' + empreinte());
    q(`UPDATE t_parameters SET str_VALUE = '${DEPART0}' WHERE str_KEY = 'KEY_REGLEMENT_FRS_DATE_DEPART'`);
    ok('Nettoyage : date de départ et droits remis', q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_REGLEMENT_FRS_DATE_DEPART'") === DEPART0
      && +q(`SELECT COUNT(*) FROM t_role_privelege WHERE lg_PRIVILEGE_ID = '${PRIV}' AND lg_ROLE_ID IN (${ROLES.map((r) => `'${r}'`).join(',')})`) === DROITS0);
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
