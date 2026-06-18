/* global Ext */

Ext.define('testextjs.model.AbcProduit', {
    extend: 'Ext.data.Model',
    fields: [
        {name: 'produitId', type: 'string'},
        {name: 'cip', type: 'string'},
        {name: 'ean', type: 'string'},
        {name: 'libelle', type: 'string'},
        {name: 'classe', type: 'string'},
        {name: 'famille', type: 'string'},
        {name: 'rayon', type: 'string'},
        {name: 'codeGeoArticle', type: 'string'},
        {name: 'grossisteId', type: 'string'},
        {name: 'stockDisponible', type: 'int'},
        {name: 'seuilMini', type: 'int'},
        {name: 'quantiteReappro', type: 'int'},
        {name: 'quantiteVendue', type: 'number'},
        {name: 'chiffreAffaires', type: 'number'},
        {name: 'marge', type: 'number'},
        {name: 'partPourcentage', type: 'number'},
        {name: 'cumulPourcentage', type: 'number'},
        {name: 'q1', type: 'int'},
        {name: 'q2', type: 'int'},
        {name: 'q3', type: 'int'},
        {name: 'uniteCalcul', type: 'string'}
    ]
});
