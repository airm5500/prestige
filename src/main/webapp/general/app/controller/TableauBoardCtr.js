/* global Ext */

Ext.define('testextjs.controller.TableauBoardCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.Dashboard.TableauPhama'],
    refs: [{
            ref: 'tableauPhama',
            selector: 'tableauPhama'
        },
        {
            ref: 'imprimerBtn',
            selector: 'tableauPhama #imprimer'
        },

        {
            ref: 'tableauBoardGrid',
            selector: 'tableauPhama #tableauBoardGrid'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'tableauPhama #tableauBoardGrid pagingtoolbar'
        }

        , {
            ref: 'dtStart',
            selector: 'tableauPhama #dtStart'
        }, {
            ref: 'rationAV',
            selector: 'tableauPhama #rationAV'
        }, {
            ref: 'monthly',
            selector: 'tableauPhama #monthly'
        },

        {
            ref: 'dtEnd',
            selector: 'tableauPhama #dtEnd'
        },
        {ref: 'rechercherButton',
            selector: 'tableauPhama #rechercher'

        }, {
            ref: 'montantNet',
            selector: 'tableauPhama #montantNet'
        }, {
            ref: 'montantAchat',
            selector: 'tableauPhama #montantAchat'
        },
        {
            ref: 'ratioVA',
            selector: 'tableauPhama #ratioVA'
        }, {
            ref: 'comboRation',
            selector: 'tableauPhama #comboRation'
        },
        {
            ref: 'nbreClient',
            selector: 'tableauPhama #nbreClient'
        },
        {
            ref: 'ratioAV',
            selector: 'tableauPhama #ratioAV'
        }, {
            ref: 'montantRemise',
            selector: 'tableauPhama #montantRemise'
        }


    ],
    init: function (application) {
        this.control({
            'tableauPhama #tableauBoardGrid pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'tableauPhama #rechercher': {
                click: this.doSearch
            },
            'tableauPhama #imprimer': {
                click: this.onPdfClick
            },
            'tableauPhama #btnExcel': {
                click: this.onPrintExcel
            },

            'tableauPhama #tableauBoardGrid': {
                viewready: this.doInitStore
            }

        });
    },
    onPdfClick: function () {
        let me = this;

        let dtStart = me.getDtStart().getSubmitValue();
        let dtEnd = me.getDtEnd().getSubmitValue();
        let ratio = true;
        let v = me.getComboRation().getValue().split('/');
        let monthlycomp = me.getMonthly();
        let monthly = monthlycomp.checked;
        if (v[1] === 'Achat') {
            ratio = false;
        }
        var linkUrl = '../BalancePdfServlet?mode=TABLEAU&dtStart=' + dtStart +
                '&dtEnd=' + dtEnd + '&ratio=' + ratio + '&monthly=' + monthly;
        window.open(linkUrl);
    },
    onPrintExcel: function () {
        let me = this;

        let dtStart = me.getDtStart().getSubmitValue();
        let dtEnd = me.getDtEnd().getSubmitValue();
        let ratio = true;
        let v = me.getComboRation().getValue().split('/');
        let monthlycomp = me.getMonthly();
        let monthly = monthlycomp.checked;
        if (v[1] === 'Achat') {
            ratio = false;
        }
        window.location = '../ExcelExporter?mode=TABLEAU&dtStart=' + dtStart + '&dtEnd=' + dtEnd + '&ratio=' + ratio + '&monthly=' + monthly;

    },

    doMetachange: function (store, meta) {
        var me = this;
        me.buildSummary(meta);

    },
    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getTableauBoardGrid().getStore().getProxy();
        myProxy.params = {
            dtEnd: null,
            dtStart: null,
            monthly: false

        };
        let monthlycomp = me.getMonthly();
        let monthly = monthlycomp.checked;
        myProxy.setExtraParam('monthly', monthly);
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());

    },

    doInitStore: function () {
        var me = this;
        me.getTableauBoardGrid().getStore().addListener('metachange', this.doMetachange, this);
        me.doSearch();
    },

    doSearch: function () {
        var me = this;
        let monthlycomp = me.getMonthly();
        let monthly = monthlycomp.checked;
        me.getTableauBoardGrid().getStore().load({
            params: {
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue(),
                monthly: monthly

            }
        });
    },
    buildSummary: function (rec) {
        var me = this;
        me.getMontantNet().setValue(rec.montantNet);
        me.getMontantAchat().setValue(rec.montantAchat);
        me.getRatioVA().setValue(rec.ratioVA);
        me.getRatioAV().setValue(rec.rationAV);
        me.getMontantRemise().setValue(rec.montantRemise);
        me.getNbreClient().setValue(rec.nbreVente);


    }
});