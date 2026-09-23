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
    /**
     * Mode de l'analyse (retour du 23/09 : « la solution intermediaire avant Posos »).
     * <ul>
     * <li>absent : tant que Posos n'est PAS configure, l'analyse passe par le mode demonstration (regles preparees,
     * {@link PososDemonstration}) ; des que les acces Posos sont renseignes, c'est Posos ;</li>
     * <li>{@code demonstration} : mode demonstration force, meme avec Posos configure ;</li>
     * <li>{@code aucun} : ni demonstration ni Posos tant qu'il n'est pas configure.</li>
     * </ul>
     * Ne se regle que cote serveur.
     */
    static final String CLE_MODE = "POSOS_MODE";

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

    /** Mode demonstration demande cote serveur. */
    public boolean modeDemonstration() {
        String v = lire(CLE_MODE);
        if (v == null) {
            /* La solution intermediaire : sans acces Posos, c'est elle qui repond. */
            return !estConfiguree();
        }
        return v.equalsIgnoreCase("demonstration") || v.equalsIgnoreCase("démonstration") || v.equalsIgnoreCase("demo");
    }

    /** L'analyse peut etre lancee : Posos configure, ou mode demonstration. */
    public boolean estUtilisable() {
        return modeDemonstration() || estConfiguree();
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
        /* « configuree » = l'analyse peut etre lancee ; « mode » dit par quoi (le bouton de l'ecran en depend). */
        d.put("configuree", estUtilisable());
        d.put("mode", modeDemonstration() ? "demonstration" : "posos");
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

    /**
     * Modele de configuration, ecrit dans le fichier cree au deploiement. Les valeurs sont VIDES : un secret ne se
     * trouve ni dans Git ni dans un fichier livre. Les commentaires disent quoi mettre, et ou.
     */
    static final String MODELE = "# =====================================================================\n"
            + "# Configuration de la passerelle Posos.\n"
            + "# ---------------------------------------------------------------------\n"
            + "# Ce fichier a ete cree automatiquement au deploiement parce qu'il\n"
            + "# n'existait pas encore. Il est VIDE de toute valeur : renseignez les\n"
            + "# trois premieres lignes avec les identifiants fournis par Posos, puis\n"
            + "# redemarrez l'application.\n" + "#\n"
            + "# Ce fichier n'est jamais ecrase : une fois renseigne, il reste tel quel\n"
            + "# a tous les deploiements suivants.\n" + "#\n"
            + "# Les droits de ce fichier doivent le reserver au compte de service : il\n" + "# porte un secret.\n"
            + "#\n" + "# La passerelle lit sa configuration dans cet ordre de priorite :\n"
            + "#   1. une variable d'environnement du serveur ;\n"
            + "#   2. une propriete systeme de la JVM, de meme nom ;\n" + "#   3. ce fichier.\n"
            + "# Une variable d'environnement est preferable : elle ne laisse pas le\n" + "# secret sur le disque.\n"
            + "#\n" + "# Rien de tout cela n'est expose au navigateur : le service\n"
            + "# v1/posos/status ne rend que l'adresse, les chemins, l'identifiant\n"
            + "# MASQUE et des booleans. L'ecran Analyse Posologie affiche le chemin\n"
            + "# exact de ce fichier et dit s'il est present.\n"
            + "# =====================================================================\n" + "\n"
            + "# Adresse de base de l'API, sans slash final. Exemple : https://api.posos.co\n"
            + PososConfiguration.CLE_URL + "=\n" + "\n"
            + "# Identifiants OAuth2 (client_credentials), fournis par Posos.\n" + PososConfiguration.CLE_CLIENT_ID
            + "=\n" + PososConfiguration.CLE_CLIENT_SECRET + "=\n" + "\n"
            + "# Chemins, a ajuster si Posos les nomme autrement.\n" + PososConfiguration.CLE_TOKEN_PATH + "="
            + TOKEN_PATH_DEFAUT + "\n" + PososConfiguration.CLE_ANALYSIS_PATH + "=" + ANALYSIS_PATH_DEFAUT + "\n" + "\n"
            + "# Facultatif : portee demandee au jeton.\n" + "#" + PososConfiguration.CLE_SCOPE + "=\n" + "\n"
            + "# Facultatif : identifiants en en-tete Basic (1, defaut) ou dans le corps\n" + "# du formulaire (0).\n"
            + "#" + PososConfiguration.CLE_BASIC + "=1\n" + "\n"
            + "# Facultatif : delai d'attente en millisecondes (defaut " + DELAI_DEFAUT_MS + ").\n" + "#"
            + PososConfiguration.CLE_DELAI + "=" + DELAI_DEFAUT_MS + "\n" + "\n"
            + "# Tant que Posos n'est pas configure, l'analyse passe par le MODE DEMONSTRATION\n"
            + "# (regles preparees, bandeau rouge a l'ecran). Des que les identifiants ci-dessus\n"
            + "# sont renseignes, c'est Posos. Pour forcer : demonstration ; pour desactiver : aucun.\n" + "#"
            + PososConfiguration.CLE_MODE + "=demonstration\n";

    /**
     * Cree {@code posos.properties} au deploiement s'il n'existe pas, dans le dossier de {@code dicisms.properties} -
     * exactement comme l'application cree ce dernier a son premier demarrage.
     *
     * <p>
     * Retour de l'officine : « je ne le vois nulle part ». Attendre de l'exploitant qu'il recopie un modele depuis le
     * depot de code ne marche pas : le fichier doit apparaitre tout seul, a l'endroit ou l'ecran dit qu'il le cherche,
     * avec les bonnes cles et les explications dedans.
     *
     * <p>
     * Un fichier DEJA PRESENT n'est jamais touche, quel que soit son contenu : la configuration du site ne doit pas
     * etre effacee par un deploiement. Rien n'est ecrit non plus quand l'emplacement a ete impose par
     * {@code POSOS_CONFIG_FILE} : l'exploitant a alors choisi lui-meme ou se trouve le fichier.
     *
     * @return le chemin du fichier cree, ou {@code null} si rien n'a ete ecrit
     */
    public static Path creerModeleSiAbsent() {
        if (System.getenv(CLE_FICHIER) != null || System.getProperty(CLE_FICHIER) != null) {
            return null;
        }
        try {
            return creerModeleSiAbsent(util.StockageDisque.fichierConfiguration(NOM_FICHIER));
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Configuration Posos non creee : " + e.getMessage());
            return null;
        }
    }

    /**
     * Meme chose sur un fichier donne. Separee pour etre verifiable sans ecrire dans le dossier de configuration de la
     * machine qui fait tourner les tests.
     */
    static Path creerModeleSiAbsent(Path fichier) {
        try {
            if (fichier == null || Files.exists(fichier)) {
                return null;
            }
            Path dossier = fichier.getParent();
            if (dossier != null) {
                Files.createDirectories(dossier);
            }
            Files.write(fichier, MODELE.getBytes(java.nio.charset.StandardCharsets.ISO_8859_1));
            LOG.log(Level.INFO, "Configuration Posos creee, a renseigner : {0}", fichier);
            return fichier;
        } catch (Exception e) {
            // Un fichier de configuration qu'on n'a pas pu creer n'empeche pas l'application de demarrer :
            // la passerelle se declare simplement « non configuree », et l'ecran dit ou deposer le fichier.
            LOG.log(Level.WARNING, "Configuration Posos non creee : " + e.getMessage());
            return null;
        }
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
