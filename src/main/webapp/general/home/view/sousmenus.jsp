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

    </head>
    <body class="body-bg" style="background-color: #E5E9EC !important; ">

        <div class="demo-wrapper" id="metro-sub-menu"> 


            <!-- DEBUT - AFFICHAGE MENU METRO PRINCIPALE --> 

            <div class="dashboard clearfix">
                <%  
            String height="height: 8em";
            if(sousmenudata.size()>12){
            height="height:4em";
            }
                
                %>
                <div class="row">
                    <div class="col-xs-3 tile tile-big tile-7 slideTextUp" id="menu-service-client" onClick="ReloadIframe();" style="margin-right: 1%;width: 24%;<%= height %>;">
                        <div class="panel">
                            <p><i class="fa fa-home text-white text-right fa-lg"></i>MENU GENERAL</p>
                        </div>
                        <div  class="panel">
                            <p><i class="fa fa-home text-white text-right fa-lg"></i>MENU GENERAL</p>

                        </div>
                    </div> 
                    <%                        for (int i = 0; i < sousmenudata.size(); i++) {
                            if (i == 3) {
                                break;
                            }
                    %>

                    <div class="col-xs-3 tile tile-big tile-<%=i + 1%> slideTextUp" id="menu-service-client" onClick="Call_OpenView_getView('<%=sousmenudata.get(i).getStr_value3()%>');" style="margin-right: 1%;width: 24%;<%= height %>;">
                        <div class="panel">
                            <p><i class="<%=sousmenudata.get(i).getStr_value2()%> text-white text-right fa-lg"></i><%=sousmenudata.get(i).getStr_value1()%></p>
                        </div>
                        <div  class="panel">
                            <p><i class="<%=sousmenudata.get(i).getStr_value2()%> text-white text-right fa-lg"></i><%= sousmenudata.get(i).getStr_value1()%></p>

                        </div>
                    </div>  


                    <%

                        }

                    %>

                </div>


                <div class="row">
                    <%                        for (int i = 3; i < sousmenudata.size(); i++) {
                            if (i == 7) {
                                break;
                            }
                    %>

                    <div class="col-xs-3 tile tile-big tile-<%=i + 1%> slideTextUp" id="menu-service-client" onClick="Call_OpenView_getView('<%=sousmenudata.get(i).getStr_value3()%>');" style="margin-right: 1%;width: 24%;<%= height %>;">
                        <div class="panel">
                            <p><i class="<%=sousmenudata.get(i).getStr_value2()%> text-white text-right fa-lg"></i><%=sousmenudata.get(i).getStr_value1()%></p>
                        </div>
                        <div  class="panel">
                            <p><i class="<%=sousmenudata.get(i).getStr_value2()%> text-white text-right fa-lg"></i><%= sousmenudata.get(i).getStr_value1()%></p>

                        </div>
                    </div>  


                    <%

                        }

                    %>

                </div> 



                <div class="row">
                    <%                        for (int i = 7; i < sousmenudata.size(); i++) {
                            if (i == 11) {
                                break;
                            }
                    %>

                    <div class="col-xs-3 tile tile-big tile-<%=i + 1%> slideTextUp" id="menu-service-client" onClick="Call_OpenView_getView('<%=sousmenudata.get(i).getStr_value3()%>'); " style="margin-right: 1%;width: 24%;<%= height %>;">
                        <div class="panel">
                            <p><i class="<%=sousmenudata.get(i).getStr_value2()%> text-white text-right fa-lg"></i><%=sousmenudata.get(i).getStr_value1()%></p>
                        </div>
                        <div  class="panel">
                            <p><i class="<%=sousmenudata.get(i).getStr_value2()%> text-white text-right fa-lg"></i><%= sousmenudata.get(i).getStr_value1()%></p>

                        </div>
                    </div>  


                    <%

                        }

                    %>

                </div>

                <div class="row">
                    <%                        for (int i = 11; i < sousmenudata.size(); i++) {
                            if (i == 15) {
                                break;
                            }
                    %>

                    <div class="col-xs-3 tile tile-big tile-<%=i + 1%> slideTextUp" id="menu-service-client" onClick="Call_OpenView_getView('<%=sousmenudata.get(i).getStr_value3()%>');" style="margin-right: 1%;width: 24%;<%= height %>;">
                        <div class="panel">
                            <p><i class="<%=sousmenudata.get(i).getStr_value2()%> text-white text-right fa-lg"></i><%=sousmenudata.get(i).getStr_value1()%></p>
                        </div>
                        <div  class="panel">
                            <p><i class="<%=sousmenudata.get(i).getStr_value2()%> text-white text-right fa-lg"></i><%= sousmenudata.get(i).getStr_value1()%></p>

                        </div>
                    </div>  


                    <%

                        }

                    %>

                </div> 

                <div class="row">
                    <%                        for (int i = 15; i < sousmenudata.size(); i++) {
                            if (i == 19) {
                                break;
                            }
                    %>

                    <div class="col-xs-3 tile tile-big tile-<%=i + 1%> slideTextUp" id="menu-service-client" onClick="Call_OpenView_getView('<%=sousmenudata.get(i).getStr_value3()%>');" style="margin-right: 1%;width: 24%;<%= height %>;">
                        <div class="panel">
                            <p><i class="<%=sousmenudata.get(i).getStr_value2()%> text-white text-right fa-lg"></i><%=sousmenudata.get(i).getStr_value1()%></p>
                        </div>
                        <div  class="panel">
                            <p><i class="<%=sousmenudata.get(i).getStr_value2()%> text-white text-right fa-lg"></i><%= sousmenudata.get(i).getStr_value1()%></p>

                        </div>
                    </div>  


                    <%

                        }

                    %>

                </div> 
                <div class="row">
                    <%                        for (int i = 19; i < sousmenudata.size(); i++) {
                            if (i == 23) {
                                break;
                            }
                    %>

                    <div class="col-xs-3 tile tile-big tile-<%=i + 1%> slideTextUp" id="menu-service-client" onClick="Call_OpenView_getView('<%=sousmenudata.get(i).getStr_value3()%>');" style="margin-right: 1%;width: 24%;<%= height %>;">
                        <div class="panel">
                            <p><i class="<%=sousmenudata.get(i).getStr_value2()%> text-white text-right fa-lg"></i><%=sousmenudata.get(i).getStr_value1()%></p>
                        </div>
                        <div  class="panel">
                            <p><i class="<%=sousmenudata.get(i).getStr_value2()%> text-white text-right fa-lg"></i><%= sousmenudata.get(i).getStr_value1()%></p>

                        </div>
                    </div>  


                    <%

                        }

                    %>

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
                            tile.find('.panel:first p').append(
                                ' <span style="background:#e74c3c;color:#fff;border-radius:10px;padding:2px 7px;font-size:11px;font-weight:bold;vertical-align:middle;">' + total + '</span>'
                            );
                        }
                    }
                });
            });









        </script> 
     
    </body>
</html>
