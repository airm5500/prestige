/* PLAN AVOIR DU 08/11, POINT 1 : ACTIVITE DES EQUIPES AU TABLEAU DE BORD ET RAPPORT EMPLOYE x TRANCHE HORAIRE x CA.
 *
 * Ventes d'essai variees posees en base (retirees a la fin) : aujourd'hui, preventes d'un autre vendeur, une vente
 * sans prevente, quantites > 1, une vente de plus de 10 min, une vente annulee (jamais comptee dans le CA) ; hier, une
 * vente d'un troisieme employe.
 *
 * Par les vues (compte de test, 1600 x 900) :
 *  - tableau de bord : carte « Activite des equipes (jour) » avec ses 4 reperes et le repere d'alerte ;
 *  - clic sur la carte : fenetre de consultation = le composant du menu (onglet Analyses), boutons Hier, 3 jours,
 *    1 semaine (chacun relit la bonne periode), Du / au ; toutes les cartes du menu presentes ; fermeture ;
 *  - menu ANALYSE DE GESTION > Activite des equipes > Analyses, meme jour ;
 *  - rapprochement : reperes carte = fenetre = menu = API = base ; tableau « CA par employe et tranche horaire »
 *    fenetre = menu = API = base, ligne par ligne, cellule par cellule (caissiere 1 h, vendeur 3 h choisis a la
 *    souris) ; API = base pour les 6 tailles et les 2 attributions ; export CSV = API ;
 *  - droit : le droit du menu retire au role du compte le temps du controle (remis a l'identique) : pas de carte,
 *    les autres cartes sont la, routes refusees (403) ;
 *  - aucune erreur JavaScript ; bilan : aucune vente d'essai ne reste, preferences remises.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const { connexion, ouvrirMenu, cliquer, choisir, saisir } = require('../outils/vues');
const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 500) + ']' : '')); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 1 << 28 }).replace(/\r/g, '').trim();
const M = 'E2E-AETB';
const U = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + ENV_E2E.LOGIN + "'");
const [A2, A3] = q("SELECT lg_USER_ID FROM t_user WHERE str_STATUT = 'enable' AND lg_USER_ID <> '" + U + "' AND lg_USER_ID NOT LIKE 'E2E%' ORDER BY lg_USER_ID LIMIT 2").split('\n');
const J = q('SELECT CURDATE()'), H = q('SELECT CURDATE() - INTERVAL 1 DAY');
const PRODUITS = q("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' ORDER BY lg_FAMILLE_ID LIMIT 4").split('\n');
const MODELE = q("SELECT lg_PREENREGISTREMENT_ID FROM t_preenregistrement WHERE lg_TYPE_VENTE_ID = '1' AND str_STATUT = 'is_Closed' LIMIT 1");
/* droit du menu sur le role du compte de test : retire le temps du controle, puis remis a l'identique */
const ROLE = q("SELECT ru.lg_ROLE_ID FROM t_role_user ru JOIN t_role r ON r.lg_ROLE_ID = ru.lg_ROLE_ID WHERE ru.lg_USER_ID = '" + U + "' AND r.str_STATUT = 'enable' LIMIT 1");
const empreinte = () => q("SELECT IFNULL(MD5(GROUP_CONCAT(CONCAT(lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID) ORDER BY lg_ROLE_PRIVILEGE)), '') FROM t_role_privelege");
const LIGNE = q("SELECT IFNULL((SELECT CONCAT(rp.lg_ROLE_PRIVILEGE, '|', rp.lg_PRIVILEGE_ID, '|', IFNULL(rp.dt_CREATED, ''), '|', IFNULL(rp.dt_UPDATED, '')) FROM t_role_privelege rp"
  + " JOIN t_privilege p ON p.lg_PRIVELEGE_ID = rp.lg_PRIVILEGE_ID WHERE p.str_NAME = 'P_SM_ACTIVITE_EQUIPES' AND rp.lg_ROLE_ID = '" + ROLE + "'), '')");
