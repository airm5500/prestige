/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


/* global Ext */

Ext.define('testextjs.model.caisse.ItemAjust', {
    extend: 'Ext.data.Model',
    idProperty: 'lgAJUSTEMENTDETAILID',
    fields: [

        {
            name: 'lgAJUSTEMENTDETAILID',
            type: 'string'
        },
        {
            name: 'lgFAMILLEID',
            type: 'string'
        }, {
            name: 'heure',
            type: 'string'
        },
        {
            name: 'intCIP',
            type: 'string'
        },
        {
            name: 'strNAME',
            type: 'string'
        },
        {
            name: 'numLot',
            type: 'string'
        },
        {
            name: 'intNUMBER',
            type: 'number'
        },
        {
            name: 'intPRICE',
            type: 'number'
        },
        {
            name: 'intPAF',
            type: 'number'
        },
        {
            name: 'intNUMBERCURRENTSTOCK',
            type: 'number'
        },
        {
            name: 'intNUMBERAFTERSTOCK',
            type: 'number'
        },
        {
            name: 'montantTotal',
            type: 'number'
        },
         {
            name: 'montantVente',
            type: 'number'
        }


    ]
});
