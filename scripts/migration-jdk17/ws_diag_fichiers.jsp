<%@page contentType="text/plain" pageEncoding="UTF-8"%><%@page import="java.io.File,java.util.Date,java.text.SimpleDateFormat,toolkits.utils.jdom"%><%!
    /* Diagnostic des fichiers de l'application pour la migration JDK 17 (lot 0 bis).
     * Dit quel config_laborex_v1.xml TOOLKITS charge reellement, ou les PDF et les photos sont
     * ecrits, et si ces dossiers sont bien ceux que l'application sert.
     * A deposer a la racine de l'application deployee, a ouvrir une fois, puis a SUPPRIMER.
     * N'affiche que des chemins : aucun mot de passe ni identifiant de la configuration. */

    /* Ordre exact dans lequel TOOLKITS cherche sa configuration (lu dans son bytecode). */
    static final String[] CANDIDATS = {
        "/home/prestige2/Documents/CONF/LABOREX/CONF/config_laborex_v1.xml",
        "C://CONF//LABOREX//CONF//config_laborex_v1.xml",
        "C://CONF//CONF//config_laborex_v1.xml",
        "D://CONF//LABOREX//CONF//config_laborex_v1.xml",
        "E://CONF//LABOREX//CONF//config_laborex_v1.xml",
        "G://CONF//LABOREX//CONF//config_laborex_v1.xml",
        "H://CONF//LABOREX//CONF//config_laborex_v1.xml",
        "I://CONF//LABOREX//CONF//config_laborex_v1.xml",
        "/home/set_user/CONF/LABOREX/CONF/config_laborex_v1.xml",
        "/home/administrator/CONF/LABOREX/CONF/config_laborex_v1.xml",
        "/home/prestige2/CONF/LABOREX/CONF/config_laborex_v1.xml"
    };

    /* toRealPath suit les liens symboliques et les jonctions Windows, ce que getCanonicalPath ne
     * garantit pas sous Windows : c'est ce qui permet de voir qu'un dossier "data" pointe ailleurs. */
    static String canonique(String chemin) {
        try {
            return java.nio.file.Paths.get(chemin).toRealPath().toString();
        } catch (Exception e) {
            return new File(chemin).getAbsolutePath().replaceAll("[\\\\/]+$", "") + " (n'existe pas)";
        }
    }

    static String etat(String chemin) {
        if (chemin == null || chemin.trim().isEmpty()) {
            return "(non renseigne)";
        }
        File f = new File(chemin);
        if (!f.exists()) {
            return "ABSENT";
        }
        StringBuilder s = new StringBuilder(f.isDirectory() ? "dossier" : "fichier");
        String c = canonique(chemin);
        String direct = f.toPath().toAbsolutePath().normalize().toString();
        if (!c.equalsIgnoreCase(direct)) {
            s.append(", chemin reel : ").append(c);
        }
        if (f.isDirectory()) {
            File[] contenu = f.listFiles();
            int n = contenu == null ? 0 : contenu.length;
            long recent = 0;
            if (contenu != null) {
                for (File x : contenu) {
                    recent = Math.max(recent, x.lastModified());
                }
            }
            s.append(", ").append(n).append(" element(s)");
            if (recent > 0) {
                s.append(", le plus recent : ").append(new SimpleDateFormat("dd/MM/yyyy HH:mm").format(new Date(recent)));
            }
        }
        return s.toString();
    }
%><%
    out.println("=== 1. fichier de configuration charge par TOOLKITS ===");
    boolean trouve = false;
    for (String c : CANDIDATS) {
        boolean existe = new File(c).isFile();
        String marque = "";
        if (existe && !trouve) {
            marque = "   <== CELUI-CI EST CHARGE";
            trouve = true;
        }
        out.println(String.format("  %-8s %s%s", existe ? "existe" : "absent", c, marque));
    }
    if (!trouve) {
        out.println("  AUCUN fichier trouve : TOOLKITS ne peut pas se configurer.");
    }
    out.println();

    try {
        jdom.InitRessource();
        jdom.LoadRessource();
    } catch (Throwable e) {
        out.println("Chargement de la configuration impossible : " + e);
    }

    out.println("=== 2. chemins lus dans cette configuration ===");
    String[][] chemins = {
        {"scr_report_file (modeles d'etats)", jdom.scr_report_file},
        {"scr_report_pdf (PDF generes)", jdom.scr_report_pdf},
        {"scr_report_xls", jdom.scr_report_xls},
        {"scr_report_file_logo", jdom.scr_report_file_logo},
        {"path_file_generate_absolute", jdom.path_file_generate_absolute},
        {"path_file_generate_absolute_imported", jdom.path_file_generate_absolute_imported},
        {"path_photo_absolute (photos)", jdom.path_photo_absolute}
    };
    for (String[] c : chemins) {
        out.println("  " + c[0]);
        out.println("      valeur : " + c[1]);
        out.println("      etat   : " + etat(c[1]));
    }
    out.println("  path_photo_relatif (adresse des photos) : " + jdom.path_photo_relatif);
    out.println();

    out.println("=== 3. dossier servi par l'application ===");
    String racine = application.getRealPath("/");
    out.println("  racine de /prestige : " + racine);
    out.println("      etat : " + etat(racine));
    String[] sous = {"data", "data/reports/pdf", "data/imported", "resources/exported"};
    for (String s : sous) {
        String p = new File(racine, s).getPath();
        out.println("  " + s + " : " + etat(p));
    }
    out.println();

    out.println("=== 4. les PDF ecrits sont-ils ceux que l'application sert ? ===");
    String ecrits = jdom.scr_report_pdf == null ? null : canonique(jdom.scr_report_pdf);
    String servis = canonique(new File(racine, "data/reports/pdf").getPath());
    out.println("  ecrits dans : " + ecrits);
    out.println("  servis par  /prestige/data/reports/pdf/ depuis : " + servis);
    out.println("  => " + (ecrits != null && ecrits.equalsIgnoreCase(servis)
            ? "OUI, meme dossier"
            : "NON, dossiers differents : un PDF genere ne serait pas telechargeable par cette adresse"));
%>