const DROITS_AVANT = empreinte();
const remettreDroit = () => { if (LIGNE && q("SELECT COUNT(*) FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '" + LIGNE.split('|')[0] + "'") === '0') {
  const [id, priv, c, u] = LIGNE.split('|');
  q("INSERT INTO t_role_privelege (lg_ROLE_PRIVILEGE, lg_ROLE_ID, lg_PRIVILEGE_ID, dt_CREATED, dt_UPDATED) VALUES ('" + id + "', '" + ROLE + "', '" + priv + "', "
    + (c ? "'" + c + "'" : 'NULL') + ', ' + (u ? "'" + u + "'" : 'NULL') + ')'); } };
const prefAvant = q("SELECT IFNULL((SELECT txt_VALEUR FROM t_preference_utilisateur WHERE lg_USER_ID = '" + U + "' AND str_CLE = 'tableau-bord'), '#AUCUNE#')");

/* [suffixe, jour, caissiere, vendeur, operateur, ouverture, encaissement, prix, annulee, lignes [quantite, prix]] */
const VENTES = [
  ['1', J, U, A2, U, '09:00:00', '09:15:00', 12500, 0, [[3, 7500], [1, 5000]]],
  ['2', J, U, U, U, '11:38:00', '11:40:00', 4300, 0, [[2, 4300]]],
  ['3', J, A3, A2, A3, '15:01:00', '15:05:00', 27800, 0, [[2, 10000], [1, 3800], [4, 14000]]],
  ['4', J, U, A2, U, '10:00:00', '10:03:00', 9900, 1, [[1, 9900]]],
  ['5', H, A3, U, A3, '17:18:00', '17:20:00', 6100, 0, [[1, 6100]]],
  ['6', J, A2, A2, A2, '19:44:00', '19:50:00', 1800, 0, [[5, 1800]]]
];
function retirer() {
  q(`DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%'; DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%'`);
}
function poser() {
  for (const [s, jour, c, v, o, ouv, enc, prix, annulee, lignes] of VENTES) {
    const id = M + '-' + s;
    q(`CREATE TEMPORARY TABLE tmp_v AS SELECT * FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '${MODELE}';`
      + ` UPDATE tmp_v SET lg_PREENREGISTREMENT_ID = '${id}', str_REF = '${id}', str_REF_TICKET = '${id}', int_PRICE = ${prix}, int_PRICE_REMISE = 0,`
      + ` int_CUST_PART = ${prix}, str_STATUT = 'is_Closed', b_IS_CANCEL = ${annulee}, b_IS_AVOIR = 0, lg_TYPE_VENTE_ID = '1',`
      + ` lg_USER_CAISSIER_ID = '${c}', lg_USER_VENDEUR_ID = '${v}', lg_USER_ID = '${o}', dt_CREATED = '${jour} ${ouv}', dt_UPDATED = '${jour} ${enc}',`
      + ` completion_date = '${jour} ${enc}', dt_ANNULER = ${annulee ? `'${jour} 10:30:00'` : 'NULL'};`
      + ' INSERT INTO t_preenregistrement SELECT * FROM tmp_v; DROP TEMPORARY TABLE tmp_v;');
    lignes.forEach(([qte, montant], i) => q('INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID,'
      + ' int_QUANTITY, int_QUANTITY_SERVED, int_PRICE, int_PRICE_UNITAIR, str_STATUT, dt_CREATED, dt_UPDATED, int_PRICE_REMISE, montantTva, valeurTva, prixAchat)'
      + ` VALUES ('${id}-${i}', '${id}', '${PRODUITS[i]}', ${qte}, ${qte}, ${montant}, ${Math.round(montant / qte)}, 'is_Closed', '${jour} ${ouv}', '${jour} ${enc}', 0, 0, 0, 0)`));
  }
}

