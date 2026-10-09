/* global Ext */

Ext.define('testextjs.controller.ParaCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.caisseManager.balance.Para'],
    refs: [{
            ref: 'balancepara',
            selector: 'balancepara'
        },
        {
            ref: 'imprimerBtn',
            selector: 'balancepara #imprimer'
        },

        {
            ref: 'balanceGrid',
            selector: 'balancepara #balanceGrid'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'balancepara #balanceGrid pagingtoolbar'
        }

        , {
            ref: 'dtStart',
            selector: 'balancepara #dtStart'
        }, {
            ref: 'dtEnd',
            selector: 'balancepara #dtEnd'
        },
        {ref: 'rechercherButton',
            selector: 'balancepara #rechercher'

        }, {
            ref: 'montantTTC',
            selector: 'balancepara #montantTTC'
        }, {
            ref: 'montantNet',
            selector: 'balancepara #montantNet'
        },
        
        {
            ref: 'montantMobilePayment',
            selector: 'balancepara #montantMobilePayment'
        },
        {
            ref: 'montantPointsFidelite',
            selector: 'balancepara #montantPointsFidelite'
        },
        
        
        {
            ref: 'montantEsp',
            selector: 'balancepara #montantEsp'
        },
       
        {
            ref: 'nbreVente',
            selector: 'balancepara #nbreVente'
        }, {
            ref: 'montantCheque',
            selector: 'balancepara #montantCheque'
        }, {
            ref: 'montantVirement',
            selector: 'balancepara #montantVirement'
        }
        ,
        {
            ref: 'montantRemise',
            selector: 'balancepara #montantRemise'
        }
    ],
    config: {
        checkUg: false

    },

    init: function (application) {
        this.control({
            'balancepara': {
                render: this.onReady
            },
            'balancepara #balanceGrid pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'balancepara #rechercher': {
                click: this.doSearch
            },
            'balancepara #imprimer': {
                click: this.onPdfClick
            },

            'balancepara #balanceGrid': {
                viewready: this.doInitStore
            }

        });
    },
    onPdfClick: function () {
        let me = this;
        let dtStart = me.getDtStart().getSubmitValue();
        let dtEnd = me.getDtEnd().getSubmitValue();
        let checkug = me.getCheckUg();
        let linkUrl = '../BalancePdfServlet?mode=BALANCE_PARA&dtStart=' + dtStart + '&dtEnd=' + dtEnd + '&checkug=' + checkug;
        window.open(linkUrl);
    },
    doMetachange: function (store, meta) {
        var me = this;
        me.buildSummary(meta);

    },
    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getBalanceGrid().getStore().getProxy();
        myProxy.params = {
            dtEnd: null,
            dtStart: null

        };
      
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());

    },

    doInitStore: function () {
        var me = this;
        me.getBalanceGrid().getStore().addListener('metachange', this.doMetachange, this);
        me.doSearch();
    },

    doSearch: function () {
        var me = this;
        let store = me.getBalanceGrid().getStore();
       
        store.load({
            params: {
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue()

            }
        });
    },
    buildSummary: function (rec) {
        var me = this;
        me.getMontantTTC().setValue(rec.montantTTC);
        me.getMontantRemise().setValue(rec.montantRemise);
        me.getMontantEsp().setValue(rec.montantEsp);
        me.getNbreVente().setValue(rec.nbreVente);
        me.getMontantCheque().setValue(rec.montantCheque);
        me.getMontantVirement().setValue(rec.montantVirement);
        me.getMontantNet().setValue(rec.montantNet);
        me.getMontantMobilePayment().setValue(rec.montantMobilePayment);
        me.getMontantPointsFidelite().setValue(rec.montantPointsFidelite || 0);

    },
    oncheckUg: function () {
        var me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/common/checkug',
            success: function (response, options) {
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.checkUg = result.data;
                }
            }

        });
    },
    onReady: function () {
        var me = this;
        me.oncheckUg();
    }
});