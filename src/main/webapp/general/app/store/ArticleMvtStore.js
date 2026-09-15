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
            dtEnd: '',
            // Vide = pas de filtre (le serveur traite de la meme facon la valeur 'ALL').
            typeMvt: '',
            emplacementId: '',
            familleId: ''
        },

        timeout: 120000
    }
});
