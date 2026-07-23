




/* global Ext */

var Oview;
var Omode;
var Me;
var ref;
var IDCMT = "";
var CLIENTFULNAME = "";
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.configmanagement.client.action.venteClient', {
    extend: 'Ext.window.Window',
    xtype: 'venteClient',
    id: 'venteClientID',
    maximizable: true,
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'testextjs.model.VenteClient',
        'testextjs.view.configmanagement.client.action.detailsVenteClient'
        
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''

    },
    initComponent: function () {


        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;
        CLIENTFULNAME = this.getTitre();
        IDCMT = this.getOdatasource().lg_COMPTE_CLIENT_ID;
        var itemsPerPage = 20;

        var ventestore = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.VenteClient',
            groupField: 'REFVENTE',
            pageSize: 10,
            proxy: {
                type: 'ajax',
                // REST : memes cles et meme reponse {total, data} que la JSP historique ws_vente.jsp
                url: '../api/v1/client/gestion/ventes',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }
        });
        ventestore.on({
            'load': {
                fn: function (store, records, success, eOpts) {
                    Ext.each(records, function (record, index, records) {
                        if (index > 0) {

                            return;

                        }
                        Ext.getCmp('TOTALVENTE').setValue(record.get('TOTALVENTE'));
                        Ext.getCmp('TOTALCLIENT').setValue(record.get('TOTALCLIENT'));
                        Ext.getCmp('TOTALTP').setValue(record.get('TOTALTTP'));


                    }

                    , this);

                },
                scope: this
            }
        });

        ventestore.load({
            params: {
                lg_COMPTE_CLIENT_ID: this.getOdatasource().lg_COMPTE_CLIENT_ID

            }

        });
        var tierspayant = new Ext.data.Store({
            model: 'testextjs.model.CompteClientTierspayant',
            proxy: {
                type: 'ajax',
                // REST : memes cles et meme reponse {total, data} que la JSP historique ws_clientTierspayant.jsp
                url: '../api/v1/client/gestion/tiers-payants-liste?lg_COMPTE_CLIENT_ID=' + this.getOdatasource().lg_COMPTE_CLIENT_ID,
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });





        var form = new Ext.form.Panel({
            bodyPadding: 15,
            autoScroll: true,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 150,
                layout: {
                    type: 'vbox',
                    align: 'stretch',
                    padding: 10
                },
                defaults: {
                    flex: 1
                },
                msgTarget: 'side'
            },
            items: [
                {
                    xtype: 'fieldset',
                    collapsible: true,
                    layout: 'hbox',
                    title: 'Filtre',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'displayfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    xtype: 'datefield',
                                    format: 'd/m/Y',
                                    emptyText: 'Date debut',
                                    submitFormat: 'Y-m-d',
                                    fieldLabel: 'Du',
                                    labelWidth: 20,
                                    // flex: 0.7,
                                    id: 'dt_start_vente',
                                    listeners: {
                                        change: function () {
                                            Ext.getCmp('dt_end_vente').setMinValue(this.getValue());
                                        }
                                    }

                                }, {
                                    xtype: 'tbseparator'
                                },
                                {
                                    xtype: 'datefield',
                                    format: 'd/m/Y',
                                    emptyText: 'Date fin',
                                    submitFormat: 'Y-m-d',
                                    fieldLabel: 'Au',
                                    labelWidth: 20,
                                    // flex: 0.7,
                                    id: 'dt_end_vente',
                                    listeners: {
                                        change: function () {
                                            Ext.getCmp('dt_start_vente').setMaxValue(this.getValue());
                                        }
                                    }

                                }, {
                                    xtype: 'tbseparator'
                                }

                                ,
                                {

                                    xtype: 'textfield',
                                    id: 'rechercheVente',
                                    emptyText: 'Recherche',
                                    style: 'margin-left:5px;',
                                    enableKeyEvents: true,
                                    listeners: {
                                        specialKey: function (field, e, options) {
                                            if (e.getKey() === e.ENTER) {
                                                var grid = Ext.getCmp('venteClientgridID');
                                                var dt_start_vente = Ext.getCmp('dt_start_vente').getSubmitValue();
                                                var dt_end_vente = Ext.getCmp('dt_end_vente').getSubmitValue();
                                                var lgTp = Ext.getCmp('tierpayantClient').getValue();

                                                grid.getStore().load({
                                                    params: {
                                                        dt_end_vente: dt_end_vente,
                                                        dt_start_vente: dt_start_vente,
                                                        search_value: field.getValue(),
                                                        tierpayantClient: lgTp,
                                                        lg_COMPTE_CLIENT_ID: IDCMT
                                                    }
                                                });
                                            }
                                        }
                                    }

                                }
                                , {
                                    xtype: 'tbseparator'
                                },

                                {
                                    xtype: 'combobox',
                                    id: 'tierpayantClient',
                                    store: tierspayant,
                                    style: 'margin-left:5px;',
                                    width: 300,

                                    valueField: 'lg_TIERS_PAYANT_ID',
                                    displayField: 'str_TIERS_PAYANT_NAME',

                                    editable: false,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un tiers-payant ...',
                                    listeners: {
                                        select: function (cmp) {

                                        }
                                    }
                                }
                                , {
                                    xtype: 'tbseparator'
                                },
                                {

                                    // width: 100,
                                    xtype: 'button',
                                    style: 'margin-left:5px;',
                                    iconCls: 'ventesearch',
                                    text: 'Rechercher',
                                    listeners: {
                                        click: function () {
                                            var grid = Ext.getCmp('venteClientgridID');

                                            var dt_start_vente = Ext.getCmp('dt_start_vente').getSubmitValue();
                                            var dt_end_vente = Ext.getCmp('dt_end_vente').getSubmitValue();
                                            var lgTp = Ext.getCmp('tierpayantClient').getValue();
                                            var field = Ext.getCmp('rechercheVente').getValue();

                                            grid.getStore().load({
                                                params: {
                                                    dt_end_vente: dt_end_vente,
                                                    dt_start_vente: dt_start_vente,
                                                    search_value: field,
                                                    tierpayantClient: lgTp,
                                                    lg_COMPTE_CLIENT_ID: IDCMT
                                                }
                                            });
                                        }
                                    }


                                },
                                {

                                    // width: 100,
                                    xtype: 'button',
                                    style: 'margin-left:5px;',
                                    iconCls: 'ventesearch',
                                    text: 'Imprimer',
                                    listeners: {
                                        click: function () {


                                            var dt_start_vente = Ext.getCmp('dt_start_vente').getSubmitValue();
                                            var dt_end_vente = Ext.getCmp('dt_end_vente').getSubmitValue();
                                            var lgTp = Ext.getCmp('tierpayantClient').getValue();
                                            var field = Ext.getCmp('rechercheVente').getValue();

                                            if (lgTp === null) {
                                                lgTp = '';
                                            }
                                            var linkUrl = "../webservices/configmanagement/client/ws_clientvente_pdf.jsp" + "?lg_COMPTE_CLIENT_ID=" + IDCMT + "&dt_end_vente=" + dt_end_vente + "&dt_start_vente=" + dt_start_vente + "&search_value=" + field + "&tierpayantClient=" + lgTp + "&client=" + CLIENTFULNAME;
                                            window.open(linkUrl);

                                        }
                                    }


                                }

                            ]
                        }


                    ]
                },
                {
                    xtype: 'fieldset',
                    collapsible: true,
                    layout: 'hbox',
                    title: 'Les donne&eacute;s du client',
                    defaultType: 'panel',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            xtype: 'panel',
                            title: 'Les donne&eacute;s du client',
                            width: '100%',
                            margin: '0 5 0 0',
                            border: false,
                            items: [
                                {
                                    xtype: 'grid',
                                    features: [
                                        {
                                            ftype: 'grouping',
                                            collapsible: true,
                                            groupHeaderTpl: "   REF-VENTE:<span style='color:blue;font-weight:800;marging-left:15px;'> {[values.rows[0].data.REFVENTE]}</span>   DATE :<span style='color:blue;font-weight:800;marging-left:15px;'> {[values.rows[0].data.DATEVENTE]} </span>  MONTANT : <span style='color:blue;font-weight:800;marging-left:15px;'>{[values.rows[0].data.MONTANTVENTE]}</span> ",
                                            hideGroupedHeader: true

                                        }],
                                    id: 'venteClientgridID',
                                    store: ventestore,
                                    columns: [{
                                            header: 'REF-VENTE',
                                            dataIndex: 'REFVENTE',
                                            flex: 1

                                        },
                                        {
                                            header: 'REF-BON',
                                            dataIndex: 'REFBON',
                                            flex: 1

                                        },

                                        /*{
                                         header: 'DATE',
                                         dataIndex: 'DATEVENTE',
                                         flex: 0.6
                                         },
                                         {
                                         header: 'MONTANT.VENTE',
                                         dataIndex: 'MONTANTVENTE',
                                         renderer: amountformat,
                                         align: 'right',
                                         flex: 1
                                         },*/
                                        {
                                            header: 'MONTANT.CLIENT',
                                            dataIndex: 'MONTANTCLIENT',
                                            renderer: amountformat,
                                            align: 'right',
                                            flex: 1
                                        },

                                        {
                                            header: 'MONTANT.TP',
                                            dataIndex: 'MONTANTTP',
                                            renderer: amountformat,
                                            align: 'right',
                                            flex: 1
                                        },

                                        {
                                            header: 'TAUX',
                                            dataIndex: 'POURCENTAGE',
                                            renderer: amountformat,
                                            align: 'right',
                                            flex: 0.5
                                        },
                                        {
                                            header: 'FACTURE',
                                            dataIndex: 'REFFACTURE',

                                            flex: 0.5
                                        },
                                        {
                                            header: 'Tiers-payant',
                                            dataIndex: 'TIERSPAYANT',

                                            flex: 1
                                        },
                                        {
                                            xtype: 'actioncolumn',
                                            width: 30,
                                            sortable: false,
                                            menuDisabled: false,
                                            groupable:false,
                                            items: [{
                                                    iconCls: 'cartclient',
                                                    tooltip: 'Detail Vente',
                                                    scope: this,
                                                    handler: function (grid, rowIndex) {
                                                        var rec = grid.getStore().getAt(rowIndex);
                                                          console.log('rec',rec);
                                                        new testextjs.view.configmanagement.client.action.detailsVenteClient({
                                                            odatasource: rec.data,
                                                            parentview: this,
                                                            titre: "Detail de la vente : [" + rec.get('REFVENTE') + "]"
                                                        });
                                                    }
                                                }]
                                        }




                                    ],
                                    bbar: {
                                        xtype: 'pagingtoolbar',
                                        store: ventestore, // same store GridPanel is using
                                        dock: 'bottom',
                                        displayInfo: true,
                                        listeners: {
                                            beforechange: function (page, currentPage) {
                                                var myProxy = this.store.getProxy();
                                                myProxy.params = {

                                                    dt_start_vente: '',
                                                    dt_end_vente: '',
                                                    search_value: '',
                                                    tierpayantClient: '',
                                                    lg_COMPTE_CLIENT_ID: ''
                                                };



                                                var search_value = Ext.getCmp('rechercheVente').getValue();


                                                myProxy.setExtraParam('dt_start_vente', Ext.getCmp('dt_start_vente').getSubmitValue());
                                                myProxy.setExtraParam('dt_end_vente', Ext.getCmp('dt_end_vente').getSubmitValue());
                                                myProxy.setExtraParam('search_value', search_value);
                                                myProxy.setExtraParam('tierpayantClient', Ext.getCmp('tierpayantClient').getValue());
                                                myProxy.setExtraParam('lg_COMPTE_CLIENT_ID', IDCMT);
                                            }

                                        },

                                        items: [
                                            {
                                                xtype: 'displayfield',
                                                fieldLabel: 'TOTAL-VENTE',
                                                labelWidth: 115,
                                                id: 'TOTALVENTE',
                                                fieldStyle: "color:blue;font-weight:800;",
                                                margin: '0 10 0 10',
                                                renderer: function (value) {
                                                    return Ext.util.Format.number(value, '0,000') + " F";
                                                }
                                            },
                                            {
                                                xtype: 'displayfield',
                                                fieldLabel: 'TOTAL-CLIENT',
                                                labelWidth: 100,
                                                id: 'TOTALCLIENT',
                                                fieldStyle: "color:blue;font-weight:800;",
                                                margin: '0 10 0 10',
                                                renderer: function (value) {
                                                    return Ext.util.Format.number(value, '0,000') + " F";
                                                }
                                            },
                                            {
                                                xtype: 'displayfield',
                                                fieldLabel: 'TOTAL-TP',
                                                labelWidth: 100,
                                                id: 'TOTALTP',
                                                fieldStyle: "color:blue;font-weight:800;",
                                                margin: '0 10 0 10',
                                                renderer: function (value) {
                                                    return Ext.util.Format.number(value, '0,000') + " F";
                                                }
                                            }


                                        ]
                                    }
                                }


                            ]
                        }



                    ]



                }



            ]


        });















        var win = new Ext.window.Window({
            autoShow: true, title: this.getTitre(),
            width: '90%',
            height: 600,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            maximizable: true,
            items: form,
            buttons: [{
                    text: 'Fermer',
                    handler: function () {
                        win.close();
                    }
                }],
            listeners: {// controle sur le button fermé en haut de fenetre
                beforeclose: function () {
                    // Ext.getCmp('rechecher').focus();
                }
            }
        });

    }



});