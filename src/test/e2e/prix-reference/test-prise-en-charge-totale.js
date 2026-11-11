/* RETOUR DU 10/11/2026, PRISE EN CHARGE TOTALE D'UNE LIGNE (KEY_PRISE_EN_CHARGE_TOTALE) : test d'ecran, de
 * rapprochement ecran / base / ticket et de bilan avant / apres, par le vrai chemin de la caisse.
 *
 * Client assure a deux assurances : A = RO a 80 % (prioritaire), B = RC1 a 20 %.
 *  0. Parametre a 0 : TAUX de B mis a 100 sur la ligne -> AUCUNE question, la saisie part comme avant, B complete le
 *     reste (A 80 %, B 20 %), aucune marque sur la ligne.
 *  1. Parametre a 1, vente a deux lignes (quantites 1 et 2) : TAUX de B a 100 sur la ligne 1 -> question sous la
 *     grille, rien n'est ecrit ; Echap : saisie annulee, taux inchange ; de nouveau 100 puis Entree : B passe en
 *     premier (marque en base, cellule a 100 %, net recalcule : B = prix de la ligne 1, A = 0 sur cette ligne, la
 *     ligne 2 garde son calcul) ; TAUX de A a 100 sur la meme ligne : refuse (une seule assurance par ligne).
 *     Cloture par l'ecran : parts en base = ecran ; ticket : sous la ligne 1 seulement « B · Taux 100 % », A (part
 *     nulle sur la ligne) n'est pas imprimee ; recapitulatif : A et B ; stock -1 et -2, un mouvement de caisse ;
 *     RIEN dans les prix de reference de la fiche ni dans leur journal.
 *  2. Parametre a 1, vente a une ligne : B confirmee ; P.REF de B = prix - 300 -> B = prix - 300, A prend 300 (le
 *     reste), la marque tient et la saisie garde le taux d'avant (20, pas 100) ; TAUX de B a 30 -> la marque tombe ;
 *     P.REF de B remis au prix ; B confirmee de nouveau -> B = prix, A = 0. Cloture : le recapitulatif du ticket
 *     n'imprime plus A (part nulle sur la vente), « Part du client » reste ; la fiche recoit prix / 30 %, jamais 100.
 * Tout est retire a la fin (ventes, client, assurances, references, journal), parametres et stocks remis.
 * Lancement seul : node src/test/e2e/prix-reference/test-prise-en-charge-totale.js
 */
const C = require('./commun');
const L = require('../ligne-comptant/commun');
const { ok, q, exec, A } = C;
const CLE = 'KEY_PRISE_EN_CHARGE_TOTALE';
const arrondi5 = (n) => { const m = n % 5; return m <= 2 ? n - m : n - m + 5; };
const parts = (serveur) => { const r = {}; ((serveur.data || {}).tierspayants || []).forEach((t) => { r[t.compteTp] = t.tpnet; }); return r; };
const marque = (venteId) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, '=', IFNULL(tp_premier_id, 'NULL')) ORDER BY lg_FAMILLE_ID SEPARATOR ';'), 'aucune') FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'");
const tauxProduit = (venteId) => q("SELECT IFNULL(GROUP_CONCAT(CONCAT(d.lg_FAMILLE_ID, '|', t.compte_tiers_payant_id, '=', ROUND(t.taux * 100), '/', IFNULL(t.base_ligne, 'NULL')) ORDER BY d.lg_FAMILLE_ID, t.compte_tiers_payant_id SEPARATOR ';'), 'aucun')"
  + " FROM taux_produit t JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_DETAIL_ID = t.sale_iem_id WHERE d.lg_PREENREGISTREMENT_ID = '" + venteId + "'");
const journal = (produits) => Number(q("SELECT COUNT(*) FROM prix_reference_journal WHERE produit_id IN ('" + produits.join("','") + "')"));
/* message sous la grille : texte et nature (question, ko, ok) */
const message = (p) => p.evaluate(() => { const m = Ext.ComponentQuery.query('doventemanager #messageReferenceTp').filter((x) => x.isVisible())[0];
  if (!m) { return { texte: '', nature: '' }; }
  const c = m.el.dom.className; return { texte: m.el.dom.textContent, nature: /question/.test(c) ? 'question' : /-ko/.test(c) ? 'ko' : 'ok' }; });
const tri = (a) => a.slice().sort().join(';');

