/* global Ext */

Ext.define('testextjs.view.Report.facturefournisseurs.FactureFournisseurManager', {
    extend: 'Ext.panel.Panel',
    xtype: 'facturefournisseurmanager', // retours du 10/10 : portait le nom de l'ecran des ruptures (conflit)
    id: 'FactureFournisseurID',
    requires: [
        'testextjs.view.Report.facturefournisseurs.FacturesGrid',
        'testextjs.store.Statistics.Grossistes'

    ],
    frame: true,
    title: 'Statistiques sur les ruptures de stock',
    width: '99.5%',
    height: 570,
    minHeight: 570,
    maxHeight: 800,
    cls: 'custompanel',
//    autoScroll: true,
    layout: 'fit',
    items: [{
            xtype: 'facture-grid'

        }

    ], dockedItems: [{
            xtype: 'toolbar',
            dock: 'top',
            items: [
                {
                    xtype: 'textfield',
                    id: 'rechfacture',
                    width: 150,
                    emptyText: 'Recherche',
                    listeners: {
                        specialKey: function (field, e, Familletion) {
                            if (e.getKey() === e.ENTER) {
                                var grid = Ext.getCmp('FacturesGrid');
                                var lg_GROSSISTE_ID = Ext.getCmp('combogrossiste').getValue();
                                var dt_start_vente = Ext.getCmp('dt_start_facture').getSubmitValue();
                                var dt_end_vente = Ext.getCmp('dt_end_facture').getSubmitValue();

                                grid.getStore().load({
                                    params: {
                                        dt_start_vente: dt_start_vente,
                                        dt_end_vente: dt_end_vente,
                                        search_value: field.getValue(),
                                        lg_GROSSISTE_ID: lg_GROSSISTE_ID
                                    }
                                });
                            }

                        }
                    }
                }, {
                    xtype: 'tbseparator'
                },
                {
                    xtype: 'datefield',
                    format: 'd/m/Y',
                    emptyText: 'Date debut',
                    submitFormat: 'Y-m-d',
                    fieldLabel: 'Du',
                    labelWidth: 20,
                    flex: 0.7,
                    id: 'dt_start_facture',
                    listeners: {
                        change: function () {
                            Ext.getCmp('dt_end_facture').setMinValue(this.getValue());
                        }
                    }

                }, {
                    xtype: 'tbseparator'
                }

                ,
                {
                    xtype: 'datefield',
                    format: 'd/m/Y',
                    emptyText: 'Date debut',
                    submitFormat: 'Y-m-d',
                    fieldLabel: 'Au',
                    labelWidth: 20,
                    flex: 0.7,
                    id: 'dt_end_facture',
                    listeners: {
                        change: function () {

                            Ext.getCmp('dt_start_facture').setMaxValue(this.getValue());
                        }
                    }

                }

                , {
                    xtype: 'tbseparator'
                },
                {
                    xtype: 'combobox',
                    id: 'combogrossiste',
                    flex: 3,
                    store: 'Grossistes',
                    pageSize: 10,
                    valueField: 'lg_GROSSISTE_ID',
                    displayField: 'str_LIBELLE',
                    minChars: 2,
                    queryMode: 'remote',
                    enableKeyEvents: true,
                    emptyText: 'Choisir un repartiteur...',
                    listConfig: {
                        loadingText: 'Recherche...',
                        emptyText: 'Pas de donn&eacute;es trouv&eacute;es.',
                        getInnerTpl: function () {
                            return '<span>{str_LIBELLE}</span>';
                        }

                    },
                    listeners: {
                        keypress: function (field, e) {

                            if (e.getKey() === e.BACKSPACE || e.getKey() === 46) {

                                if (field.getValue().length <= 2) {
                                    field.getStore().load();
                                }

                            }

                        },
                        select: function () {
                            var grid = Ext.getCmp('FacturesGrid');
                            var rechfacture = Ext.getCmp('rechfacture').getValue();
                            var dt_start_vente = Ext.getCmp('dt_start_facture').getSubmitValue();
                            var dt_end_vente = Ext.getCmp('dt_end_facture').getSubmitValue();

                            grid.getStore().load({
                                params: {
                                    dt_start_vente: dt_start_vente,
                                    dt_end_vente: dt_end_vente,
                                    search_value: rechfacture,
                                    lg_GROSSISTE_ID: this.getValue()
                                }
                            });
                        },
                        change: function () {

                            //  if(this.getValue())
                        }
                    }
                },
                {
                    xtype: 'tbseparator'
                },
                {
                    // flex: 0.4,
                    width: 100,
                    xtype: 'button',
                    iconCls: 'searchicon',
                    text: 'Rechercher',
                    listeners: {
                        click: function () {
                            var grid = Ext.getCmp('factureGrid');
                            var dt_start_vente = Ext.getCmp('dt_start_facture').getSubmitValue();
                            var dt_end_vente = Ext.getCmp('dt_end_facture').getSubmitValue();
                            var search_value = Ext.getCmp('rechfacture').getValue();
                             var combogrossiste=Ext.getCmp('combogrossiste').getValue();
                            grid.getStore().load({
                                params: {
                                    dt_start_vente: dt_start_vente,
                                    dt_end_vente: dt_end_vente,
                                    search_value: search_value,
                                    lg_GROSSISTE_ID: combogrossiste
                                }
                            });
                        }
                    }


                }

                ,
                {
                    xtype: 'tbseparator'
                }
                ,
                {
                    width: 100,
                    xtype: 'button',
                    text: 'Imprimer',
                    iconCls: 'printable',
//                    glyph: 0xf1c1,
                    listeners: {
                        click: function () {

                            var dt_start_vente = Ext.getCmp('dt_start_rupture').getSubmitValue();
                            var dt_end_vente = Ext.getCmp('dt_end_rupture').getSubmitValue();
                            var search_value = Ext.getCmp('rechrupture').getValue();
                            var lg_GROSSISTE_ID=Ext.getCmp('combogrossiste').getValue();
                            if(lg_GROSSISTE_ID!==null && lg_GROSSISTE_ID!==""){
                            var linkUrl = "../webservices/Report/facturefournisseurs/ws_facturefournisseurs_pdf.jsp" + "?dt_start_vente=" + dt_start_vente + "&dt_end_vente=" + dt_end_vente + "&search_value=" + search_value+"&lg_GROSSISTE_ID="+lg_GROSSISTE_ID;
                            window.open(linkUrl);
                        }

                        }
                    }


                }


            ]
        }

    ]

});


