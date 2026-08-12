var url_services_data_risque = '../webservices/configmanagement/risque/ws_data.jsp';
//var url_services_data_grouperisque = '../webservices/configmanagement/groupefamille/ws_data.jsp';
var url_services_data_typerisque = "../webservices/configmanagement/typerisque/ws_data.jsp";
var url_services_transaction_risque = '../webservices/configmanagement/risque/ws_transaction.jsp?mode=';
var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.configmanagement.risque.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addrisque',
    id: 'addrisqueID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.Grossiste',
        'testextjs.model.GroupeFamille'
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



        var itemsPerPage = 20;
//        var storegrossiste = new Ext.data.Store({
//            model: 'testextjs.model.Grossiste',
//            pageSize: itemsPerPage,
//            autoLoad: false,
//            proxy: {
//                type: 'ajax',
//                url: url_services_data_grossiste,
//                reader: {
//                    type: 'json',
//                    root: 'results',
//                    totalProperty: 'total'
//                }
//            }
//
//        });
        var storetyperisque = new Ext.data.Store({
            model: 'testextjs.model.Typerisque',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typerisque,
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
                labelWidth: 115,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    //   width: 55,
                    title: 'Information risque',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            fieldLabel: 'Code risque',
                            emptyText: 'Code risque',
                            name: 'str_CODE_RISQUE',
                            id: 'str_CODE_RISQUE',
                            maskRe: /[0-9.]/,
                            flex: 1,
                            allowBlank: false
                        }, 
                        {
                            fieldLabel: 'Libelle',
                            emptyText: 'Libelle',
                            name: 'str_LIBELLE_RISQUE',
                            id: 'str_LIBELLE_RISQUE',
                            flex: 1,
                            allowBlank: false
                        },
                        {
                            fieldLabel: 'Risque officiel',
                            emptyText: 'Risque officiel',
                            name: 'str_RISQUE_OFFICIEL',
                            id: 'str_RISQUE_OFFICIEL',
                            flex: 1,
                            allowBlank: false
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Type risque',
                            name: 'lg_TYPERISQUE_ID',
                            id: 'lg_TYPERISQUE_ID',
                            store: storetyperisque,
                            valueField: 'lg_TYPERISQUE_ID',
                            displayField: 'str_NAME',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un type risque...'
                         }            
                    ]
                }]
        });

        //Initialisation des valeur

        if (Omode === "update") {

            ref = this.getOdatasource().lg_RISQUE_ID;

            Ext.getCmp('str_CODE_RISQUE').setValue(this.getOdatasource().str_CODE_RISQUE);
            Ext.getCmp('str_LIBELLE_RISQUE').setValue(this.getOdatasource().str_LIBELLE_RISQUE);
            Ext.getCmp('str_RISQUE_OFFICIEL').setValue(this.getOdatasource().str_RISQUE_OFFICIEL);
            Ext.getCmp('lg_TYPERISQUE_ID').setValue(this.getOdatasource().lg_TYPERISQUE_ID);
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


        if (Omode === "create") {
            //alert("create");
            internal_url = url_services_transaction_risque + 'create';

        } else {
            //alert("update");
            internal_url = url_services_transaction_risque + 'update&lg_RISQUE_ID=' + ref;
        }

        //alert(internal_url);

        Ext.Ajax.request({
            url: internal_url,
            params: {

                str_CODE_RISQUE: Ext.getCmp('str_CODE_RISQUE').getValue(),
                str_LIBELLE_RISQUE: Ext.getCmp('str_LIBELLE_RISQUE').getValue(),
                lg_TYPERISQUE_ID: Ext.getCmp('lg_TYPERISQUE_ID').getValue(),
                str_RISQUE_OFFICIEL: Ext.getCmp('str_RISQUE_OFFICIEL').getValue()
            },
            success: function (response)
            {
                //alert("succes");
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                }else {
                    if(internal_url === url_services_transaction_risque + 'create'){
                        Ext.MessageBox.alert('Creation risque', 'creation effectuee avec succes');
                        
                    }else{
                        Ext.MessageBox.alert('Modification risque', 'modification effectuee avec succes');
                       
                    }                                     
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