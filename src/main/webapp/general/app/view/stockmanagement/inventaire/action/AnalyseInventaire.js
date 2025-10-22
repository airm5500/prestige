/* global Ext */

Ext.define('testextjs.view.stockmanagement.inventaire.action.AnalyseInventaire', {
    extend: 'Ext.window.Window',
    xtype: 'analyseinventaire',
    id: 'analyseinventaireID',
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
        'Ext.grid.feature.Summary'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    // mes APIs
    url_api_analyse_inventaire: '/prestige/api/v1/analyse-inventaire',
    url_api_pdf_inventaire: '/prestige/api/v1/analyse-inventaire-pdf',
    url_api_excel_inventaire: '/prestige/api/v1/analyse-inventaire-excel',
    
    allData: [], // To store the processed summary data

    initComponent: function() {
        var me = this;

        
        var dataStore = Ext.create('Ext.data.Store', {
            fields: ['emplacement', 'prixAchat', 'prixVente', 'qteSaisie', 'qteInitiale', 'nom'],
            proxy: {
                type: 'ajax',
                url: me.url_api_analyse_inventaire,
                reader: {
                    type: 'json',
                    root: '' 
                }
            },
            autoLoad: false
        });

        // Store for the aggregated data displayed in the grid
        var summaryStore = Ext.create('Ext.data.Store', {
            fields: [
                'emplacement', 'valeurAchatMachine', 'valeurAchatRayon', 'ecartValeurAchat', 
                'valeurVenteMachine', 'valeurVenteRayon', 'ecartValeurVente',
                'pourcentageEcartGlobal', 'ratioVA'
            ]
        });

        
        var moneyRenderer = function(val) {
            if (val === null || val === undefined) return '0 F';
            var sign = val < 0 ? '-' : '';
            var absVal = Math.abs(val);
            // Force le format avec séparateur de milliers (virgule par défaut)
            // puis remplace la virgule par un espace pour le style français.
            var formattedVal = Ext.util.Format.number(absVal, '0,000').replace(/,/g, ' ');
            return sign + formattedVal + ' F';
        };
        var ecartRenderer = function(val) {
            var color = val > 0 ? 'green' : (val < 0 ? 'red' : 'black');
            // Appelle moneyRenderer qui gère maintenant correctement le formatage
            return '<span style="color:' + color + ';">' + moneyRenderer(val) + '</span>';
        };
        var percentRenderer = function(value, metaData, record) {
            if (value === null || value === undefined) return '0,00 %';
            var ecartValeur = record.get('ecartValeurAchat');
            var color = (ecartValeur !== 0) ? (ecartValeur > 0 ? 'green' : 'red') : 'black';
            var text = Ext.util.Format.number(value, '0.00').replace('.', ',') + ' %';
            return '<span style="color:' + color + ';">' + text + '</span>';
        };
        var ratioRenderer = function(value) {
            if (!value || value === 0) return 'N/A';
            var color = value >= 1.51 ? 'green' : (value < 1.45 ? 'red' : 'orange');
            var text = Ext.util.Format.number(value, '0.00').replace('.', ',');
            return '<span style="color:' + color + '; font-weight: bold;">' + text + '</span>';
        };

        var form = Ext.create('Ext.form.Panel', {
            bodyPadding: 10,
            layout: 'fit',
            items: [{
                xtype: 'gridpanel',
                itemId: 'analyseGridID',
                store: summaryStore,
                tbar: [{
                    xtype: 'combobox',
                    itemId: 'filterCombo',
                    fieldLabel: 'Filtre',
                    labelWidth: 40,
                    value: 'all',
                    store: Ext.create('Ext.data.Store', {
                        fields: ['id', 'name'],
                        data: [
                            { "id": "all", "name": "Tous" },
                            { "id": "with", "name": "Avec Écart" },
                            { "id": "without", "name": "Sans Écart" }
                        ]
                    }),
                    queryMode: 'local',
                    displayField: 'name',
                    valueField: 'id',
                    listeners: {
                        select: function(cmp) {
                            me.filterData(cmp.getValue());
                        }
                    }
                }, '->', {
                    xtype: 'displayfield',
                    itemId: 'complianceReport',
                    fieldStyle: "font-size: 14px; font-weight: bold; color: #00529C;",
                    value: 'Calcul en cours...'
                }],
                features: [{ ftype: 'summary', dock: 'bottom' }],
                columns: [
                    { text: 'Emplacement', dataIndex: 'emplacement', flex: 1.5, summaryRenderer: function(){ return '<b>TOTAL GÉNÉRAL</b>'; } },
                    { text: 'V.Achat Machine', dataIndex: 'valeurAchatMachine', renderer: moneyRenderer, flex: 1, align: 'right', summaryType: 'sum', summaryRenderer: function(val) { return '<b>' + moneyRenderer(val) + '</b>'; } },
                    { text: 'V.Achat Inventaire', dataIndex: 'valeurAchatRayon', renderer: moneyRenderer, flex: 1, align: 'right', summaryType: 'sum', summaryRenderer: function(val) { return '<b>' + moneyRenderer(val) + '</b>'; } },
                    { text: 'Écart V.Achat', dataIndex: 'ecartValeurAchat', renderer: ecartRenderer, flex: 1, align: 'right', summaryType: 'sum', summaryRenderer: function(val) { return '<b>' + ecartRenderer(val) + '</b>'; } },
                    { text: 'V.Vente Machine', dataIndex: 'valeurVenteMachine', renderer: moneyRenderer, flex: 1, align: 'right', summaryType: 'sum', summaryRenderer: function(val) { return '<b>' + moneyRenderer(val) + '</b>'; } },
                    { text: 'V.Vente Inventaire', dataIndex: 'valeurVenteRayon', renderer: moneyRenderer, flex: 1, align: 'right', summaryType: 'sum', summaryRenderer: function(val) { return '<b>' + moneyRenderer(val) + '</b>'; } },
                    { text: 'Écart V.Vente', dataIndex: 'ecartValeurVente', renderer: ecartRenderer, flex: 1, align: 'right', summaryType: 'sum', summaryRenderer: function(val) { return '<b>' + ecartRenderer(val) + '</b>'; } },
                    { text: '% Écart Global', dataIndex: 'pourcentageEcartGlobal', renderer: percentRenderer, flex: 1, align: 'center' },
                    { text: 'Ratio V/A', dataIndex: 'ratioVA', renderer: ratioRenderer, flex: 1, align: 'center',
                      sortable: true,
                      sorter: {
                          sorterFn: function(r1, r2) {
                              var v1 = r1.get('ratioVA');
                              var v2 = r2.get('ratioVA');
                              var norm = 1.51;
                              return Math.abs(v1 - norm) > Math.abs(v2 - norm) ? 1 : -1;
                          }
                      }
                    }
                ]
            }]
        });
        
        this.items = form;
        this.dockedItems = [{
            xtype: 'toolbar',
            dock: 'bottom',
            ui: 'footer',
            items: ['->', 
            {
                text: 'Imprimer (PDF)',
                iconCls: 'icon-pdf',
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
        this.setTitle(this.getTitre());

        // Load data from the API
        dataStore.load({
            params: { inventaireId: me.getOdatasource().lg_INVENTAIRE_ID },
            callback: function(records, operation, success) {
                if (!success || !records) {
                    Ext.Msg.alert('Erreur', 'Impossible de charger les données d\'analyse. Le serveur a peut-être renvoyé une erreur.');
                    me.down('#complianceReport').setValue('<span style="color:red;">Erreur de chargement.</span>');
                    return;
                }
                me.processData(records);
                me.filterData('all');
            }
        });
    },

    processData: function(records) {
        var me = this;
        var emplacementTotals = {};
        var modifiedProducts = 0;
        var totalProducts = records.length;
        var totalEcartAchatAbsolu = 0;

        Ext.each(records, function(rec) {
            var qteInitiale = rec.get('qteInitiale');
            var qteSaisie = rec.get('qteSaisie');
            var prixAchat = rec.get('prixAchat');
            var prixVente = rec.get('prixVente');
            var loc = rec.get('emplacement') || 'Non défini';
            
            if (qteInitiale !== qteSaisie) {
                modifiedProducts++;
            }
            
            if (!emplacementTotals[loc]) {
                emplacementTotals[loc] = {
                    valeurAchatMachine: 0, valeurAchatRayon: 0,
                    valeurVenteMachine: 0, valeurVenteRayon: 0
                };
            }
            emplacementTotals[loc].valeurAchatMachine += qteInitiale * prixAchat;
            emplacementTotals[loc].valeurAchatRayon += qteSaisie * prixAchat;
            emplacementTotals[loc].valeurVenteMachine += qteInitiale * prixVente;
            emplacementTotals[loc].valeurVenteRayon += qteSaisie * prixVente;
        });

        var percentage = (totalProducts > 0) ? (modifiedProducts / totalProducts) * 100 : 0;
        var percentageText = Ext.util.Format.number(percentage, '0.00').replace('.', ',');
        var reportText = 'Rapport de conformité : ' + modifiedProducts + ' produit(s) modifié(s) sur ' + totalProducts + ' au total (' + percentageText + ' %).';
        me.down('#complianceReport').setValue(reportText);

        for (var locName in emplacementTotals) {
            var totals = emplacementTotals[locName];
            var ecartAchat = totals.valeurAchatRayon - totals.valeurAchatMachine;
            totalEcartAchatAbsolu += Math.abs(ecartAchat);
        }

        var summaryData = [];
        for (var locName in emplacementTotals) {
            var totals = emplacementTotals[locName];
            var ecartAchat = totals.valeurAchatRayon - totals.valeurAchatMachine;
            var ecartVente = totals.valeurVenteRayon - totals.valeurVenteMachine;
            
            var pourcentageEcartGlobal = (totalEcartAchatAbsolu !== 0) ? (Math.abs(ecartAchat) / totalEcartAchatAbsolu) * 100 : 0;
            var ratioVA = (totals.valeurAchatRayon !== 0) ? (totals.valeurVenteRayon / totals.valeurAchatRayon) : 0;

            summaryData.push({
                emplacement: locName,
                valeurAchatMachine: totals.valeurAchatMachine,
                valeurAchatRayon: totals.valeurAchatRayon,
                ecartValeurAchat: ecartAchat,
                valeurVenteMachine: totals.valeurVenteMachine,
                valeurVenteRayon: totals.valeurVenteRayon,
                ecartValeurVente: ecartVente,
                pourcentageEcartGlobal: pourcentageEcartGlobal,
                ratioVA: ratioVA
            });
        }
        me.allData = summaryData;
    },

    filterData: function(filterType) {
        var me = this;
        var store = me.down('gridpanel').getStore();
        var dataToLoad = [];

        if (filterType === 'all') {
            dataToLoad = me.allData;
        } else {
            dataToLoad = Ext.Array.filter(me.allData, function(item) {
                if (filterType === 'with') {
                    return item.ecartValeurAchat !== 0;
                } else if (filterType === 'without') {
                    return item.ecartValeurAchat === 0;
                }
                return true;
            });
        }
        store.loadData(dataToLoad);
    },

    triggerGetExport: function(url) {
        var me = this;
        
        var filterCombo = me.down('#filterCombo');
        var filterValue = filterCombo ? filterCombo.getValue() : 'all';

        var params = Ext.urlEncode({
            inventaireId: me.getOdatasource().lg_INVENTAIRE_ID,
            inventaireName: me.getOdatasource().str_NAME,
            filterType: filterValue
        });
        
        var finalUrl = url + '?' + params;

        window.open(finalUrl, '_blank');
    },

    onPrintClick: function() {
        this.triggerGetExport(this.url_api_pdf_inventaire);
    },

    onExcelExportClick: function() {
        this.triggerGetExport(this.url_api_excel_inventaire);
    },

    onbtncancel: function() {
        this.close();
    }
});
