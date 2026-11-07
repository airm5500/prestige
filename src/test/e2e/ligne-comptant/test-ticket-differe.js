/* PLAN DU 06/11, POINT 6 : UNE VENTE DIFFEREE NE DOIT PAS AFFICHER « ESPECES : 0 » COMME REGLEMENT.
 *
 * Par l'ecran de vente (compte de test) :
 *  A. vente assurance (organisme 70 %), deux produits (quantites 2 et 1, prix differents) dont un coche au comptant,
 *     cloturee en « Differe » : le client ne paie rien. Deux tickets relus sans impression (apercu de la reimpression) :
 *     le ticket assurance et le ticket de la vente comptant liee. Chacun dit « Règlement : Différé », et n'a ni
 *     « Espèces versées : 0 », ni « Montant versé : 0 », ni « Monnaie rendue : 0 ».
 *     Rapprochement : net imprime = dette de la vente en base (part client), comptant imprime = dette de la vente liee.
 *  B. vente assurance (organisme 80 %), deux produits (quantites 3 et 1), payee en especes, montant recu = net : non
 *     regression, le ticket garde « Espèces versées » = net et « Monnaie rendue » ; pas de « Différé ».
 * Bilan : A n'encaisse rien (paye 0 en caisse), B encaisse le net.
 * Tout est retire a la fin (ventes, clients, organismes, parametre).
 * Lancement seul : node src/test/e2e/ligne-comptant/test-ticket-differe.js
 */
const C = require('./commun');
const { ok, q, A } = C;

const nb = (s) => C.chiffres(s);
/* paires de reglement d'un ticket relu : { libelle: valeur } */
const reglement = (t) => {
  const r = {};
  for (const b of t.blocs) {
    if (b.id !== 'REGLEMENT' && b.id !== 'TOTAUX') { continue; }
    for (const e of b.elements) {
      if (e.genre === 'PAIRE' || e.genre === 'ENCADRE') { r[String(e.a).replace(/\s*:\s*$/, '').trim()] = String(e.b || ''); }
    }
  }
  return r;
};
const zeroAffiche = (r) => Object.entries(r).filter(([k, v]) => /esp[eè]ces|vers[eé]|monnaie/i.test(k) && nb(v) === 0);

