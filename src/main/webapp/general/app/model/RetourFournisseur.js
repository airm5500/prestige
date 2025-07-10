Ext.define('testextjs.model.RetourFournisseur', {
    extend: 'Ext.data.Model',
    fields: [
        {
            name: 'lg_RETOUR_FRS_ID',
            type: 'string'
        },
        // str_REF_RETOUR_FRS
        {
            name: 'str_REF_RETOUR_FRS',
            type: 'string'
        },
        {
            name: 'lg_BON_LIVRAISON_ID',
            type: 'string'
        },
        // str_REF_LIVRAISON
        {
            name: 'str_REF_LIVRAISON',
            type: 'string'
        },
        {
            name: 'lg_GROSSISTE_ID',
            type: 'string'
        },
        // str_GROSSISTE_LIBELLE
        {
            name: 'str_GROSSISTE_LIBELLE',
            type: 'string'
        },
        // int_LINE
        {
            name: 'int_LINE',
            type: 'string'
        },
        // str_FAMILLE_ITEM
        {
            name: 'str_FAMILLE_ITEM',
            type: 'string'
        },
        {
            name: 'dt_DATE',
            type: 'string'
        },
        {
            name: 'str_REPONSE_FRS',
            type: 'string'
        },
        {
            name: 'str_COMMENTAIRE',
            type: 'string'
        },
        {
            name: 'str_STATUT',
            type: 'string'
        },
        {
            name: 'dt_CREATED',
            type: 'string'
        },
        {
            name: 'dt_UPDATED',
            type: 'string'
        },
        {
            name: 'lg_USER_ID',
            type: 'string'
        },
        {
            name: 'lg_EMPLACEMENT_ID',
            type: 'string'
        },
         {
             name: 'BTNDELETE', 
             type: 'boolean'
        },
        {
             name: 'MONTANTRETOUR', 
             type: 'float'
        },
        {
             name: 'DATEBL', 
             type: 'string'
        },
        {
             name: 'int_TOTAL_PRODUCT', 
             type: 'string'
        },
        {
             name: 'int_TOTAL_AMOUNT', 
             type: 'string'
        },
        {
             name: 'bool_PENDING', 
             type: 'boolean'
        },
        { 
             name: 'bool_SAME_LOCATION', 
             type: 'boolean'
        },
        { 
             name: 'USEREMPLACEMENT', 
             type: 'string'
        },
        
         { 
             name: 'closed', 
             type: 'boolean'
        }
        
        

    ]
});

