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

Ext.define('testextjs.view.Navigation', {
    extend: 'Ext.tree.Panel',
    xtype: 'navigation',
    cls: 'prestige-nav',
    rootVisible: false,
    useArrows: true,
    frame: false,
    border: false,
    header: false,
    width: 260,
    minWidth: 180,
    autoScroll: true,

    initComponent: function () {
        var me = this;

        Ext.apply(me, {
            store: new Ext.data.TreeStore({
                proxy: {
                    type: 'ajax',
                    url: '../webservices/menumanagement/ws_tree_menu.jsp'
                }
            }),
            dockedItems: [
                {
                    xtype: 'container',
                    dock: 'top',
                    id: 'nav-profile-container',
                    html: me._buildProfileHeader()
                },
                {
                    xtype: 'container',
                    dock: 'top',
                    padding: '8 10 4 10',
                    html: '<input type="text" class="nav-search-input" id="nav-search-field" placeholder="&#xf002;  Rechercher..." oninput="prestige_navFilter(this.value)" />'
                }
            ]
        });

        me.callParent();

        me.listeners = {
            itemclick: function (s, r) {
                me.callItemMenu(s, r);
            },
            afterrender: function () {
                me._refreshProfile();
                Ext.defer(function () { me._applyFontAwesomeIcons(); }, 400);
            },
            itemadd: function () {
                Ext.defer(function () { me._applyFontAwesomeIcons(); }, 200);
            },
            itemexpand: function () {
                Ext.defer(function () { me._applyFontAwesomeIcons(); }, 150);
            },
            load: function () {
                Ext.defer(function () { me._applyFontAwesomeIcons(); }, 300);
            }
        };
    },

    _buildProfileHeader: function () {
        var userName  = localStorage.getItem('str_USERNAME')  || localStorage.getItem('str_PRENOM') || 'Utilisateur';
        var userRole  = localStorage.getItem('str_ROLE')      || 'Profil';
        var userPic   = localStorage.getItem('str_PIC')       || '';
        var avatarHtml;

        if (userPic && userPic !== 'null' && userPic.length > 5) {
            avatarHtml = '<img src="' + userPic + '" class="nav-profile-avatar" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\'" />'
                       + '<span class="nav-profile-avatar" style="display:none"><i class="fa-solid fa-user"></i></span>';
        } else {
            avatarHtml = '<span class="nav-profile-avatar" style="display:flex;align-items:center;justify-content:center"><i class="fa-solid fa-user"></i></span>';
        }

        return '<div class="nav-profile-header">'
             +   avatarHtml
             +   '<div class="nav-profile-info">'
             +     '<div class="nav-profile-name" id="nav-user-name">' + Ext.String.htmlEncode(userName) + '</div>'
             +     '<div class="nav-profile-role" id="nav-user-role">' + Ext.String.htmlEncode(userRole) + '</div>'
             +   '</div>'
             +   '<span class="nav-profile-status" title="En ligne"></span>'
             + '</div>';
    },

    _refreshProfile: function () {
        var userName = localStorage.getItem('str_USERNAME') || localStorage.getItem('str_PRENOM') || '';
        var userRole = localStorage.getItem('str_ROLE') || '';
        if (userName) {
            var nameEl = document.getElementById('nav-user-name');
            var roleEl = document.getElementById('nav-user-role');
            if (nameEl) nameEl.textContent = userName;
            if (roleEl) roleEl.textContent = userRole;
        }
    },

    /* Injecte une icône FA en tête de chaque texte selon des mots-clés */
    _applyFontAwesomeIcons: function () {
        var iconMap = [
            { keys: ['vente', 'ventes', 'sale'],          icon: 'fa-cart-shopping',    color: '#f59e0b' },
            { keys: ['stock', 'inventaire', 'article'],   icon: 'fa-boxes-stacked',    color: '#10b981' },
            { keys: ['caisse', 'paiement', 'encaiss'],    icon: 'fa-cash-register',    color: '#22c55e' },
            { keys: ['commande', 'achat', 'approvision'], icon: 'fa-clipboard-list',   color: '#8b5cf6' },
            { keys: ['client', 'clientèle', 'tiers'],     icon: 'fa-users',            color: '#3b82f6' },
            { keys: ['fournisseur', 'grossiste'],          icon: 'fa-building',         color: '#06b6d4' },
            { keys: ['rapport', 'statistique', 'stat',
                      'bilan', 'analyse'],                 icon: 'fa-chart-bar',        color: '#f43f5e' },
            { keys: ['paramètre', 'config', 'réglage',
                      'setting', 'administration'],        icon: 'fa-sliders',          color: '#94a3b8' },
            { keys: ['utilisateur', 'user', 'personnel',
                      'employé', 'rh'],                    icon: 'fa-user-tie',         color: '#a78bfa' },
            { keys: ['livraison', 'expédition', 'trans'], icon: 'fa-truck',            color: '#fb923c' },
            { keys: ['facturation', 'facture', 'invoice'],icon: 'fa-file-invoice',     color: '#facc15' },
            { keys: ['dashboard', 'tableau de bord'],     icon: 'fa-gauge-high',       color: '#38bdf8' },
            { keys: ['retour', 'avoir'],                   icon: 'fa-rotate-left',      color: '#e879f9' },
            { keys: ['sms', 'message', 'notification'],   icon: 'fa-bell',             color: '#fb7185' },
            { keys: ['tarif', 'prix', 'promotion'],       icon: 'fa-tags',             color: '#fbbf24' },
            { keys: ['agenda', 'rdv', 'calendrier'],      icon: 'fa-calendar-days',    color: '#4ade80' }
        ];

        var nodes = Ext.query('.x-tree-node-text', this.getEl().dom);
        Ext.Array.each(nodes, function (node) {
            var text = node.textContent.toLowerCase();
            if (node.getAttribute('data-fa-done')) return;

            var matched = false;
            Ext.Array.each(iconMap, function (entry) {
                if (matched) return;
                Ext.Array.each(entry.keys, function (k) {
                    if (text.indexOf(k) !== -1) {
                        node.innerHTML = '<i class="fa-solid ' + entry.icon + '" style="color:' + entry.color + ';width:18px;margin-right:7px;font-size:13px;vertical-align:middle"></i>'
                                       + '<span>' + node.textContent + '</span>';
                        node.setAttribute('data-fa-done', '1');
                        matched = true;
                        return false;
                    }
                });
            });

            if (!matched) {
                node.innerHTML = '<i class="fa-solid fa-circle-dot" style="color:#475569;width:18px;margin-right:7px;font-size:11px;vertical-align:middle"></i>'
                               + '<span>' + node.textContent + '</span>';
                node.setAttribute('data-fa-done', '1');
            }
        });
    },

    callItemMenu: function (parent, component) {
        if (typeof component.data.id !== 'undefined') {
            testextjs.app.getController('App').onLoadNewComponent(component.data.id, component.data.text, '');
        }
        /* Réapplique les icônes après expansion */
        var me = this;
        Ext.defer(function () { me._applyFontAwesomeIcons(); }, 200);
    }
});

/* Filtre le menu selon la saisie dans la barre de recherche */
function prestige_navFilter(val) {
    var navCmp = Ext.ComponentQuery.query('navigation')[0];
    if (!navCmp) return;
    var store = navCmp.getStore();
    if (!val || val.trim() === '') {
        store.clearFilter();
    } else {
        var lv = val.toLowerCase();
        store.filterBy(function (rec) {
            return rec.get('text').toLowerCase().indexOf(lv) !== -1;
        });
    }
    Ext.defer(function () { navCmp._applyFontAwesomeIcons(); }, 150);
}
