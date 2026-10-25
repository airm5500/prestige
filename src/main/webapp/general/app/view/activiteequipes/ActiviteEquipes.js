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
                    + '.ae-graphe .x-toolbar.ae-seuil{background:#f8fafc;border:0;border-bottom:1px solid #eef2f7;padding:4px 12px}',
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
        me.donnees = me.creerDonnees();
        me.analyses = me.creerAnalyses();
        me.anomaliesPanel = me.creerAnomalies();
        Ext.apply(me, {
            items: [me.donnees, me.analyses, me.anomaliesPanel],
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', itemId: 'ongletsAe', cls: 'cec-onglets', layout: {type: 'hbox', pack: 'start', align: 'middle'},
                    items: Ext.Array.map(me.ONGLETS, function (o) {
                        return {xtype: 'button', itemId: 'ae-' + o.cle, text: o.texte, cls: 'cec-onglet', toggleGroup: 'ae-onglets-' + me.id,
                            allowDepress: false, pressed: o.cle === 'donnees', tooltip: o.aide, handler: function () {
                                me.afficher(o.cle);
                            }};
                    })
                }, {
                    xtype: 'toolbar', dock: 'top', itemId: 'aeFiltres', items: [
                        {xtype: 'datefield', itemId: 'aeDebut', fieldLabel: 'Du', labelWidth: 22, width: 135, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: Ext.Date.getFirstDateOfMonth(aujourdhui), maxValue: aujourdhui},
                        {xtype: 'datefield', itemId: 'aeFin', fieldLabel: 'au', labelWidth: 20, width: 133, format: 'd/m/Y', submitFormat: 'Y-m-d',
                            value: aujourdhui, maxValue: aujourdhui, plugins: [{ptype: 'raccourcisperiode', debut: 'aeDebut', declencher: 'aeActualiser'}]},
                        {xtype: 'combobox', itemId: 'aeEmploye', fieldLabel: 'Employé', labelWidth: 55, width: 270, store: me.employes,
                            queryMode: 'local', displayField: 'nom', valueField: 'id', emptyText: 'Tous les employés', forceSelection: true,
                            anyMatch: true, editable: true, typeAhead: true,
                            tpl: Ext.create('Ext.XTemplate', '<tpl for="."><div class="x-boundlist-item">{nom:htmlEncode}'
                                    + '<tpl if="!actif"> <span style="color:#94a3b8">(inactif)</span></tpl></div></tpl>'),
                            listeners: {
                                select: function () {
                                    me.actualiser();
                                }
                            }},
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
        }, me, {single: true});
    },

    /* filtres communs, au format des routes */
    viderChamps: function () {
        var me = this, aujourdhui = Ext.Date.clearTime(new Date());
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
        return {debut: me.down('#aeDebut').getSubmitValue(), fin: me.down('#aeFin').getSubmitValue(), employeId: e || ''};
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
        me.journal.loadPage(1);
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
        if (cle === 'anomalies') {
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
        Ext.each(['heures', 'jours', 'operateurs', 'grossistes', 'retard', 'sensibles', 'repartition'], function (k) {
            me.st[k] = Ext.create('Ext.data.Store', {fields: [{name: 'libelle'}, {name: 'id'}, {name: 'ventes', type: 'float'},
                    {name: 'saisieMoyenne', type: 'float'}, {name: 'saisieVentes', type: 'float'}, {name: 'saisieBl', type: 'float'},
                    {name: 'bl', type: 'float'}, {name: 'secondesParLigne', type: 'float'}, {name: 'ventesParJour', type: 'float'},
                    {name: 'lignesParVente', type: 'float'}, {name: 'panierMoyen', type: 'float'}, {name: 'chiffreAffaires', type: 'float'},
                    {name: 'ventesLongues', type: 'float'}, {name: 'jours', type: 'float'}, {name: 'lignesParBl', type: 'float'},
                    {name: 'nombre', type: 'float'}, {name: 'annulations', type: 'float'}, {name: 'modifications', type: 'float'},
                    {name: 'remises', type: 'float'}, {name: 'tauxAnnulation', type: 'float'}, {name: 'total', type: 'float'}]
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
                        return '<b>' + Ext.String.htmlEncode(r.get('libelle')) + '</b><br>' + N(r.get('secondesParLigne'), true) + ' s par ligne<br>'
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
                        return '<b>' + r.get('libelle') + '</b><br>' + N(r.get('nombre')) + ' BL (' + Math.round(r.get('nombre') * 100 / total) + ' %)';
                    })}]};

        var longues = {xtype: 'chart', itemId: 'gLongues', animate: true, shadow: false, store: me.st.operateurs,
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
                {xtype: 'component', itemId: 'aeConstats', html: ''},
                {xtype: 'container', layout: 'column', items: [
                        me.cadre('cHeures', 'Affluence et vitesse par heure', 'Barres : ventes ouvertes à chaque heure. Courbe : saisie moyenne d\'une vente. '
                                + 'Une saisie qui s\'allonge aux heures chargées signale un poste qui manque.', heures),
                        me.cadre('cCarte', 'Carte d\'affluence (jour × heure)', 'Plus la case est foncée, plus il y a de ventes : pour placer les présences '
                                + 'et les pauses.', {xtype: 'component', itemId: 'aeCarte', autoScroll: true, html: ''}),
                        me.cadre('cJours', 'Charge au clavier par jour', 'Temps cumulé passé à saisir les ventes et les BL, jour par jour : base du planning.', jours, 1),
                        me.cadre('cOperateurs', 'Vitesse par opérateur', 'Secondes par ligne scannée ou cherchée. C\'est une aide pour accompagner '
                                + '(douchette, formation), pas un classement. Cliquer une barre filtre sur l\'employé.', operateurs),
                        me.cadre('cGrossistes', 'Saisie des BL par grossiste', 'Temps par ligne de BL, de la commande à la clôture du BL (BL de plus de 4 h écartés). '
                                + 'Un grossiste lent justifie de demander des BL électroniques.', grossistes),
                        me.cadre('cRetard', 'Délai de saisie des BL', 'Écart entre la date de livraison et l\'entrée du BL. Tant qu\'un BL n\'est pas saisi, '
                                + 'le stock est faux.', retard),
                        Ext.apply(me.cadre('cLongues', 'Ventes de plus de 10 min', 'Vente laissée ouverte, poste mal utilisé ou client hésitant : à rapprocher '
                                + 'des mises en attente. Le critère de durée se règle au-dessus du graphique.', longues), {dockedItems: [me.barreSeuil()]}),
                        me.cadre('cSensibles', 'Actions sensibles', 'Annulations et modifications de ventes par employé ; remises dans l\'infobulle. '
                                + 'À rapprocher de la caisse.', sensibles),
                        me.cadre('cRepartition', 'Répartition des tâches', 'Ce que fait chaque employé sur la période, par type d\'action.', repartition)
                    ]}
            ]
        });
    },

    /* retour du 24/10 : critere de duree des ventes (operateur et minutes), 10 min par defaut */
    barreSeuil: function () {
        var me = this, relancer = function () {
            var m = me.down('#aeSeuilMin');
            if (m && m.isValid() && m.getValue()) {
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
                {xtype: 'tbtext', text: 'min'}]};
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
                        {header: 'Ventes longues', dataIndex: 'ventesLongues', width: 115, align: 'right', renderer: nb},
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
        if (me.down('#aeSeuilOp')) {
            f.seuilOperateur = me.down('#aeSeuilOp').getValue();
            f.seuilMinutes = me.down('#aeSeuilMin').getValue();
        }
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
            },
            failure: function (r) {
                if (!a.isDestroyed) {
                    a.setLoading(false);
                    a.down('#aeTuiles').update('<div class="ae-vide">Le serveur n\'a pas répondu (' + r.status + ').</div>');
                }
            }});
    },

    dessinerAnalyses: function (d) {
        var me = this, AE = testextjs.view.activiteequipes.ActiviteEquipes, N = AE.nombre, D = AE.duree, a = me.analyses;
        var periode = 'Comparé au ' + Ext.Date.format(Ext.Date.parse(d.debutPrecedent, 'Y-m-d'), 'd/m/Y') + ' – '
                + Ext.Date.format(Ext.Date.parse(d.finPrecedent, 'Y-m-d'), 'd/m/Y');
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
        a.down('#aeCarte').update(me.htmlCarte(d.carte));
        if (d.seuilLibelle) {
            me.seuilLibelle = d.seuilLibelle;
            a.down('#cLongues').setTitle(d.seuilLibelle);
            var axe = a.down('#gLongues').axes.getAt(0);
            if (axe && axe.setTitle) {
                axe.setTitle(d.seuilLibelle.replace(/^Ventes /, ''));
            }
        }
        /* graphique sans donnees : un message plutot qu'un cadre vide */
        Ext.each([['cHeures', 'heures'], ['cJours', 'jours'], ['cOperateurs', 'operateurs'], ['cGrossistes', 'grossistes'], ['cRetard', 'retard'],
            ['cLongues', 'operateurs'], ['cSensibles', 'sensibles'], ['cRepartition', 'repartition']], function (x) {
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

    htmlCarte: function (carte) {
        var me = this, N = testextjs.view.activiteequipes.ActiviteEquipes.nombre, max = 0, m = {}, hmin = 23, hmax = 0;
        Ext.each(carte, function (c) {
            m[c.jour * 100 + c.heure] = c.ventes;
            max = Math.max(max, c.ventes);
            hmin = Math.min(hmin, c.heure);
            hmax = Math.max(hmax, c.heure);
        });
        if (!carte.length) {
            return '<div class="ae-vide">Aucune vente sur la période</div>';
        }
        var html = '<table class="ae-carte"><tr><th></th>';
        for (var h = hmin; h <= hmax; h++) {
            html += '<th>' + h + '</th>';
        }
        html += '</tr>';
        for (var j = 1; j <= 7; j++) {
            html += '<tr><th>' + me.JOURS[j] + '</th>';
            for (var h2 = hmin; h2 <= hmax; h2++) {
                var v = m[j * 100 + h2] || 0, t = max ? v / max : 0;
                /* du blanc au vert fonce ; texte blanc sur les cases foncees */
                var fond = v ? 'rgba(27,127,59,' + (0.12 + 0.88 * t).toFixed(2) + ')' : '#f1f5f9';
                html += '<td class="c" style="background:' + fond + ';color:' + (t > 0.55 ? '#fff' : '#0f172a') + '" data-qtip="' + me.JOURS[j] + ' '
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
