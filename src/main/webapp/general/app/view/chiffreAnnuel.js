

/* global Ext, panel */

Ext.define('testextjs.view.chiffreAnnuel', {
    extend: 'Ext.panel.Panel',
    xtype: 'caannuel',
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
                    src: 'chiffesaffaire.html'
                }
            }],
                this.callParent();

    }
});

