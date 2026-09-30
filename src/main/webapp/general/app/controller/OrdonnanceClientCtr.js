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
            'ordonnanceclient #barreCriteres textfield[itemId=recherche]': {
                specialkey: me.surTouche,
                /* Recherche automatique pendant la frappe (30/09), en « contient » : le serveur cherche %texte%. */
                change: {fn: me.surFrappeRecherche, buffer: 400}
            },
            'ordonnanceclient #barreCriteres combobox[itemId=typeClient]': {select: me.rechercher},
            'ordonnanceclient #barreCriteres combobox[itemId=client]': {select: me.rechercher},
            'ordonnanceclient #barreCriteres combobox[itemId=medecin]': {select: me.rechercher},
            'ordonnanceclient #barreCriteres checkbox[itemId=annulees]': {change: me.rechercher},
            'ordonnanceclient #barreCriteres checkbox[itemId=reste]': {change: me.rechercher},
            'ordonnanceclient #barreCriteres checkbox[itemId=renouveler]': {change: me.rechercher},
            'ordonnanceclient #vueFiche button[itemId=renouvelerFiche]': {click: me.renouveler},
            'ordonnanceclient #vueFiche button[itemId=rappelRenouvellement]': {click: me.rappelRenouvellement},
            'ordonnanceclient #vueFiche numberfield[itemId=renouvellements]': {change: me.majPeriodicite},
            'ordonnanceclient #grilleOrdonnances': {
                /* Les icones d'action de chaque ligne (22/09) remontent toutes par cet evenement. */
                actionordonnance: me.surAction,
                itemdblclick: me.consulter
            },
            'ordonnanceclient #vueFiche button[itemId=retourHistorique]': {click: me.demanderRetour},
            'ordonnanceclient #vueFiche button[itemId=enregistrer]': {click: me.enregistrer},
            'ordonnanceclient #vueFiche button[itemId=nouveauClient]': {click: me.nouveauClient},
            'ordonnanceclient #vueFiche button[itemId=nouveauMedecin]': {click: me.nouveauMedecin},
            'ordonnanceclient #vueFiche button[itemId=nouvelEtablissement]': {click: me.nouvelEtablissement},
            /* Fenetres de creation rapide (30/09) : elles ne sont pas dans l'ecran, d'ou leur propre identifiant. */
            'window#fenNouveauClient button[itemId=creerClient]': {click: me.creerClient},
            'window#fenNouveauClient button[itemId=annulerClient]': {click: me.annulerNouveauClient},
            'window#fenNouveauClient field': {specialkey: me.entreeCreerClient},
            'window#fenNouveauMedecin button[itemId=creerMedecin]': {click: me.creerMedecin},
            'window#fenNouveauMedecin button[itemId=annulerMedecin]': {click: me.fermerNouveauMedecin},
            'window#fenNouveauMedecin field': {specialkey: me.entreeCreerMedecin},
            'window#fenNouvelEtablissement button[itemId=ajouterEtablissement]': {click: me.ajouterEtablissement},
            'window#fenNouvelEtablissement button[itemId=annulerEtablissement]': {click: me.fermerNouvelEtablissement},
            'window#fenNouvelEtablissement field': {specialkey: me.entreeAjouterEtablissement},
            'ordonnanceclient #grilleOrdonnances button[itemId=imprimerHistorique]': {click: me.imprimerHistorique},
            'ordonnanceclient #grilleOrdonnances button[itemId=exporterExcel]': {click: me.exporterExcel},
            'ordonnanceclient #vueFiche button[itemId=imprimerFicheOuverte]': {click: me.imprimerFicheOuverte},
            'ordonnanceclient #vueFiche button[itemId=creerPrevente]': {click: me.creerPrevente},
            'ordonnanceclient #grillePieces button[itemId=joindrePiece]': {click: me.joindrePiece},
            'ordonnanceclient #grillePieces filefield[itemId=fichierPiece]': {change: me.surChoixFichier},
            /* Voir, telecharger, retirer : sur CHAQUE ligne de piece (30/09). */
            'ordonnanceclient #grillePieces': {actionpiece: me.surActionPiece},
            'ordonnanceclient #grilleProduits button[itemId=ajouterProduit]': {click: me.ajouterProduit},
            'ordonnanceclient #grilleProduits combobox[itemId=editeurProduit]': {select: me.surChoixArticle},
            'ordonnanceclient #grilleProduits button[itemId=toutServir]': {click: me.toutServir},
            'ordonnanceclient #grilleProduits': {equivalents: me.montrerEquivalents, retirerligne: me.retirerLigne},
            'ordonnanceclient #grilleProduits combobox[itemId=rechercheProduit]': {
                select: me.surRechercheProduit,
                specialkey: me.surToucheRechercheProduit
            },
            'ordonnanceclient #grilleSubstituts': {remplacer: me.remplacerParEquivalent},
            'ordonnanceclient #alertesFiche': {proposes: me.montrerProposes},
            'ordonnanceclient #vueFiche button[itemId=analyserPosos]': {click: me.analyserFiche},
            'ordonnanceclient #vueFiche button[itemId=consoFiche]': {click: me.consoDepuisFiche},
            'ordonnanceclient #vueFiche combobox[itemId=ficheClient]': {change: me.majBoutonConso, select: me.surChoixClient},
            /* Apres chacun de ces choix, le curseur va dans la recherche produit (30/09). */
            'ordonnanceclient #vueFiche combobox[itemId=sexePatient]': {select: me.allerRechercheProduit},
            'ordonnanceclient #vueFiche combobox[itemId=ficheMedecin]': {select: me.allerRechercheProduit},
            'ordonnanceclient #vueFiche combobox[itemId=ficheEtablissement]': {select: me.allerRechercheProduit},
            'ordonnanceclient #vueConso button[itemId=retourConso]': {click: me.retourConso},
            'ordonnanceclient #vueConso button[itemId=actualiserConso]': {click: me.chargerConso},
            'ordonnanceclient #vueConso button[itemId=pososConso]': {click: me.analyserConso},
            'ordonnanceclient #vueAnalyse': {activate: me.surOngletAnalyse},
            /* Parametrage des terrains cliniques (30/09) : modification directe, enregistree aussitot. */
            'ordonnanceclient #vueTerrains': {activate: me.chargerParametrageTerrains, edit: me.surEditionTerrain},
            'ordonnanceclient #vueTerrains checkcolumn[itemId=colTerrainActif]': {checkchange: me.surActifTerrain},
            'ordonnanceclient #vueTerrains button[itemId=ajouterTerrain]': {click: me.ajouterTerrain},
            'ordonnanceclient #vueAnalyse button[itemId=calculerAnalyse]': {click: me.calculerAnalyse},
            'ordonnanceclient #vueAnalyse button[itemId=effacerAnalyse]': {click: me.effacerAnalyse},
            'ordonnanceclient #vueAnalyse button[itemId=imprimerAnalyse]': {click: me.imprimerAnalyse}
        });
    },

    /* ------------------------------------------------------------------ ouverture */

    surAffichage: function (ecran) {
        var me = this;
        me.bullesLongues(ecran);
        var reste = ecran.down('#vueFiche #resteClient');
        if (reste && reste.getEl()) {
            reste.getEl().on('click', me.voirResteClient, me, {delegate: 'a.ordo-lien-reste'});
        }
        ecran.storeTypesClient.load();
        me.chargerTerrains();
        ecran.storeMedecins.load();
        me.chargerDroits();
        me.rechercher();
    },

    /**
     * Info-bulles LONGUES sur cet ecran (30/09) : elles restent tant que la souris est sur la cellule, au lieu de
     * disparaitre au bout de 5 secondes. Le reglage d'origine est remis des que la souris quitte l'ecran : les
     * autres menus gardent le leur.
     */
    bullesLongues: function (ecran) {
        var el = ecran.getEl();
        if (!el || !Ext.tip || !Ext.tip.QuickTipManager) {
            return;
        }
        var origine = null;
        el.on('mouseenter', function () {
            var bulle = Ext.tip.QuickTipManager.getQuickTip();
            if (bulle && origine === null) {
                origine = bulle.dismissDelay;
                bulle.dismissDelay = 0;
                /* Une bulle ne doit jamais prendre le clic destine a la cellule qu'elle recouvre (bord d'ecran). */
                bulle.addCls('ordo-bulle-traversante');
            }
        });
        el.on('mouseleave', function () {
            var bulle = Ext.tip.QuickTipManager.getQuickTip();
            if (bulle && origine !== null) {
                bulle.dismissDelay = origine;
                bulle.removeCls('ordo-bulle-traversante');
                origine = null;
            }
        });
        /*
         * Une bulle sans delai ne se ferme qu'en quittant son element. Si un clic fait DISPARAITRE cet element (icone
         * « Consulter », changement de vue), elle resterait bloquee par-dessus la fiche : tout clic la ferme.
         */
        el.on('mousedown', this.fermerBulle, this);
    },

    fermerBulle: function () {
        var bulle = Ext.tip && Ext.tip.QuickTipManager ? Ext.tip.QuickTipManager.getQuickTip() : null;
        if (bulle && bulle.isVisible()) {
            bulle.hide();
        }
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
        basculer('#vueFiche button[itemId=creerPrevente]');
        basculer('#vueFiche button[itemId=renouvelerFiche]');
        var parametrage = ecran.down('#vueTerrains');
        if (parametrage && parametrage.tab) {
            parametrage.tab.setVisible(peutEcrire);
        }
        basculer('#vueFiche button[itemId=rappelRenouvellement]');
        basculer('#vueFiche button[itemId=nouveauClient]');
        basculer('#grillePieces button[itemId=joindrePiece]');
        basculer('#grillePieces filefield[itemId=fichierPiece]');
        this.rafraichirPieces();
    },

    /* ----------------------------------------------------------------- historique */

    surTouche: function (champ, e) {
        if (e.getKey() === e.ENTER) {
            this.rechercher();
        }
    },

    /** Pendant la frappe : a partir de 2 caracteres, ou quand le champ est vide (on retrouve tout). */
    surFrappeRecherche: function (champ, valeur) {
        var texte = Ext.String.trim(valeur || '');
        if (champ.isDestroyed || (texte.length > 0 && texte.length < 2)) {
            return;
        }
        if (texte === this.derniereRecherche) {
            return;
        }
        this.derniereRecherche = texte;
        this.rechercher();
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
            annulees: lire('#barreCriteres #annulees') === true,
            reste: lire('#barreCriteres #reste') === true,
            renouveler: lire('#barreCriteres #renouveler') === true
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
        me.derniereRecherche = store.getProxy().extraParams.query;
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
        Ext.each(['#annulees', '#reste', '#renouveler'], function (s) {
            var c = ecran.down('#barreCriteres ' + s);
            if (c) {
                c.suspendEvents(false);
                c.setValue(false);
                c.resumeEvents();
            }
        });
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
        this.fermerBulle();
        if (ecran) {
            ecran.getLayout().setActiveItem(index);
        }
    },

    retourHistorique: function () {
        this.montrer(0);
        var filtre = this.filtreApresRetour;
        this.filtreApresRetour = null;
        if (filtre) {
            this.poserFiltreReste(filtre);
        }
        this.rechercher();
    },

    /**
     * « Retour a l'historique » (30/09) : si une saisie est en cours, on demande avant de la perdre. En
     * consultation, ou sans rien de change depuis l'ouverture ou le dernier enregistrement, on revient tout de suite.
     */
    demanderRetour: function () {
        var me = this;
        if (me.ficheVerrouillee || !me.saisieEnCours()) {
            me.retourHistorique();
            return;
        }
        Ext.Msg.confirm('Retour à l\'historique', 'Une saisie est en cours. Abandonner la saisie et revenir à '
                + 'l\'historique ?', function (bouton) {
                    if (bouton === 'yes') {
                        me.retourHistorique();
                    }
                });
    },

    /** Photographie de ce que la fiche contient, pour savoir si une saisie est en cours. */
    etatFiche: function () {
        var requete = this.requeteFiche();
        delete requete.id;
        return Ext.encode(requete);
    },

    memoriserEtat: function () {
        this.etatInitial = this.etatFiche();
    },

    saisieEnCours: function () {
        return this.etatInitial !== undefined && this.etatFiche() !== this.etatInitial;
    },

    /** Titre de la section « L'ordonnance » : le N° y figure (30/09). */
    titreFiche: function (texte) {
        var entete = this.getEcran().down('#vueFiche #enteteOrdonnance');
        if (entete) {
            entete.setTitle(texte);
        }
    },

    nouvelleOrdonnance: function () {
        var me = this;
        var ecran = me.getEcran();
        me.viderFiche();
        ecran.down('#vueFiche #ficheDate').setValue(new Date());
        me.titreFiche('Nouvelle ordonnance');
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
        me.memoriserEtat();
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
            '#insuffisanceHepatique', '#poidsPatient'], function (s) {
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
        /*
         * « getId, a is undefined » au clic sur Consulter (30/09) : la grille des produits garde la position de la
         * derniere cellule choisie, et ExtJS 4.2 relit sa ligne quand la grille se redessine - apres le vidage, une
         * ligne qui n'existe plus. On oublie cette position AVANT de vider.
         */
        this.oublierCellule(ecran.down('#grilleProduits'));
        ecran.storeProduits.removeAll();
        this.ficheAnnulee = false;
        this.afficherPreventes([]);
        this.afficherRenouvellement(null);
        this.cocherTerrains([]);
        var recherche = fiche.down('#rechercheProduit');
        if (recherche) {
            recherche.clearValue();
        }
        this.afficherTypeClient('');
        this.afficherResteClient(null);
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
        this.annulerNouveauClient();
        this.fermerNouveauMedecin();
        this.fermerNouvelEtablissement();
    },

    /** Consultation : la fiche s'ouvre en lecture, sans qu'on puisse la modifier par inadvertance. */
    lectureSeule: function (verrou) {
        var ecran = this.getEcran();
        /* Memorise : les boutons des pieces suivent le meme verrou que le reste de la fiche. */
        this.ficheVerrouillee = verrou === true;
        /* Lu aussi par l'icone « Retirer » de chaque piece. */
        ecran.ficheVerrouillee = this.ficheVerrouillee;
        var fiche = ecran.down('#vueFiche');
        Ext.each(['#ficheClient', '#ficheDate', '#ficheMedecin', '#ficheEtablissement', '#observations',
            '#agePatient', '#sexePatient', '#grossesse', '#allaitement', '#insuffisanceRenale',
            '#insuffisanceHepatique', '#renouvellements', '#periodicite', '#poidsPatient'],
                function (s) {
                    var c = fiche.down(s);
                    if (c) {
                        c.setReadOnly(verrou);
                    }
                });
        Ext.each(this.casesTerrains(), function (c) {
            c.setReadOnly(verrou);
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
            var recherche = grille.down('combobox[itemId=rechercheProduit]');
            if (recherche) {
                recherche.setVisible(!verrou);
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
        /* En consultation, on ne cree ni client, ni prescripteur, ni etablissement. */
        var peutCreer = !verrou && !!(this.droits && this.droits.modifier);
        Ext.each(['nouveauClient', 'nouveauMedecin', 'nouvelEtablissement'], function (b) {
            var bouton = ecran.down('#vueFiche button[itemId=' + b + ']');
            if (bouton) {
                bouton.setVisible(peutCreer);
            }
        });
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
        fiche.down('#poidsPatient').setValue(o.poidsPatient === null || o.poidsPatient === undefined ? null
                : o.poidsPatient);
        me.cocherTerrains(o.terrains || []);
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
        me.titreFiche('L\'ordonnance N° ' + Ext.String.htmlEncode(o.numero || '')
                + (o.statut === 'annulee' ? ' <span class="ordo-titre-annulee">ANNULÉE : '
                        + Ext.String.htmlEncode(o.motifAnnulation || '') + '</span>' : ''));
        me.afficherTypeClient(o.typeClient || '');
        me.chargerResteClient(o.clientId, o.client);
        me.ficheAnnulee = o.statut === 'annulee';
        me.afficherRenouvellement(o);
        me.lectureSeule(enLecture === true || o.statut === 'annulee');
        me.chargerPieces();
        me.montrer(1);
        me.majBoutonConso();
        me.memoriserEtat();
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
     * Oublie la cellule choisie dans la grille des produits, et ferme une saisie de cellule en cours. A faire AVANT
     * de retirer des lignes : ExtJS 4.2 relit sinon, au dessin suivant, une ligne qui n'existe plus (30/09).
     * CellModel.deselect() ne remet pas sa position a zero : on le fait a la main.
     */
    oublierCellule: function (grille) {
        if (!grille) {
            return;
        }
        try {
            var edition = (grille.plugins || [])[0];
            if (edition && edition.editing && edition.cancelEdit) {
                edition.cancelEdit();
            }
            var modele = grille.getSelectionModel();
            if (modele) {
                modele.selection = null;
                modele.nextSelection = null;
                modele.lastSelection = null;
            }
        } catch (e) {
            /* Oublier une position ne doit jamais empecher d'ouvrir ou de vider la fiche. */
        }
    },

    /** Icone « Retirer cette ligne », en premiere colonne (30/09). */
    retirerLigne: function (ligne) {
        var ecran = this.getEcran();
        if (!ligne || this.ficheVerrouillee) {
            return;
        }
        this.oublierCellule(ecran.down('#grilleProduits'));
        ecran.storeProduits.remove(ligne);
    },

    /** Le curseur dans la recherche produit (30/09) : apres le client, le sexe, le prescripteur, l'etablissement. */
    allerRechercheProduit: function () {
        var ecran = this.getEcran();
        var champ = ecran ? ecran.down('#vueFiche #rechercheProduit') : null;
        if (champ && champ.isVisible() && !this.ficheVerrouillee) {
            champ.focus(false, 120);
        }
    },

    surChoixClient: function (combo, lignes) {
        var client = lignes && lignes.length ? lignes[0] : null;
        this.afficherTypeClient(client ? (client.get('libelleTypeClient') || client.get('typeClient')) : '');
        this.chargerResteClient(client ? client.get('lgCLIENTID') : null, client ? client.get('nomComplet') : '');
        this.allerRechercheProduit();
    },

    /**
     * Reste à délivrer du client (30/09) : ses AUTRES ordonnances encore dues sont signalées sous son nom, dès qu'il
     * est choisi. On les sert à cette visite, avec un lien pour les voir dans l'historique.
     */
    chargerResteClient: function (clientId, nom) {
        var me = this;
        me.afficherResteClient(null);
        if (!clientId) {
            return;
        }
        var sauf = me.ordonnanceOuverte();
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ordonnance-client/client/' + encodeURIComponent(clientId) + '/reste'
                    + (sauf ? '?sauf=' + encodeURIComponent(sauf) : ''),
            success: function (reponse) {
                var r = Ext.decode(reponse.responseText, true) || {};
                var combo = me.getEcran() ? me.getEcran().down('#vueFiche #ficheClient') : null;
                /* Un autre client a pu être choisi entre-temps. */
                if (r.success === true && combo && combo.getValue() === clientId) {
                    me.afficherResteClient(r, clientId, nom);
                }
            }
        });
    },

    afficherResteClient: function (r, clientId, nom) {
        var ecran = this.getEcran();
        var zone = ecran ? ecran.down('#vueFiche #resteClient') : null;
        if (!zone) {
            return;
        }
        this.resteClient = r && r.total ? {clientId: clientId, nom: nom || ''} : null;
        if (!r || !r.total) {
            zone.update('');
            zone.hide();
            return;
        }
        var numeros = Ext.Array.map(r.data || [], function (o) {
            return Ext.String.htmlEncode(o.numero) + ' (' + o.qteReste + ')';
        }).join(', ');
        zone.update('<div class="ordo-reste-client" data-qtip="' + Ext.String.htmlEncode(numeros) + '">'
                + '<b>' + r.total + ' autre(s) ordonnance(s) avec un reste à délivrer</b> — ' + r.qteReste
                + ' à servir. <a href="#" class="ordo-lien-reste">Voir</a></div>');
        zone.show();
    },

    /** « Voir » : l'historique, filtré sur ce client et son reste à délivrer (après confirmation si saisie en cours). */
    voirResteClient: function (e) {
        if (e && e.preventDefault) {
            e.preventDefault();
        }
        if (!this.resteClient) {
            return;
        }
        this.filtreApresRetour = this.resteClient;
        this.demanderRetour();
    },

    poserFiltreReste: function (filtre) {
        var ecran = this.getEcran();
        var combo = ecran.down('#barreCriteres #client');
        var reste = ecran.down('#barreCriteres #reste');
        if (ecran.storeClients.findExact('lgCLIENTID', filtre.clientId) < 0) {
            var modele = ecran.storeClients.getProxy().getModel();
            ecran.storeClients.add(new modele({lgCLIENTID: filtre.clientId, strFIRSTNAME: filtre.nom, strLASTNAME: ''}));
        }
        Ext.each([combo, reste], function (c) {
            c.suspendEvents(false);
        });
        combo.setValue(filtre.clientId);
        reste.setValue(true);
        Ext.each([combo, reste], function (c) {
            c.resumeEvents();
        });
    },

    /** Pastille du type de client sous son nom (vide si inconnu). */
    afficherTypeClient: function (type) {
        var ecran = this.getEcran();
        var zone = ecran ? ecran.down('#vueFiche #typeClientFiche') : null;
        if (zone) {
            zone.update(type ? '<span class="ordo-pastille">' + Ext.String.htmlEncode(type) + '</span>' : '');
        }
    },

    /**
     * Produit choisi dans la recherche au-dessus de la grille (30/09) : il remplit la premiere ligne vide, ou une
     * nouvelle ligne ; le curseur va ensuite dans sa posologie, comme avec la saisie dans la grille.
     */
    surRechercheProduit: function (combo, lignes) {
        var article = lignes && lignes.length ? lignes[0] : null;
        if (!article) {
            return;
        }
        var ligne = this.ligneAVide();
        ligne.set('articleId', article.get('lgFAMILLEID'));
        ligne.set('libelle', article.get('strNAME'));
        ligne.set('cip', article.get('intCIP') || '');
        combo.clearValue();
        if (article.get('intNUMBERAVAILABLE') <= 0) {
            this.montrerEquivalents(ligne, true);
        }
        this.editerPosologie(ligne);
    },

    /** Entree sur un texte qui n'est pas dans la liste : un produit hors referentiel, saisi tel quel. */
    surToucheRechercheProduit: function (combo, e) {
        if (e.getKey() !== e.ENTER) {
            return;
        }
        var me = this;
        /* Laisse d'abord la liste traiter l'Entree : si elle choisit un produit, « select » s'en charge. */
        Ext.defer(function () {
            if (combo.isDestroyed || combo.isExpanded) {
                return;
            }
            var texte = Ext.String.trim(combo.getRawValue() || '');
            var choisi = combo.getValue() && combo.findRecordByValue(combo.getValue());
            if (!texte || choisi) {
                return;
            }
            var ligne = me.ligneAVide();
            ligne.set('articleId', '');
            ligne.set('libelle', texte.toUpperCase());
            ligne.set('cip', '');
            combo.clearValue();
            me.editerPosologie(ligne);
        }, 50);
    },

    /** La premiere ligne sans produit, ou une nouvelle. */
    ligneAVide: function () {
        var store = this.getEcran().storeProduits;
        var vide = null;
        store.each(function (r) {
            if (!vide && !Ext.String.trim(r.get('libelle') || '')) {
                vide = r;
            }
        });
        if (vide) {
            return vide;
        }
        return store.add({articleId: '', libelle: '', cip: '', quantite: 1, posologie: '', duree: '',
            qteServie: null})[0];
    },

    editerPosologie: function (ligne) {
        var grille = this.getGrilleProduits();
        var edition = grille ? (grille.plugins || [])[0] : null;
        var colonne = grille ? grille.down('#colPosologie') : null;
        if (edition && colonne) {
            Ext.defer(function () {
                if (!grille.isDestroyed) {
                    edition.startEdit(ligne, colonne);
                }
            }, 80);
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

    /** Ce que la fiche enverrait au serveur ; sert aussi a savoir si une saisie est en cours. */
    requeteFiche: function () {
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
        requete.terrains = me.terrainsCoches();
        requete.poidsPatient = fiche.down('#poidsPatient').getValue() || null;
        /* Un renouvellement herite des reglages de son origine : il ne les envoie pas. */
        if (!(me.renouvellement && me.renouvellement.rang > 0)) {
            var nb = fiche.down('#renouvellements').getValue() || 0;
            requete.renouvellements = nb;
            requete.periodicite = nb > 0 ? (fiche.down('#periodicite').getValue() || null) : null;
        }
        return requete;
    },

    enregistrer: function () {
        var me = this;
        var ecran = me.getEcran();
        var fiche = ecran.down('#vueFiche');
        var requete = me.requeteFiche();
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
                me.titreFiche('L\'ordonnance N° ' + Ext.String.htmlEncode(r.numero || '')
                        + ' <span class="ordo-titre-ok">enregistrée</span>');
                me.chargerPieces();
                me.majBoutonConso();
                me.memoriserEtat();
                me.relireRenouvellement(r.id);
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

    /* ------------------------------------------------------------------- terrains cliniques (30/09) */

    /**
     * Les cases des terrains de la fiche, posées depuis la liste de l'officine. Les terrains désactivés ont aussi leur
     * case, cachée : une ordonnance ancienne qui en porte un le montre toujours.
     */
    chargerTerrains: function () {
        var me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ordonnance-client/terrains?tous=true',
            success: function (reponse) {
                var r = Ext.decode(reponse.responseText, true) || {};
                var ecran = me.getEcran();
                var zone = ecran ? ecran.down('#vueFiche #terrainsFiche') : null;
                if (!zone || r.success !== true) {
                    return;
                }
                var coches = me.terrainsCoches();
                zone.removeAll();
                zone.add(Ext.Array.map(r.data || [], function (t) {
                    return {xtype: 'checkbox', boxLabel: Ext.String.htmlEncode(t.libelle), cls: 'ordo-terrain',
                        terrainId: t.id, code: t.code || '', actif: t.actif === true, hidden: t.actif !== true};
                }));
                me.cocherTerrains(coches);
                Ext.each(me.casesTerrains(), function (cb) {
                    cb.setReadOnly(me.ficheVerrouillee === true);
                });
            }
        });
    },

    casesTerrains: function () {
        var ecran = this.getEcran();
        var zone = ecran ? ecran.down('#vueFiche #terrainsFiche') : null;
        return zone ? zone.items.getRange() : [];
    },

    terrainsCoches: function () {
        var ids = [];
        Ext.each(this.casesTerrains(), function (cb) {
            if (cb.getValue() === true) {
                ids.push(cb.terrainId);
            }
        });
        return ids;
    },

    /** Coche ces terrains ; un terrain désactivé n'apparaît que s'il est coché. */
    cocherTerrains: function (ids) {
        Ext.each(this.casesTerrains(), function (cb) {
            var coche = Ext.Array.contains(ids || [], cb.terrainId);
            cb.suspendEvents(false);
            cb.setValue(coche);
            cb.resumeEvents();
            cb.setVisible(cb.actif || coche);
        });
    },

    /* Paramétrage : grille modifiée directement, chaque changement enregistré aussitôt. */

    chargerParametrageTerrains: function () {
        var ecran = this.getEcran();
        if (ecran && ecran.storeTerrains) {
            ecran.storeTerrains.load();
        }
    },

    ajouterTerrain: function () {
        var ecran = this.getEcran();
        var grille = ecran.down('#vueTerrains');
        var ordre = 0;
        ecran.storeTerrains.each(function (r) {
            ordre = Math.max(ordre, r.get('ordre') || 0);
        });
        var rec = ecran.storeTerrains.add({id: '', code: '', libelle: '', ordre: ordre + 10, actif: true, utilise: 0})[0];
        var edition = (grille.plugins || [])[0];
        Ext.defer(function () {
            edition.startEdit(rec, grille.down('#colTerrainLibelle'));
        }, 80);
    },

    surEditionTerrain: function (editeur, e) {
        var rec = e.record;
        if (!Ext.String.trim(rec.get('libelle') || '')) {
            /* Une ligne ajoutée puis laissée vide n'est pas un terrain. */
            if (!rec.get('id')) {
                this.getEcran().storeTerrains.remove(rec);
            }
            return;
        }
        if (e.value === e.originalValue && rec.get('id')) {
            return;
        }
        this.sauverTerrain(rec);
    },

    surActifTerrain: function (colonne, ligne, coche, rec) {
        if (rec && rec.get('id')) {
            this.sauverTerrain(rec);
        }
    },

    sauverTerrain: function (rec) {
        var me = this;
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/ordonnance-client/terrains',
            jsonData: {id: rec.get('id') || '', libelle: rec.get('libelle'), ordre: rec.get('ordre') || 0,
                actif: rec.get('actif') === true},
            success: function (reponse) {
                var r = Ext.decode(reponse.responseText, true) || {};
                if (r.success !== true) {
                    Ext.Msg.alert('Terrains cliniques', Ext.String.htmlEncode(r.message || 'Le terrain n\'a pas pu être enregistré.'));
                }
                me.chargerParametrageTerrains();
                /* La fiche suit la liste : nouveau terrain, libellé, ordre, désactivation. */
                me.chargerTerrains();
            },
            failure: function () {
                Ext.Msg.alert('Terrains cliniques', 'Le terrain n\'a pas pu être enregistré.');
            }
        });
    },

    /* ------------------------------------------------------------------- renouvellements (30/09) */

    /**
     * Réglages et état du renouvellement sur la fiche. Sur l'ORIGINE : « Renouvelable N fois, tous les X jours » et
     * l'avancement ; sur un RENOUVELLEMENT : son rang et son origine, sans réglage (il hérite de l'origine).
     */
    afficherRenouvellement: function (o) {
        var ecran = this.getEcran();
        var fiche = ecran ? ecran.down('#vueFiche') : null;
        if (!fiche) {
            return;
        }
        this.renouvellement = o ? {rang: o.rang || 0, renouvAutorises: o.renouvAutorises || 0,
            renouvFaits: o.renouvFaits || 0, prochain: o.prochainRenouvellement || '',
            origineNumero: o.origineNumero || ''} : null;
        var nb = fiche.down('#renouvellements');
        var periode = fiche.down('#periodicite');
        var info = fiche.down('#infoRenouvellement');
        var estRenouvellement = !!(o && o.rang > 0);
        Ext.each(fiche.query('#ligneRenouvellement > *'), function (c) {
            if (c !== info) {
                c.setVisible(!estRenouvellement);
            }
        });
        Ext.each([nb, periode], function (c) {
            c.suspendEvents(false);
        });
        nb.setValue(o && !estRenouvellement ? (o.renouvAutorises || 0) : 0);
        periode.setValue(o && o.periodicite ? o.periodicite : 30);
        Ext.each([nb, periode], function (c) {
            c.resumeEvents();
        });
        this.majPeriodicite();
        var texte = '';
        if (o) {
            var prochain = o.prochainRenouvellement ? Ext.Date.format(Ext.Date.parse(o.prochainRenouvellement, 'Y-m-d'),
                    'd/m/Y') : '';
            if (estRenouvellement) {
                texte = '<span class="ordo-pastille">Renouvellement ' + o.rang + '/' + o.renouvAutorises + '</span> de '
                        + Ext.String.htmlEncode(o.origineNumero);
            } else if (o.renouvAutorises > 0) {
                texte = o.renouvFaits + '/' + o.renouvAutorises + ' renouvellement(s) fait(s)';
            }
            if (prochain) {
                texte += (texte ? ' — ' : '') + 'prochain le <b>' + prochain + '</b>';
            }
        }
        info.update(texte ? '<span class="ordo-info-renouv">' + texte + '</span>' : '');
        this.majImpressionFiche();
    },

    /** « tous les X jours » n'a de sens que si l'ordonnance est renouvelable. */
    majPeriodicite: function () {
        var ecran = this.getEcran();
        var fiche = ecran ? ecran.down('#vueFiche') : null;
        if (!fiche) {
            return;
        }
        var nb = fiche.down('#renouvellements').getValue() || 0;
        fiche.down('#periodicite').setDisabled(nb <= 0);
    },

    /** Après enregistrement : l'avancement des renouvellements peut avoir changé (réglage modifié). */
    relireRenouvellement: function (id) {
        var me = this;
        if (!id) {
            return;
        }
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ordonnance-client/' + encodeURIComponent(id),
            success: function (reponse) {
                var r = Ext.decode(reponse.responseText, true) || {};
                if (r.success === true && me.ordonnanceOuverte() === id) {
                    me.afficherRenouvellement(r.ordonnance || null);
                    me.memoriserEtat();
                }
            }
        });
    },

    /** « Renouveler » : une nouvelle ordonnance liée, datée du jour, ouverte en saisie. */
    renouveler: function () {
        var me = this;
        var id = me.ordonnanceOuverte();
        var r = me.renouvellement;
        if (!id || !r) {
            return;
        }
        if (!me.ficheVerrouillee && me.saisieEnCours()) {
            Ext.Msg.alert('Renouvellement', 'Enregistrez d\'abord les changements de l\'ordonnance.');
            return;
        }
        var rang = r.renouvFaits + 1;
        Ext.Msg.confirm('Renouveler l\'ordonnance', 'Créer le renouvellement <b>' + rang + '/' + r.renouvAutorises
                + '</b> : une nouvelle ordonnance datée d\'aujourd\'hui, avec les mêmes produits ?', function (bouton) {
                    if (bouton !== 'yes') {
                        return;
                    }
                    Ext.Ajax.request({
                        method: 'POST',
                        url: '../api/v1/ordonnance-client/renouvellement/' + encodeURIComponent(id),
                        success: function (reponse) {
                            var res = Ext.decode(reponse.responseText, true) || {};
                            if (res.success !== true) {
                                Ext.Msg.alert('Renouvellement', Ext.String.htmlEncode(res.message
                                        || 'Le renouvellement n\'a pas pu être créé.'));
                                return;
                            }
                            /* Le renouvellement s'ouvre en saisie : on y renseigne le service, on crée la prévente. */
                            me.ouvrirParId(res.id, false);
                        },
                        failure: function () {
                            Ext.Msg.alert('Renouvellement', 'Le renouvellement n\'a pas pu être créé.');
                        }
                    });
                });
    },

    ouvrirParId: function (id, enLecture) {
        var me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ordonnance-client/' + encodeURIComponent(id),
            success: function (reponse) {
                var r = Ext.decode(reponse.responseText, true) || {};
                if (r.success === true) {
                    me.remplirFiche(r, enLecture);
                }
            }
        });
    },

    /** « Rappel SMS » : prévient le client maintenant (le rappel automatique part aussi tout seul, avant l'échéance). */
    rappelRenouvellement: function () {
        var me = this;
        var id = me.ordonnanceOuverte();
        if (!id) {
            return;
        }
        Ext.Msg.confirm('Rappel SMS', 'Envoyer maintenant au client le SMS de rappel du prochain renouvellement ?',
                function (bouton) {
                    if (bouton !== 'yes') {
                        return;
                    }
                    Ext.Ajax.request({
                        method: 'POST',
                        url: '../api/v1/ordonnance-client/renouvellement/' + encodeURIComponent(id) + '/rappel',
                        success: function (reponse) {
                            var r = Ext.decode(reponse.responseText, true) || {};
                            Ext.Msg.alert('Rappel SMS', Ext.String.htmlEncode(r.message
                                    || 'Le rappel n\'a pas pu être envoyé.'));
                        },
                        failure: function () {
                            Ext.Msg.alert('Rappel SMS', 'Le rappel n\'a pas pu être envoyé.');
                        }
                    });
                });
    },

    /* ------------------------------------------------------------------- prévente (30/09) */

    /**
     * « Créer la prévente » : on montre d'abord ce qui sera créé (type de vente, tiers payant, produits et quantités,
     * produits non repris et pourquoi), puis on crée sur confirmation. La prévente se reprend à la caisse, dans la
     * liste des préventes ; l'écran de vente n'est pas touché.
     */
    creerPrevente: function () {
        var me = this;
        var id = me.ordonnanceOuverte();
        if (!id) {
            return;
        }
        if (!me.ficheVerrouillee && me.saisieEnCours()) {
            Ext.Msg.alert('Prévente', 'Enregistrez d\'abord les changements de l\'ordonnance : la prévente part de '
                    + 'l\'ordonnance enregistrée.');
            return;
        }
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ordonnance-client/prevente/' + encodeURIComponent(id) + '/apercu',
            success: function (reponse) {
                var r = Ext.decode(reponse.responseText, true) || {};
                if (r.success !== true) {
                    Ext.Msg.alert('Prévente', Ext.String.htmlEncode(r.message || 'La prévente n\'a pas pu être préparée.')
                            + me.listeEcartees(r.ecartees));
                    return;
                }
                me.confirmerPrevente(id, r);
            },
            failure: function () {
                Ext.Msg.alert('Prévente', 'La prévente n\'a pas pu être préparée.');
            }
        });
    },

    confirmerPrevente: function (id, r) {
        var me = this;
        var enc = Ext.String.htmlEncode;
        var produits = Ext.Array.map(r.retenues || [], function (l) {
            /* Ligne prise en partie, faute de stock (30/09) : ce qui restera a servir est dit. */
            return '<li>' + enc(l.libelle) + ' <b>× ' + l.quantite + '</b>'
                    + (l.partiel ? ' <span class="ordo-prevente-partiel">(' + enc(l.partiel) + ')</span>' : '') + '</li>';
        }).join('');
        var enAttente = Ext.Array.filter(r.preventes || [], function (p) {
            return p.enAttente;
        });
        var texte = '<div class="ordo-prevente">'
                + '<div><b>' + enc(r.typeVenteLibelle) + '</b> — ' + enc(r.client)
                + (r.tiersPayant ? ' — tiers payant : <b>' + enc(r.tiersPayant) + '</b>' : '') + '</div>'
                + '<div style="margin-top:6px">Produits (ce qui reste à servir) :</div><ul>' + produits + '</ul>'
                + me.listeEcartees(r.ecartees)
                + (enAttente.length ? '<div class="ordo-prevente-alerte">Une prévente de cette ordonnance est déjà '
                        + 'en attente à la caisse (' + enc(enAttente[0].ref) + ').</div>' : '')
                + '</div>';
        Ext.Msg.show({
            title: 'Créer la prévente ?',
            msg: texte,
            width: 520,
            buttons: Ext.Msg.YESNO,
            buttonText: {yes: 'Créer la prévente', no: 'Annuler'},
            icon: Ext.Msg.QUESTION,
            fn: function (bouton) {
                if (bouton === 'yes') {
                    me.envoyerPrevente(id);
                }
            }
        });
    },

    envoyerPrevente: function (id) {
        var me = this;
        var bouton = me.getEcran().down('#vueFiche button[itemId=creerPrevente]');
        if (bouton) {
            bouton.setDisabled(true);
        }
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/ordonnance-client/prevente/' + encodeURIComponent(id),
            success: function (reponse) {
                var r = Ext.decode(reponse.responseText, true) || {};
                me.majImpressionFiche();
                me.chargerPreventes();
                Ext.Msg.alert(r.success === true ? 'Prévente créée' : 'Prévente',
                        Ext.String.htmlEncode(r.message || 'La prévente n\'a pas pu être créée.')
                        + me.listeEcartees(r.ecartees));
            },
            failure: function () {
                me.majImpressionFiche();
                Ext.Msg.alert('Prévente', 'La prévente n\'a pas pu être créée.');
            }
        });
    },

    /** Les produits non repris, avec leur motif : rien n'est écarté en silence. */
    listeEcartees: function (ecartees) {
        if (!ecartees || !ecartees.length) {
            return '';
        }
        return '<div style="margin-top:6px">Non repris :</div><ul class="ordo-prevente-ecartees">'
                + Ext.Array.map(ecartees, function (e) {
                    return '<li>' + Ext.String.htmlEncode(e.libelle) + ' — <i>' + Ext.String.htmlEncode(e.motif)
                            + '</i></li>';
                }).join('') + '</ul>';
    },

    /** Les préventes déjà nées de l'ordonnance ouverte, à côté du bouton. */
    chargerPreventes: function () {
        var me = this;
        var id = me.ordonnanceOuverte();
        if (!id) {
            me.afficherPreventes([]);
            return;
        }
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ordonnance-client/prevente/' + encodeURIComponent(id),
            success: function (reponse) {
                var r = Ext.decode(reponse.responseText, true) || {};
                /* Une autre ordonnance a pu être ouverte entre-temps. */
                if (me.ordonnanceOuverte() === id) {
                    me.afficherPreventes(r.data || []);
                }
            }
        });
    },

    afficherPreventes: function (preventes) {
        var ecran = this.getEcran();
        var zone = ecran ? ecran.down('#vueFiche #preventesFiche') : null;
        if (!zone) {
            return;
        }
        zone.setText(preventes.length ? 'Préventes : ' + Ext.Array.map(preventes, function (p) {
            return '<span class="ordo-pastille" data-qtip="' + Ext.String.htmlEncode(p.typeVente + ', '
                    + p.lignes + ' produit(s), ' + Ext.util.Format.number(p.montant || 0, '0,000') + ' F') + '">'
                    + Ext.String.htmlEncode(p.ref) + ' — ' + Ext.String.htmlEncode(p.etat) + '</span>';
        }).join(' ') : '');
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
            me.basculerBoutonsPieces(false);
            return;
        }
        if (rappel) {
            rappel.setValue(peutEcrire
                ? 'JPG, PNG, TIFF ou PDF, 10 Mo au plus. « Voir » ouvre la pièce dans un onglet.'
                : 'Consultation seule : votre profil ne permet pas de joindre ni de retirer une pièce.');
        }
        me.majImpressionFiche();
        me.chargerPreventes();
        ecran.storePieces.getProxy().url = '../api/v1/ordonnance-client/pieces/' + encodeURIComponent(id);
        ecran.storePieces.load();
        me.basculerBoutonsPieces(peutEcrire && !me.ficheVerrouillee);
    },

    /** Le bouton d'impression de la fiche n'a de sens que sur une ordonnance déjà enregistrée. */
    majImpressionFiche: function () {
        var ecran = this.getEcran();
        var bouton = ecran ? ecran.down('#vueFiche button[itemId=imprimerFicheOuverte]') : null;
        if (bouton) {
            bouton.setDisabled(!this.ordonnanceOuverte());
        }
        /* La prevente part d'une ordonnance ENREGISTREE et non annulee ; en consultation aussi : elle ne la modifie pas. */
        var prevente = ecran ? ecran.down('#vueFiche button[itemId=creerPrevente]') : null;
        if (prevente) {
            prevente.setDisabled(!this.ordonnanceOuverte() || this.ficheAnnulee === true);
        }
        /* Renouveler / rappeler : il reste un renouvellement dans la chaine (origine ou renouvellement ouvert). */
        var r = this.renouvellement;
        var reste = !!(r && r.renouvAutorises > r.renouvFaits);
        Ext.each(['renouvelerFiche', 'rappelRenouvellement'], function (b) {
            var bouton = ecran ? ecran.down('#vueFiche button[itemId=' + b + ']') : null;
            if (bouton) {
                bouton.setDisabled(!this.ordonnanceOuverte() || this.ficheAnnulee === true || !reste);
            }
        }, this);
    },

    /**
     * Le fichier a envoyer et le bouton « Joindre ». Voir, telecharger et retirer sont sur chaque ligne de piece
     * (30/09) : leurs icones relisent les droits et le verrou de la fiche a chaque dessin de la grille.
     */
    basculerBoutonsPieces: function (envoiPossible) {
        var ecran = this.getEcran();
        var grille = ecran ? ecran.down('#grillePieces') : null;
        if (!grille) {
            return;
        }
        var fichier = grille.down('#fichierPiece');
        if (fichier) {
            fichier.setDisabled(!envoiPossible);
        }
        var joindre = grille.down('button[itemId=joindrePiece]');
        if (joindre) {
            joindre.setDisabled(!(envoiPossible && !!(fichier && fichier.getValue())));
        }
        this.rafraichirPieces();
    },

    rafraichirPieces: function () {
        var ecran = this.getEcran();
        var grille = ecran ? ecran.down('#grillePieces') : null;
        if (grille && grille.rendered && grille.getView()) {
            grille.getView().refresh();
        }
    },

    surChoixFichier: function () {
        var me = this;
        me.basculerBoutonsPieces(!!(me.droits && me.droits.modifier) && !me.ficheVerrouillee);
    },

    /** Une icone d'une ligne de piece : voir, telecharger ou retirer CETTE piece. */
    surActionPiece: function (nom, piece) {
        var me = this;
        var ecran = me.getEcran();
        if (nom === 'voir') {
            me.voirPiece(piece);
        } else if (nom === 'telecharger') {
            me.telechargerPiece(piece);
        } else if (nom === 'retirer' && ecran && ecran.peutEcrire && !me.ficheVerrouillee) {
            me.retirerPiece(piece);
        }
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
    voirPiece: function (piece) {
        if (!piece) {
            return;
        }
        window.open('../api/v1/ordonnance-client/piece/' + encodeURIComponent(piece.get('id')), '_blank');
    },

    telechargerPiece: function (piece) {
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
    retirerPiece: function (piece) {
        var me = this;
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
     * Creation d'un client STANDARD depuis la fiche (retour du 23/09) : le formulaire s'ouvre dans la fiche. La
     * fenetre de la caisse reutilisee jusqu'ici s'ouvrait VIDE hors de l'ecran de vente.
     */
    nouveauClient: function () {
        var me = this;
        var fiche = me.getEcran().down('#vueFiche');
        var fen = me.ouvrirFenetre('client');
        var nom = fen.down('#ncNom');
        /* Ce qui a ete tape dans la recherche du client sert de nom, pour ne pas le retaper. */
        var combo = fiche.down('#ficheClient');
        var tape = Ext.String.trim(combo.getRawValue() || '');
        /* Le combo garde le texte tape comme valeur : un client est CHOISI seulement si la valeur est un
           enregistrement de la liste. */
        var choisi = combo.getValue() && combo.findRecordByValue(combo.getValue());
        if (tape && !choisi) {
            nom.setValue(tape.toUpperCase());
        }
        nom.focus(false, 150);
    },

    /**
     * Fenetre de creation rapide (30/09), une seule a la fois. Elle est detruite a la fermeture : une nouvelle
     * s'ouvre toujours vide.
     */
    ouvrirFenetre: function (genre) {
        var ecran = this.getEcran();
        Ext.each(['#fenNouveauClient', '#fenNouveauMedecin', '#fenNouvelEtablissement'], function (id) {
            var ouverte = Ext.ComponentQuery.query('window' + id)[0];
            if (ouverte) {
                ouverte.destroy();
            }
        });
        var fen = ecran.fenetreCreation(genre);
        fen.show();
        return fen;
    },

    fenetre: function (itemId) {
        return Ext.ComponentQuery.query('window#' + itemId)[0] || null;
    },

    fermerFenetre: function (itemId) {
        var fen = this.fenetre(itemId);
        if (fen) {
            fen.destroy();
        }
    },

    /** Entree dans un champ d'une fenetre : meme effet que « Creer ». */
    entreeCreerClient: function (champ, e) {
        if (e.getKey() === e.ENTER && !champ.isXType('combobox')) {
            this.creerClient();
        }
    },

    entreeCreerMedecin: function (champ, e) {
        if (e.getKey() === e.ENTER) {
            this.creerMedecin();
        }
    },

    entreeAjouterEtablissement: function (champ, e) {
        if (e.getKey() === e.ENTER) {
            this.ajouterEtablissement();
        }
    },

    /* ------------------------------------------------ prescripteur et etablissement rapides (23/09) */

    nouveauMedecin: function () {
        var fiche = this.getEcran().down('#vueFiche');
        var fen = this.ouvrirFenetre('medecin');
        /* Ce qui a ete tape dans le prescripteur sert de nom. */
        var combo = fiche.down('#ficheMedecin');
        var tape = Ext.String.trim(combo.getRawValue() || '');
        if (tape && !(combo.getValue() && combo.findRecordByValue(combo.getValue()))) {
            fen.down('#nmNom').setValue(tape.toUpperCase());
        }
        fen.down('#nmNom').focus(false, 150);
    },

    fermerNouveauMedecin: function () {
        this.fermerFenetre('fenNouveauMedecin');
    },

    creerMedecin: function () {
        var me = this;
        var ecran = me.getEcran();
        var fiche = ecran.down('#vueFiche');
        var form = me.fenetre('fenNouveauMedecin');
        if (!form) {
            return;
        }
        if (!form.down('#nmNom').validate()) {
            Ext.Msg.alert('Nouveau prescripteur', 'Le nom du prescripteur est obligatoire.');
            return;
        }
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/ordonnance-client/medecins/creer',
            jsonData: {
                nom: Ext.String.trim(form.down('#nmNom').getValue() || ''),
                prenom: Ext.String.trim(form.down('#nmPrenom').getValue() || ''),
                specialite: Ext.String.trim(form.down('#nmSpecialite').getValue() || ''),
                telephone: Ext.String.trim(form.down('#nmTelephone').getValue() || '')
            },
            success: function (reponse) {
                var r = Ext.decode(reponse.responseText, true) || {};
                if (r.success !== true || !r.id) {
                    Ext.Msg.alert('Nouveau prescripteur', r.message || 'Le prescripteur n\'a pas pu être créé.');
                    return;
                }
                if (ecran.storeMedecins.findExact('id', r.id) < 0) {
                    var modele = ecran.storeMedecins.getProxy().getModel();
                    ecran.storeMedecins.add(new modele({id: r.id, nom: r.nom}));
                }
                fiche.down('#ficheMedecin').setValue(r.id);
                me.fermerNouveauMedecin();
                me.allerRechercheProduit();
            },
            failure: function () {
                Ext.Msg.alert('Nouveau prescripteur', 'Le prescripteur n\'a pas pu être créé.');
            }
        });
    },

    nouvelEtablissement: function () {
        var fiche = this.getEcran().down('#vueFiche');
        var fen = this.ouvrirFenetre('etablissement');
        var tape = Ext.String.trim(fiche.down('#ficheEtablissement').getRawValue() || '');
        if (tape) {
            fen.down('#neNom').setValue(tape.toUpperCase());
        }
        fen.down('#neNom').focus(false, 150);
    },

    fermerNouvelEtablissement: function () {
        this.fermerFenetre('fenNouvelEtablissement');
    },

    /**
     * L'etablissement est pose dans la fiche et ajoute a la liste proposee ; il est enregistre avec l'ordonnance.
     * Il n'y a pas de referentiel des etablissements : c'est la liste des ordonnances deja saisies qui en tient lieu.
     */
    ajouterEtablissement: function () {
        var ecran = this.getEcran();
        var fiche = ecran.down('#vueFiche');
        var form = this.fenetre('fenNouvelEtablissement');
        if (!form) {
            return;
        }
        var champ = form.down('#neNom');
        if (!champ.validate()) {
            Ext.Msg.alert('Nouvel établissement', 'Le nom de l\'établissement est obligatoire.');
            return;
        }
        var nom = Ext.String.trim(champ.getValue()).toUpperCase();
        if (ecran.storeEtablissements.findExact('nom', nom) < 0) {
            ecran.storeEtablissements.add({nom: nom});
        }
        fiche.down('#ficheEtablissement').setValue(nom);
        this.fermerNouvelEtablissement();
        this.allerRechercheProduit();
    },

    annulerNouveauClient: function () {
        this.fermerFenetre('fenNouveauClient');
    },

    creerClient: function () {
        var me = this;
        var ecran = me.getEcran();
        var fiche = ecran.down('#vueFiche');
        var form = me.fenetre('fenNouveauClient');
        if (!form) {
            return;
        }
        var champs = ['#ncNom', '#ncPrenom', '#ncTelephone'];
        var valide = true;
        Ext.each(champs, function (s) {
            valide = form.down(s).validate() && valide;
        });
        if (!valide) {
            Ext.Msg.alert('Nouveau client', 'Le nom, le prénom et le téléphone sont obligatoires.');
            return;
        }
        var sexe = form.down('#ncSexe').getValue() || '';
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/client/add/lambda',
            /* Meme service et meme type (6 = Standard) que la creation d'un client a la caisse. */
            jsonData: {
                strFIRSTNAME: Ext.String.trim(form.down('#ncNom').getValue()),
                strLASTNAME: Ext.String.trim(form.down('#ncPrenom').getValue()),
                strADRESSE: Ext.String.trim(form.down('#ncTelephone').getValue()),
                lgTYPECLIENTID: '6',
                strSEXE: sexe || null,
                /* En TEXTE, comme le formulaire de la caisse : le service refuse un booleen JSON. */
                consentSms: form.down('#ncConsentement').getValue() === true ? 'true' : 'false'
            },
            success: function (reponse) {
                var r = Ext.decode(reponse.responseText, true) || {};
                var c = r.data;
                if (r.success !== true || !c || !c.lgCLIENTID) {
                    Ext.Msg.alert('Nouveau client', r.msg || 'Le client n\'a pas pu être créé.');
                    return;
                }
                /* Le client cree est choisi dans la fiche, sans nouvelle recherche. */
                if (ecran.storeClients.findExact('lgCLIENTID', c.lgCLIENTID) < 0) {
                    var modele = ecran.storeClients.getProxy().getModel();
                    ecran.storeClients.add(new modele({
                        lgCLIENTID: c.lgCLIENTID,
                        strFIRSTNAME: c.strFIRSTNAME || '',
                        strLASTNAME: c.strLASTNAME || '',
                        strTELEPHONE: c.strADRESSE || ''
                    }));
                }
                fiche.down('#ficheClient').setValue(c.lgCLIENTID);
                /* Le genre saisi sert aussi au contexte clinique, s'il n'est pas deja renseigne. */
                if (sexe && !fiche.down('#sexePatient').getValue()) {
                    fiche.down('#sexePatient').setValue(sexe);
                }
                me.annulerNouveauClient();
                me.afficherTypeClient('Client standard');
                me.majBoutonConso();
                me.allerRechercheProduit();
            },
            failure: function () {
                Ext.Msg.alert('Nouveau client', 'Le client n\'a pas pu être créé.');
            }
        });
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
        /* Terrains coches (30/09), par leur code : c'est ainsi que l'analyse les connait. */
        var codes = [];
        Ext.each(this.casesTerrains(), function (cb) {
            if (cb.getValue() === true && cb.code) {
                codes.push(cb.code);
            }
        });
        if (codes.length) {
            c.terrains = codes;
        }
        var poids = fiche.down('#poidsPatient').getValue();
        if (poids) {
            c.poids = poids;
        }
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
                    /* Aucune alerte : le message remplace le compteur, mais les produits non couverts restent dits. */
                    parties[0] = Ext.String.htmlEncode(r.message);
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
