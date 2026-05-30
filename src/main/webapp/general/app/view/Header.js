/* global Ext */

var OFFICINE = localStorage.getItem("OFFICINE");
var str_PIC = localStorage.getItem("str_PIC");
var lg_EMPLACEMENT_ID = localStorage.getItem("lg_EMPLACEMENT_ID");
var lg_USER_ID;
Ext.define('testextjs.view.Header', {
    extend: 'Ext.Container',
    xtype: 'appHeader',
    id: 'app-header',
    height: 52,
    bodyStyle: "background-image:url(../../../resources/images/headerlb.png) !important",
    layout: {
        type: 'hbox',
        align: 'middle'
    },
    tools: [
        {
            type: 'toggle'
        },
        {
            type: 'close'
        },
        {
            type: 'minimize'
        },
        {
            type: 'maximize'
        },
        {
            type: 'restore'
        },
        {
            type: 'gear'
        },
        {
            type: 'pin'
        },
        {
            type: 'unpin'
        },
        {
            type: 'right'
        },
        {
            type: 'left'
        },
        {
            type: 'down'
        },
        {
            type: 'refresh'
        },
        {
            type: 'minus'
        },
        {
            type: 'plus'
        },
        {
            type: 'help'
        },
        {
            type: 'search'
        },
        {
            type: 'save'
        },
        {
            type: 'print'
        }
    ],
    initComponent: function () {
        Me_header = this;
//alert("str_PIC:"+str_PIC);
        this.items = [{
                xtype: 'component',
                id: 'app-header-title',
                html: '<a href="#" onclick="loadMainMenu();" style="text-decoration:none; color:#FFFFFF;">PRESTIGE 2</a>',
                flex: 1
            }
        ];

        lg_USER_ID = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'User Id',
                    hidden: true,
                    name: 'lg_USER_ID',
                    id: lg_USER_ID,
                    emptyText: 'lg_USER_ID'
                });



        var btnConfig = new Ext.button.Split({
            xtype: 'splitbutton',
            icon: 'resources/images/icons/fam/cog.png',
            id: 'commonsettingapp',
            text: '',
            menu: [{
                    text: 'Mon compte',
                    handler: function () {
                        testextjs.app.getController('App').onLoadNewComponent("myaccountmanager", "Mon compte", "");
                    }
                }, {
                    text: 'Deconnexion',
                    handler: function () {
                        Me_header.Deconnexion();
                    }

                }, {
                    text: 'Aide',
                    handler: function () {
                        alert("Pas implementé");
                    }
                }
                , {
                    text: 'Metro',
                    handler: function () {
//                        testextjs.app.getController('App').onLoadNewComponent("mainmenumanager", "", "");
                        testextjs.app.getController('App').onLoadNewComponent(xtypeload, "", "");

                    }
                }

                , {
                    text: 'A propos',
                    handler: function () {
                        // testextjs.app.getController('App').onLoadNewComponent("aboutmanager", "A Propos","");
                        testextjs.app.getController('App').onLoadNewComponent("aboutmanager", "A Propos", "");
                    }
                }]
        });




        if (!Ext.getCmp('options-toolbar')) {
            this.items.push(
                    {
                        xtype: 'component',
                        cls: 'liner',

                        html: '<p class="microsoft marquee"><span id="bienvenu" >Bienvenue à   <span id="officine">  * ' + OFFICINE + ' *</span>  </span></p>'
                                //  html: '<span style="font-size: 2.5em;font-weight:bold;font-family:Buxton Sketch;color:white;display:inline-block;margin-right:350px;margin-top:20px;width: 100%;">' + OFFICINE + '</span>'
                    }, {
                xtype: 'component',
                id: 'notif-bell',
                html: '<span style="position:relative; cursor:pointer; margin:0 12px; display:inline-block;" onclick="showNotificationCenter()" title="Notifications">'
                        + '<i class="fa fa-bell" style="font-size:22px;color:#ffffff;"></i>'
                        + '<span id="notif-badge" style="display:none; position:absolute; top:-9px; right:-11px; background:#e74c3c; color:#fff; border-radius:10px; padding:1px 6px; font-size:11px; font-weight:bold; line-height:1.4;">0</span>'
                        + '</span>'
            }, {
                xtype: 'component',
                html: '<img src="' + str_PIC + '" style="cursor: pointer; width: 45px; height: 45px; border-radius: 5px; margin-right: 5px;" alt="photo_profile" id="photo_profile" onclick="changePicture()"/>'
            },
                    {
                        xtype: 'themeSwitcher'
                    }, lg_USER_ID, btnConfig

                    );
        }

        testextjs.app.getController('App').inituserName(); // a decommenter en cas de probleme
        this.callParent();

        // Charge le compteur de notifications (articles a reassortir)
        this.on('afterrender', function () {
            refreshNotificationBadge();
            // Rafraichissement temps reel du badge (toutes les 60s)
            if (!window.PRESTIGE_NOTIF_TIMER) {
                window.PRESTIGE_NOTIF_TIMER = setInterval(function () {
                    refreshNotificationBadge();
                }, 60000);
            }
        }, this, {delay: 500, single: true});
    },
    Deconnexion: function () {
//        var internal_url = '../webservices/usermanagement/ws_transaction.jsp?mode=deconnexion';
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/user/logout',

            success: function (response, options)
            {
                var result = Ext.JSON.decode(response.responseText, true);
                if (!result.success) {
                    Ext.MessageBox.alert('Error Message', result.errors);
                    return;
                }
                localStorage.clear();
                window.location.replace("../index.jsp?content=panelInfos.jsp&lng=fr&action=logout");

            },
            failure: function (response)
            {

                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });

    }
});


