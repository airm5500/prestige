package rest.service.impl.serveur;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import rest.service.impl.serveur.ReglagesServeur.Niveau;
import rest.service.impl.serveur.ReglagesServeur.Reglage;

/**
 * STABILITE DU SERVEUR : application des reglages conseilles de Payara depuis le Centre de support (super
 * administrateur). Regles pures (testees a part) :
 * <ul>
 * <li>les commandes viennent des lignes « asadmin » de {@link ConfigPayara#comparer}, chacune verifiee contre une liste
 * FERMEE de formes (jamais de commande libre) ; un reglage dont une ligne n'y est pas reste au script a copier ;</li>
 * <li>script lance dans un processus detache : il survit au redemarrage du domaine EN COURS (pas forcement domain1)
 * ;</li>
 * <li>verification au retour : les reglages relus apres le redemarrage sont-ils ceux attendus ?</li>
 * </ul>
 */
public final class ApplicationPayara {

    /** Chemin admis dans une option de la JVM (pas d'espace, de guillemet ni de caractere special de cmd). */
    private static final String CHEMIN = "(?:[A-Za-z0-9_./\\-]|\\\\:|%p)+";

    private static final List<Pattern> SET = new ArrayList<>(), JVM = new ArrayList<>();
    static {
        SET.add(Pattern.compile(
                "configs\\.config\\.server-config\\.thread-pools\\.thread-pool\\.http-thread-pool\\.max-thread-pool-size=\\d{1,4}"));
        SET.add(Pattern.compile("resources\\.jdbc-connection-pool\\.[A-Za-z0-9_\\-]+\\.(?:"
                + "is-connection-validation-required=true|connection-validation-method=custom-validation"
                + "|validation-classname=org\\.glassfish\\.api\\.jdbc\\.validation\\.MySQLConnectionValidation"
                + "|connection-leak-timeout-in-seconds=\\d{1,5}|fail-all-connections=true"
                + "|connection-creation-retry-attempts=\\d{1,3}|connection-creation-retry-interval-in-seconds=\\d{1,4}"
                + "|max-pool-size=\\d{1,4})"));
        SET.add(Pattern.compile("resources\\.jdbc-connection-pool\\.[A-Za-z0-9_\\-]+\\.property\\.url="
                + "jdbc:(?:mariadb|mysql)://127\\.0\\.0\\.1(?:[:/?][A-Za-z0-9_:/?&=.\\-]*)?"));
        SET.add(Pattern.compile(
                "configs\\.config\\.server-config\\.monitoring-service\\.module-monitoring-levels\\.(?:jdbc-connection-pool|thread-pool)=HIGH"));
        JVM.add(Pattern.compile("-Xm[xs]\\d{1,6}[kKmMgG]?"));
        JVM.add(Pattern.compile("-XX\\\\:\\+HeapDumpOnOutOfMemoryError"));
        JVM.add(Pattern.compile("-XX\\\\:(?:HeapDumpPath|ErrorFile)=" + CHEMIN));
        JVM.add(Pattern.compile(
                "-Xlog\\\\:gc\\*\\\\:file=" + CHEMIN + "\\\\:time,uptime\\\\:filecount=\\d{1,2},filesize=\\d{1,4}m"));
    }

    /** Une commande asadmin : reglage d'origine et arguments (sans « asadmin »). */
    public static final class Commande {
        public final String cle;
        public final List<String> arguments;

        Commande(String cle, List<String> arguments) {
            this.cle = cle;
            this.arguments = arguments;
        }
    }

    /** Domaine Payara en cours : nom, dossier des domaines, port d'administration. */
    public static final class Domaine {
        public String nom, dossierDomaines;
        public int portAdmin = 4848;
    }

    /** Reglage relu apres le redemarrage. */
    public static final class Verification {
        public final String cle, attendu;
        public String libelle = "", actuel = "?";
        public boolean pris;

        Verification(String cle, String attendu) {
            this.cle = cle;
            this.attendu = attendu;
        }
    }

    private ApplicationPayara() {
    }

    /** Commande de la liste fermee ? */
    public static boolean autorisee(List<String> a) {
        if (a == null || a.size() != 2) {
            return false;
        }
        List<Pattern> formes = "set".equals(a.get(0)) ? SET
                : "create-jvm-options".equals(a.get(0)) || "delete-jvm-options".equals(a.get(0)) ? JVM : null;
        if (formes == null) {
            return false;
        }
        for (Pattern p : formes) {
            if (p.matcher(a.get(1)).matches()) {
                return true;
            }
        }
        return false;
    }

    /** « asadmin set "a=b c" » -> [set, a=b c] ; null si la ligne n'est pas une commande asadmin. */
    static List<String> decouper(String ligne) {
        String l = ligne.trim();
        if (!l.startsWith("asadmin ")) {
            return null;
        }
        List<String> a = new ArrayList<>();
        Matcher m = Pattern.compile("\"([^\"]*)\"|(\\S+)").matcher(l.substring("asadmin ".length()));
        while (m.find()) {
            a.add(m.group(1) != null ? m.group(1) : m.group(2));
        }
        return a;
    }

