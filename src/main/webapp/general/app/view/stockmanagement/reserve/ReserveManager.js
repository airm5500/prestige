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
            {xtype: 'reservegrid', gridmode: 'REAPPRO', title: 'REAPPRO RESERVE'},
            {xtype: 'reservegrid', gridmode: 'REASSORT', title: 'REASSORT RAYON'}
        ];
        this.listeners = {
            tabchange: function (tabPanel, newCard) {
                if (newCard && newCard.reloadGrid) {
                    newCard.reloadGrid();
                }
            },
            afterrender: function (tp) {
                Ext.defer(function () {
                    var bar = tp.tabBar;
                    if (!bar) { return; }
                    var reapproTab = bar.items.getAt(1);
                    var reassortTab = bar.items.getAt(2);
                    if (reapproTab && reapproTab.el) {
                        reapproTab.el.setStyle('background-color', '#e07b00');
                        reapproTab.el.setStyle('border-color', '#c06800');
                        var inner = reapproTab.el.down('.x-tab-inner');
                        if (inner) { inner.setStyle('color', '#fff'); }
                    }
                    if (reassortTab && reassortTab.el) {
                        reassortTab.el.setStyle('background-color', '#2e7d32');
                        reassortTab.el.setStyle('border-color', '#1b5e20');
                        var inner2 = reassortTab.el.down('.x-tab-inner');
                        if (inner2) { inner2.setStyle('color', '#fff'); }
                    }
                }, 100);
            }
        };
        this.callParent();
    }
});
