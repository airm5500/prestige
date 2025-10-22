Ext.define('testextjs.view.modereglement.ModeReglementView', {
    extend: 'Ext.panel.Panel',
    xtype: 'modereglementview',
    id: 'modereglementview',
    width: '97%',
    height: 'auto',
    frame: true,
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'fit'

    },
    requires: [
        'Ext.grid.feature.Grouping',
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'testextjs.view.modereglement.ModeReglementGrid'
    ],

    title: 'Gestion des modes de règlement',

    initComponent: function () {




        const me = this;
        Ext.applyIf(me, {

            items: [{
                    xtype: 'modereglementgrid'

                }]

        });
        me.callParent(arguments);
    }








    /* items: [
     {
     xtype: 'modereglementgrid'
     }
     ]*/
});



