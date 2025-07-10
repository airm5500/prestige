/* global Ext */

var url_services_transaction_famillegrossiste = '../webservices/configmanagement/famillegrossiste/ws_transaction.jsp?mode=';
var url_services_data_grossiste_famille = '../webservices/configmanagement/grossiste/ws_data.jsp';
var Oref;
//var OgridpanelID;
var Orefgro;
var type = "";

Ext.define('testextjs.view.configmanagement.famille.action.addfamillegrossiste', {
    extend: 'Ext.window.Window',
    xtype: 'addfamillegrossiste',
    id: 'addfamillegrossisteID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.Grossiste',
        'testextjs.view.commandemanagement.order.action.*'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        ref: '',
        refgro: '',
        type: ''
    },
    initComponent: function() {

        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;
        Oref = this.getRef();
        type = this.getType();

        Orefgro = this.getRefgro();
        //("Orefgro    " + Orefgro);

        var itemsPerPage = 20;

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

        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 160,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Information Grossiste',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Grossiste',
                            name: 'lg_GROSSISTE_ID',
                            width: 400,
                            id: 'lg_GROSSISTEID',
                            store: store_grossiste_famille,
                            valueField: 'lg_GROSSISTE_ID',
                            displayField: 'str_LIBELLE',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un grossiste...'
                        },
                        {
                            name: 'str_CODE_ARTICLE',
                            id: 'str_CODE_ARTICLE',
                            fieldLabel: 'Code article',
                            emptyText: 'Code article',
                            flex: 1,
                            allowBlank: false
                        }
                    ]
                }]
        });
        //Initialisation des valeur

//        OgridpanelID = Ext.getCmp('gridpanelID');

        if (Omode === "updategrossiste") {

            ref = this.getOdatasource().lg_FAMILLE_GROSSISTE_ID;
            Ext.getCmp('lg_GROSSISTEID').setValue(this.getOdatasource().lg_GROSSISTE_LIBELLE);
            Ext.getCmp('str_CODE_ARTICLE').setValue(this.getOdatasource().str_CODE_ARTICLE);
        }

        // creategrossisteorder
        if (Omode === "creategrossisteorder") {
            Ext.getCmp('lg_GROSSISTEID').setValue(this.getOdatasource().lg_GROSSISTE_LIBELLE);

        }

        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 300,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Enregistrer',
                    handler: this.onbtnsave
                }, {
                    text: 'Annuler',
                    handler: function() {
                        win.close();
                    }
                }],
            listeners: {// controle sur le button fermé en haut de fenetre
                beforeclose: function() {
                    if (type == "grossistemanager") {
                        Ext.getCmp('rechecher').focus();
                    }
                }
            }
        });
    },
    onbtnsave: function(button) {
        var win = button.up('window'), form = win.down('form');
        var internal_url = "";
        if (Omode === "creategrossiste" || Omode === "creategrossisteorder") {
            internal_url = url_services_transaction_famillegrossiste + 'create';
        } else {
            internal_url = url_services_transaction_famillegrossiste + 'update&lg_FAMILLE_GROSSISTE_ID=' + ref;
        }

        //alert("Grossiste " + Orefgro + " Article " + Oref);

        testextjs.app.getController('App').ShowWaitingProcess();
        Ext.Ajax.request({
            url: internal_url,
            params: {
                str_CODE_ARTICLE: Ext.getCmp('str_CODE_ARTICLE').getValue(),
                lg_GROSSISTE_ID: Ext.getCmp('lg_GROSSISTEID').getValue(),
                lg_FAMILLE_ID: Oref

            },
            success: function(response)
            {
                testextjs.app.getController('App').StopWaitingProcess();
                //alert("succes");
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success == "0") {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
                    win.close();
                    Ext.MessageBox.alert('Confirmation', object.errors);
                    if(type=="commandegrossistemanager") {
                        Ext.getCmp('gridpanelID').getStore().reload();
                    } else {
                        Ext.getCmp('gridpanelGrossisteID').getStore().reload();
                    }
                    
                }


            },
            failure: function(response)
            {
                //alert("echec");
                testextjs.app.getController('App').StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('  Message', response.responseText);
            }
        });
//        this.up('window').close();
    }
});


