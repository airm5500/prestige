/* MONNAIE DES TICKETS D'UNE VENTE ASSURANCE AVEC VENTE COMPTANT LIEE (ticket 1630805530, analyse du 08/11 validee) :
 * le client tend 2 000 pour 370 (part client) + 1 210 (comptant) ; la monnaie juste (420) etait rendue deux fois
 * sur le papier : ticket assurance 370 / 2 000 / 1 630 a la premiere impression, ticket combine 1 580 / 2 000 / 420.
 *
 * Regle validee : le verse et la monnaie ne figurent qu'une fois, sur le ticket client combine ; le ticket propre a
 * chaque vente montre « Réglé » (sauf differe) et « Vente liée n° … », sans verse ni monnaie, lus en base ; la
 * reimpression d'une vente liee (assurance ou comptant) ressort aussi le ticket client combine.
 *
 * Par le vrai chemin de l'ecran (vente assurance, client, bon, articles tapes, quantite tapee, case « C », AFFICHER NET,
 * montant recu tape, TERMINER LA VENTE, ticket demande). Deux operations aux valeurs differentes :
 *   A : deux articles (quantite 2 en assurance, quantite 1 cochee), le client tend plus que le net (monnaie > 0) ;
 *   B : deux articles (quantite 1, quantite 3 cochee), le client tend le net exact (monnaie 0).
 * Pour chacune, compares :
 *   - ecran (net, monnaie affichee) ;
 *   - premiere impression : les tickets que l'ecran demande a ticket/vo, rejoues sans impression sur l'apercu
 *     ticket/vo/apercu-cloture avec le corps exact envoye par l'ecran ;
 *   - reimpression de la vente assurance et de la vente comptant (apercus) ;
 *   - base (mvttransaction, vente_reglement, t_recettes, t_cash_transaction).
 * Bilan : une recette, un mouvement de caisse, un reglement par vente, aux bons montants ; rien d'autre.
 * Tout est retire a la fin (ventes, client, tiers-payant, parametres, caisse).
 * Lancement seul : node src/test/e2e/retours/test-monnaie-vente-liee-0811.js
 */
const C = require('../ligne-comptant/commun');
const { ok, q, A } = C;



/* quantite tapee dans la cellule QD (meme chemin que la caissiere) */
async function quantite(p, cipProduit, n) {
  const id = await p.evaluate(([g, c]) => { const grille = Ext.ComponentQuery.query(g)[0]; const r = grille.getStore().findRecord('intCIP', c, 0, false, true, true);
    const col = grille.headerCt.getGridColumns().filter((x) => x.dataIndex === 'intQUANTITY')[0]; const cel = grille.getView().getCell(r, col);
    cel.dom.id = cel.dom.id || ('e2e-qd-' + Math.random().toString(36).slice(2)); return cel.dom.id; }, [C.GRILLE, cipProduit]);
  const rep = p.waitForResponse((x) => /update\/item\/vno/.test(x.url()), { timeout: 30000 });
  await p.click('#' + id);
  await p.waitForTimeout(300);
  await p.keyboard.press('Control+A');
  await p.keyboard.type(String(n), { delay: 30 });
  await p.keyboard.press('Enter');
  await rep;
  await p.waitForTimeout(1200);
}

/* les paires d'un ticket relu, sans les blocs d'en-tete (date, heure) : ce qui doit etre identique d'une impression a l'autre */
function empreinte(t) {
  const l = C.lireTicket(t);
  return JSON.stringify({ modele: l.modele, articles: l.articles, net: l.net, paires: Object.keys(l.paires).filter((k) => !/date|heure|imprim/i.test(k)).sort().map((k) => k + '=' + l.paires[k]) });
}
const monnaies = (tickets) => tickets.map(C.lireTicket).filter((l) => l.paires['Monnaie rendue'] !== undefined);
const verses = (l) => ['Espèces versées', 'Montant versé'].filter((k) => l.paires[k] !== undefined);

async function operation(p, api, nom, P, QTE, cochee, tendre) {
  const TP = A.tiersPayant(nom, '1');
  await A.clientAssure(api, nom, [{ tp: TP, taux: 70 }]);
  if (nom !== 'MVA') { await C.nouvelleVente(p); }
  await C.passerEnAssurance(p);
  await C.choisirClient(p, C.MARQUE + ' ' + nom);
  await C.saisirBon(p, 1, C.MARQUE + '-BON-' + nom);
  const CIP = P.map(C.cip);
  for (let i = 0; i < P.length; i++) {
    await C.taperArticle(p, CIP[i]);
    if (QTE[i] > 1) { await quantite(p, CIP[i], QTE[i]); }
  }
  const venteId = await C.venteCourante(p);
  C.noterVente(venteId);
  await C.cocher(p, CIP[cochee]);
  await p.evaluate(() => testextjs.app.getController('VenteCtr').autoComputeNetAssurance());
  await p.waitForResponse((x) => /\/vente\/net\/assurance/.test(x.url()), { timeout: 30000 }).catch(() => {});
  await p.waitForTimeout(1200);
  const rail = await C.rail(p);
  const verse = tendre(rail.net.valeur);
  const clot = await C.terminerVente(p, true, { verse });
  const vnoId = clot.venteLiee;
  C.noterVente(vnoId);
  return { nom, TP, venteId, vnoId, rail, verse, clot };
}

