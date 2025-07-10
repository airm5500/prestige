var url_services_data_facturesubrogatoire = '../webservices/sm_user/journalvente/ws_facture_subrogatoire.jsp';
var url_services_data_facturesubrogatoire_generate_pdf = '../webservices/sm_user/journalvente/ws_generate_facture_subrogatoire_pdf.jsp';
var url_services_data_tierspayant = '../webservices/tierspayantmanagement/tierspayant/ws_data.jsp';


var Me;


Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
function amountformatbis(val) {
    return amountformat(val) + " F CFA";
}
Ext.define('testextjs.view.sm_user.journalvente.FactureSubrogatoireManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'facturesubrogatoire',
    id: 'facturesubrogatoireID',
    frame: true,
    animCollapse: false,
    title: 'Factures subrogatoires',
    plain: true,
    maximizable: true,
//    tools: [{type: "pin"}],
    closable: false,
//    iconCls: 'icon-grid',
    plugins: [{
            ptype: 'rowexpander',
            rowBodyTpl: new Ext.XTemplate(
                    '<p> {str_FAMILLE_ITEM}</p>',
                    {
                        formatChange: function(v) {
                            var color = v >= 0 ? 'green' : 'red';
                            return '<span style="color: ' + color + ';">' + Ext.util.Format.usMoney(v) + '</span>';
                        }
                    })
        }],
    initComponent: function() {

        Me = this;

        var linkUrl;
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Preenregistrement',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_facturesubrogatoire,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
                , timeout: 240000
            }

        });
        
        
     var searchstore = Ext.create('Ext.data.Store', {
            idProperty: 'lgTIERSPAYANTID',
            fields:
                    [
                        {name: 'lgTIERSPAYANTID',
                            type: 'string'

                        },

                        {name: 'strFULLNAME',
                            type: 'string'

                        }

                    ],
            autoLoad: false,
            pageSize: 999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/client/tiers-payants',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }
            

        });   
  var storetierspayant = new Ext.data.Store({
            model: 'testextjs.model.TiersPayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_tierspayant,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var int_PRICE_REMISE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    flex: 0.7,
                    fieldLabel: 'Total Remise::',
                    fieldWidth: 100,
                    name: 'int_PRICE_REMISE',
                    renderer: amountformatbis,
                    id: 'int_PRICE_REMISE',
                    fieldStyle: "color:blue;",
                    // margin: '0 5 15 15',
                    value: "0"


                });

        var int_PRICE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    flex: 0.7,
                    fieldLabel: 'Total.Vente Brut::',
                    fieldWidth: 150,
                    name: 'int_PRICE',
                    id: 'int_PRICE',
                    renderer: amountformatbis,
                    fieldStyle: "color:blue;",
                    // margin: '0 5 15 15',
                    value: "0"


                });

        var VENTE_NET = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    //allowBlank: false,
                    flex: 0.7,
                    fieldLabel: 'Total.Vente Net::',
                    fieldWidth: 150,
                    name: 'VENTE_NET',
                    id: 'VENTE_NET',
                    renderer: amountformatbis,
                    fieldStyle: "color:blue;",
                    // margin: '0 5 15 15',
                    value: "0"


                });

        Ext.apply(this, {
            width: '98%',
            height: valheight,
            id: 'Grid_Prevente_ID',
            //  plugins: [this.cellEditing],
            store: store,
            columns: [{
                    header: 'lg_PREENREGISTREMENT_ID',
                    dataIndex: 'lg_PREENREGISTREMENT_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, {
                    header: 'Reference',
                    dataIndex: 'str_REF',
                    flex: 1
                }, {
                    header: 'Date',
                    dataIndex: 'dt_CREATED',
                    flex: 0.7,
                    align: 'center'
                }, {
                    header: 'Heure',
                    dataIndex: 'str_hour',
                    flex: 0.6,
                    align: 'center'
                }, {
                    header: 'Type.vente',
                    hidden: true,
                    dataIndex: 'str_TYPE_VENTE',
                    flex: 0.6,
                    align: 'center'
                }, {
                    header: 'Operateur',
                    dataIndex: 'lg_USER_CAISSIER_ID',
                    flex: 1.2,
                    align: 'center'
                }, {
                    header: 'Montant Brut',
                    dataIndex: 'int_PRICE_FORMAT',
                    flex: 1,
                    align: 'right'

                }, {
                    header: 'Montant Remise',
                    dataIndex: 'int_PRICE_REMISE_FORMAT',
                    flex: 1,
                    align: 'right'

                }, {
                    header: 'Montant Net',
                    dataIndex: 'VENTE_NET_FORMAT',
                    flex: 1,
                    align: 'right'

                }, {
                    header: 'Client',
                    dataIndex: 'lg_USER_VENDEUR_ID',
                    flex: 1.2
                }, {
                    header: 'Ref.Bon',
                    dataIndex: 'str_REF_BON',
                    flex: 0.8,
                    align: 'center'
                }, {
                    header: 'Tiers payant',
                    dataIndex: 'str_TIERS_PAYANT_RO',
                    hidden: true,
                    flex: 1,
                    align: 'center'
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/grid.png',
                            tooltip: 'Voir le detail des produits',
                            scope: this,
                            handler: this.onDetailTransactionClick
                        }]
                }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    xtype: 'datefield',
                    fieldLabel: 'Du',
                    name: 'dt_debut',
                    id: 'dt_debut_journal',
                    allowBlank: false,
                    margin: '0 10 0 0',
                    submitFormat: 'Y-m-d',
                    flex: 1,
                    labelWidth: 50,
                    maxValue: new Date(),
                    format: 'd/m/Y',
                    listeners: {
                        'change': function(me) {
                            Ext.getCmp('dt_fin_journal').setMinValue(me.getValue());

                            /*dt_Date_Debut = me.getSubmitValue();
                             Ext.getCmp('Grid_Prevente_ID').getStore().getProxy().url = url_services_data_facturesubrogatoire + "?&dt_Date_Debut=" + dt_Date_Debut;
                             */
                        }
                    }
                }, {
                    xtype: 'datefield',
                    fieldLabel: 'Au',
                    name: 'dt_fin',
                    id: 'dt_fin_journal',
                    allowBlank: false,
                    labelWidth: 50,
                    flex: 1,
                    maxValue: new Date(),
                    margin: '0 9 0 0',
                    submitFormat: 'Y-m-d',
                    format: 'd/m/Y',
                    listeners: {
                        'change': function(me) {
                            Ext.getCmp('dt_debut_journal').setMaxValue(me.getValue());

                            /*  dt_Date_Fin = me.getSubmitValue();
                             Ext.getCmp('Grid_Prevente_ID').getStore().getProxy().url = url_services_data_facturesubrogatoire + "?&dt_Date_Debut=" + dt_Date_Debut + "&dt_Date_Fin=" + dt_Date_Fin;
                             */
                        }
                    }
                }, {
                    xtype: 'timefield',
                    fieldLabel: 'De',
                    // margin: '0 7 0 0',
                    name: 'h_debut',
                    id: 'h_debut',
                    emptyText: 'Heure debut(HH:mm)',
                    allowBlank: false,
                    flex: 1,
                    labelWidth: 50,
                    increment: 30,
                    //maxValue: new Date(),
                    //submitFormat: 'Y-m-d',
                    format: 'H:i'
                }, {
                    xtype: 'timefield',
                    fieldLabel: 'A',
                    name: 'h_fin',
                    id: 'h_fin',
                    emptyText: 'Heure fin(HH:mm)',
                    allowBlank: false,
                    labelWidth: 50,
                    increment: 30,
                    flex: 1,
                    format: 'H:i'
                },
                {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'user',
                    emptyText: 'Rech',
                    flex: 1,
                    listeners: {
                        'render': function(cmp) {
                            cmp.getEl().on('keypress', function(e) {
                                if (e.getKey() === e.ENTER) {
                                    Me.onRechClick();

                                }
                            });
                        }
                    }
                }, '-', {
                    xtype: 'combobox',
                    id: 'lg_TIERS_PAYANT_ID',
                    flex: 1,
                    store: searchstore,
                    pageSize: 10,
                    valueField: 'lgTIERSPAYANTID',
                    displayField: 'strFULLNAME',
//                    minChars: 2,
                    queryMode: 'remote',
                    enableKeyEvents: true,
                    emptyText: 'Selectionner tiers payant...',
                    listConfig: {
                        loadingText: 'Recherche...',
                        emptyText: 'Pas de donn&eacute;es trouv&eacute;es.',
                        getInnerTpl: function () {
                            return '<span>{strFULLNAME}</span>';
                        }

                    },
                    listeners: {
                        keypress: function (field, e) {

                            if (e.getKey() === e.BACKSPACE || e.getKey() === 46) {

                                if (field.getValue().length <= 2) {
                                    field.getStore().load();
                                }

                            }

                        },
                        select: function (cmp) {

                            Me.onRechClick();
                        }

                    }
                },'-', {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    scope: this,
                    iconCls: 'searchicon',
                    handler: this.onRechClick
                }, {
                    text: 'Imprimer',
                    tooltip: 'imprimer',
                    scope: this,
                    iconCls: 'printable',
//                    hidden: true, //a retirer demain
                    handler: this.onPdfListVenteClick
                }, {
                    text: 'Editer',
                    hidden: true,
                    tooltip: 'Editer',
                    scope: this,
                    handler: this.onPdfClick
                }],
            bbar: {
                dock: 'bottom',
                items: [
                    {
                        xtype: 'pagingtoolbar',
                        displayInfo: true,
                        flex: 2,
                        pageSize: itemsPerPage,
                        store: store, // same store GridPanel is using,
                        listeners: {
                            beforechange: function(page, currentPage) {
                                var myProxy = this.store.getProxy();
                                myProxy.params = {
                                    dt_Date_Debut: '',
                                    dt_Date_Fin: '',
                                    search_value: '',
                                    h_debut: '',
                                    h_fin: '',
                                    str_TYPE_VENTE: 'VO', 
                                    lg_TIERS_PAYANT_ID: ''
                                };

                                myProxy.setExtraParam('dt_Date_Debut', Ext.getCmp('dt_debut_journal').getSubmitValue());
                                myProxy.setExtraParam('dt_Date_Fin', Ext.getCmp('dt_fin_journal').getSubmitValue());
                                myProxy.setExtraParam('search_value', Ext.getCmp('rechecher').getValue());
                                myProxy.setExtraParam('h_debut', Ext.getCmp('h_debut').getSubmitValue());
                                myProxy.setExtraParam('h_fin', Ext.getCmp('h_fin').getSubmitValue());
                                myProxy.setExtraParam('lg_TIERS_PAYANT_ID', Ext.getCmp('lg_TIERS_PAYANT_ID').getValue());
                                
                            }

                        }
                    },
                    {
                        xtype: 'tbseparator'
                    },
                    int_PRICE_REMISE,
                    int_PRICE,
                    VENTE_NET
                ]
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        })


    },
    loadStore: function() {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function() {
        if (this.getStore().getCount() > 0) {
            var int_PRICE_REMISE = 0, int_PRICE = 0, VENTE_NET = 0;

            this.getStore().each(function(rec) {
                // alert(rec.get('VENTE_NET') +" "+ rec.get('int_PRICE_REMISE') +" " + rec.get('int_PRICE'));
                VENTE_NET += rec.get('VENTE_NET');
                int_PRICE_REMISE += rec.get('int_PRICE_REMISE');
                int_PRICE += rec.get('int_PRICE');

            });

            Ext.getCmp('VENTE_NET').setValue(VENTE_NET);
            Ext.getCmp('int_PRICE_REMISE').setValue(int_PRICE_REMISE);
            Ext.getCmp('int_PRICE').setValue(int_PRICE);
        }

    },
    onPdfClick: function(grid, rowIndex) {
        var dt_Date_Debut_search_val = Ext.Date.format(Ext.getCmp('dt_debut_journal').getValue(), 'Y-m-d');
        var dt_Date_Fin_search_val = Ext.Date.format(Ext.getCmp('dt_fin_journal').getValue(), 'Y-m-d');
        var h_debut_search_val = Ext.getCmp('h_debut').getValue();
        var h_fin_search_val = Ext.getCmp('h_fin').getValue();
        var linkUrl = url_services_data_facturesubrogatoire_generate_pdf + '?dt_Date_Debut=' + dt_Date_Debut_search_val + '&dt_Date_Fin=' + dt_Date_Fin_search_val + '&h_debut=' + h_debut_search_val + '&h_fin=' + h_fin_search_val;

        window.open(linkUrl);
    },
    onPdfListVenteClick: function() {

        var search_value = Ext.getCmp('rechecher').getValue(), h_debut = "", h_fin = "", lg_TIERS_PAYANT_ID = "";

        if (Ext.getCmp('h_debut').getSubmitValue()) {
            h_debut = Ext.getCmp('h_debut').getSubmitValue();
        }
        if (Ext.getCmp('h_fin').getSubmitValue()) {
            h_fin = Ext.getCmp('h_fin').getSubmitValue();
        }
        
        if(Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() != null) {
            lg_TIERS_PAYANT_ID = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
        }
        if (new Date(Ext.getCmp('dt_debut_journal').getSubmitValue()) > new Date(Ext.getCmp('dt_fin_journal').getSubmitValue())) {
            Ext.MessageBox.alert('Erreur au niveau date', 'La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin');
            return;
        }
        //

        var linkUrl = url_services_data_facturesubrogatoire_generate_pdf + '?dt_Date_Debut=' + Ext.getCmp('dt_debut_journal').getSubmitValue() + "&dt_Date_Fin=" + Ext.getCmp('dt_fin_journal').getSubmitValue() + "&search_value=" + search_value + "&lg_TIERS_PAYANT_ID="+ lg_TIERS_PAYANT_ID+ "&h_debut=" + h_debut + "&h_fin=" + h_fin + "&title=RELEVE DES VENTES A CREDIT";

//         alert("linkUrl " + linkUrl);
        /*Me.lunchPrinter(linkUrl);*/
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];

//alert('linkUrl'+linkUrl);
        window.open(linkUrl);

    },
    onManageDetailsClick: function(grid, rowIndex) {

        var rec = grid.getStore().getAt(rowIndex);
        var xtype = "doventemanager";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Edition d'une preevente  Pour La Vente  Au Comptant", rec.get('str_REF'), rec.data);

    },
    onRechClick: function() {
        if (new Date(Ext.getCmp('dt_debut_journal').getSubmitValue()) > new Date(Ext.getCmp('dt_fin_journal').getSubmitValue())) {
            Ext.MessageBox.alert('Erreur au niveau date', 'La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin');
            return;
        }
        var val = Ext.getCmp('rechecher');

        this.getStore().load({
            params: {
                dt_Date_Debut: Ext.getCmp('dt_debut_journal').getSubmitValue(),
                dt_Date_Fin: Ext.getCmp('dt_fin_journal').getSubmitValue(),
                search_value: val.getValue(),
                lg_TIERS_PAYANT_ID: Ext.getCmp('lg_TIERS_PAYANT_ID').getValue(),
                h_debut: Ext.getCmp('h_debut').getSubmitValue(),
                h_fin: Ext.getCmp('h_fin').getSubmitValue(),
                str_TYPE_VENTE: 'VO'
            }
        }, url_services_data_facturesubrogatoire);
    },
         onDetailTransactionClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
       // alert("rec:-----"+rec.get('lg_FAMILLE_ID'))
        new testextjs.view.sm_user.journalvente.action.detailProduct({
            odatasource: rec.data,
            parentview: this,
            mode: "detail_transaction",
            titre: "Detail des produits de la vente [" + rec.get('str_REF') + "]"
        });
    },

})