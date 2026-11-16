/* ETAT DE CONTROLE DES ACHATS : LISTE DES EN-TETES, DETAIL D'UN BON A LA DEMANDE (demande du 14/11).
 *
 * Mesure de l'utilisateur : 709 ms d'attente pour UN seul BL de plus de 130 lignes. La liste renvoyait tout le bon -
 * chaque ligne et son produit complet - alors que la grille n'affiche que les en-tetes. Desormais la liste ne renvoie
 * que les en-tetes (statut du controle, avoir, ecart et nombre de lignes agreges en base) et la fenetre « Voir le
 * detail du controle » charge les lignes du bon choisi.
 *
 * Parcours par les vues (menu, saisie des dates, bouton Rechercher, listes deroulantes, icone du detail, Imprimer,
 * Excel), sur un jeu d'essai pose en base (marque E2E-CBD, janvier 2031 : aucune donnee reelle a ces dates) puis retire :
 *  - 25 BL sur 3 grossistes : un gros BL de 150 lignes controle sans ecart avec des avoirs, un BL controle avec un
 *    ecart, un BL en cours avec ecart, un BL a faire avec un avoir, un BL sans ligne, 20 petits BL varies ;
 *  - quantites differentes d'une ligne a l'autre, superieures a 1, nulles, comptages absents, prix differents ;
 *  - budget de la liste (echoue sur l'ancien code : chaque ligne et son produit etaient renvoyes) ;
 *  - rapprochement ecran = reponse = base, BL par BL (grossiste, reference, HT, TVA, TTC, avoir, statut), pages 1 et 2 ;
 *  - filtres de statut, d'ecart et de grossiste : ensembles de BL attendus ;
 *  - detail a la demande : ligne par ligne (CIP, designation, prix d'achat, prix de vente, stock, comptage, ecart,
 *    controle) = base = lignes de l'ancienne reponse complete ; BL sans ligne ; temps d'ouverture ;
 *  - impression (PDF) et export Excel : statut, ecart, TTC et avoir de chaque BL = base ;
 *  - bilan avant / apres : l'ecran n'ecrit rien ;
 *  - sur les donnees reelles de la copie : liste legere = liste complete (statut, avoir, ecart, nombre de lignes et
 *    tous les champs d'en-tete), et mesures de temps et de taille (gros BL du 21/12/2023, periode du 12 au 23/10/2026).
 *
 * Variables : BASE (adresse de Prestige, ex. http://localhost:10090/prestige), DB_TEST, E2E_BASE_LIBRE (voir
 * outils/poste.js). A lancer seul, sous le verrou des tests d'ecran.
 */
const { chromium } = require('playwright-core');
const ENV_E2E = require('../outils/poste');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { BASE: URL_PRESTIGE, connexion, ouvrirMenu, cliquer, choisir, saisir } = require('../outils/vues');

