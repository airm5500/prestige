//var url_services ='../webservices/configmanagement/institution';
var url_services_data_typerisque = '../webservices/configmanagement/typerisque/ws_data.jsp';
var url_services_transaction_typerisque= '../webservices/configmanagement/typerisque/ws_transaction.jsp?mode=';
Ext.define('testextjs.view.configmanagement.typerisque.TyperisqueManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'typerisquemanager',
    id: 'typerisquemanagerID',
    requires: [
    'Ext.selection.CellModel',
    'Ext.grid.*',
    'Ext.window.Window',
    'Ext.data.*',
    'Ext.util.*',
    'Ext.form.*',
    'Ext.JSON.*',
    'testextjs.model.Typerisque',
    'testextjs.view.configmanagement.typerisque.action.add',
    'Ext.ux.ProgressBarPager'

    ],
    title: 'Gestion du Type Risque', 
     plain: true,
        maximizable: true,
      //  tools: [{type: "pin"}],
       // closable: true,
    frame: true,
    initComponent: function() {

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Typerisque',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typerisque,
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
            width: '98%',
            height: 580,
            plugins: [this.cellEditing],
            store: store,

            columns: [{
                header: 'lg_TYPERISQUE_ID',
                dataIndex: 'lg_TYPERISQUE_ID',
                hidden:true,
                flex: 1,
                editor: {
                    allowBlank: false
                }

                },
                {
                header: 'Code Type risque',
                dataIndex: 'str_NAME',
                 maskRe: /[0-9.]/,
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },
            {
                header: 'Prise en charge',
                dataIndex: 'str_DESCRIPTION',
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
                name: 'typerisque',

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
                url: url_services_transaction_typerisque+'update',
                params: {
                    lg_TYPERISQUE_ID : e.record.data.lg_TYPERISQUE_ID,
                    str_NAME : e.record.data.str_NAME,
                    str_DESCRIPTION : e.record.data.str_DESCRIPTION
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
        var rec = new testextjs.model.Typerisque({
            lg_TYPERISQUE_ID: 'init',
            str_NAME : '',
            str_DESCRIPTION : ''
            

        });

        this.getStore().insert(0, rec);
        this.cellEditing.startEditByPosition({
            row: 0,
            column: 0
        });
    },


    onRemoveClick: function(grid, rowIndex){
        Ext.MessageBox.confirm('Message',
            'confirmer la suppresssion',
            function(btn) {
                if (btn == 'yes') {
                    var rec = grid.getStore().getAt(rowIndex);
                    Ext.Ajax.request({
                        url: url_services_transaction_typerisque+'delete',
                        params: {
                            lg_TYPERISQUE_ID : rec.get('lg_TYPERISQUE_ID')
                        },
                        success: function(response)
                        {
                            var object = Ext.JSON.decode(response.responseText,false);
                            if(object.success == 0){
                               Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_NAME') + ']', 'Impossible de Supprimer cette ligne');
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Suppression ' + '[' + rec.get('str_NAME') + ']', 'Suppression effectuee avec succes');
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
                }
            });


    },


    onRechClick:function(){
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_typerisque);
    }

});