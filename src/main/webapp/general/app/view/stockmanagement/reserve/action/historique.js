var rsvmgr_url_mouvements = '../api/v1/reserve/mouvements/';

Ext.define('testextjs.view.stockmanagement.reserve.action.historique', {
    extend: 'Ext.window.Window',
    xtype: 'reservehistorique',
    requires: [
        'Ext.grid.*',
        'Ext.data.*',
        'Ext.window.Window'
    ],
    config: {
        odatasource: '',
        titre: ''
    },
    initComponent: function () {
        var ds = this.getOdatasource() || {};
        var familleId = ds.lg_FAMILLE_ID;

        var store = new Ext.data.Store({
            fields: [
                'lg_MOUVEMENT_ID', 'str_TYPE',
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
                url: rsvmgr_url_mouvements + familleId,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }
        });

        var grid = {
            xtype: 'grid',
            store: store,
            border: false,
            columns: [
                {
                    header: 'Date',
                    dataIndex: 'dt_CREATED',
                    flex: 1.4
                },
                {
                    header: 'Type',
                    dataIndex: 'str_TYPE',
                    flex: 1,
                    renderer: function (v, m) {
                        if (v === 'REASSORT') {
                            m.style = 'color:#1f7a1f; font-weight:bold;';
                        } else if (v === 'ASSORT') {
                            m.style = 'color:#cc6600; font-weight:bold;';
                        } else {
                            m.style = 'color:#888;';
                        }
                        return v;
                    }
                },
                {
                    header: 'Qte',
                    dataIndex: 'int_QTE',
                    align: 'center',
                    flex: 0.6
                },
                {
                    header: 'Rayon (avant -> apres)',
                    align: 'center',
                    flex: 1.4,
                    renderer: function (v, m, r) {
                        return r.get('int_STOCK_RAYON_AVANT') + ' → ' + r.get('int_STOCK_RAYON_APRES');
                    }
                },
                {
                    header: 'Reserve (avant -> apres)',
                    align: 'center',
                    flex: 1.4,
                    renderer: function (v, m, r) {
                        return r.get('int_STOCK_RESERVE_AVANT') + ' → ' + r.get('int_STOCK_RESERVE_APRES');
                    }
                },
                {
                    header: 'Utilisateur',
                    dataIndex: 'str_USER',
                    flex: 1
                }
            ],
            viewConfig: {
                emptyText: 'Aucun mouvement enregistre pour cet article.',
                deferEmptyText: false
            }
        };

        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre() || 'Historique des mouvements',
            width: 760,
            height: 420,
            minWidth: 500,
            minHeight: 300,
            layout: 'fit',
            modal: true,
            maximizable: true,
            items: [grid],
            buttons: [{
                text: 'Fermer',
                handler: function () {
                    win.close();
                }
            }]
        });
    }
});
