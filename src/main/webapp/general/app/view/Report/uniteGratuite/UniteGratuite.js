/* global Ext */


var Me;
var view_title;

Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

// Onglet 1 : suivi des UG par bon de livraison / periode (ecran historique)
Ext.define('testextjs.view.Report.uniteGratuite.UniteGratuiteGrid', {
    extend: 'Ext.grid.Panel',
    xtype: 'ugmanagergrid',
    id: 'ugmanagergridID',
    title: 'Unités gratuites',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.UG',
        'testextjs.model.Grossiste'
    ],
    frame: true,
    initComponent: function () {
        var searchstore = Ext.create('testextjs.store.Statistics.Grossistes');
        Me = this;
        var store = Ext.create('testextjs.store.Statistics.UgStore');
        store.on({
            'load': {
                fn: function (store, records, success, eOpts) {
                    Ext.getCmp('TOTALMONTANTUG').setValue(0);

                    Ext.getCmp('QTEUGPERIODE').setValue(0);
                    Ext.getCmp('MONTANTUGPERIODE').setValue(0);

                    Ext.each(records, function (record, index, records) {
                        if (index > 0) {
                            return;
                        }
                        Ext.getCmp('TOTALMONTANTUG').setValue(record.get('TOTALAMONT'));
                        Ext.getCmp('QTEUGPERIODE').setValue(record.get('TOTALQTYINI'));
                        Ext.getCmp('MONTANTUGPERIODE').setValue(record.get('TOTALAMONTINI'));

                    }

                    , this);

                },
                scope: this
            }
        });




        Ext.apply(this, {
            width: '98%',
//            cls: 'custompanel',
            // height:Ext.getBody().getViewSize().height*0.85,
            minHeight: 570,
            maxHeight: 570,
            cls: 'custompanel',
            id: 'Grid_UG_ID',
            features: [
                {
                    ftype: 'groupingsummary',
//                   
                    showSummaryRow: true
                }],

            store: store,
            columns: [{
                    header: 'GROSSISTE',
                    dataIndex: 'GROSSISTE',
                    flex: 1/*,
                     summaryType: "count",
                     summaryRenderer: function (value) {
                     return "<b>Nombre de produits </b><span style='color:blue;font-weight:600;'>" + value + "</span>";
                     
                     }*/

                },
                {
                    header: 'BL',
                    dataIndex: 'BLREF',
                    flex: 1

                }


                , {
                    header: 'CIP',
                    dataIndex: 'CIP',

                    flex: 1
                }
                , {
                    header: 'LIBELLE PRODUIT',
                    dataIndex: 'NAME',
                    flex: 2

                }
                ,
                {
                    header: 'QTE.UG',
                    dataIndex: 'QTYINI',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1/*,
                     summaryType: "sum",
                     summaryRenderer: function (value) {
                     return "<span style='color:blue;font-weight:600;'>" + Ext.util.Format.number(Ext.Number.toFixed(value, 0), '0,000.') + "</span> ";
                     }*/
                }


                /* , {
                 header: 'QTE.DISPO',
                 dataIndex: 'QTY',
                 renderer: amountformat,
                 align: 'right',
                 flex: 1
                 }*/
                , {
                    header: 'PRIX.U',
                    dataIndex: 'PRIXVENTE',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1

                }, {
                    header: 'PRIX.A',
                    dataIndex: 'PRIXACHAT',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1

                }
                , {
                    header: 'MONTANT ACHAT',
                    dataIndex: 'VALEURVENTE',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1/*,
                     summaryType: "sum",
                     summaryRenderer: function (value) {
                     return "<span style='color:blue;font-weight:600;'>" + Ext.util.Format.number(Ext.Number.toFixed(value, 0), '0,000.') + " FCFA</span> ";
                     }*/


                }, {
                    header: 'MONTANT VENTE',
                    dataIndex: 'VALEURQTYINI',
                    renderer: amountformat,
                    align: 'right',
                    flex: 1


                }
            ],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [{
                    xtype: 'textfield',
                    id: 'UG_search',

                    width: 150,
                    emptyText: 'Rech',
                    listeners: {
                        'render': function (cmp) {
                            cmp.getEl().on('keypress', function (e) {
                                if (e.getKey() === e.ENTER) {

                                    var UG_search = Ext.getCmp('UG_search').getValue();
                                    var OGrid = Ext.getCmp('Grid_UG_ID'), lgGrossiste = '';

                                    var dt_fin = '', dt_debut = '';
                                    if (Ext.getCmp('lg_GROSSISTE_ID_CB').getValue() != null && Ext.getCmp('lg_GROSSISTE_ID_CB').getValue() != "") {
                                        lgGrossiste = Ext.getCmp('lg_GROSSISTE_ID_CB').getValue();
                                    }

                                    if (Ext.getCmp('datefin').getSubmitValue() != null && Ext.getCmp('datefin').getSubmitValue() != "") {
                                        dt_fin = Ext.getCmp('datefin').getSubmitValue();
                                    }


                                    if (Ext.getCmp('datedebut').getSubmitValue() != null && Ext.getCmp('datedebut').getSubmitValue() != "") {
                                        dt_debut = Ext.getCmp('datedebut').getSubmitValue();
                                    }
                                    OGrid.getStore().load({
                                        params: {
                                            lgGrossiste: lgGrossiste,
                                            dt_end_vente: dt_fin,
                                            dt_start_vente: dt_debut,
                                            search_value: UG_search

                                        }
                                    });



                                }
                            });
                        }
                    }
                }, {
                    xtype: 'combobox',
                   
                    margins: '0 0 0 10',
                    id: 'lg_GROSSISTE_ID_CB',
                   
                    store: searchstore,
                    //disabled: true,
                    valueField: 'lg_GROSSISTE_ID',
                    displayField: 'str_LIBELLE',
                    typeAhead: false,
                    queryMode: 'remote',
                    pageSize: 999,
                    minChars: 2,
                    flex: 1,
                    enableKeyEvents: true,
                    emptyText: 'Sectionner un Grossiste...',
                    listeners: {
                        keypress: function (field, e) {

                            if (e.getKey() === e.BACKSPACE || e.getKey() === 46) {

                                if (field.getValue().length <= 2) {
                                    field.getStore().load();
                                }
                                // alert(e.BACKSPACE);
                            }

                        },
                        select: function (cmp) {
                            var value = cmp.getValue();

                            var OGrid = Ext.getCmp('Grid_UG_ID');
                            var dt_fin = '', dt_debut = '';
                            if (Ext.getCmp('datefin').getSubmitValue() !== null && Ext.getCmp('datefin').getSubmitValue() !== "") {
                                dt_fin = Ext.getCmp('datefin').getSubmitValue();
                            }

                            if (Ext.getCmp('datedebut').getSubmitValue() !== null && Ext.getCmp('datedebut').getSubmitValue() !== "") {
                                dt_debut = Ext.getCmp('datedebut').getSubmitValue();
                            }
                            OGrid.getStore().load({
                                params: {
                                    lgGrossiste: this.getValue(),
                                    dt_end_vente: dt_fin,
                                    dt_start_vente: dt_debut,
                                    search_value: Ext.getCmp('UG_search').getValue()

                                }
                            });


                        },

                    }
                }, '-', {
                    xtype: 'datefield',
                    id: 'datedebut',
                    name: 'datedebut',
                    emptyText: 'Date debut',
                    submitFormat: 'Y-m-d',
                    maxValue: new Date(),
                    format: 'd/m/Y',
                    listeners: {
                        'change': function (me) {

                            valdatedebut = me.getSubmitValue();
                            Ext.getCmp('datefin').setMinValue(this.getValue());

                        }
                    }
                }, {
                    xtype: 'datefield',
                    id: 'datefin',
                    name: 'datefin',
                    emptyText: 'Date fin',
                    maxValue: new Date(),
                    submitFormat: 'Y-m-d',
                    format: 'd/m/Y',
                    listeners: {
                        'change': function (me) {
                            //alert(me.getSubmitValue());
                            valdatefin = me.getSubmitValue();
                            Ext.getCmp('datedebut').setMaxValue(this.getValue());

                        }
                    }
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    iconCls: 'searchicon',
                    scope: this,
                    handler: this.onRechDifClick
                }
                , {
                    text: 'Imprimer',
                    tooltip: 'Imprimer',
                    iconCls: 'importicon',
                    scope: this,

                    handler: this.onPdfClick
                }


            ],
            bbar: {
                xtype: 'pagingtoolbar',
                store: store, // same store GridPanel is using
                dock: 'bottom',
                displayInfo: true,
                listeners: {
                    beforechange: function (page, currentPage) {
                        var myProxy = this.store.getProxy();
                        myProxy.params = {
                            dt_start_vente: '',
                            dt_end_vente: '',
                            search_value: '',
                            lgGrossiste: ''
                        };
                        var search_value = Ext.getCmp('UG_search').getValue();


                        myProxy.setExtraParam('dt_start_vente', Ext.getCmp('datedebut').getSubmitValue());
                        myProxy.setExtraParam('dt_end_vente', Ext.getCmp('datefin').getSubmitValue());
                        myProxy.setExtraParam('search_value', search_value);
                        myProxy.setExtraParam('lgGrossiste', Ext.getCmp('lg_GROSSISTE_ID_CB').getValue());

                    }

                },

                items: [
                    {
                        xtype: 'displayfield',
                        fieldLabel: 'QTE.UG',
                        labelWidth: 70,
                        id: 'QTEUGPERIODE',
                        fieldStyle: "color:blue;font-weight:800;",
                        margin: '0 10 0 10',
                        renderer: function (value) {
                            return Ext.util.Format.number(value, '0,000') + " ";
                        }
                    },
                    /* {
                     xtype: 'displayfield',
                     fieldLabel: 'QTE.UG.DISPO',
                     labelWidth: 100,
                     id: 'TOTALQTEUG',
                     fieldStyle: "color:blue;font-weight:800;",
                     margin: '0 10 0 10',
                     renderer: function (value) {
                     return Ext.util.Format.number(value, '0,000') + " ";
                     }
                     },*/
                    {
                        xtype: 'displayfield',
                        fieldLabel: 'MONTANT.UG.ACHAT',
                        labelWidth: 135,
                        id: 'TOTALMONTANTUG',
                        fieldStyle: "color:blue;font-weight:800;",
                        margin: '0 10 0 10',
                        renderer: function (value) {
                            return Ext.util.Format.number(value, '0,000') + " F";
                        }
                    }, {
                        xtype: 'displayfield',
                        fieldLabel: 'MONTANT.UG.VENTE',
                        labelWidth: 150,
                        id: 'MONTANTUGPERIODE',
                        fieldStyle: "color:blue;font-weight:800;",
                        margin: '0 10 0 10',
                        renderer: function (value) {
                            return Ext.util.Format.number(value, '0,000') + " F";
                        }
                    }


                ]
            }


        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });



    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
    },

    onRechDifClick: function () {
        var lg_TIERS_PAYANT_ID = Ext.getCmp('lg_GROSSISTE_ID_CB').getValue();
        if (lg_TIERS_PAYANT_ID == '') {
            Ext.MessageBox.alert('Message ', "Veuillez choisir un Grossiste");
            return;
        }
        var grid = Ext.getCmp('Grid_UG_ID');
        var dt_fin = '', dt_debut = '';
        if (Ext.getCmp('datefin').getSubmitValue() != null && Ext.getCmp('datefin').getSubmitValue() != "") {
            dt_fin = Ext.getCmp('datefin').getSubmitValue();
        }

        if (Ext.getCmp('datedebut').getSubmitValue() != null && Ext.getCmp('datedebut').getSubmitValue() != "") {
            dt_debut = Ext.getCmp('datedebut').getSubmitValue();
        }

        grid.getStore().load({
            params: {
                lgGrossiste: lg_TIERS_PAYANT_ID,
                dt_end_vente: dt_fin,
                dt_start_vente: dt_debut,
                search_value: Ext.getCmp('UG_search').getValue()
            }
        });
    },

    onPdfClick: function () {

        var lg_TIERS_PAYANT_ID = Ext.getCmp('lg_GROSSISTE_ID_CB').getValue(),
                dt_fin = Ext.getCmp('datefin').getSubmitValue(), dt_debut = Ext.getCmp('datedebut').getSubmitValue()
                ;
        if (lg_TIERS_PAYANT_ID === null) {
            lg_TIERS_PAYANT_ID = '';
        }
        var linkUrl = "../webservices/Report/uniteGratuite/ws_generate_pdf.jsp" + "?lgGrossiste=" + lg_TIERS_PAYANT_ID + "&dt_start_vente=" + dt_debut + "&dt_end_vente=" + dt_fin;
        window.open(linkUrl);



    }
});

