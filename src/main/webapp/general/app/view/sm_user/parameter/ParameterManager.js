var url_services_data_parametre = '../webservices/sm_user/parameter/ws_data_all.jsp';
var url_services_data_parametre_transaction = '../webservices/sm_user/parameter/ws_transaction.jsp';
// REST dedie a cet ecran (memes formats JSON et memes regles de visibilite que la JSP)
var url_rest_data_parametre = '../api/v1/app-params/liste';

var Me;
Ext.define('testextjs.view.sm_user.parameter.ParameterManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'parametermanager',
    id: 'parametermanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    title: 'Gestion des parametres',
    plain: true,
    maximizable: true,
//    tools: [{type: "pin"}],
    closable: false,
    frame: true,
    initComponent: function () {

        var itemsPerPage = 20;
        Me = this;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Parameter',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_rest_data_parametre,
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
            height: 580,
            plugins: [this.cellEditing],
            store: store,
            id: 'GridparametreID',
            columns: [{
                    xtype: 'rownumberer',
                    text: 'Num.Ligne',
                    width: 45,
                    sortable: true/*,
                     locked: true*/
                }, {
                    header: 'str_KEY',
                    dataIndex: 'str_KEY',
                    hidden: true,
                    flex: 0.5
                }, {
                    header: 'Valeur',
                    dataIndex: 'str_VALUE',
                    flex: 0.5
                },
                {
                    header: 'Description',
                    dataIndex: 'str_DESCRIPTION',
                    flex: 3
                },
                {
                    header: 'Type',
                    dataIndex: 'str_TYPE',
                    flex: 0.6
                },
                {
                    header: 'str_SECTION_KEY',
                    dataIndex: 'str_SECTION_KEY',
                    hidden: true,
                    flex: 1
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/page_white_edit.png',
                            tooltip: 'Editer une parametre',
                            scope: this,
                            handler: this.onEditClick
                        }]
                }/*,
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.png',
                            tooltip: 'Supprimer une parametre',
                            scope: this,
                            handler: this.onDeleteClick
                        }
                    ]
                }*/],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [/*{
                    text: 'Creer',
                    scope: this,
                    handler: this.onAddClick
                }, '-', */{
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'facture',
                    emptyText: 'Recherche',
                    listeners: {
                        'render': function(cmp) {
                            cmp.getEl().on('keypress', function(e) {
                                if (e.getKey() === e.ENTER) {
                                    Me.onRechClick();
                                }
                            });
                        }
                    }
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    iconCls: 'searchicon',
                    scope: this,
                    handler: this.onRechClick
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                store: store, // same store GridPanel is using
                dock: 'bottom',
                displayInfo: true
            }
        });

        this.callParent();


        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        })


    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onAddClick: function () {

        new testextjs.view.sm_user.parametre.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Creation d'parametre"
        });
    },
   onEditClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.sm_user.parameter.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification du parametre  [" + rec.get('str_DESCRIPTION') + "]"
        });
    },
    onDeleteClick: function (grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmer la suppression de l\'parametre',
                function (btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_data_parametre_transaction + 'delete',
                            params: {
                                str_KEY: rec.get('str_KEY')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                }
                                grid.getStore().reload();
                            },
                            failure: function (response)
                            {
                                // alert("non ok");
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
//    testaction: function (Ovalue) {
//        if (Ovalue == "0") {
//            return 'x-display-hide';
//        } else if (Ovalue == "1") {
//            return 'x-hide-display';
//        }
//    },
    onRechClick: function () {
        // extraParam persistant : la recherche est conservee quand on change de page
        var val = Ext.getCmp('rechecher');
        var store = this.getStore();
        store.getProxy().setExtraParam('search_value', val.getValue());
        store.loadPage(1);
    }

});

