/* global Ext */

Ext.define('testextjs.view.stockmanagement.inventaire.action.AnalyseAvancee', {
    extend: 'Ext.window.Window',
    xtype: 'analyseavancee',
    id: 'analyseavanceeID',
    autoShow: true,
    modal: true,
    layout: 'fit',
    width: '95%',
    height: '90%',
    maximizable: true,
    closable: false,

    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'Ext.grid.feature.Summary',
        'Ext.tab.Panel'
    ],
    config: {
        odatasource: ''
    },
    // mes apis
    url_api_analyse_avancee: '/prestige/api/v1/analyse-avancee',
    url_api_pdf_inventaire_avancee: '/prestige/api/v1/analyse-inventaire-avancee-pdf',
    url_api_excel_inventaire_avancee: '/prestige/api/v1/analyse-inventaire-avancee-excel',
    
    initComponent: function() {
        var me = this;

        
        var summaryStore = Ext.create('Ext.data.Store', {
            fields: ['emplacement', 'valeurAchatMachine', 'valeurAchatRayon', 'ecartValeurAchat', 'valeurVenteMachine', 'valeurVenteRayon', 'ecartValeurVente', 'pourcentageEcartGlobal', 'ratioVA']
        });

        var abcStore = Ext.create('Ext.data.Store', {
            fields: ['nom', 'ecartValeurAchat', 'ecartTotalPct', 'cumulPct', 'categorie']
        });

        var detailStore = Ext.create('Ext.data.Store', {
            fields: ['nom', 'emplacement', 'qteInitiale', 'qteSaisie', 'ecartQte', 'prixAchat', 'prixVente', 'ratioVA']
        });

        
        var moneyRenderer = function(val) {
            if (val === null || val === undefined) return '0 F';
            var sign = val < 0 ? '-' : '';
            var absVal = Math.abs(val);
            var formattedVal = Ext.util.Format.number(absVal, '0,000').replace(/,/g, ' ');
            return sign + formattedVal + ' F';
        };
        var ecartRenderer = function(val) {
            var color = val > 0 ? 'green' : (val < 0 ? 'red' : 'black');
            return '<span style="color:' + color + ';">' + moneyRenderer(val) + '</span>';
        };
        var percentRenderer = function(value) {
            if (value === null || value === undefined) return '0,00 %';
            return Ext.util.Format.number(value, '0.00').replace('.', ',') + ' %';
        };
        var ratioRenderer = function(value) {
            if (!value || value === 0) return 'N/A';
            var color = value >= 1.51 ? 'green' : (value < 1.45 ? 'red' : 'orange');
            var text = Ext.util.Format.number(value, '0.00').replace('.', ',');
            return '<span style="color:' + color + '; font-weight: bold;">' + text + '</span>';
        };
        var abcCategoryRenderer = function(val) {
            var color = 'black';
            if (val === 'A') color = 'red';
            if (val === 'B') color = 'orange';
            if (val === 'C') color = 'green';
            return '<span style="color:' + color + '; font-weight: bold;">' + val + '</span>';
        };

        // --- TAB PANEL ---
        var tabPanel = Ext.create('Ext.tab.Panel', {
            plain: true,
            items: [
                
                {
                    title: 'Synthèse par Emplacement',
                    layout: 'fit',
                    items: [{
                        xtype: 'gridpanel',
                        itemId: 'summaryGrid',
                        store: summaryStore,
                        features: [{ ftype: 'summary', dock: 'bottom' }],
                        columns: [
                            { text: 'Emplacement', dataIndex: 'emplacement', flex: 1.5, summaryRenderer: function(){ return '<b>TOTAL GÉNÉRAL</b>'; } },
                            { text: 'V.Achat Inventaire', dataIndex: 'valeurAchatRayon', renderer: moneyRenderer, flex: 1, align: 'right', summaryType: 'sum', summaryRenderer: function(val) { return '<b>' + moneyRenderer(val) + '</b>'; } },
                            { text: 'Écart V.Achat', dataIndex: 'ecartValeurAchat', renderer: ecartRenderer, flex: 1, align: 'right', summaryType: 'sum', summaryRenderer: function(val) { return '<b>' + ecartRenderer(val) + '</b>'; } },
                            { text: 'Contribution à l\'Écart', dataIndex: 'pourcentageEcartGlobal', renderer: percentRenderer, flex: 1, align: 'center' },
                            { text: 'Ratio V/A', dataIndex: 'ratioVA', renderer: ratioRenderer, flex: 1, align: 'center' }
                        ]
                    }]
                },
                
                {
                    title: 'Analyse des Écarts (ABC)',
                    layout: 'fit',
                    items: [{
                        xtype: 'gridpanel',
                        itemId: 'abcGrid',
                        store: abcStore,
                        columns: [
                            { text: 'Produit', dataIndex: 'nom', flex: 2.5 },
                            { text: 'Écart Valeur Achat', dataIndex: 'ecartValeurAchat', renderer: ecartRenderer, flex: 1, align: 'right' },
                            { text: '% Écart Total', dataIndex: 'ecartTotalPct', renderer: percentRenderer, flex: 1, align: 'center' },
                            { text: '% Cumulé', dataIndex: 'cumulPct', renderer: percentRenderer, flex: 1, align: 'center' },
                            { text: 'Catégorie', dataIndex: 'categorie', renderer: abcCategoryRenderer, flex: 0.5, align: 'center' }
                        ]
                    }]
                },
                
                {
                    title: 'Détail Complet des Produits',
                    layout: 'fit',
                    items: [{
                        xtype: 'gridpanel',
                        itemId: 'detailGrid',
                        store: detailStore,
                        columns: [
                            { text: 'Produit', dataIndex: 'nom', flex: 2 },
                            { text: 'Emplacement', dataIndex: 'emplacement', flex: 1.5 },
                            { text: 'Qté Machine', dataIndex: 'qteInitiale', align: 'center' },
                            { text: 'Qté Rayon', dataIndex: 'qteSaisie', align: 'center' },
                            { text: 'Écart Qté', dataIndex: 'ecartQte', align: 'center' },
                            { text: 'Prix Achat', dataIndex: 'prixAchat', renderer: moneyRenderer, align: 'right' },
                            { text: 'Prix Vente', dataIndex: 'prixVente', renderer: moneyRenderer, align: 'right' },
                            { text: 'Ratio V/A', dataIndex: 'ratioVA', renderer: ratioRenderer, align: 'center' }
                        ]
                    }]
                },
                
                {
                    title: 'Synthèse & Recommandations',
                    bodyPadding: 10,
                    itemId: 'summaryPanel',
                    autoScroll: true,
                    html: 'Chargement de la synthèse...'
                }
            ]
        });

        this.items = [{
            xtype: 'panel',
            layout: 'fit',
            tbar: [
                '->', 
                {
                    xtype: 'displayfield',
                    itemId: 'complianceReport',
                    fieldStyle: "font-size: 14px; font-weight: bold; color: #00529C;",
                    value: 'Calcul en cours...'
                }
            ],
            items: [tabPanel]
        }];
        
        this.dockedItems = [{
            xtype: 'toolbar',
            dock: 'bottom',
            ui: 'footer',            
            items: ['->', 
            {
                text: 'Imprimer (PDF)',
                iconCls: 'icon-pdf',
                hidden:true,
                handler: function() { me.onPrintClick(); }
            },
            {
                text: 'Exporter (Excel)',
                iconCls: 'icon-excel',
                handler: function() { me.onExcelExportClick(); }
            },
            {
                text: 'Retour',
                iconCls: 'icon-cancel',
                handler: function() { me.onbtncancel(); }
            }]
        }];

        this.callParent();
        this.setTitle("Tableau de Bord d'Analyse : " + this.getOdatasource().str_NAME);

        Ext.Ajax.request({
            url: me.url_api_analyse_avancee,
            method: 'GET', 
            params: { inventaireId: me.getOdatasource().lg_INVENTAIRE_ID },
            success: function(response) {
                var data = Ext.decode(response.responseText);
                if (!data) {
                    Ext.Msg.alert('Erreur', 'Aucune donnée reçue du serveur.');
                    return;
                }
                
                me.down('#summaryGrid').getStore().loadData(data.summaryData);
                me.down('#abcGrid').getStore().loadData(data.abcData);
                me.down('#detailGrid').getStore().loadData(data.detailData);
                me.down('#summaryPanel').update(data.summaryHtml);
                me.down('#complianceReport').setValue(data.complianceReport);
            },
            failure: function() {
                Ext.Msg.alert('Erreur', 'Impossible de charger les données d\'analyse avancée.');
            }
        });
    },

    onPrintClick: function() {
        var me = this;
        var params = Ext.urlEncode({
            inventaireId: me.getOdatasource().lg_INVENTAIRE_ID,
            inventaireName: me.getOdatasource().str_NAME
        });
        window.open(me.url_api_pdf_inventaire_avancee + '?' + params, '_blank');
    },

    onExcelExportClick: function() {
        var me = this;
        var params = Ext.urlEncode({
            inventaireId: me.getOdatasource().lg_INVENTAIRE_ID,
            inventaireName: me.getOdatasource().str_NAME
        });
        window.open(me.url_api_excel_inventaire_avancee + '?' + params, '_blank');
    },

    onbtncancel: function() {
        this.close();
    }
});
