/* global Ext */

Ext.define('testextjs.view.reglement.Differe', {
    extend: 'Ext.tab.Panel',
    xtype: 'delayed',
    requires: [
        'testextjs.model.caisse.ClientLambda'
    ],
    frame: true,
    width: '97%',
    height: 'auto',
    minHeight: 570,
    fullscreen: true,
    // border:1,
//    cls: 'custompanel',
    tabPosition: "top",
    initComponent: function () {
        var liste = new Ext.data.Store({
            fields: [
                {
                    name: 'etat',
                    type: 'string'
                }, {
                    name: 'clientId',
                    type: 'string'
                },
                {
                    name: 'clientFullName',
                    type: 'string'
                },
                {
                    name: 'reference',
                    type: 'string'
                },

                {
                    name: 'heure',
                    type: 'string'
                },
                {
                    name: 'dateOp',
                    type: 'string'
                },
                {
                    name: 'montantAttendu',
                    type: 'number'
                },
                {
                    name: 'montantRegle',
                    type: 'number'
                },
                {
                    name: 'totalAmount',
                    type: 'number'
                },
                {
                    name: 'montantRestant',
                    type: 'number'
                }

            ],
            pageSize: 999,
            autoLoad: false,
            groupField: 'clientFullName',
            proxy: {
                type: 'ajax',
                url: '../api/v1/reglement/liste',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'

                }

            }
        });
        var diffreglement = new Ext.data.Store({
            fields: [
                {
                    name: 'clientId',
                    type: 'string'
                },
                {
                    name: 'clientFullName',
                    type: 'string'
                },
                {
                    name: 'libelleRegl',
                    type: 'string'
                },
                {
                    name: 'idRegle',
                    type: 'string'
                },
                {
                    name: 'heure',
                    type: 'string'
                },
                {
                    name: 'dateOp',
                    type: 'string'
                },
                {
                    name: 'montantAttendu',
                    type: 'number'
                },
                {
                    name: 'montantRegle',
                    type: 'number'
                },
                {
                    name: 'montantRestant',
                    type: 'number'
                },
                {
                    name: 'solde',
                    type: 'number'
                },
                {
                    name: 'soldeFormated',
                    type: 'string'
                },

                {
                    name: 'userFullName',
                    type: 'string'
                }, {
                    name: 'reference',
                    type: 'string'
                }
            ],
            pageSize: 20,
            autoLoad: false,
            groupField: 'clientFullName',
            proxy: {
                type: 'ajax',
                url: '../api/v1/reglement/delayed',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'

                }

            }
        });
        var storeUser = new Ext.data.Store({
            model: 'testextjs.model.caisse.ClientLambda',
            pageSize: 100,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/client/delayed',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        var diffUser = new Ext.data.Store({
            model: 'testextjs.model.caisse.ClientLambda',
            pageSize: 100,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/client/differes',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });

        var me = this;
        Ext.applyIf(me, {
            items: [

                {
                    dockedItems: [
                        {
                            xtype: 'toolbar',
                            dock: 'top',
                            items: [
                                {
                                    text: 'Faire un réglement',
                                    itemId: 'doreglement',
                                    iconCls: 'addicon',
                                    scope: this
                                },
                                {
                                    xtype: 'datefield',
                                    fieldLabel: 'Du',
                                    itemId: 'dtStartre',
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
                                    itemId: 'dtEndre',
                                    labelWidth: 20,
                                    flex: 1,
                                    maxValue: new Date(),
                                    value: new Date(),
                                    margin: '0 9 0 0',
                                    submitFormat: 'Y-m-d',
                                    format: 'd/m/Y'

                                },

                                {
                                    xtype: 'combobox',
                                    itemId: 'userre',
                                    store: diffUser,
                                    labelWidth: 40,
                                    fieldLabel: 'Clients',
                                    pageSize: null,
                                    valueField: 'lgCLIENTID',
                                    displayField: 'fullName',
                                    typeAhead: false,
                                    flex: 1,
                                    minChars: 2,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un client'

                                }
                                ,
                                {
                                    text: 'rechercher',
                                    tooltip: 'rechercher',
                                    itemId: 'search',
                                    scope: this,
                                    iconCls: 'searchicon'
                                },
                                {
                                    text: 'imprimer',
                                    itemId: 'imprimerre',
                                    iconCls: 'printable',
                                    tooltip: 'imprimer',
                                    scope: this
                                }
                            ]
                        }
                    ],
                    xtype: 'gridpanel',
                    title: 'LISTE DES REGLEMENTS',
                    features: [
                        {
                            ftype: 'groupingsummary',
                            collapsible: true,
                            groupHeaderTpl: "{[values.rows[0].data.clientFullName]}  <span style='color:blue;font-weight:800;padding-left:5rem;'>SOLDE:  <span style='color:blue;font-weight:800;padding-left:10px;'>{[values.rows[0].data.soldeFormated]}</span></span> ",
                            
                            hideGroupedHeader: true,
                            showSummaryRow: true
                        }],
                    border: false,

                    itemId: 'reglementGrid',
                    store: diffreglement,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },
                    columns: [

                        {
                            header: '#',
                            dataIndex: 'clientId',
                            flex: 1,
                            hidden: true

                        },

                        {
                            header: 'Mode R&egrave;glement',
                            dataIndex: 'libelleRegl',
                            flex: 1.5, summaryType: "count",
                            summaryRenderer: function (value) {
                                return "<b>Nombre de R&egrave;glements </b><span style='color:blue;font-weight:800;'>" + value + "</span>";

                            }},
                        {
                            xtype: 'numbercolumn',
                            header: 'Montant attendu',
                            format: '0,000.',
                            dataIndex: 'montantAttendu',
                            flex: 1,
                            align: 'right'
                        
                          
                        },
                        {
                            xtype: 'numbercolumn',
                            header: 'Montant R&egrave;gl&eacute;',
                            format: '0,000.',
                            dataIndex: 'montantRegle',
                            flex: 1,
                            align: 'right',
                            summaryType: "sum",
                            summaryRenderer: function (value) {
                                return " <span style='color:blue;font-weight:800;'>" + Ext.util.Format.number(value, '0,000.') + "</span> ";
                            }

                        },
                        {
                            xtype: 'numbercolumn',
                            header: 'Montant Restant',
                            format: '0,000.',
                            dataIndex: 'montantRestant',
                            fieldStyle: "color:red;",
                            flex: 1,
                            align: 'right'
                         
                        },
                        {
                            header: 'Date',
                            dataIndex: 'dateOp',
                            flex: 1

                        },
                        {
                            header: 'Heure',
                            dataIndex: 'heure',
                            flex: 1

                        },
                        {
                            header: 'Op&eacute;rateur',
                            dataIndex: 'userFullName',
                            flex: 1

                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            tooltip: 'Faire le reglement',
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/application_view_list.png',
                                    tooltip: 'Voir le detail du reglement',
                                    scope: this

                                }
                            ]
                        }

                    ],
                    selModel: {
                        selType: 'cellmodel'
                    },
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: diffreglement,
                        pageSize: 30,
                        dock: 'bottom',
                        displayInfo: true

                    }
                },

                {
                    dockedItems: [
                        {
                            xtype: 'toolbar',
                            dock: 'top',
                            items: [
                                {
                                    xtype: 'datefield',
                                    fieldLabel: 'Du',
                                    itemId: 'dtStart',
                                    margin: '0 10 0 0',
                                    submitFormat: 'Y-m-d',
                                    flex: 1,
                                    labelWidth: 20,
                                    maxValue: new Date(),
                                    value: new Date("2015-01-01"),
                                    format: 'd/m/Y'

                                }, {
                                    xtype: 'datefield',
                                    fieldLabel: 'Au',
                                    itemId: 'dtEnd',
                                    labelWidth: 20,
                                    flex: 1,
                                    maxValue: new Date(),
                                    value: new Date(),
                                    margin: '0 9 0 0',
                                    submitFormat: 'Y-m-d',
                                    format: 'd/m/Y'

                                },
                                {
                                    xtype: 'textfield',
                                    itemId: 'query',
                                    emptyText: 'Recherche',
                                    flex: 1,
                                    enableKeyEvents: true
                                },
                                {
                                    xtype: 'combobox',
                                    itemId: 'user',
                                    store: storeUser,
                                    labelWidth: 40,
                                    fieldLabel: 'Clients',
                                    pageSize: null,
                                    valueField: 'lgCLIENTID',
                                    displayField: 'fullName',
                                    typeAhead: false,
                                    flex: 1,
                                    minChars: 2,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un client'

                                },
                                /* retours du 07/10 : regle, non regle ou regle partiellement */
                                {
                                    xtype: 'combobox',
                                    itemId: 'etatDiffere',
                                    width: 175,
                                    editable: false,
                                    queryMode: 'local',
                                    valueField: 'v',
                                    displayField: 'l',
                                    value: 'NON_SOLDES',
                                    tooltip: 'Réglé : plus rien à payer. Partiel : une partie déjà payée. Non réglé : rien payé.',
                                    store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: [
                                            {v: 'NON_SOLDES', l: 'Non soldés (à payer)'}, {v: 'NON_REGLES', l: 'Non réglés'},
                                            {v: 'PARTIELS', l: 'Réglés partiellement'}, {v: 'REGLES', l: 'Réglés'}, {v: 'TOUS', l: 'Tous'}]})
                                },
                                {
                                    text: 'rechercher',
                                    tooltip: 'rechercher',
                                    itemId: 'rechercher',
                                    scope: this,
                                    iconCls: 'searchicon'
                                },
                                {
                                    text: 'imprimer',
                                    itemId: 'imprimer',
                                    iconCls: 'printable',
                                    tooltip: 'imprimer',
                                    scope: this
                                }
                            ]
                        }
                    ],
                    xtype: 'gridpanel',
                    title: 'LISTE DES DIFFERES',
                    features: [
                        {
                            ftype: 'groupingsummary',
                            collapsible: true,
                            groupHeaderTpl: "{[values.rows[0].data.clientFullName]}",
                            hideGroupedHeader: true,
                            showSummaryRow: true
                        }],
                    border: false,

                    itemId: 'liste',
                    store: liste,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },
                    columns: [

                        {
                            header: 'Réference',
                            dataIndex: 'reference',
                            flex: 1,
                            summaryType: "count",
                            summaryRenderer: function (value) {
                                return "<b>Nombre de ventes différées:  </b><span style='color:blue;font-weight:800;'>" + value + "</span>";

                            }},

                        {
                            header: 'Client',
                            dataIndex: 'clientFullName',
                            flex: 1.5

                        },
                        {
                            header: 'État',
                            dataIndex: 'etat',
                            width: 105,
                            renderer: function (v) {
                                var e = {NON_REGLE: ['Non réglé', '#c0392b'], PARTIEL: ['Partiel', '#b9770e'], REGLE: ['Réglé', '#1e8449']}[v];
                                return e ? '<b style="color:' + e[1] + '">' + e[0] + '</b>' : '';
                            }
                        },
                        {
                            xtype: 'numbercolumn',
                            header: 'Montant total vente',
                            format: '0,000.',
                            dataIndex: 'totalAmount',
                            flex: 1,
                            align: 'right',
                            summaryType: "sum",
                            summaryRenderer: function (value) {
                                return " <span style='color:red;font-weight:800;'>" + Ext.util.Format.number(value, '0,000.') + "</span> ";
                            }

                        },
                        {
                            xtype: 'numbercolumn',
                            header: 'Montant Attendu',
                            format: '0,000.',
                            dataIndex: 'montantAttendu',
                            flex: 1,
                            align: 'right'
                        },
                        {
                            xtype: 'numbercolumn',
                            header: 'Reste à Payer',
                            format: '0,000.',
                            dataIndex: 'montantRegle',
                            fieldStyle: "color:green;",
                            flex: 1,
                            align: 'right',
                            summaryType: "sum",
                            summaryRenderer: function (value) {
                                return " Reste à Payer: <span style='color:green;font-weight:800;'>" + Ext.util.Format.number(value, '0,000.') + "</span> ";
                            }
                        },
                        {
                            header: 'Date',
                            dataIndex: 'dateOp',
                            flex: 1

                        },
                        {
                            header: 'Heure',
                            dataIndex: 'heure',
                            flex: 1

                        }
                    ],
                    selModel: {
                        selType: 'cellmodel'
                    },
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: liste,
                        pageSize: 999,
                        dock: 'bottom',
                        displayInfo: true

                    }
                }/*  FIN LISTE*/

            ]

        });
        /* « Liste des différés » passe devant « Liste des règlements » : c'est l'onglet
         * consulté en premier au comptoir. L'ordre est inversé ici, sur le tableau des
         * items, plutôt qu'en deplacant les deux definitions - longues de plusieurs
         * centaines de lignes - ce qui ne changerait rien d'autre que le risque. */
        if (Ext.isArray(me.items) && me.items.length === 2) {
            me.items.reverse();
        }
        me.callParent(arguments);
        /* retours du 07/10 : onglet « Solde » (releve date et heure, debit, credit, solde, solde de fin de mois) */
        me.add(me.ongletSolde());
    },

    /* Retours du 09/10 (1) : releve de l'onglet Solde en PDF ou Excel (API v1/reglement/releve/pdf|excel) */
    editerSolde: function (format) {
        var g = this.down('#grilleSolde'), du = g.down('#soldeDu'), au = g.down('#soldeAu'), c = g.down('#soldeClient');
        if (!du.isValid() || !au.isValid()) {
            return;
        }
        if (du.getValue() && au.getValue() && du.getValue() > au.getValue()) {
            Ext.MessageBox.alert('Solde des différés', 'La date de début est après la date de fin.');
            return;
        }
        window.open('../api/v1/reglement/releve/' + format + '?' + Ext.Object.toQueryString({
            dtStart: du.getSubmitValue() || '', dtEnd: au.getSubmitValue() || '', clientId: c.getValue() || '',
            clientNom: c.getValue() ? c.getRawValue() : ''
        }));
    },

    ongletSolde: function () {
        var me = this, f = function (v) {
            return String(Math.round(v || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        };
        var store = Ext.create('Ext.data.Store', {
            fields: ['type', 'date', 'libelle', 'reference', 'client', {name: 'debit', type: 'int'}, {name: 'credit', type: 'int'},
                {name: 'solde', type: 'int'}],
            proxy: {type: 'ajax', url: '../api/v1/reglement/releve', reader: {type: 'json', root: 'data'}}
        });
        var clients = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.caisse.ClientLambda', pageSize: 100,
            proxy: {type: 'ajax', url: '../api/v1/client/differes', reader: {type: 'json', root: 'data', totalProperty: 'total'}}
        });
        var charger = function () {
            var g = me.down('#grilleSolde');
            store.load({params: {dtStart: g.down('#soldeDu').getSubmitValue(), dtEnd: g.down('#soldeAu').getSubmitValue(),
                    clientId: g.down('#soldeClient').getValue() || ''}});
        };
        store.on('load', function (s, r, ok) {
            var o = s.getProxy().getReader().rawData || {}, g = me.down('#grilleSolde');
            if (o.success === false) {
                Ext.MessageBox.alert('Solde des différés', Ext.String.htmlEncode(o.msg || 'Relevé indisponible.'));
                return;
            }
            g.down('#soldeResume').update('Solde au début : <b>' + f(o.soldeInitial) + '</b> · Débit (ventes) : <b>' + f(o.totalDebit)
                    + '</b> · Crédit (règlements) : <b>' + f(o.totalCredit) + '</b> · Solde à la fin : <b style="color:#c0392b">'
                    + f(o.soldeFinal) + '</b>');
        });
        var montant = function (v, m, r) {
            if (r.get('type') === 'MOIS') {
                m.tdCls = 'differe-mois';
            }
            return v ? f(v) : '';
        };
        return {
            xtype: 'gridpanel', title: 'SOLDE', itemId: 'grilleSolde', store: store,
            viewConfig: {emptyText: 'Aucune vente différée ni règlement sur la période.', deferEmptyText: false,
                getRowClass: function (r) {
                    return r.get('type') === 'MOIS' ? 'differe-ligne-mois' : '';
                }},
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'datefield', itemId: 'soldeDu', fieldLabel: 'Du', labelWidth: 25, width: 145, format: 'd/m/Y',
                            submitFormat: 'Y-m-d', value: Ext.Date.getFirstDateOfMonth(new Date())},
                        {xtype: 'datefield', itemId: 'soldeAu', fieldLabel: 'Au', labelWidth: 25, width: 145, format: 'd/m/Y',
                            submitFormat: 'Y-m-d', value: new Date()},
                        {xtype: 'combobox', itemId: 'soldeClient', store: clients, valueField: 'lgCLIENTID', displayField: 'fullName',
                            width: 280, minChars: 2, queryMode: 'remote', emptyText: 'Tous les clients (ou choisir un client)',
                            listeners: {select: charger, change: function (c, v) {
                                    if (!v) {
                                        charger();
                                    }
                                }}},
                        {text: 'Rechercher', iconCls: 'searchicon', handler: charger},
                        /* retours du 09/10 (1) : impression et export du releve, memes criteres que l'ecran */
                        '->',
                        {text: 'Exporter Excel', itemId: 'soldeExcel', cls: 'btn-primary', iconCls: 'export_excel_icon', handler: function () {
                                me.editerSolde('excel');
                            }},
                        {text: 'Imprimer (PDF)', itemId: 'soldePdf', cls: 'btn-primary', iconCls: 'printable', handler: function () {
                                me.editerSolde('pdf');
                            }}]},
                {xtype: 'toolbar', dock: 'top', items: [{xtype: 'component', itemId: 'soldeResume', html: ''}]}],
            columns: [
                {text: 'Date et heure', dataIndex: 'date', width: 130},
                {text: 'Opération', dataIndex: 'libelle', flex: 1, minWidth: 170, renderer: function (v, m, r) {
                        return r.get('type') === 'MOIS' ? '<b>' + Ext.String.htmlEncode(v) + '</b>' : Ext.String.htmlEncode(v)
                                + (r.get('reference') ? ' <span style="color:#7f8c8d">· ' + Ext.String.htmlEncode(r.get('reference')) + '</span>' : '');
                    }},
                {text: 'Client', dataIndex: 'client', flex: 1, minWidth: 150, renderer: function (v) {
                        return Ext.String.htmlEncode(v);
                    }},
                {text: 'Débit', dataIndex: 'debit', width: 110, align: 'right', renderer: montant,
                    tooltip: 'Vente mise en différé : le client doit ce montant'},
                {text: 'Crédit', dataIndex: 'credit', width: 110, align: 'right', renderer: montant,
                    tooltip: 'Règlement du client : diminue ce qu\'il doit'},
                {text: 'Solde', dataIndex: 'solde', width: 120, align: 'right', tooltip: 'Reste dû après l\'opération (solde précédent + débit − crédit)',
                    renderer: function (v, m, r) {
                        return '<b>' + f(v) + '</b>';
                    }}
            ],
            listeners: {activate: function () {
                    if (!store.getCount()) {
                        charger();
                    }
                }}
        };
    }
});
