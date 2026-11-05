/* CAS 2, TEST DE RAPPROCHEMENT (regle du 05/11) : un prix ou un taux de reference saisi a la caisse est la MEME donnee
 * partout ou elle se voit : cellule de la grille, modele de la ligne, service de la vente, fiche article (service et
 * ecran), table prix_reference, journal, net affiche, net du serveur, puis, la vente close par l'ecran, part de
 * l'organisme et taux par ligne en base. Compare ligne par ligne, avec des valeurs differentes d'une ligne a l'autre.
 *
 * Parcours (compte de test, KEY_PRIX_REF_CAISSE a 1 le temps du test, organisme d'essai a 80 %) :
 *  1. Ventes > nouvelle vente > « Assurance » > client assure > quatre articles tapes par leur CIP ; QD de la ligne 2
 *     mise a 2 et de la ligne 3 a 3 par la cellule de la grille ;
 *  2. ligne 1 : P.REF = prix - 150 ; ligne 2 : TAUX 65 ; ligne 3 : P.REF = prix - 300 puis TAUX 45 ; ligne 4 : rien ;
 *  3. rapprochement de chaque ligne sur les huit endroits ; net = regle (somme des bases x taux) = serveur = ecran ;
 *  4. AFFICHER NET A PAYER, montant recu, TERMINER LA VENTE (sans impression) : part de l'organisme en base = part
 *     affichee avant la cloture ; taux_produit = taux de chaque ligne avec reference, aucun pour la ligne sans ;
 *  5. fiche article de la ligne 3 : liste et historique a l'ecran = service = base.
 * Le ticket imprime est rapproche par test-rapprochement-ticket.js (branche d'integration, apercu du ticket).
 * Tout est retire a la fin. Lancement seul : node src/test/e2e/prix-reference/test-rapprochement-caisse-fiche-base.js
 */
const C = require('./commun');
const { ok, q, A } = C;

const chiffres = (t) => Number(String(t || '').replace(/[^\d]/g, '')) || 0;
const lire = (p, url) => p.evaluate(async (u) => (await fetch(u)).json(), url);

/* QD d'une ligne par la cellule de la grille : clic, nombre, Entree, reponse de l'ecran */
async function fixerQuantite(p, cipProduit, n) {
  const id = await p.evaluate(([g, c]) => { const grille = Ext.ComponentQuery.query(g)[0]; const r = grille.getStore().findRecord('intCIP', c, 0, false, true, true);
    const col = grille.headerCt.getGridColumns().filter((x) => x.dataIndex === 'intQUANTITY')[0]; const cel = grille.getView().getCell(r, col);
    cel.dom.id = cel.dom.id || ('e2e-qd-' + c); return cel.dom.id; }, [C.GRILLE, cipProduit]);
  const rep = p.waitForResponse((r) => /\/vente\/update\/item/.test(r.url()), { timeout: 30000 });
  rep.catch(() => {});
  await p.click('#' + id);
  await p.waitForTimeout(400);
  await p.keyboard.press('Control+A');
  await p.keyboard.type(String(n), { delay: 30 });
  await p.keyboard.press('Enter');
  await rep;
  await p.waitForTimeout(1500);
}

/* TERMINER LA VENTE par l'ecran, sans impression : net pose, montant recu, cloture ; renvoie la reponse de cloturer/assurance */
async function terminerVente(p) {
  const net = p.waitForResponse((x) => /\/vente\/net\/assurance/.test(x.url()), { timeout: 30000 });
  net.catch(() => {});
  await C.vues.cliquer(p, 'doventemanager #contenu [xtype=toolbar] #netBtn');
  await net;
  await p.waitForTimeout(1200);
  if (await C.vues.texteMessage(p)) { await C.vues.repondre(p, 'ok').catch(() => {}); }
  const affiche = await C.netAffiche(p);
  await C.vues.cliquer(p, 'doventemanager #contenu #montantRecu');
  await p.keyboard.press('Control+A');
  await p.keyboard.type(String(affiche.net), { delay: 20 });
  await p.keyboard.press('Tab');
  await p.waitForTimeout(500);
  const rep = p.waitForResponse((x) => /\/vente\/cloturer\/assurance/.test(x.url()), { timeout: 120000 });
  rep.catch(() => {});
  await C.vues.cliquer(p, 'doventemanager #contenu [xtype=toolbar] #btnCloture');
  const x = await Promise.race([rep, (async () => { for (let i = 0; i < 60; i++) { await p.waitForTimeout(2000); const m = await C.vues.texteMessage(p);
    if (m && !/patienter/i.test(m)) { throw new Error('Message à la clôture : ' + m); } } throw new Error('Pas de réponse de clôture'); })()]);
  const corps = await x.json().catch(() => ({}));
  corps.http = x.status();
  corps.affiche = affiche;
  await p.waitForTimeout(1500);
  const message = await C.vues.texteMessage(p);
  if (/imprimer/i.test(message)) { await C.vues.repondre(p, 'no').catch(() => {}); }
  await p.waitForTimeout(1500);
  return corps;
}

