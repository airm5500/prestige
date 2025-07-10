/* global Ext */

Ext.define('testextjs.controller.TableauBoardCarnetCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.Dashboard.TableauPhamaCarnet'],
    refs: [{
            ref: 'tableauPhamaCarnet',
            selector: 'tableauPhamaCarnet'
        },
        {
            ref: 'imprimerBtn',
            selector: 'tableauPhamaCarnet #imprimer'
        },

        {
            ref: 'tableauBoardGrid',
            selector: 'tableauPhamaCarnet #tableauBoardGrid'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'tableauPhamaCarnet #tableauBoardGrid pagingtoolbar'
        }

        , {
            ref: 'dtStart',
            selector: 'tableauPhamaCarnet #dtStart'
        }, {
            ref: 'rationAV',
            selector: 'tableauPhamaCarnet #rationAV'
        }, {
            ref: 'monthly',
            selector: 'tableauPhamaCarnet #monthly'
        },

        {
            ref: 'dtEnd',
            selector: 'tableauPhamaCarnet #dtEnd'
        },
        {ref: 'rechercherButton',
            selector: 'tableauPhamaCarnet #rechercher'

        }, {
            ref: 'montantNet',
            selector: 'tableauPhamaCarnet #montantNet'
        }, {
            ref: 'montantAchat',
            selector: 'tableauPhamaCarnet #montantAchat'
        },
        {
            ref: 'ratioVA',
            selector: 'tableauPhamaCarnet #ratioVA'
        }, {
            ref: 'comboRation',
            selector: 'tableauPhamaCarnet #comboRation'
        },
        {
            ref: 'nbreClient',
            selector: 'tableauPhamaCarnet #nbreClient'
        },
        {
            ref: 'ratioAV',
            selector: 'tableauPhamaCarnet #ratioAV'
        }, {
            ref: 'montantRemise',
            selector: 'tableauPhamaCarnet #montantRemise'
        }


    ],
    init: function (application) {
        this.control({
            'tableauPhamaCarnet #tableauBoardGrid pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'tableauPhamaCarnet #rechercher': {
                click: this.doSearch
            },
            'tableauPhamaCarnet #imprimer': {
                click: this.onPdfClick
            },
            'tableauPhamaCarnet #btnExcel': {
                click: this.onPrintExcel
            },

            'tableauPhamaCarnet #tableauBoardGrid': {
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
        var linkUrl = '../BalancePdfServlet?mode=TABLEAU_CARNET&dtStart=' + dtStart +
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
        window.location = '../ExcelExporter?mode=TABLEAU_CARNET&dtStart=' + dtStart + '&dtEnd=' + dtEnd + '&ratio=' + ratio + '&monthly=' + monthly;

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