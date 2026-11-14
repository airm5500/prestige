/* VENTE AU COMPTANT QUAND LA BASE COUPE LES CONNEXIONS DU POSTE (rapport d'exploitation du 13/11, point 2).
 *
 * Constat chez appaul le 13/11, caisse 4 : « Communications link failure » sur des connexions du pool restees
 * inactives (dernier paquet recu 295 s plus tot), puis sur la peremption proche apres 42 s ; ajout d'article refuse,
 * cloture a 43 s, vente suivante restee ouverte 16 min. Le pool de la caisse ne verifiait pas ses connexions avant de
 * les preter : une connexion coupee par la base ou le reseau etait pretee telle quelle.
 *
 * Reproduction sur une COPIE de travail (DB_TEST + E2E_BASE_LIBRE) : chaque connexion inactive du poste vers la base
 * est tuee (KILL, comme une coupure par la base ou le reseau) avant chaque geste de la caissiere.
 * Vrai chemin de l'ecran : menu Ventes, nouvelle vente au comptant, trois articles tapes par leur CIP (le deuxieme
 * deux fois : quantite 2), « AFFICHER NET A PAYER », montant recu, « TERMINER LA VENTE », pas de ticket ; puis
 * annulation par la liste des ventes terminees.
 * Controles :
 *  - chaque geste aboutit malgre la coupure : aucun refus (HTTP 500), aucun message d'erreur technique ;
 *  - rapprochement : ecran (lignes, quantites, montants, net) = lignes de la vente = mouvements de stock = mouvement
 *    de caisse = recette = reglement ;
 *  - bilan : stock avant - quantite sur l'emplacement de l'officine, une seule fois par produit ; un mouvement de caisse,
 *    une recette, un reglement ; l'annulation rend tout le stock ;
 *  - aucune erreur JavaScript.
 * Le test doit echouer sur un pool sans verification des connexions, et passer apres
 * outils/officine/1-configurer-payara.ps1 -PoolSeulement. Tout ce que le test pose est retire.
 * Lancement seul : node src/test/e2e/vente/test-vente-connexions-coupees-1311.js
 */
const C = require('../ligne-comptant/commun');
const { ok, q, exec, A, vues } = C;

/* connexions inactives du poste vers la base de travail, sauf celle de cette commande */
function couperConnexions() {
  const ids = q("SELECT GROUP_CONCAT(ID) FROM information_schema.PROCESSLIST WHERE DB = DATABASE() AND COMMAND = 'Sleep' AND ID <> CONNECTION_ID()");
  const liste = ids && ids !== 'NULL' ? ids.split(',') : [];
  for (const id of liste) { try { exec('KILL ' + id); } catch (e) { /* deja partie */ } }
  return liste.length;
}

