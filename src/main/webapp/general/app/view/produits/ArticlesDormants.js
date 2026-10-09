/* global Ext */
/*
 * Retours du 09/10 (4) : onglet « Articles dormants » de l'ecran Articles invendus. Produits en stock non vendus depuis
 * leur derniere entree (reception), cette entree datant de plus de N jours. Valeur du stock immobilise au prix d'achat,
 * export Excel et edition PDF des memes lignes (API v1/articles-dormants).
 */
Ext.define('testextjs.view.produits.ArticlesDormants', {
    extend: 'Ext.panel.Panel',
    xtype: 'articlesdormants',
    title: 'Articles dormants',
    layout: 'fit',
    border: false,

    initComponent: function () {
        var me = this;
        var liste = function (url) {
            return Ext.create('Ext.data.Store', {
                fields: ['id', 'libelle'], pageSize: 9999, autoLoad: true,
                proxy: {type: 'ajax', url: url, reader: {type: 'json', root: 'data', totalProperty: 'total'}}
            });
        };
        var combo = function (itemId, label, url, largeur) {
            return {
                xtype: 'combobox', itemId: itemId, emptyText: label, store: liste(url), valueField: 'id', displayField: 'libelle',
                queryMode: 'local', typeAhead: true, forceSelection: true, anyMatch: true, width: largeur, maxLength: 100,
                listeners: {
                    select: function () {
                        me.charger();
                    },
                    change: function (c, v) {
                        if (!v) {
                            me.charger();
                        }
                    }
                }
            };
        };
        me.store = Ext.create('Ext.data.Store', {
            fields: ['cip', 'designation', 'rayon', 'grossiste', 'derniereEntree', 'derniereVente',
                {name: 'stock', type: 'int'}, {name: 'prixAchat', type: 'int'}, {name: 'prixVente', type: 'int'},
                {name: 'qteEntree', type: 'int', useNull: true}, {name: 'jours', type: 'int'}, {name: 'valeurStock', type: 'number'}],
            pageSize: 25, remoteSort: false,
            proxy: {type: 'ajax', url: '../api/v1/articles-dormants', timeout: 240000,
                reader: {type: 'json', root: 'data', totalProperty: 'total'}},
            listeners: {
                beforeload: function (st) {
                    st.getProxy().extraParams = me.criteres();
                },
                load: function (st, recs, succes) {
                    me.majTotaux(st.getProxy().getReader().rawData, succes);
                }
            }
        });
        var nombre = function (v) {
            return v === null || v === undefined ? '' : Ext.util.Format.number(v, '0,000');
        };
        Ext.apply(me, {
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', itemId: 'barreDormants',
                    items: [
                        {xtype: 'component', html: 'Sans vente depuis leur entrée, entrée de plus de'},
                        {xtype: 'numberfield', itemId: 'jours', value: 90, minValue: 1, maxValue: 3650, allowDecimals: false,
                            width: 70, hideTrigger: false, enableKeyEvents: true,
                            listeners: {
                                specialkey: function (f, e) {
                                    if (e.getKey() === e.ENTER) {
                                        me.charger();
                                    }
                                }
                            }},
                        {xtype: 'component', html: 'jours'},
                        '-',
                        {xtype: 'textfield', itemId: 'recherche', emptyText: 'CIP ou désignation', width: 150, maxLength: 100,
                            enableKeyEvents: true, listeners: {
                                specialkey: function (f, e) {
                                    if (e.getKey() === e.ENTER) {
                                        me.charger();
                                    }
                                }
                            }},
                        combo('rayon', 'Rayon', '../api/v1/common/rayons', 115),
                        combo('grossiste', 'Grossiste', '../api/v1/common/grossiste', 115),
                        combo('famille', 'Famille', '../api/v1/common/famillearticles', 115),
                        {xtype: 'combobox', itemId: 'tri', width: 120, editable: false, value: 'valeur', queryMode: 'local',
                            store: [['valeur', 'Valeur stock'], ['jours', 'Jours sans vente'], ['libelle', 'Désignation']], tooltip: 'Ordre de la liste',
                            listeners: {
                                select: function () {
                                    me.charger();
                                }
                            }},
                        {text: 'Rechercher', itemId: 'rechercherDormants', cls: 'btn-primary', iconCls: 'searchicon', handler: function () {
                                me.charger();
                            }}
                    ]
                }, {
                    xtype: 'toolbar', dock: 'top', itemId: 'barreTotaux',
                    items: [
                        {xtype: 'component', itemId: 'totaux', cls: 'dormants-totaux', html: ''},
                        '->',
                        {text: 'Exporter Excel', itemId: 'btnDormantsExcel', cls: 'btn-primary', iconCls: 'export_excel_icon',
                            tooltip: 'Télécharger la liste complète (tous les articles du filtre) au format Excel', handler: function () {
                                me.ouvrir('excel');
                            }},
                        {text: 'Imprimer (PDF)', itemId: 'btnDormantsPdf', cls: 'btn-primary', iconCls: 'printable',
                            tooltip: 'Imprimer la liste complète (tous les articles du filtre)', handler: function () {
                                me.ouvrir('pdf');
                            }}
                    ]
                }],
            items: [{
                    xtype: 'grid', itemId: 'grilleDormants', store: me.store, columnLines: true,
                    viewConfig: {emptyText: 'Aucun article dormant pour ces critères.', deferEmptyText: false},
                    columns: [
                        {header: 'CIP', dataIndex: 'cip', width: 124},
                        {header: 'Désignation', dataIndex: 'designation', flex: 1, minWidth: 150},
                        {header: 'Rayon', dataIndex: 'rayon', width: 100},
                        {header: 'Grossiste', dataIndex: 'grossiste', width: 110},
                        {header: 'Entrée', tooltip: 'Date de la dernière entrée (réception)', dataIndex: 'derniereEntree', width: 92},
                        {header: 'Qté ent.', tooltip: 'Quantité reçue à la dernière entrée', dataIndex: 'qteEntree', width: 96, align: 'right', renderer: nombre},
                        {header: 'Jours', tooltip: 'Jours écoulés depuis la dernière entrée, sans vente', dataIndex: 'jours', width: 84, align: 'right', renderer: nombre},
                        {header: 'Dern. vente', tooltip: 'Dernière vente (avant l\'entrée)', dataIndex: 'derniereVente', width: 105, renderer: function (v) {
                                return v || '<span style="color:#8a94a3">jamais</span>';
                            }},
                        {header: 'Stock', dataIndex: 'stock', width: 84, align: 'right', renderer: nombre},
                        {header: 'P. achat', tooltip: 'Prix d\'achat', dataIndex: 'prixAchat', width: 88, align: 'right', renderer: nombre},
                        {header: 'P. vente', tooltip: 'Prix de vente', dataIndex: 'prixVente', width: 88, align: 'right', renderer: nombre},
                        {header: 'Valeur', tooltip: 'Valeur du stock au prix d\'achat', dataIndex: 'valeurStock', width: 100, align: 'right', renderer: function (v) {
                                return '<b>' + nombre(v) + '</b>';
                            }}
                    ],
                    bbar: {xtype: 'pagingtoolbar', store: me.store, displayInfo: true}
                }]
        });
        me.callParent(arguments);
        me.on('activate', function () {
            if (!me.dejaCharge) {
                me.dejaCharge = true;
                me.charger();
            }
        });
    },

    criteres: function () {
        var me = this, v = function (id) {
            var c = me.down('#' + id);
            return c ? c.getValue() : null;
        };
        var jours = v('jours');
        return {jours: jours > 0 ? jours : 90, query: v('recherche') || '', rayon: v('rayon') || '', grossiste: v('grossiste') || '',
            famille: v('famille') || '', tri: v('tri') || 'valeur'};
    },

    charger: function () {
        var j = this.down('#jours');
        if (j && !j.isValid()) {
            return;
        }
        this.store.loadPage(1);
    },

    majTotaux: function (o, succes) {
        var t = this.down('#totaux'), n = function (x) {
            return Ext.util.Format.number(x || 0, '0,000');
        };
        if (!t) {
            return;
        }
        if (!succes || !o || o.success === false) {
            t.update('<span style="color:#b42318">' + Ext.String.htmlEncode((o && o.msg) || 'Chargement impossible.') + '</span>');
            return;
        }
        t.update('<b>' + n(o.total) + '</b> article(s) dormant(s) &nbsp;·&nbsp; stock <b>' + n(o.stockTotal)
                + '</b> &nbsp;·&nbsp; valeur immobilisée <b>' + n(o.valeurTotale) + '</b> (prix d\'achat)');
    },

    ouvrir: function (format) {
        var j = this.down('#jours');
        if (j && !j.isValid()) {
            return;
        }
        window.open('../api/v1/articles-dormants/' + format + '?' + Ext.Object.toQueryString(this.criteres()));
    }
});
