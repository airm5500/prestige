/* global Ext */

Ext.define('testextjs.controller.RecapRecetteCaisseCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.caisseManager.RecapRecetteCaisse'],
    refs: [{
            ref: 'caisserecetterecap',
            selector: 'caisserecetterecap'
        },
        {
            ref: 'imprimerBtn',
            selector: 'caisserecetterecap #imprimer'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'caisserecetterecap gridpanel pagingtoolbar'
        }

        , {
            ref: 'startDateField',
            selector: 'caisserecetterecap #dtStart'
        }, {
            ref: 'endDateField',
            selector: 'caisserecetterecap #dtEnd'
        }, {
            ref: 'reglementComboField',
            selector: 'caisserecetterecap #typeRglementId'
        },
        {ref: 'rechercherButton',
            selector: 'caisserecetterecap #rechercher'

        },

        {
            ref: 'caisserecetterecapGrid',
            selector: 'caisserecetterecap gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'caisserecetterecap gridpanel pagingtoolbar'
        },
        {ref: 'groupByYear',
            selector: 'caisserecetterecap #groupByYear'

        },
        {ref: 'btnExcel',
            selector: 'caisserecetterecap #btnExcel'

        }
    ],
    init: function (application) {
        this.control({
            'caisserecetterecap gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'caisserecetterecap #rechercher': {
                click: this.doSearch
            },
            'caisserecetterecap #imprimer': {
                click: this.onPdfClick
            },

            'caisserecetterecap #typeRglementId': {
                select: this.doSearch
            },
            'caisserecetterecap #btnExcel': {
                click: this.onExport
            },
            'caisserecetterecap gridpanel': {
                viewready: this.doInitStore
            }

        });
    },
    onPdfClick: function () {
        const me = this;
        const groupByYear = me.getGroupByYear().checked;
        const dtStart = me.getStartDateField().getSubmitValue();
        const dtEnd = me.getEndDateField().getSubmitValue();
        let reglement = me.getReglementComboField().getValue();
        if (!reglement) {
            reglement = '';
        }
        const linkUrl = '../RecapRecetteCaisseServlet?typeRglementId=' + reglement + '&dtStart=' + dtStart + '&dtEnd=' + dtEnd + '&groupByYear=' + groupByYear;
        window.open(linkUrl);
    },

    onExport: function () {
        const me = this;
        const groupByYear = me.getGroupByYear().checked;
        const dtStart = me.getStartDateField().getSubmitValue();
        const dtEnd = me.getEndDateField().getSubmitValue();
        let reglement = me.getReglementComboField().getValue();
          if (!reglement) {
            reglement = '';
        }
        window.location = '../api/v1/stats-recette-caisse/export-csv?typeRglementId=' + reglement + '&dtStart=' + dtStart + '&dtEnd=' + dtEnd + '&groupByYear=' + groupByYear;
    },
    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getCaisserecetterecapGrid().getStore().getProxy();

        myProxy.params = {

            groupByYear: false,
            dtStart: null,
            dtEnd: null,
            typeRglementId: null
        };


        myProxy.setExtraParam('dtStart', me.getStartDateField().getSubmitValue());
        myProxy.setExtraParam('dtEnd', me.getEndDateField().getSubmitValue());
        myProxy.setExtraParam('groupByYear', me.getGroupByYear().checked);
        myProxy.setExtraParam('typeRglementId', me.getReglementComboField().getValue());
    },

    doInitStore: function () {
        var me = this;
        me.doSearch();

    },

    doSearch: function () {
        var me = this;

        me.getCaisserecetterecapGrid().getStore().load({
            params: {
                groupByYear: me.getGroupByYear().checked,
                typeRglementId: me.getReglementComboField().getValue(),
                dtStart: me.getStartDateField().getSubmitValue(),
                dtEnd: me.getEndDateField().getSubmitValue()
            }
        });
    }
});