/* global Ext */

Ext.define('testextjs.model.Famille', {
    extend: 'Ext.data.Model',
    fields: [
        {
            name: 'lg_FAMILLE_ID',
            type: 'string'
        },
        {
            name: 'bl_PROMOTED',
            type: 'boolean'
        },
        {
            name: 'lg_FAMILLEARTICLE_ID',
            type: 'string'
        },
        {
            name: 'lg_TYPEETIQUETTE_ID',
            type: 'string'
        },
        {
            name: 'str_NAME',
            type: 'string'
        },
        {
            name: 'str_DESCRIPTION',
            type: 'string'
        },
        {
            name: 'int_PRICE',
            type: 'string'
        },
        {
            name: 'int_STOCK_REAPROVISONEMENT',
            type: 'string'
        },
        {
            name: 'str_STATUT',
            type: 'string'
        },
        {
            name: 'lg_GROSSISTE_ID',
            type: 'string'
        },
        {
            name: 'int_CIP',
            type: 'string'
        },
        {
            name: 'int_EAN13',
            type: 'string'
        },
        {
            name: 'int_S',
            type: 'string'
        },
        {
            name: 'int_T',
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
            name: 'int_PAF',
            type: 'string'
        },
        {
            name: 'int_PAT',
            type: 'string'
        }, {
            name: 'int_SEUIL_MIN',
            type: 'string'
        },
        {
            name: 'lg_CODE_ACTE_ID',
            type: 'string'
        },
        {
            name: 'lg_CODE_GESTION_ID',
            type: 'string'
        },
        {
            name: 'str_CODE_TVA',
            type: 'string'
        },
        {
            name: 'str_CODE_ETIQUETTE',
            type: 'string'
        },
        {
            name: 'str_CODE_REMISE',
            type: 'string'
        },
        {
            name: 'str_CODE_TAUX_REMBOURSEMENT',
            type: 'string'
        },
        {
            name: 'lg_ZONE_GEO_ID',
            type: 'string'
        },
        {
            name: 'int_NUMBER_AVAILABLE',
            type: 'string'
        },
        {
            name: 'int_TAUX_MARQUE',
            type: 'string'
        },
        {
            name: 'int_PRICE_TIPS',
            type: 'string'
        },
        {
            name: 'intPAF',
            type: 'int'
        },
        {
            name: 'int_PRICE_REF',
            type: 'string'
        },
        /*       ARNAUD      */

        {
            name: 'lg_FORME_ID',
            type: 'string'
        },
        {
            name: 'lg_FABRIQUANT_ID',
            type: 'string'
        },
        {
            name: 'dbl_LAST_PRIX_ACHAT',
            type: 'string'
        },
        {
            name: 'dbl_MARGE',
            type: 'string'
        },

        {
            name: 'dbl_MARGE_BRUTE',
            type: 'string'
        },
        {
            name: 'dbl_TAUX_MARGE',
            type: 'string'
        },
        {
            name: 'dbl_PRIX_MOYEN_PONDERE',
            type: 'string'
        },
        {
            name: 'str_CODE_TABLEAU',
            type: 'string'
        },
        {
            name: 'lg_TVA_ID',
            type: 'string'
        },
        {
            name: 'lg_ETAT_ARTICLE_ID',
            type: 'string'
        },
        {
            name: 'bool_RESERVE',
            type: 'string'
        },
        {
            name: 'bool_ETIQUETTE',
            type: 'string'
        },
        {
            name: 'int_UNITE_ACHAT',
            type: 'string'
        },
        {
            name: 'dbl_CONTENANCE_1000',
            type: 'string'
        },
        {
            name: 'dt_PEREMPTION',
            type: 'string'
        },
        {
            name: 'int_COMPTEUR_PEREMPTION',
            type: 'string'
        },
        {
            name: 'dt_DATE_LAST_ENTREE',
            type: 'string'
        },
        {
            name: 'dt_DATE_LAST_SORTIE',
            type: 'string'
        },
        {
            name: 'int_SEUIL_RESERVE',
            type: 'int'
        },
        {
            name: 'int_STOCK_RESERVE',
            type: 'int'
        },
        {
            name: 'int_NOMBRE_VENTES',
            type: 'string'
        },
        {
            name: 'int_QTE_MANQUANTE',
            type: 'string'
        },
        {
            name: 'int_QTE_RESERVEE',
            type: 'string'
        }, {
            name: 'int_UNITE_VENTE',
            type: 'string'
        },
        {
            name: 'dbl_COEF_SECURITE',
            type: 'string'
        },
        {
            name: 'int_QTE_REAPPROVISIONNEMENT',
            type: 'string'
        },
        {
            name: 'lg_INDICATEUR_REAPPROVISIONNEMENT_ID',
            type: 'string'
        },
        {
            name: 'int_DATE_BUTOIR',
            type: 'string'
        },
        {
            name: 'int_DELAI_REAPPRO',
            type: 'string'
        },
        {
            name: 'int_CONSO_MOIS',
            type: 'string'
        },
        {
            name: 'int_NBRE_UNITE_LAST_VENTE',
            type: 'string'
        },
        {
            name: 'int_NBRE_SORTIE',
            type: 'string'
        },
        {
            name: 'int_QTE_SORTIE',
            type: 'string'
        },
        {
            name: 'int_MOY_VENTE',
            type: 'string'
        },
        {
            name: 'int_QTEDETAIL',
            type: 'int'
        },
        {
            name: 'int_PRICE_DETAIL',
            type: 'int'
        },
        {
            name: 'bool_DECONDITIONNE',
            type: 'string'
        },
        {
            name: 'lg_INVENTAIRE_FAMILLE_ID',
            type: 'string'
        },
        {
            name: 'lg_INVENTAIRE_ID',
            type: 'string'
        },
        {
            name: 'bool_DECONDITIONNE',
            type: 'string'
        },
        {
            name: 'bool_DECONDITIONNE_EXIST',
            type: 'string'
        },
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
            type: 'int'
        },
        {
            name: 'int_NUMBERDETAIL',
            type: 'int'
        },
        {
            name: 'dt_LAST_INVENTAIRE',
            type: 'string'
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
            name: 'lg_CODE_TVA_ID',
            type: 'string'
        },
        {
            name: 'str_CODE',
            type: 'string'
        },
        {
            name: 'lg_REMISE_ID',
            type: 'string'
        },
        {
            name: 'is_select',
            type: 'boolean'
        },
        {
            name: 'lg_AJUSTEMENTDETAIL_ID',
            type: 'string'
        },
        {
            name: 'int_NUMBER',
            type: 'string'
        },
        {
            name: 'str_DESCRIPTION_PLUS',
            type: 'string'
        }
        ,
        {
            name: 'is_AUTHORIZE_STOCK',
            type: 'boolean'
        }
        ,
        {
            name: 'int_TAUX_MARQUE_PLUS',
            type: 'string'
        },
        {
            name: 'int_QTE_SORTIE_PLUS',
            type: 'string'
        },
        {
            name: 'CIP',
            type: 'string'
        },
        {
            name: 'MOUVEMENT',
            type: 'string'
        },
        {name: 'groupeby',
            type: 'string'
        },
        {name: 'BTNDELETE',
            type: 'boolean'
        },
        {
            name: 'lg_EMPLACEMENT_ID',
            type: 'string'

        },
        {
            name: 'checkExpirationdate',
            type: 'boolean'

        },
        {
            name: 'lg_PREENREGISTREMENT_ID',
            type: 'string'

        },
        {
            name: 'int_AVOIR',
            type: 'string'

        },
        {
            name: 'P_BT_UPDATE',
            type: 'boolean'

        },
        {
            name: 'P_UPDATE_PAF',
            type: 'boolean'

        },
        {
            name: 'P_UPDATE_PRIXVENTE',
            type: 'boolean'

        },
        {
            name: 'P_UPDATE_CODETABLEAU',
            type: 'boolean'

        },
        {
            name: 'P_UPDATE_CODEREMISE',
            type: 'boolean'

        },
        {
            name: 'P_UPDATE_CIP',
            type: 'boolean'

        },
        {
            name: 'P_UPDATE_DESIGNATION',
            type: 'boolean'

        },
        {
            name: 'STATUS',
            type: 'int'

        },
        {
            name: 'isChecked',
            type: 'boolean'

        },
        {
            name: 'dt_Peremtion',
            type: 'string'

        },
        {
            name: 'dt_delay',
            type: 'string'

        },
        {
            name: 'dtPEREMPTION',
            type: 'string'

        },
        {
            name: 'laboratoireId',
            type: 'string'

        },
        {
            name: 'gammeId',
            type: 'string'

        },
        {
            name: 'dt_DATE_LIVRAISON',
            type: 'string'

        },

        {name: 'intPRICE',
            type: 'int'},

        {name: 'PAF',
            type: 'int'},

        {name: 'intNUMBERAVAILABLE',
            type: 'int'},

        {name: 'bool_ACCOUNT',

            type: 'boolean'
        },

        {name: 'scheduled',

            type: 'boolean'
        },
        {name: 'ACTION_DESACTIVE_PRODUIT',

            type: 'boolean'
        },
        {name: 'cmu_price', type: 'int'},
        {name: 'produitState', type: 'auto'}

    ]
});
