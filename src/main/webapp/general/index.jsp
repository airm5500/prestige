<%-- 
    Document   : index
    Created on : 6 avr. 2016, 17:16:30
    Author     : KKOFFI
--%>

<%@page import="util.Constant"%>
<%@page import="bll.userManagement.user"%>
<%@page import="dal.TRole"%>
<%@page import="bll.entity.EntityData"%>
<%@page contentType="text/html" pageEncoding="UTF-8"%>
<!DOCTYPE html>
<html>
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
        <link rel="shortcut icon" type="image/x-icon" href="../resources/images/favicon.ico" /> 
        <!-- version standart //--> 
        <link rel="shortcut icon" type="image/png" href="../resources/images/favicon.png" />
        <%@page import="dal.dataManager"  %>
        <%@page import="java.util.*"  %>
        <%@page import="multilangue.Translate"  %>
        <%@page import="toolkits.utils.date"  %>
        <%@page import="dal.TUser"  %>
        <%@page import="toolkits.parameters.commonparameter"  %>
        <%@page import="toolkits.web.json"  %>
        <%@page import="org.json.JSONObject"  %>
        <%@page import="org.json.JSONArray"  %>
        <%@page import="toolkits.utils.jdom"  %>
        <%@page import="toolkits.utils.logger"  %>
        <%@page import="java.text.SimpleDateFormat"  %>
        <%@page import="dal.TPrivilege"  %>
        <%@page import="bll.userManagement.privilege"  %>


        <%
            TUser OTUser = (TUser) session.getAttribute(Constant.AIRTIME_USER);
            // new logger().OCategory.info("OTUser  session ---- " + OTUser.getStrLOGIN());

            if (OTUser == null) {
        %>

        <script>
            window.location.replace("../security/index.jsp?content=panelInfos.jsp&lng=fr");
        </script>

        <%
                return;
            }
            String roleId = (String) session.getAttribute(Constant.USER_ROLE_ID);

        %> 
        <script type="text/javascript">
            sessionStorage.setItem("connecteduser", '<%=roleId%>');

        </script>
        <title><%= jdom.APP_NAME%> :: Ver <%= jdom.APP_VERSION%></title>
        <!-- <x-compile> -->
        <!-- <x-bootstrap> -->
        <link rel="stylesheet" href="bootstrap.css">
        <script src="ext/ext-dev.js"></script>

        <script src="bootstrap.js"></script>

        <!-- </x-bootstrap> -->

        <script type="text/javascript" src="../resources/boostrap/bb/js/jquery.min.js"></script>
        <script type="text/javascript" src="include-ext.js"></script>
        <script type="text/javascript" src="../resources/js/modernizr-2.6.2.min.js"></script>
        <script src="ext/locale/ext-lang-fr.js" type="text/javascript"></script>
        <script src="app.js"></script>

        <link rel="stylesheet" type="text/css" href="tools/alertToast/style/freeow/freeow.css" />

        <script type="text/javascript" src="tools/alertToast/jquery.freeow.js"></script>

        <script type="text/javascript">


            //code ajouté pr la gestion des langues
            $(function () {
                /*   setInterval('updateSmsMiDay()', 2880000); 
                 setInterval('updateALLData()', 9000000); 
                 setInterval('GenerateALLDataForAvoir()', 1800000); */
                // setInterval('GenerateALLDataForAvoir()', 100000);



            });

            function updateALLData() {
                UpdateNotification();
            }

            function updateSmsMiDay() {
                updateSmsMiDayNotification();
            }

            function GenerateALLDataForAvoir() {
                GenerateALLDataForAvoirNotification();
            }



            function UpdateNotification() {
                $.get("../webservices/sm_user/outboudmessage/ws_check_notification_web.jsp", {}, function (response) {

                    var obj = jQuery.parseJSON(response);

                    var DETAIL_MESSAGE = obj.results[0].message;
                    // alert(" DETAIL_MESSAGE " + DETAIL_MESSAGE + " message " + obj.results[0].statut);

                    if (obj.results[0].statut == "1") {
                        NotifiSendPostPersonalMessage(DETAIL_MESSAGE);
                    }
                });
                //NotifiSendPostPersonalMessage("Bonjour a tous");
            }

            function updateSmsMiDayNotification() {
                $.get("../webservices/sm_user/outboudmessage/ws_check_notification_mijournee_web.jsp", {}, function (response) {
                    var obj = jQuery.parseJSON(response);
                    var DETAIL_MESSAGE = obj.results[0].message;
                    if (obj.results[0].statut == "1") {
                        NotifiSendPostPersonalMessage(DETAIL_MESSAGE);
                    }
                });

            }


            function GenerateALLDataForAvoirNotification() {
                $.get("../webservices/sm_user/outboudmessage/ws_check_notificationavoir_web.jsp", {}, function (response) {

                    var obj = jQuery.parseJSON(response);

                    var DETAIL_MESSAGE = obj.results[0].message;
                    if (obj.results[0].statut == "1") {
                        NotifiSendPostPersonalMessage(DETAIL_MESSAGE);
                    }
                });
            }

            function NotifiSendPostPersonalMessage(Oval) {
                // alert(Oval);
                $("#freeow").freeow("Notification-Gestion des sms", Oval, {
                    classes: ["gray", "pushpin"],
                    autoHide: false
                });
            }
            //fin code ajouté pr la gestion des langues
        </script>
    </head>
    <body>


    </body>
</html>
