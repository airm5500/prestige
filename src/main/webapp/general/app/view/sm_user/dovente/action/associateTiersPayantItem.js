var url_services_transaction_tierspayant_dovente_assitems = '../webservices/tierspayantmanagement/clienttierspayant/ws_transaction_vente.jsp?mode=';
var url_services_data_clttierpayant_ass = '../webservices/configmanagement/compteclienttierspayant/ws_data_tierspayant.jsp';
var OviewItem;
var OmodeItem_ass;
var MeItem;
var refItem;
var internal_url;
var Me;
var Me_associateitem;
var refclt;
var int_percent_ass;
var OCust_tp_ro_taux_ass;
var OCust_tp_rc1_taux_ass;
var OCust_tp_rc2_taux_ass;
var OCust_tp_rc3_taux_ass;

var OCust_tp_ro_id_ass;
var OCust_tp_rc1_id_ass;
var OCust_tp_rc2_id_ass;
var OCust_tp_rc3_id_ass;
var OvalueTypeClient_search;


Ext.define('testextjs.view.sm_user.dovente.action.associateTiersPayantItem', {
    extend: 'Ext.window.Window',
    xtype: 'associateTiersPayantItem',
    id: 'associateTiersPayantItemID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.TiersPayant',
        'testextjs.model.CompteClientTierspayant'

    ],
    width: '40%',
    height: 700,
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        nameintern: ''
    },
    initComponent: function() {


        Me_associateitem = this;
        OmodeItem_ass = this.getMode();
        OvalueTypeClient_search = this.getNameintern();

        ref = this.getOdatasource();
        ref_compte_clt = ref;
        // alert("ref  " + ref_compte_clt);

        var itemsPerPage = 20;
        var store_tierspays_ass = new Ext.data.Store({
            model: 'testextjs.model.TiersPayant',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_clttierpayant_ass + "?lg_TYPE_TIERS_PAYANT_ID=" + OvalueTypeClient_search,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });




        var form = new Ext.form.Panel({
            bodyPadding: 10,
            width: '50%',
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
                            id: 'lg_TIERS_PAYANT_ID_associate',
                            store: store_tierspays_ass,
                            valueField: 'lg_TIERS_PAYANT_ID',
                            displayField: 'str_NAME',
                            pageSize: 20, //ajout la barre de pagination
                            typeAhead: true,
                            minChars: 3,
                            enableKeyEvents: true,
                            // editable: false, //empeche la saisie dans le combo. "typeAhead" n'est pas utilisé lorsque "editable" est utilisé
                            queryMode: 'remote',
                            emptyText: 'Choisir un tiers payant...',
                            listeners: {
                                keypress: function(field, e) {
//                                                    alert("field.getValue().length"+e.getKey());
                                    if (e.getKey() === e.BACKSPACE || e.getKey() === 46) {

                                        if (field.getValue().length == 1) {
                                            field.getStore().load();
                                        }
                                    }

                                }
                            }
                        },
                        {
                            xtype: 'textfield',
                            fieldLabel: 'Pourcentage',
                            name: 'int_POURCENTAGE',
                            maskRe: /[0-9.]/,
                            allowBlank: false,
                            minValue: 1,
                            maxValue: 100,
                            id: 'int_POURCENTAGE_associate',
                            listeners: {
                                'render': function(cmp) {
                                    cmp.getEl().on('keypress', function(e) {
                                        if (e.getKey() === e.ENTER) {
                                            var val_pos = LaborexWorkFlow.AllowOnlyPositiveNumber('int_POURCENTAGE');
                                            if (val_pos === 0) {
                                                return;
                                            }
                                        }
                                    });
                                }

                            }
                        },
                        {
                            fieldLabel: 'Matricule/ SS',
                            emptyText: 'NUMERO MATRICULE',
                            name: 'str_NUMERO_SECURITE_SOCIAL_ass',
                            id: 'str_NUMERO_SECURITE_SOCIAL_ass'
                        }, 
                        
                        {
                            name: 'dbl_QUOTA_CONSO_VENTE_ass',
                            id: 'dbl_QUOTA_CONSO_VENTE_ass',
                            fieldLabel: 'Plafond Vente',
                            value: 0,
                            selectOnFocus: true,
                            emptyText: 'Plafond',
                            maskRe: /[0-9.]/
                        },
                        {
                            name: 'dbl_QUOTA_CONSO_MENSUELLE_ass',
                            id: 'dbl_QUOTA_CONSO_MENSUELLE_ass',
                            fieldLabel: 'Plafond sur encours',
                            value: 0,
                            selectOnFocus: true,
                            emptyText: 'Plafond',
                            maskRe: /[0-9.]/
                        }, 
                        
                        
                        {
                            xtype: 'numberfield',
                            fieldLabel: 'Priorite',
                            emptyText: 'Priorite',
                            name: 'int_PRIORITY',
                            id: 'int_PRIORITY_ass',
                            value: 2,
                            minValue: 2,
                            maxValue: 4,
                            maskRe: /[0-9.]/
                        }
                    ]
                }]
        });


        if (OvalueTypeClient_search == "2") {
            Ext.getCmp('int_POURCENTAGE_associate').setValue();
            Ext.getCmp('int_POURCENTAGE_associate').disable();
        }


        // OviewItem_ass = Ext.getCmp('TiersPayantgridpanelID');
        win_ass = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: '40%',
            height: 290,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Enregistrer',
                    // hidden: true,
                    handler: this.onbtnsave_assitem
                }, {
                    text: 'Fermer',
                    //  hidden: true,
                    handler: function() {
                        win_ass.close();
                    }
                }]
        });
        OCust_tp_ro_taux_ass = Ext.getCmp('RO_add');
        OCust_tp_rc1_taux_ass = Ext.getCmp('RC1_add');
        OCust_tp_rc2_taux_ass = Ext.getCmp('RC2_add');
        OCust_tp_rc3_taux_ass = Ext.getCmp('RC3_add');


        OCust_tp_ro_id_ass = Ext.getCmp('RO_ID_add');
        OCust_tp_rc1_id_ass = Ext.getCmp('RC1_ID_add');
        OCust_tp_rc2_id_ass = Ext.getCmp('RC2_ID_add');
        OCust_tp_rc3_id_ass = Ext.getCmp('RC3_ID_add');


    },
    onsplitovalue: function(Ovalue) {

        var int_ovalue;
        var string = Ovalue.split(" ");
        int_ovalue = string[0];

        return int_ovalue;
    },
    onbtnsave_assitem: function() {


        var internal_url = "";

        if (Ext.getCmp('lg_TIERS_PAYANT_ID_associate').getValue() === null) {
            Ext.MessageBox.alert('Attention', 'Renseignez le tiers payant svp');
            return;
        }
        if (Ext.getCmp('int_POURCENTAGE_associate').getValue() === null) {
            Ext.MessageBox.alert('Attention', 'Renseignez la couverture svp');
            return;
        }
        if (Ext.getCmp('int_POURCENTAGE_associate').getValue() > 100) {
            Ext.MessageBox.alert('Attention', 'Renseignez un pourcentage inferieur a 100');
            return;
        }
        /* if (Ext.getCmp('bool_REGIME_associate').getValue() === null) {
         Ext.MessageBox.alert('Attention', 'Renseignez au moins le RO');
         return;
         }*/

        var ref_cpteclt_tp_ass = Ext.getCmp('lg_TIERS_PAYANT_ID_associate').getValue();
        int_percent_ass = Ext.getCmp('int_POURCENTAGE_associate').getValue();


        // if (OmodeItem_ass === "create") {
        internal_url = url_services_transaction_tierspayant_dovente_assitems + 'create';
        /* } else {
         internal_url = url_services_transaction_tierspayant_dovente_assitems + 'update&lg_TIERS_PAYANT_ID=' + ref_cpteclt_tp_ass;
         }*/



        Ext.Ajax.request({
            url: internal_url,
            params: {
                lg_TIERS_PAYANT_ID: ref_cpteclt_tp_ass,
                int_POURCENTAGE: int_percent_ass,
                lg_COMPTE_CLIENT_ID: ref,
                int_PRIORITY: Ext.getCmp('int_PRIORITY_ass').getValue(),
                dbl_QUOTA_CONSO_MENSUELLE: Ext.getCmp('dbl_QUOTA_CONSO_MENSUELLE_ass').getValue(),
                dbl_QUOTA_CONSO_VENTE: Ext.getCmp('dbl_QUOTA_CONSO_VENTE_ass').getValue(),
                str_NUMERO_SECURITE_SOCIAL: Ext.getCmp('str_NUMERO_SECURITE_SOCIAL_ass').getValue()
            },
            success: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);

                if (object.success == "0") {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                }
                //var OCustomer = object.results[0];

                var str_CODE_ORGANISME_ass = object.RFIND;
                var str_TAUX_ass = object.RFIND_TAUX;
                var str_RPIORITY_ass = object.RFIND_PRIORITY;
                var str_CPTE_TP_ID_ass = object.RFIND_COMPTE_CLIENT_TIERS_PAYANT_ID;


                if (str_RPIORITY_ass === "1") {
                    OCust_tp_ro_taux_ass.setValue(str_CODE_ORGANISME_ass + '--' + str_TAUX_ass + ' %');
                    OCust_tp_ro_id_ass.setValue(str_CPTE_TP_ID_ass);
                   // Ext.getCmp('REF_RO').show();
                }
                if (str_RPIORITY_ass === "2") {
                    OCust_tp_rc1_taux_ass.setValue(str_CODE_ORGANISME_ass + '--' + str_TAUX_ass + ' %');
                    OCust_tp_rc1_id_ass.setValue(str_CPTE_TP_ID_ass);
                   // Ext.getCmp('REF_RC1').show();
                }
                if (str_RPIORITY_ass === "3") {
                    OCust_tp_rc2_taux_ass.setValue(str_CODE_ORGANISME_ass + '--' + str_TAUX_ass + ' %');
                    OCust_tp_rc2_id_ass.setValue(str_CPTE_TP_ID_ass);
                   // Ext.getCmp('REF_RC2').show();
                }

                if (str_RPIORITY_ass === "4") {
                    OCust_tp_rc3_taux_ass.setValue(str_CODE_ORGANISME_ass + '--' + str_TAUX_ass + ' %');
                    OCust_tp_rc3_id_ass.setValue(str_CPTE_TP_ID_ass);
                   // Ext.getCmp('REF_RC3').show();
                }

                win_ass.close();

                // OviewItem.getStore().reload();


                if (object.success === 0) {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                }
            },
            failure: function(response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', object.errors);

            }

        });
        win_ass.close();


    }

});