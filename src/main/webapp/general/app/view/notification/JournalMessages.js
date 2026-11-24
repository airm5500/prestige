/* global Ext */

/*
 * Plan du 21/11, point 8.1 : menu « Journal des messages » (CAMPAGNES SMS / WHATSAPP), droit P_SM_JOURNAL_MESSAGES.
 * Un envoi par ligne : SMS (clients et numéro d'administration : ticket Z, clôture de caisse, point d'activité) et
 * WhatsApp. Filtres : période, canal, origine, état, recherche par nom ou numéro. Compteurs de toute la sélection,
 * export CSV des mêmes lignes. Jamais le texte des messages.
 * Retour du 22/11 (lot 9) : sélecteur de période unique ; analyse de la sélection (taux d'envoi, de réception, de
 * lecture, d'échec, en attente ; répartition par canal et par origine) ; bouton « Imprimer » (PDF : analyse puis
 * messages).
 */
Ext.define('testextjs.view.notification.JournalMessages', {
    extend: 'Ext.panel.Panel',
    xtype: 'journalmessages',
    requires: ['testextjs.view.commun.ChampPeriode'],
    cls: 'jm-ecran',
    layout: {type: 'vbox', align: 'stretch'},
    bodyPadding: 8,

    CLASSES: {'En attente': 'av-msg-attente', 'Envoyé': 'av-msg-envoye', 'Distribué': 'av-msg-distribue',
        'Lu': 'av-msg-lu', 'Échec': 'av-msg-echec'},

    initComponent: function () {
        var me = this, aujourdhui = new Date();
        me.renvois = {};
        me.journal = Ext.create('Ext.data.Store', {
            fields: ['id', 'date', 'canal', 'origine', 'origineLibelle', 'destinataire', 'numero', 'etat', 'motif', 'utilisateur'],
            pageSize: 50,
            proxy: {type: 'ajax', url: '../api/v1/journal-messages', timeout: 120000,
                reader: {type: 'json', root: 'data', totalProperty: 'total'}},
            listeners: {
                beforeload: function (s) {
                    s.getProxy().extraParams = me.filtres();
                },
                load: function (s, recs, ok) {
                    var o = s.getProxy().getReader().rawData || {};
                    me.dessinerCompteurs(ok && o.compteurs ? o.compteurs : null);
                    me.dessinerAnalyse(ok && o.analyse ? o.analyse : null);
                }
            }
        });
        me.origines = Ext.create('Ext.data.Store', {fields: ['code', 'libelle'], data: [{code: '', libelle: 'Toutes'}]});
        me.etats = Ext.create('Ext.data.Store', {fields: ['code', 'libelle'], data: [{code: '', libelle: 'Tous'}]});
        var etiquette = function (t) {
            return Ext.String.htmlEncode(t || '');
        };
        Ext.applyIf(me, {
            dockedItems: [{xtype: 'toolbar', dock: 'top', itemId: 'jmFiltres', cls: 'jm-filtres', items: [
                        {xtype: 'datefield', itemId: 'jmDu', fieldLabel: 'Du', labelWidth: 22, width: 135, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: aujourdhui, maxValue: aujourdhui},
                        {xtype: 'datefield', itemId: 'jmAu', fieldLabel: 'au', labelWidth: 20, width: 133, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: aujourdhui, maxValue: aujourdhui,
                            /* retour du 22/11 (lot 9) : le selecteur de periode unique */
                            plugins: [{ptype: 'champperiode', debut: 'jmDu', declencher: 'jmChercher', largeur: 205}]},
                        {xtype: 'combobox', itemId: 'jmCanal', fieldLabel: 'Canal', labelWidth: 38, width: 150, queryMode: 'local', editable: false,
                            displayField: 'libelle', valueField: 'code', value: '',
                            store: Ext.create('Ext.data.Store', {fields: ['code', 'libelle'], data: [{code: '', libelle: 'Tous'},
                                    {code: 'SMS', libelle: 'SMS'}, {code: 'WHATSAPP', libelle: 'WhatsApp'}]})},
                        {xtype: 'combobox', itemId: 'jmOrigine', fieldLabel: 'Origine', labelWidth: 45, width: 210, queryMode: 'local', editable: false,
                            displayField: 'libelle', valueField: 'code', value: '', store: me.origines},
                        {xtype: 'combobox', itemId: 'jmEtat', fieldLabel: 'État', labelWidth: 30, width: 150, queryMode: 'local', editable: false,
                            displayField: 'libelle', valueField: 'code', value: '', store: me.etats}
                    ]}, {
                    /* seconde ligne : en 1280 px, filtres et boutons ne tiennent pas sur une seule */
                    xtype: 'toolbar', dock: 'top', itemId: 'jmActions', cls: 'jm-filtres', items: [
                        {xtype: 'textfield', itemId: 'jmRecherche', emptyText: 'Nom ou numéro', width: 260, enableKeyEvents: true,
                            listeners: {specialkey: function (f, e) {
                                    if (e.getKey() === e.ENTER) {
                                        me.chercher();
                                    }
                                }}},
                        {xtype: 'button', itemId: 'jmChercher', text: 'Rechercher', iconCls: 'searchicon', cls: 'ordo-btn', handler: function () {
                                me.chercher();
                            }},
                        '->',
                        {xtype: 'button', itemId: 'jmImprimer', text: 'Imprimer', iconCls: 'printable', cls: 'ordo-btn',
                            tooltip: 'PDF : analyse de la sélection puis les messages (mêmes filtres, même ordre)', handler: function () {
                                me.imprimer();
                            }},
                        {xtype: 'button', itemId: 'jmExport', text: 'Export CSV', iconCls: 'excel', cls: 'ordo-btn',
                            tooltip: 'Les lignes filtrées, toutes pages, dans le même ordre', handler: function (b) {
                                me.exporter(b);
                            }}
                    ]}],
            items: [
                {xtype: 'component', itemId: 'jmCompteurs', cls: 'jm-compteurs', html: ''},
                /* retour du 22/11 (lot 9) : analyse de la selection (taux, repartition par canal et par origine) */
                {xtype: 'component', itemId: 'jmAnalyse', cls: 'jm-analyse', html: '',
                    listeners: {afterrender: function (c) {
                            c.getEl().on('click', function () {
                                me.repartitionOuverte = !me.repartitionOuverte;
                                me.dessinerAnalyse(me.derniereAnalyse);
                            }, null, {delegate: '.jm-voir-repartition'});
                        }}},
                {xtype: 'gridpanel', itemId: 'jmJournal', flex: 1, store: me.journal, cls: 'jm-journal',
                    viewConfig: {emptyText: '<div style="padding:12px;color:#64748b">Aucun message sur la période et les filtres choisis.</div>',
                        deferEmptyText: false},
                    columns: [
                        {header: 'Date', dataIndex: 'date', width: 135, sortable: false, menuDisabled: true},
                        {header: 'Canal', dataIndex: 'canal', width: 80, sortable: false, menuDisabled: true},
                        {header: 'Origine', dataIndex: 'origineLibelle', width: 130, sortable: false, menuDisabled: true, renderer: etiquette},
                        {header: 'Destinataire', dataIndex: 'destinataire', flex: 1, minWidth: 150, sortable: false, menuDisabled: true, renderer: etiquette},
                        {header: 'Numéro', dataIndex: 'numero', width: 110, sortable: false, menuDisabled: true, renderer: etiquette},
                        {header: 'État', dataIndex: 'etat', width: 100, itemId: 'jmColEtat', sortable: false, menuDisabled: true, renderer: function (v) {
                                return '<span class="av-msg ' + (me.CLASSES[v] || 'av-msg-attente') + '">' + etiquette(v) + '</span>';
                            }},
                        {header: 'Motif d\'échec', dataIndex: 'motif', flex: 1, minWidth: 140, sortable: false, menuDisabled: true, renderer: function (v, m) {
                                var t = etiquette(v);
                                if (t) {
                                    m.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(t) + '"';
                                }
                                return t;
                            }},
                        {header: 'Utilisateur', dataIndex: 'utilisateur', width: 150, sortable: false, menuDisabled: true, renderer: function (v) {
                                return v ? etiquette(v) : '<span style="color:#94a3b8">Automatique</span>';
                            }},
                        /* retours du 22/11 (lot 10, point 1) : renvoi d'un echec (message a un client) par SMS ou WhatsApp ;
                           1er clic : le bouton demande confirmation, 2e clic : renvoi (pas de fenetre surgissante) */
                        {header: 'Renvoyer', itemId: 'jmColRenvoyer', width: 175, sortable: false, menuDisabled: true, renderer: function (v, m, r) {
                                var id = r.get('id') || '';
                                if (r.get('etat') !== 'Échec' || (id.charAt(0) !== 'W' && id.charAt(0) !== 'S')) {
                                    return '';
                                }
                                var etat = me.renvois[id] || {}, bouton = function (canal, libelle) {
                                    if (etat.enCours) {
                                        return etat.enCours === canal ? '<span class="jm-renvoi-cours">Envoi…</span>' : '';
                                    }
                                    /* pendant la confirmation, seul le bouton arme reste : « Confirmer WhatsApp ? » a cote de
                                       « SMS » debordait de la colonne et le 2e clic tombait a cote */
                                    if (etat.arme && etat.arme !== canal) {
                                        return '';
                                    }
                                    var arme = etat.arme === canal;
                                    return '<button type="button" class="jm-renvoi' + (arme ? ' jm-renvoi-arme' : '') + '" data-renvoi="' + canal
                                            + '" data-id="' + Ext.String.htmlEncode(id) + '">' + (arme ? 'Confirmer ' + libelle + ' ?' : libelle) + '</button>';
                                };
                                var resultat = '';
                                if (etat.resultat) {
                                    m.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(Ext.String.htmlEncode(etat.resultat.msg || '')) + '"';
                                    resultat = '<span class="' + (etat.resultat.success ? 'jm-renvoi-ok' : 'jm-renvoi-ko') + '">'
                                            + (etat.resultat.success ? 'Renvoyé par ' : 'Échec du renvoi par ') + (etat.resultat.canal === 'SMS' ? 'SMS' : 'WhatsApp') + '</span>';
                                    if (etat.resultat.success) {
                                        return resultat;
                                    }
                                    /* echec du renvoi : on peut reessayer, par l'autre canal par exemple */
                                    resultat += '<br>';
                                }
                                return resultat + bouton('SMS', 'SMS') + ' ' + bouton('WHATSAPP', 'WhatsApp');
                            }}
                    ],
                    listeners: {
                        afterrender: function (g) {
                            g.getView().getEl().on('click', function (e, t) {
                                e.stopEvent();
                                me.cliquerRenvoi(t.getAttribute('data-id'), t.getAttribute('data-renvoi'));
                            }, null, {delegate: '.jm-renvoi'});
                        }
                    },
                    dockedItems: [{xtype: 'pagingtoolbar', dock: 'bottom', store: me.journal, displayInfo: true,
                            displayMsg: 'Messages {0} à {1} sur {2}', emptyMsg: 'Aucun message'}]
                }]
        });
        me.callParent(arguments);
        me.on('afterrender', function () {
            Ext.Ajax.request({url: '../api/v1/journal-messages/filtres', method: 'GET', success: function (r) {
                    var o = Ext.decode(r.responseText, true) || {};
                    if (o.success) {
                        me.origines.add(o.origines);
                        me.etats.add(Ext.Array.map(o.etats, function (e) {
                            return {code: e, libelle: e};
                        }));
                    }
                }});
            me.journal.loadPage(1);
        }, me, {single: true});
    },

    filtres: function () {
        var me = this, v = function (id) {
            var c = me.down('#' + id);
            return c ? (c.getSubmitValue ? c.getSubmitValue() : c.getValue()) || '' : '';
        };
        return {dtStart: v('jmDu'), dtEnd: v('jmAu'), canal: me.down('#jmCanal').getValue() || '',
            origine: me.down('#jmOrigine').getValue() || '', etat: me.down('#jmEtat').getValue() || '',
            query: me.down('#jmRecherche').getValue() || ''};
    },

    chercher: function () {
        this.journal.loadPage(1);
    },

    /** Retours du 22/11 (lot 10, point 1) : etat des renvois, par ligne (arme, en cours, resultat). */
    renvois: {},

    cliquerRenvoi: function (id, canal) {
        var me = this, etat = me.renvois[id] || {}, grille = me.down('#jmJournal');
        if (etat.arme !== canal) {
            var arme = {arme: canal};
            me.renvois[id] = arme;
            grille.getView().refresh();
            /* sans 2e clic dans les 5 s, le bouton revient a son libelle (meme regle que les autres confirmations) */
            Ext.defer(function () {
                if (!me.isDestroyed && me.renvois[id] === arme) {
                    delete me.renvois[id];
                    grille.getView().refresh();
                }
            }, 5000);
            return;
        }
        me.renvois[id] = {enCours: canal};
        grille.getView().refresh();
        /* la ressource lit id et canal dans l'adresse (@QueryParam) : dans le corps du POST, ils n'arrivaient pas */
        Ext.Ajax.request({url: '../api/v1/journal-messages/renvoyer?' + Ext.Object.toQueryString({id: id, canal: canal}), method: 'POST', timeout: 120000,
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {success: false, msg: 'Réponse illisible.'};
                if (!me.isDestroyed) {
                    me.renvois[id] = {resultat: {success: !!o.success, canal: canal, msg: o.msg || ''}};
                    grille.getView().refresh();
                    me.journal.load();
                }
            },
            failure: function (r) {
                if (!me.isDestroyed) {
                    me.renvois[id] = {resultat: {success: false, canal: canal, msg: 'Le serveur n\'a pas répondu (' + r.status + ').'}};
                    grille.getView().refresh();
                }
            }});
    },

    dessinerCompteurs: function (c) {
        var c0 = this.down('#jmCompteurs'), n = function (x) {
            return Ext.util.Format.number(x || 0, '0,000').replace(/,/g, ' ');
        };
        if (!c0) {
            return;
        }
        if (!c) {
            c0.update('');
            return;
        }
        var p = function (cle, libelle, classe, aide) {
            return '<span class="jm-compteur ' + classe + '" data-jm="' + cle + '" data-qtip="' + aide + '">' + libelle + ' <b>' + n(c[cle]) + '</b></span>';
        };
        c0.update(p('total', 'Messages', 'jm-total', 'Messages de la sélection')
                + p('envoyes', 'Envoyés', 'av-msg-envoye', 'Partis (y compris distribués et lus)')
                + p('distribues', 'Distribués', 'av-msg-distribue', 'Arrivés sur le téléphone (y compris lus)')
                + p('lus', 'Lus', 'av-msg-lu', 'Lus (WhatsApp)')
                + p('echecs', 'Échecs', 'av-msg-echec', 'Refusés ou non envoyés')
                + p('attente', 'En attente', 'av-msg-attente', 'Pas encore partis'));
    },

    /** Taux de l'ensemble en tuiles ; repartition par canal et par origine sur demande (lien). */
    dessinerAnalyse: function (a) {
        var me = this, c0 = me.down('#jmAnalyse'), n = function (x) {
            return Ext.util.Format.number(x || 0, '0,000').replace(/,/g, ' ');
        }, t = function (x) {
            return String(Math.round((x || 0) * 10) / 10).replace('.', ',') + ' %';
        };
        me.derniereAnalyse = a;
        if (!c0) {
            return;
        }
        if (!a || !a.ensemble) {
            c0.update('');
            return;
        }
        var e = a.ensemble;
        var tuile = function (cle, libelle, valeur, detail, classe) {
            return '<div class="jm-taux ' + classe + '" data-jm-taux="' + cle + '"><span>' + libelle + '</span><b>' + valeur + '</b><i>' + detail + '</i></div>';
        };
        var lecture = e.distribuesWhatsApp > 0 ? t(e.tauxLecture) : '—';
        var html = '<div class="jm-taux-ligne">'
                + tuile('envoi', 'Taux d\'envoi', t(e.tauxEnvoi), n(e.envoyes) + ' envoyés / ' + n(e.total), 'av-msg-envoye')
                + tuile('reception', 'Taux de réception', t(e.tauxReception), n(e.distribues) + ' distribués / ' + n(e.envoyes) + ' envoyés', 'av-msg-distribue')
                + tuile('lecture', 'Taux de lecture', lecture, 'WhatsApp : ' + n(e.lusWhatsApp) + ' lus / ' + n(e.distribuesWhatsApp) + ' distribués', 'av-msg-lu')
                + tuile('echec', 'Échecs', t(e.tauxEchec), n(e.echecs) + ' / ' + n(e.total), 'av-msg-echec')
                + tuile('attente', 'En attente', t(e.tauxAttente), n(e.attente) + ' / ' + n(e.total), 'av-msg-attente')
                + '<span class="jm-voir-repartition">' + (me.repartitionOuverte ? 'Masquer la répartition' : 'Voir la répartition par canal et par origine') + '</span>'
                + '</div>';
        if (me.repartitionOuverte) {
            var tableau = function (titre, lignes) {
                return '<table class="jm-repartition"><tr><th>' + titre + '</th><th>Messages</th><th>Envoyés</th><th>Distribués</th><th>Lus</th><th>Échecs</th>'
                        + '<th>En attente</th><th>Envoi</th><th>Réception</th><th>Lecture</th><th>Échec</th></tr>'
                        + Ext.Array.map(lignes || [], function (l) {
                            return '<tr><td>' + Ext.String.htmlEncode(l.libelle || '') + '</td><td>' + n(l.total) + '</td><td>' + n(l.envoyes) + '</td><td>'
                                    + n(l.distribues) + '</td><td>' + n(l.lus) + '</td><td>' + n(l.echecs) + '</td><td>' + n(l.attente) + '</td><td>'
                                    + t(l.tauxEnvoi) + '</td><td>' + t(l.tauxReception) + '</td><td>' + (l.distribuesWhatsApp > 0 ? t(l.tauxLecture) : '—')
                                    + '</td><td>' + t(l.tauxEchec) + '</td></tr>';
                        }).join('') + '</table>';
            };
            html += '<div class="jm-repartitions">' + tableau('Canal', a.parCanal) + tableau('Origine', a.parOrigine) + '</div>';
        }
        c0.update(html);
        me.updateLayout();
    },

    imprimer: function () {
        window.open('../api/v1/journal-messages/pdf?' + Ext.Object.toQueryString(this.filtres()));
    },

    exporter: function (bouton) {
        var url = '../api/v1/journal-messages/csv?' + Ext.Object.toQueryString(this.filtres());
        if (window.PrestigeChargement && PrestigeChargement.telecharger) {
            PrestigeChargement.telecharger(bouton, url, 'Export…');
        } else {
            window.open(url);
        }
    }
});
