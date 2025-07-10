/* global Ext */

Ext.define('testextjs.controller.BalanceVenteCarnetCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.caisseManager.balance.BalanceSaleCashCarnet'],
    refs: [{
            ref: 'balancesalecahsCarnet',
            selector: 'balancesalecahsCarnet'
        },
        {
            ref: 'imprimerBtn',
            selector: 'balancesalecahsCarnet #imprimer'
        },

        {
            ref: 'balanceGrid',
            selector: 'balancesalecahsCarnet #balanceGrid'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'balancesalecahsCarnet #balanceGrid pagingtoolbar'
        }

        , {
            ref: 'dtStart',
            selector: 'balancesalecahsCarnet #dtStart'
        }, {
            ref: 'dtEnd',
            selector: 'balancesalecahsCarnet #dtEnd'
        },
        {ref: 'rechercherButton',
            selector: 'balancesalecahsCarnet #rechercher'

        }, {
            ref: 'montantTTC',
            selector: 'balancesalecahsCarnet #montantTTC'
        }, {
            ref: 'montantAchat',
            selector: 'balancesalecahsCarnet #montantAchat'
        },
        {
            ref: 'ratioVA',
            selector: 'balancesalecahsCarnet #ratioVA'
        }, {
            ref: 'fondCaisse',
            selector: 'balancesalecahsCarnet #fondCaisse'
        },
        {
            ref: 'montantMobilePayment',
            selector: 'balancesalecahsCarnet #montantMobilePayment'
        },
        {
            ref: 'montantRegDiff',
            selector: 'balancesalecahsCarnet #montantRegDiff'
        },
        {
            ref: 'montantRegleTp',
            selector: 'balancesalecahsCarnet #montantRegleTp'
        },
        {
            ref: 'montantSortie',
            selector: 'balancesalecahsCarnet #montantSortie'
        },
        {
            ref: 'montantEntre',
            selector: 'balancesalecahsCarnet #montantEntre'
        },
        {
            ref: 'montantEsp',
            selector: 'balancesalecahsCarnet #montantEsp'
        },
        {
            ref: 'panierMoyen',
            selector: 'balancesalecahsCarnet #panierMoyen'
        },
        {
            ref: 'nbreVente',
            selector: 'balancesalecahsCarnet #nbreVente'
        }, {
            ref: 'montantCheque',
            selector: 'balancesalecahsCarnet #montantCheque'
        }, {
            ref: 'montantVirement',
            selector: 'balancesalecahsCarnet #montantVirement'
        }
        ,
        {
            ref: 'marge',
            selector: 'balancesalecahsCarnet #marge'
        }
    ],
    config: {
        checkUg: false

    },

    init: function (application) {
        this.control({
            'balancesalecahsCarnet': {
                render: this.onReady
            },
            'balancesalecahsCarnet #balanceGrid pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'balancesalecahsCarnet #rechercher': {
                click: this.doSearch
            },
            'balancesalecahsCarnet #imprimer': {
                click: this.onPdfClick
            },

            'balancesalecahsCarnet #balanceGrid': {
                viewready: this.doInitStore
            }

        });
    },
    onPdfClick: function () {
        let me = this;
        let dtStart = me.getDtStart().getSubmitValue();
        let dtEnd = me.getDtEnd().getSubmitValue();
        let checkug = me.getCheckUg();
        let linkUrl = '../BalancePdfServlet?mode=BALANCE_CARNET&dtStart=' + dtStart + '&dtEnd=' + dtEnd + '&checkug=' + checkug;
        window.open(linkUrl);
    },
    doMetachange: function (store, meta) {
        const me = this;
        me.buildSummary(meta);

    },
    doBeforechange: function (page, currentPage) {
        const me = this;
        const myProxy = me.getBalanceGrid().getStore().getProxy();
        myProxy.params = {
            dtEnd: null,
            dtStart: null

        };
        
            myProxy.url = '../api/v1/caisse/balancesalecash/carnet';
        
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());

    },

    doInitStore: function () {
        const me = this;
        me.getBalanceGrid().getStore().addListener('metachange', this.doMetachange, this);
        me.doSearch();
    },

    doSearch: function () {
        const me = this;
        let store = me.getBalanceGrid().getStore();
      
            store.getProxy().url = '../api/v1/caisse/balancesalecash/carnet';
        
        store.load({
            params: {
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue()

            }
        });
    },
    buildSummary: function (rec) {
        const me = this;
        me.getMontantTTC().setValue(rec.montantTTC);
        me.getMontantAchat().setValue(rec.montantAchat);
        me.getRatioVA().setValue(rec.ratioVA);
        me.getFondCaisse().setValue(rec.fondCaisse);
        me.getMontantRegDiff().setValue(rec.montantRegDiff);
        me.getMontantRegleTp().setValue(rec.montantRegleTp);
        me.getMontantSortie().setValue(rec.montantSortie);
        me.getMontantEntre().setValue(rec.montantEntre);
        me.getMontantEsp().setValue(rec.montantEsp);
        me.getPanierMoyen().setValue(rec.panierMoyen);
        me.getNbreVente().setValue(rec.nbreVente);
        me.getMontantCheque().setValue(rec.montantCheque);
        me.getMontantVirement().setValue(rec.montantVirement);
        me.getMarge().setValue(rec.marge);
        me.getMontantMobilePayment().setValue(rec.montantMobilePayment);

    },
    oncheckUg: function () {
        const me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/common/checkug',
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.checkUg = result.data;
                }
            }

        });
    },
    onReady: function () {
        const me = this;
        me.oncheckUg();
    }
});