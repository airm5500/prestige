package rest.service.impl.sauvegarde;

import java.io.BufferedOutputStream;
import java.io.File;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.PosixFilePermissions;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.logging.Level;
import java.util.logging.Logger;
import java.util.zip.GZIPOutputStream;
import javax.annotation.Resource;
import javax.ejb.Asynchronous;
import javax.ejb.ConcurrencyManagement;
import javax.ejb.ConcurrencyManagementType;
import javax.ejb.EJB;
import javax.ejb.SessionContext;
import javax.ejb.Singleton;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.sql.DataSource;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.SupportEventService;

/**
 * SAUVEGARDES DE LA BASE (retour du 01/11 : Prestige n'avait pas de sauvegarde integree ; objectif : une heure de
 * donnees perdue au plus).
 * <ul>
 * <li>outil de MariaDB (mariadb-dump, a defaut mysqldump) trouve dans le dossier de MariaDB (@@basedir) ou le parametre
 * KEY_SAUVEGARDE_OUTIL ; acces lus dans domain.xml et passes par un fichier d'options temporaire, jamais en ligne de
 * commande ni dans les journaux ;</li>
 * <li>--single-transaction : copie coherente sans bloquer les ventes ; compressee a la volee (.sql.gz), ecrite sous un
 * nom provisoire puis renommee seulement si l'outil a fini (« Dump completed ») ;</li>
 * <li>copie optionnelle sur un second dossier (autre disque, cle, partage) ; conservation : tout sur
 * KEY_SAUVEGARDE_GARDER_HEURES (48), puis une par jour sur KEY_SAUVEGARDE_GARDER_JOURS (30) ;</li>
 * <li>historique dans t_sauvegarde ; echec, ou aucune sauvegarde reussie depuis 2 h, signale au Centre de support.</li>
 * </ul>
 */
@Singleton
@ConcurrencyManagement(ConcurrencyManagementType.BEAN)
@TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
public class SauvegardeService {

    private static final Logger LOG = Logger.getLogger(SauvegardeService.class.getName());
    static final String CLE_DOSSIER = "KEY_SAUVEGARDE_DOSSIER";
    static final String CLE_COPIE = "KEY_SAUVEGARDE_COPIE";
    static final String CLE_ACTIVE = "KEY_SAUVEGARDE_ACTIVE";
    static final String CLE_GARDER_HEURES = "KEY_SAUVEGARDE_GARDER_HEURES";
    static final String CLE_GARDER_JOURS = "KEY_SAUVEGARDE_GARDER_JOURS";
    static final String CLE_OUTIL = "KEY_SAUVEGARDE_OUTIL";
    /** Horaires de la sauvegarde automatique (vide : toutes les heures), voir {@link HorairesSauvegarde}. */
    static final String CLE_HORAIRES = "KEY_SAUVEGARDE_HORAIRES";
    /** Poste qui fait les sauvegardes (vide : celui qui heberge la base), voir {@link PosteSauvegarde}. */
    static final String CLE_POSTE = "KEY_SAUVEGARDE_POSTE";
    /** Nom du verrou de MariaDB : un par base (plusieurs officines peuvent partager un serveur MariaDB). */
    private static final String VERROU = "CONCAT('prestige_sauvegarde_', DATABASE())";
    private static final String FIN_OUTIL = "-- Dump completed";

    @Resource(mappedName = PoolMariaDb.JNDI)
    private DataSource dataSource;
    @Resource
    private SessionContext contexte;
    @EJB
    private SupportEventService supportEventService;

    private final AtomicBoolean enCours = new AtomicBoolean();
    private volatile long enCoursDepuis;

    /* ============================================================================================ reglages */

    public String dossier() {
        return StringUtils.defaultIfBlank(parametre(CLE_DOSSIER), File.separatorChar == '\\'
                ? "C:\\prestige\\sauvegardes" : System.getProperty("user.home") + "/prestige-sauvegardes");
    }

    /** Second dossier des sauvegardes ; vide si aucun. */
    public String copie() {
        return StringUtils.defaultString(parametre(CLE_COPIE));
    }

    public boolean active() {
        return !"0".equals(parametre(CLE_ACTIVE));
    }

    public HorairesSauvegarde horaires() {
        return HorairesSauvegarde.lire(parametre(CLE_HORAIRES));
    }

