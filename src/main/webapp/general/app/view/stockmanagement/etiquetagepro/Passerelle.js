/* global Ext, testextjs */
/*
 * Passerelle des anciens boutons d'impression d'etiquettes vers Etiquettage Pro (retours du 11/10) : « tout le monde
 * passe par Etiquettage Pro ; si aucune donnee, on imprime comme l'existant directement pour ne pas casser un processus
 * qui fonctionne ».
 *
 * imprimer(preset, repli) :
 *  - preset : {source: 'PANIER' | 'LIGNE' | 'BL', id, position, code, modele} - les choix faits sur l'ancien ecran ;
 *  - Etiquettage Pro est interroge (resume de l'impression) : s'il a des etiquettes a imprimer pour cette source, son
 *    apercu « Impression Prestige » s'ouvre avec ces choix deja poses, et l'impression se fait depuis l'apercu ;
 *  - sinon (aucune etiquette, droit Etiquettage Pro absent, erreur, serveur muet) : repli() - l'impression historique,
 *    sans changement.
 * Rend true si l'apercu s'ouvre (l'appelant ne fait alors pas sa suite habituelle), false si le repli a ete pris.
 */
Ext.define('testextjs.view.stockmanagement.etiquetagepro.Passerelle', {
    singleton: true,

    imprimer: function (preset, repli) {
        var me = this, o = null;
        /*
         * Appel SYNCHRONE, volontairement : le repli ouvre le PDF dans un nouvel onglet (window.open), ce que le
         * navigateur n'autorise que pendant le clic de l'utilisateur ; apres un appel asynchrone, l'onglet serait
         * bloque et l'impression historique perdue.
         */
        try {
            Ext.Ajax.request({
                url: '../api/v1/etiquetage-pro/impression/resume', method: 'POST', async: false, timeout: 20000,
                jsonData: {source: preset.source, id: preset.id || '', parProduit: true, code: preset.code || 'CODE128'},
                success: function (r) {
                    o = Ext.JSON.decode(r.responseText, true);
                }
            });
        } catch (e) {
            o = null;
        }
        if (o && o.success && o.total > 0) {
            try {
                me.ouvrirApercu(preset);
                return true;
            } catch (e) {
                // Etiquettage Pro indisponible : impression historique
            }
        }
        repli();
        return false;
    },

    /** Ouvre Etiquettage Pro sur l'apercu « Impression Prestige », choix de l'ancien ecran deja poses. */
    ouvrirApercu: function (preset) {
        Ext.each(Ext.ComponentQuery.query('window'), function (w) {
            if (w.isVisible() && !w.isXType('messagebox')) {
                w.close();
            }
        });
        testextjs.app.getController('App').onLoadNewComponent('etiquetagepro', 'Étiquetage Pro', '');
        var ecran = Ext.ComponentQuery.query('etiquetagepro')[0];
        if (!ecran) {
            throw new Error('Étiquetage Pro indisponible');
        }
        var ouvrir = function () {
            ecran.ouvrirOutil(7, preset);
        };
        if (ecran.rendered) {
            Ext.defer(ouvrir, 1);
        } else {
            ecran.on('afterrender', function () {
                Ext.defer(ouvrir, 1);
            }, null, {single: true});
        }
    }
});
