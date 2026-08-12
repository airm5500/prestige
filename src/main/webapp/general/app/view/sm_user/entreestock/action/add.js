var url_services_data_entreestock = '../webservices/sm_user/entreestock/ws_data.jsp';
var url_services_transaction_entreestock= '../webservices/sm_user/entreestock/ws_transaction.jsp?mode=';
var url_services_data_produit = '../webservices/sm_user/famille/ws_data.jsp';

var  Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.sm_user.entreestock.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addwarehousestock',
    id: 'addwarehousestockID',

    requires: [
    'Ext.form.*',
    'Ext.window.Window',
    'testextjs.store.Statut'
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
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Famille',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_produit,
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
                labelWidth: 130,
                msgTarget: 'side'
            },

            items: [{
                xtype: 'fieldset',
                //   width: 55,
                title: 'Entree en Stock',
                defaultType: 'textfield',
                defaults: {
                    anchor: '100%'
                },
                items: [/*{
                    fieldLabel: 'Description',
                    emptyText: 'DESCRIPTION',
                    id: 'str_DESCRIPTION',
                    name: 'str_DESCRIPTION'
                },
                {
                    fieldLabel: 'Valeur',
                    emptyText: 'VALUE',
                    name: 'str_VALUE',
                    id:'str_VALUE'
                },
                {
                    fieldLabel: 'Key',
                    emptyText: 'KEY',
                    name: 'P_KEY',
                    id:'P_KEY'
                },
                {
                    fieldLabel: 'Statut',
                    emptyText: 'str_STATUT',
                    name: 'str_Status',
                    id:'str_Status'
                }


                /*,


                {
                    xtype: 'combobox',
                    fieldLabel: 'STATUT',
                    name: 'str_STATUT',
                    id: 'str_STATUT',
                    store: new testextjs.store.Statut({}),
                    valueField: 'str_KEY',
                    displayField: 'str_VALUE',
                    typeAhead: true,
                    queryMode: 'local',
                    emptyText: 'Choisir un statut...'
                }*/
                

                {
                    xtype: 'combobox',
                    fieldLabel: 'Produit',
                    name: 'lg_FAMILLE_ID',
                    id: 'lg_FAMILLE_ID',
                    store: store,
                    valueField: 'lg_FAMILLE_ID',
                    displayField: 'str_NAME',
                    typeAhead: true,
                    queryMode: 'remote',
                    emptyText: 'Choisir un produit...'
                },
//                {
//                    xtype: 'combobox',
//                    fieldLabel: 'lg_GROSSISTE_ID',
//                    name: 'lg_GROSSISTE_ID',
//                    id: 'lg_GROSSISTE_ID',
//                    store: store,
//                    valueField: 'lg_GROSSISTE_ID',
//                    displayField: 'str_NAME',
//                    typeAhead: true,
//                    queryMode: 'remote',
//                    emptyText: 'Choisir un produit...'
//                },
                {
                    fieldLabel: 'Quantite',
                    emptyText: 'Quantite',
                    name: 'int_NUMBER',
                    id:'int_NUMBER'
                },{
                    fieldLabel: 'Ref. Livraison',
                    emptyText: 'Ref. Livraison',
                    name: 'str_REF_LIVRAISON',
                    id:'str_REF_LIVRAISON'
                },{
                xtype: 'datefield',
                fieldLabel: 'Date Sortie Usine',
                name: 'dt_SORTIE_USINE',
                id: 'dt_SORTIE_USINE',
                allowBlank: false,
                maxValue: new Date()
            }, {
                xtype: 'datefield',
                fieldLabel: 'Date Peremption',
                name: 'dt_PEREMPTION',
                id: 'dt_PEREMPTION',
                minValue: new Date(),
                allowBlank: false
            }]
            }]
        });



        //Initialisation des valeur


        if(Omode === "update"){

            ref = this.getOdatasource().lg_WAREHOUSE_ID;
            Ext.getCmp('int_NUMBER').setValue(this.getOdatasource().int_NUMBER);
            Ext.getCmp('lg_FAMILLE_ID').setValue(this.getOdatasource().lg_FAMILLE_ID);
        /*  Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().str_DESCRIPTION);
            Ext.getCmp('str_VALUE').setValue(this.getOdatasource().str_VALUE);
            Ext.getCmp('P_KEY').setValue(this.getOdatasource().P_KEY);
            Ext.getCmp('str_Status').setValue(this.getOdatasource().str_Status);
            Ext.getCmp('int_PRIORITY').setValue(this.getOdatasource().int_PRIORITY);*/



        }



        var win =  new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 520,
            height:200,
            minWidth: 300,
            minHeight: 350,
            layout: 'fit',
            plain: true,
            items: form,

            buttons: [{
                text: 'Enregistrer',
                handler:  this.onbtnsave
            },{
                text: 'Annuler',
                handler:function (){
                    win.close()
                }
            }]
        });

    },
    onbtnsave:function(){

        var internal_url ="";



        if(Omode === "create"){
            internal_url = url_services_transaction_entreestock+'create';
        }else{
            internal_url = url_services_transaction_entreestock+'update&lg_WAREHOUSE_ID='+ref;
        }



        Ext.Ajax.request({
            url: internal_url,
            params: {
              lg_FAMILLE_ID : Ext.getCmp('lg_FAMILLE_ID').getValue(),
                int_NUMBER : Ext.getCmp('int_NUMBER').getValue()


            },
            success: function(response)
            {
                var object = Ext.JSON.decode(response.responseText,false);
                if(object.success == 0){
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
});