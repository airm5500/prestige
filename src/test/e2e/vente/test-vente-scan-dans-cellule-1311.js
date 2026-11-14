/* CODE-BARRES LU DANS LA CELLULE DU PRIX OU DE LA QUANTITE (rapport d'exploitation du 13/11, point 9).
 *
 * Constat chez appaul le 13/11 a 13:50, caisse 4 : juste apres un scan, « itemPu : un nombre entier est attendu »
 * (refus 400). La douchette a ecrit le code-barres dans la cellule du prix, encore en saisie : le code partait comme
 * prix, le serveur le refusait, et l'article n'etait pas ajoute.
 *
 * Vrai chemin de l'ecran (vente au comptant) : article 1 tape par son CIP ; clic sur la cellule du prix de sa ligne,
 * puis la douchette « tape » le code de l'article 2 et Entree ; clic sur la cellule de la quantite de la ligne 1, la
 * douchette tape le code de l'article 3 et Entree ; la vente est terminee, puis annulee par la liste.
 * Controles :
 *  - aucun refus du serveur (400/500), aucune fenetre d'erreur ; un avis discret dit ce qui s'est passe ;
 *  - la ligne 1 garde son prix et sa quantite (ecran et base) ; les articles 2 et 3 sont ajoutes, quantite 1 ;
 *  - rapprochement : lignes a l'ecran = lignes en base ; total des lignes = prix de la vente = net ; mouvement de
 *    caisse, recette et reglement = net ;
 *  - bilan : stock avant - 1 par article ; l'annulation rend tout ; aucune erreur JavaScript.
 * Lancement seul : node src/test/e2e/vente/test-vente-scan-dans-cellule-1311.js
 */
const C = require('../ligne-comptant/commun');
const { ok, q, A, vues } = C;

/* clic sur une cellule de la ligne d'un article (colonne par son champ) ; rend vrai si l'editeur est ouvert */
async function cliquerCellule(p, cipProduit, champ) {
  const id = await p.evaluate(([g, c, f]) => {
    const grille = Ext.ComponentQuery.query(g)[0];
    const r = grille.getStore().findRecord('intCIP', c, 0, false, true, true);
    const col = grille.headerCt.getGridColumns().filter((x) => x.dataIndex === f)[0];
    if (!r || !col) { return null; }
    const cellule = grille.getView().getCell(r, col);
    cellule.dom.id = cellule.dom.id || ('e2e-scan-' + Math.random().toString(36).slice(2));
    return cellule.dom.id;
  }, [C.GRILLE, cipProduit, champ]);
  if (!id) { throw new Error('Cellule introuvable : ' + champ + ' ' + cipProduit); }
  await p.click('#' + id);
  await p.waitForTimeout(500);
  return p.evaluate((g) => { const e = Ext.ComponentQuery.query(g)[0].editingPlugin; return !!(e && e.editing); }, C.GRILLE);
}

/* la douchette : les chiffres arrivent vite, puis Entree */
async function douchette(p, code) {
  await p.keyboard.press('Control+A');
  await p.keyboard.type(code, { delay: 8 });
  await p.keyboard.press('Enter');
}

