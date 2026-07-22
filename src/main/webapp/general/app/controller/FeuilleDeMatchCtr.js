/* global Ext */

// Controleur du sous-menu "Feuille de match" (Analyse de gestion).
// S'appuie sur les endpoints de la classification ABC (v1/articles/abc),
// avec une impression PDF dediee (feuille-match/print).
Ext.define('testextjs.controller.FeuilleDeMatchCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.Report.abc.FeuilleDeMatchManager'],
    refs: [
        {ref: 'feuille', selector: 'feuilledematch'},
        {ref: 'grid', selector: 'feuilledematch gridpanel'}
    ],

    init: function () {
        this.control({
            'feuilledematch gridpanel': {
                viewready: this.doInitStore
            },
            'feuilledematch #rechercher': {
                click: this.doSearch
            },
            'feuilledematch #rayons': {select: this.doSearch},
            'feuilledematch #grossiste': {select: this.doSearch},
            'feuilledematch #codeFamile': {select: this.doSearch},
            'feuilledematch #comboType': {select: this.doSearch},
            'feuilledematch #comboClasse': {select: this.doSearch},
            'feuilledematch #searchField': {specialkey: this.onSearchKey},
            'feuilledematch #imprimer': {click: this.onImprimer},
            'feuilledematch #btnExporter': {click: this.onExportExcel},
            'feuilledematch #exporterExcel': {click: this.onExportExcel},
            'feuilledematch #exporterCsv': {click: this.onExportCsv},
            'feuilledematch #suggReappro': {click: this.onSuggReappro},
            'feuilledematch #suggVendues': {click: this.onSuggVendues},
            'feuilledematch #creerInventaire': {click: this.onCreerInventaire}
        });
    },

    // Tous les filtres courants (utilises par impression / exports / inventaire / suggestion)
    buildExportParams: function () {
        const me = this, feuille = me.getFeuille();
        const v = function (id) {
            const c = feuille.down('#' + id);
            return c && c.getValue() ? c.getValue() : '';
        };
        return {
            dtStart: feuille.down('#dtStart').getSubmitValue(),
            dtEnd: feuille.down('#dtEnd').getSubmitValue(),
            type: v('comboType') || 'QTY',
            classe: v('comboClasse') || 'ALL',
            topN: v('topN'),
            search: v('searchField'),
            codeFamille: v('codeFamile'),
            codeRayon: v('rayons'),
            codeGrossiste: v('grossiste')
        };
    },

    hasRows: function () {
        const grid = this.getGrid();
        return !!(grid && grid.getStore() && grid.getStore().getCount() > 0);
    },

    guardEmpty: function () {
        if (!this.hasRows()) {
            Ext.Msg.alert('Information', 'Aucun produit à traiter.');
            return false;
        }
        return true;
    },

    onImprimer: function () {
        if (!this.guardEmpty()) { return; }
        window.open('../api/v1/articles/abc/feuille-match/print?' + Ext.Object.toQueryString(this.buildExportParams()));
    },

    onExportExcel: function () {
        if (!this.guardEmpty()) { return; }
        window.open('../api/v1/articles/abc/excel?' + Ext.Object.toQueryString(this.buildExportParams()));
    },

    onExportCsv: function () {
        if (!this.guardEmpty()) { return; }
        window.open('../api/v1/articles/abc/csv?' + Ext.Object.toQueryString(this.buildExportParams()));
    },

    onSuggReappro: function () { this.onCreerSuggestion(true); },
    onSuggVendues: function () { this.onCreerSuggestion(false); },

    onCreerSuggestion: function (isReappro) {
        const me = this;
        if (!me.guardEmpty()) { return; }
        const reappro = isReappro === true;
        const params = Ext.apply({}, me.buildExportParams());
        params.isReappro = reappro;
        const libelle = reappro ? 'quantités de réappro' : 'quantités vendues';
        Ext.MessageBox.confirm('Confirmation',
                'Créer des suggestions (' + libelle + ') à partir de la feuille de match filtrée ?',
                function (btn) {
                    if (btn !== 'yes') {
                        return;
                    }
                    const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Création des suggestions');
                    Ext.Ajax.request({
                        method: 'POST',
                        url: '../api/v1/articles/abc/suggestion?' + Ext.Object.toQueryString(params),
                        timeout: 2400000,
                        success: function (response) {
                            progress.hide();
                            const r = Ext.JSON.decode(response.responseText, true) || {};
                            if (r.success) {
                                Ext.Msg.alert('Suggestion',
                                        'Suggestions créées pour ' + (r.count || 0) + ' produits.');
                            } else {
                                Ext.Msg.alert('Suggestion', 'Aucune suggestion créée.');
                            }
                        },
                        failure: function (response) {
                            progress.hide();
                            Ext.Msg.alert('Erreur', 'Échec de la création. Code HTTP : ' + response.status);
                        }
                    });
                });
    },

    onCreerInventaire: function () {
        const me = this;
        if (!me.guardEmpty()) { return; }
        Ext.MessageBox.confirm('Confirmation',
                'Créer un inventaire à partir de la feuille de match filtrée ?',
                function (btn) {
                    if (btn !== 'yes') {
                        return;
                    }
                    const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Création de l\'inventaire');
                    Ext.Ajax.request({
                        method: 'POST',
                        url: '../api/v1/articles/abc/inventaire?' + Ext.Object.toQueryString(me.buildExportParams()),
                        timeout: 2400000,
                        success: function (response) {
                            progress.hide();
                            const r = Ext.JSON.decode(response.responseText, true) || {};
                            Ext.Msg.alert('Inventaire',
                                    'Inventaire créé avec ' + (r.count || 0) + ' produits.');
                        },
                        failure: function (response) {
                            progress.hide();
                            Ext.Msg.alert('Erreur', 'Échec de la création. Code HTTP : ' + response.status);
                        }
                    });
                });
    },

    doInitStore: function () {
        this.doSearch();
    },

    onSearchKey: function (field, e) {
        if (e.getKey() === e.ENTER) {
            this.doSearch();
        }
    },

    doSearch: function () {
        // loadPage(1) declenche beforeload (extraParams positionnes dans la vue)
        this.getGrid().getStore().loadPage(1);
    }
});
