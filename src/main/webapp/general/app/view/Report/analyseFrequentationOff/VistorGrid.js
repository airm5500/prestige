
/* global Ext */

function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.Report.analyseFrequentationOff.VistorGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.visitor-grid',
    initComponent: function () {
        var store = Ext.create('testextjs.store.Statistics.VISITORSTATISTICS');

        Ext.apply(this, {
            id: 'VisitorGrid',
            store: store,
            features: [
                {
                    ftype: 'grouping',
                    groupHeaderTpl: "{[values.rows[0].data.JOUR]}",
                    hideGroupedHeader: true

                }],
            viewConfig: {
                emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
            },
            columns: [
                {
                    header: 'Jour',
                    dataIndex: 'JOUR',
                    flex: 0.4
                },
                {
                    header: 'OP',
                    dataIndex: 'OP',
                    flex: 1.4

                },
                {
                    text: '',
                    dataIndex: 'VALUES',
                    flex: 0.7,
                    renderer: function (v) {
                        return v.split('_')[0] + "<br>" + v.split('_')[1] + "<br>" + v.split('_')[2] + "<br>" + v.split('_')[3];

                    }

                }
                , {
                    text: '7:00 - 8:59',
                    dataIndex: 'UN',
                    flex: 1,
                    align: 'right',
                    renderer: function (v) {
                        return amountformat(v.split('_')[0]) + "<br>" + amountformat(v.split('_')[1]) + "<br>" + amountformat(v.split('_')[2]) + "<br>" + amountformat(v.split('_')[3]);

                    }
                },
                {
                    text: '9:00 - 10:59',
                    dataIndex: 'DEUX',
                    align: 'right',
                    renderer: function (v) {
                        return amountformat(v.split('_')[0]) + "<br>" + amountformat(v.split('_')[1]) + "<br>" + amountformat(v.split('_')[2]) + "<br>" + amountformat(v.split('_')[3]);

                    }
                },
                {
                    text: '11:00 - 13:59',
                    dataIndex: 'TROIS',
                    align: 'right',
                    flex: 1,
                    renderer: function (v) {
                        return amountformat(v.split('_')[0]) + "<br>" + amountformat(v.split('_')[1]) + "<br>" + amountformat(v.split('_')[2]) + "<br>" + amountformat(v.split('_')[3]);

                    }
                },
                {
                    text: '14:00 - 15:59',
                    dataIndex: 'QUATRE',
                    align: 'right',
                    renderer: function (v) {
                        return amountformat(v.split('_')[0]) + "<br>" + amountformat(v.split('_')[1]) + "<br>" + amountformat(v.split('_')[2]) + "<br>" + amountformat(v.split('_')[3]);

                    }
                }
                ,
                {
                    text: '16:00 - 16:59',
                    dataIndex: 'CINQ',
                    align: 'right',
                    flex: 1,
                    renderer: function (v) {
                        return amountformat(v.split('_')[0]) + "<br>" + amountformat(v.split('_')[1]) + "<br>" + amountformat(v.split('_')[2]) + "<br>" + amountformat(v.split('_')[3]);

                    }
                },
                {
                    text: '17:00 - 17:59',
                    dataIndex: 'SIX',
                    flex: 1,
                    align: 'right',
                    renderer: function (v) {
                        return amountformat(v.split('_')[0]) + "<br>" + amountformat(v.split('_')[1]) + "<br>" + amountformat(v.split('_')[2]) + "<br>" + amountformat(v.split('_')[3]);

                    }
                },
                {
                    text: '18:00 - 18:59',
                    dataIndex: 'SEPT',
                    flex: 1,
                    align: 'right',
                    renderer: function (v) {
                        return amountformat(v.split('_')[0]) + "<br>" + amountformat(v.split('_')[1]) + "<br>" + amountformat(v.split('_')[2]) + "<br>" + amountformat(v.split('_')[3]);

                    }
                },
                {
                    text: '19:00 - 19:59',
                    align: 'right',
                    dataIndex: 'HUIT',
                    flex: 1,
                    renderer: function (v) {
                        return amountformat(v.split('_')[0]) + "<br>" + amountformat(v.split('_')[1]) + "<br>" + amountformat(v.split('_')[2]) + "<br>" + amountformat(v.split('_')[3]);

                    }
                }, {
                    text: '20:00 - 23:59',
                    dataIndex: 'NEUF',
                    align: 'right',
                    flex: 1,
                    renderer: function (v) {
                        return amountformat(v.split('_')[0]) + "<br>" + amountformat(v.split('_')[1]) + "<br>" + amountformat(v.split('_')[2]) + "<br>" + amountformat(v.split('_')[3]);

                    }
                }, {
                    text: '00:00 - 6:59',
                    dataIndex: 'DIX',
                    align: 'right',
                    flex: 1,
                    renderer: function (v) {
                        return amountformat(v.split('_')[0]) + "<br>" + amountformat(v.split('_')[1]) + "<br>" + amountformat(v.split('_')[2]) + "<br>" + amountformat(v.split('_')[3]);

                    }
                }
                , {
                    text: 'Total',
                    dataIndex: 'TOTAL',
                    align: 'right',
                    flex: 1,
                    renderer: function (v) {
                        return amountformat(v.split('_')[0]) + "<br>" + amountformat(v.split('_')[1]) + "<br>" + amountformat(v.split('_')[2]) + "<br>" + amountformat(v.split('_')[3]);

                    }
                }
          
            ],
            selModel: {
                selType: 'cellmodel'
            },
            bbar: {
                xtype: 'pagingtoolbar',
                store: store, // same store GridPanel is using
                dock: 'bottom',
                pageSize: 5,
                displayInfo: true
                ,
                listeners: {
                    beforechange: function (page, currentPage) {
                        var myProxy = this.store.getProxy();
                        myProxy.params = {
                            dt_start_vente: '',
                            dt_end_vente: ''
                        };
                        var dt_start = Ext.getCmp('dt_start_Visitor').getSubmitValue();
                        var dt_end = Ext.getCmp('dt_end_Visitor').getSubmitValue();
                        myProxy.setExtraParam('dt_start_vente', dt_start);
                        myProxy.setExtraParam('dt_end_vente', dt_end);

                    }

                }
            }
        });

        this.callParent();


    }
});


