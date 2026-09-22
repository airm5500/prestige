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
            'pilotage #barrePeriode button[itemId=actualiser]': {click: me.actualiserEtControler},
            'pilotage #barrePeriode button[itemId=recalculer]': {click: me.recalculer},
            'pilotage #barrePeriode menuitem[itemId=imprimerPdf]': {click: me.imprimer},
            'pilotage #barrePeriode menuitem[itemId=exporterExcel]': {click: me.exporter},
            'pilotage #filtresAchats combobox[itemId=grossiste]': {select: me.actualiser},
            'pilotage #filtresAchats combobox[itemId=famille]': {select: me.actualiser},
            'pilotage #filtresAchats combobox[itemId=emplacement]': {select: me.actualiser},
            'pilotage #filtresAchats button[itemId=reinitialiserAchats]': {click: me.reinitialiserAchats},
            'pilotage #casesKpi checkbox': {change: me.surCaseKpi},
            'pilotage #choixComparateur combobox[itemId=typeComparaison]': {select: me.surTypeComparaison},
            /* Les trois choix ne declenchent PLUS de requete : seul le bouton « Comparer » la lance. */
            'pilotage #choixComparateur button[itemId=comparer]': {click: me.comparer},
            /* Le selecteur vit desormais dans le titre du tableau, pas dans une barre a lui. */
            'pilotage combobox[itemId=decoupage]': {select: me.actualiser},
            'pilotage button[itemId=basculerCourbe]': {toggle: me.basculerCourbe},
            /* Un bouton d'export par detail mensuel : il reprend l'onglet ouvert et ses choix courants. */
            'pilotage button[itemId=exporterDetail]': {click: me.exporter}
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
                me.actualiserEtControler();
            }
        });
    },

    /**
     * Vérifie les corrections tardives, PUIS affiche.
     *
     * <p>
     * Ce contrôle relit le nombre de ventes et le chiffre d'affaires de tous les mois regardés pour les
     * comparer à ce qui est enregistré : c'est lui qui fait voir une vente annulée après coup sur un mois
     * déjà clos. Il coûte trois secondes et demie sur treize mois chez l'officine, mesurées le 20/09.
     *
     * <p>
     * Il est donc demandé DEUX FOIS SEULEMENT : à l'ouverture du menu, et quand on clique sur « Actualiser ».
     * Changer d'onglet n'en déclenche plus aucun — « je ne peux pas être dans ce menu et être en train de
     * faire des annulations au même moment ; je viens ici pour des analyses APRÈS annulations ». Les
     * chiffres ne bougent pas pendant qu'on les consulte.
     *
     * <p>
     * Si le contrôle échoue ou traîne, l'écran s'affiche quand même : il montrera ce qui est enregistré,
     * quitte à ne pas voir une correction faite entre-temps. Un garde-fou ne doit jamais empêcher de lire.
     */
    actualiserEtControler: function () {
        var me = this;
        var ecran = me.getEcran();
        if (!ecran) {
            return;
        }
        var onglet = ecran.down('#onglet-' + me.ongletCourant());
        if (onglet) {
            onglet.setLoading('Vérification des corrections apportées depuis le dernier calcul...');
        }
        Ext.Ajax.request({
            url: '../api/v1/pilotage/controler',
            method: 'GET',
            params: me.parametres(),
            timeout: 120000,
            callback: function () {
                if (onglet) {
                    onglet.setLoading(false);
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
                    me.suivreProgression(true);
                    Ext.Ajax.request({
                        url: '../api/v1/pilotage/recalculer',
                        method: 'GET',
                        params: me.parametres(),
                        timeout: 600000,
                        callback: function () {
                            me.suivreProgression(false);
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

    /**
     * La barre de progression du recalcul : elle suit l'avancement REEL, lu sur le serveur.
     *
     * <p>
     * Le serveur tient en memoire le nombre de mois faits et celui qui tourne ; l'ecran l'interroge chaque
     * seconde et remplit la barre. Cette lecture-la ne touche pas la base : elle repond meme pendant que le
     * recalcul occupe les connexions, ce qui est justement le moment ou l'on veut savoir ou l'on en est.
     *
     * <p>
     * Un echec de sondage n'interrompt rien : la barre garde sa derniere position et le recalcul continue.
     * On ne casse pas une operation longue parce qu'un affichage d'etat n'a pas repondu.
     */
    suivreProgression: function (demarrer) {
        var me = this;
        var ecran = me.getEcran();
        if (!ecran) {
            return;
        }
        var zone = ecran.down('#barrePeriode #zoneProgression');
        var barre = ecran.down('#barrePeriode #progression');
        if (me.tacheProgression) {
            Ext.TaskManager.stop(me.tacheProgression);
            me.tacheProgression = null;
        }
        if (!demarrer) {
            if (zone) {
                zone.hide();
            }
            if (barre) {
                barre.updateProgress(0, '');
            }
            return;
        }
        if (!zone || !barre) {
            return;
        }
        zone.show();
        barre.updateProgress(0, 'Préparation du recalcul...');
        me.tacheProgression = Ext.TaskManager.start({
            run: function () {
                Ext.Ajax.request({
                    url: '../api/v1/pilotage/avancement',
                    method: 'GET',
                    timeout: 10000,
                    success: function (reponse) {
                        var r = Ext.decode(reponse.responseText, true) || {};
                        if (!r.enCours || !r.total) {
                            return;
                        }
                        var part = Math.min(1, r.faits / r.total);
                        barre.updateProgress(part, r.etape + ' — ' + r.faits + ' mois sur ' + r.total
                                + ' (' + Math.round(part * 100) + ' %)');
                    },
                    failure: function () {
                        /* La barre garde sa position : le recalcul, lui, continue. */
                    }
                });
            },
            interval: 1000
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
        var decoupage = ecran.down('#decoupage');
        if (decoupage) {
            parametres.decoupage = decoupage.getValue() || 'TRIMESTRE';
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
        var cases = ecran ? ecran.down('#casesKpi #listeKpi') : null;
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
            /*
             * La frequentation horaire ne se lit pas par mois : mise en B face a un chiffre mensuel, sa courbe
             * restait a plat (21/09). Elle est ecartee des grandeurs comparables ; le croisement « chiffre par
             * heure » est un autre outil, propose a part.
             */
            var comparables = Ext.create('Ext.data.Store', {
                fields: ['cle', 'libelle', 'unite', 'famille', 'cumul'],
                data: Ext.Array.map(Ext.Array.filter(ecran.storeKpis.getRange(), function (r) {
                    return r.get('cle') !== 'frequentation';
                }), function (r) { return r.getData(); })
            });
            poser(a, comparables, 'libelle', 'cle', 'caTTC');
            poser(bb, comparables, 'libelle', 'cle', 'achatTTC');
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
        /*
         * Changer de type VIDE A et B : lancer la comparaison maintenant la lancerait sur du vide. L'ecran
         * attend que les deux objets soient choisis et que « Comparer » soit cliqué.
         */
        me.comparaisonDemandee = false;
        me.inviterAComparer('Choisissez A et B, puis cliquez sur « Comparer ».');
    },

    /**
     * Lance la comparaison, et elle seule.
     *
     * <p>
     * Les trois choix doivent etre faits : le type, l'objet A, l'objet B - et la grandeur quand on compare deux
     * objets de meme nature. « Ne pas lancer la recherche si un des 3 champs est vide » (20/09). Un champ
     * manquant est dit sur place, sans fenetre : c'est un oubli de saisie, pas un incident.
     */
    comparer: function () {
        var me = this;
        var barre = me.getEcran().down('#choixComparateur');
        if (!barre) {
            return;
        }
        var grandeur = barre.down('#grandeurComparee');
        var manquants = [];
        if (!barre.down('#typeComparaison').getValue()) {
            manquants.push('ce que l\'on compare');
        }
        if (!barre.down('#objetA').getValue()) {
            manquants.push('l\'objet A');
        }
        if (!barre.down('#objetB').getValue()) {
            manquants.push('l\'objet B');
        }
        if (!grandeur.isDisabled() && !grandeur.getValue()) {
            manquants.push('la grandeur comparée');
        }
        if (manquants.length) {
            me.inviterAComparer('Comparaison incomplète : il manque ' + manquants.join(', ') + '.');
            return;
        }
        me.comparaisonDemandee = true;
        me.actualiser();
    },

    /** Le message d'invite du comparateur, à la place des chiffres qu'on n'est pas allé chercher. */
    inviterAComparer: function (message) {
        var ecran = this.getEcran();
        if (!ecran) {
            return;
        }
        var note = ecran.down('#choixComparateur #noteComparateur');
        if (note) {
            note.setValue('<span style="color:#c0392b"><b>' + Ext.String.htmlEncode(message) + '</b></span>');
        }
        ecran.stores.comparateur.tuiles.loadData([]);
        ecran.stores.comparateur.mois.loadData([]);
        ecran.stores.comparateur.detail.loadData([]);
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
        if (cle === 'comparateur' && me.comparaisonDemandee !== true) {
            /* L'onglet le plus lourd du menu ne part pas tout seul : il attend « Comparer ». */
            me.inviterAComparer('Choisissez ce que vous comparez, puis cliquez sur « Comparer ».');
            return;
        }
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
                /* L'onglet Achats / Ventes aligne des PERIODES : le premier trimestre se lit avant le
                   quatrieme. Les series mensuelles, elles, partent du mois qu'on vient de finir. */
                stores.detail.loadData(r.ordreNaturel === true
                        ? (r.mois || []) : (r.mois || []).slice().reverse());
                me.ajusterCourbeComparee(cle, r.axe);
                me.ajusterColonnesModes(cle, r.modes);
                me.afficherAchats(cle, r);
                me.afficherNote(cle, r);
                me.afficherKpi(cle, r);
                me.afficherComparateur(cle, r);
                me.afficherAchatsVentes(cle, r);
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

    /**
     * Ajoute au modèle du store les champs des colonnes variables qu'il ne connaît pas encore.
     *
     * <p>
     * {@code useNull} distingue deux natures de champ, et la distinction compte. Un MONTANT absent vaut zéro :
     * il n'y a rien eu ce mois-là. Une VARIATION absente ne vaut pas zéro, elle n'existe pas : comparer à un
     * trimestre où l'on n'avait rien vendu n'a pas de sens. Sans cette distinction, chaque case sans référence
     * affichait « = 0,0 % », c'est-à-dire « pas de changement » là où il n'y a pas de comparaison.
     */
    declarerChamps: function (store, colonnes, useNull) {
        if (!store || !colonnes || !colonnes.length) {
            return;
        }
        var champs = store.model.prototype.fields;
        Ext.each(colonnes, function (c) {
            if (c && c.cle && !champs.get(c.cle)) {
                champs.add(new Ext.data.Field(useNull === true
                        ? {name: c.cle, type: 'float', useNull: true}
                        : {name: c.cle, type: 'float', defaultValue: 0}));
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
            colonnes.push({text: mode.libelle.toUpperCase(), dataIndex: mode.cle, width: 130, align: 'right',
                itemId: 'col-' + mode.cle,
                /*
                 * Le montant ET sa part du chiffre d'affaires du mois, dans la même cellule : une colonne de
                 * pourcentage par mode doublerait la largeur de la grille, qui porte déjà sept modes.
                 */
                renderer: function (v, meta, record, rowIndex, colIndex, store) {
                    var f = testextjs.view.pilotage.PilotageManager;
                    var montant = f.nombre(v);
                    return montant === '' ? ''
                            : montant + f.secondeLigne(v, record, rowIndex, store, mode.cle, {part: true});
                },
                summaryType: 'sum',
                summaryRenderer: function (v) {
                    var t = testextjs.view.pilotage.PilotageManager.nombre(v);
                    return t === '' ? '' : '<b>' + t + '</b>';
                }});
        });
        grille.reconfigure(store,
                testextjs.view.pilotage.PilotageManager.repartirLargeur(colonnes));
        this.dessinerModes(modes);
    },

    /**
     * L'évolution de chaque mode de règlement : UNE COURBE PAR MODE, avec son point sur chaque mois.
     *
     * Les aires empilées d'abord posées le 19/09 montraient la part de chacun, mais elles écrasaient les
     * petits modes contre l'axe et il fallait lire une épaisseur plutôt qu'un niveau. « Je préfère des
     * courbes d'évolution avec des piques sur chaque mois comme le chiffre d'affaires TTC mensuel »
     * (20/09) : ce sont donc les mêmes courbes, la même épaisseur de trait et les mêmes marqueurs que le
     * graphique voisin, et chaque point porte son infobulle.
     *
     * Posées au chargement, comme les colonnes du détail — l'officine peut activer un nouveau mode demain.
     * Le dessin est isolé : une échelle impossible ne doit pas emporter le reste du rafraîchissement.
     */
    dessinerModes: function (modes) {
        var graphique = this.getEcran().down('#graphique-modes');
        if (!graphique) {
            return;
        }
        /* Une palette lisible côte à côte, et stable d'un chargement à l'autre : le même mode garde sa
           couleur d'un mois sur l'autre, sans quoi la lecture n'apprendrait rien. */
        var couleurs = ['#1565c0', '#ef6c00', '#2e7d32', '#6a1b9a', '#c62828', '#00838f', '#f9a825', '#4e342e'];
        try {
            graphique.series.removeAll();
            var champs = [];
            Ext.each(modes, function (mode, i) {
                var couleur = couleurs[i % couleurs.length];
                champs.push(mode.cle);
                graphique.series.add(Ext.create('Ext.chart.series.Line', {
                    chart: graphique,
                    type: 'line',
                    axis: 'left',
                    xField: 'libelle',
                    yField: mode.cle,
                    title: mode.libelle,
                    smooth: false,
                    style: {stroke: couleur, 'stroke-width': 3, opacity: 1},
                    markerConfig: {radius: 4, type: 'circle', fill: couleur, stroke: couleur},
                    tips: testextjs.view.pilotage.PilotageManager.infobulle(function (record) {
                        var f = testextjs.view.pilotage.PilotageManager;
                        var v = record.get(mode.cle);
                        var ca = record.get('caTTC');
                        return '<b>' + Ext.String.htmlEncode(record.get('libelle') || '') + '</b><br>'
                                + Ext.String.htmlEncode(mode.libelle) + ' : ' + (f.nombre(v) || '—')
                                + (ca ? '<br>soit ' + f.nombre(v / ca * 100, '0,000.0')
                                        + ' % du chiffre d\'affaires du mois' : '');
                    })
                }));
            });
            if (champs.length) {
                graphique.axes.getAt(0).fields = champs;
            }
            if (graphique.legend && graphique.legend.isLegend) {
                graphique.legend.create();
            }
            graphique.redraw();
        } catch (e) {
            /* Le détail mensuel, lui, reste juste : on ne perd que le dessin. */
        }
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
            libelles[r.get('cle')] = {libelle: r.get('libelle'), unite: r.get('unite'),
                cumul: r.get('cumul')};
        });
        Ext.each(coches, function (k) {
            if (k === 'frequentation') {
                return;
            }
            var info = libelles[k] || {libelle: k, unite: '', cumul: true};
            var pourcent = info.unite === '%';
            var formater = function (v) {
                var f = testextjs.view.pilotage.PilotageManager;
                /* Pas de séparateur décimal orphelin en fin de nombre : « 0, » se lisait dans le
                   détail des KPI — retour de l'officine du 19/09. */
                return pourcent ? f.nombre(v, '0,000.0') + ' %'
                        : f.nombre(v, v % 1 === 0 ? '0,000' : '0,000.00');
            };
            config.push({text: info.libelle.toUpperCase(), dataIndex: k, width: 160, align: 'right',
                itemId: 'col-' + k,
                renderer: function (v) {
                    if (v === null || v === undefined || isNaN(v)) {
                        return '';
                    }
                    /* « Le detail mensuel peut rester basique » (21/09) : la valeur, rien d'autre. */
                    return formater(v);
                },
                /*
                 * LA LIGNE DE TOTAL N'EST PLUS VIDE (20/09). Elle additionne ce qui s'additionne et
                 * MOYENNE le reste : la somme de douze taux de marge ou de douze paniers moyens n'aurait
                 * aucun sens. Le pied le dit, pour qu'on ne lise pas une moyenne comme un cumul.
                 */
                summaryType: info.cumul === false ? 'average' : 'sum',
                summaryRenderer: function (v) {
                    if (v === null || v === undefined || isNaN(v)) {
                        return '';
                    }
                    return '<b>' + formater(v) + '</b>'
                            + (info.cumul === false ? '<div class="pilotage-seconde-ligne">moyenne</div>' : '');
                }});
        });
        ecran.down('#detail-kpi').reconfigure(store,
                testextjs.view.pilotage.PilotageManager.repartirLargeur(config));

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

        /* Une courbe par indicateur coché, cinq au plus : au-delà le graphique devient illisible. */
        this.dessinerKpis(coches.filter(function (k) {
            return k !== 'frequentation';
        }), libelles);
    },

    /** Un graphique neuf dans le panneau des KPI, avec exactement ces series ; minimum d'axe 0 ou libre (base 100). */
    reconstruireGraphiqueKpi: function (series, minimum) {
        var ecran = this.getEcran();
        var panneau = ecran.down('#graphiquePanneau-kpi');
        if (!panneau) {
            return;
        }
        var f = testextjs.view.pilotage.PilotageManager;
        var champs = Ext.Array.map(series, function (s) { return s.yField; });
        var axeY = f.axeMontants(champs.length ? champs : ['caTTC']);
        if (minimum === 0) {
            axeY.minimum = 0;
        } else {
            delete axeY.minimum;
        }
        panneau.removeAll(true);
        panneau.add({
            xtype: 'chart',
            itemId: 'graphique-kpi',
            animate: false,
            shadow: false,
            legend: series.length ? {position: 'top'} : false,
            insetPadding: f.INSET,
            store: ecran.stores.kpi.mois,
            axes: [axeY, f.axeMois()],
            series: series
        });
    },

    /** Nombre d'indicateurs qu'on accepte de tracer ensemble : au-delà, le graphique ne dit plus rien. */
    MAX_COURBES_KPI: 5,

    /**
     * Les courbes de l'onglet KPI : une par indicateur coché, cinq au plus, chacune sa couleur.
     *
     * <p>
     * <b>Le probleme des echelles.</b> Un chiffre d'affaires se compte en centaines de millions, un panier
     * moyen en milliers, un taux de marge en dizaines. Traces sur le meme axe, les deux derniers sont des
     * lignes plates collees a zero et n'apprennent rien - c'est la raison pour laquelle une seule courbe
     * etait tracee jusqu'ici.
     *
     * <p>
     * <b>La regle retenue avec l'officine</b> (20/09) : tant que les indicateurs coches sont du meme ordre de
     * grandeur, on trace les MONTANTS REELS, qui se lisent directement. Des qu'ils divergent, on passe en
     * BASE 100 - chaque courbe part de 100 a son premier mois et montre son EVOLUTION, ce qui rend
     * comparables des grandeurs qui ne le sont pas. L'ecran dit toujours laquelle des deux lectures il
     * affiche, et l'infobulle donne de toute facon la valeur reelle.
     */
    dessinerKpis: function (coches, libelles) {
        var me = this;
        var ecran = me.getEcran();
        var graphique = ecran.down('#graphique-kpi');
        var panneau = ecran.down('#graphiquePanneau-kpi');
        var avertissement = ecran.down('#casesKpi #avertissementKpi');
        if (!graphique) {
            return;
        }
        var traces = coches.slice(0, me.MAX_COURBES_KPI);
        /*
         * L'ECRAN PREVIENT PLUTOT QUE DE TRACER N'IMPORTE QUOI. Cocher huit indicateurs est legitime - le
         * TABLEAU les porte tous - mais le graphique n'en montre que cinq, et il vaut mieux le dire que
         * laisser croire a un oubli.
         */
        if (avertissement) {
            if (coches.length > traces.length) {
                avertissement.setValue('<span style="color:#b7791f"><b>' + coches.length
                        + ' indicateurs cochés : seuls les ' + traces.length
                        + ' premiers sont tracés sur le graphique.</b> Le détail mensuel, lui, les porte tous.'
                        + '</span>');
            } else {
                avertissement.setValue('');
            }
        }
        if (!traces.length) {
            /* Rien de coche : un cadre vide qui le dit, pas les restes du dessin precedent. */
            me.reconstruireGraphiqueKpi([], null);
            if (panneau) {
                panneau.setTitle('Évolution des indicateurs cochés — aucun indicateur coché');
            }
            return;
        }

        var store = ecran.stores.kpi.mois;
        /* L'ordre de grandeur de chaque indicateur sur la fenetre : c'est lui qui decide de la lecture. */
        var sommets = {};
        Ext.each(traces, function (k) {
            var maximum = 0;
            store.each(function (r) {
                var v = Math.abs(Number(r.get(k)));
                if (!isNaN(v) && v > maximum) {
                    maximum = v;
                }
            });
            sommets[k] = maximum;
        });
        var hauts = Ext.Array.filter(Ext.Object.getValues(sommets), function (v) {
            return v > 0;
        });
        /* Au-dela d'un facteur vingt-cinq entre le plus grand et le plus petit, le petit disparait. */
        var base100 = traces.length > 1 && hauts.length > 1
                && Math.max.apply(null, hauts) / Math.min.apply(null, hauts) > 25;

        /*
         * En base 100, chaque courbe est ramenee a son PREMIER MOIS RENSEIGNE. Un indicateur qui commence a
         * zero n'a pas de base : il garde sa valeur brute plutot que de faire diverger la courbe a l'infini.
         */
        if (base100) {
            me.declarerChamps(store, Ext.Array.map(traces, function (k) {
                return {cle: 'base100_' + k};
            }));
            var reperes = {};
            store.each(function (r) {
                Ext.each(traces, function (k) {
                    var v = Number(r.get(k));
                    if (reperes[k] === undefined && !isNaN(v) && v !== 0) {
                        reperes[k] = v;
                    }
                });
            });
            store.each(function (r) {
                Ext.each(traces, function (k) {
                    var v = Number(r.get(k));
                    /* On ecrit dans les donnees sans passer par set() : un indice d'affichage n'a pas a
                       marquer l'enregistrement comme modifie ni a declencher un rechargement. */
                    r.data['base100_' + k] = (reperes[k] && !isNaN(v)) ? v / reperes[k] * 100 : null;
                });
            });
        }

        /*
         * LE GRAPHIQUE EST RECONSTRUIT (21/09). Retirer les series d'un graphique ExtJS 4.2 ne retire pas leurs
         * traits : chaque redessin les empilait - « les memes couleurs se repetent » - et les deux courbes de
         * depart (periode choisie, periode comparee) restaient, la seconde a plat a zero : « la ligne du bas,
         * on ne sait pas a quoi elle sert ». On repart d'un graphique neuf, avec exactement les series cochees.
         */
        var couleurs = ['#1565c0', '#ef6c00', '#2e7d32', '#6a1b9a', '#c62828'];
        var series = [];
        Ext.each(traces, function (k, i) {
            var couleur = couleurs[i % couleurs.length];
            var champ = base100 ? 'base100_' + k : k;
            var info = libelles[k] || {libelle: k, unite: ''};
            series.push({
                type: 'line',
                axis: 'left',
                xField: 'libelle',
                yField: champ,
                title: info.libelle,
                smooth: false,
                style: {stroke: couleur, 'stroke-width': 3, opacity: 1},
                markerConfig: {radius: 4, type: 'circle', fill: couleur, stroke: couleur},
                tips: testextjs.view.pilotage.PilotageManager.infobulle(function (record) {
                    var f = testextjs.view.pilotage.PilotageManager;
                    var reelle = record.get(k);
                    var texte = '<b>' + Ext.String.htmlEncode(record.get('libelle') || '') + '</b><br>'
                            + Ext.String.htmlEncode(info.libelle) + ' : '
                            + (info.unite === '%' ? f.nombre(reelle, '0,000.0') + ' %' : f.nombre(reelle));
                    if (base100) {
                        /* La courbe montre un indice : l'infobulle donne LES DEUX, sans quoi on lirait
                           « 112 » comme un montant. */
                        texte += '<br>indice base 100 : ' + f.nombre(record.get(champ), '0,000.0');
                    }
                    return texte;
                })
            });
        });
        me.reconstruireGraphiqueKpi(series, base100 ? undefined : 0);
        if (panneau) {
            panneau.setTitle(traces.length === 1
                    ? 'Évolution : ' + ((libelles[traces[0]] || {}).libelle || traces[0])
                    : 'Évolution des indicateurs cochés'
                        + (base100 ? ' — base 100 au premier mois (échelles trop différentes pour être '
                                + 'superposées)' : ''));
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
     * ONGLET ACHATS / VENTES : trois années face à face, découpées en trimestres, semestres ou années.
     *
     * <p>
     * Les colonnes sont posées au chargement parce que les ANNÉES changent avec la date du jour : trois groupes
     * de trois colonnes — ventes, achats et leur ratio — plus la colonne des périodes. Chaque case porte son
     * montant, puis en petit le poids de la période dans son année, la variation par rapport à la même période
     * de l'année précédente et celle par rapport à la période précédente. Le détail en francs est dans
     * l'infobulle, pour que la cellule reste lisible.
     */
    afficherAchatsVentes: function (cle, reponse) {
        if (cle !== 'achatsventes') {
            return;
        }
        var ecran = this.getEcran();
        var grille = ecran.down('#detail-achatsventes');
        var annees = reponse.annees || [];
        if (!grille || !annees.length) {
            return;
        }
        var f = testextjs.view.pilotage.PilotageManager;
        var store = ecran.stores.achatsventes.detail;
        /* Tous les champs des trois années doivent exister AVANT le chargement, sinon les cellules affichent
           NaN : c'est le même piège que les colonnes de modes de règlement. */
        var montants = [];
        var variations = [];
        Ext.each(annees, function (an) {
            Ext.each(['ca', 'achat', 'ratio', 'poidsCa', 'poidsAchat'], function (suffixe) {
                montants.push({cle: 'an' + an + '_' + suffixe});
            });
            /* Une variation ABSENTE n'est pas une variation NULLE : la case doit rester muette. */
            Ext.each(['varCa', 'varCaTaux', 'varAchat', 'varAchatTaux', 'varRatio', 'varCaPrec',
                'varAchatPrec'], function (suffixe) {
                variations.push({cle: 'an' + an + '_' + suffixe});
            });
        });
        this.declarerChamps(store, montants);
        this.declarerChamps(store, variations, true);
        store.loadData(reponse.lignes || []);

        /*
         * Les mentions sous un montant : le poids dans l'annee, la variation par rapport a l'annee
         * precedente, celle par rapport a la periode d'avant.
         *
         * CHACUNE SUR SA LIGNE, et c'est ce qui permet au tableau de tenir sans defilement horizontal :
         * une seule ligne portant les trois mentions imposerait des colonnes de deux cents pixels, et le
         * ratio de la troisieme annee sortirait de l'ecran. Empilees, les colonnes descendent a cent
         * cinquante et les neuf colonnes tiennent.
         */
        var mentions = function (record, prefixe, quoi, an) {
            var out = [];
            /*
             * UNE PERIODE SANS ACTIVITE N'A RIEN A COMMENTER. Sans cette garde, chaque case vide portait
             * « = 0,0 % vs N-1 · = 0,0 % vs préc. » : trois lignes de bruit par case, sur un tableau qui en
             * compte neuf par ligne, pour ne rien dire.
             */
            if (!record.get(prefixe + quoi)) {
                return '';
            }
            var poids = record.get(prefixe + (quoi === 'ca' ? 'poidsCa' : 'poidsAchat'));
            if (poids) {
                out.push('<div class="pilotage-seconde-ligne">' + f.nombre(poids, '0,000.0')
                        + ' % de l\'an</div>');
            }
            var mention = function (valeur, suffixe) {
                if (valeur === null || valeur === undefined) {
                    return;
                }
                out.push('<div class="pilotage-seconde-ligne"><span class="pilotage-evol '
                        + f.sens(valeur) + '">' + f.fleche(valeur) + ' '
                        + f.nombre(Math.abs(valeur), '0,000.0') + ' %</span> ' + suffixe + '</div>');
            };
            /* « /2025 » plutot que « vs N-1 » : l'annee comparee est nommee, on ne la deduit pas. */
            mention(record.get(prefixe + (quoi === 'ca' ? 'varCaTaux' : 'varAchatTaux')), '/' + (an - 1));
            mention(record.get(prefixe + (quoi === 'ca' ? 'varCaPrec' : 'varAchatPrec')), '/préc.');
            return out.join('');
        };

        var colonneMontant = function (an, quoi, texte) {
            var prefixe = 'an' + an + '_';
            var champ = prefixe + quoi;
            /*
             * LARGEURS FIXES, ET C'EST UN CHOIX. ExtJS 4.2 n'honore « flex » ni sur une colonne groupee ni
             * sur ses enfants : a l'interieur d'un groupe, il ne repartit que la largeur DU GROUPE. Les
             * neuf colonnes sont donc dimensionnees pour tenir ensemble SANS DEFILEMENT sur les postes de
             * l'officine, qui sont plus etroits que le banc : cent quarante pixels pour un montant a dix
             * chiffres, cent pour un ratio, soit mille deux cent soixante en tout avec la colonne des
             * periodes. Les mentions sont raccourcies en consequence, l'annee comparee restant nommee.
             */
            return {text: texte, dataIndex: champ, width: 140, align: 'right',
                itemId: 'col-' + champ,
                renderer: function (v, meta, record) {
                    var t = f.nombre(v);
                    if (t === '') {
                        return '';
                    }
                    /* La variation en FRANCS est dans l'infobulle : l'afficher ferait trois lignes de plus
                       dans chaque case, et le tableau en porte neuf par ligne. */
                    var ecart = record.get(prefixe + (quoi === 'ca' ? 'varCa' : 'varAchat'));
                    if (ecart !== null && ecart !== undefined) {
                        meta.tdAttr = 'data-qtip="' + Ext.String.htmlEncode('Écart avec ' + (an - 1) + ' : '
                                + (ecart >= 0 ? '+' : '') + f.nombre(ecart) + ' FCFA') + '"';
                    }
                    return '<b>' + t + '</b>' + mentions(record, prefixe, quoi, an);
                },
                summaryType: 'sum',
                summaryRenderer: function (v) {
                    var t = f.nombre(v);
                    return t === '' ? '' : '<b>' + t + '</b>';
                }};
        };

        var colonneRatio = function (an) {
            var prefixe = 'an' + an + '_';
            return {text: 'RATIO', dataIndex: prefixe + 'ratio', width: 100, align: 'right',
                itemId: 'col-' + prefixe + 'ratio',
                /*
                 * LE RATIO DU PIED N'EST PAS UNE MOYENNE DE RATIOS. Additionner puis diviser n'est pas
                 * diviser puis moyenner : la moyenne des ratios trimestriels donnerait un nombre qui ne
                 * correspond a rien. Le pied divise donc le TOTAL des ventes par le TOTAL des achats.
                 */
                summaryRenderer: function (valeur, donnees, champ, contexte) {
                    var ventes = 0;
                    var achats = 0;
                    var lignes = contexte && contexte.store ? contexte.store : store;
                    lignes.each(function (r) {
                        ventes += Number(r.get(prefixe + 'ca')) || 0;
                        achats += Number(r.get(prefixe + 'achat')) || 0;
                    });
                    if (!achats) {
                        return '';
                    }
                    return '<b class="pilotage-evol ' + (ventes / achats >= 1 ? 'hausse' : 'baisse') + '">'
                            + f.nombre(ventes / achats, '0,000.00') + '</b>';
                },
                renderer: function (v, meta, record) {
                    if (v === null || v === undefined || !v) {
                        return '';
                    }
                    /* Au-dessus de 1, on vend plus qu'on n'achete sur la periode : c'est la lecture utile. */
                    var couleur = v >= 1 ? 'hausse' : 'baisse';
                    var texte = '<b class="pilotage-evol ' + couleur + '">' + f.nombre(v, '0,000.00')
                            + '</b>';
                    var ecart = record.get(prefixe + 'varRatio');
                    if (ecart !== null && ecart !== undefined) {
                        texte += '<div class="pilotage-seconde-ligne"><span class="pilotage-evol '
                                + f.sens(ecart) + '">' + f.fleche(ecart) + ' '
                                + f.nombre(Math.abs(ecart), '0,000.00') + '</span> /' + (an - 1) + '</div>';
                    }
                    return texte;
                }};
        };

        var colonnes = ecran.colonnes('achatsventes');
        Ext.each(annees, function (an) {
            /*
             * Un groupe par annee : les trois colonnes qu'il coiffe - ventes, achats, ratio - se lisent
             * ensemble, et l'annee n'est ecrite qu'une fois au lieu de trois.
             */
            colonnes.push({text: String(an), align: 'center', columns: [
                    colonneMontant(an, 'ca', 'VENTES'),
                    colonneMontant(an, 'achat', 'ACHATS'),
                    colonneRatio(an)]});
        });
        grille.reconfigure(store, colonnes);
        /*
         * LES COLONNES OCCUPENT TOUTE LA LARGEUR DISPONIBLE, et la suivent quand la fenetre change.
         *
         * ExtJS 4.2 n'honore « flex » ni sur une colonne groupee ni sur ses enfants - a l'interieur d'un
         * groupe, il ne repartit que la largeur DU GROUPE. Des largeurs fixes laissaient donc une bande
         * grise apres le ratio de la derniere annee (21/09). On calcule ici ce que chaque colonne peut
         * prendre, et on refait le calcul a chaque redimensionnement : aucune place perdue, et jamais moins
         * que le minimum sous lequel un montant a dix chiffres ne tiendrait plus.
         */
        var ajuster = function () {
            var large = grille.getWidth();
            if (!large || !annees.length) {
                return;
            }
            var entetes = grille.headerCt.getGridColumns();
            /* La colonne des periodes, la bordure et la place d'une barre de defilement verticale. */
            var disponible = large - 130 - 24;
            /* Un montant vaut deux parts, un ratio une part et demie : c'est le rapport de ce qu'ils
               portent - dix chiffres et trois mentions contre un nombre a deux decimales. */
            var part = disponible / (annees.length * 5.5);
            var montant = Math.max(130, Math.floor(part * 2));
            var ratio = Math.max(90, Math.floor(part * 1.5));
            Ext.each(entetes, function (colonne) {
                if (colonne.itemId === 'col-periode') {
                    return;
                }
                var voulue = /_ratio$/.test(colonne.dataIndex || '') ? ratio : montant;
                if (colonne.getWidth() !== voulue) {
                    colonne.setWidth(voulue);
                }
            });
        };
        ajuster();
        if (!grille.ajustementPose) {
            grille.ajustementPose = true;
            grille.on('resize', ajuster, null, {buffer: 150});
        }
        this.dessinerAchatsVentes(annees);
        grille.setTitle('Ventes et achats comparés ' + (reponse.libelleDecoupage || 'par trimestre')
                + ' — ' + annees.join(', '));
    },

    /**
     * Le diagramme en BANDES de l'onglet Achats / Ventes : six barres par période, deux par année.
     *
     * <p>
     * Des courbes avaient été posées d'abord, et l'officine a eu raison de les refuser : six traits qui se
     * croisent sur quatre points ne dessinent rien qu'on puisse lire. Des barres, elles, se comparent à
     * l'œil sans suivre aucun tracé — c'est la bonne forme pour une comparaison de périodes, la courbe étant
     * faite pour une série continue.
     *
     * <p>
     * UNE SEULE série à plusieurs grandeurs, et non six séries : ExtJS 4.2 ne groupe les barres côte à côte
     * que dans ce cas. Leurs couleurs viennent du thème déclaré avec la vue, dans l'ordre des grandeurs.
     */
    dessinerAchatsVentes: function (annees) {
        var graphique = this.getEcran().down('#graphique-achatsventes');
        if (!graphique || !annees || !annees.length) {
            return;
        }
        var f = testextjs.view.pilotage.PilotageManager;
        try {
            graphique.series.removeAll();
            var champs = [];
            var titres = [];
            Ext.each(annees, function (an) {
                champs.push('an' + an + '_ca');
                titres.push('Ventes ' + an);
                champs.push('an' + an + '_achat');
                titres.push('Achats ' + an);
            });
            graphique.series.add(Ext.create('Ext.chart.series.Column', {
                chart: graphique,
                type: 'column',
                axis: 'left',
                xField: 'libelle',
                yField: champs,
                title: titres,
                stacked: false,
                gutter: 24,
                groupGutter: 8,
                /*
                 * L'ANNEE EST ECRITE DANS LA BARRE, A LA VERTICALE (demande du 21/09). Six barres accolees
                 * obligeaient a revenir sans cesse a la legende pour savoir laquelle on regarde ; nommee
                 * sur elle-meme, chaque barre se lit seule. A la verticale parce qu'une barre est etroite,
                 * et vers le haut pour ne pas empieter sur les graduations.
                 */
                label: {
                    display: 'insideEnd',
                    orientation: 'vertical',
                    contrast: true,
                    field: champs,
                    font: 'bold 11px tahoma, arial, sans-serif',
                    renderer: function (valeur, etiquette, enregistrement, item, i, display, animate, index) {
                        /* Le rang de la grandeur dans la serie donne l'annee : « Ventes 2026 » devient
                           « 2026 », la couleur disant deja s'il s'agit des ventes ou des achats. */
                        var titre = titres[index] || '';
                        return valeur ? titre.replace(/^(Ventes|Achats) /, '') : '';
                    }
                },
                tips: f.infobulle(function (record, item) {
                    /* L'infobulle nomme la barre survolee : sans cela, six barres accolees se confondent. */
                    var rang = item && item.yField ? champs.indexOf(item.yField) : -1;
                    var champ = rang >= 0 ? champs[rang] : champs[0];
                    var an = champ.replace('an', '').split('_')[0];
                    var ratio = record.get('an' + an + '_ratio');
                    return '<b>' + Ext.String.htmlEncode(record.get('libelle') || '') + '</b><br>'
                            + (rang >= 0 ? titres[rang] : '') + ' : '
                            + (f.nombre(record.get(champ)) || '—')
                            + (ratio ? '<br>ratio ventes / achats ' + an + ' : '
                                    + f.nombre(ratio, '0,000.00') : '');
                })
            }));
            graphique.axes.getAt(0).fields = champs;
            if (graphique.legend && graphique.legend.isLegend) {
                graphique.legend.create();
            }
            graphique.redraw();
        } catch (e) {
            /* Le tableau de chiffres, lui, reste juste : on ne perd que le dessin. */
        }
    },

    /**
     * Ouvre ou referme le diagramme de l'onglet Achats / Ventes.
     *
     * <p>
     * Il est refermé au départ : le tableau porte les chiffres exacts et suffit le plus souvent, alors que
     * les trois blocs empilés faisaient descendre le détail sous le bord de l'écran.
     */
    basculerCourbe: function (bouton, ouvert) {
        var panneau = this.getEcran().down('#graphiquePanneau-achatsventes');
        if (!panneau) {
            return;
        }
        panneau.setVisible(ouvert);
        bouton.setText(ouvert ? 'Masquer le diagramme' : 'Afficher le diagramme');
        if (ouvert) {
            /* Un graphique dessine pendant qu'il etait masque n'a pas de dimensions : on le redessine. */
            var graphique = panneau.down('chart');
            if (graphique) {
                try {
                    graphique.redraw();
                } catch (e) {
                    /* Le tableau reste juste. */
                }
            }
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
        /* Le tableau nomme la période qu'il mesure : « sur la fenêtre » n'apprenait rien à personne. */
        var panneauPart = ecran.down('#repartition');
        if (panneauPart) {
            panneauPart.setTitle('Part de chaque grossiste — '
                    + (reponse.libelleRepartition || 'période choisie'));
        }
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
            config.push({text: g.libelle.toUpperCase(), dataIndex: g.cle, width: 150, align: 'right',
                itemId: 'col-' + g.cle,
                renderer: function (v, meta, record, rowIndex, colIndex, store) {
                    var f = testextjs.view.pilotage.PilotageManager;
                    var t = f.nombre(v);
                    /* La part porte sur les ACHATS du mois, pas sur le chiffre d'affaires : ce qu'on veut
                       savoir d'un grossiste, c'est le poids qu'il prend dans l'approvisionnement. */
                    return t === '' ? '' : t
                            + f.secondeLigne(v, record, rowIndex, store, g.cle, {part: false})
                            + (record.get('achatTTC')
                                    ? '<div class="pilotage-seconde-ligne">'
                                        + f.nombre(v / record.get('achatTTC') * 100, '0,000.0')
                                        + ' % des achats</div>' : '');
                },
                summaryType: 'sum',
                summaryRenderer: function (v) {
                    var t = testextjs.view.pilotage.PilotageManager.nombre(v);
                    return t === '' ? '' : '<b>' + t + '</b>';
                }});
        });
        grille.reconfigure(store,
                testextjs.view.pilotage.PilotageManager.repartirLargeur(config));
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
