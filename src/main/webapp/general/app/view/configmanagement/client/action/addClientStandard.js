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

        // Entree valide la saisie depuis n'importe lequel des trois champs.
        Ext.Array.each(['nom', 'prenoms', 'telephone'], function (id) {
            var champ = me.down('#' + id);
            if (champ) {
                champ.on('keypress', function (c, e) {
                    if (e.getKey() === e.ENTER) {
                        me.enregistrer();
                    }
                });
            }
        });

        me.show();
        Ext.defer(function () {
            var n = me.down('#nom');
            if (n) { n.focus(true, 50); }
        }, 80);
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
