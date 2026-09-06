//var url_services ='../webservices/sm_user/privilege';
var url_services_data_privilege = '../webservices/sm_user/privilege/ws_data.jsp';
var url_services_transaction_privilege = '../webservices/sm_user/privilege/ws_transaction.jsp?mode=';
var Me_Workflow;
Ext.define('testextjs.view.sm_user.privilege.PrivilegeManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'privilegemanager',
    id: 'privilegemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Privilege',
        'testextjs.view.sm_user.privilege.action.add',
        'Ext.ux.ProgressBarPager'
    ],
    title: 'Gestion Privilege',
    frame: true,
    initComponent: function() {

        Me_Workflow = this;


        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Privilege',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_privilege,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });

        Ext.apply(this, {
            width: '98%',
            height: valheight,
            plugins: [this.cellEditing],
            store: store,
            columns: [{
                    header: 'lg_PRIVELEGE_ID',
                    dataIndex: 'lg_PRIVELEGE_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, {
                    header: 'Nom',
                    dataIndex: 'str_NAME',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                }, {
                    header: 'Description',
                    dataIndex: 'str_DESCRIPTION',
                    flex: 1,
                     editor: {
                     allowBlank: false
                     }

                }, {
                    header: 'Type',
                    dataIndex: 'str_TYPE',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }

                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/page_white_edit.gif',
                            tooltip: 'Modifier',
                            scope: this,
                            handler: this.onEditClick,
                            getClass: function(value, metadata, record) {
                                if (record.get('is_select') === 'false') {
                                    return 'x-hide-display';
                                } else {
                                    return 'x-hide-display';
                                }
                            }
                        }]
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.gif',
                            tooltip: 'Delete Plant',
                            scope: this,
                            handler: this.onRemoveClick
                        }]
                }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    text: 'Creer',
                    scope: this,
                    hidden: true,
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'user',
                    width: 260,
                    emptyText: 'Contient... (3 caractères minimum)',
                    enableKeyEvents: true,
                    listeners: {
                        'render': function(cmp) {
                            cmp.getEl().on('keypress', function(e) {
                                if (e.getKey() === e.ENTER) {
                                    Me_Workflow.onRechClick();

                                }
                            });
                        },
                        /*
                         * Recherche automatique a partir du troisieme caractere (point 7).
                         *
                         * En dessous de trois caracteres on ne cherche pas : « a » ramenerait la liste entiere
                         * et couterait une requete pour rien. Le champ vide, en revanche, RECHARGE la liste :
                         * c'est ainsi qu'on revient a l'affichage complet apres avoir efface sa saisie.
                         *
                         * La temporisation evite une requete par frappe : seule la derniere saisie part, un
                         * tiers de seconde apres que l'utilisateur a cesse de taper.
                         */
                        'keyup': function(cmp, e) {
                            if (e.getKey() === e.ENTER) {
                                return;
                            }
                            var saisie = Ext.String.trim(cmp.getValue() || '');
                            clearTimeout(Me_Workflow.minuterieRecherche);
                            if (saisie.length > 0 && saisie.length < 3) {
                                return;
                            }
                            Me_Workflow.minuterieRecherche = setTimeout(function() {
                                if (!cmp.isDestroyed) {
                                    Me_Workflow.onRechClick();
                                }
                            }, 350);
                        }
                    }
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    scope: this,
                    iconCls: 'searchicon',
                    handler: this.onRechClick
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                pageSize: 10,
                store: store,
                displayInfo: true,
                plugins: new Ext.ux.ProgressBarPager()
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        }),
        this.on('edit', function(editor, e) {

            Ext.Ajax.request({
                url: url_services_transaction_privilege + 'update',
                params: {
                    lg_PRIVELEGE_ID: e.record.data.lg_PRIVELEGE_ID,
                    str_NAME: e.record.data.str_NAME,
                    str_DESCRIPTION: e.record.data.str_DESCRIPTION,
                    str_TYPE: e.record.data.str_TYPE
                },
                success: function(response)
                {
                    console.log(response.responseText);
                    e.record.commit();
                    store.reload();
                },
                failure: function(response)
                {
                    console.log("Bug " + response.responseText);
                    alert(response.responseText);
                }
            });
        });


    },
    loadStore: function() {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function() {
    },
    onEditClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.sm_user.privilege.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification du privilege  [" + rec.get('str_DESCRIPTION') + "]"
        });



    },
    onAddClick: function() {
        // Create a model instance
        var rec = new testextjs.model.Privilege({
            lg_PRIVELEGE_ID: 'init',
            str_NAME: '',
            str_DESCRIPTION: '',
            str_TYPE: ''

        });

        this.getStore().insert(0, rec);
        this.cellEditing.startEditByPosition({
            row: 0,
            column: 0
        });
    },
    onRemoveClick: function(grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmer la suppresssion',
                function(btn) {
                    if (btn == 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_transaction_privilege + 'delete',
                            params: {
                                lg_PRIVELEGE_ID: rec.get('lg_PRIVELEGE_ID')
                            },
                            success: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                 if (object.success == "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Information', object.errors);
                                    grid.getStore().reload();
                                }
                            },
                            failure: function(response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                //  alert(object);

                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    }
                });


    },
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');
        // Retour a la premiere page : sans cela, une recherche lancee depuis la page 4 demande la
        // page 4 d'un resultat qui n'en compte souvent qu'une, et la grille s'affiche vide. Le rang
        // est repositionne sur le magasin lui-meme, et non par la barre de pagination : moveFirst()
        // declencherait un chargement supplementaire, avec les criteres PRECEDENTS.
        this.getStore().currentPage = 1;
        this.getStore().load({
            params: {
                search_value: Ext.String.trim(val.getValue() || ''),
                start: 0
            }
        }, url_services_data_privilege);
    }

});