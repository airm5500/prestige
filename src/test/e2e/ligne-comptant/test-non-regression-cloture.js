/* CAS 1 DU 03/11/2026, NON-REGRESSION DE LA CLOTURE ASSURANCE : parametre a 0 ou a 1 sans coche, la cloture par
 * l'ecran ecrit exactement les memes lignes ; un echec pendant la cloture de la vente comptant liee ne clot aucune
 * des deux ventes.
 *
 *  1. parametre a 0 : vente assurance (deux articles, remise 5 %) terminee par l'ecran -> photo des lignes ecrites
 *     (vente, lignes, tiers-payant, mouvement de caisse, recettes, reglements, stock) ;
 *  2. parametre a 1, aucune coche : meme vente -> photo identique (hors identifiants, references et dates) ;
 *  3. parametre a 1, une ligne cochee, un declencheur de base fait echouer l'enregistrement de la vente comptant liee
 *     -> la cloture est refusee, la vente assurance reste en cours avec ses deux lignes, aucune vente liee, aucun
 *     mouvement, stock intact. Le declencheur est retire a la fin.
 * Lancement seul : node src/test/e2e/ligne-comptant/test-non-regression-cloture.js
 */
const C = require('./commun');
const { ok, q, exec, A } = C;

const TRIGGER = 'zz_essai_echec_vno';
const retirerTrigger = () => { try { exec('DROP TRIGGER IF EXISTS ' + TRIGGER); } catch (e) { console.log('  (trigger) ' + e.message.split('\n')[0]); } };

