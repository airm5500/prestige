/* global Ext */

Ext.define('testextjs.store.Search', {
    extend: 'Ext.data.Store',
    requires: [
        'testextjs.model.Search'
    ],
    model: 'testextjs.model.Search',
    pageSize: 20,
    storeId: 'Search',
    autoLoad: false,
    proxy: {
        type: 'ajax',
        url: '../api/v1/produit-search/produits',
        reader: {
            type: 'json',
            root: 'data',
            totalProperty: 'total'
        }

    }
});

