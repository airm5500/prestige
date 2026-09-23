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
        {ref: 'criteres', selector: 'ordonnanceclient #barreCriteres'},
        {ref: 'grillePieces', selector: 'ordonnanceclient #grillePieces'}
    ],

    init: function () {
        var me = this;
        me.control({
            'ordonnanceclient': {afterrender: me.surAffichage},
            'ordonnanceclient #barreCriteres button[itemId=rechercher]': {click: me.rechercher},
            'ordonnanceclient #barreCriteres button[itemId=reinitialiser]': {click: me.reinitialiser},
            'ordonnanceclient #grilleOrdonnances button[itemId=nouvelle]': {click: me.nouvelleOrdonnance},
            'ordonnanceclient #barreCriteres textfield[itemId=recherche]': {specialkey: me.surTouche},
            'ordonnanceclient #barreCriteres combobox[itemId=typeClient]': {select: me.rechercher},
            'ordonnanceclient #barreCriteres combobox[itemId=client]': {select: me.rechercher},
            'ordonnanceclient #barreCriteres combobox[itemId=medecin]': {select: me.rechercher},
            'ordonnanceclient #barreCriteres checkbox[itemId=annulees]': {change: me.rechercher},
            'ordonnanceclient #grilleOrdonnances': {
                /* Les icones d'action de chaque ligne (22/09) remontent toutes par cet evenement. */
                actionordonnance: me.surAction,
                itemdblclick: me.consulter
            },
            'ordonnanceclient #vueFiche button[itemId=retourHistorique]': {click: me.retourHistorique},
            'ordonnanceclient #vueFiche button[itemId=abandonner]': {click: me.retourHistorique},
            'ordonnanceclient #vueFiche button[itemId=enregistrer]': {click: me.enregistrer},
            'ordonnanceclient #vueFiche button[itemId=nouveauClient]': {click: me.nouveauClient},
            'ordonnanceclient #grilleOrdonnances button[itemId=imprimerHistorique]': {click: me.imprimerHistorique},
            'ordonnanceclient #grilleOrdonnances button[itemId=exporterExcel]': {click: me.exporterExcel},
            'ordonnanceclient #vueFiche button[itemId=imprimerFicheOuverte]': {click: me.imprimerFicheOuverte},
            'ordonnanceclient #grillePieces button[itemId=joindrePiece]': {click: me.joindrePiece},
            'ordonnanceclient #grillePieces button[itemId=voirPiece]': {click: me.voirPiece},
            'ordonnanceclient #grillePieces button[itemId=telechargerPiece]': {click: me.telechargerPiece},
            'ordonnanceclient #grillePieces button[itemId=retirerPiece]': {click: me.retirerPiece},
            'ordonnanceclient #grillePieces filefield[itemId=fichierPiece]': {change: me.surChoixFichier},
            'ordonnanceclient #grillePieces': {selectionchange: me.surSelectionPiece},
            'ordonnanceclient #grilleProduits button[itemId=ajouterProduit]': {click: me.ajouterProduit},
            'ordonnanceclient #grilleProduits combobox[itemId=editeurProduit]': {select: me.surChoixArticle},
            'ordonnanceclient #grilleProduits button[itemId=toutServir]': {click: me.toutServir},
            'ordonnanceclient #grilleProduits': {equivalents: me.montrerEquivalents},
            'ordonnanceclient #grilleSubstituts': {remplacer: me.remplacerParEquivalent},
            'ordonnanceclient #alertesFiche': {proposes: me.montrerProposes},
            'ordonnanceclient #vueFiche button[itemId=analyserPosos]': {click: me.analyserFiche},
            'ordonnanceclient #vueFiche button[itemId=consoFiche]': {click: me.consoDepuisFiche},
            'ordonnanceclient #vueFiche combobox[itemId=ficheClient]': {change: me.majBoutonConso},
            'ordonnanceclient #vueConso button[itemId=retourConso]': {click: me.retourConso},
            'ordonnanceclient #vueConso button[itemId=actualiserConso]': {click: me.chargerConso},
            'ordonnanceclient #vueConso button[itemId=pososConso]': {click: me.analyserConso},
            'ordonnanceclient #vueAnalyse': {activate: me.surOngletAnalyse},
            'ordonnanceclient #vueAnalyse button[itemId=calculerAnalyse]': {click: me.calculerAnalyse},
            'ordonnanceclient #vueAnalyse button[itemId=effacerAnalyse]': {click: me.effacerAnalyse},
            'ordonnanceclient #vueAnalyse button[itemId=imprimerAnalyse]': {click: me.imprimerAnalyse}
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
        /* Lu par les icones Modifier et Annuler de chaque ligne : sans le droit, elles sont grisees. */
        ecran.peutEcrire = peutEcrire;
        var grille = ecran.down('#grilleOrdonnances');
        if (grille && grille.getView() && grille.rendered) {
            grille.getView().refresh();
        }
        var basculer = function (selecteur) {
            var c = ecran.down(selecteur);
            if (c) {
                c.setVisible(peutEcrire);
            }
        };
        basculer('#grilleOrdonnances button[itemId=nouvelle]');
        basculer('#grilleProduits button[itemId=toutServir]');
        basculer('#vueFiche button[itemId=enregistrer]');
        basculer('#vueFiche button[itemId=nouveauClient]');
        basculer('#grillePieces button[itemId=joindrePiece]');
        basculer('#grillePieces button[itemId=retirerPiece]');
        basculer('#grillePieces filefield[itemId=fichierPiece]');
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

    /**
     * Une icone d'action d'une ligne de l'historique (22/09). La ligne est passee avec le clic : on n'a plus
     * a la selectionner d'abord, ce qui etait le geste qui ne « faisait rien » au comptoir.
     */
    surAction: function (nom, ligne) {
        var me = this;
        var ecran = me.getEcran();
        var ecriture = nom === 'modifier' || nom === 'annuler';
        if (ecriture && (ligne.get('statut') === 'annulee' || !(ecran && ecran.peutEcrire))) {
            return;
        }
        switch (nom) {
            case 'consulter':
                me.ouvrirFiche(true, ligne);
                break;
            case 'modifier':
                me.ouvrirFiche(false, ligne);
                break;
            case 'imprimer':
                me.imprimerFiche(ligne);
                break;
            case 'conso':
                me.ouvrirConso(ligne.get('clientId'), ligne.get('client'), null);
                break;
            case 'annuler':
                me.demanderAnnulation(ligne);
                break;
        }
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
        /*
         * La ligne produit est amorcee SANS ouvrir son editeur, et le curseur va dans le CLIENT, la premiere
         * saisie (22/09). L'editeur ouvert d'office reprenait le focus au premier caractere tape dans le client :
         * la frappe partait dans la grille.
         */
        me.ajouterProduit(false);
        me.majBoutonConso();
        var champClient = ecran.down('#vueFiche #ficheClient');
        if (champClient) {
            champClient.focus(false, 150);
        }
        me.chargerPieces();
    },

    /*
     * VIDER LA FICHE SANS FAIRE TOMBER LES COMBOS (retour du 22/09 : « TypeError : getId, a is undefined » au
     * clic sur Consulter, Modifier et Nouvelle ordonnance). Un combo ExtJS 4.2 se vide par clearValue(), pas
     * par setValue(null) : la seconde forme repasse par le modele de selection de sa liste, qui relit chaque
     * enregistrement selectionne par son identifiant - et un enregistrement pose a la main sans identifiant
     * n'en a pas. Les evenements sont suspendus le temps du vidage : vider n'est pas choisir.
     */
    viderFiche: function () {
        var ecran = this.getEcran();
        var fiche = ecran ? ecran.down('#vueFiche') : null;
        if (!fiche) {
            return;
        }
        Ext.each(['#ordonnanceId', '#ficheClient', '#ficheDate', '#ficheMedecin', '#ficheEtablissement',
            '#observations', '#agePatient', '#sexePatient', '#grossesse', '#allaitement', '#insuffisanceRenale',
            '#insuffisanceHepatique'], function (s) {
            var c = fiche.down(s);
            if (!c) {
                return;
            }
            c.suspendEvents(false);
            try {
                if (c.isXType('combobox')) {
                    c.clearValue();
                } else {
                    c.setValue(null);
                }
            } catch (e) {
                /* Un champ qui refuse de se vider ne doit pas empecher d'ouvrir la fiche. */
            }
            c.resumeEvents();
        });
        ecran.storeProduits.removeAll();
        /* Les alertes d'une autre ordonnance ne doivent jamais rester affichees sous celle-ci. */
        ecran.storeAlertesFiche.removeAll();
        var alertes = fiche.down('#alertesFiche');
        if (alertes) {
            alertes.hide();
        }
        var substituts = fiche.down('#grilleSubstituts');
        if (substituts) {
            substituts.hide();
        }
        this.ligneASubstituer = null;
    },

    /** Consultation : la fiche s'ouvre en lecture, sans qu'on puisse la modifier par inadvertance. */
    lectureSeule: function (verrou) {
        var ecran = this.getEcran();
        /* Memorise : les boutons des pieces suivent le meme verrou que le reste de la fiche. */
        this.ficheVerrouillee = verrou === true;
        var fiche = ecran.down('#vueFiche');
        Ext.each(['#ficheClient', '#ficheDate', '#ficheMedecin', '#ficheEtablissement', '#observations',
            '#agePatient', '#sexePatient', '#grossesse', '#allaitement', '#insuffisanceRenale',
            '#insuffisanceHepatique'],
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
            var servir = grille.down('button[itemId=toutServir]');
            if (servir) {
                servir.setVisible(!verrou && !!(this.droits && this.droits.modifier));
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

    /** Double-clic sur une ligne : consultation. */
    consulter: function (vue, ligne) {
        this.ouvrirFiche(true, ligne && ligne.isModel ? ligne : null);
    },

    ouvrirFiche: function (enLecture, choisie) {
        var me = this;
        var grille = me.getGrille();
        var ligne = choisie || (grille ? grille.getSelectionModel().getSelection()[0] : null);
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
            /* Un seul enregistrement pour ce client : chaque consultation en empilait un de plus. */
            if (ecran.storeClients.findExact('lgCLIENTID', o.clientId) < 0) {
                var modeleClient = ecran.storeClients.getProxy().getModel();
                ecran.storeClients.add(new modeleClient({
                    lgCLIENTID: o.clientId,
                    strFIRSTNAME: o.client || '',
                    strLASTNAME: '',
                    strTELEPHONE: o.telephone || ''
                }));
            }
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
        fiche.down('#agePatient').setValue(o.agePatient === null || o.agePatient === undefined ? null : o.agePatient);
        fiche.down('#sexePatient').setValue(o.sexePatient || '');
        fiche.down('#grossesse').setValue(o.grossesse === true);
        fiche.down('#allaitement').setValue(o.allaitement === true);
        fiche.down('#insuffisanceRenale').setValue(o.insuffisanceRenale === true);
        fiche.down('#insuffisanceHepatique').setValue(o.insuffisanceHepatique === true);
        var produits = reponse.produits || [];
        Ext.each(produits, function (p) {
            ecran.storeProduits.add({
                articleId: p.articleId || '',
                libelle: p.libelle || '',
                cip: p.cip || '',
                quantite: p.quantite || 1,
                posologie: p.posologie || '',
                duree: p.duree || '',
                qteServie: p.qteServie === null || p.qteServie === undefined ? null : p.qteServie
            });
        });
        ecran.storeProduits.commitChanges();
        fiche.down('#titreFiche').setValue('Ordonnance ' + (o.numero || '') + ' — ' + (o.client || '')
                + (o.statut === 'annulee' ? ' (ANNULÉE : ' + (o.motifAnnulation || '') + ')' : ''));
        me.lectureSeule(enLecture === true || o.statut === 'annulee');
        me.chargerPieces();
        me.montrer(1);
        me.majBoutonConso();
    },

    /* ------------------------------------------------------------------- produits */

    /** @param editer false pour amorcer la ligne sans ouvrir son editeur (fiche neuve) ; ouvert sinon. */
    ajouterProduit: function (editer) {
        var ecran = this.getEcran();
        var store = ecran.storeProduits;
        store.add({articleId: '', libelle: '', cip: '', quantite: 1, posologie: '', duree: '', qteServie: null});
        var grille = this.getGrilleProduits();
        if (grille && editer !== false) {
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
        /* Produit en rupture (23/09) : ses equivalents s'affichent d'eux-memes, avec leur stock. */
        if (article.get('intNUMBERAVAILABLE') <= 0) {
            this.montrerEquivalents(ligne, true);
        }
        /*
         * Apres le choix du produit, le curseur va dans la POSOLOGIE (22/09) : c'est la saisie suivante. Differe,
         * pour laisser l'editeur du produit se refermer d'abord ; sinon il reprendrait la main.
         */
        var edition = (grille.plugins || [])[0];
        var colonne = grille.down('#colPosologie');
        if (edition && colonne) {
            Ext.defer(function () {
                if (grille.isDestroyed) {
                    return;
                }
                edition.completeEdit();
                edition.startEdit(ligne, colonne);
            }, 60);
        }
    },

    /* ------------------------------------------------------------ equivalents (23/09) */

    /**
     * Equivalents du produit d'une ligne : memes DCI, classes par le serveur. La ligne visee est memorisee, pour
     * que « Remplacer » sache laquelle changer.
     */
    montrerEquivalents: function (ligne, rupture) {
        var me = this;
        var ecran = me.getEcran();
        var grille = ecran.down('#vueFiche #grilleSubstituts');
        if (!ligne || !ligne.get('articleId') || !grille) {
            return;
        }
        me.ligneASubstituer = ligne;
        var message = grille.down('#messageSubstituts');
        var dire = function (html) {
            if (message && !message.isDestroyed) {
                message.update(html);
            }
        };
        ecran.storeSubstituts.removeAll();
        grille.setTitle('Équivalents de ' + Ext.String.htmlEncode(ligne.get('libelle') || ''));
        /* En consultation, on regarde sans remplacer. */
        var remplacer = grille.down('#colRemplacer');
        if (remplacer) {
            remplacer.setVisible(!me.ficheVerrouillee);
        }
        grille.show();
        dire('<div style="color:#777">Recherche des équivalents...</div>');
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ordonnance-client/substituts/' + encodeURIComponent(ligne.get('articleId')),
            success: function (reponse) {
                var r = Ext.decode(reponse.responseText, true) || {};
                if (grille.isDestroyed) {
                    return;
                }
                ecran.storeSubstituts.loadData(r.data || []);
                var parties = [];
                if (rupture === true) {
                    parties.push('<b style="color:#c0392b">Produit en rupture de stock</b> : voici ses équivalents.');
                }
                if (r.source && r.source.dci && r.source.dci.length) {
                    parties.push('DCI : <b>' + Ext.String.htmlEncode(r.source.dci.join(' + ')) + '</b>'
                            + (r.source.dosage ? ' — ' + Ext.String.htmlEncode(r.source.dosage) : '')
                            + ' — ' + Ext.String.htmlEncode(r.source.forme || ''));
                }
                if (r.avertissement) {
                    parties.push('<div class="posos-demo">' + Ext.String.htmlEncode(r.avertissement) + '</div>');
                }
                if (r.message) {
                    parties.push('<span style="color:#c0392b">' + Ext.String.htmlEncode(r.message) + '</span>');
                }
                parties.push('<span style="color:#777">Le logiciel propose, le pharmacien décide.</span>');
                dire(parties.join(' '));
            },
            failure: function () {
                dire('<span style="color:#c0392b">Les équivalents n\'ont pas pu être recherchés.</span>');
            }
        });
    },

    /**
     * Produits proposes par une alerte de l'analyse (23/09), montres dans le panneau des equivalents. « Remplacer »
     * vise la ligne du premier produit que l'alerte met en cause : c'est lui que la conduite a tenir remplace.
     */
    montrerProposes: function (alerte) {
        var me = this;
        var ecran = me.getEcran();
        var grille = ecran.down('#vueFiche #grilleSubstituts');
        var proposes = alerte.get('equivalents') || [];
        if (!grille || !proposes.length) {
            return;
        }
        /*
         * La ligne a remplacer est celle que l'analyse DESIGNE (aRemplacer), jamais « le premier produit cite » :
         * dans « AVK + AINS », c'est l'AINS qui se remplace, pas l'anticoagulant. Sans designation, pas de
         * remplacement propose.
         */
        var concernes = alerte.get('aRemplacer') || [];
        var ligne = null;
        ecran.storeProduits.each(function (r) {
            if (!ligne && Ext.Array.contains(concernes, r.get('libelle'))) {
                ligne = r;
            }
        });
        me.ligneASubstituer = ligne;
        var dci = (alerte.get('proposer') || []).join(' + ');
        ecran.storeSubstituts.loadData(Ext.Array.map(proposes, function (p) {
            return {id: p.id, nom: p.nom, cip: p.cip, prix: p.prix, stock: p.stock, niveau: 'proposition',
                detail: p.detail, raison: 'DCI recommandée par l\'analyse : ' + dci + ' — ' + (p.dosage || 'dosage ?')
                        + ', ' + (p.forme || '') + ' ; adapter la posologie au patient'
                        + (p.detail ? ' ; vente à l\'unité, prix unitaire' : '')};
        }));
        grille.setTitle('Produits proposés par l\'analyse — ' + Ext.String.htmlEncode(dci));
        var remplacer = grille.down('#colRemplacer');
        if (remplacer) {
            remplacer.setVisible(!me.ficheVerrouillee && !!ligne);
        }
        var message = grille.down('#messageSubstituts');
        if (message) {
            message.update('<div><b>' + Ext.String.htmlEncode(alerte.get('gravite') || '') + '</b> — '
                    + Ext.String.htmlEncode(alerte.get('libelle') || '') + '</div>'
                    + (ligne ? '<div>« Remplacer » remplace <b>' + Ext.String.htmlEncode(ligne.get('libelle'))
                            + '</b> sur l\'ordonnance.</div>'
                            : '<div>L\'analyse ne désigne pas le produit à remplacer : à décider avec le prescripteur.</div>')
                    + '<span style="color:#777">Proposition à valider avec le prescripteur : le logiciel propose, '
                    + 'le pharmacien décide.</span>');
        }
        grille.show();
    },

    /** « Remplacer » : la ligne prend le produit choisi ; quantite, posologie et duree restent celles prescrites. */
    remplacerParEquivalent: function (choisi) {
        var me = this;
        var ligne = me.ligneASubstituer;
        if (!ligne || !choisi || me.ficheVerrouillee) {
            return;
        }
        ligne.set('articleId', choisi.get('id'));
        ligne.set('libelle', choisi.get('nom'));
        ligne.set('cip', choisi.get('cip') || '');
        var grille = me.getEcran().down('#vueFiche #grilleSubstituts');
        if (grille) {
            grille.hide();
        }
        /*
         * Une AUTRE substance proposee par l'analyse : l'ancienne posologie ne vaut pas pour elle. On la vide et le
         * curseur y va ; un equivalent de meme DCI, lui, garde la posologie prescrite.
         */
        if (choisi.get('niveau') === 'proposition') {
            ligne.set('posologie', '');
            var produits = me.getGrilleProduits();
            var edition = produits ? (produits.plugins || [])[0] : null;
            var colonne = produits ? produits.down('#colPosologie') : null;
            if (edition && colonne) {
                Ext.defer(function () {
                    if (!produits.isDestroyed) {
                        edition.startEdit(ligne, colonne);
                    }
                }, 60);
            }
        }
    },

    /** « Tout servi » : chaque ligne recoit la quantite prescrite comme quantite servie. */
    toutServir: function () {
        var ecran = this.getEcran();
        ecran.storeProduits.each(function (r) {
            if (r.get('libelle')) {
                r.set('qteServie', r.get('quantite') || 1);
            }
        });
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
                duree: r.get('duree') || '',
                /* null = a renseigner : on n'envoie pas 0 a la place, ce serait declarer « non servi ». */
                qteServie: r.get('qteServie') === null || r.get('qteServie') === undefined
                        || r.get('qteServie') === '' ? null : r.get('qteServie')
            });
        });
        var contexte = me.contexteFiche();
        var requete = {
            id: fiche.down('#ordonnanceId').getValue() || '',
            clientId: fiche.down('#ficheClient').getValue() || '',
            dateOrdonnance: date ? Ext.Date.format(date, 'Y-m-d') : '',
            medecinId: fiche.down('#ficheMedecin').getValue() || '',
            etablissement: fiche.down('#ficheEtablissement').getRawValue() || '',
            observations: fiche.down('#observations').getValue() || '',
            agePatient: contexte.age === undefined ? null : contexte.age,
            sexePatient: contexte.sexe || '',
            grossesse: contexte.grossesse === true,
            allaitement: contexte.allaitement === true,
            insuffisanceRenale: contexte.insuffisanceRenale === true,
            insuffisanceHepatique: contexte.insuffisanceHepatique === true,
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
                /*
                 * On RESTE sur la fiche, avec l'ordonnance desormais enregistree : une piece se rattache a un
                 * document, et repartir vers l'historique obligerait a rouvrir la fiche pour joindre le scan
                 * qu'on a sous la main. Le retour a l'historique reste a un clic.
                 */
                fiche.down('#ordonnanceId').setValue(r.id || '');
                fiche.down('#titreFiche').setValue('Ordonnance ' + (r.numero || '') + ' enregistrée');
                me.chargerPieces();
                me.majBoutonConso();
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
    demanderAnnulation: function (choisie) {
        var me = this;
        var grille = me.getGrille();
        var ligne = choisie && choisie.isModel ? choisie : (grille ? grille.getSelectionModel().getSelection()[0] : null);
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

    /* ----------------------------------------------------------------------- éditions */

    /*
     * Les éditions s'ouvrent EN FLUX dans un onglet du navigateur, dans le clic qui les demande : « je ne veux
     * pas de pop up pour aucune édition ». Rien n'est écrit sur le serveur, rien n'est téléchargé pour être
     * ensuite ouvert à la main.
     */
    imprimerFiche: function (choisie) {
        var grille = this.getGrille();
        var ligne = choisie && choisie.isModel ? choisie : (grille ? grille.getSelectionModel().getSelection()[0] : null);
        if (!ligne) {
            return;
        }
        window.open('../api/v1/ordonnance-client/' + encodeURIComponent(ligne.get('id')) + '/pdf');
    },

    imprimerFicheOuverte: function () {
        var id = this.ordonnanceOuverte();
        if (!id) {
            return;
        }
        window.open('../api/v1/ordonnance-client/' + encodeURIComponent(id) + '/pdf');
    },

    /**
     * L'historique imprimé porte les MÊMES critères que la grille, et les libellés lisibles avec : une édition
     * qui tait ses filtres laisse croire qu'elle porte sur tout l'historique.
     */
    parametresEdition: function () {
        var me = this;
        var ecran = me.getEcran();
        var parametres = me.parametres();
        var libelle = function (selecteur) {
            var c = ecran.down('#barreCriteres ' + selecteur);
            return c && c.getValue() ? (c.getRawValue ? c.getRawValue() : '') : '';
        };
        parametres.clientLibelle = libelle('#client');
        parametres.typeLibelle = libelle('#typeClient');
        parametres.medecinLibelle = libelle('#medecin');
        return parametres;
    },

    imprimerHistorique: function () {
        window.open('../api/v1/ordonnance-client/historique/pdf?'
            + Ext.Object.toQueryString(this.parametresEdition()));
    },

    exporterExcel: function () {
        window.location = '../api/v1/ordonnance-client/historique/excel?'
            + Ext.Object.toQueryString(this.parametres());
    },

    /* ------------------------------------------------------------------- pièces jointes */

    /** Identifiant de l'ordonnance ouverte dans la fiche, ou une chaîne vide pour une saisie en cours. */
    ordonnanceOuverte: function () {
        var ecran = this.getEcran();
        var champ = ecran ? ecran.down('#vueFiche #ordonnanceId') : null;
        return champ ? (champ.getValue() || '') : '';
    },

    /**
     * Recharge les pièces de l'ordonnance ouverte.
     *
     * Tant qu'aucune ordonnance n'est enregistrée, il n'y a rien à charger et rien à joindre : une pièce se
     * rattache à un document, pas à une saisie en cours.
     */
    chargerPieces: function () {
        var me = this;
        var ecran = me.getEcran();
        var id = me.ordonnanceOuverte();
        var grille = ecran.down('#grillePieces');
        var rappel = grille ? grille.down('#rappelPieces') : null;
        var peutEcrire = !!(me.droits && me.droits.modifier);
        me.majImpressionFiche();
        if (!id) {
            ecran.storePieces.removeAll();
            if (rappel) {
                rappel.setValue('Enregistrez l\'ordonnance pour pouvoir y joindre une pièce.');
            }
            me.basculerBoutonsPieces(false, false);
            return;
        }
        if (rappel) {
            rappel.setValue(peutEcrire
                ? 'JPG, PNG, TIFF ou PDF, 10 Mo au plus. « Voir » ouvre la pièce dans un onglet.'
                : 'Consultation seule : votre profil ne permet pas de joindre ni de retirer une pièce.');
        }
        me.majImpressionFiche();
        ecran.storePieces.getProxy().url = '../api/v1/ordonnance-client/pieces/' + encodeURIComponent(id);
        ecran.storePieces.load();
        me.basculerBoutonsPieces(peutEcrire && !me.ficheVerrouillee, false);
    },

    /** Le bouton d'impression de la fiche n'a de sens que sur une ordonnance déjà enregistrée. */
    majImpressionFiche: function () {
        var ecran = this.getEcran();
        var bouton = ecran ? ecran.down('#vueFiche button[itemId=imprimerFicheOuverte]') : null;
        if (bouton) {
            bouton.setDisabled(!this.ordonnanceOuverte());
        }
    },

    basculerBoutonsPieces: function (envoiPossible, pieceChoisie) {
        var ecran = this.getEcran();
        var grille = ecran ? ecran.down('#grillePieces') : null;
        if (!grille) {
            return;
        }
        var actif = function (selecteur, etat) {
            var b = grille.down(selecteur);
            if (b) {
                b.setDisabled(!etat);
            }
        };
        var fichier = grille.down('#fichierPiece');
        if (fichier) {
            fichier.setDisabled(!envoiPossible);
        }
        actif('button[itemId=joindrePiece]', envoiPossible && !!(fichier && fichier.getValue()));
        actif('button[itemId=voirPiece]', pieceChoisie);
        actif('button[itemId=telechargerPiece]', pieceChoisie);
        actif('button[itemId=retirerPiece]', envoiPossible && pieceChoisie);
    },

    surChoixFichier: function () {
        var me = this;
        me.basculerBoutonsPieces(!!(me.droits && me.droits.modifier) && !me.ficheVerrouillee,
            me.pieceSelectionnee() !== null);
    },

    pieceSelectionnee: function () {
        var grille = this.getGrillePieces();
        var lignes = grille ? grille.getSelectionModel().getSelection() : [];
        return lignes.length === 1 ? lignes[0] : null;
    },

    surSelectionPiece: function () {
        var me = this;
        me.basculerBoutonsPieces(!!(me.droits && me.droits.modifier) && !me.ficheVerrouillee,
            me.pieceSelectionnee() !== null);
    },

    /**
     * Envoi du fichier.
     *
     * Le formulaire ExtJS passe par une iframe cachée : c'est le seul montage qui fonctionne pour un fichier
     * dans cette version, et le service répond donc en text/html. Le contrôle de type et de taille est fait
     * côté serveur — celui du navigateur n'est qu'une politesse.
     */
    joindrePiece: function () {
        var me = this;
        var ecran = me.getEcran();
        var id = me.ordonnanceOuverte();
        if (!id) {
            Ext.Msg.alert('Pièces jointes', "Enregistrez d'abord l'ordonnance.");
            return;
        }
        var formulaire = ecran.down('#grillePieces #formPiece');
        var fichier = formulaire.down('#fichierPiece');
        if (!fichier.getValue()) {
            Ext.Msg.alert('Pièces jointes', 'Choisissez un fichier.');
            return;
        }
        formulaire.getForm().submit({
            url: '../api/v1/ordonnance-client/pieces/' + encodeURIComponent(id),
            waitMsg: 'Envoi de la pièce...',
            success: function (form, action) {
                var r = Ext.decode(action.response.responseText, true) || {};
                if (r.success !== true) {
                    Ext.Msg.alert('Pièces jointes', r.message || "La pièce n'a pas pu être enregistrée.");
                    return;
                }
                fichier.reset();
                me.chargerPieces();
            },
            failure: function (form, action) {
                /*
                 * ExtJS considère en échec toute réponse dont le JSON ne porte pas success:true — y compris nos
                 * refus légitimes (type non accepté, fichier trop gros). On lit donc le message du serveur au
                 * lieu d'afficher une erreur générique qui n'apprendrait rien à l'opérateur.
                 */
                var texte = action && action.response ? action.response.responseText : '';
                var r = Ext.decode(texte, true) || {};
                Ext.Msg.alert('Pièces jointes', r.message || "La pièce n'a pas pu être enregistrée.");
            }
        });
    },

    /** « Voir » ouvre la pièce EN FLUX dans un onglet du navigateur : ni fenêtre surgissante, ni téléchargement. */
    voirPiece: function () {
        var piece = this.pieceSelectionnee();
        if (!piece) {
            return;
        }
        window.open('../api/v1/ordonnance-client/piece/' + encodeURIComponent(piece.get('id')), '_blank');
    },

    telechargerPiece: function () {
        var piece = this.pieceSelectionnee();
        if (!piece) {
            return;
        }
        window.location = '../api/v1/ordonnance-client/piece/' + encodeURIComponent(piece.get('id'))
            + '/telecharger';
    },

    /**
     * Retrait d'une pièce : la seule suppression de ce menu, et elle est nécessaire — une pièce jointe au
     * mauvais patient est un problème de confidentialité, pas une coquille. L'ordonnance ne se supprime pas.
     */
    retirerPiece: function () {
        var me = this;
        var piece = me.pieceSelectionnee();
        if (!piece) {
            return;
        }
        Ext.Msg.confirm('Retirer la pièce', 'Retirer « ' + Ext.String.htmlEncode(piece.get('nom'))
            + ' » de cette ordonnance ?', function (bouton) {
            if (bouton !== 'yes') {
                return;
            }
            Ext.Ajax.request({
                url: '../api/v1/ordonnance-client/piece/' + encodeURIComponent(piece.get('id')) + '/retirer',
                method: 'POST',
                success: function (reponse) {
                    var r = Ext.decode(reponse.responseText, true) || {};
                    if (r.success !== true) {
                        Ext.Msg.alert('Pièces jointes', r.message || "La pièce n'a pas pu être retirée.");
                        return;
                    }
                    me.chargerPieces();
                },
                failure: function () {
                    Ext.Msg.alert('Pièces jointes', "La pièce n'a pas pu être retirée.");
                }
            });
        });
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
    ,

    /* ------------------------------------------------------------- contexte et Posos */

    /** Contexte clinique saisi sur la fiche, sous la forme qu'attend le service Posos. */
    contexteFiche: function () {
        var fiche = this.getEcran().down('#vueFiche');
        var c = {};
        var age = fiche.down('#agePatient').getValue();
        if (age !== null && age !== '' && age >= 0) {
            c.age = age;
        }
        var sexe = fiche.down('#sexePatient').getValue();
        if (sexe) {
            c.sexe = sexe;
        }
        Ext.each(['grossesse', 'allaitement', 'insuffisanceRenale', 'insuffisanceHepatique'], function (n) {
            if (fiche.down('#' + n).getValue() === true) {
                c[n] = true;
            }
        });
        return c;
    },

    /** Analyse Posos des produits de la fiche, avec son contexte clinique : le service de l'Analyse posologie. */
    analyserFiche: function () {
        var me = this;
        var ecran = me.getEcran();
        var produits = [];
        ecran.storeProduits.each(function (r) {
            if (Ext.String.trim(r.get('libelle') || '')) {
                produits.push({
                    nom: r.get('libelle'),
                    cip: r.get('cip') || '',
                    quantite: r.get('quantite') || 1,
                    posologie: r.get('posologie') || ''
                });
            }
        });
        me.lancerPosos(ecran.down('#vueFiche #alertesFiche'), ecran.storeAlertesFiche, produits, me.contexteFiche());
    },

    /**
     * Appel de la passerelle Posos du serveur. Le navigateur n'y voit ni adresse ni identifiant : il envoie des
     * produits et un contexte sans rien d'identifiant, le serveur fait le reste.
     */
    lancerPosos: function (grille, store, produits, contexte) {
        var me = this;
        if (!grille) {
            return;
        }
        grille.show();
        var message = grille.down('#messagePosos');
        var dire = function (texte, alerte) {
            if (message && !message.isDestroyed) {
                message.update('<div style="color:' + (alerte ? '#c0392b' : '#555') + '">' + texte + '</div>');
            }
        };
        store.removeAll();
        if (!produits.length) {
            dire('Aucun produit à analyser.', true);
            return;
        }
        dire('Analyse en cours...', false);
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/posos/analyse',
            jsonData: {produits: produits, contexte: contexte || {}},
            success: function (reponse) {
                var r = Ext.decode(reponse.responseText, true) || {};
                if (grille.isDestroyed) {
                    return;
                }
                store.loadData(r.alertes || []);
                if (r.success === false || r.disponible === false) {
                    dire(Ext.String.htmlEncode(r.message || 'Analyse Posos indisponible.'), true);
                    return;
                }
                /* Mode demonstration (provisoire) : l'avertissement passe AVANT les alertes, en rouge. */
                var demo = r.demonstration === true ? '<div class="posos-demo">'
                        + Ext.String.htmlEncode(r.avertissement || 'DÉMONSTRATION') + '</div>' : '';
                var parties = [(r.total || 0) + ' alerte(s)'];
                if (r.nombreMajeures > 0) {
                    parties.push('<b style="color:#c0392b">dont ' + r.nombreMajeures + ' à lire absolument</b>');
                }
                if (r.produitsNonReconnus && r.produitsNonReconnus.length) {
                    parties.push('<span style="color:#c0392b">' + (r.demonstration === true ? 'non couvert(s) par la démonstration : ' : 'non analysé(s) par Posos : ')
                            + Ext.String.htmlEncode(r.produitsNonReconnus.join(', ')) + '</span>');
                }
                if ((r.total || 0) === 0 && r.message) {
                    parties = [Ext.String.htmlEncode(r.message)];
                }
                if (r.demonstration === true && r.produitsNonReconnus && r.produitsNonReconnus.length) {
                    parties.push('<b style="color:#c0392b">ne pas conclure à l\'absence d\'interaction pour les '
                            + 'produits non couverts</b>');
                }
                dire(demo + parties.join(' — '), false);
            },
            failure: function () {
                dire('L\'analyse Posos n\'a pas abouti.', true);
            }
        });
    },

    /* ---------------------------------------------------------- suivi de consommation */

    /** Le bouton du suivi n'a de sens qu'avec un client choisi sur la fiche. */
    majBoutonConso: function () {
        var ecran = this.getEcran();
        var bouton = ecran ? ecran.down('#vueFiche button[itemId=consoFiche]') : null;
        var client = ecran ? ecran.down('#vueFiche #ficheClient') : null;
        if (bouton && client) {
            bouton.setDisabled(!client.getValue());
        }
    },

    consoDepuisFiche: function () {
        var me = this;
        var client = me.getEcran().down('#vueFiche #ficheClient');
        if (!client || !client.getValue()) {
            Ext.Msg.alert('Suivi de consommation', 'Choisissez d\'abord le client.');
            return;
        }
        /* Depuis la fiche, le contexte clinique de l'ordonnance accompagne l'analyse Posos du suivi. */
        me.ouvrirConso(client.getValue(), client.getRawValue(), me.contexteFiche());
    },

    /**
     * Ouvre le suivi de consommation d'un client (troisieme vue). On memorise d'ou l'on vient pour y revenir :
     * l'historique ou la fiche en cours, sans la perdre.
     */
    ouvrirConso: function (clientId, nom, contexte) {
        var me = this;
        var ecran = me.getEcran();
        if (!ecran || !clientId) {
            return;
        }
        me.clientConso = clientId;
        me.contexteConso = contexte || null;
        me.carteAvantConso = ecran.getLayout().getActiveItem();
        var vue = ecran.down('#vueConso');
        vue.down('#titreConso').setText('Suivi de consommation - ' + Ext.String.htmlEncode(nom || ''));
        ecran.storeAlertesConso.removeAll();
        vue.down('#alertesConso').hide();
        ecran.getLayout().setActiveItem(vue);
        me.chargerConso();
    },

    retourConso: function () {
        var ecran = this.getEcran();
        ecran.getLayout().setActiveItem(this.carteAvantConso || 0);
    },

    chargerConso: function () {
        var me = this;
        var ecran = me.getEcran();
        var vue = ecran.down('#vueConso');
        var jour = function (s) {
            var v = vue.down(s).getValue();
            return v ? Ext.Date.format(v, 'Y-m-d') : '';
        };
        var store = ecran.storeConso;
        store.getProxy().url = '../api/v1/ordonnance-client/client/' + encodeURIComponent(me.clientConso || '0')
                + '/consommation';
        store.getProxy().extraParams = {dtStart: jour('#consoDebut'), dtEnd: jour('#consoFin')};
        store.load({
            callback: function (lignes) {
                me.resumerConso(lignes || []);
            }
        });
    },

    /** Resume du client : ce que l'onglet de la gestion des clients donne, en une ligne. */
    resumerConso: function (lignes) {
        var ecran = this.getEcran();
        var zone = ecran ? ecran.down('#vueConso #resumeConso') : null;
        if (!zone || zone.isDestroyed) {
            return;
        }
        if (!lignes.length) {
            zone.update('<div style="color:#777">Aucun achat de ce client sur la période.</div>');
            return;
        }
        var montant = 0;
        var dernier = '';
        var ruptures = 0;
        Ext.each(lignes, function (l) {
            montant += l.get('montant') || 0;
            if ((l.get('dernierAchat') || '') > dernier) {
                dernier = l.get('dernierAchat');
            }
            if (l.get('stock') === 0) {
                ruptures++;
            }
        });
        zone.update('<div class="ordo-resume"><b>' + lignes.length + '</b> produit(s) achetés — montant <b>'
                + Ext.util.Format.number(montant, '0,000') + ' F</b> — dernier achat le <b>'
                + (dernier ? Ext.Date.format(Ext.Date.parse(dernier, 'Y-m-d'), 'd/m/Y') : '—') + '</b>'
                + (ruptures ? ' — <span style="color:#c0392b"><b>' + ruptures + '</b> produit(s) sans stock</span>'
                        : ' — <span style="color:#1E5FA8">tous en stock</span>')
                + '. Cochez des produits pour les analyser avec Posos (sinon, tous le sont).</div>');
    },

    /** Posos sur les produits du suivi : cochés, ou tous. Avec le contexte de l'ordonnance si on en vient. */
    analyserConso: function () {
        var me = this;
        var ecran = me.getEcran();
        var vue = ecran.down('#vueConso');
        var grille = vue.down('#grilleConso');
        var lignes = grille.getSelectionModel().getSelection();
        if (!lignes.length) {
            lignes = ecran.storeConso.getRange();
        }
        var produits = [];
        Ext.each(lignes, function (l) {
            produits.push({nom: l.get('name'), cip: l.get('cip') || '', quantite: 1});
        });
        me.lancerPosos(vue.down('#alertesConso'), ecran.storeAlertesConso, produits, me.contexteConso || {});
    },

    /* ------------------------------------------------------------ analyse des ordonnances */

    surOngletAnalyse: function () {
        if (!this.analyseCalculee) {
            this.calculerAnalyse();
        }
    },

    effacerAnalyse: function () {
        var vue = this.getEcran().down('#vueAnalyse');
        vue.down('#anaType').clearValue();
        vue.down('#anaMedecin').clearValue();
        vue.down('#anaDebut').setValue(Ext.Date.add(new Date(), Ext.Date.MONTH, -12));
        vue.down('#anaFin').setValue(new Date());
        this.calculerAnalyse();
    },

    /** Criteres de l'onglet Analyse, communs au calcul et a l'edition. */
    parametresAnalyse: function () {
        var vue = this.getEcran().down('#vueAnalyse');
        var jour = function (s) {
            var v = vue.down(s).getValue();
            return v ? Ext.Date.format(v, 'Y-m-d') : '';
        };
        var type = vue.down('#anaType');
        var medecin = vue.down('#anaMedecin');
        return {
            dtStart: jour('#anaDebut'),
            dtEnd: jour('#anaFin'),
            typeClientId: type.getValue() || '',
            medecinId: medecin.getValue() || '',
            typeLibelle: type.getValue() ? type.getRawValue() : '',
            medecinLibelle: medecin.getValue() ? medecin.getRawValue() : ''
        };
    },

    /** L'analyse en PDF, sur les criteres affiches, dans un onglet du navigateur. */
    imprimerAnalyse: function () {
        window.open('../api/v1/ordonnance-client/analyse/pdf?' + Ext.Object.toQueryString(this.parametresAnalyse()));
    },

    calculerAnalyse: function () {
        var me = this;
        var ecran = me.getEcran();
        var vue = ecran.down('#vueAnalyse');
        var jour = function (s) {
            var v = vue.down(s).getValue();
            return v ? Ext.Date.format(v, 'Y-m-d') : '';
        };
        me.analyseCalculee = true;
        var tuiles = vue.down('#tuilesAnalyse');
        tuiles.update('<div style="color:#777">Calcul en cours...</div>');
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ordonnance-client/analyse',
            params: me.parametresAnalyse(),
            success: function (reponse) {
                var r = Ext.decode(reponse.responseText, true) || {};
                if (tuiles.isDestroyed) {
                    return;
                }
                if (r.success !== true) {
                    tuiles.update('<div style="color:#c0392b">' + Ext.String.htmlEncode(r.message
                            || 'L\'analyse n\'a pas pu être calculée.') + '</div>');
                    return;
                }
                ecran.storeParPrescripteur.loadData(r.parPrescripteur || []);
                ecran.storeParEtablissement.loadData(r.parEtablissement || []);
                ecran.storeParType.loadData(r.parType || []);
                ecran.storeProduitsAnalyse.loadData(r.produits || []);
                tuiles.update(me.tuiles(r.synthese || {}));
            },
            failure: function () {
                tuiles.update('<div style="color:#c0392b">L\'analyse n\'a pas pu être calculée.</div>');
            }
        });
    },

    /** Les tuiles de synthese. Un taux sans donnee s'affiche « — », jamais 0 %. */
    tuiles: function (s) {
        var ecran = this.getEcran();
        var pc = function (v) {
            return v === null || v === undefined ? '—' : Ext.util.Format.number(v, '0.0') + ' %';
        };
        var tuile = function (titre, valeur, detail, cls) {
            return '<div class="ordo-tuile ' + (cls || '') + '"><div class="ordo-tuile-titre">' + titre
                    + '</div><div class="ordo-tuile-valeur">' + valeur + '</div><div class="ordo-tuile-detail">'
                    + (detail || '') + '</div></div>';
        };
        return '<div class="ordo-tuiles">'
                + tuile('Ordonnances', s.ordonnances || 0, (s.clients || 0) + ' client(s) — '
                        + (s.produitsParOrdonnance || 0) + ' produit(s) par ordonnance')
                + tuile('Annulées', pc(s.tauxAnnulation), (s.annulees || 0) + ' ordonnance(s)', 'ordo-tuile-rouge')
                + tuile('Satisfaction', pc(s.satisfaction), (s.lignesServies || 0) + ' ligne(s) servie(s) en entier sur '
                        + (s.lignesRenseignees || 0) + ' renseignée(s)', 'ordo-tuile-verte')
                + tuile('Ordonnances servies', pc(s.tauxService), ecran.badgeService('servie') + ' ' + (s.servies || 0)
                        + ' ' + ecran.badgeService('partielle') + ' ' + (s.partielles || 0) + ' '
                        + ecran.badgeService('non_servie') + ' ' + (s.nonServies || 0))
                + tuile('À renseigner', s.aRenseigner || 0, (s.lignesARenseigner || 0)
                        + ' ligne(s) sans quantité servie — exclues des taux', 'ordo-tuile-grise')
                + '</div>';
    }
});
