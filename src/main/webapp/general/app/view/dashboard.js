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
    // Ajuste la hauteur a la zone exacte du cadre parent (content-panel) pour ne pas
    // declencher le scroll parasite du conteneur : seul l'iframe defile.
    fitToContainer: function () {
        var ct = this.ownerCt;
        if (this.rendered && ct && ct.body) {
            this.setHeight(ct.body.getViewSize().height);
        }
    },
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
                        Ext.defer(function () {
                            component.getEl().dom.src = url_order_component;
                        }, 250);
                    }
                }
            }],
                this.callParent();
        var me = this;
        me.on('afterrender', me.fitToContainer, me, {delay: 50});
        Ext.EventManager.onWindowResize(me.fitToContainer, me, {buffer: 100});
        me.on('destroy', function () {
            Ext.EventManager.removeResizeListener(me.fitToContainer, me);
        });
    }

});
