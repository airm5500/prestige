/* global Ext */

Ext.define('testextjs.controller.DiffereCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.reglement.Differe', 'testextjs.view.reglement.Items'],
    refs: [{
            ref: 'delayed',
            selector: 'delayed'
        },
        {
            ref: 'imprimerBtn',
            selector: 'delayed #imprimer'
        },
        {
            ref: 'itemswindow',
            selector: 'itemswindow'
        },
        {
            ref: 'liste',
            selector: 'delayed #liste'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'delayed #liste pagingtoolbar'
        }

        , {
            ref: 'dtStart',
            selector: 'delayed #dtStart'
        },

        {
            ref: 'dtEnd',
            selector: 'delayed #dtEnd'
        },
        {
            ref: 'doreglement',
            selector: 'delayed #doreglement'
        },

        {ref: 'rechercherButton',
            selector: 'delayed #rechercher'

        },
        {ref: 'userCombo',
            selector: 'delayed #user'

        },
        {ref: 'query',
            selector: 'delayed #query'

        },

        {
            ref: 'reglementGrid',
            selector: 'delayed #reglementGrid'
        }


        , {
            ref: 'dtStartre',
            selector: 'delayed #dtStartre'
        },

        {
            ref: 'dtEndre',
            selector: 'delayed #dtEndre'
        },
        {ref: 'users',
            selector: 'delayed #userre'

        }
    ],
    init: function (application) {
        this.control({
            'delayed #liste pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'delayed #reglementGrid pagingtoolbar': {
                beforechange: this.doBeforechangeGrid
            },
            'delayed #rechercher': {
                click: this.doSearch
            },
            'delayed #search': {
                click: this.doSearchDiffs
            },
            'delayed #imprimer': {
                click: this.onPdfClick
            },

            'delayed #liste': {
                viewready: this.doInitStore
            },
            'delayed #user': {
                select: this.onUserSelect
            },
            'delayed #etatDiffere': {
                select: this.doSearch
            },
            'delayed #userre': {
                select: this.onUsers
            },
            'delayed #doreglement': {
                click: this.doReglement
            },
            'delayed #reglementGrid': {
                viewready: this.doInitStoreDiff
            },
            'delayed #imprimerre': {
                click: this.onPdf
            },
            'itemswindow #btnCancel': {
                click: this.onCancel
            },

            "delayed #reglementGrid actioncolumn": {
                click: this.handleActionColumn
            },
             'delayed #query': {
                specialkey: this.onSpecialKey
            }
        });
    },
    onSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
                var me = this;
                me.doSearch();
        }
    },
    onCancel: function (btn) {
        var me = this;
        var itemswindow = btn.up('window');
        itemswindow.destroy();
    },

    doReglement: function () {
        var xtype = "fairereglement";
        var data = {'isEdit': false, 'source': 'delayed', 'record': {}};
        testextjs.app.getController('App').onRedirectTo(xtype, data);
    },
    onUserSelect: function (cmp) {
        var me = this;
        me.doSearch();
    },
    onPdfClick: function () {
        var me = this;

        var dtStart = me.getDtStart().getSubmitValue();
        var dtEnd = me.getDtEnd().getSubmitValue();
        var query = me.getQuery().getValue();
        var v = me.getUserCombo().getValue();
        if (!v) {
            v = '';
        }
        var linkUrl = '../FacturePdfServlet?mode=LISTE_DIFFERES&dtStart=' + dtStart + '&dtEnd=' + dtEnd + '&userId=' + v + '&query=' + query
                + '&etat=' + encodeURIComponent(me.etatDiffere());
        window.open(linkUrl);
    },
    onPdf: function () {
        var me = this;
        var dtStart = me.getDtStartre().getSubmitValue();
        var dtEnd = me.getDtEndre().getSubmitValue();
        var v = me.getUsers().getValue();
        if (!v) {
            v = '';
        }

        var linkUrl = '../FacturePdfServlet?mode=DIFFERE&dtStart=' + dtStart + '&dtEnd=' + dtEnd + '&userId=' + v;
        window.open(linkUrl);
    },
    handleActionColumn: function (view, rowIndex, colIndex, item, e, r, row) {
        var me = this;
        var store = me.getReglementGrid().getStore(),
                rec = store.getAt(colIndex);
        Ext.create('testextjs.view.reglement.Items', {ref: rec.get('reference')});

    },
    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getListe().getStore().getProxy();
        myProxy.params = {
            dtEnd: null,
            dtStart: null,
            query: null,
            userId: null

        };

        myProxy.setExtraParam('userId', me.getUserCombo().getValue());
        myProxy.setExtraParam('query', me.getQuery().getValue());
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
        myProxy.setExtraParam('etat', me.etatDiffere());

    },

    /** Retours du 07/10 : filtre regle / non regle / partiel de la liste des differes. */
    etatDiffere: function () {
        var c = Ext.ComponentQuery.query('delayed #etatDiffere')[0];
        return (c && c.getValue()) || 'NON_SOLDES';
    },

    doInitStore: function () {
        var me = this;
        me.doSearch();
    },

    doSearch: function () {
        var me = this;
        me.getListe().getStore().load({
            params: {
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue(),
                query: me.getQuery().getValue(),
                userId: me.getUserCombo().getValue(),
                etat: me.etatDiffere()

            }
        });
    },
    onUsers: function (cmp) {
        var me = this;
        me.doSearchDiffs();
    },
    doSearchDiffs: function () {
        var me = this;
        me.getReglementGrid().getStore().load({
            params: {
                dtStart: me.getDtStartre().getSubmitValue(),
                dtEnd: me.getDtEndre().getSubmitValue(),
                clientId: me.getUsers().getValue()

            }
        });
    },
    doBeforechangeGrid: function (page, currentPage) {
        var me = this;
        var myProxy = me.getReglementGrid().getStore().getProxy();
        myProxy.params = {
            dtEnd: null,
            dtStart: null,
            clientId: null

        };

        myProxy.setExtraParam('clientId', me.getUsers().getValue());
        myProxy.setExtraParam('dtEnd', me.getDtEndre().getSubmitValue());
        myProxy.setExtraParam('dtStart', me.getDtStartre().getSubmitValue());

    },
    doInitStoreDiff: function () {
        var me = this;

        me.doSearchDiffs();
    }

});