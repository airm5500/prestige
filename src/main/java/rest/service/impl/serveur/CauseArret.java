package rest.service.impl.serveur;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * STABILITE DU SERVEUR (besoins du 11/10, lot 4) : cause probable d'un arret brutal du serveur, d'apres les indices
 * releves au redemarrage. Regles pures (testees a part).
 * <p>
 * Indices :
 * <ul>
 * <li>journal « Systeme » de Windows (lu en XML, independant de la langue) : 41 Kernel-Power (redemarrage sans arret
 * propre : coupure de courant, bouton maintenu), 6008 (arret inattendu precedent), 1074 (redemarrage demande, mises a
 * jour), 6005 / 12 Kernel-General (demarrage de Windows), 7031 / 7034 (service arrete de facon inattendue) ;</li>
 * <li>extrait du server.log de la session tombee (OutOfMemoryError, disque plein, pool sature) ;</li>
 * <li>rapport de plantage de la JVM (hs_err_pid*.log), vidage memoire (*.hprof) ;</li>
 * <li>dernier etat connu (memoire, disque) et redemarrage de MariaDB.</li>
 * </ul>
 */
public final class CauseArret {

    public enum Code {
        PLANTAGE_JVM("Plantage de Java (rapport hs_err)", "FATAL"), MEMOIRE("Mémoire du serveur Java épuisée", "FATAL"),
        DISQUE_PLEIN("Disque plein", "FATAL"),
        COUPURE_COURANT("Coupure de courant ou arrêt brutal de la machine", "WARN"),
        REDEMARRAGE_WINDOWS("Redémarrage de Windows (mises à jour ou demande)", "WARN"),
        REDEMARRAGE_MACHINE("Redémarrage de la machine", "WARN"),
        ARRET_SERVICE("Service du serveur arrêté de façon inattendue", "FATAL"),
        MEMOIRE_PROBABLE("Mémoire presque saturée avant l'arrêt", "ERROR"),
        BASE_SATUREE("Connexions à la base saturées", "ERROR"), MARIADB_ARRETEE("MariaDB s'est aussi arrêtée", "ERROR"),
        ARRET_FORCE("Arrêt forcé, sans erreur visible", "WARN");

        public final String libelle, niveau;

        Code(String libelle, String niveau) {
            this.libelle = libelle;
            this.niveau = niveau;
        }
    }

    /** Evenement du journal Windows. */
    public static final class EvenementWindows {
        public final int id;
        public final String source, donnees;
        public final LocalDateTime quand;

        public EvenementWindows(int id, String source, LocalDateTime quand, String donnees) {
            this.id = id;
            this.source = source == null ? "" : source;
            this.quand = quand;
            this.donnees = donnees == null ? "" : donnees;
        }
    }

    /** Indices releves au redemarrage. */
    public static final class Indices {
        public LocalDateTime dernierSigne, redemarrage;
        public List<EvenementWindows> windows = new ArrayList<>();
        public String extraitLog = "";
        public boolean rapportJvm, vidageMemoire, mariadbRedemarree;
        public long memoirePct = -1, disqueLibreMo = -1;
    }

    /** Cause retenue, avec l'explication et le conseil. */
    public static final class Diagnostic {
        public Code code;
        public String explication, conseil;
        public LocalDateTime demarrageWindows;
    }

    private CauseArret() {
    }

    static final Pattern EVENT = Pattern.compile("<Event[ >].*?</Event>", Pattern.DOTALL);
    static final Pattern ID = Pattern.compile("<EventID[^>]*>(\\d+)</EventID>");
    static final Pattern PROVIDER = Pattern.compile("<Provider Name=['\"]([^'\"]+)['\"]");
    static final Pattern TEMPS = Pattern.compile("<TimeCreated SystemTime=['\"]([^'\"]+)['\"]");
    static final Pattern DATA = Pattern.compile("<Data(?: Name=['\"][^'\"]*['\"])?>([^<]*)</Data>");