async function verifier(p, o) {
  const N = o.nom + ' : ';
  const { venteId, vnoId, rail, verse, clot } = o;
  ok(N + 'TERMINER LA VENTE : deux ventes liées, ticket demandé par l\'écran', clot.http === 200 && clot.success === true && !!vnoId && clot.ticket && !!clot.ticket.demande,
    JSON.stringify(clot).slice(0, 300));
  const vo = C.vente(venteId), vno = C.vente(vnoId);
  /* ---- base ---- */
  const mvt = (id) => q("SELECT CONCAT_WS('/', montantVerse, montantPaye, montantRestant) FROM mvttransaction WHERE pkey = '" + id + "'").split('/').map(Number);
  const mVo = mvt(venteId), mVno = mvt(vnoId);
  /* part client et comptant payes, arrondis a 5 F par la caisse (au plus proche) : ceux du mouvement de caisse */
  const partClient = mVo[1], comptant = mVno[1], net = partClient + comptant;
  const monnaie = verse - net;
  ok(N + 'écran : net = part client + comptant payés en base (arrondis à 5 F), monnaie affichée = tendu − net (' + monnaie + ')',
    rail.net.valeur === net && clot.monnaieEcran === monnaie && Math.abs(partClient - vo.partClient) <= 2 && Math.abs(comptant - (vno.prix - vno.remise)) <= 2,
    JSON.stringify({ rail: rail.net, monnaieEcran: clot.monnaieEcran, verse, partClient, comptant, partBrute: vo.partClient, comptantBrut: vno.prix - vno.remise }));
  ok(N + 'base : versé des deux ventes = tendu à l\'écran, payé = part client et comptant, monnaie = versé − payé = monnaie de l\'écran',
    mVo[0] + mVno[0] === verse && mVo[1] === partClient && mVno[1] === comptant && (mVo[0] + mVno[0]) - (mVo[1] + mVno[1]) === clot.monnaieEcran,
    JSON.stringify({ mVo, mVno, verse }));
  const nb = (sql) => Number(q(sql));
  const bilan = [venteId, vnoId].map((id) => [nb("SELECT COUNT(*) FROM mvttransaction WHERE pkey = '" + id + "'"),
    nb("SELECT COUNT(*) FROM vente_reglement WHERE vente_id = '" + id + "'"), q("SELECT IFNULL(GROUP_CONCAT(CAST(int_AMOUNT AS SIGNED)), '') FROM t_recettes WHERE str_REF_FACTURE = '" + id + "'")]);
  ok(N + 'bilan : un mouvement de caisse, un règlement, une recette par vente, recette = payé (aucune trace de la monnaie en plus)',
    bilan[0][0] === 1 && bilan[1][0] === 1 && bilan[0][1] === 1 && bilan[1][1] === 1 && bilan[0][2] === String(partClient) && bilan[1][2] === String(comptant),
    JSON.stringify(bilan));

  /* les references imprimees (reference ou numero de ticket selon le reglage du poste) */
  const refs = (id, v) => [v.ref, q("SELECT str_REF_TICKET FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + id + "'")];
  const porte = (texte, r) => r.some((x) => x && String(texte || '').includes(x));

  /* ---- premiere impression : le corps exact envoye par l'ecran, rejoue sans impression ---- */
  const prem = await p.evaluate(async (corps) => (await fetch('../api/v1/vente/ticket/vo/apercu-cloture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corps })).json(),
    clot.ticket.demande);
  const tPrem = (prem.tickets || []);
  const assurPrem = tPrem.filter((t) => t.modele === 'VENTE_ASSURANCE').map(C.lireTicket);
  const combPrem = tPrem.filter((t) => t.modele === 'VENTE_MIXTE').map(C.lireTicket);
  ok(N + 'première impression : ticket(s) assurance (un par organisme) puis un ticket client combiné', prem.success === true && assurPrem.length === 1 && combPrem.length === 1,
    JSON.stringify(tPrem.map((t) => t.modele)) + ' ' + String(prem.msg || ''));
  const mPrem = monnaies(tPrem);
  ok(N + 'première impression : la monnaie n\'est imprimée qu\'une fois, sur le ticket combiné, et vaut celle de l\'écran',
    mPrem.length === 1 && mPrem[0].modele === 'VENTE_MIXTE' && C.chiffres(mPrem[0].paires['Monnaie rendue']) === clot.monnaieEcran,
    JSON.stringify(mPrem.map((l) => [l.modele, l.paires['Monnaie rendue']])));
  if (combPrem[0]) {
    const c = combPrem[0];
    ok(N + 'ticket combiné : net = part client + comptant, versé = tendu à l\'écran',
      c.net === net && verses(c).length === 1 && C.chiffres(c.paires[verses(c)[0]]) === verse, JSON.stringify(c.paires) + ' net ' + c.net);
  }
  if (assurPrem[0]) {
    const a = assurPrem[0];
    ok(N + 'ticket assurance (première impression) : net = part client, « Réglé » = part client, renvoi à la vente comptant, ni versé ni monnaie',
      a.net === partClient && C.chiffres(a.paires['Réglé']) === partClient && porte(a.paires['Vente liée'], refs(vnoId, vno)) && verses(a).length === 0
      && a.paires['Monnaie rendue'] === undefined, JSON.stringify(a.paires) + ' net ' + a.net);
  }

  /* ---- reimpression de la vente assurance ---- */
  const reVo = await C.apercu(p, venteId, false);
  const tReVo = reVo.tickets || [];
  ok(N + 'réimpression de la vente assurance : son ticket puis le ticket client combiné', reVo.success === true && tReVo.length === 2
    && tReVo[0].modele === 'VENTE_ASSURANCE' && tReVo[1].modele === 'VENTE_MIXTE', JSON.stringify(tReVo.map((t) => t.modele)));
  if (tReVo.length === 2 && tPrem.length >= 2) {
    const pa = tPrem.find((t) => t.modele === 'VENTE_ASSURANCE'), pc = tPrem.find((t) => t.modele === 'VENTE_MIXTE');
    ok(N + 'réimpression = première impression : même ticket assurance, même ticket combiné (articles, net, versé, monnaie, réglé)',
      empreinte(tReVo[0]) === empreinte(pa) && empreinte(tReVo[1]) === empreinte(pc), empreinte(tReVo[0]) + ' || ' + empreinte(pa));
  }

  /* ---- reimpression de la vente comptant ---- */
  const reVno = await p.evaluate(async (v) => (await fetch('../api/v1/vente/ticket/vno/' + v + '/apercu')).json(), vnoId);
  const tReVno = reVno.tickets || [];
  ok(N + 'réimpression de la vente comptant : son ticket puis le ticket client combiné', reVno.success === true && tReVno.length === 2
    && tReVno[0].modele === 'VENTE' && tReVno[1].modele === 'VENTE_MIXTE', JSON.stringify(tReVno.map((t) => t.modele)));
  if (tReVno.length >= 1) {
    const v = C.lireTicket(tReVno[0]);
    ok(N + 'ticket comptant réimprimé : net = comptant, « Réglé » = comptant, renvoi à la vente assurance, ni versé ni monnaie',
      v.net === comptant && C.chiffres(v.paires['Réglé']) === comptant && porte(v.paires['Vente liée'], refs(venteId, vo)) && verses(v).length === 0
      && v.paires['Monnaie rendue'] === undefined, JSON.stringify(v.paires) + ' net ' + v.net);
  }
  if (tReVno.length === 2 && tPrem.length >= 2) {
    ok(N + 'ticket combiné de la réimpression comptant = celui de la première impression', empreinte(tReVno[1]) === empreinte(tPrem.find((t) => t.modele === 'VENTE_MIXTE')),
      empreinte(tReVno[1]));
  }
  /* sur toutes les impressions de l'operation, la monnaie n'apparait que sur les tickets combines, toujours la meme */
  const toutes = monnaies(tPrem.concat(tReVo, tReVno));
  ok(N + 'toutes impressions confondues : « Monnaie rendue » seulement sur le ticket combiné, toujours ' + clot.monnaieEcran,
    toutes.length > 0 && toutes.every((l) => l.modele === 'VENTE_MIXTE' && C.chiffres(l.paires['Monnaie rendue']) === clot.monnaieEcran),
    JSON.stringify(toutes.map((l) => [l.modele, l.paires['Monnaie rendue']])));
}

(async () => {
  A.parametre('KEY_LIGNE_COMPTANT_VO', '1');
  A.parametre('KEY_PRIX_REF_CAISSE', '0');
  const PA = [C.produitSimple(12), C.produitSimple(13)];
  const PB = [C.produitSimple(14), C.produitSimple(15)];
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  try {
    /* A : quantite 2 en assurance, 1 cochee ; le client tend le millier superieur + 1 000 (monnaie > 0) */
    const a = await operation(p, api, 'MVA', PA, [2, 1], 1, (net) => (Math.floor(net / 1000) + 2) * 1000);
    await verifier(p, a);
    /* B : quantite 1 en assurance, 3 cochees ; le client tend le net exact (monnaie 0) */
    const b = await operation(p, api, 'MVB', PB, [1, 3], 1, (net) => net);
    await verifier(p, b);
    ok('Aucune erreur JavaScript', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    C.noterVente(await C.venteCourante(p).catch(() => null));
    await sess.b.close();
    A.nettoyer();
    process.exit(A.bilan() ? 1 : 0);
  }
})();
