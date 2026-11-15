/* Exploitation du 14/11, S5 : « paiement total » ecrit en INFO, une ligne par dossier (1 341 lignes chez appaul, dont
 * 118 en une seconde). Ces traces de mise au point (bll.facture.reglementManager) noyaient le journal.
 *
 * Parcours de l'ecran : FACTURATION > Factures > Creer (Par tiers payant) pour fabriquer la facture, puis, dans la
 * liste des factures, « Regler » : Type Paiement « Total », Especes, montant recu = reste, « Regler la facture », « Non »
 * a l'impression.
 * Jeu d'essai : un organisme, 4 clients et 4 bons de quantites 1, 3, 2 et 4 (montants tous differents).
 * Controles :
 *  - rapprochement : reste a payer a l'ecran = facture en base = somme des 4 bons ;
 *  - bilan du reglement : facture soldee (paye = total, reste 0), chaque dossier solde (paye = montant), un seul dossier
 *    de reglement du montant total, un seul mouvement de caisse ;
 *  - journal : pendant le reglement, aucune ligne « paiement total ».
 * Jeu d'essai retire a la fin, compteur des numeros de facture remis.
 * Lancement seul : node src/test/e2e/facturation/test-journal-reglement-total-1511.js
 */
const fs = require('fs');
const C = require('../audits/commun');
const V = require('../outils/vues');
const ENV_E2E = require('../outils/poste');
const { ok, q, MARQUE } = C;

const fmt = (d) => String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
const JOURNAL = ENV_E2E.JOURNAL_SERVEUR;
function lireJournal(depuis) {
  if (!fs.existsSync(JOURNAL)) { return ''; }
  const t = fs.statSync(JOURNAL).size;
  const de = t >= depuis ? depuis : 0;
  const buf = Buffer.alloc(t - de);
  const fd = fs.openSync(JOURNAL, 'r');
  fs.readSync(fd, buf, 0, buf.length, de);
  fs.closeSync(fd);
  return buf.toString('latin1');
}

