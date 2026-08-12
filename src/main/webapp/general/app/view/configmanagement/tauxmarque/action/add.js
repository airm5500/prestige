var url_services_data_tauxmarque = '../webservices/configmanagement/tauxmarque/ws_data.jsp';
var url_services_transaction_tauxmarque = '../webservices/configmanagement/tauxmarque/ws_transaction.jsp?mode=';
var Oview;
var Omode;
var Me;
var ref;

Ext.define('testextjs.view.configmanagement.tauxmarque.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addtauxmarque',
    id: 'addtauxmarqueID',
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
                    title: 'Informations taux de Marque',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            fieldLabel: 'Code taux de Marque',
                            emptyText: 'Code taux de Marque',
                            name: 'str_CODE',
                            //maskRe: /[0-9.]/,
                            allowBlank: false,
                            id: 'str_CODE'
                        },{
                            fieldLabel: 'taux de Marque',
                            emptyText: 'taux de Marque',
                            name: 'str_NAME',
                            allowBlank: false,
                            id: 'str_NAME'
                        }
                      
                    ]
                }]
        });



        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_TAUX_MARQUE_ID;
            
            Ext.getCmp('str_NAME').setValue(this.getOdatasource().str_NAME);            
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
            
            internal_url = url_services_transaction_tauxmarque + 'create';

        } else {
           
            internal_url = url_services_transaction_tauxmarque + 'update&lg_TAUX_MARQUE_ID=' + ref;
        }



        Ext.Ajax.request({
            url: internal_url,
            params: {
                
                str_NAME: Ext.getCmp('str_NAME').getValue(),             
                str_CODE: Ext.getCmp('str_CODE').getValue()
               
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                }else {
                    if(internal_url === url_services_transaction_tauxmarque + 'create'){
                        Ext.MessageBox.alert('Creation tauxmarque', 'creation effectuee avec succes');
                        
                    }else{
                        Ext.MessageBox.alert('Modification tauxmarque', 'modification effectuee avec succes');
                       
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