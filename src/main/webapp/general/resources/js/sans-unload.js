/*
 * Retours du 10/10 : « [Violation] Permissions policy violation: unload is not allowed in this document ».
 * ExtJS (et d'anciennes bibliotheques) ecoutent l'evenement « unload » de la fenetre, que Chrome refuse desormais.
 * Charge AVANT ext-all.js : toute ecoute de « unload » posee sur la fenetre l'est sur « pagehide », qui se
 * declenche au meme moment (fermeture ou changement de page) et que le navigateur autorise. Le nettoyage d'ExtJS
 * a la sortie reste donc fait, sans le message.
 */
(function () {
    'use strict';
    var ajouter = window.addEventListener, retirer = window.removeEventListener;
    if (!ajouter || window.__sansUnload) {
        return;
    }
    window.__sansUnload = true;
    var evenement = function (type) {
        return type === 'unload' ? 'pagehide' : type;
    };
    window.addEventListener = function (type, ecouteur, options) {
        return ajouter.call(this, evenement(type), ecouteur, options);
    };
    window.removeEventListener = function (type, ecouteur, options) {
        return retirer.call(this, evenement(type), ecouteur, options);
    };
})();
