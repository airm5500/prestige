/* global Ext */

/**
 * Menu de pilotage (évolution 6, point 1).
 *
 * L'onglet affiché est le SEUL à être chargé : un onglet caché n'a pas à interroger le serveur, et la requête
 * de marge passe par le détail des ventes — la lancer pour trois onglets à chaque changement de période
 * mettrait le pool de connexions de l'officine à genoux.
 *
 * Le changement d'axe de comparaison recharge l'onglet courant, et lui seul. Les autres se rechargeront quand
 * on les ouvrira : le serveur garde son résultat quelques minutes, l'aller-retour est donc immédiat.
 */
Ext.define('testextjs.controller.PilotageCtr', {
    extend: 'Ext.app.Controller',

    views: ['testextjs.view.pilotage.PilotageManager'],

    refs: [
        {ref: 'ecran', selector: 'pilotage'},
        {ref: 'onglets', selector: 'pilotage #onglets'}
    ],

    init: function () {
        var me = this;
        me.control({
            'pilotage': {afterrender: me.surAffichage},
            'pilotage #onglets': {tabchange: me.surChangementOnglet},
            'pilotage #barrePeriode combobox[itemId=axe]': {select: me.surChangementAxe},
            'pilotage #barrePeriode button[itemId=actualiser]': {click: me.actualiser},
            'pilotage #barrePeriode button[itemId=recalculer]': {click: me.recalculer},
            'pilotage #barrePeriode menuitem[itemId=imprimerPdf]': {click: me.imprimer},
            'pilotage #barrePeriode menuitem[itemId=exporterExcel]': {click: me.exporter},
            'pilotage #filtresAchats combobox[itemId=grossiste]': {select: me.actualiser},
            'pilotage #filtresAchats combobox[itemId=famille]': {select: me.actualiser},
            'pilotage #filtresAchats combobox[itemId=emplacement]': {select: me.actualiser},
            'pilotage #filtresAchats button[itemId=reinitialiserAchats]': {click: me.reinitialiserAchats},
            'pilotage #casesKpi checkbox': {change: me.surCaseKpi},
            'pilotage #choixComparateur combobox[itemId=typeComparaison]': {select: me.surTypeComparaison},
            'pilotage #choixComparateur combobox[itemId=objetA]': {select: me.actualiser},
            'pilotage #choixComparateur combobox[itemId=objetB]': {select: me.actualiser},
            'pilotage #choixComparateur combobox[itemId=grandeurComparee]': {select: me.actualiser}
        });
    },

    surAffichage: function (ecran) {
        var me = this;
        ecran.storeFamilles.load();
        /*
         * Le catalogue des KPI vient du serveur : on construit les cases a cocher a partir de lui, et non
         * d'une liste ecrite dans l'ecran - un indicateur ne peut donc pas exister dans la liste sans exister
         * dans le calcul.
         */
        ecran.storeKpis.load({callback: function () {
                me.construireCasesKpi();
            }});
        ecran.storeEmplacements.load();
        ecran.storeAxes.load({
            callback: function () {
                var axe = ecran.down('#barrePeriode #axe');
                if (axe && !axe.getValue()) {
                    axe.setValue('MOIS');
                }
                me.actualiser();
            }
        });
    },

    /**
     * Reprend les agrégats des mois affichés, puis recharge l'onglet.
     *
     * Le seul geste qui reprend un mois déjà clos : le reste du temps, un mois passé est lu tel qu'il a été
     * calculé — c'est ce qui rend l'écran rapide. On demande confirmation, parce que sur une longue fenêtre
     * le recalcul peut prendre une minute.
     */
    recalculer: function () {
        var me = this;
        var ecran = me.getEcran();
        Ext.Msg.confirm('Pilotage',
                'Reprendre le calcul des mois affichés à partir des ventes et des achats ?<br><br>'
                + '<i>À faire après une correction portant sur un mois déjà passé (vente annulée, bon de '
                + 'livraison saisi en retard). Sur une longue période, cela peut demander une minute.</i>',
                function (reponse) {
                    if (reponse !== 'yes') {
                        return;
                    }
                    var onglet = ecran.down('#onglet-' + me.ongletCourant());
                    if (onglet) {
                        onglet.setLoading('Recalcul des mois affichés...');
                    }
                    Ext.Ajax.request({
                        url: '../api/v1/pilotage/recalculer',
                        method: 'GET',
                        params: me.parametres(),
                        timeout: 600000,
                        callback: function () {
                            if (onglet) {
                                onglet.setLoading(false);
                            }
                        },
                        success: function (reponse) {
                            var r = Ext.decode(reponse.responseText, true) || {};
                            Ext.Msg.alert('Pilotage', r.message || 'Recalcul terminé.');
                            /* Le cache d'écran a été vidé côté serveur : un simple rechargement suffit. */
                            me.actualiser();
                        },
                        failure: function () {
                            Ext.Msg.alert('Pilotage', 'Le recalcul n\'a pas pu être mené à son terme.');
                        }
                    });
                });
    },

    /** Le code de l'onglet visible : c'est lui, et lui seul, qu'on charge. */
    ongletCourant: function () {
        var onglets = this.getOnglets();
        var actif = onglets ? onglets.getActiveTab() : null;
        return actif ? actif.cleOnglet : 'synthese';
    },

    surChangementOnglet: function () {
        var me = this;
        if (me.ongletCourant() === 'achats') {
            /* La liste des grossistes depend de la fenetre regardee : on la recharge avec l'onglet. */
            var ecran = me.getEcran();
            ecran.storeGrossistes.getProxy().extraParams = me.parametres();
            ecran.storeGrossistes.load();
        }
        me.actualiser();
    },

    /**
     * Les deux dates ne servent QUE pour l'axe « période personnalisée » : ailleurs, elles n'auraient aucun
     * sens et sont grisées plutôt que laissées actives sans effet.
     */
    surChangementAxe: function () {
        var me = this;
        var ecran = me.getEcran();
        var perso = ecran.down('#barrePeriode #axe').getValue() === 'PERSO';
        Ext.each(['#dtStart', '#dtEnd'], function (s) {
            var champ = ecran.down('#barrePeriode ' + s);
            if (champ) {
                champ.setDisabled(!perso);
            }
        });
        if (perso) {
            var debut = ecran.down('#barrePeriode #dtStart');
            var fin = ecran.down('#barrePeriode #dtEnd');
            if (!debut.getValue()) {
                debut.setValue(Ext.Date.getFirstDateOfMonth(new Date()));
            }
            if (!fin.getValue()) {
                fin.setValue(new Date());
            }
        }
        me.actualiser();
    },

    parametres: function () {
        var ecran = this.getEcran();
        var lire = function (selecteur) {
            var c = ecran.down('#barrePeriode ' + selecteur);
            return c ? c.getValue() : null;
        };
        var jour = function (selecteur) {
            var v = lire(selecteur);
            return v ? Ext.Date.format(v, 'Y-m-d') : '';
        };
        var parametres = {axe: lire('#axe') || 'MOIS', dtStart: jour('#dtStart'), dtEnd: jour('#dtEnd')};
        /* Les filtres n'existent que dans l'onglet Achats : ailleurs ils ne sont pas envoyes. */
        var filtres = ecran.down('#filtresAchats');
        if (filtres) {
            parametres.grossisteId = filtres.down('#grossiste').getValue() || '';
            parametres.familleId = filtres.down('#famille').getValue() || '';
            parametres.emplacementId = filtres.down('#emplacement').getValue() || '';
        }
        var cases = ecran.down('#casesKpi');
        if (cases) {
            var coches = [];
            Ext.each(cases.query('checkbox'), function (c) {
                if (c.getValue()) {
                    coches.push(c.cleKpi);
                }
            });
            parametres.kpis = coches.join(',');
        }
        var comparateur = ecran.down('#choixComparateur');
        if (comparateur) {
            parametres.type = comparateur.down('#typeComparaison').getValue() || 'GRANDEUR';
            parametres.objetA = comparateur.down('#objetA').getValue() || '';
            parametres.objetB = comparateur.down('#objetB').getValue() || '';
            parametres.grandeur = comparateur.down('#grandeurComparee').getValue() || 'caTTC';
        }
        return parametres;
    },

    /**
     * Les cases à cocher des KPI, construites depuis le catalogue du serveur et groupées par famille
     * d'indicateurs. Trois sont cochées au départ — chiffre d'affaires, clients servis, panier moyen — parce
     * qu'un écran d'analyse qui s'ouvre vide ne dit rien à personne.
     */
    construireCasesKpi: function () {
        var me = this;
        var ecran = me.getEcran();
        var cases = ecran ? ecran.down('#casesKpi') : null;
        if (!cases || cases.items.getCount() > 0) {
            return;
        }
        var parDefaut = ['caTTC', 'nbVentes', 'panier'];
        var items = [];
        ecran.storeKpis.each(function (r) {
            items.push({
                xtype: 'checkbox',
                cleKpi: r.get('cle'),
                itemId: 'kpi-' + r.get('cle'),
                boxLabel: r.get('libelle') + (r.get('famille') ? ' <span style="color:#8a99a8">('
                        + r.get('famille') + ')</span>' : ''),
                checked: parDefaut.indexOf(r.get('cle')) >= 0,
                margin: '0 12 2 0'
            });
        });
        cases.add(items);
    },

    /* Chaque coche relance l'analyse : c'est le geste attendu, et le serveur garde son résultat quelques
     * minutes, donc l'aller-retour est court. */
    surCaseKpi: function () {
        if (this.ongletCourant() === 'kpi') {
            this.actualiser();
        }
    },

    /**
     * Le type de comparaison décide de ce que sont A et B : deux grandeurs (le choix se fait dans le catalogue
     * des KPI), ou deux objets de même nature — et il faut alors dire SUR QUOI on les compare.
     */
    surTypeComparaison: function () {
        var me = this;
        var ecran = me.getEcran();
        var barre = ecran.down('#choixComparateur');
        var type = barre.down('#typeComparaison').getValue();
        var a = barre.down('#objetA');
        var bb = barre.down('#objetB');
        var grandeur = barre.down('#grandeurComparee');
        var poser = function (champ, store, affiche, valeur, premier) {
            champ.bindStore(store);
            champ.displayField = affiche;
            champ.valueField = valeur;
            champ.setValue(premier);
        };
        if (type === 'GRANDEUR') {
            poser(a, ecran.storeKpis, 'libelle', 'cle', 'caTTC');
            poser(bb, ecran.storeKpis, 'libelle', 'cle', 'achatTTC');
            grandeur.setDisabled(true);
        } else if (type === 'FAMILLE') {
            poser(a, ecran.storeFamilles, 'libelle', 'id', null);
            poser(bb, ecran.storeFamilles, 'libelle', 'id', null);
            grandeur.setDisabled(false);
        } else if (type === 'RAYON') {
            poser(a, ecran.storeEmplacements, 'libelle', 'id', null);
            poser(bb, ecran.storeEmplacements, 'libelle', 'id', null);
            grandeur.setDisabled(false);
        } else {
            /* Un grossiste ne vend rien : la grandeur est imposée, et l'écran le dit. */
            ecran.storeGrossistes.getProxy().extraParams = me.parametres();
            ecran.storeGrossistes.load();
            poser(a, ecran.storeGrossistes, 'libelle', 'id', null);
            poser(bb, ecran.storeGrossistes, 'libelle', 'id', null);
            grandeur.setDisabled(true);
        }
        me.actualiser();
    },

    reinitialiserAchats: function () {
        var ecran = this.getEcran();
        Ext.each(['#grossiste', '#famille', '#emplacement'], function (s) {
            var c = ecran.down('#filtresAchats ' + s);
            if (c) {
                c.setValue(null);
            }
        });
        this.actualiser();
    },

    actualiser: function () {
        var me = this;
        var ecran = me.getEcran();
        if (!ecran) {
            return;
        }
        var cle = me.ongletCourant();
        var stores = ecran.stores[cle];
        var onglet = ecran.down('#onglet-' + cle);
        if (onglet) {
            onglet.setLoading('Rassemblement des chiffres...');
        }
        /*
         * NUMÉRO DE DEMANDE, par onglet.
         *
         * Cocher trois indicateurs de suite lance trois requêtes, et rien ne garantit que les réponses
         * arrivent dans l'ordre : l'écran pouvait donc afficher le résultat d'une demande dépassée — trois
         * tuiles alors que cinq indicateurs étaient cochés. Chaque réponse porte son numéro et n'est appliquée
         * que si c'est encore la dernière demandée. Défaut vu au banc.
         */
        me.demandes = me.demandes || {};
        me.demandes[cle] = (me.demandes[cle] || 0) + 1;
        var numero = me.demandes[cle];
        Ext.Ajax.request({
            url: '../api/v1/pilotage/onglet/' + encodeURIComponent(cle),
            method: 'GET',
            params: me.parametres(),
            timeout: 180000,
            callback: function () {
                if (onglet && numero === me.demandes[cle]) {
                    onglet.setLoading(false);
                }
            },
            success: function (reponse) {
                if (numero !== me.demandes[cle]) {
                    /* Une demande plus récente est partie : cette réponse est périmée. */
                    return;
                }
                var r = Ext.decode(reponse.responseText, true) || {};
                if (r.success !== true) {
                    Ext.Msg.alert('Pilotage', r.message || 'Les chiffres n\'ont pas pu être rassemblés.');
                    return;
                }
                me.afficherAxe(r.axe);
                /*
                 * Les colonnes variables - modes de règlement, grossistes - doivent être connues du modèle
                 * AVANT le chargement : un champ ajouté après coup n'existe pas dans les enregistrements
                 * déjà chargés, et la colonne affiche alors NaN. C'est le défaut signalé le 19/09.
                 */
                me.declarerChamps(stores.mois, r.modes);
                me.declarerChamps(stores.mois, r.grossistesColonnes);
                me.declarerChamps(stores.detail, r.modes);
                me.declarerChamps(stores.detail, r.grossistesColonnes);
                stores.tuiles.loadData(r.tuiles || []);
                stores.mois.loadData(r.mois || []);
                /*
                 * Le même contenu, dans l'autre sens : la courbe va du plus ancien au plus récent, le tableau
                 * part du mois actuel. slice() d'abord, pour ne pas retourner le tableau que la courbe lit.
                 */
                stores.detail.loadData((r.mois || []).slice().reverse());
                me.ajusterCourbeComparee(cle, r.axe);
                me.ajusterColonnesModes(cle, r.modes);
                me.afficherAchats(cle, r);
                me.afficherNote(cle, r);
                me.afficherKpi(cle, r);
                me.afficherComparateur(cle, r);
            },
            failure: function () {
                Ext.Msg.alert('Pilotage', 'Les chiffres n\'ont pas pu être rassemblés.');
            }
        });
    },

    /**
     * Le rappel de l'axe, sous la barre : il NOMME la période regardée, celle à laquelle on la compare, et
     * explique la règle retenue. Un écart de -3 % sans savoir ce qui est comparé à quoi ne veut rien dire.
     */
    afficherAxe: function (axe) {
        var champ = this.getEcran().down('#barrePeriode #rappelAxe');
        if (!champ || !axe) {
            return;
        }
        var texte = '<b>' + Ext.String.htmlEncode(axe.libelle || '') + '</b> (' + (axe.periode || '') + ')';
        if (axe.comparaison) {
            texte += ' comparé à <b>' + Ext.String.htmlEncode(axe.libelleReference || '') + '</b> ('
                    + (axe.periodeReference || '') + ')';
        }
        if (axe.explication) {
            texte += ' — <i>' + Ext.String.htmlEncode(axe.explication) + '</i>';
        }
        champ.setValue(texte);
    },

    /**
     * La seconde courbe, celle de la période comparée : nommée quand il y a une comparaison, masquée sinon.
     *
     * « Pourquoi quand je choisis la période "vs..." le graphe affiche juste une seule courbe alors que c'est
     * une comparaison entre 2 données » (19/09). Elle porte le libellé exact de la période comparée —
     * « Août 2026 (au 19) », « Septembre 2025 » — et non un « référence » qui n'apprendrait rien.
     */
    ajusterCourbeComparee: function (cle, axe) {
        if (cle === 'comparateur') {
            return;
        }
        var graphique = this.getEcran().down('#graphique-' + cle);
        if (!graphique || graphique.series.getCount() < 2) {
            return;
        }
        try {
            var seconde = graphique.series.getAt(1);
            var compare = axe && axe.comparaison === true;
            seconde.title = compare ? (axe.libelleReference || 'Période comparée') : 'Période comparée';
            graphique.series.getAt(0).title = axe && axe.libelle ? axe.libelle : 'Période choisie';
            if (compare) {
                seconde.showAll();
            } else {
                seconde.hideAll();
            }
            if (graphique.legend && graphique.legend.isLegend) {
                graphique.legend.create();
            }
            graphique.redraw();
        } catch (e) {
            /* Le tableau de chiffres reste juste : on ne perd que le dessin. */
        }
    },

    /** Ajoute au modèle du store les champs des colonnes variables qu'il ne connaît pas encore. */
    declarerChamps: function (store, colonnes) {
        if (!store || !colonnes || !colonnes.length) {
            return;
        }
        var champs = store.model.prototype.fields;
        Ext.each(colonnes, function (c) {
            if (c && c.cle && !champs.get(c.cle)) {
                champs.add(new Ext.data.Field({name: c.cle, type: 'float', defaultValue: 0}));
            }
        });
    },

    /**
     * Les colonnes de modes de règlement dépendent des modes RÉELLEMENT rencontrés sur la période : une
     * officine qui active un nouveau mode le voit apparaître sans qu'on touche au code.
     */
    ajusterColonnesModes: function (cle, modes) {
        if (cle !== 'ventes' || !modes) {
            return;
        }
        var ecran = this.getEcran();
        var grille = ecran.down('#detail-ventes');
        if (!grille) {
            return;
        }
        var store = ecran.stores.ventes.detail;
        var champs = store.model.prototype.fields;
        Ext.each(modes, function (mode) {
            if (!champs.get(mode.cle)) {
                /* Le modèle du store doit connaître le champ avant que la colonne ne le lise. */
                store.model.prototype.fields.add(new Ext.data.Field({name: mode.cle, type: 'float'}));
            }
        });
        var colonnes = ecran.colonnes('ventes');
        Ext.each(modes, function (mode) {
            colonnes.push({text: mode.libelle.toUpperCase(), dataIndex: mode.cle, width: 120, align: 'right',
                itemId: 'col-' + mode.cle,
                renderer: function (v) {
                    return testextjs.view.pilotage.PilotageManager.nombre(v);
                },
                summaryType: 'sum',
                summaryRenderer: function (v) {
                    var t = testextjs.view.pilotage.PilotageManager.nombre(v);
                    return t === '' ? '' : '<b>' + t + '</b>';
                }});
        });
        grille.reconfigure(store, colonnes);
    },

    /**
     * Onglet KPI : les colonnes du détail et la courbe suivent les cases cochées, et la fréquentation horaire
     * n'apparaît que si elle est demandée — c'est une requête de plus, et une lecture qui n'a rien à voir avec
     * les autres.
     */
    afficherKpi: function (cle, reponse) {
        if (cle !== 'kpi') {
            return;
        }
        var ecran = this.getEcran();
        var coches = reponse.coches || [];
        var store = ecran.stores.kpi.detail;
        var config = ecran.colonnes('kpi');
        var libelles = {};
        ecran.storeKpis.each(function (r) {
            libelles[r.get('cle')] = {libelle: r.get('libelle'), unite: r.get('unite')};
        });
        Ext.each(coches, function (k) {
            if (k === 'frequentation') {
                return;
            }
            var info = libelles[k] || {libelle: k, unite: ''};
            config.push({text: info.libelle.toUpperCase(), dataIndex: k, width: 150, align: 'right',
                itemId: 'col-' + k,
                renderer: function (v) {
                    if (v === null || v === undefined || isNaN(v)) {
                        return '';
                    }
                    /* Pas de séparateur décimal orphelin en fin de nombre : « 0, » se lisait dans le
                       détail des KPI — retour de l'officine du 19/09. */
                    var formater = testextjs.view.pilotage.PilotageManager.nombre;
                    return info.unite === '%' ? formater(v, '0,000.0') + ' %'
                            : formater(v, v % 1 === 0 ? '0,000' : '0,000.00');
                }});
        });
        ecran.down('#detail-kpi').reconfigure(store, config);

        /*
         * La fréquentation horaire est traitée AVANT la courbe, et la courbe est isolée dans un try/catch.
         * Sans cela, un redessin de graphique qui échoue (une série vide, une échelle impossible) emportait
         * tout ce qui venait après : la fréquentation restait masquée alors qu'elle avait été cochée. C'est
         * exactement la leçon des écouteurs de redimensionnement du 17/09 — une erreur isolée ne doit pas
         * annuler le reste du rafraîchissement.
         */
        var horaire = ecran.down('#frequentation');
        if (horaire) {
            var demandee = coches.indexOf('frequentation') >= 0;
            ecran.storeHoraire.loadData(reponse.horaire || []);
            horaire.setVisible(demandee);
        }

        /* La courbe suit le PREMIER indicateur coché : superposer des grandeurs d'échelles différentes
         * (un panier moyen et un chiffre d'affaires) donnerait une courbe illisible. */
        var premier = coches.filter(function (k) {
            return k !== 'frequentation';
        })[0];
        var graphique = ecran.down('#graphique-kpi');
        if (graphique && premier) {
            try {
                graphique.series.getAt(0).yField = premier;
                graphique.axes.getAt(0).fields = [premier];
                graphique.redraw();
            } catch (e) {
                /* Le tableau de chiffres, lui, reste juste : on ne perd que le dessin. */
            }
            var panneau = ecran.down('#graphiquePanneau-kpi');
            if (panneau) {
                panneau.setTitle('Évolution : ' + ((libelles[premier] || {}).libelle || premier));
            }
        }
    },

    /** Onglet Comparateur : les deux colonnes portent le NOM des objets comparés, pas « A » et « B ». */
    afficherComparateur: function (cle, reponse) {
        if (cle !== 'comparateur') {
            return;
        }
        var ecran = this.getEcran();
        var comparaison = reponse.comparaison || {};
        var grille = ecran.down('#detail-comparateur');
        if (grille) {
            var colonnes = grille.headerCt.getGridColumns();
            if (colonnes[1]) {
                colonnes[1].setText((comparaison.libelleA || 'A').toUpperCase());
            }
            if (colonnes[2]) {
                colonnes[2].setText((comparaison.libelleB || 'B').toUpperCase());
            }
        }
        var note = ecran.down('#choixComparateur #noteComparateur');
        if (note) {
            note.setValue('<i>' + Ext.String.htmlEncode(reponse.note || '') + '</i>');
        }
        /*
         * LES DEUX TERMES DE LA COMPARAISON SONT SUR LA COURBE. « Si je compare 2 valeurs les 2 doivent se
         * retrouver sur les courbes » : la courbe A et la courbe B portent le nom des objets comparés, et la
         * légende les distingue. Le dessin est isolé — une échelle impossible ne doit pas emporter le reste.
         */
        var graphique = ecran.down('#graphique-comparateur');
        if (graphique) {
            try {
                var titres = [comparaison.libelleA || 'Objet A', comparaison.libelleB || 'Objet B'];
                graphique.series.each(function (serie, index) {
                    if (titres[index]) {
                        serie.title = titres[index];
                    }
                });
                if (graphique.legend && graphique.legend.isLegend) {
                    graphique.legend.create();
                }
                graphique.redraw();
            } catch (e) {
                /* Le tableau de chiffres, lui, reste juste : on ne perd que le dessin. */
            }
        }
        var panneau = ecran.down('#graphiquePanneau-comparateur');
        if (panneau) {
            /* Comparer deux GRANDEURS : leurs noms disent déjà ce qui est mesuré, répéter la grandeur
               donnerait « Chiffre d'affaires et Achats — Chiffre d'affaires ». */
            var deuxGrandeurs = (comparaison.type || '') === 'GRANDEUR';
            panneau.setTitle('Évolution comparée : ' + (comparaison.libelleA || 'objet A') + ' et '
                    + (comparaison.libelleB || 'objet B')
                    + (!deuxGrandeurs && comparaison.libelleGrandeur ? ' — ' + comparaison.libelleGrandeur : ''));
        }
    },

    /**
     * La note des onglets Stock et Qualité : elle dit d'où viennent les chiffres. Pour le stock, une valeur
     * reconstituée et une valeur mesurée ne se lisent pas de la même façon ; pour la qualité, les indicateurs
     * de référentiel décrivent l'état du jour et non la période choisie.
     */
    afficherNote: function (cle, reponse) {
        var ecran = this.getEcran();
        var barre = ecran.down('#note-' + cle);
        if (!barre) {
            return;
        }
        var texte = barre.down('#texteNote');
        if (texte) {
            texte.setValue('<i>' + Ext.String.htmlEncode(reponse.note || '') + '</i>');
        }
    },

    /**
     * Onglet Achats : la répartition par grossiste, les colonnes par grossiste, et la NOTE qui dit sur quelle
     * base le montant est calculé — en-tête des bons, ou lignes retenues quand un filtre de famille ou
     * d'emplacement est posé. Sans cette note, l'officine croirait avoir perdu 4 % de ses achats en filtrant.
     */
    afficherAchats: function (cle, reponse) {
        if (cle !== 'achats') {
            return;
        }
        var ecran = this.getEcran();
        ecran.storeRepartition.loadData(reponse.repartition || []);
        var note = ecran.down('#filtresAchats #noteAchats');
        if (note) {
            note.setValue('<i>' + Ext.String.htmlEncode(reponse.note || '') + '</i>');
        }
        var grille = ecran.down('#detail-achats');
        var colonnes = reponse.grossistesColonnes || [];
        if (!grille || !colonnes.length) {
            return;
        }
        var store = ecran.stores.achats.detail;
        Ext.each(colonnes, function (g) {
            if (!store.model.prototype.fields.get(g.cle)) {
                store.model.prototype.fields.add(new Ext.data.Field({name: g.cle, type: 'float'}));
            }
        });
        var config = ecran.colonnes('achats');
        Ext.each(colonnes, function (g) {
            config.push({text: g.libelle.toUpperCase(), dataIndex: g.cle, width: 130, align: 'right',
                itemId: 'col-' + g.cle,
                renderer: function (v) {
                    return testextjs.view.pilotage.PilotageManager.nombre(v);
                },
                summaryType: 'sum',
                summaryRenderer: function (v) {
                    var t = testextjs.view.pilotage.PilotageManager.nombre(v);
                    return t === '' ? '' : '<b>' + t + '</b>';
                }});
        });
        grille.reconfigure(store, config);
    },

    /*
     * Les éditions s'ouvrent EN FLUX dans un onglet du navigateur, dans le clic qui les demande : « je ne veux
     * pas de pop up pour aucune édition ».
     */
    imprimer: function () {
        var p = this.parametres();
        p.onglet = this.ongletCourant();
        window.open('../api/v1/pilotage/pdf?' + Ext.Object.toQueryString(p));
    },

    exporter: function () {
        var p = this.parametres();
        p.onglet = this.ongletCourant();
        window.location = '../api/v1/pilotage/excel?' + Ext.Object.toQueryString(p);
    }
});
