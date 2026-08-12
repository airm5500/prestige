/* global Ext */

var url_services_data_mouvement_stock = '../webservices/stockmanagement/suivistockvente/ws_data_recap_mouvement.jsp';
var url_services_data_mouvement_stock_generate_pdf = '../webservices/stockmanagement/suivistockvente/ws_generate_recap_pdf.jsp';
var Oview;
var Omode;
var Me;
var ref;
var valdatedebutDetail;
var valdatefinDetail;
var OgridpanelID;
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.stockmanagement.suivistockvente.action.detailStock', {
    extend: 'Ext.window.Window',
    xtype: 'addfamilledetailstock',
    id: 'addfamilledetailstockID',
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
                url: url_services_data_mouvement_stock + "?lg_FAMILLE_ID=" + ref + "&dt_Date_Debut=" + valdatedebutDetail + "&dt_Date_Fin=" + valdatefinDetail,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var int_TOTAL_VENTE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
//                    fieldWidth: 40,
//                    flex: 0.7,
                    labelWidth: 40,
                    margin: '0 20 0 10',
                    fieldLabel: 'Vente::',
                    name: 'int_TOTAL_VENTE',
                    id: 'int_TOTAL_VENTE',
                    fieldStyle: "color:blue;",
                    value: "0"
                });

        var int_TOTAL_RETOUR = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
//                    fieldWidth: 40,
//                    flex: 0.5,
                    labelWidth: 60,
                    margin: '0 20 0 10',
                    fieldLabel: 'Ret.Four::',
                    name: 'int_TOTAL_RETOUR',
                    id: 'int_TOTAL_RETOUR',
                    fieldStyle: "color:blue;",
                    value: "0"
                });

        var int_TOTAL_PERIME = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
//                    fieldWidth: 40,
//                    flex: 0.5,
                    fieldLabel: 'Perime::',
                    labelWidth: 50,
                    margin: '0 20 0 10',
                    name: 'int_TOTAL_PERIME',
                    id: 'int_TOTAL_PERIME',
                    fieldStyle: "color:blue;",
                    value: "0"
                });


        var int_TOTAL_AJUSTEMENT = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
//                    fieldWidth: 40,
//                    flex: 0.5,
                    labelWidth: 50,
                    margin: '0 20 0 10',
                    fieldLabel: 'Ajust.::',
                    name: 'int_TOTAL_AJUSTEMENT',
                    id: 'int_TOTAL_AJUSTEMENT',
                    fieldStyle: "color:blue;",
                    value: "0"
                });

        var int_TOTAL_DECONDITIONNEMENT = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
//                    fieldWidth: 40,
//                    flex: 0.5,
                    labelWidth: 50,
                    margin: '0 20 0 10',
                    fieldLabel: 'Decon.::',
                    name: 'int_TOTAL_DECONDITIONNEMENT',
                    id: 'int_TOTAL_DECONDITIONNEMENT',
                    fieldStyle: "color:blue;",
                    value: "0"
                });

        var int_TOTAL_INVENTAIRE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
//                    labeldWidth: 5,
//                    flex: 0.5,
                    labelWidth: 50,
                    margin: '0 20 0 10',
                    fieldLabel: 'Invent.::',
                    name: 'int_TOTAL_INVENTAIRE',
                    id: 'int_TOTAL_INVENTAIRE',
                    fieldStyle: "color:blue;",
                    value: "0"
                });

        var int_TOTAL_ENTREE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
