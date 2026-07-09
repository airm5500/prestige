/* global Ext */

Ext.define('testextjs.controller.CashmovementCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.caisseManager.Cashmovement'],
    refs: [{
            ref: 'cashmovements',
            selector: 'cashmovements'
        },
        {
            ref: 'imprimerBtn',
            selector: 'cashmovements #imprimer'
        },
        {
            ref: 'cashGrid',
            selector: 'cashmovements gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'cashmovements gridpanel pagingtoolbar'
        }

        , {
            ref: 'dtStart',
            selector: 'cashmovements #dtStart'
        }, {
            ref: 'dtEnd',
            selector: 'cashmovements #dtEnd'
        },
        {ref: 'rechercherButton',
            selector: 'cashmovements #rechercher'

        },
        {
            ref: 'user',
            selector: 'cashmovements #user'
        },
        {
            ref: 'typeMvt',
            selector: 'cashmovements #typeMvt'
        }


    ],
    init: function (application) {
        this.control({
            'cashmovements gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'cashmovements #rechercher': {
                click: this.doSearch
            },
            'cashmovements #imprimer': {
                click: this.onPdfClick
            },
            'cashmovements gridpanel': {
                viewready: this.doInitStore
            }, 'cashmovements #user': {
                select: this.doSearch
            }, 'cashmovements #typeMvt': {
                select: this.doSearch
            }
        });
    },
    onQuery: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var me = this;
            me.doSearch();
        }
    },
    onPdfClick: function () {
        var me = this;
        var dtStart = me.getDtStart().getSubmitValue();
        var dtEnd = me.getDtEnd().getSubmitValue();
        var user = me.getUser().getValue();
        var typeMvt = me.getTypeMvt().getValue();
        var linkUrl = '../BalancePdfServlet?mode=MVT_CAISSE&dtStart=' + dtStart + '&dtEnd=' + dtEnd + '&user=' + user
                + '&typeMvtId=' + typeMvt;
        window.open(linkUrl);
    },

    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getCashGrid().getStore().getProxy();
        myProxy.params = {
            dtEnd: null,
            dtStart: null,
            user: null,
            typeMvtId: null


        };
         var user=me.getUser().getValue();
        myProxy.setExtraParam('user', user);
        myProxy.setExtraParam('typeMvtId', me.getTypeMvt().getValue());
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
    },
    doInitStore: function () {
        var me = this;
        me.doSearch();
    },
    doSearch: function () {
        var me = this;
        var user=me.getUser().getValue();
        me.getCashGrid().getStore().load({
            params: {
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue(),
                user: user,
                typeMvtId: me.getTypeMvt().getValue()
            }
        });
    }

});