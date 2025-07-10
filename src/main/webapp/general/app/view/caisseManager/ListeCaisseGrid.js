
/* global Ext */

Ext.define('testextjs.view.caisseManager.ListeCaisseGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.listeCaisseGrid',
   
    initComponent: function () {

        var store = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.caisse.Caisse',
            autoLoad: false,
            pageSize: 18,
            itemId: 'listecaisseStore',
            proxy: {
                type: 'ajax',
                url: '../api/v1/caisse/listecaisse',
                timeout: 2400000,
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'
                }

            }
        });
        var me = this;
        Ext.applyIf(me,
                {
                   
                    store: store,
//                    viewConfig: {
//                        forceFit: true,
//                        emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
//                    },
                    columns: [
                        {
                            header: 'Type Mouvement',
                            dataIndex: 'typeMouvement',
                            flex: 1
                        }, {
                            header: 'Reference',
                            dataIndex: 'reference',
                            flex: 1
                        }, {
                            header: 'Op&eacute;rateur',
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

                        }, /* {
                         header: 'Mode.R&egrave;gelement',
                         dataIndex: 'modeReglement',
                         flex: 1
                         },*/

                        {
                            xtype: 'numbercolumn',
                            header: 'Montant',
//                    format: '0,000.',
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
                        pageSize: 18,
                        dock: 'bottom',
                        displayInfo: true

                    }
                });
        this.callParent();
    }
});


