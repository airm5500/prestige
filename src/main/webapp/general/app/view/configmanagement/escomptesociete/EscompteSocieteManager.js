//var url_services ='../webservices/configmanagement/institution';
var url_services_data_escomptesociete = '../webservices/configmanagement/escomptesociete/ws_data.jsp';
var url_services_transaction_escomptesociete= '../webservices/configmanagement/escomptesociete/ws_transaction.jsp?mode=';
Ext.define('testextjs.view.configmanagement.escomptesociete.EscompteSocieteManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'escomptesocietemanager',
    id: 'escomptesocietemanagerID',
    requires: [
    'Ext.selection.CellModel',
    'Ext.grid.*',
    'Ext.window.Window',
    'Ext.data.*',
    'Ext.util.*',
    'Ext.form.*',
    'Ext.JSON.*',
    'testextjs.model.EscompteSociete',
    'testextjs.view.configmanagement.escomptesociete.action.add',
    'Ext.ux.ProgressBarPager'

    ],
    title: 'Gestion Escompte Societe', 
     plain: true,
        maximizable: true,
       // tools: [{type: "pin"}],
       // closable: true,
    frame: true,
    initComponent: function() {

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.EscompteSociete',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_escomptesociete,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });

        Ext.apply(this, {
            width: '98',
            height: 580,
            plugins: [this.cellEditing],
            store: store,

            columns: [{
                header: 'lg_ESCOMPTE_SOCIETE_ID',
                dataIndex: 'lg_ESCOMPTE_SOCIETE_ID',
                hidden:true,
                flex: 1,
                editor: {
                    allowBlank: false
                }

                },{
                header: 'Code escompte societe',
                dataIndex: 'int_CODE_ESCOMPTE_SOCIETE',
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },{
                header: 'Libelle escompte societe',
                dataIndex: 'str_LIBELLE_ESCOMPTE_SOCIETE',
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },{
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
            },'-',{
                xtype: 'textfield',
                id:'rechecher',
                name: 'escomptesociete',

                emptyText: 'Rech'
            },{
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


        this.on('edit', function(editor, e) {

            Ext.Ajax.request({
                url: url_services_transaction_escomptesociete+'update',
                params: {
                    lg_ESCOMPTE_SOCIETE_ID : e.record.data.lg_ESCOMPTE_SOCIETE_ID,
                    int_CODE_ESCOMPTE_SOCIETE : e.record.data.int_CODE_ESCOMPTE_SOCIETE,
                    str_LIBELLE_ESCOMPTE_SOCIETE : e.record.data.str_LIBELLE_ESCOMPTE_SOCIETE
                },
                success: function(response)
                {
                    console.log(response.responseText);
                    e.record.commit();
                    store.reload();
                },
                failure: function(response)
                {
                    console.log("Bug "+response.responseText);
                    alert(response.responseText);
                }
            });
        });


    },


    loadStore: function() {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },

    onStoreLoad: function(){
    },

    onAddClick: function(){
        // Create a model instance
        var rec = new testextjs.model.EscompteSociete({
            lg_ESCOMPTE_SOCIETE_ID: 'init',
            int_CODE_ESCOMPTE_SOCIETE: '',
            str_LIBELLE_ESCOMPTE_SOCIETE: ''
            

        });

        this.getStore().insert(0, rec);
        this.cellEditing.startEditByPosition({
            row: 0,
            column: 0
        });
    },


    onRemoveClick: function(grid, rowIndex){
        PrestigeConfirmation.ligne('Message', 'confirmer la suppresssion', function () {
                    var rec = grid.getStore().getAt(rowIndex);
                    Ext.Ajax.request({
                        url: url_services_transaction_escomptesociete+'delete',
                        params: {
                            lg_ESCOMPTE_SOCIETE_ID : rec.get('lg_ESCOMPTE_SOCIETE_ID')
                        },
                        success: function(response)
                        {
                            var object = Ext.JSON.decode(response.responseText,false);
                            if(object.success == 0){
                                Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_LIBELLE_ESCOMPTE_SOCIETE') + ']', 'Impossible de Supprimer cette ligne');
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_LIBELLE_ESCOMPTE_SOCIETE') + ']', 'Suppression effectuee avec succes');
//                                    
                                }
                            grid.getStore().reload();
                        },
                        failure: function(response)
                        {

                            var object = Ext.JSON.decode(response.responseText,false);
                            //  alert(object);

                            console.log("Bug "+response.responseText);
                            Ext.MessageBox.alert('Error Message', response.responseText);

                        }
                    });
                    return;
                });


    },


    onRechClick:function(){
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_escomptesociete);
    }

});