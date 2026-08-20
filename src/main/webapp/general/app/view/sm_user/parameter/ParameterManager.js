var url_services_data_parametre = '../webservices/sm_user/parameter/ws_data_all.jsp';
var url_services_data_parametre_transaction = '../webservices/sm_user/parameter/ws_transaction.jsp';
// REST dedie a cet ecran (memes formats JSON et memes regles de visibilite que la JSP)
var url_rest_data_parametre = '../api/v1/app-params/liste';
// bascule d'un parametre booleen : ne modifie que la valeur, conserve la description
var url_rest_toggle_parametre = '../api/v1/app-params/toggle';
// types proposes dans le filtre : deduits cote serveur des parametres reellement visibles par le profil
var url_rest_data_parametre_types = '../api/v1/app-params/types';

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
                    // Interrupteur pour les parametres booleens (valeur 0 ou 1) : un clic bascule la
                    // valeur sans passer par la fenetre d'edition. Les autres lignes restent vides.
                    header: 'Activation',
                    itemId: 'paramSwitchColumn',
                    dataIndex: 'str_VALUE',
                    width: 80,
                    sortable: false,
                    menuDisabled: true,
                    align: 'center',
                    renderer: function (value, meta, rec) {
                        var v = rec.get('str_VALUE');
                        if (v !== '0' && v !== '1') {
                            return '';
                        }
                        var on = (v === '1');
                        meta.tdAttr = 'data-qtip="' + (on ? 'Cliquer pour d&eacute;sactiver' : 'Cliquer pour activer') + '"';
                        meta.tdStyle = 'cursor:pointer;';
                        return '<span style="display:inline-block;width:36px;height:18px;border-radius:9px;'
                                + 'background-color:' + (on ? '#5cb85c' : '#bbbbbb') + ';position:relative;vertical-align:middle;">'
                                + '<span style="position:absolute;top:2px;' + (on ? 'right:2px;' : 'left:2px;')
                                + 'width:14px;height:14px;border-radius:50%;background-color:#ffffff;"></span>'
                                + '</span>';
                    }
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
            listeners: {
                cellclick: this.onCellClick,
                scope: this
            },
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [/*{
                    text: 'Creer',
                    scope: this,
                    handler: this.onAddClick
                }, '-', */{
                    xtype: 'combobox',
                    itemId: 'comboTypeParam',
                    fieldLabel: 'Type',
                    labelWidth: 35,
                    width: 200,
                    emptyText: 'Tous',
                    editable: false,
                    queryMode: 'local',
                    displayField: 'str_TYPE',
                    valueField: 'str_TYPE',
                    // Les types viennent du serveur : ils suivent la visibilite du profil connecte, et
                    // aucun type inaccessible n'est propose. Une liste figee ici se serait desynchronisee.
                    store: new Ext.data.Store({
                        fields: [{name: 'str_TYPE', type: 'string'}],
                        autoLoad: true,
                        proxy: {
                            type: 'ajax',
                            url: url_rest_data_parametre_types,
                            reader: {type: 'json', root: 'results', totalProperty: 'total'}
                        }
                    }),
                    listeners: {
                        change: function() {
                            Me.onRechClick();
                        }
                    }
                }, {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'facture',
                    emptyText: 'Rechercher (2 caractères)',
                    // Recherche automatique des 2 caracteres saisis, avec un delai qui laisse finir la
                    // frappe : une seule requete part, pas une par touche.
                    enableKeyEvents: true,
                    listeners: {
                        'render': function(cmp) {
                            cmp.getEl().on('keypress', function(e) {
                                if (e.getKey() === e.ENTER) {
                                    Me.onRechClick();
                                }
                            });
                        },
                        'keyup': {
                            buffer: 350,
                            fn: function(cmp, e) {
                                if (e.getKey() === e.ENTER) {
                                    return;
                                }
                                var valeur = (cmp.getValue() || '').trim();
                                // Champ vide : on recharge la liste complete (annulation du filtre).
                                if (valeur.length >= 2 || valeur.length === 0) {
                                    Me.onRechClick();
                                }
                            }
                        }
                    }
                }, {
                    text: 'Réinitialiser',
                    tooltip: 'Effacer la recherche et le filtre de type',
                    scope: this,
                    handler: function() {
                        var champ = Ext.getCmp('rechecher');
                        if (champ) {
                            champ.setValue('');
                        }
                        var combo = Me.down('#comboTypeParam');
                        if (combo) {
                            combo.setValue(null);
                        }
                        Me.onRechClick();
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
    onCellClick: function (view, td, cellIndex, rec, tr, rowIndex, e) {
        var column = view.getHeaderAtIndex(cellIndex);
        if (!column || column.itemId !== 'paramSwitchColumn') {
            return;
        }
        var valeur = rec.get('str_VALUE');
        if (valeur !== '0' && valeur !== '1') {
            return;
        }
        var nouvelleValeur = (valeur === '1') ? '0' : '1';
        var store = this.getStore();
        Ext.Ajax.request({
            url: url_rest_toggle_parametre,
            method: 'POST',
            params: {
                str_KEY: rec.get('str_KEY'),
                str_VALUE: nouvelleValeur
            },
            success: function (response) {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === "0") {
                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 320,
                        msg: object.errors,
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING
                    });
                    return;
                }
                // recharge pour refleter aussi l'exclusivite SEMOIS_ABC / SEMOIS_PAR_PRODUIT
                store.reload();
            },
            failure: function (response) {
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
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
        // extraParam persistant : la recherche ET le filtre de type sont conserves quand on change de page
        var val = Ext.getCmp('rechecher');
        var combo = Me ? Me.down('#comboTypeParam') : null;
        var store = this.getStore();
        store.getProxy().setExtraParam('search_value', val ? val.getValue() : '');
        store.getProxy().setExtraParam('type_filtre', (combo && combo.getValue()) ? combo.getValue() : '');
        store.loadPage(1);
    }

});

