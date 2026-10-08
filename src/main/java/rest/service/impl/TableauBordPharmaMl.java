package rest.service.impl;

import java.util.List;
import javax.persistence.EntityManager;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Retours du 08/10 (11) : tableau de bord PharmaML (envois en attente, refus, reponses non rattachees, taux de service,
 * substitutions a decider, bons de livraison valorises, alertes, activite par grossiste, derniers echanges). Lecture
 * seule ; aucun contenu de message n'est rendu, seulement les statuts et les details deja enregistres.
 */
public final class TableauBordPharmaMl {

    private TableauBordPharmaMl() {
    }

    @SuppressWarnings("unchecked")
    public static JSONObject calculer(EntityManager em) {
        JSONObject r = new JSONObject().put("success", true);
        Object[] a = (Object[]) em.createNativeQuery("SELECT"
                + " SUM(str_STATUT = 'EN_ATTENTE' AND dt_ENVOI > NOW() - INTERVAL 15 DAY),"
                + " IFNULL(TIMESTAMPDIFF(MINUTE, MIN(CASE WHEN str_STATUT = 'EN_ATTENTE' AND dt_ENVOI > NOW() - INTERVAL 15 DAY"
                + " THEN dt_ENVOI END), NOW()), 0),"
                + " SUM(str_STATUT = 'ERREUR' AND dt_ENVOI > NOW() - INTERVAL 7 DAY),"
                + " SUM(str_STATUT = 'ORPHELINE' AND IFNULL(dt_REPONSE, dt_ENVOI) > NOW() - INTERVAL 15 DAY),"
                + " SUM(str_SOURCE = 'COMMANDE' AND str_STATUT IN ('TRAITEE', 'EN_ATTENTE') AND DATE(dt_ENVOI) = CURDATE())"
                + " FROM t_pharmaml_attente").getSingleResult();
        r.put("enAttente", n(a[0])).put("attenteMinutes", n(a[1])).put("refus7j", n(a[2])).put("orphelines", n(a[3]))
                .put("commandesJour", n(a[4]));
        Object[] t = (Object[]) em
                .createNativeQuery("SELECT IFNULL(SUM(int_QTE_COMMANDEE), 0), IFNULL(SUM(int_QTE_LIVREE), 0),"
                        + " IFNULL(SUM(int_QTE_LIVREE < int_QTE_COMMANDEE), 0) FROM t_pharmaml_reponse_ligne"
                        + " WHERE dt_REPONSE > NOW() - INTERVAL 30 DAY")
                .getSingleResult();
        long cdees = n(t[0]), livrees = n(t[1]);
        r.put("qteCommandee30j", cdees).put("qteLivree30j", livrees).put("lignesManquantes30j", n(t[2])).put(
                "tauxService30j",
                cdees == 0 ? JSONObject.NULL : Math.round(Math.min(livrees, cdees) * 1000.0 / cdees) / 10.0);
        r.put("aDecider",
                n(em.createNativeQuery("SELECT COUNT(*) FROM t_pharmaml_remplacement WHERE str_STATUT = 'PROPOSE'")
                        .getSingleResult()));
        Object[] b = (Object[]) em
                .createNativeQuery("SELECT IFNULL(SUM(lg_ORDER_ID IS NOT NULL), 0), IFNULL(SUM(lg_ORDER_ID IS NULL), 0)"
                        + " FROM t_pharmaml_blv WHERE lg_BON_LIVRAISON_ID IS NULL AND dt_RECU > NOW() - INTERVAL 60 DAY")
                .getSingleResult();
        r.put("blvAUtiliser", n(b[0])).put("blvNonRattaches", n(b[1]));
        Object[] al = (Object[]) em
                .createNativeQuery("SELECT COUNT(*), IFNULL(SUM(str_TYPE = 'REGLEMENTAIRE'), 0),"
                        + " IFNULL(SUM(b_ARRET_IMMEDIAT = 1), 0) FROM t_pharmaml_alerte WHERE dt_LU IS NULL")
                .getSingleResult();
        r.put("alertesNonLues", n(al[0])).put("alertesReglementaires", n(al[1])).put("arretsImmediats", n(al[2]));

        JSONArray grossistes = new JSONArray();
        for (Object[] g : (List<Object[]>) em.createNativeQuery("SELECT g.lg_GROSSISTE_ID, g.str_LIBELLE,"
                + " IFNULL(DATE_FORMAT(MAX(a.dt_ENVOI), '%d/%m/%Y %H:%i'), ''),"
                + " IFNULL(SUM(a.dt_ENVOI > NOW() - INTERVAL 30 DAY), 0),"
                + " IFNULL(SUM(a.str_STATUT = 'ERREUR' AND a.dt_ENVOI > NOW() - INTERVAL 30 DAY), 0),"
                + " IFNULL(SUM(a.str_STATUT = 'EN_ATTENTE' AND a.dt_ENVOI > NOW() - INTERVAL 15 DAY), 0),"
                + " (SELECT IFNULL(SUM(l.int_QTE_COMMANDEE), 0) FROM t_pharmaml_reponse_ligne l WHERE l.lg_GROSSISTE_ID = g.lg_GROSSISTE_ID"
                + " AND l.dt_REPONSE > NOW() - INTERVAL 30 DAY),"
                + " (SELECT IFNULL(SUM(LEAST(l.int_QTE_LIVREE, l.int_QTE_COMMANDEE)), 0) FROM t_pharmaml_reponse_ligne l"
                + " WHERE l.lg_GROSSISTE_ID = g.lg_GROSSISTE_ID AND l.dt_REPONSE > NOW() - INTERVAL 30 DAY)"
                + " FROM t_grossiste g LEFT JOIN t_pharmaml_attente a ON a.lg_GROSSISTE_ID = g.lg_GROSSISTE_ID"
                + " WHERE g.str_STATUT = 'enable' AND IFNULL(g.str_URL_PHARMAML, '') <> ''"
                + " GROUP BY g.lg_GROSSISTE_ID, g.str_LIBELLE ORDER BY MAX(a.dt_ENVOI) DESC, g.str_LIBELLE")
                .getResultList()) {
            long c = n(g[6]), l = n(g[7]);
            grossistes.put(new JSONObject().put("id", g[0]).put("grossiste", g[1]).put("derniere", g[2])
                    .put("envois30j", n(g[3])).put("erreurs30j", n(g[4])).put("enAttente", n(g[5]))
                    .put("tauxService", c == 0 ? JSONObject.NULL : Math.round(l * 1000.0 / c) / 10.0));
        }
        r.put("grossistes", grossistes);

        JSONArray evenements = new JSONArray();
        for (Object[] e : (List<Object[]>) em
                .createNativeQuery("SELECT DATE_FORMAT(IFNULL(a.dt_REPONSE, a.dt_ENVOI), '%d/%m/%Y %H:%i'),"
                        + " IFNULL(g.str_LIBELLE, ''), a.str_SOURCE, a.str_STATUT, IFNULL(o.str_REF_ORDER, ''), IFNULL(a.str_DETAIL, '')"
                        + " FROM t_pharmaml_attente a LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = a.lg_GROSSISTE_ID"
                        + " LEFT JOIN t_order o ON o.lg_ORDER_ID = a.lg_SOURCE_ID"
                        + " ORDER BY IFNULL(a.dt_REPONSE, a.dt_ENVOI) DESC LIMIT 15")
                .getResultList()) {
            evenements.put(new JSONObject().put("date", e[0]).put("grossiste", e[1]).put("source", e[2])
                    .put("statut", e[3]).put("commande", e[4]).put("detail", detailLisible((String) e[5])));
        }
        return r.put("evenements", evenements);
    }

    /** Detail enregistre rendu lisible : le message (« msg ») d'un resultat JSON, sinon le texte, borne. */
    static String detailLisible(String d) {
        if (StringUtils.isBlank(d)) {
            return "";
        }
        String t = d.trim();
        if (t.startsWith("{")) {
            try {
                JSONObject o = new JSONObject(t);
                t = o.optString("msg", "");
                if (t.isEmpty()) {
                    StringBuilder s = new StringBuilder();
                    for (String k : new String[] { "livrees", "lignes", "ruptures", "remplacements" }) {
                        if (o.has(k)) {
                            s.append(s.length() == 0 ? "" : ", ").append(k).append(" ").append(o.opt(k));
                        }
                    }
                    t = s.toString();
                }
            } catch (Exception ex) {
                t = StringUtils.abbreviate(d, 160);
            }
        }
        return StringUtils.abbreviate(t, 160);
    }

    private static long n(Object o) {
        if (o instanceof Boolean) {
            return ((Boolean) o) ? 1 : 0;
        }
        return o == null ? 0 : ((Number) o).longValue();
    }
}
