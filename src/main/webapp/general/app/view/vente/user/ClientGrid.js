/* global Ext */

/*
 * Tiers payant PRINCIPAL d'un client, celui dont on affiche le nom et le taux.
 *
 * Un client peut en porter plusieurs ; c'est le principal qui compte a l'ecran de choix. A defaut
 * d'indication, on garde le premier de la liste - c'est ce que faisait l'ancienne version, qui
 * toutefois plantait sur un client sans aucun tiers payant.
 */
function tiersPayantPrincipal(record) {
    const liste = record.get('tiersPayants') || [];
    if (!liste.length) {
        return null;
    }
    return liste.filter(function (tp) {
        return tp && tp.principal;
    })[0] || liste[0];
}

Ext.define('testextjs.view.vente.user.ClientGrid', {
    extend: 'Ext.window.Window',
    xtype: 'assuranceClient',
    autoShow: false,
    height: 400,
    width: '60%',
    modal: true,
    title: 'CLIENT(S) CORRESPONDANT(S) A LA RECHERCHE',
    iconCls: 'icon-grid',
    closeAction: 'hide',
    closable: false,
    layout: {
        type: 'fit'
    },
    config: {
        data: null
    },
    initComponent: function () {

        var me = this;
        var clientStore=me.getData();
        Ext.applyIf(me, {
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            text: 'Nouveau client',
                            hidden:true,
                            scope: this,
                            itemId: 'addBtnClientAssurance',
                            iconCls: 'addicon'

                        }
                    ]
                },
                {
                    xtype: 'toolbar',
                    dock: 'bottom',
                    ui: 'footer',
                    layout: {
                        pack: 'end',
                        type: 'hbox'
                    },
                    items: [
                        /* Nombre de clients trouves, juste avant « Annuler » : la barre est en
                         * pack:'end', les deux elements sont donc colles a droite dans cet ordre.
                         * Demande de recette : savoir d'un coup d'oeil si la recherche a ramene
                         * une poignee de clients ou toute une page a parcourir. */
                        {
                            xtype: 'tbtext',
                            itemId: 'nbClientsTrouves',
                            text: '',
                            style: 'font-weight:700;color:#1f4e79;'
                        },
                        {
                            xtype: 'tbspacer',
                            width: 12
                        },
                        {
                            xtype: 'button',
                            itemId: 'btnCancelClient',
                            text: 'Annuler'

                        }
                    ]
                }

            ],
            items: [
                {
                    xtype: 'gridpanel',
                    store: clientStore,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },
                    columns: [
                        {
                            text: '#',
                            width: 45,
                            dataIndex: 'lgCLIENTID',
                            hidden: true

                        },
                        {
                            xtype: 'rownumberer',
                            text: 'LG',
                            width: 25,
                            sortable: true
                        },
                        {
                            text: 'Num SS',
                            flex: 0.8,
                            sortable: true,
                            dataIndex: 'strNUMEROSECURITESOCIAL'
                        },

                        {
                            text: 'Nom',
                            flex: 0.9,
                            sortable: true,
                            dataIndex: 'strFIRSTNAME'
                        },

                        {
                            header: 'Prénom(s)',
                            dataIndex: 'strLASTNAME',
                            flex: 1.5

                        },
                        {
                            header: 'Téléphone',
                            dataIndex: 'strADRESSE',
                            flex:0.8

                        },
                        {
                            header: 'RO',
                            flex: 1,
                            renderer: function (value, meta, record) {
                                const tp = tiersPayantPrincipal(record);
                                return tp ? '<span style="color:blue;font-weight:bold;">'
                                        + Ext.String.htmlEncode(tp.tpFullName || '') + '</span>' : '';
                            }

                        },
                        {
                            /* Le taux de prise en charge du tiers payant principal, a cote de son nom :
                             * a nom egal, c'est souvent le taux qui distingue le bon dossier du mauvais. */
                            header: '%',
                            width: 60,
                            align: 'center',
                            renderer: function (value, meta, record) {
                                const tp = tiersPayantPrincipal(record);
                                if (!tp || tp.taux === undefined || tp.taux === null) {
                                    return '';
                                }
                                return '<span style="color:blue;font-weight:bold;">' + tp.taux + ' %</span>';
                            }
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [
                                {
                                    icon: 'resources/images/icons/add16.gif',
                                    tooltip: 'Ajouter',
                                    scope: this

                                }]
                        }],
                    selModel: {
                        selType: 'rowmodel',
                        mode: 'SINGLE'
                    },


                    dockedItems: [
                        {
                            xtype: 'toolbar',
                            dock: 'top',
                            items: [
                                {
                                    xtype: 'textfield',
                                    itemId: 'queryClientAssurance',
                                    flex: 1,
                                    height: 35,
                                    enableKeyEvents: true,
                                    emptyText: 'Rechercher un client (2 caractères)'
                                }
                            ]
                        }

                    ]

                }]

        });
        me.callParent(arguments);

        /* Le magasin est fourni par l'ecran de vente et lui survit : il est recharge a chaque
         * nouvelle recherche faite DEPUIS cette fenetre. On suit « datachanged », qui couvre le
         * chargement comme le vidage, et on ecoute par mon() pour que l'ecoute parte avec la
         * fenetre - sans quoi une fenetre detruite continuerait a repondre au magasin. */
        if (clientStore) {
            me.mon(clientStore, 'datachanged', me.majNombreClientsTrouves, me);
        }
        me.on('afterrender', me.majNombreClientsTrouves, me, {single: true});
    },

    /** Ecrit le nombre de clients de la liste dans la barre du bas. */
    majNombreClientsTrouves: function () {
        var me = this;
        var afficheur = me.down('#nbClientsTrouves');
        if (!afficheur) {
            return;
        }
        var grille = me.down('gridpanel');
        var magasin = grille ? grille.getStore() : null;
        var nombre = magasin ? magasin.getCount() : 0;
        if (nombre === 0) {
            afficheur.setText('Aucun client trouvé');
        } else if (nombre === 1) {
            afficheur.setText('1 client trouvé');
        } else {
            afficheur.setText(nombre + ' clients trouvés');
        }
    }
});