(async () => {
  A.parametre('KEY_LIGNE_COMPTANT_VO', '0');
  const TP = A.tiersPayant('C5', '1');
  const P1 = C.produitSimple(7);
  const P2 = C.produitSimple(8);
  const CIP1 = C.cip(P1);
  const CIP2 = C.cip(P2);
  C.remiseEssai(5, [P1, P2]);
  A.ouvrirCaisse();
  const sess = await C.connecterEtOuvrirVente();
  const { p, api } = sess;
  const photo = (id) => {
    const v = C.vente(id);
    const sansId = (s) => s.replace(new RegExp(id, 'g'), 'ID').replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, 'UUID');
    return JSON.stringify({ prix: v.prix, remise: v.remise, partClient: v.partClient, type: v.type, typeId: v.typeId, tva: v.tva, account: v.account, statut: v.statut,
      statutVente: v.statutVente, liee: v.liee, lignes: C.lignes(id), tp: C.lignesTp(id).replace(new RegExp(TP, 'g'), 'TP'), mouvements: sansId(C.mouvements(id)),
      recettes: sansId(C.recettes(id)), reglements: C.reglements(id), stock: [A.stock(P1), A.stock(P2)] });
  };
  let nBon = 0;
  const vendre = async (nom) => {
    await C.nouvelleVente(p);
    await C.passerEnAssurance(p);
    await C.choisirClient(p, C.MARQUE + ' ' + nom);
    await C.saisirBon(p, 1, C.MARQUE + '-BON-' + nom + '-' + (++nBon));
    await C.taperArticle(p, CIP1);
    await C.taperArticle(p, CIP2);
    const id = await C.venteCourante(p);
    C.noterVente(id);
    await C.choisirRemise(p, C.MARQUE + ' 5');
    await p.evaluate(() => testextjs.app.getController('VenteCtr').autoComputeNetAssurance());
    await p.waitForResponse((x) => /\/vente\/net\/assurance/.test(x.url()), { timeout: 30000 }).catch(() => {});
    await p.waitForTimeout(1200);
    return id;
  };
  try {
    await A.clientAssure(api, 'CPT5', [{ tp: TP, taux: 70 }]);
    /* 1. parametre a 0 */
    const v1 = await vendre('CPT5');
    const r1 = await C.rail(p);
    const c1 = await C.terminerVente(p);
    ok('Paramètre à 0 : clôture acceptée', c1.http === 200 && c1.success === true, JSON.stringify(c1).slice(0, 200));
    const ph1 = photo(v1);
    exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 50, int_NUMBER = 50 WHERE lg_FAMILLE_ID IN ('" + P1.id + "','" + P2.id + "') AND lg_EMPLACEMENT_ID = '1'");

    /* 2. parametre a 1, aucune coche */
    A.parametre('KEY_LIGNE_COMPTANT_VO', '1');
    const v2 = await vendre('CPT5');
    const r2 = await C.rail(p);
    ok('Paramètre à 1 sans coche : même net, même part tiers-payant, même remise', r2.montantNet === r1.montantNet && r2.montantTp === r1.montantTp && r2.remise === r1.remise
      && r2.montantComptant === 0, JSON.stringify(r1) + ' / ' + JSON.stringify(r2));
    const c2 = await C.terminerVente(p);
    ok('Paramètre à 1 sans coche : clôture acceptée, sans vente liée', c2.http === 200 && c2.success === true && !c2.venteLiee, JSON.stringify(c2).slice(0, 200));
    const ph2 = photo(v2);
    ok('Lignes écrites identiques (vente, lignes, tiers-payant, mouvement, recettes, règlements, stock)', ph1 === ph2, ph1 + '\n  != ' + ph2);
    exec("UPDATE t_famille_stock SET int_NUMBER_AVAILABLE = 50, int_NUMBER = 50 WHERE lg_FAMILLE_ID IN ('" + P1.id + "','" + P2.id + "') AND lg_EMPLACEMENT_ID = '1'");

    /* 3. echec simule pendant la cloture de la vente comptant liee */
    const v3 = await vendre('CPT5');
    const put = await C.cocher(p, CIP2);
    ok('Préparation : ligne cochée', put && put.success === true, JSON.stringify(put));
    retirerTrigger();
    /* le corps du declencheur contient un « ; » : il passe par l'entree standard du client, avec un delimiteur propre */
    const creation = require('child_process').spawnSync('mariadb', [...A.ENV_E2E.MARIADB, A.ENV_E2E.BASE], { encoding: 'utf8',
      input: 'DELIMITER //' + String.fromCharCode(10) + 'CREATE TRIGGER ' + TRIGGER + ' BEFORE UPDATE ON t_preenregistrement FOR EACH ROW BEGIN'
        + " IF NEW.str_TYPE_VENTE = 'VNO' AND NEW.str_STATUT = 'is_Closed' AND NEW.lg_VENTE_LIEE_ID IS NOT NULL AND OLD.str_STATUT <> 'is_Closed'"
        + " THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'essai : echec de la cloture de la vente comptant liee'; END IF; END //" + String.fromCharCode(10) + 'DELIMITER ;' + String.fromCharCode(10) });
    ok("Préparation : déclencheur d'échec posé sur la clôture de la vente comptant", creation.status === 0 && q("SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_NAME = '" + TRIGGER + "'") === '1', creation.stderr);
    const c3 = await C.terminerVente(p);
    retirerTrigger();
    await p.waitForTimeout(2000);
    const v = C.vente(v3);
    ok('Clôture refusée (' + c3.http + ')', c3.http !== 200 || c3.success === false, JSON.stringify(c3).slice(0, 200));
    ok('La vente assurance reste en cours, avec ses deux lignes, sans vente liée', v.statut !== 'is_Closed' && v.liee === null && C.lignes(v3).split(' ; ').length === 2
      && q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_VENTE_LIEE_ID = '" + v3 + "'") === '0', JSON.stringify(v) + ' ' + C.lignes(v3));
    ok('Aucun mouvement de caisse, aucune recette, stock intact', C.mouvements(v3) === 'aucun' && C.recettes(v3) === 'aucune' && A.stock(P1) === 50 && A.stock(P2) === 50,
      C.mouvements(v3) + ' ' + A.stock(P1) + '/' + A.stock(P2));
    const voAutres = q("SELECT COUNT(*) FROM t_preenregistrement WHERE lg_USER_ID = '" + A.ADMIN + "' AND dt_CREATED >= '" + A.DEBUT + "' AND str_TYPE_VENTE = 'VNO'");
    ok('Aucune vente comptant orpheline laissée en base', voAutres === '0', voAutres);
  } catch (e) {
    ok('Parcours sans exception', false, e.stack + ' ' + sess.erreurs.join(' | '));
  } finally {
    retirerTrigger();
    C.noterVente(await C.venteCourante(p).catch(() => null));
    await sess.b.close();
    A.nettoyer();
    process.exit(A.bilan() ? 1 : 0);
  }
})();
