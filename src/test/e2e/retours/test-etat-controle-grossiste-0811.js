/* PLAN DU 08/11, POINT 2a : FICHE GROSSISTE, « ETAT DE CONTROLE D'ACHAT » EN API REST.
 *
 * Avant : la grille de la fiche grossiste (bouton « Detail Grossiste ») se chargeait par la JSP
 * webservices/commandemanagement/etats/ws_data.jsp. Apres : GET api/v1/grossistes/{id}/etat-controle-achat.
 *
 * Rapprochement, ligne par ligne, sur plusieurs jeux (periode longue paginee, page 2, recherche par reference de BL,
 * recherche par produit, periode avec BL supprimes, periode vide) :
 *   base (requete independante)  =  API REST  =  ancienne JSP (memes lignes, memes montants)  =  grille de l'ecran.
 * Champs compares : reference BL, reference commande, HT, TVA, TTC, avoir, date de livraison, date d'entree,
 * operateur, produits du BL (CIP, quantites commandee / livree / gratuite / avoir), retour complet possible.
 * Total : celui de l'API = nombre de lignes en base avec le MEME filtre (la JSP le comptait sans le filtre produit).
 * Ecran : ouvert par le menu, la liste des grossistes et l'icone « Detail Grossiste » ; dates saisies au clavier,
 * bouton « rechercher » ; la grille interroge l'API REST et plus jamais la JSP. Lecture seule.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const V = require('../outils/vues');
const { execFileSync } = require('child_process');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 1500) + ']' : '')); }
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', ENV_E2E.BASE, '-sN', '--raw'], { input: s, encoding: 'utf8' }).replace(/\r/g, '').trim();
const lignes = (s) => { const t = q(s); return t ? t.split('\n').map((l) => l.split('\t')) : []; };
const sql = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

/* grossiste ayant le plus de BL clotures ou supprimes */
const [G, NOM] = lignes(`SELECT o.lg_GROSSISTE_ID, g.str_LIBELLE FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID
  JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID WHERE b.str_STATUT IN ('is_Closed', 'delete') GROUP BY 1, 2 ORDER BY COUNT(*) DESC LIMIT 1`)[0];
const FIN = q(`SELECT DATE(MAX(b.dt_DATE_LIVRAISON)) FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID WHERE o.lg_GROSSISTE_ID = '${G}' AND b.str_STATUT IN ('is_Closed', 'delete')`);
const DEBUT = q(`SELECT DATE('${FIN}') - INTERVAL 45 DAY`);
const FILTRE = (d1, d2, r) => `FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID JOIN t_user u ON u.lg_USER_ID = b.lg_USER_ID
  WHERE o.lg_GROSSISTE_ID = '${G}' AND DATE(b.dt_DATE_LIVRAISON) BETWEEN '${d1}' AND '${d2}' AND b.str_STATUT IN ('is_Closed', 'delete')
  AND (b.str_REF_LIVRAISON LIKE '${sql(r)}%' OR o.str_REF_ORDER LIKE '${sql(r)}%' OR b.lg_BON_LIVRAISON_ID IN (SELECT d.lg_BON_LIVRAISON_ID
  FROM t_bon_livraison_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID WHERE f.str_NAME LIKE '%${sql(r)}%' OR f.int_CIP LIKE '%${sql(r)}%'))`;
/* un BL de la periode (recherche par reference) et un produit present dans peu de BL (recherche par produit) */
const BL_REF = q(`SELECT b.str_REF_LIVRAISON ${FILTRE(DEBUT, FIN, '')} ORDER BY b.dt_DATE_LIVRAISON DESC LIMIT 3, 1`);
const CIP = q(`SELECT f.int_CIP FROM t_bon_livraison_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID JOIN t_bon_livraison b ON b.lg_BON_LIVRAISON_ID = d.lg_BON_LIVRAISON_ID
  JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID WHERE o.lg_GROSSISTE_ID = '${G}' AND DATE(b.dt_DATE_LIVRAISON) BETWEEN '${DEBUT}' AND '${FIN}' AND LENGTH(f.int_CIP) >= 6
  GROUP BY f.int_CIP HAVING COUNT(DISTINCT b.lg_BON_LIVRAISON_ID) BETWEEN 2 AND 5 ORDER BY f.int_CIP LIMIT 1`);
const SUPPR = q(`SELECT DATE(b.dt_DATE_LIVRAISON) FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID WHERE o.lg_GROSSISTE_ID = '${G}' AND b.str_STATUT = 'delete' LIMIT 1`);

