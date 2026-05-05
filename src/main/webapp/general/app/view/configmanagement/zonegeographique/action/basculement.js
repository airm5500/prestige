/* global Ext */

var Oview;
var Omode;
var Me;
var lg_ZONE_GEO_ID = '%%';
var str_LIBELLEE = '',
        str_CODE = '';
var listProductSelected;
var checkedList;
var uncheckedList;
var pageItems = [];
Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}
Ext.define('testextjs.view.configmanagement.zonegeographique.action.basculement', {
    extend: 'Ext.window.Window',
    xtype: 'addfamille',
    id: 'addfamilleID',
    maximizable: true,
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'Ext.ux.ProgressBarPager',
        'Ext.selection.CellModel',
        'Ext.grid.*'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function () {
        listProductSelected = [];

        checkedList = [];
        uncheckedList = [];
        pageItems = [];
        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;

        var itemsPerPage = 20;

        lg_ZONE_GEO_ID = this.getOdatasource();

        var zonestore = new Ext.data.Store({
            model: 'testextjs.model.ZoneGeographique',
            pageSize: 10,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/stockmanagement/stock/ws_zone.jsp',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });
        var store = new Ext.data.Store({
            model: 'testextjs.model.Famille',
            pageSize: 15,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/stockmanagement/stock/ws_productbyzone.jsp',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });

        store.load({
            params: {
                zoneID: lg_ZONE_GEO_ID,
                search_value: ''
            }
        });


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
                    layout: 'vbox',

                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'displayfield',
                            margin: '0 0 5 0',
                            items: [

                                {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Libell&eacute; Empacement Choisi',
//                                    width: 400,
                                    labelWidth: 170,
                                    id: 'Empacement',
                                    fieldStyle: "color:blue;font-weight:bold;font-size:1.2em"
                                }, {
                                    xtype: 'displayfield',
                                    fieldLabel: 'Code Empacement Choisi',
//                                    width: 400,
                                    labelWidth: 170,
                                    id: 'codeEmp',
                                    fieldStyle: "color:blue;font-weight:bold;font-size:1.2em"
                                }


                            ]
                        }


                    ]
                },
                {
                    xtype: 'fieldset',
                    title: 'Liste Articles',
                    collapsible: true,
                    defaultType: 'textfield',
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            columnWidth: 0.65,
                            xtype: 'gridpanel',
                            id: 'basculID',
                            margin: '0 0 5 0',

                            store: store,
//                            height: 200,
                            columns: [{
                                    header: 'ID',
                                    dataIndex: 'lg_FAMILLE_ID',
                                    flex: 1,
                                    hidden: true
                                }, {
                                    header: 'CIP',
                                    dataIndex: 'int_CIP',
                                    flex: 1
                                },

                                {
                                    header: 'LIBELLE',
                                    dataIndex: 'str_NAME',

                                    flex: 2.5
                                },

                                {
                                    header: 'Emplacement',
                                    dataIndex: 'str_DESCRIPTION',

                                    flex: 2.5
                                }


                                , {
                                    header: 'QUANTITE',
                                    dataIndex: 'int_NUMBER',
                                    renderer: amountformat,
                                    align: 'right',
                                    flex: 0.8
                                }
                                , {
                                    header: 'PRIX.U',
                                    dataIndex: 'int_PRICE',
                                    renderer: amountformat,
                                    align: 'right',
                                    flex: 0.8
                                },
                                {
//                            header: 'Choix',
                                    text: '',
                                    dataIndex: 'isChecked',
                                    xtype: 'checkcolumn',
                                    flex: 0.5,

                                    listeners: {
                                        checkChange: this.onCheckChange
                                    }
                                }
                            ],
                            tbar: [
                                {
                                    xtype: 'textfield',
                                    id: 'rechercher',
                                    name: 'user',
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
                                },
                                {
                                    xtype: 'combobox',

//                                    margins: '0 0 0 10',
                                    id: 'zoneID',
                                    store: zonestore,
                                    fieldLabel: 'Empl.Origine',
                                    valueField: 'lg_ZONE_GEO_ID',
                                    displayField: 'str_LIBELLEE',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    pageSize: 10,
                                    flex: 2,
                                    labelWidth: 90,
                                    emptyText: 'Sectionner un emplacement...',
                                    listeners: {
                                        select: function (cmp) {

                                            if (Ext.getCmp('zoneID').getValue() !== null) {
                                                lg_ZONE_GEO_ID = Ext.getCmp('zoneID').getValue();
                                            }
                                            var combostore = cmp.getStore();
                                            var record = combostore.findRecord('lg_ZONE_GEO_ID', cmp.getValue());

                                            Me.onRechClick();

                                        }
                                    }}, {
                                    text: 'rechercher',
                                    tooltip: 'rechercher',
                                    scope: this,
                                    iconCls: 'ventesearch',

                                    handler: this.onRechClick
                                },

                                {
                                    xtype: 'combobox',

//                                    margins: '0 0 0 10',
                                    id: 'zoneDESID',
                                    store: zonestore,
                                    fieldLabel: 'Empl.Destination',
                                    valueField: 'lg_ZONE_GEO_ID',
                                    displayField: 'str_LIBELLEE',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    flex: 2,
                                    labelWidth: 100,
                                    pageSize: 10,
                                    emptyText: 'Sectionner un emplacement...',
                                    listeners: {
                                        select: function (cmp) {
                                            var combostore = cmp.getStore();
                                            var record = combostore.findRecord('lg_ZONE_GEO_ID', cmp.getValue());

                                            Ext.getCmp('Empacement').setValue(record.get('str_LIBELLEE'));
                                            Ext.getCmp('codeEmp').setValue(record.get('str_CODE'));


                                        }
                                    }},

                                {

                                    xtype: 'checkbox',
                                    margins: '0 0 5 5',
                                    boxLabel: 'Tous S&eacute;lectionner',
                                    id: 'selectALL',
                                    checked: false,
                                    listeners: {
                                        change: function () {

                                            //
                                            var grid = Ext.getCmp('basculID');
                                            var CODEstore = grid.getStore();
                                            if (this.getValue()) {
                                                uncheckedList.push(1);
                                                if (listProductSelected.length > 0) {
                                                    listProductSelected = [];
                                                }

                                                for (var i = 0; i < CODEstore.getCount(); i++) {
                                                    var record = CODEstore.getAt(i);
                                                    record.set('isChecked', true);

                                                }


                                            } else {
                                                uncheckedList = [];
                                                CODEstore.each(function (rec, id) {
                                                    rec.set('isChecked', false);
                                                });

                                            }
                                            CODEstore.commitChanges();
                                            grid.reconfigure(CODEstore);

                                        }
                                    }
                                }

                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: 15,
                                store: store,
                                displayInfo: true
                                ,
                                listeners: {
                                    beforechange: function (page, currentPage) {
                                        var myProxy = this.store.getProxy();
                                        myProxy.params = {
                                            zoneID: '',
                                            search_value: ''
                                        };
                                        myProxy.setExtraParam('search_value', Ext.getCmp('rechercher').getValue());
                                        myProxy.setExtraParam('zoneID', lg_ZONE_GEO_ID);
                                    }

                                }


                            }
                        }]
                }

            ]


        });


        const grid = Ext.getCmp('basculID');
        const all = Ext.getCmp('selectALL');
        const val = Ext.getCmp('rechercher');
        grid.getStore().on(
                "load",
                function () {

                    pageItems = [];
                    const CODEstore = grid.getStore();
                    if (listProductSelected.length > 0) {
                        let record;
                        Ext.each(listProductSelected, function (lg, index) {
                            CODEstore.each(function (r, id) {
                                record = CODEstore.findRecord('lg_FAMILLE_ID', lg);
                                if (record !== null) {

                                    record.set('isChecked', true);
                                }


                            });

                        });
                        if (record !== null) {
                            grid.reconfigure(grid.getStore());
                        }

                    }
                    if (all.getValue()) {
                        CODEstore.each(function (r, id) {
                            r.set('isChecked', true);

                        });
                        CODEstore.each(function (r, id) {
                            Ext.each(checkedList, function (lg, index) {

                                if (r.get('lg_FAMILLE_ID') === lg) {
                                    r.set('isChecked', false);
                                }

                            });

                            grid.reconfigure(grid.getStore());
                        });


                        grid.reconfigure(grid.getStore());
                    }

                }

        );




        const win = new Ext.window.Window({
            autoShow: true, title: this.getTitre(),
            maximizable: true,
            width: '90%',
            height: 600,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [
                {
                    text: 'Basculer',
                    handler: function () {
                        let zoneDESID = Ext.getCmp('zoneDESID').getValue();
                        if (zoneDESID === null || zoneDESID === '') {
                            Ext.MessageBox.show({
                                title: 'Avertissement',
                                width: 320,
                                msg: "Veuillez choisir l'emplacement de destination",
                                buttons: Ext.MessageBox.OK,
                                icon: Ext.MessageBox.WARNING
                            });

                            return;
                        } else if (zoneDESID !== null && (uncheckedList.length === 0 && listProductSelected.length === 0)) {
                            Ext.MessageBox.show({
                                title: 'Avertissement',
                                width: 320,
                                msg: "Veuillez Selectionner au moins un produit",
                                buttons: Ext.MessageBox.OK,
                                icon: Ext.MessageBox.WARNING
                            });
                            return;
                        }
                        if (all.getValue() && (lg_ZONE_GEO_ID === null || lg_ZONE_GEO_ID === undefined || lg_ZONE_GEO_ID === '') && (val.getValue()===null || val.getValue()===undefined || val.getValue()==='')) {
                            Ext.MessageBox.show({
                                title: 'Avertissement',
                                width: 320,
                                msg: "Veuillez choisir l'emplacement d'origine",
                                buttons: Ext.MessageBox.OK,
                                icon: Ext.MessageBox.WARNING
                            });

                            return;
                        }


                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: '../webservices/stockmanagement/stock/ws_update.jsp',
                            method: 'POST',
                            timeout: 24000000,
                            params: {
                                MODE_SELECTION: all.getValue() ? 'ALL' : 'SELECTED',
                                zoneID: zoneDESID,
                                zoneIDO: lg_ZONE_GEO_ID,
                                search_value: val.getValue(),
                                uncheckedList: Ext.encode(checkedList),
                                recordsToSend: Ext.encode(listProductSelected)


                            },
                            success: function (response, options) {
                                testextjs.app.getController('App').StopWaitingProcess();
                                const object = Ext.JSON.decode(response.responseText, false);
                                if (object.status === 1) {



                                    Ext.MessageBox.alert('INFOS', object.message);

                                    let myStore = Ext.getCmp('basculID').getStore();
                                    let totalCnt = myStore.getTotalCount();
                                    let myCnt = myStore.getCount();
                                    let nbPage = Math.ceil((totalCnt / 15));
                                    let pageToLoad = (listProductSelected.length % 15);

                                    if (nbPage === myStore.currentPage) {
                                        if (listProductSelected.length > 0 && (listProductSelected.length < 15)) {
                                            if (listProductSelected.length < myCnt) {

                                                Ext.getCmp('basculID').getStore().reload();
                                            } else if (listProductSelected.length >= myCnt) {
                                                Ext.getCmp('basculID').getStore().loadPage(1);
                                                //  Ext.getCmp('basculID').getStore().loadPage((nbPage - 1));
                                            }
                                        } else if (listProductSelected.length > 0 && (listProductSelected.length > 15)) {

                                            Ext.getCmp('basculID').getStore().loadPage((nbPage - pageToLoad));
                                        }
                                    } else if ((nbPage + 1) === myStore.currentPage) {
                                        Ext.getCmp('basculID').getStore().loadPage(1);
                                    } else {
                                        if (listProductSelected.length > myCnt) {
                                            Ext.getCmp('basculID').getStore().loadPage(1);

                                        } else {
                                            Ext.getCmp('basculID').getStore().reload();
                                        }

                                    }

                                    listProductSelected = [];
                                    checkedList = [];
                                    pageItems = [];
                                    lg_ZONE_GEO_ID = null;//reset
                                    // Ext.getCmp('zoneDESID').setValue(null);
                                    Ext.getCmp('zoneID').setValue(null);
                                    if (all.getValue()) {
                                        Ext.getCmp('basculID').getStore().load();
                                    }
                                    all.setValue(false);
                                } else {
                                    testextjs.app.getController('App').StopWaitingProcess();
                                    Ext.MessageBox.alert('Error Message', "Le processus n'a pas abouti");

                                }


                            }, failure: function (response, options) {
                                LaborexWorkFlow.StopWaitingProcess();

//                    store.rejectChanges();

                            }
                        });



                    }
                }
                , '',

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
        Ext.getCmp('basculID').getStore().load({
            params: {

                zoneID: zoneID,
                search_value: val.getValue()
            }
        });
    },
    onCheckChange: function (column, rowIndex, checked, eOpts) {
        Array.prototype.unset = function (val) {
            var index = this.indexOf(val);
            if (index > -1) {
                this.splice(index, 1);
            }
        };

        var rec = Ext.getCmp('basculID').getStore().getAt(rowIndex); // on recupere la ligne courante de la grid

        if (checked === true) {
            listProductSelected.push(rec.get('lg_FAMILLE_ID')); //on ajoute l'index de la ligne selectionnée au tableau
            checkedList.unset(rec.get('lg_FAMILLE_ID'));
            pageItems.push(rec.get('lg_FAMILLE_ID'));
        } else {
            listProductSelected.unset(rec.get('lg_FAMILLE_ID'));
            checkedList.push(rec.get('lg_FAMILLE_ID'));
            pageItems.unset(rec.get('lg_FAMILLE_ID'));

        }
        Ext.getCmp('basculID').getStore().commitChanges();
    }

});