<%--
    Document   : list
    Created on : 25 oct. 2015, 08:07:30
    Author     : KKOFFI

    Correctif pour les anciennes versions (fichier a remplacer tel quel, sans recompiler l'application) :
    la barre UBIPHARM du tableau de bord regroupe les grossistes LABOREX-CI ET les grossistes UBIPHARM.
    Le calcul etait fait dans Dashboard.getValeurAchatByGrossiste(), compile dans l'application ; il est
    fait ici, avec le meme resultat JSON (LABOREX, DPCI, COPHARMED, TEDISPHARMA, AUTRES) : la page du
    tableau de bord n'est pas modifiee.

    Regle UBIPHARM : libelle du grossiste qui commence par UBI ou par LABOR, ou qui contient UBIPHARM
    (majuscules et espaces en tete ignores). Ces grossistes sont retires de AUTRES : un BL n'est compte
    qu'une fois.
    Periode : BL clotures du 1er du mois en cours a maintenant (comme la version actuelle).
--%>
<%@page import="java.util.Calendar"%>
<%@page import="java.util.Date"%>
<%@page import="java.util.List"%>
<%@page import="javax.persistence.TemporalType"%>
<%@page import="bll.report.Dashboard"%>
<%@page import="dal.dataManager"%>
<%@page import="org.json.JSONObject"%>
<%@page import="org.json.JSONArray"%>
<%
    String libelle = "UPPER(TRIM(g.`str_LIBELLE`))";
    String ubipharm = "(" + libelle + " LIKE 'UBI%' OR " + libelle + " LIKE 'LABOR%' OR " + libelle
            + " LIKE '%UBIPHARM%')";
    String dpci = libelle + " LIKE 'DPCI%'";
    String copharmed = libelle + " LIKE 'COPHARMED%'";
    String tedis = libelle + " LIKE 'TEDIS PHARMA%'";
    String query = "SELECT COUNT(b.`lg_BON_LIVRAISON_ID`),"
            + " SUM(CASE WHEN " + ubipharm + " THEN b.`int_MHT` ELSE 0 END),"
            + " SUM(CASE WHEN " + dpci + " THEN b.`int_MHT` ELSE 0 END),"
            + " SUM(CASE WHEN " + copharmed + " THEN b.`int_MHT` ELSE 0 END),"
            + " SUM(CASE WHEN " + tedis + " THEN b.`int_MHT` ELSE 0 END),"
            + " SUM(CASE WHEN NOT " + ubipharm + " AND NOT (" + dpci + ") AND NOT (" + copharmed + ")"
            + " AND NOT (" + tedis + ") THEN b.`int_MHT` ELSE 0 END)"
            + " FROM t_bon_livraison b, t_order o, t_grossiste g"
            + " WHERE o.`lg_ORDER_ID` = b.`lg_ORDER_ID` AND o.`lg_GROSSISTE_ID` = g.`lg_GROSSISTE_ID`"
            + " AND b.`str_STATUT` = 'is_Closed' AND b.`dt_UPDATED` >= ?1 AND b.`dt_UPDATED` <= ?2";

    Calendar debut = Calendar.getInstance();
    debut.set(Calendar.DAY_OF_MONTH, 1);
    debut.set(Calendar.HOUR_OF_DAY, 0);
    debut.set(Calendar.MINUTE, 0);
    debut.set(Calendar.SECOND, 0);
    debut.set(Calendar.MILLISECOND, 0);

    JSONArray data = new JSONArray();
    try {
        dataManager OdataManager = new dataManager();
        // Comme l'ancienne JSP : c'est le constructeur de Dashboard qui ouvre la connexion a la base
        // (checkDatamanager). Sans lui, getEm() renvoie null et le graphique reste a 0.
        new Dashboard(OdataManager);
        List<Object[]> lignes = OdataManager.getEm().createNativeQuery(query)
                .setParameter(1, debut.getTime(), TemporalType.TIMESTAMP)
                .setParameter(2, new Date(), TemporalType.TIMESTAMP).getResultList();
        String[] cles = { "LABOREX", "DPCI", "COPHARMED", "TEDISPHARMA", "AUTRES" };
        for (Object[] ligne : lignes) {
            if (ligne[0] != null && Long.parseLong(String.valueOf(ligne[0])) > 0) {
                for (int i = 0; i < cles.length; i++) {
                    Object montant = ligne[i + 1];
                    data.put(new JSONObject().put(cles[i],
                            montant != null ? Math.round(Double.parseDouble(String.valueOf(montant))) : 0L));
                }
            }
        }
    } catch (Exception e) {
        e.printStackTrace();
    }

    JSONObject json = new JSONObject();
    json.put("data", data);
%>

<%= json%>
