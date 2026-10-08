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
        RUPTURE: ['Rupture', '#b42318', '#fde7e6'],
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

    /** Retours du 08/10 : action « voir la réponse du grossiste », visible des qu'une reponse a ete traitee. */
    classeVoirReponse: function (v, meta, rec) {
        var c = rec.get('str_ENVOI_PHARMAML');
        return c === 'REPONDUE' || c === 'PARTIELLE' || c === 'RUPTURE' ? 'act-ico act-voir envoi-pml-voir' : 'act-ico act-voir x-hide-display';
    },

    ETATS: {LIVRE: ['Livré', '#17795f', '#e3f6ef'], PARTIEL: ['Partiel', '#8a5a00', '#fdf0d2'], RUPTURE: ['Rupture', '#b42318', '#fde7e6']},

    /**
     * Reponse du grossiste en lecture seule (sans ouvrir le fichier XML) : une ligne par produit, quantites commandee /
     * livree, prix annonces, motif d'indisponibilite et remplacant. reference : affichee dans le titre.
     */
    voirReponse: function (commandeId, reference) {
        var me = this, enc = Ext.String.htmlEncode;
        Ext.Ajax.request({
            method: 'GET', url: '../api/v1/pharma/reponse/' + encodeURIComponent(commandeId),
            success: function (response) {
                var r = Ext.JSON.decode(response.responseText, true) || {};
                if (r.success === false) {
                    Ext.Msg.alert('Réponse du grossiste', enc(r.msg || 'Erreur'));
                    return;
                }
                var lignes = r.data || [], entete = '';
                if (r.statut && me.STATUTS[r.statut]) {
                    var S = me.STATUTS[r.statut];
                    entete = '<span class="envoi-pml" style="display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600;color:'
                            + S[1] + ';background:' + S[2] + '">' + S[0] + '</span> ';
                }
                entete += enc((lignes.length ? lignes[0].grossiste + ' · réponse du ' + lignes[0].date : (r.dateEnvoi || '')))
                        + (r.resume ? ' · ' + enc(r.resume) : '');
                Ext.create('Ext.window.Window', {
                    title: 'Réponse du grossiste' + (reference ? ' · ' + reference : ''),
                    itemId: 'fenReponseGrossiste', cls: 'reponse-grossiste',
                    modal: true, width: Math.min(980, Ext.getBody().getViewSize().width - 40),
                    height: Math.min(520, Ext.getBody().getViewSize().height - 40), layout: 'border',
                    items: [{region: 'north', xtype: 'component', itemId: 'enteteReponse', padding: '8 10', html: entete},
                        {region: 'center', xtype: 'grid', itemId: 'grilleReponse', cls: 'theme-liste',
                            emptyText: 'Aucune ligne de réponse enregistrée pour cette commande (les réponses reçues avant cette version ne sont pas détaillées).',
                            viewConfig: {deferEmptyText: false},
                            store: Ext.create('Ext.data.Store', {fields: ['code', 'produit', 'qteCommandee', 'qteLivree', 'prixAchat', 'prixVente',
                                    'etat', 'codeReponse', 'motif', 'remplacant'], data: lignes}),
                            columns: [
                                {header: 'Code', dataIndex: 'code', width: 80},
                                {header: 'Produit', dataIndex: 'produit', flex: 2, renderer: function (v, m) {
                                        m.tdAttr = 'data-qtip="' + enc(enc(v || '')) + '"';
                                        return enc(v || '');
                                    }},
                                {header: 'Cdé', dataIndex: 'qteCommandee', width: 52, align: 'right'},
                                {header: 'Livré', dataIndex: 'qteLivree', width: 56, align: 'right'},
                                {header: 'État', dataIndex: 'etat', width: 76, renderer: function (v) {
                                        var E = me.ETATS[v] || [v, '#333', '#eee'];
                                        return '<span class="etat-rep" data-etat="' + v + '" style="display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600;color:'
                                                + E[1] + ';background:' + E[2] + '">' + E[0] + '</span>';
                                    }},
                                {header: 'P.A. annoncé', dataIndex: 'prixAchat', width: 92, align: 'right', renderer: function (v) {
                                        return v === null || v === undefined || v === '' ? '' : Ext.util.Format.number(v, '0,000.');
                                    }},
                                {header: 'P.V. annoncé', dataIndex: 'prixVente', width: 92, align: 'right', renderer: function (v) {
                                        return v === null || v === undefined || v === '' ? '' : Ext.util.Format.number(v, '0,000.');
                                    }},
                                {header: 'Motif', dataIndex: 'motif', flex: 1.4, renderer: function (v, m, rec) {
                                        var t = (v || '') + (rec.get('codeReponse') && rec.get('codeReponse') !== v ? ' (' + rec.get('codeReponse') + ')' : '');
                                        m.tdAttr = 'data-qtip="' + enc(enc(t)) + '"';
                                        return enc(t);
                                    }},
                                {header: 'Remplaçant', dataIndex: 'remplacant', flex: 1.2, renderer: function (v, m) {
                                        m.tdAttr = 'data-qtip="' + enc(enc(v || '')) + '"';
                                        return enc(v || '');
                                    }}
                            ]}],
                    buttons: [{text: 'Fermer', handler: function (b) {
                                b.up('window').close();
                            }}]
                }).show();
            },
            failure: function (response) {
                Ext.Msg.alert('Réponse du grossiste', 'Erreur du serveur ' + response.status);
            }
        });
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
