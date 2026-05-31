var rsvmgr_url_mouvements = '../api/v1/reserve/mouvements/';

Ext.define('testextjs.view.stockmanagement.reserve.action.historique', {
    extend: 'Ext.window.Window',
    xtype: 'reservehistorique',
    requires: [
        'Ext.grid.*',
        'Ext.data.*',
        'Ext.window.Window',
        'Ext.form.*'
    ],
    config: {
        odatasource: '',
        titre: ''
    },
    initComponent: function () {
        var me = this;
        var ds = me.getOdatasource() || {};
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
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: rsvmgr_url_mouvements + familleId,
                reader: {type: 'json', root: 'results', totalProperty: 'total'}
            }
        });

        var currentTypeFilter = 'TOUT';

        var loadWithFilters = function () {
            var extra = {};
            var dtStart = dtStartField.getValue();
            var dtEnd   = dtEndField.getValue();
            if (dtStart) {
                extra.dtStart = Ext.Date.format(dtStart, 'Y-m-d');
            }
            if (dtEnd) {
                extra.dtEnd = Ext.Date.format(dtEnd, 'Y-m-d');
            }
            store.getProxy().extraParams = extra;
            store.load({
                callback: function () {
                    // reapply type filter after reload
                    applyFilter(currentTypeFilter);
                }
            });
        };

        var applyFilter = function (type) {
            currentTypeFilter = type;
            store.clearFilter(true);
            if (type === 'ASSORT' || type === 'REASSORT') {
                store.filter('str_TYPE', type);
            }
        };

        var dtStartField = Ext.create('Ext.form.field.Date', {
            fieldLabel: 'Du',
            labelWidth: 25,
            width: 155,
            format: 'd/m/Y',
            emptyText: 'jj/mm/aaaa'
        });

        var dtEndField = Ext.create('Ext.form.field.Date', {
            fieldLabel: 'Au',
            labelWidth: 25,
            width: 155,
            format: 'd/m/Y',
            emptyText: 'jj/mm/aaaa'
        });

        var grid = {
            xtype: 'grid',
            store: store,
            border: false,
            tbar: [
                dtStartField, ' ',
                dtEndField, ' ',
                {text: 'Rechercher', handler: loadWithFilters},
                '-',
                'Filtrer :', ' ',
                {
                    text: 'Tout',
                    enableToggle: true,
                    pressed: true,
                    toggleGroup: 'histofiltre',
                    allowDepress: false,
                    toggleHandler: function (btn, pressed) {
                        if (pressed) { applyFilter('TOUT'); }
                    }
                },
                {
                    text: 'Assort',
                    enableToggle: true,
                    toggleGroup: 'histofiltre',
                    allowDepress: false,
                    toggleHandler: function (btn, pressed) {
                        if (pressed) { applyFilter('ASSORT'); }
                    }
                },
                {
                    text: 'Reassort',
                    enableToggle: true,
                    toggleGroup: 'histofiltre',
                    allowDepress: false,
                    toggleHandler: function (btn, pressed) {
                        if (pressed) { applyFilter('REASSORT'); }
                    }
                }
            ],
            columns: [
                {header: 'Date', dataIndex: 'dt_CREATED', flex: 1.4},
                {
                    header: 'Type', dataIndex: 'str_TYPE', flex: 1,
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
                {header: 'Qte', dataIndex: 'int_QTE', align: 'center', flex: 0.6},
                {
                    header: 'Rayon (avant -> apres)', align: 'center', flex: 1.4,
                    renderer: function (v, m, r) {
                        return r.get('int_STOCK_RAYON_AVANT') + ' → ' + r.get('int_STOCK_RAYON_APRES');
                    }
                },
                {
                    header: 'Reserve (avant -> apres)', align: 'center', flex: 1.4,
                    renderer: function (v, m, r) {
                        return r.get('int_STOCK_RESERVE_AVANT') + ' → ' + r.get('int_STOCK_RESERVE_APRES');
                    }
                },
                {header: 'Utilisateur', dataIndex: 'str_USER', flex: 1}
            ],
            viewConfig: {
                emptyText: 'Aucun mouvement enregistre pour cet article.',
                deferEmptyText: false
            }
        };

        var openPrint = function () {
            var proxy = store.getProxy();
            var extra = proxy.extraParams || {};
            var titre = me.getTitre() || 'Historique des mouvements';
            var qs = 'mode=historique_article&familleId=' + encodeURIComponent(familleId)
                    + '&titre=' + encodeURIComponent(titre);
            if (extra.dtStart) {
                qs += '&dtStart=' + encodeURIComponent(extra.dtStart);
            }
            if (extra.dtEnd) {
                qs += '&dtEnd=' + encodeURIComponent(extra.dtEnd);
            }
            qs += '&autoload=1';
            window.open('../reserveprint.html?' + qs, '_blank',
                    'width=1100,height=750,scrollbars=yes,resizable=yes');
        };

        var win = new Ext.window.Window({
            autoShow: true,
            title: me.getTitre() || 'Historique des mouvements',
            width: 800,
            height: 460,
            minWidth: 550,
            minHeight: 320,
            layout: 'fit',
            modal: true,
            maximizable: true,
            resizable: true,
            items: [grid],
            buttons: [
                {text: 'Imprimer', handler: openPrint},
                {text: 'Fermer', handler: function () { win.close(); }}
            ]
        });

        // Chargement initial
        loadWithFilters();
    }
});
