/* global Ext */

/*
 * RESSOURCES HUMAINES (plan d'octobre, section 3, lot L11a). Quatre onglets :
 *  - Planning de la semaine : une case par employe et par jour (travail, garde, repos ; debut, fin, pause), total des
 *    heures prevues, absences validees rappelees, copie de la semaine precedente ;
 *  - Conges et absences : calendrier du mois (couleur par type, demande en clair, valide en plein) et liste des
 *    demandes a valider / refuser (droit P_RH_VALIDER_CONGE) ;
 *  - Employes : matricule et badge uniques, lien facultatif vers un utilisateur du logiciel ;
 *  - Connexions : connexion / deconnexion de chaque utilisateur (poste, adresse, duree) ;
 *  - (L11b) Presence du jour : pointages, entree, sortie, presence, retard, heures sup., anomalies ; pointage manuel ;
 *  - (L11b) Pointages : import de la pointeuse en trois etapes (lecture, controle, enregistrement) selon le modele de la
 *    marque, modeles, historique des imports ;
 *  - (L11b) Tableau : retards, absences, heures supplementaires sur une periode, Excel et PDF (dans l'onglet).
 * Les fenetres sont des fenetres de saisie (aucune edition en pop-up).
 */
Ext.define('testextjs.view.rh.RhManager', {
    extend: 'Ext.tab.Panel',
    xtype: 'rhmanager',
    id: 'rhmanagerID',
    title: 'Ressources humaines',
    frame: true,
    width: '98%',
    height: 640,
    cls: 'rh',

    JOURS: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
    TYPES_PLANNING: {TRAVAIL: ['Travail', '#2e86c1'], GARDE: ['Garde', '#8e44ad'], REPOS: ['Repos', '#7f8c8d']},
    TYPES_ABSENCE: {CONGE: ['Congé', '#27ae60'], REPOS: ['Repos', '#7f8c8d'], MALADIE: ['Maladie', '#e67e22'], AUTRE: ['Autre', '#2c3e50']},
    STATUTS: {DEMANDE: ['Demandée', '#b9770e'], VALIDE: ['Validée', '#1e8449'], REFUSE: ['Refusée', '#c0392b']},

    initComponent: function () {
        var me = this;
        me.lundi = me.lundiDe(new Date());
        me.mois = Ext.Date.getFirstDateOfMonth(new Date());
        me.items = [me.ongletPlanning(), me.ongletPresence(), me.ongletAbsences(), me.ongletPointages(), me.ongletTableau(),
            me.ongletEmployes(), me.ongletConnexions()];
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.appel('GET', '../api/v1/rh/droits', null, function (r) {
                me.peutValider = !!r.valider;
                me.chargerPlanning();
            });
        });
        me.on('tabchange', function (p, t) {
            if (t.itemId === 'ongletAbsences') {
                me.chargerAbsences();
            } else if (t.itemId === 'ongletEmployes') {
                me.down('#ongletEmployes').getStore().load();
            } else if (t.itemId === 'ongletConnexions') {
                me.down('#ongletConnexions').getStore().load();
            } else if (t.itemId === 'ongletPlanning') {
                me.chargerPlanning();
            } else if (t.itemId === 'ongletPresence') {
                me.chargerPresence();
            } else if (t.itemId === 'ongletPointages') {
                me.chargerModeles();
                me.down('#grilleLots').getStore().load();
            } else if (t.itemId === 'ongletTableau') {
                me.chargerTableau();
            }
        });
    },

    /* ------------------------------------------------------------------ outils */

    lundiDe: function (d) {
        var j = Ext.Date.clearTime(d, true), n = (j.getDay() + 6) % 7;
        return Ext.Date.add(j, Ext.Date.DAY, -n);
    },
    iso: function (d) {
        return Ext.Date.format(d, 'Y-m-d');
    },
    fr: function (s) {
        return s ? s.split('-').reverse().join('/') : '';
    },
    heures: function (m) {
        m = Number(m) || 0;
        return Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + Ext.String.leftPad(m % 60, 2, '0') : '');
    },
    esc: function (s) {
        return Ext.String.htmlEncode(s || '');
    },

    appel: function (methode, url, corps, suite) {
        var me = this;
        me.setLoading(true);
        Ext.Ajax.request({
            url: url, method: methode, headers: corps ? {'Content-Type': 'application/json'} : undefined, jsonData: corps || undefined,
            success: function (response) {
                me.setLoading(false);
                var r = Ext.JSON.decode(response.responseText, true) || {};
                if (r.success === false) {
                    Ext.MessageBox.alert('Ressources humaines', me.esc(r.msg || r.message || 'Action refusée.'));
                    return;
                }
                suite(r);
            },
            failure: function () {
                me.setLoading(false);
                Ext.MessageBox.alert('Ressources humaines', 'Le serveur n\'a pas répondu.');
            }
        });
    },

    /* ------------------------------------------------------------------ planning */

    ongletPlanning: function () {
        var me = this, colonnes = [
            {text: 'Employé', dataIndex: 'employe', width: 190, locked: false, renderer: function (v, m, r) {
                    return '<b>' + me.esc(v) + '</b><div style="color:#7f8c8d;font-size:11px">' + me.esc(r.get('matricule'))
                            + (r.get('poste') ? ' · ' + me.esc(r.get('poste')) : '') + '</div>';
                }}
        ];
        for (var i = 0; i < 7; i++) {
            colonnes.push({text: me.JOURS[i], itemId: 'col' + i, dataIndex: 'j' + i, flex: 1, minWidth: 105, sortable: false, menuDisabled: true,
                renderer: (function (k) {
                    return function (v, m, r) {
                        var abs = r.get('a' + k), h = '';
                        if (v && v.type) {
                            var t = me.TYPES_PLANNING[v.type] || [v.type, '#555'];
                            h = '<span class="rh-case" style="border-left:4px solid ' + t[1] + '"><b style="color:' + t[1] + '">' + t[0] + '</b>'
                                    + (v.type !== 'REPOS' ? '<br>' + v.debut + ' – ' + v.fin + (v.pause ? ' <span style="color:#7f8c8d">(pause ' + v.pause + ' min)</span>' : '') : '') + '</span>';
                        } else {
                            h = '<span style="color:#b0bec5">—</span>';
                        }
                        if (abs) {
                            var a = me.TYPES_ABSENCE[abs.split(' ')[0]] || [abs, '#555'];
                            h += '<div style="color:#fff;background:' + a[1] + ';border-radius:3px;padding:0 4px;font-size:10px;margin-top:2px">' + a[0] + ' (validé)</div>';
                        }
                        m.tdAttr = 'data-qtip="Cliquer pour saisir"';
                        return h;
                    };
                }(i))});
        }
        colonnes.push({text: 'Heures prévues', dataIndex: 'minutes', width: 130, align: 'right', renderer: function (v) {
                return '<b>' + me.heures(v) + '</b>';
            }});
        var store = Ext.create('Ext.data.Store', {
            fields: ['employeId', 'matricule', 'employe', 'poste', 'minutes', 'j0', 'j1', 'j2', 'j3', 'j4', 'j5', 'j6', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6'],
            data: []
        });
        return {
            xtype: 'grid', itemId: 'ongletPlanning', title: 'Planning de la semaine', store: store, columns: colonnes,
            viewConfig: {emptyText: 'Aucun employé actif : créez les employés dans l\'onglet « Employés ».', deferEmptyText: false, stripeRows: true},
            tbar: [
                {text: '◀', itemId: 'semainePrec', tooltip: 'Semaine précédente', handler: function () {
                        me.lundi = Ext.Date.add(me.lundi, Ext.Date.DAY, -7);
                        me.chargerPlanning();
                    }},
                {xtype: 'datefield', itemId: 'semaine', width: 130, format: 'd/m/Y', editable: false, listeners: {select: function (f, d) {
                            me.lundi = me.lundiDe(d);
                            me.chargerPlanning();
                        }}},
                {text: '▶', itemId: 'semaineSuiv', tooltip: 'Semaine suivante', handler: function () {
                        me.lundi = Ext.Date.add(me.lundi, Ext.Date.DAY, 7);
                        me.chargerPlanning();
                    }},
                {xtype: 'tbtext', itemId: 'titreSemaine', text: ''},
                '->',
                {text: 'Copier la semaine précédente', itemId: 'btnCopier', handler: function () {
                        me.copierSemaine();
                    }}
            ],
            listeners: {
                cellclick: function (v, td, col, rec) {
                    var c = v.getGridColumns()[col];
                    if (c && /^j\d$/.test(c.dataIndex)) {
                        me.editerCase(rec, Number(c.dataIndex.substring(1)));
                    }
                }
            }
        };
    },

    chargerPlanning: function () {
        var me = this, g = me.down('#ongletPlanning');
        me.appel('GET', '../api/v1/rh/planning?semaine=' + me.iso(me.lundi), null, function (r) {
            me.joursSemaine = r.jours;
            Ext.each(r.jours, function (j, i) {
                var c = g.down('#col' + i);
                if (c) {
                    c.setText(me.JOURS[i] + ' ' + me.fr(j).substring(0, 5));
                }
            });
            g.down('#semaine').setValue(me.lundi);
            g.down('#titreSemaine').setText('Semaine du ' + me.fr(r.jours[0]) + ' au ' + me.fr(r.jours[6]));
            g.getStore().loadData(r.data);
        });
    },

    editerCase: function (rec, i) {
        var me = this, v = rec.get('j' + i) || {}, jour = me.joursSemaine[i];
        var win = Ext.create('Ext.window.Window', {
            title: me.esc(rec.get('employe')) + ' — ' + me.JOURS[i] + ' ' + me.fr(jour), modal: true, width: 380, bodyPadding: 12, cls: 'rh-fenetre',
            itemId: 'fenetreCase',
            items: [{xtype: 'form', border: false, defaults: {anchor: '100%', labelWidth: 110}, items: [
                        {xtype: 'combobox', name: 'type', fieldLabel: 'Type', editable: false, queryMode: 'local', displayField: 'l', valueField: 'v',
                            value: v.type || 'TRAVAIL', store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: [
                                    {v: 'TRAVAIL', l: 'Travail'}, {v: 'GARDE', l: 'Garde'}, {v: 'REPOS', l: 'Repos'}]}),
                            listeners: {change: function (c, t) {
                                    Ext.each(['debut', 'fin', 'pause'], function (n) {
                                        c.up('form').down('[name=' + n + ']').setDisabled(t === 'REPOS');
                                    });
                                }}},
                        {xtype: 'textfield', name: 'debut', fieldLabel: 'Début', emptyText: '08:00', value: v.debut || '', disabled: v.type === 'REPOS'},
                        {xtype: 'textfield', name: 'fin', fieldLabel: 'Fin', emptyText: '17:00 (avant le début = le lendemain)', value: v.fin || '', disabled: v.type === 'REPOS'},
                        {xtype: 'numberfield', name: 'pause', fieldLabel: 'Pause (minutes)', minValue: 0, value: v.pause || 0, disabled: v.type === 'REPOS'},
                        {xtype: 'textfield', name: 'commentaire', fieldLabel: 'Commentaire', value: v.commentaire || ''},
                        {xtype: 'checkbox', name: 'semaine', boxLabel: 'Appliquer du lundi au vendredi', hideLabel: true}
                    ]}],
            buttons: [
                {text: 'Vider la case', itemId: 'btnVider', cls: 'fen-btn', handler: function () {
                        me.appel('POST', '../api/v1/rh/planning', [{employeId: rec.get('employeId'), jour: jour, type: ''}], function () {
                            win.close();
                            me.chargerPlanning();
                        });
                    }},
                {text: 'Annuler', cls: 'fen-btn', handler: function () {
                        win.close();
                    }},
                {text: 'Enregistrer', itemId: 'btnEnregistrerCase', cls: 'fen-btn fen-btn-principal', handler: function () {
                        var f = win.down('form').getForm().getValues(false, false, false, true), cases = [];
                        var jours = f.semaine ? me.joursSemaine.slice(0, 5) : [jour];
                        Ext.each(jours, function (j) {
                            cases.push({employeId: rec.get('employeId'), jour: j, type: win.down('[name=type]').getValue(), debut: f.debut || '',
                                fin: f.fin || '', pause: Number(f.pause) || 0, commentaire: f.commentaire || ''});
                        });
                        me.appel('POST', '../api/v1/rh/planning', cases, function () {
                            win.close();
                            me.chargerPlanning();
                        });
                    }}
            ]
        });
        win.show();
    },

    copierSemaine: function () {
        var me = this, prec = Ext.Date.add(me.lundi, Ext.Date.DAY, -7);
        Ext.MessageBox.show({
            title: 'Copier la semaine précédente', icon: Ext.MessageBox.QUESTION,
            msg: 'Copier le planning de la semaine du ' + Ext.Date.format(prec, 'd/m/Y') + ' sur cette semaine ?<br>« Oui » garde les cases déjà saisies, « Non » les remplace.',
            buttons: Ext.MessageBox.YESNOCANCEL, buttonText: {yes: 'Garder les cases saisies', no: 'Tout remplacer', cancel: 'Annuler'},
            fn: function (b) {
                if (b === 'cancel') {
                    return;
                }
                me.appel('POST', '../api/v1/rh/planning/copier?source=' + me.iso(prec) + '&cible=' + me.iso(me.lundi) + '&remplacer=' + (b === 'no'), null, function (r) {
                    me.infoPlanning = r.message;
                    me.chargerPlanning();
                    Ext.MessageBox.alert('Planning', me.esc(r.message));
                });
            }
        });
    },

    /* ------------------------------------------------------------------ conges et absences */

    ongletAbsences: function () {
        var me = this;
        var liste = Ext.create('Ext.data.Store', {
            fields: ['id', 'employeId', 'employe', 'type', 'debut', 'fin', 'demiJournee', 'motif', 'statut', 'demandeLe', 'demandePar', 'decidePar', 'jours'],
            data: []
        });
        return {
            xtype: 'panel', itemId: 'ongletAbsences', title: 'Congés et absences', layout: {type: 'vbox', align: 'stretch'},
            tbar: [
                {text: '◀', itemId: 'moisPrec', handler: function () {
                        me.mois = Ext.Date.add(me.mois, Ext.Date.MONTH, -1);
                        me.chargerAbsences();
                    }},
                {xtype: 'tbtext', itemId: 'titreMois', text: '', width: 130, style: 'text-align:center;font-weight:700'},
                {text: '▶', itemId: 'moisSuiv', handler: function () {
                        me.mois = Ext.Date.add(me.mois, Ext.Date.MONTH, 1);
                        me.chargerAbsences();
                    }},
                {xtype: 'combobox', itemId: 'filtreStatut', width: 170, editable: false, queryMode: 'local', displayField: 'l', valueField: 'v', value: '',
                    store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: [{v: '', l: 'Tous les statuts'}, {v: 'DEMANDE', l: 'À valider'},
                            {v: 'VALIDE', l: 'Validées'}, {v: 'REFUSE', l: 'Refusées'}]}),
                    listeners: {select: function () {
                            me.chargerAbsences();
                        }}},
                '->',
                {text: 'Nouvelle demande', itemId: 'btnNouvelleAbsence', handler: function () {
                        me.editerAbsence(null);
                    }}
            ],
            items: [
                {xtype: 'component', itemId: 'calendrier', autoScroll: true, flex: 1, style: 'background:#fff'},
                {xtype: 'grid', itemId: 'grilleAbsences', store: liste, flex: 1, title: 'Demandes et absences du mois',
                    viewConfig: {emptyText: 'Aucune absence sur le mois.', deferEmptyText: false},
                    columns: [
                        {text: 'Employé', dataIndex: 'employe', flex: 1},
                        {text: 'Type', dataIndex: 'type', width: 90, renderer: function (v) {
                                var t = me.TYPES_ABSENCE[v] || [v, '#555'];
                                return '<b style="color:' + t[1] + '">' + t[0] + '</b>';
                            }},
                        {text: 'Du', dataIndex: 'debut', width: 90, renderer: function (v, m, r) {
                                return me.fr(v) + (r.get('demiJournee') ? ' (' + (r.get('demiJournee') === 'MATIN' ? 'matin' : 'après-midi') + ')' : '');
                            }},
                        {text: 'Au', dataIndex: 'fin', width: 90, renderer: function (v) {
                                return me.fr(v);
                            }},
                        {text: 'Jours', dataIndex: 'jours', width: 55, align: 'right', renderer: function (v) {
                                return String(v).replace('.', ',');
                            }},
                        {text: 'Motif', dataIndex: 'motif', flex: 1, renderer: function (v) {
                                return me.esc(v);
                            }},
                        {text: 'Statut', dataIndex: 'statut', width: 100, renderer: function (v, m, r) {
                                var s = me.STATUTS[v] || [v, '#555'];
                                if (r.get('decidePar')) {
                                    m.tdAttr = 'data-qtip="par ' + me.esc(r.get('decidePar')) + '"';
                                }
                                return '<b style="color:' + s[1] + '">' + s[0] + '</b>';
                            }},
                        {xtype: 'actioncolumn', width: 96, items: [
                                {iconCls: 'icon-ok rh-valider', tooltip: 'Valider', getClass: function (v, m, r) {
                                        return me.peutValider && r.get('statut') === 'DEMANDE' ? 'rh-act rh-act-valider' : 'x-hidden';
                                    }, handler: function (g, i) {
                                        me.decider(g.getStore().getAt(i), 'VALIDE');
                                    }},
                                {tooltip: 'Refuser', getClass: function (v, m, r) {
                                        return me.peutValider && r.get('statut') === 'DEMANDE' ? 'rh-act rh-act-refuser' : 'x-hidden';
                                    }, handler: function (g, i) {
                                        me.decider(g.getStore().getAt(i), 'REFUSE');
                                    }},
                                {tooltip: 'Modifier', getClass: function (v, m, r) {
                                        return r.get('statut') === 'DEMANDE' ? 'rh-act rh-act-modifier' : 'x-hidden';
                                    }, handler: function (g, i) {
                                        me.editerAbsence(g.getStore().getAt(i));
                                    }},
                                {tooltip: 'Supprimer', getClass: function (v, m, r) {
                                        return r.get('statut') === 'DEMANDE' || me.peutValider ? 'rh-act rh-act-supprimer' : 'x-hidden';
                                    }, handler: function (g, i) {
                                        me.supprimerAbsence(g.getStore().getAt(i));
                                    }}
                            ]}
                    ]}
            ]
        };
    },

    chargerAbsences: function () {
        var me = this, p = me.down('#ongletAbsences'), du = me.mois, au = Ext.Date.getLastDateOfMonth(me.mois);
        p.down('#titreMois').setText(Ext.Date.format(me.mois, 'F Y'));
        var statut = p.down('#filtreStatut').getValue() || '';
        me.appel('GET', '../api/v1/rh/employes', null, function (e) {
            me.employes = e.data;
            me.appel('GET', '../api/v1/rh/absences?du=' + me.iso(du) + '&au=' + me.iso(au) + '&statut=' + statut, null, function (r) {
                p.down('#grilleAbsences').getStore().loadData(r.data);
                me.dessinerCalendrier(e.data, r.data, du, au);
            });
        });
    },

    dessinerCalendrier: function (employes, absences, du, au) {
        var me = this, n = au.getDate(), h = '<table class="rh-cal"><tr><th class="rh-cal-nom">Employé</th>';
        for (var j = 1; j <= n; j++) {
            var d = new Date(du.getFullYear(), du.getMonth(), j), we = d.getDay() === 0 || d.getDay() === 6;
            h += '<th class="' + (we ? 'rh-we' : '') + '">' + me.JOURS[(d.getDay() + 6) % 7].charAt(0) + '<br>' + j + '</th>';
        }
        h += '</tr>';
        Ext.each(employes, function (e) {
            h += '<tr><td class="rh-cal-nom">' + me.esc(e.nom + ' ' + (e.prenoms || '')) + '</td>';
            for (var j = 1; j <= n; j++) {
                var iso = me.iso(new Date(du.getFullYear(), du.getMonth(), j)), c = '', titre = '';
                Ext.each(absences, function (a) {
                    if (a.employeId === e.id && a.debut <= iso && a.fin >= iso && a.statut !== 'REFUSE') {
                        var t = me.TYPES_ABSENCE[a.type] || [a.type, '#555'];
                        c = a.statut === 'VALIDE' ? 'background:' + t[1] : 'background:repeating-linear-gradient(45deg,' + t[1] + '55,' + t[1] + '55 3px,#fff 3px,#fff 6px)';
                        titre = t[0] + (a.statut === 'VALIDE' ? ' (validé)' : ' (demandé)');
                    }
                });
                h += '<td' + (c ? ' style="' + c + '" title="' + titre + '" data-abs="1"' : '') + '></td>';
            }
            h += '</tr>';
        });
        h += '</table><div class="rh-legende">' + Ext.Object.getKeys(me.TYPES_ABSENCE).map(function (k) {
            return '<span><i style="background:' + me.TYPES_ABSENCE[k][1] + '"></i>' + me.TYPES_ABSENCE[k][0] + '</span>';
        }).join('') + '<span><i style="background:repeating-linear-gradient(45deg,#99999955,#99999955 3px,#fff 3px,#fff 6px)"></i>Demandé (à valider)</span></div>';
        me.down('#calendrier').update(employes.length ? h : '<div style="padding:20px;color:#7f8c8d">Aucun employé actif.</div>');
    },

    editerAbsence: function (rec) {
        var me = this;
        var win = Ext.create('Ext.window.Window', {
            title: rec ? 'Modifier la demande' : 'Nouvelle demande de congé ou d\'absence', modal: true, width: 420, bodyPadding: 12, itemId: 'fenetreAbsence',
            items: [{xtype: 'form', border: false, defaults: {anchor: '100%', labelWidth: 110}, items: [
                        {xtype: 'combobox', name: 'employeId', fieldLabel: 'Employé', queryMode: 'local', displayField: 'l', valueField: 'id', forceSelection: true,
                            allowBlank: false, value: rec ? rec.get('employeId') : null,
                            store: Ext.create('Ext.data.Store', {fields: ['id', 'l'], data: Ext.Array.map(me.employes || [], function (e) {
                                    return {id: e.id, l: e.nom + ' ' + (e.prenoms || '') + ' (' + e.matricule + ')'};
                                })})},
                        {xtype: 'combobox', name: 'type', fieldLabel: 'Type', editable: false, queryMode: 'local', displayField: 'l', valueField: 'v',
                            value: rec ? rec.get('type') : 'CONGE', store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: Ext.Object.getKeys(me.TYPES_ABSENCE).map(function (k) {
                                    return {v: k, l: me.TYPES_ABSENCE[k][0]};
                                })})},
                        {xtype: 'datefield', name: 'debut', fieldLabel: 'Du', format: 'd/m/Y', allowBlank: false, value: rec ? Ext.Date.parse(rec.get('debut'), 'Y-m-d') : new Date()},
                        {xtype: 'datefield', name: 'fin', fieldLabel: 'Au', format: 'd/m/Y', allowBlank: false, value: rec ? Ext.Date.parse(rec.get('fin'), 'Y-m-d') : new Date()},
                        {xtype: 'combobox', name: 'demiJournee', fieldLabel: 'Demi-journée', editable: false, queryMode: 'local', displayField: 'l', valueField: 'v',
                            value: rec ? rec.get('demiJournee') : '', store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: [
                                    {v: '', l: 'Journée(s) entière(s)'}, {v: 'MATIN', l: 'Matin'}, {v: 'APRES_MIDI', l: 'Après-midi'}]})},
                        {xtype: 'textarea', name: 'motif', fieldLabel: 'Motif', height: 60, value: rec ? rec.get('motif') : ''}
                    ]}],
            buttons: [{text: 'Annuler', cls: 'fen-btn', handler: function () {
                        win.close();
                    }}, {text: 'Enregistrer', itemId: 'btnEnregistrerAbsence', cls: 'fen-btn fen-btn-principal', handler: function () {
                        var f = win.down('form');
                        if (!f.isValid()) {
                            return;
                        }
                        var v = function (n) {
                            return f.down('[name=' + n + ']').getValue();
                        };
                        me.appel('POST', '../api/v1/rh/absences', {id: rec ? rec.get('id') : null, employeId: v('employeId'), type: v('type'),
                            debut: me.iso(v('debut')), fin: me.iso(v('fin')), demiJournee: v('demiJournee') || '', motif: v('motif') || ''}, function () {
                            win.close();
                            me.chargerAbsences();
                        });
                    }}]
        });
        win.show();
    },

    decider: function (rec, statut) {
        var me = this;
        me.appel('POST', '../api/v1/rh/absences/' + rec.get('id') + '/decision?statut=' + statut, null, function () {
            me.chargerAbsences();
        });
    },

    supprimerAbsence: function (rec) {
        var me = this;
        Ext.MessageBox.confirm('Supprimer', 'Supprimer cette absence de ' + me.esc(rec.get('employe')) + ' ?', function (b) {
            if (b === 'yes') {
                me.appel('DELETE', '../api/v1/rh/absences/' + rec.get('id'), null, function () {
                    me.chargerAbsences();
                });
            }
        });
    },

    /* ------------------------------------------------------------------ employes */

    ongletEmployes: function () {
        var me = this;
        var store = Ext.create('Ext.data.Store', {
            fields: ['id', 'matricule', 'badge', 'nom', 'prenoms', 'poste', 'telephone', 'dtEntree', 'dtSortie', 'statut', 'userId', 'login'],
            proxy: {type: 'ajax', url: '../api/v1/rh/employes', reader: {type: 'json', root: 'data', totalProperty: 'total'}}
        });
        store.on('beforeload', function (s) {
            var g = me.down('#ongletEmployes');
            s.getProxy().extraParams = {query: g.down('#rechercheEmploye').getValue() || '', inactifs: !!g.down('#inactifs').getValue()};
        });
        return {
            xtype: 'grid', itemId: 'ongletEmployes', title: 'Employés', store: store,
            viewConfig: {emptyText: 'Aucun employé.', deferEmptyText: false},
            tbar: [
                {xtype: 'textfield', itemId: 'rechercheEmploye', emptyText: 'Matricule, nom, badge…', width: 220, listeners: {specialkey: function (f, e) {
                            if (e.getKey() === e.ENTER) {
                                store.load();
                            }
                        }}},
                {xtype: 'checkbox', itemId: 'inactifs', boxLabel: 'Afficher les inactifs', listeners: {change: function () {
                            store.load();
                        }}},
                {text: 'Rechercher', handler: function () {
                        store.load();
                    }},
                '->',
                {text: 'Nouvel employé', itemId: 'btnNouvelEmploye', handler: function () {
                        me.editerEmploye(null);
                    }}
            ],
            columns: [
                {text: 'Matricule', dataIndex: 'matricule', width: 100},
                {text: 'Nom', dataIndex: 'nom', flex: 1, renderer: function (v, m, r) {
                        return '<b>' + me.esc(v) + '</b> ' + me.esc(r.get('prenoms'));
                    }},
                {text: 'Poste', dataIndex: 'poste', width: 140},
                {text: 'Badge', dataIndex: 'badge', width: 100},
                {text: 'Téléphone', dataIndex: 'telephone', width: 110},
                {text: 'Entrée', dataIndex: 'dtEntree', width: 90, renderer: function (v) {
                        return me.fr(v);
                    }},
                {text: 'Sortie', dataIndex: 'dtSortie', width: 90, renderer: function (v) {
                        return me.fr(v);
                    }},
                {text: 'Utilisateur', dataIndex: 'login', width: 120, renderer: function (v) {
                        return v ? me.esc(v) : '<span style="color:#b0bec5">—</span>';
                    }},
                {text: 'Statut', dataIndex: 'statut', width: 80, renderer: function (v) {
                        return v === 'ACTIF' ? '<b style="color:#1e8449">Actif</b>' : '<span style="color:#7f8c8d">Inactif</span>';
                    }}
            ],
            listeners: {itemdblclick: function (v, r) {
                    me.editerEmploye(r);
                }}
        };
    },

    editerEmploye: function (rec) {
        var me = this, d = rec ? rec.data : {};
        var utilisateurs = Ext.create('Ext.data.Store', {fields: ['id', 'libelle'], proxy: {type: 'ajax',
                url: '../api/v1/rh/utilisateurs-libres?employeId=' + (d.id || ''), reader: {type: 'json', root: 'data'}}, autoLoad: true});
        var date = function (s) {
            return s ? Ext.Date.parse(s, 'Y-m-d') : null;
        };
        var win = Ext.create('Ext.window.Window', {
            title: rec ? 'Employé ' + me.esc(d.nom) : 'Nouvel employé', modal: true, width: 460, bodyPadding: 12, itemId: 'fenetreEmploye',
            items: [{xtype: 'form', border: false, defaults: {anchor: '100%', labelWidth: 120, xtype: 'textfield'}, items: [
                        {name: 'matricule', fieldLabel: 'Matricule', allowBlank: false, value: d.matricule},
                        {name: 'nom', fieldLabel: 'Nom', allowBlank: false, value: d.nom},
                        {name: 'prenoms', fieldLabel: 'Prénoms', value: d.prenoms},
                        {name: 'poste', fieldLabel: 'Poste', value: d.poste},
                        {name: 'badge', fieldLabel: 'Badge (pointeuse)', value: d.badge},
                        {name: 'telephone', fieldLabel: 'Téléphone', value: d.telephone},
                        {xtype: 'datefield', name: 'dtEntree', fieldLabel: 'Entrée', format: 'd/m/Y', value: date(d.dtEntree)},
                        {xtype: 'datefield', name: 'dtSortie', fieldLabel: 'Sortie', format: 'd/m/Y', value: date(d.dtSortie)},
                        {xtype: 'combobox', name: 'userId', fieldLabel: 'Utilisateur lié', store: utilisateurs, queryMode: 'local', displayField: 'libelle',
                            valueField: 'id', value: d.userId || null, emptyText: 'aucun (n\'utilise pas le logiciel)', forceSelection: true, anyMatch: true},
                        {xtype: 'combobox', name: 'statut', fieldLabel: 'Statut', editable: false, queryMode: 'local', displayField: 'l', valueField: 'v',
                            value: d.statut || 'ACTIF', store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: [{v: 'ACTIF', l: 'Actif'}, {v: 'INACTIF', l: 'Inactif'}]})}
                    ]}],
            buttons: [{text: 'Annuler', cls: 'fen-btn', handler: function () {
                        win.close();
                    }}, {text: 'Enregistrer', itemId: 'btnEnregistrerEmploye', cls: 'fen-btn fen-btn-principal', handler: function () {
                        var f = win.down('form');
                        if (!f.isValid()) {
                            return;
                        }
                        var v = function (n) {
                            return f.down('[name=' + n + ']').getValue();
                        };
                        me.appel('POST', '../api/v1/rh/employes', {id: d.id || null, matricule: v('matricule'), nom: v('nom'), prenoms: v('prenoms'),
                            poste: v('poste'), badge: v('badge'), telephone: v('telephone'), dtEntree: v('dtEntree') ? me.iso(v('dtEntree')) : '',
                            dtSortie: v('dtSortie') ? me.iso(v('dtSortie')) : '', userId: v('userId') || '', statut: v('statut')}, function () {
                            win.close();
                            me.down('#ongletEmployes').getStore().load();
                        });
                    }}]
        });
        win.show();
    },

    /* ------------------------------------------------------------------ connexions */

    ongletConnexions: function () {
        var me = this;
        var store = Ext.create('Ext.data.Store', {
            fields: ['debut', 'fin', 'finPar', 'poste', 'ip', 'login', 'utilisateur', 'minutes', 'ouverte'],
            proxy: {type: 'ajax', url: '../api/v1/rh/sessions', reader: {type: 'json', root: 'data', totalProperty: 'total'}}
        });
        store.on('beforeload', function (s) {
            var g = me.down('#ongletConnexions');
            s.getProxy().extraParams = {du: me.iso(g.down('#sesDu').getValue()), au: me.iso(g.down('#sesAu').getValue())};
        });
        var h = function (v) {
            return v ? me.fr(v.substring(0, 10)) + ' ' + v.substring(11, 16) : '';
        };
        return {
            xtype: 'grid', itemId: 'ongletConnexions', title: 'Connexions', store: store,
            viewConfig: {emptyText: 'Aucune connexion sur la période.', deferEmptyText: false},
            tbar: [
                {xtype: 'datefield', itemId: 'sesDu', fieldLabel: 'Du', labelWidth: 25, width: 145, format: 'd/m/Y', value: Ext.Date.add(new Date(), Ext.Date.DAY, -6)},
                {xtype: 'datefield', itemId: 'sesAu', fieldLabel: 'Au', labelWidth: 25, width: 145, format: 'd/m/Y', value: new Date()},
                {text: 'Rechercher', handler: function () {
                        store.load();
                    }}
            ],
            columns: [
                {text: 'Utilisateur', dataIndex: 'utilisateur', flex: 1, renderer: function (v, m, r) {
                        return '<b>' + me.esc(v) + '</b> <span style="color:#7f8c8d">' + me.esc(r.get('login')) + '</span>';
                    }},
                {text: 'Connexion', dataIndex: 'debut', width: 130, renderer: h},
                {text: 'Déconnexion', dataIndex: 'fin', width: 130, renderer: function (v, m, r) {
                        return r.get('ouverte') ? '<b style="color:#1e8449">en cours</b>' : h(v);
                    }},
                {text: 'Durée', dataIndex: 'minutes', width: 80, align: 'right', renderer: function (v) {
                        return me.heures(v);
                    }},
                {text: 'Fin par', dataIndex: 'finPar', width: 140, renderer: function (v) {
                        return {DECONNEXION: 'déconnexion', NOUVELLE_CONNEXION: 'nouvelle connexion'}[v] || v || '';
                    }},
                {text: 'Poste', dataIndex: 'poste', width: 140},
                {text: 'Adresse', dataIndex: 'ip', width: 120}
            ]
        };
    },
    /* ------------------------------------------------------------------ presence (L11b) */

    ANOMALIES: {DOUBLON: 'doublon', DEUX_ENTREES: 'deux entrées', SORTIE_SANS_ENTREE: 'sortie sans entrée', ENTREE_SANS_SORTIE: 'entrée sans sortie',
        JOURNEE_LONGUE: 'journée anormalement longue', POINTAGE_EN_CONGE: 'pointage pendant une absence', ABSENT: 'absent (non justifié)',
        HORS_PLANNING: 'hors planning'},

    anomaliesTexte: function (v) {
        var me = this;
        return (v || '').split(',').filter(function (a) {
            return a;
        }).map(function (a) {
            return '<span class="rh-anomalie' + (a === 'ABSENT' ? ' rh-anomalie-forte' : '') + '">' + (me.ANOMALIES[a] || a) + '</span>';
        }).join(' ');
    },

    ongletPresence: function () {
        var me = this;
        var store = Ext.create('Ext.data.Store', {
            fields: ['employeId', 'employe', 'matricule', 'jour', 'prevu', 'entree', 'sortie', 'minutesPrevues', 'minutesPresence', 'retard',
                'departAnticipe', 'heuresSup', 'absence', 'anomalies', 'pointages'], data: []
        });
        var min = function (v) {
            return v ? me.heures(v) : '';
        };
        return {
            xtype: 'grid', itemId: 'ongletPresence', title: 'Présence du jour', store: store,
            viewConfig: {emptyText: 'Rien de prévu ni de pointé ce jour-là.', deferEmptyText: false},
            tbar: [
                {text: '◀', itemId: 'jourPrec', handler: function () {
                        var f = me.down('#jourPresence');
                        f.setValue(Ext.Date.add(f.getValue(), Ext.Date.DAY, -1));
                        me.chargerPresence();
                    }},
                {xtype: 'datefield', itemId: 'jourPresence', width: 130, format: 'd/m/Y', value: new Date(), editable: false, listeners: {select: function () {
                            me.chargerPresence();
                        }}},
                {text: '▶', itemId: 'jourSuiv', handler: function () {
                        var f = me.down('#jourPresence');
                        f.setValue(Ext.Date.add(f.getValue(), Ext.Date.DAY, 1));
                        me.chargerPresence();
                    }},
                '->',
                {text: 'Pointage manuel', itemId: 'btnPointageManuel', handler: function () {
                        me.pointageManuel();
                    }}
            ],
            columns: [
                {text: 'Employé', dataIndex: 'employe', flex: 1, renderer: function (v, m, r) {
                        return '<b>' + me.esc(v) + '</b> <span style="color:#7f8c8d">' + me.esc(r.get('matricule')) + '</span>';
                    }},
                {text: 'Prévu', dataIndex: 'prevu', width: 120},
                {text: 'Pointages', dataIndex: 'pointages', width: 190, renderer: function (v) {
                        return me.esc(v);
                    }},
                {text: 'Entrée', dataIndex: 'entree', width: 60},
                {text: 'Sortie', dataIndex: 'sortie', width: 60},
                {text: 'Présence', dataIndex: 'minutesPresence', width: 80, align: 'right', renderer: min},
                {text: 'Retard', dataIndex: 'retard', width: 70, align: 'right', renderer: function (v) {
                        return v ? '<b style="color:#c0392b">' + v + ' min</b>' : '';
                    }},
                {text: 'Départ anticipé', dataIndex: 'departAnticipe', width: 95, align: 'right', renderer: function (v) {
                        return v ? '<span style="color:#c0392b">' + v + ' min</span>' : '';
                    }},
                {text: 'Heures sup.', dataIndex: 'heuresSup', width: 80, align: 'right', renderer: function (v) {
                        return v ? '<b style="color:#1e8449">' + me.heures(v) + '</b>' : '';
                    }},
                {text: 'Absence', dataIndex: 'absence', width: 110},
                {text: 'Anomalies', dataIndex: 'anomalies', flex: 1, renderer: function (v) {
                        return me.anomaliesTexte(v);
                    }}
            ]
        };
    },

    chargerPresence: function () {
        var me = this, g = me.down('#ongletPresence');
        me.appel('GET', '../api/v1/rh/presence?jour=' + me.iso(g.down('#jourPresence').getValue()), null, function (r) {
            g.getStore().loadData(r.data);
            me.pointagesJour = r.pointages;
        });
    },

    pointageManuel: function () {
        var me = this, jour = me.down('#jourPresence') ? me.down('#jourPresence').getValue() : new Date();
        var ouvrir = function () {
            var win = Ext.create('Ext.window.Window', {
                title: 'Pointage manuel', modal: true, width: 400, bodyPadding: 12, itemId: 'fenetrePointage',
                items: [{xtype: 'form', border: false, defaults: {anchor: '100%', labelWidth: 90}, items: [
                            {xtype: 'combobox', name: 'employeId', fieldLabel: 'Employé', queryMode: 'local', displayField: 'l', valueField: 'id', forceSelection: true,
                                allowBlank: false, store: Ext.create('Ext.data.Store', {fields: ['id', 'l'], data: Ext.Array.map(me.employes || [], function (e) {
                                        return {id: e.id, l: e.nom + ' ' + (e.prenoms || '') + ' (' + e.matricule + ')'};
                                    })})},
                            {xtype: 'datefield', name: 'jour', fieldLabel: 'Date', format: 'd/m/Y', value: jour, allowBlank: false, maxValue: new Date()},
                            {xtype: 'textfield', name: 'heure', fieldLabel: 'Heure', emptyText: '08:00', allowBlank: false},
                            {xtype: 'combobox', name: 'sens', fieldLabel: 'Sens', editable: false, queryMode: 'local', displayField: 'l', valueField: 'v', value: 'ENTREE',
                                store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: [{v: 'ENTREE', l: 'Entrée'}, {v: 'SORTIE', l: 'Sortie'}]})},
                            {xtype: 'textarea', name: 'motif', fieldLabel: 'Motif', allowBlank: false, height: 60, emptyText: 'obligatoire (oubli de badge, panne…)'}
                        ]}],
                buttons: [{text: 'Annuler', cls: 'fen-btn', handler: function () {
                            win.close();
                        }}, {text: 'Enregistrer', itemId: 'btnEnregistrerPointage', cls: 'fen-btn fen-btn-principal', handler: function () {
                            var f = win.down('form');
                            if (!f.isValid()) {
                                return;
                            }
                            var v = function (n) {
                                return f.down('[name=' + n + ']').getValue();
                            };
                            me.appel('POST', '../api/v1/rh/pointages', {employeId: v('employeId'), jour: me.iso(v('jour')), heure: v('heure'), sens: v('sens'),
                                motif: v('motif')}, function () {
                                win.close();
                                me.chargerPresence();
                            });
                        }}]
            });
            win.show();
        };
        if (me.employes) {
            ouvrir();
        } else {
            me.appel('GET', '../api/v1/rh/employes', null, function (e) {
                me.employes = e.data;
                ouvrir();
            });
        }
    },

    /* ------------------------------------------------------------------ pointages (import, L11b) */

    ongletPointages: function () {
        var me = this;
        var modeles = Ext.create('Ext.data.Store', {fields: ['id', 'marque', 'colBadge', 'colDate', 'colHeure', 'colSens', 'formatDate', 'formatHeure', 'entete',
                'valeursEntree', 'valeursSortie'], data: []});
        var lots = Ext.create('Ext.data.Store', {fields: ['date', 'fichier', 'marque', 'lues', 'retenues', 'rejetees', 'dejaConnues', 'rapport', 'par'],
            proxy: {type: 'ajax', url: '../api/v1/rh/pointages/lots', reader: {type: 'json', root: 'data'}}});
        var rapport = Ext.create('Ext.data.Store', {fields: ['ligne', 'badge', 'employe', 'horodatage', 'sens', 'statut', 'motif'], data: []});
        var couleur = {RETENUE: '#1e8449', REJETEE: '#c0392b', CONNUE: '#7f8c8d', DOUBLON: '#b9770e'};
        return {
            xtype: 'panel', itemId: 'ongletPointages', title: 'Pointages', layout: {type: 'vbox', align: 'stretch'}, bodyPadding: 8,
            items: [
                {xtype: 'form', itemId: 'formImport', border: false, layout: 'hbox', defaults: {margin: '0 8 0 0'}, items: [
                        {xtype: 'combobox', itemId: 'modeleImport', fieldLabel: 'Pointeuse', labelWidth: 70, width: 330, store: modeles, queryMode: 'local',
                            displayField: 'marque', valueField: 'id', editable: false},
                        {xtype: 'button', text: 'Modèle…', itemId: 'btnModele', handler: function () {
                                var m = me.down('#modeleImport'), r = m.getValue() ? modeles.getById(m.getValue()) : null;
                                me.editerModele(r);
                            }},
                        {xtype: 'button', text: 'Nouveau modèle', itemId: 'btnNouveauModele', handler: function () {
                                me.editerModele(null);
                            }},
                        {xtype: 'filefield', name: 'fichier', itemId: 'fichierImport', buttonText: 'Choisir le fichier…', width: 320, hideLabel: true},
                        {xtype: 'button', text: '1. Lire', itemId: 'btnLire', handler: function () {
                                me.lireFichier();
                            }},
                        {xtype: 'button', text: '2. Contrôler', itemId: 'btnControler', disabled: true, handler: function () {
                                me.etapeImport(false);
                            }},
                        {xtype: 'button', text: '3. Enregistrer', itemId: 'btnExecuter', disabled: true, cls: 'fen-btn-principal', handler: function () {
                                me.etapeImport(true);
                            }}
                    ]},
                {xtype: 'component', itemId: 'apercuImport', margin: '6 0', html: '<div style="color:#7f8c8d">Choisissez la pointeuse et le fichier exporté (CSV, TXT, XLS ou XLSX), puis « Lire ».</div>'},
                {xtype: 'grid', itemId: 'grilleRapport', store: rapport, flex: 1, title: 'Contrôle ligne à ligne',
                    viewConfig: {emptyText: 'Le contrôle s\'affiche ici avant tout enregistrement.', deferEmptyText: false},
                    columns: [
                        {text: 'Ligne', dataIndex: 'ligne', width: 55},
                        {text: 'Badge', dataIndex: 'badge', width: 90},
                        {text: 'Employé', dataIndex: 'employe', flex: 1},
                        {text: 'Date et heure', dataIndex: 'horodatage', width: 140},
                        {text: 'Sens', dataIndex: 'sens', width: 80},
                        {text: 'Statut', dataIndex: 'statut', width: 90, renderer: function (v) {
                                return '<b style="color:' + (couleur[v] || '#555') + '">' + ({RETENUE: 'retenue', REJETEE: 'rejetée', CONNUE: 'déjà connue', DOUBLON: 'répétée'}[v] || v) + '</b>';
                            }},
                        {text: 'Motif', dataIndex: 'motif', flex: 1}
                    ]},
                {xtype: 'grid', itemId: 'grilleLots', store: lots, height: 150, title: 'Historique des imports',
                    viewConfig: {emptyText: 'Aucun import.', deferEmptyText: false},
                    columns: [
                        {text: 'Date', dataIndex: 'date', width: 130},
                        {text: 'Fichier', dataIndex: 'fichier', flex: 1},
                        {text: 'Pointeuse', dataIndex: 'marque', width: 180},
                        {text: 'Lues', dataIndex: 'lues', width: 55, align: 'right'},
                        {text: 'Enregistrées', dataIndex: 'retenues', width: 85, align: 'right'},
                        {text: 'Rejetées', dataIndex: 'rejetees', width: 70, align: 'right'},
                        {text: 'Déjà connues', dataIndex: 'dejaConnues', width: 85, align: 'right'},
                        {text: 'Par', dataIndex: 'par', width: 140}
                    ]}
            ]
        };
    },

    chargerModeles: function () {
        var me = this;
        me.appel('GET', '../api/v1/rh/pointages/modeles', null, function (r) {
            var c = me.down('#modeleImport'), v = c.getValue();
            c.getStore().loadData(r.data);
            c.setValue(v && c.getStore().getById(v) ? v : (r.data[0] ? r.data[0].id : null));
        });
    },

    lireFichier: function () {
        var me = this, f = me.down('#formImport');
        if (!me.down('#fichierImport').getValue()) {
            Ext.MessageBox.alert('Pointages', 'Choisissez d\'abord le fichier exporté par la pointeuse.');
            return;
        }
        me.down('#btnControler').disable();
        me.down('#btnExecuter').disable();
        f.getForm().submit({
            url: '../api/v1/rh/pointages/import/analyse', waitMsg: 'Lecture du fichier…',
            success: function (form, action) {
                me.apresLecture(action.result);
            },
            failure: function (form, action) {
                var r = action.result || Ext.JSON.decode(action.response && action.response.responseText, true) || {};
                if (r.success) {
                    me.apresLecture(r);
                } else {
                    Ext.MessageBox.alert('Pointages', me.esc(r.message || r.msg || 'Lecture impossible.'));
                }
            }
        });
    },

    apresLecture: function (r) {
        var me = this;
        me.jetonImport = r.jeton;
        var h = '<div style="margin-bottom:4px"><b>' + me.esc(r.fichier) + '</b> : ' + r.lignes + ' ligne(s), ' + r.colonnes + ' colonne(s). Premières lignes :</div>'
                + '<table class="rh-apercu"><tr>';
        for (var c = 1; c <= r.colonnes; c++) {
            h += '<th>' + c + '</th>';
        }
        h += '</tr>' + (r.apercu || []).map(function (l) {
            var t = '<tr>';
            for (var c = 0; c < r.colonnes; c++) {
                t += '<td>' + me.esc(l[c] || '') + '</td>';
            }
            return t + '</tr>';
        }).join('') + '</table>';
        me.down('#apercuImport').update(h);
        me.down('#btnControler').enable();
    },

    etapeImport: function (ecrire) {
        var me = this, modele = me.down('#modeleImport').getValue();
        if (!me.jetonImport) {
            return;
        }
        var faire = function () {
            me.appel('POST', '../api/v1/rh/pointages/import/' + (ecrire ? 'executer' : 'controle') + '?jeton=' + encodeURIComponent(me.jetonImport)
                    + '&modeleId=' + encodeURIComponent(modele || ''), null, function (r) {
                        me.down('#grilleRapport').getStore().loadData(r.detail || []);
                        me.down('#grilleRapport').setTitle('Contrôle ligne à ligne — ' + me.esc(r.message));
                        if (ecrire) {
                            me.jetonImport = null;
                            me.down('#btnControler').disable();
                            me.down('#btnExecuter').disable();
                            me.down('#grilleLots').getStore().load();
                        } else {
                            me.down('#btnExecuter').setDisabled(!r.retenues);
                        }
                    });
        };
        if (ecrire) {
            Ext.MessageBox.confirm('Pointages', 'Enregistrer les pointages retenus ?', function (b) {
                if (b === 'yes') {
                    faire();
                }
            });
        } else {
            faire();
        }
    },

    editerModele: function (rec) {
        var me = this, d = rec ? rec.data : {colBadge: 1, colDate: 2, colHeure: 3, colSens: 4, formatDate: 'dd/MM/yyyy', formatHeure: 'HH:mm', entete: true,
            valeursEntree: 'ENTREE,IN,E,0', valeursSortie: 'SORTIE,OUT,S,1'};
        var win = Ext.create('Ext.window.Window', {
            title: rec ? 'Modèle de pointeuse : ' + me.esc(d.marque) : 'Nouveau modèle de pointeuse', modal: true, width: 480, bodyPadding: 12, itemId: 'fenetreModele',
            items: [{xtype: 'form', border: false, defaults: {anchor: '100%', labelWidth: 170}, items: [
                        {xtype: 'textfield', name: 'marque', fieldLabel: 'Marque / modèle', allowBlank: false, value: d.marque},
                        {xtype: 'numberfield', name: 'colBadge', fieldLabel: 'Colonne du badge', minValue: 1, value: d.colBadge},
                        {xtype: 'numberfield', name: 'colDate', fieldLabel: 'Colonne de la date', minValue: 1, value: d.colDate},
                        {xtype: 'numberfield', name: 'colHeure', fieldLabel: 'Colonne de l\'heure (0 = avec la date)', minValue: 0, value: d.colHeure},
                        {xtype: 'numberfield', name: 'colSens', fieldLabel: 'Colonne du sens (0 = aucune)', minValue: 0, value: d.colSens},
                        {xtype: 'textfield', name: 'formatDate', fieldLabel: 'Format de la date', value: d.formatDate, emptyText: 'dd/MM/yyyy ou yyyy-MM-dd HH:mm:ss'},
                        {xtype: 'textfield', name: 'formatHeure', fieldLabel: 'Format de l\'heure', value: d.formatHeure, emptyText: 'HH:mm ou HH:mm:ss'},
                        {xtype: 'checkbox', name: 'entete', fieldLabel: 'Première ligne', boxLabel: 'ligne de titres (ignorée)', checked: d.entete !== false},
                        {xtype: 'textfield', name: 'valeursEntree', fieldLabel: 'Valeurs « entrée »', value: d.valeursEntree},
                        {xtype: 'textfield', name: 'valeursSortie', fieldLabel: 'Valeurs « sortie »', value: d.valeursSortie}
                    ]}],
            buttons: [{text: 'Annuler', cls: 'fen-btn', handler: function () {
                        win.close();
                    }}, {text: 'Enregistrer', itemId: 'btnEnregistrerModele', cls: 'fen-btn fen-btn-principal', handler: function () {
                        var f = win.down('form'), v = function (n) {
                            return f.down('[name=' + n + ']').getValue();
                        };
                        if (!f.isValid()) {
                            return;
                        }
                        me.appel('POST', '../api/v1/rh/pointages/modeles', {id: rec ? d.id : null, marque: v('marque'), colBadge: v('colBadge'), colDate: v('colDate'),
                            colHeure: v('colHeure') || 0, colSens: v('colSens') || 0, formatDate: v('formatDate'), formatHeure: v('formatHeure'),
                            entete: !!v('entete'), valeursEntree: v('valeursEntree'), valeursSortie: v('valeursSortie')}, function (r) {
                            win.close();
                            me.chargerModeles();
                            me.down('#modeleImport').setValue(r.id);
                        });
                    }}]
        });
        win.show();
    },

    /* ------------------------------------------------------------------ tableau (L11b) */

    ongletTableau: function () {
        var me = this;
        var store = Ext.create('Ext.data.Store', {fields: ['employeId', 'employe', 'matricule', 'joursPrevus', 'joursPresents', 'joursAbsenceJustifiee',
                'absencesNonJustifiees', 'retards', 'minutesRetard', 'departsAnticipes', 'minutesPrevues', 'minutesPresence', 'heuresSup', 'anomalies'], data: []});
        var params = function () {
            var t = me.down('#ongletTableau');
            return 'du=' + me.iso(t.down('#tabDu').getValue()) + '&au=' + me.iso(t.down('#tabAu').getValue());
        };
        return {
            xtype: 'grid', itemId: 'ongletTableau', title: 'Tableau', store: store,
            viewConfig: {emptyText: 'Aucune donnée de présence sur la période.', deferEmptyText: false},
            tbar: [
                {xtype: 'datefield', itemId: 'tabDu', fieldLabel: 'Du', labelWidth: 25, width: 145, format: 'd/m/Y', value: Ext.Date.getFirstDateOfMonth(new Date())},
                {xtype: 'datefield', itemId: 'tabAu', fieldLabel: 'Au', labelWidth: 25, width: 145, format: 'd/m/Y', value: new Date()},
                {text: 'Rechercher', itemId: 'btnTableau', handler: function () {
                        me.chargerTableau();
                    }},
                '->',
                {text: 'Excel', itemId: 'btnTableauExcel', iconCls: 'export_excel_icon', handler: function () {
                        window.location = '../api/v1/rh/tableau/excel?' + params();
                    }},
                {text: 'Excel (détail par jour)', itemId: 'btnPresenceExcel', iconCls: 'export_excel_icon', handler: function () {
                        window.location = '../api/v1/rh/tableau/excel?detail=true&' + params();
                    }},
                {text: 'Imprimer', itemId: 'btnTableauPdf', iconCls: 'printable', handler: function () {
                        window.open('../api/v1/rh/tableau/pdf?' + params(), '_blank');
                    }}
            ],
            columns: [
                {text: 'Employé', dataIndex: 'employe', flex: 1, renderer: function (v, m, r) {
                        return '<b>' + me.esc(v) + '</b> <span style="color:#7f8c8d">' + me.esc(r.get('matricule')) + '</span>';
                    }},
                {text: 'Jours prévus', dataIndex: 'joursPrevus', width: 85, align: 'right'},
                {text: 'Jours présents', dataIndex: 'joursPresents', width: 95, align: 'right'},
                {text: 'Absences justifiées', dataIndex: 'joursAbsenceJustifiee', width: 120, align: 'right', renderer: function (v) {
                        return v ? String(v).replace('.', ',') + ' j' : '';
                    }},
                {text: 'Absences non justifiées', dataIndex: 'absencesNonJustifiees', width: 140, align: 'right', renderer: function (v) {
                        return v ? '<b style="color:#c0392b">' + v + '</b>' : '';
                    }},
                {text: 'Retards', dataIndex: 'retards', width: 65, align: 'right'},
                {text: 'Durée des retards', dataIndex: 'minutesRetard', width: 110, align: 'right', renderer: function (v) {
                        return v ? me.heures(v) : '';
                    }},
                {text: 'Départs anticipés', dataIndex: 'departsAnticipes', width: 110, align: 'right'},
                {text: 'Prévu', dataIndex: 'minutesPrevues', width: 80, align: 'right', renderer: function (v) {
                        return me.heures(v);
                    }},
                {text: 'Présence', dataIndex: 'minutesPresence', width: 80, align: 'right', renderer: function (v) {
                        return me.heures(v);
                    }},
                {text: 'Heures sup.', dataIndex: 'heuresSup', width: 85, align: 'right', renderer: function (v) {
                        return v ? '<b style="color:#1e8449">' + me.heures(v) + '</b>' : '';
                    }},
                {text: 'Anomalies', dataIndex: 'anomalies', width: 80, align: 'right'}
            ]
        };
    },

    chargerTableau: function () {
        var me = this, t = me.down('#ongletTableau');
        me.appel('GET', '../api/v1/rh/tableau?du=' + me.iso(t.down('#tabDu').getValue()) + '&au=' + me.iso(t.down('#tabAu').getValue()), null, function (r) {
            t.getStore().loadData(r.data);
        });
    }
});
