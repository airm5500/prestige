/* global Ext */


var Me;
var view_title;



Ext.define('testextjs.view.tierspayantmanagement.groupetierspayant.groupe', {
    extend: 'Ext.grid.Panel',
    xtype: 'groupetierspayant',
    id: 'groupetierspayantID',
    title: 'Groupe tiers-payant',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.GroupeModel',
        'testextjs.view.tierspayantmanagement.groupetierspayant.action.groupetierspayants',
        'testextjs.view.tierspayantmanagement.groupetierspayant.action.facturegroupe'

    ],
    frame: true,
    initComponent: function () {

        var groupesStore = new Ext.data.Store({
            model: 'testextjs.model.GroupeModel',
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/configmanagement/groupe/ws_data.jsp',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });


        Me = this;
        this.CellEditing = new Ext.grid.plugin.CellEditing({
            pluginId: 'groupeEditor',
            clicksToEdit: 2
        });





        Ext.apply(this, {
            width: '98%',

            minHeight: 570,
            maxHeight: 570,
            cls: 'custompanel',
            id: 'groupetierspayantGrid',
            plugins: [this.CellEditing],
            store: groupesStore,
            columns: [
                {
                    xtype: 'rownumberer',
                    text: '#',
                    width: 45


                },
                {
                    header: 'ID',
                    dataIndex: 'lg_GROUPE_ID',
                    flex: 1,
                    hidden: true

                },
                {
                    header: 'LIBELLE',
                    dataIndex: 'str_LIBELLE',
                    flex: 1

                },
                {
                    header: 'ADRESSE',
                    dataIndex: 'str_ADRESSE',
                    flex: 1

                },
                {
                    header: 'TELEPHONE',
                    dataIndex: 'str_TELEPHONE',

                    flex: 1

                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            iconCls: 'edit',
                            tooltip: 'Modifier',
                            scope: this,
                            handler: function (grid, rowIndex) {
                                var record = grid.getStore().getAt(rowIndex);
//                                Me.editForm(rec);

                                var win = Ext.create("Ext.window.Window", {
                                    title: "Modification du groupe",

                                    width: 520,
                                    layout: {
                                        type: 'fit'
                                    },
                                    height: 200,
                                    items: [{
                                            xtype: 'form',
                                            id: 'editform',
                                            type: 'fit',
                                            bodyPadding: 5,
                                            modelValidation: true,
                                            items: [
                                                {
                                                    xtype: 'fieldset',

                                                    height: 160,
                                                    title: 'Modification du groupe',
                                                    layout: 'vbox',
                                                    defaults: {
                                                        anchor: '100%',

                                                        labelAlign: 'left'

                                                    },
                                                    items: [
                                                        {
                                                            xtype: 'textfield',
                                                            fieldLabel: 'Libellé',
                                                            name: 'str_LIBELLE',
                                                            id: 'str_LIBELLE_GR_edit',
                                                            width: '100%',
                                                            value: record.get('str_LIBELLE'),
                                                            allowBlank: false,
                                                            enableKeyEvents: true,
                                                            listeners: {

                                                                specialKey: function (field, e, options) {
                                                                    if (e.getKey() === e.ENTER)
                                                                    {
                                                                        var grid = Ext.getCmp('groupetierspayantGrid');
                                                                        if (field.getValue() === '') {
                                                                            return;
                                                                        }

                                                                        Me.editGroup(win, record);
                                                                    }


                                                                }


                                                            }



                                                        },
                                                        {
                                                            xtype: 'textfield',
                                                            fieldLabel: 'Téléphone',
                                                            name: 'str_TELEPHONE',
                                                            id: 'str_TELEPHONE_GR_edit',
                                                            width: '100%',
//                                    allowBlank: false,
                                                            maskRe: /[0-9.]/,
                                                            enableKeyEvents: true,
                                                            value: record.get('str_TELEPHONE'),
                                                            listeners: {

                                                                specialKey: function (field, e, options) {
                                                                    if (e.getKey() === e.ENTER)
                                                                    {
                                                                        var grid = Ext.getCmp('groupetierspayantGrid');
                                                                        if (field.getValue() === '') {
                                                                            return;
                                                                        }

                                                                        Me.editGroup(win, record);
                                                                    }


                                                                }


                                                            }



                                                        },
                                                        {
                                                            xtype: 'textfield',
                                                            fieldLabel: 'Adresse',
                                                            name: 'str_ADRESSE',
                                                            id: 'str_ADRESSE_GR_edit',
                                                            width: '100%',
//                                    allowBlank: false,
                                                            enableKeyEvents: true,
                                                            value: record.get('str_ADRESSE'),
                                                            listeners: {

                                                                specialKey: function (field, e, options) {
                                                                    if (e.getKey() === e.ENTER)
                                                                    {
                                                                        var grid = Ext.getCmp('groupetierspayantGrid');
                                                                        if (field.getValue() === '') {
                                                                            return;
                                                                        }

                                                                        Me.editGroup(win, record);
                                                                    }


                                                                }


                                                            }



                                                        }


                                                    ]}]

                                        }]
                                    ,
                                    dockedItems: [
                                        {
                                            xtype: 'toolbar',
                                            dock: 'bottom',
                                            ui: 'footer',
                                            layout: {
                                                pack: 'end', //#22
                                                type: 'hbox'
                                            },
                                            items: [
                                                {
                                                    xtype: 'button',
                                                    text: 'Valider',
                                                    listeners: {
                                                        click: function () {

                                                            Me.editGroup(win, record);
                                                        }
                                                    }
                                                },
                                                {
                                                    xtype: 'button',
                                                    text: 'Annuler',
//                   
                                                    listeners: {
                                                        click: function () {
                                                            win.destroy();
                                                        }

                                                    }
                                                }
                                            ]
                                        }
                                    ]

                                });

                                win.show();

                            }
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            iconCls: 'detailclients',
                            tooltip: 'Gérer les tiers-payant',
                            scope: this,
                            handler: function (grid, rowIndex) {
                                var rec = grid.getStore().getAt(rowIndex);
                                new testextjs.view.tierspayantmanagement.groupetierspayant.action.groupetierspayants({
                                    odatasource: rec.get('lg_GROUPE_ID'),
                                    parentview: this,
                                    mode: rec.get('str_LIBELLE'),
                                    titre: "Gerer les tiers-payant du groupe [" + rec.get('str_LIBELLE') + "]"
                                });
                            }

                        }]
                },
//                {
//                    xtype: 'actioncolumn',
//                    width: 30,
//                    sortable: false,
//                    menuDisabled: true,
//                    items: [{
//                            iconCls: 'invoice',
//                            tooltip: 'Gestion factures du groupe',
//                            scope: this,
//                            handler: function (grid, rowIndex) {
//                                var rec = grid.getStore().getAt(rowIndex);
//
//                                new testextjs.view.tierspayantmanagement.groupetierspayant.action.facturegroupe({
//                                    odatasource: rec.get('lg_GROUPE_ID'),
//                                    parentview: this,
//                                    mode: rec.get('str_LIBELLE'),
//                                    titre: "Gerer les factures du groupe [" + rec.get('str_LIBELLE') + "]"
//                                });
//                            }
//
//                        }]
//                },



                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.gif',
                            tooltip: 'Supprimer',
                            scope: this,
                            handler: function (grid, rowIndex) {
                                var rec = grid.getStore().getAt(rowIndex);
                                Ext.Ajax.request({
                                    url: '../webservices/configmanagement/groupe/ws_transaction.jsp',
                                    params: {
                                        mode: 2,

                                        lg_GROUPE_ID: rec.get('lg_GROUPE_ID')


                                    },
                                    success: function (response)
                                    {

                                        var object = Ext.JSON.decode(response.responseText, false);
                                        if (object.status === 1) {
                                            grid.getStore().reload();
                                            Ext.MessageBox.alert('INFO', 'Groupe Supprimé');

                                        } else {
                                            Ext.MessageBox.alert('ERROR', 'Erreur d \'ajout');


                                        }





                                    },
                                    failure: function (response)
                                    {


                                    }
                                });
                            }
                        }]
                }




            ],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    xtype: 'button',
                    iconCls: 'addicon',
                    text: 'Nouveau',
                    handler: this.showNeForm

                }, '-',

                {
                    xtype: 'textfield',
                    id: 'groupeSearch',

                    width: 400,
                    emptyText: 'Rechercher',
                    enableKeyEvents: true,
                    listeners: {

                        specialKey: function (field, e, options) {
                            if (e.getKey() === e.ENTER)
                            {
                                var grid = Ext.getCmp('groupetierspayantGrid').getStore();
                                grid.load({params: {search_value: this.getValue()}});



                            }


                        }


                    }

                }
                , {
                    xtype: 'tbseparator'
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    iconCls: 'ventesearch',
                    width: 100,
                    scope: this,
                    handler: function () {
                        var grid = Ext.getCmp('groupetierspayantGrid').getStore();
                        grid.load({params: {search_value: this.getValue()}});


                    }
                }


            ],
            bbar: {
                xtype: 'pagingtoolbar',
                store: groupesStore,
                dock: 'bottom',
                displayInfo: true,
                listeners: {
                    beforechange: function (page, currentPage) {
                        var myProxy = this.store.getProxy();
                        myProxy.params = {

                            search_value: ''

                        };
                        var search_value = Ext.getCmp('groupeSearch').getValue();


                        myProxy.setExtraParam('search_value', search_value);

                    }

                }
            }


        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });



    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
    },

    showNeForm: function () {


        var win = Ext.create("Ext.window.Window", {
            title: "Ajout de nouveau groupe",

            width: 520,
            layout: {
                type: 'fit'
            },
            height: 200,
            items: [{
                    xtype: 'form',
                    id: 'newform',
                    type: 'fit',
                    bodyPadding: 5,
                    modelValidation: true,
                    items: [
                        {
                            xtype: 'fieldset',

                            height: 160,
                            title: 'Ajout de nouveau groupe',
                            layout: 'vbox',
                            defaults: {
                                anchor: '100%',

                                labelAlign: 'left'

                            },
                            items: [
                                {
                                    xtype: 'textfield',
                                    fieldLabel: 'Libellé',
                                    name: 'str_LIBELLE',
                                    id: 'str_LIBELLE_GR',
                                    width: '100%',
                                    allowBlank: false,
                                    enableKeyEvents: true,
                                    listeners: {

                                        specialKey: function (field, e, options) {
                                            if (e.getKey() === e.ENTER)
                                            {
                                                var grid = Ext.getCmp('groupetierspayantGrid');
                                                if (field.getValue() === '') {
                                                    return;
                                                }

                                                Me.createGroup(win);
                                            }


                                        }


                                    }



                                },
                                {
                                    xtype: 'textfield',
                                    fieldLabel: 'Téléphone',
                                    name: 'str_TELEPHONE',
                                    id: 'str_TELEPHONE_GR',
                                    width: '100%',
                                    maskRe: /[0-9.]/,
//                                    allowBlank: false,
                                    enableKeyEvents: true,
                                    listeners: {

                                        specialKey: function (field, e, options) {
                                            if (e.getKey() === e.ENTER)
                                            {
                                                var grid = Ext.getCmp('groupetierspayantGrid');
                                                if (field.getValue() === '') {
                                                    return;
                                                }

                                                Me.createGroup(win);

                                            }


                                        }


                                    }



                                },
                                {
                                    xtype: 'textfield',
                                    fieldLabel: 'Adresse',
                                    name: 'str_ADRESSE',
                                    id: 'str_ADRESSE_GR',
                                    width: '100%',
//                                    allowBlank: false,
                                    enableKeyEvents: true,
                                    listeners: {

                                        specialKey: function (field, e, options) {
                                            if (e.getKey() === e.ENTER)
                                            {
                                                var grid = Ext.getCmp('groupetierspayantGrid');
                                                if (field.getValue() === '') {
                                                    return;
                                                }


                                                Me.createGroup();

                                            }


                                        }


                                    }



                                }


                            ]}]

                }]
            ,
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'bottom',
                    ui: 'footer',
                    layout: {
                        pack: 'end', //#22
                        type: 'hbox'
                    },
                    items: [
                        {
                            xtype: 'button',
                            text: 'Valider',
                            listeners: {
                                click: function () {

                                    Me.createGroup(win);

                                }
                            }
                        },
                        {
                            xtype: 'button',
                            text: 'Annuler',
//                   
                            listeners: {
                                click: function () {
                                    win.destroy();
                                }

                            }
                        }
                    ]
                }
            ]

        });

        win.show();

    },

    editForm: function (record) {


        var win = Ext.create("Ext.window.Window", {
            title: "Modification du groupe",

            width: 520,
            layout: {
                type: 'fit'
            },
            height: 200,
            items: [{
                    xtype: 'form',
                    id: 'editform',
                    type: 'fit',
                    bodyPadding: 5,
                    modelValidation: true,
                    items: [
                        {
                            xtype: 'fieldset',

                            height: 160,
                            title: 'Modification du groupe',
                            layout: 'vbox',
                            defaults: {
                                anchor: '100%',

                                labelAlign: 'left'

                            },
                            items: [
                                {
                                    xtype: 'textfield',
                                    fieldLabel: 'Libellé',
                                    name: 'str_LIBELLE',
                                    id: 'str_LIBELLE_GR_edit',
                                    width: '100%',
                                    value: record.get('str_LIBELLE'),
                                    allowBlank: false,
                                    enableKeyEvents: true,
                                    listeners: {

                                        specialKey: function (field, e, options) {
                                            if (e.getKey() === e.ENTER)
                                            {
                                                var grid = Ext.getCmp('groupetierspayantGrid');
                                                if (field.getValue() === '') {
                                                    return;
                                                }

                                                Me.editGroup(win, record);
                                            }


                                        }


                                    }



                                },
                                {
                                    xtype: 'textfield',
                                    fieldLabel: 'Téléphone',
                                    name: 'str_TELEPHONE',
                                    id: 'str_TELEPHONE_GR_edit',
                                    width: '100%',
//                                    allowBlank: false,
                                    maskRe: /[0-9.]/,
                                    enableKeyEvents: true,
                                    value: record.get('str_TELEPHONE'),
                                    listeners: {

                                        specialKey: function (field, e, options) {
                                            if (e.getKey() === e.ENTER)
                                            {
                                                var grid = Ext.getCmp('groupetierspayantGrid');
                                                if (field.getValue() === '') {
                                                    return;
                                                }

                                                Me.editGroup(win, record);
                                            }


                                        }


                                    }



                                },
                                {
                                    xtype: 'textfield',
                                    fieldLabel: 'Adresse',
                                    name: 'str_ADRESSE',
                                    id: 'str_ADRESSE_GR_edit',
                                    width: '100%',
//                                    allowBlank: false,
                                    enableKeyEvents: true,
                                    value: record.get('str_ADRESSE'),
                                    listeners: {

                                        specialKey: function (field, e, options) {
                                            if (e.getKey() === e.ENTER)
                                            {
                                                var grid = Ext.getCmp('groupetierspayantGrid');
                                                if (field.getValue() === '') {
                                                    return;
                                                }

                                                Me.editGroup(win, record);
                                            }


                                        }


                                    }



                                }


                            ]}]

                }]
            ,
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'bottom',
                    ui: 'footer',
                    layout: {
                        pack: 'end', //#22
                        type: 'hbox'
                    },
                    items: [
                        {
                            xtype: 'button',
                            text: 'Valider',
                            listeners: {
                                click: function () {

                                    Me.editGroup(win, record);
                                }
                            }
                        },
                        {
                            xtype: 'button',
                            text: 'Annuler',
//                   
                            listeners: {
                                click: function () {
                                    win.hide();
                                }

                            }
                        }
                    ]
                }
            ]

        });

        win.show();

    },
    createGroup: function (win) {
        var form = Ext.getCmp('newform');

        if (form && form.isValid()) {

            var grid = Ext.getCmp('groupetierspayantGrid');
            var lib = Ext.getCmp('str_LIBELLE_GR').getValue();
            var str_ADRESSE = Ext.getCmp('str_ADRESSE_GR').getValue();
            var str_TELEPHONE = Ext.getCmp('str_TELEPHONE_GR').getValue();


            Ext.Ajax.request({
                url: '../webservices/configmanagement/groupe/ws_transaction.jsp',
                params: {
                    mode: 0,
                    str_LIBELLE: lib,
                    str_ADRESSE: str_ADRESSE,
                    str_TELEPHONE: str_TELEPHONE


                },
                success: function (response)
                {

                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.status === 1) {
                        grid.getStore().load();
                        Ext.MessageBox.alert('INFO', 'Groupe ajouté');
                        win.destroy();
                    } else {
                        Ext.MessageBox.alert('ERROR', 'Erreur d \'ajout');


                    }





                },
                failure: function (response)
                {

                    win.destroy();
                }
            });

        }
    },
    editGroup: function (win, record) {
        Ext.getCmp('groupetierspayantGrid');

        var form = Ext.getCmp('editform');

        if (form && form.isValid()) {

            var grid = Ext.getCmp('groupetierspayantGrid');
            var lib = Ext.getCmp('str_LIBELLE_GR_edit').getValue();
            var str_ADRESSE = Ext.getCmp('str_ADRESSE_GR_edit').getValue();
            var str_TELEPHONE = Ext.getCmp('str_TELEPHONE_GR_edit').getValue();


            Ext.Ajax.request({
                url: '../webservices/configmanagement/groupe/ws_transaction.jsp',
                params: {
                    mode: 1,
                    lg_GROUPE_ID: record.get('lg_GROUPE_ID'),
                    str_LIBELLE: lib,
                    str_ADRESSE: str_ADRESSE,
                    str_TELEPHONE: str_TELEPHONE


                },
                success: function (response)
                {

                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.status === 1) {
                        grid.getStore().load();
                        Ext.MessageBox.alert('INFO', 'Groupe modifié');
                        win.hide();
                    } else {
                        Ext.MessageBox.alert('ERROR', 'Erreur de modification');


                    }





                },
                failure: function (response)
                {

                    win.hide();
                }
            });

        }
    }
});