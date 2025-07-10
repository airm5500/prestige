/* global Ext */

var url_services_data_addarticle_inventaire = '../webservices/stockmanagement/inventaire/ws_data_article_unitaire.jsp';
var url_services_transaction_addarticle_inventaire = '../webservices/stockmanagement/inventaire/ws_transactions.jsp?mode=';
var url_services_data_zonegeo = '../webservices/configmanagement/zonegeographique/ws_data.jsp';
var url_services_data_famille_article = '../webservices/configmanagement/famillearticle/ws_data.jsp';
var url_services_data_grossiste_famille = '../webservices/configmanagement/grossiste/ws_data.jsp';

var OCltgridpanelID;
var Oview;
var Omode;
var Me;
var str_inventaire_chosen;
var str_commentaire_chosen;
var user_chosen;
var dt_created_chosen;
var ref;
var listProductSelected;

Ext.define('testextjs.view.stockmanagement.inventaire.action.addArticle', {
    extend: 'Ext.window.Window',
    xtype: 'addarticle',
    id: 'addarticleID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut',
        'Ext.grid.*',
        'Ext.layout.container.Column'

    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    title: 'Choix des articles',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function () {
//alert("ok");
        // url_services_data_addarticle_inventaire = '../webservices/configmanagement/ayantdroit/ws_data.jsp';

        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;
        ref = this.getOdatasource().lg_INVENTAIRE_ID;

        listProductSelected = [];

        var itemsPerPage = 20;


        var store = new Ext.data.Store({
            model: 'testextjs.model.Famille',
            pageSize: itemsPerPage,
            autoLoad: true,
//            proxy: proxy
            proxy: {
                type: 'ajax',
                url: '../webservices/stockmanagement/inventaire/ws_data_article_unitaire.jsp?lg_INVENTAIRE_ID=' + ref,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 180000
            }
//            autoLoad: true

        });



        var store_zonegeo = new Ext.data.Store({
            model: 'testextjs.model.ZoneGeographique',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_zonegeo,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_grossiste_famille = new Ext.data.Store({
            model: 'testextjs.model.Grossiste',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                   url: '../api/v1/grossiste/all',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_famille_article = new Ext.data.Store({
            model: 'testextjs.model.FamilleArticle',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_famille_article,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        str_inventaire_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Libelle',
                    name: 'str_inventaire_chosen',
                    id: 'str_inventaire_chosen',
                    fieldStyle: "color:blue;",
                    emptyText: 'Libelle'
                });

        str_commentaire_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Commentaire',
                    name: 'str_commentaire_chosen',
                    id: 'str_commentaire_chosen',
                    fieldStyle: "color:blue;",
                    emptyText: 'Commentaire'
                });


        user_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Utilisateur',
                    name: 'user_chosen',
                    id: 'user_chosen',
                    emptyText: 'Utilisateur',
                    fieldStyle: "color:blue;",
                    align: 'right'

                });


        dt_created_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Date',
                    name: 'dt_created_chosen',
                    id: 'dt_created_chosen',
                    emptyText: 'Date',
                    fieldStyle: "color:blue;",
                    align: 'right'

                });

        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });

        var form = new Ext.form.Panel({
            width: 1050,
            layout: {
                type: 'hbox'
            },
            defaults: {
                flex: 1
            },
            // items: ['CltgridpanelID', 'info_inventaire'],
            autoHeight: true,
            fieldDefaults: {
                labelAlign: 'left',
                labelWidth: 90,
                anchor: '100%',
                msgTarget: 'side'
            },
            items: [{
                    columnWidth: 0.65,
                    xtype: 'gridpanel',
                    flex: 1.5,
                    id: 'CltgridpanelID',
                    store: store,
                    height: 400,
                    columns: [{
                            text: 'id',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_INVENTAIRE_FAMILLE_ID'
                        },
                        {
                            text: 'lg_FAMILLE_ID',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_FAMILLE_ID'
                        },
                        {
                            text: 'CIP',
                            flex: 1,
//                            hidden: true,
                            sortable: true,
                            dataIndex: 'int_CIP'
                        }, {
                            text: 'Designation',
                            flex: 1,
                            sortable: true,
                            dataIndex: 'str_DESCRIPTION'
                        }, {
                            text: 'Prix.Vente',
                            flex: 1,
                            dataIndex: 'int_PRICE'
                        }, {
                            text: 'PAT',
                            flex: 1,
                            dataIndex: 'int_PAT'
                        }, {
                            text: 'PAF',
                            flex: 1,
                            dataIndex: 'int_PAF'
                        }, {
                            header: 'Choix',
                            dataIndex: 'is_select',
                            xtype: 'checkcolumn',
                            flex: 0.5,
                            editor: {
                                xtype: 'checkcolumn',
                                flex: 0.5,
                            },
                            listeners: {
                                checkChange: this.onCheckChange
                            }
                        }/*{
                         xtype: 'checkcolumn',
                         header: 'Choix',
                         dataIndex: 'is_select',
                         //                            name: 'is_select',
                         //                            id: 'is_select',
                         flex: 0.5,
                         stopSelection: false,
                         listeners: {
                         checkChange: this.onCheckChange
                         }
                         }*//*, {
                          xtype: 'actioncolumn',
                          width: 30,
                          sortable: false,
                          menuDisabled: true,
                          items: [{
                          icon: 'resources/images/icons/fam/add.png',
                          tooltip: 'Ajouter',
                          scope: this,
                          handler: this.onAddClick
                          }]
                          }*/],
                    tbar: [{
                            xtype: 'combobox',
                            name: 'lg_FAMILLEARTICLE_ID',
                            margins: '0 0 0 10',
                            id: 'lg_FAMILLEARTICLE_ID',
                            store: store_famille_article,
                            valueField: 'lg_FAMILLEARTICLE_ID',
                            displayField: 'str_LIBELLE',
                            typeAhead: true,
                            pageSize: 20, //ajout la barre de pagination
                            queryMode: 'remote',
                            flex: 1,
                            emptyText: 'Selectionner famille article...',
                            listeners: {
                                select: function (cmp) {
                                    var value = cmp.getValue();
                                    var OGrid = Ext.getCmp('CltgridpanelID');
                                    var lg_ZONE_GEO_ID = "";
                                    var lg_GROSSISTE_ID = "";

                                    if (Ext.getCmp('lg_ZONE_GEO_ID').getValue() == null) {
                                        lg_ZONE_GEO_ID = "";
                                    } else {
                                        lg_ZONE_GEO_ID = Ext.getCmp('lg_ZONE_GEO_ID').getValue();
                                    }
                                    if (Ext.getCmp('lg_GROSSISTE_ID').getValue() == null) {
                                        lg_GROSSISTE_ID = "";
                                    } else {
                                        lg_GROSSISTE_ID = Ext.getCmp('lg_GROSSISTE_ID').getValue();
                                    }



                                    // var url_services_data = '../webservices/stockmanagement/inventaire/ws_data_article.jsp';
                                    OGrid.getStore().getProxy().url = url_services_data_addarticle_inventaire + "?lg_FAMILLEARTICLE_ID=" + value + "&lg_ZONE_GEO_ID=" + lg_ZONE_GEO_ID + "&lg_GROSSISTE_ID=" + lg_GROSSISTE_ID + "&lg_INVENTAIRE_ID=" + ref;
                                    OGrid.getStore().reload();
                                    //  OGrid.getStore().getProxy().url = url_services_data_addarticle_inventaire;
                                }
                            }
                        }, '-', {
                            xtype: 'combobox',
                            name: 'lg_ZONE_GEO_ID',
                            margins: '0 0 0 10',
                            id: 'lg_ZONE_GEO_ID',
                            store: store_zonegeo,
                            valueField: 'lg_ZONE_GEO_ID',
                            displayField: 'str_LIBELLEE',
                            pageSize: 20, //ajout la barre de pagination
                            typeAhead: true,
                            queryMode: 'remote',
                            flex: 1,
                            emptyText: 'Sectionner zone geographique...',
                            listeners: {
                                select: function (cmp) {
                                    var value = cmp.getValue();

                                    var OGrid = Ext.getCmp('CltgridpanelID');

                                    var lg_FAMILLEARTICLE_ID = "";
                                    var lg_GROSSISTE_ID = "";


                                    if (Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue() == null) {
                                        lg_FAMILLEARTICLE_ID = "";
                                    } else {
                                        lg_FAMILLEARTICLE_ID = Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue();
                                    }

                                    if (Ext.getCmp('lg_GROSSISTE_ID').getValue() == null) {
                                        lg_GROSSISTE_ID = "";
                                    } else {
                                        lg_GROSSISTE_ID = Ext.getCmp('lg_GROSSISTE_ID').getValue();
                                    }
                                    //var url_services_data = '../webservices/stockmanagement/inventaire/ws_data_article.jsp';
                                    OGrid.getStore().getProxy().url = url_services_data_addarticle_inventaire + "?lg_FAMILLEARTICLE_ID=" + lg_FAMILLEARTICLE_ID + "&lg_ZONE_GEO_ID=" + value + "&lg_GROSSISTE_ID=" + lg_GROSSISTE_ID + "&lg_INVENTAIRE_ID=" + ref;
                                    OGrid.getStore().reload();
                                    //  OGrid.getStore().getProxy().url = url_services_data_addarticle_inventaire;
                                }
                            }
                        }, '-', {
                            xtype: 'combobox',
//                            fieldLabel: 'Grossiste',
                            name: 'lg_GROSSISTE_ID',
                            flex: 1,
                            id: 'lg_GROSSISTE_ID',
                            store: store_grossiste_famille,
                            valueField: 'lg_GROSSISTE_ID',
                            pageSize: 20, //ajout la barre de pagination
                            displayField: 'str_LIBELLE',
                            typeAhead: true,
//                            allowBlank: false,
                            queryMode: 'remote', emptyText: 'Sectionner un grossiste...',
                            listeners: {
                                select: function (cmp) {
                                    var value = cmp.getValue();

                                    var OGrid = Ext.getCmp('CltgridpanelID');

                                    var lg_FAMILLEARTICLE_ID = "";
                                    var lg_ZONE_GEO_ID = "";


                                    if (Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue() == null) {
                                        lg_FAMILLEARTICLE_ID = "";
                                    } else {
                                        lg_FAMILLEARTICLE_ID = Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue();
                                    }

                                    if (Ext.getCmp('lg_ZONE_GEO_ID').getValue() == null) {
                                        lg_ZONE_GEO_ID = "";
                                    } else {
                                        lg_ZONE_GEO_ID = Ext.getCmp('lg_ZONE_GEO_ID').getValue();
                                    }
                                    //var url_services_data = '../webservices/stockmanagement/inventaire/ws_data_article.jsp';
                                    OGrid.getStore().getProxy().url = url_services_data_addarticle_inventaire + "?lg_FAMILLEARTICLE_ID=" + lg_FAMILLEARTICLE_ID + "&lg_ZONE_GEO_ID=" + lg_ZONE_GEO_ID + "&lg_GROSSISTE_ID=" + value + "&lg_INVENTAIRE_ID=" + ref;
                                    OGrid.getStore().reload();

                                    // OGrid.getStore().getProxy().url = url_services_data_addarticle_inventaire;
                                }
                            }
                        }, '-', {
                            xtype: 'textfield',
                            id: 'rechercher',
                            name: 'user',
                            emptyText: 'Recherche',
                            listeners: {
                                'render': function (cmp) {
                                    cmp.getEl().on('keypress', function (e) {
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
                            hidden: true,
                            handler: this.onRechClick
                        }],
                    /*listeners: {
                     scope: this,
                     //                        render: this.onStoreLoad
                     },*/
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store,
                        dock: 'bottom',
                        displayInfo: true
                    }
                }, {
                    columnWidth: 0.35,
                    margin: '10 10 10 10',
                    xtype: 'fieldset',
                    title: 'Information sur l\'inventaire',
                    id: 'info_inventaire',
                    layout: 'anchor',
                    defaultType: 'textfield',
                    items: [str_inventaire_chosen,
                        str_commentaire_chosen,
                        user_chosen,
                        dt_created_chosen
                    ]

                }]
        });

        this.callParent();
        OCltgridpanelID = Ext.getCmp('CltgridpanelID');
        if (Omode === "create") {
            ref = this.getOdatasource().lg_INVENTAIRE_ID;
            //alert("ref " + ref);
            Ext.getCmp('str_inventaire_chosen').setValue(this.getOdatasource().str_NAME);
            Ext.getCmp('str_commentaire_chosen').setValue(this.getOdatasource().str_DESCRIPTION);
            Ext.getCmp('user_chosen').setValue(this.getOdatasource().lg_USER_ID);
            Ext.getCmp('dt_created_chosen').setValue(this.getOdatasource().dt_CREATED);
        }

        var win = new Ext.window.Window({
            autoShow: true,
            id: 'cltwinID',
            title: this.getTitre(),
            width: 1150,
            Height: 500,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Enregistrer',
                    hidden: true,
                    handler: function () {
                        win.close();
                    }
                    // handler: this.onbtnsave
                }, {
                    text: 'Fermer',
                    handler: function () {
                        win.close();
                    }
                }],
            listeners: {// controle sur le button fermé en haut de fenetre
                beforeclose: function () {
//                    alert('im cancelling the window closure by returning false...');
                    // return false;
                }
            }
        });


    },
    onAddClick: function (grid, rowIndex) {
        var lg_FAMILLE_ID = this.getOdatasource().lg_FAMILLE_ID;
        Ext.MessageBox.confirm('Message',
                'Confirmation l\'ajout de l\'article',
                function (btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_addarticle_inventaire + 'createInventaireArticle',
                            params: {
                                lg_FAMILLE_ID: rec.get('lg_FAMILLE_ID'),
                                lg_INVENTAIRE_ID: ref
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('confirmation', object.errors);
                                    var OGrid = Ext.getCmp('CltgridpanelID');

                                    OGrid.getStore().reload();
                                }
                                // grid.getStore().reload();
                            },
                            failure: function (response)
                            {

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
    onRechClick: function () {

        var val = Ext.getCmp('rechercher');
        var lg_FAMILLEARTICLE_ID = "";
        var lg_ZONE_GEO_ID = "";
        var lg_GROSSISTE_ID = "";

        if (Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue() == null) {
            lg_FAMILLEARTICLE_ID = "";
        } else {
            lg_FAMILLEARTICLE_ID = Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue();
        }
        if (Ext.getCmp('lg_ZONE_GEO_ID').getValue() == null) {
            lg_ZONE_GEO_ID = "";
        } else {
            lg_ZONE_GEO_ID = Ext.getCmp('lg_ZONE_GEO_ID').getValue();
        }
        if (Ext.getCmp('lg_GROSSISTE_ID').getValue() == null) {
            lg_GROSSISTE_ID = "";
        } else {
            lg_GROSSISTE_ID = Ext.getCmp('lg_GROSSISTE_ID').getValue();
        }
        OCltgridpanelID.getStore().load({
            params: {
                search_value: val.getValue(),
                lg_INVENTAIRE_ID: ref,
                lg_FAMILLEARTICLE_ID: lg_FAMILLEARTICLE_ID,
                lg_ZONE_GEO_ID: lg_ZONE_GEO_ID,
                lg_GROSSISTE_ID: lg_GROSSISTE_ID
            }
        }, url_services_data_addarticle_inventaire);
    },
    onCheckChange: function (column, rowIndex, checked, eOpts) {
        // get index of column   
        var rec = OCltgridpanelID.getStore().getAt(rowIndex); // on recupere la ligne courante de la grid
        //alert(rec.get('lg_FAMILLE_ID'));
        if (checked == true) {
            listProductSelected.push(rowIndex); //on ajoute l'index de la ligne selectionnée au tableau
            // Me.onCheckTrueClick(rec.get('lg_FAMILLE_ID'));
            Me.onCheckTrueClick(rec);

        } else {
            Array.prototype.unset = function (val) {
                var index = this.indexOf(val);
                if (index > -1) {
                    this.splice(index, 1);
                }
            }
            //var tab = ['John', 'Paul', 'Georges', 'Ringo'];
            //tab.unset('John');
            listProductSelected.unset(rowIndex);
//            Me.onCheckFalseClick(rec.get('lg_FAMILLE_ID'));
            Me.onCheckFalseClick(rec);
            /*rec.set('is_select', false);
             rec.commit();*/
            //alert("Case dechochee");
        }
        // alert("listProductSelected "+listProductSelected.length)
    },
    onbtnsave: function (button) {
        var fenetre = button.up('window'),
                formulaire = fenetre.down('form');
        var internal_url = "";

//                        alert("taille du tab:" + listProductSelected.length);
        var liste_article = "";
        for (var i = 0; i < listProductSelected.length; i++) {
            var rec = OCltgridpanelID.getStore().getAt(listProductSelected[i]); // a recupere l'element i de la store se trouvant dans cette grid
            liste_article += rec.get('lg_INVENTAIRE_FAMILLE_ID') + ",";
        }
        liste_article = liste_article.slice(0, -1);//liste des articles. 
        internal_url = url_services_transaction_addarticle_inventaire + 'createInventaireArticleBis&lg_INVENTAIRE_ID=' + ref + '&liste_article=' + liste_article;

        formulaire.submit({
            url: internal_url,
            timeout: 1800,
            waitMsg: "Veuillez patienter. Traitement en cours...",
            waitTitle: 'Creation d\'un inventaire',
            width: 400,
            success: function (formulaire, action) {

                if (action.result.success === "1") {
                    Ext.MessageBox.alert('Confirmation', action.result.errors);
                    Oview.getStore().reload();
                } else {
                    Ext.MessageBox.alert('Erreur', action.result.errors);

                }

                var bouton = button.up('window');
                bouton.close();
            },
            failure: function (formulaire, action) {
                Oview.getStore().reload();
                Ext.MessageBox.alert('Erreur', 'Erreur  ' + action.result.errors);
            }
        });
    },
    onCheckTrueClick: function (record) {
        
        Ext.Ajax.request({
            url: url_services_transaction_addarticle_inventaire + 'updateInventaireUnitaireFamille',
            params: {
                 lg_FAMILLE_ID: record.get('lg_INVENTAIRE_FAMILLE_ID'),
                lg_INVENTAIRE_ID: ref,
                iSChecked: true
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                record.commit();
                console.log("Bug " + object.errors);
                /*if (object.success === 0) {
                 Ext.MessageBox.alert('Error Message', object.errors);
                 return;
                 } else {
                 Ext.MessageBox.alert('confirmation', object.errors);
                 var OGrid = Ext.getCmp('CltgridpanelID');
                 
                 OGrid.getStore().reload();
                 }*/
                // grid.getStore().reload();
            },
            failure: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                // Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    },
    onCheckFalseClick: function (record) {

        Ext.Ajax.request({
            url: url_services_transaction_addarticle_inventaire + 'updateInventaireUnitaireFamille',
            params: {
                lg_FAMILLE_ID: record.get('lg_INVENTAIRE_FAMILLE_ID'),
                lg_INVENTAIRE_ID: ref,
                iSChecked: false
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                record.commit();
                console.log("Bug " + object.errors);
            },
            failure: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
            }
        });
    }
});