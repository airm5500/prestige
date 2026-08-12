var url_services_data_grossiste = '../webservices/configmanagement/grossiste/ws_data.jsp';
var url_services_data_passation = '../webservices/configmanagement/typepassation/ws_data.jsp';
var url_services_transaction_grossiste = '../webservices/configmanagement/grossiste/ws_transaction.jsp?mode=';
var url_services_data_grossiste_order = '../webservices/commandemanagement/order/ws_data_order_passed_grossiste.jsp?lg_GROSSISTE_ID=';
var url_services_data_bl_list = '../webservices/commandemanagement/bonlivraison/ws_data_bl_grossiste.jsp?lg_GROSSISTE_ID=';
var url_services_data_ville = '../webservices/configmanagement/ville/ws_data.jsp';
var url_services_data_typereglement = "../webservices/sm_user/typereglement/ws_data.jsp";
var url_services_data_etats_list = '../webservices/commandemanagement/etats/ws_data.jsp';
var oGridParent;
var Oview;
var Omode;
var Me;
var ref;
var valdatedebut = "";
var valdatefin = "";

Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.configmanagement.grossiste.action.grossisteview', {
    extend: 'Ext.window.Window',
    xtype: 'grossisteviewe',
    id: 'grossisteviewID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.Grossiste',
        'testextjs.model.TypePassation',
        'testextjs.model.TypeReglement'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function() {

        Oview = this.getParentview();
        oGridParent = this.getParentview();
        Omode = this.getMode();
        ref = this.getOdatasource().lg_GROSSISTE_ID;
        Me = this;
        url_services_data_etats_list = '../webservices/commandemanagement/etats/ws_data.jsp?lg_GROSSISTE_ID=' + ref;

        valdatedebut = "";
        valdatefin = "";
        
        var itemsPerPage = 20;
        var store_etats = new Ext.data.Store({
            model: 'testextjs.model.EtatControle',
            pageSize: itemsPerPage,
            autoLoad: true,
            groupField: 'str_LIBELLE',
            proxy: {
                type: 'ajax',
                url: url_services_data_etats_list,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        url_services_data_grossiste_order = '../webservices/commandemanagement/order/ws_data_order_passed_grossiste.jsp?lg_GROSSISTE_ID=' + ref;
        url_services_data_bl_list = '../webservices/commandemanagement/bonlivraison/ws_data_bl_grossiste.jsp?lg_GROSSISTE_ID=' + ref;
        store_bl = new Ext.data.Store({
            model: 'testextjs.model.BonLivraison',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_bl_list,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        store_order = new Ext.data.Store({
            model: 'testextjs.model.Order',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_grossiste_order,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        var storeville = new Ext.data.Store({
            model: 'testextjs.model.Ville',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_ville,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        var storetypereglement = new Ext.data.Store({
            model: 'testextjs.model.TypeReglement',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typereglement,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        var lg_GROSSISTE_ID = new Ext.form.field.Display({
            xtype: 'displayfield',
            fieldLabel: 'GROSSISTE ::',
            labelWidth: 120,
            name: 'lg_GROSSISTE_ID',
            id: 'lg_GROSSISTE_ID',
            fieldStyle: "color:blue;",
            margin: '0 30 0 0',
            value: "0"
        });
        var dbl_CHIFFRE_DAFFAIRE = new Ext.form.field.Display({
            xtype: 'displayfield',
            fieldLabel: 'CHIFFRE D AFFAIRE::',
            labelWidth: 150,
            name: 'dbl_CHIFFRE_DAFFAIRE',
            id: 'dbl_CHIFFRE_DAFFAIRE',
            fieldStyle: "color:blue;",
            margin: '0 30 0 0',
            value: "0"
        });
        var form = new Ext.form.Panel({
            bodyPadding: 10,
            autoScroll: true,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 160,
                msgTarget: 'side'
            },
            items: [
                // INFOS GROSSISTE

                {
                    xtype: 'fieldset',
                    title: 'Information du grossiste [' + this.getOdatasource().str_LIBELLE + ']',
                    defaultType: 'textfield',
                    id: 'fielSetInfoGrossiste',
                    collapsible: true,
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                lg_GROSSISTE_ID, dbl_CHIFFRE_DAFFAIRE
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    name: 'str_LIBELLE',
                                    id: 'str_LIBELLE',
                                    fieldLabel: 'Nom',
                                    emptyText: 'Nom',
                                    flex: 1,
                                    allowBlank: false
                                },
                                {
                                    name: 'str_DESCRIPTION',
                                    id: 'str_DESCRIPTION',
                                    fieldLabel: 'Description',
                                    emptyText: 'Description',
                                    flex: 1,
                                    allowBlank: false
                                }
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                // str_ADRESSE_RUE_1                       
                                {
                                    name: 'str_ADRESSE_RUE_1',
                                    id: 'str_ADRESSE_RUE_1',
                                    fieldLabel: 'Adresse 1',
                                    emptyText: 'Adresse 1',
                                    flex: 1,
                                    allowBlank: false
                                },
                                // str_ADRESSE_RUE_2
                                {
                                    name: 'str_ADRESSE_RUE_2',
                                    id: 'str_ADRESSE_RUE_2',
                                    fieldLabel: 'Adresse 2',
                                    emptyText: 'Adresse 2',
                                    flex: 1,
                                    allowBlank: false
                                }
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                // str_CODE_POSTAL
                                {
                                    name: 'str_CODE_POSTAL',
                                    id: 'str_CODE_POSTAL',
                                    fieldLabel: 'Code Postal',
                                    emptyText: 'Code Postal',
                                    flex: 1,
                                    allowBlank: false
                                },
                                // str_BUREAU_DISTRIBUTEUR
                                {
                                    name: 'str_BUREAU_DISTRIBUTEUR',
                                    id: 'str_BUREAU_DISTRIBUTEUR',
                                    fieldLabel: 'Bureau distributeur',
                                    emptyText: 'Bureau distributeur',
                                    flex: 1,
                                    allowBlank: false
                                }
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    name: 'str_MOBILE',
                                    id: 'str_MOBILE',
                                    fieldLabel: 'Mobile',
                                    emptyText: 'Mobile',
                                    maskRe: /[0-9.]/,
                                    flex: 1,
                                    allowBlank: false
                                },
                                // str_TELEPHONE
                                {
                                    name: 'str_TELEPHONE',
                                    id: 'str_TELEPHONE',
                                    fieldLabel: 'Telephone',
                                    emptyText: 'Telephone',
                                    flex: 1,
                                    maskRe: /[0-9.]/,
                                    allowBlank: false
                                }
                            ]
                        }
                        ,
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    flex: 1,
                                    name: 'int_DELAI_REGLEMENT_AUTORISE',
                                    id: 'int_DELAI_REGLEMENT_AUTORISE',
                                    fieldLabel: 'Delai reglement',
                                    emptyText: 'Delai reglement',
                                    maskRe: /[0-9.]/,
                                    allowBlank: false
                                },
                                {
                                    flex: 1,
                                    xtype: 'combobox',
                                    fieldLabel: 'Type reglement',
                                    name: 'lg_TYPE_REGLEMENT_ID',
                                    id: 'lg_TYPE_REGLEMENT_ID',
                                    store: storetypereglement,
                                    valueField: 'lg_TYPE_REGLEMENT_ID',
                                    displayField: 'str_NAME',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir une type de reglement...'

                                },
                                // lg_VILLE_ID
                                {
                                    flex: 1,
                                    xtype: 'combobox',
                                    fieldLabel: 'Ville',
                                    name: 'lg_VILLE_ID',
                                    id: 'lg_VILLE_ID',
                                    store: storeville,
                                    valueField: 'lg_VILLE_ID',
                                    displayField: 'STR_NAME',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir une ville...'
                                }
                            ]
                        }

                    ]
                },
                //  COMMANDE CHEZ LE FOURNISSEUR

                /* { // a decommenter en cas de probleme
                 xtype: 'fieldset',
                 id: 'fielSetInfoCommande',
                 title: 'Commande chez le fournisseur [' + this.getOdatasource().str_LIBELLE + ']',
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
                 id: 'gridpanelID2',
                 store: store_order,
                 height: 250,
                 maximizable: true,
                 plugins: [{
                 ptype: 'rowexpander',
                 rowBodyTpl: new Ext.XTemplate(
                 '<p> {str_FAMILLE_ITEM}</p>',
                 {
                 formatChange: function(v) {
                 var color = v >= 0 ? 'white' : 'red';
                 return '<span style="color: ' + color + ';">' + Ext.util.Format.usMoney(v) + '</span>';
                 }
                 }
                 )
                 }],
                 columns: [{
                 header: 'lg_ORDER_ID',
                 dataIndex: 'lg_ORDER_ID',
                 hidden: true,
                 flex: 1,
                 editor: {
                 allowBlank: false
                 }
                 
                 },
                 {
                 xtype: 'rownumberer',
                 text: 'LG',
                 width: 45,
                 sortable: true
                 },
                 {
                 header: 'Ref.',
                 dataIndex: 'str_REF_ORDER',
                 flex: 1
                 },
                 {
                 header: 'Nombre de lignes',
                 dataIndex: 'int_LINE',
                 flex: 1
                 },
                 {
                 header: 'PRIX.ACHAT',
                 dataIndex: 'PRIX_ACHAT_TOTAL',
                 align: 'right',
                 flex: 1
                 },
                 {
                 header: 'PRIX.VENTE',
                 dataIndex: 'PRIX_VENTE_TOTAL',
                 align: 'right',
                 flex: 1
                 },
                 {
                 header: 'STATUT',
                 hidden: true,
                 dataIndex: 'str_STATUT',
                 flex: 1,
                 renderer: function(val) {
                 if (val === 'is_Process') {
                 val = 'EN COURS';
                 } else if (val === 'passed') {
                 val = 'PASSEE';
                 } else if (val === 'is_Partial') {
                 val = 'PARTIELLE';
                 } else if (val === 'is_Closed') {
                 val = 'TOTALE';
                 }
                 return val;
                 }
                 }
                 ],
                 bbar: {
                 xtype: 'pagingtoolbar',
                 pageSize: 10,
                 store: store_order,
                 displayInfo: true,
                 plugins: new Ext.ux.ProgressBarPager()
                 },
                 listeners: {
                 scope: this,
                 selectionchange: this.onSelectionChange
                 }
                 }
                 ]
                 
                 },
                 // BON DE LIVRAISON
                 
                 {
                 xtype: 'fieldset',
                 id: 'fielSetInfoBL',
                 title: 'Bon de livraison du fournisseur [' + this.getOdatasource().str_LIBELLE + ']',
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
                 id: 'gridpanelBLID2',
                 store: store_bl,
                 height: 250,
                 maximizable: true,
                 plugins: [{
                 ptype: 'rowexpander',
                 rowBodyTpl: new Ext.XTemplate(
                 '<p> {str_FAMILLE_ITEM}</p>',
                 {
                 formatChange: function(v) {
                 var color = v >= 0 ? 'white' : 'red';
                 return '<span style="color: ' + color + ';">' + Ext.util.Format.usMoney(v) + '</span>';
                 }
                 }
                 )
                 }],
                 columns: [
                 {
                 header: 'lg_BON_LIVRAISON_ID',
                 dataIndex: 'lg_BON_LIVRAISON_ID',
                 hidden: true,
                 flex: 1,
                 editor: {
                 allowBlank: false
                 }
                 
                 },
                 {
                 xtype: 'rownumberer',
                 text: 'LG',
                 width: 45,
                 sortable: true
                 },
                 {
                 header: 'Ref.',
                 dataIndex: 'str_REF_LIVRAISON',
                 flex: 1
                 },
                 {
                 header: 'Grossiste',
                 dataIndex: 'str_GROSSISTE_LIBELLE',
                 flex: 1
                 },
                 {
                 header: 'Ref.CMDE',
                 dataIndex: 'str_REF_ORDER',
                 flex: 1
                 },
                 {
                 header: 'Lignes',
                 dataIndex: 'int_NBRE_LIGNE_BL_DETAIL',
                 flex: 1
                 },
                 {
                 header: 'Date',
                 dataIndex: 'dt_DATE_LIVRAISON',
                 flex: 1
                 },
                 {
                 header: 'MONTANT.HT',
                 dataIndex: 'PRIX_ACHAT_TOTAL',
                 align: 'right',
                 flex: 1
                 },
                 {
                 header: 'PRIX.BL.HT',
                 dataIndex: 'int_MHT',
                 align: 'right',
                 flex: 1
                 },
                 {
                 header: 'TVA',
                 dataIndex: 'int_TVA',
                 align: 'right',
                 flex: 1
                 },
                 {
                 header: 'PRIX.BL.TTC',
                 dataIndex: 'int_HTTC',
                 align: 'right',
                 flex: 1
                 }
                 ],
                 bbar: {
                 xtype: 'pagingtoolbar',
                 pageSize: 10,
                 store: store_bl,
                 displayInfo: true,
                 plugins: new Ext.ux.ProgressBarPager()
                 },
                 listeners: {
                 scope: this,
                 selectionchange: this.onSelectionChange
                 }
                 }
                 ]
                 
                 }*/


                //code ajouté
                {
                    xtype: 'fieldset',
                    id: 'fielSetInfoCommande',
                    title: 'Etat de controle d\'achat du fournisseur [' + this.getOdatasource().str_LIBELLE + ']',
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
                            id: 'gridpanelID2',
                            store: store_etats,
                            height: 300,
                            maximizable: true,
                            plugins: [{
                                    ptype: 'rowexpander',
                                    rowBodyTpl: new Ext.XTemplate(
                                            '<p> {str_FAMILLE_ITEM}</p>',
                                            {
                                                formatChange: function(v) {
                                                    var color = v >= 0 ? 'white' : 'red';
                                                    return '<span style="color: ' + color + ';">' + Ext.util.Format.usMoney(v) + '</span>';
                                                }
                                            }
                                    )
                                }],
                            columns: [{
                                    xtype: 'rownumberer',
                                    text: 'LG',
                                    width: 45,
                                    sortable: true
                                },
                                {
                                    header: 'GROSSISTE',
                                    dataIndex: 'str_LIBELLE',
                                    flex: 1.5
                                },
                                {
                                    header: 'CIP',
                                    dataIndex: 'int_CIP',
                                    hidden: true,
                                    flex: 1
                                },
                                {
                                    header: 'LIBELLE',
                                    dataIndex: 'str_NAME',
                                    hidden: true,
                                    flex: 2.5
                                },
                                {
                                    header: 'NO CMD',
                                    dataIndex: 'str_ORDER_REF',
                                    flex: 1.5
                                },
                                {
                                    header: 'REF BL',
                                    dataIndex: 'str_BL_REF',
                                    align: 'right',
                                    flex: 1
                                },
                                {
                                    header: 'Montant HT',
                                    dataIndex: 'int_ORDER_PRICE',
                                    renderer: amountformat,
                                    align: 'right',
                                    flex: 1
                                },
                                {
                                    header: 'Montant TVA',
                                    dataIndex: 'int_TVA',
                                    renderer: amountformat,
                                    align: 'right',
                                    flex: 1
                                },
                                {
                                    header: 'Montant TTC',
                                    dataIndex: 'int_BL_PRICE',
                                    renderer: amountformat,
                                    align: 'right',
                                    flex: 1
                                },
                                {
                                    header: 'QTE CMD',
                                    dataIndex: 'int_QTE_CMDE',
                                    align: 'center',
                                    hidden: true,
                                    flex: 1
                                },
                                {
                                    header: 'DATE LIVR',
                                    dataIndex: 'dt_DATE_LIVRAISON',
                                    flex: 1
                                },
                                {
                                    header: 'DATE ENTREE',
                                    dataIndex: 'dt_UPDATED',
                                    flex: 1
                                },
                                {
                                    header: 'QTE ENTREE',
                                    dataIndex: 'int_NUMBER',
                                    hidden: true,
                                    flex: 1
                                },
                                {
                                    header: 'Operateur',
                                    dataIndex: 'lg_USER_ID',
                                    flex: 1.5
                                }
                            ],
                            tbar: [
                                {
                                    xtype: 'datefield',
                                    id: 'datedebut',
                                    name: 'datedebut',
                                    emptyText: 'Date debut',
                                    submitFormat: 'Y-m-d',
                                    maxValue: new Date(),
                                    flex: 0.7,
                                    format: 'd/m/Y',
                                    listeners: {
                                        'change': function(me) {
                                            valdatedebut = me.getSubmitValue();
                                            Ext.getCmp('datefin').setMinValue(me.getValue());
                                            Ext.getCmp('gridpanelID2').getStore().getProxy().url = url_services_data_etats_list + "&datedebut=" + valdatedebut;
//                            
                                        }
                                    }
                                }, {
                                    xtype: 'datefield',
                                    id: 'datefin',
                                    name: 'datefin',
                                    emptyText: 'Date fin',
                                    maxValue: new Date(),
                                    flex: 0.7,
                                    submitFormat: 'Y-m-d',
                                    format: 'd/m/Y',
                                    listeners: {
                                        'change': function(me) {
                                            //alert(me.getSubmitValue());
                                            valdatefin = me.getSubmitValue();
                                            Ext.getCmp('datedebut').setMaxValue(me.getValue());
                                            Ext.getCmp('gridpanelID2').getStore().getProxy().url = url_services_data_etats_list + "&datedebut=" + valdatedebut + "&datefin=" + valdatefin;
                                        }
                                    }
                                }, '-',
                                {
                                    xtype: 'textfield',
                                    id: 'rechecher_grossiste',
                                    name: 'suggestion',
                                    emptyText: 'Recherche',
                                    listeners: {
                                        'render': function(cmp) {
                                            cmp.getEl().on('keypress', function(e) {
                                                if (e.getKey() === e.ENTER) {
                                                    Me.onRechClick();

                                                }
                                            });
                                        }
                                    }
                                },
                                {
                                    text: 'rechercher',
                                    tooltip: 'rechercher',
                                    iconCls: 'searchicon',
                                    scope: this,
                                    handler: this.onRechClick
                                }
                                /*, '-',
                                 {
                                 text: 'IMPRIMER',
                                 scope: this,
                                 handler: this.onPrintClick
                                 }*/
                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: itemsPerPage,
                                store: store_etats,
                                displayInfo: true,
                                plugins: new Ext.ux.ProgressBarPager()
                            }/*,
                             listeners: {
                             scope: this,
                             selectionchange: this.onSelectionChange
                             }*/
                        }
                    ]

                }

                //fin code ajouté

            ]
        });
        //Initialisation des valeur

        // oGridParent = Ext.getCmp('gridPrincipalID');

        if (Omode === "manageGrossiste") {

            ref = this.getOdatasource().lg_GROSSISTE_ID;
            Ext.getCmp('lg_GROSSISTE_ID').setValue(this.getOdatasource().str_LIBELLE);
            Ext.getCmp('str_LIBELLE').setValue(this.getOdatasource().str_LIBELLE);
            Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().str_DESCRIPTION);
            Ext.getCmp('str_ADRESSE_RUE_1').setValue(this.getOdatasource().str_ADRESSE_RUE_1);
            Ext.getCmp('str_ADRESSE_RUE_2').setValue(this.getOdatasource().str_ADRESSE_RUE_2);
            Ext.getCmp('str_CODE_POSTAL').setValue(this.getOdatasource().str_CODE_POSTAL);
            Ext.getCmp('str_BUREAU_DISTRIBUTEUR').setValue(this.getOdatasource().str_BUREAU_DISTRIBUTEUR);
            Ext.getCmp('str_MOBILE').setValue(this.getOdatasource().str_MOBILE);
            Ext.getCmp('str_TELEPHONE').setValue(this.getOdatasource().str_TELEPHONE);
            Ext.getCmp('int_DELAI_REGLEMENT_AUTORISE').setValue(this.getOdatasource().int_DELAI_REGLEMENT_AUTORISE);
            Ext.getCmp('dbl_CHIFFRE_DAFFAIRE').setValue(Ext.util.Format.number(this.getOdatasource().dbl_CHIFFRE_DAFFAIRE, '0,000.') + " F CFA");
            Ext.getCmp('lg_TYPE_REGLEMENT_ID').setValue(this.getOdatasource().lg_TYPE_REGLEMENT_ID);
            Ext.getCmp('lg_VILLE_ID').setValue(this.getOdatasource().lg_VILLE_ID);
            /*var OGridpanelID2 = Ext.getCmp('gridpanelID2'); // a decommenter en cas de probleme
             OGridpanelID2.getStore().reload();
             // gridpanelBLID2
             var OGridpanelBLID = Ext.getCmp('gridpanelBLID2');
             OGridpanelBLID.getStore().reload();*/


        }





        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: '75%',
            height: 600,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Valider',
                    id: 'btnValiderId',
                    hidden: true,
                    handler: this.onbtnsave
                }, {
                    text: 'Retour',
                    handler: function() {
                        win.close();
                    }
                }]
        });
    },
    onbtnsave: function() {

        var internal_url = "";

        Ext.MessageBox.confirm('Message',
                'Voulez-vous enregistrer les modifications ?',
                function(btn) {
                    if (btn === 'yes') {

                        //alert("str_LIBELLE " + Ext.getCmp('str_LIBELLE').getValue());
                        internal_url = url_services_transaction_grossiste + 'update&lg_GROSSISTE_ID=' + ref;

                        Ext.Ajax.request({
                            url: internal_url,
                            params: {
                                str_LIBELLE: Ext.getCmp('str_LIBELLE').getValue(),
                                str_DESCRIPTION: Ext.getCmp('str_DESCRIPTION').getValue(),
                                str_ADRESSE_RUE_1: Ext.getCmp('str_ADRESSE_RUE_1').getValue(),
                                str_ADRESSE_RUE_2: Ext.getCmp('str_ADRESSE_RUE_2').getValue(),
                                str_CODE_POSTAL: Ext.getCmp('str_CODE_POSTAL').getValue(),
                                str_BUREAU_DISTRIBUTEUR: Ext.getCmp('str_BUREAU_DISTRIBUTEUR').getValue(),
                                str_MOBILE: Ext.getCmp('str_MOBILE').getValue(),
                                str_TELEPHONE: Ext.getCmp('str_TELEPHONE').getValue(),
                                int_DELAI_REGLEMENT_AUTORISE: Ext.getCmp('int_DELAI_REGLEMENT_AUTORISE').getValue(),
                                dbl_CHIFFRE_DAFFAIRE: Ext.getCmp('dbl_CHIFFRE_DAFFAIRE').getValue(),
                                lg_TYPE_REGLEMENT_ID: Ext.getCmp('lg_TYPE_REGLEMENT_ID').getValue(),
                                lg_VILLE_ID: Ext.getCmp('lg_VILLE_ID').getValue()

                            },
                            success: function(response)
                            {
                                alert("NOUS SOMMES ICI");
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                }

                                oGridParent.getStore().reload();
                            },
                            failure: function(response)
                            {
                                //alert("echec");
                                var object = Ext.JSON.decode(response.responseText, false);
                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);
                            }
                        });

                    }

                });

        this.up('window').close();
    },
    onSelectionChange: function(model, records) {
        var rec = records[0];
        if (rec) {
            this.getForm().loadRecord(rec);
        }
    }
    ,
    loadStore: function() {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function() {


    },
    onRechClick: function() {
        var val = Ext.getCmp('rechecher_grossiste');
        if (valdatedebut !== null && valdatefin !== null)
        {
            if (new Date(valdatedebut) > new Date(valdatefin)) {
                Ext.MessageBox.alert('Erreur au niveau date', 'La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin');
                return;
            }
        }
        Ext.getCmp('gridpanelID2').getStore().load({
            params: {
                search_value: val.getValue(),
                datedebut: valdatedebut,
//                lg_GROSSISTE_ID: ref,
                datefin: valdatefin
            }
        }, url_services_data_etats_list);
    }

});