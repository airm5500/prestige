/* global Ext */

Ext.define('testextjs.controller.VenteTiersPayantsCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.vente.VenteTiersPayant'],
    refs: [{
            ref: 'tpventes',
            selector: 'tpventes'
        },

        {
            ref: 'uggid',
            selector: 'tpventes #uggid'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'tpventes #uggid pagingtoolbar'
        }

        , {
            ref: 'dtStart',
            selector: 'tpventes #dtStart'
        }, {
            ref: 'dtEnd',
            selector: 'tpventes #dtEnd'
        },
        {ref: 'rechercherButton',
            selector: 'tpventes #rechercher'

        },
        {
            ref: 'montant',
            selector: 'tpventes #montant'
        },

        {
            ref: 'nbre',
            selector: 'tpventes #nbre'
        },

        {
            ref: 'groupTp',
            selector: 'tpventes #groupTp'
        },

        {
            ref: 'tpCmb',
            selector: 'tpventes #tpCmb'
        },
        {
            ref: 'query',
            selector: 'tpventes #query'
        },
        {
            ref: 'importGroup',
            selector: 'tpventes #importicon'
        },
        {
            ref: 'typeTp',
            selector: 'tpventes #typeTp'
        }


    ],
    init: function (application) {
        this.control({
            'tpventes #uggid pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'tpventes #groupTp': {
                select: this.doSearch
            },
            'tpventes #tpCmb': {
                select: this.doSearch
            },
            'tpventes #typeTp': {
                select: this.doSearch
            },

            'tpventes #rechercher': {
                click: this.doSearch
            }, /*
             'tpventes #imprimer': {
             click: this.onPdfClick
             },
             'tpventes #importicon': {
             click: this.onPdfGroup
             },*/

            'tpventes #uggid': {
                viewready: this.doInitStore
            },

            'tpventes #exporter #exporterpdf': {
                click: this.onPdfClick
            },
            'tpventes #exporter #exporterexcel': {
                click: this.onExportExcel
            },
            'tpventes #exporterGroupe #exporterpdf': {
                click: this.onPdfGroup
            },
            'tpventes #exporterGroupe #exporterexcel': {
                click: this.onExportExcelGroup
            }

        });
    },
    onPdfClick: function () {
        const me = this;
        let dtStart = me.getDtStart().getSubmitValue();
        let dtEnd = me.getDtEnd().getSubmitValue();
        let query = me.getQuery().getValue();
        let tiersPayantId = me.getTpCmb().getValue();
        let groupTp = me.getGroupTp().getValue();
        let   typeTp = me.getTypeTp().getValue();
        if (typeTp == null || typeTp == undefined) {
            typeTp = '';
        }
        if (groupTp == null || groupTp == undefined) {
            groupTp = '';
        }
        if (tiersPayantId == null || tiersPayantId == undefined) {
            tiersPayantId = '';
        }
        var linkUrl = '../SockServlet?mode=VENTE_TIERS_PAYANT&dtStart=' + dtStart + '&dtEnd=' + dtEnd
                + '&query=' + query + '&tiersPayantId=' + tiersPayantId +
                '&groupeId=' + groupTp + '&typeTp=' + typeTp;
        window.open(linkUrl);
    },
    onExportExcel: function () {
        const me = this;
        let dtStart = me.getDtStart().getSubmitValue();
        let dtEnd = me.getDtEnd().getSubmitValue();
        let query = me.getQuery().getValue();
        let tiersPayantId = me.getTpCmb().getValue();
        let groupTp = me.getGroupTp().getValue();
        let   typeTp = me.getTypeTp().getValue();
        if (typeTp == null || typeTp == undefined) {
            typeTp = '';
        }
        if (groupTp == null || groupTp == undefined) {
            groupTp = '';
        }
        if (tiersPayantId == null || tiersPayantId == undefined) {
            tiersPayantId = '';
        }
        window.location = '../api/v1/client/export-vente-excel?isGroupe=false&dtStart=' + dtStart + '&dtEnd=' + dtEnd
                + '&query=' + query + '&tiersPayantId=' + tiersPayantId +
                '&groupeId=' + groupTp + '&typeTp=' + typeTp;

    },
    doMetachange: function (store, meta) {
        const me = this;
        me.buildSummary(meta);

    },
    doBeforechange: function (page, currentPage) {
        const me = this;
        const myProxy = me.getUggid().getStore().getProxy();
        myProxy.params = {
            dtEnd: null,
            dtStart: null,
            groupeId: null,
            tiersPayantId: null,
            query: null,
            typeTp: 'ALL'

        };
        myProxy.setExtraParam('typeTp', me.getTypeTp().getValue());
        myProxy.setExtraParam('groupeId', me.getGroupTp().getValue());
        myProxy.setExtraParam('tiersPayantId', me.getTpCmb().getValue());
        myProxy.setExtraParam('query', me.getQuery().getValue());
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());

    },

    doInitStore: function () {
        const me = this;
        me.getUggid().getStore().addListener('metachange', this.doMetachange, this);
        me.doSearch();
    },

    doSearch: function () {
        var me = this;
        me.getUggid().getStore().load({
            params: {
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue(),
                query: me.getQuery().getValue(),
                groupeId: me.getGroupTp().getValue(),
                tiersPayantId: me.getTpCmb().getValue(),
                typeTp: me.getTypeTp().getValue()

            }
        });
    },
    buildSummary: function (rec) {
        const me = this;
        me.getMontant().setValue(rec.montant);
        me.getNbre().setValue(rec.nbre);
    },

    onPdfGroup: function () {
        const me = this;
        let dtStart = me.getDtStart().getSubmitValue();
        let dtEnd = me.getDtEnd().getSubmitValue();
        let query = me.getQuery().getValue();
        let tiersPayantId = me.getTpCmb().getValue();
        let groupTp = me.getGroupTp().getValue();
        let   typeTp = me.getTypeTp().getValue();
        if (typeTp == null || typeTp == undefined) {
            typeTp = '';
        }
        if (groupTp == null || groupTp == undefined) {
            groupTp = '';
        }
        if (tiersPayantId == null || tiersPayantId == undefined) {
            tiersPayantId = '';
        }

        const linkUrl = '../SockServlet?mode=VENTE_TIERS_PAYANT_GROUP&dtStart=' + dtStart + '&dtEnd=' + dtEnd
                + '&query=' + query + '&tiersPayantId=' + tiersPayantId +
                '&groupeId=' + groupTp + '&typeTp=' + typeTp;
        window.open(linkUrl);
    },
    onExportExcelGroup: function () {
        const me = this;
        let dtStart = me.getDtStart().getSubmitValue();
        let dtEnd = me.getDtEnd().getSubmitValue();
        let query = me.getQuery().getValue();
        let tiersPayantId = me.getTpCmb().getValue();
        let groupTp = me.getGroupTp().getValue();
        let   typeTp = me.getTypeTp().getValue();
        if (typeTp == null || typeTp == undefined) {
            typeTp = '';
        }
        if (groupTp == null || groupTp == undefined) {
            groupTp = '';
        }
        if (tiersPayantId == null || tiersPayantId == undefined) {
            tiersPayantId = '';
        }

        window.location = '../api/v1/client/export-vente-excel?isGroupe=true&dtStart=' + dtStart + '&dtEnd=' + dtEnd
                + '&query=' + query + '&tiersPayantId=' + tiersPayantId +
                '&groupeId=' + groupTp + '&typeTp=' + typeTp;

    }

});