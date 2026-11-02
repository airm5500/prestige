package rest.service.impl;

import dal.TOfficine;
import dal.TParameters;
import java.io.File;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import rest.report.pdf.Stock;
import toolkits.utils.jdom;
import util.StockageDisque;

/**
 * Archivage de la valorisation du stock en PDF (evolution 5, point 2).
 *
 * <p>
 * La valorisation ne s'obtenait qu'a la demande, depuis l'ecran : rien n'en gardait la trace, et une officine qui
 * voulait comparer la valeur de son stock d'un mois sur l'autre devait avoir pense a imprimer le PDF et a le ranger
 * elle-meme. Le traitement produit desormais le document tout seul les jours de fin et de debut de mois et le range
 * dans le sous-dossier {@code valorisations}, a cote des donnees de support.
 * </p>
 *
 * <p>
 * Le document est celui qu'imprime l'ecran Valorisation (retour du 02/11) : meme modele
 * ({@code rp_valorisation_stock_produit2}), memes donnees et meme titre, produits par le meme code
 * ({@link rest.report.pdf.Stock#valorisationArchivee}), pour le stock total de l'officine, par emplacement ou par
 * famille selon le reglage, sans restriction. L'ancien modele de 2017 ({@code rp_valoristion}) n'est plus utilise.
 * </p>
 */
@Stateless
public class ValorisationPdfArchiveService {

    private static final Logger LOG = Logger.getLogger(ValorisationPdfArchiveService.class.getName());

    /** Sous-dossier d'archivage, voisin de « support » sous la racine de stockage Prestige. */
    public static final String DOSSIER = "valorisations";

    public static final String PARAM_ACTIF = "KEY_VALORISATION_PDF_ACTIF";
    public static final String PARAM_CRITERE = "KEY_VALORISATION_PDF_CRITERE";
    public static final String PARAM_MOIS_CONSERVES = "KEY_VALORISATION_PDF_MOIS_CONSERVES";

    /** Critere « par emplacement » : valorisation par emplacement de l'ecran (mode 2). */
    public static final String CRITERE_EMPLACEMENT = "EMPLACEMENT";
    /** Critere « par famille » : valorisation par famille d'article de l'ecran (mode 1). */
    public static final String CRITERE_FAMILLE = "FAMILLE";

    /** Modele de l'impression de l'ecran Valorisation, installe sur site. */
    static final String MODELE = "rp_valorisation_stock_produit2";

    /** Emplacement de l'officine (le stock des depots d'extension a sa propre valorisation). */
    private static final String OFFICINE = "1";

    private static final DateTimeFormatter JOUR = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private Stock stock;

    /**
     * Jours d'archivage : fin de mois (27 au 31) et debut du suivant (1 au 3), soit huit editions par mois quel que
     * soit le nombre de jours du mois. Fevrier n'en produit que six, il n'a ni 30 ni 31 : c'est voulu, on ne veut pas
     * d'edition qui ne corresponde a aucune journee reelle.
     */
    public static boolean jourDArchivage(LocalDate jour) {
        int j = jour.getDayOfMonth();
        return j >= 27 || j <= 3;
    }

    public boolean estActif() {
        TParameters p = em.find(TParameters.class, PARAM_ACTIF);
        return p == null || !"0".equals(StringUtils.trimToEmpty(p.getStrVALUE()));
    }

    /** Critere retenu, EMPLACEMENT par defaut : une valeur inattendue ne doit pas empecher l'archivage. */
    public String critere() {
        TParameters p = em.find(TParameters.class, PARAM_CRITERE);
        String valeur = p == null ? null : StringUtils.trimToNull(p.getStrVALUE());
        return CRITERE_FAMILLE.equalsIgnoreCase(valeur) ? CRITERE_FAMILLE : CRITERE_EMPLACEMENT;
    }

    public int moisConserves() {
        TParameters p = em.find(TParameters.class, PARAM_MOIS_CONSERVES);
        try {
            int mois = Integer.parseInt(StringUtils.trimToEmpty(p.getStrVALUE()));
            return mois > 0 ? mois : 12;
        } catch (Exception e) {
            return 12;
        }
    }

    public Path dossier() {
        return StockageDisque.sousDossier(DOSSIER);
    }

    /**
     * Nom du fichier du jour : {@code valorisation_<officine>_du_<AAAA-MM-JJ>.pdf}. Le nom de l'officine est
     * translittere et les separateurs remplaces : le fichier doit rester nommable sur tous les systemes, et deux
     * archivages du meme jour doivent retomber sur le meme nom pour ne pas s'empiler.
     */
    public String nomFichier(String nomOfficine, LocalDate jour) {
        return "valorisation_" + assainir(nomOfficine) + "_du_" + jour.format(JOUR) + ".pdf";
    }

    static String assainir(String libelle) {
        String base = StringUtils.defaultIfBlank(libelle, "officine");
        String sansAccents = Normalizer.normalize(base, Normalizer.Form.NFD).replaceAll("\\p{M}+", "");
        String propre = sansAccents.replaceAll("[^A-Za-z0-9]+", "_").replaceAll("_+", "_");
        return StringUtils.strip(propre, "_").toLowerCase();
    }