(async () => {
  C.ouvrirCaisse();
  const compteur = q("SELECT str_VALUE FROM t_parameters WHERE str_KEY = 'KEY_CODE_FACTURE'");
  C.etat.restaurations.push("UPDATE t_parameters SET str_VALUE = '" + compteur + "' WHERE str_KEY = 'KEY_CODE_FACTURE'");
  const P = C.produit(8, 500, "AND f.lg_CODE_TVA_ID IN (SELECT lg_CODE_TVA_ID FROM t_code_tva WHERE int_VALUE = 0) AND MOD(f.int_PRICE, 5) = 0");
  const u = P.pu * 4 / 5;
  const sess = await C.connecter();
  const { p, api } = sess;
  const VO = C.venteAssurance(api);
  const QTES = [1, 3, 2, 4];
  const bonDe = (v) => q("SELECT lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_ID = '" + v + "'");
  const montantBon = (b) => Number(q("SELECT int_PRICE FROM t_preenregistrement_compte_client_tiers_payent WHERE lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID = '" + b + "'"));

  try {
    /* ---- existant : un organisme, un client et une vente par bon ---- */
    const tp = C.tiersPayant('RJT', '1', 'int_NBREBONS = 0, int_MONTANTFAC = 0');
    const libelle = MARQUE + '-TP-RJT';
    /* compte de l'organisme, comme a sa creation par l'ecran (le reglement le cherche ; retire par le nettoyage commun) */
    C.exec("CREATE TEMPORARY TABLE tmp_cc SELECT * FROM t_compte_client WHERE str_TYPE = 'TIERSPAYANT' AND P_KEY IN (SELECT lg_TIERS_PAYANT_ID FROM t_tiers_payant) LIMIT 1;"
      + " UPDATE tmp_cc SET lg_COMPTE_CLIENT_ID = '" + tp + "-CC', str_CODE_COMPTE_CLIENT = '" + tp + "', P_KEY = '" + tp + "', dec_Balance = 0,"
      + " dec_balance_Disponible = 0, dec_Balance_InDisponible = 0, int_COUNTER_TRANSACTION = 0, dt_CREATED = NOW(), dt_UPDATED = NOW();"
      + " INSERT INTO t_compte_client SELECT * FROM tmp_cc; DROP TEMPORARY TABLE tmp_cc;");
    const bons = [];
    for (let i = 0; i < QTES.length; i++) {
      const cl = await C.clientAssure(api, 'RJT' + String(i + 1).padStart(2, '0'), [{ tp, taux: 80 }]);
      const { v } = await VO.vendre(cl, [{ lien: cl.lien(tp), taux: 80, bon: MARQUE + '-RJT-' + i }], P, QTES[i]);
      bons.push(bonDe(v));
    }
    const montants = bons.map(montantBon);
    const total = montants.reduce((t, m) => t + m, 0);
    ok('Précondition : 4 bons de montants différents (quantité x ' + u + ')', montants.every((m, i) => m === QTES[i] * u) && new Set(montants).size === 4, montants.join(', '));

    /* ---- facture par l'ecran ---- */
    await V.ouvrirMenu(p, 'FACTURATION', 'Factures');
    await p.waitForFunction(() => Ext.ComponentQuery.query('facturemanager').some((g) => g.isVisible(true)), null, { timeout: 30000 });
    await V.cliquer(p, 'facturemanager button[iconCls=addicon]');
    await p.waitForFunction(() => { const c = Ext.getCmp('MODE_SELECTION'); return c && c.isVisible(true); }, null, { timeout: 30000 });
    await V.choisir(p, '#MODE_SELECTION', 'Par tiers payant');
    await V.cliquer(p, '#cmb_fact_TIERS_PAYANT');
    await p.keyboard.type(libelle, { delay: 20 });
    const picker = await p.evaluate(() => Ext.getCmp('cmb_fact_TIERS_PAYANT').getPicker().getId());
    const prop = p.locator('#' + picker + ' .x-boundlist-item').filter({ hasText: libelle }).first();
    await prop.waitFor({ timeout: 20000 });
    await prop.click();
    await V.saisir(p, '#dt_debut', fmt(new Date(Date.now() - 86400000)));
    await V.saisir(p, '#dt_fin', fmt(new Date(Date.now() + 86400000)));
    await V.cliquer(p, '#btn_add');
    await p.waitForFunction(() => { const g = Ext.getCmp('gridpanelID'); return g && !g.getStore().isLoading() && g.getStore().getCount() > 0; }, null, { timeout: 60000 });
    await V.cliquer(p, '#btn_create_facture');
    const non = () => p.locator('.x-message-box .x-btn').filter({ hasText: /^\s*(Non|No)\s*$/ }).filter({ visible: true }).first();
    await non().waitFor({ timeout: 120000 });
    await non().click();
    await p.waitForTimeout(500);
    const croix = await p.evaluate(() => { const w = Ext.ComponentQuery.query('window[itemId=fenetreCreerFacture]').filter((x) => x.isVisible())[0];
      return w && w.tools && w.tools.close ? w.tools.close.getId() : (w ? w.down('tool[type=close]').getId() : null); });
    if (croix) { await p.click('#' + croix); }
    await p.waitForTimeout(800);
    const [FID, FCODE] = q("SELECT CONCAT_WS('|', lg_FACTURE_ID, str_CODE_FACTURE) FROM t_facture WHERE tiersPayant = '" + tp + "'").split('|');
    ok('Facture créée par l\'écran : ' + FCODE + ', ' + bons.length + ' dossiers, ' + total, !!FID
      && Math.round(Number(q("SELECT dbl_MONTANT_CMDE FROM t_facture WHERE lg_FACTURE_ID = '" + FID + "'"))) === total, FCODE);

    /* ---- reglement par l'ecran ---- */
    await V.cliquer(p, 'facturemanager button[text=rechercher]').catch(() => {});
    await p.waitForTimeout(1500);
    await p.evaluate((code) => { const g = Ext.ComponentQuery.query('facturemanager')[0];
      const i = g.getStore().findBy((r) => Object.values(r.getData()).includes(code));
      g.onPaidFactureClick(g, i); }, FCODE);
    await p.waitForFunction(() => { const c = Ext.getCmp('dbl_MONTANT_RESTANT'); return c && c.isVisible(true) && Number(c.getValue()) > 0; }, null, { timeout: 60000 });
    await p.waitForTimeout(1500);
    const resteEcran = await p.evaluate(() => Number(Ext.getCmp('dbl_MONTANT_RESTANT').getValue()));
    ok('Rapprochement : reste à payer à l\'écran = facture en base = somme des bons (' + total + ')', Math.round(resteEcran) === total
      && Math.round(Number(q("SELECT dbl_MONTANT_RESTANT FROM t_facture WHERE lg_FACTURE_ID = '" + FID + "'"))) === total, 'écran ' + resteEcran);

    await V.choisir(p, '#lg_NATURE_PAIEMENT', 'Total');
    await V.saisir(p, '#int_AMOUNT_RECU', String(total));
    await p.waitForTimeout(500);
    const taille0 = fs.existsSync(JOURNAL) ? fs.statSync(JOURNAL).size : 0;
    await V.cliquer(p, 'doreglementmanager #btn_create_facture');
    await p.waitForFunction(() => Ext.Msg.isVisible() && !/patienter/i.test(Ext.Msg.msg.getEl().dom.innerText), null, { timeout: 120000 });
    const message = await p.evaluate(() => Ext.Msg.msg.getEl().dom.innerText);
    ok('Après « Régler la facture », l\'écran propose l\'impression', /imprimer/i.test(message), message.replace(/\s+/g, ' '));
    if (await non().count()) { await non().click(); } else { await p.evaluate(() => { const x = Ext.Msg.down('button[itemId=ok]'); if (x) { x.btnEl.dom.click(); } }); }
    await p.waitForTimeout(3000);

    /* ---- bilan ---- */
    const f = q("SELECT CONCAT_WS('|', ROUND(dbl_MONTANT_PAYE), ROUND(dbl_MONTANT_RESTANT)) FROM t_facture WHERE lg_FACTURE_ID = '" + FID + "'").split('|').map(Number);
    ok('Bilan : facture soldée (payé ' + total + ', reste 0)', f[0] === total && f[1] === 0, f.join(' / '));
    const det = q("SELECT GROUP_CONCAT(CONCAT(ROUND(dbl_MONTANT), ':', ROUND(dbl_MONTANT_PAYE), ':', ROUND(dbl_MONTANT_RESTANT)) ORDER BY dbl_MONTANT) FROM t_facture_detail WHERE lg_FACTURE_ID = '" + FID + "'");
    const attenduDet = montants.slice().sort((a, b) => a - b).map((m) => m + ':' + m + ':0').join(',');
    ok('Bilan : chaque dossier soldé (payé = montant, reste 0)', det === attenduDet, det + ' / attendu ' + attenduDet);
    const dr = q("SELECT CONCAT(COUNT(*), ':', IFNULL(ROUND(SUM(dbl_AMOUNT)), 0)) FROM t_dossier_reglement WHERE lg_FACTURE_ID = '" + FID + "'");
    ok('Bilan : un seul dossier de règlement, du montant total', dr === '1:' + total, dr);
    const mvt = q("SELECT COUNT(*) FROM t_mvt_caisse WHERE str_NUM_PIECE_COMPTABLE IN (SELECT lg_DOSSIER_REGLEMENT_ID FROM t_dossier_reglement WHERE lg_FACTURE_ID = '" + FID + "')");
    ok('Bilan : un seul mouvement de caisse', mvt === '1', mvt);

    const journal = lireJournal(taille0);
    const n = (journal.match(/paiement total/g) || []).length;
    ok('Journal : aucune ligne « paiement total » pendant le règlement', n === 0, n + ' ligne(s), ' + journal.length + ' octets');
    ok('Aucune erreur JavaScript à l\'écran', sess.erreurs.length === 0, sess.erreurs.join(' | '));
  } catch (e) {
    ok('Déroulé sans exception', false, e.stack);
  } finally {
    await sess.b.close().catch(() => {});
    C.nettoyer();
    process.exit(C.bilan() ? 1 : 0);
  }
})();
