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
        this.items = [
            {xtype: 'reservegrid', title: 'ALL', gridmode: 'ALL'},
            {xtype: 'reservegrid', title: 'REAPPRO RESERVE', gridmode: 'REAPPRO'},
            {xtype: 'reservegrid', title: 'REASSORT RAYON', gridmode: 'REASSORT'}
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
