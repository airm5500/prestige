/* global Ext */

Ext.define('testextjs.view.commandemanagement.bonlivraison.ReconciliationPanel', {
    extend: 'Ext.window.Window',
    xtype: 'reconciliation-panel',

    title: 'Réconciliation des produits non reconnus',
    width: 1100,
    height: 520,
    layout: 'border',
    modal: true,
    closable: true,
    resizable: true,
    maximizable: true,
    closeAction: 'destroy',

    config: {
        orderId: null,
        grossisteId: null,
        nonReconnus: [],
        nbReconnus: 0,
        nbTotal: 0,
        csvLink: null,
        parentGrid: null
    },

    initComponent: function () {
        var me = this;
        me.rows = [];
        me.reconcilesCount = 0;

        Ext.Array.each(me.getNonReconnus(), function (item) {
            me.rows.push(Ext.apply({}, item, { statut: 'pending', familleId: null, familleName: null }));
        });

        me.items = [
            me.buildHeaderPanel(),
            me.buildGrid()
        ];

        me.buttons = [
            {
                text: 'Télécharger le CSV des non reconnus',
                handler: function () {
                    if (me.getCsvLink()) {
                        window.open(me.getCsvLink(), '_blank');
                    }
                }
            },
            '->',
            {
                text: 'Terminer',
                handler: function () {
                    var pg = me.getParentGrid();
                    if (pg) {
                        pg.getStore().reload();
                    }
                    me.destroy();
                }
            }
        ];

        me.callParent();
        me.updateScore();
    },

    buildHeaderPanel: function () {
        var me = this;
        return {
            xtype: 'panel',
            region: 'north',
            height: 50,
            bodyPadding: '10 15',
            border: false,
            html: me.buildScoreHtml()
        };
    },

    buildScoreHtml: function () {
        var me = this;
        var total = me.rows.length;
        var done = me.reconcilesCount;
        return '<div style="font-size:14px;">'
            + '<b>Produits non reconnus à traiter : ' + total + '</b>'
            + ' &nbsp;|&nbsp; '
            + '<span id="reconcile-score" style="color:' + (done === total ? 'green' : 'darkorange') + ';font-weight:bold;">'
            + done + '/' + total + ' réconciliés</span>'
            + '</div>';
    },

    updateScore: function () {
        var me = this;
        me.reconcilesCount = Ext.Array.filter(me.rows, function (r) {
            return r.statut !== 'pending';
        }).length;

        var headerPanel = me.down('panel[region=north]');
        if (headerPanel) {
            headerPanel.update(me.buildScoreHtml());
        }

        me.getGrid().getStore().reload();
        me.persistRemaining();
    },

    // Met à jour le fichier persisté côté serveur : on retire les lignes
    // définitivement traitées (associées/créées) pour éviter tout doublon
    // si l'utilisateur rouvre la réconciliation ultérieurement.
    persistRemaining: function () {
        var me = this;
        var remaining = Ext.Array.filter(me.rows, function (r) {
            return r.statut !== 'associe' && r.statut !== 'cree';
        });
        Ext.Ajax.request({
            url: '../commande?action=reconciliation-save&orderId=' + me.getOrderId(),
            method: 'POST',
            jsonData: {
                grossisteId: me.getGrossisteId(),
                nbReconnus: me.getNbReconnus(),
                nbTotal: me.getNbTotal(),
                nonReconnus: remaining
            }
        });
    },

    buildGrid: function () {
        var me = this;
        var store = Ext.create('Ext.data.Store', {
            fields: ['cip', 'libelle', 'cmde', 'cmdeL', 'prixAchat', 'ug', 'statut', 'familleName'],
            data: me.rows
        });

        me.gridStore = store;

        return {
            xtype: 'grid',
            region: 'center',
            itemId: 'reconcileGrid',
            store: store,
            stripeRows: true,
            forceFit: false,
            listeners: {
                cellclick: function (grid, td, cellIndex, record, tr, rowIndex, e) {
                    var target = e.getTarget('.reconcile-action');
                    if (!target) {
                        return;
                    }
                    var action = target.getAttribute('data-action');
                    if (action === 'ignorer') {
                        if (record.get('statut') === 'ignore') {
                            // remettre en attente si ignoré par erreur
                            record.set('statut', 'pending');
                            me.rows[rowIndex].statut = 'pending';
                            me.updateScore();
                        } else if (record.get('statut') === 'pending') {
                            record.set('statut', 'ignore');
                            me.rows[rowIndex].statut = 'ignore';
                            me.updateScore();
                        }
                        return;
                    }
                    if (record.get('statut') !== 'pending') {
                        return;
                    }
                    if (action === 'associer') {
                        me.openAssocierDialog(record, rowIndex);
                    } else if (action === 'creer') {
                        me.openCreerDialog(record, rowIndex);
                    }
                }
            },
            columns: [
                {
                    text: 'Statut',
                    dataIndex: 'statut',
                    width: 105,
                    renderer: function (v) {
                        if (v === 'associe') return '<span style="color:green;font-weight:bold;">&#10004; Associé</span>';
                        if (v === 'cree') return '<span style="color:green;font-weight:bold;">&#10010; Créé</span>';
                        if (v === 'ignore') return '<span style="color:gray;">&#10006; Ignoré</span>';
                        return '<span style="color:darkorange;">&#9203; En attente</span>';
                    }
                },
                { text: 'Code BL', dataIndex: 'cip', width: 120 },
                {
                    text: 'Libellé BL',
                    dataIndex: 'libelle',
                    width: 200,
                    renderer: function (v, metaData) {
                        if (v) {
                            metaData.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(v) + '"';
                        }
                        return v || '';
                    }
                },
                { text: 'Qté cmdée', dataIndex: 'cmde', width: 75, align: 'center' },
                { text: 'Qté livrée', dataIndex: 'cmdeL', width: 75, align: 'center' },
                { text: 'Prix Achat', dataIndex: 'prixAchat', width: 85, align: 'right' },
                { text: 'UG', dataIndex: 'ug', width: 45, align: 'center' },
                {
                    text: 'Produit associé',
                    dataIndex: 'familleName',
                    width: 180,
                    renderer: function (v) {
                        return v ? '<span style="color:green;">' + v + '</span>' : '-';
                    }
                },
                {
                    text: 'Actions',
                    width: 230,
                    sortable: false,
                    menuDisabled: true,
                    dataIndex: 'statut',
                    renderer: function (v) {
                        if (v === 'associe' || v === 'cree') {
                            return '<span style="color:gray;">Traité</span>';
                        }
                        var btn = function (action, label, color) {
                            return '<a href="#" class="reconcile-action" data-action="' + action + '" '
                                + 'style="display:inline-block;margin:1px 2px;padding:2px 6px;border:1px solid ' + color + ';'
                                + 'border-radius:3px;color:' + color + ';text-decoration:none;font-size:11px;cursor:pointer;">'
                                + label + '</a>';
                        };
                        if (v === 'ignore') {
                            return btn('ignorer', 'Remettre en attente', '#e65100');
                        }
                        return btn('associer', 'Associer', '#1565c0')
                            + btn('creer', 'Créer', '#2e7d32')
                            + btn('ignorer', 'Ignorer', '#757575');
                    }
                }
            ]
        };
    },

    getGrid: function () {
        return this.down('#reconcileGrid');
    },

    openAssocierDialog: function (record, rowIndex) {
        var me = this;

        var searchStore = Ext.create('Ext.data.Store', {
            fields: ['lgFAMILLEID', 'strNAME', 'intCIP', 'intPRICE', 'intNUMBERAVAILABLE'],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/vente/search',
                reader: { type: 'json', root: 'data' }
            }
        });

        var dialog = Ext.create('Ext.window.Window', {
            title: 'Associer — Code BL : ' + record.get('cip') + '  |  ' + record.get('libelle'),
            width: 600,
            height: 350,
            modal: true,
            layout: 'border',
            items: [
                {
                    xtype: 'panel',
                    region: 'north',
                    height: 50,
                    bodyPadding: '10 15',
                    items: [
                        {
                            xtype: 'textfield',
                            itemId: 'searchField',
                            fieldLabel: 'Rechercher',
                            labelWidth: 80,
                            width: 400,
                            emptyText: 'Nom ou code CIP (min. 3 caractères)...',
                            enableKeyEvents: true,
                            listeners: {
                                keyup: function (field) {
                                    var val = field.getValue();
                                    if (val && val.length >= 3) {
                                        searchStore.load({ params: { query: val } });
                                    } else if (!val || val.length === 0) {
                                        searchStore.removeAll();
                                    }
                                }
                            }
                        }
                    ]
                },
                {
                    xtype: 'grid',
                    region: 'center',
                    itemId: 'resultGrid',
                    store: searchStore,
                    columns: [
                        { text: 'CIP', dataIndex: 'intCIP', width: 100 },
                        { text: 'Nom', dataIndex: 'strNAME', flex: 1 },
                        { text: 'Stock', dataIndex: 'intNUMBERAVAILABLE', width: 70, align: 'center' },
                        { text: 'Prix', dataIndex: 'intPRICE', width: 80, align: 'right' }
                    ],
                    listeners: {
                        itemdblclick: function (grid, selectedRecord) {
                            me.confirmerAssociation(record, rowIndex, selectedRecord, dialog);
                        }
                    }
                }
            ],
            buttons: [
                {
                    text: 'Associer le produit sélectionné',
                    handler: function () {
                        var resultGrid = dialog.down('#resultGrid');
                        var sel = resultGrid.getSelectionModel().getSelection();
                        if (!sel.length) {
                            Ext.Msg.alert('Sélection requise', 'Veuillez sélectionner un produit dans la liste.');
                            return;
                        }
                        me.confirmerAssociation(record, rowIndex, sel[0], dialog);
                    }
                },
                {
                    text: 'Annuler',
                    handler: function () { dialog.destroy(); }
                }
            ]
        });

        dialog.show();
    },

    confirmerAssociation: function (blRecord, rowIndex, produitRecord, dialog) {
        var me = this;
        var familleId = produitRecord.get('lgFAMILLEID');
        var cipBl = blRecord.get('cip');
        var qty = blRecord.get('cmdeL') || blRecord.get('cmde') || 0;
        var prixAchat = blRecord.get('prixAchat') || 0;
        var ug = blRecord.get('ug') || 0;

        dialog.setLoading('Mise à jour en cours...');

        Ext.Ajax.request({
            url: '../api/v1/produit/update-cip/' + familleId,
            method: 'PUT',
            jsonData: {
                newCip: cipBl,
                grossisteId: me.getGrossisteId()
            },
            success: function (response) {
                var res = Ext.JSON.decode(response.responseText, true);
                if (res && res.success) {
                    me.ajouterLigneCommande(familleId, qty, prixAchat, ug, function () {
                        blRecord.set('statut', 'associe');
                        blRecord.set('familleName', produitRecord.get('strNAME'));
                        me.rows[rowIndex].statut = 'associe';
                        me.rows[rowIndex].familleId = familleId;
                        me.rows[rowIndex].familleName = produitRecord.get('strNAME');
                        dialog.destroy();
                        me.updateScore();
                    });
                } else {
                    dialog.setLoading(false);
                    Ext.Msg.alert('Erreur', res && res.message ? res.message : 'Impossible de mettre à jour le code CIP.');
                }
            },
            failure: function () {
                dialog.setLoading(false);
                Ext.Msg.alert('Erreur', 'Erreur réseau lors de la mise à jour du code CIP.');
            }
        });
    },

    ajouterLigneCommande: function (familleId, qty, prixAchat, ug, callback) {
        var me = this;
        Ext.Ajax.request({
            url: '../api/v1/commande/reconcilier-ligne',
            method: 'POST',
            jsonData: {
                orderId: me.getOrderId(),
                familleId: familleId,
                qty: qty,
                prixAchat: prixAchat,
                ug: ug
            },
            success: function (response) {
                var res = Ext.JSON.decode(response.responseText, true);
                if (res && res.success) {
                    if (callback) callback();
                } else {
                    Ext.Msg.alert('Avertissement', 'La ligne a été associée mais n\'a pas pu être ajoutée à la commande.');
                    if (callback) callback();
                }
            },
            failure: function () {
                Ext.Msg.alert('Erreur', 'Erreur réseau lors de l\'ajout de la ligne à la commande.');
            }
        });
    },

    openCreerDialog: function (record, rowIndex) {
        var me = this;

        var familleArticleStore = Ext.create('Ext.data.Store', {
            fields: ['lg_FAMILLEARTICLE_ID', 'str_LIBELLE'],
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/famille-article',
                reader: { type: 'json', root: 'data' }
            },
            autoLoad: true
        });

        var dialog = Ext.create('Ext.window.Window', {
            title: 'Créer le produit — Code BL : ' + record.get('cip'),
            width: 500,
            height: 400,
            modal: true,
            layout: 'fit',
            items: [
                {
                    xtype: 'form',
                    itemId: 'createForm',
                    bodyPadding: 15,
                    fieldDefaults: { labelAlign: 'right', labelWidth: 120, anchor: '100%' },
                    items: [
                        {
                            xtype: 'textfield',
                            name: 'intCip',
                            fieldLabel: 'Code CIP',
                            allowBlank: false,
                            value: record.get('cip')
                        },
                        {
                            xtype: 'textfield',
                            name: 'strName',
                            fieldLabel: 'Nom',
                            allowBlank: false,
                            value: record.get('libelle')
                        },
                        {
                            xtype: 'textfield',
                            name: 'strDescription',
                            fieldLabel: 'Description',
                            allowBlank: false,
                            value: record.get('libelle')
                        },
                        {
                            xtype: 'numberfield',
                            name: 'intPaf',
                            fieldLabel: 'Prix Achat (PAF)',
                            allowBlank: false,
                            value: record.get('prixAchat') || 0
                        },
                        {
                            xtype: 'numberfield',
                            name: 'intPrice',
                            fieldLabel: 'Prix Vente',
                            allowBlank: false,
                            value: record.get('prixUn') || 0
                        },
                        {
                            xtype: 'combobox',
                            name: 'lgFamilleArticleId',
                            fieldLabel: 'Famille Article',
                            allowBlank: false,
                            store: familleArticleStore,
                            valueField: 'lg_FAMILLEARTICLE_ID',
                            displayField: 'str_LIBELLE',
                            queryMode: 'local',
                            emptyText: 'Sélectionner une famille...'
                        },
                        {
                            xtype: 'hiddenfield',
                            name: 'lgGrossisteId',
                            value: me.getGrossisteId()
                        }
                    ]
                }
            ],
            buttons: [
                {
                    text: 'Créer le produit',
                    formBind: true,
                    handler: function (btn) {
                        var form = dialog.down('#createForm');
                        if (!form.isValid()) {
                            Ext.Msg.alert('Formulaire incomplet', 'Veuillez remplir tous les champs obligatoires.');
                            return;
                        }
                        me.soumettreCreation(form.getValues(), record, rowIndex, dialog);
                    }
                },
                {
                    text: 'Annuler',
                    handler: function () { dialog.destroy(); }
                }
            ]
        });

        dialog.show();
    },

    soumettreCreation: function (values, blRecord, rowIndex, dialog) {
        var me = this;
        dialog.setLoading('Création en cours...');

        Ext.Ajax.request({
            url: '../api/v1/produit/create',
            method: 'POST',
            jsonData: values,
            success: function (response) {
                var res = Ext.JSON.decode(response.responseText, true);
                if (res && res.success === '1') {
                    me.rechercherProduitParCip(values.intCip, function (familleId, familleName) {
                        if (familleId) {
                            var qty = blRecord.get('cmdeL') || blRecord.get('cmde') || 0;
                            var prixAchat = blRecord.get('prixAchat') || 0;
                            var ug = blRecord.get('ug') || 0;
                            me.ajouterLigneCommande(familleId, qty, prixAchat, ug, function () {
                                blRecord.set('statut', 'cree');
                                blRecord.set('familleName', familleName || values.strName);
                                me.rows[rowIndex].statut = 'cree';
                                me.rows[rowIndex].familleId = familleId;
                                dialog.destroy();
                                me.updateScore();
                            });
                        } else {
                            dialog.setLoading(false);
                            Ext.Msg.alert('Info', 'Produit créé mais non retrouvé. La ligne sera traitée lors de la prochaine importation.');
                            blRecord.set('statut', 'cree');
                            me.rows[rowIndex].statut = 'cree';
                            dialog.destroy();
                            me.updateScore();
                        }
                    });
                } else {
                    dialog.setLoading(false);
                    Ext.Msg.alert('Erreur', res && res.message ? res.message : 'Erreur lors de la création du produit.');
                }
            },
            failure: function () {
                dialog.setLoading(false);
                Ext.Msg.alert('Erreur', 'Erreur réseau lors de la création du produit.');
            }
        });
    },

    rechercherProduitParCip: function (cip, callback) {
        Ext.Ajax.request({
            url: '../api/v1/vente/search',
            method: 'GET',
            params: { search: cip },
            success: function (response) {
                var res = Ext.JSON.decode(response.responseText, true);
                var data = res && res.data ? res.data : [];
                if (data.length > 0) {
                    callback(data[0].lgFAMILLEID, data[0].strNAME);
                } else {
                    callback(null, null);
                }
            },
            failure: function () {
                callback(null, null);
            }
        });
    }
});
