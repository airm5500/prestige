
Ext.define('testextjs.controller.PointCaisseController', {
    extend: 'Ext.app.Controller',
    views: ['caisseManager.balance.PointCaisseView'],
    models: ['PointCaisse'],
    stores: ['PointCaisse'],

    refs: [{
        ref: 'pointCaisseView',
        selector: 'pointcaisseview'
    }, {
        ref: 'grid',
        selector: '#gridPointCaisseFiltre'
    }, {
        ref: 'depotCombo',
        selector: '#depotPointCaisseFiltre'
    }],

    init: function() {
        this.control({
            // Se déclenche une seule fois, quand la vue est complètement affichée
            'pointcaisseview': {
                afterrender: this.onViewAfterRender
            },
            // Ecouteurs pour les boutons
            '#searchBtnPointCaisseFiltre': {
                click: this.onSearchClick
            },
            '#printBtnPointCaisseFiltre': {
                click: this.onPrintClick
            }
        });
    },
    
    // Cette fonction est le point d'entrée. Elle se lance quand la vue est prête.
    onViewAfterRender: function() {
        var depotStore = this.getDepotCombo().getStore();
        
        // Si le store des dépôts n'est pas encore chargé, on attend qu'il le soit.
        if (depotStore.isLoading() || depotStore.getCount() === 0) {
            depotStore.on('load', this.onDepotStoreLoad, this, { single: true });
        } else {
            // S'il est déjà chargé, on lance directement.
            this.onDepotStoreLoad();
        }
    },

    // Cette fonction est appelée une fois que le combobox des dépôts est rempli.
    onDepotStoreLoad: function() {
        // On sélectionne "TOUT" par défaut
        this.getDepotCombo().setValue('ALL');
        // On lance la première recherche de données
        this.onSearchClick();
    },

    // Fonction de recherche principale
    onSearchClick: function() {
        var grid = this.getGrid();
        var store = grid.getStore();
        var dtStart = Ext.getCmp('dtStartPointCaisseFiltre').getSubmitValue();
        var dtEnd = Ext.getCmp('dtEndPointCaisseFiltre').getSubmitValue();
        var emplacementId = this.getDepotCombo().getValue();
        
        if (!emplacementId) {
            return; // Ne fait rien si aucun dépôt n'est sélectionné
        }

        grid.setLoading(true); // Affiche un indicateur de chargement

        store.load({
            params: {
                dtStart: dtStart,
                dtEnd: dtEnd,
                emplacementId: emplacementId
            },
            callback: function() {
                grid.setLoading(false); // Cache l'indicateur de chargement
            }
        });
    },

    onPrintClick: function() {
        var dtStart = Ext.getCmp('dtStartPointCaisseFiltre').getSubmitValue();
        var dtEnd = Ext.getCmp('dtEndPointCaisseFiltre').getSubmitValue();
        var emplacementId = this.getDepotCombo().getValue();

        var link = '../api/v1/pointdepot/print?dtStart=' + dtStart + '&dtEnd=' + dtEnd + '&emplacementId=' + emplacementId;
        window.open(link);
    }
});