    /** Valeur de KEY_SAUVEGARDE_POSTE, vide si le serveur est celui qui heberge la base. */
    public String posteImpose() {
        return StringUtils.trimToEmpty(parametre(CLE_POSTE));
    }

    /** Ce poste fait-il les sauvegardes ? Seul le serveur les fait (retour du 12/11). */
    public boolean posteServeur() {
        String hote = null;
        try {
            PoolMariaDb pool = PoolMariaDb.lire(new String(Files.readAllBytes(domaineXml()), StandardCharsets.UTF_8));
            hote = pool == null ? null : pool.hote;
        } catch (Exception e) {
            LOG.log(Level.FINE, "Pool de Payara illisible : ce poste est pris pour le serveur", e);
        }
        return PosteSauvegarde.estServeur(posteImpose(), hote, nomPoste(), adressesPoste());
    }

    static String nomPoste() {
        try {
            return InetAddress.getLocalHost().getHostName();
        } catch (Exception e) {
            return "";
        }
    }

    private static List<String> adressesPoste() {
        List<String> l = new ArrayList<>();
        try {
            for (NetworkInterface i : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                for (InetAddress a : Collections.list(i.getInetAddresses())) {
                    String t = a.getHostAddress();
                    l.add(t.contains("%") ? t.substring(0, t.indexOf('%')) : t);
                }
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "Adresses du poste", e);
        }
        return l;
    }

    /** Refus d'une sauvegarde demandee sur un poste qui n'est pas le serveur. */
    private String refusPoste() {
        String impose = posteImpose();
        return "Les sauvegardes se font uniquement sur le serveur ("
                + (impose.isEmpty() ? "le poste qui héberge la base" : "poste " + impose)
                + ") : lancez-la depuis ce poste.";
    }

    private int entier(String cle, int defaut) {
        String v = parametre(cle);
        return StringUtils.isNumeric(v) ? Integer.parseInt(v) : defaut;
    }

    /** Enregistre les reglages de l'ecran ; message d'erreur, ou null si tout est enregistre. */
    public String enregistrer(String dossier, String copie, Boolean active, Integer garderHeures, Integer garderJours) {
        return enregistrer(dossier, copie, active, garderHeures, garderJours, null, null);
    }

    /** Idem, avec les horaires et le poste serveur (null : inchanges). */
    public String enregistrer(String dossier, String copie, Boolean active, Integer garderHeures, Integer garderJours,
            String horaires, String poste) {
        String erreurHoraires = HorairesSauvegarde.erreur(horaires);
        if (erreurHoraires != null) {
            return erreurHoraires;
        }
        if (poste != null && !poste.trim().matches("[A-Za-z0-9._-]{0,100}")) {
            return "Nom du poste serveur illisible : lettres, chiffres, point et tiret seulement (vide : le poste qui héberge la base).";
        }
        dossier = StringUtils.trimToEmpty(dossier);
        copie = StringUtils.trimToEmpty(copie);
        if (dossier.isEmpty() || !Paths.get(dossier).isAbsolute()) {
            return "Indiquez le chemin complet du dossier des sauvegardes (par exemple C:\\prestige\\sauvegardes).";
        }
        if (!copie.isEmpty() && (!Paths.get(copie).isAbsolute()
                || Paths.get(copie).normalize().equals(Paths.get(dossier).normalize()))) {
            return "La copie doit aller dans un autre dossier, indiqué par son chemin complet (idéalement un autre disque).";
        }
        if (garderHeures == null || garderHeures < 1 || garderHeures > 720) {
            return "Gardez toutes les sauvegardes de 1 à 720 heures.";
        }
        if (garderJours == null || garderJours < 0 || garderJours > 365) {
            return "Gardez une sauvegarde par jour de 0 à 365 jours.";
        }
        ecrireParametre(CLE_DOSSIER, dossier, "Sauvegardes : dossier");
        ecrireParametre(CLE_COPIE, copie, "Sauvegardes : copie sur un second dossier (vide : aucune)");
        ecrireParametre(CLE_ACTIVE, Boolean.FALSE.equals(active) ? "0" : "1",
                "Sauvegardes : automatique (1) ou non (0), aux horaires de KEY_SAUVEGARDE_HORAIRES");
        if (horaires != null) {
            ecrireParametre(CLE_HORAIRES, HorairesSauvegarde.lire(horaires).texte(),
                    "Sauvegardes : horaires (ex. 12:00, 20:00 ; vide : toutes les heures a hh:05)");
        }
        if (poste != null) {
            ecrireParametre(CLE_POSTE, poste.trim(),
                    "Sauvegardes : poste qui les fait (vide : le poste qui heberge la base)");
        }
        ecrireParametre(CLE_GARDER_HEURES, String.valueOf(garderHeures),
                "Sauvegardes : toutes gardees pendant (heures)");
        ecrireParametre(CLE_GARDER_JOURS, String.valueOf(garderJours),
                "Sauvegardes : une par jour gardee pendant (jours)");
        return null;
    }

