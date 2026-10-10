package util;

import javax.servlet.http.HttpServletRequest;

/**
 * Retours du 10/10 (journal) : poste, adresse IP et application de la requete en cours, pour le fichier journal. Pose
 * par le filtre d'authentification de l'API, retire en fin de requete (les threads HTTP sont reutilises).
 * <ul>
 * <li>poste : nom saisi une fois sur le poste (en-tete X-Poste, memorise par le navigateur), sinon nom reseau
 * ({@link NomDePoste}, calcule seulement si une ligne de journal est ecrite) ;</li>
 * <li>application : navigateur et systeme lus dans l'en-tete User-Agent, ou « Application mobile ».</li>
 * </ul>
 */
public final class ContexteRequete {

    private static final class Contexte {
        final HttpServletRequest requete;
        final String ip, posteDeclare, agent;
        String poste;

        Contexte(HttpServletRequest r) {
            this.requete = r;
            String transmis = r.getHeader("X-Forwarded-For");
            this.ip = transmis != null && !transmis.trim().isEmpty() ? transmis.split(",")[0].trim()
                    : r.getRemoteAddr();
            this.posteDeclare = nettoyer(decoder(r.getHeader("X-Poste")));
            this.agent = r.getHeader("User-Agent");
        }
    }

    private static final ThreadLocal<Contexte> COURANT = new ThreadLocal<>();

    private ContexteRequete() {
    }

    public static void poser(HttpServletRequest requete) {
        if (requete == null) {
            COURANT.remove();
            return;
        }
        try {
            COURANT.set(new Contexte(requete));
        } catch (RuntimeException e) {
            COURANT.remove();
        }
    }

    public static void effacer() {
        COURANT.remove();
    }

    public static String ip() {
        Contexte c = COURANT.get();
        return c == null ? null : c.ip;
    }

    public static String poste() {
        Contexte c = COURANT.get();
        if (c == null) {
            return null;
        }
        if (c.poste == null) {
            try {
                c.poste = c.posteDeclare != null ? c.posteDeclare : NomDePoste.depuis(c.requete);
            } catch (RuntimeException e) {
                c.poste = c.ip;
            }
        }
        return c.poste;
    }

    public static String application() {
        Contexte c = COURANT.get();
        return c == null ? null : application(c.agent);
    }

    private static String decoder(String v) {
        if (v == null) {
            return null;
        }
        try {
            return java.net.URLDecoder.decode(v, "UTF-8");
        } catch (Exception e) {
            return v;
        }
    }

    /** Nom de poste saisi : lettres, chiffres, espace, tiret, point, souligne ; 60 caracteres au plus. */
    static String nettoyer(String v) {
        if (v == null) {
            return null;
        }
        String s = v.replaceAll("[^\\p{L}\\p{N} ._\\-]", "").trim();
        return s.isEmpty() ? null : s.length() > 60 ? s.substring(0, 60) : s;
    }

    /** « Chrome 120 · Windows », « Firefox 115 · Linux », « Application mobile »… (120 caracteres au plus). */
    public static String application(String agent) {
        if (agent == null || agent.trim().isEmpty()) {
            return null;
        }
        String a = agent;
        if (a.startsWith("Dart/") || a.contains("prestige_vente_app") || a.contains("okhttp")) {
            return "Application mobile";
        }
        String nav = version(a, "Edg/", "Edge");
        nav = nav != null ? nav : version(a, "OPR/", "Opera");
        nav = nav != null ? nav : version(a, "Firefox/", "Firefox");
        nav = nav != null ? nav : version(a, "Chrome/", "Chrome");
        nav = nav != null ? nav : a.contains("Safari/") ? version(a, "Version/", "Safari") : null;
        nav = nav != null ? nav : a.contains("Trident/") || a.contains("MSIE") ? "Internet Explorer" : null;
        String os = a.contains("Windows") ? "Windows"
                : a.contains("Android") ? "Android" : a.contains("iPhone") || a.contains("iPad") ? "iOS"
                        : a.contains("Mac OS") ? "macOS" : a.contains("Linux") ? "Linux" : null;
        String r = nav == null ? a : nav + (os == null ? "" : " · " + os);
        return r.length() > 120 ? r.substring(0, 120) : r;
    }

    private static String version(String agent, String marque, String nom) {
        int i = agent.indexOf(marque);
        if (i < 0) {
            return null;
        }
        String v = agent.substring(i + marque.length()).split("[ ;)]")[0];
        return nom + (v.isEmpty() ? "" : " " + v.split("\\.")[0]);
    }
}
