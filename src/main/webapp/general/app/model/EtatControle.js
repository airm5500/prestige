/* global Ext */

Ext.define('testextjs.model.EtatControle', {
    extend: 'Ext.data.Model',
    fields: [
        {
            name: 'IDGROSSISTE',
            type: 'string'
        },
        {
            name: 'str_GROSSISTE_LIBELLE',
            type: 'string'
        },
        {
            name: 'int_CIP',
            type: 'string'
        },
        {
            name: 'str_NAME',
            type: 'string'
        },
        {
            name: 'str_REF_ORDER',
            type: 'string'
        },
        
        {
            name: 'int_MHT',
            type: 'string'
        },
        {
            name: 'str_REF_LIVRAISON',
            type: 'string'
        },
        {
            name: 'dt_DATE_LIVRAISON',
            type: 'string'
        },
        {
            name: 'int_HTTC',
            type: 'string'
        },
        {
            name: 'int_BL_NUMBER',
            type: 'string'
        },
        {
            name: 'dt_CREATED',
            type: 'string'
        },
        {
            name: 'int_NUMBER',
            type: 'String'
        },
        {
            name: 'int_QTE_CMD',
            type: 'String'
        },
        {
            name: 'dt_ENTREE_STCK',
            type: 'String'
        },
        {
            name: 'lg_USER_ID',
            type: 'String'
        },
        {
            name: 'int_TVA',
            type: 'int'
        },
        {
            name: 'int_BL_PRICE',
            type: 'int'
        },
        {
            name: 'int_ORDER_PRICE',
            type: 'int'
        },
        {
            name: 'int_QTE_CMDE',
            type: 'int'
        },
        {
            name: 'dt_UPDATED',
            type: 'String'
        },
        {
            name: 'str_BL_REF',
            type: 'String'
        },
        
        {
            name: 'str_FAMILLE_ITEM',
            type: 'String'
        },
        {
            name: 'lg_BON_LIVRAISON_ID',
            type: 'String'
        },
        {
            name: 'str_LIBELLE',
            type: 'String'
        },
        {
            name: 'str_ORDER_REF',
            type: 'String'
        },{
            name: 'bl_SELECTED',
            type: 'boolean'
        },
        {
            name: 'int_AMOUNT_AVOIR',
            type: 'int'
        },
        {
            name:'RETURN_FULL_BL',type:'boolean'
        }
    ]
});
