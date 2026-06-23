/* global Ext */

Ext.define('testextjs.view.Report.abc.AbcManager', {
    extend: 'Ext.panel.Panel',
    xtype: 'abcmanager',
    title: 'Classification ABC',
    frame: true,
    width: '98%',
    height: 600,
    minHeight: 570,
    cls: 'custompanel',
    layout: 'fit',
    requires: ['testextjs.model.AbcProduit', 'Ext.tip.ToolTip',
        'Ext.chart.Chart', 'Ext.chart.series.Line', 'Ext.chart.axis.Numeric', 'Ext.chart.axis.Category'],

    initComponent: function () {
        const me = this;

        // Explication "terre a terre" affichee au survol des colonnes Part %/Cumul %.
        const metricInfo = function (store) {
            const cmp = me.down('#comboType');
            const type = (cmp && cmp.getValue()) || 'CA';
            const field = type === 'QTY' ? 'quantiteVendue' : (type === 'MARGE' ? 'marge' : 'chiffreAffaires');
            const label = type === 'QTY' ? 'quantité vendue' : (type === 'MARGE' ? 'marge' : 'CA');
            let total = 0;
            try {
                const s = store.getProxy().getReader().rawData.summary;
                total = (s.A[field] || 0) + (s.B[field] || 0) + (s.C[field] || 0);
            } catch (e) { total = 0; }
            return {field: field, label: label, total: total};
        };
        const nf = function (n) { return Ext.util.Format.number(n, '0,000.'); };

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
                url: '../api/v1/articles/abc',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 2400000
            },
            listeners: {
                beforeload: function (store, operation) {
                    const proxy = store.getProxy();
                    const v = function (id) {
                        const c = me.down('#' + id);
                        return c && c.getValue() ? c.getValue() : '';
                    };
                    proxy.setExtraParam('dtStart', me.down('#dtStart').getSubmitValue());
                    proxy.setExtraParam('dtEnd', me.down('#dtEnd').getSubmitValue());
                    proxy.setExtraParam('type', v('comboType') || 'QTY');
                    proxy.setExtraParam('classe', v('comboClasse') || 'ALL');
                    proxy.setExtraParam('stockFilter', v('comboStock') || 'ALL');
                    proxy.setExtraParam('stockMin', v('stockValue'));
                    proxy.setExtraParam('topN', v('topN'));
                    proxy.setExtraParam('search', v('searchField'));
                    proxy.setExtraParam('codeRayon', v('rayons'));
                    proxy.setExtraParam('codeGrossiste', v('grossiste'));
                    proxy.setExtraParam('codeFamille', v('codeFamile'));
                },
                load: function (store, records, success, operation) {
                    me.updateSummary(store);
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
        const filtreStock = new Ext.data.Store({
            fields: ['id', 'libelle'],
            data: [
                {id: 'ALL', libelle: 'Tous les stocks'},
                {id: 'SUP', libelle: 'Stock supérieur à'},
                {id: 'SUPEQ', libelle: 'Stock supérieur ou égal à'},
                {id: 'INF', libelle: 'Stock inférieur à'},
                {id: 'INFEQ', libelle: 'Stock inférieur ou égal à'},
                {id: 'EGAL', libelle: 'Stock égal à'},
                {id: 'INF_SEUIL', libelle: 'Stock inférieur au seuil'},
                {id: 'INF_EGAL_SEUIL', libelle: 'Stock inférieur ou égal au seuil'}
            ]
        });
        // Opérateurs nécessitant une valeur saisie
        const stockNeedsValue = function (op) {
            return op === 'SUP' || op === 'SUPEQ' || op === 'INF' || op === 'INFEQ' || op === 'EGAL';
        };

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
                        {
                            xtype: 'combo', value: 'ALL', flex: 1, itemId: 'comboStock', labelWidth: 1, editable: false,
                            store: filtreStock, valueField: 'id', displayField: 'libelle',
                            listeners: {
                                select: function (combo, recs) {
                                    const op = (recs && recs[0]) ? recs[0].get('id') : combo.getValue();
                                    const champ = me.down('#stockValue');
                                    if (stockNeedsValue(op)) {
                                        champ.show();
                                        champ.focus(true, 50); // focus automatique
                                    } else {
                                        champ.hide();
                                        champ.setValue(null);
                                        me.gridStore.loadPage(1); // pas de valeur a saisir -> recherche immediate
                                    }
                                }
                            }
                        },
                        {
                            xtype: 'numberfield', itemId: 'stockValue', width: 90, hidden: true, hideLabel: true,
                            emptyText: 'valeur', minValue: 0, allowDecimals: false,
                            listeners: {
                                specialkey: function (f, e) {
                                    if (e.getKey() === e.ENTER) {
                                        me.gridStore.loadPage(1);
                                    }
                                }
                            }
                        },
                        {xtype: 'textfield', flex: 1, itemId: 'searchField', emptyText: 'CIP, libellé, EAN, code Geo'},
                        {text: 'Rechercher', itemId: 'rechercher', iconCls: 'searchicon', scope: this},
                        {xtype: 'tbseparator'},
                        {text: 'Recalculer classification', itemId: 'recalculer', iconCls: 'suggestionreapro', tooltip: 'Recalcule la classification ABC sur la période'},
                        {text: 'Appliquer aux fiches', itemId: 'appliquer', iconCls: 'printable', tooltip: 'Écrit la classe ABC calculée sur les fiches articles'},
                        {text: 'Courbe évolution', itemId: 'evolution', iconCls: 'charticon', tooltip: 'Évolution mensuelle des classes sur la période'},
                        {xtype: 'tbseparator'},
                        {text: 'Paramétrer les classes', itemId: 'parametrerClasses', iconCls: 'configuration', tooltip: 'Modifier Q1, Q2, Q3, unité et bornes des classes A/B/C'}
                    ]
                },
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {xtype: 'tbtext', itemId: 'summaryLabel', text: 'A: -, B: -, C: -'},
                        '->',
                        {text: 'Imprimer', itemId: 'imprimer', iconCls: 'printable', tooltip: 'Imprimer le résultat filtré (PDF)'},
                        {
                            xtype: 'splitbutton', text: 'Exporter', itemId: 'btnExporter', iconCls: 'export_excel_icon',
                            tooltip: 'Exporter le résultat filtré',
                            menu: [
                                {text: 'Exporter Excel', itemId: 'exporterExcel', iconCls: 'export_excel_icon'},
                                {text: 'Exporter CSV', itemId: 'exporterCsv', iconCls: 'export_csv_icon'}
                            ]
                        },
                        {text: 'Créer suggestion', itemId: 'creerSuggestion', iconCls: 'suggestionreapro', tooltip: 'Créer des suggestions de commande à partir du résultat filtré'},
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
                        {header: 'CIP', dataIndex: 'cip', width: 80},
                        {header: 'EAN', dataIndex: 'ean', width: 100, hidden: true},
                        {header: 'Libellé', dataIndex: 'libelle', flex: 1.6},
                        {header: 'Classe', dataIndex: 'classe', width: 60, align: 'center',
                            renderer: function (v) {
                                const map = {A: '#1a7e1a', B: '#e67e00', C: '#d10000'};
                                return '<span style="color:' + (map[v] || '#000') + ';font-weight:bold">' + (v || '') + '</span>';
                            }},
                        {header: 'Famille', dataIndex: 'famille', flex: 1},
                        {header: 'Rayon', dataIndex: 'rayon', flex: 1},
                        {header: 'Code Geo', dataIndex: 'codeGeoArticle', width: 100, hidden: true},
                        {header: 'Stock', dataIndex: 'stockDisponible', width: 70, align: 'right', renderer: moneyRenderer},
                        {header: 'Seuil', dataIndex: 'seuilMini', width: 70, align: 'right', renderer: moneyRenderer},
                        {header: 'Qté réappro', dataIndex: 'quantiteReappro', width: 80, align: 'right', renderer: moneyRenderer},
                        {header: 'Qté vendue', dataIndex: 'quantiteVendue', width: 80, align: 'right',
                            renderer: function (v) {
                                const cmp = me.down('#comboType');
                                const t = (cmp && cmp.getValue()) || 'QTY';
                                // QTY -> rouge, CA -> vert, MARGE -> bleu
                                const c = (t === 'MARGE') ? '#0000ff' : (t === 'CA') ? '#1a7e1a' : '#d10000';
                                return '<span style="color:' + c + ';font-weight:bold">' + Ext.util.Format.number(v, '0,000.') + '</span>';
                            }},
                        {header: "Chiffre d'Affaires", dataIndex: 'chiffreAffaires', flex: 1, align: 'right',
                            renderer: function (v, meta, rec) {
                                const ca = v || 0;
                                const qte = rec.get('quantiteVendue') || 0;
                                const pu = qte ? Math.round(ca / qte) : 0;
                                const html = "<span style='color:#0000ff'>"
                                        + "Chiffre d'affaires = total des ventes du produit sur la periode.<br>"
                                        + "Calcul : quantite vendue (" + nf(qte) + ") x prix de vente (~" + nf(pu) + ").<br>"
                                        + "Resultat : <span style='color:red;font-weight:bold'>" + nf(ca) + " F.CFA</span></span>";
                                meta.tdAttr = 'data-abctip="' + html + '"';
                                return nf(ca);
                            }},
                        {header: 'Marge', dataIndex: 'marge', flex: 1, align: 'right',
                            renderer: function (v, meta) {
                                const marge = v || 0;
                                const html = "<span style='color:#0000ff'>"
                                        + "Marge = benefice du produit sur la periode.<br>"
                                        + "Formule : (prix de vente - remise - TVA) - (prix d'achat x quantite), cumule.<br>"
                                        + "Resultat : <span style='color:red;font-weight:bold'>" + nf(marge) + " F.CFA</span></span>";
                                meta.tdAttr = 'data-abctip="' + html + '"';
                                return nf(marge);
                            }},
                        {header: 'Part %', dataIndex: 'partPourcentage', width: 70, align: 'right',
                            renderer: function (v, meta, rec, ri, ci, store) {
                                const val = Ext.util.Format.number(v, '0.00');
                                const mi = metricInfo(store);
                                const valProd = nf(rec.get(mi.field));
                                const totalTxt = mi.total ? (' (' + nf(mi.total) + ')') : '';
                                const html = "<span style='color:#0000ff'>"
                                        + "Part % = poids de ce produit dans le total de la periode (" + mi.label + ").<br>"
                                        + "Calcul : " + mi.label + " du produit (" + valProd + ") divise par le total"
                                        + totalTxt + " puis x 100.<br>"
                                        + "Resultat : <span style='color:red;font-weight:bold'>" + val + " %</span></span>";
                                meta.tdAttr = 'data-abctip="' + html + '"';
                                return '<span style="color:#000000;font-weight:bold">' + val + '</span>';
                            }},
                        {header: 'Cumul %', dataIndex: 'cumulPourcentage', width: 75, align: 'right',
                            renderer: function (v, meta, rec) {
                                const val = Ext.util.Format.number(v, '0.00');
                                const partNum = rec.get('partPourcentage') || 0;
                                const cumNum = rec.get('cumulPourcentage') || 0;
                                const part = Ext.util.Format.number(partNum, '0.00');
                                const prev = Ext.util.Format.number(cumNum - partNum, '0.00'); // cumul du produit precedent
                                const html = "<span style='color:#0000ff'>"
                                        + "Cumul % = somme des Part % en cumulant du plus gros au plus petit.<br>"
                                        + "Calcul : Part % de ce produit (" + part + " %) + Cumul % du produit precedent (" + prev + " %).<br>"
                                        + "Resultat : <span style='color:red;font-weight:bold'>" + val + " %</span>.<br>"
                                        + "Sert a placer le produit en classe A, B ou C selon les bornes."
                                        + "</span>";
                                meta.tdAttr = 'data-abctip="' + html + '"';
                                return '<span style="color:#191970;font-weight:bold">' + val + '</span>';
                            }},
                        {header: 'Q1', dataIndex: 'q1', width: 45, align: 'right', hidden: true},
                        {header: 'Q2', dataIndex: 'q2', width: 45, align: 'right', hidden: true},
                        {header: 'Q3', dataIndex: 'q3', width: 45, align: 'right', hidden: true},
                        {header: 'Unité', dataIndex: 'uniteCalcul', width: 80, hidden: true},
                        {
                            xtype: 'actioncolumn', header: 'Détail', width: 55, align: 'center',
                            sortable: false, menuDisabled: true,
                            items: [{
                                iconCls: 'charticon',
                                tooltip: 'Détail consommation mensuelle (M à M-6)',
                                handler: function (view, rowIndex) {
                                    const rec = me.gridStore.getAt(rowIndex);
                                    if (rec) {
                                        me.showProduitDetail(rec);
                                    }
                                }
                            }]
                        }
                    ],
                    selModel: {selType: 'cellmodel'},
                    bbar: {xtype: 'pagingtoolbar', store: data, dock: 'bottom', displayInfo: true},
                    listeners: {
                        afterrender: function (grid) {
                            const view = grid.getView();
                            grid._abcTip = Ext.create('Ext.tip.ToolTip', {
                                target: view.getEl(),
                                delegate: 'td[data-abctip]',
                                dismissDelay: 0,   // reste affiche jusqu'a la sortie de la souris
                                trackMouse: false,
                                anchorToTarget: true,
                                listeners: {
                                    beforeshow: function (tip) {
                                        const el = tip.triggerElement;
                                        const html = el ? el.getAttribute('data-abctip') : null;
                                        if (!html) {
                                            return false;
                                        }
                                        tip.update(html);
                                    }
                                }
                            });
                        }
                    }
                }
            ]
        });

        me.callParent(arguments);
    },

    updateSummary: function (store) {
        const me = this;
        const lbl = me.down('#summaryLabel');
        if (!lbl) {
            return;
        }
        let summary = null;
        try {
            // Le JSON complet (avec "summary") est conserve par le reader du store.
            const reader = store && store.getProxy ? store.getProxy().getReader() : null;
            const raw = reader ? (reader.rawData || reader.jsonData) : null;
            summary = raw ? raw.summary : null;
        } catch (e) {
            summary = null;
        }
        if (!summary) {
            lbl.setText('A: -, B: -, C: -');
            return;
        }
        const fmt = function (c) {
            const colorMap = {A: '#1a7e1a', B: '#e67e00', C: '#d10000'};
            const s = summary[c] || {};
            const nb = s.nbProduits || 0;
            const ca = Ext.util.Format.number(s.chiffreAffaires || 0, '0,000.');
            return '<span style="color:' + colorMap[c] + ';font-weight:bold">Classe ' + c + ':</span> '
                    + '<span style="color:#8B4513;font-weight:bold">' + nb + '</span> -&gt; '
                    + '<span style="color:#0000ff;font-weight:bold">CA ' + ca + ' F.CFA</span>';
        };
        const sumField = function (f) {
            return ((summary.A && summary.A[f]) || 0) + ((summary.B && summary.B[f]) || 0)
                    + ((summary.C && summary.C[f]) || 0);
        };
        const totalNb = sumField('nbProduits');
        const totalCa = Ext.util.Format.number(sumField('chiffreAffaires'), '0,000.');
        const totalTxt = ' <span style="color:#222;font-weight:bold">( ' + totalNb
                + ' produits -&gt; CA Total = ' + totalCa + ' F.CFA )</span>';
        lbl.setText(fmt('A') + '  |  ' + fmt('B') + '  |  ' + fmt('C') + totalTxt);
    },

    showProduitDetail: function (rec) {
        const produitId = rec.get('produitId');
        const cip = rec.get('cip');
        const libelle = rec.get('libelle');
        const title = 'Consommation mensuelle - ' + (cip ? '[' + cip + '] ' : '') + libelle;

        const mask = Ext.MessageBox.wait('Chargement de la consommation...', 'Veuillez patienter');
        Ext.Ajax.request({
            url: '../api/v1/articles/abc/produit/conso',
            method: 'GET',
            params: {produitId: produitId, months: 7},
            success: function (response) {
                mask.hide();
                const r = Ext.JSON.decode(response.responseText, true) || {};
                const arr = r.data || [];
                const moneyR = function (v) { return Ext.util.Format.number(v, '0,000.'); };

                const fields = [];
                const columns = [];
                const recData = {};
                let totalWidth = 0;
                Ext.each(arr, function (item, i) {
                    const fname = 'm' + i;
                    const header = item.mois || ('M-' + i);
                    const w = Math.max(70, header.length * 9 + 24); // largeur proportionnelle au nom du mois
                    fields.push({name: fname, type: 'number'});
                    recData[fname] = item.conso;
                    totalWidth += w;
                    columns.push({header: header, dataIndex: fname, width: w, align: 'right', renderer: moneyR});
                });
                // Colonne Total en rouge
                fields.push({name: 'total', type: 'number'});
                recData.total = (r.total != null) ? r.total : 0;
                totalWidth += 100;
                columns.push({
                    header: 'Total', dataIndex: 'total', width: 100, align: 'right',
                    renderer: function (v) {
                        return '<span style="color:red;font-weight:bold">' + moneyR(v) + '</span>';
                    }
                });

                const store = Ext.create('Ext.data.Store', {fields: fields, data: [recData]});
                Ext.create('Ext.window.Window', {
                    title: title, modal: true, autoShow: true, plain: true, layout: 'fit',
                    width: Math.min(960, totalWidth + 40), height: 150,
                    items: [{
                        xtype: 'gridpanel', store: store, disableSelection: true,
                        viewConfig: {columnLines: true}, columns: columns
                    }],
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
