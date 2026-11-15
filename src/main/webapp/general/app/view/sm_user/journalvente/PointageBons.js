/* global Ext, PrestigeConfirmation, PrestigeChargement */

/*
 * 15/11 : pointage des bons par organisme (onglet « Pointage » de « Liste des Bons par Organisme »).
 *  - organisme + periode : les memes bons que l'onglet « Bons » ; compteurs (en base, annonces et ecart, pointes,
 *    conformes, anomalies, alertes automatiques, montant attendu) ;
 *  - scanner ou taper le n° de bon (Entree) : la fiche de controle s'ouvre a droite ; ses six blocs sont verifies par
 *    le logiciel (vert = verifie, orange = a comparer au papier, rouge = alerte) ;
 *  - dans la fiche : Entree = conforme, 1 a 6 = bloc faux (puis motif et Entree), A = absent du papier ; le curseur
 *    revient sur le n° de bon pour le suivant ;
 *  - releve de l'organisme (Excel ou CSV) facultatif ; delai maximal de saisie de l'organisme et de son groupe (vide =
 *    sans delai, comme avant) ; Excel complet et PDF des anomalies.
 * Aucune fenetre surgissante : chaque enregistrement se confirme dans son bouton.
 */
Ext.define('testextjs.view.sm_user.journalvente.PointageBons', {
    extend: 'Ext.panel.Panel',
    xtype: 'pointagebons',
    layout: 'border',
    border: false,
    cls: 'pt-pointage',

    BLOCS: ['Assuré', 'Ayant droit', 'Taux', 'Produits et prix', 'Montant attendu', 'Date'],

    initComponent: function () {
        var me = this, api = '../api/v1/pointage-bons/';
        me.filtre = 'A_POINTER';
        me.blocChoisi = null;
        me.fiche = null;

        if (!document.getElementById('pt-styles')) {
            var s = document.createElement('style');
            s.id = 'pt-styles';
            s.textContent = [
                '.pt-tuiles { display:flex; gap:8px; flex-wrap:wrap; }',
                '.pt-tuile { border:1px solid #d5dde6; border-radius:6px; padding:4px 10px; background:#fff; min-width:92px; }',
                '.pt-tuile b { display:block; font-size:16px; color:#1e3a5f; }',
                '.pt-tuile span { font-size:11px; color:#4a5868; }',
                '.pt-tuile.pt-rouge b { color:#b42318; } .pt-tuile.pt-vert b { color:#1e7b34; }',
                '.pt-bloc { border:1px solid #d5dde6; border-left-width:6px; border-radius:4px; margin:0 0 6px; padding:5px 8px; background:#fff; }',
                '.pt-bloc.pt-OK { border-left-color:#1e7b34; } .pt-bloc.pt-INFO { border-left-color:#b45309; }',
                '.pt-bloc.pt-ALERTE { border-left-color:#b42318; background:#fff4f2; }',
                '.pt-bloc.pt-choisi { outline:3px solid #2b5287; }',
                '.pt-ticket { margin-top:4px; font-family:Consolas,monospace; font-size:12px; }',
                '.pt-art { border-top:1px dashed #c9d2dc; padding:3px 0; } .pt-art-l { display:flex; justify-content:space-between; gap:8px; }',
                '.pt-art-d { color:#4a5868; } .pt-art-t { color:#1e3a5f; font-weight:bold; padding-left:12px; }',
                '.pt-bloc .pt-tete { font-weight:bold; color:#1e3a5f; } .pt-bloc .pt-etat { float:right; font-size:11px; }',
                '.pt-OK .pt-etat { color:#1e7b34; } .pt-INFO .pt-etat { color:#b45309; } .pt-ALERTE .pt-etat { color:#b42318; }',
                '.pt-fiche-corps:focus { outline:2px solid #2b5287; }',
                '.pt-pointage .x-btn-disabled.x-btn-disabled { opacity:1 !important; }',
                '.pt-pointage .x-btn-disabled.x-btn-disabled .x-btn-inner { color:#4a5868 !important; }'
            ].join('\n');
            document.head.appendChild(s);
        }

        var organismes = new Ext.data.Store({
            fields: ['lgTIERSPAYANTID', 'strFULLNAME'], pageSize: 9999, autoLoad: false,
            proxy: {type: 'ajax', url: '../api/v1/client/tiers-payants', reader: {type: 'json', root: 'data', totalProperty: 'total'}}
        });
        me.store = new Ext.data.Store({
            fields: ['id', 'bon', 'vente', 'refVente', 'dateVente', 'dateOrdonnance', 'assure', 'matricule', 'ayantDroit',
                {name: 'taux', useNull: true}, {name: 'part', type: 'int'}, 'controles', 'alertesBon', 'alerte', 'resumeAlerte',
                'etat', 'resultat', 'blocAnomalie', 'motif', 'modifieDepuis', 'pointeLe', 'pointePar'],
            autoLoad: false,
            proxy: {type: 'ajax', url: api + 'liste', reader: {type: 'json', root: 'data', totalProperty: 'total'}},
            listeners: {
                beforeload: function (st) {
                    var p = me.parametres();
                    if (!p) {
                        return false;
                    }
                    p.filtre = me.filtre;
                    st.getProxy().extraParams = p;
                },
                load: function (st, recs, reussi) {
                    var rep = st.getProxy().getReader().rawData;
                    if (!reussi || !rep || !rep.success) {
                        me.down('#ptCompteurs').update('<b style="color:#b42318">' + ((rep && rep.msg) || 'La liste n\'a pas pu être chargée : réessayez.') + '</b>');
                        return;
                    }
                    me.compteurs(rep.compteurs);
                }
            }
        });

        var jour = function (d) {
            return Ext.Date.format(d, 'Y-m-d');
        };
        var debutMois = new Date();
        debutMois.setDate(1);

        me.dockedItems = [{
                xtype: 'toolbar', dock: 'top', itemId: 'ptFiltres', items: [
                    {xtype: 'combobox', itemId: 'ptOrganisme', store: organismes, valueField: 'lgTIERSPAYANTID', displayField: 'strFULLNAME',
                        queryMode: 'remote', minChars: 1, width: 280, emptyText: 'Organisme…', forceSelection: true, pageSize: 9999,
                        listeners: {select: function () {
                                me.chargerDelais();
                                me.recharger();
                            }}},
                    {xtype: 'datefield', itemId: 'ptDebut', fieldLabel: 'Du', labelWidth: 22, width: 135, format: 'd/m/Y', submitFormat: 'Y-m-d', value: debutMois,
                        listeners: {select: function () {
                                me.recharger();
                            }}},
                    {xtype: 'datefield', itemId: 'ptFin', fieldLabel: 'au', labelWidth: 18, width: 130, format: 'd/m/Y', submitFormat: 'Y-m-d', value: new Date(),
                        listeners: {select: function () {
                                me.recharger();
                            }}},
                    {xtype: 'button', itemId: 'ptActualiser', text: 'Actualiser', handler: function () {
                            me.recharger();
                        }},
                    '-',
                    {xtype: 'numberfield', itemId: 'ptAnnonces', fieldLabel: 'Bons annoncés par l\'organisme', labelWidth: 175, width: 245,
                        minValue: 0, allowDecimals: false, hideTrigger: true},
                    {xtype: 'button', itemId: 'ptAnnoncesOk', text: 'Enregistrer', handler: function (b) {
                            me.enregistrerAnnonces(b);
                        }},
                    {xtype: 'button', itemId: 'ptReleve', text: '⤒ Importer le relevé de l\'organisme', tooltip: 'Excel ou CSV téléchargé sur la plateforme de l\'organisme (facultatif)',
                        handler: function (b) {
                            me.importerReleve(b);
                        }}
                ]
            }, {
                xtype: 'toolbar', dock: 'top', itemId: 'ptRegle', items: [
                    {xtype: 'tbtext', text: '<b>Délai maximal de saisie</b> (ordonnance → vente) :'},
                    {xtype: 'numberfield', itemId: 'ptDelai', fieldLabel: 'organisme', labelWidth: 62, width: 140, minValue: 0, maxValue: 365, allowDecimals: false, emptyText: 'aucun'},
                    {xtype: 'numberfield', itemId: 'ptDelaiGroupe', fieldLabel: 'groupe', labelWidth: 45, width: 123, minValue: 0, maxValue: 365, allowDecimals: false, emptyText: 'aucun', disabled: true},
                    {xtype: 'tbtext', itemId: 'ptGroupe', text: ''},
                    {xtype: 'button', itemId: 'ptDelaiOk', text: 'Enregistrer le délai', handler: function (b) {
                            me.enregistrerDelais(b);
                        }},
                    {xtype: 'tbtext', text: '<span style="color:#4a5868">vide = sans délai ; l\'organisme passe avant son groupe</span>'}
                ]
            }, {
                xtype: 'toolbar', dock: 'top', items: [{xtype: 'component', itemId: 'ptCompteurs', html: '<span style="color:#4a5868">Choisissez un organisme.</span>'}]
            }];

        var rendEtat = function (v, meta, r) {
            var e = r.get('etat');
            if (e === 'CONFORME') {
                return '<span style="color:#1e7b34;font-weight:bold">conforme</span>';
            }
            if (e === 'ANOMALIE') {
                return '<span style="color:#b42318;font-weight:bold">anomalie ' + (r.get('blocAnomalie') || '') + '</span>';
            }
            if (e === 'ABSENT') {
                return '<span style="color:#b42318;font-weight:bold">absent du papier</span>';
            }
            return r.get('modifieDepuis') ? '<span style="color:#b45309;font-weight:bold">modifié : à repointer</span>' : 'à pointer';
        };
        me.grille = Ext.create('Ext.grid.Panel', {
            region: 'center', itemId: 'ptGrille', store: me.store, columnLines: true,
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'textfield', itemId: 'ptScan', emptyText: '▮▮ Scanner ou taper le n° de bon… (Entrée)', width: 300, enableKeyEvents: true,
                            listeners: {specialkey: function (f, e) {
                                    if (e.getKey() === e.ENTER) {
                                        me.scanner(f.getValue());
                                    }
                                }}},
                        {xtype: 'container', itemId: 'ptFiltre', layout: 'hbox', items: Ext.Array.map([['A_POINTER', 'À pointer'], ['TOUS', 'Tous'], ['ALERTES', 'Alertes'], ['ANOMALIES', 'Anomalies']], function (x) {
                                return {xtype: 'button', text: x[1], valeur: x[0], enableToggle: true, toggleGroup: 'ptFiltre' + me.id, allowDepress: false,
                                    pressed: x[0] === me.filtre, margin: '0 2 0 0', handler: function (b) {
                                        me.filtre = b.valeur;
                                        me.recharger();
                                    }};
                            })},
                        '->',
                        {xtype: 'button', itemId: 'ptExcel', text: 'Excel', iconCls: 'export_excel_icon', tooltip: 'Tous les bons de la période, avec leurs contrôles',
                            handler: function (b) {
                                var p = me.parametres();
                                if (p) {
                                    PrestigeChargement.telecharger(b, api + 'excel?' + Ext.Object.toQueryString(p), 'Excel', 'pointage_bons.xlsx');
                                }
                            }},
                        {xtype: 'button', itemId: 'ptPdf', text: 'PDF des anomalies', iconCls: 'printable', handler: function (b) {
                                me.pdf(b);
                            }}
                    ]
                }],
            columns: [
                {text: 'N° bon', dataIndex: 'bon', width: 110},
                {text: 'Date vente', dataIndex: 'dateVente', width: 120, renderer: function (v) {
                        return v ? Ext.Date.format(new Date(v), 'd/m/Y H:i') : '';
                    }},
                {text: 'Ordonnance', dataIndex: 'dateOrdonnance', width: 85, renderer: function (v) {
                        return v ? Ext.Date.format(Ext.Date.parse(v, 'Y-m-d'), 'd/m/Y') : '—';
                    }},
                {text: 'Assuré', dataIndex: 'assure', flex: 1, minWidth: 140},
                {text: 'Matricule', dataIndex: 'matricule', width: 100},
                {text: 'Ayant droit', dataIndex: 'ayantDroit', width: 130, renderer: function (v) {
                        return v || '— (lui-même)';
                    }},
                {text: 'Taux', dataIndex: 'taux', width: 55, align: 'right', renderer: function (v) {
                        return v === null ? '' : v + ' %';
                    }},
                {text: 'Attendu', dataIndex: 'part', width: 80, align: 'right', renderer: function (v) {
                        return Ext.util.Format.number(v, '0,000').replace(/,/g, ' ');
                    }},
                {text: 'Contrôle', dataIndex: 'resumeAlerte', width: 230, renderer: function (v, meta, r) {
                        if (r.get('alerte') === 'ALERTE') {
                            meta.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(Ext.String.htmlEncode(v || '')) + '"';
                            return '<span style="color:#b42318;font-weight:bold">' + Ext.String.htmlEncode(v || '') + '</span>';
                        }
                        return r.get('alerte') === 'OK' ? '<span style="color:#1e7b34">tout vérifié</span>' : '<span style="color:#b45309">à comparer au papier</span>';
                    }},
                {text: 'Pointage', dataIndex: 'etat', width: 130, renderer: rendEtat}
            ],
            listeners: {
                itemclick: function (v, rec) {
                    me.ouvrir(rec);
                }
            }
        });

        me.panneau = Ext.create('Ext.panel.Panel', {
            region: 'east', itemId: 'ptFiche', width: 470, split: true, title: 'Fiche de contrôle', autoScroll: true, bodyPadding: 8,
            html: '<div style="color:#4a5868">Scannez ou tapez un n° de bon, ou cliquez une ligne.</div>',
            dockedItems: [{
                    xtype: 'toolbar', dock: 'bottom', itemId: 'ptActions', items: [
                        {xtype: 'button', itemId: 'ptConforme', text: '✓ Conforme (Entrée)', cls: 'btn-primary', disabled: true, handler: function () {
                                me.pointer('CONFORME');
                            }},
                        {xtype: 'textfield', itemId: 'ptMotif', emptyText: 'Motif (après 1 à 6)', width: 150, disabled: true, maxLength: 255, enableKeyEvents: true,
                            listeners: {specialkey: function (f, e) {
                                    if (e.getKey() === e.ENTER) {
                                        e.stopEvent();
                                        me.pointer('ANOMALIE');
                                    }
                                }}},
                        {xtype: 'button', itemId: 'ptAnomalie', text: '✗ Anomalie…', disabled: true, handler: function () {
                                if (!me.blocChoisi) {
                                    me.message('Choisissez d\'abord le bloc faux : touche 1 à 6, ou clic sur le bloc.', false);
                                    return;
                                }
                                me.pointer('ANOMALIE');
                            }},
                        {xtype: 'button', itemId: 'ptAbsent', text: 'Absent du papier (A)', disabled: true, handler: function () {
                                me.pointer('ABSENT');
                            }}
                    ]
                }, {
                    xtype: 'toolbar', dock: 'bottom', items: [{xtype: 'tbtext', itemId: 'ptMessage', text: ''}]
                }]
        });
        me.items = [me.grille, me.panneau];
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.panneau.body.on('click', function (e) {
                var b = e.getTarget('.pt-bloc');
                if (b && me.fiche) {
                    me.choisirBloc(parseInt(b.getAttribute('data-bloc'), 10));
                }
            });
        });
    },

    parametres: function () {
        var me = this, tp = me.down('#ptOrganisme').getValue(), d = me.down('#ptDebut').getValue(), f = me.down('#ptFin').getValue();
        if (!tp || !d || !f) {
            return null;
        }
        return {tiersPayantId: tp, dtStart: Ext.Date.format(d, 'Y-m-d'), dtEnd: Ext.Date.format(f, 'Y-m-d')};
    },

    reloadGrid: function () {
        this.recharger();
    },

    recharger: function () {
        if (this.parametres()) {
            this.store.load();
        }
    },

    compteurs: function (c) {
        var me = this, t = function (val, lib, cls) {
            return '<div class="pt-tuile ' + (cls || '') + '"><b>' + val + '</b><span>' + lib + '</span></div>';
        }, nb = function (v) {
            return Ext.util.Format.number(v, '0,000').replace(/,/g, ' ');
        };
        var ecart = c.ecart === null ? '' : (c.ecart > 0 ? '+' : '') + c.ecart;
        me.down('#ptCompteurs').update('<div class="pt-tuiles">' + t(c.enBase, 'Bons en base')
                + t(c.annonces === null ? '—' : c.annonces, 'Annoncés' + (c.annonces === null ? '' : ' · écart ' + ecart), c.ecart ? 'pt-rouge' : '')
                + t(c.pointes, 'Pointés') + t(c.aPointer, 'À pointer') + t(c.conformes, 'Conformes', 'pt-vert')
                + t(c.anomalies, 'Anomalies', c.anomalies ? 'pt-rouge' : '') + t(c.alertes, 'Alertes auto', c.alertes ? 'pt-rouge' : '')
                + t(nb(c.montant), 'Montant attendu') + '</div>');
        var a = me.down('#ptAnnonces');
        if (!a.hasFocus) {
            a.setValue(c.annonces);
        }
        me.dernierCompteurs = c;
    },

    chargerDelais: function () {
        var me = this, tp = me.down('#ptOrganisme').getValue();
        Ext.Ajax.request({url: '../api/v1/pointage-bons/delais', method: 'GET', params: {tiersPayantId: tp},
            callback: function (o, ok, r) {
                var d = ok ? Ext.decode(r.responseText, true) : null;
                if (!d || !d.success) {
                    return;
                }
                me.down('#ptDelai').setValue(d.organisme);
                var g = me.down('#ptDelaiGroupe');
                g.setValue(d.delaiGroupe);
                g.setDisabled(!d.groupeId);
                me.groupeId = d.groupeId;
                me.down('#ptGroupe').setText(d.groupeId ? '(groupe ' + Ext.String.htmlEncode(d.groupe) + ')' : '(sans groupe)');
            }});
    },

    enregistrerDelais: function (b) {
        var me = this, tp = me.down('#ptOrganisme').getValue();
        if (!tp) {
            me.message('Choisissez un organisme.', false);
            return;
        }
        var org = me.down('#ptDelai').getValue(), gr = me.down('#ptDelaiGroupe').getValue();
        var texte = 'Confirmer : organisme ' + (org === null ? 'sans délai' : org + ' j') + (me.groupeId ? ', groupe ' + (gr === null ? 'sans délai' : gr + ' j') : '') + ' ?';
        PrestigeConfirmation.bouton(b, texte, function () {
            var fin = PrestigeChargement.occuper(b, 'Enregistrement');
            var corps = {tiersPayantId: tp, organisme: org};
            if (me.groupeId) {
                corps.groupe = gr;
            }
            Ext.Ajax.request({url: '../api/v1/pointage-bons/delais', method: 'POST', jsonData: corps,
                callback: function (o, ok, r) {
                    var d = Ext.decode(r.responseText, true);
                    if (!d || !d.success) {
                        fin((d && d.msg) || 'Échec', false);
                        return;
                    }
                    fin('Délai enregistré', true);
                    me.recharger();
                }});
        });
    },

    enregistrerAnnonces: function (b) {
        var me = this, p = me.parametres();
        if (!p) {
            me.message('Choisissez un organisme et une période.', false);
            return;
        }
        var n = me.down('#ptAnnonces').getValue();
        PrestigeConfirmation.bouton(b, 'Confirmer : ' + (n === null ? 'effacer le nombre annoncé' : n + ' bon(s) annoncé(s)') + ' ?', function () {
            var fin = PrestigeChargement.occuper(b, 'Enregistrement');
            Ext.Ajax.request({url: '../api/v1/pointage-bons/annonces', method: 'POST', jsonData: Ext.apply({nombre: n}, p),
                callback: function (o, ok, r) {
                    var d = Ext.decode(r.responseText, true);
                    if (!d || !d.success) {
                        fin((d && d.msg) || 'Échec', false);
                        return;
                    }
                    fin('Enregistré', true);
                    me.recharger();
                }});
        });
    },

    importerReleve: function (b) {
        var me = this, p = me.parametres();
        if (!p) {
            me.message('Choisissez un organisme et une période avant d\'importer le relevé.', false);
            return;
        }
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx,.xls,.csv,.txt';
        input.style.display = 'none';
        input.className = 'pt-fichier-releve';
        document.body.appendChild(input);
        input.addEventListener('change', function () {
            var f = input.files && input.files[0];
            document.body.removeChild(input);
            if (!f) {
                return;
            }
            var fin = PrestigeChargement.occuper(b, 'Rapprochement');
            fetch('../api/v1/pointage-bons/releve?' + Ext.Object.toQueryString(p), {method: 'POST', credentials: 'same-origin',
                headers: {'Content-Type': 'application/octet-stream'}, body: f}).then(function (r) {
                return r.json();
            }).then(function (d) {
                if (!d || !d.success) {
                    fin((d && d.msg) || 'Relevé illisible', false);
                    return;
                }
                fin(d.lignesReleve + ' ligne(s) lue(s)', true);
                me.afficherRapprochement(d);
                me.recharger();
            })['catch'](function () {
                fin('Le serveur ne répond pas', false);
            });
        });
        input.click();
    },

    afficherRapprochement: function (d) {
        var me = this, liste = function (a, f) {
            return a.length ? '<ul style="margin:2px 0 6px 18px">' + Ext.Array.map(a.slice(0, 50), f).join('') + (a.length > 50 ? '<li>…</li>' : '') + '</ul>' : ' aucun<br>';
        }, e = Ext.String.htmlEncode;
        me.fiche = null;
        me.majBoutons();
        me.panneau.setTitle('Relevé de l\'organisme');
        me.panneau.update('<div class="pt-rapprochement"><b>' + d.lignesReleve + '</b> ligne(s) au relevé, <b>' + d.apparies + '</b> appariée(s).<br><br>'
                + '<b style="color:#b42318">Chez l\'organisme, absents chez nous (' + d.absentsChezNous.length + ') :</b>' + liste(d.absentsChezNous, function (x) {
            return '<li>' + e(x.bon || '(sans n°)') + ' · ' + e(x.matricule || '') + ' · ' + e(x.date || '') + ' · ' + (x.montant === null ? '' : x.montant) + '</li>';
        }) + '<b style="color:#b42318">Chez nous, absents du relevé (' + d.absentsChezLui.length + ') :</b>' + liste(d.absentsChezLui, function (x) {
            return '<li>' + e(x.bon || '(sans n°)') + ' · ' + x.part + '</li>';
        }) + '<b style="color:#b45309">Écarts de montant (' + d.ecarts.length + ') :</b>' + liste(d.ecarts, function (x) {
            return '<li>' + e(x.bon) + ' : chez nous ' + x.chezNous + ', relevé ' + x.chezLui + ' (écart ' + x.ecart + ')</li>';
        }) + '</div>');
    },

    scanner: function (valeur) {
        var me = this, v = (valeur || '').trim();
        if (!v) {
            return;
        }
        var p = me.parametres();
        if (!p) {
            me.message('Choisissez un organisme et une période.', false);
            return;
        }
        var trouve = me.store.findBy(function (r) {
            return (r.get('bon') || '').toUpperCase() === v.toUpperCase();
        });
        if (trouve >= 0) {
            me.grille.getSelectionModel().select(trouve);
            me.ouvrir(me.store.getAt(trouve));
            return;
        }
        // hors du filtre en cours : recherche sur tous les bons de la periode
        Ext.Ajax.request({url: '../api/v1/pointage-bons/liste', method: 'GET', params: Ext.apply({filtre: 'TOUS', search: v}, p),
            callback: function (o, ok, r) {
                var d = ok ? Ext.decode(r.responseText, true) : null;
                var bon = d && d.success ? Ext.Array.findBy(d.data, function (x) {
                    return (x.bon || '').toUpperCase() === v.toUpperCase();
                }) : null;
                if (!bon) {
                    me.message('Bon ' + Ext.String.htmlEncode(v) + ' introuvable pour cet organisme et cette période.', false);
                    me.down('#ptScan').focus(true);
                    return;
                }
                me.ouvrir({get: function (k) {
                        return bon[k];
                    }});
            }});
    },

    ouvrir: function (rec) {
        var me = this, p = me.parametres();
        Ext.Ajax.request({url: '../api/v1/pointage-bons/fiche', method: 'GET', params: Ext.apply({id: rec.get('id')}, p),
            callback: function (o, ok, r) {
                var d = ok ? Ext.decode(r.responseText, true) : null;
                if (!d || !d.success) {
                    me.message((d && d.msg) || 'Fiche indisponible.', false);
                    return;
                }
                me.fiche = d;
                me.blocChoisi = null;
                me.afficherFiche();
                me.majBoutons();
                me.message('', true);
                me.down('#ptScan').setValue('');
                me.focusFiche();
            }});
    },

    afficherFiche: function () {
        var me = this, b = me.fiche.bon, e = Ext.String.htmlEncode, html = [];
        var lib = {OK: '✓ auto', INFO: 'à comparer', ALERTE: '⚠ alerte'};
        me.panneau.setTitle('Bon ' + e(b.bon || '(sans n°)') + ' · vente ' + e(b.refVente) + ' · ' + (b.etat === 'A_POINTER' ? 'à pointer' : b.etat.toLowerCase()));
        Ext.Array.each(b.alertesBon || [], function (a) {
            html.push('<div class="pt-bloc pt-ALERTE"><span class="pt-tete">N° de bon</span><span class="pt-etat">⚠ alerte</span><div>' + e(a) + '</div></div>');
        });
        Ext.Array.each(b.controles, function (c) {
            var detail = e(c.texte);
            if (c.bloc === 1) {
                detail = e(b.assure) + ' · ' + detail;
            } else if (c.bloc === 2 && b.ayantDroit) {
                detail = e(b.ayantDroit) + ' · ' + detail;
            } else if (c.bloc === 4 && me.fiche.ticket && me.fiche.ticket.length) {
                /* demande du 15/11 : les lignes comme sur le ticket (prix de reference, taux et part de chaque ligne) */
                detail += '<div class="pt-ticket">' + Ext.Array.map(me.fiche.ticket, function (x) {
                    return '<div class="pt-art"><div class="pt-art-l"><span>' + e(x.designation) + '</span><b>' + e(x.montant) + '</b></div>'
                            + '<div class="pt-art-d">' + e(x.detail) + (x.lot ? ' · lot ' + e(x.lot) : '') + '</div>'
                            + Ext.Array.map(x.lignes || [], function (l) {
                                return '<div class="pt-art-t">' + e(l) + '</div>';
                            }).join('') + '</div>';
                }).join('') + '</div>';
            } else if (c.bloc === 4) {
                detail += '<br>' + Ext.Array.map(me.fiche.produits, function (x) {
                    return e(x.produit) + ' × ' + x.quantite + ' à ' + x.prix + (x.prix !== x.prixFiche ? ' <span style="color:#b45309">(fiche ' + x.prixFiche + ')</span>' : '');
                }).join('<br>');
            }
            html.push('<div class="pt-bloc pt-' + c.niveau + (me.blocChoisi === c.bloc ? ' pt-choisi' : '') + '" data-bloc="' + c.bloc + '">'
                    + '<span class="pt-tete">' + c.bloc + ' · ' + me.BLOCS[c.bloc - 1] + '</span><span class="pt-etat">' + lib[c.niveau] + '</span><div>' + detail + '</div></div>');
        });
        if (b.resultat) {
            html.push('<div style="color:#4a5868;font-size:11px">Déjà pointé ' + (b.resultat === 'CONFORME' ? 'conforme' : b.resultat === 'ABSENT' ? 'absent du papier' : 'anomalie (bloc ' + b.blocAnomalie + ')')
                    + (b.motif ? ' : ' + e(b.motif) : '') + ' par ' + e(b.pointePar || '?') + (b.modifieDepuis ? ' — <b style="color:#b45309">bon modifié depuis : à repointer</b>' : '') + '</div>');
        }
        me.panneau.update('<div class="pt-fiche-corps" tabindex="0" style="outline:none">'
                + '<div style="color:#4a5868;margin-bottom:6px">Comparez avec le papier ; Entrée = tout conforme, 1 … 6 = bloc faux, A = absent du papier</div>'
                + html.join('') + '</div>');
        var corps = me.panneau.body.dom.querySelector('.pt-fiche-corps');
        corps.addEventListener('keydown', function (ev) {
            var k = ev.key;
            if (k === 'Enter') {
                ev.preventDefault();
                if (me.blocChoisi) {
                    me.pointer('ANOMALIE');
                } else {
                    me.pointer('CONFORME');
                }
            } else if (/^[1-6]$/.test(k)) {
                ev.preventDefault();
                me.choisirBloc(parseInt(k, 10));
            } else if (k === 'a' || k === 'A') {
                ev.preventDefault();
                me.pointer('ABSENT');
            } else if (k === 'Escape') {
                me.down('#ptScan').focus(true);
            }
        });
    },

    focusFiche: function () {
        var c = this.panneau.body.dom.querySelector('.pt-fiche-corps');
        if (c) {
            c.focus();
        }
    },

    choisirBloc: function (n) {
        var me = this;
        me.blocChoisi = me.blocChoisi === n ? null : n;
        me.afficherFiche();
        me.majBoutons();
        if (me.blocChoisi) {
            me.down('#ptMotif').focus(true);
            me.message('Bloc ' + n + ' · ' + me.BLOCS[n - 1] + ' marqué faux : motif court puis Entrée.', true);
        } else {
            me.focusFiche();
        }
    },

    majBoutons: function () {
        var me = this, ouvert = !!me.fiche;
        me.down('#ptConforme').setDisabled(!ouvert);
        me.down('#ptAbsent').setDisabled(!ouvert);
        me.down('#ptAnomalie').setDisabled(!ouvert);
        var m = me.down('#ptMotif');
        m.setDisabled(!ouvert || !me.blocChoisi);
        if (!me.blocChoisi) {
            m.setValue('');
        }
    },

    message: function (t, ok) {
        this.down('#ptMessage').setText(t ? '<span style="color:' + (ok ? '#1e3a5f' : '#b42318') + ';font-weight:bold">' + t + '</span>' : '');
    },

    pointer: function (resultat) {
        var me = this;
        if (!me.fiche || me.envoiEnCours) {
            return;
        }
        if (resultat === 'ANOMALIE' && !me.blocChoisi) {
            me.message('Choisissez d\'abord le bloc faux : touche 1 à 6.', false);
            return;
        }
        var b = me.fiche.bon;
        me.envoiEnCours = true;
        Ext.Ajax.request({url: '../api/v1/pointage-bons/pointer', method: 'POST',
            jsonData: {id: b.id, resultat: resultat, bloc: resultat === 'ANOMALIE' ? me.blocChoisi : null, motif: resultat === 'ANOMALIE' ? me.down('#ptMotif').getValue() : null},
            callback: function (o, ok, r) {
                me.envoiEnCours = false;
                var d = Ext.decode(r.responseText, true);
                if (!d || !d.success) {
                    me.message((d && d.msg) || 'Le pointage n\'a pas été enregistré : réessayez.', false);
                    return;
                }
                me.message('Bon ' + Ext.String.htmlEncode(b.bon || '') + ' : ' + (resultat === 'CONFORME' ? 'conforme' : resultat === 'ABSENT' ? 'absent du papier' : 'anomalie (bloc ' + me.blocChoisi + ')') + ' ✓', true);
                me.fiche = null;
                me.blocChoisi = null;
                me.majBoutons();
                me.panneau.setTitle('Fiche de contrôle');
                me.panneau.update('<div style="color:#4a5868">Bon suivant : scannez ou tapez son n°.</div>');
                me.recharger();
                me.down('#ptScan').focus(true);
            }});
    },

    pdf: function (b) {
        var me = this, p = me.parametres();
        if (!p) {
            me.message('Choisissez un organisme et une période.', false);
            return;
        }
        var fin = PrestigeChargement.occuper(b, 'PDF');
        Ext.Ajax.request({url: '../api/v1/pointage-bons/pdf', method: 'GET', params: p,
            callback: function (o, ok, r) {
                var d = ok ? Ext.decode(r.responseText, true) : null;
                if (!d || !d.success || !d.url) {
                    fin((d && d.msg) || 'Impression impossible', false);
                    return;
                }
                fin(d.lignes + ' anomalie(s)', true);
                window.open('..' + d.url, '_blank');
            }});
    }
});
