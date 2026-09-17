/* global Ext, testextjs */

/**
 * Creation d'un client standard (evolution 5, point 3) : nom, prenoms et numero de telephone, rien d'autre.
 *
 * Le formulaire complet (addClientLast) reste disponible par le bouton « Creer » et n'est pas modifie : celui-ci
 * s'ajoute a cote pour le cas courant du comptoir, ou l'on n'a que ces trois informations.
 *
 * Le numero est le seul identifiant d'un client standard : il est donc obligatoire, controle, et unique. Un numero
 * deja porte est refuse par le serveur en nommant le client qui le detient, de sorte que l'operateur retrouve la
 * fiche existante au lieu d'en creer une seconde.
 *
 * Retour du 17/09 : la touche Entree ENCHAINE les champs - nom, puis prenoms, puis numero, puis le bouton
 * Enregistrer - au lieu de valider depuis n'importe lequel. Au comptoir, on saisit les trois informations d'affilee
 * sans quitter le clavier ; valider des le premier champ obligeait a reprendre la souris pour les deux autres, et
 * declenchait un controle de validite sur un formulaire a peine commence.
 *
 * L'ecran porte de plus la classe vp-focus-zone, celle de l'ecran de vente : le champ ou l'on saisit bat
 * doucement, et le bouton Enregistrer prend le meme battement quand le focus l'atteint. C'est le signal demande
 * (« je veux l'animation comme les champs de saisie de la vente »), et il est ici utile : il dit ou l'on en est
 * dans l'enchainement sans avoir a chercher le curseur.
 */
