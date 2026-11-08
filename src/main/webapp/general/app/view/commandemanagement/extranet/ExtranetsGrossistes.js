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
        me.rafraichissement = Ext.create('Ext.data.Store', {
            fields: ['source', 'code', 'libelle', 'delai', 'derniereComplete', 'dernierEssai', 'statutDernierEssai',
                'prochaine'],
            pageSize: 1000,
            proxy: {type: 'ajax', url: me.URL + 'rafraichissement', reader: {type: 'json', root: 'data'}}
        });
        me.rechercheUbipharm = Ext.create('Ext.data.Store', {fields: ['pscode', 'designation', 'cip', 'statut', 'dispo',
                'prix', 'colisage']});

        /* un onglet par grossiste (chacun a ses propres pages), rangé par rubrique comme sur son extranet */
        var rubrique = function (titre, itemId, onglets) {
            return {xtype: 'tabpanel', title: titre, itemId: itemId, plain: true, items: onglets,
                listeners: {tabchange: function (tp, onglet) {
                        me.chargerActif(onglet);
                    }}};
        };
        Ext.apply(me, {
            items: [{
                    xtype: 'tabpanel', itemId: 'exOnglets', plain: true,
                    items: [me.ongletSessions(),
                        rubrique('Ubipharm', 'exOngletUbipharm', [
                            rubrique('Produits', 'exRubriqueProduits', [me.ongletFiche(),
                                me.ongletListe('PROMOTIONS', 'Promotions'),
                                me.ongletListe('PRODUITS_UG', 'Produits avec UG'), me.ongletNouveaux(),
                                me.ongletListe('PRODUITS_SUPPRIMES', 'Produits supprimés'), me.ongletReappro()]),
                            rubrique('Vos documents', 'exRubriqueDocuments', [
                                me.ongletListe('FACTURES', 'Factures non relevées'),
                                me.ongletListe('RELEVES', 'Derniers relevés'),
                                me.ongletListe('AVOIRS', 'Récapitulatifs d\'avoirs')]),
                            rubrique('Commandes', 'exRubriqueCommandes', [
                                me.ongletListe('DERNIERES_COMMANDES', 'Vos dernières commandes'),
                                me.ongletListe('COMMANDES_EXTRANET', 'Vos commandes extranet'),
                                me.ongletListe('PLUS_ACHETES', 'Les plus achetés')]),
                            me.ongletReclamations()]),
                        rubrique('TEDIS', 'exOngletTedis', [
                            rubrique('Produits', 'exRubriqueTedisProduits', [
                                me.ongletListe('TEDIS_CATALOGUE', 'Notre catalogue produits'),
                                me.ongletListe('TEDIS_MISES_EN_PLACE', 'Nos mises en place'),
                                me.ongletListe('TEDIS_SORTIES_RUPTURE', 'Nos sorties de rupture')]),
                            rubrique('Réclamations', 'exRubriqueTedisReclamations', [
                                me.ongletListe('TEDIS_RECLAMATIONS', 'Historique de vos réclamations')]),
                            rubrique('Vos documents', 'exRubriqueTedisDocuments', [
                                me.ongletListe('TEDIS_BL_QUINZAINE', 'B.L.V par quinzaine'),
                                me.ongletListe('TEDIS_FACTURES_QUINZAINE', 'Facture de quinzaine')]),
                            rubrique('Commandes', 'exRubriqueTedisCommandes', [
                                me.ongletListe('TEDIS_COMMANDES_ATTENTE', 'Commandes en attente'),
                                me.ongletListe('TEDIS_HISTORIQUE_COMMANDES', 'Historique de vos commandes'),
                                me.ongletListe('TEDIS_PROMOS_LABO', 'Promotions laboratoire'),
                                me.ongletListe('TEDIS_PROMOS_EXCLUSIVES', 'Promotions exclusives')])]),
                        me.ongletCollectes(), me.ongletRafraichissement()],
                    listeners: {
                        tabchange: function (tp, onglet) {
                            me.chargerActif(onglet);
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

    /** Onglet affiché : descend jusqu'au sous-onglet actif des rubriques, puis le charge. */
    chargerActif: function (onglet) {
        var me = this;
        while (onglet && onglet.isXType && onglet.isXType('tabpanel')) {
            onglet = onglet.getActiveTab() || onglet.items.getAt(0);
        }
        if (!onglet) {
            return;
        }
        if (onglet.listeCode) {
            me.chargerListe(onglet.listeCode, false);
        } else {
            me.chargerOnglet(onglet.itemId);
        }
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
        } else if (id === 'exOngletRafraichissement') {
            me.rafraichissement.load();
        }
    },

    /* ---------------------------------------------------------------- sessions */

    ongletSessions: function () {
        var me = this, bloc = function (source, libelle, aide) {
            return {
                xtype: 'fieldset', title: libelle, itemId: 'exSession' + source, padding: 10,
                items: [
                    {xtype: 'label', itemId: 'exEtat' + source, text: '...'},
                    {xtype: 'component', itemId: 'exCompteEtat' + source, margin: '6 0 0 0', html: ''},
                    {xtype: 'container', layout: 'hbox', margin: '8 0 0 0', itemId: 'exCompte' + source, hidden: true,
                        items: [
                            {xtype: 'textfield', itemId: 'exIdentifiant' + source, width: 260, maxLength: 200,
                                fieldLabel: 'Identifiant', labelWidth: 70, enforceMaxLength: true,
                                inputAttrTpl: 'autocomplete="off"'},
                            {xtype: 'textfield', itemId: 'exMotDePasse' + source, inputType: 'password', width: 260,
                                maxLength: 200, enforceMaxLength: true, fieldLabel: 'Mot de passe', labelWidth: 80,
                                margin: '0 0 0 8', inputAttrTpl: 'autocomplete="new-password"'},
                            {xtype: 'textfield', itemId: 'exPage' + source, width: 230, maxLength: 1000,
                                enforceMaxLength: true, fieldLabel: 'Page de connexion', labelWidth: 110,
                                margin: '0 0 0 8', emptyText: '/ (par défaut)'},
                            {xtype: 'textfield', itemId: 'exChamp' + source, width: 190, maxLength: 100,
                                enforceMaxLength: true, fieldLabel: 'Nom de la case', labelWidth: 95,
                                margin: '0 0 0 8', emptyText: 'laisser vide',
                                labelAttrTpl: 'data-qtip="Réglage technique, à laisser vide : Prestige trouve seul la'
                                    + ' case de l\'identifiant. Ne saisissez pas votre identifiant ici."'},
                            {xtype: 'button', text: 'Enregistrer', itemId: 'exCompteEnregistrer' + source,
                                margin: '0 0 0 6', handler: function () {
                                    me.enregistrerCompte(source);
                                }},
                            {xtype: 'button', text: 'Se connecter', itemId: 'exConnecter' + source,
                                margin: '0 0 0 6', handler: function () {
                                    me.seConnecter(source);
                                }},
                            {xtype: 'button', text: 'Effacer les identifiants', itemId: 'exCompteEffacer' + source,
                                margin: '0 0 0 6', handler: function (b) {
                                    me.confirmerDansBouton(b, 'Confirmer l\'effacement', function () {
                                        me.effacerCompte(source);
                                    });
                                }}
                        ]},
                    {xtype: 'container', layout: 'hbox', margin: '8 0 0 0', itemId: 'exSaisie' + source, hidden: true,
                        items: [
                            {xtype: 'textfield', itemId: 'exCookie' + source, inputType: 'password', width: 420,
                                emptyText: aide, fieldLabel: 'ou cookie', labelWidth: 60},
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
                {xtype: 'component', margin: '0 0 10 0', html: '<div style="color:#555">Saisissez l\'identifiant et '
                            + 'le mot de passe de chaque extranet : Prestige se connecte seul et se reconnecte quand '
                            + 'la session expire. Le mot de passe est chiffré sur le serveur et n\'est jamais '
                            + 'réaffiché (laisser le champ vide garde l\'ancien). En secours, un cookie de session '
                            + 'copié depuis le navigateur peut être collé. Réservé à l\'administrateur.</div>'},
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
            me.reconnexions = me.reconnexions || {};
            Ext.each(r.data, function (s) {
                var l = me.down('#exEtat' + s.source), saisie = me.down('#exSaisie' + s.source),
                        c = s.compte || {}, ouverte = s.etat === 'VALIDE' || s.etat === 'A_VERIFIER',
                        /* identifiants enregistres, aucune session (serveur redemarre, session expiree) : connexion
                         * seule, une fois par ouverture de l'ecran, jamais apres un refus */
                        aConnecter = r.administrateur === true && c.enregistre && !ouverte && !s.echecConnexion
                                && !me.reconnexions[s.source];
                if (l) {
                    l.setText(me.libelleEtat(s, aConnecter), false);
                }
                if (aConnecter) {
                    me.reconnexions[s.source] = true;
                    me.appel('POST', 'comptes/' + s.source + '/connexion', function () {
                        me.chargerSessions();
                    }, me.down('#exSession' + s.source));
                }
                if (saisie) {
                    saisie.setVisible(r.administrateur === true);
                }
                me.afficherCompte(s, r.administrateur === true);
            });
        }, me.down('#exOngletSessions'));
    },

    /** État de la session en clair : Connecté / Non connecté / Session expirée, avec la raison. */
    libelleEtat: function (s, connexionEnCours) {
        var c = s.compte || {}, h = function (v) {
            return Ext.String.htmlEncode(String(v).replace('T', ' ').substring(0, 16));
        }, couleur, texte;
        if (s.etat === 'VALIDE' || s.etat === 'A_VERIFIER') {
            couleur = '#27ae60';
            texte = '✓ Connecté' + (s.mode === 'CONNEXION' ? ' automatiquement' : ' (cookie collé)')
                    + (s.definieLe ? ' depuis le ' + h(s.definieLe) : '')
                    + (s.derniereReussite ? ' — dernier appel réussi ' + h(s.derniereReussite) : '');
        } else if (connexionEnCours) {
            couleur = '#555';
            texte = 'Connexion en cours…';
        } else if (s.echecConnexion) {
            couleur = '#c0392b';
            texte = '✗ Non connecté : ' + Ext.String.htmlEncode(s.echecConnexion);
        } else if (s.etat === 'EXPIREE') {
            couleur = '#d35400';
            texte = 'Session expirée' + (c.enregistre ? ' — reconnexion automatique à la prochaine lecture'
                    : ' : enregistrez les identifiants ou collez un cookie');
        } else {
            couleur = '#555';
            texte = 'Non connecté' + (c.enregistre ? ' — cliquez « Se connecter »'
                    : ' : enregistrez l\'identifiant et le mot de passe');
        }
        return '<b style="color:' + couleur + '">État : ' + texte + '</b>';
    },

    afficherCompte: function (s, admin) {
        var me = this, c = s.compte || {}, etat = me.down('#exCompteEtat' + s.source),
                bloc = me.down('#exCompte' + s.source), id = me.down('#exIdentifiant' + s.source),
                h = function (v) {
                    return Ext.String.htmlEncode(String(v).replace('T', ' ').substring(0, 16));
                };
        if (etat) {
            etat.update(c.enregistre
                    ? 'Identifiants enregistrés : <b>' + Ext.String.htmlEncode(c.identifiant || '') + '</b>, mot de passe '
                    + (c.motDePasseEnregistre ? 'enregistré' : 'absent')
                    + (c.pageConnexion ? ' — page de connexion ' + Ext.String.htmlEncode(c.pageConnexion)
                            : c.pageConnexionParDefaut ? ' — page de connexion par défaut ' + Ext.String.htmlEncode(c.pageConnexionParDefaut) : '')
                    + (c.modifieLe ? ' — modifiés le ' + h(c.modifieLe) + (c.modifiePar ? ' par '
                            + Ext.String.htmlEncode(c.modifiePar) : '') : '')
                    + (s.mode === 'CONNEXION' && s.derniereConnexion && !s.echecConnexion
                            ? '<br><span style="color:#27ae60">Connecté automatiquement le ' + h(s.derniereConnexion)
                            + '</span>' : '')
                    + (s.echecConnexion ? '<br><span style="color:#c0392b">Dernière connexion échouée : '
                            + Ext.String.htmlEncode(s.echecConnexion) + '</span>' : '')
                    : 'Aucun identifiant enregistré');
        }
        if (bloc) {
            bloc.setVisible(admin);
        }
        /* page vide : celle par défaut de l'extranet est utilisée, et montrée dans le champ */
        var page = me.down('#exPage' + s.source);
        if (page) {
            page.emptyText = c.pageConnexionParDefaut ? 'par défaut : ' + c.pageConnexionParDefaut : '/ (par défaut)';
            page.applyEmptyText();
        }
        Ext.each([[id, c.identifiant], [me.down('#exPage' + s.source), c.pageConnexion],
            [me.down('#exChamp' + s.source), c.champIdentifiant]], function (x) {
            if (x[0] && !x[0].isDirty() && !x[0].hasFocus) {
                x[0].setValue(x[1] || '');
                x[0].resetOriginalValue();
            }
        });
        var connecter = me.down('#exConnecter' + s.source), effacer = me.down('#exCompteEffacer' + s.source);
        if (connecter) {
            connecter.setDisabled(!c.enregistre);
        }
        if (effacer) {
            effacer.setDisabled(!c.enregistre);
        }
    },

    enregistrerCompte: function (source) {
        var me = this, id = me.down('#exIdentifiant' + source), mdp = me.down('#exMotDePasse' + source),
                b = me.down('#exCompteEnregistrer' + source);
        clearTimeout(b.minuteurEtat);
        b.setText('Enregistrer');
        b.disable();
        Ext.Ajax.request({
            method: 'PUT', url: me.URL + 'comptes/' + source,
            jsonData: {identifiant: Ext.String.trim(id.getValue() || ''), motDePasse: mdp.getValue() || '',
                pageConnexion: Ext.String.trim(me.down('#exPage' + source).getValue() || ''),
                champIdentifiant: Ext.String.trim(me.down('#exChamp' + source).getValue() || '')},
            callback: function (o, ok, rep) {
                mdp.setValue('');
                var r = Ext.decode(rep.responseText, true) || {success: false, msg: 'Erreur ' + rep.status};
                if (!r.success) {
                    b.enable();
                    me.message('#exSessionsMsg', r);
                    me.chargerSessions();
                    return;
                }
                id.resetOriginalValue();
                me.down('#exPage' + source).resetOriginalValue();
                me.down('#exChamp' + source).resetOriginalValue();
                /* enregistres : connexion aussitot, resultat marque dans le bouton (demande du 08/11) */
                b.setText('Connexion…');
                me.appel('POST', 'comptes/' + source + '/connexion', function (c) {
                    b.enable();
                    b.setText(c.success ? '✓ Connecté' : '✗ Non connecté');
                    b.minuteurEtat = setTimeout(function () {
                        if (!b.isDestroyed) {
                            b.setText('Enregistrer');
                        }
                    }, 15000);
                    me.message('#exSessionsMsg', c.success ? c : {success: false,
                        msg: 'Identifiants enregistrés, mais connexion impossible : ' + (c.msg || 'erreur')},
                            'Identifiants enregistrés — connecté à l\'extranet');
                    me.chargerSessions();
                }, me.down('#exSession' + source));
            }
        });
    },

    seConnecter: function (source) {
        var me = this;
        me.appel('POST', 'comptes/' + source + '/connexion', function (r) {
            me.message('#exSessionsMsg', r, 'Connecté à l\'extranet');
            me.chargerSessions();
        }, me.down('#exSession' + source));
    },

    effacerCompte: function (source) {
        var me = this;
        me.appel('DELETE', 'comptes/' + source, function (r) {
            Ext.each(['#exIdentifiant', '#exPage', '#exChamp'], function (sel) {
                var f = me.down(sel + source);
                if (f) {
                    f.setValue('');
                    f.resetOriginalValue();
                }
            });
            me.message('#exSessionsMsg', r, 'Identifiants effacés');
            me.chargerSessions();
        });
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
        /* session effacee a la main : pas de reconnexion seule dans la foulee */
        me.reconnexions = me.reconnexions || {};
        me.reconnexions[source] = true;
        me.appel('DELETE', 'sessions/' + source, function (r) {
            me.message('#exSessionsMsg', r, 'Session effacée');
            me.chargerSessions();
        });
    },

    /* ---------------------------------------------------------------- fiche produit */

    /** Référence Ubipharm (ex. FAIR248, ACEC108) : lettres puis chiffres ; sinon la saisie est une recherche. */
    estReferenceUbipharm: function (v) {
        return /^[A-Za-z]{3,6}[0-9]{2,5}$/.test(v || '');
    },

    rechercherUbipharm: function () {
        var me = this, motif = me.valeur('#exPscode'), grille = me.down('#exRechercheGrille');
        if (motif.length < 2) {
            me.message('#exFicheMsg', {success: false, msg: 'Saisissez au moins 2 caractères'});
            return;
        }
        me.appel('GET', 'ubipharm/recherche?motif=' + encodeURIComponent(motif) + '&champs='
                + me.down('#exRechercheChamps').getValue() + '&enStock=' + me.down('#exRechercheStock').getValue(),
                function (r) {
                    me.rechercheUbipharm.loadData(r.success ? r.resultats : []);
                    grille.setVisible(true);
                    grille.setTitle('Résultats de la recherche Ubipharm' + (r.success ? ' : ' + r.total + ' produit(s)'
                            + (r.tronque ? ', ' + r.resultats.length + ' affichés : affinez' : '') : ''));
                    me.message('#exFicheMsg', r, r.total + ' produit(s) trouvé(s) — cliquez une ligne pour sa fiche');
                }, me.down('#exOngletFiche'));
    },

    ongletFiche: function () {
        var me = this, lire = function (collecter) {
            var ps = me.valeur('#exPscode').toUpperCase();
            if (!ps) {
                return;
            }
            if (!me.estReferenceUbipharm(ps)) {
                me.rechercherUbipharm();
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
                        {xtype: 'textfield', itemId: 'exPscode', fieldLabel: 'Référence, CIP, nom ou DCI', labelWidth: 160,
                            width: 380, emptyText: 'ex. FAIR248, 3000000786710, paracetamol', enableKeyEvents: true,
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
                        {text: 'Rechercher', itemId: 'exRechercher', handler: function () {
                                me.rechercherUbipharm();
                            }},
                        {xtype: 'combo', itemId: 'exRechercheChamps', width: 130, editable: false, value: 'TOUT',
                            store: [['TOUT', 'CIP, nom et DCI'], ['CIP_LIBELLE', 'CIP ou nom'], ['DCI', 'DCI']]},
                        {xtype: 'checkbox', itemId: 'exRechercheStock', boxLabel: 'En stock seulement', margin: '0 0 0 6'},
                        '->', {xtype: 'label', itemId: 'exFicheMsg'}]}],
            items: [
                {xtype: 'gridpanel', itemId: 'exRechercheGrille', hidden: true, height: 230, columnLines: true,
                    store: me.rechercheUbipharm, title: 'Résultats de la recherche Ubipharm',
                    viewConfig: {deferEmptyText: false, emptyText: '<div style="padding:12px">Aucun produit</div>'},
                    columns: [
                        {text: 'Référence', dataIndex: 'pscode', width: 90, renderer: me.texte},
                        {text: 'Désignation', dataIndex: 'designation', flex: 2, renderer: me.texte},
                        {text: 'CIP', dataIndex: 'cip', width: 120, renderer: me.texte},
                        {text: 'Statut', dataIndex: 'statut', width: 90, renderer: me.texte},
                        {text: 'Disponibilité', dataIndex: 'dispo', flex: 2, renderer: me.texte},
                        {text: 'Prix', dataIndex: 'prix', flex: 1, renderer: me.texte},
                        {text: 'Colisage', dataIndex: 'colisage', width: 70, renderer: me.texte}],
                    listeners: {itemclick: function (v, rec) {
                            me.down('#exPscode').setValue(rec.get('pscode'));
                            lire(true);
                        }}},
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

    /* ---------------------------------------------------------------- listes Ubipharm */

    /**
     * Liste lue sur l'extranet (promotions, documents, commandes...) : colonnes données par le serveur, cache de
     * Prestige affiché avec la date de sa collecte, recherche dans toutes les colonnes.
     */
    ongletListe: function (code, titre) {
        var me = this, id = 'exListe' + code;
        me.listes = me.listes || {};
        me.listes[code] = Ext.create('Ext.data.Store', {fields: ['position', 'pscode', 'cip', 'agence', 'cellules']});
        return {
            title: titre, itemId: id, listeCode: code, layout: 'fit',
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {text: 'Lire sur l\'extranet', itemId: id + 'Collecter', handler: function () {
                                me.chargerListe(code, true);
                            }},
                        {xtype: 'textfield', itemId: id + 'Recherche', emptyText: 'Rechercher', width: 220,
                            listeners: {change: function () {
                                    me.filtrerListe(code);
                                }}},
                        '->', {xtype: 'label', itemId: id + 'Msg'}, {xtype: 'tbspacer', width: 12},
                        {xtype: 'label', itemId: id + 'Nombre'}, {xtype: 'tbspacer', width: 12},
                        {xtype: 'label', itemId: id + 'Date'}]}],
            items: [{xtype: 'gridpanel', itemId: id + 'Grille', store: me.listes[code], columnLines: true,
                    viewConfig: {deferEmptyText: false,
                        emptyText: '<div style="padding:12px">Aucune ligne. « Lire sur l\'extranet » lit la liste.</div>'},
                    columns: []}]
        };
    },

    /** Affiche le cache (collecter : lit d'abord l'extranet). */
    chargerListe: function (code, collecter) {
        var me = this, id = 'exListe' + code, panneau = me.down('#' + id);
        var racine = code.indexOf('TEDIS_') === 0 ? 'tedis/listes/' : 'ubipharm/listes/';
        me.appel(collecter ? 'POST' : 'GET', racine + code + (collecter ? '/collecte' : ''), function (r) {
            if (r.success) {
                me.afficherListe(code, r);
            }
            if (collecter || !r.success) {
                me.message('#' + id + 'Msg', r, 'Liste lue');
            }
        }, panneau);
    },

    afficherListe: function (code, r) {
        var me = this, id = 'exListe' + code, grille = me.down('#' + id + 'Grille'), colonnes = [];
        Ext.each(r.colonnes || [], function (titre, i) {
            colonnes.push({text: me.texte(titre), dataIndex: 'cellules', minWidth: 80,
                flex: /Produit|Libellé|Description|Disponibilité|Paliers|Prix/.test(titre) ? 2 : 1,
                renderer: function (v) {
                    return me.texte(v ? v[i] : '');
                }});
        });
        grille.reconfigure(me.listes[code], colonnes);
        me.donnees = me.donnees || {};
        me.donnees[code] = r.lignes || [];
        me.filtrerListe(code);
        me.afficherDate('#' + id + 'Date', r);
    },

    /** Lignes affichées au plus : le catalogue TEDIS (près de 17 000 produits) figerait la grille. */
    AFFICHAGE_MAX: 500,

    /** Recherche dans toutes les colonnes ; au-delà de AFFICHAGE_MAX lignes trouvées, les premières sont affichées. */
    filtrerListe: function (code) {
        var me = this, id = 'exListe' + code, st = me.listes[code], tout = (me.donnees || {})[code] || [],
                q = Ext.String.trim(me.valeur('#' + id + 'Recherche')).toLowerCase(), nombre = me.down('#' + id + 'Nombre'),
                trouves = !q ? tout : Ext.Array.filter(tout, function (l) {
                    return (l.cellules || []).join(' ').toLowerCase().indexOf(q) >= 0;
                });
        st.loadData(trouves.slice(0, me.AFFICHAGE_MAX));
        if (nombre) {
            nombre.setText(trouves.length + (q ? ' / ' + tout.length : '') + ' ligne(s)'
                    + (trouves.length > me.AFFICHAGE_MAX ? ' — ' + me.AFFICHAGE_MAX + ' affichées : affinez la recherche'
                            : ''));
        }
    },

    /* ---------------------------------------------------------------- rafraîchissement automatique */

    DELAIS: [[0, 'Jamais'], [30, '30 min'], [60, '1 h'], [120, '2 h'], [240, '4 h'], [480, '8 h'], [720, '12 h'],
        [1440, '24 h']],

    libelleDelai: function (v) {
        var r = 'Jamais';
        Ext.each(this.DELAIS, function (d) {
            if (d[0] === Number(v)) {
                r = d[1];
            }
        });
        return r;
    },

    /**
     * Délai de relecture de chaque liste (demande du 08/11) : Prestige relit seul les listes réglées et garde la
     * dernière lecture complète en base, consultable sans Internet. Modification enregistrée dès le choix.
     */
    ongletRafraichissement: function () {
        var me = this, date = function (v) {
            return me.texte(v ? String(v).replace('T', ' ').substring(0, 16) : '');
        }, edition = Ext.create('Ext.grid.plugin.CellEditing', {clicksToEdit: 1});
        return {
            title: 'Rafraîchissement', itemId: 'exOngletRafraichissement', layout: 'fit',
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'component', html: '<span style="color:#555">Les listes réglées sont relues seules '
                                    + '(toutes les 10 min, la tâche vérifie les délais) et gardées en base : elles '
                                    + 'restent consultables sans Internet. Après un échec, nouvel essai 30 min plus '
                                    + 'tard au plus tôt.</span>'},
                        '->', {xtype: 'label', itemId: 'exRafraichissementMsg'}]}],
            items: [{xtype: 'gridpanel', itemId: 'exRafraichissementGrille', store: me.rafraichissement,
                    columnLines: true, plugins: [edition],
                    viewConfig: {deferEmptyText: false, emptyText: '<div style="padding:12px">Aucune liste</div>'},
                    columns: [
                        {text: 'Grossiste', dataIndex: 'source', width: 105, renderer: me.texte},
                        {text: 'Liste', dataIndex: 'libelle', flex: 1, renderer: me.texte},
                        {text: 'Relire tous les', dataIndex: 'delai', width: 120,
                            renderer: function (v) {
                                return '<b>' + me.texte(me.libelleDelai(v)) + '</b> ▾';
                            },
                            /* le choix dans la liste enregistre aussitôt, sans Entrée ni clic ailleurs */
                            editor: {xtype: 'combo', editable: false, store: me.DELAIS, queryMode: 'local',
                                listeners: {select: function () {
                                        edition.completeEdit();
                                    }}}},
                        {text: 'Dernière lecture complète', dataIndex: 'derniereComplete', width: 185, renderer: date},
                        {text: 'Dernier essai', dataIndex: 'dernierEssai', width: 130, renderer: date},
                        {text: 'Résultat', dataIndex: 'statutDernierEssai', width: 110, renderer: me.texte},
                        {text: 'Prochaine lecture', dataIndex: 'prochaine', width: 140, renderer: date}],
                    listeners: {edit: function (ed, e) {
                            if (e.field !== 'delai' || e.value === e.originalValue) {
                                return;
                            }
                            me.definirDelai(e.record, e.value);
                        }}}]
        };
    },

    definirDelai: function (rec, delai) {
        var me = this;
        Ext.Ajax.request({
            method: 'PUT', url: me.URL + 'rafraichissement/' + rec.get('code'), jsonData: {delai: delai},
            callback: function (o, ok, rep) {
                var r = Ext.decode(rep.responseText, true) || {success: false, msg: 'Erreur ' + rep.status};
                me.message('#exRafraichissementMsg', r, rec.get('libelle') + ' : ' + me.libelleDelai(delai)
                        + ' — enregistré');
                me.rafraichissement.load();
            }
        });
    },

    /* ---------------------------------------------------------------- journal des collectes */

    ongletCollectes: function () {
        var me = this;
        return {
            title: 'Collectes', itemId: 'exOngletCollectes', layout: 'fit',
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'combo', itemId: 'exCollectesSource', fieldLabel: 'Grossiste', labelWidth: 65, width: 190,
                            editable: false, value: 'UBIPHARM', store: [['UBIPHARM', 'Ubipharm'], ['TEDIS', 'TEDIS']],
                            listeners: {change: function (c, v) {
                                    me.collectes.getProxy().url = me.URL + v + '/collectes';
                                    me.collectes.load();
                                }}}]}],
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
