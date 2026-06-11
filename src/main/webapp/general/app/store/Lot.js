/* global Ext */

Ext.define('testextjs.store.Lot', {
    extend: 'Ext.data.Store',
    requires: [
        'testextjs.model.LOTS'
    ],

    model:'testextjs.model.LOTS',
   pageSize:20,
    autoLoad: true,
    proxy: {
        type: 'ajax',
        url:'../api/v1/lot/listlot',
        reader: {
            type: 'json',
            root: 'data',
            totalProperty: 'total'
        },
         timeout: 240000
    }
});
