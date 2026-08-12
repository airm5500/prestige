var url_services_transaction_litige = '../webservices/configmanagement/litige/ws_transaction.jsp?mode=';


var OCltgridpanelID;
var Oview;
var Omode;
var Me;


var str_MEDECIN;
var lg_TYPE_VENTE_ID;
var int_total_product;
var lg_CLIENT_ID;
var lg_COMPTE_CLIENT_ID;
var ref_vente;
var ref;

Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.configmanagement.litige.action.detailTransactionLitige', {
    extend: 'Ext.window.Window',
    xtype: 'detailtransactionlitige',
    id: 'detailtransactionlitigeID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut',
        'Ext.grid.*',
        'Ext.layout.container.Column',
        'testextjs.model.Famille',
        'testextjs.model.CompteClient',
        'testextjs.view.sm_user.dovente.action.add',
        'Ext.selection.CellModel'

    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        obtntext: '',
        nameintern: ''
    },
    title: 'Choix.Client',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function () {

        var url_services_data_detailsvente = "../webservices/sm_user/detailsvente/ws_data.jsp";

        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;
        Ogrid = this.getObtntext();
        str_MEDECIN = "";
        lg_TYPE_VENTE_ID = "";
        int_total_product = 0;
        int_total_vente = 0;
        ref_vente = this.getNameintern();

        ref = this.getOdatasource().lg_PREENREGISTREMENT_ID;
       
        var itemsPerPage = 20;



        var store_details = new Ext.data.Store({
            model: 'testextjs.model.DetailsVente',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_detailsvente + "?lg_PREENREGISTREMENT_ID=" + ref + "&str_STATUT=is_Closed",
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        str_REF = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Reference:',
                    name: 'str_REF',
                    id: 'str_REF',
                    fieldStyle: "color:blue;",
                    margin: '0 15 15 0',
                    flex: 0.7

                });
        str_STATUT_TRAITEMENT = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Decision:',
                    hidden: true,
                    name: 'str_STATUT_TRAITEMENT',
                    id: 'str_STATUT_TRAITEMENT',
                    fieldStyle: "color:blue;",
                    margin: '0 15 15 0',
                    flex: 0.7

                });

        str_FULLNAME = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Nom organisme:',
                    name: 'str_FULLNAME',
                    id: 'str_FULLNAME',
                    fieldStyle: "color:blue;",
                    margin: '0 15 15 0',
                    flex: 0.7

                });

        int_AMOUNT_DUS = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Montant dus:',
                    name: 'int_AMOUNT_DUS',
                    id: 'int_AMOUNT_DUS',
                    fieldStyle: "color:blue;",
                    margin: '0 15 15 0',
                    flex: 0.7

                });

        int_ECART = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Ecart:',
                    hidden: true,
                    name: 'int_ECART',
                    id: 'int_ECART',
                    fieldStyle: "color:blue;",
                    margin: '0 15 15 0',
                    flex: 0.7

                });

        str_TYPELITIGE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Type litige:',
                    name: 'str_TYPELITIGE',
                    id: 'str_TYPELITIGE',
                    fieldStyle: "color:blue;",
                    margin: '0 15 15 0',
                    flex: 0.7

                });



        str_FIRST_LAST_NAME = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Nom & Prenom(s) client:',
                    name: 'str_FIRST_LAST_NAME',
                    id: 'str_FIRST_LAST_NAME',
                    fieldStyle: "color:blue;",
                    margin: '0 15 15 0',
                    flex: 1

                });

        dt_CREATED = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Date prise en compte:',
                    name: 'dt_CREATED',
                    id: 'dt_CREATED',
                    margin: '0 15 15 0',
                    fieldStyle: "color:blue;",
                            flex: 1

                });

        str_DESCRIPTION = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Commentaire:',
                    name: 'str_DESCRIPTION',
                    id: 'str_DESCRIPTION',
                    fieldStyle: "color:blue;",
                    margin: '0 15 15 0',
                    flex: 1

                });

        str_MEDECIN = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Nom du medecin',
                    name: 'str_MEDECIN',
                    id: 'str_MEDECIN',
                    margin: '0 25 0 0',
                    fieldStyle: "color:blue;",
                    emptyText: 'Nom du medecin'
                });



        lg_TYPE_VENTE_ID = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Nature de vente',
                    name: 'lg_TYPE_VENTE_ID',
                    id: 'lg_TYPE_VENTE_ID',
                    fieldStyle: "color:blue;",
                    emptyText: 'Nature de vente'
                });


        int_total_product = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Total produit(s)',
                    name: 'int_total_product',
                    id: 'int_total_product',
                    emptyText: 'Total produit(s)',
                    value: 0,
                    fieldStyle: "color:blue;",
                    align: 'right'

                });

        int_total_vente = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Total vente',
                    name: 'int_total_vente',
                    id: 'int_total_vente',
                    emptyText: 'Total vente',
                    value: 0,
