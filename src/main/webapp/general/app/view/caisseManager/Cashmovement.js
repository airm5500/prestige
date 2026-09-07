/* global Ext */

Ext.define('testextjs.view.caisseManager.Cashmovement', {
    extend: 'Ext.panel.Panel',
    xtype: 'cashmovements',
    requires: [
        'testextjs.view.garde.SelecteurGarde'
    ],
    frame: true,
    title: 'Liste des mouvements',
    iconCls: 'icon-grid',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
    initComponent: function () {
        var storeUser = new Ext.data.Store({
            model: 'testextjs.model.caisse.User',
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/users',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });

        /* Types de mouvement de caisse : le controleur, l'impression et la
           ressource REST attendent tous un typeMvtId, mais la liste deroulante
           qui le fournit manquait a la barre d'outils. L'ecran plantait donc
           des son ouverture (getTypeMvt() introuvable). Meme source que le
           journal des mouvements de caisse. */
        /* L'ecran ne retient que cinq types de mouvement (voir les predicats de
           CaisseServiceImpl.mouvementCaisses : fonds de caisse, reglements differes,
           reglements tiers payant, sorties et entrees de caisse). La liste ne propose
           qu'eux : laisser choisir un type que l'ecran n'affiche jamais ne menerait
           qu'a une grille vide sans explication. */
        var TYPES_AFFICHES = ['1', '2', '3', '4', '5'];
        var storeTypeMvt = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.TypeEcartMvt',
            autoLoad: true,
            pageSize: 999999,
            proxy: {
                type: 'ajax',
                url: '../api/v1/typeMvtCaisse/list',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            },
            listeners: {
                load: function (magasin) {
                    magasin.filterBy(function (enregistrement) {
                        return Ext.Array.contains(TYPES_AFFICHES,
                                String(enregistrement.get('lg_TYPE_MVT_CAISSE_ID')));
                    });
                }
            }
        });
        var store = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            /* « filds » (faute de frappe) laissait le store SANS champ ni modele : la reponse du
               serveur ne pouvait etre transformee en lignes, le chargement echouait et la grille
               restait vide quoi qu'on cherche. */
            fields: [
                {
                    name: 'id',
                    type: 'string'
                },
                {
                    name: 'typeMouvement',
                    type: 'string'
                },
                {
                    name: 'typeMvt',
                    type: 'string'
                },
                {
                    name: 'reference',
                    type: 'string'
                },
                {
                    name: 'operateur',
                    type: 'string'
                },
                {
                    name: 'operateurId',
                    type: 'string'
                },
                {
                    name: 'client',
                    type: 'string'
                },
                {
                    name: 'montant',
                    type: 'number'
                },
                {
                    name: 'modeReglement',
                    type: 'string'
                },
                {
                    name: 'modeRegle',
                    type: 'string'
                },
                {
                    name: 'taskDate',
                    type: 'string'
                },
                {
                    name: 'taskHeure',
                    type: 'string'
                },
                {
                    name: 'numeroComptable',
                    type: 'string'
                }

            ],
            autoLoad: false,
            pageSize: 25,
            proxy: {
                type: 'ajax',
                url: '../api/v1/caisse/mvtcaisses',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'
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
                            itemId: 'dtStart',
                            labelWidth: 15,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                             value: new Date(),
                            format: 'd/m/Y'

                        }, '-', {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
                            labelWidth: 15,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        },
                        '-', {
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

                        }, '-',
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Type',
                            itemId: 'typeMvt',
                            store: storeTypeMvt,
                            valueField: 'lg_TYPE_MVT_CAISSE_ID',
                            displayField: 'str_NAME',
                            queryMode: 'local',
                            editable: false,
                            flex: 2,
                            labelWidth: 35,
                            emptyText: 'Tous les types...'
                        }, '-',

                        // Applique en un geste les bornes d'une garde enregistree.
                        {xtype: 'selecteurgarde'},
                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        }, '-', {
                            text: 'imprimer',
                            itemId: 'imprimer',
                            iconCls: 'printable',
                            tooltip: 'imprimer',
                            scope: this
                        }
                    ]
                }

            ],
            items: [
                {
                    /*tools: [{
                     type: 'refresh',
                     tooltip: 'Actualiser'
                     }],*/
                  xtype:'gridpanel',
                    store: store,
                    viewConfig: {
                        forceFit: true,
                        emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
                    },
                    columns: [
                        {
                            header: 'Type Mouvement',
                            dataIndex: 'typeMouvement',
                            flex: 1
                        }, {
                            header: 'Numéro.Comptable',
                            dataIndex: 'numeroComptable',
                            flex: 1
                        }
                        , {
                            header: 'Reference',
                            dataIndex: 'reference',
                            flex: 1
                        }
                        , {
                            header: 'Opérateur',
                            dataIndex: 'operateur',
                            flex: 1
                        }

                        , {
                            header: 'Date',
                            dataIndex: 'taskDate',
                            flex: 0.7
                        }, {

                            header: 'Heure',
                            dataIndex: 'taskHeure',
                            flex: 0.7

                        }, {
                            header: 'Mode.R&egrave;gelement',
                            dataIndex: 'modeReglement',
                            flex: 1
                        }, {
                            xtype: 'numbercolumn',
                            header: 'Montant',
                            dataIndex: 'montant',
                            flex: 1,
                            align: 'right',
                            renderer: function (v, metaData, record) {
                                if (v < 0) {
                                    metaData['style'] = 'color:red;';
                                    v = Ext.util.Format.number((-1) * v, '0,000.');
                                    return '-' + v;
                                } else {

                                    return Ext.util.Format.number(v, '0,000.');

                                }

                            }
                        }],

                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store,
                        pageSize: 25,
                        dock: 'bottom',
                        displayInfo: true

                    }
                }

            ]

        });
        me.callParent(arguments);
    }
});


