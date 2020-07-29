var url_services_data_typedepense = '../webservices/sm_user/typedepense/ws_data.jsp';
var url_services_transaction_typedepense= '../webservices/sm_user/typedepense/ws_transaction.jsp?mode=';
Ext.define('testextjs.view.sm_user.typedepense.TypedepenseManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'typedepensemanager',
    id: 'typedepensemanagerID',
    requires: [
    'Ext.selection.CellModel',
    'Ext.grid.*',
    'Ext.window.Window',
    'Ext.data.*',
    'Ext.util.*',
    'Ext.form.*',
    'Ext.JSON.*',
    'testextjs.model.Typedepense',
    'testextjs.view.sm_user.typedepense.action.add',
    'Ext.ux.ProgressBarPager',

    ],
    title: 'Gest.Type Depense',
    frame: true,
    initComponent: function() {

        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Typedepense',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typedepense,
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
            width: 950,
            height: 580,
            plugins: [this.cellEditing],
            store: store,

            columns: [{
                header: 'lg_TYPE_DEPENSE_ID',
                dataIndex: 'lg_TYPE_DEPENSE_ID',
                hidden:true,
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },{
                header: 'Type Depense',
                dataIndex: 'str_TYPE_DEPENSE',
                flex: 1,
                editor: {
                    allowBlank: false
                }
            },{
                header: 'Numero Compte',
                dataIndex: 'str_NUMERO_COMPTE',
           flex: 1  ,
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
                store: store,   // same store GridPanel is using
                dock: 'bottom',
                displayInfo: true
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        })


        this.on('edit', function(editor, e) {

            Ext.Ajax.request({
                url: url_services_transaction_typedepense+'update',
                params: {
                    lg_TYPE_DEPENSE_ID : e.record.data.lg_TYPE_DEPENSE_ID,
                    str_TYPE_DEPENSE : e.record.data.str_TYPE_DEPENSE,
                    str_NUMERO_COMPTE : e.record.data.str_NUMERO_COMPTE
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
        var rec = new testextjs.view.sm_user.typedepense.action.add({
            lg_TYPE_DEPENSE_ID: 'init',
            str_TYPE_DEPENSE: '',
            str_NUMERO_COMPTE:''

        });

        this.getStore().insert(0, rec);
        this.cellEditing.startEditByPosition({
            row: 0,
            column: 0
        });
    },


    onRemoveClick: function(grid, rowIndex){
        Ext.MessageBox.confirm('Message',
            'confirm la suppresssion',
            function(btn) {
                if (btn == 'yes') {
                    var rec = grid.getStore().getAt(rowIndex);
                    Ext.Ajax.request({
                        url: url_services_transaction_typedepense+'delete',
                        params: {
                            lg_TYPE_DEPENSE_ID : rec.get('lg_TYPE_DEPENSE_ID')
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
                }
            });


    },


    onRechClick:function(){
        var val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                search_value: val.value
            }
        }, url_services_data_typedepense);
    }

})