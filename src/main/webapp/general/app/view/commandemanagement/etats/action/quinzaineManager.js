/* global Ext */
var itemsPerPage = 20;
var url_services_data_grossiste = '../webservices/configmanagement/grossiste/ws_data.jsp';
var url_services_quinzaine_data = '../webservices/commandemanagement/bonlivraison/ws_quinzaine_data.jsp';
var url_services_quinzaine_transaction = '../webservices/commandemanagement/bonlivraison/ws_quinzaine_transaction.jsp';
var Me;

Ext.define('testextjs.view.commandemanagement.etats.action.quinzaineManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'quinzaineManager',
    id: 'quinzainManagerID',
    require: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Quinzaine'
    ],
    frame: true,
//    collapsible: true,
    animCollapse: false,
    title: 'Gestion des quinzaines',
    initComponent: function () {
        Me = this;

        var store_grossiste = new Ext.data.Store({
            model: 'testextjs.model.Grossiste',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                  url: '../api/v1/grossiste/all',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 240000
            }

        });
        
        var store_quinzaine = new Ext.data.Store({
            model: 'testextjs.model.Quinzaine', // to be created
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_quinzaine_data,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 240000
            }

        });


        Ext.apply(this, {
            width: '98%',
            height: 580,
            store: store_quinzaine,
            id: 'quinzaineGridID',
            columns: [
                {
                    header: 'ID',
                    dataIndex: 'lg_QUINZAINE_ID',
                    flex: 1.5,
                    hidden: true
                },
                {
                    header: 'GROSSISTE',
                    dataIndex: 'str_GROSSISTE_LIBELLE',
                    flex: 1.5
                },
                {
                    header: 'Date Début',
                    dataIndex: 'dt_START_DATE',
                    flex: 1.5
                },
                {
                    header: 'Date Fin',
                    dataIndex: 'dt_END_DATE',
                    flex: 1.5
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [
                        {
                            icon: 'resources/images/icons/fam/delete.png',
                            tooltip: 'Suppression de la quinzaine',
                            scope: this,
                            handler: this.onRemoveClick
                        }

                    ]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [
                        {
                            icon: 'resources/images/icons/fam/page_white_edit.png',
                            tooltip: 'Modifier la quinzaine',
                            scope: this,
                            handler: this.onUpdateClick
                        }
                    ]
                }
            ],
            tbar: [
                {
                    text: 'Créer',
                    tooltip: 'créer une quinzaine',
                    scope: this,
                    handler: this.onCreateClick
                },'-',
                {
                    xtype: 'combobox',
                    name: 'lg_GROSSISTE_ID',
                    margins: '0 0 0 10',
                    id: 'lg_GROSSISTE_ID',
                    store: store_grossiste,
                    //disabled: true,
                    valueField: 'lg_GROSSISTE_ID',
                    displayField: 'str_LIBELLE',
                    typeAhead: true,
                    queryMode: 'remote',
                    flex: 1,
                    emptyText: 'Selectionner grossiste...',
                    listeners: {
                        select: function (cmp) {
                            Ext.getCmp('quinzaineGridID').getStore().load({
                                lg_GROSSISTE_ID: cmp.getValue()
                            });
                        }
                    }

                },'-',
                {
                    xtype: 'datefield',
                    id: 'datedebutQuinzaine',
                    name: 'datedebut',
                    emptyText: 'Date debut',
                    submitFormat: 'Y-m-d',
                    maxValue: new Date(),
                    flex: 0.7,
                    format: 'd/m/Y',
                    listeners: {
                        'change': function (me) {
                            valdatedebut = me.getSubmitValue();
                        }
                    }
                }, '-', {
                    xtype: 'datefield',
                    id: 'datefinQuinzaine',
                    name: 'datefin',
                    emptyText: 'Date fin',
                    maxValue: new Date(),
                    flex: 0.7,
                    submitFormat: 'Y-m-d',
                    format: 'd/m/Y',
                    listeners: {
                        'change': function (me) {
                            valdatefin = me.getSubmitValue();
                        }
                    }
                }, '-',
                {
                    xtype: 'textfield',
                    id: 'rechecherQuinzaine',
                    name: 'suggestion',
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
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    scope: this,
                    handler: this.onRechClick
                }
            ],
            bbar: {
                xtype: 'pagingtoolbar',
                pageSize: 10,
                store: store_quinzaine,
                displayInfo: true,
                plugins: new Ext.ux.ProgressBarPager()
            }

        });

        this.callParent();
        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });
    },
    onCreateClick: function () {
       
       new testextjs.view.commandemanagement.etats.action.addQuinzaine({
            odatasource: "",
            parentview: Me,
            mode: "create",
            titre: "Créer une quinzaine",
            type: "addQuinzaine",
            record: {}
        });
    },
    
   
    loadStore: function () {},
    
    onRemoveClick: function (grid, rowIndex) {
        var record = grid.getStore().getAt(rowIndex);
        var params = {
                        lg_QUINZAINE_ID: record.get('lg_QUINZAINE_ID'),
                        mode: 'delete'
                      };
        Ext.Ajax.request({
            url: url_services_quinzaine_transaction,
            params: params,
            success: function(response){
                var jsonResponse = Ext.JSON.decode(response.responseText);
                Me.processRemoveResponse(jsonResponse, grid);
            },
            failure: function(error){
                console.error(error);
            }
        });
    },
    
    processRemoveResponse: function(response, grid){
       
        if(response.success === true){
          Ext.MessageBox.show({
                title: 'Suppression de quinzaine',
                width: 320,
                msg: 'Quinzaine supprimée avec succès',
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.SUCC,
                fn: function (bt) {
                      grid.getStore().reload();
                }
            }); 
       }else{
           Ext.MessageBox.show({
                title: 'Suppression de quinzaine',
                width: 320,
                msg: 'Erreur lors de la Suppression de la quinzaine',
                buttons: Ext.MessageBox.ERROR,
                icon: Ext.MessageBox.ERROR,
                fn: function (btn) {}
            });
       } 
    },
    
    onUpdateClick: function (grid, rowIndex) {
        var record = grid.getStore().getAt(rowIndex);
        console.log(record);        
        new testextjs.view.commandemanagement.etats.action.addQuinzaine({
            odatasource: "",
            parentview: Me,
            mode: "update",
            record: record,
            titre: "Modifier la quinzaine "+ record.get('lg_QUINZAINE_ID'),
            type: "addQuinzaine"
        });
    }
});