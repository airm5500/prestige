/* global Ext */
/*
 * Generateur de code CIP interne, partage par la fiche article complete et la fiche simplifiee
 * ouverte depuis une commande.
 *
 * Le bouton « + » demande au serveur un code de sept chiffres qu'aucun article ne porte, actif ou
 * desactive : prefixe parametre (999 par defaut) puis chiffres tires au hasard. Le bouton se
 * desactive le temps de la demande pour qu'un double clic ne lance pas deux demandes, et se
 * reactive quoi qu'il arrive. En cas d'echec le message du serveur est montre, le champ n'est pas
 * touche et l'utilisateur peut reessayer.
 */
(function () {
    'use strict';

    window.PrestigeCodeCip = {
        /**
         * @param {Ext.button.Button} bouton  le « + » clique
         * @param {Ext.form.field.Text} champ  le champ CIP a remplir
         * @param {Ext.form.field.Text} suivant  le champ a prendre ensuite (designation), facultatif
         */
        generer: function (bouton, champ, suivant) {
            /* Une demande a la fois : le bouton desactive ne repart pas, meme si le gestionnaire est
             * rappele autrement que par un clic (touche, appel programme). */
            if (!champ || champ.isDisabled() || bouton.isDisabled()) {
                return;
            }
            bouton.disable();
            Ext.Ajax.request({
                method: 'GET',
                url: '../api/v1/referentiel-article/code-cip',
                success: function (reponse) {
                    bouton.enable();
                    var lu = Ext.JSON.decode(reponse.responseText, true);
                    if (lu && lu.success && lu.codeCip) {
                        champ.setValue(lu.codeCip);
                        if (suivant && suivant.focus) {
                            suivant.focus(true, 50);
                        }
                        return;
                    }
                    Ext.Msg.alert('Code CIP', (lu && lu.msg) || 'La génération du code a échoué, réessayez.');
                },
                failure: function (reponse) {
                    bouton.enable();
                    Ext.Msg.alert('Code CIP', 'Le serveur n\'a pas répondu (' + reponse.status + '), réessayez.');
                }
            });
        }
    };
}());
