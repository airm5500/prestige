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
            },
            'articlemvtgrid button[itemId=btnCreateInventaireListe]': {
                click: me.onCreateInventaireFromListe
            },
            'articlemvtgrid button[itemId=btnExportExcel]': {
                click: me.onExportExcel
            },
            'articlemvtgrid combobox[itemId=filtreTypeMvt]': {
                select: me.onFiltreChange
            },
            'articlemvtgrid combobox[itemId=filtreEmplacement]': {
                select: me.onFiltreChange
            },
            'articlemvtgrid combobox[itemId=filtreFamille]': {
                select: me.onFiltreChange
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

    // Valeur d'un combo de filtre : null/'ALL' signifient "pas de filtre".
    valeurFiltre: function (grid, itemId) {
        var c = grid.down('combobox[itemId=' + itemId + ']');
        var v = c ? c.getValue() : null;
        return (!v || v === 'ALL') ? '' : v;
    },

    // Criteres courants de l'ecran, partages par la liste, l'export et les
    // creations d'inventaire : les trois portent ainsi toujours sur le meme perimetre.
    criteres: function (grid) {
        var q = grid.down('textfield[itemId=queryField]');
        var d1 = grid.down('datefield[itemId=dtStart]');
        var d2 = grid.down('datefield[itemId=dtEnd]');

        return {
            query: q ? (q.getValue() || '').trim() : '',
            dtStart: (d1 && d1.getSubmitValue) ? (d1.getSubmitValue() || '') : '',
            dtEnd: (d2 && d2.getSubmitValue) ? (d2.getSubmitValue() || '') : '',
            typeMvt: this.valeurFiltre(grid, 'filtreTypeMvt'),
            emplacementId: this.valeurFiltre(grid, 'filtreEmplacement'),
            familleId: this.valeurFiltre(grid, 'filtreFamille')
        };
    },

    // Reporte les criteres sur le proxy du store (une seule source de verite).
    appliquerCriteres: function (grid) {
        var c = this.criteres(grid);
        var proxy = grid.getStore().getProxy();
        proxy.extraParams = Ext.apply(proxy.extraParams || {}, c);
        return c;
    },

    champsPresents: function (grid) {
        var ok = grid.down('textfield[itemId=queryField]') && grid.down('datefield[itemId=dtStart]')
                && grid.down('datefield[itemId=dtEnd]');
        if (!ok) {
            Ext.Msg.alert('Erreur', 'Champs de recherche introuvables dans la barre d’outils.');
        }
        return !!ok;
    },

    // Controle des bornes de periode, partage par la recherche, l'export et les
    // creations d'inventaire : aucun de ces trois chemins ne doit partir sur une periode incoherente.
    datesValides: function (grid) {
        var d1 = grid.down('datefield[itemId=dtStart]');
        var d2 = grid.down('datefield[itemId=dtEnd]');
        var vStart = d1 ? d1.getValue() : null;
        var vEnd = d2 ? d2.getValue() : null;

        if (vStart && !vEnd) {
            Ext.Msg.alert('Information', 'Veuillez renseigner la date de fin.', function () {
                d2.focus(true, 100);
            });
            return false;
        }
        if (!vStart && vEnd) {
            Ext.Msg.alert('Information', 'Veuillez renseigner la date de début.', function () {
                d1.focus(true, 100);
            });
            return false;
        }
        if (vStart && vEnd && vStart > vEnd) {
            Ext.Msg.alert('Information', 'La date de début ne peut pas être supérieure à la date de fin.', function () {
                d1.focus(true, 100);
            });
            return false;
        }
        return true;
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

        me.appliquerCriteres(grid);

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

        // Les trois filtres repartent aussi à "Tous", sinon le résultat
        // affiché après réinitialisation resterait restreint sans que rien ne le montre.
        Ext.Array.each(['filtreTypeMvt', 'filtreEmplacement', 'filtreFamille'], function (itemId) {
            var c = grid.down('combobox[itemId=' + itemId + ']');
            if (c) { c.setValue(null); }
        });

        me.clearSelectionMemory(grid);

        var store = grid.getStore();
        me.appliquerCriteres(grid);

        store.loadPage(1);
        me.focusQueryField(grid);
    },

    onSearch: function (btnOrGrid) {
        var me = this;

        var grid = (btnOrGrid && btnOrGrid.isXType && btnOrGrid.isXType('gridpanel'))
            ? btnOrGrid
            : btnOrGrid.up('articlemvtgrid');

        if (!grid) { return; }

        if (!me.champsPresents(grid)) {
            return;
        }

        if (!me.datesValides(grid)) {
            return;
        }

        me.appliquerCriteres(grid);
        grid.getStore().loadPage(1);

        // ✅ ne PAS deselectAll() ici (sinon on casse la sélection multi-pages)
        me.focusQueryField(grid);
    },

    // Un changement de filtre relance la liste : sans cela l'utilisateur verrait
    // un combo positionne et une grille qui ne lui correspond pas.
    onFiltreChange: function (combo) {
        var grid = combo.up('articlemvtgrid');
        if (!grid) { return; }

        this.appliquerCriteres(grid);
        grid.getStore().loadPage(1);
    },

    onExportExcel: function (btn) {
        var me = this;
        var grid = btn.up('articlemvtgrid');
        if (!grid || !me.datesValides(grid)) { return; }

        var c = me.criteres(grid);
        // Ouverture directe de l'URL : le navigateur telecharge le fichier,
        // aucune fenetre intermediaire n'est affichee.
        window.open('../api/v1/articlemvt/export?' + Ext.Object.toQueryString(c), '_self');
    },

    // Inventaire de toute la liste filtree : c'est le parcours "je choisis un mode
    // de mouvement et j'inventorie tout ce qui a bouge ainsi", sans cocher page par page.
    onCreateInventaireFromListe: function (btn) {
        var me = this;
        var grid = btn.up('articlemvtgrid');
        if (!grid || !me.datesValides(grid)) { return; }

        var c = me.criteres(grid);
        var total = grid.getStore().getTotalCount() || 0;

        if (total === 0) {
            Ext.Msg.alert('Information', 'La liste est vide : il n\'y a rien à inventorier.');
            return;
        }

        var mode = grid.down('combobox[itemId=filtreTypeMvt]');
        var libelleMode = (mode && mode.getRawValue && c.typeMvt) ? mode.getRawValue() : 'tous modes confondus';

        Ext.Msg.confirm('Confirmation',
                'Créer un inventaire avec les ' + total + ' article(s) de la liste (' + libelleMode + ') ?',
                function (choice) {
                    if (choice !== 'yes') { return; }

                    var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Création de l\'inventaire');

                    Ext.Ajax.request({
                        url: '../api/v1/articlemvt/inventaire-liste',
                        method: 'GET',
                        params: c,
                        timeout: 300000,
                        success: function (response) {
                            progress.hide();

                            var result = Ext.decode(response.responseText, true) || {};
                            Ext.Msg.alert(result.success ? 'Succès' : 'Information',
                                    result.message || 'Opération non réalisée.');

                            if (result.success) {
                                me.clearSelectionMemory(grid);
                            }
                            grid.getStore().reload();
                        },
                        failure: function () {
                            progress.hide();
                            Ext.Msg.alert('Erreur', 'Impossible de créer l’inventaire. Vérifiez les logs serveur.');
                        }
                    });
                });
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