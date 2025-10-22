Ext.define('testextjs.view.caisseManager.balance.PointCaisseView', {
    extend: 'Ext.panel.Panel',
    xtype: 'pointcaisseview',
    id: 'pointCaisseViewID',

    requires: [
        'testextjs.model.PointCaisse',
        'testextjs.store.PointCaisse'
    ],
    
    frame: true,
    title: 'Point de Caisse par Caissière',
    layout: 'vbox',
    width: '98%',
    
    depotStore: Ext.create('Ext.data.Store', {
        fields: ['lgEMPLACEMENTID', 'strNAME'],
        proxy: {
            type: 'ajax',
            url: '../api/v1/magasin/find-depots',
            reader: { type: 'json', root: 'data' }
        },
        autoLoad: true,
        listeners: {
            load: function(store) {
                store.insert(0, [{ lgEMPLACEMENTID: 'ALL', strNAME: 'TOUT' }]);
            }
        }
    }),

    initComponent: function() {
        var me = this;

        var summaryRenderer = function(value) {
            return '<div style="font-size:14px; font-weight:bold; padding-right: 15px;">' + Ext.util.Format.number(value, '0,000') + '</div>';
        };

        me.items = [
            {
                xtype: 'panel',
                width: '100%',
                bodyPadding: 10,
                layout: { type: 'hbox', align: 'middle' },
                items: [
                    {
                        xtype: 'combobox',
                        fieldLabel: 'Choisir un dépôt',
                        id: 'depotPointCaisseFiltre',
                        store: me.depotStore,
                        displayField: 'strNAME',
                        valueField: 'lgEMPLACEMENTID',
                        queryMode: 'local',
                        labelWidth: 110,
                        width: 380
                    },
                    { xtype: 'splitter' },
                    { xtype: 'datefield', fieldLabel: 'Du', id: 'dtStartPointCaisseFiltre', value: new Date(), format: 'd/m/Y', submitFormat: 'Y-m-d', labelWidth: 20, width: 130 },
                    { xtype: 'splitter' },
                    { xtype: 'datefield', fieldLabel: 'Au', id: 'dtEndPointCaisseFiltre', value: new Date(), format: 'd/m/Y', submitFormat: 'Y-m-d', labelWidth: 20, width: 130 },
                    { xtype: 'splitter' },
                    { xtype: 'button', text: 'Rechercher', iconCls: 'search-icon', id: 'searchBtnPointCaisseFiltre' },
                    { xtype: 'splitter' },
                    { xtype: 'button', text: 'Imprimer', iconCls: 'printable-icon', id: 'printBtnPointCaisseFiltre' }
                ]
            },
            {
                xtype: 'gridpanel',
                id: 'gridPointCaisseFiltre',
                store: Ext.create('testextjs.store.PointCaisse'),
                flex: 1,
                width: '100%',
                stripeRows: true,
                features: [{ ftype: 'summary', dock: 'bottom' }],
                columns: [
                    
                    { text: 'Date/Période', dataIndex: 'dateTransaction', flex: 1, summaryType: 'count', summaryRenderer: function(v) { return '<span style="font-size:14px; font-weight:bold;">TOTAL</span>'; } },
                    { text: 'Dépôt', dataIndex: 'depot', flex: 1 },
                    { text: 'Caissière', dataIndex: 'caissiere', flex: 1.5 },
                    { text: 'Montant Net', dataIndex: 'montantTotalNet', renderer: Ext.util.Format.numberRenderer('0,000'), align: 'right', flex: 1, summaryType: 'sum', summaryRenderer: summaryRenderer },
                    { text: 'Espèces', dataIndex: 'especes', renderer: Ext.util.Format.numberRenderer('0,000'), align: 'right', flex: 1, summaryType: 'sum', summaryRenderer: summaryRenderer },
                    { text: 'Crédit', dataIndex: 'credit', renderer: Ext.util.Format.numberRenderer('0,000'), align: 'right', flex: 1, summaryType: 'sum', summaryRenderer: summaryRenderer }
                ]
            }
        ];

        me.callParent(arguments);
    }
});
