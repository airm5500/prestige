Ext.define('testextjs.model.Order', {
    extend: 'Ext.data.Model',
    fields: [
        {
            name: 'lg_ORDER_ID',
            type: 'string'
        },
        {
            name: 'str_REF_ORDER',
            type: 'string'
        },
        // PRIX_ACHAT_TOTAL
        {
            name: 'PRIX_ACHAT_TOTAL',
            type: 'string'
        },
        //PRIX_VENTE_TOTAL
        {
            name: 'PRIX_VENTE_TOTAL',
            type: 'string'
        },
        //str_FAMILLE_ITEM
        {
            name: 'str_FAMILLE_ITEM',
            type: 'string'
        },
        // int_NBRE_PRODUIT
        {
            name: 'int_NBRE_PRODUIT',
            type: 'string'
        },
        {
            name: 'int_LINE',
            type: 'string'
        },
        {
            name: 'lg_GROSSISTE_ID',
            type: 'string'
        },
        {
            name: 'str_GROSSISTE_LIBELLE',
            type: 'string'
        },
        {
            name: 'str_GROSSISTE_TELEPHONE',
            type: 'string'
        },
        {
            name: 'str_GROSSISTE_MOBILE',
            type: 'string'
        },
        {
            name: 'str_GROSSISTE_URLPHARMAML',
            type: 'string'
        },
        {
            name: 'str_GROSSISTE_URLEXTRANET',
            type: 'string'
        },
        // str_STATUT
        {
            name: 'str_STATUT',
            type: 'string'
        },
        {
            name: 'dt_CREATED',
            type: 'string'
        },
        //dt_UPDATED
        {
            name: 'dt_UPDATED',
            type: 'string'
        },
        {
            name: 'lg_USER_ID',
            type: 'string'
        },
        {name: 'isChecked', type: 'boolean'},
        /* Retours du 08/10 : statut du dernier envoi PharmaML */
        {name: 'str_ENVOI_PHARMAML', type: 'string'},
        {name: 'dt_ENVOI_PHARMAML', type: 'string'},
        {name: 'str_ENVOI_PHARMAML_DETAIL', type: 'string'}

    ]
});