(async () => {
  A.parametre('KEY_PRIX_REF_CAISSE', '1');
  const TAUX_TP = 80;
  const TP = A.tiersPayant('RAP', '1');
  const P = [C.produitSansReference(5), C.produitSansReference(6), C.produitSansReference(7), C.produitSansReference(8)];
  const CIP = P.map(C.cip);
  /* ce que l'on va saisir, different d'une ligne a l'autre ; la ligne 4 ne recoit rien */
  const QTE = [1, 2, 3, 1];
  const SAISIE = [{ valeur: P[0].pu - 150 }, { taux: 65 }, { valeur: P[2].pu - 300, taux: 45 }, null];
  const attendu = P.map((p, i) => ({
    valeur: SAISIE[i] && SAISIE[i].valeur !== undefined ? SAISIE[i].valeur : p.pu,
    taux: SAISIE[i] && SAISIE[i].taux !== undefined ? SAISIE[i].taux : TAUX_TP,
    enBase: !!SAISIE[i] }));
  const base = (i) => attendu[i].valeur * QTE[i];
  const partLigne = (i) => base(i) * attendu[i].taux / 100;
  const partTp = Math.round(attendu.reduce((s, _, i) => s + partLigne(i), 0));
  const prixTotal = P.reduce((s, p, i) => s + p.pu * QTE[i], 0);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  let venteId = null;
  try {
    await A.clientAssure(api, 'RAP', [{ tp: TP, taux: TAUX_TP }]);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' RAP');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-RAP');
    for (const c of CIP) { await C.taperArticle(p, c); }
    venteId = await C.venteCourante(p);
    C.noterVente(venteId);
    await fixerQuantite(p, CIP[1], 2);
    await fixerQuantite(p, CIP[2], 3);
    const lignesBase = q("SELECT GROUP_CONCAT(CONCAT(lg_FAMILLE_ID, '=', int_QUANTITY, 'x', int_PRICE_UNITAIR) ORDER BY lg_FAMILLE_ID SEPARATOR ' ; ') FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'");
    ok('Préparation : vente assurance à quatre lignes, quantités 1, 2, 3, 1 posées par la grille', !!venteId
      && P.every((x, i) => lignesBase.indexOf(x.id + '=' + QTE[i] + 'x' + x.pu) >= 0), lignesBase);

    /* 2. saisies par la cellule, Entree */
    const r1 = await C.saisirEtEnregistrer(p, CIP[0], TP, 'valeur', SAISIE[0].valeur);
    const r2 = await C.saisirEtEnregistrer(p, CIP[1], TP, 'taux', SAISIE[1].taux);
    const r3a = await C.saisirEtEnregistrer(p, CIP[2], TP, 'valeur', SAISIE[2].valeur);
    const r3b = await C.saisirEtEnregistrer(p, CIP[2], TP, 'taux', SAISIE[2].taux);
    ok('Quatre saisies acceptées (P.REF ligne 1, TAUX ligne 2, P.REF puis TAUX ligne 3)', [r1, r2, r3a, r3b].every((r) => r.http === 200 && r.success === true),
      JSON.stringify([r1, r2, r3a, r3b].map((r) => r.http + '/' + r.success)));

    /* 3. rapprochement ligne par ligne */
    const serviceVente = (await lire(p, '../api/v1/prix-reference/vente/' + venteId)).data || [];
    for (let i = 0; i < P.length; i++) {
      const l = await C.ligne(p, CIP[i]);
      const ref = l && l.refs && l.refs.find((x) => x.tpId === TP);
      const cellule = l && { valeur: chiffres(l.cellules[0] && l.cellules[0].texte), taux: chiffres(l.cellules[1] && l.cellules[1].texte) };
      const svc = serviceVente.find((x) => x.detailId === l.detailId && x.tpId === TP) || {};
      const fiche = ((await lire(p, '../api/v1/prix-reference/' + P[i].id)).data || []).find((x) => x.tiersPayantId === TP);
      const enBase = C.references(P[i].id);
      const a = attendu[i];
      const d = { cellule, modele: ref && { valeur: ref.valeur, taux: ref.taux, defaut: ref.defaut }, service: { valeur: svc.valeur, taux: svc.taux, defaut: svc.defaut, type: svc.type },
        fiche: fiche && { valeur: fiche.valeur, taux: fiche.taux, type: fiche.type }, base: enBase, attendu: a };
      ok('Ligne ' + (i + 1) + ' : cellule = modèle = service de la vente = attendu (' + a.valeur + ' / ' + a.taux + ' %' + (a.enBase ? ', enregistré' : ', par défaut') + ')',
        cellule && cellule.valeur === a.valeur && cellule.taux === a.taux && ref && ref.valeur === a.valeur && ref.taux === a.taux && ref.defaut === !a.enBase
        && svc.valeur === a.valeur && svc.taux === a.taux && svc.defaut === !a.enBase, JSON.stringify(d));
      if (a.enBase) {
        ok('Ligne ' + (i + 1) + ' : fiche article (service) = table prix_reference = saisie (MIX, ' + a.valeur + ', ' + a.taux + ' %)',
          fiche && fiche.valeur === a.valeur && Number(fiche.taux) === a.taux && fiche.type === 'MIX_TAUX_PRIX' && enBase === TP + '/MIX_TAUX_PRIX/' + a.valeur + '/' + a.taux + '/1',
          JSON.stringify(d));
      } else {
        ok('Ligne ' + (i + 1) + ' : rien en fiche article ni en base (valeurs par défaut jamais enregistrées)', !fiche && enBase === 'aucune', JSON.stringify(d));
      }
    }
    const j1 = C.journal(P[0].id); const j2 = C.journal(P[1].id); const j3 = C.journal(P[2].id); const j4 = C.journal(P[3].id);
    ok('Journal : AJOUT sur les lignes 1 et 2, AJOUT puis MODIFICATION (taux 80 → 45) sur la ligne 3, rien sur la 4, tous portant la vente',
      new RegExp('^AJOUT/NULL/' + attendu[0].valeur + '/NULL/80/MIX_TAUX_PRIX/' + venteId + '/').test(j1)
      && new RegExp('^AJOUT/NULL/' + P[1].pu + '/NULL/65/MIX_TAUX_PRIX/' + venteId + '/').test(j2)
      && new RegExp('^AJOUT/NULL/' + attendu[2].valeur + '/NULL/80/MIX_TAUX_PRIX/' + venteId + '/[^;]+ ; MODIFICATION/' + attendu[2].valeur + '/' + attendu[2].valeur + '/80/45/MIX_TAUX_PRIX/' + venteId + '/').test(j3)
      && j4 === 'aucun', [j1, j2, j3, j4].join(' || '));

    /* net : regle = serveur = ecran */
    const ecran = await C.netAffiche(p);
    const serveur = (await C.netServeur(sess, venteId)).data || {};
    ok('Part de l\'organisme : règle (somme des bases × taux de chaque ligne = ' + partTp + ') = serveur = écran (±1)',
      Math.abs(serveur.montantTp - partTp) <= 1 && ecran.montantTp === serveur.montantTp && ecran.partTp === serveur.montantTp,
      JSON.stringify({ regle: partTp, serveur: { tp: serveur.montantTp, net: serveur.montantNet, montant: serveur.montant }, ecran }));
    ok('Net à payer : écran = serveur, = prix (' + prixTotal + ') - part de l\'organisme (arrondi d\'affichage à 5 F près)',
      ecran.net === serveur.montantNet && ecran.montantNet === serveur.montantNet && Math.abs(serveur.montantNet - (prixTotal - partTp)) <= 5,
      JSON.stringify({ ecran, serveur: serveur.montantNet, prix: prixTotal, part: partTp }));

    /* 4. cloture par l'ecran */
    const clot = await terminerVente(p);
    ok('TERMINER LA VENTE : succès', clot.http === 200 && clot.success === true, JSON.stringify(clot).slice(0, 300));
    const vente = q("SELECT CONCAT_WS('|', str_STATUT, int_PRICE, int_CUST_PART) FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'").split('|');
    const partBase = Number(q("SELECT IFNULL(SUM(int_PRICE), -1) FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'"));
    ok('Vente close : part de l\'organisme en base = part affichée avant la clôture = règle ; prix total en base = ' + prixTotal,
      vente[0] === 'is_Closed' && Number(vente[1]) === prixTotal && partBase === clot.affiche.montantTp && Math.abs(partBase - partTp) <= 1,
      vente.join('|') + ' part ' + partBase + ' / écran ' + clot.affiche.montantTp + ' / règle ' + partTp);
    ok('Part du client en base = prix - part de l\'organisme (à 4 F près, l\'écran arrondit à 5 F)', Math.abs(Number(vente[2]) - (prixTotal - partBase)) <= 4, vente[2] + ' / ' + (prixTotal - partBase));
    const tauxLignes = q("SELECT IFNULL(GROUP_CONCAT(CONCAT(d.lg_FAMILLE_ID, '=', ROUND(t.taux * 100)) ORDER BY d.lg_FAMILLE_ID SEPARATOR ' ; '), 'aucun')"
      + " FROM taux_produit t JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_DETAIL_ID = t.sale_iem_id WHERE d.lg_PREENREGISTREMENT_ID = '" + venteId + "'");
    const parts = tauxLignes === 'aucun' ? [] : tauxLignes.split(' ; ');
    ok('taux_produit : un seul taux par ligne avec référence (80, 65, 45 = taux affichés), aucun pour la ligne sans référence',
      parts.length === 3 && new Set(parts.map((x) => x.split('=')[0])).size === 3 && [0, 1, 2].every((i) => parts.indexOf(P[i].id + '=' + attendu[i].taux) >= 0)
      && !parts.some((x) => x.startsWith(P[3].id + '=')), tauxLignes);

    /* 5. fiche article de la ligne 3 : ecran = service = base */
    await C.ouvrirEcran(p, 'famillemanager');
    await p.waitForFunction(() => Ext.getCmp('rechecher') && Ext.getCmp('rechecher').isVisible(true), null, { timeout: 60000 });
    await C.vues.cliquer(p, '#rechecher');
    await p.keyboard.press('Control+A');
    await p.keyboard.type(CIP[2], { delay: 20 });
    await p.keyboard.press('Enter');
    const ligneArticle = p.locator('.x-grid-row').filter({ visible: true, hasText: CIP[2] }).first();
    await ligneArticle.waitFor({ timeout: 60000 });
    await p.waitForTimeout(800);
    if (await ligneArticle.locator('.fa-action-prix').count() > 0) {
      await ligneArticle.locator('.fa-action-prix').first().click();
    } else {
      await ligneArticle.locator('.fa-action-plus').first().click();
      await p.locator('.x-menu-item').filter({ visible: true, hasText: 'Prix de référence' }).first().click();
    }
    await p.waitForFunction(() => Ext.ComponentQuery.query('prixReference').some((w) => w.isVisible(true)), null, { timeout: 30000 });
    await p.waitForTimeout(1500);
    const fiche = await p.evaluate(() => { const w = Ext.ComponentQuery.query('prixReference')[0];
      return { prix: w.down('#prixGrid').getStore().getRange().map((r) => r.getData()), journal: w.down('#journalGrid').getStore().getRange().map((r) => r.getData()) }; });
    const svcFiche = ((await lire(p, '../api/v1/prix-reference/' + P[2].id)).data || []);
    const a3 = attendu[2];
    ok('Fiche article (écran) : la référence de la ligne 3 = service = base (MIX, ' + a3.valeur + ', ' + a3.taux + ' %)', fiche.prix.length === 1 && svcFiche.length === 1
      && fiche.prix[0].valeur === a3.valeur && fiche.prix[0].taux === a3.taux && fiche.prix[0].type === 'MIX_TAUX_PRIX'
      && svcFiche[0].valeur === a3.valeur && Number(svcFiche[0].taux) === a3.taux && C.references(P[2].id) === TP + '/MIX_TAUX_PRIX/' + a3.valeur + '/' + a3.taux + '/1',
      JSON.stringify({ ecran: fiche.prix, service: svcFiche, base: C.references(P[2].id) }));
    const journalSvc = (await lire(p, '../api/v1/prix-reference/' + P[2].id + '/journal')).data || [];
    ok('Fiche article (écran) : historique = service = base (Ajout puis Modification, origine « Caisse — vente … », taux 80 → 45)',
      fiche.journal.length === 2 && journalSvc.length === 2 && fiche.journal[0].action === 'Modification' && fiche.journal[1].action === 'Ajout'
      && fiche.journal.every((j) => /^Caisse — vente /.test(j.origine)) && /taux 80 %/.test(fiche.journal[1].apres) && /taux 45 %/.test(fiche.journal[0].apres)
      && JSON.stringify(fiche.journal.map((j) => [j.action, j.avant, j.apres])) === JSON.stringify(journalSvc.map((j) => [j.action, j.avant, j.apres]))
      && C.journal(P[2].id).split(' ; ').length === 2, JSON.stringify({ ecran: fiche.journal, service: journalSvc }));
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    C.noterVente(await C.venteCourante(p).catch(() => null));
    C.retirerReferences();
    await sess.b.close();
    C.nettoyer();
    process.exit(A.bilan() ? 1 : 0);
  }
})();
