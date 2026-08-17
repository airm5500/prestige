package job;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.PostConstruct;
import javax.annotation.security.PermitAll;
import javax.ejb.DependsOn;
import javax.ejb.EJB;
import javax.ejb.Singleton;
import javax.ejb.Startup;
import org.apache.commons.lang3.StringUtils;
import rest.service.SupportEventService;

/**
 * Auto-diagnostic de la supervision, au demarrage du serveur.
 *
 * Les pannes de configuration du Centre de Support sont differees par nature : un dossier de stockage non inscriptible
 * ne se manifeste qu'a la premiere ecriture, un seuil mal saisi qu'au premier depassement, une adresse de notification
 * absente qu'au premier incident critique - c'est-a-dire au pire moment. Ce controle les fait apparaitre tout de suite,
 * sous la forme d'un evenement lisible dans le Centre de Support.
 *
 * Il est volontairement NON bloquant : un demarrage ne doit jamais echouer a cause de la supervision elle-meme. Il
 * n'ecrit un evenement QUE s'il constate une anomalie (sinon chaque redemarrage polluerait le journal), et reste
 * rejouable a la demande depuis le Centre de Support.
 *
 * @author koben
 */
@Singleton
@Startup
@PermitAll
@DependsOn({ "FlywayStartupBean", "AppConfig" })
public class SupportPreflight {

    private static final Logger LOG = Logger.getLogger(SupportPreflight.class.getName());
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @EJB
    private SupportEventService supportEventService;

    /** Resultat d'un point de controle. Donnee inerte destinee a l'affichage et au detail de l'evenement. */
    public static final class Controle {

        public final String code;
        public final String libelle;
        public final boolean ok;
        public final String detail;

        public Controle(String code, String libelle, boolean ok, String detail) {
            this.code = code;
            this.libelle = libelle;
            this.ok = ok;
            this.detail = detail;
        }

        public static Controle ok(String code, String libelle, String detail) {
            return new Controle(code, libelle, true, detail);
        }

        public static Controle anomalie(String code, String libelle, String detail) {
            return new Controle(code, libelle, false, detail);
        }
    }

    @PostConstruct
    public void auDemarrage() {
        try {
            executer(true);
        } catch (Exception e) {
            // Un demarrage ne doit jamais echouer a cause de l'auto-diagnostic.
            LOG.log(Level.SEVERE, "preflight demarrage", e);
        }
    }

    /**
     * Execute tous les points de controle. Quand {@code tracer} est vrai et qu'au moins une anomalie est constatee, un
     * evenement est ecrit dans le journal du Centre de Support.
     */
    public Map<String, Object> executer(boolean tracer) {
        List<Controle> controles = new ArrayList<>();
        controles.add(verifierStockage());
        controles.add(verifierEspaceDisque());
        controles.add(verifierEntier("SEUIL_LENTEUR", "Seuil de detection des ecrans lents (SUPPORT_SLOW_MS)",
                parametre("SUPPORT_SLOW_MS"), 100L, 600_000L));
        controles.add(verifierEntier("SEUIL_MEMOIRE", "Seuil d'alerte memoire (SUPPORT_MEM_THRESHOLD_PCT)",
                parametre("SUPPORT_MEM_THRESHOLD_PCT"), 1L, 100L));
        controles.add(verifierEntier("SEUIL_DISQUE", "Seuil d'alerte disque (SUPPORT_DISK_MIN_MB)",
                parametre("SUPPORT_DISK_MIN_MB"), 1L, 10_000_000L));
        controles.add(verifierEntier("SEUIL_TICKET", "Seuil de ticket automatique (SUPPORT_AUTO_TICKET_SEUIL)",
                parametre("SUPPORT_AUTO_TICKET_SEUIL"), 1L, 100_000L));
        controles.add(verifierNotification(parametre("SUPPORT_NOTIFY_ENABLED"), parametre("SUPPORT_EMAIL")));
        controles.add(verifierJournalServeur(parametre("SUPPORT_SERVER_LOG_PATH")));

        boolean anomalie = aAnomalie(controles);
        String synthese = synthese(controles);
        if (anomalie) {
            LOG.log(Level.WARNING, "Auto-diagnostic du support : {0}", synthese);
            if (tracer) {
                tracerAnomalies(controles, synthese);
            }
        } else {
            LOG.log(Level.INFO, "Auto-diagnostic du support : {0}", synthese);
        }
        return resultat(controles, synthese, anomalie);
    }

