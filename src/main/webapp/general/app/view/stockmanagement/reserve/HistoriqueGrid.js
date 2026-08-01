/* global Ext */

// Onglet HISTORIQUE : tous les mouvements rayon <-> reserve, recherchables.
//
// L'historique est immuable : un mouvement execute n'est jamais supprime ni retouche.
// Une erreur se corrige par un mouvement inverse, qui vient s'ajouter a la suite.
Ext.define('testextjs.view.stockmanagement.reserve.HistoriqueGrid', {
    extend: 'Ext.grid.Panel',
    xtype: 'reservehistoriquegrid',
    requires: ['testextjs.view.stockmanagement.reserve.action.inventaireSelection'],
    border: false,
    frame: true,
    columnLines: true,

    // Code couleur conserve depuis les historiques existants.
    couleurMouvement: {
        ASSORT: '#d97200',
        REASSORT: '#2a6b2e',
        AJUSTEMENT: '#6a1b9a'
    },

    initComponent: function () {
        var me = this;
        var baseUrl = '../api/v1/reserve/';

        var store = new Ext.data.Store({
            pageSize: 25,
            autoLoad: false,
            fields: [
                'dt_CREATED', 'int_CIP', 'str_NAME', 'str_TYPE', 'str_MOUVEMENT',
                {name: 'int_QTE', type: 'int'},
                {name: 'int_STOCK_RAYON_AVANT', type: 'int'},
                {name: 'int_STOCK_RAYON_APRES', type: 'int'},
                {name: 'int_STOCK_RESERVE_AVANT', type: 'int'},
                {name: 'int_STOCK_RESERVE_APRES', type: 'int'},
                'str_USER', 'lg_MOUVEMENT_ID', 'str_MOTIF_ANNULATION',
                {name: 'bl_EST_ANNULATION', type: 'boolean'},
                {name: 'bl_ANNULE', type: 'boolean'}
            ],
            proxy: {
                type: 'ajax',
                url: baseUrl + 'historique',
                reader: {type: 'json', root: 'results', totalProperty: 'total'}
            }
        });
        me.store = store;

        var heures = [{valeur: '', libelle: 'Toute heure'}];
        for (var h = 0; h < 24; h++) {
            heures.push({valeur: h, libelle: (h < 10 ? '0' : '') + h + ' h'});
        }

        var storeUsers = new Ext.data.Store({
            fields: ['lg_USER_ID', 'nom'],
            proxy: {type: 'ajax', url: baseUrl + 'historique/utilisateurs', reader: {type: 'json'}}
        });
        storeUsers.load();

        // Choisir une valeur lance directement la recherche.
        var rechercher = {select: function () {
                me.onRechercher();
            }};

        var comboHeure = function (itemId, empty) {
            return {
                xtype: 'combo', itemId: itemId, emptyText: empty, width: 100,
                editable: false, queryMode: 'local', displayField: 'libelle', valueField: 'valeur',
                store: new Ext.data.Store({fields: ['valeur', 'libelle'], data: heures}),
                listeners: rechercher
            };
        };

        // Tous les filtres sur UNE seule ligne, separes par de vrais separateurs.
        var filtres = [
            {xtype: 'textfield', itemId: 'hSearch', emptyText: 'Produit ou CIP', width: 150,
                listeners: {
                    specialkey: function (f, e) {
                        if (e.getKey() === e.ENTER) {
                            f.dernierTerme = (f.getValue() || '').trim();
                            me.onRechercher();
                        }
                    },
                    // Recherche automatique a partir de 3 caracteres, apres une pause de frappe.
                    change: {
                        buffer: 800,
                        fn: function (f, v) {
                            var terme = (v || '').trim();
                            if (terme.length > 0 && terme.length < 3) {
                                return;
                            }
                            if (terme === f.dernierTerme) {
                                return;
                            }
                            f.dernierTerme = terme;
                            me.onRechercher();
                        }
                    }
                }},
            '-',
            {
                xtype: 'combo', itemId: 'hType', emptyText: 'Tous les mouvements', width: 185,
                editable: false, queryMode: 'local', displayField: 'libelle', valueField: 'valeur',
                store: new Ext.data.Store({
                    fields: ['valeur', 'libelle'],
                    data: [
                        {valeur: '', libelle: 'Tous les mouvements'},
                        {valeur: 'ASSORT', libelle: 'REAPPRO RESERVE (vers la reserve)'},
                        {valeur: 'REASSORT', libelle: 'REAPPRO RAYON (vers le rayon)'},
                        {valeur: 'AJUSTEMENT', libelle: 'AJUSTEMENT RESERVE'}
                    ]
                }),
                listeners: rechercher
            },
            {
                xtype: 'combo', itemId: 'hUser', emptyText: 'Tous les utilisateurs', width: 165,
                editable: false, queryMode: 'local', displayField: 'nom', valueField: 'lg_USER_ID',
                store: storeUsers, listeners: rechercher
            },
            '-',
            {xtype: 'datefield', itemId: 'hDebut', emptyText: 'Du', format: 'd/m/Y', width: 100,
                listeners: rechercher},
            {xtype: 'datefield', itemId: 'hFin', emptyText: 'Au', format: 'd/m/Y', width: 100,
                listeners: rechercher},
            {
                xtype: 'combo', itemId: 'hAnnulation', emptyText: 'Annulations : toutes', width: 175,
                editable: false, queryMode: 'local', displayField: 'libelle', valueField: 'valeur',
                store: new Ext.data.Store({
                    fields: ['valeur', 'libelle'],
                    data: [
                        {valeur: '', libelle: 'Annulations : toutes'},
                        {valeur: 'ANNULATION', libelle: 'Les annulations'},
                        {valeur: 'ANNULE', libelle: 'Les mouvements annules'},
                        {valeur: 'NORMAL', libelle: 'Sans annulation'}
                    ]
                }),
                listeners: rechercher
            },
            comboHeure('hHeureDebut', 'De (h)'),
            comboHeure('hHeureFin', 'A (h)')
        ];

        // Seconde ligne : les actions. La barre unique etait pleine, les boutons finissaient
        // hors du champ visible des que la fenetre retrecissait.
        var actions = [
            {text: 'Rechercher', scope: me, handler: me.onRechercher},
            {text: 'Reinitialiser', scope: me, handler: me.onReinitialiser},
            '-',
            {text: 'Creer un inventaire', scope: me, handler: me.onCreateInventaire},
            '-',
            {text: 'Exporter (Excel)', scope: me, handler: me.onExportExcel},
            {text: 'Imprimer', scope: me, handler: me.onImprimer}
        ];

        // Au survol, la ligne s'explique en langage courant : d'ou part le stock, ou il arrive,
        // et ce que cela change de part et d'autre.
        var explication = function (rec) {
            var type = rec.get('str_TYPE');
            var qte = rec.get('int_QTE');
            var rayonAvant = rec.get('int_STOCK_RAYON_AVANT');
            var rayonApres = rec.get('int_STOCK_RAYON_APRES');
            var reserveAvant = rec.get('int_STOCK_RESERVE_AVANT');
            var reserveApres = rec.get('int_STOCK_RESERVE_APRES');
            var phrase;
            if (type === 'AJUSTEMENT') {
                // Un ajustement n'est PAS un transfert : rien ne passe d'une zone a l'autre, une
                // seule zone est corrigee. Le texte des transferts, applique ici, laissait croire
                // a un mouvement rayon-reserve qui n'a jamais eu lieu.
                var ecart = reserveApres - reserveAvant;
                phrase = 'Ajustement du stock RESERVE de ' + (ecart >= 0 ? '+' : '') + ecart
                        + ' unite(s). Aucun transfert : le stock rayon n\'est pas concerne.';
            } else {
                var versReserve = (type === 'ASSORT');
                var source = versReserve ? 'du RAYON' : 'de la RESERVE';
                var dest = versReserve ? 'la RESERVE' : 'le RAYON';
                phrase = qte + ' unite(s) retiree(s) ' + source + ' pour aller dans ' + dest + '.';
            }
            return phrase
                    + ' Rayon : ' + rayonAvant + ' puis ' + rayonApres
                    + '. Reserve : ' + reserveAvant + ' puis ' + reserveApres + '.'
                    + ' Effectue par ' + (rec.get('str_USER') || '-') + ' le ' + rec.get('dt_CREATED') + '.';
        };
        var avecInfobulle = function (texte, m, rec) {
            m.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(explication(rec)) + '"';
            return texte;
        };

        Ext.apply(me, {
            store: store,
            columns: [
                {header: 'Date', dataIndex: 'dt_CREATED', width: 140},
                {header: 'CIP', dataIndex: 'int_CIP', width: 85},
                {header: 'Designation', dataIndex: 'str_NAME', flex: 2, minWidth: 180},
                {
                    header: 'Mouvement', dataIndex: 'str_MOUVEMENT', width: 185,
                    renderer: function (v, m, rec) {
                        m.style = 'color:' + (me.couleurMouvement[rec.get('str_TYPE')] || '#555555')
                                + ';font-weight:bold;';
                        return avecInfobulle(v, m, rec);
                    }
                },
                {
                    // Rien ne distinguait, dans la liste, un mouvement qui en defait un autre. Les
                    // deux lignes se lisaient cote a cote sans qu'on sache laquelle etait la
                    // correction : cette colonne le dit.
                    header: 'Annulation', dataIndex: 'bl_EST_ANNULATION', width: 105, align: 'center',
                    renderer: function (v, m, rec) {
                        if (rec.get('bl_EST_ANNULATION')) {
                            m.style = 'color:#a8231c;font-weight:bold;';
                            var motif = rec.get('str_MOTIF_ANNULATION');
                            m.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(
                                    'Ce mouvement en annule un autre'
                                    + (motif ? ' - motif : ' + motif : '')) + '"';
                            return 'ANNULATION';
                        }
                        if (rec.get('bl_ANNULE')) {
                            m.style = 'color:#b06000;font-weight:bold;';
                            m.tdAttr = 'data-qtip="Ce mouvement a \u00e9t\u00e9 annul\u00e9 par un mouvement inverse post\u00e9rieur."';
                            return 'Annul\u00e9';
                        }
                        return '';
                    }
                },
                {
                    header: 'Qte', dataIndex: 'int_QTE', width: 60, align: 'center',
                    renderer: function (v, m, rec) {
                        m.style = 'font-weight:bold;';
                        return avecInfobulle(v, m, rec);
                    }
                },
                {
                    header: 'Stock rayon', dataIndex: 'int_STOCK_RAYON_AVANT', width: 110, align: 'center',
                    renderer: function (v, m, rec) {
                        return avecInfobulle(v + ' &rarr; ' + rec.get('int_STOCK_RAYON_APRES'), m, rec);
                    }
                },
                {
                    header: 'Stock reserve', dataIndex: 'int_STOCK_RESERVE_AVANT', width: 110, align: 'center',
                    renderer: function (v, m, rec) {
                        return avecInfobulle(v + ' &rarr; ' + rec.get('int_STOCK_RESERVE_APRES'), m, rec);
                    }
                },
                {header: 'Utilisateur', dataIndex: 'str_USER', flex: 1, minWidth: 130}
            ],
            dockedItems: [
                {xtype: 'toolbar', dock: 'top', items: filtres},
                {xtype: 'toolbar', dock: 'top', items: actions},
                {xtype: 'pagingtoolbar', store: store, dock: 'bottom', displayInfo: true}
            ],
            viewConfig: {emptyText: 'Aucun mouvement enregistre.', deferEmptyText: false}
        });

        me.callParent();
    },

    /** Filtres actifs, partages par l'affichage, l'export et l'impression. */
    filtresActifs: function () {
        var me = this;
        var val = function (itemId) {
            var c = me.down('#' + itemId);
            var v = c ? c.getValue() : null;
            return (v === null || v === undefined || v === '') ? '' : v;
        };
        var dateVal = function (itemId) {
            var c = me.down('#' + itemId);
            return (c && c.getValue()) ? Ext.Date.format(c.getValue(), 'Y-m-d') : '';
        };
        return {
            search_value: val('hSearch'),
            type: val('hType'),
            userId: val('hUser'),
            dtStart: dateVal('hDebut'),
            dtEnd: dateVal('hFin'),
            heureDebut: val('hHeureDebut'),
            heureFin: val('hHeureFin'),
            annulation: val('hAnnulation')
        };
    },

    onRechercher: function () {
        this.store.getProxy().extraParams = this.filtresActifs();
        this.store.loadPage(1);
    },

    onReinitialiser: function () {
        var me = this;
        Ext.each(['hSearch', 'hType', 'hUser', 'hDebut', 'hFin', 'hHeureDebut', 'hHeureFin', 'hAnnulation'], function (itemId) {
            var c = me.down('#' + itemId);
            if (c) {
                c.setValue(null);
            }
        });
        // Les dates reviennent a la journee en cours : les vider rechargerait tout l'historique,
        // ce que l'affichage par defaut cherche justement a eviter.
        var ceJour = new Date();
        var d = me.down('#hDebut'), f = me.down('#hFin');
        if (d) {
            d.setValue(ceJour);
        }
        if (f) {
            f.setValue(ceJour);
        }
        me.onRechercher();
    },

    reloadGrid: function () {
        // Au premier affichage on se limite a la JOURNEE EN COURS : charger tout l'historique
        // coutait cher et n'est presque jamais ce qu'on vient consulter. Les dates sont posees
        // dans les champs pour que la periode retenue soit visible et modifiable.
        if (!this.filtreInitialise) {
            this.filtreInitialise = true;
            var auj = new Date();
            var d = this.down('#hDebut'), f = this.down('#hFin');
            if (d && !d.getValue()) {
                d.setValue(auj);
            }
            if (f && !f.getValue()) {
                f.setValue(auj);
            }
            this.onRechercher();
            return;
        }
        this.store.loadPage(1);
    },

    // Creer un inventaire depuis n'importe quel onglet : la fenetre de selection porte sa
    // propre recherche par CIP ou par nom, elle ne depend donc pas des filtres de l'historique.
    onCreateInventaire: function () {
        // L'inventaire porte sur les produits REELLEMENT affiches, filtres compris, et non sur
        // toute la reserve : c'est le resultat de recherche qui definit le perimetre.
        Ext.create('testextjs.view.stockmanagement.reserve.action.inventaireSelection', {
            source: '../api/v1/reserve/historique/produits',
            sourceparams: this.filtresActifs(),
            soustitre: 'produits de l\'historique affiche'
        });
    },

    onExportExcel: function () {
        var p = this.filtresActifs();
        var qs = Ext.Object.toQueryString(Ext.apply({_dc: new Date().getTime()}, p));
        var frame = document.getElementById('historique-export-frame');
        if (!frame) {
            frame = document.createElement('iframe');
            frame.id = 'historique-export-frame';
            frame.style.display = 'none';
            document.body.appendChild(frame);
        }
        frame.src = '../api/v1/reserve/historique/excel?' + qs;
    },

    onImprimer: function () {
        var p = this.filtresActifs();
        // Le modele Jasper est choisi selon le type de mouvement affiche.
        var mode = (p.type === 'ASSORT') ? 'historique_reserve'
                : (p.type === 'REASSORT') ? 'historique_rayon'
                : 'historique_global';
        var qs = 'mode=' + encodeURIComponent(mode)
                + '&search=' + encodeURIComponent(p.search_value || '')
                + '&dtStart=' + encodeURIComponent(p.dtStart || '')
                + '&dtEnd=' + encodeURIComponent(p.dtEnd || '');
        window.open('../webservices/stockmanagement/reserve/ws_generate_pdf_reserve.jsp?' + qs, '_blank');
    }
});
