/* global Ext */

Ext.define('testextjs.view.Report.vingtquatrevingt.VingthManager', {
    extend: 'Ext.panel.Panel',
    xtype: 'vingtquatrevingt',
    title: 'Edition des 20/80',
    frame: true,
    width: '98%',
    height: 570,
    minHeight: 570,
    maxHeight: 800,
    cls: 'custompanel',
    layout: 'fit',
    initComponent: function () {
        const data = new Ext.data.Store({
            idProperty: 'intCIP',
            fields: [
                {name: 'intCIP', type: 'string'},
                {name: 'ticketName', type: 'string'},
                {name: 'intQUANTITY', type: 'number'},
                {name: 'strNAME', type: 'string'},
                {name: 'intQUANTITYSERVED', type: 'number'},
                {name: 'marge', type: 'number'},
                {name: 'intPRICE', type: 'number'}


            ],
            pageSize: 99999,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/statfamillearticle/vingtQuatreVingt',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'

                },
                timeout: 2400000
            }
        });
        const grossiste = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },

                        {name: 'libelle',
                            type: 'string'

                        }

                    ],
            autoLoad: false,
            pageSize: 9999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/common/grossiste',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        const rayons = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },

                        {name: 'libelle',
                            type: 'string'

                        }

                    ],
            autoLoad: false,
            pageSize: 9999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/common/rayons',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        const familles = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },

                        {name: 'libelle',
                            type: 'string'

                        }

                    ],
            autoLoad: false,
            pageSize: 9999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/common/famillearticles',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });

        const filtreType = new Ext.data.Store({
            fields: ['id', 'libelle'],
            data: [
                {id: 'CA', libelle: "Chiffre d'Affaires"},
                {id: 'QTY', libelle: "Quantité"},
                {id: 'MARGE', libelle: "Marge"}
            ]
        });
        const me = this;
        Ext.applyIf(me, {
            dockedItems: [
                // 1ère ligne : filtres + recherche + suggestion
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
                            value: new Date(),
                            format: 'd/m/Y'
                        },
                        {
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
                            xtype: 'combobox',
                            flex: 1,
                            margin: '0 5 0 0',
                            labelWidth: 5,
                            itemId: 'rayons',
                            store: rayons,
                            pageSize: 999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez un emplacement'
                        },
                        {
                            xtype: 'combobox',
                            flex: 1,
                            margin: '0 5 0 0',
                            labelWidth: 5,
                            itemId: 'grossiste',
                            store: grossiste,
                            pageSize: 999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez un grossiste'
                        },
                        {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'combobox',
                            flex: 1,
                            margin: '0 5 0 0',
                            labelWidth: 5,
                            itemId: 'codeFamile',
                            store: familles,
                            pageSize: 999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez une famille'
                        },
                        {
                            xtype: 'tbseparator'
                        },
                        {
                            xtype: 'combo',
                            value: 'CA',
                            flex: 1,
                            itemId: 'comboVingt',
                            labelWidth: 1,
                            store: filtreType,
                            valueField: 'id',
                            displayField: 'libelle'
                        },
                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            itemId: 'rechercher',
                            iconCls: 'searchicon',
                            scope: this
                        },
                        {
                            text: 'suggestion',
                            itemId: 'suggestion',
                            iconCls: 'suggestionreapro',
                            tooltip: 'suggestion',
                            scope: this
                        }
                    ]
                },

                // 2ème ligne : Exporter / Excel / CSV / Inventaire
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        '->', // pour pousser les boutons à droite, optionnel
                        {
                            xtype: 'splitbutton',
                            text: 'Exporter',
                            iconCls: 'printable',
                            itemId: 'exporter',
                            menu: [
                                {
                                    text: 'PDF',
                                    itemId: 'exporterpdf'
                                },
                                {
                                    text: 'EXCEL',
                                    itemId: 'exporterexcel'
                                }
                            ]
                        },
                        {
                            text: 'Exporter Excel',
                            itemId: 'btn_export_excel_2080',
                            iconCls: 'export_excel_icon',
                            tooltip: 'Exporter les articles 20/80 en Excel',
                            handler: this.onExportExcelClick,
                            scope: this
                        },
                        {
                            text: 'Exporter CSV',
                            itemId: 'btn_export_csv_2080',
                            iconCls: 'export_csv_icon',
                            tooltip: 'Exporter les articles 20/80 en CSV',
                            handler: this.onExportCsvClick,
                            scope: this
                        },
                        {
                            text: 'Créer inventaire',
                            itemId: 'btn_create_inventaire_2080',
                            iconCls: 'inventaire_icon',
                            tooltip: 'Créer un inventaire à partir du 20/80',
                            handler: this.onCreateInventaire2080Click,
                            scope: this
                        }
                    ]
                }
            ],

            items: [
                {
                    xtype: 'gridpanel',
                    store: data,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },
                    columns: [

                        {
                            header: 'Id',
                            flex: 0.3,
                            xtype: "rownumberer"

                        }, {
                            header: 'Code CIP',
                            dataIndex: 'intCIP',
                            flex: 0.7
                        },
                        {
                            header: 'Libellé',
                            dataIndex: 'strNAME',
                            flex: 1.4

                        },
                        {
                            header: 'Famille',
                            dataIndex: 'ticketName',
                            flex: 1

                        },

                        {
                            header: 'Chiffre d\'Affaires',
                            dataIndex: 'intPRICE',
                            flex: 1,
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }


                        },

                        {
                            header: 'Marge',
                            dataIndex: 'marge',
                            flex: 1,
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }


                        }
                        , {
                            header: 'Quantit&eacute;',
                            dataIndex: 'intQUANTITY',
                            flex: 0.5,
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            }



                        },
                        {
                            header: 'Stock',
                            dataIndex: 'intQUANTITYSERVED',
                            align: 'right',
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000.');
                            },
                            flex: 0.5
                        }


                    ],
                    selModel: {
                        selType: 'cellmodel'
                    },
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: data,
                        pageSize: 99999,
                        dock: 'bottom',
                        displayInfo: true

                    }
                }
            ]

        });

        me.callParent(arguments);
    },

   
    onExportExcelClick: function () {
        const me = this,
                params = me.buildBaseParams(),
                url = '../api/v1/statfamillearticle/vingtQuatreVingt/excel?' +
                Ext.Object.toQueryString(params);
        window.open(url);
    },

    onExportCsvClick: function () {
        const me = this,
                params = me.buildBaseParams(),
                url = '../api/v1/statfamillearticle/vingtQuatreVingt/csv?' +
                Ext.Object.toQueryString(params);
        window.open(url);
    }
    ,
    buildBaseParams: function () {
        const me = this,
                dtStartCmp = me.down('#dtStart'),
                dtEndCmp = me.down('#dtEnd'),
                rayonsCmp = me.down('#rayons'),
                grossisteCmp = me.down('#grossiste'),
                familleCmp = me.down('#codeFamile'),
                comboVingtCmp = me.down('#comboVingt');

        return {
            dtStart: dtStartCmp ? dtStartCmp.getSubmitValue() : null,
            dtEnd: dtEndCmp ? dtEndCmp.getSubmitValue() : null,
            codeFamillle: (familleCmp && familleCmp.getValue()) ? familleCmp.getValue() : '',
            codeRayon: (rayonsCmp && rayonsCmp.getValue()) ? rayonsCmp.getValue() : '',
            codeGrossiste: (grossisteCmp && grossisteCmp.getValue()) ? grossisteCmp.getValue() : '',
            // true si "Quantite", false si "Chiffre d'Affaires"
            vingtType: comboVingtCmp.getValue()
        };
    },

    onCreateInventaire2080Click: function () {
        var me = this,
                params = me.buildBaseParams();

        Ext.MessageBox.confirm(
                'Confirmation',
                'Créer un inventaire à partir des articles 20/80 filtrés ?',
                function (btn) {
                    if (btn !== 'yes') {
                        return;
                    }

                    Ext.Ajax.request({
                        url: '../api/v1/statfamillearticle/vingtQuatreVingt/inventaire',
                        method: 'GET',
                        params: params,
                        success: function (response) {
                            var result = Ext.JSON.decode(response.responseText, true) || {};

                            if (Ext.isDefined(result.count)) {
                                Ext.Msg.show({
                                    title: 'Inventaire 20/80',
                                    width: 450, // 🔎 plus large pour bien voir le texte
                                    icon: Ext.Msg.INFO,
                                    buttons: Ext.Msg.OK,
                                    msg:
                                            'Inventaire créé avec succès.<br/><br/>' +
                                            'Produits pris en compte : ' +
                                            '<span style="font-size:18px;font-weight:bold;color:#0a2e3e;">'
                                            + result.count +
                                            '</span>'
                                });
                            } else {
                                Ext.Msg.show({
                                    title: 'Inventaire 20/80',
                                    width: 450,
                                    icon: Ext.Msg.WARNING,
                                    buttons: Ext.Msg.OK,
                                    msg: 'Réponse inattendue du serveur lors de la création de l\'inventaire.'
                                });
                            }
                        }
                        ,
                        failure: function (response) {
                            Ext.Msg.alert(
                                    'Erreur',
                                    'Erreur lors de la création de l\'inventaire. Code HTTP : ' + response.status
                                    );
                        }
                    });
                }
        );
    }

});


