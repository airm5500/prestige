var url_services_data_mouvement_entree = '../webservices/stockmanagement/suivistockvente/ws_data_mouvement_entree.jsp';

var Oview;
var Omode;
var Me;
var ref;
var valdatedebutDetail;
var valdatefinDetail;
var OgridpanelID;


Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.stockmanagement.suivistockvente.action.detailEntree', {
    extend: 'Ext.window.Window',
    xtype: 'addfamilledetailentree',
    id: 'addfamilledetailentreeID',
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
//     animCollapse: false,
//     plain: true,
//     maximizable: true,
//     tools: [{type: "pin"}],
    closable: true,
//     iconCls: 'icon-grid',
    /*plugins: [{
     ptype: 'rowexpander',
     rowBodyTpl: new Ext.XTemplate(
     '<p> {str_NAME}</p>',
     {
     formatChange: function (v) {
     var color = v >= 0 ? 'green' : 'red';
     return '<span style="color: ' + color + ';">' + Ext.util.Format.usMoney(v) + '</span>';
     }
     })
     }],*/
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
                url: url_services_data_mouvement_entree + "?lg_FAMILLE_ID=" + ref + "&datedebut="+valdatedebutDetail+"&datefin="+valdatefinDetail,
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
                    title: 'Infos sur les entr&eacute;es en stock',
                    collapsible: true,
//                    hidden: true,
                    id: 'entree',
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
                                }, {
                                    header: 'Qte.Entree',
                                    dataIndex: 'int_NUMBER_ENTREE',
                                    flex: 0.7
                                }, {
                                    header: 'Cout',
                                    dataIndex: 'int_PRICE',
                                    renderer: amountformat,
                                    flex: 0.7
                                }, {
                                    header: 'Operateur',
                                    dataIndex: 'lg_USER_ID',
                                    flex: 1
                                },
                                {
                                    header: 'Numero.Lot',
                                    dataIndex: 'int_NUM_LOT',
                                    flex: 0.7
                                },
                                {
                                    header: 'Repartiteur',
                                    dataIndex: 'lg_GROSSISTE_ID',
                                    flex: 0.7
                                },
                                {
                                    header: 'Date.Perime',
                                    dataIndex: 'dt_UPDATED',
                                    flex: 0.7
                                }
//                                ,
//                                {
//                                    header: 'Statut',
//                                    dataIndex: 'str_STATUT',
//                                    flex: 0.7
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