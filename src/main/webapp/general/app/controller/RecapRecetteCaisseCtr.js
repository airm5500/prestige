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
            selector: 'caisserecetterecap #caisserecetterecapGrid pagingtoolbar'
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
            /* Selecteurs precis : depuis l'ajout de l'onglet « Suivi des modes de reglement »,
               l'ecran porte DEUX grilles. « caisserecetterecap gridpanel » aurait rendu la
               premiere venue, ce qui tient tant que l'ordre des onglets ne bouge pas - une
               dependance invisible qu'on ne veut pas laisser. */
            ref: 'caisserecetterecapGrid',
            selector: 'caisserecetterecap #caisserecetterecapGrid'
        },
        {
            ref: 'grilleModes',
            selector: 'caisserecetterecap #grilleModes'
        },
        {
            ref: 'courbeModes',
            selector: 'caisserecetterecap #courbeModes'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'caisserecetterecap #caisserecetterecapGrid pagingtoolbar'
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
            'caisserecetterecap #caisserecetterecapGrid pagingtoolbar': {
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
            'caisserecetterecap #caisserecetterecapGrid': {
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
        me.chargerModes();
    },

    /* Suivi des modes de reglement (point 22) : la synthese et la courbe suivent la MEME periode
       que le tableau. Le filtre par type de reglement n'est volontairement pas repris : cet onglet
       repond a « comment mes clients paient-ils ? », question qui perd son sens si l'on ne regarde
       qu'un mode. */
    chargerModes: function () {
        const me = this;
        const grille = me.getGrilleModes();
        if (!grille) {
            return;
        }
        grille.getStore().load({
            params: {
                dtStart: me.getStartDateField().getSubmitValue(),
                dtEnd: me.getEndDateField().getSubmitValue(),
                groupByYear: me.getGroupByYear().checked
            },
            callback: function (enregistrements, operation, succes) {
                const json = (operation.response && Ext.JSON.decode(operation.response.responseText, true)) || {};
                me.construireCourbeModes(json);
            }
        });
    },

    construireCourbeModes: function (json) {
        const me = this;
        const panneau = me.getCourbeModes();
        if (!panneau) {
            return;
        }
        const tranches = json.tranches || [];
        const series = json.series || [];
        panneau.removeAll(true);
        panneau.update('');
        if (!tranches.length || !series.length) {
            panneau.update('<div style="margin:20px;color:#666;">Aucun encaissement sur la période.</div>');
            return;
        }
        /* Magasin transpose : une ligne par tranche de temps, un champ par mode. C'est la forme
           qu'attend le traceur, alors que le serveur rend une serie par mode. */
        const champs = ['periode'].concat(series.map(function (s, i) {
            return {name: 'm' + i, type: 'number'};
        }));
        const donnees = tranches.map(function (tranche, rang) {
            const ligne = {periode: String(tranche)};
            series.forEach(function (s, i) {
                ligne['m' + i] = (s.points || [])[rang] || 0;
            });
            return ligne;
        });
        const store = Ext.create('Ext.data.Store', {fields: champs, data: donnees});
        panneau.add(Ext.create('Ext.chart.Chart', {
            itemId: 'courbe',
            style: 'background:#fff',
            animate: true,
            insetPadding: 30,
            store: store,
            // Legende demandee en recette : sans elle, une courbe a six modes ne se lit pas.
            legend: {position: 'bottom'},
            axes: [{
                    type: 'Numeric',
                    position: 'left',
                    minimum: 0,
                    grid: true,
                    fields: series.map(function (s, i) {
                        return 'm' + i;
                    }),
                    title: 'Montant encaissé',
                    label: {renderer: Ext.util.Format.numberRenderer('0,0')}
                }, {
                    type: 'Category',
                    position: 'bottom',
                    fields: ['periode'],
                    title: false
                }],
            series: series.map(function (s, i) {
                return {
                    type: 'line',
                    axis: 'left',
                    xField: 'periode',
                    yField: 'm' + i,
                    title: s.mode,
                    highlight: {size: 6, radius: 6},
                    smooth: false,
                    markerConfig: {type: 'circle', size: 4, radius: 4, 'stroke-width': 0},
                    style: {'stroke-width': 2},
                    // Info-bulle a la valeur EXACTE : la courbe donne la tendance, l'info-bulle le chiffre.
                    tips: {
                        trackMouse: true,
                        width: 320,
                        height: 34,
                        renderer: function (element) {
                            this.setTitle(s.mode + ' - ' + element.get('periode') + ' : '
                                    + Ext.util.Format.number(element.get('m' + i), '0,000'));
                        }
                    }
                };
            })
        }));
    }
});