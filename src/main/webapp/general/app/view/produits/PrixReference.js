/* global Ext */

Ext.define('testextjs.view.produits.PrixReference', {
    extend: 'Ext.window.Window',
    xtype: 'prixReference',
    autoShow: true,
    height: 450,
    width: '60%',
    modal: true,
    title: 'GESTION DES PRIX DE REFERENCE',
    closeAction: 'destroy',
    maximizable: true,
    closable: true,
    config: {
        produit: null
    },
    layout: {
        type: 'fit'
    },
    initComponent: function () {
        const me = this;
        const produit = me.getProduit().data;
        Ext.applyIf(me, {
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top',
                    ui: 'footer',
                    layout: {
                        pack: 'end',
                        type: 'hbox'
                    },
                    items: [
                        {
                            xtype: 'button',
                            itemId: 'btnAdd',
                            text: 'Ajouter un nouveau prix',
                            handler: function () {
                                me.onNew(produit);
                            }
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

                        {
                            xtype: 'button',
                            iconCls: 'cancelicon',
                            itemId: 'btnCancel',
                            text: 'Annuler',
                            handler: me.closeWindow

                        }
                    ]
                }
            ],
            items: [
                {
                    xtype: 'fieldset',
                    title: '<span style="color:blue;font-weight:bold;font-size:14px;">LISTE DE PRIX DE REFERENCE [ ' + produit.str_NAME + ' ]</span>',
                    bodyPadding: 20,
                    modelValidation: true,
                    layout: {
                        type: 'vbox',
                        align: 'stretch'
                    },

                    items: {

                        xtype: 'grid',
                        itemId: 'prixGrid',
                        selModel: {
                            selType: 'rowmodel',
                            mode: 'SINGLE'
                        },
                        store: Ext.create('Ext.data.Store', {
                            autoLoad: false,
                            pageSize: null,
                            idProperty: 'id',
                            fields:
                                    [
                                        {
                                            name: 'id',
                                            type: 'string'
                                        },
                                        {
                                            name: 'tiersPayantName',
                                            type: 'string'
                                        }
                                        ,
                                        {
                                            name: 'tiersPayantId',
                                            type: 'string'
                                        },
                                        {
                                            name: 'produitId',
                                            type: 'string'
                                        }, {
                                            name: 'type',
                                            type: 'string'
                                        }, {
                                            name: 'typeLibelle',
                                            type: 'string'
                                        },
                                        {
                                            name: 'valeur',
                                            type: 'number'
                                        }

                                    ],
                            proxy: {
                                type: 'ajax',
                                url: '../api/v1/prix-reference/' + produit.lg_FAMILLE_ID,
                                reader: {
                                    type: 'json',
                                    root: 'data',
                                    totalProperty: 'total'
                                }
                            }

                        }),
                        height: 'auto',
                        minHeight: 350,
                        columns: [
                            {
                                text: '#',
                                width: 30,
                                dataIndex: 'id',
                                hidden: true

                            },
                            {
                                xtype: 'rownumberer',
                                text: 'LG',
                                width: 45,
                                sortable: true
                            }, {
                                text: 'Tiers payant',
                                flex: 1,
                                sortable: true,
                                dataIndex: 'tiersPayantName'
                            },
                            {
                                header: 'Option de prix',
                                dataIndex: 'typeLibelle',
                                flex: 1

                            },
                            {
                                header: 'Valeur',
                                dataIndex: 'valeur',
                                align: 'right',
                                renderer: function (v) {
                                    return Ext.util.Format.number(v, '0,000.');
                                },
                                flex: 1

                            },
                            {
                                xtype: 'actioncolumn',
                                width: 30,
                                sortable: false,
                                menuDisabled: true,
                                items: [
                                    {
                                        icon: 'resources/images/edit_task.png',
                                        tooltip: 'Editer',
                                        scope: this,
                                        handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                            me.buildPrixForm(produit, me, record);
                                        }

                                    }]
                            }
                            ,
                            {
                                xtype: 'actioncolumn',
                                width: 30,
                                sortable: false,
                                menuDisabled: true,
                                items: [
                                    {
                                        icon: 'resources/images/icons/fam/delete.png',
                                        tooltip: 'Supprimer',
                                        scope: this,
                                        handler: function (view, rowIndex, colIndex, item, e, record, row) {
                                            Ext.Ajax.request({
                                                url: '../api/v1/prix-reference/' + record.get('id'),
                                                method: 'DELETE',
                                                success: function (response, options) {
                                                    me.down('grid').getStore().reload();

                                                }, failure: function (response, options) {

                                                    Ext.MessageBox.show({
                                                        title: 'Infos',
                                                        width: 320,
                                                        msg: "Erreur de serveur",
                                                        buttons: Ext.MessageBox.OK,
                                                        icon: Ext.MessageBox.ERROR

                                                    });


                                                }
                                            });
                                        }

                                    }]
                            }

                        ]


                    }
                }
            ]
        });
        me.callParent(arguments);
        me.loadGridData();
    },
    onNew: function (produit) {
        const me = this;
        me.buildPrixForm(produit, me);
    },
    onSave: function (btn, me) {

        const wind = btn.up('window');
        const   form = wind.down('form');
        const datas = form.getValues();


        if (form.isValid()) {
            const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/prix-reference',
                params: Ext.JSON.encode({
                    ...datas,
                    produitId: me.getProduit().data.lg_FAMILLE_ID
                }),
                success: function (response, options) {
                    progress.hide();
                    wind.destroy();
                    me.down('grid').getStore().reload();

                },
                failure: function (response, options) {
                    progress.hide();
                    Ext.Msg.alert("Message", 'Un problème avec le serveur');
                }
            });
        }
    },
    closeWindow: function () {
        const me = this;
        const wind = me.up('window');
        wind.destroy();
    },
    loadGridData: function () {
        const me = this;
        me.down('grid').getStore().load();
    },
    buildLibelle: function (record) {
        if (record) {
            return   record.get('type') === 'PRIX_REFERENCE' ? 'Prix' : 'Taux';
        } else {
            return 'Prix';
        }
    },

    buildMaxiValue: function (record, prixUni) {
        if (record) {
            return   record.get('type') === 'PRIX_REFERENCE' ? prixUni : 100;
        } else {
            return prixUni;
        }
    },
    buildPrixForm: function (produit, me, record) {

        const form = Ext.create('Ext.window.Window',
                {
                    extend: 'Ext.window.Window',
                    autoShow: true,
                    height: 280,
                    width: '50%',
                    modal: true,
                    title: 'FORMULAIRE PRIX DE REFERENCE',
                    closeAction: 'destroy',
                    maximizable: true,
                    closable: true,
                    bodyPadding: 10,
                    layout: {
                        type: 'vbox',
                        align: 'stretch'
                    },
                    items: [
                        {
                            xtype: 'form',
                            bodyPadding: 15,
                            modelValidation: true,
                            border: 0,
                            layout: 'fit',
                            items: [

                                {
                                    title: '',
                                    layout: 'anchor',
                                    border: 1,
                                    bodyPadding: 10,
                                    defaults: {
                                        anchor: '100%',
                                        msgTarget: 'side',
                                        labelAlign: 'left',
                                        labelWidth: 105
                                    },
                                    items: [
                                        {
                                            xtype: 'hiddenfield',
                                            name: 'id',
                                            value: record ? record.get('id') : null

                                        },
                                        {
                                            hidden: record ? true : false,
                                            xtype: 'combobox',
                                            fieldLabel: 'Tiers payants',
                                            name: 'tiersPayantId',
                                            itemId: 'tiersPayantId',
                                            margin: '10 5 10 5',
                                            flex: 1,
                                            store: Ext.create('Ext.data.Store', {
                                                idProperty: 'lgTIERSPAYANTID',
                                                fields:
                                                        [
                                                            {name: 'lgTIERSPAYANTID',
                                                                type: 'string'

                                                            },

                                                            {name: 'strFULLNAME',
                                                                type: 'string'

                                                            }

                                                        ],
                                                autoLoad: false,
                                                pageSize: 999,
                                                proxy: {
                                                    type: 'ajax',
                                                    url: '../api/v1/client/tiers-payants/assurance',
                                                    reader: {
                                                        type: 'json',
                                                        root: 'data',
                                                        totalProperty: 'total'
                                                    }

                                                }

                                            }),
                                            pageSize: 999,
                                            valueField: 'lgTIERSPAYANTID',
                                            displayField: 'strFULLNAME',
                                            minChars: 2,
                                            queryMode: 'remote',
                                            enableKeyEvents: true,
                                            allowBlank: false,
                                            emptyText: 'Selectionner tiers payant...',
                                            value: record ? record.get('tiersPayantId') : null

                                        },
                                        {
                                            fieldLabel: 'Option de prix',
                                            xtype: 'combobox',
                                            flex: 1,
                                            margin: '10 5 10 5',
                                            itemId: 'type',
                                            name: 'type',
                                            store: Ext.create('Ext.data.ArrayStore', {
                                                data: [['PRIX_REFERENCE', 'Prix de référence assusrance'], ['TAUX', 'Taux de remboursement produit']],
                                                fields: [{name: 'code', type: 'string'}, {name: 'libelle', type: 'string'}]
                                            }),
                                            pageSize: 2,
                                            valueField: 'code',
                                            displayField: 'libelle',
                                            typeAhead: false,
                                            queryMode: 'local',
                                            allowBlank: false,
                                            value: record ? record.get('type') : 'PRIX_REFERENCE',
                                            listeners: {
                                                select: function (field) {
                                                    const prixOption = field.getValue();
                                                    const parent = field.up('form');
                                                    const prixCmp = parent.query("#valeur")[0];

                                                    if (prixOption === 'TAUX') {
                                                        prixCmp.setFieldLabel('Taux');
                                                        prixCmp.setMaxValue(100);
                                                    } else {
                                                        prixCmp.setFieldLabel('Prix');
                                                        prixCmp.setMaxValue(produit.int_PRICE);
                                                    }
                                                }}

                                        },

                                        {flex: 1,
                                            itemId: 'valeur',
                                            xtype: 'numberfield',
                                            fieldLabel: me.buildLibelle(record),
                                            margin: '10 5 10 5',
                                            minValue: 5,
                                            maxValue: me.buildMaxiValue(record, produit.int_PRICE),
                                            maskRe: /[0-9.]/,
                                            selectOnFocus: true,
                                            hideTrigger: true,
                                            name: 'valeur',
                                            allowBlank: false,
                                            value: record ? record.get('valeur') : null
                                        }
                                    ]
                                }

                            ]
                        }
                    ],

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
                                    itemId: 'btnsave',
                                    text: 'Enregistrer', handler: function (btn) {
                                        me.onSave(btn, me);
                                    }
                                },
                                {
                                    xtype: 'button',
                                    itemId: 'btnCancel',
                                    text: 'Annuler',
                                    handler: function () {
                                        form.destroy();
                                    }

                                }
                            ]
                        }
                    ]
                });
    }

});

