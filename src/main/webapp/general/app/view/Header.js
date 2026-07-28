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
    height: 64,
    layout: {
        type: 'hbox',
        align: 'middle'
    },
    initComponent: function () {
        Me_header = this;
//alert("str_PIC:"+str_PIC);
        this.items = [{
                xtype: 'component',
                id: 'app-header-title',
                html: '<a href="#" onclick="loadMainMenu();" class="hdr-brand" title="Retour au menu principal">'
                        + '<span class="hdr-brand-ico"><i class="fa fa-plus"></i></span>'
                        + '<span class="hdr-brand-txt hdr-animated-text--brand">PRESTIGE 3</span>'
                        + '</a>'
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



        /* Icone + libelle d'un item du menu Options (meme rendu que les
         * flyouts du menu navigation) */
        var mkOptionItem = function (faIcon, label) {
            return '<span style="display:inline-flex;align-items:center;justify-content:center;'
                    + 'width:22px;height:22px;flex-shrink:0;margin-right:8px;vertical-align:middle">'
                    + '<i class="fa ' + faIcon + '" style="color:#85c1e9;font-size:13px"></i>'
                    + '</span><span style="vertical-align:middle">' + label + '</span>';
        };

        var btnConfig = new Ext.button.Split({
            xtype: 'splitbutton',
            icon: 'resources/images/icons/fam/cog.png',
            id: 'commonsettingapp',
            tooltip: 'Options',
            text: '',
            /* Ext.create explicite : l'alias widget "menu" est ecrase par
             * testextjs.store.Menu (xtype errone herite du KitchenSink),
             * une config objet creerait donc un store au lieu d'un menu */
            menu: Ext.create('Ext.menu.Menu', {
                cls: 'prestige-flyout-menu',
                plain: true,
                items: [{
                        xtype: 'component',
                        cls: 'pft-header-wrap',
                        html: '<div class="pft-title">Options</div>'
                    }, {
                        xtype: 'menuseparator'
                    }, {
                        text: mkOptionItem('fa-user', 'Mon compte'),
                        cls: 'pft-item',
                        handler: function () {
                            testextjs.app.getController('App').onLoadNewComponent("myaccountmanager", "Mon compte", "");
                        }
                    }, {
                        text: mkOptionItem('fa-power-off', 'Deconnexion'),
                        cls: 'pft-item',
                        handler: function () {
                            Me_header.Deconnexion();
                        }

                    }, {
                        text: mkOptionItem('fa-question-circle', 'Aide'),
                        cls: 'pft-item',
                        handler: function () {
                            alert("Veuillez Appeler le service D.I.C.I au 0708080068");
                        }
                    }
                    , {
                        text: mkOptionItem('fa-th-large', 'Metro'),
                        cls: 'pft-item',
                        handler: function () {
//                        testextjs.app.getController('App').onLoadNewComponent("mainmenumanager", "", "");
                            testextjs.app.getController('App').onLoadNewComponent(xtypeload, "", "");

                        }
                    }

                    , {
                        text: mkOptionItem('fa-info-circle', 'A propos'),
                        cls: 'pft-item',
                        handler: function () {
                            // testextjs.app.getController('App').onLoadNewComponent("aboutmanager", "A Propos","");
                            testextjs.app.getController('App').onLoadNewComponent("aboutmanager", "A Propos", "");
                        }
                    }]
            })
        });




        /* NOTE anti-chevauchement : chaque element du header a une largeur
         * FIXE cote ExtJS (le contenu charge en Ajax ne peut plus deborder
         * sur ses voisins) ; seul le nom de l'officine est flexible et
         * absorbe le manque de place sur les petits ecrans (ellipse CSS). */
        if (!Ext.getCmp('options-toolbar')) {
            this.items.push(
                    /* Horloge : date et heure du jour, a droite de PRESTIGE 3 */
                    {
                        xtype: 'component',
                        id: 'hdr-clock',
                        width: 225,
                        margin: '0 0 0 12',
                        html: '<div class="hdr-clock">'
                                + '<i class="fa fa-clock-o"></i>'
                                + '<span id="hdr-clock-text"></span>'
                                + '</div>'
                    },
                    /* Acces direct au menu Metro (largeur fixe : pas de chevauchement) */
                    {
                        xtype: 'component',
                        id: 'hdr-metro-btn',
                        width: 38,
                        margin: '0 0 0 12',
                        html: '<span class="hdr-metro" onclick="prestigeShowMetro()" title="Menu principal (Metro)">'
                                + '<i class="fa fa-th-large"></i>'
                                + '</span>'
                    },
                    /* Nom de l'officine : flexible, centre, ellipse si etroit */
                    {
                        xtype: 'component',
                        id: 'hdr-officine',
                        flex: 1,
                        minWidth: 0,
                        html: '<div class="hdr-officine" title="' + OFFICINE + '">'
                                + '<i class="fa fa-medkit"></i>'
                                + '<span id="officine" class="hdr-animated-text--pharmacy">' + OFFICINE + '</span>'
                                + '</div>'
                    }, {
                xtype: 'component',
                id: 'notif-bell',
                width: 38,
                margin: '0 14 0 6',
                html: '<span class="hdr-bell" onclick="showNotificationCenter()" title="Notifications">'
                        + '<i class="fa fa-bell"></i>'
                        + '<span id="notif-badge" style="display:none;">0</span>'
                        + '</span>'
            },
                    /* Carte utilisateur : photo + nom + role (informatif, sans action) */
                    {
                        xtype: 'component',
                        id: 'hdr-user-card',
                        width: 195,
                        margin: '0 12 0 0',
                        html: '<div class="hdr-user">'
                                + '<img src="' + str_PIC + '" class="hdr-avatar" alt="photo_profile" id="photo_profile"/>'
                                + '<div class="hdr-user-info">'
                                + '<div class="hdr-user-name" id="hdr-user-name">...</div>'
                                + '<div class="hdr-user-role" id="hdr-user-role">Profil</div>'
                                + '</div>'
                                + '</div>'
                    },
                    {
                        xtype: 'themeSwitcher'
                    }, lg_USER_ID, btnConfig,
                    {
                        xtype: 'component',
                        id: 'hdr-logout-btn',
                        width: 36,
                        margin: '0 12 0 10',
                        html: '<span class="hdr-logout" onclick="prestigeHeaderLogout()" title="Se déconnecter">'
                                + '<i class="fa fa-power-off"></i>'
                                + '</span>'
                    }

                    );
        }

        testextjs.app.getController('App').inituserName(); // a decommenter en cas de probleme
        this.callParent();

        // Charge le compteur de notifications (articles a reassortir)
        this.on('afterrender', function () {
            refreshNotificationBadge();
            // Rafraichissement du badge : delai configurable via le parametre
            // KEY_NOTIFICATION_REFRESH_SECONDS (t_parameters), defaut 60s,
            // minimum 15s pour ne pas surcharger le serveur.
            if (!window.PRESTIGE_NOTIF_TIMER) {
                var demarrerTimer = function (secondes) {
                    var delai = parseInt(secondes, 10);
                    if (isNaN(delai) || delai < 15) {
                        delai = 60;
                    }
                    window.PRESTIGE_NOTIF_TIMER = setInterval(function () {
                        refreshNotificationBadge();
                    }, delai * 1000);
                };
                Ext.Ajax.request({
                    method: 'GET',
                    url: '../api/v1/app-params/value/KEY_NOTIFICATION_REFRESH_SECONDS',
                    success: function (response) {
                        var r = Ext.JSON.decode(response.responseText, true);
                        demarrerTimer(r && r.data ? r.data : 60);
                    },
                    failure: function () {
                        demarrerTimer(60);
                    }
                });
            }
            // Animation lettre par lettre du branding et du nom officine.
            prestigeHeaderAnimateTexts();

            // Horloge du header (date + heure, mise a jour chaque seconde)
            prestigeHeaderClock();
            if (!window.PRESTIGE_CLOCK_TIMER) {
                window.PRESTIGE_CLOCK_TIMER = setInterval(prestigeHeaderClock, 1000);
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

// Animation lettre par lettre du header, avec mots non coupés.
function prestigeHeaderHasClass(target, className) {
    return (' ' + target.className + ' ').indexOf(' ' + className + ' ') > -1;
}

function prestigeHeaderRenderAnimatedLetters(target, text, modifier) {
    var safeText = text || '';
    var tokens = safeText.split(/(\s+)/);
    var letterIndex = 0;
    target.innerHTML = '';
    if (modifier && !prestigeHeaderHasClass(target, modifier)) {
        target.className = (target.className + ' ' + modifier).replace(/\s+/g, ' ');
    }
    for (var i = 0; i < tokens.length; i += 1) {
        if (/^\s+$/.test(tokens[i])) {
            target.appendChild(document.createTextNode(' '));
            continue;
        }
        var word = document.createElement('span');
        word.className = 'hdr-animated-word';
        for (var j = 0; j < tokens[i].length; j += 1) {
            var letter = document.createElement('span');
            letter.className = 'hdr-animated-letter';
            letter.style.cssText = '--hdr-letter-index:' + letterIndex + ';';
            letter.textContent = tokens[i].charAt(j);
            word.appendChild(letter);
            letterIndex += 1;
        }
        target.appendChild(word);
    }
}

function prestigeHeaderAnimateTexts() {
    var brandText = document.querySelector('#app-header .hdr-brand-txt');
    var officineText = document.getElementById('officine');
    if (brandText) {
        prestigeHeaderRenderAnimatedLetters(brandText, brandText.textContent, 'hdr-animated-text--brand');
    }
    if (officineText) {
        prestigeHeaderRenderAnimatedLetters(officineText, officineText.textContent, 'hdr-animated-text--pharmacy');
    }
}



// Affiche le menu principal Metro (icone 4 carres du header)
function prestigeShowMetro() {
    try {
        loadMainMenu();
    } catch (e) {
        // Secours si loadMainMenu n'est pas encore charge
        try {
            testextjs.app.getController('App').onLoadNewComponent(xtypeload, "", "");
        } catch (e2) {
        }
    }
}

// Deconnexion depuis le bouton rond du header (avec confirmation)
function prestigeHeaderLogout() {
    Ext.Msg.show({
        title: 'Déconnexion',
        msg: '<div class="prestige-confirm-content">'
                + '<span class="prestige-confirm-icon"><i class="fa fa-power-off"></i></span>'
                + '<span><strong>Se déconnecter ?</strong><br>'
                + '</div>',
        buttons: Ext.Msg.YESNO,
        buttonText: {
            yes: '<i class="fa fa-sign-out"></i> OUI',
            no: '<i class="fa fa-times"></i> ANNULER'
        },

        icon: Ext.Msg.QUESTION,
        cls: 'prestige-confirm-win',
        fn: function (btn) {
            if (btn === 'yes' && typeof Me_header !== 'undefined' && Me_header) {
                Me_header.Deconnexion();
            }
        }
    });
}


// Renseigne nom + role dans la carte utilisateur du header.
// Retente quelques fois si le DOM n'est pas encore rendu (Ajax plus rapide que le rendu).
function prestigeSetHeaderUser(name, role, attempt) {
    var nameEl = document.getElementById('hdr-user-name');
    var roleEl = document.getElementById('hdr-user-role');
    if (!nameEl) {
        if ((attempt || 0) < 10) {
            setTimeout(function () {
                prestigeSetHeaderUser(name, role, (attempt || 0) + 1);
            }, 400);
        }
        return;
    }
    nameEl.textContent = name || 'Utilisateur';
    if (roleEl && role) {
        roleEl.textContent = role;
    }
}

// Horloge du header : "jeu. 12 juin 2026 - 14:35:09"
function prestigeHeaderClock() {
    var el = document.getElementById('hdr-clock-text');
    if (!el) {
        return;
    }
    var now = new Date();
    var dateStr;
    try {
        dateStr = now.toLocaleDateString('fr-FR', {weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'});
    } catch (e) {
        dateStr = now.toLocaleDateString();
    }
    function pad(n) {
        return n < 10 ? '0' + n : '' + n;
    }
    var timeStr = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
    el.innerHTML = dateStr + ' <b>' + timeStr + '</b>';
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

    // Charge tous les providers ; appelle done(totalGlobal) a la fin.
    // full=false (badge 60s) : si un provider expose countUrl, seul son
    // compteur leger est appele ; full=true (ouverture du panneau) : les
    // listes completes sont chargees pour l'affichage.
    function loadAll(done, full) {
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
            var useCount = !full && p.countUrl;
            Ext.Ajax.request({
                url: useCount ? p.countUrl
                        : p.url + (p.url.indexOf('?') >= 0 ? '&' : '?') + 'start=0&limit=' + limit,
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
        // Battement de la cloche tant qu'il y a des notifications
        var bell = Ext.query('.hdr-bell')[0];
        if (bell) {
            if (total > 0) {
                Ext.fly(bell).addCls('has-notif');
            } else {
                Ext.fly(bell).removeCls('has-notif');
            }
        }
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
    // Toggle : si le panneau est deja affiche, un nouveau clic sur la cloche le ferme
    var existing = Ext.getCmp('notif-center-win');
    if (existing) {
        existing.close();
        return;
    }
    // full=true : le panneau a besoin des listes completes
    PrestigeNotif.loadAll(function (total) {
        PrestigeNotif.updateBadge(total);
        buildNotificationWindow();
    }, true);
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
            rows += '<div class="notif-item pn-row" '
                    + 'onclick="prestigeNotifItemClick(\'' + p.key + '\',' + i + ')">'
                    + line + '</div>';
        }

        // Titre cliquable + bouton toggle (replie par defaut)
        sections += '<div class="pn-section">'
                // En-tete : titre (cliquable) + toggle (+ / -)
                + '<div class="pn-head">'
                +   '<span class="pn-label" '
                +         'onclick="prestigeNotifCategoryClick(\'' + p.key + '\')">'
                +     '<i class="fa ' + (p.icon || 'fa-bell') + '" style="color:' + (p.color || '#5dade2') + '; margin-right:8px;"></i>'
                +     p.label + ' (' + total + ')'
                +   '</span>'
                +   '<span class="pn-toggle" onclick="prestigeNotifToggle(this)">'
                +     '+'
                +   '</span>'
                + '</div>'
                // Corps replie par defaut
                + '<div class="pn-body" style="display:none;">' + rows + '</div>'
                + '</div>';
    });

    if (sections === '') {
        sections = '<div class="pn-empty">Aucune notification.</div>';
    }

    var html = '<div id="pn-scroll">' + sections + '</div>';

    Ext.create('Ext.window.Window', {
        id: 'notif-center-win',
        cls: 'prestige-notif-win',
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

// Categorie RESERVE : suggestions restant a traiter.
//
// La cloche annonçait des PRODUITS a reassortir, c'est-a-dire un calcul refait a chaque
// passage. Elle annonce desormais des SUGGESTIONS en attente : un chiffre y correspond a un
// dossier a ouvrir, et non plus a une estimation qui pouvait deja avoir ete traitee.
PrestigeNotif.register({
    key: 'reserve',
    label: 'Suggestions de reserve a traiter',
    icon: 'fa-exchange',
    color: '#48c9b0',
    url: '../api/v1/suggestion-reserve/en-attente',
    // Badge (rafraichissement periodique) : compteur ultra-leger. La liste
    // complete ci-dessus n'est chargee qu'a l'ouverture du panneau.
    countUrl: '../api/v1/suggestion-reserve/en-attente/count',
    limit: 50,
    renderItem: function (n) {
        var sens = (n.str_CATEGORIE === 'RESERVE')
                ? 'Envoi en reserve' : 'Envoi en rayon';
        var statut = (n.str_STATUT === 'EN_COURS') ? 'En cours' : 'A traiter';
        return '<div style="font-weight:bold; color:#eaf4fc;">'
                + '<i class="fa fa-exclamation-circle" style="color:#e74c3c; margin-right:6px;"></i>'
                + (n.str_REF || '') + '</div>'
                + '<div style="font-size:12px; color:#85c1e9; margin-top:3px;">' + sens
                + ' &nbsp;|&nbsp; <b>' + (n.nb_produits || 0) + '</b> produit(s)'
                + ' &nbsp;|&nbsp; ' + statut
                + ' &nbsp;|&nbsp; ' + (n.dt_CREATED || '') + '</div>';
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
    color: '#ff6b6b',
    url: '../api/v1/fichearticle/perimes?nbreMois=6&codeFamile=&codeRayon=&codeGrossiste=&query=&dtStart=&dtEnd=',
    // Badge (toutes les 60 s) : compteur ultra-leger (1 requete COUNT). La liste complete
    // ci-dessus (3 requetes valorisees) n'est chargee qu'a l'ouverture du panneau.
    countUrl: '../api/v1/fichearticle/perimes/count?nbreMois=6&codeFamile=&codeRayon=&codeGrossiste=&query=&dtStart=&dtEnd=',
    limit: 50,
    renderItem: function (p) {
        return '<div style="font-weight:bold; color:#eaf4fc;">'
                + '<i class="fa fa-clock-o" style="color:#ff6b6b; margin-right:6px;"></i>'
                + (p.libelle || '') + '</div>'
                + '<div style="font-size:12px; color:#85c1e9; margin-top:3px;">'
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

// Periode glissante d'un mois : dtEnd = aujourd'hui, dtStart = aujourd'hui - 1 mois + 1 jour
function prestigeAvoirPeriode() {
    var end = new Date();
    var start = new Date();
    start.setMonth(start.getMonth() - 1);
    start.setDate(start.getDate() + 1);
    return {
        dtStart: Ext.Date.format(start, 'Y-m-d'),
        dtEnd: Ext.Date.format(end, 'Y-m-d')
    };
}

// Categorie AVOIRS : ventes ayant un avoir en cours (non cloture)
(function () {
    /*
     * INTERRUPTEUR (prepare, inactif) — passer a true pour basculer sur les
     * endpoints "avoirs ouverts" SANS periode :
     *  - badge 60s : ../ventestats/avoirs-ouverts/count (compteur ultra-leger)
     *  - ouverture du panneau : ../ventestats/avoirs-ouverts (liste complete)
     * Avantages : plus de fenetre d'un mois qui masque les vieux avoirs
     * ouverts, et plus de requete lourde toutes les 60 s.
     */
    var AVOIRS_SANS_PERIODE = false;

    var p = prestigeAvoirPeriode();
    PrestigeNotif.register({
        key: 'avoirs',
        label: 'Ventes en avoir',
        icon: 'fa-reply-all',
        color: '#e67e22',
        url: AVOIRS_SANS_PERIODE
                ? '../api/v1/ventestats/avoirs-ouverts'
                : '../api/v1/ventestats?onlyAvoir=true&sansBon=false&typeVenteId=&avoirStatut=EN_COURS'
                + '&dtStart=' + p.dtStart + '&dtEnd=' + p.dtEnd,
        countUrl: AVOIRS_SANS_PERIODE ? '../api/v1/ventestats/avoirs-ouverts/count' : null,
        limit: 50,
        renderItem: function (v) {
            // Produits uniquement en avoir, avec leur quantite en avoir
            var produits = '';
            if (v.items && v.items.length) {
                for (var i = 0; i < v.items.length; i++) {
                    var it = v.items[i];
                    produits += '<div style="font-size:12px; color:#cfe8fb; margin-left:18px;">- '
                            + (it.intCIP || '') + ' ' + (it.ticketName || it.strNAME || '')
                            + ' <b>(' + (it.intAVOIR || 0) + ')</b></div>';
                }
            }
            return '<div style="font-weight:bold; color:#eaf4fc;">'
                    + '<i class="fa fa-reply-all" style="color:#e67e22; margin-right:6px;"></i>'
                    + (v.strREF || '') + ' &nbsp;|&nbsp; ' + (v.clientFullName || 'Client comptant') + '</div>'
                    + '<div style="font-size:12px; color:#85c1e9; margin-top:3px;">'
                    + (v.strTYPEVENTE || '') + ' &nbsp;|&nbsp; Montant : <b>' + (v.intPRICE || 0) + '</b>'
                    + ' &nbsp;|&nbsp; ' + (v.dtUPDATED || '') + ' ' + (v.heure || '') + '</div>'
                    + produits;
        },
        onItemClick: function () {
            try {
                // Ouvre le menu des avoirs sur l'onglet "en cours", periode glissante, recherche auto
                var per = prestigeAvoirPeriode();
                window.PRESTIGE_AVOIR_PARAMS = {
                    dtStart: per.dtStart,
                    dtEnd: per.dtEnd,
                    activeTab: 'EN_COURS'
                };
                testextjs.app.getController('App').onLoadNewComponent("venteavoirmanager", "Liste des avoirs", "");
            } catch (e) {
            }
        }
    });
})();