/* CAS 3 (ORDONNANCIER), TEST DE BILAN AVANT / APRES (regle du 05/11/2026) : chaque operation laisse exactement les
 * traces attendues, ni plus ni moins. Une photo de la base (empreinte de t_famille hors drapeaux, de
 * t_famille_stock, nombre de ventes, lignes, mouvements de stock, de caisse, recettes, reglements, journal) est prise
 * avant et apres chaque operation, et comparee.
 *
 *  A. Cochage par l'ecran (onglet Produits sensibles, puis Produits ordonnancier) :
 *     - case cliquee sur un produit : une seule ligne de t_famille change, d'un seul drapeau ; une seule ligne de
 *       journal (compte e2e, reference du produit, « coché sensible ») ; rien d'autre ne bouge ;
 *     - lot « Cocher tout le résultat » (deux clics) sur 3 a 5 produits : exactement ces N drapeaux, une ligne de
 *       journal « N produit(s) coché(s) … en lot », rien d'autre ; le premier clic seul n'ecrit rien ;
 *     - lot « Décocher », puis case decochee : l'etat initial est rendu, une ligne de journal par operation ;
 *     - onglet Produits ordonnancier : la case joue sur is_scheduled et ne touche pas is_sensible.
 *  B. Cloture d'une vente comptant avec le produit sensible (quantite 2) et un produit ordinaire (quantite 3), medecin
 *     rattache : stock de chacun = avant - quantite sur l'emplacement 1, un seul mouvement de stock par ligne
 *     (debut - mouvement = fin = stock lu), un seul mouvement de caisse au prix de la vente, une recette, un
 *     reglement ; le registre gagne exactement une delivrance dont le detail est la seule ligne sensible ; le
 *     journal du cochage n'a pas bouge.
 * Defaut simule (E2E_DEFAUT_SIMULE=1) : pendant le cochage unitaire, un autre produit est coche en base dans le dos
 * de l'ecran : le bilan doit alors echouer (deux drapeaux changes pour un clic).
 * Tout est retire a la fin. Lancement seul : node src/test/e2e/ordonnancier/test-bilan-cochage-cloture.js
 */
const { chromium } = require('playwright-core');
const C = require('./commun');

const J = { medecin: 'E2E-MED-BILAN', numOrdre: 'E2E-9004', nomMedecin: 'DOCTEUR ESSAI BILAN', client: 'E2E-BILAN-CLI', nomClient: 'ZZBILAN' };
const CAISSE = 'E2E-BILAN-CAISSE';
const DEFAUT_SIMULE = process.env.E2E_DEFAUT_SIMULE === '1';
const DEBUT = C.q('SELECT NOW()');
const [A1, A2, TEMOIN] = C.articlesSimples(3);
/* un debut de designation (6 caracteres) qui rend 3 a 5 produits actifs, aucun coche sensible */
const PREFIXE = C.q("SELECT LEFT(f.str_NAME, 6) p FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID AND s.lg_EMPLACEMENT_ID = '1'"
  + " WHERE f.str_STATUT = 'enable' AND s.str_STATUT = 'enable' AND LEFT(f.str_NAME, 6) NOT REGEXP '^[0-9]' AND IFNULL(f.is_sensible, 0) = 0"
  + " GROUP BY p HAVING COUNT(*) BETWEEN 3 AND 5 ORDER BY p LIMIT 1");
