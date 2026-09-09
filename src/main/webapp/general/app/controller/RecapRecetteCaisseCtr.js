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
        {ref: 'groupByMonth',
            selector: 'caisserecetterecap #groupByMonth'

        },
        {ref: 'btnExcel',
            selector: 'caisserecetterecap #btnExcel'

        },
        {ref: 'recapModesCa',
            selector: 'caisserecetterecap #recapModesCa'
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
            },
            /* Point 16 : « Annuelle » et « Mensuelle » s'excluent. Cocher l'une decoche l'autre ;
               ne rien cocher garde le detail par jour, comportement d'origine de l'ecran. */
            'caisserecetterecap #groupByYear': {
                change: this.surRegroupementAnnuel
            },
            'caisserecetterecap #groupByMonth': {
                change: this.surRegroupementMensuel
            }

        });
    },
    surRegroupementAnnuel: function (champ, valeur) {
        const mensuel = this.getGroupByMonth();
        if (valeur && mensuel && mensuel.getValue()) {
            mensuel.setValue(false);
        }
    },

    surRegroupementMensuel: function (champ, valeur) {
        const annuel = this.getGroupByYear();
        if (valeur && annuel && annuel.getValue()) {
            annuel.setValue(false);
        }
    },

    /* Regroupement demande : « annee », « mois », ou « jour » quand rien n'est coche. */
    granularite: function () {
        const me = this;
        if (me.getGroupByYear() && me.getGroupByYear().getValue()) {
            return 'annee';
        }
        if (me.getGroupByMonth() && me.getGroupByMonth().getValue()) {
            return 'mois';
        }
        return 'jour';
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
        const linkUrl = '../RecapRecetteCaisseServlet?typeRglementId=' + reglement + '&dtStart=' + dtStart
                + '&dtEnd=' + dtEnd + '&groupByYear=' + groupByYear + '&granularite=' + me.granularite();
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
        /* Point 16 : le bouton existant rend maintenant un vrai classeur .xlsx, et non plus un .csv
           qu'Excel ouvrait en devinant separateurs et formats. */
        window.location = '../api/v1/stats-recette-caisse/export-excel?typeRglementId=' + reglement
                + '&dtStart=' + dtStart + '&dtEnd=' + dtEnd + '&groupByYear=' + groupByYear
                + '&granularite=' + me.granularite();
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
        myProxy.setExtraParam('granularite', me.granularite());
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
                granularite: me.granularite(),
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
                const json = (operation.response && Ext.JSON.decode(operation.response.responseText, true))
                        || grille.getStore().getProxy().getReader().rawData || {};
                me.construireCourbeModes(json);
                me.afficherRecapModesCa(json);
            }
        });
    },

    /**
     * Le recap sous le tableau (retour du 09/09, point 7) : la part de chaque mode de reglement dans
     * le chiffre d'affaires realise. Le mobile money est donne en global, puis par operateur ; le
     * credit (part restee due par les organismes) ferme la liste.
     */
    afficherRecapModesCa: function (json) {
        const me = this;
        const panneau = me.getRecapModesCa();
        if (!panneau || panneau.isDestroyed) {
            return;
        }
        const modes = json.data || [];
        const ca = json.chiffreAffaires || 0;
        const montant = function (v) {
            return Ext.util.Format.number(v || 0, '0,000');
        };
        const part = function (v) {
            return Ext.util.Format.number(v || 0, '0.0') + ' %';
        };
        if (!ca && !modes.length) {
            panneau.update('<span class="rm-titre">Part des modes de r&egrave;glement dans le CA :</span> '
                    + '<span style="color:#7f8c8d;">aucune vente sur la p&eacute;riode.</span>');
            return;
        }
        const morceaux = [];
        Ext.each(modes, function (m) {
            if (!m.mobile) {
                morceaux.push('<span class="rm-mode">' + Ext.String.htmlEncode(m.mode) + ' <b>' + part(m.partCa)
                        + '</b> <span class="rm-operateur">(' + montant(m.montant) + ')</span></span>');
            }
        });
        const operateurs = modes.filter(function (m) {
            return m.mobile;
        }).map(function (m) {
            return Ext.String.htmlEncode(m.mode) + ' ' + part(m.partCa);
        });
        morceaux.push('<span class="rm-mode">Mobile money <b>' + part(json.partMobileCa) + '</b> <span class="rm-operateur">('
                + montant(json.totalMobile) + (operateurs.length ? ' : ' + operateurs.join(', ') : '') + ')</span></span>');
        if (json.montantCredit) {
            morceaux.push('<span class="rm-mode">Cr&eacute;dit <b>' + part(json.partCreditCa)
                    + '</b> <span class="rm-operateur">(' + montant(json.montantCredit) + ')</span></span>');
        }
        panneau.update('<span class="rm-titre">Part des modes de r&egrave;glement dans le CA r&eacute;alis&eacute; ('
                + montant(ca) + ') :</span> ' + morceaux.join(''));
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