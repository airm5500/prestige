Ext.define('testextjs.view.dashboard', {
    extend: 'Ext.panel.Panel',
    xtype: 'dashboard',
    id: 'dashboard-panel',
//    cls: 'custompanel',
    cls: 'panelcontainer',
    requires: [
        'Ext.ux.IFrame'
    ],
    layout: 'fit',
    autoScroll: false,
    width: '99%',
    // height: valheight,
    height: Ext.getBody().getViewSize().height,
//    autoHeight: true,

    //bodyBorder: 'false',
    border: false,
    initComponent: function () {
        const url_order_component = "dashboard.html";
        this.items = [{
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
            }],
                this.callParent();

    }

});