(async () => {
  A.parametre('KEY_PRIX_REF_CAISSE', '0');
  const P = [C.produitSimple(24), C.produitSimple(25), C.produitSimple(26)];
  const CIP = P.map(C.cip);
  A.ouvrirCaisse();
  const avant = P.map((x) => A.stock(x));
  const sess = await C.connecterEtOuvrirVente();
  const { p, erreurs } = sess;
  const refus = [];
  p.on('response', (r) => { if (r.status() >= 400 && /\/api\/v1\/vente\//.test(r.url())) { refus.push(r.status() + ' ' + r.url().replace(/^.*\/api\//, '')); } });
  try {
    await C.taperArticle(p, CIP[0]);
    const ligne1 = () => p.evaluate(([g, c]) => { const r = Ext.ComponentQuery.query(g)[0].getStore().findRecord('intCIP', c, 0, false, true, true);
      return r ? { pu: r.get('intPRICEUNITAIR'), qte: r.get('intQUANTITY') } : null; }, [C.GRILLE, CIP[0]]);
    const l1 = await ligne1();
    const nbLignes = () => p.evaluate((g) => Ext.ComponentQuery.query(g)[0].getStore().getCount(), C.GRILLE);

    /* 1. code-barres dans la cellule du prix (si le profil peut modifier le prix ; sinon la cellule n'edite pas) */
    const prixEditable = await cliquerCellule(p, CIP[0], 'intPRICEUNITAIR');
    if (prixEditable) {
      const ajout = p.waitForResponse((r) => /vente\/add-item|vente\/add\/item|vente\/.*item/.test(r.url()) && r.request().method() === 'POST', { timeout: 30000 }).catch(() => null);
      await douchette(p, CIP[1]);
      await ajout;
      await p.waitForTimeout(2500);
    }
    const avis1 = await vues.texteMessage(p);
    if (avis1) { await vues.repondre(p, 'ok').catch(() => {}); }
    ok('cellule du prix : article 2 ajouté comme un scan, ligne 1 inchangée, aucune fenêtre', !prixEditable
      || ((await nbLignes()) === 2 && JSON.stringify(await ligne1()) === JSON.stringify(l1) && !avis1),
      (prixEditable ? 'éditable' : 'prix non modifiable pour ce profil') + ' ; lignes ' + (await nbLignes()) + ' ; ligne 1 ' + JSON.stringify(await ligne1()) + ' / ' + JSON.stringify(l1) + ' ; fenêtre « ' + avis1 + ' »');
    if (!prixEditable) {
      await C.taperArticle(p, CIP[1]);
    }

    /* 2. code-barres dans la cellule de la quantite */
    const qteEditable = await cliquerCellule(p, CIP[0], 'intQUANTITY');
    const ajout2 = p.waitForResponse((r) => /vente\//.test(r.url()) && r.request().method() === 'POST', { timeout: 30000 }).catch(() => null);
    await douchette(p, CIP[2]);
    await ajout2;
    await p.waitForTimeout(2500);
    const avis2 = await vues.texteMessage(p);
    if (avis2) { await vues.repondre(p, 'ok').catch(() => {}); }
    ok('cellule de la quantité : article 3 ajouté comme un scan, ligne 1 inchangée, aucune fenêtre', qteEditable && (await nbLignes()) === 3
      && JSON.stringify(await ligne1()) === JSON.stringify(l1) && !avis2, 'lignes ' + (await nbLignes()) + ' ; ligne 1 ' + JSON.stringify(await ligne1()) + ' ; fenêtre « ' + avis2 + ' »');
    const avisDiscret = await p.evaluate(() => Array.from(document.querySelectorAll('div')).some((d) => /Code-barres lu dans la cellule/.test(d.textContent || '') && d.children.length < 6));
    ok('un avis discret dit que le code a été lu comme un scan', avisDiscret);
    ok('aucun refus du serveur', refus.length === 0, refus.join(' | '));

    /* 3. rapprochement et cloture */
    const venteId = await C.venteCourante(p);
    C.noterVente(venteId);
    const grille = await p.evaluate((g) => Ext.ComponentQuery.query(g)[0].getStore().getRange()
      .map((r) => ({ cip: r.get('intCIP'), qte: r.get('intQUANTITY'), pu: r.get('intPRICEUNITAIR'), montant: r.get('intPRICE') })), C.GRILLE);
    const ecran = grille.map((g) => g.cip + '/' + g.qte + '/' + g.pu).sort().join(' ; ');
    const lignesBase = venteId ? C.lignes(venteId) : 'aucune';
    const attendu = P.map((x, i) => x.id + '/1').sort().join(' ; ');
    const lus = lignesBase === 'aucune' ? '' : lignesBase.split(' ; ').map((l) => l.split('/').slice(0, 2).join('/')).sort().join(' ; ');
    ok('rapprochement : trois lignes de quantité 1, écran = base', grille.length === 3 && grille.every((g) => Number(g.qte) === 1) && lus === attendu, ecran + ' | ' + lignesBase);
    /* cloture comme la caissiere : net, montant recu, « TERMINER LA VENTE », pas de ticket */
    const netRep = p.waitForResponse((x) => /\/vente\/net\/vno/.test(x.url()), { timeout: 60000 }).catch(() => null);
    await vues.cliquer(p, 'doventemanager #contenu [xtype=toolbar] #netBtn');
    await netRep;
    await p.waitForTimeout(1200);
    if (await vues.texteMessage(p)) { await vues.repondre(p, 'ok').catch(() => {}); }
    const netEcran = await p.evaluate(() => Number(String(Ext.ComponentQuery.query('doventemanager #contenu #montantNet')[0].getValue()).replace(/\D/g, '')));
    for (let essai = 0; essai < 3; essai++) {
      await vues.cliquer(p, 'doventemanager #contenu #montantRecu');
      await p.keyboard.press('Control+A');
      await p.keyboard.type(String(netEcran), { delay: 40 });
      await p.waitForTimeout(300);
      if (await p.evaluate(() => Number(String(Ext.ComponentQuery.query('doventemanager #contenu #montantRecu')[0].getValue()).replace(/\D/g, ''))) === netEcran) { break; }
    }
    await p.keyboard.press('Tab');
    await p.waitForTimeout(800);
    const clot = p.waitForResponse((x) => /\/vente\/cloturer\/vno/.test(x.url()), { timeout: 120000 }).catch(() => null);
    await vues.cliquer(p, 'doventemanager #contenu [xtype=toolbar] #btnCloture');
    const rc = await clot;
    await p.waitForTimeout(1500);
    const mc = await vues.texteMessage(p);
    if (/imprimer le ticket/i.test(mc)) { await vues.repondre(p, 'no'); } else if (mc) { await vues.repondre(p, 'ok').catch(() => {}); }
    await p.waitForTimeout(1200);
    const t = rc ? rc.status() : 'pas de réponse';
    const v = venteId ? C.vente(venteId) : {};
    const somme = grille.reduce((s, g) => s + Number(g.montant), 0);
    ok('rapprochement : total des lignes = prix de la vente en base', somme === v.prix, 'écran ' + somme + ', base ' + v.prix + ' ; clôture ' + JSON.stringify(t).slice(0, 120));
    const net = v.prix - v.remise;
    const mvt = venteId ? C.mouvements(venteId) : 'aucun';
    const rec = venteId ? C.recettes(venteId) : 'aucune';
    const reg = venteId ? C.reglements(venteId) : 'aucun';
    ok('bilan caisse : un mouvement, une recette, un règlement, au net', v.statut === 'is_Closed' && mvt.split(' ; ').length === 1 && Number(mvt.split('/')[2]) === net
      && rec.split(' ; ').length === 1 && Number(rec.split('/')[0]) === net && reg.split(' ; ').length === 1 && Number(reg.split('/')[1]) === net, mvt + ' | ' + rec + ' | ' + reg);
    const apres = P.map((x) => A.stock(x));
    ok('bilan stock : avant − 1 pour chaque article', P.every((x, i) => apres[i] === avant[i] - 1), avant.join('/') + ' → ' + apres.join('/'));
    if (v.ref) {
      const a = await C.annulerVente(p, v.ref).catch((e) => 'échec ' + e.message.split('\n')[0]);
      const rendu = P.map((x) => A.stock(x));
      ok('annulation : tout le stock est rendu', a === 200 && rendu.join('/') === avant.join('/'), a + ' ; ' + rendu.join('/'));
    } else {
      ok('annulation : vente à annuler', false, 'aucune référence');
    }
    ok('aucune erreur JavaScript', erreurs.length === 0, erreurs.join(' || '));
  } finally {
    await sess.b.close();
    A.nettoyer();
  }
  process.exitCode = A.bilan() ? 1 : 0;
})().catch((e) => { console.error('FATAL', e); try { A.nettoyer(); } catch (_) { /* rien */ } process.exit(2); });
