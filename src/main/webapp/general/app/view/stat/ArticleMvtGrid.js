Ext.define('testextjs.view.stat.ArticleMvtGrid', {
    extend: 'Ext.grid.Panel',
    xtype: 'articlemvtgrid',

    requires: [
        'testextjs.store.ArticleMvtStore'
    ],

    title: 'Articles en mouvement',

    frame: true,
    iconCls: 'icon-grid',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: { type: 'fit' },

    forceFit: true,
    columnLines: true,
    viewConfig: { stripeRows: true, enableTextSelection: true },

    initComponent: function () {
        var me = this;

        me.store = Ext.create('testextjs.store.ArticleMvtStore', {
            autoLoad: false
        });

        me.selModel = Ext.create('Ext.selection.CheckboxModel', {
            mode: 'MULTI',
            checkOnly: true,
            allowDeselect: true,
            pruneRemoved: true // enlève la sélection quand le store change
        });

        Ext.apply(me, {
            tbar: [
                { xtype: 'datefield', itemId: 'dtStart', fieldLabel: 'Du', labelWidth: 25, width: 160, format: 'Y-m-d', submitFormat: 'Y-m-d', maxValue: new Date(),value: new Date() },
                { xtype: 'datefield', itemId: 'dtEnd', fieldLabel: 'Au', labelWidth: 20, width: 155, format: 'Y-m-d', submitFormat: 'Y-m-d', maxValue: new Date(),value: new Date() },
                { xtype: 'textfield', itemId: 'queryField', flex: 1, emptyText: 'Rechercher (CIP ou Nom)...', enableKeyEvents: true },
                { xtype: 'button', itemId: 'btnSearch', text: 'Rechercher', iconCls: 'icon-find' },
                { xtype: 'button', itemId: 'btnReset', text: 'Réinitialiser', iconCls: 'icon-refresh' },
                ,
                        {
                            xtype: 'button',
                            itemId: 'btnExportExcel',
                            text: 'Exporter Excel',
                            iconCls: 'icon-excel'
                        },
                '->',
                { xtype: 'button', itemId: 'btnCreateInventaire', text: 'Créer inventaire (sélection)', iconCls: 'icon-add', disabled: true }
            ],

            columns: [
                { text: 'ID', dataIndex: 'lgFamilleId', hidden: true },
                { text: 'CIP', dataIndex: 'codeCip', flex: 1 },
                { text: 'Désignation', dataIndex: 'strName', flex: 3 },
                { text: 'PA', dataIndex: 'prixAchat', flex: 1, align: 'right', renderer: function (v) { return Ext.util.Format.number(v || 0, '0,0'); } },
                { text: 'PV', dataIndex: 'prixVente', flex: 1, align: 'right', renderer: function (v) { return Ext.util.Format.number(v || 0, '0,0'); } }
            ],

            dockedItems: [{
                xtype: 'pagingtoolbar',
                dock: 'bottom',
                store: me.store,
                displayInfo: true
            }]
        });

        me.callParent(arguments);

        me.store.on('beforeload', function () {
            me.getSelectionModel().deselectAll(true);
        });
        me.store.on('load', function () {
            me.getSelectionModel().deselectAll(true);
        });

        me.getSelectionModel().on('selectionchange', function (sm, selections) {
            var b = me.down('button[itemId=btnCreateInventaire]');
            if (b) { b.setDisabled(selections.length === 0); }
        });

        // ✅ 3) méthode de reset “écran”
        me.resetScreen = function () {
            var q = me.down('textfield[itemId=queryField]');
            var d1 = me.down('datefield[itemId=dtStart]');
            var d2 = me.down('datefield[itemId=dtEnd]');

            if (q)  q.setValue('');
            if (d1) d1.setValue(null);
            if (d2) d2.setValue(null);

            me.getSelectionModel().deselectAll(true);

            me.store.removeAll();
            me.store.currentPage = 1;

            var p = me.store.getProxy().extraParams || {};
            p.query = '';
            p.dtStart = '';
            p.dtEnd = '';
            me.store.getProxy().extraParams = p;
        };
    }
});
