/* global Ext */

Ext.define('testextjs.controller.AnalyseArticleCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.analyseArticle.AnalyseArticleManager'],
    refs: [
        {ref: 'ecran', selector: 'analysearticle'},
        {ref: 'grilleArticles', selector: 'analysearticle #grilleArticles'},
        {ref: 'quadrants', selector: 'analysearticle #quadrants'}
    ],

    init: function () {
        this.control({
            'analysearticle': {afterrender: this.surOuverture},
            'analysearticle #typePeriode': {select: this.surChangementPeriode},
            'analysearticle #analyser': {click: this.doAnalyser},
            'analysearticle #seuilMarge': {change: {fn: this.doAnalyser, buffer: 700}},
            'analysearticle #seuilRotation': {change: {fn: this.doAnalyser, buffer: 700}},
            'analysearticle #filtreQuadrant': {select: this.doAnalyser},
            'analysearticle #filtreRayon': {select: this.doAnalyser},
            'analysearticle #filtreFamille': {select: this.doAnalyser},
            'analysearticle #filtreGrossiste': {select: this.doAnalyser},
            'analysearticle #recherche': {change: {fn: this.doAnalyser, buffer: 600}},
            'analysearticle #effacerFiltres': {click: this.doEffacerFiltres},
            'analysearticle #quadrants': {afterrender: this.brancherQuadrants},
            'analysearticle #grilleArticles': {selectionchange: this.doCompterCoches},
            'analysearticle #creerInventaire': {click: this.doCreerInventaire},
            'analysearticle #exporterExcel': {click: this.doExporterExcel},
            'analysearticle #imprimer': {click: this.doImprimer},
            'analysearticle #ongletPaires': {activate: this.doChargerPaires},
            'analysearticle #actualiserPaires': {click: this.doChargerPaires},
            'analysearticle #exporterPaires': {click: this.doExporterPaires}
        });
    },

    /* ------------------------------------------------------------------ criteres */

    /** Periode, seuils et filtres tels que l'API les attend. */
    criteres: function () {
        var ecran = this.getEcran();
        var valeur = function (itemId) {
            var champ = ecran.down('#' + itemId);
            var v = champ ? champ.getValue() : null;
            return (v === null || v === undefined) ? '' : v;
        };
        var libre = valeur('typePeriode') === 'LIBRE';
        return {
            typePeriode: valeur('typePeriode') || 'TROIS_MOIS',
            dtStart: libre ? ecran.down('#dtStart').getSubmitValue() : '',
            dtEnd: libre ? ecran.down('#dtEnd').getSubmitValue() : '',
            seuilMarge: valeur('seuilMarge'),
            seuilRotation: valeur('seuilRotation'),
            quadrant: valeur('filtreQuadrant') || 0,
            rayon: valeur('filtreRayon'),
            famille: valeur('filtreFamille'),
            grossiste: valeur('filtreGrossiste'),
            query: valeur('recherche')
        };
    },

    surOuverture: function () {
        var me = this;
        var ecran = me.getEcran();
        ecran.articleStore.on('load', me.surChargement, me);
        // Les 3 derniers mois a l'ouverture, sans clic.
        me.doAnalyser();
    },

    surChangementPeriode: function (combo) {
        var ecran = this.getEcran();
        var libre = combo.getValue() === 'LIBRE';
        ecran.down('#dtStart').setDisabled(!libre);
        ecran.down('#dtEnd').setDisabled(!libre);
        if (!libre) {
            this.doAnalyser();
        }
    },

    /* ------------------------------------------------------------------ matrice */

    doAnalyser: function () {
        var ecran = this.getEcran();
        if (!ecran || ecran.isDestroyed) {
            return;
        }
        var onglet = ecran.down('#ongletMatrice');
        var store = ecran.articleStore;
        Ext.apply(store.getProxy().extraParams, this.criteres());
        if (onglet && onglet.rendered) {
            onglet.setLoading('Analyse en cours...');
        }
        store.loadPage(1, {
            callback: function () {
                if (onglet && !onglet.isDestroyed) {
                    onglet.setLoading(false);
                }
            }
        });
    },

    /** Le store charge : l'en-tete (periode, seuils, medianes) et les quatre quadrants suivent. */
    surChargement: function (store) {
        var ecran = this.getEcran();
        var panneau = this.getQuadrants();
        if (!ecran || !panneau) {
            return;
        }
        var brut = store.getProxy().getReader().rawData || {};
        if (brut.success === false) {
            panneau.update({entete: '<span style="color:#a00">' + Ext.String.htmlEncode(brut.msg || 'Analyse impossible.') + '</span>', quadrants: []});
            return;
        }
        var seuils = brut.seuils || {};
        var periode = brut.periode || {};
        var actif = parseInt(ecran.down('#filtreQuadrant').getValue(), 10) || 0;
        var parQuadrant = {};
        Ext.each(brut.quadrants || [], function (q) {
            parQuadrant[q.quadrant] = q;
        });
        var n = function (v) {
            return Ext.util.Format.number(v || 0, '0,000');
        };
        var entete = 'Période <b>' + Ext.String.htmlEncode(periode.libelle || '') + '</b> (' + (periode.jours || 0)
                + ' jours) · <b>' + n(brut.totalProduits) + '</b> produit(s) vendu(s) · seuils : taux de marge <b>'
                + Ext.util.Format.number(seuils.marge || 0, '0.0') + ' %</b>, rotation <b>'
                + Ext.util.Format.number(seuils.rotation || 0, '0.00') + '</b> (médianes de l\'assortiment : '
                + Ext.util.Format.number(seuils.medianeMarge || 0, '0.0') + ' % et '
                + Ext.util.Format.number(seuils.medianeRotation || 0, '0.00') + ')';
        panneau.update({
            entete: entete,
            quadrants: Ext.Array.map(ecran.QUADRANTS, function (q) {
                var r = parQuadrant[q.quadrant] || {};
                return Ext.apply({
                    produits: r.produits || 0, montant: r.montant || 0, marge: r.marge || 0,
                    valeurStock: r.valeurStock || 0, partCa: r.partCa || 0, decision: r.decision || '',
                    actif: actif === q.quadrant
                }, q);
            })
        });
        ecran.derniereAnalyse = brut;
    },

    /** Un clic sur un quadrant filtre la liste dessus ; un second clic revient a « Tous ». */
    brancherQuadrants: function (panneau) {
        var me = this;
        panneau.el.on('click', function (e, t) {
            var quadrant = parseInt(t.getAttribute('data-quadrant'), 10);
            var combo = me.getEcran().down('#filtreQuadrant');
            combo.setValue(combo.getValue() === quadrant ? 0 : quadrant);
            me.doAnalyser();
        }, me, {delegate: '.aa-quadrant'});
    },

    doEffacerFiltres: function () {
        var ecran = this.getEcran();
        Ext.each(['filtreRayon', 'filtreFamille', 'filtreGrossiste'], function (id) {
            ecran.down('#' + id).clearValue();
        });
        ecran.down('#filtreQuadrant').setValue(0);
        ecran.down('#recherche').setValue('');
        this.doAnalyser();
    },

    doCompterCoches: function () {
        var ecran = this.getEcran();
        var n = ecran.down('#grilleArticles').getSelectionModel().getSelection().length;
        ecran.down('#compteCoches').setText(n ? '<b>' + n + '</b> produit(s) coché(s)' : '');
    },

    /* ------------------------------------------------------------------ actions */

    /** Les produits coches ; a defaut, aucun identifiant : le serveur prend tous les produits de l'analyse filtree. */
    doCreerInventaire: function () {
        var me = this;
        var ecran = me.getEcran();
        var coches = ecran.down('#grilleArticles').getSelectionModel().getSelection();
        var total = ecran.articleStore.getTotalCount();
        if (!coches.length && !total) {
            Ext.MessageBox.alert('Information', 'Aucun produit à inventorier : lancez d\'abord une analyse.');
            return;
        }
        var quadrant = parseInt(ecran.down('#filtreQuadrant').getValue(), 10) || 0;
        var libelle = coches.length ? coches.length + ' produit(s) coché(s)'
                : 'les ' + total + ' produit(s) de l\'analyse' + (quadrant ? ' (' + ecran.QUADRANTS[quadrant - 1].libelle + ')' : '');
        Ext.MessageBox.confirm('Confirmation', 'Créer un inventaire de <b>' + libelle + '</b> ?', function (choix) {
            if (choix !== 'yes') {
                return;
            }
            var attente = Ext.MessageBox.wait('Veuillez patienter . . .', 'Création de l\'inventaire');
            Ext.Ajax.request({
                url: '../api/v1/analyse-article/inventaire',
                method: 'POST',
                jsonData: Ext.apply({produits: Ext.Array.map(coches, function (r) {
                        return r.get('produitId');
                    })}, me.criteres()),
                timeout: 600000,
                success: function (reponse) {
                    attente.hide();
                    var objet = Ext.JSON.decode(reponse.responseText, true) || {};
                    Ext.MessageBox.alert(objet.success ? 'Information' : 'Message',
                            objet.msg || (objet.success ? 'Inventaire créé.' : 'L\'inventaire n\'a pas pu être créé.'));
                },
                failure: function () {
                    attente.hide();
                    Ext.MessageBox.alert('Message', 'L\'inventaire n\'a pas pu être créé.');
                }
            });
        });
    },

    doExporterExcel: function () {
        var onglets = this.getEcran().down('#ongletsAnalyse');
        if (onglets.getActiveTab().itemId === 'ongletPaires') {
            this.doExporterPaires();
            return;
        }
        // Un telechargement ne passe pas par Ext.Ajax : le navigateur doit recevoir le fichier.
        window.open('../api/v1/analyse-article/matrice/excel?' + Ext.Object.toQueryString(this.criteres()));
    },

    doImprimer: function () {
        // Rendu en flux dans l'onglet ouvert par le clic : aucune fenetre intermediaire.
        window.open('../api/v1/analyse-article/matrice/pdf?' + Ext.Object.toQueryString(this.criteres()));
    },

    /* ------------------------------------------------------------------ paires */

    criteresPaires: function () {
        var ecran = this.getEcran();
        var c = this.criteres();
        return {
            typePeriode: c.typePeriode, dtStart: c.dtStart, dtEnd: c.dtEnd,
            minimum: ecran.down('#minimumTickets').getValue() || 3,
            limite: ecran.down('#limitePaires').getValue() || 100
        };
    },

    doChargerPaires: function () {
        var ecran = this.getEcran();
        var onglet = ecran.down('#ongletPaires');
        var store = ecran.paireStore;
        Ext.apply(store.getProxy().extraParams, this.criteresPaires());
        if (onglet.rendered) {
            onglet.setLoading('Recherche des paires...');
        }
        store.load({
            callback: function () {
                if (!onglet.isDestroyed) {
                    onglet.setLoading(false);
                }
            }
        });
    },

    doExporterPaires: function () {
        window.open('../api/v1/analyse-article/paires/excel?' + Ext.Object.toQueryString(this.criteresPaires()));
    }
});