(async () => {
  A.parametre('KEY_PRIX_REF_CAISSE', '1');
  A.parametre('KEY_LIGNE_COMPTANT_VO', '1'); /* les lignes « Taux x % : part » du ticket n'existent qu'avec ce parametre */
  A.parametre('KEY_PRIX_REF_BASE_PAR_TP', '0');
  A.parametre(CLE, '0');
  const TA = A.tiersPayant('PT-A', '1'), TB = A.tiersPayant('PT-B', '1');
  const P1 = C.produitSansReference(12), P2 = C.produitSansReference(13);
  const CIP1 = C.cip(P1), CIP2 = C.cip(P2);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  /* taper 100 dans la cellule TAUX puis Entree : la question s'affiche (ou pas) */
  const taperCent = async (cip, tp) => { await C.saisirCellule(p, cip, tp, 'taux', 100); await p.waitForTimeout(700); };
  /* Entree de confirmation, avec attente de la reponse du service */
  const confirmer = async () => {
    const rep = p.waitForResponse((r) => r.request().method() === 'PUT' && /\/premier$/.test(r.url()), { timeout: 60000 });
    rep.catch(() => {});
    await p.keyboard.press('Enter');
    const r = await rep; const corps = await r.json().catch(() => ({})); corps.http = r.status();
    await p.waitForTimeout(1800);
    return corps;
  };
  const ouvrirVente = async (bon, deuxLignes) => {
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' PECT');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-' + bon);
    await C.taperArticle(p, CIP1);
    if (deuxLignes) { await C.taperArticle(p, CIP2); }
    const v = await C.venteCourante(p);
    C.noterVente(v);
    if (deuxLignes) { await C.saisirQuantite(p, CIP2, 2); }
    await C.ajouterTiersPayant(p, TB);
    await C.saisirBon(p, 2, C.MARQUE + '-BON-' + bon + 'B');
    return v;
  };
  try {
    const cl = await A.clientAssure(api, 'PECT', [{ tp: TA, taux: 80 }, { tp: TB, taux: 20 }]);
    const cA = cl.clientId + '-L0', cB = cl.clientId + '-L1';

    /* ---------- 0. parametre a 0 : aucune question ---------- */
    const v0 = await ouvrirVente('P0', false);
    const r0 = await C.saisirEtEnregistrer(p, CIP1, TB, 'taux', 100);
    const m0 = await message(p);
    ok('Paramètre à 0 : TAUX de B à 100 → aucune question, la saisie part comme avant', r0.http === 200 && r0.success === true && m0.nature !== 'question' && !/passe en premier/.test(m0.texte), JSON.stringify(m0));
    const s0 = parts(await C.netServeur(sess, v0));
    ok('Paramètre à 0 : B complète le reste (A ' + Math.round(P1.pu * 0.8) + ', B ' + (P1.pu - Math.round(P1.pu * 0.8)) + '), aucune marque sur la ligne',
      s0[cA] === Math.round(P1.pu * 0.8) && s0[cB] === P1.pu - Math.round(P1.pu * 0.8) && marque(v0) === P1.id + '=NULL', JSON.stringify(s0) + ' ' + marque(v0));
    exec("DELETE FROM prix_reference_saisie WHERE vente_id = '" + v0 + "'");

    /* ---------- 1. parametre a 1 : question, Echap, Entree, refus, cloture ---------- */
    exec("UPDATE t_parameters SET str_VALUE = '1' WHERE str_KEY = '" + CLE + "'");
    await C.nouvelleVente(p);
    const v1 = await ouvrirVente('P1', true);
    const avant = { stock: [A.stock(P1), A.stock(P2)], journal: journal([P1.id, P2.id]), fiche: C.references(P1.id) + ' | ' + C.references(P2.id) };
    await taperCent(CIP1, TB);
    let m = await message(p);
    ok('Paramètre à 1 : TAUX de B à 100 → question sous la grille, sans fenêtre', m.nature === 'question' && m.texte.indexOf(TB + ' passe en premier et paiera 100 % de cette ligne') >= 0
      && /Entrée pour confirmer, Échap pour annuler/.test(m.texte) && !(await C.vues.texteMessage(p)), JSON.stringify(m));
    ok('Tant que la question est en attente, rien n\'est écrit (ni marque, ni saisie)', marque(v1) === tri([P1.id + '=NULL', P2.id + '=NULL']) && C.saisiesGardees(P1.id) === 'aucune', marque(v1) + ' ' + C.saisiesGardees(P1.id));
    await p.keyboard.press('Escape');
    await p.waitForTimeout(600);
    m = await message(p);
    let l1 = await C.ligne(p, CIP1);
    ok('Échap : saisie annulée, le taux de B reste 20, rien en base', /saisie annulée/.test(m.texte) && m.nature !== 'question' && l1.refs[1].taux === 20 && !l1.refs[1].premier
      && marque(v1) === tri([P1.id + '=NULL', P2.id + '=NULL']) && C.saisiesGardees(P1.id) === 'aucune', JSON.stringify(m) + ' ' + JSON.stringify(l1.refs[1]));

    await taperCent(CIP1, TB);
    const c1 = await confirmer();
    ok('Entrée : le service marque la ligne (200)', c1.http === 200 && c1.success === true, JSON.stringify(c1).slice(0, 200));
    ok('Base : B est marquée sur la ligne 1 seulement ; aucune saisie de prix de référence', marque(v1) === tri([P1.id + '=' + cB, P2.id + '=NULL']) && C.saisiesGardees(P1.id) === 'aucune', marque(v1));
    l1 = await C.ligne(p, CIP1);
    ok('Écran : la cellule TAUX de B affiche 100 avec son style « passe en premier », A reste à 80', l1.refs[1].premier === true && l1.refs[1].taux === 100 && l1.refs[0].taux === 80
      && l1.cellules.filter((c) => /vp-ref-premier/.test(c.classes)).length === 1, JSON.stringify(l1));
    const attA1 = Math.round(P2.pu * 2 * 0.8), attB1 = P1.pu + (P2.pu * 2 - attA1);
    const s1 = await C.netServeur(sess, v1);
    const p1 = parts(s1);
    ok('Règle : B = prix de la ligne 1 + 20 % de la ligne 2 (' + attB1 + '), A = 0 sur la ligne 1 + 80 % de la ligne 2 (' + attA1 + ')', p1[cA] === attA1 && p1[cB] === attB1, JSON.stringify(p1));
    const rail = await L.rail(p);
    ok('Écran : « Part TP » et net = serveur', rail.tp.valeur === attA1 + attB1 && rail.net.valeur === arrondi5(P1.pu + 2 * P2.pu - attA1 - attB1), JSON.stringify(rail));

    await taperCent(CIP1, TA);
    m = await message(p);
    ok('TAUX de A à 100 sur la même ligne : refusé, une seule assurance par ligne', m.nature === 'ko' && m.texte.indexOf(TB + ' passe déjà en premier') >= 0 && marque(v1) === tri([P1.id + '=' + cB, P2.id + '=NULL']), JSON.stringify(m));

    const clot1 = await L.terminerVente(p, false);
    ok('TERMINER LA VENTE (vente 1) : succès', clot1.http === 200 && clot1.success === true, JSON.stringify(clot1).slice(0, 300));
    const tp1 = {}; A.lignesTp(v1).split(' ; ').forEach((x) => { const c = x.split('/'); tp1[c[0]] = Number(c[2]); });
    ok('Base : parts enregistrées = écran (A ' + attA1 + ', B ' + attB1 + ')', tp1[TA] === attA1 && tp1[TB] === attB1, A.lignesTp(v1));
    ok('Base : taux_produit de la ligne 1 = B 100 % et A 80 %, chacun sur le prix de vente ; rien sur la ligne 2',
      tauxProduit(v1) === tri([P1.id + '|' + cA + '=80/' + P1.pu, P1.id + '|' + cB + '=100/' + P1.pu]), tauxProduit(v1));
    ok('Bilan : stock -1 et -2, un seul mouvement de caisse, la marque est gardée sur la vente close',
      A.stock(P1) === avant.stock[0] - 1 && A.stock(P2) === avant.stock[1] - 2 && L.mouvements(v1).split(' ; ').length === 1 && marque(v1) === tri([P1.id + '=' + cB, P2.id + '=NULL']),
      A.stock(P1) + '/' + A.stock(P2) + ' ' + L.mouvements(v1));
    ok('Bilan : rien dans les prix de référence de la fiche ni dans leur journal (valable pour cette vente seulement)',
      C.references(P1.id) + ' | ' + C.references(P2.id) === avant.fiche && journal([P1.id, P2.id]) === avant.journal, C.references(P1.id) + ' / journal ' + journal([P1.id, P2.id]));
    let t = C.lireTicket((await C.apercuTicket(p, v1)).tickets[0]);
    ok('Ticket : sous la ligne 1, seulement « B · Taux 100 % : ' + P1.pu + ' » (A, part nulle sur la ligne, n\'est pas imprimée) ; sous la ligne 2, A à 80 % et B à 20 % (retour du 11/11)',
      t.articles.length === 2 && t.articles[0].credits.length === 1 && t.articles[0].credits[0].nom === TB && t.articles[0].credits[0].taux === 100
      && t.articles[0].credits[0].part === P1.pu && t.articles[1].credits.length === 2
      && t.articles[1].credits[0].nom === TA && t.articles[1].credits[0].taux === 80 && t.articles[1].credits[0].part === attA1
      && t.articles[1].credits[1].nom === TB && t.articles[1].credits[1].taux === 20 && t.articles[1].credits[1].part === P2.pu * 2 - attA1, JSON.stringify(t.articles.map((a) => a.credits.map((c) => c.texte))));
    ok('Ticket : récapitulatif A = ' + attA1 + ' et B = ' + attB1 + ' (= base), part du client = net affiché (vente à terme si 0)', C.chiffres(t.paires[TA]) === attA1 && C.chiffres(t.paires[TB]) === attB1
      && (t.net === rail.net.valeur || (t.net === null && rail.net.valeur === 0 && C.chiffres(t.paires['Part du client']) === 0)), JSON.stringify(t.paires));

    /* ---------- 2. une ligne : prix de reference, marque retiree puis reposee, recapitulatif sans A ---------- */
    await C.nouvelleVente(p);
    const v2 = await ouvrirVente('P2', false);
    await taperCent(CIP1, TB);
    await confirmer();
    const refB = P1.pu - 300;
    const rp = await C.saisirEtEnregistrer(p, CIP1, TB, 'valeur', refB);
    let s2 = parts(await C.netServeur(sess, v2));
    ok('P.REF de B = ' + refB + ' sur la ligne marquée : B = ' + refB + ', A prend le reste (300), la marque tient', rp.http === 200 && s2[cB] === refB && s2[cA] === 300 && marque(v2) === P1.id + '=' + cB,
      JSON.stringify(s2) + ' ' + marque(v2));
    ok('La saisie gardée porte le taux d\'avant la marque (20), jamais 100', C.saisiesGardees(P1.id) === TB + '/MIX_TAUX_PRIX/' + refB + '/20/1', C.saisiesGardees(P1.id));
    const rt = await C.saisirEtEnregistrer(p, CIP1, TB, 'taux', 30);
    s2 = parts(await C.netServeur(sess, v2));
    const base0 = refB, a0 = Math.round(base0 * 0.8);
    ok('TAUX de B à 30 : la marque tombe, calcul habituel (A ' + a0 + ', B ' + (base0 - a0) + ')', rt.http === 200 && marque(v2) === P1.id + '=NULL' && s2[cA] === a0 && s2[cB] === base0 - a0, JSON.stringify(s2) + ' ' + marque(v2));
    await C.saisirEtEnregistrer(p, CIP1, TB, 'valeur', P1.pu);
    await taperCent(CIP1, TB);
    const c2 = await confirmer();
    s2 = parts(await C.netServeur(sess, v2));
    ok('B confirmée de nouveau, sans prix de référence propre : B = ' + P1.pu + ', A = 0', c2.http === 200 && s2[cB] === P1.pu && s2[cA] === 0 && marque(v2) === P1.id + '=' + cB, JSON.stringify(s2));
    const clot2 = await L.terminerVente(p, false);
    ok('TERMINER LA VENTE (vente 2) : succès', clot2.http === 200 && clot2.success === true, JSON.stringify(clot2).slice(0, 300));
    const tp2 = {}; A.lignesTp(v2).split(' ; ').forEach((x) => { const c = x.split('/'); tp2[c[0]] = Number(c[2]); });
    ok('Base : A = 0, B = ' + P1.pu + ' ; part du client 0', tp2[TA] === 0 && tp2[TB] === P1.pu && L.vente(v2).partClient === 0, A.lignesTp(v2));
    ok('Fiche article après la clôture : B au prix ' + P1.pu + ' et au taux 30, jamais 100', C.references(P1.id) === TB + '/MIX_TAUX_PRIX/' + P1.pu + '/30/1', C.references(P1.id));
    t = C.lireTicket((await C.apercuTicket(p, v2)).tickets[0]);
    ok('Ticket : le récapitulatif n\'imprime plus A (part nulle), B = ' + P1.pu + ', « Part du client » gardée à 0',
      t.paires[TA] === undefined && C.chiffres(t.paires[TB]) === P1.pu && t.paires['Part du client'] !== undefined && C.chiffres(t.paires['Part du client']) === 0, JSON.stringify(t.paires));
    ok('Ticket : sous la ligne, seulement « B · Taux 100 % : ' + P1.pu + ' », avec son nom', t.articles[0].credits.length === 1 && t.articles[0].credits[0].nom === TB
      && t.articles[0].credits[0].taux === 100 && t.articles[0].credits[0].part === P1.pu, JSON.stringify(t.articles[0].credits));
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    C.noterVente(await C.venteCourante(p).catch(() => null));
    C.retirerReferences();
    await sess.b.close();
    C.nettoyer();
    ok('Paramètre ' + CLE + ' remis à sa valeur d\'avant', q("SELECT IFNULL(MAX(str_VALUE), 'absent') FROM t_parameters WHERE str_KEY = '" + CLE + "'") === A.etat.params.filter((x) => x[0] === CLE)[0][1].replace('__ABSENT__', 'absent'));
    process.exit(A.bilan() ? 1 : 0);
  }
})();
