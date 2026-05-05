/* global Ext */

Ext.define('testextjs.model.groupFactureModel', {
    extend: 'Ext.data.Model',
    fields: [
         {
            name: 'lg_GROUPE_ID',
            type: 'string'
        },
        {
            name: 'str_LIB',
            type: 'string'
        },
        {
            name: 'NBFACTURES',
            type: 'int'
        },
        {
            name: 'AMOUNT',
            type: 'number'
        },
        {
            name: 'CODEFACTURE',
            type: 'string'
        }
        ,{
            name: 'DATECREATION',
            type: 'string'
        }
        ,{
            name: 'STATUT',
            type: 'string'
        }
        ,{
            name: 'ids',
            type: 'string'
        },
        {
            name: 'MONTANTRESTANT',
            type: 'number'
        },
        {
            name: 'AMOUNTPAYE',
            type: 'number'
        },
         {
            name: 'ACTION_REGLER_FACTURE',
            type: 'boolean'
        }
    ]
});



