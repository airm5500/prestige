/* global Ext */

/*
 * SERVICE CLIENT > « Historique ordonnancier » (retour du 05/11) : les ventes des produits sensibles ou de
 * l'ordonnancier (soumis a ordonnance avec code tableau), avec ou sans medecin. Colonnes date, ticket, produit,
 * quantite, client, prescripteur, vendeur ; filtres periode, produit (CIP ou nom), categorie ; export Excel et
 * impression des lignes filtrees. Routes : ../api/v1/ventestats/historique-ordonnancier.
 */
Ext.define('testextjs.view.vente.HistoriqueOrdonnancier', {
    extend: 'Ext.panel.Panel',
    xtype: 'historiqueordonnancier',
    requires: ['testextjs.view.commun.RaccourcisPeriode'],
    layout: 'fit',
    border: false,
    header: false,
    config: {
        nameintern: '',
        titre: '',
        odatasource: ''
    },

    CATEGORIES: [{code: '', libelle: 'Tous'}, {code: 'sensible', libelle: 'Sensibles'},
        {code: 'ordonnancier', libelle: 'Ordonnancier'}],

    initComponent: function () {
        var me = this, aujourdhui = new Date(), url = '../api/v1/ventestats/historique-ordonnancier', parPage = 50;
        var texte = function (v) {
            return Ext.String.htmlEncode(v || '');
        };
        me.lignes = Ext.create('Ext.data.Store', {
            fields: ['date', 'ticket', 'cip', 'produit', {name: 'quantite', type: 'int'}, 'client', 'prescripteur',
                'vendeur', 'categorie'],
            pageSize: parPage,
            proxy: {type: 'ajax', url: url, timeout: 600000,
                reader: {type: 'json', root: 'data', totalProperty: 'total'}},
            listeners: {
                beforeload: function (st) {
                    st.getProxy().extraParams = me.filtres();
                }
            }
        });
        var rechercher = function () {
            me.lignes.loadPage(1);
        };
        var exporter = function (format) {
            var qs = Ext.Object.toQueryString(me.filtres());
            if (format === 'excel') {
                window.location.href = url + '/excel?' + qs;
            } else {
                window.open(url + '/pdf?' + qs, '_blank');
            }
        };
        Ext.apply(me, {
            items: [{
                    xtype: 'gridpanel', store: me.lignes, itemId: 'hoGrille', columnLines: true,
                    viewConfig: {
                        deferEmptyText: false,
                        emptyText: '<div style="padding:20px;color:#7f8c8d">Aucune vente de produit sensible ou de '
                                + 'l\'ordonnancier sur la p&eacute;riode.</div>'
                    },
                    columns: [
                        {text: 'Date', dataIndex: 'date', width: 120},
                        {text: 'Ticket', dataIndex: 'ticket', width: 110, renderer: texte},
                        {text: 'Produit', dataIndex: 'produit', flex: 1.4, minWidth: 220,
                            renderer: function (v, m, r) {
                                var cat = r.get('categorie');
                                if (cat) {
                                    m.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(cat) + '"';
                                }
                                return texte(v) + (r.get('cip')
                                        ? ' <span style="color:#7f8c8d">(' + texte(r.get('cip')) + ')</span>' : '');
                            }},
                        {text: 'Qté', dataIndex: 'quantite', width: 55, align: 'right'},
                        {text: 'Client', dataIndex: 'client', flex: 1, minWidth: 150, renderer: texte},
                        {text: 'Prescripteur', dataIndex: 'prescripteur', flex: 1, minWidth: 150, renderer: texte},
                        {text: 'Vendeur', dataIndex: 'vendeur', flex: 0.8, minWidth: 120, renderer: texte}
                    ],
                    bbar: {xtype: 'pagingtoolbar', store: me.lignes, pageSize: parPage, displayInfo: true}
                }],
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'datefield', itemId: 'hoDebut', fieldLabel: 'Du', labelWidth: 22, width: 135,
                            format: 'd/m/Y', submitFormat: 'Y-m-d', value: Ext.Date.getFirstDateOfMonth(aujourdhui),
                            maxValue: aujourdhui},
                        {xtype: 'datefield', itemId: 'hoFin', fieldLabel: 'au', labelWidth: 20, width: 133,
                            format: 'd/m/Y', submitFormat: 'Y-m-d', value: aujourdhui, maxValue: aujourdhui,
                            plugins: [{ptype: 'raccourcisperiode', debut: 'hoDebut', declencher: 'hoRechercher'}]},
                        {xtype: 'textfield', itemId: 'hoProduit', fieldLabel: 'Produit', labelWidth: 48, width: 260,
                            emptyText: 'CIP ou nom', enableKeyEvents: true,
                            listeners: {specialkey: function (f, e) {
                                    if (e.getKey() === e.ENTER) {
                                        rechercher();
                                    }
                                }}},
                        {xtype: 'combobox', itemId: 'hoCategorie', fieldLabel: 'Cat&eacute;gorie', labelWidth: 62,
                            width: 200, editable: false, queryMode: 'local', displayField: 'libelle',
                            valueField: 'code', value: '',
                            store: Ext.create('Ext.data.Store', {fields: ['code', 'libelle'], data: me.CATEGORIES}),
                            listeners: {select: rechercher}},
                        {text: 'Rechercher', itemId: 'hoRechercher', iconCls: 'searchicon', handler: rechercher},
                        '->',
                        {text: 'Excel', itemId: 'hoExcel', iconCls: 'export_excel_icon',
                            tooltip: 'Exporter les lignes filtr&eacute;es au format Excel', handler: function () {
                                exporter('excel');
                            }},
                        {text: 'Imprimer', itemId: 'hoImprimer', iconCls: 'printable',
                            tooltip: 'Imprimer les lignes filtr&eacute;es', handler: function () {
                                exporter('pdf');
                            }}
                    ]
                }]
        });
        me.callParent(arguments);
        me.on('afterrender', function () {
            rechercher();
        }, me, {single: true});
    },

    filtres: function () {
        var me = this;
        return {du: me.down('#hoDebut').getSubmitValue(), au: me.down('#hoFin').getSubmitValue(),
            produit: Ext.String.trim(me.down('#hoProduit').getValue() || ''),
            categorie: me.down('#hoCategorie').getValue() || ''};
    }
});
