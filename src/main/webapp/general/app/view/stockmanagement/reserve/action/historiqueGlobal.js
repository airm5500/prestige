/* global Ext */

// Historique global des mouvements de reserve, classe par date decroissante.
//   typeFilter 'ALL'      -> assorts + reassorts combines
//   typeFilter 'ASSORT'   -> reappros reserve uniquement
//   typeFilter 'REASSORT' -> reassorts rayon uniquement
Ext.define('testextjs.view.stockmanagement.reserve.action.historiqueGlobal', {
    extend: 'Ext.window.Window',
    xtype: 'reservehistoriqueglobal',
    requires: ['Ext.grid.*', 'Ext.data.*', 'Ext.window.Window', 'Ext.ux.grid.Printer'],
    config: {
        typeFilter: 'ALL',
        titre: ''
    },
    initComponent: function () {
        var me = this;
        var typeFilter = me.getTypeFilter() || 'ALL';

        var extra = {};
        if (typeFilter !== 'ALL') {
            extra.type = typeFilter;
        }

        var store = new Ext.data.Store({
            fields: [
                'lg_MOUVEMENT_ID', 'str_NAME', 'str_TYPE',
                {name: 'int_QTE', type: 'int'},
                {name: 'int_STOCK_RAYON_AVANT', type: 'int'},
                {name: 'int_STOCK_RESERVE_AVANT', type: 'int'},
                {name: 'int_STOCK_RAYON_APRES', type: 'int'},
                {name: 'int_STOCK_RESERVE_APRES', type: 'int'},
                'str_USER', 'dt_CREATED'
            ],
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/reserve/mouvements',
                extraParams: extra,
                reader: {type: 'json', root: 'results', totalProperty: 'total'}
            }
        });

        var grid = Ext.create('Ext.grid.Panel', {
            store: store,
            border: false,
            columns: [
                {header: 'Date', dataIndex: 'dt_CREATED', flex: 1.3},
                {header: 'Designation', dataIndex: 'str_NAME', flex: 1.6},
                {
                    header: 'Type', dataIndex: 'str_TYPE', flex: 1,
                    renderer: function (v, m) {
                        if (v === 'REASSORT') {
                            m.style = 'color:#1f7a1f; font-weight:bold;';
                        } else if (v === 'ASSORT') {
                            m.style = 'color:#cc6600; font-weight:bold;';
                        }
                        return v;
                    }
                },
                {header: 'Qte', dataIndex: 'int_QTE', align: 'center', flex: 0.6},
                {
                    header: 'Rayon (avant -> apres)', align: 'center', flex: 1.3,
                    renderer: function (v, m, r) {
                        return r.get('int_STOCK_RAYON_AVANT') + ' → ' + r.get('int_STOCK_RAYON_APRES');
                    }
                },
                {
                    header: 'Reserve (avant -> apres)', align: 'center', flex: 1.3,
                    renderer: function (v, m, r) {
                        return r.get('int_STOCK_RESERVE_AVANT') + ' → ' + r.get('int_STOCK_RESERVE_APRES');
                    }
                },
                {header: 'Utilisateur', dataIndex: 'str_USER', flex: 1}
            ],
            viewConfig: {emptyText: 'Aucun mouvement enregistre.', deferEmptyText: false}
        });

        var win = new Ext.window.Window({
            autoShow: true,
            title: me.getTitre() || 'Historique des mouvements',
            width: 900,
            height: 500,
            minWidth: 600,
            minHeight: 350,
            layout: 'fit',
            modal: true,
            maximizable: true,
            items: [grid],
            buttons: [
                {
                    text: 'Imprimer',
                    handler: function () {
                        if (store.getCount() === 0) {
                            Ext.MessageBox.alert('Message', 'Aucune donnee a imprimer.');
                            return;
                        }
                        try {
                            Ext.ux.grid.Printer.print(grid);
                        } catch (e) {
                            window.print();
                        }
                    }
                },
                {text: 'Fermer', handler: function () {
                        win.close();
                    }}
            ]
        });

        me.callParent();
    }
});
