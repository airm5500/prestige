/* PRÉ-SAISIE DES BL (plan avoir du 08/11, point 6, phase 1).
 * Jeu d'essai (retiré à la fin) : deux grossistes G1 (TEDIS) et G2, deux commandes en cours de G1 (A et B, deux lignes
 * chacune, produits avec du stock à l'emplacement principal) ; numéros E2EPSB-…
 *  - écran par vrais clics : saisie (avec commande, sans commande, même numéro chez un autre grossiste), doublon refusé
 *    (casse et espaces compris), consultation et filtres, modification et suppression confirmées dans le bouton (aucune
 *    fenêtre), motif obligatoire, ressaisie permise après suppression ;
 *  - rapprochement : chaque ligne de l'écran = l'API = la base (grossiste, numéro, date, HT, TVA, TTC, séquence,
 *    commande, état, saisi par) ; bandeau des totaux = somme en base ;
 *  - création du BL par le vrai chemin de « Commande en cours » : la pré-saisie de même grossiste et de même numéro
 *    passe à « Traité » (date, opérateur, lien vers le BL) ; celle du même numéro chez l'autre grossiste ne bouge pas ;
 *  - bilan : la création du BL de la commande A (pré-saisie) laisse exactement les mêmes traces que celle de la
 *    commande B (sans pré-saisie), plus le seul passage à « Traité » ;
 *  - un BL traité ne se modifie ni ne se supprime ; sans le droit P_SM_PRESAISIE_BL : refus ; migration : droit donné
 *    à tous les rôles qui peuvent créer un BL ;
 *  - mise en page (1366 × 768) et aucune erreur JavaScript.
 */
const { execFileSync } = require('child_process');
const ENV_E2E = require('../outils/poste');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-e', s], { encoding: 'utf8' });
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8' }).trim();
const SORTIE = process.env.SORTIE || ENV_E2E.TMP;
const G1 = '51217123531215794892';
const CMD_A = 'E2E-PSB-CMDA', CMD_B = 'E2E-PSB-CMDB';
const ROLE = q("SELECT ru.lg_ROLE_ID FROM t_user u JOIN t_role_user ru ON ru.lg_USER_ID = u.lg_USER_ID WHERE u.str_LOGIN = '" + ENV_E2E.LOGIN + "' LIMIT 1");
const MOI = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const G2 = q("SELECT lg_GROSSISTE_ID FROM t_grossiste WHERE str_STATUT = 'enable' AND lg_GROSSISTE_ID <> '" + G1 + "' AND str_LIBELLE IS NOT NULL AND str_LIBELLE <> '' ORDER BY str_LIBELLE LIMIT 1");
const LIB = (g) => q("SELECT str_LIBELLE FROM t_grossiste WHERE lg_GROSSISTE_ID = '" + g + "'");
const fmt = (d) => d.toISOString().slice(0, 10);
const jour = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const fr = (d) => fmt(d).split('-').reverse().join('/');
let droit = null, P = [];

const TABLES_BILAN = ['t_bon_livraison', 't_bon_livraison_detail', 't_lot', 't_etiquette', 't_order', 't_order_detail', 't_presaisie_bl',
  'hmvtproduit', 'mvttransaction', 't_famille_stock', 'notification', 't_pharmaml_blv'];

