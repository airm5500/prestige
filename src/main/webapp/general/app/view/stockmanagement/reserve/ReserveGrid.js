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
            {header: 'Seuil Reserve (maxi rayon)', dataIndex: 'int_SEUIL_RESERVE', align: 'center', flex: 1},
            {
                header: 'Seuil Mini Rayon', dataIndex: 'int_SEUIL_MINI_RAYON', align: 'center', flex: 1,
                hidden: mode !== 'REASSORT',
                renderer: function (v) {
                    return (v === null || v === undefined || v === '') ? '-' : v;
                }
            },
            {
                header: 'Quantité Suggérée', dataIndex: 'int_QTE_SUGGEREE', align: 'center', flex: 1,
                renderer: function (v, m, r) {
                    if (v > 0) {
                        m.style = 'color:#6600cc; font-weight:bold;';
                        // Onglet REASSORT : hover detaillant la regle de calcul de la ligne
                        if (mode === 'REASSORT') {
                            var sr = r.get('int_STOCK_RAYON');
                            var seuil = r.get('int_SEUIL_RESERVE');
                            var resv = r.get('int_STOCK_RESERVE');
                            var manque = Math.max(0, seuil - sr);
                            var qtip = 'Quantité suggérée = min(Stock Réserve ; Seuil Réserve - Stock Rayon)'
                                    + '<br/>= min(' + resv + ' ; ' + seuil + ' - ' + sr + ')'
                                    + '<br/>= min(' + resv + ' ; ' + manque + ') = <b>' + v + '</b>';
                            m.tdAttr = 'data-qtip="' + qtip + '"';
                        }
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
                    tooltip: 'Faire un reappro (rayon -> reserve)',
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
                    icon: 'resources/images/icons/fam/retourdroit.png',
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
            tbar.push({text: 'Suggerer un reappro', cls: 'btn-reappro-orange', scope: me, handler: me.onSuggererReappro});
            tbar.push('-');
        } else if (mode === 'REASSORT') {
            tbar.push({text: 'Faire un reassort rayon', scope: me, handler: me.onFaireReassort});
            tbar.push({text: 'Suggerer un reassort rayon', cls: 'btn-reassort-green', scope: me, handler: me.onSuggererReassort});
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
            titre: "Reappro de la reserve de l'article [" + rec.get('str_NAME') + "]"
        });
    },

    onReassortClick: function (grid, rowIndex) {
        var me = this;
        var rec = me.getStore().getAt(rowIndex);
        new testextjs.view.stockmanagement.reserve.action.add({
            odatasource: rec.data,
            parentview: me,
            mode: 'reassort',
            titre: "Reassort du rayon de l'article [" + rec.get('str_NAME') + "]"
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

    // ---- Bouton commun : creer un inventaire (selection des produits) ----
    onCreateInventaire: function () {
        var me = this;
        var mode = me.getGridmode();
        var typeParam = (mode === 'REAPPRO') ? 'REAPPRO'
                : (mode === 'REASSORT') ? 'REASSORT_RAYON' : 'ALL';
        var search = me.down('#rechFld').getValue() || '';

        // Map des ids coches, conserve a travers les pages : { lg_FAMILLE_ID: true }
        var selectedIds = {};
        var totalAll = 0; // total d'articles (toutes pages) pour "tout selectionner"

        var selStore = new Ext.data.Store({
            model: 'testextjs.model.FamilleStock',
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/reserve/articles',
                extraParams: {str_TYPE_TRANSACTION: typeParam, search_value: search},
                reader: {type: 'json', root: 'results', totalProperty: 'total'}
            }
        });

        var selModel = Ext.create('Ext.selection.CheckboxModel', {checkOnly: true});

        var prixRenderer = function (v) {
            return (v === null || v === undefined || v === '') ? '' : Ext.util.Format.number(v, '0,000');
        };

        var win;
        var updateCounter = function () {
            var n = 0, k;
            for (k in selectedIds) {
                if (selectedIds.hasOwnProperty(k)) {
                    n++;
                }
            }
            // selCount est docke sur la grille (disponible des la creation de grid)
            var cmp = grid && grid.down('#selCount');
            if (cmp) {
                cmp.setText('Selectionnes : ' + n);
            }
        };

        // Re-coche les lignes de la page courante presentes dans selectedIds
        var reapplySelection = function () {
            selModel.suspendEvents();
            selStore.each(function (rec) {
                if (selectedIds[rec.get('lg_FAMILLE_ID')]) {
                    selModel.select(rec, true, true);
                }
            });
            selModel.resumeEvents();
            updateCounter();
        };

        selModel.on('select', function (sm, rec) {
            selectedIds[rec.get('lg_FAMILLE_ID')] = true;
            updateCounter();
        });
        selModel.on('deselect', function (sm, rec) {
            delete selectedIds[rec.get('lg_FAMILLE_ID')];
            updateCounter();
        });
        selStore.on('load', function (store, records, success, op, eOpts) {
            if (totalAll === 0) {
                totalAll = store.getTotalCount();
            }
            reapplySelection();
        });

        var pager = Ext.create('Ext.toolbar.Paging', {
            store: selStore,
            dock: 'bottom',
            displayInfo: true
        });

        var grid = Ext.create('Ext.grid.Panel', {
            border: false,
            flex: 1,
            store: selStore,
            selModel: selModel,
            columns: [
                {header: 'CIP', dataIndex: 'int_CIP', flex: 1},
                {header: 'Designation', dataIndex: 'str_NAME', flex: 2},
                {header: 'Stock Reserve', dataIndex: 'int_STOCK_RESERVE', align: 'center', flex: 1},
                {header: 'Prix achat', dataIndex: 'int_PAF', align: 'right', flex: 1, renderer: prixRenderer},
                {header: 'Prix vente', dataIndex: 'int_PRICE', align: 'right', flex: 1, renderer: prixRenderer}
            ],
            dockedItems: [
                {
                    xtype: 'toolbar', dock: 'top',
                    items: [{
                            text: 'Tout selectionner (toutes les pages)',
                            handler: function () {
                                var prog = Ext.MessageBox.wait('Chargement...', 'Selection de tous les articles');
                                Ext.Ajax.request({
                                    url: '../api/v1/reserve/articles',
                                    method: 'GET',
                                    params: {str_TYPE_TRANSACTION: typeParam, search_value: search, start: 0, limit: 0},
                                    timeout: 600000,
                                    success: function (response) {
                                        prog.hide();
                                        var res = Ext.JSON.decode(response.responseText, true);
                                        var list = (res && res.results) ? res.results : [];
                                        Ext.each(list, function (a) {
                                            if (a.lg_FAMILLE_ID) {
                                                selectedIds[a.lg_FAMILLE_ID] = true;
                                            }
                                        });
                                        reapplySelection();
                                    },
                                    failure: function () {
                                        prog.hide();
                                        Ext.MessageBox.alert('Erreur', 'Echec du chargement de la liste complete.');
                                    }
                                });
                            }
                        }, {
                            text: 'Tout deselectionner',
                            handler: function () {
                                selectedIds = {};
                                selModel.deselectAll();
                                updateCounter();
                            }
                        }, '->', {
                            xtype: 'tbtext', itemId: 'selCount', text: 'Selectionnes : 0'
                        }]
                },
                pager
            ]
        });

        win = Ext.create('Ext.window.Window', {
            title: 'Creer un inventaire reserve',
            modal: true,
            width: 860,
            height: 580,
            layout: {type: 'vbox', align: 'stretch'},
            constrainHeader: true,
            bodyPadding: '8 8 0 8',
            items: [{
                    xtype: 'textarea',
                    itemId: 'commentFld',
                    fieldLabel: 'Commentaire',
                    labelAlign: 'top',
                    height: 70,
                    emptyText: 'Commentaire optionnel (enregistre dans la description de l\'inventaire)'
                }, grid],
            buttons: [{
                    text: 'Creer l\'inventaire',
                    handler: function () {
                        var ids = [], k;
                        for (k in selectedIds) {
                            if (selectedIds.hasOwnProperty(k)) {
                                ids.push(k);
                            }
                        }
                        if (ids.length === 0) {
                            Ext.MessageBox.alert('Message', 'Veuillez selectionner au moins un produit.');
                            return;
                        }
                        var comment = win.down('#commentFld').getValue() || '';
                        var progress = Ext.MessageBox.wait('Veuillez patienter...', 'Creation de l\'inventaire');
                        Ext.Ajax.request({
                            url: '../api/v1/reserve/create-inventaire-selection',
                            method: 'POST',
                            jsonData: {ids: ids, description: comment},
                            timeout: 600000,
                            success: function (response) {
                                progress.hide();
                                var res = Ext.JSON.decode(response.responseText, true);
                                win.close();
                                Ext.MessageBox.alert('Inventaire',
                                        'Inventaire cree.<br/>Produits en compte : <b>' + (res.count || 0) + '</b>');
                            },
                            failure: function () {
                                progress.hide();
                                Ext.MessageBox.alert('Erreur', "La creation de l'inventaire a echoue.");
                            }
                        });
                    }
                }, {
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }]
        });

        win.show();
        selStore.loadPage(1);
    },

    // ---- Bouton commun : imprimer via reserveprint.html -------------------
    onPrint: function () {
        var me = this;
        var mode = me.getGridmode();
        var search = me.down('#rechFld').getValue() || '';
        var qs = 'mode=articles&tabMode=' + encodeURIComponent(mode)
                + '&titre=' + encodeURIComponent('Gestion des reserves - ' + mode)
                + '&autoload=1';
        if (search) {
            qs += '&search=' + encodeURIComponent(search);
        }
        window.open('reserveprint.html?' + qs, '_blank',
                'width=1100,height=750,scrollbars=yes,resizable=yes');
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
