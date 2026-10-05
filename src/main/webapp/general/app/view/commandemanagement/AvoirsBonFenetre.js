/* global Ext */

/*
 * PRODUITS EN AVOIR D'UN BON DE LIVRAISON (demande de l'officine du 05/10).
 *
 * Fenetre au dessin propre (classes vc-*, comme le suivi de consommation) : les produits de ce bon que des clients
 * attendent, avec le client, son telephone, la vente et la quantite due, pour pouvoir les sortir. Le bouton
 * « Imprimer la liste » ouvre le PDF dans un onglet. Lecture seule : rien n'est marque comme servi.
 *
 * Deux entrees : apres une entree en stock validee (afficherPuis : la fenetre ne s'ouvre que s'il y a des avoirs, et la
 * suite habituelle reprend a sa fermeture) et depuis l'etat de controle des achats (ouvrir).
 */
Ext.define('testextjs.view.commandemanagement.AvoirsBonFenetre', {
    extend: 'Ext.window.Window',
    xtype: 'avoirsbonfenetre',
    cls: 'vc-fenetre',
    header: false,
    modal: true,
    resizable: false,
    draggable: false,
    closeAction: 'destroy',
    width: 980,
    height: 560,
    bodyPadding: 0,
    layout: 'fit',
    bonId: null,
    /** Donnees deja lues (afficherPuis), sinon lues a l'ouverture. */
    donnees: null,

    statics: {
        /** Depuis une liste : la fenetre s'ouvre, meme vide (elle le dit). */
        ouvrir: function (bonId) {
            Ext.create('testextjs.view.commandemanagement.AvoirsBonFenetre', {bonId: bonId}).show();
        },
        /**
         * Apres une entree en stock : la fenetre ne s'ouvre que si le bon contient des produits en avoir ; « suite »
         * (la suite habituelle de l'entree en stock) est appelee a sa fermeture, ou tout de suite s'il n'y en a pas.
         */
        afficherPuis: function (bonId, suite) {
            var fait = false;
            var continuer = function () {
                if (!fait) {
                    fait = true;
                    if (suite) {
                        suite();
                    }
                }
            };
            Ext.Ajax.request({
                method: 'GET',
                url: '../api/v1/avoirs-bon/' + encodeURIComponent(bonId),
                success: function (reponse) {
                    var r = Ext.decode(reponse.responseText, true) || {};
                    if (!r.success || !r.total) {
                        continuer();
                        return;
                    }
                    var w = Ext.create('testextjs.view.commandemanagement.AvoirsBonFenetre', {bonId: bonId, donnees: r});
                    w.on('destroy', continuer);
                    w.show();
                },
                failure: continuer
            });
        }
    },

    initComponent: function () {
        var me = this;
        me.html = '<div class="vc"><div class="vc-chargement">Chargement des produits en avoir…</div></div>';
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.getEl().on('click', me.surClic, me, {delegate: '[data-action]'});
            me.cle = new Ext.util.KeyMap({target: Ext.getDoc(), key: Ext.EventObject.ESC, fn: me.close, scope: me});
            if (me.donnees) {
                me.dessiner(me.donnees);
            } else {
                Ext.Ajax.request({
                    method: 'GET',
                    url: '../api/v1/avoirs-bon/' + encodeURIComponent(me.bonId),
                    success: function (reponse) {
                        if (!me.isDestroyed) {
                            me.dessiner(Ext.decode(reponse.responseText, true) || {});
                        }
                    },
                    failure: function () {
                        if (!me.isDestroyed) {
                            me.dessiner({success: false, message: 'La liste n\'a pas pu être lue.'});
                        }
                    }
                });
            }
        });
        me.on('destroy', function () {
            if (me.cle) {
                me.cle.destroy();
            }
        });
    },

    surClic: function (e, cible) {
        var action = cible.getAttribute('data-action');
        e.preventDefault();
        if (action === 'fermer') {
            this.close();
        } else if (action === 'imprimer') {
            window.open('../api/v1/avoirs-bon/' + encodeURIComponent(this.bonId) + '/pdf');
        }
    },

    dessiner: function (r) {
        var me = this, enc = Ext.String.htmlEncode;
        var corps;
        if (r.success === false) {
            corps = '<div class="vc-vide">' + enc(r.message || 'La liste n\'a pas pu être lue.') + '</div>';
        } else if (!r.total) {
            corps = '<div class="vc-vide">Aucun produit de ce bon n\'est en avoir.</div>';
        } else {
            var clients = {};
            Ext.each(r.data, function (l) {
                clients[l.client + '|' + l.telephone] = true;
            });
            var tuile = function (valeur, libelle) {
                return '<div class="vc-tuile"><div class="vc-tuile-valeur">' + valeur + '</div><div class="vc-tuile-libelle">'
                        + libelle + '</div></div>';
            };
            corps = '<div class="vc-tuiles">' + tuile(r.total, 'ligne' + (r.total > 1 ? 's' : '') + ' en avoir')
                    + tuile(Ext.Object.getKeys(clients).length, 'client(s) à prévenir') + '</div>'
                    + '<div class="vc-tableau"><table><thead><tr><th>Produit</th><th>Client</th><th>Téléphone</th>'
                    + '<th>Vente</th><th>Date</th><th class="vc-n">Due</th><th class="vc-n">Reçue (bon)</th></tr></thead><tbody>'
                    + Ext.Array.map(r.data, function (l) {
                        return '<tr><td class="vc-produit">' + enc(l.produit) + (l.cip ? ' <span class="vc-cip">' + enc(l.cip)
                                + '</span>' : '') + '</td><td><b>' + enc(l.client) + '</b></td><td>' + enc(l.telephone || '—')
                                + '</td><td>' + enc(l.reference) + '</td><td>' + enc(l.date) + '</td><td class="vc-n"><b>'
                                + l.quantiteDue + '</b></td><td class="vc-n">' + l.quantiteRecue + '</td></tr>';
                    }).join('') + '</tbody></table></div>';
        }
        me.update('<div class="vc">'
                + '<div class="vc-tete"><div><div class="vc-sur">Produits en avoir · bon ' + enc(r.reference || '') + '</div>'
                + '<div class="vc-nom">' + (r.total ? 'Ces produits sont attendus par des clients' : 'Produits en avoir') + '</div></div>'
                + '<button type="button" class="vc-croix" data-action="fermer" aria-label="Fermer">&times;</button></div>'
                + '<div class="vc-corps">' + corps + '</div>'
                + '<div class="vc-pied"><span>Sortez ces produits et prévenez les clients. Rien n\'est marqué comme servi ici.</span>'
                + '<span class="va-boutons">' + (r.total ? '<button type="button" class="vc-bouton vc-bouton-second" data-action="imprimer">'
                        + 'Imprimer la liste</button>' : '')
                + '<button type="button" class="vc-bouton" data-action="fermer">Fermer</button></span></div>'
                + '</div>');
    }
});
