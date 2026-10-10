/* Jeu d'essai des carnets depot : un tiers payant et un jour qui ont des bons non factures (vente cloturee).
 * Le couple d'origine des tests (autre banc) est garde s'il existe ; sinon, celui du banc qui a le plus de bons.
 * CARNET_TP / CARNET_JOUR peuvent l'imposer. */
const TP_ORIGINE = '1619143351587397512', JOUR_ORIGINE = '2026-06-22';

module.exports = function choisirCarnet(q) {
  if (process.env.CARNET_TP && process.env.CARNET_JOUR) {
    return { TP: process.env.CARNET_TP, JOUR: process.env.CARNET_JOUR };
  }
  const bons = (tp, jour) => q("SELECT COUNT(*) FROM t_preenregistrement_compte_client_tiers_payent cp"
    + " JOIN t_compte_client_tiers_payant cl ON cl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID=cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
    + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID=cp.lg_PREENREGISTREMENT_ID"
    + " WHERE cl.lg_TIERS_PAYANT_ID='" + tp + "' AND cp.str_STATUT_FACTURE='UNPAID' AND cp.str_STATUT='is_Closed'"
    + " AND p.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0 AND p.int_PRICE>0 AND DATE(p.dt_UPDATED)='" + jour + "'");
  if (Number(bons(TP_ORIGINE, JOUR_ORIGINE)) > 0) {
    return { TP: TP_ORIGINE, JOUR: JOUR_ORIGINE };
  }
  const ligne = q("SELECT CONCAT(cl.lg_TIERS_PAYANT_ID, '|', DATE(p.dt_UPDATED)) FROM t_preenregistrement_compte_client_tiers_payent cp"
    + " JOIN t_compte_client_tiers_payant cl ON cl.lg_COMPTE_CLIENT_TIERS_PAYANT_ID=cp.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
    + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID=cp.lg_PREENREGISTREMENT_ID"
    + " WHERE cp.str_STATUT_FACTURE='UNPAID' AND cp.str_STATUT='is_Closed' AND p.str_STATUT='is_Closed' AND p.b_IS_CANCEL=0 AND p.int_PRICE>0"
    + " GROUP BY cl.lg_TIERS_PAYANT_ID, DATE(p.dt_UPDATED) ORDER BY COUNT(*) DESC, 1 LIMIT 1");
  const [TP, JOUR] = (ligne || '|').split('|');
  return { TP, JOUR };
};
