/* global Ext */

Ext.define('testextjs.controller.VisualisationCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.caisseManager.Visualisation'],
    refs: [{
            ref: 'visualisercaissemanager',
            selector: 'visualisercaissemanager'
        },
        {
            ref: 'visualisationGrid',
            selector: 'visualisercaissemanager visualisationGrid'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'visualisercaissemanager visualisationGrid pagingtoolbar'
        }

        , {
            ref: 'startDateField',
            selector: 'visualisercaissemanager #startDate'
        }, {
            ref: 'endDateField',
            selector: 'visualisercaissemanager  #endDate'
        }, {
            ref: 'reglementComboField',
            selector: 'visualisercaissemanager  #reglement'
        }, {ref: 'userComboField',
            selector: 'visualisercaissemanager #user'
        }, /* {
         ref: 'usernameField',
         selector: 'visualisercaissemanager userform textfield[name=username]'
         },*/
        {ref: 'rechercherButton',
            selector: 'visualisercaissemanager #rechercher'

        },
        {ref: 'endField',
            selector: 'visualisercaissemanager #endH'

        },
        {ref: 'startField',
            selector: 'visualisercaissemanager #startH'

        },
        {ref: 'caisseData',
            selector: 'visualisercaissemanager visualisationGrid #caisseStore'

        }


    ],
    init: function (application) {
        this.control({
            'visualisercaissemanager visualisationGrid pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'visualisercaissemanager #rechercher': {
                click: this.doSearch
            },
            'visualisercaissemanager #reglement': {
                select: this.doSearch
            },
            'visualisercaissemanager #user': {
                select: this.doSearch
            },
            'visualisercaissemanager visualisationGrid': {
//                render:
//                doMetachange: this.doMetachange,
                viewready: this.doInitStore
            }

        });
    },

    doMetachange: function (store, meta) {
        var me = this;
        var bottom = me.getVisualisercaissemanager().getDockedItems('toolbar[dock="bottom"]');
        if (bottom.length > 0) {
            me.getVisualisercaissemanager().removeDocked(bottom[0]);
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
                items.push({
                    xtype: 'displayfield',
                    fieldLabel: e.modeReglement,
//                    labelWidth: e.modeReglement.toString().length * 8,
                    margin: '0 10 0 0',
                    flex: 1,
                    renderer: function (v) {
                        if (e.amount < 0) {

                            v = Ext.util.Format.number((-1) * v, '0,000.');
                            return '-' + v;
                        } else {

                            return Ext.util.Format.number(v, '0,000.');

                        }
                    },
                    fieldStyle: style,

                    value: e.amount
                });
            });

            me.getVisualisercaissemanager().addDocked({
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
        var myProxy = me.getVisualisationGrid().getStore().getProxy();

        myProxy.params = {
            user: null,
            reglement: null,
            startDate: null,
            endDate: null,
            startH: null,
            endH: null,
            findClient: true
        };
        myProxy.setExtraParam('user', me.getUserComboField().getValue());
        myProxy.setExtraParam('startDate', me.getStartDateField().getSubmitValue());
        myProxy.setExtraParam('endDate', me.getEndDateField().getSubmitValue());
        myProxy.setExtraParam('startH', me.getStartField().getSubmitValue());
        myProxy.setExtraParam('endH', me.getEndField().getSubmitValue());
        myProxy.setExtraParam('reglement', me.getReglementComboField().getValue());
        myProxy.setExtraParam('findClient', true);
    },

    doInitStore: function () {
        var me = this;
        me.getVisualisationGrid().getStore().addListener('metachange', this.doMetachange, this);
        me.doSearch();

    },
   
    doSearch: function () {
        var me = this;

        me.getVisualisationGrid().getStore().load({
            params: {
                user: me.getUserComboField().getValue(),
                reglement: me.getReglementComboField().getValue(),
                startDate: me.getStartDateField().getSubmitValue(),
                endDate: me.getEndDateField().getSubmitValue(),
                startH: me.getStartField().getSubmitValue(),
                endH: me.getEndField().getSubmitValue(),
                findClient: true
            }
        });
    }
});