/* global Ext */

/*
 * SUIVI DE CONSOMMATION DU CLIENT, depuis l'ecran de vente (retour du 30/09).
 *
 * Fenetre modale au dessin propre : pas de barre de titre ni de boutons ExtJS standard, tout est en HTML/CSS (classes
 * vc-*, vente-theme.css). Lecture seule : ce que le client a achete sur la periode (achats, quantite, frequence,
 * dernier achat, habitude, montant) et le stock de chaque produit. Echap ou un clic hors de la fenetre la ferme.
 *
 * Elle ne depend pas du controleur de la caisse : le bouton lui passe l'identifiant du client.
 */
Ext.define('testextjs.view.vente.SuiviConsoFenetre', {
    extend: 'Ext.window.Window',
    xtype: 'suiviconsofenetre',
    cls: 'vc-fenetre',
    header: false,
    modal: true,
    resizable: false,
    draggable: false,
    closeAction: 'destroy',
    width: 960,
    height: 580,
    bodyPadding: 0,
    layout: 'fit',
    /** Periode affichee, en mois. */
    mois: 12,
    clientId: null,

    statics: {
        /**
         * Ouvre le suivi du client de la vente en cours, depuis un bouton de l'ecran de vente (client standard ou
         * assure). Le controleur de la caisse n'est que lu.
         */
        ouvrirDepuis: function (bouton) {
            var ctr = testextjs.app.getController(bouton.up('doventeendepot') ? 'VenteEnDepotCtr' : 'VenteCtr');
            var client = ctr && ctr.getClient ? ctr.getClient() : null;
            Ext.create('testextjs.view.vente.SuiviConsoFenetre', {
                clientId: client && client.get ? client.get('lgCLIENTID') : null,
                nomClient: client && client.get ? Ext.String.trim((client.get('strFIRSTNAME') || '') + ' '
                        + (client.get('strLASTNAME') || '')) : ''
            }).show();
        }
    },

    initComponent: function () {
        var me = this;
        me.html = '<div class="vc"><div class="vc-chargement">Chargement du suivi…</div></div>';
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.getEl().on('click', me.surClic, me, {delegate: '[data-action]'});
            me.cle = new Ext.util.KeyMap({target: Ext.getDoc(), key: Ext.EventObject.ESC, fn: me.close, scope: me});
            /* Un clic sur le voile, hors de la fenetre, la ferme aussi. */
            if (me.zIndexManager && me.zIndexManager.mask) {
                me.mon(me.zIndexManager.mask, 'click', me.close, me);
            }
            me.charger();
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
        } else if (action === 'periode') {
            this.mois = parseInt(cible.getAttribute('data-mois'), 10) || 12;
            this.charger();
        }
    },

    charger: function () {
        var me = this;
        var fin = new Date();
        var debut = Ext.Date.add(fin, Ext.Date.MONTH, -me.mois);
        me.dessiner(null, true);
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/vente-suivi-conso/client/' + encodeURIComponent(me.clientId || '-'),
            params: {dtStart: Ext.Date.format(debut, 'Y-m-d'), dtEnd: Ext.Date.format(fin, 'Y-m-d')},
            success: function (reponse) {
                if (!me.isDestroyed) {
                    me.dessiner(Ext.decode(reponse.responseText, true) || {}, false);
                }
            },
            failure: function () {
                if (!me.isDestroyed) {
                    me.dessiner({success: false, message: 'Le suivi n\'a pas pu être lu.'}, false);
                }
            }
        });
    },

    dessiner: function (r, enCours) {
        var me = this;
        var enc = Ext.String.htmlEncode;
        var nombre = function (v) {
            return Ext.util.Format.number(v || 0, '0,000');
        };
        var periodes = Ext.Array.map([3, 6, 12, 24], function (m) {
            return '<button type="button" class="vc-puce' + (m === me.mois ? ' vc-puce-active' : '') + '" data-action="periode"'
                    + ' data-mois="' + m + '">' + m + ' mois</button>';
        }).join('');
        var nom = r && r.client ? enc(r.client) : (me.nomClient ? enc(me.nomClient) : '');
        var corps;
        if (enCours) {
            corps = '<div class="vc-chargement">Chargement du suivi…</div>';
        } else if (!r || r.success === false) {
            corps = '<div class="vc-vide">' + enc((r && r.message) || 'Le suivi n\'a pas pu être lu.') + '</div>';
        } else {
            var lignes = r.data || [];
            var achats = 0, montant = 0, reguliers = 0;
            Ext.each(lignes, function (l) {
                achats += l.nbAchats || 0;
                montant += l.montant || 0;
                if (l.nbAchats > 1) {
                    reguliers++;
                }
            });
            lignes = Ext.Array.sort(lignes.slice(), function (a, b) {
                return (b.dernierAchat || '').localeCompare(a.dernierAchat || '');
            });
            var tuile = function (valeur, libelle) {
                return '<div class="vc-tuile"><div class="vc-tuile-valeur">' + valeur + '</div><div class="vc-tuile-libelle">'
                        + libelle + '</div></div>';
            };
            var tableau = lignes.length ? '<div class="vc-tableau"><table><thead><tr><th>Produit</th><th class="vc-n">Achats</th>'
                    + '<th class="vc-n">Qté</th><th>Fréquence</th><th>Dernier achat</th><th>Habitude</th>'
                    + '<th class="vc-n">Montant</th><th class="vc-n">Stock</th></tr></thead><tbody>'
                    + Ext.Array.map(lignes, function (l) {
                        var stock = l.stock === null || l.stock === undefined ? '—'
                                : '<span class="' + (l.stock > 0 ? 'vc-stock' : 'vc-rupture') + '">' + l.stock + '</span>';
                        var dernier = l.dernierAchat ? Ext.Date.format(Ext.Date.parse(l.dernierAchat, 'Y-m-d'), 'd/m/Y') : '';
                        return '<tr><td class="vc-produit" title="' + enc(l.name || '') + '">' + enc(l.name || '')
                                + (l.cip ? ' <span class="vc-cip">' + enc(l.cip) + '</span>' : '') + '</td>'
                                + '<td class="vc-n">' + (l.nbAchats || 0) + '</td><td class="vc-n">' + (l.qteTotale || 0) + '</td>'
                                + '<td>' + (l.nbAchats > 1 && l.frequenceJours ? 'tous les ' + l.frequenceJours + ' j' : '—') + '</td>'
                                + '<td>' + dernier + '</td>'
                                + '<td>' + (l.habitude ? '<span class="vc-habitude">' + enc(l.habitude) + '</span>' : '') + '</td>'
                                + '<td class="vc-n">' + nombre(l.montant) + '</td><td class="vc-n">' + stock + '</td></tr>';
                    }).join('') + '</tbody></table></div>'
                    : '<div class="vc-vide">Aucun achat de ce client sur les ' + me.mois + ' derniers mois.</div>';
            corps = '<div class="vc-tuiles">' + tuile(lignes.length, 'produits achetés') + tuile(achats, 'achats')
                    + tuile(reguliers, 'produits rachetés') + tuile(nombre(montant) + ' F', 'montant') + '</div>' + tableau;
        }
        me.update('<div class="vc">'
                + '<div class="vc-tete"><div><div class="vc-sur">Suivi de consommation</div><div class="vc-nom">' + nom + '</div></div>'
                + '<button type="button" class="vc-croix" data-action="fermer" aria-label="Fermer">&times;</button></div>'
                + '<div class="vc-periodes">' + periodes + '</div>'
                + '<div class="vc-corps">' + corps + '</div>'
                + '<div class="vc-pied"><span>Lecture seule : achats du client et stock de votre emplacement.</span>'
                + '<button type="button" class="vc-bouton" data-action="fermer">Fermer</button></div>'
                + '</div>');
    }
});
