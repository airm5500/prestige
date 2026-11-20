/* global Ext */

/*
 * Retours du 13/10 (point 21) : « Marge sur produits vendus » en deux onglets :
 *  - Liste : l'ecran existant (margeproducts), sans changement de fonctionnement ;
 *  - Analyse : taux de marque (marge / CA HT) et taux de marge (marge / prix d'achat) de la periode, compares a la
 *    periode precedente et aux moyennes des 3 et 6 derniers mois, six derniers mois, familles ; objectifs reglables
 *    (vert a l'objectif ou au-dessus, rouge en dessous).
 * Le menu ouvre ce conteneur (App.ecranReel) ; la liste garde ses identifiants et ses tests.
 */
Ext.define('testextjs.view.Dashboard.MargeOnglets', {
    extend: 'Ext.panel.Panel',
    xtype: 'margeonglets',
    requires: ['testextjs.view.Dashboard.MargeManager', 'testextjs.view.commun.RaccourcisPeriode'],
    layout: 'card',
    border: false,
    header: false,
    cls: 'cec-hub mg-hub',
    config: {
        nameintern: '',
        titre: '',
        odatasource: ''
    },

    ONGLETS: [{cle: 'liste', texte: 'Liste', aide: 'Marge par produit vendu'},
        {cle: 'analyse', texte: 'Analyse', aide: 'Taux de marque et taux de marge, comparaisons, objectifs'}],

    initComponent: function () {
        var me = this;
        me.liste = Ext.create('testextjs.view.Dashboard.MargeManager', {header: false});
        me.habiller(me.liste);
        me.analyse = me.creerAnalyse();
        Ext.apply(me, {
            items: [me.liste, me.analyse],
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', itemId: 'ongletsMg', cls: 'cec-onglets', layout: {type: 'hbox', pack: 'start', align: 'middle'},
                    items: Ext.Array.map(me.ONGLETS, function (o) {
                        return {xtype: 'button', itemId: 'mg-' + o.cle, text: o.texte, cls: 'cec-onglet', toggleGroup: 'mg-onglets-' + me.id,
                            allowDepress: false, pressed: o.cle === 'liste', tooltip: o.aide, handler: function () {
                                me.afficher(o.cle);
                            }};
                    })
                }]
        });
        me.callParent(arguments);
    },

    habiller: function (ecran) {
        var A = window.PrestigeAffichage;
        if (A && (A.THEME_PARTOUT || Ext.Array.some(A.ECRANS_STYLE_VENTE || [], function (x) {
            return ecran.isXType(x);
        }))) {
            A.habillerStyleVente(ecran);
        }
    },

    afficher: function (cle) {
        var me = this;
        Ext.each(me.ONGLETS, function (x) {
            var b = me.down('#mg-' + x.cle);
            if (b && b.pressed !== (x.cle === cle)) {
                b.toggle(x.cle === cle, true);
            }
        });
        if (cle === 'analyse') {
            me.getLayout().setActiveItem(me.analyse);
            me.chargerAnalyse();
            return me.analyse;
        }
        me.getLayout().setActiveItem(me.liste);
        return me.liste;
    },

    creerAnalyse: function () {
        var me = this, aujourdhui = new Date();
        return Ext.create('Ext.panel.Panel', {
            itemId: 'analyseMarges', autoScroll: true, bodyPadding: 12, cls: 'sp-analyse',
            dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                        {xtype: 'datefield', itemId: 'mgDebut', fieldLabel: 'Du', labelWidth: 22, width: 135, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: Ext.Date.getFirstDateOfMonth(aujourdhui), maxValue: aujourdhui},
                        {xtype: 'datefield', itemId: 'mgFin', fieldLabel: 'au', labelWidth: 20, width: 133, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: aujourdhui, maxValue: aujourdhui, plugins: [{ptype: 'raccourcisperiode', debut: 'mgDebut', declencher: 'mgActualiser'}]},
                        {text: 'Actualiser', itemId: 'mgActualiser', iconCls: 'refresh', tooltip: 'Recalculer l\'analyse', handler: function () {
                                me.chargerAnalyse();
                            }},
                        /* plan du 19/11, point 13 : Excel et impression de l'analyse (memes chiffres que l'ecran) */
                        {text: 'Excel', itemId: 'mgExcel', iconCls: 'excel', disabled: true, tooltip: 'Exporter l\'analyse en Excel', handler: function (b) {
                                me.excelAnalyse(b);
                            }},
                        {text: 'Imprimer', itemId: 'mgImprimer', iconCls: 'printable', disabled: true, tooltip: 'Imprimer l\'analyse', handler: function () {
                                me.imprimerAnalyse();
                            }},
                        '->',
                        {xtype: 'numberfield', itemId: 'mgObjMarque', fieldLabel: 'Objectif taux de marque ≥', labelSeparator: '', labelWidth: 160, width: 215,
                            labelStyle: 'white-space:nowrap', minValue: 0.01, maxValue: 99.99, decimalPrecision: 2, decimalSeparator: ',', hideTrigger: true},
                        {xtype: 'tbtext', text: '%'},
                        {xtype: 'numberfield', itemId: 'mgObjMarge', fieldLabel: 'taux de marge ≥', labelSeparator: '', labelWidth: 100, width: 155,
                            labelStyle: 'white-space:nowrap', minValue: 0.01, maxValue: 1000, decimalPrecision: 2, decimalSeparator: ',', hideTrigger: true},
                        {xtype: 'tbtext', text: '%'},
                        {xtype: 'button', itemId: 'mgObjEnregistrer', text: 'Enregistrer les objectifs', handler: function (b) {
                                me.enregistrerObjectifs(b);
                            }}]}],
            items: [{xtype: 'component', itemId: 'mgContenu', html: '<div style="color:#7f8c8d">Chargement…</div>'}]
        });
    },

    chargerAnalyse: function () {
        var me = this, a = me.analyse, contenu = a.down('#mgContenu');
        var debut = a.down('#mgDebut').getSubmitValue(), fin = a.down('#mgFin').getSubmitValue();
        if (debut && fin && debut > fin) {
            contenu.update('<span style="color:#b42318">La date de début doit précéder la date de fin.</span>');
            return;
        }
        a.setLoading('Calcul…');
        me.donnees = null;
        /* plan du 19/11, point 13 : la periode d'abord (affichee aussitot), puis les six mois d'historique ; une
           reponse d'un calcul precedent (dates changees entre-temps) est ignoree */
        var jeton = me.jetonAnalyse = (me.jetonAnalyse || 0) + 1;
        me.boutonsAnalyse(false);
        Ext.Ajax.request({url: '../api/v1/datareporting/marges/analyse', method: 'GET', params: {dtStart: debut, dtEnd: fin, partie: 'periode'}, timeout: 180000,
            success: function (r) {
                if (a.isDestroyed || jeton !== me.jetonAnalyse) {
                    return;
                }
                a.setLoading(false);
                var o = Ext.decode(r.responseText, true) || {};
                if (!o.success) {
                    contenu.update('<span style="color:#b42318">' + Ext.String.htmlEncode(o.msg || 'Analyse indisponible') + '</span>');
                    return;
                }
                me.donnees = o;
                me.remplirObjectifs(o.objectifs);
                contenu.update(me.htmlAnalyse(o));
                me.chargerHistorique(debut, fin, jeton);
            },
            failure: function (r) {
                if (!a.isDestroyed) {
                    a.setLoading(false);
                    contenu.update('<span style="color:#b42318">Le serveur n\'a pas répondu (' + r.status + ').</span>');
                }
            }});
    },

    chargerHistorique: function (debut, fin, jeton) {
        var me = this, a = me.analyse, contenu = a.down('#mgContenu');
        Ext.Ajax.request({url: '../api/v1/datareporting/marges/analyse', method: 'GET', params: {dtStart: debut, dtEnd: fin, partie: 'historique'}, timeout: 180000,
            success: function (r) {
                if (a.isDestroyed || jeton !== me.jetonAnalyse || !me.donnees) {
                    return;
                }
                var h = Ext.decode(r.responseText, true) || {};
                if (!h.success) {
                    me.donnees.erreurHistorique = true;
                } else {
                    Ext.apply(me.donnees, {moyenne3: h.moyenne3, moyenne6: h.moyenne6, mois: h.mois, historique: true});
                    me.boutonsAnalyse(true);
                }
                contenu.update(me.htmlAnalyse(me.donnees));
            },
            failure: function () {
                if (!a.isDestroyed && jeton === me.jetonAnalyse && me.donnees) {
                    me.donnees.erreurHistorique = true;
                    contenu.update(me.htmlAnalyse(me.donnees));
                }
            }});
    },

    boutonsAnalyse: function (actifs) {
        var a = this.analyse;
        Ext.each(['#mgExcel', '#mgImprimer'], function (id) {
            var b = a.down(id);
            if (b && !b.prestigeConfirmation) {
                b.setDisabled(!actifs);
            }
        });
    },

    excelAnalyse: function (b) {
        var a = this.analyse, d = this.donnees || {};
        PrestigeChargement.telecharger(b, '../api/v1/datareporting/marges/analyse/excel?dtStart=' + encodeURIComponent(d.debut || a.down('#mgDebut').getSubmitValue())
                + '&dtEnd=' + encodeURIComponent(d.fin || a.down('#mgFin').getSubmitValue()), 'Excel', 'analyse_marges_' + d.debut + '_' + d.fin + '.xlsx');
    },

    /* impression par le navigateur, dans un cadre invisible (pas de fenetre) : le contenu de l'ecran */
    imprimerAnalyse: function () {
        var me = this, d = me.donnees;
        if (!d) {
            return;
        }
        var fr = function (s) {
            return s ? s.split('-').reverse().join('/') : '';
        };
        var html = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Analyse des marges</title>'
                + '<style>body{font:11px Arial,sans-serif;margin:10mm}h3{margin:0 0 4px}p{margin:0 0 8px;color:#444}'
                + '.pml-tuiles{display:flex;gap:8px;margin-bottom:6px}.pml-tuile{border:1px solid #999;padding:4px 8px;flex:1}'
                + '.pml-tuile-valeur{font-size:15px;font-weight:bold}.ac-bloc-t{font-weight:bold;margin:10px 0 4px}'
                + 'table{border-collapse:collapse;width:100%}th,td{border:1px solid #999;padding:2px 5px;text-align:left}td.n,th.n{text-align:right}'
                + 'th{background:#eee}tr{page-break-inside:avoid}.mg-ecart{color:#555;font-weight:normal}</style></head><body>'
                + '<h3>ANALYSE DES MARGES</h3><p>Période du ' + fr(d.debut) + ' au ' + fr(d.fin) + ' · imprimé le ' + Ext.Date.format(new Date(), 'd/m/Y H:i') + '</p>'
                + '<div class="mg-impression">' + me.htmlAnalyse(d) + '</div></body></html>';
        var ancien = document.getElementById('mg-impression-analyse');
        if (ancien) {
            ancien.parentNode.removeChild(ancien);
        }
        var f = document.createElement('iframe');
        f.id = 'mg-impression-analyse';
        f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
        document.body.appendChild(f);
        var doc = f.contentWindow.document;
        doc.open();
        doc.write(html);
        doc.close();
        setTimeout(function () {
            f.contentWindow.focus();
            f.contentWindow.print();
        }, 100);
    },

    remplirObjectifs: function (obj) {
        var a = this.analyse;
        Ext.each([['#mgObjMarque', 'tauxMarque'], ['#mgObjMarge', 'tauxMarge']], function (x) {
            var c = a.down(x[0]);
            if (c && !c.hasFocus && !c.isDirty()) {
                c.setValue(obj[x[1]]);
                c.resetOriginalValue();
            }
        });
    },

    enregistrerObjectifs: function (b) {
        var me = this, a = me.analyse, marque = a.down('#mgObjMarque'), marge = a.down('#mgObjMarge');
        var fin = PrestigeChargement.occuper(b, 'Enregistrement');
        if (marque.getValue() === null || marge.getValue() === null || !marque.isValid() || !marge.isValid()) {
            fin('Objectifs invalides', false);
            return;
        }
        Ext.Ajax.request({url: '../api/v1/datareporting/marges/analyse/objectifs', method: 'POST', jsonData: {tauxMarque: marque.getValue(), tauxMarge: marge.getValue()},
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (!o.success) {
                    fin(o.msg || 'Refusé', false);
                    return;
                }
                fin('Objectifs enregistrés', true);
                marque.resetOriginalValue();
                marge.resetOriginalValue();
                if (me.donnees) {
                    me.donnees.objectifs = o.objectifs;
                    a.down('#mgContenu').update(me.htmlAnalyse(me.donnees));
                }
            },
            failure: function (r) {
                fin('Le serveur n\'a pas répondu (' + r.status + ')', false);
            }});
    },

    MOIS: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],

    htmlAnalyse: function (o) {
        var me = this, enc = Ext.String.htmlEncode, c = o.courante || {}, obj = o.objectifs || {};
        var entier = function (v) {
            return String(Math.round(v || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
        }, pct = function (v) {
            return String(v || 0).replace('.', ',') + ' %';
        };
        /* vert a l'objectif ou au-dessus, rouge en dessous */
        var etat = function (v, objectif) {
            return v >= objectif ? 'mg-ok' : 'mg-ko';
        };
        var couleur = function (v, objectif) {
            return v >= objectif ? 'color:#1e8449;font-weight:bold' : 'color:#c0392b;font-weight:bold';
        };
        var ecart = function (v, ref) {
            var e = Math.round((v - ref) * 100) / 100;
            return (e > 0 ? '+' : '') + String(e).replace('.', ',') + ' pt';
        };
        var tuile = function (cls, titre, valeur, detail, aide) {
            return '<div class="pml-tuile ' + cls + '" data-qtip="' + enc(aide) + '"><div class="pml-tuile-valeur">' + valeur + '</div>'
                    + '<div class="pml-tuile-titre">' + titre + '</div><div class="pml-tuile-detail">' + detail + '</div></div>';
        };
        var html = '<div class="pml-tuiles mg-tuiles">'
                + tuile((c.tauxMarque >= obj.tauxMarque ? 'ok ' : 'critique ') + etat(c.tauxMarque, obj.tauxMarque), 'Taux de marque', pct(c.tauxMarque),
                        'objectif ≥ ' + pct(obj.tauxMarque) + ' · marge ÷ CA HT', 'Marge ÷ chiffre d\'affaires hors taxes')
                + tuile((c.tauxMarge >= obj.tauxMarge ? 'ok ' : 'critique ') + etat(c.tauxMarge, obj.tauxMarge), 'Taux de marge', pct(c.tauxMarge),
                        'objectif ≥ ' + pct(obj.tauxMarge) + ' · marge ÷ prix d\'achat', 'Marge ÷ valeur d\'achat des produits vendus')
                + tuile('info', 'Marge brute', entier(c.marge) + ' F', 'CA HT ' + entier(c.ht) + ' F', 'CA HT − valeur d\'achat')
                + tuile('', 'Valeur d\'achat', entier(c.achat) + ' F', 'CA TTC ' + entier(c.ttc) + ' F', 'Prix d\'achat × quantités vendues')
                + '</div>';
        var tableau = function (titre, cls, entete, lignes, colonnes, vide) {
            return '<div class="ac-bloc-t" style="margin-top:14px">' + titre + '</div><table class="ac-table ' + cls + '"><tr>' + entete + '</tr>'
                    + (lignes || '<tr><td colspan="' + colonnes + '" style="color:#7f8c8d">' + vide + '</td></tr>') + '</table>';
        };
        var ligne = function (cls, libelle, p, avecEcart) {
            return '<tr class="' + cls + '"><td>' + libelle + '</td><td class="n">' + entier(p.ht) + '</td><td class="n">' + entier(p.achat) + '</td><td class="n">'
                    + entier(p.marge) + '</td><td class="n" style="' + couleur(p.tauxMarque, obj.tauxMarque) + '">' + pct(p.tauxMarque)
                    + (avecEcart ? ' <span class="mg-ecart">(' + ecart(c.tauxMarque, p.tauxMarque) + ')</span>' : '') + '</td><td class="n" style="'
                    + couleur(p.tauxMarge, obj.tauxMarge) + '">' + pct(p.tauxMarge) + (avecEcart ? ' <span class="mg-ecart">(' + ecart(c.tauxMarge, p.tauxMarge) + ')</span>' : '')
                    + '</td></tr>';
        };
        var fr = function (s) {
            return s ? s.split('-').reverse().join('/') : '';
        };
        /* plan du 19/11, point 13 : l'historique arrive apres la periode */
        var attente = function (cls, libelle) {
            return '<tr class="' + cls + ' mg-attente"><td>' + libelle + '</td><td colspan="5" style="color:#7f8c8d">'
                    + (o.erreurHistorique ? 'Historique indisponible (Actualiser pour réessayer)' : 'Chargement de l\'historique…') + '</td></tr>';
        };
        var l = ligne('mg-comp mg-courante', '<b>Période choisie</b> (' + fr(c.debut) + ' – ' + fr(c.fin) + ')', c, false)
                + ligne('mg-comp mg-precedente', 'Période précédente (' + fr(o.precedente.debut) + ' – ' + fr(o.precedente.fin) + ')', o.precedente, true)
                + (o.moyenne3 ? ligne('mg-comp mg-moy3', 'Moyenne mensuelle des 3 derniers mois', o.moyenne3, true)
                        + ligne('mg-comp mg-moy6', 'Moyenne mensuelle des 6 derniers mois', o.moyenne6, true)
                        : attente('mg-comp mg-moy3', 'Moyenne mensuelle des 3 derniers mois') + attente('mg-comp mg-moy6', 'Moyenne mensuelle des 6 derniers mois'));
        var entete = '<th>Période</th><th class="n">CA HT</th><th class="n">Achat</th><th class="n">Marge</th><th class="n">Taux de marque</th><th class="n">Taux de marge</th>';
        html += tableau('Comparaisons (entre parenthèses : écart de la période choisie, en points)', 'mg-comparaisons', entete, l, 6, '');
        l = '';
        Ext.each(o.mois || [], function (m) {
            var p = String(m.mois).split('-');
            l += ligne('mg-mois', me.MOIS[parseInt(p[1], 10) - 1] + ' ' + p[0] + (m.partiel ? ' <span class="mg-ecart">(en cours)</span>' : ''), m, false);
        });
        html += tableau('Six derniers mois (vert à l\'objectif ou au-dessus, rouge en dessous)', 'mg-par-mois', entete.replace('Période', 'Mois'), l, 6,
                o.erreurHistorique ? 'Historique indisponible.' : 'Chargement de l\'historique…');
        l = '';
        Ext.each(o.familles || [], function (f) {
            l += ligne('mg-famille', enc(f.libelle), f, false);
        });
        html += tableau('Familles qui dégagent le plus de marge (15 premières)', 'mg-par-famille', entete.replace('Période', 'Famille'), l, 6, 'Aucune vente sur la période.');
        /* plan du 19/11, point 13 : produits qui apportent le plus de marge */
        l = '';
        Ext.each(o.produits || [], function (p) {
            l += '<tr class="mg-produit"><td>' + enc(p.libelle) + (p.cip ? ' <span class="mg-ecart">(' + enc(p.cip) + ')</span>' : '') + '</td><td class="n">' + entier(p.quantite)
                    + '</td><td class="n">' + entier(p.ht) + '</td><td class="n">' + entier(p.achat) + '</td><td class="n"><b>' + entier(p.marge) + '</b></td><td class="n" style="'
                    + couleur(p.tauxMarque, obj.tauxMarque) + '">' + pct(p.tauxMarque) + '</td><td class="n" style="' + couleur(p.tauxMarge, obj.tauxMarge) + '">'
                    + pct(p.tauxMarge) + '</td></tr>';
        });
        html += tableau('Produits qui apportent le plus de marge (' + (o.produits || []).length + ' premiers sur ' + entier(o.nombreProduits) + ' vendus)', 'mg-par-produit',
                '<th>Produit</th><th class="n">Qté</th><th class="n">CA HT</th><th class="n">Achat</th><th class="n">Marge</th><th class="n">Taux de marque</th><th class="n">Taux de marge</th>',
                l, 7, 'Aucune vente sur la période.');
        return html;
    }
});
