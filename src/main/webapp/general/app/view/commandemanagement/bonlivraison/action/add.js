/* global Ext */

var url_services_data_famille_select_order = '../webservices/sm_user/famille/ws_data_initial.jsp';
var url_services_data_grossiste_suggerer = '../webservices/configmanagement/grossiste/ws_data.jsp';
var url_services_data_bonlivraisondetails = '../webservices/commandemanagement/bonlivraisondetail/ws_data.jsp?lg_BON_LIVRAISON_ID=';
var url_services_transaction_order = '../webservices/commandemanagement/order/ws_transaction.jsp?mode=';
var url_services_pdf_bonlivraison = '../webservices/commandemanagement/bonlivraison/ws_generate_pdf.jsp';
var url_services_pdf_fiche_etiquette = '../webservices/commandemanagement/bonlivraison/ws_generate_etiquette_pdf.jsp';
var Me_Workflow;
var Omode;
var lg_BON_LIVRAISON_ID_2, str_REF_LIVRAISON;
var ref;
var famille_id_search;
var in_total_vente;
var int_total_formated;
var str_TYPE_TRANSACTION;
var DISPLAYFILTER;


Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';



function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.commandemanagement.bonlivraison.action.add', {
    extend: 'Ext.form.Panel',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.form.*',
        'Ext.layout.container.Column',
        'testextjs.model.Famille',
        'testextjs.model.Grossiste',
        'testextjs.model.BonLivraisonDetail',
        'testextjs.view.commandemanagement.bonlivraison.BonLivraisonManager'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        plain: true,
        maximizable: true,
        closable: false,
        nameintern: ''
    },
    xtype: 'bonlivraisondetail',
    id: 'bonlivraisondetailID',
    frame: true,
    title: 'Details de la livraison',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function () {
        Me_Workflow = this;
        var itemsPerPage = 20;
        var itemsPerPageGrid = 10;
        famille_id_search = "";
        in_total_vente = 0;
        int_total_formated = 0;
        str_TYPE_TRANSACTION = "ALL";
        DISPLAYFILTER = this.getOdatasource().DISPLAYFILTER;
        str_REF_LIVRAISON = this.getOdatasource().str_REF_LIVRAISON;
        titre = this.getTitre();
        ref = this.getNameintern();
        lg_BON_LIVRAISON_ID_2 = this.getNameintern();
        url_services_data_bonlivraisondetails = '../webservices/commandemanagement/bonlivraisondetail/ws_data.jsp?lg_BON_LIVRAISON_ID=' + lg_BON_LIVRAISON_ID_2;
        var store_type = new Ext.data.Store({
            fields: ['str_TYPE_TRANSACTION', 'str_desc'],
            data: [
                {str_TYPE_TRANSACTION: 'PRIX', str_desc: 'PRIX DE VENTE BL DIFFERENT DU PRIX EN MACHINE'},
                {str_TYPE_TRANSACTION: 'QTEZERO', str_desc: 'QUANTITE RECU EGAL A ZERO'},
                {str_TYPE_TRANSACTION: 'ALL', str_desc: 'Tous'}
            ]
        });

        var store_datecontrol = new Ext.data.Store({
            fields: ['name', 'value'],
            data: [{name: true, value: 'Produits avec contrôl de date de péremption'}, {name: false, value: 'Tous'}]
        });

        store_details_livraison = new Ext.data.Store({
            model: 'testextjs.model.BonLivraisonDetail',
            pageSize: itemsPerPageGrid,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_bonlivraisondetails,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 240000
            }

        });
        var str_GROSSISTE_LIBELLE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Repartiteur ::',
//                    labelWidth: 110, 
                    name: 'str_GROSSISTE_LIBELLE',
                    id: 'str_GROSSISTE_LIBELLE',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 10',
                    value: "0"
                });

        var str_REF_ORDER = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Numero Commande ::',
//                    labelWidth: 110, 
                    name: 'str_REF_ORDER',
                    id: 'str_REF_ORDER',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 10',
                    value: "0"
                });

        var str_REF_LIVRAISON = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Numero BL ::',
