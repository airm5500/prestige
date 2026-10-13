<%@page contentType="text/html" pageEncoding="UTF-8"%><%
    /* Ancienne page de connexion : renvoie vers la page actuelle (security/index.html, 13/10). */
    response.sendRedirect(request.getContextPath() + "/security/index.html?content=panelInfos.jsp&lng=fr");
%>
