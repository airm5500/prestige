/* global Ext */

var Oview;
var Omode;
var Me;
var ref;
var montantachat;
var lgBONLIVRAISONID='';
Ext.define('testextjs.view.commandemanagement.cmde_passees.action.edit', {
    extend: 'Ext.window.Window',

    requires: [ 
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.Grossiste'
    ],
    config: {
        odatasource: '',
        idOrder: '',
        montantachat: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function () {

        Oview = this.getParentview();
           

        Omode = this.getMode();
        var Oodatasource = this.getOdatasource();lgBONLIVRAISONID=Oodatasource.lg_BON_LIVRAISON_ID;
       
        
        
        
        //alert("idOrder 2  " + idOrder);
        Me = this;
        var storerepartiteur = new Ext.data.Store({
            model: 'testextjs.model.Grossiste',
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../webservices/configmanagement/grossiste/ws_data.jsp',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 240000
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
                    title: 'Saisie du bon de livraison',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                       {
                            xtype: 'displayfield',
                            fieldLabel: 'REF CMD:',
                            name: 'str_REF_',
                            id: 'str_REF_',
                            fieldStyle: "color:blue;",
                            value: "0"
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Repartiteur',
                            allowBlank: false,
                            name: 'lgGROSSISTEIDEDIT',
                            margin: '5 15 0 0',
                            id: 'lgGROSSISTEIDEDIT',
                            store: storerepartiteur,
                            valueField: 'lg_GROSSISTE_ID',
                            displayField: 'str_LIBELLE',
                            
                            pageSize: 20,
                            queryMode: 'remote',
                            // width: 450,
                            emptyText: 'Choisir un repartiteur...'


                        },

                       
                        {
                            fieldLabel: 'REF BL',
                            emptyText: 'REF BL',
                            name: 'str_REF_LIVRAISON',
                            allowBlank: false,
                            id: 'str_REF_LIVRAISON'
                        },
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Date BL',
                            name: 'dt_DATE_LIVRAISON',
                            id: 'dt_DATE_LIVRAISON',
                            //submitFormat: 'Y/m/d',
                            submitFormat: 'Y-m-d',
                            allowBlank: false,
                            maxValue: new Date()

                        },
                        {
                            fieldLabel: 'Montant Hors Taxe',
                            emptyText: 'Montant Hors Taxe',
                            name: 'int_MHT',
                            allowBlank: false,
                            id: 'int_MHT',
                            maskRe: /[0-9.]/,
                            minValue: 0
                        },
                        {
                            fieldLabel: 'Montant TVA',
                            emptyText: 'Montant TVA',
                            name: 'int_TVA',
                            allowBlank: false,
                            id: 'int_TVA',
                            maskRe: /[0-9.]/,
                            minValue: 0
                        }
                    ]
                }]
        });
        Ext.getCmp('lgGROSSISTEIDEDIT').setValue(Oodatasource.str_LIBELLE);
        Ext.getCmp('str_REF_').setValue(Oodatasource.str_ORDER_REF);
        Ext.getCmp('str_REF_LIVRAISON').setValue(Oodatasource.str_BL_REF);
        Ext.getCmp('dt_DATE_LIVRAISON').setValue(Oodatasource.dt_DATE_LIVRAISON);
        Ext.getCmp('int_MHT').setValue(Oodatasource.int_ORDER_PRICE);
        Ext.getCmp('int_TVA').setValue(Oodatasource.int_TVA);



        //Initialisation des valeur

        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 320,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Enregistrer',
                    handler: this.onbtncreerbl
//                    handler: this.onbtnsave
                }, {
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }]
        });

    },
    
    onbtncreerbl: function (button) {
        var today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth() + 1; //January is 0!
        var yyyy = today.getFullYear();

        if (dd < 10) {
            dd = '0' + dd;
        }

        if (mm < 10) {
            mm = '0' + mm;
        }
        today = yyyy + '/' + mm + '/' + dd;



        var int_TVA = 0;
        var str_REF_LIVRAISON = Ext.getCmp('str_REF_LIVRAISON').getValue();
        var dt_DATE_LIVRAISON = Ext.getCmp('dt_DATE_LIVRAISON').getSubmitValue();
        var int_MHT = Ext.getCmp('int_MHT').getValue();
        if (Ext.getCmp('int_TVA').getValue() != null) {
            int_TVA = Ext.getCmp('int_TVA').getValue();
        }

        //var int_HTTC = Ext.getCmp('int_HTTC').getValue();

        //  alert("str_REF_LIVRAISON "+str_REF_LIVRAISON);
        if (str_REF_LIVRAISON === "" || dt_DATE_LIVRAISON === "" || int_MHT === "" || int_TVA === "") {
            Ext.MessageBox.alert('VALIDATION', 'Veuillez renseigner les champs vides svp!');
            return;
        }

        if (dt_DATE_LIVRAISON > today) {
            Ext.MessageBox.alert('Erreur au niveau date', 'La date de livraison doit &ecirc;tre inf&eacute;rieur &agrave; ou &eacute;gale la date du jour');
            return;
        }

        testextjs.app.getController('App').ShowWaitingProcess();
        Ext.Ajax.request({
            timeout: 240000,
            url: '../webservices/commandemanagement/bonlivraison/ws_update.jsp',
            params: {
                mode: 'updateBL',
                lgBONLIVRAISONID: lgBONLIVRAISONID,
                dt_DATE_LIVRAISON: dt_DATE_LIVRAISON,
                int_MHT: int_MHT,
                int_TVA: int_TVA,
                str_REF:str_REF_LIVRAISON,
                lgGROSSISTEIDEDIT:Ext.getCmp('lgGROSSISTEIDEDIT').getValue()

            },
            success: function (response)
            {
                testextjs.app.getController('App').StopWaitingProcess();
                console.log('response',response);
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.status === 0) {
                    Ext.MessageBox.alert('Error Message', object.message);
                     return;
                } else {
                    Ext.MessageBox.alert('confirmation', object.message);
                    
                    Oview.getStore().load();
                    
                    var bouton = button.up('window').close();

                }

            },
            failure: function (response)
            {
                testextjs.app.getController('App').StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });




    }
});
