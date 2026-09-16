package rest.service.posos;

import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Properties;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * Configuration de la passerelle Posos.
 *
 * <p>
 * Aucun identifiant n'est ecrit dans le code : la consigne de l'officine est qu'aucun secret ne se trouve dans le
 * JavaScript, dans Git, dans une reponse de statut, ni dans les journaux. La configuration est donc lue, dans cet ordre
 * de priorite :
 * <ol>
 * <li>une variable d'environnement du serveur ({@code POSOS_CLIENT_SECRET}...) ;</li>
 * <li>une propriete systeme de la JVM, de meme nom ;</li>
 * <li>un fichier de proprietes hors du depot, {@code posos.properties}, dans le MEME dossier que
 * {@code dicisms.properties} - sur Windows {@code D:\prestige\config} (ou F:, E:), ou le dossier historique du profil
 * s'il existe deja. {@code POSOS_CONFIG_FILE} permet de le placer ailleurs.</li>
 * </ol>
 *
 * <p>
 * Le secret ne sort jamais de cette classe : il n'a pas d'accesseur public, et le diagnostic expose l'identifiant
 * masque et des booleans, jamais une valeur. C'est pour cela que la classe est finale et sans etat conserve.
 */
public final class PososConfiguration {

    private static final Logger LOG = Logger.getLogger(PososConfiguration.class.getName());

    /** Nom du fichier de configuration de la passerelle. */
    static final String NOM_FICHIER = "posos.properties";

    /**
     * Emplacement par defaut : le MEME dossier que {@code dicisms.properties}, resolu par la meme regle - sur Windows
     * {@code D:\prestige\config} (ou F:, E:), ou le dossier historique du profil s'il existe deja.
     *
     * <p>
     * Un chemin en dur ne conviendrait pas : les postes de l'officine sont sous Windows, et un fichier depose dans un
     * dossier que personne ne pense a ouvrir n'est jamais trouve.
     */
    static String fichierParDefaut() {
        try {
            return util.StockageDisque.fichierConfiguration(NOM_FICHIER).toString();
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Dossier de configuration introuvable : posos.properties sera ignore");
            return NOM_FICHIER;
        }
    }

    static final String CLE_FICHIER = "POSOS_CONFIG_FILE";
    static final String CLE_URL = "POSOS_API_URL";
    static final String CLE_CLIENT_ID = "POSOS_CLIENT_ID";
    static final String CLE_CLIENT_SECRET = "POSOS_CLIENT_SECRET";
    static final String CLE_TOKEN_PATH = "POSOS_TOKEN_PATH";
    static final String CLE_ANALYSIS_PATH = "POSOS_ANALYSIS_PATH";
    static final String CLE_SCOPE = "POSOS_SCOPE";
    static final String CLE_DELAI = "POSOS_TIMEOUT_MS";
    /** Vrai pour envoyer les identifiants en en-tete Basic, faux pour les mettre dans le corps du formulaire. */
    static final String CLE_BASIC = "POSOS_TOKEN_BASIC_AUTH";

    static final String TOKEN_PATH_DEFAUT = "/oauth/token";
    static final String ANALYSIS_PATH_DEFAUT = "/v1/analysis";
    static final int DELAI_DEFAUT_MS = 15000;

    /** Source de lecture, injectable pour les tests : nom de cle -> valeur, ou null. */
    public interface Source {
        String valeur(String cle);
    }

    private final Source source;
    private final Properties fichier;

    PososConfiguration(Source source, Properties fichier) {
        this.source = source;
        this.fichier = fichier == null ? new Properties() : fichier;
    }

    /** Configuration du serveur : environnement, puis proprietes systeme, puis fichier du site. */
    public static PososConfiguration duServeur() {
        Source env = cle -> {
            String v = System.getenv(cle);
            return v != null ? v : System.getProperty(cle);
        };
        return new PososConfiguration(env, chargerFichier(env.valeur(CLE_FICHIER)));
    }

    /** Configuration batie sur une source donnee : sert aux tests, sans toucher a l'environnement reel. */
    public static PososConfiguration de(Map<String, String> valeurs) {
        Map<String, String> copie = new LinkedHashMap<>(valeurs == null ? Map.of() : valeurs);
        return new PososConfiguration(copie::get, null);
    }

    private static Properties chargerFichier(String chemin) {
        Properties p = new Properties();
        String vise = chemin == null || chemin.trim().isEmpty() ? fichierParDefaut() : chemin.trim();
        try {
            Path f = Paths.get(vise);
            if (!Files.isReadable(f)) {
                return p;
            }
            try (InputStream in = Files.newInputStream(f)) {
                p.load(in);
            }
        } catch (Exception e) {
            // On ne recopie jamais le contenu du fichier dans le journal : il porte le secret.
            LOG.log(Level.WARNING, "Configuration Posos illisible ({0})", vise);
        }
        return p;
    }

