Ext.define('testextjs.store.PointCaisse', {
    extend: 'Ext.data.Store',
    model: 'testextjs.model.PointCaisse',
    autoLoad: false,
    proxy: {
        type: 'ajax',
        url: '../api/v1/pointdepot',
        reader: {
            type: 'json',
            root: 'rows',
            totalProperty: 'total'
        },
        timeout: 180000 // 3 minutes
    }
});
