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
            name: 'promotion',
            type: 'boolean'
        },
        {
            name: 'unitesOffertes',
            type: 'number'
        },
        {
            /* cas 2 du 03/11 : [{tpId, compteTpId, libelle, valeur, taux, type, defaut, prixReferenceId}] par
             * tiers-payant de la vente ; absent (null) quand KEY_PRIX_REF_CAISSE vaut 0 ou hors vente assurance */
            name: 'referencesTp',
            type: 'auto',
            defaultValue: null
        }



    ]
});
