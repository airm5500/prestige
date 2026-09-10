/* global Ext */

/*
 * Les produits d'une vente, charges A LA DEMANDE.
 *
 * Les grilles de ventes affichaient jadis leur detail sous un (+) : les produits devaient alors
 * descendre avec CHAQUE ligne de la liste, pour des lignes que personne n'ouvrait. Sur un mois de
 * registre cela alourdit tous les chargements de periode au profit de la seule vente que
 * l'utilisateur finit par consulter.
 *
 * Cette fenetre inverse le rapport : rien ne part avec la liste, et le detail n'est demande qu'au
 * clic, pour la vente choisie. Elle est partagee par l'ordonnancier et par les suppressions de
 * vente, qui ont le meme besoin.
 */
Ext.define('testextjs.view.vente.DetailProduitsVente', {
    extend: 'Ext.window.Window',
    xtype: 'detailproduitsvente',
    modal: true,
    autoShow: true,
    maximizable: true,
    iconCls: 'icon-grid',
    width: 820,
    height: 460,
    layout: {type: 'fit'},

    config: {
        /** Identifiant de la vente dont on veut les produits. */
        venteId: null,
        /** Reference affichee dans le titre : l'utilisateur doit reconnaitre la vente qu'il a ouverte. */
        reference: '',
        /**
         * Point d'entree a interroger. Chaque ecran a le sien : l'ordonnancier ne retient que les
         * produits soumis a ordonnance, les suppressions rendent tous les produits de la vente.
         */
        urlDetail: '../api/v1/ventestats/ventesordonnanciers/detail/',
        /** Le code tableau n'a de sens que pour le registre : ailleurs la colonne serait vide. */
        avecTableau: true
    },

    constructor: function (config) {
        var me = this;
        config = config || {};
        me.initConfig(config);
        me.produitStore = Ext.create('Ext.data.Store', {
            fields: [
                {name: 'intCIP', type: 'string'},
                {name: 'strNAME', type: 'string'},
                {name: 'codeTableau', type: 'string'},
                {name: 'intQUANTITY', type: 'int'},
                {name: 'intPRICEUNITAIR', type: 'int'},
                {name: 'intPRICE', type: 'int'}
            ],
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: me.getUrlDetail() + me.getVenteId(),
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });
        Ext.apply(config, {
            title: 'Produits de la vente [' + (me.getReference() || me.getVenteId()) + ']',
            items: [me.grille()]
        });
        me.callParent([config]);
    },

    grille: function () {
        var me = this;
        var colonnes = [
            {header: 'CIP', dataIndex: 'intCIP', width: 100},
            {header: 'Produit', dataIndex: 'strNAME', flex: 1}
        ];
        if (me.getAvecTableau()) {
            colonnes.push({
                header: 'Tableau', dataIndex: 'codeTableau', width: 80, align: 'center',
                renderer: function (valeur) {
                    return valeur ? '<b>' + valeur + '</b>' : '';
                }
            });
        }
        colonnes.push(
                {header: 'Qt&eacute;', dataIndex: 'intQUANTITY', width: 70, align: 'right'},
                {
                    header: 'P.U.', dataIndex: 'intPRICEUNITAIR', width: 100, align: 'right',
                    xtype: 'numbercolumn', format: '0,000.'
                },
                {
                    header: 'Montant', dataIndex: 'intPRICE', width: 110, align: 'right',
                    xtype: 'numbercolumn', format: '0,000.'
                });
        return {
            xtype: 'gridpanel',
            itemId: 'grilleProduits',
            store: me.produitStore,
            viewConfig: {
                forceFit: true,
                columnLines: true,
                // Une vente peut n'avoir aucun produit retenu par le filtre de l'ecran : le dire
                // vaut mieux qu'une grille vide qu'on prend pour un chargement en panne.
                deferEmptyText: false,
                emptyText: '<div style="padding:12px">Aucun produit &agrave; afficher pour cette vente.</div>'
            },
            columns: colonnes
        };
    },

    listeners: {
        // Le chargement part a l'affichage, pas a la construction : la fenetre est visible pendant
        // qu'il tourne, et l'utilisateur voit l'indicateur d'attente de la grille.
        afterrender: function (fenetre) {
            fenetre.produitStore.load();
        }
    }
});
