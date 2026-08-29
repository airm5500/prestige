/* global Ext */

Ext.define('testextjs.controller.FactureSubrogatoireCtr', {
    extend: 'Ext.app.Controller',
    requires: [
        'testextjs.view.sm_user.journalvente.action.detailProduct'
    ],
    views: ['testextjs.view.sm_user.journalvente.FactureSubrogatoireBisManager'],
    refs: [{
            ref: 'facturesubrogatoireother',
            selector: 'facturesubrogatoireother'
        },
        {
            ref: 'queryBtn',
            selector: 'facturesubrogatoireother #rechercher'
        },
        {
            ref: 'facturesSubroGrid',
            selector: 'facturesubrogatoireother gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'facturesubrogatoireother gridpanel pagingtoolbar'
        }
        , {
            ref: 'dtStart',
            selector: 'facturesubrogatoireother #dtStart'
        }, {
            ref: 'dtEnd',
            selector: 'facturesubrogatoireother #dtEnd'
        }

        , {
            ref: 'hStart',
            selector: 'facturesubrogatoireother #hStart'
        }, {
            ref: 'hEnd',
            selector: 'facturesubrogatoireother #hEnd'
        }
        , {
            ref: 'queryField',
            selector: 'facturesubrogatoireother #query'
        }, {
            ref: 'tiersPayantId',
            selector: 'facturesubrogatoireother #tiersPayantId'
        }

        , {
            ref: 'typeTiersPayantId',
            selector: 'facturesubrogatoireother #typeTiersPayantId'
        }, {
            ref: 'groupeId',
            selector: 'facturesubrogatoireother #groupeId'
        }
        , {
            ref: 'montant',
            selector: 'facturesubrogatoireother #montant'
        }
        , {
            ref: 'nbreBonSug',
            selector: 'facturesubrogatoireother #nbreBonSug'
        }


    ],

    init: function (application) {
        this.control({
            'facturesubrogatoireother gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'facturesubrogatoireother #rechercher': {
                click: this.doSearch
            },
            'facturesubrogatoireother #tiersPayantId': {
                select: this.doSearch
            },

            'facturesubrogatoireother gridpanel': {
                viewready: this.doInitStore
            },
            "facturesubrogatoireother gridpanel actioncolumn": {
                showItems: this.showItems

            },
            'facturesubrogatoireother #query': {
                specialkey: this.onSpecialKey
            },
            'facturesubrogatoireother #typeTiersPayantId': {
                select: this.doSearch
            },
            'facturesubrogatoireother #groupeId': {
                select: this.doSearch
            },
            'facturesubrogatoireother #printable': {
                click: this.onPdfClick
            },
            'facturesubrogatoireother #printable #printSimple': {
                click: this.onPdfClick
            },
            'facturesubrogatoireother #printable #printProduits': {
                click: this.onPdfProduitsClick
            }
        });
    },

    showItems: function (view, rowIndex, colIndex, item, e, rec, row) {
        new testextjs.view.sm_user.journalvente.action.detailProduct({
            odatasource: rec.data,
            parentview: this,
            mode: "detail_transaction",
            titre: "Detail des produits de la vente [" + rec.get('strREF') + "]"
        });
    },
    doInitStore: function () {
        const me = this;
        me.getFacturesSubroGrid().getStore().addListener('metachange', this.doMetachange, this);
        me.doSearch();
    },
    doBeforechange: function (page, currentPage) {
        const me = this;
        const myProxy = me.getFacturesSubroGrid().getStore().getProxy();
        myProxy.params = {
            query: null,
            tiersPayantId: null,
            dtStart: null,
            dtEnd: null,
            hEnd: null
        };

        myProxy.setExtraParam('query', me.getQueryField().getValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('tiersPayantId', me.getTiersPayantId().getValue());
        myProxy.setExtraParam('hStart', me.getHStart().getSubmitValue());
        myProxy.setExtraParam('hEnd', me.getHEnd().getSubmitValue());
        myProxy.setExtraParam('typeTiersPayantId', me.getTypeTiersPayantId().getValue());
        myProxy.setExtraParam('groupeId', me.getGroupeId().getValue());

    },

    onSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            const me = this;
            me.doSearch();
        }
    },
    doSearch: function () {
        const me = this;
        me.getFacturesSubroGrid().getStore().load({
            params: {
                "query": me.getQueryField().getValue(),
                "dtStart": me.getDtStart().getSubmitValue(),
                "dtEnd": me.getDtEnd().getSubmitValue(),
                "tiersPayantId": me.getTiersPayantId().getValue(),
                "hStart": me.getHStart().getSubmitValue(),
                "hEnd": me.getHEnd().getSubmitValue(),
                "typeTiersPayantId": me.getTypeTiersPayantId().getValue(),
                "groupeId": me.getGroupeId().getValue()
            }
        });
    },
    doMetachange: function (store, meta) {
        const me = this;
        me.buildSummary(meta);
    },
    buildSummary: function (rec) {

        const me = this;
        me.getMontant().setValue(rec.montant);
        me.getNbreBonSug().setValue(rec.nbreBon);

    },
    buildPdfUrl: function (mode) {
        const me = this;
        const valeur = function (v) {
            return (v === null || v === undefined) ? '' : v;
        };
        return '../ListBonsServlet?dtStart=' + me.getDtStart().getSubmitValue()
                + '&dtEnd=' + me.getDtEnd().getSubmitValue()
                + '&tiersPayantId=' + valeur(me.getTiersPayantId().getValue())
                + '&query=' + valeur(me.getQueryField().getValue())
                + '&hStart=' + valeur(me.getHStart().getSubmitValue())
                + '&hEnd=' + valeur(me.getHEnd().getSubmitValue())
                + '&typeTiersPayantId=' + valeur(me.getTypeTiersPayantId().getValue())
                + '&groupeId=' + valeur(me.getGroupeId().getValue())
                + '&mode=' + (mode || '');
    },
    /* Liste simple : la liste actuelle. Si un groupe est filtré, le serveur
     * bascule de lui-même sur l'édition regroupée par groupe. */
    onPdfClick: function () {
        window.open(this.buildPdfUrl(''));
    },
    /* Liste avec produits : chaque bon est suivi de ses produits (lot 3). */
    onPdfProduitsClick: function () {
        window.open(this.buildPdfUrl('produits'));
    }
});