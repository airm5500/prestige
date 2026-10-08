
/* global Ext */

Ext.define('testextjs.view.pharmaml.Rupturepharma', {
    extend: 'Ext.panel.Panel',
    xtype: 'rupturepharma',
    frame: true,
    title: 'LISTE DES RUPTURES',
    scrollable: true,
    width: '98%',
    minHeight: 500,
    cls: 'custompanel',
    /* 08/10 : la liste des ruptures, puis les equivalents proposes par les grossistes (point 5) */
    layout: {
        type: 'vbox',
        align: 'stretch'
    },
    initComponent: function () {
        var grossiste = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },

                        {name: 'libelle',
                            type: 'string'

                        }

                    ],
            autoLoad: false,
            pageSize: 9999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/common/grossiste',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });

        var store = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },
                        {name: 'libelleGrossiste',
                            type: 'string'

                        },

                        {name: 'reference',
                            type: 'string'

                        },
                        {name: 'prixAchat',
                            type: 'number'

                        },
                        {name: 'prixVente',
                            type: 'number'

                        },

                        {name: 'qty',
                            type: 'number'

                        },
                        {name: 'nbreProduit',
                            type: 'number'

                        },

                        {name: 'details',
                            type: 'string'

                        },
                        {name: 'grossisteId',
                            type: 'string'

                        },
                        {name: 'commandeDate',
                            type: 'string'

                        }

                    ],
            autoLoad: false,
            pageSize: 15,

            proxy: {
                type: 'ajax',
                url: '../api/v1/rupture',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        var me = this;
        Ext.applyIf(me, {
            dockedItems: [
                {xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'dtStart',
                            submitFormat: 'Y-m-d',
                            flex: 0.8,
                            labelWidth: 17,
                            maxValue: new Date(),
                            value: new Date(),
                            format: 'd/m/Y'

                        }, {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            labelWidth: 17,
                            flex: 1,
                            maxValue: new Date(),
                            value: new Date(),
                            margin: '0 9 0 0',
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y'

                        }
                        , {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'textfield',
                            itemId: 'query',
                            flex: 1,
                            emptyText: 'Taper pour rechercher',
                            enableKeyEvents: true
                        },
                        {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'combobox',
                            flex: 1,
                            margin: '0 5 0 0',
                            labelWidth: 5,
                            itemId: 'grossiste',
                            store: grossiste,
                            pageSize: 999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: false,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez un grossiste'
                        },
                        {
                            xtype: 'tbseparator'
                        },
                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        }

                        , {
                            xtype: 'tbseparator'
                        }, {
                            text: 'imprimer',
                            itemId: 'imprimer',
                            iconCls: 'printable',
                            tooltip: 'imprimer',
                            scope: this
                        }

                        , {
                            xtype: 'tbseparator'
                        },
                        {
                            text: 'Fussionner les ruptures',
                            iconCls: 'fusionicon',
                            itemId: 'fusion',
                            scope: this

                        }


                    ]
                }

            ],
            /* retours du 08/10 (7) : onglets « Ruptures » (liste + equivalents proposes) et « Substitutions » */
            items: [{
                    xtype: 'tabpanel',
                    itemId: 'ongletsRuptures',
                    flex: 1,
                    minHeight: 560,
                    plain: true,
                    items: [{
                            title: 'Ruptures',
                            itemId: 'ongletRuptures',
                            layout: {type: 'vbox', align: 'stretch'},
                            items: [
                {
                    xtype: 'gridpanel',
                    itemId: 'grilleRuptures',
                    flex: 1,
                    minHeight: 260,
                    /* retours du 08/10 (4) : la ligne cliquee choisit les equivalents affiches en dessous */
                    viewConfig: {
                        /* le RowExpander ignore getRowClass : la classe est posee sur la ligne apres chaque affichage */
                        listeners: {
                            refresh: function (v) {
                                var e = v.up('rupturepharma');
                                if (e) {
                                    e.marquerRuptureChoisie();
                                }
                            }
                        }
                    },
                    listeners: {
                        itemclick: function (view, rec, item, i, e) {
                            var cible = e && e.target, n;
                            for (n = cible; n && n !== item; n = n.parentNode) {
                                if (/(^|\s)(x-action-col-icon|x-grid-row-checker|x-grid-row-expander)(\s|$)/.test(n.className || '')) {
                                    return;
                                }
                            }
                            var ecran = view.up('rupturepharma');
                            ecran.filtrerEquivalents(rec);
                            ecran.marquerRuptureChoisie();
                        }
                    },
                    plugins: [{
                            ptype: 'rowexpander',
                            rowBodyTpl: new Ext.XTemplate(
                                    '<p>{details}</p>'

                                    )
                        }
                    ],
                    store: store,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },

                    columns: [
                        {
                            header: 'Référence',
                            dataIndex: 'reference',
                            flex: 1

                        },

                        {
                            header: 'Grossiste',
                            dataIndex: 'libelleGrossiste',
                            flex: 1.5
                        },
                        {
                            header: 'Nb.Produits',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            dataIndex: 'nbreProduit',
                            flex: 0.5
                        },
                        {
                            header: 'Montant.Achat',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            dataIndex: 'prixAchat',
                            flex: 1
                        },
                        {
                            /* retours du 08/10 : date et heure */
                            header: 'Date',
                            dataIndex: 'commandeDate',
                            itemId: 'colDateRupture',
                            width: 128

                        },

                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/order_tracking.png',
                                    tooltip: 'ENVOI PAR PHARMAML', 
                                            handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                            this.fireEvent('envoiPharmaML', view, rowIndex, colIndex, item, e, record, row);
                                            }

                                }]
                        },

                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/excel_csv.png',
                                    tooltip: 'Exporter CSV',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('exportCsv', view, rowIndex, colIndex, item, e, record, row);
                                    }

                                }]
                        },

                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/delete.png',
                                    tooltip: 'Supprimer',
                                    handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                        this.fireEvent('remove', view, rowIndex, colIndex, item, e, record, row);
                                    }

                                }]
                        }

                    ],
                    selModel: {
                        selType: 'checkboxmodel',
                        injectCheckbox: 'last',
                        pruneRemoved: false

                    },
                    dockedItems: [

                        {
                            xtype: 'pagingtoolbar',
                            store: store,
                            dock: 'bottom',
                            displayInfo: true,
                            pageSize: 15

                        }
                    ]

                },
                me.grilleEquivalents()
                            ]
                        }, me.ongletSubstitutions(), me.ongletAlertes(), me.ongletTableauBord()]
                }]

        });
        me.callParent(arguments);
        /* ouverture depuis une commande (pastille « a decider ») */
        me.on('afterrender', function () {
            /* retours du 08/10 (11) : ouverture sur un onglet (bandeau d'alertes de la liste des commandes) */
            var o = testextjs.view.pharmaml.Rupturepharma.ongletDemande;
            if (o) {
                testextjs.view.pharmaml.Rupturepharma.ongletDemande = null;
                me.ouvrirOnglet(o);
            }
        });
        var demandee = testextjs.view.pharmaml.Rupturepharma.referenceDemandee;
        if (demandee) {
            testextjs.view.pharmaml.Rupturepharma.referenceDemandee = null;
            me.ruptureChoisie = {id: null, reference: demandee};
        }
        /* la barre du haut (periode, grossiste, recherche) sert aussi a l'onglet Substitutions */
        me.on('afterrender', function () {
            var b = me.down('#rechercher');
            if (b) {
                b.on('click', function () {
                    if (me.down('#ongletsRuptures').getActiveTab() === me.down('#ongletSubstitutions')) {
                        me.chargerSubstitutions();
                    }
                });
            }
        });
    },

    /*
     * Retours du 08/10 (7) : historique des substitutions proposees ou livrees par les grossistes, avec qui a decide et
     * quand. Actions sur la ligne (sans fenetre de saisie) : annuler une acceptation tant que la rupture n'a pas ete
     * renvoyee ; retirer de la commande un produit deja livre (EL/RL) avant la reception. En dessous : les choix
     * memorises (decision automatique pour un couple de produits), supprimables.
     */
    ETATS_SUBST: {
        PROPOSE: ['À décider', '#b26a00', '#fff4e0'],
        ACCEPTE: ['Acceptée', '#17795f', '#e3f6ef'],
        REFUSE: ['Refusée', '#6b7b8c', '#eef2f6'],
        AJOUTE: ['Livrée (ajoutée)', '#1f5f9e', '#e4effa'],
        RETIRE: ['Retirée', '#b42318', '#fde7e6']
    },

    chargerSubstitutions: function () {
        var me = this, g = me.down('#grilleSubstitutions'), d1 = me.down('#dtStart'), d2 = me.down('#dtEnd'),
                gr = me.down('#grossiste'), q = me.down('#query'), st = g.getStore();
        st.getProxy().extraParams = {
            statut: me.down('#filtreEtatSubst').getValue() || '',
            du: d1 && d1.getValue() ? Ext.Date.format(d1.getValue(), 'Y-m-d') : '',
            au: d2 && d2.getValue() ? Ext.Date.format(d2.getValue(), 'Y-m-d') : '',
            grossiste: gr && gr.getValue() ? gr.getValue() : '',
            query: q && q.getValue() ? q.getValue() : ''
        };
        st.load();
        me.down('#grilleChoix').getStore().load();
    },

    actionSubstitution: function (rec, action) {
        var me = this, info = me.down('#infoSubstitution'), enc = Ext.String.htmlEncode;
        var url = action === 'choix' ? '../api/v1/pharma/substitutions/choix/supprimer?famille=' + encodeURIComponent(rec.get('familleId'))
                + '&code=' + encodeURIComponent(rec.get('codeRemplacant'))
                : '../api/v1/pharma/substitutions/' + encodeURIComponent(rec.get('id')) + '/' + action;
        var faire = function () {
            Ext.Ajax.request({
                method: 'POST', url: url,
                success: function (r) {
                    var o = Ext.decode(r.responseText, true) || {};
                    info.update('<span style="color:' + (o.success ? '#17795f' : '#b42318') + '">' + enc(o.msg || 'Opération impossible.') + '</span>');
                    me.chargerSubstitutions();
                    var eq = me.down('#grilleEquivalents');
                    if (eq) {
                        eq.getStore().reload();
                    }
                    var rup = me.down('#grilleRuptures');
                    if (rup) {
                        rup.getStore().reload();
                    }
                },
                failure: function () {
                    info.update('<span style="color:#b42318">Le serveur ne répond pas.</span>');
                }
            });
        };
        if (action === 'retirer') {
            /* suppression d'une ligne de commande : confirmation */
            Ext.MessageBox.confirm('Retirer de la commande', 'Retirer « ' + enc(rec.get('designationRemplacant')) + ' » de la commande '
                    + enc(rec.get('reference')) + ' ?<br>Le grossiste l\'a livré à la place de ' + enc(rec.get('produitOrigine')) + '.', function (b) {
                if (b === 'yes') {
                    faire();
                }
            });
        } else {
            faire();
        }
    },

    /*
     * Retours du 08/10 (11) : informations reglementaires urgentes et alertes commerciales recues par PharmaML (vidage).
     * Non lues d'abord ; la selection montre les instructions et les produits concernes avec le stock et les lots recus.
     * « J'ai pris connaissance » enregistre qui et quand (action sur la ligne, sans fenetre).
     */
    /*
     * Retours du 08/10 (11) : tableau de bord PharmaML. Tuiles cliquables (substitutions a decider, alertes),
     * activite et taux de service par grossiste, derniers echanges. Lecture seule.
     */
    chargerTableauBord: function () {
        var me = this, enc = Ext.String.htmlEncode;
        Ext.Ajax.request({
            url: '../api/v1/pharma/tableau-bord', method: 'GET',
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {}, t = me.down('#tuilesPml');
                if (!t || !o.success) {
                    return;
                }
                var duree = function (m) {
                    return m < 60 ? m + ' min' : m < 1440 ? Math.floor(m / 60) + ' h' : Math.floor(m / 1440) + ' j';
                };
                var tuile = function (cle, valeur, titre, sous, niveau, cible) {
                    return '<div class="pml-tuile ' + (niveau || '') + (cible ? ' cliquable' : '') + '" data-tuile="' + cle + '"' + (cible ? ' data-cible="' + cible + '"' : '')
                            + '><div class="pml-tuile-valeur">' + valeur + '</div><div class="pml-tuile-titre">' + titre + '</div><div class="pml-tuile-sous">' + (sous || '&nbsp;') + '</div></div>';
                };
                var html = '<div class="pml-tuiles">'
                        + tuile('attente', o.enAttente, 'Envois en attente de réponse', o.enAttente ? 'le plus ancien depuis ' + duree(o.attenteMinutes) : 'aucun', o.enAttente && o.attenteMinutes > 60 ? 'alerte' : '')
                        + tuile('refus', o.refus7j, 'Refus (7 jours)', o.orphelines ? o.orphelines + ' réponse(s) non rattachée(s)' : 'réponses toutes rattachées', o.refus7j || o.orphelines ? 'alerte' : 'ok')
                        + tuile('service', o.tauxService30j === null ? '—' : String(o.tauxService30j).replace('.', ',') + ' %', 'Taux de service (30 jours)',
                                o.qteCommandee30j ? o.qteLivree30j + ' livrées / ' + o.qteCommandee30j + ' commandées' : 'aucune réponse', o.tauxService30j !== null && o.tauxService30j < 90 ? 'alerte' : '')
                        + tuile('decider', o.aDecider, 'Substitutions à décider', o.aDecider ? 'cliquer pour décider' : 'rien à décider', o.aDecider ? 'alerte' : 'ok', o.aDecider ? 'ongletSubstitutions' : '')
                        + tuile('blv', o.blvAUtiliser, 'Bons de livraison valorisés à saisir', o.blvNonRattaches ? o.blvNonRattaches + ' non rattaché(s) à une commande' : 'repris à la saisie du bon', o.blvAUtiliser ? 'info' : '')
                        + tuile('alertes', o.alertesNonLues, 'Alertes non lues', o.alertesNonLues ? o.alertesReglementaires + ' réglementaire(s)' + (o.arretsImmediats ? ', ' + o.arretsImmediats + ' arrêt(s) immédiat(s)' : '') : 'aucune',
                                o.alertesReglementaires ? 'critique' : o.alertesNonLues ? 'alerte' : 'ok', o.alertesNonLues ? 'ongletAlertes' : '')
                        + '</div><div class="pml-tuiles-pied">' + o.commandesJour + ' commande(s) envoyée(s) par PharmaML aujourd\'hui · récupération automatique des réponses, bons de livraison et alertes</div>';
                t.update(html);
                Ext.each(t.getEl().query('[data-cible]'), function (d) {
                    Ext.get(d).on('click', function () {
                        var cible = d.getAttribute('data-cible');
                        if (cible === 'ongletSubstitutions') {
                            me.down('#filtreEtatSubst').setValue('PROPOSE');
                        }
                        me.ouvrirOnglet(cible);
                    });
                });
                me.down('#grillePmlGrossistes').getStore().loadData(o.grossistes || []);
                me.down('#grillePmlEvenements').getStore().loadData(o.evenements || []);
                me.majTitreAlertes(o.alertesNonLues || 0);
            }
        });
    },

    ongletTableauBord: function () {
        var me = this, enc = Ext.String.htmlEncode, STATUTS = {
            EN_ATTENTE: ['En attente', '#8a5a00', '#fdf0d2'], TRAITEE: ['Traitée', '#17795f', '#e3f6ef'], ERREUR: ['Refus', '#b42318', '#fde7e6'],
            ORPHELINE: ['Non rattachée', '#b26a00', '#fff4e0'], RATTACHEE: ['Rattachée', '#1f5f9e', '#e4effa']
        }, SOURCES = {COMMANDE: 'Commande', RUPTURE: 'Rupture renvoyée', SUIVI: 'Avancement', MESSAGE: 'Message'};
        var pastille = function (v) {
            var x = STATUTS[v] || [v, '#3b4a5a', '#eef2f6'];
            return '<span style="display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600;color:' + x[1] + ';background:' + x[2] + '">' + enc(x[0]) + '</span>';
        };
        var taux = function (v) {
            return v === null || v === undefined ? '<span style="color:#6b7b8c">—</span>' : '<span class="' + (v < 90 ? 'blv-ecart' : 'blv-ok') + '">' + String(v).replace('.', ',') + ' %</span>';
        };
        return {
            title: 'Tableau de bord',
            itemId: 'ongletTableauBord',
            layout: {type: 'vbox', align: 'stretch'},
            autoScroll: true,
            listeners: {
                activate: function () {
                    me.chargerTableauBord();
                }
            },
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [{
                            text: 'Actualiser', itemId: 'btnActualiserTdbPml', iconCls: 'refresh', handler: function () {
                                me.chargerTableauBord();
                            }
                        }, {
                            text: 'Récupérer maintenant', itemId: 'btnRecupererTdbPml', tooltip: 'Interroge les grossistes : réponses en attente, bons de livraison valorisés et alertes',
                            handler: function () {
                                testextjs.view.commandemanagement.order.EnvoiPharmaMl.recuperer(null, function () {
                                    me.chargerTableauBord();
                                });
                            }
                        }]}],
            items: [{xtype: 'component', itemId: 'tuilesPml', html: '', padding: '8 8 4 8'}, {
                    xtype: 'gridpanel', itemId: 'grillePmlGrossistes', cls: 'theme-liste', title: 'Par grossiste', height: 170, margin: '0 8 8 8',
                    store: Ext.create('Ext.data.Store', {fields: ['id', 'grossiste', 'derniere', 'envois30j', 'erreurs30j', 'enAttente', 'tauxService']}),
                    viewConfig: {emptyText: '<div style="padding:10px;color:#6b7b8c">Aucun grossiste n\'a de lien PharmaML.</div>', deferEmptyText: false},
                    columns: [
                        {header: 'Grossiste', dataIndex: 'grossiste', flex: 1, minWidth: 140},
                        {header: 'Dernier échange', dataIndex: 'derniere', width: 160},
                        {header: 'Envois 30 j', dataIndex: 'envois30j', width: 118, align: 'right'},
                        {header: 'Refus 30 j', dataIndex: 'erreurs30j', width: 112, align: 'right', renderer: function (v) {
                                return v > 0 ? '<span class="blv-ecart">' + v + '</span>' : v;
                            }},
                        {header: 'En attente', dataIndex: 'enAttente', width: 114, align: 'right'},
                        {header: 'Taux de service', dataIndex: 'tauxService', width: 140, align: 'right', renderer: taux}
                    ]
                }, {
                    xtype: 'gridpanel', itemId: 'grillePmlEvenements', cls: 'theme-liste', title: 'Derniers échanges', flex: 1, minHeight: 220, margin: '0 8 8 8',
                    store: Ext.create('Ext.data.Store', {fields: ['date', 'grossiste', 'source', 'statut', 'commande', 'detail']}),
                    viewConfig: {emptyText: '<div style="padding:10px;color:#6b7b8c">Aucun échange PharmaML.</div>', deferEmptyText: false},
                    columns: [
                        {header: 'Date', dataIndex: 'date', width: 125},
                        {header: 'Grossiste', dataIndex: 'grossiste', width: 120},
                        {header: 'Échange', dataIndex: 'source', width: 125, renderer: function (v) {
                                return enc(SOURCES[v] || v || '');
                            }},
                        {header: 'Commande', dataIndex: 'commande', width: 125},
                        {header: 'État', dataIndex: 'statut', width: 115, renderer: pastille},
                        {header: 'Détail', dataIndex: 'detail', flex: 1, minWidth: 160, renderer: function (v, m) {
                                m.tdAttr = 'data-qtip="' + enc(enc(v || '')) + '"';
                                return enc(v || '');
                            }}
                    ]
                }]
        };
    },

    ouvrirOnglet: function (itemId) {
        var onglets = this.down('#ongletsRuptures'), t = this.down('#' + itemId);
        if (onglets && t) {
            onglets.setActiveTab(t);
        }
    },

    chargerAlertes: function () {
        var me = this, g = me.down('#grilleAlertes'), f = me.down('#filtreAlertes');
        if (!g) {
            return;
        }
        Ext.Ajax.request({
            url: '../api/v1/pharma/alertes?nonLues=' + (f && f.getValue() === 'NON_LUES' ? 'true' : 'false'), method: 'GET',
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {}, sel = g.getSelectionModel().getSelection()[0], id = sel ? sel.get('id') : null;
                g.getStore().loadData(o.data || []);
                me.majTitreAlertes(o.nonLues || 0);
                var rec = id ? g.getStore().findRecord('id', id, 0, false, false, true) : g.getStore().getAt(0);
                if (rec) {
                    g.getSelectionModel().select(rec);
                } else {
                    me.detailAlerte(null);
                }
            }
        });
    },

    majTitreAlertes: function (n) {
        var t = this.down('#ongletAlertes');
        if (t && t.tab) {
            t.tab.setText(n > 0 ? 'Alertes <span class="alerte-pml-type">' + n + '</span>' : 'Alertes');
        }
    },

    detailAlerte: function (rec) {
        var me = this, enc = Ext.String.htmlEncode, d = me.down('#detailAlerte'), p = me.down('#grilleProduitsAlerte');
        if (!rec) {
            d.update('<div style="padding:8px;color:#6b7b8c">Sélectionnez une alerte.</div>');
            p.getStore().loadData([]);
            return;
        }
        var lignes = [];
        lignes.push('<b>' + enc(rec.get('designation') || rec.get('motif') || '') + '</b>');
        if (rec.get('motif') && rec.get('designation')) {
            lignes.push('Motif : ' + enc(rec.get('motif')));
        }
        var consignes = [];
        if (rec.get('arretImmediat')) {
            consignes.push('<span class="blv-ecart">Arrêt immédiat de la délivrance</span>');
        }
        if (rec.get('renvoi')) {
            consignes.push('<span class="blv-ecart">Renvoi du stock au grossiste' + (rec.get('dateLimite') ? ' avant le ' + enc(Ext.Date.format(Ext.Date.parse(rec.get('dateLimite'), 'Y-m-d') || new Date(0), 'd/m/Y')) : '') + '</span>');
        }
        if (consignes.length) {
            lignes.push(consignes.join(' '));
        }
        if (rec.get('instructions')) {
            lignes.push('Instructions : ' + enc(rec.get('instructions')));
        }
        if (rec.get('annexe')) {
            lignes.push('<span style="color:#6b7b8c">' + enc(rec.get('annexe')) + '</span>');
        }
        d.update('<div class="blv-entete" style="padding:6px 10px">' + lignes.join('<br>') + '</div>');
        p.getStore().loadData(rec.get('produits') || []);
    },

    ongletAlertes: function () {
        var me = this, enc = Ext.String.htmlEncode;
        var store = Ext.create('Ext.data.Store', {
            fields: ['id', 'type', 'numero', 'motif', 'designation', {name: 'arretImmediat', type: 'boolean'}, {name: 'renvoi', type: 'boolean'},
                'dateLimite', 'instructions', 'annexe', 'recu', 'lu', 'luPar', 'grossiste', 'produits', 'produitsEnStock']
        });
        var produits = Ext.create('Ext.data.Store', {fields: ['code', 'produit', 'lots', 'connu', 'stock', 'lotsRecus', 'fabricant']});
        return {
            title: 'Alertes',
            itemId: 'ongletAlertes',
            layout: {type: 'vbox', align: 'stretch'},
            listeners: {
                activate: function () {
                    me.chargerAlertes();
                },
                afterrender: function () {
                    /* nombre de non lues dans le titre de l'onglet des l'ouverture de l'ecran */
                    Ext.Ajax.request({url: '../api/v1/pharma/alertes?nonLues=true', method: 'GET', success: function (r) {
                            me.majTitreAlertes((Ext.decode(r.responseText, true) || {}).nonLues || 0);
                        }});
                }
            },
            items: [{
                    xtype: 'gridpanel',
                    itemId: 'grilleAlertes',
                    cls: 'theme-liste',
                    flex: 1,
                    minHeight: 200,
                    store: store,
                    viewConfig: {
                        emptyText: '<div style="padding:10px;color:#6b7b8c">Aucune alerte reçue des grossistes.</div>', deferEmptyText: false,
                        getRowClass: function (r) {
                            return r.get('lu') ? 'alerte-pml-lue' : '';
                        }
                    },
                    listeners: {
                        selectionchange: function (sm, sel) {
                            me.detailAlerte(sel && sel[0] ? sel[0] : null);
                        },
                        cellclick: function (v, td, ci, rec, tr, ri, e) {
                            if (!e.getTarget('[data-alerte-lue]')) {
                                return;
                            }
                            Ext.Ajax.request({url: '../api/v1/pharma/alertes/' + encodeURIComponent(rec.get('id')) + '/lue', method: 'POST',
                                success: function (r) {
                                    var o = Ext.decode(r.responseText, true) || {};
                                    me.down('#infoAlertes').update('<span style="color:' + (o.success ? '#17795f' : '#b42318') + '">' + enc(o.msg || '') + '</span>');
                                    me.chargerAlertes();
                                    var om = Ext.ComponentQuery.query('i_order_manager')[0];
                                    if (om && om.chargerAlertesPml) {
                                        om.chargerAlertesPml();
                                    }
                                }});
                        }
                    },
                    dockedItems: [{
                            xtype: 'toolbar', dock: 'top',
                            items: [{
                                    xtype: 'combobox', itemId: 'filtreAlertes', fieldLabel: 'Afficher', labelWidth: 52, width: 280, editable: false,
                                    queryMode: 'local', displayField: 'l', valueField: 'v', value: 'TOUTES',
                                    store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: [{v: 'TOUTES', l: 'Toutes (non lues d\'abord)'}, {v: 'NON_LUES', l: 'Non lues'}]}),
                                    listeners: {select: function () {
                                            me.chargerAlertes();
                                        }}
                                }, '->', {xtype: 'component', itemId: 'infoAlertes', html: ''}]
                        }],
                    columns: [
                        {header: 'Type', dataIndex: 'type', width: 120, renderer: function (v) {
                                return v === 'REGLEMENTAIRE' ? '<span class="alerte-pml-type">Réglementaire</span>' : '<span class="alerte-pml-type commerciale">Commerciale</span>';
                            }},
                        {header: 'Reçue le', dataIndex: 'recu', width: 125},
                        {header: 'Grossiste', dataIndex: 'grossiste', width: 140, renderer: function (v, m) {
                                m.tdAttr = 'data-qtip="' + enc(enc(v || '')) + '"';
                                return enc(v || '');
                            }},
                        {header: 'N°', dataIndex: 'numero', width: 90},
                        {header: 'Objet', dataIndex: 'designation', flex: 1, minWidth: 200, renderer: function (v, m, r) {
                                var t = (v || r.get('motif') || '');
                                m.tdAttr = 'data-qtip="' + enc(enc(t)) + '"';
                                return (r.get('arretImmediat') ? '<span class="blv-ecart">Arrêt immédiat</span> ' : '') + enc(t);
                            }},
                        {header: 'En stock', dataIndex: 'produitsEnStock', width: 100, align: 'center', renderer: function (v, m, r) {
                                var n = (r.get('produits') || []).length;
                                m.tdAttr = 'data-qtip="' + enc(v + ' produit(s) concerné(s) en stock sur ' + n) + '"';
                                return v > 0 ? '<span class="blv-ecart">' + v + ' / ' + n + '</span>' : '<span class="blv-ok">0 / ' + n + '</span>';
                            }},
                        {header: 'Prise de connaissance', dataIndex: 'lu', width: 210, renderer: function (v, m, r) {
                                if (v) {
                                    m.tdAttr = 'data-qtip="' + enc(enc('Lue par ' + (r.get('luPar') || '?') + ' le ' + v)) + '"';
                                    return '<span style="color:#17795f">✓ ' + enc(r.get('luPar') || '') + ' · ' + enc(v) + '</span>';
                                }
                                return '<a href="#" class="alerte-pml-action" data-alerte-lue="1" onclick="return false;">J\'ai pris connaissance</a>';
                            }}
                    ]
                }, {xtype: 'component', itemId: 'detailAlerte', html: ''}, {
                    xtype: 'gridpanel',
                    itemId: 'grilleProduitsAlerte',
                    cls: 'theme-liste',
                    title: 'Produits concernés',
                    height: 190,
                    store: produits,
                    viewConfig: {emptyText: '<div style="padding:10px;color:#6b7b8c">Aucun produit cité.</div>', deferEmptyText: false},
                    columns: [
                        {header: 'Code', dataIndex: 'code', width: 100},
                        {header: 'Produit', dataIndex: 'produit', flex: 1, renderer: function (v, m, r) {
                                m.tdAttr = 'data-qtip="' + enc(enc((v || '') + (r.get('fabricant') ? ' · ' + r.get('fabricant') : ''))) + '"';
                                return enc(v || '') + (r.get('connu') ? '' : ' <span style="color:#6b7b8c">(hors fichier)</span>');
                            }},
                        {header: 'Lots visés', dataIndex: 'lots', width: 170, renderer: function (v, m) {
                                var t = v && v.length ? v.join(', ') : 'Tous les lots';
                                m.tdAttr = 'data-qtip="' + enc(enc(t)) + '"';
                                return enc(t);
                            }},
                        {header: 'Stock', dataIndex: 'stock', width: 86, align: 'right', renderer: function (v) {
                                return v > 0 ? '<span class="blv-ecart">' + v + '</span>' : v;
                            }},
                        {header: 'Lots reçus en stock', dataIndex: 'lotsRecus', width: 190, renderer: function (v, m) {
                                if (!v || !v.length) {
                                    return '<span style="color:#6b7b8c">—</span>';
                                }
                                var t = Ext.Array.map(v, function (l) {
                                    return l.lot + ' : ' + l.stock;
                                }).join(', ');
                                m.tdAttr = 'data-qtip="' + enc(enc(t)) + '"';
                                return '<span class="blv-ecart">' + enc(t) + '</span>';
                            }}
                    ]
                }]
        };
    },

    ongletSubstitutions: function () {
        var me = this, enc = Ext.String.htmlEncode;
        var store = Ext.create('Ext.data.Store', {
            fields: ['id', 'type', 'statut', 'mode', 'date', 'dateDecision', 'utilisateur', 'grossiste', 'reference', 'cipOrigine',
                'produitOrigine', 'codeRemplacant', 'designationRemplacant', 'qte', 'prixAchat', 'historique', 'commandeId',
                {name: 'annulable', type: 'boolean'}, {name: 'retirable', type: 'boolean'}, 'raison'],
            proxy: {type: 'ajax', url: '../api/v1/pharma/substitutions', reader: {type: 'json', root: 'data', totalProperty: 'total'}}
        });
        var choix = Ext.create('Ext.data.Store', {
            fields: ['familleId', 'codeRemplacant', 'choix', 'date', 'cipOrigine', 'produitOrigine', 'designationRemplacant', 'utilisateur'],
            proxy: {type: 'ajax', url: '../api/v1/pharma/substitutions/choix', reader: {type: 'json', root: 'data', totalProperty: 'total'}}
        });
        var pastille = function (t, c, f) {
            return '<span style="display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600;color:' + c + ';background:' + f + '">' + t + '</span>';
        };
        return {
            title: 'Substitutions',
            itemId: 'ongletSubstitutions',
            layout: {type: 'vbox', align: 'stretch'},
            listeners: {
                activate: function () {
                    me.chargerSubstitutions();
                }
            },
            items: [{
                    xtype: 'gridpanel',
                    itemId: 'grilleSubstitutions',
                    cls: 'theme-liste',
                    flex: 1,
                    minHeight: 280,
                    store: store,
                    viewConfig: {emptyText: '<div style="padding:10px;color:#6b7b8c">Aucune substitution sur la période.</div>', deferEmptyText: false},
                    dockedItems: [{
                            xtype: 'toolbar', dock: 'top',
                            items: [{
                                    xtype: 'combobox', itemId: 'filtreEtatSubst', fieldLabel: 'État', labelWidth: 36, width: 230, editable: false,
                                    queryMode: 'local', displayField: 'l', valueField: 'v', value: '',
                                    store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: [{v: '', l: 'Tous'}, {v: 'PROPOSE', l: 'À décider'},
                                            {v: 'ACCEPTE', l: 'Acceptées'}, {v: 'REFUSE', l: 'Refusées'}, {v: 'AJOUTE', l: 'Livrées (ajoutées)'}, {v: 'RETIRE', l: 'Retirées'}]}),
                                    listeners: {
                                        select: function () {
                                            me.chargerSubstitutions();
                                        }
                                    }
                                }, {xtype: 'component', html: '<span style="color:#6b7b8c">Période, grossiste et recherche : barre du haut</span>'},
                                '->', {xtype: 'component', itemId: 'infoSubstitution', html: ''}]
                        }],
                    columns: [
                        {header: 'Date', dataIndex: 'date', width: 128},
                        {header: 'Commande', dataIndex: 'reference', width: 120},
                        {header: 'Grossiste', dataIndex: 'grossiste', width: 110},
                        {header: 'Produit commandé', dataIndex: 'produitOrigine', flex: 1, renderer: function (v, m, r) {
                                m.tdAttr = 'data-qtip="' + enc(enc((v || '') + ' ' + (r.get('cipOrigine') || ''))) + '"';
                                return enc(v) + ' <span style="color:#6b7b8c">' + enc(r.get('cipOrigine')) + '</span>';
                            }},
                        {header: 'Substitut', dataIndex: 'designationRemplacant', flex: 1, renderer: function (v, m, r) {
                                m.tdAttr = 'data-qtip="' + enc(enc((v || '') + ' ' + r.get('codeRemplacant'))) + '"';
                                return '<b>' + enc(v || r.get('codeRemplacant')) + '</b> <span style="color:#6b7b8c">' + enc(r.get('codeRemplacant')) + '</span>';
                            }},
                        {header: 'Type', dataIndex: 'type', width: 64, renderer: function (v, m) {
                                m.tdAttr = 'data-qtip="' + enc({EL: 'Équivalent livré', RL: 'Remplaçant livré', EP: 'Équivalent proposé (non livré)'}[v] || v) + '"';
                                return enc(v);
                            }},
                        {header: 'Qté', dataIndex: 'qte', width: 48, align: 'right'},
                        {header: 'État', dataIndex: 'statut', width: 128, renderer: function (v, m, r) {
                                var E = me.ETATS_SUBST[v] || [v, '#333', '#eee'];
                                var h = r.get('historique');
                                if (h) {
                                    m.tdAttr = 'data-qtip="' + enc(enc(h).replace(/ ; /g, '<br>')) + '"';
                                }
                                return '<span class="etat-subst" data-etat="' + enc(v) + '">' + pastille(E[0] + (r.get('mode') === 'AUTO' && v !== 'AJOUTE' ? ' (auto)' : ''), E[1], E[2]) + '</span>';
                            }},
                        {header: 'Décidé par', dataIndex: 'utilisateur', width: 130, renderer: function (v, m, r) {
                                return enc(v || (r.get('mode') === 'AUTO' ? 'Automatique' : '')) + (r.get('dateDecision') ? '<br><span style="color:#6b7b8c;font-size:11px">' + enc(r.get('dateDecision')) + '</span>' : '');
                            }},
                        {header: '', dataIndex: 'id', itemId: 'colActionSubst', width: 175, sortable: false, menuDisabled: true, renderer: function (v, m, r) {
                                if (r.get('annulable')) {
                                    m.tdAttr = 'data-qtip="La rupture reprend le produit d\'origine ; la proposition redevient à décider."';
                                    return '<a href="#" class="subst-annuler" data-subst-action="annuler" style="color:#b42318;font-weight:600">Annuler l\'acceptation</a>';
                                }
                                if (r.get('retirable')) {
                                    m.tdAttr = 'data-qtip="Enlève ce produit de la commande ' + enc(enc(r.get('reference'))) + ' (avant réception)."';
                                    return '<a href="#" class="subst-retirer" data-subst-action="retirer" style="color:#b42318;font-weight:600">Retirer de la commande</a>';
                                }
                                if (r.get('statut') === 'PROPOSE') {
                                    return '<span style="color:#6b7b8c">Décision : onglet Ruptures</span>';
                                }
                                return r.get('raison') ? '<span style="color:#6b7b8c" data-qtip="' + enc(r.get('raison')) + '">' + enc(r.get('raison')) + '</span>' : '';
                            }}
                    ],
                    listeners: {
                        cellclick: function (view, td, ci, rec, tr, ri, e) {
                            var t = e.getTarget('[data-subst-action]');
                            if (t) {
                                e.preventDefault();
                                me.actionSubstitution(rec, t.getAttribute('data-subst-action'));
                            }
                        }
                    }
                }, {
                    xtype: 'gridpanel',
                    itemId: 'grilleChoix',
                    title: 'Choix mémorisés (décision automatique pour un couple de produits)',
                    cls: 'theme-liste',
                    height: 190,
                    margin: '8 0 0 0',
                    collapsible: true,
                    store: choix,
                    viewConfig: {emptyText: '<div style="padding:10px;color:#6b7b8c">Aucun choix mémorisé.</div>', deferEmptyText: false},
                    columns: [
                        {header: 'Produit commandé', dataIndex: 'produitOrigine', flex: 1, renderer: function (v, m, r) {
                                return enc(v) + ' <span style="color:#6b7b8c">' + enc(r.get('cipOrigine')) + '</span>';
                            }},
                        {header: 'Substitut', dataIndex: 'designationRemplacant', flex: 1, renderer: function (v, m, r) {
                                return enc(v || '') + ' <span style="color:#6b7b8c">' + enc(r.get('codeRemplacant')) + '</span>';
                            }},
                        {header: 'Choix', dataIndex: 'choix', width: 150, renderer: function (v) {
                                return v === 'ACCEPTER' ? pastille('Toujours accepter', '#17795f', '#e3f6ef') : pastille('Toujours refuser', '#b42318', '#fde7e6');
                            }},
                        {header: 'Par', dataIndex: 'utilisateur', width: 130},
                        {header: 'Le', dataIndex: 'date', width: 128},
                        {header: '', width: 110, sortable: false, menuDisabled: true, dataIndex: 'familleId', renderer: function () {
                                return '<a href="#" class="choix-supprimer" data-subst-action="choix" style="color:#b42318">Supprimer</a>';
                            }}
                    ],
                    listeners: {
                        cellclick: function (view, td, ci, rec, tr, ri, e) {
                            if (e.getTarget('[data-subst-action]')) {
                                e.preventDefault();
                                me.actionSubstitution(rec, 'choix');
                            }
                        }
                    }
                }]
        };
    },

    /*
     * Retours du 08/10 (4) : les equivalents affiches sont ceux de la rupture choisie en haut (clic sur une ligne) ;
     * ils changent a chaque clic. Rien de choisi : tous, avec le rappel de cliquer une ligne.
     */
    ruptureChoisie: null,

    /** Retours du 08/10 (7) : ouverture depuis une commande : equivalents de cette commande seulement. */
    choisirReference: function (reference) {
        var me = this, onglets = me.down('#ongletsRuptures');
        if (onglets) {
            onglets.setActiveTab(me.down('#ongletRuptures'));
        }
        me.ruptureChoisie = reference ? {id: null, reference: reference} : null;
        me.filtrerEquivalents();
        me.marquerRuptureChoisie();
    },

    marquerRuptureChoisie: function () {
        var me = this, g = me.down('#grilleRuptures'), v = g && g.getView(), choix = me.ruptureChoisie;
        if (!v || !v.rendered) {
            return;
        }
        g.getStore().each(function (r) {
            var n = v.getNode(r);
            if (n) {
                Ext.fly(n)[choix && choix.id === r.get('id') ? 'addCls' : 'removeCls']('rupture-choisie');
            }
        });
    },

    filtrerEquivalents: function (rec) {
        var me = this, g = me.down('#grilleEquivalents'), st, n, total;
        if (rec !== undefined) {
            me.ruptureChoisie = rec ? {id: rec.get('id'), reference: rec.get('reference')} : null;
        }
        if (!g) {
            return;
        }
        st = g.getStore();
        st.clearFilter(true);
        total = st.getCount();
        if (me.ruptureChoisie) {
            var choix = me.ruptureChoisie;
            st.filterBy(function (r) {
                /* choix par commande (pastille de la liste des commandes) : reference seule */
                return choix.id && r.get('ruptureId') ? r.get('ruptureId') === choix.id : r.get('reference') === choix.reference;
            });
        } else {
            st.filterBy(function () {
                return true;
            });
        }
        n = st.getCount();
        g.setTitle('Équivalents proposés par les grossistes' + (me.ruptureChoisie
                ? ' · rupture ' + Ext.String.htmlEncode(me.ruptureChoisie.reference) + ' (' + n + ' sur ' + total + ')'
                : ' (' + n + ') · cliquez une rupture en haut pour ne voir que les siens'));
        g.getView().emptyText = '<div style="padding:10px;color:#6b7b8c">' + (me.ruptureChoisie
                ? 'Aucun équivalent proposé pour cette rupture.' : 'Aucun équivalent proposé en attente.') + '</div>';
        g.getView().refresh();
    },

    /*
     * Point 5 du 08/10 : equivalents proposes (EP) par le grossiste dans sa reponse PharmaML, non livres. Accepter = la
     * ligne de rupture passe sur l'equivalent (le renvoi de la rupture le commandera) ; refuser = rien ne change.
     * « Mémoriser » : le meme choix sera applique automatiquement a ce couple de produits. Pas de fenetre : tout se
     * fait sur la ligne.
     */
    grilleEquivalents: function () {
        var store = Ext.create('Ext.data.Store', {
            fields: ['id', 'type', 'codeRemplacant', 'designationRemplacant', {name: 'connu', type: 'boolean'}, 'qte', 'prixAchat',
                'reference', 'grossiste', 'cipOrigine', 'produitOrigine', 'date', {name: 'ruptureOuverte', type: 'boolean'}, 'ruptureId'],
            autoLoad: true,
            proxy: {type: 'ajax', url: '../api/v1/pharma/remplacements', reader: {type: 'json', root: 'data', totalProperty: 'total'}},
            listeners: {
                load: function () {
                    var ecran = Ext.ComponentQuery.query('rupturepharma')[0];
                    if (ecran) {
                        ecran.filtrerEquivalents();
                    }
                }
            }
        });
        var enc = Ext.String.htmlEncode;
        var decider = function (grid, rec, decision) {
            var g = grid.up('#grilleEquivalents') || grid, memo = g.down('#memoriserChoix').getValue();
            Ext.Ajax.request({
                method: 'POST',
                url: '../api/v1/pharma/remplacements/' + encodeURIComponent(rec.get('id')) + '?decision=' + decision + '&memoriser=' + (memo ? 'true' : 'false'),
                success: function (r) {
                    var o = Ext.decode(r.responseText, true) || {}, info = g.down('#infoEquivalent');
                    info.update('<span style="color:' + (o.success ? '#17795f' : '#b42318') + '">' + enc(o.msg || 'Opération impossible.') + '</span>');
                    if (o.success) {
                        store.reload();
                    }
                },
                failure: function () {
                    g.down('#infoEquivalent').update('<span style="color:#b42318">Le serveur ne répond pas.</span>');
                }
            });
        };
        return {
            xtype: 'gridpanel',
            itemId: 'grilleEquivalents',
            title: 'Équivalents proposés par les grossistes',
            height: 230,
            collapsible: true,
            margin: '8 0 0 0',
            store: store,
            viewConfig: {emptyText: '<div style="padding:10px;color:#6b7b8c">Aucun équivalent proposé en attente.</div>', deferEmptyText: false},
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top',
                    items: [{xtype: 'checkboxfield', itemId: 'memoriserChoix', boxLabel: 'Mémoriser mon choix pour ce couple de produits'},
                        '->', {xtype: 'component', itemId: 'infoEquivalent', html: ''},
                        {xtype: 'button', itemId: 'toutesRuptures', text: 'Toutes les ruptures', tooltip: 'Afficher les équivalents de toutes les ruptures',
                            handler: function (b) {
                                var ecran = b.up('rupturepharma');
                                ecran.filtrerEquivalents(null);
                                ecran.marquerRuptureChoisie();
                            }},
                        {xtype: 'button', text: 'Actualiser', handler: function () {
                                store.reload();
                            }}]
                }],
            columns: [
                {header: 'Commande', dataIndex: 'reference', width: 130},
                {header: 'Grossiste', dataIndex: 'grossiste', width: 140},
                {header: 'Produit commandé', dataIndex: 'produitOrigine', flex: 1, renderer: function (v, m, r) {
                        return enc(v) + ' <span style="color:#6b7b8c">' + enc(r.get('cipOrigine')) + '</span>';
                    }},
                {header: 'Équivalent proposé', dataIndex: 'designationRemplacant', flex: 1, renderer: function (v, m, r) {
                        return '<b>' + enc(v || r.get('codeRemplacant')) + '</b> <span style="color:#6b7b8c">' + enc(r.get('codeRemplacant')) + '</span>'
                                + (r.get('connu') ? '' : ' <span data-qtip="Produit absent du fichier : il sera créé à l\'acceptation" style="color:#b26a00">(nouveau)</span>');
                    }},
                {header: 'Qté', dataIndex: 'qte', width: 55, align: 'right'},
                {header: 'Date', dataIndex: 'date', width: 132},
                {header: '', width: 190, sortable: false, menuDisabled: true, dataIndex: 'id',
                    renderer: function (v, m, r) {
                        if (!r.get('ruptureOuverte')) {
                            return '<span style="color:#6b7b8c" data-qtip="Rupture déjà renvoyée ou supprimée">Rupture close</span> '
                                    + '<span role="button" tabindex="0" class="eq-refuser" data-decision="REFUSER" style="cursor:pointer;color:#2E75B6">Écarter</span>';
                        }
                        return '<span role="button" tabindex="0" class="eq-accepter" data-decision="ACCEPTER" style="cursor:pointer;font-weight:600;color:#17795f">Accepter</span>'
                                + ' &nbsp;·&nbsp; <a href="#" class="eq-refuser" data-decision="REFUSER" style="color:#b42318">Refuser</a>';
                    }}
            ],
            listeners: {
                cellclick: function (view, td, ci, rec, tr, ri, e) {
                    var t = e.getTarget('[data-decision]');
                    if (t) {
                        decider(view.up('gridpanel'), rec, t.getAttribute('data-decision'));
                    }
                }
            }
        };
    }
});
