/* global Ext */

/*
 * Retours du 08/10 (12) : « tout en un » — l'ecran Commandes en cours reunit la liste des commandes et le suivi
 * PharmaML en onglets : Commandes en cours | Ruptures | Risque de rupture | Substitutions | Alertes | Tableau de bord.
 * La liste est l'ecran existant (i_order_manager) sans changement ; les quatre autres onglets sont ceux de l'ecran
 * « Liste des ruptures » (rupturepharma, toujours accessible par son menu), cree au premier clic, sa propre barre
 * d'onglets masquee. Les pastilles donnent le nombre d'alertes non lues et de substitutions a decider.
 */
Ext.define('testextjs.view.commandemanagement.order.CommandesEnCours', {
    extend: 'Ext.panel.Panel',
    xtype: 'commandesencours',
    requires: ['testextjs.view.commandemanagement.order.OrderManager', 'testextjs.view.pharmaml.Rupturepharma',
        'testextjs.view.commandemanagement.order.RisqueRupture'],
    layout: 'card',
    border: false,
    header: false,
    cls: 'cec-hub',
    config: {
        nameintern: '',
        titre: '',
        data: null
    },

    ONGLETS: [
        {cle: 'commandes', texte: 'Commandes en cours'},
        {cle: 'ruptures', texte: 'Ruptures de commande', onglet: 'ongletRuptures'},
        /* retours du 09/10 (3) : couverture du stock face au delai de livraison */
        {cle: 'risque', texte: 'Risque de rupture'},
        {cle: 'substitutions', texte: 'Substitutions', onglet: 'ongletSubstitutions', pastille: 'aDecider'},
        {cle: 'alertes', texte: 'Alertes', onglet: 'ongletAlertes', pastille: 'alertesNonLues'},
        {cle: 'tableau', texte: 'Tableau de bord', onglet: 'ongletTableauBord'}
    ],

    initComponent: function () {
        var me = this;
        me.liste = Ext.create('testextjs.view.commandemanagement.order.OrderManager', {
            nameintern: me.nameintern, titre: me.titre, data: me.data, header: false
        });
        me.habiller(me.liste);
        Ext.apply(me, {
            items: [me.liste],
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', itemId: 'ongletsCec', cls: 'cec-onglets',
                    /* retours du 10/10 : onglets centres */
                    layout: {type: 'hbox', pack: 'center'},
                    items: Ext.Array.map(me.ONGLETS, function (o) {
                        return {
                            xtype: 'button', itemId: 'cec-' + o.cle, text: o.texte, cls: 'cec-onglet', toggleGroup: 'cec-onglets-' + me.id,
                            allowDepress: false, pressed: o.cle === 'commandes', handler: function () {
                                me.afficher(o.cle);
                            }
                        };
                    })
                }]
        });
        me.callParent(arguments);
        me.on('afterrender', me.majPastilles, me);
        me.on('afterrender', me.chargerDroits, me);
    },

    /* Retours du 09/10 (3) : un droit par onglet Substitutions, Alertes, Tableau de bord ; sans le droit, l'onglet
     * n'apparait pas (le serveur refuse aussi ses donnees). */
    DROITS: {substitutions: 'substitutions', alertes: 'alertes', tableau: 'tableauBord', risque: 'risqueRupture'},

    chargerDroits: function () {
        var me = this;
        Ext.Ajax.request({
            url: '../api/v1/pharma/droits', method: 'GET',
            success: function (r) {
                var d = Ext.decode(r.responseText, true);
                if (me.isDestroyed || !d || !d.success) {
                    return;
                }
                me.droits = d;
                Ext.Object.each(me.DROITS, function (cle, droit) {
                    var b = me.down('#cec-' + cle);
                    if (b) {
                        b.setVisible(!!d[droit]);
                    }
                });
            }
        });
    },

    autorise: function (cle) {
        var droit = this.DROITS[cle];
        return !droit || !this.droits || !!this.droits[droit];
    },

    /* meme presentation que lorsque chaque ecran est ouvert seul */
    habiller: function (ecran) {
        var A = window.PrestigeAffichage;
        if (!A) {
            return;
        }
        var est = function (liste) {
            return Ext.Array.some(liste || [], function (x) {
                return ecran.isXType(x);
            });
        };
        if (est(A.ECRANS_STYLE_VENTE) || A.THEME_PARTOUT) {
            A.habillerStyleVente(ecran);
        }
        if (est(A.ECRANS_FOND_VENTE)) {
            ecran.addCls('mv-panneau');
        }
    },

    pml: function () {
        var me = this;
        if (!me.ecranPml) {
            me.ecranPml = Ext.create('testextjs.view.pharmaml.Rupturepharma', {header: false});
            me.habiller(me.ecranPml);
            me.add(me.ecranPml);
            var onglets = me.ecranPml.down('#ongletsRuptures');
            onglets.getTabBar().hide();
            /* compteurs a jour quand une alerte est lue ou une substitution decidee */
            me.ecranPml.down('#grilleAlertes').getStore().on('datachanged', me.majPastilles, me, {buffer: 300});
            me.ecranPml.down('#grilleSubstitutions').getStore().on('load', me.majPastilles, me, {buffer: 300});
        }
        return me.ecranPml;
    },

    /** cle : commandes | ruptures | substitutions | alertes | tableau */
    afficher: function (cle) {
        var me = this, o = Ext.Array.findBy(me.ONGLETS, function (x) {
            return x.cle === cle;
        });
        if (!o || !this.autorise(cle)) {
            return null;
        }
        /* un seul onglet actif, y compris quand on arrive par un raccourci (bandeau, pastille) */
        Ext.each(me.ONGLETS, function (x) {
            var b = me.down('#cec-' + x.cle);
            if (b && b.pressed !== (x.cle === cle)) {
                b.toggle(x.cle === cle, true);
            }
        });
        if (cle === 'commandes') {
            me.getLayout().setActiveItem(me.liste);
            me.liste.chargerAlertesPml && me.liste.chargerAlertesPml();
            return me.liste;
        }
        if (cle === 'risque') {
            if (!me.ecranRisque) {
                me.ecranRisque = Ext.create('testextjs.view.commandemanagement.order.RisqueRupture');
                me.habiller(me.ecranRisque);
                me.add(me.ecranRisque);
            }
            me.getLayout().setActiveItem(me.ecranRisque);
            return me.ecranRisque;
        }
        var e = me.pml();
        me.getLayout().setActiveItem(e);
        e.ouvrirOnglet(o.onglet);
        return e;
    },

    majPastilles: function () {
        var me = this;
        Ext.Ajax.request({
            url: '../api/v1/pharma/tableau-bord', method: 'GET',
            success: function (r) {
                var t = Ext.decode(r.responseText, true) || {};
                if (me.isDestroyed || !t.success) {
                    return;
                }
                Ext.each(me.ONGLETS, function (o) {
                    var b = me.down('#cec-' + o.cle);
                    if (b && o.pastille) {
                        var n = t[o.pastille] || 0;
                        b.setText(o.texte + (n > 0 ? ' <span class="cec-pastille' + (o.cle === 'alertes' && t.alertesReglementaires ? ' critique' : '') + '">' + n + '</span>' : ''));
                    }
                });
            }
        });
    }
});
