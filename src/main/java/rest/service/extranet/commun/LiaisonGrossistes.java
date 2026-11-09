package rest.service.extranet.commun;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import javax.persistence.EntityManager;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Table {@code extranet_grossiste} (demande du 09/11) : quel extranet sert quel grossiste de Prestige. Plusieurs
 * grossistes peuvent etre servis par le meme extranet (Ubipharm : une ligne par agence LABOREX-CI). L'ecran propose un
 * lien d'apres l'adresse extranet et le nom du grossiste ; seul l'enregistrement de l'utilisateur fait foi.
 */
public final class LiaisonGrossistes {

    /** Extranets qui servent des grossistes (Mayite est une base de specialites, pas un grossiste). */
    public static final List<SourceExtranet> SOURCES = Collections.unmodifiableList(Arrays
            .asList(SourceExtranet.UBIPHARM, SourceExtranet.TEDIS, SourceExtranet.COPHARMED, SourceExtranet.DPCI));

    public static final int LIAISONS_MAX = 2000;

    private final EntityManager em;

    public LiaisonGrossistes(EntityManager em) {
        this.em = em;
    }

    /** Libelle de l'extranet affiche a l'ecran et dans les suggestions. */
    public static String libelle(SourceExtranet s) {
        switch (s) {
        case UBIPHARM:
            return "Ubipharm";
        case COPHARMED:
            return "Copharmed";
        default:
            return s.name();
        }
    }

