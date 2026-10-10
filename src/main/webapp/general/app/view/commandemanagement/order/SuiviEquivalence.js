/* global Ext */

/*
 * SUIVI EQUIVALENCE (plan d'octobre, section 9) — retours du 10/10 : deplace d'Analyse article vers Commandes en cours,
 * entre Alertes et Tableau de bord. Memes colonnes, memes filtres, meme API (v1/suivi-equivalence) ; l'ecran porte sa
 * propre periode (il ne suit plus celle de l'analyse article) et ses propres gestionnaires.
 *  - groupes : produits actifs ayant exactement les memes DCI, du plus vendu au moins vendu ;
 *  - « a ne plus commander » : equivalent DIRECT vendu moins que le seuil (% du meneur).
 */
Ext.define('testextjs.view.commandemanagement.order.SuiviEquivalence', {
    extend: 'Ext.panel.Panel',
    xtype: 'suiviequivalence',
    layout: 'fit',
    border: false,
    cls: 'eq-ecran',

    initComponent: function () {
        var me = this;
        me.equivalenceStore = Ext.create('Ext.data.Store', {
            fields: ['groupe', 'groupeLibelle', {name: 'ordreGroupe', type: 'int'}, 'dci', 'produitId', 'cip', 'libelle',
                {name: 'rang', type: 'int'}, 'equivalence', 'equivalenceLibelle', 'raison', {name: 'candidat', type: 'boolean'},
                {name: 'quantite', type: 'int'}, {name: 'part', type: 'float'}, {name: 'montant', type: 'int'},
                {name: 'marge', type: 'int'}, {name: 'stock', type: 'int'}, {name: 'couverture', type: 'float'},
                {name: 'valeurStock', type: 'int'}, 'derniereVente'],
            /* Les groupes dans l'ordre du serveur (doublons d'abord), les produits par rang. */
            groupField: 'ordreGroupe',
            sorters: [{property: 'rang', direction: 'ASC'}],
            /* La pagination compte des GROUPES : un groupe n'est jamais coupe entre deux pages. */
            pageSize: 25,
            proxy: {
                type: 'ajax',
                url: '../api/v1/suivi-equivalence',
                timeout: 600000,
                extraParams: {typePeriode: 'TROIS_MOIS', minProduits: 2, seuil: 20},
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });
        me.items = [me.configGrille()];
        me.callParent(arguments);
        var differe = function (c) {
            c.on('change', me.charger, me, {buffer: 700});
        };
        Ext.each(['#eqDci', '#eqMinProduits', '#eqSeuil'], function (s) {
            differe(me.down(s));
        });
        Ext.each(['#eqStock', '#eqCandidats'], function (s) {
            me.down(s).on('change', me.charger, me);
        });
        me.down('#typePeriode').on('select', me.charger, me);
        me.down('#eqActualiser').on('click', me.charger, me);
        me.down('#eqExcel').on('click', function () {
            window.open('../api/v1/suivi-equivalence/excel?' + Ext.Object.toQueryString(me.criteres()));
        });
        me.down('#eqImprimer').on('click', function () {
            window.open('../api/v1/suivi-equivalence/pdf?' + Ext.Object.toQueryString(me.criteres()));
        });
        me.on('afterrender', me.charger, me, {single: true});
    },

    choixPeriodes: function () {
        return (window.PrestigeAnalyse && window.PrestigeAnalyse.CHOIX) || [
            {id: 'TROIS_SEMAINES', libelle: '3 dernières semaines'}, {id: 'TROIS_MOIS', libelle: '3 derniers mois'},
            {id: 'SIX_MOIS', libelle: '6 derniers mois'}, {id: 'TROIS_ANS', libelle: '3 dernières années'}];
    },

    criteres: function () {
        var me = this;
        return {
            typePeriode: me.down('#typePeriode').getValue() || 'TROIS_MOIS',
            dci: me.down('#eqDci').getValue() || '',
            minProduits: me.down('#eqMinProduits').getValue() || 2,
            stockPositif: !!me.down('#eqStock').getValue(),
            seulementCandidats: !!me.down('#eqCandidats').getValue(),
            seuil: me.down('#eqSeuil').getValue() || 20
        };
    },

    charger: function () {
        var me = this, onglet = me.down('#ongletEquivalence'), store = me.equivalenceStore;
        if (me.isDestroyed) {
            return;
        }
        store.getProxy().extraParams = me.criteres();
        if (onglet.rendered) {
            onglet.setLoading('Regroupement des équivalents...');
        }
        store.loadPage(1, {
            callback: function () {
                if (onglet.isDestroyed) {
                    return;
                }
                onglet.setLoading(false);
                var brut = store.getProxy().getReader().rawData || {}, resume = onglet.down('#eqResume');
                if (resume) {
                    resume.setText(brut.success === false ? '<span style="color:#a00">' + Ext.String.htmlEncode(brut.msg || '') + '</span>'
                            : '<b>' + (brut.total || 0) + '</b> groupe(s) · <b style="color:#b42318">' + (brut.candidats || 0)
                            + '</b> produit(s) à ne plus commander');
                }
            }
        });
    },

    configGrille: function () {
        var me = this;
        var n = function (v) {
            return Ext.util.Format.number(v || 0, '0,000');
        };
        var enc = Ext.String.htmlEncode;
        return {
            header: false,
            itemId: 'ongletEquivalence',
            xtype: 'gridpanel',
            store: me.equivalenceStore,
            features: [Ext.create('Ext.grid.feature.Grouping', {
                    groupHeaderTpl: Ext.create('Ext.XTemplate', '{[this.libelle(values)]}', {
                        libelle: function (v) {
                            var lignes = v.children || v.rows || [];
                            var r = lignes[0];
                            return r && r.get ? enc(r.get('groupeLibelle')) : enc(String(v.name));
                        }
                    }),
                    hideGroupedHeader: true,
                    enableGroupingMenu: false,
                    startCollapsed: false
                })],
            viewConfig: {
                columnLines: true,
                deferEmptyText: false,
                emptyText: '<div style="padding:12px">Aucun groupe d\'équivalents ne correspond aux critères.</div>'
            },
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [{
                            /* retours du 10/10 : l'onglet a quitte Analyse article, il porte sa propre periode */
                            xtype: 'combobox', itemId: 'typePeriode', fieldLabel: 'Période', labelWidth: 50, width: 230,
                            editable: false, queryMode: 'local', valueField: 'id', displayField: 'libelle', value: 'TROIS_MOIS',
                            store: Ext.create('Ext.data.Store', {fields: ['id', 'libelle'], data: Ext.Array.filter(me.choixPeriodes(), function (c) {
                                    return c.id !== 'LIBRE';
                                })})
                        }, {
                            xtype: 'textfield', itemId: 'eqDci', fieldLabel: 'DCI', labelWidth: 30, width: 220,
                            emptyText: 'nom de DCI (contient)', enableKeyEvents: true
                        }, {
                            xtype: 'numberfield', itemId: 'eqMinProduits', fieldLabel: 'Groupes d\'au moins', labelWidth: 140,
                            width: 200, minValue: 2, maxValue: 50, allowDecimals: false, value: 2,
                            tooltip: 'Nombre minimum de produits équivalents dans un groupe'
                        }, {
                            xtype: 'displayfield', value: 'produits', margin: '0 10 0 4'
                        }, {
                            xtype: 'checkbox', itemId: 'eqStock', boxLabel: 'En stock seulement', margin: '0 10 0 0'
                        }]
                }, {
                    /* retours du 07/10 : seconde ligne, la barre unique debordait de 500 px a 1366 px de large */
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [{
                            xtype: 'numberfield', itemId: 'eqSeuil', fieldLabel: 'Doublon si vendu &lt;', labelWidth: 140,
                            width: 195, minValue: 1, maxValue: 100, allowDecimals: false, value: 20
                        }, {
                            xtype: 'displayfield', value: '% du meneur', margin: '0 8 0 4'
                        }, {
                            xtype: 'checkbox', itemId: 'eqCandidats', boxLabel: 'Groupes avec doublons seulement', margin: '0 8 0 0'
                        }, {
                            xtype: 'tbtext', itemId: 'eqExplication',
                            text: '<span style="color:#5A6B80" data-qtip="'
                                    + '<b>Groupe</b> : les produits actifs qui ont exactement les mêmes DCI.<br>'
                                    + '<b>Meneur</b> : le plus vendu du groupe sur la période (quantité, puis chiffre d\'affaires).<br>'
                                    + '<b>Direct</b> : même dosage et même forme que le meneur ; <b>À adapter</b> : dosage ou forme différents.<br>'
                                    + '<b>À ne plus commander</b> : un équivalent DIRECT du meneur vendu moins que le pourcentage choisi '
                                    + 'des ventes du meneur. Un produit « à adapter » n\'est jamais repéré : il répond à un autre besoin.">ⓘ Comment lire</span>'
                        }, {
                            text: 'Actualiser', itemId: 'eqActualiser', iconCls: 'x-tbar-loading'
                        }, '->', {
                            xtype: 'tbtext', itemId: 'eqResume', text: ''
                        }, {
                            text: 'Exporter Excel', itemId: 'eqExcel', iconCls: 'export_excel_icon'
                        }, {
                            text: 'Imprimer', itemId: 'eqImprimer', iconCls: 'printable'
                        }]
                }, {
                    xtype: 'pagingtoolbar', dock: 'bottom', store: me.equivalenceStore, displayInfo: true,
                    displayMsg: 'Groupes {0} - {1} sur {2}', emptyMsg: 'Aucun groupe'
                }],
            columns: [
                {header: 'Rang', dataIndex: 'rang', width: 50, align: 'center'},
                {header: 'CIP', dataIndex: 'cip', width: 85},
                {
                    header: 'Produit', dataIndex: 'libelle', flex: 1, minWidth: 220,
                    renderer: function (v, meta) {
                        meta.tdAttr = 'data-qtip="' + enc(enc(v)) + '"';
                        return '<span style="white-space:nowrap">' + enc(v) + '</span>';
                    }
                },
                {
                    header: 'Équivalence', dataIndex: 'equivalence', width: 105,
                    tooltip: 'Situation du produit par rapport au meneur du groupe',
                    renderer: function (v, meta, r) {
                        var c = {meneur: ['#1e3a5f', '#e3edf7'], direct: ['#166534', '#e7f6ec'], adapter: ['#92400e', '#fdf0d5']}[v]
                                || ['#475467', '#eef1f5'];
                        meta.tdAttr = 'data-qtip="' + enc(enc(r.get('raison') || '')) + '"';
                        return '<span style="display:inline-block;padding:1px 8px;border-radius:10px;font-weight:bold;font-size:11px;color:'
                                + c[0] + ';background:' + c[1] + '">' + enc(r.get('equivalenceLibelle')) + '</span>';
                    }
                },
                {header: 'Qté', dataIndex: 'quantite', width: 60, align: 'right', tooltip: 'Quantité vendue sur la période',
                    renderer: n},
                {
                    header: 'Part %', dataIndex: 'part', width: 110, tooltip: 'Part des ventes du groupe (en quantité)',
                    renderer: function (v) {
                        return '<span style="display:inline-flex;align-items:center;gap:6px;width:100%">'
                                + '<span style="flex:1;height:7px;border-radius:4px;background:#e6edf4;overflow:hidden">'
                                + '<span style="display:block;height:100%;width:' + Math.min(100, v || 0) + '%;background:#2E75B6"></span></span>'
                                + '<span style="min-width:34px;text-align:right">' + Ext.util.Format.number(v || 0, '0.0') + '</span></span>';
                    }
                },
                {header: 'Chiffre', dataIndex: 'montant', width: 95, align: 'right', renderer: n,
                    tooltip: 'Montant TTC vendu sur la période'},
                {header: 'Marge', dataIndex: 'marge', width: 90, align: 'right', renderer: n},
                {header: 'Stock', dataIndex: 'stock', width: 60, align: 'right', renderer: n},
                {
                    header: 'Couv. (j)', dataIndex: 'couverture', width: 70, align: 'right',
                    tooltip: 'Jours de stock au rythme de vente de la période (∞ : aucune vente)',
                    renderer: function (v, meta, r) {
                        return r.get('stock') <= 0 ? '—' : (v < 0 ? '∞' : Ext.util.Format.number(v, '0.0'));
                    }
                },
                {header: 'Dernière vente', dataIndex: 'derniereVente', width: 100, align: 'center'},
                {
                    header: 'Repère', dataIndex: 'candidat', width: 160,
                    renderer: function (v, meta, r) {
                        if (!v) {
                            return '';
                        }
                        meta.tdAttr = 'data-qtip="' + enc(enc(r.get('raison') || '')) + '"';
                        return '<span class="eq-repere" style="display:inline-block;padding:1px 8px;border-radius:10px;font-weight:bold;'
                                + 'font-size:11px;color:#b42318;background:#fdecec;white-space:nowrap">À ne plus commander</span>';
                    }
                }
            ]
        };
    }
});
