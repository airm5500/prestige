/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/* global Ext */

Ext.define('testextjs.model.promotions.PromotionProduct', {
    extend: 'Ext.data.Model',
    fields: [
        {name: 'lg_FAMILLE_ID', type: 'string'},
        {name: 'lg_GROSSISTE_ID', type: 'string'},
        {name: 'str_NAME', type: 'string'},
        {name: 'str_DESCRIPTION', type: 'string'},
        {name: 'int_CIP', type: 'string'},
        {name: 'int_PRICE', type: 'double'},
        {name: 'int_DISCOUNT', type: 'string'},
        {name: 'bl_MODE', type: 'boolean'},
        {name: 'int_PROMOTION_PRICE', type: 'double'},
        {name: 'int_ORIGINAL_PRICE', type: 'double'},
        {name: 'int_PACK_NUMBER', type: 'int'},
        {name: 'int_ACTIVE_AT', type: 'int'},
        // demande du 07/11 : A_PARTIR (une seule fois) ou PALIER (a chaque palier)
        {name: 'str_MODE_UG', type: 'string'}

    ]
});


