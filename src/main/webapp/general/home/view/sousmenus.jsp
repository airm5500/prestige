<%--
    Document   : index
    Created on : 7 avr. 2016, 11:40:03
    Author     : KKOFFI
--%>


<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <%@page import="dal.dataManager"  %>
        <%@page import="dal.TUser"  %>
        <%@page import="java.util.*"  %>
        <%@page import="multilangue.Translate"  %>
        <%@page import="toolkits.utils.jdom"  %>
        <%@page import="dal.TPrivilege"  %>
        <%@page import="bll.userManagement.privilege"  %>

        <%@page import="toolkits.parameters.commonparameter"%>
        <%@page import="bll.entity.EntityData"%>

        <%   Translate OTranslate = new Translate();
            dataManager OdataManager = new dataManager();

            privilege Oprivilege = new privilege();
            TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
            OdataManager.initEntityManager();
            Oprivilege.LoadDataManger(OdataManager);
            Oprivilege.LoadMultilange(OTranslate);
            String lg_MENU_ID = "";
            if (request.getParameter("lg_MENU_ID") != null && !"".equals(request.getParameter("lg_MENU_ID"))) {
                lg_MENU_ID = request.getParameter("lg_MENU_ID");

            }
            List<EntityData> sousmenudata = Oprivilege.getAllSousMenuByUser(OTUser.getLgUSERID(), lg_MENU_ID);

        %>
        <title>UBI-PRESTIGE</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta content="" name="description" />
        <meta content="" name="author" />

        <script src="../../resources/boostrap/bb/js/bootstrap.min.js" type="text/javascript"></script>


        <!-- BEGIN CORE CSS FRAMEWORK -->
        <link rel="stylesheet" type="text/css" href="../../resources/boostrap/bb/css/bootstrap.css"/>
        <link rel="stylesheet" type="text/css" href="../../resources/boostrap/bb/css/bootstrap-theme.min.css"/>
        <link href="../../resources/font-awesome-4.5.0/css/font-awesome.min.css" rel="stylesheet" type="text/css">
        <!-- END CORE CSS FRAMEWORK -->
        <!-- BEGIN CSS TEMPLATE -->
        <link href="assets/css/style.css" rel="stylesheet" type="text/css"/>
        <link href="assets/css/custom-icon-set.css" rel="stylesheet" type="text/css"/>
        <!-- END CSS TEMPLATE -->
        <!-- Design "Cockpit Officine" du menu central (charge en dernier pour primer) -->
        <link rel="stylesheet" href="assets/css/cockpit.css" />
        <!-- Icones de secours pour les menus sans icone en base -->
        <script src="assets/js/metro-icons.js" type="text/javascript"></script>

    </head>
    <body class="ck-body">

        <!-- SOUS-MENUS (injecte en Ajax dans #metro-sub-menu de index.jsp) -->
        <div class="ck-subbar">
            <button type="button" class="ck-backbtn" onClick="ReloadIframe();" title="Retour au menu g&eacute;n&eacute;ral">
                <i class="fa fa-arrow-left"></i> MENU G&Eacute;N&Eacute;RAL
            </button>
            <div class="ck-subtitle"><i class="fa fa-folder-open"></i> Sous-menus</div>
        </div>

        <div class="pm-grid">
            <%  for (int i = 0; i < sousmenudata.size(); i++) { %>
            <div class="pm-tile ck-a<%=(i % 8) + 1%>"
                 onClick="Call_OpenView_getView('<%=sousmenudata.get(i).getStr_value3()%>');"
                 data-view="<%=sousmenudata.get(i).getStr_value3()%>"
                 data-label="<%=sousmenudata.get(i).getStr_value1()%>"
                 title="<%=sousmenudata.get(i).getStr_value1()%>">
                <span class="pm-ico"><i class="<%=sousmenudata.get(i).getStr_value2()%>"></i></span>
                <span class="pm-label"><%=sousmenudata.get(i).getStr_value1()%></span>
                <i class="fa fa-chevron-right pm-arrow"></i>
            </div>
            <%  } %>
        </div>
        <div class="ck-empty" style="display:none">Aucun sous-menu ne correspond &agrave; votre recherche.</div>




        <script type="text/javascript">


            function ReloadIframe() {

                window.location.reload();

            }
            function Call_OpenView_getView(view) {
                window.parent.getSousMenuView(view, "");
            }

            // Badge reserve : injecte le nombre d'articles a reassortir sur le tile reservemanager
            $(function () {
                $.getJSON("${pageContext.request.contextPath}/api/v1/reserve/suggestions?start=0&limit=1", function (data) {
                    var total = data && data.total ? parseInt(data.total, 10) : 0;
                    if (total > 0) {
                        var tile = $(".pm-tile[data-view*='reservemanager']").first();
                        if (tile.length) {
                            tile.find('.pm-label').append(
                                ' <span class="pm-badge" style="background:#e74c3c;color:#fff;border-radius:10px;padding:2px 7px;font-size:11px;font-weight:bold;vertical-align:middle;">' + total + '</span>'
                            );
                        }
                    }
                });
            });









        </script>

    </body>
</html>
