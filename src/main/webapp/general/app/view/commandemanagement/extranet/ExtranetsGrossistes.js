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
                    var n = me.down('#exNouveauxNombre');
                    if (n) {
                        n.setText('<b>' + st.getCount() + '</b> produit(s)', false);
                    }
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
        me.grossistesLies = Ext.create('Ext.data.Store', {fields: ['id', 'libelle', 'code', 'actif', 'source',
                'propose', 'modifieLe', 'modifiePar', 'avant']});
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
                    xtype: 'tabpanel', itemId: 'exOnglets', plain: true, activeTab: 1,
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
                        rubrique('Copharmed', 'exOngletCopharmed', [
                            rubrique('Promotions', 'exRubriqueCopharmedPromotions', [
                                me.ongletListe('COPHARMED_PROMOTIONS', 'Promotion')]),
                            rubrique('Produits', 'exRubriqueCopharmedProduits', [me.ongletRechercheCopharmed(),
                                me.ongletListe('COPHARMED_CATALOGUE', 'Catalogue produits')])]),
                        rubrique('DPCI', 'exOngletDpci', [
                            rubrique('Mes offres en cours', 'exRubriqueDpciOffres', [
                                me.ongletListe('DPCI_OFFRES', 'Offres en cours')]),
                            rubrique('Mes commandes', 'exRubriqueDpciCommandes', [
                                me.ongletListe('DPCI_COMMANDES', 'Mes commandes')]),
                            rubrique('Mes documents', 'exRubriqueDpciDocuments', [
                                me.ongletListe('DPCI_BL', 'Bons de livraison'),
                                me.ongletListe('DPCI_FACTURES', 'Factures'),
                                me.ongletListe('DPCI_RELEVES', 'Relevés'),
                                me.ongletListe('DPCI_AVOIRS', 'Avoirs')]),
                            rubrique('Mes réclamations', 'exRubriqueDpciReclamations', [
                                me.ongletListe('DPCI_RECLAMATIONS', 'Mes réclamations')])]),
                        Ext.apply(me.panneauMayite('exMayite'), {title: 'Mayité'}),
                        me.ongletCollectes(), me.ongletRafraichissement(), me.ongletGrossistesLies()],
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

    /**
     * Contenu complet au survol d'une cellule (demande du 08/11 : colonnes étroites). Encodé deux fois : l'attribut est
     * décodé par le navigateur, puis la bulle affiche du HTML ; le texte de l'extranet reste du texte.
     */
    bulle: function (meta, v) {
        var s = v === null || v === undefined ? '' : String(v);
        if (meta && s) {
            meta.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(Ext.String.htmlEncode(s)) + '"';
        }
    },

    texte: function (v, meta) {
        testextjs.view.commandemanagement.extranet.ExtranetsGrossistes.prototype.bulle(meta, v);
        return v === null || v === undefined ? '' : Ext.String.htmlEncode(String(v));
    },

    /** Valeur inconnue : affichée « inconnu », jamais 0. */
    connu: function (v, meta) {
        testextjs.view.commandemanagement.extranet.ExtranetsGrossistes.prototype.bulle(meta, v);
        return v === null || v === undefined ? '<span style="color:#95a5a6">inconnu</span>'
                : Ext.String.htmlEncode(String(v));
    },

    /** Disponibilité : « oui », « disponible », « en stock » en vert ; « non », « rupture »... en rouge (08/11). */
    DISPO_OUI: /^\s*(oui|disponible|en stock|stock disponible)/i,
    DISPO_NON: /^\s*(non|indisponible|rupture|en rupture|épuisé|hors stock|pas de stock)/i,

    dispo: function (v, meta) {
        var p = testextjs.view.commandemanagement.extranet.ExtranetsGrossistes.prototype,
                s = v === null || v === undefined ? '' : String(v), couleur = p.DISPO_OUI.test(s) ? '#1e8449'
                : p.DISPO_NON.test(s) ? '#c0392b' : null;
        p.bulle(meta, s);
        if (v === null || v === undefined) {
            return '<span style="color:#95a5a6">inconnu</span>';
        }
        return couleur ? '<span style="color:' + couleur + ';font-weight:bold">' + Ext.String.htmlEncode(s) + '</span>'
                : Ext.String.htmlEncode(s);
    },

    valeur: function (sel) {
        var c = this.down(sel);
        return c ? Ext.String.trim(c.getValue() || '') : '';
    },

    /** Délai d'une lecture complète de liste : les offres DPCI ou les promotions Copharmed prennent plusieurs minutes. */
    DELAI_COLLECTE: 1200000,

    appel: function (methode, url, rappel, masque, delai) {
        var me = this, cible = masque || me;
        cible.setLoading(delai ? 'Lecture sur l\'extranet en cours : cela peut prendre plusieurs minutes...'
                : 'Lecture en cours...');
        Ext.Ajax.request({
            method: methode, url: me.URL + url, timeout: delai || 300000,
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

    /** Appel sans masque (suivi d'une lecture en arrière-plan : l'onglet reste utilisable). */
    appelDiscret: function (methode, url, rappel) {
        var me = this;
        Ext.Ajax.request({
            method: methode, url: me.URL + url, timeout: 60000,
            success: function (rep) {
                rappel(Ext.decode(rep.responseText, true) || {success: false, msg: 'Réponse illisible'});
            },
            failure: function (rep) {
                var r = Ext.decode(rep.responseText, true) || {};
                rappel({success: false, msg: r.msg || ('Erreur ' + rep.status)});
            }
        });
    },

    /** Durée lisible : « 45 s », « 2 min 05 s ». */
    duree: function (s) {
        s = Math.max(0, Math.round(s || 0));
        return s < 60 ? s + ' s' : Math.floor(s / 60) + ' min ' + Ext.String.leftPad(String(s % 60), 2, '0') + ' s';
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
        this.datesLues = this.datesLues || {};
        this.datesLues[sel] = d ? String(d).replace('T', ' ').substring(0, 16) : null;
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

    /**
     * Liste déjà lue (demande du 08/11) : le premier clic sur « Lire sur l'extranet » demande, dans le bouton, s'il
     * faut la relire ; sans second clic, la liste déjà gardée reste affichée. Évite des lectures répétées (lenteur,
     * allure de robot pour l'extranet).
     */
    lireSiBesoin: function (b, selDate, action) {
        var d = (this.datesLues || {})[selDate];
        if (!d) {
            action();
            return;
        }
        this.confirmerDansBouton(b, 'Déjà lu le ' + d + ' : relire ?', action);
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
        } else if (id === 'exOngletGrossistesLies') {
            me.chargerGrossistesLies();
        }
    },

    /* ---------------------------------------------------------------- sessions */

    ongletSessions: function () {
        var me = this, CARTE = 'background:#fff;border:1px solid #d6dde3;border-radius:6px;'
                + 'box-shadow:0 1px 2px rgba(0,0,0,.05)',
                champ = function (cfg) {
                    return Ext.apply({xtype: 'textfield', labelAlign: 'top', labelSeparator: '', margin: '0 10 0 0',
                        enforceMaxLength: true}, cfg);
                },
                bouton = function (cfg) {
                    return Ext.apply({xtype: 'button', margin: '19 6 0 0', minWidth: 90}, cfg);
                },
                entete = function (source, libelle, sousTitre) {
                    /* mise en page libre : la pastille flotte à droite et garde sa largeur naturelle */
                    return {xtype: 'container', margin: '0 0 8 0', style: 'overflow:hidden', items: [
                            {xtype: 'label', itemId: 'exEtat' + source, text: '...', style: 'float:right;margin-left:12px'},
                            {xtype: 'component', style: 'padding-top:3px', html: '<span style="font-size:15px;'
                                        + 'font-weight:bold;color:#1f3a56">' + libelle + '</span>' + (sousTitre
                                        ? '<span style="margin-left:10px;color:#888;font-size:12px">' + sousTitre
                                        + '</span>' : '')}]};
                },
                bloc = function (source, libelle, aide, sousTitre) {
                    return {
                        xtype: 'container', itemId: 'exSession' + source, padding: '12 14', margin: '0 0 12 0',
                        style: CARTE,
                        items: [
                            entete(source, libelle, sousTitre),
                            {xtype: 'component', itemId: 'exCompteEtat' + source, html: ''},
                            {xtype: 'container', layout: 'hbox', margin: '10 0 0 0', itemId: 'exCompte' + source,
                                hidden: true, items: [
                                    champ({itemId: 'exIdentifiant' + source, width: 220, maxLength: 200,
                                        fieldLabel: 'Identifiant', inputAttrTpl: 'autocomplete="off"'}),
                                    champ({itemId: 'exMotDePasse' + source, inputType: 'password', width: 200,
                                        maxLength: 200, fieldLabel: 'Mot de passe',
                                        emptyText: 'vide : inchangé', inputAttrTpl: 'autocomplete="new-password"'}),
                                    champ({itemId: 'exPage' + source, width: 300, maxLength: 1000,
                                        fieldLabel: 'Page de connexion', emptyText: '/ (par défaut)'}),
                                    champ({itemId: 'exChamp' + source, width: 130, maxLength: 100,
                                        fieldLabel: 'Nom de la case', emptyText: 'laisser vide',
                                        labelAttrTpl: 'data-qtip="Réglage technique, à laisser vide : Prestige trouve '
                                                + 'seul la case de l\'identifiant. Ne saisissez pas votre identifiant '
                                                + 'ici."'}),
                                    bouton({text: 'Enregistrer', itemId: 'exCompteEnregistrer' + source,
                                        handler: function () {
                                            me.enregistrerCompte(source);
                                        }}),
                                    bouton({text: 'Se connecter', itemId: 'exConnecter' + source,
                                        handler: function () {
                                            me.seConnecter(source);
                                        }}),
                                    bouton({text: 'Effacer les identifiants', itemId: 'exCompteEffacer' + source,
                                        handler: function (b) {
                                            me.confirmerDansBouton(b, 'Confirmer l\'effacement', function () {
                                                me.effacerCompte(source);
                                            });
                                        }})
                                ]},
                            {xtype: 'container', layout: {type: 'hbox', align: 'middle'}, margin: '10 0 0 0',
                                padding: '6 0 0 0', style: 'border-top:1px dashed #e1e6ea', itemId: 'exSaisie' + source,
                                hidden: true, items: [
                                    {xtype: 'component', width: 120, html: '<span style="color:#888;font-size:12px">'
                                                + 'Secours : cookie</span>'},
                                    {xtype: 'textfield', itemId: 'exCookie' + source, inputType: 'password',
                                        width: 410, emptyText: aide, margin: '0 10 0 0'},
                                    {xtype: 'button', text: 'Enregistrer', minWidth: 90, margin: '0 6 0 0',
                                        handler: function () {
                                            me.definirSession(source);
                                        }},
                                    {xtype: 'button', text: 'Effacer la session', itemId: 'exEffacer' + source,
                                        handler: function (b) {
                                            me.confirmerDansBouton(b, 'Confirmer l\'effacement', function () {
                                                me.effacerSession(source);
                                            });
                                        }}
                                ]}
                        ]
                    };
                };
        return {
            title: 'Sessions', itemId: 'exOngletSessions', autoScroll: true, bodyPadding: 14,
            /* administrateur et super administrateur seulement (08/11) : montre apres la reponse du serveur */
            tabConfig: {hidden: true},
            bodyStyle: 'background:#f4f6f8',
            items: [
                {xtype: 'component', margin: '0 0 12 0', html: '<div style="color:#555;line-height:1.5">Saisissez '
                            + 'l\'identifiant et le mot de passe de chaque extranet : Prestige se connecte seul et se '
                            + 'reconnecte quand la session expire. Le mot de passe est chiffré sur le serveur et n\'est '
                            + 'jamais réaffiché (laisser le champ vide garde l\'ancien). En secours, un cookie de '
                            + 'session copié depuis le navigateur peut être collé. Réservé à l\'administrateur.</div>'},
                bloc('UBIPHARM', 'Ubipharm', 'SESSIONID=...', 'Côte d\'Ivoire'),
                bloc('TEDIS', 'TEDIS', 'nom=valeur; nom2=valeur2'),
                bloc('COPHARMED', 'Copharmed', 'pgid-...=valeur; nom2=valeur2', 'CFAO'),
                bloc('DPCI', 'DPCI', 'JSESSIONID=valeur; nom2=valeur2'),
                {xtype: 'container', itemId: 'exSessionMAYITE', padding: '12 14', margin: '0 0 12 0', style: CARTE,
                    items: [entete('MAYITE', 'Mayité', 'base des spécialités'),
                        {xtype: 'component', html: '<span style="color:#555">Aucun identifiant à saisir : Mayité '
                                    + 's\'ouvre par la session Ubipharm, comme le lien « Base de données Mayite » '
                                    + 'd\'Ubipharm.</span>'}]},
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
            var onglet = me.down('#exOngletSessions');
            if (onglet && onglet.tab) {
                onglet.tab.setVisible(r.administrateur === true);
                if (r.administrateur !== true && me.down('#exOnglets').getActiveTab() === onglet) {
                    me.down('#exOnglets').setActiveTab(1);
                }
            }
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
            couleur = '#555555';
            texte = 'Connexion en cours…';
        } else if (s.echecConnexion) {
            couleur = '#c0392b';
            texte = '✗ Non connecté : ' + Ext.String.htmlEncode(s.echecConnexion);
        } else if (s.etat === 'EXPIREE') {
            couleur = '#d35400';
            texte = 'Session expirée' + (c.enregistre ? ' — reconnexion automatique à la prochaine lecture'
                    : ' : enregistrez les identifiants ou collez un cookie');
        } else if (s.source === 'MAYITE') {
            couleur = '#555555';
            texte = 'Non connecté — ouvert par Ubipharm à la première recherche';
        } else {
            couleur = '#555555';
            texte = 'Non connecté' + (c.enregistre ? ' — cliquez « Se connecter »'
                    : ' : enregistrez l\'identifiant et le mot de passe');
        }
        return '<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-weight:bold;'
                + 'color:' + couleur + ';background:' + couleur + '1a;border:1px solid ' + couleur + '55">État : '
                + texte + '</span>';
    },

    afficherCompte: function (s, admin) {
        var me = this, c = s.compte || {}, etat = me.down('#exCompteEtat' + s.source),
                bloc = me.down('#exCompte' + s.source), id = me.down('#exIdentifiant' + s.source),
                h = function (v) {
                    return Ext.String.htmlEncode(String(v).replace('T', ' ').substring(0, 16));
                };
        if (etat) {
            var ligne = function (titre, valeur) {
                return '<tr><td style="color:#888;padding:2px 14px 2px 0;white-space:nowrap;vertical-align:top">'
                        + titre + '</td><td style="padding:2px 0">' + valeur + '</td></tr>';
            }, page = c.pageConnexion || c.pageConnexionParDefaut, courte = function (u) {
                var m = String(u || '').match(/^(https?:\/\/[^\/?#]+)([^?#]*)/);
                return m ? m[1] + (m[2] && m[2] !== '/' ? m[2] : '') + (String(u).length > m[0].length ? '…' : '') : u;
            };
            etat.update(c.enregistre
                    ? '<div style="color:#1f3a56;margin-bottom:4px">Identifiants enregistrés : <b>'
                    + Ext.String.htmlEncode(c.identifiant || '') + '</b>, mot de passe '
                    + (c.motDePasseEnregistre ? 'enregistré' : 'absent') + '</div><table style="font-size:12px">'
                    + (page ? ligne('Page de connexion', '<span title="' + Ext.String.htmlEncode(page) + '">'
                            + Ext.String.htmlEncode(courte(page)) + (c.pageConnexion ? '' : ' (par défaut)')
                            + '</span>') : '')
                    + (c.modifieLe ? ligne('Modifiés', 'le ' + h(c.modifieLe) + (c.modifiePar ? ' par '
                            + Ext.String.htmlEncode(c.modifiePar) : '')) : '')
                    + (s.mode === 'CONNEXION' && s.derniereConnexion && !s.echecConnexion
                            ? ligne('Connexion', '<span style="color:#27ae60">Connecté automatiquement le '
                            + h(s.derniereConnexion) + '</span>') : '')
                    + (s.echecConnexion ? ligne('Connexion', '<span style="color:#c0392b">Dernière connexion échouée : '
                            + Ext.String.htmlEncode(s.echecConnexion) + '</span>') : '')
                    + '</table>'
                    : '<span style="color:#888">Aucun identifiant enregistré</span>');
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
        var connecter = me.down('#exConnecter' + s.source), effacer = me.down('#exCompteEffacer' + s.source),
                ouverte = s.etat === 'VALIDE' || s.etat === 'A_VERIFIER';
        if (connecter) {
            /* deja connecte : rien a faire (demande du 08/11) ; la reconnexion reste automatique a l'expiration */
            connecter.setDisabled(!c.enregistre || ouverte);
            connecter.setText(ouverte ? '✓ Connecté' : 'Se connecter');
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
            title: 'Fiche produit', itemId: 'exOngletFiche', layout: {type: 'vbox', align: 'stretch'}, autoScroll: true,
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
                        me.boutonExporter('exFicheExport', '#exAgencesGrille', 'Ubipharm', 'Stock par agence', '#exFicheMsg'),
                        '->', {xtype: 'label', itemId: 'exFicheMsg'}]}],
            items: [
                {xtype: 'gridpanel', itemId: 'exRechercheGrille', hidden: true, height: 200, columnLines: true,
                    collapsible: true, titleCollapse: true,
                    store: me.rechercheUbipharm, title: 'Résultats de la recherche Ubipharm',
                    viewConfig: {deferEmptyText: false, emptyText: '<div style="padding:12px">Aucun produit</div>'},
                    columns: [
                        {text: 'Référence', dataIndex: 'pscode', width: 90, renderer: me.texte},
                        {text: 'Désignation', dataIndex: 'designation', flex: 2, renderer: me.texte},
                        {text: 'CIP', dataIndex: 'cip', width: 120, renderer: me.texte},
                        {text: 'Statut', dataIndex: 'statut', width: 90, renderer: me.texte},
                        {text: 'Disponibilité', dataIndex: 'dispo', flex: 2, renderer: me.dispo},
                        {text: 'Prix', dataIndex: 'prix', flex: 1, renderer: me.texte},
                        {text: 'Colisage', dataIndex: 'colisage', width: 70, renderer: me.texte},
                        {text: 'Mayité', width: 95, align: 'center', sortable: false, menuDisabled: true,
                            renderer: function () {
                                return '<span class="ex-bouton-mayite" style="cursor:pointer;color:#2980b9;'
                                        + 'text-decoration:underline">Monographie</span>';
                            }}],
                    listeners: {cellclick: function (v, td, col, rec, tr, ligne, e) {
                            /* bouton Mayité : recherche dans une fenêtre de consultation ; ailleurs : la fiche */
                            if (e.getTarget('.ex-bouton-mayite')) {
                                me.fenetreMayite(rec.get('designation'));
                                return;
                            }
                            me.down('#exPscode').setValue(rec.get('pscode'));
                            lire(true);
                        }}},
                {xtype: 'component', itemId: 'exFicheEntete', padding: 10, html: ''},
                {xtype: 'gridpanel', itemId: 'exAgencesGrille', flex: 1, minHeight: 320, store: me.agencesFiche,
                    title: 'Stock par agence', columnLines: true,
                    viewConfig: {deferEmptyText: false, emptyText: '<div style="padding:12px">Aucune agence</div>'},
                    columns: [
                        {text: 'Agence', dataIndex: 'etcode', width: 80, renderer: me.texte},
                        {text: 'Libellé', dataIndex: 'etlib', flex: 1, renderer: me.texte},
                        {text: 'Stock', dataIndex: 'psstk', width: 90, align: 'right', renderer: me.connu},
                        {text: 'Colisages', dataIndex: 'colisages', flex: 1, minWidth: 140, renderer: function (v, meta) {
                                return Ext.isArray(v) ? me.texte(v.join(', '), meta) : me.connu(null);
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
                        {text: 'Lire sur l\'extranet', itemId: 'exReapproCollecter', handler: function (b) {
                                me.lireSiBesoin(b, '#exReapproDate', function () {
                                me.appel('POST', 'ubipharm/reappro/collecte', function (r) {
                                    me.message('#exReapproMsg', r, r.collecte ? r.collecte.lignesRecues
                                            + ' lignes lues sur ' + r.collecte.lignesAnnoncees : 'Terminé');
                                    me.reappro.loadPage(1);
                                }, me.down('#exOngletReappro'));
                                });
                            }},
                        me.boutonExporter('exReapproExport', '#exReapproGrille', 'Ubipharm', 'Réapprovisionnements', '#exReapproMsg', function (rendre) {
                            me.toutesLignesReappro(rendre);
                        }), '->', {xtype: 'label', itemId: 'exReapproMsg'}, {xtype: 'label', itemId: 'exReapproDate'}]}],
            items: [{xtype: 'gridpanel', itemId: 'exReapproGrille', store: me.reappro, columnLines: true,
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
                            renderer: function (v, meta) {
                                me.bulle(meta, Ext.Array.map(v || [], function (a) {
                                    return (a.etcode || a.etlib) + ' : ' + (a.dispo === null || a.dispo === undefined
                                            ? 'inconnu' : a.dispo) + (a.colisageTexte ? ' (colis ' + a.colisageTexte + ')' : '');
                                }).join(' ; '));
                                return Ext.Array.map(v || [], function (a) {
                                    return me.texte(a.etcode || a.etlib) + ' : ' + me.dispo(a.dispo)
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
                        {text: 'Lire sur l\'extranet', itemId: 'exReclamationsCollecter', handler: function (b) {
                                me.lireSiBesoin(b, '#exReclamationsDate', function () {
                                me.appel('POST', 'ubipharm/reclamations/collecte?filtre='
                                        + me.down('#exFiltre').getValue(), function (r) {
                                    me.message('#exReclamationsMsg', r, (r.nombre || 0) + ' réclamations lues');
                                    me.reclamations.load();
                                }, me.down('#exOngletReclamations'));
                                });
                            }},
                        me.boutonExporter('exReclamationsExport', '#exGrilleReclamations', 'Ubipharm', 'Réclamations', '#exReclamationsMsg'),
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

    /** Lignes du dernier rapprochement dont la fiche peut recevoir le PSCODE (calculé par le serveur). */
    nombrePscode: function () {
        var n = 0;
        Ext.Object.each(this.rapprochement || {}, function (k, x) {
            n += x && x.aEnregistrer ? 1 : 0;
        });
        return n;
    },

    majBoutonPscode: function () {
        var b = this.down('#exEnregistrerPscode'), n = this.nombrePscode();
        if (b && !b.arme) {
            b.setDisabled(n === 0);
            b.setText(n ? 'Enregistrer ' + n + ' PSCODE' : 'Enregistrer les PSCODE');
            b.texteNormal = b.getText();
        }
    },

    ongletNouveaux: function () {
        var me = this, statuts = {PSCODE: 'trouvé (référence Ubipharm de la fiche)', CIP: 'trouvé (CIP)',
            PLUSIEURS: 'plusieurs articles', INTROUVABLE: 'absent de Prestige'};
        return {
            title: 'Nouveaux produits', itemId: 'exOngletNouveaux', layout: 'fit',
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {text: 'Lire sur l\'extranet', itemId: 'exNouveauxCollecter', handler: function (b) {
                                me.lireSiBesoin(b, '#exNouveauxDate', function () {
                                me.appel('POST', 'ubipharm/nouveaux/collecte', function (r) {
                                    me.message('#exNouveauxMsg', r, r.collecte && r.collecte.statut === 'PARTIELLE'
                                            ? 'Liste peut-être incomplète (pagination visible)' : 'Liste lue');
                                    me.nouveaux.load();
                                }, me.down('#exOngletNouveaux'));
                                });
                            }},
                        {text: 'Rapprocher avec Prestige', itemId: 'exRapprocher', handler: function (b, e, texteFait) {
                                me.appel('GET', 'ubipharm/nouveaux/rapprochement', function (r) {
                                    var parPs = {};
                                    Ext.each(r.data || [], function (x) {
                                        parPs[x.pscode] = x;
                                    });
                                    me.rapprochement = r.success ? parPs : null;
                                    me.appliquerRapprochement();
                                    me.message('#exNouveauxMsg', r, texteFait || 'Rapprochement fait (aucun article modifié)');
                                    me.majBoutonPscode();
                                }, me.down('#exOngletNouveaux'));
                            }},
                        {text: 'Enregistrer les PSCODE', itemId: 'exEnregistrerPscode', disabled: true,
                            tooltip: 'Écrit la référence Ubipharm sur les fiches retrouvées par CIP ou EAN 13, seules '
                                    + 'et encore sans PSCODE. Le nom seul ne suffit jamais.',
                            handler: function (b) {
                                var n = me.nombrePscode();
                                me.confirmerDansBouton(b, 'Écrire ' + n + ' PSCODE ?', function () {
                                    me.appel('POST', 'ubipharm/nouveaux/pscode', function (r) {
                                        var fait = (r.enregistres || 0) + ' PSCODE enregistré(s)'
                                                + (r.ignores ? ', ' + r.ignores + ' ambigu(s) laissé(s)' : '');
                                        me.message('#exNouveauxMsg', r, fait);
                                        /* la relecture du rapprochement garde ce message (retour du 08/11) */
                                        if (r.success) {
                                            me.down('#exRapprocher').handler(null, null, fait);
                                        }
                                    }, me.down('#exOngletNouveaux'));
                                });
                            }},
                        me.boutonExporter('exNouveauxExport', '#exNouveauxGrille', 'Ubipharm', 'Nouveaux produits', '#exNouveauxMsg'),
                        '->', {xtype: 'label', itemId: 'exNouveauxMsg'}, {xtype: 'tbspacer', width: 12},
                        {xtype: 'label', itemId: 'exNouveauxNombre'}, {xtype: 'tbspacer', width: 12},
                        {xtype: 'label', itemId: 'exNouveauxDate'}]}],
            items: [{xtype: 'gridpanel', itemId: 'exNouveauxGrille', store: me.nouveaux, columnLines: true,
                    viewConfig: {deferEmptyText: false, emptyText: '<div style="padding:12px">Aucun produit</div>'},
                    columns: [
                        {text: 'Référence', dataIndex: 'pscode', width: 100, renderer: me.texte},
                        {text: 'Désignation', dataIndex: 'designation', flex: 1, minWidth: 220, renderer: me.texte},
                        {text: 'CIP', dataIndex: 'cip', width: 130, renderer: me.texte},
                        {text: 'Catégorie', dataIndex: 'categorie', width: 110, renderer: me.texte},
                        {text: 'Date', dataIndex: 'dateAffichee', width: 90, renderer: me.texte},
                        {text: 'Mouvement', dataIndex: 'mouvement', width: 110, renderer: me.dispo},
                        {text: 'Disponibilité', dataIndex: 'disponibilite', width: 100, renderer: me.dispo},
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
        me.listes[code] = Ext.create('Ext.data.Store', {fields: ['position', 'pscode', 'cip', 'agence', 'cellules',
                'saisi']});
        return {
            title: titre, itemId: id, listeCode: code, layout: 'fit',
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {text: 'Lire sur l\'extranet', itemId: id + 'Collecter', handler: function (b) {
                                me.lireSiBesoin(b, '#' + id + 'Date', function () {
                                    me.chargerListe(code, true);
                                });
                            }},
                        {xtype: 'textfield', itemId: id + 'Recherche', emptyText: 'Rechercher', width: 220,
                            listeners: {change: function () {
                                    me.filtrerListe(code);
                                }}},
                        me.champPeriode(id + 'Du', 'Du', code), me.champPeriode(id + 'Au', 'Au', code),
                        /* retour du 08/11, point 5 : une action visible apres le choix des dates */
                        {text: 'Rechercher', itemId: id + 'Chercher', hidden: true,
                            tooltip: 'Afficher les lignes de la période (et du texte recherché)', handler: function () {
                                me.rechercherListe(code);
                            }},
                        {text: 'Toute la période', itemId: id + 'Tout', enableToggle: true, hidden: true,
                            tooltip: 'Afficher toutes les lignes gardées, sans tenir compte des dates',
                            toggleHandler: function (b, appuye) {
                                me.down('#' + id + 'Du').setDisabled(appuye);
                                me.down('#' + id + 'Au').setDisabled(appuye);
                                me.filtrerListe(code);
                            }},
                        me.champDispo(id + 'Dispo', function () {
                            me.filtrerListe(code);
                        }, true),
                        /* demande du 09/11 : BL du grossiste saisis ou non dans Prestige */
                        {xtype: 'combo', itemId: id + 'Saisie', width: 190, editable: false, value: '', hidden: true,
                            store: [['', 'Saisie dans Prestige : tous'], ['non', 'Non saisis'], ['oui', 'Saisis'],
                                ['autre', 'Saisis sous un autre grossiste']],
                            listeners: {change: function () {
                                    me.filtrerListe(code);
                                }}},
                        me.boutonExporter(id + 'Export', '#' + id + 'Grille', me.grossisteListe(code), titre, '#' + id + 'Msg',
                                function (rendre) {
                                    rendre((me.donnees || {})[code] || []);
                                }),
                        '->', {xtype: 'label', itemId: id + 'Msg'}, {xtype: 'tbspacer', width: 12},
                        {xtype: 'label', itemId: id + 'Nombre'}, {xtype: 'tbspacer', width: 12},
                        {xtype: 'label', itemId: id + 'Date'}]}],
            items: [{xtype: 'gridpanel', itemId: id + 'Grille', store: me.listes[code], columnLines: true,
                    /* toutes les lignes atteignables a la molette (retour du 08/11, point 3) */
                    plugins: [{ptype: 'bufferedrenderer'}],
                    viewConfig: {deferEmptyText: false,
                        emptyText: '<div style="padding:12px">Aucune ligne. « Lire sur l\'extranet » lit la liste ;'
                                + ' « Toute la période » affiche les lignes des autres dates.</div>'},
                    columns: []}]
        };
    },

    /** Champ de période d'une liste : la date du jour par défaut (demande du 08/11). */
    champPeriode: function (itemId, libelle, code) {
        var me = this;
        return {xtype: 'datefield', itemId: itemId, fieldLabel: libelle, labelWidth: 20, width: 130,
            format: 'd/m/Y', value: new Date(), allowBlank: false, hidden: true,
            listeners: {change: function (f) {
                    if (f.isValid()) {
                        me.filtrerListe(code);
                    }
                }, specialkey: function (f, e) {
                    if (e.getKey() === e.ENTER) {
                        me.rechercherListe(code);
                    }
                }}};
    },

    /** Bouton « Rechercher » (ou Entrée dans une date) : applique période et texte, et dit ce qui est affiché. */
    rechercherListe: function (code) {
        var me = this, id = 'exListe' + code, msg = me.down('#' + id + 'Msg'), du = me.down('#' + id + 'Du'),
                au = me.down('#' + id + 'Au');
        if (du && !du.isDisabled() && (!du.isValid() || !au.isValid())) {
            msg.setText('<span style="color:#c0392b">Date illisible : format JJ/MM/AAAA</span>', false);
            return;
        }
        var n = me.filtrerListe(code), p = me.periodeListe(code), f = function (d) {
            return Ext.Date.format(Ext.Date.parse(d, 'Y-m-d'), 'd/m/Y');
        };
        msg.setText((p ? 'Du ' + f(p.du) + ' au ' + f(p.au) : 'Toute la période') + ' : ' + n + ' ligne(s)');
    },

    /** Période choisie pour une liste : {du, au} en AAAA-MM-JJ, ou null (« Toute la période », ou liste sans date). */
    periodeListe: function (code) {
        var me = this, id = 'exListe' + code, du = me.down('#' + id + 'Du'), au = me.down('#' + id + 'Au'),
                tout = me.down('#' + id + 'Tout');
        if (!du || du.isHidden() || (tout && tout.pressed) || !du.getValue() || !au.getValue()) {
            return null;
        }
        var a = Ext.Date.format(du.getValue(), 'Y-m-d'), b = Ext.Date.format(au.getValue(), 'Y-m-d');
        return a <= b ? {du: a, au: b} : {du: b, au: a};
    },

    /** Date d'une cellule en AAAA-MM-JJ (2026-11-08, 08/11/2026, 08/11/26, 1-11-2026, avec ou sans heure), sinon null. */
    lireDate: function (v) {
        var s = Ext.String.trim(String(v === null || v === undefined ? '' : v)),
                m = /^(\d{4})-(\d{2})-(\d{2})(\D|$)/.exec(s);
        if (m) {
            return m[1] + '-' + m[2] + '-' + m[3];
        }
        m = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4}|\d{2})(\D|$)/.exec(s);
        if (!m || +m[2] < 1 || +m[2] > 12 || +m[1] < 1 || +m[1] > 31) {
            return null;
        }
        return (m[3].length === 2 ? '20' + m[3] : m[3]) + '-' + Ext.String.leftPad(m[2], 2, '0') + '-'
                + Ext.String.leftPad(m[1], 2, '0');
    },

    /** Colonnes de date d'une liste : Début et Fin (offres, promotions), sinon toutes les colonnes de date. */
    colonnesDate: function (colonnes) {
        var me = this, r = {debut: -1, fin: -1, autres: []};
        Ext.each(colonnes || [], function (titre, i) {
            var t = String(titre || '');
            if (/^(Date de )?d[ée]but/i.test(t)) {
                r.debut = i;
            } else if (/^(Date de )?fin\b/i.test(t)) {
                r.fin = i;
            } else if (me.genreColonne(t).nom === 'date') {
                r.autres.push(i);
            }
        });
        r.avecDates = r.debut >= 0 || r.fin >= 0 || r.autres.length > 0;
        return r;
    },

    /**
     * Ligne dans la période : avec Début et Fin, elle est en cours pendant la période (même règle que le serveur pour
     * les offres DPCI) ; sinon une de ses dates est dans la période. Une ligne sans date lisible reste affichée.
     */
    dansPeriode: function (cd, cellules, p) {
        var me = this, c = cellules || [];
        if (cd.debut >= 0 || cd.fin >= 0) {
            var d = cd.debut >= 0 ? me.lireDate(c[cd.debut]) : null, f = cd.fin >= 0 ? me.lireDate(c[cd.fin]) : null;
            if (d || f) {
                return (!d || d <= p.au) && (!f || f >= p.du);
            }
        }
        var lues = 0, dedans = false;
        Ext.each(cd.autres, function (i) {
            var x = me.lireDate(c[i]);
            if (x) {
                lues++;
                dedans = dedans || (x >= p.du && x <= p.au);
            }
        });
        return lues === 0 || dedans;
    },

    /** Affiche le cache (collecter : lit d'abord l'extranet). */
    chargerListe: function (code, collecter) {
        var me = this, id = 'exListe' + code, panneau = me.down('#' + id);
        var racine = code.indexOf('TEDIS_') === 0 ? 'tedis/listes/'
                : code.indexOf('COPHARMED_') === 0 ? 'copharmed/listes/'
                : code.indexOf('DPCI_') === 0 ? 'dpci/listes/' : 'ubipharm/listes/';
        if (collecter) {
            me.lancerLecture(code, racine.split('/')[0]);
            return;
        }
        me.appel('GET', racine + code, function (r) {
            if (r.success) {
                me.afficherListe(code, r);
            } else {
                me.message('#' + id + 'Msg', r, 'Liste lue');
            }
            me.suivreLecture(code, racine.split('/')[0]);
        }, panneau, null);
    },

    /**
     * Retours 8 et 9 du 08/11 : la lecture tourne sur le serveur ; l'onglet reste utilisable avec la liste gardée et
     * affiche « Lecture en cours depuis… ». Une lecture déjà lancée (autre clic, autre poste) est suivie, pas relancée.
     */
    lancerLecture: function (code, famille) {
        var me = this, id = 'exListe' + code, p = famille === 'dpci' ? me.periodeListe(code) : null;
        me.suivies = me.suivies || {};
        me.suivies[code] = true;
        me.appelDiscret('POST', 'lectures/' + famille + '/' + code + (p ? '?du=' + p.du + '&au=' + p.au : ''),
                function (r) {
                    if (!r.success) {
                        me.suivies[code] = false;
                        me.message('#' + id + 'Msg', r);
                        return;
                    }
                    me.etatLecture(code, famille, r.lecture);
                });
    },

    /** Interroge l'état de la lecture d'une liste (toutes les 3 s tant qu'elle tourne). */
    suivreLecture: function (code, famille) {
        var me = this;
        if (me.isDestroyed) {
            return;
        }
        me.appelDiscret('GET', 'lectures/' + famille + '/' + code, function (r) {
            if (r.success) {
                me.etatLecture(code, famille, r.lecture);
            }
        });
    },

    etatLecture: function (code, famille, l) {
        var me = this, id = 'exListe' + code, b = me.down('#' + id + 'Collecter'), msg = me.down('#' + id + 'Msg');
        if (me.isDestroyed || !b) {
            return;
        }
        me.suivies = me.suivies || {};
        if (l && l.enCours) {
            me.suivies[code] = true;
            b.setDisabled(true);
            b.setText('Lecture en cours…');
            msg.setText('<span style="color:#2471a3">Lecture sur l\'extranet en cours depuis ' + me.duree(l.secondes)
                    + ' : la liste gardée reste consultable</span>', false);
            clearTimeout(me['minuteur' + code]);
            me['minuteur' + code] = setTimeout(function () {
                me.suivreLecture(code, famille);
            }, 3000);
            return;
        }
        b.setDisabled(false);
        b.setText(b.texteNormal || 'Lire sur l\'extranet');
        if (l && me.suivies[code]) {
            me.suivies[code] = false;
            var r = l.resultat || {};
            me.message('#' + id + 'Msg', r, 'Liste lue en ' + me.duree(l.secondes));
            if (r.success) {
                me.appel('GET', (famille === 'ubipharm' ? 'ubipharm' : famille) + '/listes/' + code, function (x) {
                    if (x.success) {
                        me.afficherListe(code, x);
                    }
                }, me.down('#' + id), null);
            }
        }
    },

    afficherListe: function (code, r) {
        var me = this, id = 'exListe' + code, grille = me.down('#' + id + 'Grille'), colonnes = [];
        Ext.each(r.colonnes || [], function (titre, i) {
            var genre = me.genreColonne(titre);
            colonnes.push({text: me.texte(titre), dataIndex: 'cellules', minWidth: genre.min, flex: genre.flex,
                align: genre.align, tdCls: genre.tdCls, celluleIndex: i,
                renderer: function (v, meta) {
                    me.bulle(meta, v ? v[i] : '');
                    return me.celluleListe(genre, v ? v[i] : '');
                }});
        });
        if (r.saisie) {
            colonnes.push({text: 'Saisi dans Prestige', dataIndex: 'saisi', width: 230, renderer: function (v, meta) {
                    var t = me.texteSaisi(v);
                    meta.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(v ? 'Référence saisie : ' + v.reference
                            : 'Aucun BL saisi avec ce numéro (' + r.saisie.colonnes.join(', ') + ')') + '"';
                    return '<span style="color:' + (!v ? '#c0392b' : v.autreGrossiste || v.enCours ? '#d35400'
                            : '#27ae60') + '">' + Ext.String.htmlEncode(t) + '</span>';
                }});
        }
        me.down('#' + id + 'Saisie').setVisible(!!r.saisie);
        me.saisieListe = me.saisieListe || {};
        me.saisieListe[code] = r.saisie || null;
        grille.reconfigure(me.listes[code], colonnes);
        me.donnees = me.donnees || {};
        me.donnees[code] = r.lignes || [];
        me.datesListe = me.datesListe || {};
        me.datesListe[code] = me.colonnesDate(r.colonnes);
        Ext.each(['Du', 'Au', 'Chercher', 'Tout'], function (s) {
            me.down('#' + id + s).setVisible(me.datesListe[code].avecDates);
        });
        /* filtre Disponibles / Non disponibles quand la liste a une colonne de disponibilite (point 2) */
        me.dispoListe = me.dispoListe || {};
        me.dispoListe[code] = -1;
        Ext.each(r.colonnes || [], function (titre, i) {
            if (me.dispoListe[code] < 0 && me.genreColonne(titre).nom === 'dispo') {
                me.dispoListe[code] = i;
            }
        });
        me.down('#' + id + 'Dispo').setVisible(me.dispoListe[code] >= 0);
        me.filtrerListe(code);
        me.afficherDate('#' + id + 'Date', r);
        var lue = r.collecte && /du=(\d{4}-\d{2}-\d{2});au=(\d{4}-\d{2}-\d{2})/.exec(r.collecte.parametres || '');
        if (lue) {
            var l = me.down('#' + id + 'Date');
            l.setText(l.text + ' — période lue : ' + Ext.Date.format(Ext.Date.parse(lue[1], 'Y-m-d'), 'd/m/Y') + ' au '
                    + Ext.Date.format(Ext.Date.parse(lue[2], 'Y-m-d'), 'd/m/Y'));
        }
    },

    /** Genre d'une colonne de liste, d'après son titre : largeur, alignement et rendu. */
    genreColonne: function (titre) {
        var t = String(titre || '');
        if (/Désignation|Produit|Libellé|Promotion$|Description|Nom/.test(t)) {
            return {nom: 'texte', flex: 3, min: 160};
        }
        if (/Dispo/.test(t)) {
            return {nom: 'dispo', flex: 1, min: 95, align: 'center'};
        }
        if (/Unités gratuites|Paliers|UG/.test(t)) {
            return {nom: 'ug', flex: 2, min: 130};
        }
        if (/Remise|Taux|%/.test(t)) {
            return {nom: 'taux', flex: 1, min: 70, align: 'right'};
        }
        if (/Prix|HT|TTC|Total|Montant|Cession|Public|TVA|Solde/.test(t)) {
            return {nom: 'montant', flex: 1, min: 90, align: 'right'};
        }
        if (/Qté|Quantité|Colisage|Stock|Nbre/.test(t)) {
            return {nom: 'nombre', flex: 1, min: 70, align: 'right'};
        }
        if (/^(Code|CIP|EAN|Référence|N°)/.test(t)) {
            return {nom: 'code', flex: 1, min: 100, tdCls: 'ex-code'};
        }
        if (/Date|Début|Fin|Quinzaine|Année/.test(t)) {
            return {nom: 'date', flex: 1, min: 90};
        }
        return {nom: 'texte', flex: 1, min: 80};
    },

    /** Rendu d'une cellule de liste selon le genre de sa colonne (la valeur gardée en base ne change pas). */
    celluleListe: function (genre, v) {
        var me = this, s = v === null || v === undefined ? '' : String(v);
        if (genre.nom === 'montant' && /^-?\d+(\.\d+)?$/.test(s)) {
            return me.montant(s);
        }
        if (genre.nom === 'dispo' || me.DISPO_OUI.test(s) || me.DISPO_NON.test(s)) {
            return me.dispo(s);
        }
        if (genre.nom === 'ug' && s) {
            return '<span style="color:#8e44ad">' + me.texte(s) + '</span>';
        }
        return me.texte(s);
    },

    /* ---------------------------------------------------------------- Copharmed : recherche de produit */

    /**
     * Recherche en direct sur Copharmed (demande du 08/11) : nom, code ou DCI ; prix, disponibilité et paliers
     * d'unités gratuites ; bouton « Monographie » vers Mayité. Rien n'est gardé en base.
     */
    ongletRechercheCopharmed: function () {
        var me = this, chercher = function () {
            me.rechercherCopharmed();
        };
        me.rechercheCopharmed = Ext.create('Ext.data.Store', {fields: ['designation', 'code', 'dci', 'colisage',
                'prixHT', 'remise', 'prixNet', 'prixPublic', 'dispo', 'promotion', 'ug', 'source']});
        var dispo = me.genreColonne('Disponibilité'), ug = me.genreColonne('Unités gratuites');
        return {
            title: 'Recherche de produit', itemId: 'exOngletRechercheCopharmed', layout: 'fit',
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'textfield', itemId: 'exCopharmedMotif', fieldLabel: 'Nom, code ou DCI', labelWidth: 110,
                            width: 380, emptyText: 'ex. doli 1000, 36246, paracetamol (morceaux de mots)', enableKeyEvents: true,
                            listeners: {specialkey: function (f, e) {
                                    if (e.getKey() === e.ENTER) {
                                        chercher();
                                    }
                                }}},
                        {text: 'Rechercher', itemId: 'exCopharmedRechercher', iconCls: 'searchicon', handler: chercher},
                        me.champDispo('exCopharmedDispo', function () {
                            me.filtrerDispoCopharmed();
                        }), me.boutonExporter('exCopharmedExport', '#exCopharmedGrille', 'Copharmed', 'Recherche de produit', '#exCopharmedMsg'),
                        '->', {xtype: 'label', itemId: 'exCopharmedMsg'}]}],
            items: [{xtype: 'gridpanel', itemId: 'exCopharmedGrille', store: me.rechercheCopharmed, columnLines: true,
                    viewConfig: {deferEmptyText: false, emptyText: '<div style="padding:12px;color:#777">Saisissez un '
                                + 'nom, un code ou une DCI puis « Rechercher »</div>'},
                    columns: [
                        {text: 'Désignation', dataIndex: 'designation', flex: 3, minWidth: 180, renderer: me.texte},
                        {text: 'Code', dataIndex: 'code', width: 115, renderer: me.texte},
                        {text: 'DCI', dataIndex: 'dci', flex: 2, renderer: me.texte},
                        /* retour du 08/11, point 1 : produit trouve en direct, ou dans le catalogue garde (morceaux de mots) */
                        {text: 'Source', dataIndex: 'source', width: 115, renderer: function (v, meta) {
                                var c = me.catalogueCopharmed ? ' du ' + me.catalogueCopharmed : '';
                                me.bulle(meta, v === 'catalogue' ? 'Trouvé dans le catalogue gardé' + c
                                        + ' : prix et disponibilité de cette date' : 'Trouvé en direct sur l’extranet');
                                return v === 'catalogue' ? '<span style="color:#7f8c8d">catalogue' + c + '</span>'
                                        : '<span style="color:#1e8449">en direct</span>';
                            }},
                        {text: 'Colisage', dataIndex: 'colisage', width: 80, align: 'right', renderer: me.texte},
                        {text: 'Prix HT', dataIndex: 'prixHT', width: 90, align: 'right', renderer: me.montant},
                        {text: 'Taux TVA', dataIndex: 'remise', width: 70, align: 'right', renderer: me.texte},
                        {text: 'Prix TTC', dataIndex: 'prixNet', width: 95, align: 'right', renderer: me.montant},
                        {text: 'Prix public', dataIndex: 'prixPublic', width: 90, align: 'right', renderer: me.montant},
                        {text: 'Disponibilité', dataIndex: 'dispo', width: 170, align: 'center', renderer: function (v) {
                                return me.celluleListe(dispo, v);
                            }},
                        {text: 'Unités gratuites', dataIndex: 'ug', flex: 2, renderer: function (v) {
                                return me.celluleListe(ug, v);
                            }},
                        {text: 'Mayité', width: 95, align: 'center', sortable: false, menuDisabled: true,
                            renderer: function () {
                                return '<span class="ex-bouton-mayite" style="cursor:pointer;color:#2980b9;'
                                        + 'text-decoration:underline">Monographie</span>';
                            }}],
                    listeners: {cellclick: function (v, td, col, rec, tr, ligne, e) {
                            if (e.getTarget('.ex-bouton-mayite')) {
                                me.fenetreMayite(rec.get('designation'));
                            }
                        }}}]
        };
    },

    rechercherCopharmed: function () {
        var me = this, motif = me.valeur('#exCopharmedMotif'), grille = me.down('#exCopharmedGrille'),
                msg = me.down('#exCopharmedMsg');
        if (motif.length < 2) {
            msg.setText('<span style="color:#c0392b">Saisissez au moins 2 caractères</span>', false);
            return;
        }
        me.appel('GET', 'copharmed/recherche?motif=' + encodeURIComponent(motif), function (r) {
            me.catalogueCopharmed = r.catalogue ? Ext.Date.format(new Date(String(r.catalogue).replace(' ', 'T')), 'd/m/Y') : null;
            me.rechercheCopharmed.loadData(r.success ? r.resultats : []);
            me.message('#exCopharmedMsg', r, (r.resultats || []).length + ' produit(s) : ' + (r.direct || 0) + ' en direct'
                    + (r.duCatalogue ? ', ' + r.duCatalogue + ' du catalogue gardé' : '')
                    + (!r.catalogue ? ' — lisez le catalogue Copharmed pour chercher par morceaux de mots' : '')
                    + (r.tronque ? ' — les premiers affichés : affinez' : '')
                    + (r.avertissement ? ' — ' + r.avertissement : ''));
        }, grille);
    },

    /** Recherche dans toutes les colonnes et filtre de période ; toutes les lignes trouvées vont dans la grille (rendu par
     *  tampon : seules les lignes proches de la zone visible sont dessinées, le catalogue TEDIS reste fluide). */
    filtrerListe: function (code) {
        var me = this, id = 'exListe' + code, st = me.listes[code], tout = (me.donnees || {})[code] || [],
                q = Ext.String.trim(me.valeur('#' + id + 'Recherche')).toLowerCase(), nombre = me.down('#' + id + 'Nombre'),
                p = me.periodeListe(code), cd = (me.datesListe || {})[code],
                cd2 = me.down('#' + id + 'Dispo'), d = cd2 && cd2.isVisible() ? cd2.getValue() : '',
                kd = (me.dispoListe || {})[code],
                cs = me.down('#' + id + 'Saisie'), sa = cs && cs.isVisible() ? cs.getValue() : '',
                trouves = !q && !p && !d && !sa ? tout : Ext.Array.filter(tout, function (l) {
                    return (!q || (l.cellules || []).join(' ').toLowerCase().indexOf(q) >= 0)
                            && (!p || !cd || me.dansPeriode(cd, l.cellules, p))
                            && (!d || me.selonDispo(d, (l.cellules || [])[kd]))
                            && (!sa || me.selonSaisie(sa, l.saisi));
                });
        st.loadData(trouves);
        if (nombre) {
            var nonSaisis = 0;
            Ext.each(trouves, function (l) {
                nonSaisis += l.saisi ? 0 : 1;
            });
            nombre.setText(trouves.length + (q || p || d || sa ? ' / ' + tout.length : '') + ' ligne(s)'
                    + ((me.saisieListe || {})[code] ? ' — ' + nonSaisis + ' non saisi(s)' : ''));
        }
        return trouves.length;
    },

    /** Texte de la colonne « Saisi dans Prestige » (aussi exporté). */
    texteSaisi: function (v) {
        if (!v) {
            return 'Non saisi';
        }
        var d = v.date ? Ext.Date.format(Ext.Date.parse(v.date, 'Y-m-d'), 'd/m/Y') : '';
        return (v.enCours ? 'En cours de saisie' : 'Saisi') + (d ? ' le ' + d : '')
                + (v.grossiste ? (v.autreGrossiste ? ' sous ' : ' — ') + v.grossiste : '')
                + (v.autreGrossiste ? ' (autre grossiste)' : '');
    },

    /** Filtre « Saisie dans Prestige » : non saisis, saisis, saisis sous un autre grossiste. */
    selonSaisie: function (choix, v) {
        return choix === 'non' ? !v : choix === 'oui' ? !!v : choix === 'autre' ? !!(v && v.autreGrossiste) : true;
    },

    /* ---------------------------------------------------------------- export CSV / Excel (retour du 08/11, point 2) */

    /** Grossiste d'une liste, d'après son code (nom du fichier exporté). */
    grossisteListe: function (code) {
        return code.indexOf('TEDIS_') === 0 ? 'TEDIS' : code.indexOf('COPHARMED_') === 0 ? 'Copharmed'
                : code.indexOf('DPCI_') === 0 ? 'DPCI' : 'Ubipharm';
    },

    /** Liste déroulante « Disponibilité » : toutes, disponibles, non disponibles. */
    champDispo: function (itemId, action, cache) {
        return {xtype: 'combo', itemId: itemId, width: 160, editable: false, value: '', hidden: !!cache,
            store: [['', 'Disponibilité : toutes'], ['oui', 'Disponibles'], ['non', 'Non disponibles']],
            listeners: {change: action}};
    },

    /** Vrai si la valeur de disponibilité correspond au choix (oui : disponible, non : indisponible). */
    selonDispo: function (choix, v) {
        var s = v === null || v === undefined ? '' : String(v);
        return choix === 'oui' ? this.DISPO_OUI.test(s) : choix === 'non' ? this.DISPO_NON.test(s) : true;
    },

    filtrerDispoCopharmed: function () {
        var me = this, d = me.down('#exCopharmedDispo').getValue(), st = me.rechercheCopharmed;
        st.clearFilter(!!d);
        if (d) {
            st.filterBy(function (r) {
                return me.selonDispo(d, r.get('dispo'));
            });
        }
    },

    /**
     * Bouton « Exporter » : lignes affichées ou toutes les lignes, en CSV ou en Excel. {@code toutes(rendre)} donne
     * toutes les lignes (sinon : toutes celles du magasin, filtre local retiré).
     */
    boutonExporter: function (itemId, grilleSel, grossiste, onglet, msgSel, toutes) {
        var me = this, choix = function (texte, tout, format) {
            return {text: texte, itemId: itemId + (tout ? 'Toutes' : 'Affichage') + (format === 'csv' ? 'Csv' : 'Excel'),
                handler: function () {
                    me.exporter(grilleSel, typeof grossiste === 'function' ? grossiste() : grossiste, onglet, msgSel,
                            tout ? (toutes || 'magasin') : null, format);
                }};
        };
        return {text: 'Exporter', itemId: itemId,
            tooltip: 'Exporter en CSV ou en Excel (nom du grossiste dans le nom du fichier)',
            menu: [choix('Lignes affichées — CSV', false, 'csv'), choix('Lignes affichées — Excel', false, 'xlsx'), '-',
                choix('Toutes les lignes — CSV', true, 'csv'), choix('Toutes les lignes — Excel', true, 'xlsx')]};
    },

    /** Texte sans balises (titre de colonne, valeur rendue). */
    sansBalises: function (h) {
        var d = document.createElement('div');
        d.innerHTML = h === null || h === undefined ? '' : String(h);
        return (d.textContent || '').replace(/\s+/g, ' ').trim();
    },

    exporter: function (grilleSel, grossiste, onglet, msgSel, toutes, format) {
        var me = this, grille = me.down(grilleSel), msg = msgSel ? me.down(msgSel) : null;
        if (!grille) {
            return;
        }
        var cols = Ext.Array.filter(grille.headerCt.getGridColumns(), function (c) {
            return !c.isHidden() && c.text && (c.celluleIndex !== undefined || c.dataIndex);
        });
        var colonnes = Ext.Array.map(cols, function (c) {
            var t = me.sansBalises(c.text), g = me.genreColonne(t).nom;
            return {titre: t, nombre: g === 'montant' || g === 'nombre'};
        });
        var valeur = function (data, c) {
            if (c.dataIndex === 'saisi') {
                return me.texteSaisi(data.saisi);
            }
            var v = c.celluleIndex !== undefined ? (data.cellules || [])[c.celluleIndex] : data[c.dataIndex];
            if (v === null || v === undefined) {
                return '';
            }
            if (typeof v === 'object') {
                return c.renderer ? me.sansBalises(c.renderer.call(c.scope || me, v, {}, {data: data, get: function (k) {
                        return data[k];
                    }})) : JSON.stringify(v);
            }
            return String(v);
        };
        var envoyer = function (datas) {
            var lignes = Ext.Array.map(datas, function (d) {
                return Ext.Array.map(cols, function (c) {
                    return valeur(d, c);
                });
            });
            if (msg) {
                msg.setText('Export de ' + lignes.length + ' ligne(s)…');
            }
            fetch(me.URL + 'export', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({format: format, grossiste: grossiste, onglet: onglet, colonnes: colonnes, lignes: lignes})})
                    .then(function (r) {
                        if (!r.ok) {
                            return r.json().then(function (j) {
                                throw new Error(j.msg || 'Export impossible');
                            });
                        }
                        var cd = r.headers.get('Content-Disposition') || '', m = /filename\*=UTF-8''([^;]+)/.exec(cd);
                        return r.blob().then(function (b) {
                            return {b: b, nom: m ? decodeURIComponent(m[1]) : 'export.' + format};
                        });
                    }).then(function (o) {
                var a = document.createElement('a');
                a.href = URL.createObjectURL(o.b);
                a.download = o.nom;
                document.body.appendChild(a);
                a.click();
                setTimeout(function () {
                    URL.revokeObjectURL(a.href);
                    document.body.removeChild(a);
                }, 2000);
                if (msg) {
                    msg.setText(lignes.length + ' ligne(s) exportée(s) : ' + Ext.String.htmlEncode(o.nom));
                }
            })['catch'](function (e) {
                if (msg) {
                    msg.setText('<span style="color:#c0392b">' + Ext.String.htmlEncode(e.message) + '</span>', false);
                }
            });
        };
        var st = grille.getStore(), donnees = function (recs) {
            return Ext.Array.map(recs, function (r) {
                return r.data;
            });
        };
        if (!toutes) {
            envoyer(donnees(st.getRange()));
        } else if (toutes === 'magasin') {
            envoyer(donnees(st.snapshot ? st.snapshot.getRange() : st.getRange()));
        } else {
            toutes(envoyer);
        }
    },

    /** Toutes les lignes des réapprovisionnements gardées (au-delà de la page affichée), recherche comprise. */
    toutesLignesReappro: function (rendre) {
        var me = this, tout = [], recherche = encodeURIComponent(me.valeur('#exReapproRecherche')), page = function (n) {
            me.appel('GET', 'ubipharm/reappro?page=' + n + '&limit=200&recherche=' + recherche, function (r) {
                tout = tout.concat(r.lignes || []);
                if ((r.lignes || []).length === 200 && tout.length < (r.total || 0)) {
                    page(n + 1);
                } else {
                    rendre(tout);
                }
            }, me.down('#exOngletReappro'));
        };
        page(1);
    },

    /* ---------------------------------------------------------------- Mayité */

    /**
     * Base Mayité (demande du 08/11), lue par la session Ubipharm : recherche par nom, DCI, forme ou laboratoire ; un
     * clic sur une ligne affiche la monographie à droite (et ses spécialités correspondantes, cliquables). Le même
     * panneau sert à l'onglet Mayité et à la fenêtre ouverte depuis un résultat de la recherche Ubipharm.
     */
    panneauMayite: function (prefixe, nomInitial) {
        var me = this, magasin = Ext.create('Ext.data.Store', {
            fields: ['id', 'nom', 'dci', 'liste', 'dosages', 'proprietes', 'prix']
        }), chercher = function (b) {
            me.rechercherMayite(b.up('#' + prefixe), magasin);
        }, champ = function (nom, libelle, largeur, valeur) {
            return {xtype: 'textfield', itemId: nom, fieldLabel: libelle, labelWidth: libelle.length * 6 + 10,
                width: largeur, value: valeur || '', enableKeyEvents: true, margin: '0 8 0 0',
                listeners: {specialkey: function (f, e) {
                        if (e.getKey() === e.ENTER) {
                            chercher(f);
                        }
                    }}};
        };
        return {
            xtype: 'panel', itemId: prefixe, layout: {type: 'hbox', align: 'stretch'}, border: false,
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        champ('exMayiteNom', 'Nom', 210, nomInitial), champ('exMayiteDci', 'DCI', 190),
                        champ('exMayiteForme', 'Forme', 150), champ('exMayiteLabo', 'Laboratoire', 200),
                        {text: 'Rechercher', itemId: 'exMayiteRechercher', iconCls: 'searchicon', handler: chercher},
                        '->', {xtype: 'label', itemId: 'exMayiteMsg'}]}],
            items: [
                {xtype: 'gridpanel', itemId: 'exMayiteGrille', flex: 5, store: magasin, columnLines: true,
                    title: 'Spécialités', margin: '0 4 0 0',
                    viewConfig: {deferEmptyText: false, emptyText: '<div style="padding:12px;color:#777">Saisissez '
                                + 'un nom ou une DCI puis « Rechercher »</div>'},
                    columns: [
                        {text: 'Nom', dataIndex: 'nom', flex: 3, renderer: me.texte},
                        {text: 'DCI', dataIndex: 'dci', flex: 3, renderer: me.texte},
                        {text: 'Liste', dataIndex: 'liste', width: 60, renderer: me.texte},
                        {text: 'Dosages', dataIndex: 'dosages', flex: 2, renderer: me.texte},
                        {text: 'Propriétés', dataIndex: 'proprietes', flex: 2, renderer: me.texte},
                        {text: 'Prix (FCFA)', dataIndex: 'prix', width: 90, align: 'right', renderer: me.montant}],
                    listeners: {itemclick: function (v, rec) {
                            me.lireMonographie(v.up('#' + prefixe), rec.get('id'));
                        }}},
                {xtype: 'component', itemId: 'exMayiteMonographie', flex: 4, autoScroll: true,
                    style: 'background:#fff;border:1px solid #d6dde3',
                    html: '<div style="padding:16px;color:#777">Cliquez une spécialité pour sa monographie.</div>',
                    listeners: {afterrender: function (c) {
                            /* spécialités correspondantes : un clic ouvre leur monographie */
                            c.getEl().on('click', function (e) {
                                var a = e.getTarget('.ex-mayite-equivalent');
                                if (a) {
                                    e.stopEvent();
                                    me.lireMonographie(c.up('#' + prefixe), a.getAttribute('data-id'));
                                }
                            });
                        }}}
            ]
        };
    },

    /** Montant en FCFA, espace pour les milliers ; vide si inconnu. */
    montant: function (v) {
        if (v === null || v === undefined || v === '') {
            return '';
        }
        var n = Number(v), a, ent, dec;
        if (isNaN(n)) {
            return Ext.String.htmlEncode(String(v));
        }
        /* format fixe, indépendant de la langue d'ExtJS : 12 345,5 */
        a = Math.round(Math.abs(n) * 100);
        ent = String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        dec = a % 100;
        return (n < 0 ? '-' : '') + ent + (dec ? ',' + String(dec < 10 ? '0' + dec : dec).replace(/0$/, '') : '');
    },

    rechercherMayite: function (p, magasin) {
        var me = this, v = function (id) {
            return Ext.String.trim(p.down('#' + id).getValue() || '');
        }, msg = p.down('#exMayiteMsg'), grille = p.down('#exMayiteGrille');
        if (!v('exMayiteNom') && !v('exMayiteDci') && !v('exMayiteForme') && !v('exMayiteLabo')) {
            msg.setText('<span style="color:#c0392b">Saisissez un nom, une DCI, une forme ou un laboratoire</span>',
                    false);
            return;
        }
        me.appel('GET', 'mayite/recherche?nom=' + encodeURIComponent(v('exMayiteNom')) + '&dci='
                + encodeURIComponent(v('exMayiteDci')) + '&forme=' + encodeURIComponent(v('exMayiteForme'))
                + '&laboratoire=' + encodeURIComponent(v('exMayiteLabo')), function (r) {
            magasin.loadData(r.success ? r.resultats : []);
            grille.setTitle('Spécialités' + (r.success ? ' : ' + r.trouves + ' trouvée(s)' + (r.tronque ? ', '
                    + r.resultats.length + ' affichées — affinez' : '') : ''));
            if (r.success) {
                msg.setText('<span style="color:#27ae60">' + r.trouves + ' spécialité(s) — cliquez une ligne pour '
                        + 'sa monographie</span>', false);
            } else {
                msg.setText('<span style="color:#c0392b">' + Ext.String.htmlEncode(r.msg || 'Échec') + '</span>', false);
            }
        }, grille);
    },

    lireMonographie: function (p, id) {
        var me = this, cible = p.down('#exMayiteMonographie');
        me.appel('GET', 'mayite/monographie/' + encodeURIComponent(id), function (r) {
            cible.update(r.success ? me.htmlMonographie(r) : '<div style="padding:16px;color:#c0392b">'
                    + Ext.String.htmlEncode(r.msg || 'Échec') + '</div>');
            cible.getEl().dom.scrollTop = 0;
        }, cible);
    },

    /** Monographie mise en forme : en-tête, rubriques en blocs, spécialités correspondantes en tableau. */
    htmlMonographie: function (m) {
        var me = this, h = function (s) {
            return Ext.String.htmlEncode(s || '').replace(/\n/g, '<br>');
        }, html = '<div style="padding:14px 16px;font-size:13px;line-height:1.45">'
                + '<div style="font-size:17px;font-weight:bold;color:#1f3a56">' + h(m.nom) + '</div>'
                + '<div style="margin:4px 0 12px 0;color:#555">' + (m.dci ? 'DCI : <b>' + h(m.dci) + '</b>' : '')
                + (m.prix ? '<span style="margin-left:18px">Prix : <b>' + h(m.prix) + '</b></span>' : '') + '</div>';
        Ext.each(m.rubriques || [], function (r) {
            if (!r.texte) {
                return;
            }
            html += '<div class="ex-mayite-rubrique" style="margin:0 0 10px 0;border-left:3px solid #2980b9;'
                    + 'padding:2px 0 2px 10px"><div style="font-weight:bold;color:#2980b9;margin-bottom:2px">'
                    + h(r.titre) + '</div><div>' + h(r.texte) + '</div></div>';
        });
        if ((m.equivalents || []).length) {
            html += '<div style="font-weight:bold;color:#1f3a56;margin:14px 0 6px 0">Spécialités correspondantes ('
                    + m.equivalents.length + ')</div><table style="border-collapse:collapse;width:100%">';
            Ext.each(m.equivalents, function (e, i) {
                html += '<tr style="background:' + (i % 2 ? '#f6f8fa' : '#fff') + '"><td style="padding:3px 6px">'
                        + '<a href="#" class="ex-mayite-equivalent" data-id="' + h(e.id) + '">' + h(e.nom) + '</a></td>'
                        + '<td style="padding:3px 6px;text-align:right;white-space:nowrap">' + me.montant(e.prix)
                        + ' FCFA</td></tr>';
            });
            html += '</table>';
        }
        return html + '<div style="margin-top:14px;color:#999;font-size:11px">Source : Mayité, consultée par la '
                + 'session Ubipharm</div></div>';
    },

    /**
     * Fenêtre de consultation (aucune modification) ouverte par le bouton « Monographie » d'un résultat Ubipharm :
     * recherche Mayité lancée sur le premier mot de la désignation, modifiable.
     */
    fenetreMayite: function (designation) {
        var me = this, mot = (String(designation || '').match(/[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9-]+/) || [''])[0],
                taille = Ext.getBody().getViewSize(),
                f = Ext.create('Ext.window.Window', {
                    title: 'Mayité — ' + Ext.String.htmlEncode(designation || ''), itemId: 'exFenetreMayite',
                    modal: true, width: Math.min(1200, taille.width - 40), height: Math.min(680, taille.height - 40),
                    layout: 'fit', items: [me.panneauMayite('exMayiteFenetre', mot)],
                    buttons: [{text: 'Fermer', handler: function () {
                                f.close();
                            }}]
                });
        f.show();
        if (mot.length >= 2) {
            me.rechercherMayite(f.down('#exMayiteFenetre'), f.down('#exMayiteGrille').getStore());
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

    /* ---------------------------------------------------------------- grossistes liés (demande du 09/11) */

    SOURCES_LIABLES: [['', '— aucun —'], ['UBIPHARM', 'Ubipharm'], ['TEDIS', 'TEDIS'], ['COPHARMED', 'Copharmed'],
        ['DPCI', 'DPCI']],

    libelleSource: function (v) {
        var t = '';
        Ext.each(this.SOURCES_LIABLES, function (c) {
            if (c[0] === v) {
                t = c[1];
            }
        });
        return v ? t || v : '';
    },

    /**
     * Lien entre chaque grossiste de Prestige et l'extranet qui le sert : utilisé par le traitement des suggestions
     * (unités gratuites, stock et commandes du grossiste) et pour vérifier la saisie des BL. Plusieurs grossistes
     * peuvent être servis par le même extranet (Ubipharm : une agence LABOREX-CI par grossiste).
     */
    ongletGrossistesLies: function () {
        var me = this, edition = Ext.create('Ext.grid.plugin.CellEditing', {clicksToEdit: 1});
        return {
            title: 'Grossistes liés', itemId: 'exOngletGrossistesLies', layout: 'fit',
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'checkbox', itemId: 'exLiesFiltre', boxLabel: 'Seulement les grossistes liés ou proposés',
                            checked: true, listeners: {change: function () {
                                    me.filtrerGrossistesLies();
                                }}},
                        {xtype: 'tbspacer', width: 10},
                        {text: 'Reprendre les propositions', itemId: 'exLiesProposer',
                            tooltip: 'Lie chaque grossiste encore sans extranet à l\'extranet proposé (à enregistrer ensuite)',
                            handler: function () {
                                me.grossistesLies.each(function (r) {
                                    if (!r.get('source') && r.get('propose')) {
                                        r.set('source', r.get('propose'));
                                    }
                                });
                                me.majBoutonLies();
                            }},
                        {text: 'Enregistrer', itemId: 'exLiesEnregistrer', disabled: true, handler: function (b) {
                                var n = me.changementsLies().length;
                                me.confirmerDansBouton(b, 'Enregistrer ' + n + ' changement(s) ?', function () {
                                    me.enregistrerGrossistesLies();
                                });
                            }},
                        {text: 'Annuler', itemId: 'exLiesAnnuler', disabled: true, handler: function () {
                                me.grossistesLies.each(function (r) {
                                    r.set('source', r.get('avant'));
                                });
                                me.majBoutonLies();
                            }},
                        '->', {xtype: 'label', itemId: 'exLiesResume'}, {xtype: 'tbspacer', width: 12},
                        {xtype: 'label', itemId: 'exLiesMsg'}]}],
            items: [{xtype: 'gridpanel', itemId: 'exLiesGrille', store: me.grossistesLies, columnLines: true,
                    plugins: [edition],
                    viewConfig: {deferEmptyText: false, emptyText: '<div style="padding:12px">Aucun grossiste</div>'},
                    columns: [
                        {text: 'Grossiste de Prestige', dataIndex: 'libelle', flex: 1, renderer: function (v, m, r) {
                                return me.texte(v) + (r.get('actif') ? '' : ' <i style="color:#999">(désactivé)</i>');
                            }},
                        {text: 'Code', dataIndex: 'code', width: 110, renderer: me.texte},
                        {text: 'Extranet', dataIndex: 'source', width: 150, renderer: function (v, m, r) {
                                var t = v ? '<b>' + me.texte(me.libelleSource(v)) + '</b>'
                                        : '<span style="color:#999">aucun</span>';
                                return t + ' ▾' + (v !== r.get('avant') ? ' <span style="color:#d35400">●</span>' : '');
                            },
                            editor: {xtype: 'combo', editable: false, store: me.SOURCES_LIABLES, queryMode: 'local',
                                listeners: {select: function () {
                                        edition.completeEdit();
                                    }}}},
                        {text: 'Proposé', dataIndex: 'propose', width: 110, renderer: function (v) {
                                return me.texte(me.libelleSource(v));
                            }},
                        {text: 'Modifié le', dataIndex: 'modifieLe', width: 140, renderer: function (v) {
                                return me.texte(v ? String(v).replace('T', ' ').substring(0, 16) : '');
                            }},
                        {text: 'Par', dataIndex: 'modifiePar', width: 100, renderer: me.texte}],
                    listeners: {edit: function () {
                            me.majBoutonLies();
                        }}}]
        };
    },

    chargerGrossistesLies: function (texteOk) {
        var me = this;
        me.appel('GET', 'grossistes', function (r) {
            if (!r.success) {
                me.message('#exLiesMsg', r);
                return;
            }
            Ext.each(r.grossistes || [], function (g) {
                g.avant = g.source;
            });
            me.grossistesLies.loadData(r.grossistes || []);
            me.filtrerGrossistesLies();
            me.down('#exLiesResume').setText(Ext.Array.map(r.sources || [], function (s) {
                return Ext.String.htmlEncode(s.libelle) + ' : ' + s.lies;
            }).join(' · '));
            me.majBoutonLies();
            if (texteOk) {
                me.message('#exLiesMsg', {success: true}, texteOk);
            }
        }, me.down('#exOngletGrossistesLies'));
    },

    filtrerGrossistesLies: function () {
        var st = this.grossistesLies, seul = this.down('#exLiesFiltre').getValue();
        st.clearFilter(seul);
        if (seul) {
            st.filterBy(function (r) {
                return !!(r.get('source') || r.get('avant') || r.get('propose'));
            });
        }
    },

    /** Lignes modifiées (filtre compris) : {grossiste, source}. */
    changementsLies: function () {
        var l = [], st = this.grossistesLies;
        (st.snapshot || st.data).each(function (r) {
            if (r.get('source') !== r.get('avant')) {
                l.push({grossiste: r.get('id'), source: r.get('source') || ''});
            }
        });
        return l;
    },

    majBoutonLies: function () {
        var n = this.changementsLies().length;
        this.down('#exLiesEnregistrer').setDisabled(n === 0);
        this.down('#exLiesAnnuler').setDisabled(n === 0);
        this.down('#exLiesEnregistrer').setText(n ? 'Enregistrer (' + n + ')' : 'Enregistrer');
        this.down('#exLiesEnregistrer').texteNormal = this.down('#exLiesEnregistrer').getText();
    },

    enregistrerGrossistesLies: function () {
        var me = this, l = me.changementsLies();
        Ext.Ajax.request({
            method: 'PUT', url: me.URL + 'grossistes', jsonData: {liaisons: l},
            callback: function (o, ok, rep) {
                var r = Ext.decode(rep.responseText, true) || {success: false, msg: 'Erreur ' + rep.status};
                if (!r.success) {
                    me.message('#exLiesMsg', r);
                    return;
                }
                me.chargerGrossistesLies(r.changes + ' lien(s) enregistré(s)');
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
                            editable: false, value: 'UBIPHARM', store: [['UBIPHARM', 'Ubipharm'], ['TEDIS', 'TEDIS'], ['COPHARMED', 'Copharmed'], ['DPCI', 'DPCI']],
                            listeners: {change: function (c, v) {
                                    me.collectes.getProxy().url = me.URL + v + '/collectes';
                                    me.collectes.load();
                                }}}, me.boutonExporter('exCollectesExport', '#exCollectesGrille', function () {
                            return me.down('#exCollectesSource').getRawValue();
                        }, 'Collectes', null)]}],
            items: [{xtype: 'gridpanel', itemId: 'exCollectesGrille', store: me.collectes, columnLines: true,
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
