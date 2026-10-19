
var url_services_data_representantgrossiste = '../webservices/configmanagement/representantgrossiste/ws_data.jsp';
var url_services_transaction_representantgrossiste = '../webservices/configmanagement/representantgrossiste/ws_transaction.jsp?mode=';
Ext.define('testextjs.view.configmanagement.representantgrossiste.RepresentantGrossisteManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'representantgrossistemanager',
    id: 'representantgrossistemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Representantgrossiste',
        'testextjs.view.configmanagement.representantgrossiste.action.add',
        'Ext.ux.ProgressBarPager'

    ],
    title: 'Gest.Representantgrossiste',
    plain: true,
    maximizable: true,
    tools: [{type: "pin"}],
    closable: true,
    frame: true,
    initComponent: function () {

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Representantgrossiste',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_representantgrossiste,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        Ext.apply(this, {
            width: 950,
            height: 580,
            store: store,
            columns: [{
                    header: 'lg_REPRESENTANT_GROSSISTE_ID',
                    dataIndex: 'lg_REPRESENTANT_GROSSISTE_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                }, {
                    header: 'Nom',
                    dataIndex: 'str_NAME',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                }, {
                    header: 'Description',
                    dataIndex: 'str_DESCRIPTION',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, {
                    header: 'Adresse Rue 1',
                    dataIndex: 'str_ADRESSE_RUE_1',
                    hidden: false,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },
                /*
                 {
                 header: 'Adresse Rue 2',
                 dataIndex: 'str_ADRESSE_RUE_2',
                 flex: 1,
                 editor: {
                 allowBlank: false
                 }
                 }
                 /
                 , {
                 header: 'Code Postal',
                 dataIndex: 'str_CODE_POSTAL',
                 flex: 1,
                 editor: {
                 allowBlank: false
                 }
                 },
                 {
                 header: 'Bureau Distributeur',
                 dataIndex: 'str_BUREAU_DISTRIBUTEUR',
                 hidden: false,
                 flex: 1,
                 editor: {
                 allowBlank: false
                 }
                 
                 }, */
                {
                    header: 'Mobile',
                    dataIndex: 'str_MOBILE',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, {
                    header: 'Telephone',
                    dataIndex: 'str_TELEPHONE',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },  
                {
                    header: 'Mail',
                    dataIndex: 'str_EMAIL',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, 
                {
                    header: 'Ville',
                    dataIndex: 'lg_VILLE_ID',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                },
                
                {
                    header: 'Grossiste',
                    dataIndex: 'lg_GROSSISTE_ID',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, 
                {
                    header: 'Commentaire',
                    dataIndex: 'str_COMMENTAIRE',
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
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
                    text: 'Creer',
                    scope: this,
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'representantgrossiste',
                    emptyText: 'Rech'
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    scope: this,
                    handler: this.onRechClick
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                pageSize: 10,
                store: store,
                displayInfo: true,
                plugins: new Ext.ux.ProgressBarPager()
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true 
        }),
                this.on('edit', function (editor, e) {

                    Ext.Ajax.request({
                        url: url_services_transaction_representantgrossiste + 'update',
                        params: {
                            lg_REPRESENTANT_GROSSISTE_ID: e.record.data.lg_REPRESENTANT_GROSSISTE_ID,
                            str_NAME: e.record.data.str_NAME,
                            str_DESCRIPTION: e.record.data.str_DESCRIPTION,
                            
                            str_ADRESSE_RUE_1: e.record.data.str_ADRESSE_RUE_1,
                            str_ADRESSE_RUE_2: e.record.data.str_ADRESSE_RUE_2,
                            str_CODE_POSTAL: e.record.data.str_CODE_POSTAL,
                            
                            str_BUREAU_DISTRIBUTEUR: e.record.data.str_BUREAU_DISTRIBUTEUR,
                            str_MOBILE: e.record.data.str_MOBILE,
                            str_TELEPHONE: e.record.data.str_TELEPHONE,  
                            
                            str_EMAIL: e.record.data.str_EMAIL,
                            str_COMMENTAIRE: e.record.data.str_COMMENTAIRE,                              
                            
                            lg_VILLE_ID: e.record.data.lg_VILLE_ID,
                            lg_GROSSISTE_ID: e.record.data.lg_GROSSISTE_ID
                            
                        },
                        success: function (response)
                        {
                            console.log(response.responseText);
                            e.record.commit();
                            store.reload();
                        },
                        failure: function (response)
                        {
                            console.log("Bug " + response.responseText);
                            alert(response.responseText);
                        }
                    });
                });


    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
    },
    onAddClick: function () {

        new testextjs.view.configmanagement.representantgrossiste.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Representantgrossiste"
        });
    },
    onEditClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.configmanagement.representantgrossiste.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Representantgrossiste  [" + rec.get('str_NAME') + "]"
        });

    },
    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_representantgrossiste + 'delete',
                            params: {
                                lg_REPRESENTANT_GROSSISTE_ID: rec.get('lg_REPRESENTANT_GROSSISTE_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_NAME') + ']', 'Impossible de Supprimer cette ligne');
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_NAME') + ']', 'Suppression effectuee avec succes');
//                                    

                                }
                                grid.getStore().reload();
                            },
                            failure: function (response)
                            {

                                var object = Ext.JSON.decode(response.responseText, false);
                                //  alert(object);

                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    });


    },
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_representantgrossiste);
    }

});