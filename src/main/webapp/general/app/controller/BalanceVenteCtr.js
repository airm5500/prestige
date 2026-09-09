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
        },
        {
            ref: 'ventilationBalance',
            selector: 'balancesalecahs #ventilationBalance'
        },
        {
            ref: 'grilleModesBalance',
            selector: 'balancesalecahs #ongletModesBalance'
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
            'balancesalecahs #analyseImprimer': {
                click: this.imprimerAnalyse
            },
            'balancesalecahs #modesImprimer': {
                click: this.imprimerAnalyse
            },
            'balancesalecahs #modesExporter': {
                click: this.exporterModes
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
        // Retour du 09/09, point 4 : la ventilation voyage dans la meme reponse que la grille,
        // sous la cle « ventilation » que le lecteur du magasin ignore. Elle est relue ici.
        me.getBalanceGrid().getStore().addListener('load', this.afficherVentilation, this);
        me.doSearch();
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
        panneau.update(ventilation);
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
                me.construireEvolutionModes(objet);
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

    /**
     * L'onglet « evolution par mode de paiement » (retour du 09/09, point 4) : une ligne par
     * periode, une colonne par mode rencontre. Les colonnes sont refaites a chaque recherche, car
     * elles dependent des modes reellement encaisses sur les periodes comparees.
     */
    construireEvolutionModes: function (objet) {
        const me = this;
        const grille = me.getGrilleModesBalance();
        if (!grille || grille.isDestroyed) {
            return;
        }
        const modes = objet.modes || [];
        const lignes = objet.data || [];
        const montant = function (v) {
            return Ext.util.Format.number(v || 0, '0,000');
        };
        const colonneMontant = function (entete, champ, mobile) {
            return {
                header: entete, dataIndex: champ, width: 105, align: 'right',
                renderer: function (v) {
                    return mobile ? '<span style="color:#2a4d69;">' + montant(v) + '</span>' : montant(v);
                },
                summaryType: 'sum',
                summaryRenderer: function (v) {
                    return '<b>' + montant(v) + '</b>';
                }
            };
        };
        const champs = ['libelle', {name: 'enCours', type: 'boolean'}, {name: 'nbreVente', type: 'int'},
            {name: 'montantNet', type: 'int'}, {name: 'montantMobile', type: 'int'}, {name: 'montantTp', type: 'int'}];
        const colonnes = [{
                header: 'P&eacute;riode', dataIndex: 'libelle', flex: 1, minWidth: 120,
                renderer: function (valeur, meta, ligne) {
                    return ligne.get('enCours') ? valeur + ' <i style="color:#888">(en cours)</i>' : valeur;
                },
                summaryRenderer: function () {
                    return '<b>TOTAL</b>';
                }
            }, {
                header: 'Ventes', dataIndex: 'nbreVente', width: 65, align: 'right', summaryType: 'sum',
                summaryRenderer: function (v) {
                    return '<b>' + montant(v) + '</b>';
                }
            }, colonneMontant('Net TTC', 'montantNet')];
        Ext.each(modes, function (mode, i) {
            champs.push({name: 'mode' + i, type: 'int'});
            colonnes.push(colonneMontant(Ext.String.htmlEncode(mode.libelle)
                    + (mode.mobile ? ' <span style="color:#7f8c8d;font-size:10px;">(mobile)</span>' : ''),
                    'mode' + i, mode.mobile));
        });
        colonnes.push(colonneMontant('Total mobile', 'montantMobile', true));
        colonnes.push(colonneMontant('Tiers payant', 'montantTp'));
        const donnees = lignes.map(function (ligne) {
            const o = {libelle: ligne.libelle, enCours: ligne.enCours, nbreVente: ligne.nbreVente,
                montantNet: ligne.montantNet, montantMobile: ligne.montantMobile, montantTp: ligne.montantTp};
            Ext.each(modes, function (mode, i) {
                o['mode' + i] = (ligne.parModes || {})[mode.modeId] || 0;
            });
            return o;
        });
        const magasin = Ext.create('Ext.data.Store', {fields: champs, data: donnees});
        grille.reconfigure(magasin, colonnes);
        const resume = grille.down('#modesResume');
        if (resume) {
            resume.setText(modes.length
                    ? modes.length + ' mode(s) de r&egrave;glement rencontr&eacute;(s) sur les p&eacute;riodes compar&eacute;es.'
                    : 'Aucun encaissement sur les p&eacute;riodes compar&eacute;es.');
        }
    },

    /** L'analyse comparative et l'evolution par mode en PDF, sur leur propre modele (jrxml). */
    imprimerAnalyse: function () {
        const me = this;
        const selecteur = me.getTypePeriode();
        // Ouvert dans le clic, en flux : aucune fenetre surgissante intermediaire.
        window.open('../api/v1/balance/balancesalecash/analyse/pdf?' + Ext.Object.toQueryString({
            typePeriode: selecteur ? selecteur.getValue() : 'LIBRE',
            dtStart: me.getDtStart().getSubmitValue(),
            dtEnd: me.getDtEnd().getSubmitValue()
        }));
    },

    exporterModes: function () {
        const me = this;
        const selecteur = me.getTypePeriode();
        window.open('../api/v1/balance/balancesalecash/analyse/modes/excel?' + Ext.Object.toQueryString({
            typePeriode: selecteur ? selecteur.getValue() : 'LIBRE',
            dtStart: me.getDtStart().getSubmitValue(),
            dtEnd: me.getDtEnd().getSubmitValue()
        }));
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