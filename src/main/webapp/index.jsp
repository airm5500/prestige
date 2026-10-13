<%@page import="util.Constant"%>
<%@page import="dal.TUser"%>
<%@page import="javax.servlet.http.HttpSession"%>
<%@page import="toolkits.utils.logger"%>
<%@page import="toolkits.parameters.commonparameter"%>
<%@page import="toolkits.utils.jdom"  %>


<%@page contentType="text/html" pageEncoding="UTF-8" session="false"%>
<%
    jdom.InitRessource();
    jdom.LoadRessource();

    TUser OTUser = null;
    try {
        /* 13/10 : sans session existante, on n'en cree pas une (page d'entree ouverte a tous) */
        HttpSession existante = request.getSession(false);
        OTUser = existante != null ? (TUser) existante.getAttribute(Constant.AIRTIME_USER) : null;
       
    } catch (Exception e) {

    }

    if (OTUser != null) {
%> 
<script>window.location.replace("general/index.jsp?content=panelInfos.jsp&lng=fr");</script>
<%
} else {
%>
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN"
    "http://www.w3.org/TR/html4/loose.dtd">

<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <meta name="http-equiv" content="Content-type: text/html; charset=UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title><%= jdom.APP_NAME%> :: Ver <%= jdom.APP_VERSION%></title>
    </head>
    <body>
        <script>window.location.replace("security/index.html?content=panelInfos.jsp&lng=fr");</script>

    </body>
</html>
<%
    }
%> 