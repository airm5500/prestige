/*
 * Correctifs d'affichage : empecher qu'ExtJS coupe la fin d'un texte.
 *
 * Deux composants sont concernes, pour la meme raison de fond : ExtJS fige une taille
 * calculee a partir d'une mesure du texte, et le conteneur est en overflow:hidden. Quand la
 * mesure est trop courte de quelques pixels (police du poste, zoom du navigateur), la fin du
 * texte existe dans la page mais reste invisible.
 *
 * 1) les info-bulles (QuickTip) ;
 * 2) les boites de message (Ext.MessageBox).
 *
 * =====================================================================================
 * 1) INFO-BULLES
 *
 * Symptome constate : en survolant un bouton de la liste des facturations, on lit
 * "Avoir deja" au lieu de "Avoir deja certifie".
 *
 * Cause : ExtJS mesure le texte de l'info-bulle, arrondit la largeur obtenue au
 * pixel INFERIEUR, puis fige cette largeur. Quand le texte reel fait une fraction
 * de pixel de plus (ce qui depend de la police du poste et du zoom du navigateur),
 * il ne tient plus et passe a la ligne. Or la hauteur de l'info-bulle a, elle, ete
 * calculee pour une seule ligne, et le corps de l'info-bulle est en overflow:hidden
 * dans le theme : la deuxieme ligne existe mais reste invisible. D'ou le texte
 * tronque, sans aucun indice pour l'utilisateur.
 *
 * Correctif : juste apres l'affichage, si le contenu deborde de son cadre :
 *   1. on essaie d'elargir l'info-bulle jusqu'a la largeur naturelle du texte,
 *      sans jamais depasser la largeur maximale d'ExtJS ni une largeur imposee
 *      par l'appelant (data-qwidth, ou config width d'un tip enregistre) ;
 *   2. s'il reste des lignes masquees (texte reellement long, sur plusieurs
 *      lignes), on augmente la hauteur de ce qui manque ;
 *   3. on relance la contrainte d'ExtJS pour que l'info-bulle agrandie reste
 *      entierement dans la fenetre (les boutons concernes sont a droite).
 * Le redimensionnement passe par les methodes d'ExtJS : la mise en page interne
 * (entete, ancre) est recalculee normalement.
 *
 * L'ajustement est fait apres showAt() et non sur l'evenement "show" : a ce
 * moment-la ExtJS n'a pas encore applique la mise en page (le corps mesure
 * encore 34x6 pixels), toute mesure y serait fausse.
 *
 * =====================================================================================
 * 2) BOITES DE MESSAGE
 *
 * Symptome constate : apres l'emission d'un avoir FNE, la boite affiche
 * "Avoir FNE emis. Reference : ... / La facture a ete annulee : les ventes sont a nouveau
 * fact" - la derniere ligne est coupee en deux.
 *
 * Cause : Ext.MessageBox calcule la hauteur de la fenetre a partir d'une mesure du texte.
 * Le conteneur interne de la mise en page (.x-box-inner) recoit cette hauteur en dur et il
 * est en overflow:hidden. Rendre le corps de la fenetre defilable ne suffit donc pas : le
 * corps, lui, ne deborde jamais, c'est le conteneur interne qui rogne.
 *
 * Correctif : apres l'affichage, si un element de la boite masque une partie de son
 * contenu, la fenetre est agrandie d'autant puis recentree. ExtJS efface la hauteur a
 * chaque nouvel appel (delete me.height dans reconfigure) : la hauteur forcee ne reste
 * jamais collee a la boite suivante.
 *
 * =====================================================================================
 * 3) ECRANS DECOLLES DE LEUR ENTETE, ET QUI "DESCENDENT" APRES UNE RECHERCHE
 *
 * Symptome constate : sur la liste des bons par organisme et sur la liste des factures,
 * une large bande de fond d'application separe la barre de titre du panneau central
 * ("Factures") de l'entete de l'ecran ("Gestion des facturations"). Et quand une recherche
 * ramene beaucoup de lignes, il faut faire defiler toute la page pour revoir le titre et la
 * barre de recherche.
 *
 * Cause, verifiee dans le code : a l'ouverture d'un menu, App.centerContent() appelle
 * item.alignTo(corps, 'c-c'). L'ecran est donc positionne en ABSOLU et CENTRE dans le corps
 * du panneau central. Sur un ecran plein page, toute la place inutilisee se repartit moitie
 * au-dessus, moitie en dessous : c'est la bande de fond. Et comme la hauteur de l'ecran est
 * figee (580 px pour la liste des factures) ou automatique, une grille plus haute que cette
 * valeur fait defiler la PAGE ENTIERE - entete et barre de recherche compris - au lieu des
 * seules lignes.
 *
 * Correctif : PrestigeAffichage.collerAuConteneur(panneau)
 *   1. marque l'ecran (collerEnHaut) : App.centerContent() ne le centre plus, il reste en
 *      haut a gauche, colle a la barre de titre du panneau central ;
 *   2. lui donne exactement la place disponible, ni plus ni moins : aucune barre de
 *      defilement de page, ni verticale ni horizontale ; ce sont les lignes de la grille qui
 *      defilent, dans leur propre ascenseur ;
 *   3. masque l'entete de l'ecran : une fois les deux barres collees l'une a l'autre, le
 *      titre etait ecrit deux fois de suite.
 *
 * =====================================================================================
 * 4) MOTEUR DE MISE EN PAGE BLOQUE : L'AFFICHAGE "SE PERD"
 *
 * Symptome constate : de temps en temps, un ecran (le menu principal par exemple) n'occupe
 * plus toute la largeur : le panneau central garde son ancienne taille et une bande vide
 * apparait a droite (ou en bas). Plus aucun redimensionnement n'est pris en compte, et
 * l'ouverture du menu suivant peut echouer, jusqu'au rechargement de la page (F5).
 *
 * Cause, reproduite sur le banc : ExtJS 4.2 execute toutes les mises en page dans un
 * "contexte" unique (Ext.AbstractComponent.flushLayouts). Il note ce contexte comme etant
 * en cours, lance le calcul, et ne le libere qu'a la toute fin du calcul. Si une exception
 * survient AU MILIEU du calcul (un rendu de grille qui plante, une donnee inattendue dans
 * un ecran...), la fin n'est jamais atteinte : le contexte reste marque "en cours" pour
 * toujours. Des lors, chaque demande de mise en page (redimensionnement de la fenetre,
 * ouverture d'un menu, ajustement d'un ecran colle) est simplement mise en attente
 * derriere un calcul qui ne se terminera jamais. L'ecran fige a sa derniere taille connue.
 *
 * Correctif : PrestigeAffichage surveille flushLayouts. Si le calcul leve une exception
 * alors que le contexte est encore marque "en cours" :
 *   1. le contexte est libere, le moteur redevient utilisable immediatement ;
 *   2. l'incident est journalise avec sa pile d'appels, pour retrouver l'ecran fautif :
 *      console du navigateur, fil d'Ariane, et journal du Centre de Support (ecrans
 *      Diagnostic et Historique, message "Mise en page bloquee puis retablie : ...",
 *      colonne ecran = xtype et titre de l'ecran affiche) ;
 *   3. une mise en page complete est relancee juste apres, pour que l'ecran reprenne la
 *      bonne taille sans attendre ; au plus trois relances en cinq secondes, afin qu'une
 *      erreur qui se repete a chaque calcul ne tourne pas en boucle ;
 *   4. l'exception est ensuite relancee telle quelle : rien n'est masque.
 */
