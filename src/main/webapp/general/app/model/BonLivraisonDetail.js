Ext.define('testextjs.model.BonLivraisonDetail', {
    extend: 'Ext.data.Model',
    fields: [
        {
            name: 'lg_BON_LIVRAISON_DETAIL',
            type: 'string'
        },
        {
            name: 'lg_GROSSISTE_ID',
            type: 'string'
        },
        {
            name: 'lg_GROSSISTE_NAME',
            type: 'string'
        },
        {
            name: 'lg_FAMILLE_ID',
            type: 'string'
        },
        // lg_FAMILLE_NAME
        {
            name: 'lg_FAMILLE_NAME',
            type: 'string'
        },
        // lg_FAMILLE_CIP
        {
            name: 'lg_FAMILLE_CIP',
            type: 'string'
        },
        // int_QTE_MANQUANT
        {
            name: 'int_QTE_MANQUANT',
            type: 'string'
        },
        // int_SEUIL
        {
            name: 'int_SEUIL',
            type: 'string'
        },
        // lg_FAMILLE_QTE_STOCK
        {
            name: 'lg_FAMILLE_QTE_STOCK',
            type: 'string'
        },
        {
            name: 'lg_BON_LIVRAISON_ID',
            type: 'string'
        }, {
            name: 'int_QTE_CMDE',
            type: 'string'
        }, {
            name: 'int_QTE_RECUE',
            type: 'string'
        }, {
            name: 'dt_DATE_PEREMPTION',
            type: 'string'
        }, {
            name: 'int_PRIX_REFERENCE',
            type: 'string'
        }, {
            name: 'str_LIVRAISON_ADP',
            type: 'string'
        }, {
            name: 'str_MANQUE_FORCES',
            type: 'string'
        },
        {
            name: 'str_ETAT_ARTICLE',
            type: 'string'
        }, {
            name: 'int_PRIX_VENTE',
            type: 'string'
        },
        //dbl_PRIX_MOYEN_PONDERE
        {
            name: 'dbl_PRIX_MOYEN_PONDERE',
            type: 'string'
        },
        {
            name: 'int_PAF',
            type: 'string'
        },
        {
            name: 'int_PA_REEL',
            type: 'string'
        }, {
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
        // str_REF_ORDER
        {
            name: 'str_REF_ORDER',
            type: 'string'
        },
        {
            name: 'str_REF_LIVRAISON',
            type: 'string'
        },
        // int_PRIX_VENTE
        {
            name: 'int_PRIX_VENTE',
            type: 'string'
        },
        // lg_FAMILLE_PRIX_VENTE
        {
            name: 'lg_FAMILLE_PRIX_VENTE',
            type: 'string'
        },
        {
            name: 'lg_FAMILLE_PRIX_ACHAT',
            type: 'string'
        },
        // lg_FAMILLE_PRIX_ACHAT
        //dt_DATE_LIVRAISON
        {
            name: 'dt_DATE_LIVRAISON',
            type: 'string'
        },
        {
            name: 'bool_DECONDITIONNE',
            type: 'string'
        }
        ,
        {
            name: 'bool_DECONDITIONNE_EXIST',
            type: 'string'
        }
        ,
        {
            name: 'lg_FAMILLE_DECONDITION_ID',
            type: 'string'
        },
        {
            name: 'str_DESCRIPTION_DECONDITION',
            type: 'string'
        },
        {
            name: 'int_NUMBER_AVAILABLE_DECONDITION',
            type: 'string'
        },
        {
            name: 'int_CIP',
            type: 'string'
        }
        ,
        {
            name: 'int_NUMBERDETAIL',
            type: 'int'
        }
        // lg_ZONE_GEO_ID
        ,
        {
            name: 'lg_ZONE_GEO_ID',
            type: 'string'
        },
        // lg_ZONE_GEO_NAME
        {
            name: 'lg_ZONE_GEO_NAME',
            type: 'string'
        }

        ,
        // str_CODE_ARTICLE
        {
            name: 'str_CODE_ARTICLE',
            type: 'string'
        },
        {
            name: 'int_QTE_RECUE_BIS',
            type: 'int'
        },
        {
            name: 'checkExpirationdate',
            type: 'boolean'
        },
        {
            name: 'DISPLAYFILTER',
            type: 'boolean'
        },
        {
            name: 'int_QTE_RECUE_REEL',
            type: 'int'
        },
        {
            name: 'int_QTYCMDE',
            type: 'number'
        }
        , {
            name: 'intQTERECUE',
            type: 'int'
        },
        {
            name: 'prixDiff',
            type: 'boolean'
        },
        {
            name: 'hasLots',
            type: 'boolean'
        },
        {
            name: 'existLots',
            type: 'boolean'
        }

        ,
        {
            name: 'freeQty',
            type: 'number'
        },
        {
            name: 'datePeremption',
            type: 'string'
        },
        {
            name: 'lots',
            type: 'string'
        }
        ,
        {
            name: 'quantiteSaisie',
            type: 'number'
        }
    ]
});
