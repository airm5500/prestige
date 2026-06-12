/* global Ext */

var OFFICINE = localStorage.getItem("OFFICINE");
var str_PIC = localStorage.getItem("str_PIC");
/* Sans photo de profil, str_PIC vaut null/"undefined" et genere une requete 404 vers general/undefined */
if (!str_PIC || str_PIC === 'null' || str_PIC === 'undefined') {
    str_PIC = 'resources/images/photo_personne/default.png';
}
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

// ===================================================================
//  CENTRE DE NOTIFICATIONS - architecture extensible par categories
// ===================================================================
//
// Pour ajouter une categorie (perimes, commandes, etc.), il suffit
// d'appeler PrestigeNotif.register({...}) avec :
//   key      : identifiant unique
//   label    : titre de la section
//   icon     : classe FontAwesome (ex: 'fa-flask')
//   color    : couleur d'accent (ex: '#e74c3c')
//   url      : endpoint REST renvoyant {total, results:[...]}
//   limit    : nb max d'elements charges (defaut 50)
//   renderItem(item) -> HTML d'une ligne
//   onItemClick(item) -> action au clic (ouvre la vue concernee)
//
var PrestigeNotif = (function () {

    var providers = [];
    // Cache des resultats par categorie : { key: {total, results} }
    var cache = {};

    function register(provider) {
        if (!provider || !provider.key) {
            return;
        }
        // Evite les doublons si Header recree
        for (var i = 0; i < providers.length; i++) {
            if (providers[i].key === provider.key) {
                providers[i] = provider;
                return;
            }
        }
        providers.push(provider);
    }

    // Charge tous les providers ; appelle done(totalGlobal) a la fin
    function loadAll(done) {
        var pending = providers.length;
        if (pending === 0) {
            cache = {};
            if (done) {
                done(0);
            }
            return;
        }
        var newCache = {};
        Ext.each(providers, function (p) {
            var limit = p.limit || 50;
            Ext.Ajax.request({
                url: p.url + (p.url.indexOf('?') >= 0 ? '&' : '?') + 'start=0&limit=' + limit,
                method: 'GET',
                callback: function (opts, success, response) {
                    var results = [], total = 0;
                    if (success) {
                        try {
                            var obj = Ext.JSON.decode(response.responseText, true);
                            // Tolere les reponses {results:[]} ou {data:[]}
                            results = (obj && (obj.results || obj.data)) ? (obj.results || obj.data) : [];
                            total = (obj && obj.total != null) ? parseInt(obj.total, 10) : results.length;
                        } catch (e) {
                        }
                    }
                    newCache[p.key] = {total: total, results: results};
                    pending--;
                    if (pending === 0) {
                        cache = newCache;
                        var grand = 0;
                        Ext.Object.each(cache, function (k, v) {
                            grand += (v.total || 0);
                        });
                        if (done) {
                            done(grand);
                        }
                    }
                }
            });
        });
    }

    function updateBadge(total) {
        var badge = Ext.get('notif-badge');
        if (!badge) {
            return;
        }
        if (total > 0) {
            badge.dom.innerHTML = total > 99 ? '99+' : total;
            badge.setStyle('display', 'inline-block');
        } else {
            badge.setStyle('display', 'none');
        }
    }

    function refreshBadge() {
        loadAll(function (total) {
            updateBadge(total);
        });
    }

    function getCache() {
        return cache;
    }

    function getProviders() {
        return providers;
    }

    return {
        register: register,
        loadAll: loadAll,
        refreshBadge: refreshBadge,
        updateBadge: updateBadge,
        getCache: getCache,
        getProviders: getProviders
    };
})();

// Alias retro-compatible (appele depuis add.js / ReserveManager.js)
function refreshNotificationBadge() {
    PrestigeNotif.refreshBadge();
}

function showNotificationCenter() {
    PrestigeNotif.loadAll(function (total) {
        PrestigeNotif.updateBadge(total);
        buildNotificationWindow();
    });
}

function buildNotificationWindow() {
    var existing = Ext.getCmp('notif-center-win');
    if (existing) {
        existing.close();
    }

    var cache = PrestigeNotif.getCache();
    var providers = PrestigeNotif.getProviders();
    var sections = '';
    var grandTotal = 0;

    Ext.each(providers, function (p) {
        var data = cache[p.key] || {total: 0, results: []};
        var items = data.results || [];
        var total = data.total || items.length;
        grandTotal += total;

        if (total === 0) {
            return; // section masquee si vide
        }

        var rows = '';
        for (var i = 0; i < items.length; i++) {
            var line = p.renderItem ? p.renderItem(items[i]) : (items[i].str_NAME || '');
            rows += '<div class="notif-item" '
                    + 'style="padding:10px 14px; border-bottom:1px solid #eee; cursor:pointer; background:#fff;" '
                    + 'onmouseover="this.style.background=\'#f5f7fa\'" onmouseout="this.style.background=\'#fff\'" '
                    + 'onclick="prestigeNotifItemClick(\'' + p.key + '\',' + i + ')">'
                    + line + '</div>';
        }

        // Titre cliquable + bouton toggle (replie par defaut)
        sections += '<div class="pn-section">'
                // En-tete : titre (cliquable) + toggle (+ / -)
                + '<div style="display:flex; align-items:center; padding:9px 12px; background:' + (p.color || '#2c7873') + '; color:#fff;">'
                +   '<span style="flex:1; cursor:pointer; font-weight:bold;" '
                +         'onclick="prestigeNotifCategoryClick(\'' + p.key + '\')">'
                +     '<i class="fa ' + (p.icon || 'fa-bell') + '" style="margin-right:7px;"></i>'
                +     p.label + ' (' + total + ')'
                +   '</span>'
                +   '<span class="pn-toggle" '
                +         'style="cursor:pointer; font-size:18px; line-height:1; padding:0 4px; user-select:none;" '
                +         'onclick="prestigeNotifToggle(this)">'
                +     '+'
                +   '</span>'
                + '</div>'
                // Corps replie par defaut
                + '<div class="pn-body" style="display:none;">' + rows + '</div>'
                + '</div>';
    });

    if (sections === '') {
        sections = '<div style="padding:24px; text-align:center; color:#888;">Aucune notification.</div>';
    }

    var html = '<div id="pn-scroll">' + sections + '</div>';

    Ext.create('Ext.window.Window', {
        id: 'notif-center-win',
        title: 'Notifications (' + grandTotal + ')',
        width: 400,
        height: 420,
        minWidth: 300,
        minHeight: 200,
        resizable: true,
        modal: false,
        constrain: true,
        layout: 'fit',
        autoScroll: true,
        bodyPadding: 0,
        bodyStyle: 'overflow-y:auto;',
        html: html,
        listeners: {
            show: function (win) {
                var bell = Ext.get('notif-bell');
                if (bell) {
                    var xy = bell.getXY();
                    win.setPosition(Math.max(0, xy[0] - 340), xy[1] + 45);
                }
            }
        }
    }).show();
}

