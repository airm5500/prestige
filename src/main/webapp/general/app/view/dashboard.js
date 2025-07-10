

/* global Ext, panel */

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
                    src: url_order_component
                }
            }],
                this.callParent();

    }

});