/* global Ext */
window.PrestigeAffichage = window.PrestigeAffichage || {};

(function () {
    'use strict';

    var Composant = Ext.AbstractComponent,
        flushOriginal = Composant && Composant.flushLayouts,
        incidents = [],
        relances = [],
        MAX_INCIDENTS = 20,
        MAX_RELANCES = 3,
        FENETRE_RELANCES = 5000;

    if (!flushOriginal || flushOriginal.correctifBlocage) {
        return;
    }

    function journaliser(erreur) {
        var message = 'LAYOUT: exception pendant la mise en page : '
                + (erreur && erreur.message ? erreur.message : String(erreur));
        incidents.push({
            date: new Date(),
            message: message,
            pile: erreur && erreur.stack ? String(erreur.stack) : ''
        });
        if (incidents.length > MAX_INCIDENTS) {
            incidents.shift();
        }
        try {
            if (window.console && console.error) {
                console.error('[Prestige] ' + message + ' - moteur de mise en page libere', erreur);
            }
        } catch (e) {
        }
        try {
            if (window.__prestigeSupport && window.__prestigeSupport.push) {
                window.__prestigeSupport.push(message);
            }
        } catch (e) {
        }
        // Journal du Centre de Support (ecran Diagnostic / Historique) : l'incident y apparait
        // avec l'ecran affiche, la pile d'appels et le fil d'Ariane, comme une erreur JS.
        try {
            if (window.__prestigeSupport && window.__prestigeSupport.signaler) {
                window.__prestigeSupport.signaler({
                    type: 'JS',
                    niveau: 'ERROR',
                    module: 'FRONTEND',
                    messageCourt: ('Mise en page bloquée puis rétablie : '
                            + (erreur && erreur.message ? erreur.message : String(erreur))).substring(0, 500),
                    urlOuEcran: ecranCourant().substring(0, 255),
                    stack: erreur && erreur.stack ? String(erreur.stack).substring(0, 8000) : null
                });
            }
        } catch (e) {
        }
    }

    /** Ecran affiche dans le panneau central au moment de l'incident : "xtype (titre)". */
    function ecranCourant() {
        try {
            var panneau = Ext.getCmp('content-panel'),
                ecran = panneau && panneau.items && panneau.items.getAt(0),
                titre = panneau && panneau.title ? String(panneau.title).replace(/&nbsp;/g, '').trim() : '';
            if (!ecran) {
                return titre || String(window.location.pathname || '');
            }
            return ecran.getXType() + (titre ? ' (' + titre + ')' : '');
        } catch (e) {
            return String(window.location.pathname || '');
        }
    }

    function relancePossible() {
        var maintenant = new Date().getTime();
        relances = Ext.Array.filter(relances, function (t) {
            return maintenant - t < FENETRE_RELANCES;
        });
        if (relances.length >= MAX_RELANCES) {
            return false;
        }
        relances.push(maintenant);
        return true;
    }

    function relancerMiseEnPage() {
        Ext.Function.defer(function () {
            var vues = Ext.ComponentQuery.query('viewport'), i;
            try {
                for (i = 0; i < vues.length; i++) {
                    if (vues[i].rendered && !vues[i].isDestroyed) {
                        vues[i].updateLayout();
                    }
                }
            } catch (e) {
                // deja journalise par flushLayouts ; on ne relance pas indefiniment
            }
        }, 30);
    }

    /**
     * Detache les layouts d'un calcul interrompu, comme le fait ExtJS lui-meme quand un
     * calcul echoue proprement (Ext.layout.Context.handleFailure) : un layout qui garde
     * une reference au contexte mort serait pris pour "deja commence" au calcul suivant,
     * son initialisation serait sautee et ce calcul planterait a son tour.
     */
    function detacher(contexte) {
        var layouts = contexte && contexte.layouts, cle, layout;
        if (!layouts) {
            return;
        }
        for (cle in layouts) {
            if (layouts.hasOwnProperty(cle)) {
                layout = layouts[cle];
                if (layout) {
                    layout.running = false;
                    layout.ownerContext = null;
                }
            }
        }
    }

    Composant.flushLayouts = function () {
        // le contexte en attente est celui que flushLayouts va executer
        var contexte = this.pendingLayouts;
        try {
            return flushOriginal.apply(this, arguments);
        } catch (erreur) {
            if (contexte) {
                if (this.runningLayoutContext === contexte) {
                    this.runningLayoutContext = null;
                }
                detacher(contexte);
                journaliser(erreur);
                if (relancePossible()) {
                    relancerMiseEnPage();
                }
            }
            throw erreur;
        }
    };
    Composant.flushLayouts.correctifBlocage = true;

    /** Derniers incidents de mise en page (pour le diagnostic depuis la console). */
    window.PrestigeAffichage.incidentsMiseEnPage = incidents;
})();

