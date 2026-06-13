/* global Ext */

Ext.define('testextjs.model.GroupeModel', {
    extend: 'Ext.data.Model',
    fields: [
    {
        name: 'lg_GROUPE_ID',
        type: 'number'
    },
    {
        name: 'str_LIBELLE',
        type: 'string'
    },{
        name: 'lgGROUPEID',
        type: 'string'
    },
    {
        name: 'str_TELEPHONE',
        type: 'string'
    },
    {
        name: 'str_ADRESSE',
        type: 'string'
    },
    {
        name: 'str_MODE_TRI_FACTURE',
        type: 'string'
    }


   ]
});
