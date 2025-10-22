Ext.define('testextjs.model.ZoneGeographique', {
    extend: 'Ext.data.Model',
    fields: [
        {
            name: 'lg_ZONE_GEO_ID',
            type: 'string'
        },
        {
            name: 'str_CODE',
            type: 'string'
        },
        {
            name: 'str_LIBELLEE',
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
        }
        , {
            name: 'bool_ACCOUNT',
            type: 'boolean',
            defaultValue: true
        }
        , {
            name: 'KEYINTOACCOUNT',
            type: 'boolean',
            defaultValue: false
        }
        ,
        {
            name: 'id',
            type: 'string'
        },
        {
            name: 'libelle',
            type: 'string'
        }
  	
    ]
});
