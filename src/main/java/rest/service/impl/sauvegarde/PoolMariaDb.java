package rest.service.impl.sauvegarde;

import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.apache.commons.lang3.StringUtils;

/**
 * Acces a la base du pool de Prestige, lu dans domain.xml (hote, port, base, utilisateur, mot de passe) pour l'outil de
 * sauvegarde de MariaDB. Le mot de passe ne sort jamais d'ici que vers le fichier d'options temporaire de l'outil.
 */
public final class PoolMariaDb {

    public static final String JNDI = "jdbc/__laborex_pool";

    public String hote = "localhost";
    public int port = 3306;
    public String base = "";
    public String utilisateur = "";
    public String motDePasse = "";

    private PoolMariaDb() {
    }

    /** Lit le pool de la ressource {@link #JNDI} ; null si domain.xml ne le decrit pas. */
    public static PoolMariaDb lire(String xml) {
        if (xml == null) {
            return null;
        }
        String nom = null;
        Matcher r = Pattern.compile("<jdbc-resource\\b[^>]*>").matcher(xml);
        while (r.find()) {
            if (JNDI.equals(attribut(r.group(), "jndi-name"))) {
                nom = attribut(r.group(), "pool-name");
                break;
            }
        }
        if (StringUtils.isBlank(nom)) {
            nom = "laborex_pool";
        }
        Matcher m = Pattern.compile("<jdbc-connection-pool\\b[^>]*\\sname=\"" + Pattern.quote(nom)
                + "\"[^>]*>([\\s\\S]*?)</jdbc-connection-pool>").matcher(xml);
        if (!m.find()) {
            return null;
        }
        String bloc = m.group(1);
        PoolMariaDb p = new PoolMariaDb();
        String url = propriete(bloc, "url");
        if (StringUtils.isNotBlank(url)) {
            Matcher u = Pattern.compile("jdbc:(?:mariadb|mysql)://([^:/?]+)(?::(\\d+))?/([^?;]*)").matcher(url);
            if (u.find()) {
                p.hote = u.group(1);
                p.port = u.group(2) == null ? 3306 : Integer.parseInt(u.group(2));
                p.base = u.group(3);
            }
        }
        p.hote = StringUtils.defaultIfBlank(propriete(bloc, "serverName"), p.hote);
        String port = propriete(bloc, "portNumber");
        if (StringUtils.isNumeric(port)) {
            p.port = Integer.parseInt(port);
        }
        p.base = StringUtils.defaultIfBlank(propriete(bloc, "databaseName"), p.base);
        p.utilisateur = StringUtils.defaultString(propriete(bloc, "user"));
        p.motDePasse = StringUtils.defaultString(propriete(bloc, "password"));
        return p;
    }

    /** Mot de passe range par Payara sous un alias (${ALIAS=...}) : illisible pour l'outil de sauvegarde. */
    public boolean motDePasseProtege() {
        return motDePasse.startsWith("${");
    }

    /**
     * Fichier d'options du client MariaDB ([client]) : valeurs entre guillemets, antislash et guillemet echappes, pour
     * qu'un mot de passe avec # ou espace soit lu tel quel.
     */
    public String options() {
        return "[client]\nuser=" + guillemets(utilisateur) + "\npassword=" + guillemets(motDePasse) + "\nhost="
                + guillemets(hote) + "\nport=" + port + "\n";
    }

    static String guillemets(String v) {
        return "\"" + StringUtils.defaultString(v).replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
    }

    private static String propriete(String bloc, String nom) {
        Matcher m = Pattern.compile("<property\\b[^>]*\\sname=\"" + nom + "\"[^>]*>", Pattern.CASE_INSENSITIVE)
                .matcher(bloc);
        return m.find() ? attribut(m.group(), "value") : null;
    }

    private static String attribut(String balise, String nom) {
        Matcher m = Pattern.compile("\\s" + Pattern.quote(nom) + "=\"([^\"]*)\"").matcher(balise);
        return m.find() ? xml(m.group(1)) : null;
    }

    private static String xml(String v) {
        return v.replace("&quot;", "\"").replace("&apos;", "'").replace("&lt;", "<").replace("&gt;", ">")
                .replace("&amp;", "&");
    }
}
