/* global Ext */

/*
 * Plan du 14/11, point 3 : « Liste des Bons par Organisme » en deux onglets :
 *  - Bons : l'ecran existant (facturesubrogatoireother), sans changement de fonctionnement ;
 *  - Bordereaux / suivi : l'ecran « Suivi des bons » (tpventes) de la Facturation, sans changement non plus.
 * Le menu ouvre ce conteneur (App.ecranReel) ; les deux ecrans gardent leurs identifiants, leurs controleurs et leurs
 * tests. Le menu « Suivi des bons » de la Facturation reste en place. L'onglet du suivi n'apparait que pour un
 * utilisateur qui a ce menu (meme droit qu'avant).
 */
Ext.define('testextjs.view.sm_user.journalvente.BonsOrganismeOnglets', {
    extend: 'Ext.panel.Panel',
    xtype: 'bonsorganismeonglets',
    requires: ['testextjs.view.sm_user.journalvente.FactureSubrogatoireBisManager', 'testextjs.view.vente.VenteTiersPayant',
        'testextjs.view.sm_user.journalvente.PointageBons'],
    layout: 'card',
    border: false,
    header: false,
    cls: 'cec-hub bo-hub',
    config: {
        nameintern: '',
        titre: '',
        odatasource: ''
    },

    ONGLETS: [{cle: 'bons', texte: 'Bons', aide: 'Bons par organisme : recherche, modification, impression'},
        {cle: 'suivi', texte: 'Bordereaux / suivi', aide: 'Suivi des bons par tiers payant (bordereaux)', composant: 'tpventes'},
        /* 15/11 : pointage des bons, bon par bon, avant l'envoi de la facture */
        {cle: 'pointage', texte: 'Pointage', aide: 'Pointer chaque bon contre le papier, organisme par organisme, avant la facture'}],

    initComponent: function () {
        var me = this;
        me.liste = Ext.create('testextjs.view.sm_user.journalvente.FactureSubrogatoireBisManager', {header: false});
        me.habiller(me.liste);
        Ext.apply(me, {
            items: [me.liste],
            dockedItems: [{
                    xtype: 'toolbar', dock: 'top', itemId: 'ongletsBo', cls: 'cec-onglets', layout: {type: 'hbox', pack: 'start', align: 'middle'},
                    items: Ext.Array.map(me.ONGLETS, function (o) {
                        return {xtype: 'button', itemId: 'bo-' + o.cle, text: o.texte, cls: 'cec-onglet', toggleGroup: 'bo-onglets-' + me.id,
                            allowDepress: false, pressed: o.cle === 'bons', tooltip: o.aide, hidden: !!o.composant && !me.aLeMenu(o.composant),
                            handler: function () {
                                me.afficher(o.cle);
                            }};
                    })
                }]
        });
        me.callParent(arguments);
    },

    /** Le menu (par son ecran) est-il dans l'arbre de l'utilisateur ? Sans arbre lisible, l'onglet reste visible. */
    aLeMenu: function (composant) {
        try {
            var nav = Ext.ComponentQuery.query('navigation')[0], trouve = false;
            if (!nav || !nav.getStore() || !nav.getStore().getRootNode()) {
                return true;
            }
            nav.getStore().getRootNode().cascadeBy(function (n) {
                if (n.get('id') === composant) {
                    trouve = true;
                }
            });
            return trouve;
        } catch (e) {
            return true;
        }
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
            var b = me.down('#bo-' + x.cle);
            if (b && b.pressed !== (x.cle === cle)) {
                b.toggle(x.cle === cle, true);
            }
        });
        if (cle === 'pointage') {
            if (!me.pointage || me.pointage.isDestroyed) {
                me.pointage = Ext.create('testextjs.view.sm_user.journalvente.PointageBons', {itemId: 'ongletPointage'});
                me.add(me.pointage);
            }
            me.getLayout().setActiveItem(me.pointage);
            return me.pointage;
        }
        if (cle === 'suivi') {
            if (!me.suivi || me.suivi.isDestroyed) {
                // cree au premier clic seulement : son controleur charge la liste a l'affichage (viewready)
                me.suivi = Ext.create('testextjs.view.vente.VenteTiersPayant', {header: false, title: undefined, frame: false});
                me.habiller(me.suivi);
                me.add(me.suivi);
            }
            me.getLayout().setActiveItem(me.suivi);
            return me.suivi;
        }
        me.getLayout().setActiveItem(me.liste);
        return me.liste;
    }
});
