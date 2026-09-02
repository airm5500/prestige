/* global Ext */

/*
 * Ecran « Ventes modifiées » (point 6) : mouchard des ventes cloturees puis
 * modifiees, avec le detail produit par produit (ajout, retrait, quantite,
 * prix), les changements d'informations client / tiers payant et de date.
 * Fonctions : recherche par periode / operateur / type d'action / texte,
 * export Excel, creation d'inventaire des produits des ventes concernees
 * (selection conservee sur toutes les pages).
 * API : ../api/v1/ventes-modifiees
 */
Ext.define('testextjs.view.vente.VentesModifieesManager', {
    extend: 'Ext.panel.Panel',
    xtype: 'ventesmodifieesmanager',
    id: 'ventesmodifieesmanagerID',
    title: 'Mouchard des ventes modifiées',
    frame: true,
    closable: false,
    layout: 'fit',
    width: '98%',
    height: 600,
    initComponent: function () {
        var me = this;

        // Selection conservee a travers les pages : { id modification: true }
        me.selectedRows = {};

        var today = new Date();

        me.modifStore = new Ext.data.Store({
            fields: ['id', 'typeModification', 'typeLibelle', 'venteId', 'venteOrigineId', 'venteRef',
                'userName', 'date', 'heure', 'montantAvant', 'montantApres', 'description', 'lignes'],
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/ventes-modifiees',
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
            me.selectedRows[rec.get('id')] = true;
            me.updateCounter();
        });
        selModel.on('deselect', function (sm, rec) {
            delete me.selectedRows[rec.get('id')];
            me.updateCounter();
        });
        me.modifStore.on('load', function () {
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
                            value: today
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
                            emptyText: 'Opérateur',
                            store: me.userStore,
                            valueField: 'lgUSERID',
                            displayField: 'fullName',
                            queryMode: 'local',
                            width: 170
                        }, {
                            xtype: 'combobox',
                            itemId: 'typeCombo',
                            emptyText: "Type d'action",
                            store: new Ext.data.ArrayStore({
                                data: [['', 'Toutes les actions'], ['PRODUITS', 'Modification des produits'],
                                    ['INFOS', 'Modification client / tiers payant'],
                                    ['DATE', 'Modification de la date']],
                                fields: ['code', 'libelle']
                            }),
                            valueField: 'code',
                            displayField: 'libelle',
                            queryMode: 'local',
                            width: 220
                        }, {
                            xtype: 'textfield',
                            itemId: 'queryFld',
                            emptyText: 'Référence, produit, opérateur...',
                            width: 200,
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
                            itemId: 'btnRechercher',
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
                            text: 'Tout sélectionner (toutes les pages)',
                            itemId: 'btnToutSelectionner',
                            scope: me,
                            handler: me.selectAllPages
                        }, {
                            text: 'Tout désélectionner',
                            itemId: 'btnToutDeselectionner',
                            scope: me,
                            handler: me.deselectAll
                        }, {
                            text: 'Exporter (Excel)',
                            itemId: 'btnExcel',
                            scope: me,
                            handler: me.onExportExcel
                        }, {
                            text: 'Créer inventaire',
                            itemId: 'btnInventaire',
                            iconCls: 'addicon',
                            scope: me,
                            handler: me.onCreateInventaire
                        }, '->', {
                            xtype: 'tbtext', itemId: 'selCount', text: 'Sélectionnés : 0'
                        }
                    ]
                }
            ],
            items: [{
                    xtype: 'gridpanel',
                    itemId: 'modifGrid',
                    store: me.modifStore,
                    selModel: selModel,
                    columnLines: true,
                    viewConfig: {forceFit: true},
                    // Le detail produit s'affiche sous chaque ligne (tableau avant / apres)
                    features: [{
                            ftype: 'rowbody',
                            getAdditionalData: function (data) {
                                return {
                                    rowBody: me.rendreDetail(data),
                                    rowBodyColspan: 9
                                };
                            }
                        }],
                    columns: [
                        {header: 'Action', dataIndex: 'typeLibelle', width: 190},
                        {header: 'Référence vente', dataIndex: 'venteRef', width: 140},
                        {header: 'Date', dataIndex: 'date', width: 90},
                        {header: 'Heure', dataIndex: 'heure', width: 75},
                        {header: 'Opérateur', dataIndex: 'userName', width: 140},
                        {
                            header: 'Montant avant', dataIndex: 'montantAvant', width: 100, align: 'right',
                            renderer: Ext.util.Format.numberRenderer('0,000')
                        },
                        {
                            header: 'Montant après', dataIndex: 'montantApres', width: 100, align: 'right',
                            renderer: Ext.util.Format.numberRenderer('0,000')
                        },
                        {header: 'Détail', dataIndex: 'description', flex: 1}
                    ],
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: me.modifStore,
                        displayInfo: true
                    }
                }]
        });

        me.callParent(arguments);
        me.on('afterrender', me.doSearch, me, {single: true, delay: 100});
    },
    libelleAction: function (a) {
        switch (a) {
            case 'AJOUT':
                return 'Produit ajouté';
            case 'RETRAIT':
                return 'Produit retiré';
            case 'QUANTITE':
                return 'Quantité modifiée';
            case 'PRIX':
                return 'Prix modifié';
            default:
                return a || '';
        }
    },
    // Tableau HTML du detail produit d'une modification (vide si aucun produit)
    rendreDetail: function (data) {
        var me = this, lignes = data.lignes || [], html, i, l, couleur, fmt = Ext.util.Format.number;
        if (!lignes.length) {
            return '';
        }
        html = '<table class="ventes-modifiees-detail" style="margin:2px 0 4px 30px;border-collapse:collapse;font-size:12px;">'
                + '<tr style="background:#eef2f7;font-weight:bold;">'
                + '<td style="padding:2px 8px;border:1px solid #ccd;">Changement</td>'
                + '<td style="padding:2px 8px;border:1px solid #ccd;">CIP</td>'
                + '<td style="padding:2px 8px;border:1px solid #ccd;">Produit</td>'
                + '<td style="padding:2px 8px;border:1px solid #ccd;text-align:right;">Qté avant</td>'
                + '<td style="padding:2px 8px;border:1px solid #ccd;text-align:right;">Qté après</td>'
                + '<td style="padding:2px 8px;border:1px solid #ccd;text-align:right;">PU avant</td>'
                + '<td style="padding:2px 8px;border:1px solid #ccd;text-align:right;">PU après</td>'
                + '<td style="padding:2px 8px;border:1px solid #ccd;text-align:right;">Montant avant</td>'
                + '<td style="padding:2px 8px;border:1px solid #ccd;text-align:right;">Montant après</td></tr>';
        for (i = 0; i < lignes.length; i++) {
            l = lignes[i];
            couleur = l.action === 'AJOUT' ? '#1a7f37' : (l.action === 'RETRAIT' ? '#c0392b' : '#8a5a00');
            html += '<tr>'
                    + '<td style="padding:2px 8px;border:1px solid #ccd;color:' + couleur + ';font-weight:bold;">'
                    + me.libelleAction(l.action) + '</td>'
                    + '<td style="padding:2px 8px;border:1px solid #ccd;">' + Ext.String.htmlEncode(l.produitCip || '') + '</td>'
                    + '<td style="padding:2px 8px;border:1px solid #ccd;">' + Ext.String.htmlEncode(l.produitLibelle || '') + '</td>'
                    + '<td style="padding:2px 8px;border:1px solid #ccd;text-align:right;">' + (l.qteAvant || 0) + '</td>'
                    + '<td style="padding:2px 8px;border:1px solid #ccd;text-align:right;">' + (l.qteApres || 0) + '</td>'
                    + '<td style="padding:2px 8px;border:1px solid #ccd;text-align:right;">' + fmt(l.puAvant || 0, '0,000') + '</td>'
                    + '<td style="padding:2px 8px;border:1px solid #ccd;text-align:right;">' + fmt(l.puApres || 0, '0,000') + '</td>'
                    + '<td style="padding:2px 8px;border:1px solid #ccd;text-align:right;">' + fmt(l.montantAvant || 0, '0,000') + '</td>'
                    + '<td style="padding:2px 8px;border:1px solid #ccd;text-align:right;">' + fmt(l.montantApres || 0, '0,000') + '</td>'
                    + '</tr>';
        }
        return html + '</table>';
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
        var proxy = me.modifStore.getProxy();
        proxy.setExtraParam('dtStart', filters.dtStart);
        proxy.setExtraParam('dtEnd', filters.dtEnd);
        proxy.setExtraParam('userId', filters.userId);
        proxy.setExtraParam('type', filters.type);
        proxy.setExtraParam('query', filters.query);
        me.modifStore.loadPage(1);
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
            cmp.setText('Sélectionnés : ' + n);
        }
    },
    reapplySelection: function () {
        var me = this, selModel = me.selModel_;
        selModel.suspendEvents();
        selModel.deselectAll();
        me.modifStore.each(function (rec) {
            if (me.selectedRows.hasOwnProperty(rec.get('id'))) {
                selModel.select(rec, true, true);
            }
        });
        selModel.resumeEvents();
        me.updateCounter();
    },
    selectAllPages: function () {
        var me = this, filters = me.getFilters();
        var prog = Ext.MessageBox.wait('Chargement...', 'Sélection de toutes les lignes');
        Ext.Ajax.request({
            url: '../api/v1/ventes-modifiees',
            method: 'GET',
            params: Ext.apply({start: 0, limit: 0}, filters),
            timeout: 600000,
            success: function (response) {
                prog.hide();
                var res = Ext.JSON.decode(response.responseText, true);
                var list = (res && res.results) ? res.results : [];
                Ext.each(list, function (l) {
                    if (l.id) {
                        me.selectedRows[l.id] = true;
                    }
                });
                me.reapplySelection();
            },
            failure: function () {
                prog.hide();
                Ext.MessageBox.alert('Erreur', 'Echec du chargement de la liste complète.');
            }
        });
    },
    deselectAll: function () {
        var me = this;
        me.selectedRows = {};
        me.selModel_.deselectAll();
        me.updateCounter();
    },
    onExportExcel: function () {
        var me = this, filters = me.getFilters();
        var url = '../api/v1/ventes-modifiees/export/excel'
                + '?dtStart=' + encodeURIComponent(filters.dtStart)
                + '&dtEnd=' + encodeURIComponent(filters.dtEnd)
                + '&userId=' + encodeURIComponent(filters.userId)
                + '&type=' + encodeURIComponent(filters.type)
                + '&query=' + encodeURIComponent(filters.query)
                + '&_dc=' + new Date().getTime();
        var frame = document.getElementById('ventes-modifiees-export-frame');
        if (!frame) {
            frame = document.createElement('iframe');
            frame.id = 'ventes-modifiees-export-frame';
            frame.style.display = 'none';
            document.body.appendChild(frame);
        }
        frame.src = url;
    },
    onCreateInventaire: function () {
        var me = this, ids = [], k;
        for (k in me.selectedRows) {
            if (me.selectedRows.hasOwnProperty(k)) {
                ids.push(k);
            }
        }
        if (ids.length === 0) {
            Ext.MessageBox.alert('Message',
                    'Veuillez sélectionner au moins une ligne (bouton "Tout sélectionner" pour tout inclure).');
            return;
        }
        Ext.MessageBox.confirm('Confirmation',
                'Vous allez créer un inventaire avec les produits des ventes concernées par <b>' + ids.length
                + '</b> modification(s) (toutes pages confondues).<br/>Confirmez-vous ?',
                function (btn) {
                    if (btn !== 'yes') {
                        return;
                    }
                    var progress = Ext.MessageBox.wait('Veuillez patienter...', 'Création de l\'inventaire');
                    Ext.Ajax.request({
                        url: '../api/v1/ventes-modifiees/create-inventaire',
                        method: 'POST',
                        jsonData: {ids: ids, description: ''},
                        timeout: 600000,
                        success: function (response) {
                            progress.hide();
                            var res = Ext.JSON.decode(response.responseText, true);
                            if (res && res.success) {
                                Ext.MessageBox.alert('Inventaire',
                                        'Inventaire créé.<br/>Produits en compte : <b>' + (res.count || 0) + '</b>');
                            } else {
                                Ext.MessageBox.alert('Erreur',
                                        (res && res.message) ? res.message : "La création de l'inventaire a échoué.");
                            }
                        },
                        failure: function () {
                            progress.hide();
                            Ext.MessageBox.alert('Erreur',
                                    "La création de l'inventaire a échoué. Aucun inventaire partiel n'a été créé.");
                        }
                    });
                });
    }
});
