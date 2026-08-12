

/* global Ext */
var Me;
var selectedBLs;
var selectedBL;
var selected_reglement_type = "";
var dt_DATE_REGLEMENT;
var int_VALEUR_MONTANT_REGLE;
var int_VALEUR_MONTANT_RESTANT;
var str_STATUS;
var url_services_bon_livraison_transaction = '../webservices/commandemanagement/bonlivraison/ws_transaction2.jsp';
var win;
Ext.define('testextjs.view.commandemanagement.etats.action.paybls', {
    extend: 'Ext.window.Window',
    xtype: 'paybls',
    id: 'payblID',
    require: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*'
    ],
    config: {
        titre: '',
        selectedBLs: '',
        selectedBL: ''

    },
    frame: true,
//    collapsible: true,
    animCollapse: false,
    title: 'Réglement de Bons de Livraison',
    initComponent: function () {

        Me = this;
        selectedBLs = this.getSelectedBLs();
        selectedBL = this.getSelectedBL();
        var store_type_reglement = new Ext.data.Store({
            autoLoad: true,
            fields: ['value', 'name'],
            data: [
                {"value": "0", "name": "NON REGLE"},
                {"value": "1", "name": "REGLE EN PARTIE"},
                {"value": "2", "name": "REGLE TOTALEMENT"}
            ]
        });
        
        var int_MONTANT_REGLE = new Ext.form.field.Text({
            fieldLabel: 'Montant Règlé',
            name: 'int_MONTANT_REGLE',
            id: 'int_MONTANT_REGLE',
            emptyText: 'Montant Règlé',
            hidden: true
        });

        var dt_REGLEMENT_DATE_FIELD = new Ext.form.field.Date({
            fieldLabel: 'Date du Règlement:',
            allowBlank: false,
            submitFormat: 'Y-m-d',
            format: 'd/m/Y',
            flex: 1,
            hidden: true,
            name: 'dt_REGLEMENT_DATE_FIELD',
            id: 'dt_REGLEMENT_DATE_FIELD',
            //minValue: new Date(),
            listener: {
                change: function (me) {
                    //Ext.getCmp('dt_START_DATE_ID').setMaxValue(me.getValue());
                }
            }
        });

        var str_TYPE_REGLEMENT = new Ext.form.field.ComboBox({
            fieldLabel: 'Type de Règlement',
            id: 'str_TYPE_REGLEMENT',
            name: 'str_TYPE_REGLEMENT',
            store: store_type_reglement,
            emptyText: 'Séléctionner un type de règlement',
            width: 300,
            valueField: 'value',
            displayField: 'name',
            typeAhead: true,
            queryMode: 'local',
            listeners: {
                select: function (cmp) {
                    selected_reglement_type = cmp.getValue();
                    if (selected_reglement_type === "0") {
                        STATUS = 'NON REGLE';
                        Ext.getCmp('int_MONTANT_REGLE').hide();
                        Ext.getCmp('dt_REGLEMENT_DATE_FIELD').hide();
                    } else if (selected_reglement_type === "1") {     
                        Ext.getCmp('dt_REGLEMENT_DATE_FIELD').show();
                        Ext.getCmp('int_MONTANT_REGLE').show();
                        STATUS = 'REGLE EN PARTIE';
                        //int_VALEUR_MONTANT_RESTANT = Number(Ext.getCmp('int_MONTANT_RESTANT').getValue());
                        int_VALEUR_MONTANT_REGLE = Number(Ext.getCmp('int_MONTANT_REGLE').getValue());
                        dt_DATE_REGLEMENT = Ext.getCmp('dt_REGLEMENT_DATE_FIELD').getSubmitValue();
                    } else {
                        Ext.getCmp('dt_REGLEMENT_DATE_FIELD').show();
                        Ext.getCmp('int_MONTANT_REGLE').hide();
                        Ext.getCmp('int_MONTANT_RESTANT').hide();
                        STATUS = 'REGLE';
                        int_VALEUR_MONTANT_RESTANT = Number(Ext.getCmp('int_MONTANT_RESTANT').getValue());
                        int_VALEUR_MONTANT_REGLE = Number(Ext.getCmp('int_MONTANT_REGLE').getValue());
                        dt_DATE_REGLEMENT = Ext.getCmp('dt_REGLEMENT_DATE_FIELD').getSubmitValue();
                    }
                }
//                'render': function (cmp) {
//                    cmp.getEl().on('keypress', function (e) {
//                        if (e.getKey() === e.ENTER) {
//
//                        }
//                    });
//                }
            }
        });

        

//        var int_MONTANT_RESTANT = new Ext.form.field.Text({
//            fieldLabel: 'Montant Restant',
//            name: 'int_MONTANT_RESTANT',
//            id: 'int_MONTANT_RESTANT',
//            emptyText: 'Montant Restant',
//            hidden: true
//        });

        var form = new Ext.form.Panel({
            bodyPadding: 10,
            width: '100%',
            fieldDefaults: {
                labelAlign: 'left',
                labelWidth: 140,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Informations du règlement',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [dt_REGLEMENT_DATE_FIELD, str_TYPE_REGLEMENT, int_MONTANT_REGLE]
                }
            ]
        });

         win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 650,
            //autoHeight: true,
            height: 400,
            minWidth: 200,
            id: 'windowBL',
//            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: "Valider",
                    //disabled: true,
                    id: 'status_save_btn',
                    handler: this.onbtnsave
                }, {
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }]

        });
    },
    
    onbtnsave: function(){
       var lg_BON_LIVRAISON_ID = selectedBL.get('lg_BON_LIVRAISON_ID'); 
       //console.log("lg_BON_LIVRAISON_ID: ", lg_BON_LIVRAISON_ID,", int_VALEUR_MONTANT_REGLE ", int_VALEUR_MONTANT_REGLE);
       var params = {};
       params['lg_BON_LIVRAISON_ID'] = lg_BON_LIVRAISON_ID;
       params['mode'] = 'reglement';
       params['STATUS'] = STATUS;
       
       if(STATUS === 'REGLE'){         
          params['dt_DATE_REGLEMENT'] = dt_DATE_REGLEMENT;
       }
       if(STATUS === 'REGLE EN PARTIE'){
          params['lg_BON_LIVRAISON_ID'] = lg_BON_LIVRAISON_ID; 
          params['dt_DATE_REGLEMENT'] = dt_DATE_REGLEMENT;
          params['int_MONTANT_REGLE'] = int_VALEUR_MONTANT_REGLE;
       }
       
       Ext.Ajax.request({
           url: url_services_bon_livraison_transaction,
           params: params,
           success: function(response){
               var decodedResponse = Ext.JSON.decode(response.responseText);
               Me.processReglementResponse(decodedResponse);
           }, 
           failure: function(error){
               console.error(error);
           }
       });
    }
,
    processReglementResponse: function(response){
        //console.log("Response: ", response);
        if(response.success === true){
            Ext.MessageBox.show({
                title: 'Règlement de BL',
                width: 450,
                msg: 'Marquage effectué avec succès',
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.SUCC,
                fn: function (btn) {
                    Ext.getCmp('windowBL').close();
                    //btn.up('window').close();
                    //win.close();
                }
            });
        }else{
            Ext.MessageBox.show({
                title: 'Règlement de BL',
                width: 450,
                msg: 'Une erreur est survenue lors du marquage',
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.ERROR,
                fn: function (btn) {
                    Ext.getCmp('windowBL').close();
//                    btn.up('window').close();
//                    win.close();
                }
            });
        }
    }
});