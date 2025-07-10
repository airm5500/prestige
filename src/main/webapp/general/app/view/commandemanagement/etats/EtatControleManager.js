/* global Ext */



var url_services_pdf_bonlivraison = '../webservices/commandemanagement/bonlivraison/ws_generate_pdf.jsp';

var Me;
var val;
var str_REF_ORDER = "";
var str_REF_LIVRAISON = "";
var selectedBLs = [];
var selectedBL;
var lg_BON_LIVRAISON_ID;
var int_MHT;
var btnUpdate = false;
Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.commandemanagement.etats.EtatControleManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'etatscontrolemanager',
    id: 'etatscontrolemanagerID',
    frame: true,
    requires: ['testextjs.view.commandemanagement.cmde_passees.action.edit'],

    title: 'Etat de controle des achats',
//    btnUpdate: false,
    plugins: [{
            ptype: 'rowexpander',
            rowBodyTpl: new Ext.XTemplate(
                    '<p> {items}</p>')
        }],

    initComponent: function () {


        let store_grossiste = new Ext.data.Store({
            model: 'testextjs.model.Grossiste',
            pageSize: 999,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/grossiste/all',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 240000
            }

        });
        Me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/common/is-authorized',
            params: {
                action: 'P_BTN_UPDATEBL'
            },
            success: function (response)
            {
                const object = Ext.JSON.decode(response.responseText, false);
                btnUpdate = object.data;

            },
            failure: function (response)
            {
                console.log("Bug   AIE ");
            }
        });




        const itemsPerPage = 20;
        const store_etats = new Ext.data.Store({

            idProperty: 'id',
            fields: [
                {
                    name: 'lgBONLIVRAISONID',
                    type: 'string'
                },
                {
                    name: 'strREFLIVRAISON',
                    type: 'string'
                },
                {
                    name: 'dtDATELIVRAISON',
                    type: 'string'
                },
                {
                    name: 'strSTATUT',
                    type: 'string'
                },
                {
                    name: 'dtCREATED',
                    type: 'string'
                },
                {
                    name: 'dtUPDATED',
                    type: 'string'
                },
                {
                    name: 'strSTATUTFACTURE',
                    type: 'string'
                },
                {
                    name: 'user',
                    type: 'auto'
                },
                {
                    name: 'orderId',
                    type: 'string'
                },
                {
                    name: 'orderRef',
                    type: 'string'
                },
                {
                    name: 'items',
                    type: 'string'
                },
                {
                    name: 'fournisseurId',
                    type: 'string'
                },
                {
                    name: 'fournisseur',
                    type: 'auto'
                },
                {
                    name: 'intMONTANTRESTANT',
                    type: 'number'
                },
                {
                    name: 'intMONTANTREGLE',
                    type: 'number'
                },
                {
                    name: 'intHTTC',
                    type: 'number'
                },
                {
                    name: 'intTVA',
                    type: 'number'
                },
                {
                    name: 'intMHT',
                    type: 'number'
                },
                {
                    name: 'returnFullBl',
                    type: 'boolean'
                },
                {
                    name: 'montantAvoir',
                    type: 'number'
                },
                {
                    name: 'bl_SELECTED',
                    type: 'boolean'
                },
                {
                    name: 'dateLivraison',
                    type: 'date'
                }

            ],
            pageSize: itemsPerPage,
            autoLoad: false,
            groupField: 'fournisseurId',
            proxy: {
                type: 'ajax',
                url: '../api/v1/etat-control-bon/list',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });

        Ext.apply(this, {
            width: '98%',
            height: 580,
            store: store_etats,
            id: 'gridID',
            columns: [
                {
                    xtype: 'rownumberer',
                    text: 'LG',
                    width: 45,
                    sortable: true
                },
                {
                    header: 'GROSSISTE',
                    tpl: '{fournisseur.fournisseurLibelle}',
                    xtype: 'templatecolumn',
                    flex: 1.5
                },
                {
                    header: 'NO CMD',
                    dataIndex: 'orderRef',
                    flex: 1
                },
                {
                    header: 'REF BL',
                    dataIndex: 'strREFLIVRAISON',
                    align: 'right',
                    flex: 1
                },
                {
                    header: 'Montant HT',
                    dataIndex: 'intMHT',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1
                },
                {
                    header: 'Montant TVA',
                    dataIndex: 'intTVA',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1
                },
                {
                    header: 'Montant TTC',
                    dataIndex: 'intHTTC',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1
                },

                {
                    header: 'DATE LIVR',
                    dataIndex: 'dtDATELIVRAISON',
                    flex: 1
                },
                {
                    header: 'DATE ENTREE',
                    dataIndex: 'dtCREATED',
                    flex: 1
                },

                {
                    header: 'MTN AVOIR',
                    dataIndex: 'montantAvoir',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1
                },
                {
                    header: 'Operateur',
                    tpl: '{user.fullName}',
                    xtype: 'templatecolumn',
                    flex: 1.5
                },
                {
                    text: '',
                    width: 30,
                    dataIndex: 'bl_SELECTED',
                    xtype: 'checkcolumn',
                    listeners: {
                        checkChange: this.onCheckChange
                    }

                },

                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.gif',
                            tooltip: 'RETOUR COMPLET DU BL',
                            scope: this,
                            getClass: function (value, metadata, record) {
                                if (record.get('returnFullBl')) {
                                    return 'x-display-hide';
                                }

                                return 'x-hide-display';
                            },

                            handler: this.retourCompletBL
                        }]
                },

                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/page_white_edit.png',
                            tooltip: 'Modifier les informations du bon de livraison',
                            scope: this,
                            getClass: function (value, metadata, record) {
                                if (btnUpdate) {
                                    return 'x-display-hide';
                                } else {
                                    return 'x-hide-display';
                                }
                            },

                            handler: this.updateInfoBonlivraison
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/excel_csv.png',
                            tooltip: 'Generer le fichier CSV pour les etiquettes',
                            scope: this,
                            handler: this.onbtnexport
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/printer.png',
                            tooltip: 'Edition des entrees de reapprovisionnement',
                            scope: this,
                            handler: this.onPdfDetailClick
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/paste_plain.png',
                            tooltip: 'Reediter les etiquettes de cette entree en stock',
                            scope: this,
                            handler: this.onPdfEtiquetteClick
                        }]
                }
            ],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    xtype: 'combobox',
                    name: 'lg_GROSSISTE_ID',
                    margins: '0 0 0 10',
                    id: 'lg_GROSSISTE_ID',
                    store: store_grossiste,
                    //disabled: true,
                    valueField: 'lg_GROSSISTE_ID',
                    displayField: 'str_LIBELLE',
                    typeAhead: true,
                    queryMode: 'remote',
                    flex: 1,
                    pageSize: 999,
                    emptyText: 'Sectionner grossiste...',
                    listeners: {
                        select: function (cmp) {
                            Me.onRechClick();
                        }
                    }

                },
                {
                    xtype: 'datefield',
                    id: 'datedebut',
                    name: 'datedebut',
                    emptyText: 'Date debut',
                    submitFormat: 'Y-m-d',
                    maxValue: new Date(),
                    value: new Date(),
                    flex: 0.7,
                    format: 'd/m/Y',
                    listeners: {
                        'change': function (me) {
                            Ext.getCmp('datefin').setMinValue(me.getValue());
                        }
                    }
                }, {
                    xtype: 'datefield',
                    id: 'datefin',
                    name: 'datefin',
                    emptyText: 'Date fin',
                    maxValue: new Date(),
                    flex: 0.7,
                    value: new Date(),
                    submitFormat: 'Y-m-d',
                    format: 'd/m/Y',
                    listeners: {
                        'change': function (me) {
                            Ext.getCmp('datedebut').setMaxValue(me.getValue());
                        }
                    }
                }, '-',
                {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'rechecher',
                    emptyText: 'Rechercher un BL ou une commande',
                    listeners: {
                        'render': function (cmp) {
                            cmp.getEl().on('keypress', function (e) {
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
                }, '-',
                {
                    text: 'Imprimer',
                    tooltip: 'Imprimer',
                    iconCls: 'printable',
                    scope: this,
                    handler: this.onPrintClick
                }, '-',
                {
                    text: 'Exporter en excel',
                    tooltip: 'Exporter en excel',
                    icon: 'resources/images/icons/fam/excel_icon.png',
                    scope: this,
                    handler: this.onExportToExcel
                }, '-',

                {
                    text: 'GESTION DES QUINZAINES',
                    scope: this,
                    hidden: true,
                    handler: this.onGestionQuinzaine
                }, '-',
                {
                    text: 'REGLER UNE SELECTION DE BL',
                    scope: this,
                    hidden: true,
                    handler: this.onReglerSelectionBL
                }
            ],
            bbar: {
                xtype: 'pagingtoolbar',
                pageSize: 10,
                store: store_etats,
                displayInfo: true,
                plugins: new Ext.ux.ProgressBarPager(), // same store GridPanel is using
                listeners: {
                    beforechange: function (page, currentPage) {
                        let myProxy = this.store.getProxy();
                        myProxy.params = {
                            dtEnd: null,
                            dtStart: null,
                            search: '',
                            grossisteId: ''
                        };
                        let lg_GROSSISTE_ID = "";
                        if (Ext.getCmp('lg_GROSSISTE_ID').getValue()) {
                            lg_GROSSISTE_ID = Ext.getCmp('lg_GROSSISTE_ID').getValue();
                        }
                        myProxy.setExtraParam('dtStart', Ext.getCmp('datedebut').getSubmitValue());
                        myProxy.setExtraParam('dtEnd', Ext.getCmp('datefin').getSubmitValue());
                        myProxy.setExtraParam('search', Ext.getCmp('rechecher').getValue());
                        myProxy.setExtraParam('grossisteId', lg_GROSSISTE_ID);
                    }

                }
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });

    },
    loadStore: function () {
        Me.onRechClick();

    },
    onStoreLoad: function () {


    },
    onbtnexport: function (grid, rowIndex) {

        Ext.MessageBox.confirm('Message',
                'Voulez-vous generer le fichier CSV pour les etiquettes de cette commande?',
                function (btn) {
                    if (btn === 'yes') {
                        const rec = grid.getStore().getAt(rowIndex);
                        window.location = '../DownloadFileServlet?lg_ORDER_ID=' + rec.get('lgBONLIVRAISONID') + '&str_TYPE_ACTION=ETATCONTROLE';
                    }
                });
    },
    onPdfDetailClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        let linkUrl = url_services_pdf_bonlivraison + '?lg_BON_LIVRAISON_ID=' + rec.get('strREFLIVRAISON');
        window.open(linkUrl);

    },
    onPdfEtiquetteClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.stockmanagement.etiquette.action.add({
            odatasource: rec.get('lgBONLIVRAISONID'),
            parentview: this,
            mode: "printer",
            titre: "Edition d'etiquette des produits du bon de livraison [" + rec.get('strREFLIVRAISON') + "]"
        });

    },
    onPrintClick: function () {
        const valeur = Ext.getCmp('rechecher').getValue();
        let lg_GROSSISTE_ID = "";
        if (Ext.getCmp('lg_GROSSISTE_ID').getValue() !== null) {
            lg_GROSSISTE_ID = Ext.getCmp('lg_GROSSISTE_ID').getValue();
        }
        const dtEnd = Ext.getCmp('datefin').getSubmitValue();
        const dtStart = Ext.getCmp('datedebut').getSubmitValue();

        const linkUrl = '../EtatControlStockServlet?dtStart=' + dtStart + '&dtEnd=' + dtEnd
                + '&grossisteId=' + lg_GROSSISTE_ID + '&search=' + valeur;
        window.open(linkUrl);

    },

    onExportToExcel: function () {
        const valeur = Ext.getCmp('rechecher').getValue();
        let lg_GROSSISTE_ID = "";
        if (Ext.getCmp('lg_GROSSISTE_ID').getValue() !== null) {
            lg_GROSSISTE_ID = Ext.getCmp('lg_GROSSISTE_ID').getValue();
        }
        const dtEnd = Ext.getCmp('datefin').getSubmitValue();
        const dtStart = Ext.getCmp('datedebut').getSubmitValue();

        window.location = '../api/v1/etat-control-bon/export-excel?dtStart=' + dtStart + '&dtEnd=' + dtEnd
                + '&grossisteId=' + lg_GROSSISTE_ID + '&search=' + valeur + '&fileType=excel';
      

    },

    onRechClick: function () {
        let lg_GROSSISTE_ID = "";
        if (Ext.getCmp('lg_GROSSISTE_ID').getValue() != null) {
            lg_GROSSISTE_ID = Ext.getCmp('lg_GROSSISTE_ID').getValue();
        }

        if (new Date(Ext.getCmp('datedebut').getSubmitValue()) > new Date(Ext.getCmp('datefin').getSubmitValue())) {
            Ext.MessageBox.alert('Erreur au niveau date', 'La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin');
            return;
        }
        this.getStore().load({
            params: {
                search: Ext.getCmp('rechecher').getValue(),
                grossisteId: lg_GROSSISTE_ID,
                dtStart: Ext.getCmp('datedebut').getSubmitValue(),
                dtEnd: Ext.getCmp('datefin').getSubmitValue()
            }
        });
    },

    onGestionQuinzaine: function () {
        const xtype = "quinzaineManager";
        testextjs.app.getController('App').onLoadNewComponent(xtype, "Gestion des quinzaines", "0");
    },
    onCheckChange: function (column, rowIndex, checked, eOpts) {
        let store = Ext.getCmp('gridID').getStore(), rec = store.getAt(rowIndex);
        if (checked) {
            selectedBL = rec;
            selectedBLs.push(rec);
        } else {
            selectedBL = {};
            if (selectedBLs.indexOf(rec) !== -1) {
                selectedBLs.splice(selectedBLs.indexOf(rec), 1);
            }
        }


        lg_BON_LIVRAISON_ID = selectedBL.get('lgBONLIVRAISONID');
        int_MHT = selectedBL.get('intMHT');

        rec.commit();
    },
    onReglerSelectionBL: function () {
        if (selectedBLs.length === 0) {
            Ext.MessageBox.show({
                title: 'Règlement des Bons de Livraison',
                width: 320,
                msg: 'Aucun bon de Livraison sélectionné.',
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.ERROR,
                fn: function (btn) {
                    btn.up('window').close();
                }
            });

        } else {

            new testextjs.view.commandemanagement.etats.action.paybls({
                selectedBLs: selectedBLs,
                selectedBL: selectedBL,
                titre: 'Règlement de Bons de Livraison[ ' + selectedBL.get('lgBONLIVRAISONID') + ' : ' + selectedBL.get('intMHT') + ' ]'
            });
        }

    },
    updateInfoBonlivraison: function (grid, rowIndex) {
        if (!btnUpdate) {
            return;
        }
        let rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.commandemanagement.cmde_passees.action.edit({
            gridToLoad: 'etatscontrolemanagerID',
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Mise &agrave; jour des informations du Bon de livraison N&deg;" + rec.get('strREFLIVRAISON')
        });
    },
    retourCompletBL: function (view, rowIndex, colIndex, item, e, record, row) {
        let storetypemotif = new Ext.data.Store({
            idProperty: 'lgMOTIFRETOUR',
            fields: [
                {name: 'lgMOTIFRETOUR',
                    type: 'string'

                },
                {name: 'strLIBELLE',
                    type: 'string'

                }
            ],
            pageSize: 999,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/motifs-retour',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });



        const win = Ext.create('Ext.window.Window',
                {
                    extend: 'Ext.window.Window',
                    autoShow: true,
                    height: 220,
                    width: '55%',
                    modal: true,
                    title: 'RETOUR COMPLET DE BON DE LIVRAISON',
                    closeAction: 'hide',
                    closable: true,
                    layout: {
                        type: 'vbox',
                        align: 'stretch'
                    },
                    items: [
                        {
                            xtype: 'form',
                            bodyPadding: 5,
                            modelValidation: true,
                            layout: {
                                type: 'vbox',
                                align: 'stretch'
                            },
                            items: [
                                {
                                    xtype: 'fieldset',
                                    layout: {
                                        type: 'hbox',
                                        align: 'stretch'
                                    },
                                    title: 'Information sur le bl',
                                    items: [
                                        {
                                            xtype: 'displayfield',
                                            fieldLabel: 'Numéro BL',
                                            value: record.get('strREFLIVRAISON'),
                                            labelWidth: 70,
                                            margin: '0 10 0 0',

                                            fieldStyle: "color:green;font-weight: bold;font-size: 1.2em"
                                        },
                                        {
                                            xtype: 'displayfield',
                                            fieldLabel: 'MONATNT TTC',
                                            value: record.get('intHTTC'),
                                            margin: '0 10 0 0',
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight: bold;font-size: 1.2em"
                                        },
                                        {
                                            xtype: 'displayfield',
                                            fieldLabel: 'MONATNT HT',
                                            margin: '0 10 0 0',
                                            value: record.get('intMHT'),
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight: bold;font-size: 1.2em"
                                        },
                                        {
                                            xtype: 'displayfield',
                                            fieldLabel: 'MONATNT TVA',
                                            value: record.get('intTVA'),
                                            renderer: function (v) {
                                                return Ext.util.Format.number(v, '0,000.');
                                            },
                                            fieldStyle: "color:blue;font-weight: bold;font-size: 1.2em"
                                        }

                                    ]

                                },

                                {
                                    xtype: 'fieldset',
                                    title: 'MOTIF DU RETOUR',
                                    layout: 'form',
                                    defaults: {
                                        anchor: '100%',
                                        xtype: 'textfield',
                                        msgTarget: 'side',
                                        labelAlign: 'right',
                                        labelWidth: 115
                                    },
                                    items: [
                                        {
                                            xtype: 'combobox',
                                            fieldLabel: 'Motif',
                                            name: 'lgMOTIFRETOUR',
                                            store: storetypemotif,
                                            valueField: 'lgMOTIFRETOUR',
                                            displayField: 'strLIBELLE',
                                            typeAhead: true,
                                            pageSize: 20,
                                            queryMode: 'remote',
                                            flex: 1,
                                            emptyText: 'Choisir un Motif...',
                                            allowBlank: false

                                        }



                                    ]
                                }

                            ],
                            dockedItems: [
                                {
                                    xtype: 'toolbar',
                                    dock: 'bottom',
                                    ui: 'footer',
                                    layout: {
                                        pack: 'end',
                                        type: 'hbox'
                                    },
                                    items: [
                                        {
                                            xtype: 'button',
                                            text: 'Enregistrer',
                                            handler: function (btn) {
                                                const formulaire = btn.up('form');
                                                if (formulaire.isValid()) {
                                                    let progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                                                    Ext.Ajax.request({
                                                        method: 'PUT',
                                                        headers: {'Content-Type': 'application/json'},
                                                        url: '../api/v1/retourfournisseur/full-bl/' + record.get('lgBONLIVRAISONID'),
                                                        params: Ext.JSON.encode(formulaire.getValues()),
                                                        success: function (response, options) {
                                                            progress.hide();
                                                            const result = Ext.JSON.decode(response.responseText, true);
                                                            if (result.success) {
                                                                win.destroy();
                                                                Me.onRechClick();
                                                            } else {
                                                                Ext.MessageBox.show({
                                                                    title: 'Message d\'erreur',
                                                                    width: 320,
                                                                    msg: result.msg,
                                                                    buttons: Ext.MessageBox.OK,
                                                                    icon: Ext.MessageBox.ERROR

                                                                });
                                                            }

                                                        },
                                                        failure: function (response, options) {
                                                            progress.hide();
                                                            Ext.Msg.alert("Message", 'Erreur du système ' + response.status);
                                                        }

                                                    });
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'button',
                                            text: 'Annuler',
                                            handler: function (btn) {
                                                win.destroy();
                                            }

                                        }
                                    ]
                                }
                            ]
                        }
                    ]

                });
    }

});