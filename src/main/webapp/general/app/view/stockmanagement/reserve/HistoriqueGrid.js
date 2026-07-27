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
        REASSORT: '#2a6b2e'
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
                'str_USER', 'lg_MOUVEMENT_ID'
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
                listeners: {specialkey: function (f, e) {
                        if (e.getKey() === e.ENTER) {
                            me.onRechercher();
                        }
                    }}},
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
            comboHeure('hHeureDebut', 'De (h)'),
            comboHeure('hHeureFin', 'A (h)'),
            '-',
            {text: 'Rechercher', scope: me, handler: me.onRechercher},
            {text: 'Reinitialiser', scope: me, handler: me.onReinitialiser},
            '->',
            {text: 'Creer un inventaire', scope: me, handler: me.onCreateInventaire},
            {text: 'Exporter (Excel)', scope: me, handler: me.onExportExcel},
            {text: 'Imprimer', scope: me, handler: me.onImprimer}
        ];

        // Au survol, la ligne s'explique en langage courant : d'ou part le stock, ou il arrive,
        // et ce que cela change de part et d'autre.
        var explication = function (rec) {
            var type = rec.get('str_TYPE');
            var qte = rec.get('int_QTE');
            var versReserve = (type === 'ASSORT');
            var source = versReserve ? 'du RAYON' : 'de la RESERVE';
            var dest = versReserve ? 'la RESERVE' : 'le RAYON';
            return qte + ' unite(s) retiree(s) ' + source + ' pour aller dans ' + dest + '.'
                    + ' Rayon : ' + rec.get('int_STOCK_RAYON_AVANT') + ' puis ' + rec.get('int_STOCK_RAYON_APRES')
                    + '. Reserve : ' + rec.get('int_STOCK_RESERVE_AVANT') + ' puis '
                    + rec.get('int_STOCK_RESERVE_APRES') + '.'
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
            heureFin: val('hHeureFin')
        };
    },

    onRechercher: function () {
        this.store.getProxy().extraParams = this.filtresActifs();
        this.store.loadPage(1);
    },

    onReinitialiser: function () {
        var me = this;
        Ext.each(['hSearch', 'hType', 'hUser', 'hDebut', 'hFin', 'hHeureDebut', 'hHeureFin'], function (itemId) {
            var c = me.down('#' + itemId);
            if (c) {
                c.setValue(null);
            }
        });
        me.store.getProxy().extraParams = {};
        me.store.loadPage(1);
    },

    reloadGrid: function () {
        this.store.loadPage(1);
    },

    // Creer un inventaire depuis n'importe quel onglet : la fenetre de selection porte sa
    // propre recherche par CIP ou par nom, elle ne depend donc pas des filtres de l'historique.
    onCreateInventaire: function () {
        Ext.create('testextjs.view.stockmanagement.reserve.action.inventaireSelection', {
            typetransaction: 'ALL'
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
