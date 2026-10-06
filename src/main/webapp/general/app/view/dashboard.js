Ext.define('testextjs.view.dashboard', {
    extend: 'Ext.panel.Panel',
    xtype: 'dashboard',
    id: 'dashboard-panel',
//    cls: 'custompanel',
    cls: 'panelcontainer',
    requires: [
        'Ext.ux.IFrame',
        'testextjs.view.tableaubord.TableauBord'
    ],
    layout: 'fit',
    autoScroll: false,
    width: '99%',
    // height: valheight,
    height: Ext.getBody().getViewSize().height,
//    autoHeight: true,

    //bodyBorder: 'false',
    border: false,
    /*
     * Plan d'octobre (section 8, lot L8) : le parametre KEY_TABLEAU_BORD_VERSION choisit le tableau de bord.
     * NOUVEAU : composant ExtJS sans iframe (testextjs.view.tableaubord.TableauBord) ; ANCIEN : dashboard.html dans son
     * iframe, exactement comme avant (meme element, meme demarrage differe). Si la version ne peut pas etre lue, c'est
     * l'ancien qui s'affiche.
     */
    initComponent: function () {
        var me = this;
        me.items = [];
        me.callParent();
        me.on('afterrender', function () {
            Ext.Ajax.request({
                url: '../api/v1/tableau-bord/version', method: 'GET', timeout: 15000,
                success: function (r) {
                    var o = Ext.decode(r.responseText, true);
                    me.afficher(o && o.success && o.version === 'NOUVEAU' ? 'NOUVEAU' : 'ANCIEN');
                },
                failure: function () {
                    me.afficher('ANCIEN');
                }
            });
        }, me, {single: true});
    },

    afficher: function (version) {
        if (this.isDestroyed || this.items.getCount()) {
            return;
        }
        var me = this;
        me.versionTableauBord = version;
        me.add(version === 'NOUVEAU' ? {xtype: 'tableaubord'} : me.elementAncien());
        if (version === 'NOUVEAU') {
            /* Le panneau prend la hauteur de la fenetre alors qu'il commence sous l'en-tete : le bas sortait de
               l'ecran. Pour le nouveau tableau de bord seulement, il prend la place reellement disponible. */
            var ajuster = function () {
                if (!me.isDestroyed && me.rendered) {
                    me.setHeight(Math.max(400, Ext.getBody().getViewSize().height - me.getEl().getTop() - 6));
                }
            };
            ajuster();
            Ext.EventManager.onWindowResize(ajuster);
            me.on('destroy', function () {
                Ext.EventManager.removeResizeListener(ajuster);
            });
        }
    },

    /** L'ancien tableau de bord : l'iframe et son demarrage differe, inchanges. */
    elementAncien: function () {
        const url_order_component = "dashboard.html";
        return {
                xtype: "component",
                autoScroll: false,
                autoEl: {
                    tag: "iframe",
                    src: "about:blank",
                    loading: "lazy"
                },
                listeners: {
                    afterrender: function (component) {
                        /*
                         * Priorite au menu de navigation : le dashboard tire ~9 requetes
                         * qui saturent les connexions du navigateur et le pool JDBC, ce
                         * qui laissait le volet navigation vide tant qu'elles n'etaient
                         * pas terminees. On ne demarre donc l'iframe qu'apres le premier
                         * chargement de l'arbre des menus, avec un garde-fou de 5 s pour
                         * ne jamais bloquer le dashboard si le menu ne repond pas.
                         */
                        var lancerDashboard = function () {
                            if (component._dashboardLance || component.isDestroyed || !component.getEl()) {
                                return;
                            }
                            component._dashboardLance = true;
                            component.getEl().dom.src = url_order_component;
                        };
                        var nav = Ext.ComponentQuery.query('navigation')[0];
                        var storeMenu = nav && nav.getStore ? nav.getStore() : null;
                        if (storeMenu && storeMenu._menuCharge) {
                            /* Menu deja disponible (retour sur le dashboard) */
                            Ext.defer(lancerDashboard, 100);
                        } else if (storeMenu) {
                            storeMenu.on('load', function () {
                                Ext.defer(lancerDashboard, 100);
                            }, null, {single: true});
                            Ext.defer(lancerDashboard, 5000);
                        } else {
                            /* Volet navigation absent : comportement historique */
                            Ext.defer(lancerDashboard, 250);
                        }
                    }
                }
            };
    }

});
