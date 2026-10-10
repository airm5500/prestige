/* global Ext */

/*
 * ANALYSE SUGGESTION / COMMANDE (plan d'octobre, section 5, lot L12) — menu GESTION DES COMMANDES.
 *
 * Aider a commander juste : moins d'invendus, moins de ruptures. Limite a la decision de stock (Q14).
 *  - Tableau : taux de rupture, valeur des invendus, couverture moyenne, fiabilite des previsions, a commander.
 *  - Previsions : par produit, la methode retenue (moyenne, saison, Holt, Holt-Winters), sa fiabilite, la quantite
 *    recommandee ; un clic ouvre le detail (historique, prevision, calcul explique).
 *  - Analyse : une suggestion ou une commande ligne a ligne, quantite proposee contre recommandee, et alertes.
 * Les previsions sont calculees la nuit ; « Recalculer » les met a jour a la demande. Lecture seule.
 */
Ext.define('testextjs.view.commandemanagement.analyse.AnalyseCommande', {
    extend: 'Ext.tab.Panel',
    xtype: 'analysecommande',
    requires: ['testextjs.view.commandemanagement.analyse.ParametresCalcul', 'testextjs.view.commandemanagement.analyse.FenetrePrevision', 'testextjs.view.commandemanagement.disponibilite.DisponibilitePharmaMl'],
    id: 'analysecommandeID',
    title: 'Prévisions vente / achat / analyse',
    cls: 'ordo-onglets',
    frame: true,
    width: '98%',
    height: 640,

    METHODES: {MOYENNE: 'Moyenne 3 mois', SAISON: 'Saisonnière', HOLT: 'Tendance (Holt)', HOLT_WINTERS: 'Tendance + saison'},
    ALERTES: {
        ABERRANTE: ['Quantité aberrante', '#c0392b'], INSUFFISANTE: ['Quantité insuffisante', '#d35400'],
        SURSTOCK: ['Surstock', '#8e44ad'], EQUIVALENT: ['Équivalent DCI en stock', '#2980b9'],
        INDISPONIBLE: ['Indisponible', '#c0392b'], PRIX: ['Prix anormal', '#b9770e'], LENTE: ['Rotation lente', '#7f8c8d']
    },

    initComponent: function () {
        var me = this;
        me.items = [me.ongletTableau(), me.ongletPrevisions(), me.ongletAnalyse()];
        me.callParent(arguments);
        me.on('tabchange', function (tp, t) {
            if (t.itemId === 'ongletPrevisions' && !t.getStore().getCount()) {
                t.getStore().loadPage(1);
            } else if (t.itemId === 'ongletAnalyse') {
                me.down('#choix').getStore().load();
            }
        });
        me.on('afterrender', function () {
            me.chargerTableau();
        });
    },

    h: function (s) {
        return Ext.String.htmlEncode(s === null || s === undefined ? '' : String(s));
    },
    nombre: function (v) {
        return v === null || v === undefined || v === '' ? '—' : Math.round(Number(v)).toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ');
    },
    lire: function (url, ok, methode, corps) {
        var me = this;
        Ext.Ajax.request({url: url, method: methode || 'GET', timeout: 300000, jsonData: corps,
            success: function (r) {
                var o = {};
                try {
                    o = Ext.decode(r.responseText);
                } catch (e) {
                    o = {success: false, message: 'Réponse illisible du serveur.'};
                }
                if (o.success === false) {
                    Ext.MessageBox.alert('Analyse des commandes', me.h(o.message || o.msg || 'Erreur'));
                    return;
                }
                ok(o);
            },
            failure: function (r) {
                Ext.MessageBox.alert('Analyse des commandes', 'Le serveur n\'a pas répondu (' + r.status + ').');
            }});
    },
    fiabilite: function (v) {
        if (v === null || v === undefined) {
            return '<span style="color:#9aa8b6">—</span>';
        }
        var c = v >= 70 ? '#27ae60' : (v >= 40 ? '#e67e22' : '#c0392b');
        return '<span class="ac-fiab"><span style="width:' + Math.max(2, v) + '%;background:' + c + '"></span></span> ' + v + ' %';
    },

    /* ------------------------------------------------------------------ Tableau */

    ongletTableau: function () {
        var me = this;
        return {
            xtype: 'panel', itemId: 'ongletTableau', title: 'Tableau', autoScroll: true, bodyPadding: 12,
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'component', itemId: 'infoCalcul', html: ''}, '->',
                        {text: 'Recalculer maintenant', itemId: 'btnRecalculer', iconCls: 'refresh',
                            tooltip: 'Recalcule les prévisions de tous les produits (fait automatiquement chaque nuit)',
                            handler: function () {
                                me.recalculer();
                            }}]}],
            items: [{xtype: 'component', itemId: 'tuiles', html: '<div style="color:#7f8c8d">Chargement…</div>'},
                /* retours du 10/10 : definition de chaque methode, puis parametres modifiables dans l'ecran */
                {xtype: 'component', itemId: 'methodesDef', margin: '12 0 0 0', html: me.htmlMethodes()},
                {xtype: 'parametrescalcul', itemId: 'parametresCalcul', ecran: 'PREVISIONS', margin: '12 0 0 0'}]
        };
    },

    DEFINITIONS: [
        ['MOYENNE', 'Moyenne des ventes des 3 derniers mois. Simple et stable : convient aux produits réguliers.'],
        ['SAISON', 'Ventes du même mois l\'an dernier ; avec deux ans d\'historique, corrigées de l\'évolution d\'une année sur l\'autre (entre ×0,5 et ×2). Pour les produits saisonniers (antipaludéens, antigrippaux…) ; demande 12 mois d\'historique.'],
        ['HOLT', 'Lissage qui suit le niveau et la tendance (hausse ou baisse régulière) des ventes. Pour un produit qui progresse ou recule ; demande 4 mois d\'historique.'],
        ['HOLT_WINTERS', 'Lissage de Holt avec en plus l\'effet du mois (saison). Pour un produit à la fois en tendance et saisonnier ; demande 24 mois d\'historique.']
    ],

    htmlMethodes: function () {
        var me = this, l = '';
        Ext.Array.each(me.DEFINITIONS, function (d) {
            l += '<tr><td class="ac-meth-nom">' + me.h(me.METHODES[d[0]]) + '</td><td>' + me.h(d[1]) + '</td></tr>';
        });
        return '<div class="ac-methodes"><div class="ac-methodes-titre">Méthodes de prévision</div><table>' + l + '</table>'
                + '<div class="ac-methodes-note">Pour chaque produit, chaque méthode prévoit les derniers mois déjà connus (« mois d\'essai » ci-dessous) ;'
                + ' celle qui s\'est le moins trompée est retenue. Fiabilité = 100 − son erreur moyenne (en %).</div></div>';
    },

    chargerTableau: function () {
        var me = this;
        me.lire('../api/v1/analyse-commande/tableau', function (o) {
            var t = me.down('#tuiles'), info = me.down('#infoCalcul');
            if (!o.calcule) {
                info.update('<span style="color:#c0392b">Aucune prévision calculée.</span>');
                t.update('<div class="ac-vide">Les prévisions n\'ont pas encore été calculées. Cliquez sur « Recalculer maintenant ».</div>');
                return;
            }
            info.update('Dernier calcul : <b>' + me.h(o.dernierCalcul) + '</b> (' + (o.origine === 'NUIT' ? 'calcul de la nuit' : 'à la demande') + '), '
                    + me.nombre(o.produits) + ' produits');
            /* retours du 07/10 : un (i) sur chaque tuile ouvre le detail (definition, calcul, chiffres) ; un clic
               ailleurs sur la tuile ouvre toujours la liste des produits concernes */
            me.detailsTuiles = {};
            var tuile = function (cls, titre, valeur, detail, filtre, aide, explication) {
                me.detailsTuiles[filtre] = {titre: titre, valeur: valeur, detail: detail, aide: aide, explication: explication};
                return '<div class="ac-tuile ' + cls + '"' + (filtre ? ' data-filtre="' + filtre + '"' : '')
                        + ' data-qtip="' + me.h(aide + ' — clic : voir les produits') + '">'
                        + '<span class="ac-info" data-info="' + filtre + '" data-qtip="Détail et calcul">i</span>'
                        + '<div class="ac-t">' + titre + '</div><div class="ac-v">' + valeur
                        + '</div><div class="ac-d">' + detail + '</div></div>';
            };
            var html = '<div class="ac-tuiles">'
                    + tuile('t-rouge', 'Taux de rupture', (o.tauxRupture || 0).toLocaleString('fr-FR') + ' %',
                            me.nombre(o.ruptures) + ' produits vendus régulièrement sans stock', 'RUPTURE',
                            'Parmi les produits dont la prévision est d\'au moins 1 par mois, part de ceux dont le stock est nul',
                            'Produits suivis dont la prévision est d\'au moins 1 vente par mois (vendus régulièrement) : <b>'
                            + me.nombre(o.ruptures) + '</b> ont un stock nul (rayon + réserve), soit <b>' + (o.tauxRupture || 0).toLocaleString('fr-FR')
                            + ' %</b>. Chaque jour en rupture d\'un produit régulier est une vente perdue ou reportée.')
                    + tuile('t-violet', 'Invendus', me.nombre(o.valeurInvendus) + ' F',
                            me.nombre(o.invendus) + ' produits sans vente depuis ' + o.joursLente + ' j (valeur d\'achat)', 'LENTE',
                            'Valeur au prix d\'achat du stock des produits sans vente depuis ' + o.joursLente + ' jours',
                            '<b>' + me.nombre(o.invendus) + '</b> produits en stock n\'ont eu aucune vente depuis <b>' + o.joursLente
                            + ' jours</b> (paramètre KEY_PREVISION_ROTATION_LENTE_JOURS). Leur stock vaut <b>' + me.nombre(o.valeurInvendus)
                            + ' F</b> au prix d\'achat : argent immobilisé, risque de péremption.')
                    + tuile('t-bleu', 'Couverture moyenne', o.couvertureMoyenne === null ? '—' : o.couvertureMoyenne + ' j',
                            me.nombre(o.surstock) + ' produits au-delà de ' + o.joursSurstock + ' j', 'SURSTOCK',
                            'Jours de vente couverts par le stock et les commandes en cours (plafonné à 1 an par produit)',
                            'Couverture d\'un produit = (stock + commandes en cours) ÷ ventes prévues par jour. Moyenne sur les produits vendus, '
                            + 'chaque produit plafonné à ' + (o.plafondCouverture || 365) + ' j. <b>' + me.nombre(o.surstock) + '</b> produits dépassent <b>' + o.joursSurstock
                            + ' jours</b> (paramètre KEY_PREVISION_SURSTOCK_JOURS) : surstock.')
                    + tuile('t-vert', 'Fiabilité des prévisions', o.fiabilite === null ? '—' : o.fiabilite + ' %',
                            'pondérée par les ventes des 12 derniers mois', 'PEU_FIABLE',
                            '100 − erreur moyenne de la méthode retenue, mesurée sur les 6 derniers mois connus',
                            'Pour chaque produit, chaque méthode (moyenne, saison, tendance…) prévoit les 6 derniers mois comme si on ne les '
                            + 'connaissait pas ; on compare à ce qui a été vendu. Fiabilité = 100 − erreur moyenne (en %). La moyenne affichée '
                            + 'est pondérée par les ventes : un produit qui se vend beaucoup compte plus. En dessous de ' + (o.seuilPeuFiable === undefined ? 50 : o.seuilPeuFiable) + ' %, la prévision est peu fiable.')
                    + tuile('t-orange', 'À commander', me.nombre(o.aCommander) + ' produits',
                            me.nombre(o.valeurACommander) + ' F au prix d\'achat', 'ACOMMANDER',
                            'Produits dont la quantité recommandée est positive',
                            '<b>' + me.nombre(o.aCommander) + '</b> produits ont une quantité recommandée positive, pour <b>'
                            + me.nombre(o.valeurACommander) + ' F</b> au prix d\'achat. Quantité recommandée = ventes prévues pendant le délai '
                            + 'de livraison et la couverture voulue + stock de sécurité − stock − commandes en cours − équivalents DCI en stock.')
                    + '</div>';
            var lignes = (o.methodes || []).map(function (m) {
                return '<tr><td>' + me.h(me.METHODES[m.methode] || m.methode) + '</td><td class="n">' + me.nombre(m.produits)
                        + '</td><td>' + me.fiabilite(m.fiabilite) + '</td></tr>';
            }).join('');
            html += '<div class="ac-bloc"><div class="ac-bloc-t">Méthodes retenues (produits vendus sur 12 mois)</div>'
                    + '<table class="ac-table"><tr><th>Méthode</th><th class="n">Produits</th><th>Fiabilité moyenne</th></tr>' + lignes + '</table>'
                    + '<div class="ac-note">Pour chaque produit, chaque méthode est essayée sur les 6 derniers mois connus ; la plus juste est retenue.'
                    + ' Quantité recommandée = ventes prévues pendant le délai de livraison et la couverture voulue + stock de sécurité'
                    + ' − stock (rayon et réserve) − commandes en cours − équivalents DCI directs en stock.</div></div>';
            t.update(html);
            Ext.each(t.getEl().dom.querySelectorAll('.ac-tuile[data-filtre]'), function (d) {
                d.onclick = function (e) {
                    var info = e && e.target && e.target.getAttribute && e.target.getAttribute('data-info');
                    if (info) {
                        me.detailTuile(info);
                        return;
                    }
                    me.ouvrirPrevisions(d.getAttribute('data-filtre'));
                };
            });
        });
    },

    /** Fenetre de detail d'une tuile : definition, calcul, chiffres, et acces a la liste des produits. */
    detailTuile: function (filtre) {
        var me = this, d = (me.detailsTuiles || {})[filtre];
        if (!d) {
            return;
        }
        var w = Ext.create('Ext.window.Window', {
            title: d.titre, modal: true, width: 520, bodyPadding: 16, cls: 'fen-theme',
            html: '<div class="ac-detail"><div class="ac-detail-v">' + d.valeur + '</div><div class="ac-detail-d">' + d.detail + '</div>'
                    + '<p>' + d.explication + '</p></div>',
            buttons: [{text: 'Voir les produits', cls: 'fen-btn-principal', handler: function () {
                        w.close();
                        me.ouvrirPrevisions(filtre);
                    }}, {text: 'Fermer', handler: function () {
                        w.close();
                    }}]
        });
        w.show();
    },

    /** Produit sur une seule ligne : nom en gras, puis code et complement en gris ; texte complet en info-bulle. */
    produitUneLigne: function (m, nom, cip, suite) {
        var me = this, texte = [me.h(nom), me.h(cip), me.h(suite)].filter(function (x) {
            return x;
        }).join(' · ');
        m.tdAttr = 'data-qtip="' + me.h(texte) + '"';
        m.tdCls = (m.tdCls || '') + ' ac-une-ligne';
        return '<b>' + me.h(nom) + '</b> <span style="color:#7f8c8d">· ' + me.h(cip) + (suite ? ' · ' + me.h(suite) : '') + '</span>';
    },

    recalculer: function () {
        var me = this, b = me.down('#btnRecalculer');
        b.disable();
        b.setText('Calcul en cours…');
        me.lire('../api/v1/analyse-commande/recalculer', function (o) {
            b.enable();
            b.setText('Recalculer maintenant');
            me.chargerTableau();
            var p = me.down('#ongletPrevisions');
            if (p.getStore().getCount()) {
                p.getStore().loadPage(1);
            }
        }, 'POST');
        Ext.defer(function () {
            if (b.isDisabled()) {
                b.enable();
                b.setText('Recalculer maintenant');
            }
        }, 300000);
    },

    /* ------------------------------------------------------------------ Previsions */

    ouvrirPrevisions: function (filtre) {
        var me = this, p = me.down('#ongletPrevisions');
        p.down('#filtre').setValue(filtre || '');
        me.setActiveTab(p);
        p.getStore().loadPage(1);
    },

    ongletPrevisions: function () {
        var me = this;
        me.retires = {};
        var store = Ext.create('Ext.data.Store', {
            fields: ['id', 'nom', 'cip', 'methode', {name: 'prevuMois', type: 'float'}, {name: 'fiabilite', type: 'int'},
                {name: 'ventes12', type: 'int'}, 'derniereVente', {name: 'stock', type: 'int'}, {name: 'enCours', type: 'int'},
                {name: 'equivalents', type: 'int'}, {name: 'delai', type: 'int'}, 'couverture', {name: 'recommande', type: 'int'},
                {name: 'paf', type: 'int'}, {name: 'valeur', type: 'int'}, 'grossiste', 'historique', {name: 'ecartType', type: 'float'}],
            pageSize: 25, remoteSort: false, autoLoad: false,
            proxy: {type: 'ajax', url: '../api/v1/analyse-commande/previsions', timeout: 120000,
                reader: {type: 'json', root: 'data', totalProperty: 'total'}}
        });
        store.on('beforeload', function (st) {
            st.getProxy().extraParams = me.criteres();
        });
        store.on('load', function (st) {
            var raw = st.getProxy().getReader().rawData || {};
            me.couvertureVoulue = raw.couvertureVoulue;
            me.majRetires();
        });
        var entree = {specialkey: function (f, e) {
                if (e.getKey() === e.ENTER) {
                    store.loadPage(1);
                }
            }};
        var recharger = {select: function () {
                store.loadPage(1);
            }};
        var combo = function (itemId, largeur, donnees, vide) {
            return {xtype: 'combobox', itemId: itemId, width: largeur, editable: false, queryMode: 'local', displayField: 'l',
                valueField: 'v', value: '', store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: [{v: '', l: vide}].concat(donnees)}),
                listeners: recharger};
        };
        var qtip = function (m, texte) {
            m.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(texte) + '"';
        };
        return {
            xtype: 'grid', itemId: 'ongletPrevisions', title: 'Prévisions', store: store,
            selModel: Ext.create('Ext.selection.CheckboxModel', {checkOnly: true, mode: 'MULTI'}),
            viewConfig: {emptyText: 'Aucun produit pour ces critères.', deferEmptyText: false, stripeRows: true,
                getRowClass: function (r) {
                    return me.retires[r.get('id')] ? 'prev-retire' : '';
                }},
            columns: [
                {text: 'Produit', dataIndex: 'nom', flex: 1, minWidth: 250, tooltip: 'Désignation · code CIP · grossiste habituel',
                    renderer: function (v, m, r) {
                        return me.produitUneLigne(m, v, r.get('cip'), r.get('grossiste'));
                    }},
                {text: 'Ventes 12 mois', dataIndex: 'ventes12', width: 85, align: 'right', tooltip: 'Quantité vendue sur les 12 derniers mois complets',
                    renderer: function (v, m, r) {
                        qtip(m, 'Ventes des 12 derniers mois complets : ' + v + ' (soit ' + (Math.round(v / 12 * 10) / 10).toString().replace('.', ',') + ' par mois en moyenne)'
                                + (r.get('derniereVente') ? ' · dernière vente le ' + r.get('derniereVente') : ''));
                        return v;
                    }},
                {text: 'Tendance', dataIndex: 'historique', width: 115, sortable: false, tooltip: 'Ventes mois par mois sur 12 mois (le plus récent à droite)', renderer: function (v, m) {
                        qtip(m, '12 derniers mois (du plus ancien au plus récent) : ' + String(v || '').split(',').slice(-12).join(' · '));
                        return me.miniCourbe(v);
                    }},
                {text: 'Prévu / mois', dataIndex: 'prevuMois', width: 80, align: 'right', tooltip: 'Ventes prévues pour le mois qui vient, par la méthode retenue', renderer: function (v, m, r) {
                        qtip(m, 'Prévision du mois par « ' + (me.METHODES[r.get('methode')] || r.get('methode')) + ' » : ' + me.dec(v)
                                + ' · soit ' + me.dec(v / 30, 2) + ' par jour (÷ 30)');
                        return '<b>' + me.dec(v) + '</b>';
                    }},
                {text: 'Méthode', dataIndex: 'methode', width: 110, tooltip: 'Méthode de prévision retenue : celle qui s\'est le moins trompée sur les derniers mois connus (voir l\'onglet Tableau)', renderer: function (v, m) {
                        var d = Ext.Array.findBy(me.DEFINITIONS, function (x) {
                            return x[0] === v;
                        });
                        if (d) {
                            qtip(m, d[1]);
                        }
                        return me.h(me.METHODES[v] || v);
                    }},
                {text: 'Fiabilité', dataIndex: 'fiabilite', width: 105, tooltip: '100 − erreur moyenne de la méthode retenue sur les mois d\'essai (100 % = parfaite)', renderer: function (v, m, r) {
                        if (r.get('ventes12') > 0) {
                            qtip(m, 'Fiabilité = 100 − erreur moyenne (en %) de la méthode retenue sur les mois d\'essai = ' + v + ' %');
                        }
                        return r.get('ventes12') > 0 ? me.fiabilite(v) : '<span style="color:#9aa8b6">sans vente</span>';
                    }},
                {text: 'Stock', dataIndex: 'stock', width: 55, align: 'right', tooltip: 'Stock actuel, rayon et réserve', renderer: function (v, m) {
                        qtip(m, 'Stock rayon + réserve de l\'emplacement : ' + v);
                        return v > 0 ? v : '<b style="color:#c0392b">' + v + '</b>';
                    }},
                {text: 'En cours', dataIndex: 'enCours', width: 60, align: 'right', tooltip: 'Quantité en commande, pas encore livrée (commandes en cours ou passées récentes)', renderer: function (v, m) {
                        qtip(m, 'Quantité commandée pas encore livrée (commandes en cours ou passées récentes, lue en direct) : ' + v);
                        return v;
                    }},
                {text: 'Équiv. DCI', dataIndex: 'equivalents', width: 65, align: 'right', tooltip: 'Stock des équivalents DCI directs (même DCI, dosage et forme), déduit de la quantité recommandée', renderer: function (v, m) {
                        if (v > 0) {
                            qtip(m, 'Stock rayon des équivalents DCI directs (même DCI, dosage et forme) : ' + v + ', déduit du recommandé · bouton ≡ pour la liste');
                        }
                        return v > 0 ? v : '';
                    }},
                {text: 'Couverture', dataIndex: 'couverture', width: 75, align: 'right', tooltip: 'Nombre de jours de vente couverts par le stock et les commandes en cours', renderer: function (v, m, r) {
                        if (v !== null && v !== undefined && v !== '') {
                            qtip(m, '(stock ' + r.get('stock') + ' + en cours ' + r.get('enCours') + ') ÷ ventes par jour ' + me.dec(r.get('prevuMois') / 30, 2) + ' = ' + v + ' jours');
                        }
                        return v === null || v === undefined || v === '' ? '<span style="color:#9aa8b6">—</span>' : (v > 999 ? '> 999' : v) + ' j';
                    }},
                {text: 'Recommandé', dataIndex: 'recommande', width: 85, align: 'right', tooltip: 'Quantité à commander : ventes prévues sur le délai de livraison et la couverture voulue + stock de sécurité − stock − en cours − équivalents', renderer: function (v, m, r) {
                        qtip(m, me.calculRecommande(r));
                        return v > 0 ? '<b style="color:#17795f">' + v + '</b>' : '0';
                    }},
                {text: 'Valeur', dataIndex: 'valeur', width: 85, align: 'right', tooltip: 'Quantité recommandée × prix d\'achat', renderer: function (v, m, r) {
                        if (v > 0) {
                            qtip(m, r.get('recommande') + ' × prix d\'achat ' + me.nombre(r.get('paf')) + ' = ' + me.nombre(v));
                        }
                        return v > 0 ? me.nombre(v) : '';
                    }},
                {text: '', width: 62, sortable: false, menuDisabled: true, align: 'center', tooltip: 'Équivalents · retirer de la suggestion à générer',
                    renderer: function (v, m, r) {
                        var retire = !!me.retires[r.get('id')];
                        return '<span class="prev-action" data-action="equivalents" data-qtip="Équivalents (stock rayon / réserve, disponibilité PharmaML)">≡</span>'
                                + '<span class="prev-action ' + (retire ? 'remettre' : 'retirer') + '" data-action="retirer" data-qtip="'
                                + (retire ? 'Remettre ce produit dans la suggestion à générer' : 'Retirer ce produit de la suggestion à générer') + '">' + (retire ? '↺' : '✕') + '</span>';
                    }}
            ],
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        combo('filtre', 205, [{v: 'ACOMMANDER', l: 'À commander'},
                            {v: 'RUPTURE', l: 'En rupture (vendus régulièrement)'}, {v: 'SURSTOCK', l: 'En surstock'},
                            {v: 'LENTE', l: 'Rotation lente (invendus)'}, {v: 'PEU_FIABLE', l: 'Prévision peu fiable'}], 'Tous les produits suivis'),
                        combo('methode', 150, [{v: 'MOYENNE', l: 'Moyenne 3 mois'}, {v: 'SAISON', l: 'Saisonnière'},
                            {v: 'HOLT', l: 'Tendance (Holt)'}, {v: 'HOLT_WINTERS', l: 'Tendance + saison'}], 'Toutes méthodes'),
                        combo('stock', 130, [{v: 'RUPTURE', l: 'Stock à zéro'}, {v: 'EN_STOCK', l: 'En stock'}, {v: 'SURSTOCK', l: 'Surstock'}], 'Tout stock'),
                        {xtype: 'checkbox', itemId: 'equivalent', boxLabel: 'Avec équivalent en stock', listeners: {change: function () {
                                    store.loadPage(1);
                                }}},
                        {xtype: 'textfield', itemId: 'query', width: 170, emptyText: 'Nom ou CIP…', maxLength: 100, enforceMaxLength: true,
                            listeners: entree},
                        {text: 'Rechercher', iconCls: 'searchicon', handler: function () {
                                store.loadPage(1);
                            }}]},
                {xtype: 'toolbar', dock: 'top', items: [
                        {text: 'Générer une suggestion', itemId: 'btnGenerer', iconCls: 'add',
                            tooltip: 'Une suggestion par grossiste habituel, à partir de toute la liste filtrée (toutes les pages) : quantité = recommandé, lignes à 0 exclues, produits retirés exclus',
                            handler: function () {
                                me.genererSuggestion();
                            }},
                        {xtype: 'component', itemId: 'infoRetires', html: ''}, '-',
                        {text: 'Excel', icon: 'resources/images/icons/fam/excel_icon.png', tooltip: 'Exporter la liste filtrée (toutes les pages) en Excel', handler: function () {
                                window.open('../api/v1/analyse-commande/previsions/excel?' + Ext.Object.toQueryString(me.criteres()));
                            }},
                        {text: 'PDF', iconCls: 'printable', tooltip: 'Imprimer la liste filtrée (toutes les pages)', handler: function () {
                                window.open('../api/v1/analyse-commande/previsions/pdf?' + Ext.Object.toQueryString(me.criteres()));
                            }},
                        {text: 'Créer un inventaire', itemId: 'btnInventaire', icon: 'resources/images/icons/fam/table_refresh.png',
                            tooltip: 'Inventaire des produits cochés, ou de toute la liste filtrée si rien n\'est coché', handler: function () {
                                me.creerInventaire();
                            }},
                        '->', {xtype: 'component', html: '<span style="color:#7f8c8d">Clic sur une ligne : détail et calcul</span>'}]},
                {xtype: 'pagingtoolbar', dock: 'bottom', store: store, displayInfo: true,
                    items: ['-', window.PrestigeAffichage.choixLignes(store, [25, 50, 100, 200])]}],
            listeners: {
                itemclick: function (v, r, item, index, e) {
                    var action = e && e.getTarget ? e.getTarget('.prev-action') : null;
                    if (action) {
                        if (action.getAttribute('data-action') === 'equivalents') {
                            me.fenetreEquivalents(r);
                        } else {
                            me.basculerRetire(r.get('id'));
                        }
                        return;
                    }
                    if (e && e.getTarget && e.getTarget('.x-grid-row-checker')) {
                        return;
                    }
                    me.detail(r.get('id'));
                }
            }
        };
    },

    dec: function (v, n) {
        var f = Math.pow(10, n || 1);
        return String(Math.round(Number(v || 0) * f) / f).replace('.', ',');
    },

    /** Criteres de la recherche (liste, exports, inventaire et suggestion : les memes). */
    criteres: function () {
        var g = this.down('#ongletPrevisions');
        return {filtre: g.down('#filtre').getValue() || '', query: g.down('#query').getValue() || '', methode: g.down('#methode').getValue() || '',
            stock: g.down('#stock').getValue() || '', equivalent: g.down('#equivalent').getValue() ? '1' : ''};
    },

    /** Infobulle « Recommande » : le calcul de la ligne, chiffre par chiffre (meme formule que le serveur). */
    calculRecommande: function (r) {
        var me = this, parJour = r.get('prevuMois') / 30, delai = r.get('delai'), couv = me.couvertureVoulue === undefined ? 15 : me.couvertureVoulue;
        var besoin = parJour * (delai + couv), securite = 1.65 * (r.get('ecartType') / Math.sqrt(30)) * Math.sqrt(Math.max(1, delai));
        return 'Ventes par jour ' + me.dec(parJour, 2) + ' × (délai ' + delai + ' j + couverture ' + couv + ' j) = ' + me.dec(besoin)
                + ' ; + stock de sécurité ' + me.dec(securite) + ' ; − stock ' + r.get('stock') + ' ; − en cours ' + r.get('enCours')
                + ' ; − équivalents ' + r.get('equivalents') + ' = ' + r.get('recommande') + ' (arrondi au-dessus, jamais négatif)';
    },

    basculerRetire: function (id) {
        var me = this;
        if (me.retires[id]) {
            delete me.retires[id];
        } else {
            me.retires[id] = true;
        }
        var g = me.down('#ongletPrevisions'), r = g.getStore().getById(id) || g.getStore().findRecord('id', id, 0, false, true, true);
        if (r) {
            g.getView().refreshNode(g.getStore().indexOf(r));
        }
        me.majRetires();
    },

    majRetires: function () {
        var n = Ext.Object.getSize(this.retires), c = this.down('#infoRetires');
        if (c) {
            c.update(n ? '<span class="prev-info-retires">' + n + ' produit(s) retiré(s) <a href="#" data-remettre="1">tout remettre</a></span>' : '');
            var me = this, el = c.getEl();
            if (el && !c.ecoute) {
                c.ecoute = true;
                el.on('click', function (e) {
                    if (e.getTarget('[data-remettre]')) {
                        e.preventDefault();
                        me.retires = {};
                        me.down('#ongletPrevisions').getView().refresh();
                        me.majRetires();
                    }
                });
            }
        }
    },

    genererSuggestion: function () {
        var me = this, g = me.down('#ongletPrevisions'), n = g.getStore().getTotalCount(), retires = Ext.Object.getKeys(me.retires);
        Ext.MessageBox.confirm('Générer une suggestion',
                'Créer une suggestion par grossiste habituel à partir des <b>' + n + '</b> produit(s) de la liste filtrée (toutes les pages) ?<br>'
                + 'Quantité = recommandé ; lignes à 0 exclues' + (retires.length ? ' ; <b>' + retires.length + '</b> produit(s) retiré(s) exclus' : '') + '.',
                function (b) {
                    if (b !== 'yes') {
                        return;
                    }
                    Ext.MessageBox.wait('Création des suggestions…', 'Générer une suggestion');
                    Ext.Ajax.request({url: '../api/v1/analyse-commande/previsions/suggestion', method: 'POST', timeout: 300000,
                        jsonData: {criteres: me.criteres(), retires: retires},
                        success: function (r) {
                            var o = Ext.decode(r.responseText, true) || {}, sans = o.sansGrossiste || [];
                            Ext.MessageBox.hide();
                            var t = o.success ? '<b>' + (o.suggestions || o.count || 0) + '</b> suggestion(s) créée(s)'
                                    + (o.references && o.references.length ? ' : ' + Ext.String.htmlEncode(o.references.join(', ')) : '')
                                    + '<br>' + (o.count || 0) + ' produit(s) mis en suggestion' : Ext.String.htmlEncode(o.msg || 'Aucune suggestion créée.');
                            t += o.aZero ? '<br>' + o.aZero + ' produit(s) à 0 non repris' : '';
                            t += o.ignores ? '<br>' + o.ignores + ' produit(s) ignoré(s) (déconditionné ou introuvable)' : '';
                            if (sans.length) {
                                t += '<br><br><b>Sans grossiste habituel (' + sans.length + ')</b> : ' + Ext.String.htmlEncode(sans.slice(0, 15).join(', ')) + (sans.length > 15 ? '…' : '');
                            }
                            Ext.defer(function () {
                                Ext.MessageBox.show({title: 'Générer une suggestion', msg: t, width: 480, buttons: Ext.MessageBox.OK,
                                    icon: o.success ? Ext.MessageBox.INFO : Ext.MessageBox.WARNING});
                            }, 60);
                        },
                        failure: function (r) {
                            Ext.MessageBox.alert('Générer une suggestion', 'Le serveur n\'a pas répondu (' + r.status + ').');
                        }});
                });
    },

    creerInventaire: function () {
        var me = this, g = me.down('#ongletPrevisions'), coches = Ext.Array.map(g.getSelectionModel().getSelection(), function (r) {
            return r.get('id');
        });
        var n = coches.length || g.getStore().getTotalCount();
        Ext.MessageBox.confirm('Créer un inventaire', 'Créer un inventaire des <b>' + n + '</b> produit(s) '
                + (coches.length ? 'cochés' : 'de la liste filtrée (toutes les pages)') + ' ?', function (b) {
                    if (b !== 'yes') {
                        return;
                    }
                    Ext.Ajax.request({url: '../api/v1/analyse-commande/previsions/inventaire', method: 'POST', timeout: 300000,
                        jsonData: {criteres: me.criteres(), ids: coches},
                        success: function (r) {
                            var o = Ext.decode(r.responseText, true) || {};
                            Ext.MessageBox.alert('Créer un inventaire', o.success ? 'Inventaire « ' + Ext.String.htmlEncode(o.nom) + ' » créé : ' + o.count + ' produit(s).'
                                    : Ext.String.htmlEncode(o.msg || 'Inventaire non créé.'));
                        }});
                });
    },

    /** Equivalents d'un produit (lecture seule) : stock rayon / reserve, disponibilite PharmaML, retrait. */
    fenetreEquivalents: function (rec) {
        var me = this, id = rec.get('id');
        me.lire('../api/v1/analyse-commande/equivalents/' + encodeURIComponent(id), function (o) {
            var Dispo = testextjs.view.commandemanagement.disponibilite.DisponibilitePharmaMl, etat = {};
            var lignes = [{id: id, nom: rec.get('nom'), cip: rec.get('cip'), niveau: 'PRODUIT', rayon: o.rayon || 0, reserve: o.reserve || 0, prix: null, raison: 'Produit analysé'}]
                    .concat(o.data || []);
            var st = Ext.create('Ext.data.Store', {fields: ['id', 'nom', 'cip', 'niveau', 'rayon', 'reserve', 'prix', 'raison'], data: lignes});
            var w = Ext.create('Ext.window.Window', {
                title: 'Équivalents — ' + me.h(rec.get('nom')), itemId: 'fenEquivalents', width: 860, maxHeight: 520, modal: true, layout: 'fit', cls: 'prev-equivalents',
                items: [{xtype: 'grid', store: st, viewConfig: {emptyText: 'Aucun équivalent.', deferEmptyText: false},
                        columns: [
                            {text: '', width: 34, sortable: false, renderer: function (v, m, r) {
                                    return Dispo.rendu(etat[r.get('id')], m) || '';
                                }},
                            {text: 'Niveau', dataIndex: 'niveau', width: 105, renderer: function (v, m, r) {
                                    m.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(r.get('raison') || '') + '"';
                                    return v === 'PRODUIT' ? '<b>Produit</b>' : (v === 'DIRECT' ? '<span style="color:#17795f">Direct</span>' : '<span style="color:#b45309">À adapter</span>');
                                }},
                            {text: 'Désignation', dataIndex: 'nom', flex: 1},
                            {text: 'CIP', dataIndex: 'cip', width: 80},
                            {text: 'Rayon', dataIndex: 'rayon', width: 60, align: 'right'},
                            {text: 'Réserve', dataIndex: 'reserve', width: 65, align: 'right'},
                            {text: 'Prix', dataIndex: 'prix', width: 70, align: 'right', renderer: function (v) {
                                    return v === null || v === undefined ? '' : me.nombre(v);
                                }}
                        ]}],
                dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                            {xtype: 'component', html: o.sansDci ? '<span style="color:#b42318">' + me.h(o.message) + '</span>'
                                        : '<span style="color:#3b4a5a">' + (o.data || []).length + ' équivalent(s)' + (o.avertissement ? ' · ' + me.h(o.avertissement) : '') + '</span>'}]},
                    {xtype: 'toolbar', dock: 'bottom', items: [
                            {text: 'Vérifier la disponibilité PharmaML', itemId: 'btnDispoEq', disabled: !o.grossisteId,
                                tooltip: o.grossisteId ? 'Interroge ' + me.h(o.grossiste) + ' (grossiste habituel) pour le produit et ses équivalents' : 'Produit sans grossiste habituel',
                                handler: function () {
                                    Dispo.lancer({source: 'FICHE', id: id, apres: function (e) {
                                            etat = e || {};
                                            if (!w.isDestroyed) {
                                                w.down('grid').getView().refresh();
                                            }
                                        }}, st.collect('id'), o.grossisteId);
                                }},
                            '->',
                            {text: me.retires[id] ? 'Remettre dans la suggestion à générer' : 'Retirer de la suggestion à générer', itemId: 'btnRetirerEq',
                                handler: function (b) {
                                    me.basculerRetire(id);
                                    b.setText(me.retires[id] ? 'Remettre dans la suggestion à générer' : 'Retirer de la suggestion à générer');
                                }},
                            {text: 'Fermer', handler: function () {
                                    w.close();
                                }}]}]
            });
            w.show();
            Dispo.chargerEtat('FICHE', id, function (e) {
                etat = e || {};
                if (!w.isDestroyed) {
                    w.down('grid').getView().refresh();
                }
            });
        });
    },

    /** Petite courbe des 12 derniers mois (SVG), pour voir la tendance d'un coup d'oeil. */
    miniCourbe: function (historique) {
        var v = String(historique || '').split(',').filter(function (x) {
            return x !== '';
        }).map(Number).slice(-12);
        if (v.length < 2) {
            return '';
        }
        var max = Math.max.apply(null, v.concat([1])), l = 110, hgt = 22, pas = l / (v.length - 1);
        var pts = v.map(function (x, i) {
            return (i * pas).toFixed(1) + ',' + (hgt - 2 - x / max * (hgt - 4)).toFixed(1);
        }).join(' ');
        return '<svg width="' + l + '" height="' + hgt + '"><polyline fill="none" stroke="#2980b9" stroke-width="1.5" points="' + pts + '"/></svg>';
    },

    /** Fenetre produit : composant commun (aussi ouvert depuis la suggestion et la commande). */
    detail: function (id) {
        testextjs.view.commandemanagement.analyse.FenetrePrevision.ouvrir(id);
    },

    /* ------------------------------------------------------------------ Analyse */

    ongletAnalyse: function () {
        var me = this;
        var choix = Ext.create('Ext.data.Store', {
            fields: ['type', 'id', 'ref', 'grossiste', 'date', 'statut', {name: 'lignes', type: 'int'},
                {name: 'libelle', convert: function (v, r) {
                        return (r.get('type') === 'COMMANDE' ? 'Commande ' : 'Suggestion ') + (r.get('ref') || '') + ' — '
                                + (r.get('grossiste') || '') + ' — ' + (r.get('date') || '') + ' (' + r.get('lignes') + ' lignes)';
                    }}, {name: 'cle', convert: function (v, r) {
                        return r.get('type') + '|' + r.get('id');
                    }}],
            proxy: {type: 'ajax', url: '../api/v1/analyse-commande/a-analyser', reader: {type: 'json', root: 'data'}}
        });
        var store = Ext.create('Ext.data.Store', {
            fields: ['id', 'nom', 'cip', {name: 'quantite', type: 'int'}, {name: 'recommande', type: 'int'}, {name: 'ecart', type: 'int'},
                {name: 'prevuMois', type: 'float'}, {name: 'stock', type: 'int'}, {name: 'enCours', type: 'int'},
                {name: 'equivalents', type: 'int'}, 'couverture', {name: 'prix', type: 'int'}, {name: 'dernierPrix', type: 'int'},
                'fiabilite', 'methode', 'nouveau', 'alertes', 'grave']
        });
        return {
            xtype: 'grid', itemId: 'ongletAnalyse', title: 'Analyse d\'une suggestion / commande', store: store,
            listeners: {
                itemclick: function (v, r, item, index, e) {
                    if (e && e.getTarget && e.getTarget('[data-eq]')) {
                        me.fenetreEquivalents(r);
                    }
                },
                afterrender: function (g) {
                    var resume = g.down('#resume'), brancher = function (t) {
                        t.getEl().on('click', function (e) {
                            var p = e.getTarget('[data-alerte]');
                            if (p) {
                                var code = p.getAttribute('data-alerte');
                                me.filtreAlerte = me.filtreAlerte === code ? null : code;
                                me.majResume();
                                me.filtrerAlertes();
                            }
                        });
                    };
                    if (resume.rendered) {
                        brancher(resume);
                    } else {
                        resume.on('afterrender', brancher, null, {single: true});
                    }
                }
            },
            viewConfig: {emptyText: 'Choisissez une suggestion ou une commande.', deferEmptyText: false,
                getRowClass: function (r) {
                    return r.get('grave') ? 'ac-ligne-grave' : '';
                }},
            columns: [
                {text: 'Produit', dataIndex: 'nom', flex: 1, minWidth: 240, tooltip: 'Désignation · code CIP (nouveau produit : jamais vendu)',
                    renderer: function (v, m, r) {
                        return me.produitUneLigne(m, v, r.get('cip'), r.get('nouveau') ? 'nouveau produit' : '');
                    }},
                {text: 'Proposé', dataIndex: 'quantite', width: 70, align: 'right', tooltip: 'Quantité inscrite sur la suggestion ou la commande', renderer: function (v) {
                        return '<b>' + v + '</b>';
                    }},
                {text: 'Recommandé', dataIndex: 'recommande', width: 90, align: 'right', tooltip: 'Quantité que la prévision recommande pour ce produit',
                    renderer: function (v) {
                        return v > 0 ? '<b style="color:#17795f">' + v + '</b>' : '<span style="color:#17795f">0</span>';
                    }},
                {text: 'Écart', dataIndex: 'ecart', width: 65, align: 'right', tooltip: 'Proposé − recommandé : en violet, on commande plus que prévu ; en orange, moins', renderer: function (v) {
                        return v === 0 ? '0' : '<span style="color:' + (v > 0 ? '#8e44ad' : '#d35400') + '">' + (v > 0 ? '+' : '') + v + '</span>';
                    }},
                {text: 'Prévu / mois', dataIndex: 'prevuMois', width: 80, align: 'right', tooltip: 'Ventes prévues pour le mois qui vient', renderer: function (v) {
                        return String(v).replace('.', ',');
                    }},
                {text: 'Stock', dataIndex: 'stock', width: 55, align: 'right', tooltip: 'Stock actuel, rayon et réserve'},
                {text: 'En cours', dataIndex: 'enCours', width: 62, align: 'right', tooltip: 'Quantité déjà en commande, pas encore livrée'},
                {text: 'Couverture', dataIndex: 'couverture', width: 75, align: 'right', tooltip: 'Jours de vente couverts par le stock et les commandes en cours', renderer: function (v) {
                        return v === null || v === undefined || v === '' ? '—' : (v > 999 ? '> 999' : v) + ' j';
                    }},
                {text: 'Prix / dernier', dataIndex: 'prix', width: 130, align: 'right',
                    tooltip: 'Prix d\'achat de la ligne / prix payé au dernier achat de ce produit',
                    renderer: function (v, m, r) {
                        return me.nombre(v) + (r.get('dernierPrix') ? ' <span style="color:#7f8c8d">/ ' + me.nombre(r.get('dernierPrix')) + '</span>' : '');
                    }},
                {text: 'Alertes', dataIndex: 'alertes', flex: 1, minWidth: 230, tooltip: 'Points à vérifier sur la ligne (survoler la cellule pour le détail)', renderer: function (v, m) {
                        var a = v || [];
                        if (!a.length) {
                            return '<span style="color:#27ae60">✓ conforme</span>';
                        }
                        m.tdAttr = 'data-qtip="' + me.h(a.map(function (x) {
                            return '• ' + x.texte;
                        }).join('<br>')) + '"';
                        return a.map(function (x) {
                            var d = me.ALERTES[x.code] || [x.code, '#555'];
                            /* retours du 10/10 : « equivalent DCI en stock » cliquable -> liste des equivalents */
                            return '<span class="ac-puce' + (x.code === 'EQUIVALENT' ? ' ac-puce-eq" data-eq="1' : '') + '" style="border-color:' + d[1] + ';color:' + d[1] + '">' + d[0] + '</span>';
                        }).join(' ');
                    }}
            ],
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        /* retours du 10/10 : zone de choix sur toute la ligne, nombre de lignes en vert */
                        {xtype: 'combobox', itemId: 'choix', flex: 1, maxWidth: 4000, editable: false, queryMode: 'local', store: choix,
                            displayField: 'libelle', valueField: 'cle', emptyText: 'Choisir une suggestion active ou une commande en cours…',
                            listConfig: {getInnerTpl: function () {
                                    return '{[values.type === "COMMANDE" ? "Commande" : "Suggestion"]} <b>{ref:htmlEncode}</b> — {grossiste:htmlEncode} — {date}'
                                            + ' <span class="ac-nb-lignes">({lignes} lignes)</span>';
                                }},
                            listeners: {select: function () {
                                    me.analyser();
                                }}},
                        {text: 'Actualiser', iconCls: 'refresh', handler: function () {
                                choix.load();
                                me.analyser();
                            }}]},
                {xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'checkbox', itemId: 'seulementAlertes', boxLabel: 'Lignes avec alerte seulement',
                            listeners: {change: function () {
                                    me.filtrerAlertes();
                                }}},
                        {xtype: 'combobox', itemId: 'filtreRecommande', width: 175, editable: false, queryMode: 'local', displayField: 'l', valueField: 'v', value: '',
                            store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: [{v: '', l: 'Tout recommandé'}, {v: 'POSITIF', l: 'Recommandé > 0'},
                                    {v: 'ZERO', l: 'Recommandé = 0'}, {v: 'ECART', l: 'Proposé ≠ recommandé'}]}),
                            listeners: {select: function () {
                                    me.filtrerAlertes();
                                }}},
                        {xtype: 'combobox', itemId: 'filtreStock', width: 130, editable: false, queryMode: 'local', displayField: 'l', valueField: 'v', value: '',
                            store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: [{v: '', l: 'Tout stock'}, {v: 'ZERO', l: 'Stock à zéro'}, {v: 'EN_STOCK', l: 'En stock'}]}),
                            listeners: {select: function () {
                                    me.filtrerAlertes();
                                }}},
                        '-',
                        {text: 'Appliquer les quantités recommandées', itemId: 'btnAppliquer', iconCls: 'save', disabled: true,
                            tooltip: 'Met la quantité recommandée sur chaque ligne de la suggestion ou de la commande choisie ; une ligne recommandée à 0 est supprimée',
                            handler: function () {
                                me.appliquerRecommande();
                            }},
                        '->',
                        {text: 'Excel', itemId: 'btnExcelAnalyse', disabled: true, icon: 'resources/images/icons/fam/excel_icon.png', tooltip: 'Exporter l\'analyse en Excel', handler: function () {
                                me.exporterAnalyse('excel');
                            }},
                        {text: 'PDF', itemId: 'btnPdfAnalyse', disabled: true, iconCls: 'printable', tooltip: 'Imprimer l\'analyse', handler: function () {
                                me.exporterAnalyse('pdf');
                            }},
                        {text: 'Créer un inventaire', itemId: 'btnInventaireAnalyse', disabled: true, icon: 'resources/images/icons/fam/table_refresh.png',
                            tooltip: 'Inventaire des produits des lignes affichées', handler: function () {
                                me.inventaireAnalyse();
                            }}]},
                {xtype: 'toolbar', dock: 'top', itemId: 'resume', hidden: true, items: [{xtype: 'component', itemId: 'resumeTexte', html: ''}]}]
        };
    },

    analyser: function () {
        var me = this, g = me.down('#ongletAnalyse'), v = g.down('#choix').getValue();
        if (!v) {
            return;
        }
        var p = v.split('|');
        g.setLoading('Analyse…');
        me.lire('../api/v1/analyse-commande/analyse?type=' + p[0] + '&id=' + encodeURIComponent(p[1]), function (o) {
            g.setLoading(false);
            g.getStore().loadData(o.data || []);
            me.filtreAlerte = null;
            me.derniereAnalyse = o;
            me.filtrerAlertes();
            me.majResume();
            Ext.each(['#btnAppliquer', '#btnExcelAnalyse', '#btnPdfAnalyse', '#btnInventaireAnalyse'], function (b) {
                g.down(b).setDisabled(!(o.data || []).length);
            });
        });
        Ext.defer(function () {
            g.setLoading(false);
        }, 120000);
    },

    /** Resume de l'analyse ; retours du 10/10 : chaque pastille d'alerte filtre la liste (nouveau clic : retire le filtre). */
    majResume: function () {
        var me = this, g = me.down('#ongletAnalyse'), o = me.derniereAnalyse || {}, r = o.resume || {}, puces = [];
        Ext.Object.each(me.ALERTES, function (k, d) {
            if (r[k]) {
                puces.push('<span class="ac-puce ac-puce-filtre' + (me.filtreAlerte === k ? ' actif' : '') + '" data-alerte="' + k + '" data-qtip="Afficher seulement ces lignes (nouveau clic : toutes)"'
                        + ' style="border-color:' + d[1] + ';color:' + d[1] + '">' + d[0] + ' : ' + r[k] + '</span>');
            }
        });
        g.down('#resume').show();
        g.down('#resumeTexte').update('<b class="ac-nb-lignes">' + (r.lignes || 0) + '</b> lignes, <b>' + (r.lignesAlerte || 0) + '</b> avec alerte · valeur proposée <b>'
                + me.nombre(r.valeurProposee) + ' F</b>, recommandée <b style="color:#17795f">' + me.nombre(r.valeurRecommandee) + ' F</b> ' + puces.join(' ')
                + (o.calcule === false ? ' <span style="color:#c0392b">· prévisions non calculées : recalculez dans l\'onglet Tableau</span>' : ''));
    },

    filtrerAlertes: function () {
        var me = this, g = me.down('#ongletAnalyse'), st = g.getStore(), seul = g.down('#seulementAlertes').getValue(),
                rec = g.down('#filtreRecommande').getValue(), stock = g.down('#filtreStock').getValue(), code = me.filtreAlerte;
        st.clearFilter();
        st.filterBy(function (r) {
            var a = r.get('alertes') || [];
            if (seul && !a.length) {
                return false;
            }
            if (code && !Ext.Array.some(a, function (x) {
                return x.code === code;
            })) {
                return false;
            }
            if ((rec === 'POSITIF' && r.get('recommande') <= 0) || (rec === 'ZERO' && r.get('recommande') !== 0) || (rec === 'ECART' && r.get('ecart') === 0)) {
                return false;
            }
            return !((stock === 'ZERO' && r.get('stock') > 0) || (stock === 'EN_STOCK' && r.get('stock') <= 0));
        });
    },

    choixAnalyse: function () {
        var v = this.down('#ongletAnalyse #choix').getValue();
        return v ? {type: v.split('|')[0], id: v.split('|')[1]} : null;
    },

    appliquerRecommande: function () {
        var me = this, c = me.choixAnalyse(), st = me.down('#ongletAnalyse').getStore();
        if (!c) {
            return;
        }
        var lignes = st.snapshot ? st.snapshot.getRange() : st.getRange(), zero = 0, change = 0;
        Ext.each(lignes, function (r) {
            if (r.get('recommande') === 0) {
                zero++;
            } else if (r.get('recommande') !== r.get('quantite')) {
                change++;
            }
        });
        Ext.MessageBox.confirm('Appliquer les quantités recommandées', 'Sur ' + (c.type === 'COMMANDE' ? 'la commande' : 'la suggestion') + ' choisie :<br>'
                + '• <b>' + change + '</b> ligne(s) prendront la quantité recommandée ;<br>• <b>' + zero + '</b> ligne(s) recommandée(s) à 0 seront supprimées'
                + (c.type === 'SUGGESTION' ? ' (récupérables dans les produits retirés)' : '') + '.<br>Toutes les lignes sont concernées, quel que soit le filtre affiché.',
                function (b) {
                    if (b !== 'yes') {
                        return;
                    }
                    me.lire('../api/v1/analyse-commande/analyse/appliquer', function (o) {
                        Ext.MessageBox.alert('Appliquer les quantités recommandées', o.modifiees + ' ligne(s) modifiée(s), ' + o.supprimees + ' supprimée(s), '
                                + o.inchangees + ' inchangée(s).');
                        me.down('#ongletAnalyse #choix').getStore().load();
                        me.analyser();
                    }, 'POST', {type: c.type, id: c.id});
                });
    },

    exporterAnalyse: function (format) {
        var c = this.choixAnalyse();
        if (c) {
            window.open('../api/v1/analyse-commande/analyse/' + format + '?' + Ext.Object.toQueryString(c));
        }
    },

    inventaireAnalyse: function () {
        var me = this, st = me.down('#ongletAnalyse').getStore(), ids = st.collect('id');
        if (!ids.length) {
            return;
        }
        Ext.MessageBox.confirm('Créer un inventaire', 'Créer un inventaire des <b>' + ids.length + '</b> produit(s) affiché(s) ?', function (b) {
            if (b !== 'yes') {
                return;
            }
            me.lire('../api/v1/analyse-commande/previsions/inventaire', function (o) {
                Ext.MessageBox.alert('Créer un inventaire', 'Inventaire « ' + me.h(o.nom) + ' » créé : ' + o.count + ' produit(s).');
            }, 'POST', {ids: ids});
        });
    }
});
