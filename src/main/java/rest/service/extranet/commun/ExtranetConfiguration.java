package rest.service.extranet.commun;

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
 * Reglages des connecteurs extranets, sur le modele de {@code PososConfiguration} : variable d'environnement, puis
 * propriete de la JVM, puis fichier {@code extranet.properties} hors depot (dossier de configuration de Prestige,
 * {@link util.StockageDisque}). Aucun reglage n'est un secret : la session (cookie) n'est jamais lue ici, elle est
 * fournie par l'administrateur et gardee en memoire ({@link SessionExtranet}).
 */
public final class ExtranetConfiguration {

    private static final Logger LOG = Logger.getLogger(ExtranetConfiguration.class.getName());

    static final String NOM_FICHIER = "extranet.properties";
    static final String CLE_FICHIER = "EXTRANET_CONFIG_FILE";

    /** Pause minimale entre deux appels vers un meme extranet. */
    public static final int PAUSE_DEFAUT_MS = 1000;
    public static final int DELAI_DEFAUT_MS = 20000;
    /** Garde-fou : au-dela, une collecte paginee s'arrete (DataTables de 25 lignes : 5 000 lignes). */
    public static final int PAGES_MAX_DEFAUT = 200;

    /** Source de lecture, injectable pour les tests. */
    public interface Source {
        String valeur(String cle);
    }

    private final Source source;
    private final Properties fichier;

    private ExtranetConfiguration(Source source, Properties fichier) {
        this.source = source;
        this.fichier = fichier == null ? new Properties() : fichier;
    }

    public static ExtranetConfiguration duServeur() {
        Source env = cle -> {
            String v = System.getenv(cle);
            return v != null ? v : System.getProperty(cle);
        };
        return new ExtranetConfiguration(env, chargerFichier(env.valeur(CLE_FICHIER)));
    }

    /** Pour les tests : reglages donnes, sans toucher a l'environnement. */
    public static ExtranetConfiguration de(Map<String, String> valeurs) {
        Map<String, String> copie = new LinkedHashMap<>(valeurs == null ? Map.of() : valeurs);
        return new ExtranetConfiguration(copie::get, null);
    }

    private static Properties chargerFichier(String chemin) {
        Properties p = new Properties();
        String vise = chemin;
        if (vise == null || vise.trim().isEmpty()) {
            try {
                vise = util.StockageDisque.fichierConfiguration(NOM_FICHIER).toString();
            } catch (Exception e) {
                return p;
            }
        }
        try {
            Path f = Paths.get(vise.trim());
            if (Files.isReadable(f)) {
                try (InputStream in = Files.newInputStream(f)) {
                    p.load(in);
                }
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Configuration des extranets illisible ({0})", vise);
        }
        return p;
    }

    private String lire(String cle) {
        String v = source.valeur(cle);
        if (v == null) {
            v = fichier.getProperty(cle);
        }
        return v == null || v.trim().isEmpty() ? null : v.trim();
    }

    private int entier(String cle, int defaut, int min, int max) {
        String v = lire(cle);
        if (v == null) {
            return defaut;
        }
        try {
            int n = Integer.parseInt(v);
            return Math.max(min, Math.min(max, n));
        } catch (NumberFormatException e) {
            return defaut;
        }
    }

    /** Adresse de l'extranet, sans barre finale. */
    public String adresse(SourceExtranet s) {
        String v = lire(s.prefixeCle() + "_URL");
        String a = v == null ? s.adresseParDefaut() : v;
        while (a.endsWith("/")) {
            a = a.substring(0, a.length() - 1);
        }
        return a;
    }

    public int pauseMs(SourceExtranet s) {
        return entier(s.prefixeCle() + "_PAUSE_MS", PAUSE_DEFAUT_MS, 0, 60000);
    }

    public int delaiMs(SourceExtranet s) {
        return entier(s.prefixeCle() + "_TIMEOUT_MS", DELAI_DEFAUT_MS, 1000, 120000);
    }

    /** Page qui porte le formulaire de connexion (defaut « / », redirections suivies sur le meme site). */
    public String cheminConnexion(SourceExtranet s) {
        String v = lire(s.prefixeCle() + "_CHEMIN_CONNEXION");
        return v == null || !v.startsWith("/") ? "/" : v;
    }

    /** Nom du champ identifiant, si la detection automatique (premier champ texte du formulaire) ne convient pas. */
    public String champIdentifiant(SourceExtranet s) {
        return lire(s.prefixeCle() + "_CHAMP_IDENTIFIANT");
    }

    public int pagesMax(SourceExtranet s) {
        return entier(s.prefixeCle() + "_PAGES_MAX", PAGES_MAX_DEFAUT, 1, 10000);
    }
}
