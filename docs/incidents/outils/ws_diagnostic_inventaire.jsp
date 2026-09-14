<%@page contentType="text/plain" pageEncoding="UTF-8"%>
<%@page import="dal.dataManager"%>
<%@page import="dal.TInventaireFamille"%>
<%@page import="java.io.PrintWriter"%>
<%@page import="java.io.StringWriter"%>
<%@page import="java.sql.Connection"%>
<%@page import="java.sql.ResultSet"%>
<%@page import="java.sql.Statement"%>
<%@page import="java.util.List"%>
<%@page import="javax.naming.InitialContext"%>
<%@page import="javax.sql.DataSource"%>
<%!
    static String trace(Throwable e) {
        StringWriter w = new StringWriter();
        e.printStackTrace(new PrintWriter(w));
        Throwable c = e;
        StringBuilder chaine = new StringBuilder();
        while (c != null) {
            chaine.append("  cause : ").append(c.getClass().getName()).append(" : ").append(c.getMessage()).append("\n");
            c = c.getCause();
        }
        return chaine + "\n" + w;
    }
%>
<%
    String INV = request.getParameter("lg_INVENTAIRE_ID");
    if (INV == null || INV.length() == 0) {
        out.println("Appelez cette page avec ?lg_INVENTAIRE_ID=... (l'identifiant de l'inventaire qui ne s'ouvre pas)");
        return;
    }

    final String SELECTION = " FROM TInventaireFamille t, TFamilleGrossiste g"
            + " WHERE g.lgFAMILLEID.lgFAMILLEID = t.lgFAMILLEID.lgFAMILLEID"
            + " AND t.lgINVENTAIREID.lgINVENTAIREID LIKE ?1"
            + " AND t.lgFAMILLEID.lgGROSSISTEID.lgGROSSISTEID LIKE ?2"
            + " AND t.lgFAMILLEID.lgZONEGEOID.lgZONEGEOID LIKE ?3"
            + " AND t.lgFAMILLEID.lgFAMILLEARTICLEID.lgFAMILLEARTICLEID LIKE ?4"
            + " AND (t.lgFAMILLEID.strDESCRIPTION LIKE ?6 OR t.lgFAMILLEID.intCIP LIKE ?6"
            + " OR g.strCODEARTICLE LIKE ?6 OR t.lgFAMILLEID.intEAN13 LIKE ?6"
            + " OR t.lgFAMILLEID.lgZONEGEOID.strCODE LIKE ?6"
            + " OR t.lgFAMILLEID.lgFAMILLEARTICLEID.strCODEFAMILLE LIKE ?6)"
            + " AND t.boolINVENTAIRE = ?8 AND t.strUPDATEDID LIKE ?9";

    out.println("=== DIAGNOSTIC OUVERTURE INVENTAIRE ===");
    out.println("inventaire : " + INV);
    out.println();

    // --- 1. Reglages du serveur de base de donnees reellement en vigueur -------------------------
    out.println("--- 1. reglages MariaDB en vigueur (pas le fichier my.ini : ce que le serveur applique) ---");
    Connection cnx = null;
    try {
        DataSource ds = (DataSource) new InitialContext().lookup("jdbc/__laborex_pool");
        cnx = ds.getConnection();
        Statement st = cnx.createStatement();
        ResultSet rs = st.executeQuery("SHOW VARIABLES WHERE Variable_name IN"
                + " ('version','tmp_table_size','max_heap_table_size','sql_mode','innodb_page_size',"
                + "  'max_allowed_packet','big_tables','aria_used_for_temp_tables')");
        while (rs.next()) {
            out.println("  " + rs.getString(1) + " = " + rs.getString(2));
        }
        rs.close();
        st.close();
    } catch (Throwable e) {
        out.println("  lecture impossible : " + trace(e));
    } finally {
        if (cnx != null) { try { cnx.close(); } catch (Exception ignore) { } }
    }
    out.println();

    dataManager dm = new dataManager();
    dm.initEntityManager();

    // --- 2. Le comptage (celui qui marche deja) ------------------------------------------------
    out.println("--- 2. comptage ---");
    long t0 = System.currentTimeMillis();
    try {
        Object n = dm.getEm().createQuery("SELECT COUNT(DISTINCT t)" + SELECTION)
                .setParameter(1, INV).setParameter(2, "%%").setParameter(3, "%%").setParameter(4, "%%")
                .setParameter(6, "%%%%").setParameter(8, true).setParameter(9, "%%")
                .getSingleResult();
        out.println("  OK : " + n + "  (" + (System.currentTimeMillis() - t0) + " ms)");
    } catch (Throwable e) {
        out.println("  ECHEC apres " + (System.currentTimeMillis() - t0) + " ms :");
        out.println(trace(e));
    }
    out.println();

    // --- 3. La liste (celle qui revient vide) ---------------------------------------------------
    out.println("--- 3. liste des 30 premieres lignes : c'est ici que l'exception est avalee ---");
    List<TInventaireFamille> lignes = null;
    t0 = System.currentTimeMillis();
    try {
        lignes = dm.getEm().createQuery("SELECT DISTINCT t" + SELECTION
                + " GROUP BY t.lgFAMILLEID.lgFAMILLEID"
                + " ORDER BY t.lgFAMILLEID.lgZONEGEOID.strCODE ASC, t.lgFAMILLEID.strNAME ASC")
                .setParameter(1, INV).setParameter(2, "%%").setParameter(3, "%%").setParameter(4, "%%")
                .setParameter(6, "%%%%").setParameter(8, true).setParameter(9, "%%")
                .setFirstResult(0).setMaxResults(30)
                .getResultList();
        out.println("  OK : " + lignes.size() + " ligne(s)  (" + (System.currentTimeMillis() - t0) + " ms)");
    } catch (Throwable e) {
        out.println("  ECHEC apres " + (System.currentTimeMillis() - t0) + " ms :");
        out.println(trace(e));
    }
    out.println();

    // --- 4. La meme liste sans le mot DISTINCT (le correctif propose) ---------------------------
    out.println("--- 4. la meme liste SANS le mot DISTINCT ---");
    t0 = System.currentTimeMillis();
    try {
        List<TInventaireFamille> autres = dm.getEm().createQuery("SELECT t" + SELECTION
                + " GROUP BY t.lgFAMILLEID.lgFAMILLEID"
                + " ORDER BY t.lgFAMILLEID.lgZONEGEOID.strCODE ASC, t.lgFAMILLEID.strNAME ASC")
                .setParameter(1, INV).setParameter(2, "%%").setParameter(3, "%%").setParameter(4, "%%")
                .setParameter(6, "%%%%").setParameter(8, true).setParameter(9, "%%")
                .setFirstResult(0).setMaxResults(30)
                .getResultList();
        out.println("  OK : " + autres.size() + " ligne(s)  (" + (System.currentTimeMillis() - t0) + " ms)");
        if (lignes == null || lignes.isEmpty()) {
            lignes = autres;
        }
    } catch (Throwable e) {
        out.println("  ECHEC apres " + (System.currentTimeMillis() - t0) + " ms :");
        out.println(trace(e));
    }
    out.println();

    // --- 5. Lecture des champs que l'ecran affiche ----------------------------------------------
    out.println("--- 5. lecture des champs affiches par l'ecran, ligne par ligne ---");
    if (lignes == null || lignes.isEmpty()) {
        out.println("  aucune ligne a lire : l'echec est au-dessus.");
    } else {
        int rang = 0;
        for (TInventaireFamille l : lignes) {
            rang++;
            try {
                String s = l.getLgFAMILLEID().getIntCIP() + " | " + l.getLgFAMILLEID().getStrDESCRIPTION()
                        + " | zone " + l.getLgFAMILLEID().getLgZONEGEOID().getStrCODE()
                        + " | famille " + l.getLgFAMILLEID().getLgFAMILLEARTICLEID().getStrLIBELLE()
                        + " | grossiste " + l.getLgFAMILLEID().getLgGROSSISTEID().getStrLIBELLE()
                        + " | pmp " + l.getLgFAMILLEID().getDblPRIXMOYENPONDERE()
                        + " | qte " + l.getIntNUMBER() + "/" + l.getIntNUMBERINIT();
                if (rang <= 3) {
                    out.println("  ligne " + rang + " : " + s);
                }
            } catch (Throwable e) {
                out.println("  ECHEC sur la ligne " + rang + " (lg_INVENTAIRE_FAMILLE_ID = "
                        + l.getLgINVENTAIREFAMILLEID() + ") :");
                out.println(trace(e));
                break;
            }
        }
        out.println("  " + rang + " ligne(s) parcourue(s) sur " + lignes.size());
    }
    out.println();
    out.println("=== FIN ===");
%>
