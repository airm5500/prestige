/* global Ext */

// Feuille de match : partie du menu Classification ABC. Regroupe les n meilleurs
// produits (quantite par defaut, marge ou chiffre d'affaires), n defini par
// l'utilisateur, avec recherche CIP/nom et filtres grossiste / emplacement /
// famille / classe ABC combinables. Impression PDF (frequences d'achat du mois
// en cours + 3 derniers mois), exports Excel/CSV, inventaire et suggestion.
Ext.define('testextjs.view.Report.abc.FeuilleDeMatchManager', {
    extend: 'Ext.panel.Panel',
    xtype: 'feuilledematch',
    title: 'Feuille de match',
    frame: true,
    width: '98%',
    height: 600,
    minHeight: 570,
    cls: 'custompanel',
    layout: 'fit',
    requires: [
        'testextjs.view.garde.SelecteurGarde','testextjs.model.AbcProduit'],

    initComponent: function () {
        const me = this;

        const moneyRenderer = function (v) {
            return Ext.util.Format.number(v, '0,000.');
        };

        const data = new Ext.data.Store({
            model: 'testextjs.model.AbcProduit',
            pageSize: 50,
            autoLoad: false,
            remoteSort: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/articles/abc/feuille-match',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 2400000
            },
            listeners: {
                beforeload: function (store) {
                    const proxy = store.getProxy();
                    const v = function (id) {
                        const c = me.down('#' + id);
                        return c && c.getValue() ? c.getValue() : '';
                    };
                    proxy.setExtraParam('dtStart', me.down('#dtStart').getSubmitValue());
                    proxy.setExtraParam('dtEnd', me.down('#dtEnd').getSubmitValue());
                    proxy.setExtraParam('type', v('comboType') || 'QTY');
                    proxy.setExtraParam('classe', v('comboClasse') || 'ALL');
                    proxy.setExtraParam('topN', v('topN'));
                    proxy.setExtraParam('objectifAchat', v('objectifAchat') || 3);
                    proxy.setExtraParam('objectifFilter', v('comboObjectif') || 'ALL');
                    proxy.setExtraParam('search', v('searchField'));
                    proxy.setExtraParam('codeRayon', v('rayons'));
                    proxy.setExtraParam('codeGrossiste', v('grossiste'));
                    proxy.setExtraParam('codeFamille', v('codeFamile'));
                },
                load: function (store) {
                    // En-tete de colonne avec le nom du mois en cours renvoye par le serveur
                    try {
                        const raw = store.getProxy().getReader().rawData || {};
                        if (raw.moisCourant) {
                            const grid = me.down('gridpanel');
                            Ext.Array.each(grid.columns, function (col) {
                                if (col.dataIndex === 'freqM0') {
                                    col.setText('Fréq. achat (' + raw.moisCourant + ')');
                                } else if (col.dataIndex === 'qteM0') {
                                    col.setText('Qté achetée (' + raw.moisCourant + ')');
                                }
                            });
                        }
                    } catch (e) {
                    }
                }
            }
        });
        me.gridStore = data;

        const remoteStore = function (url) {
            return Ext.create('Ext.data.Store', {
                idProperty: 'id',
                fields: [{name: 'id', type: 'string'}, {name: 'libelle', type: 'string'}],
                autoLoad: false,
                pageSize: 9999,
                proxy: {type: 'ajax', url: url, reader: {type: 'json', root: 'data', totalProperty: 'total'}}
            });
        };
        const grossiste = remoteStore('../api/v1/common/grossiste');
        const rayons = remoteStore('../api/v1/common/rayons');
        const familles = remoteStore('../api/v1/common/famillearticles');

        const filtreType = new Ext.data.Store({
            fields: ['id', 'libelle'],
            data: [
                {id: 'QTY', libelle: "Quantité"},
                {id: 'MARGE', libelle: "Marge"},
                {id: 'CA', libelle: "Chiffre d'Affaires"}
            ]
        });
        const filtreClasse = new Ext.data.Store({
            fields: ['id', 'libelle'],
            data: [
                {id: 'ALL', libelle: 'Toutes les classes'},
                {id: 'A', libelle: 'Classe A'},
                {id: 'B', libelle: 'Classe B'},
                {id: 'C', libelle: 'Classe C'}
            ]
        });
        const filtreObjectif = new Ext.data.Store({
            fields: ['id', 'libelle'],
            data: [
                {id: 'ALL', libelle: 'Objectif : tous'},
                {id: 'ATTEINT', libelle: 'Objectif atteint'},
                {id: 'DEPASSE', libelle: 'Objectif pas atteint (dépassé)'}
            ]
        });

        Ext.applyIf(me, {
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {xtype: 'datefield', fieldLabel: 'Du', itemId: 'dtStart', margin: '0 10 0 0', submitFormat: 'Y-m-d', flex: 1, labelWidth: 20, maxValue: new Date(), value: new Date(), format: 'd/m/Y'},
                        {xtype: 'datefield', fieldLabel: 'Au', itemId: 'dtEnd', labelWidth: 20, flex: 1, maxValue: new Date(), value: new Date(), margin: '0 9 0 0', submitFormat: 'Y-m-d', format: 'd/m/Y'},
                        {xtype: 'combobox', flex: 1, margin: '0 5 0 0', labelWidth: 5, itemId: 'rayons', store: rayons, pageSize: 999, valueField: 'id', displayField: 'libelle', typeAhead: true, queryMode: 'remote', minChars: 2, emptyText: 'Emplacement / rayon'},
                        {xtype: 'combobox', flex: 1, margin: '0 5 0 0', labelWidth: 5, itemId: 'grossiste', store: grossiste, pageSize: 999, valueField: 'id', displayField: 'libelle', typeAhead: true, queryMode: 'remote', minChars: 2, emptyText: 'Grossiste'},
                        {xtype: 'combobox', flex: 1, margin: '0 5 0 0', labelWidth: 5, itemId: 'codeFamile', store: familles, pageSize: 999, valueField: 'id', displayField: 'libelle', typeAhead: true, queryMode: 'remote', minChars: 2, emptyText: 'Famille'},
                        {xtype: 'numberfield', itemId: 'topN', width: 90, minValue: 1, allowDecimals: false, emptyText: 'Top N', margin: '0 5 0 0',
                            fieldStyle: 'background-color:#FFA500;color:#000;font-weight:bold;',
                            listeners: {specialkey: function (f, e) { if (e.getKey() === e.ENTER) { me.gridStore.loadPage(1); } }}},
                        {xtype: 'numberfield', itemId: 'objectifAchat', width: 155, minValue: 1, allowDecimals: false,
                            fieldLabel: 'Objectif achat', labelWidth: 85, value: 3,
                            fieldStyle: 'color:#1565C0;font-weight:bold;',
                            listeners: {specialkey: function (f, e) { if (e.getKey() === e.ENTER) { me.gridStore.loadPage(1); } }}}
                    ]
                },
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {xtype: 'combo', value: 'QTY', flex: 1, itemId: 'comboType', labelWidth: 1, editable: false, store: filtreType, valueField: 'id', displayField: 'libelle',
                            fieldStyle: 'color:#d10000;font-weight:bold',
                            listeners: {
                                select: function (cmb) {
                                    const t = cmb.getValue();
                                    cmb.setFieldStyle('color:' + (t === 'MARGE' ? '#0000ff' : '#d10000') + ';font-weight:bold');
                                }
                            }},
                        {xtype: 'combo', value: 'ALL', flex: 1, itemId: 'comboClasse', labelWidth: 1, editable: false, store: filtreClasse, valueField: 'id', displayField: 'libelle'},
                        {xtype: 'combo', value: 'ALL', flex: 1.2, itemId: 'comboObjectif', labelWidth: 1, editable: false, store: filtreObjectif, valueField: 'id', displayField: 'libelle'},
                        {xtype: 'textfield', flex: 1.4, itemId: 'searchField', emptyText: 'Code CIP ou nom du produit',
                            fieldStyle: 'border:2px solid #1565C0;'},
                        // Applique en un geste les bornes d'une garde enregistree.
                        {xtype: 'selecteurgarde'},
                        {text: 'Rechercher', itemId: 'rechercher', iconCls: 'searchicon', scope: this},
                        '->',
                        {text: 'Imprimer', itemId: 'imprimer', iconCls: 'printable', tooltip: 'Imprimer la feuille de match (PDF) : fréquences et quantités d\'achat du mois en cours et des 3 derniers mois'},
                        {
                            xtype: 'splitbutton', text: 'Exporter', itemId: 'btnExporter', iconCls: 'export_excel_icon',
                            tooltip: 'Exporter le résultat filtré',
                            menu: [
                                {text: 'Exporter Excel', itemId: 'exporterExcel', iconCls: 'export_excel_icon'},
                                {text: 'Exporter CSV', itemId: 'exporterCsv', iconCls: 'export_csv_icon'}
                            ]
                        },
                        {
                            xtype: 'splitbutton', text: 'Créer suggestion', itemId: 'creerSuggestion',
                            iconCls: 'suggestionreapro',
                            tooltip: 'Créer des suggestions de commande à partir du résultat filtré',
                            handler: function (b) { b.showMenu(); },
                            menu: [
                                {text: 'Suggérer les quantités de réappro', itemId: 'suggReappro', iconCls: 'suggestionreapro'},
                                {text: 'Suggérer les quantités vendues', itemId: 'suggVendues', iconCls: 'suggestionreapro'}
                            ]
                        },
                        {text: 'Créer inventaire', itemId: 'creerInventaire', iconCls: 'addicon', tooltip: 'Créer un inventaire à partir du résultat filtré'}
                    ]
                }
            ],

            items: [
                {
                    xtype: 'gridpanel',
                    store: data,
                    sortableColumns: false,
                    viewConfig: {columnLines: true},
                    columns: [
                        {header: 'Id', width: 40, xtype: 'rownumberer'},
                        {header: 'CIP', dataIndex: 'cip', width: 90},
                        {header: 'Libellé', dataIndex: 'libelle', flex: 1.8},
                        {header: 'Classe', dataIndex: 'classe', width: 60, align: 'center',
                            renderer: function (v) {
                                const map = {A: '#1a7e1a', B: '#e67e00', C: '#d10000'};
                                return '<span style="color:' + (map[v] || '#000') + ';font-weight:bold">' + (v || '') + '</span>';
                            }},
                        {header: 'Rayon', dataIndex: 'rayon', flex: 1},
                        {header: 'Stock', dataIndex: 'stockDisponible', width: 70, align: 'right', renderer: moneyRenderer},
                        {header: 'Seuil', dataIndex: 'seuilMini', width: 70, align: 'right', renderer: moneyRenderer},
                        {header: 'Qté réappro', dataIndex: 'quantiteReappro', width: 85, align: 'right', renderer: moneyRenderer},
                        {header: 'Fréq. achat (mois)', dataIndex: 'freqM0', width: 105, align: 'right',
                            renderer: function (v, meta, rec) {
                                const statut = rec.get('objectifStatut') || '';
                                const c = statut.indexOf('Dépassé') === 0 ? '#d10000' : '#1a7e1a';
                                return '<span style="color:' + c + ';font-weight:bold">' + Ext.util.Format.number(v || 0, '0,000.') + '</span>';
                            }},
                        {header: 'Qté achetée (mois)', dataIndex: 'qteM0', width: 110, align: 'right', renderer: moneyRenderer},
                        {header: 'Qté vendue', dataIndex: 'quantiteVendue', width: 85, align: 'right',
                            renderer: function (v) {
                                const cmp = me.down('#comboType');
                                const t = (cmp && cmp.getValue()) || 'QTY';
                                const c = (t === 'MARGE') ? '#0000ff' : (t === 'CA') ? '#1a7e1a' : '#d10000';
                                return '<span style="color:' + c + ';font-weight:bold">' + Ext.util.Format.number(v, '0,000.') + '</span>';
                            }},
                        {header: "Chiffre d'Affaires", dataIndex: 'chiffreAffaires', flex: 1, align: 'right', renderer: moneyRenderer},
                        {header: 'Marge', dataIndex: 'marge', flex: 1, align: 'right', renderer: moneyRenderer},
                        {header: 'Marge %', dataIndex: 'marge', width: 75, align: 'right', sortable: false,
                            renderer: function (v, meta, rec) {
                                const ca = rec.get('chiffreAffaires') || 0;
                                const pct = ca > 0 ? (v || 0) / ca * 100 : 0;
                                return '<span style="color:#0000ff;font-weight:bold">' + Ext.util.Format.number(pct, '0.00') + ' %</span>';
                            }},
                        {
                            xtype: 'actioncolumn', header: 'Détail achats', width: 85, align: 'center',
                            sortable: false, menuDisabled: true,
                            items: [{
                                iconCls: 'charticon',
                                tooltip: 'Détail achats du produit : dernière entrée, fréquences et quantités d\'achat (mois en cours + 3 derniers mois), stock réserve, vente hebdo, objectif',
                                handler: function (view, rowIndex) {
                                    const rec = me.gridStore.getAt(rowIndex);
                                    if (rec) {
                                        me.showDetailAchats(rec);
                                    }
                                }
                            }]
                        }
                    ],
                    selModel: {selType: 'cellmodel'},
                    bbar: {xtype: 'pagingtoolbar', store: data, dock: 'bottom', displayInfo: true}
                }
            ]
        });

        me.callParent(arguments);
    },

    // Detail achats d'un produit (memes informations que l'impression PDF),
    // affiche dans une fenetre au clic sur la colonne 'Détail achats'.
    showDetailAchats: function (rec) {
        const me = this;
        const objCmp = me.down('#objectifAchat');
        const objectif = (objCmp && objCmp.getValue()) || 3;
        const mask = Ext.MessageBox.wait('Chargement du détail achats...', 'Veuillez patienter');
        Ext.Ajax.request({
            url: '../api/v1/articles/abc/feuille-match/produit-detail',
            method: 'GET',
            params: {produitId: rec.get('produitId'), objectifAchat: objectif},
            success: function (response) {
                mask.hide();
                const r = Ext.JSON.decode(response.responseText, true) || {};
                if (r.success !== true || !r.data) {
                    Ext.Msg.alert('Détail achats', 'Chargement du détail impossible.');
                    return;
                }
                const d = r.data;
                const enc = Ext.String.htmlEncode;
                const nf = function (v) { return Ext.util.Format.number(v || 0, '0,000.'); };
                const ligne = function (label, valeur) {
                    return '<tr><td style="padding:3px 10px 3px 0;color:#555;white-space:nowrap;">' + label
                            + '</td><td style="padding:3px 0;font-weight:bold;">' + valeur + '</td></tr>';
                };
                const moisRow = function (mois, freq, qte) {
                    return ligne('Fréquence achat (' + enc(mois) + ')',
                            nf(freq) + ' &nbsp;&nbsp;|&nbsp;&nbsp; Qté total entrée : ' + nf(qte));
                };
                const statutColor = (d.objectifStatut || '').indexOf('Dépassé') === 0 ? '#d10000' : '#1a7e1a';
                // Marge et marge % de la periode filtree, issues de la ligne de la grille
                const marge = rec.get('marge') || 0;
                const ca = rec.get('chiffreAffaires') || 0;
                const margePct = ca > 0 ? (marge / ca * 100) : 0;
                const html = '<div style="font-size:13px;">'
                        + '<div style="font-weight:bold;margin-bottom:6px;">' + enc(d.cip || '') + ' - ' + enc(d.libelle || '')
                        + '<br/>PRIX ACHAT : ' + nf(d.prixAchat) + ' FCFA &nbsp;&nbsp; PRIX DE VENTE : ' + nf(d.prixVente) + ' FCFA</div>'
                        + '<table style="border-collapse:collapse;">'
                        + ligne('Date dernière entrée', enc(d.derniereEntree || 'aucune'))
                        + moisRow(r.moisCourant, d.freqM0, d.qteM0)
                        + moisRow(r.mois1, d.freqM1, d.qteM1)
                        + moisRow(r.mois2, d.freqM2, d.qteM2)
                        + moisRow(r.mois3, d.freqM3, d.qteM3)
                        + ligne('Stock Reserve', nf(d.stockReserve))
                        + ligne('Vente hebdo (MOY/4)', enc(d.venteHebdo || '0'))
                        + ligne('Moyenne d\'achat 3 mois', enc(d.moyenneAchat3Mois || '0'))
                        + ligne('Marge (période)', nf(marge) + ' FCFA')
                        + ligne('Marge %', '<span style="color:#0000ff;">' + Ext.util.Format.number(margePct, '0.00') + ' %</span>')
                        + '</table>'
                        + '<div style="margin-top:8px;font-weight:bold;color:' + statutColor + ';">'
                        + 'Objectif achat/mois (max ' + r.objectif + ') : ' + enc(d.objectifStatut || '') + '</div>'
                        + '</div>';
                Ext.create('Ext.window.Window', {
                    title: 'Détail achats - [' + (rec.get('cip') || '') + '] ' + (rec.get('libelle') || ''),
                    modal: true, autoShow: true, width: 560, bodyPadding: 12, html: html,
                    buttons: [{text: 'Fermer', handler: function (b) { b.up('window').close(); }}]
                });
            },
            failure: function (response) {
                mask.hide();
                Ext.Msg.alert('Erreur', 'Chargement impossible. Code HTTP : ' + response.status);
            }
        });
    }
});
