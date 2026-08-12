
var url_services_data_utilisateur = '../webservices/sm_user/utilisateur/ws_data.jsp';
var url_services_transaction_utilisateur= '../webservices/sm_user/utilisateur/ws_transaction.jsp?mode=';
var  Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.sm_user.user.action.addpwd', {
    extend: 'Ext.window.Window',
    xtype: 'adduserpwd',
    id: 'adduserpwdID',
    requires: [
    'Ext.form.*',
    'Ext.window.Window'
    ],

    config: {
        odatasource:'',
        parentview:'',
        mode :'',
        titre :''
    },

    initComponent: function() {

        Oview = this.getParentview();


        Omode = this.getMode();



        Me = this;
       

        var form = new Ext.form.Panel({

            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 115,
                msgTarget: 'side'
            },

            items: [{
                xtype: 'fieldset',
                //   width: 55,
                title: 'Information Utilisateur',
                defaultType: 'textfield',
                defaults: {
                    anchor: '100%'
                },
                items: [
          
                {
                    xtype: 'textfield',
                    fieldLabel: 'Nouveau mot de passe',
                    name: 'str_PASSWORD',
                    allowBlank: false,
                    id:'str_PASSWORDnew',
                    inputType: 'password'
                },
                {
                    xtype: 'textfield',
                    fieldLabel: 'Confirmer',
                    name: 'str_PASSWORD',
                    allowBlank: false,
                    id:'str_PASSWORDn',
                    inputType: 'password'
                }
                ]
            }]
        });



        //Initialisation des valeur


        if(Omode === "updatepassword"){

            ref = this.getOdatasource().lg_USER_ID;

        //  Ext.getCmp('str_PASSWORDn').setValue(this.getOdatasource().str_PASSWORD);
    
        }
        
       

        var win =  new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height:250,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,

            buttons: [{
                text: 'Enregistrer',
                handler:  this.onbtnsave
            },{
                text: 'Annuler',
                handler:function (){
                    win.close();
                }
            }]
        });

    },
    onbtnsave:function(){


        if(Ext.getCmp('str_PASSWORDnew').getValue()=== Ext.getCmp('str_PASSWORDn').getValue()){
            var internal_url ="";


//            if(Omode === "create"){
//                internal_url = url_services_transaction_utilisateur+'create';
//            }else {
//                internal_url = url_services_transaction_utilisateur+'update&lg_USER_ID='+ref;
//            }

            internal_url = url_services_transaction_utilisateur+ 'updatepassword&lg_USER_ID='+ref;

            Ext.Ajax.request({
                url: internal_url,
                params: {

                    str_PASSWORD : Ext.getCmp('str_PASSWORDn').getValue()


                },
                success: function(response)
                {
                    var object = Ext.JSON.decode(response.responseText,false);
                    if(object.success === 0){
                        Ext.MessageBox.alert('Error Message', object.errors);
                        return;
                    }
                    Oview.getStore().reload();

                },
                failure: function(response)
                {
                    var object = Ext.JSON.decode(response.responseText,false);
                    console.log("Bug "+response.responseText);
                    Ext.MessageBox.alert('Error Message', response.responseText);
            
                }

            });
            this.up('window').close();

        }
        else{
            Ext.MessageBox.alert('erreur','mot de passe differents');

        }
            
    }
  
});