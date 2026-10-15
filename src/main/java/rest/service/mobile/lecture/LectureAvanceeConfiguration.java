package rest.service.mobile.lecture;

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
 * O5 (Prestige Mobile) : configuration de la lecture avancee des ordonnances (service externe de lecture d'ecriture).
 * <p>
 * Meme regle que la passerelle Posos : AUCUNE cle dans le code, dans Git, dans une reponse ni dans les journaux. Lue,
 * par ordre de priorite, dans une variable d'environnement du serveur, une propriete systeme de la JVM de meme nom,
 * puis le fichier {@code lecture-avancee.properties} du dossier de configuration de Prestige (celui de
 * {@code dicisms.properties} ; {@code LECTURE_AVANCEE_CONFIG_FILE} permet de le placer ailleurs).
 * <p>
 * Cles :
 * <ul>
 * <li>{@code LECTURE_AVANCEE_FOURNISSEUR} : {@code claude} (defaut si une cle est presente), {@code google}, ou
 * {@code aucun} ;</li>
 * <li>{@code LECTURE_AVANCEE_CLE} : cle d'API du fournisseur (jamais renvoyee) ;</li>
 * <li>{@code LECTURE_AVANCEE_MODELE} : modele du fournisseur Claude, OBLIGATOIRE (aucun modele n'est ecrit dans le code
 * : sans cette cle, la lecture avancee par Claude reste desactivee) ;</li>
 * <li>{@code LECTURE_AVANCEE_URL} : adresse du service (defaut : celle du fournisseur ; un faux service local pour les
 * essais) ;</li>
 * <li>{@code LECTURE_AVANCEE_QUOTA_JOUR} : lectures par jour pour toute l'officine (defaut 50) ;</li>
 * <li>{@code LECTURE_AVANCEE_DELAI_MS} : delai maximal d'une lecture (defaut 30 000) ;</li>
 * <li>{@code LECTURE_AVANCEE_PRIX_ENTREE} / {@code LECTURE_AVANCEE_PRIX_SORTIE} : prix en dollars par million de
 * jetons, pour le cout estime journalise (defaut 0 : cout non estime).</li>
 * </ul>
 */
public final class LectureAvanceeConfiguration {

    private static final Logger LOG = Logger.getLogger(LectureAvanceeConfiguration.class.getName());

    static final String NOM_FICHIER = "lecture-avancee.properties";
    static final String CLE_FICHIER = "LECTURE_AVANCEE_CONFIG_FILE";
    static final String CLE_FOURNISSEUR = "LECTURE_AVANCEE_FOURNISSEUR";
    static final String CLE_CLE = "LECTURE_AVANCEE_CLE";
    static final String CLE_MODELE = "LECTURE_AVANCEE_MODELE";
    static final String CLE_URL = "LECTURE_AVANCEE_URL";
    static final String CLE_QUOTA = "LECTURE_AVANCEE_QUOTA_JOUR";
    static final String CLE_DELAI = "LECTURE_AVANCEE_DELAI_MS";
    static final String CLE_PRIX_ENTREE = "LECTURE_AVANCEE_PRIX_ENTREE";
    static final String CLE_PRIX_SORTIE = "LECTURE_AVANCEE_PRIX_SORTIE";

    public static final String CLAUDE = "claude";
    public static final String GOOGLE = "google";
    public static final String AUCUN = "aucun";

    public static final String URL_CLAUDE = "https://api.anthropic.com/v1/messages";
    public static final String URL_GOOGLE = "https://vision.googleapis.com/v1/images:annotate";

    /** Source de valeurs (injectable pour les tests). */
    public interface Source {
        String valeur(String cle);
    }

    private final Source source;
    private final Properties fichier;

    LectureAvanceeConfiguration(Source source, Properties fichier) {
        this.source = source;
        this.fichier = fichier == null ? new Properties() : fichier;
    }

    public static LectureAvanceeConfiguration duServeur() {
        Source env = cle -> {
            String v = System.getenv(cle);
            return v != null ? v : System.getProperty(cle);
        };
        return new LectureAvanceeConfiguration(env, chargerFichier(env.valeur(CLE_FICHIER)));
    }

    public static LectureAvanceeConfiguration de(Map<String, String> valeurs) {
        Map<String, String> copie = new LinkedHashMap<>(valeurs == null ? Map.of() : valeurs);
        return new LectureAvanceeConfiguration(copie::get, null);
    }

    private static Properties chargerFichier(String chemin) {
        Properties p = new Properties();
        String vise;
        if (chemin != null && !chemin.trim().isEmpty()) {
            vise = chemin.trim();
        } else {
            try {
                vise = util.StockageDisque.fichierConfiguration(NOM_FICHIER).toString();
            } catch (Exception e) {
                return p;
            }
        }
        try {
            Path f = Paths.get(vise);
            if (Files.isReadable(f)) {
                try (InputStream in = Files.newInputStream(f)) {
                    p.load(in);
                }
            }
        } catch (Exception e) {
            // Jamais le contenu du fichier dans le journal : il porte la cle.
            LOG.log(Level.WARNING, "Configuration de la lecture avancee illisible ({0})", vise);
        }
        return p;
    }

    private String brut(String cle) {
        String v = source.valeur(cle);
        if (v == null || v.trim().isEmpty()) {
            v = fichier.getProperty(cle);
        }
        return v == null || v.trim().isEmpty() ? null : v.trim();
    }

    /** Cle du fournisseur : accessible au paquet seulement (fournisseurs), jamais exposee. */
    String cle() {
        return brut(CLE_CLE);
    }

    public String fournisseur() {
        String f = brut(CLE_FOURNISSEUR);
        if (f == null) {
            return cle() != null ? CLAUDE : AUCUN;
        }
        f = f.toLowerCase(java.util.Locale.ROOT);
        return CLAUDE.equals(f) || GOOGLE.equals(f) ? f : AUCUN;
    }

    /** Configuree : un fournisseur et une cle (ou une adresse locale de faux service pour les essais). */
    public boolean configuree() {
        String f = fournisseur();
        if (AUCUN.equals(f)) {
            return false;
        }
        if (CLAUDE.equals(f) && modele() == null) {
            return false;
        }
        return cle() != null || (brut(CLE_URL) != null && estLocale(brut(CLE_URL)));
    }

    static boolean estLocale(String url) {
        return url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1");
    }

    public String modele() {
        return brut(CLE_MODELE);
    }

    public String url() {
        String u = brut(CLE_URL);
        if (u != null) {
            return u;
        }
        return GOOGLE.equals(fournisseur()) ? URL_GOOGLE : URL_CLAUDE;
    }

    public int quotaJour() {
        return entier(CLE_QUOTA, 50, 0, 100000);
    }

    public int delaiMs() {
        return entier(CLE_DELAI, 30000, 2000, 120000);
    }

    /** Prix en dollars par million de jetons d'entree. */
    public double prixEntree() {
        return decimal(CLE_PRIX_ENTREE, 0);
    }

    public double prixSortie() {
        return decimal(CLE_PRIX_SORTIE, 0);
    }

    private int entier(String cle, int defaut, int min, int max) {
        try {
            String v = brut(cle);
            return v == null ? defaut : Math.max(min, Math.min(max, Integer.parseInt(v)));
        } catch (NumberFormatException e) {
            return defaut;
        }
    }

    private double decimal(String cle, double defaut) {
        try {
            String v = brut(cle);
            return v == null ? defaut : Double.parseDouble(v.replace(',', '.'));
        } catch (NumberFormatException e) {
            return defaut;
        }
    }
}
