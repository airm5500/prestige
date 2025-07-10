/* global Ext */

Ext.define('testextjs.model.OrderDetail', {
    extend: 'Ext.data.Model',
    fields: [
        {
            name: 'lg_ORDERDETAIL_ID',
            type: 'string'
        },
        {
            name: 'lg_GROSSISTE_ID',
            type: 'string'
        },
        //lg_GROSSISTE_LIBELLE
        {
            name: 'lg_GROSSISTE_LIBELLE',
            type: 'string'
        },
        // int_PRICE
        {
            name: 'int_PRICE',
            type: 'string'
        },
        // bool_BL
        {
            name: 'bool_BL',
            type: 'string'
        },
        {
            name: 'lg_ORDER_ID',
            type: 'string'
        },
        {
            name: 'int_NUMBER',
            type: 'string'
        },
        {
            name: 'int_QTE_MANQUANT',
            type: 'string'
        }, {
            name: 'int_QTE_REP_GROSSISTE',
            type: 'int'
        },
        {
            name: 'int_QTE_LIVRE',
            type: 'string'
        },
        // int_SEUIL
        {
            name: 'int_SEUIL',
            type: 'string'
        },
        {
            name: 'lg_FAMILLE_ID',
            type: 'string'
        },
        {
            name: 'lg_FAMILLE_NAME',
            type: 'string'
        }
        ,
        {
            name: 'lg_FAMILLE_CIP',
            type: 'string'
        },
        {
            name: 'lg_FAMILLE_UNITE_VENTE',
            type: 'string'
        },
        // lg_FAMILLE_UNITE_ACHAT   
        {
            name: 'lg_FAMILLE_UNITE_ACHAT',
            type: 'string'
        },
        // lg_FAMILLE_QTE_STOCK
        {
            name: 'lg_FAMILLE_QTE_STOCK',
            type: 'string'
        },
        // str_STATUT
        {
            name: 'str_STATUT',
            type: 'string'
        },
        {
            name: 'dt_CREATED',
            type: 'string'
        },
        //dt_UPDATED
        {
            name: 'dt_UPDATED',
            type: 'string'
        },
        //lg_FAMILLE_PRIX_VENTE
        {
            name: 'lg_FAMILLE_PRIX_VENTE',
            type: 'string'
        },
        {
            name: 'lg_FAMILLE_PRIX_ACHAT',
            type: 'string'
        },
        // str_CODE_ARTICLE
        {
            name: 'str_CODE_ARTICLE',
            type: 'string'
        },
        {
            name: 'int_PAF',
            type: 'int'
        },
        {
            name: 'int_PRIX_REFERENCE',
            type: 'int'
        },
        {
            name: 'int_QTE_REASSORT',
            type: 'int'
        },

        //code ajouté
        {
            name: 'int_NUMBER_AVAILABLE',
            type: 'string'
        },
        {
            name: 'lg_CODE_GESTION_ID',
            type: 'string'
        },
        {
            name: 'int_STOCK_REAPROVISONEMENT',
            type: 'string'
        },
        {
            name: 'int_QTE_REAPPROVISIONNEMENT',
            type: 'string'
        },
        {
            name: 'str_CODE_REMISE',
            type: 'string'
        },
        {
            name: 'lg_TYPEETIQUETTE_ID',
            type: 'string'
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
            name: 'int_T',
            type: 'string'
        },
        {
            name: 'str_CODE_TAUX_REMBOURSEMENT',
            type: 'string'
        },
        {
            name: 'lg_CODE_ACTE_ID',
            type: 'string'
        },
        {
            name: 'int_TAUX_MARQUE',
            type: 'string'
        },
        {
            name: 'int_PAF',
            type: 'string'
        },
        {
            name: 'int_PAT',
            type: 'string'
        },
        {
            name: 'int_PRICE_TIPS',
            type: 'string'
        },
        {
            name: 'int_PRICE',
            type: 'string'
        },
        {
            name: 'lg_FAMILLEARTICLE_ID',
            type: 'string'
        },
        {
            name: 'lg_ZONE_GEO_ID',
            type: 'string'
        },
        {
            name: 'str_DESCRIPTION',
            type: 'string'
        },
        {
            name: 'int_CIP',
            type: 'string'
        },
        {
            name: 'int_NUMBERDETAIL',
            type: 'int'
        },
        {
            name: 'int_EAN13',
            type: 'string'
        },
        {
            name: 'prixDiff',
            type: 'boolean'
        },
        {
            name: 'int_PRICE_MACHINE',
            type: 'int'
        },
        {
            name: 'lots',
            type: 'auto'
        },
        {
            name: 'datePeremption',
            type: 'string'
        },
        {
            name: 'lotNums',
            type: 'string'
        },
        {name: 'produitState', type: 'auto'}

        //fin code ajouté
    ]
});