//                    fieldWidth: 5,
//                    flex: 0.5,
                    labelWidth: 50,
                    margin: '0 20 0 10',
                    fieldLabel: 'Entree.::',
                    name: 'int_TOTAL_ENTREE',
                    id: 'int_TOTAL_ENTREE',
                    fieldStyle: "color:blue;",
                    value: "0"
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
                    title: 'Infos sur le stock',
                    collapsible: true,
                    id: 'stock',
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
                            height: 400,
                            columns: [{
                                    header: 'lg_FAMILLE_ID',
                                    dataIndex: 'lg_FAMILLE_ID',
                                    hidden: true,
                                    flex: 1
                                },
                                {
                                    header: 'Date',
                                    dataIndex: 'dt_UPDATED',
                                    flex: 1
                                },
                                {
                                    header: 'Qte Debut',
                                    dataIndex: 'int_STOCK_REAPROVISONEMENT',
                                    flex: 1
                                },
                                {
                                    text: 'Sortie',
                                    columns: [
                                        {
                                            text: 'Vente',
                                            dataIndex: 'int_NUMBER_VENTE',
                                            flex: 0.7,
                                            align: 'right'
                                        },
                                        {
                                            text: 'Ret.four',
                                            dataIndex: 'int_NUMBER_RETOUR',
                                            flex: 0.7,
                                            align: 'right'
                                        },
                                        {
                                            text: 'Qte.P&eacute;rim',
                                            dataIndex: 'int_NUMBER_PERIME',
                                            flex: 0.7,
                                            align: 'right'
                                        },
                                        {
                                            text: 'Qte.Ajust&eacute;',
                                            dataIndex: 'int_NUMBER_AJUSTEMENT_OUT',
                                            flex: 0.7,
                                            align: 'right'
                                        },
                                        {
                                            text: 'Qte.D&eacute;con',
                                            dataIndex: 'int_NUMBER_DECONDITIONNEMENT_OUT',
                                            flex: 0.7,
                                            align: 'right'
                                        }



                                    ]
                                },
                                {
                                    text: 'Entr&eacute;e',
                                    columns: [
                                        {
                                            text: 'Qte.Entr&eacute;e',
                                            dataIndex: 'int_NUMBER_BON',
                                            flex: 0.7,
                                            align: 'right'
                                        },
                                        {
                                            text: 'Qte.Ajust&eacute;',
                                            dataIndex: 'int_NUMBER_AJUSTEMENT_IN',
                                            flex: 0.7,
                                            align: 'right'
                                        },
                                        {
                                            text: 'Qte.D&eacute;con',
                                            dataIndex: 'int_NUMBER_DECONDITIONNEMENT_IN',
                                            flex: 0.7,
                                            align: 'right'
                                        },
                                        {
                                            text: 'Qte.Annul&eacute;e',
                                            dataIndex: 'int_NUMBER_ANNULEVENTE',
                                            renderer: function(v,m){
                                            if(v!=0){
                                                m.style='color:red;';
                                            } 
                                            return v;
                                            },
                                            align: 'right',
                                            flex: 0.7
                                        }
                                    ]
                                },
                                {
                                    header: 'Qte.Inv',
                                    dataIndex: 'int_NUMBER_INVENTAIRE',
                                    flex: 1,
                                    align: 'right'
                                },
                                {
                                    text: 'Qte.Cmde',
                                    dataIndex: 'int_NUMBER_CMDE',
                                    hidden: true,
                                    align: 'right',
                                    flex: 1
                                }
                            ],
                            tbar: [
                                {
                                    text: 'Imprimer',
                                    tooltip: 'imprimer',
                                    scope: this,
                                    handler: this.onPdfClick
                                }
                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                dock: 'bottom',
                                store: store,
                                displayInfo: false,
//                                flex: 2,
                                pageSize: itemsPerPage,

                                items: [
                                    {
                                        xtype: 'tbseparator'
                                    },
                                    int_TOTAL_VENTE,
                                    int_TOTAL_RETOUR,
                                    int_TOTAL_PERIME,
                                    int_TOTAL_ENTREE,
                                    int_TOTAL_AJUSTEMENT,
                                    int_TOTAL_DECONDITIONNEMENT,
                                    int_TOTAL_INVENTAIRE
                                ]
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
        OgridpanelID.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });




        var win = new Ext.window.Window({
            autoShow: true, title: this.getTitre(),
            width: '90%',
            height: '80%',
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            maximizable: true,
            items: form
        });

    },
    loadStore: function () {
        OgridpanelID.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
        if (OgridpanelID.getStore().getCount() > 0) {

            var int_TOTAL_VENTE = 0;
            var int_TOTAL_RETOUR = 0;
            var int_TOTAL_PERIME = 0;
            var int_TOTAL_AJUSTEMENT = 0;
            var int_TOTAL_DECONDITIONNEMENT = 0;
            var int_TOTAL_INVENTAIRE = 0;
            var int_TOTAL_ENTREE = 0;

            OgridpanelID.getStore().each(function (rec) {

                int_TOTAL_VENTE += (parseInt(rec.get('int_NUMBER_VENTE')) + parseInt(rec.get('int_NUMBER_ANNULEVENTE')));
            
                int_TOTAL_RETOUR += parseInt(rec.get('int_NUMBER_RETOUR'));
                int_TOTAL_PERIME += parseInt(rec.get('int_NUMBER_PERIME'));
                int_TOTAL_AJUSTEMENT += (parseInt(rec.get('int_NUMBER_AJUSTEMENT_OUT')) + parseInt(rec.get('int_NUMBER_AJUSTEMENT_IN')));
                int_TOTAL_DECONDITIONNEMENT += (parseInt(rec.get('int_NUMBER_DECONDITIONNEMENT_OUT')) + parseInt(rec.get('int_NUMBER_DECONDITIONNEMENT_IN')));
                int_TOTAL_INVENTAIRE += parseInt(rec.get('int_NUMBER_INVENTAIRE'));
                int_TOTAL_ENTREE += parseInt(rec.get('int_NUMBER_BON'));

            });


        }


        Ext.getCmp('int_TOTAL_VENTE').setValue(int_TOTAL_VENTE);
        Ext.getCmp('int_TOTAL_RETOUR').setValue(int_TOTAL_RETOUR);
        Ext.getCmp('int_TOTAL_PERIME').setValue(int_TOTAL_PERIME);
        Ext.getCmp('int_TOTAL_AJUSTEMENT').setValue(int_TOTAL_AJUSTEMENT);
        Ext.getCmp('int_TOTAL_DECONDITIONNEMENT').setValue(int_TOTAL_DECONDITIONNEMENT);
        Ext.getCmp('int_TOTAL_INVENTAIRE').setValue(int_TOTAL_INVENTAIRE);
        Ext.getCmp('int_TOTAL_ENTREE').setValue(int_TOTAL_ENTREE);



    },
    onSelectionChange: function (model, records) {
        var rec = records[0];
        if (rec) {
            this.getForm().loadRecord(rec);
        }
    },
    onPdfClick: function () {
        var linkUrl = url_services_data_mouvement_stock_generate_pdf + "?lg_FAMILLE_ID=" + ref + "&dt_Date_Debut=" + valdatedebutDetail + "&dt_Date_Fin=" + valdatefinDetail;
        window.open(linkUrl);
    }

});