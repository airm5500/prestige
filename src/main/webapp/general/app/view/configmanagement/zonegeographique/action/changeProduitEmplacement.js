var url_services_data_zonegeo = '../webservices/sm_user/famille/ws_data_zonegeo.jsp';
var url_services_transaction_zonegeo = '../webservices/sm_user/famille/ws_transaction.jsp?mode=';


var Oview;
var Omode;
var Me;
var str_product_chosen;
var str_libelle_chosen;
var ref;
var listProductSelected;

Ext.define('testextjs.view.configmanagement.zonegeographique.action.changeProduitEmplacement', {
    extend: 'Ext.window.Window',
    xtype: 'changeProduct',
    id: 'changeProductID',
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
    title: 'Gerer les produits d\'un emplacement',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function() {

        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;
        ref = this.getOdatasource().lg_ZONE_GEO_ID;

        listProductSelected = [];

        var itemsPerPage = 20;


        var store = new Ext.data.Store({
            model: 'testextjs.model.Famille',
            pageSize: itemsPerPage,
            autoLoad: true,
//            proxy: proxy
            proxy: {
                type: 'ajax',
                url: url_services_data_zonegeo + "?lg_ZONE_GEO_ID=" + ref,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 180000
            }
//            autoLoad: true

        });



        str_product_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Code',
                    name: 'str_product_chosen',
                    id: 'str_product_chosen',
                    fieldStyle: "color:blue;"
                });

        str_libelle_chosen = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'D&eacute;signation',
                    name: 'str_libelle_chosen',
                    id: 'str_libelle_chosen',
                    fieldStyle: "color:blue;"
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
                            text: 'CIP',
                            flex: 1,
                            sortable: true,
                            dataIndex: 'CIP'
                        }, {
                            text: 'D&eacute;signation',
                            flex: 2.5,
                            sortable: true,
                            dataIndex: 'str_DESCRIPTION'
                        }, {
                            text: 'P.U',
                            flex: 1,
                            sortable: true,
                            align: 'right',
                            dataIndex: 'int_PRICE'
                        }, {
                            text: 'Stock',
                            flex: 1,
                            sortable: true,
                            align: 'center',
                            dataIndex: 'int_NUMBER_AVAILABLE'
                        }, {
//                            header: 'Choix',
                            text: '',
                            dataIndex: 'is_select',
                            xtype: 'checkcolumn',
                            flex: 0.5,
                            /*editor: {
                             xtype: 'checkcolumn',
                             flex: 0.5
                             },*/
                            listeners: {
                                checkChange: this.onCheckChange
                            }
                        }],
                    tbar: [{
                            xtype: 'textfield',
                            id: 'rechercher',
                            name: 'user',
                            emptyText: 'Rechercher',
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
                        }],
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store,
                        dock: 'bottom',
                        displayInfo: true,
                        listeners: {
                            beforechange: function(page, currentPage) {
                                var myProxy = this.store.getProxy();
                                myProxy.params = {
                                    search_value: '',
                                };
                                myProxy.setExtraParam('search_value', Ext.getCmp('rechercher').getValue());
                            }

                        }

                    }
                }, {
                    columnWidth: 0.35,
                    margin: '10 10 10 10',
                    xtype: 'fieldset',
                    title: 'Information sur l\'emplacement',
                    id: 'info_emplacement',
                    layout: 'anchor',
                    defaultType: 'textfield',
                    items: [str_product_chosen,
                        str_libelle_chosen
                    ]

                }]
        });

        this.callParent();

        if (Omode === "changeproduct") {
            ref = this.getOdatasource().lg_ZONE_GEO_ID;
            //alert("ref " + ref);
            Ext.getCmp('str_product_chosen').setValue(this.getOdatasource().str_CODE);
            Ext.getCmp('str_libelle_chosen').setValue(this.getOdatasource().str_LIBELLEE);
        }
        var mystore = Ext.getCmp('CltgridpanelID').getStore();
        mystore.on("load", function() {

            if (listProductSelected.length > 0) {
                var record;
                Ext.each(listProductSelected, function(lg, index) {
                    mystore.each(function(r, id) {
                        record = mystore.findRecord('lg_FAMILLE_ID', lg);
                        if (record != null) {
                            record.set('is_select', 'true');
                        }
                    });

                });
                if (record !== null) {
                    Ext.getCmp('CltgridpanelID').reconfigure(mystore);
                }
            }
        }

        );

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
//                    hidden: true,
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
    onRemoveClick: function(grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmer la suppresssion',
                function(btn) {


                    if (btn == 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_userphone + 'delete',
                            params: {
                                lg_USER_FONE_ID: rec.get('lg_USER_FONE_ID')
                            },
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                }
                                grid.getStore().reload();
                            },
                            failure: function(response)
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
    onCheckChange: function(column, rowIndex, checked, eOpts) {
        Array.prototype.unset = function(val) {
            var index = this.indexOf(val);
            if (index > -1) {
                this.splice(index, 1);
            }
        };

        var rec = Ext.getCmp('CltgridpanelID').getStore().getAt(rowIndex); // on recupere la ligne courante de la grid

        if (checked == true) {
            listProductSelected.push(rec.get('lg_FAMILLE_ID')); //on ajoute l'index de la ligne selectionnée au tableau
        } else {
            listProductSelected.unset(rec.get('lg_FAMILLE_ID'));
        }
        Ext.getCmp('CltgridpanelID').getStore().commitChanges();
    },
     onRechClick: function () {
        var val = Ext.getCmp('rechecher');

        Ext.getCmp('CltgridpanelID').getStore().load({
            params: {
                search_value: val.getValue()
            }
        }, url_services_data_zonegeo);
    }
});