/*
 * Fonctions partagees par les deux onglets :
 *   - generer une suggestion a partir des produits a UG,
 *   - creer un inventaire a partir des produits a UG.
 * Ces actions s'appuient sur les produits ayant du stock UG (endpoint suivi-ug cote serveur).
 */
function ugGenererSuggestion() {
    var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Generation de la suggestion');
    Ext.Ajax.request({
        url: '../api/v1/produit/suivi-ug/suggestion',
        method: 'GET',
        timeout: 2400000,
        success: function (response) {
            progress.hide();
            var result = Ext.JSON.decode(response.responseText, true);
            if (result && result.success) {
                Ext.MessageBox.show({
                    title: 'Message',
                    width: 320,
                    msg: 'Nombre de produits en compte : ' + result.count,
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.INFO,
                    fn: function (btn) {
                        if (btn === 'ok') {
                            testextjs.app.getController('App').onLoadNewComponent('i_sugg_manager', 'Liste Suggestion', '');
                        }
                    }
                });
            } else {
                Ext.MessageBox.alert('Message', "La generation de la suggestion n'a pas abouti.");
            }
        },
        failure: function () {
            progress.hide();
            Ext.MessageBox.alert('Message d\'erreur', "L'operation n'a pas abouti.");
        }
    });
}

