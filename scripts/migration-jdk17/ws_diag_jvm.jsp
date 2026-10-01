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
    out.println("=== separateur de milliers produit par cette JVM ===");
    out.println("locale par defaut : " + visible(NumberFormat.getInstance().format(1234567)));
    out.println("locale France     : " + visible(NumberFormat.getInstance(Locale.FRANCE).format(1234567)));
%>
