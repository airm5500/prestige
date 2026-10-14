package rest.service.impl.serveur;

import java.util.Locale;
import java.util.regex.Pattern;
import org.apache.commons.lang3.StringUtils;

/**
 * EXPERIENCE UTILISATEUR (RUM, retour du 14/10) : regles pures des mesures envoyees par les navigateurs.
 * <p>
 * Le navigateur regroupe ses mesures par minute (ouverture d'ecran, appel au serveur, erreur JavaScript) et les envoie
 * par lots. Ne sont conserves que le TYPE, une CLE normalisee (nom de l'ecran, ou methode + chemin de l'appel sans
 * parametres ni identifiants), le nombre, la duree totale et maximale, le nombre d'echecs : jamais de contenu, de
 * parametre de requete ni de donnee de patient ou de vente.
 */
public final class Rum {

    public enum Type {
        ECRAN, API, ERREUR, PAGE
    }

    public static final int MAX_LOTS = 500;
    public static final long MAX_MS = 600_000L;
    public static final int MAX_NOMBRE = 100_000;

    private static final Pattern NOMBRE = Pattern.compile("/\\d+(?=/|$)");
    private static final Pattern UUID = Pattern
            .compile("/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(?=/|$)");
    /** Segments qui ressemblent a un identifiant (longs, ou chiffres et lettres melanges : CIP, references). */
    private static final Pattern IDENTIFIANT = Pattern.compile("/(?=[A-Za-z0-9_-]*\\d)[A-Za-z0-9_-]{6,}(?=/|$)");

    private Rum() {
    }

    public static Type type(String v) {
        try {
            return Type.valueOf(StringUtils.trimToEmpty(v).toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * Cle d'un appel : « GET v1/ventes/{id} ». Le debut de l'adresse (hote, contexte, ../api/), les parametres et les
     * identifiants sont retires ; la methode est gardee.
     */
    public static String cleApi(String methode, String url) {
        String m = StringUtils.defaultIfBlank(methode, "GET").trim().toUpperCase(Locale.ROOT);
        if (!m.matches("GET|POST|PUT|DELETE|PATCH")) {
            m = "GET";
        }
        String u = StringUtils.defaultString(url);
        int q = u.indexOf('?');
        u = q >= 0 ? u.substring(0, q) : u;
        int h = u.indexOf('#');
        u = h >= 0 ? u.substring(0, h) : u;
        int api = u.indexOf("/api/");
        if (api >= 0) {
            u = u.substring(api + 5);
        } else {
            u = u.replaceFirst("^(https?://[^/]+)?/?(prestige/)?", "").replaceFirst("^(\\.\\./)+", "");
        }
        u = "/" + u.replaceAll("^/+", "");
        u = UUID.matcher(u).replaceAll("/{id}");
        u = NOMBRE.matcher(u).replaceAll("/{id}");
        u = IDENTIFIANT.matcher(u).replaceAll("/{id}");
        u = u.replaceAll("[^A-Za-z0-9_./{}-]", "").replaceAll("^/", "");
        return StringUtils.left(m + " " + u, 160);
    }

    /** Cle d'un ecran (xtype) ou d'une erreur : lettres, chiffres, point, tiret, souligne, espace ; 160 au plus. */
    public static String cleSimple(String v) {
        return StringUtils.left(StringUtils.defaultString(v).replaceAll("[^A-Za-z0-9_. -]", "").trim(), 160);
    }

    /** Duree recue, bornee (une duree negative ou absurde vaut 0). */
    public static long duree(long ms) {
        return ms < 0 || ms > MAX_MS ? 0 : ms;
    }
}