/* ------------------------------------------------------------ calculs independants depuis la base */
const noms = {};
q("SELECT lg_USER_ID, TRIM(CONCAT(IFNULL(str_FIRST_NAME, ''), ' ', IFNULL(str_LAST_NAME, ''))) FROM t_user").split('\n').forEach((l) => { const [i, n] = l.split('\t'); noms[i] = n; });
function ventesBase(d, f) {
  return q(`SELECT IFNULL(p.lg_USER_CAISSIER_ID, ''), IFNULL(p.lg_USER_VENDEUR_ID, ''), IFNULL(p.lg_USER_ID, ''), HOUR(COALESCE(p.completion_date, p.dt_UPDATED)), p.int_PRICE`
    + ` FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'`
    + ` AND p.dt_UPDATED >= '${d}' AND p.dt_UPDATED < '${f}' + INTERVAL 1 DAY AND p.dt_CREATED IS NOT NULL`
    + ` AND EXISTS (SELECT 1 FROM t_preenregistrement_detail x WHERE x.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID AND x.dt_UPDATED IS NOT NULL)`)
    .split('\n').filter(Boolean).map((l) => { const [c, v, o, h, m] = l.split('\t'); return { c, v, o, h: Number(h), m: Number(m) }; });
}
function tableauBase(ventes, taille, attribution) {
  const emp = (x) => (attribution === 'VENDEUR' && x.v ? x.v : x.c || x.o || '?');
  const m = {}, col = {};
  let premiere = 99, derniere = -1;
  for (const x of ventes) {
    const t = Math.floor(x.h / taille), e = emp(x);
    const l = m[e] || (m[e] = {});
    l[t] = l[t] || { ca: 0, ventes: 0 }; l[t].ca += x.m; l[t].ventes++;
    col[t] = col[t] || { ca: 0, ventes: 0 }; col[t].ca += x.m; col[t].ventes++;
    premiere = Math.min(premiere, t); derniere = Math.max(derniere, t);
  }
  const idx = []; for (let t = premiere; t <= derniere; t++) { idx.push(t); }
  const cel = (l) => idx.map((t) => (l[t] ? l[t].ca + '/' + l[t].ventes : '0/0'));
  const lignes = Object.keys(m).map((id) => { const c = Object.values(m[id]);
    return { id, ca: c.reduce((s, x) => s + x.ca, 0), ventes: c.reduce((s, x) => s + x.ventes, 0), cel: cel(m[id]) }; })
    .sort((a, b) => b.ca - a.ca || String(noms[a.id] || '?').localeCompare(String(noms[b.id] || '?')));
  return { tranches: idx.map((t) => t * taille + ' h - ' + Math.min(24, (t + 1) * taille) + ' h'),
    lignes: lignes.map((l) => [l.id, l.ca, l.ventes, l.cel.join(',')].join('|')),
    total: [ventes.reduce((s, x) => s + x.m, 0), ventes.length, cel(col).join(',')].join('|') };
}
const tableauApi = (d) => ({ tranches: d.tranches.map((t) => t.libelle),
  lignes: d.lignes.map((l) => [l.id, l.ca, l.ventes, l.cellules.map((c) => c.ca + '/' + c.ventes).join(',')].join('|')),
  total: [d.totaux.ca, d.totaux.ventes, d.totaux.cellules.map((c) => c.ca + '/' + c.ventes).join(',')].join('|') });
function resumeBase(d, f) {
  const w = `p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5' AND p.dt_UPDATED >= '${d}' AND p.dt_UPDATED < '${f}' + INTERVAL 1 DAY`
    + ' AND EXISTS (SELECT 1 FROM t_preenregistrement_detail x WHERE x.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID)';
  const longues = Number(q(`SELECT COUNT(*) FROM t_preenregistrement p WHERE ${w} AND TIMESTAMPDIFF(SECOND, p.dt_CREATED, COALESCE(p.completion_date, p.dt_UPDATED)) > 600`));
  const annul = Number(q(`SELECT COUNT(*) FROM t_preenregistrement p WHERE p.b_IS_CANCEL = 1 AND p.int_PRICE > 0 AND p.dt_ANNULER >= '${d}' AND p.dt_ANNULER < '${f}' + INTERVAL 1 DAY`
    + ' AND NOT EXISTS (SELECT 1 FROM vente_modifiee vm WHERE vm.vente_origine_id = p.lg_PREENREGISTREMENT_ID)'));
  const modif = Number(q(`SELECT COUNT(*) FROM vente_modifiee v WHERE v.mvt_date >= '${d}' AND v.mvt_date < '${f}' + INTERVAL 1 DAY`));
  const bl = q(`SELECT COUNT(*), IFNULL(ROUND(AVG(GREATEST(0, DATEDIFF(b.dt_CREATED, b.dt_DATE_LIVRAISON))), 1), '') FROM t_bon_livraison b WHERE b.str_STATUT = 'is_Closed'`
    + ` AND b.dt_CREATED >= '${d}' AND b.dt_CREATED < '${f}' + INTERVAL 1 DAY AND b.dt_DATE_LIVRAISON IS NOT NULL`
    + ' AND EXISTS (SELECT 1 FROM t_order o WHERE o.lg_ORDER_ID = b.lg_ORDER_ID) AND EXISTS (SELECT 1 FROM t_bon_livraison_detail x WHERE x.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID)').split('\t');
  return { ventesLongues: longues, actionsSensibles: annul + modif, blMesures: Number(bl[0]), delaiMoyenBl: (bl[1] || '') === '' ? null : Number(bl[1]) };
}

