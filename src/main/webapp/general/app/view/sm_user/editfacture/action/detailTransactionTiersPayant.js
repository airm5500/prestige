/* global Ext */

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
var code_facture;

function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.sm_user.editfacture.action.detailTransactionTiersPayant', {
    extend: 'Ext.window.Window',
    xtype: 'detailTransactionTiersPayant',
    id: 'detailTransactionTiersPayantID',
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
        nameintern: '',
        maximizable: true,
        modal: true
    },
    title: 'Choix.Client',
//    width: '100%',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function () {

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
        code_facture = this.getOdatasource().str_CODE_FACTURE;
        var lgFACTUREID = this.getOdatasource().lgFACTUREID;
        if (lgFACTUREID) {
            ref = lgFACTUREID;
            code_facture = "";
        }


        var itemsPerPage = 20;
        var url_services_data_detail_facture_tiers_payant = '../api/v1/facture-tiers-payant/detail-facture';
        var url_services_data_detailsvente = '../api/v1/facture-tiers-payant/details-vente?';

        var store_details = new Ext.data.Store({
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
            model: 'testextjs.model.DossierFacture',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_detail_facture_tiers_payant + "?lg_FACTURE_ID=" + ref,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total',
                    // timeout: 180000
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

        lg_TYPE_VENTE_ID =
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    fieldLabel: 'Date de la vente',
                    labelWidth: 150,
                    name: 'lg_TYPE_VENTE_ID',
                    id: 'lg_TYPE_VENTE_ID',
                    fieldStyle: "color:blue;"

                };


        int_total_product =
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Total produit(s)',
                    name: 'int_total_product',
                    labelWidth: 150,
                    id: 'int_total_product',
                    value: 0,
                    fieldStyle: "color:blue;",
                    align: 'right'

                };

        int_total_vente =
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

                };




        var form = new Ext.form.Panel({
            width: '100%',
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
                            text: 'lg_DOSSIER_FACTURE',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_DOSSIER_FACTURE'
                        }, {
                            text: 'lg_PREENREGISTREMENT_ID',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_PREENREGISTREMENT_ID'
                        }, {
                            header: 'Num.Dossier',
                            dataIndex: 'str_REF_BON',
                            flex: 1
                        }, {
                            text: 'Nom',
                            flex: 1,
                            sortable: true,
                            dataIndex: 'str_NOM'
                        }, {
                            text: 'Prenom(s)',
                            flex: 1,
                            sortable: true,
                            dataIndex: 'str_PRENOM'
                        }/*, {
                         text: 'Date',
                         flex: 1,
                         dataIndex: 'dt_DATE'
                         }, {
                         text: 'Heure',
                         flex: 1,
                         dataIndex: 'dt_HEURE'
                         }*/, {
                            text: 'Tot.Vente',
                            flex: 1,
                            renderer: amountformat,
                            dataIndex: 'int_PRICE'
                        }, {
                            text: 'Remise',
                            flex: 1,
                            dataIndex: 'MONTANTREMISE',
                            renderer: amountformat
                        }

                        , {
                            text: 'Part.TP',
                            flex: 1,
                            dataIndex: 'dbl_MONTANT',
                            renderer: amountformat
                        }, {
                            text: 'Part.Client',
                            flex: 1,
                            dataIndex: 'int_CUST_PART',
                            renderer: amountformat
                        }, {
                            text: 'Pourcentage',
                            flex: 1,
                            dataIndex: 'int_PERCENT'
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
                            xtype: 'textfield',
                            id: 'rechercher',
                            name: 'rechercher',
                            enableKeyEvents: true,
                            width: 150,
                            emptyText: 'Rech',
                            listeners: {
                                keypress: this.onTextFieldKeyPress
                            }
                        }, {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            scope: this,
                            handler: this.onRechClick
                        }, {
                            xtype: 'displayfield',
                            //allowBlank: false,
                            fieldLabel: 'Code Facture',
                            labelWidth: 90,
                            id: 'str_CODE_FACTURE',
                            fieldStyle: "color:blue;"

                        }


                    ],
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
                                            text: 'Details Vente Id',
                                            flex: 1,
                                            sortable: true,
                                            hidden: true,
                                            dataIndex: 'lg_PREENREGISTREMENT_DETAIL_ID',
                                            id: 'lg_PREENREGISTREMENT_DETAIL_ID'
                                        }, {
                                            text: 'Famille',
                                            flex: 1,
                                            //sortable: true,
                                            hidden: true,
                                            dataIndex: 'lg_FAMILLE_ID'
                                        }, {
                                            xtype: 'rownumberer',
                                            text: 'Ligne',
                                            width: 45,
                                            hidden: true,
                                            //sortable: true
                                            //locked: true*/
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
                                            hidden: true,
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
                                        }, {
                                            text: 'P.U',
                                            flex: 1,
                                            sortable: true,
                                            dataIndex: 'int_FAMILLE_PRICE',
                                            renderer: amountformat,
                                            align: 'right'
                                        }, /* {
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
        Ext.getCmp('str_CODE_FACTURE').setValue(code_facture);

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

        // Fenetre a id fixe : detruire l'instance precedente avant d'en creer une autre.
        if (Ext.getCmp('cltwinID')) {
            Ext.getCmp('cltwinID').destroy();
        }
        var win = new Ext.window.Window({
            autoShow: true,
            id: 'cltwinID',
            title: this.getTitre(),
            modal: true,
            width: '90%',
            height: 550,
            maximizable: true,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Retour',
                    handler: function () {
                        win.close();
                    }
                }]
        });
    },
    onEditClick: function (grid, rowIndex) {

        var rec = OCltgridpanelID.getStore().getAt(rowIndex);
        var lg_PREENREGISTREMENT_ID = rec.get('lg_PREENREGISTREMENT_ID');
        var str_REF = rec.get('str_REF');
        var int_PRICE = rec.get('int_PRICE');
        var dt_DATE = rec.get('dt_DATE');
        var dt_HEURE = rec.get('dt_HEURE');
        //  alert("lg_PREENREGISTREMENT_ID " + lg_PREENREGISTREMENT_ID);
        var str_STATUT = "is_Closed";
        var internal_url = "";

        // Un seul chargement : l'appel Ajax d'en-tete faisait un DOUBLON exact de la requete de la
        // grille (memes donnees) ; les infos d'en-tete viennent de la ligne selectionnee et du
        // total renvoye par la reponse de la grille (rawData du reader).
        Ext.getCmp('lg_TYPE_VENTE_ID').setValue(dt_DATE + ' ' + dt_HEURE);
        Ext.getCmp('str_MEDECIN').setValue(str_REF);
        Ext.getCmp('int_total_vente').setValue(Number(int_PRICE) + '  CFA');
        var OGrid = Ext.getCmp('gridpanelFacureID');
        OGrid.getStore().load({
            params: {
                lg_PREENREGISTREMENT_ID: lg_PREENREGISTREMENT_ID,
                str_STATUT: str_STATUT
            },
            callback: function () {
                var raw = OGrid.getStore().getProxy().getReader().rawData || {};
                Ext.getCmp('int_total_product').setValue(Number(raw.int_total_product || 0) + '  Produit(s)');
            }
        });

    },
    onRechClick: function () {

        var val = Ext.getCmp('rechercher').getValue();
        /*if (new Date(valdatedebutDetail) > new Date(valdatefinDetail)) {
         Ext.MessageBox.alert('Erreur au niveau date', 'La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin');
         return;
         }*/


        OCltgridpanelID.getStore().load({
            params: {
                lg_FACTURE_ID: ref,
                datedebut: valdatedebutDetail,
                datefin: valdatefinDetail,
                search_value: val
            }
        }, url_services_data_detail_facture_tiers_payant);
    },
    onTextFieldKeyPress: function (field, e, options) {
        var me = this;

        if (e.getKey() === e.ENTER) {
            var val = Ext.getCmp('rechercher').getValue();
            /*if (new Date(valdatedebutDetail) > new Date(valdatefinDetail)) {
             Ext.MessageBox.alert('Erreur au niveau date', 'La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin');
             return;
             }*/


            OCltgridpanelID.getStore().load({
                params: {
                    lg_FACTURE_ID: ref,
                    datedebut: valdatedebutDetail,
                    datefin: valdatefinDetail,
                    search_value: val
                }
            }, url_services_data_detail_facture_tiers_payant);
        }
    },
    onAddClick: function (button) {

        var fenetre = button.up('window');
        fenetre.close();
        var xtype = "doreglementmanager";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponent(xtype, "Editer la facture", "0");

    }
});