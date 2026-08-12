var url_services_data_mouvement_inventaire = '../webservices/stockmanagement/suivistockvente/ws_produit_inventaire.jsp';

var Oview;
var Omode;
var Me;
var ref;
var valdatedebutDetail;
var valdatefinDetail;
var OgridpanelID;


Ext.define('testextjs.view.stockmanagement.suivistockvente.action.detailInventaire', {
    extend: 'Ext.window.Window',
    xtype: 'addfamilledetailinventaire',
    id: 'addfamilledetailinventaireID',
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
                url:  "../webservices/stockmanagement/suivistockvente/ws_produit_inventaire.jsp?lg_FAMILLE_ID=" + ref + "&datedebut="+valdatedebutDetail+"&datefin="+valdatefinDetail,
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
                    title: 'Infos sur les inventaires',
                    collapsible: true,
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
                                    header: 'Qte Initiale',
                                    dataIndex: 'int_NUMBER_VENTE',
                                    flex: 0.7
                                },{
                                    header: 'Qte Finale',
                                    dataIndex: 'int_NUMBER_RETOUR',
                                    flex: 0.7
                                }, {
                                    header: 'Operateur',
                                    dataIndex: 'lg_USER_ID',
                                    flex: 1
                                }/*, 
                                {
                                    header: 'Prix Achat',
                                    dataIndex: 'str_CODE_TAUX_REMBOURSEMENT',
                                    flex: 1
                                }, 
                                {
                                    header: 'Prix Vente',
                                    dataIndex: 'int_STOCK_REAPROVISONEMENT',
                                    flex: 1
                                }*/
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
        });

    },
    onSelectionChange: function (model, records) {
        var rec = records[0];
        if (rec) {
            this.getForm().loadRecord(rec);
        }
    }
});