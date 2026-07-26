/* global Ext */

Ext.define('testextjs.model.Client', {
    extend: 'Ext.data.Model',
    fields: [
        {
            name: 'lg_CLIENT_ID',
            type: 'string'
        },
        {
            name: 'str_CODE_INTERNE',
            type: 'string'
        },
        {
            name: 'str_FIRST_NAME',
            type: 'string'
        },
        {
            name: 'str_LAST_NAME',
            type: 'string'
        },

        {
            name: 'str_FIRST_LAST_NAME',
            type: 'string'
        },
        {
            name: 'str_NUMERO_SECURITE_SOCIAL',
            type: 'string'
        },
        {
            name: 'dt_NAISSANCE',
            type: 'string'
        }, {
            name: 'dbl_SOLDE',
            type: 'string'
        }, {
            name: 'dbl_SOLDE_BIS',
            type: 'int'
        },
        {
            name: 'str_SEXE',
            type: 'string'
        },
        {
            name: 'str_ADRESSE',
            type: 'string'
        },
        {
            name: 'str_DOMICILE',
            type: 'string'
        },
        {
            name: 'str_AUTRE_ADRESSE',
            type: 'string'
        },
        {
            name: 'str_CODE_POSTAL',
            type: 'string'
        },
        {
            name: 'str_COMMENTAIRE',
            type: 'string'
        },
        {
            name: 'lg_VILLE_ID',
            type: 'string'
        }, {
            name: 'lg_MEDECIN_ID',
            type: 'string'
        }, {
            name: 'str_STATUT',
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
            name: 'lg_TYPE_CLIENT_ID',
            type: 'string'
        }
        ,
        {
            name: 'dbl_SOLDE',
            type: 'double'
        }
        ,
        {
            name: 'dbl_CAUTION',
            type: 'double'
        }
        ,
        {
            name: 'dbl_QUOTA_CONSO_MENSUELLE',
            type: 'double'
        },
        {
            name: 'dbl_QUOTA_CONSO_VENTE',
            type: 'double'
        },
        {
            name: 'lg_COMPTE_CLIENT_ID',
            type: 'string'
        },
        {
            name: 'lg_AYANTS_DROITS_ID',
            type: 'string'
        }
        ,
        {
            name: 'lg_CATEGORIE_AYANTDROIT_ID',
            type: 'string'
        },
        {
            name: 'lg_RISQUE_ID',
            type: 'string'
        },
        {
            name: 'str_FULLNAME',
            type: 'string'
        },
        {
            name: 'lg_TYPE_TIERS_PAYANT_ID',
            type: 'string'
        },
        {
            name: 'lg_TIERS_PAYANT_ID',
            type: 'string'
        },
        {
            // Nombre de tiers payants ACTIFS du client (principal + complementaires)
            name: 'int_NOMBRE_TIERS_PAYANT',
            type: 'int'
        },
        {
            // Liste des tiers payants actifs (separes par |), transmise seulement s'il y en a plusieurs
            name: 'str_LISTE_TIERS_PAYANT',
            type: 'string'
        },
        {
            name: 'int_POURCENTAGE',
            type: 'int'
        },
        {
            name: 'int_PRIORITY',
            type: 'int'
        }, {
            name: 'str_PHONE',
            type: 'string'
        }, {
            name: 'dbl_total_differe',
            type: 'int'
        },
        {name: 'BTNDELETE', type: 'boolean'},
        {name: 'lg_CATEGORY_CLIENT_ID', type: 'string'},
        {name: 'lg_COMPANY_ID', type: 'string'},

        {name: 'dbl_PLAFOND', type: 'number'},
        {name: 'db_PLAFOND_ENCOURS', type: 'number'},
        {name: 'b_IsAbsolute', type: 'boolean'},
        {
            name: 'remiseId',
            type: 'string'
        },
         {name: 'P_BTN_DESACTIVER_CLIENT', type: 'boolean'}
        



    ]
});
