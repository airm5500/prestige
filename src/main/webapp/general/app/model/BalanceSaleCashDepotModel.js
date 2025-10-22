
Ext.define('testextjs.model.BalanceSaleCashDepotModel', {
    extend: 'Ext.data.Model',
    fields: [
        { name: 'balanceId', type: 'string' },
        { name: 'typeVente', type: 'string' },
        { name: 'montantTTC', type: 'number' },
        { name: 'montantNet', type: 'number' },
        { name: 'montantRemise', type: 'number' },
        { name: 'nbreVente', type: 'number' },
        { name: 'marge', type: 'number' },
        { name: 'panierMoyen', type: 'number' },
        { name: 'montantEsp', type: 'number' },
        { name: 'montantCheque', type: 'number' },
        { name: 'montantCB', type: 'number' },
        { name: 'montantVirement', type: 'number' },
        { name: 'montantMobilePayment', type: 'number' },
        { name: 'montantTp', type: 'number' },
        { name: 'montantPaye', type: 'number' }
    ]
});
