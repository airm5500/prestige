//var url_services ='../webservices/sm_user/institution';
var url_services_data_skin = '../webservices/sm_user/skin/ws_data.jsp';
var url_services_transaction_skin= '../webservices/sm_user/skin/ws_transaction.jsp?mode=';
Ext.define('testextjs.view.sm_user.skin.SkinManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'skinmanager',
    id: 'skinmanagerID',
    requires: [
    'Ext.selection.CellModel',
    'Ext.grid.*',
    'Ext.window.Window',
    'Ext.data.*',
    'Ext.util.*',
    'Ext.form.*',
    'Ext.JSON.*',
    'testextjs.model.Skin',
    'testextjs.view.sm_user.skin.action.add',
    'Ext.ux.ProgressBarPager'

    ],
    title: 'Gest.Skin',
    frame: true,
    initComponent: function() {
        var test=0;
       
        var store = new Ext.data.Store({
            model: 'testextjs.model.Skin',
            proxy: {
                type: 'ajax',
                url: url_services_data_skin
            }

        });
        store.load({
            callback: function(){
                //console.log(pcstore.getCount());
               /* test =store.getCount();
                alert("Size " + test);
                alert("Size " + store.data.length);*/
            }
        });

        //alert(test);
        // alert("size " + store.getCount());


        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });

        Ext.apply(this, {
            width: 950,
            height: 580,
            plugins: [this.cellEditing],
            store: store,

            columns: [{
                header: 'lg_SKIN_ID',
                dataIndex: 'lg_SKIN_ID',
                hidden:true,
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },{
                header: 'Ressource',
                dataIndex: 'str_RESOURCE',
                flex: 1,
                editor: {
                    allowBlank: false
                }
            }/*,{
                header: 'Statut',
                dataIndex: 'str_STATUT',
                flex: 1,
                editor: {
                    allowBlank: false
                }
            }*/,{
                header: 'Path',
                dataIndex: 'str_DETAIL_PATH',
                flex: 1,
                editor: {
                    allowBlank: false
                }

            },{
                header: 'Description',
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
                    tooltip: 'Delete Plant',
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
                name: 'user',

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
        })


        this.on('edit', function(editor, e) {

            Ext.Ajax.request({
                url: url_services_transaction_skin+'update',
                params: {
                    lg_SKIN_ID : e.record.data.lg_SKIN_ID,
                    str_RESOURCE : e.record.data.str_RESOURCE,
                    str_STATUT : e.record.data.str_STATUT,
                    str_DESCRIPTION : e.record.data.str_DESCRIPTION,
                    str_DETAIL_PATH : e.record.data.str_DETAIL_PATH
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
         var rec = new testextjs.model.Skin({
            lg_SKIN_ID: 'init',
            str_RESOURCE: '',
            str_STATUT:'',
            str_DESCRIPTION: '',
            str_DETAIL_PATH: ''

        });

        this.getStore().insert(0, rec);
        this.cellEditing.startEditByPosition({
            row: 0,
            column: 0
        });
    },


    onRemoveClick: function(grid, rowIndex){
        PrestigeConfirmation.ligne('Message', 'confirm la suppresssion', function () {
                    var rec = grid.getStore().getAt(rowIndex);
                    Ext.Ajax.request({
                        url: url_services_transaction_skin+'delete',
                        params: {
                            lg_SKIN_ID : rec.get('lg_SKIN_ID')
                        },
                        success: function(response)
                        {
                            var object = Ext.JSON.decode(response.responseText,false);
                            if(object.success == 0){
                                Ext.MessageBox.alert('Error Message', object.errors);
                                return;
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
        }, url_services_data_skin);
    }

})