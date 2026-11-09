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

    /** Nom du pool de la ressource {@link #JNDI} dans domain.xml (laborex_pool si la ressource n'est pas decrite). */
    public static String nomPool(String xml) {
        String nom = null;
        Matcher r = Pattern.compile("<jdbc-resource\\b[^>]*>").matcher(xml == null ? "" : xml);
        while (r.find()) {
            if (JNDI.equals(attribut(r.group(), "jndi-name"))) {
                nom = attribut(r.group(), "pool-name");
                break;
            }
        }
        return StringUtils.isBlank(nom) ? "laborex_pool" : nom;
    }

    /** Nom de l'alias Payara qui porte le mot de passe (${ALIAS=nom}) ; null si le mot de passe est en clair. */
    public String alias() {
        Matcher m = Pattern.compile("^\\$\\{ALIAS=([^}]+)\\}$").matcher(motDePasse);
        return m.matches() ? m.group(1) : null;
    }

    /** Lit le pool de la ressource {@link #JNDI} ; null si domain.xml ne le decrit pas. */
    public static PoolMariaDb lire(String xml) {
        if (xml == null) {
            return null;
        }
        String nom = nomPool(xml);
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

    /**
     * Lit un fichier d'options du client MariaDB (section [client] : user, password, host, port, guillemets et
     * echappements de {@link #options()} compris) : le fichier d'identifiants du compte dedie de sauvegarde (cas 4, lot
     * 4.A). La base n'y figure pas : l'appelant la renseigne. null si aucune section [client].
     */
    public static PoolMariaDb depuisOptions(String texte) {
        if (texte == null) {
            return null;
        }
        PoolMariaDb p = null;
        boolean client = false;
        for (String ligne : texte.split("\\r?\\n")) {
            String l = ligne.trim();
            if (l.isEmpty() || l.startsWith("#") || l.startsWith(";")) {
                continue;
            }
            if (l.startsWith("[")) {
                client = l.equalsIgnoreCase("[client]");
                if (client && p == null) {
                    p = new PoolMariaDb();
                }
                continue;
            }
            int i = l.indexOf('=');
            if (!client || i < 0) {
                continue;
            }
            String cle = l.substring(0, i).trim().toLowerCase(), v = sansGuillemets(l.substring(i + 1).trim());
            switch (cle) {
            case "user":
                p.utilisateur = v;
                break;
            case "password":
                p.motDePasse = v;
                break;
            case "host":
                p.hote = StringUtils.defaultIfBlank(v, p.hote);
                break;
            case "port":
                if (StringUtils.isNumeric(v)) {
                    p.port = Integer.parseInt(v);
                }
                break;
            default:
                break;
            }
        }
        return p;
    }

    static String sansGuillemets(String v) {
        if (v.length() >= 2 && v.startsWith("\"") && v.endsWith("\"")) {
            StringBuilder b = new StringBuilder();
            for (int i = 1; i < v.length() - 1; i++) {
                char c = v.charAt(i);
                if (c == '\\' && i + 1 < v.length() - 1) {
                    b.append(v.charAt(++i));
                } else {
                    b.append(c);
                }
            }
            return b.toString();
        }
        return v;
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