//                    renderer: amountformat,
                    fieldStyle: "color:blue;",
                    align: 'right'

                });




        var form = new Ext.form.Panel({
            width: 1050,
            layout: {
                type: 'hbox'
            },
            defaults: {
                flex: 1
            },
            items: ['CltgridpanelID', 'info_detail_transaction'],
            autoHeight: true,
            fieldDefaults: {
                labelAlign: 'left',
                labelWidth: 200,
                margin: '0 0 15 10',
                anchor: '100%',
                msgTarget: 'side'
            },
            items: [
                {
                    xtype: 'fieldset',
                    id: 'CltgridpanelID',
                    height: 450,
                    margin: '10 10 10 10',
                    title: 'Information sur le litige',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        str_REF,
                        str_FULLNAME,
                        str_FIRST_LAST_NAME,
                        str_DESCRIPTION,
                        dt_CREATED,
                        str_TYPELITIGE,
                        int_AMOUNT_DUS,
                        {
                            fieldLabel: 'Montant r&eacute;gl&eacute;',
                            emptyText: 'Montant a regle',
                            name: 'int_AMOUNT',
                            margin: '0 15 15 0',
                            id: 'int_AMOUNT',
                            xtype: 'numberfield',
                            allowBlank: false,
                            regex: /[0-9.]/
                        },
                        int_ECART,
                        str_STATUT_TRAITEMENT
                    ]
                }, {
                    columnWidth: 0.50,
                    margin: '10 10 10 10',
                    xtype: 'fieldset',
                    title: 'Information detaillee de la vente',
                    id: 'info_detail_transaction',
                    layout: 'anchor',
                    defaultType: 'textfield',
                    items: [lg_TYPE_VENTE_ID,
                        str_MEDECIN,
                        {
                            xtype: 'fieldset',
                            title: 'Liste Produit(s)',
                            collapsible: true,
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
                                    //plugins: [this.cellEditing],
                                    store: store_details,
                                    height: 300,
                                    columns: [{
                                            text: 'Details Vente Id',
                                            flex: 1,
                                            sortable: true,
                                            hidden: true,
                                            dataIndex: 'lg_PREENREGISTREMENT_DETAIL_ID',
                                            id: 'lg_PREENREGISTREMENT_DETAIL_ID'
                                        }, {
                                            text: 'Famille',
                                            flex: 1,
                                            sortable: true,
                                            hidden: true,
                                            dataIndex: 'lg_FAMILLE_ID'
                                        }, {
                                            xtype: 'rownumberer',
                                            text: 'Ligne',
                                            width: 45,
                                            sortable: true/*,
                                             locked: true*/
                                        }, {
                                            text: 'CIP',
                                            flex: 1,
                                            sortable: true,
                                            dataIndex: 'int_CIP'
                                        }, /* {
                                         text: 'EAN',
                                         flex: 1,
                                         sortable: true,
                                         dataIndex: 'int_EAN13'
                                         },*/ {
                                            text: 'Designation',
                                            flex: 2,
                                            sortable: true,
                                            dataIndex: 'str_FAMILLE_NAME'
                                        }, {
                                            header: 'QD',
                                            dataIndex: 'int_QUANTITY',
                                            flex: 1/*,
                                             editor: {
                                             xtype: 'numberfield',
                                             allowBlank: false,
                                             regex: /[0-9.]/
                                             }*/
                                        }, {
                                            text: 'QS',
                                            flex: 1,
                                            hidden: true,
                                            sortable: true,
                                            dataIndex: 'int_QUANTITY_SERVED'
                                        }, {
                                            text: 'Montant',
                                            flex: 1,
                                            sortable: true,
                                            dataIndex: 'int_PRICE_DETAIL',
                                            renderer: amountformat,
                                            align: 'right'
                                        }],
                                    bbar: {
                                        xtype: 'pagingtoolbar',
                                        pageSize: 10,
                                        store: store_details,
                                        displayInfo: true,
                                        plugins: new Ext.ux.ProgressBarPager()
                                    }
                                }]
                        },
                        int_total_product,
                        int_total_vente

                    ]

                }]
        });

        if (Omode === "detail") {
            ref = this.getOdatasource().lg_LITIGE_ID;
            //ref_litige = this.getOdatasource().str_REF;
            ref_litige = this.getOdatasource().str_REF_CREATED;



            Ext.getCmp('str_REF').setValue(this.getOdatasource().str_REF);
            Ext.getCmp('str_FULLNAME').setValue(this.getOdatasource().str_ORGANISME);
            Ext.getCmp('str_TYPELITIGE').setValue(this.getOdatasource().lg_TYPELITIGE_ID);
            Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().str_DESCRIPTION);
            Ext.getCmp('str_FIRST_LAST_NAME').setValue(this.getOdatasource().str_FIRST_LAST_NAME);
            Ext.getCmp('dt_CREATED').setValue(this.getOdatasource().dt_CREATED);

            if (this.getOdatasource().str_STATUT == "enable") {
                Ext.getCmp('int_AMOUNT').setValue(this.getOdatasource().int_AMOUNT_DUS);
            } else {
                Ext.getCmp('int_AMOUNT').setValue(this.getOdatasource().int_AMOUNT);
            }


            Ext.getCmp('lg_TYPE_VENTE_ID').setValue(this.getOdatasource().lg_TYPE_VENTE_ID);
            Ext.getCmp('str_MEDECIN').setValue(this.getOdatasource().str_MEDECIN);
            Ext.getCmp('int_total_product').setValue(this.getOdatasource().int_total_product + '  Produit(s)');
            Ext.getCmp('int_total_vente').setValue(this.getOdatasource().int_total_vente + '  CFA');
            Ext.getCmp('int_AMOUNT_DUS').setValue(this.getOdatasource().int_AMOUNT_DUS + '  CFA');
            var int_ECART = this.getOdatasource().int_ECART;
            if (int_ECART != 0) {
                int_ECART = "<span style='color: red; font-weight: bold;'>" + int_ECART + "</span>";
            }
            Ext.getCmp('int_ECART').setValue(int_ECART + '  CFA');
             Ext.getCmp('str_STATUT_TRAITEMENT').setValue(this.getOdatasource().str_STATUT_TRAITEMENT);


        }

        this.callParent();
        OCltgridpanelID = Ext.getCmp('CltgridpanelID');

        var win = new Ext.window.Window({
            autoShow: true,
            id: 'cltwinID',
            title: this.getTitre(),
            width: 1200,
            Height: 500,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Cloturer sans remboursement',
                    id: 'btn_cloture_sr',
                    handler: this.onbtnsavewithout
                }, {
                    text: 'Cloturer avec remboursement',
                    id: 'btn_cloture_ar',
                    handler: this.onbtnsavewith
                }, {
                    text: 'RETOUR',
                    id: 'btn_cancel',
                    handler: function () {
                        win.close();
                    }
                }]
        });

        if (this.getOdatasource().str_STATUT != "enable") {
            Ext.getCmp('int_AMOUNT').disable();
            Ext.getCmp('str_STATUT_TRAITEMENT').show();
            Ext.getCmp('int_ECART').show();
            Ext.getCmp('btn_cancel').setText("RETOUR");
            Ext.getCmp('btn_cloture_sr').hide();
            Ext.getCmp('btn_cloture_ar').hide();

        }
    },
    onbtnsavewith: function (button) { //cloturer avec approbation de reglement

        var internal_url = "";

        if (Omode === "detail") {
            internal_url = url_services_transaction_litige + 'closurewithremboursement';
        }

        var int_AMOUNT = Ext.getCmp('int_AMOUNT').getValue();
        if (int_AMOUNT < 5) {
            Ext.MessageBox.alert('Error Message', 'Verifiez le montant saisi');
            return;
        }

        Ext.MessageBox.confirm('Message',
                'Confirmation de la cloture avec remboursement du litige',
                function (btn) {
                    if (btn == 'yes') {
                        Ext.Ajax.request({
                            url: internal_url,
                            params: {
                                str_REF: ref_litige,
                                int_AMOUNT: Ext.getCmp('int_AMOUNT').getValue()
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                    Oview.getStore().reload();
                                }
                            },
                            failure: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        var bouton = button.up('window');
                        bouton.close();
                    }

                });

    },
    onbtnsavewithout: function (button) { //cloturer avec approbation de reglement

        var internal_url = "";

        if (Omode === "detail") {
            internal_url = url_services_transaction_litige + 'closurewithoutremboursement';
        }
        Ext.MessageBox.confirm('Message',
                'Confirmation de la cloture sans remboursement du litige',
                function (btn) {
                    if (btn == 'yes') {
                        Ext.Ajax.request({
                            url: internal_url,
                            params: {
                                str_REF: ref_litige
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                    Oview.getStore().reload();
                                }
                            },
                            failure: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });

                        var bouton = button.up('window');
                        bouton.close();
                    }
                });

    }
});