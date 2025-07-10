/* global Ext */

Ext.define('testextjs.controller.ProuduitsVenteAnnulesCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.produits.ProuduitsVenteAnnules'],
    refs: [{
            ref: 'venteproduitannules',
            selector: 'venteproduitannules'
        },
        {
            ref: 'imprimerBtn',
            selector: 'venteproduitannules #imprimer'
        },

        {
            ref: 'itemGrid',
            selector: 'venteproduitannules gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'venteproduitannules gridpanel pagingtoolbar'
        }

        , {
            ref: 'startDateField',
            selector: 'venteproduitannules #dtStart'
        }, {
            ref: 'endDateField',
            selector: 'venteproduitannules #dtEnd'
        }, {ref: 'userComboField',
            selector: 'venteproduitannules #user'
        },
        {ref: 'rechercherButton',
            selector: 'venteproduitannules #rechercher'

        },
        {ref: 'btnInventaire',
            selector: 'venteproduitannules #doInventaire'

        }
    ],
    init: function (application) {
        this.control({
            'venteproduitannules gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'venteproduitannules #rechercher': {
                click: this.doSearch
            },
            'venteproduitannules #imprimer': {
                click: this.onPdfClick
            }, 'venteproduitannules #doInventaire': {
                click: this.doInventaire
            },

            'venteproduitannules #user': {
                select: this.doSearch
            },
            'venteproduitannules gridpanel': {
                viewready: this.doInitStore
            }

        });
    },
    onPdfClick: function () {
        const me = this;
        let user = me.getUserComboField().getValue();
        if (!user) {
            user = '';
        }
        const startDate = me.getStartDateField().getSubmitValue();
        const endDate = me.getEndDateField().getSubmitValue();
        const linkUrl = '../StatProduitServlet?mode=articleAnnules&userId=' + user + '&dtStart=' + startDate + '&dtEnd=' + endDate;
        window.open(linkUrl);
    },

    doBeforechange: function (page, currentPage) {
        const me = this;
        const myProxy = me.getItemGrid().getStore().getProxy();
        myProxy.params = {
            userId: null,
            dtEnd: null,
            dtStart: null
        };
        myProxy.setExtraParam('userId', me.getUserComboField().getValue());
        myProxy.setExtraParam('dtStart', me.getStartDateField().getSubmitValue());
        myProxy.setExtraParam('dtEnd', me.getEndDateField().getSubmitValue());
    },

    doInitStore: function () {
        const me = this;
        me.doSearch();

    },

    doSearch: function () {
        const me = this;

        me.getItemGrid().getStore().load({
            params: {
                userId: me.getUserComboField().getValue(),
                dtStart: me.getStartDateField().getSubmitValue(),
                dtEnd: me.getEndDateField().getSubmitValue()
            }
        });
    },

    doInventaire: function () {
        const me = this;
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/inventaire/produit-annules',
            params: {
                dtStart: me.getStartDateField().getSubmitValue(),
                dtEnd: me.getEndDateField().getSubmitValue(),
                userId: me.getUserComboField().getValue()
            },
            success: function (response, options) {
                progress.hide();
                const res = Ext.JSON.decode(response.responseText, true);
                Ext.Msg.alert("Message", "Nombre de produits en compte <b>" + Ext.util.Format.number(res.itemCount, '0,000.') + '</b>');

            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert("Message", 'Un problème s\'est produit avec le server ' + response.status);
            }

        });
    }
});