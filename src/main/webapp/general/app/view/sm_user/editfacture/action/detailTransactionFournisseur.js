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
var ref;

Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.sm_user.editfacture.action.detailTransactionFournisseur', {
    extend: 'Ext.window.Window',
    xtype: 'detailTransactionFournisseur',
    id: 'detailTransactionFournisseurID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut',
        'Ext.grid.*',
        'Ext.layout.container.Column',
        'testextjs.model.Famille',
        'testextjs.model.CompteClient',
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
    initComponent: function() {

        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;
        Ogrid = this.getObtntext();
        str_MEDECIN = "";
        lg_TYPE_VENTE_ID = "";
        int_total_product = 0;
        int_total_vente = 0;
        ref_vente = this.getNameintern();

        ref = this.getOdatasource().lg_FACTURE_ID;


        var itemsPerPage = 20;
        var url_services_data_detail_facture_fournisseur = '../webservices/sm_user/facturation/ws_data_detail_fournisseur_facture.jsp';
        
        var url_services_data_bonlivraisondetail = '../webservices/commandemanagement/bonlivraisondetail/ws_data_detail.jsp?';

        var store_details = new Ext.data.Store({
            model: 'testextjs.model.BonLivraisonDetail',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_bonlivraisondetail,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store = new Ext.data.Store({
            model: 'testextjs.model.DetailFactureFounisseur',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_detail_facture_tiers_payant + "?lg_FACTURE_ID=" + ref,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total',
                    timeout: 180000
                }
            }

        });

        str_MEDECIN = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Reference Vente',
                    labelWidth: 150,
                    name: 'str_MEDECIN',
                    id: 'str_MEDECIN',
                    fieldStyle: "color:blue;",
                    emptyText: 'Reference Vente'
                });

        lg_TYPE_VENTE_ID = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Nature de vente',
                    labelWidth: 150,
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
                    labelWidth: 150,
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
                    labelWidth: 150,
                    emptyText: 'Total vente',
                    value: 0,
                    //renderer: amountformat,
                    fieldStyle: "color:blue;",
                    align: 'right'

                });




        var form = new Ext.form.Panel({
            width: 1150,
            layout: {
                type: 'hbox'
            },
//            defaults: {
//                flex: 1
//            },
//            items: ['CltgridpanelID', 'info_detail_transaction'],
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
                    flex: 2,
                    store: store,
                    height: 400,
                    columns: [{
                            text: 'lg_BON_LIVRAISON_ID',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_BON_LIVRAISON_ID'
                        }, {
                            header: 'Num Bon Commande',
                            dataIndex: 'str_REF_ORDER',
                            flex: 1
                        }, {
                            text: 'Date livraison',
                            flex: 1,
                            sortable: true,
                            dataIndex: 'dt_DATE_LIVRAISON'
                        }, {
                            text: 'Montant.Bon',
                            flex: 1,
                            renderer: amountformat,
                            dataIndex: 'int_HTTC'
                        }, {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/grid.png',
                                    tooltip: 'Afficher le detail de la livraison',
                                    scope: this,
                                    handler: this.onEditClick
                                }]
                        }],
                    tbar: [
                        {
                            xtype: 'textfield',
                            id: 'rechercher',
                            name: 'user',
                            width: 150,
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
                    title: 'Information detaillee de la livraison',
                    id: 'info_detail_transaction', 
                    flex: 1.5,
                    layout: 'anchor',
                    defaultType: 'textfield',
                    items: [str_MEDECIN,
                        lg_TYPE_VENTE_ID,
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
                                    id: 'gridpanelFacureID',
                                    //plugins: [this.cellEditing],
                                    store: store_details,
                                    height: 300,
                                    columns: [{
                                            text: 'lg_BON_LIVRAISON_DETAIL',
                                            flex: 1,
                                            sortable: true,
                                            hidden: true,
                                            dataIndex: 'lg_BON_LIVRAISON_DETAIL',
                                            id: 'lg_BON_LIVRAISON_DETAIL'
                                        }, {
                                            text: 'CIP',
                                            flex: 1,
                                            sortable: true,
                                            dataIndex: 'lg_FAMILLE_CIP'
                                        }, {
                                            text: 'Designation',
                                            flex: 2,
                                            sortable: true,
                                            dataIndex: 'lg_FAMILLE_NAME'
                                        }, {
                                            header: 'Code',
                                            dataIndex: 'str_CODE_ARTICLE',
                                            hidden: true,
                                            flex: 1
                                        }, {
                                            text: 'Q.CDE',
                                            flex: 1,
                                            sortable: true,
                                            dataIndex: 'int_QTE_CMDE'
                                        }, {
                                            text: 'Q.RECUE',
                                            flex: 1,
                                            sortable: true,
                                            dataIndex: 'int_QTE_RECUE',
                                        }, {
                                            text: 'Prix.Achat',
                                            flex: 1,
                                            sortable: true,
                                            dataIndex: 'int_PA_REEL',
                                            renderer: amountformat,
                                            align: 'right'
                                        }],
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
            Height: 480,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'R&eacute;gler',
                    handler: this.onAddClick
                            //                    handler: function() {
                            //                        win.close();
                            //                    }
                }, {
                    text: 'Retour',
                    handler: function() {
                        win.close();
                    }
                }]
        });
    },
    onEditClick: function(grid, rowIndex) {

        var rec = OCltgridpanelID.getStore().getAt(rowIndex);
        var lg_PREENREGISTREMENT_ID = rec.get('lg_PREENREGISTREMENT_ID');
        var str_REF = rec.get('str_REF');
        var int_PRICE = rec.get('int_PRICE');
        //  alert("lg_PREENREGISTREMENT_ID " + lg_PREENREGISTREMENT_ID);
        var str_STATUT = "is_Closed";
        var internal_url = "";

        Ext.Ajax.request({
            url: url_services_data_bonlivraisondetail,
            params: {
                lg_PREENREGISTREMENT_ID: lg_PREENREGISTREMENT_ID,
                str_STATUT: str_STATUT
            },
            success: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                var str_type_vente = object.lg_TYPE_VENTE_ID
                if (str_type_vente == "ASSURANCE_MUTUELLE") {
                    str_type_vente = "Assurance Mutuelle";
                }
                Ext.getCmp('lg_TYPE_VENTE_ID').setValue(str_type_vente);
                //                Ext.getCmp('str_MEDECIN').setValue(object.str_MEDECIN);
                Ext.getCmp('str_MEDECIN').setValue(str_REF);
                var int_total_product = Number(object.int_total_product);
                Ext.getCmp('int_total_product').setValue(int_total_product + '  Produit(s)');
                //var int_total_formated = Ext.util.Format.number(object.total_vente, '0,000.');
                // alert(object.total_vente);
                var int_total_formated = Number(int_PRICE);
                Ext.getCmp('int_total_vente').setValue(int_total_formated + '  CFA');
                var OGrid = Ext.getCmp('gridpanelFacureID');
                OGrid.getStore().getProxy().url = url_services_data_bonlivraisondetail + "?lg_PREENREGISTREMENT_ID=" + lg_PREENREGISTREMENT_ID + "&str_STATUT=" + str_STATUT;
                OGrid.getStore().reload();
                //OGrid.getStore().getProxy().url = url_services_data_detail_facture_tiers_payant;

            },
            failure: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });

    },
    onRechClick: function() {

        var val = Ext.getCmp('rechercher');
        /*if (new Date(valdatedebutDetail) > new Date(valdatefinDetail)) {
         Ext.MessageBox.alert('Erreur au niveau date', 'La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin');
         return;
         }*/
        OCltgridpanelID.getStore().load({
            params: {
                lg_FACTURE_ID: ref,
                datedebut: valdatedebutDetail,
                datefin: valdatefinDetail,
                search_value: val.value
            }
        }, url_services_data_detail_facture_tiers_payant);
    },
    onAddClick: function(button) {

        var fenetre = button.up('window');
        fenetre.close();
        var xtype = "addeditfacture";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponent(xtype, "Creer une facture", "0");

    },
});