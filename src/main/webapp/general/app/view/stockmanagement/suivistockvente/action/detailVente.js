var url_services_data_mouvement_vente = '../webservices/stockmanagement/suivistockvente/ws_data_mouvement_vente.jsp';

var Oview;
var Omode;
var Me;
var ref;
var valdatedebutDetail;
var valdatefinDetail;
var OgridpanelID;


Ext.define('testextjs.view.stockmanagement.suivistockvente.action.detailVente', {
    extend: 'Ext.window.Window',
    xtype: 'addfamilledetailvente',
    id: 'addfamilledetailventeID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut',
        'Ext.selection.CellModel',
        'Ext.grid.*'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        datedebut: '',
        datedin: ''
    },
//    frame: true,
     collapsible: true,
     closable: true,
    initComponent: function () {

        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;

        var itemsPerPage = 20;

        ref = this.getOdatasource();
        valdatedebutDetail = this.getDatedebut();
        valdatefinDetail = this.getDatedin();


        var store = new Ext.data.Store({
            model: 'testextjs.model.FamilleStock',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_mouvement_vente + "?lg_FAMILLE_ID=" + ref + "&datedebut="+valdatedebutDetail+"&datefin="+valdatefinDetail,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        var form = new Ext.form.Panel({
            bodyPadding: 15,
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
            items: [{
                    xtype: 'fieldset',
                    title: 'Infos sur les ventes',
                    collapsible: true,
//                    hidden: true,
                    id: 'vente',
                    defaultType: 'textfield',
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            columnWidth: 0.65,
                            xtype: 'gridpanel',
                            id: 'gridpanelID',
                            margin: '0 0 5 0',
//                            plugins: [this.cellEditing],
                            store: store,
                            height: 350,
                            columns: [{
                                    header: 'Date',
                                    dataIndex: 'dt_DAY',
                                    flex: 1
                                },{
                                    header: 'Heure',
                                    dataIndex: 'dt_UPDATED',
                                    flex: 1
                                }, {
                                    header: 'Qte.Vendu',
                                    dataIndex: 'int_NUMBER_VENTE',
                                    align: 'center',
                                    flex: 0.7
                                },{
                                    header: 'Co&ucirc;t',
                                    dataIndex: 'int_NUMBER_RETOUR',
                                    renderer: amountformat,
                                    align: 'right',
                                    flex: 0.7
                                }, {
                                    header: 'Operateur',
                                    dataIndex: 'lg_USER_ID',
                                    flex: 1
                                }, 
                                {
                                    header: 'Type.vente',
                                    dataIndex: 'str_CODE_TAUX_REMBOURSEMENT',
                                    flex: 1
                                }, 
                                {
                                    header: 'Stock',
                                    dataIndex: 'int_STOCK_REAPROVISONEMENT',
                                    hidden: true,
                                    flex: 1
                                }
//                                {
//                                    text: 'D&eacute;tail',
//                                    columns: [
//                                        {
//                                            text: 'Quantit&eacute;s servies',
//                                            dataIndex: 'int_NUMBER_VENTE',
//                                            flex: 1
//                                        },
//                                        {
//                                            text: 'Co&ucirc;t',
//                                            dataIndex: 'int_NUMBER_RETOUR',
//                                            flex: 1
//                                        }
//                                    ]
//                                }
                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: 10,
                                store: store,
                                displayInfo: true
//                                plugins: new Ext.ux.ProgressBarPager()
                            },
                            listeners: {
                                scope: this
//                                selectionchange: this.onSelectionChange
                            }
                        }]
                }
            ]


        });


        OgridpanelID = Ext.getCmp('gridpanelID');


        var win = new Ext.window.Window({
            autoShow: true, title: this.getTitre(),
            width: 900,
            height: 450,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form
//            ,
//            buttons: [{
//                    text: 'Fermer',
//                    handler: function () {
//                        win.close();
//                    }
//                }]
        });

    },
//    plugins: [{
//            ptype: 'rowexpander',
//            rowBodyTpl: new Ext.XTemplate(
////                    '<p> {str_NAME}</p>',
//                    '<p>bonjour</p>',
//                    {
//                        formatChange: function (v) {
//                            var color = v >= 0 ? 'green' : 'red';
//                            return '<span style="color: ' + color + ';">' + Ext.util.Format.usMoney(v) + '</span>';
//                        }
//                    })
//        }],
    onSelectionChange: function (model, records) {
        var rec = records[0];
        if (rec) {
            this.getForm().loadRecord(rec);
        }
    }
    //,
//    onRechClick: function () {
//
//        var val = Ext.getCmp('rechercher');
////        if (new Date(valdatedebutDetail) > new Date(valdatefinDetail)) {
////            Ext.MessageBox.alert('Erreur au niveau date', 'La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin');
////            return;
////        }
//        OgridpanelID.getStore().load({
//            params: {
////                datedebut: valdatedebutDetail,
////                datefin: valdatefinDetail,
//                search_value: val.value
//            }
//        }, url_services_data_detailsortie_famille);
//    }

});