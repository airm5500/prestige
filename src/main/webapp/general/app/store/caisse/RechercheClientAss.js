Ext.define('testextjs.store.caisse.RechercheClientAss', {
    extend: 'Ext.data.Store',
    requires: [
        'testextjs.model.caisse.ClientAssurance'
    ],
    model: 'testextjs.model.caisse.ClientAssurance',
    autoLoad: false,
    pageSize: null,
    proxy: {
        type: 'ajax',
        url: '../api/v1/client/all',
        reader: {
            type: 'json',
            root: 'data',
            totalProperty: 'total'
        }

    }

});