function ugCreerInventaire() {
    var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Creation de l\'inventaire');
    // L'inventaire est cree cote serveur a partir des produits a UG et nomme "Inventaire unites gratuites du ..."
    Ext.Ajax.request({
        url: '../api/v1/produit/suivi-ug/create-inventaire',
        method: 'GET',
        timeout: 2400000,
        success: function (response) {
            progress.hide();
            var res = Ext.JSON.decode(response.responseText, true);
            if (res && res.count > 0) {
                Ext.MessageBox.show({
                    title: 'Message',
                    width: 320,
                    msg: (res.message ? res.message : 'Inventaire cree') + ' (' + res.count + ' produit(s)).',
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.INFO,
                    fn: function (btn) {
                        if (btn === 'ok') {
                            testextjs.app.getController('App').onLoadNewComponent('inventaire', 'Gestion des inventaires', '');
                        }
                    }
                });
            } else {
                Ext.MessageBox.alert('Message', (res && res.message) ? res.message : 'Aucun produit a UG a inventorier.');
            }
        },
        failure: function () {
            progress.hide();
            Ext.MessageBox.alert('Message d\'erreur', "La creation de l'inventaire n'a pas abouti.");
        }
    });
}

// Onglet 2 : Suivi UG - produits a UG avec stock actuel et quantite UG restante
Ext.define('testextjs.view.Report.uniteGratuite.UniteGratuiteSuivi', {
    extend: 'Ext.grid.Panel',
    xtype: 'ugsuivi',
    id: 'ugsuiviID',
    title: 'Suivi UG',
    frame: true,
    requires: [
        'Ext.grid.*',
        'Ext.data.*',
        'Ext.util.*'
    ],
    initComponent: function () {
        var me = this;
        var store = new Ext.data.Store({
            fields: [
                {name: 'id', type: 'string'},
                {name: 'code', type: 'string'},
                {name: 'libelle', type: 'string'},
                {name: 'prixAchat', type: 'float'},
                {name: 'prixVente', type: 'float'},
                {name: 'stock', type: 'int'},
                {name: 'stockUg', type: 'int'}
            ],
            autoLoad: false,
            pageSize: 12,
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/suivi-ug',
                reader: {type: 'json', root: 'data', totalProperty: 'total'},
                timeout: 2400000
            }
        });
        me.suiviStore = store;

        Ext.apply(me, {
            width: '98%',
            store: store,
            columns: [
                {header: 'CIP', dataIndex: 'code', flex: 1},
                {header: 'NOM', dataIndex: 'libelle', flex: 2},
                {header: 'PRIX ACHAT', dataIndex: 'prixAchat', align: 'right', flex: 1, renderer: amountformat},
                {header: 'PRIX VENTE', dataIndex: 'prixVente', align: 'right', flex: 1, renderer: amountformat},
                {header: 'STOCK', dataIndex: 'stock', align: 'right', flex: 1, renderer: amountformat},
                {
                    header: 'STOCK UG', dataIndex: 'stockUg', align: 'right', flex: 1,
                    renderer: function (v) {
                        return '<span style="font-weight:bold;color:blue;">' + Ext.util.Format.number(v, '0,000.') + '</span>';
                    }
                }
            ],
            tbar: [
                {
                    xtype: 'textfield',
                    itemId: 'ugSuiviSearch',
                    width: 180,
                    emptyText: 'Rech (CIP / nom)',
                    listeners: {
                        specialkey: function (field, e) {
                            if (e.getKey() === e.ENTER) {
                                me.doSearch();
                            }
                        }
                    }
                }, {
                    text: 'Rechercher',
                    iconCls: 'searchicon',
                    scope: me,
                    handler: me.doSearch
                }, '-', {
                    text: 'Imprimer',
                    iconCls: 'printable',
                    scope: me,
                    handler: me.doPrint
                }, {
                    text: 'Export CSV',
                    iconCls: 'export_csv_icon',
                    scope: me,
                    handler: function () {
                        me.doExport(false);
                    }
                }, {
                    text: 'Export EXCEL',
                    iconCls: 'xls',
                    scope: me,
                    handler: function () {
                        me.doExport(true);
                    }
                }, '-', {
                    text: 'Generer suggestion',
                    iconCls: 'suggestionreapro',
                    handler: ugGenererSuggestion
                }, {
                    text: 'Creer inventaire',
                    iconCls: 'inventaireicon',
                    handler: ugCreerInventaire
                }
            ],
            bbar: {
                xtype: 'pagingtoolbar',
                store: store,
                dock: 'bottom',
                displayInfo: true
            }
        });

        me.callParent();

        me.on('afterlayout', me.doSearch, me, {delay: 1, single: true});
    },
    doSearch: function () {
        var me = this;
        var champ = me.down('#ugSuiviSearch');
        me.suiviStore.getProxy().setExtraParam('query', champ ? champ.getValue() : '');
        me.suiviStore.loadPage(1);
    },
    // Recupere TOUTES les lignes (sans pagination) pour l'impression / l'export
    fetchAll: function (callback) {
        var me = this;
        var champ = me.down('#ugSuiviSearch');
        Ext.Ajax.request({
            url: '../api/v1/produit/suivi-ug',
            method: 'GET',
            params: {query: champ ? champ.getValue() : ''},
            timeout: 2400000,
            success: function (resp) {
                var r = Ext.JSON.decode(resp.responseText, true);
                callback((r && r.data) ? r.data : []);
            },
            failure: function () {
                callback([]);
            }
        });
    },
    doPrint: function () {
        var me = this;
        me.fetchAll(function (datas) {
            var rows = '';
            Ext.each(datas, function (r) {
                rows += '<tr>'
                        + '<td>' + Ext.String.htmlEncode(r.code || '') + '</td>'
                        + '<td>' + Ext.String.htmlEncode(r.libelle || '') + '</td>'
                        + '<td style="text-align:right">' + Ext.util.Format.number(r.prixAchat || 0, '0,000.') + '</td>'
                        + '<td style="text-align:right">' + Ext.util.Format.number(r.prixVente || 0, '0,000.') + '</td>'
                        + '<td style="text-align:right">' + Ext.util.Format.number(r.stock || 0, '0,000.') + '</td>'
                        + '<td style="text-align:right">' + Ext.util.Format.number(r.stockUg || 0, '0,000.') + '</td>'
                        + '</tr>';
            });
            var html = '<html><head><title>Suivi des unites gratuites</title>'
                    + '<style>body{font-family:Arial,sans-serif;font-size:12px;}h2{text-align:center;}'
                    + 'table{width:100%;border-collapse:collapse;}th,td{border:1px solid #000;padding:5px 6px;}th{background:#eee;text-align:left;}</style>'
                    + '</head><body><h2>Suivi des unites gratuites (' + datas.length + ' produit(s))</h2>'
                    + '<table><thead><tr><th>CIP</th><th>NOM</th><th style="text-align:right">PRIX ACHAT</th>'
                    + '<th style="text-align:right">PRIX VENTE</th><th style="text-align:right">STOCK</th><th style="text-align:right">STOCK UG</th>'
                    + '</tr></thead><tbody>' + rows + '</tbody></table></body></html>';
            var win = window.open('', '_blank');
            if (!win) {
                Ext.MessageBox.alert('Impression', 'Veuillez autoriser les fenetres pop-up.');
                return;
            }
            win.document.open();
            win.document.write(html);
            win.document.close();
            win.focus();
            win.print();
        });
    },
    doExport: function (isExcel) {
        var me = this;
        me.fetchAll(function (datas) {
        var sep = ';';
        var lines = ['CIP' + sep + 'NOM' + sep + 'PRIX ACHAT' + sep + 'PRIX VENTE' + sep + 'STOCK' + sep + 'STOCK UG'];
        Ext.each(datas, function (r) {
            var nom = (r.libelle || '').toString().replace(/;/g, ',');
            lines.push([
                r.code || '', nom, r.prixAchat || 0, r.prixVente || 0,
                r.stock || 0, r.stockUg || 0
            ].join(sep));
        });
        var content = lines.join('\r\n');
        // BOM pour une bonne prise en charge des accents dans Excel
        var mime = isExcel ? 'application/vnd.ms-excel' : 'text/csv';
        var ext = isExcel ? 'xls' : 'csv';
        var blob = new Blob(['﻿' + content], {type: mime + ';charset=utf-8;'});
        var url = window.URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'suivi_ug.' + ext;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        });
    }
});

