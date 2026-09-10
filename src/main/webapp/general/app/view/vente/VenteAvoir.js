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
                    items: [
                        {
                            xtype: 'datefield', fieldLabel: 'Du', itemId: 'dtStart', labelWidth: 15, flex: 1,
                            submitFormat: 'Y-m-d', maxValue: new Date(), format: 'd/m/Y', value: firstOfMonth
                        }, '-',
                        {
                            xtype: 'datefield', fieldLabel: 'Au', itemId: 'dtEnd', labelWidth: 15, flex: 1,
                            submitFormat: 'Y-m-d', maxValue: new Date(), format: 'd/m/Y', value: today
                        }, '-',
                        {
                            xtype: 'timefield', fieldLabel: 'De', itemId: 'hStart', emptyText: 'Heure debut(HH:mm)',
                            flex: 0.8, labelWidth: 15, increment: 30, value: '00:00', format: 'H:i'
                        }, '-',
                        {
                            xtype: 'timefield', fieldLabel: 'A', itemId: 'hEnd', emptyText: 'Heure fin(HH:mm)',
                            flex: 0.8, labelWidth: 15, increment: 30, value: '23:59', format: 'H:i'
                        }, '-',
                        {
                            xtype: 'combobox', fieldLabel: 'Type.vente', labelWidth: 65, itemId: 'typeVente',
                            store: typeVenteStore, flex: 1, valueField: 'typeVente', displayField: 'typeVente',
                            typeAhead: false, mode: 'local', minChars: 1, emptyText: 'Selectionner un type de vente'
                        }, '-',
                        {
                            xtype: 'combobox', fieldLabel: 'Caissier', labelWidth: 50, itemId: 'caissier',
                            store: caissierStore, flex: 1, valueField: 'lg_USER_ID',
                            displayField: 'str_FIRST_LAST_NAME', queryMode: 'local', typeAhead: false,
                            emptyText: 'Tous les caissiers'
                        }, '-',
                        {
                            xtype: 'textfield', itemId: 'query', flex: 1, height: 30, enableKeyEvents: true,
                            emptyText: 'Recherche'
                        }, '-',
                        // Applique en un geste les bornes d'une garde enregistree. Cet ecran
                        // gere les heures : la garde y est donc rendue EXACTEMENT, nuit comprise.
                        {xtype: 'selecteurgarde'}, '-',
                        {text: 'rechercher', tooltip: 'rechercher', itemId: 'rechercher', scope: this, iconCls: 'searchicon'},
                        '-',
                        {text: 'Imprimer', tooltip: 'imprimer', scope: this, itemId: 'printPdf', iconCls: 'printable'}
                    ]
                }],
            items: [{
                    xtype: 'tabpanel',
                    itemId: 'avoirTabs',
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
                        }
                    ]
                }]
        });
        me.callParent(arguments);
    }
});
