/* global Ext */

Ext.define('testextjs.controller.ArticleMvtController', {
    extend: 'Ext.app.Controller',

    views: [
        'testextjs.view.stat.ArticleMvtGrid'
    ],

    refs: [
        { ref: 'grid', selector: 'articlemvtgrid' }
    ],

    // ✅ mémoire globale des IDs cochés (persistant multi-pages)
    selectedIds: null,
    isRestoring: false,

    init: function () {
        var me = this;

        me.selectedIds = {}; // { id: true }

        me.control({
            'articlemvtgrid': {
                afterrender: me.onGridAfterRender
            },
            'articlemvtgrid button[itemId=btnSearch]': {
                click: me.onSearch
            },
            'articlemvtgrid button[itemId=btnReset]': {
                click: me.onReset
            },
            'articlemvtgrid textfield[itemId=queryField]': {
                keyup: me.onQueryKeyUp
            },
            'articlemvtgrid button[itemId=btnCreateInventaire]': {
                click: me.onCreateInventaireFromSelection
            }
        });
    },

    // -------------------------
    // Helpers
    // -------------------------
    focusQueryField: function (grid) {
        var q = grid.down('textfield[itemId=queryField]');
        if (q) {
            Ext.defer(function () {
                q.focus(true, 100);
            }, 10);
        }
    },

    updateCreateButtonState: function (grid) {
        var btn = grid.down('button[itemId=btnCreateInventaire]');
        if (!btn) { return; }

        var hasAny = false;
        for (var k in this.selectedIds) {
            if (this.selectedIds.hasOwnProperty(k)) {
                hasAny = true;
                break;
            }
        }
        btn.setDisabled(!hasAny);
    },

    getIdFromRecord: function (rec) {
        return rec && rec.get ? rec.get('lgFamilleId') : null;
    },

    clearSelectionMemory: function (grid) {
        this.selectedIds = {};
        if (grid && grid.getSelectionModel) {
            grid.getSelectionModel().deselectAll(true);
        }
        this.updateCreateButtonState(grid);
    },

    // Synchronise la mémoire globale avec ce que l'utilisateur a coché/décoché sur la page courante
    syncSelectedIdsFromCurrentPage: function (grid) {
        var me = this;
        var store = grid.getStore();
        var sm = grid.getSelectionModel();

        // ids sélectionnés sur cette page
        var selectedOnPage = {};
        Ext.Array.each(sm.getSelection(), function (rec) {
            var id = me.getIdFromRecord(rec);
            if (id) {
                selectedOnPage[id] = true;
                me.selectedIds[id] = true; // ✅ ajouter en mémoire
            }
        });

        // pour tous les records de la page : si pas sélectionné => retirer de la mémoire (décoché)
        store.each(function (rec) {
            var id = me.getIdFromRecord(rec);
            if (!id) { return; }
            if (!selectedOnPage[id] && me.selectedIds[id]) {
                delete me.selectedIds[id];
            }
        });
    },

    // Restaure la sélection mémorisée quand on change de page / reload
    restoreSelectionForPage: function (grid) {
        var me = this;
        var store = grid.getStore();
        var sm = grid.getSelectionModel();

        me.isRestoring = true;
        try {
            var toSelect = [];
            store.each(function (rec) {
                var id = me.getIdFromRecord(rec);
                if (id && me.selectedIds[id]) {
                    toSelect.push(rec);
                }
            });
            sm.select(toSelect, false, true);
        } finally {
            me.isRestoring = false;
        }
    },

    // -------------------------
    // Events
    // -------------------------
    onGridAfterRender: function (grid) {
        var me = this;

        var d1 = grid.down('datefield[itemId=dtStart]');
        var d2 = grid.down('datefield[itemId=dtEnd]');
        var store = grid.getStore();
        var today = new Date();

        // ✅ 1) au démarrage: dates du jour + données du jour
        if (d1) { d1.setValue(today); }
        if (d2) { d2.setValue(today); }

        var dtStart = d1 && d1.getSubmitValue ? d1.getSubmitValue() : '';
        var dtEnd   = d2 && d2.getSubmitValue ? d2.getSubmitValue() : '';

        store.getProxy().extraParams = store.getProxy().extraParams || {};
        store.getProxy().extraParams.dtStart = dtStart;
        store.getProxy().extraParams.dtEnd   = dtEnd;
        store.getProxy().extraParams.query   = '';

        // ✅ hooks store load => restaurer sélection + focus
        store.on('load', function () {
            me.restoreSelectionForPage(grid);
            me.updateCreateButtonState(grid);
            me.focusQueryField(grid);
        });

        // ✅ hooks selection change => mémoriser multi-pages + focus
        grid.getSelectionModel().on('selectionchange', function () {
            if (me.isRestoring) {
                return;
            }
            me.syncSelectedIdsFromCurrentPage(grid);
            me.updateCreateButtonState(grid);
            me.focusQueryField(grid);
        });

        store.loadPage(1);
        me.focusQueryField(grid);
    },

    onQueryKeyUp: function (field, e) {
        if (e.getKey && e.getKey() === e.ENTER) {
            this.onSearch(field.up('articlemvtgrid'));
        }
    },

    onReset: function (btn) {
        var me = this;
        var grid = btn.up('articlemvtgrid');
        if (!grid) { return; }

        var q  = grid.down('textfield[itemId=queryField]');
        var d1 = grid.down('datefield[itemId=dtStart]');
        var d2 = grid.down('datefield[itemId=dtEnd]');

        // ✅ tu as demandé: reset => tout vider (champs + coches)
        if (q)  { q.setValue(''); }
        if (d1) { d1.setValue(null); }
        if (d2) { d2.setValue(null); }

        me.clearSelectionMemory(grid);

        var store = grid.getStore();
        store.getProxy().extraParams.query   = '';
        store.getProxy().extraParams.dtStart = '';
        store.getProxy().extraParams.dtEnd   = '';

        store.loadPage(1);
        me.focusQueryField(grid);
    },

    onSearch: function (btnOrGrid) {
        var me = this;

        var grid = (btnOrGrid && btnOrGrid.isXType && btnOrGrid.isXType('gridpanel'))
            ? btnOrGrid
            : btnOrGrid.up('articlemvtgrid');

        if (!grid) { return; }

        var q  = grid.down('textfield[itemId=queryField]');
        var d1 = grid.down('datefield[itemId=dtStart]');
        var d2 = grid.down('datefield[itemId=dtEnd]');

        if (!q || !d1 || !d2) {
            Ext.Msg.alert('Erreur', 'Champs de recherche introuvables dans la barre d’outils.');
            return;
        }

        var query  = (q.getValue() || '').trim();
        var vStart = d1.getValue();
        var vEnd   = d2.getValue();

        // ✅ 2) contrôle dates + focus champ manquant
        if (vStart && !vEnd) {
            Ext.Msg.alert('Information', 'Veuillez renseigner la date de fin.', function () {
                d2.focus(true, 100);
            });
            return;
        }
        if (!vStart && vEnd) {
            Ext.Msg.alert('Information', 'Veuillez renseigner la date de début.', function () {
                d1.focus(true, 100);
            });
            return;
        }
        if (vStart && vEnd && vStart > vEnd) {
            Ext.Msg.alert('Information', 'La date de début ne peut pas être supérieure à la date de fin.', function () {
                d1.focus(true, 100);
            });
            return;
        }

        var dtStart = d1.getSubmitValue ? d1.getSubmitValue() : '';
        var dtEnd   = d2.getSubmitValue ? d2.getSubmitValue() : '';

        var store = grid.getStore();
        store.getProxy().extraParams.query   = query;
        store.getProxy().extraParams.dtStart = dtStart || '';
        store.getProxy().extraParams.dtEnd   = dtEnd || '';
        store.loadPage(1);

        // ✅ ne PAS deselectAll() ici (sinon on casse la sélection multi-pages)
        me.focusQueryField(grid);
    },

    onCreateInventaireFromSelection: function (btn) {
        var me = this;
        var grid = btn.up('articlemvtgrid');

        // ✅ ids mémorisés (multi-pages)
        var ids = [];
        for (var k in me.selectedIds) {
            if (me.selectedIds.hasOwnProperty(k)) {
                ids.push(k);
            }
        }

        if (!ids || ids.length === 0) {
            Ext.Msg.alert('Information', 'Veuillez sélectionner au moins un article.');
            me.focusQueryField(grid);
            return;
        }

        var d1 = grid.down('datefield[itemId=dtStart]');
        var d2 = grid.down('datefield[itemId=dtEnd]');

        var dtStart = d1 && d1.getSubmitValue ? d1.getSubmitValue() : '';
        var dtEnd   = d2 && d2.getSubmitValue ? d2.getSubmitValue() : '';

        Ext.Msg.confirm(
            'Confirmation',
            'Créer un inventaire à partir des ' + ids.length + ' article(s) sélectionné(s) ?',
            function (choice) {
                if (choice !== 'yes') {
                    me.focusQueryField(grid);
                    return;
                }

                var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Création de l\'inventaire');

                // ✅ ROUTE EXISTANTE (celle qui marchait chez toi)
                Ext.Ajax.request({
                    url: '../api/v1/articlemvt/inventaire',
                    method: 'GET',
                    params: {
                        ids: ids.join(','),
                        dtStart: dtStart || '',
                        dtEnd: dtEnd || ''
                    },
                    success: function (response) {
                        progress.hide();

                        var result = Ext.decode(response.responseText, true) || {};
                        if (result.success) {
                            Ext.Msg.alert('Succès', result.message || 'Inventaire créé avec succès.');
                            // ✅ après succès : on vide aussi les coches mémorisées
                            me.clearSelectionMemory(grid);
                        } else {
                            Ext.Msg.alert('Information', result.message || 'Opération non réalisée.');
                        }

                        grid.getStore().reload();
                        me.focusQueryField(grid);
                    },
                    failure: function () {
                        progress.hide();
                        Ext.Msg.alert('Erreur', 'Impossible de créer l’inventaire. Vérifiez les logs serveur.');
                        me.focusQueryField(grid);
                    }
                });
            }
        );
    }
});