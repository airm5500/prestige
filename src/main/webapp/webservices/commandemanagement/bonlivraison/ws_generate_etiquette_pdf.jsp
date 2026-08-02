<%--
    Point d'entree historique de l'edition des etiquettes d'un bon de livraison.
    La generation est desormais assuree par le servlet /Etiquete (PDF vectoriel A4,
    65 etiquettes, cotes exactes en millimetres) : on se contente de rediriger en
    conservant les parametres.
--%>
<%
    StringBuilder target = new StringBuilder(request.getContextPath()).append("/Etiquete");
    String sep = "?";
    String[] forwardedParams = { "lg_BON_LIVRAISON_ID", "int_NUMBER", "modele_ETIQUETTE" };
    for (String paramName : forwardedParams) {
        String value = request.getParameter(paramName);
        if (value != null && !value.trim().isEmpty()) {
            target.append(sep).append(paramName).append("=").append(java.net.URLEncoder.encode(value.trim(), "UTF-8"));
            sep = "&";
        }
    }
    response.sendRedirect(target.toString());
%>
