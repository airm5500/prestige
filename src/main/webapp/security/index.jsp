<%@page contentType="text/html" pageEncoding="UTF-8"%><%
    /* 13/10 : la page de connexion est maintenant security/index.html (donnees par l'API v1/app/info).
       Cette adresse est gardee pour les anciens liens et favoris : elle y renvoie, parametres compris. */
    String q = request.getQueryString();
    response.sendRedirect("index.html" + (q == null ? "" : "?" + q));
%>
