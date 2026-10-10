/* global Ext */
/*
 * Retours du 09/10 (3) : onglet « Risque de rupture » de Commandes en cours.
 * Couverture = stock (rayon + reserve) / ventes par jour ; risque quand elle ne tient pas jusqu'a la prochaine livraison
 * (delai du grossiste + jours de securite). Une commande deja passee qui arrive a temps : « Couvert par commande ».
 * Rupture fournisseur (reponse d'un grossiste sur 30 jours) affichee a part. API v1/risque-rupture, lecture seule.
 */
Ext.define('testextjs.view.commandemanagement.order.RisqueRupture', {
    extend: 'Ext.panel.Panel',
    xtype: 'risquerupture',
    requires: ['testextjs.view.commandemanagement.analyse.ParametresCalcul'],
    layout: 'fit',
    border: false,
    cls: 'rr-ecran',

    STATUTS: [
        {cle: 'RUPTURE', texte: 'Rupture', couleur: '#b42318', fond: '#fde7e6', info: 'Stock vendable à zéro'},
        {cle: 'CRITIQUE', texte: 'Critique', couleur: '#c2410c', fond: '#ffedd5', info: 'Épuisé avant une livraison normale (couverture ≤ délai)'},
        {cle: 'RISQUE', texte: 'Risque', couleur: '#b26a00', fond: '#fff4e0', info: 'Couverture ≤ délai + jours de sécurité'},
        {cle: 'A_SURVEILLER', texte: 'À surveiller', couleur: '#8a6d00', fond: '#fdf6d8', info: 'Couverture proche du délai + sécurité'},
        {cle: 'COUVERT', texte: 'Couvert par commande', couleur: '#1f5f9e', fond: '#e4effa', info: 'Une commande en cours arrive avant l\'épuisement : ne pas recommander'},
        {cle: 'CORRECT', texte: 'Correct', couleur: '#17795f', fond: '#e3f6ef', info: 'Couverture suffisante'},
        {cle: 'SURSTOCK', texte: 'Surstock', couleur: '#6d28d9', fond: '#efe7fd', info: 'Couverture au-delà du seuil de surstock'},
        {cle: 'DORMANT', texte: 'Dormant', couleur: '#5b6573', fond: '#eef2f6', info: 'Du stock et aucune vente sur 12 mois'}
    ],
    A_TRAITER: ['RUPTURE', 'CRITIQUE', 'RISQUE', 'A_SURVEILLER'],

    initComponent: function () {
        var me = this, enc = Ext.String.htmlEncode;
        me.choisis = Ext.Array.clone(me.A_TRAITER);
        me.store = Ext.create('Ext.data.Store', {
            fields: ['id', 'cip', 'designation', 'grossiste', 'rayon', 'statut', {name: 'parJour', type: 'number'},
                {name: 'stock', type: 'int'}, {name: 'enCours', type: 'int'}, {name: 'couverture', type: 'number', useNull: true},
                {name: 'delai', type: 'int'}, {name: 'horizon', type: 'int'}, {name: 'seuil', type: 'int'},
                {name: 'aCommander', type: 'int'}, 'epuisement', 'derniereVente', 'ruptureFournisseur'],
            pageSize: 50,
            proxy: {type: 'ajax', url: '../api/v1/risque-rupture', timeout: 240000,
                reader: {type: 'json', root: 'data', totalProperty: 'total'}},
            listeners: {
                beforeload: function (st) {
                    st.getProxy().extraParams = me.criteres();
                },
                load: function (st, r, succes) {
                    me.majBandeau(st.getProxy().getReader().rawData, succes);
                }
            }
        });
        var liste = function (url) {
            return Ext.create('Ext.data.Store', {fields: ['id', 'libelle'], pageSize: 9999, autoLoad: true,
                proxy: {type: 'ajax', url: url, reader: {type: 'json', root: 'data', totalProperty: 'total'}}});
        };
        var combo = function (itemId, texte, url) {
            return {xtype: 'combobox', itemId: itemId, emptyText: texte, store: liste(url), valueField: 'libelle', displayField: 'libelle',
                queryMode: 'local', typeAhead: true, forceSelection: true, anyMatch: true, width: 150, maxLength: 100,
                listeners: {select: function () {
                        me.charger();
                    }, change: function (c, v) {
                        if (!v) {
                            me.charger();
                        }
                    }}};
        };
        var statut = function (v) {
            var s = Ext.Array.findBy(me.STATUTS, function (x) {
                return x.cle === v;
            }) || {texte: v, couleur: '#333', fond: '#eee', info: ''};
            return '<span class="rr-pastille" data-statut="' + enc(v) + '" data-qtip="' + enc(s.info) + '" style="color:' + s.couleur + ';background:' + s.fond + '">' + enc(s.texte) + '</span>';
        };
        var nombre = function (v) {
            return v === null || v === undefined ? '' : Ext.util.Format.number(v, '0,000');
        };
        Ext.apply(me, {
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', itemId: 'barreRisque',
                    items: [
                        {xtype: 'textfield', itemId: 'recherche', emptyText: 'CIP ou désignation', width: 170, maxLength: 100,
                            listeners: {specialkey: function (f, e) {
                                    if (e.getKey() === e.ENTER) {
                                        me.charger();
                                    }
                                }}},
                        combo('grossiste', 'Grossiste', '../api/v1/common/grossiste'),
                        combo('rayon', 'Rayon', '../api/v1/common/rayons'),
                        {xtype: 'checkbox', itemId: 'ruptureFournisseur', boxLabel: 'Rupture fournisseur seulement',
                            listeners: {change: function () {
                                    me.charger();
                                }}},
                        {text: 'Rechercher', itemId: 'rechercherRisque', cls: 'btn-primary', iconCls: 'searchicon', handler: function () {
                                me.charger();
                            }},
                        '->',
                        {text: 'Exporter Excel', itemId: 'excelRisque', cls: 'btn-primary', iconCls: 'export_excel_icon', handler: function () {
                                window.open('../api/v1/risque-rupture/excel?' + Ext.Object.toQueryString(me.criteres()));
                            }}
                    ]
                }, {
                    xtype: 'container', dock: 'top', itemId: 'bandeauRisque', cls: 'rr-bandeau', padding: '6 8',
                    html: '', listeners: {
                        afterrender: function (c) {
                            c.getEl().on('click', function (e) {
                                var t = e.getTarget('.rr-filtre');
                                if (t) {
                                    me.basculer(t.getAttribute('data-statut'), e.ctrlKey || e.metaKey);
                                }
                            });
                        }
                    }
                }, {
                    /* retours du 10/10 : parametres du calcul modifiables dans l'ecran (droit P_PREVISION_PARAMETRER) */
                    xtype: 'parametrescalcul', dock: 'top', itemId: 'parametresRisque', ecran: 'RISQUE', collapsed: true,
                    titleCollapse: true, maxHeight: 330, autoScroll: true,
                    apresEnregistrement: function () {
                        me.store.loadPage(1);
                    }
                }],
            items: [{
                    xtype: 'grid', itemId: 'grilleRisque', store: me.store, columnLines: true,
                    viewConfig: {emptyText: 'Aucun produit pour ces critères.', deferEmptyText: false},
                    columns: [
                        {header: 'Statut', dataIndex: 'statut', width: 112, renderer: statut},
                        {header: 'CIP', dataIndex: 'cip', width: 96},
                        {header: 'Désignation', dataIndex: 'designation', flex: 1, minWidth: 140, renderer: function (v, m) {
                                m.tdAttr = 'data-qtip="' + enc(enc(v)) + '"';
                                return enc(v);
                            }},
                        {header: 'Grossiste', dataIndex: 'grossiste', width: 100},
                        {header: 'Ventes/j', tooltip: 'Ventes moyennes par jour (prévisions)', dataIndex: 'parJour', width: 92, align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.00');
                            }},
                        {header: 'Stock', tooltip: 'Stock vendable (rayon + réserve)', dataIndex: 'stock', width: 78, align: 'right', renderer: nombre},
                        {header: 'En cde', tooltip: 'Quantité déjà en commande', dataIndex: 'enCours', width: 84, align: 'right', renderer: nombre},
                        {header: 'Couverture', tooltip: 'Jours de vente couverts par le stock (stock ÷ ventes/jour)', dataIndex: 'couverture', width: 122, align: 'right',
                            renderer: function (v) {
                                return v === null || v === undefined ? '—' : '<b>' + Ext.util.Format.number(v, '0,000.0') + ' j</b>';
                            }},
                        {header: 'Délai+séc.', tooltip: 'Délai du grossiste + jours de sécurité : la couverture doit dépasser ce nombre', dataIndex: 'horizon', width: 106, align: 'right',
                            renderer: function (v, m, r) {
                                m.tdAttr = 'data-qtip="Délai ' + r.get('delai') + ' j + sécurité ' + (v - r.get('delai')) + ' j ; seuil ' + r.get('seuil') + ' unités"';
                                return v + ' j';
                            }},
                        {header: 'Épuisé le', tooltip: 'Date d\'épuisement prévue sans réception', dataIndex: 'epuisement', width: 100},
                        {header: 'À commander', tooltip: 'Couvre délai + sécurité + couverture voulue, moins le stock et les commandes en cours', dataIndex: 'aCommander', width: 130, align: 'right',
                            renderer: function (v) {
                                return v ? '<b>' + nombre(v) + '</b>' : '';
                            }},
                        {header: 'Rupt. fourn.', tooltip: 'Rupture fournisseur : annoncée par un grossiste (30 derniers jours)', dataIndex: 'ruptureFournisseur', width: 130,
                            renderer: function (v, m) {
                                if (!v) {
                                    return '';
                                }
                                m.tdAttr = 'data-qtip="' + enc(enc(v)) + '"';
                                return '<span style="color:#b42318">' + enc(v) + '</span>';
                            }}
                    ],
                    bbar: {xtype: 'pagingtoolbar', store: me.store, displayInfo: true,
                        /* retours du 10/10 : 25 / 50 / 100 lignes */
                        items: ['-', window.PrestigeAffichage.choixLignes(me.store)]}
                }]
        });
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.charger();
        });
    },

    criteres: function () {
        var me = this, v = function (id) {
            var c = me.down('#' + id);
            return c ? c.getValue() : null;
        };
        return {statuts: me.choisis.join(','), query: v('recherche') || '', grossiste: v('grossiste') || '', rayon: v('rayon') || '',
            ruptureFournisseur: !!v('ruptureFournisseur')};
    },

    charger: function () {
        this.store.loadPage(1);
    },

    /*
     * Retours du 10/10 (4) : clic sur un compteur = n'afficher QUE ce statut (« Rupture 600 » -> les 600 ruptures) ;
     * nouveau clic sur le seul statut affiche = retour aux statuts a traiter ; Ctrl + clic = ajouter ou retirer ce
     * statut de la selection (au moins un reste choisi).
     */
    basculer: function (cle, ajout) {
        var me = this;
        if (ajout) {
            if (Ext.Array.contains(me.choisis, cle)) {
                if (me.choisis.length > 1) {
                    Ext.Array.remove(me.choisis, cle);
                }
            } else {
                me.choisis.push(cle);
            }
        } else if (me.choisis.length === 1 && me.choisis[0] === cle) {
            me.choisis = Ext.Array.clone(me.A_TRAITER);
        } else {
            me.choisis = [cle];
        }
        me.charger();
    },

    majBandeau: function (o, succes) {
        var me = this, b = me.down('#bandeauRisque'), enc = Ext.String.htmlEncode;
        if (!b) {
            return;
        }
        if (!succes || !o || o.success === false) {
            b.update('<span style="color:#b42318">' + enc((o && o.msg) || 'Chargement impossible.') + '</span>');
            return;
        }
        var c = o.compteurs || {}, r = o.reglages || {};
        var filtres = Ext.Array.map(me.STATUTS, function (s) {
            var actif = Ext.Array.contains(me.choisis, s.cle);
            return '<span class="rr-filtre' + (actif ? ' rr-actif' : '') + '" data-statut="' + s.cle + '" data-qtip="' + enc(s.info)
                    + ' — clic : n\'afficher que ce statut (re-clic : statuts à traiter) ; Ctrl + clic : ajouter ou retirer" style="border-color:' + s.couleur + ';' + (actif ? 'background:' + s.couleur + ';color:#fff' : 'color:' + s.couleur + ';background:' + s.fond)
                    + '">' + enc(s.texte) + ' <b>' + (c[s.cle] || 0) + '</b></span>';
        }).join('');
        b.update('<div class="rr-filtres">' + filtres + '</div><div class="rr-regle">Couverture = stock ÷ ventes par jour ; risque quand elle ne dépasse pas '
                + 'le délai du grossiste (' + r.delaiDefaut + ' j par défaut) + ' + r.securite + ' j de sécurité. Ventes par jour : prévisions du '
                + enc(o.calcul || '—') + '. Valeur à commander (prix d\'achat) : <b>' + Ext.util.Format.number(o.valeurACommander || 0, '0,000') + '</b>.</div>');
    }
});