const JEUX = [
  { nom: 'Période de 45 jours, page 1', d1: DEBUT, d2: FIN, r: '', start: 0 },
  { nom: 'Même période, page 2', d1: DEBUT, d2: FIN, r: '', start: 20 },
  { nom: 'Recherche par référence de BL', d1: DEBUT, d2: FIN, r: BL_REF, start: 0 },
  { nom: 'Recherche par produit (CIP)', d1: DEBUT, d2: FIN, r: CIP, start: 0, produit: true },
  { nom: 'Période vide', d1: '2001-01-01', d2: '2001-01-31', r: '', start: 0 }
];
if (SUPPR) { JEUX.push({ nom: 'Période avec BL supprimé', d1: SUPPR, d2: SUPPR, r: '', start: 0 }); }

function attendus(j) {
  const total = Number(q(`SELECT COUNT(*) ${FILTRE(j.d1, j.d2, j.r)}`));
  const l = lignes(`SELECT b.lg_BON_LIVRAISON_ID, b.str_REF_LIVRAISON, o.str_REF_ORDER, ROUND(b.int_MHT), ROUND(b.int_TVA), ROUND(b.int_HTTC),
    (SELECT IFNULL(ROUND(SUM(x.int_QTE_RETURN * x.int_PAF)), 0) FROM t_bon_livraison_detail x WHERE x.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID),
    DATE_FORMAT(b.dt_DATE_LIVRAISON, '%d/%m/%Y'), IFNULL(DATE_FORMAT(b.dt_UPDATED, '%d/%m/%Y'), ''), CONCAT(u.str_FIRST_NAME, ' ', u.str_LAST_NAME), b.str_STATUT,
    IFNULL((SELECT GROUP_CONCAT(CONCAT(f.int_CIP, ':', d.int_QTE_CMDE, ':', d.int_QTE_RECUE - d.int_QTE_UG, ':', d.int_QTE_UG, ':', IFNULL(d.int_QTE_RETURN, 0)) ORDER BY f.int_CIP, d.int_QTE_CMDE SEPARATOR '|')
      FROM t_bon_livraison_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID WHERE d.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID AND d.str_STATUT = 'is_Closed'), '')
    ${FILTRE(j.d1, j.d2, j.r)} ORDER BY b.dt_DATE_LIVRAISON DESC, b.lg_BON_LIVRAISON_ID DESC LIMIT ${j.start}, 20`);
  return { total, l: l.map((x) => ({ id: x[0], bl: x[1], cmd: x[2], ht: Number(x[3]), tva: Number(x[4]), ttc: Number(x[5]), avoir: Number(x[6]), livr: x[7], entree: x[8], op: x[9], suppr: x[10] === 'delete', produits: x[11] })) };
}

/* produits du rowexpander : « CIP / Qte Cmdee: (n) / Qte Livree: (n) / Unite gratuite: (n) / Avoir (n) » */
function produitsDe(html) {
  const out = [];
  String(html || '').split(/<br>/i).forEach((bloc) => {
    const sp = [...bloc.matchAll(/<span[^>]*>([\s\S]*?)<\/span>/gi)].map((m) => m[1].replace(/<[^>]+>/g, '').trim());
    if (sp.length < 6) { return; }
    const n = (s) => (s.match(/\((-?\d+)\)/) || [])[1];
    out.push([sp[0], n(sp[2]), n(sp[3]), n(sp[4]), n(sp[5])].join(':'));
  });
  return out.sort().join('|');
}
const trierProduits = (s) => (s ? s.split('|').sort().join('|') : '');
const versLigne = (x) => ({ id: x.lg_BON_LIVRAISON_ID, bl: x.str_BL_REF, cmd: x.str_ORDER_REF, ht: Number(x.int_ORDER_PRICE), tva: Number(x.int_TVA), ttc: Number(x.int_BL_PRICE),
  avoir: Number(x.int_AMOUNT_AVOIR), livr: x.dt_DATE_LIVRAISON, entree: x.dt_UPDATED, op: x.lg_USER_ID, produits: produitsDe(x.str_FAMILLE_ITEM), retour: x.RETURN_FULL_BL });
