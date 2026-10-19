
/* global Ext */

var Me_Workflow;

Ext.define('testextjs.view.configmanagement.company.company', {
    extend: 'Ext.grid.Panel',
    xtype: 'company',
    id: 'companyID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Company',
        'testextjs.view.configmanagement.company.action.add',
        'Ext.ux.ProgressBarPager'

    ],
    title: 'Gestion des Categorie Client',
    urlData:'../webservices/configmanagement/comapnies/ws_data.jsp',
    urlTransaction:'../webservices/configmanagement/comapnies/ws_transaction.jsp',
    plain: true,
    maximizable: true,
   
    frame: true,
    initComponent: function() {
        Me_Workflow = this;
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Company',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: this.urlData,
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });

        Ext.apply(this, {
            width: '98%',
            height: 580,
            store: store,
            columns: [{
                    header: 'lg_COMPANY_ID',
                    dataIndex: 'lg_COMPANY_ID',
                    hidden: true,
                    flex: 1
                 
                },
                {
                    header: 'Raison sociale',
                    dataIndex: 'str_RAISONSOCIALE',
                    
                    flex: 1.5
                   
                },
                {
                    header: 'Adresse',
                    dataIndex: 'str_ADRESS',
                   
                    flex: 1
                   
                },
                
                {
                    header: 'Téléphone',
                    dataIndex: 'str_PHONE',
                    flex: 1
                   

                },
                
                {
                    header: 'Céllulaire',
                    dataIndex: 'str_CEL',
                    flex: 1
                   

                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/page_white_edit.png',
                            tooltip: 'Modifier',
                            scope: this,
                            handler: this.onEditClick
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.gif',
                            tooltip: 'Supprimer',
                            scope: this,
                            handler: this.onRemoveClick
                        }]
                }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    text: 'Créer',
                    scope: this,
                    iconCls: 'addicon',
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecherCat',
                    name: 'famillearticle',
                    emptyText: 'Recherche',
                    listeners: {
                        'render': function(cmp) {
                            cmp.getEl().on('keypress', function(e) {
                                if (e.getKey() === e.ENTER) {
                                    Me_Workflow.onRechClick();

                                }
                            });
                        }
                    }
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    iconCls: 'searchicon',
                    scope: this,
                    handler: this.onRechClick
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                pageSize: 20,
                store: store,
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
    loadStore: function() {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function() {
    },
    onAddClick: function() {

        new testextjs.view.configmanagement.company.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajout d'une nouvelle société"
        });
    },
    onEditClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.configmanagement.company.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification   [" + rec.get('str_RAISONSOCIALE') + "]"
        });

    },
    onRemoveClick: function(grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'Confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: Me_Workflow.urlTransaction ,
                            params: {
                                lg_COMPANY_ID: rec.get('lg_COMPANY_ID'),
                                mode:'delete'
                            },
                            success: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == "0") {
                                    Ext.MessageBox.alert('Error Message', "Echec de suppression");
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Information', "Suppression effectuee");
                                    grid.getStore().reload();
                                }
                            },
                            failure: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                //  alert(object);

                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    });


    },
    onRechClick: function() {
        var val = Ext.getCmp('rechecherCat');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        });
    }

});