    /**
     * Extranet propose pour un grossiste, d'apres son adresse extranet puis son nom ; null s'il n'y a pas d'indice. Une
     * proposition n'est jamais enregistree seule.
     */
    public static SourceExtranet proposer(String libelle, String adresseExtranet) {
        String u = adresseExtranet == null ? "" : adresseExtranet.toLowerCase(Locale.ROOT);
        String n = " " + (libelle == null ? "" : libelle.toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", " ")) + " ";
        if (u.contains("ubipharm") || n.contains(" LABOREX ") || n.contains(" UBIPHARM ")) {
            return SourceExtranet.UBIPHARM;
        }
        if (u.contains("tedis") || n.contains(" TEDIS ")) {
            return SourceExtranet.TEDIS;
        }
        if (u.contains("copharmed") || n.contains(" COPHARMED ")) {
            return SourceExtranet.COPHARMED;
        }
        if (u.contains("dpci") || n.contains(" DPCI ")) {
            return SourceExtranet.DPCI;
        }
        return null;
    }

    /** Extranet liable lu d'un texte (« ubipharm », « TEDIS »...) ; null si vide ou inconnu. */
    public static SourceExtranet liable(String texte) {
        SourceExtranet s = SourceExtranet.lire(texte);
        return s != null && SOURCES.contains(s) ? s : null;
    }

    /** Liens enregistres : grossiste vers extranet. */
    @SuppressWarnings("unchecked")
    public Map<String, SourceExtranet> liens() {
        Map<String, SourceExtranet> m = new HashMap<>();
        for (Object[] l : (List<Object[]>) em
                .createNativeQuery("SELECT lg_GROSSISTE_ID, source FROM extranet_grossiste").getResultList()) {
            SourceExtranet s = liable((String) l[1]);
            if (s != null) {
                m.put((String) l[0], s);
            }
        }
        return m;
    }

    /** Extranet d'un grossiste ; null s'il n'est pas lie. */
    public SourceExtranet sourceDe(String grossisteId) {
        return grossisteId == null ? null : liens().get(grossisteId);
    }

    /**
     * Ecran : tous les grossistes actifs (et ceux lies, meme inactifs), avec l'extranet lie et l'extranet propose.
     */
    @SuppressWarnings("unchecked")
    public JSONObject lire() {
        Map<String, SourceExtranet> liens = liens();
        JSONArray g = new JSONArray();
        Map<String, Integer> parSource = new LinkedHashMap<>();
        for (SourceExtranet s : SOURCES) {
            parSource.put(s.name(), 0);
        }
        List<Object[]> lignes = em.createNativeQuery(
                "SELECT g.lg_GROSSISTE_ID, g.str_LIBELLE, g.str_CODE, g.str_URL_EXTRANET, g.str_STATUT, e.modifie_le,"
                        + " e.modifie_par FROM t_grossiste g LEFT JOIN extranet_grossiste e"
                        + " ON e.lg_GROSSISTE_ID = g.lg_GROSSISTE_ID"
                        + " WHERE g.str_STATUT = 'enable' OR e.lg_GROSSISTE_ID IS NOT NULL ORDER BY g.str_LIBELLE")
                .getResultList();
        for (Object[] l : lignes) {
            String id = (String) l[0];
            SourceExtranet lie = liens.get(id), propose = proposer((String) l[1], (String) l[3]);
            if (lie != null) {
                parSource.merge(lie.name(), 1, Integer::sum);
            }
            g.put(new JSONObject().put("id", id).put("libelle", l[1] == null ? "" : l[1])
                    .put("code", l[2] == null ? "" : l[2]).put("actif", "enable".equals(l[4]))
                    .put("source", lie == null ? "" : lie.name()).put("propose", propose == null ? "" : propose.name())
                    .put("modifieLe", l[5] == null ? JSONObject.NULL : l[5].toString())
                    .put("modifiePar", l[6] == null ? JSONObject.NULL : l[6]));
        }
        JSONArray sources = new JSONArray();
        for (SourceExtranet s : SOURCES) {
            sources.put(new JSONObject().put("source", s.name()).put("libelle", libelle(s)).put("lies",
                    parSource.get(s.name())));
        }
        return new JSONObject().put("success", true).put("grossistes", g).put("sources", sources);
    }

    /**
     * Enregistre les liens envoyes : [{grossiste, source}], source vide = lien retire. Les grossistes absents de la
     * liste gardent leur lien. Refus (aucune ecriture) si un grossiste ou un extranet est inconnu.
     *
     * @return message de refus, null si enregistre
     */
    @SuppressWarnings("unchecked")
    public String enregistrer(JSONArray liaisons, String utilisateur, int[] compte) {
        if (liaisons == null || liaisons.length() == 0) {
            return "Aucun lien à enregistrer";
        }
        if (liaisons.length() > LIAISONS_MAX) {
            return "Trop de liens envoyés";
        }
        Map<String, SourceExtranet> voulu = new LinkedHashMap<>();
        List<String> ids = new ArrayList<>();
        for (int i = 0; i < liaisons.length(); i++) {
            JSONObject o = liaisons.optJSONObject(i);
            String id = o == null ? "" : o.optString("grossiste", "").trim();
            String src = o == null ? "" : o.optString("source", "").trim();
            if (id.isEmpty()) {
                return "Grossiste manquant";
            }
            SourceExtranet s = src.isEmpty() ? null : liable(src);
            if (!src.isEmpty() && s == null) {
                return "Extranet inconnu : " + src;
            }
            voulu.put(id, s);
            ids.add(id);
        }
        java.util.Set<String> connus = new java.util.HashSet<>(
                (List<String>) em.createNativeQuery("SELECT lg_GROSSISTE_ID FROM t_grossiste").getResultList());
        for (String id : ids) {
            if (!connus.contains(id)) {
                return "Grossiste inconnu";
            }
        }
        Map<String, SourceExtranet> avant = liens();
        int changes = 0;
        for (Map.Entry<String, SourceExtranet> e : voulu.entrySet()) {
            SourceExtranet a = avant.get(e.getKey()), s = e.getValue();
            if (a == s) {
                continue;
            }
            changes++;
            if (s == null) {
                em.createNativeQuery("DELETE FROM extranet_grossiste WHERE lg_GROSSISTE_ID = ?1")
                        .setParameter(1, e.getKey()).executeUpdate();
            } else if (a == null) {
                em.createNativeQuery("INSERT INTO extranet_grossiste (lg_GROSSISTE_ID, source, modifie_le, modifie_par)"
                        + " VALUES (?1, ?2, NOW(), ?3)").setParameter(1, e.getKey()).setParameter(2, s.name())
                        .setParameter(3, utilisateur).executeUpdate();
            } else {
                em.createNativeQuery("UPDATE extranet_grossiste SET source = ?2, modifie_le = NOW(), modifie_par = ?3"
                        + " WHERE lg_GROSSISTE_ID = ?1").setParameter(1, e.getKey()).setParameter(2, s.name())
                        .setParameter(3, utilisateur).executeUpdate();
            }
        }
        if (compte != null && compte.length > 0) {
            compte[0] = changes;
        }
        return null;
    }
}
