/* global Ext */

Ext.define('testextjs.store.Statistics.Grossistes', {
    extend: 'Ext.data.Store',
    requires: [
        'testextjs.model.Grossiste'
    ],
   
    model:'testextjs.model.Grossiste',
    pageSize:999,
    autoLoad: true,
    proxy: {
        type: 'ajax',
        url:'../webservices/configmanagement/grossiste/ws_data.jsp',
        reader: {
            type: 'json',
            root: 'results',
            totalProperty: 'total'
        },
         timeout: 240000
    }
});