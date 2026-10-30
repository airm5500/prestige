package rest.service.impl.serveur;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import rest.service.impl.serveur.ReglagesServeur.Niveau;
import rest.service.impl.serveur.ReglagesServeur.Reglage;

/**
 * STABILITE DU SERVEUR : reglages de Payara lus dans domain.xml (configuration « server-config » et pool de la base de
 * l'application), et reglages conseilles avec la commande asadmin qui les applique. Regles pures (testees a part).
 * <p>
 * Valeurs par defaut de Payara quand l'attribut est absent : 5 fils HTTP au plus, pool de 32 connexions sans validation
 * ni detection de fuite.
 */
public final class ConfigPayara {

    public static final String POOL_JNDI = "jdbc/__laborex_pool";

    public int filsHttpMax = 5;
    public String pool = "";
    public int poolMax = 32;
    public boolean poolValidation;
    public int poolFuiteSecondes;
    /** Reprise apres coupure : toutes les connexions jetees si l'une est morte, nouvelles tentatives de creation. */
    public boolean poolToutJeter;
    public int poolTentatives;
    /** URL de la base declaree dans le pool (sans le mot de passe, qui est une autre propriete). */
    public String poolUrl = "";
    public String niveauSurveillancePool = "OFF", niveauSurveillanceFils = "OFF";
    public List<String> optionsJvm = new ArrayList<>();
    public boolean lu;

    private static String attribut(String balise, String nom) {
        Matcher m = Pattern.compile("\\s" + Pattern.quote(nom) + "=\"([^\"]*)\"").matcher(balise);
        return m.find() ? m.group(1) : null;
    }

    private static int entier(String v, int defaut) {
        try {
            return v == null ? defaut : Integer.parseInt(v.trim());
        } catch (NumberFormatException e) {
            return defaut;
        }
    }

    /** Lecture de domain.xml ; renvoie une configuration « non lue » si le texte est vide ou illisible. */
    public static ConfigPayara lire(String xml) {
        ConfigPayara c = new ConfigPayara();
        if (xml == null || xml.isEmpty()) {
            return c;
        }
        Matcher res = Pattern.compile("<jdbc-resource[^>]*jndi-name=\"" + Pattern.quote(POOL_JNDI) + "\"[^>]*>")
                .matcher(xml);
        if (res.find()) {
            c.pool = attribut(res.group(), "pool-name");
            Matcher p = Pattern.compile("<jdbc-connection-pool[^>]*\\sname=\"" + Pattern.quote(c.pool) + "\"[^>]*>")
                    .matcher(xml);
            if (p.find()) {
                String b = p.group();
                c.poolMax = entier(attribut(b, "max-pool-size"), 32);
                c.poolValidation = "true".equalsIgnoreCase(attribut(b, "is-connection-validation-required"));
                c.poolFuiteSecondes = entier(attribut(b, "connection-leak-timeout-in-seconds"), 0);
                c.poolToutJeter = "true".equalsIgnoreCase(attribut(b, "fail-all-connections"));
                c.poolTentatives = entier(attribut(b, "connection-creation-retry-attempts"), 0);
                int finPool = xml.indexOf("</jdbc-connection-pool>", p.start());
                String corps = finPool < 0 ? "" : xml.substring(p.start(), finPool);
                Matcher u = Pattern.compile("<property name=\"(?:url|URL)\" value=\"([^\"]*)\"").matcher(corps);
                c.poolUrl = u.find() ? u.group(1).replace("&amp;", "&") : "";
            }
        }
        int debut = xml.indexOf("<config name=\"server-config\"");
        int fin = debut < 0 ? -1 : xml.indexOf("</config>", debut);
        String cfg = debut < 0 || fin < 0 ? "" : xml.substring(debut, fin);
        Matcher t = Pattern.compile("<thread-pool[^>]*\\sname=\"http-thread-pool\"[^>]*>").matcher(cfg);
        if (t.find()) {
            c.filsHttpMax = entier(attribut(t.group(), "max-thread-pool-size"), 5);
        }
        Matcher mon = Pattern.compile("<module-monitoring-levels[^>]*>").matcher(cfg);
        if (mon.find()) {
            String jdbc = attribut(mon.group(), "jdbc-connection-pool"), fils = attribut(mon.group(), "thread-pool");
            c.niveauSurveillancePool = jdbc == null ? "OFF" : jdbc.toUpperCase(Locale.ROOT);
            c.niveauSurveillanceFils = fils == null ? "OFF" : fils.toUpperCase(Locale.ROOT);
        }
        Matcher o = Pattern.compile("<jvm-options>([^<]*)</jvm-options>").matcher(cfg);
        while (o.find()) {
            c.optionsJvm.add(o.group(1).trim());
        }
        c.lu = !cfg.isEmpty();
        return c;
    }