/* ------------------------------------------------------------ lecture des ecrans */
const lireReperes = (p, racine) => p.evaluate((r) => { const el = r === 'tb' ? document.querySelector('[data-carte="activite"]') : Ext.ComponentQuery.query(r)[0].getEl().dom;
  if (!el) { return null; }
  const v = {}; el.querySelectorAll('.ae-rep').forEach((x) => { v[x.getAttribute('data-rep')] = x.querySelector('.v').textContent + ' | ' + x.querySelector('.d').textContent; });
  const a = el.querySelector('.ae-rep-alerte'); v.ALERTES = a ? a.getAttribute('data-alertes') + ' | ' + a.textContent : null; return v; }, racine);
const lireTableau = (p, racine) => p.evaluate((r) => { const t = Ext.ComponentQuery.query(r)[0].getEl().dom.querySelector('table.ae-ct');
  if (!t) { return null; }
  const n = (s) => Number(String(s).replace(/[^\d]/g, ''));
  const cel = (td) => (td.querySelector('b') ? n(td.querySelector('b').textContent) + '/' + n(td.querySelector('small').textContent) : '0/0');
  const ligne = (tr) => { const c = Array.from(tr.children).slice(1); const tot = c.pop(); return [cel(tot).replace('/', '|'), c.map(cel).join(',')]; };
  return { taille: t.getAttribute('data-taille'), attribution: t.getAttribute('data-attribution'),
    tranches: Array.from(t.tHead.rows[0].children).slice(1, -1).map((x) => x.textContent),
    lignes: Array.from(t.tBodies[0].rows).map((tr) => { const [tot, c] = ligne(tr); return [tr.getAttribute('data-id'), tot, c].join('|'); }),
    total: ligne(t.tFoot.rows[0]).join('|'), largeurOk: t.parentNode.scrollWidth <= t.parentNode.clientWidth + 1 || getComputedStyle(t.parentNode).overflowX !== 'hidden' }; }, racine);
