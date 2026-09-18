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
            'pilotage #barrePeriode menuitem[itemId=imprimerPdf]': {click: me.imprimer},
            'pilotage #barrePeriode menuitem[itemId=exporterExcel]': {click: me.exporter},
            'pilotage #filtresAchats combobox[itemId=grossiste]': {select: me.actualiser},
            'pilotage #filtresAchats combobox[itemId=famille]': {select: me.actualiser},
            'pilotage #filtresAchats combobox[itemId=emplacement]': {select: me.actualiser},
            'pilotage #filtresAchats button[itemId=reinitialiserAchats]': {click: me.reinitialiserAchats}
        });
    },

    surAffichage: function (ecran) {
        var me = this;
        ecran.storeFamilles.load();
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
        return parametres;
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
        Ext.Ajax.request({
            url: '../api/v1/pilotage/onglet/' + encodeURIComponent(cle),
            method: 'GET',
            params: me.parametres(),
            timeout: 180000,
            callback: function () {
                if (onglet) {
                    onglet.setLoading(false);
                }
            },
            success: function (reponse) {
                var r = Ext.decode(reponse.responseText, true) || {};
                if (r.success !== true) {
                    Ext.Msg.alert('Pilotage', r.message || 'Les chiffres n\'ont pas pu être rassemblés.');
                    return;
                }
                me.afficherAxe(r.axe);
                stores.tuiles.loadData(r.tuiles || []);
                stores.mois.loadData(r.mois || []);
                me.ajusterColonnesModes(cle, r.modes);
                me.afficherAchats(cle, r);
                me.afficherNote(cle, r);
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
        var store = ecran.stores.ventes.mois;
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
                    return Ext.util.Format.number(v, '0,000.');
                },
                summaryType: 'sum',
                summaryRenderer: function (v) {
                    return '<b>' + Ext.util.Format.number(v, '0,000.') + '</b>';
                }});
        });
        grille.reconfigure(store, colonnes);
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
        var store = ecran.stores.achats.mois;
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
                    return Ext.util.Format.number(v, '0,000.');
                },
                summaryType: 'sum',
                summaryRenderer: function (v) {
                    return '<b>' + Ext.util.Format.number(v, '0,000.') + '</b>';
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
