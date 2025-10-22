/*
 * airman
 */
Ext.define('testextjs.view.caisseManager.balance.BalanceSaleCashDepot', {
    extend: 'Ext.panel.Panel',
    xtype: 'balancesalecashdepot',
    id: 'balanceSaleCashDepotID',
    requires: [
        'Ext.chart.*',
        'Ext.layout.container.Fit',
        'Ext.window.MessageBox'
    ],
    frame: true,
    title: 'Balance des ventes par dépôt',
    width: '98%',
    height: 650, 
    layout: 'vbox',
    
    initComponent: function() {
        var me = this;
        var today = new Date();

        var depotStore = Ext.create('Ext.data.Store', {
            fields: ['lgEMPLACEMENTID', 'strNAME'],
            proxy: {
                type: 'ajax',
                url: '../api/v1/magasin/find-depots',
                reader: {
                    type: 'json',
                    root: 'data'
                }
            },
            autoLoad: true,
            listeners: {
                load: function(store, records, successful) {
                    if (successful) {
                        store.insert(0, [{
                            lgEMPLACEMENTID: 'ALL',
                            strNAME: 'TOUT'
                        }]);
                        Ext.getCmp('depot').setValue('ALL');
                    }
                }
            }
        });

        // CORRECTION: Renderer amélioré pour les totaux de la grille
        var summaryRenderer = function(value, summaryData, dataIndex) {
            // Ajout d'un div avec un padding à droite plus important pour décaler le texte vers la gauche.
            return '<div style="font-size:14px; font-weight:bold; padding-right: 15px;">' + Ext.util.Format.number(value, '0,000') + '</div>';
        };
        
        var highlightRenderer = function(value) {
            if (value && value != 0) {
                return '<span style="font-size: 14px; font-weight: bold; color: blue;">' + Ext.util.Format.number(value, '0,000.00') + '</span>';
            }
            return Ext.util.Format.number(value, '0,000.00');
        };

        Ext.applyIf(me, {
            items: [
                {
                    xtype: 'panel',
                    width: '100%',
                    bodyPadding: 10,
                    layout: { type: 'hbox', align: 'middle' },
                    items: [
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Choisir un dépôt',
                            id: 'depot',
                            store: depotStore,
                            displayField: 'strNAME',
                            valueField: 'lgEMPLACEMENTID',
                            queryMode: 'local',
                            labelWidth: 110,
                            width: 380,
                            allowBlank: false
                        },
                        { xtype: 'splitter' },
                        { xtype: 'datefield', fieldLabel: 'Du', id: 'dtStart', value: today, format: 'd/m/Y', submitFormat: 'Y-m-d', labelWidth: 20, width: 130 },
                        { xtype: 'splitter' },
                        { xtype: 'datefield', fieldLabel: 'Au', id: 'dtEnd', value: today, format: 'd/m/Y', submitFormat: 'Y-m-d', labelWidth: 20, width: 130 },
                        { xtype: 'splitter' },
                        { xtype: 'button', text: 'Rechercher', iconCls: 'search-icon', id: 'searchBtn' },
                        { xtype: 'splitter' },
                        { xtype: 'button', text: 'Imprimer', iconCls: 'printable-icon', id: 'printBtn' }
                    ]
                },
                {
                    xtype: 'gridpanel',
                    id: 'gridBalance',
                    store: Ext.create('testextjs.store.BalanceSaleCashDepotStore'),
                    height: 200,
                    width: '100%',
                    stripeRows: true,
                    features: [{ ftype: 'summary', dock: 'bottom' }],
                    columns: [
                        { text: 'Type Vente', dataIndex: 'typeVente', flex: 1.2, summaryType: 'count', summaryRenderer: function(value){return '<span style="font-size:14px; font-weight:bold;">TOTAL</span>';} },
                        { text: 'Montant TTC', dataIndex: 'montantTTC', renderer: Ext.util.Format.numberRenderer('0,000'), align: 'right', flex: 1, summaryType: 'sum', summaryRenderer: summaryRenderer },
                        { text: 'Montant Net', dataIndex: 'montantNet', renderer: Ext.util.Format.numberRenderer('0,000'), align: 'right', flex: 1, summaryType: 'sum', summaryRenderer: summaryRenderer },
                        { text: 'Marge', dataIndex: 'marge', renderer: Ext.util.Format.numberRenderer('0,000'), align: 'right', flex: 1, summaryType: 'sum', summaryRenderer: summaryRenderer },
                        { text: 'Nbre Ventes', dataIndex: 'nbreVente', align: 'center', flex: 0.6, summaryType: 'sum', summaryRenderer: summaryRenderer },
                        { text: 'Montant Espèces', dataIndex: 'montantEsp', renderer: Ext.util.Format.numberRenderer('0,000'), align: 'right', flex: 1, summaryType: 'sum', summaryRenderer: summaryRenderer },
                        { text: 'Montant Tiers Payant', dataIndex: 'montantTp', renderer: Ext.util.Format.numberRenderer('0,000'), align: 'right', flex: 1, summaryType: 'sum', summaryRenderer: summaryRenderer }
                    ]
                },
                {
                    xtype: 'panel',
                    title: 'Résumé Global Détaillé',
                    id: 'summaryPanel',
                    width: '100%',
                    flex: 1,
                    bodyPadding: 10,
                    autoScroll: true,
                    layout: { type: 'table', columns: 4, tableAttrs: { style: { width: '100%' } } },
                    defaults: { xtype: 'displayfield', labelWidth: 160, renderer: highlightRenderer },
                    items: [
                        { fieldLabel: 'Montant TTC', id: 'montantTTC_summary' },
                        { fieldLabel: 'Montant HT', id: 'montantHT_summary' },
                        { fieldLabel: 'Montant TVA', id: 'montantTva_summary' },
                        { fieldLabel: 'Montant Net', id: 'montantNet_summary' },
                        { fieldLabel: 'Marge', id: 'marge_summary' },
                        { fieldLabel: 'Montant Remise', id: 'montantRemise_summary' },
                        { fieldLabel: 'Nombre de Ventes', id: 'nbreVente_summary' },
                        { fieldLabel: 'Panier Moyen', id: 'panierMoyen_summary' },
                        { fieldLabel: 'Montant Achats', id: 'montantAchat_summary' },
                        { fieldLabel: 'Ratio Vente/Achat', id: 'ratioVA_summary' },
                        { fieldLabel: 'Ratio Achat/Vente', id: 'rationAV_summary' },
                        { fieldLabel: 'Montant Tiers Payant', id: 'montantTp_summary' },
                        { fieldLabel: 'Règlements TP', id: 'montantRegleTp_summary' },
                        { fieldLabel: 'Montant Espèces', id: 'montantEsp_summary' },
                        { fieldLabel: 'Montant Chèque', id: 'montantCheque_summary' },
                        { fieldLabel: 'Montant CB', id: 'montantCB_summary' },
                        { fieldLabel: 'Montant Virement', id: 'montantVirement_summary' },
                        { fieldLabel: 'Paiement Mobile', id: 'montantMobilePayment_summary' },
                        { fieldLabel: 'Fonds de caisse', id: 'fondCaisse_summary' },
                        { fieldLabel: 'Entrées en caisse', id: 'montantEntre_summary' },
                        { fieldLabel: 'Sorties de caisse', id: 'montantSortie_summary' },
                        { fieldLabel: 'Différé réglé', id: 'montantRegDiff_summary' },
                        { fieldLabel: 'Montant Différé', id: 'montantDiff_summary' }
                    ]
                }
            ]
        });

        me.callParent(arguments);
    }
});
