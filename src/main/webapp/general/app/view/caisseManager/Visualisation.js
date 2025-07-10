/* global Ext */

Ext.define('testextjs.view.caisseManager.Visualisation', {
    extend: 'Ext.panel.Panel',
    xtype: 'visualisercaissemanager',
    requires: [
        'testextjs.view.caisseManager.VisualisationGrid',
        'testextjs.model.caisse.Reglement',
        'testextjs.model.caisse.User',
        'testextjs.model.caisse.Caisse',
        'Ext.grid.plugin.RowExpander'

    ],
    frame: true,
    title: 'Visualisation de la caisse',
    width: '97%',
    height: Ext.getBody().getViewSize().height * 0.85,
    minHeight: 550,
    cls: 'custompanel',
    layout: {
        type: 'fit'

    },
    initComponent: function () {

        var store_typereglement = new Ext.data.Store({
            model: 'testextjs.model.caisse.Reglement',
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/reglement',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });

        var storeUser = new Ext.data.Store({
            model: 'testextjs.model.caisse.User',
            pageSize: 10,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/users',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        var me = this;
        Ext.applyIf(me, {
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'startDate',
                            margin: '0 10 0 0',
                            submitFormat: 'Y-m-d',
                            flex: 1,
                            labelWidth: 20,
                            maxValue: new Date(),
                            value: new Date(),
                            format: 'd/m/Y'
                                    /* listeners: {
                                     'change': function (me) {
                                     Ext.getCmp('dt_Date_Fin').setMinValue(me.getValue());
                                     }
                                     }*/
                        }, {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'endDate',
                            labelWidth: 20,
                            flex: 1,
                            maxValue: new Date(),
                            value: new Date(),
                            margin: '0 9 0 0',
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y'
                        }, '-', {
                            xtype: 'timefield',
                            fieldLabel: 'De',
                            itemId: 'startH',
                            emptyText: 'Heure debut(HH:mm)',
                            flex: 1,
                            labelWidth: 20,
                            increment: 30,
                            value: '00:00',
                            submitFormat: 'H:i',
                            format: 'H:i'
                        }, {
                            xtype: 'timefield',
                            fieldLabel: 'A',
                            itemId: 'endH',
                            emptyText: 'Heure fin(HH:mm)',
                            labelWidth: 10,
                            increment: 30,
                            value: '23:59',
                            flex: 1,
                            format: 'H:i',
                            submitFormat: 'H:i'
                        }, '-', {
                            xtype: 'combobox',
                            fieldLabel: 'Type.Reglement',
                            itemId: 'reglement',
                            store: store_typereglement,
                            flex: 2,
                            valueField: 'lgTYPEREGLEMENTID',
                            displayField: 'strNAME',
                            typeAhead: false,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Selectionner un type de reglement...'

                        }, '-', {
                            xtype: 'combobox',
                            fieldLabel: 'Utilisateur',
                            itemId: 'user',
                            store: storeUser,
                            pageSize: 10,
                            valueField: 'lgUSERID',
                            displayField: 'fullName',
                            typeAhead: false,
                            flex: 2,
                            minChars: 2,
                            labelWidth: 60,
                            queryMode: 'remote',
                            emptyText: 'Choisir un utilisateur...'

                        }, {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        }/*
                         , {
                         text: 'imprimer',
                         itemId: 'imprimer',
                         tooltip: 'imprimer',
                         scope: this,
                         hidden: true
                         //                            handler: this.onPdfClick
                         }*/
                    ]
                }
            ],
            items: [{
                    xtype: 'visualisationGrid',
                    plugins: [{
                            ptype: 'rowexpander',
                            rowBodyTpl: new Ext.XTemplate(
                                    '<p>{items}</p>'
                                    )
                        }
                    ]
                }]

        });
        me.callParent(arguments);
    }
});


