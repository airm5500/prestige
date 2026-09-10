/* global Ext */

/*
 * Balance vente / caisse.
 *
 * Retour des tests du 09/09 : chaque onglet a sa propre recherche (dates, et selecteur de periode
 * sur les deux onglets d'analyse) ; la grille Balance n'est plus paginee ; l'analyse comparative
 * porte les taux d'evolution, un total general, un graphique ; l'evolution par mode porte ses taux ;
 * les barres du bas (affichage historique) ne s'affichent que sur l'onglet Balance.
 */
Ext.define('testextjs.controller.BalanceVenteCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.caisseManager.balance.BalanceSaleCash'],
    refs: [
        {ref: 'balancesalecahs', selector: 'balancesalecahs'},
        {ref: 'imprimerBtn', selector: 'balancesalecahs #imprimer'},
        {ref: 'balanceGrid', selector: 'balancesalecahs #balanceGrid'},
        {ref: 'balanceGridAncienne', selector: 'balancesalecahs #balanceGridAncienne'},
        {ref: 'dtStart', selector: 'balancesalecahs #dtStart'},
        {ref: 'dtEnd', selector: 'balancesalecahs #dtEnd'},
        {ref: 'rechercherButton', selector: 'balancesalecahs #rechercher'},
        {ref: 'typePeriode', selector: 'balancesalecahs #typePeriode'},
        {ref: 'ongletsBalance', selector: 'balancesalecahs #ongletsBalance'},
        {ref: 'ventilationBalance', selector: 'balancesalecahs #ventilationBalance'},
        {ref: 'grilleAnalyse', selector: 'balancesalecahs #grilleAnalyse'},
        {ref: 'grilleModesBalance', selector: 'balancesalecahs #grilleModes'},
        {ref: 'graphiqueAnalyse', selector: 'balancesalecahs #graphiqueAnalyse'},
        {ref: 'montantTTC', selector: 'balancesalecahs #montantTTC'},
        {ref: 'montantAchat', selector: 'balancesalecahs #montantAchat'},
        {ref: 'ratioVA', selector: 'balancesalecahs #ratioVA'},
        {ref: 'fondCaisse', selector: 'balancesalecahs #fondCaisse'},
        {ref: 'montantMobilePayment', selector: 'balancesalecahs #montantMobilePayment'},
        {ref: 'montantRegDiff', selector: 'balancesalecahs #montantRegDiff'},
        {ref: 'montantRegleTp', selector: 'balancesalecahs #montantRegleTp'},
        {ref: 'montantSortie', selector: 'balancesalecahs #montantSortie'},
        {ref: 'montantEntre', selector: 'balancesalecahs #montantEntre'},
        {ref: 'montantEsp', selector: 'balancesalecahs #montantEsp'},
        {ref: 'panierMoyen', selector: 'balancesalecahs #panierMoyen'},
        {ref: 'nbreVente', selector: 'balancesalecahs #nbreVente'},
        {ref: 'montantCheque', selector: 'balancesalecahs #montantCheque'},
        {ref: 'montantVirement', selector: 'balancesalecahs #montantVirement'},
        {ref: 'marge', selector: 'balancesalecahs #marge'}
    ],
    config: {
        checkUg: false
    },

    init: function (application) {
        this.control({
            'balancesalecahs': {afterrender: this.chargerPrivileges},
            'balancesalecahs #rechercher': {click: this.doSearch},
            'balancesalecahs #imprimer': {click: this.imprimerBalance},
            // La grille de la nouvelle presentation est cachee : c'est le document de ventilation, une
            // fois rendu, qui declenche la premiere recherche.
            'balancesalecahs #ventilationBalance': {afterrender: this.doInitStore},
            'balancesalecahs #ongletsBalance': {tabchange: this.surChangementOnglet},
            // onglet cache « Balance (ancienne) » : l'ancienne presentation complete
            'balancesalecahs #rechercherAncienne': {click: this.doSearchAncienne},
            'balancesalecahs #imprimerAncienne': {click: this.onPdfClick},
            'balancesalecahs #balanceGridAncienne': {viewready: this.doInitStoreAncienne},
            // onglet Analyse comparative
            'balancesalecahs #rechercherAnalyse': {click: this.chargerAnalyse},
            'balancesalecahs #typePeriode': {select: this.chargerAnalyse},
            'balancesalecahs #analyseExporter': {click: this.exporterAnalyse},
            'balancesalecahs #analyseImprimer': {click: this.imprimerAnalyse},
            'balancesalecahs #indicateurGraphique': {select: this.surChangementIndicateur},
            // onglet Evolution par mode de paiement
            'balancesalecahs #rechercherModes': {click: this.chargerModes},
            'balancesalecahs #typePeriodeModes': {select: this.chargerModes},
            'balancesalecahs #modesImprimer': {click: this.imprimerModes},
            'balancesalecahs #modesExporter': {click: this.exporterModes}
        });
    },

    /* ------------------------------------------------------------------ onglet Balance */

    /** L'onglet « Balance (ancienne) » n'apparait qu'avec le privilege P_BALANCE_ANCIENNE_PRESENTATION. */
    chargerPrivileges: function (ecran) {
        Ext.Ajax.request({
            url: '../api/v1/balance/balancesalecash/privileges',
            method: 'GET',
            success: function (reponse) {
                const objet = Ext.JSON.decode(reponse.responseText, true) || {};
                const onglet = ecran && !ecran.isDestroyed ? ecran.down('#ongletBalanceAncienne') : null;
                if (onglet && objet.anciennePresentation) {
                    onglet.tab.show();
                }
            }
        });
    },

    /** L'edition historique (ancien modele), depuis l'onglet « Balance (ancienne) ». */
    onPdfClick: function () {
        let me = this;
        const ecran = me.getBalancesalecahs();
        const du = ecran ? ecran.down('#dtStartAncienne') : null;
        const au = ecran ? ecran.down('#dtEndAncienne') : null;
        if (!du || !au) {
            return;
        }
        let checkug = me.getCheckUg();
        window.open('../BalancePdfServlet?mode=BALANCE&dtStart=' + du.getSubmitValue() + '&dtEnd=' + au.getSubmitValue()
                + '&checkug=' + checkug);
    },

    /** L'edition de la nouvelle presentation, sur son propre modele, en flux dans le clic. */
    imprimerBalance: function () {
        const me = this;
        if (!me.getDtStart() || !me.getDtEnd()) {
            return;
        }
        window.open('../api/v1/balance/balancesalecash/pdf?' + Ext.Object.toQueryString({
            dtStart: me.getDtStart().getSubmitValue(),
            dtEnd: me.getDtEnd().getSubmitValue()
        }));
    },

    doMetachange: function (store, meta) {
        this.buildSummary(meta);
    },

    doInitStore: function () {
        const me = this;
        if (!me.getBalanceGrid()) {
            return;
        }
        const store = me.getBalanceGrid().getStore();
        // La ventilation et la synthese voyagent dans la meme reponse que la grille, sous des cles
        // que le lecteur du magasin ignore. Elles sont relues ici.
        store.addListener('load', this.afficherVentilation, this);
        me.doSearch();
    },

    doInitStoreAncienne: function () {
        const me = this;
        const grille = me.getBalanceGridAncienne();
        if (!grille) {
            return;
        }
        grille.getStore().addListener('metachange', this.doMetachange, this);
        me.doSearchAncienne();
    },

    doSearchAncienne: function () {
        const me = this;
        const ecran = me.getBalancesalecahs();
        const grille = me.getBalanceGridAncienne();
        const du = ecran ? ecran.down('#dtStartAncienne') : null;
        const au = ecran ? ecran.down('#dtEndAncienne') : null;
        if (!grille || !du || !au) {
            return;
        }
        grille.getStore().load({params: {dtStart: du.getSubmitValue(), dtEnd: au.getSubmitValue()}});
    },

    doSearch: function () {
        const me = this;
        // Un controleur ExtJS est global : ses « refs » ne designent un composant que tant qu'un
        // ecran est ouvert. Ne rien faire quand il est ferme est la bonne reponse.
        if (!me.getBalanceGrid() || !me.getDtStart() || !me.getDtEnd()) {
            return;
        }
        me.getBalanceGrid().getStore().load({
            params: {
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue()
            }
        });
    },

    afficherVentilation: function (store) {
        const me = this;
        const panneau = me.getVentilationBalance();
        if (!panneau || panneau.isDestroyed) {
            return;
        }
        const brut = store.getProxy().getReader().rawData || {};
        const ventilation = brut.ventilation;
        if (!ventilation || !ventilation.comptant) {
            panneau.update('<div style="padding:10px;color:#7f8c8d;">Aucune vente sur la p&eacute;riode.</div>');
            return;
        }
        panneau.update({lignes: brut.data || [], resume: brut.metaData || {}, v: ventilation});
    },

    surChangementOnglet: function (onglets, nouvel) {
        const ecran = this.getBalancesalecahs();
        if (!ecran) {
            return;
        }
        // Un onglet d'analyse ouvert pour la premiere fois se charge de lui-meme.
        if (nouvel && nouvel.itemId === 'ongletAnalyseBalance' && this.getGrilleAnalyse()
                && this.getGrilleAnalyse().getStore().getCount() === 0) {
            this.chargerAnalyse();
        } else if (nouvel && nouvel.itemId === 'ongletModesBalance' && this.getGrilleModesBalance()
                && this.getGrilleModesBalance().getStore().getCount() === 0) {
            this.chargerModes();
        }
    },

    /* ------------------------------------------------------------------ recherche des onglets d'analyse */

    /** Les criteres de l'onglet designe par son suffixe (« Analyse » ou « Modes »). */
    criteres: function (suffixe) {
        const ecran = this.getBalancesalecahs();
        if (!ecran) {
            return null;
        }
        const periode = ecran.down('#typePeriode' + (suffixe === 'Analyse' ? '' : suffixe));
        const du = ecran.down('#dtStart' + suffixe);
        const au = ecran.down('#dtEnd' + suffixe);
        if (!du || !au) {
            return null;
        }
        return {
            typePeriode: periode ? periode.getValue() : 'LIBRE',
            dtStart: du.getSubmitValue(),
            dtEnd: au.getSubmitValue()
        };
    },

    /** Un appel de l'analyse, avec l'indicateur « recherche en cours » sur l'onglet. */
    appelerAnalyse: function (suffixe, onglet, succes) {
        const me = this;
        const params = me.criteres(suffixe);
        if (!params || !onglet) {
            return;
        }
        onglet.setLoading('Recherche en cours...');
        Ext.Ajax.request({
            url: '../api/v1/balance/balancesalecash/analyse',
            method: 'GET',
            params: params,
            timeout: 600000,
            callback: function () {
                if (!onglet.isDestroyed) {
                    onglet.setLoading(false);
                }
            },
            success: function (reponse) {
                if (onglet.isDestroyed) {
                    return;
                }
                succes(Ext.JSON.decode(reponse.responseText, true) || {}, params);
            },
            failure: function () {
                if (!onglet.isDestroyed) {
                    Ext.MessageBox.alert('Erreur', 'L\'analyse n\'a pas pu &ecirc;tre calcul&eacute;e.');
                }
            }
        });
    },

    /* ------------------------------------------------------------------ onglet Analyse comparative */

    chargerAnalyse: function () {
        const me = this;
        const grille = me.getGrilleAnalyse();
        const ecran = me.getBalancesalecahs();
        if (!grille || !ecran) {
            return;
        }
        me.appelerAnalyse('Analyse', ecran.down('#ongletAnalyseBalance'), function (objet, params) {
            ecran.totalAnalyse = objet.totalGeneral || {};
            grille.getStore().loadData(objet.data || []);
            const resume = grille.down('#analyseResume');
            if (resume) {
                resume.setText(objet.comparatif ? me.MESSAGE_COMPARATIF : me.MESSAGE_PERIODE_UNIQUE);
            }
            ecran.graphiqueCourant = objet.graphique;
            me.construireGraphiqueAnalyse(objet.graphique, params.typePeriode);
        });
    },

    /** Le changement d'indicateur redessine le graphique sans rappeler le serveur. */
    surChangementIndicateur: function () {
        const ecran = this.getBalancesalecahs();
        if (ecran && ecran.graphiqueCourant) {
            this.construireGraphiqueAnalyse(ecran.graphiqueCourant);
        }
    },

    /** Rappel affiche au-dessus de l'analyse quand plusieurs periodes sont comparees. */
    MESSAGE_COMPARATIF: 'Les p&eacute;riodes r&eacute;volues sont compl&egrave;tes ; celle en cours '
            + 'est rappel&eacute;e &agrave; part et n&rsquo;est pas comparable telle quelle. Sous chaque montant, '
            + 'son &eacute;volution par rapport &agrave; la p&eacute;riode pr&eacute;c&eacute;dente.',

    /** Une seule periode ne fait pas une comparaison : on le dit plutot que d'afficher des ecarts vides. */
    MESSAGE_PERIODE_UNIQUE: 'Une seule p&eacute;riode : les chiffres bruts sont affich&eacute;s, sans '
            + '&eacute;volution. Choisissez plusieurs p&eacute;riodes pour comparer.',

    /**
     * Le graphique en barres sous l'analyse : mois en abscisse et une barre par annee (3 dernieres
     * annees), jours de la semaine et une barre par semaine (3 dernieres semaines), ou une barre par
     * periode. Avec sa legende.
     */
    construireGraphiqueAnalyse: function (graphique, typePeriode) {
        const me = this;
        const panneau = me.getGraphiqueAnalyse();
        if (!panneau || panneau.isDestroyed) {
            return;
        }
        panneau.removeAll(true);
        panneau.update('');
        const series = (graphique || {}).series || [];
        const categories = (graphique || {}).categories || [];
        if (!series.length || !categories.length) {
            panneau.update('<div style="margin:20px;color:#666;">Aucune vente sur les p&eacute;riodes compar&eacute;es.</div>');
            return;
        }
        // Retours des tests 3 : l'indicateur trace est au choix (net TTC par defaut).
        const ecran = me.getBalancesalecahs();
        const selecteur = ecran ? ecran.down('#indicateurGraphique') : null;
        const indicateur = (selecteur && selecteur.getValue()) || 'montantNet';
        const libelleIndicateur = selecteur && selecteur.getRawValue ? selecteur.getRawValue() : 'Net TTC';
        const champs = ['categorie'].concat(series.map(function (s, i) {
            return {name: 's' + i, type: 'number'};
        }));
        const donnees = categories.map(function (categorie, rang) {
            const ligne = {categorie: categorie};
            series.forEach(function (s, i) {
                const valeurs = (s.valeurs && s.valeurs[indicateur]) || [];
                ligne['s' + i] = valeurs[rang] || 0;
            });
            return ligne;
        });
        const titres = series.map(function (s) {
            return s.libelle === 'Valeur' ? libelleIndicateur : s.libelle;
        });
        // Petites valeurs entieres (nombre de ventes) : une graduation par unite, sans doublon d'arrondi.
        let maximum = 0;
        donnees.forEach(function (ligne) {
            series.forEach(function (s, i) {
                maximum = Math.max(maximum, ligne['s' + i] || 0);
            });
        });
        const axeGauche = {
            type: 'Numeric', position: 'left', fields: series.map(function (s, i) {
                return 's' + i;
            }),
            // Le titre de l'axe est court : un titre long se coupe a la hauteur du graphique ;
            // la lecture (mois par annee, jours par semaine) est dans l'axe du bas et la legende.
            title: libelleIndicateur, grid: true, minimum: 0, decimals: 0,
            label: {renderer: function (v) {
                    return Ext.util.Format.number(v, '0,000');
                }}
        };
        if (maximum > 0 && maximum <= 10) {
            axeGauche.maximum = Math.ceil(maximum);
            // Ext compte (majorTickSteps + 1) intervalles : autant d'intervalles que d'unites.
            axeGauche.majorTickSteps = Math.max(1, Math.ceil(maximum) - 1);
        }
        panneau.add(Ext.create('Ext.chart.Chart', {
            store: Ext.create('Ext.data.Store', {fields: champs, data: donnees}),
            animate: false,
            shadow: false,
            legend: {position: 'bottom'},
            insetPadding: 12,
            axes: [axeGauche, {
                    type: 'Category', position: 'bottom', fields: ['categorie'],
                    title: graphique.type === 'ANNEES' ? 'Mois (une barre par année)'
                            : (graphique.type === 'SEMAINES' ? 'Jour de la semaine (une barre par semaine)' : 'Période')
                }],
            series: [{
                    type: 'column',
                    axis: 'left',
                    xField: 'categorie',
                    yField: series.map(function (s, i) {
                        return 's' + i;
                    }),
                    title: titres,
                    // Retours des tests 3 : des barres plus fines (l'espace entre groupes est en % de la largeur).
                    gutter: 60,
                    groupGutter: 10,
                    tips: {
                        trackMouse: true,
                        width: 240,
                        renderer: function (enregistrement, item) {
                            const i = parseInt(String(item.yField).replace('s', ''), 10);
                            this.setTitle(titres[i] + ' - ' + enregistrement.get('categorie') + ' : '
                                    + Ext.util.Format.number(enregistrement.get(item.yField), '0,000'));
                        }
                    }
                }]
        }));
        panneau.doLayout();
    },

    imprimerAnalyse: function () {
        this.imprimer(this.criteres('Analyse'));
    },

    imprimerModes: function () {
        this.imprimer(this.criteres('Modes'));
    },

    /** L'analyse comparative et l'evolution par mode en PDF, sur leur propre modele (jrxml), en flux. */
    imprimer: function (params) {
        if (!params) {
            return;
        }
        window.open('../api/v1/balance/balancesalecash/analyse/pdf?' + Ext.Object.toQueryString(params));
    },

    exporterAnalyse: function () {
        const params = this.criteres('Analyse');
        if (params) {
            // Un telechargement ne passe pas par Ext.Ajax : le navigateur doit recevoir le fichier.
            window.open('../api/v1/balance/balancesalecash/analyse/excel?' + Ext.Object.toQueryString(params));
        }
    },

    /* ------------------------------------------------------------------ onglet Evolution par mode */

    chargerModes: function () {
        const me = this;
        const grille = me.getGrilleModesBalance();
        const ecran = me.getBalancesalecahs();
        if (!grille || !ecran) {
            return;
        }
        me.appelerAnalyse('Modes', ecran.down('#ongletModesBalance'), function (objet) {
            me.construireEvolutionModes(objet);
        });
    },

    /**
     * Une ligne par periode, une colonne par mode rencontre ; sous chaque montant, son evolution
     * par rapport a la periode precedente ; la ligne TOTAL en bas.
     */
    construireEvolutionModes: function (objet) {
        const me = this;
        const grille = me.getGrilleModesBalance();
        const ecran = me.getBalancesalecahs();
        if (!grille || grille.isDestroyed || !ecran) {
            return;
        }
        const modes = objet.modes || [];
        const lignes = objet.data || [];
        const montant = function (v) {
            return Ext.util.Format.number(v || 0, '0,000');
        };
        const colonneMontant = function (entete, champ, cleEvolution) {
            return {
                header: entete, dataIndex: champ, width: 110, align: 'right',
                renderer: function (v, meta, ligne) {
                    const evolutions = ligne.get('evolutions') || {};
                    return ecran.montantAvecEvolution(v, cleEvolution ? evolutions[cleEvolution] : undefined);
                },
                summaryType: 'sum',
                summaryRenderer: function (v) {
                    return '<b>' + montant(v) + '</b>';
                }
            };
        };
        const champs = ['libelle', {name: 'enCours', type: 'boolean'}, {name: 'evolutions', type: 'auto'},
            {name: 'nbreVente', type: 'int'}, {name: 'montantNet', type: 'int'}, {name: 'montantMobile', type: 'int'},
            {name: 'montantTp', type: 'int'}];
        const colonnes = [{
                header: 'P&eacute;riode', dataIndex: 'libelle', flex: 1, minWidth: 120,
                renderer: function (valeur, meta, ligne) {
                    return ligne.get('enCours') ? valeur + ' <i style="color:#888">(en cours)</i>' : valeur;
                },
                summaryRenderer: function () {
                    return '<b>TOTAL</b>';
                }
            }, {
                header: 'Ventes', dataIndex: 'nbreVente', width: 70, align: 'right',
                renderer: function (v, meta, ligne) {
                    return ecran.montantAvecEvolution(v, (ligne.get('evolutions') || {}).nbreVente);
                },
                summaryType: 'sum',
                summaryRenderer: function (v) {
                    return '<b>' + montant(v) + '</b>';
                }
            }, colonneMontant('Net TTC', 'montantNet', 'montantNet')];
        Ext.each(modes, function (mode, i) {
            champs.push({name: 'mode' + i, type: 'int'});
            // Plus de mention « (mobile) » dans l'en-tete : le libelle du mode suffit.
            colonnes.push(colonneMontant(Ext.String.htmlEncode(mode.libelle), 'mode' + i, 'mode' + i));
        });
        colonnes.push(colonneMontant('Total mobile', 'montantMobile', 'montantMobile'));
        colonnes.push(colonneMontant('Tiers payant', 'montantTp', 'montantTp'));
        const donnees = lignes.map(function (ligne) {
            const evolutions = Ext.apply({}, ligne.evolutions || {});
            const o = {libelle: ligne.libelle, enCours: ligne.enCours, nbreVente: ligne.nbreVente,
                montantNet: ligne.montantNet, montantMobile: ligne.montantMobile, montantTp: ligne.montantTp};
            Ext.each(modes, function (mode, i) {
                o['mode' + i] = (ligne.parModes || {})[mode.modeId] || 0;
                evolutions['mode' + i] = ((ligne.evolutions || {}).parModes || {})[mode.modeId];
            });
            o.evolutions = evolutions;
            return o;
        });
        grille.reconfigure(Ext.create('Ext.data.Store', {fields: champs, data: donnees}), colonnes);
        const resume = grille.down('#modesResume');
        if (resume) {
            resume.setText(modes.length
                    ? modes.length + ' mode(s) de r&egrave;glement rencontr&eacute;(s) ; sous chaque montant, son &eacute;volution par rapport &agrave; la p&eacute;riode pr&eacute;c&eacute;dente.'
                    : 'Aucun encaissement sur les p&eacute;riodes compar&eacute;es.');
        }
    },

    exporterModes: function () {
        const params = this.criteres('Modes');
        if (params) {
            window.open('../api/v1/balance/balancesalecash/analyse/modes/excel?' + Ext.Object.toQueryString(params));
        }
    },

    /* ------------------------------------------------------------------ resume du bas (affichage historique) */

    buildSummary: function (rec) {
        const me = this;
        const poser = function (getter, valeur) {
            const champ = me[getter] ? me[getter]() : null;
            if (champ) {
                champ.setValue(valeur);
            }
        };
        poser('getMontantTTC', rec.montantTTC);
        poser('getMontantAchat', rec.montantAchat);
        poser('getRatioVA', rec.ratioVA);
        poser('getFondCaisse', rec.fondCaisse);
        poser('getMontantRegDiff', rec.montantRegDiff);
        poser('getMontantRegleTp', rec.montantRegleTp);
        poser('getMontantSortie', rec.montantSortie);
        poser('getMontantEntre', rec.montantEntre);
        poser('getMontantEsp', rec.montantEsp);
        poser('getPanierMoyen', rec.panierMoyen);
        poser('getNbreVente', rec.nbreVente);
        poser('getMontantCheque', rec.montantCheque);
        poser('getMontantVirement', rec.montantVirement);
        poser('getMarge', rec.marge);
        poser('getMontantMobilePayment', rec.montantMobilePayment);
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
        this.oncheckUg();
    }
});
