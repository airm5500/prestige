/* CAS 1 DU 03/11/2026, TEST DE RAPPROCHEMENT ECRAN / TICKETS / BASE (regle du 05/11) : une vente assurance a trois
 * lignes de quantites differentes (2, 1 cochee « C », 3), remise produit 5 %, un tiers-payant a 70 %, terminee par
 * l'ecran ; puis la meme donnee est relue partout et comparee ligne par ligne :
 *  - l'ecran avant la cloture (grille : quantite, prix, montant, coche ; rail : net, part tiers-payant, DONT COMPTANT,
 *    DONT PART CLIENT) ;
 *  - la base apres la cloture (lignes de chaque vente, part de l'organisme, part client, mouvement de caisse) ;
 *  - le ticket assurance relu par l'apercu (lignes assurance seulement, rien sous les lignes au taux de l'assurance (point 5.2 du 06/11), bloc client,
 *    net ; aucune ligne de la vente comptant, seulement le renvoi « Vente liée n° … » ; puis le ticket client combine,
 *    ressorti par la reimpression (decision du 08/11, monnaie des ventes liees)) ;
 *  - le ticket client combine relu par l'apercu (section assurance, section comptant, part du client, comptant, TTC des
 *    deux ventes, net) ;
 *  - le detail de vente (« Ventes terminees ») : vente liee et sa reference, dans les deux sens.
 * E2E_DEFAUT=1 : apres la cloture, le prix de la vente comptant est altere en base (+100) ; le test doit alors ECHOUER
 * sur les rapprochements du ticket combine et du detail : c'est la preuve qu'il voit un ecart (regle « echoue
 * d'abord »). Lancement seul : node src/test/e2e/ligne-comptant/test-rapprochement-ligne-comptant.js
 */
const C = require('./commun');
const { ok, q, exec, A } = C;

const arrondi5 = (v) => (v <= 0 ? 0 : (v % 5 === 0 ? v : v + (5 - (v % 5))));

