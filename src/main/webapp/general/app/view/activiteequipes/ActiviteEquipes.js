/* global Ext */

/*
 * Menu « Activité des équipes » (ANALYSE DE GESTION), demande du 13/10 : tout ce que fait chaque employé.
 *  - Données & recherches : journal des actions de la période (ventes, préventes, annulations, modifications, BL,
 *    commandes, ajustements, inventaires, retours, connexions), pastilles par type qui filtrent, recherche,
 *    pagination, export CSV ;
 *  - Analyses : productivité et aide à la décision (graphiques).
 * Barre commune : période (raccourcis), employé, Actualiser. Lectures seules : ../api/v1/activite-equipes/...
 */
Ext.define('testextjs.view.activiteequipes.ActiviteEquipes', {
    extend: 'Ext.panel.Panel',
    xtype: 'activiteequipes',
    requires: ['testextjs.view.commun.RaccourcisPeriode', 'Ext.chart.*'],
    layout: 'card',
    border: false,
    header: false,
    cls: 'cec-hub ae-hub',
    config: {
        nameintern: '',
        titre: '',
        odatasource: ''
    },

    ONGLETS: [{cle: 'donnees', texte: 'Données & recherches', aide: 'Journal de tout ce que fait chaque employé, filtres et recherche'},
        {cle: 'analyses', texte: 'Analyses', aide: 'Productivité, affluence, saisie des BL, actions sensibles et aide à la décision'},
        {cle: 'anomalies', texte: 'Anomalies', aide: 'Par employé : refus affichés, opérations à risque, erreurs du logiciel ; et ce qu\'il a fait juste avant'}],

    /* couleur de chaque type d'action (pastilles, colonne Action, graphiques) */
    COULEURS: {VENTE: '#1b7f3b', VENDEUR: '#2563eb', ANNULATION: '#c62828', MODIFICATION: '#e67e22', BL: '#7c3aed',
        COMMANDE: '#0891b2', AJUSTEMENT: '#b45309', INVENTAIRE: '#475569', RETOUR: '#be185d', CONNEXION: '#64748b'},

    statics: {
        /* infobulle des graphiques : taille du contenu, reste affichee tant que le curseur est sur la serie
           (meme reglage que le Pilotage, retour de l'officine du 19/09 sur les infobulles tronquees) */
        infobulle: function (rendu) {
            var AE = this;
            return {trackMouse: true, dismissDelay: 0, hideDelay: 400, minWidth: 200, maxWidth: 560, autoHeight: true,
                width: undefined, height: undefined, cls: 'ae-infobulle', bodyStyle: 'white-space:normal;line-height:16px;padding:6px 8px;',
                renderer: function (record, item) {
                    var html = rendu(record, item);
                    this.setTitle(html);
                    /* retour du 24/10 : la bulle restait a 200 px et coupait les lignes (« … ») ; elle prend la
                       largeur de sa plus longue ligne */
                    this.setWidth(AE.largeurTexte(html));
                }};
        },
        /* largeur d'un texte HTML a plusieurs lignes (<br>), mesuree dans la police des infobulles */
        largeurTexte: function (html) {
            var d = document.createElement('div'), w;
            d.style.cssText = 'position:absolute;left:-9999px;top:-9999px;visibility:hidden;white-space:nowrap;'
                    + 'font:bold 13px helvetica,arial,verdana,sans-serif;';
            d.innerHTML = String(html).replace(/<br\s*\/?>/gi, '<div></div>').replace(/<div><\/div>/g, '<br>');
            document.body.appendChild(d);
            w = d.offsetWidth;
            document.body.removeChild(d);
            return Math.min(560, Math.max(200, w + 34));
        },
        duree: function (s) {
            s = Math.round(s || 0);
            if (s < 60) {
                return s + ' s';
            }
            var h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
            return h ? h + ' h ' + (m < 10 ? '0' : '') + m : m + ' min ' + (r < 10 ? '0' : '') + r + ' s';
        },
        /* 16 530 et 151,6 : ecrit a la main, les separateurs d'Ext dependent de la locale chargee */
        nombre: function (v, dec) {
            var x = (Number(v) || 0).toFixed(dec ? 1 : 0).split('.');
            return x[0].replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + (x[1] && x[1] !== '0' ? ',' + x[1] : '');
        },
        /* plan avoir du 08/11, point 1 : textes du resume (data.resume des analyses), les memes dans les titres des
           cartes du menu, dans la fenetre et sur la carte du tableau de bord */
        resumeTextes: function (r) {
            var N = this.nombre;
            r = r || {};
            return {
                longues: N(r.ventesLongues),
                sensibles: N(r.actionsSensibles),
                sensiblesDetail: N(r.annulations) + ' annulation' + (r.annulations > 1 ? 's' : '') + ', ' + N(r.modifications)
                        + ' modification' + (r.modifications > 1 ? 's' : ''),
                delaiBl: r.delaiMoyenBl === null || r.delaiMoyenBl === undefined ? '\u2014' : N(r.delaiMoyenBl, true) + ' j',
                delaiBlDetail: N(r.blMesures) + ' BL dat\u00e9' + (r.blMesures > 1 ? 's' : ''),
                rapide: r.plusRapideNom ? r.plusRapideNom : '\u2014',
                rapideDetail: r.plusRapideNom ? N(r.plusRapideSecondesParLigne, true) + ' s par ligne, ' + N(r.plusRapideVentes) + ' ventes'
                        : 'aucun op\u00e9rateur avec 5 ventes ou plus'
            };
        },
        /* bandeau des reperes : 4 chiffres et le repere d'alerte (menu, fenetre et carte du tableau de bord) */
        htmlResume: function (r) {
            var e = Ext.String.htmlEncode, T = this.resumeTextes(r);
            r = r || {};
            var tuile = function (code, libelle, valeur, detail, mauvais) {
                return '<div class="ae-rep' + (mauvais ? ' ae-rep-mal' : '') + '" data-rep="' + code + '"><div class="l">' + e(libelle) + '</div>'
                        + '<div class="v">' + e(valeur) + '</div><div class="d">' + e(detail) + '</div></div>';
            };
            var alerte = r.alertes > 0
                    ? '<div class="ae-rep-alerte mal" data-alertes="' + r.alertes + '">\u26a0 ' + r.alertes + ' alerte' + (r.alertes > 1 ? 's' : '') + ' : '
                    + e(r.premiereAlerte || '') + '</div>'
                    : '<div class="ae-rep-alerte bon" data-alertes="0">\u2713 Aucune alerte</div>';
            return '<div class="ae-reps">' + tuile('LONGUES', r.seuilLibelle || 'Ventes de plus de 10 min', T.longues, 'vente laiss\u00e9e ouverte', r.ventesLongues > 0)
                    + tuile('SENSIBLES', 'Actions sensibles', T.sensibles, T.sensiblesDetail, r.actionsSensibles > 0)
                    + tuile('DELAI_BL', 'D\u00e9lai moyen de saisie des BL', T.delaiBl, T.delaiBlDetail, r.delaiMoyenBl >= 2)
                    + tuile('RAPIDE', 'Op\u00e9rateur le plus rapide', T.rapide, T.rapideDetail, false) + '</div>' + alerte;
        },
        styles: function () {
            if (Ext.get('activite-equipes-styles')) {
                return;
            }
            Ext.util.CSS.createStyleSheet(
                    '.ae-pastilles{display:flex;flex-wrap:wrap;gap:6px;padding:8px 10px 2px}'
                    + '.ae-pastille{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:14px;border:1px solid #d0d7e2;'
                    + 'background:#fff;cursor:pointer;font-size:12px;transition:transform .15s,box-shadow .15s,background .15s;animation:ae-entree .35s ease both}'
                    + '.ae-pastille:hover{transform:translateY(-1px);box-shadow:0 2px 6px rgba(15,23,42,.15)}'
                    + '.ae-pastille b{font-variant-numeric:tabular-nums}'
                    + '.ae-pastille i{width:9px;height:9px;border-radius:50%;display:inline-block}'
                    + '.ae-pastille.ae-active{color:#fff;border-color:transparent}'
                    + '.ae-pastille.ae-vide{opacity:.45}'
                    + '.ae-type{display:inline-block;padding:1px 8px;border-radius:10px;color:#fff;font-size:11px;white-space:nowrap}'
                    + '@keyframes ae-entree{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}'
                    + '.ae-tuiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(175px,1fr));gap:10px;margin-bottom:12px}'
                    + '.ae-tuile{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;box-shadow:0 1px 2px rgba(15,23,42,.06);'
                    + 'animation:ae-entree .4s ease both;transition:transform .15s,box-shadow .15s}'
                    + '.ae-tuile:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(15,23,42,.12)}'
                    + '.ae-tuile .l{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.3px}'
                    + '.ae-tuile .v{font-size:22px;font-weight:700;color:#0f172a;margin-top:2px;font-variant-numeric:tabular-nums}'
                    + '.ae-tuile .e{font-size:12px;margin-top:2px}.ae-tuile .e.bon{color:#1b7f3b}.ae-tuile .e.mal{color:#c62828}.ae-tuile .e.neutre{color:#94a3b8}'
                    + '.ae-constats{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:10px;margin-bottom:14px}'
                    + '.ae-constat{border-radius:10px;padding:10px 12px 10px 14px;border-left:5px solid;background:#fff;box-shadow:0 1px 2px rgba(15,23,42,.06);'
                    + 'animation:ae-entree .45s ease both}'
                    + '.ae-constat b{display:block;margin-bottom:3px}.ae-constat.ALERTE{border-color:#c62828;background:#fef2f2}'
                    + '.ae-constat.CONSEIL{border-color:#e67e22;background:#fff7ed}.ae-constat.INFO{border-color:#1e3a5f;background:#f1f5f9}'
                    + '.ae-titre-bloc{font-weight:700;color:#1e3a5f;margin:4px 0 8px;font-size:13px}'
                    + '.ae-carte{border-collapse:separate;border-spacing:2px;width:100%;font-size:11px}'
                    + '.ae-carte td{height:22px;text-align:center;border-radius:3px;color:#0f172a;transition:transform .12s}'
                    + '.ae-carte td.c:hover{transform:scale(1.15);box-shadow:0 0 0 2px #1e3a5f inset}'
                    + '.ae-carte th{font-weight:600;color:#64748b;padding:0 2px}'
                    + '.ae-vide{color:#94a3b8;padding:30px;text-align:center}'
                    /* retour du 24/10 : infobulles jamais coupees */
                    + '.ae-infobulle .x-tip-header-text,.ae-infobulle .x-title-text,.ae-infobulle .x-header-text{white-space:normal!important;'
                    + 'overflow:visible!important;text-overflow:clip!important}'
                    /* retour du 24/10 : cartes des graphiques - un seul cadre arrondi, en-tete clair, aide a droite */
                    + '.ae-graphe{border:1px solid #e2e8f0!important;border-radius:12px;box-shadow:0 1px 3px rgba(15,23,42,.08);overflow:hidden;background:#fff}'
                    + '.ae-graphe>.x-panel-header{background:#fff!important;border:0!important;border-bottom:1px solid #eef2f7!important;padding:10px 14px!important;'
                    + 'background-image:none!important;box-shadow:none!important}'
                    + '.ae-graphe>.x-panel-header .x-header-text,.ae-graphe>.x-panel-header .x-title-text{color:#1e3a5f!important;font-size:13px!important;font-weight:700!important}'
                    + '.ae-graphe>.x-panel-body{border:0!important;background:#fff!important}'
                    + '.ae-graphe .x-toolbar.ae-seuil{background:#f8fafc;border:0;border-bottom:1px solid #eef2f7;padding:4px 12px}'
                    /* plan avoir du 08/11, point 1 : reperes (menu, fenetre, carte du tableau de bord) */
                    + '.ae-reps{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;margin-bottom:8px}'
                    /* retour du 04/11 : pas de filet de couleur ; etat par une pastille (tuiles C) et un fond doux (messages A) */
                    + '.ae-rep{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:7px 10px;min-width:0}'
                    + '.ae-rep .l::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:#1b7f3b;margin-right:6px;vertical-align:middle}'
                    + '.ae-rep.ae-rep-mal{background:#fdf2f2;border-color:#f5c6c6}'
                    + '.ae-rep.ae-rep-mal .l::before{background:#c62828}'
                    + '.ae-rep .l{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.3px;white-space:normal}'
                    + '.ae-rep .v{font-size:18px;font-weight:700;color:#0f172a;font-variant-numeric:tabular-nums;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
                    + '.ae-rep .d{font-size:11px;color:#64748b;white-space:normal}'
                    + '.ae-rep-alerte{border-radius:8px;padding:6px 10px;font-size:12px;font-weight:600;margin-bottom:12px}'
                    + '.ae-rep-alerte.mal{background:#fef2f2;color:#b91c1c}.ae-rep-alerte.bon{background:#f0fdf4;color:#15803d}',
                    'activite-equipes-styles');
        }
    },

    initComponent: function () {
        var me = this, aujourdhui = new Date();
        testextjs.view.activiteequipes.ActiviteEquipes.styles();
        me.typeActif = '';
        me.employes = Ext.create('Ext.data.Store', {
            fields: ['id', 'nom', 'actif'],
            proxy: {type: 'ajax', url: '../api/v1/activite-equipes/employes', reader: {type: 'json', root: 'data'}},
            autoLoad: true,
            listeners: {
                /* premier choix de la liste : revenir a tous les employes (vider le champ ne suffisait pas) */
                load: function (st) {
                    st.insert(0, {id: '', nom: 'Tous les employés', actif: true});
                }
            }
        });
        /* plan avoir du 08/11, point 1 : fenetre de consultation du tableau de bord = le meme composant, onglet Analyses
           seul, periode du jour de reference et boutons Hier, 3 jours, 1 semaine */
        if (me.modeFenetre) {
            aujourdhui = me.dateReference || aujourdhui;
            me.analyses = me.creerAnalyses();
            Ext.apply(me, {
                items: [me.analyses],
                dockedItems: [{
                        xtype: 'toolbar', dock: 'top', itemId: 'aeFiltres', items: me.boutonsPeriode().concat([
                            {xtype: 'tbseparator'},
                            {xtype: 'datefield', itemId: 'aeDebut', fieldLabel: 'Du', labelWidth: 22, width: 135, format: 'd/m/Y', submitFormat: 'Y-m-d',
                                value: aujourdhui, maxValue: aujourdhui, listeners: {change: me.dateChangee, scope: me}},
                            {xtype: 'datefield', itemId: 'aeFin', fieldLabel: 'au', labelWidth: 20, width: 133, format: 'd/m/Y', submitFormat: 'Y-m-d',
                                value: aujourdhui, maxValue: aujourdhui, listeners: {select: function () {
                                        me.marquerBoutonPeriode(null);
                                    }, change: me.dateChangee, scope: me}},
                            me.choixEmploye(),
                            me.choixGardePeriode(),
                            {text: 'Actualiser', itemId: 'aeActualiser', iconCls: 'refresh', tooltip: 'Relire la période', handler: function () {
                                    me.marquerBoutonPeriode(null);
                                    me.actualiser();
                                }}])
                    }]
            });
            me.callParent(arguments);
            me.on('afterrender', me.actualiser, me, {single: true});
            return;
        }
        me.donnees = me.creerDonnees();
        me.analyses = me.creerAnalyses();
        me.anomaliesPanel = me.creerAnomalies();
        Ext.apply(me, {
            items: [me.donnees, me.analyses, me.anomaliesPanel],
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', itemId: 'ongletsAe', cls: 'cec-onglets', layout: {type: 'hbox', pack: 'start', align: 'middle'},
                    items: Ext.Array.map(me.ONGLETS, function (o) {
                        /* plan du 08/11, point 15.6 : l'onglet Anomalies reste cache tant que le droit n'est pas confirme */
                        return {xtype: 'button', itemId: 'ae-' + o.cle, text: o.texte, cls: 'cec-onglet', toggleGroup: 'ae-onglets-' + me.id,
                            hidden: o.cle === 'anomalies',
                            allowDepress: false, pressed: o.cle === 'donnees', tooltip: o.aide, handler: function () {
                                me.afficher(o.cle);
                            }};
                    })
                }, {
                    xtype: 'toolbar', dock: 'top', itemId: 'aeFiltres', items: [
                        {xtype: 'datefield', itemId: 'aeDebut', fieldLabel: 'Du', labelWidth: 22, width: 135, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: Ext.Date.getFirstDateOfMonth(aujourdhui), maxValue: aujourdhui, listeners: {change: me.dateChangee, scope: me}},
                        {xtype: 'datefield', itemId: 'aeFin', fieldLabel: 'au', labelWidth: 20, width: 133, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: aujourdhui, maxValue: aujourdhui, plugins: [{ptype: 'raccourcisperiode', debut: 'aeDebut', declencher: 'aeActualiser'}],
                            listeners: {change: me.dateChangee, scope: me}},
                        me.choixEmploye(),
                        me.choixGardePeriode(),
                        {text: 'Actualiser', itemId: 'aeActualiser', iconCls: 'refresh', tooltip: 'Relire la période', handler: function () {
                                me.actualiser();
                            }},
                        /* retour du 25/10 : remet la periode par defaut, tous les employes et une recherche vide */
                        {text: 'Vider les champs', itemId: 'aeVider', iconCls: 'fa fa-eraser', tooltip: 'Période du mois en cours, tous les employés, sans recherche',
                            handler: function () {
                                me.viderChamps();
                            }}
                    ]
                }]
        });
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.actualiser();
            me.lireDroits();
        }, me, {single: true});
    },

    /* liste « Employé » de la barre (menu et fenetre) */
    choixEmploye: function () {
        var me = this;
        return {xtype: 'combobox', itemId: 'aeEmploye', fieldLabel: 'Employé', labelWidth: 55, width: 270, store: me.employes,
            queryMode: 'local', displayField: 'nom', valueField: 'id', emptyText: 'Tous les employés', forceSelection: true,
            anyMatch: true, editable: true, typeAhead: true,
            tpl: Ext.create('Ext.XTemplate', '<tpl for="."><div class="x-boundlist-item">{nom:htmlEncode}'
                    + '<tpl if="!actif"> <span style="color:#94a3b8">(inactif)</span></tpl></div></tpl>'),
            listeners: {
                select: function () {
                    me.actualiser();
                }
            }};
    },

    /* plan avoir du 08/11, point 1 : boutons de la fenetre ; les periodes sont celles du selecteur commun
       (RaccourcisPeriode), calculees depuis le jour de reference */
    /* plan du 09/11, point 10 : « 1 mois » (30 derniers jours) apres « 1 semaine » */
    PERIODES_FENETRE: [['aeHier', 'Hier', 'Hier'], ['ae3Jours', '3 jours', '3 derniers jours'], ['aeSemaine', '1 semaine', '7 derniers jours'],
        ['aeMois', '1 mois', '30 derniers jours']],

    boutonsPeriode: function () {
        var me = this, toutes = testextjs.view.commun.RaccourcisPeriode.periodes();
        return Ext.Array.map(me.PERIODES_FENETRE, function (b) {
            var calcul = Ext.Array.findBy(toutes, function (p) {
                return p[0] === b[2];
            })[1];
            return {xtype: 'button', itemId: b[0], text: b[1], enableToggle: true, toggleGroup: 'ae-periode-' + me.id, allowDepress: false,
                cls: 'ordo-btn', margin: '0 4 0 0', tooltip: b[2], handler: function () {
                    var d = calcul(Ext.Date.clearTime(me.dateReference || new Date()));
                    me.quitterGarde();
                    me.down('#aeDebut').setValue(d[0]);
                    me.down('#aeFin').setValue(d[1]);
                    me.actualiser();
                }};
        });
    },

    marquerBoutonPeriode: function (itemId) {
        var me = this;
        Ext.each(me.PERIODES_FENETRE, function (b) {
            var x = me.down('#' + b[0]);
            if (x && x.pressed !== (b[0] === itemId)) {
                x.toggle(b[0] === itemId, true);
            }
        });
    },

    /* plan du 08/11, point 15.6 : onglet Anomalies montre seulement avec le droit P_ACTIVITE_ANOMALIES */
    lireDroits: function () {
        var me = this;
        Ext.Ajax.request({url: '../api/v1/activite-equipes/droits', method: 'GET',
            success: function (r) {
                var d = Ext.JSON.decode(r.responseText, true) || {}, b = me.isDestroyed ? null : me.down('#ae-anomalies');
                me.droitAnomalies = d.anomalies === true;
                if (b) {
                    b.setVisible(me.droitAnomalies);
                }
            }
        });
    },

    /* filtres communs, au format des routes */
    /* plan du 09/11, point 10 : selecteur de garde de la periode. La garde choisie fixe le debut et la fin a l'heure
       pres (ventes de la nuit ou du dimanche) ; un bouton de periode ou une date changee a la main la quitte. */
    choixGardePeriode: function () {
        var me = this;
        var gardes = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle', 'dateDebut', 'dateFin', {name: 'libelleComplet', convert: function (v, r) {
                        return r.get('libelle') + '  (' + r.get('dateDebut') + ' → ' + r.get('dateFin') + ')';
                    }}],
            autoLoad: true, proxy: {type: 'ajax', url: '../api/v1/gardes', reader: {type: 'json', root: 'data', totalProperty: 'total'}}
        });
        return {xtype: 'combobox', itemId: 'aeGardePeriode', fieldLabel: 'Garde', labelWidth: 40, width: 260, store: gardes, queryMode: 'local',
            editable: false, valueField: 'id', displayField: 'libelleComplet', emptyText: 'Suivre une garde…', matchFieldWidth: false,
            listConfig: {minWidth: 380}, tooltip: 'Limite les analyses aux heures de la garde choisie',
            listeners: {select: function (c, r) {
                    var g = r[0], de = Ext.Date.parse(g.get('dateDebut'), 'Y-m-d H:i:s'), a = Ext.Date.parse(g.get('dateFin'), 'Y-m-d H:i:s');
                    if (!de || !a) {
                        return;
                    }
                    me.gardeId = g.get('id');
                    me.gardeEnCours = true;
                    me.down('#aeDebut').setValue(Ext.Date.clearTime(de));
                    me.down('#aeFin').setValue(Ext.Date.clearTime(new Date(a.getTime() - 1000)));
                    me.gardeEnCours = false;
                    me.marquerBoutonPeriode(null);
                    me.actualiser();
                }}};
    },

    dateChangee: function () {
        if (!this.gardeEnCours) {
            this.quitterGarde();
        }
    },

    quitterGarde: function () {
        var me = this, c = me.down('#aeGardePeriode');
        me.gardeId = null;
        if (c && c.getValue()) {
            c.clearValue();
        }
    },

    viderChamps: function () {
        var me = this, aujourdhui = Ext.Date.clearTime(new Date());
        me.quitterGarde();
        me.down('#aeDebut').setValue(Ext.Date.getFirstDateOfMonth(aujourdhui));
        me.down('#aeFin').setValue(aujourdhui);
        me.down('#aeEmploye').clearValue();
        if (me.down('#aeRecherche')) {
            me.down('#aeRecherche').setValue('');
        }
        me.actualiser();
    },

    filtres: function () {
        var me = this, e = me.down('#aeEmploye').getValue();
        var f = {debut: me.down('#aeDebut').getSubmitValue(), fin: me.down('#aeFin').getSubmitValue(), employeId: e || ''};
        if (me.gardeId) {
            f.gardeId = me.gardeId;
        }
        return f;
    },

    creerDonnees: function () {
        var me = this;
        me.journal = Ext.create('Ext.data.Store', {
            fields: ['date', 'type', 'libelleType', 'employeId', 'employe', 'reference', {name: 'montant', type: 'int', useNull: true}, 'detail'],
            pageSize: 50,
            remoteSort: false,
            proxy: {type: 'ajax', url: '../api/v1/activite-equipes/journal', timeout: 180000,
                reader: {type: 'json', root: 'data', totalProperty: 'total'}},
            listeners: {
                beforeload: function (st) {
                    var f = me.filtres();
                    f.type = me.typeActif;
                    f.q = me.down('#aeRecherche') ? me.down('#aeRecherche').getValue() : '';
                    st.getProxy().extraParams = f;
                },
                load: function (st, recs, ok) {
                    var o = st.getProxy().getReader().rawData || {};
                    if (ok) {
                        me.dessinerPastilles(o.compteurs || []);
                        return;
                    }
                    /* retour du 24/10 : un echec ne doit pas effacer les pastilles (plus moyen de revenir sans quitter
                       le menu) ; on garde les dernieres et on rend le filtre */
                    me.typeActif = '';
                    me.dessinerPastilles(me.derniersCompteurs || []);
                    if (window.PrestigeToast) {
                        PrestigeToast.afficher(o.msg || 'Le journal n\'a pas pu être lu. Réessayez.', {niveau: 'alerte'});
                    }
                }
            }
        });
        return Ext.create('Ext.panel.Panel', {
            itemId: 'aeDonnees', layout: {type: 'vbox', align: 'stretch'},
            items: [{xtype: 'component', itemId: 'aePastilles', cls: 'ae-pastilles', html: '',
                    listeners: {
                        afterrender: function (c) {
                            c.getEl().on('click', function (ev, t) {
                                var p = Ext.fly(t).up('.ae-pastille', 3) || (Ext.fly(t).hasCls('ae-pastille') ? Ext.fly(t) : null);
                                if (p) {
                                    var type = p.getAttribute('data-type');
                                    me.typeActif = me.typeActif === type ? '' : type;
                                    me.journal.loadPage(1);
                                }
                            });
                        }
                    }},
                {xtype: 'gridpanel', itemId: 'aeJournal', flex: 1, store: me.journal, cls: 'ae-journal',
                    viewConfig: {emptyText: '<div style="padding:12px;color:#64748b">Aucune action sur la période et les filtres choisis.</div>', deferEmptyText: false},
                    columns: [
                        {header: 'Date', dataIndex: 'date', width: 125},
                        {header: 'Employé', dataIndex: 'employe', flex: 1, minWidth: 150, renderer: Ext.util.Format.htmlEncode},
                        {header: 'Action', dataIndex: 'libelleType', width: 175, renderer: function (v, m, r) {
                                return '<span class="ae-type" style="background:' + (me.COULEURS[r.get('type')] || '#64748b') + '">' + Ext.String.htmlEncode(v || '') + '</span>';
                            }},
                        {header: 'Référence', dataIndex: 'reference', width: 150, renderer: Ext.util.Format.htmlEncode},
                        {header: 'Montant', dataIndex: 'montant', width: 105, align: 'right', renderer: function (v) {
                                return v === null || v === undefined ? '' : Ext.util.Format.number(v, '0,000').replace(/,/g, ' ');
                            }},
                        {header: 'Détail', dataIndex: 'detail', flex: 2, minWidth: 200, renderer: function (v, m) {
                                var t = Ext.String.htmlEncode(v || '');
                                m.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(t) + '"';
                                return t;
                            }}
                    ],
                    dockedItems: [{xtype: 'toolbar', dock: 'top', items: [
                                {xtype: 'textfield', itemId: 'aeRecherche', emptyText: 'Rechercher une référence, un grossiste, un poste…', width: 330,
                                    enableKeyEvents: true, listeners: {
                                        specialkey: function (f, e) {
                                            if (e.getKey() === e.ENTER) {
                                                me.journal.loadPage(1);
                                            }
                                        }
                                    }},
                                {text: 'Rechercher', itemId: 'aeChercher', iconCls: 'searchicon', handler: function () {
                                        me.journal.loadPage(1);
                                    }},
                                '->',
                                {text: 'Export CSV', itemId: 'aeExport', iconCls: 'excel', tooltip: 'Le journal filtré, toutes pages', handler: function (b) {
                                        me.exporter(b);
                                    }}]},
                        {xtype: 'pagingtoolbar', dock: 'bottom', store: me.journal, displayInfo: true,
                            displayMsg: 'Actions {0} à {1} sur {2}', emptyMsg: 'Aucune action'}]
                }]
        });
    },

    dessinerPastilles: function (compteurs) {
        var me = this, c = me.down('#aePastilles');
        if (!c || !c.rendered) {
            return;
        }
        if (compteurs.length) {
            me.derniersCompteurs = compteurs;
        }
        var html = Ext.Array.map(compteurs, function (x, i) {
            var couleur = me.COULEURS[x.type] || '#64748b', actif = me.typeActif === x.type;
            return '<span class="ae-pastille' + (actif ? ' ae-active' : '') + (x.nombre ? '' : ' ae-vide') + '" data-type="' + x.type + '"'
                    + ' style="animation-delay:' + (i * 30) + 'ms' + (actif ? ';background:' + couleur : '') + '"'
                    + ' data-qtip="' + (actif ? 'Cliquer pour voir toutes les actions' : 'Cliquer pour ne voir que : ' + Ext.String.htmlEncode(x.libelle)) + '">'
                    + '<i style="background:' + (actif ? '#fff' : couleur) + '"></i>' + Ext.String.htmlEncode(x.libelle)
                    + ' <b>' + Ext.util.Format.number(x.nombre, '0,000').replace(/,/g, ' ') + '</b></span>';
        }).join('');
        c.update(html);
    },

    exporter: function (bouton) {
        var me = this, f = me.filtres();
        f.type = me.typeActif;
        f.q = me.down('#aeRecherche').getValue() || '';
        var url = '../api/v1/activite-equipes/journal/csv?' + Ext.Object.toQueryString(f);
        if (window.PrestigeChargement && PrestigeChargement.telecharger) {
            PrestigeChargement.telecharger(bouton, url, 'Export…');
        } else {
            window.open(url);
        }
    },

    actualiser: function () {
        var me = this, f = me.filtres();
        if (f.debut && f.fin && f.debut > f.fin) {
            if (window.PrestigeToast) {
                PrestigeToast.afficher('La date de début doit précéder la date de fin.', {niveau: 'alerte'});
            }
            return;
        }
        if (me.journal) {
            me.journal.loadPage(1);
        }
        if (me.getLayout().getActiveItem() === me.analyses) {
            me.chargerAnalyses();
        }
        if (me.getLayout().getActiveItem() === me.anomaliesPanel) {
            me.chargerAnomalies();
        }
    },

    afficher: function (cle) {
        var me = this;
        Ext.each(me.ONGLETS, function (x) {
            var b = me.down('#ae-' + x.cle);
            if (b && b.pressed !== (x.cle === cle)) {
                b.toggle(x.cle === cle, true);
            }
        });
        if (cle === 'analyses') {
            me.getLayout().setActiveItem(me.analyses);
            me.chargerAnalyses();
            return me.analyses;
        }
        if (cle === 'anomalies' && me.droitAnomalies) {
            me.getLayout().setActiveItem(me.anomaliesPanel);
            me.chargerAnomalies();
            return me.anomaliesPanel;
        }
        me.getLayout().setActiveItem(me.donnees);
        return me.donnees;
    },

    /* ------------------------------------------------------------------ ANALYSES */

    TACHES: ['VENTE', 'VENDEUR', 'BL', 'COMMANDE', 'AJUSTEMENT', 'INVENTAIRE', 'RETOUR', 'ANNULATION', 'MODIFICATION'],
    JOURS: ['', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],

    /* cadre d'un graphique : titre, aide au survol du « ? », hauteur fixe */
    cadre: function (itemId, titre, aide, contenu, largeur) {
        return {xtype: 'panel', itemId: itemId, title: titre, columnWidth: largeur || 0.5, height: 340, margin: '0 10 12 0', layout: 'fit',
            cls: 'ae-graphe', frame: false, bodyStyle: 'background:#fff', animCollapse: false,
            tools: [{type: 'help', tooltip: aide}], items: [contenu]};
    },

    creerAnalyses: function () {
        var me = this, AE = testextjs.view.activiteequipes.ActiviteEquipes, N = AE.nombre, D = AE.duree;
        me.st = {};
        Ext.each(['heures', 'jours', 'operateurs', 'longues', 'typesVente', 'grossistes', 'retard', 'sensibles', 'repartition'], function (k) {
            me.st[k] = Ext.create('Ext.data.Store', {fields: [{name: 'libelle'}, {name: 'id'}, {name: 'ventes', type: 'float'},
                    {name: 'saisieMoyenne', type: 'float'}, {name: 'saisieVentes', type: 'float'}, {name: 'saisieBl', type: 'float'},
                    {name: 'bl', type: 'float'}, {name: 'secondesParLigne', type: 'float'}, {name: 'ventesParJour', type: 'float'},
                    {name: 'lignesParVente', type: 'float'}, {name: 'panierMoyen', type: 'float'}, {name: 'chiffreAffaires', type: 'float'},
                    {name: 'ventesLongues', type: 'float'}, {name: 'jours', type: 'float'}, {name: 'lignesParBl', type: 'float'},
                    {name: 'ventesMesurees', type: 'float'},
                    {name: 'nombre', type: 'float'}, {name: 'annulations', type: 'float'}, {name: 'modifications', type: 'float'},
                    {name: 'remises', type: 'float'}, {name: 'tauxAnnulation', type: 'float'}, {name: 'total', type: 'float'}, {name: 'grossistes'}, {name: 'code'}]
                        .concat(Ext.Array.map(me.TACHES, function (t) {
                            return {name: t, type: 'float'};
                        })), data: []});
        });
        var couleur = function (c) {
            return function (sprite, record, attr) {
                return Ext.apply(attr, {fill: c});
            };
        };
        var axeCat = function (champ, pos, titre) {
            return {type: 'Category', position: pos || 'bottom', fields: [champ || 'libelle'], title: titre || false,
                label: {font: '11px Arial', rotate: pos === 'left' ? undefined : {degrees: 0}}};
        };
        var axeNum = function (champs, pos, titre, decimales) {
            return {type: 'Numeric', position: pos || 'left', fields: champs, minimum: 0, grid: pos !== 'right', title: titre || false,
                label: {font: '11px Arial', renderer: function (v) {
                        /* axe de comptage : pas de demi-unite arrondie (1, 1, 2, 2...) */
                        return decimales || v % 1 === 0 ? N(v, decimales) : '';
                    }}};
        };

        var heures = {xtype: 'chart', itemId: 'gHeures', animate: true, shadow: false, store: me.st.heures, legend: {position: 'bottom'},
            axes: [axeNum(['ventes'], 'left', 'Ventes'), axeNum(['saisieMoyenne'], 'right', 'Saisie (s)'), axeCat()],
            series: [{type: 'column', axis: 'left', xField: 'libelle', yField: 'ventes', title: 'Ventes', highlight: true, renderer: couleur('#2563eb'),
                    tips: AE.infobulle(function (r) {
                        return '<b>' + r.get('libelle') + '</b><br>' + N(r.get('ventes')) + ' ventes<br>Saisie moyenne : ' + D(r.get('saisieMoyenne'));
                    })},
                {type: 'line', axis: 'right', xField: 'libelle', yField: 'saisieMoyenne', title: 'Saisie moyenne (s)', smooth: true,
                    style: {stroke: '#ef6c00', 'stroke-width': 3}, markerConfig: {type: 'circle', radius: 4, fill: '#ef6c00', stroke: '#ef6c00'},
                    tips: AE.infobulle(function (r) {
                        return '<b>' + r.get('libelle') + '</b><br>Saisie moyenne d\'une vente : ' + D(r.get('saisieMoyenne'));
                    })}]};

        var jours = {xtype: 'chart', itemId: 'gJours', animate: true, shadow: false, store: me.st.jours, legend: {position: 'bottom'},
            theme: 'AeCharge', axes: [axeNum(['saisieVentes', 'saisieBl'], 'left', 'Minutes au clavier'), axeCat()],
            series: [{type: 'column', axis: 'left', xField: 'libelle', yField: ['saisieVentes', 'saisieBl'], stacked: true,
                    title: ['Saisie des ventes', 'Saisie des BL'], highlight: true,
                    tips: AE.infobulle(function (r) {
                        return '<b>' + r.get('libelle') + '</b><br>' + N(r.get('ventes')) + ' ventes : ' + D(r.get('saisieVentes') * 60)
                                + ' au clavier<br>' + N(r.get('bl')) + ' BL : ' + D(r.get('saisieBl') * 60);
                    })}]};

        var operateurs = {xtype: 'chart', itemId: 'gOperateurs', animate: true, shadow: false, store: me.st.operateurs,
            axes: [axeNum(['secondesParLigne'], 'bottom', 'Secondes par ligne', true), axeCat('libelle', 'left')],
            series: [{type: 'bar', axis: 'bottom', xField: 'libelle', yField: 'secondesParLigne', highlight: true, renderer: couleur('#0891b2'),
                    label: {display: 'insideEnd', field: 'secondesParLigne', color: '#fff', font: '11px Arial', renderer: function (v) {
                            return N(v, true) + ' s';
                        }},
                    tips: AE.infobulle(function (r) {
                        return '<b>' + Ext.String.htmlEncode(r.get('libelle')) + '</b><br>' + N(r.get('secondesParLigne'), true) + ' s par ligne : temps entre deux produits (médiane de '
                                + N(r.get('ventesMesurees')) + ' ventes de 2 lignes ou plus saisies par lui, préventes reprises écartées)<br>'
                                + N(r.get('ventes')) + ' ventes sur ' + N(r.get('jours')) + ' jours (' + N(r.get('ventesParJour'), true) + ' par jour)<br>'
                                + N(r.get('lignesParVente'), true) + ' lignes par vente, panier ' + N(r.get('panierMoyen')) + '<br>'
                                + N(r.get('ventesLongues')) + ' ' + (me.seuilLibelle || 'Ventes de plus de 10 min').toLowerCase()
                                + '<br><i>Cliquer pour ne voir que cet employé</i>';
                    }),
                    listeners: {
                        itemmouseup: function (item) {
                            me.filtrerEmploye(item.storeItem.get('id'));
                        }
                    }}]};

        /* plan du 08/11, points 15.5 et 15.7 : vitesse par type de vente (memes calculs que par operateur) */
        var typesVente = {xtype: 'chart', itemId: 'gTypesVente', animate: true, shadow: false, store: me.st.typesVente,
            axes: [axeNum(['secondesParLigne'], 'bottom', 'Secondes par ligne', true), axeCat('libelle', 'left')],
            series: [{type: 'bar', axis: 'bottom', xField: 'libelle', yField: 'secondesParLigne', highlight: true, renderer: couleur('#0f766e'),
                    label: {display: 'insideEnd', field: 'secondesParLigne', color: '#fff', font: '11px Arial', renderer: function (v) {
                            return N(v, true) + ' s';
                        }},
                    tips: AE.infobulle(function (r) {
                        return '<b>' + Ext.String.htmlEncode(r.get('libelle')) + '</b><br>' + N(r.get('secondesParLigne'), true) + ' s par ligne : temps entre deux produits (médiane de '
                                + N(r.get('ventesMesurees')) + ' ventes de 2 lignes ou plus)<br>'
                                + N(r.get('ventes')) + ' ventes, ' + N(r.get('lignesParVente'), true) + ' lignes par vente, panier ' + N(r.get('panierMoyen')) + '<br>'
                                + N(r.get('ventesLongues')) + ' ' + (me.seuilLibelle || 'Ventes de plus de 10 min').toLowerCase();
                    })}]};

        var grossistes = {xtype: 'chart', itemId: 'gGrossistes', animate: true, shadow: false, store: me.st.grossistes,
            axes: [axeNum(['secondesParLigne'], 'bottom', 'Secondes par ligne de BL'), axeCat('libelle', 'left')],
            series: [{type: 'bar', axis: 'bottom', xField: 'libelle', yField: 'secondesParLigne', highlight: true, renderer: couleur('#7c3aed'),
                    tips: AE.infobulle(function (r) {
                        return '<b>' + Ext.String.htmlEncode(r.get('libelle')) + '</b><br>' + D(r.get('secondesParLigne')) + ' par ligne<br>'
                                + N(r.get('bl')) + ' BL, ' + N(r.get('lignesParBl'), true) + ' lignes par BL';
                    })}]};

        var retard = {xtype: 'chart', itemId: 'gRetard', animate: true, shadow: false, store: me.st.retard, legend: {position: 'right'},
            theme: 'AeRetard', insetPadding: 20,
            series: [{type: 'pie', angleField: 'nombre', showInLegend: true, donut: 35, highlight: {segment: {margin: 8}},
                    label: {field: 'libelle', display: 'none'},
                    tips: AE.infobulle(function (r) {
                        var total = me.st.retard.sum('nombre') || 1;
                        return '<b>' + r.get('libelle') + '</b><br>' + N(r.get('nombre')) + ' BL (' + Math.round(r.get('nombre') * 100 / total) + ' %)'
                                + '<br><i>Cliquer : les grossistes de cette tranche</i>';
                    }),
                    /* plan du 08/11, point 15.2 : grossistes de la tranche (consultation) */
                    listeners: {
                        itemmouseup: function (item) {
                            me.grossistesRetard(item.storeItem);
                        }
                    }}]};

        var longues = {xtype: 'chart', itemId: 'gLongues', animate: true, shadow: false, store: me.st.longues,
            axes: [axeNum(['ventesLongues'], 'left', 'de plus de 10 min'), axeCat('libelle', 'bottom')],
            series: [{type: 'column', axis: 'left', xField: 'libelle', yField: 'ventesLongues', highlight: true, renderer: couleur('#e67e22'),
                    tips: AE.infobulle(function (r) {
                        var part = r.get('ventes') ? (r.get('ventesLongues') * 100 / r.get('ventes')) : 0;
                        return '<b>' + Ext.String.htmlEncode(r.get('libelle')) + '</b><br>' + N(r.get('ventesLongues')) + ' '
                                + (me.seuilLibelle || 'Ventes de plus de 10 min').toLowerCase() + ' (' + N(part, true) + ' % de ses ventes)';
                    })}]};

        var sensibles = {xtype: 'chart', itemId: 'gSensibles', animate: true, shadow: false, store: me.st.sensibles, legend: {position: 'bottom'},
            theme: 'AeSensibles', axes: [axeNum(['annulations', 'modifications'], 'left', 'Nombre'), axeCat('libelle', 'bottom')],
            series: [{type: 'column', axis: 'left', xField: 'libelle', yField: ['annulations', 'modifications'], title: ['Annulations', 'Modifications'],
                    highlight: true, tips: AE.infobulle(function (r) {
                        return '<b>' + Ext.String.htmlEncode(r.get('libelle')) + '</b><br>' + N(r.get('annulations')) + ' annulations ('
                                + N(r.get('tauxAnnulation'), true) + ' pour 1 000 ventes)<br>' + N(r.get('modifications')) + ' modifications<br>'
                                + 'Remises accordées : ' + N(r.get('remises')) + ' F';
                    })}]};

        var repartition = {xtype: 'chart', itemId: 'gRepartition', animate: true, shadow: false, store: me.st.repartition, legend: {position: 'right'},
            theme: 'AeTaches', axes: [axeNum(me.TACHES, 'bottom', 'Actions'), axeCat('libelle', 'left')],
            series: [{type: 'bar', axis: 'bottom', xField: 'libelle', yField: me.TACHES, stacked: true, highlight: true,
                    title: ['Ventes encaissées', 'Comme vendeur', 'BL', 'Commandes', 'Ajustements', 'Inventaires', 'Retours', 'Annulations', 'Modifications'],
                    tips: AE.infobulle(function (r) {
                        var lignes = [];
                        Ext.each(me.TACHES, function (t, i) {
                            if (r.get(t)) {
                                lignes.push(['Ventes encaissées', 'Comme vendeur', 'BL', 'Commandes', 'Ajustements', 'Inventaires', 'Retours',
                                    'Annulations', 'Modifications'][i] + ' : ' + N(r.get(t)));
                            }
                        });
                        return '<b>' + Ext.String.htmlEncode(r.get('libelle')) + '</b><br>' + lignes.join('<br>');
                    })}]};

        return Ext.create('Ext.panel.Panel', {
            itemId: 'aeAnalyses', autoScroll: true, bodyPadding: '12 2 12 12', bodyStyle: 'background:#f8fafc',
            items: [
                {xtype: 'component', itemId: 'aeTuiles', html: ''},
                /* plan avoir du 08/11, point 1 : memes reperes que la carte du tableau de bord */
                {xtype: 'component', itemId: 'aeResume', html: ''},
                {xtype: 'component', itemId: 'aeConstats', html: ''},
                {xtype: 'container', layout: 'column', items: [
                        me.cadre('cHeures', 'Affluence et vitesse par heure', 'Barres : ventes ouvertes à chaque heure. Courbe : saisie moyenne d\'une vente. '
                                + 'Une saisie qui s\'allonge aux heures chargées signale un poste qui manque.', heures),
                        me.cadre('cCarte', 'Carte d\'affluence (jour × heure)', 'Plus la case est foncée, plus il y a de ventes : pour placer les présences '
                                + 'et les pauses. Toujours de 0 h à 23 h, cases grises sans activité, nuit (21 h - 6 h) repérée. Le sélecteur de garde affiche '
                                + 'la carte d\'une garde ; sous la carte, le contrôle des gardes de la période.', me.contenuCarte()),
                        me.cadre('cJours', 'Charge au clavier par jour', '<b>Mesure</b> : temps passé à saisir, jour par jour. Ventes : de l\'ouverture '
                                + 'à la dernière ligne, 15 min au plus par vente (une vente restée ouverte ne compte pas comme du travail). BL : de l\'ouverture '
                                + 'du BL à sa dernière ligne, BL de plus de 4 h écartés.<br><b>Ce que cela apprend</b> : les jours où le comptoir est chargé '
                                + 'et la part prise par les BL.<br><b>Gain</b> : placer les présences et la saisie des BL sur les jours calmes '
                                + '(planning des équipes).', jours, 1),
                        me.cadre('cOperateurs', 'Vitesse par opérateur', '<b>Mesure</b> : temps médian entre deux produits saisis (scan ou recherche) '
                                + 'dans une même vente, sur les ventes de 2 lignes ou plus que l\'employé a saisies lui-même ; les préventes reprises en '
                                + 'caisse sont écartées et une vente aberrante ne compte pas. Exemple : 9 s par ligne = il faut 9 s pour passer au produit '
                                + 'suivant ; « 1,4 ligne par vente » = la plupart des clients prennent un seul produit.<br>'
                                + '<b>Ce que cela apprend</b> : qui cherche les produits au lieu de les scanner.<br><b>Gain</b> : former ou équiper '
                                + '(douchette) la bonne personne, et des clients servis plus vite. Une aide pour accompagner, pas un classement. '
                                + 'Cliquer une barre filtre sur l\'employé.', operateurs),
                        me.cadre('cTypesVente', 'Vitesse par type de vente', '<b>Mesure</b> : temps médian entre deux produits saisis selon le type de vente '
                                + '(comptant, assurance, carnet, dépôt, avoir), même calcul que par opérateur. 11 s par ligne = 11 s pour passer au '
                                + 'produit suivant, organisme et bon compris.<br><b>Ce que cela apprend</b> : le temps en plus d\'une vente à l\'assurance par '
                                + 'rapport au comptant.<br><b>Gain</b> : prévoir plus de monde en caisse aux heures des assurés, ou préparer les bons '
                                + 'à l\'avance. À comparer entre types, pas entre personnes.', typesVente),
                        /* plan du 08/11, point 15.4 : classement des vendeurs en preventes */
                        me.cadre('cPreventes', 'Préventes par vendeur', 'Prévente : vente saisie par un vendeur et encaissée par un autre. Classement par '
                                + 'préventes encaissées, avec le CA et les lignes ; « annulées » hors modifications, « abandonnées » : restées en attente après '
                                + 'le jour de saisie. Taux = (annulées + abandonnées) ÷ total.', {xtype: 'component', itemId: 'aePreventes', autoScroll: true, html: ''}),
                        /* plan du 08/11, point 15.3 : vitesse des caissieres, de la prise en caisse a l'encaissement */
                        me.cadre('cCaissieres', 'Vitesse des caissières', 'Préventes encaissées par chaque caissière (vendeur différent) et leur CA. '
                                + 'Temps : de la prise en caisse (ouverture de la prévente à l\'écran de vente) à l\'encaissement ; le temps de saisie reste '
                                + 'au vendeur. « Mesurées » : préventes dont la prise en caisse est connue (enregistrée depuis la mise à jour du 08/11), '
                                + 'durées de plus d\'une heure écartées.', {xtype: 'component', itemId: 'aeCaissieres', autoScroll: true, html: ''}),
                        me.cadre('cGrossistes', 'Saisie des BL par grossiste', 'Temps par ligne de BL, de l\'ouverture du BL à sa dernière ligne (BL de plus de 4 h écartés). '
                                + 'Un grossiste lent justifie de demander des BL électroniques.', grossistes),
                        me.cadre('cRetard', 'Délai de saisie des BL', 'Écart entre la date de livraison et l\'entrée du BL. Tant qu\'un BL n\'est pas saisi, '
                                + 'le stock est faux.', retard),
                        Ext.apply(me.cadre('cLongues', 'Ventes de plus de 10 min', 'Vente laissée ouverte, poste mal utilisé ou client hésitant : à rapprocher '
                                + 'des mises en attente. Le critère de durée se règle au-dessus du graphique.', longues), {dockedItems: [me.barreSeuil()]}),
                        me.cadre('cSensibles', 'Actions sensibles', 'Annulations et modifications de ventes par employé ; remises dans l\'infobulle. '
                                + 'À rapprocher de la caisse.', sensibles),
                        /* plan du 08/11, point 18 : motifs des annulations et modifications, par auteur de la vente d'origine */
                        me.cadre('cMotifs', 'Annulations et modifications par motif', 'Motif choisi à l\'annulation ou à la modification d\'une vente, '
                                + 'compté pour l\'auteur de la vente d\'origine (pas pour celui qui annule). Une annulation n\'est pas toujours une erreur : '
                                + 'voir le motif.', {xtype: 'component', itemId: 'aeMotifs', autoScroll: true, html: ''}),
                        /* plan du 08/11, point 15.1 : annulations rattachees a l'auteur de la vente, suivi des caissieres */
                        Ext.apply(me.cadre('cAnnulAuteurs', 'Annulations par auteur de la vente', 'Par vendeur : ses ventes de la période et celles '
                                + 'annulées ensuite (hors modifications), quel que soit celui qui annule. Par caissière (celle qui a encaissé) : annulations '
                                + 'et modifications de ventes au comptant, modifications de ventes à crédit, chacune avec son taux sur les ventes encaissées '
                                + 'du même type ; à droite, le taux global (opérations ÷ ventes encaissées). Cliquer une ligne : le détail (vente, motif, '
                                + 'par qui, quand, encaissé par).', {xtype: 'component', itemId: 'aeAnnulAuteurs', autoScroll: true, html: '',
                                    listeners: {afterrender: function (c) {
                                            c.getEl().on('click', function (ev, t) {
                                                me.detailAnnulations(t.getAttribute('data-role'), t.getAttribute('data-id'), t.getAttribute('data-nom'));
                                            }, null, {delegate: 'tr[data-role]'});
                                        }}}, 1), {height: 420}),
                        me.cadre('cRepartition', 'Répartition des tâches', 'Ce que fait chaque employé sur la période, par type d\'action.', repartition),
                        /* plan avoir du 08/11, point 1 : employe x tranche horaire x CA realise */
                        Ext.apply(me.cadre('cCaTranches', 'CA par employé et tranche horaire', 'Chiffre d\'affaires réalisé par chaque employé, '
                                + 'tranche horaire par tranche horaire (heure de l\'encaissement), avec le nombre de ventes sous le montant. '
                                + 'Ventes retenues : clôturées, non annulées, d\'un montant supérieur à 0, hors dépôt (mêmes règles que le reste de l\'écran). '
                                + 'Attribution « Caissière » : celle qui a encaissé la vente ; « Vendeur » : celui qui a saisi la prévente (à défaut, la caissière). '
                                + 'Chaque vente compte une seule fois : le total est le même dans les deux cas. Totaux par employé et par tranche ; '
                                + '« Export CSV » pour Excel.', {xtype: 'component', itemId: 'aeCaTranches', autoScroll: true, html: ''}, 1),
                                {height: 420, dockedItems: [me.barreCaTranches()]})
                    ]}
            ]
        });
    },

    /* retour du 24/10 : critere de duree des ventes (operateur et minutes), 10 min par defaut */
    barreSeuil: function () {
        var me = this, relancer = function () {
            var m = me.down('#aeSeuilMin');
            if (m && m.isValid() && m.getValue()) {
                me.majSeuilModifie();
                me.chargerAnalyses();
            }
        };
        return {xtype: 'toolbar', dock: 'top', cls: 'ae-seuil', items: [
                {xtype: 'tbtext', text: 'Durée de la vente'},
                {xtype: 'combo', itemId: 'aeSeuilOp', width: 105, editable: false, queryMode: 'local', forceSelection: true, value: 'GT',
                    store: [['GT', 'plus de'], ['GE', 'au moins'], ['LT', 'moins de'], ['LE', 'au plus']],
                    listeners: {select: relancer}},
                {xtype: 'numberfield', itemId: 'aeSeuilMin', width: 70, value: 10, minValue: 1, maxValue: 240, allowDecimals: false,
                    hideTrigger: true, enforceMaxLength: true, maxLength: 3, msgTarget: 'qtip',
                    listeners: {
                        specialkey: function (f, e) {
                            if (e.getKey() === e.ENTER) {
                                relancer();
                            }
                        },
                        blur: function (f) {
                            if (me.donneesAnalyses && f.getValue() !== me.donneesAnalyses.seuilMinutes) {
                                relancer();
                            }
                        }
                    }},
                {xtype: 'tbtext', text: 'min'},
                {xtype: 'tbtext', itemId: 'aeSeuilEtat', text: ''},
                '->',
                {text: 'Enregistrer pour tous', itemId: 'aeSeuilEnregistrer', disabled: true, iconCls: 'save',
                    tooltip: 'Le critère essayé devient celui de tous les postes : cet onglet, l\'onglet Anomalies et la carte du tableau de bord',
                    handler: function (b) {
                        me.confirmerDansBouton(b, 'Confirmer pour tous ?', function () {
                            me.enregistrerSeuil(b);
                        });
                    }}]};
    },

    /*
     * Plan du 09/11, point 10 : le critere de duree est enregistre pour tous (parametre). L'ecran l'essaie sans
     * l'enregistrer tant qu'il differe ; le bouton « Enregistrer pour tous » le rend persistant partout.
     */
    seuilAffiche: function () {
        var o = this.down('#aeSeuilOp'), m = this.down('#aeSeuilMin');
        return o && m ? {op: o.getValue(), min: m.getValue()} : null;
    },

    majSeuilModifie: function () {
        var me = this, a = me.seuilAffiche(), e = me.seuilEnregistre, b = me.down('#aeSeuilEnregistrer'), t = me.down('#aeSeuilEtat');
        me.seuilModifie = !!(a && e && (a.op !== e.op || a.min !== e.min));
        if (b) {
            b.setDisabled(!me.seuilModifie);
        }
        if (t) {
            t.setText(me.seuilModifie ? '<span style="color:#b45309">essai, non enregistré</span>' : '');
        }
    },

    /* apres une reponse sans critere demande : les champs montrent le critere enregistre */
    afficherSeuilEnregistre: function (op, min) {
        var me = this, o = me.down('#aeSeuilOp'), m = me.down('#aeSeuilMin');
        me.seuilEnregistre = {op: op, min: min};
        if (o && m && !me.seuilModifie) {
            o.suspendEvents(false);
            m.suspendEvents(false);
            o.setValue(op);
            m.setValue(min);
            o.resumeEvents();
            m.resumeEvents();
        }
        me.majSeuilModifie();
    },

    ajouterSeuil: function (f) {
        var a = this.seuilAffiche();
        if (this.seuilModifie && a) {
            f.seuilOperateur = a.op;
            f.seuilMinutes = a.min;
        }
        return f;
    },

    enregistrerSeuil: function (b) {
        var me = this, a = me.seuilAffiche();
        if (!a) {
            return;
        }
        b.disable();
        Ext.Ajax.request({url: '../api/v1/activite-equipes/seuil', method: 'POST', params: {seuilOperateur: a.op, seuilMinutes: a.min},
            success: function (r) {
                if (me.isDestroyed) {
                    return;
                }
                var o = Ext.decode(r.responseText, true) || {};
                if (!o.success) {
                    me.majSeuilModifie();
                    if (window.PrestigeToast) {
                        PrestigeToast.afficher(o.msg || 'Le critère n\'a pas été enregistré.', {niveau: 'alerte'});
                    }
                    return;
                }
                me.seuilModifie = false;
                me.afficherSeuilEnregistre(o.seuilOperateur, o.seuilMinutes);
                if (window.PrestigeToast) {
                    PrestigeToast.afficher(o.msg);
                }
                me.chargerAnalyses();
            },
            failure: function (r) {
                if (!me.isDestroyed) {
                    me.majSeuilModifie();
                    if (window.PrestigeToast) {
                        PrestigeToast.afficher('Le critère n\'a pas été enregistré (' + r.status + ').', {niveau: 'alerte'});
                    }
                }
            }});
    },

    /** Premier clic : le bouton demande confirmation ; second clic dans les 6 s : l'action (pas de fenetre). */
    confirmerDansBouton: function (b, texteConfirmation, action) {
        var maintenant = Date.now();
        if (!b.arme) {
            b.arme = maintenant;
            b.texteNormal = b.texteNormal || b.getText();
            b.setText(texteConfirmation);
            if (window.PrestigeConfirmation) {
                PrestigeConfirmation.armer(b);
            }
            b.minuteur = setTimeout(function () {
                if (!b.isDestroyed) {
                    b.arme = false;
                    if (window.PrestigeConfirmation) {
                        PrestigeConfirmation.desarmer(b);
                    }
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
        if (window.PrestigeConfirmation) {
            PrestigeConfirmation.desarmer(b);
        }
        b.setText(b.texteNormal);
        action();
    },

    /* « Ventes > 10 min » : en-tete court de la colonne des anomalies */
    enteteSeuil: function (op, min) {
        return 'Ventes ' + ({GT: '>', GE: '≥', LT: '<', LE: '≤'}[op] || '>') + ' ' + min + ' min';
    },

    /* ------------------------------------------------------------------ CA PAR EMPLOYE ET TRANCHE (plan avoir du 08/11, point 1) */

    barreCaTranches: function () {
        var me = this, relire = function () {
            me.chargerCaTranches(me.filtres());
        };
        return {xtype: 'toolbar', dock: 'top', cls: 'ae-seuil', items: [
                {xtype: 'combo', itemId: 'aeTrancheTaille', fieldLabel: 'Tranche', labelWidth: 50, width: 115, editable: false, queryMode: 'local',
                    forceSelection: true, value: 1, store: [[1, '1 h'], [2, '2 h'], [3, '3 h'], [4, '4 h'], [5, '5 h'], [6, '6 h']],
                    listeners: {select: relire}},
                {xtype: 'combo', itemId: 'aeTrancheAttribution', fieldLabel: 'CA attribué à', labelWidth: 85, width: 290, editable: false,
                    queryMode: 'local', forceSelection: true, value: 'CAISSIER',
                    store: [['CAISSIER', 'Caissière (encaissement)'], ['VENDEUR', 'Vendeur (prévente)'], ['CONSEIL', 'Conseil (qui a conseillé le client)']],
                    listeners: {select: relire}},
                '->',
                {text: 'Export CSV', itemId: 'aeTrancheExport', iconCls: 'excel', tooltip: 'Le tableau affiché, totaux compris (ouvert par Excel)',
                    handler: function (b) {
                        var url = '../api/v1/activite-equipes/ca-tranches/csv?' + Ext.Object.toQueryString(me.paramsCaTranches(me.filtres()));
                        if (window.PrestigeChargement && PrestigeChargement.telecharger) {
                            PrestigeChargement.telecharger(b, url, 'Export…');
                        } else {
                            window.open(url);
                        }
                    }}]};
    },

    paramsCaTranches: function (f) {
        var me = this;
        return Ext.apply({taille: me.down('#aeTrancheTaille').getValue(), attribution: me.down('#aeTrancheAttribution').getValue()}, f);
    },

    chargerCaTranches: function (f) {
        var me = this, z = me.down('#aeCaTranches'), cadre = me.down('#cCaTranches');
        if (!z) {
            return;
        }
        var version = me.versionCaTranches = (me.versionCaTranches || 0) + 1;
        cadre.setLoading('Calcul…');
        Ext.Ajax.request({url: '../api/v1/activite-equipes/ca-tranches', method: 'GET', params: me.paramsCaTranches(f), timeout: 180000,
            success: function (r) {
                if (me.isDestroyed || version !== me.versionCaTranches) {
                    return;
                }
                cadre.setLoading(false);
                var o = Ext.decode(r.responseText, true) || {};
                me.donneesCaTranches = o.data;
                z.update(o.success ? me.htmlCaTranches(o.data) : '<div class="ae-vide">' + Ext.String.htmlEncode(o.msg || 'Tableau indisponible') + '</div>');
                me.ecouterTriCaTranches(z);
            },
            failure: function (r) {
                if (!me.isDestroyed && version === me.versionCaTranches) {
                    cadre.setLoading(false);
                    z.update('<div class="ae-vide">Le serveur n\'a pas répondu (' + r.status + ').</div>');
                }
            }});
    },

    /*
     * Plan du 09/11, point 10 : tri du tableau du CA par un clic sur l'en-tete (employe, une tranche, total, ventes) ;
     * un second clic inverse le sens. Le pied (totaux) ne bouge pas.
     */
    ecouterTriCaTranches: function (z) {
        var me = this;
        if (!z.getEl() || z.triEcoute) {
            return;
        }
        z.triEcoute = true;
        z.getEl().on('click', function (ev, t) {
            var col = t.getAttribute('data-tri');
            if (!me.donneesCaTranches) {
                return;
            }
            var tri = me.triCaTranches || {};
            me.triCaTranches = {col: col, sens: tri.col === col ? -tri.sens : (col === 'nom' ? 1 : -1)};
            z.update(me.htmlCaTranches(me.donneesCaTranches));
        }, null, {delegate: 'th[data-tri]'});
    },

    trierCaTranches: function (lignes) {
        var tri = this.triCaTranches;
        if (!tri || !tri.col) {
            return lignes;
        }
        var valeur = function (l) {
            if (tri.col === 'nom') {
                return String(l.nom || '').toLowerCase();
            }
            if (tri.col === 'total') {
                return l.ca;
            }
            var c = l.cellules[Number(tri.col)];
            return c ? c.ca : 0;
        };
        return Ext.Array.sort(lignes.slice(), function (a, b) {
            var x = valeur(a), y = valeur(b);
            return (x < y ? -1 : x > y ? 1 : 0) * tri.sens;
        });
    },

    htmlCaTranches: function (d) {
        var me = this, e = Ext.String.htmlEncode, N = testextjs.view.activiteequipes.ActiviteEquipes.nombre;
        if (!d || !d.lignes || !d.lignes.length) {
            return '<div class="ae-vide">Aucune vente sur la période.</div>';
        }
        var tri = me.triCaTranches || {};
        var fleche = function (col) {
            return tri.col === col ? (tri.sens > 0 ? ' ▲' : ' ▼') : '';
        };
        var max = 1;
        Ext.each(d.lignes, function (l) {
            Ext.each(l.cellules, function (c) {
                max = Math.max(max, c.ca);
            });
        });
        var cellule = function (c, total) {
            if (!c.ventes) {
                return '<td class="n ae-ct-vide">·</td>';
            }
            var fond = total ? '' : ' style="background:rgba(37,99,235,' + (0.06 + 0.34 * c.ca / max).toFixed(2) + ')"';
            return '<td class="n"' + fond + '><b>' + N(c.ca) + '</b><small class="ae-ct-nb">' + N(c.ventes) + ' v.</small></td>';
        };
        var ligne = function (l, total) {
            return '<td class="ae-ct-nom">' + e(l.nom) + '</td>' + Ext.Array.map(l.cellules, function (c) {
                return cellule(c, total);
            }).join('') + '<td class="n ae-ct-total"><b>' + N(l.ca) + '</b><small class="ae-ct-nb">' + N(l.ventes) + ' v.</small></td>';
        };
        return '<style>.ae-ct{border-collapse:collapse;font-size:12px;margin:4px 0;min-width:100%}.ae-ct th{background:#e8eef7;color:#1a3d6d;'
                + 'padding:4px 6px;white-space:nowrap;text-align:right}.ae-ct th:first-child{text-align:left}.ae-ct td{padding:3px 6px;border-bottom:1px solid #eef1f5;'
                + 'white-space:nowrap}.ae-ct .n{text-align:right}.ae-ct small{display:block;color:#64748b;font-size:10px}'
                + '.ae-ct small.ae-ct-nb{color:#7c3aed;font-size:12px;font-weight:bold}.ae-ct .ae-ct-ventes{color:#7c3aed;font-weight:bold;font-size:13px}'
                + '.ae-ct th[data-tri]{cursor:pointer;user-select:none}.ae-ct th[data-tri]:hover{background:#dbe5f3}'
                + '.ae-ct .ae-ct-vide{color:#cbd5e1}'
                + '.ae-ct .ae-ct-total{background:#f1f5f9}.ae-ct tfoot th,.ae-ct tfoot td{background:#e8eef7;font-weight:bold}.ae-ct .ae-ct-nom{max-width:190px;'
                + 'overflow:hidden;text-overflow:ellipsis}</style>'
                + '<table class="ae-ct" data-taille="' + d.taille + '" data-attribution="' + d.attribution + '"><thead><tr><th data-tri="nom" data-qtip="Cliquer pour trier">'
                + ({VENDEUR: 'Vendeur', CONSEIL: 'Conseil'}[d.attribution] || 'Caissière') + fleche('nom') + '</th>'
                + Ext.Array.map(d.tranches, function (t, i) {
                    return '<th data-t="' + t.index + '" data-tri="' + i + '" data-qtip="Cliquer pour trier">' + e(t.libelle) + fleche(String(i)) + '</th>';
                }).join('') + '<th data-tri="total" data-qtip="Cliquer pour trier">Total' + fleche('total') + '</th>'
                + '</tr></thead><tbody>'
                + Ext.Array.map(me.trierCaTranches(d.lignes), function (l) {
                    return '<tr data-id="' + e(l.id) + '">' + ligne(l, false) + '</tr>';
                }).join('') + '</tbody><tfoot><tr>' + ligne(Ext.apply({nom: 'Total (' + d.lignes.length + ' employé' + (d.lignes.length > 1 ? 's' : '') + ')'}, d.totaux), true)
                + '</tr></tfoot></table>';
    },

    /* ------------------------------------------------------------------ ANOMALIES (retour du 24/10) */

    FAMILLES: {REFUS: ['Refus affiché', '#c2410c'], LOGICIEL: ['Erreur du logiciel', '#64748b']},

    creerAnomalies: function () {
        var me = this, N = testextjs.view.activiteequipes.ActiviteEquipes.nombre, enc = Ext.String.htmlEncode;
        me.anoEmployes = Ext.create('Ext.data.Store', {fields: ['id', 'nom', {name: 'ventes', type: 'int'}, {name: 'refus', type: 'int'},
                {name: 'annulations', type: 'int'}, {name: 'modifications', type: 'int'}, {name: 'remises', type: 'int'},
                {name: 'ventesLongues', type: 'int'}, {name: 'logiciel', type: 'int'}, {name: 'pour100', type: 'float'}], data: []});
        me.anoListe = Ext.create('Ext.data.Store', {fields: [{name: 'id', type: 'int'}, 'date', 'employeId', 'employe', 'famille', 'code', 'message', 'ecran', 'poste'], data: []});
        var nb = function (v) {
            return v ? '<b>' + N(v) + '</b>' : '<span style="color:#94a3b8">0</span>';
        };
        /* un nombre d'operations a risque mene au journal de l'employe, filtre sur ce type */
        var lien = function (v) {
            return v ? '<span class="ae-lien" style="color:#0e7490;text-decoration:underline;cursor:pointer;font-weight:700" data-qtip="Voir ces opérations dans le journal">'
                    + N(v) + '</span>' : '<span style="color:#94a3b8">0</span>';
        };
        return Ext.create('Ext.panel.Panel', {
            itemId: 'aeAnomalies', layout: {type: 'vbox', align: 'stretch'}, bodyPadding: '10 10 10 10', bodyStyle: 'background:#f8fafc',
            items: [
                {xtype: 'container', layout: {type: 'hbox', align: 'middle'}, margin: '0 0 8 0', items: [
                        {xtype: 'component', flex: 1, html: '<div style="color:#475569;font-size:12px;line-height:1.5">'
                                    + '<b>Refus affichés</b> : messages de refus vus par l\'employé (code non reconnu, lot périmé…). '
                                    + '<b>Opérations à risque</b> : annulations, modifications, remises, ventes longues (cliquez un nombre pour le journal). '
                                    + '<b>Erreurs du logiciel</b> : rangées à part, elles ne sont pas imputables à la personne.</div>'},
                        {xtype: 'combobox', itemId: 'anoFamille', fieldLabel: 'Anomalies', labelWidth: 70, width: 260, editable: false,
                            queryMode: 'local', value: '', store: [['', 'Toutes'], ['REFUS', 'Refus affichés'], ['LOGICIEL', 'Erreurs du logiciel']],
                            listeners: {select: function () {
                                    me.chargerAnomalies();
                                }}}
                    ]},
                {xtype: 'gridpanel', itemId: 'anoEmployes', store: me.anoEmployes, flex: 2, minHeight: 160, title: 'Par employé',
                    viewConfig: {emptyText: '<div style="padding:12px;color:#64748b">Aucune anomalie sur la période.</div>', deferEmptyText: false},
                    columns: [
                        {header: 'Employé', dataIndex: 'nom', flex: 1, minWidth: 170, renderer: Ext.util.Format.htmlEncode},
                        {header: 'Ventes', dataIndex: 'ventes', width: 80, align: 'right', renderer: N},
                        {header: 'Refus affichés', dataIndex: 'refus', width: 115, align: 'right', renderer: nb},
                        {header: 'Annulations', dataIndex: 'annulations', width: 100, align: 'right', renderer: lien, cle: 'ANNULATION'},
                        {header: 'Modifications', dataIndex: 'modifications', width: 110, align: 'right', renderer: lien, cle: 'MODIFICATION'},
                        {header: 'Remises (F)', dataIndex: 'remises', width: 105, align: 'right', renderer: function (v) {
                                return v ? N(v) : '<span style="color:#94a3b8">0</span>';
                            }},
                        {header: 'Ventes longues', itemId: 'anoColLongues', dataIndex: 'ventesLongues', width: 115, align: 'right', renderer: nb},
                        {header: 'Pour 100 ventes', dataIndex: 'pour100', width: 120, align: 'right', renderer: function (v) {
                                return '<span data-qtip="(refus + annulations + modifications) pour 100 ventes">' + N(v, true) + '</span>';
                            }},
                        {header: 'Erreurs du logiciel', dataIndex: 'logiciel', width: 140, align: 'right', renderer: function (v) {
                                return '<span style="color:#64748b">' + N(v) + '</span>';
                            }}
                    ],
                    listeners: {
                        cellclick: function (v, td, col, rec, tr, row, e) {
                            var c = v.getGridColumns()[col];
                            if (c && c.cle && e.getTarget('.ae-lien')) {
                                me.down('#aeEmploye').setValue(rec.get('id'));
                                me.typeActif = c.cle;
                                me.afficher('donnees');
                                me.journal.loadPage(1);
                                return;
                            }
                            me.anoEmployeChoisi = rec.get('id');
                            me.chargerListeAnomalies();
                        }
                    }},
                {xtype: 'container', flex: 3, layout: {type: 'hbox', align: 'stretch'}, margin: '10 0 0 0', items: [
                        {xtype: 'gridpanel', itemId: 'anoListe', store: me.anoListe, flex: 3, title: 'Anomalies enregistrées (les plus récentes d\'abord)',
                            viewConfig: {emptyText: '<div style="padding:12px;color:#64748b">Cliquez un employé, ou aucune anomalie enregistrée.</div>', deferEmptyText: false},
                            columns: [
                                {header: 'Date', dataIndex: 'date', width: 140},
                                {header: 'Employé', dataIndex: 'employe', width: 150, renderer: Ext.util.Format.htmlEncode},
                                {header: 'Type', dataIndex: 'famille', width: 130, renderer: function (v) {
                                        var f = me.FAMILLES[v] || [v, '#64748b'];
                                        return '<span class="ae-type" style="background:' + f[1] + '">' + enc(f[0]) + '</span>';
                                    }},
                                {header: 'Écran', dataIndex: 'ecran', width: 140, renderer: Ext.util.Format.htmlEncode},
                                {header: 'Message', dataIndex: 'message', flex: 1, minWidth: 200, renderer: function (v, m) {
                                        m.tdAttr = 'data-qtip="' + enc(enc(v || '')) + '"';
                                        return enc(v || '');
                                    }}
                            ],
                            listeners: {
                                itemclick: function (v, rec) {
                                    me.afficherFil(rec.get('id'));
                                }
                            }},
                        {xtype: 'panel', itemId: 'anoFil', flex: 2, margin: '0 0 0 10', title: 'Ce qu\'il a fait juste avant', autoScroll: true,
                            bodyPadding: 10, html: '<div style="color:#64748b">Cliquez une anomalie pour voir les dernières actions de l\'employé.</div>'}
                    ]}
            ]
        });
    },

    chargerAnomalies: function () {
        var me = this, f = me.filtres(), a = me.anomaliesPanel;
        if (!a.rendered) {
            a.on('afterrender', me.chargerAnomalies, me, {single: true});
            return;
        }
        f.famille = me.down('#anoFamille').getValue() || '';
        me.ajouterSeuil(f);
        me.anoEmployeChoisi = f.employeId || null;
        a.setLoading('Lecture des anomalies…');
        Ext.Ajax.request({url: '../api/v1/activite-equipes/anomalies', method: 'GET', params: f, timeout: 180000,
            success: function (r) {
                if (a.isDestroyed) {
                    return;
                }
                a.setLoading(false);
                var o = Ext.decode(r.responseText, true) || {};
                var d = o.data || {};
                me.anoEmployes.loadData(d.employes || []);
                me.anoListe.loadData(d.anomalies || []);
                var col = me.down('#anoColLongues');
                if (col && d.seuilLibelle) {
                    col.setText(me.enteteSeuil(d.seuilOperateur, d.seuilMinutes));
                    col.tooltip = d.seuilLibelle;
                }
                me.down('#anoFil').update('<div style="color:#64748b">Cliquez une anomalie pour voir les dernières actions de l\'employé.</div>');
            },
            failure: function (r) {
                if (!a.isDestroyed) {
                    a.setLoading(false);
                    if (window.PrestigeToast) {
                        PrestigeToast.afficher('Les anomalies n\'ont pas pu être lues (' + r.status + ').', {niveau: 'alerte'});
                    }
                }
            }});
    },

    /* anomalies d'un employe (clic sur sa ligne) */
    chargerListeAnomalies: function () {
        var me = this, f = me.filtres(), g = me.down('#anoListe');
        f.employeId = me.anoEmployeChoisi || '';
        f.famille = me.down('#anoFamille').getValue() || '';
        g.setLoading(true);
        Ext.Ajax.request({url: '../api/v1/activite-equipes/anomalies', method: 'GET', params: f, timeout: 180000,
            success: function (r) {
                if (g.isDestroyed) {
                    return;
                }
                g.setLoading(false);
                var o = Ext.decode(r.responseText, true) || {};
                me.anoListe.loadData((o.data || {}).anomalies || []);
                me.down('#anoFil').update('<div style="color:#64748b">Cliquez une anomalie pour voir les dernières actions de l\'employé.</div>');
            },
            failure: function () {
                if (!g.isDestroyed) {
                    g.setLoading(false);
                }
            }});
    },

    /* fil des dernieres actions avant l'anomalie, la plus recente en bas */
    afficherFil: function (id) {
        var me = this, p = me.down('#anoFil'), enc = Ext.String.htmlEncode;
        p.setLoading(true);
        Ext.Ajax.request({url: '../api/v1/activite-equipes/anomalies/' + encodeURIComponent(id), method: 'GET',
            success: function (r) {
                if (p.isDestroyed) {
                    return;
                }
                p.setLoading(false);
                var o = Ext.decode(r.responseText, true) || {}, a = o.data;
                if (!a) {
                    p.update('<div style="color:#b42318">Anomalie introuvable.</div>');
                    return;
                }
                var f = me.FAMILLES[a.famille] || [a.famille, '#64748b'];
                var lignes = (a.fil || []).map(function (x) {
                    var m = /^(\S+)\s+(\S+)\s*(.*)$/.exec(x) || [x, '', x, ''];
                    var nature = m[2], fond = {ECRAN: '#1e3a5f', SCAN: '#0e7490', BOUTON: '#7c3aed', MENU: '#7c3aed', ONGLET: '#7c3aed', API: '#94a3b8'}[nature] || '#94a3b8';
                    return '<li style="margin:3px 0;' + (nature === 'API' ? 'color:#94a3b8' : '') + '"><span style="color:#64748b;font-variant-numeric:tabular-nums">' + enc(m[1]) + '</span> '
                            + '<span class="ae-type" style="background:' + fond + '">' + enc(nature) + '</span> ' + enc(m[3]) + '</li>';
                }).join('');
                p.update('<div style="margin-bottom:8px"><span class="ae-type" style="background:' + f[1] + '">' + enc(f[0]) + '</span> <b>' + enc(a.employe) + '</b> — ' + enc(a.date)
                        + '<br><span style="color:#475569">Écran : ' + enc(a.ecran || '-') + ' · Poste : ' + enc(a.poste || '-') + '</span>'
                        + '<div style="margin-top:6px;padding:8px 10px;background:#fff7ed;border-left:4px solid ' + f[1] + ';border-radius:6px">' + enc(a.message) + '</div></div>'
                        + '<div style="font-weight:700;color:#1e3a5f;margin:6px 0">Dernières actions (la plus récente en bas)</div>'
                        + (lignes ? '<ol style="padding-left:18px;margin:0">' + lignes + '</ol>' : '<div style="color:#64748b">Aucune action enregistrée.</div>')
                        + '<div style="margin-top:6px;color:#b45309;font-weight:700">↳ anomalie</div>');
            },
            failure: function () {
                if (!p.isDestroyed) {
                    p.setLoading(false);
                }
            }});
    },

    filtrerEmploye: function (id) {
        var me = this, c = me.down('#aeEmploye');
        if (id && c) {
            c.setValue(id);
            me.actualiser();
        }
    },

    chargerAnalyses: function () {
        var me = this, a = me.analyses, f = me.filtres();
        if (!a.rendered) {
            a.on('afterrender', me.chargerAnalyses, me, {single: true});
            return;
        }
        a.setLoading('Calcul des analyses…');
        me.ajouterSeuil(f);
        Ext.Ajax.request({url: '../api/v1/activite-equipes/analyses', method: 'GET', params: f, timeout: 180000,
            success: function (r) {
                if (a.isDestroyed) {
                    return;
                }
                a.setLoading(false);
                var o = Ext.decode(r.responseText, true) || {};
                if (!o.success) {
                    a.down('#aeTuiles').update('<div class="ae-vide">' + Ext.String.htmlEncode(o.msg || 'Analyse indisponible') + '</div>');
                    return;
                }
                me.donneesAnalyses = o.data;
                me.dessinerAnalyses(o.data);
                me.chargerMotifs(f);
                me.chargerAnnulations(f);
                me.chargerGardes(f);
                me.chargerCaTranches(f);
            },
            failure: function (r) {
                if (!a.isDestroyed) {
                    a.setLoading(false);
                    a.down('#aeTuiles').update('<div class="ae-vide">Le serveur n\'a pas répondu (' + r.status + ').</div>');
                }
            }});
    },

    /* plan du 08/11, point 18 : rubrique « Annulations et modifications par motif » (meme recapitulatif que l'onglet
       « Analyse par motif » des ventes annulees) */
    /* plan du 08/11, point 15.8 (Q17) : selecteur de garde (celui de Ventes terminees : memes gardes, meme libelle),
       carte de 0 h a 23 h, controle des gardes de la periode sous la carte */
    contenuCarte: function () {
        var me = this;
        var gardes = Ext.create('Ext.data.Store', {
            fields: ['id', 'libelle', 'dateDebut', 'dateFin', {name: 'libelleComplet', convert: function (v, r) {
                        return r.get('libelle') + '  (' + r.get('dateDebut') + ' → ' + r.get('dateFin') + ')';
                    }}],
            autoLoad: true, proxy: {type: 'ajax', url: '../api/v1/gardes', reader: {type: 'json', root: 'data', totalProperty: 'total'}}
        });
        return {xtype: 'panel', border: false, layout: 'fit', itemId: 'aeCartePanneau',
            dockedItems: [{xtype: 'toolbar', dock: 'top', itemId: 'aeCarteBarre', items: [
                        {xtype: 'combobox', itemId: 'aeGarde', fieldLabel: 'Garde', labelWidth: 40, flex: 1, store: gardes, queryMode: 'local', editable: false,
                            valueField: 'id', displayField: 'libelleComplet', emptyText: 'Afficher la carte d\'une garde…',
                            listeners: {select: function (c, r) {
                                    me.afficherCarteGarde(r[0]);
                                }}},
                        {text: 'Toute la période', itemId: 'aeCartePeriode', iconCls: 'fa fa-calendar', tooltip: 'Revenir à la carte de la période choisie en haut',
                            disabled: true, handler: function (b) {
                                b.up('#aeCartePanneau').down('#aeGarde').clearValue();
                                b.disable();
                                me.down('#aeCarte').update(me.htmlCarte(me.donneesAnalyses ? me.donneesAnalyses.carte : [], ''));
                            }}]},
                {xtype: 'component', dock: 'bottom', itemId: 'aeGardes', html: '', style: 'max-height:70px;overflow:auto'}],
            items: [{xtype: 'component', itemId: 'aeCarte', autoScroll: true, html: ''}]};
    },

    afficherCarteGarde: function (garde) {
        var me = this, c = me.down('#aeCarte');
        if (!garde) {
            return;
        }
        Ext.Ajax.request({url: '../api/v1/activite-equipes/carte-garde/' + encodeURIComponent(garde.get('id')), method: 'GET',
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (c.isDestroyed) {
                    return;
                }
                if (!o.success) {
                    c.update('<div class="ae-vide">' + Ext.String.htmlEncode(o.msg || 'Garde indisponible') + '</div>');
                    return;
                }
                me.down('#aeCartePeriode').enable();
                c.update(me.htmlCarte(o.data.carte, garde.get('libelle') + ' : ' + testextjs.view.activiteequipes.ActiviteEquipes.nombre(o.data.ventes)
                        + ' vente' + (o.data.ventes > 1 ? 's' : '') + ' (' + garde.get('dateDebut') + ' → ' + garde.get('dateFin') + ')'));
            },
            failure: function () {
                if (!c.isDestroyed) {
                    c.update('<div class="ae-vide">Indisponible : réessayer.</div>');
                }
            }});
    },

    chargerGardes: function (f) {
        var me = this, c = me.down('#aeGardes');
        if (!c) {
            return;
        }
        Ext.Ajax.request({url: '../api/v1/activite-equipes/gardes', method: 'GET', params: {debut: f.debut, fin: f.fin},
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (!c.isDestroyed) {
                    c.update(o.success ? me.htmlGardes(o.data) : '<div class="ae-vide">' + Ext.String.htmlEncode(o.msg || 'Indisponible') + '</div>');
                }
            },
            failure: function () {
                if (!c.isDestroyed) {
                    c.update('<div class="ae-vide">Indisponible : réessayer.</div>');
                }
            }});
    },

    htmlGardes: function (d) {
        var e = Ext.String.htmlEncode, N = testextjs.view.activiteequipes.ActiviteEquipes.nombre, l = [];
        Ext.each(d.gardesSansVente, function (g) {
            l.push('<li class="ae-garde-sans-vente" style="color:#c62828">Garde sans aucune vente : <b>' + e(g.libelle) + '</b> (' + e(g.debut) + ' → ' + e(g.fin)
                    + ') — dates ou heures à vérifier</li>');
        });
        Ext.each(d.nuitsSansGarde, function (n) {
            l.push('<li class="ae-nuit-sans-garde" style="color:#b45309">' + e(n.libelle) + ' : <b>' + N(n.ventes) + '</b> vente' + (n.ventes > 1 ? 's' : '')
                    + ' entre 21 h et 6 h sans garde déclarée</li>');
        });
        if (!l.length) {
            return '<div class="ae-gardes-ok" style="padding:3px 6px;color:#1b7f3b;font-size:11px">' + N(d.gardes.length) + ' garde' + (d.gardes.length > 1 ? 's' : '')
                    + ' sur la période, toutes avec des ventes ; aucune vente de nuit sans garde.</div>';
        }
        return '<ul class="ae-gardes" style="margin:2px 0;padding-left:18px;font-size:11px">' + l.join('') + '</ul>';
    },

    chargerMotifs: function (f) {
        var me = this, c = me.down('#aeMotifs');
        if (!c) {
            return;
        }
        Ext.Ajax.request({url: '../api/v1/vente-motifs/recap', method: 'GET', params: {dtStart: f.debut, dtEnd: f.fin, employeId: f.employeId || ''},
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (!c.isDestroyed) {
                    c.update(o.success ? me.htmlMotifs(o) : '<div class="ae-vide">' + Ext.String.htmlEncode(o.msg || 'Indisponible') + '</div>');
                }
            },
            failure: function () {
                if (!c.isDestroyed) {
                    c.update('<div class="ae-vide">Indisponible : réessayer.</div>');
                }
            }});
    },

    htmlMotifs: function (o) {
        var e = Ext.String.htmlEncode, t = o.total || {};
        if (!t.nb) {
            return '<div class="ae-vide">Aucune annulation ni modification avec motif sur la période.</div>';
        }
        var table = function (titre, lignes, nom) {
            return '<table class="ae-motifs"><thead><tr><th>' + titre + '</th><th>Annul.</th><th>Modif.</th><th>Total</th></tr></thead><tbody>'
                    + Ext.Array.map(lignes, function (x) {
                        return '<tr><td>' + e(x[nom]) + '</td><td class="n">' + x.annulations + '</td><td class="n">' + x.modifications
                                + '</td><td class="n"><b>' + x.nb + '</b></td></tr>';
                    }).join('') + '</tbody><tfoot><tr><th>Total</th><th class="n">' + t.annulations + '</th><th class="n">' + t.modifications
                    + '</th><th class="n">' + t.nb + '</th></tr></tfoot></table>';
        };
        return '<style>.ae-motifs{border-collapse:collapse;width:100%;font-size:12px;margin:4px 0 10px}.ae-motifs th{background:#e8eef7;'
                + 'color:#1a3d6d;text-align:left;padding:4px 6px}.ae-motifs td{padding:3px 6px;border-bottom:1px solid #eef1f5}'
                + '.ae-motifs .n{text-align:right}</style>'
                + table('Auteur de la vente', o.parAuteur || [], 'auteur') + table('Motif', o.parMotif || [], 'motif');
    },

    /* plan du 08/11, point 15.2 : fenetre de consultation des grossistes d'une tranche de delai de saisie des BL */
    grossistesRetard: function (r) {
        var e = Ext.String.htmlEncode, N = testextjs.view.activiteequipes.ActiviteEquipes.nombre, l = r.get('grossistes') || [];
        var sansDelai = r.get('code') === 'SANS';
        var html = '<style>.ae-gr{border-collapse:collapse;width:100%;font-size:12px}.ae-gr th{background:#e8eef7;color:#1a3d6d;text-align:left;'
                + 'padding:4px 6px}.ae-gr td{padding:3px 6px;border-bottom:1px solid #eef1f5}.ae-gr .n{text-align:right}</style>'
                + (l.length ? '<table class="ae-gr"><thead><tr><th>Grossiste</th><th class="n">BL</th>' + (sansDelai ? '' : '<th class="n">Délai moyen</th>')
                        + '</tr></thead><tbody>' + Ext.Array.map(l, function (g) {
                            return '<tr><td>' + e(g.nom) + '</td><td class="n">' + N(g.bl) + '</td>' + (sansDelai ? ''
                                    : '<td class="n">' + N(g.delaiMoyen, true) + ' j</td>') + '</tr>';
                        }).join('') + '</tbody><tfoot><tr><th>Total</th><th class="n">' + N(r.get('nombre')) + '</th>' + (sansDelai ? '' : '<th></th>')
                        + '</tr></tfoot></table>' : '<div class="ae-vide">Aucun BL.</div>');
        Ext.create('Ext.window.Window', {itemId: 'aeGrossistesRetard', title: 'Délai de saisie des BL : ' + e(r.get('libelle')), modal: true, width: 440,
            maxHeight: 460, autoScroll: true, bodyPadding: 8, html: html, buttons: [{text: 'Fermer', handler: function (b) {
                        b.up('window').close();
                    }}]}).show();
    },

    /* plan du 08/11, point 15.1 : annulations par auteur de la vente et suivi des caissieres */
    chargerAnnulations: function (f) {
        var me = this, c = me.down('#aeAnnulAuteurs');
        if (!c) {
            return;
        }
        me.filtreAnnulations = f;
        Ext.Ajax.request({url: '../api/v1/activite-equipes/annulations', method: 'GET', params: {debut: f.debut, fin: f.fin, employeId: f.employeId || ''},
            timeout: 180000,
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (!c.isDestroyed) {
                    c.update(o.success ? me.htmlAnnulations(o.data) : '<div class="ae-vide">' + Ext.String.htmlEncode(o.msg || 'Indisponible') + '</div>');
                }
            },
            failure: function () {
                if (!c.isDestroyed) {
                    c.update('<div class="ae-vide">Indisponible : réessayer.</div>');
                }
            }});
    },

    htmlAnnulations: function (d) {
        var e = Ext.String.htmlEncode, N = testextjs.view.activiteequipes.ActiviteEquipes.nombre;
        var style = '<style>.ae-ann{border-collapse:collapse;width:100%;font-size:12px;margin:2px 0 8px}.ae-ann th{background:#e8eef7;color:#1a3d6d;'
                + 'text-align:left;padding:4px 6px;white-space:nowrap}.ae-ann td{padding:3px 6px;border-bottom:1px solid #eef1f5}.ae-ann .n{text-align:right}'
                + '.ae-ann tbody tr{cursor:pointer}.ae-ann tbody tr:hover{background:#f3f7fc}.ae-ann .ae-taux-haut{color:#c0392b;font-weight:bold}'
                + '.ae-ann .ae-pct{color:#64748b;font-size:11px}'
                + '.ae-ann-titre{font-weight:bold;color:#1a3d6d;margin:4px 0 2px}.ae-ann-cols{display:flex;gap:14px}.ae-ann-cols>div{flex:1;min-width:0}'
                + '.ae-ann-detail{margin-top:6px}</style>';
        var vendeurs = d.parVendeur || [], caissiers = d.parCaissier || [];
        var tv = vendeurs.length ? '<table class="ae-ann ae-ann-vendeurs"><thead><tr><th>Vendeur</th><th class="n">Ventes</th><th class="n">Annulées ensuite</th>'
                + '<th class="n">Taux</th></tr></thead><tbody>' + Ext.Array.map(vendeurs.slice(0, 12), function (x) {
                    return '<tr data-role="VENDEUR" data-id="' + e(x.id) + '" data-nom="' + e(x.nom) + '" data-qtip="Cliquer : ses ventes annulées"><td>' + e(x.nom)
                            + '</td><td class="n">' + N(x.ventes) + '</td><td class="n"><b>' + N(x.annulees) + '</b></td><td class="n'
                            + (x.taux >= 2 ? ' ae-taux-haut' : '') + '">' + N(x.taux, true) + ' %</td></tr>';
                }).join('') + '</tbody></table>' : '<div class="ae-vide">Aucune vente sur la période.</div>';
        /* plan du 09/11, point 10 : chaque operation et son taux sur les ventes de son type ; taux global a droite */
        var pct = function (t, sur) {
            return '<span class="ae-pct" data-taux="' + (t === null || t === undefined ? '' : t) + '" data-qtip="sur ' + N(sur) + ' ventes encaissées">'
                    + (t === null || t === undefined ? '—' : N(t, true) + ' %') + '</span>';
        };
        var tc = caissiers.length ? '<table class="ae-ann ae-ann-caissiers"><thead><tr><th>Caissière</th><th class="n">Ventes comptant</th>'
                + '<th class="n">Annul. comptant</th><th class="n">Modif. comptant</th><th class="n">Ventes crédit</th><th class="n">Modif. crédit</th>'
                + '<th class="n">Taux</th></tr></thead><tbody>' + Ext.Array.map(caissiers.slice(0, 12), function (x) {
                    return '<tr data-role="CAISSIER" data-id="' + e(x.id) + '" data-nom="' + e(x.nom) + '" data-qtip="Cliquer : le détail des opérations"><td>' + e(x.nom)
                            + '</td><td class="n">' + N(x.ventesComptant) + '</td><td class="n"><span class="ae-nb">' + N(x.annulationsComptant) + '</span> '
                            + pct(x.tauxAnnulationsComptant, x.ventesComptant) + '</td><td class="n"><span class="ae-nb">' + N(x.modificationsComptant) + '</span> '
                            + pct(x.tauxModificationsComptant, x.ventesComptant) + '</td><td class="n">' + N(x.ventesCredit) + '</td><td class="n"><span class="ae-nb">'
                            + N(x.modificationsCredit) + '</span> ' + pct(x.tauxModificationsCredit, x.ventesCredit) + '</td><td class="n ae-taux'
                            + (x.taux >= 2 ? ' ae-taux-haut' : '') + '" data-taux="' + (x.taux === null || x.taux === undefined ? '' : x.taux) + '">'
                            + (x.taux === null || x.taux === undefined ? '—' : '<b>' + N(x.taux, true) + ' %</b>') + '</td></tr>';
                }).join('') + '</tbody></table>' : '<div class="ae-vide">Aucune annulation ni modification sur la période.</div>';
        return style + '<div class="ae-ann-cols"><div><div class="ae-ann-titre">Par auteur de la vente (vendeur)</div>' + tv + '</div>'
                + '<div><div class="ae-ann-titre">Par caissière (qui a encaissé)</div>' + tc + '</div></div><div class="ae-ann-detail"></div>';
    },

    /* detail d'une ligne, sous les tableaux (consultation, sans fenetre) */
    detailAnnulations: function (role, id, nom) {
        var me = this, c = me.down('#aeAnnulAuteurs'), f = me.filtreAnnulations, e = Ext.String.htmlEncode, N = testextjs.view.activiteequipes.ActiviteEquipes.nombre;
        var zone = c && c.getEl() ? c.getEl().dom.querySelector('.ae-ann-detail') : null;
        if (!zone || !f || !id) {
            return;
        }
        zone.innerHTML = '<div class="ae-vide">Lecture…</div>';
        Ext.Ajax.request({url: '../api/v1/activite-equipes/annulations/detail', method: 'GET', params: {debut: f.debut, fin: f.fin, role: role, id: id},
            timeout: 180000,
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {}, l = o.data || [];
                zone.innerHTML = '<div class="ae-ann-titre">' + (role === 'CAISSIER' ? 'Opérations sur les ventes encaissées par ' : 'Ventes annulées de ') + e(nom || '')
                        + ' (' + l.length + ')</div>' + (l.length ? '<table class="ae-ann ae-ann-liste"><thead><tr><th>Vente</th><th>Type</th><th>Date de la vente</th>'
                        + '<th class="n">Montant</th><th>Opération</th><th>Motif</th><th>Par qui</th><th>Quand</th><th>Encaissé par</th></tr></thead><tbody>'
                        + Ext.Array.map(l, function (x) {
                            return '<tr><td>' + e(x.reference) + '</td><td>' + e(x.typeVente) + '</td><td>' + e(x.dateVente) + '</td><td class="n">' + N(x.montant)
                                    + '</td><td>' + e(x.operation) + '</td><td>' + e(x.motif || '—') + (x.commentaire ? ' : ' + e(x.commentaire) : '') + '</td><td>'
                                    + e(x.parQui) + '</td><td>' + e(x.quand) + '</td><td>' + e(x.encaissePar || '') + '</td></tr>';
                        }).join('') + '</tbody></table>' : '<div class="ae-vide">Aucune opération.</div>');
                c.getEl().dom.scrollTop = zone.offsetTop;
            },
            failure: function () {
                zone.innerHTML = '<div class="ae-vide">Indisponible : réessayer.</div>';
            }});
    },

    /* plan du 08/11, point 15.3 : vitesse des caissieres (15 premieres) ; secondes exactes en data-secondes */
    htmlCaissieres: function (l) {
        var e = Ext.String.htmlEncode, AE = testextjs.view.activiteequipes.ActiviteEquipes, N = AE.nombre;
        if (!l.length) {
            return '<div class="ae-vide">Aucune prévente encaissée sur la période.</div>';
        }
        var temps = function (s, n) {
            return '<td class="n" data-secondes="' + (s || 0) + '">' + (n ? AE.duree(s) : '—') + '</td>';
        };
        return '<style>.ae-caiss{border-collapse:collapse;width:100%;font-size:12px;margin:4px 0}.ae-caiss th{background:#e8eef7;color:#1a3d6d;'
                + 'text-align:left;padding:4px 6px;white-space:nowrap}.ae-caiss td{padding:3px 6px;border-bottom:1px solid #eef1f5}'
                + '.ae-caiss .n{text-align:right;white-space:nowrap}</style>'
                + '<table class="ae-caiss"><thead><tr><th>Caissière</th><th class="n">Préventes encaissées</th><th class="n">Mesurées</th>'
                + '<th class="n">Temps moyen</th><th class="n">Temps médian</th><th class="n">CA</th></tr></thead><tbody>'
                + Ext.Array.map(l.slice(0, 15), function (x) {
                    return '<tr data-id="' + e(x.id || '') + '"><td>' + e(x.nom || '') + '</td><td class="n"><b>' + N(x.encaissees) + '</b></td><td class="n">'
                            + N(x.mesurees) + '</td>' + temps(x.tempsMoyen, x.mesurees) + temps(x.tempsMedian, x.mesurees) + '<td class="n">'
                            + N(x.chiffreAffaires) + '</td></tr>';
                }).join('') + '</tbody></table>';
    },

    /* plan du 08/11, point 15.4 : tableau des preventes par vendeur (15 premiers), total en pied */
    htmlPreventes: function (l) {
        var e = Ext.String.htmlEncode, N = testextjs.view.activiteequipes.ActiviteEquipes.nombre;
        if (!l.length) {
            return '<div class="ae-vide">Aucune prévente sur la période.</div>';
        }
        var t = {encaissees: 0, chiffreAffaires: 0, lignes: 0, annulees: 0, abandonnees: 0, total: 0};
        Ext.each(l, function (x) {
            Ext.Object.each(t, function (k) {
                t[k] += x[k] || 0;
            });
        });
        var taux = function (x) {
            return x.total ? (Math.round(1000 * (x.annulees + x.abandonnees) / x.total) / 10) : 0;
        };
        var ligne = function (x, rang) {
            return '<tr data-id="' + e(x.id || '') + '"><td class="n">' + (rang || '') + '</td><td>' + e(x.nom || '') + '</td><td class="n"><b>' + N(x.encaissees) + '</b></td><td class="n">'
                    + N(x.chiffreAffaires) + '</td><td class="n">' + N(x.lignes) + '</td><td class="n">' + N(x.annulees) + '</td><td class="n">' + N(x.abandonnees)
                    + '</td><td class="n' + (taux(x) >= 5 ? ' ae-taux-haut' : '') + '">' + N(taux(x), true) + ' %</td></tr>';
        };
        return '<style>.ae-prev{border-collapse:collapse;width:100%;font-size:12px;margin:4px 0}.ae-prev th{background:#e8eef7;color:#1a3d6d;text-align:left;'
                + 'padding:4px 6px;white-space:nowrap}.ae-prev td{padding:3px 6px;border-bottom:1px solid #eef1f5}.ae-prev .n{text-align:right;white-space:nowrap}'
                + '.ae-prev .ae-taux-haut{color:#c0392b;font-weight:bold}</style>'
                + '<table class="ae-prev"><thead><tr><th class="n">#</th><th>Vendeur</th><th class="n">Encaissées</th><th class="n">CA</th><th class="n">Lignes</th>'
                + '<th class="n">Annulées</th><th class="n">Abandonnées</th><th class="n">Taux</th></tr></thead><tbody>'
                + Ext.Array.map(l.slice(0, 15), function (x, i) {
                    return ligne(x, i + 1);
                }).join('') + '</tbody><tfoot>' + ligne(Ext.apply({nom: 'Total (' + l.length + ' vendeurs)'}, t), '').replace('<tr', '<tr class="ae-prev-total"')
                .replace(/<td/g, '<th').replace(/<\/td>/g, '</th>') + '</tfoot></table>';
    },

    dessinerAnalyses: function (d) {
        var me = this, AE = testextjs.view.activiteequipes.ActiviteEquipes, N = AE.nombre, D = AE.duree, a = me.analyses;
        var periode = 'Comparé au ' + Ext.Date.format(Ext.Date.parse(d.debutPrecedent, 'Y-m-d'), 'd/m/Y') + ' – '
                + Ext.Date.format(Ext.Date.parse(d.finPrecedent, 'Y-m-d'), 'd/m/Y');
        if (d.garde) {
            periode = Ext.String.htmlEncode(d.garde.libelle) + ' : du ' + d.garde.debut + ' au ' + d.garde.fin + ', comparée à la même plage 7 jours plus tôt';
        }
        var valeur = function (i, v) {
            return i.format === 'DUREE' ? D(v) : i.format === 'POURCENT' ? N(v, true) + ' %' : i.format === 'MONTANT' ? N(v) + ' F' : N(v, v % 1 !== 0);
        };
        /* tuiles : valeurs qui montent jusqu'au chiffre (compteur anime), fleche coloree selon le sens favorable */
        a.down('#aeTuiles').update('<div class="ae-titre-bloc">Indicateurs <span style="font-weight:400;color:#64748b">— ' + periode + '</span></div>'
                + '<div class="ae-tuiles">' + Ext.Array.map(d.indicateurs, function (i, k) {
                    var e = '', cls = 'neutre';
                    if (i.evolution !== null && i.evolution !== undefined) {
                        var hausse = i.evolution > 0;
                        cls = i.evolution === 0 ? 'neutre' : (hausse === i.hausseFavorable ? 'bon' : 'mal');
                        e = (hausse ? '▲ +' : i.evolution < 0 ? '▼ ' : '= ') + N(i.evolution, true) + ' %';
                    }
                    return '<div class="ae-tuile" data-code="' + i.code + '" style="animation-delay:' + (k * 40) + 'ms" data-qtip="'
                            + Ext.String.htmlEncode(i.aide + (i.precedent !== null && i.precedent !== undefined ? ' — période précédente : ' + valeur(i, i.precedent) : ''))
                            + '"><div class="l">' + Ext.String.htmlEncode(i.libelle) + '</div><div class="v" data-cible="' + i.valeur + '" data-format="' + i.format
                            + '">' + valeur(i, i.valeur) + '</div><div class="e ' + cls + '">' + (e || '&nbsp;') + '</div></div>';
                }).join('') + '</div>');
        me.animerCompteurs(a.down('#aeTuiles').getEl(), d.indicateurs, valeur);
        a.down('#aeConstats').update('<div class="ae-titre-bloc">Aide à la décision</div><div class="ae-constats">'
                + Ext.Array.map(d.constats, function (c, k) {
                    var icone = c.niveau === 'ALERTE' ? '⚠ ' : c.niveau === 'CONSEIL' ? '💡 ' : 'ℹ ';
                    return '<div class="ae-constat ' + c.niveau + '" style="animation-delay:' + (k * 60) + 'ms"><b>' + icone + Ext.String.htmlEncode(c.titre)
                            + '</b>' + Ext.String.htmlEncode(c.texte) + '</div>';
                }).join('') + '</div>');

        me.st.heures.loadData(Ext.Array.map(d.heures, function (h) {
            return Ext.apply({libelle: h.heure + ' h'}, h);
        }));
        me.st.jours.loadData(Ext.Array.map(d.jours, function (j) {
            return {libelle: Ext.Date.format(Ext.Date.parse(j.date, 'Y-m-d'), 'd/m'), ventes: j.ventes, bl: j.bl,
                saisieVentes: Math.round(j.saisieVentes / 6) / 10, saisieBl: Math.round(j.saisieBl / 6) / 10};
        }));
        me.st.operateurs.loadData(Ext.Array.map(d.operateurs.slice(0, 15), function (o) {
            return Ext.apply({libelle: o.nom}, o);
        }));
        /* ventes longues : 15 operateurs puis « Autres », prepares par le serveur (total du graphique = tuile) */
        me.st.longues.loadData(Ext.Array.map(d.longues || [], function (o) {
            return Ext.apply({libelle: o.nom}, o);
        }));
        me.st.typesVente.loadData(Ext.Array.map(d.typesVente || [], function (o) {
            return Ext.apply({libelle: o.nom}, o);
        }));
        if (a.down('#aePreventes')) {
            a.down('#aePreventes').update(me.htmlPreventes(d.preventes || []));
        }
        if (a.down('#aeCaissieres')) {
            a.down('#aeCaissieres').update(me.htmlCaissieres(d.vitesseCaissieres || []));
        }
        me.st.grossistes.loadData(Ext.Array.map(d.grossistes, function (g) {
            return Ext.apply({libelle: g.nom}, g);
        }));
        me.st.retard.loadData(d.retardBl);
        me.st.sensibles.loadData(Ext.Array.map(d.sensibles.slice(0, 12), function (x) {
            return Ext.apply({libelle: x.nom}, x);
        }));
        me.st.repartition.loadData(Ext.Array.map(d.repartition.slice(0, 15), function (x) {
            var r = {libelle: x.nom, id: x.id};
            Ext.each(me.TACHES, function (t) {
                r[t] = x.actions[t] || 0;
            });
            return r;
        }));
        if (a.down('#aeGarde')) {
            a.down('#aeGarde').clearValue();
            a.down('#aeCartePeriode').disable();
        }
        a.down('#aeCarte').update(me.htmlCarte(d.carte, ''));
        if (d.seuilOperateur && !me.seuilModifie) {
            me.afficherSeuilEnregistre(d.seuilOperateur, d.seuilMinutes);
        }
        if (d.seuilLibelle) {
            me.seuilLibelle = d.seuilLibelle;
            a.down('#cLongues').setTitle(d.seuilLibelle);
            var axe = a.down('#gLongues').axes.getAt(0);
            if (axe && axe.setTitle) {
                axe.setTitle(d.seuilLibelle.replace(/^Ventes /, ''));
            }
        }
        a.down('#aeResume').update('<div class="ae-titre-bloc">Repères</div>' + AE.htmlResume(d.resume));
        /* graphique sans donnees : un message plutot qu'un cadre vide */
        Ext.each([['cHeures', 'heures'], ['cJours', 'jours'], ['cOperateurs', 'operateurs'], ['cTypesVente', 'typesVente'], ['cGrossistes', 'grossistes'], ['cRetard', 'retard'],
            ['cLongues', 'longues'], ['cSensibles', 'sensibles'], ['cRepartition', 'repartition']], function (x) {
            var p = a.down('#' + x[0]), vide = me.st[x[1]].getCount() === 0;
            p.setTitle(p.title.replace(/ — aucune donnée$/, '') + (vide ? ' — aucune donnée' : ''));
        });
    },

    animerCompteurs: function (el, indicateurs, valeur) {
        if (!el || !window.requestAnimationFrame) {
            return;
        }
        var cibles = el.query('.v'), debut = null, DUREE = 700;
        var pas = function (t) {
            debut = debut || t;
            var k = Math.min(1, (t - debut) / DUREE), lisse = 1 - Math.pow(1 - k, 3);
            Ext.each(cibles, function (c, i) {
                var ind = indicateurs[i], v = ind.valeur * lisse;
                c.innerHTML = valeur(ind, k < 1 ? (ind.format === 'NOMBRE' && ind.valeur % 1 === 0 ? Math.round(v) : v) : ind.valeur);
            });
            if (k < 1) {
                window.requestAnimationFrame(pas);
            }
        };
        window.requestAnimationFrame(pas);
    },

    htmlCarte: function (carte, titre) {
        var me = this, N = testextjs.view.activiteequipes.ActiviteEquipes.nombre, max = 0, m = {};
        Ext.each(carte, function (c) {
            m[c.jour * 100 + c.heure] = c.ventes;
            max = Math.max(max, c.ventes);
        });
        var nuit = function (h) {
            return h >= 21 || h < 6;
        };
        /* plan du 08/11, point 15.8 : toujours de 0 h a 23 h ; sans activite, case grise ; nuit (21 h - 6 h) reperee */
        var html = (titre ? '<div class="ae-carte-titre" style="font-weight:600;color:#1e3a5f;margin:2px 0 4px">' + Ext.String.htmlEncode(titre) + '</div>' : '')
                + (carte.length ? '' : '<div class="ae-vide">Aucune vente sur la période</div>')
                + '<table class="ae-carte"><tr><th></th>';
        for (var h = 0; h <= 23; h++) {
            html += '<th' + (nuit(h) ? ' class="n" style="color:#1e3a5f;background:#e2e8f0"' : '') + '>' + h + '</th>';
        }
        html += '</tr>';
        for (var j = 1; j <= 7; j++) {
            html += '<tr><th>' + me.JOURS[j] + '</th>';
            for (var h2 = 0; h2 <= 23; h2++) {
                var v = m[j * 100 + h2] || 0, t = max ? v / max : 0;
                /* du blanc au vert fonce ; texte blanc sur les cases foncees ; gris sans activite */
                var fond = v ? 'rgba(27,127,59,' + (0.12 + 0.88 * t).toFixed(2) + ')' : (nuit(h2) ? '#dfe4ea' : '#eef1f4');
                html += '<td class="c' + (v ? '' : ' vide') + '" style="background:' + fond + ';color:' + (t > 0.55 ? '#fff' : '#0f172a') + '" data-qtip="' + me.JOURS[j] + ' '
                        + h2 + ' h – ' + (h2 + 1) + ' h : ' + N(v) + ' ventes">' + (v ? N(v) : '') + '</td>';
            }
            html += '</tr>';
        }
        return html + '</table>';
    }
});

/* couleurs des series a plusieurs grandeurs (ExtJS 4.2 les prend dans le theme, dans l'ordre) */
Ext.define('Ext.chart.theme.AeCharge', {extend: 'Ext.chart.theme.Base', constructor: function (c) {
        this.callParent([Ext.apply({colors: ['#1b7f3b', '#7c3aed']}, c)]);
    }});
Ext.define('Ext.chart.theme.AeRetard', {extend: 'Ext.chart.theme.Base', constructor: function (c) {
        this.callParent([Ext.apply({colors: ['#1b7f3b', '#e6a700', '#c62828', '#94a3b8']}, c)]);
    }});
Ext.define('Ext.chart.theme.AeSensibles', {extend: 'Ext.chart.theme.Base', constructor: function (c) {
        this.callParent([Ext.apply({colors: ['#c62828', '#e67e22']}, c)]);
    }});
Ext.define('Ext.chart.theme.AeTaches', {extend: 'Ext.chart.theme.Base', constructor: function (c) {
        this.callParent([Ext.apply({colors: ['#1b7f3b', '#2563eb', '#7c3aed', '#0891b2', '#b45309', '#475569', '#be185d', '#c62828', '#e67e22']}, c)]);
    }});
