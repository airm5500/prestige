/* global Ext */

Ext.define('testextjs.model.Facture', {
    extend: 'Ext.data.Model',
    fields: [
        {
            name: 'lg_FACTURE_ID',
            type: 'string'
        },{
            name: 'lg_DOSSIER_ID',
            type: 'string'
        },{
            name: 'str_NUM_BON',
            type: 'string'
        }, {
            name: 'lg_CUSTOMER_ID',
            type: 'string'
        }, {
            name: 'str_LIBELLE',
            type: 'string'
        }, {
            name: 'int_NB_DOSSIER',
            type: 'string'
        }, {
            name: 'dbl_MONTANT_RESTANT',
            type: 'number'
        }, {
            name: 'dbl_MONTANT_PAYE',
            type: 'string'
        },
        {
            name: 'dbl_MONTANT_TOTAL',
            type: 'string'
        }, {
            name: 'dt_DATE_FACTURE',
            type: 'string'
        }, {
            name: 'dbl_MONTANT_CMDE',
            type: 'string'
        }, {
            name: 'str_CODE_FACTURE',
            type: 'string'
        }, {
            name: 'str_PERIODE',
            type: 'string'
        }, {
            name: 'str_CODE_COMPTABLE',
            type: 'string'
        }, {
            name: 'dt_DEBUT_FACTURE',
            type: 'string'
        }, {
            name: 'dt_FIN_FACTURE',
            type: 'string'
        }, {
            name: 'str_CUSTOMER',
            type: 'string'
        }
        , {
            name: 'str_CUSTOMER_NAME',
            type: 'string'
        }, {
            name: 'str_PERE',
            type: 'string'
        }, {
            name: 'lg_TYPE_FACTURE_ID',
            type: 'string'
        },
        {
            name: 'lg_PREENREGISTREMENT_COMPTE_CLIENT_PAYENT_ID',
            type: 'string'
        }, {
            name: 'str_NOM',
            type: 'string'
        }, {
            name: 'str_PRENOM',
            type: 'string'
        },
        {
            name: 'str_MATRICULE',
            type: 'string'
        },
        {
            name: 'str_NUM_DOSSIER',
            type: 'string'
        },
        {
            name: 'dt_ORD',
            type: 'string'
        }, {
            name: 'dt_DELI',
            type: 'string'
        }, {
            name: 'dbl_MONTANT',
            type: 'string'
        }, {
            name: 'dbl_MONTANT_ADHER',
            type: 'string'
        }, {
            name: 'dbl_MONTANT_MUT1',
            type: 'string'
        }, {
            name: 'dbl_MONTANT_MUT2',
            type: 'string'
        }, {
            name: 'dbl_MONTANT_ATT',
            type: 'string'
        },
        {
            name: 'str_STATUT',
            type: 'string'
        }, {
            name: 'dt_CREATED',
            type: 'string'
        },
        {
            name: 'dt_UPDATED',
            type: 'string'
        },
        {
            name: 'lg_BON_LIVRAISON_ID',
            type: 'string'
        },
        {
            name: 'str_REF_ORDER',
            type: 'string'
        },
        {
            name: 'dt_DATE_LIVRAISON',
            type: 'string'
        },
        {
            name: 'int_MHT',
            type: 'int'
        },
        {
            name: 'int_HTTC',
            type: 'int'
        },
        {
            name: 'int_TVA',
            type: 'int'
        }
        ,
        {
            name: 'lg_TYPE_TIERS_PAYANT_ID',
            type: 'string'
        },
        {
            name: 'MONTANTBRUT',
            type: 'string'
        },
        {
            name: 'MONTANTFORFETAIRE',
            type: 'string'
        },
        {
            name: 'MONTANTREMISE',
            type: 'string'
        },
        {name: 'BTNDELETE', type: 'boolean'},
        {
            name: 'MONTANTVERSEE',
            type: 'number'
        },
        {
            name: 'isChecked',
            type: 'boolean'
        },
        {
            name: 'MONTANTVIRTUEL',
            type: 'number'
        },
        {
            name: 'isALLOWED',
            type: 'boolean'
        },
        {
            name: 'CODEGROUPE',
            type: 'string'
        },
        {
            name: 'fneUrl',
            type: 'string'
        },
         {
            name: 'ACTION_REGLER_FACTURE',
            type: 'boolean'
        }
  
    ]
});
