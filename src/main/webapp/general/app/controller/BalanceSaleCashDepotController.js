/*
 * airman
 */
Ext.define('testextjs.controller.BalanceSaleCashDepotController', {
    extend: 'Ext.app.Controller',
    views: ['caisseManager.balance.BalanceSaleCashDepot'],
    stores: ['BalanceSaleCashDepotStore'],
    models: ['BalanceSaleCashDepotModel'],

    // Selecteurs QUALIFIES par l'ecran. Ils ne l'etaient pas : '#depot', '#dtStart' et '#dtEnd' sont
    // des identifiants courants, et ces references pointaient vers le premier composant du genre
    // trouve dans TOUTE l'application - donc potentiellement celui d'un autre ecran.
    refs: [{
        ref: 'balanceView',
        selector: 'balancesalecashdepot'
    }, {
        ref: 'grid',
        selector: 'balancesalecashdepot #gridBalance'
    }, {
        ref: 'summaryPanel',
        selector: 'balancesalecashdepot #summaryPanel'
    }, {
        ref: 'depotCombo',
        selector: 'balancesalecashdepot #depot'
    }, {
        ref: 'dtStart',
        selector: 'balancesalecashdepot #dtStart'
    }, {
        ref: 'dtEnd',
        selector: 'balancesalecashdepot #dtEnd'
    }],

    init: function() {
        // Selecteurs QUALIFIES par l'ecran. Ils ne l'etaient pas : '#depot' et '#searchBtn' captaient
        // les evenements de n'importe quel autre ecran portant ces itemId, y compris ceux ajoutes plus
        // tard, et cet ecran-ci tentait alors de recharger une grille qui n'etait pas la sienne.
        this.control({
            'balancesalecashdepot #searchBtn': {
                click: this.onSearchClick
            },
            'balancesalecashdepot #printBtn': {
                click: this.onPrintClick
            },
            'balancesalecashdepot #depot': {
                select: this.onSearchClick
            },
            'balancesalecashdepot': {
                afterrender: this.onViewAfterRender
            }
        });
    },
    
    onViewAfterRender: function() {
        var depotStore = this.getDepotCombo().getStore();
        if (depotStore.isLoading() || depotStore.getCount() === 0) {
            depotStore.on('load', this.onSearchClick, this, { single: true });
        } else {
            this.onSearchClick();
        }
    },

    onSearchClick: function() {
        var me = this;
        var grid = me.getGrid();
        var store = grid.getStore();
        
        var depotId = me.getDepotCombo().getValue();
        var dtStart = me.getDtStart().getSubmitValue();
        var dtEnd = me.getDtEnd().getSubmitValue();

        if (!depotId) {
            return;
        }

        grid.setLoading(true);

        store.load({
            params: {
                emplacementId: depotId,
                dtStart: dtStart,
                dtEnd: dtEnd
            },
            callback: function(records, operation, success) {
                grid.setLoading(false);
                if (success) {
                    var rawData = store.getProxy().getReader().rawData;
                    if (rawData && rawData.metaData) {
                        me.updateSummary(rawData.metaData);
                    }
                } else {
                    Ext.MessageBox.alert('Erreur', 'Impossible de charger les données.');
                }
            }
        });
    },

    updateSummary: function(metaData) {
        var summaryPanel = this.getSummaryPanel();
        for (var key in metaData) {
            if (metaData.hasOwnProperty(key)) {
                var field = summaryPanel.down('#' + key + '_summary');
                if (field) {
                    field.setValue(metaData[key]);
                }
            }
        }
    },

    onPrintClick: function() {
        let depotId = this.getDepotCombo().getValue();
        let dtStart = this.getDtStart().getSubmitValue();
        let dtEnd = this.getDtEnd().getSubmitValue();
        
        if (!depotId) {
            Ext.MessageBox.alert('Erreur', 'Veuillez sélectionner un dépôt.');
            return;
        }

        const link = '../api/v1/balance/print-balancesalecashdepot?emplacementId=' + depotId +
                   '&dtStart=' + dtStart + '&dtEnd=' + dtEnd;
                   
        window.open(link);
    }
});
