package rest.service.impl;

import java.time.LocalDate;
import java.time.temporal.IsoFields;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Cartes de l'onglet « A suivre » du Pilotage (retours sur les besoins du 11/10, point 11) : evolution d'une grandeur
 * par semaine, mois ou annee, l'annee en cours face a N-1, N-2 et N-3 au plus ; frequentation horaire comparee ;
 * encaissements par mode de reglement. Memes perimetres que le reste du Pilotage (ventes cloturees, non annulees, de
 * montant positif, hors type exclu ; encaisse = vente_reglement ; achats = bons de livraison clotures). Lecture seule,
 * resultat garde dix minutes (les annees passees ne bougent plus).
 */
@Stateless
public class PilotageSuiviService {

    public static final List<String> MESURES = java.util.Arrays.asList("ca", "encaisse", "achats", "tva", "marge",
            "panier");
    public static final List<String> PAS = java.util.Arrays.asList("SEMAINE", "MOIS", "ANNEE");

    private static final String VENTES = " p.int_PRICE > 0 AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0"
            + " AND p.lg_TYPE_VENTE_ID <> '" + PilotageSql.TYPE_VENTE_EXCLU + "'";
    private static final long DUREE_CACHE = 10 * 60 * 1000L;
    private static final Map<String, Object[]> CACHE = new ConcurrentHashMap<>();

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Source et colonne de date de chaque grandeur : [FROM ... WHERE conditions, colonne date, somme, compte]. */
    static String[] source(String mesure) {
        String lignes = " FROM t_preenregistrement_detail d JOIN t_preenregistrement p"
                + " ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
                + " JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                + " LEFT JOIN t_code_tva v ON v.lg_CODE_TVA_ID = f.lg_CODE_TVA_ID WHERE" + VENTES;
        String net = "(d.int_PRICE - COALESCE(d.int_PRICE_REMISE, 0))";
        String ht = net + " / (1 + COALESCE(v.int_VALUE, 0) / 100)";
        switch (mesure) {
        case "encaisse":
            return new String[] {
                    " FROM vente_reglement vr JOIN t_preenregistrement p"
                            + " ON p.lg_PREENREGISTREMENT_ID = vr.vente_id WHERE" + VENTES,
                    "p.dt_UPDATED", "SUM(vr.montant)", "0" };
        case "achats":
            return new String[] { " FROM t_bon_livraison b WHERE b.str_STATUT = 'is_Closed'", "b.dt_UPDATED",
                    "SUM(b.int_HTTC)", "COUNT(*)" };
        case "tva":
            return new String[] { lignes, "p.dt_UPDATED", "SUM(" + net + " - " + ht + ")", "0" };
        case "marge":
            return new String[] { lignes, "p.dt_UPDATED", "SUM(" + ht + " - f.int_PAF * d.int_QUANTITY)", "0" };
        default: /* ca, panier */
            return new String[] { " FROM t_preenregistrement p WHERE" + VENTES, "p.dt_UPDATED",
                    "SUM(p.int_PRICE - COALESCE(p.int_PRICE_REMISE, 0))", "COUNT(*)" };
        }
    }

    static int taille(String pas) {
        return "SEMAINE".equals(pas) ? 53 : "MOIS".equals(pas) ? 12 : 1;
    }

