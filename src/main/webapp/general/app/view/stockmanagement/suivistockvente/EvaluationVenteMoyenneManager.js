var url_services_data_evaluationventemoyenne = '../webservices/stockmanagement/suivistockvente/ws_data_evaluation_ventemoyenne.jsp';
var Me;

Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.stockmanagement.suivistockvente.EvaluationVenteMoyenneManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'evaluationventemoyenne',
    id: 'evaluationventemoyenneID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    title: 'Evaluation des ventes',
    plain: true,
    maximizable: true,

    closable: false,
    frame: true,

    initComponent: function () {
        const AppController = testextjs.app.getController('App');
        var itemsPerPage = 20;
        Me = this;
        const famillearticles = Ext.create('Ext.data.Store', {
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
        const store_type = new Ext.data.Store({
            fields: ['str_TYPE_TRANSACTION', 'str_desc'],
            data: [{str_TYPE_TRANSACTION: 'LESS', str_desc: 'Inferieur à'}, {str_TYPE_TRANSACTION: 'MORE', str_desc: 'Superieur à'}, {str_TYPE_TRANSACTION: 'EQUAL', str_desc: 'Egal à'},
                {str_TYPE_TRANSACTION: 'LESSOREQUAL', str_desc: 'Inferieur ou egal à'}, {str_TYPE_TRANSACTION: 'MOREOREQUAL', str_desc: 'Superieur ou egal à'},
                {str_TYPE_TRANSACTION: 'NOT', str_desc: "Différent"},
                {str_TYPE_TRANSACTION: null, str_desc: "Tout"}
            ]
        });

        const store = new Ext.data.Store({
            idProperty: 'id',
            fields: [
                {name: 'codeCip', type: 'string'},
                {name: 'libelle', type: 'string'},
                {name: 'stock', type: 'number'},
                {name: 'moyenne', type: 'number'},
                {name: 'quantiteVendue', type: 'number'},
                {name: 'quantiteVendueCurrentMonth', type: 'number'},
                {name: 'totalvente', type: 'number'},
                {name: 'quantiteVendueMonthMinusOne', type: 'number'},
                {name: 'quantiteVendueMonthMinusTwo', type: 'number'},
                {name: 'quantiteVendueMonthMinusThree', type: 'number'}
            ],
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/evaluation-vente/data',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 240000
            }

        });
        Ext.apply(this, {
            width: '98%',
            height: 580,

            store: store,
            id: 'GridSuiviStockVenteID',
            columns: [{
                    xtype: 'rownumberer',
                    text: 'Num.Ligne',
                    width: 45,
                    hidden: true,
                    sortable: true
                }, {
                    header: 'id',
                    dataIndex: 'id',
                    hidden: true,
                    flex: 1
                }, {
                    header: 'CIP',
                    dataIndex: 'codeCip',
                    flex: 0.5
                },
                {
                    header: 'Designation',
                    dataIndex: 'libelle',
                    flex: 1.5
                },

                {
                    header: 'Stock',
                    align: 'right',
                    renderer: function (v) {
                        return Ext.util.Format.number(v, '0,000.');
                    },
                    dataIndex: 'stock',
                    flex: 0.5
                },
                {
                    header: 'Moyenne',
                    dataIndex: 'moyenne',
                    align: 'right',
                    flex: 0.5
                }, {
                    header: 'Qte Total Vendue',
                    renderer: function (v) {
                        return Ext.util.Format.number(v, '0,000.');
                    },
                    align: 'right',
                    dataIndex: 'quantiteVendue',
                    flex: 0.7
                }, {
                    header: 'Co&ucirc;t total',
                    dataIndex: 'totalvente',
                    align: 'right',
                    renderer: function (v) {
                        return Ext.util.Format.number(v, '0,000.');
                    },
                    flex: 0.7
                }, {
                    header: AppController.getMonthToDisplay(0, currentMonth),
                    dataIndex: 'quantiteVendueCurrentMonth',
                    align: 'right', renderer: function (v) {
                        return Ext.util.Format.number(v, '0,000.');
                    },
                    flex: 0.7
                }, {
                    header: AppController.getMonthToDisplay(1, currentMonth),
                    dataIndex: 'quantiteVendueMonthMinusOne', renderer: function (v) {
                        return Ext.util.Format.number(v, '0,000.');
                    },
                    align: 'right',
                    flex: 0.7
                }, {
                    header: AppController.getMonthToDisplay(2, currentMonth),
                    dataIndex: 'quantiteVendueMonthMinusTwo', renderer: function (v) {
                        return Ext.util.Format.number(v, '0,000.');
                    },
                    align: 'right',
                    flex: 0.7
                }, {
                    header: AppController.getMonthToDisplay(3, currentMonth),
                    dataIndex: 'quantiteVendueMonthMinusThree', renderer: function (v) {
                        return Ext.util.Format.number(v, '0,000.');
                    },
                    align: 'right',
                    flex: 0.7
                }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    xtype: 'combobox',
                    flex: 1,
                    fieldLabel: 'Emplacements',
                    labelWidth: 90,
                    itemId: 'emplacementId',
                    id: 'emplacementId',
                    store: rayons,
                    pageSize: 99999,
                    valueField: 'id',
                    displayField: 'libelle',
                    typeAhead: false,
                    queryMode: 'remote',
                    minChars: 2,
                    emptyText: 'Sélectionnez un emplacement',
                    listeners: {
                        select: function (cmp) {
                            Me.onRechClick();
                        }
                    }
                },

                {
                    xtype: 'combobox',
                    flex: 1,
                    fieldLabel: 'Familles',
                    labelWidth: 50,
                    itemId: 'familleId',
                    id: 'familleId',
                    store: famillearticles,
                    pageSize: 99999,
                    valueField: 'id',
                    displayField: 'libelle',
                    typeAhead: false,
                    queryMode: 'remote',
                    minChars: 2,
                    emptyText: 'Sélectionnez une famille',
                    listeners: {
                        select: function (cmp) {
                            Me.onRechClick();
                        }
                    }
                },

                {
                    xtype: 'combobox',
                    fieldLabel: 'Filtre',
                    name: 'str_TYPE_TRANSACTION',
                    id: 'filtre',
                    labelWidth: 35,
                    store: store_type,
                    valueField: 'str_TYPE_TRANSACTION',
                    displayField: 'str_desc',
                    typeAhead: true,
                    flex: 0.8,
                    queryMode: 'local',
                    emptyText: 'Filtre ...'

                }, '-',

                {
                    xtype: 'textfield',
                    fieldLabel: 'Moyenne',
                    labelWidth: 55,
                    id: 'filtreValue',
                    flex: 0.8,
                    emptyText: 'Moyenne'},

                '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    flex: 0.8,
                    emptyText: 'Rech',
                    listeners: {
                        'render': function (cmp) {
                            cmp.getEl().on('keypress', function (e) {
                                if (e.getKey() === e.ENTER) {
                                    Me.onRechClick();

                                }
                            });
                        }
                    }
                }, {
                    text: 'rechercher',
                    iconCls: 'searchicon',
                    tooltip: 'rechercher', scope: this,
                    handler: this.onRechClick
                }
                , {
                    text: 'Imprimer',
                    tooltip: 'imprimer',
                    iconCls: 'printable',
                    scope: this,
                    handler: this.onPdfClick
                }, '-',
                {
                    text: 'Suggerer',
                    tooltip: 'Suggerer',
                    iconCls: 'suggestionreapro',
                    scope: this,
                    handler: this.onSuggereClick
                }

            ],
            bbar: {
                xtype: 'pagingtoolbar',
                store: store, // same store GridPanel is using
                dock: 'bottom',
                pageSize: itemsPerPage,
                displayInfo: true, // same store GridPanel is using
                listeners: {
                    beforechange: function (page, currentPage) {
                        const myProxy = this.store.getProxy();
                        myProxy.params = {
                            familleId: null,
                            emplacementId: null,
                            filtre: null,
                            filtreValue: null,
                            query: null
                        };
                        myProxy.setExtraParam('familleId', Ext.getCmp('familleId').getValue());
                        myProxy.setExtraParam('emplacementId', Ext.getCmp('emplacementId').getValue());
                        myProxy.setExtraParam('filtre', Ext.getCmp('filtre').getValue());
                        myProxy.setExtraParam('filtreValue', Ext.getCmp('filtreValue').getValue());
                        myProxy.setExtraParam('query', Ext.getCmp('rechecher').getValue());
                    }

                }
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });


    },
    loadStore: function () {
        this.onRechClick();
    },
    onStoreLoad: function () {
    },
    onRechClick: function () {
        const val = Ext.getCmp('rechecher');

        this.getStore().load({
            params: {
                query: val.getValue(),
                familleId: Ext.getCmp('familleId').getValue(),
                emplacementId: Ext.getCmp('emplacementId').getValue(),
                filtre: Ext.getCmp('filtre').getValue(),
                filtreValue: Ext.getCmp('filtreValue').getValue()
            }
        });
    },
    onPdfClick: function () {
        const query = Ext.getCmp('rechecher').getValue() != null ? Ext.getCmp('rechecher').getValue() : "";
        const  familleId = Ext.getCmp('familleId').getValue() != null ? Ext.getCmp('familleId').getValue() : "";
        const emplacementId = Ext.getCmp('emplacementId').getValue() != null ? Ext.getCmp('emplacementId').getValue() : "";
        const filtre = Ext.getCmp('filtre').getValue() != null ? Ext.getCmp('filtre').getValue() : "";
        const filtreValue = Ext.getCmp('filtreValue').getValue() != null ? Ext.getCmp('filtreValue').getValue() : "";
        const linkUrl = '../EvaluationVenteServlet?familleId=' + familleId + '&emplacementId=' + emplacementId + '&query=' + query + '&filtre=' + filtre + '&filtreValue=' + filtreValue;
        window.open(linkUrl);
    },
    onSuggereClick: function () {
        if (Ext.getCmp('filtre').getValue() != null && Ext.getCmp('filtreValue').getValue() != null) {
            let data = {
                query: Ext.getCmp('rechecher').getValue() != null ? Ext.getCmp('rechecher').getValue() : "",
                familleId: Ext.getCmp('familleId').getValue() != null ? Ext.getCmp('familleId').getValue() : "",
                emplacementId: Ext.getCmp('emplacementId').getValue() != null ? Ext.getCmp('emplacementId').getValue() : "",
                filtre: Ext.getCmp('filtre').getValue() != null ? Ext.getCmp('filtre').getValue() : "",
                filtreValue: Ext.getCmp('filtreValue').getValue() != null ? Ext.getCmp('filtreValue').getValue() : ""
            };
            const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                url: '../api/v1/evaluation-vente/suggerer',
                method: 'GET',
                params: data,
                timeout: 2400000,
                success: function (response)
                {
                    progress.hide();
                    var result = Ext.JSON.decode(response.responseText, true);
                    if (result.success) {
                        Ext.MessageBox.show({
                            title: 'Message',
                            width: 320,
                            msg: 'Nombre de produits en compte : ' + result.count,
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.INFO

                        });
                    }

                },
                failure: function (response)
                {
                    progress.hide();
                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 320,
                        msg: "L'opération n'a pas abouti",
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR

                    });
                }
            });
        } else {
            Ext.MessageBox.show({
                title: 'Message d\'erreur',
                width: 320,
                msg: "Aucun filtre appliqué",
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.ERROR

            });
        }


    }
});