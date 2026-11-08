/* global Ext, PrestigeChargement */

/*
 * Plan du 06/11, point 3.5 (demande du 07/11) : l'ecran Promotions en quatre onglets :
 *  - Promotions : l'ecran existant (promotionmanager), sans changement de fonctionnement ;
 *  - Historique : le journal de tout ce qui touche aux promotions (creation, modification, cloture, ajout,
 *    modification et retrait d'un produit, promotion retiree d'une vente passee en assurance), avec la date,
 *    l'utilisateur, les valeurs d'avant et les nouvelles ; tri et filtres par action, type, date, produit,
 *    utilisateur ; impression PDF et export Excel. Visible pour les utilisateurs qui avaient le menu « Historique des
 *    promotions » (droit P_SM_PROMOTION_History) ;
 *  - Ventes en promotion : chaque ligne vendue en promotion (vente, vendeur, mention du ticket, boites payees et
 *    offertes, prix d'avant, montant, cout) ; impression et export ;
 *  - Analyse : par type, par promotion, les 10 produits qui rapportent le plus (barres), par vendeur, par jour ;
 *    impression et export.
 * Le menu Promotions ouvre ce conteneur (App.ecranReel) ; la liste garde ses identifiants et ses tests.
 */
Ext.define('testextjs.view.Promotions.PromotionsOnglets', {
    extend: 'Ext.panel.Panel',
    xtype: 'promotionsonglets',
    requires: ['testextjs.view.Promotions.PromotionManager'],
    layout: 'card',
    border: false,
    header: false,
    cls: 'cec-hub po-hub',
    config: {
        nameintern: '',
        titre: '',
        odatasource: ''
    },

    URL: '../api/v1/promotions-suivi/',

    ONGLETS: [{cle: 'promotions', texte: 'Promotions', aide: 'Promotions et leurs produits'},
        {cle: 'historique', texte: 'Historique', aide: 'Tout ce qui a été fait sur les promotions : qui, quand, avant, après'},
        {cle: 'ventes', texte: 'Ventes en promotion', aide: 'Chaque ligne vendue en promotion'},
        {cle: 'analyse', texte: 'Analyse', aide: 'Ventes, boîtes offertes, montant et coût par promotion, produit, vendeur et jour'}],

    TYPES: [{v: '', l: 'Tous les types'}, {v: 'REMISE', l: 'Remise'}, {v: 'PRIX SPECIAL', l: 'Prix spécial'}, {v: 'UNITES GRATUITES', l: 'Unités gratuites'}],

    initComponent: function () {
        var me = this;
        me.liste = Ext.create('testextjs.view.Promotions.PromotionManager', {header: false});
        me.habiller(me.liste);
        me.historique = me.creerHistorique();
        me.ventes = me.creerVentes();
        me.analyse = me.creerAnalyse();
        Ext.apply(me, {
            items: [me.liste, me.historique, me.ventes, me.analyse],
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', itemId: 'ongletsPo', cls: 'cec-onglets', layout: {type: 'hbox', pack: 'start', align: 'middle'},
                    items: Ext.Array.map(me.ONGLETS, function (o) {
                        return {xtype: 'button', itemId: 'po-' + o.cle, text: o.texte, cls: 'cec-onglet', toggleGroup: 'po-onglets-' + me.id,
                            allowDepress: false, pressed: o.cle === 'promotions', tooltip: o.aide, hidden: o.cle === 'historique',
                            handler: function () {
                                me.afficher(o.cle);
                            }};
                    })
                }]
        });
        me.callParent(arguments);
        Ext.Ajax.request({url: me.URL + 'droits', method: 'GET', success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (!me.isDestroyed) {
                    me.droits = o;
                    me.down('#po-historique').setVisible(!!o.historique);
                    me.down('#po-ventes').setVisible(o.ventes !== false);
                    me.down('#po-analyse').setVisible(o.ventes !== false);
                }
            }});
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
        var me = this, cibles = {promotions: me.liste, historique: me.historique, ventes: me.ventes, analyse: me.analyse};
        Ext.each(me.ONGLETS, function (x) {
            var b = me.down('#po-' + x.cle);
            if (b && b.pressed !== (x.cle === cle)) {
                b.toggle(x.cle === cle, true);
            }
        });
        me.getLayout().setActiveItem(cibles[cle] || me.liste);
        if (cle === 'historique') {
            me.historique.getStore().loadPage(1);
        } else if (cle === 'ventes') {
            me.chargerVendeurs(me.ventes);
            me.ventes.getStore().loadPage(1);
        } else if (cle === 'analyse') {
            me.chargerVendeurs(me.analyse);
            me.chargerAnalyse();
        }
        return cibles[cle] || me.liste;
    },

    /* ------------------------------------------------------------------ outils */

    entier: function (v) {
        return v === null || v === undefined || v === '' ? '' : String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    },

    comboType: function (itemId) {
        return {xtype: 'combobox', itemId: itemId, width: 140, editable: false, queryMode: 'local', displayField: 'l', valueField: 'v', value: '',
            store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: this.TYPES}), tooltip: 'Type de promotion'};
    },

    /** Champs Du / au : premier jour du mois et aujourd'hui. */
    champsPeriode: function (prefixe, vide) {
        var auj = new Date();
        return [{xtype: 'datefield', itemId: prefixe + 'Du', fieldLabel: 'Du', labelWidth: 22, width: 135, format: 'd/m/Y', submitFormat: 'Y-m-d',
                value: vide ? null : new Date(auj.getFullYear(), auj.getMonth(), 1), maxValue: auj},
            {xtype: 'datefield', itemId: prefixe + 'Au', fieldLabel: 'au', labelWidth: 20, width: 133, format: 'd/m/Y', submitFormat: 'Y-m-d',
                value: vide ? null : auj, maxValue: auj}];
    },

    /** Ouvre l'edition (PDF dans un onglet, Excel en telechargement) avec les filtres de l'ecran. */
    editer: function (chemin, format, params) {
        var p = Ext.apply({format: format}, params);
        Ext.Object.each(p, function (k, v) {
            if (v === null || v === undefined || v === '') {
                delete p[k];
            }
        });
        window.open(this.URL + chemin + '?' + Ext.Object.toQueryString(p), format === 'pdf' ? '_blank' : '_self');
    },

    boutonsEdition: function (chemin, params) {
        var me = this;
        return [{text: 'Imprimer', itemId: chemin.replace('/', '') + 'Pdf', iconCls: 'printable', tooltip: 'Imprimer (PDF) ce qui est affiché',
                handler: function () {
                    me.editer(chemin + '/edition', 'pdf', params());
                }},
            {text: 'Excel', itemId: chemin.replace('/', '') + 'Excel', iconCls: 'export_excel_icon', tooltip: 'Exporter vers Excel ce qui est affiché',
                handler: function () {
                    me.editer(chemin + '/edition', 'excel', params());
                }}];
    },

    chargerVendeurs: function (onglet) {
        var me = this, c = onglet.down('combobox[itemId$=Vendeur]');
        if (!c) {
            return;
        }
        var du = onglet.down('datefield[itemId$=Du]').getSubmitValue(), au = onglet.down('datefield[itemId$=Au]').getSubmitValue();
        Ext.Ajax.request({url: me.URL + 'ventes/vendeurs', method: 'GET', params: {du: du, au: au}, success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (!c.isDestroyed) {
                    c.getStore().loadData([{id: '', nom: 'Tous les vendeurs'}].concat(o.results || []));
                }
            }});
    },

    /* ------------------------------------------------------------------ historique */

    ACTIONS: [{v: '', l: 'Toutes les actions'}, {v: 'CREATION', l: 'Création de la promotion'},
        {v: 'MODIFICATION PROMOTION', l: 'Modification de la promotion'}, {v: 'CLOTURE', l: 'Clôture'},
        {v: 'AJOUT', l: 'Ajout du produit'}, {v: 'MODIFICATION', l: 'Modification du produit'}, {v: 'RETRAIT', l: 'Retrait du produit'},
        {v: 'RETRAIT VENTE ASSURANCE', l: 'Retirée d\'une vente passée en assurance'}, {v: 'ANCIEN', l: 'Avant le journal'}],

    paramsHistorique: function () {
        var h = this.historique, s = h.getStore().sorters.first();
        return {du: h.down('#phDu').getSubmitValue(), au: h.down('#phAu').getSubmitValue(), action: h.down('#phAction').getValue(),
            type: h.down('#phType').getValue(), produit: h.down('#phProduit').getValue(), utilisateur: h.down('#phUtilisateur').getValue(),
            sort: s ? Ext.encode([{property: s.property, direction: s.direction}]) : null};
    },

    creerHistorique: function () {
        var me = this;
        var store = Ext.create('Ext.data.Store', {
            fields: ['id', 'date', 'action', 'actionLibelle', 'promotion', 'type', 'cip', 'produit', 'avant', 'apres', 'vente', 'utilisateur'],
            pageSize: 50, remoteSort: true, sorters: [{property: 'date', direction: 'DESC'}],
            proxy: {type: 'ajax', url: me.URL + 'historique', simpleSortMode: false, reader: {type: 'json', root: 'results', totalProperty: 'total'}},
            listeners: {beforeload: function (s, op) {
                    var p = me.paramsHistorique();
                    delete p.sort;
                    op.params = Ext.apply(op.params || {}, p);
                }}
        });
        var utilisateurs = Ext.create('Ext.data.Store', {fields: ['id', 'nom'], data: [{id: '', nom: 'Tous les utilisateurs'}]});
        var recharger = function () {
            store.loadPage(1);
        };
        var grille = Ext.create('Ext.grid.Panel', {
            itemId: 'promotionHistorique', store: store, cls: 'po-historique',
            viewConfig: {emptyText: 'Aucune action pour ces critères.', deferEmptyText: false, enableTextSelection: true},
            columns: [{header: 'Date', dataIndex: 'date', width: 120, sortable: true},
                {header: 'Action', dataIndex: 'action', width: 190, sortable: true, renderer: function (v, m, r) {
                        return Ext.String.htmlEncode(r.get('actionLibelle'));
                    }},
                {header: 'Promo', dataIndex: 'promotion', width: 60, align: 'right', sortable: true},
                {header: 'Type', dataIndex: 'type', width: 120, sortable: true},
                {header: 'CIP', dataIndex: 'cip', width: 80, sortable: false},
                {header: 'Produit', dataIndex: 'produit', flex: 1.2, minWidth: 160, sortable: true},
                {header: 'Avant', dataIndex: 'avant', flex: 1, minWidth: 150, sortable: false, renderer: Ext.String.htmlEncode},
                {header: 'Nouvelles valeurs', dataIndex: 'apres', flex: 1, minWidth: 150, sortable: false, renderer: function (v, m, r) {
                        return r.get('action') === 'RETRAIT' || r.get('action') === 'RETRAIT VENTE ASSURANCE' ? '<span style="color:#7f8c8d">—</span>'
                                : Ext.String.htmlEncode(v);
                    }},
                {header: 'Vente', dataIndex: 'vente', width: 95, sortable: false},
                {header: 'Utilisateur', dataIndex: 'utilisateur', width: 140, sortable: true}],
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: me.champsPeriode('ph', true).concat([
                        {xtype: 'combobox', itemId: 'phAction', width: 210, editable: false, queryMode: 'local', displayField: 'l', valueField: 'v', value: '',
                            store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: me.ACTIONS}), listeners: {select: recharger}},
                        Ext.apply(me.comboType('phType'), {listeners: {select: recharger}}),
                        {xtype: 'textfield', itemId: 'phProduit', emptyText: 'Produit (nom ou CIP)', width: 180, enableKeyEvents: true,
                            listeners: {specialkey: function (f, e) {
                                    if (e.getKey() === e.ENTER) {
                                        recharger();
                                    }
                                }}},
                        {xtype: 'combobox', itemId: 'phUtilisateur', width: 170, editable: false, queryMode: 'local', displayField: 'nom', valueField: 'id', value: '',
                            store: utilisateurs, listeners: {select: recharger}},
                        {text: 'Rechercher', itemId: 'phRechercher', iconCls: 'searchicon', handler: recharger},
                        '->'].concat(me.boutonsEdition('historique', function () {
                    return me.paramsHistorique();
                })))},
                {xtype: 'pagingtoolbar', dock: 'bottom', store: store, displayInfo: true, displayMsg: 'Lignes {0} à {1} sur {2}', emptyMsg: 'Aucune ligne'}]
        });
        grille.on('afterrender', function () {
            Ext.Ajax.request({url: me.URL + 'historique/utilisateurs', method: 'GET', success: function (r) {
                    var o = Ext.decode(r.responseText, true) || {};
                    utilisateurs.loadData([{id: '', nom: 'Tous les utilisateurs'}].concat(o.results || []));
                }});
        });
        return grille;
    },

    /* ------------------------------------------------------------------ ventes en promotion */

    paramsVentes: function (onglet, prefixe) {
        return {du: onglet.down('#' + prefixe + 'Du').getSubmitValue(), au: onglet.down('#' + prefixe + 'Au').getSubmitValue(),
            type: onglet.down('#' + prefixe + 'Type').getValue(), produit: onglet.down('#' + prefixe + 'Produit').getValue(),
            vendeur: onglet.down('#' + prefixe + 'Vendeur').getValue()};
    },

    barreFiltres: function (prefixe, recharger) {
        var me = this;
        return me.champsPeriode(prefixe, false).concat([
            Ext.apply(me.comboType(prefixe + 'Type'), {listeners: {select: recharger}}),
            {xtype: 'textfield', itemId: prefixe + 'Produit', emptyText: 'Produit (nom ou CIP)', width: 180,
                listeners: {specialkey: function (f, e) {
                        if (e.getKey() === e.ENTER) {
                            recharger();
                        }
                    }}},
            {xtype: 'combobox', itemId: prefixe + 'Vendeur', width: 170, editable: false, queryMode: 'local', displayField: 'nom', valueField: 'id', value: '',
                store: Ext.create('Ext.data.Store', {fields: ['id', 'nom'], data: [{id: '', nom: 'Tous les vendeurs'}]}), listeners: {select: recharger}},
            {text: 'Rechercher', itemId: prefixe + 'Rechercher', iconCls: 'searchicon', handler: recharger}, '->']);
    },

    creerVentes: function () {
        var me = this, grille;
        var store = Ext.create('Ext.data.Store', {
            fields: ['date', 'refVente', 'vendeur', 'cip', 'produit', 'promotion', 'type', 'mention',
                {name: 'quantite', type: 'int'}, {name: 'payees', type: 'int'}, {name: 'offertes', type: 'int'},
                {name: 'prixAvant', useNull: true}, 'prixVendu', 'montant', 'remise'],
            pageSize: 50,
            proxy: {type: 'ajax', url: me.URL + 'ventes', reader: {type: 'json', root: 'results', totalProperty: 'total'}},
            listeners: {beforeload: function (s, op) {
                    op.params = Ext.apply(op.params || {}, me.paramsVentes(grille, 'pv'));
                }, load: function (s, recs, ok) {
                    var o = ok && s.getProxy().getReader().rawData ? s.getProxy().getReader().rawData.totaux : null;
                    grille.down('#pvTotaux').update(o ? '<b>' + me.entier(o.ventes) + '</b> vente(s) · <b>' + me.entier(o.payees) + '</b> boîte(s) payée(s) · <b>'
                            + me.entier(o.offertes) + '</b> offerte(s) · montant <b>' + me.entier(o.montant) + ' F</b> · coût de la promotion <b>'
                            + me.entier(o.remise) + ' F</b>' : '');
                }}
        });
        var recharger = function () {
            me.chargerVendeurs(grille);
            store.loadPage(1);
        };
        var n = function (v) {
            return me.entier(v);
        };
        grille = Ext.create('Ext.grid.Panel', {
            itemId: 'promotionVentes', store: store, cls: 'po-ventes',
            viewConfig: {emptyText: 'Aucune vente en promotion pour ces critères.', deferEmptyText: false, enableTextSelection: true},
            columns: [{header: 'Date', dataIndex: 'date', width: 115},
                {header: 'Vente', dataIndex: 'refVente', width: 95},
                {header: 'Vendeur', dataIndex: 'vendeur', width: 130},
                {header: 'CIP', dataIndex: 'cip', width: 80},
                {header: 'Produit', dataIndex: 'produit', flex: 1, minWidth: 160},
                {header: 'Promotion', dataIndex: 'mention', width: 200, renderer: function (v, m, r) {
                        m.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(Ext.String.htmlEncode(r.get('promotion'))) + '"';
                        return Ext.String.htmlEncode(v);
                    }},
                {header: 'Qté', dataIndex: 'quantite', width: 55, align: 'right', renderer: n},
                {header: 'Payées', dataIndex: 'payees', width: 65, align: 'right', renderer: n},
                {header: 'Offertes', dataIndex: 'offertes', width: 70, align: 'right', renderer: n},
                {header: 'Prix d\'avant', dataIndex: 'prixAvant', width: 85, align: 'right', renderer: function (v) {
                        return v === null || v === undefined ? '<span style="color:#7f8c8d" data-qtip="Vente enregistrée avant que la ligne ne garde son prix d\'avant">—</span>' : me.entier(v);
                    }},
                {header: 'Prix vendu', dataIndex: 'prixVendu', width: 80, align: 'right', renderer: n},
                {header: 'Montant', dataIndex: 'montant', width: 85, align: 'right', renderer: n},
                {header: 'Coût promo', dataIndex: 'remise', width: 85, align: 'right', renderer: n,
                    tooltip: 'Prix d\'avant × quantité − montant (pour des unités gratuites : valeur des boîtes offertes)'}],
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: me.barreFiltres('pv', recharger).concat(me.boutonsEdition('ventes', function () {
                        return me.paramsVentes(grille, 'pv');
                    }))},
                {xtype: 'toolbar', dock: 'bottom', items: [{xtype: 'component', itemId: 'pvTotaux', cls: 'po-totaux', html: ''}]},
                {xtype: 'pagingtoolbar', dock: 'bottom', store: store, displayInfo: true, displayMsg: 'Lignes {0} à {1} sur {2}', emptyMsg: 'Aucune ligne'}]
        });
        return grille;
    },

    /* ------------------------------------------------------------------ analyse */

    creerAnalyse: function () {
        var me = this, p;
        var recharger = function () {
            me.chargerVendeurs(p);
            me.chargerAnalyse();
        };
        p = Ext.create('Ext.panel.Panel', {
            itemId: 'promotionAnalyse', autoScroll: true, bodyPadding: 12, cls: 'po-analyse',
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: me.barreFiltres('pa', recharger).concat(me.boutonsEdition('analyse', function () {
                        return me.paramsVentes(p, 'pa');
                    }))}],
            items: [{xtype: 'component', itemId: 'paContenu', html: '<div style="color:#7f8c8d">Chargement…</div>'}]
        });
        return p;
    },

    chargerAnalyse: function () {
        var me = this, a = me.analyse, contenu = a.down('#paContenu'), params = me.paramsVentes(a, 'pa');
        if (params.du && params.au && params.du > params.au) {
            contenu.update('<span style="color:#b42318">La date de début doit précéder la date de fin.</span>');
            return;
        }
        a.setLoading('Calcul…');
        Ext.Ajax.request({url: me.URL + 'analyse', method: 'GET', params: params, timeout: 120000,
            success: function (r) {
                if (a.isDestroyed) {
                    return;
                }
                a.setLoading(false);
                var o = Ext.decode(r.responseText, true);
                if (!o || !o.total) {
                    contenu.update('<span style="color:#b42318">' + Ext.String.htmlEncode((o && o.msg) || 'Analyse indisponible') + '</span>');
                    return;
                }
                me.donneesAnalyse = o;
                contenu.update(me.htmlAnalyse(o));
            },
            failure: function (r) {
                if (!a.isDestroyed) {
                    a.setLoading(false);
                    contenu.update('<span style="color:#b42318">Le serveur n\'a pas répondu (' + r.status + ').</span>');
                }
            }});
    },

    LIBELLES_TYPE: {'REMISE': 'Remise', 'PRIX SPECIAL': 'Prix spécial', 'UNITES GRATUITES': 'Unités gratuites'},

    htmlAnalyse: function (o) {
        var me = this, enc = Ext.String.htmlEncode, e = function (v) {
            return me.entier(v);
        }, t = o.total;
        var tuile = function (cls, titre, valeur, detail, aide) {
            return '<div class="pml-tuile ' + cls + '" data-qtip="' + enc(aide) + '"><div class="pml-tuile-valeur">' + valeur + '</div>'
                    + '<div class="pml-tuile-titre">' + titre + '</div><div class="pml-tuile-detail">' + detail + '</div></div>';
        };
        var html = '<div class="pml-tuiles po-tuiles">'
                + tuile('info po-t-ventes', 'Ventes en promotion', e(t.ventes), e(t.lignes) + ' ligne(s)', 'Ventes terminées, non annulées, avec au moins une ligne en promotion')
                + tuile('ok po-t-montant', 'Montant encaissé', e(t.montant) + ' F', e(t.payees) + ' boîte(s) payée(s)', 'Somme des lignes en promotion')
                + tuile('po-t-offertes', 'Boîtes offertes', e(t.offertes), 'unités gratuites', 'Boîtes données par les promotions « unités gratuites »')
                + tuile('critique po-t-cout', 'Coût des promotions', e(t.remise) + ' F', 'prix d\'avant − prix vendu', 'Ce que la pharmacie a laissé : prix d\'avant × quantité − montant')
                + '</div>';
        var entete = function (premier) {
            return '<tr><th>' + premier + '</th><th class="n">Ventes</th><th class="n">Lignes</th><th class="n">Payées</th><th class="n">Offertes</th>'
                    + '<th class="n">Montant</th><th class="n">Coût</th></tr>';
        };
        var lignes = function (gs, cls, libelle) {
            var l = '';
            Ext.each(gs || [], function (g) {
                l += '<tr class="' + cls + '"><td>' + enc(libelle ? libelle(g.cle) : g.cle) + '</td><td class="n">' + e(g.ventes) + '</td><td class="n">' + e(g.lignes)
                        + '</td><td class="n">' + e(g.payees) + '</td><td class="n">' + e(g.offertes) + '</td><td class="n">' + e(g.montant)
                        + '</td><td class="n">' + e(g.remise) + '</td></tr>';
            });
            return l || '<tr><td colspan="7" style="color:#7f8c8d">Aucune vente en promotion sur la période.</td></tr>';
        };
        var bloc = function (titre, cls, premier, gs, libelle) {
            return '<div class="ac-bloc-t" style="margin-top:14px">' + titre + '</div><table class="ac-table ' + cls + '">' + entete(premier)
                    + lignes(gs, cls + '-l', libelle) + '</table>';
        };
        html += bloc('Par type', 'po-par-type', 'Type', o.parType, function (k) {
            return me.LIBELLES_TYPE[k] || k;
        });
        html += bloc('Par promotion', 'po-par-promotion', 'Promotion', o.parPromotion);
        /* les 10 produits qui rapportent le plus : barres proportionnelles au montant */
        var max = 0;
        Ext.each(o.top || [], function (g) {
            max = Math.max(max, g.montant);
        });
        var barres = '';
        Ext.each(o.top || [], function (g) {
            var w = max > 0 ? Math.max(1, Math.round(g.montant * 100 / max)) : 0;
            barres += '<div class="po-barre" style="display:flex;align-items:center;margin:3px 0"><div style="width:280px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" data-qtip="'
                    + enc(enc(g.cle)) + '">' + enc(g.cle) + '</div><div style="flex:1;background:#eef2f6;height:16px;border-radius:3px">'
                    + '<div class="po-barre-v" data-montant="' + g.montant + '" style="width:' + w + '%;height:16px;background:#2e86c1;border-radius:3px"></div></div>'
                    + '<div style="width:170px;text-align:right">' + e(g.montant) + ' F · ' + e(g.payees + g.offertes) + ' boîte(s)</div></div>';
        });
        html += '<div class="ac-bloc-t" style="margin-top:14px">Les 10 produits qui rapportent le plus</div><div class="po-top">'
                + (barres || '<div style="color:#7f8c8d">Aucune vente en promotion sur la période.</div>') + '</div>';
        html += bloc('Les 10 produits qui rapportent le plus (détail)', 'po-top-detail', 'Produit', o.top);
        html += bloc('Par vendeur', 'po-par-vendeur', 'Vendeur', o.parVendeur);
        html += bloc('Par jour', 'po-par-jour', 'Jour', o.parJour, function (k) {
            var p = String(k).split('-');
            return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : k;
        });
        return html;
    }
});
