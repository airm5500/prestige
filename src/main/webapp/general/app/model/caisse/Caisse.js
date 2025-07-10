/* global Ext */

Ext.define('testextjs.model.caisse.Caisse', {
    extend: 'Ext.data.Model',
      idProperty: 'id',
    fields: [
        {
            name: 'id',
            type: 'number'
        },
        {
            name: 'typeMouvement',
            type: 'string'
        },
        {
            name: 'reference',
            type: 'string'
        },
        {
            name: 'operateur',
            type: 'string'
        },
        {
            name: 'modeReglement',
            type: 'string'
        },
        {
            name: 'client',
            type: 'string'
        },
        {
            name: 'taskDate',
            type: 'string'
        },
        {
            name: 'montant',
            type: 'number'
        },
        {
            name: 'numeroComptable',
            type: 'string'
        },
        {
            name: 'taskHeure',
            type: 'string'
        },
        {
            name: 'heure',
            type: 'number'
        },
        {
            name: 'credit',
            type: 'number'
        },
         {
            name: 'taskHeure',
            type: 'string'
        },
         {
            name: 'items',
            type: 'string'
        }

    ]
});
