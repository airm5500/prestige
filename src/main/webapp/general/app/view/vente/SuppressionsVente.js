/* global Ext */

/*
 * Ecran "Suppressions de vente" :
 *   - produits retires d'une vente (type PRODUIT),
 *   - ventes abandonnees / supprimees (type VENTE, une ligne par produit).
 * Fonctions : recherche par periode / utilisateur / produit (cip ou nom),
 * impression (modele Jasper rp_suppressions_vente.jrxml) et creation
 * d'inventaire a partir de la selection (conservee sur toutes les pages).
 * API : ../api/v1/vente-suppressions
 */
Ext.define('testextjs.view.vente.SuppressionsVente', {
    extend: 'Ext.panel.Panel',
    xtype: 'suppressionsvente',
    id: 'suppressionsventeID',
    title: 'Suppressions de vente',
    frame: true,
    closable: false,
    layout: 'fit',
    width: '98%',
    height: 600,
    initComponent: function () {
        var me = this;

        // Selection conservee a travers les pages : { id ligne: id produit }
        me.selectedRows = {};

        var today = new Date();
        var defautDebut = Ext.Date.add(today, Ext.Date.DAY, -30);

        me.suppressionStore = new Ext.data.Store({
            fields: ['id', 'typeSuppression', 'venteId', 'venteRef', 'produitId',
                'produitCip', 'produitLibelle', 'quantite', 'userName', 'date', 'heure'],
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/vente-suppressions',
                reader: {type: 'json', root: 'results', totalProperty: 'total'}
            }
        });

        me.userStore = new Ext.data.Store({
            fields: ['lgUSERID', 'strFIRSTNAME', 'strLASTNAME', 'fullName'],
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/users',
                extraParams: {start: 0, limit: 100},
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            },
            listeners: {
                load: function (store) {
                    store.each(function (r) {
                        if (!r.get('fullName')) {
                            r.set('fullName',
                                    (r.get('strFIRSTNAME') || '') + ' ' + (r.get('strLASTNAME') || ''));
                        }
                    });
                }
            }
        });

        var selModel = Ext.create('Ext.selection.CheckboxModel', {checkOnly: true});
        me.selModel_ = selModel;

        selModel.on('select', function (sm, rec) {
            me.selectedRows[rec.get('id')] = rec.get('produitId');
            me.updateCounter();
        });
        selModel.on('deselect', function (sm, rec) {
            delete me.selectedRows[rec.get('id')];
            me.updateCounter();
        });
        me.suppressionStore.on('load', function () {
            me.reapplySelection();
        });

        Ext.apply(me, {
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'dtStart',
                            labelWidth: 25,
                            width: 155,
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y',
                            value: defautDebut
                        }, {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            labelWidth: 25,
                            width: 155,
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y',
                            value: today
                        }, {
                            xtype: 'combobox',
                            itemId: 'userCombo',
                            emptyText: 'Utilisateur',
                            store: me.userStore,
                            valueField: 'lgUSERID',
                            displayField: 'fullName',
                            queryMode: 'local',
                            width: 170
                        }, {
                            xtype: 'combobox',
                            itemId: 'typeCombo',
                            emptyText: 'Type',
                            store: new Ext.data.ArrayStore({
                                data: [['', 'Tous'], ['PRODUIT', 'Produit retire'], ['VENTE', 'Vente abandonnee']],
                                fields: ['code', 'libelle']
                            }),
                            valueField: 'code',
                            displayField: 'libelle',
                            queryMode: 'local',
                            width: 140
                        }, {
                            xtype: 'textfield',
                            itemId: 'queryFld',
                            emptyText: 'CIP ou nom du produit',
                            width: 170,
                            enableKeyEvents: true,
                            listeners: {
                                specialkey: function (field, e) {
                                    if (e.getKey() === e.ENTER) {
                                        me.doSearch();
                                    }
                                }
                            }
                        }, {
                            text: 'Rechercher',
                            iconCls: 'searchicon',
                            scope: me,
                            handler: me.doSearch
                        }
                    ]
                },
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            text: 'Tout selectionner (toutes les pages)',
                            scope: me,
                            handler: me.selectAllPages
                        }, {
                            text: 'Tout deselectionner',
                            scope: me,
                            handler: me.deselectAll
                        }, {
                            text: 'Imprimer',
                            iconCls: 'printable',
                            scope: me,
                            handler: me.doPrint
                        }, {
                            text: 'Creer inventaire',
                            iconCls: 'addicon',
                            scope: me,
                            handler: me.onCreateInventaire
                        }, '->', {
                            xtype: 'tbtext', itemId: 'selCount', text: 'Selectionnes : 0'
                        }
                    ]
                }
            ],
            items: [{
                    xtype: 'gridpanel',
                    itemId: 'suppressionGrid',
                    store: me.suppressionStore,
                    selModel: selModel,
                    columnLines: true,
                    viewConfig: {forceFit: true},
                    columns: [
                        {header: 'Date', dataIndex: 'date', width: 80},
                        {header: 'Heure', dataIndex: 'heure', width: 70},
                        {header: 'Vente', dataIndex: 'venteRef', flex: 1},
                        {header: 'CIP', dataIndex: 'produitCip', width: 80},
                        {header: 'Produit', dataIndex: 'produitLibelle', flex: 2},
                        {header: 'Qte', dataIndex: 'quantite', width: 55, align: 'right'},
                        {header: 'Utilisateur', dataIndex: 'userName', flex: 1},
                        {
                            header: 'Type', dataIndex: 'typeSuppression', width: 110,
                            renderer: function (v) {
                                return v === 'VENTE' ? 'Vente abandonnee' : 'Produit retire';
                            }
                        }
                    ],
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: me.suppressionStore,
                        displayInfo: true
                    }
                }]
        });

        me.callParent(arguments);
        me.on('afterrender', me.doSearch, me, {single: true, delay: 100});
    },
    getFilters: function () {
        var me = this;
        var dtStart = me.down('#dtStart'), dtEnd = me.down('#dtEnd');
        return {
            dtStart: dtStart.getValue() ? dtStart.getSubmitValue() : '',
            dtEnd: dtEnd.getValue() ? dtEnd.getSubmitValue() : '',
            userId: me.down('#userCombo').getValue() || '',
            type: me.down('#typeCombo').getValue() || '',
            query: me.down('#queryFld').getValue() || ''
        };
    },
    doSearch: function () {
        var me = this, filters = me.getFilters();
        var proxy = me.suppressionStore.getProxy();
        proxy.setExtraParam('dtStart', filters.dtStart);
        proxy.setExtraParam('dtEnd', filters.dtEnd);
        proxy.setExtraParam('userId', filters.userId);
        proxy.setExtraParam('type', filters.type);
        proxy.setExtraParam('query', filters.query);
        // La selection est conservee au changement de filtre/page tant que
        // l'utilisateur ne l'annule pas explicitement (Tout deselectionner)
        me.suppressionStore.loadPage(1);
    },
    updateCounter: function () {
        var me = this, n = 0, k;
        for (k in me.selectedRows) {
            if (me.selectedRows.hasOwnProperty(k)) {
                n++;
            }
        }
        var cmp = me.down('#selCount');
        if (cmp) {
            cmp.setText('Selectionnes : ' + n);
        }
    },
    // Re-coche les lignes de la page courante presentes dans la selection
    reapplySelection: function () {
        var me = this, selModel = me.selModel_;
        selModel.suspendEvents();
        selModel.deselectAll();
        me.suppressionStore.each(function (rec) {
            if (me.selectedRows.hasOwnProperty(rec.get('id'))) {
                selModel.select(rec, true, true);
            }
        });
        selModel.resumeEvents();
        me.updateCounter();
    },
    // Selectionne l'ensemble des resultats correspondant aux filtres actifs
    selectAllPages: function () {
        var me = this, filters = me.getFilters();
        var prog = Ext.MessageBox.wait('Chargement...', 'Selection de toutes les lignes');
        Ext.Ajax.request({
            url: '../api/v1/vente-suppressions',
            method: 'GET',
            params: Ext.apply({start: 0, limit: 0}, filters),
            timeout: 600000,
            success: function (response) {
                prog.hide();
                var res = Ext.JSON.decode(response.responseText, true);
                var list = (res && res.results) ? res.results : [];
                Ext.each(list, function (l) {
                    if (l.id) {
                        me.selectedRows[l.id] = l.produitId;
                    }
                });
                me.reapplySelection();
            },
            failure: function () {
                prog.hide();
                Ext.MessageBox.alert('Erreur', 'Echec du chargement de la liste complete.');
            }
        });
    },
    deselectAll: function () {
        var me = this;
        me.selectedRows = {};
        me.selModel_.deselectAll();
        me.updateCounter();
    },
    doPrint: function () {
        var me = this, filters = me.getFilters();
        var userCombo = me.down('#userCombo');
        if (filters.userId) {
            filters.userLibelle = userCombo.getRawValue() || '';
        }
        var progress = Ext.MessageBox.wait('Generation du PDF . . .', 'Veuillez patienter');
        Ext.Ajax.request({
            url: '../api/v1/vente-suppressions/pdf',
            method: 'GET',
            params: filters,
            timeout: 600000,
            success: function (resp) {
                progress.hide();
                var r = Ext.JSON.decode(resp.responseText, true);
                if (r && r.success && r.url) {
                    window.open(r.url);
                } else {
                    Ext.MessageBox.alert('Impression',
                            (r && r.message) ? r.message : "La generation du PDF n'a pas abouti.");
                }
            },
            failure: function () {
                progress.hide();
                Ext.MessageBox.alert('Impression', 'La generation du PDF a echoue.');
            }
        });
    },
    onCreateInventaire: function () {
        var me = this;
        // Produits distincts de la selection (les quantites ne sont pas utilisees :
        // l'inventaire est seede avec le stock courant de chaque produit)
        var produitIds = {}, k, ids = [];
        for (k in me.selectedRows) {
            if (me.selectedRows.hasOwnProperty(k) && me.selectedRows[k]) {
                produitIds[me.selectedRows[k]] = true;
            }
        }
        for (k in produitIds) {
            if (produitIds.hasOwnProperty(k)) {
                ids.push(k);
            }
        }
        if (ids.length === 0) {
            Ext.MessageBox.alert('Message',
                    'Veuillez selectionner au moins une ligne (bouton "Tout selectionner" pour tout inclure).');
            return;
        }
        Ext.MessageBox.confirm('Confirmation',
                'Vous allez creer un inventaire contenant <b>' + ids.length
                + '</b> produit(s) distinct(s) (toutes pages confondues).<br/>Confirmez-vous ?',
                function (btn) {
                    if (btn !== 'yes') {
                        return;
                    }
                    var progress = Ext.MessageBox.wait('Veuillez patienter...', 'Creation de l\'inventaire');
                    Ext.Ajax.request({
                        url: '../api/v1/vente-suppressions/create-inventaire',
                        method: 'POST',
                        jsonData: {ids: ids, description: ''},
                        timeout: 600000,
                        success: function (response) {
                            progress.hide();
                            var res = Ext.JSON.decode(response.responseText, true);
                            if (res && res.success) {
                                Ext.MessageBox.alert('Inventaire',
                                        'Inventaire cree.<br/>Produits en compte : <b>' + (res.count || 0) + '</b>');
                            } else {
                                Ext.MessageBox.alert('Erreur',
                                        (res && res.message) ? res.message : "La creation de l'inventaire a echoue.");
                            }
                        },
                        failure: function () {
                            progress.hide();
                            Ext.MessageBox.alert('Erreur',
                                    "La creation de l'inventaire a echoue. Aucun inventaire partiel n'a ete cree.");
                        }
                    });
                });
    }
});
