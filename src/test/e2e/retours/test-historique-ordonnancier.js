/* RETOUR DU 05/11, LOT C : menu « Historique » (SERVICE CLIENT, a cote de l'Ordonnancier) qui retrace les ventes des
 * produits concernes, « sensibles » ou de l'ordonnancier (soumis a ordonnance avec code tableau).
 * Reponses du 05/11 : colonnes date, numero de ticket, produit, quantite, client, prescripteur, vendeur ; filtres
 * periode, produit, categorie (sensible / ordonnancier) ; impression et export Excel.
 *
 * Jeu d'essai propre au test : trois articles (S sensible, O ordonnancier tableau A, N ordinaire, drapeaux remis a la
 * fin), un client, un medecin, des ventes closes du jour :
 *   V0 : S x2 + N x1, avec medecin   -> la ligne S, jamais la ligne N
 *   V1 : O x3, avec medecin          -> la ligne O
 *   V2 : S x1, SANS medecin          -> la ligne S, prescripteur vide (l'historique n'est pas le registre)
 *   V3 : S x5, vente annulee         -> absente
 * Par le vrai chemin : menu, filtres tapes et choisis, Rechercher, grille lue telle qu'affichee ; boutons Excel et
 * Imprimer de l'ecran. Tout est retire a la fin.
 * Lancement seul : node src/test/e2e/retours/test-historique-ordonnancier.js
 */
const { chromium } = require('playwright-core');
const C = require('../ordonnancier/commun');
const { q, ok } = C;

const MARQUE = 'E2EHISTO';
const CLIENT = MARQUE + '-CLI';
const MEDECIN = MARQUE + '-MED';
const NOM_CLIENT = 'ZZHISTO CLIENT';
const NOM_MEDECIN = 'DOCTEUR ESSAI HISTORIQUE';

/* trois articles simples, distincts, ni ordonnancier ni sensible au depart */
const articles = q("SELECT CONCAT_WS('~', f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME, IFNULL(f.is_scheduled, 0), IFNULL(f.is_sensible, 0), IFNULL(f.int_T, ''))"
  + " FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.int_CIP REGEXP '^[0-9]{7}$' AND IFNULL(f.is_scheduled, 0) = 0 AND IFNULL(f.is_sensible, 0) = 0"
  + " AND IFNULL(f.int_T, '') = '' AND (SELECT COUNT(*) FROM t_famille x WHERE x.int_CIP = f.int_CIP) = 1 ORDER BY f.int_CIP DESC LIMIT 3")
  .split(/\r?\n/).filter(Boolean).map((l) => { const [id, cip, nom, scheduled, sensible, intT] = l.split('~'); return { id, cip, nom, scheduled, sensible, intT }; });
const [S, O, N] = articles;
const VENTES = [
  { lignes: [[S, 2], [N, 1]], medecin: true, annulee: false },
  { lignes: [[O, 3]], medecin: true, annulee: false },
  { lignes: [[S, 1]], medecin: false, annulee: false },
  { lignes: [[S, 5]], medecin: true, annulee: true }
];

function purger() {
  q("DELETE FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "%';"
    + " DELETE FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "%';"
    + " DELETE FROM t_client WHERE lg_CLIENT_ID = '" + CLIENT + "'; DELETE FROM medecin WHERE id = '" + MEDECIN + "'");
}
function remettre() {
  articles.forEach((a) => q("UPDATE t_famille SET is_scheduled = " + a.scheduled + ", is_sensible = " + a.sensible + ", int_T = "
    + (a.intT === '' ? 'NULL' : "'" + a.intT + "'") + " WHERE lg_FAMILLE_ID = '" + a.id + "'"));
}

