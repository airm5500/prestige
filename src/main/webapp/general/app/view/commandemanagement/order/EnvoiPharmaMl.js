/* global Ext */

/*
 * Retours du 08/10 : statut du dernier envoi PharmaML et recuperation de la reponse, communs a la liste des commandes
 * et a la liste des suggestions (memes effets d'un ecran a l'autre).
 *
 * Recuperation « sur la ligne » : le protocole PharmaML ne permet pas de demander la reponse d'UNE commande ; on vide le
 * depot du grossiste (VIDAGE), qui rend ses reponses en attente une par une. Le bouton de la ligne interroge donc le
 * grossiste de cette commande (ses autres commandes en attente recoivent aussi leur reponse) ; le bouton du haut
 * interroge tous les grossistes ayant un envoi en attente.
 */
Ext.define('testextjs.view.commandemanagement.order.EnvoiPharmaMl', {
    singleton: true,

    STATUTS: {
        EN_ATTENTE: ['En attente', '#b26a00', '#fff4e0'],
        REPONDUE: ['Répondue', '#17795f', '#e3f6ef'],
        PARTIELLE: ['Partielle', '#8a5a00', '#fdf0d2'],
        REFUSEE: ['Refusée', '#b42318', '#fde7e6'],
        NON_ENVOYEE: ['Non envoyée', '#b42318', '#fde7e6'],
        ERREUR: ['Erreur', '#b42318', '#fde7e6']
    },

    /** Pastille de la colonne « PharmaML » ; info-bulle : date et detail. */
    rendu: function (v, meta, r) {
        var S = this.STATUTS[v];
        if (!S) {
            return '';
        }
        var info = S[0] + ' · ' + (r.get('dt_ENVOI_PHARMAML') || '')
                + (r.get('str_ENVOI_PHARMAML_DETAIL') ? '<br>' + Ext.String.htmlEncode(r.get('str_ENVOI_PHARMAML_DETAIL')) : '');
        if (v === 'EN_ATTENTE') {
            info += '<br>Bouton « récupérer la réponse » sur la ligne';
        }
        meta.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(info) + '"';
        return '<span class="envoi-pml" data-envoi="' + v + '" style="display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600;color:'
                + S[1] + ';background:' + S[2] + '">' + S[0] + '</span>';
    },

    /** Action de ligne visible seulement pour un envoi en attente de reponse. */
    classeRecuperer: function (v, meta, rec) {
        return rec.get('str_ENVOI_PHARMAML') === 'EN_ATTENTE' ? 'act-ico act-telecharger envoi-pml-recuperer' : 'act-ico act-telecharger x-hide-display';
    },

    /** Texte du resultat d'une recuperation (un ou plusieurs grossistes). */
    texteResultat: function (r) {
        var enc = Ext.String.htmlEncode, lignes = [];
        if (r.reprises) {
            lignes.push(r.reprises + ' réponse(s) archivée(s) rattachée(s) et appliquée(s)');
        }
        Ext.each(r.grossistes || [], function (g) {
            var t = '<b>' + enc(g.grossiste) + '</b> : ' + (g.traitees ? g.traitees + ' réponse(s) traitée(s)' : enc(g.msg || ''));
            Ext.each(g.messages || [], function (m) {
                if (m.statut === 'ERREUR' || m.statut === 'ORPHELINE') {
                    t += '<br>&nbsp;&nbsp;- ' + (m.statut === 'ERREUR' ? 'refus : ' : 'réponse non rattachée (archivée) ')
                            + enc(((m.resultat || {}).msg) || m.enReponseA || '');
                }
            });
            lignes.push(t);
        });
        if (!lignes.length) {
            lignes.push('Aucun grossiste à interroger.');
        }
        lignes.push('<br>Envois encore en attente de réponse : <b>' + (r.enAttente || 0) + '</b>');
        return lignes.join('<br>');
    },

    /** grossisteId vide = tous les grossistes ayant un envoi en attente. apres() : rechargement de la liste. */
    recuperer: function (grossisteId, apres) {
        var me = this, progress = Ext.MessageBox.wait('Interrogation du grossiste . . .', 'Réponses PharmaML');
        Ext.Ajax.request({
            method: 'POST', timeout: 600000,
            url: '../api/v1/pharma/reponses' + (grossisteId ? '?grossiste=' + encodeURIComponent(grossisteId) : ''),
            success: function (response) {
                progress.hide();
                var r = Ext.JSON.decode(response.responseText, true) || {};
                Ext.MessageBox.show({title: 'Réponses PharmaML', width: 560, msg: me.texteResultat(r),
                    buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.INFO});
                if (apres) {
                    apres(r);
                }
            },
            failure: function (response) {
                progress.hide();
                Ext.Msg.alert('Réponses PharmaML', 'Erreur du serveur ' + response.status);
            }
        });
    }
});
