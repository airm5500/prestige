/* global Ext */

Ext.define('testextjs.model.caisse.VenteItem', {
    extend: 'Ext.data.Model',
    idProperty: 'lgPREENREGISTREMENTDETAILID',
    fields: [
        {
            name: 'lgPREENREGISTREMENTDETAILID',
            type: 'string'
        },
        {
            name: 'lgPREENREGISTREMENTID',
            type: 'string'
        },
        {
            name: 'strNAME',
            type: 'string'
        },
        {
            name: 'strREF',
            type: 'string'
        },
        {
            name: 'lgFAMILLEID',
            type: 'string'
        },
        {
            name: 'intCIP',
            type: 'string'
        },
        {
            name: 'intEAN13',
            type: 'string'
        },
        {
            name: 'strSTATUT',
            type: 'string'
        },
        {
            name: 'intPRICEUNITAIR',
            type: 'number'
        },
        {
            name: 'intQUANTITY',
            type: 'number'
        },
        {
            name: 'intQUANTITYSERVED',
            type: 'number'
        },
        {
            name: 'intPRICE',
            type: 'number'
        },
        {
            name: 'calculationBasePrice',
            type: 'number'
        },
        {
            name: 'intAVOIR',
            type: 'number'
        },
        {
            name: 'bISAVOIR',
            type: 'boolean'
        },
        {
            name: 'BISAVOIR',
            type: 'boolean'
        }



    ]
});