/*
 * Editions PDF longues : l'onglet doit etre ouvert DANS le clic de l'utilisateur. Ouvert plus
 * tard, a l'arrivee de la reponse du serveur, le navigateur le prend pour une fenetre
 * surgissante et le bloque (Firefox, Chrome) des que l'edition dure plus d'une seconde.
 *   var onglet = PrestigeEditions.ouvrirOnglet();   // au clic : onglet vide « Édition en cours... »
 *   PrestigeEditions.afficher(onglet, url);          // a la reponse : le PDF s'y charge
 *   PrestigeEditions.fermer(onglet);                 // en cas d'echec
 * Si le navigateur refuse malgre tout l'onglet (null), on retombe sur window.open a la reponse.
 */
window.PrestigeEditions = {
    ouvrirOnglet: function () {
        var onglet = null;
        try {
            onglet = window.open('', '_blank');
            if (onglet && onglet.document) {
                onglet.document.write('<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>Édition en cours</title>'
                        + '<style>body{font-family:Segoe UI,Arial,sans-serif;background:#f3f5f8;color:#1b2a3a;display:flex;'
                        + 'align-items:center;justify-content:center;height:100vh;margin:0}div{text-align:center}'
                        + 'b{font-size:20px}p{color:#65758a}</style></head><body><div><b>Édition en cours...</b>'
                        + '<p>Le document s\'affichera ici dès qu\'il sera prêt.</p></div></body></html>');
                onglet.document.close();
            }
        } catch (e) {
            onglet = null;
        }
        return onglet;
    },
    afficher: function (onglet, url) {
        if (onglet && !onglet.closed) {
            onglet.location.href = url;
        } else {
            window.open(url, '_blank');
        }
    },
    fermer: function (onglet) {
        try {
            if (onglet && !onglet.closed) {
                onglet.close();
            }
        } catch (e) {
        }
    }
};

