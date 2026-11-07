/* global Ext */

/*
 * GESTION DES COMMANDES > « Extranets grossistes » (plan du 07/11) : lecture seule des extranets Ubipharm et TEDIS.
 * Chaque onglet affiche le cache de Prestige avec la date de sa collecte ; « Lire sur l'extranet » lance une
 * collecte (appels en lecture seule). Aucune commande ni réclamation n'est envoyée d'ici.
 * La session d'un extranet (cookie) se renseigne dans l'onglet Sessions, par un administrateur ; sa valeur n'est
 * jamais réaffichée. Confirmation dans le bouton lui-même (aucune fenêtre surgissante).
 * Routes : ../api/v1/extranet/...
 */
Ext.define('testextjs.view.commandemanagement.extranet.ExtranetsGrossistes', {
    extend: 'Ext.panel.Panel',
    xtype: 'extranetsgrossistes',
    layout: 'fit',
    border: false,
    header: false,
    config: {
        nameintern: '',
        titre: '',
        odatasource: ''
    },

    URL: '../api/v1/extranet/',

    ETATS: {NON_CONFIGUREE: 'non renseignée', A_VERIFIER: 'renseignée, pas encore utilisée', VALIDE: 'valide',
        EXPIREE: 'expirée : à renseigner de nouveau'},

    initComponent: function () {
        var me = this;
        me.reappro = Ext.create('Ext.data.Store', {
            fields: ['position', 'pscode', 'designation', 'code', 'categorie', 'dateAffichee', 'codeAgence', 'statut',
                'disponibilites'],
            pageSize: 50,
            proxy: {type: 'ajax', url: me.URL + 'ubipharm/reappro', timeout: 120000,
                reader: {type: 'json', root: 'lignes', totalProperty: 'total'}},
            listeners: {
                beforeload: function (st) {
                    st.getProxy().extraParams = {recherche: me.valeur('#exReapproRecherche')};
                },
                load: function (st, r, ok) {
                    me.afficherDate('#exReapproDate', ok ? st.getProxy().getReader().rawData : null);
                }
            }
        });
        me.reclamations = Ext.create('Ext.data.Store', {
            fields: ['id', 'eta', 'appl', 'reference', 'numerosAssociesBrut', 'statut', 'dateEnvoiBrute',
                'dateMiseAJourBrute'],
            proxy: {type: 'ajax', url: me.URL + 'ubipharm/reclamations', timeout: 120000,
                reader: {type: 'json', root: 'reclamations'}},
            listeners: {
                beforeload: function (st) {
                    st.getProxy().extraParams = {filtre: me.down('#exFiltre').getValue()};
                },
                load: function (st, r, ok) {
                    me.afficherDate('#exReclamationsDate', ok ? st.getProxy().getReader().rawData : null);
                }
            }
        });
        me.lignesReclamation = Ext.create('Ext.data.Store', {
            fields: ['position', 'pscode', 'designation', 'cip', 'quantite', 'prixBrut', 'motif', 'commentaire']
        });
        me.nouveaux = Ext.create('Ext.data.Store', {
            fields: ['position', 'pscode', 'designation', 'cip', 'categorie', 'dateAffichee', 'mouvement',
                'disponibilite', 'agences', 'prestige'],
            proxy: {type: 'ajax', url: me.URL + 'ubipharm/nouveaux', timeout: 120000,
                reader: {type: 'json', root: 'produits'}},
            listeners: {
                load: function (st, r, ok) {
                    me.afficherDate('#exNouveauxDate', ok ? st.getProxy().getReader().rawData : null);
                    /* un rechargement de la liste ne perd pas le dernier rapprochement affiché */
                    me.appliquerRapprochement();
                }
            }
        });
        me.collectes = Ext.create('Ext.data.Store', {
            fields: ['id', 'module', 'parametres', 'utilisateur', 'debut', 'fin', 'statut', 'lignesAnnoncees',
                'lignesRecues', 'message'],
            proxy: {type: 'ajax', url: me.URL + 'UBIPHARM/collectes', extraParams: {nombre: 100},
                reader: {type: 'json', root: 'data'}}
        });
        me.agencesFiche = Ext.create('Ext.data.Store', {fields: ['etcode', 'etlib', 'psstk', 'colisages']});

        Ext.apply(me, {
            items: [{
                    xtype: 'tabpanel', itemId: 'exOnglets', plain: true,
                    items: [me.ongletSessions(), me.ongletFiche(), me.ongletReappro(), me.ongletReclamations(),
                        me.ongletNouveaux(), me.ongletCollectes()],
                    listeners: {
                        tabchange: function (tp, onglet) {
                            me.chargerOnglet(onglet.itemId);
                        }
                    }
                }]
        });
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.chargerSessions();
        }, me, {single: true});
    },

    /* ---------------------------------------------------------------- outils */

    texte: function (v) {
        return v === null || v === undefined ? '' : Ext.String.htmlEncode(String(v));
    },

    /** Valeur inconnue : affichée « inconnu », jamais 0. */
    connu: function (v) {
        return v === null || v === undefined ? '<span style="color:#95a5a6">inconnu</span>'
                : Ext.String.htmlEncode(String(v));
    },

    valeur: function (sel) {
        var c = this.down(sel);
        return c ? Ext.String.trim(c.getValue() || '') : '';
    },

    appel: function (methode, url, rappel, masque) {
        var me = this, cible = masque || me;
        cible.setLoading('Lecture en cours...');
        Ext.Ajax.request({
            method: methode, url: me.URL + url, timeout: 300000,
            success: function (rep) {
                cible.setLoading(false);
                var r = Ext.decode(rep.responseText, true) || {success: false, msg: 'Réponse illisible'};
                rappel(r);
            },
            failure: function (rep) {
                cible.setLoading(false);
                var r = Ext.decode(rep.responseText, true) || {};
                rappel({success: false, msg: r.msg || ('Erreur ' + rep.status)});
            }
        });
    },

    /** Message dans la barre de l'onglet (pas de fenêtre). */
    message: function (sel, r, texteOk) {
        var l = this.down(sel);
        if (!l) {
            return;
        }
        if (r.success) {
            l.setText('<span style="color:#27ae60">' + Ext.String.htmlEncode(texteOk || 'Terminé') + '</span>', false);
        } else {
            var expire = r.nature === 'SESSION_EXPIREE' || r.nature === 'SESSION_ABSENTE';
            l.setText('<span style="color:#c0392b">' + Ext.String.htmlEncode(r.msg || 'Échec')
                    + (expire ? ' (onglet Sessions)' : '') + '</span>', false);
            if (expire) {
                this.chargerSessions();
            }
        }
    },

    afficherDate: function (sel, brut) {
        var l = this.down(sel), d = brut && (brut.dateCollecte || brut.collecteLe
                || (brut.collecte && (brut.collecte.fin || brut.collecte.debut)));
        if (l) {
            l.setText(d ? 'Données collectées le ' + Ext.String.htmlEncode(String(d).replace('T', ' ').substring(0, 16))
                    : 'Aucune collecte enregistrée');
        }
    },

    /** Premier clic : le bouton demande confirmation ; second clic dans les 6 s : l'action. */
    confirmerDansBouton: function (b, texteConfirmation, action) {
        var maintenant = Date.now();
        if (!b.arme) {
            b.arme = maintenant;
            b.texteNormal = b.texteNormal || b.getText();
            b.setText(texteConfirmation);
            b.minuteur = setTimeout(function () {
                if (!b.isDestroyed) {
                    b.arme = false;
                    b.setText(b.texteNormal);
                }
            }, 6000);
            return;
        }
        if (maintenant - b.arme < 400) {
            return; /* un double-clic ne vaut pas confirmation */
        }
        clearTimeout(b.minuteur);
        b.arme = false;
        b.setText(b.texteNormal);
        action();
    },

    chargerOnglet: function (id) {
        var me = this;
        if (id === 'exOngletSessions') {
            me.chargerSessions();
        } else if (id === 'exOngletReappro') {
            me.reappro.loadPage(1);
        } else if (id === 'exOngletReclamations') {
            me.reclamations.load();
        } else if (id === 'exOngletNouveaux') {
            me.nouveaux.load();
        } else if (id === 'exOngletCollectes') {
            me.collectes.load();
        }
    },

    /* ---------------------------------------------------------------- sessions */

    ongletSessions: function () {
        var me = this, bloc = function (source, libelle, aide) {
            return {
                xtype: 'fieldset', title: libelle, itemId: 'exSession' + source, padding: 10,
                items: [
                    {xtype: 'label', itemId: 'exEtat' + source, text: '...'},
                    {xtype: 'container', layout: 'hbox', margin: '8 0 0 0', itemId: 'exSaisie' + source, hidden: true,
                        items: [
                            {xtype: 'textfield', itemId: 'exCookie' + source, inputType: 'password', width: 420,
                                emptyText: aide, fieldLabel: 'Cookie', labelWidth: 50},
                            {xtype: 'button', text: 'Enregistrer', margin: '0 0 0 6', handler: function () {
                                    me.definirSession(source);
                                }},
                            {xtype: 'button', text: 'Effacer la session', itemId: 'exEffacer' + source,
                                margin: '0 0 0 6', handler: function (b) {
                                    me.confirmerDansBouton(b, 'Confirmer l\'effacement', function () {
                                        me.effacerSession(source);
                                    });
                                }}
                        ]}
                ]
            };
        };
        return {
            title: 'Sessions', itemId: 'exOngletSessions', autoScroll: true, bodyPadding: 12,
            items: [
                {xtype: 'component', margin: '0 0 10 0', html: '<div style="color:#555">Connectez-vous à l\'extranet '
                            + 'dans votre navigateur, puis copiez la valeur du cookie de session (outils de '
                            + 'développement &gt; Application &gt; Cookies). Prestige la garde en mémoire du serveur '
                            + 'seulement : elle n\'est ni enregistrée, ni réaffichée, et disparaît au redémarrage. '
                            + 'Réservé à l\'administrateur.</div>'},
                bloc('UBIPHARM', 'Ubipharm Côte d\'Ivoire', 'SESSIONID=...'),
                bloc('TEDIS', 'TEDIS', 'nom=valeur; nom2=valeur2'),
                {xtype: 'label', itemId: 'exSessionsMsg'}
            ]
        };
    },

    chargerSessions: function () {
        var me = this;
        me.appel('GET', 'sessions', function (r) {
            if (!r.success) {
                me.message('#exSessionsMsg', r);
                return;
            }
            Ext.each(r.data, function (s) {
                var l = me.down('#exEtat' + s.source), saisie = me.down('#exSaisie' + s.source);
                if (l) {
                    l.setText('État : ' + (me.ETATS[s.etat] || s.etat)
                            + (s.definieLe ? ' — renseignée le ' + String(s.definieLe).replace('T', ' ').substring(0, 16)
                                    + (s.definiePar ? ' par ' + s.definiePar : '') : '')
                            + (s.derniereReussite ? ' — dernier appel réussi '
                                    + String(s.derniereReussite).replace('T', ' ').substring(0, 16) : ''));
                }
                if (saisie) {
                    saisie.setVisible(r.administrateur === true);
                }
            });
        }, me.down('#exOngletSessions'));
    },

    definirSession: function (source) {
        var me = this, champ = me.down('#exCookie' + source);
        Ext.Ajax.request({
            method: 'PUT', url: me.URL + 'sessions/' + source, jsonData: {cookies: champ.getValue()},
            callback: function (o, ok, rep) {
                champ.setValue('');
                var r = Ext.decode(rep.responseText, true) || {success: false, msg: 'Erreur ' + rep.status};
                me.message('#exSessionsMsg', r, 'Session enregistrée');
                me.chargerSessions();
            }
        });
    },

    effacerSession: function (source) {
        var me = this;
        me.appel('DELETE', 'sessions/' + source, function (r) {
            me.message('#exSessionsMsg', r, 'Session effacée');
            me.chargerSessions();
        });
    },

    /* ---------------------------------------------------------------- fiche produit */

    ongletFiche: function () {
        var me = this, lire = function (collecter) {
            var ps = me.valeur('#exPscode').toUpperCase();
            if (!ps) {
                return;
            }
            me.appel(collecter ? 'POST' : 'GET', 'ubipharm/produits/' + encodeURIComponent(ps)
                    + (collecter ? '/collecte' : ''), function (r) {
                me.message('#exFicheMsg', r, collecter ? 'Fiche lue sur l\'extranet' : 'Fiche du cache');
                me.afficherFiche(r.success ? r.fiche : null);
            }, me.down('#exOngletFiche'));
        };
        return {
            title: 'Fiche produit', itemId: 'exOngletFiche', layout: {type: 'vbox', align: 'stretch'},
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'textfield', itemId: 'exPscode', fieldLabel: 'Référence Ubipharm', labelWidth: 120,
                            width: 280, emptyText: 'ex. FAIR248', enableKeyEvents: true,
                            listeners: {specialkey: function (f, e) {
                                    if (e.getKey() === e.ENTER) {
                                        lire(false);
                                    }
                                }}},
                        {text: 'Afficher', iconCls: 'searchicon', handler: function () {
                                lire(false);
                            }},
                        {text: 'Lire sur l\'extranet', itemId: 'exFicheCollecter', handler: function () {
                                lire(true);
                            }},
                        '->', {xtype: 'label', itemId: 'exFicheMsg'}]}],
            items: [
                {xtype: 'component', itemId: 'exFicheEntete', padding: 10, html: ''},
                {xtype: 'gridpanel', flex: 1, store: me.agencesFiche, title: 'Stock par agence', columnLines: true,
                    viewConfig: {deferEmptyText: false, emptyText: '<div style="padding:12px">Aucune agence</div>'},
                    columns: [
                        {text: 'Agence', dataIndex: 'etcode', width: 80, renderer: me.texte},
                        {text: 'Libellé', dataIndex: 'etlib', flex: 1, renderer: me.texte},
                        {text: 'Stock', dataIndex: 'psstk', width: 90, align: 'right', renderer: me.connu},
                        {text: 'Colisages', dataIndex: 'colisages', width: 140, renderer: function (v) {
                                return Ext.isArray(v) ? me.texte(v.join(', ')) : me.connu(null);
                            }}
                    ]}
            ]
        };
    },

    /**
     * Base des prix Ubipharm (réponse de l'utilisateur, 07/11) : en CFA ; HT pour la parapharmacie, TTC pour les
     * médicaments. La fiche ne porte pas la catégorie : la parapharmacie est reconnue à sa TVA (taux > 0), les
     * médicaments étant exonérés. Taux inconnu : base non attribuée.
     */
    basePrix: function (taux) {
        if (taux === null || taux === undefined || taux === '' || isNaN(Number(taux))) {
            return 'CFA, HT ou TTC selon la catégorie : TVA inconnue';
        }
        return Number(taux) > 0 ? 'CFA HT, parapharmacie' : 'CFA TTC, médicament';
    },

    afficherFiche: function (f) {
        var me = this, e = me.down('#exFicheEntete'), t = me.texte, c = Ext.bind(me.connu, me);
        if (!f) {
            e.update('<div style="padding:6px;color:#7f8c8d">Aucune fiche en cache pour cette référence.</div>');
            me.agencesFiche.removeAll();
            return;
        }
        e.update('<table style="border-collapse:collapse">'
                + '<tr><td style="padding:2px 12px 2px 0"><b>' + t(f.pscode) + '</b></td><td>' + t(f.pslib) + ' '
                + t(f.pslibc) + '</td></tr>'
                + '<tr><td style="padding:2px 12px 2px 0">Code affiché</td><td>' + c(f.picode) + '</td></tr>'
                + '<tr><td style="padding:2px 12px 2px 0">Statut</td><td>' + c(f.stlib) + '</td></tr>'
                + '<tr><td style="padding:2px 12px 2px 0">Prix pspven / psppub</td><td>' + c(f.pspven) + ' / '
                + c(f.psppub) + ' <span style="color:#95a5a6">(' + me.basePrix(f.tvtaux) + ')</span></td></tr>'
                + '<tr><td style="padding:2px 12px 2px 0">TVA</td><td>' + c(f.tvtaux) + '</td></tr>'
                + '<tr><td style="padding:2px 12px 2px 0">Stock société</td><td>' + c(f.psstkSoc)
                + ' — somme des agences : ' + c(f.sommeStockAgences) + '</td></tr>'
                + '<tr><td style="padding:2px 12px 2px 0">Collectée le</td><td>'
                + t(String(f.dateCollecte || '').replace('T', ' ').substring(0, 16)) + '</td></tr></table>');
        me.agencesFiche.loadData(f.agences || []);
    },

    /* ---------------------------------------------------------------- réapprovisionnements */

    ongletReappro: function () {
        var me = this;
        return {
            title: 'Réapprovisionnements', itemId: 'exOngletReappro', layout: 'fit',
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'textfield', itemId: 'exReapproRecherche', fieldLabel: 'Produit', labelWidth: 50,
                            width: 260, emptyText: 'référence, nom ou code', enableKeyEvents: true,
                            listeners: {specialkey: function (f, e) {
                                    if (e.getKey() === e.ENTER) {
                                        me.reappro.loadPage(1);
                                    }
                                }}},
                        {text: 'Rechercher', iconCls: 'searchicon', handler: function () {
                                me.reappro.loadPage(1);
                            }},
                        {text: 'Lire sur l\'extranet', itemId: 'exReapproCollecter', handler: function () {
                                me.appel('POST', 'ubipharm/reappro/collecte', function (r) {
                                    me.message('#exReapproMsg', r, r.collecte ? r.collecte.lignesRecues
                                            + ' lignes lues sur ' + r.collecte.lignesAnnoncees : 'Terminé');
                                    me.reappro.loadPage(1);
                                }, me.down('#exOngletReappro'));
                            }},
                        '->', {xtype: 'label', itemId: 'exReapproMsg'}, {xtype: 'label', itemId: 'exReapproDate'}]}],
            items: [{xtype: 'gridpanel', store: me.reappro, columnLines: true,
                    viewConfig: {deferEmptyText: false, emptyText: '<div style="padding:12px">Aucune ligne</div>'},
                    columns: [
                        {text: 'Référence', dataIndex: 'pscode', width: 100, renderer: me.texte},
                        {text: 'Désignation', dataIndex: 'designation', flex: 1, minWidth: 220, renderer: me.texte},
                        {text: 'Code', dataIndex: 'code', width: 130, renderer: me.texte},
                        {text: 'Catégorie', dataIndex: 'categorie', width: 110, renderer: me.texte},
                        {text: 'Date affichée', dataIndex: 'dateAffichee', width: 100, renderer: me.texte},
                        {text: 'Agence', dataIndex: 'codeAgence', width: 70, renderer: me.texte},
                        {text: 'Statut', dataIndex: 'statut', width: 90, renderer: me.texte},
                        {text: 'Disponibilité par agence', dataIndex: 'disponibilites', flex: 1, minWidth: 220,
                            renderer: function (v) {
                                return Ext.Array.map(v || [], function (a) {
                                    return me.texte(a.etcode || a.etlib) + ' : ' + me.connu(a.dispo)
                                            + (a.colisageTexte ? ' (colis ' + me.texte(a.colisageTexte) + ')' : '');
                                }).join('<br>');
                            }}
                    ],
                    bbar: {xtype: 'pagingtoolbar', store: me.reappro, displayInfo: true}}]
        };
    },

    /* ---------------------------------------------------------------- réclamations */

    ongletReclamations: function () {
        var me = this;
        return {
            title: 'Réclamations', itemId: 'exOngletReclamations', layout: {type: 'vbox', align: 'stretch'},
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'combobox', itemId: 'exFiltre', fieldLabel: 'Filtre', labelWidth: 40, width: 190,
                            editable: false, queryMode: 'local', displayField: 'l', valueField: 'c', value: 'ALL',
                            store: Ext.create('Ext.data.Store', {fields: ['c', 'l'], data: [
                                    {c: 'ALL', l: 'Toutes'}, {c: 'V', l: 'En traitement'}, {c: 'C', l: 'Clôturées'}]}),
                            listeners: {select: function () {
                                    me.reclamations.load();
                                }}},
                        {text: 'Lire sur l\'extranet', itemId: 'exReclamationsCollecter', handler: function () {
                                me.appel('POST', 'ubipharm/reclamations/collecte?filtre='
                                        + me.down('#exFiltre').getValue(), function (r) {
                                    me.message('#exReclamationsMsg', r, (r.nombre || 0) + ' réclamations lues');
                                    me.reclamations.load();
                                }, me.down('#exOngletReclamations'));
                            }},
                        '->', {xtype: 'label', itemId: 'exReclamationsMsg'},
                        {xtype: 'label', itemId: 'exReclamationsDate'}]}],
            items: [
                {xtype: 'gridpanel', itemId: 'exGrilleReclamations', flex: 1, store: me.reclamations,
                    columnLines: true,
                    viewConfig: {deferEmptyText: false, emptyText: '<div style="padding:12px">Aucune réclamation</div>'},
                    columns: [
                        {text: 'Référence', dataIndex: 'reference', width: 150, renderer: me.texte},
                        {text: 'Numéros associés', dataIndex: 'numerosAssociesBrut', flex: 1, renderer: me.texte},
                        {text: 'Statut', dataIndex: 'statut', width: 120, renderer: me.texte},
                        {text: 'Envoyée le', dataIndex: 'dateEnvoiBrute', width: 100, renderer: me.texte},
                        {text: 'Mise à jour', dataIndex: 'dateMiseAJourBrute', width: 100, renderer: me.texte}
                    ],
                    listeners: {select: function (g, rec) {
                            me.reclamationChoisie = rec;
                            me.afficherReclamation(false);
                        }}},
                {xtype: 'gridpanel', itemId: 'exDetailReclamation', flex: 1, store: me.lignesReclamation,
                    title: 'Détail', columnLines: true,
                    viewConfig: {deferEmptyText: false,
                        emptyText: '<div style="padding:12px">Choisissez une réclamation, puis « Lire le détail ».</div>'},
                    tbar: [
                        {text: 'Lire le détail sur l\'extranet', itemId: 'exDetailCollecter', handler: function () {
                                me.afficherReclamation(true);
                            }},
                        {text: 'Télécharger le PDF', itemId: 'exPdfCollecter', handler: function () {
                                me.pdfReclamation();
                            }},
                        {text: 'Ouvrir le PDF', itemId: 'exPdfOuvrir', handler: function () {
                                var r = me.reclamationChoisie;
                                if (r) {
                                    window.open(me.URL + 'ubipharm/reclamations/pdf?' + me.cleReclamation(r), '_blank');
                                }
                            }},
                        '->', {xtype: 'label', itemId: 'exDetailMsg'}],
                    columns: [
                        {text: 'Référence', dataIndex: 'pscode', width: 90, renderer: me.connu},
                        {text: 'Produit', dataIndex: 'designation', flex: 1, renderer: me.texte},
                        {text: 'CIP', dataIndex: 'cip', width: 120, renderer: me.texte},
                        {text: 'Qté', dataIndex: 'quantite', width: 50, align: 'right', renderer: me.connu},
                        {text: 'Prix affiché', dataIndex: 'prixBrut', width: 100, align: 'right', renderer: me.texte},
                        {text: 'Motif', dataIndex: 'motif', flex: 1, renderer: me.texte},
                        {text: 'Demande', dataIndex: 'commentaire', flex: 1, renderer: me.texte}
                    ]}
            ]
        };
    },

    cleReclamation: function (r) {
        return Ext.Object.toQueryString({id: r.get('id'), eta: r.get('eta'), appl: r.get('appl')});
    },

    afficherReclamation: function (collecter) {
        var me = this, r = me.reclamationChoisie, d = me.down('#exDetailReclamation');
        if (!r) {
            return;
        }
        me.appel(collecter ? 'POST' : 'GET', 'ubipharm/reclamations/detail' + (collecter ? '/collecte' : '') + '?'
                + me.cleReclamation(r), function (x) {
            var rec = x.success ? x.reclamation : null;
            me.lignesReclamation.loadData(rec && rec.lignes ? rec.lignes : []);
            d.setTitle('Détail ' + me.texte(r.get('reference')) + (rec ? ' — ' + me.texte(rec.agence || '') + ' — '
                    + me.texte(rec.statut || '') + (rec.collecteLe ? ' — collecté le '
                            + me.texte(String(rec.collecteLe).substring(0, 16)) : '') : ' — pas encore lu'));
            if (collecter || !x.success) {
                me.message('#exDetailMsg', x, 'Détail lu sur l\'extranet');
            }
        }, d);
    },

    pdfReclamation: function () {
        var me = this, r = me.reclamationChoisie;
        if (!r) {
            return;
        }
        me.appel('POST', 'ubipharm/reclamations/pdf/collecte?' + me.cleReclamation(r), function (x) {
            me.message('#exDetailMsg', x, 'PDF téléchargé');
        }, me.down('#exDetailReclamation'));
    },

    /* ---------------------------------------------------------------- nouveaux produits */

    /** Résultat du dernier rapprochement, reporté sur chaque ligne de la liste (par référence). */
    appliquerRapprochement: function () {
        var me = this, parPs = me.rapprochement;
        if (!parPs) {
            return;
        }
        me.nouveaux.each(function (rec) {
            rec.set('prestige', parPs[rec.get('pscode')] || null);
        });
        me.nouveaux.commitChanges();
    },

    ongletNouveaux: function () {
        var me = this, statuts = {PSCODE: 'trouvé (référence Ubipharm de la fiche)', CIP: 'trouvé (CIP)',
            PLUSIEURS: 'plusieurs articles', INTROUVABLE: 'absent de Prestige'};
        return {
            title: 'Nouveaux produits', itemId: 'exOngletNouveaux', layout: 'fit',
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {text: 'Lire sur l\'extranet', itemId: 'exNouveauxCollecter', handler: function () {
                                me.appel('POST', 'ubipharm/nouveaux/collecte', function (r) {
                                    me.message('#exNouveauxMsg', r, r.collecte && r.collecte.statut === 'PARTIELLE'
                                            ? 'Liste peut-être incomplète (pagination visible)' : 'Liste lue');
                                    me.nouveaux.load();
                                }, me.down('#exOngletNouveaux'));
                            }},
                        {text: 'Rapprocher avec Prestige', itemId: 'exRapprocher', handler: function () {
                                me.appel('GET', 'ubipharm/nouveaux/rapprochement', function (r) {
                                    var parPs = {};
                                    Ext.each(r.data || [], function (x) {
                                        parPs[x.pscode] = x;
                                    });
                                    me.rapprochement = r.success ? parPs : null;
                                    me.appliquerRapprochement();
                                    me.message('#exNouveauxMsg', r, 'Rapprochement fait (aucun article modifié)');
                                }, me.down('#exOngletNouveaux'));
                            }},
                        '->', {xtype: 'label', itemId: 'exNouveauxMsg'}, {xtype: 'label', itemId: 'exNouveauxDate'}]}],
            items: [{xtype: 'gridpanel', store: me.nouveaux, columnLines: true,
                    viewConfig: {deferEmptyText: false, emptyText: '<div style="padding:12px">Aucun produit</div>'},
                    columns: [
                        {text: 'Référence', dataIndex: 'pscode', width: 100, renderer: me.texte},
                        {text: 'Désignation', dataIndex: 'designation', flex: 1, minWidth: 220, renderer: me.texte},
                        {text: 'CIP', dataIndex: 'cip', width: 130, renderer: me.texte},
                        {text: 'Catégorie', dataIndex: 'categorie', width: 110, renderer: me.texte},
                        {text: 'Date', dataIndex: 'dateAffichee', width: 90, renderer: me.texte},
                        {text: 'Mouvement', dataIndex: 'mouvement', width: 110, renderer: me.texte},
                        {text: 'Disponibilité', dataIndex: 'disponibilite', width: 100, renderer: me.connu},
                        {text: 'Prestige', dataIndex: 'prestige', width: 230, renderer: function (v) {
                                if (!v) {
                                    return '';
                                }
                                var noms = Ext.Array.map(v.candidats || [], function (a) {
                                    return me.texte(a.nom);
                                }).join(', ');
                                return me.texte(statuts[v.statut] || v.statut) + (noms ? ' : ' + noms : '');
                            }}
                    ]}]
        };
    },

    /* ---------------------------------------------------------------- journal des collectes */

    ongletCollectes: function () {
        var me = this;
        return {
            title: 'Collectes', itemId: 'exOngletCollectes', layout: 'fit',
            items: [{xtype: 'gridpanel', store: me.collectes, columnLines: true,
                    viewConfig: {deferEmptyText: false, emptyText: '<div style="padding:12px">Aucune collecte</div>'},
                    columns: [
                        {text: 'Début', dataIndex: 'debut', width: 140, renderer: me.texte},
                        {text: 'Module', dataIndex: 'module', width: 150, renderer: me.texte},
                        {text: 'Paramètres', dataIndex: 'parametres', width: 170, renderer: me.texte},
                        {text: 'Statut', dataIndex: 'statut', width: 90, renderer: me.texte},
                        {text: 'Annoncées', dataIndex: 'lignesAnnoncees', width: 85, align: 'right',
                            renderer: me.texte},
                        {text: 'Reçues', dataIndex: 'lignesRecues', width: 70, align: 'right', renderer: me.texte},
                        {text: 'Utilisateur', dataIndex: 'utilisateur', width: 100, renderer: me.texte},
                        {text: 'Message', dataIndex: 'message', flex: 1, renderer: me.texte}
                    ],
                    tbar: [{text: 'Actualiser', handler: function () {
                                me.collectes.load();
                            }}]}]
        };
    }
});
