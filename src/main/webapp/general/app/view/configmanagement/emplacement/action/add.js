var url_services_transaction_emplacement = '../webservices/configmanagement/emplacement/ws_transaction.jsp?mode=';
var url_services_data_typedepot = '../webservices/configmanagement/typedepot/ws_data.jsp?mode=';
var Oview;
var Omode;
var Me;
var ref;
var type;
Ext.define('testextjs.view.configmanagement.emplacement.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addemplacement',
    id: 'addemplacementID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.view.configmanagement.emplacement.*'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        type: ''
    },
    initComponent: function () {

        Oview = this.getParentview();
        var itemsPerPage = 20;
        Omode = this.getMode();
        Me = this;
        type = this.getType();


        var store_typedepot = new Ext.data.Store({
            model: 'testextjs.model.TypeClient',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_typedepot,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        var form = new Ext.form.Panel({
            bodyPadding: 10,
            id: 'form_Emplacement',
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 140,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Informations sur l\'emplacement',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'fieldset',
                            collapsible: true,
                            layout: 'vbox',
                            title: 'Infos Emplacement',
                            defaultType: 'textfield',
                            defaults: {
                                anchor: '100%'
                            },
                            items: [{
                                    xtype: 'container',
                                    layout: 'hbox',
                                    defaultType: 'textfield',
                                    margin: '0 0 5 0',
                                    defaults: {
                                        anchor: '100%'
                                    },
                                    items: [
                                        {
                                            fieldLabel: 'Libelle',
                                            emptyText: 'Libelle',
                                            name: 'str_NAME_BIS',
                                            allowBlank: false,
                                            id: 'str_NAME_BIS'
                                        }, {
                                            fieldLabel: 'Designation',
                                            emptyText: 'Designation',
                                            name: 'str_DESCRIPTION',
                                            allowBlank: false,
                                            id: 'str_DESCRIPTION'
                                        }

                                    ]
                                },

                                {
                                    xtype: 'container',
                                    layout: 'hbox',
                                    defaultType: 'textfield',
                                    margin: '0 0 5 0',
                                    items: [
                                        {
                                            fieldLabel: 'M&ecirc;me.Emplacement',
                                            xtype: 'checkbox',
                                            emptyText: 'Designation',
                                            name: 'bool_SAME_LOCATION',
                                            id: 'bool_SAME_LOCATION'
                                        }

                                    ]
                                },

                                {
                                    xtype: 'container',
                                    layout: 'hbox',
                                    defaultType: 'textfield',
                                    margin: '0 0 5 0',
                                    items: [{
                                            fieldLabel: 'Situation geographique',
                                            emptyText: 'Situation geographique',
                                            name: 'str_LOCALITE',
                                            allowBlank: false,
                                            id: 'str_LOCALITE'
                                        },
                                        {
                                            xtype: 'combobox',
                                            fieldLabel: 'Type depot',
                                            name: 'lg_TYPEDEPOT_ID',
                                            id: 'lg_TYPEDEPOT_ID',
                                            store: store_typedepot,
                                            valueField: 'str_DESCRIPTION',
                                            displayField: 'str_DESCRIPTION',
                                            allowBlank: false,
                                            editable: false,
                                            queryMode: 'remote',
                                            emptyText: 'Choisir un type de depot...'
                                        }]
                                }
                            ]
                        }, {
                            xtype: 'fieldset',
                            collapsible: true,
                            layout: 'vbox',
                            title: 'Infos.Proprietaire',
                            defaultType: 'textfield',
                            defaults: {
                                anchor: '100%'
                            },
                            items: [{
                                    xtype: 'container',
                                    layout: 'hbox',
                                    defaultType: 'textfield',
                                    margin: '0 0 5 0',
                                    items: [
                                        {
                                            fieldLabel: 'Nom',
                                            emptyText: 'Nom',
                                            name: 'str_FIRST_NAME_BIS',
                                            allowBlank: false,
                                            id: 'str_FIRST_NAME_BIS'
                                        }, {
                                            fieldLabel: 'Prenom(s)',
                                            emptyText: 'Prenom(s)',
                                            name: 'str_LAST_NAME_BIS',
                                            allowBlank: false,
                                            id: 'str_LAST_NAME_BIS'
                                        }

                                    ]
                                }, {
                                    xtype: 'container',
                                    layout: 'hbox',
//                                    defaultType: 'textfield',
                                    margin: '0 0 5 0',
                                    
                                    items: [
                                       /* {
                                            xtype: "radiogroup",
                                            fieldLabel: "Sexe",
                                            id: 'str_SEXE',
//                                           
                                            allowBlank: false,
                                            margin: '0 255 0 0',
                                            vertical: true, columns: 1,
                                            items: [
                                                {boxLabel: "Masculin", name: "str_SEXE", inputValue: 'M'},
                                                {boxLabel: "F&eacute;minin", name: "str_SEXE", inputValue: 'F'}
                                            ]
                                        },*/

                                        {
                                            xtype: 'textfield',
                                            fieldLabel: 'Telephone',
                                            emptyText: 'Telephone',
                                            name: 'str_PHONE',
                                            allowBlank: false,
                                            id: 'str_PHONE'
                                        },
                                                /*{
                                                 xtype: 'radiogroup',
                                                 fieldLabel: 'Genre',
                                                 id: 'str_SEXEo',
                                                 name: 'str_SEXEo',
                                                 hidden: true,
                                                 items: [
                                                 {boxLabel: 'Feminin', name: 'str_SEXE', inputValue: 'F'},
                                                 {boxLabel: 'Masculin', name: 'str_SEXE', inputValue: 'M'}
                                                 ]
                                                 }*/]
                                }
                            ]
                        }
                    ]
                }]
        });



        //Initialisation des valeur


        if (Omode === "update") {

            ref = this.getOdatasource().lg_EMPLACEMENT_ID;

            Ext.getCmp('str_NAME_BIS').setValue(this.getOdatasource().str_NAME);
            Ext.getCmp('str_DESCRIPTION').setValue(this.getOdatasource().str_DESCRIPTION);
            Ext.getCmp('str_LOCALITE').setValue(this.getOdatasource().str_LOCALITE);
            Ext.getCmp('str_FIRST_NAME_BIS').setValue(this.getOdatasource().str_FIRST_NAME);
            Ext.getCmp('str_LAST_NAME_BIS').setValue(this.getOdatasource().str_LAST_NAME);
            Ext.getCmp('str_PHONE').setValue(this.getOdatasource().str_PHONE);
            Ext.getCmp('lg_TYPEDEPOT_ID').setValue(this.getOdatasource().lg_TYPEDEPOT_ID);
            Ext.getCmp('bool_SAME_LOCATION').setValue(this.getOdatasource().bool_SAME_LOCATION);

//            Ext.getCmp('str_SEXE').hide();

        }



        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: '65%',
            height: 400,
            minWidth: 300,
            minHeight: 200,
            maximizable: true,
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
        var form = Ext.getCmp('form_Emplacement');
        if (!form.isValid()) {
            Ext.Msg.alert('Message', "Formulaire invalide");
            return false;
        }
        var internal_url = "";
        var str_LAST_NAME = Ext.getCmp('str_LAST_NAME_BIS').getValue();
        var str_FIRST_NAME = Ext.getCmp('str_FIRST_NAME_BIS').getValue();
        var str_DESCRIPTION = Ext.getCmp('str_DESCRIPTION').getValue();


        if (Omode === "create") {

//            var str_SEXE = Ext.getCmp('str_SEXE').getValue();
//            var str_SEXE = "M";
            internal_url = url_services_transaction_emplacement + 'create';

        } else {

            internal_url = url_services_transaction_emplacement + 'update&lg_EMPLACEMENT_ID=' + ref;
        }



        Ext.Ajax.request({
            url: internal_url,
            params: {
                str_NAME: Ext.getCmp('str_NAME_BIS').getValue(),
                str_DESCRIPTION: str_DESCRIPTION,
                str_LAST_NAME: str_LAST_NAME,
                str_LOCALITE: Ext.getCmp('str_LOCALITE').getValue(),
                str_FIRST_NAME: str_FIRST_NAME,
                str_PHONE: Ext.getCmp('str_PHONE').getValue(),
                lg_TYPEDEPOT_ID: Ext.getCmp('lg_TYPEDEPOT_ID').getValue(),
//                str_SEXE: Ext.getCmp('str_SEXE').getValue(),
                bool_SAME_LOCATION: Ext.getCmp('bool_SAME_LOCATION').getValue()

            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                } else {
                    // 
                    if (Ext.getCmp('emplacementID') !== null) {
                        Ext.getCmp('emplacementID').getStore().load();
                    }


                    if (type == "emplacementmanager") {
                        // Oview.getStore().reload();
                        Ext.MessageBox.alert('Confirmation', object.errors);
                        Me_Workflow = Oview;
                        Me_Workflow.onRechClick();
                    } else if (type == "depot") {

                        var OGrid = Ext.getCmp('lg_EMPLACEMENT_ID');

                        OGrid.setValue(str_DESCRIPTION);
                        OGrid.getStore().reload();
//                        alert(str_DESCRIPTION);
                        Ext.getCmp('str_FIRST_NAME').setValue(str_FIRST_NAME);
                        Ext.getCmp('str_LAST_NAME').setValue(str_LAST_NAME);

                        Ext.getCmp('lg_USER_VENDEUR_ID').focus(true, 100, function () {
                            Ext.getCmp('lg_USER_VENDEUR_ID').selectText(0, 1);
                        });

                        if (Ext.getCmp('lg_TYPEDEPOT_ID') == "2" || Ext.getCmp('lg_TYPEDEPOT_ID') == "DEPOT EXTENSION") {
                            Ext.getCmp('reglementID').hide();
                            Ext.getCmp('lg_REMISE_ID').hide();
                            Ext.getCmp('btn_loturer').enable();
                        } else {
                            Ext.getCmp('reglementID').show();
                            Ext.getCmp('lg_REMISE_ID').show();
                            Ext.getCmp('btn_loturer').disable();
                        }
                    }

                }


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