/**
 * Colle un ecran plein page a la barre de titre du panneau central.
 *
 * L'ecran n'est plus centre (cf. App.centerContent), il occupe exactement la place
 * disponible et son propre entete est masque : la barre de titre du panneau central le
 * porte deja. Resultat : plus de bande de fond au-dessus, plus de barre de defilement de
 * page ni verticale ni horizontale. Les lignes de la grille, elles, defilent normalement
 * dans leur ascenseur interne.
 *
 * La taille est recalculee a chaque redimensionnement de la fenetre du navigateur, et le
 * calcul est refait une fois apres coup : quand l'ecran cesse de deborder, l'ascenseur du
 * conteneur disparait et rend une quinzaine de pixels de large.
 *
 * @param {Ext.panel.Panel} panneau ecran a ajuster
 * @param {Object} [options] marge (defaut 0 px), hauteurMini (defaut 260 px, en dessous de
 *        laquelle on prefere laisser la page defiler plutot qu'ecraser l'ecran) et
 *        garderEntete (defaut false : l'entete de l'ecran est masque)
 */
window.PrestigeAffichage.collerAuConteneur = function (panneau, options) {
    'use strict';

    var reglages = options || {},
        marge = reglages.marge === undefined ? 0 : reglages.marge,
        hauteurMini = reglages.hauteurMini === undefined ? 260 : reglages.hauteurMini;

    // Lu par App.centerContent(), qui centrerait sinon l'ecran en absolu dans le corps du
    // panneau central et laisserait la moitie de la place perdue au-dessus.
    panneau.collerEnHaut = true;

    if (!reglages.garderEntete) {
        // Le titre de l'ecran serait affiche juste sous celui du panneau central, qui dit
        // deja la meme chose. header:false doit etre pose AVANT le rendu.
        panneau.header = false;
        panneau.title = undefined;
    }

    function placeDisponible() {
        var conteneur = panneau.ownerCt,
            zone = conteneur && conteneur.body ? conteneur.body.getViewSize()
                    : Ext.getBody().getViewSize();
        return {
            width: Math.max(zone.width - marge, 200),
            height: Math.max(zone.height - marge, hauteurMini)
        };
    }

    function ajuster() {
        var cible, actuelle, element;
        if (!panneau.rendered || panneau.isDestroyed) {
            return false;
        }
        // une hauteur maximale declaree par l'ecran (maxHeight: 800 par exemple) l'emporterait
        // sur la taille demandee et laisserait reapparaitre une bande de fond en bas
        if (panneau.maxHeight) {
            panneau.maxHeight = Math.max(panneau.maxHeight, placeDisponible().height);
        }
        // alignTo() a pu laisser un positionnement absolu derriere lui (ouverture d'un menu
        // avant que le marqueur ne soit lu, ou surcharge tierce) : on le neutralise, faute de
        // quoi l'ecran resterait decale de la moitie de la place perdue.
        element = panneau.getEl();
        if (element && element.dom.style.position === 'absolute') {
            element.dom.style.top = '';
            element.dom.style.left = '';
            element.dom.style.position = '';
        }
        cible = placeDisponible();
        actuelle = panneau.getSize();
        // la hauteur mini de l'ecran l'emporterait sur la taille demandee : on la ramene
        // a la notre, sinon le panneau resterait plus grand que la place disponible
        panneau.minHeight = Math.min(panneau.minHeight || hauteurMini, hauteurMini);
        if (Math.abs(actuelle.height - cible.height) < 2 && Math.abs(actuelle.width - cible.width) < 2) {
            return false;
        }
        panneau.setSize(cible.width, cible.height);
        return true;
    }

    function ajusterPuisVerifier() {
        if (ajuster()) {
            Ext.Function.defer(ajuster, 50);
        }
    }

    panneau.on('afterrender', function () {
        var conteneur = panneau.ownerCt;
        Ext.Function.defer(ajusterPuisVerifier, 1);
        // L'ecran suit aussi le panneau central lui-meme, pas seulement la fenetre du
        // navigateur : quand le panneau central change de taille sans que la fenetre ait
        // bouge (mise en page relancee apres un blocage du moteur, cf. section 4), l'ecran
        // colle reprenait sinon son ancienne taille jusqu'au prochain redimensionnement.
        // Sans boucle possible : la taille du panneau central est fixee par la fenetre,
        // redimensionner l'ecran qu'il contient ne le fait pas changer de taille.
        if (conteneur && conteneur.on) {
            conteneur.on('resize', ajusterPuisVerifier);
            panneau.on('destroy', function () {
                conteneur.un('resize', ajusterPuisVerifier);
            });
        }
    });
    Ext.EventManager.onWindowResize(ajusterPuisVerifier);
    panneau.on('destroy', function () {
        Ext.EventManager.removeResizeListener(ajusterPuisVerifier);
    });
    if (panneau.rendered) {
        ajusterPuisVerifier();
    }
};

