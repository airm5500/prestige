/* global Ext, valheight */

// Grille reutilisable pour les 3 onglets de la gestion des reserves.
// gridmode : 'ALL' | 'REAPPRO' | 'REASSORT'
//   ALL          -> tous les articles, actions assort + reassort + historique
//   REAPPRO      -> rayon > reserve, action assort + historique
//   REASSORT     -> reserve > rayon, action reassort + historique
Ext.define('testextjs.view.stockmanagement.reserve.ReserveGrid', {
    extend: 'Ext.grid.Panel',
    xtype: 'reservegrid',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer',
        'testextjs.view.stockmanagement.reserve.action.add',
        'testextjs.view.stockmanagement.reserve.action.historique',
        'testextjs.view.stockmanagement.reserve.action.reappro',
        'testextjs.view.stockmanagement.reserve.action.suggestion',
        'testextjs.view.stockmanagement.reserve.action.historiqueGlobal'
    ],
    config: {
        gridmode: 'ALL'
    },
    frame: true,
    initComponent: function () {
        var me = this;
        var mode = me.getGridmode();

        // Mapping onglet -> parametre serveur
        var typeParam = (mode === 'REAPPRO') ? 'REAPPRO'
                : (mode === 'REASSORT') ? 'REASSORT_RAYON'
                : 'ALL';

        var store = new Ext.data.Store({
            model: 'testextjs.model.FamilleStock',
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/reserve/articles',
                extraParams: {str_TYPE_TRANSACTION: typeParam},
                reader: {type: 'json', root: 'results', totalProperty: 'total'}
            }
        });

        // ---- Colonnes communes (identiques a la vue d'origine)
        var columns = [
            {header: 'lg_FAMILLE_ID', dataIndex: 'lg_FAMILLE_ID', hidden: true, flex: 1},
            {header: 'CIP', dataIndex: 'int_CIP', flex: 1},
            {header: 'Designation', dataIndex: 'str_NAME', flex: 1},
            {header: 'Emplacement', dataIndex: 'lg_ZONE_GEO_ID', flex: 1},
            {
                header: 'Stock Rayon', dataIndex: 'int_STOCK_RAYON', align: 'center', flex: 1,
                renderer: function (v, m, r) {
                    var seuil = r.get('int_SEUIL_RESERVE');
                    if (seuil > 0 && v < seuil) {
                        m.style = 'color:red; font-weight:bold; background-color:#F5BCA9;';
                    }
                    return v;
                }
            },
            {header: 'Stock Reserve', dataIndex: 'int_STOCK_RESERVE', align: 'center', flex: 1},
            {header: 'Seuil', dataIndex: 'int_SEUIL_RESERVE', align: 'center', flex: 1},
            {
                header: 'Suggere', dataIndex: 'int_QTE_SUGGEREE', align: 'center', flex: 1,
                renderer: function (v, m) {
                    if (v > 0) {
                        m.style = 'color:#6600cc; font-weight:bold;';
                        return v;
                    }
                    return '';
                }
            }
        ];

        // ---- Colonnes d'action selon le mode
        var colAssort = {
            xtype: 'actioncolumn', width: 30, sortable: false, menuDisabled: true,
            items: [{
                    icon: 'resources/images/icons/fam/add.png',
                    tooltip: 'Faire un assort (rayon -> reserve)',
                    scope: me,
                    handler: me.onAssortClick,
                    getClass: function (value, metadata, record) {
                        return record.get('int_STOCK_RAYON') > 0 ? 'x-display-hide' : 'x-hide-display';
                    }
                }]
        };
        var colReassort = {
            xtype: 'actioncolumn', width: 30, sortable: false, menuDisabled: true,
            items: [{
                    icon: 'resources/images/icons/fam/delete.png',
                    tooltip: 'Faire un reassort (reserve -> rayon)',
                    scope: me,
                    handler: me.onReassortClick,
                    getClass: function (value, metadata, record) {
                        return record.get('int_STOCK_RESERVE') > 0 ? 'x-display-hide' : 'x-hide-display';
                    }
                }]
        };
        var colHisto = {
            xtype: 'actioncolumn', width: 30, sortable: false, menuDisabled: true,
            items: [{
                    icon: 'resources/images/icons/fam/loupe.png',
                    tooltip: 'Historique des mouvements',
                    scope: me,
                    handler: me.onHistoriqueClick
                }]
        };

        if (mode === 'REAPPRO') {
            columns.push(colAssort, colHisto);
        } else if (mode === 'REASSORT') {
            columns.push(colReassort, colHisto);
        } else {
            columns.push(colAssort, colReassort, colHisto);
        }

        // ---- Barre d'outils : recherche + boutons communs + boutons specifiques
        var tbar = [{
                xtype: 'textfield', itemId: 'rechFld', emptyText: 'Rech (code ou nom)', width: 180
            }, {
                text: 'rechercher', scope: me, handler: me.onRechClick
            }, '-'];

        if (mode === 'REAPPRO') {
            tbar.push({text: 'Faire un reappro', iconCls: '', scope: me, handler: me.onFaireReappro});
            tbar.push({text: 'Suggerer un reappro', scope: me, handler: me.onSuggererReappro});
            tbar.push('-');
        } else if (mode === 'REASSORT') {
            tbar.push({text: 'Faire un reassort rayon', scope: me, handler: me.onFaireReassort});
            tbar.push({text: 'Suggerer un reassort rayon', scope: me, handler: me.onSuggererReassort});
            tbar.push('-');
        } else {
            tbar.push({text: 'Tout reassortir selon suggestions', scope: me, handler: me.onReassortBatchAll});
            tbar.push('-');
        }

        // Boutons communs aux 3 onglets
        tbar.push({text: 'Creer un inventaire', scope: me, handler: me.onCreateInventaire});
        tbar.push({text: 'Imprimer', scope: me, handler: me.onPrint});
        tbar.push({text: 'Historiques', scope: me, handler: me.onHistoriquesGlobal});
        tbar.push({text: 'Exporter (CSV)', scope: me, handler: me.onExportCsv});

        Ext.apply(me, {
            store: store,
            columns: columns,
            selModel: {selType: 'cellmodel'},
            tbar: tbar,
            bbar: {xtype: 'pagingtoolbar', store: store, dock: 'bottom', displayInfo: true}
        });

        me.callParent();

        me.on('afterlayout', me.loadStore, me, {delay: 1, single: true});
    },

    loadStore: function () {
        this.getStore().load();
    },

    // Recharge le store en conservant le filtre type + la recherche
    reloadGrid: function () {
        this.getStore().load();
    },

    onRechClick: function () {
        var me = this;
        var val = me.down('#rechFld').getValue();
        me.getStore().getProxy().setExtraParam('search_value', val);
        me.getStore().loadPage(1);
    },

    onAssortClick: function (grid, rowIndex) {
        var me = this;
        var rec = me.getStore().getAt(rowIndex);
        new testextjs.view.stockmanagement.reserve.action.add({
            odatasource: rec.data,
            parentview: me,
            mode: 'assort',
            titre: "Assort de l'article [" + rec.get('str_NAME') + "]"
        });
    },

    onReassortClick: function (grid, rowIndex) {
        var me = this;
        var rec = me.getStore().getAt(rowIndex);
        new testextjs.view.stockmanagement.reserve.action.add({
            odatasource: rec.data,
            parentview: me,
            mode: 'reassort',
            titre: "Reassort de l'article [" + rec.get('str_NAME') + "]"
        });
    },

    onHistoriqueClick: function (grid, rowIndex) {
        var me = this;
        var rec = me.getStore().getAt(rowIndex);
        new testextjs.view.stockmanagement.reserve.action.historique({
            odatasource: rec.data,
            titre: "Historique des mouvements [" + rec.get('str_NAME') + "]"
        });
    },

    // ---- Boutons specifiques REAPPRO ------------------------------------
    onFaireReappro: function () {
        new testextjs.view.stockmanagement.reserve.action.reappro({
            parentview: this,
            mode: 'assort',
            titre: 'Faire un reappro reserve'
        });
    },
    onSuggererReappro: function () {
        new testextjs.view.stockmanagement.reserve.action.suggestion({
            parentview: this,
            mode: 'reappro',
            titre: 'Suggerer un reappro reserve'
        });
    },

    // ---- Boutons specifiques REASSORT -----------------------------------
    onFaireReassort: function () {
        new testextjs.view.stockmanagement.reserve.action.reappro({
            parentview: this,
            mode: 'reassort',
            titre: 'Faire un reassort rayon'
        });
    },
    onSuggererReassort: function () {
        new testextjs.view.stockmanagement.reserve.action.suggestion({
            parentview: this,
            mode: 'reassort',
            titre: 'Suggerer un reassort rayon'
        });
    },

    // ---- Bouton ALL : tout reassortir selon suggestions -----------------
    onReassortBatchAll: function () {
        var me = this;
        var items = [];
        me.getStore().each(function (rec) {
            var qte = rec.get('int_QTE_SUGGEREE');
            if (qte > 0) {
                items.push({lg_FAMILLE_ID: rec.get('lg_FAMILLE_ID'), int_QTE: qte});
            }
        });
        if (items.length === 0) {
            Ext.MessageBox.alert('Message', 'Aucun article a reassortir selon les suggestions.');
            return;
        }
        Ext.MessageBox.confirm('Message',
                'Reassortir ' + items.length + ' article(s) selon les quantites suggerees ?',
                function (btn) {
                    if (btn === 'yes') {
                        var progress = Ext.MessageBox.wait('Veuillez patienter...', 'Traitement en cours');
                        Ext.Ajax.request({
                            method: 'POST',
                            url: '../api/v1/reserve/reassort-batch',
                            jsonData: {items: items},
                            success: function (response) {
                                progress.hide();
                                var res = Ext.JSON.decode(response.responseText, true);
                                Ext.MessageBox.alert('Resultat',
                                        (res.traites || 0) + ' / ' + (res.total || 0) + ' reassort(s) effectue(s).');
                                me.reloadGrid();
                                if (typeof refreshNotificationBadge === 'function') {
                                    refreshNotificationBadge();
                                }
                            },
                            failure: function () {
                                progress.hide();
                                Ext.MessageBox.alert('Erreur', 'Echec du traitement par lot.');
                            }
                        });
                    }
                });
    },

    // ---- Bouton commun : creer un inventaire ----------------------------
    onCreateInventaire: function () {
        var me = this;
        var mode = me.getGridmode();
        var typeParam = (mode === 'REAPPRO') ? 'REAPPRO'
                : (mode === 'REASSORT') ? 'REASSORT_RAYON' : 'ALL';
        var search = me.down('#rechFld').getValue() || '';
        Ext.MessageBox.confirm('Confirmation',
                'Creer un inventaire avec les produits affiches dans cet onglet ?',
                function (btn) {
                    if (btn !== 'yes') {
                        return;
                    }
                    var progress = Ext.MessageBox.wait('Veuillez patienter...', 'Creation de l\'inventaire');
                    Ext.Ajax.request({
                        url: '../api/v1/reserve/create-inventaire',
                        method: 'GET',
                        params: {search_value: search, str_TYPE_TRANSACTION: typeParam},
                        timeout: 600000,
                        success: function (response) {
                            progress.hide();
                            var res = Ext.JSON.decode(response.responseText, true);
                            Ext.MessageBox.alert('Inventaire',
                                    'Inventaire cree.<br/>Produits en compte : <b>' + (res.count || 0) + '</b>');
                        },
                        failure: function () {
                            progress.hide();
                            Ext.MessageBox.alert('Erreur', "La creation de l'inventaire a echoue.");
                        }
                    });
                });
    },

    // ---- Bouton commun : imprimer ---------------------------------------
    onPrint: function () {
        var me = this;
        if (me.getStore().getCount() === 0) {
            Ext.MessageBox.alert('Message', 'Aucune donnee a imprimer.');
            return;
        }
        try {
            Ext.ux.grid.Printer.print(me);
        } catch (e) {
            window.print();
        }
    },

    // ---- Bouton commun : historiques globaux ----------------------------
    onHistoriquesGlobal: function () {
        var me = this;
        var mode = me.getGridmode();
        // ALL -> tous ; REAPPRO -> ASSORT ; REASSORT -> REASSORT
        var typeFilter = (mode === 'REAPPRO') ? 'ASSORT'
                : (mode === 'REASSORT') ? 'REASSORT' : 'ALL';
        new testextjs.view.stockmanagement.reserve.action.historiqueGlobal({
            typeFilter: typeFilter,
            titre: 'Historique des mouvements'
        });
    },

    // ---- Bouton commun : export CSV (conserve depuis la vue d'origine) ---
    onExportCsv: function () {
        var me = this;
        var store = me.getStore();
        if (store.getCount() === 0) {
            Ext.MessageBox.alert('Message', 'Aucune donnee a exporter.');
            return;
        }
        var sep = ';';
        var headers = ['CIP', 'Designation', 'Emplacement', 'Stock Rayon', 'Stock Reserve', 'Seuil', 'Suggere'];
        var esc = function (val) {
            var s = (val === null || val === undefined) ? '' : String(val);
            if (s.indexOf(sep) !== -1 || s.indexOf('"') !== -1 || s.indexOf('\n') !== -1) {
                s = '"' + s.replace(/"/g, '""') + '"';
            }
            return s;
        };
        var lines = [headers.join(sep)];
        store.each(function (rec) {
            lines.push([
                esc(rec.get('int_CIP')), esc(rec.get('str_NAME')), esc(rec.get('lg_ZONE_GEO_ID')),
                esc(rec.get('int_STOCK_RAYON')), esc(rec.get('int_STOCK_RESERVE')),
                esc(rec.get('int_SEUIL_RESERVE')), esc(rec.get('int_QTE_SUGGEREE'))
            ].join(sep));
        });
        var csv = '﻿' + lines.join('\r\n');
        var blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
        var fname = 'reserves_' + me.getGridmode() + '_' + Ext.Date.format(new Date(), 'Ymd_His') + '.csv';
        if (window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveOrOpenBlob(blob, fname);
        } else {
            var url = window.URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = fname;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }
    }
});
