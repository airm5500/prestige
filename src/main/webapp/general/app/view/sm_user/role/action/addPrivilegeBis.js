// REST (meme format que les anciennes JSP ws_data_privilege / ws_role_transaction)
var url_services_data_addprivilegebis = '../api/v1/roles/privileges';
var url_services_toggle_addprivilegebis = '../api/v1/roles/privileges/toggle';
var url_services_toggleall_addprivilegebis = '../api/v1/roles/privileges/toggle-all';


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

Ext.define('testextjs.view.sm_user.role.action.addPrivilegeBis', {
    extend: 'Ext.window.Window',
    xtype: 'addPrivilegeBis',
    id: 'addPrivilegeBisID',
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
    title: 'Choix des privileges',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function() {

        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;
        ref = this.getOdatasource().lg_ROLE_ID;

        listProductSelected = [];

        var itemsPerPage = 20;


        var store = new Ext.data.Store({
            model: 'testextjs.model.Privilege',
            pageSize: itemsPerPage,
            autoLoad: true,
//            proxy: proxy
            proxy: {
                type: 'ajax',
                url: url_services_data_addprivilegebis,
                extraParams: {
                    lg_ROLE_ID: ref
                },
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
                    fieldLabel: 'Libelle',
                    name: 'str_inventaire_chosen',
                    id: 'str_inventaire_chosen',
                    fieldStyle: "color:blue;",
                    emptyText: 'Libelle'
                });

        str_commentaire_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Description',
                    name: 'str_commentaire_chosen',
                    id: 'str_commentaire_chosen',
                    fieldStyle: "color:blue;",
                    emptyText: 'Description'
                });


        user_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Type',
                    name: 'user_chosen',
                    id: 'user_chosen',
                    emptyText: 'Type',
                    fieldStyle: "color:blue;",
                    align: 'right'

                });


        dt_created_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Lieu de travail',
                    name: 'dt_created_chosen',
                    id: 'dt_created_chosen',
                    hidden: true,
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
                    // Hauteur calee sur une page complete (20 lignes) : la page s'affiche
                    // entierement, sans ascenseur vertical dans la grille.
                    height: 640,
                    columns: [{
                            text: 'lg_PRIVELEGE_ID',
                            flex: 1,
                            sortable: true,
                            hidden: true,
                            dataIndex: 'lg_PRIVELEGE_ID'
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
                            id: 'rechercher_bis',
                            name: 'user',
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
                        }, '->', {
                            text: 'Tout s&eacute;lectionner',
                            tooltip: 'Attribuer tous les privil&egrave;ges affich&eacute;s par la recherche courante (toutes les pages)',
                            icon: 'resources/images/icons/fam/accept.png',
                            scope: this,
                            handler: function () {
                                Me.onToggleAll(true);
                            }
                        }, {
                            text: 'Tout d&eacute;s&eacute;lectionner',
                            tooltip: 'Retirer tous les privil&egrave;ges affich&eacute;s par la recherche courante (toutes les pages)',
                            icon: 'resources/images/icons/fam/cross.gif',
                            scope: this,
                            handler: function () {
                                Me.onToggleAll(false);
                            }
                        }],
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store,
                        dock: 'bottom',
                        pageSize: itemsPerPage,
                        displayInfo: true
                    }
                }, {
                    columnWidth: 0.35,
                    margin: '10 10 10 10',
                    xtype: 'fieldset',
                    title: 'Information sur le role',
                    id: 'info_role',
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
        if (Omode === "update") {
            ref = this.getOdatasource().lg_ROLE_ID;
            Ext.getCmp('str_inventaire_chosen').setValue(this.getOdatasource().str_NAME);
            Ext.getCmp('str_commentaire_chosen').setValue(this.getOdatasource().str_DESIGNATION);
            Ext.getCmp('user_chosen').setValue(this.getOdatasource().str_TYPE);
            Ext.getCmp('dt_created_chosen').setValue(this.getOdatasource().lg_ROLE_ID);
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
            listeners: {// controle sur le button fermé en haut de fenetre
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
        //alert(rec.get('lg_PRIVELEGE_ID'));
        if (checked == true) {
            listProductSelected.push(rowIndex); //on ajoute l'index de la ligne selectionnée au tableau
            // Me.onCheckTrueClick(rec.get('lg_PRIVELEGE_ID'));
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
    onCheckTrueClick: function(record) {
        Ext.Ajax.request({
            url: url_services_toggle_addprivilegebis,
            method: 'POST',
            params: {
                lg_PRIVELEGE_ID: record.get('lg_PRIVELEGE_ID'),
                lg_ROLE_ID: ref,
                checked: true
            },
            success: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success == "0") {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                }
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
            url: url_services_toggle_addprivilegebis,
            method: 'POST',
            params: {
                lg_PRIVELEGE_ID: record.get('lg_PRIVELEGE_ID'),
                lg_ROLE_ID: ref,
                checked: false
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
     onRechClick: function () {
        var val = Ext.getCmp('rechercher_bis');
        var store = Ext.getCmp('CltgridpanelID').getStore();
        // parametre persistant : la pagination conserve la recherche (fix 2/13)
        store.getProxy().setExtraParam('search_value', val.value || '');
        store.loadPage(1);
    },
    // Attribution / retrait en masse de tous les privileges de la recherche courante (toutes pages)
    onToggleAll: function (checked) {
        var val = Ext.getCmp('rechercher_bis');
        var libelle = checked ? 'attribuer TOUS les privil&egrave;ges' : 'retirer TOUS les privil&egrave;ges';
        Ext.MessageBox.confirm('Confirmation',
                'Voulez-vous ' + libelle + ' correspondant &agrave; la recherche courante (toutes les pages) &agrave; ce profil ?',
                function (btn) {
                    if (btn !== 'yes') {
                        return;
                    }
                    var progress = Ext.MessageBox.wait('Mise &agrave; jour en cours . . .', 'Veuillez patienter');
                    Ext.Ajax.request({
                        url: url_services_toggleall_addprivilegebis,
                        method: 'POST',
                        timeout: 600000,
                        params: {
                            lg_ROLE_ID: ref,
                            search_value: val ? (val.value || '') : '',
                            checked: checked
                        },
                        success: function (response) {
                            progress.hide();
                            var o = Ext.JSON.decode(response.responseText, true) || {};
                            if (o.success == "0") {
                                Ext.MessageBox.alert('Message', o.errors || 'Mise &agrave; jour impossible');
                                return;
                            }
                            Ext.MessageBox.alert('Message', '<b>' + (o.count || 0) + '</b> privil&egrave;ge(s) '
                                    + (checked ? 'attribu&eacute;(s)' : 'retir&eacute;(s)') + '.');
                            Ext.getCmp('CltgridpanelID').getStore().reload();
                        },
                        failure: function () {
                            progress.hide();
                            Ext.MessageBox.alert('Message', 'Un probl&egrave;me avec le serveur');
                        }
                    });
                });
    }
});