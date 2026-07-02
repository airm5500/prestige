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

        <div class="ck-shell">

            <!-- Barre du haut : salutation, date, horloge -->
            <header class="ck-bar">
                <div class="ck-who">
                    <div class="ck-w1"><span id="ck-hello">Bonjour</span>, <%=OTUser.getStrFIRSTNAME()%> <%=OTUser.getStrLASTNAME()%></div>
                    <div class="ck-w2" id="ck-date">&nbsp;</div>
                </div>
                <div class="ck-clock">
                    <div class="ck-c1" id="ck-clock">--:--</div>
                    <div class="ck-c2">heure locale</div>
                </div>
            </header>

            <div class="ck-cols">

                <!-- Colonne gauche : acces rapides (appris automatiquement) -->
                <aside class="ck-acts">
                    <div class="ck-sect"><i class="fa fa-bolt"></i> Acc&egrave;s rapides</div>
                    <div id="ck-quick"></div>
                    <div class="ck-hint" id="ck-quick-hint">
                        Vos &eacute;crans les plus utilis&eacute;s appara&icirc;tront ici automatiquement,
                        au fil de votre navigation.
                    </div>
                </aside>

                <!-- Colonne centrale : recherche + modules -->
                <main class="ck-mid">
                    <label class="ck-search">
                        <i class="fa fa-search"></i>
                        <input type="text" id="ck-q" placeholder="Rechercher un module&hellip;  (Ctrl+K)" autocomplete="off" />
                    </label>

                    <!-- DEBUT - AFFICHAGE MENU PRINCIPAL (remplace par les sous-menus en Ajax) -->
                    <div id="metro-sub-menu">
                        <div class="ck-sect ck-gridtitle"><i class="fa fa-th-large"></i> Tous les modules <span class="ck-line"></span></div>
                        <div class="pm-grid">
                            <%  for (int i = 0; i < Menudatas.size(); i++) { %>
                            <div class="pm-tile ck-a<%=(i % 8) + 1%>"
                                 onClick="AppelerGestionClientele('<%=Menudatas.get(i).getStr_value2()%>');"
                                 data-label="<%=Menudatas.get(i).getStr_value1()%>"
                                 title="<%=Menudatas.get(i).getStr_value1()%>">
                                <span class="pm-ico"><i class="<%=Menudatas.get(i).getStr_value3()%>"></i></span>
                                <span class="pm-label"><%=Menudatas.get(i).getStr_value1()%></span>
                                <i class="fa fa-chevron-right pm-arrow"></i>
                            </div>
                            <%  } %>
                        </div>
                        <div class="ck-empty" style="display:none">Aucun module ne correspond &agrave; votre recherche.</div>
                    </div>
                    <!-- FIN - AFFICHAGE MENU PRINCIPAL -->
                </main>

                <!-- Colonne droite : suivi du jour (chaque bloc s'affiche si sa donnee repond) -->
                <aside class="ck-side">
                    <div class="ck-sect"><i class="fa fa-bell-o"></i> Suivi du jour</div>
                    <div class="ck-stat ck-st-blue" id="ck-stat-ventes" style="display:none">
                        <span class="ck-stico"><i class="fa fa-shopping-cart"></i></span>
                        <div>
                            <div class="ck-stv" id="ck-ventes-v">&mdash;</div>
                            <div class="ck-stl">Ventes r&eacute;alis&eacute;es aujourd'hui</div>
                        </div>
                    </div>
                    <div class="ck-stat ck-st-amber" id="ck-stat-cmd" style="display:none">
                        <span class="ck-stico"><i class="fa fa-truck"></i></span>
                        <div>
                            <div class="ck-stv" id="ck-cmd-v">&mdash;</div>
                            <div class="ck-stl">Commandes en cours</div>
                        </div>
                    </div>
                    <div class="ck-stat ck-st-rose" id="ck-stat-reserve" style="display:none">
                        <span class="ck-stico"><i class="fa fa-exchange"></i></span>
                        <div>
                            <div class="ck-stv" id="ck-reserve-v">&mdash;</div>
                            <div class="ck-stl">Articles &agrave; r&eacute;assortir (r&eacute;serve)</div>
                        </div>
                    </div>

                    <div class="ck-sect ck-mt"><i class="fa fa-lightbulb-o"></i> Astuces</div>
                    <div class="ck-tip"><i class="fa fa-keyboard-o"></i>Ctrl+K place le curseur dans la recherche.</div>
                    <div class="ck-tip"><i class="fa fa-bolt"></i>Les &eacute;crans que vous ouvrez le plus souvent remontent dans &laquo; Acc&egrave;s rapides &raquo;.</div>
                </aside>

            </div>
        </div>


        <script type="text/javascript">

            /* ---- Navigation (noms conserves : generes dans les onclick des tuiles) ---- */
            function AppelerGestionClientele(lg_MENU_ID) {
                $("#metro-sub-menu").load("view/sousmenus.jsp?lg_MENU_ID=" + lg_MENU_ID, function () {
                    // Reapplique les icones de secours sur les sous-menus charges en Ajax
                    if (window.prestigeMetroIcons) {
                        window.prestigeMetroIcons();
                    }
                    // La recherche s'applique aussi aux sous-menus
                    $('#ck-q').val('').trigger('input');
                });
            }
            function ReloadIframe() {

                window.location.reload();

            }
            ;
            function Call_OpenView_getView(view) {
                window.parent.getSousMenuView(view, "");
            }

            /* ---- Acces rapides : appris automatiquement (localStorage) ---- */
            var CK_QUICK_KEY = 'prestige_quick_views_v1';

            function ckQuickAll() {
                try {
                    return JSON.parse(localStorage.getItem(CK_QUICK_KEY)) || {};
                } catch (e) {
                    return {};
                }
            }
            function ckQuickRecord(view, label, icon) {
                if (!view) {
                    return;
                }
                var m = ckQuickAll();
                var it = m[view] || {l: label, i: icon, c: 0};
                if (label) {
                    it.l = label;
                }
                if (icon) {
                    it.i = icon;
                }
                it.c = (it.c || 0) + 1;
                m[view] = it;
                try {
                    localStorage.setItem(CK_QUICK_KEY, JSON.stringify(m));
                } catch (e) {
                }
                ckQuickRender();
            }
            function ckQuickRender() {
                var m = ckQuickAll(), arr = [], k;
                for (k in m) {
                    if (m.hasOwnProperty(k) && m[k] && m[k].l) {
                        arr.push({v: k, l: m[k].l, i: m[k].i, c: m[k].c || 0});
                    }
                }
                arr.sort(function (a, b) {
                    return b.c - a.c;
                });
                arr = arr.slice(0, 5);
                $('#ck-quick-hint').toggle(arr.length === 0);
                var $q = $('#ck-quick').empty();
                $.each(arr, function (x, it) {
                    var ico = (it.i && it.i !== 'null') ? it.i : 'fa fa-th-large';
                    $('<div class="ck-act ck-qa' + (x % 5 + 1) + '">')
                            .attr('title', it.l)
                            .append($('<i>').addClass(ico))
                            .append($('<span class="ck-act-lb">').text(it.l))
                            .on('click', function () {
                                ckQuickRecord(it.v, it.l, it.i);
                                Call_OpenView_getView(it.v);
                            })
                            .appendTo($q);
                });
            }
            // Chaque clic sur un sous-menu alimente les acces rapides
            $(document).on('click', '.pm-tile[data-view]', function () {
                var $t = $(this);
                ckQuickRecord($t.attr('data-view'),
                        $t.attr('data-label') || $.trim($t.find('.pm-label').text()),
                        $t.find('.pm-ico i').attr('class'));
            });
            ckQuickRender();

            /* ---- Recherche instantanee (modules et sous-menus) ---- */
            $('#ck-q').on('input', function () {
                var q = $.trim($(this).val()).toLowerCase(), visibles = 0;
                $('#metro-sub-menu .pm-tile').each(function () {
                    var lb = ($(this).attr('data-label') || $(this).find('.pm-label').text() || '').toLowerCase();
                    var ok = !q || lb.indexOf(q) !== -1;
                    $(this).toggle(ok);
                    if (ok) {
                        visibles++;
                    }
                });
                $('#metro-sub-menu .ck-empty').toggle(visibles === 0);
            }).on('focus blur', function (e) {
                $(this).closest('.ck-search').toggleClass('ck-focus', e.type === 'focus');
            });
            $(document).on('keydown', function (e) {
                if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === 'k') {
                    e.preventDefault();
                    $('#ck-q').focus();
                }
            });

            /* ---- Date, heure et salutation ---- */
            var CK_JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
            var CK_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
                'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
            function ckTick() {
                var d = new Date();
                $('#ck-clock').text(('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2));
                $('#ck-date').text(CK_JOURS[d.getDay()] + ' ' + d.getDate() + ' ' + CK_MOIS[d.getMonth()] + ' ' + d.getFullYear());
                $('#ck-hello').text(d.getHours() >= 5 && d.getHours() < 18 ? 'Bonjour' : 'Bonsoir');
            }
            ckTick();
            setInterval(ckTick, 15000);

            /* ---- Suivi du jour : chaque bloc ne s'affiche que si l'API repond ---- */
            var CK_API = "${pageContext.request.contextPath}/api/v1";
            $.getJSON(CK_API + "/recap/dashboard/daily").done(function (d) {
                if (d && typeof d.DailyCount !== 'undefined') {
                    $('#ck-ventes-v').text(d.DailyCount);
                    $('#ck-stat-ventes').css('display', 'flex');
                }
            });
            $.getJSON(CK_API + "/commande/list?start=0&limit=1&query=").done(function (d) {
                if (d && typeof d.total !== 'undefined') {
                    $('#ck-cmd-v').text(d.total);
                    $('#ck-stat-cmd').css('display', 'flex');
                }
            });
            $.getJSON(CK_API + "/reserve/suggestions?start=0&limit=1").done(function (d) {
                if (d && typeof d.total !== 'undefined') {
                    $('#ck-reserve-v').text(d.total);
                    $('#ck-stat-reserve').css('display', 'flex');
                }
            });

        </script>

    </body>
</html>
