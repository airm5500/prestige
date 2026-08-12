var url_services_data_client_detailTransactionClient = '../webservices/tierspayantmanagement/tierspayant/ws_data_detail_facturation_client.jsp';
var url_services_transaction_client_addcompteclttierpayant = '../webservices/configmanagement/compteclienttierspayant/ws_transaction_clt.jsp?mode=';


var OCltgridpanelID;
var Oview;
var Omode;
var Me;

var cust_name;
var cust_id;
var cust_account_id;
var Ogrid;
var OmyType;
var str_MEDECIN;
var lg_TYPE_VENTE_ID;
var int_total_product;
var OcustGrid;
var lg_CLIENT_ID;
var lg_COMPTE_CLIENT_ID;
var ref_vente;

var valdatedebutDetail;
var valdatefinDetail;

Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.tierspayantmanagement.facturationtierspayant.action.detailTransactionClient', {
    extend: 'Ext.window.Window',
    xtype: 'detailTransactionClient',
    id: 'detailTransactionClientID',
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

        url_services_data_client_addclt_ayantdroit = '../webservices/configmanagement/ayantdroit/ws_data.jsp';

        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;
        Ogrid = this.getObtntext();
        str_MEDECIN = "";
        lg_TYPE_VENTE_ID = "";
        int_total_product = 0;
        int_total_vente = 0;
        ref_vente = this.getNameintern();

        // alert("Ogrid   " + Ogrid);





        var itemsPerPage = 20;

        url_services_data_detailsvente = '../webservices/sm_user/detailsvente/ws_data.jsp?';

        store_details = new Ext.data.Store({
            model: 'testextjs.model.DetailsVente',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_detailsvente,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store = new Ext.data.Store({
            model: 'testextjs.model.Preenregistrementcompteclienttierspayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_client_detailTransactionClient + "?lg_COMPTE_CLIENT_TIERS_PAYANT_ID=" + this.getOdatasource().lg_COMPTE_CLIENT_TIERS_PAYANT_ID,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            },
            autoLoad: true

        });


        str_MEDECIN = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Nom du medecin',
                    name: 'str_MEDECIN',
                    id: 'str_MEDECIN',
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
                    //renderer: amountformat,
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
                labelWidth: 90,
                anchor: '100%',
                msgTarget: 'side'
            },
            items: [{
                    columnWidth: 0.65,
                    xtype: 'gridpanel',
                    id: 'CltgridpanelID',
                    store: store,
                    height: 400,
                    columns: [{
                            text: 'lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID'
                        }, {
                            text: 'lg_PREENREGISTREMENT_ID',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_PREENREGISTREMENT_ID'
                        }, {
                            text: 'lg_COMPTE_CLIENT_TIERS_PAYANT_ID',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_COMPTE_CLIENT_TIERS_PAYANT_ID'
                        }, {
                            text: 'Cout paye par client',
                            flex: 1,
                            dataIndex: 'int_PRICE_CLIENT'
                        }, {
                            text: 'Cout paye par tiers payant',
                            flex: 1,
                            dataIndex: 'int_PRICE'
                        }, {
                            text: 'Reference',
                            flex: 1,
                            dataIndex: 'str_REF'
                        }, {
                            text: 'Date transaction',
                            flex: 1,
                            dataIndex: 'dt_CREATED'
                        }, {
                            text: 'Total paye',
                            flex: 1,
                            dataIndex: 'int_PRICE_TOTAL'
                        }, {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/grid.png',
                                    tooltip: 'Afficher le detail de la vente',
                                    scope: this,
                                    handler: this.onEditClick
                                }]
                        }],
                    tbar: [
                        {
                            xtype: 'datefield',
                            id: 'datedebutDetail',
                            name: 'datedebutDetail',
                            emptyText: 'Date debut',
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            flex: 0.5,
                            format: 'd/m/Y',
                            listeners: {
                                'change': function (me) {
                                    // alert(me.getSubmitValue());
                                    valdatedebutDetail = me.getSubmitValue();
                                }
                            }
                        }, {
                            xtype: 'datefield',
                            id: 'datefinDetail',
                            name: 'datefinDetail',
                            emptyText: 'Date fin',
                            maxValue: new Date(),
                            submitFormat: 'Y-m-d',
                            flex: 0.5,
                            format: 'd/m/Y',
                            listeners: {
                                'change': function (me) {
                                    //alert(me.getSubmitValue());
                                    valdatefinDetail = me.getSubmitValue();
                                }
                            }
                        }, '-', {
                            xtype: 'textfield',
                            id: 'rechercher',
                            name: 'user',
                            flex: 0.5,
                            emptyText: 'Rech'
                        }, {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            scope: this,
                            handler: this.onRechClick
                        }],
                    listeners: {
                        scope: this},
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store,
                        dock: 'bottom',
                        displayInfo: true
                    }
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
                                    height: 400,
                                    columns: [{
                                            text: 'Details Vente Id',
                                            flex: 1,
                                            sortable: true,
                                            //hidden: true,
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
                                            sortable: true,
                                            dataIndex: 'int_QUANTITY_SERVED'
                                        }, /* {
                                         text: 'P.U',
                                         flex: 1,
                                         sortable: true,
                                         dataIndex: 'int_FAMILLE_PRICE',
                                         renderer: amountformat,
                                         align: 'right'
                                         }, {
                                         text: 'Px.Ref',
                                         flex: 1,
                                         sortable: true,
                                         dataIndex: 'int_FAMILLE_PRICE',
                                         renderer: amountformat,
                                         align: 'right'
                                         }, {
                                         text: 'S',
                                         flex: 1,
                                         sortable: true,
                                         dataIndex: 'int_S'
                                         }, {
                                         text: 'T',
                                         flex: 1,
                                         sortable: true,
                                         dataIndex: 'int_T'
                                         
                                         
                                         },*/ {
                                            text: 'Montant',
                                            flex: 1,
                                            sortable: true,
                                            dataIndex: 'int_PRICE_DETAIL',
                                            renderer: amountformat,
                                            align: 'right'
                                        }/*, {
                                         xtype: 'actioncolumn',
                                         width: 30,
                                         sortable: false,
                                         menuDisabled: true,
                                         items: [{
                                         icon: 'resources/images/icons/fam/delete.png',
                                         tooltip: 'Delete',
                                         scope: this,
                                         handler: this.onRemoveClick
                                         }]
                                         }*/],
                                    bbar: {
                                        xtype: 'pagingtoolbar',
                                        pageSize: 10,
                                        store: store_details,
                                        displayInfo: true,
                                        plugins: new Ext.ux.ProgressBarPager()
                                    }/*,
                                     listeners: {
                                     scope: this,
                                     selectionchange: this.onSelectionChange
                                     }*/
                                }]
                        },
                        int_total_product,
                        int_total_vente

                    ]

                }]
        });

        this.callParent();
        OCltgridpanelID = Ext.getCmp('CltgridpanelID');

        /*if (Omode == "detail_transaction") {
         lg_CLIENT_ID = this.getOdatasource().lg_CLIENT_ID;
         //alert("lg_CLIENT_ID "+lg_CLIENT_ID + " nom prenom "+ this.getOdatasource().str_FIRST_LAST_NAME + " lg_COMPTE_CLIENT_ID "+this.getOdatasource().lg_COMPTE_CLIENT_ID);
         Ext.getCmp('lg_TYPE_VENTE_ID').setValue(lg_CLIENT_ID);
         Ext.getCmp('str_MEDECIN').setValue(this.getOdatasource().str_FIRST_LAST_NAME);
         Ext.getCmp('int_total_product').setValue(this.getOdatasource().dbl_SOLDE);
         
         
         }*/
        /* if (Ogrid === "Tiers.Payant") {
         Ext.getCmp('info_detail_transaction').hide(); 
         
         }*/

        var win = new Ext.window.Window({
            autoShow: true,
            id: 'cltwinID',
            title: this.getTitre(),
            width: 1150,
            Height: 500,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'OK',
                    //handler: this.onbtnsave
                    handler: function () {
                        win.close();
                    }
                }, {
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }]
        });
    },
    onEditClick: function (grid, rowIndex) {

        var rec = OCltgridpanelID.getStore().getAt(rowIndex);
        var lg_PREENREGISTREMENT_ID = rec.get('lg_PREENREGISTREMENT_ID');
      //  alert("lg_PREENREGISTREMENT_ID " + lg_PREENREGISTREMENT_ID);
        var str_STATUT = "is_Closed";
        var internal_url = "";

        Ext.Ajax.request({
            url: '../webservices/sm_user/detailsvente/ws_data.jsp',
            params: {
                lg_PREENREGISTREMENT_ID: lg_PREENREGISTREMENT_ID,
                str_STATUT: str_STATUT
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                Ext.getCmp('lg_TYPE_VENTE_ID').setValue(object.lg_TYPE_VENTE_ID);
                Ext.getCmp('str_MEDECIN').setValue(object.str_MEDECIN);
                var int_total_product = Number(object.int_total_product);
                Ext.getCmp('int_total_product').setValue(int_total_product + '  Produit(s)');
                //var int_total_formated = Ext.util.Format.number(object.total_vente, '0,000.');
               // alert(object.total_vente);
                var int_total_formated = Number(object.total_vente);
                Ext.getCmp('int_total_vente').setValue(int_total_formated + '  CFA');
                var OGrid = Ext.getCmp('gridpanelID');
                OGrid.getStore().reload();

            },
            failure: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });

    },
    onRechClick: function () {

        var val = Ext.getCmp('rechercher');
        /*if (new Date(valdatedebutDetail) > new Date(valdatefinDetail)) {
         Ext.MessageBox.alert('Erreur au niveau date', 'La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin');
         return;
         }*/
        OCltgridpanelID.getStore().load({
            params: {
                datedebut: valdatedebutDetail,
                datefin: valdatefinDetail,
                search_value: val.value
            }
        }, url_services_data_client_detailTransactionClient);
    }
});