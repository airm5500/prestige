
Ext.define('testextjs.model.PointCaisse', {
    extend: 'Ext.data.Model',
    fields: [
        
        { name: 'montantTotalNet', type: 'number' },
        { name: 'credit', type: 'number' },
        { name: 'especes', type: 'number' },
        { name: 'caissiere', type: 'string' },
        { name: 'depot', type: 'string' },
        { name: 'dateTransaction', type: 'string' }
    ]
});
