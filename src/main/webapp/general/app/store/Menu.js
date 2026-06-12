Ext.define('testextjs.store.Menu', {
    extend: 'Ext.data.TreeStore',
    /* xtype 'menu' retire : il ecrasait l'alias widget du vrai Ext.menu.Menu */
    root: {
        expanded: true,
        children: [
        {
            text: 'Panels',
            expanded: false,
            children: [
            {
                id: 'basic-panels',
                text: 'Basic Panel',
                leaf: true
            },
            {
                id: 'framed-panels',
                text: 'Framed Panel',
                leaf: true
            }
            ]
        }
        ]
    }
});