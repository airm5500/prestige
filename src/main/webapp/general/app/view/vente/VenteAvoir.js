/* global Ext */

Ext.define('testextjs.view.vente.VenteAvoir', {
    extend: 'Ext.panel.Panel',
    xtype: 'venteavoirmanager',
    requires: [
        'testextjs.view.garde.SelecteurGarde'
    ],

    frame: true,
    title: 'Liste des avoirs',
    iconCls: 'icon-grid',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: 'fit',

    // Colonne action "Details" (presente sur les deux onglets)
    detailsColumn: function () {
        return {
            xtype: 'actioncolumn',
            header: 'Details',
            width: 55,
            align: 'center',
            sortable: false,
            menuDisabled: true,
            items: [{
                    icon: 'resources/images/icons/fam/application_view_list.png',
                    tooltip: 'Voir le detail de l\'avoir',
                    handler: function (view, rowIndex, colIndex, item, e, record) {
                        testextjs.app.getController('ListeAvoirCtr').showDetails(record);
                    }
                }]
        };
    },

    // Construit le jeu de colonnes selon le statut de l'onglet.
    // statut : 'EN_COURS' (avec colonne Modifier) ou 'CLOTURE'.
    buildColumns: function (statut) {
        var base = [
            {sortable: false, menuDisabled: true, header: 'Reference', dataIndex: 'strREF', flex: 1},
            {sortable: false, menuDisabled: true, header: 'Type.Vente', dataIndex: 'strTYPEVENTE', flex: 1},
            {sortable: false, menuDisabled: true, header: 'MONTANT', xtype: 'numbercolumn', align: 'right',
                dataIndex: 'intPRICE', flex: 1, format: '0,000.'}
        ];

        if (statut === 'CLOTURE') {
            // Date + heure de mise en avoir fusionnees, + date de validation (cloture) en rouge.
            return base.concat([
                {sortable: false, menuDisabled: true, header: 'Date mise en avoir', dataIndex: 'dtUPDATED',
                    flex: 1, align: 'center',
                    renderer: function (v, m, r) {
                        return (v || '') + ' ' + (r.get('heure') || '');
                    }},
                {sortable: false, menuDisabled: true, header: 'Date validation', dataIndex: 'dtCLOTUREAVOIR',
                    flex: 1, align: 'center',
                    renderer: function (v) {
                        return '<span style="color:#c0392b;font-weight:bold;">' + (v || '') + '</span>';
                    }},
                // Apres cloture, lg_USER_ID porte l'utilisateur qui a valide l'avoir
                {sortable: false, menuDisabled: true, header: 'Valide par', dataIndex: 'userValidateur', flex: 1},
                {sortable: false, menuDisabled: true, header: 'Caissier', dataIndex: 'userCaissierName', flex: 1},
                this.detailsColumn()
            ]);
        }

        // Onglet "Avoir en cours"
        return base.concat([
            {sortable: false, menuDisabled: true, header: 'Date', dataIndex: 'dtUPDATED', flex: 0.6, align: 'center'},
            {sortable: false, menuDisabled: true, header: 'Heure', dataIndex: 'heure', flex: 0.6, align: 'center'},
            {sortable: false, menuDisabled: true, header: 'Vendeur', dataIndex: 'userFullName', flex: 1},
            {sortable: false, menuDisabled: true, header: 'Caissier', dataIndex: 'userCaissierName', flex: 1},
            this.detailsColumn(),
            {
                xtype: 'actioncolumn',
                header: 'Modifier',
                width: 55,
                align: 'center',
                sortable: false,
                menuDisabled: true,
                items: [{
                        icon: 'resources/images/icons/fam/page_white_edit.png',
                        tooltip: 'Modifier',
                        handler: function (view, rowIndex, colIndex, item, e, record) {
                            testextjs.app.getController('ListeAvoirCtr').onEdite(record);
                        }
                    }]
            }
        ]);
    },

    // Construit un onglet (grille + pagination) lie a un store.
    buildGrid: function (store, gridItemId, statut) {
        return {
            xtype: 'gridpanel',
            itemId: gridItemId,
            store: store,
            viewConfig: {
                forceFit: true,
                columnLines: true,
                animCollapse: false,
                hideable: false,
                draggable: false
            },
            columns: this.buildColumns(statut),
            bbar: {
                xtype: 'pagingtoolbar',
                store: store,
                dock: 'bottom',
                displayInfo: true
            }
        };
    },

    initComponent: function () {
        var me = this;

        var typeVenteStore = Ext.create('Ext.data.ArrayStore', {
            data: [['VNO'], ['VO']],
            fields: [{name: 'typeVente', type: 'string'}]
        });

        // Liste des caissiers pour le filtre
        var caissierStore = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.Utilisateur',
            autoLoad: true,
            pageSize: 2000,
            proxy: {
                type: 'ajax',
                url: '../webservices/sm_user/utilisateur/ws_data.jsp',
                reader: {type: 'json', root: 'results', totalProperty: 'total'}
            }
        });

        // Periode par defaut : du 1er du mois courant a aujourd'hui
        var today = new Date();
        var firstOfMonth = Ext.Date.getFirstDateOfMonth(today);

        // Un store par onglet : meme endpoint, parametre avoirStatut different.
        var storeEnCours = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.caisse.Vente',
            autoLoad: false,
            pageSize: 15,
            proxy: {
                type: 'ajax',
                url: '../api/v1/ventestats',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });
        var storeCloture = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.caisse.Vente',
            autoLoad: false,
            pageSize: 15,
            proxy: {
                type: 'ajax',
                url: '../api/v1/ventestats',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });

        Ext.applyIf(me, {
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top',
                    /* retours du 13/10 (point 10) : filtres sur cette ligne, garde et actions sur la suivante (champs lisibles) */
                    items: [
                        {
                            xtype: 'datefield', fieldLabel: 'Du', itemId: 'dtStart', labelWidth: 15, flex: 1, minWidth: 140,
                            submitFormat: 'Y-m-d', maxValue: new Date(), format: 'd/m/Y', value: firstOfMonth
                        }, '-',
                        {
                            xtype: 'datefield', fieldLabel: 'Au', itemId: 'dtEnd', labelWidth: 15, flex: 1, minWidth: 140,
                            submitFormat: 'Y-m-d', maxValue: new Date(), format: 'd/m/Y', value: today
                        }, '-',
                        {
                            xtype: 'timefield', fieldLabel: 'De', itemId: 'hStart', emptyText: 'Heure debut(HH:mm)',
                            flex: 0.8, minWidth: 96, labelWidth: 15, increment: 30, value: '00:00', format: 'H:i'
                        }, '-',
                        {
                            xtype: 'timefield', fieldLabel: 'A', itemId: 'hEnd', emptyText: 'Heure fin(HH:mm)',
                            flex: 0.8, minWidth: 96, labelWidth: 15, increment: 30, value: '23:59', format: 'H:i'
                        }, '-',
                        {
                            xtype: 'combobox', fieldLabel: 'Type.vente', labelWidth: 65, itemId: 'typeVente',
                            store: typeVenteStore, flex: 1, minWidth: 150, valueField: 'typeVente', displayField: 'typeVente',
                            typeAhead: false, mode: 'local', minChars: 1, emptyText: 'Selectionner un type de vente'
                        }, '-',
                        {
                            xtype: 'combobox', fieldLabel: 'Caissier', labelWidth: 50, itemId: 'caissier',
                            store: caissierStore, flex: 1, minWidth: 170, valueField: 'lg_USER_ID',
                            displayField: 'str_FIRST_LAST_NAME', queryMode: 'local', typeAhead: false,
                            emptyText: 'Tous les caissiers'
                        }, '-',
                        {
                            xtype: 'textfield', itemId: 'query', flex: 1, minWidth: 120, height: 30, enableKeyEvents: true,
                            emptyText: 'Recherche'
                        }
                    ]
                }, {
                    xtype: 'toolbar',
                    dock: 'top',
                    itemId: 'barreActionsAvoirs',
                    items: [
                        // Applique en un geste les bornes d'une garde enregistree. Cet ecran
                        // gere les heures : la garde y est donc rendue EXACTEMENT, nuit comprise.
                        {xtype: 'selecteurgarde'}, '-',
                        {text: 'rechercher', tooltip: 'rechercher', itemId: 'rechercher', scope: this, iconCls: 'searchicon'},
                        '-',
                        {text: 'Imprimer', tooltip: 'imprimer', scope: this, itemId: 'printPdf', iconCls: 'printable'},
                        '-',
                        // Retours des tests du 12/09 (point 6) : la liste s'exporte et s'inventorie
                        {text: 'Exporter en excel', tooltip: 'Exporter la liste affichée (filtres actifs) en Excel',
                            itemId: 'exporterExcel', iconCls: 'excel'},
                        {text: 'Créer un inventaire', tooltip: 'Inventaire des produits des avoirs affichés',
                            itemId: 'creerInventaire', iconCls: 'icon-grid'}
                    ]
                }],
            items: [{
                    xtype: 'tabpanel',
                    itemId: 'avoirTabs',
                    /* retours du 13/10 (point 10) : onglets restyles (pastilles arrondies, couleur par onglet) */
                    cls: 'avoir-onglets',
                    plain: true,
                    activeTab: 0,
                    deferredRender: false,
                    items: [
                        {
                            xtype: 'panel',
                            itemId: 'tabEnCours',
                            // Marqueur metier lu par le controleur
                            avoirStatut: 'EN_COURS',
                            title: 'Avoir en cours',
                            // Couleur portee par l'onglet (orange) + animation, via header.css
                            tabConfig: {cls: 'avoir-tab-encours'},
                            layout: 'fit',
                            items: [me.buildGrid(storeEnCours, 'gridEnCours', 'EN_COURS')]
                        },
                        {
                            xtype: 'panel',
                            itemId: 'tabCloture',
                            avoirStatut: 'CLOTURE',
                            title: 'Avoir clôturé',
                            // Couleur portee par l'onglet (vert), via header.css
                            tabConfig: {cls: 'avoir-tab-cloture'},
                            layout: 'fit',
                            items: [me.buildGrid(storeCloture, 'gridCloture', 'CLOTURE')]
                        },
                        {
                            /* retours du 13/10 (point 10) : analyse des avoirs de la periode affichee */
                            xtype: 'panel',
                            itemId: 'tabAnalyse',
                            libelleOnglet: 'Analyse',
                            title: 'Analyse',
                            tabConfig: {cls: 'avoir-tab-analyse', tooltip: 'Avoirs de la période : clôture, délai, produits et grossistes les plus en avoir, ancienneté'},
                            autoScroll: true,
                            bodyPadding: 12,
                            cls: 'sp-analyse',
                            items: [{xtype: 'component', itemId: 'avAnalyseContenu', html: ''}]
                        }
                    ]
                }]
        });
        me.callParent(arguments);
    },

    MOIS: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],

    /* retours du 13/10 (point 10) : analyse des avoirs, sur la periode de la barre d'outils */
    chargerAnalyse: function (dtStart, dtEnd) {
        var me = this, onglet = me.down('#tabAnalyse'), contenu = me.down('#avAnalyseContenu');
        if (dtStart && dtEnd && dtStart > dtEnd) {
            contenu.update('<span style="color:#b42318">La date de début doit précéder la date de fin.</span>');
            return;
        }
        onglet.setLoading('Calcul…');
        me.analyseAvoirs = null;
        Ext.Ajax.request({url: '../api/v1/ventestats/avoirs/analyse', method: 'GET', params: {dtStart: dtStart, dtEnd: dtEnd}, timeout: 120000,
            success: function (r) {
                if (onglet.isDestroyed) {
                    return;
                }
                onglet.setLoading(false);
                var o = Ext.decode(r.responseText, true) || {};
                if (!o.success) {
                    contenu.update('<span style="color:#b42318">' + Ext.String.htmlEncode(o.msg || 'Analyse indisponible') + '</span>');
                    return;
                }
                me.analyseAvoirs = o;
                contenu.update(me.htmlAnalyse(o));
            },
            failure: function (r) {
                if (!onglet.isDestroyed) {
                    onglet.setLoading(false);
                    contenu.update('<span style="color:#b42318">Le serveur n\'a pas répondu (' + r.status + ').</span>');
                }
            }});
    },

    htmlAnalyse: function (o) {
        var me = this, enc = Ext.String.htmlEncode, t = o.total || {};
        var entier = function (v) {
            return String(Math.round(v || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        }, pct = function (v) {
            return String(v || 0).replace('.', ',') + ' %';
        };
        var tuile = function (cls, titre, valeur, detail, aide) {
            return '<div class="pml-tuile ' + cls + '" data-qtip="' + enc(aide) + '"><div class="pml-tuile-valeur">' + valeur + '</div>'
                    + '<div class="pml-tuile-titre">' + titre + '</div><div class="pml-tuile-detail">' + detail + '</div></div>';
        };
        var delai = t.delaiMoyenJours === null || t.delaiMoyenJours === undefined ? '—' : String(t.delaiMoyenJours).replace('.', ',') + ' j';
        var html = '<div class="pml-tuiles av-tuiles">'
                + tuile('info', 'Ventes avec avoir', entier(t.avoirs), pct(t.partVentes) + ' des ' + entier(t.ventes) + ' ventes',
                        'Ventes de la période dont au moins un produit n\'a pas été servi')
                + tuile(t.enCours ? 'alerte' : 'ok', 'Encore en cours', entier(t.enCours), entier(t.valeurEnCours) + ' F encore dus',
                        'Avoirs pas encore servis au client')
                + tuile(t.tauxCloture >= 90 ? 'ok' : t.tauxCloture >= 70 ? 'alerte' : 'critique', 'Taux de clôture', pct(t.tauxCloture),
                        entier(t.clotures) + ' clôturé(s) sur ' + entier(t.avoirs), 'Avoirs servis et clôturés ÷ avoirs de la période')
                + tuile('', 'Délai moyen de clôture', delai, entier(t.quantite) + ' unité(s) · ' + entier(t.valeur) + ' F',
                        'Temps moyen entre la vente et la clôture de son avoir')
                + '</div>';
        var tableau = function (titre, cls, entete, lignes, colonnes, vide) {
            return '<div class="ac-bloc-t" style="margin-top:14px">' + titre + '</div><table class="ac-table ' + cls + '"><tr>' + entete + '</tr>'
                    + (lignes || '<tr><td colspan="' + colonnes + '" style="color:#7f8c8d">' + vide + '</td></tr>') + '</table>';
        };
        var l = '';
        Ext.each(o.produits || [], function (p) {
            l += '<tr class="av-produit"><td>' + enc(p.cip) + '</td><td>' + enc(p.libelle) + '</td><td>' + enc(p.grossiste) + '</td><td class="n">'
                    + entier(p.fois) + '</td><td class="n">' + entier(p.quantite) + '</td><td class="n">' + (p.enCours ? '<b style="color:#c0392b">' + entier(p.enCours) + '</b>' : '0')
                    + '</td><td class="n">' + entier(p.valeur) + '</td></tr>';
        });
        html += tableau('Produits le plus souvent en avoir (30 premiers)', 'av-par-produit', '<th>CIP</th><th>Produit</th><th>Grossiste</th>'
                + '<th class="n">Fois</th><th class="n">Quantité due</th><th class="n">Encore due</th><th class="n">Valeur</th>', l, 7, 'Aucun avoir sur la période.');
        l = '';
        Ext.each(o.grossistes || [], function (g) {
            l += '<tr class="av-grossiste"><td>' + enc(g.libelle) + '</td><td class="n">' + entier(g.fois) + '</td><td class="n">' + entier(g.produits)
                    + '</td><td class="n">' + entier(g.quantite) + '</td><td class="n">' + entier(g.valeur) + '</td><td class="n">' + pct(g.part) + '</td></tr>';
        });
        html += tableau('Grossiste habituel des produits en avoir', 'av-par-grossiste', '<th>Grossiste</th><th class="n">Lignes</th><th class="n">Produits</th>'
                + '<th class="n">Quantité</th><th class="n">Valeur</th><th class="n">Part</th>', l, 6, 'Aucun avoir sur la période.');
        l = '';
        Ext.each(o.anciennete || [], function (a, i) {
            l += '<tr class="av-age"><td>' + enc(a.tranche) + '</td><td class="n">' + (a.avoirs && i >= 2 ? '<b style="color:#c0392b">' + entier(a.avoirs) + '</b>' : entier(a.avoirs))
                    + '</td><td class="n">' + entier(a.valeur) + '</td></tr>';
        });
        html += tableau('Ancienneté des avoirs encore en cours (depuis la vente)', 'av-anciennete', '<th>Depuis</th><th class="n">Avoirs</th><th class="n">Valeur due</th>',
                l, 3, '');
        l = '';
        Ext.each(o.mois || [], function (m) {
            var p = String(m.mois).split('-');
            l += '<tr class="av-mois"><td>' + (p.length === 2 ? me.MOIS[parseInt(p[1], 10) - 1] + ' ' + p[0] : enc(m.mois)) + '</td><td class="n">' + entier(m.ventes)
                    + '</td><td class="n">' + entier(m.avoirs) + '</td><td class="n">' + pct(m.part) + '</td><td class="n">' + entier(m.clotures)
                    + '</td><td class="n">' + entier(m.valeur) + '</td></tr>';
        });
        html += tableau('Par mois', 'av-par-mois', '<th>Mois</th><th class="n">Ventes</th><th class="n">Avec avoir</th><th class="n">Part</th>'
                + '<th class="n">Clôturés</th><th class="n">Valeur due</th>', l, 6, 'Aucune vente sur la période.');
        return html;
    }
});
