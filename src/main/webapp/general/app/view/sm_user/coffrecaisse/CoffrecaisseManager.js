/* global Ext */



var Me;
function amountfarmat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.sm_user.coffrecaisse.CoffrecaisseManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'ouverturecaisseempmanager',
    id: 'ouverturecaisseempmanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'Ext.ux.ProgressBarPager'

    ],
    title: 'Attribution Caisse',
    closable: false,
    frame: true,
    initComponent: function () {

        var itemsPerPage = 20;
        Me = this;
        var store = new Ext.data.Store({
            fields: [
                {name: 'amount', type: 'int'},
                {name: 'userFullName', type: 'string'},
                {name: 'createAt', type: 'string'},
                {name: 'emplacement', type: 'string'}
            ],
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/billetage/list-fond-caisse',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });
        Ext.apply(this, {
            width: '98%',
            height: valheight,
            id: 'Grid_Prevente_ID',
            store: store,
            columns: [{
                    header: 'Utilisateur',
                    dataIndex: 'userFullName',
                    flex: 1

                }, {
                    header: 'Montant',
                    dataIndex: 'amount',
                    flex: 1,
                    renderer: amountfarmat
                }, {
                    header: 'Date',
                    dataIndex: 'createAt',
                    flex: 1

                }, {
                    header: 'Lieu de Travail',
                    dataIndex: 'emplacement',
                    flex: 1
                }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [

                {
                    xtype: 'datefield',
                    fieldLabel: 'Du',
                    name: 'dt_debut',
                    id: 'dt_debut',
                    allowBlank: false,
                    submitFormat: 'Y-m-d',
                    maxValue: new Date(),
                     value: new Date(),
                    format: 'd/m/Y'

                }, {
                    xtype: 'datefield',
                    fieldLabel: 'Au',
                    name: 'dt_fin',
                    id: 'dt_fin',
                    allowBlank: false,
                    maxValue: new Date(),
                    submitFormat: 'Y-m-d',
                    format: 'd/m/Y',
                    value: new Date()
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'user',
                    emptyText: 'Recherche',
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
                    tooltip: 'rechercher',
                    scope: this,
                    iconCls: 'searchicon',
                    handler: this.onRechClick
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                pageSize: itemsPerPage,
                store: store,
                displayInfo: true,
                plugins: new Ext.ux.ProgressBarPager(),
                  listeners: {
                            beforechange: function (page, currentPage) {
                                let myProxy = this.store.getProxy();

                                myProxy.params = {
                                    dtEnd: null,
                                    dtStart: null,
                                    search: null
                                };
                                
                                myProxy.setExtraParam('dtStart', Ext.getCmp('dt_debut').getSubmitValue());
                                myProxy.setExtraParam('dtEnd', Ext.getCmp('dt_fin').getSubmitValue());
                                myProxy.setExtraParam('search', Ext.getCmp('rechecher').getValue());
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
        Me.onRechClick();
    },
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        
        this.getStore().load({
            params: {
                search: val.getValue(),
                dtStart:Ext.getCmp('dt_debut').getSubmitValue(),
                dtEnd:  Ext.getCmp('dt_fin').getSubmitValue()
            }
        });
    }

});