(async () => {
  A.parametre('KEY_PRIX_REF_CAISSE', '0');
  const P = [C.produitSimple(21), C.produitSimple(22), C.produitSimple(23)];
  const CIP = P.map(C.cip);
  const QTE = [1, 2, 1];
  A.ouvrirCaisse();
  const avant = P.map((x) => A.stock(x));
  const sess = await C.connecterEtOuvrirVente();
  const { p, erreurs } = sess;
  const refus = [];
  p.on('response', (r) => { if (r.status() >= 500 && /\/api\//.test(r.url())) { refus.push(r.status() + ' ' + r.url().replace(/^.*\/api\//, '')); } });
  const coupees = [];
  const messages = [];
  const noterMessage = async (geste) => { const m = await vues.texteMessage(p); if (m) { messages.push(geste + ' : ' + m); await vues.repondre(p, 'ok').catch(() => {}); } };
  try {
    /* 1. trois articles, la base coupe les connexions avant chaque geste */
    for (let i = 0; i < P.length; i++) {
      for (let k = 0; k < QTE[i]; k++) {
        await p.waitForTimeout(1500);
        coupees.push(couperConnexions());
        await C.taperArticle(p, CIP[i]).catch((e) => messages.push('ajout ' + CIP[i] + ' : ' + e.message.split('\n')[0]));
        await noterMessage('ajout ' + CIP[i]);
      }
    }
    const venteId = await C.venteCourante(p);
    C.noterVente(venteId);
    const grille = await p.evaluate((g) => Ext.ComponentQuery.query(g)[0].getStore().getRange()
      .map((r) => ({ cip: r.get('intCIP'), qte: r.get('intQUANTITY'), pu: r.get('intPRICEUNITAIR'), montant: r.get('intPRICE') })), C.GRILLE);

    /* 2. net, montant recu, cloture : la base coupe encore */
    coupees.push(couperConnexions());
    const netRep = p.waitForResponse((x) => /\/vente\/net\/vno/.test(x.url()), { timeout: 60000 }).catch(() => null);
    await vues.cliquer(p, 'doventemanager #contenu [xtype=toolbar] #netBtn');
    await netRep;
    await p.waitForTimeout(1200);
    await noterMessage('net à payer');
    const net = await p.evaluate(() => Number(String(Ext.ComponentQuery.query('doventemanager #contenu #montantNet')[0].getValue()).replace(/\D/g, '')));
    for (let essai = 0; essai < 3; essai++) {
      await vues.cliquer(p, 'doventemanager #contenu #montantRecu');
      await p.keyboard.press('Control+A');
      await p.keyboard.type(String(net), { delay: 40 });
      await p.waitForTimeout(300);
      if (await p.evaluate(() => Number(String(Ext.ComponentQuery.query('doventemanager #contenu #montantRecu')[0].getValue()).replace(/\D/g, ''))) === net) { break; }
    }
    await p.keyboard.press('Tab');
    await p.waitForTimeout(800);
    coupees.push(couperConnexions());
    const t0 = Date.now();
    const clot = p.waitForResponse((x) => /\/vente\/cloturer\/vno/.test(x.url()), { timeout: 120000 }).catch(() => null);
    await vues.cliquer(p, 'doventemanager #contenu [xtype=toolbar] #btnCloture');
    const rc = await clot;
    const dureeCloture = Date.now() - t0;
    const corps = rc ? await rc.json().catch(() => ({})) : {};
    await p.waitForTimeout(1500);
    const m = await vues.texteMessage(p);
    if (/imprimer le ticket/i.test(m)) { await vues.repondre(p, 'no'); } else if (m) { messages.push('clôture : ' + m); await vues.repondre(p, 'ok').catch(() => {}); }
    await p.waitForTimeout(1200);

    ok('la base a bien coupé des connexions du poste avant chaque geste', coupees.length > 0 && coupees.every((n) => n > 0), coupees.join(','));
    ok('aucun refus du serveur (HTTP 500) malgré les coupures', refus.length === 0, refus.join(' | '));
    ok('aucun message d\'erreur à l\'écran', messages.length === 0, messages.join(' | '));
    ok('clôture acceptée (' + dureeCloture + ' ms)', rc && rc.status() === 200 && corps.success === true, rc ? rc.status() + ' ' + JSON.stringify(corps).slice(0, 300) : 'pas de réponse');

    /* --- rapprochement et bilan --- */
    const apres = P.map((x) => A.stock(x));
    const v = venteId ? C.vente(venteId) : {};
    const lignesBase = venteId ? C.lignes(venteId) : 'aucune';
    const attendu = P.map((x, i) => x.id + '/' + QTE[i]).sort().join(' ; ');
    const lignesQte = lignesBase === 'aucune' ? '' : lignesBase.split(' ; ').map((l) => l.split('/').slice(0, 2).join('/')).sort().join(' ; ');
    const ecran = grille.map((g) => g.cip + '/' + g.qte).sort().join(' ; ');
    const ecranAttendu = CIP.map((c, i) => c + '/' + QTE[i]).sort().join(' ; ');
    ok('écran : trois lignes, quantités 1, 2 et 1', ecran === ecranAttendu, ecran + ' / attendu ' + ecranAttendu);
    ok('rapprochement écran = lignes de la vente (produit, quantité)', lignesQte === attendu, lignesBase);
    const sommeEcran = grille.reduce((s, g) => s + Number(g.montant), 0);
    ok('rapprochement : total des lignes à l\'écran = prix de la vente en base = net affiché', sommeEcran === v.prix && net === v.prix - v.remise,
      'écran ' + sommeEcran + ', base ' + v.prix + ' (remise ' + v.remise + '), net ' + net);
    ok('vente close, non annulée', v.statut === 'is_Closed' && !v.annulee, JSON.stringify(v));
    ok('bilan stock : avant − quantité, une seule fois par produit', P.every((x, i) => apres[i] === avant[i] - QTE[i]), avant.join('/') + ' → ' + apres.join('/'));
    const ms = venteId ? C.mouvementsStock(venteId) : 'aucun';
    const msAttendu = P.map((x, i) => x.id + '/' + QTE[i]).sort().join(' ; ');
    const msLus = ms === 'aucun' ? '' : ms.split(' ; ').map((l) => l.split('/').slice(0, 2).join('/')).sort().join(' ; ');
    ok('bilan : un mouvement de stock par ligne, de la bonne quantité', msLus === msAttendu, ms);
    const mvt = venteId ? C.mouvements(venteId) : 'aucun';
    const rec = venteId ? C.recettes(venteId) : 'aucune';
    const reg = venteId ? C.reglements(venteId) : 'aucun';
    ok('bilan caisse : un mouvement, une recette, un règlement, au montant du net', mvt !== 'aucun' && mvt.split(' ; ').length === 1 && Number(mvt.split('/')[2]) === net
      && rec !== 'aucune' && rec.split(' ; ').length === 1 && Number(rec.split('/')[0]) === net && reg !== 'aucun' && reg.split(' ; ').length === 1 && Number(reg.split('/')[1]) === net,
      mvt + ' | ' + rec + ' | ' + reg);

    /* 3. annulation par la liste : tout le stock revient */
    if (v.ref) {
      coupees.push(couperConnexions());
      const a = await C.annulerVente(p, v.ref).catch((e) => 'échec ' + e.message.split('\n')[0]);
      const rendu = P.map((x) => A.stock(x));
      ok('annulation (après une nouvelle coupure) : tout le stock est rendu', a === 200 && rendu.join('/') === avant.join('/'), a + ' ; ' + rendu.join('/') + ' / avant ' + avant.join('/'));
    } else {
      ok('annulation : vente à annuler', false, 'aucune référence');
    }
    ok('aucun refus du serveur pendant l\'annulation', refus.length === 0, refus.join(' | '));
    ok('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' || '));
  } finally {
    await sess.b.close();
    A.nettoyer();
  }
  process.exitCode = A.bilan() ? 1 : 0;
})().catch((e) => { console.error('FATAL', e); try { A.nettoyer(); } catch (_) { /* rien */ } process.exit(2); });
