<%@page contentType="text/plain" pageEncoding="UTF-8"%><%@page import="java.text.*,java.util.*"%><%!
    /* Diagnostic de la JVM de production pour la migration JDK 17 (lot 0).
     * A deposer a la racine de l'application deployee, a ouvrir une fois, puis a SUPPRIMER.
     * N'affiche aucune option JVM brute : certaines portent des secrets (jetons, mots de passe). */
    static String visible(String s) {
        StringBuilder b = new StringBuilder();
        for (char c : s.toCharArray()) {
            if (c == 0xA0) b.append("[espace insecable U+00A0]");
            else if (c == 0x202F) b.append("[espace fine U+202F]");
            else b.append(c);
        }
        return b.toString();
    }
%><%
    String[] proprietes = {"java.version", "java.vendor", "java.home", "os.name", "os.version",
            "user.language", "user.country", "user.timezone", "file.encoding", "sun.jnu.encoding",
            "java.locale.providers"};
    out.println("=== JVM ===");
    for (String p : proprietes) {
        out.println(String.format("%-24s %s", p, System.getProperty(p, "(non defini)")));
    }
    out.println(String.format("%-24s %s", "locale par defaut", Locale.getDefault()));
    out.println(String.format("%-24s %s", "locale de formatage", Locale.getDefault(Locale.Category.FORMAT)));
    out.println(String.format("%-24s %d Mo", "memoire max (-Xmx)", Runtime.getRuntime().maxMemory() / (1024 * 1024)));
    out.println();
    /* Quelle installation de Payara et quel domaine tournent reellement : deux installations
     * peuvent coexister sur une machine, et le domain.xml lu n'est pas forcement celui qu'on croit. */
    out.println("=== Payara reellement en marche ===");
    out.println(String.format("%-24s %s", "installation", System.getProperty("com.sun.aas.installRoot", "(non defini)")));
    out.println(String.format("%-24s %s", "domaine", System.getProperty("com.sun.aas.instanceRoot", "(non defini)")));
    out.println(String.format("%-24s %s", "serveur", application.getServerInfo()));
    /* Seules les options -X et -XX (memoire, ramasse-miettes) : les -D peuvent porter des secrets. */
    StringBuilder memoire = new StringBuilder();
    for (String arg : java.lang.management.ManagementFactory.getRuntimeMXBean().getInputArguments()) {
        if (arg.startsWith("-X")) {
            memoire.append(memoire.length() == 0 ? "" : " ").append(arg);
        }
    }
    out.println(String.format("%-24s %s", "options -X / -XX", memoire.length() == 0 ? "(aucune)" : memoire));
    out.println(String.format("%-24s %s", "demarree le",
            new SimpleDateFormat("dd/MM/yyyy HH:mm").format(new Date(java.lang.management.ManagementFactory.getRuntimeMXBean().getStartTime()))));
    out.println();
    out.println("=== separateur de milliers produit par cette JVM ===");
    out.println("locale par defaut : " + visible(NumberFormat.getInstance().format(1234567)));
    out.println("locale France     : " + visible(NumberFormat.getInstance(Locale.FRANCE).format(1234567)));
%>
