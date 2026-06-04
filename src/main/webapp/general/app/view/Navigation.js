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
    /* header doit rester actif pour que le bouton collapse/expand du border layout fonctionne */
    title: ' ',
    width: 260,
    minWidth: 180,
    autoScroll: true,

    /* Menu flyout actif */
    _flyoutMenu: null,

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
            afterrender: function () {
                me._refreshProfile();
                Ext.defer(function () { me._applyFontAwesomeIcons(); }, 500);
            },
            /* Clic sur un item */
            itemclick: function (view, record, item, index, e) {
                if (record.isLeaf()) {
                    /* Sous-menu : charger le composant */
                    me.callItemMenu(view, record);
                } else {
                    /* Menu parent : ouvrir le flyout */
                    me._showFlyout(record, item);
                    /* Empêcher l'expansion inline */
                    return false;
                }
            },
            /* Masquer le flyout si on sort du panel */
            el: {
                mouseleave: function () {
                    me._scheduleFlyoutHide();
                },
                mouseenter: function () {
                    me._cancelFlyoutHide();
                }
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

    /* Construit et affiche le menu flyout à droite du nœud parent cliqué */
    _showFlyout: function (record, itemEl) {
        var me = this;
        me._cancelFlyoutHide();

        /* Détruire le menu précédent */
        if (me._flyoutMenu) {
            me._flyoutMenu.destroy();
            me._flyoutMenu = null;
        }

        var children = record.childNodes;
        if (!children || children.length === 0) return;

        var menuItems = [];
        Ext.Array.each(children, function (child) {
            menuItems.push({
                text: child.get('text'),
                cls: 'prestige-flyout-item',
                handler: function () {
                    me.callItemMenu(null, child);
                }
            });
        });

        /* Ajoute un titre de section en haut */
        menuItems.unshift({
            xtype: 'component',
            cls: 'prestige-flyout-title',
            html: '<div class="pft-header">'
                + '<i class="fa-solid fa-folder-open"></i> '
                + Ext.String.htmlEncode(record.get('text'))
                + '</div>'
        }, '-');

        me._flyoutMenu = Ext.create('Ext.menu.Menu', {
            cls: 'prestige-flyout-menu',
            plain: true,
            items: menuItems,
            listeners: {
                mouseleave: function () { me._scheduleFlyoutHide(); },
                mouseenter: function () { me._cancelFlyoutHide(); },
                hide: function () {
                    me._flyoutMenu = null;
                }
            }
        });

        /* Positionner à droite du nœud, aligné en haut */
        var navEl  = me.getEl();
        var navBox = navEl.getBox();
        var itemBox = Ext.get(itemEl).getBox();

        me._flyoutMenu.showAt([navBox.x + navBox.width + 2, itemBox.y]);
    },

    _flyoutHideTimer: null,

    _scheduleFlyoutHide: function () {
        var me = this;
        me._flyoutHideTimer = Ext.defer(function () {
            if (me._flyoutMenu) {
                me._flyoutMenu.hide();
            }
        }, 350);
    },

    _cancelFlyoutHide: function () {
        if (this._flyoutHideTimer) {
            clearTimeout(this._flyoutHideTimer);
            this._flyoutHideTimer = null;
        }
    },

    _applyFontAwesomeIcons: function () {
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
            if (node.getAttribute('data-fa-done')) return;

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
        var me = this;
        if (component && typeof component.data !== 'undefined' && typeof component.data.id !== 'undefined') {
            testextjs.app.getController('App').onLoadNewComponent(component.data.id, component.data.text, '');
        } else if (component && typeof component.get === 'function') {
            testextjs.app.getController('App').onLoadNewComponent(component.get('id'), component.get('text'), '');
        }
        if (me._flyoutMenu) {
            me._flyoutMenu.hide();
        }
    }
});
