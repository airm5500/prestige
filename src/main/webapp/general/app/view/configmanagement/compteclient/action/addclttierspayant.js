/* global Ext */

var url_services_data_tierspayant = '../webservices/tierspayantmanagement/tierspayant/ws_data.jsp';
var url_services_transaction_client_addcompteclttierpayant = '../webservices/configmanagement/compteclienttierspayant/ws_transaction_clt.jsp?mode=';
// REST dedie (memes regles metier que la JSP ci-dessus)
var url_rest_transaction_client_tierspayants = '../api/v1/client/gestion/tiers-payants/';

var lg_COMPTE_CLIENT_ID;
var isStandardClient;
var lg_TYPE_CLIENT_ID;
Ext.define('testextjs.view.configmanagement.compteclient.action.addclttierspayant', {
    extend: 'Ext.window.Window',
    xtype: 'addcompteclient',
    id: 'addcompteclientID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.AyantDroit',
        'testextjs.model.CategorieAyantdroit',
        'testextjs.model.Risque',
        'testextjs.view.configmanagement.client.*'
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
        var itemsPerPage = 20;
isStandardClient=false;
lg_TYPE_CLIENT_ID="";
//store_categorie_client
        lg_COMPTE_CLIENT_ID = this.getOdatasource().lg_COMPTE_CLIENT_ID;
        if(this.getOdatasource().isAstandardClient!==undefined && this.getOdatasource().isAstandardClient!==null){
          isStandardClient=this.getOdatasource().isAstandardClient; 
          lg_TYPE_CLIENT_ID=this.getOdatasource().lg_TYPE_CLIENT_ID;
        }
      
       
        // alert("lg_COMPTE_CLIENT_ID "+lg_COMPTE_CLIENT_ID);
        var store_tierspayant = new Ext.data.Store({
            model: 'testextjs.model.TiersPayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_tierspayant,
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
                    title: 'Information Tiers payant',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        // str_CODE
                        {
                            /*xtype: 'fieldset',
                             title: 'Infos.Generales.Tiers payants',
                             id: 'InfoGleTiersPayantID',
                             defaultType: 'textfield',
                             defaults: {
                             anchor: '100%'
                             },
                             items: [
                             {*/
                            xtype: 'combobox',
                            fieldLabel: 'Tiers payant',
                            name: 'lg_TIERS_PAYANT_ID',
                            id: 'lg_TIERS_PAYANT_ID',
                            store: store_tierspayant,
                            valueField: 'str_FULLNAME',
                            pageSize: 20, //ajout la barre de pagination
                            displayField: 'str_FULLNAME',
                            typeAhead: true,
                            allowBlank: false,
                            queryMode: 'remote',
                            minChars: 3,
                            emptyText: 'Choisir un tiers payant...',
                            listeners: {
                                specialKey: function(field, e) {
                                    if (e.getKey() === e.BACKSPACE || e.getKey() === 46 || e.getKey() == 8) {
                                        if (field.getValue().length == 1) {
                                            field.getStore().load();
                                        }
                                    }

                                }
                            }
                        },
                        {
                            fieldLabel: 'Pourcentage',
                            emptyText: 'Pourcentage',
                            name: 'int_POURCENTAGE',
                            id: 'int_POURCENTAGE',
                            //value: 0,
                            xtype: 'numberfield',
                            allowBlank: false,
                            regex: /[0-9.]/,
                            minValue: 1,
                            maxValue: 100
                        },
                        {
                            fieldLabel: 'Matricule/ SS',
                            emptyText: 'NUMERO MATRICULE',
                            name: 'str_NUMERO_SECURITE_SOCIAL',
                            id: 'str_NUMERO_SECURITE_SOCIAL'
                        },
                        {
                            name: 'dbl_PLAFOND',
                            id: 'dbl_PLAFOND',
                            fieldLabel: 'Plafond Vente',
                            value: 0,
                            selectOnFocus: true,
                            emptyText: 'Plafond Vente',
                            maskRe: /[0-9.]/
                        }, 
                        
                         {

                            xtype: 'container',
                            layout: 'hbox',

                            items: [{
                                    xtype: 'displayfield',
                                    margin: 2,
                                    value: 'Plafond sur encours',
                                    flex: 1.2
                                },

                                {
                                    xtype: 'textfield',
                                    name: 'db_PLAFOND_ENCOURS',
                                    id: 'db_PLAFOND_ENCOURS',
                                    margin: 2,
                                    emptyText: 'Plafond sur encours',
                                    value: 0,
                                    selectOnFocus: true,
                                    maskRe: /[0-9.]/,
                                    flex:1
                                }, {
                                    xtype: 'checkbox',
                                    margin: 2,
                                    name: 'b_IsAbsolute',
                                    checked: false,
                                    id: 'b_IsAbsolute',
                                    boxLabel:'Le plafond est-il absolu ?',
                                    flex:2
                                }/*,
                                {
                                    xtype: 'displayfield',
                                    margin: 2,
                                     labelAlign: 'right',
                                    value: 'Le plafond est-il absolu ?',
                                    flex: 1.6
                                }*/
                            
                            
                            ]
                        },
                    
                        {
                            fieldLabel: 'Priorite.Regime',
                            emptyText: 'Priorite.Regime',
                            name: 'int_PRIORITY',
                            id: 'int_PRIORITY',
                            value: 1,
                            xtype: 'numberfield',
                            allowBlank: false,
                            regex: /[0-9.]/,
                            minValue: 1,
                            maxValue: 4
                        }

                        /* ]
                         }*/
                    ]
                }]
        });
        //Initialisation des valeur


        if (Omode === "update") {
            ref = this.getOdatasource().lg_COMPTE_CLIENT_TIERS_PAYANT_ID;
            Ext.getCmp('lg_TIERS_PAYANT_ID').setValue(this.getOdatasource().lg_TIERS_PAYANT_ID);
            Ext.getCmp('int_POURCENTAGE').setValue(this.getOdatasource().int_POURCENTAGE);
            Ext.getCmp('db_PLAFOND_ENCOURS').setValue(this.getOdatasource().db_PLAFOND_ENCOURS);
            Ext.getCmp('int_PRIORITY').setValue(this.getOdatasource().int_PRIORITY);
            Ext.getCmp('lg_TIERS_PAYANT_ID').hide();
            Ext.getCmp('str_NUMERO_SECURITE_SOCIAL').setValue(this.getOdatasource().str_NUMERO_SECURITE_SOCIAL);
            Ext.getCmp('dbl_PLAFOND').setValue(this.getOdatasource().dbl_PLAFOND);
            console.log(this.getOdatasource());
             Ext.getCmp('b_IsAbsolute').setValue(this.getOdatasource().b_IsAbsolute);
           
            
            
        }



        var win = new Ext.window.Window({
            modal: true,
            autoShow: true,
            title: this.getTitre(),
            width: 600,
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
                    text: 'Retour',
                    handler: function () {
                        win.close();
                    }
                }]
        });
    },
   onbtnsave: function (button) {

        var internal_url = "";
 var fenetre = button.up('window'),
                formulaire = fenetre.down('form');
        if (formulaire.isValid()) {
            if (Omode === "create" || Omode === "createtierspayantByclt") {
                internal_url = url_rest_transaction_client_tierspayants + 'create';
                if(isStandardClient){
                  internal_url= url_rest_transaction_client_tierspayants + 'create-standard';
                }
            } else {
                internal_url = url_rest_transaction_client_tierspayants + 'update';
            }
            // alert("Omode "+Omode + " lg_COMPTE_CLIENT_ID "+lg_COMPTE_CLIENT_ID + " " + Ext.getCmp('lg_TIERS_PAYANT_ID').getValue());
            testextjs.app.getController('App').ShowWaitingProcess();
           Ext.Ajax.request({
                url: internal_url,
                method: 'POST',
                params: {
                    // Identifiants passes en parametres de formulaire (la JSP les recevait dans l'URL)
                    lg_COMPTE_CLIENT_TIERS_PAYANT_ID: (Omode === "create" || Omode === "createtierspayantByclt") ? '' : ref,
                    lg_TYPE_CLIENT_ID: isStandardClient ? lg_TYPE_CLIENT_ID : '',
                    lg_TIERS_PAYANT_ID: Ext.getCmp('lg_TIERS_PAYANT_ID').getValue(),
                    int_POURCENTAGE: Ext.getCmp('int_POURCENTAGE').getValue(),
                    int_PRIORITY: Ext.getCmp('int_PRIORITY').getValue(),
                    db_PLAFOND_ENCOURS: Ext.getCmp('db_PLAFOND_ENCOURS').getValue(),
                    dbl_PLAFOND: Ext.getCmp('dbl_PLAFOND').getValue(),
                    str_NUMERO_SECURITE_SOCIAL: Ext.getCmp('str_NUMERO_SECURITE_SOCIAL').getValue(),
                    lg_COMPTE_CLIENT_ID: lg_COMPTE_CLIENT_ID,
                   b_IsAbsolute:Ext.getCmp('b_IsAbsolute').getValue(),
                   modeupdate:true// mis pour la modification du plafond du RC1
                },
                success: function (response)
                {
                    testextjs.app.getController('App').StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.success == "0") {
                        Ext.MessageBox.alert('Infos Message', object.errors);
                        return;
                    } else {
                        
                        Ext.MessageBox.alert('Confirmation', object.errors);
                        var OGrid = Ext.getCmp('CltgridpanelID');
                        OGrid.getStore().reload();
                        Me_Workflow_Detail = Oview;
                       
                        if(Ext.getCmp('lg_TYPE_CLIENT_ID')!==null && Ext.getCmp('lg_TYPE_CLIENT_ID')!==undefined){
                          Ext.getCmp('lg_TYPE_CLIENT_ID').setValue('0');  
                        }
                        fenetre.close();
                    }
                     
                },
                failure: function (response)
                {
                    //alert("echec");
                    var object = Ext.JSON.decode(response.responseText, false);
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('  Message', response.responseText);
                }
            });
        }  else {
            Ext.MessageBox.show({
                title: 'Attention',
                msg:'Veuillez renseignez les champs obligatoires',
               // width: 300,
                height:150,
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING
            });
        }

       

       
    }
});


