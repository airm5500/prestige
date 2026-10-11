/* global Ext */

/*
 * AVIS CLIENTS (retours du 11/10). Les clients donnent leur avis sur la page publique ouverte par le QR code de la
 * pharmacie ; cet ecran les lit et les exploite. Trois onglets, aucune fenetre :
 *  - Avis : liste filtree (periode, note, statut, « contient », mot cle, theme, employe, reponse attendue) et triee
 *    (date, note), impression PDF et export Excel ; a droite, l'avis choisi : statut, note interne, reponse au client
 *    par WhatsApp ou e-mail (droit P_AVIS_REPONDRE) ;
 *  - Analyse : synthese comparee a la periode precedente, alertes, points forts / a ameliorer, repartition, evolution,
 *    criteres, themes, mots cles, recapitulatif par employe cite ; chaque element ouvre les avis correspondants ;
 *  - Reglages et affiche (droit P_AVIS_REGLAGES) : adresse IP publique, port public, limite d'envois, nouveau QR code,
 *    affiche A4 / A5.
 * Tout texte venu d'un client est encode avant affichage.
 */
Ext.define('testextjs.view.avisclients.AvisClients', {
    extend: 'Ext.tab.Panel',
    xtype: 'avisclients',
    id: 'avisclientsID',
    title: 'Avis clients',
    frame: true,
    width: '98%',
    height: 680,
    cls: 'avisclients',

    STATUTS: {NOUVEAU: ['Nouveau', '#1f6fb2'], LU: ['Lu', '#7f8c8d'], TRAITE: ['Traité', '#1e8449']},
    CRITERES: {ACCUEIL: 'Accueil', ATTENTE: 'Temps d\'attente', CONSEIL: 'Conseils', DISPONIBILITE: 'Produits disponibles',
        PRIX: 'Prix', PROPRETE: 'Propreté'},
    THEMES: ['Attente', 'Accueil', 'Conseil', 'Disponibilité', 'Prix', 'Propreté', 'Paiement / caisse', 'Assurance', 'Ordonnance'],

    initComponent: function () {
        var me = this;
        me.styles();
        me.droits = {};
        me.items = [me.ongletAvis(), me.ongletAnalyse(), me.ongletReglages()];
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.appel('GET', '../api/v1/avis-clients/droits', null, function (r) {
                me.droits = r;
                me.down('#ongletReglages').tab.setVisible(!!r.reglages);
                me.majTitreAvis(r.nouveaux);
                me.down('#detail').update(me.htmlVide());
                me.chargerListe();
                me.chargerAnalyse(true);
                if (!r.publie && r.reglages) {
                    me.down('#bandeauPublication').show();
                }
            });
        });
        me.on('tabchange', function (p, t) {
            if (t.itemId === 'ongletAnalyse') {
                me.chargerAnalyse();
            } else if (t.itemId === 'ongletReglages') {
                me.chargerReglages();
            }
        });
    },

    esc: function (v) {
        return Ext.String.htmlEncode(v === null || v === undefined ? '' : String(v));
    },

    styles: function () {
        if (Ext.get('avis-clients-styles')) {
            return;
        }
        Ext.util.CSS.createStyleSheet([
            '.avisclients .av-etoiles{color:#f5b301;letter-spacing:0;font-size:13px;white-space:nowrap}',
            '.avisclients .av-etoiles .off{color:#d6dde3}',
            '.avisclients .av-puce{display:inline-block;padding:1px 7px;margin:1px 2px 1px 0;border-radius:9px;font-size:11px;line-height:16px}',
            '.avisclients .av-plus{background:#e7f3f0;color:#1d8a76}.avisclients .av-moins{background:#fdecea;color:#c0392b}',
            '.avisclients .av-badge{display:inline-block;padding:1px 8px;border-radius:9px;color:#fff;font-size:11px}',
            '.avisclients .av-texte{white-space:normal;line-height:16px;max-height:34px;overflow:hidden}',
            '.avisclients .av-employe{color:#c0392b;font-weight:600}',
            '.avisclients .av-detail{padding:12px 14px;font-size:13px;line-height:1.45}',
            '.avisclients .av-detail h3{margin:0 0 2px;font-size:15px}',
            '.avisclients .av-detail .av-gris{color:#6b7785;font-size:12px}',
            '.avisclients .av-detail .av-bloc{background:#f4f7f9;border-radius:8px;padding:8px 10px;margin:8px 0;white-space:pre-wrap;word-wrap:break-word}',
            '.avisclients .av-detail .av-reponse{background:#e7f3f0;border-left:3px solid #1d8a76}',
            '.avisclients .av-vide{color:#8a96a3;text-align:center;padding:60px 20px}',
            '.avisclients .an{padding:10px 14px;font-size:13px}',
            '.avisclients .an-tuiles{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px}',
            '.avisclients .an-tuile{flex:1 1 140px;border:1px solid #dfe5ea;border-radius:10px;padding:10px 12px;background:#fff}',
            '.avisclients .an-tuile b{display:block;font-size:22px;color:#0f5b4f}.avisclients .an-tuile.rouge b{color:#c0392b}',
            '.avisclients .an-tuile span{color:#6b7785;font-size:11.5px}',
            '.avisclients .an-delta{font-size:11.5px;margin-left:6px}.avisclients .an-delta.haut{color:#1e8449}.avisclients .an-delta.bas{color:#c0392b}',
            '.avisclients .an-grille{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
            '.avisclients .an-carte{border:1px solid #dfe5ea;border-radius:10px;padding:10px 12px;background:#fff;margin-bottom:12px}',
            '.avisclients .an-carte h4{margin:0 0 8px;font-size:13.5px;color:#0f5b4f}',
            '.avisclients .an-ligne{display:flex;align-items:center;gap:8px;margin:4px 0;cursor:default}',
            '.avisclients .an-ligne.lien,.avisclients .an-lien{cursor:pointer}.avisclients .an-ligne.lien:hover{background:#f4f7f9}',
            '.avisclients .an-lib{flex:0 0 150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
            '.avisclients .an-barre{flex:1;height:12px;background:#eef2f5;border-radius:6px;position:relative;overflow:hidden}',
            '.avisclients .an-barre i{position:absolute;top:0;bottom:0;border-radius:6px}',
            '.avisclients .an-val{flex:0 0 120px;text-align:right;color:#4a5562;font-size:12px}',
            '.avisclients .an-alerte{padding:6px 10px;border-radius:8px;margin:4px 0;cursor:pointer}',
            '.avisclients .an-alerte.haute{background:#fdecea;color:#a93226}.avisclients .an-alerte.moyenne{background:#fef5e7;color:#9a6700}',
            '.avisclients .an-mot{display:inline-block;margin:3px;padding:3px 10px;border-radius:12px;cursor:pointer;border:1px solid transparent}',
            '.avisclients .an-mot.positif{background:#e7f3f0;color:#1d8a76}.avisclients .an-mot.negatif{background:#fdecea;color:#c0392b}',
            '.avisclients .an-mot.neutre{background:#eef2f5;color:#4a5562}.avisclients .an-mot:hover{border-color:currentColor}',
            '.avisclients table.an-emp{width:100%;border-collapse:collapse;font-size:12.5px}',
            '.avisclients table.an-emp th{text-align:left;color:#6b7785;font-weight:600;border-bottom:1px solid #dfe5ea;padding:5px}',
            '.avisclients table.an-emp td{border-bottom:1px solid #eef2f5;padding:6px 5px;vertical-align:top}',
            '.avisclients .an-forts li{color:#1e8449}.avisclients .an-faibles li{color:#c0392b}',
            '.avisclients .an-aide{color:#6b7785;font-size:11.5px}',
            '.avisclients .rg-aide{font-size:12.5px;line-height:1.5;color:#34404c;padding:4px 0}',
            '.avisclients .rg-aide code{background:#eef2f5;padding:1px 5px;border-radius:4px}',
            '.avisclients .rg-lien{font-family:monospace;font-size:12px;word-break:break-all;background:#f4f7f9;border-radius:6px;padding:6px 8px}'
        ].join(''), 'avis-clients-styles');
    },

    appel: function (methode, url, corps, suite, echec) {
        var me = this;
        me.setLoading(true);
        Ext.Ajax.request({
            url: url, method: methode, headers: corps ? {'Content-Type': 'application/json'} : undefined, jsonData: corps || undefined,
            success: function (response) {
                me.setLoading(false);
                var r = Ext.JSON.decode(response.responseText, true) || {};
                if (r.success === false) {
                    if (echec) {
                        echec(r);
                    } else {
                        Ext.MessageBox.alert('Avis clients', me.esc(r.msg || r.message || 'Action refusée.'));
                    }
                    return;
                }
                suite(r);
            },
            failure: function () {
                me.setLoading(false);
                Ext.MessageBox.alert('Avis clients', 'Le serveur n\'a pas répondu.');
            }
        });
    },

    etoiles: function (n) {
        var s = '';
        for (var i = 1; i <= 5; i++) {
            s += i <= n ? '★' : '<span class="off">★</span>';
        }
        return '<span class="av-etoiles" title="' + n + ' / 5">' + s + '</span>';
    },

    puces: function (criteres) {
        var me = this, s = '';
        Ext.Object.each(criteres || {}, function (k, v) {
            s += '<span class="av-puce ' + (v === 'PLUS' ? 'av-plus">👍 ' : 'av-moins">👎 ') + me.esc(me.CRITERES[k] || k) + '</span>';
        });
        return s;
    },

    badge: function (statut) {
        var s = this.STATUTS[statut] || [statut, '#7f8c8d'];
        return '<span class="av-badge" style="background:' + s[1] + '">' + this.esc(s[0]) + '</span>';
    },

    majTitreAvis: function (n) {
        var t = this.down('#ongletAvis');
        if (t) {
            t.setTitle('Avis' + (n > 0 ? ' (' + n + ' nouveau' + (n > 1 ? 'x' : '') + ')' : ''));
        }
    },

    /* ------------------------------------------------------------------ onglet Avis */

    ongletAvis: function () {
        var me = this, aujourdhui = new Date();
        var store = Ext.create('Ext.data.Store', {
            fields: ['id', 'date', 'dateIso', 'note', 'criteres', 'texte', 'employe', 'anonyme', 'nom', 'telephone', 'email',
                'rappel', 'statut', 'reponse', 'canalReponse', 'statutReponse', 'dateReponse', 'reponseAttendue'],
            pageSize: 50,
            remoteSort: true,
            sorters: [{property: 'date', direction: 'DESC'}],
            proxy: {
                type: 'ajax', url: '../api/v1/avis-clients/liste',
                reader: {type: 'json', root: 'data', totalProperty: 'total'},
                simpleSortMode: true
            },
            listeners: {
                beforeload: function (st, op) {
                    var p = me.parametresFiltres(), s = st.sorters.first();
                    p.tri = s ? (s.property === 'note' ? 'NOTE_' : 'DATE_') + s.direction : 'DATE_DESC';
                    op.params = Ext.apply(op.params || {}, p);
                    delete op.params.sort;
                    delete op.params.dir;
                },
                load: function (st, recs, ok) {
                    if (!ok) {
                        return;
                    }
                    var g = me.down('#grilleAvis'), choisi = me.avisChoisi;
                    if (choisi) {
                        var i = st.findExact('id', choisi);
                        if (i >= 0) {
                            g.getSelectionModel().select(i, false, true);
                        }
                    }
                }
            }
        });
        var jour = function (itemId, label, valeur) {
            return {xtype: 'datefield', itemId: itemId, fieldLabel: label, labelWidth: 22, width: 125, format: 'd/m/Y',
                submitFormat: 'Y-m-d', value: valeur, listeners: {select: function () { me.rechercher(); }}};
        };
        var combo = function (itemId, label, labelWidth, width, donnees, valeur) {
            return {xtype: 'combobox', itemId: itemId, fieldLabel: label, labelWidth: labelWidth, width: width, editable: false,
                queryMode: 'local', displayField: 'l', valueField: 'v', value: valeur,
                store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: donnees}),
                listeners: {select: function () { me.rechercher(); }}};
        };
        return {
            title: 'Avis', itemId: 'ongletAvis', layout: 'border',
            dockedItems: [{
                xtype: 'toolbar', dock: 'top', itemId: 'bandeauPublication', hidden: true,
                style: 'background:#fef5e7', items: [{xtype: 'tbtext', text: 'La page d\'avis n\'est pas encore publiée : saisissez l\'adresse IP publique dans « Réglages et affiche », puis imprimez l\'affiche.'},
                    '->', {text: 'Ouvrir les réglages', handler: function () { me.setActiveTab(me.down('#ongletReglages')); }}]
            }, {
                xtype: 'toolbar', dock: 'top', items: [
                    jour('du', 'Du', Ext.Date.add(aujourdhui, Ext.Date.DAY, -29)), jour('au', 'Au', aujourdhui),
                    combo('note', 'Note', 32, 170, [{v: '', l: 'Toutes les notes'}, {v: 'NEGATIF', l: '1–2 ★ (mécontents)'},
                        {v: 'POSITIF', l: '4–5 ★ (satisfaits)'}, {v: '5', l: '5 ★'}, {v: '4', l: '4 ★'}, {v: '3', l: '3 ★'},
                        {v: '2', l: '2 ★'}, {v: '1', l: '1 ★'}], ''),
                    combo('statut', 'Statut', 38, 165, [{v: '', l: 'Tous'}, {v: 'NOUVEAU', l: 'Nouveaux'}, {v: 'LU', l: 'Lus'},
                        {v: 'TRAITE', l: 'Traités'}, {v: 'NON_TRAITE', l: 'Non traités'}], ''),
                    {xtype: 'textfield', itemId: 'contient', emptyText: 'Contient… (texte, employé, client)', width: 230,
                        enableKeyEvents: true, listeners: {
                            specialkey: function (f, e) {
                                if (e.getKey() === e.ENTER) {
                                    me.rechercher();
                                }
                            },
                            change: {buffer: 500, fn: function () { me.rechercher(); }}
                        }},
                    '->',
                    {text: 'Imprimer', itemId: 'imprimerAvis', iconCls: 'printable', icon: 'resources/images/icons/fam/printer.png',
                        tooltip: 'Liste filtrée en PDF', handler: function () { me.ouvrir('../api/v1/avis-clients/liste/pdf'); }},
                    {text: 'Excel', itemId: 'excelAvis', icon: 'resources/images/icons/fam/excel_csv.png',
                        tooltip: 'Liste filtrée dans un fichier Excel', handler: function () { me.ouvrir('../api/v1/avis-clients/liste/excel'); }}
                ]
            }, {
                xtype: 'toolbar', dock: 'top', items: [
                    {xtype: 'combobox', itemId: 'motCle', fieldLabel: 'Mot clé', labelWidth: 48, width: 220, queryMode: 'local',
                        displayField: 'mot', valueField: 'cle', anyMatch: true, typeAhead: false, autoSelect: false,
                        emptyText: 'tous', store: Ext.create('Ext.data.Store', {fields: ['cle', 'mot', 'nombre']}),
                        tpl: Ext.create('Ext.XTemplate', '<tpl for="."><div class="x-boundlist-item">{mot:htmlEncode} <span style="color:#8a96a3">({nombre})</span></div></tpl>'),
                        listeners: {
                            select: function () { me.rechercher(); },
                            specialkey: function (f, e) {
                                if (e.getKey() === e.ENTER) {
                                    me.rechercher();
                                }
                            }
                        }},
                    combo('theme', 'Thème', 40, 200, [{v: '', l: 'Tous les thèmes'}].concat(Ext.Array.map(me.THEMES, function (t) {
                        return {v: t, l: t};
                    })), ''),
                    {xtype: 'combobox', itemId: 'employe', fieldLabel: 'Employé', labelWidth: 52, width: 230, editable: false,
                        queryMode: 'local', displayField: 'l', valueField: 'v', value: '',
                        store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: [{v: '', l: 'Tous'}]}),
                        listeners: {select: function () { me.rechercher(); }}},
                    {xtype: 'checkbox', itemId: 'reponseAttendue', boxLabel: 'Réponse attendue', listeners: {change: function () { me.rechercher(); }}},
                    '->',
                    {text: 'Effacer les filtres', itemId: 'effacerFiltres', handler: function () { me.effacerFiltres(); }}
                ]
            }],
            items: [{
                xtype: 'gridpanel', itemId: 'grilleAvis', region: 'center', store: store, columnLines: true,
                emptyText: '<div class="av-vide">Aucun avis pour ces critères.</div>',
                viewConfig: {deferEmptyText: false, stripeRows: true, getRowClass: function (r) {
                        return r.get('statut') === 'NOUVEAU' ? 'av-nouveau' : '';
                    }},
                columns: [
                    {text: 'Date', dataIndex: 'date', width: 122, sortable: true, menuDisabled: true, renderer: function (v, m, r) {
                            return (r.get('statut') === 'NOUVEAU' ? '<b>' : '') + me.esc(v) + (r.get('statut') === 'NOUVEAU' ? '</b>' : '');
                        }},
                    {text: 'Note', dataIndex: 'note', width: 100, sortable: true, menuDisabled: true, renderer: function (v) {
                            return me.etoiles(v);
                        }},
                    {text: 'Ressenti', dataIndex: 'texte', flex: 1, sortable: false, menuDisabled: true, renderer: function (v, m, r) {
                            var c = me.puces(r.get('criteres'));
                            return (c ? '<div>' + c + '</div>' : '') + '<div class="av-texte">' + (me.esc(v) || '<span style="color:#9aa5b1">(pas de texte)</span>') + '</div>';
                        }},
                    {text: 'Employé cité', dataIndex: 'employe', width: 130, sortable: false, menuDisabled: true, renderer: function (v) {
                            return v ? '<span class="av-employe">' + me.esc(v) + '</span>' : '';
                        }},
                    {text: 'Client', dataIndex: 'nom', width: 135, sortable: false, menuDisabled: true, renderer: function (v, m, r) {
                            if (r.get('anonyme')) {
                                return '<span style="color:#8a96a3">Anonyme</span>';
                            }
                            return me.esc(v || r.get('telephone') || r.get('email')) + (r.get('rappel') ? ' <span title="Accepte d\'être recontacté">📞</span>' : '');
                        }},
                    {text: 'Statut', dataIndex: 'statut', width: 82, sortable: false, menuDisabled: true, renderer: function (v) {
                            return me.badge(v);
                        }},
                    {text: 'Réponse', dataIndex: 'reponse', width: 108, sortable: false, menuDisabled: true, renderer: function (v, m, r) {
                            if (r.get('reponse')) {
                                return '<span style="color:#1e8449">✓ ' + (r.get('canalReponse') === 'EMAIL' ? 'E-mail' : 'WhatsApp') + '</span>';
                            }
                            return r.get('reponseAttendue') ? '<span style="color:#b9770e">Attendue</span>' : '';
                        }}
                ],
                dockedItems: [{xtype: 'pagingtoolbar', store: store, dock: 'bottom', displayInfo: true, displayMsg: 'Avis {0} - {1} sur {2}',
                        emptyMsg: 'Aucun avis'}],
                listeners: {
                    selectionchange: function (sm, sel) {
                        if (sel.length) {
                            me.afficherAvis(sel[0].get('id'));
                        }
                    }
                }
            }, {
                xtype: 'panel', itemId: 'panneauDetail', region: 'east', width: 430, split: true, autoScroll: true,
                title: 'Avis choisi', bodyStyle: 'background:#fff',
                items: [{xtype: 'component', itemId: 'detail', html: ''}, me.formulaireTraitement()]
            }]
        };
    },

    htmlVide: function () {
        return '<div class="av-vide">Choisissez un avis dans la liste pour le lire, le traiter et répondre au client.</div>';
    },

    parametresFiltres: function () {
        var me = this, v = function (id) {
            var c = me.down('#' + id);
            return c ? (c.getValue() || '') : '';
        };
        var motCle = me.down('#motCle'), cle = motCle.getValue();
        if (cle && motCle.getStore().findExact('cle', cle) < 0) {
            cle = motCle.getRawValue();
        }
        return {
            du: Ext.Date.format(me.down('#du').getValue() || new Date(), 'Y-m-d'),
            au: Ext.Date.format(me.down('#au').getValue() || new Date(), 'Y-m-d'),
            note: v('note'), statut: v('statut'), contient: Ext.String.trim(me.down('#contient').getValue() || ''),
            motCle: Ext.String.trim(cle || ''), theme: v('theme'), employe: v('employe'),
            reponse: me.down('#reponseAttendue').getValue() ? 'ATTENDUE' : ''
        };
    },

    rechercher: function () {
        var st = this.down('#grilleAvis').getStore();
        st.currentPage = 1;
        st.load();
    },

    chargerListe: function () {
        this.down('#grilleAvis').getStore().loadPage(1);
    },

    effacerFiltres: function () {
        var me = this;
        me.filtrer({}, true);
    },

    /** Pose des filtres (depuis l'analyse ou « effacer ») et recharge la liste sur l'onglet Avis. */
    filtrer: function (f, toutEffacer) {
        var me = this;
        me.suspendreRecherche = true;
        Ext.each(['note', 'statut', 'theme', 'employe'], function (id) {
            me.down('#' + id).setValue(f[id] || '');
        });
        me.down('#contient').suspendEvents();
        me.down('#contient').setValue(f.contient || '');
        me.down('#contient').resumeEvents();
        me.down('#motCle').setValue(f.motCle || null);
        me.down('#reponseAttendue').suspendEvents();
        me.down('#reponseAttendue').setValue(f.reponse === 'ATTENDUE');
        me.down('#reponseAttendue').resumeEvents();
        if (toutEffacer) {
            me.down('#du').setValue(Ext.Date.add(new Date(), Ext.Date.DAY, -29));
            me.down('#au').setValue(new Date());
        }
        me.suspendreRecherche = false;
        me.setActiveTab(me.down('#ongletAvis'));
        me.rechercher();
    },

    ouvrir: function (url) {
        window.open(url + '?' + Ext.Object.toQueryString(this.parametresFiltres()), '_blank');
    },

    /* ------------------------------------------------------------------ detail et traitement */

    formulaireTraitement: function () {
        var me = this;
        return {
            xtype: 'form', itemId: 'traitement', hidden: true, border: false, bodyPadding: '0 14 12 14',
            defaults: {anchor: '100%', labelAlign: 'top'},
            items: [{
                xtype: 'container', layout: 'hbox', itemId: 'statutBoutons', margin: '0 0 6 0', items: [
                    {xtype: 'tbtext', text: 'Statut :', margin: '4 8 0 0'},
                    {xtype: 'button', text: 'Nouveau', itemId: 'stNOUVEAU', toggleGroup: 'avStatut', allowDepress: false, listeners: {toggle: me.marquerStatut}, margin: '0 4 0 0'},
                    {xtype: 'button', text: 'Lu', itemId: 'stLU', toggleGroup: 'avStatut', allowDepress: false, listeners: {toggle: me.marquerStatut}, margin: '0 4 0 0'},
                    {xtype: 'button', text: 'Traité', itemId: 'stTRAITE', toggleGroup: 'avStatut', allowDepress: false, listeners: {toggle: me.marquerStatut}}
                ]
            }, {
                xtype: 'textarea', itemId: 'noteInterne', fieldLabel: 'Note interne (non visible du client)', height: 54, maxLength: 1500
            }, {
                xtype: 'button', itemId: 'enregistrerTraitement', text: 'Enregistrer le traitement', anchor: null,
                handler: function () { me.enregistrerTraitement(); }
            }, {
                xtype: 'fieldset', itemId: 'blocReponse', title: 'Répondre au client', margin: '12 0 0 0', padding: '4 10 10 10',
                defaults: {anchor: '100%'}, items: [
                    {xtype: 'radiogroup', itemId: 'canal', columns: 2, items: [
                            {boxLabel: 'WhatsApp', name: 'avCanal', inputValue: 'WHATSAPP', itemId: 'canalWhatsapp'},
                            {boxLabel: 'E-mail', name: 'avCanal', inputValue: 'EMAIL', itemId: 'canalEmail'}
                        ]},
                    {xtype: 'textarea', itemId: 'texteReponse', height: 110, maxLength: 1000, enforceMaxLength: true},
                    {xtype: 'container', layout: 'hbox', items: [
                            {xtype: 'button', itemId: 'envoyerReponse', text: 'Envoyer la réponse', handler: function () { me.envoyerReponse(); }},
                            {xtype: 'tbtext', itemId: 'etatReponse', margin: '4 0 0 10', text: ''}
                        ]}
                ]
            }, {
                xtype: 'component', itemId: 'sansReponse', hidden: true, margin: '12 0 0 0',
                html: '<div class="an-aide">Le client n\'a pas laissé de coordonnées ou n\'a pas accepté d\'être recontacté : pas de réponse possible.</div>'
            }]
        };
    },

    afficherAvis: function (id) {
        var me = this;
        me.avisChoisi = id;
        me.appel('GET', '../api/v1/avis-clients/avis/' + encodeURIComponent(id), null, function (r) {
            me.remplirDetail(r.data);
            var st = me.down('#grilleAvis').getStore(), rec = st.findRecord('id', id, 0, false, true, true);
            if (rec && rec.get('statut') !== r.data.statut) {
                rec.set('statut', r.data.statut);
                rec.commit();
                me.appel('GET', '../api/v1/avis-clients/droits', null, function (d) { me.majTitreAvis(d.nouveaux); });
            }
        });
    },

    remplirDetail: function (a) {
        var me = this, h = [];
        me.avis = a;
        h.push('<div class="av-detail">');
        h.push('<h3>' + me.etoiles(a.note) + ' <span style="font-size:13px;color:#4a5562">' + a.note + ' / 5</span></h3>');
        h.push('<div class="av-gris">' + me.esc(a.date) + (a.memeAppareil ? ' · ' + a.memeAppareil + ' autre(s) avis du même appareil' : '') + '</div>');
        if (Ext.Object.getSize(a.criteres)) {
            h.push('<div style="margin-top:6px">' + me.puces(a.criteres) + '</div>');
        }
        h.push('<div class="av-bloc">' + (me.esc(a.texte) || '<span class="av-gris">(pas de texte)</span>') + '</div>');
        if (a.employe) {
            h.push('<div>Employé cité : <span class="av-employe">' + me.esc(a.employe) + '</span></div>');
        }
        h.push('<div style="margin-top:6px">Client : ' + (a.anonyme ? '<span class="av-gris">anonyme</span>'
                : me.esc(a.nom) + (a.telephone ? ' · ' + me.esc(a.telephone) : '') + (a.email ? ' · ' + me.esc(a.email) : '')
                + (a.rappel ? ' · <b>accepte une réponse</b>' : ' · <span class="av-gris">ne souhaite pas de réponse</span>')) + '</div>');
        if (a.reponse) {
            h.push('<div class="av-bloc av-reponse"><b>Réponse ' + (a.canalReponse === 'EMAIL' ? 'par e-mail' : 'par WhatsApp')
                    + (a.statutReponse === 'SIMULE' ? ' (simulée)' : '') + '</b> — ' + me.esc(a.dateReponse) + ', ' + me.esc(a.auteurReponse)
                    + '\n' + me.esc(a.reponse) + '</div>');
        } else if (a.statutReponse === 'ECHEC') {
            h.push('<div class="av-bloc" style="background:#fdecea;color:#a93226">Le dernier envoi de réponse a échoué.</div>');
        }
        h.push('</div>');
        me.down('#detail').update(h.join(''));
        var f = me.down('#traitement'), peut = !!me.droits.repondre;
        f.show();
        me.down('#statutBoutons').setDisabled(!peut);
        me.down('#st' + a.statut).toggle(true, true);
        Ext.each(['NOUVEAU', 'LU', 'TRAITE'], function (x) {
            var b = me.down('#st' + x);
            me.marquerStatut(b, b.pressed);
        });
        me.down('#noteInterne').setValue(a.noteInterne);
        me.down('#noteInterne').setReadOnly(!peut);
        me.down('#enregistrerTraitement').setVisible(peut);
        var repondable = peut && a.rappel && (a.telephone || a.email);
        me.down('#blocReponse').setVisible(!!repondable);
        me.down('#sansReponse').setVisible(peut && !repondable);
        if (repondable) {
            me.down('#canalWhatsapp').setDisabled(!a.telephone);
            me.down('#canalEmail').setDisabled(!a.email);
            me.down('#canal').setValue({avCanal: a.telephone ? 'WHATSAPP' : 'EMAIL'});
            me.down('#texteReponse').setValue(a.reponse ? '' : me.modeleReponse(a));
            me.down('#envoyerReponse').setText(a.reponse ? 'Envoyer une nouvelle réponse' : 'Envoyer la réponse');
            me.down('#etatReponse').setText('');
        }
    },

    modeleReponse: function (a) {
        var nom = a.nom ? ' ' + a.nom : '';
        var debut = a.note >= 4 ? 'Merci beaucoup pour votre avis, il fait plaisir à toute l\'équipe.'
                : a.note <= 2 ? 'Merci d\'avoir pris le temps de nous écrire. Nous sommes désolés de votre expérience et nous avons pris en compte vos remarques.'
                : 'Merci pour votre avis, il nous aide à nous améliorer.';
        return 'Bonjour' + nom + ',\n' + debut + '\n\nCordialement,\nLa pharmacie';
    },

    /** Statut courant bien visible : style pose sur le bouton lui-meme (le theme des boutons passerait devant une regle CSS). */
    marquerStatut: function (b, presse) {
        var el = b.getEl(), inner = el && el.down('.x-btn-inner');
        if (!el) {
            return;
        }
        el.dom.style.setProperty('background', presse ? '#1d8a76' : '', presse ? 'important' : '');
        el.dom.style.setProperty('border-color', presse ? '#1d8a76' : '', presse ? 'important' : '');
        if (inner) {
            inner.dom.style.setProperty('color', presse ? '#fff' : '', presse ? 'important' : '');
        }
    },

    statutChoisi: function () {
        var s = 'LU';
        Ext.each(['NOUVEAU', 'LU', 'TRAITE'], function (x) {
            if (this.down('#st' + x).pressed) {
                s = x;
            }
        }, this);
        return s;
    },

    enregistrerTraitement: function () {
        var me = this, id = me.avis.id;
        me.appel('POST', '../api/v1/avis-clients/avis/' + encodeURIComponent(id) + '/traiter',
                {statut: me.statutChoisi(), noteInterne: me.down('#noteInterne').getValue()}, function (r) {
            me.remplirDetail(r.data);
            me.majLigne(r.data);
            me.down('#etatReponse').setText('');
            me.down('#enregistrerTraitement').setText('Enregistré ✓');
            Ext.defer(function () {
                if (me.down('#enregistrerTraitement')) {
                    me.down('#enregistrerTraitement').setText('Enregistrer le traitement');
                }
            }, 1800);
        });
    },

    majLigne: function (a) {
        var st = this.down('#grilleAvis').getStore(), rec = st.findRecord('id', a.id, 0, false, true, true);
        if (rec) {
            rec.set({statut: a.statut, reponse: a.reponse, canalReponse: a.canalReponse, reponseAttendue: a.reponseAttendue});
            rec.commit();
        }
    },

    envoyerReponse: function () {
        var me = this, texte = Ext.String.trim(me.down('#texteReponse').getValue() || ''), canal = me.down('#canal').getValue().avCanal;
        if (!texte) {
            me.down('#etatReponse').setText('<span style="color:#c0392b">Écrivez la réponse.</span>');
            return;
        }
        me.appel('POST', '../api/v1/avis-clients/avis/' + encodeURIComponent(me.avis.id) + '/repondre', {canal: canal, texte: texte}, function (r) {
            me.remplirDetail(r.data);
            me.majLigne(r.data);
            me.down('#etatReponse').setText('<span style="color:#1e8449">' + me.esc(r.message || 'Réponse envoyée.') + '</span>');
        }, function (r) {
            me.down('#etatReponse').setText('<span style="color:#c0392b">' + me.esc(r.message || r.msg || 'Envoi impossible.') + '</span>');
        });
    },

    /* ------------------------------------------------------------------ onglet Analyse */

    ongletAnalyse: function () {
        var me = this, aujourdhui = new Date();
        var periode = function (texte, jours) {
            return {text: texte, handler: function () {
                    me.down('#anDu').setValue(Ext.Date.add(new Date(), Ext.Date.DAY, -(jours - 1)));
                    me.down('#anAu').setValue(new Date());
                    me.chargerAnalyse(true);
                }};
        };
        return {
            title: 'Analyse', itemId: 'ongletAnalyse', autoScroll: true, bodyStyle: 'background:#f6f8fa',
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'datefield', itemId: 'anDu', fieldLabel: 'Du', labelWidth: 22, width: 125, format: 'd/m/Y',
                            value: Ext.Date.add(aujourdhui, Ext.Date.DAY, -29), listeners: {select: function () { me.chargerAnalyse(true); }}},
                        {xtype: 'datefield', itemId: 'anAu', fieldLabel: 'Au', labelWidth: 22, width: 125, format: 'd/m/Y',
                            value: aujourdhui, listeners: {select: function () { me.chargerAnalyse(true); }}},
                        '-', periode('7 jours', 7), periode('30 jours', 30), periode('3 mois', 91), periode('12 mois', 365),
                        '->',
                        {text: 'Imprimer l\'analyse', itemId: 'imprimerAnalyse', icon: 'resources/images/icons/fam/printer.png', handler: function () {
                                window.open('../api/v1/avis-clients/analyse/pdf?' + Ext.Object.toQueryString(me.periodeAnalyse()), '_blank');
                            }}
                    ]}],
            items: [{xtype: 'component', itemId: 'analyse', html: '<div class="av-vide">Chargement…</div>',
                    listeners: {afterrender: function (c) {
                            c.getEl().on('click', function (e, t) {
                                var el = Ext.fly(t).up('[data-filtre]', 6) || (t.getAttribute && t.getAttribute('data-filtre') ? Ext.fly(t) : null);
                                if (el) {
                                    me.filtrerDepuisAnalyse(Ext.JSON.decode(el.getAttribute('data-filtre'), true) || {});
                                }
                            });
                        }}}]
        };
    },

    periodeAnalyse: function () {
        return {du: Ext.Date.format(this.down('#anDu').getValue() || new Date(), 'Y-m-d'),
            au: Ext.Date.format(this.down('#anAu').getValue() || new Date(), 'Y-m-d')};
    },

    /** Clic dans l'analyse : la liste des avis s'ouvre sur la meme periode avec le filtre de l'element. */
    filtrerDepuisAnalyse: function (f) {
        var me = this;
        me.down('#du').setValue(me.down('#anDu').getValue());
        me.down('#au').setValue(me.down('#anAu').getValue());
        me.filtrer(f);
    },

    chargerAnalyse: function (forcer) {
        var me = this, p = me.periodeAnalyse(), cle = p.du + '|' + p.au;
        if (!forcer && me.derniereAnalyse === cle) {
            return;
        }
        me.derniereAnalyse = cle;
        me.appel('GET', '../api/v1/avis-clients/analyse?' + Ext.Object.toQueryString(p), null, function (r) {
            me.analyseCourante = r;
            me.down('#analyse').update(me.htmlAnalyse(r));
            me.majListesFiltres(r);
        });
    },

    /** Mots cles et employes de l'analyse proposes dans les filtres de la liste. */
    majListesFiltres: function (r) {
        var me = this, mots = [], emp = [{v: '', l: 'Tous'}];
        Ext.each(r.motsCles || [], function (m) {
            mots.push({cle: m.cle, mot: m.mot, nombre: m.nombre});
        });
        Ext.each(r.employes || [], function (e) {
            emp.push({v: e.cle, l: e.employe + ' (' + e.nombre + ')'});
        });
        me.down('#motCle').getStore().loadData(mots);
        var ce = me.down('#employe'), garde = ce.getValue();
        ce.getStore().loadData(emp);
        ce.setValue(ce.getStore().findExact('v', garde) >= 0 ? garde : '');
    },

    filtreAttr: function (f) {
        return ' data-filtre="' + this.esc(Ext.JSON.encode(f)) + '"';
    },

    barre: function (part, couleur) {
        return '<div class="an-barre"><i style="left:0;width:' + Math.max(0, Math.min(100, part)) + '%;background:' + couleur + '"></i></div>';
    },

    delta: function (v, avant, unite, inverse) {
        if (avant === null || avant === undefined) {
            return '';
        }
        var d = Math.round((v - avant) * 10) / 10;
        if (!d) {
            return '<span class="an-delta">=</span>';
        }
        var bon = inverse ? d < 0 : d > 0;
        return '<span class="an-delta ' + (bon ? 'haut' : 'bas') + '">' + (d > 0 ? '▲ +' : '▼ ') + d + (unite || '') + '</span>';
    },

    htmlAnalyse: function (r) {
        var me = this, s = r.synthese, p = s.precedent, h = ['<div class="an">'];
        if (!s.nombre) {
            h.push('<div class="av-vide">Aucun avis sur cette période' + (p.nombre ? ' (' + p.nombre + ' sur la période précédente)' : '') + '.</div></div>');
            return h.join('');
        }
        /* tuiles */
        var tuile = function (valeur, libelle, filtre, rouge) {
            return '<div class="an-tuile' + (rouge ? ' rouge' : '') + (filtre ? ' an-lien"' + me.filtreAttr(filtre) : '"') + '><b>' + valeur + '</b><span>' + libelle + '</span></div>';
        };
        h.push('<div class="an-tuiles">');
        h.push(tuile(s.nombre + me.delta(s.nombre, p.nombre), 'avis (période précédente : ' + p.nombre + ')', {}));
        h.push(tuile(s.moyenne + ' <small style="font-size:13px">/ 5</small>' + (p.nombre ? me.delta(s.moyenne, p.moyenne) : ''), 'note moyenne' + (p.nombre ? ' (précédente : ' + p.moyenne + ')' : '')));
        h.push(tuile(s.satisfaits + ' %' + (p.nombre ? me.delta(s.satisfaits, p.satisfaits, ' pts') : ''), 'satisfaits (4–5 ★)', {note: 'POSITIF'}));
        h.push(tuile(s.mecontents + ' %', 'mécontents (1–2 ★)', {note: 'NEGATIF'}, true));
        h.push(tuile(s.negatifsNonTraites, 'avis négatifs non traités', {note: 'NEGATIF', statut: 'NON_TRAITE'}, s.negatifsNonTraites > 0));
        h.push(tuile(s.reponsesAttendues, 'clients attendent une réponse', {reponse: 'ATTENDUE'}, s.reponsesAttendues > 0));
        h.push('</div>');
        /* alertes et bilan */
        h.push('<div class="an-grille"><div class="an-carte"><h4>Alertes</h4>');
        if (!r.alertes.length) {
            h.push('<div class="an-aide">Aucune alerte sur la période.</div>');
        }
        Ext.each(r.alertes, function (a) {
            h.push('<div class="an-alerte ' + a.niveau + '"' + (a.filtre ? me.filtreAttr(a.filtre) : '') + '>' + (a.niveau === 'haute' ? '⚠ ' : '• ') + me.esc(a.texte) + '</div>');
        });
        h.push('</div><div class="an-carte"><h4>Points forts / à améliorer</h4><div style="display:flex;gap:10px">');
        var liste = function (titre, l, cls) {
            return '<div style="flex:1"><b>' + titre + '</b><ul class="' + cls + '" style="margin:4px 0;padding-left:18px">'
                    + (l.length ? Ext.Array.map(l, function (x) {
                        return '<li>' + me.esc(x) + '</li>';
                    }).join('') : '<li style="color:#8a96a3;list-style:none;margin-left:-18px">—</li>') + '</ul></div>';
        };
        h.push(liste('Points forts', r.bilan.forts, 'an-forts') + liste('À améliorer', r.bilan.faibles, 'an-faibles'));
        h.push('</div></div></div>');
        /* repartition et evolution */
        h.push('<div class="an-grille"><div class="an-carte"><h4>Répartition des notes</h4>');
        Ext.each(r.repartition, function (x) {
            var c = x.note >= 4 ? '#1d8a76' : x.note <= 2 ? '#c0392b' : '#b9a03a';
            h.push('<div class="an-ligne lien"' + me.filtreAttr({note: String(x.note)}) + '><div class="an-lib" style="flex-basis:96px;overflow:visible">' + me.etoiles(x.note)
                    + '</div>' + me.barre(x.part, c) + '<div class="an-val">' + x.nombre + ' avis · ' + x.part + ' %</div></div>');
        });
        h.push('</div><div class="an-carte"><h4>Évolution</h4>' + me.svgEvolution(r.evolution) + '</div></div>');
        /* criteres et themes */
        h.push('<div class="an-grille"><div class="an-carte"><h4>Critères cochés par les clients</h4>');
        var maxC = 1;
        Ext.each(r.criteres, function (c) {
            maxC = Math.max(maxC, c.plus, c.moins);
        });
        Ext.each(r.criteres, function (c) {
            h.push('<div class="an-ligne"><div class="an-lib">' + me.esc(c.libelle) + '</div>'
                    + '<div class="an-barre" style="direction:rtl"><i style="right:0;width:' + (c.moins * 100 / maxC) + '%;background:#e6867a"></i></div>'
                    + '<div class="an-barre"><i style="left:0;width:' + (c.plus * 100 / maxC) + '%;background:#5fb3a1"></i></div>'
                    + '<div class="an-val" style="flex-basis:150px">👎 ' + c.moins + ' · 👍 ' + c.plus
                    + (c.satisfaction !== null ? ' · ' + c.satisfaction + ' %' : '') + '</div></div>');
        });
        h.push('<div class="an-aide">À gauche : « à améliorer », à droite : « apprécié ».</div></div>');
        h.push('<div class="an-carte"><h4>Thèmes évoqués dans les textes</h4>');
        if (!r.themes.length) {
            h.push('<div class="an-aide">Aucun thème reconnu dans les textes.</div>');
        }
        var maxT = 1;
        Ext.each(r.themes, function (t) {
            maxT = Math.max(maxT, t.nombre);
        });
        Ext.each(r.themes, function (t) {
            var c = t.moyenne >= 4 ? '#5fb3a1' : t.moyenne <= 2.5 ? '#e6867a' : '#d4b95e';
            h.push('<div class="an-ligne lien"' + me.filtreAttr({theme: t.theme}) + '><div class="an-lib">' + me.esc(t.theme) + '</div>'
                    + me.barre(t.nombre * 100 / maxT, c) + '<div class="an-val" style="flex-basis:190px">' + t.nombre + ' avis · note ' + t.moyenne
                    + ' · ' + t.negatifs + ' nég.' + (t.precedent !== t.nombre ? ' <span class="an-aide">(avant : ' + t.precedent + ')</span>' : '') + '</div></div>');
        });
        h.push('</div></div>');
        /* mots cles */
        h.push('<div class="an-carte"><h4>Mots clés et expressions <span class="an-aide">— taille : fréquence · couleur : note moyenne des avis qui les contiennent · cliquez pour lire ces avis</span></h4>');
        if (!r.motsCles.length) {
            h.push('<div class="an-aide">Pas assez de texte pour en tirer des mots clés.</div>');
        }
        var maxM = 1;
        Ext.each(r.motsCles, function (m) {
            maxM = Math.max(maxM, m.nombre);
        });
        Ext.each(r.motsCles, function (m) {
            var taille = 12 + Math.round(8 * m.nombre / maxM);
            h.push('<span class="an-mot ' + m.ton + '" style="font-size:' + taille + 'px" title="' + m.nombre + ' avis · note moyenne ' + m.moyenne + '"'
                    + me.filtreAttr({motCle: m.cle}) + '>' + me.esc(m.mot) + ' <small>' + m.nombre + '</small></span>');
        });
        h.push('</div>');
        /* employes */
        h.push('<div class="an-carte"><h4>Récapitulatif par employé cité <span class="an-aide">— les variantes d\'écriture d\'un même nom sont regroupées</span></h4>');
        if (!r.employes.length) {
            h.push('<div class="an-aide">Aucun employé cité sur la période.</div>');
        } else {
            h.push('<table class="an-emp"><tr><th>Employé</th><th>Avis</th><th>Note moy.</th><th>Négatifs</th><th>30 derniers jours</th><th>Critères en cause</th><th>Mots associés</th><th></th></tr>');
            Ext.each(r.employes, function (e) {
                var crit = [];
                Ext.Object.each(e.criteresNegatifs, function (k, v) {
                    crit.push('<span class="av-puce av-moins">' + me.esc(k) + ' ' + v + '</span>');
                });
                var mots = Ext.Array.map(e.motsCles, function (m) {
                    return '<span class="av-puce ' + (m.ton === 'positif' ? 'av-plus' : m.ton === 'negatif' ? 'av-moins' : '') + '">' + me.esc(m.mot) + '</span>';
                });
                h.push('<tr><td><b>' + me.esc(e.employe) + '</b>' + (e.correspondance ? '<div class="an-aide">→ ' + me.esc(e.correspondance) + '</div>' : '')
                        + (e.variantes.length > 1 ? '<div class="an-aide">écrit : ' + me.esc(e.variantes.join(', ')) + '</div>' : '') + '</td>'
                        + '<td>' + e.nombre + '</td><td>' + me.etoiles(Math.round(e.moyenne)) + ' ' + e.moyenne + '</td>'
                        + '<td style="color:' + (e.negatifs ? '#c0392b;font-weight:600' : 'inherit') + '">' + e.negatifs + '</td>'
                        + '<td>' + e.trenteJours + '</td><td>' + crit.join('') + '</td><td>' + mots.join('') + '</td>'
                        + '<td><a href="javascript:void(0)" class="an-lien"' + me.filtreAttr({employe: e.cle}) + '>Voir les avis</a></td></tr>');
            });
            h.push('</table>');
        }
        h.push('</div></div>');
        return h.join('');
    },

    /** Barres : nombre d'avis ; ligne : note moyenne (sur 5) ; point rouge : avis negatifs. */
    svgEvolution: function (ev) {
        var w = 520, hgt = 150, g = 26, n = ev.length, maxN = 1, me = this;
        if (!n) {
            return '';
        }
        Ext.each(ev, function (x) {
            maxN = Math.max(maxN, x.nombre);
        });
        var pas = (w - 2 * g) / n, s = ['<svg viewBox="0 0 ' + w + ' ' + (hgt + 22) + '" style="width:100%;height:auto" role="img" aria-label="Évolution du nombre d\'avis et de la note moyenne">'];
        s.push('<line x1="' + g + '" y1="' + hgt + '" x2="' + (w - g) + '" y2="' + hgt + '" stroke="#ccd5dc"/>');
        var pts = [];
        Ext.each(ev, function (x, i) {
            var bh = (hgt - 14) * x.nombre / maxN, xx = g + i * pas;
            s.push('<rect x="' + (xx + pas * 0.15) + '" y="' + (hgt - bh) + '" width="' + (pas * 0.7) + '" height="' + bh + '" fill="#cfe5df" rx="2"><title>'
                    + me.esc(x.periode) + ' : ' + x.nombre + ' avis, note ' + x.moyenne + '</title></rect>');
            if (x.nombre) {
                pts.push((xx + pas / 2) + ',' + (hgt - (hgt - 14) * x.moyenne / 5));
            }
            if (n <= 16 || i % Math.ceil(n / 12) === 0) {
                s.push('<text x="' + (xx + pas / 2) + '" y="' + (hgt + 14) + '" font-size="9" text-anchor="middle" fill="#6b7785">' + me.esc(x.periode) + '</text>');
            }
        });
        if (pts.length > 1) {
            s.push('<polyline points="' + pts.join(' ') + '" fill="none" stroke="#0f5b4f" stroke-width="2"/>');
        }
        Ext.each(pts, function (p) {
            var c = p.split(',');
            s.push('<circle cx="' + c[0] + '" cy="' + c[1] + '" r="2.6" fill="#0f5b4f"/>');
        });
        s.push('<text x="' + g + '" y="10" font-size="9" fill="#0f5b4f">— note moyenne (sur 5)</text><text x="' + (w - g) + '" y="10" font-size="9" fill="#5fa898" text-anchor="end">▮ nombre d\'avis (max ' + maxN + ')</text>');
        s.push('</svg>');
        return s.join('');
    },

    /* ------------------------------------------------------------------ onglet Reglages et affiche */

    ongletReglages: function () {
        var me = this;
        return {
            title: 'Réglages et affiche', itemId: 'ongletReglages', autoScroll: true, layout: {type: 'hbox', align: 'stretch'},
            items: [{
                xtype: 'form', itemId: 'formReglages', width: 470, bodyPadding: 14, border: false, autoScroll: true,
                defaults: {anchor: '100%', labelWidth: 175},
                items: [
                    {xtype: 'component', html: '<div class="rg-aide"><b>Publication de la page d\'avis</b><br>'
                                + '1. Sur le serveur : lancer une fois <code>outils/avis-clients/configurer-port-public.sh</code> (port public dédié).<br>'
                                + '2. Sur la box / le routeur : rediriger le port public <b>vers ce port du serveur</b>, jamais vers le port de Prestige.<br>'
                                + '3. Saisir ci-dessous l\'adresse IP publique fixe et le port.<br>'
                                + '4. Imprimer l\'affiche et la poser au comptoir.</div>'},
                    {xtype: 'textfield', itemId: 'rgAdresse', fieldLabel: 'Adresse IP publique', emptyText: 'ex. : 41.207.10.20 (vide = non publiée)', maxLength: 100},
                    {xtype: 'numberfield', itemId: 'rgPort', fieldLabel: 'Port public', minValue: 1, maxValue: 65535, allowDecimals: false},
                    {xtype: 'numberfield', itemId: 'rgMax', fieldLabel: 'Avis par heure et par appareil', minValue: 1, maxValue: 50, allowDecimals: false},
                    {xtype: 'textfield', itemId: 'rgAdresseAffichee', fieldLabel: 'Adresse affichée', maxLength: 120},
                    {xtype: 'component', itemId: 'rgAdresseDefaut', html: '', margin: '-4 0 8 180'},
                    {xtype: 'checkbox', itemId: 'rgActif', fieldLabel: 'Réception des avis', boxLabel: 'active'},
                    {xtype: 'container', layout: 'hbox', margin: '6 0 10 0', items: [
                            {xtype: 'button', itemId: 'rgEnregistrer', text: 'Enregistrer les réglages', handler: function () { me.enregistrerReglages(); }},
                            {xtype: 'tbtext', itemId: 'rgEtat', margin: '4 0 0 10', text: ''}
                        ]},
                    {xtype: 'component', itemId: 'rgLien', html: ''},
                    {xtype: 'container', layout: 'hbox', margin: '10 0 0 0', defaults: {margin: '0 6 0 0'}, items: [
                            {xtype: 'button', itemId: 'rgAfficheA4', text: 'Affiche A4', icon: 'resources/images/icons/fam/printer.png', handler: function () { me.affiche('A4'); }},
                            {xtype: 'button', itemId: 'rgAfficheA5', text: 'Affiche A5', icon: 'resources/images/icons/fam/printer.png', handler: function () { me.affiche('A5'); }},
                            {xtype: 'button', itemId: 'rgNouveauQr', text: 'Nouveau QR code…', handler: function () { me.down('#rgConfirmation').show(); }}
                        ]},
                    {xtype: 'container', itemId: 'rgConfirmation', hidden: true, margin: '10 0 0 0', padding: 8, style: 'background:#fdecea;border-radius:8px',
                        layout: 'hbox', items: [
                            {xtype: 'component', flex: 1, html: '<div style="color:#a93226;font-size:12px">Les affiches déjà posées ne fonctionneront plus. Il faudra imprimer la nouvelle affiche.</div>'},
                            {xtype: 'button', itemId: 'rgConfirmer', text: 'Confirmer', margin: '0 4 0 6', handler: function () { me.nouveauQr(); }},
                            {xtype: 'button', text: 'Annuler', handler: function () { me.down('#rgConfirmation').hide(); }}
                        ]}
                ]
            }, {
                xtype: 'panel', itemId: 'apercuAffiche', flex: 1, title: 'Aperçu de l\'affiche', border: true,
                html: '<div class="av-vide">L\'aperçu apparaît une fois l\'adresse publique saisie.</div>'
            }]
        };
    },

    chargerReglages: function () {
        var me = this;
        me.appel('GET', '../api/v1/avis-clients/reglages', null, function (r) {
            me.remplirReglages(r.data);
        });
    },

    remplirReglages: function (d) {
        var me = this;
        me.down('#rgAdresse').setValue(d.adresse);
        me.down('#rgPort').setValue(d.port);
        me.down('#rgMax').setValue(d.maxHeure);
        me.down('#rgAdresseAffichee').setValue(d.adresseAffichee);
        me.down('#rgAdresseAffichee').emptyText = d.adresseAffichee ? '' : (d.adressePharmacie || '');
        me.down('#rgAdresseAffichee').applyEmptyText();
        me.down('#rgAdresseDefaut').update('<div class="an-aide">Vide : « ' + me.esc(d.adressePharmacie) + ' » (fiche officine)</div>');
        me.down('#rgActif').setValue(d.actif);
        me.down('#rgLien').update(d.lien ? '<div class="an-aide" style="margin-bottom:3px">Lien du QR code (secret : ne le diffusez que par l\'affiche)</div><div class="rg-lien">' + me.esc(d.lien) + '</div>'
                : '<div class="an-aide">Page d\'avis non publiée : saisissez l\'adresse IP publique.</div>');
        Ext.each(['#rgAfficheA4', '#rgAfficheA5', '#rgNouveauQr'], function (b) {
            me.down(b).setDisabled(!d.lien);
        });
        me.down('#bandeauPublication').setVisible(!d.publie);
        var ap = me.down('#apercuAffiche');
        ap.update(d.lien ? '<iframe title="Aperçu de l\'affiche" style="width:100%;height:100%;border:0" src="../api/v1/avis-clients/affiche?format=A4&amp;v=' + Date.now() + '#toolbar=0&amp;view=FitH"></iframe>'
                : '<div class="av-vide">L\'aperçu apparaît une fois l\'adresse publique saisie.</div>');
    },

    enregistrerReglages: function () {
        var me = this;
        me.appel('POST', '../api/v1/avis-clients/reglages', {
            adresse: Ext.String.trim(me.down('#rgAdresse').getValue() || ''), port: me.down('#rgPort').getValue(),
            maxHeure: me.down('#rgMax').getValue(), adresseAffichee: me.down('#rgAdresseAffichee').getValue(),
            actif: me.down('#rgActif').getValue()
        }, function (r) {
            me.remplirReglages(r.data);
            me.down('#rgEtat').setText('<span style="color:#1e8449">Réglages enregistrés ✓</span>');
        }, function (r) {
            me.down('#rgEtat').setText('<span style="color:#c0392b">' + me.esc(r.message || r.msg) + '</span>');
        });
    },

    nouveauQr: function () {
        var me = this;
        me.appel('POST', '../api/v1/avis-clients/reglages/regenerer', null, function (r) {
            me.down('#rgConfirmation').hide();
            me.remplirReglages(r.data);
            me.down('#rgEtat').setText('<span style="color:#1e8449">Nouveau QR code créé : imprimez la nouvelle affiche.</span>');
        });
    },

    affiche: function (format) {
        window.open('../api/v1/avis-clients/affiche?format=' + format, '_blank');
    }
});
