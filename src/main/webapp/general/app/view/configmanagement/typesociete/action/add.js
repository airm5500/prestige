var url_services_data_typesociete = '../webservices/configmanagement/typesociete/ws_data.jsp';
var url_services_data_escomptesociete = '../webservices/configmanagement/escomptesociete/ws_data.jsp';
var url_services_transaction_typesociete = '../webservices/configmanagement/typesociete/ws_transaction.jsp?mode=';
var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.configmanagement.typesociete.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addtypesociete',
    id: 'addtypesocieteID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',        
        'testextjs.model.TypeSociete'
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
        var storeescomptesociete = new Ext.data.Store({            
            model: 'testextjs.model.EscompteSociete',           
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_escomptesociete,
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
                labelWidth: 150,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    //   width: 55,
                    title: 'Information Type Societe',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            fieldLabel: 'Code type societe',
                            emptyText: 'Code type societe',
                            name: 'str_CODE_TYPE_SOCIETE',
                            id: 'str_CODE_TYPE_SOCIETE'
                        }, {
                            fieldLabel: 'Libelle type societe',
                            emptyText: 'Libelle type societe',
                            name: 'str_LIBELLE_TYPE_SOCIETE',
                            id: 'str_LIBELLE_TYPE_SOCIETE'
                        }/*,
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Escompte societe',
                            name: 'lg_ESCOMPTE_SOCIETE_ID',
                            id: 'lg_ESCOMPTE_SOCIETE_ID',
                            store: storeescomptesociete,
                            valueField: 'lg_ESCOMPTE_SOCIETE_ID',
                            displayField: 'str_LIBELLE_ESCOMPTE_SOCIETE',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir une escompte societe...'
                        } */        
                    ]
                }]
        });


        if (Omode == "update") {

            ref = this.getOdatasource().lg_TYPE_SOCIETE;

            Ext.getCmp('str_CODE_TYPE_SOCIETE').setValue(this.getOdatasource().str_CODE_TYPE_SOCIETE);
            Ext.getCmp('str_LIBELLE_TYPE_SOCIETE').setValue(this.getOdatasource().str_LIBELLE_TYPE_SOCIETE);
            Ext.getCmp('lg_ESCOMPTE_SOCIETE_ID').setValue(this.getOdatasource().lg_ESCOMPTE_SOCIETE_ID);
        }

        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 400,
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


        if (Omode == "create") {
            
            internal_url = url_services_transaction_typesociete + 'create';

        } else {
           
            internal_url = url_services_transaction_typesociete + 'update&lg_TYPE_SOCIETE=' + ref;
        }

        

        Ext.Ajax.request({
            url: internal_url,
            params: {
                
                str_CODE_TYPE_SOCIETE: Ext.getCmp('str_CODE_TYPE_SOCIETE').getValue(),
                str_LIBELLE_TYPE_SOCIETE: Ext.getCmp('str_LIBELLE_TYPE_SOCIETE').getValue(),               
                lg_ESCOMPTE_SOCIETE_ID: Ext.getCmp('lg_ESCOMPTE_SOCIETE_ID').getValue()               
            },
            success: function (response)
            {
                //alert("succes");
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
                    Ext.MessageBox.alert('Confirmation', object.errors);
                }
                Oview.getStore().reload();

            },
            failure: function (response)
            {
                //alert("echec");
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });

        this.up('window').close();
    }
});