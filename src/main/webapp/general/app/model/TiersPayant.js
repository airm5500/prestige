/* global Ext */

Ext.define('testextjs.model.TiersPayant', {
    extend: 'Ext.data.Model',
    fields: [
        {
            name: 'lg_TIERS_PAYANT_ID',
            type: 'string'
        },
        {
            name: 'lg_COMPTE_CLIENT_TIERS_PAYANT_ID',
            type: 'string'
        },
        {
            name: 'str_CLIENT',
            type: 'string'
        },
        {
            name: 'int_PRICE_VENTE',
            type: 'int'
        },
        {
            name: 'str_CODE_ORGANISME',
            type: 'string'
        },
        {
            name: 'str_NAME',
            type: 'string'
        },
        {
            name: 'str_FULLNAME',
            type: 'string'
        },
        {
            name: 'str_ADRESSE',
            type: 'string'
        },
        {
            name: 'str_MOBILE',
            type: 'string'
        },
        {
            name: 'str_TELEPHONE',
            type: 'string'
        },
        {
            name: 'int_POURCENTAGE',
            type: 'int'
        },
        {
            name: 'str_MAIL',
            type: 'string'
        },
        {
            name: 'dbl_PLAFOND_CREDIT',
            type: 'string'
        },
        {
            name: 'dbl_TAUX_REMBOURSEMENT',
            type: 'string'
        },
        {
            name: 'str_NUMERO_CAISSE_OFFICIEL',
            type: 'string'
        },
        {
            name: 'str_CENTRE_PAYEUR',
            type: 'string'
        },
        {
            name: 'str_CODE_REGROUPEMENT',
            type: 'string'
        },
        {
            name: 'dbl_SEUIL_MINIMUM',
            type: 'string'
        },
        {
            name: 'bool_INTERDICTION',
            type: 'string'
        },
        {
            name: 'str_CODE_COMPTABLE',
            type: 'string'
        },
        {
            name: 'bool_PRENUM_FACT_SUBROGATOIRE',
            type: 'string'
        },
        {
            name: 'int_NUMERO_DECOMPTE',
            type: 'string'
        },
        {
            name: 'str_CODE_PAIEMENT',
            type: 'string'
        },
        {
            name: 'dt_DELAI_PAIEMENT',
            type: 'string'
        },
        {
            name: 'dbl_POURCENTAGE_REMISE',
            type: 'string'
        },
        {
            name: 'dbl_REMISE_FORFETAIRE',
            type: 'string'
        },
        {
            name: 'str_CODE_EDIT_BORDEREAU',
            type: 'string'
        },
        {
            name: 'int_NBRE_EXEMPLAIRE_BORD',
            type: 'string'
        },
        {
            name: 'int_PERIODICITE_EDIT_BORD',
            type: 'string'
        },
        {
            name: 'int_DATE_DERNIERE_EDITION',
            type: 'string'
        },
        {
            name: 'str_NUMERO_IDF_ORGANISME',
            type: 'string'
        },
        {
            name: 'dbl_MONTANT_F_CLIENT',
            type: 'string'
        },
        {
            name: 'dbl_BASE_REMISE',
            type: 'string'
        },
        {
            name: 'str_CODE_DOC_COMPTOIRE',
            type: 'string'
        },
        {
            name: 'bool_ENABLED',
            type: 'string'
        },
        {
            name: 'lg_VILLE_ID',
            type: 'string'
        },
        {
            name: 'lg_TYPE_TIERS_PAYANT_ID',
            type: 'string'
        },
        {
            name: 'lg_TYPE_CONTRAT_ID',
            type: 'string'
        },
        {
            name: 'lg_REGIMECAISSE_ID',
            type: 'string'
        },
        {
            name: 'lg_RISQUE_ID',
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
            name: 'str_STATUT',
            type: 'string'
        },
        {
            name: 'str_PHOTO',
            type: 'string'
        },
        {
            name: 'isChecked',
            type: 'boolean'
        },
        {
            name: 'lg_MODEL_FACTURE_ID',
            type: 'string'
        },
        {
            name: 'str_FAMILLE_ITEM',
            type: 'string'
        },
        {
            name: 'dbl_CAUTION',
            type: 'int'
        },
        {
            name: 'dbl_QUOTA_CONSO_MENSUELLE',
            type: 'int'
        },
        {
            name: 'int_NUMBER_CLIENT',
            type: 'int'
        }, {name: 'BTNDELETE', type: 'boolean'}
        , {name: 'groupingByTaux', type: 'boolean'},
        {
            name: 'str_CODE_OFFICINE',
            type: 'string'
        },
        {
            name: 'str_REGISTRE_COMMERCE',
            type: 'string'
        }, {
            name: 'str_COMPTE_CONTRIBUABLE',
            type: 'string'
        }, {
            name: 'dbl_PLAFOND',
            type: 'double'
        }, {
            name: 'dbl_QUOTA_CONSO_MENSUELLE',
            type: 'double'
        }, {
            name: 'dbl_PLAFOND_CONSO_DIFFRERENCE',
            type: 'double'
        }, {
            name: 'dbl_PLAFOND_CLIENT',
            type: 'double'
        }, {
            name: 'dbl_QUOTA_CONSO_MENSUELLE_CLIENT',
            type: 'double'
        }, {
            name: 'dbl_PLAFOND_CONSO_DIFFRERENCE_CLIENT',
            type: 'double'
        }, {
            name: 'dbl_QUOTA_CONSO_VENTE',
            type: 'double'
        }, {
            name: 'str_NUMERO_SECURITE_SOCIAL',
            type: 'string'
        },
        {
            name: 'b_IsAbsolute',
            type: 'boolean'
        }
        , {
            name: 'db_CONSOMMATION_MENSUELLE',
            type: 'number'
        }
        , {
            name: 'dbl_PLAFOND_CREDIT',
            type: 'number'
        },
        {
            name: 'b_CANBEUSE',
            type: 'boolean'
        },
        {
            name: 'lgGROUPEID',
            type: 'string'
        },
        {
            name: 'nbrbons',
            type: 'number'
        },
        {
            name: 'montantFact',
            type: 'number'
        },
        {name: 'P_BTN_DESACTIVER_TIERS_PAYANT', type: 'boolean'},
        {name: 'cmu', type: 'boolean'},
         {
            name: 'caution',
            type: 'int'
        }


    ]
});