Ext.define('testextjs.view.configmanagement.client.action.addClientStandard', {
    extend: 'Ext.window.Window',
    xtype: 'addclientstandard',
    itemId: 'addClientStandard',
    title: 'Nouveau client standard',
    modal: true,
    closable: true,
    closeAction: 'destroy',
    width: 460,
    bodyPadding: 10,
    layout: 'anchor',
    /* Meme signal que l'ecran de vente : le champ actif bat. La classe est posee sur la fenetre, qui est la
     * racine de cet ecran ; la feuille de style fait le reste (cf. vente-theme.css, « vp-focus-beat »). */
    cls: 'vp-focus-zone',

    config: {
        parentview: null
    },

    initComponent: function () {
        var me = this;

        Ext.apply(me, {
            defaults: { anchor: '100%' },
            items: [{
                    xtype: 'form',
                    itemId: 'formulaire',
                    border: false,
                    fieldDefaults: { labelWidth: 95, msgTarget: 'side' },
                    items: [{
                            xtype: 'textfield',
                            fieldLabel: 'Nom',
                            itemId: 'nom',
                            name: 'str_FIRST_NAME',
                            allowBlank: false,
                            blankText: 'Le nom est obligatoire.',
                            enableKeyEvents: true
                        }, {
                            xtype: 'textfield',
                            fieldLabel: 'Prénoms',
                            itemId: 'prenoms',
                            name: 'str_LAST_NAME',
                            allowBlank: false,
                            blankText: 'Les prénoms sont obligatoires.',
                            enableKeyEvents: true
                        }, {
                            xtype: 'textfield',
                            fieldLabel: 'Téléphone',
                            itemId: 'telephone',
                            name: 'str_TELEPHONE',
                            allowBlank: false,
                            emptyText: '07 08 47 37 50',
                            // Controle d'abord a l'ecran, puis refait par le serveur qui est seul a
                            // pouvoir garantir l'unicite. Les separateurs sont acceptes a la saisie.
                            // [157] et non [1570] : un numero commencant par 02 n'existe pas, et la
                            // classe fautive l'acceptait. Le serveur le refusait bien, mais l'ecran
                            // laissait l'operateur envoyer une saisie vouee a l'echec.
                            regex: /^(\+?225|00225)?[\s.\-()]*0[157]([\s.\-()]*[0-9]){8}[\s.\-()]*$/,
                            regexText: 'Numéro ivoirien attendu : dix chiffres commençant par 01, 05 ou 07.',
                            enableKeyEvents: true
                        }, {
                            // Toujours rendue, vide par defaut : basculer sa visibilite avant son rendu
                            // levait une erreur JavaScript, et une zone vide ne gene pas la mise en page.
                            xtype: 'component',
                            itemId: 'messageErreur',
                            cls: 'client-standard-erreur',
                            style: 'color:#c0392b;padding:6px 0 0 100px;font-size:11px;min-height:14px',
                            html: ''
                        }]
                }],
            buttons: [{
                    text: 'Enregistrer',
                    itemId: 'enregistrer',
                    iconCls: 'addicon',
                    handler: function () {
                        me.enregistrer();
                    }
                }, {
                    text: 'Annuler',
                    itemId: 'annuler',
                    iconCls: 'cancelicon',
                    handler: function () {
                        me.close();
                    }
                }]
        });

        me.callParent(arguments);
        me.enchainerLesChamps();

        me.show();
        Ext.defer(function () {
            var n = me.down('#nom');
            if (n) { n.focus(true, 50); }
        }, 80);
    },

    /**
     * Entree passe au champ suivant, et du dernier champ au bouton Enregistrer.
     *
     * Ordre demande par l'officine : nom, prenoms, numero, bouton. Le bouton est la DERNIERE etape et non un
     * raccourci : arrive la, l'operateur voit le battement, relit sa saisie s'il veut, et valide d'une seconde
     * frappe d'Entree. Rien ne s'enregistre a l'insu de personne.
     *
     * Le bouton porte le battement (vp-bouton-pret) tant qu'il a le focus, et le perd des qu'on revient dans un
     * champ : deux battements en meme temps ne diraient plus ou l'on en est.
     */
    enchainerLesChamps: function () {
        var me = this;
        var suite = ['nom', 'prenoms', 'telephone'];

        Ext.Array.each(suite, function (id, i) {
            var champ = me.down('#' + id);
            if (!champ) { return; }
            champ.on('focus', function () { me.marquerBoutonPret(false); });
            champ.on('keypress', function (c, e) {
                if (e.getKey() !== e.ENTER) { return; }
                // On empeche la validation implicite du formulaire par le navigateur : c'est nous qui
                // decidons de la suite.
                e.stopEvent();
                var suivant = i + 1 < suite.length ? me.down('#' + suite[i + 1]) : null;
                if (suivant) {
                    suivant.focus(true, 10);
                } else {
                    me.donnerLeFocusAuBouton();
                }
            });
        });

        var bouton = me.down('#enregistrer');
        if (!bouton) { return; }
        bouton.on('afterrender', function () {
            /*
             * Un bouton ExtJS 4.2 n'ecoute PAS Entree de lui-meme : il ne pose un raccourci clavier que
             * lorsqu'il porte un menu (Ext.button.Button.onRender). Rendu en <a> sans href, il ne recoit pas
             * non plus l'activation clavier du navigateur. On l'ecoute donc explicitement - Entree et Espace,
             * les deux touches qu'on essaie naturellement sur un bouton qui a le focus.
             */
            bouton.el.on('keydown', function (e) {
                if (e.getKey() === e.ENTER || e.getKey() === e.SPACE) {
                    e.stopEvent();
                    me.enregistrer();
                }
            });
            bouton.el.on('blur', function () { me.marquerBoutonPret(false); });
        });
    },

    donnerLeFocusAuBouton: function () {
        var bouton = this.down('#enregistrer');
        if (!bouton || bouton.isDestroyed) { return; }
        bouton.focus();
        this.marquerBoutonPret(true);
    },

    /** Battement du bouton, emprunte a l'ecran de vente : il dit que la derniere etape est atteinte. */
    marquerBoutonPret: function (pret) {
        var bouton = this.down('#enregistrer');
        if (!bouton || bouton.isDestroyed || !bouton.rendered) { return; }
        if (pret) {
            bouton.addCls('vp-bouton-pret');
        } else {
            bouton.removeCls('vp-bouton-pret');
        }
    },

    afficherErreur: function (texte) {
        var zone = this.down('#messageErreur');
        if (!zone) { return; }
        // update() plutot que el.dom : il fonctionne aussi avant le rendu du composant.
        zone.update(Ext.String.htmlEncode(texte || ''));
    },

    enregistrer: function () {
        var me = this;
        var formulaire = me.down('#formulaire').getForm();
        me.afficherErreur('');
        if (!formulaire.isValid()) {
            return;
        }
        var bouton = me.down('#enregistrer');
        bouton.setDisabled(true);

        Ext.Ajax.request({
            url: '../api/v1/client/gestion/create-standard',
            method: 'POST',
            params: formulaire.getValues(),
            callback: function () {
                // La reussite ferme la fenetre AVANT ce rappel : sans ce garde-fou, on reactiverait
                // un bouton deja detruit, ce qui leve une erreur JavaScript a chaque creation.
                if (!me.isDestroyed && !bouton.isDestroyed) {
                    bouton.setDisabled(false);
                }
            },
            success: function (reponse) {
                var resultat = Ext.decode(reponse.responseText, true) || {};
                if (!resultat.success) {
                    // L'erreur est affichee DANS la fenetre, a cote du champ fautif : l'operateur
                    // corrige sans avoir a refermer une boite de dialogue ni a resaisir le reste.
                    me.afficherErreur(resultat.errors || 'La création du client n\'a pas abouti.');
                    var champ = me.down('#' + (resultat.champ === 'str_TELEPHONE' ? 'telephone' : 'nom'));
                    if (champ) { champ.focus(true, 50); }
                    return;
                }
                if (me.parentview && me.parentview.getStore) {
                    me.parentview.getStore().reload();
                }
                me.close();
                // Aucune boite de dialogue apres une creation reussie : au comptoir, une fenetre de
                // plus a refermer coute un geste pour une information que la liste donne deja. Le
                // client cree apparait dans la grille rechargee juste au-dessus.
            },
            failure: function () {
                me.afficherErreur('Le serveur n\'a pas répondu. Réessayez ou vérifiez les journaux.');
            }
        });
    }
});
