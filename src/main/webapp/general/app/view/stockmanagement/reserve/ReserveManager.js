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
            {
                xtype: 'reservegrid', gridmode: 'REAPPRO',
                title: '<span style="color:#cc6600;font-weight:bold;">REAPPRO RESERVE</span>'
            },
            {
                xtype: 'reservegrid', gridmode: 'REASSORT',
                title: '<span style="color:#1f7a1f;font-weight:bold;">REASSORT RAYON</span>'
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
