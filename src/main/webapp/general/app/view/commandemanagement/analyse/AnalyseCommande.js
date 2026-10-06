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
    id: 'analysecommandeID',
    title: 'Analyse Suggestion / Commande',
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
    lire: function (url, ok, methode) {
        var me = this;
        Ext.Ajax.request({url: url, method: methode || 'GET', timeout: 300000,
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
            items: [{xtype: 'component', itemId: 'tuiles', html: '<div style="color:#7f8c8d">Chargement…</div>'}]
        };
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
            var tuile = function (cls, titre, valeur, detail, filtre, aide) {
                return '<div class="ac-tuile ' + cls + '"' + (filtre ? ' data-filtre="' + filtre + '"' : '')
                        + ' data-qtip="' + me.h(aide) + '"><div class="ac-t">' + titre + '</div><div class="ac-v">' + valeur
                        + '</div><div class="ac-d">' + detail + '</div></div>';
            };
            var html = '<div class="ac-tuiles">'
                    + tuile('t-rouge', 'Taux de rupture', (o.tauxRupture || 0).toLocaleString('fr-FR') + ' %',
                            me.nombre(o.ruptures) + ' produits vendus régulièrement sans stock', 'RUPTURE',
                            'Parmi les produits dont la prévision est d\'au moins 1 par mois, part de ceux dont le stock est nul')
                    + tuile('t-violet', 'Invendus', me.nombre(o.valeurInvendus) + ' F',
                            me.nombre(o.invendus) + ' produits sans vente depuis ' + o.joursLente + ' j (valeur d\'achat)', 'LENTE',
                            'Valeur au prix d\'achat du stock des produits sans vente depuis ' + o.joursLente + ' jours')
                    + tuile('t-bleu', 'Couverture moyenne', o.couvertureMoyenne === null ? '—' : o.couvertureMoyenne + ' j',
                            me.nombre(o.surstock) + ' produits au-delà de ' + o.joursSurstock + ' j', 'SURSTOCK',
                            'Jours de vente couverts par le stock et les commandes en cours (plafonné à 1 an par produit)')
                    + tuile('t-vert', 'Fiabilité des prévisions', o.fiabilite === null ? '—' : o.fiabilite + ' %',
                            'pondérée par les ventes des 12 derniers mois', 'PEU_FIABLE',
                            '100 − erreur moyenne de la méthode retenue, mesurée sur les 6 derniers mois connus')
                    + tuile('t-orange', 'À commander', me.nombre(o.aCommander) + ' produits',
                            me.nombre(o.valeurACommander) + ' F au prix d\'achat', 'ACOMMANDER',
                            'Produits dont la quantité recommandée est positive')
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
                d.onclick = function () {
                    me.ouvrirPrevisions(d.getAttribute('data-filtre'));
                };
            });
        });
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
        var store = Ext.create('Ext.data.Store', {
            fields: ['id', 'nom', 'cip', 'methode', {name: 'prevuMois', type: 'float'}, {name: 'fiabilite', type: 'int'},
                {name: 'ventes12', type: 'int'}, 'derniereVente', {name: 'stock', type: 'int'}, {name: 'enCours', type: 'int'},
                {name: 'equivalents', type: 'int'}, {name: 'delai', type: 'int'}, 'couverture', {name: 'recommande', type: 'int'},
                {name: 'paf', type: 'int'}, {name: 'valeur', type: 'int'}, 'grossiste', 'historique'],
            pageSize: 25, remoteSort: false, autoLoad: false,
            proxy: {type: 'ajax', url: '../api/v1/analyse-commande/previsions', timeout: 120000,
                reader: {type: 'json', root: 'data', totalProperty: 'total'}}
        });
        store.on('beforeload', function (st) {
            var g = me.down('#ongletPrevisions');
            st.getProxy().extraParams = {filtre: g.down('#filtre').getValue() || '', query: g.down('#query').getValue() || ''};
        });
        var entree = {specialkey: function (f, e) {
                if (e.getKey() === e.ENTER) {
                    store.loadPage(1);
                }
            }};
        return {
            xtype: 'grid', itemId: 'ongletPrevisions', title: 'Prévisions', store: store,
            viewConfig: {emptyText: 'Aucun produit pour ces critères.', deferEmptyText: false, stripeRows: true},
            columns: [
                {text: 'Produit', dataIndex: 'nom', flex: 1, minWidth: 220, renderer: function (v, m, r) {
                        return '<b>' + me.h(v) + '</b><br><span style="color:#7f8c8d">' + me.h(r.get('cip')) + ' · ' + me.h(r.get('grossiste')) + '</span>';
                    }},
                {text: 'Ventes 12 mois', dataIndex: 'ventes12', width: 90, align: 'right'},
                {text: 'Tendance', dataIndex: 'historique', width: 120, sortable: false, renderer: function (v) {
                        return me.miniCourbe(v);
                    }},
                {text: 'Prévu / mois', dataIndex: 'prevuMois', width: 85, align: 'right', renderer: function (v) {
                        return '<b>' + String(v).replace('.', ',') + '</b>';
                    }},
                {text: 'Méthode', dataIndex: 'methode', width: 115, renderer: function (v) {
                        return me.h(me.METHODES[v] || v);
                    }},
                {text: 'Fiabilité', dataIndex: 'fiabilite', width: 110, renderer: function (v, m, r) {
                        return r.get('ventes12') > 0 ? me.fiabilite(v) : '<span style="color:#9aa8b6">sans vente</span>';
                    }},
                {text: 'Stock', dataIndex: 'stock', width: 60, align: 'right', renderer: function (v) {
                        return v > 0 ? v : '<b style="color:#c0392b">' + v + '</b>';
                    }},
                {text: 'En cours', dataIndex: 'enCours', width: 65, align: 'right'},
                {text: 'Équiv. DCI', dataIndex: 'equivalents', width: 70, align: 'right', renderer: function (v, m) {
                        if (v > 0) {
                            m.tdAttr = 'data-qtip="Stock des équivalents DCI directs (même DCI, dosage et forme)"';
                        }
                        return v > 0 ? v : '';
                    }},
                {text: 'Couverture', dataIndex: 'couverture', width: 80, align: 'right', renderer: function (v) {
                        return v === null || v === undefined || v === '' ? '<span style="color:#9aa8b6">—</span>' : (v > 999 ? '> 999' : v) + ' j';
                    }},
                {text: 'Recommandé', dataIndex: 'recommande', width: 90, align: 'right', renderer: function (v) {
                        return v > 0 ? '<b style="color:#d35400">' + v + '</b>' : '0';
                    }},
                {text: 'Valeur', dataIndex: 'valeur', width: 90, align: 'right', renderer: function (v) {
                        return v > 0 ? me.nombre(v) : '';
                    }}
            ],
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'combobox', itemId: 'filtre', width: 230, editable: false, queryMode: 'local', displayField: 'l',
                            valueField: 'v', value: '',
                            store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: [
                                    {v: '', l: 'Tous les produits suivis'}, {v: 'ACOMMANDER', l: 'À commander'},
                                    {v: 'RUPTURE', l: 'En rupture (vendus régulièrement)'}, {v: 'SURSTOCK', l: 'En surstock'},
                                    {v: 'LENTE', l: 'Rotation lente (invendus)'}, {v: 'PEU_FIABLE', l: 'Prévision peu fiable (< 50 %)'}]}),
                            listeners: {select: function () {
                                    store.loadPage(1);
                                }}},
                        {xtype: 'textfield', itemId: 'query', width: 220, emptyText: 'Nom ou CIP…', maxLength: 100, enforceMaxLength: true,
                            listeners: entree},
                        {text: 'Rechercher', iconCls: 'searchicon', handler: function () {
                                store.loadPage(1);
                            }},
                        '->', {xtype: 'component', html: '<span style="color:#7f8c8d">Un clic sur une ligne : détail et calcul</span>'}]},
                {xtype: 'pagingtoolbar', dock: 'bottom', store: store, displayInfo: true}],
            listeners: {itemclick: function (v, r) {
                    me.detail(r.get('id'));
                }}
        };
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

    detail: function (id) {
        var me = this;
        me.lire('../api/v1/analyse-commande/produit/' + encodeURIComponent(id), function (o) {
            var mois = o.mois || [], max = 1;
            mois.forEach(function (m) {
                max = Math.max(max, m.ventes);
            });
            max = Math.max(max, o.prevuMois);
            var l = 760, hgt = 190, n = mois.length + 1, larg = Math.max(8, Math.floor(l / n) - 6), svg = '';
            mois.forEach(function (m, i) {
                var hh = Math.round(m.ventes / max * (hgt - 30)), x = i * (l / n) + 3;
                svg += '<rect rx="3" x="' + x + '" y="' + (hgt - 18 - hh) + '" width="' + larg + '" height="' + hh + '" fill="#7fb3d5"><title>'
                        + me.h(m.mois) + ' : ' + m.ventes + '</title></rect>'
                        + (i % 3 === 0 ? '<text x="' + x + '" y="' + (hgt - 4) + '" font-size="10" fill="#7f8c8d">' + me.h(m.mois) + '</text>' : '');
            });
            var hp = Math.round(o.prevuMois / max * (hgt - 30)), xp = mois.length * (l / n) + 3;
            svg += '<rect rx="3" x="' + xp + '" y="' + (hgt - 18 - hp) + '" width="' + larg + '" height="' + hp
                    + '" fill="#e67e22" stroke="#d35400" stroke-dasharray="3,2"><title>Prévu ' + me.h(o.prochainMois) + ' : '
                    + String(o.prevuMois).replace('.', ',') + '</title></rect><text x="' + (xp - 4) + '" y="' + (hgt - 4)
                    + '" font-size="10" fill="#d35400">prévu</text>';
            var c = o.calcul || {};
            var methodes = (o.methodes || []).map(function (m) {
                return '<tr' + (m.retenue ? ' style="font-weight:700;background:#fef5e7"' : '') + '><td>' + me.h(me.METHODES[m.methode] || m.methode)
                        + (m.retenue ? ' ✓' : '') + '</td><td class="n">' + String(m.erreur).replace('.', ',') + ' %</td></tr>';
            }).join('') || '<tr><td colspan="2" style="color:#7f8c8d">Pas assez d\'historique pour comparer les méthodes (moins de 4 mois).</td></tr>';
            var html = '<div class="ac-detail">'
                    + '<div class="ac-bloc-t">Ventes mensuelles (' + mois.length + ' derniers mois complets) et prévision de ' + me.h(o.prochainMois) + '</div>'
                    + '<svg width="' + l + '" height="' + hgt + '">' + svg + '</svg>'
                    + '<div class="ac-colonnes"><div><div class="ac-bloc-t">Méthodes essayées (erreur sur les 6 derniers mois connus)</div>'
                    + '<table class="ac-table"><tr><th>Méthode</th><th class="n">Erreur</th></tr>' + methodes + '</table>'
                    + '<div class="ac-note">Fiabilité retenue : ' + me.fiabilite(o.fiabilite) + '</div></div>'
                    + '<div><div class="ac-bloc-t">Quantité recommandée : ' + o.recommande + '</div><table class="ac-table">'
                    + '<tr><td>Ventes prévues par jour</td><td class="n">' + String(c.parJour).replace('.', ',') + '</td></tr>'
                    + '<tr><td>× (délai ' + c.delai + ' j + couverture ' + c.couvertureVoulue + ' j)</td><td class="n">' + String(c.besoin).replace('.', ',') + '</td></tr>'
                    + '<tr><td>+ stock de sécurité (95 %)</td><td class="n">' + String(c.securite).replace('.', ',') + '</td></tr>'
                    + '<tr><td>− stock rayon et réserve</td><td class="n">' + o.stock + '</td></tr>'
                    + '<tr><td>− commandes en cours</td><td class="n">' + o.enCours + '</td></tr>'
                    + '<tr><td>− équivalents DCI directs en stock</td><td class="n">' + o.equivalents + '</td></tr>'
                    + '<tr style="font-weight:700"><td>= à commander (arrondi, jamais négatif)</td><td class="n">' + o.recommande + '</td></tr></table>'
                    + '<div class="ac-note">Dernière vente : ' + me.h(o.derniereVente || 'jamais') + '</div></div></div></div>';
            Ext.create('Ext.window.Window', {
                title: me.h(o.nom) + ' — ' + me.h(o.cip), width: 820, maxHeight: Ext.getBody().getViewSize().height - 40,
                autoScroll: true, modal: true, bodyPadding: 12, html: html,
                buttons: [{text: 'Fermer', handler: function (b) {
                            b.up('window').close();
                        }}]
            }).show();
        });
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
            viewConfig: {emptyText: 'Choisissez une suggestion ou une commande.', deferEmptyText: false,
                getRowClass: function (r) {
                    return r.get('grave') ? 'ac-ligne-grave' : '';
                }},
            columns: [
                {text: 'Produit', dataIndex: 'nom', flex: 1, minWidth: 200, renderer: function (v, m, r) {
                        return '<b>' + me.h(v) + '</b><br><span style="color:#7f8c8d">' + me.h(r.get('cip'))
                                + (r.get('nouveau') ? ' · nouveau produit' : '') + '</span>';
                    }},
                {text: 'Proposé', dataIndex: 'quantite', width: 70, align: 'right', renderer: function (v) {
                        return '<b>' + v + '</b>';
                    }},
                {text: 'Recommandé', dataIndex: 'recommande', width: 90, align: 'right'},
                {text: 'Écart', dataIndex: 'ecart', width: 65, align: 'right', renderer: function (v) {
                        return v === 0 ? '0' : '<span style="color:' + (v > 0 ? '#8e44ad' : '#d35400') + '">' + (v > 0 ? '+' : '') + v + '</span>';
                    }},
                {text: 'Prévu / mois', dataIndex: 'prevuMois', width: 80, align: 'right', renderer: function (v) {
                        return String(v).replace('.', ',');
                    }},
                {text: 'Stock', dataIndex: 'stock', width: 55, align: 'right'},
                {text: 'En cours', dataIndex: 'enCours', width: 62, align: 'right'},
                {text: 'Couverture', dataIndex: 'couverture', width: 75, align: 'right', renderer: function (v) {
                        return v === null || v === undefined || v === '' ? '—' : (v > 999 ? '> 999' : v) + ' j';
                    }},
                {text: 'Prix / dernier', dataIndex: 'prix', width: 105, align: 'right', renderer: function (v, m, r) {
                        return me.nombre(v) + (r.get('dernierPrix') ? '<br><span style="color:#7f8c8d">' + me.nombre(r.get('dernierPrix')) + '</span>' : '');
                    }},
                {text: 'Alertes', dataIndex: 'alertes', flex: 1, minWidth: 230, renderer: function (v, m) {
                        var a = v || [];
                        if (!a.length) {
                            return '<span style="color:#27ae60">✓ conforme</span>';
                        }
                        m.tdAttr = 'data-qtip="' + me.h(a.map(function (x) {
                            return '• ' + x.texte;
                        }).join('<br>')) + '"';
                        return a.map(function (x) {
                            var d = me.ALERTES[x.code] || [x.code, '#555'];
                            return '<span class="ac-puce" style="border-color:' + d[1] + ';color:' + d[1] + '">' + d[0] + '</span>';
                        }).join(' ');
                    }}
            ],
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'combobox', itemId: 'choix', width: 520, editable: false, queryMode: 'local', store: choix,
                            displayField: 'libelle', valueField: 'cle', emptyText: 'Choisir une suggestion ou une commande…',
                            listeners: {select: function () {
                                    me.analyser();
                                }}},
                        {xtype: 'checkbox', itemId: 'seulementAlertes', boxLabel: 'Lignes avec alerte seulement', margin: '0 0 0 10',
                            listeners: {change: function () {
                                    me.filtrerAlertes();
                                }}},
                        {text: 'Actualiser', iconCls: 'refresh', handler: function () {
                                choix.load();
                                me.analyser();
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
            me.filtrerAlertes();
            var r = o.resume || {}, puces = [];
            Ext.Object.each(me.ALERTES, function (k, d) {
                if (r[k]) {
                    puces.push('<span class="ac-puce" style="border-color:' + d[1] + ';color:' + d[1] + '">' + d[0] + ' : ' + r[k] + '</span>');
                }
            });
            g.down('#resume').show();
            g.down('#resumeTexte').update('<b>' + (r.lignes || 0) + '</b> lignes, <b>' + (r.lignesAlerte || 0) + '</b> avec alerte · valeur proposée <b>'
                    + me.nombre(r.valeurProposee) + ' F</b>, recommandée <b>' + me.nombre(r.valeurRecommandee) + ' F</b> ' + puces.join(' ')
                    + (o.calcule === false ? ' <span style="color:#c0392b">· prévisions non calculées : recalculez dans l\'onglet Tableau</span>' : ''));
        });
        Ext.defer(function () {
            g.setLoading(false);
        }, 120000);
    },

    filtrerAlertes: function () {
        var me = this, g = me.down('#ongletAnalyse'), st = g.getStore();
        st.clearFilter();
        if (g.down('#seulementAlertes').getValue()) {
            st.filterBy(function (r) {
                return (r.get('alertes') || []).length > 0;
            });
        }
    }
});