function changePicture() {
    alert("My picture");
    //testextjs.app.getController('App').onLoadNewComponent("updatepicture", "Mise a jour de la photo de profil", "");
}

// ----------------------------------------------------- Centre de notifications

// Cache des notifications recuperees (articles a reassortir)
var PRESTIGE_NOTIFS = [];

function refreshNotificationBadge() {
    Ext.Ajax.request({
        url: '../api/v1/reserve/suggestions?start=0&limit=50',
        method: 'GET',
        success: function (response) {
            try {
                var obj = Ext.JSON.decode(response.responseText, true);
                PRESTIGE_NOTIFS = (obj && obj.results) ? obj.results : [];
                var total = (obj && obj.total) ? parseInt(obj.total, 10) : 0;
                var badge = Ext.get('notif-badge');
                if (badge) {
                    if (total > 0) {
                        badge.dom.innerHTML = total > 99 ? '99+' : total;
                        badge.setStyle('display', 'inline-block');
                    } else {
                        badge.setStyle('display', 'none');
                    }
                }
            } catch (e) {
            }
        }
    });
}

function showNotificationCenter() {
    // Recharge avant affichage pour avoir l'etat a jour
    Ext.Ajax.request({
        url: '../api/v1/reserve/suggestions?start=0&limit=50',
        method: 'GET',
        success: function (response) {
            var obj = Ext.JSON.decode(response.responseText, true);
            PRESTIGE_NOTIFS = (obj && obj.results) ? obj.results : [];
            buildNotificationWindow();
        },
        failure: function () {
            buildNotificationWindow();
        }
    });
}

function buildNotificationWindow() {
    var existing = Ext.getCmp('notif-center-win');
    if (existing) {
        existing.close();
    }

    var rows = '';
    if (!PRESTIGE_NOTIFS || PRESTIGE_NOTIFS.length === 0) {
        rows = '<div style="padding:20px; text-align:center; color:#888;">Aucune notification.</div>';
    } else {
        for (var i = 0; i < PRESTIGE_NOTIFS.length; i++) {
            var n = PRESTIGE_NOTIFS[i];
            rows += '<div class="notif-item" style="padding:10px 12px; border-bottom:1px solid #eee; cursor:pointer;" '
                    + 'onmouseover="this.style.background=\'#f5f5f5\'" onmouseout="this.style.background=\'#fff\'" '
                    + 'onclick="openReserveFromNotif()">'
                    + '<div style="font-weight:bold; color:#333;">'
                    + '<i class="fa fa-exclamation-circle" style="color:#e74c3c; margin-right:6px;"></i>'
                    + (n.str_NAME || n.str_DESCRIPTION || '') + '</div>'
                    + '<div style="font-size:12px; color:#666; margin-top:3px;">A reassortir : <b>' + (n.int_QTE_SUGGEREE || 0) + '</b> '
                    + ' &nbsp;|&nbsp; Rayon : ' + (n.int_STOCK_RAYON || 0)
                    + ' &nbsp;|&nbsp; Reserve : ' + (n.int_STOCK_RESERVE || 0) + '</div>'
                    + '</div>';
        }
    }

    var html = '<div style="max-height:340px; overflow-y:auto;">'
            + '<div style="padding:8px 12px; background:#2c7873; color:#fff; font-weight:bold;">'
            + '<i class="fa fa-bell" style="margin-right:6px;"></i>Articles a reassortir (' + (PRESTIGE_NOTIFS ? PRESTIGE_NOTIFS.length : 0) + ')</div>'
            + rows + '</div>';

    Ext.create('Ext.window.Window', {
        id: 'notif-center-win',
        title: 'Notifications',
        width: 380,
        autoHeight: true,
        maxHeight: 420,
        modal: false,
        constrain: true,
        bodyPadding: 0,
        html: html,
        listeners: {
            show: function (win) {
                // Positionne sous la cloche
                var bell = Ext.get('notif-bell');
                if (bell) {
                    var xy = bell.getXY();
                    win.setPosition(Math.max(0, xy[0] - 320), xy[1] + 45);
                }
            }
        }
    }).show();
}

function openReserveFromNotif() {
    var win = Ext.getCmp('notif-center-win');
    if (win) {
        win.close();
    }
    try {
        testextjs.app.getController('App').onLoadNewComponent("reservemanager", "Gestion des reserves", "");
    } catch (e) {
    }
}