function nettoyer() {
  exec("DELETE FROM t_presaisie_bl WHERE str_NUMERO LIKE 'E2EPSB-%';"
    + "DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID IN (SELECT lg_BON_LIVRAISON_ID FROM t_bon_livraison WHERE lg_ORDER_ID IN ('" + CMD_A + "', '" + CMD_B + "'));"
    + "DELETE FROM t_lot WHERE str_REF_LIVRAISON LIKE 'E2EPSB-%';"
    + "DELETE FROM t_bon_livraison WHERE lg_ORDER_ID IN ('" + CMD_A + "', '" + CMD_B + "');"
    + "DELETE FROM t_order_detail WHERE lg_ORDER_ID IN ('" + CMD_A + "', '" + CMD_B + "'); DELETE FROM t_order WHERE lg_ORDER_ID IN ('" + CMD_A + "', '" + CMD_B + "');");
}
function poser(cmd) {
  exec("INSERT INTO t_order (lg_ORDER_ID, str_REF_ORDER, int_LINE, lg_GROSSISTE_ID, lg_USER_ID, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE, recu, direct_import)"
    + " VALUES ('" + cmd + "', '" + cmd + "', 2, '" + G1 + "', '" + MOI + "', 'is_Process', NOW(), NOW(), 0, 0, 0)");
  P.forEach((p, i) => exec("INSERT INTO t_order_detail (lg_ORDERDETAIL_ID, lg_ORDER_ID, lg_FAMILLE_ID, lg_GROSSISTE_ID, int_NUMBER, int_QTE_REP_GROSSISTE, int_PRICE, int_PAF_DETAIL, int_PRICE_DETAIL, str_STATUT, dt_CREATED, dt_UPDATED)"
    + " VALUES ('" + cmd + "-" + i + "', '" + cmd + "', '" + p + "', '" + G1 + "', " + (i + 2) + ", " + (i + 2) + ", " + ((i + 2) * 1000) + ", 1000, 2000, 'is_Process', NOW(), NOW())"));
}
/* comptes de lignes par table (bilan avant / après) */
function compter() {
  const o = {};
  TABLES_BILAN.forEach((t) => { o[t] = Number(q('SELECT COUNT(*) FROM ' + t)); });
  o.stockTotal = Number(q("SELECT IFNULL(SUM(int_NUMBER_AVAILABLE), 0) FROM t_famille_stock WHERE lg_FAMILLE_ID IN ('" + P.join("','") + "')"));
  return o;
}
const ecart = (a, b) => { const d = {}; Object.keys(a).forEach((k) => { if (b[k] !== a[k]) { d[k] = b[k] - a[k]; } }); return d; };
const presaisies = () => q("SELECT GROUP_CONCAT(CONCAT_WS('|', lg_GROSSISTE_ID, str_NUMERO, DATE_FORMAT(dt_DATE_BL, '%Y-%m-%d'), int_MHT, int_TVA, int_TTC, IFNULL(str_SEQ_CLIENT, ''),"
  + " IFNULL(lg_ORDER_ID, ''), str_ETAT, lg_CREE_PAR, IFNULL(lg_BON_LIVRAISON_ID, ''), IFNULL(lg_TRAITE_PAR, ''), dt_TRAITE IS NOT NULL, IFNULL(str_MOTIF_SUPPRESSION, ''))"
  + " ORDER BY lg_GROSSISTE_ID, str_NUMERO, str_ETAT SEPARATOR '\\n') FROM t_presaisie_bl WHERE str_NUMERO LIKE 'E2EPSB-%'");

