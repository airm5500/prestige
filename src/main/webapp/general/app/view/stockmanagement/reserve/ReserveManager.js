/* global Ext, valheight */

// Conteneur a onglets de la gestion des reserves.
//   - ALL             : tous les articles en reserve (vue historique)
//   - REAPPRO RESERVE : articles ou stock rayon > stock reserve (rayon -> reserve)
//   - REASSORT RAYON  : articles ou stock reserve > stock rayon (reserve -> rayon)
Ext.define('testextjs.view.stockmanagement.reserve.ReserveManager', {
    extend: 'Ext.tab.Panel',
    xtype: 'reservemanager',
    id: 'reservemanagerID',
    requires: [
        'testextjs.view.stockmanagement.reserve.ReserveGrid'
    ],
    title: 'Gestion des reserves',
    width: '98%',
    height: valheight,
    plain: true,
    maximizable: true,
    closable: false,
    frame: true,
    initComponent: function () {
        // Inject tab color CSS once
        if (!document.getElementById('reserve-tab-styles')) {
            var s = document.createElement('style');
            s.id = 'reserve-tab-styles';
            s.textContent = [
                '.tab-reappro.x-tab { background-color: #d97200 !important; border-color: #b05a00 !important; }',
                '.tab-reappro.x-tab .x-tab-inner, .tab-reappro.x-tab .x-tab-text { color: #fff !important; font-weight: bold !important; }',
                '.tab-reappro.x-tab-active { background-color: #ff9500 !important; border-top: 3px solid #fff !important; }',
                '.tab-reassort.x-tab { background-color: #2a6b2e !important; border-color: #1a4a1e !important; }',
                '.tab-reassort.x-tab .x-tab-inner, .tab-reassort.x-tab .x-tab-text { color: #fff !important; font-weight: bold !important; }',
                '.tab-reassort.x-tab-active { background-color: #3daa42 !important; border-top: 3px solid #fff !important; }'
            ].join('\n');
            document.head.appendChild(s);
        }

        this.items = [
            {xtype: 'reservegrid', title: 'ALL', gridmode: 'ALL'},
            {
                xtype: 'reservegrid', gridmode: 'REAPPRO', title: 'REAPPRO RESERVE',
                tabConfig: {cls: 'tab-reappro'}
            },
            {
                xtype: 'reservegrid', gridmode: 'REASSORT', title: 'REASSORT RAYON',
                tabConfig: {cls: 'tab-reassort'}
            }
        ];
        this.listeners = {
            tabchange: function (tabPanel, newCard) {
                if (newCard && newCard.reloadGrid) {
                    newCard.reloadGrid();
                }
            }
        };
        this.callParent();
    }
});