// Deplier / replier une section (clic sur le +/-)
function prestigeNotifToggle(toggleEl) {
    var section = toggleEl.parentNode.parentNode; // .pn-section
    var body = section.querySelector('.pn-body');
    if (!body) {
        return;
    }
    var open = body.style.display !== 'none';
    body.style.display = open ? 'none' : 'block';
    toggleEl.innerHTML = open ? '+' : '&minus;';
}

// Clic sur le titre de la categorie : redirige vers la vue et ferme le panneau
function prestigeNotifCategoryClick(key) {
    var win = Ext.getCmp('notif-center-win');
    var providers = PrestigeNotif.getProviders();
    var provider = null;
    Ext.each(providers, function (p) {
        if (p.key === key) { provider = p; }
    });
    if (win) { win.close(); }
    if (provider && provider.onItemClick) {
        provider.onItemClick(null); // null = pas d'item specifique, juste ouvrir la vue
    }
}

// Dispatch du clic d'un element vers le onItemClick de sa categorie
function prestigeNotifItemClick(key, idx) {
    var win = Ext.getCmp('notif-center-win');
    var cache = PrestigeNotif.getCache();
    var providers = PrestigeNotif.getProviders();
    var provider = null;
    Ext.each(providers, function (p) {
        if (p.key === key) {
            provider = p;
        }
    });
    if (win) {
        win.close();
    }
    if (provider && provider.onItemClick) {
        var data = cache[key] || {results: []};
        provider.onItemClick(data.results[idx]);
    }
}

// ------------------------------------------- Enregistrement des categories

// Categorie RESERVE : articles a reassortir
PrestigeNotif.register({
    key: 'reserve',
    label: 'Articles a reassortir',
    icon: 'fa-exchange',
    color: '#2c7873',
    url: '../api/v1/reserve/suggestions',
    limit: 50,
    renderItem: function (n) {
        return '<div style="font-weight:bold; color:#333;">'
                + '<i class="fa fa-exclamation-circle" style="color:#e74c3c; margin-right:6px;"></i>'
                + (n.str_NAME || n.str_DESCRIPTION || '') + '</div>'
                + '<div style="font-size:12px; color:#666; margin-top:3px;">A reassortir : <b>' + (n.int_QTE_SUGGEREE || 0) + '</b>'
                + ' &nbsp;|&nbsp; Rayon : ' + (n.int_STOCK_RAYON || 0)
                + ' &nbsp;|&nbsp; Reserve : ' + (n.int_STOCK_RESERVE || 0) + '</div>';
    },
    onItemClick: function () {
        try {
            testextjs.app.getController('App').onLoadNewComponent("reservemanager", "Gestion des reserves", "");
        } catch (e) {
        }
    }
});

// Categorie PERIMES : produits dont la peremption est proche (6 mois)
PrestigeNotif.register({
    key: 'perimes',
    label: 'Peremptions proches (6 mois)',
    icon: 'fa-flask',
    color: '#c0392b',
    url: '../api/v1/fichearticle/perimes?nbreMois=6&codeFamile=&codeRayon=&codeGrossiste=&query=&dtStart=&dtEnd=',
    limit: 50,
    renderItem: function (p) {
        return '<div style="font-weight:bold; color:#333;">'
                + '<i class="fa fa-clock-o" style="color:#c0392b; margin-right:6px;"></i>'
                + (p.libelle || '') + '</div>'
                + '<div style="font-size:12px; color:#666; margin-top:3px;">'
                + (p.statut || '') + ' &nbsp;|&nbsp; Lot : ' + (p.numLot || '-')
                + ' &nbsp;|&nbsp; Qte : ' + (p.quantiteLot || 0)
                + ' &nbsp;|&nbsp; ' + (p.datePerement || '') + '</div>';
    },
    onItemClick: function () {
        try {
            // Pre-remplit le nombre de mois a 6 et lance la recherche auto
            window.PRESTIGE_PERIME_NBMOIS = 6;
            testextjs.app.getController('App').onLoadNewComponent("peremptionquery", "Gestion des peremptions", "");
        } catch (e) {
        }
    }
});