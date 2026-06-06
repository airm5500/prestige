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
        var codeImporte = blRecord.get('cip') || '';
        var len = codeImporte.replace(/\s/g, '').length;
        var nomProduit = produitRecord.get('strNAME');

        // Détermine le type du code pour orienter la question
        if (len >= 6 && len <= 7) {
            // Code CIP clair — demander confirmation de remplacement
            Ext.MessageBox.confirm(
                'Mise à jour du code CIP',
                'Le code importé <b>' + codeImporte + '</b> (CIP, ' + len + ' car.) '
                + 'va remplacer le code CIP actuel du produit <b>' + nomProduit + '</b>.<br><br>'
                + 'Confirmer la mise à jour ?',
                function (btn) {
                    if (btn === 'yes') {
                        me.appliquerAssociation(blRecord, rowIndex, produitRecord, dialog, 'CIP');
                    }
                }
            );
        } else {
            // Code EAN (13 car.) ou longueur inconnue — proposer le choix
            var msgType = len === 13 ? 'EAN13 (' + len + ' car.)' : 'longueur inhabituelle (' + len + ' car.)';
            Ext.Msg.show({
                title: 'Type de code détecté',
                msg: 'Le code importé <b>' + codeImporte + '</b> est de type <b>' + msgType + '</b>.<br><br>'
                    + 'Que souhaitez-vous faire pour le produit <b>' + nomProduit + '</b> ?',
                buttons: {
                    yes: 'Stocker comme EAN13 (CIP inchangé)',
                    no: 'Remplacer le code CIP par ce code'
                },
                icon: Ext.Msg.QUESTION,
                fn: function (btn) {
                    if (btn === 'yes') {
                        me.appliquerAssociation(blRecord, rowIndex, produitRecord, dialog, 'EAN');
                    } else if (btn === 'no') {
                        me.appliquerAssociation(blRecord, rowIndex, produitRecord, dialog, 'CIP');
                    }
                    // cancel = ne rien faire
                }
            });
        }
    },

    appliquerAssociation: function (blRecord, rowIndex, produitRecord, dialog, field) {
        var me = this;
        var familleId = produitRecord.get('lgFAMILLEID');
        var codeImporte = blRecord.get('cip');
        var qty = blRecord.get('cmdeL') || blRecord.get('cmde') || 0;
        var prixAchat = blRecord.get('prixAchat') || 0;
        var ug = blRecord.get('ug') || 0;

        dialog.setLoading('Mise à jour en cours...');

        Ext.Ajax.request({
            url: '../api/v1/produit/update-cip/' + familleId,
            method: 'PUT',
            jsonData: {
                newCip: codeImporte,
                grossisteId: me.getGrossisteId(),
                field: field
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
                    Ext.Msg.alert('Erreur', res && res.message ? res.message : 'Impossible de mettre à jour le code.');
                }
            },
            failure: function () {
                dialog.setLoading(false);
                Ext.Msg.alert('Erreur', 'Erreur réseau lors de la mise à jour du code.');
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

        var storeEmplacement = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle'],
            autoLoad: false,
            proxy: { type: 'ajax', url: '../api/v1/common/emplacement', reader: { type: 'json', root: 'data' } }
        });
        var storeFamille = Ext.create('Ext.data.Store', {
            fields: ['lg_FAMILLEARTICLE_ID', 'libelle'],
            autoLoad: false,
            proxy: { type: 'ajax', url: '../api/v1/common/famillearticle', reader: { type: 'json', root: 'data' } }
        });
        var storeCodetva = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.CodeTva',
            autoLoad: true,
            proxy: { type: 'ajax', url: '../webservices/sm_user/famille/ws_data_codetva.jsp', reader: { type: 'json', root: 'results' } }
        });

        var dialog = Ext.create('Ext.window.Window', {
            title: 'Créer le produit — Code BL : ' + record.get('cip') + '  |  ' + record.get('libelle'),
            width: 600,
            height: 520,
            modal: true,
            layout: 'fit',
            items: [
                {
                    xtype: 'form',
                    itemId: 'createForm',
                    bodyPadding: 15,
                    autoScroll: true,
                    fieldDefaults: { labelAlign: 'right', labelWidth: 140, anchor: '100%', msgTarget: 'side' },
                    items: [
                        {
                            xtype: 'fieldset',
                            title: 'Information article',
                            defaultType: 'textfield',
                            defaults: { anchor: '100%' },
                            items: [
                                {
                                    fieldLabel: 'Code CIP',
                                    name: 'int_CIP',
                                    maskRe: /[0-9.]/,
                                    width: 420,
                                    allowBlank: false,
                                    value: record.get('cip')
                                },
                                {
                                    fieldLabel: 'Désignation',
                                    name: 'str_DESCRIPTION',
                                    width: 420,
                                    allowBlank: false,
                                    value: record.get('libelle')
                                },
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Emplacement',
                                    name: 'lg_ZONE_GEO_ID',
                                    itemId: 'comboEmplacement',
                                    width: 420,
                                    store: storeEmplacement,
                                    valueField: 'id',
                                    displayField: 'libelle',
                                    typeAhead: true,
                                    allowBlank: false,
                                    queryMode: 'local',
                                    emptyText: 'Choisir un emplacement...'
                                },
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Famille',
                                    name: 'lg_FAMILLEARTICLE_ID',
                                    itemId: 'comboFamille',
                                    width: 420,
                                    store: storeFamille,
                                    valueField: 'lg_FAMILLEARTICLE_ID',
                                    displayField: 'libelle',
                                    typeAhead: true,
                                    allowBlank: false,
                                    queryMode: 'local',
                                    emptyText: 'Choisir une famille...'
                                },
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Code TVA',
                                    name: 'lg_CODE_TVA_ID',
                                    width: 420,
                                    store: storeCodetva,
                                    valueField: 'lg_CODE_TVA_ID',
                                    displayField: 'str_NAME',
                                    typeAhead: true,
                                    allowBlank: false,
                                    queryMode: 'local',
                                    emptyText: 'Choisir un code TVA...'
                                },
                                {
                                    fieldLabel: 'Prix Achat (PAF)',
                                    name: 'int_PAF',
                                    itemId: 'fieldPaf',
                                    xtype: 'numberfield',
                                    maskRe: /[0-9.]/,
                                    width: 350,
                                    allowBlank: false,
                                    value: record.get('prixAchat') || 0
                                },
                                {
                                    fieldLabel: 'Prix Vente',
                                    name: 'int_PRICE',
                                    itemId: 'fieldPrice',
                                    xtype: 'numberfield',
                                    maskRe: /[0-9.]/,
                                    width: 350,
                                    allowBlank: false,
                                    value: record.get('prixUn') || 0
                                },
                                {
                                    xtype: 'hiddenfield',
                                    name: 'lg_GROSSISTE_ID',
                                    value: me.getGrossisteId()
                                },
                                {
                                    fieldLabel: 'Code EAN 13',
                                    name: 'EAN',
                                    maskRe: /[0-9.]/,
                                    width: 420
                                },
                                {
                                    fieldLabel: 'Code Tableau',
                                    name: 'int_T',
                                    width: 350
                                }
                            ]
                        }
                    ]
                }
            ],
            listeners: {
                afterrender: function () {
                    storeEmplacement.load({
                        callback: function () {
                            var defRec = storeEmplacement.findRecord('libelle', 'Default', 0, false, false, true);
                            if (!defRec) {
                                defRec = storeEmplacement.findRecord('id', '1');
                            }
                            var combo = dialog.down('[itemId=comboEmplacement]');
                            if (defRec && combo) {
                                combo.setValue(defRec.get('id'));
                            }
                        }
                    });
                    storeFamille.load({
                        callback: function () {
                            var defRec = storeFamille.findRecord('libelle', 'SPECIALITES PUBLIQUES', 0, false, false, true);
                            var combo = dialog.down('[itemId=comboFamille]');
                            if (defRec && combo) {
                                combo.setValue(defRec.get('lg_FAMILLEARTICLE_ID'));
                            }
                        }
                    });
                }
            },
            buttons: [
                {
                    text: 'Créer le produit',
                    handler: function (btn) {
                        var form = dialog.down('#createForm');
                        if (!form.isValid()) {
                            Ext.Msg.alert('Formulaire incomplet', 'Veuillez remplir tous les champs obligatoires.');
                            return;
                        }
                        var paf = form.down('[itemId=fieldPaf]').getValue();
                        var price = form.down('[itemId=fieldPrice]').getValue();
                        if (paf > price) {
                            Ext.MessageBox.show({
                                title: 'Erreur de saisie',
                                msg: "Le prix d'achat ne peut pas être supérieur au prix de vente.",
                                buttons: Ext.MessageBox.OK,
                                icon: Ext.MessageBox.WARNING
                            });
                            return;
                        }
                        btn.setDisabled(true);
                        me.soumettreCreation(form.getValues(), record, rowIndex, dialog, btn);
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

    soumettreCreation: function (values, blRecord, rowIndex, dialog, btn) {
        var me = this;
        dialog.setLoading('Création en cours...');

        var paf = parseInt(values.int_PAF, 10) || 0;
        var params = Ext.apply({}, values, { int_PAT: paf });

        Ext.Ajax.request({
            url: '../webservices/sm_user/famille/ws_transaction.jsp?mode=create',
            params: params,
            success: function (response) {
                var res = Ext.JSON.decode(response.responseText, true);
                if (res && res.success === '1') {
                    // L'ID du produit créé est renvoyé directement (res.ref) par le
                    // service de création — on l'utilise pour ajouter la ligne à la
                    // commande en cours sans dépendre d'une recherche.
                    var ajouterAvecFamille = function (familleId, familleName) {
                        var qty = blRecord.get('cmdeL') || blRecord.get('cmde') || 0;
                        var prixAchat = blRecord.get('prixAchat') || 0;
                        var ug = blRecord.get('ug') || 0;
                        me.ajouterLigneCommande(familleId, qty, prixAchat, ug, function () {
                            blRecord.set('statut', 'cree');
                            blRecord.set('familleName', familleName || values.str_DESCRIPTION);
                            me.rows[rowIndex].statut = 'cree';
                            me.rows[rowIndex].familleId = familleId;
                            dialog.destroy();
                            me.updateScore();
                        });
                    };

                    if (res.ref) {
                        ajouterAvecFamille(res.ref, values.str_DESCRIPTION);
                    } else {
                        // Repli : on recherche le produit par son CIP
                        me.rechercherProduitParCip(values.int_CIP, function (familleId, familleName) {
                            if (familleId) {
                                ajouterAvecFamille(familleId, familleName);
                            } else {
                                dialog.setLoading(false);
                                if (btn) btn.enable();
                                Ext.Msg.alert('Erreur', 'Produit créé mais introuvable. Impossible de l\'ajouter à la commande.');
                            }
                        });
                    }
                } else {
                    dialog.setLoading(false);
                    if (btn) btn.enable();
                    Ext.Msg.alert('Erreur', res && res.errors ? res.errors : 'Erreur lors de la création du produit.');
                }
            },
            failure: function () {
                dialog.setLoading(false);
                if (btn) btn.enable();
                Ext.Msg.alert('Erreur', 'Erreur réseau lors de la création du produit.');
            }
        });
    },

    rechercherProduitParCip: function (cip, callback) {
        Ext.Ajax.request({
            url: '../api/v1/vente/search',
            method: 'GET',
            params: { query: cip },
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
