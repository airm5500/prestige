package rest.service.impl.controle;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import javax.persistence.EntityManager;
import org.json.JSONObject;

/**
 * Retours du 10/10 (Q11, lecture 2) : le controle des BL fait dans l'application mobile (quantites comptees ligne par
 * ligne), lu pour l'etat de controle des achats et le pointage des BL : lignes controlees, ecarts (quantite comptee
 * differente de la quantite recue), qui a controle en dernier et quand.
 */
public final class ControleBl {

    private ControleBl() {
    }

    /** Resume du controle par BL (identifiant du BL → {lignes, controlees, ecarts, par, le}). */
    @SuppressWarnings("unchecked")
    public static Map<String, JSONObject> parBl(EntityManager em, Collection<String> blIds) {
        Map<String, JSONObject> m = new HashMap<>();
        List<String> ids = new ArrayList<>(blIds);
        for (int i = 0; i < ids.size(); i += 500) {
            List<String> paquet = ids.subList(i, Math.min(ids.size(), i + 500));
            for (Object[] r : (List<Object[]>) em.createNativeQuery("SELECT d.lg_BON_LIVRAISON_ID, COUNT(*),"
                    + " SUM(CASE WHEN d.checked = 1 OR COALESCE(d.quantite_controle, 0) > 0 THEN 1 ELSE 0 END),"
                    + " SUM(CASE WHEN (d.checked = 1 OR d.quantite_controle IS NOT NULL)"
                    + "   AND COALESCE(d.quantite_controle, 0) <> COALESCE(d.int_QTE_RECUE, 0) THEN 1 ELSE 0 END),"
                    + " DATE_FORMAT(MAX(d.dt_CONTROLE), '%d/%m/%Y %H:%i'),"
                    + " SUBSTRING_INDEX(GROUP_CONCAT(TRIM(CONCAT(COALESCE(u.str_FIRST_NAME, ''), ' ', COALESCE(u.str_LAST_NAME, '')))"
                    + "   ORDER BY d.dt_CONTROLE DESC SEPARATOR '|'), '|', 1)"
                    + " FROM t_bon_livraison_detail d LEFT JOIN t_user u ON u.lg_USER_ID = d.lg_CONTROLE_USER"
                    + " WHERE d.lg_BON_LIVRAISON_ID IN (?1) GROUP BY d.lg_BON_LIVRAISON_ID").setParameter(1, paquet)
                    .getResultList()) {
                int lignes = n(r[1]), controlees = n(r[2]);
                m.put(String.valueOf(r[0]), new JSONObject().put("lignes", lignes).put("controlees", controlees)
                        .put("ecarts", n(r[3])).put("le", r[4] == null ? "" : String.valueOf(r[4]))
                        .put("par", r[5] == null ? "" : String.valueOf(r[5]).trim())
                        .put("statut", controlees == 0 ? "NON_TRAITE" : controlees >= lignes ? "TERMINE" : "EN_COURS"));
            }
        }
        return m;
    }

    private static int n(Object o) {
        return o == null ? 0 : ((Number) o).intValue();
    }

    /** Texte court pour une cellule : « 12/12 · 1 écart · par X le jj/mm/aaaa hh:mm ». */
    public static String resume(JSONObject c) {
        if (c == null || c.optInt("controlees") == 0) {
            return "";
        }
        StringBuilder s = new StringBuilder(c.optInt("controlees") + "/" + c.optInt("lignes"));
        int e = c.optInt("ecarts");
        s.append(" · ").append(e == 0 ? "sans écart" : e + " écart" + (e > 1 ? "s" : ""));
        if (!c.optString("par").isEmpty() || !c.optString("le").isEmpty()) {
            s.append(" · ").append(c.optString("par").isEmpty() ? "" : "par " + c.optString("par") + " ")
                    .append(c.optString("le").isEmpty() ? "" : "le " + c.optString("le"));
        }
        return s.toString().trim();
    }
}
