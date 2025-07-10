/* global Ext */

Ext.define('testextjs.model.BonLivraison', {
    extend: 'Ext.data.Model',
    fields: [
        {
            name: 'lg_BON_LIVRAISON_ID',
            type: 'string'
        },
        {
            name: 'str_REF_LIVRAISON',
            type: 'string'
        },
        {
            name: 'int_NBRE_LIGNE_BL_DETAIL',
            type: 'string'
        },
        {
            name: 'lg_GROSSISTE_ID',
            type: 'string'
        },
        // dt_DATE_LIVRAISON
        {
            name: 'dt_DATE_LIVRAISON',
            type: 'string'
        },
        // str_REF_ORDER
        {
            name: 'str_REF_ORDER',
            type: 'string'
        },
        {
            name: 'str_GROSSISTE_LIBELLE',
            type: 'string'
        },
        {
            name: 'str_FAMILLE_ITEM',
            type: 'string'
        }, {
            name: 'int_NBRE_PRODUIT',
            type: 'string'
        }, {
            name: 'PRIX_ACHAT_TOTAL',
            type: 'string'
        }, {
            name: 'PRIX_VENTE_TOTAL',
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
            name: 'dt_CREATED',
            type: 'string'
        }
        
        , 
        {
            name: 'int_MHT',
            type: 'string'
        },
        {
            name: 'int_TVA',
            type: 'string'
        }, 
        {
            name: 'int_HTTC',
            type: 'string'
        },
        {
            name: 'lg_USER_ID',
            type: 'string'
        },
        {
            name: 'DISPLAYFILTER',
            type: 'boolean'
        }, {
            name: 'directImport',
            type: 'boolean'
        }
        
    ]
});
