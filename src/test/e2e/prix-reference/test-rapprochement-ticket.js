/* TEST DE RAPPROCHEMENT ECRAN / TICKET / BASE (ticket 2912673621 du 05/11) : vente assurance a trois lignes de taux
 * differents, cloturee par l'ecran, puis le ticket de la vente relu et rapproche, ligne par ligne, de ce que
 * l'ecran affichait et de ce que la base a enregistre.
 *
 * Le defaut du 05/11 : DOLIRHUME passe a 70 % a l'ecran (MUGEFCI 80 %), part de l'organisme juste, mais le ticket
 * imprimait « Taux 80 % » partout avec des montants au prorata. Les tests par l'exemple ne le voyaient pas : tous
 * leurs taux etaient egaux et ils ne verifiaient que la somme.
 *
 * Parcours (compte de test, KEY_PRIX_REF_CAISSE et KEY_LIGNE_COMPTANT_VO a 1 le temps du test) :
 *  1. Ventes > nouvelle vente > « Assurance » > client assure a 80 % > trois articles tapes par leur CIP ;
 *  2. ligne 2 : cellule TAUX cliquee, 70 tape, Entree ; ligne 3 : cellule P.REF cliquee, prix - 100 tape, Entree ;
 *  3. AFFICHER NET A PAYER, montant recu, TERMINER LA VENTE (sans impression) ;
 *  4. le ticket de la vente est relu par l'apercu (meme chemin que la reimpression, rien n'est imprime).
 * Regles verifiees (coherence et veracite) :
 *  - chaque ligne du ticket porte le taux que l'ecran affichait pour elle ;
 *  - part de chaque ligne = base x son taux (une seule ligne au plus porte l'arrondi) ;
 *  - somme des lignes = part de l'organisme en base = part imprimee dans le bloc client = part affichee a l'ecran ;
 *  - net imprime = net affiche = prix - part de l'organisme ;
 *  - en base, un seul taux par ligne modifiee (les recalculs ne les empilent plus).
 * Tout est retire a la fin (vente, client, tiers-payant, prix de reference, journal, parametres, stock, caisse).
 * Lancement seul : node src/test/e2e/prix-reference/test-rapprochement-ticket.js
 */
const C = require('./commun');
const L = require('../ligne-comptant/commun');
const { ok, q, A } = C;

const chiffres = (t) => Number(String(t || '').replace(/[^\d]/g, '')) || 0;

/* ticket relu par l'apercu : articles (designation, detail, montant, taux et part de chaque organisme), paires du bloc client, net */
function lireTicket(t) {
  const articles = []; const paires = {}; let net = null;
  for (const b of t.blocs) {
    for (const e of b.elements) {
      if (e.genre === 'ARTICLE') { articles.push({ designation: e.a, detail: e.b, montant: chiffres(e.d), credits: [], pref: null }); }
      else if (b.id === 'CORPS' && e.genre === 'TEXTE' && articles.length) {
        const m = e.a.match(/Taux\s+(\d+)\s*%\s*:\s*([\d\s  ]+)$/);
        if (m) { articles[articles.length - 1].credits.push({ taux: Number(m[1]), part: chiffres(m[2]), texte: e.a }); }
        const r = e.a.match(/^P\.REF\s+([\d\s  ]+)$/);
        if (r) { articles[articles.length - 1].pref = chiffres(r[1]); }
      } else if (e.genre === 'PAIRE' || e.genre === 'ENCADRE') {
        paires[e.a.replace(/\s*:\s*$/, '').trim()] = e.b;
        if (/net/i.test(e.a) && /payer/i.test(e.a)) { net = chiffres(e.b); }
      }
    }
  }
  return { articles, paires, net };
}