    /**
     * Fils HTTP conseilles pour UN Payara : une caisse (un utilisateur, mais chaque ecran lance plusieurs appels a la
     * fois) 50 ; le serveur, qui sert aussi les terminaux et les telephones, 100.
     */
    public static int filsConseilles(boolean serveur) {
        return serveur ? 100 : 50;
    }

    /** Vrai si l'hote designe cette machine (adresse de bouclage ou nom de la machine). */
    public static boolean locale(String hote, String nomMachine) {
        String h = hote == null ? "" : hote.trim().toLowerCase(Locale.ROOT);
        return h.equals("127.0.0.1") || h.equals("localhost") || h.equals("::1") || h.equals("[::1]")
                || (nomMachine != null && h.equalsIgnoreCase(nomMachine.trim()));
    }

    static boolean ipv4(String hote) {
        return hote != null && hote.matches("\\d{1,3}(\\.\\d{1,3}){3}");
    }

    private static boolean option(List<String> options, String prefixe) {
        for (String o : options) {
            if (o.startsWith(prefixe)) {
                return true;
            }
        }
        return false;
    }

    private static String valeur(List<String> options, String prefixe) {
        for (String o : options) {
            if (o.startsWith(prefixe)) {
                return o.substring(prefixe.length());
            }
        }
        return null;
    }

    /** Hote de MariaDB dans une URL JDBC (vide si illisible). */
    public static String hoteBase(String url) {
        Matcher m = url == null ? null : Pattern.compile("jdbc:(?:mariadb|mysql)://([^:/?]+)").matcher(url);
        return m != null && m.find() ? m.group(1) : "";
    }

    /** asadmin echappe les « : » d'une option de la JVM. */
    static String echapper(String option) {
        return option.replace(":", "\\:");
    }

    private static Reglage reglage(List<Reglage> l, String cle, String libelle, String actuel, String conseille,
            Niveau niveau, String explication, String ligne) {
        Reglage r = new Reglage("PAYARA", cle, libelle);
        r.actuel = actuel;
        r.conseille = conseille;
        r.niveau = niveau;
        r.explication = explication;
        r.ligne = ligne;
        l.add(r);
        return r;
    }

    /**
     * Reglages de Payara conseilles.
     *
     * @param options
     *            options de la JVM en cours (RuntimeMXBean)
     * @param heapConseille
     *            memoire conseillee du serveur Java (octets)
     * @param dossierVidages
     *            dossier des vidages memoire et rapports de plantage (barres obliques)
     * @param dossierLogs
     *            dossier des journaux de Payara (barres obliques)
     */
    public List<Reglage> comparer(List<String> options, long heapConseille, int postes, String dossierVidages,
            String dossierLogs) {
        return comparer(options, heapConseille, true, true, dossierVidages, dossierLogs);
    }

