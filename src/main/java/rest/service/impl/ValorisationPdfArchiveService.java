package rest.service.impl;

import bll.configManagement.familleManagement;
import dal.TOfficine;
import dal.TParameters;
import dal.TUser;
import dal.dataManager;
import dal.jconnexion;
import java.io.File;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import report.reportManager;
import toolkits.utils.jdom;
import util.StockageDisque;
import bll.entity.EntityData;

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
 * Le document est exactement celui de l'ecran : memes modeles Jasper installes sur site ({@code rp_valoristion} par
 * emplacement, {@code rp_valoristion_by_famille} par famille), memes parametres, et le critere le plus large - tous les
 * emplacements ou toutes les familles -, ce qui correspond a ce qu'on obtient a la main en ne restreignant rien. Le
 * chemin de l'ecran n'est pas touche : l'archivage est un second appel, en lecture seule, qui ne partage avec lui que
 * les modeles.
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

    /** Critere « par emplacement » : modele rp_valoristion, celui de l'ecran quand on ne restreint rien. */
    public static final String CRITERE_EMPLACEMENT = "EMPLACEMENT";
    /** Critere « par famille » : modele rp_valoristion_by_famille. */
    public static final String CRITERE_FAMILLE = "FAMILLE";

    private static final String MODELE_EMPLACEMENT = "rp_valoristion";
    private static final String MODELE_FAMILLE = "rp_valoristion_by_famille";

    /** Tous les emplacements / toutes les familles : le modele filtre par LIKE, « % » ne restreint rien. */
    private static final String TOUT = "%";

    private static final DateTimeFormatter JOUR = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

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
        dataManager dm = new dataManager();
        jconnexion connexion = new jconnexion();
        try {
            dm.initEntityManager();
            TOfficine officine = dm.getEm().find(TOfficine.class, "1");
            Path cible = dossier().resolve(nomFichier(officine == null ? null : officine.getStrNOMABREGE(), jour));
            if (!forcer && Files.isRegularFile(cible) && cible.toFile().length() > 0) {
                LOG.log(Level.INFO, "Valorisation PDF : {0} existe deja, rien n''est reecrit", cible);
                return cible;
            }

            String critere = critere();
            String modele = CRITERE_FAMILLE.equals(critere) ? MODELE_FAMILLE : MODELE_EMPLACEMENT;
            Path modeleSource = cheminModele(modele);
            if (modeleSource == null) {
                LOG.log(Level.WARNING, "Valorisation PDF : modele {0}.jrxml introuvable, archivage abandonne", modele);
                return null;
            }

            reportManager rapport = new reportManager();
            rapport.setPath_report_src(modeleSource.toString());
            rapport.setPath_report_pdf(cible.toString());

            connexion.initConnexion();
            connexion.OpenConnexion();
            rapport.BuildReport(parametres(dm, officine, critere), connexion);

            if (Files.isRegularFile(cible) && cible.toFile().length() > 0) {
                LOG.log(Level.INFO, "Valorisation PDF archivee : {0} (critere {1})", new Object[] { cible, critere });
                return cible;
            }
            LOG.log(Level.WARNING, "Valorisation PDF : aucun document produit pour {0}", cible);
            return null;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "Valorisation PDF : echec de l'archivage du " + jour, e);
            return null;
        } finally {
            try {
                connexion.CloseConnexion();
            } catch (Exception e) {
                LOG.log(Level.FINE, "fermeture de la connexion de rapport", e);
            }
        }
    }

    /**
     * Modele Jasper : le repertoire des etats du site d'abord ({@code jdom.scr_report_file}), comme pour toutes les
     * autres editions. Aucun chemin en dur : c'est precisement ce qui faisait echouer certaines editions ailleurs que
     * sur le poste ou elles avaient ete ecrites.
     */
    private Path cheminModele(String modele) {
        String repertoire = repertoireEtats();
        if (StringUtils.isBlank(repertoire)) {
            return null;
        }
        File fichier = new File(repertoire, modele + ".jrxml");
        return fichier.isFile() ? fichier.toPath() : null;
    }

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

    /**
     * Memes parametres que l'edition de l'ecran, avec le critere le plus large. Les sous-etats sont cherches dans le
     * repertoire des etats du site, et non dans un chemin en dur.
     */
    private Map<String, Object> parametres(dataManager dm, TOfficine officine, String critere) {
        Map<String, Object> p = new HashMap<>();
        String repertoire = StringUtils.defaultString(repertoireEtats());

        p.put("P_H_CLT_INFOS", "Valorisation Simple\n d'Inventaire");
        p.put("P_H_LOGO", jdom.scr_report_file_logo);
        p.put("P_H_INSTITUTION", officine == null ? "" : StringUtils.defaultString(officine.getStrNOMABREGE()));
        p.put("P_INSTITUTION_ADRESSE",
                officine == null ? "" : StringUtils.defaultString(officine.getStrADRESSSEPOSTALE()));
        // Edition automatique : aucun operateur derriere. On le dit, plutot que de laisser croire
        // qu'une personne a lance le document.
        p.put("P_PRINTED_BY", "Archivage automatique");
        p.put("P_AUTRE_DESC", officine == null ? "" : StringUtils.trimToEmpty(officine.getStrFIRSTNAME()) + " "
                + StringUtils.trimToEmpty(officine.getStrLASTNAME()));
        p.put("P_H_CI", entete(officine == null ? null : officine.getStrCENTREIMPOSITION(),
                officine == null ? null : officine.getStrREGISTREIMPOSITION(), "CI:"));
        p.put("P_H_CC", entete(officine == null ? null : officine.getStrCOMPTECONTRIBUABLE(),
                officine == null ? null : officine.getStrREGISTRECOMMERCE(), "CC:"));
        p.put("P_H_PHONE", officine == null || StringUtils.isBlank(officine.getStrPHONE()) ? ""
                : "Tel: " + officine.getStrPHONE());

        p.put("P_SEARCH", TOUT);
        p.put("P_EMPLACEMENT_ID", TOUT);
        p.put("P_SUBTITLE", CRITERE_FAMILLE.equals(critere) ? "Famille article" : "Emplacement");
        p.put("P_START", "");
        p.put("P_END", "");
        p.put("P_PATH_SUBREPORT", repertoire);
        p.put("SUBREPORT_DIR", repertoire);

        totauxTva(dm, p);
        return p;
    }

    private static String entete(String premier, String second, String prefixe) {
        String a = StringUtils.trimToEmpty(premier);
        String b = StringUtils.trimToEmpty(second);
        String valeur = a.isEmpty() ? b : (b.isEmpty() ? a : a + " / " + b);
        return valeur.isEmpty() ? " " : prefixe + valeur;
    }

    /**
     * Totaux par taux de TVA, comme l'edition de l'ecran. Une officine dont la valorisation ne fait ressortir qu'un
     * seul taux (ou aucun) ne doit pas faire echouer l'edition : les montants manquants valent zero, alors que
     * l'edition de l'ecran leve une exception de conversion dans ce cas.
     */
    private void totauxTva(dataManager dm, Map<String, Object> p) {
        List<EntityData> lignes = new ArrayList<>();
        try {
            TUser aucun = null;
            lignes = new familleManagement(dm, aucun).getValorisationTVAData(TOUT);
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Valorisation PDF : totaux de TVA indisponibles, zeros utilises", e);
        }
        EntityData taux0 = lignes.size() > 0 ? lignes.get(0) : null;
        EntityData taux18 = lignes.size() > 1 ? lignes.get(1) : null;

        p.put("P_TVA_0", taux0 == null ? "" : StringUtils.defaultString(taux0.getStr_value5()));
        p.put("P_TVA_18", taux18 == null ? "" : StringUtils.defaultString(taux18.getStr_value5()));

        double pv0 = nombre(taux0 == null ? null : taux0.getStr_value1());
        double pv18 = nombre(taux18 == null ? null : taux18.getStr_value1());
        double paf0 = nombre(taux0 == null ? null : taux0.getStr_value3());
        double paf18 = nombre(taux18 == null ? null : taux18.getStr_value3());
        double pat0 = nombre(taux0 == null ? null : taux0.getStr_value4());
        double pat18 = nombre(taux18 == null ? null : taux18.getStr_value4());

        p.put("P_TVA_0_PV", pv0);
        p.put("P_TVA_18_PV", pv18);
        p.put("P_TVA_0_PAF", paf0);
        p.put("P_TVA_18_PAF", paf18);
        p.put("P_TVA_0_PAT", pat0);
        p.put("P_TVA_18_PAT", pat18);
        p.put("P_TVA_0_POND", pat0);
        p.put("P_TVA_18_POND", pat18);
        p.put("P_TVA_0_PVG", pv0 + pv18);
        p.put("P_TVA_0_PAFG", paf0 + paf18);
        p.put("P_TVA_0_PATG", pat0 + pat18);
        p.put("P_TVA_0_PONDG", String.valueOf(pat0 + pat18));
    }

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
