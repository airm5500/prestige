var url_services_data_mouvement_entree = '../webservices/stockmanagement/suivistockvente/ws_data_mouvement_entree.jsp';
var url_services_data_mouvement_sortie = '../webservices/stockmanagement/suivistockvente/ws_data_mouvement_sortie.jsp';

var Oview;
var Omode;
var Me;
var ref;
var valdatedebutDetail;
var valdatefinDetail;
var OgridpanelID;
var OgridpanelsortieID;
var clickedcolumnname;
var str_TYPE_ACTION;

Ext.define('testextjs.view.stockmanagement.suivistockvente.action.detailArticle', {
    extend: 'Ext.window.Window',
    xtype: 'addfamilledetail',
    id: 'addfamilledetailID',
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
        clickedcolumnname: '',
        datedebut: '',
        datedin: ''
    },
    initComponent: function () {

        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;

        var itemsPerPage = 20;

        ref = this.getOdatasource();
        clickedcolumnname = this.getClickedcolumnname();
        valdatedebutDetail = this.getDatedebut();
        valdatefinDetail = this.getDatedin();

        // alert("ref "+ref+" clickedcolumnname "+clickedcolumnname+" valdatedebutDetail "+valdatedebutDetail+" valdatefinDetail "+valdatefinDetail);


        var store_entreestock = new Ext.data.Store({
            model: 'testextjs.model.Mouvement',
            pageSize: itemsPerPage,
//            autoLoad: false,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_mouvement_entree + "?lg_FAMILLE_ID=" + ref + "&str_ACTION=ENTREESTOCK",
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_sortie = new Ext.data.Store({
            model: 'testextjs.model.Mouvement',
            pageSize: itemsPerPage,
//            autoLoad: false,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_mouvement_sortie + "?lg_FAMILLE_ID=" + ref + "&str_TYPE_ACTION=REMOVE",
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
                    title: 'Infos.Entr&eacute;e',
                    collapsible: true,
                    hidden: true,
                    id: 'entreestock',
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
                            store: store_entreestock,
                            height: 350,
                            columns: [{
                                    header: 'Date',
                                    dataIndex: 'dt_DAY',
                                    flex: 1
                                }, {
                                    header: 'Qte.Debut',
                                    dataIndex: 'int_NUMBER_DEBUT',
                                    flex: 1
                                }, {
                                    header: 'Qte.Entree',
                                    dataIndex: 'int_NUMBER_BON',
                                    flex: 1
                                }, {
                                    header: 'Qte.Cmde',
                                    dataIndex: 'int_NUMBER_CMDE',
                                    flex: 1
                                }, {
                                    header: 'Qte.Inventaire',
                                    dataIndex: 'int_NUMBER_INVENTAIRE',
                                    flex: 1
                                }, {
                                    text: 'Essai',
                                    columns: [
                                        {
                                            text: 'Test 1',
                                            dataIndex: 'int_NUMBER_INVENTAIRE'
                                        },
                                        {
                                            text: 'Test 2',
                                            dataIndex: 'int_NUMBER_DEBUT'
                                        }
                                    ]
                               
                                   
                                }],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: 10,
                                store: store_entreestock,
                                displayInfo: true,
//                                plugins: new Ext.ux.ProgressBarPager()
                            },
                            listeners: {
                                scope: this,
//                                selectionchange: this.onSelectionChange
                            }
                        }]
                },
                {
                    xtype: 'fieldset',
                    title: 'Infos.Sortie',
                    collapsible: true,
                    hidden: true,
                    id: 'sortie',
                    defaultType: 'textfield',
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            columnWidth: 0.65,
                            xtype: 'gridpanel',
                            id: 'gridpaneSortielID',
                            margin: '0 0 5 0',
//                            plugins: [this.cellEditing],
                            store: store_sortie,
                            height: 350,
                            columns: [{
                                    header: 'Date',
                                    dataIndex: 'dt_DAY',
                                    flex: 1
                                }, {
                                    header: 'Qte.Debut',
                                    dataIndex: 'int_NUMBER_DEBUT',
                                    flex: 1
                                }, {
                                    header: 'Qte.Caisse',
                                    dataIndex: 'int_NUMBER_BON',
                                    flex: 1
                                }, {
                                    header: 'Qte.Retour',
                                    dataIndex: 'int_NUMBER_CMDE',
                                    flex: 1
                                }, {
                                    header: 'Qte.P&eacute;rim&eacute;',
                                    dataIndex: 'int_NUMBERTRANSACTION',
                                    flex: 1
                                }, {
                                    header: 'Qte.Inventaire',
                                    dataIndex: 'int_NUMBER_INVENTAIRE',
                                    flex: 1
                                }],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: 10,
                                store: store_sortie,
                                displayInfo: true,
//                                plugins: new Ext.ux.ProgressBarPager()
                            },
                            listeners: {
                                scope: this,
//                                selectionchange: this.onSelectionChange
                            }
                        }]
                }
            ]


        });


        OgridpanelID = Ext.getCmp('gridpanelID');
        OgridpanelsortieID = Ext.getCmp('gridpaneSortielID');


        if (clickedcolumnname == "Quantite sortie") { // affiche les grids des sortie
            Ext.getCmp('entreestock').hide();
            Ext.getCmp('sortie').show();
        } else if (clickedcolumnname == "Quantite entree") { // affiche les grids des entree
            Ext.getCmp('entreestock').show();
            Ext.getCmp('sortie').hide();
        }

        var win = new Ext.window.Window({
            autoShow: true, title: this.getTitre(),
            width: 900,
            height: 500,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Fermer',
                    handler: function () {
                        win.close();
                    }
                }]
        });

    },
    onSelectionChange: function (model, records) {
        var rec = records[0];
        if (rec) {
            this.getForm().loadRecord(rec);
        }
    },
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