    /** Evenements d'une sortie « wevtutil qe System /f:xml » (heure locale de la machine). */
    public static List<EvenementWindows> lireWevtutil(String xml, ZoneId zone) {
        List<EvenementWindows> l = new ArrayList<>();
        if (xml == null) {
            return l;
        }
        Matcher e = EVENT.matcher(xml);
        while (e.find()) {
            String ev = e.group();
            Matcher id = ID.matcher(ev), p = PROVIDER.matcher(ev), t = TEMPS.matcher(ev), d = DATA.matcher(ev);
            if (!id.find() || !t.find()) {
                continue;
            }
            LocalDateTime quand;
            try {
                quand = LocalDateTime.ofInstant(Instant.parse(t.group(1).replaceAll("\\.(\\d{3})\\d*Z$", ".$1Z")),
                        zone);
            } catch (DateTimeParseException x) {
                continue;
            }
            StringBuilder donnees = new StringBuilder();
            while (d.find()) {
                donnees.append(d.group(1)).append(' ');
            }
            l.add(new EvenementWindows(Integer.parseInt(id.group(1)), p.find() ? p.group(1) : "", quand,
                    donnees.toString().trim()));
        }
        return l;
    }

    static final Pattern HORODATAGE_LOG = Pattern.compile("^\\[(\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2})");

    /**
     * Partie d'un journal Payara comprise entre deux instants (lignes « [AAAA-MM-JJTHH:MM:SS... » ; les lignes de suite
     * d'un message suivent son horodatage). Sert a ne lire que la fin de la session tombee, pas le redemarrage.
     */
    public static String extrait(String journal, LocalDateTime debut, LocalDateTime fin) {
        if (journal == null) {
            return "";
        }
        StringBuilder sb = new StringBuilder();
        boolean dedans = false;
        for (String ligne : journal.split("\\r?\\n")) {
            Matcher m = HORODATAGE_LOG.matcher(ligne);
            if (m.find()) {
                LocalDateTime t = LocalDateTime.parse(m.group(1));
                dedans = (debut == null || !t.isBefore(debut)) && (fin == null || t.isBefore(fin));
            }
            if (dedans) {
                sb.append(ligne).append('\n');
            }
        }
        return sb.toString();
    }

    private static boolean dans(LocalDateTime t, LocalDateTime debut, LocalDateTime fin) {
        return t != null && (debut == null || !t.isBefore(debut)) && (fin == null || !t.isAfter(fin));
    }

    private static boolean serviceDuServeur(String donnees) {
        String d = donnees.toLowerCase(Locale.ROOT);
        return d.contains("payara") || d.contains("glassfish") || d.contains("domain1") || d.contains("prestige");
    }

    private static boolean serviceMariadb(String donnees) {
        String d = donnees.toLowerCase(Locale.ROOT);
        return d.contains("mariadb") || d.contains("mysql");
    }

