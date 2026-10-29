/* global Ext */

/*
 * SCRIPTS DES ECRANS EN UN SEUL APPEL (rapport docs/notices/RAPPORT_CHARGE_2026-10-29.md, § 4.6).
 *
 * A la connexion, Ext.Loader charge pres de 1 000 fichiers de general/app, un par un et en chaine de dependances :
 * plus de 60 s quand 15 postes se connectent ensemble. index.jsp charge d'abord api/v1/ecrans/scripts.js, qui pose
 * le texte de tous ces fichiers dans window.PRESTIGE_SCRIPTS (chemin -> texte). Ce script branche Ext.Loader sur
 * cette table : un fichier present s'execute depuis la memoire, au lieu d'une balise <script>.
 *
 * Ce qui ne change pas :
 *  - l'ordre et les dependances : c'est toujours Ext.Loader qui demande chaque fichier, au meme moment ;
 *  - un fichier absent de la table (table non recue, fichier ajoute depuis) part par le reseau comme avant ;
 *  - le fichier s'execute dans la portee globale, comme une balise <script> (ses « var » restent globales), et une
 *    erreur dans un fichier est signalee sans bloquer la suite, comme pour une balise ;
 *  - le chargement reste asynchrone (tache differee, jamais avant que la page soit construite), et le chargement
 *    synchrone d'Ext (syncRequire) reste synchrone.
 * Les outils de developpement affichent chaque fichier sous son chemin (sourceURL).
 */
(function () {
    var table = window.PRESTIGE_SCRIPTS;
    if (!table || typeof Ext === 'undefined' || !Ext.Loader || !Ext.Loader.loadScriptFile) {
        return;
    }
    var Loader = Ext.Loader,
        origine = Loader.loadScriptFile,
        attente = {},
        lien = document.createElement('a'),
        differer = typeof Promise !== 'undefined'
            ? function (f) { Promise.resolve().then(f); }
            : function (f) { setTimeout(f, 0); },
        avantPage = [];

    /* Par le reseau, un fichier arrivait toujours apres la construction de la page ; certains la mesurent des leur
       execution (Ext.getBody()). Tant que la page se construit, les fichiers attendent donc qu'elle soit prete. */
    function plusTard(f) {
        if (document.readyState !== 'loading') {
            differer(f);
            return;
        }
        if (!avantPage.length) {
            document.addEventListener('DOMContentLoaded', function () {
                var l = avantPage;
                avantPage = [];
                for (var i = 0; i < l.length; i++) {
                    differer(l[i]);
                }
            });
        }
        avantPage.push(f);
    }

    /* chemin absolu sans parametre, comme les cles de la table */
    function cle(url) {
        lien.href = url;
        var p = lien.pathname;
        try {
            p = decodeURIComponent(p);
        } catch (e) {
            /* chemin mal encode : garde tel quel */
        }
        return p.charAt(0) === '/' ? p : '/' + p;
    }

    function executer(url, k) {
        var code = table[k];
        delete table[k];
        try {
            (0, eval)(code + '\n//# sourceURL=' + url);
        } catch (e) {
            /* comme une balise <script> : l'erreur est signalee, le chargement continue */
            setTimeout(function () { throw e; }, 0);
        }
    }

    Loader.loadScriptFile = function (url, onLoad, onError, scope, synchronous) {
        var k = cle(url);
        if (!Object.prototype.hasOwnProperty.call(table, k)) {
            return origine.apply(this, arguments);
        }
        scope = scope || Loader;
        Loader.isLoading = true;
        if (synchronous) {
            /* Ext a deja annule le chargement asynchrone en cours de ce fichier : son rappel ne doit plus partir */
            delete attente[k];
            executer(url, k);
            onLoad.call(scope);
            return Loader;
        }
        if (attente[k]) {
            /* deux classes du meme fichier demandees ensemble : un seul passage, les deux rappels */
            attente[k].push([onLoad, scope]);
            return Loader;
        }
        attente[k] = [[onLoad, scope]];
        plusTard(function () {
            var rappels = attente[k];
            if (!rappels) {
                return;
            }
            delete attente[k];
            executer(url, k);
            for (var i = 0; i < rappels.length; i++) {
                rappels[i][0].call(rappels[i][1]);
            }
        });
        return Loader;
    };
}());
