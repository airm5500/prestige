

/* global Ext, panel */

Ext.define('testextjs.view.achat', {
    extend: 'Ext.panel.Panel',
    xtype: 'achatannuel',
    requires: [
        'Ext.ux.IFrame'
    ],
    layout: 'fit',
    autoScroll: false,
    width: '95%',
    height: Ext.Element.getViewportHeight(),
    border: false,
    initComponent: function () {
        this.items = [{
                xtype: "component",
                autoScroll: false,
                border: false,
                autoEl: {
                    tag: "iframe",
                    src: 'achats.html'
                }
            }],
                this.callParent();

    }
});