    /** Cause probable d'un arret brutal. */
    public static Diagnostic diagnostiquer(Indices x) {
        Diagnostic r = new Diagnostic();
        String log = x.extraitLog == null ? "" : x.extraitLog;
        LocalDateTime avant = x.dernierSigne == null ? null : x.dernierSigne.minusMinutes(5);
        boolean kernelPower = false, arretInattendu = false, redemarrageDemande = false, serviceServeur = false,
                serviceBase = false;
        for (EvenementWindows e : x.windows) {
            if (!dans(e.quand, avant, x.redemarrage)) {
                continue;
            }
            if (e.id == 6005 || (e.id == 12 && e.source.contains("Kernel-General"))) {
                if (r.demarrageWindows == null || e.quand.isAfter(r.demarrageWindows)) {
                    r.demarrageWindows = e.quand;
                }
            }
            kernelPower |= e.id == 41;
            arretInattendu |= e.id == 6008;
            redemarrageDemande |= e.id == 1074;
            serviceServeur |= (e.id == 7031 || e.id == 7034) && serviceDuServeur(e.donnees);
            serviceBase |= (e.id == 7031 || e.id == 7034) && serviceMariadb(e.donnees);
        }
        boolean machineRedemarree = r.demarrageWindows != null && x.dernierSigne != null
                && r.demarrageWindows.isAfter(x.dernierSigne.minusMinutes(3));
        if (x.rapportJvm) {
            fixer(r, Code.PLANTAGE_JVM, "Java s'est arrêté sur une erreur interne (rapport hs_err_pid joint).",
                    "Transmettre le rapport au support ; vérifier la mémoire de la machine et la version de Java.");
        } else if (log.contains("OutOfMemoryError") || log.contains("GC overhead limit") || x.vidageMemoire) {
            fixer(r, Code.MEMOIRE, "Le serveur Java a manqué de mémoire (OutOfMemoryError).",
                    "Augmenter la mémoire du serveur Java (réglages conseillés) ; le vidage mémoire (.hprof) montre ce qui l'occupait.");
        } else if (log.contains("No space left on device") || log.contains("Espace insuffisant")
                || (x.disqueLibreMo >= 0 && x.disqueLibreMo < 300)) {
            fixer(r, Code.DISQUE_PLEIN, "Le disque était plein (ou presque) : le serveur ne pouvait plus écrire.",
                    "Libérer de l'espace (sauvegardes anciennes, journaux) ; surveiller l'espace libre.");
        } else if (machineRedemarree && (kernelPower || arretInattendu)) {
            fixer(r, Code.COUPURE_COURANT,
                    "Windows a redémarré sans arrêt propre (événement " + (kernelPower ? "41 Kernel-Power" : "6008")
                            + ").",
                    "Coupure de courant ou bouton maintenu : un onduleur protège la base et les ventes en cours.");
        } else if (machineRedemarree && redemarrageDemande) {
            fixer(r, Code.REDEMARRAGE_WINDOWS,
                    "Windows a redémarré à la demande d'un utilisateur ou des mises à jour (événement 1074).",
                    "Programmer les mises à jour de Windows en dehors des heures d'ouverture.");
        } else if (machineRedemarree) {
            fixer(r, Code.REDEMARRAGE_MACHINE, "La machine a redémarré pendant que le serveur tournait.",
                    "Arrêter le serveur avant d'éteindre la machine ; vérifier l'alimentation.");
        } else if (serviceServeur) {
            fixer(r, Code.ARRET_SERVICE,
                    "Windows signale l'arrêt inattendu du service du serveur (événement 7031/7034).",
                    "Configurer la reprise automatique du service ; lire l'extrait du journal joint.");
        } else if (x.memoirePct >= 90) {
            fixer(r, Code.MEMOIRE_PROBABLE,
                    "La mémoire du serveur Java était à " + x.memoirePct + " % au dernier relevé.",
                    "Augmenter la mémoire du serveur Java (réglages conseillés).");
        } else if (log.contains("Connection is not available") || log.contains("Unable to acquire JDBC Connection")
                || log.contains("Too many connections")) {
            fixer(r, Code.BASE_SATUREE, "Plus aucune connexion à la base n'était disponible.",
                    "Agrandir le pool de connexions et max_connections (réglages conseillés).");
        } else if (x.mariadbRedemarree || serviceBase) {
            fixer(r, Code.MARIADB_ARRETEE, "MariaDB a redémarré pendant la même période.",
                    "Lire le journal d'erreurs de MariaDB (fichier .err du dossier data).");
        } else {
            fixer(r, Code.ARRET_FORCE, "Le serveur s'est arrêté sans erreur visible et la machine n'a pas redémarré.",
                    "Fermeture de la fenêtre du serveur, gestionnaire des tâches ou arrêt du service trop long : arrêter le serveur par sa commande.");
        }
        return r;
    }

    private static void fixer(Diagnostic r, Code c, String explication, String conseil) {
        r.code = c;
        r.explication = explication;
        r.conseil = conseil;
    }
}
