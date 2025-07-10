Ext.define('testextjs.view.Report.statistiquevente.action.SalesController', {
    extend: 'Ext.app.Controller',
     alias: 'controller.staticssalescontroller',
    init: function(application) {
        var me = this;
        me.control({
            'staticdatagrid button#add': {
                click: me.onButtonClickAdd
            },
            'staticdatagrid button#save': {
                click: me.onButtonClickSave
            },
            'staticdatagrid button#cancel': {
                click: this.onButtonClickCancel
            }


        });

    },
    onAdd: function(button, e, options) {
//        this.createDialog(null);
    },
    onEdit: function(button) {
        this.createDialog(button.getWidgetRecord());

    },
    onCancel: function(button, e, options) {
        var me = this;
        me.dialog = Ext.destroy(me.dialog);
    },
    onDelete: function(button, e, options) {
        var record = button.getWidgetRecord();
        this.deleteRecord(record);
    }, onTextFieldSpecialKey: function(field, e, options) {

        if (e.getKey() === e.ENTER) {
            this.onSave();
        }
    }, onSearch: function(field, e, options) {
        if (e.getKey() === e.ENTER) {
            this.search(field.getValue());
        }
    },
    btnSearch: function(field, e, options) {
        var me = this,
                search = me.lookupReference('search');
        this.search(search.getValue());
    },
    onButtonClickAdd: function(button, e, options) {
        var grid = button.up('staticdatagrid'),
                store = grid.getStore(),
                modelName = store.getModel().getName(),
                cellEditing = grid.getPlugin('cellplugin');
        store.insert(0, Ext.create(modelName, {
            dt_UPDATED: new Date()
        }));
        cellEditing.startEditByPosition({row: 0, column: 1});
    },
    onButtonClickSave: function(button, e, options) {
        var grid = button.up('staticdatagrid'),
                store = grid.getStore(),
                errors = grid.validate();

        if (errors === undefined) {
            store.sync({/*
             callback: function(batch, options) {
             
             },*/
                success: function(batch, options) {
                    store.load();
                   

                },
                failure: function(batch, options) {
                  
                },
                scope: this
            });


        } else {

        }
    },
    onButtonClickCancel: function(button, e, options) {
        button.up('staticdatagrid').getStore().reload();
    }, handleActionColumn: function(column, action, view, rowIndex, colIndex, item, e) {

        var store = view.up('staticdatagrid').getStore(),
                rec = store.getAt(rowIndex);
        if (action == 'delete') {
            store.remove(rec);
          
        }
    }, onFilterSelect: function(
            field, e, options) {
        this.reconfigureBalancegrid(field.getValue());

    }

});