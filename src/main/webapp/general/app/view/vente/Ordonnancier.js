/* global Ext */

Ext.define('testextjs.view.vente.Ordonnancier', {
    extend: 'Ext.panel.Panel',
    xtype: 'ordonnancier',
    requires: [
        'Ext.grid.plugin.RowExpander'
    ],

    frame: true,
    title: 'Liste des Ventes',
    iconCls: 'icon-grid',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
    initComponent: function () {
        var store = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.caisse.MedecinModel',
            autoLoad: false,
            pageSize: 15,

            proxy: {
                type: 'ajax',
                url: '../api/v1/medecin/medecins',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }
        });
        var vente = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.caisse.Vente',
            autoLoad: false,
            pageSize: 99999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/ventestats/ventesordonnanciers',
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
                            itemId: 'dtStart',
//                            height: 30,
                            labelWidth: 15,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        }, '-',

                        {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            itemId: 'dtEnd',
//                            height: 30,
                            labelWidth: 15,
                            flex: 1,
                            submitFormat: 'Y-m-d',
                            maxValue: new Date(),
                            format: 'd/m/Y',
                            value: new Date()

                        }
                        , '-', {
                            xtype: 'combobox',
                            fieldLabel: 'Medecins',
                            labelWidth: 65,
                            itemId: 'medecin',
                            store: store,
                            flex: 1,
                            valueField: 'id',
                            displayField: 'nom',
                            typeAhead: false,
                            mode: 'local',
                            minChars: 1,
                            emptyText: 'Selectionner un medecin'

                        }, '-',
                        {
                            xtype: 'textfield',
                            itemId: 'query',
                            flex: 1,
                            enableKeyEvents: true,
                            emptyText: 'Nom du client ou r&eacute;f&eacute;rence...'
                        }, '-',

                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon'
                        }, '-',
                        {
                            text: 'Imprimer',
                            tooltip: 'Editer le registre affich&eacute;, une ligne par produit d&eacute;livr&eacute;',
                            itemId: 'imprimer',
                            iconCls: 'printable'
                        }, '-',
                        {
                            text: 'Exporter',
                            tooltip: 'Exporter le registre affich&eacute; au format Excel',
                            itemId: 'exporter',
                            iconCls: 'export_excel_icon'
                        }, '-',
                        {
                            text: 'Cr&eacute;er inventaire',
                            tooltip: 'Cr&eacute;er un inventaire des produits d&eacute;livr&eacute;s sur la '
                                    + 'p&eacute;riode affich&eacute;e',
                            itemId: 'inventaire',
                            iconCls: 'addicon'
                        }
                    ]
                }

            ],
            items: [
                {
                    xtype: 'gridpanel',
                    plugins: [{
                            ptype: 'rowexpander',
                            /*
                             * Le (+) affichait « {details} », un champ que le serveur ne remplit
                             * jamais : il ouvrait donc une zone vide. Ce sont les produits de la
                             * delivrance qu'on attend en dessous, et ils arrivent bien, dans
                             * « items ». Un tableau plutot qu'un paragraphe : le registre se lit
                             * produit par produit, avec le code tableau qui l'y fait entrer.
                             */
                            rowBodyTpl: new Ext.XTemplate(
                                    '<tpl if="items &amp;&amp; items.length &gt; 0">',
                                    '<table class="ordonnancier-detail" style="width:100%;margin:4px 0 4px 26px;',
                                    'border-collapse:collapse">',
                                    '<tr style="background:#f0f0f0">',
                                    '<th style="text-align:left;padding:2px 6px">CIP</th>',
                                    '<th style="text-align:left;padding:2px 6px">Produit</th>',
                                    '<th style="text-align:center;padding:2px 6px">Tableau</th>',
                                    '<th style="text-align:right;padding:2px 6px">Qt&eacute;</th>',
                                    '<th style="text-align:right;padding:2px 6px">P.U.</th>',
                                    '<th style="text-align:right;padding:2px 6px">Montant</th>',
                                    '</tr>',
                                    '<tpl for="items">',
                                    '<tr style="border-top:1px solid #ddd">',
                                    '<td style="padding:2px 6px">{intCIP}</td>',
                                    '<td style="padding:2px 6px">{strNAME}</td>',
                                    '<td style="text-align:center;padding:2px 6px"><b>{codeTableau}</b></td>',
                                    '<td style="text-align:right;padding:2px 6px">{intQUANTITY}</td>',
                                    '<td style="text-align:right;padding:2px 6px">',
                                    '{[Ext.util.Format.number(values.intPRICEUNITAIR, \'0,000\')]}</td>',
                                    '<td style="text-align:right;padding:2px 6px">',
                                    '{[Ext.util.Format.number(values.intPRICE, \'0,000\')]}</td>',
                                    '</tr>',
                                    '</tpl>',
                                    '</table>',
                                    '<tpl else>',
                                    '<p style="margin:4px 0 4px 26px;font-style:italic">',
                                    'Aucun produit soumis &agrave; ordonnance dans cette vente.</p>',
                                    '</tpl>'
                                    )
                        }
                    ],
                    store: vente,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true,
                        animCollapse: false,
                        hideable: false,
                        draggable: false
                    },
                    columns: [
                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Reference',
                            dataIndex: 'strREF',
                            flex: 0.8
                        },
                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Type.Vente',
                            dataIndex: 'strTYPEVENTE',
                            align: 'center',
                            flex: 0.4
                        }

                        , {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Montant',
                            xtype: 'numbercolumn',
                            dataIndex: 'intPRICE',
                            align: 'right',
                            flex: 0.6,
                            format: '0,000.'

                        },
                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Montant différé',
                            xtype: 'numbercolumn',
//                            hidden:true,
                            dataIndex: 'intPRICERESTE',
                            align: 'right',
                            flex: 0.6,
                            format: '0,000.'

                        },

                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Date',
                            dataIndex: 'dtUPDATED',
                            flex: 0.6,
                            align: 'center'
                        }, {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Heure',
                            dataIndex: 'heure',
                            flex: 0.6,
                            align: 'center'
                        }, {
                            // Le registre repond a « qui a recu quoi, prescrit par qui ». Le nom du
                            // patient en etait absent : il fallait ouvrir chaque vente pour le voir.
                            sortable: false,
                            menuDisabled: true,
                            header: 'Client',
                            dataIndex: 'clientFullName',
                            flex: 1
                        }, {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Medecin',
                            dataIndex: 'nom',
                            flex: 1
                        }, {
                            sortable: false,
                            menuDisabled: true,
                            header: 'N&deg; ordre',
                            dataIndex: 'numOrder',
                            align: 'center',
                            flex: 0.5
                        }

                        , {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Vendeur',
                            dataIndex: 'userVendeurName',
                            flex: 1
                        },

                        {
                            sortable: false,
                            menuDisabled: true,
                            header: 'Caissier',
                            dataIndex: 'userCaissierName',
                            flex: 1
                        }

                    ],

                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: vente,
                        pageSize: 99999,
                        dock: 'bottom',
                        displayInfo: true

                    }
                }]

        });
        me.callParent(arguments);
    }
});