(async () => {
  A.parametre('KEY_LIGNE_COMPTANT_VO', '1');
  A.parametre('KEY_PRIX_REF_CAISSE', '0');
  const TP = A.tiersPayant('RL', '1');
  const P = [C.produitSimple(9), C.produitSimple(10), C.produitSimple(11)];
  const CIP = P.map(C.cip);
  const QTE = [2, 1, 3];
  C.remiseEssai(5, P);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  const DEFAUT = process.env.E2E_DEFAUT === '1';
  let venteId = null;
  try {
    const cl = await A.clientAssure(api, 'RAPL', [{ tp: TP, taux: 70 }]);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' RAPL');
    await C.saisirBon(p, 1, C.MARQUE + '-BON-RL');
    for (let i = 0; i < 3; i++) {
      await C.taperArticle(p, CIP[i]);
      if (QTE[i] > 1) {
        /* quantite tapee dans la cellule QD de la ligne (meme chemin que la caissiere) */
        const id = await p.evaluate(([g, c]) => { const grille = Ext.ComponentQuery.query(g)[0]; const r = grille.getStore().findRecord('intCIP', c, 0, false, true, true);
          const col = grille.headerCt.getGridColumns().filter((x) => x.dataIndex === 'intQUANTITY')[0]; const cel = grille.getView().getCell(r, col);
          cel.dom.id = cel.dom.id || ('e2e-qd-' + Math.random().toString(36).slice(2)); return cel.dom.id; }, [C.GRILLE, CIP[i]]);
        const rep = p.waitForResponse((x) => /update\/item\/vno/.test(x.url()), { timeout: 30000 });
        await p.click('#' + id);
        await p.waitForTimeout(300);
        await p.keyboard.press('Control+A');
        await p.keyboard.type(String(QTE[i]), { delay: 30 });
        await p.keyboard.press('Enter');
        await rep;
        await p.waitForTimeout(1200);
      }
    }
    venteId = await C.venteCourante(p);
    C.noterVente(venteId);
    await C.choisirRemise(p, C.MARQUE + ' 5');
    const put = await C.cocher(p, CIP[1]);
    ok('Préparation : vente assurance à trois lignes (quantités 2, 1, 3), remise 5 %, deuxième ligne cochée', !!venteId && put && put.success === true
      && C.lignes(venteId).split(' ; ').length === 3, venteId + ' ' + C.lignes(venteId));
    await p.evaluate(() => testextjs.app.getController('VenteCtr').autoComputeNetAssurance());
    await p.waitForResponse((x) => /\/vente\/net\/assurance/.test(x.url()), { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(1200);

    /* ---- l'ecran ---- */
    const ecran = [];
    for (const c of CIP) { ecran.push(await C.ligne(p, c)); }
    const rail = await C.rail(p);
    ok('Écran : quantités 2, 1, 3, montant = quantité × prix sur chaque ligne, seule la deuxième cochée',
      ecran.every((l, i) => l && l.montant === QTE[i] * P[i].pu) && ecran.map((l) => (l.comptant ? 'C' : '-')).join('') === '-C-', JSON.stringify(ecran));
    const totalAssurance = QTE[0] * P[0].pu + QTE[2] * P[2].pu;
    const totalComptant = QTE[1] * P[1].pu;
    const remiseComptant = Math.floor(totalComptant * 5 / 100);
    const comptantAttendu = arrondi5(totalComptant - remiseComptant);
    ok('Écran : DONT COMPTANT = ligne cochée − 5 % arrondi à 5, DONT PART CLIENT = net − comptant, net = part client + comptant',
      rail.comptant.valeur === comptantAttendu && rail.partClient.valeur === rail.net.valeur - rail.comptant.valeur && rail.net.valeur === rail.montantNet
      && rail.montantTp > 0 && Math.abs(rail.montantTp - totalAssurance * 0.7) <= 2, JSON.stringify(rail) + ' attendu comptant ' + comptantAttendu);

    /* ---- la cloture, puis la base ---- */
    const clot = await C.terminerVente(p, false);
    ok('TERMINER LA VENTE : succès, vente liée', clot.http === 200 && clot.success === true && !!clot.venteLiee, JSON.stringify(clot).slice(0, 250));
    const vnoId = clot.venteLiee;
    C.noterVente(vnoId);
    if (DEFAUT) {
      exec("UPDATE t_preenregistrement SET int_PRICE = int_PRICE + 100 WHERE lg_PREENREGISTREMENT_ID = '" + vnoId + "'");
      console.log('      (E2E_DEFAUT : prix de la vente comptant altéré de +100 en base ; les rapprochements suivants doivent échouer)');
    }
    const vo = C.vente(venteId), vno = C.vente(vnoId);
    /* le ticket porte la reference ou le numero de ticket selon le reglage du poste (KEY_SHOW_NUMERO_TICKET) */
    const refsVo = [vo.ref, q("SELECT str_REF_TICKET FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'")];
    const refsVno = [vno.ref, q("SELECT str_REF_TICKET FROM t_preenregistrement WHERE lg_PREENREGISTREMENT_ID = '" + vnoId + "'")];
    const porte = (texte, refs) => refs.some((r) => r && String(texte).includes(r));
    const partTpBase = Number(q("SELECT IFNULL(SUM(int_PRICE), 0) FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'"));
    const lignesVo = q("SELECT GROUP_CONCAT(CONCAT_WS('/', lg_FAMILLE_ID, int_QUANTITY, int_PRICE_UNITAIR, int_PRICE) ORDER BY dt_CREATED) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + venteId + "'");
    const lignesVno = q("SELECT GROUP_CONCAT(CONCAT_WS('/', lg_FAMILLE_ID, int_QUANTITY, int_PRICE_UNITAIR, int_PRICE) ORDER BY dt_CREATED) FROM t_preenregistrement_detail WHERE lg_PREENREGISTREMENT_ID = '" + vnoId + "'");
    ok('Base = écran : vente assurance = lignes 1 et 3 (2 × prix, 3 × prix), vente comptant = ligne 2 (1 × prix)',
      lignesVo === P[0].id + '/2/' + P[0].pu + '/' + 2 * P[0].pu + ',' + P[2].id + '/3/' + P[2].pu + '/' + 3 * P[2].pu
      && lignesVno === P[1].id + '/1/' + P[1].pu + '/' + P[1].pu, lignesVo + ' || ' + lignesVno);
    ok('Base = écran : part de l\'organisme, part client (arrondie à 5) et comptant en base = rail affiché avant la clôture',
      partTpBase === rail.montantTp && arrondi5(vo.partClient) === rail.partClient.valeur && arrondi5(vno.prix - vno.remise) === rail.comptant.valeur
      && vo.prix === totalAssurance && vno.prix === totalComptant, JSON.stringify({ partTpBase, vo, vno, rail }));
    const mvtVo = C.mouvements(venteId).split('/'), mvtVno = C.mouvements(vnoId).split('/');
    ok('Base : mouvement de caisse de chaque vente = part client / comptant affichés (montant payé)',
      Number(mvtVo[6]) === rail.partClient.valeur && Number(mvtVno[6]) === rail.comptant.valeur && Number(mvtVo[3]) === partTpBase, C.mouvements(venteId) + ' || ' + C.mouvements(vnoId));

    /* ---- le ticket assurance ---- */
    const ap = await C.apercu(p, venteId, false);
    ok('Ticket assurance relu par l\'aperçu (modèle VENTE_ASSURANCE)', ap.success === true && ap.tickets && ap.tickets.length >= 1 && ap.tickets[0].modele === 'VENTE_ASSURANCE', JSON.stringify(ap).slice(0, 200));
    const ta = C.lireTicket(ap.tickets[0]);
    ok('Ticket assurance = base : deux lignes (1 et 3) avec leurs quantités et montants, la ligne cochée absente',
      ta.articles.length === 2 && ta.articles[0].quantite === 2 && ta.articles[0].montant === 2 * P[0].pu && ta.articles[1].quantite === 3 && ta.articles[1].montant === 3 * P[2].pu,
      JSON.stringify(ta.articles));
    /* plan du 06/11, point 5.2 (remplace le « Taux 70 % sous chaque ligne » du cas 1) : lignes au taux de l'assurance,
       rien de saisi -> aucune ligne prix/taux sous le produit ; leur part reste dans le bloc de l'organisme */
    const parts = ta.articles.map((a) => Math.round(a.montant * 0.7));
    ok('Ticket assurance (point 5.2) : aucune ligne « Taux » ni « P[…] » sous les lignes au taux de l\'assurance ; somme des parts (base × 70 %) = part de l\'organisme en base (±2 F)',
      ta.articles.every((a) => a.credits.length === 0) && Math.abs(parts.reduce((s, x) => s + x, 0) - partTpBase) <= 2,
      JSON.stringify(ta.articles.map((a) => a.credits)) + ' parts ' + parts.join(',') + ' / base ' + partTpBase);
    const blocTp = Object.keys(ta.paires).filter((k) => k.indexOf(TP) === 0).map((k) => C.chiffres(ta.paires[k]))[0];
    /* decision du 08/11 (monnaie des ventes liees) : le ticket assurance renvoie a la vente comptant par « Vente liée »,
       sans aucune de ses lignes ni le mot COMPTANT ; la reimpression ressort ensuite le ticket client combine */
    ok('Ticket assurance : bloc client = part de l\'organisme en base, net imprimé = part client affichée, aucune ligne de la vente comptant, renvoi « Vente liée » à sa référence',
      blocTp === partTpBase && ta.net === rail.partClient.valeur && !JSON.stringify(ap.tickets[0]).toUpperCase().includes('COMPTANT')
      && porte(ta.paires['Vente liée'], refsVno) && ap.tickets.length === 2 && ap.tickets[1].modele === 'VENTE_MIXTE',
      'bloc ' + blocTp + ' net ' + ta.net + ' ' + JSON.stringify(ta.paires));

    /* ---- le ticket client combine ---- */
    const ac = await C.apercu(p, venteId, true);
    ok('Ticket client combiné relu par l\'aperçu (modèle VENTE_MIXTE)', ac.success === true && ac.tickets && ac.tickets.length === 1 && ac.tickets[0].modele === 'VENTE_MIXTE', JSON.stringify(ac).slice(0, 200));
    const tc = C.lireTicket(ac.tickets[0]);
    const sec1 = tc.articles.filter((a) => a.section === 1), sec2 = tc.articles.filter((a) => a.section === 2);
    ok('Ticket combiné : deux sections titrées par les deux références (assurance puis comptant)',
      tc.titres.length === 2 && porte(tc.titres[0], refsVo) && /ASSURANCE/.test(tc.titres[0]) && porte(tc.titres[1], refsVno) && /COMPTANT/.test(tc.titres[1]), JSON.stringify(tc.titres));
    ok('Ticket combiné = base : section assurance = lignes 1 et 3, section comptant = ligne 2, mêmes quantités et montants',
      sec1.length === 2 && sec1[0].quantite === 2 && sec1[0].montant === 2 * P[0].pu && sec1[1].quantite === 3 && sec1[1].montant === 3 * P[2].pu
      && sec2.length === 1 && sec2[0].quantite === 1 && sec2[0].montant === P[1].pu, JSON.stringify(tc.articles));
    const tot = {}; tc.totaux.forEach((t) => { tot[t.paire] = t.valeur; });
    const cleTtc = Object.keys(tc.paires).find((k) => /deux ventes/i.test(k));
    const ttc = C.chiffres(tc.paires[cleTtc]);
    ok('Ticket combiné = écran : Part du client, Comptant, TTC des deux ventes et NET = rail affiché avant la clôture',
      tot['Part du client'] === rail.partClient.valeur && tot['Comptant'] === rail.comptant.valeur && ttc === vo.prix + vno.prix && ttc === totalAssurance + totalComptant
      && tc.net === rail.net.valeur, JSON.stringify({ tot, cleTtc, ttc, net: tc.net, rail }));
    ok('Ticket combiné (point 5.2) : rien sous les lignes assurance au taux de l\'assurance, comme le ticket assurance ; organisme et remises dans les totaux',
      sec1.every((a) => a.credits.length === 0) && Object.keys(tot).some((k) => k.indexOf(TP) === 0) && tot[Object.keys(tot).find((k) => k.indexOf(TP) === 0)] === partTpBase,
      JSON.stringify(tot));

    /* ---- le detail de vente ---- */
    const dVo = await C.detailVente(p, venteId), dVno = await C.detailVente(p, vnoId);
    ok('Détail de vente : la vente assurance renvoie à la vente comptant (id et référence) et réciproquement',
      dVo.data && dVo.data.venteLiee === vnoId && dVo.data.venteLieeRef === vno.ref && dVno.data && dVno.data.venteLiee === venteId && dVno.data.venteLieeRef === vo.ref
      && dVno.data.intPRICE === totalComptant, JSON.stringify({ vo: dVo.data && [dVo.data.venteLiee, dVo.data.venteLieeRef], vno: dVno.data && [dVno.data.venteLiee, dVno.data.venteLieeRef, dVno.data.intPRICE] }));
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
