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
        },
        {
            /* plan du 06/11, point 3.2 : « PROMOTION 5+1 OFFERT(S) », le texte du ticket, calcule par le serveur */
            name: 'mentionPromotion',
            type: 'string'
        },
        {
            /* option « par palier de » : la quantite saisie est celle des boites payees, les offertes s'y ajoutent */
            name: 'promotionPalier',
            type: 'boolean'
        },
        {
            /* cas 2 du 03/11 : [{tpId, compteTpId, libelle, valeur, taux, type, defaut, prixReferenceId}] par
             * tiers-payant de la vente ; absent (null) quand KEY_PRIX_REF_CAISSE vaut 0 ou hors vente assurance */
            name: 'referencesTp',
            type: 'auto',
            defaultValue: null
        },
        {
            /* cas 1 du 03/11 : ligne cochee « C » (au comptant) d'une vente assurance ; toujours false sans le
             * parametre KEY_LIGNE_COMPTANT_VO */
            name: 'comptant',
            type: 'boolean',
            defaultValue: false
        }



    ]
});
