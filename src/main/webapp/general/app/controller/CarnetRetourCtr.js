/* global Ext */

Ext.define('testextjs.controller.CarnetRetourCtr', {
    extend: 'Ext.app.Controller',

    views: ['testextjs.view.Dashboard.RetourCarnet'],
    refs: [{
            ref: 'retourcarnetdepotlist',
            selector: 'retourcarnetdepot'
        },
        {
            ref: 'queryBtn',
            selector: 'retourcarnetdepot #rechercher'
        },
        {
            ref: 'retourcarnetdepotGrid',
            selector: 'retourcarnetdepot gridpanel'
        }

        ,

        {
            ref: 'pagingtoolbar',
            selector: 'retourcarnetdepot gridpanel pagingtoolbar'
        }
        ,

        {
            ref: 'dtStart',
            selector: 'retourcarnetdepot #dtStart'
        },
        {
            ref: 'tiersPayantsExclus',
            selector: 'retourcarnetdepot #tiersPayantsExclus'
        },

        {
            ref: 'dtEnd',
            selector: 'retourcarnetdepot #dtEnd'
        }
        , {
            ref: 'queryField',
            selector: 'retourcarnetdepot #query'
        },
        {
            ref: 'montant',
            selector: 'retourcarnetdepot #montant'
        }

        , {
            ref: 'nbreVente',
            selector: 'retourcarnetdepot #nbreVente'
        }
    ],
    config: {
        data: null
    },
    init: function (application) {
        this.control({
            'retourcarnetdepot gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },

            'retourcarnetdepot #rechercher': {
                click: this.doSearch
            },

            'retourcarnetdepot gridpanel': {
                viewready: this.doInitStore
            },

            'retourcarnetdepot #query': {
                specialkey: this.onSpecialKey
            },

            'retourcarnetdepot #btnRetour': {
                click: this.onAddClick
            },

            'retourcarnetdepot #imprimer': {
                click: this.onPrintPdf
            }
        });
    },
    onPrintPdf: function () {
        var me = this;
        let tiersPayantId = me.getTiersPayantsExclus().getValue();
        if (tiersPayantId === null || tiersPayantId === undefined) {
            tiersPayantId = '';
        }
        let dtStart = me.getDtStart().getSubmitValue();
        let dtEnd = me.getDtEnd().getSubmitValue();

        const linkUrl = '../TiersPayantExcludServlet?mode=RETOUR_CARNET_DEPOT&dtStart=' + dtStart +
                '&dtEnd=' + dtEnd + '&tiersPayantId=' + tiersPayantId;
        
         window.open(linkUrl);
    },
    goBack: function () {
        var xtype = 'retourcarnetdepot';
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
    },

    onAddClick: function () {
        var xtype = "doRetourCarnet";
        var data = {'isEdit': false, 'record': {}};
        testextjs.app.getController('App').onRedirectTo(xtype, data);

    },
   
   
    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getRetourcarnetdepotGrid().getStore().getProxy();

        myProxy.params = {
            query: null,
            dtStart: null,
            dtEnd: null,
            tiersPayantId: null

        };

        myProxy.setExtraParam('tiersPayantId', me.getTiersPayantsExclus().getValue());
        myProxy.setExtraParam('query', me.getQueryField().getValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());

    },

    doInitStore: function () {
        var me = this;
        me.getRetourcarnetdepotGrid().getStore().addListener('metachange', this.doMetachange, this);
        me.doSearch();

    },

    onSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var me = this;
            me.doSearch();
        }
    },
    doMetachange: function (store, meta) {
        var me = this;
        me.buildSummary(meta);

    },

    buildSummary: function (rec) {
        var me = this;
        me.getMontant().setValue(rec.prixUni);
        me.getNbreVente().setValue(rec.qtyRetour);
    },
    doSearch: function () {
        var me = this;
        me.getRetourcarnetdepotGrid().getStore().load({
            params: {
                "query": me.getQueryField().getValue(),
                "dtStart": me.getDtStart().getSubmitValue(),
                "dtEnd": me.getDtEnd().getSubmitValue(),
                "tiersPayantId": me.getTiersPayantsExclus().getValue()
            }
        });
    }
});