    /**
     * Commandes des reglages de Payara a ajuster, parmi les cles choisies (toutes si null). Un reglage dont une ligne
     * sort de la liste fermee est ecarte en entier (il reste dans le script a copier).
     */
    public static List<Commande> commandes(List<Reglage> reglages, Collection<String> choix) {
        List<Commande> l = new ArrayList<>();
        for (Reglage r : reglages) {
            if (!"PAYARA".equals(r.domaine) || r.niveau == Niveau.OK || r.ligne == null || r.ligne.trim().isEmpty()
                    || (choix != null && !choix.contains(r.cle))) {
                continue;
            }
            List<Commande> du = new ArrayList<>();
            boolean sur = true;
            for (String ligne : r.ligne.split("\n")) {
                List<String> a = decouper(ligne);
                if (!autorisee(a)) {
                    sur = false;
                    break;
                }
                du.add(new Commande(r.cle, a));
            }
            if (sur) {
                l.addAll(du);
            }
        }
        return l;
    }

    /** Domaine en cours d'apres com.sun.aas.instanceRoot et son domain.xml (port de admin-listener). */
    public static Domaine domaine(String instanceRoot, String xml) {
        Domaine d = new Domaine();
        String r = instanceRoot.replace('\\', '/');
        while (r.endsWith("/")) {
            r = r.substring(0, r.length() - 1);
        }
        int i = r.lastIndexOf('/');
        d.nom = r.substring(i + 1);
        d.dossierDomaines = i < 0 ? "." : r.substring(0, i);
        Matcher m = Pattern.compile("<network-listener[^>]*\\sname=\"admin-listener\"[^>]*>")
                .matcher(xml == null ? "" : xml);
        if (m.find()) {
            Matcher p = Pattern.compile("\\sport=\"(\\d+)\"").matcher(m.group());
            if (p.find()) {
                d.portAdmin = Integer.parseInt(p.group(1));
            }
        }
        return d;
    }

    /** Argument pour cmd : entre guillemets s'il contient un caractere special, % double (sinon developpe). */
    static String argument(String a) {
        String v = a.replace("%", "%%");
        return v.matches("[A-Za-z0-9_./\\\\:=+*,\\-%]+") ? v : "\"" + v + "\"";
    }

    /**
     * Script Windows lance detache : les commandes, puis le redemarrage du domaine en cours ; tout est ecrit dans le
     * journal, qui finit par « FIN » et le code de retour.
     */
    public static String script(List<Commande> commandes, Domaine d, String asadmin, String journal) {
        String fin = "\r\n", sortie = " >> \"" + journal + "\" 2>&1" + fin;
        StringBuilder sb = new StringBuilder("@echo off" + fin);
        sb.append("echo DEBUT %date% %time%").append(sortie);
        for (Commande c : commandes) {
            sb.append("call \"").append(asadmin).append("\" --interactive=false --port ").append(d.portAdmin);
            for (String a : c.arguments) {
                sb.append(' ').append(argument(a));
            }
            sb.append(sortie);
        }
        sb.append("call \"").append(asadmin).append("\" --interactive=false restart-domain --domaindir \"")
                .append(d.dossierDomaines).append("\" ").append(d.nom).append(sortie);
        sb.append("echo FIN %errorlevel% %date% %time%").append(sortie);
        return sb.toString();
    }

    /** Precede la valeur de retour de Win32_Process.Create dans la sortie de PowerShell. */
    public static final String MARQUE_LANCEMENT = "PRESTIGE-LANCEMENT=";

    /** Commande PowerShell qui lance le script hors de l'arbre de Payara (WMI) et ecrit la marque puis le retour. */
    public static String commandeLancement(String bat) {
        return "$ProgressPreference = 'SilentlyContinue'; "
                + "$r = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{CommandLine = "
                + "'cmd.exe /c \"" + bat.replace("'", "''") + "\"'}; '" + MARQUE_LANCEMENT + "' + $r.ReturnValue";
    }

    /**
     * Le script a-t-il ete lance ? PowerShell peut meler a sa sortie un flux de progression (CLIXML) : seule la ligne
     * marquee compte, et Win32_Process.Create renvoie 0 en cas de succes.
     */
    public static boolean lance(int code, String sortie) {
        if (code != 0 || sortie == null) {
            return false;
        }
        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("(?m)^\\s*" + java.util.regex.Pattern.quote(MARQUE_LANCEMENT) + "(\\d+)\\s*$").matcher(sortie);
        return m.find() && "0".equals(m.group(1));
    }

    /** asadmin attend un mot de passe (ou l'a refuse) ? */
    public static boolean motDePasseDemande(String sortie) {
        String s = sortie == null ? "" : sortie.toLowerCase(Locale.ROOT);
        return s.contains("authentication failed") || s.contains("password") || s.contains("mot de passe")
                || s.contains("authentification");
    }

    /** Valeur attendue de chaque reglage commande (sa valeur conseillee). */
    public static Map<String, String> attendu(List<Commande> commandes, List<Reglage> reglages) {
        Map<String, String> m = new LinkedHashMap<>();
        for (Commande c : commandes) {
            for (Reglage r : reglages) {
                if ("PAYARA".equals(r.domaine) && r.cle.equals(c.cle)) {
                    m.put(c.cle, r.conseille);
                }
            }
        }
        return m;
    }

    /** Apres le redemarrage : chaque reglage attendu est-il maintenant correct ? */
    public static List<Verification> verifier(Map<String, String> attendu, List<Reglage> apres) {
        List<Verification> l = new ArrayList<>();
        for (Map.Entry<String, String> e : attendu.entrySet()) {
            Verification v = new Verification(e.getKey(), e.getValue());
            for (Reglage r : apres) {
                if ("PAYARA".equals(r.domaine) && r.cle.equals(e.getKey())) {
                    v.libelle = r.libelle;
                    v.actuel = r.actuel;
                    v.pris = r.niveau == Niveau.OK;
                }
            }
            l.add(v);
        }
        return l;
    }
}