const lot = C.q("SELECT CONCAT_WS('~', f.lg_FAMILLE_ID, IFNULL(f.is_scheduled, 0), IFNULL(f.is_sensible, 0)) FROM t_famille f JOIN t_famille_stock s ON s.lg_FAMILLE_ID = f.lg_FAMILLE_ID"
  + " AND s.lg_EMPLACEMENT_ID = '1' WHERE f.str_STATUT = 'enable' AND s.str_STATUT = 'enable' AND f.str_NAME LIKE '" + PREFIXE.replace(/'/g, "''") + "%'")
  .split(/\n/).filter(Boolean).map((l) => { const [id, scheduled, sensible] = l.split('~'); return { id, scheduled, sensible }; });
const N = lot.length;
const SUIVIS = [A1.id, A2.id, TEMOIN.id].concat(lot.map((x) => x.id));
const ventes = [];
let paramAvant = null, caisseOuverte = false;
const USER = C.q("SELECT lg_USER_ID FROM t_user WHERE str_LOGIN = '" + C.ENV_E2E.LOGIN + "'");

function nettoyer() {
  try { C.retirerVentes(ventes); } catch (e) { console.log('Retrait des ventes incomplet : ' + String(e.message).split('\n').pop()); }
  C.purgerClientEtMedecin(J);
  [A1, A2, TEMOIN].forEach(C.remettreArticle);
  lot.forEach((x) => C.q("UPDATE t_famille SET is_scheduled = " + x.scheduled + ", is_sensible = " + x.sensible + " WHERE lg_FAMILLE_ID = '" + x.id + "'"));
  if (paramAvant !== null) { C.remettreParametre(paramAvant); }
  if (caisseOuverte) { C.fermerCaisse(CAISSE); }
  C.q("DELETE FROM t_event_log WHERE str_TABLE_CONCERN = 'dal.TFamille' AND (str_DESCRIPTION LIKE '%sensible%' OR str_DESCRIPTION LIKE '%ordonnancier%') AND dt_CREATED >= '" + DEBUT + "'");
}

/* un clic sur un bouton de lot et la reponse du serveur */
async function clicLot(p, onglet, bouton) {
  const rep = p.waitForResponse((r) => /fichearticle\/ordonnancier\/lot/.test(r.url()), { timeout: 120000 });
  await C.vues.cliquer(p, 'ordonnancier #' + onglet + ' #' + bouton);
  const r = await rep;
  const corps = await r.json().catch(() => ({}));
  await p.waitForTimeout(800);
  return corps;
}
/* ce que change une operation : drapeaux des produits suivis et photo de la base, hors journal */
const etat = () => ({ drapeaux: C.drapeaux(SUIVIS), photo: C.photo() });
function bilan(nom, avant, apres, drapeauxAttendus, journalAttendu) {
  const journal = C.journalCochage(DEBUT);
  const nouvelles = journal.slice(Number(avant.photo.journal) === Number(apres.photo.journal) ? journal.length : journal.length - (Number(apres.photo.journal) - Number(avant.photo.journal)));
  C.ok(nom + ' : seuls les drapeaux attendus changent', apres.drapeaux === drapeauxAttendus, apres.drapeaux + ' attendu ' + drapeauxAttendus);
  C.ok(nom + ' : rien d\'autre ne bouge (produits hors drapeaux, stocks, ventes, lignes, mouvements, caisse, recettes, règlements)',
    C.memePhoto(avant.photo, apres.photo, ['journal']), C.ecartPhoto(avant.photo, apres.photo));
  C.ok(nom + ' : le journal gagne exactement ' + journalAttendu.length + ' ligne(s), du compte e2e, avec la référence et le libellé attendus',
    Number(apres.photo.journal) - Number(avant.photo.journal) === journalAttendu.length
    && nouvelles.length === journalAttendu.length && journalAttendu.every((m, i) => nouvelles[i].indexOf(C.ENV_E2E.LOGIN + '|' + USER + '|') === 0 && m.test(nouvelles[i])),
    (Number(apres.photo.journal) - Number(avant.photo.journal)) + ' / ' + nouvelles.join(' ; '));
}
const avecDrapeaux = (modifs) => C.drapeaux(SUIVIS).split(';').map((x) => { const [id, d] = x.split(':'); return id + ':' + (modifs[id] || d); }).join(';');

(async () => {
  C.ok('Jeu d\'essai : trois articles simples, un lot de 3 à 5 produits non sensibles', A1.cip && A2.cip && TEMOIN.cip && N >= 3 && N <= 5, PREFIXE + ' -> ' + N);
  paramAvant = C.parametreOrdonnancier('1');
  C.poserClientEtMedecin(J);
  caisseOuverte = C.ouvrirCaisse(CAISSE);
  const b = await C.ENV_E2E.lancer(chromium);
  const ctx = await b.newContext({ viewport: { width: 1600, height: 900 } });
  await ctx.route(/\/api\/v1\/vente\/ticket\//, (r) => r.abort());
  const p = await ctx.newPage();
  const erreurs = []; p.on('pageerror', (e) => erreurs.push(e.message));
  try {
    await C.vues.connexion(p, C.ENV_E2E.LOGIN, 'e2etest');
    await C.ouvrirOnglet(p, 'Produits sensibles', 'ongletSensibles');

    /* A1. case cochee sur A1 */
    let avant = etat();
    let lignes = await C.chercherProduits(p, 'ongletSensibles', A1.cip, 'Tous');
    C.ok('A1 trouvé, non coché', lignes.length === 1 && lignes[0].sensible === false, JSON.stringify(lignes));
    let rep = await C.cliquerCase(p, 'ongletSensibles', 0);
    if (DEFAUT_SIMULE) { C.q("UPDATE t_famille SET is_sensible = 1 WHERE lg_FAMILLE_ID = '" + TEMOIN.id + "'"); console.log('DEFAUT SIMULE : le temoin est coche en base dans le dos de l\'ecran'); }
    let apres = etat();
    C.ok('Case cochée : le serveur accepte', rep.success === true, JSON.stringify(rep));
    bilan('Cochage unitaire', avant, apres, avecDrapeaux({ [A1.id]: '01' }), [new RegExp('\\|' + A1.id + '\\|Produit ' + A1.cip + ' .*coché sensible')]);

    /* A2. lot : premier clic (rien d'ecrit), second clic (N drapeaux, une ligne de journal) */
    avant = etat();
    lignes = await C.chercherProduits(p, 'ongletSensibles', PREFIXE, 'Tous');
    C.ok('Le lot est trouvé (' + N + ' produits), aucun coché', lignes.length === N && lignes.every((l) => !l.sensible), lignes.length);
    const sim = await clicLot(p, 'ongletSensibles', 'btnCocherTout');
    let milieu = etat();
    C.ok('Premier clic : le serveur compte ' + N + ' sans rien écrire (drapeaux, photo et journal inchangés)',
      sim.success === true && sim.nombre === N && milieu.drapeaux === avant.drapeaux && C.memePhoto(avant.photo, milieu.photo), JSON.stringify(sim) + ' ' + C.ecartPhoto(avant.photo, milieu.photo));
    const fait = await clicLot(p, 'ongletSensibles', 'btnCocherTout');
    apres = etat();
    C.ok('Second clic : le lot est appliqué', fait.success === true && fait.nombre === N, JSON.stringify(fait));
    const lotCoche = {}; lot.forEach((x) => { lotCoche[x.id] = x.scheduled + '1'; });
    bilan('Cochage en lot', avant, apres, avecDrapeaux(lotCoche), [new RegExp('\\|lot\\|' + N + ' produit\\(s\\) coché\\(s\\) sensible en lot \\(recherche « ' + PREFIXE.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' »')]);

    /* A3. lot decoche : etat initial rendu */
    avant = etat();
    await clicLot(p, 'ongletSensibles', 'btnDecocherTout');
    const defait = await clicLot(p, 'ongletSensibles', 'btnDecocherTout');
    apres = etat();
    C.ok('Décocher tout (deux clics) : le lot est défait', defait.success === true && defait.nombre === N, JSON.stringify(defait));
    const lotInitial = {}; lot.forEach((x) => { lotInitial[x.id] = x.scheduled + x.sensible; });
    bilan('Décochage en lot', avant, apres, avecDrapeaux(lotInitial), [new RegExp('\\|lot\\|' + N + ' produit\\(s\\) décoché\\(s\\) sensible en lot')]);

    /* A4. onglet Produits ordonnancier : la case joue sur is_scheduled seulement, sur A2 */
    await C.ouvrirOnglet(p, 'Produits ordonnancier', 'ongletProduitsOrdonnancier');
    avant = etat();
    lignes = await C.chercherProduits(p, 'ongletProduitsOrdonnancier', A2.cip, 'Tous');
    C.ok('A2 trouvé dans l\'onglet Produits ordonnancier, non coché', lignes.length === 1 && lignes[0].scheduled === false, JSON.stringify(lignes));
    rep = await C.cliquerCase(p, 'ongletProduitsOrdonnancier', 0);
    apres = etat();
    bilan('Case Ordonnancier cochée', avant, apres, avecDrapeaux({ [A2.id]: '10' }), [new RegExp('\\|' + A2.id + '\\|Produit ' + A2.cip + ' .*coché ordonnancier')]);
    avant = etat();
    await C.cliquerCase(p, 'ongletProduitsOrdonnancier', 0);
    apres = etat();
    bilan('Case Ordonnancier décochée', avant, apres, avecDrapeaux({ [A2.id]: '00' }), [new RegExp('\\|' + A2.id + '\\|Produit ' + A2.cip + ' .*décoché ordonnancier')]);

    /* B. cloture d'une vente : A1 (sensible, quantite 2) et A2 (ordinaire, quantite 3), medecin rattache */
    const stockAvant = { a1: C.stock(A1.id), a2: C.stock(A2.id) };
    const jour = new Date().toISOString().slice(0, 10);
    const registre = () => p.evaluate(async (u) => { const r = await fetch(u, { credentials: 'same-origin' }); return r.json(); },
      '../api/v1/ventestats/ventesordonnanciers?dtStart=' + jour + '&dtEnd=' + jour + '&medecinId=&query=&start=0&limit=500');
    const registreAvant = (await registre()).data || [];
    const photoAvant = C.photo();
    const journalAvant = C.journalCochage(DEBUT).length;
    await C.nouvelleVente(p);
    await C.taperArticle(p, A1.cip);
    await C.taperArticle(p, A2.cip);
    const venteId = await C.venteCourante(p);
    ventes.push(venteId);
    await C.saisirQuantite(p, A1.cip, 2);
    await C.saisirQuantite(p, A2.cip, 3);
    const prix = A1.prix * 2 + A2.prix * 3;
    C.ok('Vente ouverte : deux lignes, quantités 2 et 3, prix ' + prix,
      C.q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, ':', int_QUANTITY, ':', int_PRICE) ORDER BY lg_FAMILLE_ID SEPARATOR ';') FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'")
        === [A1.id + ':2:' + A1.prix * 2, A2.id + ':3:' + A2.prix * 3].sort().join(';'), venteId);
    C.ok('Avant la clôture : stock intact, aucun mouvement de caisse, aucune recette, aucun règlement',
      C.stock(A1.id) === stockAvant.a1 && C.stock(A2.id) === stockAvant.a2 && C.mouvements(venteId) === 'aucun' && C.recettes(venteId) === 'aucune' && C.reglements(venteId) === 'aucun',
      JSON.stringify(stockAvant));
    const refus = await C.terminer(p);
    C.ok('Terminer la vente est refusé sans médecin (A1 est sensible)', !refus.ok && refus.codeError === 1, refus.msg);
    const r = await C.rattacherClientEtMedecin(p, J, venteId);
    C.ok('Client et médecin rattachés par le parcours', r.clientOk && r.medecinOk, JSON.stringify(r));
    const fin = await C.terminer(p);
    C.ok('La vente se termine', fin.ok && C.q("SELECT str_STATUT FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'") === 'is_Closed', fin.msg);
    C.ok('Stock : A1 = avant - 2, A2 = avant - 3, sur l\'emplacement 1', C.stock(A1.id) === stockAvant.a1 - 2 && C.stock(A2.id) === stockAvant.a2 - 3,
      stockAvant.a1 + '/' + stockAvant.a2 + ' -> ' + C.stock(A1.id) + '/' + C.stock(A2.id));
    const mvts = C.mvtStock(venteId);
    C.ok('Un seul mouvement de stock par ligne, début - quantité = fin = stock lu',
      mvts === [A1.id + ':' + stockAvant.a1 + '-2=' + (stockAvant.a1 - 2) + '@1', A2.id + ':' + stockAvant.a2 + '-3=' + (stockAvant.a2 - 3) + '@1'].sort().join(';'), mvts);
    const m = C.mouvements(venteId).split('/');
    C.ok('Un seul mouvement de caisse au prix de la vente (' + prix + '), une recette, un règlement', C.mouvements(venteId).split(' ; ').length === 1 && m[1] === String(prix)
      && C.recettes(venteId).split(' ; ').length === 1 && C.reglements(venteId).split(' ; ').length === 1, C.mouvements(venteId) + ' | ' + C.recettes(venteId) + ' | ' + C.reglements(venteId));
    const photoApres = C.photo();
    C.ok('Photo après la clôture : +1 vente, +2 lignes, +2 mouvements de stock, +1 caisse, +1 recette, +1 règlement ; produits et journal du cochage inchangés',
      Number(photoApres.ventes) - Number(photoAvant.ventes) === 1 && Number(photoApres.lignes) - Number(photoAvant.lignes) === 2
      && Number(photoApres.mvtStock) - Number(photoAvant.mvtStock) === 2 && Number(photoApres.caisse) - Number(photoAvant.caisse) === 1
      && Number(photoApres.recettes) - Number(photoAvant.recettes) === 1 && Number(photoApres.reglements) - Number(photoAvant.reglements) === 1
      && photoApres.familles === photoAvant.familles && C.journalCochage(DEBUT).length === journalAvant, C.ecartPhoto(photoAvant, photoApres));
    const registreApres = (await registre()).data || [];
    const nouvelles = registreApres.filter((v) => !registreAvant.some((x) => x.lgPREENREGISTREMENTID === v.lgPREENREGISTREMENTID));
    C.ok('Le registre gagne exactement une délivrance, la nôtre', nouvelles.length === 1 && nouvelles[0].lgPREENREGISTREMENTID === venteId && registreApres.length === registreAvant.length + 1,
      registreAvant.length + ' -> ' + registreApres.length);
    const detail = await p.evaluate(async (u) => { const x = await fetch(u, { credentials: 'same-origin' }); return x.json(); }, '../api/v1/ventestats/ventesordonnanciers/detail/' + venteId);
    C.ok('Son détail est la seule ligne sensible (A1, quantité 2, motif Sensible) ; A2 n\'y est pas',
      (detail.data || []).length === 1 && detail.data[0].intCIP === A1.cip && detail.data[0].intQUANTITY === 2 && detail.data[0].motif === 'Sensible', JSON.stringify(detail.data));
    C.ok('Aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' | '));
  } catch (e) {
    await p.screenshot({ path: C.ENV_E2E.TMP + '/ordonnancier-bilan-echec.png' }).catch(() => {});
    C.ok('Parcours sans exception', false, (await C.vues.texteMessage(p).catch(() => '')) + ' ' + e.stack);
  } finally {
    await b.close();
    nettoyer();
    C.ok('Données d\'essai retirées : vente, client, médecin, drapeaux du lot et des articles, stocks, journal, paramètre',
      C.q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID IN ('" + (ventes.join("','") || '-') + "')") === '0'
      && C.q("SELECT COUNT(*) FROM medecin WHERE id = '" + J.medecin + "'") === '0'
      && [A1, A2, TEMOIN].every((a) => C.q("SELECT CONCAT(is_scheduled, is_sensible) FROM t_famille WHERE lg_FAMILLE_ID = '" + a.id + "'") === a.scheduled + a.sensible && C.stock(a.id) === Number(a.stock))
      && lot.every((x) => C.q("SELECT CONCAT(is_scheduled, is_sensible) FROM t_famille WHERE lg_FAMILLE_ID = '" + x.id + "'") === x.scheduled + x.sensible)
      && C.journalCochage(DEBUT).length === 0 && C.q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_GERE_ORDONCIER'") === paramAvant);
  }
  process.exit(C.bilan() ? 1 : 0);
})();