function ecarts(a, b, champs) {
  const e = [];
  if (a.length !== b.length) { e.push('nombre ' + a.length + ' / ' + b.length); }
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    champs.forEach((c) => { const va = c === 'produits' ? trierProduits(a[i][c]) : a[i][c], vb = c === 'produits' ? trierProduits(b[i][c]) : b[i][c]; if (String(va) !== String(vb)) { e.push(`ligne ${i + 1} ${c} : ${va} / ${vb}`); } });
  }
  return e;
}
const CHAMPS = ['id', 'bl', 'cmd', 'ht', 'tva', 'ttc', 'avoir', 'livr', 'entree', 'op', 'produits'];

(async () => {
  let b = null;
  const err = [], appels = [];
  try {
    ok('Jeux d\'essai trouvés dans la base (grossiste, BL, produit)', G && BL_REF && CIP, [NOM, DEBUT, FIN, BL_REF, CIP, SUPPR].join(' | '));
    b = await ENV_E2E.lancer(chromium);
    const p = await (await b.newContext({ viewport: { width: 1600, height: 950 } })).newPage();
    p.on('pageerror', (e) => err.push(e.message));
    p.on('request', (r) => { if (/etat-controle-achat|etats\/ws_data\.jsp/.test(r.url())) { appels.push(r.url()); } });
    await V.connexion(p, ENV_E2E.LOGIN, 'e2etest');
    const droitRetour = await p.evaluate(() => true);

    /* 1. Base = API = JSP, jeu par jeu */
    for (const j of JEUX) {
      const att = attendus(j);
      const prm = `datedebut=${j.d1}&datefin=${j.d2}&search_value=${encodeURIComponent(j.r)}&start=${j.start}&limit=20&page=${j.start / 20 + 1}`;
      const api = await p.evaluate(async (u) => { const r = await fetch(u); return { s: r.status, t: await r.text() }; }, `../api/v1/grossistes/${encodeURIComponent(G)}/etat-controle-achat?${prm}`);
      let o = null; try { o = JSON.parse(api.t); } catch (e) { /* 404 avant le correctif */ }
      const lApi = o && o.results ? o.results.map(versLigne) : [];
      ok(`${j.nom} : API REST = base, ligne par ligne (${att.l.length} lignes)`, api.s === 200 && o && ecarts(att.l, lApi, CHAMPS).length === 0, api.s + ' ' + (o ? ecarts(att.l, lApi, CHAMPS).slice(0, 4).join(' ; ') : api.t.slice(0, 120)));
      ok(`${j.nom} : total de l'API = base (${att.total})`, o && Number(o.total) === att.total, o && o.total);
      ok(`${j.nom} : retour complet refusé sur les BL supprimés`, o && lApi.every((x, i) => !att.l[i] || !att.l[i].suppr || x.retour === false));
      /* L'ancienne JSP ne departage pas les BL livres le meme jour : ses pages ne sont pas stables. Comparaison sur la
       * periode entiere (une seule page de 1000), triee par identifiant. */
      const tout = `datedebut=${j.d1}&datefin=${j.d2}&search_value=${encodeURIComponent(j.r)}&start=0&limit=1000&page=1`;
      const jsp = await p.evaluate(async (u) => { const r = await fetch(u); return r.text(); }, `../webservices/commandemanagement/etats/ws_data.jsp?lg_GROSSISTE_ID=${G}&${tout}`);
      const api2 = await p.evaluate(async (u) => (await fetch(u)).json(), `../api/v1/grossistes/${encodeURIComponent(G)}/etat-controle-achat?${tout}`);
      let oj = null; try { oj = JSON.parse(jsp.trim().replace(/^\(/, '').replace(/\)$/, '')); } catch (e) { /* rien */ }
      const parId = (l) => l.slice().sort((x, y) => (x.id < y.id ? -1 : 1));
      const lJsp = oj ? parId(oj.results.map(versLigne)) : [], lTout = parId(api2.results.map(versLigne));
      ok(`${j.nom} : ancienne JSP = API sur toute la période (${lTout.length} BL : montants, dates, opérateur, produits, retour complet)`,
        oj && ecarts(lJsp, lTout, CHAMPS.concat(['retour'])).length === 0, oj ? ecarts(lJsp, lTout, CHAMPS.concat(['retour'])).slice(0, 4).join(' ; ') : jsp.slice(0, 120));
      if (!j.produit) { ok(`${j.nom} : total de la JSP = total de l'API`, oj && Number(String(oj.total).trim()) === Number(o && o.total), (oj && oj.total) + ' / ' + (o && o.total)); }
    }

    /* 2. Ecran : menu, liste des grossistes, icone « Detail Grossiste » */
    const menu = await p.evaluate(() => { const r = Ext.ComponentQuery.query('navigation')[0].getStore().getRootNode().findChild('id', 'grossistemanager', true); return r ? [r.parentNode.get('text'), r.get('text')] : null; });
    await V.ouvrirMenu(p, menu[0], menu[1]);
    await p.waitForFunction(() => { const g = Ext.ComponentQuery.query('grossistemanager')[0]; return g && g.getStore && !g.getStore().isLoading(); }, null, { timeout: 30000 });
    await V.saisir(p, 'grossistemanager #rechecher', NOM);
    await V.cliquer(p, 'grossistemanager button[text=rechercher]');
    await p.waitForFunction((g) => { const e = Ext.ComponentQuery.query('grossistemanager')[0]; return !e.getStore().isLoading() && e.getStore().findExact('lg_GROSSISTE_ID', g) >= 0; }, G, { timeout: 30000 });
    const icone = await p.evaluate((g) => { const e = Ext.ComponentQuery.query('grossistemanager')[0]; const ligne = e.getStore().findExact('lg_GROSSISTE_ID', g);
      const col = e.headerCt.getGridColumns().find((c) => c.xtype === 'actioncolumn' && c.items && c.items[0] && c.items[0].handler === e.onManageClick);
      const i = e.getView().getNode(ligne).querySelector('.x-grid-cell-' + col.id + ' .x-action-col-icon'); i.id = i.id || 'e2e-detail-grossiste'; return i.id; }, G);
    appels.length = 0;
    await p.click('#' + icone);
    await p.waitForFunction(() => Ext.getCmp('gridpanelID2') && !Ext.getCmp('gridpanelID2').getStore().isLoading(), null, { timeout: 30000 });
    ok('Écran : à l\'ouverture, la grille interroge l\'API REST, jamais la JSP', appels.length > 0 && appels.every((u) => /api\/v1\/grossistes\/.+\/etat-controle-achat/.test(u)), appels.join(' | '));
    const jeuEcran = JEUX[0];
    await V.saisir(p, '#datedebut', jeuEcran.d1.split('-').reverse().join('/'));
    await V.saisir(p, '#datefin', jeuEcran.d2.split('-').reverse().join('/'));
    appels.length = 0;
    /* la requete de composants globale bute sur un element de la fenetre : bouton cherche dans la barre de la grille */
    const btn = await p.evaluate(() => Ext.getCmp('gridpanelID2').getDockedItems('toolbar[dock=top]')[0].items.findBy((x) => x.text === 'rechercher').getId());
    await p.click('#' + btn);
    await p.waitForTimeout(500);
    await p.waitForFunction(() => !Ext.getCmp('gridpanelID2').getStore().isLoading(), null, { timeout: 30000 });
    const grille = await p.evaluate(() => Ext.getCmp('gridpanelID2').getStore().getRange().map((r) => r.data));
    const att = attendus(jeuEcran);
    ok('Écran : « rechercher » passe par l\'API REST avec les dates saisies', appels.length > 0 && appels.every((u) => /etat-controle-achat/.test(u) && u.includes('datedebut=' + jeuEcran.d1) && u.includes('datefin=' + jeuEcran.d2)), appels.join(' | '));
    ok(`Écran : grille = base, ligne par ligne (${att.l.length} lignes)`, ecarts(att.l, grille.map(versLigne), CHAMPS).length === 0, ecarts(att.l, grille.map(versLigne), CHAMPS).slice(0, 4).join(' ; '));
    const affiche = await p.evaluate(() => { const g = Ext.getCmp('gridpanelID2'); const n = g.getView().getNode(0); return n ? n.textContent.replace(/\s+/g, ' ') : ''; });
    ok('Écran : la première ligne affiche ses références et son TTC formaté', att.l.length === 0 || (affiche.includes(att.l[0].bl) && affiche.includes(att.l[0].cmd)), affiche.slice(0, 200));
    const pagine = await p.evaluate(() => { const s = Ext.getCmp('gridpanelID2').getStore(); return s.getTotalCount(); });
    ok('Écran : total de la barre de pagination = base', pagine === att.total, pagine + ' / ' + att.total);
    await p.evaluate(() => Ext.getCmp('grossisteviewID') && Ext.getCmp('grossisteviewID').close());
    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
    void droitRetour;
  } catch (x) {
    ok('Parcours sans exception', false, x.stack);
  } finally {
    if (b) { await b.close(); }
  }
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
