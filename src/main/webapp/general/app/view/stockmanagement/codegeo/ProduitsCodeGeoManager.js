/* global Ext */

/*
 * PRODUITS PAR CODE GEO (plan d'octobre, section 6) : ou ranger, ou trouver. Code geo du rayon et de la reserve,
 * stocks, colisage ; tries par code geo. Filtres : emplacement, debut du code geo (rayon / reserve), produits sans code
 * geo, en stock, recherche. Export Excel (toutes les lignes du filtre) et impression PDF dans l'onglet. Lecture seule.
 */
Ext.define('testextjs.view.stockmanagement.codegeo.ProduitsCodeGeoManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'produitscodegeo',
    id: 'produitscodegeoID',
    title: 'Produits par code géo',
    frame: true,
    width: '98%',
    height: 620,

    initComponent: function () {
        var me = this;
        var store = Ext.create('Ext.data.Store', {
            fields: ['id', 'cip', 'libelle', 'emplacement', 'codeGeo', 'codeGeoReserve',
                {name: 'stockRayon', type: 'int'}, {name: 'stockReserve', type: 'int'}, 'colisage'],
            pageSize: 25,
            autoLoad: false,
            proxy: {type: 'ajax', url: '../api/v1/produits-code-geo', reader: {type: 'json', root: 'data', totalProperty: 'total'}}
        });
        store.on('beforeload', function (st) {
            Ext.apply(st.getProxy().extraParams, me.filtres());
        });
        var rayons = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle'], pageSize: 9999, autoLoad: true,
            proxy: {type: 'ajax', url: '../api/v1/common/rayons', reader: {type: 'json', root: 'data', totalProperty: 'total'}}
        });
        var surEntree = {specialkey: function (f, e) {
                if (e.getKey() === e.ENTER) {
                    me.rechercher();
                }
            }};
        Ext.apply(me, {
            store: store,
            columns: [
                {text: 'Code géo rayon', dataIndex: 'codeGeo', width: 120, renderer: function (v) {
                        return v ? '<b>' + Ext.String.htmlEncode(v) + '</b>' : '<span style="color:#9aa8b6">—</span>';
                    }},
                {text: 'Code géo réserve', dataIndex: 'codeGeoReserve', width: 120, renderer: function (v) {
                        return v ? Ext.String.htmlEncode(v) : '<span style="color:#9aa8b6">—</span>';
                    }},
                {text: 'Emplacement', dataIndex: 'emplacement', width: 150},
                {text: 'CIP', dataIndex: 'cip', width: 90},
                {text: 'Produit', dataIndex: 'libelle', flex: 1},
                {text: 'Stock rayon', dataIndex: 'stockRayon', width: 90, align: 'right'},
                {text: 'Stock réserve', dataIndex: 'stockReserve', width: 95, align: 'right'},
                {text: 'Colisage', dataIndex: 'colisage', width: 80, align: 'right', renderer: function (v) {
                        return v ? v : '<span style="color:#9aa8b6">—</span>';
                    }}
            ],
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'combobox', itemId: 'zone', width: 200, emptyText: 'Emplacement', store: rayons, queryMode: 'local',
                            displayField: 'libelle', valueField: 'id', editable: true, forceSelection: true,
                            listeners: {select: function () {
                                    me.rechercher();
                                }}},
                        {xtype: 'textfield', itemId: 'codeGeo', width: 130, emptyText: 'Code géo rayon…', listeners: surEntree},
                        {xtype: 'textfield', itemId: 'codeGeoReserve', width: 130, emptyText: 'Code géo réserve…', listeners: surEntree},
                        {xtype: 'combobox', itemId: 'sansCode', width: 170, editable: false, queryMode: 'local', displayField: 'l', valueField: 'v', value: '',
                            store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: [{v: '', l: 'Tous les produits'},
                                    {v: 'RAYON', l: 'Sans code géo rayon'}, {v: 'RESERVE', l: 'Sans code géo réserve'}]}),
                            listeners: {select: function () {
                                    me.rechercher();
                                }}},
                        {xtype: 'checkbox', itemId: 'enStock', boxLabel: 'En stock', listeners: {change: function () {
                                    me.rechercher();
                                }}},
                        {xtype: 'textfield', itemId: 'query', width: 180, emptyText: 'Produit, CIP…', listeners: surEntree},
                        {text: 'Rechercher', itemId: 'btnRechercher', iconCls: 'searchicon', handler: function () {
                                me.rechercher();
                            }},
                        '->',
                        {text: 'Excel', itemId: 'btnExcel', iconCls: 'export_excel_icon', handler: function () {
                                window.location = '../api/v1/produits-code-geo/excel?' + Ext.Object.toQueryString(me.filtres());
                            }},
                        {text: 'Imprimer', itemId: 'btnImprimer', iconCls: 'printable', handler: function () {
                                window.open('../api/v1/produits-code-geo/pdf?' + Ext.Object.toQueryString(me.filtres()));
                            }}
                    ]
                }],
            bbar: {xtype: 'pagingtoolbar', store: store, displayInfo: true}
        });
        me.callParent(arguments);
        me.on('afterrender', function () {
            store.loadPage(1);
        });
    },

    filtres: function () {
        var me = this, v = function (id) {
            var c = me.down('#' + id);
            return c ? c.getValue() : null;
        };
        return {zoneId: v('zone') || '', codeGeo: v('codeGeo') || '', codeGeoReserve: v('codeGeoReserve') || '',
            sansCode: v('sansCode') || '', enStock: !!v('enStock'), query: v('query') || ''};
    },

    rechercher: function () {
        this.getStore().loadPage(1);
    }
});
