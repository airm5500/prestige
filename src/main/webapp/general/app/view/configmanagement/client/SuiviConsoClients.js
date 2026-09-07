/* global Ext */

/**
 * Onglet "Suivi de consommation" de la gestion des clients : pour chaque
 * client ayant achete sur la periode, nombre d'achats, montant cumule,
 * dernier achat, frequence moyenne d'achat, contact et habitude (mensuel,
 * bimensuel, ponctuel, dormant), avec filtres (periode, client, type de
 * client, habitude, tri), exports CSV/Excel et impressions (liste globale
 * et fiche par client).
 *
 * Point 2 : recherche multicritere (medicament, frequence de renouvellement,
 * nombre d'achats, montant cumule, combines en ET), cases a cocher pour
 * choisir des destinataires, bouton « SMS / WhatsApp » qui ouvre la fenetre
 * de campagne (modele, controle des numeros, envoi). Quand un medicament est
 * filtre, les cumuls et la frequence portent sur ce medicament.
 */
Ext.define('testextjs.view.configmanagement.client.SuiviConsoClients', {
    extend: 'Ext.panel.Panel',
    xtype: 'suiviconsoclients',
    requires: [
        'testextjs.view.garde.SelecteurGarde',
        'testextjs.view.configmanagement.client.action.consommationClient',
        'testextjs.view.configmanagement.client.action.CampagneClient',
        'testextjs.model.Search'
    ],

    frame: true,
    title: 'Suivi de consommation',
    iconCls: 'icon-grid',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
    initComponent: function () {
        var me = this;
        var unAnAvant = Ext.Date.add(new Date(), Ext.Date.MONTH, -12);

        var storeHabitude = Ext.create('Ext.data.Store', {
            fields: ['value', 'libelle'],
            data: [
                {value: '', libelle: 'Toutes les habitudes'},
                {value: 'Mensuel', libelle: 'Mensuel'},
                {value: 'Bimensuel', libelle: 'Bimensuel'},
                {value: 'Ponctuel', libelle: 'Ponctuel'},
                {value: 'Dormant', libelle: 'Dormant'}
            ]
        });

        var storeTri = Ext.create('Ext.data.Store', {
            fields: ['value', 'libelle'],
            data: [
                {value: 'montant', libelle: 'Montant d\'achat'},
                {value: 'nbAchats', libelle: 'Nombre d\'achats'}
            ]
        });

        /* operateurs autorises pour les criteres numeriques (liste blanche cote serveur aussi) */
        var storeOperateurs = Ext.create('Ext.data.Store', {
            fields: ['value', 'libelle'],
            data: [
                {value: '', libelle: '(aucun)'},
                {value: '=', libelle: '='},
                {value: '>=', libelle: '>='},
                {value: '<=', libelle: '<='},
                {value: '>', libelle: '>'},
                {value: '<', libelle: '<'}
            ]
        });

        /* types de tiers payant (assurance, carnet...) + choix 'Clients standards' */
        var storeTypeClient = Ext.create('Ext.data.Store', {
            fields: ['lg_TYPE_TIERS_PAYANT_ID', 'str_LIBELLE_TYPE_TIERS_PAYANT'],
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../webservices/tierspayantmanagement/typetierspayant/ws_data.jsp',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            },
            listeners: {
                load: function (store) {
                    store.insert(0, [
                        {lg_TYPE_TIERS_PAYANT_ID: '', str_LIBELLE_TYPE_TIERS_PAYANT: 'Tous les clients'},
                        {lg_TYPE_TIERS_PAYANT_ID: 'STANDARD', str_LIBELLE_TYPE_TIERS_PAYANT: 'Clients standards'}
                    ]);
                }
            }
        });

        /* recherche de medicament par nom ou CIP (meme service que la saisie de commande) */
        var storeMedicament = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.Search',
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit-search/produits',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });

        var store = Ext.create('Ext.data.Store', {
            fields: [
                {name: 'clientId', type: 'string'},
                {name: 'client', type: 'string'},
                {name: 'contact', type: 'string'},
                {name: 'telephone', type: 'string'},
                {name: 'consentSms', type: 'auto'},
                {name: 'nbAchats', type: 'number'},
                {name: 'montant', type: 'number'},
                {name: 'dernierAchat', type: 'string'},
                {name: 'premierAchat', type: 'string'},
                {name: 'frequenceJours', type: 'number'},
                {name: 'habitude', type: 'string'}
            ],
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/client/consommation/globale',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        me.consoStore = store;

        var critereNumerique = function (itemId, libelle, largeurLabel, infobulle) {
            return [{
                    xtype: 'combobox',
                    itemId: itemId + 'Op',
                    fieldLabel: libelle,
                    labelWidth: largeurLabel,
                    width: largeurLabel + 78,
                    store: storeOperateurs,
                    valueField: 'value',
                    displayField: 'libelle',
                    queryMode: 'local',
                    editable: false,
                    value: '',
                    tooltip: infobulle
                }, {
                    xtype: 'numberfield',
                    itemId: itemId,
                    width: 90,
                    minValue: 0,
                    allowDecimals: false,
                    hideTrigger: true,
                    emptyText: 'valeur',
                    enableKeyEvents: true,
                    listeners: {
                        specialkey: function (field, e) {
                            if (e.getKey() === e.ENTER) {
                                me.doSearch();
                            }
                        }
                    }
                }];
        };

        Ext.applyIf(me, {
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'dtStart',
                            labelWidth: 20,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: unAnAvant
                        }, '-', {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            labelWidth: 20,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()
                        }, '-', {
                            xtype: 'textfield',
                            itemId: 'query',
                            flex: 1,
                            emptyText: 'Nom du client',
                            enableKeyEvents: true,
                            listeners: {
                                specialkey: function (field, e) {
                                    if (e.getKey() === e.ENTER) {
                                        me.doSearch();
                                    }
                                }
                            }
                        }, '-', {
                            xtype: 'combobox',
                            itemId: 'typeClient',
                            flex: 1,
                            store: storeTypeClient,
                            valueField: 'lg_TYPE_TIERS_PAYANT_ID',
                            displayField: 'str_LIBELLE_TYPE_TIERS_PAYANT',
                            queryMode: 'local',
                            editable: false,
                            emptyText: 'Tous les clients',
                            listeners: {
                                select: function () {
                                    me.doSearch();
                                }
                            }
                        }, '-', {
                            xtype: 'combobox',
                            itemId: 'habitude',
                            flex: 1,
                            store: storeHabitude,
                            valueField: 'value',
                            displayField: 'libelle',
                            queryMode: 'local',
                            editable: false,
                            emptyText: 'Toutes les habitudes',
                            listeners: {
                                select: function () {
                                    me.doSearch();
                                }
                            }
                        }, '-', {
                            xtype: 'combobox',
                            fieldLabel: 'Tri',
                            labelWidth: 25,
                            itemId: 'sortBy',
                            flex: 1,
                            store: storeTri,
                            valueField: 'value',
                            displayField: 'libelle',
                            queryMode: 'local',
                            editable: false,
                            value: 'montant',
                            listeners: {
                                select: function () {
                                    me.doSearch();
                                }
                            }
                        }, '-', // Applique en un geste les bornes d'une garde enregistree.
 {xtype: 'selecteurgarde'},
 {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            iconCls: 'searchicon',
                            scope: me,
                            handler: me.doSearch
                        }, '-', {
                            text: 'CSV',
                            tooltip: 'Exporter la liste en CSV',
                            iconCls: 'export_csv_icon',
                            handler: function () {
                                window.location = '../api/v1/client/consommation/globale/csv?' + me.buildParams();
                            }
                        }, {
                            text: 'Excel',
                            tooltip: 'Exporter la liste en Excel',
                            iconCls: 'export_excel_icon',
                            handler: function () {
                                window.location = '../api/v1/client/consommation/globale/excel?' + me.buildParams();
                            }
                        }, {
                            text: 'Imprimer',
                            tooltip: 'Imprimer la liste',
                            iconCls: 'printable',
                            handler: function () {
                                window.open('../api/v1/client/consommation/globale/pdf?' + me.buildParams());
                            }
                        }
                    ]
                },
                {
                    /* Point 2 : criteres de consommation, combines en ET avec ceux du dessus */
                    xtype: 'toolbar',
                    dock: 'top',
                    itemId: 'barreCriteres',
                    items: [
                        {
                            xtype: 'combobox',
                            itemId: 'medicament',
                            fieldLabel: 'Médicament',
                            labelWidth: 75,
                            flex: 2,
                            store: storeMedicament,
                            valueField: 'lg_FAMILLE_ID',
                            displayField: 'str_DESCRIPTION',
                            queryMode: 'remote',
                            queryParam: 'query',
                            pageSize: 20,
                            minChars: 3,
                            forceSelection: false,
                            typeAhead: false,
                            emptyText: 'Nom ou code CIP (contient)',
                            listConfig: {
                                getInnerTpl: function () {
                                    return '<span style="color:#1e7e34;">{CIP}</span> - {str_DESCRIPTION}';
                                }
                            },
                            listeners: {
                                select: function (cmp, records) {
                                    me.medicamentChoisi = records && records[0] ? {
                                        familleId: records[0].get('lg_FAMILLE_ID'),
                                        libelle: records[0].get('str_DESCRIPTION')
                                    } : null;
                                    me.doSearch();
                                },
                                change: function (cmp, valeur) {
                                    if (me.medicamentChoisi && valeur !== me.medicamentChoisi.familleId) {
                                        me.medicamentChoisi = null;
                                    }
                                },
                                specialkey: function (field, e) {
                                    if (e.getKey() === e.ENTER) {
                                        me.doSearch();
                                    }
                                }
                            }
                        }, '-'
                    ].concat(critereNumerique('frequence', 'Fréquence (j)', 78,
                            'Fréquence moyenne de renouvellement du médicament filtré ; « = » tolère ± 3 jours'))
                            .concat(['-'])
                            .concat(critereNumerique('nbAchats', 'Achats', 45, 'Nombre de tickets distincts'))
                            .concat(['-'])
                            .concat(critereNumerique('montant', 'Montant', 52, 'Montant cumulé sur la période'))
                            .concat(['-', {
                                    text: 'Effacer',
                                    tooltip: 'Effacer les critères de consommation',
                                    itemId: 'btnEffacerCriteres',
                                    iconCls: 'cancelicon',
                                    handler: function () {
                                        me.effacerCriteres();
                                        me.doSearch();
                                    }
                                }, '->', {
                                    text: 'SMS / WhatsApp',
                                    tooltip: 'Contacter les clients cochés, ou tout le résultat si aucun n\'est coché',
                                    itemId: 'btnCampagne',
                                    iconCls: 'addicon',
                                    handler: function () {
                                        me.ouvrirCampagne();
                                    }
                                }])
                }
            ],
            items: [
                {
                    xtype: 'gridpanel',
                    itemId: 'consoGrid',
                    store: store,
                    /* survol de ligne bien visible (vente-theme.css) */
                    cls: 'vp-grille-survol',
                    selModel: Ext.create('Ext.selection.CheckboxModel', {
                        checkOnly: true,
                        injectCheckbox: 'first',
                        mode: 'MULTI',
                        pruneRemoved: false
                    }),
                    viewConfig: {
                        forceFit: true,
                        emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
                    },
                    columns: [
                        {
                            xtype: 'rownumberer',
                            text: 'LG',
                            width: 40
                        }, {
                            header: 'Client',
                            dataIndex: 'client',
                            flex: 1.8
                        }, {
                            header: 'Téléphone',
                            dataIndex: 'telephone',
                            flex: 0.9
                        }, {
                            header: 'Consent.',
                            dataIndex: 'consentSms',
                            align: 'center',
                            flex: 0.5,
                            renderer: function (v, metaData) {
                                if (v === true || v === 'true') {
                                    metaData.tdAttr = 'data-qtip="Le client accepte les SMS / WhatsApp"';
                                    return '<span style="color:#1e7e34;font-weight:bold;">Oui</span>';
                                }
                                if (v === false || v === 'false') {
                                    metaData.tdAttr = 'data-qtip="Le client a refusé : exclu des campagnes"';
                                    return '<span style="color:#c0392b;font-weight:bold;">Non</span>';
                                }
                                metaData.tdAttr = 'data-qtip="Consentement non renseigné sur la fiche"';
                                return '<span style="color:#999;">-</span>';
                            }
                        }, {
                            xtype: 'numbercolumn',
                            header: 'Nb achats',
                            dataIndex: 'nbAchats',
                            format: '0,000.',
                            align: 'right',
                            flex: 0.6
                        }, {
                            xtype: 'numbercolumn',
                            header: 'Montant cumul&eacute;',
                            dataIndex: 'montant',
                            format: '0,000.',
                            align: 'right',
                            flex: 0.9,
                            renderer: function (v, metaData) {
                                metaData.style = 'font-weight:700;';
                                return Ext.util.Format.number(v, '0,000.');
                            }
                        }, {
                            header: 'Dernier achat',
                            dataIndex: 'dernierAchat',
                            align: 'center',
                            flex: 0.8
                        }, {
                            header: 'Fr&eacute;quence achat',
                            dataIndex: 'frequenceJours',
                            align: 'right',
                            flex: 0.8,
                            renderer: function (v, metaData, record) {
                                if (record.get('nbAchats') < 2) {
                                    // un seul achat : aucune frequence calculable
                                    metaData.tdAttr = 'data-qtitle="Fréquence d\'achat" '
                                            + 'data-qtip="Un seul achat sur la période : la fréquence '
                                            + 'ne peut pas être calculée (il en faut au moins deux)."';
                                    return '-';
                                }
                                // Explication de la valeur au survol (retour d'officine)
                                var jours = Number(v) || 0;
                                var repere = jours < 1 ? 'plusieurs achats le même jour'
                                        : (jours <= 20 ? 'environ 2 fois par mois ou plus'
                                                : (jours <= 45 ? 'environ une fois par mois'
                                                        : (jours <= 120 ? 'quelques achats par an'
                                                                : 'achats rares')));
                                metaData.tdAttr = 'data-qtitle="Fréquence d\'achat" '
                                        + 'data-qtip="Nombre moyen de jours entre deux achats du client '
                                        + 'sur la période : ' + repere + '."';
                                if (v < 1) {
                                    return '&lt; 1 jour';
                                }
                                return Ext.util.Format.number(v, '0,000.') + ' jour(s)';
                            }
                        }, {
                            header: 'Habitude',
                            dataIndex: 'habitude',
                            align: 'center',
                            flex: 0.7,
                            renderer: function (v, metaData) {
                                var colors = {
                                    'Mensuel': '#2E7D32',
                                    'Bimensuel': '#0D47A1',
                                    'Ponctuel': '#E65100',
                                    'Dormant': '#9E9E9E'
                                };
                                // Signification de chaque habitude au survol (retour d'officine) :
                                // la couleur seule ne dit pas ce que vaut la valeur affichee.
                                var explications = {
                                    'Mensuel': 'Le client achète environ une fois par mois.',
                                    'Bimensuel': 'Le client achète environ deux fois par mois.',
                                    'Ponctuel': 'Le client achète de temps en temps, sans régularité.',
                                    'Dormant': 'Le client n\'a plus acheté depuis longtemps.'
                                };
                                var color = colors[v] || '#333';
                                if (metaData && explications[v]) {
                                    metaData.tdAttr = 'data-qtitle="' + v + '" '
                                            + 'data-qtip="' + explications[v] + '"';
                                }
                                return '<span style="color:' + color + ';font-weight:700;">' + v + '</span>';
                            }
                        }, {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/chart_bar.png',
                                    tooltip: 'Voir la consommation par m&eacute;dicament',
                                    scope: me,
                                    handler: function (grid, rowIndex) {
                                        var rec = grid.getStore().getAt(rowIndex);
                                        new testextjs.view.configmanagement.client.action.consommationClient({
                                            odatasource: {lg_CLIENT_ID: rec.get('clientId')},
                                            parentview: me,
                                            titre: "Suivi de consommation : [" + rec.get('client') + "]"
                                        });
                                    }
                                }]
                        }, {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/printer.png',
                                    tooltip: 'Imprimer la fiche de consommation de ce client',
                                    scope: me,
                                    handler: function (grid, rowIndex) {
                                        var rec = grid.getStore().getAt(rowIndex);
                                        window.open('../api/v1/client/consommation/pdf?clientId=' + rec.get('clientId')
                                                + '&dtStart=' + me.down('#dtStart').getSubmitValue()
                                                + '&dtEnd=' + me.down('#dtEnd').getSubmitValue());
                                    }
                                }]
                        }
                    ],
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store,
                        pageSize: 20,
                        dock: 'bottom',
                        displayInfo: true,
                        items: ['-', {
                                xtype: 'tbtext',
                                itemId: 'selectionTexte',
                                text: ''
                            }]
                    }
                }
            ]
        });
        me.callParent(arguments);

        store.on('beforeload', function (s) {
            var proxy = s.getProxy();
            var f = me.filtres();
            Ext.Object.each(f, function (cle, valeur) {
                proxy.setExtraParam(cle, valeur);
            });
        });
        me.down('#consoGrid').getSelectionModel().on('selectionchange', function (sm, selection) {
            var texte = me.down('#selectionTexte');
            if (texte) {
                texte.setText(selection.length ? '<b>' + selection.length + '</b> client(s) coché(s)' : '');
            }
        });
        me.on('afterrender', function () {
            store.load();
        }, me, {single: true, delay: 1});
    },

    /** Medicament filtre : produit choisi dans la liste (identifiant exact) ou texte libre (contient). */
    medicamentParams: function () {
        var me = this;
        var combo = me.down('#medicament');
        var brut = combo.getRawValue ? (combo.getRawValue() || '') : '';
        if (me.medicamentChoisi && combo.getValue() === me.medicamentChoisi.familleId) {
            return {familleId: me.medicamentChoisi.familleId, medicament: '', libelle: me.medicamentChoisi.libelle};
        }
        return {familleId: '', medicament: Ext.String.trim(brut), libelle: Ext.String.trim(brut)};
    },

    /** Tous les criteres, tels qu'envoyes au serveur (grille, exports, PDF, campagne). */
    filtres: function () {
        var me = this;
        var med = me.medicamentParams();
        var num = function (itemId) {
            var v = me.down('#' + itemId).getValue();
            return (v === null || v === undefined || v === '') ? '' : String(v);
        };
        return {
            dtStart: me.down('#dtStart').getSubmitValue(),
            dtEnd: me.down('#dtEnd').getSubmitValue(),
            query: me.down('#query').getValue() || '',
            habitude: me.down('#habitude').getValue() || '',
            typeClient: me.down('#typeClient').getValue() || '',
            sortBy: me.down('#sortBy').getValue() || 'montant',
            medicament: med.medicament,
            familleId: med.familleId,
            frequenceOp: me.down('#frequenceOp').getValue() || '',
            frequence: num('frequence'),
            nbAchatsOp: me.down('#nbAchatsOp').getValue() || '',
            nbAchats: num('nbAchats'),
            montantOp: me.down('#montantOp').getValue() || '',
            montant: num('montant')
        };
    },

    buildParams: function () {
        return Ext.Object.toQueryString(this.filtres());
    },

    effacerCriteres: function () {
        var me = this;
        me.medicamentChoisi = null;
        me.down('#medicament').clearValue();
        Ext.Array.each(['frequenceOp', 'nbAchatsOp', 'montantOp'], function (id) {
            me.down('#' + id).setValue('');
        });
        Ext.Array.each(['frequence', 'nbAchats', 'montant'], function (id) {
            me.down('#' + id).setValue(null);
        });
    },

    doSearch: function () {
        this.down('#consoGrid').getSelectionModel().deselectAll();
        this.consoStore.loadPage(1);
    },

    /** Fenetre SMS / WhatsApp : clients coches, sinon tout le resultat multicritere courant. */
    ouvrirCampagne: function () {
        var me = this;
        var selection = me.down('#consoGrid').getSelectionModel().getSelection();
        var total = me.consoStore.getTotalCount();
        if (!selection.length && !total) {
            Ext.Msg.alert('Message', 'Aucun client dans le résultat : rien à contacter.');
            return;
        }
        Ext.create('testextjs.view.configmanagement.client.action.CampagneClient', {
            filtres: me.filtres(),
            clientIds: Ext.Array.map(selection, function (r) {
                return r.get('clientId');
            }),
            nbResultat: total,
            medicamentLibelle: me.medicamentParams().libelle
        }).show();
    }
});