let USER = '';
function semer() {
  purger();
  USER = q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + C.ENV_E2E.LOGIN + "'");
  q("UPDATE t_famille SET is_sensible = 1 WHERE lg_FAMILLE_ID = '" + S.id + "';"
    + " UPDATE t_famille SET is_scheduled = 1, int_T = 'A' WHERE lg_FAMILLE_ID = '" + O.id + "'");
  q("INSERT INTO medecin (id, num_ordre, nom, commentaire, created_at) VALUES ('" + MEDECIN + "', 'E2E-9106', '" + NOM_MEDECIN + "', 'recette e2e', NOW())");
  q("INSERT INTO t_client (lg_CLIENT_ID, str_CODE_INTERNE, str_FIRST_NAME, str_LAST_NAME, lg_TYPE_CLIENT_ID, dt_CREATED, dt_UPDATED, str_STATUT)"
    + " VALUES ('" + CLIENT + "', '" + CLIENT + "', 'ZZHISTO', 'CLIENT', '6', NOW(), NOW(), 'enable')");
  VENTES.forEach((v, i) => {
    v.id = MARQUE + '-V' + i; v.ref = MARQUE + '-R' + i; v.refTicket = '9' + String(800 + i);
    q("INSERT INTO t_preenregistrement (lg_PREENREGISTREMENT_ID, str_REF, str_REF_TICKET, int_PRICE, int_PRICE_REMISE, str_STATUT, dt_CREATED,"
      + " dt_UPDATED, lg_TYPE_VENTE_ID, lg_USER_VENDEUR_ID, lg_USER_CAISSIER_ID, lg_USER_ID, lg_CLIENT_ID, medecin_id, b_IS_CANCEL, b_IS_AVOIR,"
      + " b_WITHOUT_BON, int_PRICE_OTHER, int_ACCOUNT, int_REMISE_PARA, montantTva, checked, copy, imported, margeug, montantttcug,"
      + " montantnetug, int_SENDTOSUGGESTION) VALUES ('" + v.id + "', '" + v.ref + "', '" + v.refTicket + "', 1000, 0, 'is_Closed',"
      + " NOW() - INTERVAL " + (10 - i) + " MINUTE, NOW() - INTERVAL " + (10 - i) + " MINUTE, 1, '" + USER + "', '" + USER + "', '" + USER + "',"
      + " '" + CLIENT + "', " + (v.medecin ? "'" + MEDECIN + "'" : 'NULL') + ", " + (v.annulee ? 1 : 0) + ", 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0)");
    v.lignes.forEach(([a, qte], j) => q("INSERT INTO t_preenregistrement_detail (lg_PREENREGISTREMENT_DETAIL_ID, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID,"
      + " int_QUANTITY, int_QUANTITY_SERVED, int_AVOIR, int_AVOIR_SERVED, int_PRICE, int_PRICE_UNITAIR, int_NUMBER, dt_CREATED, dt_UPDATED,"
      + " int_PRICE_REMISE, b_IS_AVOIR, int_FREE_PACK_NUMBER, int_PRICE_OTHER, int_PRICE_DETAIL_OTHER, int_UG, bool_ACCOUNT, montantTva, valeurTva,"
      + " prixAchat, montanttvaug, int_AVOIR_INITIAL) VALUES ('" + v.id + "-D" + j + "', '" + v.id + "', '" + a.id + "', " + qte + ", 0, 0, 0,"
      + " " + (500 * qte) + ", 500, 0, NOW(), NOW(), 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0)"));
  });
}

const ECRAN = 'historiqueordonnancier';
/* lignes affichees (textes des colonnes visibles), en-tetes decodes */
const grille = (p) => p.evaluate((x) => {
  const g = Ext.ComponentQuery.query(x + ' gridpanel')[0];
  const cols = g.headerCt.getGridColumns().filter((c) => c.isVisible() && !c.isCheckerHd);
  const dec = (h) => { const t = document.createElement('textarea'); t.innerHTML = String(h || '').replace(/<[^>]+>/g, ''); return t.value.trim(); };
  const v = g.getView();
  return { entetes: cols.map((c) => dec(c.text)),
    lignes: g.getStore().getRange().map((r) => cols.map((c) => { const n = v.getCell(r, c); return n ? n.dom.innerText.trim() : ''; })) };
}, ECRAN);

