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
        var me = this;
        var dtStart = me.getDtStart().getSubmitValue();
        var dtEnd = me.getDtEnd().getSubmitValue();
        var codeRayon = me.getRayons().getValue();
        var codeGrossiste = me.getGrossiste().getValue();
        var comboVingt = me.getComboVingt().getValue();
        var codeFamile = me.getCodeFamile().getValue();
        if (codeFamile == null) {
            codeFamile = '';
        }
        if (codeRayon == null) {
            codeRayon = '';
        }
        if (codeGrossiste == null) {
            codeGrossiste = '';
        }
        var qtyOrCa = (comboVingt === 'Quantite');
        var linkUrl = '../Vinght20x80?mode=pdf&dtStart=' + dtStart + '&dtEnd=' + dtEnd
                + '&codeGrossiste=' + codeGrossiste + '&codeRayon=' + codeRayon + '&codeFamile=' + codeFamile
                + '&qtyOrCa=' + qtyOrCa;
        window.open(linkUrl);
    },
    onExportExcel: function () {

        const me = this;
        const dtStart = me.getDtStart().getSubmitValue();
        const dtEnd = me.getDtEnd().getSubmitValue();
        let codeRayon = me.getRayons().getValue();
        let codeGrossiste = me.getGrossiste().getValue();
        let comboVingt = me.getComboVingt().getValue();
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
        const qtyOrCa = (comboVingt === 'Quantite');

        window.location = '../Vinght20x80?mode=excel&dtStart=' + dtStart + '&dtEnd=' + dtEnd
                + '&codeGrossiste=' + codeGrossiste + '&codeRayon=' + codeRayon + '&codeFamile=' + codeFamile
                + '&qtyOrCa=' + qtyOrCa;
    },

    onSuggere: function () {
        var me = this;
        var dtStart = me.getDtStart().getSubmitValue();
        var dtEnd = me.getDtEnd().getSubmitValue();
        var codeRayon = me.getRayons().getValue();
        var codeGrossiste = me.getGrossiste().getValue();
        var comboVingt = me.getComboVingt().getValue();
        var codeFamile = me.getCodeFamile().getValue();
        var qtyOrCa = (comboVingt === 'Quantite');
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/statfamillearticle/suggestionvingtQuatreVingt',
            params: {
                dtStart: dtStart,
                dtEnd: dtEnd,
                codeRayon: codeRayon,
                codeGrossiste: codeGrossiste,
                codeFamile: codeFamile,
                qtyOrCa: qtyOrCa
            },
            timeout: 2400000,
            success: function (response, options) {
                progress.hide();
                var result = Ext.JSON.decode(response.responseText, true);
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
        var me = this;
        var myProxy = me.getMyGrid().getStore().getProxy();
        myProxy.params = {
            dtEnd: null,
            dtStart: null,
            codeGrossiste: null,
            codeRayon: null,
            qtyOrCa: true,
            codeFamile: null

        };
        var codeRayon = me.getRayons().getValue();
        var codeGrossiste = me.getGrossiste().getValue();
        var comboVingt = me.getComboVingt().getValue();
        var codeFamile = me.getCodeFamile().getValue();
        myProxy.setExtraParam('codeRayon', codeRayon);
        myProxy.setExtraParam('codeFamile', codeFamile);
        myProxy.setExtraParam('codeGrossiste', codeGrossiste);
        myProxy.setExtraParam('qtyOrCa', (comboVingt === 'Quantite'));
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
    },
    doInitStore: function () {
        var me = this;
        me.doSearch();
    },
    doSearch: function () {
        var me = this;
        var codeRayon = me.getRayons().getValue();
        var codeGrossiste = me.getGrossiste().getValue();
        var comboVingt = me.getComboVingt().getValue();
        var codeFamile = me.getCodeFamile().getValue();
        me.getMyGrid().getStore().load({
            params: {
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue(),
                codeFamile: codeFamile,
                codeRayon: codeRayon,
                codeGrossiste: codeGrossiste,
                qtyOrCa: (comboVingt === 'Quantite')

            }
        });
    }

});