    private String lire(String cle) {
        String v = source == null ? null : source.valeur(cle);
        if (v == null || v.trim().isEmpty()) {
            v = fichier.getProperty(cle);
        }
        return v == null || v.trim().isEmpty() ? null : v.trim();
    }

    private String lire(String cle, String defaut) {
        String v = lire(cle);
        return v == null ? defaut : v;
    }

    public String url() {
        return sansSlashFinal(lire(CLE_URL));
    }

    public String cheminJeton() {
        return lire(CLE_TOKEN_PATH, TOKEN_PATH_DEFAUT);
    }

    public String cheminAnalyse() {
        return lire(CLE_ANALYSIS_PATH, ANALYSIS_PATH_DEFAUT);
    }

    public String clientId() {
        return lire(CLE_CLIENT_ID);
    }

    /**
     * Le secret. Volontairement non public : seul le client de la passerelle, dans ce meme paquet, y accede, et il ne
     * le place que dans l'en-tete ou le corps de la demande de jeton.
     */
    String clientSecret() {
        return lire(CLE_CLIENT_SECRET);
    }

    public String scope() {
        return lire(CLE_SCOPE);
    }

    public boolean jetonEnBasic() {
        String v = lire(CLE_BASIC);
        return v == null || "1".equals(v) || "true".equalsIgnoreCase(v) || "oui".equalsIgnoreCase(v);
    }

    public int delaiMs() {
        try {
            String v = lire(CLE_DELAI);
            if (v == null) {
                return DELAI_DEFAUT_MS;
            }
            int ms = Integer.parseInt(v);
            return ms > 0 ? ms : DELAI_DEFAUT_MS;
        } catch (NumberFormatException e) {
            return DELAI_DEFAUT_MS;
        }
    }

    /** La passerelle n'est utilisable que si l'adresse et les deux identifiants sont tous les trois presents. */
    public boolean estConfiguree() {
        return url() != null && clientId() != null && clientSecret() != null;
    }

    public String urlJeton() {
        return joindre(url(), cheminJeton());
    }

    public String urlAnalyse() {
        return joindre(url(), cheminAnalyse());
    }

    /**
     * Ce que le statut peut montrer sans rien trahir : l'adresse, les chemins, l'identifiant masque et des booleans.
     * Jamais le secret, jamais l'identifiant en clair.
     */
    public Map<String, Object> diagnostic() {
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("configuree", estConfiguree());
        d.put("url", url() == null ? "" : url());
        d.put("cheminJeton", cheminJeton());
        d.put("cheminAnalyse", cheminAnalyse());
        d.put("clientId", masquer(clientId()));
        d.put("secretRenseigne", clientSecret() != null);
        d.put("scopeRenseigne", scope() != null);
        d.put("delaiMs", delaiMs());
        // Ou deposer le fichier, et s'il y est : la question « je ne le vois nulle part » ne doit plus se poser.
        String attendu = fichierAttendu();
        d.put("fichierAttendu", attendu);
        d.put("fichierPresent", java.nio.file.Files.isReadable(Paths.get(attendu)));
        return d;
    }

    /** Chemin du fichier de configuration effectivement consulte, pour que l'ecran puisse le dire. */
    public String fichierAttendu() {
        String choisi = lire(CLE_FICHIER);
        return choisi != null ? choisi : fichierParDefaut();
    }

    /**
     * Masque une valeur sensible : seuls les quatre derniers caracteres restent lisibles, et rien n'est montre en
     * dessous de huit caracteres. Un identifiant court serait devinable a partir de son masque.
     */
    static String masquer(String valeur) {
        if (valeur == null || valeur.isEmpty()) {
            return "";
        }
        if (valeur.length() < 8) {
            return "****";
        }
        return "****" + valeur.substring(valeur.length() - 4);
    }

    /** Concatene sans doubler ni perdre le separateur. */
    static String joindre(String base, String chemin) {
        if (base == null) {
            return null;
        }
        String b = sansSlashFinal(base);
        String c = chemin == null ? "" : chemin.trim();
        if (c.isEmpty()) {
            return b;
        }
        return c.startsWith("/") ? b + c : b + "/" + c;
    }

    static String sansSlashFinal(String v) {
        if (v == null) {
            return null;
        }
        String s = v.trim();
        while (s.endsWith("/")) {
            s = s.substring(0, s.length() - 1);
        }
        return s.isEmpty() ? null : s;
    }
}