// Ecran principal Unites gratuites : deux onglets (xtype 'ugmanager', charge par le menu)
Ext.define('testextjs.view.Report.uniteGratuite.UniteGratuite', {
    extend: 'Ext.tab.Panel',
    xtype: 'ugmanager',
    id: 'ugmanagerID',
    frame: true,
    width: '98%',
    minHeight: 600,
    initComponent: function () {
        var me = this;
        Ext.apply(me, {
            items: [
                {
                    xtype: 'ugmanagergrid',
                    title: 'Unités gratuites',
                    // Suggestion / creation d'inventaire disponibles aussi sur cet onglet
                    listeners: {
                        afterrender: function (grid) {
                            var tb = grid.getDockedItems('toolbar[dock="top"]')[0];
                            if (tb && !grid._ugActionsAdded) {
                                grid._ugActionsAdded = true;
                                tb.add('-');
                                tb.add({text: 'Generer suggestion', iconCls: 'suggestionreapro', handler: ugGenererSuggestion});
                                tb.add({text: 'Creer inventaire', iconCls: 'inventaireicon', handler: ugCreerInventaire});
                            }
                        }
                    }
                },
                {
                    xtype: 'ugsuivi',
                    title: 'Suivi UG'
                }
            ]
        });
        me.callParent();
    }
});