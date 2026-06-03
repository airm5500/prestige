Ext.define('testextjs.model.FamilleStock', {
    extend: 'Ext.data.Model',
    fields: [
        {
            name: 'lg_FAMILLE_ID',
            type: 'string'
        },
        {
            name: 'lg_FAMILLEARTICLE_ID',
            type: 'string'
        },
        {
            name: 'str_CODE_TVA',
            type: 'string'
        },
        {
            name: 'lg_CODE_TVA_ID',
            type: 'string'
        },
        {
            name: 'lg_ZONE_GEO_ID',
            type: 'string'
        },
        {
            name: 'int_CIP',
            type: 'string'
        },
        {
            name: 'str_CODE_TAUX_REMBOURSEMENT',
            type: 'string'
        },
        {
            name: 'int_NUMBER',
            type: 'int'
        },
        {
            name: 'int_STOCK_REAPROVISONEMENT',
            type: 'int'
        },
        {
            name: 'dt_PEREMPTION',
            type: 'string'
        }, {
            name: 'dt_ENTREE',
            type: 'string'
        },
        
        
        {
            name: 'str_TYPE_TRANSACTION',
            type: 'string'
        },
        {
            name: 'str_STATUT',
            type: 'string'
        },
        {
            name: 'dt_UPDATED',
            type: 'string'
        },
        {
            name: 'str_NAME',
            type: 'string'
        },
        {
            name: 'lg_USER_ID',
            type: 'string'
        },
        {
            name: 'int_NUMBER_ENTREE',
            type: 'int'
        }
        ,
        {
            name: 'int_NUMBER_SORTIE',
            type: 'int'
        },
        {
            name: 'int_PRICE',
            type: 'int'
        },
        {
            name: 'lg_GROSSISTE_ID',
            type: 'string'
        }
        ,
        {
            name: 'str_STATUT',
            type: 'string'
        },
        {
            name: 'lg_WAREHOUSE_ID',
            type: 'string'
        }
        ,
        {
            name: 'etat',
            type: 'string'
        },
        {
            name: 'lg_CODE_ACTE_ID',
            type: 'string'
        },
        {
            name: 'int_TAUX_MARQUE',
            type: 'string'
        }
        ,
        {
            name: 'int_NUM_LOT',
            type: 'string'
        }
        ,
        {
            name: 'int_VALUE1',
            type: 'string'
        },
        {
            name: 'int_VALUE2',
            type: 'string'
        },
        {
            name: 'int_VALUE3',
            type: 'string'
        },
        {
            name: 'int_VALUE0',
            type: 'string'
        },
        {
            name: 'int_NUMBER_VENTE',
            type: 'int'
        },
        {
            name: 'int_NUMBER_RETOUR',
            type: 'int'
        },
        {
            name: 'int_NUMBER_PERIME',
            type: 'int'
        },
        {
            name: 'int_NUMBER_INVENTAIRE',
            type: 'int'
        },
        {
            name: 'int_NUMBER_BON',
            type: 'int'
        },
        {
            name: 'int_NUMBER_CMDE',
            type: 'int'
        },
        {
            name: 'dt_DAY',
            type: 'string'
        },
        {
            name: 'int_NUMBER_DEBUT',
            type: 'string'
        },
        {
            name: 'str_ACTION',
            type: 'string'
        },
        {
            name: 'lg_AJUSTEMENTDETAIL_ID',
            type: 'string'
        },
        {
            name: 'int_NUMBER_AJUSTEMENT_OUT',
            type: 'int'
        },
        {
            name: 'int_NUMBER_AJUSTEMENT_IN',
            type: 'int'
        }, {
            name: 'int_NUMBER_DECONDITIONNEMENT_IN',
            type: 'int'
        },
        {
            name: 'int_NUMBER_DECONDITIONNEMENT_OUT',
            type: 'int'
        },
        {
            name: 'int_NUMBER_ANNULEVENTE',
            type: 'int'
        },
        {
            name: 'dt_LAST_ENTREE',
            type: 'string'
        },
        {
            name: 'dt_LAST_VENTE',
            type: 'string'
        },
        {
            name: 'dt_LAST_INVENTAIRE',
            type: 'string'
        },
        {
            name: 'CODEEMPLACEMENT',
            type: 'string'
        },
        {
            name: 'int_STOCK',
            type: 'int'
        },
        {
            name: 'afficherStock',
            type: 'boolean'
        },
        {
            name: 'int_STOCK_RAYON',
            type: 'int'
        },
        {
            name: 'int_STOCK_RESERVE',
            type: 'int'
        },
        {
            name: 'int_SEUIL_RESERVE',
            type: 'int'
        },
        {
            name: 'int_SEUIL_MINI_RAYON'
        },
        {
            name: 'int_SEUIL_DYNAMIQUE',
            type: 'int'
        },
        {
            name: 'int_QTE_SUGGEREE',
            type: 'int'
        },
        {
            name: 'bool_RESERVE',
            type: 'boolean'
        }

    ]

});

