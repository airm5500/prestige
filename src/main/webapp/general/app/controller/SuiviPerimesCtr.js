
/* global Ext */

Ext.define('testextjs.controller.SuiviPerimesCtr', {
    extend: 'Ext.app.Controller',
    requires: [
        'testextjs.model.caisse.Vente'
    ],
    views: ['testextjs.view.vente.SuiviRemise'],
    refs: [{
            ref: 'suiviremise',
            selector: 'suiviremise'
        },
        {
            ref: 'queryBtn',
            selector: 'suiviremise #rechercher'
        },

        {
            ref: 'suiviRemiseGrid',
            selector: 'suiviremise gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'suiviremise gridpanel pagingtoolbar'
        }
        , {
            ref: 'dtStart',
            selector: 'suiviremise #dtStart'
        }, {
            ref: 'dtEnd',
            selector: 'suiviremise #dtEnd'
        }
 
        , {
            ref: 'tiersPayantId',
            selector: 'suiviremise #tiersPayantId'
        }   , {
            ref: 'montantTtc',
            selector: 'suiviremise #montantTtc'
        }
       , {
            ref: 'montantRemise',
            selector: 'suiviremise #montantRemise'
        }
       
        , {
            ref: 'queryField',
            selector: 'suiviremise #query'
        }, {
            ref: 'typeVente',
            selector: 'suiviremise #typeVente'
        },
        {
            ref: 'printPdf',
            selector: 'suiviremise #printPdf'
        }


    ],
    init: function (application) {
        this.control({
            'suiviremise gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'suiviremise #rechercher': {
                click: this.doSearch
            },
            'suiviremise #typeVente': {
                select: this.doSearch
            },

            'suiviremise gridpanel': {
                viewready: this.doInitStore
            },
           
            'suiviremise #query': {
                specialkey: this.onSpecialKey
            },
            'suiviremise #printPdf': {
                click: this.printLit
            },'suiviremise #tiersPayantId': {
                select: this.doSearch
            }


        });
    },

    printLit: function () {
        var me = this,
                query = me.getQueryField().getValue(),
                dtStart = me.getDtStart().getSubmitValue(),
                dtEnd = me.getDtEnd().getSubmitValue(),
                typeVenteId = me.getTypeVente().getValue(),tiersPayantId=me.getTiersPayantId().getValue();
                if(tiersPayantId==null){
            tiersPayantId='';
        }
        if(typeVenteId==null){
            typeVenteId='';
        }
        var linkUrl = '../BalancePdfServlet?mode=SUIVI_REMISE&dtStart=' + dtStart + '&dtEnd=' + dtEnd
                + '&tiersPayantId=' + tiersPayantId + '&query=' + query
                + '&typeVenteId=' + typeVenteId;

        window.open(linkUrl);
    },

    
    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getSuiviRemiseGrid().getStore().getProxy();

        myProxy.params = {
            query: null,
            typeVenteId: null,
            dtStart: null,
            dtEnd: null,
           tiersPayantId:null

        };

        myProxy.setExtraParam('tiersPayantId', me.getTiersPayantId().getValue());
        myProxy.setExtraParam('query', me.getQueryField().getValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('typeVenteId', me.getTypeVente().getValue());
     

    },

    doInitStore: function () {
        var me = this;
           me.getSuiviRemiseGrid().getStore().addListener('metachange', this.doMetachange, this);
        me.doSearch();

    },
    onSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var me = this;
            me.doSearch();

        }
    },
    doSearch: function () {
        var me = this;
        me.getSuiviRemiseGrid().getStore().load({
            params: {
                "query": me.getQueryField().getValue(),
                "dtStart": me.getDtStart().getSubmitValue(),
                "dtEnd": me.getDtEnd().getSubmitValue(),
                "typeVenteId": me.getTypeVente().getValue(),
              "tiersPayantId": me.getTiersPayantId().getValue()
            }
        });
    },
    doMetachange: function (store, meta) {
        var me = this;
        me.buildSuiviRemiseSummary(meta);

    },
       buildSuiviRemiseSummary: function (rec) {
        var me = this;
        me.getMontantTtc().setValue(rec.montantTTC);
        me.getMontantRemise().setValue(rec.montantRemise);
    }
});