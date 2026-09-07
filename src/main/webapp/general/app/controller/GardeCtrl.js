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
            'gardemanager #gardeImprimer': {click: this.doImprimer},
            'gardemanager #gardeExporterAbc': {click: this.doExporterAbc},
            'gardemanager #gardeExporterTranches': {click: this.doExporterTranches},
            'gardemanager #comparerDernieres': {click: this.doComparerDernieres},
            'gardemanager #comparerSelection': {click: this.doComparerSelection},
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
                bouton.enable();
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

    doSupprimer: function () {
        var me = this;
        var garde = me.gardeCourante();
        if (!garde) {
            Ext.MessageBox.alert('Information', 'Choisissez une garde dans la liste.');
            return;
        }
        Ext.MessageBox.confirm('Confirmation',
                'Supprimer la garde <b>' + garde.get('libelle') + '</b> ?<br/>'
                + 'Aucune vente ne sera supprim&eacute;e : seule la d&eacute;finition de la '
                + 'p&eacute;riode dispara&icirc;t.',
                function (choix) {
                    if (choix !== 'yes') {
                        return;
                    }
                    Ext.Ajax.request({
                        url: '../api/v1/gardes/' + garde.get('id'),
                        method: 'DELETE',
                        success: function (reponse) {
                            var objet = Ext.JSON.decode(reponse.responseText, true) || {};
                            if (!objet.success) {
                                Ext.MessageBox.alert('Message', objet.msg || 'Suppression impossible.');
                                return;
                            }
                            me.getGardeManager().gardeStore.reload();
                            me.viderAnalyse();
                        },
                        failure: function () {
                            Ext.MessageBox.alert('Message', 'La garde n\'a pas pu &ecirc;tre supprim&eacute;e.');
                        }
                    });
                });
    },

    viderAnalyse: function () {
        var ecran = this.getGardeManager();
        ecran.trancheStore.removeAll();
        ecran.abcStore.removeAll();
        ecran.resumeStore.removeAll();
        ecran.down('#gardeIndicateurs').update('<i>Choisissez une garde dans la liste de gauche.</i>');
    },

    /** Largeur de tranche choisie, et identifiant de la garde : les deux parametres du rapport. */
    parametres: function () {
        var garde = this.gardeCourante();
        var champ = this.getGardeManager().down('#gardeHeures');
        return {
            id: garde ? garde.get('id') : null,
            heures: champ ? champ.getValue() : 2
        };
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
            params: {heures: params.heures},
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
                var i = objet.indicateurs || {};
                indicateurs.update('<b>' + (objet.garde || {}).libelle + '</b> &middot; <b>' + (i.ventes || 0)
                        + '</b> vente(s) &middot; <b>' + (i.lignes || 0) + '</b> ligne(s) &middot; <b>'
                        + (i.produitsDistincts || 0) + '</b> produit(s) &middot; <b>' + (i.quantite || 0)
                        + '</b> unit&eacute;(s) &middot; <b>'
                        + Ext.util.Format.number(i.montant || 0, '0,000') + '</b> au total &middot; <b>'
                        + Ext.util.Format.number(i.montantParHeure || 0, '0,000') + '</b> par heure');
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
        window.open('../api/v1/gardes/' + params.id + chemin + '?heures=' + params.heures);
    },

    doComparerDernieres: function () {
        this.comparer('');
    },

    doComparerSelection: function () {
        var selection = this.getGrilleGardes().getSelectionModel().getSelection();
        if (selection.length < 2) {
            Ext.MessageBox.alert('Information',
                    'S&eacute;lectionnez au moins deux gardes dans la liste de gauche '
                    + '(Ctrl + clic), ou utilisez « Trois derni&egrave;res ».');
            return;
        }
        this.comparer(Ext.Array.map(selection, function (g) {
            return g.get('id');
        }).join(','));
    },

    comparer: function (ids) {
        var ecran = this.getGardeManager();
        Ext.Ajax.request({
            url: '../api/v1/gardes/comparaison',
            method: 'GET',
            params: {ids: ids},
            timeout: 600000,
            success: function (reponse) {
                var objet = Ext.JSON.decode(reponse.responseText, true) || {};
                // Le serveur imbrique les indicateurs : on les remonte d'un cran pour que la
                // grille les lise directement.
                var lignes = Ext.Array.map(objet.data || [], function (ligne) {
                    return Ext.apply({}, ligne, ligne.indicateurs || {});
                });
                ecran.comparaisonStore.loadData(lignes);
                ecran.down('#ongletsGarde').setActiveTab(ecran.down('#ongletComparaison'));
            },
            failure: function () {
                Ext.MessageBox.alert('Message', 'La comparaison n\'a pas pu &ecirc;tre calcul&eacute;e.');
            }
        });
    }
});
