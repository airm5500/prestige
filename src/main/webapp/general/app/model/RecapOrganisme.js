/* global Ext */

Ext.define('testextjs.model.RecapOrganisme', {
    extend: 'Ext.data.Model',
    idProperty: 'id',
    fields: [
        {name: 'id', type: 'int'},
        {name: 'TYPEORGANISME', type: 'string'},
        {name: 'CODEORGANISME', type: 'string'},
        {name: 'NUMORGANISME', type: 'string'},
        {name: 'COMPTECOMPTABLE', type: 'string'},
        {name: 'MONTANTOP', type: 'float'},
        {name: 'MONTANTSOLDE', type: 'float'},
        {name: 'FULNAME', type: 'string'},
        {name: 'CREDIT', type: 'string'},
        {name: 'GROUPE', type: 'string'}
        
       
    ]
});