async function rechercher(p, produit, categorie) {
  const champ = await p.evaluate((x) => Ext.ComponentQuery.query(x + ' #hoProduit')[0].inputEl.dom.id, ECRAN);
  await p.locator('#' + champ).click();
  await p.keyboard.press('Control+A');
  await p.keyboard.press('Delete');
  if (produit) { await p.keyboard.type(produit, { delay: 15 }); }
  /* categorie : la liste deroulante, ouverte et choisie au clic */
  const combo = await p.evaluate((x) => Ext.ComponentQuery.query(x + ' #hoCategorie')[0].getId(), ECRAN);
  await p.locator('#' + combo + ' .x-form-trigger').first().click();
  await p.locator('.x-boundlist-item').filter({ visible: true, hasText: categorie }).first().click();
  const rep = p.waitForResponse((r) => /historique-ordonnancier\?/.test(r.url()), { timeout: 60000 });
  await C.vues.cliquer(p, ECRAN + ' #hoRechercher');
  await rep;
  await p.waitForTimeout(500);
}

(async () => {
  ok('Jeu d\'essai : trois articles distincts', articles.length === 3, articles.map((a) => a.cip).join(','));
  const paramAvant = C.parametreOrdonnancier('1');
  const voirRef = q("SELECT IFNULL(MAX(str_VALUE), '0') FROM t_parameters WHERE str_KEY = 'KEY_SHOW_NUMERO_TICKET'") === '1';
  semer();
  const b = await C.ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 }, acceptDownloads: true });
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    await C.vues.connexion(p, C.ENV_E2E.LOGIN, 'e2etest');
    const menu = q("SELECT CONCAT_WS('|', m.str_VALUE, s.str_DESCRIPTION) FROM t_sous_menu s JOIN t_menu m ON m.lg_MENU_ID = s.lg_MENU_ID"
      + " WHERE s.str_COMPOSANT = '" + ECRAN + "' AND s.str_Status = 'enable'");
    ok('Menu « Historique » sous SERVICE CLIENT', /^SERVICE CLIENT\|Historique/.test(menu), menu);
    await C.ouvrirEcran(p, ECRAN);
    await C.visible(p, ECRAN + ' gridpanel');
    await p.waitForTimeout(800);

    let g = await grille(p);
    ok('Colonnes : Date, Ticket, Produit, Qté, Client, Prescripteur, Vendeur',
      g.entetes.join('|') === 'Date|Ticket|Produit|Qté|Client|Prescripteur|Vendeur', g.entetes.join('|'));
    const filtres = await p.evaluate((x) => ['hoDebut', 'hoFin', 'hoProduit', 'hoCategorie', 'hoRechercher', 'hoExcel', 'hoImprimer']
      .filter((i) => !Ext.ComponentQuery.query(x + ' #' + i).some((c) => c.isVisible(true))), ECRAN);
    ok('Filtres période, produit, catégorie ; boutons Excel et Imprimer', filtres.length === 0, 'absents : ' + filtres.join(','));

    /* produit S, toutes categories */
    await rechercher(p, S.cip, 'Tous');
    g = await grille(p);
    const ticket = (v) => voirRef ? v.ref : v.refTicket;
    const iT = g.entetes.indexOf('Ticket'), iP = g.entetes.indexOf('Produit'), iQ = g.entetes.indexOf('Qté'),
      iC = g.entetes.indexOf('Client'), iM = g.entetes.indexOf('Prescripteur'), iV = g.entetes.indexOf('Vendeur'), iD = g.entetes.indexOf('Date');
    const tickets = g.lignes.map((l) => l[iT]).sort().join(',');
    ok('Produit sensible cherché par son CIP : ses deux ventes, pas la vente annulée', tickets === [ticket(VENTES[0]), ticket(VENTES[2])].sort().join(','), JSON.stringify(g.lignes));
    const l0 = g.lignes.find((l) => l[iT] === ticket(VENTES[0])) || [], l2 = g.lignes.find((l) => l[iT] === ticket(VENTES[2])) || [];
    ok('Ligne : produit, quantité, client, prescripteur', l0[iP] && l0[iP].includes(S.nom.trim().slice(0, 10)) && l0[iQ] === '2'
      && l0[iC].toUpperCase().includes(NOM_CLIENT) && l0[iM].toUpperCase().includes(NOM_MEDECIN), JSON.stringify(l0));
    ok('Date et heure de la vente', /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(l0[iD] || ''), l0[iD]);
    ok('Vendeur renseigné', !!(l0[iV] || '').trim(), l0[iV]);
    ok('Vente sans médecin : présente, prescripteur vide', l2[iQ] === '1' && l2[iM] === '', JSON.stringify(l2));

    /* l'article ordinaire n'apparait jamais */
    await rechercher(p, N.cip, 'Tous');
    g = await grille(p);
    ok('Produit ordinaire de la même vente : jamais dans l\'historique', g.lignes.length === 0, JSON.stringify(g.lignes));

    /* categories, sur les tickets d'essai */
    const nosTickets = (lignes) => lignes.map((l) => l[iT]).filter((t) => VENTES.some((v) => ticket(v) === t)).sort().join(',');
    await rechercher(p, '', 'Ordonnancier');
    g = await grille(p);
    ok('Catégorie « Ordonnancier » : la vente du produit tableau A, pas les sensibles', nosTickets(g.lignes) === ticket(VENTES[1]), nosTickets(g.lignes));
    await rechercher(p, '', 'Sensibles');
    g = await grille(p);
    ok('Catégorie « Sensibles » : les ventes du produit sensible', nosTickets(g.lignes) === [ticket(VENTES[0]), ticket(VENTES[2])].sort().join(','), nosTickets(g.lignes));

    /* Excel puis Imprimer : boutons de l'ecran, memes filtres */
    await rechercher(p, S.cip, 'Tous');
    const dl = p.waitForEvent('download', { timeout: 60000 }).catch(() => null);
    await C.vues.cliquer(p, ECRAN + ' #hoExcel');
    const fichier = await dl;
    let contenu = '';
    if (fichier) {
      const zip = require('fs').readFileSync(await fichier.path());
      contenu = require('child_process').execFileSync('python', ['-c',
        'import sys,zipfile,io;z=zipfile.ZipFile(io.BytesIO(sys.stdin.buffer.read()));print(" ".join(z.read(n).decode("utf8","ignore") for n in z.namelist() if n.startswith("xl/")))'],
      { input: zip, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    }
    ok('Excel : les lignes filtrées, avec le prescripteur', contenu.includes(ticket(VENTES[0])) && contenu.includes(NOM_MEDECIN) && !contenu.includes(ticket(VENTES[1])),
      fichier ? contenu.length + ' caractères' : 'aucun téléchargement');
    /* l'impression s'ouvre dans un nouvel onglet : la reponse est attendue sur tout le contexte */
    const pdf = ctx.waitForEvent('response', { predicate: (r) => /historique-ordonnancier\/pdf\?/.test(r.url()), timeout: 60000 }).catch(() => null);
    await C.vues.cliquer(p, ECRAN + ' #hoImprimer');
    const rp = await pdf;
    /* le corps d'un PDF ouvert dans la visionneuse n'est pas lisible : type et taille annonces par le serveur */
    const entetes = rp ? await rp.allHeaders().catch(() => ({})) : {};
    ok('Imprimer : un PDF de la liste filtrée', rp && rp.status() === 200 && /application\/pdf/.test(entetes['content-type'] || '')
      && Number(entetes['content-length'] || 1000) > 800, rp ? rp.status() + ' ' + JSON.stringify(entetes).slice(0, 200) : 'pas de réponse');
    ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + erreurs.join(' | '));
  } finally {
    await b.close();
    purger();
    remettre();
    C.remettreParametre(paramAvant);
    ok('Jeu d\'essai retiré, articles remis', q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID LIKE '" + MARQUE + "%'") === '0'
      && articles.every((a) => q("SELECT CONCAT_WS('~', IFNULL(is_scheduled, 0), IFNULL(is_sensible, 0), IFNULL(int_T, '')) FROM t_famille WHERE lg_FAMILLE_ID = '" + a.id + "'")
        === [a.scheduled, a.sensible, a.intT].join('~')));
    process.exit(C.bilan() ? 1 : 0);
  }
})();
