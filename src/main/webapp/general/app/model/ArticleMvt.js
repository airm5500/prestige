Ext.define('testextjs.model.ArticleMvt', {
    extend: 'Ext.data.Model',
    fields: [
        { name: 'lgFamilleId', type: 'string' },
        { name: 'codeCip',     type: 'string' },
        { name: 'strName',     type: 'string' },
        { name: 'prixVente',   type: 'int'    },
        { name: 'prixAchat',   type: 'int'    }
    ],
    idProperty: 'lgFamilleId'
});