(async () => {
  const lus = q("SELECT GROUP_CONCAT(lg_FAMILLE_ID ORDER BY str_NAME SEPARATOR '|') FROM (SELECT f.lg_FAMILLE_ID, f.str_NAME FROM t_famille f WHERE f.str_STATUT = 'enable'"
    + " AND EXISTS (SELECT 1 FROM t_famille_stock s WHERE s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1' AND s.str_STATUT = 'enable')"
    + " ORDER BY f.str_NAME LIMIT 2) x");
  P = lus.split('|');
  nettoyer();
  poser(CMD_A); poser(CMD_B);
  const { chromium } = require('playwright-core');
  const b = await ENV_E2E.lancer(chromium);
  let ctx = await b.newContext({ viewport: { width: 1366, height: 768 } });
  let p = await ctx.newPage();
  const err = [];
  const connexion = async () => {
    p.on('pageerror', (e) => err.push(String(e.message)));
    await p.goto('http://localhost:8080/prestige/security/index.jsp?content=panelInfos.jsp&lng=fr', { waitUntil: 'domcontentloaded' });
    await p.fill('#str_login', ENV_E2E.LOGIN); await p.fill('#str_password', 'e2etest'); await p.click('#login');
    await p.waitForURL('**/general/**', { timeout: 40000 });
    await p.waitForFunction(() => window.Ext && window.testextjs && testextjs.app, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
  };
  const E = 'Ext.ComponentQuery.query("presaisiebl")[0]';
  /* identifiant DOM d'un élément de l'écran (champ : inputEl ; bouton : el) */
  const domId = (itemId, part) => p.evaluate(([i, pa]) => { const c = Ext.ComponentQuery.query('presaisiebl')[0].down('#' + i); return (pa === 'input' ? c.inputEl : c.getEl()).dom.id; }, [itemId, part || 'input']);
  const taper = async (itemId, valeur) => { const id = await domId(itemId); await p.click('#' + id, { clickCount: 3 }); await p.fill('#' + id, String(valeur)); await p.keyboard.press('Tab'); };
  const choisir = async (itemId, texte) => {
    const id = await domId(itemId);
    await p.evaluate((i) => { const c = Ext.ComponentQuery.query('presaisiebl')[0].down('#' + i); c.triggerEl.item(0).dom.id = 'e2e-trig-' + i; }, itemId);
    await p.click('#e2e-trig-' + itemId);
    await p.waitForFunction(([i, t]) => { const c = Ext.ComponentQuery.query('presaisiebl')[0].down('#' + i), pk = c.getPicker();
      return pk && pk.isVisible() && [...pk.getEl().dom.querySelectorAll('.x-boundlist-item')].some((li) => li.textContent.trim() === t); }, [itemId, texte], { timeout: 15000 });
    await p.evaluate(([i, t]) => { const c = Ext.ComponentQuery.query('presaisiebl')[0].down('#' + i);
      document.querySelectorAll('[id="e2e-li-' + i + '"]').forEach((x) => x.removeAttribute('id'));
      [...c.getPicker().getEl().dom.querySelectorAll('.x-boundlist-item')].find((li) => li.textContent.trim() === t).id = 'e2e-li-' + i; }, [itemId, texte]);
    await p.click('#e2e-li-' + itemId);
    await p.waitForTimeout(300);
    return id;
  };
  const cliquerBouton = async (itemId) => { const id = await domId(itemId, 'el'); await p.click('#' + id); await p.waitForTimeout(300); };
  const texteBouton = (itemId) => p.evaluate((i) => { const c = Ext.ComponentQuery.query('presaisiebl')[0].down('#' + i); return c.isVisible(true) ? c.getText() : null; }, itemId);
  const message = () => p.evaluate(() => Ext.ComponentQuery.query('presaisiebl')[0].down('#psMessage').getEl().dom.textContent);
  const attendreMessage = async (re) => { await p.waitForFunction((s) => new RegExp(s).test(Ext.ComponentQuery.query('presaisiebl')[0].down('#psMessage').getEl().dom.textContent), re.source, { timeout: 15000 }); return message(); };
  const charge = () => p.waitForFunction(() => { const e = Ext.ComponentQuery.query('presaisiebl')[0]; return e && !e.lignes.isLoading(); }, null, { timeout: 20000 }).then(() => p.waitForTimeout(400));
  const lignesEcran = () => p.evaluate(() => Ext.ComponentQuery.query('presaisiebl')[0].lignes.getRange().map((r) => r.data).filter((x) => /^E2EPSB-/.test(x.numero)));
  const aucuneFenetre = () => p.evaluate(() => Ext.ComponentQuery.query('window').filter((w) => w.isVisible()).map((w) => w.title || w.xtype));
  const filtrer = async (etat, numero, grossiste) => {
    await choisir('fEtat', etat);
    await charge();
    if (grossiste !== undefined) { await choisir('fGrossiste', grossiste); await charge(); }
    if (numero !== undefined) { await taper('fNumero', numero); await cliquerBouton('fRechercher'); await charge(); }
  };
  const cliquerLigne = async (g, numero) => {
    await p.evaluate(([gg, n]) => { const e = Ext.ComponentQuery.query('presaisiebl')[0], gr = e.down('#psGrille'), st = gr.getStore();
      const i = st.findBy((r) => r.get('grossisteId') === gg && r.get('numero') === n); document.querySelectorAll('#e2e-ligne').forEach((x) => x.removeAttribute('id'));
      gr.getView().getNode(st.getAt(i)).id = 'e2e-ligne'; }, [g, numero]);
    await p.click('#e2e-ligne td:nth-child(2)'); await p.waitForTimeout(800);
  };
  const saisir = async (g, numero, date, ht, tva, seq, commande) => {
    await cliquerBouton('psNouveau');
    await choisir('psGrossiste', LIB(g));
    if (commande) { await p.waitForTimeout(500); await choisir('psCommande', commande + ' du ' + fr(new Date())); }
    await taper('psNumero', numero);
    if (seq) { await taper('psSequence', seq); }
    await taper('psDate', fr(date));
    await taper('psHt', ht);
    await taper('psTva', tva);
    await cliquerBouton('psEnregistrer');
  };
  /* rapprochement : écran = API = base, ligne par ligne */
  const rapprocher = async (etat, nom) => {
    const ecran = await lignesEcran();
    const api = await p.evaluate(async (e) => (await (await fetch('../api/v1/presaisie-bl?etat=' + e + '&numero=E2EPSB-&limit=500')).json()).data, etat);
    const base = q("SELECT GROUP_CONCAT(CONCAT_WS('|', p.lg_GROSSISTE_ID, p.str_NUMERO, DATE_FORMAT(p.dt_DATE_BL, '%Y-%m-%d'), p.int_MHT, p.int_TVA, p.int_TTC, IFNULL(p.str_SEQ_CLIENT, ''),"
      + " IFNULL(p.lg_ORDER_ID, ''), p.str_ETAT, TRIM(CONCAT(IFNULL(u.str_FIRST_NAME, ''), ' ', IFNULL(u.str_LAST_NAME, ''))), IFNULL(b.str_REF_LIVRAISON, '')) ORDER BY 1 SEPARATOR '\\n')"
      + " FROM t_presaisie_bl p JOIN t_user u ON u.lg_USER_ID = p.lg_CREE_PAR LEFT JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = p.lg_BON_LIVRAISON_ID WHERE p.str_NUMERO LIKE 'E2EPSB-%'"
      + (etat === 'TOUS' ? " AND p.str_ETAT <> 'SUPPRIME'" : " AND p.str_ETAT = '" + etat + "'"));
    const lig = (x) => [x.grossisteId, x.numero, x.date, x.montantHt, x.montantTva, x.montantTtc, x.sequence, x.commandeId, x.etat, x.creePar, x.bonLivraisonRef].join('|');
    const e = ecran.map(lig).sort().join('\n'), a = (api || []).filter((x) => /^E2EPSB-/.test(x.numero)).map(lig).sort().join('\n');
    const bt = base.split('\n').sort().join('\n');
    /* ce que la grille affiche (cellules rendues) : montants formatés = montants en base */
    const cellules = await p.evaluate(() => { const g = Ext.ComponentQuery.query('presaisiebl #psGrille')[0];
      return g.getStore().getRange().filter((r) => /^E2EPSB-/.test(r.get('numero'))).map((r) => [...g.getView().getNode(r).querySelectorAll('td')].map((td) => td.textContent.trim())); });
    const cellOk = cellules.every((c, i) => { const x = ecran[i]; const n = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
      return c[1] === x.numero && c[3] === n(x.montantHt) && c[4] === n(x.montantTva) && c[5] === n(x.montantTtc) && c[8] === x.etatLibelle; });
    ok('Rapprochement ' + nom + ' : écran = API = base, ligne par ligne', e === a && a === bt && e.length > 0 && cellOk, 'écran:\n' + e + '\napi:\n' + a + '\nbase:\n' + bt + '\ncellules:' + JSON.stringify(cellules));
  };
  try {
    /* migration : droit donné à tous les rôles qui peuvent créer un BL (route creerbl : P_BL_MOBILE_SCANNER) */
    const sansDroit = q("SELECT COUNT(*) FROM t_role r WHERE EXISTS (SELECT 1 FROM t_role_privelege rp JOIN t_privilege pr ON pr.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE rp.lg_ROLE_ID = r.lg_ROLE_ID AND pr.str_NAME = 'P_BL_MOBILE_SCANNER')"
      + " AND NOT EXISTS (SELECT 1 FROM t_role_privelege rp JOIN t_privilege pr ON pr.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE rp.lg_ROLE_ID = r.lg_ROLE_ID AND pr.str_NAME = 'P_SM_PRESAISIE_BL')");
    const menu = q("SELECT CONCAT(s.str_DESCRIPTION, '|', s.lg_MENU_ID, '|', s.P_KEY, '|', CHAR_LENGTH(s.str_DESCRIPTION)) FROM t_sous_menu s WHERE s.str_COMPOSANT = 'presaisiebl'");
    ok('Migration : menu « Pré-saisie des BL » dans GESTION DES COMMANDES (libellé ≤ 25), droit donné à chaque rôle qui crée des BL',
      sansDroit === '0' && /^Pré-saisie des BL\|6\|P_SM_PRESAISIE_BL\|\d+$/.test(menu) && Number(menu.split('|')[3]) <= 25, 'roles sans le droit : ' + sansDroit + ' menu : ' + menu);
    await connexion();
    const dansMenu = await p.evaluate(() => { let t = false; Ext.ComponentQuery.query('treepanel').forEach((tp) => tp.getStore().getRootNode().cascadeBy((n) => { if (n.get('id') === 'presaisiebl') { t = true; } })); return t || document.body.innerHTML.indexOf('presaisiebl') >= 0; });
    ok('Menu visible pour un profil qui crée des BL', dansMenu);
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('presaisiebl', 'Pré-saisie des BL', ''));
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('presaisiebl')[0]; return e && e.isVisible() && e.down('#psGrossiste').getStore().getCount() > 0; }, null, { timeout: 30000 });
    await charge();

    /* 1. saisies variées */
    await saisir(G1, 'E2EPSB-101', jour(2), 125000, 0, '48', CMD_A);
    let m = await attendreMessage(/pré-saisi|refus|obligatoire|Choisissez/i);
    ok('Saisie BL E2EPSB-101 chez G1 avec commande : enregistré « à saisir »', /pré-saisi : à saisir/.test(m), m);
    await saisir(G1, 'e2epsb-102', jour(1), 54321, 9778);
    m = await attendreMessage(/E2EPSB-102/);
    await saisir(G2, 'E2EPSB-101', jour(5), 70000, 12600, '7');
    m = await attendreMessage(/E2EPSB-101.*pré-saisi|déjà/);
    ok('Même numéro chez un autre grossiste : permis', /pré-saisi : à saisir/.test(m), m);
    const relus = presaisies();
    ok('Données écrites relues en base : numéro en majuscules, TTC = HT + TVA, commande seulement sur la première, saisi par l\'opérateur',
      relus.split('\n').sort().join('\n') === [G1 + '|E2EPSB-101|' + fmt(jour(2)) + '|125000|0|125000|48|' + CMD_A + '|A_SAISIR|' + MOI + '|||0|',
        G1 + '|E2EPSB-102|' + fmt(jour(1)) + '|54321|9778|64099|||A_SAISIR|' + MOI + '|||0|',
        G2 + '|E2EPSB-101|' + fmt(jour(5)) + '|70000|12600|82600|7||A_SAISIR|' + MOI + '|||0|'].sort().join('\n'), relus);

    /* 2. doublon refusé (casse et espaces) */
    await saisir(G1, ' e2epsb-101 ', jour(0), 1, 0);
    m = await attendreMessage(/déjà/);
    ok('Doublon (même grossiste, même numéro, casse et espaces différents) : refusé avec un message clair',
      /Le BL E2EPSB-101 de .* est déjà pré-saisi/.test(m) && q("SELECT COUNT(*) FROM t_presaisie_bl WHERE lg_GROSSISTE_ID = '" + G1 + "' AND str_NUMERO = 'E2EPSB-101'") === '1', m);
    ok('Aucune fenêtre surgissante pendant la saisie', (await aucuneFenetre()).length === 0, JSON.stringify(await aucuneFenetre()));

    /* 3. consultation, filtres, rapprochement */
    await filtrer('À saisir', 'E2EPSB-');
    await rapprocher('A_SAISIR', '« À saisir » (3 BL)');
    const totaux = await p.evaluate(() => Ext.ComponentQuery.query('presaisiebl')[0].down('#psTotaux').getEl().dom.textContent);
    ok('Bandeau des totaux = somme en base (3 BL, TTC 271 699)', /^3 BL/.test(totaux) && /TTC 271 699/.test(totaux.replace(/ /g, ' ')), totaux);
    await choisir('fGrossiste', LIB(G2)); await charge();
    let vus = await lignesEcran();
    ok('Filtre grossiste : seul le BL de G2', vus.length === 1 && vus[0].grossisteId === G2, JSON.stringify(vus.map((x) => x.grossiste + ' ' + x.numero)));
    await choisir('fGrossiste', 'Tous les grossistes'); await charge();
    await taper('fDu', fr(jour(3))); await taper('fAu', fr(jour(0))); await cliquerBouton('fRechercher'); await charge();
    vus = await lignesEcran();
    ok('Filtre période (J-3 à J) : les deux BL de G1, pas celui de G2 (J-5)', vus.length === 2 && vus.every((x) => x.grossisteId === G1), JSON.stringify(vus.map((x) => x.numero + ' ' + x.date)));
    await taper('fDu', ''); await taper('fAu', ''); await cliquerBouton('fRechercher'); await charge();
    await p.screenshot({ path: SORTIE + '/presaisie-bl-liste.png' });

    /* 4. modification confirmée dans le bouton */
    await cliquerLigne(G1, 'E2EPSB-102');
    ok('Clic sur une ligne « à saisir » : le formulaire passe en modification', /Modification du BL E2EPSB-102/.test(await p.evaluate(() => Ext.ComponentQuery.query('presaisiebl #psMode')[0].getEl().dom.textContent)));
    await taper('psHt', 60000);
    await cliquerBouton('psEnregistrer');
    const arme = await texteBouton('psEnregistrer');
    ok('Premier clic : le bouton demande confirmation, rien n\'est encore écrit', arme === 'Confirmer la modification' && q("SELECT int_MHT FROM t_presaisie_bl WHERE str_NUMERO = 'E2EPSB-102'") === '54321', arme);
    await p.waitForTimeout(500);
    await cliquerBouton('psEnregistrer');
    m = await attendreMessage(/modifié|refus/);
    ok('Second clic : modification enregistrée (HT 60 000, TTC 69 778, date de modification)',
      q("SELECT CONCAT(int_MHT, '|', int_TTC, '|', lg_MODIFIE_PAR, '|', dt_MODIFIE IS NOT NULL) FROM t_presaisie_bl WHERE str_NUMERO = 'E2EPSB-102'") === '60000|69778|' + MOI + '|1', m);
    ok('Aucune fenêtre surgissante pour la modification', (await aucuneFenetre()).length === 0);

    /* 5. suppression avec un motif, confirmée dans le bouton */
    await cliquerLigne(G2, 'E2EPSB-101');
    await cliquerBouton('psSupprimer');
    m = await message();
    ok('Suppression sans motif : refusée, rien n\'est écrit', /motif/.test(m) && q("SELECT str_ETAT FROM t_presaisie_bl WHERE lg_GROSSISTE_ID = '" + G2 + "' AND str_NUMERO = 'E2EPSB-101'") === 'A_SAISIR', m);
    await taper('psMotif', 'Saisi par erreur (essai)');
    await cliquerBouton('psSupprimer');
    ok('Premier clic : « Confirmer la suppression »', (await texteBouton('psSupprimer')) === 'Confirmer la suppression');
    await p.waitForTimeout(500);
    await cliquerBouton('psSupprimer');
    m = await attendreMessage(/supprimée|refus/);
    ok('Second clic : pré-saisie supprimée (état, motif, opérateur, date), ligne gardée pour la trace',
      q("SELECT CONCAT(str_ETAT, '|', str_MOTIF_SUPPRESSION, '|', lg_SUPPRIME_PAR, '|', dt_SUPPRIME IS NOT NULL) FROM t_presaisie_bl WHERE lg_GROSSISTE_ID = '" + G2 + "' AND str_NUMERO = 'E2EPSB-101'") === 'SUPPRIME|Saisi par erreur (essai)|' + MOI + '|1', m);
    await charge();
    vus = await lignesEcran();
    ok('Le BL supprimé disparaît de la liste « à saisir »', vus.length === 2 && !vus.some((x) => x.grossisteId === G2), JSON.stringify(vus.map((x) => x.numero)));
    await filtrer('Supprimé');
    await rapprocher('SUPPRIME', '« Supprimé »');
    /* ressaisie permise après suppression (l'unicité ne compte pas les lignes supprimées) */
    await saisir(G2, 'E2EPSB-101', jour(5), 70000, 12600);
    m = await attendreMessage(/pré-saisi|déjà/);
    ok('Après suppression, le même BL peut être pré-saisi de nouveau', /pré-saisi : à saisir/.test(m)
      && q("SELECT GROUP_CONCAT(str_ETAT ORDER BY str_ETAT) FROM t_presaisie_bl WHERE lg_GROSSISTE_ID = '" + G2 + "' AND str_NUMERO = 'E2EPSB-101'") === 'A_SAISIR,SUPPRIME', m);

    /* 6. création des deux BL par « Commande en cours » : B sans pré-saisie (témoin), A avec pré-saisie */
    const creerBl = async (cmd, numero, ht) => {
      await p.evaluate(() => { testextjs.app.getController('App').onRedirectTo('i_order_manager', {}); });
      await p.waitForFunction(() => Ext.ComponentQuery.query('i_order_manager').length > 0 && Ext.ComponentQuery.query('i_order_manager')[0].isVisible(), null, { timeout: 30000 });
      await p.evaluate(() => { Ext.getCmp('rechecher').setValue('E2E-PSB'); Ext.ComponentQuery.query('i_order_manager')[0].onRechClick(); });
      await p.waitForFunction((c) => { const st = Ext.ComponentQuery.query('i_order_manager')[0].getStore(); return !st.isLoading() && st.findExact('str_REF_ORDER', c) >= 0; }, cmd, { timeout: 30000 });
      await p.waitForTimeout(600);
      await p.evaluate((c) => { document.querySelectorAll('#e2e-creer-bl, #e2e-oui, #e2e-enregistrer-bl').forEach((x) => x.removeAttribute('id'));
        const g = Ext.ComponentQuery.query('i_order_manager')[0], r = g.getStore().getAt(g.getStore().findExact('str_REF_ORDER', c));
        g.getView().getNode(r).querySelector('img[data-qtip="Créer le bon de livraisson"]').id = 'e2e-creer-bl'; }, cmd);
      await p.click('#e2e-creer-bl');
      await p.waitForFunction(() => { const c = Ext.getCmp('str_REF_LIVRAISON'); return c && c.isVisible(); }, null, { timeout: 20000 });
      await p.waitForTimeout(500);
      await p.fill('#' + await p.evaluate(() => Ext.getCmp('str_REF_LIVRAISON').inputEl.dom.id), numero);
      await p.fill('#' + await p.evaluate(() => Ext.getCmp('int_MHT').inputEl.dom.id), String(ht));
      await p.fill('#' + await p.evaluate(() => Ext.getCmp('int_TVA').inputEl.dom.id), '0');
      await p.evaluate(() => { Ext.getCmp('str_REF_LIVRAISON').up('window').down('button[text=Enregistrer]').getEl().dom.id = 'e2e-enregistrer-bl'; });
      await p.click('#e2e-enregistrer-bl');
      await p.waitForTimeout(800);
      /* montant différent du montant machine : confirmation existante de la fenêtre de création (inchangée) */
      await p.evaluate(() => { const mb = Ext.MessageBox; if (mb.isVisible() && /different/.test(mb.msg.getEl().dom.textContent)) { mb.down('button[itemId=yes]').getEl().dom.id = 'e2e-oui'; } });
      if (await p.$('#e2e-oui')) { await p.click('#e2e-oui'); await p.evaluate(() => document.getElementById('e2e-oui').removeAttribute('id')); }
      for (let i = 0; i < 40 && q("SELECT COUNT(*) FROM t_bon_livraison WHERE lg_ORDER_ID = '" + cmd + "'") === '0'; i++) { await p.waitForTimeout(500); }
      await p.waitForTimeout(1500);
    };
    const avantB = compter(), psAvantB = presaisies();
    await creerBl(CMD_B, 'E2EPSB-201', 5000);
    const apresB = compter(), psApresB = presaisies();
    ok('BL témoin (sans pré-saisie) créé par « Commande en cours »', q("SELECT str_REF_LIVRAISON FROM t_bon_livraison WHERE lg_ORDER_ID = '" + CMD_B + "'") === 'E2EPSB-201');
    ok('Sans pré-saisie : aucune pré-saisie ne change', psAvantB === psApresB);
    const avantA = compter(), psAvantA = presaisies();
    await creerBl(CMD_A, ' e2epsb-101', 125000);
    const apresA = compter(), psApresA = presaisies();
    const blA = q("SELECT CONCAT(lg_BON_LIVRAISON_ID, '|', str_REF_LIVRAISON) FROM t_bon_livraison WHERE lg_ORDER_ID = '" + CMD_A + "'").split('|');
    ok('BL E2EPSB-101 créé par « Commande en cours » (numéro saisi en minuscules, rangé en majuscules)', blA[1] === 'E2EPSB-101', blA.join('|'));
    const traite = q("SELECT CONCAT(str_ETAT, '|', lg_BON_LIVRAISON_ID, '|', lg_TRAITE_PAR, '|', dt_TRAITE IS NOT NULL, '|', TIMESTAMPDIFF(SECOND, dt_TRAITE, NOW()) < 120) FROM t_presaisie_bl WHERE lg_GROSSISTE_ID = '" + G1 + "' AND str_NUMERO = 'E2EPSB-101'");
    ok('La pré-saisie de G1 / E2EPSB-101 passe à « Traité » : date, opérateur et lien vers le BL créé', traite === 'TRAITE|' + blA[0] + '|' + MOI + '|1|1', traite);
    const dA = ecart(avantA, apresA), dB = ecart(avantB, apresB);
    ok('Bilan : la création du BL avec pré-saisie laisse exactement les mêmes traces que sans (mêmes tables, mêmes nombres de lignes, stock inchangé)',
      JSON.stringify(dA) === JSON.stringify(dB) && !('stockTotal' in dA) && !('t_presaisie_bl' in dA), 'avec : ' + JSON.stringify(dA) + ' sans : ' + JSON.stringify(dB));
    const lignesChangees = psApresA.split('\n').filter((l) => psAvantA.split('\n').indexOf(l) < 0);
    ok('Bilan : une seule pré-saisie a changé (G1 / E2EPSB-101) ; le même numéro chez G2 et le BL E2EPSB-102 restent « à saisir »',
      lignesChangees.length === 1 && lignesChangees[0].indexOf(G1 + '|E2EPSB-101|') === 0
      && q("SELECT GROUP_CONCAT(CONCAT(lg_GROSSISTE_ID = '" + G1 + "', ':', str_NUMERO, ':', str_ETAT) ORDER BY 1 SEPARATOR ' ') FROM t_presaisie_bl WHERE str_NUMERO LIKE 'E2EPSB-%' AND NOT (lg_GROSSISTE_ID = '" + G1 + "' AND str_NUMERO = 'E2EPSB-101')")
        === '0:E2EPSB-101:A_SAISIR 0:E2EPSB-101:SUPPRIME 1:E2EPSB-102:A_SAISIR', JSON.stringify(lignesChangees));
    ok('Commande A traitée comme sans pré-saisie (statut is_Closed, lignes du BL = lignes de la commande)',
      q("SELECT CONCAT(o.str_STATUT, '|', (SELECT COUNT(*) FROM t_bon_livraison_detail d WHERE d.lg_BON_LIVRAISON_ID = '" + blA[0] + "')) FROM t_order o WHERE o.lg_ORDER_ID = '" + CMD_A + "'") === 'is_Closed|2');

    /* 7. l'écran montre le BL traité ; il ne se modifie plus */
    await p.evaluate(() => testextjs.app.getController('App').onLoadNewComponent('presaisiebl', 'Pré-saisie des BL', ''));
    await p.waitForFunction(() => { const e = Ext.ComponentQuery.query('presaisiebl')[0]; return e && e.isVisible() && e.down('#psGrossiste').getStore().getCount() > 0; }, null, { timeout: 30000 });
    await charge();
    await filtrer('À saisir', 'E2EPSB-');
    vus = await lignesEcran();
    ok('Le BL traité disparaît de la liste « à saisir »', !vus.some((x) => x.grossisteId === G1 && x.numero === 'E2EPSB-101') && vus.length === 2, JSON.stringify(vus.map((x) => x.numero)));
    await filtrer('Traité');
    await rapprocher('TRAITE', '« Traité » (BL créé)');
    await cliquerLigne(G1, 'E2EPSB-101');
    const consult = await p.evaluate(() => { const e = Ext.ComponentQuery.query('presaisiebl')[0];
      return { mode: e.down('#psMode').getEl().dom.textContent, detail: e.down('#psDetail').getEl().dom.textContent, enreg: e.down('#psEnregistrer').isVisible(true),
        suppr: e.down('#psZoneSuppression').isVisible(true), lecture: e.down('#psNumero').readOnly }; });
    ok('BL traité : consultation seule (pas d\'enregistrement ni de suppression), BL créé et date affichés',
      /consultation/.test(consult.mode) && /Traité le .* BL créé E2EPSB-101/.test(consult.detail) && !consult.enreg && !consult.suppr && consult.lecture, JSON.stringify(consult));
    await p.screenshot({ path: SORTIE + '/presaisie-bl-traite.png' });
    const idT = q("SELECT lg_PRESAISIE_BL_ID FROM t_presaisie_bl WHERE lg_GROSSISTE_ID = '" + G1 + "' AND str_NUMERO = 'E2EPSB-101'");
    const refusT = await p.evaluate(async (id) => [(await (await fetch('../api/v1/presaisie-bl/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grossisteId: 'x', numero: 'E2EPSB-999', date: '2026-01-01' }) })).json()), (await (await fetch('../api/v1/presaisie-bl/' + id + '/suppression',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ motif: 'essai' }) })).json())], idT);
    ok('Le serveur refuse aussi de modifier ou supprimer un BL traité', refusT[0].success === false && refusT[1].success === false
      && q("SELECT CONCAT(str_NUMERO, '|', str_ETAT) FROM t_presaisie_bl WHERE lg_PRESAISIE_BL_ID = '" + idT + "'") === 'E2EPSB-101|TRAITE', JSON.stringify(refusT));

    /* 8. mise en page */
    await filtrer('À saisir et traités');
    const mp = await p.evaluate(() => { const e = Ext.ComponentQuery.query('presaisiebl')[0]; const coupes = [];
      e.down('#psGrille').headerCt.getGridColumns().forEach((c) => { const i = c.getEl() && c.getEl().dom.querySelector('.x-column-header-inner'); if (i && c.isVisible(true) && i.scrollWidth > i.clientWidth + 1) { coupes.push(c.text); } });
      const boutons = e.query('button').filter((x) => x.isVisible(true)).filter((x) => { const r = x.getEl().dom.getBoundingClientRect(), t = x.getEl().dom.querySelector('.x-btn-inner'); return r.right > window.innerWidth + 1 || (t && t.scrollWidth > t.clientWidth + 1); }).map((x) => x.getText());
      const libelles = e.down('#psFormulaire').query('field').filter((f) => f.isVisible(true) && f.labelEl).filter((f) => f.labelEl.dom.scrollWidth > f.labelEl.dom.clientWidth + 1).map((f) => f.fieldLabel);
      return { coupes, boutons, libelles, defil: document.body.scrollWidth > document.body.clientWidth + 1 }; });
    ok('Mise en page 1366 × 768 : en-têtes, libellés et boutons entiers, pas de défilement horizontal', !mp.coupes.length && !mp.boutons.length && !mp.libelles.length && !mp.defil, JSON.stringify(mp));

    /* 9. sans le droit */
    droit = q("SELECT CONCAT(rp.lg_ROLE_PRIVILEGE, '|', rp.lg_ROLE_ID, '|', rp.lg_PRIVILEGE_ID) FROM t_role_privelege rp JOIN t_privilege pr ON pr.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID"
      + " WHERE rp.lg_ROLE_ID = '" + ROLE + "' AND pr.str_NAME = 'P_SM_PRESAISIE_BL' LIMIT 1").split('|');
    exec("DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '" + droit[0] + "'");
    await ctx.close(); ctx = await b.newContext({ viewport: { width: 1366, height: 768 } }); p = await ctx.newPage();
    await connexion();
    const interdit = await p.evaluate(async () => { const r = await fetch('../api/v1/presaisie-bl?etat=TOUS'); const c = await fetch('../api/v1/presaisie-bl', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grossisteId: 'x', numero: 'E2EPSB-998', date: '2026-01-01' }) }); return [r.status, await r.json(), c.status]; });
    ok('Sans le droit P_SM_PRESAISIE_BL : lecture et saisie refusées (403)', interdit[0] === 403 && interdit[1].interdit === true && interdit[2] === 403
      && q("SELECT COUNT(*) FROM t_presaisie_bl WHERE str_NUMERO = 'E2EPSB-998'") === '0', JSON.stringify(interdit));
    ok('Aucune erreur JavaScript', err.length === 0, JSON.stringify(err));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
    await p.screenshot({ path: SORTIE + '/presaisie-bl-erreur.png' }).catch(() => {});
  } finally {
    await b.close();
    if (droit && droit.length === 3) {
      exec("INSERT IGNORE INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED) VALUES ('" + droit[0] + "', '" + droit[1] + "', '" + droit[2] + "', NOW(), NOW())");
    }
    nettoyer();
    ok('Données d\'essai retirées, droit remis', q("SELECT (SELECT COUNT(*) FROM t_presaisie_bl WHERE str_NUMERO LIKE 'E2EPSB-%') + (SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID LIKE 'E2E-PSB-%')"
      + " + (SELECT COUNT(*) FROM t_bon_livraison WHERE str_REF_LIVRAISON LIKE 'E2EPSB-%')") === '0'
      && q("SELECT COUNT(*) FROM t_role_privelege rp JOIN t_privilege pr ON pr.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE rp.lg_ROLE_ID = '" + ROLE + "' AND pr.str_NAME = 'P_SM_PRESAISIE_BL'") === '1');
    const k = res.filter((x) => x.c).length;
    console.log('\n' + k + '/' + res.length + ' OK');
    process.exit(k === res.length ? 0 : 1);
  }
})();