const N = (v, dec) => { const x = (Number(v) || 0).toFixed(dec ? 1 : 0).split('.'); return x[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + (x[1] && x[1] !== '0' ? ',' + x[1] : ''); };

(async () => {
  retirer();
  poser();
  q(`DELETE FROM t_preference_utilisateur WHERE lg_USER_ID = '${U}' AND str_CLE = 'tableau-bord'`);
  const b = await ENV_E2E.lancer(chromium);
  const erreurs = [];
  try {
    const varietes = q(`SELECT SUM(lg_USER_VENDEUR_ID <> lg_USER_CAISSIER_ID), SUM(b_IS_CANCEL), (SELECT MAX(int_QUANTITY) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%'),`
      + ` COUNT(DISTINCT lg_USER_CAISSIER_ID), COUNT(DISTINCT DATE(dt_UPDATED)) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%'`).split('\t').map(Number);
    ok('Ventes d\'essai variées : préventes d\'un autre vendeur, une annulée, quantités > 1, 3 caissières, 2 jours', varietes[0] >= 3 && varietes[1] === 1 && varietes[2] > 1 && varietes[3] === 3 && varietes[4] === 2, varietes.join(','));

    const p = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
    p.on('pageerror', (e) => erreurs.push(String(e.message)));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await p.waitForFunction(() => Ext.ComponentQuery.query('tableaubord').length && document.querySelector('[data-carte]'), null, { timeout: 90000 });
    /* ---------------------------------------------------------------- carte du tableau de bord */
    await p.evaluate(() => { const c = document.querySelector('[data-carte="activite"]'); if (c) { c.scrollIntoView(); } });
    await p.waitForFunction(() => document.querySelector('[data-carte="activite"] .ae-rep'), null, { timeout: 120000 }).catch(() => {});
    const carte = await lireReperes(p, 'tb');
    const entete = await p.evaluate(() => { const c = document.querySelector('[data-carte="activite"]'); return c ? { titre: c.querySelector('.tb-tete').textContent, icone: !!c.querySelector('.tb-tete > .fa-solid') } : null; });
    ok('Tableau de bord : carte « Activité des équipes (jour) » avec icône, 4 repères et le repère d\'alerte', !!carte && /Activité des équipes \(jour\)/.test(entete.titre) && entete.icone
      && ['LONGUES', 'SENSIBLES', 'DELAI_BL', 'RAPIDE'].every((k) => carte[k]) && carte.ALERTES !== null, JSON.stringify({ entete, carte }));
    const apiJour = await p.evaluate(async (j) => (await (await fetch('../api/v1/activite-equipes/analyses?debut=' + j + '&fin=' + j)).json()).data, J);
    const r = apiJour.resume, base = resumeBase(J, J);
    ok('Repères : API = base (ventes de plus de 10 min, actions sensibles, BL datés, délai moyen des BL)', r.ventesLongues === base.ventesLongues && r.actionsSensibles === base.actionsSensibles
      && r.blMesures === base.blMesures && (r.delaiMoyenBl === undefined ? null : r.delaiMoyenBl) === base.delaiMoyenBl && r.ventesLongues >= 1 && r.actionsSensibles >= 1, JSON.stringify({ api: r, base }));
    const eligibles = apiJour.operateurs.filter((o) => o.ventes >= 5 && o.secondesParLigne > 0);
    const min = eligibles.length ? Math.min(...eligibles.map((o) => o.secondesParLigne)) : null;
    ok('Opérateur le plus rapide = plus petit temps par ligne de la carte « Vitesse par opérateur » (5 ventes ou plus)', min === null ? r.plusRapideId == null
      : r.plusRapideSecondesParLigne === min && eligibles.some((o) => o.id === r.plusRapideId && o.secondesParLigne === min), JSON.stringify({ min, r }));
    ok('Repère d\'alerte = constats « ALERTE » de l\'API', r.alertes === apiJour.constats.filter((c) => c.niveau === 'ALERTE').length && carte.ALERTES.split(' | ')[0] === String(r.alertes), carte.ALERTES);
    const attenduCarte = { LONGUES: N(r.ventesLongues), SENSIBLES: N(r.actionsSensibles), DELAI_BL: r.delaiMoyenBl == null ? '—' : N(r.delaiMoyenBl, true) + ' j', RAPIDE: r.plusRapideNom || '—' };
    ok('Carte du tableau de bord = API (valeurs affichées)', Object.keys(attenduCarte).every((k) => carte[k].split(' | ')[0] === attenduCarte[k]), JSON.stringify({ carte, attenduCarte }));

    /* ---------------------------------------------------------------- fenetre de consultation (vrai clic) */
    const FEN = 'window[itemId=tbActiviteFenetre] activiteequipes';
    const attendreFenetre = () => p.waitForFunction((s) => { const a = Ext.ComponentQuery.query(s)[0];
      return a && a.analyses.rendered && !(a.analyses.loadMask && a.analyses.loadMask.isVisible()) && a.getEl().dom.querySelector('.ae-rep')
        && !(a.down('#cCaTranches').loadMask && a.down('#cCaTranches').loadMask.isVisible()) && a.getEl().dom.querySelector('#' + a.down('#aeCaTranches').getId() + ' table, #' + a.down('#aeCaTranches').getId() + ' .ae-vide'); },
    FEN, { timeout: 180000 }).then(() => p.waitForTimeout(800));
    const [repF] = await Promise.all([p.waitForResponse((x) => /activite-equipes\/ca-tranches\?/.test(x.url()), { timeout: 180000 }),
      p.click('[data-carte="activite"] .tb-activite')]);
    await attendreFenetre();
    const fen = await p.evaluate((s) => { const w = Ext.ComponentQuery.query('window[itemId=tbActiviteFenetre]')[0], a = Ext.ComponentQuery.query(s)[0];
      const vue = Ext.getBody().getViewSize(), bx = w.getEl().dom.getBoundingClientRect();
      return { titre: w.title, modal: w.modal, cartes: ['cHeures', 'cCarte', 'cJours', 'cOperateurs', 'cTypesVente', 'cPreventes', 'cCaissieres', 'cGrossistes', 'cRetard', 'cLongues',
        'cSensibles', 'cMotifs', 'cAnnulAuteurs', 'cRepartition', 'cCaTranches'].filter((c) => !a.down('#' + c)), onglets: !!a.down('#ongletsAe'),
      boutons: ['aeHier', 'ae3Jours', 'aeSemaine'].map((b) => (a.down('#' + b) ? a.down('#' + b).getText() : null)), du: a.down('#aeDebut').getSubmitValue(), au: a.down('#aeFin').getSubmitValue(),
      tientDansLEcran: bx.right <= vue.width && bx.bottom <= vue.height && bx.left >= 0 && bx.top >= 0 }; }, FEN);
    ok('Fenêtre de consultation : toutes les cartes du menu (dont la nouvelle), sans les onglets, boutons Hier / 3 jours / 1 semaine, période du jour', fen.titre === 'Activité des équipes'
      && fen.cartes.length === 0 && !fen.onglets && fen.boutons.join('|') === 'Hier|3 jours|1 semaine' && fen.du === J && fen.au === J && fen.tientDansLEcran, JSON.stringify(fen));
    const repFen = await lireReperes(p, FEN);
    ok('Repères : carte = fenêtre', JSON.stringify(repFen) === JSON.stringify(carte), JSON.stringify({ repFen, carte }));
    const ventesJ = ventesBase(J, J);
    ok('La vente annulée n\'est comptée nulle part (base des essais)', !ventesJ.some((x) => x.m === 9900 && x.c === U && x.v === A2), ventesJ.length);
    const apiF = (await repF.json()).data;
    let tabF = await lireTableau(p, FEN);
    const b1c = tableauBase(ventesJ, 1, 'CAISSIER');
    ok('Tranche 1 h, caissière (par défaut) : fenêtre = API = base, ligne par ligne', tabF.taille === '1' && tabF.attribution === 'CAISSIER'
      && JSON.stringify(tableauApi(apiF)) === JSON.stringify(b1c) && JSON.stringify({ tranches: tabF.tranches, lignes: tabF.lignes, total: tabF.total }) === JSON.stringify(b1c),
    JSON.stringify({ ecran: tabF, api: tableauApi(apiF), base: b1c }));
    /* vendeur, tranche 3 h, a la souris */
    await choisir(p, FEN + ' #aeTrancheTaille', '3 h');
    await p.waitForTimeout(300);
    const [repV] = await Promise.all([p.waitForResponse((x) => /ca-tranches\?.*attribution=VENDEUR/.test(x.url()), { timeout: 180000 }), choisir(p, FEN + ' #aeTrancheAttribution', 'Vendeur')]);
    await attendreFenetre();
    tabF = await lireTableau(p, FEN);
    const b3v = tableauBase(ventesJ, 3, 'VENDEUR'), apiV = (await repV.json()).data;
    ok('Tranche 3 h, vendeur (prévente) : fenêtre = API = base, ligne par ligne', tabF.taille === '3' && tabF.attribution === 'VENDEUR'
      && JSON.stringify(tableauApi(apiV)) === JSON.stringify(b3v) && JSON.stringify({ tranches: tabF.tranches, lignes: tabF.lignes, total: tabF.total }) === JSON.stringify(b3v),
    JSON.stringify({ ecran: tabF, base: b3v }));
    ok('Caissière et vendeur : même CA total, même nombre de ventes', tableauApi(apiV).total.split('|').slice(0, 2).join('|') === tableauApi(apiF).total.split('|').slice(0, 2).join('|'));
    /* boutons de periode */
    for (const [bouton, debut] of [['aeHier', H], ['ae3Jours', q('SELECT CURDATE() - INTERVAL 2 DAY')], ['aeSemaine', q('SELECT CURDATE() - INTERVAL 6 DAY')]]) {
      const [ra] = await Promise.all([p.waitForResponse((x) => /activite-equipes\/analyses\?/.test(x.url()), { timeout: 180000 }), cliquer(p, FEN + ' #' + bouton)]);
      await attendreFenetre();
      const u = new URL(ra.url()), d = (await ra.json()).data;
      const fin = bouton === 'aeHier' ? H : J;
      const etat = await p.evaluate(([s, bt]) => { const a = Ext.ComponentQuery.query(s)[0]; return { du: a.down('#aeDebut').getSubmitValue(), au: a.down('#aeFin').getSubmitValue(), presse: a.down('#' + bt).pressed }; }, [FEN, bouton]);
      const tab = await lireTableau(p, FEN), bt = tableauBase(ventesBase(debut, fin), 3, 'VENDEUR');
      ok('Bouton « ' + bouton.replace('ae', '') + ' » : période ' + debut + ' – ' + fin + ', écran = API = base (repères et tableau)', u.searchParams.get('debut') === debut && u.searchParams.get('fin') === fin
        && etat.du === debut && etat.au === fin && etat.presse && d.debut === debut && d.fin === fin
        && JSON.stringify(tab ? { tranches: tab.tranches, lignes: tab.lignes, total: tab.total } : { tranches: [], lignes: [], total: '0|0|' }) === JSON.stringify(bt)
        && d.resume.ventesLongues === resumeBase(debut, fin).ventesLongues, JSON.stringify({ etat, url: ra.url().replace(/^.*\?/, ''), tab, bt }));
    }
    /* export CSV = API */
    const csv = await p.evaluate(async (j) => { const r = await fetch('../api/v1/activite-equipes/ca-tranches/csv?debut=' + j + '&fin=' + j + '&taille=1&attribution=CAISSIER');
      return { type: r.headers.get('content-type'), texte: await r.text() }; }, J);
    const lignesCsv = csv.texte.replace(/^﻿/, '').trim().split(/\r?\n/);
    const totalCsv = lignesCsv[lignesCsv.length - 1].split(';');
    ok('Export CSV = API (une ligne par employé, ligne Total, totaux identiques)', /text\/csv/.test(csv.type) && lignesCsv.length === apiF.lignes.length + 2
      && totalCsv[0] === '"Total"' && Number(totalCsv[totalCsv.length - 2]) === apiF.totaux.ca && Number(totalCsv[totalCsv.length - 1]) === apiF.totaux.ventes, lignesCsv.slice(-1)[0]);
    /* API = base : 6 tailles x 2 attributions, aujourd'hui et sur 7 jours */
    const sem = q('SELECT CURDATE() - INTERVAL 6 DAY'), ventesS = ventesBase(sem, J);
    const ecarts = [];
    for (const [d, vs] of [[J, ventesJ], [sem, ventesS]]) {
      for (let t = 1; t <= 6; t++) {
        for (const a of ['CAISSIER', 'VENDEUR']) {
          const api = await p.evaluate(async (u) => (await (await fetch(u)).json()).data, `../api/v1/activite-equipes/ca-tranches?debut=${d}&fin=${J}&taille=${t}&attribution=${a}`);
          if (JSON.stringify(tableauApi(api)) !== JSON.stringify(tableauBase(vs, t, a))) { ecarts.push(d + ' ' + t + ' h ' + a); }
        }
      }
    }
    ok('API = base pour les 6 tailles et les 2 attributions (jour et 7 jours)', ecarts.length === 0, ecarts.join(', '));
    /* fermeture */
    await cliquer(p, 'window[itemId=tbActiviteFenetre] button[itemId=tbActiviteFermer]');
    await p.waitForTimeout(600);
    ok('Bouton « Fermer » : la fenêtre et son composant sont détruits', await p.evaluate(() => Ext.ComponentQuery.query('window[itemId=tbActiviteFenetre]').length === 0
      && Ext.ComponentQuery.query('activiteequipes').length === 0));

    /* ---------------------------------------------------------------- menu Activite des equipes, meme jour */
    await ouvrirMenu(p, 'ANALYSE DE GESTION', 'Activité des équipes');
    await p.waitForFunction(() => Ext.ComponentQuery.query('activiteequipes').some((c) => c.isVisible(true)), null, { timeout: 60000 });
    const jj = J.split('-').reverse().join('/');
    await saisir(p, 'activiteequipes #aeDebut', jj);
    await saisir(p, 'activiteequipes #aeFin', jj);
    await cliquer(p, 'activiteequipes button[itemId=ae-analyses]');
    const MENU = 'activiteequipes{isVisible(true)}';
    await p.waitForFunction((s) => { const a = Ext.ComponentQuery.query(s)[0]; return a && a.getEl().dom.querySelector('.ae-rep') && a.getEl().dom.querySelector('table.ae-ct')
      && !(a.down('#cCaTranches').loadMask && a.down('#cCaTranches').loadMask.isVisible()); }, MENU, { timeout: 180000 });
    await p.waitForTimeout(1000);
    const repMenu = await lireReperes(p, MENU), tabMenu = await lireTableau(p, MENU);
    ok('Repères : menu = carte = fenêtre', JSON.stringify(repMenu) === JSON.stringify(carte), JSON.stringify({ repMenu, carte }));
    ok('Tableau du menu (1 h, caissière par défaut) = fenêtre = API = base', JSON.stringify({ tranches: tabMenu.tranches, lignes: tabMenu.lignes, total: tabMenu.total }) === JSON.stringify(b1c),
      JSON.stringify({ tabMenu, b1c }));
    const aide = await p.evaluate((s) => { const c = Ext.ComponentQuery.query(s)[0].down('#cCaTranches'); const t = c.query('tool[type=help]')[0]; return t ? t.tooltip : ''; }, MENU);
    ok('Aide « ? » : règles de vente (clôturées, non annulées, montant > 0) et attribution expliquées', /clôturées/.test(aide) && /non annulées/.test(aide) && /supérieur à 0/.test(aide) && /Vendeur/.test(aide), aide);
    ok('Ergonomie : le tableau se lit dans son cadre (défilement si besoin, rien de coupé)', tabMenu.largeurOk);
    await p.context().close();

    /* ---------------------------------------------------------------- droit : role sans le menu */
    ok('Le rôle du compte de test a le droit du menu (base)', !!LIGNE, ROLE);
    q("DELETE FROM t_role_privelege WHERE lg_ROLE_PRIVILEGE = '" + LIGNE.split('|')[0] + "'");
    const p2 = await (await b.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
    p2.on('pageerror', (e) => erreurs.push(String(e.message)));
    await connexion(p2, ENV_E2E.LOGIN, 'e2etest');
    await p2.waitForFunction(() => Ext.ComponentQuery.query('tableaubord').length && document.querySelectorAll('[data-carte]').length > 0, null, { timeout: 90000 }).catch(() => {});
    await p2.waitForTimeout(3000);
    const sans = await p2.evaluate(async () => ({ cartes: document.querySelectorAll('[data-carte]').length, activite: !!document.querySelector('[data-carte="activite"]'),
      statut: (await fetch('../api/v1/activite-equipes/analyses')).status, tranches: (await fetch('../api/v1/activite-equipes/ca-tranches')).status }));
    ok('Sans le droit : pas de carte (les autres sont là), routes refusées (403)', sans.cartes > 0 && !sans.activite && sans.statut === 403 && sans.tranches === 403, JSON.stringify(sans));
    await p2.context().close();
    remettreDroit();
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    await b.close();
    remettreDroit();
    ok('Bilan : droits des rôles identiques avant / après', empreinte() === DROITS_AVANT);
    retirer();
    q(`DELETE FROM t_preference_utilisateur WHERE lg_USER_ID = '${U}' AND str_CLE = 'tableau-bord'`);
    if (prefAvant !== '#AUCUNE#') {
      q(`INSERT INTO t_preference_utilisateur (lg_USER_ID, str_CLE, txt_VALEUR) VALUES ('${U}', 'tableau-bord', '${prefAvant.replace(/\\/g, '\\\\').replace(/'/g, "''")}')`);
    }
    ok('Bilan : aucune vente d\'essai ne reste', q(`SELECT (SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%')`
      + ` + (SELECT COUNT(*) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '${M}-%')`) === '0');
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
