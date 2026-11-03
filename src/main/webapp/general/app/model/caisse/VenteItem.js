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
        },
        {
            /* cas 3 du 03/11/2026 : produit de l'ordonnancier (soumis a ordonnance + code tableau, ou sensible) */
            name: 'scheduled',
            type: 'boolean'
        },
        {
            name: 'sensible',
            type: 'boolean'
        },
        {
            name: 'codeTableau',
            type: 'string'
        },
        {
            /* « Ordonnancier », « Sensible » ou vide : calcule par le serveur, une seule regle */
            name: 'motif',
            type: 'string'
        },
        {
            name: 'promotion',
            type: 'boolean'
        },
        {
            name: 'unitesOffertes',
            type: 'number'
        }



    ]
});