    private void tracerAnomalies(List<Controle> controles, String synthese) {
        try {
            // Signature construite sur les codes en anomalie : deux demarrages presentant le MEME defaut alimentent le
            // meme evenement, un defaut different en cree un nouveau.
            StringBuilder codes = new StringBuilder();
            for (Controle controle : controles) {
                if (!controle.ok) {
                    codes.append(codes.length() == 0 ? "" : "-").append(controle.code);
                }
            }
            supportEventService.recordServerIncident("preflight-" + codes, "WARN",
                    "Configuration de la supervision : " + synthese, detail(controles));
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "preflight tracerAnomalies", e);
        }
    }

    private Map<String, Object> resultat(List<Controle> controles, String synthese, boolean anomalie) {
        List<Map<String, Object>> lignes = new ArrayList<>();
        for (Controle controle : controles) {
            Map<String, Object> ligne = new LinkedHashMap<>();
            ligne.put("code", controle.code);
            ligne.put("libelle", controle.libelle);
            ligne.put("ok", controle.ok);
            ligne.put("detail", controle.detail);
            lignes.add(ligne);
        }
        Map<String, Object> resultat = new LinkedHashMap<>();
        resultat.put("execute", LocalDateTime.now().format(FMT));
        resultat.put("synthese", synthese);
        resultat.put("anomalie", anomalie);
        resultat.put("controles", lignes);
        return resultat;
    }

    // ------------------------------------------------------------------
    // Points de controle avec acces disque / parametres
    // ------------------------------------------------------------------

    /**
     * Le seul controle qui compte vraiment : on ECRIT reellement un fichier. L'existence du dossier ne prouve rien -
     * c'est exactement le cas qui produisait des AccessDeniedException lorsque Payara tourne en service Windows sous un
     * compte sans droit sur le profil utilisateur.
     */
    private Controle verifierStockage() {
        String libelle = "Dossier de stockage du support inscriptible";
        Path base = null;
        try {
            base = resolveStorageBase();
            Files.createDirectories(base);
            Path temoin = base.resolve(".preflight-" + System.currentTimeMillis());
            Files.write(temoin, "ok".getBytes(StandardCharsets.UTF_8));
            Files.deleteIfExists(temoin);
            return Controle.ok("STOCKAGE", libelle, base.toString());
        } catch (Exception e) {
            return Controle.anomalie("STOCKAGE", libelle, "Ecriture impossible dans "
                    + (base == null ? "(dossier non resolu)" : base.toString()) + " : " + messageDe(e));
        }
    }

    private Controle verifierEspaceDisque() {
        String libelle = "Espace disque disponible pour le support";
        try {
            Path base = resolveStorageBase();
            if (!Files.exists(base)) {
                return Controle.anomalie("ESPACE", libelle, "Dossier absent : " + base);
            }
            long libreMo = Files.getFileStore(base).getUsableSpace() / (1024L * 1024L);
            long minMo = entierOuDefaut(parametre("SUPPORT_DISK_MIN_MB"), 500L);
            if (libreMo < minMo) {
                return Controle.anomalie("ESPACE", libelle,
                        libreMo + " Mo libres, sous le seuil de " + minMo + " Mo (" + base + ")");
            }
            return Controle.ok("ESPACE", libelle, libreMo + " Mo libres (" + base + ")");
        } catch (Exception e) {
            return Controle.anomalie("ESPACE", libelle, "Mesure impossible : " + messageDe(e));
        }
    }

    private Controle verifierJournalServeur(String chemin) {
        String libelle = "Chemin du server.log (diagnostic de crash)";
        if (StringUtils.isBlank(chemin)) {
            return Controle.anomalie("SERVER_LOG", libelle,
                    "SUPPORT_SERVER_LOG_PATH non renseigne : en cas de crash, le watchdog ne pourra pas en donner la cause");
        }
        try {
            Path fichier = Paths.get(chemin.trim()).resolve("server.log");
            if (!Files.isRegularFile(fichier)) {
                return Controle.anomalie("SERVER_LOG", libelle, "server.log introuvable dans " + chemin.trim());
            }
            return Controle.ok("SERVER_LOG", libelle, fichier.toString());
        } catch (Exception e) {
            return Controle.anomalie("SERVER_LOG", libelle, "Chemin invalide : " + messageDe(e));
        }
    }

    private Path resolveStorageBase() {
        String configure = StringUtils.trimToEmpty(parametre("SUPPORT_STORAGE_DIR"));
        return StringUtils.isNotBlank(configure) ? Paths.get(configure) : util.StockageDisque.sousDossier("support");
    }

    private String parametre(String cle) {
        try {
            return supportEventService.getParameter(cle);
        } catch (Exception e) {
            LOG.log(Level.FINE, "preflight parametre " + cle, e);
            return null;
        }
    }

    private static String messageDe(Exception e) {
        return StringUtils.defaultIfBlank(e.getMessage(), e.getClass().getSimpleName());
    }

    /**
     * Valeur numerique d'un parametre, ou {@code defaut} si elle est absente ou illisible. Le controle du format est
     * assure separement par {@link #verifierEntier} : ici on veut juste une valeur exploitable pour comparer.
     */
    static long entierOuDefaut(String valeur, long defaut) {
        try {
            return Long.parseLong(StringUtils.trimToEmpty(valeur));
        } catch (NumberFormatException e) {
            return defaut;
        }
    }

    // ------------------------------------------------------------------
    // Regles pures (sans base ni disque) : testables directement
    // ------------------------------------------------------------------

    /**
     * Un parametre numerique absent n'est PAS une anomalie : le code applique alors sa valeur par defaut. En revanche
     * une valeur non numerique ou hors bornes en est une, car elle est silencieusement ignoree a l'execution et donne
     * l'illusion d'un reglage actif.
     */
    static Controle verifierEntier(String code, String libelle, String valeur, long min, long max) {
        String texte = StringUtils.trimToEmpty(valeur);
        if (texte.isEmpty()) {
            return Controle.ok(code, libelle, "non renseigne : valeur par defaut appliquee");
        }
        long nombre;
        try {
            nombre = Long.parseLong(texte);
        } catch (NumberFormatException e) {
            return Controle.anomalie(code, libelle, "valeur non numerique : \"" + texte + "\"");
        }
        if (nombre < min || nombre > max) {
            return Controle.anomalie(code, libelle,
                    "valeur " + nombre + " hors des bornes attendues [" + min + " - " + max + "]");
        }
        return Controle.ok(code, libelle, String.valueOf(nombre));
    }

    /**
     * La notification n'a de sens que si elle a un destinataire : activee sans adresse, elle echoue en silence au
     * moment precis ou un incident critique survient.
     */
    static Controle verifierNotification(String notifyEnabled, String email) {
        String libelle = "Destinataire des notifications d'incident";
        boolean activee = !"0".equals(StringUtils.trimToEmpty(notifyEnabled));
        if (!activee) {
            return Controle.ok("NOTIFICATION", libelle, "notification desactivee (SUPPORT_NOTIFY_ENABLED=0)");
        }
        String adresse = StringUtils.trimToEmpty(email);
        if (adresse.isEmpty()) {
            return Controle.anomalie("NOTIFICATION", libelle,
                    "notification activee mais SUPPORT_EMAIL est vide : aucun incident critique ne sera signale");
        }
        if (!adresse.contains("@") || adresse.startsWith("@") || adresse.endsWith("@")) {
            return Controle.anomalie("NOTIFICATION", libelle, "adresse invalide : \"" + adresse + "\"");
        }
        return Controle.ok("NOTIFICATION", libelle, adresse);
    }

    static boolean aAnomalie(List<Controle> controles) {
        for (Controle controle : controles) {
            if (!controle.ok) {
                return true;
            }
        }
        return false;
    }

    static String synthese(List<Controle> controles) {
        int anomalies = 0;
        for (Controle controle : controles) {
            if (!controle.ok) {
                anomalies++;
            }
        }
        if (anomalies == 0) {
            return controles.size() + " point(s) de controle, aucune anomalie";
        }
        return anomalies + " anomalie(s) sur " + controles.size() + " point(s) de controle";
    }

    static String detail(List<Controle> controles) {
        StringBuilder sb = new StringBuilder();
        sb.append("Auto-diagnostic de la configuration du Centre de Support.\n");
        sb.append("Les lignes marquees [ANOMALIE] demandent une correction dans les parametres ou sur le serveur.\n\n");
        for (Controle controle : controles) {
            sb.append(controle.ok ? "[OK]       " : "[ANOMALIE] ").append(controle.libelle).append("\n");
            if (StringUtils.isNotBlank(controle.detail)) {
                sb.append("           ").append(controle.detail).append("\n");
            }
        }
        return sb.toString();
    }
}
