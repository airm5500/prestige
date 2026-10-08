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
        var n = r.get('int_PROPOSITIONS') || 0;
        if (n > 0) {
            info += '<br>' + n + ' équivalent(s) proposé(s) par le grossiste à décider (clic sur la pastille)';
        }
        meta.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(info) + '"';
        return '<span class="envoi-pml" data-envoi="' + v + '" style="display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600;color:'
                + S[1] + ';background:' + S[2] + '">' + S[0] + '</span>'
                /* retours du 08/10 (7) : equivalents a decider, clic = liste des ruptures sur cette commande */
                + (n > 0 ? ' <span class="pml-a-decider" data-a-decider="' + n + '" style="display:inline-block;cursor:pointer;padding:1px 6px;border-radius:10px;'
                        + 'font-size:10.5px;font-weight:700;color:#fff;background:#b26a00">' + n + ' à décider</span>' : '');
    },

    /** Envoi deja recu ou repondu par le grossiste : pas de renvoi (doublon, double commande). */
    ENVOIS_CLOS: {EN_ATTENTE: 'reçue par le grossiste, réponse en attente', REPONDUE: 'déjà répondue par le grossiste',
        PARTIELLE: 'déjà répondue par le grossiste', RUPTURE: 'déjà répondue par le grossiste'},

    /**
     * Retours du 08/10 (8) : passation d'une COMMANDE par PharmaML, commune a la liste et a l'ecran de la commande.
     * cfg : commandeId, reference, grossiste, lignes (affichage de la confirmation) ; apres(resultat).
     */
    envoyerCommande: function (cfg, apres) {
        var enc = Ext.String.htmlEncode;
        Ext.MessageBox.confirm('Commander par PharmaML', 'Envoyer la commande <b>' + enc(cfg.reference || '') + '</b> à <b>' + enc(cfg.grossiste || '')
                + '</b> par PharmaML ?' + (cfg.lignes !== undefined ? '<br><br>' + cfg.lignes + ' ligne(s).' : '')
                + '<br><br>Les produits non livrés iront dans la liste des ruptures.', function (btn) {
                    if (btn !== 'yes') {
                        return;
                    }
                    var progress = Ext.MessageBox.wait('Envoi au grossiste . . .', 'Commander par PharmaML');
                    Ext.Ajax.request({
                        method: 'PUT', timeout: 240000, headers: {'Content-Type': 'application/json'},
                        url: '../api/v1/pharma/' + encodeURIComponent(cfg.commandeId),
                        success: function (response) {
                            progress.hide();
                            var r = Ext.JSON.decode(response.responseText, true) || {}, message;
                            if (r.success && r.enAttente) {
                                message = r.msg;
                            } else if (r.success) {
                                message = 'Réponse du grossiste reçue : ' + r.nbreproduit + '/' + r.totalProduit + ' produit(s) pris en compte'
                                        + (r.nbrerupture > 0 ? ', ' + r.nbrerupture + ' en rupture (liste des ruptures)' : '') + '.';
                            } else {
                                message = r.msg || 'Envoi impossible.';
                            }
                            Ext.defer(function () {
                                Ext.MessageBox.show({title: r.success ? 'Commander par PharmaML' : 'Envoi PharmaML impossible', width: 520,
                                    msg: enc(message), buttons: Ext.MessageBox.OK, icon: r.success ? Ext.MessageBox.INFO : Ext.MessageBox.ERROR});
                            }, 60);
                            if (apres) {
                                apres(r);
                            }
                        },
                        failure: function (response) {
                            progress.hide();
                            Ext.Msg.alert('Commander par PharmaML', 'Erreur du serveur ' + response.status);
                        }
                    });
                });
    },

    /**
     * Passation d'une SUGGESTION par PharmaML (meme chemin que l'action de la liste des suggestions) : apercu, confirmation,
     * envoi ; la suggestion passe « Commandee » a la reception de la reponse. apres(resultat).
     */
    commanderSuggestion: function (id, apres) {
        var enc = Ext.String.htmlEncode, App = testextjs.app.getController('App');
        Ext.Ajax.request({
            method: 'GET', url: '../api/v1/suggestion-pharmaml/' + encodeURIComponent(id),
            success: function (response) {
                var a = Ext.decode(response.responseText, true) || {};
                if (!a.success) {
                    Ext.MessageBox.alert('Commander par PharmaML', enc(a.msg || 'Lecture impossible.'));
                    return;
                }
                if (!a.pharmaml) {
                    Ext.MessageBox.alert('Commander par PharmaML', 'Le grossiste <b>' + enc(a.grossiste) + '</b> n\'a pas de lien PharmaML (fiche grossiste).');
                    return;
                }
                Ext.MessageBox.confirm('Commander par PharmaML',
                        'Envoyer la suggestion <b>' + enc(a.reference) + '</b> à <b>' + enc(a.grossiste) + '</b> ?<br><br>'
                        + a.lignes + ' ligne(s), valeur ' + Math.round(a.valeur || 0).toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ') + ' (achat), protocole ' + a.version + '.'
                        + (a.commandeRef ? '<br><br>La commande <b>' + enc(a.commandeRef) + '</b> déjà créée lors d\'un essai précédent sera renvoyée.' : '')
                        + '<br><br>La suggestion passera au statut « Commandée » à la réception de la réponse du grossiste.',
                        function (btn) {
                            if (btn !== 'yes') {
                                return;
                            }
                            App.ShowWaitingProcess();
                            Ext.Ajax.request({
                                method: 'POST', url: '../api/v1/suggestion-pharmaml/' + encodeURIComponent(id), timeout: 600000,
                                success: function (r2) {
                                    App.StopWaitingProcess();
                                    var o = Ext.decode(r2.responseText, true) || {};
                                    if (!o.success) {
                                        Ext.MessageBox.alert('Commander par PharmaML', enc(o.msg || 'L\'envoi n\'a pas abouti.'));
                                    } else if (o.enAttente) {
                                        Ext.MessageBox.alert('Commander par PharmaML', enc(o.msg || 'Commande reçue par le grossiste, réponse en attente.')
                                                + '<br><br>La suggestion passera au statut « Commandée » à la réception de cette réponse.');
                                    } else {
                                        var e = o.envoi || {};
                                        Ext.MessageBox.alert('Commander par PharmaML', 'Réponse du grossiste reçue : la suggestion est <b>commandée</b>.<br>'
                                                + (e.nbreproduit !== undefined ? e.nbreproduit + ' produit(s) pris en compte, ' + e.nbrerupture + ' en rupture sur ' + e.totalProduit + '.' : ''));
                                    }
                                    if (apres) {
                                        apres(o);
                                    }
                                },
                                failure: function () {
                                    App.StopWaitingProcess();
                                    Ext.MessageBox.alert('Commander par PharmaML', 'Le serveur ne répond pas.');
                                }
                            });
                        });
            }
        });
    },

    /* Retours du 08/10 (10) : avancement de la commande chez le grossiste (tableau 11 de la specification) */
    AVANCEMENTS: {
        A_FAIRE: ['À faire', '#3b4a5c', '#eef2f6'],
        EN_COURS: ['En cours', '#1f5f9e', '#e4effa'],
        PREPAREE: ['Préparée', '#17795f', '#e3f6ef'],
        ANNULEE: ['Annulée', '#b42318', '#fde7e6'],
        AUTRE: ['Suivi reçu', '#6b7b8c', '#eef2f6']
    },

    /** Colonne « Avancement » : pastille, livraison prevue, lien « Où en est-elle ? » pour une commande envoyee. */
    renduAvancement: function (v, meta, r) {
        var enc = Ext.String.htmlEncode, A = this.AVANCEMENTS[v], h = '', info = [];
        if (A) {
            h += '<span class="avancement-pml" data-avancement-etat="' + enc(v) + '" style="display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600;color:'
                    + A[1] + ';background:' + A[2] + '">' + enc(A[0]) + '</span>';
            info.push(r.get('str_AVANCEMENT_LIBELLE') || A[0]);
            if (r.get('dt_LIVRAISON_PREVUE')) {
                /* date courte dans la cellule (jj/mm), complete dans l'info-bulle */
                var dl = r.get('dt_LIVRAISON_PREVUE'), m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dl);
                h += ' <span class="livraison-prevue" style="font-size:11px;color:#3b4a5c">liv. ' + enc(m ? m[3] + '/' + m[2] : dl) + '</span>';
                info.push('Livraison prévue : ' + r.get('dt_LIVRAISON_PREVUE'));
            }
            if (r.get('int_AVANCEMENT_ANNULEES') > 0) {
                info.push(r.get('int_AVANCEMENT_ANNULEES') + ' ligne(s) annulée(s) par le grossiste');
            }
            info.push('Suivi reçu le ' + (r.get('dt_AVANCEMENT') || ''));
        }
        var envoyee = r.get('str_ENVOI_PHARMAML') === 'EN_ATTENTE' || r.get('str_ENVOI_PHARMAML') === 'REPONDUE' || r.get('str_ENVOI_PHARMAML') === 'PARTIELLE';
        if (envoyee) {
            h += (h ? '<br>' : '') + '<a href="#" class="demander-avancement" data-demander-avancement="1" style="font-size:11px;color:#2E75B6">Où en est-elle ?</a>';
            info.push('« Où en est-elle ? » interroge le grossiste (À faire, En cours, Préparée, Annulée, livraison prévue)');
        }
        if (info.length) {
            meta.tdAttr = 'data-qtip="' + enc(enc(info.join(' · '))) + '"';
        }
        return h;
    },

    /** Demande d'avancement au grossiste, puis detail par ligne (lecture seule). */
    demanderAvancement: function (commandeId, reference, apres) {
        var me = this, enc = Ext.String.htmlEncode, attente = Ext.MessageBox.wait('Interrogation du grossiste…', 'Avancement de la commande');
        Ext.Ajax.request({
            method: 'POST', timeout: 240000, url: '../api/v1/pharma/avancement/' + encodeURIComponent(commandeId),
            success: function (response) {
                attente.hide();
                var r = Ext.JSON.decode(response.responseText, true) || {};
                if (apres) {
                    apres(r);
                }
                if (!r.success || r.enAttente) {
                    Ext.defer(function () {
                        Ext.MessageBox.show({title: 'Avancement de la commande', width: 480, msg: enc(r.msg || 'Interrogation impossible.'),
                            buttons: Ext.MessageBox.OK, icon: r.success ? Ext.MessageBox.INFO : Ext.MessageBox.WARNING});
                    }, 60);
                    return;
                }
                me.voirAvancement(r, reference);
            },
            failure: function (response) {
                attente.hide();
                Ext.Msg.alert('Avancement de la commande', 'Erreur du serveur ' + response.status);
            }
        });
    },

    voirAvancement: function (r, reference) {
        var me = this, enc = Ext.String.htmlEncode, A = me.AVANCEMENTS[r.etat] || me.AVANCEMENTS.AUTRE;
        Ext.create('Ext.window.Window', {
            title: 'Avancement de la commande' + (reference ? ' · ' + reference : ''), itemId: 'fenAvancement', modal: true,
            width: Math.min(820, Ext.getBody().getViewSize().width - 40), height: Math.min(440, Ext.getBody().getViewSize().height - 40), layout: 'border',
            items: [{region: 'north', xtype: 'component', itemId: 'enteteAvancement', padding: '8 10',
                    html: '<span style="display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600;color:' + A[1] + ';background:' + A[2] + '">' + enc(A[0]) + '</span> '
                            + enc(r.libelle || '') + (r.dateLivraison ? ' · livraison prévue <b>' + enc(r.dateLivraison) + '</b>' : '')
                            + (r.annulees > 0 ? ' · <span style="color:#b42318">' + r.annulees + ' ligne(s) annulée(s)</span>' : '') + ' · réponse du ' + enc(r.date || '')},
                {region: 'center', xtype: 'grid', itemId: 'grilleAvancement', cls: 'theme-liste',
                    store: Ext.create('Ext.data.Store', {fields: ['etat', 'libelle', 'dateLivraison', 'commentaire', 'code', 'produit', 'qte'], data: r.lignes || []}),
                    columns: [
                        {header: 'Code', dataIndex: 'code', width: 90},
                        {header: 'Produit', dataIndex: 'produit', flex: 1, renderer: function (v, m) {
                                m.tdAttr = 'data-qtip="' + enc(enc(v || '')) + '"';
                                return enc(v || '');
                            }},
                        {header: 'Qté', dataIndex: 'qte', width: 50, align: 'right'},
                        {header: 'Avancement', dataIndex: 'etat', width: 120, renderer: function (v, m, rec) {
                                var X = me.AVANCEMENTS[v] || me.AVANCEMENTS.AUTRE;
                                m.tdAttr = 'data-qtip="' + enc(enc(rec.get('libelle') || '')) + '"';
                                return '<span class="etat-avancement" data-etat="' + enc(v) + '" style="display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:600;color:'
                                        + X[1] + ';background:' + X[2] + '">' + enc(X[0]) + '</span>';
                            }},
                        {header: 'Livraison prévue', dataIndex: 'dateLivraison', width: 130},
                        {header: 'Commentaire', dataIndex: 'commentaire', flex: 1, renderer: function (v, m) {
                                m.tdAttr = 'data-qtip="' + enc(enc(v || '')) + '"';
                                return enc(v || '');
                            }}
                    ]}],
            buttons: [{text: 'Fermer', handler: function (b) {
                        b.up('window').close();
                    }}]
        }).show();
    },

    /** Retours du 08/10 (11) : libelle d'un bon de livraison valorise recu (choix a la saisie du bon). */
    libelleBlv: function (b) {
        return 'BL ' + (b.refLivraison || b.refDocument || '?') + (b.date ? ' du ' + Ext.Date.format(Ext.Date.parse(b.date, 'Y-m-d') || new Date(0), 'd/m/Y') : '')
                + ' · ' + b.lignes + ' ligne(s)' + (b.montantHt !== null && b.montantHt !== undefined ? ' · ' + Ext.util.Format.number(b.montantHt, '0,000') + ' HT' : '')
                + (b.rattache ? '' : ' · non rattaché') + (b.utilise ? ' · déjà utilisé' : '');
    },

    /** Detail d'un BLV rapproche de la commande : ecarts de quantite et de prix d'achat (lecture seule). */
    voirBlv: function (blvId, commandeId) {
        var me = this, enc = Ext.String.htmlEncode, nb = function (v) {
            return v === null || v === undefined ? '' : Ext.util.Format.number(v, '0,000');
        };
        Ext.Ajax.request({
            url: '../api/v1/pharma/blv/' + encodeURIComponent(blvId) + (commandeId ? '?commande=' + encodeURIComponent(commandeId) : ''),
            method: 'GET',
            success: function (resp) {
                var r = Ext.JSON.decode(resp.responseText, true) || {};
                if (!r.success) {
                    Ext.MessageBox.alert('Bon de livraison PharmaML', enc(r.msg || 'Bon de livraison introuvable.'));
                    return;
                }
                var resume = [];
                resume.push(r.ecartsQte > 0 ? '<span class="blv-ecart">' + r.ecartsQte + ' écart(s) de quantité</span>' : '<span class="blv-ok">quantités conformes</span>');
                resume.push(r.ecartsPrix > 0 ? '<span class="blv-ecart">' + r.ecartsPrix + ' écart(s) de prix</span>' : '<span class="blv-ok">prix conformes</span>');
                if (r.horsCommande > 0) {
                    resume.push('<span class="blv-ecart">' + r.horsCommande + ' produit(s) hors commande</span>');
                }
                Ext.create('Ext.window.Window', {
                    title: 'Bon de livraison valorisé · ' + enc(r.refLivraison || ''), itemId: 'fenBlv', id: 'fenBlvPml', modal: true,
                    width: Math.min(1000, Ext.getBody().getViewSize().width - 40), height: Math.min(480, Ext.getBody().getViewSize().height - 40), layout: 'border',
                    items: [{region: 'north', xtype: 'component', itemId: 'enteteBlv', padding: '8 10', cls: 'blv-entete',
                            html: enc(r.grossiste || '') + (r.date ? ' · livré le <b>' + enc(Ext.Date.format(Ext.Date.parse(r.date, 'Y-m-d') || new Date(0), 'd/m/Y')) + '</b>' : '')
                                    + (r.refFacture ? ' · facture ' + enc(r.refFacture) : '') + (r.commande ? ' · commande ' + enc(r.commande) : ' · <i>non rattaché à une commande</i>')
                                    + (r.montantHt !== null ? ' · <b>' + nb(r.montantHt) + '</b> HT' : '') + (r.montantTaxes !== null ? ' · TVA ' + nb(r.montantTaxes) : '')
                                    + '<br>' + resume.join(' · ') + ' · reçu le ' + enc(r.recu || '')},
                        {region: 'center', xtype: 'grid', itemId: 'grilleBlv', cls: 'theme-liste',
                            store: Ext.create('Ext.data.Store', {fields: ['num', 'code', 'produit', 'connu', 'qteCommandee', 'qteLivree', 'qteFacturee', 'prix', 'naturePrix', 'pafCommande', 'tva', 'commentaire', 'ecartQte', 'ecartPrix', 'horsCommande'], data: r.lignes || []}),
                            viewConfig: {getRowClass: function (rec) {
                                    return rec.get('ecartQte') || rec.get('ecartPrix') || rec.get('horsCommande') ? 'blv-ligne-ecart' : '';
                                }},
                            columns: [
                                {header: 'Code', dataIndex: 'code', width: 95},
                                {header: 'Produit', dataIndex: 'produit', flex: 1, minWidth: 160, renderer: function (v, m, rec) {
                                        m.tdAttr = 'data-qtip="' + enc(enc(v || '')) + '"';
                                        return enc(v || '') + (rec.get('connu') ? '' : ' <span class="blv-ecart">inconnu</span>') + (rec.get('horsCommande') ? ' <span class="blv-ecart">hors commande</span>' : '');
                                    }},
                                {header: 'Cdé', dataIndex: 'qteCommandee', width: 64, align: 'right'},
                                {header: 'Livré', dataIndex: 'qteLivree', width: 70, align: 'right', renderer: function (v, m, rec) {
                                        return rec.get('ecartQte') ? '<span class="blv-ecart">' + v + '</span>' : v;
                                    }},
                                {header: 'Facturé', dataIndex: 'qteFacturee', width: 100, align: 'right'},
                                {header: 'Prix BLV', dataIndex: 'prix', width: 96, align: 'right', renderer: function (v, m, rec) {
                                        m.tdAttr = 'data-qtip="' + enc(rec.get('naturePrix') === 'NETHT' ? 'Prix net HT facturé' : rec.get('naturePrix') === 'PHAHT' ? 'Prix pharmacien HT brut' : '') + '"';
                                        return rec.get('ecartPrix') ? '<span class="blv-ecart">' + nb(v) + '</span>' : nb(v);
                                    }},
                                {header: 'P.A commande', dataIndex: 'pafCommande', width: 140, align: 'right', renderer: nb},
                                {header: 'TVA %', dataIndex: 'tva', width: 72, align: 'right', renderer: function (v) {
                                        return v === null || v === undefined || v === '' ? '' : String(parseFloat(v)).replace('.', ',');
                                    }},
                                {header: 'Commentaire', dataIndex: 'commentaire', width: 150, renderer: function (v, m) {
                                        m.tdAttr = 'data-qtip="' + enc(enc(v || '')) + '"';
                                        return enc(v || '');
                                    }}
                            ]}],
                    buttons: [{text: 'Fermer', handler: function (b) {
                                b.up('window').close();
                            }}]
                }).show();
            }
        });
    },

    /** Retours du 08/10 (7) : liste des ruptures, equivalents proposes limites a cette commande. */
    ouvrirPropositions: function (reference) {
        testextjs.view.pharmaml.Rupturepharma.referenceDemandee = reference;
        var ouvert = Ext.ComponentQuery.query('rupturepharma')[0];
        testextjs.app.getController('App').onLoadNewComponent('rupturepharma', 'Liste des ruptures', '');
        Ext.defer(function () {
            var e = Ext.ComponentQuery.query('rupturepharma')[0];
            if (e && (e === ouvert || !testextjs.view.pharmaml.Rupturepharma.referenceDemandee)) {
                e.choisirReference(reference);
            }
        }, 300);
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
                /* retours du 08/10 (11) : bons de livraison valorises et alertes recus */
                if (m.statut === 'TRAITEE' && m.source === 'BLV') {
                    t += '<br>&nbsp;&nbsp;- bon de livraison valorisé ' + enc((m.resultat || {}).blv || '')
                            + ((m.resultat || {}).commande ? ' (commande ' + enc(m.resultat.commande) + ')' : ' (non rattaché)');
                } else if (m.statut === 'TRAITEE' && m.source === 'ALERTE') {
                    t += '<br>&nbsp;&nbsp;- <b style="color:#b42318">alerte ' + ((m.resultat || {}).type === 'COMMERCIALE' ? 'commerciale' : 'réglementaire')
                            + ' ' + enc((m.resultat || {}).alerte || '') + '</b> : voir Liste des ruptures, onglet Alertes';
                }
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
