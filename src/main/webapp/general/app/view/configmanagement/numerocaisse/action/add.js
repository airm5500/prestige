var url_services_data_numerocaisse = '../webservices/configmanagement/numerocaisse/ws_data.jsp';
var url_services_transaction_numerocaisse = '../webservices/configmanagement/numerocaisse/ws_transaction.jsp?mode=';
var Oview;
var Omode;
var Me;
var ref;

Ext.define('testextjs.view.configmanagement.numerocaisse.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addnumerocaisse',
    id: 'addnumerocaisseID',
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


        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 140,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',                   
                    title: 'Informations Numero Caisse',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            fieldLabel: 'Code Numero Caisse',
                            emptyText: 'Code Numero Caisse',
                            name: 'str_CODE',
                            //maskRe: /[0-9.]/,
                            allowBlank: false,
                            id: 'str_CODE'
                        },{
                            fieldLabel: 'Numero Caisse',
                            emptyText: 'Numero Caisse',
                            name: 'str_LIBELLE',
                            allowBlank: false,
                            id: 'str_LIBELLE'
                        }
                      
                    ]
                }]
        });



        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_NUMERO_CAISSE;
            
            Ext.getCmp('str_LIBELLE').setValue(this.getOdatasource().str_LIBELLE);            
            Ext.getCmp('str_CODE').setValue(this.getOdatasource().str_CODE);
                
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

        var internal_url = "";


        if (Omode === "create") {
            
            internal_url = url_services_transaction_numerocaisse + 'create';

        } else {
           
            internal_url = url_services_transaction_numerocaisse + 'update&lg_NUMERO_CAISSE=' + ref;
        }



        Ext.Ajax.request({
            url: internal_url,
            params: {
                
                str_LIBELLE: Ext.getCmp('str_LIBELLE').getValue(),             
                str_CODE: Ext.getCmp('str_CODE').getValue()
               
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                }else {
                    if(internal_url === url_services_transaction_numerocaisse + 'create'){
                        Ext.MessageBox.alert('Creation Numero Caisse', 'creation effectuee avec succes');
                        
                    }else{
                        Ext.MessageBox.alert('Modification Numero Caisse', 'modification effectuee avec succes');
                       
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