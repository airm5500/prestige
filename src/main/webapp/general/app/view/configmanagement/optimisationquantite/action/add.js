var url_services_data_optimisationquantite = '../webservices/configmanagement/optimisationquantite/ws_data.jsp';
var url_services_transaction_optimisationquantite = '../webservices/configmanagement/optimisationquantite/ws_transaction.jsp?mode=';
var Oview;
var Omode;
var Me;
var ref;

Ext.define('testextjs.view.configmanagement.optimisationquantite.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addoptimisationquantite',
    id: 'addoptimisationquantiteID',
    requires: [
    'Ext.form.*',
    'Ext.window.Window'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function () {

        Oview = this.getParentview();


        Omode = this.getMode();



        Me = this;
//        var store = new Ext.data.Store({
//            model: 'testextjs.model.Role',
//            proxy: {
//                type: 'ajax',
//                url: url_services_data_role
//            }
//        });
//        var storeskin = new Ext.data.Store({
//            model: 'testextjs.model.Skin',
//            proxy: {
//                type: 'ajax',
//                url: url_services_data_skin
//            }
//        });
//        var storelanguage = new Ext.data.Store({
//            model: 'testextjs.model.Language',
//            proxy: {
//                type: 'ajax',
//                url: url_services_data_language
//            }
//        });


        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 140,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    //   width: 55,
                    title: 'Informations Optimisation Quantite',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            fieldLabel: 'Code Optimisation',
                            emptyText: 'Code Optimisation',
                            name: 'str_CODE_OPTIMISATION',
                            allowBlank: false,
                            id: 'str_CODE_OPTIMISATION'
                        },{
                            fieldLabel: 'Libelle',
                            emptyText: 'Libelle',
                            name: 'str_LIBELLE_OPTIMISATION',
                            allowBlank: false,
                            id: 'str_LIBELLE_OPTIMISATION'
                        }
                      
                    ]
                }]
        });



        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_OPTIMISATION_QUANTITE_ID;
            
            Ext.getCmp('str_CODE_OPTIMISATION').setValue(this.getOdatasource().str_CODE_OPTIMISATION);            
            Ext.getCmp('str_LIBELLE_OPTIMISATION').setValue(this.getOdatasource().str_LIBELLE_OPTIMISATION);
           // Ext.getCmp('STR_BUREAU_DISTRIBUTEUR').setValue(this.getOdatasource().STR_BUREAU_DISTRIBUTEUR);        

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
                    handler: function () {
                        win.close();
                    }
                }]
        });

    },
    onbtnsave: function () {


          //alert(Ext.getCmp('lg_OPTIMISATION_QUANTITE_ID').getValue());

        var internal_url = "";


        if (Omode === "create") {
            //alert("create");
            internal_url = url_services_transaction_optimisationquantite + 'create';

        } else {
            //alert("update");
            internal_url = url_services_transaction_optimisationquantite + 'update&lg_OPTIMISATION_QUANTITE_ID=' + ref;
        }



        Ext.Ajax.request({
            url: internal_url,
            params: {
                
                str_CODE_OPTIMISATION: Ext.getCmp('str_CODE_OPTIMISATION').getValue(),               
                str_LIBELLE_OPTIMISATION: Ext.getCmp('str_LIBELLE_OPTIMISATION').getValue()
                //STR_BUREAU_DISTRIBUTEUR : Ext.getCmp('STR_BUREAU_DISTRIBUTEUR').getValue()
               
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                }else {
                    if(internal_url === url_services_transaction_optimisationquantite + 'create'){
                        Ext.MessageBox.alert('Creation optimisationquantite', 'creation effectuee avec succes');
                        
                    }else{
                        Ext.MessageBox.alert('Modification optimisationquantite', 'modification effectuee avec succes');
                       
                    }                                     
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