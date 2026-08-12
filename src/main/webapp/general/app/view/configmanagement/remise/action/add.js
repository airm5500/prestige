var url_services_data_typeremise = '../webservices/configmanagement/typeremise/ws_data.jsp';
var url_services_data_remise = '../webservices/configmanagement/remise/ws_data.jsp';
var url_services_transaction_remise = '../webservices/configmanagement/remise/ws_transaction.jsp?mode=';
var url_services_data_grille_remise = '../webservices/configmanagement/grilleremise/ws_data.jsp';
var Oview;
var Omode;
var Me;
var ref;


Ext.define('testextjs.view.configmanagement.remise.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addremise',
    id: 'addremiseID',
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
    initComponent: function() {

        Oview = this.getParentview();


        Omode = this.getMode();

        Me = this;
        var itemsPerPage = 20;

        var store = new Ext.data.Store({
            model: 'testextjs.model.TypeRemise',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typeremise,
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
                    title: 'Informations Remise',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            fieldLabel: 'Code remise',
                            emptyText: 'CODE REMISE',
                            name: 'str_CODE',
                            maskRe: /[0-9.]/,
                            maxlength: '3',
                            allowBlank: false,
                            id: 'str_CODE'
                        }, {
                            fieldLabel: 'Libelle',
                            emptyText: 'LIBELLE',
                            id: 'str_NAME',
                            allowBlank: false,
                            name: 'str_NAME'
                        },
                        {
                            fieldLabel: 'Taux',
                            emptyText: 'Taux',
                            name: 'dbl_TAUX',
                            maskRe: /[0-9.]/,
                            maxlength: '3',
                            allowBlank: false,
                            hidden: true,
                            id: 'dbl_TAUX',
                            value: 1
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Indice de Securite',
                            name: 'str_IDS',
                            id: 'str_IDS',
                            store: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
                            valueField: 'str_IDS',
                            displayField: 'str_IDS',
//                            typeAhead: true,
                            editable: false,
                            allowBlank: false,
                            queryMode: 'local',
                            emptyText: 'Choisir un indice...'
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Type remise',
                            name: 'lg_TYPE_REMISE_ID',
                            id: 'lg_TYPE_REMISE_ID',
                            store: store,
                            valueField: 'str_DESCRIPTION',
                            displayField: 'str_DESCRIPTION',
//                            typeAhead: true,
                            editable: false,
                            queryMode: 'remote',
                            emptyText: 'Choisir un type remise...',
                            listeners: {
                                select: function(cmp) {
                                    var cmp_val = cmp.getValue();
                                    if(cmp_val == "Remise Client") {
                                        Ext.getCmp('dbl_TAUX').show();
                                    } else {
                                        Ext.getCmp('dbl_TAUX').hide();
                                    }
                                    Ext.getCmp('dbl_TAUX').setValue(1);
                                }
                            }
                        }]
                }]
        });



        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_REMISE_ID;

            Ext.getCmp('str_CODE').setValue(this.getOdatasource().str_CODE);
            Ext.getCmp('str_NAME').setValue(this.getOdatasource().str_NAME);
            Ext.getCmp('str_IDS').setValue(this.getOdatasource().str_IDS);
            Ext.getCmp('lg_TYPE_REMISE_ID').setValue(this.getOdatasource().lg_TYPE_REMISE_ID);
            Ext.getCmp('dbl_TAUX').setValue(this.getOdatasource().dbl_TAUX);
            if(this.getOdatasource().lg_TYPE_REMISE_ID == "Remise Client") {
                Ext.getCmp('dbl_TAUX').show();
            }
        }


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
                    handler: this.onbtnsave
                }, {
                    text: 'Annuler',
                    handler: function() {
                        win.close();
                    }
                }]
        });

    },
    onbtnsave: function(button) {
        var internal_url = "";
        if (Omode === "create") {
            internal_url = url_services_transaction_remise + 'create';
        } else {
            internal_url = url_services_transaction_remise + 'update&lg_REMISE_ID=' + ref;
        }
        var fenetre = button.up('window'),
                formulaire = fenetre.down('form');
        if (formulaire.isValid()) {
            testextjs.app.getController('App').ShowWaitingProcess();
            Ext.Ajax.request({
                url: internal_url,
                params: {
                    str_CODE: Ext.getCmp('str_CODE').getValue(),
                    str_NAME: Ext.getCmp('str_NAME').getValue(),
                    str_IDS: Ext.getCmp('str_IDS').getValue(),
                    lg_TYPE_REMISE_ID: Ext.getCmp('lg_TYPE_REMISE_ID').getValue(),
                    dbl_TAUX: Ext.getCmp('dbl_TAUX').getValue()
                },
                success: function(response)
                {
                    testextjs.app.getController('App').StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.success === 0) {
                        Ext.MessageBox.alert('Error Message', object.errors);
                        return;
                    } else {
                        Ext.MessageBox.alert('Confirmation', object.errors);
                        fenetre.close();
                        Me_Workflow = Oview;
                        Me_Workflow.getStore().reload();
                    }

                },
                failure: function(response)
                {
                    testextjs.app.getController('App').StopWaitingProcess();
                    var object = Ext.JSON.decode(response.responseText, false);
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('Error Message', response.responseText);

                }
            });

        } else {
            Ext.MessageBox.show({
                title: 'Echec',
                msg: 'Veuillez renseignez les champs obligatoires',
                height: 150,
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING
            });
        }


//        this.up('window').close();
    }
});
