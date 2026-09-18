/* global Ext */

/**
 * « Gestion ordonnances clients » (évolution 6, point 2, vague 1).
 *
 * Deux vues dans un layout card : l'historique et la fiche. Aucune fenêtre modale : l'officine a demandé
 * qu'aucun écran ne s'ouvre en pop-up.
 *
 * Les droits sont demandés au serveur à l'ouverture (v1/ordonnance-client/droits) et retirent les BOUTONS
 * d'écriture à qui n'a pas P_ORDONNANCE_CLIENT_MAJ. Le serveur revérifie chaque appel : masquer un bouton
 * n'est pas un contrôle d'accès, surtout sur des données de santé.
 *
 * Tous les sélecteurs sont qualifiés par `ordonnanceclient` et par la vue visée : les deux vues portent des
 * composants de même nature (un combo client dans chacune), et un sélecteur trop large en piloterait un autre
 * que le sien. C'est la classe de bug rencontrée deux fois sur ce projet.
 */
Ext.define('testextjs.controller.OrdonnanceClientCtr', {
    extend: 'Ext.app.Controller',

    views: ['testextjs.view.serviceclient.ordonnance.OrdonnanceClientManager'],

    refs: [
        {ref: 'ecran', selector: 'ordonnanceclient'},
        {ref: 'grille', selector: 'ordonnanceclient #grilleOrdonnances'},
        {ref: 'grilleProduits', selector: 'ordonnanceclient #grilleProduits'},
        {ref: 'fiche', selector: 'ordonnanceclient #vueFiche'},
        {ref: 'criteres', selector: 'ordonnanceclient #barreCriteres'}
    ],

    init: function () {
        var me = this;
        me.control({
            'ordonnanceclient': {afterrender: me.surAffichage},
            'ordonnanceclient #barreCriteres button[itemId=rechercher]': {click: me.rechercher},
            'ordonnanceclient #barreCriteres button[itemId=reinitialiser]': {click: me.reinitialiser},
            'ordonnanceclient #barreCriteres button[itemId=nouvelle]': {click: me.nouvelleOrdonnance},
            'ordonnanceclient #barreCriteres textfield[itemId=recherche]': {specialkey: me.surTouche},
            'ordonnanceclient #barreCriteres combobox[itemId=typeClient]': {select: me.rechercher},
            'ordonnanceclient #barreCriteres combobox[itemId=client]': {select: me.rechercher},
            'ordonnanceclient #barreCriteres combobox[itemId=medecin]': {select: me.rechercher},
            'ordonnanceclient #barreCriteres checkbox[itemId=annulees]': {change: me.rechercher},
            'ordonnanceclient #grilleOrdonnances': {
                selectionchange: me.surSelection,
                itemdblclick: me.consulter
            },
            'ordonnanceclient #grilleOrdonnances button[itemId=consulter]': {click: me.consulter},
            'ordonnanceclient #grilleOrdonnances button[itemId=modifier]': {click: me.modifier},
            'ordonnanceclient #grilleOrdonnances button[itemId=annuler]': {click: me.demanderAnnulation},
            'ordonnanceclient #vueFiche button[itemId=retourHistorique]': {click: me.retourHistorique},
            'ordonnanceclient #vueFiche button[itemId=abandonner]': {click: me.retourHistorique},
            'ordonnanceclient #vueFiche button[itemId=enregistrer]': {click: me.enregistrer},
            'ordonnanceclient #vueFiche button[itemId=nouveauClient]': {click: me.nouveauClient},
            'ordonnanceclient #grilleProduits button[itemId=ajouterProduit]': {click: me.ajouterProduit},
            'ordonnanceclient #grilleProduits combobox[itemId=editeurProduit]': {select: me.surChoixArticle}
        });
    },

    /* ------------------------------------------------------------------ ouverture */

    surAffichage: function (ecran) {
        var me = this;
        ecran.storeTypesClient.load();
        ecran.storeMedecins.load();
        me.chargerDroits();
        me.rechercher();
    },

    /**
     * Droits de l'opérateur. Tant que la réponse n'est pas là, les boutons d'écriture restent masqués : on
     * n'offre jamais un geste qu'on devra refuser ensuite.
     */
    chargerDroits: function () {
        var me = this;
        me.droits = {consulter: true, modifier: false};
        me.appliquerDroits();
        Ext.Ajax.request({
            url: '../api/v1/ordonnance-client/droits',
            method: 'GET',
            success: function (reponse) {
                var r = Ext.decode(reponse.responseText, true) || {};
                me.droits = {consulter: r.consulter === true, modifier: r.modifier === true};
                me.appliquerDroits();
            },
            failure: function () {
                me.appliquerDroits();
            }
        });
    },

    appliquerDroits: function () {
        var me = this;
        var ecran = me.getEcran();
        if (!ecran) {
            return;
        }
        var peutEcrire = !!(me.droits && me.droits.modifier);
        var basculer = function (selecteur) {
            var c = ecran.down(selecteur);
            if (c) {
                c.setVisible(peutEcrire);
            }
        };
        basculer('#barreCriteres button[itemId=nouvelle]');
        basculer('#grilleOrdonnances button[itemId=modifier]');
        basculer('#grilleOrdonnances button[itemId=annuler]');
        basculer('#vueFiche button[itemId=enregistrer]');
        basculer('#vueFiche button[itemId=nouveauClient]');
    },

    /* ----------------------------------------------------------------- historique */

    surTouche: function (champ, e) {
        if (e.getKey() === e.ENTER) {
            this.rechercher();
        }
    },

    parametres: function () {
        var me = this;
        var ecran = me.getEcran();
        var lire = function (selecteur) {
            var c = ecran.down(selecteur);
            return c ? c.getValue() : null;
        };
        var jour = function (selecteur) {
            var v = lire(selecteur);
            return v ? Ext.Date.format(v, 'Y-m-d') : '';
        };
        return {
            query: lire('#barreCriteres #recherche') || '',
            typeClientId: lire('#barreCriteres #typeClient') || '',
            clientId: lire('#barreCriteres #client') || '',
            medecinId: lire('#barreCriteres #medecin') || '',
            dtStart: jour('#barreCriteres #dtStart'),
            dtEnd: jour('#barreCriteres #dtEnd'),
            annulees: lire('#barreCriteres #annulees') === true
        };
    },

    rechercher: function () {
        var me = this;
        var ecran = me.getEcran();
        if (!ecran) {
            return;
        }
        var store = ecran.storeOrdonnances;
        store.getProxy().extraParams = me.parametres();
        store.loadPage(1);
    },

    reinitialiser: function () {
        var me = this;
        var ecran = me.getEcran();
        Ext.each(['#recherche', '#typeClient', '#client', '#medecin', '#dtStart', '#dtEnd'], function (s) {
            var c = ecran.down('#barreCriteres ' + s);
            if (c) {
                c.setValue(null);
            }
        });
        var annulees = ecran.down('#barreCriteres #annulees');
        if (annulees) {
            annulees.setValue(false);
        }
        me.rechercher();
    },

    surSelection: function (modele, lignes) {
        var me = this;
        var ecran = me.getEcran();
        var une = lignes && lignes.length === 1 ? lignes[0] : null;
        var annulee = une && une.get('statut') === 'annulee';
        var actif = function (selecteur, etat) {
            var b = ecran.down(selecteur);
            if (b) {
                b.setDisabled(!etat);
            }
        };
        actif('#grilleOrdonnances button[itemId=consulter]', !!une);
        /*
         * Une ordonnance annulée est un document clos : elle se consulte mais ne se modifie plus, et ne
         * s'annule pas deux fois. Le serveur le refuse aussi.
         */
        actif('#grilleOrdonnances button[itemId=modifier]', !!une && !annulee);
        actif('#grilleOrdonnances button[itemId=annuler]', !!une && !annulee);
    },

    /* ---------------------------------------------------------------------- fiche */

    montrer: function (index) {
        var ecran = this.getEcran();
        if (ecran) {
            ecran.getLayout().setActiveItem(index);
        }
    },

    retourHistorique: function () {
        this.montrer(0);
        this.rechercher();
    },

    nouvelleOrdonnance: function () {
        var me = this;
        var ecran = me.getEcran();
        me.viderFiche();
        ecran.down('#vueFiche #ficheDate').setValue(new Date());
        ecran.down('#vueFiche #titreFiche').setValue('Nouvelle ordonnance');
        me.lectureSeule(false);
        me.montrer(1);
        me.ajouterProduit();
    },

    viderFiche: function () {
        var ecran = this.getEcran();
        var fiche = ecran.down('#vueFiche');
        Ext.each(['#ordonnanceId', '#ficheClient', '#ficheDate', '#ficheMedecin', '#ficheEtablissement',
            '#observations'], function (s) {
            var c = fiche.down(s);
            if (c) {
                c.setValue(null);
            }
        });
        ecran.storeProduits.removeAll();
    },

    /** Consultation : la fiche s'ouvre en lecture, sans qu'on puisse la modifier par inadvertance. */
    lectureSeule: function (verrou) {
        var ecran = this.getEcran();
        var fiche = ecran.down('#vueFiche');
        Ext.each(['#ficheClient', '#ficheDate', '#ficheMedecin', '#ficheEtablissement', '#observations'],
                function (s) {
                    var c = fiche.down(s);
                    if (c) {
                        c.setReadOnly(verrou);
                    }
                });
        var grille = ecran.down('#grilleProduits');
        if (grille) {
            /* L'edition de cellule est un plugin : c'est LUI qu'il faut desactiver, pas la grille. */
            Ext.each(grille.plugins || [], function (p) {
                if (p && p.setDisabled) {
                    p.setDisabled(verrou);
                }
            });
            var ajouter = grille.down('button[itemId=ajouterProduit]');
            if (ajouter) {
                ajouter.setVisible(!verrou);
            }
            Ext.each(grille.columns || [], function (c) {
                if (c.getItemId && c.getItemId() === 'colSupprimer') {
                    c.setVisible(!verrou);
                }
            });
        }
        var enregistrer = ecran.down('#vueFiche button[itemId=enregistrer]');
        if (enregistrer) {
            enregistrer.setVisible(!verrou && !!(this.droits && this.droits.modifier));
        }
    },

    consulter: function () {
        this.ouvrirFiche(true);
    },

    modifier: function () {
        this.ouvrirFiche(false);
    },

    ouvrirFiche: function (enLecture) {
        var me = this;
        var grille = me.getGrille();
        var ligne = grille ? grille.getSelectionModel().getSelection()[0] : null;
        if (!ligne) {
            return;
        }
        Ext.Ajax.request({
            url: '../api/v1/ordonnance-client/' + encodeURIComponent(ligne.get('id')),
            method: 'GET',
            success: function (reponse) {
                var r = Ext.decode(reponse.responseText, true) || {};
                if (r.success !== true) {
                    Ext.Msg.alert('Ordonnances', r.message || "L'ordonnance n'a pas pu être lue.");
                    return;
                }
                me.remplirFiche(r, enLecture);
            },
            failure: function () {
                Ext.Msg.alert('Ordonnances', "L'ordonnance n'a pas pu être lue.");
            }
        });
    },

    remplirFiche: function (reponse, enLecture) {
        var me = this;
        var ecran = me.getEcran();
        var o = reponse.ordonnance || {};
        me.viderFiche();
        var fiche = ecran.down('#vueFiche');
        fiche.down('#ordonnanceId').setValue(o.id || '');
        /*
         * Le client et le prescripteur sont posés SANS interroger le serveur : on ajoute l'enregistrement au
         * store du combo à partir de ce que la fiche vient de rendre. Sans cela, le combo afficherait
         * l'identifiant technique tant que la liste distante n'aurait pas répondu.
         */
        if (o.clientId) {
            var modeleClient = ecran.storeClients.getProxy().getModel();
            ecran.storeClients.add(new modeleClient({
                lgCLIENTID: o.clientId,
                strFIRSTNAME: o.client || '',
                strLASTNAME: '',
                strTELEPHONE: o.telephone || ''
            }));
            fiche.down('#ficheClient').setValue(o.clientId);
        }
        if (o.dateOrdonnance) {
            fiche.down('#ficheDate').setValue(Ext.Date.parse(o.dateOrdonnance, 'Y-m-d'));
        }
        if (o.medecinId) {
            if (ecran.storeMedecins.findExact('id', o.medecinId) < 0) {
                var modeleMedecin = ecran.storeMedecins.getProxy().getModel();
                ecran.storeMedecins.add(new modeleMedecin({id: o.medecinId, nom: o.medecin || ''}));
            }
            fiche.down('#ficheMedecin').setValue(o.medecinId);
        }
        fiche.down('#ficheEtablissement').setValue(o.etablissement || '');
        fiche.down('#observations').setValue(o.observations || '');
        var produits = reponse.produits || [];
        Ext.each(produits, function (p) {
            ecran.storeProduits.add({
                articleId: p.articleId || '',
                libelle: p.libelle || '',
                cip: p.cip || '',
                quantite: p.quantite || 1,
                posologie: p.posologie || '',
                duree: p.duree || ''
            });
        });
        ecran.storeProduits.commitChanges();
        fiche.down('#titreFiche').setValue('Ordonnance ' + (o.numero || '') + ' — ' + (o.client || '')
                + (o.statut === 'annulee' ? ' (ANNULÉE : ' + (o.motifAnnulation || '') + ')' : ''));
        me.lectureSeule(enLecture === true || o.statut === 'annulee');
        me.montrer(1);
    },

    /* ------------------------------------------------------------------- produits */

    ajouterProduit: function () {
        var ecran = this.getEcran();
        var store = ecran.storeProduits;
        store.add({articleId: '', libelle: '', cip: '', quantite: 1, posologie: '', duree: ''});
        var grille = this.getGrilleProduits();
        if (grille) {
            var ligne = store.getCount() - 1;
            var edition = (grille.plugins || [])[0];
            if (edition && edition.startEditByPosition) {
                edition.startEditByPosition({row: ligne, column: 0});
            }
        }
    },

    /**
     * Article choisi dans le référentiel : on RECOPIE son libellé et son CIP dans la ligne. Le référentiel
     * évolue (renommage, retrait) ; le document, lui, ne doit pas changer de sens des années après sa saisie.
     */
    surChoixArticle: function (combo, lignes) {
        var article = lignes && lignes.length ? lignes[0] : null;
        if (!article) {
            return;
        }
        var grille = this.getGrilleProduits();
        var position = grille ? grille.getSelectionModel().getCurrentPosition() : null;
        var ligne = position ? grille.getStore().getAt(position.row) : null;
        if (!ligne) {
            return;
        }
        ligne.set('articleId', article.get('lgFAMILLEID'));
        ligne.set('libelle', article.get('strNAME'));
        ligne.set('cip', article.get('intCIP') || '');
    },

    /* --------------------------------------------------------------- enregistrement */

    enregistrer: function () {
        var me = this;
        var ecran = me.getEcran();
        var fiche = ecran.down('#vueFiche');
        var date = fiche.down('#ficheDate').getValue();
        var produits = [];
        ecran.storeProduits.each(function (r) {
            produits.push({
                articleId: r.get('articleId') || '',
                libelle: r.get('libelle') || '',
                quantite: r.get('quantite') || 1,
                posologie: r.get('posologie') || '',
                duree: r.get('duree') || ''
            });
        });
        var requete = {
            id: fiche.down('#ordonnanceId').getValue() || '',
            clientId: fiche.down('#ficheClient').getValue() || '',
            dateOrdonnance: date ? Ext.Date.format(date, 'Y-m-d') : '',
            medecinId: fiche.down('#ficheMedecin').getValue() || '',
            etablissement: fiche.down('#ficheEtablissement').getRawValue() || '',
            observations: fiche.down('#observations').getValue() || '',
            produits: produits
        };
        Ext.Ajax.request({
            url: '../api/v1/ordonnance-client/enregistrer',
            method: 'POST',
            jsonData: requete,
            success: function (reponse) {
                var r = Ext.decode(reponse.responseText, true) || {};
                if (r.success !== true) {
                    Ext.Msg.alert('Ordonnances', r.message || "L'ordonnance n'a pas pu être enregistrée.");
                    return;
                }
                me.retourHistorique();
            },
            failure: function () {
                Ext.Msg.alert('Ordonnances', "L'ordonnance n'a pas pu être enregistrée.");
            }
        });
    },

    /**
     * Annulation : le motif est OBLIGATOIRE, et le document reste dans l'historique du client. Il n'y a pas de
     * suppression — une ordonnance effacée laisserait un trou dont personne ne pourrait dire s'il vient d'un
     * document qui n'a jamais existé ou d'un document supprimé.
     */
    demanderAnnulation: function () {
        var me = this;
        var grille = me.getGrille();
        var ligne = grille ? grille.getSelectionModel().getSelection()[0] : null;
        if (!ligne) {
            return;
        }
        Ext.Msg.prompt('Annuler l\'ordonnance ' + ligne.get('numero'),
                'Motif de l\'annulation (obligatoire) :', function (bouton, texte) {
                    if (bouton !== 'ok') {
                        return;
                    }
                    if (!texte || !Ext.String.trim(texte)) {
                        Ext.Msg.alert('Ordonnances', 'Le motif de l\'annulation est obligatoire.');
                        return;
                    }
                    Ext.Ajax.request({
                        url: '../api/v1/ordonnance-client/annuler?id=' + encodeURIComponent(ligne.get('id'))
                                + '&motif=' + encodeURIComponent(Ext.String.trim(texte)),
                        method: 'POST',
                        success: function (reponse) {
                            var r = Ext.decode(reponse.responseText, true) || {};
                            if (r.success !== true) {
                                Ext.Msg.alert('Ordonnances', r.message || "L'annulation a échoué.");
                                return;
                            }
                            me.rechercher();
                        },
                        failure: function () {
                            Ext.Msg.alert('Ordonnances', "L'annulation a échoué.");
                        }
                    });
                }, me, true);
    },

    /**
     * Création d'un client depuis le menu : on ouvre l'écran de création qui existe déjà, on ne récrit pas une
     * troisième saisie de client. Au retour, le client créé est sélectionné dans la fiche.
     */
    nouveauClient: function () {
        var me = this;
        var ecran = me.getEcran();
        var fenetre = Ext.create('Ext.window.Window', {
            title: 'NOUVEAU CLIENT',
            modal: true,
            width: 620,
            autoHeight: true,
            layout: 'fit',
            items: [{xtype: 'clientLambda'}]
        });
        fenetre.on('close', function () {
            /* Le client vient peut-être d'être créé : on recharge la liste pour qu'il soit trouvable. */
            ecran.storeClients.load();
        });
        fenetre.show();
    }
});
