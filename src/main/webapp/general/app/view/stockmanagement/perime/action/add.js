var url_services_transaction_perime = '../webservices/stockmanagement/perime/ws_transaction.jsp?mode=';
var url_services_data_famille = '../webservices/sm_user/famille/ws_data_other.jsp';

var Oview;
var Omode;
var Me;
var ref;

//var str_SORTIE_USINE;
//var str_PEREMPTION;


Ext.define('testextjs.view.stockmanagement.perime.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addperime',
    id: 'addperimeID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        reference: ''
    },
    initComponent: function () {

        Oview = this.getParentview();
        Omode = this.getMode();


        Me = this;
        var itemsPerPage = 20;
        
        var store_famille = new Ext.data.Store({
            model: 'testextjs.model.Famille',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_famille,
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
                    title: 'Information sur le produit',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Article',
                            name: 'lgFAMILLEID',
                            id: 'lgFAMILLEID',
                            store: store_famille,
                            valueField: 'lg_FAMILLE_ID',
                            pageSize: 20, //ajout la barre de pagination
                            displayField: 'str_DESCRIPTION',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un article...',
                            listeners: {
                                change: function () {
                                    Me.onfiltercheck();
                                }
                            }
                        },
                        {
                            fieldLabel: 'Quantite',
                            emptyText: 'Quantite',
                            name: 'int_NUMBER',
                            id: 'int_NUMBER',
                            xtype: 'numberfield',
                            allowBlank: false,
                            regex: /[0-9.]/,
                            minValue: 1,
                            value: 1
                            
                        },/* {
                            xtype: 'datefield',
                            fieldLabel: 'Date peremption',
                            name: 'str_PEREMPTION',
                            id: 'str_PEREMPTION',
                            submitFormat: 'd/m/Y',
                            minValue: new Date(),
                            allowBlank: false,
                            listeners: {
                                'change': function (me) {
//                                     alert(me.getSubmitValue());
                                    str_PEREMPTION = me.getSubmitValue();
                                }
                            }
                        },*/
                        {
                            fieldLabel: 'Reference Lot',
                            emptyText: 'Reference Lot',
                            name: 'int_NUM_LOT',
                            allowBlank: false,
                            id: 'int_NUM_LOT'
                        }
                    ]
                }
            ]
        });



        //Initialisation des valeur 



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
    onfiltercheck: function () {
        var lgFAMILLEID = Ext.getCmp('lgFAMILLEID').getValue();
        var int_name_size = lgFAMILLEID.length;
        var OGrid = Ext.getCmp('lgFAMILLEID');

        if (int_name_size > 3) {
            OGrid.getStore().getProxy().url = url_services_data_famille + "?search_value=" + lgFAMILLEID;
            OGrid.getStore().reload();
//            alert("lgFAMILLEID "+lgFAMILLEID);
        }
    },
    onbtnsave: function (button) {
        var fenetre = button.up('window'),
                formulaire = fenetre.down('form');
        var internal_url = "";


        if (formulaire.isValid()) {
            if (Ext.getCmp('int_NUMBER').getValue() < 0) {
                Ext.MessageBox.alert('Error Message', 'Quantite inferieure a 0');
                return;
            }
            if (Omode === "create") {
                internal_url = url_services_transaction_perime + 'doPerime';
//                alert("int_NUMBER " + Ext.getCmp('int_NUMBER').getValue() + 
//                        " **** lg_FAMILLE_ID " + Ext.getCmp('lgFAMILLEID').getValue() +
//                        "int_NUM_LOT " + Ext.getCmp('int_NUM_LOT').getValue() );
//                return;
                Ext.Ajax.request({
                    url: internal_url,
                    params: {
                        int_NUMBER: Ext.getCmp('int_NUMBER').getValue(),
//                        str_PEREMPTION: str_PEREMPTION,
                        lg_FAMILLE_ID: Ext.getCmp('lgFAMILLEID').getValue(),
                        int_NUM_LOT: Ext.getCmp('int_NUM_LOT').getValue()
                    },
                    success: function (response)
                    {
                        var object = Ext.JSON.decode(response.responseText, false);
                        // alert(object.success);
                        if (object.success == 0) {
                            Ext.MessageBox.alert('Error Message', object.errors);
                            return;
                        } else {
                            Ext.MessageBox.alert('Confirmation', object.errors);
                            Oview.getStore().reload();
                            if (typeof refreshNotificationBadge === 'function') {
                                refreshNotificationBadge();
                            }
                        }
                        var bouton = button.up('window');
                                bouton.close();

                    },
                    failure: function (response)
                    {

                        var object = Ext.JSON.decode(response.responseText, false);
                        console.log("Bug " + response.responseText);
                        Ext.MessageBox.alert('Error Message', response.responseText);

                    }
                });
            }
        } else {
            Ext.MessageBox.alert('Echec', 'Formulaire non valide. Verifiez votre saisie');
            return;
        }


       // this.up('window').close();
    }
});
