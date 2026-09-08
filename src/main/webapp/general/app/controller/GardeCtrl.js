/* global Ext */

Ext.define('testextjs.controller.GardeCtrl', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.garde.GardeManager', 'testextjs.view.garde.GardeForm',
        'testextjs.view.garde.SelecteurGarde'],
    refs: [
        {ref: 'gardeManager', selector: 'gardemanager'},
        {ref: 'grilleGardes', selector: 'gardemanager #grilleGardes'}
    ],

    init: function () {
        this.control({
            'gardemanager #grilleGardes': {
                // Choisir une garde charge son analyse : c'est le geste attendu, inutile
                // d'exiger un clic de plus sur un bouton « Analyser ».
                selectionchange: this.surSelection
            },
            'gardemanager #gardeNouvelle': {click: this.doNouvelle},
            'gardemanager #gardeModifier': {click: this.doModifier},
            'gardemanager #gardeSupprimer': {click: this.doSupprimer},
            'gardemanager #gardeHeures': {select: this.doAnalyser},
            'gardemanager #gardeAnnee': {select: this.doFiltrerAnnee},
            // H2 : la capacite d'une personne change l'effectif conseille, pas les chiffres.
            'gardemanager #capacitePersonne': {change: {fn: this.doRafraichirEffectif, buffer: 400}},
            // La courbe est dessinee dans un onglet cache a la creation : on la redessine a l'ouverture.
            'gardemanager #ongletActivite': {activate: this.doRedessinerCourbe},
            'gardemanager #abcClasse': {select: this.doAnalyser},
            'gardemanager #abcTri': {select: this.doAnalyser},
            // Le nombre se tape : on attend la fin de la frappe avant de relancer l'analyse.
            'gardemanager #abcLimite': {change: {fn: this.doAnalyser, buffer: 600}},
            'gardemanager #gardeImprimer': {click: this.doImprimer},
            'gardemanager #gardeExporterAbc': {click: this.doExporterAbc},
            'gardemanager #gardeExporterTranches': {click: this.doExporterTranches},
            'gardemanager #comparerDernieres': {click: this.doComparerDernieres},
            'gardemanager #comparerSelection': {click: this.doComparerSelection},
            'gardemanager #nombreGardes': {select: this.doComparerDernieres},
            'gardeform #gardeEnregistrer': {click: this.doEnregistrer}
        });
    },

    /** La garde selectionnee, ou null. */
    gardeCourante: function () {
        var selection = this.getGrilleGardes().getSelectionModel().getSelection();
        return selection.length ? selection[0] : null;
    },

    surSelection: function () {
        this.doAnalyser();
    },

    doRafraichirEffectif: function () {
        var grille = this.getGardeManager().down('#grilleTranches');
        if (grille) {
            grille.getView().refresh();
        }
    },

    doRedessinerCourbe: function () {
        var courbe = this.getGardeManager().down('#courbeActivite');
        if (courbe && courbe.rendered) {
            try {
                courbe.redraw();
            } catch (e) {
                // Un redessin qui echoue ne doit jamais bloquer l'onglet : la grille reste lisible.
            }
        }
    },

    /** Filtre par annee (retour du 08/09) : la liste est rechargee, l'analyse videe. */
    doFiltrerAnnee: function (combo) {
        var ecran = this.getGardeManager();
        ecran.gardeStore.getProxy().extraParams.annee = combo.getValue() || '';
        ecran.gardeStore.load();
        this.viderAnalyse();
    },

    doNouvelle: function () {
        Ext.create('testextjs.view.garde.GardeForm', {garde: null});
    },

    doModifier: function () {
        var garde = this.gardeCourante();
        if (!garde) {
            Ext.MessageBox.alert('Information', 'Choisissez une garde dans la liste.');
            return;
        }
        Ext.create('testextjs.view.garde.GardeForm', {garde: garde});
    },

    doEnregistrer: function (bouton) {
        var me = this;
        var fenetre = bouton.up('window');
        var formulaire = fenetre.down('#formulaireGarde');
        if (!formulaire.getForm().isValid()) {
            Ext.MessageBox.alert('Information', 'Renseignez le libell&eacute; et les deux bornes.');
            return;
        }
        bouton.disable();
        Ext.Ajax.request({
            url: '../api/v1/gardes',
            method: 'POST',
            params: fenetre.valeurs(),
            callback: function () {
                /* Le rappel final passe APRES le succes, qui a ferme la fenetre et detruit le
                   bouton avec elle : le reactiver levait « removeCls, b is null ». On ne touche
                   qu'un bouton encore vivant. */
                if (!bouton.destroyed && !bouton.isDestroyed) {
                    bouton.enable();
                }
            },
            success: function (reponse) {
                var objet = Ext.JSON.decode(reponse.responseText, true) || {};
                if (!objet.success) {
                    // Le serveur revalide : la fin posterieure au debut et l'unicite de la periode
                    // sont refusees la, pas seulement a l'ecran.
                    Ext.MessageBox.alert('Message', objet.msg || 'La garde n\'a pas pu &ecirc;tre enregistr&eacute;e.');
                    return;
                }
                fenetre.close();
                me.getGardeManager().gardeStore.reload();
            },
            failure: function () {
                Ext.MessageBox.alert('Message', 'La garde n\'a pas pu &ecirc;tre enregistr&eacute;e.');
            }
        });
    },

    /** Suppression des gardes cochees (retour du 08/09) ; une seule ou plusieurs. */
    doSupprimer: function () {
        var me = this;
        var cochees = me.getGrilleGardes().getSelectionModel().getSelection();
        if (!cochees.length) {
            Ext.MessageBox.alert('Information', 'Cochez au moins une garde dans la liste.');
            return;
        }
        var libelles = Ext.Array.map(cochees, function (g) {
            return Ext.String.htmlEncode(g.get('libelle'));
        });
        Ext.MessageBox.confirm('Confirmation',
                (cochees.length === 1
                        ? 'Supprimer la garde <b>' + libelles[0] + '</b> ?<br/>'
                        : 'Supprimer les <b>' + cochees.length + '</b> gardes coch&eacute;es ?<br/>'
                        + '<i>' + libelles.join(', ') + '</i><br/>')
                + 'Aucune vente ne sera supprim&eacute;e : seule la d&eacute;finition de la '
                + 'p&eacute;riode dispara&icirc;t.',
                function (choix) {
                    if (choix !== 'yes') {
                        return;
                    }
                    Ext.Ajax.request({
                        url: '../api/v1/gardes/supprimer',
                        method: 'POST',
                        params: {ids: Ext.Array.map(cochees, function (g) {
                                return g.get('id');
                            }).join(',')},
                        success: function (reponse) {
                            var objet = Ext.JSON.decode(reponse.responseText, true) || {};
                            if (!objet.success) {
                                Ext.MessageBox.alert('Message', objet.msg || 'Suppression impossible.');
                                return;
                            }
                            var ecran = me.getGardeManager();
                            ecran.gardeStore.reload();
                            ecran.anneeStore.reload();
                            me.viderAnalyse();
                        },
                        failure: function () {
                            Ext.MessageBox.alert('Message', 'Les gardes n\'ont pas pu &ecirc;tre supprim&eacute;es.');
                        }
                    });
                });
    },

    viderAnalyse: function () {
        var ecran = this.getGardeManager();
        ecran.trancheStore.removeAll();
        ecran.abcStore.removeAll();
        ecran.resumeStore.removeAll();
        ecran.down('#abcCompte').setText('');
        ecran.down('#gardeIndicateurs').update('<i>Choisissez une garde dans la liste de gauche.</i>');
    },

    /** Identifiant de la garde, largeur de tranche, et la lecture ABC voulue (classe, tri, N premiers). */
    parametres: function () {
        var garde = this.gardeCourante();
        var ecran = this.getGardeManager();
        var valeur = function (itemId, defaut) {
            var champ = ecran.down('#' + itemId);
            var v = champ ? champ.getValue() : null;
            return (v === null || v === undefined || v === '') ? defaut : v;
        };
        return {
            id: garde ? garde.get('id') : null,
            heures: valeur('gardeHeures', 2),
            classe: valeur('abcClasse', ''),
            tri: valeur('abcTri', 'montant'),
            limite: valeur('abcLimite', 0)
        };
    },

    /** Les parametres du rapport sans l'identifiant, tels qu'on les passe a l'URL. */
    parametresRapport: function (params) {
        return {heures: params.heures, classe: params.classe, tri: params.tri, limite: params.limite};
    },

    doAnalyser: function () {
        var me = this;
        var params = me.parametres();
        if (!params.id) {
            me.viderAnalyse();
            return;
        }
        var ecran = me.getGardeManager();
        var indicateurs = ecran.down('#gardeIndicateurs');
        indicateurs.update('<i>Analyse en cours...</i>');
        Ext.Ajax.request({
            url: '../api/v1/gardes/' + params.id + '/rapport',
            method: 'GET',
            params: me.parametresRapport(params),
            timeout: 600000,
            success: function (reponse) {
                var objet = Ext.JSON.decode(reponse.responseText, true) || {};
                if (!objet.success) {
                    indicateurs.update('<span style="color:#a00">' + (objet.msg || 'Analyse impossible.')
                            + '</span>');
                    return;
                }
                ecran.trancheStore.loadData(objet.tranches || []);
                ecran.abcStore.loadData(objet.abc || []);
                ecran.resumeStore.loadData(objet.resumeAbc || []);
                var affiches = (objet.abc || []).length;
                var total = objet.totalAbc || affiches;
                ecran.down('#abcCompte').setText(affiches < total
                        ? '<b>' + affiches + '</b> produit(s) affich&eacute;(s) sur ' + total
                        : '<b>' + total + '</b> produit(s)');
                var i = objet.indicateurs || {};
                indicateurs.update('<b>' + (objet.garde || {}).libelle + '</b> &middot; <b>' + (i.ventes || 0)
                        + '</b> vente(s) &middot; <b>' + (i.lignes || 0) + '</b> ligne(s) &middot; <b>'
                        + (i.produitsDistincts || 0) + '</b> produit(s) &middot; <b>' + (i.quantite || 0)
                        + '</b> unit&eacute;(s) &middot; <b>'
                        + Ext.util.Format.number(i.montant || 0, '0,000') + '</b> au total &middot; <b>'
                        + Ext.util.Format.number(i.montantParHeure || 0, '0,000') + '</b> par heure &middot; marge <b>'
                        + Ext.util.Format.number(i.marge || 0, '0,000') + '</b> (<b>'
                        + Ext.util.Format.number(i.tauxMarge || 0, '0.00') + ' %</b>)');
            },
            failure: function () {
                indicateurs.update('<span style="color:#a00">L\'analyse n\'a pas pu &ecirc;tre '
                        + 'calcul&eacute;e.</span>');
            }
        });
    },

    doImprimer: function () {
        var params = this.parametres();
        if (!params.id) {
            Ext.MessageBox.alert('Information', 'Choisissez une garde dans la liste.');
            return;
        }
        var attente = Ext.MessageBox.wait('Veuillez patienter . . .', 'Edition du rapport de garde');
        Ext.Ajax.request({
            url: '../api/v1/gardes/' + params.id + '/pdf',
            method: 'GET',
            params: {heures: params.heures},
            timeout: 600000,
            callback: function () {
                attente.hide();
            },
            success: function (reponse) {
                var objet = Ext.JSON.decode(reponse.responseText, true) || {};
                if (objet.success && objet.url) {
                    window.open('..' + objet.url);
                } else {
                    Ext.MessageBox.alert('Message',
                            objet.msg || 'L\'&eacute;dition n\'a pas pu &ecirc;tre g&eacute;n&eacute;r&eacute;e.');
                }
            },
            failure: function () {
                Ext.MessageBox.alert('Message',
                        'L\'&eacute;dition n\'a pas pu &ecirc;tre g&eacute;n&eacute;r&eacute;e.');
            }
        });
    },

    doExporterAbc: function () {
        this.telecharger('/excel');
    },

    doExporterTranches: function () {
        this.telecharger('/tranches/excel');
    },

    telecharger: function (chemin) {
        var params = this.parametres();
        if (!params.id) {
            Ext.MessageBox.alert('Information', 'Choisissez une garde dans la liste.');
            return;
        }
        // Un telechargement ne passe pas par Ext.Ajax : le navigateur doit recevoir le fichier.
        window.open('../api/v1/gardes/' + params.id + chemin + '?'
                + Ext.Object.toQueryString(this.parametresRapport(params)));
    },

    doComparerDernieres: function () {
        var champ = this.getGardeManager().down('#nombreGardes');
        this.comparer('', champ ? champ.getValue() : 3);
    },

    doComparerSelection: function () {
        var selection = this.getGrilleGardes().getSelectionModel().getSelection();
        if (!selection.length) {
            Ext.MessageBox.alert('Information',
                    'S&eacute;lectionnez une ou plusieurs gardes dans la liste de gauche '
                    + '(Ctrl + clic pour en choisir plusieurs).');
            return;
        }
        // Une seule garde selectionnee est acceptee : on obtient alors ses chiffres bruts.
        // Interdire ce cas obligerait a passer par l'onglet d'analyse pour la meme lecture.
        this.comparer(Ext.Array.map(selection, function (g) {
            return g.get('id');
        }).join(','), selection.length);
    },

    comparer: function (ids, nombre) {
        var ecran = this.getGardeManager();
        Ext.Ajax.request({
            url: '../api/v1/gardes/comparaison',
            method: 'GET',
            params: {ids: ids, nombre: nombre || 3},
            timeout: 600000,
            success: function (reponse) {
                var objet = Ext.JSON.decode(reponse.responseText, true) || {};
                // Le serveur imbrique les indicateurs : on les remonte d'un cran pour que la
                // grille les lise directement.
                var lignes = Ext.Array.map(objet.data || [], function (ligne) {
                    return Ext.apply({}, ligne, ligne.indicateurs || {});
                });
                ecran.comparaisonStore.loadData(lignes);
                var resume = ecran.down('#comparaisonResume');
                if (resume) {
                    // Une seule garde ne fait pas une comparaison : le dire vaut mieux que
                    // d'afficher une colonne d'ecart restee vide sans explication.
                    resume.setText(objet.comparatif
                            ? '<b>Evolution</b> : chiffre d\'affaires rapport&eacute; &agrave; la garde '
                            + 'pr&eacute;c&eacute;dente. <b>Par heure</b> : seule base comparable entre gardes '
                            + 'de dur&eacute;es diff&eacute;rentes.'
                            : 'Une seule garde : ses chiffres bruts sont affich&eacute;s, sans &eacute;cart. '
                            + 'Choisissez au moins deux gardes pour comparer.');
                }
                ecran.down('#ongletsGarde').setActiveTab(ecran.down('#ongletComparaison'));
            },
            failure: function () {
                Ext.MessageBox.alert('Message', 'La comparaison n\'a pas pu &ecirc;tre calcul&eacute;e.');
            }
        });
    }
});
