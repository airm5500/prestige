/* global Ext */

// Fenetre de traitement d'une suggestion de reserve.
//
// Traitement en DEUX TEMPS : on ajuste d'abord les quantites retenues (aucun stock
// ne bouge), puis le bouton "Traiter" execute les mouvements et affiche le compte
// rendu detaille.
//
// Saisie au clavier reprise du gestionnaire de suggestions de commande :
//   - Entree sur une quantite   -> enregistre puis passe au produit suivant
//   - Entree sur la valeur zero -> retire la ligne, sans aucun mouvement de stock
Ext.define('testextjs.view.stockmanagement.reserve.action.traitementSuggestion', {
    extend: 'Ext.window.Window',
    xtype: 'reservetraitementsuggestion',
    requires: ['Ext.grid.*', 'Ext.data.*', 'Ext.window.Window'],
    config: {
        suggestionid: '',
        parentview: null
    },

    // Repere visuel par etat de ligne (§5 : distinguer proposee, modifiee, supprimee, reussie, echouee)
    etatStyle: {
        PROPOSEE: {libelle: 'Proposee', couleur: '#555555'},
        MODIFIEE: {libelle: 'Modifiee', couleur: '#6600cc'},
        SUPPRIMEE: {libelle: 'Retiree', couleur: '#999999'},
        TRAITEE: {libelle: 'Traitee', couleur: '#2a6b2e'},
        ECHEC: {libelle: 'Echec', couleur: '#c0392b'}
    },

    initComponent: function () {
        var me = this;
        var id = me.getSuggestionid();
        var baseUrl = '../api/v1/suggestion-reserve/';

        var store = new Ext.data.Store({
            autoLoad: false,
            fields: [
                'lg_SUGGESTION_RESERVE_DETAIL_ID', 'lg_FAMILLE_ID', 'int_CIP', 'str_NAME',
                {name: 'int_QTE_PROPOSEE', type: 'int'},
                {name: 'int_QTE_RETENUE', type: 'int'},
                {name: 'int_QTE_DEPLACEE', type: 'int'},
                {name: 'int_STOCK_RAYON', type: 'int'},
                {name: 'int_STOCK_RESERVE', type: 'int'},
                {name: 'int_SEUIL_DECLENCHEUR', type: 'int'},
                {name: 'int_CIBLE', type: 'int'},
                {name: 'int_DISPONIBLE', type: 'int'},
                {name: 'int_STOCK_RAYON_ACTUEL', type: 'int'},
                {name: 'int_STOCK_RESERVE_ACTUEL', type: 'int'},
                {name: 'int_PROPOSITION_ACTUELLE', type: 'int'},
                'str_FORMULE', 'str_ETAT', 'str_CODE_ECHEC', 'str_MOTIF_LIGNE', 'lg_MOUVEMENT_ID'
            ],
            proxy: {
                type: 'ajax',
                url: baseUrl + encodeURIComponent(id),
                reader: {type: 'json', root: 'lignes'}
            }
        });

        var cellEditing = Ext.create('Ext.grid.plugin.CellEditing', {
            pluginId: 'cellplugin',
            clicksToEdit: 1,
            listeners: {
                // On retient la ligne en cours d'edition : plus fiable que d'interroger la position
                // courante du modele de selection au moment ou la touche Entree est relachee.
                beforeedit: function (editor, e) {
                    me.ligneEnCours = e.rowIdx;
                }
            }
        });

        // Passe la main a la quantite de la ligne suivante ; a la derniere ligne on s'arrete.
        var focusLigne = function (rowIndex) {
            Ext.defer(function () {
                var grid = me.grid;
                if (!grid || rowIndex >= store.getCount()) {
                    return;
                }
                var rec = store.getAt(rowIndex);
                if (!rec) {
                    return;
                }
                // On saute les lignes qui ne sont plus saisissables.
                if (rec.get('str_ETAT') === 'SUPPRIMEE' || rec.get('str_ETAT') === 'TRAITEE') {
                    focusLigne(rowIndex + 1);
                    return;
                }
                var col = grid.down('gridcolumn[dataIndex=int_QTE_RETENUE]');
                if (col) {
                    cellEditing.startEdit(rec, col);
                }
            }, 150);
        };

        // Enregistre la quantite retenue. Zero retire la ligne cote serveur.
        var enregistrerQuantite = function (rec, valeur, rowIndex) {
            Ext.Ajax.request({
                method: 'PUT',
                url: baseUrl + 'ligne/' + encodeURIComponent(rec.get('lg_SUGGESTION_RESERVE_DETAIL_ID')) + '/quantite',
                jsonData: {int_QTE: valeur},
                success: function (response) {
                    var res = Ext.JSON.decode(response.responseText, true) || {};
                    if (res.success === false) {
                        Ext.MessageBox.alert('Message', res.message || 'Operation impossible.');
                        return;
                    }
                    rec.set('str_ETAT', res.str_ETAT || rec.get('str_ETAT'));
                    rec.set('int_QTE_RETENUE', valeur);
                    rec.commit();
                    focusLigne(rowIndex + 1);
                },
                failure: function () {
                    Ext.MessageBox.alert('Erreur', 'Enregistrement impossible.');
                }
            });
        };

        var colEtat = {
            header: 'Etat', dataIndex: 'str_ETAT', width: 80, align: 'center',
            renderer: function (v, m) {
                var s = me.etatStyle[v] || {libelle: v, couleur: '#555555'};
                m.style = 'color:' + s.couleur + ';font-weight:bold;';
                return s.libelle;
            }
        };

        var grid = Ext.create('Ext.grid.Panel', {
            store: store,
            flex: 1,
            border: false,
            selModel: {selType: 'cellmodel'},
            plugins: [cellEditing],
            columns: [
                {header: 'CIP', dataIndex: 'int_CIP', width: 85},
                {header: 'Designation', dataIndex: 'str_NAME', flex: 2, minWidth: 180},
                {
                    header: 'Declencheur', dataIndex: 'str_FORMULE', flex: 2, minWidth: 200,
                    renderer: function (v, m, rec) {
                        // Regle appliquee, en clair, telle qu'elle a ete constatee a la creation.
                        m.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(v || '') + '"';
                        return '<span style="color:#0b57d0;">' + Ext.String.htmlEncode(v || '') + '</span>';
                    }
                },
                {
                    header: 'Stock a la creation', dataIndex: 'int_STOCK_RAYON', width: 110, align: 'center',
                    renderer: function (v, m, rec) {
                        return 'rayon ' + v + ' / reserve ' + rec.get('int_STOCK_RESERVE');
                    }
                },
                {
                    header: 'Stock actuel', dataIndex: 'int_STOCK_RAYON_ACTUEL', width: 110, align: 'center',
                    renderer: function (v, m, rec) {
                        // Signale une proposition qui a vieilli depuis sa creation.
                        var perime = (v !== rec.get('int_STOCK_RAYON'))
                                || (rec.get('int_STOCK_RESERVE_ACTUEL') !== rec.get('int_STOCK_RESERVE'));
                        if (perime) {
                            m.style = 'color:#b06000;font-weight:bold;';
                            m.tdAttr = 'data-qtip="Le stock a change depuis la creation de la suggestion."';
                        }
                        return 'rayon ' + v + ' / reserve ' + rec.get('int_STOCK_RESERVE_ACTUEL');
                    }
                },
                {header: 'Cible', dataIndex: 'int_CIBLE', width: 55, align: 'center'},
                {header: 'Dispo', dataIndex: 'int_DISPONIBLE', width: 55, align: 'center'},
                {
                    header: 'Proposee', dataIndex: 'int_QTE_PROPOSEE', width: 70, align: 'center',
                    renderer: function (v, m) {
                        // Immuable : c'est la trace de ce que le systeme avait propose.
                        m.style = 'color:#0b57d0;font-weight:bold;';
                        return v;
                    }
                },
                {
                    header: 'Qte retenue', dataIndex: 'int_QTE_RETENUE', width: 90, align: 'center',
                    editor: {
                        xtype: 'numberfield', minValue: 0, allowBlank: false, selectOnFocus: true,
                        enableKeyEvents: true, hideTrigger: true,
                        // Meme mise en evidence que le champ de recherche produit de la vente :
                        // la case en cours de saisie se repere immediatement.
                        fieldStyle: 'background-color:#fff8c4;font-weight:bold;text-align:center;',
                        listeners: {
                            focus: function (fld) {
                                Ext.defer(function () {
                                    if (fld.inputEl && fld.inputEl.dom) {
                                        fld.inputEl.dom.select();
                                    }
                                }, 30);
                            },
                            specialkey: function (field, e) {
                                if (e.getKey() !== e.ENTER) {
                                    return;
                                }
                                e.stopEvent();
                                var rowIndex = (me.ligneEnCours === undefined || me.ligneEnCours === null)
                                        ? 0 : me.ligneEnCours;
                                var rec = store.getAt(rowIndex);
                                if (!rec) {
                                    return;
                                }
                                var valeur = parseInt(field.getValue(), 10);
                                if (isNaN(valeur) || valeur < 0) {
                                    return;
                                }
                                cellEditing.completeEdit();
                                enregistrerQuantite(rec, valeur, rowIndex);
                            }
                        }
                    },
                    renderer: function (v, m, rec) {
                        var etat = rec.get('str_ETAT');
                        if (etat === 'SUPPRIMEE') {
                            m.style = 'color:#999999;text-decoration:line-through;';
                            return v;
                        }
                        // Vert et gras des qu'une quantite a ete validee : on distingue d'un coup d'oeil
                        // ce qui a ete confirme de ce qui attend encore une saisie.
                        if (etat === 'MODIFIEE' || etat === 'TRAITEE') {
                            m.style = 'color:#1e7e34;font-weight:bold;';
                            return v;
                        }
                        m.style = 'color:#6600cc;font-weight:bold;';
                        return v;
                    }
                },
                {header: 'Deplacee', dataIndex: 'int_QTE_DEPLACEE', width: 75, align: 'center'},
                colEtat,
                {
                    header: 'Motif / echec', dataIndex: 'str_MOTIF_LIGNE', flex: 1, minWidth: 140,
                    renderer: function (v, m, rec) {
                        var code = rec.get('str_CODE_ECHEC');
                        var txt = (code ? '[' + code + '] ' : '') + (v || '');
                        m.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(txt) + '"';
                        return Ext.String.htmlEncode(txt);
                    }
                }
            ],
            viewConfig: {emptyText: 'Aucune ligne.', deferEmptyText: false}
        });
        me.grid = grid;

        var entete = Ext.create('Ext.Component', {
            height: 46,
            padding: '4 8',
            html: ''
        });

        // Bandeau d'avertissement : n'apparait que si quelqu'un d'autre occupe la suggestion.
        var bandeauVerrou = Ext.create('Ext.Component', {
            hidden: true,
            padding: '6 10',
            style: 'background:#fdecea;border:1px solid #e0b4b0;color:#a02620;font-weight:bold;',
            html: ''
        });

        // Applique le resultat du verrou : saisie autorisee, ou consultation seule.
        var appliquerVerrou = function (res) {
            me.modifiable = (res.modifiable !== false);
            if (me.modifiable) {
                bandeauVerrou.hide();
            } else {
                bandeauVerrou.update('&#9888; ' + Ext.String.htmlEncode(res.motif_lecture_seule
                        || 'Cette suggestion est occupee : consultation seule.'));
                bandeauVerrou.show();
            }
            // La saisie et les actions qui modifient le stock sont coupees en consultation seule.
            cellEditing.disabled = !me.modifiable;
            me.btnTraiter.setDisabled(!me.modifiable);
            if (!me.modifiable) {
                btnReessayer.hide();
                me.btnAnnuler.hide();
            }
        };

        var majEntete = function (e) {
            if (!e) {
                return;
            }
            var sens = (e.str_CATEGORIE === 'RESERVE')
                    ? 'RAYON &rarr; RESERVE (on range le trop-plein)'
                    : 'RESERVE &rarr; RAYON (on regarnit le rayon)';
            entete.update(
                    '<div style="font-size:12px;">'
                    + '<b>' + Ext.String.htmlEncode(e.str_REF || '') + '</b>'
                    + ' &nbsp;|&nbsp; <span style="color:#0b57d0;font-weight:bold;">' + sens + '</span>'
                    + ' &nbsp;|&nbsp; Statut : <b>' + Ext.String.htmlEncode(e.str_STATUT || '') + '</b>'
                    + ' &nbsp;|&nbsp; Origine : ' + Ext.String.htmlEncode(e.str_ORIGINE || '')
                    + ' &nbsp;|&nbsp; Motif : ' + Ext.String.htmlEncode(e.motif_libelle || '-')
                    + '</div><div style="font-size:11px;color:#666;margin-top:2px;">'
                    + 'Creee le ' + Ext.String.htmlEncode(e.dt_CREATED || '')
                    + ' par ' + Ext.String.htmlEncode(e.str_USER_CREATEUR || '-')
                    + (e.str_USER_TRAITANT ? ' &nbsp;|&nbsp; Traitee par ' + Ext.String.htmlEncode(e.str_USER_TRAITANT) : '')
                    + (e.str_USER_CLOTURE ? ' &nbsp;|&nbsp; Cloturee par ' + Ext.String.htmlEncode(e.str_USER_CLOTURE) : '')
                    + '</div>');
        };

        var btnReessayer = Ext.create('Ext.button.Button', {
            text: 'Reessayer les lignes en echec',
            hidden: true,
            handler: function () {
                lancerTraitement(baseUrl + encodeURIComponent(id) + '/reessayer', true);
            }
        });

        var lancerTraitement = function (url, estReprise) {
            var progress = Ext.MessageBox.wait('Veuillez patienter...', 'Traitement en cours');
            Ext.Ajax.request({
                method: 'PUT',
                url: url,
                success: function (response) {
                    progress.hide();
                    var res = Ext.JSON.decode(response.responseText, true) || {};
                    if (res.success === false) {
                        Ext.MessageBox.alert('Message', res.message || 'Traitement impossible.');
                        return;
                    }
                    charger();
                    afficherCompteRendu(res);
                    var pv = me.getParentview();
                    if (pv && pv.reloadGrid) {
                        pv.reloadGrid();
                    }
                    if (typeof refreshNotificationBadge === 'function') {
                        refreshNotificationBadge();
                    }
                },
                failure: function () {
                    progress.hide();
                    Ext.MessageBox.alert('Erreur', estReprise ? 'La reprise a echoue.' : 'Le traitement a echoue.');
                }
            });
        };

        // Compte rendu detaille : on ne se contente pas d'un "18 / 20 traites".
        var afficherCompteRendu = function (res) {
            var lignes = function (arr, vide) {
                if (!arr || arr.length === 0) {
                    return '<div style="color:#888;padding:4px;">' + vide + '</div>';
                }
                var h = '';
                for (var i = 0; i < arr.length; i++) {
                    var a = arr[i];
                    var code = a.str_CODE_ECHEC ? ' <b style="color:#c0392b;">[' + Ext.String.htmlEncode(a.str_CODE_ECHEC) + ']</b> ' : '';
                    // Une ligne non traitee doit TOUJOURS dire pourquoi : sans cela on lisait le
                    // nom de l'article sans savoir ce qui s'etait passe.
                    var raison = a.str_RAISON
                            ? '<div style="color:#b06000;padding-left:12px;">' + Ext.String.htmlEncode(a.str_RAISON) + '</div>'
                            : '';
                    h += '<div style="padding:3px 6px;border-bottom:1px solid #eee;">'
                            + Ext.String.htmlEncode(a.int_CIP || '') + ' - ' + Ext.String.htmlEncode(a.str_NAME || '')
                            + ' &nbsp;<span style="color:#666;">(retenue ' + (a.int_QTE_RETENUE || 0)
                            + ', deplacee ' + (a.int_QTE_DEPLACEE || 0) + ')</span>'
                            + code + Ext.String.htmlEncode(a.str_MOTIF_LIGNE || '')
                            + raison
                            + '</div>';
                }
                return h;
            };
            // Identite de la suggestion rappelee dans le compte rendu : reference, statut, motif,
            // dates, et les utilisateurs qui l'ont creee puis cloturee.
            var e = res.entete || {};
            var identite = '<div style="padding:6px;background:#efe7f5;border:1px solid #cbb4dc;margin-bottom:8px;">'
                    + '<b>' + Ext.String.htmlEncode(e.str_REF || '') + '</b>'
                    + ' &nbsp;|&nbsp; Statut : <b>' + Ext.String.htmlEncode(e.str_STATUT || '') + '</b>'
                    + ' &nbsp;|&nbsp; Motif : ' + Ext.String.htmlEncode(e.motif_libelle || '-')
                    + '<br><span style="color:#555;">Creee le ' + Ext.String.htmlEncode(e.dt_CREATED || '')
                    + ' par <b>' + Ext.String.htmlEncode(e.str_USER_CREATEUR || '-') + '</b>'
                    + (e.str_USER_TRAITANT
                            ? ' &nbsp;|&nbsp; Traitee par <b>' + Ext.String.htmlEncode(e.str_USER_TRAITANT) + '</b>'
                            : '')
                    + (e.dt_CLOTURE
                            ? ' &nbsp;|&nbsp; Cloturee le ' + Ext.String.htmlEncode(e.dt_CLOTURE)
                              + ' par <b>' + Ext.String.htmlEncode(e.str_USER_CLOTURE || '-') + '</b>'
                            : '')
                    + '</span></div>';

            var html = '<div style="font-size:12px;">'
                    + identite
                    + '<div style="padding:6px;background:#f5f7fa;border:1px solid #ddd;margin-bottom:8px;">'
                    + '<b>Demandes :</b> ' + (res.total_demande || 0)
                    + ' &nbsp;|&nbsp; <b style="color:#2a6b2e;">Reussis :</b> ' + (res.total_reussi || 0)
                    + ' &nbsp;|&nbsp; <b style="color:#c0392b;">Echoues :</b> ' + (res.total_echoue || 0)
                    + ' &nbsp;|&nbsp; Retires : ' + (res.total_supprime || 0)
                    + ' &nbsp;|&nbsp; Ignores : ' + (res.total_ignore || 0)
                    + '</div>'
                    + '<b>Articles traites</b>' + lignes(res.articles_traites, 'Aucun.')
                    + '<br><b>Articles non traites</b>' + lignes(res.articles_non_traites, 'Aucun.')
                    + '</div>';
            Ext.create('Ext.window.Window', {
                title: 'Compte rendu du traitement',
                width: 760, height: 520, modal: true, autoScroll: true,
                bodyPadding: 8, html: html,
                buttons: [{
                        text: 'Exporter (CSV)',
                        handler: function () {
                            exporterCompteRendu(res);
                        }
                    }, {
                        text: 'Exporter (Excel)',
                        handler: function () {
                            telechargerFichier(baseUrl + encodeURIComponent(id) + '/compte-rendu/excel');
                        }
                    }, {
                        text: 'Imprimer',
                        handler: function () {
                            window.open('../webservices/stockmanagement/reserve/ws_generate_pdf_suggestion.jsp?mode='
                                    + 'compte_rendu&id=' + encodeURIComponent(id), '_blank');
                        }
                    }, {
                        text: 'Fermer',
                        handler: function () {
                            this.up('window').close();
                        }
                    }]
            }).show();
            btnReessayer.setVisible(!!res.relancable);
        };

        // Telechargement par iframe cachee : la fenetre courante n'est ni quittee ni rechargee.
        var telechargerFichier = function (url) {
            var frame = document.getElementById('suggestion-export-frame');
            if (!frame) {
                frame = document.createElement('iframe');
                frame.id = 'suggestion-export-frame';
                frame.style.display = 'none';
                document.body.appendChild(frame);
            }
            frame.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + '_dc=' + new Date().getTime();
        };

        var exporterCompteRendu = function (res) {
            var sep = ';';
            var esc = function (v) {
                v = (v === null || v === undefined) ? '' : String(v);
                return (v.indexOf(sep) >= 0 || v.indexOf('"') >= 0 || v.indexOf('\n') >= 0)
                        ? '"' + v.replace(/"/g, '""') + '"' : v;
            };
            var out = ['CIP;Designation;Qte retenue;Qte deplacee;Etat;Code;Motif'];
            var pousser = function (arr) {
                Ext.each(arr || [], function (a) {
                    out.push([esc(a.int_CIP), esc(a.str_NAME), esc(a.int_QTE_RETENUE), esc(a.int_QTE_DEPLACEE),
                        esc(a.str_ETAT), esc(a.str_CODE_ECHEC),
                        esc(a.str_MOTIF_LIGNE || a.str_RAISON)].join(sep));
                });
            };
            pousser(res.articles_traites);
            pousser(res.articles_non_traites);
            var blob = new Blob(['﻿' + out.join('\r\n')], {type: 'text/csv;charset=utf-8;'});
            var fname = 'compte_rendu_suggestion_' + Ext.Date.format(new Date(), 'Ymd_His') + '.csv';
            if (window.navigator.msSaveOrOpenBlob) {
                window.navigator.msSaveOrOpenBlob(blob, fname);
            } else {
                var url = window.URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = fname;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            }
        };

        // Charge en-tete et lignes en une seule requete.
        var premierChargement = true;
        var charger = function () {
            // Voile d'attente : l'utilisateur voit que la suggestion est en cours de chargement.
            if (me.win && me.win.body) {
                me.win.setLoading('Chargement de la suggestion...');
            }
            Ext.Ajax.request({
                // PUT .../ouvrir : lit la suggestion ET la reserve si personne ne l'occupe.
                method: 'PUT',
                url: baseUrl + encodeURIComponent(id) + '/ouvrir',
                callback: function () {
                    if (me.win && me.win.body) {
                        me.win.setLoading(false);
                    }
                },
                success: function (response) {
                    var res = Ext.JSON.decode(response.responseText, true) || {};
                    if (res.success === false) {
                        Ext.MessageBox.alert('Message', res.message || 'Suggestion introuvable.');
                        return;
                    }
                    majEntete(res.entete);
                    store.loadData(res.lignes || []);
                    appliquerVerrou(res);

                    // A l'ouverture, la main est donnee directement a la premiere quantite saisissable :
                    // la saisie peut commencer sans toucher la souris.
                    if (premierChargement) {
                        premierChargement = false;
                        if (me.modifiable) {
                            focusLigne(0);
                        }
                    }
                    // Une suggestion close ne se retraite pas : le bouton le dit au lieu
                    // de rester actif et de laisser croire qu'il reste quelque chose a faire.
                    var cloturee = res.entete && (res.entete.str_STATUT === 'TRAITEE'
                            || res.entete.str_STATUT === 'SUPPRIMEE');
                    me.btnTraiter.setDisabled(cloturee);
                    if (res.entete && res.entete.str_STATUT === 'TRAITEE') {
                        me.btnTraiter.setText('Deja traitee');
                        me.btnTraiter.removeCls('btn-suggestions-violet');
                        me.btnTraiter.addCls('btn-deja-traitee');
                    } else {
                        me.btnTraiter.setText('Traiter la suggestion');
                        me.btnTraiter.removeCls('btn-deja-traitee');
                        me.btnTraiter.addCls('btn-suggestions-violet');
                    }
                    var echec = false;
                    Ext.each(res.lignes || [], function (l) {
                        if (l.str_ETAT === 'ECHEC') {
                            echec = true;
                        }
                    });
                    btnReessayer.setVisible(echec);

                    // L'annulation n'apparait que s'il existe un mouvement a defaire ET que le
                    // privilege est detenu. Le serveur revalide de toute facon.
                    var traitees = 0;
                    Ext.each(res.lignes || [], function (l) {
                        if (l.str_ETAT === 'TRAITEE') {
                            traitees++;
                        }
                    });
                    if (traitees > 0 && me.modifiable) {
                        Ext.Ajax.request({
                            method: 'GET',
                            url: '../api/v1/reserve/peut-annuler',
                            success: function (rep) {
                                var droit = Ext.JSON.decode(rep.responseText, true) || {};
                                me.btnAnnuler.setVisible(droit.autorise === true);
                            }
                        });
                    } else {
                        me.btnAnnuler.setVisible(false);
                    }
                },
                failure: function () {
                    Ext.MessageBox.alert('Erreur', 'Chargement impossible.');
                }
            });
        };

        // Annulation par mouvement inverse : masquee tant que le privilege dedie n'est pas detenu,
        // et de toute facon revalidee cote serveur.
        me.btnAnnuler = Ext.create('Ext.button.Button', {
            text: 'Annuler les mouvements',
            hidden: true,
            handler: function () {
                var traitees = 0;
                store.each(function (r) {
                    if (r.get('str_ETAT') === 'TRAITEE') {
                        traitees++;
                    }
                });
                if (traitees === 0) {
                    Ext.MessageBox.alert('Message', 'Aucun mouvement a annuler.');
                    return;
                }
                Ext.MessageBox.prompt('Annuler les mouvements',
                        'Motif de l\'annulation (' + traitees + ' ligne(s)) :',
                        function (btn, texte) {
                            if (btn !== 'ok') {
                                return;
                            }
                            var progress = Ext.MessageBox.wait('Veuillez patienter...', 'Annulation en cours');
                            Ext.Ajax.request({
                                method: 'PUT',
                                url: baseUrl + encodeURIComponent(id) + '/annuler',
                                jsonData: {motif: texte || ''},
                                success: function (response) {
                                    progress.hide();
                                    var res = Ext.JSON.decode(response.responseText, true) || {};
                                    charger();
                                    afficherResultatAnnulation(res);
                                    var pv = me.getParentview();
                                    if (pv && pv.reloadGrid) {
                                        pv.reloadGrid();
                                    }
                                },
                                failure: function () {
                                    progress.hide();
                                    Ext.MessageBox.alert('Erreur', 'L\'annulation a echoue.');
                                }
                            });
                        });
            }
        });

        // Chaque refus est explique individuellement : une ligne bloquee n'empeche pas les autres.
        var afficherResultatAnnulation = function (res) {
            var bloc = function (titre, arr, couleur) {
                if (!arr || arr.length === 0) {
                    return '';
                }
                var h = '<br><b style="color:' + couleur + ';">' + titre + '</b>';
                for (var i = 0; i < arr.length; i++) {
                    var a = arr[i];
                    var ident = a.identite || a;
                    h += '<div style="padding:3px 6px;border-bottom:1px solid #eee;">'
                            + Ext.String.htmlEncode(ident.int_CIP || '') + ' - '
                            + Ext.String.htmlEncode(ident.str_NAME || '')
                            + (a.code ? ' <b style="color:#c0392b;">[' + Ext.String.htmlEncode(a.code) + ']</b> ' : ' ')
                            + Ext.String.htmlEncode(a.message || a.motif_refus || '')
                            + '</div>';
                }
                return h;
            };
            Ext.create('Ext.window.Window', {
                title: 'Resultat de l\'annulation',
                width: 700, height: 420, modal: true, autoScroll: true, bodyPadding: 8,
                html: '<div style="font-size:12px;">'
                        + '<div style="padding:6px;background:#f5f7fa;border:1px solid #ddd;">'
                        + '<b style="color:#2a6b2e;">Annulees :</b> ' + (res.total_annule || 0)
                        + ' &nbsp;|&nbsp; <b style="color:#c0392b;">Refusees :</b> ' + (res.total_refuse || 0)
                        + '</div>'
                        + bloc('Lignes annulees', res.lignes_annulees, '#2a6b2e')
                        + bloc('Lignes refusees', res.lignes_refusees, '#c0392b')
                        + bloc('Lignes sans mouvement a annuler', res.lignes_non_annulables, '#777777')
                        + '</div>',
                buttons: [{text: 'Fermer', handler: function () {
                            this.up('window').close();
                        }}]
            }).show();
        };

        me.btnTraiter = Ext.create('Ext.button.Button', {
            text: 'Traiter la suggestion',
            cls: 'btn-suggestions-violet',
            handler: function () {
                var aTraiter = 0;
                store.each(function (r) {
                    if (r.get('str_ETAT') !== 'SUPPRIMEE' && r.get('str_ETAT') !== 'TRAITEE'
                            && r.get('int_QTE_RETENUE') > 0) {
                        aTraiter++;
                    }
                });
                if (aTraiter === 0) {
                    Ext.MessageBox.alert('Message', 'Aucune ligne a traiter.');
                    return;
                }
                Ext.MessageBox.confirm('Confirmation',
                        'Traiter ' + aTraiter + ' ligne(s) ? Le stock sera deplace.',
                        function (btn) {
                            if (btn === 'yes') {
                                lancerTraitement(baseUrl + encodeURIComponent(id) + '/traiter', false);
                            }
                        });
            }
        });

        var win = new Ext.window.Window({
            autoShow: true,
            title: 'Traitement de la suggestion',
            width: 1150,
            height: 620,
            minWidth: 800,
            minHeight: 400,
            modal: true,
            maximizable: true,
            constrainHeader: true,
            layout: {type: 'vbox', align: 'stretch'},
            items: [entete, bandeauVerrou, grid],
            buttons: [
                me.btnTraiter,
                btnReessayer,
                me.btnAnnuler,
                {
                    text: 'Imprimer la suggestion',
                    handler: function () {
                        window.open('../webservices/stockmanagement/reserve/ws_generate_pdf_suggestion.jsp?mode='
                                + 'suggestion&id=' + encodeURIComponent(id), '_blank');
                    }
                },
                {
                    text: 'Fermer',
                    handler: function () {
                        win.close();
                    }
                }
            ],
            listeners: {
                // A la fermeture, la liste des suggestions est rechargee : le statut passe a "En cours"
                // des la premiere quantite saisie s'affiche immediatement, sans avoir a relancer une
                // recherche.
                close: function () {
                    // On rend la suggestion aux autres des la fermeture.
                    Ext.Ajax.request({
                        method: 'PUT',
                        url: baseUrl + encodeURIComponent(id) + '/liberer',
                        callback: function () {
                            var pv = me.getParentview();
                            if (pv && pv.reloadGrid) {
                                pv.reloadGrid();
                            }
                        }
                    });
                }
            }
        });
        me.win = win;

        charger();
        me.callParent();
    }
});