/**
 * Ecrans concernes, par leur xtype.
 *
 * La liste est ici, en un seul endroit, plutot que dispersee dans chaque fichier de vue :
 * ajouter un ecran a la presentation "collee" tient alors en une ligne, et on voit d'un coup
 * d'oeil lesquels sont concernes. App.onLoadNewComponent la consulte a l'ouverture d'un menu.
 */
window.PrestigeAffichage.ECRANS_COLLES = [
    // facturation
    'facturemanager', 'facturesubrogatoireother', 'groupeInvoices', 'factureprovisoire',
    'recapOrganisme',
    // parametrage et administration
    'parametermanager', 'kobysky', 'zonegeographiquemanager', 'usermanager',
    // caisse
    'listecaissemanager', 'visualisercaissemanager', 'gestcaissemanager',
    'caisserecetterecap', 'cashmovements',
    // articles
    'famillemanager', 'produitsxx', 'articlevendumanager', 'articlevendurecapitulatif',
    'ugmanager', 'mouvementprixvente',
    // commandes et approvisionnement
    'reservesuggestionsgrid', 'i_sugg_manager', 'suggerercdemanager',
    'i_order_manager', 'ordermanagerlist',
    'bonlivraisonmanager', 'retourfrsmanager', 'retourfournisseurmanagerlist',
    'bonlivraisondetail',
    // stock
    'ajustementmanager', 'etatstock', 'inventaire', 'editinventaireManager',
    'monitoringproduct', 'suivientreevente', 'monitoringarticlecomplet',
    'detailsmanager', 'gestionsurstock', 'stockmort', 'saisieperime',
    'evolutionstock', 'famillestockcomparaisonmanager', 'peremptionquery',
    // tiers payants et clients
    'tierspayantmanager', 'clientmanager', 'analysetierspayant',
    // analyses
    'abcmanager', 'vingtquatrevingt', 'margeproducts', 'feuilledematch',
    'evaluationventemoyenne', 'cazonegeomanager',
    // ventes
    'ventemanager', 'venteannuler', 'venteavoirmanager', 'venteproduitannules',
    'suppressionsvente', 'delayed',
    // service client
    'ventesrateesmanager', 'modelemessagemanager',
    // gestion des fichiers
    'ventesmodifieesmanager',
    // etats et tableaux de bord
    'etatscontrolemanager', 'etatannuel', 'achatgrossistemensuel',
    'tableauPhama', 'tableauPhamaCarnet', 'statistiqueTVA',
    // divers
    'diffmanager','valorisationstock',
    // centre de support
    'supportcontact', 'supporttickets', 'supportdiagnostic',
    'supportsante', 'supporthistorique', 'supportmaintenance'
];

