/*
 * Capture des erreurs JavaScript du navigateur, vers le Centre de Support.
 *
 * POURQUOI
 * Les exceptions du serveur sont deja captees (SupportExceptionMapper) et arrivent dans le journal
 * des evenements. Celles du NAVIGATEUR, elles, ne laissaient aucune trace : quand un ecran ExtJS
 * plante chez une caissiere, le Centre de Support n'en sait rien et l'officine telephone. Le point
 * d'entree pour les recevoir existait pourtant deja cote serveur (POST /api/v1/support/events),
 * simplement aucun script ne l'appelait.
 *
 * CE QUI EST CAPTE
 *   1. window.onerror                  : erreurs de script non rattrapees ;
 *   2. evenement 'unhandledrejection'  : promesses rejetees sans .catch().
 *
 * CE QUI N'EST PAS CAPTE, VOLONTAIREMENT
 * Les erreurs HTTP renvoyees par l'API : elles sont deja journalisees cote serveur, avec leur pile
 * complete. Les capter ici creerait un doublon pour chaque incident.
 *
 * ANTI-INONDATION
 * Une boucle de rendu fautive peut lever des milliers d'erreurs par minute. Trois garde-fous :
 *   - une meme signature (message + fichier + ligne) n'est envoyee QU'UNE FOIS par session ;
 *   - au plus MAX_PAR_SESSION envois au total, ensuite le script se tait definitivement ;
 *   - aucune erreur survenue PENDANT un envoi n'est rapportee (pas de recursion).
 * Le serveur deduplique de son cote par signature : les repetitions incrementent le compteur
 * d'occurrences d'un evenement existant au lieu d'en creer un nouveau.
 *
 * REGLE ABSOLUE
 * Ce script ne doit jamais casser l'application qu'il surveille : tout est sous try/catch, et il
 * ne remplace jamais un gestionnaire d'erreur deja en place (il s'enchaine au precedent).
 */
(function () {
    'use strict';

    var URL_COLLECTE = '../api/v1/support/events';
    var MAX_PAR_SESSION = 20;
    var LONGUEUR_MAX_PILE = 8000;

    var signaturesVues = {};
    var envois = 0;
    var envoiEnCours = false;

    /**
     * Ecran actuellement affiche, pour situer l'erreur. Best effort : si ExtJS n'est pas encore
     * charge (erreur tres precoce) ou si la requete echoue, on rend une chaine vide plutot que
     * de risquer une seconde erreur.
     */
    function ecranCourant() {
        try {
            if (!window.Ext || !Ext.ComponentQuery) {
                return '';
            }
            var panneaux = Ext.ComponentQuery.query('panel[title]');
            for (var i = panneaux.length - 1; i >= 0; i--) {
                var p = panneaux[i];
                if (p && p.title && p.isVisible && p.isVisible(true)) {
                    return String(p.title);
                }
            }
        } catch (e) {
            // volontairement ignore : situer l'ecran ne doit jamais empecher la remontee
        }
        return '';
    }

    function tronquer(valeur, taille) {
        var texte = (valeur === null || valeur === undefined) ? '' : String(valeur);
        return texte.length > taille ? texte.substring(0, taille) : texte;
    }

    /**
     * Envoi en XMLHttpRequest et non via Ext.Ajax : une erreur peut survenir AVANT qu'ExtJS soit
     * charge, et le rapport doit alors partir quand meme.
     */
    function envoyer(evenement) {
        try {
            var xhr = new XMLHttpRequest();
            xhr.open('POST', URL_COLLECTE, true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(evenement));
        } catch (e) {
            // Le support est injoignable (hors ligne, session expiree) : on abandonne en silence.
        }
    }

    /**
     * @param {String} message  message d'erreur
     * @param {String} fichier  fichier source
     * @param {Number} ligne    numero de ligne
     * @param {String} pile     pile d'appels si disponible
     * @param {String} nature   'erreur' ou 'promesse'
     */
    function rapporter(message, fichier, ligne, pile, nature) {
        if (envoiEnCours || envois >= MAX_PAR_SESSION) {
            return;
        }
        var texte = tronquer(message, 400);
        if (!texte) {
            return;
        }
        var signature = texte + '|' + tronquer(fichier, 200) + '|' + ligne;
        if (signaturesVues[signature]) {
            return;
        }

        envoiEnCours = true;
        try {
            signaturesVues[signature] = true;
            envois++;

            var ecran = ecranCourant();
            var contexte = 'Erreur survenue dans le navigateur de l\'utilisateur.\n'
                    + 'Nature    : ' + (nature === 'promesse' ? 'promesse rejetee sans traitement' : 'erreur de script') + '\n'
                    + 'Ecran     : ' + (ecran || '(non determine)') + '\n'
                    + 'Fichier   : ' + tronquer(fichier, 300) + (ligne ? ' (ligne ' + ligne + ')' : '') + '\n'
                    + 'Page      : ' + tronquer(window.location ? window.location.href : '', 300) + '\n'
                    + 'Navigateur: ' + tronquer(navigator ? navigator.userAgent : '', 300);

            envoyer({
                type: 'JS',
                niveau: 'ERROR',
                module: ecran ? tronquer(ecran, 100) : 'IHM',
                messageCourt: tronquer('Erreur navigateur : ' + texte, 500),
                urlOuEcran: tronquer(ecran || (window.location ? window.location.pathname : ''), 255),
                payloadJson: tronquer(contexte, 4000),
                stack: tronquer(contexte + '\n\n=== Pile ===\n' + (pile || '(pile non disponible)'), LONGUEUR_MAX_PILE)
            });
        } catch (e) {
            // On ne rapporte jamais une erreur du rapporteur lui-meme.
        } finally {
            envoiEnCours = false;
        }
    }

    // 1) Erreurs de script non rattrapees. On CHAINE le gestionnaire precedent au lieu de
    //    l'ecraser : un autre script peut en avoir installe un, il doit continuer a fonctionner.
    var precedent = window.onerror;
    window.onerror = function (message, fichier, ligne, colonne, erreur) {
        try {
            rapporter(message, fichier, ligne, erreur && erreur.stack, 'erreur');
        } catch (e) {
            // ignore
        }
        if (typeof precedent === 'function') {
            try {
                return precedent.apply(this, arguments);
            } catch (e) {
                return false;
            }
        }
        // false : le navigateur conserve son comportement normal (trace en console).
        return false;
    };

    // 2) Promesses rejetees sans .catch() : invisibles de window.onerror.
    if (window.addEventListener) {
        window.addEventListener('unhandledrejection', function (evenement) {
            try {
                var raison = evenement ? evenement.reason : null;
                var message = raison && raison.message ? raison.message : String(raison);
                rapporter(message, '', 0, raison && raison.stack, 'promesse');
            } catch (e) {
                // ignore
            }
        });
    }
}());
