/* global Ext */

/*
 * Cahier des charges du 24/11, point 2 : menu « Journal des ventes en saisie » (SERVICE CLIENT), droit
 * P_SM_JOURNAL_SAISIE_VENTE. Preuve de chaque geste sur une vente en saisie : début de saisie, mise en attente,
 * Retour et choix fait, reprise, interruption et sa cause, abandon, et chaque REFUS (droit manquant, vente ouverte
 * ailleurs), avec utilisateur, poste, heure, nombre de lignes et montant. Chaque ligne porte l'empreinte de la
 * précédente : l'en-tête dit si la chaîne est intacte ou à quelle ligne elle est rompue. Export CSV des mêmes lignes.
 */
Ext.define('testextjs.view.vente.JournalSaisieVente', {
    extend: 'Ext.panel.Panel',
    xtype: 'journalsaisievente',
    cls: 'jsv-ecran',
    layout: 'fit',
    bodyPadding: 8,

    /* memes libelles que le PDF (VenteSaisieRessource.GESTES) */
    GESTES: {DEBUT_SAISIE: 'Début de saisie', METTRE_EN_ATTENTE: 'Mise en attente', REPRENDRE_ATTENTE: 'Rappel d\'une vente en attente',
        RETOUR_SUPPRIMER: 'Retour : vente abandonnée', INTERROMPRE: 'Saisie interrompue', SIGNAL_RETROUVE: 'Signal retrouvé',
        REPRENDRE_INTERROMPUE: 'Reprise d\'une saisie interrompue', ABANDONNER_INTERROMPUE: 'Abandon en fin de décompte',
        EXPIRER: 'Abandon au changement de jour', SUPPRIMER_ATTENTE: 'Suppression d\'une vente en attente', CLOTURER: 'Clôture'},
    requires: ['testextjs.view.commun.ChampPeriode'],
    ETATS: {EN_COURS: 'En cours', EN_ATTENTE: 'En attente', INTERROMPUE: 'Interrompue', ABANDONNEE: 'Abandonnée', CLOTUREE: 'Clôturée'},

    initComponent: function () {
        var me = this, aujourdhui = new Date(), e = function (t) {
            return Ext.String.htmlEncode(t === undefined || t === null ? '' : String(t));
        };
        me.journal = Ext.create('Ext.data.Store', {
            fields: ['id', 'le', 'numero', 'depot', 'geste', 'etatAvant', 'etatApres', 'admis', 'motif', 'cause', 'utilisateur',
                'poste', 'lignes', 'montant', 'empreinte'],
            proxy: {type: 'ajax', url: '../api/v1/vente-saisie/journal', timeout: 120000,
                reader: {type: 'json', root: 'data', totalProperty: 'total'}},
            listeners: {
                beforeload: function (s) {
                    s.getProxy().extraParams = me.filtres();
                },
                load: function (s, recs, ok) {
                    var o = s.getProxy().getReader().rawData || {}, c = me.down('#jsvChaine');
                    if (!c) {
                        return;
                    }
                    if (!ok) {
                        c.update('<span style="color:#b91c1c">Journal indisponible (droit ou connexion).</span>');
                    } else if (o.intact) {
                        c.update('<span class="jsv-intact" style="color:#15803d;font-weight:600">Chaîne d\'empreintes intacte</span> ('
                                + o.lignesControlees + ' lignes contrôlées)');
                    } else {
                        c.update('<span class="jsv-rompue" style="color:#b91c1c;font-weight:700">CHAÎNE ROMPUE à la ligne n° '
                                + e(o.rupture) + ' : une ligne a été modifiée ou retirée en base.</span>');
                    }
                }
            },
            autoLoad: true
        });
        var liste = function (itemId, libelle, largeur) {
            /* retours du 25/11 (1.5) : listes remplies par journal/valeurs (periode choisie) ; vide = tous */
            return {xtype: 'combobox', itemId: itemId, fieldLabel: libelle, labelWidth: libelle.length * 6 + 8, width: largeur,
                queryMode: 'local', valueField: 'valeur', displayField: 'libelle', editable: false, emptyText: 'Tous',
                store: Ext.create('Ext.data.Store', {fields: ['valeur', 'libelle'], data: []}),
                listeners: {select: function () {
                        me.journal.load();
                    }}};
        };
        Ext.applyIf(me, {
            dockedItems: [{xtype: 'toolbar', dock: 'top', itemId: 'jsvBarre', items: [
                        {xtype: 'datefield', itemId: 'jsvDu', fieldLabel: 'Du', labelWidth: 22, width: 135, format: 'd/m/Y', value: aujourdhui, maxValue: aujourdhui},
                        /* retours du 25/11 : le nouveau selecteur de periode (champ unique, cases Du / Au) */
                        {xtype: 'datefield', itemId: 'jsvAu', fieldLabel: 'au', labelWidth: 20, width: 133, format: 'd/m/Y', value: aujourdhui, maxValue: aujourdhui,
                            plugins: [{ptype: 'champperiode', debut: 'jsvDu', declencher: 'jsvChercher', libelle: 'Période', largeur: 230}]},
                        {xtype: 'button', itemId: 'jsvChercher', text: 'Rechercher', iconCls: 'searchicon', cls: 'ordo-btn-primaire', handler: function () {
                                me.chargerValeurs();
                                me.journal.load();
                            }},
                        {xtype: 'component', itemId: 'jsvChaine', margin: '0 0 0 12', html: ''},
                        '->',
                        {xtype: 'button', itemId: 'jsvImprimer', text: 'Imprimer', iconCls: 'printable', cls: 'ordo-btn', handler: function () {
                                window.open('../api/v1/vente-saisie/journal/pdf?' + Ext.Object.toQueryString(me.filtres()));
                            }},
                        {xtype: 'button', itemId: 'jsvExport', text: 'Export CSV', iconCls: 'excel', cls: 'ordo-btn', handler: function () {
                                window.location.href = '../api/v1/vente-saisie/journal/export?' + Ext.Object.toQueryString(me.filtres());
                            }},
                        {xtype: 'button', itemId: 'jsvInventaire', text: 'Créer un inventaire', cls: 'ordo-btn',
                            tooltip: 'Inventaire des produits contenus dans les ventes affichées', handler: function (b) {
                                me.creerInventaire(b);
                            }}
                    ]}, {xtype: 'toolbar', dock: 'top', itemId: 'jsvFiltres', items: [
                        liste('jsvGeste', 'Geste', 260),
                        liste('jsvPoste', 'Poste', 200),
                        liste('jsvUtilisateur', 'Utilisateur', 250),
                        {xtype: 'textfield', itemId: 'jsvMotif', fieldLabel: 'Motif', labelWidth: 40, width: 230, emptyText: 'Motif ou cause contient…',
                            enableKeyEvents: true, listeners: {specialkey: function (f, ev) {
                                    if (ev.getKey() === ev.ENTER) {
                                        me.journal.load();
                                    }
                                }}},
                        {xtype: 'button', itemId: 'jsvToutVoir', text: 'Effacer les filtres', cls: 'ordo-btn', handler: function () {
                                Ext.Array.forEach(['#jsvGeste', '#jsvPoste', '#jsvUtilisateur', '#jsvMotif'], function (s) {
                                    me.down(s).setValue(null);
                                });
                                me.journal.load();
                            }},
                        {xtype: 'component', itemId: 'jsvMessage', margin: '0 0 0 12', html: ''}
                    ]}],
            items: [{
                    xtype: 'gridpanel', itemId: 'jsvGrille', store: me.journal,
                    viewConfig: {emptyText: '<div style="padding:12px;color:#64748b">Aucun geste sur la période.</div>', deferEmptyText: false},
                    columns: [
                        {header: 'N°', dataIndex: 'id', width: 70, menuDisabled: true},
                        {header: 'Date et heure', dataIndex: 'le', width: 140, menuDisabled: true},
                        {header: 'Vente', dataIndex: 'numero', width: 115, menuDisabled: true, renderer: function (v, m, r) {
                                return e(v) + (r.get('depot') ? ' <span style="color:#64748b">(dépôt)</span>' : '');
                            }},
                        {header: 'Geste', dataIndex: 'geste', width: 210, menuDisabled: true, renderer: function (v) {
                                return e(me.GESTES[v] || v);
                            }},
                        {header: 'Résultat', dataIndex: 'admis', width: 85, menuDisabled: true, renderer: function (v) {
                                return v ? '<span style="color:#15803d">Fait</span>' : '<span style="color:#b91c1c;font-weight:600">Refusé</span>';
                            }},
                        {header: 'État', dataIndex: 'etatApres', width: 160, menuDisabled: true, renderer: function (v, m, r) {
                                var a = me.ETATS[r.get('etatAvant')] || '', b = me.ETATS[v] || '';
                                return e(a && b && a !== b ? a + ' → ' + b : b || a);
                            }},
                        {header: 'Motif / cause', dataIndex: 'motif', flex: 1, minWidth: 160, menuDisabled: true, renderer: function (v, m, r) {
                                var t = v || r.get('cause');
                                if (t) {
                                    m.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(e(t)) + '"';
                                }
                                return e(t);
                            }},
                        {header: 'Utilisateur', dataIndex: 'utilisateur', width: 150, menuDisabled: true, renderer: function (v) {
                                return v ? e(v) : '<span style="color:#94a3b8">Serveur</span>';
                            }},
                        {header: 'Poste', dataIndex: 'poste', width: 120, menuDisabled: true, renderer: e},
                        {header: 'Lignes', dataIndex: 'lignes', width: 60, align: 'right', menuDisabled: true},
                        {header: 'Montant', dataIndex: 'montant', width: 90, align: 'right', menuDisabled: true, renderer: function (v) {
                                return v === null || v === undefined || v === '' ? '' : Ext.util.Format.number(v, '0,000').replace(/,/g, ' ');
                            }}
                    ]
                }]
        });
        me.callParent(arguments);
        me.chargerValeurs();
    },

    /** Filtres de l'ecran : periode, geste, poste, utilisateur, motif ; lus par la liste, le CSV, le PDF et l'inventaire. */
    filtres: function () {
        var me = this, du = me.down('#jsvDu'), au = me.down('#jsvAu'), v = function (s) {
            var c = me.down(s), x = c ? c.getValue() : null;
            return x === null || x === undefined ? '' : String(x).trim();
        };
        return {du: du ? Ext.Date.format(du.getValue() || new Date(), 'Y-m-d') : '', au: au ? Ext.Date.format(au.getValue() || new Date(), 'Y-m-d') : '',
            geste: v('#jsvGeste'), poste: v('#jsvPoste'), utilisateur: v('#jsvUtilisateur'), motif: v('#jsvMotif')};
    },

    /** Listes geste / poste / utilisateur de la periode choisie. */
    chargerValeurs: function () {
        var me = this, f = me.filtres();
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/vente-saisie/journal/valeurs',
            params: {du: f.du, au: f.au},
            success: function (r) {
                var d = Ext.JSON.decode(r.responseText, true) || {};
                if (!d.success || me.isDestroyed) {
                    return;
                }
                Ext.Array.forEach([['#jsvGeste', d.gestes], ['#jsvPoste', d.postes], ['#jsvUtilisateur', d.utilisateurs]], function (x) {
                    var c = me.down(x[0]);
                    if (c) {
                        c.getStore().loadData([{valeur: '', libelle: 'Tous'}].concat(x[1] || []));
                    }
                });
            }
        });
    },

    /*
     * « Créer un inventaire » (retours du 25/11, 1.5) : produits contenus dans les ventes affichées. 1er clic : le
     * bouton dit combien de produits et demande confirmation (5 s) ; 2e clic : création. Aucune fenetre.
     */
    creerInventaire: function (b) {
        var me = this, msg = me.down('#jsvMessage'), dire = function (t, erreur) {
            msg.update('<span style="color:' + (erreur ? '#b91c1c' : '#15803d') + ';font-weight:600">' + Ext.String.htmlEncode(t) + '</span>');
        }, desarmer = function () {
            clearTimeout(me.minuteurInventaire);
            b.jsvArme = false;
            b.removeCls('psv-arme');
            b.setText('Créer un inventaire');
            b.enable();
        };
        if (!b.jsvArme) {
            b.disable();
            Ext.Ajax.request({
                method: 'GET', url: '../api/v1/vente-saisie/journal/inventaire', params: me.filtres(),
                success: function (r) {
                    var d = Ext.JSON.decode(r.responseText, true) || {};
                    b.enable();
                    if (!d.success) {
                        dire(d.msg || 'Création refusée.', true);
                        return;
                    }
                    if (!d.count) {
                        dire('Aucun produit dans les ventes affichées.', true);
                        return;
                    }
                    b.jsvArme = true;
                    b.addCls('psv-arme');
                    b.setText('Confirmer : inventaire de ' + d.count + ' produit(s)');
                    me.minuteurInventaire = setTimeout(desarmer, 5000);
                },
                failure: function () {
                    desarmer();
                    dire('Serveur injoignable : réessayez.', true);
                }
            });
            return;
        }
        clearTimeout(me.minuteurInventaire);
        b.disable();
        b.setText('Création…');
        Ext.Ajax.request({
            method: 'POST', url: '../api/v1/vente-saisie/journal/inventaire?' + Ext.Object.toQueryString(me.filtres()), timeout: 600000,
            success: function (r) {
                var d = Ext.JSON.decode(r.responseText, true) || {};
                desarmer();
                if (d.success) {
                    dire('Inventaire créé : ' + d.count + ' produit(s) (' + (d.nom || '') + ').');
                } else {
                    dire(d.msg || 'La création de l\'inventaire a échoué.', true);
                }
            },
            failure: function () {
                desarmer();
                dire('La création de l\'inventaire a échoué.', true);
            }
        });
    }
});
