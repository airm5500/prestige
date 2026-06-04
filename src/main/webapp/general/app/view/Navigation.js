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
                Ext.defer(function () { me._applyFontAwesomeIcons(); }, 500);
            },
            itemexpand: function () {
                Ext.defer(function () { me._applyFontAwesomeIcons(); }, 150);
            },
            load: function () {
                Ext.defer(function () { me._applyFontAwesomeIcons(); }, 400);
            }
        };
    },

    _buildProfileHeader: function () {
        var userName = localStorage.getItem('str_USERNAME') || localStorage.getItem('str_PRENOM') || 'Utilisateur';
        var userRole = localStorage.getItem('str_ROLE') || 'Profil';
        var userPic  = localStorage.getItem('str_PIC') || '';
        var avatarHtml;

        if (userPic && userPic !== 'null' && userPic.length > 5) {
            avatarHtml = '<img src="' + userPic + '" class="nav-profile-avatar" '
                       + 'onerror="this.style.display=\'none\';document.getElementById(\'nav-avatar-fallback\').style.display=\'flex\'" />'
                       + '<span id="nav-avatar-fallback" class="nav-profile-avatar" style="display:none">'
                       + '<i class="fa-solid fa-user"></i></span>';
        } else {
            avatarHtml = '<span class="nav-profile-avatar" style="display:flex;align-items:center;justify-content:center">'
                       + '<i class="fa-solid fa-user"></i></span>';
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
        var nameEl = document.getElementById('nav-user-name');
        var roleEl = document.getElementById('nav-user-role');
        if (nameEl && userName) nameEl.textContent = userName;
        if (roleEl && userRole) roleEl.textContent = userRole;
    },

    _applyFontAwesomeIcons: function () {
        /* Toutes les icônes en blanc semi-transparent sur fond bleu */
        var iconColor = 'rgba(255,255,255,0.9)';
        var iconMap = [
            { keys: ['vente', 'ventes', 'sale'],           icon: 'fa-cart-shopping'  },
            { keys: ['stock', 'inventaire', 'article'],    icon: 'fa-boxes-stacked'  },
            { keys: ['caisse', 'paiement', 'encaiss'],     icon: 'fa-cash-register'  },
            { keys: ['commande', 'achat', 'approvision'],  icon: 'fa-clipboard-list' },
            { keys: ['client', 'clientèle', 'tiers'],      icon: 'fa-users'          },
            { keys: ['fournisseur', 'grossiste'],           icon: 'fa-building'       },
            { keys: ['rapport', 'statistique', 'stat',
                      'bilan', 'analyse'],                  icon: 'fa-chart-bar'      },
            { keys: ['paramètre', 'config', 'réglage',
                      'setting', 'administration'],         icon: 'fa-sliders'        },
            { keys: ['utilisateur', 'user', 'personnel',
                      'employé', 'rh'],                     icon: 'fa-user-tie'       },
            { keys: ['livraison', 'expédition', 'trans'],  icon: 'fa-truck'          },
            { keys: ['facturation', 'facture', 'invoice'], icon: 'fa-file-invoice'   },
            { keys: ['dashboard', 'tableau de bord'],      icon: 'fa-gauge-high'     },
            { keys: ['retour', 'avoir'],                    icon: 'fa-rotate-left'    },
            { keys: ['sms', 'message', 'notification'],    icon: 'fa-bell'           },
            { keys: ['tarif', 'prix', 'promotion'],        icon: 'fa-tags'           },
            { keys: ['agenda', 'rdv', 'calendrier'],       icon: 'fa-calendar-days'  }
        ];

        var nodes = Ext.query('.x-tree-node-text', this.getEl().dom);
        Ext.Array.each(nodes, function (node) {
            /* Ne pas retraiter un nœud déjà modifié */
            if (node.getAttribute('data-fa-done')) return;

            /* Lire le texte brut AVANT toute modification */
            var rawText = node.textContent || node.innerText || '';
            var lowerText = rawText.toLowerCase();

            var matched = false;
            Ext.Array.each(iconMap, function (entry) {
                if (matched) return;
                Ext.Array.each(entry.keys, function (k) {
                    if (lowerText.indexOf(k) !== -1) {
                        node.innerHTML = '<i class="fa-solid ' + entry.icon
                            + '" style="color:' + iconColor
                            + ';width:20px;margin-right:8px;font-size:14px;vertical-align:middle;opacity:0.9"></i>'
                            + Ext.String.htmlEncode(rawText);
                        node.setAttribute('data-fa-done', '1');
                        matched = true;
                        return false;
                    }
                });
            });

            if (!matched) {
                node.innerHTML = '<i class="fa-solid fa-chevron-right"'
                    + ' style="color:rgba(255,255,255,0.4);width:20px;margin-right:8px;font-size:10px;vertical-align:middle"></i>'
                    + Ext.String.htmlEncode(rawText);
                node.setAttribute('data-fa-done', '1');
            }
        });
    },

    callItemMenu: function (parent, component) {
        if (typeof component.data.id !== 'undefined') {
            testextjs.app.getController('App').onLoadNewComponent(component.data.id, component.data.text, '');
        }
        var me = this;
        Ext.defer(function () { me._applyFontAwesomeIcons(); }, 200);
    }
});
