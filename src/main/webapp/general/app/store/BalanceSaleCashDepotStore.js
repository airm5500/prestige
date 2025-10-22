
Ext.define('testextjs.store.BalanceSaleCashDepotStore', {
    extend: 'Ext.data.Store',
    model: 'testextjs.model.BalanceSaleCashDepotModel',
    autoLoad: false,
    proxy: {
        type: 'ajax',
        url: '../api/v1/balance/balancesalecashdepot',
        reader: {
            type: 'json',
            root: 'data',
            totalProperty: 'total'
        },
        timeout: 180000, // 3 minutes de timeout
        listeners: {
            exception: function(proxy, response, operation) {
                Ext.MessageBox.alert('Erreur', 'Erreur de communication avec le serveur : ' + response.statusText);
            }
        }
    }
});
