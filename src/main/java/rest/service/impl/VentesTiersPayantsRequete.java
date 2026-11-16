package rest.service.impl;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

import org.apache.commons.lang3.StringUtils;

/**
 * Retour du 15/11 : « Suivi des bons » (ventes a tiers payant par organisme) lent - ~500 ms pour 2 bons sur un jour,
 * ~650 ms sur un mois.
 * <ul>
 * <li>la periode etait ecrite DATE(dt_CREATED) BETWEEN, ce qui empechait l'index de la date de vente : elle est ecrite
 * en intervalle [premier jour 0 h ; lendemain du dernier jour 0 h[ (meme resultat, voir BornesJoursCoherenceTest)
 * ;</li>
 * <li>jusqu'a {@link #JOURS_PAR_LES_VENTES} jours, la requete part des ventes de la periode (index statut, annulation,
 * date) puis rejoint leurs parts tiers payant ; au-dela, MariaDB choisit (parcours des parts tiers payant, plus court
 * sur une longue periode) ;</li>
 * <li>une seule requete SQL rend aussi le libelle, le groupe et le type de l'organisme : plus de chargement d'entite
 * organisme par organisme.</li>
 * </ul>
 * Memes filtres et meme ordre qu'avant : vente et part closes, vente non annulee, montants positifs ; recherche par
 * debut du nom complet ou du nom de l'organisme ; organisme, groupe, type ; tri par nom complet.
 */
final class VentesTiersPayantsRequete {

    static final int JOURS_PAR_LES_VENTES = 92;

    final String sql;
    final List<Object> parametres = new ArrayList<>();

    VentesTiersPayantsRequete(String query, String dtStart, String dtEnd, String tiersPayantId, String groupeId,
            String typeTp, int start, int limit, boolean all) {
        java.util.Date[] bornes = ClientServiceImpl.bornesJours(dtStart, dtEnd);
        StringBuilder filtres = new StringBuilder();
        parametres.add(bornes[0]);
        parametres.add(bornes[1]);
        if (!StringUtils.isEmpty(query)) {
            filtres.append(" AND (UPPER(t.str_FULLNAME) LIKE ? OR UPPER(t.str_NAME) LIKE ?)");
            parametres.add(query.toUpperCase() + "%");
            parametres.add(query.toUpperCase() + "%");
        }
        if (!StringUtils.isEmpty(tiersPayantId)) {
            filtres.append(" AND t.lg_TIERS_PAYANT_ID = ?");
            parametres.add(tiersPayantId);
        }
        if (!StringUtils.isEmpty(groupeId)) {
            filtres.append(" AND t.lg_GROUPE_ID = ?");
            parametres.add(Integer.valueOf(groupeId));
        }
        if (!StringUtils.isEmpty(typeTp) && !"ALL".equals(typeTp)) {
            filtres.append(" AND t.lg_TYPE_TIERS_PAYANT_ID = ?");
            parametres.add(typeTp);
        }
        String jointure = parLesVentes(dtStart, dtEnd) ? " STRAIGHT_JOIN " : " JOIN ";
        sql = "SELECT t.lg_TIERS_PAYANT_ID, t.str_CODE_ORGANISME, t.str_FULLNAME, g.lg_GROUPE_ID, g.str_LIBELLE,"
                + " ty.lg_TYPE_TIERS_PAYANT_ID, ty.str_LIBELLE_TYPE_TIERS_PAYANT, x.nbre, x.montant, x.reste FROM ("
                + "SELECT c.lg_TIERS_PAYANT_ID AS tp, COUNT(*) AS nbre, SUM(r.int_PRICE) AS montant,"
                + " SUM(r.int_PRICE_RESTE) AS reste FROM t_preenregistrement p" + jointure
                + "t_preenregistrement_compte_client_tiers_payent r ON r.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
                + " JOIN t_compte_client_tiers_payant c ON c.lg_COMPTE_CLIENT_TIERS_PAYANT_ID = r.lg_COMPTE_CLIENT_TIERS_PAYANT_ID"
                + " JOIN t_tiers_payant t ON t.lg_TIERS_PAYANT_ID = c.lg_TIERS_PAYANT_ID"
                + " WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.dt_CREATED >= ? AND p.dt_CREATED < ?"
                + " AND p.int_PRICE > 0 AND r.str_STATUT = 'is_Closed' AND r.int_PRICE > 0" + filtres
                + " GROUP BY c.lg_TIERS_PAYANT_ID) x JOIN t_tiers_payant t ON t.lg_TIERS_PAYANT_ID = x.tp"
                + " LEFT JOIN t_groupe_tierspayant g ON g.lg_GROUPE_ID = t.lg_GROUPE_ID"
                + " LEFT JOIN t_type_tiers_payant ty ON ty.lg_TYPE_TIERS_PAYANT_ID = t.lg_TYPE_TIERS_PAYANT_ID"
                + " ORDER BY t.str_FULLNAME, t.lg_TIERS_PAYANT_ID"
                + (all ? "" : " LIMIT " + Math.max(0, limit) + " OFFSET " + Math.max(0, start));
    }

    /** Periode courte (jusqu'a 92 jours) : la requete part des ventes de la periode. */
    static boolean parLesVentes(String dtStart, String dtEnd) {
        return ChronoUnit.DAYS.between(LocalDate.parse(dtStart), LocalDate.parse(dtEnd)) < JOURS_PAR_LES_VENTES;
    }
}