(async () => {
  A.parametre('KEY_LIGNE_COMPTANT_VO', '1');
  A.parametre('KEY_PRIX_REF_CAISSE', '0');
  const T70 = A.tiersPayant('DIF70', '1');
  const T80 = A.tiersPayant('DIF80', '1');
  const P = [C.produitSimple(21), C.produitSimple(22), C.produitSimple(23), C.produitSimple(24)];
  const CIP = P.map(C.cip);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  const quantite = async (cip, qte) => {
    const id = await p.evaluate(([g, c]) => { const grille = Ext.ComponentQuery.query(g)[0]; const r = grille.getStore().findRecord('intCIP', c, 0, false, true, true);
      const col = grille.headerCt.getGridColumns().filter((x) => x.dataIndex === 'intQUANTITY')[0]; const cel = grille.getView().getCell(r, col);
      cel.dom.id = cel.dom.id || ('e2e-qd-' + Math.random().toString(36).slice(2)); return cel.dom.id; }, [C.GRILLE, cip]);
    const rep = p.waitForResponse((x) => /update\/item\/vno/.test(x.url()), { timeout: 30000 });
    await p.click('#' + id);
    await p.waitForTimeout(300);
    await p.keyboard.press('Control+A');
    await p.keyboard.type(String(qte), { delay: 30 });
    await p.keyboard.press('Enter');
    await rep;
    await p.waitForTimeout(1200);
  };
  const apercuVno = (id) => p.evaluate(async (v) => (await fetch('../api/v1/vente/ticket/vno/' + v + '/apercu')).json(), id);
  try {
    /* ================= A. differe, rien de paye ================= */
    await A.clientAssure(api, 'DIFA', [{ tp: T70, taux: 70 }]);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' DIFA');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-DA');
    await C.taperArticle(p, CIP[0]);
    await C.taperArticle(p, CIP[1]);
    await quantite(CIP[0], 2);
    const vA = await C.venteCourante(p);
    C.noterVente(vA);
    const cA = await C.cocher(p, CIP[1]);
    ok('A. Préparation : P1 × 2 en assurance, P2 coché au comptant', cA && cA.success, JSON.stringify(cA));
    const clotA = await C.terminerVente(p, false, 'differe');
    const vnoA = clotA.venteLiee;
    C.noterVente(vnoA);
    ok('A. Clôture en différé : deux ventes, statut Différé', clotA.success === true && !!vnoA && C.vente(vA).statutVente === 'Differe', JSON.stringify(clotA).slice(0, 200));

    const apA = await C.apercu(p, vA, false);
    const tA = apA.success && apA.tickets[0];
    const rA = tA ? reglement(tA) : {};
    const detteA = Number(C.dettes(vA).split('/')[1]);
    ok('A. Ticket assurance : « Règlement : Différé »', /diff[eé]r[eé]/i.test(rA['Règlement'] || ''), JSON.stringify(rA));
    ok('A. Ticket assurance : ni « Espèces versées : 0 », ni « Montant versé : 0 », ni « Monnaie rendue : 0 »', tA && zeroAffiche(rA).length === 0, JSON.stringify(zeroAffiche(rA)));
    ok('A. Rapprochement : net imprimé = dette de la vente en base = part client', tA && C.lireTicket(tA).net === detteA && detteA === C.vente(vA).partClient && detteA > 0,
      'ticket ' + (tA && C.lireTicket(tA).net) + ' ; dette ' + detteA + ' ; part client ' + C.vente(vA).partClient);

    const apN = await apercuVno(vnoA);
    const tN = apN.success && apN.tickets[0];
    const rN = tN ? reglement(tN) : {};
    const detteN = Number(C.dettes(vnoA).split('/')[1]);
    ok('A. Ticket de la vente comptant liée : « Règlement : Différé », aucune ligne de versement ou de monnaie à 0',
      /diff[eé]r[eé]/i.test(rN['Règlement'] || '') && zeroAffiche(rN).length === 0, JSON.stringify(rN));
    ok('A. Rapprochement : net imprimé du comptant = dette de la vente liée en base', tN && C.lireTicket(tN).net === detteN && detteN > 0,
      'ticket ' + (tN && C.lireTicket(tN).net) + ' ; dette ' + detteN);
    /* ticket client combine (assurance + comptant), s'il sort pour cette vente */
    const apC = await C.apercu(p, vA, true);
    const tC = apC.success && apC.tickets && apC.tickets[0];
    if (tC) {
      const rC = reglement(tC);
      ok('A. Ticket combiné : « Règlement : Différé », aucune ligne de versement ou de monnaie à 0',
        /diff[eé]r[eé]/i.test(rC['Règlement'] || '') && zeroAffiche(rC).length === 0, JSON.stringify(rC));
    } else {
      console.log('INFO  A. Pas de ticket combiné pour cette vente  [' + JSON.stringify(apC).slice(0, 200) + ']');
    }
    ok('A. Bilan : rien encaissé (payé 0 sur les deux mouvements de caisse)', Number(C.mouvements(vA).split('/')[6]) === 0 && Number(C.mouvements(vnoA).split('/')[6]) === 0,
      C.mouvements(vA) + ' || ' + C.mouvements(vnoA));

    /* ================= B. especes, non regression ================= */
    await A.clientAssure(api, 'DIFB', [{ tp: T80, taux: 80 }]);
    await C.nouvelleVente(p);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' DIFB');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-DB');
    await C.taperArticle(p, CIP[2]);
    await C.taperArticle(p, CIP[3]);
    await quantite(CIP[2], 3);
    const vB = await C.venteCourante(p);
    C.noterVente(vB);
    const clotB = await C.terminerVente(p, false);
    ok('B. Clôture payée en espèces', clotB.success === true, JSON.stringify(clotB).slice(0, 200));
    const apB = await C.apercu(p, vB, false);
    const tB = apB.success && apB.tickets[0];
    const rB = tB ? reglement(tB) : {};
    const netB = tB ? C.lireTicket(tB).net : null;
    /* le net imprime est la part client arrondie a 5 F */
    ok('B. Ticket : « Espèces versées » = net imprimé = part client en base (arrondie à 5 F), et « Monnaie rendue » présente ; pas de « Différé »',
      netB > 0 && nb(rB['Espèces versées']) === netB && Math.abs(netB - C.vente(vB).partClient) <= 4 && netB % 5 === 0
      && 'Monnaie rendue' in rB && !/diff[eé]r[eé]/i.test(JSON.stringify(rB)),
      JSON.stringify(rB) + ' net ' + netB + ' part client ' + C.vente(vB).partClient);
    ok('B. Bilan : le net est encaissé une fois (payé = net)', Number(C.mouvements(vB).split('/')[6]) === netB, C.mouvements(vB));
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
