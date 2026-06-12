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
        <link href="assets/css/animate.min.css" rel="stylesheet" type="text/css"/>
        <!-- END CORE CSS FRAMEWORK -->
        <!-- BEGIN CSS TEMPLATE -->
        <link href="assets/css/style.css" rel="stylesheet" type="text/css"/>
        <link href="assets/css/responsive.css" rel="stylesheet" type="text/css"/>
        <link href="assets/css/custom-icon-set.css" rel="stylesheet" type="text/css"/>
        <link href="assets/css/magic_space.css" rel="stylesheet" type="text/css"/>
        <link href="assets/css/tiles_responsive.css" rel="stylesheet" type="text/css"/>
        <!-- END CSS TEMPLATE -->
        <!-- WINDOWS 8 TILES STYLE -->
        <link rel="stylesheet" href="assets/css/metro-styles.css" />
        <!-- Design moderne du menu metro (charge en dernier pour primer) -->
        <link rel="stylesheet" href="assets/css/metro-modern.css" />

    </head>
    <body class="body-bg pm-body">

        <div class="demo-wrapper" id="metro-sub-menu">

            <!-- SOUS-MENUS STYLE METRO -->
            <div class="pm-wrap">
                <div class="pm-head">
                    <span class="pm-head-ico"><i class="fa fa-folder-open"></i></span>
                    <div>
                        <div class="pm-head-title">Sous-menus</div>
                        <div class="pm-head-sub">Cliquez sur Menu g&eacute;n&eacute;ral pour revenir &agrave; l'accueil</div>
                    </div>
                </div>

                <div class="pm-grid">
                    <!-- Tuile retour : navy comme le header/navigation -->
                    <div class="pm-tile pm-back" onClick="ReloadIframe();" title="Retour au menu g&eacute;n&eacute;ral">
                        <span class="pm-ico"><i class="fa fa-home"></i></span>
                        <span class="pm-label">MENU GENERAL</span>
                        <i class="fa fa-chevron-right pm-arrow"></i>
                    </div>

                    <%  for (int i = 0; i < sousmenudata.size(); i++) { %>
                    <div class="pm-tile pm-c<%=(i % 8) + 1%>"
                         onClick="Call_OpenView_getView('<%=sousmenudata.get(i).getStr_value3()%>');"
                         title="<%=sousmenudata.get(i).getStr_value1()%>">
                        <span class="pm-ico"><i class="<%=sousmenudata.get(i).getStr_value2()%>"></i></span>
                        <span class="pm-label"><%=sousmenudata.get(i).getStr_value1()%></span>
                        <i class="fa fa-chevron-right pm-arrow"></i>
                    </div>
                    <%  } %>
                </div>
            </div>

        </div>




        <!-- WINDOWS 8 TILES -->
        <!-- CHARGEMENT DU SOUS MENU STYLE METRO -->
        <script type="text/javascript">


            function AppelerGestionClientele() {

                $("#metro-sub-menu").load("view/menu-gestion-clientele.jsp");
            }
            function ReloadIframe() {

                window.location.reload();

            }
             function Call_OpenView_getView(view) {
        window.parent.getSousMenuView(view,"");
    }

            // Badge reserve : injecte le nombre d'articles a reassortir sur le tile reservemanager
            $(function () {
                $.getJSON("${pageContext.request.contextPath}/api/v1/reserve/suggestions?start=0&limit=1", function (data) {
                    var total = data && data.total ? parseInt(data.total, 10) : 0;
                    if (total > 0) {
                        var tile = $("[onclick*='reservemanager']").first();
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
