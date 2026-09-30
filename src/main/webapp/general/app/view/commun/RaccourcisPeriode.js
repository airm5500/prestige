/* global Ext */

/*
 * Selecteur de dates « du → au » du theme commun (maquette validee le 30/09) : raccourcis de periode a cote des deux
 * champs de date existants.
 *
 * Plugin pose sur le champ de FIN ; il retrouve le champ de debut par son itemId (option debut) dans le meme conteneur.
 * Il ajoute juste apres un bouton « Période ▾ » dont le menu pose les deux dates (Aujourd'hui, Hier, 7 jours,
 * 30 jours, Ce mois, Mois dernier, 12 mois, Cette année). Les champs restent ceux que lisent les controleurs ; apres un
 * raccourci, 'select' est emis sur le champ de fin comme si l'utilisateur l'avait choisi dans le calendrier, puis le
 * bouton « declencher » (s'il est donne) recoit un clic.
 */
Ext.define('testextjs.view.commun.RaccourcisPeriode', {
    extend: 'Ext.AbstractPlugin',
    alias: 'plugin.raccourcisperiode',
    /** itemId du champ de debut, dans le meme conteneur que le champ de fin. */
    debut: null,
    /** itemId facultatif d'un bouton du meme conteneur a declencher apres un raccourci (Calculer, Actualiser...). */
    declencher: null,

    statics: {
        /** Les periodes proposees : [libelle, fonction(aujourd'hui) -> [debut, fin]]. */
        periodes: function () {
            var D = Ext.Date;
            return [
                ['Aujourd\'hui', function (j) {
                        return [j, j];
                    }],
                ['Hier', function (j) {
                        var h = D.add(j, D.DAY, -1);
                        return [h, h];
                    }],
                ['7 derniers jours', function (j) {
                        return [D.add(j, D.DAY, -6), j];
                    }],
                ['30 derniers jours', function (j) {
                        return [D.add(j, D.DAY, -29), j];
                    }],
                ['Ce mois', function (j) {
                        return [D.getFirstDateOfMonth(j), j];
                    }],
                ['Mois dernier', function (j) {
                        var m = D.add(D.getFirstDateOfMonth(j), D.MONTH, -1);
                        return [m, D.getLastDateOfMonth(m)];
                    }],
                ['12 derniers mois', function (j) {
                        return [D.add(j, D.MONTH, -12), j];
                    }],
                ['Cette année', function (j) {
                        return [new Date(j.getFullYear(), 0, 1), j];
                    }]
            ];
        }
    },

    init: function (fin) {
        var me = this;
        me.fin = fin;
        fin.on('afterrender', me.monter, me, {single: true});
    },

    monter: function () {
        var me = this, fin = me.fin, parent = fin.ownerCt;
        if (!parent) {
            return;
        }
        var menu = Ext.Array.map(me.self.periodes(), function (p) {
            return {text: p[0], handler: function () {
                    me.appliquer(p[1](Ext.Date.clearTime(new Date())));
                }};
        });
        me.bouton = parent.insert(parent.items.indexOf(fin) + 1, {
            xtype: 'button', itemId: (fin.itemId || fin.id) + 'Raccourcis', text: 'Période', cls: 'ordo-btn periode-raccourcis',
            tooltip: 'Choisir une période toute faite', margin: '0 0 0 4', menu: {plain: true, cls: 'periode-menu', items: menu}
        });
    },

    appliquer: function (dates) {
        var me = this, fin = me.fin, debut = fin.ownerCt.down('#' + me.debut);
        if (debut) {
            debut.setValue(dates[0]);
        }
        fin.setValue(dates[1]);
        fin.fireEvent('select', fin, dates[1]);
        var bouton = me.declencher ? fin.ownerCt.down('#' + me.declencher) : null;
        if (bouton && !bouton.disabled) {
            bouton.fireEvent('click', bouton);
        }
    }
});
