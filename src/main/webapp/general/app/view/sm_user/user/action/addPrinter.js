var url_services_data_addprinter = '../webservices/sm_user/utilisateur/ws_data_imprimante.jsp';
var url_services_transaction_addprinter = '../webservices/sm_user/utilisateur/ws_transaction.jsp?mode=';


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

Ext.define('testextjs.view.sm_user.user.action.addPrinter', {
    extend: 'Ext.window.Window',
    xtype: 'addPrinter',
    id: 'addPrinterID',
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
    title: 'Choix des imprimantes',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function() {

        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;
        ref = this.getOdatasource().lg_USER_ID;

        listProductSelected = [];

        var itemsPerPage = 20;


        var store = new Ext.data.Store({
            model: 'testextjs.model.Imprimante',
            pageSize: itemsPerPage,
            autoLoad: true,
//            proxy: proxy
            proxy: {
                type: 'ajax',
                url: url_services_data_addprinter + "?lg_USER_ID=" + ref,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 180000
            }
//            autoLoad: true

        });



        str_inventaire_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Nom',
                    name: 'str_inventaire_chosen',
                    id: 'str_inventaire_chosen',
                    fieldStyle: "color:blue;",
                    emptyText: 'Nom'
                });

        str_commentaire_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Prenom(s)',
                    name: 'str_commentaire_chosen',
                    id: 'str_commentaire_chosen',
                    fieldStyle: "color:blue;",
                    emptyText: 'Prenom(s)'
                });


        user_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Role',
                    name: 'user_chosen',
                    id: 'user_chosen',
                    emptyText: 'Role',
                    fieldStyle: "color:blue;",
                    align: 'right'

                });


        dt_created_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Lieu de travail',
                    name: 'dt_created_chosen',
                    id: 'dt_created_chosen',
                    emptyText: 'Lieu de travail',
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
//            items: ['CltgridpanelID', 'info_imprimante'],
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
                            text: 'lg_IMPRIMANTE_ID',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_IMPRIMANTE_ID'
                        }, {
                            text: 'Designation',
                            flex: 1,
                            sortable: true,
                            dataIndex: 'str_DESCRIPTION'
                        }, {
                            header: 'Choix',
                            dataIndex: 'is_select',
                            xtype: 'checkcolumn',
                            flex: 0.5,
                            editor: {
                                xtype: 'checkcolumn',
                                flex: 0.5
                            },
                            listeners: {
                                checkChange: this.onCheckChange
                            }
                        }],
                    tbar: [{
                            xtype: 'textfield',
                            id: 'rechercher',
                            name: 'user',
                            emptyText: 'Rech'
                        }, {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            scope: this,
                            handler: this.onRechClick
                        }],
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
                    title: 'Information sur l\'utilisateur',
                    id: 'info_utilisateur',
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
        if (Omode === "assocprinter") {
            ref = this.getOdatasource().lg_USER_ID;
            //alert("ref " + ref);
            Ext.getCmp('str_inventaire_chosen').setValue(this.getOdatasource().str_FIRST_NAME);
            Ext.getCmp('str_commentaire_chosen').setValue(this.getOdatasource().str_LAST_NAME);
            Ext.getCmp('user_chosen').setValue(this.getOdatasource().lg_ROLE_ID);
            Ext.getCmp('dt_created_chosen').setValue(this.getOdatasource().str_LIEU_TRAVAIL);
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
                    handler: function() {
                        win.close();
                    }
                    // handler: this.onbtnsave
                }, {
                    text: 'Fermer',
                    handler: function() {
                        win.close();
                    }
                }],
            listeners: { // controle sur le button fermé en haut de fenetre
                beforeclose: function() {
                    //alert('im cancelling the window closure by returning false...');
                    //return false;
                }
            }
        });


    },
   
    onCheckChange: function(column, rowIndex, checked, eOpts) {
        // get index of column   
        var rec = OCltgridpanelID.getStore().getAt(rowIndex); // on recupere la ligne courante de la grid
        //alert(rec.get('lg_IMPRIMANTE_ID'));
        if (checked == true) {
            listProductSelected.push(rowIndex); //on ajoute l'index de la ligne selectionnée au tableau
            // Me.onCheckTrueClick(rec.get('lg_IMPRIMANTE_ID'));
            Me.onCheckTrueClick(rec);

        } else {
            Array.prototype.unset = function(val) {
                var index = this.indexOf(val)
                if (index > -1) {
                    this.splice(index, 1)
                }
            }
            //var tab = ['John', 'Paul', 'Georges', 'Ringo'];
            //tab.unset('John');
            listProductSelected.unset(rowIndex);
            Me.onCheckFalseClick(rec);
            /*rec.set('is_select', false);
             rec.commit();*/
            //alert("Case dechochee");
        }
        // alert("listProductSelected "+listProductSelected.length)
    },
    onbtnsave: function(button) {
        var fenetre = button.up('window'),
                formulaire = fenetre.down('form');
        var internal_url = "";

//                        alert("taille du tab:" + listProductSelected.length);
        var liste_article = "";
        for (var i = 0; i < listProductSelected.length; i++) {
            var rec = OCltgridpanelID.getStore().getAt(listProductSelected[i]); // a recupere l'element i de la store se trouvant dans cette grid
            liste_article += rec.get('lg_IMPRIMANTE_ID') + ",";
        }
        liste_article = liste_article.slice(0, -1);//liste des articles. 
        internal_url = url_services_transaction_addprinter + 'createInventaireArticleBis&lg_USER_ID=' + ref + '&liste_article=' + liste_article;

        formulaire.submit({
            url: internal_url,
            timeout: 1800,
            waitMsg: "Veuillez patienter. Traitement en cours...",
            waitTitle: 'Creation d\'un inventaire',
            width: 400,
            success: function(formulaire, action) {

                if (action.result.success === "1") {
                    Ext.MessageBox.alert('Confirmation', action.result.errors);
                    Oview.getStore().reload();
                } else {
                    Ext.MessageBox.alert('Erreur', action.result.errors);

                }

                var bouton = button.up('window');
                bouton.close();
            },
            failure: function(formulaire, action) {
                Oview.getStore().reload();
                Ext.MessageBox.alert('Erreur', 'Erreur  ' + action.result.errors);
            }
        });
    },
    onCheckTrueClick: function(record) {

        Ext.Ajax.request({
            url: url_services_transaction_addprinter + 'createUserImprimante',
            params: {
                lg_IMPRIMANTE_ID: record.get('lg_IMPRIMANTE_ID'),
                lg_USER_ID: ref
            },
            success: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                record.commit();
                console.log("Bug " + object.errors);
               
            },
            failure: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
            }
        });
    },
    onCheckFalseClick: function(record) {

        Ext.Ajax.request({
            url: url_services_transaction_addprinter + 'deleteUserImprimante',
            params: {
                lg_IMPRIMANTE_ID: record.get('lg_IMPRIMANTE_ID'),
                lg_USER_ID: ref
            },
            success: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                record.commit();
                console.log("Bug " + object.errors);
            },
            failure: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
            }
        });
    }
});