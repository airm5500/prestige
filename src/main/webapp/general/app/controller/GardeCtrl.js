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
            // H3 : historique sur les gardes cochees, vendeurs, commandes, inventaire, suggestion, courbe.
            'gardemanager #activiteHistorique': {toggle: this.doChargerActivite},
            'gardemanager #vendeursHistorique': {toggle: this.doChargerVendeurs},
            'gardemanager #ongletVendeurs': {activate: this.doChargerVendeurs},
            'gardemanager #ongletCommandes': {activate: this.doChargerCommandes},
            'gardemanager #ongletComparaison': {activate: this.doRedessinerCourbeComparaison},
            'gardemanager #gardeInventaire': {click: this.doInventaire},
            'gardemanager #gardeSuggestion': {click: this.doSuggestion},
            'gardemanager #grilleAbc': {selectionchange: this.doCompterCoches},
            'gardemanager #abcClasse': {select: this.doAnalyser},
            'gardemanager #abcTri': {select: this.doAnalyser},
            // Retour des tests du 09/09 : filtres emplacement / famille / grossiste, clic sur une classe,
            // exports des commandes non vendues.
            'gardemanager #abcRayon': {select: this.doAnalyser},
            'gardemanager #abcFamille': {select: this.doAnalyser},
            'gardemanager #abcGrossiste': {select: this.doAnalyser},
            'gardemanager #abcEffacer': {click: this.doEffacerFiltres},
            'gardemanager #grilleResumeAbc': {itemclick: this.doChoisirClasse},
            'gardemanager #commandesImprimer': {click: this.doImprimerCommandes},
            'gardemanager #commandesExporter': {click: this.doExporterCommandes},
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
        this.redessiner('#courbeActivite');
        // L'historique suit les cases cochees : on le recharge a chaque ouverture de l'onglet.
        if (this.getGardeManager().down('#activiteHistorique').pressed) {
            this.doChargerActivite();
        }
    },

    doRedessinerCourbeComparaison: function () {
        this.redessiner('#courbeComparaison');
    },

    redessiner: function (itemId) {
        var courbe = this.getGardeManager().down(itemId);
        if (courbe && courbe.rendered) {
            try {
                courbe.redraw();
            } catch (e) {
                // Un redessin qui echoue ne doit jamais bloquer l'onglet : la grille reste lisible.
            }
        }
    },

    /** Les gardes cochees dans la liste, par identifiant. */
    idsCoches: function () {
        return Ext.Array.map(this.getGrilleGardes().getSelectionModel().getSelection(), function (g) {
            return g.get('id');
        });
    },

    /**
     * Le suivi de l'activite : la garde choisie, ou - bouton enfonce - l'historique des gardes cochees,
     * tranches et heures tenues additionnees.
     */
    doChargerActivite: function () {
        var me = this;
        var ecran = me.getGardeManager();
        var historique = ecran.down('#activiteHistorique').pressed;
        var source = ecran.down('#activiteSource');
        if (!historique) {
            source.setText('');
            me.doAnalyser();
            return;
        }
        var ids = me.idsCoches();
        if (!ids.length) {
            source.setText('<span style="color:#a00">Cochez des gardes dans la liste.</span>');
            return;
        }
        Ext.Ajax.request({
            url: '../api/v1/gardes/activite',
            method: 'GET',
            params: {ids: ids.join(','), heures: me.parametres().heures},
            timeout: 600000,
            success: function (reponse) {
                var objet = Ext.JSON.decode(reponse.responseText, true) || {};
                ecran.trancheStore.loadData(objet.data || []);
                source.setText('<b>' + (objet.gardes || 0) + '</b> garde(s) cumul&eacute;e(s)');
                me.redessiner('#courbeActivite');
            },
            failure: function () {
                source.setText('<span style="color:#a00">L\'historique n\'a pas pu &ecirc;tre lu.</span>');
            }
        });
    },

    /** Les vendeurs : de la garde choisie, ou - bouton enfonce - de toutes les gardes cochees. */
    doChargerVendeurs: function () {
        var me = this;
        var ecran = me.getGardeManager();
        var historique = ecran.down('#vendeursHistorique').pressed;
        var source = ecran.down('#vendeursSource');
        var garde = me.gardeCourante();
        var url, params;
        if (historique) {
            var ids = me.idsCoches();
            if (!ids.length) {
                source.setText('<span style="color:#a00">Cochez des gardes dans la liste.</span>');
                ecran.vendeurStore.removeAll();
                return;
            }
            url = '../api/v1/gardes/vendeurs';
            params = {ids: ids.join(',')};
        } else {
            if (!garde) {
                ecran.vendeurStore.removeAll();
                source.setText('Choisissez une garde dans la liste de gauche.');
                return;
            }
            url = '../api/v1/gardes/' + garde.get('id') + '/vendeurs';
            params = {};
        }
        Ext.Ajax.request({
            url: url,
            method: 'GET',
            params: params,
            timeout: 600000,
            success: function (reponse) {
                var objet = Ext.JSON.decode(reponse.responseText, true) || {};
                ecran.vendeurStore.loadData(objet.data || []);
                source.setText(historique
                        ? '<b>' + (objet.gardes || 0) + '</b> garde(s) cumul&eacute;e(s), du plus gros chiffre au plus petit.'
                        : '<b>' + Ext.String.htmlEncode(garde.get('libelle')) + '</b> : du plus gros chiffre au plus petit.');
            },
            failure: function () {
                source.setText('<span style="color:#a00">Les vendeurs n\'ont pas pu &ecirc;tre lus.</span>');
            }
        });
    },

    /** Les produits commandes pendant la garde choisie, et la proportion de non vendus. */
    doChargerCommandes: function () {
        var me = this;
        var ecran = me.getGardeManager();
        var resume = ecran.down('#commandesResume');
        var garde = me.gardeCourante();
        if (!garde) {
            ecran.commandeStore.removeAll();
            resume.setText('Choisissez une garde dans la liste de gauche.');
            return;
        }
        Ext.Ajax.request({
            url: '../api/v1/gardes/' + garde.get('id') + '/commandes',
            method: 'GET',
            timeout: 600000,
            success: function (reponse) {
                var objet = Ext.JSON.decode(reponse.responseText, true) || {};
                var r = objet.resume || {};
                ecran.commandeStore.loadData(objet.data || []);
                resume.setText('<b>' + (r.produitsCommandes || 0) + '</b> produit(s) command&eacute;(s) pendant la garde, '
                        + 'dont <b style="color:#a00">' + (r.produitsNonVendus || 0) + '</b> non vendu(s) pendant la garde, '
                        + 'soit <b>' + Ext.util.Format.number(r.proportionProduits || 0, '0.00') + ' %</b> des produits '
                        + '(' + Ext.util.Format.number(r.proportionQuantites || 0, '0.00') + ' % des quantit&eacute;s).');
            },
            failure: function () {
                resume.setText('<span style="color:#a00">Les commandes n\'ont pas pu &ecirc;tre lues.</span>');
            }
        });
    },

    doCompterCoches: function () {
        var ecran = this.getGardeManager();
        var n = ecran.down('#grilleAbc').getSelectionModel().getSelection().length;
        ecran.down('#abcCoches').setText(n ? '<b>' + n + '</b> produit(s) coch&eacute;(s)' : '');
    },

    /** Les produits ABC coches, ou tous ceux affiches ; et le libelle qui le dit. */
    produitsAbc: function () {
        var grille = this.getGardeManager().down('#grilleAbc');
        var coches = grille.getSelectionModel().getSelection();
        var lignes = coches.length ? coches : grille.getStore().getRange();
        return {
            ids: Ext.Array.map(lignes, function (l) {
                return l.get('produitId') || l.get('cip');
            }),
            libelle: coches.length ? coches.length + ' produit(s) coch&eacute;(s)'
                    : 'les ' + lignes.length + ' produit(s) affich&eacute;(s)'
        };
    },

    doInventaire: function () {
        this.envoyerProduits('/inventaire', 'Cr&eacute;er un inventaire de ');
    },

    doSuggestion: function () {
        this.envoyerProduits('/suggestion', 'Envoyer en suggestion de commande ');
    },

    envoyerProduits: function (chemin, question) {
        var me = this;
        var garde = me.gardeCourante();
        if (!garde) {
            Ext.MessageBox.alert('Information', 'Choisissez une garde dans la liste.');
            return;
        }
        var produits = me.produitsAbc();
        if (!produits.ids.length) {
            Ext.MessageBox.alert('Information', 'Aucun produit vendu sur cette garde.');
            return;
        }
        Ext.MessageBox.confirm('Confirmation', question + '<b>' + produits.libelle + '</b> de la garde <b>'
                + Ext.String.htmlEncode(garde.get('libelle')) + '</b> ?', function (choix) {
            if (choix !== 'yes') {
                return;
            }
            var attente = Ext.MessageBox.wait('Veuillez patienter . . .', 'Traitement en cours');
            Ext.Ajax.request({
                url: '../api/v1/gardes/' + garde.get('id') + chemin,
                method: 'POST',
                jsonData: {produits: produits.ids},
                timeout: 600000,
                /* L'attente est fermee AVANT d'afficher le resultat : la boite de message est unique,
                   la fermer dans le rappel final aurait aussi ferme le resultat qu'on vient d'afficher. */
                success: function (reponse) {
                    attente.hide();
                    var objet = Ext.JSON.decode(reponse.responseText, true) || {};
                    Ext.MessageBox.alert(objet.success ? 'Information' : 'Message',
                            objet.msg || (objet.success ? 'Op&eacute;ration effectu&eacute;e.' : 'Op&eacute;ration impossible.'));
                },
                failure: function () {
                    attente.hide();
                    Ext.MessageBox.alert('Message', 'L\'op&eacute;ration n\'a pas pu &ecirc;tre effectu&eacute;e.');
                }
            });
        });
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
        ecran.abcStore.getProxy().data = [];
        ecran.abcStore.removeAll();
        ecran.resumeStore.removeAll();
        ecran.vendeurStore.removeAll();
        ecran.commandeStore.removeAll();
        ecran.down('#abcCompte').setText('');
        ecran.down('#abcCoches').setText('');
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
            limite: valeur('abcLimite', 0),
            famille: valeur('abcFamille', ''),
            rayon: valeur('abcRayon', ''),
            grossiste: valeur('abcGrossiste', '')
        };
    },

    /** Les parametres du rapport sans l'identifiant, tels qu'on les passe a l'URL. */
    parametresRapport: function (params) {
        return {heures: params.heures, classe: params.classe, tri: params.tri, limite: params.limite,
            famille: params.famille, rayon: params.rayon, grossiste: params.grossiste};
    },

    /** Un clic sur une classe du resume filtre les produits de droite sur cette classe (bascule). */
    doChoisirClasse: function (grille, ligne) {
        var ecran = this.getGardeManager();
        var combo = ecran.down('#abcClasse');
        var classe = ligne.get('classe') || '';
        combo.setValue(combo.getValue() === classe ? '' : classe);
        this.doAnalyser();
    },

    doEffacerFiltres: function () {
        var ecran = this.getGardeManager();
        Ext.each(['abcRayon', 'abcFamille', 'abcGrossiste'], function (itemId) {
            var champ = ecran.down('#' + itemId);
            if (champ) {
                champ.clearValue();
            }
        });
        ecran.down('#abcClasse').setValue('');
        ecran.down('#abcLimite').setValue(0);
        this.doAnalyser();
    },

    doImprimerCommandes: function () {
        var garde = this.gardeCourante();
        if (!garde) {
            Ext.MessageBox.alert('Information', 'Choisissez une garde dans la liste.');
            return;
        }
        // Rendu en flux dans l'onglet ouvert par le clic : aucune fenetre intermediaire.
        window.open('../api/v1/gardes/' + garde.get('id') + '/commandes/pdf');
    },

    doExporterCommandes: function () {
        var garde = this.gardeCourante();
        if (!garde) {
            Ext.MessageBox.alert('Information', 'Choisissez une garde dans la liste.');
            return;
        }
        window.open('../api/v1/gardes/' + garde.get('id') + '/commandes/excel');
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
                // Pagination locale : le magasin decoupe la vue filtree rendue par le serveur.
                ecran.abcStore.getProxy().data = objet.abc || [];
                ecran.abcStore.loadPage(1);
                ecran.resumeStore.loadData(objet.resumeAbc || []);
                ecran.down('#abcCoches').setText('');
                // Les onglets vendeurs et commandes suivent la garde choisie, s'ils sont ouverts.
                var actif = ecran.down('#ongletsGarde').getActiveTab();
                if (actif && actif.itemId === 'ongletVendeurs') {
                    me.doChargerVendeurs();
                } else if (actif && actif.itemId === 'ongletCommandes') {
                    me.doChargerCommandes();
                } else if (actif && actif.itemId === 'ongletActivite') {
                    me.redessiner('#courbeActivite');
                }
                var affiches = objet.totalFiltre !== undefined ? objet.totalFiltre : (objet.abc || []).length;
                var total = objet.totalAbc || affiches;
                ecran.down('#abcCompte').setText(affiches < total
                        ? '<b>' + affiches + '</b> produit(s) affich&eacute;(s) sur ' + total
                        : '<b>' + total + '</b> produit(s)');
                var i = objet.indicateurs || {};
                // Retour des tests du 09/09 : la periode REELLEMENT analysee est rappelee en tete, pour que
                // des chiffres qui etonnent se lisent d'abord a l'aune des bornes de la garde.
                var g = objet.garde || {};
                var periode = g.jourDebut ? ' <span style="color:#555">(du ' + g.jourDebut + ' ' + (g.heureDebut || '')
                        + ' au ' + g.jourFin + ' ' + (g.heureFin || '') + ')</span>' : '';
                indicateurs.update('<b>' + g.libelle + '</b>' + periode + ' &middot; <b>' + (i.ventes || 0)
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
            success: function (reponse) {
                attente.hide();
                var objet = Ext.JSON.decode(reponse.responseText, true) || {};
                if (objet.success && objet.url) {
                    window.open('..' + objet.url);
                } else {
                    Ext.MessageBox.alert('Message',
                            objet.msg || 'L\'&eacute;dition n\'a pas pu &ecirc;tre g&eacute;n&eacute;r&eacute;e.');
                }
            },
            failure: function () {
                attente.hide();
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
        var me = this;
        var ecran = me.getGardeManager();
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
                me.redessiner('#courbeComparaison');
            },
            failure: function () {
                Ext.MessageBox.alert('Message', 'La comparaison n\'a pas pu &ecirc;tre calcul&eacute;e.');
            }
        });
    }
});
