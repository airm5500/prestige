/* global Ext */

var valheight = screen.height;
var valwidth = screen.width;
var xtypeload = localStorage.getItem("xtypeuser");

if (valheight >= 900) {
    valheight = 595;
} else if (valheight < 900 && valheight >= 768) {
    valheight = 580;
}
if (valwidth >= 1600) {
    valwidth = 1300;
} else if (valwidth < 1600 && valwidth >= 1366) {
    valwidth = 1050;
}

/* Badge icône unique par module (fond pastel + icône FA colorée) */
var PRESTIGE_ICON_MAP = [
    { keys: ['facturation client'],                         icon: 'fa-file-invoice-dollar',         bg: '#ede9fe', fg: '#7c3aed' },
    { keys: ['tiers-payant', 'tiers payant', 'tiers-pay'], icon: 'fa-handshake',                   bg: '#cffafe', fg: '#0891b2' },
    { keys: ['menu pharmacien', 'pharmacien'],              icon: 'fa-prescription-bottle-medical', bg: '#f0fdf4', fg: '#16a34a' },
    { keys: ['commande', 'approvision'],                    icon: 'fa-clipboard-list',              bg: '#f3e8ff', fg: '#9333ea' },
    { keys: ['gestion du stock', 'stock'],                  icon: 'fa-boxes-stacked',               bg: '#e0f2fe', fg: '#0284c7' },
    { keys: ['fichier'],                                    icon: 'fa-folder-open',                 bg: '#fef3c7', fg: '#b45309' },
    { keys: ['rétrocession', 'retrocession'],               icon: 'fa-right-left',                  bg: '#ecfdf5', fg: '#059669' },
    { keys: ['analyse de gestion', 'analyse'],              icon: 'fa-chart-line',                  bg: '#fef9c3', fg: '#ca8a04' },
    { keys: ['notification', 'sms', 'alerte'],              icon: 'fa-bell',                        bg: '#fff1f2', fg: '#e11d48' },
    { keys: ['gestion des utilisateurs', 'utilisateur'],    icon: 'fa-users-gear',                  bg: '#f1f5f9', fg: '#475569' },
    { keys: ['configuration', 'config', 'param'],           icon: 'fa-sliders',                     bg: '#f8fafc', fg: '#64748b' },
    { keys: ['facturation'],                                icon: 'fa-receipt',                     bg: '#f5f3ff', fg: '#6d28d9' },
    { keys: ['vente'],                                      icon: 'fa-cart-shopping',               bg: '#fef3c7', fg: '#d97706' },
    { keys: ['caisse', 'encaiss'],                          icon: 'fa-cash-register',               bg: '#dcfce7', fg: '#16a34a' },
    { keys: ['paiement', 'règlement'],                      icon: 'fa-credit-card',                 bg: '#d1fae5', fg: '#059669' },
    { keys: ['client'],                                     icon: 'fa-users',                       bg: '#dbeafe', fg: '#2563eb' },
    { keys: ['fournisseur', 'grossiste'],                   icon: 'fa-building',                    bg: '#fce7f3', fg: '#be185d' },
    { keys: ['article', 'produit'],                         icon: 'fa-pills',                       bg: '#f0fdf4', fg: '#15803d' },
    { keys: ['rapport', 'statistique', 'bilan'],            icon: 'fa-chart-bar',                   bg: '#fff7ed', fg: '#ea580c' },
    { keys: ['livraison', 'expédition'],                    icon: 'fa-truck',                       bg: '#fff7ed', fg: '#c2410c' },
    { keys: ['retour', 'avoir'],                            icon: 'fa-rotate-left',                 bg: '#fdf4ff', fg: '#c026d3' },
    { keys: ['tarif', 'prix', 'promotion'],                 icon: 'fa-tags',                        bg: '#fefce8', fg: '#eab308' },
    { keys: ['agenda', 'rdv', 'calendrier'],                icon: 'fa-calendar-days',               bg: '#ecfdf5', fg: '#10b981' },
    { keys: ['dashboard', 'tableau de bord', 'accueil'],    icon: 'fa-gauge-high',                  bg: '#eff6ff', fg: '#3b82f6' },
    { keys: ['devis'],                                      icon: 'fa-file-pen',                    bg: '#f5f3ff', fg: '#8b5cf6' },
    { keys: ['achat'],                                      icon: 'fa-bag-shopping',                bg: '#fdf4ff', fg: '#a21caf' },
    { keys: ['message'],                                    icon: 'fa-envelope',                    bg: '#eff6ff', fg: '#3b82f6' }
];

