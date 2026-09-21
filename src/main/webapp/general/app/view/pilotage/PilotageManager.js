/* global Ext */

/*
 * MENU DE PILOTAGE (evolution 6, point 1).
 *
 * Ce que cet ecran apporte, et qui n'existait pas dans le logiciel : chaque mois est isole et COMPARABLE a un
 * autre. Jusqu'ici il fallait exporter le rapport d'activite mois par mois et rapprocher les classeurs a la
 * main pour repondre a « est-ce qu'on fait mieux que l'an dernier ». La donnee etait deja en base ; il
 * manquait l'ecran.
 *
 * Le tableau de bord existant n'est pas touche : ce menu vit a cote de lui.
 *
 * LE SELECTEUR DE PERIODE N'EST PAS UN FILTRE, C'EST UN AXE DE COMPARAISON. Choisir « Vs meme mois l'an
 * dernier » ne change pas la periode regardee : il change ce a quoi on la compare, et chaque tuile gagne sa
 * ligne de variation. C'est le mecanisme central de l'ecran.
 *
 * Chaque onglet a la meme structure, celle qui a ete validee sur la maquette : une rangee de TUILES avec leur
 * variation, un GRAPHIQUE d'evolution mensuelle, et le DETAIL MENSUEL chiffre en dessous. Habillage clair,
 * celui du logiciel : un ecran sombre au milieu de Prestige ferait tache et fatiguerait a la lecture d'un
 * tableau de chiffres.
 */
/*
 * LES COULEURS DU DIAGRAMME EN BANDES DE L'ONGLET ACHATS / VENTES.
 *
 * ExtJS 4.2 ne laisse pas choisir la couleur de chaque barre d'une serie a plusieurs grandeurs : c'est le
 * THEME du graphique qui les donne, dans l'ordre. On en declare donc un, ou les deux barres d'une meme annee
 * se suivent - ventes puis achats - dans deux tons de la meme couleur. L'annee la plus recente prend le bleu
 * franc, les precedentes s'effacent : c'est celle-la qu'on regarde.
 */
Ext.define('Ext.chart.theme.PilotageBandes', {
    extend: 'Ext.chart.theme.Base',
    constructor: function (config) {
        this.callParent([Ext.apply({
                colors: ['#9aa7b4', '#c7ced5', '#ef6c00', '#f7b878', '#1565c0', '#7fb3e8']
            }, config)]);
    }
});

