/* global Ext */

Ext.define('testextjs.controller.VingthManagerCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.Report.vingtquatrevingt.VingthManager'],
    refs: [{
            ref: 'vingtquatrevingt',
            selector: 'vingtquatrevingt'
        },

        {
            ref: 'myGrid',
            selector: 'vingtquatrevingt gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'vingtquatrevingt gridpanel pagingtoolbar'
        }

        , {
            ref: 'dtStart',
            selector: 'vingtquatrevingt #dtStart'
        }, {
            ref: 'dtEnd',
            selector: 'vingtquatrevingt #dtEnd'
        },
        {ref: 'rechercherButton',
            selector: 'vingtquatrevingt #rechercher'

        },
        {
            ref: 'rayons',
            selector: 'vingtquatrevingt #rayons'
        },
        {
            ref: 'grossiste',
            selector: 'vingtquatrevingt #grossiste'
        },
        {
            ref: 'codeFamile',
            selector: 'vingtquatrevingt #codeFamile'
        },
        {
            ref: 'comboVingt',
            selector: 'vingtquatrevingt #comboVingt'
        }




    ],
    init: function (application) {
        this.control({
            'vingtquatrevingt gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'vingtquatrevingt #rechercher': {
                click: this.doSearch
            },

            'vingtquatrevingt #rayons': {
                select: this.doSearch
            },
            'vingtquatrevingt #grossiste': {
                select: this.doSearch
            },
            'vingtquatrevingt #codeFamile': {
                select: this.doSearch
            },
            'vingtquatrevingt #comboVingt': {
                select: this.doSearch
            },

            'vingtquatrevingt gridpanel': {
                viewready: this.doInitStore
            },
            'vingtquatrevingt #suggestion': {
                click: this.onSuggere
            },
            'vingtquatrevingt #exporter #exporterpdf': {
                click: this.onPdfClick
            },
            'vingtquatrevingt #exporter #exporterexcel': {
                click: this.onExportExcel
            }

        });
    },

    onPdfClick: function () {
        const me = this;

        window.open('../Vinght20x80?mode=pdf' + me.buildExportUrl());
    },
    onExportExcel: function () {

        const me = this;

        window.location = '../Vinght20x80?mode=excel' + me.buildExportUrl();
    },

    onSuggere: function () {
        const me = this;

        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/statfamillearticle/suggestionvingtQuatreVingt',
            params: me.buildParams(),
            timeout: 2400000,
            success: function (response, options) {
                progress.hide();
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    Ext.Msg.alert("Message", 'Produits pris en compte ' + result.count);
                }
            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert("Message", 'Erreur !!' + response.status);
            }

        });


    },
    doBeforechange: function (page, currentPage) {
        const me = this;
        const myProxy = me.getMyGrid().getStore().getProxy();
        myProxy.params = {
            dtEnd: null,
            dtStart: null,
            codeGrossiste: null,
            codeRayon: null,
            qtyOrCa: true,
            codeFamile: null

        };
        const codeRayon = me.getRayons().getValue();
        const codeGrossiste = me.getGrossiste().getValue();
        const comboVingt = me.getComboVingt().getValue();
        const codeFamile = me.getCodeFamile().getValue();
        myProxy.setExtraParam('codeRayon', codeRayon);
        myProxy.setExtraParam('codeFamile', codeFamile);
        myProxy.setExtraParam('codeGrossiste', codeGrossiste);
        myProxy.setExtraParam('vingtType', comboVingt);
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
    },
    doInitStore: function () {
        const me = this;
        me.doSearch();
    },
    doSearch: function () {
        const me = this;

        me.getMyGrid().getStore().load({
            params: me.buildParams()
        });
    },

    buildParams: function () {
        const me = this;
        const codeRayon = me.getRayons().getValue();
        const codeGrossiste = me.getGrossiste().getValue();
        const comboVingt = me.getComboVingt().getValue();
        const codeFamile = me.getCodeFamile().getValue();
        return    {
            dtStart: me.getDtStart().getSubmitValue(),
            dtEnd: me.getDtEnd().getSubmitValue(),
            codeFamile: codeFamile,
            codeRayon: codeRayon,
            codeGrossiste: codeGrossiste,
            vingtType: comboVingt

        };
    },

    buildExportUrl: function () {
        const me = this;


        let codeRayon = me.getRayons().getValue();
        let codeGrossiste = me.getGrossiste().getValue();
        const comboVingt = me.getComboVingt().getValue();
        let codeFamile = me.getCodeFamile().getValue();
        if (codeFamile == null) {
            codeFamile = '';
        }
        if (codeRayon == null) {
            codeRayon = '';
        }
        if (codeGrossiste == null) {
            codeGrossiste = '';
        }
        return  '&dtStart=' + me.getDtStart().getSubmitValue() + '&dtEnd=' + me.getDtEnd().getSubmitValue()
                + '&codeGrossiste=' + codeGrossiste + '&codeRayon=' + codeRayon + '&codeFamile=' + codeFamile
                + '&vingtType=' + comboVingt;

    }

});