(async () => {
  A.parametre('KEY_PRIX_REF_CAISSE', '1');
  A.parametre('KEY_LIGNE_COMPTANT_VO', '1');
  A.parametre('KEY_PRIX_REF_BASE_PAR_TP', '0');
  const TP = A.tiersPayant('RT', '1');
  const P = [C.produitSansReference(5), C.produitSansReference(6), C.produitSansReference(7)];
  const CIP = P.map(C.cip);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  let venteId = null;
  try {
    await A.clientAssure(api, 'RAPP', [{ tp: TP, taux: 80 }]);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' RAPP');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-RT');
    for (const c of CIP) { await C.taperArticle(p, c); }
    venteId = await C.venteCourante(p);
    C.noterVente(venteId);
    ok('Préparation : vente assurance à trois lignes ouverte à l\'écran', !!venteId
      && q("SELECT COUNT(*) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'") === '3', venteId);

    /* 2. taux de la ligne 2 et prix de reference de la ligne 3, par la cellule de la grille */
    const r1 = await C.saisirEtEnregistrer(p, CIP[1], TP, 'taux', 70);
    ok('Ligne 2 : TAUX 70 saisi dans la cellule puis Entrée, accepté', r1.http === 200 && r1.success === true, JSON.stringify(r1).slice(0, 200));
    const prixRef = P[2].pu - 100;
    const r2 = await C.saisirEtEnregistrer(p, CIP[2], TP, 'valeur', prixRef);
    ok('Ligne 3 : P.REF saisi dans la cellule puis Entrée, accepté', r2.http === 200 && r2.success === true, JSON.stringify(r2).slice(0, 200));

    /* ce que l'ecran affiche, ligne par ligne */
    const ecran = [];
    for (const c of CIP) { ecran.push(await C.ligne(p, c)); }
    const tauxEcran = ecran.map((l) => l && l.refs && l.refs[0] ? l.refs[0].taux : null);
    ok('L\'écran affiche 80 %, 70 %, 80 % sur les trois lignes', tauxEcran.join(',') === '80,70,80', JSON.stringify(tauxEcran));

    /* 3. cloture par l'ecran, sans impression (la part affichee est lue avant : l'ecran repart ensuite sur une vente vide) */
    const railAvant = await L.rail(p);
    const clot = await L.terminerVente(p, false);
    ok('TERMINER LA VENTE : succès', clot.http === 200 && clot.success === true, JSON.stringify(clot).slice(0, 300));
    const vente = q("SELECT CONCAT_WS('|', str_STATUT, int_PRICE, int_CUST_PART, str_REF_TICKET) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'").split('|');
    const partTpBase = Number(q("SELECT int_PRICE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'"));
    ok('Vente close en base, part de l\'organisme enregistrée', vente[0] === 'is_Closed' && partTpBase > 0, vente.join('|') + ' tp ' + partTpBase);
    const tauxLignes = q("SELECT IFNULL(GROUP_CONCAT(CONCAT(d.lg_FAMILLE_ID, '=', ROUND(t.taux * 100)) ORDER BY d.lg_FAMILLE_ID SEPARATOR ' ; '), 'aucun')"
      + " FROM taux_produit t JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_DETAIL_ID = t.sale_iem_id WHERE d.lg_PREENREGISTREMENT_ID = '" + venteId + "'");
    ok('En base : un seul taux par ligne modifiée, 70 % sur la ligne 2 (aucun doublon après les recalculs)',
      tauxLignes.split(' ; ').filter((x) => x.startsWith(P[1].id + '=')).join() === P[1].id + '=70'
      && new Set(tauxLignes.split(' ; ').map((x) => x.split('=')[0])).size === tauxLignes.split(' ; ').length, tauxLignes);

    /* 4. le ticket de la vente, relu sans impression */
    const apercu = await p.evaluate(async (v) => (await fetch('../api/v1/vente/ticket/vo/' + v + '/apercu')).json(), venteId);
    ok('Aperçu du ticket : le ticket de vente assurance est produit sans impression', apercu.success === true && apercu.tickets.length === 1
      && apercu.tickets[0].modele === 'VENTE_ASSURANCE', JSON.stringify(apercu).slice(0, 300));
    const t = lireTicket(apercu.tickets[0]);
    ok('Le ticket porte les trois lignes, chacune avec une ligne « Taux … % : … »', t.articles.length === 3 && t.articles.every((a) => a.credits.length === 1),
      JSON.stringify(t.articles));

    /* veracite : le taux de chaque ligne est celui de l'ecran */
    const tauxTicket = t.articles.map((a) => a.credits[0] ? a.credits[0].taux : null);
    ok('Véracité : chaque ligne du ticket porte le taux affiché à l\'écran (80, 70, 80)', tauxTicket.join(',') === tauxEcran.join(','),
      'ticket ' + tauxTicket.join(',') + ' / écran ' + tauxEcran.join(','));
    ok('Ligne 3 : le prix de référence est imprimé (P.REF)', t.articles[2] && t.articles[2].pref === prixRef, JSON.stringify(t.articles[2]));

    /* coherence : part = base x taux, une seule ligne au plus porte l'arrondi */
    const bases = t.articles.map((a, i) => (i === 2 ? prixRef : P[i].pu));
    const attendues = bases.map((b, i) => Math.round(b * tauxEcran[i] / 100));
    const parts = t.articles.map((a) => (a.credits[0] ? a.credits[0].part : -1));
    const ecarts = parts.map((x, i) => Math.abs(x - attendues[i]));
    ok('Cohérence : part de chaque ligne = base × son taux (une seule ligne au plus porte l\'arrondi, ±3 F)',
      ecarts.filter((d) => d > 0).length <= 1 && ecarts.every((d) => d <= 3), 'ticket ' + parts.join(',') + ' / attendu ' + attendues.join(','));
    const somme = parts.reduce((s, x) => s + x, 0);
    const tpImprime = Object.keys(t.paires).filter((k) => k.indexOf(C.MARQUE) === 0 || /\[\d+%\]/.test(k)).map((k) => chiffres(t.paires[k]))[0];
    ok('Cohérence : somme des lignes = part de l\'organisme en base = part imprimée dans le bloc client',
      somme === partTpBase && tpImprime === partTpBase, 'lignes ' + somme + ' / base ' + partTpBase + ' / bloc client ' + tpImprime + ' ' + JSON.stringify(t.paires));
    ok('Rapprochement écran : la part affichée à l\'écran avant la clôture = part en base',
      railAvant && railAvant.montantTp === partTpBase, JSON.stringify(railAvant));
    const prixTotal = Number(vente[1]);
    /* la base garde la part du client sans arrondi (int_CUST_PART), l'ecran et le ticket l'arrondissent a 5 F */
    ok('Net imprimé = net affiché à l\'écran = prix - part de l\'organisme arrondi à 5 F (part du client en base à 4 F près)',
      t.net !== null && t.net === railAvant.net.valeur && t.net % 5 === 0 && Math.abs(t.net - (prixTotal - partTpBase)) <= 4
      && Math.abs(t.net - Number(vente[2])) <= 4, 'ticket ' + t.net + ' / écran ' + railAvant.net.valeur + ' / base ' + vente[2] + ' / prix ' + prixTotal);
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    const v = await C.venteCourante(p).catch(() => null);
    C.noterVente(v);
    C.retirerReferences();
    await sess.b.close();
    C.nettoyer();
    process.exit(A.bilan() ? 1 : 0);
  }
})();