Ext.define('testextjs.view.pilotage.PilotageManager', {
    extend: 'Ext.panel.Panel',
    xtype: 'pilotage',
    itemId: 'pilotage',
    requires: ['Ext.chart.Chart', 'Ext.chart.series.Line', 'Ext.chart.series.Area',
        'Ext.chart.axis.Numeric', 'Ext.chart.axis.Category'],
    frame: true,
    title: 'PILOTAGE DE L\'OFFICINE',
    width: '99%',
    height: 'auto',
    minHeight: 620,
    /* « pilotage-ardoise » porte l'habillage retenu par l'officine le 20/09 : il ne s'applique qu'ici. */
    cls: 'custompanel pilotage-ardoise',
    layout: {type: 'vbox', align: 'stretch'},

    statics: {
        /*
         * LE FORMATAGE DES NOMBRES DE L'ECRAN, EN UN SEUL ENDROIT.
         *
         * Deux pieges d'ExtJS 4.2 sont traites ici, et ils ont tous deux ete vus a l'ecran :
         *   - une valeur absente donne « NaN » si on la formate telle quelle ;
         *   - un nombre NEGATIF n'est pas groupe par milliers (« -29922564 » au lieu de
         *     « -29.922.564 ») ; on formate donc la valeur absolue et on repose le signe.
         */
        nombre: function (v, motif) {
            if (v === null || v === undefined || isNaN(v)) {
                return '';
            }
            var n = Number(v);
            return (n < 0 ? '-' : '') + Ext.util.Format.number(Math.abs(n), motif || '0,000');
        },

        /* Les trois premieres lettres du mois et les deux derniers chiffres de l'annee :
           « Septembre 2026 » devient « sept. 26 ». Un axe de douze mois ecrits en toutes lettres
           est illisible - retour de l'officine du 19/09. */
        moisCourt: function (libelle) {
            if (!libelle) {
                return '';
            }
            var parts = String(libelle).split(' ');
            if (parts.length < 2) {
                return libelle;
            }
            /* Les abréviations françaises d'usage : « octobre » s'abrège « oct. », pas « octo. ». */
            var abrege = {janvier: 'janv.', 'février': 'févr.', mars: 'mars', avril: 'avr.', mai: 'mai',
                juin: 'juin', juillet: 'juil.', 'août': 'août', septembre: 'sept.', octobre: 'oct.',
                novembre: 'nov.', 'décembre': 'déc.'};
            var mois = parts[0].toLowerCase();
            return (abrege[mois] || mois) + ' ' + parts[1].substring(2);
        },

        /*
         * LA SECONDE LIGNE D'UNE CELLULE DE MONTANT : l'evolution et la part.
         *
         * Demande de l'officine du 20/09, pour TOUTES les sections « detail mensuel » : « je veux le taux
         * d'evolution de chaque colonne par rapport au mois precedent ainsi de suite, et aussi le taux que ce
         * montant represente dans le chiffre d'affaires ».
         *
         * ELLE NE COUTE RIEN EN TEMPS. Les deux chiffres se deduisent de lignes DEJA chargees : le mois
         * precedent est la ligne suivante du tableau (il est trie du mois actuel au plus ancien), et le chiffre
         * d'affaires du mois est deja dans la ligne. Aucune requete de plus n'est envoyee au serveur - c'est
         * l'ecran qui divise. La question posee le 20/09, « cela coutera de la lenteur ? », a donc pour reponse
         * non : le serveur rend exactement les memes donnees qu'avant.
         *
         * Le mois le plus ancien du tableau n'a pas de mois precedent a l'ecran : on n'invente pas une
         * evolution a partir d'un mois qu'on n'affiche pas, la case reste vide.
         */
        secondeLigne: function (valeur, record, rowIndex, store, champ, options) {
            var opt = options || {};
            var morceaux = [];
            if (opt.evolution !== false && store && record && valeur !== null && valeur !== undefined) {
                /* Le tableau va du mois actuel au plus ancien : le mois precedent est la ligne d'apres. */
                var avant = store.getAt(rowIndex + 1);
                if (avant) {
                    var v0 = Number(avant.get(champ));
                    var v1 = Number(valeur);
                    if (!isNaN(v0) && !isNaN(v1)) {
                        if (opt.points) {
                            /* Un taux ne varie pas « de 12 % » mais « de 12 points » : comparer deux
                               pourcentages en pourcentage se lit de travers. */
                            var ecart = v1 - v0;
                            morceaux.push('<span class="pilotage-evol ' + this.sens(ecart) + '">'
                                    + this.fleche(ecart) + ' '
                                    + this.nombre(Math.abs(ecart), '0,000.0') + ' pt</span>');
                        } else if (v0 !== 0) {
                            var variation = (v1 - v0) / Math.abs(v0) * 100;
                            morceaux.push('<span class="pilotage-evol ' + this.sens(variation) + '">'
                                    + this.fleche(variation) + ' '
                                    + this.nombre(Math.abs(variation), '0,000.0') + ' %</span>');
                        }
                    }
                }
            }
            /* La part du chiffre d'affaires n'a de sens que pour un MONTANT : un nombre de ventes ou un
               taux rapporte a un chiffre d'affaires ne veut rien dire. Et le CA rapporte a lui-meme non plus. */
            if (opt.part === true && record) {
                var ca = Number(record.get('caTTC'));
                if (ca) {
                    morceaux.push(this.nombre(Number(valeur) / ca * 100, '0,000.0') + ' % du CA');
                }
            }
            if (!morceaux.length) {
                return '';
            }
            return '<div class="pilotage-seconde-ligne">' + morceaux.join(' &middot; ') + '</div>';
        },

        sens: function (v) {
            return v > 0 ? 'hausse' : (v < 0 ? 'baisse' : 'plat');
        },

        fleche: function (v) {
            return v > 0 ? '\u25b2' : (v < 0 ? '\u25bc' : '=');
        },

        /*
         * LES DEUX AXES DE TOUS LES GRAPHIQUES, ECRITS UNE SEULE FOIS.
         *
         * « Les montants en ordonnee sont confondus, on ne voit pas les mois » (20/09) : ExtJS choisissait
         * seul le nombre de graduations et en posait une tous les 25 millions, si bien que les etiquettes se
         * chevauchaient et formaient un pate illisible. On impose SIX graduations, quelle que soit l'echelle,
         * et on reserve en bas la place des mois ecrits en biais - sans cette reserve, le dernier caractere
         * de chaque mois passait sous le bord du cadre.
         */
        axeMontants: function (champs, sansGrille) {
            return {
                type: 'Numeric',
                position: 'left',
                fields: champs,
                minimum: 0,
                /*
                 * LES MONTANTS NE SE LISENT PLUS PAR-DESSUS LES LIGNES (21/09).
                 *
                 * Deux causes, deux remedes. ExtJS 4.2 n'ecarte pas les etiquettes d'un axe de la zone de
                 * dessin - « label.padding » n'y est pas honore - et la ligne de grille traverse donc le
                 * texte. On raccourcit d'abord les etiquettes : « 250 M » tient la ou « 250,0 M » mordait
                 * sur la grille, la decimale n'apprenant rien sur une graduation. Et on eclaircit les
                 * lignes, qui n'ont pas a se lire aussi fort que les chiffres qu'elles portent.
                 */
                /*
                 * ExtJS 4.2 trace les lignes de grille sur TOUTE la largeur du cadre, etiquettes comprises :
                 * elles passent donc au travers des montants, et aucun reglage d'ecart ne les en ecarte
                 * (« label.padding » n'est pas honore sur un axe). Sur un diagramme en BANDES, la grille
                 * n'apprend rien - les barres se comparent entre elles - et on la retire ; sur une courbe,
                 * elle aide a lire un niveau et on la garde, simplement eclaircie.
                 */
                grid: sansGrille === true ? false : {stroke: '#e3e9ef', 'stroke-width': 1},
                majorTickSteps: 5,
                label: {
                    font: 'bold 12px tahoma, arial, sans-serif',
                    fill: '#333333',
                    renderer: function (v) {
                        var absolu = Math.abs(v);
                        if (absolu >= 1000000) {
                            /* Une decimale seulement quand l'echelle est basse : « 1,5 M » apprend quelque
                               chose, « 250,0 M » n'apprend rien de plus que « 250 M ». */
                            return Ext.util.Format.number(v / 1000000, absolu >= 10000000 ? '0,000' : '0,000.0')
                                    + ' M';
                        }
                        return Ext.util.Format.number(v, '0,000');
                    }
                }
            };
        },

        axeMois: function () {
            return {
                type: 'Category',
                position: 'bottom',
                fields: ['libelle'],
                label: {
                    font: 'bold 12px tahoma, arial, sans-serif',
                    fill: '#333333',
                    rotate: {degrees: 315},
                    renderer: function (v) {
                        return testextjs.view.pilotage.PilotageManager.moisCourt(v);
                    }
                }
            };
        },

        /*
         * L'ESPACE RESTANT EST PARTAGE ENTRE TOUTES LES COLONNES DE CHIFFRES, a parts egales.
         *
         * Deux ecueils evites. Laisser la colonne des mois en « flex » lui donnait tout l'espace libre : le
         * nom du mois occupait la moitie du tableau de la Synthese. Le donner a la SEULE derniere colonne
         * etirait celle-la sur six cents pixels pendant que les autres restaient serrees. Chaque colonne de
         * chiffres recoit donc la meme part, sans jamais passer sous la largeur dont elle a besoin pour
         * afficher son montant et sa seconde ligne - au-dela, la grille defile horizontalement, ce qui est
         * le comportement attendu quand une officine travaille avec douze modes de reglement.
         */
        repartirLargeur: function (colonnes) {
            Ext.each(colonnes, function (c) {
                if (c.itemId === 'col-mois') {
                    delete c.flex;
                    return;
                }
                c.minWidth = c.width || 130;
                c.flex = 1;
            });
            return colonnes;
        },

        /*
         * LA RESERVE AUTOUR DU DESSIN. ExtJS 4.2 n'accepte qu'une seule valeur, appliquee aux quatre cotes
         * ({@code insetPadding}) : a dix pixels, les mois ecrits en biais passaient sous le bord du cadre et
         * la derniere graduation touchait le haut. Vingt-quatre laissent la place aux deux.
         */
        INSET: 24,

        /*
         * L'INFOBULLE DES COURBES, ECRITE UNE SEULE FOIS ET PARTAGEE PAR TOUS LES GRAPHIQUES.
         *
         * Elle etait bridee en largeur et en hauteur, donc coupee des qu'un libelle de mode ou de grossiste
         * etait un peu long, et elle s'effacait toute seule au bout de quelques secondes. « Agrandir les
         * infobulles qui sont tronquees dans tous les graphes quand je mets la souris sur le pic » (20/09) :
         * elle se dimensionne desormais sur son contenu, va sur plusieurs lignes, et ne disparait que
         * lorsque le curseur quitte la courbe.
         */
        infobulle: function (rendu) {
            return {
                trackMouse: true,
                dismissDelay: 0,
                hideDelay: 500,
                minWidth: 220,
                maxWidth: 560,
                autoHeight: true,
                /* ExtJS 4.2 pose une largeur et une hauteur FIXES sur l'infobulle d'une serie : tant
                   qu'elles sont posees, maxWidth et autoHeight ne servent a rien et le texte est coupe. */
                width: undefined,
                height: undefined,
                bodyStyle: 'white-space: normal; line-height: 16px; padding: 6px 8px;',
                renderer: function (record, item) {
                    this.setTitle(rendu(record, item));
                }
            };
        }
    },

    /* Les onglets de cette livraison. Chacun porte ses colonnes de detail : le reste est commun. */
    ONGLETS: [
        {cle: 'synthese', titre: 'Synthèse'},
        {cle: 'ventes', titre: 'Ventes'},
        {cle: 'marge', titre: 'Marge'},
        {cle: 'achats', titre: 'Achats'},
        {cle: 'caisse', titre: 'Caisse & tiers-payant'},
        {cle: 'stock', titre: 'Stock'},
        {cle: 'qualite', titre: 'Qualité–Exploitation'},
        {cle: 'kpi', titre: 'KPI Analyse'},
        {cle: 'comparateur', titre: 'Comparateur'},
        /*
         * Ajoute EN DERNIER, a dessein : l'officine connait la place de ses onglets, et en inserer un au
         * milieu obligerait chacun a rechercher les siens.
         */
        {cle: 'achatsventes', titre: 'Achats / Ventes'}
    ],

    initComponent: function () {
        var me = this;

        /* Grossistes qui ont reellement livre sur la fenetre : le filtre ne propose pas de fournisseur muet. */
        me.storeGrossistes = new Ext.data.Store({
            fields: [{name: 'id', type: 'string'}, {name: 'libelle', type: 'string'}],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/pilotage/grossistes',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });

        /* Part de chaque grossiste sur la fenetre : la lecture que l'officine fait en premier. */
        me.storeRepartition = new Ext.data.Store({
            fields: [{name: 'grossiste', type: 'string'}, {name: 'montant', type: 'float'},
                /* De quelles agences le groupe est fait : regrouper ne doit pas faire perdre leurs noms. */
                {name: 'membres', type: 'string'},
                {name: 'part', type: 'float'}],
            data: []
        });

        me.storeFamilles = new Ext.data.Store({
            fields: [{name: 'id', type: 'string'}, {name: 'libelle', type: 'string'}],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/famillearticles',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });

        me.storeEmplacements = new Ext.data.Store({
            fields: [{name: 'id', type: 'string'}, {name: 'libelle', type: 'string'}],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/rayons',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });

        /* Le catalogue des KPI vient du SERVEUR : l'ecran ne connait pas les indicateurs. */
        me.storeKpis = new Ext.data.Store({
            fields: [{name: 'cle', type: 'string'}, {name: 'libelle', type: 'string'},
                {name: 'unite', type: 'string'}, {name: 'famille', type: 'string'},
                {name: 'mensuel', type: 'boolean'},
                /* Additionner les mois, ou en faire la moyenne : un panier moyen ne s'additionne pas. */
                {name: 'cumul', type: 'boolean'}],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/pilotage/kpis',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });

        /* Frequentation horaire : le seul indicateur qui ne se lit pas par mois. */
        me.storeHoraire = new Ext.data.Store({
            fields: [{name: 'heure', type: 'int'}, {name: 'libelle', type: 'string'},
                {name: 'nbVentes', type: 'int'}, {name: 'caTTC', type: 'float'}],
            data: []
        });

        me.storeAxes = new Ext.data.Store({
            fields: [{name: 'code', type: 'string'}, {name: 'libelle', type: 'string'}],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/pilotage/axes',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });

        /* Les champs d'une ligne de mois, ecrits une fois et donnes aux deux stores qui la portent. */
        var champsMois = function () {
            return ['mois', 'libelle',
                        {name: 'caTTC', type: 'float'}, {name: 'caHT', type: 'float'},
                        {name: 'marge', type: 'float'}, {name: 'tauxMarge', type: 'float'},
                        {name: 'achatTTC', type: 'float'}, {name: 'coutAchat', type: 'float'},
                        {name: 'nbVentes', type: 'int'}, {name: 'nbBons', type: 'int'},
                        {name: 'panier', type: 'float'}, {name: 'remises', type: 'float'},
                        {name: 'partTiersPayant', type: 'float'},
                        {name: 'encaisse', type: 'float'}, {name: 'credit', type: 'float'},
                        {name: 'partComptant', type: 'float'}, {name: 'partCredit', type: 'float'},
                        {name: 'tpRegle', type: 'float'},
                        {name: 'valeurAchat', type: 'float'}, {name: 'valeurVente', type: 'float'},
                        {name: 'entrees', type: 'float'}, {name: 'sorties', type: 'float'},
                        {name: 'variationStock', type: 'float'}, {name: 'unites', type: 'float'},
                        {name: 'mesure', type: 'boolean'},
                        {name: 'nbAnnulees', type: 'int'}, {name: 'montantAnnule', type: 'float'},
                        {name: 'annuleEspece', type: 'float'},
                        {name: 'tauxRemise', type: 'float'}, {name: 'tauxAnnulation', type: 'float'},
                        {name: 'ratioVA', type: 'float'},
                        /* Comparateur : les deux objets compares et leur ecart. */
                        {name: 'a', type: 'float'}, {name: 'b', type: 'float'},
                        {name: 'ecart', type: 'float'}, {name: 'rapport', type: 'float'},
                        /*
                         * La PÉRIODE COMPARÉE, mois par mois : « si je compare 2 valeurs les 2 doivent se
                         * retrouver sur les courbes ». useNull, sans quoi un mois sans référence vaudrait
                         * zéro et la courbe plongerait au lieu de s'interrompre.
                         */
                        {name: 'libelleReference', type: 'string'},
                        {name: 'caTTCRef', type: 'float', useNull: true},
                        {name: 'caHTRef', type: 'float', useNull: true},
                        {name: 'margeRef', type: 'float', useNull: true},
                        {name: 'achatTTCRef', type: 'float', useNull: true},
                        {name: 'encaisseRef', type: 'float', useNull: true},
                        {name: 'nbVentesRef', type: 'float', useNull: true},
                        {name: 'panierRef', type: 'float', useNull: true},
                        {name: 'nbAnnuleesRef', type: 'float', useNull: true},
                        {name: 'valeurAchatRef', type: 'float', useNull: true}];
        };

        /* Un store de tuiles et un store de mois PAR ONGLET : deux onglets ne se pietinent pas. */
        me.stores = {};
        Ext.each(me.ONGLETS, function (onglet) {
            me.stores[onglet.cle] = {
                tuiles: new Ext.data.Store({
                    fields: ['cle', 'libelle', 'unite', 'sousTitre', 'libelleReference',
                        /* Une tuile d'ALERTE se voit de loin : rouge et clignotante. Aujourd'hui les
                           peremptions proches ; demain ce qui appellera un geste dans le mois. */
                        {name: 'alerte', type: 'boolean'},
                        {name: 'valeur', type: 'float'},
                        /*
                         * useNull : SANS lui, ExtJS convertit une valeur absente en 0, et une tuile sans
                         * comparaison affichait « ▲ 0,0 % » - c'est-a-dire une variation nulle la ou il n'y
                         * a aucune comparaison. Defaut vu au banc.
                         */
                        {name: 'reference', type: 'float', useNull: true},
                        {name: 'variation', type: 'float', useNull: true},
                        {name: 'ecart', type: 'float', useNull: true}],
                    data: []
                }),
                mois: new Ext.data.Store({
                    fields: champsMois(),
                    data: []
                }),
                /*
                 * DEUX STORES POUR LES MEMES CHIFFRES, et c'est voulu : la COURBE se lit de gauche a droite
                 * dans le sens du temps, le TABLEAU se lit du mois actuel au plus ancien (demande du 19/09).
                 * Un seul store ne peut pas porter les deux ordres a la fois.
                 */
                detail: new Ext.data.Store({
                    fields: champsMois(),
                    data: []
                }),
            };
        });

        Ext.applyIf(me, {
            items: [me.barrePeriode(), me.onglets()]
        });
        me.callParent(arguments);
    },

    /* ================================================================= l'axe de comparaison */

    barrePeriode: function () {
        var me = this;
        return {
            xtype: 'toolbar',
            itemId: 'barrePeriode',
            padding: 6,
            layout: {type: 'vbox', align: 'stretch'},
            items: [{
                    xtype: 'container',
                    layout: {type: 'hbox', align: 'middle'},
                    defaults: {margin: '0 6 4 0'},
                    items: [{
                            xtype: 'displayfield',
                            value: '<b>PÉRIODE</b>',
                            width: 64
                        }, {
                            xtype: 'combobox',
                            itemId: 'axe',
                            width: 250,
                            store: me.storeAxes,
                            displayField: 'libelle',
                            valueField: 'code',
                            queryMode: 'local',
                            editable: false,
                            value: 'MOIS'
                        }, {
                            xtype: 'datefield',
                            itemId: 'dtStart',
                            fieldLabel: 'Du',
                            labelWidth: 24,
                            width: 150,
                            format: 'd/m/Y',
                            /* Les dates ne servent QUE pour l'axe « période personnalisée ». */
                            disabled: true
                        }, {
                            xtype: 'datefield',
                            itemId: 'dtEnd',
                            fieldLabel: 'au',
                            labelWidth: 24,
                            width: 150,
                            format: 'd/m/Y',
                            disabled: true
                        }, {
                            xtype: 'button',
                            itemId: 'actualiser',
                            text: 'Actualiser',
                            iconCls: 'search'
                        }, {
                            xtype: 'button',
                            /*
                             * RECALCULER. Les mois clos ne sont plus recomptés à chaque clic — c'est ce qui rend
                             * l'écran rapide. Une régularisation tardive (une vente d'un mois passé annulée
                             * aujourd'hui, un bon de livraison saisi en retard) ne se devine pas : ce bouton
                             * reprend les mois affichés à partir des ventes et des achats.
                             */
                            itemId: 'recalculer',
                            text: 'Recalculer',
                            iconCls: 'icon-refresh',
                            tooltip: 'Reprend les mois affichés à partir des ventes et des achats, après une '
                                    + 'correction portant sur un mois déjà passé.'
                        }, {
                            xtype: 'component',
                            flex: 1
                        }, {
                            xtype: 'button',
                            itemId: 'imprimer',
                            text: 'Imprimer / exporter la vue',
                            iconCls: 'printable',
                            menu: [{itemId: 'imprimerPdf', text: 'Imprimer (PDF)', iconCls: 'printable'},
                                {itemId: 'exporterExcel', text: 'Exporter Excel', iconCls: 'icon-excel'}]
                        }]
                }, {
                    xtype: 'container',
                    layout: {type: 'hbox', align: 'middle'},
                    items: [{
                            xtype: 'displayfield',
                            itemId: 'rappelAxe',
                            flex: 1,
                            value: ''
                        }]
                }, {
                    /*
                     * LA BARRE DE PROGRESSION DU RECALCUL. Reprendre vingt-cinq mois demande une bonne
                     * demi-minute, pendant laquelle l'ecran ne disait rien : « ajouter une barre de
                     * progression pour ne pas faire attendre sans infos » (20/09). Elle donne le mois en
                     * cours de calcul et le nombre de mois faits - une information reelle, lue sur le
                     * serveur, et non une animation qui tourne dans le vide.
                     *
                     * Elle vit DANS l'ecran et non dans une fenetre : rien n'est bloque pendant ce temps.
                     */
                    xtype: 'container',
                    itemId: 'zoneProgression',
                    hidden: true,
                    layout: {type: 'hbox', align: 'middle'},
                    padding: '2 0 4 0',
                    items: [{
                            xtype: 'progressbar',
                            itemId: 'progression',
                            flex: 1,
                            height: 22,
                            text: 'Recalcul en cours...'
                        }]
                }]
        };
    },

    onglets: function () {
        var me = this;
        var onglets = [];
        Ext.each(me.ONGLETS, function (onglet) {
            onglets.push(me.onglet(onglet));
        });
        return {
            xtype: 'tabpanel',
            itemId: 'onglets',
            flex: 1,
            minHeight: 520,
            activeTab: 0,
            items: onglets
        };
    },

    /* Un onglet : les tuiles, le graphique, le detail mensuel. L'onglet Achats porte en plus ses filtres
     * et la part de chaque grossiste. */
    /**
     * Les onglets qui adoptent la disposition en deux colonnes, et la hauteur de leur bandeau.
     *
     * <p>
     * Les onglets VENTES, KPI et COMPARATEUR en sont exclus, et chacun pour sa raison : Ventes porte DEUX
     * graphiques cote a cote, KPI une liste de cases a cocher qui prend deja toute la largeur, et le
     * Comparateur n'a pas de graphique d'evolution mensuelle a mettre en face. L'onglet Achats / Ventes,
     * lui, n'a ni courbe permanente ni tuiles a caser.
     */
    DEUX_COLONNES: {
        synthese: {hauteur: 272, tuiles: 692},
        marge: {hauteur: 272, tuiles: 692},
        achats: {hauteur: 420, tuiles: 692, graphiqueDessous: true},
        caisse: {hauteur: 272, tuiles: 692},
        stock: {hauteur: 272, tuiles: 692},
        qualite: {hauteur: 272, tuiles: 692}
    },

    /**
     * Le bandeau haut d'un onglet en deux colonnes.
     *
     * <p>
     * A gauche les tuiles, a droite le graphique - sauf pour l'onglet Achats, ou le graphique se range SOUS
     * les tuiles pour laisser toute la colonne de droite a la repartition par grossiste.
     */
    bandeauDeuxColonnes: function (cle) {
        var me = this;
        var reglage = me.DEUX_COLONNES[cle];
        var gauche;
        var droite;
        if (reglage.graphiqueDessous) {
            gauche = {
                xtype: 'container',
                width: reglage.tuiles,
                layout: {type: 'vbox', align: 'stretch'},
                items: [Ext.apply(me.tuiles(cle), {height: 190, ajustementHauteur: false}),
                    Ext.apply(me.graphique(cle), {flex: 1, minHeight: 0, margin: '4 0 0 0'})]
            };
            droite = Ext.apply(me.repartitionGrossistes(), {flex: 1, height: undefined,
                margin: '0 0 0 6'});
        } else {
            gauche = Ext.apply(me.tuiles(cle), {width: reglage.tuiles, ajustementHauteur: false});
            droite = Ext.apply(me.graphique(cle), {flex: 1, minHeight: 0, margin: '0 0 0 6'});
        }
        return {
            xtype: 'container',
            itemId: 'bandeau-' + cle,
            layout: {type: 'hbox', align: 'stretch'},
            height: reglage.hauteur,
            margin: '0 0 4 0',
            items: [gauche, droite]
        };
    },

    onglet: function (onglet) {
        var me = this;
        var contenu = [];
        if (onglet.cle === 'achats') {
            contenu.push(me.filtresAchats());
        }
        if (onglet.cle === 'kpi') {
            contenu.push(me.casesKpi());
        }
        if (onglet.cle === 'comparateur') {
            contenu.push(me.choixComparateur());
        }
        /*
         * TUILES A GAUCHE, GRAPHIQUE EN FACE, ET LE DETAIL SUR TOUTE LA LARGEUR EN BAS.
         *
         * Empilees, la bande de tuiles, le graphique et le tableau descendaient sous le bord de l'ecran : il
         * fallait faire defiler pour voir les chiffres du mois, qui sont pourtant ce qu'on vient chercher.
         * Cote a cote, les tuiles et le graphique occupent la meme hauteur, et tout ce qui est gagne revient
         * au detail mensuel - onze mois lisibles d'un coup au lieu de trois. Pose d'abord sur l'onglet Stock
         * le 20/09, etendu le 21 a tous les onglets qui s'y pretent.
         *
         * L'onglet ACHATS a sa variante : le graphique passe SOUS les tuiles, dans la meme colonne de
         * gauche, et la repartition par grossiste prend toute la colonne de droite - c'est elle qui a besoin
         * de hauteur, puisqu'une officine travaille avec une vingtaine de fournisseurs.
         */
        if (me.DEUX_COLONNES[onglet.cle]) {
            contenu.push(me.bandeauDeuxColonnes(onglet.cle));
            contenu.push(me.detail(onglet.cle));
            return {
                xtype: 'panel',
                itemId: 'onglet-' + onglet.cle,
                title: onglet.titre,
                cleOnglet: onglet.cle,
                border: false,
                autoScroll: true,
                layout: {type: 'vbox', align: 'stretch'},
                items: contenu
            };
        }
        contenu.push(me.tuiles(onglet.cle));
        if (onglet.cle === 'kpi') {
            /*
             * LA FREQUENTATION HORAIRE JUSTE SOUS LES TUILES (21/09). Elle etait un tableau pose tout en
             * bas, apres la courbe : coche, l'indicateur semblait n'apparaitre nulle part. Elle est
             * maintenant un diagramme en bandes, une par heure, la ou l'oeil tombe apres les tuiles.
             */
            contenu.push(me.frequentation());
        }
        /*
         * PLUS DE BANDEAU DE NOTE dans les onglets Stock et Qualite (« pas besoin d'afficher ce texte »,
         * 20/09). Ce qu'il disait n'est pas perdu : la colonne SOURCE du detail dit ligne par ligne si la
         * valeur est une capture ou une reconstitution, ce qui est plus precis qu'une phrase valable pour
         * tout l'ecran, et les tuiles de referentiel portent leur propre explication.
         */
        if (onglet.cle === 'achatsventes') {
            /*
             * LE TABLEAU D'ABORD, LA COURBE ENSUITE. Le tableau porte les chiffres exacts, la courbe montre
             * d'un regard si l'ecart entre ce qu'on vend et ce qu'on achete se creuse ou se referme d'une
             * annee sur l'autre. Les deux repondent a la meme question, a deux niveaux de precision.
             */
            /*
             * LE TABLEAU GARDE SA HAUTEUR ENTIERE, le diagramme se pose A LA SUITE.
             *
             * En « flex », les deux se partageaient la place : ouvrir le diagramme faisait apparaitre une
             * barre de defilement DANS le tableau et cachait la ligne des totaux. « Il s'affiche a la suite
             * sans deranger les dispositions » (21/09) : le tableau prend donc la hauteur de ses lignes -
             * quatre trimestres au plus, plus le total - et c'est la PAGE qui defile.
             */
            /* Quatre trimestres, leurs deux rangs d'en-tete et la ligne des totaux : trois cent quarante
               pixels. En dessous, le total passait sous le bord - or c'est lui qu'on regarde en dernier. */
            contenu.push(Ext.apply(me.detail(onglet.cle), {flex: undefined, height: 340, minHeight: 0}));
            contenu.push(me.graphiqueAchatsVentes());
            me.courbeMasquee = true;
            return {
                xtype: 'panel',
                itemId: 'onglet-' + onglet.cle,
                title: onglet.titre,
                cleOnglet: onglet.cle,
                border: false,
                autoScroll: true,
                layout: {type: 'vbox', align: 'stretch'},
                items: contenu
            };
        }
        if (onglet.cle === 'ventes') {
            /*
             * DEUX GRAPHIQUES CÔTE À CÔTE dans l'onglet Ventes : le chiffre d'affaires mensuel à gauche, et à
             * droite la part de chaque mode de règlement, mois après mois. « Pour voir la part de chaque
             * mode » — demande de l'officine du 19/09. Les deux se lisent d'un même regard, sur les mêmes mois.
             * C'est aussi pourquoi cet onglet ne prend pas la disposition en deux colonnes : sa largeur est
             * deja prise par ces deux graphiques.
             */
            contenu.push({
                xtype: 'container',
                layout: {type: 'hbox', align: 'stretch'},
                flex: 1,
                minHeight: 300,
                items: [me.graphique(onglet.cle), me.graphiqueModes()]
            });
        } else {
            contenu.push(me.graphique(onglet.cle));
        }
        contenu.push(me.detail(onglet.cle));
        return {
            xtype: 'panel',
            itemId: 'onglet-' + onglet.cle,
            title: onglet.titre,
            cleOnglet: onglet.cle,
            border: false,
            autoScroll: true,
            layout: {type: 'vbox', align: 'stretch'},
            items: contenu
        };
    },

    /*
     * Filtres de l'onglet Achats.
     *
     * Le filtre grossiste garde le montant des BONS ; les filtres famille et emplacement font passer le
     * calcul sur les LIGNES, parce que l'en-tete d'un bon porte le bon entier. L'ecran le dit alors en clair :
     * sans cela, l'officine croirait avoir perdu 4 % de ses achats en posant un filtre.
     */
    filtresAchats: function () {
        var me = this;
        return {
            xtype: 'toolbar',
            itemId: 'filtresAchats',
            padding: 4,
            items: [{
                    xtype: 'combobox',
                    itemId: 'grossiste',
                    fieldLabel: 'Grossiste',
                    labelWidth: 64,
                    width: 280,
                    store: me.storeGrossistes,
                    displayField: 'libelle',
                    valueField: 'id',
                    queryMode: 'local',
                    editable: false,
                    emptyText: 'Tous'
                }, {
                    xtype: 'combobox',
                    itemId: 'famille',
                    fieldLabel: 'Famille',
                    labelWidth: 54,
                    width: 250,
                    store: me.storeFamilles,
                    displayField: 'libelle',
                    valueField: 'id',
                    queryMode: 'local',
                    editable: false,
                    emptyText: 'Toutes'
                }, {
                    xtype: 'combobox',
                    itemId: 'emplacement',
                    fieldLabel: 'Emplacement',
                    labelWidth: 84,
                    width: 250,
                    store: me.storeEmplacements,
                    displayField: 'libelle',
                    valueField: 'id',
                    queryMode: 'local',
                    editable: false,
                    emptyText: 'Tous'
                }, {
                    xtype: 'button',
                    itemId: 'reinitialiserAchats',
                    text: 'Réinitialiser'
                }, {
                    xtype: 'component',
                    flex: 1
                }, {
                    xtype: 'displayfield',
                    itemId: 'noteAchats',
                    value: ''
                }]
        };
    },

    repartitionGrossistes: function () {
        return {
            xtype: 'gridpanel',
            itemId: 'repartition',
            title: 'Part de chaque grossiste',
            store: this.storeRepartition,
            height: 190,
            columnLines: true,
            /* Une officine travaille avec vingt grossistes : le tableau doit DEFILER, dans les deux sens,
               plutot que d'ecraser les colonnes ou de couper la liste (20/09). */
            autoScroll: true,
            /* Une période sans achat rend un tableau vide : il doit le DIRE, sinon on croit à une panne. */
            viewConfig: {
                emptyText: '<div class="pilotage-vide">Aucun achat clôturé sur la période choisie.</div>',
                deferEmptyText: false
            },
            columns: [
                {text: 'GROSSISTE', dataIndex: 'grossiste', flex: 2, itemId: 'col-grossiste',
                    renderer: function (v, meta, record) {
                        /* Les agences d'un meme groupe sont nommees sous le groupe : « LABOREX-CI » seul
                           ferait disparaitre les cinq agences de l'ecran (20/09). */
                        var detail = record.get('membres');
                        var nom = Ext.String.htmlEncode(v || '');
                        return detail ? nom + '<div class="pilotage-seconde-ligne">'
                                + Ext.String.htmlEncode(detail) + '</div>' : nom;
                    }},
                {text: 'MONTANT', dataIndex: 'montant', width: 150, align: 'right',
                    renderer: function (v) {
                        return testextjs.view.pilotage.PilotageManager.nombre(v);
                    }},
                {text: 'PART', dataIndex: 'part', width: 100, align: 'right', itemId: 'col-part',
                    renderer: function (v) {
                        var t = testextjs.view.pilotage.PilotageManager.nombre(v, '0,000.0');
                    return t === '' ? '' : t + ' %';
                    }}
            ]
        };
    },

    /*
     * Les tuiles. Une vue de donnees plutot qu'un assemblage de panneaux : le serveur decide des tuiles de
     * chaque onglet, et l'ecran n'a pas a connaitre leur liste. La ligne de variation n'apparait que s'il y a
     * une comparaison - et elle est verte a la hausse, rouge a la baisse, avec la fleche qui va avec.
     */
    tuiles: function (cle) {
        return {
            xtype: 'dataview',
            itemId: 'tuiles-' + cle,
            store: this.stores[cle].tuiles,
            /*
             * L'onglet Achats / Ventes n'a que QUATRE tuiles, mais elles portent des libelles longs et des
             * montants a dix chiffres : a deux cent quinze pixels, « Cumul 2025 au meme mois : 592,6 M »
             * passait a la ligne et la bande doublait de hauteur. Plus larges, elles tiennent sur une seule
             * rangee basse - et la place ainsi gagnee revient a la courbe (20/09).
             */
            cls: cle === 'achatsventes' ? 'pilotage-tuiles pilotage-tuiles-larges' : 'pilotage-tuiles',
            itemSelector: 'div.pilotage-tuile',
            emptyText: '<div class="pilotage-vide">Choisissez une période puis « Actualiser ».</div>',
            deferEmptyText: false,
            /*
             * LA BANDE DE TUILES PREND LA HAUTEUR QU'IL LUI FAUT.
             *
             * Elle avait une hauteur FIXE, calculee pour une seule rangee. Les onglets Stock et Qualite en
             * portent sept et six : la septieme passait a la ligne et se trouvait coupee net - « on ne voit
             * pas les donnees de stock dormant et peremptions proches, le cadre est tronque » (20/09).
             *
             * La hauteur est desormais MESUREE sur le contenu reellement dessine, apres chaque chargement :
             * une rangee sur un poste large, deux rangees entieres sur un poste etroit, jamais une rangee
             * coupee. Les tuiles ont en outre ete resserrees pour que sept tiennent sur une seule ligne aux
             * largeurs d'ecran courantes.
             */
            height: 96,
            listeners: {
                refresh: function (vue) {
                    var corps = vue.getEl();
                    /* Quand la bande est posee en COLONNE a cote du graphique, sa hauteur est celle du
                       bandeau : la mesurer sur le contenu la ferait grandir a chaque chargement. */
                    if (!corps || vue.ajustementHauteur === false) {
                        return;
                    }
                    /*
                     * LA HAUTEUR EST MESUREE SUR LES TUILES ELLES-MEMES, et non sur le cadre qui les porte.
                     *
                     * Le cadre etait mesure par scrollHeight, qui ne descend JAMAIS sous la hauteur visible :
                     * la bande pouvait donc grandir, jamais se reduire. Reglee a cent quarante pixels au
                     * depart, elle y restait meme avec une seule rangee de quatre-vingts - et ces soixante
                     * pixels de vide entre les tuiles et le graphique sont exactement ce que l'officine a
                     * signale le 21/09 sur l'onglet Ventes. On mesure donc du haut de la premiere tuile au
                     * bas de la derniere, ce qui se reduit aussi bien que cela grandit.
                     */
                    var tuiles = corps.dom.querySelectorAll('.pilotage-tuile');
                    if (!tuiles.length) {
                        return;
                    }
                    var haut = Number.MAX_VALUE;
                    var bas = 0;
                    Ext.each(tuiles, function (tuile) {
                        var cadre = tuile.getBoundingClientRect();
                        haut = Math.min(haut, cadre.top);
                        bas = Math.max(bas, cadre.bottom);
                    });
                    var hauteur = Math.round(bas - haut) + 10;
                    if (hauteur > 20 && Math.abs(hauteur - vue.getHeight()) > 2) {
                        vue.setHeight(hauteur);
                    }
                }
            },
            tpl: new Ext.XTemplate(
                '<tpl for=".">',
                '<div class="pilotage-tuile{[values.alerte ? \' pilotage-tuile-alerte\' : \'\']}" ',
                'data-cle="{cle}">',
                '<div class="pilotage-tuile-libelle">{libelle}</div>',
                '<div class="pilotage-tuile-valeur{[values.alerte ? \' pilotage-alerte\' : \'\']}">',
                '{[this.montant(values.valeur, values.unite)]}</div>',
                '<tpl if="variation !== null && variation !== undefined">',
                '<div class="pilotage-tuile-variation {[values.variation >= 0 ? \'hausse\' : \'baisse\']}">',
                '{[values.variation >= 0 ? \'▲\' : \'▼\']} {[this.pourcent(values.variation)]}',
                '<span class="pilotage-tuile-ecart"> ({[this.montant(values.ecart, values.unite)]})</span>',
                '</div>',
                '</tpl>',
                /*
                 * LA VALEUR COMPARÉE, EN CLAIR. Une variation de -18,9 % ne dit pas à quoi on se compare :
                 * l'officine voulait « voir les 2 valeurs » dès la bande du haut. La période comparée est
                 * nommée, pour qu'on sache de quel mois il s'agit sans revenir au sélecteur.
                 */
                '<tpl if="reference !== null && reference !== undefined">',
                '<div class="pilotage-tuile-comparee">{libelleReference} : ',
                '<b>{[this.montant(values.reference, values.unite)]}</b></div>',
                '</tpl>',
                '<tpl if="sousTitre">',
                '<div class="pilotage-tuile-sous">{sousTitre}</div>',
                '</tpl>',
                '</div>',
                '</tpl>',
                {
                    montant: function (valeur, unite) {
                        if (valeur === null || valeur === undefined) {
                            return '-';
                        }
                        var signe = valeur < 0 ? '-' : '';
                        var absolu = Math.abs(valeur);
                        /* Les montants d'une officine se comptent en millions : on les abrege pour qu'ils
                         * restent lisibles dans une tuile, le detail mensuel donnant la valeur exacte. */
                        if (unite === 'FCFA' && absolu >= 1000000) {
                            return signe + Ext.util.Format.number(absolu / 1000000, '0,000.0') + ' M';
                        }
                        if (unite === '%') {
                            return signe + Ext.util.Format.number(absolu, '0,000.0') + ' %';
                        }
                        /* L'heure de pointe de la fréquentation : « 11h », pas « 11 ». */
                        if (unite === 'h') {
                            return (absolu < 10 ? '0' : '') + absolu + 'h';
                        }
                        /* Deux décimales seulement quand il y en a : « 0, » se lisait dans les tuiles. */
                        return signe + Ext.util.Format.number(absolu, absolu % 1 === 0 ? '0,000' : '0,000.00');
                    },
                    pourcent: function (valeur) {
                        return Ext.util.Format.number(Math.abs(valeur), '0,000.0') + ' %';
                    }
                })
        };
    },

    /*
     * Le graphique d'evolution.
     *
     * Retours de l'officine du 19/09 : la courbe etait peu visible, les mois en toutes lettres se
     * chevauchaient sur l'axe, et le comparateur ne montrait qu'une seule des deux valeurs comparees. Les
     * trois sont traites ici : trait epais et colore, mois abreges (« sept. 26 »), et DEUX courbes dans le
     * comparateur - comparer sans voir les deux termes de la comparaison n'a pas de sens.
     */
    graphique: function (cle) {
        var champs = {synthese: 'caTTC', ventes: 'caTTC', marge: 'marge', achats: 'achatTTC',
            caisse: 'encaisse', stock: 'valeurAchat', qualite: 'nbAnnulees', kpi: 'caTTC',
            comparateur: 'a'};
        var titres = {synthese: 'Chiffre d\'affaires TTC mensuel', ventes: 'Chiffre d\'affaires TTC mensuel',
            marge: 'Marge mensuelle', achats: 'Achats mensuels', caisse: 'Encaissé au comptoir, par mois',
            stock: 'Valeur du stock au prix d\'achat, fin de mois',
            qualite: 'Ventes annulées par mois', kpi: 'Évolution du premier indicateur coché',
            comparateur: 'Évolution comparée des deux objets'};
        var comparateur = cle === 'comparateur';
        /* Les deux couleurs du comparateur : un bleu franc et un orange, lisibles cote a cote et
           distinguables meme imprimes en noir et blanc. */
        var BLEU = '#1565c0';
        var ORANGE = '#ef6c00';
        var champsAxe = comparateur ? ['a', 'b'] : [champs[cle], champs[cle] + 'Ref'];
        var serie = function (champ, couleur, titre, pointille) {
            return {
                type: 'line',
                axis: 'left',
                xField: 'libelle',
                yField: champ,
                title: titre,
                smooth: false,
                /*
                 * Un trait fin sur fond clair se perd : l'officine ne voyait pas la courbe. Et quand deux
                 * courbes se croisent sur les memes mois - le cas de toute comparaison - la couleur seule ne
                 * suffit pas a les suivre du regard : la courbe de REFERENCE est donc en pointilles.
                 * « La courbe s'entremele et derange l'apercu » (20/09).
                 */
                style: pointille
                        ? {stroke: couleur, 'stroke-width': 3, opacity: 1, 'stroke-dasharray': '7,5'}
                        : {stroke: couleur, 'stroke-width': 3, opacity: 1},
                markerConfig: {radius: 4, type: 'circle', fill: couleur, stroke: couleur},
                /*
                 * L'infobulle : elle était bridée à 260 × 44 pixels, donc tronquée dès qu'un libellé de mode
                 * ou de grossiste était un peu long, et elle s'effaçait au bout du délai par défaut. Elle se
                 * dimensionne maintenant sur son contenu et reste affichée tant que le curseur ne quitte pas
                 * la courbe — retour de l'officine du 19/09.
                 */
                tips: testextjs.view.pilotage.PilotageManager.infobulle(function (record) {
                    var f = testextjs.view.pilotage.PilotageManager;
                    var v = record.get(champ);
                    var ca = record.get('caTTC');
                    var texte = '<b>' + Ext.String.htmlEncode(record.get('libelle') || '') + '</b><br>'
                            + Ext.String.htmlEncode(titre) + ' : ' + (f.nombre(v) || '—');
                    if (ca && champ !== 'caTTC' && v !== null && v !== undefined) {
                        texte += '<br>soit ' + f.nombre(v / ca * 100, '0,000.0')
                                + ' % du chiffre d\'affaires du mois';
                    }
                    return texte;
                })
            };
        };
        /*
         * DEUX COURBES PARTOUT. Hors comparateur, la seconde porte la période de comparaison choisie dans le
         * sélecteur (« Vs mois précédent », « Vs même mois l'an dernier »...) : le 19/09, choisir une
         * comparaison ne changeait que les tuiles, et le graphique restait muet là-dessus. Elle est masquée
         * quand l'axe ne compare rien — c'est le contrôleur qui l'affiche ou la cache au chargement.
         */
        var series = comparateur
                ? [serie('a', BLEU, 'Objet A'), serie('b', ORANGE, 'Objet B', true)]
                : [serie(champs[cle], BLEU, 'Période choisie'),
                    serie(champs[cle] + 'Ref', ORANGE, 'Période comparée', true)];
        return {
            xtype: 'panel',
            itemId: 'graphiquePanneau-' + cle,
            title: titres[cle],
            /* Le graphique et le detail se partagent l'espace restant a parts egales : hauteurs egales
               demandees le 19/09, et plus de bande vide sous la grille. */
            flex: 1,
            minHeight: 300,
            layout: 'fit',
            items: [{
                    xtype: 'chart',
                    itemId: 'graphique-' + cle,
                    animate: false,
                    shadow: false,
                    /* La legende nomme les courbes : sans elle, deux traits de couleur ne se lisent pas. */
                    legend: {position: 'top'},
                    insetPadding: testextjs.view.pilotage.PilotageManager.INSET,
                    store: this.stores[cle].mois,
                    axes: [testextjs.view.pilotage.PilotageManager.axeMontants(champsAxe),
                        testextjs.view.pilotage.PilotageManager.axeMois()],
                    series: series
                }]
        };
    },

    /**
     * L'evolution des modes de reglement, en aires empilees.
     *
     * <p>
     * Empilees et non cote a cote : ce que l'officine regarde ici n'est pas le montant de chaque mode, deja donne
     * par le detail mensuel, mais la PART que chacun prend - la montee du mobile money contre les especes. Une pile
     * dont la hauteur totale est le chiffre d'affaires encaisse montre cela d'un coup d'oeil.
     *
     * <p>
     * Les series sont posees au chargement, comme les colonnes : les modes dependent de ce que l'officine encaisse.
     */
    graphiqueModes: function () {
        return {
            xtype: 'panel',
            itemId: 'graphiquePanneau-modes',
            title: 'Évolution de chaque mode de règlement',
            flex: 1,
            minHeight: 300,
            margin: '0 0 0 6',
            layout: 'fit',
            items: [{
                    xtype: 'chart',
                    itemId: 'graphique-modes',
                    animate: false,
                    shadow: false,
                    legend: {position: 'top'},
                    insetPadding: testextjs.view.pilotage.PilotageManager.INSET,
                    store: this.stores.ventes.mois,
                    axes: [testextjs.view.pilotage.PilotageManager.axeMontants(['caTTC']),
                        testextjs.view.pilotage.PilotageManager.axeMois()],
                    series: []
                }]
        };
    },

    detail: function (cle) {
        var colonnes = testextjs.view.pilotage.PilotageManager.repartirLargeur(this.colonnes(cle));
        return {
            xtype: 'gridpanel',
            itemId: 'detail-' + cle,
            title: cle === 'achatsventes'
                    ? 'Ventes et achats comparés, trois années face à face'
                    : 'Détail mensuel (du mois actuel au plus ancien)',
            /*
             * L'EXPORT EXCEL EST DANS LE TITRE DU TABLEAU, sur TOUS les detail mensuels (21/09) : c'est la
             * qu'on est quand on decide de reprendre les chiffres dans un tableur, et non dans le menu
             * d'impression en haut de l'ecran. Il exporte les colonnes telles qu'elles sont affichees.
             *
             * L'onglet Achats / Ventes y ajoute son selecteur de decoupage et le bouton du diagramme : une
             * barre d'outils de plus, c'est une ligne de moins pour les chiffres, et le choix se fait la ou
             * on lit le resultat.
             */
            header: {
                titlePosition: 0,
                items: (cle !== 'achatsventes' ? [] : [{
                        xtype: 'combobox',
                        itemId: 'decoupage',
                        width: 150,
                        margin: '0 8 0 12',
                        editable: false,
                        value: 'TRIMESTRE',
                        store: new Ext.data.Store({
                            fields: ['id', 'libelle'],
                            data: [
                                {id: 'TRIMESTRE', libelle: 'Par trimestre'},
                                {id: 'SEMESTRE', libelle: 'Par semestre'},
                                {id: 'ANNEE', libelle: 'Par année'}
                            ]
                        }),
                        displayField: 'libelle',
                        valueField: 'id',
                        queryMode: 'local'
                    }, {
                        xtype: 'button',
                        itemId: 'basculerCourbe',
                        text: 'Afficher le diagramme',
                        iconCls: 'icon-chart',
                        enableToggle: true,
                        margin: '0 4 0 0'
                    }]).concat([{
                    xtype: 'button',
                    itemId: 'exporterDetail',
                    text: 'Excel',
                    tooltip: 'Reprendre ce tableau dans un classeur Excel, tel qu\'il est affiché',
                    iconCls: 'icon-excel',
                    margin: '0 8 0 8'
                }])
            },
            store: this.stores[cle].detail,
            flex: 1,
            minHeight: 200,
            columnLines: true,
            features: [{ftype: 'summary'}],
            columns: colonnes,
            viewConfig: {
                /* Le mois en cours est incomplet : il se lit en italique pour qu'on ne le compare pas
                 * naïvement aux mois pleins. Il est en TÊTE du tableau, le détail étant trié du mois
                 * actuel au plus ancien — demande de l'officine du 19/09. */
                getRowClass: function (record, index) {
                    /*
                     * Le tableau va du mois actuel au plus ancien : les trois premieres lignes sont le mois
                     * en cours, le precedent et celui d'avant. Vert, orange, violet - demande du 20/09.
                     * L'onglet Achats / Ventes, lui, aligne des PERIODES d'annees differentes : les colorier
                     * par rang n'aurait aucun sens, ses lignes restent neutres.
                     */
                    if (index > 2 || cle === 'achatsventes') {
                        return '';
                    }
                    return ['pilotage-mois-1 pilotage-mois-encours', 'pilotage-mois-2',
                        'pilotage-mois-3'][index];
                }
            }
        };
    },

    /*
     * KPI cochables.
     *
     * « On devra avoir tous les KPI cochables ; celui qui est coche fera l'objet de l'analyse sur le selecteur
     * de periode choisi et on verra sa courbe d'evolution. » Les cases sont construites a partir du catalogue
     * rendu par le serveur, regroupees par famille d'indicateurs : l'ecran n'en connait pas la liste.
     */
    casesKpi: function () {
        return {
            xtype: 'panel',
            itemId: 'casesKpi',
            title: 'Indicateurs à analyser (cochez ce que vous voulez suivre)',
            bodyPadding: 6,
            layout: {type: 'vbox', align: 'stretch'},
            height: 160,
            autoScroll: true,
            items: [{
                    xtype: 'container',
                    itemId: 'listeKpi',
                    layout: {type: 'table', columns: 5},
                    items: []
                }, {
                    /*
                     * L'ecran PREVIENT plutot que de tracer n'importe quoi. Cocher huit indicateurs est
                     * legitime - le detail mensuel les porte tous - mais le graphique n'en montre que cinq,
                     * et il vaut mieux le dire que de laisser croire a un oubli (20/09).
                     */
                    xtype: 'displayfield',
                    itemId: 'avertissementKpi',
                    margin: '4 0 0 0',
                    value: ''
                }]
        };
    },

    /* La frequentation horaire : un diagramme en bandes, une par heure, visible seulement si l'indicateur
       est coche. Les clients servis font la hauteur des bandes ; le chiffre d'affaires est dans l'infobulle. */
    frequentation: function () {
        var f = testextjs.view.pilotage.PilotageManager;
        return {
            xtype: 'panel',
            itemId: 'frequentation',
            title: 'Fréquentation horaire de la période — clients servis par heure',
            height: 230,
            margin: '4 0 0 0',
            hidden: true,
            layout: 'fit',
            items: [{
                    xtype: 'chart',
                    itemId: 'graphique-frequentation',
                    animate: false,
                    shadow: false,
                    insetPadding: 20,
                    store: this.storeHoraire,
                    theme: 'PilotageBandes',
                    axes: [{
                            type: 'Numeric',
                            position: 'left',
                            fields: ['nbVentes'],
                            minimum: 0,
                            majorTickSteps: 4,
                            grid: true,
                            label: {renderer: function (v) { return f.nombre(v); }}
                        }, {
                            type: 'Category',
                            position: 'bottom',
                            fields: ['libelle'],
                            label: {font: '11px Arial'}
                        }],
                    series: [{
                            type: 'column',
                            axis: 'left',
                            xField: 'libelle',
                            yField: 'nbVentes',
                            gutter: 30,
                            tips: {
                                trackMouse: true,
                                width: 260,
                                height: 44,
                                renderer: function (r) {
                                    this.setTitle('<b>' + r.get('libelle') + '</b> : ' + f.nombre(r.get('nbVentes'))
                                            + ' clients servis — ' + f.nombre(r.get('caTTC')) + ' FCFA');
                                }
                            }
                        }]
                }]
        };
    },

    /*
     * Comparateur : deux objets, la meme grandeur, la meme periode.
     *
     * Deux usages : deux objets de meme nature (deux familles, deux rayons, deux grossistes), ou deux
     * GRANDEURS entre elles - « par exemple les achats aux ventes sur une periode ».
     */
    choixComparateur: function () {
        var me = this;
        return {
            xtype: 'toolbar',
            itemId: 'choixComparateur',
            padding: 4,
            items: [{
                    xtype: 'combobox',
                    itemId: 'typeComparaison',
                    fieldLabel: 'Comparer',
                    labelWidth: 62,
                    width: 230,
                    editable: false,
                    value: 'GRANDEUR',
                    store: new Ext.data.Store({
                        fields: ['id', 'libelle'],
                        data: [
                            {id: 'GRANDEUR', libelle: 'Deux grandeurs'},
                            {id: 'FAMILLE', libelle: 'Deux familles'},
                            {id: 'RAYON', libelle: 'Deux rayons'},
                            {id: 'GROSSISTE', libelle: 'Deux grossistes'}
                        ]
                    }),
                    displayField: 'libelle',
                    valueField: 'id',
                    queryMode: 'local'
                }, {
                    xtype: 'combobox',
                    itemId: 'objetA',
                    fieldLabel: 'A',
                    labelWidth: 16,
                    width: 230,
                    editable: false,
                    store: me.storeKpis,
                    displayField: 'libelle',
                    valueField: 'cle',
                    queryMode: 'local',
                    value: 'caTTC'
                }, {
                    xtype: 'combobox',
                    itemId: 'objetB',
                    fieldLabel: 'B',
                    labelWidth: 16,
                    width: 230,
                    editable: false,
                    store: me.storeKpis,
                    displayField: 'libelle',
                    valueField: 'cle',
                    queryMode: 'local',
                    value: 'achatTTC'
                }, {
                    xtype: 'combobox',
                    itemId: 'grandeurComparee',
                    fieldLabel: 'Sur',
                    labelWidth: 26,
                    width: 190,
                    editable: false,
                    disabled: true,
                    store: new Ext.data.Store({
                        fields: ['id', 'libelle'],
                        data: [
                            {id: 'caTTC', libelle: 'Chiffre d\'affaires'},
                            {id: 'marge', libelle: 'Marge'},
                            {id: 'unites', libelle: 'Unités vendues'}
                        ]
                    }),
                    displayField: 'libelle',
                    valueField: 'id',
                    queryMode: 'local',
                    value: 'caTTC'
                }, {
                    /*
                     * LA COMPARAISON NE PART PLUS TOUTE SEULE. Choisir « deux rayons » vidait A et B, et
                     * chaque frappe relancait une requete lourde sur une comparaison incomplete - c'est
                     * l'onglet le plus lent du menu, et il partait pour rien. « Ne pas lancer
                     * automatiquement la recherche de la serie a comparer » (20/09) : c'est ce bouton, et
                     * lui seul, qui la lance, et il verifie d'abord que les trois choix sont faits.
                     */
                    xtype: 'button',
                    itemId: 'comparer',
                    text: 'Comparer',
                    iconCls: 'search'
                }, {
                    xtype: 'component',
                    flex: 1
                }, {
                    xtype: 'displayfield',
                    itemId: 'noteComparateur',
                    value: ''
                }]
        };
    },

    /**
     * La courbe de l'onglet Achats / Ventes : les periodes en abscisse, une COULEUR PAR ANNEE.
     *
     * <p>
     * Les ventes en trait plein, les achats en pointilles de la meme couleur : on voit d'un regard si l'ecart
     * entre ce qu'on vend et ce qu'on achete se creuse ou se referme d'une annee sur l'autre, ce qu'un tableau
     * de chiffres ne montre jamais aussi vite. Les series sont posees au chargement, comme les colonnes : les
     * annees changent avec la date du jour.
     */
    graphiqueAchatsVentes: function () {
        return {
            xtype: 'panel',
            itemId: 'graphiquePanneau-achatsventes',
            title: 'Évolution comparée des ventes et des achats',
            margin: '4 0 0 0',
            /*
             * MASQUE AU DEPART, et c'est ce qui a ete demande : « l'ecran est surcharge par le bas »
             * (20/09). Le tableau porte les chiffres exacts et suffit le plus souvent ; le diagramme
             * s'ouvre par le bouton place a cote du selecteur de decoupage, quand on veut voir la forme
             * plutot que les nombres.
             */
            hidden: true,
            flex: 1,
            minHeight: 300,
            layout: 'fit',
            items: [{
                    xtype: 'chart',
                    itemId: 'graphique-achatsventes',
                    animate: false,
                    shadow: false,
                    legend: {position: 'top'},
                    insetPadding: 30,
                    store: this.stores.achatsventes.detail,
                    /* Les couleurs du diagramme : une par annee, la plus recente la plus franche. */
                    theme: 'PilotageBandes',
                    axes: [testextjs.view.pilotage.PilotageManager.axeMontants(['libelle'], true), {
                            type: 'Category',
                            position: 'bottom',
                            fields: ['libelle'],
                            label: {
                                font: 'bold 12px tahoma, arial, sans-serif',
                                fill: '#333333'
                            }
                        }],
                    series: []
                }]
        };
    },

    /** Colonnes du detail mensuel, par onglet. Les montants portent leur total en pied de grille. */
    colonnes: function (cle) {
        /*
         * Les colonnes qui ne sont PAS un montant a rapporter au chiffre d'affaires : un nombre de ventes,
         * un nombre de bons, un panier moyen ou un ratio rapportes au chiffre d'affaires du mois ne
         * voudraient rien dire. Elles gardent l'evolution, qui elle a un sens.
         */
        var SANS_PART = ['nbVentes', 'nbBons', 'nbAnnulees', 'unites', 'panier', 'ratioVA', 'caTTC',
            'a', 'b', 'ecart', 'rapport'];
        var montant = function (texte, champ, largeur, options) {
            var opt = Ext.apply({part: SANS_PART.indexOf(champ) < 0}, options || {});
            return {text: texte, dataIndex: champ, width: largeur || 150, align: 'right',
                itemId: 'col-' + champ,
                renderer: function (v, meta, record, rowIndex, colIndex, store) {
                    var f = testextjs.view.pilotage.PilotageManager;
                    var t = f.nombre(v);
                    return t === '' ? '' : t + f.secondeLigne(v, record, rowIndex, store, champ, opt);
                },
                summaryType: 'sum',
                summaryRenderer: function (v) {
                    var t = testextjs.view.pilotage.PilotageManager.nombre(v);
                    return t === '' ? '' : '<b>' + t + '</b>';
                }};
        };
        /* Un taux se compare au mois precedent en POINTS, pas en pourcentage d'un pourcentage. */
        var taux = function (texte, champ, largeur) {
            return {text: texte, dataIndex: champ, width: largeur || 120, align: 'right',
                itemId: 'col-' + champ,
                renderer: function (v, meta, record, rowIndex, colIndex, store) {
                    var f = testextjs.view.pilotage.PilotageManager;
                    var t = f.nombre(v, '0,000.0');
                    return t === '' ? '' : t + ' %'
                            + f.secondeLigne(v, record, rowIndex, store, champ, {points: true, part: false});
                }};
        };
        /*
         * LA COLONNE DES MOIS NE MANGE PLUS LA LARGEUR. En « flex », elle absorbait tout l'espace laisse
         * libre par les autres : dans la Synthese, le nom du mois occupait la moitie du tableau pendant que
         * les montants et leur seconde ligne se serraient. Elle prend maintenant sa juste largeur, et
         * l'espace restant se partage entre les colonnes de chiffres (voir repartirLargeur).
         */
        var mois = {text: 'MOIS', dataIndex: 'libelle', width: 160, itemId: 'col-mois',
            summaryRenderer: function () {
                return '<b>TOTAL</b>';
            }};
        if (cle === 'marge') {
            return [mois, montant('CA HT', 'caHT'), montant('COÛT D\'ACHAT', 'coutAchat'),
                montant('MARGE', 'marge'), taux('TAUX DE MARGE', 'tauxMarge'),
                montant('CA TTC', 'caTTC'), montant('ACHATS TTC', 'achatTTC')];
        }
        if (cle === 'achats') {
            /* Les colonnes de grossistes s'ajoutent au chargement : elles dependent de qui a livre. */
            return [mois, montant('ACHATS', 'achatTTC'), montant('BONS', 'nbBons', 80)];
        }
        if (cle === 'achatsventes') {
            /* Les colonnes d'annees sont posees au chargement : elles dependent de la date du jour. */
            return [{text: 'PÉRIODE', dataIndex: 'libelle', width: 130, itemId: 'col-periode',
                    summaryRenderer: function () {
                        return '<b>TOTAUX</b>';
                    }}];
        }
        if (cle === 'kpi') {
            /* Les colonnes suivent les cases cochees : elles sont posees au chargement. */
            return [mois];
        }
        if (cle === 'comparateur') {
            return [mois, montant('OBJET A', 'a', 150), montant('OBJET B', 'b', 150),
                montant('ÉCART', 'ecart', 150),
                {text: 'RAPPORT A / B', dataIndex: 'rapport', width: 130, align: 'right',
                    itemId: 'col-rapport',
                    renderer: function (v) {
                        return testextjs.view.pilotage.PilotageManager.nombre(v, '0,000.00');
                    }}];
        }
        if (cle === 'stock') {
            /*
             * « À quoi correspondent les sorties affichées ? les ventes ? » (20/09). Oui : ce sont les
             * quantites VENDUES du mois, valorisees au prix d'achat du referentiel - et les entrees sont
             * les quantites RECUES des bons de livraison, valorisees au prix d'achat de la ligne du bon.
             * Les deux colonnes le disent desormais, plutot que de laisser deviner.
             */
            return [mois, montant('VALEUR DU STOCK', 'valeurAchat', 160),
                montant('ENTRÉES (ACHATS)', 'entrees', 150),
                montant('SORTIES (VENTES)', 'sorties', 150), montant('VARIATION', 'variationStock'),
                /*
                 * MASQUEE (21/09) : la source de la valeur ne change qu'une fois dans l'historique - avant
                 * le premier releve nocturne elle est reconstituee, apres elle est capturee - et elle
                 * occupait une colonne a chaque ligne pour le redire. Elle reste disponible dans le menu
                 * des colonnes du tableau, pour qui veut verifier.
                 */
                {text: 'SOURCE', dataIndex: 'mesure', width: 110, itemId: 'col-mesure', hidden: true,
                    renderer: function (v) {
                        /* Une valeur mesurée et une valeur reconstituée ne se lisent pas de la même façon :
                         * l'écran le dit ligne par ligne plutôt qu'une fois en note. */
                        return v ? 'Capture' : '<span style="color:#8a6d3b">Reconstituée</span>';
                    }}];
        }
        if (cle === 'qualite') {
            /* Le montant annulé (ventes) et la part rendue en espèces (caisse) sont deux grandeurs
               différentes : l'état imprimé donne les deux, l'écran aussi. */
            return [mois, montant('CA TTC', 'caTTC'), montant('VENTES', 'nbVentes', 90),
                montant('ANNULÉES', 'nbAnnulees', 100), taux('% ANNUL.', 'tauxAnnulation'),
                montant('MONTANT ANNULÉ', 'montantAnnule', 140), montant('DONT ESPÈCES', 'annuleEspece', 130),
                montant('REMISES', 'remises'), taux('% REMISE', 'tauxRemise')];
        }
        if (cle === 'caisse') {
            /*
             * PLUS DE COLONNE DE POURCENTAGE : la part de chaque montant dans le chiffre d'affaires se lit
             * maintenant sous le montant lui-meme (« retirer la colonne pourcentage et la mettre apres le
             * montant pour gagner de la place », 20/09). La part comptant, c'est la part de l'encaisse.
             */
            return [mois, montant('CA TTC', 'caTTC'), montant('ENCAISSÉ', 'encaisse'),
                montant('CRÉDIT', 'credit'),
                montant('TP FACTURÉ', 'partTiersPayant'), montant('TP RÉGLÉ', 'tpRegle')];
        }
        if (cle === 'ventes') {
            /* Les colonnes de modes de reglement s'ajoutent au chargement : elles dependent des modes
             * REELLEMENT rencontres sur la periode. */
            return [mois, montant('CA TTC', 'caTTC'), montant('VENTES', 'nbVentes', 90),
                montant('PANIER MOYEN', 'panier'), montant('REMISES', 'remises')];
        }
        /* « À quoi correspond le taux affiché ? » (20/09) : la colonne s'appelait « TAUX » tout court et
           ne pouvait pas repondre. C'est le taux de MARGE - la marge rapportee au chiffre d'affaires HT. */
        return [mois, montant('CA TTC', 'caTTC'), montant('MARGE', 'marge'),
            taux('TAUX DE MARGE', 'tauxMarge', 130),
            montant('ACHATS TTC', 'achatTTC'), montant('VENTES', 'nbVentes', 90),
            montant('PANIER MOYEN', 'panier'), montant('PART TIERS PAYANT', 'partTiersPayant')];
    }
});
