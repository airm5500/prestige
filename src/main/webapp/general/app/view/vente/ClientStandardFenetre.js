/* global Ext */

/*
 * MODIFIER LE CLIENT STANDARD depuis l'ecran de vente (retour du 30/09).
 *
 * Meme dessin que le suivi de consommation (classes vc-*) : pas de barre de titre ni de boutons ExtJS standard. Nom,
 * prenoms, telephone, date de naissance (saisie guidee jj/mm/aa) et genre. Entree passe au champ suivant ; la date
 * complete (ou laissee vide), Entree enregistre. Echap ferme sans rien changer.
 *
 * Le bouton qui l'ouvre n'est montre qu'aux operateurs qui ont le droit P_CLIENT_STANDARD_MAJ, et le serveur le
 * verifie encore a chaque appel. Elle ne depend pas du controleur de la caisse : le bouton lui passe le client et
 * recoit la fiche enregistree par {@code surEnregistre}.
 */
Ext.define('testextjs.view.vente.ClientStandardFenetre', {
    extend: 'Ext.window.Window',
    xtype: 'clientstandardfenetre',
    requires: ['testextjs.view.serviceclient.ordonnance.ChampDateNaissance'],
    cls: 'vc-fenetre',
    header: false,
    modal: true,
    resizable: false,
    draggable: false,
    closeAction: 'destroy',
    width: 520,
    bodyPadding: 0,
    layout: {type: 'vbox', align: 'stretch'},
    clientId: null,
    venteId: null,
    /** Appelee avec la fiche enregistree ({id, nom, prenoms, telephone, naissance, sexe}). */
    surEnregistre: null,

    statics: {
        /** Le droit n'est demande qu'une fois par page : il ne change qu'a la connexion suivante. */
        droit: null,

        /** Rend (par le rappel) true si l'operateur peut modifier un client standard. */
        peutModifier: function (rappel) {
            var me = this;
            if (me.droit !== null) {
                rappel(me.droit);
                return;
            }
            Ext.Ajax.request({
                method: 'GET',
                url: '../api/v1/vente-client-standard/droit',
                success: function (reponse) {
                    var r = Ext.decode(reponse.responseText, true) || {};
                    me.droit = r.modifier === true;
                    rappel(me.droit);
                },
                failure: function () {
                    rappel(false);
                }
            });
        }
    },

    initComponent: function () {
        var me = this;
        var champ = {labelWidth: 110, margin: '0 0 10 0', enableKeyEvents: true, labelSeparator: ''};
        me.items = [{
                xtype: 'component',
                html: '<div class="vc"><div class="vc-tete"><div><div class="vc-sur">Client standard</div>'
                        + '<div class="vc-nom">Modifier la fiche</div></div>'
                        + '<button type="button" class="vc-croix" data-action="fermer" aria-label="Fermer">&times;</button>'
                        + '</div></div>'
            }, {
                xtype: 'container',
                itemId: 'champs',
                padding: '14 18 4 18',
                layout: {type: 'vbox', align: 'stretch'},
                defaults: champ,
                items: [
                    {xtype: 'textfield', itemId: 'csNom', fieldLabel: 'Nom *', allowBlank: false, maxLength: 100},
                    {xtype: 'textfield', itemId: 'csPrenoms', fieldLabel: 'Prénom(s) *', allowBlank: false,
                        maxLength: 100},
                    {xtype: 'textfield', itemId: 'csTelephone', fieldLabel: 'Téléphone *', allowBlank: false,
                        maskRe: /[0-9 +.]/, maxLength: 30},
                    {xtype: 'champdatenaissance', itemId: 'csNaissance', fieldLabel: 'Né(e) le', width: 260},
                    {xtype: 'combobox', itemId: 'csSexe', fieldLabel: 'Genre', editable: false, queryMode: 'local',
                        width: 260, store: [['', '—'], ['F', 'Féminin'], ['M', 'Masculin']], value: ''},
                    {xtype: 'component', itemId: 'csMessage', cls: 'vc-message', html: ''}
                ]
            }, {
                xtype: 'component',
                html: '<div class="vc"><div class="vc-pied"><span>La fiche du client est modifiée pour toutes ses ventes.</span>'
                        + '<span><button type="button" class="vc-bouton vc-bouton-second" data-action="fermer">Annuler</button> '
                        + '<button type="button" class="vc-bouton" data-action="enregistrer">Enregistrer</button></span>'
                        + '</div></div>'
            }];
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.getEl().on('click', me.surClic, me, {delegate: '[data-action]'});
            me.cle = new Ext.util.KeyMap({target: Ext.getDoc(), key: Ext.EventObject.ESC, fn: me.close, scope: me});
            Ext.each(me.query('#champs field'), function (c) {
                c.on('specialkey', me.surEntree, me);
            });
            me.charger();
        });
        me.on('destroy', function () {
            if (me.cle) {
                me.cle.destroy();
            }
        });
    },

    surClic: function (e, cible) {
        e.preventDefault();
        if (cible.getAttribute('data-action') === 'enregistrer') {
            this.enregistrer();
        } else {
            this.close();
        }
    },

    /** Entree : Nom, Prenoms, Telephone, puis la date (jour, mois, annee) ; la date complete ou vide, on enregistre. */
    surEntree: function (champ, e) {
        if (e.getKey() !== e.ENTER || champ.isXType('combobox')) {
            return;
        }
        e.stopEvent();
        var suivant = {csNom: 'csPrenoms', csPrenoms: 'csTelephone', csTelephone: 'csNaissance'}[champ.getItemId()];
        if (suivant) {
            this.down('#' + suivant).focus(false, 30);
            return;
        }
        if (champ.getItemId() === 'csNaissance' && !champ.avancer()) {
            return;
        }
        this.enregistrer();
    },

    dire: function (texte, erreur) {
        var m = this.down('#csMessage');
        m.update(texte ? '<span class="' + (erreur ? 'vc-erreur' : '') + '">' + Ext.String.htmlEncode(texte) + '</span>'
                : '');
    },

    charger: function () {
        var me = this;
        me.dire('Chargement de la fiche…');
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/vente-client-standard/' + encodeURIComponent(me.clientId || '-'),
            success: function (reponse) {
                if (me.isDestroyed) {
                    return;
                }
                var r = Ext.decode(reponse.responseText, true) || {};
                if (r.success !== true) {
                    me.dire(r.message || 'La fiche n\'a pas pu être lue.', true);
                    me.down('#champs').setDisabled(true);
                    return;
                }
                me.poser(r.client);
                me.dire('');
                me.down('#csNom').focus(true, 60);
            },
            failure: function () {
                if (!me.isDestroyed) {
                    me.dire('La fiche n\'a pas pu être lue.', true);
                }
            }
        });
    },

    poser: function (c) {
        this.down('#csNom').setValue(c.nom || '');
        this.down('#csPrenoms').setValue(c.prenoms || '');
        this.down('#csTelephone').setValue(c.telephone || '');
        this.down('#csNaissance').setIso(c.naissance || '');
        this.down('#csSexe').setValue(c.sexe || '');
    },

    enregistrer: function () {
        var me = this;
        if (me.enCours || me.down('#champs').isDisabled()) {
            return;
        }
        var valide = true;
        Ext.each(['#csNom', '#csPrenoms', '#csTelephone', '#csNaissance'], function (s) {
            valide = me.down(s).validate() && valide;
        });
        if (!valide) {
            var naissance = me.down('#csNaissance');
            me.dire(naissance.isValid() ? 'Le nom, les prénoms et le téléphone sont obligatoires.'
                    : 'Date de naissance : ' + naissance.getErrors().join(' '), true);
            return;
        }
        me.enCours = true;
        me.dire('Enregistrement…');
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/vente-client-standard/' + encodeURIComponent(me.clientId)
                    + (me.venteId ? '?venteId=' + encodeURIComponent(me.venteId) : ''),
            jsonData: {
                nom: Ext.String.trim(me.down('#csNom').getValue() || ''),
                prenoms: Ext.String.trim(me.down('#csPrenoms').getValue() || ''),
                telephone: Ext.String.trim(me.down('#csTelephone').getValue() || ''),
                naissance: me.down('#csNaissance').getIso(),
                sexe: me.down('#csSexe').getValue() || ''
            },
            success: function (reponse) {
                me.enCours = false;
                if (me.isDestroyed) {
                    return;
                }
                var r = Ext.decode(reponse.responseText, true) || {};
                if (r.success !== true) {
                    me.dire(r.message || 'Le client n\'a pas pu être modifié.', true);
                    return;
                }
                if (Ext.isFunction(me.surEnregistre)) {
                    me.surEnregistre(r.client);
                }
                me.close();
            },
            failure: function () {
                me.enCours = false;
                if (!me.isDestroyed) {
                    me.dire('Le client n\'a pas pu être modifié.', true);
                }
            }
        });
    }
});