    /* ============================================================================================ lancement */

    /** Lance une sauvegarde en arriere-plan ; message si une sauvegarde tourne deja, null sinon. */
    public String lancer(String origine) {
        if (!posteServeur()) {
            return refusPoste();
        }
        if (verrouPris()) {
            return "Une sauvegarde est déjà en cours" + (enCours.get() ? "." : ", lancée depuis un autre poste.");
        }
        if (!enCours.compareAndSet(false, true)) {
            return "Une sauvegarde est déjà en cours.";
        }
        enCoursDepuis = System.currentTimeMillis();
        try {
            contexte.getBusinessObject(SauvegardeService.class).executerAsync(origine);
        } catch (RuntimeException e) {
            enCours.set(false);
            throw e;
        }
        return null;
    }

    @Asynchronous
    public void executerAsync(String origine) {
        executer(origine);
    }

    /**
     * Passage du planificateur (toutes les 5 minutes) : sauvegarde si elle est active, si l'horaire est atteint et si
     * ce poste est le serveur ; rien si une sauvegarde tourne deja, ici ou sur un autre poste.
     */
    public void automatique(LocalDateTime passage) {
        if (!active() || !horaires().estDue(passage) || !posteServeur()) {
            return;
        }
        if (enCours.compareAndSet(false, true)) {
            enCoursDepuis = System.currentTimeMillis();
            /* en arriere-plan : le planificateur repasse toutes les 5 minutes, une sauvegarde dure 4 a 10 min */
            try {
                contexte.getBusinessObject(SauvegardeService.class).executerAsync("AUTOMATIQUE");
            } catch (RuntimeException e) {
                enCours.set(false);
                throw e;
            }
        }
    }

    /**
     * Verrou de la base en plus de enCours : une seule sauvegarde a la fois pour tous les Payara branches sur la meme
     * base (avant le 12/11, chaque poste lancait la sienne et marquait « interrompues » celles des autres).
     */
    private void executer(String origine) {
        Connection verrou = prendreVerrou();
        if (verrou == null) {
            enCours.set(false);
            LOG.log(Level.INFO, "Sauvegarde {0} non lancée : une autre sauvegarde tient le verrou de la base", origine);
            return;
        }
        try {
            executerSousVerrou(origine);
        } finally {
            rendreVerrou(verrou);
        }
    }

