package rest.service.impl;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Analyse des ventes des produits (besoins du 11/10, point 13) : nombre de ventes, quantites, chiffre d'affaires et
 * marge par jour, semaine, mois ou annee, et produits qui font le plus de chiffre sur la periode.
 * <p>
 * Meme perimetre et meme formule que le Pilotage (PilotageSql) : ventes cloturees, non annulees, de montant positif,
 * hors type de vente exclu ; CA = lignes nettes de remise ; marge = CA hors taxes (TVA retiree ligne a ligne) moins
 * prix d'achat x quantite. Filtres : nom ou CIP (debut), emplacement, grossiste ; lecture seule.
 */
@Stateless
public class AnalyseVentesProduitsService {

    /** Au-dela, le decoupage par jour n'est plus lisible : on demande un pas plus large. */
    static final int JOURS_MAX_PAR_JOUR = 400;

    public enum Pas {
        JOUR("DATE_FORMAT(p.dt_UPDATED, '%Y-%m-%d')"), SEMAINE("DATE_FORMAT(p.dt_UPDATED, '%x-S%v')"),
        MOIS("DATE_FORMAT(p.dt_UPDATED, '%Y-%m')"), ANNEE("DATE_FORMAT(p.dt_UPDATED, '%Y')");

        final String cle;

        Pas(String cle) {
            this.cle = cle;
        }

        public static Pas lire(String v) {
            for (Pas p : values()) {
                if (p.name().equalsIgnoreCase(StringUtils.trimToEmpty(v))) {
                    return p;
                }
            }
            return null;
        }
    }

    static final String LIGNES = " FROM t_preenregistrement_detail d"
            + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
            + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
            + " LEFT JOIN t_code_tva v ON v.lg_CODE_TVA_ID = f.lg_CODE_TVA_ID"
            + " WHERE p.int_PRICE > 0 AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0"
            + " AND p.lg_TYPE_VENTE_ID <> '" + PilotageSql.TYPE_VENTE_EXCLU + "'"
            + " AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2";
    static final String MESURES = " COUNT(DISTINCT p.lg_PREENREGISTREMENT_ID), COALESCE(SUM(d.int_QUANTITY), 0),"
            + " COALESCE(SUM(d.int_PRICE - COALESCE(d.int_PRICE_REMISE, 0)), 0),"
            + " COALESCE(SUM((d.int_PRICE - COALESCE(d.int_PRICE_REMISE, 0)) / (1 + (COALESCE(v.int_VALUE, 0) / 100))), 0),"
            + " COALESCE(SUM(f.int_PAF * d.int_QUANTITY), 0)";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Filtres de l'ecran : texte (CIP ou nom, debut), emplacement, grossiste ; « ALL » ou vide = tous. */
    public static final class Filtres {
        final String texte;
        final String emplacement;
        final String grossiste;

        public Filtres(String texte, String emplacement, String grossiste) {
            this.texte = StringUtils.trimToNull(texte);
            this.emplacement = tous(emplacement) ? null : emplacement.trim();
            this.grossiste = tous(grossiste) ? null : grossiste.trim();
        }

        private static boolean tous(String v) {
            return StringUtils.isBlank(v) || "ALL".equalsIgnoreCase(v.trim());
        }

        String sql() {
            return (texte == null ? "" : " AND (f.int_CIP LIKE ?3 ESCAPE '!' OR f.str_NAME LIKE ?3 ESCAPE '!')")
                    + (emplacement == null ? "" : " AND f.lg_ZONE_GEO_ID = ?4")
                    + (grossiste == null ? "" : " AND f.lg_GROSSISTE_ID = ?5");
        }

        void poser(Query q) {
            if (texte != null) {
                q.setParameter(3, texte.replace("!", "!!").replace("%", "!%").replace("_", "!_") + "%");
            }
            if (emplacement != null) {
                q.setParameter(4, emplacement);
            }
            if (grossiste != null) {
                q.setParameter(5, grossiste);
            }
        }
    }

    /** Motif de refus de la demande, ou null. */
    public static String controler(LocalDate debut, LocalDate fin, Pas pas) {
        if (pas == null) {
            return "Pas inconnu : jour, semaine, mois ou année.";
        }
        if (debut.isAfter(fin)) {
            return "La date de début doit précéder la date de fin.";
        }
        if (pas == Pas.JOUR && ChronoUnit.DAYS.between(debut, fin) >= JOURS_MAX_PAR_JOUR) {
            return "Par jour : " + JOURS_MAX_PAR_JOUR + " jours au plus. Choisissez semaine, mois ou année.";
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> lignes(String sql, LocalDate debut, LocalDate fin, Filtres f) {
        Query q = em.createNativeQuery(sql).setParameter(1, debut.toString()).setParameter(2,
                fin.plusDays(1).toString());
        f.poser(q);
        return q.getResultList();
    }

    static long n(Object o) {
        return o == null ? 0 : Math.round(((Number) o).doubleValue());
    }

    static double taux(long marge, long caHT) {
        return caHT == 0 ? 0 : Math.round(marge * 1000.0 / caHT) / 10.0;
    }

    /** ventes, quantite, ca (TTC net), caHT, marge, taux de marge (sur le hors taxes). */
    static JSONObject mesures(Object[] l, int i) {
        long caHT = n(l[i + 3]), marge = caHT - n(l[i + 4]);
        return new JSONObject().put("ventes", n(l[i])).put("quantite", n(l[i + 1])).put("ca", n(l[i + 2]))
                .put("caHT", caHT).put("marge", marge).put("taux", taux(marge, caHT));
    }

    public JSONObject analyser(LocalDate debut, LocalDate fin, Pas pas, Filtres f) {
        String filtre = f.sql();
        Object[] t = lignes("SELECT" + MESURES + ", COUNT(DISTINCT d.lg_FAMILLE_ID)" + LIGNES + filtre, debut, fin, f)
                .get(0);
        JSONObject total = mesures(t, 0).put("produits", n(t[5]));

        JSONArray serie = new JSONArray();
        for (Object[] l : lignes(
                "SELECT " + pas.cle + " AS cle," + MESURES + LIGNES + filtre + " GROUP BY cle ORDER BY cle", debut, fin,
                f)) {
            serie.put(mesures(l, 1).put("cle", l[0]));
        }

        JSONArray produits = new JSONArray();
        for (Object[] l : lignes(
                "SELECT f.int_CIP, f.str_NAME," + MESURES + LIGNES + filtre
                        + " GROUP BY f.lg_FAMILLE_ID, f.int_CIP, f.str_NAME"
                        + " ORDER BY SUM(d.int_PRICE - COALESCE(d.int_PRICE_REMISE, 0)) DESC LIMIT 50",
                debut, fin, f)) {
            produits.put(mesures(l, 2).put("cip", l[0]).put("libelle", l[1]));
        }
        return new JSONObject().put("success", true).put("debut", debut.toString()).put("fin", fin.toString())
                .put("pas", pas.name()).put("total", total).put("serie", serie).put("produits", produits);
    }
}