    /** Rang (1..53, 1..12, 1) de la date du jour dans l'annee, au pas choisi. */
    static int rang(LocalDate jour, String pas) {
        return "SEMAINE".equals(pas) ? jour.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR)
                : "MOIS".equals(pas) ? jour.getMonthValue() : 1;
    }

    static double evolution(double valeur, double reference) {
        return reference == 0 ? 0 : Math.round((valeur - reference) * 1000d / Math.abs(reference)) / 10d;
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> lignes(String sql, LocalDate debut, LocalDate fin) {
        Query q = em.createNativeQuery(sql).setParameter(1, debut.toString()).setParameter(2, fin.toString());
        return q.getResultList();
    }

    private static double n(Object o) {
        return o == null ? 0 : ((Number) o).doubleValue();
    }

    /**
     * Evolution d'une grandeur : une serie par annee (l'annee en cours, puis N-1 .. N-comparer), chacune au pas choisi
     * (53 semaines ISO, 12 mois, ou une valeur). Chaque annee porte aussi son cumul « a date » (du 1er janvier au meme
     * jour que la date du jour) et l'evolution de l'annee en cours par rapport a elle, sur ce cumul.
     */
    public JSONObject evolution(String mesure, String pas, int comparer, LocalDate jour) {
        String cle = mesure + "|" + pas + "|" + comparer + "|" + jour;
        Object[] c = CACHE.get(cle);
        if (c != null && System.currentTimeMillis() - (long) c[0] < DUREE_CACHE) {
            return new JSONObject((String) c[1]);
        }
        String[] s = source(mesure);
        int an = jour.getYear(), nb = taille(pas);
        int premier = "ANNEE".equals(pas) ? an - Math.max(1, comparer) : an - comparer;
        LocalDate debut = LocalDate.of(premier, 1, 1).minusDays(7), fin = jour.plusDays(1);
        String annee = "SEMAINE".equals(pas) ? "DATE_FORMAT(" + s[1] + ", '%x') + 0" : "YEAR(" + s[1] + ")";
        String rang = "SEMAINE".equals(pas) ? "DATE_FORMAT(" + s[1] + ", '%v') + 0"
                : "MOIS".equals(pas) ? "MONTH(" + s[1] + ")" : "1";
        boolean panier = "panier".equals(mesure);
        double[][] somme = new double[an - premier + 1][nb], compte = new double[an - premier + 1][nb];
        for (Object[] l : lignes("SELECT " + annee + " AS an, " + rang + " AS rg, COALESCE(" + s[2] + ", 0), " + s[3]
                + s[0] + " AND " + s[1] + " >= ?1 AND " + s[1] + " < ?2 GROUP BY an, rg", debut, fin)) {
            int a = (int) n(l[0]) - premier, r = (int) n(l[1]) - 1;
            if (a >= 0 && a < somme.length && r >= 0 && r < nb) {
                somme[a][r] += n(l[2]);
                compte[a][r] += n(l[3]);
            }
        }
        /* cumul a date : du 1er janvier au meme jour et mois que la date du jour, pour chaque annee */
        double[] sommeAD = new double[somme.length], compteAD = new double[somme.length];
        String md = String.format("%02d%02d", jour.getMonthValue(), jour.getDayOfMonth());
        for (Object[] l : lignes("SELECT YEAR(" + s[1] + ") AS an, COALESCE(" + s[2] + ", 0), " + s[3] + s[0] + " AND "
                + s[1] + " >= ?1 AND " + s[1] + " < ?2 AND DATE_FORMAT(" + s[1] + ", '%m%d') <= '" + md
                + "' GROUP BY an", LocalDate.of(premier, 1, 1), fin)) {
            int a = (int) n(l[0]) - premier;
            if (a >= 0 && a < somme.length) {
                sommeAD[a] = n(l[1]);
                compteAD[a] = n(l[2]);
            }
        }
        JSONArray series = new JSONArray();
        int courant = rang(jour, pas);
        for (int a = somme.length - 1; a >= 0; a--) {
            JSONArray valeurs = new JSONArray();
            double total = 0, totalCompte = 0;
            for (int r = 0; r < nb; r++) {
                boolean futur = a == somme.length - 1 && r + 1 > courant;
                double v = panier ? (compte[a][r] == 0 ? 0 : somme[a][r] / compte[a][r]) : somme[a][r];
                valeurs.put(futur ? JSONObject.NULL : (Object) Math.round(v));
                total += somme[a][r];
                totalCompte += compte[a][r];
            }
            double aDate = panier ? (compteAD[a] == 0 ? 0 : sommeAD[a] / compteAD[a]) : sommeAD[a];
            series.put(new JSONObject().put("annee", premier + a).put("valeurs", valeurs)
                    .put("total", Math.round(panier ? (totalCompte == 0 ? 0 : total / totalCompte) : total))
                    .put("aDate", Math.round(aDate)));
        }
        double courantAD = series.getJSONObject(0).getDouble("aDate");
        for (int i = 1; i < series.length(); i++) {
            JSONObject o = series.getJSONObject(i);
            /* rien a comparer a une annee sans donnees : pas d'evolution plutot qu'un « 0 % » trompeur */
            o.put("evolution",
                    o.getDouble("aDate") == 0 ? JSONObject.NULL : (Object) evolution(courantAD, o.getDouble("aDate")));
        }
        JSONObject r = new JSONObject().put("success", true).put("mesure", mesure).put("pas", pas)
                .put("comparer", comparer).put("rangCourant", courant)
                .put("aDate", md.substring(2) + "/" + md.substring(0, 2)).put("series", series);
        CACHE.put(cle, new Object[] { System.currentTimeMillis(), r.toString() });
        return r;
    }

    /**
     * Frequentation : ventes et CA par heure (24 cases) sur la periode regardee, et sur la periode de comparaison
     * choisie : la periode precedente de meme duree, ou la meme periode N-1, N-2 ou N-3. Jours = jours avec une vente.
     */
    public JSONObject frequentation(LocalDate debut, LocalDate finExclue, String comparaison) {
        long jours = java.time.temporal.ChronoUnit.DAYS.between(debut, finExclue);
        LocalDate rd, rf;
        String libelle;
        switch (comparaison == null ? "" : comparaison) {
        case "N1":
        case "N2":
        case "N3":
            int k = comparaison.charAt(1) - '0';
            rd = debut.minusYears(k);
            rf = finExclue.minusYears(k);
            libelle = "Même période N-" + k;
            break;
        default:
            rd = debut.minusDays(jours);
            rf = debut;
            libelle = "Période précédente";
        }
        return new JSONObject().put("success", true).put("courante", heures(debut, finExclue, "Période regardée"))
                .put("reference", heures(rd, rf, libelle));
    }

    private JSONObject heures(LocalDate debut, LocalDate finExclue, String libelle) {
        JSONArray ventes = new JSONArray(), ca = new JSONArray();
        long[] v = new long[24], c = new long[24];
        for (Object[] l : lignes(
                "SELECT HOUR(p.dt_UPDATED), COUNT(*), COALESCE(SUM(p.int_PRICE - COALESCE("
                        + "p.int_PRICE_REMISE, 0)), 0) FROM t_preenregistrement p WHERE" + VENTES
                        + " AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2 GROUP BY HOUR(p.dt_UPDATED)",
                debut, finExclue)) {
            int h = (int) n(l[0]);
            v[h] = (long) n(l[1]);
            c[h] = Math.round(n(l[2]));
        }
        for (int h = 0; h < 24; h++) {
            ventes.put(v[h]);
            ca.put(c[h]);
        }
        Object j = lignes("SELECT COUNT(DISTINCT DATE(p.dt_UPDATED)), 0 FROM t_preenregistrement p WHERE" + VENTES
                + " AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2", debut, finExclue).get(0)[0];
        return new JSONObject().put("libelle", libelle).put("debut", debut.toString())
                .put("fin", finExclue.minusDays(1).toString()).put("jours", (long) n(j)).put("ventesH", ventes)
                .put("caH", ca);
    }

    /** Encaissements de la periode par mode de reglement (vente_reglement, comme le ticket Z). */
    public JSONObject encaissements(LocalDate debut, LocalDate finExclue) {
        JSONArray modes = new JSONArray();
        double total = 0;
        List<Object[]> l = lignes(
                "SELECT r.str_NAME, SUM(vr.montant) FROM vente_reglement vr JOIN t_preenregistrement p"
                        + " ON p.lg_PREENREGISTREMENT_ID = vr.vente_id JOIN t_type_reglement r"
                        + " ON r.lg_TYPE_REGLEMENT_ID = vr.type_regelement WHERE" + VENTES
                        + " AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2 GROUP BY r.str_NAME ORDER BY SUM(vr.montant) DESC",
                debut, finExclue);
        List<JSONObject> tmp = new ArrayList<>();
        for (Object[] x : l) {
            total += n(x[1]);
            tmp.add(new JSONObject().put("libelle", String.valueOf(x[0])).put("montant", Math.round(n(x[1]))));
        }
        for (JSONObject o : tmp) {
            modes.put(o);
        }
        return new JSONObject().put("success", true).put("total", Math.round(total)).put("modes", modes);
    }
}
