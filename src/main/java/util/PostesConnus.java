package util;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Plan du 09/11, point 7 : postes connus de l'officine, lus dans le journal des connexions (t_session_utilisateur, une
 * ligne par connexion, avec le poste : nom saisi sur le poste, sinon nom reseau). Une ligne par poste : derniere
 * connexion, utilisateur et adresse de cette derniere connexion, nombre de connexions. Les noms qui ne different que
 * par la casse sont un seul poste (comme la base). Poste vide ou absent : ignore. De la plus recente a la plus ancienne
 * ; a egalite, l'identifiant de session le plus grand d'abord.
 */
public final class PostesConnus {

    /** Jours observes. */
    public static final int JOURS = 365;
    /** Lignes rendues au plus. */
    public static final int LIMITE = 200;

    private PostesConnus() {
    }

    /** Une connexion du journal. {@code debut} au format « aaaa-mm-jj hh:mm:ss » (ordre de tri = ordre du texte). */
    public static final class Connexion {

        final String poste;
        final String debut;
        final String id;
        final String utilisateur;
        final String ip;

        public Connexion(String poste, String debut, String id, String utilisateur, String ip) {
            this.poste = poste;
            this.debut = debut == null ? "" : debut;
            this.id = id == null ? "" : id;
            this.utilisateur = utilisateur == null ? "" : utilisateur.trim();
            this.ip = ip == null ? "" : ip;
        }
    }

    public static List<Map<String, Object>> regrouper(List<Connexion> connexions, int limite) {
        List<Connexion> l = new ArrayList<>();
        for (Connexion c : connexions) {
            if (c.poste != null && !c.poste.trim().isEmpty()) {
                l.add(c);
            }
        }
        l.sort(Comparator.comparing((Connexion c) -> c.debut).thenComparing(c -> c.id).reversed());
        Map<String, Map<String, Object>> vus = new LinkedHashMap<>();
        for (Connexion c : l) {
            String cle = c.poste.trim().toLowerCase(Locale.ROOT);
            Map<String, Object> m = vus.get(cle);
            if (m == null) {
                m = new LinkedHashMap<>();
                m.put("poste", c.poste.trim());
                m.put("derniere", c.debut);
                m.put("utilisateur", c.utilisateur);
                m.put("ip", c.ip);
                m.put("connexions", 0);
                vus.put(cle, m);
            }
            m.put("connexions", (Integer) m.get("connexions") + 1);
        }
        List<Map<String, Object>> r = new ArrayList<>(vus.values());
        return r.size() > limite ? new ArrayList<>(r.subList(0, limite)) : r;
    }
}
