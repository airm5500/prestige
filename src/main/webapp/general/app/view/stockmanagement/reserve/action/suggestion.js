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
        // Sens du mouvement, au vocabulaire des suggestions : on nomme la ZONE DE DESTINATION.
        //   reappro  = le trop-plein du rayon part EN RESERVE
        //   reassort = la reserve remonte AU RAYON
        var categorie = (mode === 'reappro') ? 'RESERVE' : 'RAYON';

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
                    editor: {
                        xtype: 'numberfield', minValue: 0, allowBlank: false,
                        listeners: {
                            focus: function (fld) {
                                Ext.defer(function () {
                                    if (fld.inputEl && fld.inputEl.dom) {
                                        fld.inputEl.dom.select();
                                    }
                                }, 50);
                            }
                        }
                    },
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

        // Motifs du referentiel, restreints au sens courant.
        var storeMotifs = new Ext.data.Store({
            fields: ['id', 'libelle'],
            proxy: {
                type: 'ajax',
                url: '../api/v1/suggestion-reserve/motifs',
                extraParams: {categorie: categorie},
                reader: {type: 'json'}
            }
        });
        storeMotifs.load();

        var barreCreation = {
            xtype: 'toolbar', dock: 'bottom',
            items: [
                {
                    xtype: 'combo', itemId: 'cboMotif', fieldLabel: 'Motif', labelWidth: 40, width: 250,
                    editable: false, queryMode: 'local', displayField: 'libelle', valueField: 'id',
                    emptyText: 'Motif (facultatif)', store: storeMotifs
                },
                {
                    xtype: 'textfield', itemId: 'txtCommentaire', flex: 1,
                    emptyText: 'Commentaire (facultatif)'
                }
            ]
        };

        var win = new Ext.window.Window({
            autoShow: true,
            title: me.getTitre(),
            width: 900,
            height: 560,
            minWidth: 640,
            minHeight: 380,
            layout: 'fit',
            modal: true,
            maximizable: true,
            constrainHeader: true,
            items: [grid],
            dockedItems: [barreCreation],
            buttons: [
                {
                    // On ne deplace plus le stock ici : on enregistre une suggestion, qui sera
                    // relue puis traitee depuis l'onglet SUGGESTIONS.
                    text: 'Creer la suggestion',
                    cls: 'btn-suggestions-violet',
                    handler: function () {
                        var items = [];
                        store.each(function (r) {
                            var qte = parseInt(r.get('int_QTE_SUGGEREE'), 10);
                            if (!isNaN(qte) && qte > 0) {
                                items.push({lg_FAMILLE_ID: r.get('lg_FAMILLE_ID'), int_QTE: qte});
                            }
                        });
                        if (items.length === 0) {
                            Ext.MessageBox.alert('Message', 'Aucun article a proposer.');
                            return;
                        }
                        var cboMotif = win.down('#cboMotif');
                        var txtCom = win.down('#txtCommentaire');
                        var progress = Ext.MessageBox.wait('Veuillez patienter...', 'Creation en cours');
                        Ext.Ajax.request({
                            method: 'POST',
                            url: '../api/v1/suggestion-reserve/creer',
                            jsonData: {
                                categorie: categorie,
                                motifId: (cboMotif && cboMotif.getValue()) ? cboMotif.getValue() : null,
                                commentaire: (txtCom && txtCom.getValue()) ? txtCom.getValue() : null,
                                items: items
                            },
                            success: function (response) {
                                progress.hide();
                                var res = Ext.JSON.decode(response.responseText, true) || {};
                                if (res.success === false) {
                                    Ext.MessageBox.alert('Message', res.message || 'Creation impossible.');
                                    return;
                                }
                                win.close();
                                allerAuxSuggestions(res);
                            },
                            failure: function () {
                                progress.hide();
                                Ext.MessageBox.alert('Erreur', 'La creation a echoue.');
                            }
                        });
                    }
                },
                {text: 'Annuler', handler: function () {
                        win.close();
                    }}
            ]
        });

        // Bascule sur l'onglet SUGGESTIONS et ouvre directement la suggestion creee.
        var allerAuxSuggestions = function (res) {
            var manager = Ext.getCmp('reservemanagerID');
            var onglet = manager ? manager.down('#ongletSuggestions') : null;
            if (!manager || !onglet) {
                Ext.MessageBox.alert('Suggestion creee',
                        (res.lignes || 0) + ' article(s). Retrouvez-la dans l\'onglet SUGGESTIONS.');
                return;
            }
            manager.setActiveTab(onglet);
            onglet.reloadGrid();
            if (res.lg_SUGGESTION_RESERVE_ID) {
                Ext.create('testextjs.view.stockmanagement.reserve.action.traitementSuggestion', {
                    suggestionid: res.lg_SUGGESTION_RESERVE_ID,
                    parentview: onglet
                });
            }
        };

        me.callParent();
    }
});