Ext.define('testextjs.view.Navigation', {
    extend: 'Ext.tree.Panel',
    xtype: 'navigation',
    cls: 'prestige-nav',
    rootVisible: false,
    useArrows: false,
    frame: true,
    title: 'Prestige Navigation Menu',
    width: 350,
    height: 300,

    _flyoutMenu:    null,
    _flyoutRecord:  null,

    /* Annuler la fermeture native du panel flottant (slideOutTask) */
    _holdPanel: function () {
        if (this.slideOutTask) { this.slideOutTask.cancel(); }
    },

    /* Réarmer la fermeture native du panel flottant */
    _releasePanel: function (delay) {
        if (this.slideOutTask) { this.slideOutTask.delay(delay || 500); }
    },

    initComponent: function () {
        var me = this;

        Ext.apply(me, {
            store: new Ext.data.TreeStore({
                proxy: {
                    type: 'ajax',
                    url: '../webservices/menumanagement/ws_tree_menu.jsp'
                }
            }),
            dockedItems: [{
                xtype: 'container',
                dock: 'top',
                id: 'nav-profile-container',
                html: me._buildProfileHeader()
            }]
        });

        me.callParent();

        me.listeners = {
            /* Clic sur un menu parent : toggle du flyout */
            itemclick: function (view, record, item) {
                if (!record.isLeaf() && record.childNodes && record.childNodes.length > 0) {
                    /* Même menu cliqué une 2ème fois → fermer */
                    if (me._flyoutRecord === record && me._flyoutMenu) {
                        me._flyoutMenu.destroy();
                        me._flyoutMenu   = null;
                        me._flyoutRecord = null;
                    } else {
                        me._showFlyout(record, item);
                    }
                    return false;
                }
                if (record.isLeaf()) { me.callItemMenu(view, record); }
            },
            itemdblclick: function () { return false; },
            beforeitemexpand: function () { return false; },
            afterrender: function () {
                me._loadRealUser();
                me.getStore().on('load', function () {
                    Ext.defer(function () { me._applyIcons(); }, 300);
                });
                me.getView().on('refresh', function () {
                    Ext.defer(function () { me._applyIcons(); }, 50);
                });
                /* Quand le panel flottant se referme (slideOut natif), détruire le flyout */
                if (typeof me.slideOutFloatedPanel === 'function') {
                    var origSlideOut = me.slideOutFloatedPanel;
                    me.slideOutFloatedPanel = function () {
                        if (me._flyoutMenu) { me._flyoutMenu.destroy(); me._flyoutMenu = null; }
                        return origSlideOut.apply(me, arguments);
                    };
                }
            },
            show: function () {
                Ext.defer(function () { me._applyIcons(); }, 200);
            },
            expand: function () {
                Ext.defer(function () { me._applyIcons(); }, 350);
            },
            itemexpand: function () {
                Ext.defer(function () { me._applyIcons(); }, 200);
            },
            beforecollapse: function () {
                if (me._flyoutMenu && !me._flyoutMenu.hidden) {
                    return false;
                }
            },
            /* Empêcher le fixage (expand) du panel — toujours en mode flottant */
            beforeexpand: function () { return false; },
            /* Empêcher le dépliage vertical des nœuds par double-clic */
            beforeitemexpand: function () { return false; },
            collapse: function () {},
        };
    },

    /* ---- Flyout ---- */

    _showFlyout: function (record, rowEl) {
        var me = this;
        if (me._flyoutMenu) { me._flyoutMenu.destroy(); me._flyoutMenu = null; }
        me._flyoutRecord = record;

        var children = record.childNodes;
        if (!children || children.length === 0) return;

        /* Construction des items du flyout */
        var items = [];

        /* En-tête titre */
        items.push({
            xtype: 'component',
            html: '<div class="pft-title">' + Ext.String.htmlEncode(record.get('text')) + '</div>',
            cls: 'pft-header-wrap'
        });
        items.push({ xtype: 'menuseparator' });

        Ext.Array.each(children, function (child) {
            var childId   = child.data.id;
            var childText = child.data.text;
            /* Flèche standard pour tous les sous-menus */
            var iconHtml  = '<span style="display:inline-flex;align-items:center;justify-content:center;'
                  + 'width:22px;height:22px;flex-shrink:0;margin-right:8px;vertical-align:middle">'
                  + '<i class="fa-solid fa-angle-right" style="color:#85c1e9;font-size:12px"></i>'
                  + '</span>';
            items.push({
                text:        iconHtml + '<span style="vertical-align:middle">' + Ext.String.htmlEncode(childText) + '</span>',
                cls:         'pft-item',
                handler: function () {
                    if (me._flyoutMenu) { me._flyoutMenu.hide(); }
                    if (typeof childId !== 'undefined') {
                        testextjs.app.getController('App').onLoadNewComponent(childId, childText, '');
                    }
                }
            });
        });

        me._flyoutMenu = Ext.create('Ext.menu.Menu', {
            cls:            'prestige-flyout-menu',
            plain:          true,
            floating:       true,
            focusOnToFront: false,
            items:          items,
            listeners: {
                afterrender: function (menu) {
                    /* Maintenir le panel ouvert tant que la souris est sur le flyout */
                    menu.getEl().on('mouseenter', function () { me._holdPanel(); });
                    menu.getEl().on('mouseleave', function () { me._releasePanel(500); });
                },
                hide: function () {
                    me._flyoutMenu   = null;
                    me._flyoutRecord = null;
                }
            }
        });

        /* Position : à droite du panel, aligné sur la ligne cliquée */
        var navBox = me.getEl().getBox();
        var rowBox = Ext.get(rowEl).getBox();
        me._flyoutMenu.showAt([navBox.x + navBox.width + 1, rowBox.y]);
    },

    /* ---- Profil utilisateur ---- */

    _buildProfileHeader: function () {
        return '<div class="nav-profile-header">'
             + '<span class="nav-profile-avatar" id="nav-avatar-wrap" '
             + 'style="display:flex;align-items:center;justify-content:center">'
             + '<i class="fa-solid fa-user"></i></span>'
             + '<div class="nav-profile-info">'
             + '<div class="nav-profile-name" id="nav-user-name">...</div>'
             + '<div class="nav-profile-role" id="nav-user-role">Profil</div>'
             + '</div>'
             + '<span class="nav-profile-status" title="En ligne"></span>'
             + '</div>';
    },

    _loadRealUser: function () {
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/user/account',
            success: function (response) {
                try {
                    var data = Ext.JSON.decode(response.responseText, true);
                    if (!data) return;
                    var info      = data.accountInfo || data;
                    var firstName = info.str_FIRST_NAME || info.firstName || '';
                    var lastName  = info.str_LAST_NAME  || info.lastName  || '';
                    var login     = info.str_LOGIN || info.login || '';
                    var role      = info.str_ROLE  || info.role  || '';
                    var fullName  = (firstName + ' ' + lastName).trim() || login || 'Utilisateur';

                    var nameEl = document.getElementById('nav-user-name');
                    var roleEl = document.getElementById('nav-user-role');
                    if (nameEl) nameEl.textContent = fullName;
                    if (roleEl && role) roleEl.textContent = role;

                    var pic = localStorage.getItem('str_PIC') || '';
                    if (pic && pic !== 'null' && pic.length > 5) {
                        var wrap = document.getElementById('nav-avatar-wrap');
                        if (wrap) {
                            wrap.innerHTML = '<img src="' + pic
                                + '" style="width:100%;height:100%;object-fit:cover;border-radius:8px"'
                                + ' onerror="this.parentNode.innerHTML=\'<i class=&quot;fa-solid fa-user&quot;></i>\'" />';
                        }
                    }
                } catch (e) {}
            },
            failure: function () {}
        });
    },

    /* ---- Icônes colorées ---- */

    _matchIcon: function (text) {
        var lower  = (text || '').toLowerCase();
        var result = null;
        var sorted = PRESTIGE_ICON_MAP.slice().sort(function (a, b) {
            return b.keys[0].length - a.keys[0].length;
        });
        Ext.Array.each(sorted, function (entry) {
            if (result) return;
            Ext.Array.each(entry.keys, function (k) {
                if (lower.indexOf(k) !== -1) { result = entry; return false; }
            });
        });
        return result;
    },

    _applyIcons: function () {
        var me = this;
        if (!me.getEl()) return;
        var nodes = Ext.query('.x-tree-node-text', me.getEl().dom);
        Ext.Array.each(nodes, function (node) {
            if (node.getAttribute('data-fa-done')) return;
            var rawText = node.textContent || node.innerText || '';
            if (!rawText.trim()) return;

            var entry = me._matchIcon(rawText);
            var badge = entry
                ? '<span style="display:inline-flex;align-items:center;justify-content:center;'
                  + 'width:26px;height:26px;border-radius:7px;flex-shrink:0;'
                  + 'background:' + entry.bg + ';margin-right:10px;vertical-align:middle">'
                  + '<i class="fa-solid ' + entry.icon + '" style="color:' + entry.fg + ';font-size:13px"></i>'
                  + '</span>'
                : '<span style="display:inline-flex;align-items:center;justify-content:center;'
                  + 'width:26px;height:26px;border-radius:7px;flex-shrink:0;'
                  + 'background:rgba(107,127,163,0.12);margin-right:10px;vertical-align:middle">'
                  + '<i class="fa-solid fa-circle-dot" style="color:#6b7fa3;font-size:11px"></i>'
                  + '</span>';

            node.innerHTML = badge + '<span style="vertical-align:middle">'
                           + Ext.String.htmlEncode(rawText) + '</span>';
            node.setAttribute('data-fa-done', '1');
        });
    },

    /* ---- Comportement original inchangé ---- */

    callItemMenu: function (parent, component) {
        if (typeof component.data.id !== 'undefined') {
            testextjs.app.getController('App').onLoadNewComponent(
                component.data.id, component.data.text, '');
        }
    },

    onCheckedNodesClick: function () {
        var records = this.getView().getChecked(), names = [];
        Ext.Array.each(records, function (rec) { names.push(rec.get('text')); });
        Ext.MessageBox.show({
            title: 'Selected Nodes',
            msg: names.join('<br />'),
            icon: Ext.MessageBox.INFO
        });
    }
});
