/* global Ext */

Ext.define('testextjs.controller.ListeCaisseCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.caisseManager.ListeCaisse'],
    refs: [{
            ref: 'listecaissemanager',
            selector: 'listecaissemanager'
        },
        {
            ref: 'imprimerBtn',
            selector: 'listecaissemanager #imprimer'
        },

        {
            ref: 'listeCaisseGrid',
            selector: 'listecaissemanager listeCaisseGrid'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'listecaissemanager listeCaisseGrid pagingtoolbar'
        }

        , {
            ref: 'startDateField',
            selector: 'listecaissemanager #startDate'
        }, {
            ref: 'endDateField',
            selector: 'listecaissemanager #endDate'
        }, {
            ref: 'reglementComboField',
            selector: 'listecaissemanager #reglement'
        }, {ref: 'userComboField',
            selector: 'listecaissemanager #user'
        }, 
        {ref: 'rechercherButton',
            selector: 'listecaissemanager #rechercher'

        },
        {ref: 'endField',
            selector: 'listecaissemanager #endH'

        },
        {ref: 'startField',
            selector: 'listecaissemanager #startH'

        },
        {ref: 'listecaisseData',
            selector: 'listecaissemanager listeCaisseGrid #listecaisseStore'

        }


    ],
    init: function (application) {
        this.control({
            'listecaissemanager listeCaisseGrid pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'listecaissemanager #rechercher': {
                click: this.doSearch
            },
            'listecaissemanager #imprimer': {
                click: this.onPdfClick
            },

            'listecaissemanager #reglement': {
                select: this.doSearch
            },
            'listecaissemanager #user': {
                select: this.doSearch
            },
            'listecaissemanager listeCaisseGrid': {
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
        const startH = me.getStartField().getSubmitValue();
        const endH = me.getEndField().getSubmitValue();
        let reglement = me.getReglementComboField().getValue();
        if (!reglement) {
            reglement = '';
        }
        
//        const linkUrl = '../BalancePdfServlet?mode=LISTECAISSE&user=' + user + '&startDate=' + startDate + '&endDate=' + endDate + '&startH=' + startH + '&endH=' + endH + '&reglement=' + reglement;
        const linkUrl = '../BalancePdfServlet?mode=LISTECAISSE_V2&user=' + user + '&startDate=' + startDate + '&endDate=' + endDate + '&startH=' + startH + '&endH=' + endH + '&reglement=' + reglement;
        window.open(linkUrl);
    },
    doMetachange: function (store, meta) {
        var me = this;
        var bottom = me.getListecaissemanager().getDockedItems('toolbar[dock="bottom"]');
        if (bottom.length > 0) {
            me.getListecaissemanager().removeDocked(bottom[0]);
        }
        if (meta.length > 0) {
            var items = [];
            var style = "color:blue;font-weight:600;";
            meta.forEach(function (e) {
                if (e.amount < 0) {
                    style = "color:red;font-weight:600;";
                } else {
                    style = "color:blue;font-weight:600;";

                }

                items.push(
                        {
                    xtype: 'displayfield',
                    fieldLabel: e.modeReglement,
//                    labelWidth: e.modeReglement.toString().length * 8,
                    margin: '0 10 0 0',
                    flex: 1,
                    value: e.amount,
                    renderer: function (v) {
                        if (e.amount < 0) {

                            v = Ext.util.Format.number((-1) * v, '0,000.');
                            return '-' + v;
                        } else {

                            return Ext.util.Format.number(v, '0,000.');

                        }

                    },
                    fieldStyle: style
                });
            });

            me.getListecaissemanager().addDocked({
                xtype: 'toolbar',
//            ui: 'navigation',
                layout: {
                    pack: 'center',
                    type: 'hbox'
                },
                dock: 'bottom',
                items: items
            });
        }

    },
    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getListeCaisseGrid().getStore().getProxy();

        myProxy.params = {
            user: null,
            reglement: null,
            startDate: null,
            endDate: null,
            startH: null,
            endH: null,
            findClient: false
        };
        myProxy.setExtraParam('findClient', false);
        myProxy.setExtraParam('user', me.getUserComboField().getValue());
        myProxy.setExtraParam('startDate', me.getStartDateField().getSubmitValue());
        myProxy.setExtraParam('endDate', me.getEndDateField().getSubmitValue());
        myProxy.setExtraParam('startH', me.getStartField().getSubmitValue());
        myProxy.setExtraParam('endH', me.getEndField().getSubmitValue());
        myProxy.setExtraParam('reglement', me.getReglementComboField().getValue());
    },

    doInitStore: function () {
        var me = this;
        me.getListeCaisseGrid().getStore().addListener('metachange', this.doMetachange, this);
        me.doSearch();

    },

    doSearch: function () {
        var me = this;

        me.getListeCaisseGrid().getStore().load({
            params: {
                user: me.getUserComboField().getValue(),
                reglement: me.getReglementComboField().getValue(),
                startDate: me.getStartDateField().getSubmitValue(),
                endDate: me.getEndDateField().getSubmitValue(),
                startH: me.getStartField().getSubmitValue(),
                endH: me.getEndField().getSubmitValue(),
                findClient: false
            }
        });
    }
});