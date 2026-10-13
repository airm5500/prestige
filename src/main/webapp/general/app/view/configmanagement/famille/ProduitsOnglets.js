/* global Ext */

/*
 * Besoins du 11/10 (point 13) : menu « Produits » en deux onglets :
 *  - Liste : l'ecran existant (produitsxx), sans changement de fonctionnement ;
 *  - Analyse : nombre de ventes, quantites, chiffre d'affaires et marge par jour, semaine, mois ou annee, et produits
 *    qui font le plus de chiffre (API v1/analyse-produits, meme formule de marge que le Pilotage).
 * Le menu ouvre ce conteneur (App.ecranReel) ; la liste garde ses identifiants et ses tests.
 */
Ext.define('testextjs.view.configmanagement.famille.ProduitsOnglets', {
    extend: 'Ext.panel.Panel',
    xtype: 'produitsonglets',
    requires: ['testextjs.view.configmanagement.famille.Products', 'testextjs.view.commun.RaccourcisPeriode', 'Ext.chart.*'],
    layout: 'card',
    border: false,
    header: false,
    cls: 'cec-hub pa-hub',
    config: {
        nameintern: '',
        titre: '',
        odatasource: ''
    },

    ONGLETS: [{cle: 'liste', texte: 'Liste', aide: 'Articles et coches'},
        {cle: 'analyse', texte: 'Analyse', aide: 'Ventes, chiffre d\'affaires et marge par jour, semaine, mois ou année'}],
    MESURES: [{cle: 'ca', texte: 'CA', aide: 'Chiffre d\'affaires TTC net de remise'},
        {cle: 'marge', texte: 'Marge', aide: 'CA hors taxes − prix d\'achat × quantité'},
        {cle: 'ventes', texte: 'Ventes', aide: 'Nombre de ventes (tickets)'},
        {cle: 'quantite', texte: 'Quantités', aide: 'Unités vendues'}],
    MOIS: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],

    initComponent: function () {
        var me = this;
        me.mesure = 'ca';
        me.liste = Ext.create('testextjs.view.configmanagement.famille.Products', {header: false});
        me.habiller(me.liste);
        me.serie = Ext.create('Ext.data.Store', {fields: ['cle', 'libelle', 'ventes', 'quantite', 'ca', 'caHT', 'marge', 'taux']});
        me.analyse = me.creerAnalyse();
        Ext.apply(me, {
            items: [me.liste, me.analyse],
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', itemId: 'ongletsPa', cls: 'cec-onglets', layout: {type: 'hbox', pack: 'start', align: 'middle'},
                    items: Ext.Array.map(me.ONGLETS, function (o) {
                        return {xtype: 'button', itemId: 'pa-' + o.cle, text: o.texte, cls: 'cec-onglet', toggleGroup: 'pa-onglets-' + me.id,
                            allowDepress: false, pressed: o.cle === 'liste', tooltip: o.aide, handler: function () {
                                me.afficher(o.cle);
                            }};
                    })
                }]
        });
        me.callParent(arguments);
    },

    habiller: function (ecran) {
        var A = window.PrestigeAffichage;
        if (A && (A.THEME_PARTOUT || Ext.Array.some(A.ECRANS_STYLE_VENTE || [], function (x) {
            return ecran.isXType(x);
        }))) {
            A.habillerStyleVente(ecran);
        }
    },

    afficher: function (cle) {
        var me = this;
        Ext.each(me.ONGLETS, function (x) {
            var b = me.down('#pa-' + x.cle);
            if (b && b.pressed !== (x.cle === cle)) {
                b.toggle(x.cle === cle, true);
            }
        });
        if (cle === 'analyse') {
            me.getLayout().setActiveItem(me.analyse);
            if (!me.donnees) {
                me.chargerAnalyse();
            }
            return me.analyse;
        }
        me.getLayout().setActiveItem(me.liste);
        return me.liste;
    },

    creerAnalyse: function () {
        var me = this, aujourdhui = new Date();
        var liste = function (url) {
            return Ext.create('Ext.data.Store', {
                fields: ['id', 'libelle'], pageSize: 9999,
                proxy: {type: 'ajax', url: url, reader: {type: 'json', root: 'data', totalProperty: 'total'}}
            });
        };
        var relancer = {select: function () {
                me.chargerAnalyse();
            }};
        return Ext.create('Ext.panel.Panel', {
            itemId: 'analyseProduits', autoScroll: true, bodyPadding: 12, cls: 'pa-analyse',
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'datefield', itemId: 'paDebut', fieldLabel: 'Du', labelWidth: 22, width: 135, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: Ext.Date.getFirstDateOfMonth(aujourdhui), maxValue: aujourdhui},
                        {xtype: 'datefield', itemId: 'paFin', fieldLabel: 'au', labelWidth: 20, width: 133, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: aujourdhui, maxValue: aujourdhui,
                            plugins: [{ptype: 'raccourcisperiode', debut: 'paDebut', declencher: 'paActualiser'}]},
                        {xtype: 'combobox', itemId: 'paPas', fieldLabel: 'Par', labelWidth: 25, width: 125, editable: false, queryMode: 'local',
                            valueField: 'v', displayField: 'l', value: 'JOUR', listeners: relancer,
                            store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: [{v: 'JOUR', l: 'Jour'}, {v: 'SEMAINE', l: 'Semaine'},
                                    {v: 'MOIS', l: 'Mois'}, {v: 'ANNEE', l: 'Année'}]})},
                        {xtype: 'textfield', itemId: 'paRecherche', emptyText: 'Nom ou CIP (début)…', width: 190, maxLength: 100, enforceMaxLength: true,
                            listeners: {specialkey: function (f, e) {
                                    if (e.getKey() === e.ENTER) {
                                        me.chargerAnalyse();
                                    }
                                }}},
                        {xtype: 'combobox', itemId: 'paRayon', width: 170, store: liste('../api/v1/common/rayons'), valueField: 'id', displayField: 'libelle',
                            queryMode: 'remote', minChars: 2, pageSize: 99999, emptyText: 'Tous les emplacements', listeners: relancer},
                        {xtype: 'combobox', itemId: 'paGrossiste', width: 170, store: liste('../api/v1/common/grossiste'), valueField: 'id',
                            displayField: 'libelle', queryMode: 'remote', minChars: 2, pageSize: 99999, emptyText: 'Tous les grossistes', listeners: relancer},
                        {text: 'Actualiser', itemId: 'paActualiser', iconCls: 'refresh', tooltip: 'Recalculer l\'analyse', handler: function () {
                                me.chargerAnalyse();
                            }}]}],
            items: [
                {xtype: 'component', itemId: 'paTuiles', html: ''},
                {xtype: 'toolbar', itemId: 'paMesures', border: false, style: 'background:transparent', margin: '6 0 0 0',
                    items: [{xtype: 'tbtext', text: '<b>Graphique :</b>'}].concat(Ext.Array.map(me.MESURES, function (m) {
                        return {xtype: 'button', itemId: 'pa-mesure-' + m.cle, text: m.texte, tooltip: m.aide, toggleGroup: 'pa-mesures-' + me.id,
                            allowDepress: false, pressed: m.cle === me.mesure, handler: function () {
                                me.mesure = m.cle;
                                me.dessinerGraphique();
                            }};
                    }))},
                {xtype: 'container', itemId: 'paGraphique', height: 300, layout: 'fit'},
                {xtype: 'component', itemId: 'paTableaux', html: ''}
            ]
        });
    },

    /** Libelle lisible d'une cle de periode : 2026-10-05 → 05/10/2026, 2026-S41 → S41 2026, 2026-10 → oct. 2026. */
    libelle: function (cle) {
        var c = String(cle || ''), m;
        if ((m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(c))) {
            return m[3] + '/' + m[2] + '/' + m[1];
        }
        if ((m = /^(\d{4})-S(\d{2})$/.exec(c))) {
            return 'S' + m[2] + ' ' + m[1];
        }
        if ((m = /^(\d{4})-(\d{2})$/.exec(c))) {
            return this.MOIS[parseInt(m[2], 10) - 1] + ' ' + m[1];
        }
        return c;
    },

    chargerAnalyse: function () {
        var me = this, a = me.analyse, msg = a.down('#paTableaux');
        var debut = a.down('#paDebut').getValue(), fin = a.down('#paFin').getValue(), pas = a.down('#paPas');
        if (debut && fin && debut > fin) {
            msg.update('<span style="color:#b42318">La date de début doit précéder la date de fin.</span>');
            return;
        }
        /* par jour sur plus de 400 jours : illisible, le pas passe au mois (le serveur le refuserait) */
        if (debut && fin && pas.getValue() === 'JOUR' && Ext.Date.getElapsed(debut, fin) / 86400000 >= 400) {
            pas.setValue('MOIS');
        }
        a.setLoading('Calcul…');
        me.enCours = true;
        Ext.Ajax.request({url: '../api/v1/analyse-produits', method: 'GET', timeout: 180000, params: {
                debut: a.down('#paDebut').getSubmitValue(), fin: a.down('#paFin').getSubmitValue(), pas: pas.getValue(),
                query: a.down('#paRecherche').getValue() || '', rayonId: a.down('#paRayon').getValue() || '',
                grossisteId: a.down('#paGrossiste').getValue() || ''},
            success: function (r) {
                if (a.isDestroyed) {
                    return;
                }
                a.setLoading(false);
                me.enCours = false;
                var o = Ext.decode(r.responseText, true) || {};
                if (!o.success) {
                    me.donnees = null;
                    a.down('#paTuiles').update('');
                    me.serie.removeAll();
                    me.dessinerGraphique();
                    msg.update('<span style="color:#b42318">' + Ext.String.htmlEncode(o.msg || 'Analyse indisponible') + '</span>');
                    return;
                }
                me.donnees = o;
                me.serie.loadData(Ext.Array.map(o.serie || [], function (x) {
                    return Ext.apply({libelle: me.libelle(x.cle)}, x);
                }));
                a.down('#paTuiles').update(me.htmlTuiles(o.total || {}));
                me.dessinerGraphique();
                msg.update(me.htmlTableaux(o));
            },
            failure: function (r) {
                me.enCours = false;
                if (!a.isDestroyed) {
                    a.setLoading(false);
                    msg.update('<span style="color:#b42318">Le serveur n\'a pas répondu (' + r.status + ').</span>');
                }
            }});
    },

    entier: function (v) {
        return String(Math.round(v || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    },

    pct: function (v) {
        return String(v || 0).replace('.', ',') + ' %';
    },

    htmlTuiles: function (t) {
        var me = this, enc = Ext.String.htmlEncode, e = me.entier;
        var tuile = function (cls, titre, valeur, detail, aide) {
            return '<div class="pml-tuile ' + cls + '" data-qtip="' + enc(aide) + '"><div class="pml-tuile-valeur">' + valeur + '</div>'
                    + '<div class="pml-tuile-titre">' + titre + '</div><div class="pml-tuile-detail">' + detail + '</div></div>';
        };
        return '<div class="pml-tuiles pa-tuiles">'
                + tuile('info', 'Chiffre d\'affaires', e(t.ca) + ' F', 'HT : ' + e(t.caHT) + ' F', 'Lignes de vente nettes de remise (TTC)')
                + tuile(t.marge < 0 ? 'critique' : 'ok', 'Marge', e(t.marge) + ' F', 'taux : ' + me.pct(t.taux),
                        'CA hors taxes − prix d\'achat × quantité ; taux sur le hors taxes')
                + tuile('', 'Ventes', e(t.ventes), e(t.quantite) + ' unité(s)', 'Nombre de ventes (tickets) contenant ces produits')
                + tuile('', 'Produits vendus', e(t.produits), 'distincts', 'Produits différents vendus sur la période')
                + '</div>';
    },

    dessinerGraphique: function () {
        var me = this, zone = me.analyse.down('#paGraphique'), m = Ext.Array.findBy(me.MESURES, function (x) {
            return x.cle === me.mesure;
        });
        zone.removeAll(true);
        zone.add({
            xtype: 'chart', itemId: 'paCourbe', animate: false, store: me.serie, style: 'background:#fff', insetPadding: 20,
            axes: [{type: 'Numeric', position: 'left', fields: [me.mesure], grid: true, title: m.texte,
                    /* depart a 0 (un axe tronque grossit les ecarts) ; sous 0 seulement si une marge est negative */
                    minimum: me.serie.min(me.mesure) < 0 ? undefined : 0,
                    label: {renderer: function (v) {
                            return Ext.util.Format.number(v, '0,000');
                        }}},
                {type: 'Category', position: 'bottom', fields: ['libelle'], label: {rotate: me.serie.getCount() > 12 ? {degrees: 315} : undefined}}],
            series: [{type: 'column', axis: 'left', xField: 'libelle', yField: me.mesure, style: {fill: me.mesure === 'marge' ? '#1e8449' : '#2f6fb5'},
                    highlight: true,
                    tips: {trackMouse: true, width: 230, renderer: function (r) {
                            this.setTitle('<b>' + Ext.String.htmlEncode(r.get('libelle')) + '</b><br>CA : ' + me.entier(r.get('ca')) + ' F<br>Marge : '
                                    + me.entier(r.get('marge')) + ' F (' + me.pct(r.get('taux')) + ')<br>' + me.entier(r.get('ventes')) + ' vente(s) · '
                                    + me.entier(r.get('quantite')) + ' unité(s)');
                        }}}]
        });
    },

    htmlTableaux: function (o) {
        var me = this, enc = Ext.String.htmlEncode, e = me.entier;
        var tableau = function (titre, cls, entete, lignes, colonnes, vide) {
            return '<div class="ac-bloc-t" style="margin-top:14px">' + titre + '</div><table class="ac-table ' + cls + '"><tr>' + entete + '</tr>'
                    + (lignes || '<tr><td colspan="' + colonnes + '" style="color:#7f8c8d">' + vide + '</td></tr>') + '</table>';
        };
        var cols = function (x) {
            return '<td class="n">' + e(x.ventes) + '</td><td class="n">' + e(x.quantite) + '</td><td class="n">' + e(x.ca) + '</td><td class="n">'
                    + e(x.marge) + '</td><td class="n">' + me.pct(x.taux) + '</td>';
        };
        var entete = '<th class="n">Ventes</th><th class="n">Quantités</th><th class="n">CA</th><th class="n">Marge</th><th class="n">Taux</th>';
        var pas = {JOUR: 'Jour', SEMAINE: 'Semaine', MOIS: 'Mois', ANNEE: 'Année'}[o.pas] || 'Période';
        var l = '';
        Ext.each(o.serie || [], function (x) {
            l += '<tr class="pa-periode"><td>' + enc(me.libelle(x.cle)) + '</td>' + cols(x) + '</tr>';
        });
        var html = tableau('Par ' + pas.toLowerCase(), 'pa-par-periode', '<th>' + pas + '</th>' + entete, l, 6, 'Aucune vente sur la période.');
        l = '';
        Ext.each(o.produits || [], function (x) {
            l += '<tr class="pa-produit"><td>' + enc(x.cip) + '</td><td>' + enc(x.libelle) + '</td>' + cols(x) + '</tr>';
        });
        return html + tableau('Produits qui font le plus de chiffre (50 premiers)', 'pa-par-produit', '<th>CIP</th><th>Produit</th>' + entete, l, 7,
                'Aucune vente sur la période.');
    }
});
