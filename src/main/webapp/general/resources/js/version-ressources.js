/* global Ext */
/*
 * SCRIPTS A JOUR APRES UN DEPLOIEMENT (retour du 03/11).
 *
 * index.jsp pose le jeton du deploiement (window.PRESTIGE_VERSION_RESSOURCES) et l'ajoute a l'adresse de ses scripts.
 * Ce fichier fait de meme pour les fichiers qu'Ext.Loader va chercher par le reseau (ceux qui ne sont pas dans le
 * paquet api/v1/ecrans/scripts.js) : ?v=<jeton>. A chaque deploiement l'adresse change et le navigateur relit le
 * fichier ; entre deux deploiements, il le garde 24 h comme avant.
 * A charger juste apres ext-all.js, avant scripts-groupes.js (qui passe par cette fonction pour les fichiers absents
 * du paquet).
 */
(function () {
    var jeton = window.PRESTIGE_VERSION_RESSOURCES;
    if (!jeton || typeof Ext === 'undefined' || !Ext.Loader || !Ext.Loader.loadScriptFile) {
        return;
    }
    var Loader = Ext.Loader, origine = Loader.loadScriptFile;
    Loader.loadScriptFile = function (url) {
        var a = Array.prototype.slice.call(arguments);
        /* deja charge sous son adresse d'origine : Ext.Loader s'arrete la, comme avant */
        if (typeof url === 'string' && !/[?&]v=/.test(url) && !(Loader.isFileLoaded && Loader.isFileLoaded[url])) {
            a[0] = url + (url.indexOf('?') < 0 ? '?' : '&') + 'v=' + encodeURIComponent(jeton);
        }
        return origine.apply(this, a);
    };
})();
