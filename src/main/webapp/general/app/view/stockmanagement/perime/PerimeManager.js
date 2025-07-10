/* global Ext */

var url_services_data_perime = '../webservices/stockmanagement/perime/ws_data.jsp';
var url_services_transaction_perime = '../webservices/stockmanagement/perime/ws_transaction.jsp?mode=';
var url_services_data_article = '../webservices/sm_user/famille/ws_data.jsp';
var url_services_data_perime_generate_pdf = '../webservices/stockmanagement/perime/ws_generate_pdf.jsp';

var valdatedebut;
var valdatefin;
var store_;
var Me;
var str_TYPE_TRANSACTION;
var str_TRI;
Ext.define('testextjs.view.stockmanagement.perime.PerimeManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'perime',
    id: 'perimeID',
    width: '80%',
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
    title: 'Gestion des perimes',
    plain: true,
    maximizable: true,
//    tools: [{type: "pin"}],
    closable: false,
    frame: true,
    initComponent: function() {

        var itemsPerPage = 20;
        Me = this;
        str_TYPE_TRANSACTION = "";
        str_TRI = "";
        store_ = new Ext.data.Store({
            model: 'testextjs.model.FamilleStock',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_perime,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_famille = new Ext.data.Store({
            model: 'testextjs.model.Famille',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_article,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_type = new Ext.data.Store({
            fields: ["str_TYPE_TRANSACTION", "str_STATUT_TRANSACTION"],
            data: [
                {str_TYPE_TRANSACTION: "En cours de peremption", str_STATUT_TRANSACTION: "PERIMER_ENCOURS"},
                {str_TYPE_TRANSACTION: "Perime", str_STATUT_TRANSACTION: "PERIMER"}
            ]
        });

        var store_trie = new Ext.data.Store({
            fields: ["str_TRI", "str_STATUT_TRI"],
            data: [
                {str_TRI: "Emplacement", str_STATUT_TRI: "str_CODE_EMPLACEMENT"},
                {str_TRI: "Famille", str_STATUT_TRI: "str_CODE_FAMILLE"},
                {str_TRI: "Fournisseur", str_STATUT_TRI: "str_CODE_GROSSISTE"}
                
            ]
        });

        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });


        Ext.apply(this, {
            width: '98%',
            height: 580,
            plugins: [this.cellEditing],
            store: store_,
            id: 'GridPerimeID',
            columns: [{
                    xtype: 'rownumberer',
                    text: 'Num.Ligne',
                    width: 45,
                    hidden: true,
                    sortable: true/*,
                     locked: true*/
                }, {
                    header: 'CIP',
                    dataIndex: 'int_CIP',
                    flex: 0.7/*,
                     editor: {
                     allowBlank: false  
                     }*/
                }, {
                    header: 'Article',
                    dataIndex: 'str_NAME',
                    flex: 2/*,
                     editor: {
                     allowBlank: false
                     }*/
                }, {
                    header: 'Numero lot',
                    dataIndex: 'int_NUM_LOT',
                    flex: 1
                }, {
                    header: 'lg_WAREHOUSE_ID',
                    dataIndex: 'lg_WAREHOUSE_ID',
                    hidden: true,
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                },
                {
                    header: 'Famille article',
                    dataIndex: 'lg_FAMILLEARTICLE_ID',
                    hidden: true,
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/

                }, {
                    header: 'lg_FAMILLE_STOCK_ID',
                    dataIndex: 'lg_FAMILLE_STOCK_ID',
                    hidden: true,
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/

                }, {
                    header: 'Zone geo',
                    dataIndex: 'lg_ZONE_GEO_ID',
                    hidden: true,
                    flex: 1/*,
                     editor: {
                     allowBlank: false  
                     }*/
                }, {
                    header: 'Repartiteur',
                    dataIndex: 'lg_GROSSISTE_ID',
                    flex: 1
                }, {
                    header: 'Qté.Init',
                    dataIndex: 'int_NUMBER',
                    align: 'center',
                    flex: 0.8
                }, {
                    header: 'Date.Per',
                    dataIndex: 'dt_PEREMPTION',
                    flex: 0.8
                }, {
                    header: 'Operateur',
                    dataIndex: 'lg_FAMILLE_ID',
                    flex: 1.2
                }, {
                    header: 'Etat du lot d\'article',
                    dataIndex: 'str_STATUT',
                    flex: 1,
                     renderer: function (v, m, r) {
                        var STATUS = r.data.etat;
                        switch (STATUS) {
                            case "1":
                                m.style = 'background-color:#ff0000;color:#FFF;font-weight:700;';
                                break;
                            case "0":
                                m.style = 'background-color:#009688;color:#FFF;font-weight:700;';
                                break;

                            default:
                              
                                break;
                        }


                        return v;
                    }
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    hidden: true, // a decommenter apres 27/02/2017
                    items: [{
                            icon: 'resources/images/icons/fam/add.png',
                            tooltip: 'Ajouter un article dans la liste des perimes',
                            scope: this,
                            handler: this.onAddProductToPerimeClick,
                            getClass: function(value, metadata, record) {
                                //    alert("etat"+record.get('etat')+"|int_STOCK_REAPROVISONEMENT"+record.get('int_STOCK_REAPROVISONEMENT'));
                                if (record.get('etat') === "1" && record.get('int_STOCK_REAPROVISONEMENT') > 0) {  //read your condition from the record
                                    return 'x-display-hide'; //affiche l'icone
                                } else {
                                    return 'x-hide-display'; //cache l'icone
                                }
                            }
                        }
                    ]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    hidden: true, // a decommenter apres 27/02/2017
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.png',
                            tooltip: 'Retirer ce lot d\'article du stock',
                            scope: this,
                            handler: this.onDeleteProductToPerimeClick,
                            getClass: function(value, metadata, record) {

                                if (record.get('int_STOCK_REAPROVISONEMENT') === 0) {  //read your condition from the record
                                    return 'x-hide-display'; //affiche l'icone
                                } else {
                                    return 'x-display-hide'; //cache l'icone
                                }
                            }
                        }
                    ]
                }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [{
                    text: 'MAJ Nbre.Mois peromption',
                    scope: this,
                    hidden: true,
                    handler: this.onAddClick
                },  {
                    text: 'Ajouter un p&eacute;rim&eacute;',
                    scope: this,
                     hidden: true,
                    handler: this.onAddPerimeClick
                },  {
                    xtype: 'combobox',
                    fieldLabel: 'Type transaction',
                    name: 'str_TYPE_TRANSACTION',
                    id: 'str_TYPE_TRANSACTION',
                    store: store_type,
                    flex: 1,
                    valueField: 'str_STATUT_TRANSACTION',
                    displayField: 'str_TYPE_TRANSACTION',
                    editable: false, //empeche la saisie dans le combo. "typeAhead" n'est pas utilisé lorsque "editable" est utilisé
                    queryMode: 'local',
                    emptyText: 'Selectionner une action...',
                    listeners: {
                        select: function(cmp) {
                            str_TYPE_TRANSACTION = cmp.getValue();

                            Ext.getCmp('GridPerimeID').getStore().getProxy().url = url_services_data_perime + "?str_TYPE_TRANSACTION=" + str_TYPE_TRANSACTION;
                            Me.onRechClick();
//                            Ext.getCmp('GridPerimeID').getStore().getProxy().url = url_services_data_perime;

                        }
                    }
                }, '-', {
                    xtype: 'combobox',
                    fieldLabel: 'Tri',
                    name: 'str_TRI',
                    id: 'str_TRI',
                    store: store_trie,
                    flex: 1,
                    valueField: 'str_STATUT_TRI',
                    displayField: 'str_TRI',
                    editable: false, //empeche la saisie dans le combo. "typeAhead" n'est pas utilisé lorsque "editable" est utilisé
                    queryMode: 'local',
                    emptyText: 'Selectionner un tri...',
                    listeners: {
                        select: function(cmp) {
                           
                            str_TRI = cmp.getValue();
//                             alert("str_STATUT_TRI"+str_TRI);
                            Ext.getCmp('GridPerimeID').getStore().getProxy().url = url_services_data_perime + "?str_TYPE_TRANSACTION=" + str_TYPE_TRANSACTION+"&str_TRI="+str_TRI;
                            Me.onRechClick();
                        }
                    }
                }, {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'facture',
                    emptyText: 'Rech',
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
                    scope: this,
                    handler: this.onRechClick
                },'-', {
                    text: 'Imprimer',
                    tooltip: 'Imprimer',
                    scope: this,
                    handler: this.onPdfClick
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                store: store_, // same store GridPanel is using
                dock: 'bottom',
                displayInfo: true
            }
        });

        this.callParent();


        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });


    },
    loadStore: function() {
        this.getStore().load({
            /*params: {
                search_value: Ext.getCmp('rechecher').getValue(),
                str_TYPE_TRANSACTION: str_TYPE_TRANSACTION
            }*/
        });

    },
    onAddClick: function() {
        new testextjs.view.stockmanagement.perime.action.addDatePeromption({
            odatasource: "",
            parentview: this,
            mode: "update",
            titre: "MAJ Nbre.Mois peromption"
        });
    }, onAddPerimeClick: function() {
        new testextjs.view.stockmanagement.perime.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter un produit en p&eacute;rim&eacute;"
        });
    },
    onAddProductToPerimeClick: function(grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmer l\'ajout a la liste des perimes',
                function(btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_perime + 'addToPerime',
                            params: {
                                lg_WAREHOUSE_ID: rec.get('lg_WAREHOUSE_ID')
                            },
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                }
                                grid.getStore().reload();
                            },
                            failure: function(response)
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
    onDeleteProductToPerimeClick: function(grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmer la suppression de l\'article perime du stock',
                function(btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_perime + 'deleteToPerime',
                            params: {
                                lg_WAREHOUSE_ID: rec.get('lg_WAREHOUSE_ID')
                            },
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                }
                                grid.getStore().reload();
                            },
                            failure: function(response)
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
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');
        /* var str_TYPE_TRANSACTION = "";
         
         if (Ext.getCmp('str_TYPE_TRANSACTION').getValue() != null) {
         str_TYPE_TRANSACTION = Ext.getCmp('str_TYPE_TRANSACTION').getValue();
         }
         
         */
        this.getStore().load({
            params: {
                search_value: val.getValue(),
                str_TYPE_TRANSACTION: str_TYPE_TRANSACTION,
                str_TRI: str_TRI
            }
        }, url_services_data_perime);
    },
    onPdfClick: function() {
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url_services_data_perime_generate_pdf + "?str_TYPE_TRANSACTION=" + str_TYPE_TRANSACTION + "&str_TRI="+str_TRI;

        window.open(linkUrl);
    }


});