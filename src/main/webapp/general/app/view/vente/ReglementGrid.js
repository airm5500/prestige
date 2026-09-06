/* global Ext */

Ext.define('testextjs.view.vente.ReglementGrid', {
    extend: 'Ext.window.Window',
    xtype: 'reglementGrid',
    autoShow: false,
    height: 350,
    width: '35%',
    modal: true,
    title: 'AJOUTEZ UN AUTRE MODE DE REGLEMENT',
    iconCls: 'icon-grid',
    closeAction: 'hide',
    closable: false,
    layout: {
        type: 'fit'
    },

    initComponent: function () {
        const me = this;

        const reglementStore = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields: [
                {name: 'id', type: 'string'},
                {name: 'libelle', type: 'string'}
            ],
            autoLoad: true,
            pageSize: 100,
            proxy: {
                type: 'ajax',
                url: '../api/v1/type-reglements/list/sans-espece',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            },
            listeners: {
                // Un même mode ne doit pas être utilisé deux fois sur la vente :
                // on retire le mode principal déjà sélectionné. En fractionnement
                // mobile, la liste est en plus restreinte aux modes mobiles.
                load: function (store) {
                    // onlyModeIds accepte un tableau ou une fonction qui le rend : la forme
                    // fonction permet de lire la liste APRES la reponse du serveur, et non celle
                    // qui existait au moment de creer la fenetre.
                    const permis = Ext.isFunction(me.onlyModeIds) ? me.onlyModeIds() : me.onlyModeIds;
                    if (me.excludeModeId || permis) {
                        store.filterBy(function (rec) {
                            const id = rec.get('id');
                            if (me.excludeModeId && id === me.excludeModeId) {
                                return false;
                            }
                            return !permis || permis.indexOf(id) !== -1;
                        });
                    }
                }
            }
        });


        Ext.applyIf(me, {
            dockedItems: [

                {
                    xtype: 'toolbar',
                    dock: 'bottom',
                    ui: 'footer',
                    layout: {
                        pack: 'end',
                        type: 'hbox'
                    },
                    items: [

                        {
                            xtype: 'button',
                            itemId: 'btnCancelModeReglement',
                            text: 'Annuler'
                        }
                    ]
                }

            ],
            items: [
                {
                    xtype: 'gridpanel',
                    store: reglementStore,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },
                    columns: [

                        {
                            xtype: 'rownumberer',
                            text: 'LG',
                            width: 50,
                              align: 'left', 
                            sortable: true
                        }, {
                            text: '#',
                            width: 60,
                            align: 'left',
                            dataIndex: 'id',
                            hidden: true

                        },
                        {
                            text: 'Mode reglement',
                            flex: 1,
                            dataIndex: 'libelle'
                        },

                        {
                            xtype: 'actioncolumn',
                            width: 60,
                            align: 'center',
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
                    }

                }]

        });
        me.callParent(arguments);
    }
});


