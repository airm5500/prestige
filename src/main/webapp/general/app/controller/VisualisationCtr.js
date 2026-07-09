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
        var bottom = me.getVisualisercaissemanager().getDockedItems('#caisseTotauxBar');
        if (bottom.length > 0) {
            me.getVisualisercaissemanager().removeDocked(bottom[0]);
        }
        if (meta.length > 0) {
            var items = [];
            /* chaque total prend sa largeur naturelle et la barre passe a la
             * ligne si necessaire : plus de chevauchement libelle/montant
             * quand tous les modes de reglement sont utilises */
            meta.forEach(function (e) {
                var style = e.amount < 0 ? 'color:red;font-weight:600;' : 'color:blue;font-weight:600;';
                var montant = e.amount < 0
                        ? '-' + Ext.util.Format.number((-1) * e.amount, '0,000.')
                        : Ext.util.Format.number(e.amount, '0,000.');
                items.push({
                    xtype: 'component',
                    padding: '3 16 3 0',
                    html: '<span style="font-weight:600;white-space:nowrap;">' + Ext.String.htmlEncode(e.modeReglement)
                            + ':&nbsp;<span style="' + style + '">' + montant + '</span></span>'
                });
            });

            me.getVisualisercaissemanager().addDocked({
                xtype: 'container',
                itemId: 'caisseTotauxBar',
                cls: 'x-toolbar x-toolbar-default',
                padding: '2 8 2 8',
                layout: 'column',
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