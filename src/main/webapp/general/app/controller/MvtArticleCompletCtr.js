/* global Ext */
//Ext.isEmpty(records)
Ext.define('testextjs.controller.MvtArticleCompletCtr', {
    extend: 'Ext.app.Controller',

    views: [
        'testextjs.view.produits.mvtproduit.MonitoringArticleComplet'
    ],
    config: {
        produitId: null
    },
    refs: [

        {
            ref: 'monitoringarticlecomplet',
            selector: 'monitoringarticlecomplet'
        },
        {
            ref: 'mvtGrid',
            selector: 'monitoringarticlecomplet gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'monitoringarticlecomplet gridpanel pagingtoolbar'
        }

        , {
            ref: 'rayonId',
            selector: 'monitoringarticlecomplet #rayonId'
        }, {
            ref: 'categorieId',
            selector: 'monitoringarticlecomplet #categorieId'
        }, {ref: 'dtStart',
            selector: 'monitoringarticlecomplet #dtStart'
        },
        {ref: 'rechercherButton',
            selector: 'monitoringarticlecomplet #rechercher'

        },
        {ref: 'dtEnd',
            selector: 'monitoringarticlecomplet #dtEnd'

        },

        {ref: 'query',
            selector: 'monitoringarticlecomplet #query'

        }
    ],
    init: function (application) {
        this.control({
            'monitoringarticlecomplet gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },

            'monitoringarticlecomplet #query': {
                specialkey: this.doSearch
            },
            'monitoringarticlecomplet #categorieId': {
                select: this.doSearch
            },
            'monitoringarticlecomplet #rayonId': {
                select: this.doSearch
            },
            'monitoringarticlecomplet #rechercher': {
                click: this.doSearch
            },
            'monitoringarticlecomplet gridpanel': {
                viewready: this.doInitStore,
                celldblclick: this.cellClickHandler
            },
            "monitoringarticlecomplet gridpanel actioncolumn": {
                click: this.handleActionColumn
            },
            'monitoringarticlecomplet #imprimer': {
                click: this.onExcelClick
            },
            'monitoringarticlecomplet #imprimerPdf': {
                click: this.onPdfClick
            }


        });
    },
    onSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            const me = this;
            me.doSearch();
        }
    },
    doBeforechange: function (page, currentPage) {
        const me = this;
        const myProxy = me.getMvtGrid().getStore().getProxy();
        myProxy.params = {
            categorieId: null,
            dtStart: null,
            dtEnd: null,
            rayonId: null,
            search: null

        };

        myProxy.setExtraParam('categorieId', me.getCategorieId().getValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('rayonId', me.getRayonId().getValue());
        myProxy.setExtraParam('search', me.getQuery().getValue());
    },
    doBeforechangeItem: function (page, currentPage) {
        const me = this;
        const myProxy = me.getMvtGrid().getStore().getProxy();
        myProxy.params = {
            categorieId: null,
            dtStart: null,
            dtEnd: null,
            rayonId: null,
            search: null

        };

        myProxy.setExtraParam('categorieId', me.getCategorieId().getValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('rayonId', me.getRayonId().getValue());
        myProxy.setExtraParam('search', me.getQuery().getValue());
    },
    // URL des filtres courants pour les sorties serveur (PDF et Excel)
    buildExportUrl: function (suffixe) {
        const me = this;
        let categorieId = me.getCategorieId().getValue();
        const dtStart = me.getDtStart().getSubmitValue();
        const dtEnd = me.getDtEnd().getSubmitValue();
        let rayonId = me.getRayonId().getValue();
        let search = me.getQuery().getValue();

        if (categorieId === null) {
            categorieId = '';
        }
        if (rayonId === null) {
            rayonId = '';
        }
        if (search === null) {
            search = '';
        }
        return '../api/v1/produit/monitoring-complet/' + suffixe + '?dtStart=' + dtStart + '&dtEnd=' + dtEnd
                + '&rayonId=' + rayonId + '&categorieId=' + categorieId + '&search=' + encodeURIComponent(search);
    },
    onPdfClick: function () {
        // Impression PDF A4 paysage, generee cote serveur (iText) : aucun template Jasper a deployer.
        window.open(this.buildExportUrl('pdf'));
    },
    onExcelClick: function () {
        // Export Excel : toutes les lignes filtrees, mouvements internes et les trois stocks compris.
        window.open(this.buildExportUrl('excel'));
    },
    handleActionColumn: function (view, cell, rowIndex, colIndex, e, record) {
        const me = this;
        // Signature reelle de l'evenement click d'une actioncolumn : (view, cellEl, recordIndex,
        // cellIndex, event, record). Le suivi 2 lisait le 3e argument sous le nom "colIndex" ;
        // ici on prend le record fourni par l'evenement, avec repli sur l'index de ligne.
        const rec = (record && record.get) ? record : me.getMvtGrid().getStore().getAt(rowIndex);
        if (!rec) {
            return;
        }
        me.produitId = rec.get('produitId');
        me.buildDetail(rec);

    },

    doInitStore: function () {
        const me = this;
        me.doSearch();
    },

    doSearch: function () {
        const me = this;

        me.getMvtGrid().getStore().load({
            params: {
                categorieId: me.getCategorieId().getValue(),
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue(),
                rayonId: me.getRayonId().getValue(),
                search: me.getQuery().getValue()
            }
        });
    },

    buildDetail: function (rec) {
        var me = this;
        var storeProduits = new Ext.data.Store({
            fields:
                    [
                        {
                            name: 'dateOp',
                            type: 'string'
                        },
                        {
                            name: 'produitId',
                            type: 'string'
                        },
                        {
                            name: 'cip',
                            type: 'string'
                        },
                        {
                            name: 'produitName',
                            type: 'string'
                        }, {
                            name: 'qtyVente',
                            type: 'number'
                        }, {
                            name: 'stockInit',
                            type: 'number'
                        }, {
                            name: 'stockFinal',
                            type: 'number'
                        }
                        , {
                            name: 'qtyAjust',
                            type: 'number'
                        }, {
                            name: 'qtyAnnulation',
                            type: 'number'
                        }
                        , {
                            name: 'qtyRetour',
                            type: 'number'
                        }, {
                            name: 'qtyRetourDepot',
                            type: 'number'
                        }, {
                            name: 'qtyInv',
                            type: 'number'
                        }, {
                            name: 'qtyPerime',
                            type: 'number'
                        }, {
                            name: 'qtyAjustSortie',
                            type: 'number'
                        }, {
                            name: 'qtyDeconEntrant',
                            type: 'number'
                        }, {
                            name: 'qtyDecondSortant',
                            type: 'number'
                        }, {
                            name: 'qtyEntree',
                            type: 'number'
                        },
                        {
                            name: 'ecartInventaire',
                            type: 'number'
                        }, {
                            name: 'qtyVersReserve',
                            type: 'number'
                        }, {
                            name: 'qtyVersRayon',
                            type: 'number'
                        }, {
                            name: 'qtyAjustReserve',
                            type: 'number'
                        }, {
                            name: 'stockReserveInit',
                            type: 'number'
                        }, {
                            name: 'stockReserveFinal',
                            type: 'number'
                        }
                    ],
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/monitoringproduct-complet',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'
                }
            }
        });
        storeProduits.addListener('metachange', function (store, rec) {
            form.query('#qtyEntree')[0].setValue(rec.qtyEntree);
            form.query('#qtyDecondSortant')[0].setValue(rec.qtyDecondSortant);
            form.query('#qtyDeconEntrant')[0].setValue(rec.qtyDeconEntrant);
            form.query('#qtyAjustSortie')[0].setValue(rec.qtyAjustSortie);
            form.query('#qtyVente')[0].setValue(rec.qtyVente);
            form.query('#qtyAjust')[0].setValue(rec.qtyAjust);
            form.query('#qtyAnnulation')[0].setValue(rec.qtyAnnulation);
            form.query('#qtyRetour')[0].setValue(rec.qtyRetour);
            form.query('#qtyRetourDepot')[0].setValue(rec.qtyRetourDepot);
            form.query('#qtyInv')[0].setValue(rec.qtyInv);
            form.query('#qtyPerime')[0].setValue(rec.qtyPerime);
            form.query('#qtyVersReserve')[0].setValue(rec.qtyVersReserve);
            form.query('#qtyVersRayon')[0].setValue(rec.qtyVersRayon);
            form.query('#qtyAjustReserve')[0].setValue(rec.qtyAjustReserve);

        }, this);
        storeProduits.load({
            params: {
                produitId: rec.get('produitId'),
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue()
            }
        });
        var form = Ext.create('Ext.window.Window',
                {
                    xtype: 'mvtdetail',
                    alias: 'widget.mvtdetail',
                    autoShow: true,
                    height: 570,
                    width: '80%',
                    modal: true,
                    title: "Détail de l'article [ " + rec.get('produitName') + " ]",
                    closeAction: 'hide',

                    closable: true,
                    maximizable: true,
                    layout: {
                        type: 'fit'

                    },
                    dockedItems: [
                        {
                            xtype: 'toolbar',
                            dock: 'top',
                            items: [
                                {
                                    text: 'imprimer',
                                    itemId: 'imprimer',
                                    iconCls: 'printable',
                                    tooltip: 'imprimer',
                                    scope: this,
                                    handler: function () {
                                        const dtStart = me.getDtStart().getSubmitValue();
                                        const dtEnd = me.getDtEnd().getSubmitValue();
                                        const produitId = rec.get('produitId');
                                        const linkUrl = '../BalancePdfServlet?mode=SUIVIMVT&dtStart=' + dtStart + '&dtEnd=' + dtEnd + "&produitId=" + produitId;
                                        window.open(linkUrl);
                                    }
                                }
                            ]
                        },
                        {
                            xtype: 'toolbar',
                            dock: 'bottom',
                            items: [
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Vente',
                                    labelWidth: 50,
                                    itemId: 'qtyVente',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;font-weight:600;",
                                    value: 0

                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Ret.Four',
                                    labelWidth: 70,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;font-weight:600;",
                                    itemId: 'qtyRetour',
                                    value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Périmée',
                                    labelWidth: 55,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;font-weight:600;",
                                    itemId: 'qtyPerime',
                                    value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Entrée',
                                    labelWidth: 60,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;font-weight:600;",
                                    itemId: 'qtyEntree',
                                    value: 0

                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Ajust.Entrant',
                                    labelWidth: 80,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;font-weight:600;",
                                    itemId: 'qtyAjust',
                                    value: 0

                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Ajust.Sortant',
                                    labelWidth: 80,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;font-weight:600;",
                                    itemId: 'qtyAjustSortie',
                                    value: 0

                                }
                            ]
                        },

                        {
                            xtype: "toolbar",
                            dock: 'bottom',
                            items: [
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Décon.Entrant',
                                    labelWidth: 85,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;font-weight:600;",
                                    itemId: 'qtyDeconEntrant',
                                    value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Décon.Sortie',
                                    labelWidth: 80,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;font-weight:600;",
                                    itemId: 'qtyDecondSortant',
                                    value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Ret.Dépôt',
                                    labelWidth: 80,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;font-weight:600;",
                                    itemId: 'qtyRetourDepot'
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Inv',
                                    labelWidth: 40,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;font-weight:600;",
                                    itemId: 'qtyInv',
                                    value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Annulation',
                                    labelWidth: 80,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;font-weight:600;",
                                    itemId: 'qtyAnnulation', value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Vers réserve',
                                    labelWidth: 80,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:#7030A0;font-weight:600;",
                                    itemId: 'qtyVersReserve',
                                    value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Vers rayon',
                                    labelWidth: 70,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:#7030A0;font-weight:600;",
                                    itemId: 'qtyVersRayon',
                                    value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Ajust.réserve',
                                    labelWidth: 80,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:#7030A0;font-weight:600;",
                                    itemId: 'qtyAjustReserve',
                                    value: 0
                                }

                            ]
                        }
                    ],
                    items: [
                        {
                            xtype: 'gridpanel',
                            store: storeProduits,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true,
                                enableColumnHide: false

                            },
                            columns: [

                                {
                                    header: 'Date',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'dateOp',
                                    flex: 1
                                },
                                {
                                    text: 'Début de journée',
                                    columns:
                                            [
                                                {
                                                    text: 'Stock rayon',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'stockInit',
                                                    flex: 0.7,
                                                    align: 'right',
                                                    format: '0,000.'
                                                },
                                                {
                                                    text: 'Stock réserve',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'stockReserveInit',
                                                    flex: 0.7,
                                                    align: 'right',
                                                    format: '0,000.'
                                                }
                                            ]
                                },
                                {
                                    text: 'Sortie',
                                    columns:
                                            [
                                                {
                                                    text: 'Vente',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'qtyVente',
                                                    flex: 0.7,
                                                    align: 'right',
                                                    format: '0,000.'
                                                },
                                                {
                                                    text: 'Ret.four',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'qtyRetour',
                                                    flex: 0.7,
                                                    align: 'right',
                                                    format: '0,000.'
                                                },
                                                {
                                                    text: 'Qté.périmé',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'qtyPerime',
                                                    flex: 0.7,
                                                    align: 'right',
                                                    format: '0,000.'
                                                },
                                                {
                                                    text: 'Qté.Ajustée',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'qtyAjustSortie',
                                                    flex: 0.7,
                                                    align: 'right',
                                                    format: '0,000.'
                                                },
                                                {
                                                    text: 'Qté.Décon',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'qtyDecondSortant',
                                                    flex: 0.7,
                                                    align: 'right',
                                                    format: '0,000.'
                                                }
                                            ]
                                },
                                {
                                    text: 'Entrée',
                                    columns:
                                            [
                                                {
                                                    text: 'Qté.Entrée',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'qtyEntree',
                                                    flex: 0.7,
                                                    align: 'right',
                                                    format: '0,000.'
                                                },
                                                {
                                                    text: 'Qté.Ajustée',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'qtyAjust',
                                                    flex: 0.7,
                                                    align: 'right',
                                                    format: '0,000.'
                                                },
                                                {
                                                    text: 'Qté.Décon',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'qtyDeconEntrant',
                                                    flex: 0.7,
                                                    align: 'right',
                                                    format: '0,000.'
                                                },
                                                {
                                                    text: 'Qté.Annulée',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'qtyAnnulation',
                                                    flex: 0.7,
                                                    align: 'right',
                                                    format: '0,000.'
                                                },
                                                {
                                                    text: 'Qté.Ret.Depôt',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'qtyRetourDepot',
                                                    flex: 0.7,
                                                    align: 'right',
                                                    format: '0,000.'
                                                }
                                            ]
                                },
                                {
                                    text: 'Interne réserve',
                                    columns:
                                            [
                                                {
                                                    text: 'Vers réserve',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'qtyVersReserve',
                                                    flex: 0.7,
                                                    align: 'right',
                                                    format: '0,000.'
                                                },
                                                {
                                                    text: 'Vers rayon',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'qtyVersRayon',
                                                    flex: 0.7,
                                                    align: 'right',
                                                    format: '0,000.'
                                                },
                                                {
                                                    text: 'Ajust.rés.',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'qtyAjustReserve',
                                                    flex: 0.7,
                                                    align: 'right',
                                                    format: '0,000.'
                                                }
                                            ]
                                }
                                ,
                                {
                                    text: 'Qté.Inv',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'qtyInv',
                                    flex: 0.7,
                                    align: 'right',
                                    format: '0,000.'
                                },
                                {
                                    text: 'Ecart.Inv',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'ecartInventaire',
                                    flex: 0.7,
                                    align: 'right',
                                    format: '0,000.'
                                },
                                {
                                    text: 'Fin de journée',
                                    columns:
                                            [
                                                {
                                                    text: 'Stock rayon',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'stockFinal',
                                                    flex: 0.7,
                                                    align: 'right',
                                                    format: '0,000.'
                                                },
                                                {
                                                    text: 'Stock réserve',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'stockReserveFinal',
                                                    flex: 0.7,
                                                    align: 'right',
                                                    format: '0,000.'
                                                }
                                            ]
                                }

                            ],

                            bbar: {
                                xtype: 'pagingtoolbar',
                                store: storeProduits,
                                dock: 'bottom',
                                displayInfo: true,
                                beforechange: function (page, currentPage) {
                                    var myProxy = storeProduits.getProxy();
                                    myProxy.params = {
                                        produitId: null,
                                        dtStart: null,
                                        dtEnd: null
                                    };
                                    myProxy.setExtraParam('produitId', rec.get('produitId'));
                                    myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
                                    myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());

                                }
                            }
                        }
                    ]
                });

    },
    buildVenteItems: function (rec) {
        var me = this;
        var storeProduits = new Ext.data.Store({
            fields:
                    [
                        {
                            name: 'dtCREATED',
                            type: 'string'
                        },
                        {
                            name: 'HEURE',
                            type: 'string'
                        },
                        {
                            name: 'operateur',
                            type: 'string'
                        },
                        {
                            name: 'typeVente',
                            type: 'string'
                        }, {
                            name: 'intPRICE',
                            type: 'number'
                        },
                        {
                            name: 'intQUANTITY',
                            type: 'number'
                        }
                    ],
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/monitoring-vente',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        storeProduits.load({
            params: {
                produitId: rec.get('produitId'),
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue()
            }
        });

        var form = Ext.create('Ext.window.Window',
                {
                    autoShow: true,
                    height: 570,
                    width: '80%',
                    modal: true,
                    title: "Détail des ventes de  l'article [ " + rec.get('produitName') + " ]",
                    closeAction: 'hide',
                    closable: true,
                    maximizable: true,
                    layout: {
                        type: 'fit'

                    },

                    items: [
                        {
                            xtype: 'gridpanel',
                            store: storeProduits,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true,
                                enableColumnHide: false

                            },
                            columns: [

                                {
                                    header: 'Date',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'dtCREATED',
                                    flex: 1
                                },
                                {
                                    header: 'Heure',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'HEURE',
                                    flex: 1
                                },

                                {
                                    text: 'Qté.Vendue',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'intQUANTITY',
                                    flex: 0.7,
                                    align: 'right',
                                    format: '0,000.',
                                    renderer: function (v, m, r) {
                                        if (v < 0) {
                                            m.style = 'background-color:#F5BCA9;font-weight:700;';
                                        }
                                        return v;
                                    }

                                },
                                {
                                    text: 'Coût',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'intPRICE',
                                    flex: 0.7,
                                    align: 'right',
                                    format: '0,000.'
                                },
                                {
                                    text: 'Opérateur',
                                    dataIndex: 'operateur',
                                    flex: 1
                                },
                                {
                                    text: 'Type vente',
                                    dataIndex: 'typeVente',
                                    flex: 1
                                }

                            ],

                            bbar: {
                                xtype: 'pagingtoolbar',
                                store: storeProduits,
                                dock: 'bottom',
                                displayInfo: true,
                                beforechange: function (page, currentPage) {
                                    var myProxy = storeProduits.getProxy();
                                    myProxy.params = {
                                        produitId: null,
                                        dtStart: null,
                                        dtEnd: null
                                    };
                                    myProxy.setExtraParam('produitId', rec.get('produitId'));
                                    myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
                                    myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());

                                }
                            }
                        }
                    ]
                });

    },
    buildAjstPositif: function (rec) {
        var me = this;
        var storeAjustements = new Ext.data.Store({
            fields:
                    [
                        {
                            name: 'dtCREATED',
                            type: 'string'
                        },
                        {
                            name: 'HEURE',
                            type: 'string'
                        },
                        {
                            name: 'operateur',
                            type: 'string'
                        },

                        {
                            name: 'intNUMBER',
                            type: 'number'
                        }
                    ],
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/monitoring-ajust',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        storeAjustements.load({
            params: {
                produitId: rec.get('produitId'),
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue(),
                positif: true
            }
        });

        var form = Ext.create('Ext.window.Window',
                {
                    autoShow: true,
                    height: 570,
                    width: '80%',
                    modal: true,
                    title: "Détail des ajustements positifs de  l'article [ " + rec.get('produitName') + " ]",
                    closeAction: 'hide',
                    closable: true,
                    maximizable: true,
                    layout: {
                        type: 'fit'

                    },

                    items: [
                        {
                            xtype: 'gridpanel',
                            store: storeAjustements,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true,
                                enableColumnHide: false

                            },
                            columns: [

                                {
                                    header: 'Date',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'dtCREATED',
                                    flex: 1
                                },
                                {
                                    header: 'Heure',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'HEURE',
                                    flex: 1
                                },

                                {
                                    text: 'Quantité',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'intNUMBER',
                                    flex: 0.7,
                                    sortable: false,
                                    menuDisabled: true,
                                    align: 'right',
                                    format: '0,000.'
                                },

                                {
                                    text: 'Opérateur',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'operateur',
                                    flex: 1
                                }


                            ],

                            bbar: {
                                xtype: 'pagingtoolbar',
                                store: storeAjustements,
                                dock: 'bottom',
                                displayInfo: true,
                                beforechange: function (page, currentPage) {
                                    var myProxy = storeAjustements.getProxy();
                                    myProxy.params = {
                                        produitId: null,
                                        dtStart: null,
                                        dtEnd: null,
                                        positif: true
                                    };
                                    myProxy.setExtraParam('positif', true);
                                    myProxy.setExtraParam('produitId', rec.get('produitId'));
                                    myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
                                    myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());

                                }
                            }
                        }
                    ]
                });

    },
    buildAjstNegatif: function (rec) {
        var me = this;
        var storeAjustements = new Ext.data.Store({
            fields:
                    [
                        {
                            name: 'dtCREATED',
                            type: 'string'
                        },
                        {
                            name: 'HEURE',
                            type: 'string'
                        },
                        {
                            name: 'operateur',
                            type: 'string'
                        },

                        {
                            name: 'intNUMBER',
                            type: 'number'
                        }
                    ],
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/monitoring-ajust',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        storeAjustements.load({
            params: {
                produitId: rec.get('produitId'),
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue(),
                positif: false
            }
        });

        var form = Ext.create('Ext.window.Window',
                {
                    autoShow: true,
                    height: 570,
                    width: '80%',
                    modal: true,
                    title: "Détail des ajustements négatifs de  l'article [ " + rec.get('produitName') + " ]",
                    closeAction: 'hide',
                    closable: true,
                    maximizable: true,
                    layout: {
                        type: 'fit'

                    },

                    items: [
                        {
                            xtype: 'gridpanel',
                            store: storeAjustements,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true,
                                enableColumnHide: false

                            },
                            columns: [

                                {
                                    header: 'Date',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'dtCREATED',
                                    flex: 1
                                },
                                {
                                    header: 'Heure',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'HEURE',
                                    flex: 1
                                },

                                {
                                    text: 'Quantité',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'intNUMBER',
                                    flex: 0.7,
                                    sortable: false,
                                    menuDisabled: true,
                                    align: 'right',
                                    format: '0,000.'
                                },

                                {
                                    text: 'Opérateur',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'operateur',
                                    flex: 1
                                }


                            ],

                            bbar: {
                                xtype: 'pagingtoolbar',
                                store: storeAjustements,
                                dock: 'bottom',
                                displayInfo: true,
                                beforechange: function (page, currentPage) {
                                    var myProxy = storeAjustements.getProxy();
                                    myProxy.params = {
                                        produitId: null,
                                        dtStart: null,
                                        dtEnd: null,
                                        positif: false
                                    };
                                    myProxy.setExtraParam('positif', false);
                                    myProxy.setExtraParam('produitId', rec.get('produitId'));
                                    myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
                                    myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());

                                }
                            }
                        }
                    ]
                });

    },
    buildRetour: function (rec) {
        var me = this;
        var storeAjustements = new Ext.data.Store({
            fields:
                    [
                        {
                            name: 'dtCREATED',
                            type: 'string'
                        },
                        {
                            name: 'HEURE',
                            type: 'string'
                        },
                        {
                            name: 'operateur',
                            type: 'string'
                        },
                        {
                            name: 'strLIBELLE',
                            type: 'string'
                        }, {
                            name: 'motif',
                            type: 'string'
                        },
                        {
                            name: 'intNUMBERRETURN',
                            type: 'number'
                        }
                    ],
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/monitoring-retour',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        storeAjustements.load({
            params: {
                produitId: rec.get('produitId'),
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue()

            }
        });

        var form = Ext.create('Ext.window.Window',
                {
                    autoShow: true,
                    height: 570,
                    width: '80%',
                    modal: true,
                    title: "Détail des retours fournisseur de  l'article [ " + rec.get('produitName') + " ]",
                    closeAction: 'hide',
                    closable: true,
                    maximizable: true,
                    layout: {
                        type: 'fit'

                    },

                    items: [
                        {
                            xtype: 'gridpanel',
                            store: storeAjustements,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true,
                                enableColumnHide: false

                            },
                            columns: [

                                {
                                    header: 'Date',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'dtCREATED',
                                    flex: 1
                                },
                                {
                                    header: 'Heure',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'HEURE',
                                    flex: 1
                                },

                                {
                                    text: 'Quantité Retournée',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'intNUMBERRETURN',
                                    flex: 1,
                                    sortable: false,
                                    menuDisabled: true,
                                    align: 'right',
                                    format: '0,000.'
                                },
                                {
                                    text: 'Motif.Retour',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'motif',
                                    flex: 1
                                }
                                ,
                                {
                                    text: 'Opérateur',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'operateur',
                                    flex: 1
                                },
                                {
                                    text: 'Fournisseur',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'strLIBELLE',
                                    flex: 1
                                }


                            ],

                            bbar: {
                                xtype: 'pagingtoolbar',
                                store: storeAjustements,
                                dock: 'bottom',
                                displayInfo: true,
                                beforechange: function (page, currentPage) {
                                    var myProxy = storeAjustements.getProxy();
                                    myProxy.params = {
                                        produitId: null,
                                        dtStart: null,
                                        dtEnd: null
                                    };
                                    myProxy.setExtraParam('produitId', rec.get('produitId'));
                                    myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
                                    myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());

                                }
                            }
                        }
                    ]
                });

    },
    buildDeconPositif: function (rec) {
        var me = this;
        var storeAjustements = new Ext.data.Store({
            fields:
                    [
                        {
                            name: 'dtCREATED',
                            type: 'string'
                        },
                        {
                            name: 'HEURE',
                            type: 'string'
                        },
                        {
                            name: 'operateur',
                            type: 'string'
                        },

                        {
                            name: 'intNUMBERRETURN',
                            type: 'number'
                        }
                    ],
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/monitoring-decon',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        storeAjustements.load({
            params: {
                produitId: rec.get('produitId'),
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue(),
                positif: true
            }
        });

        var form = Ext.create('Ext.window.Window',
                {
                    autoShow: true,
                    height: 570,
                    width: '80%',
                    modal: true,
                    title: "Détail des déconditionnements de  l'article [ " + rec.get('produitName') + " ]",
                    closeAction: 'hide',
                    closable: true,
                    maximizable: true,
                    layout: {
                        type: 'fit'

                    },

                    items: [
                        {
                            xtype: 'gridpanel',
                            store: storeAjustements,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true,
                                enableColumnHide: false

                            },
                            columns: [

                                {
                                    header: 'Date',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'dtCREATED',
                                    flex: 1
                                },
                                {
                                    header: 'Heure',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'HEURE',
                                    flex: 1
                                },

                                {
                                    text: 'Quantité',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'intNUMBERRETURN',
                                    flex: 0.7,
                                    sortable: false,
                                    menuDisabled: true,
                                    align: 'right',
                                    format: '0,000.'
                                },

                                {
                                    text: 'Opérateur',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'operateur',
                                    flex: 1
                                }


                            ],

                            bbar: {
                                xtype: 'pagingtoolbar',
                                store: storeAjustements,
                                dock: 'bottom',
                                displayInfo: true,
                                beforechange: function (page, currentPage) {
                                    var myProxy = storeAjustements.getProxy();
                                    myProxy.params = {
                                        produitId: null,
                                        dtStart: null,
                                        dtEnd: null,
                                        positif: true
                                    };
                                    myProxy.setExtraParam('positif', true);
                                    myProxy.setExtraParam('produitId', rec.get('produitId'));
                                    myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
                                    myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());

                                }
                            }
                        }
                    ]
                });

    },
    buildDeconNegatif: function (rec) {
        var me = this;
        var storeAjustements = new Ext.data.Store({
            fields:
                    [
                        {
                            name: 'dtCREATED',
                            type: 'string'
                        },
                        {
                            name: 'HEURE',
                            type: 'string'
                        },
                        {
                            name: 'operateur',
                            type: 'string'
                        },

                        {
                            name: 'intNUMBERRETURN',
                            type: 'number'
                        }
                    ],
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/monitoring-decon',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        storeAjustements.load({
            params: {
                produitId: rec.get('produitId'),
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue(),
                positif: false
            }
        });

        var form = Ext.create('Ext.window.Window',
                {
                    autoShow: true,
                    height: 570,
                    width: '80%',
                    modal: true,
                    title: "Détail des déconditionnements de  l'article [ " + rec.get('produitName') + " ]",
                    closeAction: 'hide',
                    closable: true,
                    maximizable: true,
                    layout: {
                        type: 'fit'

                    },

                    items: [
                        {
                            xtype: 'gridpanel',
                            store: storeAjustements,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true,
                                enableColumnHide: false

                            },
                            columns: [

                                {
                                    header: 'Date',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'dtCREATED',
                                    flex: 1
                                },
                                {
                                    header: 'Heure',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'HEURE',
                                    flex: 1
                                },

                                {
                                    text: 'Quantité',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'intNUMBERRETURN',
                                    flex: 0.7,
                                    sortable: false,
                                    menuDisabled: true,
                                    align: 'right',
                                    format: '0,000.'
                                },

                                {
                                    text: 'Opérateur',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'operateur',
                                    flex: 1
                                }


                            ],

                            bbar: {
                                xtype: 'pagingtoolbar',
                                store: storeAjustements,
                                dock: 'bottom',
                                displayInfo: true,
                                beforechange: function (page, currentPage) {
                                    var myProxy = storeAjustements.getProxy();
                                    myProxy.params = {
                                        produitId: null,
                                        dtStart: null,
                                        dtEnd: null,
                                        positif: false
                                    };
                                    myProxy.setExtraParam('positif', false);
                                    myProxy.setExtraParam('produitId', rec.get('produitId'));
                                    myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
                                    myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());

                                }
                            }
                        }
                    ]
                });

    },
    buildVenteAnnule: function (rec) {
        var me = this;
        var storeProduits = new Ext.data.Store({
            fields:
                    [
                        {
                            name: 'dtCREATED',
                            type: 'string'
                        },
                        {
                            name: 'HEURE',
                            type: 'string'
                        },
                        {
                            name: 'operateur',
                            type: 'string'
                        },
                        {
                            name: 'typeVente',
                            type: 'string'
                        }, {
                            name: 'intPRICE',
                            type: 'number'
                        },
                        {
                            name: 'intQUANTITY',
                            type: 'number'
                        }
                    ],
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/monitoring-vente-annule',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        storeProduits.load({
            params: {
                produitId: rec.get('produitId'),
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue()
            }
        });

        var form = Ext.create('Ext.window.Window',
                {
                    autoShow: true,
                    height: 570,
                    width: '80%',
                    modal: true,
                    title: "Détail des ventes annulées de  l'article [ " + rec.get('produitName') + " ]",
                    closeAction: 'hide',
                    closable: true,
                    maximizable: true,
                    layout: {
                        type: 'fit'

                    },

                    items: [
                        {
                            xtype: 'gridpanel',
                            store: storeProduits,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true,
                                enableColumnHide: false

                            },
                            columns: [

                                {
                                    header: 'Date',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'dtCREATED',
                                    flex: 1
                                },
                                {
                                    header: 'Heure',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'HEURE',
                                    flex: 1
                                },

                                {
                                    text: 'Qté.Annulée',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'intQUANTITY',
                                    flex: 0.7,
                                    align: 'right',
                                    format: '0,000.'
                                },
                                {
                                    text: 'Coût',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'intPRICE',
                                    flex: 0.7,
                                    align: 'right',
                                    format: '0,000.'
                                },
                                {
                                    text: 'Opérateur',
                                    dataIndex: 'operateur',
                                    flex: 1
                                },
                                {
                                    text: 'Type vente',
                                    dataIndex: 'typeVente',
                                    flex: 1
                                }

                            ],

                            bbar: {
                                xtype: 'pagingtoolbar',
                                store: storeProduits,
                                dock: 'bottom',
                                displayInfo: true,
                                beforechange: function (page, currentPage) {
                                    var myProxy = storeProduits.getProxy();
                                    myProxy.params = {
                                        produitId: null,
                                        dtStart: null,
                                        dtEnd: null
                                    };
                                    myProxy.setExtraParam('produitId', rec.get('produitId'));
                                    myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
                                    myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());

                                }
                            }
                        }
                    ]
                });

    },
    buildInventaire: function (rec) {
        var me = this;
        var storeProduits = new Ext.data.Store({
            fields:
                    [
                        {
                            name: 'dtCREATED',
                            type: 'string'
                        },
                        {
                            name: 'HEURE',
                            type: 'string'
                        },
                        {
                            name: 'operateur',
                            type: 'string'
                        }
                        , {
                            name: 'intNUMBERRETURN',
                            type: 'number'
                        },
                        {
                            name: 'intNUMBERANSWER',
                            type: 'number'
                        },
                        {
                            name: 'qtyMvt',
                            type: 'number'
                        }
                    ],
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/monitoringinventaire',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        storeProduits.load({
            params: {
                produitId: rec.get('produitId'),
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue()
            }
        });

        var form = Ext.create('Ext.window.Window',
                {
                    autoShow: true,
                    height: 570,
                    width: '80%',
                    modal: true,
                    title: "Détail des invenatire de  l'article [ " + rec.get('produitName') + " ]",
                    closeAction: 'hide',
                    closable: true,
                    maximizable: true,
                    layout: {
                        type: 'fit'

                    },

                    items: [
                        {
                            xtype: 'gridpanel',
                            store: storeProduits,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true,
                                enableColumnHide: false

                            },
                            columns: [

                                {
                                    header: 'Date',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'dtCREATED',
                                    flex: 1
                                },
                                {
                                    header: 'Heure',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'HEURE',
                                    flex: 1
                                },

                                {
                                    text: 'Qté.Initiale',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'intNUMBERRETURN',
                                    flex: 1,
                                    align: 'right',
                                    format: '0,000.'
                                },
                                {
                                    text: 'Qté.saisie',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'qtyMvt',
                                    flex: 1,
                                    align: 'right',
                                    format: '0,000.'
                                },
                                {
                                    text: 'Qté.Finale',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'intNUMBERANSWER',
                                    flex: 0.7,
                                    align: 'right',
                                    format: '0,000.'
                                },
                                {
                                    text: 'Opérateur',
                                    dataIndex: 'operateur',
                                    flex: 1
                                }

                            ],

                            bbar: {
                                xtype: 'pagingtoolbar',
                                store: storeProduits,
                                dock: 'bottom',
                                displayInfo: true,
                                beforechange: function (page, currentPage) {
                                    var myProxy = storeProduits.getProxy();
                                    myProxy.params = {
                                        produitId: null,
                                        dtStart: null,
                                        dtEnd: null
                                    };
                                    myProxy.setExtraParam('produitId', rec.get('produitId'));
                                    myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
                                    myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());

                                }
                            }
                        }
                    ]
                });

    },
    buildEntree: function (rec) {
        var me = this;
        var storeProduits = new Ext.data.Store({
            fields:
                    [
                        {
                            name: 'dtCREATED',
                            type: 'string'
                        },
                        {
                            name: 'HEURE',
                            type: 'string'
                        },
                        {
                            name: 'operateur',
                            type: 'string'
                        }, {
                            name: 'intNUMLOT',
                            type: 'string'
                        }, {
                            name: 'peremption',
                            type: 'string'
                        }, {
                            name: 'grossiste',
                            type: 'string'
                        }

                        , {
                            name: 'amount',
                            type: 'number'
                        },
                        {
                            name: 'intNUMBER',
                            type: 'number'
                        }

                    ],
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/monitoringentresbl',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        storeProduits.load({
            params: {
                produitId: rec.get('produitId'),
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue()
            }
        });

        var form = Ext.create('Ext.window.Window',
                {
                    autoShow: true,
                    height: 570,
                    width: '80%',
                    modal: true,
                    title: "Détail des entrées en stock de  l'article [ " + rec.get('produitName') + " ]",
                    closeAction: 'hide',
                    closable: true,
                    maximizable: true,
                    layout: {
                        type: 'fit'

                    },

                    items: [
                        {
                            xtype: 'gridpanel',
                            store: storeProduits,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true,
                                enableColumnHide: false

                            },
                            columns: [

                                {
                                    header: 'Date',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'dtCREATED',
                                    flex: 1
                                },
                                {
                                    header: 'Heure',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'HEURE',
                                    flex: 1
                                },

                                {
                                    text: 'Qté.Entrée',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'intNUMBER',
                                    flex: 1,
                                    align: 'right',
                                    format: '0,000.'
                                },
                                {
                                    text: 'Coût',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'amount',
                                    flex: 1,
                                    align: 'right',
                                    format: '0,000.'
                                },

                                {
                                    text: 'Opérateur',
                                    dataIndex: 'operateur',
                                    flex: 1
                                },
                                {
                                    text: 'Num.Lot',
                                    dataIndex: 'intNUMLOT',
                                    flex: 1
                                }, {
                                    text: 'Repartiteur',
                                    dataIndex: 'grossiste',
                                    flex: 1
                                }, {
                                    text: 'Date.Péremption',
                                    dataIndex: 'peremption',
                                    flex: 1
                                }

                            ],

                            bbar: {
                                xtype: 'pagingtoolbar',
                                store: storeProduits,
                                dock: 'bottom',
                                displayInfo: true,
                                beforechange: function (page, currentPage) {
                                    var myProxy = storeProduits.getProxy();
                                    myProxy.params = {
                                        produitId: null,
                                        dtStart: null,
                                        dtEnd: null
                                    };
                                    myProxy.setExtraParam('produitId', rec.get('produitId'));
                                    myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
                                    myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());

                                }
                            }
                        }
                    ]
                });

    },

    buildPerimes: function (rec) {
        var me = this;
        var storeProduits = new Ext.data.Store({
            fields:
                    [
                        {
                            name: 'dtCREATED',
                            type: 'string'
                        },
                        {
                            name: 'HEURE',
                            type: 'string'
                        },
                        {
                            name: 'operateur',
                            type: 'string'
                        }, {
                            name: 'intNUMLOT',
                            type: 'string'
                        }, {
                            name: 'peremption',
                            type: 'string'
                        }

                        , {
                            name: 'amount',
                            type: 'number'
                        },
                        {
                            name: 'intNUMBER',
                            type: 'number'
                        }

                    ],
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/monitoringperimes',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        storeProduits.load({
            params: {
                produitId: rec.get('produitId'),
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue()
            }
        });

        var form = Ext.create('Ext.window.Window',
                {
                    autoShow: true,
                    height: 570,
                    width: '80%',
                    modal: true,
                    title: "Détail des périmés de  l'article [ " + rec.get('produitName') + " ]",
                    closeAction: 'hide',
                    closable: true,
                    maximizable: true,
                    layout: {
                        type: 'fit'

                    },

                    items: [
                        {
                            xtype: 'gridpanel',
                            store: storeProduits,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true,
                                enableColumnHide: false

                            },
                            columns: [

                                {
                                    header: 'Date',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'dtCREATED',
                                    flex: 1
                                },
                                {
                                    header: 'Heure',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'HEURE',
                                    flex: 1
                                },

                                {
                                    text: 'Qté.périmée',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'intNUMBER',
                                    flex: 1,
                                    align: 'right',
                                    format: '0,000.'
                                },
                                {
                                    text: 'Coût',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'amount',
                                    flex: 1,
                                    align: 'right',
                                    format: '0,000.'
                                },

                                {
                                    text: 'Opérateur',
                                    dataIndex: 'operateur',
                                    flex: 1
                                },
                                {
                                    text: 'Num.Lot',
                                    dataIndex: 'intNUMLOT',
                                    flex: 1
                                }, {
                                    text: 'Date.Péremption',
                                    dataIndex: 'peremption',
                                    flex: 1
                                }

                            ],

                            bbar: {
                                xtype: 'pagingtoolbar',
                                store: storeProduits,
                                dock: 'bottom',
                                displayInfo: true,
                                beforechange: function (page, currentPage) {
                                    var myProxy = storeProduits.getProxy();
                                    myProxy.params = {
                                        produitId: null,
                                        dtStart: null,
                                        dtEnd: null
                                    };
                                    myProxy.setExtraParam('produitId', rec.get('produitId'));
                                    myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
                                    myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());

                                }
                            }
                        }
                    ]
                });

    },

    buildRetourDepot: function (rec) {
        var me = this;
        var storeAjustements = new Ext.data.Store({
            fields:
                    [
                        {
                            name: 'dtCREATED',
                            type: 'string'
                        },
                        {
                            name: 'HEURE',
                            type: 'string'
                        },
                        {
                            name: 'operateur',
                            type: 'string'
                        },

                        {
                            name: 'intNUMBERRETURN',
                            type: 'number'
                        }
                    ],
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/monitoring-retourdepot',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        storeAjustements.load({
            params: {
                produitId: rec.get('produitId'),
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue()

            }
        });

        var form = Ext.create('Ext.window.Window',
                {
                    autoShow: true,
                    height: 570,
                    width: '80%',
                    modal: true,
                    title: "Détail des retours dépôt de  l'article [ " + rec.get('produitName') + " ]",
                    closeAction: 'hide',
                    closable: true,
                    maximizable: true,
                    layout: {
                        type: 'fit'

                    },

                    items: [
                        {
                            xtype: 'gridpanel',
                            store: storeAjustements,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true,
                                enableColumnHide: false

                            },
                            columns: [

                                {
                                    header: 'Date',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'dtCREATED',
                                    flex: 1
                                },
                                {
                                    header: 'Heure',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'HEURE',
                                    flex: 1
                                },

                                {
                                    text: 'Quantité Retournée',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'intNUMBERRETURN',
                                    flex: 1,
                                    sortable: false,
                                    menuDisabled: true,
                                    align: 'right',
                                    format: '0,000.'
                                },

                                {
                                    text: 'Opérateur',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'operateur',
                                    flex: 1
                                },
                            ],

                            bbar: {
                                xtype: 'pagingtoolbar',
                                store: storeAjustements,
                                dock: 'bottom',
                                displayInfo: true,
                                beforechange: function (page, currentPage) {
                                    var myProxy = storeAjustements.getProxy();
                                    myProxy.params = {
                                        produitId: null,
                                        dtStart: null,
                                        dtEnd: null
                                    };
                                    myProxy.setExtraParam('produitId', rec.get('produitId'));
                                    myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
                                    myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());

                                }
                            }
                        }
                    ]
                });

    },

    buildMouvementsReserve: function (rec) {
        // Detail des mouvements internes rayon<->reserve : memes informations que l'historique du
        // module Reserve (stocks avant/apres, utilisateur, annulations), limitees a l'article et a
        // la periode affichee. L'emplacement est impose cote serveur.
        var me = this;
        var storeMouvements = new Ext.data.Store({
            fields:
                    [
                        {
                            name: 'dt_CREATED',
                            type: 'string'
                        },
                        {
                            name: 'str_TYPE',
                            type: 'string'
                        },
                        {
                            name: 'str_MOUVEMENT',
                            type: 'string'
                        }, {
                            name: 'int_QTE',
                            type: 'number'
                        }, {
                            name: 'int_STOCK_RAYON_AVANT',
                            type: 'number'
                        }, {
                            name: 'int_STOCK_RAYON_APRES',
                            type: 'number'
                        }, {
                            name: 'int_STOCK_RESERVE_AVANT',
                            type: 'number'
                        }, {
                            name: 'int_STOCK_RESERVE_APRES',
                            type: 'number'
                        }, {
                            name: 'str_USER',
                            type: 'string'
                        }, {
                            name: 'bl_EST_ANNULATION',
                            type: 'boolean'
                        }, {
                            name: 'bl_ANNULE',
                            type: 'boolean'
                        }, {
                            name: 'str_MOTIF_ANNULATION',
                            type: 'string'
                        }
                    ],
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/monitoring-reserve',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }
        });
        storeMouvements.load({
            params: {
                produitId: rec.get('produitId'),
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue()
            }
        });

        Ext.create('Ext.window.Window',
                {
                    autoShow: true,
                    height: 570,
                    width: '80%',
                    modal: true,
                    title: "Mouvements internes réserve de l'article [ " + rec.get('produitName') + " ]",
                    closeAction: 'hide',
                    closable: true,
                    maximizable: true,
                    layout: {
                        type: 'fit'

                    },

                    items: [
                        {
                            xtype: 'gridpanel',
                            store: storeMouvements,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true,
                                enableColumnHide: false

                            },
                            columns: [

                                {
                                    header: 'Date',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'dt_CREATED',
                                    flex: 1
                                },
                                {
                                    header: 'Mouvement',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'str_MOUVEMENT',
                                    flex: 1.2,
                                    renderer: function (v, m, r) {
                                        if (r.get('bl_EST_ANNULATION')) {
                                            return v + ' (annulation)';
                                        }
                                        if (r.get('bl_ANNULE')) {
                                            m.style = 'text-decoration:line-through;';
                                        }
                                        return v;
                                    }
                                },
                                {
                                    text: 'Qté',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'int_QTE',
                                    flex: 0.5,
                                    align: 'right',
                                    format: '0,000.'
                                },
                                {
                                    text: 'Rayon avant',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'int_STOCK_RAYON_AVANT',
                                    flex: 0.7,
                                    align: 'right',
                                    format: '0,000.'
                                },
                                {
                                    text: 'Rayon après',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'int_STOCK_RAYON_APRES',
                                    flex: 0.7,
                                    align: 'right',
                                    format: '0,000.'
                                },
                                {
                                    text: 'Réserve avant',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'int_STOCK_RESERVE_AVANT',
                                    flex: 0.7,
                                    align: 'right',
                                    format: '0,000.'
                                },
                                {
                                    text: 'Réserve après',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'int_STOCK_RESERVE_APRES',
                                    flex: 0.7,
                                    align: 'right',
                                    format: '0,000.'
                                },
                                {
                                    text: 'Opérateur',
                                    dataIndex: 'str_USER',
                                    flex: 1
                                },
                                {
                                    text: 'Motif annulation',
                                    dataIndex: 'str_MOTIF_ANNULATION',
                                    flex: 1
                                }

                            ],

                            bbar: {
                                xtype: 'pagingtoolbar',
                                store: storeMouvements,
                                dock: 'bottom',
                                displayInfo: true,
                                beforechange: function (page, currentPage) {
                                    var myProxy = storeMouvements.getProxy();
                                    myProxy.params = {
                                        produitId: null,
                                        dtStart: null,
                                        dtEnd: null
                                    };
                                    myProxy.setExtraParam('produitId', rec.get('produitId'));
                                    myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
                                    myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());

                                }
                            }
                        }
                    ]
                });

    },

    cellClickHandler: function (view, cell, cellIndex, record, row, rowIndex, e) {
        const me = this;
        const clickedDataIndex = view.panel.headerCt.getHeaderAtIndex(cellIndex).dataIndex;

        switch (clickedDataIndex) {
            case 'qtyVente':
                me.buildVenteItems(record);
                break;
            case 'qtyAjust':
                me.buildAjstPositif(record);
                break;
            case 'qtyAjustSortie':
                me.buildAjstNegatif(record);
                break;
            case 'qtyRetour':
                me.buildRetour(record);
                break;
            case 'qtyDeconEntrant':
                me.buildDeconPositif(record);
                break;
            case 'qtyDecondSortant':
                me.buildDeconNegatif(record);
                break;
            case 'qtyAnnulation':
                me.buildVenteAnnule(record);
                break;
            case 'qtyInv':
                me.buildInventaire(record);
                break;
            case 'qtyEntree':
                me.buildEntree(record);
                break;
            case 'qtyPerime':
                me.buildPerimes(record);
                break;
            case 'qtyRetourDepot':
                me.buildRetourDepot(record);
                break;
            case 'qtyVersReserve':
            case 'qtyVersRayon':
            case 'qtyAjustReserve':
                me.buildMouvementsReserve(record);
                break;
            default:
                break;
        }


    }

});

