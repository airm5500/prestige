Ext.define('testextjs.store.ArticleMvtStore', {
    extend: 'Ext.data.Store',

    requires: [
        'testextjs.model.ArticleMvt'
    ],

    model: 'testextjs.model.ArticleMvt',
    pageSize: 15,
    remoteSort: true,
    autoLoad: false,

    proxy: {
        type: 'ajax',
        url: '../api/v1/articlemvt/list',
        reader: {
            type: 'json',
            root: 'data',
            totalProperty: 'total'
        },

        extraParams: {
            query: '',
            dtStart: '',
            dtEnd: ''
        },

        timeout: 120000
    }
});
