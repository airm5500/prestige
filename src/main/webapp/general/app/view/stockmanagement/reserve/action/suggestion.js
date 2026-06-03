/* global Ext */

// Fenetre de suggestion : propose les produits a (re)assortir selon les
// quantites calculees, modifiables, puis valide en lot.
//   mode 'reappro'  -> suggestions-reappro (rayon -> reserve) / assort-batch
//   mode 'reassort' -> suggestions          (reserve -> rayon) / reassort-batch
Ext.define('testextjs.view.stockmanagement.reserve.action.suggestion', {
    extend: 'Ext.window.Window',
    xtype: 'reservesuggestion',
    requires: ['Ext.grid.*', 'Ext.data.*', 'Ext.window.Window'],
    config: {
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function () {
        var me = this;
        var mode = me.getMode();

        var url = (mode === 'reappro')
                ? '../api/v1/reserve/suggestions-reappro'
                : '../api/v1/reserve/suggestions';
        var batchUrl = (mode === 'reappro')
                ? '../api/v1/reserve/assort-batch'
                : '../api/v1/reserve/reassort-batch';

        var store = new Ext.data.Store({
            model: 'testextjs.model.FamilleStock',
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url,
                extraParams: {limit: 1000},
                reader: {type: 'json', root: 'results', totalProperty: 'total'}
            }
        });

        var grid = Ext.create('Ext.grid.Panel', {
            store: store,
            flex: 1,
            border: false,
            plugins: [Ext.create('Ext.grid.plugin.CellEditing', {clicksToEdit: 1})],
            columns: [
                {header: 'CIP', dataIndex: 'int_CIP', width: 90},
                {header: 'Designation', dataIndex: 'str_NAME', flex: 1},
                {header: 'Stock Rayon', dataIndex: 'int_STOCK_RAYON', width: 90, align: 'center'},
                {header: 'Stock Reserve', dataIndex: 'int_STOCK_RESERVE', width: 95, align: 'center'},
                {
                    header: 'Quantite', dataIndex: 'int_QTE_SUGGEREE', width: 90, align: 'center',
                    editor: {xtype: 'numberfield', minValue: 0, allowBlank: false},
                    renderer: function (v, m) {
                        m.style = 'color:#6600cc; font-weight:bold;';
                        return v;
                    }
                },
                {
                    xtype: 'actioncolumn', width: 30, sortable: false, menuDisabled: true,
                    items: [{
                        icon: 'resources/images/icons/fam/delete.png',
                        tooltip: 'Retirer de la suggestion',
                        handler: function (g, rowIndex) {
                            store.removeAt(rowIndex);
                        }
                    }]
                }
            ],
            viewConfig: {
                emptyText: 'Aucune suggestion.',
                deferEmptyText: false
            }
        });

        var win = new Ext.window.Window({
            autoShow: true,
            title: me.getTitre(),
            width: 620,
            height: 460,
            minWidth: 480,
            minHeight: 320,
            layout: 'fit',
            modal: true,
            items: [grid],
            buttons: [
                {
                    text: 'Valider',
                    handler: function () {
                        var items = [];
                        store.each(function (r) {
                            var qte = parseInt(r.get('int_QTE_SUGGEREE'), 10);
                            if (!isNaN(qte) && qte > 0) {
                                items.push({lg_FAMILLE_ID: r.get('lg_FAMILLE_ID'), int_QTE: qte});
                            }
                        });
                        if (items.length === 0) {
                            Ext.MessageBox.alert('Message', 'Aucune quantite a traiter.');
                            return;
                        }
                        Ext.MessageBox.confirm('Confirmation',
                                'Valider ' + items.length + ' operation(s) ?',
                                function (btn) {
                                    if (btn !== 'yes') {
                                        return;
                                    }
                                    var progress = Ext.MessageBox.wait('Veuillez patienter...', 'Traitement en cours');
                                    Ext.Ajax.request({
                                        method: 'POST',
                                        url: batchUrl,
                                        jsonData: {items: items},
                                        success: function (response) {
                                            progress.hide();
                                            var res = Ext.JSON.decode(response.responseText, true);
                                            Ext.MessageBox.alert('Resultat',
                                                    (res.traites || 0) + ' / ' + (res.total || 0) + ' operation(s) effectuee(s).');
                                            var pv = me.getParentview();
                                            if (pv && pv.reloadGrid) {
                                                pv.reloadGrid();
                                            }
                                            if (typeof refreshNotificationBadge === 'function') {
                                                refreshNotificationBadge();
                                            }
                                            win.close();
                                        },
                                        failure: function () {
                                            progress.hide();
                                            Ext.MessageBox.alert('Erreur', 'Echec du traitement.');
                                        }
                                    });
                                });
                    }
                },
                {text: 'Annuler', handler: function () {
                        win.close();
                    }}
            ]
        });

        me.callParent();
    }
});
