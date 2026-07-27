/* global Ext */

// Fenetre "panier" pour constituer une liste de (re)assorts puis valider en lot.
//   mode 'assort'   -> rayon vers reserve   (endpoint assort-batch)
//   mode 'reassort' -> reserve vers rayon   (endpoint reassort-batch)
Ext.define('testextjs.view.stockmanagement.reserve.action.reappro', {
    extend: 'Ext.window.Window',
    xtype: 'reservereappro',
    requires: ['Ext.form.*', 'Ext.grid.*', 'Ext.data.*', 'Ext.window.Window'],
    config: {
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function () {
        var me = this;
        var mode = me.getMode();

        // Store de recherche des produits avec reserve
        var searchStore = new Ext.data.Store({
            model: 'testextjs.model.FamilleStock',
            proxy: {
                type: 'ajax',
                url: '../api/v1/reserve/articles',
                extraParams: {str_TYPE_TRANSACTION: 'ALL'},
                reader: {type: 'json', root: 'results', totalProperty: 'total'}
            }
        });

        // Store du panier (en memoire)
        var cartStore = new Ext.data.Store({
            fields: ['lg_FAMILLE_ID', 'str_NAME', 'int_CIP',
                {name: 'int_QTE', type: 'int'},
                {name: 'available', type: 'int'}]
        });

        var stockLabel = (mode === 'assort') ? 'Stock rayon' : 'Stock reserve';
        // assort  = le trop-plein du rayon part EN RESERVE
        // reassort = la reserve remonte AU RAYON
        var categorie = (mode === 'assort') ? 'RESERVE' : 'RAYON';

        // Motifs du referentiel, restreints au sens courant. Le motif est obligatoire.
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

        var barreMotif = {
            xtype: 'toolbar', dock: 'bottom',
            items: [
                {
                    xtype: 'combo', itemId: 'cboMotifReappro', fieldLabel: 'Motif *', labelWidth: 50, width: 260,
                    editable: false, allowBlank: false, forceSelection: true, queryMode: 'local',
                    displayField: 'libelle', valueField: 'id',
                    emptyText: 'Motif (obligatoire)', store: storeMotifs
                },
                {xtype: 'textfield', itemId: 'txtCommentaireReappro', flex: 1,
                    emptyText: 'Commentaire (facultatif)'}
            ]
        };

        // Bascule sur l'onglet SUGGESTIONS et ouvre la suggestion creee.
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

        var combo = Ext.create('Ext.form.field.ComboBox', {
            fieldLabel: 'Produit',
            labelWidth: 60,
            flex: 1,
            store: searchStore,
            queryParam: 'search_value',
            valueField: 'lg_FAMILLE_ID',
            displayField: 'str_NAME',
            typeAhead: false,
            minChars: 2,
            queryMode: 'remote',
            hideTrigger: true,
            emptyText: 'Taper le code ou le nom...',
            listConfig: {
                getInnerTpl: function () {
                    return '{str_NAME} <span style="color:#888;">[{int_CIP}] ' +
                            'Rayon:{int_STOCK_RAYON} / Reserve:{int_STOCK_RESERVE}</span>';
                }
            }
        });

        var qteField = Ext.create('Ext.form.field.Number', {
            fieldLabel: 'Quantite',
            labelWidth: 60,
            width: 150,
            minValue: 1,
            value: 1,
            enableKeyEvents: true,
            listeners: {
                keydown: function (field, e) {
                    if (e.getKey() === e.ENTER) {
                        addToCart();
                    }
                }
            }
        });

        var infoLabel = Ext.create('Ext.form.field.Display', {
            value: '',
            flex: 1,
            fieldStyle: 'color:#444;'
        });

        combo.on('select', function (cmp, records) {
            if (records && records.length) {
                var r = records[0];
                var dispo = (mode === 'assort') ? r.get('int_STOCK_RAYON') : r.get('int_STOCK_RESERVE');
                infoLabel.setValue(stockLabel + ' disponible : <b>' + dispo + '</b>');
                // Curseur vers quantite avec contenu preselectionne
                qteField.focus(true, 100);
            }
        });

        var addToCart = function () {
            var rec = combo.findRecordByValue(combo.getValue());
            if (!rec) {
                Ext.MessageBox.alert('Message', 'Veuillez selectionner un produit.');
                return;
            }
            var qte = parseInt(qteField.getValue(), 10);
            if (isNaN(qte) || qte <= 0) {
                Ext.MessageBox.alert('Message', 'Quantite invalide.');
                return;
            }
            var dispo = (mode === 'assort') ? rec.get('int_STOCK_RAYON') : rec.get('int_STOCK_RESERVE');
            if (qte > dispo) {
                Ext.MessageBox.alert('Message', 'La quantite (' + qte + ') depasse le ' +
                        stockLabel.toLowerCase() + ' disponible (' + dispo + ').');
                return;
            }
            var id = rec.get('lg_FAMILLE_ID');
            var existing = cartStore.findRecord('lg_FAMILLE_ID', id);
            if (existing) {
                existing.set('int_QTE', existing.get('int_QTE') + qte);
            } else {
                cartStore.add({
                    lg_FAMILLE_ID: id,
                    str_NAME: rec.get('str_NAME'),
                    int_CIP: rec.get('int_CIP'),
                    int_QTE: qte,
                    available: dispo
                });
            }
            combo.clearValue();
            infoLabel.setValue('');
            qteField.setValue(1);
            combo.focus();
        };

        var cartGrid = Ext.create('Ext.grid.Panel', {
            store: cartStore,
            flex: 1,
            border: true,
            plugins: [Ext.create('Ext.grid.plugin.CellEditing', {clicksToEdit: 1})],
            columns: [
                {header: 'CIP', dataIndex: 'int_CIP', width: 90},
                {header: 'Designation', dataIndex: 'str_NAME', flex: 1},
                {
                    header: 'Quantite', dataIndex: 'int_QTE', width: 90, align: 'center',
                    editor: {xtype: 'numberfield', minValue: 1, allowBlank: false}
                },
                {header: stockLabel, dataIndex: 'available', width: 90, align: 'center'},
                {
                    xtype: 'actioncolumn', width: 30,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.png',
                            tooltip: 'Retirer',
                            handler: function (grid, rowIndex) {
                                cartStore.removeAt(rowIndex);
                            }
                        }]
                }
            ],
            viewConfig: {emptyText: 'Panier vide. Ajoutez des produits ci-dessus.', deferEmptyText: false}
        });

        var win = new Ext.window.Window({
            autoShow: false,
            title: me.getTitre(),
            width: 640,
            height: 480,
            minWidth: 500,
            minHeight: 360,
            layout: 'vbox',
            modal: true,
            bodyPadding: 8,
            defaults: {width: '100%'},
            items: [
                {
                    xtype: 'fieldset',
                    title: 'Rechercher un produit',
                    layout: 'vbox',
                    defaults: {width: '100%'},
                    items: [
                        {xtype: 'container', layout: {type: 'hbox', align: 'middle'}, items: [combo]},
                        {xtype: 'container', layout: {type: 'hbox', align: 'middle'}, margin: '5 0 0 0',
                            items: [qteField, {xtype: 'button', text: 'Ajouter au panier', margin: '0 0 0 10',
                                    handler: addToCart}, {xtype: 'tbspacer', width: 15}, infoLabel]}
                    ]
                },
                {xtype: 'component', html: '<b>Panier</b>', margin: '6 0 4 0'},
                cartGrid
            ],
            dockedItems: [barreMotif],
            buttons: [
                {
                    // Le stock n'est plus deplace ici : on enregistre une suggestion, tracee, qui sera
                    // relue puis traitee depuis l'onglet SUGGESTIONS.
                    text: 'Creer la suggestion',
                    cls: 'btn-suggestions-violet',
                    handler: function () {
                        if (cartStore.getCount() === 0) {
                            Ext.MessageBox.alert('Message', 'Le panier est vide.');
                            return;
                        }
                        var cboMotif = win.down('#cboMotifReappro');
                        if (!cboMotif || !cboMotif.getValue()) {
                            Ext.MessageBox.alert('Motif obligatoire',
                                    'Indiquez le motif de cette suggestion avant de la creer.');
                            if (cboMotif) {
                                cboMotif.markInvalid('Motif obligatoire');
                                cboMotif.focus();
                            }
                            return;
                        }
                        var txtCom = win.down('#txtCommentaireReappro');
                        var items = [];
                        cartStore.each(function (r) {
                            items.push({lg_FAMILLE_ID: r.get('lg_FAMILLE_ID'), int_QTE: r.get('int_QTE')});
                        });
                        var progress = Ext.MessageBox.wait('Veuillez patienter...', 'Creation en cours');
                        Ext.Ajax.request({
                            method: 'POST',
                            url: '../api/v1/suggestion-reserve/creer',
                            jsonData: {
                                categorie: categorie,
                                motifId: cboMotif.getValue(),
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

        // Auto-focus sur le champ produit apres affichage complet de la fenetre
        var focusCombo = function () {
            Ext.defer(function () {
                if (combo.inputEl && combo.inputEl.dom) {
                    combo.inputEl.dom.focus();
                } else {
                    combo.focus();
                }
            }, 300);
        };
        win.on('show', focusCombo);
        win.show();

        me.callParent();
    }
});
