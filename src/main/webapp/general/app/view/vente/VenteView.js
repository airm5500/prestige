/* global Ext */

Ext.define('testextjs.view.vente.VenteView', {
    extend: 'Ext.panel.Panel',
    xtype: 'doventemanager',
    requires: [
        'testextjs.view.vente.VenteVNO'
    ],
    config: {
        data: null
    },
    frame: true,
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'vbox',
        align: 'stretch',
        padding: 10
    },
    initComponent: function () {
        var natureventeStore = new Ext.data.Store({
            model: 'testextjs.model.caisse.Nature',
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/natures',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        var typeventeStore = new Ext.data.Store({
            model: 'testextjs.model.caisse.TypeVente',
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/typeventes',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        var storeUser = new Ext.data.Store({
            model: 'testextjs.model.caisse.User',
            pageSize: 100,
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
        var data = me.getData();
        if (data.isEdit) {
            var record = data.record;
        } else {
            me.title = 'VENTE AU COMPTANT';
        }
        Ext.applyIf(me, {

            items: [
                {
                    xtype: 'fieldset',
                    title: '<span style="color:blue;">CHOISIR LE TYPE /LA NATURE DE VENTE ET LE VENDEUR</span>',
                    collapsible: false,
                    defaultType: 'textfield',
                    cls: 'background_gray',
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },

                    items: [
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            margin: '0 0 5 0',
                            height: 35,
                            style: 'padding-bottom:3px;',
                            defaultType: 'textfield',
                            items: [
                                {
                                    xtype: 'combobox',
                                    itemId: 'typeVente',
                                    store: typeventeStore,
                                    editable:false,
                                    flex: 2,
                                    margin: '0 15 0 0',
                                    height: 30,
                                    valueField: 'lgTYPEVENTEID',
                                    displayField: 'strNAME',
                                    typeAhead: false,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un type de vente...'

                                },

                                {
                                    xtype: 'combobox',
                                    itemId: 'nature',
                                    store: natureventeStore,
                                    editable:false,
                                    flex: 2,
                                    height: 30,
                                    margin: '0 15 0 0',
                                    valueField: 'lgNATUREVENTEID',
                                    displayField: 'strLIBELLE',
                                    typeAhead: false,
                                    queryMode: 'remote',
                                    emptyText: 'Selectionner la nature ...'

                                },
                                {
                                    xtype: 'combobox',
                                    itemId: 'user',
                                    store: storeUser,
                                    pageSize: null,
                                    valueField: 'lgUSERID',
                                    displayField: 'fullName',
                                    typeAhead: false,
                                    flex: 2,
                                    height: 30,
                                    minChars: 2,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un vendeur...'

                                }

                            ]
                        }
                    ]
                },

                {
                    xtype: 'container',
                    layout: 'anchor',
                    itemId: 'contenu'

                }

            ]

        });
        me.callParent(arguments);
    }
});