    /**
     * @param serveur
     *            poste serveur (sinon : poste de caisse)
     * @param mariadbLocale
     *            MariaDB tourne sur cette machine
     */
    public List<Reglage> comparer(List<String> options, long heapConseille, boolean serveur, boolean mariadbLocale,
            String dossierVidages, String dossierLogs) {
        List<Reglage> l = new ArrayList<>();
        int fils = filsConseilles(serveur);
        reglage(l, "http-thread-pool", "Fils HTTP (requêtes traitées en même temps)", String.valueOf(filsHttpMax),
                String.valueOf(fils),
                filsHttpMax < 25 ? Niveau.CRITIQUE : filsHttpMax < fils ? Niveau.A_AJUSTER : Niveau.OK,
                "Avec " + filsHttpMax + " fils, une " + (filsHttpMax + 1)
                        + "e requête attend qu'une autre se termine : les caisses se figent aux heures de pointe.",
                "asadmin set configs.config.server-config.thread-pools.thread-pool.http-thread-pool.max-thread-pool-size="
                        + fils);
        reglage(l, "pool-validation", "Contrôle des connexions à la base", poolValidation ? "activé" : "désactivé",
                "activé", poolValidation ? Niveau.OK : Niveau.A_AJUSTER,
                "Après un redémarrage de MariaDB ou une coupure réseau, les connexions mortes sont remplacées au lieu de faire échouer les ventes.",
                "asadmin set resources.jdbc-connection-pool." + pool + ".is-connection-validation-required=true"
                        + "\nasadmin set resources.jdbc-connection-pool." + pool
                        + ".connection-validation-method=custom-validation"
                        + "\nasadmin set resources.jdbc-connection-pool." + pool
                        + ".validation-classname=org.glassfish.api.jdbc.validation.MySQLConnectionValidation");
        reglage(l, "pool-fuite", "Détection des connexions non rendues",
                poolFuiteSecondes > 0 ? poolFuiteSecondes + " s" : "désactivée", "300 s",
                poolFuiteSecondes > 0 ? Niveau.OK : Niveau.A_AJUSTER,
                "Écrit dans le journal l'endroit du code qui garde une connexion plus de 5 minutes : la cause d'un pool épuisé.",
                "asadmin set resources.jdbc-connection-pool." + pool + ".connection-leak-timeout-in-seconds=300");
        reglage(l, "pool-reprise", "Reprise du pool après une coupure",
                poolToutJeter && poolTentatives > 0 ? "activée (" + poolTentatives + " essais)" : "désactivée",
                "activée (6 essais, 10 s)", poolToutJeter && poolTentatives > 0 ? Niveau.OK : Niveau.A_AJUSTER,
                "Une connexion morte fait jeter toutes les autres (elles le sont aussi) ; si MariaDB n'est pas encore prête, le pool réessaie au lieu d'abandonner.",
                "asadmin set resources.jdbc-connection-pool." + pool + ".fail-all-connections=true"
                        + "\nasadmin set resources.jdbc-connection-pool." + pool
                        + ".connection-creation-retry-attempts=6" + "\nasadmin set resources.jdbc-connection-pool."
                        + pool + ".connection-creation-retry-interval-in-seconds=10");
        String hote = hoteBase(poolUrl);
        if (mariadbLocale) {
            boolean boucle = "127.0.0.1".equals(hote);
            reglage(l, "pool-adresse", "Adresse de la base dans le pool", hote.isEmpty() ? "?" : hote, "127.0.0.1",
                    boucle || hote.isEmpty() ? Niveau.OK : Niveau.A_AJUSTER,
                    "localhost".equalsIgnoreCase(hote)
                            ? "localhost fonctionne, mais Windows essaie parfois d'abord l'adresse IPv6 ::1 : 127.0.0.1 ne dépend de rien."
                            : "MariaDB est sur cette machine : 127.0.0.1 ne dépend ni de la box ni de la carte réseau, souvent pas prêtes après une coupure.",
                    poolUrl.isEmpty() || boucle ? "" : "asadmin set \"resources.jdbc-connection-pool." + pool
                            + ".property.url=" + poolUrl.replaceFirst("//[^:/?]+", "//127.0.0.1") + "\"");
        } else {
            boolean ip = ipv4(hote);
            reglage(l, "pool-adresse", "Adresse du serveur de base dans le pool", hote.isEmpty() ? "?" : hote,
                    "adresse IP fixe du serveur", ip || hote.isEmpty() ? Niveau.OK : Niveau.A_AJUSTER,
                    ip ? "Adresse IP : vérifiez qu'elle est RÉSERVÉE au serveur dans la box (sinon elle peut changer après une coupure)."
                            : "Un nom d'ordinateur doit être traduit par le réseau ; après une coupure, la box redémarre après les postes et la traduction échoue. Mettez l'adresse IP du serveur, réservée dans la box.",
                    poolUrl.isEmpty() || ip ? "" : "asadmin set \"resources.jdbc-connection-pool." + pool
                            + ".property.url=" + poolUrl.replaceFirst("//[^:/?]+", "//<IP_DU_SERVEUR>") + "\"");
        }
        reglage(l, "surveillance", "Compteurs du pool et des fils",
                "pool " + niveauSurveillancePool + ", fils " + niveauSurveillanceFils, "HIGH",
                "HIGH".equals(niveauSurveillancePool) ? Niveau.OK : Niveau.A_AJUSTER,
                "Donne au Centre de support le nombre de connexions utilisées et en attente.",
                "asadmin set configs.config.server-config.monitoring-service.module-monitoring-levels.jdbc-connection-pool=HIGH"
                        + "\nasadmin set configs.config.server-config.monitoring-service.module-monitoring-levels.thread-pool=HIGH");

        String xmx = valeur(options, "-Xmx"), xms = valeur(options, "-Xms");
        String h = heapConseille % ReglagesServeur.GO == 0 ? (heapConseille / ReglagesServeur.GO) + "g"
                : (heapConseille / ReglagesServeur.MO) + "m";
        StringBuilder memoire = new StringBuilder();
        if (xmx != null) {
            memoire.append("asadmin delete-jvm-options -Xmx").append(xmx).append('\n');
        }
        if (xms != null) {
            memoire.append("asadmin delete-jvm-options -Xms").append(xms).append('\n');
        }
        memoire.append("asadmin create-jvm-options -Xmx").append(h).append("\nasadmin create-jvm-options -Xms")
                .append(h);
        long actuelle = xmx == null ? -1 : ReglagesServeur.octets(xmx);
        boolean assez = actuelle >= heapConseille * 0.9;
        reglage(l, "Xms", "Mémoire du serveur Java (-Xms = -Xmx)",
                "-Xms " + (xms == null ? "absente" : xms) + ", -Xmx " + (xmx == null ? "absente" : xmx), h,
                !assez && actuelle >= 0 && actuelle < heapConseille * 0.66 ? Niveau.CRITIQUE
                        : xms != null && xms.equalsIgnoreCase(xmx) && assez ? Niveau.OK : Niveau.A_AJUSTER,
                "Assez de mémoire pour le serveur, réservée dès le démarrage : elle ne manque pas plus tard, quand Windows l'a donnée à d'autres.",
                memoire.toString());
        reglage(l, "HeapDumpOnOutOfMemoryError", "Vidage mémoire en cas de mémoire épuisée",
                option(options, "-XX:+HeapDumpOnOutOfMemoryError") ? "activé" : "désactivé", "activé",
                option(options, "-XX:+HeapDumpOnOutOfMemoryError") && option(options, "-XX:HeapDumpPath=") ? Niveau.OK
                        : Niveau.A_AJUSTER,
                "Montre ce qui remplissait la mémoire au moment de l'arrêt (fichier .hprof).",
                "asadmin create-jvm-options -XX\\:+HeapDumpOnOutOfMemoryError\nasadmin create-jvm-options "
                        + echapper("-XX:HeapDumpPath=" + dossierVidages));
        reglage(l, "ErrorFile", "Rapport de plantage de Java",
                option(options, "-XX:ErrorFile=") ? "configuré" : "par défaut", "dans le dossier du support",
                option(options, "-XX:ErrorFile=") ? Niveau.OK : Niveau.A_AJUSTER,
                "Le rapport hs_err est écrit là où le Centre de support le cherche.",
                "asadmin create-jvm-options " + echapper("-XX:ErrorFile=" + dossierVidages + "/hs_err_pid%p.log"));
        reglage(l, "gc-log", "Journal du ramasse-miettes", option(options, "-Xlog:gc") ? "activé" : "désactivé",
                "activé", option(options, "-Xlog:gc") ? Niveau.OK : Niveau.A_AJUSTER,
                "Montre si le serveur passait son temps à libérer de la mémoire avant de ralentir ou de tomber (5 fichiers de 20 Mo).",
                "asadmin create-jvm-options "
                        + echapper("-Xlog:gc*:file=" + dossierLogs + "/gc.log:time,uptime:filecount=5,filesize=20m"));
        return l;
    }

    /** Commandes asadmin des reglages a appliquer (domaine arrete puis redemarre pour la memoire et les options). */
    public static String script(List<Reglage> reglages) {
        return script(reglages, "domain1");
    }

    /** Idem, pour le domaine en cours (nom du dossier de com.sun.aas.instanceRoot). */
    public static String script(List<Reglage> reglages, String domaine) {
        StringBuilder sb = new StringBuilder(
                "REM Reglages conseilles par Prestige (a lancer dans le dossier bin de Payara)\n");
        for (Reglage r : reglages) {
            if (r.niveau != Niveau.OK && r.ligne != null && r.ligne.startsWith("asadmin")) {
                sb.append("REM ").append(r.libelle).append('\n').append(r.ligne.replace("asadmin ", "call asadmin "))
                        .append('\n');
            }
        }
        return sb.append("call asadmin restart-domain ").append(domaine).append('\n').toString();
    }
}
