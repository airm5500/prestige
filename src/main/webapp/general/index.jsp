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
        <meta name="viewport" content="width=device-width, initial-scale=1">
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
        <!-- Font Awesome 6 -->
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA==" crossorigin="anonymous" referrerpolicy="no-referrer" />
        <!-- Navigation moderne -->
        <link rel="stylesheet" type="text/css" href="resources/css/navigation.css" />
        <link rel="stylesheet" href="bootstrap.css">
        <!-- Header moderne (theme navy aligne sur la navigation) :
             charge APRES bootstrap.css pour primer sur le theme KitchenSink -->
        <link rel="stylesheet" type="text/css" href="resources/css/header.css" />
        <!-- Styles specifiques des grilles (hover facturation, ...) -->
        <link rel="stylesheet" type="text/css" href="resources/css/grids.css" />
        <script src="ext/ext-all.js"></script>

        <script src="bootstrap.js"></script>

        <!-- </x-bootstrap> -->

        <script type="text/javascript" src="../resources/boostrap/bb/js/jquery.min.js"></script>
        <script type="text/javascript" src="include-ext.js"></script>
        <script type="text/javascript" src="../resources/js/modernizr-2.6.2.min.js"></script>
        <script src="ext/locale/ext-lang-fr.js" type="text/javascript"></script>
        <script src="app.js"></script>

        <link href="../resources/font-awesome-4.5.0/css/font-awesome.min.css" rel="stylesheet" type="text/css">

        <style>
            #prestige-toast-container {
                position: fixed; top: 15px; right: 15px; z-index: 99999;
                width: 320px; pointer-events: none;
            }
            .prestige-toast {
                background: #4a4a4a; color: #fff;
                border-left: 4px solid #e74c3c;
                border-radius: 4px; padding: 12px 14px;
                margin-bottom: 8px; font-size: 13px; line-height: 1.4;
                box-shadow: 0 3px 10px rgba(0,0,0,.35);
                pointer-events: all; cursor: pointer;
                opacity: 0; transition: opacity .3s ease;
            }
            .prestige-toast.visible { opacity: 1; }
            .prestige-toast .pt-title { font-weight: bold; margin-bottom: 4px; font-size: 13px; }
            .prestige-toast .pt-close {
                float: right; margin-left: 8px; font-size: 16px;
                line-height: 1; cursor: pointer; color: #ccc;
            }
            .prestige-toast.reserve-toast { border-left-color: #e74c3c; }
        </style>

        <script type="text/javascript">
            // Mini systeme toast sans dependance
            function prestigeToast(title, message, options) {
                options = options || {};
                var container = document.getElementById('prestige-toast-container');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'prestige-toast-container';
                    document.body.appendChild(container);
                }
                var el = document.createElement('div');
                el.className = 'prestige-toast' + (options.cls ? ' ' + options.cls : '');
                el.innerHTML = '<span class="pt-close" title="Fermer">&times;</span>'
                    + '<div class="pt-title">' + title + '</div>'
                    + '<div>' + message + '</div>';
                container.appendChild(el);
                setTimeout(function () { el.classList.add('visible'); }, 30);
                var closeDelay = options.autoHideDelay || (options.autoHide === false ? 0 : 8000);
                var tid;
                function dismiss() {
                    clearTimeout(tid);
                    el.classList.remove('visible');
                    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 350);
                }
                el.querySelector('.pt-close').addEventListener('click', function (e) {
                    e.stopPropagation(); dismiss();
                });
                if (closeDelay > 0) { tid = setTimeout(dismiss, closeDelay); }
                if (options.onClick) { el.addEventListener('click', function () { dismiss(); options.onClick(); }); }
                return el;
            }
            // Compatibilite code existant NotifiSendPostPersonalMessage
            function freeowCompat(title, msg, opts) {
                opts = opts || {};
                prestigeToast(title, msg, { autoHide: opts.autoHide !== false, autoHideDelay: opts.autoHideDelay || 8000 });
            }
        </script>

        <script type="text/javascript">

            //code ajouté pr la gestion des langues
            $(function () {
                // Alerte reserve desactivee : remplacee par le centre de notifications (cloche)
                // checkReassortReserve();
            });

            function checkReassortReserve() {
                $.get("${pageContext.request.contextPath}/api/v1/reserve/suggestions?start=0&limit=1", {}, function (response) {
                    try {
                        var obj = (typeof response === 'string') ? jQuery.parseJSON(response) : response;
                        var total = obj && obj.total ? parseInt(obj.total, 10) : 0;
                        if (total > 0) {
                            prestigeToast(
                                '<i class="fa fa-exclamation-circle" style="color:#e74c3c"></i> Gestion des reserves',
                                total + ' article(s) a reassortir selon les suggestions.<br/><small style="color:#bbb;">Cliquez pour ouvrir la gestion des reserves.</small>',
                                {
                                    cls: 'reserve-toast',
                                    autoHide: true,
                                    autoHideDelay: 10000,
                                    onClick: function () {
                                        try {
                                            testextjs.app.getController('App').onLoadNewComponent("reservemanager", "Gestion des reserves", "");
                                        } catch (e) {}
                                    }
                                }
                            );
                        }
                    } catch (e) {}
                });
            }

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

                    if (obj.results[0].statut == "1") {
                        NotifiSendPostPersonalMessage(DETAIL_MESSAGE);
                    }
                });
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
                prestigeToast("Notification-Gestion des sms", Oval, { autoHide: false });
            }
            //fin code ajouté pr la gestion des langues
        </script>
    </head>
    <body>

        <!-- Conteneur des toasts prestige -->
        <div id="prestige-toast-container"></div>

    </body>
</html>
