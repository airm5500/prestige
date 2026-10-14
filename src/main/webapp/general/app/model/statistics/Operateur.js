Ext.define('testextjs.model.statistics.Operateur', {
    extend: 'Ext.data.Model',
    idProperty: 'id',
    fields: [
        {name: 'id', type: 'string'},
        {name: 'Operateur', type: 'string'},
        {name: 'BRUT TTC', type: 'float'},
        {name: 'NET TTC', type: 'float'},
        {name: 'REMISE', type: 'float'},
        {name: 'NB CLIENT', type: 'int'},
        {name: 'PANIER MOYEN', type: 'float'},
        {name: 'NB_VO', type: 'int'},
        {name: 'VO_MONTANT', type: 'float'},
        {name: 'NB_VOP', type: 'float'},
        {name: 'VO_MONTANTP', type: 'float'},
        {name: 'PANIER_MOYEN_VOP', type: 'float'},
        {name: 'NB_VNO', type: 'float'},
        {name: 'VNO_MONTANT', type: 'float'},
        {name: 'PANIER_MOYEN_VNO', type: 'float'},
         {name: 'M Ord', type: 'float'},
          {name: 'M Non Ord', type: 'float'},
        {name: 'CA', type: 'float'},
        /* retours du 13/10 (point 11) : ventes conseillees (« Conseil » choisi a la vente) */
        {name: 'NB_CONSEIL', type: 'int'},
        {name: 'MONTANT_CONSEIL', type: 'float'}
    ]
});

