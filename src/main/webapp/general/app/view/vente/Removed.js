/* global Ext */

Ext.define('testextjs.view.vente.Removed', {
    extend: 'Ext.panel.Panel',
    xtype: 'venteannuler',
    requires: [
        'testextjs.view.vente.DetailProduitsVente'
    ],

    frame: true,
    title: 'Liste des Ventes annulées',
    iconCls: 'icon-grid',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    /* plan du 08/11, point 18 : deux onglets (liste, analyse par motif) */
    layout: {
        type: 'card'
    },
    initComponent: function () {

        var vente = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.caisse.Vente',
            autoLoad: false,
            pageSize: 15,

            proxy: {
                type: 'ajax',
                url: '../api/v1/ventestats/annulations',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'
                }

            }
        });

        var me = this;

        // Selection de ventes conservee a travers les pages et les filtres :
        // { lgPREENREGISTREMENTID: true }
        me.selectedVentes = {};
        var selModel = Ext.create('Ext.selection.CheckboxModel', {checkOnly: true});
        me.selModel_ = selModel;
        selModel.on('select', function (sm, rec) {
            me.selectedVentes[rec.get('lgPREENREGISTREMENTID')] = true;
            me.updateSelCounter();
        });
        selModel.on('deselect', function (sm, rec) {
            delete me.selectedVentes[rec.get('lgPREENREGISTREMENTID')];
            me.updateSelCounter();
        });
        vente.on('load', function () {
            me.reapplySelection();
        });

        Ext.applyIf(me, {
            dockedItems: [
                /* plan du 08/11, point 18 : onglets « Liste » et « Analyse par motif » (annulations et modifications) */
                {
                    xtype: 'toolbar', dock: 'top', itemId: 'ongletsAnnulees', cls: 'cec-onglets',
                    layout: {type: 'hbox', pack: 'start', align: 'middle'},
                    items: [
                        {xtype: 'button', itemId: 'ongletListe', text: 'Liste des ventes annulées', cls: 'cec-onglet', toggleGroup: 'va-onglets-' + me.id,
                            allowDepress: false, pressed: true, handler: function () {
                                me.afficherOnglet('liste');
                            }},
                        {xtype: 'button', itemId: 'ongletAnalyse', text: 'Analyse par motif', cls: 'cec-onglet', toggleGroup: 'va-onglets-' + me.id,
                            allowDepress: false, tooltip: 'Annulations et modifications de vente par motif et par auteur de la vente',
                            handler: function () {
                                me.afficherOnglet('analyse');
                            }}
                    ]
                },
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [

                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'dtStart',
                            height: 30,
                            labelWidth: 30,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        }, '-',
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            height: 30,
                            labelWidth: 30,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        }, '-',
                        {
                            xtype: 'textfield',
                            itemId: 'query',
                            flex: 1,
                            height: 30,
                            enableKeyEvents: true,
                            emptyText: 'Recherche'
                        }, '-',

                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        }, '-',
                        {
                            text: 'Imprimer',
                            tooltip: 'imprimer',
                            itemId: 'printPdf',
                            scope: this,
                            iconCls: 'printable'
                        },
                         '-',
                        {
                            text: 'Imprimer +',
                            tooltip: 'imprimer +',
                            itemId: 'printPlus',
                            scope: this,
                            iconCls: 'printable'
                        }
                    ]
                },
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            text: 'Tout selectionner (toutes les pages)',
                            scope: this,
                            handler: this.selectAllPages
                        }, {
                            text: 'Tout deselectionner',
                            scope: this,
                            handler: this.deselectAllVentes
                        }, {
                            text: 'Creer inventaire',
                            iconCls: 'addicon',
                            tooltip: 'Creer un inventaire avec les produits des ventes annulees selectionnees',
                            scope: this,
                            handler: this.onCreateInventaire
                        }, '->', {
                            xtype: 'tbtext', itemId: 'selCount', text: 'Selectionnees : 0'
                        }
                    ]
                }

            ],
            items: [
                {
                    xtype: 'gridpanel',

                    store: vente,
                    selModel: selModel,

                    viewConfig: {
                        forceFit: true,
                        columnLines: true,
                        collapsible: true,
                        animCollapse: false,
                        enableColumnHide: false

                    },
                    columns: [
                        {
                            header: 'Reference',
                            dataIndex: 'strREF',
                            sortable: false,
                            menuDisabled: true,
                            flex: 0.8
                        },
                        {
                            header: 'Type.Vente',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'strTYPEVENTE',
                            flex: 0.5
                        }

                        , {
                            header: 'Montant',
                            xtype: 'numbercolumn',
                            dataIndex: 'intPRICE',
                            flex: 0.8,
                            align: 'right',
                            sortable: false,
                            menuDisabled: true,
                            format: '0,000.'

                        },
                        {
                            header: 'Date.vente',
                            dataIndex: 'dtCREATED',
                            flex: 0.6,
                            sortable: false,
                            menuDisabled: true,
                            align: 'center'
                        }, {
                            header: 'Heure.vente',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'HEUREVENTE',
                            flex: 0.6,
                            align: 'center'
                        }
                        ,

                        {
                            header: 'Date.Ann',
                            dataIndex: 'dateAnnulation',
                            flex: 0.6,
                            sortable: false,
                            menuDisabled: true,
                            align: 'center'
                        }, {
                            header: 'Heure.Ann',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'heureAnnulation',
                            flex: 0.6,
                            align: 'center'
                        },

                        {
                            header: 'Opérateur',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'userFullName',
                            flex: 1
                        }

                        , {
                            header: 'Vendeur',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'userVendeurName',
                            flex: 1
                        }, {
                            header: 'Caissier',
                            sortable: false,
                            menuDisabled: true,
                            dataIndex: 'userCaissierName',
                            flex: 1
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    // « action » distingue les deux icones : la colonne emet un
                                    // seul evenement « click » pour toutes, et sans ce marqueur
                                    // ouvrir le detail declencherait une impression de ticket.
                                    action: 'imprimer',
                                    icon: 'resources/images/icons/fam/printer.png',
                                    tooltip: 'Réimprimer le ticket',
                                    scope: me
                                }, {
                                    action: 'detail',
                                    icon: 'resources/images/icons/fam/application_view_list.png',
                                    tooltip: 'Voir le détail des produits',
                                    scope: me
                                }]
                        }

                    ],
                    bbar: {
                        xtype: 'toolbar',
                        dock: 'bottom',
                        items: [{
                                xtype: 'pagingtoolbar',
                                store: vente,
                                dock: 'bottom',
                                pageSize: 16,
                                flex: 1.3,
                                displayInfo: true
                            }
                            , {
                                xtype: 'tbseparator'
                            },
                            {
                                xtype: 'displayfield',
                                flex: 0.7,
                                fieldLabel: 'Total annulation::',
                                labelWidth: 120,
                                itemId: 'totalAmount',
                                renderer: function (v) {
                                    return Ext.util.Format.number(v, '0,000.');
                                },
                                fieldStyle: "color:blue;font-weight:800;",
                                value: 0
                            }
                        ]
                    }
                }
                ,
                {
                    xtype: 'panel', itemId: 'analyseMotifs', autoScroll: true, bodyPadding: 10, border: false,
                    dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                                {xtype: 'combobox', itemId: 'analyseType', fieldLabel: 'Opérations', labelWidth: 70, width: 290, editable: false,
                                    queryMode: 'local', valueField: 'v', displayField: 't', value: '',
                                    store: {fields: ['v', 't'], data: [{v: '', t: 'Annulations et modifications'},
                                            {v: 'ANNULATION', t: 'Annulations seulement'}, {v: 'MODIFICATION', t: 'Modifications seulement'}]},
                                    listeners: {select: function () {
                                            me.chargerAnalyse();
                                        }}},
                                {xtype: 'tbtext', itemId: 'analyseAide', text: 'Période : celle du haut de l\'écran (bouton « rechercher »).'}
                            ]}],
                    html: ''
                }
]
        });
        me.callParent(arguments);
        /* plan du 08/11, point 18 : « rechercher » recharge aussi l'analyse quand son onglet est ouvert */
        me.down('#rechercher').on('click', function () {
            if (me.getLayout().getActiveItem() === me.down('#analyseMotifs')) {
                me.chargerAnalyse();
            }
        });
        if (!Ext.util.CSS.getRule('.va-analyse')) {
            Ext.util.CSS.createStyleSheet(
                    '.va-analyse-titre{margin:14px 0 6px;font-size:14px;color:#1a3d6d}'
                    + '.va-analyse{border-collapse:collapse;width:100%;max-width:1100px;font-size:12px;margin-bottom:8px}'
                    + '.va-analyse th{background:#e8eef7;color:#1a3d6d;text-align:left;padding:5px 8px;border:1px solid #d0d7e2}'
                    + '.va-analyse td{padding:4px 8px;border:1px solid #e1e6ee}'
                    + '.va-analyse .n{text-align:right;white-space:nowrap}'
                    + '.va-analyse tfoot th{background:#f3f6fa}'
                    + '.va-analyse-vide{color:#64748b;font-style:italic;padding:8px}', 'va-analyse-styles');
        }
    },
    /* plan du 08/11, point 18 : onglets de l'ecran */
    afficherOnglet: function (cle) {
        var me = this, analyse = me.down('#analyseMotifs');
        me.down('#ongletListe').toggle(cle !== 'analyse', true);
        me.down('#ongletAnalyse').toggle(cle === 'analyse', true);
        me.getLayout().setActiveItem(cle === 'analyse' ? analyse : me.down('gridpanel'));
        if (cle === 'analyse') {
            me.chargerAnalyse();
        }
    },

    /* plan du 08/11, point 18 : recapitulatif par motif, par auteur de la vente d'origine, et detail */
    chargerAnalyse: function () {
        var me = this, panneau = me.down('#analyseMotifs'), d = me.down('#dtStart').getSubmitValue(),
                f = me.down('#dtEnd').getSubmitValue(), type = me.down('#analyseType').getValue() || '';
        panneau.update('<div class="va-analyse-chargement">Chargement…</div>');
        Ext.Ajax.request({
            url: '../api/v1/vente-motifs/recap', method: 'GET', params: {dtStart: d, dtEnd: f, type: type},
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                panneau.update(o.success ? me.htmlAnalyse(o) : '<div class="va-analyse-vide">' + Ext.String.htmlEncode(o.msg || 'Analyse indisponible.') + '</div>');
            },
            failure: function () {
                panneau.update('<div class="va-analyse-vide">Analyse indisponible : réessayer.</div>');
            }
        });
    },

    htmlAnalyse: function (o) {
        var e = Ext.String.htmlEncode, t = o.total || {};
        var n = function (v) {
            return String(Math.round(v || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        };
        var pct = function (v) {
            return t.nb ? (Math.round(v * 1000 / t.nb) / 10) + ' %' : '0 %';
        };
        var tableau = function (titre, classe, entetes, lignes, pied) {
            return '<h3 class="va-analyse-titre">' + titre + '</h3><table class="va-analyse ' + classe + '"><thead><tr>'
                    + entetes.map(function (h) {
                        return '<th>' + h + '</th>';
                    }).join('') + '</tr></thead><tbody>' + (lignes.length ? lignes.join('')
                    : '<tr><td colspan="' + entetes.length + '" class="va-analyse-vide">Aucune annulation ni modification avec motif sur la période.</td></tr>')
                    + '</tbody>' + (pied || '') + '</table>';
        };
        var ligneTotal = function (x, nom) {
            return '<tr><td>' + e(nom) + '</td><td class="n">' + n(x.annulations) + '</td><td class="n">' + n(x.modifications)
                    + '</td><td class="n"><b>' + n(x.nb) + '</b></td><td class="n">' + pct(x.nb) + '</td><td class="n">' + n(x.montant) + '</td></tr>';
        };
        var pied = '<tfoot><tr><th>Total</th><th class="n">' + n(t.annulations) + '</th><th class="n">' + n(t.modifications)
                + '</th><th class="n">' + n(t.nb) + '</th><th class="n">' + (t.nb ? '100 %' : '0 %') + '</th><th class="n">' + n(t.montant) + '</th></tr></tfoot>';
        var motifs = (o.parMotif || []).map(function (m) {
            return ligneTotal(m, m.motif);
        });
        var auteurs = (o.parAuteur || []).map(function (a) {
            return ligneTotal(a, a.auteur);
        });
        var detail = (o.detail || []).map(function (x) {
            return '<tr><td>' + e(x.date) + '</td><td>' + e(x.type) + '</td><td>' + e(x.ref) + '</td><td class="n">' + n(x.montant)
                    + '</td><td>' + e(x.motif) + '</td><td>' + e(x.commentaire) + '</td><td>' + e(x.auteur) + '</td><td>' + e(x.operateur) + '</td></tr>';
        });
        var entetes = ['Annulations', 'Modifications', 'Total', 'Part', 'Montant'];
        return '<div class="va-analyse-bloc">'
                + tableau('Par motif', 'va-par-motif', ['Motif'].concat(entetes), motifs, pied)
                + tableau('Par auteur de la vente d\'origine', 'va-par-auteur', ['Auteur de la vente'].concat(entetes), auteurs, pied)
                + tableau('Détail', 'va-detail', ['Date', 'Opération', 'Référence', 'Montant', 'Motif', 'Précision', 'Auteur de la vente', 'Fait par'], detail)
                + '</div>';
    },

    getGridStore: function () {
        return this.down('gridpanel').getStore();
    },
    getActiveFilters: function () {
        var me = this;
        return {
            dtStart: me.down('#dtStart').getSubmitValue() || '',
            dtEnd: me.down('#dtEnd').getSubmitValue() || '',
            query: me.down('#query').getValue() || ''
        };
    },
    updateSelCounter: function () {
        var me = this, n = 0, k;
        for (k in me.selectedVentes) {
            if (me.selectedVentes.hasOwnProperty(k)) {
                n++;
            }
        }
        var cmp = me.down('#selCount');
        if (cmp) {
            cmp.setText('Selectionnees : ' + n);
        }
    },
    // Re-coche les lignes de la page courante presentes dans la selection
    reapplySelection: function () {
        var me = this, selModel = me.selModel_;
        selModel.suspendEvents();
        selModel.deselectAll();
        me.getGridStore().each(function (rec) {
            if (me.selectedVentes[rec.get('lgPREENREGISTREMENTID')]) {
                selModel.select(rec, true, true);
            }
        });
        selModel.resumeEvents();
        me.updateSelCounter();
    },
    // Selectionne l'ensemble des ventes annulees correspondant aux filtres actifs
    selectAllPages: function () {
        var me = this, filters = me.getActiveFilters();
        var prog = Ext.MessageBox.wait('Chargement...', 'Selection de toutes les ventes');
        Ext.Ajax.request({
            url: '../api/v1/ventestats/annulations',
            method: 'GET',
            params: Ext.apply({start: 0, limit: 100000}, filters),
            timeout: 600000,
            success: function (response) {
                prog.hide();
                var res = Ext.JSON.decode(response.responseText, true);
                var list = (res && res.data) ? res.data : [];
                Ext.each(list, function (v) {
                    if (v.lgPREENREGISTREMENTID) {
                        me.selectedVentes[v.lgPREENREGISTREMENTID] = true;
                    }
                });
                me.reapplySelection();
            },
            failure: function () {
                prog.hide();
                Ext.MessageBox.alert('Erreur', 'Echec du chargement de la liste complete.');
            }
        });
    },
    deselectAllVentes: function () {
        var me = this;
        me.selectedVentes = {};
        me.selModel_.deselectAll();
        me.updateSelCounter();
    },
    onCreateInventaire: function () {
        var me = this, ids = [], k;
        for (k in me.selectedVentes) {
            if (me.selectedVentes.hasOwnProperty(k)) {
                ids.push(k);
            }
        }
        if (ids.length === 0) {
            Ext.MessageBox.alert('Message',
                    'Veuillez selectionner au moins une vente (bouton "Tout selectionner" pour tout inclure).');
            return;
        }
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Controle des produits');
        Ext.Ajax.request({
            url: '../api/v1/inventaire/produit-annules/selection/count',
            method: 'POST',
            jsonData: {ids: ids},
            timeout: 600000,
            success: function (resp) {
                progress.hide();
                var r = Ext.JSON.decode(resp.responseText, true);
                var count = (r && r.count) ? r.count : 0;
                if (count === 0) {
                    Ext.MessageBox.alert('Message', 'Aucun produit dans les ventes selectionnees.');
                    return;
                }
                Ext.MessageBox.confirm('Confirmation',
                        'Vous allez creer un inventaire contenant <b>' + count
                        + '</b> produit(s) distinct(s) de <b>' + ids.length
                        + '</b> vente(s) annulee(s) selectionnee(s) (toutes pages confondues).<br/>Confirmez-vous ?',
                        function (btn) {
                            if (btn !== 'yes') {
                                return;
                            }
                            var prog = Ext.MessageBox.wait('Veuillez patienter...', 'Creation de l\'inventaire');
                            Ext.Ajax.request({
                                url: '../api/v1/inventaire/produit-annules/selection',
                                method: 'POST',
                                jsonData: {ids: ids},
                                timeout: 600000,
                                success: function (response) {
                                    prog.hide();
                                    var res = Ext.JSON.decode(response.responseText, true);
                                    if (res && res.success) {
                                        Ext.MessageBox.alert('Inventaire',
                                                'Inventaire cree.<br/>Produits en compte : <b>' + (res.count || 0) + '</b>');
                                    } else {
                                        Ext.MessageBox.alert('Erreur',
                                                (res && res.message) ? res.message : "La creation de l'inventaire a echoue.");
                                    }
                                },
                                failure: function () {
                                    prog.hide();
                                    Ext.MessageBox.alert('Erreur',
                                            "La creation de l'inventaire a echoue. Aucun inventaire partiel n'a ete cree.");
                                }
                            });
                        });
            },
            failure: function () {
                progress.hide();
                Ext.MessageBox.alert('Erreur', 'Le controle du nombre de produits a echoue.');
            }
        });
    }
});


