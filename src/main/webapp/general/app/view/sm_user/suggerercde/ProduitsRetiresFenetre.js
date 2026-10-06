/* global Ext */

/*
 * PRODUITS RETIRES D'UNE SUGGESTION (plan d'octobre, 1.4).
 *
 * Toute ligne supprimée (bouton supprimer, « Nettoyer la suggestion », retrait des produits couverts par un
 * équivalent DCI) est copiée avant suppression. Cette fenêtre les liste (motif, date, utilisateur) et permet de les
 * RAMENER dans la suggestion avec leur quantité d'origine, modifiable. Un produit déjà présent n'est pas dupliqué : la
 * quantité s'ajoute à sa ligne (indiqué).
 */
Ext.define('testextjs.view.sm_user.suggerercde.ProduitsRetiresFenetre', {
    extend: 'Ext.window.Window',
    xtype: 'produitsretiresfenetre',
    cls: 'vc-fenetre eq-fenetre',
    header: false,
    modal: true,
    resizable: false,
    draggable: false,
    closeAction: 'destroy',
    width: 1060,
    height: 560,
    bodyPadding: 0,
    layout: 'fit',
    suggestionId: null,
    apresRetour: null,

    statics: {
        MOTIFS: {
            SUPPRESSION_USER: 'Supprimé par l\'utilisateur',
            SUPPRESSION_EQUIVALENCE_DCI: 'Couvert par un équivalent DCI'
        }
    },

    initComponent: function () {
        var me = this;
        me.html = '<div class="vc"><div class="vc-chargement">Lecture des produits retirés…</div></div>';
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.getEl().on('click', me.surClic, me, {delegate: '[data-action]'});
            me.cle = new Ext.util.KeyMap({target: Ext.getDoc(), key: Ext.EventObject.ESC, fn: me.close, scope: me});
            me.charger();
        });
        me.on('destroy', function () {
            if (me.cle) {
                me.cle.destroy();
            }
        });
    },

    charger: function () {
        var me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/suggestion-equivalents/' + encodeURIComponent(me.suggestionId) + '/retirees',
            success: function (reponse) {
                if (!me.isDestroyed) {
                    me.donnees = Ext.decode(reponse.responseText, true) || {};
                    me.dessiner();
                }
            },
            failure: function () {
                if (!me.isDestroyed) {
                    me.donnees = {success: false, msg: 'La liste n\'a pas pu être lue.'};
                    me.dessiner();
                }
            }
        });
    },

    surClic: function (e, cible) {
        var me = this, action = cible.getAttribute('data-action');
        if (cible.tagName !== 'INPUT') {
            e.preventDefault();
        }
        if (action === 'fermer') {
            me.close();
        } else if (action === 'tout') {
            Ext.each(me.getEl().dom.querySelectorAll('input[data-retrait]'), function (c) {
                c.checked = cible.checked;
            });
        } else if (action === 'ramener') {
            me.ramener();
        }
    },

    dessiner: function () {
        var me = this, r = me.donnees || {}, enc = Ext.String.htmlEncode, motifs = me.self.MOTIFS;
        var corps;
        if (r.success === false) {
            corps = '<div class="vc-vide">' + enc(r.msg || 'La liste n\'a pas pu être lue.') + '</div>';
        } else if (!r.total) {
            corps = '<div class="vc-vide">Aucun produit retiré de cette suggestion.</div>';
        } else {
            corps = '<div class="vc-tableau"><table><thead><tr><th style="width:24px"><input type="checkbox" data-action="tout" title="Tout cocher"></th>'
                    + '<th>Produit</th><th>Motif</th><th>Retiré le</th><th>Par</th><th>Reliquat</th><th class="vc-n">Qté d\'origine</th><th class="vc-n">Qté à ramener</th></tr></thead><tbody>'
                    + Ext.Array.map(r.data, function (l) {
                        return '<tr><td><input type="checkbox" data-retrait="' + enc(l.id) + '"></td>'
                                + '<td class="vc-produit">' + enc(l.nom) + ' <span class="vc-cip">' + enc(l.cip) + '</span>'
                                + (l.present ? '<div class="eq-dci">déjà dans la suggestion (' + l.present + ') : la quantité s\'ajoutera</div>' : '') + '</td>'
                                + '<td><span class="eq-niv ' + (l.motif === 'SUPPRESSION_USER' ? 'eq-hors' : 'eq-direct') + '">' + enc(motifs[l.motif] || l.motif) + '</span></td>'
                                + '<td>' + enc(l.date) + '</td><td>' + enc(l.utilisateur || '—') + '</td><td>' + enc(l.reliquat || '—') + '</td>'
                                + '<td class="vc-n">' + l.quantite + '</td>'
                                + '<td class="vc-n"><input type="number" min="1" class="eq-qte" data-qte="' + enc(l.id) + '" value="' + Math.max(1, l.quantite) + '"></td></tr>';
                    }).join('') + '</tbody></table></div>';
        }
        me.update('<div class="vc"><div class="vc-tete"><div><div class="vc-sur">Suggestion · produits retirés</div>'
                + '<div class="vc-nom">Ramener des produits dans la suggestion</div></div>'
                + '<button type="button" class="vc-croix" data-action="fermer" aria-label="Fermer">&times;</button></div>'
                + '<div class="vc-corps">' + corps + '</div>'
                + '<div class="vc-pied"><span>Cochez les produits à ramener ; la quantité est modifiable.</span><span class="va-boutons">'
                + (r.total ? '<button type="button" class="vc-bouton" data-action="ramener">Ramener dans la suggestion</button> ' : '')
                + '<button type="button" class="vc-bouton vc-bouton-second" data-action="fermer">Fermer</button></span></div></div>');
    },

    ramener: function () {
        var me = this, dom = me.getEl().dom, lignes = [], invalide = false;
        Ext.each(dom.querySelectorAll('input[data-retrait]:checked'), function (c) {
            var id = c.getAttribute('data-retrait'), q = parseInt(dom.querySelector('input[data-qte="' + id + '"]').value, 10);
            if (!(q > 0)) {
                invalide = true;
            }
            lignes.push({id: id, quantite: q});
        });
        if (!lignes.length) {
            Ext.MessageBox.alert('Produits retirés', 'Cochez au moins un produit.');
            return;
        }
        if (invalide) {
            Ext.MessageBox.alert('Produits retirés', 'Chaque quantité doit être un nombre positif.');
            return;
        }
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/suggestion-equivalents/' + encodeURIComponent(me.suggestionId) + '/ramener',
            jsonData: {lignes: lignes},
            success: function (reponse) {
                var r = Ext.decode(reponse.responseText, true) || {};
                if (!r.success) {
                    Ext.MessageBox.alert('Produits retirés', r.msg || 'Le retour n\'a pas pu être fait.');
                    return;
                }
                if (me.apresRetour) {
                    me.apresRetour(r);
                }
                Ext.MessageBox.alert('Produits retirés', (r.ajoutes + r.completes) + ' produit(s) ramené(s) dans la suggestion'
                        + (r.completes ? ' (dont ' + r.completes + ' ajouté(s) à une ligne existante)' : '') + '.');
                if (!me.isDestroyed) {
                    me.charger();
                }
            },
            failure: function () {
                Ext.MessageBox.alert('Produits retirés', 'Le retour n\'a pas pu être fait.');
            }
        });
    }
});
