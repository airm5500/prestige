/* global Ext */

/*
 * En-tête des factures (plan du 14/11, point 2) : images d'en-tête et de pied de page de la pharmacie (scan du papier
 * à en-tête), imprimées sur chaque page des factures à la place des leurs. Sans image, les factures ne changent pas.
 * Aucune fenêtre : le retrait se confirme dans le bouton lui-même.
 */
var url_rest_entete_facture = '../api/v1/entete-facture/';

Ext.define('testextjs.view.facturation.EnteteFacture', {
    extend: 'Ext.panel.Panel',
    xtype: 'entetefacture',
    frame: true,
    title: 'En-t&ecirc;te et pied de page des factures',
    autoScroll: true,
    width: '90%',
    cls: 'custompanel',
    bodyPadding: 10,
    layout: {type: 'vbox', align: 'stretch'},

    initComponent: function () {
        var me = this;
        me.items = [{
                xtype: 'component', itemId: 'aide', margin: '0 0 10 0',
                html: '<div style="color:#555;line-height:1.5">Chargez le scan de votre papier à en-tête : '
                        + 'l\'image est posée en haut (ou en bas) de chaque page des factures, à la place de l\'en-tête '
                        + '(ou du pied) d\'origine, réduite sans déformation pour tenir dans la hauteur choisie. '
                        + 'Les montants et les lignes de la facture ne changent pas. Sans image, la facture reste telle quelle.</div>'
            }, {
                xtype: 'container', layout: {type: 'hbox', align: 'stretch'},
                items: [me.panneau('ENTETE', 'En-tête (haut de page)'), {xtype: 'component', width: 14},
                    me.panneau('PIED', 'Pied de page (bas de page)')]
            }, {
                xtype: 'container', layout: 'hbox', margin: '10 0 0 0',
                items: [{xtype: 'button', itemId: 'apercu', text: 'Aperçu sur une page d\'essai (PDF)', iconCls: 'printable',
                        handler: function () {
                            window.open(url_rest_entete_facture + 'apercu?_dc=' + Date.now());
                        }},
                    {xtype: 'tbtext', itemId: 'droit', margin: '4 0 0 10', text: ''}]
            }];
        me.callParent(arguments);
        me.on('afterrender', me.charger, me);
    },

    /** Panneau d'une partie (ENTETE ou PIED) ; ses composants portent un itemId suffixé par la partie. */
    panneau: function (partie, titre) {
        var me = this;
        return {
            xtype: 'panel', flex: 1, itemId: 'panneau' + partie, title: titre, bodyPadding: '8 10',
            layout: {type: 'vbox', align: 'stretch'}, defaults: {margin: '0 0 6 0'},
            items: [
                {xtype: 'filefield', itemId: 'fichier' + partie, fieldLabel: 'Image', labelWidth: 70, buttonText: 'Choisir…',
                    emptyText: 'PNG ou JPEG, 1 Mo au plus'},
                {xtype: 'container', layout: 'hbox', items: [
                        {xtype: 'numberfield', itemId: 'hauteur' + partie, fieldLabel: 'Hauteur', labelWidth: 70, width: 160,
                            allowDecimals: false, step: 5},
                        {xtype: 'tbtext', itemId: 'bornes' + partie, text: 'mm', margin: '4 0 0 6'}]},
                {xtype: 'container', layout: 'hbox', defaults: {margin: '0 6 0 0'}, items: [
                        {xtype: 'button', itemId: 'enregistrer' + partie, text: 'Enregistrer', handler: function () {
                                me.enregistrer(partie);
                            }},
                        {xtype: 'button', itemId: 'retirer' + partie, text: 'Retirer l\'image', handler: function (b) {
                                me.retirer(partie, b);
                            }},
                        {xtype: 'tbtext', itemId: 'etat' + partie, text: '', margin: '4 0 0 6'}]},
                {xtype: 'component', itemId: 'apercu' + partie, minHeight: 90,
                    style: 'border:1px dashed #b8c2cc;border-radius:6px;padding:8px;background:#fff', html: ''}
            ]
        };
    },

    charger: function () {
        var me = this;
        Ext.Ajax.request({
            url: url_rest_entete_facture + 'info', method: 'GET',
            success: function (response) {
                me.info = Ext.JSON.decode(response.responseText, true) || {};
                me.afficher('ENTETE');
                me.afficher('PIED');
                me.down('#droit').setText(me.info.peutModifier === false
                        ? '<span style="color:#b9770e">Consultation seule : la modification demande le droit « En-tête des factures ».</span>' : '');
            }
        });
    },

    afficher: function (partie) {
        var me = this, info = me.info || {}, b = info.bornes || {}, c = partie === 'ENTETE' ? info.entete : info.pied;
        var droit = info.peutModifier !== false, entete = partie === 'ENTETE';
        var min = entete ? b.enteteMin : b.piedMin, max = entete ? b.enteteMax : b.piedMax;
        var champ = me.down('#hauteur' + partie);
        champ.setMinValue(min);
        champ.setMaxValue(max);
        champ.setValue(c ? c.hauteur : (entete ? b.enteteDefaut : b.piedDefaut));
        me.down('#bornes' + partie).setText('mm (de ' + min + ' à ' + max + ')');
        me.down('#enregistrer' + partie).setDisabled(!droit);
        me.remettre(me.down('#retirer' + partie));
        me.down('#retirer' + partie).setDisabled(!droit || !c);
        var h;
        if (c) {
            h = '<div style="color:#555;margin-bottom:4px">Imprimé sur chaque page, sur ' + c.hauteur + ' mm'
                    + (entete ? ' en haut' : ' en bas') + ' (' + Ext.String.htmlEncode(c.nom || 'image') + ', ' + Math.round(c.taille / 1024)
                    + ' Ko, le ' + c.date + ') :</div><img class="apercu-entete" style="max-width:100%;max-height:120px" src="'
                    + url_rest_entete_facture + 'image?partie=' + partie + '&_dc=' + Date.now() + '">';
        } else {
            h = '<div style="color:#555">Aucune image : les factures gardent ' + (entete ? 'leur en-tête' : 'leur pied de page') + ' d\'origine.</div>';
        }
        me.down('#apercu' + partie).update(h);
    },

    etat: function (partie, ok, texte) {
        this.down('#etat' + partie).setText('<span style="color:' + (ok ? '#1e8449' : '#c0392b') + '">' + Ext.String.htmlEncode(texte) + '</span>');
    },

    enregistrer: function (partie) {
        var me = this, champ = me.down('#fichier' + partie), hauteur = me.down('#hauteur' + partie);
        var fichier = champ.fileInputEl && champ.fileInputEl.dom.files ? champ.fileInputEl.dom.files[0] : null;
        if (!hauteur.isValid()) {
            me.etat(partie, false, 'Hauteur hors bornes.');
            return;
        }
        var actuel = partie === 'ENTETE' ? (me.info || {}).entete : (me.info || {}).pied;
        if (!fichier) {
            if (actuel) {
                me.poster(partie, 'hauteur', {partie: partie, hauteur: hauteur.getValue()});
            } else {
                me.etat(partie, false, 'Choisissez une image.');
            }
            return;
        }
        if (!/^image\/(png|jpeg)$/.test(fichier.type)) {
            me.etat(partie, false, 'PNG ou JPEG seulement.');
            return;
        }
        if (fichier.size > 1024 * 1024) {
            me.etat(partie, false, 'Image trop lourde (1 Mo au plus).');
            return;
        }
        var lecteur = new FileReader();
        lecteur.onload = function () {
            me.poster(partie, '', {partie: partie, donnees: lecteur.result, nom: fichier.name, hauteur: hauteur.getValue()}, function () {
                champ.reset();
            });
        };
        lecteur.readAsDataURL(fichier);
    },

    /** Retrait confirmé dans le bouton : premier clic = « Confirmer le retrait ? » pendant 10 s, second clic = retrait. */
    retirer: function (partie, bouton) {
        var me = this;
        if (!bouton.confirmation) {
            bouton.confirmation = true;
            bouton.setText('Confirmer le retrait ?');
            bouton.addCls('bouton-confirmer');
            bouton.minuterie = Ext.defer(function () {
                me.remettre(bouton);
            }, 10000);
            return;
        }
        me.remettre(bouton);
        me.poster(partie, 'supprimer', {partie: partie});
    },

    remettre: function (bouton) {
        if (bouton.minuterie) {
            clearTimeout(bouton.minuterie);
            bouton.minuterie = null;
        }
        bouton.confirmation = false;
        bouton.setText('Retirer l\'image');
        bouton.removeCls('bouton-confirmer');
    },

    poster: function (partie, action, corps, apres) {
        var me = this;
        Ext.Ajax.request({
            url: url_rest_entete_facture + action, method: 'POST', jsonData: corps,
            success: function (response) {
                var r = Ext.JSON.decode(response.responseText, true) || {};
                me.etat(partie, !!r.success, r.msg || (r.success ? 'C\'est fait.' : 'Refusé.'));
                if (r.success && apres) {
                    apres();
                }
                me.chargerPuisEtat(partie, !!r.success, r.msg);
            },
            failure: function () {
                me.etat(partie, false, 'Le serveur ne répond pas.');
            }
        });
    },

    /** Relit l'état du serveur, en gardant le message de la dernière opération. */
    chargerPuisEtat: function (partie, ok, msg) {
        var me = this;
        Ext.Ajax.request({
            url: url_rest_entete_facture + 'info', method: 'GET',
            success: function (response) {
                me.info = Ext.JSON.decode(response.responseText, true) || {};
                me.afficher('ENTETE');
                me.afficher('PIED');
                if (msg) {
                    me.etat(partie, ok, msg);
                }
            }
        });
    }
});
