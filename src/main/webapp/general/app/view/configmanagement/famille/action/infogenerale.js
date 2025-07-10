var url_services_data_formearticle_famille = '../webservices/configmanagement/formearticle/ws_data.jsp';
//var url_services_data_formearticle_famille = '../webservices/configmanagement/formearticle/ws_data.jsp';
var url_services_data_grossiste_famille = '../webservices/configmanagement/grossiste/ws_data.jsp';
var url_services_data_famaillearticle_famille = '../webservices/configmanagement/famillearticle/ws_data.jsp';
var url_services_data_fabricant_famille = '../webservices/configmanagement/fabriquant/ws_data.jsp';
var url_services_data_famille = '../webservices/sm_user/famille/ws_data.jsp';
var url_services_transaction_famille = '../webservices/sm_user/famille/ws_transaction.jsp?mode=';

var Oview;
var Omode;
var Me;
var ref;
var isBoolT_F;

Ext.define('testextjs.view.configmanagement.famille.action.infogenerale', {
    extend: 'Ext.form.Panel',
    alias: 'widget.personal',
    xtype: 'personal',
    layout: 'anchor',
    itemId: 'personalForm',
    defaults: {anchor: '100%', msgTarget: 'side'},
    initComponent: function () {

        Me = this;
        Omode = "create";
        var itemsPerPage = 20;

        var store_famillearticle_famille = new Ext.data.Store({
            model: 'testextjs.model.FamilleArticle',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_famaillearticle_famille,
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
        var store_formearticle_famille = new Ext.data.Store({
            model: 'testextjs.model.Formearticle',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_formearticle_famille,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_fabricant_famille = new Ext.data.Store({
            model: 'testextjs.model.Fabriquant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_fabricant_famille,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        //alert("02");
        var form = new Ext.form.Panel({
            items: [{
                    xtype: 'fieldset',
                    //   width: 55,
                    title: 'Informations Generales Articles',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            fieldLabel: 'Cip',
                            xtype: 'textfield',
                            maskRe: /[0-9.]/,
                            width: 200,
                            autoCreate: {
                                tag: 'input',
                                maxlength: '7'
                            },
                            emptyText: 'CIP',
                            name: 'int_CIP',
                            id: 'int_CIP'
                        },
                        {
                            fieldLabel: 'Designation',
                            width: 200,
                            emptyText: 'DESIGNATION',
                            name: 'str_DESCRIPTION',
                            id: 'str_DESCRIPTION'
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Famille',
                            name: 'lg_FAMILLEARTICLE_ID',
                            width: 200,
                            id: 'lg_FAMILLEARTICLE_ID',
                            store: store_famillearticle_famille,
                            valueField: 'lg_FAMILLEARTICLE_ID',
                            displayField: 'str_LIBELLE',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir une famille...'
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Grossiste',
                            name: 'lg_GROSSISTE_ID',
                            width: 200,
                            id: 'lg_GROSSISTE_ID',
                            store: store_grossiste_famille,
                            valueField: 'lg_GROSSISTE_ID',
                            displayField: 'str_LIBELLE',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un grossiste...'
                        }, {
                            xtype: 'combobox',
                            fieldLabel: 'Forme Article',
                            name: 'lg_FORME_ARTICLE_ID',
                            width: 200,
                            id: 'lg_FORME_ARTICLE_ID',
                            store: store_formearticle_famille,
                            valueField: 'lg_FORME_ARTICLE_ID',
                            displayField: 'str_LIBELLE',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir une forme article...'
                        }, {
                            xtype: 'combobox',
                            fieldLabel: 'Labo Fabrication',
                            name: 'lg_FABRIQUANT_ID',
                            width: 200,
                            id: 'lg_FABRIQUANT_ID',
                            store: store_fabricant_famille,
                            valueField: 'lg_FABRIQUANT_ID',
                            displayField: 'str_NAME',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir le labo de fabrication...'
                        }]
                }]


        });

        var win = new Ext.window.Window({
            autoShow: true,
            title: "INFORMATIONS GENERALES ARTICLE",
            width: 600,
            height: 400,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }, {
                    text: 'Suivant >>',
                    handler: this.onAutreInfos
                }, {
                    text: 'Terminer',
                    handler: this.onbtnsave
                }
            ]
        });
    },
    onAutreInfos: function () {

        //this.up('window').close();
        var internal_url = "";
        if (Omode === "create") {
            internal_url = url_services_transaction_famille + 'create';
        }/* else {
         internal_url = url_services_transaction_famille + 'update&lg_FAMILLE_ID=' + ref;
         }*/

        //  alert("internal_url  " + internal_url);



        Ext.Ajax.request({
            url: internal_url,
            params: {
                int_CIP: Ext.getCmp('int_CIP').getValue(),
                str_DESCRIPTION: Ext.getCmp('str_DESCRIPTION').getValue(),
                lg_GROSSISTE_ID: Ext.getCmp('lg_GROSSISTE_ID').getValue(),
                lg_FAMILLEARTICLE_ID: Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue(),
                lg_FORME_ARTICLE_ID: Ext.getCmp('lg_FORME_ARTICLE_ID').getValue(),
                lg_FABRIQUANT_ID: Ext.getCmp('lg_FABRIQUANT_ID').getValue()

            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
                    /*if (internal_url === url_services_transaction_famille + 'create') {
                     Ext.MessageBox.alert('Creation article', 'creation effectuee avec succes');
                     
                     } else {
                     alert('je suis ' + internal_url);
                     //Ext.MessageBox.alert('Modification article', 'modification effectuee avec succes');
                     
                     }*/
                    ref = object.ref;
                    //Ext.MessageBox.alert('Confirmation', object.errors + " ref " + ref);
                    new testextjs.view.configmanagement.famille.action.autreinfos({
                        odatasource: ref,
                        parentview: this,
                        mode: "update",
                        titre: "AUTRES INFORMATIONS ARTICLES"
                    });
//                    Ext.MessageBox.alert('Confirmation', object.errors);
                }

                // Oview.getStore().reload();

            },
            failure: function (response)
            {

                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
//        this.up('window').close();
//        

    },
    onbtnsave: function () {

        var internal_url = "";
        if (Omode === "create") {
            internal_url = url_services_transaction_famille + 'create';
        }/* else {
         internal_url = url_services_transaction_famille + 'update&lg_FAMILLE_ID=' + ref;
         }*/

        //  alert("internal_url  " + internal_url);



        Ext.Ajax.request({
            url: internal_url,
            params: {
                int_CIP: Ext.getCmp('int_CIP').getValue(),
                str_DESCRIPTION: Ext.getCmp('str_DESCRIPTION').getValue(),
                lg_GROSSISTE_ID: Ext.getCmp('lg_GROSSISTE_ID').getValue(),
                lg_FAMILLEARTICLE_ID: Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue(),
                lg_FORME_ARTICLE_ID: Ext.getCmp('lg_FORME_ARTICLE_ID').getValue(),
                lg_FABRIQUANT_ID: Ext.getCmp('lg_FABRIQUANT_ID').getValue()

            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
                    /*if (internal_url === url_services_transaction_famille + 'create') {
                     Ext.MessageBox.alert('Creation article', 'creation effectuee avec succes');
                     
                     } else {
                     alert('je suis ' + internal_url);
                     //Ext.MessageBox.alert('Modification article', 'modification effectuee avec succes');
                     
                     //                     }*/
                    info = object.info;
                    Ext.MessageBox.alert('Confirmation', object.errors + " info " +info);
//                    Ext.MessageBox.alert('Confirmation', object.errors);
                }

                Oview.getStore().reload();
            },
            failure: function (response)
            {

                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
        this.up('window').close();
    }

});