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
            List<EntityData> Menudatas = Oprivilege.getAllMenuByUser(OTUser.getLgUSERID());

        %>
        <title>UBI-PRESTIGE</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <meta content="" name="description" />
        <meta content="" name="author" />
        <!--<script src="assets/plugins/jquery-1.8.3.min.js" type="text/javascript"></script> -->
        <script type="text/javascript" src="../../resources/boostrap/bb/js/jquery.min.js"></script>

        <script src="../../resources/boostrap/bb/js/bootstrap.min.js" type="text/javascript"></script>


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

            <!-- DEBUT - AFFICHAGE MENU METRO PRINCIPALE -->
            <div class="pm-wrap">
                <div class="pm-head">
                    <span class="pm-head-ico"><i class="fa fa-th-large"></i></span>
                    <div>
                        <div class="pm-head-title">Menu principal</div>
                        <div class="pm-head-sub">Choisissez un module pour commencer</div>
                    </div>
                </div>

                <div class="pm-grid">
                    <%  for (int i = 0; i < Menudatas.size(); i++) { %>
                    <div class="pm-tile pm-c<%=(i % 8) + 1%>"
                         onClick="AppelerGestionClientele('<%=Menudatas.get(i).getStr_value2()%>');"
                         title="<%=Menudatas.get(i).getStr_value1()%>">
                        <span class="pm-ico"><i class="<%=Menudatas.get(i).getStr_value3()%>"></i></span>
                        <span class="pm-label"><%=Menudatas.get(i).getStr_value1()%></span>
                        <i class="fa fa-chevron-right pm-arrow"></i>
                    </div>
                    <%  } %>
                </div>
            </div>

        </div>




        <!-- WINDOWS 8 TILES -->
        <!-- CHARGEMENT DU SOUS MENU STYLE METRO -->
        <script type="text/javascript">


            function AppelerGestionClientele(lg_MENU_ID) {
                $("#metro-sub-menu").load("view/sousmenus.jsp?lg_MENU_ID=" + lg_MENU_ID);
            }
            function ReloadIframe() {

                window.location.reload();

            }
            ;








        </script>

    </body>
</html>
