/* global Ext */

var url_services_transaction_tierspayant_dovente_additems = '../webservices/tierspayantmanagement/clienttierspayant/ws_transaction.jsp?mode=';

var OviewItem;
var OmodeItem;
var MeItem;
var refItem;
var internal_url;
var Me;
var Me_additem;
var refclt;
var int_percent;
var OCust_tp_ro_taux;
var OCust_tp_rc1_taux;
var OCust_tp_rc2_taux;
var OCust_tp_rc3_taux;

var OCust_tp_ro_id;
var OCust_tp_rc1_id;
var OCust_tp_rc2_id;
var OCust_tp_rc3_id;
var MainController;

Ext.define('testextjs.view.sm_user.dovente.action.addTiersPayantItem', {
    extend: 'Ext.window.Window',
    xtype: 'addTiersPayantItem',
    id: 'addTiersPayantItemID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.TiersPayant',
        'testextjs.model.CompteClientTierspayant'
                // 'testextjs.controller.LaborexWorkFlow'

    ],
    width: '40%',
    height: 700,
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function () {


        Me_additem = this;
        OmodeItem = this.getMode();

        ref = this.getOdatasource();
        ref_compte_clt = ref;
        //   MainController = Ext.create('testextjs.controller.App', {});

        var url_services_data_tierspayant_dovente_fonal = '../webservices/tierspayantmanagement/clienttierspayant/ws_data.jsp?lg_COMPTE_CLIENT_ID=' + ref;


        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.TiersPayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_tierspayant_dovente_fonal,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });




        var form = new Ext.form.Panel({
            bodyPadding: 10,
            width: '45%',
            height: 400,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 115,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    //   width: 55,
                    title: 'Infos  Tiers.Payant',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Tiers.Payant',
                            name: 'lg_TIERS_PAYANT_ID',
                            id: 'lg_TIERS_PAYANT_ID',
                            store: store,
                            valueField: 'lg_TIERS_PAYANT_ID',
                            displayField: 'str_NAME',
                            typeAhead: true,
                            queryMode: 'remote',
                            emptyText: 'Choisir un tiers payant...',
                            listeners: {
                                select: function (cmp) {
                                    var value = cmp.getValue();
                                    var record = cmp.findRecord(cmp.valueField || cmp.displayField, value); //recupere la ligne de l'element selectionné
                                    // var index = cmp.store.indexOf(record); // recupere la position de l'element selectionné de l'
                                    // alert("montant " + index + " record " + record.get('str_CLIENT'));
                                    Ext.getCmp('int_POURCENTAGE').setValue(record.get('int_POURCENTAGE'));

                                },
                                'render': function (cmp) {
                                    cmp.getEl().on('keypress', function (e) {
                                        if (e.getKey() === e.ENTER) {
                                            var val_pos = LaborexWorkFlow.AllowOnlyPositiveNumber('int_POURCENTAGE');
                                            if (val_pos === 0) {
                                                Ext.MessageBox.alert('Error Message', 'Le pourcentage ne doit pas etre egal a 0');
                                                return;
                                            } else if (val_pos > 100) {
                                                Ext.MessageBox.alert('Error Message', 'Le pourcentage ne doit pas etre superieur a 100');
                                                return;
                                            } else {
                                                Me_additem.onbtnsave_additem();
                                            }


                                        }
                                    });
                                }

                            }

                        },
                        {
                            xtype: 'textfield',
                            fieldLabel: 'Pourcentage',
                            name: 'int_POURCENTAGE',
                            // maskRe: /[0-9.]/,
                            allowBlank: false,
                            minValue: 1,
                            id: 'int_POURCENTAGE',
                            listeners: {
                                'render': function (cmp) {
                                    cmp.getEl().on('keypress', function (e) {
                                        if (e.getKey() === e.ENTER) {
                                            var val_pos = LaborexWorkFlow.AllowOnlyPositiveNumber('int_POURCENTAGE');
                                            if (val_pos === 0) {
                                                Ext.MessageBox.alert('Error Message', 'Le pourcentage ne doit pas etre egal a 0');
                                                return;
                                            } else if (val_pos > 100) {
                                                Ext.MessageBox.alert('Error Message', 'Le pourcentage ne doit pas etre superieur a 100');
                                                return;
                                            } else {
                                                Me_additem.onbtnsave_additem();
                                            }
                                            /*
                                             if (val_pos === 0) {
                                             return;
                                             } else {
                                             Me_additem.onbtnsave_additem();
                                             }*/


                                        }
                                    });
                                }

                            }
                        }
                    ]
                }]
        });





        OviewItem = Ext.getCmp('TiersPayantgridpanelID');
        win_additem = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 400,
            height: 170,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Enregistrer',
                    hidden: true,
                    handler: this.onbtnsave_additem
                }, {
                    text: 'Annuler',
                    hidden: true,
                    handler: function () {
                        win_additem.close();
                    }
                }]
        });
        OCust_tp_ro_taux = Ext.getCmp('RO');
        OCust_tp_rc1_taux = Ext.getCmp('RC1');
        OCust_tp_rc2_taux = Ext.getCmp('RC2');
        OCust_tp_rc3_taux = Ext.getCmp('RC3');
        OCust_tp_ro_id = Ext.getCmp('RO_ID');
        OCust_tp_rc1_id = Ext.getCmp('RC1_ID');
        OCust_tp_rc2_id = Ext.getCmp('RC2_ID');
        OCust_tp_rc3_id = Ext.getCmp('RC3_ID');
    },
    DisplayTotal: function (int_price, int_qte) {
        var TotalAmount_final = 0;
        var TotalAmount_temp = int_qte * int_price;
        var TotalAmount = Number(TotalAmount_temp);
        return TotalAmount;
    },
    DisplayMonnaie: function (int_total, int_amount_recu) {
        var TotalMonnaie = 0;
        Ext.getCmp('int_REEL_RESTE').setValue(int_amount_recu - int_total);
        if (int_total <= int_amount_recu) {
            var TotalMonnaie_temp = int_amount_recu - int_total;
            TotalMonnaie = Number(TotalMonnaie_temp);
            return TotalMonnaie;
        } else {
            return null;
        }
        return TotalMonnaie;
    },
    onsplitovalue: function (Ovalue) {

        var int_ovalue;
        var string = Ovalue.split(" ");
        int_ovalue = string[0];

        return int_ovalue;
    },
    onbtnsave_additem: function () {


        var internal_url = "", cmp = Ext.getCmp('lg_TIERS_PAYANT_ID'), value = cmp.getValue(),
                lg_PREENREGISTREMENT_ID = LaborexWorkFlow.GetComponentById('lg_PREENREGISTREMENT_ID').getValue();

//        if (Ext.getCmp('lg_TIERS_PAYANT_ID').getValue() === null) {
        if (value === null) {
            Ext.MessageBox.alert('Attention', 'Renseignez le tiers payant svp');
            return;
        }
        if (Ext.getCmp('int_POURCENTAGE').getValue() === null) {
            Ext.MessageBox.alert('Attention', 'Renseignez la couverture svp');
            return;
        }


        var record = cmp.findRecord(cmp.valueField || cmp.displayField, value); //recupere la ligne de l'element selectionné
        /* alert(record.get('dbl_PLAFOND_CONSO_DIFFRERENCE') + "****" + record.get('dbl_PLAFOND_CLIENT'));
         return;*/
        /* commente le 21/014/2017  if (record.get('dbl_PLAFOND_CLIENT') != 0 && record.get('dbl_PLAFOND_CONSO_DIFFRERENCE_CLIENT') < 0) {
         Ext.MessageBox.alert('Message d\'erreur', 'Impossible de poursuivre la vente. Le plafond du client est atteint',
         function(btn) {
         Ext.getCmp('lg_CLIENT_ID').focus(true, 100, function() {
         Ext.getCmp('lg_CLIENT_ID').selectText(0, Ext.getCmp('lg_CLIENT_ID').getValue().length);
         Ext.getCmp('dbl_PLAFOND_CONSO_DIFFERENCE').setValue(record.get('dbl_PLAFOND_CONSO_DIFFRERENCE_CLIENT'));
         Ext.getCmp('dbl_PLAFOND').setValue(record.get('dbl_PLAFOND_CLIENT'));
         });
         });
         return;
         }
         
         if (record.get('dbl_PLAFOND') != 0 && record.get('dbl_PLAFOND_CONSO_DIFFRERENCE') < 0) {
         Ext.MessageBox.alert('Message d\'erreur', 'Impossible de poursuivre la vente. Le plafond du tiers payant est atteint',
         function(btn) {
         Ext.getCmp('lg_CLIENT_ID').focus(true, 100, function() {
         Ext.getCmp('lg_CLIENT_ID').selectText(0, Ext.getCmp('lg_CLIENT_ID').getValue().length);
         Ext.getCmp('dbl_PLAFOND_CONSO_DIFFERENCE').setValue(record.get('dbl_PLAFOND_CONSO_DIFFRERENCE'));
         Ext.getCmp('dbl_PLAFOND').setValue(record.get('dbl_PLAFOND'));
         });
         });
         return;
         } 21 /04/2017 */



        var data = LaborexWorkFlow.ClientData;
        var bCANBEUSE = true;
        var bCANBEUSETP = true;
        var message = "";
        var messageTP = "";
        Ext.each(data, function (v, index) {
            if (v.NAME === record.get('str_NAME')) {
                bCANBEUSE = v.bCANBEUSE;
                bCANBEUSETP = v.bCANBEUSETP;
                message = v.message;
                messageTP = v.messageTP;
                return;
            }

        });


        if (!bCANBEUSE) {
            Ext.MessageBox.show({
                title: 'Message d\'erreur',
                width: 400,
                msg: message,
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING,
                fn: function (buttonId) {
                    if (buttonId === "ok") {
                        Ext.getCmp('lg_CLIENT_ID').focus(true, 100, function () {
                        });
                    }
                }
            });
            return;

        } else if (!bCANBEUSETP) {


            Ext.MessageBox.show({
                title: 'Message d\'erreur',
                width: 400,
                msg: messageTP,
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING,
                fn: function (buttonId) {
                    if (buttonId === "ok") {
                        Ext.getCmp('lg_CLIENT_ID').focus(true, 100, function () {
                        });
                    }
                }
            });

            return;

        }


 




        var ref_cpteclt_tp = Ext.getCmp('lg_TIERS_PAYANT_ID').getValue();
        int_percent = Ext.getCmp('int_POURCENTAGE').getValue();


        if (OmodeItem === "create") {
            internal_url = url_services_transaction_tierspayant_dovente_additems + 'create';
        } else {
            internal_url = url_services_transaction_tierspayant_dovente_additems + 'update&lg_TIERS_PAYANT_ID=' + ref_cpteclt_tp;
        }



        Ext.Ajax.request({
            url: internal_url,
            params: {
                int_POURCENTAGE: int_percent,
                lg_COMPTE_CLIENT_ID: ref_compte_clt,
                dbl_QUOTA_CONSO_MENSUELLE: record.get('dbl_PLAFOND_CLIENT'),
                str_NUMERO_SECURITE_SOCIAL: record.get('str_NUMERO_SECURITE_SOCIAL'),
                dbl_QUOTA_CONSO_VENTE: record.get('dbl_QUOTA_CONSO_VENTE')

            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                //var OCustomer = object.results[0];

                var str_CODE_ORGANISME = object.RFIND;
                var str_TAUX = object.RFIND_TAUX;
                var str_RPIORITY = object.RFIND_PRIORITY;
                var str_CPTE_TP_ID = object.RFIND_COMPTE_CLIENT_TIERS_PAYANT_ID;


                if (str_RPIORITY === "1") {
                    OCust_tp_ro_taux.setValue(str_CODE_ORGANISME + '--' + str_TAUX + ' %');
                    OCust_tp_ro_id.setValue(str_CPTE_TP_ID);
                    Ext.getCmp('int_TAUX').reset();
                    Ext.getCmp('REF_RO').show();
                    Ext.getCmp('REF_RO').focus(true, 100, function () {
                        Ext.getCmp('REF_RO').selectText(0, 1);
                    });
                }
                if (str_RPIORITY === "2") {
                    OCust_tp_rc1_taux.setValue(str_CODE_ORGANISME + '--' + str_TAUX + ' %');
                    OCust_tp_rc1_id.setValue(str_CPTE_TP_ID);
                    Ext.getCmp('REF_RC1').show();
                    Ext.getCmp('REF_RC1').focus(true, 100, function () {
                        Ext.getCmp('REF_RC1').selectText(0, 1);
                    });
                }
                if (str_RPIORITY === "3") {
                    OCust_tp_rc2_taux.setValue(str_CODE_ORGANISME + '--' + str_TAUX + ' %');
                    OCust_tp_rc2_id.setValue(str_CPTE_TP_ID);
                    Ext.getCmp('REF_RC2').show();
                    Ext.getCmp('REF_RC2').focus(true, 100, function () {
                        Ext.getCmp('REF_RC2').selectText(0, 1);
                    });
                }


                if (str_RPIORITY === "4") {
                    OCust_tp_rc3_taux.setValue(str_CODE_ORGANISME + '--' + str_TAUX + ' %');
                    OCust_tp_rc3_id.setValue(str_CPTE_TP_ID);
                    Ext.getCmp('REF_RC3').show();
                    Ext.getCmp('REF_RC3').focus(true, 100, function () {
                        Ext.getCmp('REF_RC3').selectText(0, 1);
                    });
                }
                console.log('record',record);
                LaborexWorkFlow.updateventeTierspayant(ref_cpteclt_tp,int_percent,record.get('str_NAME'));
                    
                if (lg_PREENREGISTREMENT_ID != "0") {
                    LaborexWorkFlow.addTierspayantToVente(lg_PREENREGISTREMENT_ID, str_CPTE_TP_ID, str_TAUX, 0);
                } else {
                    
//                    LaborexWorkFlow.updateTaux(str_TAUX); // a decommenter en cas de probleme 19/12/2016
                    LaborexWorkFlow.updateTaux();
                   
                   //on ajoute le tierspayant au tableau
                }

                // OviewItem.getStore().reload();


                if (object.success == "0") {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                }
            },
            failure: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', object.errors);

            }

        });
        win_additem.close();


    }
   

});