/* global Ext */

Ext.define('testextjs.view.caisseManager.ListeCaisse', {
    extend: 'Ext.panel.Panel',
    xtype: 'listecaissemanager',
    requires: [
        'testextjs.view.caisseManager.ListeCaisseGrid',
        'testextjs.model.caisse.Reglement',
        'testextjs.model.caisse.User',
        'testextjs.model.caisse.Caisse',
        'Ext.grid.plugin.RowExpander'

    ],

    frame: true,
    title: 'Liste de Caisse',
    width: '97%',
    height: Ext.getBody().getViewSize().height * 0.85,
    minHeight: 570,
//    maxHeight: 800,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
    statics: {
        /*
         * Plan du 19/11, point 15 : export CSV / Excel de la liste de caisse et de la visualisation de caisse. Memes
         * criteres que l'ecran (dates, heures, type de reglement, utilisateur), toute la periode et non la seule page ;
         * le telechargement se suit sur le bouton « Exporter ».
         */
        boutonExporter: function (ecran) {
            return {
                text: 'Exporter',
                itemId: 'exporter',
                iconCls: 'excel',
                tooltip: 'Exporter en Excel ou en CSV toute la liste affich&eacute;e',
                menu: {
                    items: [{
                            text: 'Excel (.xlsx)',
                            itemId: 'exporterExcel',
                            iconCls: 'excel',
                            handler: function (item) {
                                testextjs.view.caisseManager.ListeCaisse.exporter(item, ecran, 'xlsx');
                            }
                        }, {
                            text: 'CSV (.csv)',
                            itemId: 'exporterCsv',
                            iconCls: 'excel',
                            handler: function (item) {
                                testextjs.view.caisseManager.ListeCaisse.exporter(item, ecran, 'csv');
                            }
                        }]
                }
            };
        },
        exporter: function (item, ecran, format) {
            const panneau = Ext.ComponentQuery.query(ecran === 'visualisation' ? 'visualisercaissemanager' : 'listecaissemanager')
                    .filter(function (c) {
                        return c.isVisible(true);
                    })[0];
            if (!panneau) {
                return;
            }
            const valeur = function (id) {
                const c = panneau.down('#' + id);
                return c ? (c.getSubmitValue ? c.getSubmitValue() : c.getValue()) || '' : '';
            };
            const combo = function (id) {
                const c = panneau.down('#' + id);
                return c && c.getValue() ? {id: c.getValue(), libelle: c.getRawValue() || ''} : {id: '', libelle: ''};
            };
            const reglement = combo('reglement'), utilisateur = combo('user');
            const parametres = {
                format: format, ecran: ecran,
                startDate: valeur('startDate'), endDate: valeur('endDate'), startH: valeur('startH'), endH: valeur('endH'),
                reglement: reglement.id, reglementLibelle: reglement.libelle, user: utilisateur.id, utilisateurLibelle: utilisateur.libelle
            };
            const nom = (ecran === 'visualisation' ? 'visualisation_caisse_' : 'liste_caisse_') + parametres.startDate + '_' + parametres.endDate + '.' + format;
            PrestigeChargement.telecharger(panneau.down('#exporter') || item, '../api/v1/caisse/listecaisse/export?' + Ext.Object.toQueryString(parametres),
                    'Export', nom);
        }
    },
    initComponent: function () {

        var store_typereglement = new Ext.data.Store({
            model: 'testextjs.model.caisse.Reglement',
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/reglement',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });

        var storeUser = new Ext.data.Store({
            model: 'testextjs.model.caisse.User',
            pageSize: 10,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/users',
                extraParams: {excludeAdmin: true},
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        var me = this;
        Ext.applyIf(me, {
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            itemId: 'startDate',
                            margin: '0 10 0 0',
                            submitFormat: 'Y-m-d',
                            flex: 1,
                            labelWidth: 20,
                            maxValue: new Date(),
                            value: new Date(),
                            format: 'd/m/Y'

                        }, {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'endDate',
                            labelWidth: 20,
                            flex: 1,
                            maxValue: new Date(),
                            value: new Date(),
                            margin: '0 9 0 0',
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y'

                        }, '-', {
                            xtype: 'timefield',
                            fieldLabel: 'De',
                            itemId: 'startH',
                            emptyText: 'Heure debut(HH:mm)',
                            flex: 1,
                            labelWidth: 20,
                            increment: 30,
                            value: '00:00',
                            submitFormat: 'H:i',
                            format: 'H:i'
                        }, {
                            xtype: 'timefield',
                            fieldLabel: 'A',
                            itemId: 'endH',
                            emptyText: 'Heure fin(HH:mm)',
                            labelWidth: 10,
                            increment: 30,
                            flex: 1,
                            format: 'H:i',
                            value: '23:59',
                            submitFormat: 'H:i'
                        }, '-', {
                            xtype: 'combobox',
                            fieldLabel: 'Type.Reglement',
                            itemId: 'reglement',
                            store: store_typereglement,
                            flex: 2,
                            valueField: 'lgTYPEREGLEMENTID',
                            displayField: 'strNAME',
                            typeAhead: false,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Selectionner un type de reglement...'

                        }, '-', {
                            xtype: 'combobox',
                            fieldLabel: 'Utilisateur',
                            itemId: 'user',
                            store: storeUser,
                            pageSize: 10,
                            valueField: 'lgUSERID',
                            displayField: 'fullName',
                            typeAhead: false,
                            flex: 2,
                            minChars: 2,
                            labelWidth: 60,
                            queryMode: 'remote',
                            emptyText: 'Choisir un utilisateur...'

                        },
                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        }
                        , {
                            text: 'imprimer',
                            itemId: 'imprimer',
                            iconCls: 'printable',
                            tooltip: 'imprimer',
                            scope: this
                        }, testextjs.view.caisseManager.ListeCaisse.boutonExporter('liste')
                    ]
                }

            ],
            items: [{
                    xtype: 'listeCaisseGrid',
                    plugins: [{
                            ptype: 'rowexpander',
                            rowBodyTpl: new Ext.XTemplate(
                                    '<p>{items}</p>'
                                    )
                        }
                    ]
                }]

        });
        me.callParent(arguments);
    }
});


