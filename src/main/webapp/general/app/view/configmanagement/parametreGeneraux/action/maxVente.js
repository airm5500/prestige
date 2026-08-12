//var url_services_data_zonegeo_famille = '../webservices/configmanagement/zonegeographique/ws_data.jsp';
//var url_services_data_codeacte_famille = '../webservices/configmanagement/codeacte/ws_data.jsp';
//var url_services_data_grossiste_famille = '../webservices/configmanagement/grossiste/ws_data.jsp';
//var url_services_data_famaillearticle_famille = '../webservices/configmanagement/famillearticle/ws_data.jsp';
var url_services_data_max_vente = '../webservices/configmanagement/famillearticle/ws_data_maxVente.jsp';
var url_services_transaction_max_vente = '../webservices/configmanagement/famillearticle/ws_transaction_maxVente.jsp?mode=';
//var url_services_data_codegestion_famille = '../webservices/configmanagement/codegestion/ws_data.jsp';
//var url_services_data_famille = '../webservices/sm_user/famille/ws_data.jsp';
//var url_services_transaction_famille = '../webservices/sm_user/famille/ws_transaction.jsp?mode=';
//var url_services_data_typeetiquette = '../webservices/configmanagement/typeetiquette/ws_data.jsp';
//var url_services_data_codetva = '../webservices/sm_user/famille/ws_data_codetva.jsp';

var Oview;
var Omode;
var Me;
var ref;
var isBoolT_F;
var int_value_max ;
//alert('1');
Ext.define('testextjs.view.configmanagement.parametreGeneraux.action.maxVente', {
    extend: 'Ext.window.Window',
    xtype: 'modifMaxVente',
    id: 'modifMaxVenteID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut',
        'testextjs.model.GroupeFamille',
        'testextjs.model.Grossiste',
        'testextjs.model.CodeGestion',
        'testextjs.model.CodeActe'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function () {
//alert('2');
        Oview = this.getParentview();

        Omode = this.getMode();

        Me = this;
        var itemsPerPage = 20;

 

//            int_STOCK_RESERVE = new Ext.form.field.Display(
//                {
//                    xtype: 'displayfield',
//                    //allowBlank: false,
//                    hidden: true,
//                    fieldLabel: 'Quantite reserve: ',
//                    name: 'int_STOCK_RESERVE',
//                    id: 'int_STOCK_RESERVE',
//                    fieldStyle: "color:blue;",
//                    width: 400,
//                    margin: '0 15 0 0'
//                });
    

        var form = new Ext.form.Panel({
            bodyPadding: 15,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 150,
                layout: {
                    type: 'vbox',
                    align: 'stretch',
                    padding: 10
                },
                defaults: {
                    flex: 1
                },
                msgTarget: 'side'
            },
//            items: [{
//                    xtype: 'fieldset',
//                    collapsible: true,
//                    layout: 'vbox',
//                    // title: 'Infos.Produit',
//                    defaultType: 'textfield',
//                    defaults: {
//                        anchor: '100%'
//                    },
                    items: [{
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    fieldLabel: 'Quantite max de vente',
                                    xtype: 'numberfield',
                                    maskRe: /[0-9.]/,
                                    //width: 400,
                                    autoCreate: {
                                        tag: 'input',
                                        maxlength: '7'
                                    },
                                    name: 'int_MaxVente',
                                    id: 'int_MaxVente'}
                                

                            ]
                        }]
                //}              
                
            //]


        });



        //Initialisation des valeur
        if (Omode == "decondition" || (this.getOdatasource().bool_DECONDITIONNE == 0 && this.getOdatasource().bool_DECONDITIONNE_EXIST == 1)) {
            Ext.getCmp('infosup').show();
        }

        // alert("int_NUMBERDETAIL "+this.getOdatasource().int_NUMBERDETAIL);

      
        //alert('3');


        var win = new Ext.window.Window({
            autoShow: true,
            title: 'this.getTitre()',
            width: 200,
            height: 100,
            minWidth: 100,
            minHeight: 50,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Modifier',
                    handler: this.onbtnsave
                }, {
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }]
        });
        //alert('4');
        Ext.Ajax.request({
            url: url_services_data_max_vente,
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                Ext.getCmp('int_MaxVente').setValue(object.total);
           
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
//                    if (internal_url === url_services_transaction_famille + 'create') {
//                        Ext.MessageBox.alert('Creation article', 'creation effectuee avec succes');
//
//                    } else {
//                        Ext.MessageBox.alert('Modification article', 'modification effectuee avec succes');
//
//                    }
                    //Ext.MessageBox.alert('Confirmation', object.errors);
                }

                //Oview.getStore().reload();

            },
            failure: function (response)
            {

                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });
        

    },
    onbtnsave: function () {

        Omode = "update";
        var internal_url = "";
        var int_DECONDITIONNE = 0;
        //var int_QTEDETAIL = Ext.getCmp('int_QTEDETAIL').getValue();


        if (Omode === "create") {
            //internal_url = url_services_transaction_famille + 'create';
        } else if (Omode === "update") 
        {           
            int_value_max = Ext.getCmp('int_MaxVente').getValue();            
            internal_url = url_services_transaction_max_vente + 'update&int_value_max=' + int_value_max;
            
        } else if (Omode === "decondition") {
            //internal_url = url_services_transaction_famille + 'decondition&lg_FAMILLE_ID=' + ref;
//            int_DECONDITIONNE = 1;
//            if (int_QTEDETAIL <= 0) {
//                Ext.MessageBox.alert('Impossible', 'Veuillez renseigner la quantite detail de l\'article');
//                return;
//            }
        }


        //alert("ref  " + ref);

//        alert("int_DECONDITIONNE "+int_DECONDITIONNE);
//        return int_DECONDITIONNE;

        Ext.Ajax.request({
            url: internal_url,
            params: {
                //int_NUMBER_AVAILABLE: Ext.getCmp('int_NUMBER_AVAILABLE').getValue()          
               
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    //Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
                    //Ext.MessageBox.alert('Confirmation', object.errors);
                }

                //Oview.getStore().reload();

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