    /** Connexion qui tient le verrou de sauvegarde, ou null s'il est deja pris. */
    private Connection prendreVerrou() {
        Connection c = null;
        try {
            c = dataSource.getConnection();
            try (Statement st = c.createStatement();
                    ResultSet rs = st.executeQuery("SELECT GET_LOCK(" + VERROU + ", 0)")) {
                if (rs.next() && rs.getInt(1) == 1) {
                    return c;
                }
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Verrou de sauvegarde", e);
        }
        if (c != null) {
            try {
                c.close();
            } catch (Exception e) {
                LOG.log(Level.FINE, "Verrou de sauvegarde", e);
            }
        }
        return null;
    }

    private void rendreVerrou(Connection c) {
        try (Connection f = c; Statement st = f.createStatement()) {
            st.execute("DO RELEASE_LOCK(" + VERROU + ")");
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Verrou de sauvegarde", e);
        }
    }

    /** Le verrou de sauvegarde est-il tenu (par ce poste ou un autre) ? */
    private boolean verrouPris() {
        return "0".equals(lireUn("SELECT IS_FREE_LOCK(" + VERROU + ")"));
    }

    /** Le verrou enCours est deja pris par l'appelant ; il est rendu a la fin. */
    private void executerSousVerrou(String origine) {
        long debut = System.currentTimeMillis();
        long id = -1;
        Path options = null, erreurs = null, partiel = null;
        String fichier = null, copieEtat = "SANS", message;
        long taille = 0;
        boolean reussie = false;
        try {
            executerSql(
                    "UPDATE t_sauvegarde SET statut = 'INTERROMPUE', message = 'Arrêtée avec le serveur' WHERE statut = 'EN_COURS'");
            id = nouvelleLigne(origine);
            String xml = new String(Files.readAllBytes(domaineXml()), StandardCharsets.UTF_8);
            PoolMariaDb pool = PoolMariaDb.lire(xml);
            if (pool == null || StringUtils.isBlank(pool.base)) {
                throw new IllegalStateException("Accès à la base introuvable dans la configuration de Payara.");
            }
            if (pool.motDePasseProtege()) {
                throw new IllegalStateException(
                        "Le mot de passe de la base est protégé par un alias de Payara : l'outil de sauvegarde ne peut pas le lire.");
            }
            String outil = outil();
            if (outil == null) {
                throw new IllegalStateException(
                        "Outil de sauvegarde de MariaDB (mariadb-dump) introuvable : indiquez son chemin dans le paramètre "
                                + CLE_OUTIL + ".");
            }
            Path dossier = Paths.get(dossier());
            Files.createDirectories(dossier);
            retirerPartiels(dossier);
            long libre = Files.getFileStore(dossier).getUsableSpace();
            long besoin = Math.max(2 * derniereTaille(), 512L << 20);
            if (libre < besoin) {
                throw new IllegalStateException("Espace insuffisant dans " + dossier + " : " + (libre >> 20)
                        + " Mo libres, " + (besoin >> 20) + " Mo nécessaires.");
            }
            fichier = Conservation.nom(pool.base, LocalDateTime.now());
            Path cible = dossier.resolve(fichier);
            partiel = dossier.resolve(fichier + ".partiel");
            options = fichierPrive("prestige-sauvegarde", ".cnf");
            Files.write(options, pool.options().getBytes(StandardCharsets.UTF_8));
            erreurs = Files.createTempFile("prestige-sauvegarde", ".txt");
            ProcessBuilder pb = new ProcessBuilder(outil, "--defaults-extra-file=" + options.toAbsolutePath(),
                    "--single-transaction", "--quick", "--routines", "--triggers", "--events", "--hex-blob",
                    "--default-character-set=utf8mb4", pool.base);
            pb.redirectError(erreurs.toFile());
            Process p = pb.start();
            byte[] fin = new byte[256];
            int finLongueur = 0;
            try (InputStream in = p.getInputStream(); OutputStream out = new GZIPOutputStream(
                    new BufferedOutputStream(Files.newOutputStream(partiel), 1 << 16), 1 << 16)) {
                byte[] tampon = new byte[1 << 16];
                int n;
                while ((n = in.read(tampon)) > 0) {
                    out.write(tampon, 0, n);
                    if (n >= fin.length) {
                        System.arraycopy(tampon, n - fin.length, fin, 0, fin.length);
                        finLongueur = fin.length;
                    } else {
                        int garde = Math.min(finLongueur, fin.length - n);
                        System.arraycopy(fin, finLongueur - garde, fin, 0, garde);
                        System.arraycopy(tampon, 0, fin, garde, n);
                        finLongueur = garde + n;
                    }
                }
            }
            int code = p.waitFor();
            String queue = new String(fin, 0, finLongueur, StandardCharsets.UTF_8);
            if (code != 0 || !queue.contains(FIN_OUTIL)) {
                String detail = StringUtils
                        .trimToEmpty(new String(Files.readAllBytes(erreurs), StandardCharsets.UTF_8));
                if (!pool.motDePasse.isEmpty()) {
                    detail = detail.replace(pool.motDePasse, "***");
                }
                throw new IllegalStateException("L'outil de sauvegarde s'est arrêté (code " + code + ") : "
                        + StringUtils.abbreviate(StringUtils.defaultIfBlank(detail, "sauvegarde incomplète"), 600));
            }
            Files.move(partiel, cible, StandardCopyOption.ATOMIC_MOVE);
            partiel = null;
            taille = Files.size(cible);
            copieEtat = copier(cible, pool.base);
            int heures = entier(CLE_GARDER_HEURES, 48), jours = entier(CLE_GARDER_JOURS, 30);
            conserver(dossier, pool.base, heures, jours);
            String copie = parametre(CLE_COPIE);
            if (StringUtils.isNotBlank(copie) && Files.isDirectory(Paths.get(copie))) {
                conserver(Paths.get(copie), pool.base, heures, jours);
            }
            reussie = true;
            message = "ECHEC".equals(copieEtat) ? "Sauvegarde faite, mais la copie sur le second dossier a échoué."
                    : "";
        } catch (Exception e) {
            message = e instanceof IllegalStateException ? e.getMessage() : "Sauvegarde en échec : "
                    + e.getClass().getSimpleName() + " " + StringUtils.defaultString(e.getMessage());
            LOG.log(Level.WARNING, "Sauvegarde de la base : {0}", message);
        } finally {
            supprimer(options);
            supprimer(erreurs);
            supprimer(partiel);
            enCours.set(false);
        }
        int duree = (int) ((System.currentTimeMillis() - debut) / 1000);
        terminer(id, reussie ? "REUSSIE" : "ECHEC", reussie ? fichier : null, taille, duree, copieEtat, message);
        if (!reussie || "ECHEC".equals(copieEtat)) {
            supportEventService.recordServerIncident(reussie ? "SAUVEGARDE_COPIE" : "SAUVEGARDE_ECHEC", "ERROR", reussie
                    ? "Sauvegarde de la base : copie sur le second dossier en échec" : "Sauvegarde de la base en échec",
                    message);
        }
    }

    /**
     * Alerte, sur le serveur seulement, si la sauvegarde automatique est active et que la sauvegarde prevue
     * {@link HorairesSauvegarde#attendue(LocalDateTime) une heure au moins avant} n'a pas reussi.
     */
    public void verifierFraicheur(long demarrageServeur, LocalDateTime maintenant) {
        if (!active() || enCours.get() || !posteServeur()) {
            return;
        }
        LocalDateTime attendue = horaires().attendue(maintenant);
        long limite = Timestamp.valueOf(attendue).getTime();
        if (demarrageServeur > limite) {
            return;
        }
        Timestamp derniere = derniereReussie();
        if (derniere == null || derniere.getTime() < limite) {
            supportEventService.recordServerIncident("SAUVEGARDE_ANCIENNE", "ERROR",
                    "Aucune sauvegarde réussie de la base depuis celle prévue le "
                            + attendue.toString().replace('T', ' ').substring(0, 16),
                    "Dernière sauvegarde réussie : "
                            + (derniere == null ? "aucune" : derniere.toString().substring(0, 16))
                            + ". Voir Centre de support > Stabilité du serveur > Sauvegardes.");
        }
    }

    /* ============================================================================================ etat */

    public JSONObject etat() {
        String outil = outil();
        String dossier = dossier();
        JSONObject o = new JSONObject().put("outil", outil == null ? JSONObject.NULL : outil).put("dossier", dossier)
                .put("copie", StringUtils.defaultString(parametre(CLE_COPIE))).put("active", active())
                .put("horaires", horaires().texte()).put("horairesLibelle", horaires().libelle())
                .put("prochaine",
                        horaires().suivante(LocalDateTime.now()).toString().replace('T', ' ').substring(0, 16))
                .put("poste", posteImpose()).put("posteCourant", nomPoste()).put("posteServeur", posteServeur())
                .put("verrouPris", verrouPris()).put("garderHeures", entier(CLE_GARDER_HEURES, 48))
                .put("garderJours", entier(CLE_GARDER_JOURS, 30)).put("enCours", enCours.get())
                .put("enCoursDepuis", enCours.get() ? new Timestamp(enCoursDepuis).toString().substring(0, 19) : "");
        try {
            Path d = Paths.get(dossier);
            while (d != null && !Files.exists(d)) {
                d = d.getParent();
            }
            o.put("espaceLibreMo", d == null ? JSONObject.NULL : Files.getFileStore(d).getUsableSpace() >> 20);
        } catch (Exception e) {
            o.put("espaceLibreMo", JSONObject.NULL);
        }
        Timestamp derniere = derniereReussie();
        o.put("derniereReussie", derniere == null ? "" : derniere.toString().substring(0, 16));
        JSONArray l = new JSONArray();
        String base = "";
        try (Connection c = dataSource.getConnection(); Statement st = c.createStatement();
                ResultSet rs = st.executeQuery(
                        "SELECT id, debut, fin, origine, statut, fichier, taille_octets, duree_s, copie, message,"
                                + " DATABASE() FROM t_sauvegarde ORDER BY id DESC LIMIT 50")) {
            while (rs.next()) {
                base = rs.getString(11);
                l.put(new JSONObject().put("id", rs.getLong(1)).put("debut", texte(rs.getTimestamp(2)))
                        .put("fin", texte(rs.getTimestamp(3))).put("origine", rs.getString(4))
                        .put("statut", rs.getString(5)).put("fichier", StringUtils.defaultString(rs.getString(6)))
                        .put("tailleMo", Math.round(rs.getLong(7) / 104857.6) / 10.0).put("dureeS", rs.getInt(8))
                        .put("copie", StringUtils.defaultString(rs.getString(9)))
                        .put("message", StringUtils.defaultString(rs.getString(10))));
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Historique des sauvegardes", e);
        }
        if (base.isEmpty()) {
            base = StringUtils.defaultString(lireUn("SELECT DATABASE()"));
        }
        return o.put("liste", l).put("base", base);
    }

    /* ============================================================================================ outils */

    private String copier(Path source, String base) {
        String copie = parametre(CLE_COPIE);
        if (StringUtils.isBlank(copie)) {
            return "SANS";
        }
        Path partielCopie = null;
        try {
            Path d = Paths.get(copie);
            Files.createDirectories(d);
            Path cible = d.resolve(source.getFileName().toString());
            partielCopie = d.resolve(source.getFileName() + ".partiel");
            Files.copy(source, partielCopie, StandardCopyOption.REPLACE_EXISTING);
            Files.move(partielCopie, cible, StandardCopyOption.ATOMIC_MOVE);
            partielCopie = null;
            return Files.size(cible) == Files.size(source) ? "OK" : "ECHEC";
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Copie de la sauvegarde : {0}", e.toString());
            return "ECHEC";
        } finally {
            supprimer(partielCopie);
        }
    }

    private static void conserver(Path dossier, String base, int heures, int jours) {
        List<String> noms = new ArrayList<>();
        try (DirectoryStream<Path> ds = Files.newDirectoryStream(dossier, "prestige_*.sql.gz")) {
            for (Path f : ds) {
                noms.add(f.getFileName().toString());
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Conservation des sauvegardes : {0}", e.toString());
            return;
        }
        for (String f : Conservation.aRetirer(base, noms, LocalDateTime.now(), heures, jours)) {
            supprimer(dossier.resolve(f));
        }
    }

    /** Fichiers provisoires d'une sauvegarde interrompue (arret du serveur pendant l'ecriture). */
    private static void retirerPartiels(Path dossier) {
        try (DirectoryStream<Path> ds = Files.newDirectoryStream(dossier, "prestige_*.sql.gz.partiel")) {
            for (Path f : ds) {
                supprimer(f);
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, "fichiers provisoires", e);
        }
    }

    /** mariadb-dump (ou mysqldump) : parametre, dossier de MariaDB, puis PATH. */
    public String outil() {
        List<Path> candidats = new ArrayList<>();
        String parametre = parametre(CLE_OUTIL);
        if (StringUtils.isNotBlank(parametre)) {
            candidats.add(Paths.get(parametre));
        }
        String exe = File.separatorChar == '\\' ? ".exe" : "";
        List<String> dossiers = new ArrayList<>();
        String basedir = lireUn("SELECT @@basedir");
        if (StringUtils.isNotBlank(basedir)) {
            dossiers.add(Paths.get(basedir, "bin").toString());
        }
        for (String d : StringUtils.defaultString(System.getenv("PATH")).split(File.pathSeparator)) {
            if (StringUtils.isNotBlank(d)) {
                dossiers.add(d);
            }
        }
        for (String d : dossiers) {
            candidats.add(Paths.get(d, "mariadb-dump" + exe));
            candidats.add(Paths.get(d, "mysqldump" + exe));
        }
        for (Path c : candidats) {
            try {
                if (Files.isRegularFile(c)) {
                    return c.toAbsolutePath().toString();
                }
            } catch (Exception e) {
                LOG.log(Level.FINE, "outil de sauvegarde", e);
            }
        }
        return null;
    }

    static Path domaineXml() {
        String racine = System.getProperty("com.sun.aas.instanceRoot");
        if (racine == null) {
            throw new IllegalStateException("Dossier du domaine Payara inconnu.");
        }
        return Paths.get(racine, "config", "domain.xml");
    }

    /** Fichier temporaire lisible par le seul compte du serveur (il recoit le mot de passe de la base). */
    static Path fichierPrive(String prefixe, String suffixe) throws java.io.IOException {
        Path f;
        try {
            f = Files.createTempFile(prefixe, suffixe,
                    PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------")));
        } catch (UnsupportedOperationException e) {
            f = Files.createTempFile(prefixe, suffixe);
            File x = f.toFile();
            x.setReadable(false, false);
            x.setReadable(true, true);
            x.setWritable(false, false);
            x.setWritable(true, true);
        }
        return f;
    }

    static void supprimer(Path f) {
        if (f != null) {
            try {
                Files.deleteIfExists(f);
            } catch (Exception e) {
                LOG.log(Level.WARNING, "Suppression de {0} : {1}", new Object[] { f.getFileName(), e.toString() });
            }
        }
    }

    private static String texte(Timestamp t) {
        return t == null ? "" : t.toString().substring(0, 19);
    }

    private long nouvelleLigne(String origine) throws Exception {
        String hote;
        try {
            hote = InetAddress.getLocalHost().getHostName();
        } catch (Exception e) {
            hote = "";
        }
        try (Connection c = dataSource.getConnection();
                PreparedStatement ps = c.prepareStatement(
                        "INSERT INTO t_sauvegarde (debut, origine, statut, hote) VALUES (NOW(), ?, 'EN_COURS', ?)",
                        Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, origine);
            ps.setString(2, StringUtils.abbreviate(hote, 100));
            ps.executeUpdate();
            try (ResultSet rs = ps.getGeneratedKeys()) {
                return rs.next() ? rs.getLong(1) : -1;
            }
        }
    }

    private void terminer(long id, String statut, String fichier, long taille, int duree, String copie,
            String message) {
        if (id < 0) {
            return;
        }
        try (Connection c = dataSource.getConnection();
                PreparedStatement ps = c.prepareStatement(
                        "UPDATE t_sauvegarde SET fin = NOW(), statut = ?, fichier = ?, taille_octets = ?,"
                                + " duree_s = ?, copie = ?, message = ? WHERE id = ?")) {
            ps.setString(1, statut);
            ps.setString(2, fichier);
            ps.setLong(3, taille);
            ps.setInt(4, duree);
            ps.setString(5, copie);
            ps.setString(6, StringUtils.abbreviate(message, 1000));
            ps.setLong(7, id);
            ps.executeUpdate();
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Historique de la sauvegarde", e);
        }
    }

    private Timestamp derniereReussie() {
        try (Connection c = dataSource.getConnection(); Statement st = c.createStatement();
                ResultSet rs = st.executeQuery("SELECT MAX(debut) FROM t_sauvegarde WHERE statut = 'REUSSIE'")) {
            return rs.next() ? rs.getTimestamp(1) : null;
        } catch (Exception e) {
            return null;
        }
    }

    private long derniereTaille() {
        String v = lireUn("SELECT taille_octets FROM t_sauvegarde WHERE statut = 'REUSSIE' ORDER BY id DESC LIMIT 1");
        return StringUtils.isNumeric(v) ? Long.parseLong(v) : 0L;
    }

    private void executerSql(String sql) throws Exception {
        try (Connection c = dataSource.getConnection(); Statement st = c.createStatement()) {
            st.executeUpdate(sql);
        }
    }

    private String lireUn(String sql) {
        try (Connection c = dataSource.getConnection(); Statement st = c.createStatement();
                ResultSet rs = st.executeQuery(sql)) {
            return rs.next() ? rs.getString(1) : null;
        } catch (Exception e) {
            LOG.log(Level.FINE, sql, e);
            return null;
        }
    }

    private String parametre(String cle) {
        try (Connection c = dataSource.getConnection();
                PreparedStatement ps = c.prepareStatement("SELECT str_VALUE FROM t_parameters WHERE str_KEY = ?")) {
            ps.setString(1, cle);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next() ? rs.getString(1) : null;
            }
        } catch (Exception e) {
            LOG.log(Level.FINE, cle, e);
            return null;
        }
    }

    private void ecrireParametre(String cle, String valeur, String description) {
        try (Connection c = dataSource.getConnection(); PreparedStatement ps = c
                .prepareStatement("INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT)"
                        + " VALUES (?, ?, ?, 'SYSTEME', 'enable') ON DUPLICATE KEY UPDATE str_VALUE = VALUES(str_VALUE)")) {
            ps.setString(1, cle);
            ps.setString(2, valeur);
            ps.setString(3, description);
            ps.executeUpdate();
        } catch (Exception e) {
            throw new IllegalStateException("Enregistrement du réglage " + cle, e);
        }
    }
}
