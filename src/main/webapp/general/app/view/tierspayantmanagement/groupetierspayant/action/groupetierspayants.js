/* global Ext */

var Oview;
var Omode;
var Me;
var lg_GROUPE_ID;


Ext.define('testextjs.view.tierspayantmanagement.groupetierspayant.action.groupetierspayants', {
    extend: 'Ext.window.Window',
    xtype: 'groupetierspayants',
    maximizable: true,
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'Ext.ux.ProgressBarPager',
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'testextjs.model.GroupeTierspayantModel'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function () {


        Oview = this.getParentview();

        Me = this;

        var itemsPerPage = 15;

        lg_GROUPE_ID = this.getOdatasource();

        var storein = new Ext.data.Store({
            model: 'testextjs.model.GroupeTierspayantModel',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../webservices/configmanagement/groupe/ws_groupe_tierspayant.jsp?lg_GROUPE_ID=' + lg_GROUPE_ID,
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });
        var storenotin = new Ext.data.Store({
            model: 'testextjs.model.GroupeTierspayantModel',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../webservices/configmanagement/groupe/ws_groupe_notein.jsp?lg_GROUPE_ID=' + lg_GROUPE_ID,
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });

        var cols = [
            {header: "ID", flex: 1, sortable: true, dataIndex: 'lgTIERSPAYANTID', hidden: true},
            {header: "LIBELLE TP", flex: 1.5, sortable: true, dataIndex: 'str_LIB'},
            {header: "GROUPE", flex: 1, sortable: true, dataIndex: 'str_GROUPE_LIB'}
        ];
        

        var colsin = [
            {header: "ID", flex: 1, sortable: true, dataIndex: 'lgTIERSPAYANTID', hidden: true},
            {header: "LIBELLE TP", flex: 1.5, sortable: true, dataIndex: 'str_LIB'},
            {header: "GROUPE", flex: 1, sortable: true, dataIndex: 'str_GROUPE_LIB'}
        ];

        var form = new Ext.form.Panel({
            bodyPadding: 10,
            autoScroll: true,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 150,
                layout: {
                    type: 'vbox',
                    align: 'stretch',
                    padding: 10
                },
                defaults: {
                    flex: 1
                }

            },
            items: [
                {
                    xtype: 'fieldset',
                    border: false,
                    layout: 'fit',

                    items: [{
                            xtype: 'displayfield',
                            style: 'margin-left:15%;font-size:1.3em;',
                            fieldLabel: 'Gestion des tiers-payant du groupe',
//                          
                            labelWidth: 410,
                            id: 'groupedisplayfield',
                            fieldStyle: "color:blue;font-weight:bold;font-size:1.5em"
                        }


                    ]
                },
                {
                    xtype: 'panel',
                    border: false,
                    layout: 'hbox',
                    defaults: {flex: 1}, //auto stretch
//                    layoutConfig: {align: 'stretch'},
                    items: [
                        {

                            xtype: 'gridpanel',
                            id: 'notINGrid',
                            minHeight: 300,
                            multiSelect: true,
                            viewConfig: {
                                plugins: {
                                    ptype: "gridviewdragdrop",
                                    dragGroup: 'notINGrid',
                                    dropGroup: 'INGrid'
                                },
                                listeners: {
                                    drop: function (node, data, dropRec, dropPosition) {
                                        //console.log(data.records[2].get('lgTIERSPAYANTID'));
                                        var selectedrecords = [];
                                        Ext.each(data.records, function (v, i) {

                                            selectedrecords.push(v.get('lgTIERSPAYANTID'));
                                        });

                                        Ext.Ajax.request({
                                            url: '../api/v1/groupe-tierspayant/transaction',
                                            params: {
                                                mode: 4,
                                                listtp: Ext.encode(selectedrecords),
                                                lg_GROUPE_ID: lg_GROUPE_ID


                                            },
                                            success: function (response)
                                            {

                                                var object = Ext.JSON.decode(response.responseText, false);
                                                if (object.status > 0) {
                                                    Ext.getCmp('INGrid').getStore().load({
                                                        params: {lg_GROUPE_ID: lg_GROUPE_ID, search_value: Ext.getCmp('rechercherIN').getValue()}
                                                    });
                                                    Ext.getCmp('notINGrid').getStore().load({
                                                        params: {lg_GROUPE_ID: lg_GROUPE_ID, search_value: Ext.getCmp('rechercher').getValue()}
                                                    });

//                                                Ext.MessageBox.alert('INFO', object.message);

                                                }




                                            },
                                            failure: function (response)
                                            {


                                            }
                                        });


                                    }
                                }

                            },
                            margin: '0 5 5 0',
                            title: 'Les tiers-payant non associés à ce groupe',
                            store: storenotin,

                            stripeRows: true,

                            columns: cols,
                            tbar: [
                                {
                                    xtype: 'textfield',
                                    id: 'rechercher',
                                    name: 'rechercher',
                                    flex: 0.5,
                                    emptyText: 'Rech',
                                    enableKeyEvents: true,
                                    listeners: {

                                        specialKey: function (field, e, options) {
                                            if (e.getKey() === e.ENTER)
                                            {
                                                Ext.getCmp('notINGrid').getStore().load({
                                                    params: {

                                                        lg_GROUPE_ID: lg_GROUPE_ID,
                                                        search_value: field.getValue()
                                                    }
                                                });

                                            }

                                        }
                                    }
                                }, '-',

                                {
                                    xtype: 'button',
                                    text: 'Tout basculer à droite',
                                    tooltip: 'Tout basculer à droite',
                                    iconCls: 'right',
                                    margins: '0 0 5 5',

                                    handler: function () {
                                        if(Ext.getCmp('notINGrid').getStore().getCount()===0){return;}
                                        var selectedrecords = [];
                                        testextjs.app.getController('App').ShowWaitingProcess();
                                        Ext.Ajax.request({
                                            url: '../api/v1/groupe-tierspayant/transaction',
                                            params: {
                                                mode: 5,
                                                listtp: Ext.encode(selectedrecords),
                                                lg_GROUPE_ID: lg_GROUPE_ID,
                                                search_value: Ext.getCmp('rechercher').getValue()


                                            },
                                            success: function (response)
                                            {
                                                testextjs.app.getController('App').StopWaitingProcess();
                                                var object = Ext.JSON.decode(response.responseText, false);
                                                if (object.status > 0) {
                                                    Ext.getCmp('INGrid').getStore().load({
                                                        params: {lg_GROUPE_ID: lg_GROUPE_ID, search_value: Ext.getCmp('rechercherIN').getValue()}
                                                    });
                                                    Ext.getCmp('notINGrid').getStore().load({
                                                        params: {lg_GROUPE_ID: lg_GROUPE_ID, search_value: Ext.getCmp('rechercher').getValue()}
                                                    });

//                                                Ext.MessageBox.alert('INFO', object.message);

                                                } else {
//                                                            Ext.MessageBox.alert('ERROR', 'Erreur d \'modification');

                                                    testextjs.app.getController('App').StopWaitingProcess();
                                                }





                                            },
                                            failure: function (response)
                                            {
                                                testextjs.app.getController('App').StopWaitingProcess();

                                            }
                                        });

                                    }
                                },

                                {

                                    xtype: 'checkbox',
                                    margins: '0 0 5 5',
                                    boxLabel: 'Tous S&eacute;lectionner',
                                    id: 'selectALL',
                                    checked: false,
                                    hidden:true,
                                    listeners: {
                                        change: function () {
                                            var selectedrecords = [];

                                            if (this.getValue()) {

                                                Ext.Ajax.request({
                                                    url: '../api/v1/groupe-tierspayant/transaction',
                                                    params: {
                                                        mode: 5,
                                                        listtp: Ext.encode(selectedrecords),
                                                        lg_GROUPE_ID: lg_GROUPE_ID,
                                                        search_value: Ext.getCmp('rechercher').getValue()


                                                    },
                                                    success: function (response)
                                                    {

                                                        var object = Ext.JSON.decode(response.responseText, false);
                                                        if (object.status > 0) {
                                                            Ext.getCmp('INGrid').getStore().load({
                                                                params: {lg_GROUPE_ID: lg_GROUPE_ID, search_value: Ext.getCmp('rechercherIN').getValue()}
                                                            });
                                                            Ext.getCmp('notINGrid').getStore().load({
                                                                params: {lg_GROUPE_ID: lg_GROUPE_ID, search_value: Ext.getCmp('rechercher').getValue()}
                                                            });

//                                                Ext.MessageBox.alert('INFO', object.message);

                                                        } else {
                                                            Ext.MessageBox.alert('ERROR', 'Erreur d \'modification');


                                                        }





                                                    },
                                                    failure: function (response)
                                                    {


                                                    }
                                                });








                                            } else {
//                                            grid.getSelectionModel().deselectAll();
                                            }


                                        }
                                    }
                                }
                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: itemsPerPage,
                                store: storenotin,
                                displayInfo: true
                                ,
                                listeners: {
                                    beforechange: function (page, currentPage) {
                                        var myProxy = this.store.getProxy();
                                        myProxy.params = {
                                            lg_GROUPE_ID: '',
                                            search_value: ''
                                        };

                                        myProxy.setExtraParam('search_value', Ext.getCmp('rechercher').getValue());
                                        myProxy.setExtraParam('lg_GROUPE_ID', lg_GROUPE_ID);
                                    }

                                }


                            }
                        },

                        {

                            xtype: 'grid',
                            id: 'INGrid',
                            margin: '0 0 5 0',
                            minHeight: 300,
                            title: 'Les tiers-payant  associés à ce groupe',
                            multiSelect: true,
                            viewConfig: {
                                plugins: {
                                    ptype: "gridviewdragdrop",
                                    dragGroup: 'INGrid',
                                    dropGroup: 'notINGrid'
                                },
                                listeners: {
                                    drop: function (node, data, dropRec, dropPosition) {

                                        var selectedrecords = [];
                                        Ext.each(data.records, function (v, i) {

                                            selectedrecords.push(v.get('lgTIERSPAYANTID'));
                                        });

                                        Ext.Ajax.request({
                                            url: '../api/v1/groupe-tierspayant/transaction',
                                            params: {
                                                mode: 3,
                                                listtp: Ext.encode(selectedrecords),
                                                lg_GROUPE_ID: lg_GROUPE_ID


                                            },
                                            success: function (response)
                                            {

                                                var object = Ext.JSON.decode(response.responseText, false);
                                                if (object.status > 0) {
                                                    Ext.getCmp('INGrid').getStore().load({
                                                        params: {lg_GROUPE_ID: lg_GROUPE_ID, search_value: Ext.getCmp('rechercherIN').getValue()}
                                                    });
                                                    Ext.getCmp('notINGrid').getStore().load({
                                                        params: {lg_GROUPE_ID: lg_GROUPE_ID, search_value: Ext.getCmp('rechercher').getValue()}
                                                    });

//                                                Ext.MessageBox.alert('INFO', object.message);

                                                } else {
                                                    Ext.MessageBox.alert('ERROR', 'Erreur d \'modification');


                                                }





                                            },
                                            failure: function (response)
                                            {


                                            }
                                        });


                                    }
                                }



                            },
                            stripeRows: true,
//                            autoExpandColumn: 'name',
                            store: storein,

                            columns: colsin,
                            tbar: [
                                {
                                    xtype: 'textfield',
                                    id: 'rechercherIN',

                                    flex: 0.5,
                                    emptyText: 'Rech', enableKeyEvents: true,
                                    listeners: {

                                        specialKey: function (field, e, options) {
                                            if (e.getKey() === e.ENTER)
                                            {
                                                Ext.getCmp('INGrid').getStore().load({
                                                    params: {

                                                        lg_GROUPE_ID: lg_GROUPE_ID,
                                                        search_value: field.getValue()
                                                    }
                                                });

                                            }

                                        }
                                    }

                                }, '-',
                                {
                                    xtype: 'button',
                                    text: 'Tout basculer à gauche',
                                    tooltip: 'Tout basculer à gauche',
                                    iconCls: 'left',
                                    margins: '0 0 5 5',

                                    handler: function () {
                                         if(Ext.getCmp('INGrid').getStore().getCount()===0){return;}
                                        var selectedrecords = [];
                                        testextjs.app.getController('App').ShowWaitingProcess();
                                        Ext.Ajax.request({
                                            url: '../api/v1/groupe-tierspayant/transaction',
                                            params: {
                                                mode: 6,
                                                listtp: Ext.encode(selectedrecords),
                                                lg_GROUPE_ID: lg_GROUPE_ID,
                                                search_value: Ext.getCmp('rechercherIN').getValue()


                                            },
                                            success: function (response)
                                            {
                                                testextjs.app.getController('App').StopWaitingProcess();

                                                var object = Ext.JSON.decode(response.responseText, false);
                                                if (object.status > 0) {
                                                    Ext.getCmp('INGrid').getStore().load({
                                                        params: {lg_GROUPE_ID: lg_GROUPE_ID, search_value: Ext.getCmp('rechercherIN').getValue()}
                                                    });
                                                    Ext.getCmp('notINGrid').getStore().load({
                                                        params: {lg_GROUPE_ID: lg_GROUPE_ID, search_value: Ext.getCmp('rechercher').getValue()}
                                                    });

//                                                Ext.MessageBox.alert('INFO', object.message);

                                                } else {
//                                                            Ext.MessageBox.alert('ERROR', 'Erreur d \'modification');

                                                    testextjs.app.getController('App').StopWaitingProcess();
                                                }





                                            },
                                            failure: function (response)
                                            {
                                                testextjs.app.getController('App').StopWaitingProcess();


                                            }
                                        });

                                    }
                                },

                                {

                                    xtype: 'checkbox',
                                    margins: '0 0 5 5',
                                    boxLabel: 'Tous S&eacute;lectionner',
                                    id: 'selectALLIN',
                                    checked: false,
                                    hidden: true,
                                    listeners: {
                                        change: function () {
                                            var selectedrecords = [];

                                            if (this.getValue()) {

                                                Ext.Ajax.request({
                                                    url: '../api/v1/groupe-tierspayant/transaction',
                                                    params: {
                                                        mode: 6,
                                                        listtp: Ext.encode(selectedrecords),
                                                        lg_GROUPE_ID: lg_GROUPE_ID,
                                                        search_value: Ext.getCmp('rechercherIN').getValue()


                                                    },
                                                    success: function (response)
                                                    {

                                                        var object = Ext.JSON.decode(response.responseText, false);
                                                        if (object.status > 0) {
                                                            Ext.getCmp('INGrid').getStore().load({
                                                                params: {lg_GROUPE_ID: lg_GROUPE_ID, search_value: Ext.getCmp('rechercherIN').getValue()}
                                                            });
                                                            Ext.getCmp('notINGrid').getStore().load({
                                                                params: {lg_GROUPE_ID: lg_GROUPE_ID, search_value: Ext.getCmp('rechercher').getValue()}
                                                            });

//                                                Ext.MessageBox.alert('INFO', object.message);

                                                        } else {
//                                                            Ext.MessageBox.alert('ERROR', 'Erreur d \'modification');


                                                        }





                                                    },
                                                    failure: function (response)
                                                    {


                                                    }
                                                });








                                            }

                                        }
                                    }
                                }






                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: itemsPerPage,
                                store: storein,
                                displayInfo: true
                                ,
                                listeners: {
                                    beforechange: function (page, currentPage) {
                                        var myProxy = this.store.getProxy();
                                        myProxy.params = {
                                            lg_GROUPE_ID: '',
                                            search_value: ''
                                        };

                                        myProxy.setExtraParam('search_value', Ext.getCmp('rechercherIN').getValue());
                                        myProxy.setExtraParam('lg_GROUPE_ID', lg_GROUPE_ID);
                                    }

                                }


                            }
                        }



                    ]
                }

            ]


        });


        Ext.getCmp('groupedisplayfield').setValue(this.getMode());

        var win = new Ext.window.Window({
            autoShow: true, title: this.getTitre(),
            maximizable: true,
            width: '90%',
            height: 650,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [

                {
                    text: 'Fermer',
                    handler: function () {
                        win.close();
                    }
                }]

        });

    },

    onRechClick: function () {

        var val = Ext.getCmp('rechercher'),
                zoneID = Ext.getCmp('zoneID').getValue();
        if (zoneID === null) {
            zoneID = '';
        }

    }
   
});