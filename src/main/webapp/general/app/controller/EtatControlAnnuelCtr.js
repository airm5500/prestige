/* global Ext */

Ext.define('testextjs.controller.EtatControlAnnuelCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.bons.EtatControlAnnuel'],
    refs: [{
            ref: 'etatannuel',
            selector: 'etatannuel'
        },

        {
            ref: 'etatannuelGrid',
            selector: 'etatannuel gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'etatannuel gridpanel pagingtoolbar'
        }

        , {
            ref: 'dtStart',
            selector: 'etatannuel #dtStart'
        },
        {
            ref: 'dtEnd',
            selector: 'etatannuel #dtEnd'
        },
        {
            ref: 'group',
            selector: 'etatannuel #groupBy'
        },
        {
            ref: 'grossiste',
            selector: 'etatannuel #grossisteId'
        },

        {
            ref: 'groupe',
            selector: 'etatannuel #groupeId'
        },
        {
            ref: 'totalTaxe',
            selector: 'etatannuel #totalTaxe'
        },
        {
            ref: 'totaltHtaxe',
            selector: 'etatannuel #totaltHtaxe'
        },
        {
            ref: 'totalTtc',
            selector: 'etatannuel #totalTtc'
        }
        ,
        {
            ref: 'totalVenteTtc',
            selector: 'etatannuel #totalVenteTtc'
        }
        ,
        {
            ref: 'totalMarge',
            selector: 'etatannuel #totalMarge'
        }
        ,
        {
            ref: 'totalNbreBon',
            selector: 'etatannuel #totalNbreBon'
        }
    ],
    init: function (application) {
        this.control({
            'etatannuel gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'etatannuel #rechercher': {
                click: this.doSearch
            },
            'etatannuel #imprimer': {
                click: this.onPdfClick
            },

            'etatannuel #groupeId': {
                select: this.doSearch
            },
            'etatannuel #grossisteId': {
                select: this.doSearch
            },
            'etatannuel #groupBy': {
                select: this.doSearch
            },

            'etatannuel gridpanel': {
                viewready: this.doInitStore
            }, 'etatannuel #exportToExcel': {
                click: this.onExportExcel
            }


        });
    },

    onPdfClick: function () {
        const me = this;
        const dtStart = me.getDtStart().getSubmitValue();
        const dtEnd = me.getDtEnd().getSubmitValue();
        let grossisteId = me.getGrossiste().getValue();
        let groupeId = me.getGroupe().getValue();
        let groupBy = me.getGroup().getValue();

        if (grossisteId === null) {
            grossisteId = '';
        }
        if (groupeId === null) {
            groupeId = '';
        }

        if (groupBy === null) {
            groupBy = '';
        }
        const linkUrl = '../EtatControlStockServlet?mode=etatAnnuel&dtStart=' + dtStart + '&dtEnd=' + dtEnd
                + '&grossisteId=' + grossisteId + '&groupBy=' + groupBy + '&groupeId=' + groupeId;

        window.open(linkUrl);
    },
    onExportExcel: function () {
        const me = this;
        const dtStart = me.getDtStart().getSubmitValue();
        const dtEnd = me.getDtEnd().getSubmitValue();
        let grossisteId = me.getGrossiste().getValue();
        let groupeId = me.getGroupe().getValue();
        let groupBy = me.getGroup().getValue();

        if (grossisteId === null) {
            grossisteId = '';
        }
        if (groupeId === null) {
            groupeId = '';
        }

        if (groupBy === null) {
            groupBy = '';
        }
        window.location = '../api/v1/etat-control-bon/export-annuel-excel?mode=etatAnnuel&dtStart=' + dtStart + '&dtEnd=' + dtEnd
                + '&grossisteId=' + grossisteId + '&groupBy=' + groupBy + '&groupeId=' + groupeId + '&fileType=excel';

     
    },
    doBeforechange: function (page, currentPage) {
        const me = this;
        const myProxy = me.getEtatannuelGrid().getStore().getProxy();
        myProxy.params = {
            dtEnd: null,
            dtStart: null,
            groupeId: null,
            groupBy: null,
            grossisteId: null

        };

        const grossisteId = me.getGrossiste().getValue();
        const groupeId = me.getGroupe().getValue();
        const groupBy = me.getGroup().getValue();
        myProxy.setExtraParam('groupBy', groupBy);
        myProxy.setExtraParam('grossisteId', grossisteId);
        myProxy.setExtraParam('groupeId', groupeId);
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
    },
    doInitStore: function () {
        const me = this;
        me.getEtatannuelGrid().getStore().addListener('metachange', this.doMetachange, this);
        me.doSearch();
    },
    doSearch: function () {

        const me = this;
        const grossisteId = me.getGrossiste().getValue();
        const groupeId = me.getGroupe().getValue();
        const groupBy = me.getGroup().getValue();

        me.getEtatannuelGrid().getStore().load({
            params: {
                dtEnd: me.getDtEnd().getSubmitValue(),
                dtStart: me.getDtStart().getSubmitValue(),
                groupeId: groupeId,
                groupBy: groupBy,
                grossisteId: grossisteId

            }
        });
    },
    doMetachange: function (store, meta) {
        const me = this;
        me.buildSummary(meta);

    },
    buildSummary: function (rec) {
        const me = this;
        me.getTotaltHtaxe().setValue(rec.totaltHtaxe);
        me.getTotalTaxe().setValue(rec.totalTaxe);
        me.getTotalVenteTtc().setValue(rec.totalVenteTtc);
        me.getTotalMarge().setValue(rec.totalMarge);
        me.getTotalNbreBon().setValue(rec.totalNbreBon);
        me.getTotalTtc().setValue(rec.totalTtc);


    }

});