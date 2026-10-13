package rest.service.impl;

import java.time.YearMonth;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.persistence.EntityManager;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Charges mensuelles de l'officine (besoins du 11/10, point 11 : rentabilite nette du Pilotage). Une ligne par mois et
 * par categorie (t_charge_mensuelle) ; resultat net = marge brute - charges.
 */
public final class PilotageCharges {

    /** Categories proposees a la saisie : code -> libelle. */
    public static final Map<String, String> CATEGORIES = new LinkedHashMap<>();

    static {
        CATEGORIES.put("SALAIRES", "Salaires et charges sociales");
        CATEGORIES.put("LOYER", "Loyer");
        CATEGORIES.put("ENERGIE", "Électricité, eau");
        CATEGORIES.put("TELECOM", "Téléphone, internet");
        CATEGORIES.put("IMPOTS", "Impôts et taxes");
        CATEGORIES.put("ASSURANCES", "Assurances");
        CATEGORIES.put("ENTRETIEN", "Entretien, réparations");
        CATEGORIES.put("BANQUE", "Frais bancaires");
        CATEGORIES.put("AUTRES", "Autres charges");
    }

    private PilotageCharges() {
    }

    /** Total des charges par mois ("2026-09" -> montant) entre deux mois inclus. */
    @SuppressWarnings("unchecked")
    static Map<String, Long> parMois(EntityManager em, YearMonth debut, YearMonth fin) {
        Map<String, Long> m = new LinkedHashMap<>();
        for (Object[] o : (List<Object[]>) em
                .createNativeQuery("SELECT mois, SUM(montant) total FROM t_charge_mensuelle"
                        + " WHERE mois BETWEEN ?1 AND ?2 GROUP BY mois")
                .setParameter(1, debut.toString()).setParameter(2, fin.toString()).getResultList()) {
            m.put(String.valueOf(o[0]), ((Number) o[1]).longValue());
        }
        return m;
    }

    /** Grille de saisie d'une annee : une ligne par categorie, une colonne par mois (m01 .. m12), et le total. */
    @SuppressWarnings("unchecked")
    public static JSONObject grille(EntityManager em, int annee) {
        Map<String, JSONObject> lignes = new LinkedHashMap<>();
        CATEGORIES.forEach(
                (code, libelle) -> lignes.put(code, new JSONObject().put("categorie", code).put("libelle", libelle)));
        for (Object[] o : (List<Object[]>) em
                .createNativeQuery("SELECT mois, categorie, montant FROM t_charge_mensuelle" + " WHERE mois LIKE ?1")
                .setParameter(1, annee + "-%").getResultList()) {
            JSONObject l = lignes.get(String.valueOf(o[1]));
            if (l != null) {
                l.put("m" + String.valueOf(o[0]).substring(5, 7), ((Number) o[2]).longValue());
            }
        }
        JSONArray data = new JSONArray();
        lignes.values().forEach(data::put);
        return new JSONObject().put("success", true).put("annee", annee).put("data", data);
    }

    /** Controle d'une saisie ; message d'erreur, ou null si elle est valable. */
    public static String controler(int annee, int mois, String categorie, Long montant) {
        if (annee < 2000 || annee > 2100 || mois < 1 || mois > 12) {
            return "Mois invalide.";
        }
        if (!CATEGORIES.containsKey(categorie)) {
            return "Catégorie de charge inconnue.";
        }
        if (montant != null && (montant < 0 || montant > 100_000_000_000L)) {
            return "Montant invalide.";
        }
        return null;
    }

    /** Enregistre (ou retire, montant vide ou 0) la charge d'un mois et d'une categorie. A appeler en transaction. */
    public static void enregistrer(EntityManager em, int annee, int mois, String categorie, Long montant,
            String userId) {
        String m = YearMonth.of(annee, mois).toString();
        em.createNativeQuery("DELETE FROM t_charge_mensuelle WHERE mois = ?1 AND categorie = ?2").setParameter(1, m)
                .setParameter(2, categorie).executeUpdate();
        if (montant != null && montant > 0) {
            em.createNativeQuery("INSERT INTO t_charge_mensuelle (mois, categorie, montant, updated_at, lg_USER_ID)"
                    + " VALUES (?1, ?2, ?3, NOW(), ?4)").setParameter(1, m).setParameter(2, categorie)
                    .setParameter(3, montant).setParameter(4, userId).executeUpdate();
        }
    }

    /** Resultat net et son taux sur le CA hors taxes (null si pas de CA). */
    static double[] resultat(double marge, double charges, double caHT) {
        double net = marge - charges;
        return new double[] { net, caHT == 0 ? Double.NaN : net / caHT * 100d };
    }
}
