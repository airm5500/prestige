/* global Ext */

Ext.define('testextjs.controller.BalanceVenteCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.caisseManager.balance.BalanceSaleCash'],
    refs: [{
            ref: 'balancesalecahs',
            selector: 'balancesalecahs'
        },
        {
            ref: 'imprimerBtn',
            selector: 'balancesalecahs #imprimer'
        },

        {
            ref: 'balanceGrid',
            selector: 'balancesalecahs #balanceGrid'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'balancesalecahs #balanceGrid pagingtoolbar'
        }

        , {
            ref: 'dtStart',
            selector: 'balancesalecahs #dtStart'
        }, {
            ref: 'dtEnd',
            selector: 'balancesalecahs #dtEnd'
        },
        {ref: 'rechercherButton',
            selector: 'balancesalecahs #rechercher'

        }, {
            ref: 'typePeriode',
            // Le selecteur de periodes est pose par resources/js/selecteur-periodes.js, pas par la
            // vue : il peut donc etre absent si l'ecran est retire de la liste. Tous les acces
            // le testent.
            selector: 'balancesalecahs #typePeriode'
        }, {
            ref: 'ongletsBalance',
            selector: 'balancesalecahs #ongletsBalance'
        }, {
            ref: 'grilleAnalyse',
            selector: 'balancesalecahs #ongletAnalyseBalance'
        }, {
            ref: 'montantTTC',
            selector: 'balancesalecahs #montantTTC'
        }, {
            ref: 'montantAchat',
            selector: 'balancesalecahs #montantAchat'
        },
        {
            ref: 'ratioVA',
            selector: 'balancesalecahs #ratioVA'
        }, {
            ref: 'fondCaisse',
            selector: 'balancesalecahs #fondCaisse'
        },
        {
            ref: 'montantMobilePayment',
            selector: 'balancesalecahs #montantMobilePayment'
        },
        {
            ref: 'montantRegDiff',
            selector: 'balancesalecahs #montantRegDiff'
        },
        {
            ref: 'montantRegleTp',
            selector: 'balancesalecahs #montantRegleTp'
        },
        {
            ref: 'montantSortie',
            selector: 'balancesalecahs #montantSortie'
        },
        {
            ref: 'montantEntre',
            selector: 'balancesalecahs #montantEntre'
        },
        {
            ref: 'montantEsp',
            selector: 'balancesalecahs #montantEsp'
        },
        {
            ref: 'panierMoyen',
            selector: 'balancesalecahs #panierMoyen'
        },
        {
            ref: 'nbreVente',
            selector: 'balancesalecahs #nbreVente'
        }, {
            ref: 'montantCheque',
            selector: 'balancesalecahs #montantCheque'
        }, {
            ref: 'montantVirement',
            selector: 'balancesalecahs #montantVirement'
        }
        ,
        {
            ref: 'marge',
            selector: 'balancesalecahs #marge'
        }
    ],
    config: {
        checkUg: false

    },

    init: function (application) {
        this.control({
           /* 'balancesalecahs': {
                render: this.onReady
            },*/
            'balancesalecahs #balanceGrid pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'balancesalecahs #rechercher': {
                click: this.doSearch
            },
            'balancesalecahs #typePeriode': {
                select: this.surChangementPeriode
            },
            'balancesalecahs #analyseExporter': {
                click: this.exporterAnalyse
            },
            'balancesalecahs #imprimer': {
                click: this.onPdfClick
            },

            'balancesalecahs #balanceGrid': {
                viewready: this.doInitStore
            }

        });
    },
    onPdfClick: function () {
        let me = this;
        let dtStart = me.getDtStart().getSubmitValue();
        let dtEnd = me.getDtEnd().getSubmitValue();
        let checkug = me.getCheckUg();
        let linkUrl = '../BalancePdfServlet?mode=BALANCE&dtStart=' + dtStart + '&dtEnd=' + dtEnd + '&checkug=' + checkug;
        window.open(linkUrl);
    },
    doMetachange: function (store, meta) {
        const me = this;
        me.buildSummary(meta);

    },
    doBeforechange: function (page, currentPage) {
        const me = this;
        const myProxy = me.getBalanceGrid().getStore().getProxy();
        myProxy.params = {
            dtEnd: null,
            dtStart: null

        };
      
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());

    },

    doInitStore: function () {
        const me = this;
        me.getBalanceGrid().getStore().addListener('metachange', this.doMetachange, this);
        me.doSearch();
    },

    doSearch: function () {
        const me = this;
        // Un controleur ExtJS est global : ses « refs » ne designent un composant que tant qu'un
        // ecran est ouvert. Une recherche declenchee juste apres la fermeture -- rechargement d'un
        // magasin, appel differe -- trouverait des refs vides. Ne rien faire est alors la bonne
        // reponse ; sans ce test, la console se remplit d'erreurs sans consequence visible, ce qui
        // finit par masquer les vraies.
        if (!me.getBalanceGrid() || !me.getDtStart() || !me.getDtEnd()) {
            return;
        }
        let store = me.getBalanceGrid().getStore();
        store.load({
            params: {
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue()

            }
        });
        me.chargerAnalyse();
    },

    /**
     * Alimente l'onglet d'analyse comparative.
     *
     * Les deux onglets sont charges par la MEME recherche : laisser l'analyse en arriere jusqu'a
     * ce qu'on ouvre son onglet lui ferait afficher les chiffres de la recherche precedente, sans
     * que rien ne l'indique.
     */
    chargerAnalyse: function () {
        const me = this;
        const grille = me.getGrilleAnalyse();
        const selecteur = me.getTypePeriode();
        if (!grille || !me.getDtStart() || !me.getDtEnd()) {
            return;
        }
        Ext.Ajax.request({
            url: '../api/v1/balance/balancesalecash/analyse',
            method: 'GET',
            params: {
                typePeriode: selecteur ? selecteur.getValue() : 'LIBRE',
                dtStart: me.getDtStart().getSubmitValue(),
                dtEnd: me.getDtEnd().getSubmitValue()
            },
            timeout: 600000,
            success: function (reponse) {
                // L'ecran a pu etre ferme pendant le calcul : ecrire dans une grille detruite
                // leverait une erreur pour un resultat que plus personne ne regarde.
                if (grille.isDestroyed) {
                    return;
                }
                const objet = Ext.JSON.decode(reponse.responseText, true) || {};
                grille.getStore().loadData(objet.data || []);
                const resume = grille.down('#analyseResume');
                if (resume) {
                    resume.setText(objet.comparatif ? me.MESSAGE_COMPARATIF : me.MESSAGE_PERIODE_UNIQUE);
                }
            },
            failure: function () {
                if (!grille.isDestroyed) {
                    grille.getStore().removeAll();
                }
            }
        });
    },

    /** Rappel affiche au-dessus de l'analyse quand plusieurs periodes sont comparees. */
    MESSAGE_COMPARATIF: 'Les p&eacute;riodes r&eacute;volues sont compl&egrave;tes ; celle en cours '
            + 'est rappel&eacute;e &agrave; part et n&rsquo;est pas comparable telle quelle.',

    /** Une seule periode ne fait pas une comparaison : on le dit plutot que d'afficher des ecarts vides. */
    MESSAGE_PERIODE_UNIQUE: 'Une seule p&eacute;riode : les chiffres bruts sont affich&eacute;s, sans '
            + '&eacute;cart. Choisissez plusieurs p&eacute;riodes pour comparer.',

    /** Le changement de periode relance la recherche : les deux onglets restent d'accord. */
    surChangementPeriode: function () {
        this.doSearch();
    },

    exporterAnalyse: function () {
        const me = this;
        const selecteur = me.getTypePeriode();
        // Un telechargement ne passe pas par Ext.Ajax : le navigateur doit recevoir le fichier.
        window.open('../api/v1/balance/balancesalecash/analyse/excel?' + Ext.Object.toQueryString({
            typePeriode: selecteur ? selecteur.getValue() : 'LIBRE',
            dtStart: me.getDtStart().getSubmitValue(),
            dtEnd: me.getDtEnd().getSubmitValue()
        }));
    },
    buildSummary: function (rec) {
        const me = this;
        me.getMontantTTC().setValue(rec.montantTTC);
        me.getMontantAchat().setValue(rec.montantAchat);
        me.getRatioVA().setValue(rec.ratioVA);
        me.getFondCaisse().setValue(rec.fondCaisse);
        me.getMontantRegDiff().setValue(rec.montantRegDiff);
        me.getMontantRegleTp().setValue(rec.montantRegleTp);
        me.getMontantSortie().setValue(rec.montantSortie);
        me.getMontantEntre().setValue(rec.montantEntre);
        me.getMontantEsp().setValue(rec.montantEsp);
        me.getPanierMoyen().setValue(rec.panierMoyen);
        me.getNbreVente().setValue(rec.nbreVente);
        me.getMontantCheque().setValue(rec.montantCheque);
        me.getMontantVirement().setValue(rec.montantVirement);
        me.getMarge().setValue(rec.marge);
        me.getMontantMobilePayment().setValue(rec.montantMobilePayment);

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
        const me = this;
        me.oncheckUg();
    }
});