const res = [];
function ok(n, c, d) { res.push({ n, c: !!c }); console.log((c ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  [' + String(d).slice(0, 400) + ']' : '')); }
const mesures = [];
function mesure(n, v) { mesures.push(n + ' : ' + v); console.log('MESURE  ' + n + ' : ' + v); }
const BASE = ENV_E2E.BASE;
const q = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE, '-sN', '-e', s], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();
const exec = (s) => execFileSync('mariadb', [...ENV_E2E.MARIADB, '--default-character-set=utf8mb4', BASE], { encoding: 'utf8', input: s, maxBuffer: 64 * 1024 * 1024 });
const lignesSql = (s) => { const t = q(s); return t ? t.split('\n').map((l) => l.replace(/\r$/, '').split('\t')) : []; };
const MARQUE = 'E2E-CBD';
const DU = '13/01/2031', AU = '14/01/2031';
const chiffres = (v) => String(v === null || v === undefined ? '' : v).replace(/[^0-9-]/g, '');
const TMP = ENV_E2E.TMP || require('os').tmpdir();

/* ------------------------------------------------------------------ jeu d'essai */
function nettoyer() {
  exec("DELETE FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_DETAIL LIKE '" + MARQUE + "%';"
    + "DELETE FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE '" + MARQUE + "%';"
    + "DELETE FROM t_order WHERE lg_ORDER_ID LIKE '" + MARQUE + "%';");
}

/* Un BL : grossiste (1 a 3), date, lignes [recue, compte|null, coche 0/1, avoir|null, paf, prix de vente, stock]. */
function definirBons() {
  const bons = [];
  const gros = [];
  for (let i = 0; i < 150; i++) {
    const recue = 1 + (i * 7) % 12;
    gros.push([recue, recue, 1, i % 37 === 0 ? 1 + (i % 4) : null, 100 + i * 7, 150 + i * 11, i % 9]);
  }
  bons.push({ g: 1, jour: '2031-01-14', lignes: gros });
  bons.push({ g: 1, jour: '2031-01-14', lignes: [[10, 10, 1, null, 1000, 1500, 3], [6, 6, 1, 0, 820, 1200, 0],
    [10, 7, 1, null, 2350, 3100, 12], [2, 2, 1, null, 400, 600, 1], [4, 4, 1, 3, 1250, 1900, 5]] });
  bons.push({ g: 2, jour: '2031-01-13', lignes: [[5, 5, 0, null, 900, 1300, 2], [3, null, 0, null, 700, 1000, 0],
    [6, 2, 0, null, 1800, 2500, 4], [8, 0, 0, null, 300, 450, 8]] });
  bons.push({ g: 2, jour: '2031-01-13', lignes: [[12, null, 0, 1, 5400, 7000, 2], [1, null, 0, null, 150, 250, 0],
    [3, 0, 0, null, 990, 1400, 6]] });
  bons.push({ g: 3, jour: '2031-01-13', lignes: [] });
  for (let i = 0; i < 20; i++) {
    const r = 1 + (i % 5) * 3;
    const cas = i % 4;
    const l1 = cas === 0 ? [r, r, 1, null, 200 + i * 31, 300 + i * 40, i % 3]
      : cas === 1 ? [r, r + 1, 0, null, 210 + i * 29, 330 + i * 41, 1]
        : cas === 2 ? [r, null, 0, i % 3 === 0 ? 2 : null, 220 + i * 13, 310 + i * 17, 0]
          : [r, r, 0, null, 230 + i * 3, 290 + i * 5, 2];
    const lignes = [l1];
    if (i % 2 === 0) { lignes.push([2 + i % 4, i % 8 === 0 ? 0 : 2 + i % 4, i % 8 === 0 ? 0 : 1, i % 6 === 0 ? 1 : null, 640 + i, 900 + i, 4]); }
    bons.push({ g: 3, jour: '2031-01-13', lignes });
  }
  return bons;
}

function semer(bons) {
  nettoyer();
  const grossistes = lignesSql("SELECT g.lg_GROSSISTE_ID, g.str_LIBELLE FROM t_order o JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID"
    + " WHERE g.str_STATUT = 'enable' GROUP BY g.lg_GROSSISTE_ID, g.str_LIBELLE ORDER BY COUNT(*) DESC LIMIT 3");
  if (grossistes.length < 3) { throw new Error('Moins de 3 grossistes en base'); }
  const gabaritCommande = q("SELECT lg_ORDER_ID FROM t_order LIMIT 1");
  const gabaritBon = q("SELECT b.lg_BON_LIVRAISON_ID FROM t_bon_livraison b JOIN t_user u ON u.lg_USER_ID = b.lg_USER_ID"
    + " WHERE b.str_STATUT = 'is_Closed' AND u.str_LAST_NAME IS NOT NULL AND u.str_FIRST_NAME IS NOT NULL LIMIT 1");
  const gabaritLigne = q("SELECT lg_BON_LIVRAISON_DETAIL FROM t_bon_livraison_detail WHERE lg_ZONE_GEO_ID IS NOT NULL LIMIT 1");
  const produits = lignesSql("SELECT lg_FAMILLE_ID FROM t_famille WHERE str_STATUT = 'enable' AND int_CIP IS NOT NULL AND int_CIP <> ''"
    + " AND str_DESCRIPTION IS NOT NULL AND str_DESCRIPTION <> '' ORDER BY lg_FAMILLE_ID LIMIT 200").map((l) => l[0]);
  if (!gabaritCommande || !gabaritBon || !gabaritLigne || produits.length < 160) { throw new Error('Gabarits introuvables'); }
  let sql = "CREATE TEMPORARY TABLE tmp_o AS SELECT * FROM t_order WHERE lg_ORDER_ID = '" + gabaritCommande + "';\n";
  grossistes.forEach((g, i) => {
    sql += "UPDATE tmp_o SET lg_ORDER_ID = '" + MARQUE + "-O" + (i + 1) + "', str_REF_ORDER = '" + MARQUE + "-CMD" + (i + 1)
      + "', lg_GROSSISTE_ID = '" + g[0] + "';\nINSERT INTO t_order SELECT * FROM tmp_o;\n";
  });
  sql += "DROP TEMPORARY TABLE tmp_o;\n";
  sql += "CREATE TEMPORARY TABLE tmp_bl AS SELECT * FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID = '" + gabaritBon + "';\n";
  sql += "CREATE TEMPORARY TABLE tmp_bld AS SELECT * FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_DETAIL = '" + gabaritLigne + "';\n";
  let p = 0;
  bons.forEach((b, i) => {
    const n = String(i).padStart(2, '0');
    b.id = MARQUE + '-B' + n; b.ref = MARQUE + '-REF' + n; b.grossisteId = grossistes[b.g - 1][0]; b.grossiste = grossistes[b.g - 1][1];
    b.ht = 10000 + i * 137; b.tva = Math.round(b.ht * 0.18); b.ttc = b.ht + b.tva;
    sql += "UPDATE tmp_bl SET lg_BON_LIVRAISON_ID = '" + b.id + "', lg_ORDER_ID = '" + MARQUE + "-O" + b.g + "', str_REF_LIVRAISON = '" + b.ref
      + "', str_STATUT = 'is_Closed', dt_DATE_LIVRAISON = '" + b.jour + " 00:00:00', dt_CREATED = '" + b.jour + " 09:" + n + ":00', dt_UPDATED = '" + b.jour + " 09:" + n + ":00'"
      + ", int_MHT = " + b.ht + ", int_TVA = " + b.tva + ", int_HTTC = " + b.ttc + ", int_MONTANT_REGLE = 0, int_MONTANT_RESTANT = " + b.ttc + ";\n"
      + "INSERT INTO t_bon_livraison SELECT * FROM tmp_bl;\n";
    b.lignes.forEach((l, j) => {
      const id = MARQUE + '-B' + n + '-L' + String(j).padStart(3, '0');
      sql += "UPDATE tmp_bld SET lg_BON_LIVRAISON_DETAIL = '" + id + "', lg_BON_LIVRAISON_ID = '" + b.id + "', lg_FAMILLE_ID = '" + produits[p++ % produits.length]
        + "', lg_GROSSISTE_ID = '" + b.grossisteId + "', int_QTE_CMDE = " + l[0] + ", int_QTE_RECUE = " + l[0] + ", int_QTE_UG = 0, int_QTE_MANQUANT = 0"
        + ", quantite_controle = " + (l[1] === null ? 'NULL' : l[1]) + ", checked = " + l[2] + ", int_QTE_RETURN = " + (l[3] === null ? 'NULL' : l[3])
        + ", int_PAF = " + l[4] + ", int_PA_REEL = " + l[4] + ", prixUni = " + l[4] + ", int_PRIX_VENTE = " + l[5] + ", int_PRIX_REFERENCE = " + l[5]
        + ", int_INITSTOCK = " + l[6] + ", str_STATUT = 'is_Closed';\nINSERT INTO t_bon_livraison_detail SELECT * FROM tmp_bld;\n";
    });
  });
  sql += "DROP TEMPORARY TABLE tmp_bl; DROP TEMPORARY TABLE tmp_bld;\n";
  exec(sql);
  return grossistes;
}

/* Attendu, calcule par le test sur les lignes relues en base (regles metier, independamment du serveur). */
function attenduDepuisLaBase() {
  const entetes = lignesSql("SELECT b.lg_BON_LIVRAISON_ID, b.str_REF_LIVRAISON, g.str_LIBELLE, b.int_MHT, b.int_TVA, b.int_HTTC, o.str_REF_ORDER"
    + " FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID"
    + " WHERE b.lg_BON_LIVRAISON_ID LIKE '" + MARQUE + "%' ORDER BY b.lg_BON_LIVRAISON_ID");
  const lignes = lignesSql("SELECT d.lg_BON_LIVRAISON_ID, d.lg_BON_LIVRAISON_DETAIL, IFNULL(d.int_QTE_RECUE, 'N'), IFNULL(d.quantite_controle, 'N'), d.checked,"
    + " IFNULL(d.int_QTE_RETURN, 'N'), d.int_PAF, d.int_PRIX_VENTE, d.int_INITSTOCK, f.int_CIP, f.str_DESCRIPTION"
    + " FROM t_bon_livraison_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
    + " WHERE d.lg_BON_LIVRAISON_DETAIL LIKE '" + MARQUE + "%' ORDER BY d.lg_BON_LIVRAISON_DETAIL");
  const n = (v) => (v === 'N' ? null : Number(v));
  const parBon = {};
  entetes.forEach((e) => { parBon[e[0]] = { id: e[0], ref: e[1], grossiste: e[2], ht: Number(e[3]), tva: Number(e[4]), ttc: Number(e[5]), commande: e[6], lignes: [] }; });
  lignes.forEach((l) => parBon[l[0]].lignes.push({ id: l[1], recue: n(l[2]), compte: n(l[3]), coche: l[4] === '1', avoir: n(l[5]), paf: Number(l[6]),
    pv: Number(l[7]), stock: Number(l[8]), cip: l[9], designation: l[10] }));
  Object.values(parBon).forEach((b) => {
    const ls = b.lignes;
    const commence = ls.some((l) => l.coche || (l.compte !== null && l.compte > 0));
    const fait = (l) => l.coche || (l.compte !== null && l.recue !== null && l.compte >= l.recue);
    b.statut = !ls.length || !commence ? 'NON_TRAITE' : (ls.every(fait) ? 'TERMINE' : 'EN_COURS');
    b.montantAvoir = ls.filter((l) => l.avoir !== null).reduce((s, l) => s + l.avoir * l.paf, 0);
    b.ecart = ls.some((l) => l.compte !== null && l.compte > 0 && l.recue !== null && l.compte !== l.recue);
  });
  return parBon;
}
const LIBELLE_STATUT = { TERMINE: 'Terminé', EN_COURS: 'En cours', NON_TRAITE: 'À faire' };
const empreinte = () => q("SELECT CONCAT((SELECT COUNT(*) FROM t_bon_livraison), '/', (SELECT COUNT(*) FROM t_bon_livraison_detail), '/',"
  + " (SELECT MD5(GROUP_CONCAT(CONCAT_WS('|', lg_BON_LIVRAISON_ID, int_MHT, int_HTTC, str_STATUT, dt_UPDATED) ORDER BY lg_BON_LIVRAISON_ID)) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE '" + MARQUE + "%'), '/',"
  + " (SELECT MD5(GROUP_CONCAT(CONCAT_WS('|', lg_BON_LIVRAISON_DETAIL, quantite_controle, checked, int_QTE_RETURN, int_PAF) ORDER BY lg_BON_LIVRAISON_DETAIL)) FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_DETAIL LIKE '" + MARQUE + "%'), '/',"
  + " (SELECT COUNT(*) FROM mvttransaction))");

(async () => {
  const bons = definirBons();
  let grossistes;
  try { grossistes = semer(bons); } catch (e) { console.error('Jeu d\'essai : ' + e.message); try { nettoyer(); } catch (_) { } process.exit(2); }
  const attendu = attenduDepuisLaBase();
  const refs = (statut) => Object.values(attendu).filter(statut).map((b) => b.ref).sort();
  ok('Jeu d\'essai : 25 BL, 3 grossistes, les trois statuts, avec et sans écart, avec avoirs, un BL sans ligne',
    Object.keys(attendu).length === 25 && refs((b) => b.statut === 'TERMINE').length > 0 && refs((b) => b.statut === 'EN_COURS').length > 0
    && refs((b) => b.statut === 'NON_TRAITE').length > 0 && refs((b) => b.ecart).length > 0 && refs((b) => b.montantAvoir > 0).length > 1
    && refs((b) => !b.lignes.length).length === 1 && attendu[MARQUE + '-B00'].lignes.length === 150,
    JSON.stringify(Object.values(attendu).map((b) => b.ref.slice(-2) + ':' + b.statut + (b.ecart ? '/E' : '') + '/' + b.montantAvoir)));
  const avant = empreinte();

  const b = await ENV_E2E.lancer(chromium);
  const p = await b.newPage({ viewport: { width: 1800, height: 950 }, acceptDownloads: true });
  const err = []; p.on('pageerror', (e) => err.push(String(e.message)));
  const ecran = 'etatscontrolemanager';
  /* reponses de la liste, telles que l'ecran les recoit */
  const reponsesListe = [];
  p.on('response', async (r) => {
    if (/\/api\/v1\/etat-control-bon\/list\?/.test(r.url())) {
      const debut = r.request().timing().startTime;
      try { const t = await r.text(); reponsesListe.push({ url: r.url(), taille: Buffer.byteLength(t), json: JSON.parse(t), ms: Math.round(r.request().timing().responseEnd) }); } catch (e) { reponsesListe.push({ url: r.url(), erreur: e.message, debut }); }
    }
  });
  const derniereListe = () => reponsesListe[reponsesListe.length - 1];
  const attendreListe = async (action) => {
    const n = reponsesListe.length;
    const t0 = Date.now();
    await action();
    await p.waitForFunction(([e, k]) => { const g = Ext.ComponentQuery.query(e)[0]; return g && !g.getStore().isLoading(); }, [ecran, n], { timeout: 120000 });
    await p.waitForFunction((k) => window.__e2eNbListes === undefined || true, n);
    for (let i = 0; i < 100 && reponsesListe.length <= n; i++) { await p.waitForTimeout(50); }
    await p.waitForTimeout(150);
    return Date.now() - t0;
  };
  /* ce que montre la grille : enregistrements et texte des cellules rendues */
  const grille = () => p.evaluate((e) => {
    const g = Ext.ComponentQuery.query(e)[0];
    const v = g.getView();
    const cols = g.headerCt.getGridColumns();
    const idx = (re) => cols.findIndex((c) => re.test((c.text || c.header || '').replace(/<[^>]*>/g, '')));
    const ci = { grossiste: idx(/^GROSSISTE$/), ref: idx(/^REF BL$/), ht: idx(/^Montant HT$/), tva: idx(/^Montant TVA$/), ttc: idx(/^Montant TTC$/),
      avoir: idx(/^MTN AVOIR$/), statut: idx(/^CONTROLE$/) };
    return { total: g.getStore().getTotalCount(), lignes: g.getStore().getRange().map((r, i) => {
      const n = v.getNode(i);
      const cell = (k) => (n && ci[k] >= 0 ? (n.querySelectorAll('td')[ci[k]] || {}).textContent || '' : '').trim();
      return { id: r.get('lgBONLIVRAISONID'), ref: r.get('strREFLIVRAISON'), ecran: { grossiste: cell('grossiste'), ref: cell('ref'), ht: cell('ht'),
        tva: cell('tva'), ttc: cell('ttc'), avoir: cell('avoir'), statut: cell('statut') } };
    }), info: (g.down('pagingtoolbar') && g.down('pagingtoolbar').down('#displayItem')) ? g.down('pagingtoolbar').down('#displayItem').el.dom.textContent : '' };
  }, ecran);
  const rapprocher = (titre, vue, rep) => {
    const parId = {}; (rep.json.data || []).forEach((d) => { parId[d.lgBONLIVRAISONID] = d; });
    const ecarts = [];
    vue.lignes.forEach((l) => {
      const a = attendu[l.id]; const r = parId[l.id];
      if (!a || !r) { ecarts.push(l.ref + ' absent de ' + (!a ? 'la base' : 'la réponse')); return; }
      const comp = [['grossiste', a.grossiste, r.fournisseurLibelle, l.ecran.grossiste], ['ref', a.ref, r.strREFLIVRAISON, l.ecran.ref],
        ['HT', a.ht, r.intMHT, chiffres(l.ecran.ht)], ['TVA', a.tva, r.intTVA, chiffres(l.ecran.tva)], ['TTC', a.ttc, r.intHTTC, chiffres(l.ecran.ttc)],
        ['avoir', a.montantAvoir, r.montantAvoir, chiffres(l.ecran.avoir)], ['statut', a.statut, r.checked, l.ecran.statut],
        ['écart', a.ecart, r.avecEcart, a.ecart], ['lignes', a.lignes.length, r.nombreLignes, a.lignes.length]];
      comp.forEach(([k, base, reponse, vu]) => {
        const vuNorm = k === 'statut' ? Object.keys(LIBELLE_STATUT).find((s) => LIBELLE_STATUT[s] === vu) : vu;
        if (String(base) !== String(reponse) || String(base) !== String(vuNorm)) { ecarts.push(l.ref + ' ' + k + ' base=' + base + ' réponse=' + reponse + ' écran=' + vu); }
      });
    });
    ok(titre, vue.lignes.length > 0 && ecarts.length === 0, vue.lignes.length + ' BL ; ' + ecarts.slice(0, 6).join(' ; '));
  };
  const refsEcran = (vue) => vue.lignes.map((l) => l.ref).filter((r) => r.indexOf(MARQUE) === 0).sort();

  try {
    /* sans connexion : la route du detail ne livre rien */
    const anonyme = await fetch(URL_PRESTIGE + '/api/v1/etat-control-bon/' + encodeURIComponent(MARQUE + '-B00') + '/lignes').then(async (r) => ({ s: r.status, t: await r.text() })).catch((e) => ({ s: 0, t: e.message }));
    ok('Sans connexion : la route du détail ne livre aucune ligne', anonyme.s === 401 || anonyme.s === 403 || (anonyme.s === 200 && !/lgBONLIVRAISONDETAIL/.test(anonyme.t)), anonyme.s + ' ' + anonyme.t.slice(0, 80));
    await connexion(p, ENV_E2E.LOGIN, 'e2etest');
    await ouvrirMenu(p, 'GESTION DES COMMANDES', 'Etat de contrôle Achats');
    await p.waitForFunction((e) => Ext.ComponentQuery.query(e).some((g) => g.isVisible(true)) && Ext.getCmp('datedebut'), ecran, { timeout: 60000 });
    await p.waitForFunction((e) => !Ext.ComponentQuery.query(e)[0].getStore().isLoading(), ecran, { timeout: 60000 });

    /* ---------------------------------------------------------------- liste des en-tetes, budget */
    await saisir(p, '#datedebut', DU);
    await saisir(p, '#datefin', AU);
    const msListe = await attendreListe(() => cliquer(p, ecran + ' button[text=Rechercher]'));
    const rep1 = derniereListe();
    const vue1 = await grille();
    ok('Liste : la grille demande les en-têtes seuls (lignes=0)', /[?&]lignes=0(&|$)/.test(rep1.url), rep1.url);
    ok('Liste : aucune ligne de bon ni produit dans la réponse', (rep1.json.data || []).every((d) => d.bonLivraisonDetails === undefined && d.items === undefined),
      (rep1.json.data || []).filter((d) => d.bonLivraisonDetails !== undefined).length + ' BL avec leurs lignes');
    const budget = 1500 * Math.max(1, (rep1.json.data || []).length);
    ok('Budget : au plus 1 500 octets par BL dans la page (gros BL de 150 lignes compris)', rep1.taille <= budget, rep1.taille + ' octets pour ' + (rep1.json.data || []).length + ' BL (budget ' + budget + ')');
    mesure('jeu d\'essai, page 1 (20 BL dont un de 150 lignes), écran', msListe + ' ms, ' + rep1.taille + ' octets');

    /* ---------------------------------------------------------------- rapprochement, pagination */
    ok('Pagination : 25 BL au total, 20 sur la première page', vue1.total === 25 && vue1.lignes.length === 20, vue1.total + ' / ' + vue1.lignes.length);
    rapprocher('Rapprochement page 1 : écran = réponse = base (grossiste, réf., HT, TVA, TTC, avoir, statut, écart, nombre de lignes)', vue1, rep1);
    await attendreListe(async () => {
      const suivant = await p.evaluate((e) => Ext.ComponentQuery.query(e)[0].down('pagingtoolbar').down('#next').getId(), ecran);
      await p.click('#' + suivant);
    });
    const vue2 = await grille(), rep2 = derniereListe();
    ok('Pagination : page 2 = les 5 BL restants, demandés eux aussi sans lignes', vue2.lignes.length === 5 && /[?&]lignes=0(&|$)/.test(rep2.url)
      && new Set(vue1.lignes.concat(vue2.lignes).map((l) => l.id)).size === 25, vue2.lignes.length + ' BL, ' + new Set(vue1.lignes.concat(vue2.lignes).map((l) => l.id)).size + ' distincts sur les deux pages');
    rapprocher('Rapprochement page 2 : écran = réponse = base', vue2, rep2);
    await attendreListe(async () => {
      const premier = await p.evaluate((e) => Ext.ComponentQuery.query(e)[0].down('pagingtoolbar').down('#first').getId(), ecran);
      await p.click('#' + premier);
    });

    /* ---------------------------------------------------------------- filtres */
    const filtre = async (statut, ecart) => {
      if (statut) { await attendreListe(() => choisir(p, '#filtreStatutControle', statut)); }
      if (ecart) { await attendreListe(() => choisir(p, '#filtreEcartControle', ecart)); }
      return grille();
    };
    let v = await filtre('Contrôlés', null);
    ok('Filtre « Contrôlés » : les BL terminés, et eux seuls', JSON.stringify(refsEcran(v)) === JSON.stringify(refs((x) => x.statut === 'TERMINE')), refsEcran(v).join(' '));
    rapprocher('Filtre « Contrôlés » : écran = réponse = base', v, derniereListe());
    v = await filtre(null, 'Avec écarts');
    ok('Filtres « Contrôlés » + « Avec écarts »', JSON.stringify(refsEcran(v)) === JSON.stringify(refs((x) => x.statut === 'TERMINE' && x.ecart)), refsEcran(v).join(' '));
    v = await filtre('Non contrôlés', null);
    ok('Filtres « Non contrôlés » + « Avec écarts »', JSON.stringify(refsEcran(v)) === JSON.stringify(refs((x) => x.statut !== 'TERMINE' && x.ecart)), refsEcran(v).join(' '));
    v = await filtre('Contrôle : tous', 'Sans écart');
    ok('Filtre « Sans écart » (20 premiers, total juste)', v.total === refs((x) => !x.ecart).length
      && refsEcran(v).every((r) => refs((x) => !x.ecart).indexOf(r) >= 0), v.total + ' / ' + refs((x) => !x.ecart).length);
    rapprocher('Filtre « Sans écart » : écran = réponse = base', v, derniereListe());
    v = await filtre(null, 'Écarts : tous');
    ok('Filtres remis à « tous » : 25 BL', v.total === 25, v.total);

    /* ---------------------------------------------------------------- detail a la demande */
    const bouton = async (nom) => {
      const id = await p.evaluate(([e, n]) => { const b = Ext.ComponentQuery.query(e)[0].down('pagingtoolbar').down('#' + n); return b.isDisabled() ? null : b.getId(); }, [ecran, nom]);
      if (id) { await attendreListe(() => p.click('#' + id)); }
      return !!id;
    };
    /* page de la grille qui porte le BL : premiere page, puis « page suivante » */
    const allerA = async (id) => {
      if ((await grille()).lignes.some((l) => l.id === id)) { return; }
      await bouton('first');
      while (!(await grille()).lignes.some((l) => l.id === id)) {
        if (!(await bouton('next'))) { return; }
      }
    };
    const ouvrirDetail = async (id) => {
      await allerA(id);
      const vue = await grille();
      const rang = vue.lignes.findIndex((l) => l.id === id);
      if (rang < 0) { throw new Error('BL absent de la page : ' + id); }
      const vueId = await p.evaluate((e) => Ext.ComponentQuery.query(e)[0].getView().getId(), ecran);
      const icone = p.locator('#' + vueId + ' .x-grid-row').nth(rang).locator('img[data-qtip^="Voir le detail du controle"]');
      /* ancien code : pas de route, les lignes venaient de la liste ; l'attente s'arrete alors au bout de 15 s */
      const reponse = p.waitForResponse((r) => r.url().indexOf('/api/v1/etat-control-bon/') >= 0 && /\/lignes(\?|$)/.test(r.url()), { timeout: 15000 }).catch(() => null);
      const t0 = Date.now();
      await icone.click();
      const fen = p.locator('.x-window').filter({ visible: true, hasText: 'DETAILS' }).last();
      await fen.waitFor({ timeout: 15000 });
      const r = await reponse;
      /* fin du chargement : le masque « Chargement des lignes du bon » est retire */
      await p.waitForFunction(() => { const w = Ext.ComponentQuery.query('window').filter((x) => x.isVisible() && /DETAILS/.test(x.title || ''))[0];
        return w && !w.el.isMasked(); }, null, { timeout: 60000 }).catch(() => {});
      const ms = Date.now() - t0;
      const lu = await p.evaluate(() => {
        const w = Ext.ComponentQuery.query('window').filter((x) => x.isVisible() && /DETAILS/.test(x.title || ''))[0];
        const g = w.down('grid');
        const lignes = g.getStore().getRange().map((rec, i) => {
          const n = g.getView().getNode(i);
          return { cip: rec.get('cip'), designation: rec.get('designation'), prixAchat: rec.get('prixAchat'), prixVente: rec.get('prixVente'), stock: rec.get('stock'),
            comptage: rec.get('comptage'), ecart: rec.get('ecart'), checked: rec.get('checked'),
            cellules: n ? Array.from(n.querySelectorAll('td')).map((td) => td.textContent.trim()) : null };
        });
        return { titre: w.title, lignes, lignesRendues: g.getView().getNodes().length };
      });
      return { ms, lu, taille: r ? Buffer.byteLength(await r.text()) : -1, statut: r ? r.status() : 0, url: r ? r.url() : '' };
    };
    const fermerDetail = async () => {
      const fen = p.locator('.x-window').filter({ visible: true, hasText: 'DETAILS' }).last();
      await fen.locator('.x-tool-close').first().click();
      await fen.waitFor({ state: 'hidden', timeout: 10000 }).catch(() => {});
    };
    const rapprocherDetail = (titre, bon, d) => {
      const ecarts = [];
      if (d.lu.lignes.length !== bon.lignes.length) { ecarts.push(d.lu.lignes.length + ' lignes affichées / ' + bon.lignes.length + ' en base'); }
      bon.lignes.forEach((l, i) => {
        const e = d.lu.lignes[i] || {};
        const comptage = l.compte || 0;
        const attenduLigne = { cip: l.cip, designation: l.designation, prixAchat: l.paf, prixVente: l.pv, stock: l.stock, comptage, ecart: comptage - l.stock, checked: l.coche };
        Object.keys(attenduLigne).forEach((k) => { if (String(attenduLigne[k]).trim() !== String(e[k]).trim()) { ecarts.push('ligne ' + (i + 1) + ' ' + k + ' base=' + attenduLigne[k] + ' écran=' + e[k]); } });
        const c = e.cellules || [];
        /* colonnes : n°, CIP, designation, prix achat, prix vente, stock, comptage, ecart, controle */
        if (c[1] !== String(l.cip).trim() || c[2] !== l.designation.trim() || chiffres(c[3]) !== String(l.paf) || chiffres(c[4]) !== String(l.pv)
          || c[5] !== String(l.stock) || c[6] !== String(comptage) || c[7] !== String(comptage - l.stock)) {
          ecarts.push('ligne ' + (i + 1) + ' cellules ' + JSON.stringify(c.slice(1, 8)));
        }
      });
      ok(titre, ecarts.length === 0, bon.lignes.length + ' lignes ; ' + ecarts.slice(0, 5).join(' ; '));
    };

    const gros = attendu[MARQUE + '-B00'];
    const d0 = await ouvrirDetail(gros.id);
    ok('Détail à la demande : l\'icône ouvre la fenêtre et charge les lignes du seul bon choisi', d0.statut === 200 && d0.url.indexOf(encodeURIComponent(gros.id)) >= 0
      && /DETAILS/.test(d0.lu.titre) && d0.lu.titre.indexOf(gros.ref) >= 0 && d0.lu.titre.indexOf(gros.grossiste) >= 0, d0.statut + ' ' + d0.url + ' ' + d0.lu.titre);
    rapprocherDetail('Détail du gros BL (150 lignes) : écran = base, ligne par ligne (CIP, désignation, prix, stock, comptage, écart, contrôlé)', gros, d0);
    ok('Détail du gros BL : toutes les lignes sont rendues', d0.lu.lignesRendues === 150, d0.lu.lignesRendues);
    mesure('détail à la demande, BL de 150 lignes (jeu d\'essai)', d0.ms + ' ms, ' + d0.taille + ' octets');
    /* les lignes de la route = celles que portait l'ancienne reponse complete (lecture, pour comparaison) */
    const complet = await p.evaluate(async (u) => (await fetch(u)).json(), '../api/v1/etat-control-bon/list?start=0&limit=50&dtStart=2031-01-13&dtEnd=2031-01-14&dateType=LIVRAISON&lignes=1');
    const lignesRoute = await p.evaluate(async (u) => { try { return await (await fetch(u)).json(); } catch (e) { return {}; } }, '../api/v1/etat-control-bon/' + encodeURIComponent(gros.id) + '/lignes');
    const ancien = ((complet.data || []).find((x) => x.lgBONLIVRAISONID === gros.id) || {}).bonLivraisonDetails || [];
    const champs = ['lgBONLIVRAISONDETAIL', 'intQTECMDE', 'intQTERECUE', 'intQTEUG', 'intQTERETURN', 'intPAF', 'intPAREEL', 'intPRIXVENTE', 'intPRIXREFERENCE', 'intINITSTOCK', 'prixUni', 'quantiteControle', 'checked', 'lgZONEGEONom'];
    const diff = [];
    ancien.forEach((a, i) => {
      const n = (lignesRoute.data || [])[i] || {};
      champs.forEach((k) => { if (String(a[k] === undefined ? null : a[k]) !== String(n[k] === undefined ? null : n[k])) { diff.push(i + ':' + k + ' ' + a[k] + '≠' + n[k]); } });
      ['intCIP', 'strDESCRIPTION', 'strNAME'].forEach((k) => { if (String((a.produit || {})[k]) !== String((n.produit || {})[k])) { diff.push(i + ':produit.' + k); } });
    });
    ok('Lignes à la demande = lignes de l\'ancienne réponse complète, dans le même ordre (14 champs + produit)', ancien.length === 150 && (lignesRoute.data || []).length === 150 && diff.length === 0, ancien.length + ' / ' + (lignesRoute.data || []).length + ' ; ' + diff.slice(0, 5).join(' ; '));
    await fermerDetail();

    const b1 = attendu[MARQUE + '-B01'];
    const d1 = await ouvrirDetail(b1.id);
    rapprocherDetail('Détail d\'un BL contrôlé avec un écart (comptage 7 pour 10 reçus)', b1, d1);
    await fermerDetail();
    const b2 = attendu[MARQUE + '-B02'];
    const d2 = await ouvrirDetail(b2.id);
    rapprocherDetail('Détail d\'un BL en cours (comptages absents, nuls, en écart)', b2, d2);
    await fermerDetail();
    const vide = attendu[MARQUE + '-B04'];
    const d4 = await ouvrirDetail(vide.id);
    ok('Détail d\'un BL sans ligne : fenêtre vide, sans erreur', d4.statut === 200 && d4.lu.lignes.length === 0 && err.length === 0, d4.lu.lignes.length + ' ' + err.join(' | '));
    await fermerDetail();
    await bouton('first');

    /* ---------------------------------------------------------------- impression et export */
    /* le PDF est lu la ou le serveur l'ecrit (sur le poste, le dossier des editions est commun aux domaines Payara) */
    const pdfPage = b.contexts()[0].waitForEvent('page', { timeout: 120000 }).catch(() => null);
    const repPrint = p.waitForResponse((r) => /\/api\/v1\/etat-control-bon\/print\?/.test(r.url()), { timeout: 120000 }).catch(() => null);
    await cliquer(p, ecran + ' button[text=Imprimer]');
    const rp = await repPrint;
    const onglet = await pdfPage;
    let textePdf = '';
    const msgPdf = rp ? (JSON.parse(await rp.text()).msg || '') : '';
    const fichierPdf = require('../support/editions').fichierEdition(msgPdf);
    ok('Impression : le bouton ouvre le PDF dans un onglet', !!onglet && /\.pdf$/i.test(msgPdf) && onglet.url().indexOf(msgPdf.split('/').pop()) >= 0 && fs.existsSync(fichierPdf), msgPdf + ' ' + fichierPdf);
    if (fs.existsSync(fichierPdf)) {
      try { textePdf = execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', fichierPdf, '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); } catch (e) { textePdf = ''; }
      fs.unlinkSync(fichierPdf);
    }
    if (onglet) { await onglet.close(); }
    const lignesPdf = textePdf.split('\n');
    const ecartsPdf = [];
    Object.values(attendu).forEach((a) => {
      const l = lignesPdf.find((x) => x.indexOf(a.ref) >= 0);
      if (!l) { ecartsPdf.push(a.ref + ' absent'); return; }
      /* colonnes separees par plusieurs espaces ; un seul espace separe les milliers */
      const nombres = l.split(/\s{2,}/).map(chiffres);
      if (l.indexOf(LIBELLE_STATUT[a.statut]) < 0) { ecartsPdf.push(a.ref + ' statut'); }
      if (l.indexOf(a.ecart ? 'Avec écart' : 'Sans écart') < 0) { ecartsPdf.push(a.ref + ' écart'); }
      if (nombres.indexOf(String(a.ttc)) < 0 || nombres.indexOf(String(a.montantAvoir)) < 0) { ecartsPdf.push(a.ref + ' TTC/avoir ' + nombres.join(',')); }
    });
    ok('Impression : les 25 BL, avec statut, écart, TTC et avoir = base', textePdf.length > 0 && ecartsPdf.length === 0, ecartsPdf.slice(0, 6).join(' ; ') || (textePdf.length + ' caractères'));

    const telechargement = p.waitForEvent('download', { timeout: 120000 }).catch(() => null);
    await cliquer(p, ecran + ' button[text=Excel]');
    const dl = await telechargement;
    let cellules = [];
    if (dl) {
      const f = path.join(TMP, 'controle-bons-' + Date.now() + '.xls');
      await dl.saveAs(f);
      /* classeur .xls (format Excel 97) */
      const sortie = execFileSync('python3', ['-c', "import xlrd,sys,json; ws=xlrd.open_workbook(sys.argv[1]).sheet_by_index(0); print(json.dumps([ws.row_values(i) for i in range(ws.nrows)], default=str))", f], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
      cellules = JSON.parse(sortie);
      fs.unlinkSync(f);
    }
    const ecartsXls = [];
    Object.values(attendu).forEach((a) => {
      const r = cellules.find((x) => x.some((c) => c === a.ref));
      /* colonnes : Grossiste, No Commande, Réf Bon, Montant Ht, Montant Tva, Montant Ttc, Date livraison, Date d'entrée, Montant avoir, Opérateur */
      if (!r) { ecartsXls.push(a.ref + ' absent'); return; }
      if (r[0] !== a.grossiste || String(r[1]) !== a.commande || Number(r[3]) !== a.ht || Number(r[4]) !== a.tva || Number(r[5]) !== a.ttc || Number(r[8]) !== a.montantAvoir) {
        ecartsXls.push(a.ref + ' ' + JSON.stringify(r));
      }
    });
    ok('Export Excel : les 25 BL, grossiste, commande, HT, TVA, TTC et avoir = base', cellules.length > 0 && ecartsXls.length === 0, ecartsXls.slice(0, 4).join(' ; ') || cellules.length + ' lignes');

    /* ---------------------------------------------------------------- donnees reelles : leger = complet, mesures */
    const comparer = async (titre, du, au) => {
      const lire = (lignes) => p.evaluate(async (u) => { const t0 = performance.now(); const r = await fetch(u); const t = await r.text(); return { ms: Math.round(performance.now() - t0), taille: t.length, json: JSON.parse(t) }; },
        '../api/v1/etat-control-bon/list?start=0&limit=2000&dtStart=' + du + '&dtEnd=' + au + '&dateType=LIVRAISON&lignes=' + lignes);
      const complet = await lire(1); const leger = await lire(0);
      const parId = {}; (complet.json.data || []).forEach((x) => { parId[x.lgBONLIVRAISONID] = x; });
      const diffs = [];
      (leger.json.data || []).forEach((l) => {
        const c = parId[l.lgBONLIVRAISONID];
        if (!c) { diffs.push(l.strREFLIVRAISON + ' absent'); return; }
        const d = c.bonLivraisonDetails || [];
        const ecart = d.some((x) => x.quantiteControle > 0 && x.intQTERECUE !== null && x.intQTERECUE !== undefined && x.quantiteControle !== x.intQTERECUE);
        Object.keys(c).filter((k) => ['bonLivraisonDetails', 'items', 'avecEcart', 'nombreLignes'].indexOf(k) < 0).forEach((k) => {
          if (JSON.stringify(c[k]) !== JSON.stringify(l[k])) { diffs.push(l.strREFLIVRAISON + ' ' + k + ' ' + JSON.stringify(c[k]) + '≠' + JSON.stringify(l[k])); }
        });
        if (Boolean(l.avecEcart) !== ecart) { diffs.push(l.strREFLIVRAISON + ' écart'); }
        if (l.nombreLignes !== d.length) { diffs.push(l.strREFLIVRAISON + ' nombre de lignes ' + l.nombreLignes + '≠' + d.length); }
      });
      const nbLignes = (leger.json.data || []).reduce((s, x) => s + (x.nombreLignes || 0), 0);
      /* pages de 20, comme l'ecran : chaque BL une fois et une seule (BL du meme jour compris) */
      const vus = [];
      for (let debut = 0; debut < (leger.json.total || 0); debut += 20) {
        const page = await p.evaluate(async (u) => (await fetch(u)).json(), '../api/v1/etat-control-bon/list?start=' + debut + '&limit=20&dtStart=' + du + '&dtEnd=' + au + '&dateType=LIVRAISON&lignes=0');
        (page.data || []).forEach((x) => vus.push(x.lgBONLIVRAISONID));
      }
      ok(titre + ' : pages de 20, chaque BL une fois et une seule', vus.length === leger.json.total && new Set(vus).size === vus.length
        && vus.every((id) => parId[id]), vus.length + ' lus, ' + new Set(vus).size + ' distincts, ' + leger.json.total + ' au total');
      ok(titre + ' : liste légère = liste complète (en-têtes, statut, avoir, écart, nombre de lignes)', leger.json.total === complet.json.total
        && (leger.json.data || []).length === (complet.json.data || []).length && (leger.json.data || []).length > 0 && diffs.length === 0,
        (leger.json.data || []).length + ' BL, ' + nbLignes + ' lignes ; ' + diffs.slice(0, 5).join(' ; '));
      mesure(titre + ' (' + (leger.json.data || []).length + ' BL, ' + nbLignes + ' lignes), toute la période d\'un coup', 'avant (lignes=1) ' + complet.ms + ' ms / ' + complet.taille + ' octets ; après (lignes=0) ' + leger.ms + ' ms / ' + leger.taille + ' octets');
      return leger.json.data || [];
    };
    const reelsJour = await comparer('Copie réelle, 21/12/2023 (BL de 445 lignes)', '2023-12-21', '2023-12-21');
    const reelsPeriode = await comparer('Copie réelle, 12 au 23/10/2026', '2026-10-12', '2026-10-23');

    /* mesures par l'ecran : page de 20 et detail du plus gros BL, sur un jour et sur une periode */
    const mesurerEcran = async (titre, du, au, reels) => {
      await saisir(p, '#datedebut', du); await saisir(p, '#datefin', au);
      const ms = await attendreListe(() => cliquer(p, ecran + ' button[text=Rechercher]'));
      const rep = derniereListe();
      const vue = await grille();
      const plusGros = vue.lignes.map((l) => reels.find((x) => x.lgBONLIVRAISONID === l.id)).filter(Boolean).sort((x, y) => y.nombreLignes - x.nombreLignes)[0];
      let det = { ms: -1, taille: -1, lu: { lignes: [] } };
      if (plusGros) { det = await ouvrirDetail(plusGros.lgBONLIVRAISONID); await fermerDetail(); }
      const enBase = plusGros ? Number(q("SELECT COUNT(*) FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_ID = '" + plusGros.lgBONLIVRAISONID + "'")) : -1;
      ok(titre + ' : page affichée, détail du plus gros BL complet', vue.lignes.length > 0 && plusGros && det.lu.lignes.length === enBase && enBase === plusGros.nombreLignes,
        vue.lignes.length + ' BL ; ' + (plusGros ? plusGros.strREFLIVRAISON + ' ' + det.lu.lignes.length + '/' + enBase : ''));
      mesure(titre + ', écran, page de ' + vue.lignes.length + ' BL', ms + ' ms, ' + rep.taille + ' octets');
      mesure(titre + ', détail à la demande du BL ' + (plusGros ? plusGros.strREFLIVRAISON + ' (' + plusGros.nombreLignes + ' lignes)' : '?'), det.ms + ' ms, ' + det.taille + ' octets');
    };
    await mesurerEcran('Copie réelle, 21/12/2023', '21/12/2023', '21/12/2023', reelsJour);
    await mesurerEcran('Copie réelle, 12 au 23/10/2026', '12/10/2026', '23/10/2026', reelsPeriode);

    ok('Aucune erreur JavaScript', err.length === 0, err.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack);
  } finally {
    await b.close();
    const apres = empreinte();
    ok('Bilan avant / après : l\'écran n\'a rien écrit (BL, lignes, mouvements)', avant === apres, avant + ' → ' + apres);
    nettoyer();
    ok('Jeu d\'essai retiré', q("SELECT (SELECT COUNT(*) FROM t_bon_livraison WHERE lg_BON_LIVRAISON_ID LIKE '" + MARQUE + "%') + (SELECT COUNT(*) FROM t_bon_livraison_detail WHERE lg_BON_LIVRAISON_DETAIL LIKE '" + MARQUE + "%') + (SELECT COUNT(*) FROM t_order WHERE lg_ORDER_ID LIKE '" + MARQUE + "%')") === '0');
  }
  console.log('\n' + mesures.join('\n'));
  const ko = res.filter((x) => !x.c).length;
  console.log('\n' + (res.length - ko) + '/' + res.length + (ko ? ' ECHEC' : ' OK'));
  process.exit(ko ? 1 : 0);
})();