/**
 * Applique la presentation "collee" a un ecran s'il figure dans la liste ci-dessus.
 *
 * Appele par App.onLoadNewComponent APRES la creation de l'ecran et AVANT son ajout au
 * panneau central : header:false doit etre pose avant le rendu.
 *
 * @param {Ext.Component} ecran ecran qui vient d'etre cree
 */
window.PrestigeAffichage.appliquerSiConcerne = function (ecran) {
    'use strict';

    if (!ecran || !ecran.isXType) {
        return;
    }
    var concerne = Ext.Array.some(window.PrestigeAffichage.ECRANS_COLLES, function (xtype) {
        return ecran.isXType(xtype);
    });
    if (concerne) {
        window.PrestigeAffichage.collerAuConteneur(ecran);
    }
};

Ext.onReady(function () {
    'use strict';

    corrigerInfobulles();
    corrigerBoitesDeMessage();

    // ---------------------------------------------------------------------------------
    // 1) info-bulles
    // ---------------------------------------------------------------------------------
    function corrigerInfobulles() {
        if (!Ext.tip || !Ext.tip.QuickTipManager) {
            return;
        }
        // init() est idempotent : s'il a deja ete appele (Ext.app.Application le fait
        // via enableQuickTips), il ne recree pas l'info-bulle.
        Ext.tip.QuickTipManager.init();

        var infobulle = Ext.tip.QuickTipManager.getQuickTip();
        if (!infobulle || infobulle.correctifTexteTronque) {
            return;
        }
        infobulle.correctifTexteTronque = true;

        infobulle.showAt = Ext.Function.createSequence(infobulle.showAt, function () {
            var tip = this;
            // L'ajustement est repousse d'un tour de boucle : au tout premier
            // affichage, ExtJS vient de rendre l'info-bulle et sa mise en page n'est
            // appliquee qu'ensuite. Mesurer immediatement donnerait les dimensions de
            // l'etat intermediaire, et le correctif ne prendrait pas.
            // setWidth/setHeight rappellent la mise en page, jamais showAt : pas de
            // recursion possible. Le garde-fou couvre une eventuelle surcharge tierce.
            if (tip.ajustementEnCours) {
                return;
            }
            tip.ajustementEnCours = true;
            Ext.Function.defer(function () {
                try {
                    ajuster(tip);
                } finally {
                    tip.ajustementEnCours = false;
                }
            }, 1);
        });
    }

    // ---------------------------------------------------------------------------------
    // 2) boites de message
    // ---------------------------------------------------------------------------------
    function corrigerBoitesDeMessage() {
        var boite = Ext.MessageBox;
        if (!boite || !boite.on || boite.correctifTexteTronque) {
            return;
        }
        boite.correctifTexteTronque = true;
        boite.on('show', function () {
            var fenetre = this;
            // meme raison que pour les info-bulles : la mise en page n'est pas encore
            // appliquee au moment ou l'evenement est emis
            Ext.Function.defer(function () {
                agrandirSiTexteMasque(fenetre);
            }, 1);
        });
    }

    function agrandirSiTexteMasque(fenetre) {
        var manque = 0,
            elements = [],
            corps = fenetre.body && fenetre.body.dom;

        if (!fenetre.isVisible() || !corps) {
            return;
        }
        elements.push(corps);
        // .x-box-inner : conteneur de la mise en page en boite, hauteur en dur et
        // overflow:hidden, c'est lui qui coupe reellement le texte
        Ext.Array.each(corps.querySelectorAll('.x-box-inner'), function (n) {
            elements.push(n);
        });
        if (fenetre.msg && fenetre.msg.el) {
            elements.push(fenetre.msg.el.dom);
        }
        Ext.Array.each(elements, function (n) {
            manque = Math.max(manque, n.scrollHeight - n.clientHeight);
        });
        if (manque > 1) {
            fenetre.setHeight(fenetre.getHeight() + manque + 2);
            fenetre.center();
        }
    }

    function contenuMasque(corps) {
        return corps.scrollHeight > corps.clientHeight + 1
                || corps.scrollWidth > corps.clientWidth + 1;
    }

    function ajuster(tip) {
        var corps = tip.body && tip.body.dom,
            redimensionnee = false,
            largeurImposee,
            cadre,
            naturelle,
            manque;

        if (!corps || !tip.isVisible()) {
            return;
        }
        // ExtJS recalcule la largeur a chaque affichage (setWidth dans showAt) mais
        // pas la hauteur : une hauteur forcee par un passage precedent resterait
        // collee a l'info-bulle suivante. On la libere avant de mesurer.
        if (tip.hauteurForcee) {
            tip.hauteurForcee = false;
            tip.setHeight(null);
        }
        if (!contenuMasque(corps)) {
            return;
        }

        largeurImposee = tip.activeTarget && tip.activeTarget.width;
        if (!largeurImposee) {
            // largeur du texte s'il tenait sur une seule ligne
            corps.style.whiteSpace = 'nowrap';
            naturelle = corps.scrollWidth;
            corps.style.whiteSpace = '';
            cadre = tip.getWidth() - corps.clientWidth;
            // +2 px : marge de securite contre l'arrondi qui a cause le probleme
            if (naturelle + cadre + 2 <= tip.maxWidth) {
                tip.setWidth(naturelle + cadre + 2);
                redimensionnee = true;
            }
        }

        // texte volontairement long : il reste sur plusieurs lignes, on lui donne
        // la hauteur necessaire pour que toutes soient visibles
        manque = corps.scrollHeight - corps.clientHeight;
        if (manque > 1) {
            tip.setHeight(tip.getHeight() + manque);
            tip.hauteurForcee = true;
            redimensionnee = true;
        }

        if (redimensionnee && (tip.constrainPosition || tip.constrain)) {
            tip.doConstrain();
        }
    }
});
