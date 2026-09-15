Ext.define('testextjs.model.ArticleMvt', {
    extend: 'Ext.data.Model',
    fields: [
        { name: 'lgFamilleId', type: 'string' },
        { name: 'codeCip',     type: 'string' },
        { name: 'strName',     type: 'string' },
        { name: 'prixVente',   type: 'int'    },
        { name: 'prixAchat',   type: 'int'    },
        { name: 'emplacement', type: 'string' },
        { name: 'famille',     type: 'string' },
        // Types de mouvement rencontres sur la periode, concatenes : la grille
        // reste a une ligne par article.
        { name: 'typesMvt',    type: 'string' }
    ],
    idProperty: 'lgFamilleId'
});