    /**
     * Produit l'archive du jour. Ne rien reecrire quand le fichier du jour existe deja : un redemarrage du serveur en
     * pleine fenetre d'archivage ne doit pas remplacer une valorisation prise cette nuit par une valorisation de milieu
     * de journee.
     *
     * @return le chemin du fichier produit, ou {@code null} si rien n'a ete fait (traitement arrete, jour hors fenetre,
     *         fichier deja present, ou echec journalise)
     */
    public Path archiver(LocalDate jour, boolean forcer) {
        if (!forcer && !jourDArchivage(jour)) {
            return null;
        }
        if (!estActif()) {
            LOG.log(Level.INFO, "Valorisation PDF : archivage arrete par {0}", PARAM_ACTIF);
            return null;
        }
        try {
            TOfficine officine = em.find(TOfficine.class, OFFICINE);
            Path cible = dossier().resolve(nomFichier(officine == null ? null : officine.getStrNOMABREGE(), jour));
            if (!forcer && Files.isRegularFile(cible) && cible.toFile().length() > 0) {
                LOG.log(Level.INFO, "Valorisation PDF : {0} existe deja, rien n''est reecrit", cible);
                return cible;
            }
            String repertoire = repertoireEtats();
            if (StringUtils.isBlank(repertoire) || !new File(repertoire, MODELE + ".jrxml").isFile()) {
                LOG.log(Level.WARNING, "Valorisation PDF : modele {0}.jrxml introuvable, archivage abandonne", MODELE);
                return null;
            }
            String critere = critere();
            stock.valorisationArchivee(CRITERE_FAMILLE.equals(critere) ? 1 : 2, jour, OFFICINE, cible.toString());

            if (Files.isRegularFile(cible) && cible.toFile().length() > 0) {
                LOG.log(Level.INFO, "Valorisation PDF archivee : {0} (critere {1})", new Object[] { cible, critere });
                return cible;
            }
            LOG.log(Level.WARNING, "Valorisation PDF : aucun document produit pour {0}", cible);
            return null;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Valorisation PDF : echec de l'archivage du " + jour, e);
            return null;
        }
    }

    /**
     * Repertoire des etats du site ({@code jdom.scr_report_file}), charge s'il ne l'est pas encore : le traitement de
     * nuit peut passer avant toute edition.
     */
    static String repertoireEtats() {
        if (StringUtils.isNotBlank(jdom.scr_report_file)) {
            return jdom.scr_report_file;
        }
        try {
            jdom.InitRessource();
            jdom.LoadRessource();
        } catch (Exception e) {
            LOG.log(Level.FINE, "chargement de la configuration des etats", e);
        }
        return jdom.scr_report_file;
    }

    /** Conversion tolerante d'un montant lu en texte : zero plutot qu'une erreur. */
    static double nombre(String valeur) {
        try {
            return Double.parseDouble(StringUtils.trimToEmpty(valeur));
        } catch (Exception e) {
            return 0d;
        }
    }

    /**
     * Retire les archives plus anciennes que la duree de conservation. La borne est calculee en mois pleins depuis le
     * premier jour du mois courant : au 3 octobre avec douze mois conserves, on garde depuis le 1er octobre de l'annee
     * precedente, soit les douze derniers mois complets plus le mois en cours.
     *
     * @return nombre de fichiers retires
     */
    public int purger(LocalDate aujourdHui) {
        LocalDate borne = aujourdHui.withDayOfMonth(1).minusMonths(moisConserves());
        int retires = 0;
        try (DirectoryStream<Path> fichiers = Files.newDirectoryStream(dossier(), "valorisation_*.pdf")) {
            for (Path fichier : fichiers) {
                LocalDate jour = jourDuNom(fichier.getFileName().toString());
                if (jour != null && jour.isBefore(borne)) {
                    Files.deleteIfExists(fichier);
                    retires++;
                }
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Valorisation PDF : purge impossible", e);
        }
        if (retires > 0) {
            LOG.log(Level.INFO, "Valorisation PDF : {0} archive(s) de plus de {1} mois retiree(s)",
                    new Object[] { retires, moisConserves() });
        }
        return retires;
    }

    /** Date portee par le nom du fichier, seule source fiable : la date du systeme de fichiers peut etre recopiee. */
    public static LocalDate jourDuNom(String nomFichier) {
        int marque = nomFichier.lastIndexOf("_du_");
        if (marque < 0) {
            return null;
        }
        String jour = nomFichier.substring(marque + 4).replace(".pdf", "");
        try {
            return LocalDate.parse(jour, JOUR);
        } catch (Exception e) {
            return null;
        }
    }

    /** Archives presentes, de la plus recente a la plus ancienne. */
    public List<Path> archives() {
        List<Path> trouvees = new ArrayList<>();
        try (DirectoryStream<Path> fichiers = Files.newDirectoryStream(dossier(), "valorisation_*.pdf")) {
            for (Path fichier : fichiers) {
                trouvees.add(fichier);
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Valorisation PDF : lecture du dossier impossible", e);
        }
        trouvees.sort(Comparator.comparing((Path f) -> StringUtils.defaultString(
                jourDuNom(f.getFileName().toString()) == null ? "" : jourDuNom(f.getFileName().toString()).toString()))
                .reversed());
        return trouvees;
    }
}
