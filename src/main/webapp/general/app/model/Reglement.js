Ext.define('testextjs.model.Reglement', {
    extend: 'Ext.data.Model',
    fields: [
        {
            name: 'lg_REGLEMENT_ID',
            type: 'string'
        },
         {
            name: 'lg_DOSSIER_REGLEMENT_ID',
            type: 'string'
        },
        
        {
            name: 'str_MODE_REGLEMENT',
            type: 'string'
        },
        {
            name: 'str_MONTANT_REGLE',
            type: 'string'
        },
        {
            name: 'str_MONTANT',
            type: 'float'
        },
        // str_FIRST_LAST_NAME
        {
            name: 'dt_DATE_REGLEMENT',
            type: 'string'
        },
         {
            name: 'str_ORGANISME',
            type: 'string'
        },
        {
            name: 'str_STATUT',
            type: 'string'
        },
        {
            name: 'dt_REGLEMENT',
            type: 'string'
        },
        {
            name: 'OPERATEUR',
            type: 'string'
        },
        {
            name: 'HEURE_REGLEMENT',
            type: 'string'
        },
        {
            name: 'str_REF',
            type: 'string'
        }
        ,
        {
            name: 'LIBELLE_TYPE_TIERS_PAYANT',
            type: 'string'
        },
        {
            name: 'CODE_FACTURE',
            type: 'string'
        },
        {
            name: 'GROUPE'
        },
        {
            name: 'MONTANT_ATT',
            type: 'float'
        }
        ,
        {
            name: 'MONTANT_NET',
            type: 'float'
        }
        

    ]
});