//                    labelWidth: 110, 
                    name: 'str_REF_LIVRAISON',
                    id: 'str_REF_LIVRAISON',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 0',
                    value: "0"
                });
        var dt_DATE_LIVRAISON = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Date ::',
//                    labelWidth: 150,
                    name: 'dt_DATE_LIVRAISON',
                    id: 'dt_DATE_LIVRAISON',
                    fieldStyle: "color:blue;",
                    margin: '0 15 0 10',
                    value: "0"
                });


        var int_TVA = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'TVA ::',
                    labelWidth: 110,
                    name: 'int_TVA',
                    id: 'int_TVA',
                    fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;",
                    margin: '0 25 0 10',
                    value: "0"
                });

        var int_MHT = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Montant HT ::',
                    labelWidth: 110,
                    name: 'int_MHT',
                    id: 'int_MHT',
                    fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;",
                    margin: '0 15 0 20',
                    value: "0"
                });

        var int_TTC = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Montant TTC ::',
                    labelWidth: 110,
                    name: 'int_TTC',
                    id: 'int_TTC',
                    fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;",
                    margin: '0 15 0 10',
                    value: "0"
                });

        Ext.apply(this, {
            width: '98%',
            fieldDefaults: {
                labelAlign: 'left',
                labelWidth: 150,
                anchor: '100%',
                msgTarget: 'side'
            },
            layout: {
                type: 'vbox',
                align: 'stretch',
                padding: 10
            },
            defaults: {
                flex: 1
            },
            id: 'panelID',
            items: [
                {
                    items: [
                        {
                            xtype: 'fieldset',
                            title: 'Infos Generales',
                            collapsible: true,
                            defaultType: 'textfield',
                            layout: 'anchor',
                            defaults: {
                                anchor: '100%'
                            },
                            items: [
                                {
                                    xtype: 'fieldcontainer',
                                    layout: 'hbox',
                                    combineErrors: true,
                                    defaultType: 'textfield',
                                    defaults: {
                                        hideLabel: 'true'
                                    },
                                    items: [
                                        str_REF_LIVRAISON,
                                        str_REF_ORDER,
                                        str_GROSSISTE_LIBELLE,
                                        dt_DATE_LIVRAISON
                                    ]
                                },
                                {
                                    xtype: 'fieldcontainer',
                                    layout: 'hbox',
                                    combineErrors: true,
                                    defaultType: 'textfield',
                                    defaults: {
//                                        hideLabel: 'true'
                                    },
                                    items: [
                                        int_TVA,
                                        int_MHT,
                                        int_TTC,
                                        {
                                            fieldLabel: 'Commencer l\'impression &agrave; partir de:',
                                            name: 'int_NUMBER_ETIQUETTE',
                                            id: 'int_NUMBER_ETIQUETTE',
                                            xtype: 'numberfield',
                                            fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;",
                                            margin: '0 15 0 10',
                                            minValue: 1,
                                            maxValue: 65,
                                            width: 300,
                                            value: 1,
                                            allowBlank: false,
                                            regex: /[0-9.]/
                                        }
                                    ]
                                }]
                        }
                    ]

                },
                {
                    xtype: 'fieldset',
                    title: 'Detail(s) Commandes',
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
                            store: store_details_livraison,
                            height: 370,
                            columns: [{
                                    text: 'Details Suggestion Id',
                                    flex: 1,
                                    sortable: true,
                                    hidden: true,
                                    dataIndex: 'lg_BON_LIVRAISON_DETAIL',
                                    id: 'lg_BON_LIVRAISON_DETAIL'
                                }, {
                                    text: 'Famille',
                                    flex: 1,
                                    sortable: true,
                                    hidden: true,
                                    dataIndex: 'lg_FAMILLE_ID'
                                },
                                {
                                    dataIndex: 'prixDiff',
                                    text: '#',
                                    width: 60, 
                                    renderer: function (v, m, r) {
                                        if (v) {
                                            m.style = 'background-color:#d9534f;';
                                        }
                                        return '';
                                    }
                                },
                                {
                                    text: 'CIP',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'lg_FAMILLE_CIP'
                                },
                                {
                                    text: 'LIBELLE',
                                    flex: 2,
                                    sortable: true,
                                    dataIndex: 'lg_FAMILLE_NAME'
                                },
                                {
                                    text: 'PMP',
                                    flex: 1,
                                    sortable: true,
                                    renderer: amountformat,
                                    align: 'right',
                                    dataIndex: 'dbl_PRIX_MOYEN_PONDERE'
                                },
                                {
                                    text: 'PRIX.ACHAT',
                                    flex: 1,
                                    sortable: true,
                                    renderer: amountformat,
                                    align: 'right',
                                    dataIndex: 'int_PAF'
                                },
                                {
                                    text: 'PRIX.VENTE',
                                    flex: 1,
                                    sortable: true,
                                    renderer: amountformat,
                                    align: 'right',
                                    dataIndex: 'int_PRIX_VENTE'
                                },
                                {
                                    header: 'Q.CDE',
                                    dataIndex: 'int_QTE_CMDE',
                                    align: 'center',
                                    flex: 1
                                },
                                {
                                    header: 'Q.RECUE',
                                    dataIndex: 'int_QTE_RECUE',
                                    align: 'center',
                                    flex: 1,
                                    renderer: function (value, metadata, record) {
                                        if (record.get('int_QTE_CMDE') > record.get('int_QTE_RECUE')) {
                                            value = '<span style="color:red; font-weight: bold;">' + value + '</span>';
                                        }
                                        return value;
                                    }
                                },
                                {
                                    header: 'UG',
                                    dataIndex: 'lg_FAMILLE_PRIX_ACHAT',
                                    align: 'right',
                                    flex: 1
                                },
                                {
                                    header: 'RELICAT',
                                    dataIndex: 'int_QTE_MANQUANT',
                                    flex: 1,
                                    renderer: function (val) {
                                        if (val < 0) {
                                            val = '<span style="color:red; font-weight: bold;">' + val + '</span>';
                                        }
                                        return val;
                                    }
                                },
                                {
                                    xtype: 'actioncolumn',
                                    width: 30,
                                    sortable: false,
                                    menuDisabled: true,
                                    items: [{
                                            icon: 'resources/images/icons/fam/page_white_edit.png',
                                            tooltip: 'Modifier Article',
                                            scope: this,
                                            handler: this.ManagePrice
                                        }]
                                },
                                {
                                    xtype: 'actioncolumn',
                                    width: 30,
                                    sortable: false,
                                    menuDisabled: true,
                                    items: [{
                                            icon: 'resources/images/icons/fam/add.png',
                                            tooltip: 'Ajout de lot',
                                            scope: this,
                                            handler: this.onAddProductClick,
                                            getClass: function (value, metadata, record) {
                                                if (record.get('int_QTE_CMDE') > 0 && (record.get('int_QTE_CMDE') > record.get('intQTERECUE'))) {  //read your condition from the record
                                                    return 'x-display-hide'; //affiche l'icone
                                                } else {
                                                    return 'x-hide-display'; //cache l'icone
                                                }
                                            }
                                        }]
                                },
                                {
                                    xtype: 'actioncolumn',
                                    width: 30,
                                    sortable: false,
                                    menuDisabled: true,
                                    hidden: true,
                                    items: [{
                                            icon: 'resources/images/icons/fam/cut.png',
                                            tooltip: 'Decondition l\'article',
                                            scope: this,
                                            handler: this.onDeconditionClick,
                                            getClass: function (value, metadata, record) {
                                                //alert(record.get('bool_DECONDITIONNE')  + " --- " + record.get('bool_DECONDITIONNE_EXIST'));
                                                if (record.get('bool_DECONDITIONNE') == "0" && record.get('bool_DECONDITIONNE_EXIST') == "1") {  //read your condition from the record
                                                    return 'x-display-hide'; //affiche l'icone
                                                } else {
                                                    return 'x-hide-display'; //cache l'icone
                                                }
                                            }
                                        }]
                                },
                                {
                                    xtype: 'actioncolumn',
                                    width: 30,
                                    sortable: false,
                                    menuDisabled: true,
                                    items: [{
                                            icon: 'resources/images/icons/fam/delete.png',
                                            tooltip: 'Suppression de lot',
                                            scope: this,
                                            handler: this.onRemoveLotClick,
                                            getClass: function (value, metadata, record) {

                                                if (record.get('int_QTE_RECUE_REEL') > 0) {  //read your condition from the record
                                                    /* if (!record.get('checkExpirationdate')) {
                                                     return 'x-display-hide';
                                                     } else {
                                                     return 'x-hide-display';
                                                     }*/
                                                    return 'x-display-hide';
                                                } else {
                                                    return 'x-hide-display'; //cache l'icone
                                                }
                                            }
                                        }]
                                }
                            ],
                            tbar: [
                                {
                                    xtype: 'textfield',
                                    id: 'rechercherDetail',
                                    name: 'rechercherDetail',
                                    emptyText: 'Recherche',
                                    flex: 1,
                                    listeners: {
                                        'render': function (cmp) {
                                            cmp.getEl().on('keypress', function (e) {
                                                if (e.getKey() === e.ENTER) {
                                                    Me_Workflow.onRechClick();

                                                }
                                            });
                                        }
                                    }
                                }, '-', {
                                    xtype: 'combobox',
                                    name: 'str_TYPE_TRANSACTION',
                                    margins: '0 0 0 10',
                                    id: 'str_TYPE_TRANSACTION',
                                    store: store_type,
                                    valueField: 'str_TYPE_TRANSACTION',
                                    displayField: 'str_desc',
                                    typeAhead: true,
                                    queryMode: 'local',
                                    emptyText: 'Filtre article...',
                                     flex: 1,
                                    listeners: {
                                        select: function (cmp) {
                                            var value = cmp.getValue();
                                            str_TYPE_TRANSACTION = value;
                                            Ext.getCmp('gridpanelID').getStore().getProxy().url = '../webservices/commandemanagement/bonlivraisondetail/ws_data.jsp?lg_BON_LIVRAISON_ID=' + lg_BON_LIVRAISON_ID_2 + "&str_TYPE_TRANSACTION=" + str_TYPE_TRANSACTION;
                                            Me_Workflow.onRechClick();
                                        }
                                    }
                                },
                                '-', {
                                    xtype: 'combobox',
                                    margins: '0 0 0 10',
                                    store: store_datecontrol,
                                    valueField: 'name',
                                    displayField: 'value',
                                    typeAhead: true,
                                    queryMode: 'local',
                                    hidden: DISPLAYFILTER,
                                    flex: 1,
                                    emptyText: 'Filtre par...',
                                    listeners: {
                                        select: function (cmp) {
                                            var value = cmp.getValue();

                                            var store = Ext.getCmp('gridpanelID').getStore();

                                            store.load({
                                                params: {
                                                    bool_CHECKEXPIRATIONDATE: value
                                                }
                                            });

                                        }
                                    }
                                }


                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: itemsPerPageGrid,
                                store: store_details_livraison,
                                displayInfo: true,
                                plugins: new Ext.ux.ProgressBarPager()
                            },
                            listeners: {
                                scope: this
                            }
                        }

                    ]

                }
                ,
                {
                    xtype: 'toolbar',
                    ui: 'footer',
                    dock: 'bottom',
                    border: '0',
                    items: ['->',
                        {
                            text: 'Retour',
                            id: 'btn_cancel',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            hidden: false,
                            handler: this.onbtncancel
                        }
                        ,
                        {
                            text: 'ENTREE EN STOCK',
                            id: 'btn_enterstock',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            hidden: false,
                            handler: this.onbtnenterstock
                        }
                    ]
                }
            ]
        });
        this.callParent();
        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });
        if (titre === "Details de la livraison") {
            Ext.getCmp('str_GROSSISTE_LIBELLE').setValue(this.getOdatasource().str_GROSSISTE_LIBELLE);
            Ext.getCmp('str_REF_LIVRAISON').setValue(this.getOdatasource().str_REF_LIVRAISON);
            Ext.getCmp('dt_DATE_LIVRAISON').setValue(this.getOdatasource().dt_DATE_LIVRAISON);
            Ext.getCmp('str_REF_ORDER').setValue(this.getOdatasource().str_REF_ORDER);


            Ext.getCmp('int_TVA').setValue(this.getOdatasource().int_TVA + ' CFA');
            Ext.getCmp('int_MHT').setValue(this.getOdatasource().int_MHT + ' CFA');
            Ext.getCmp('int_TTC').setValue(this.getOdatasource().int_HTTC + ' CFA');


        }

    },
    loadStore: function () {
        Ext.getCmp('gridpanelID').getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {

    },
    ManagePrice: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.commandemanagement.bonlivraison.action.editprice({
            odatasource: rec.data,
            parentview: this,
            mode: "editprice",
            titre: "Modification Article [" + rec.get('lg_FAMILLE_NAME') + "]"
        });
    },
    onDeconditionClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        if (rec.get('bool_DECONDITIONNE') === "1") {
            Ext.MessageBox.alert('Alerte Message', 'Ceci est un article deconditionne. Il ne peut pas etre deconditionne');
        } else {
            if (rec.get('bool_DECONDITIONNE_EXIST') === "0") {
                Ext.MessageBox.alert('Alerte Message', 'Aucune version deconditionne existe');
            } else {
                if (rec.get('int_NUMBER_AVAILABLE') <= 0) {
                    Ext.MessageBox.alert('Alerte Message', 'Stock insuffisant');
                } else {
                    new testextjs.view.configmanagement.famille.action.doDecondition({
                        odatasource: rec.data,
                        parentview: this,
                        mode: "deconditionarticle",
                        type: 'bonlivraison',
                        titre: "Article [" + rec.get('str_DESCRIPTION_DECONDITION') + "]"
                    });
                }
            }

        }

    },
    onAddProductClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        Ext.getCmp('btn_enterstock').enable();
        new testextjs.view.stockmanagement.etatstock.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "create",
            index: rowIndex,
            titre: "Ajout d'article [" + rec.get('lg_FAMILLE_NAME') + "]",
            reference: rec.get('str_REF_LIVRAISON')
        });
    },
    onRemoveLotClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        if (rec.get('checkExpirationdate')) {
            Ext.MessageBox.confirm('Message',
                    'Voullez-vous supprimer la quantité ajoutée ?',
                    function (btn) {
                        if (btn == 'yes') {
                            Ext.Ajax.request({
                                url: ' ../webservices/sm_user/entreestock/ws_transaction.jsp?mode=deleteItem',
                                params: {
                                    lg_FAMILLE_ID: rec.get('lg_FAMILLE_ID'),
                                    str_REF_LIVRAISON: rec.get('str_REF_LIVRAISON'),
                                    lg_BON_LIVRAISON_DETAIL: rec.get('lg_BON_LIVRAISON_DETAIL')
                                },
                                success: function (response)
                                {
                                    var object = Ext.JSON.decode(response.responseText, false);
                                    if (object.errors == "0") {
                                        Ext.MessageBox.alert('Error Message', object.success);
                                        return;
                                    }
                                    grid.getStore().reload();
                                },
                                failure: function (response)
                                {
                                    var object = Ext.JSON.decode(response.responseText, false);
                                    console.log("Bug " + response.responseText);
                                    Ext.MessageBox.alert('Error Message', response.responseText);
                                }
                            });
                            return;
                        }
                    });
        } else {
            new testextjs.view.stockmanagement.etatstock.action.removeLot({
                odatasource: rec.data,
                parentview: this,
                mode: "remove",
                titre: "Suppresion de lot de l'article [" + rec.get('lg_FAMILLE_NAME') + "]",
                reference: ''
            });
        }





    },
    onbtncancel: function () {

        var xtype = "";
        xtype = "bonlivraisonmanager";
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
    },
    checkIfGridIsEmpty: function () {
        var gridTotalCount = Ext.getCmp('gridpanelID').getStore().getTotalCount();
        return gridTotalCount;
    },
    getFamilleByName: function (str_famille_name) {
        var url_services_data_famille_select_dovente_search_suggerer = url_services_data_famille_select_order + "?search_value=" + str_famille_name;
        Ext.Ajax.request({
            url: url_services_data_famille_select_dovente_search_suggerer,
            params: {
            },
            success: function (response)
            {

                var object = Ext.JSON.decode(response.responseText, false);
                var OFamille = object.results[0];
                var int_CIP = OFamille.int_CIP;
                var int_EAN13 = OFamille.int_EAN13;
                Ext.getCmp('int_CIP').setValue(int_CIP);
                Ext.getCmp('int_EAN13').setValue(int_EAN13);
                famille_id_search = OFamille.lg_FAMILLE_ID;
                url_services_data_famille_select_dovente_search_suggerer = url_services_data_famille_select_order;
            },
            failure: function (response)
            {
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    },
    getFamilleByCip: function (str_famille_cip) {
        var url_services_data_famille_select_dovente_search_suggerer = url_services_data_famille_select_order + "?search_value=" + str_famille_cip;
        Ext.Ajax.request({
            url: url_services_data_famille_select_dovente_search_suggerer,
            params: {
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                var OFamille = object.results[0];
                var str_NAME = OFamille.str_NAME;
                var int_EAN13 = OFamille.int_EAN13;
                Ext.getCmp('str_NAME').setValue(str_NAME);
                Ext.getCmp('int_EAN13').setValue(int_EAN13);
                famille_id_search = OFamille.lg_FAMILLE_ID;
                famille_price_search = Number(OFamille.int_PRICE);
                famille_qte_search = 1;
                url_services_data_famille_select_dovente_search_suggerer = url_services_data_famille_select_order;
            },
            failure: function (response)
            {

                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    },
    onfiltercheck: function () {
        var str_name = Ext.getCmp('str_NAME').getValue();
        var int_name_size = str_name.length;
        if (int_name_size < 4) {
            Ext.getCmp('btn_add').disable();
        }

    },
    DisplayTotal: function (int_price, int_qte) {
        var TotalAmount_final = 0;
        var TotalAmount_temp = int_qte * int_price;
        var TotalAmount = Number(TotalAmount_temp);
        return TotalAmount;
    },
    DisplayMonnaie: function (int_total, int_amount_recu) {
        var TotalMonnaie = 0;
        Ext.getCmp('int_REEL_RESTE').setValue(int_amount_recu - int_total);
        if (int_total <= int_amount_recu) {
            var TotalMonnaie_temp = int_amount_recu - int_total;
            TotalMonnaie = Number(TotalMonnaie_temp);
            return TotalMonnaie;
        } else {
            return null;
        }
        return TotalMonnaie;
    },

    onbtnenterstock: function () {

        var internal_url = "";
        var task = "";
        var lg_BON_LIVRAISON_ID = lg_BON_LIVRAISON_ID_2;


        doEntreeStock(lg_BON_LIVRAISON_ID);
        ///code d'entree en stock
    },
    onRemoveClick: function (grid, rowIndex) {

        Ext.MessageBox.confirm('Message',
                'confirm la suppresssion',
                function (btn) {
                    if (btn == 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        // alert(url_services_transaction_order + 'deleteDetail');

                        Ext.Ajax.request({
                            url: url_services_transaction_order + 'deleteDetail',
                            params: {
                                lg_BON_LIVRAISON_DETAIL: rec.get('lg_BON_LIVRAISON_DETAIL')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.errors == "0") {
                                    Ext.MessageBox.alert('Error Message', object.success);
                                    return;
                                }
                                grid.getStore().reload();
                            },
                            failure: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);
                            }
                        });
                        return;
                    }
                });
    },
    onSelectionChange: function (model, records) {
        var rec = records[0];
        if (rec) {
            this.getForm().loadRecord(rec);
        }
    },
    onRechClick: function () {
        var val = Ext.getCmp('rechercherDetail');
        Ext.getCmp('gridpanelID').getStore().load({
            params: {
                search_value: val.getValue(),
                str_TYPE_TRANSACTION: str_TYPE_TRANSACTION
            }
        }, url_services_data_bonlivraisondetails);
    }
});


function onPdfBLClick(url) {
    window.open(url);
}

function checkIsAuthorize() {
    var result = 0;
    var OgridpanelID = Ext.getCmp('gridpanelID');
    OgridpanelID.getStore().each(function (rec) {
        if (parseInt(rec.get('int_QTE_RECUE_BIS')) < 0) {
//            alert(parseInt(rec.get('int_QTE_RECUE_BIS')));
            result++;
        }
    });
    return result;
}

function doEntreeStock(lg_BON_LIVRAISON_ID) {
    if (parseInt(Ext.getCmp('int_NUMBER_ETIQUETTE').getValue()) > 65 || parseInt(Ext.getCmp('int_NUMBER_ETIQUETTE').getValue()) < 1) {
        Ext.MessageBox.show({
            title: 'Avertissement',
            width: 320,
            msg: 'Veuillez renseigner un nombre inférieur ou égal à 65 et supérieur à 0',
            buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING,
            fn: function (buttonId) {
                if (buttonId === "ok") {
                    Ext.getCmp('int_NUMBER_ETIQUETTE').focus(false, 100, function () {
                        this.setFieldStyle('border: 2px solid #C0C0C0; background: #FFFFFF;');
                    });
                }
            }
        });

        return;
    }

    Ext.MessageBox.confirm('Message',
            'Confirmer l\'entree en stock',
            function (btn) {
                if (btn === 'yes') {
                    testextjs.app.getController('App').ShowWaitingProcess();
                    Ext.Ajax.request({
                        method: 'PUT',
                        headers: {'Content-Type': 'application/json'},
                        url: '../api/v1/commande/validerbl/' + lg_BON_LIVRAISON_ID,
//                        url: '../webservices/commandemanagement/bonlivraison/ws_transaction.jsp?mode=closureBonLivraison',
                        timeout: 1800000,
                        /* params: {
                         lg_BON_LIVRAISON_ID: lg_BON_LIVRAISON_ID
                         },*/
                        success: function (response)
                        {
                            testextjs.app.getController('App').StopWaitingProcess();
                            var object = Ext.JSON.decode(response.responseText, false);
                            if (!object.success) {
//                                Ext.MessageBox.alert('Error Message', object.errors);
                                Ext.MessageBox.show({
                                    title: 'Message d\'erreur',
                                    width: 320,
                                    msg: object.msg,
                                    buttons: Ext.MessageBox.OK,
                                    icon: Ext.MessageBox.WARNING
                                });
                                return;
                            } else {

                                Ext.MessageBox.confirm('Message',
                                        'Confirmation de l\'impression des entrees reapprovisionnements',
                                        function (btn) {
                                            if (btn == 'yes') {

                                                onPdfBLClick(url_services_pdf_bonlivraison + '?lg_BON_LIVRAISON_ID=' + lg_BON_LIVRAISON_ID);
                                                //demande d'impression des etiquettes
                                                Ext.MessageBox.confirm('Message',
                                                        'Voulez-vous proc&eacute;der aussi &agrave; l\'impression des &eacute;tiquettes',
                                                        function (btn) {
                                                            if (btn == 'yes') {
                                                                var linkUrl = url_services_pdf_fiche_etiquette + '?lg_BON_LIVRAISON_ID=' + lg_BON_LIVRAISON_ID + "&int_NUMBER=" + Ext.getCmp('int_NUMBER_ETIQUETTE').getValue();
                                                                onPdfBLClick(linkUrl);
                                                                // testextjs.app.getController('App').onLunchPrinter(linkUrl);
//                                                                    Me.onbtncancel();
                                                                // testextjs.app.getController('App').StopWaitingProcess();
                                                                var xtype = "";
                                                                xtype = "bonlivraisonmanager";
                                                                testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
                                                                return;
                                                            } else {
                                                                var xtype = "";
                                                                xtype = "bonlivraisonmanager";
                                                                testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");

                                                            }
                                                        });
                                                //fin demande d'impression des etiquettes


                                                return;
                                            } else {
                                                Me_Workflow.onbtncancel();
                                                var xtype = "";
                                                xtype = "bonlivraisonmanager";
                                                //testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");

                                                testextjs.app.getController('App').onLoadNewComponent(xtype, "Bon de livraison", "");

                                            }
                                        });
                            }

                        },
                        failure: function (response)
                        {
                            testextjs.app.getController('App').StopWaitingProcess();
                            var object = Ext.JSON.decode(response.responseText, false);
                            console.log("Bug " + response.responseText);
                            Ext.MessageBox.alert('Error Message', response.responseText);
                        }
                    });
                } else {
                    testextjs.app.getController('App').onLoadNewComponent("bonlivraisonmanager", "Bon de livraison", "");
                }
            }
    );

}