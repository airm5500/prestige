/* global Ext, Me_dovente, my_view_titre */

var Me_Workflow;
var int_total_product;
var int_total_remise_formated;
var int_total_formated;
var in_total_remise;
var in_total_vente;
var in_total_cust_part;
var in_total_cust_part_formated;
var in_total_tierspayant_part;
var in_total_tierspayant_part_formated;
var ref;
var TPList = [];
var backend = [];
var partTP = 0;
var str_cptclt_id = "";
var grid_length_work;
var boxWaitingProcess;
var isAvoir;
var KEY_ACTIVATE_CONTROLE_VENTE_USER;
Ext.define('testextjs.controller.LaborexWorkFlow', {
    config: {
    },
    isCREDITTRANSACTION: false,

    isAvoir: false,
    ClientData: [],
    ClientJSON: {},
    ClientCurrentData: [],
    MontantVente: 0,
    venteTierspayant: [],

    constructor: function (config) {
        this.initConfig(config);
        Me_Workflow = this;
        this.getKEY_ACTIVATE_CONTROLE_VENTE_USER();
    },
    getKEY_ACTIVATE_CONTROLE_VENTE_USER: function () {
        Ext.Ajax.request({
            url: '../webservices/sm_user/parameter/ws_data.jsp?str_KEY=KEY_ACTIVATE_CONTROLE_VENTE_USER',
            success: Me_Workflow.processKeyActivateControleVenteUSerSucces,
            failure: Me_Workflow.processKeyActivateControleVenteUSerFailure
        });
    },
    processKeyActivateControleVenteUSerSucces: function (response) {
        var data = Ext.JSON.decode(response.responseText);
        KEY_ACTIVATE_CONTROLE_VENTE_USER = data['str_VALUE'];
        console.log("KEY_ACTIVATE_CONTROLE_VENTE_USER: ", KEY_ACTIVATE_CONTROLE_VENTE_USER);
    },
    processKeyActivateControleVenteUSerFailure: function (error) {
        console.log("KEY_ACTIVATE_CONTROLE_VENTE_USER error: ", error);
    },
    DoAjaxReglement: function (Olg_dossier_reglement_id, Ourl) {

        Ext.Ajax.request({
            url: Ourl,
            params: {
                lg_dossier_reglement_id: Olg_dossier_reglement_id
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                var amountTotal = Ext.util.Format.number(object.Amount_total, '0,000.');
                //  alert('amountTotal  ' + amountTotal);
                Ext.getCmp('int_MONTANT').setValue(amountTotal);
                Ext.getCmp('int_Nbr_Dossier').setValue(object.total);
                //alert(object.total);
                //alert(objectShowNetPaid.Amount_total); 

            },
            failure: function (response)
            {
                console.log("Bug " + response.responseText);
                alert(response.responseText);
            }
        });
    },
    DoAjaxGetStockArticle: function (record) {
        Ext.getCmp('int_NUMBER_AVAILABLE_STOCK').setValue(record.get('int_NUMBER_AVAILABLE'));
        Ext.getCmp('lg_ZONE_GEO_ID').setValue(record.get('lg_ZONE_GEO_ID'));

        Ext.getCmp('int_QUANTITY').focus(true, 100, function () {
            Ext.getCmp('int_QUANTITY').selectText(0, 1);//#C1C1C1 #EEF5F5;#3892D3
            // Ext.getCmp('int_QUANTITY').setFieldStyle('border: 2px solid #04f404; background:#EEF5F5;');


        });
    },
    DoAjaxGetLastTransactionTierePayant: function (Ostr_NAME) {
        //alert(Ostr_NAME);

        Ext.Ajax.request({
            url: "../webservices/sm_user/diffclient/ws_customer_last_transction_compte_client_data.jsp",
            params: {
                lg_COMPTE_CLIENT_ID: Ostr_NAME
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                OCust_tp_ro_taux = Ext.getCmp('RO');
                OCust_tp_rc1_taux = Ext.getCmp('RC1');
                OCust_tp_rc2_taux = Ext.getCmp('RC2');
                OCust_tp_rc3_taux = Ext.getCmp('RC3');
                OCust_tp_ro_id = Ext.getCmp('RO_ID');
                OCust_tp_rc1_id = Ext.getCmp('RC1_ID');
                OCust_tp_rc2_id = Ext.getCmp('RC2_ID');
                OCust_tp_rc3_id = Ext.getCmp('RC3_ID');
                //  alert(response.responseText);
//                 alert(object.results.length);
                for (i = 0; i < object.results.length; i++) {
                    var object = object.results[0];
                    //   alert(object.str_NAME+" "+object.b_IS_RO +" "+object.b_IS_RC1 +" "+object.b_IS_RC2);

                    if (object.b_IS_RO === "1") {
                        //              Ext.getCmp('RO').setValue(object.str_NAME);
                    }
                    if (object.b_IS_RC1 === "1") {
                        //    Ext.getCmp('RO').setValue(object.str_NAME);
                    }
                    if (object.b_IS_RC2 === "1") {
                        //     Ext.getCmp('RO').setValue(object.str_NAME);
                    }
                    // Ext.getCmp('RO').setValue(object.b_IS_RO); //TP1
                    //  Ext.getCmp('RC1').setValue(object.b_IS_RC1); //TP2
                    //  Ext.getCmp('RC2').setValue(object.b_IS_RC2); //TP3

                    var str_CODE_ORGANISME = object.str_NAME;
                    var str_TAUX = object.int_POURCENTAGE;
                    var str_RPIORITY = object.int_PRIORITY;
                    var str_CPTE_TP_ID = object.lg_COMPTE_CLIENT_TIERS_PAYANT_ID;
                    if (str_RPIORITY === "1") {
                        OCust_tp_ro_taux.setValue(str_CODE_ORGANISME + '--' + str_TAUX + ' %');
                        OCust_tp_ro_id.setValue(str_CPTE_TP_ID);
                    }
                    if (str_RPIORITY === "2") {
                        OCust_tp_rc1_taux.setValue(str_CODE_ORGANISME + '--' + str_TAUX + ' %');
                        OCust_tp_rc1_id.setValue(str_CPTE_TP_ID);
                    }
                    if (str_RPIORITY === "3") {
                        OCust_tp_rc2_taux.setValue(str_CODE_ORGANISME + '--' + str_TAUX + ' %');
                        OCust_tp_rc2_id.setValue(str_CPTE_TP_ID);
                    }


                    if (str_RPIORITY === "4") {
                        OCust_tp_rc3_taux.setValue(str_CODE_ORGANISME + '--' + str_TAUX + ' %');
                        OCust_tp_rc3_id.setValue(str_CPTE_TP_ID);
                    }



                }

            },
            failure: function (response)
            {
                console.log("Bug " + response.responseText);
                alert(response.responseText);
            }
        });
    },
    BuildStore: function (Ostore_model, Ostore_NbPagination, Ostore_url, OautoLoad) {
        var finalLoad = true;
        if (typeof OautoLoad !== 'undefined' && OautoLoad !== null) {
            finalLoad = OautoLoad;
        }

        var OBuildStore = new Ext.data.Store({
            model: Ostore_model,
            pageSize: Ostore_NbPagination,
//            autoLoad: true,
            autoLoad: finalLoad,
            proxy: {
                type: 'ajax',
                url: Ostore_url,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        return OBuildStore;
    },
    HideAndDisplayField: function (Ofirstcomponent, Osecondcomponent, Othirdcomponent, Otask) {

        if (Otask === "hide") {
            Ofirstcomponent.hide();
            Osecondcomponent.hide();
            Othirdcomponent.hide();
        } else {
            Ofirstcomponent.show();
            Osecondcomponent.show();
            Othirdcomponent.show();
        }

    },
    HideAndDisplayFieldComplex: function (Ofirstcomponent, Osecondcomponent, Othirdcomponent, Ofourthcomponent, Ofifthcomponent, Otask) {

        if (Otask === "hide") {
            Ofirstcomponent.hide();
            Osecondcomponent.hide();
            Othirdcomponent.hide();
            Ofourthcomponent.hide();
            Ofifthcomponent.hide();
        } else {
            Ofirstcomponent.show();
            Osecondcomponent.show();
            Othirdcomponent.show();
            Ofourthcomponent.show();
            Ofifthcomponent.show();
        }

    },
    ManageComponentLigth: function (OcomponentSourceId, Ofirst_componentId, Ofirst_Value, Osecond_Value, Otask) {
        var OcomponentSource = this.GetComponentById(OcomponentSourceId);
        var OcomponentSource_value = OcomponentSource.getValue();
        var Ofirst_component = this.GetComponentById(Ofirst_componentId);
        if (OcomponentSource_value === Ofirst_Value || OcomponentSource_value === Osecond_Value) {
            //alert("Ofirst_Value "+Ofirst_Value + "  Osecond_Value "+Osecond_Value)
            if (Otask === "hide") {
                Ofirst_component.hide();
            } else {
                Ofirst_component.show();
            }
        } else {

            Ofirst_component.show();
        }
    },
    ManageComponent: function (OcomponentSourceId, Ofirst_componentId, Osecond_componentId, Othird_componentId, Ofirst_Value, Osecond_Value, Otask) {
        var OcomponentSource = this.GetComponentById(OcomponentSourceId);
        var OcomponentSource_value = OcomponentSource.getValue();
        var Ofirst_component = this.GetComponentById(Ofirst_componentId);
        var Osecond_component = this.GetComponentById(Osecond_componentId);
        var Othird_component = this.GetComponentById(Othird_componentId);
        if (OcomponentSource_value === Ofirst_Value || OcomponentSource_value === Osecond_Value) {
            this.HideAndDisplayField(Ofirst_component, Osecond_component, Othird_component, Otask);
        } else {
            this.HideAndDisplayField(Ofirst_component, Osecond_component, Othird_component, 'show');
        }
    },
    loadStore: function (Ovalue_Store) {
        Ovalue_Store.load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {

    },
    ShowAyantDroits: function (Object_famille, Ovalue_popup_famille, Ovalue_popup_parentview, Ovalue_popup_path, Ovalue_popup_nameintern, Ovalue_popup_mode, Ovalue_popup_titre, Ovalue_from, _venteTierspayant) {
        var Osearch_article = Ovalue_popup_famille;
        var Ocomponent = Ext.getCmp('' + Ovalue_popup_parentview + '');
        new Ovalue_popup_path({
            o2ndatasource: Object_famille,
            odatasource: Osearch_article,
            nameintern: Ovalue_popup_nameintern,
            parentview: Ocomponent,
            mode: Ovalue_popup_mode,
            titre: Ovalue_popup_titre,
            from: Ovalue_from,
            venteTierspayant: _venteTierspayant
        });
    },
    ShowPopUp: function (Object_famille, Ovalue_popup_famille, Ovalue_popup_parentview, Ovalue_popup_path, Ovalue_popup_nameintern, Ovalue_popup_mode, Ovalue_popup_titre, Ovalue_from) {
        var Osearch_article = Ovalue_popup_famille;
        var Ocomponent = Ext.getCmp('' + Ovalue_popup_parentview + '');
        new Ovalue_popup_path({
            o2ndatasource: Object_famille,
            odatasource: Osearch_article,
            nameintern: Ovalue_popup_nameintern,
            parentview: Ocomponent,
            mode: Ovalue_popup_mode,
            titre: Ovalue_popup_titre,
            from: Ovalue_from
        });
    },
    GetFamille: function (Ovalue_famille, Ovalue_transac_ref, Ovalue_famille_url, Ovalue_famille_task, Ovalue_famille_id_search, Ovalue_famille_price_search, Ovalue_famille_qte_search) {
        var url_services_data_famille_select_dovente_search = Ovalue_famille_url + "?" + Ovalue_famille_task + "=" + Ovalue_famille;
        var str_path = testextjs.view.sm_user.dovente.action.updateQuantity;
        Ext.Ajax.request({
            url: url_services_data_famille_select_dovente_search,
            params: {
            },
            success: function (response)
            {

                var object = Ext.JSON.decode(response.responseText, false);
                // Ext.getCmp('int_CIP').setValue(" ");
                var OFamille = object.results[0];
                var str_NAME = OFamille.str_NAME;
                Ovalue_famille_id_search = OFamille.lg_FAMILLE_ID;
                Ovalue_famille_price_search = Number(OFamille.int_PRICE);
                Ovalue_famille_qte_search = 1;
                url_services_data_famille_select_dovente_search = Ovalue_famille_url;
                Me_Workflow.ShowPopUp(OFamille, Ovalue_transac_ref, 'doventemanagerID', str_path, Ovalue_transac_ref, "modificationqte", "QUANTITE DEMANDEE DU PRODUIT [" + str_NAME + "]", "from_cip");
            }, failure: function (response)
            {

                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText,
                        function (btn) {
                            Ext.getCmp('str_NAME').focus();
                        });
            }
        });
    },
    GetComponentById: function (Ovalue_component_id) {
        var Ocomponent = Ext.getCmp('' + Ovalue_component_id + '');
        return Ocomponent;
    },
    GetAndCheckFormValueField: function (Ovalue_component_id) {
        var Ocomponent = this.GetComponentById(Ovalue_component_id);
        var Ocomponent_value = Ocomponent.getValue();
        return Ocomponent_value;
    },
    onbtnadd_vente_old: function (Ovalue_add_url, Ofirstvalue_param, Osecondvalue_param, Othirdvalue_param, Ofourthvalue_param, Ofifthvalue_param, Osixthvalue_param, remise_id, int_FREE_PACK_NUMBER) {


        var nature = this.GetAndCheckFormValueField('lg_NATURE_VENTE_ID');
        var medecin = this.GetAndCheckFormValueField('str_MEDECIN');
        var oref_vente_doajax = Ext.getCmp('str_ref_vente_hidden').getValue();
        var in_total_vente_add = Me_Workflow.amountdeformat(Ext.getCmp('int_TOTAL_VENTE').getValue());
        var strtypevente_add = Ext.getCmp('lg_TYPE_VENTE_ID').getValue();
        var str_cptclt_id_create = "";
        var str_ro_add = Ext.getCmp('RO_ID').getValue();
        var str_rc1_add = Ext.getCmp('RC1_ID').getValue();
        var str_rc2_add = Ext.getCmp('RC2_ID').getValue();
        var str_rc3_add = Ext.getCmp('RC3_ID').getValue();
        if (str_ro_add !== "" && str_ro_add !== undefined && str_ro_add !== null) {
            str_cptclt_id_create = str_ro_add + ";" + str_cptclt_id_create;
        }
        if (str_rc1_add !== "" && str_rc1_add !== undefined && str_rc1_add !== null) {
            str_cptclt_id_create = str_rc1_add + ";" + str_cptclt_id_create;
        }
        if (str_rc2_add !== "" && str_rc2_add !== undefined && str_rc2_add !== null) {
            str_cptclt_id_create = str_rc2_add + ";" + str_cptclt_id_create;
        }
        if (str_rc3_add !== "" && str_rc3_add !== undefined && str_rc3_add !== null) {
            str_cptclt_id_create = str_rc3_add + ";" + str_cptclt_id_create;
        }

//        alert("str_cptclt_id_create "+str_cptclt_id_create);
//         return;

        this.DoAjaxRequest(Ovalue_add_url, medecin, nature, Ofirstvalue_param, Osecondvalue_param, Othirdvalue_param, Ofourthvalue_param, Ofifthvalue_param, Osixthvalue_param, oref_vente_doajax, str_cptclt_id_create, in_total_vente_add, strtypevente_add, remise_id, int_FREE_PACK_NUMBER);
    },

    setTitleFrame: function (str_data) {
        ref = str_data;
        url_services_data_detailsvente = '../webservices/sm_user/detailsvente/ws_data.jsp?lg_PREENREGISTREMENT_ID=' + ref;
        var OGrid = Ext.getCmp('gridpanelID_dovente');
        url_services_data_detailsvente = '../webservices/sm_user/detailsvente/ws_data.jsp?lg_PREENREGISTREMENT_ID=' + ref;
        OGrid.getStore().getProxy().url = url_services_data_detailsvente;
        OGrid.getStore().reload();
    },
    SetComponentValue: function (Ocomponent_Id, Ovalue_Toset) {
        var Ocomponent = this.GetComponentById(Ocomponent_Id);
        Ocomponent.setValue(Ovalue_Toset);
    },
    SetVenteComponentValue: function (Ofirstvalue_Toset, Osecondtvalue_Toset, Othirdvalue_Toset, Ofourthvalue_Toset, Ofifthhvalue_Toset) {

        if (my_view_titre === 'by_devis') {
            Ext.getCmp('str_REF_VENTE_ID').hide();
        }


        this.SetComponentValue('str_REF_VENTE', Ofirstvalue_Toset);
        this.SetComponentValue('str_REF_VENTE_ID', Osecondtvalue_Toset);
        this.SetComponentValue('int_TOTAL_VENTE', Othirdvalue_Toset + '  CFA');
        this.SetComponentValue('int_TOTAL_REMISE', Ofourthvalue_Toset + '  CFA');
        this.SetComponentValue('int_TOTAL_PRODUIT', Ofifthhvalue_Toset + '  Produit(s)');
    },

    splitovalue: function (Ovalue, Oseparateur) {
        var int_ovalue;
        var string = Ovalue.split(Oseparateur);
        int_ovalue = string[0];
        if (string.length >= 2) {
            var _string = string[1].lastIndexOf('C');
            console.log(int_ovalue, '******************************** int_ovalue ', int_ovalue, string.length, string[1].lastIndex('C'));
            int_ovalue = string[0] + _string[0];
        }

        return int_ovalue;
    },
    onsplitovalue: function (Ovalue, Oseparateur) {
        var int_ovalue;
        var string = Ovalue.split(Oseparateur);
        int_ovalue = string[0];

        return int_ovalue;
    },
    onsplitovalueother: function (Ovalue, Oseparateur, indice) {
        var int_ovalue;
        var string = Ovalue.split(Oseparateur);
        int_ovalue = string[indice];
        return int_ovalue;
    },
    splitovalueother: function (Ovalue, Oseparateur, indice) {
        var int_ovalue;
        var string = Ovalue.split(Oseparateur);
        int_ovalue = string[indice];
        return int_ovalue;
    },

    DisplayTotal: function (int_price, int_qte) {
        var TotalAmount_final = 0;
        var TotalAmount_temp = int_qte * int_price;
        var TotalAmount = Number(TotalAmount_temp);
        return TotalAmount;
    },
    FilterCombo: function (Ofirstcomponent_id, Osecondcomponent_id) {
        var OtypeVente = this.GetComponentById(Ofirstcomponent_id);
        var OTypeReglement = this.GetComponentById(Osecondcomponent_id);
        var storeReglement = OTypeReglement.getStore();
        if (OtypeVente.getValue() === "1" || OtypeVente.getValue() === "AU COMPTANT") {
            storeReglement.load({
                callback: function () {
                    var records = storeReglement.data.items;
                    storeReglement.removeAt(records[3]);
                }});
        }
    },
    RedirectUrl: function (Ofirstcomponent_id, Osecondcomponent_id, Ourl) {
        var OcomponentSource = this.GetComponentById(Ofirstcomponent_id);
        var OcomponentFinal = this.GetComponentById(Osecondcomponent_id);
        OcomponentFinal.setValue("");
        var url_ = Ourl + '?' + Ofirstcomponent_id + '=' + OcomponentSource.getValue();
        OcomponentFinal.getStore().getProxy().url = url_;
        OcomponentFinal.getStore().reload();
    },
    FindComponentToHideDisplay: function (Osourcecomponent_id, Ofirstcomponent_id, Osecondcomponent_id, Othirdcomponent_id, Ofourthcomponent_id, Ofifthcomponent_id) {
        var OcomponentSource = this.GetComponentById(Osourcecomponent_id);
        var OcomponentFirst;
        var OcomponentSecond;
        var OcomponentThird;
        var OcomponentFourth;
        var OcomponentFifth;
        var Otask;
        var OCustomer_identification = this.GetComponentById('fieldset_identification_client');
        var OtypeVente = this.GetComponentById('lg_TYPE_VENTE_ID');
        var fieldset_assure = this.GetComponentById('fieldset_assure');
        if (OcomponentSource.getValue() === "1") {

            OcomponentFirst = this.GetComponentById(Ofirstcomponent_id);
            OcomponentSecond = this.GetComponentById(Osecondcomponent_id);
            OcomponentThird = this.GetComponentById(Othirdcomponent_id);
            OcomponentFourth = this.GetComponentById(Ofourthcomponent_id);
            OcomponentFifth = this.GetComponentById(Ofifthcomponent_id);
            if (OtypeVente !== null && OtypeVente !== undefined) {

                if (OtypeVente.getValue() === "1" || OtypeVente.getValue() === "AU COMPTANT") {
                    OCustomer_identification.hide();
                    fieldset_assure.hide();
                }
            }
            this.HideAndDisplayFieldComplex(OcomponentFirst, OcomponentSecond, OcomponentThird, OcomponentFourth, OcomponentFifth, "hide");
            if (Ext.getCmp('str_REF_BON') !== null && Ext.getCmp('str_REF_BON') !== undefined) {
                Ext.getCmp('str_REF_BON').focus(false, 100, function () {

                });
            } else {
                Ext.getCmp('int_AMOUNT_RECU').focus(false, 100, function () {

                });
            }

            //  I have modified thys statement 28/10/2015
        } else if ((OcomponentSource.getValue() === "2" || OcomponentSource.getValue() === "3")) {
            OcomponentFirst = this.GetComponentById(Ofirstcomponent_id);
            OcomponentSecond = this.GetComponentById(Osecondcomponent_id);
            OcomponentThird = this.GetComponentById(Othirdcomponent_id);
            this.HideAndDisplayField(OcomponentFirst, OcomponentSecond, OcomponentThird, "show");
            OcomponentFourth = this.GetComponentById(Ofourthcomponent_id);
            OcomponentFifth = this.GetComponentById(Ofifthcomponent_id);
            OcomponentFourth.hide();
            OcomponentFifth.hide();
            // ajoute par KOBENA 08032016
            if (OtypeVente !== null && OtypeVente !== undefined) {
                if (OtypeVente.getValue() === "1" || OtypeVente.getValue() === "AU COMPTANT") {
                    OCustomer_identification.hide();
                    fieldset_assure.hide();
                }
            }

            if (OcomponentSource.getValue() === "2") {
                Ext.getCmp('lg_MODE_REGLEMENT_ID').focus(true, 100, function () {
                    //this.setFieldStyle('border: 2px solid #C0C0C0; background: #FFFFFF;');
                });
            }
            if (OcomponentSource.getValue() === "3") {
                Ext.getCmp('str_NOM').focus(true, 100, function () {
                    //this.setFieldStyle('border: 2px solid #C0C0C0; background: #FFFFFF;');
                });
            }
        } else if (OcomponentSource.getValue() === "4") {
            OcomponentFirst = this.GetComponentById(Ofirstcomponent_id);
            OcomponentFirst.setFieldLabel('Commentaire');
            OcomponentFirst.show();
            //  OCustomer_identification = this.GetComponentById('fieldset_identification_client');
            //fieldset_identification_client
            if (fieldset_assure !== null && OtypeVente !== undefined) {
                fieldset_assure.show();
            }

            if (OtypeVente !== null && OtypeVente !== undefined) {
                if ((OtypeVente.getValue() === "1" || OtypeVente.getValue() === "AU COMPTANT") && OcomponentSource.getValue() === "4") {
                    fieldset_assure.setTitle('<span style="color:blue;">CLIENT</span>');
                    Ext.getCmp('str_NUMERO_SECURITE_SOCIAL').hide();
                    Ext.getCmp('lg_CLIENT_ID').focus(false, 100, function () {
                        // Ext.getCmp('lg_CLIENT_ID').setFieldStyle('border: 2px solid #C0C0C0; background: #FFFFFF;');
                    });
                    OCustomer_identification.show();
                }
            }



            OcomponentSecond = this.GetComponentById(Osecondcomponent_id);
            OcomponentThird = this.GetComponentById(Othirdcomponent_id);
            OcomponentFourth = this.GetComponentById(Ofourthcomponent_id); //modified 0703 2016
            this.HideAndDisplayField(OcomponentSecond, OcomponentThird, OcomponentFourth, "hide");
            OcomponentFifth = this.GetComponentById(Ofifthcomponent_id);
            OcomponentFifth.hide();
            /* Ext.getCmp('lg_MODE_REGLEMENT_ID').focus(true, 100, function () {
             this.setFieldStyle('border: 2px solid #C0C0C0; background: #FFFFFF;');
             });*/

        } else if (OcomponentSource.getValue() === "5") {
            OcomponentSecond = this.GetComponentById(Osecondcomponent_id);
            OcomponentFirst = this.GetComponentById(Ofirstcomponent_id);
            OcomponentThird = this.GetComponentById(Othirdcomponent_id);
            this.HideAndDisplayField(OcomponentFirst, OcomponentSecond, OcomponentThird, "hide");
            OcomponentFourth = this.GetComponentById(Ofourthcomponent_id);
            OcomponentFifth = this.GetComponentById(Ofifthcomponent_id);
            OcomponentFourth.show();
            OcomponentFifth.show();
            if (OtypeVente !== null && OtypeVente !== undefined) {
                if (OtypeVente.getValue() === "1" || OtypeVente.getValue() === "AU COMPTANT") {
                    OCustomer_identification.hide();
                    fieldset_assure.hide();
                }
            }
            Ext.getCmp('lg_MODE_REGLEMENT_ID').focus(true, 100, function () {
                // this.setFieldStyle('border: 2px solid #C0C0C0; background: #FFFFFF;');
            });
        }

        if (OcomponentSource.getValue() === "2" || OcomponentSource.getValue() === "3") {
            var Oint_AMOUNT_REMIS = this.GetComponentById("int_AMOUNT_REMIS");
            Oint_AMOUNT_REMIS.hide();
        } else {
            var Oint_AMOUNT_REMIS = this.GetComponentById("int_AMOUNT_REMIS");
            Oint_AMOUNT_REMIS.show();
        }
    },
    GetCustomer: function (Ovalue_vente, Ovalue_customer_url, Ovalue_search, OvalueTypeClient_search) {
//        alert("Ovalue_vente "+Ovalue_vente);
//        return;
        var str_path = testextjs.view.sm_user.dovente.action.displayCustomer;
        var str_path_create_cust = testextjs.view.sm_user.dovente.action.add;
        Me_Workflow.SetComponentValue('str_NUMERO_SECURITE_SOCIAL', "");
        Me_Workflow.SetComponentValue('str_FIRST_NAME', "");
        Me_Workflow.SetComponentValue('str_LAST_NAME', "");
        Me_Workflow.SetComponentValue('RO', "");
        Me_Workflow.SetComponentValue('RC1', "");
        Me_Workflow.SetComponentValue('RC1', "");
        Me_Workflow.SetComponentValue('str_FIRST_NAME_AD', "");
        Me_Workflow.SetComponentValue('str_LAST_NAME_AD', "");
        Me_Workflow.SetComponentValue('str_NUMERO_SECURITE_SOCIAL_AD', "");
        Me_Workflow.SetComponentValue('lg_CLIENT_ID_FIND', "");
        Me_Workflow.SetComponentValue('lg_COMPTE_CLIENT_ID', "");
        Me_Workflow.SetComponentValue('TELEPHONECLIENT', "");
        Me_Workflow.SetComponentValue('int_TAUX', "");
        Me_Workflow.ClientData = [];
        Me_Workflow.ClientJSON = {};
        Me_Workflow.ClientCurrentData = [];
        Me_Workflow.MontantVente = 0;
        Me_Workflow.venteTierspayant = [], //10052017

                Ext.Ajax.request({
                    url: Ovalue_customer_url,
                    params: {
                    },
                    success: function (response)
                    {
                        var object = Ext.JSON.decode(response.responseText, false);
                        var int_total_result = 0;
                        if (Number(object.total) === int_total_result) {
                            Ext.MessageBox.confirm('Message',
                                    'Desole Client Inexistant! Creez Le!',
                                    function (btn) {
                                        if (btn === 'yes') {

                                            if (Ovalue_vente === "1" || Ovalue_vente === "AU COMPTANT") {
                                                new testextjs.view.configmanagement.client.action.addStandardUser({});
                                            } else {
                                                Me_Workflow.ShowPopUp(Ovalue_vente, Ovalue_search, 'doventemanagerID', str_path_create_cust, OvalueTypeClient_search, "create", "CREER UN NOUVEAU CLIENT", "from_cust");
                                            }

                                        } else {
                                            return;
                                        }
                                    });
                        } else if (Number(object.total) > 1) {
                            Me_Workflow.ShowPopUp(Ovalue_vente, Ovalue_search, 'doventemanagerID', str_path, Ovalue_search, "displaycustomer", "LISTE DES CLIENTS CORRESPONDANTS", "from_cust");
                            var dbl_differe_clt = Number(object.total_differe);
                            if (dbl_differe_clt === 0) {
                            } else {
                                //  Ext.getCmp('btn_add_differes').show();
                            }


                        } else {
                            var OCustomer = object.results[0];
                            var str_NUMERO_SECURITE_SOCIAL = OCustomer.str_NUMERO_SECURITE_SOCIAL;
                            var str_FIRST_NAME = OCustomer.str_FIRST_NAME;
                            var str_LAST_NAME = OCustomer.str_LAST_NAME;
//                    var bool_solde = object.isCustSolvable;
                            var lg_AYANTS_DROITS_ID = OCustomer.lg_AYANTS_DROITS_ID;
                            var str_ADRESSE = OCustomer.str_ADRESSE;
                            var str_CLIENT_FIND_ID = OCustomer.lg_CLIENT_ID;
                            var str_COMPTE_CLIENT_ID = OCustomer.lg_COMPTE_CLIENT_ID;
                            /* 20042017 */

                            Me_Workflow.SetComponentValue('str_NUMERO_SECURITE_SOCIAL', str_NUMERO_SECURITE_SOCIAL);
                            Me_Workflow.SetComponentValue('lg_CLIENT_ID', str_FIRST_NAME + " " + str_LAST_NAME);
                            Me_Workflow.SetComponentValue('str_FIRST_NAME', str_FIRST_NAME);
                            Me_Workflow.SetComponentValue('str_LAST_NAME', str_LAST_NAME);
                            Me_Workflow.SetComponentValue('TELEPHONECLIENT', str_ADRESSE);
                            Me_Workflow.SetComponentValue('str_FIRST_NAME_FACTURE', str_FIRST_NAME);
                            Me_Workflow.SetComponentValue('str_LAST_NAME_FACTURE', str_LAST_NAME);
                            Me_Workflow.SetComponentValue('lg_AYANTS_DROITS_ID', lg_AYANTS_DROITS_ID);
                            Me_Workflow.SetComponentValue('str_NUMERO_SECURITE_SOCIAL_AD', str_NUMERO_SECURITE_SOCIAL);
                            Me_Workflow.SetComponentValue('str_FIRST_NAME_AD', str_FIRST_NAME);
                            Me_Workflow.SetComponentValue('str_LAST_NAME_AD', str_LAST_NAME);
                            Me_Workflow.SetComponentValue('lg_COMPTE_CLIENT_ID', str_COMPTE_CLIENT_ID);
                            Me_Workflow.SetComponentValue('lg_CLIENT_ID_FIND', str_CLIENT_FIND_ID);
                            if (Ovalue_vente === "1" || Ovalue_vente === "AU COMPTANT") {
                                Ext.getCmp('str_NAME').focus();
                                Ext.getCmp('infoFacture').setTitle("INFOS SUR LE CLIENT");

                                Ext.getCmp('int_NUMBER_FACTURE').setValue(str_ADRESSE);
                                Ext.getCmp('str_FIRST_NAME_FACTURE').setReadOnly(true);
                                Ext.getCmp('str_LAST_NAME_FACTURE').setReadOnly(true);
                                Ext.getCmp('int_NUMBER_FACTURE').setReadOnly(true);
                                Ext.getCmp('infoFacture').show();


                            } else {


                                var cmpt = OCustomer.COMPTCLTTIERSPAYANT[0];
                                Me_Workflow.ClientJSON = cmpt;
                                Me_Workflow.ClientData = Object.keys(cmpt).map(function (k) {
                                    return cmpt[k];
                                });
                                Me_Workflow.venteTierspayant.push({"IDTIERSPAYANT": Me_Workflow.ClientJSON.RO.IDTIERSPAYANT, "TAUX": Me_Workflow.ClientJSON.RO.TAUX, "ID": str_CLIENT_FIND_ID, "NAME": Me_Workflow.ClientJSON.RO.NAME});
                                var data = Me_Workflow.ClientJSON.RO;
                                if (!data.bCANBEUSE) {

                                    Ext.MessageBox.show({
                                        title: 'Message d\'erreur',
                                        width: 400,
                                        msg: data.message,
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
                                } else if (!data.bCANBEUSETP) {
                                    Ext.MessageBox.show({
                                        title: 'Message d\'erreur',
                                        width: 400,
                                        msg: data.messageTP,
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


                                Ext.getCmp('REF_RO').focus(true, 100, function () {
                                });
                            }
                            Ext.getCmp('authorize_cloture_vente').setValue('0');
                            Ext.getCmp('btn_loturer').disable();
//                    alert(OCustomer.dbl_PLAFOND_RO_ID + " ****** " + OCustomer.dbl_PLAFOND_QUOTA_DIFFERENCE_RO_ID);
//                    return;

                            /*  if (OCustomer.dbl_PLAFOND_RO_ID != 0 && OCustomer.dbl_PLAFOND_QUOTA_DIFFERENCE_RO_ID < 0) {
                             Ext.MessageBox.alert('Message d\'erreur', 'Impossible de poursuivre la vente. Le plafond du client est atteint',
                             function (btn) {
                             Ext.getCmp('lg_CLIENT_ID').focus(true, 100, function () {
                             Ext.getCmp('lg_CLIENT_ID').selectText(0, Ext.getCmp('lg_CLIENT_ID').getValue().length);
                             Ext.getCmp('dbl_PLAFOND_CONSO_DIFFERENCE').setValue(OCustomer.dbl_PLAFOND_QUOTA_DIFFERENCE_RO_ID);
                             Ext.getCmp('dbl_PLAFOND').setValue(OCustomer.dbl_PLAFOND_RO_ID);
                             });
                             //                                                         
                             
                             });
                             return;
                             } else {
                             Ext.getCmp('dbl_PLAFOND_CONSO_DIFFERENCE').setValue(0);
                             Ext.getCmp('dbl_PLAFOND').setValue(0);
                             }
                             */
                            LaborexWorkFlow.DoGetTierePayantRO(OCustomer.RO, OCustomer.RO_TAUX, OCustomer.lg_COMPTE_CLIENT_TIERS_PAYANT_RO_ID, OCustomer.dbl_PLAFOND_RO, OCustomer.dbl_QUOTA_CONSO_MENSUELLE_RO, OCustomer.dbl_PLAFOND_QUOTA_DIFFERENCE_RO);
                        }


                    }, failure: function (response)
                    {

                        console.log("Bug " + response.responseText);
                        Ext.MessageBox.alert('Error Message', response.responseText);
                    }
                });
    },
    //changement d'ayant droit
    GetAyantDroit: function (Ovalue_vente, Ovalue_search) {

        var str_path = testextjs.view.sm_user.dovente.action.displayAyantDroit;
        Me_Workflow.ShowAyantDroits(Ovalue_vente, Ovalue_search, 'doventemanagerID', str_path, Ovalue_search, "displayAyantDroit", "LISTE DES AYANTS DROITS CORRESPONDANTS", "from_cust", Me_Workflow.venteTierspayant);
    },
    //fin chargement d'ayant droit





    DisplayMonnaie: function (int_total, int_amount_recu) {
        var TotalMonnaie = 0;
        var TotalMonnaie_temp = 0;
        // Ext.getCmp('int_REEL_RESTE').setValue(int_amount_recu - int_total);
        if (int_total <= int_amount_recu) {
            TotalMonnaie_temp = int_amount_recu - int_total;
            TotalMonnaie = Number(TotalMonnaie_temp);
            return TotalMonnaie;
        } else {
            return TotalMonnaie_temp;
        }

        return TotalMonnaie;
    },
    DisplayAmountRestant: function (int_total, int_amount_recu) {
        var TotalRestant = 0;
        var TotalRestant_temp = 0;
        // Ext.getCmp('int_REEL_RESTE').setValue(int_amount_recu - int_total);
        if (int_total <= int_amount_recu) {
            return TotalRestant_temp;
        } else {
            TotalRestant_temp = int_total - int_amount_recu;
            TotalRestant = Number(TotalRestant_temp);
            return TotalRestant;
        }

        return TotalRestant;
    },
    ChangeViewTitle: function (cmp_val) {
        if (cmp_val == "1" || cmp_val == "AU COMPTANT") {
            Me_dovente.setTitle("VENTE AU COMPTANT");
        } else {
            Me_dovente.setTitle("VENTE A CREDIT");
        }
        Me_Workflow.displayFieldSetCreditOrNot(cmp_val);
    },
    GetToTiersPayant: function () {
        var lgcompteclientID = Ext.getCmp('lg_COMPTE_CLIENT_ID').getValue();
        var lg_TYPE_CLIENT_ID = "";
        var lg_TYPE_VENTE_ID = Ext.getCmp('lg_TYPE_VENTE_ID').getValue();
        if (lg_TYPE_VENTE_ID === "2" || lg_TYPE_VENTE_ID === "ASSURANCE_MUTUELLE") {
            lg_TYPE_CLIENT_ID = "1";
        } else if (lg_TYPE_VENTE_ID === "3" || lg_TYPE_VENTE_ID === "CARNET") {
            lg_TYPE_CLIENT_ID = "2";
        } else {
            lg_TYPE_CLIENT_ID = "6";
        }

        if (lg_TYPE_CLIENT_ID !== "6") {
            var str_path_tp = testextjs.view.sm_user.dovente.action.addTiersPayantItem;
            LaborexWorkFlow.ShowPopUp(lgcompteclientID, lgcompteclientID, 'doventemanagerID', str_path_tp, lgcompteclientID, "dysplay", "Tier(s) Payant(s) Correspondants", "");
        } else {

            var str_FIRST_LAST_NAME = Ext.getCmp('str_FIRST_NAME').getValue() + " " + Ext.getCmp('str_LAST_NAME').getValue();
            var Client = {"lg_CLIENT_ID": Ext.getCmp('lg_CLIENT_ID_FIND').getValue(), "str_FIRST_LAST_NAME": str_FIRST_LAST_NAME, "lg_COMPTE_CLIENT_ID": lgcompteclientID, "isAstandardClient": true, "lg_TYPE_CLIENT_ID": lg_TYPE_CLIENT_ID};
            new testextjs.view.configmanagement.client.action.showclttierspayant({
                obtntext: "Client",
                odatasource: Client,
                nameintern: "Tiers payants",
                parentview: this,
                mode: "associertierspayant",
                titre: "Gestion des tiers payants du client [" + str_FIRST_LAST_NAME + "]"
            });
        }
    },
    AssociateTiersPayant: function (val, type_client) {
        //var lgcompteclientID = Ext.getCmp('lg_COMPTE_CLIENT_ID').getValue();
        var str_path_tp_ass = testextjs.view.sm_user.dovente.action.associateTiersPayantItem;
        LaborexWorkFlow.ShowPopUp(val, val, 'doventemanagerID', str_path_tp_ass, type_client, "dysplay", "Associer Tier(s) Payant(s)", "");
    },
    GetToDifferes: function () {
        var lgcompteclientID = Ext.getCmp('lg_COMPTE_CLIENT_ID').getValue();
      //  var str_path_tp = testextjs.view.sm_user.dovente.action.checkdif;
     //   LaborexWorkFlow.ShowPopUp(lgcompteclientID, lgcompteclientID, 'doventemanagerID', str_path_tp, lgcompteclientID, "dysplay", "Liste Des Differes Correspondants", "");
    },
    onPdfClick: function (lg_PREENREGISTRMENET_ID, str_FIRST_NAME_FACTURE, str_LAST_NAME_FACTURE, int_NUMBER_FACTURE) {
//        var url_services_pdf_ticket = '../webservices/sm_user/detailsvente/ws_generate_pdf.jsp';
        var url_services_pdf_ticket = '../generateTicket';

        var linkUrl = url_services_pdf_ticket + '?lg_PREENREGISTREMENT_ID=' + lg_PREENREGISTRMENET_ID + "&str_FIRST_NAME_FACTURE=" + str_FIRST_NAME_FACTURE + "&str_LAST_NAME_FACTURE=" + str_LAST_NAME_FACTURE + "&int_NUMBER_FACTURE=" + int_NUMBER_FACTURE;
        Me_Workflow.lunchPrinter(linkUrl);
        Me_Workflow.ResetView();
    },
    lunchPrinter: function (url) {
        var OGrid = Ext.getCmp('gridpanelID_dovente');
        OGrid.getStore().removeAll();
        OGrid.getStore().sync();
        Ext.getCmp('lg_USER_VENDEUR_ID').focus();
//        Ext.getCmp('lg_USER_VENDEUR_ID').setFieldStyle('border: 2px solid #3892d3; background: #F1F1F1;');
        Ext.Ajax.request({
            url: url,
            timeout: 2400000,
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success == "0") {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                }

            },
            failure: function (response)
            {

                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    },
    lunchPrinterAvoir: function (url) {
        Me_dovente.ShowWaitingProcess();
        Ext.Ajax.request({
            url: url,
            success: function (response)
            {
                Me_dovente.StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success == "0") {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    return;
                }

            },
            failure: function (response)
            {
                Me_dovente.StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    },
    GetStoreTotalData: function () {
        var storeGrid = Ext.getCmp('gridpanelID_dovente').getStore();
        storeGrid.load({
            callback: function () {
                var records = storeGrid.data.items;
                grid_length_work = records.length;
            }});
        return grid_length_work;
    },

    OnUpdateGrid: function (Ovalue_add_url, Ofirstvalue_param, Osecondvalue_param, Othirdvalue_param, Ofourthvalue_param, Ofifthvalue_param, Osixthvalue_param, Osevenvalue_param, Oeigthvalue_param, e, old_price, Oninevalue_param) {
        //        alert("Ovalue_add_url " + Ovalue_add_url + " Ofirstvalue_param " + Ofirstvalue_param + " Osecondvalue_param " + Osecondvalue_param + " Othirdvalue_param " + Othirdvalue_param + " Ofourthvalue_param " + Ofourthvalue_param + " Ofifthvalue_param " + Ofifthvalue_param + " Osixthvalue_param " + Osixthvalue_param + " Osevenvalue_param " + Osevenvalue_param + " Oeigthvalue_param " + Oeigthvalue_param);
        //        return;
        var myTargetColumn = 5;
        var OGrid = Ext.getCmp('gridpanelID_dovente');
        var plugin2 = OGrid.getPlugin();
        var str_LAST_NAME_FACTURE = "";
        var str_FIRST_NAME_FACTURE = "";
        var int_NUMBER_FACTURE = "";
        if (Ext.getCmp('str_FIRST_NAME_FACTURE').getValue() != null) {
            str_FIRST_NAME_FACTURE = Ext.getCmp('str_FIRST_NAME_FACTURE').getValue();
        }

        if (Ext.getCmp('str_LAST_NAME_FACTURE').getValue() != null) {
            str_LAST_NAME_FACTURE = Ext.getCmp('str_LAST_NAME_FACTURE').getValue();
        }

        if (Ext.getCmp('int_NUMBER_FACTURE').getValue() != null) {
            int_NUMBER_FACTURE = Ext.getCmp('int_NUMBER_FACTURE').getValue();
        }

        if (Ext.getCmp('dbl_PLAFOND_CONSO_DIFFERENCE').getValue() < 0) {
            Ext.MessageBox.alert('Message d\'erreur', 'Impossible de poursuivre la vente. Le plafond des ventes pour ce client est atteint',
                    function (btn) {
                        Ext.getCmp('lg_CLIENT_ID').focus(true, 100, function () {
                            Ext.getCmp('lg_CLIENT_ID').selectText(0, Ext.getCmp('lg_CLIENT_ID').getValue().length);
                        });
                    });
            return;
        }

        Ext.Ajax.request({
            url: Ovalue_add_url,
            params: {
                lg_PREENREGISTREMENT_DETAIL_ID: Ofirstvalue_param,
                lg_PREENREGISTREMENT_ID: Osecondvalue_param,
                lg_FAMILLE_ID: Othirdvalue_param,
                int_QUANTITY: Ofourthvalue_param,
                int_QUANTITY_SERVED: Oninevalue_param,
                int_PRICE_DETAIL: Ofifthvalue_param,
                int_TOTAL_VENTE_RECAP: Number(Osixthvalue_param),
                LstTCompteClientTiersPayant: Osevenvalue_param,
                lg_TYPE_VENTE_ID: Oeigthvalue_param,
                str_FIRST_NAME_FACTURE: str_FIRST_NAME_FACTURE,
                str_LAST_NAME_FACTURE: str_LAST_NAME_FACTURE,
                int_NUMBER_FACTURE: int_NUMBER_FACTURE
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.errors_code == "0") {

                    // alert("result "+object.errors_code + " result "+object.answer_decondition);
                    //si c est un produit déconditionné
                    if (object.answer_decondition == "true") {
                        Ext.MessageBox.confirm('Message',
                                object.errors,
                                function (btn) {
                                    if (btn == 'yes') {
                                        Me_Workflow.doDeconditionnement("update", e, Ovalue_add_url, Ofirstvalue_param, Osecondvalue_param, Othirdvalue_param, Ofourthvalue_param, Ofifthvalue_param, Osixthvalue_param, Osevenvalue_param, Oeigthvalue_param);
                                    }
                                });
                    } else {
                        Ext.MessageBox.alert('Information', object.errors,
                                function (btn) {
                                    if (e.colIdx == myTargetColumn) {
                                        //                                        alert("myTargetColumn" + e.record.data.int_FAMILLE_PRICE);
                                        e.record.data.int_FAMILLE_PRICE = old_price;
                                        plugin2.startEdit(e.rowIdx, e.colIdx);
                                    }
                                    //                                    Ext.getCmp('str_NAME').focus();

                                });
                        //  return;
                    }

                    //fin si c est un produit déconditionné

                } else {

                    // Ext.MessageBox.alert('Error Message', object.errors);

                    e.record.commit();
                    //                    OGrid.getStore().reload(); // a decommenter en cas de probleme
                    OGrid.getStore().load();
                    Ext.getCmp('str_NAME').focus(true, 100, function () {
                        Ext.getCmp('str_NAME').setValue("");
                        //Ext.getCmp('str_NAME').setFieldStyle('border: 2px solid #3892d3; background: #F1F1F1;');
                    });
                    /*  Ext.getCmp('str_NAME').setValue(""); //a decommenter en cas de probleme
                     Ext.getCmp('str_NAME').focus();*/
                    Ext.getCmp('str_CODE').setValue("");
                    Ext.getCmp('int_QUANTITY').setValue(1);
                    var isAvoir = object.isAvoir;
                    //                    alert("isAvoir:"+isAvoir);
                    if (isAvoir == "true") {
                        Ext.getCmp('infoFacture').setTitle("INFOS SUR L'AVOIR");
                        /* Ext.getCmp('str_FIRST_NAME_FACTURE').setValue("");
                         Ext.getCmp('str_LAST_NAME_FACTURE').setValue("");
                         Ext.getCmp('int_NUMBER_FACTURE').setValue("");*/

                        // add 11/04/2016 at 12:40
                        var lg_TYPEVENTEID = Ext.getCmp('lg_TYPE_VENTE_ID').getValue();
                        Ext.getCmp('str_FIRST_NAME_FACTURE').setValue(Ext.getCmp('str_FIRST_NAME').getValue());
                        Ext.getCmp('str_LAST_NAME_FACTURE').setValue(Ext.getCmp('str_LAST_NAME').getValue());
                        Ext.getCmp('int_NUMBER_FACTURE').setValue(Ext.getCmp('TELEPHONECLIENT').getValue());
                        if (lg_TYPEVENTEID !== "1" && lg_TYPEVENTEID !== "AU COMPTANT") {
                            Ext.getCmp('str_FIRST_NAME_FACTURE').setReadOnly(true);
                            Ext.getCmp('str_LAST_NAME_FACTURE').setReadOnly(true);
                            Ext.getCmp('int_NUMBER_FACTURE').focus(true, 100, function () {
                                // Ext.getCmp('int_NUMBER_FACTURE').setFieldStyle('border: 2px solid #3892d3; background: #F1F1F1;');
                            });
                        } else {
                            Ext.getCmp('str_FIRST_NAME_FACTURE').setReadOnly(false);
                            Ext.getCmp('str_LAST_NAME_FACTURE').setReadOnly(false);
                        }

                        Ext.getCmp('infoFacture').show();
                        Ext.getCmp('bool_IsACCOUNT').hide();
                    } else {
                        Ext.getCmp('bool_IsACCOUNT').show();
                        Ext.getCmp('infoFacture').hide();
                    }
                    var in_total_vente = Number(object.int_total_vente);
                    var in_total_vente_reel = Number(object.amount_vente_first_total);
                    var int_total_formated = Ext.util.Format.number(in_total_vente, '0,000.');
                    var in_total_vente_reel_formated = Ext.util.Format.number(in_total_vente_reel, '0,000.');
                    var in_total_cust_part = Number(object.int_cust_part);
                    var in_total_tierspayant_part = Number(object.int_total_tierspayant_part);
                    var dbl_net_apayer = Number(object.dbl_net_apayer)

                    var dbl_net_apayer_formated = Ext.util.Format.number(dbl_net_apayer, '0,000.');
                    var in_total_cust_part_formated = Ext.util.Format.number(in_total_cust_part, '0,000.');
                    var in_total_tierspayant_part_formated = Ext.util.Format.number(in_total_tierspayant_part, '0,000.');
                    var remise_to_check_edit = Number(object.dbl_total_remise);
                    var famille_stock_tocheck = Number(object.int_famille_stock);
                    var in_total_remise_edit;
                    if (famille_stock_tocheck <= 0) {
                        Ext.MessageBox.alert('Attention', 'Le Niveau du stock est atteint quantite actuelle [' + famille_stock_tocheck + ']',
                                function (btn) {
                                    Ext.getCmp('str_NAME').focus();
                                    //Ext.getCmp('str_NAME').setFieldStyle('border: 2px solid #3892d3; background: #F1F1F1;');
                                });
                    }


                    Ext.getCmp('int_TOTAL_VENTE').setValue(int_total_formated + '  CFA');
                    Ext.getCmp('int_NET_A_PAYER').setValue(dbl_net_apayer_formated + '  CFA');
                    //                    Ext.getCmp('int_NET_A_PAYER').setValue(dbl_net_apayer_formated + '  CFA');
                    Ext.getCmp('int_NET_A_PAYER_RECAP').setValue(dbl_net_apayer_formated + '  CFA');
                    //                    Ext.getCmp('int_NET_A_PAYER_RECAP').setValue(dbl_net_apayer_formated + '  CFA');
                    Ext.getCmp('int_TOTAL_REMISE').setValue(remise_to_check_edit + '  CFA');
//                      Ext.getCmp('int_REMISE_DEVIS').setValue(remise_to_check_edit + '  CFA');

                    Ext.getCmp('int_CUST_PART').setValue(in_total_cust_part_formated + '  CFA');
                    Ext.getCmp('int_TIERSPAYANT_PART').setValue(in_total_tierspayant_part_formated + '  CFA');
                    int_total_product = Number(object.int_total_product);
                    Ext.getCmp('int_TOTAL_PRODUIT').setValue(int_total_product + '  Produit(s)');
                    str_cptclt_id_edit = "";
                }

            },
            failure: function (response) {
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    },

    onbtndevis: function (url) {
        var lg_PREENREGISTREMENT_ID = Ext.getCmp('lg_PREENREGISTREMENT_ID').getValue();
        Me_dovente.ShowWaitingProcess();
        Ext.Ajax.request({
            url: url,
            params: {
                lg_PREENREGISTREMENT_ID: lg_PREENREGISTREMENT_ID,
                lg_COMPTE_CLIENT_ID: Ext.getCmp('lg_COMPTE_CLIENT_ID').getValue(),
                lg_TYPE_VENTE_ID: Ext.getCmp('lg_TYPE_VENTE_ID').getValue()
            },
            success: function (response)
            {
                Me_dovente.StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.errors_code == "0") {
                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 320,
                        msg: object.errors,
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING,
                        fn: function (buttonId) {
                            if (buttonId === "ok") {
                                Ext.getCmp('int_QUANTITY').focus(false, 100, function () {
                                    // this.setFieldStyle('border: 2px solid #C0C0C0; background: #FFFFFF;');
                                });
                            }
                        }
                    });
                    return;
                }

                Ext.MessageBox.confirm('Message',
                        'Confirmer l\'impression de la proforma',
                        function (btn) {
                            if (btn === 'yes') {
                                Me_Workflow.onPdfDevisClick(lg_PREENREGISTREMENT_ID);
                                return;
                            }
                        });
                Me_Workflow.ResetViewDevis();
            },
            failure: function (response)
            {
                Me_dovente.StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    }, onPdfDevisClick: function (oref_vente_pdf) {
        var linkUrl = '../webservices/sm_user/detailsvente/ws_generate_devis_pdf.jsp?lg_PREENREGISTREMENT_ID=' + oref_vente_pdf;
        window.open(linkUrl);
        Me_Workflow.ResetViewDevis();
    },
    amountdeformat: function (val) {
        var val_final = val.replace(/[^\d\,-]/g, '');
        return val_final;
    },
    trim: function (Ovalue) {
        if (Ovalue === null || Ovalue === undefined || Ovalue === "") {
        } else {
            var val = Ovalue.
                    replace(/(^\s*)|(\s*$)/gi, "").// removes leading and trailing spaces
                    replace(/[ ]{2,}/gi, " ").// replaces multiple spaces with one space 
                    replace(/\n +/, "\n"); // Removes spaces after newlines
            return val;
        }
    },
    SearchArticle: function (comp_id, url) {

        var OComponent = Me_Workflow.GetComponentById(comp_id);
        var OComponent_val = Me_Workflow.trim(OComponent.getValue());
        var OFamille_store = OComponent;
        if (OComponent_val !== null && OComponent_val !== "" && OComponent_val !== undefined) {
            var OComponent_length = OComponent_val.length;
            var url_final = url + "?search_value=" + OComponent_val;
            if (OComponent_length >= 3) {
                //OFamille_store.getStore().getProxy().url = url_final;                 // OFamille_store.getStore().reload();

                var store = OFamille_store.getStore();
                store.getProxy().url = url_final;
                /* store.load({
                 callback: function() {
                 if (store.getCount() == 1) {
                 var rec = store.getAt(0);
                 OComponent.setValue(rec.get('str_DESCRIPTION'));
                 Ext.getCmp('lg_FAMILLE_ID_VENTE').setValue(rec.get('lg_FAMILLE_ID'));
                 
                 }
                 //                        alert("ok"+store.getCount());
                 }
                 });*/
                /*alert(store.getCount());
                 if (store.getCount() === 1) {
                 // var record=store.getAt(0);
                 //OFamille_store.setValue(record.get('str_DESCRIPTION_PLUS'));                  
                 
                 }*/

            }
        } else {
            //alert('ici');
            OFamille_store.getStore().getProxy().url = url;
            OFamille_store.getStore().reload();
        }
    },
    SearchItem: function (comp_id, url, other) {
        var OComponent = Me_Workflow.GetComponentById(comp_id);
        var OComponent_val = Me_Workflow.trim(OComponent.getValue());
        var OFamille_store = OComponent;
        if (OComponent_val !== null && OComponent_val !== "" && OComponent_val !== undefined) {
            var OComponent_length = OComponent_val.length;
            var url_final = url + "?search_value=" + OComponent_val + other;
            if (OComponent_length >= 3) {
                OFamille_store.getStore().getProxy().url = url_final;
                OFamille_store.getStore().reload();
            }
        } else {
            //alert('ici');
            OFamille_store.getStore().getProxy().url = url;
            OFamille_store.getStore().reload();
        }
    },
    UpdateFamillePrice: function () {

    },
    AllowOnlyPositiveNumber: function (comp_id) {
        var result = 0;
        var OComponent = Me_Workflow.GetComponentById(comp_id);
        var OComponent_val = Me_Workflow.trim(OComponent.getValue());
        if (!isNaN(OComponent_val))
        {
            if (OComponent_val < 0) {
                OComponent.setValue("");
                Ext.MessageBox.alert('Attention', 'Rentrez un nombre positive svp',
                        function () {
                            OComponent.focus();
                        });
                return result;
            } else if (OComponent_val == 0) {
                OComponent.setValue("");
                Ext.MessageBox.alert('Attention', 'Rentrez un nombre superieur a zero svp',
                        function () {
                            OComponent.focus();
                        });
                return result;
            } else {

                result = 1;
                return result;
            }
        } else {
            Ext.MessageBox.alert('Attention', 'Rentrez un nombre svp',
                    function () {
                        OComponent.focus();
                    });
            return result;
        }

    },
    AllowOnlyPositiveNumberBis: function (comp_id, title, message, opt) {
        var result = 0;
        var OComponent = Me_Workflow.GetComponentById(comp_id);
        var OComponent_val = Me_Workflow.trim(OComponent.getValue());
        if (!isNaN(OComponent_val))
        {
            if (OComponent_val < 0) {
                OComponent.setValue("");
                //                Ext.MessageBox.alert('Attention', 'Rentrez un nombre positive svp',
                Ext.MessageBox.alert(title, message,
                        function () {
                            OComponent.focus();
                        });
                return result;
            } else if (OComponent_val == 0) {
                if (opt == "4" || opt == "Differe") {
                    result = 1;
                    return result;
                }
                OComponent.setValue("");
                //                Ext.MessageBox.alert('Attention', 'Rentrez un nombre superieur a zero svp',
                Ext.MessageBox.alert(title, message,
                        function () {
                            OComponent.focus();
                        });
                return result;
            } else {

                result = 1;
                return result;
            }
        } else {
            //            Ext.MessageBox.alert('Attention', 'Rentrez un nombre svp',
            Ext.MessageBox.alert(title, message,
                    function () {
                        OComponent.focus();
                    });
            return result;
        }

    },
    AllowRemise: function (Oval) {
        var result = 0;
        if (Oval === 0) {
            return result;
        } else {
            Ext.MessageBox.alert('Attention', 'Voulez-Vous Appliquer La Remise?');
            result = 1;
            return result;
        }


    },
    CheckNetAPayer: function (Oval) {
        if (Oval === 0) {
            Ext.getCmp('int_AMOUNT_RECU').disable();
            Ext.getCmp('int_AMOUNT_RECU').setValue(0);
            Ext.getCmp('btn_loturer').enable();
        } else {
            Ext.getCmp('int_AMOUNT_RECU').enable();
            var int_AMOUNT_RECU = Ext.getCmp('int_AMOUNT_RECU').getValue();
            if (int_AMOUNT_RECU != "") {
                var int_total = 0;
                var in_total_vente_monnaie = 0;
                var in_total_vente_monnaie_temp = 0;
                var int_monnaie_monnaie = 0;
                in_total_vente_monnaie_temp = Me_Workflow.onsplitovalue(Ext.getCmp('int_TOTAL_VENTE').getValue(), " ");
                var in_total_vente_monnaie_temp_final = Me_Workflow.amountdeformat(in_total_vente_monnaie_temp);
                in_total_vente_monnaie = Number(in_total_vente_monnaie_temp_final);
                var int_montant_recu = (Number(Ext.getCmp('int_AMOUNT_RECU').getValue()));
                int_monnaie_monnaie = Number(Me_Workflow.DisplayMonnaie(in_total_vente_monnaie, int_montant_recu));
                Ext.getCmp('int_AMOUNT_REMIS').setValue(int_monnaie_monnaie + ' CFA');
                var int_amount_restant = Me_Workflow.onsplitovalue(Ext.getCmp('int_AMOUNT_REMIS').getValue(), " ");
                var int_amount_restant_final = 0;
                int_amount_restant_final = Number(int_amount_restant);
                if (int_montant_recu >= in_total_vente_monnaie) {
                    Ext.getCmp('btn_loturer').enable();
                } else {
                    Ext.getCmp('btn_loturer').disable();
                }
            }
        }
    },
    CheckRefBon: function (comp_id) {
        var OComponent = Me_Workflow.GetComponentById(comp_id);
        var OComponent_val = Me_Workflow.trim(OComponent.getValue());
        Ext.Ajax.request({
            url: '../webservices/sm_user/detailsvente/ws_check_bon.jsp?mode=check',
            params: {
                str_REF_BON: OComponent_val
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                var result = object.int_result;
                if (result === "0") {
                    Ext.MessageBox.alert('Attention', 'Ce numero de bon a deja ete utilise');
                    OComponent.setValue("");
                    return;
                } else {


                }

            },
            failure: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }});
    },
    GetArticleByAjax: function (comp_id) {
        var OComponent = Me_Workflow.GetComponentById(comp_id);
        var OComponent_val = Me_Workflow.trim(OComponent.getValue());
        Ext.Ajax.request({
            url: '../webservices/sm_user/detailsvente/ws_check_bon.jsp?mode=check',
            params: {
                str_REF_BON: OComponent_val
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                var result = object.int_result;
                if (result === "0") {
                    Ext.MessageBox.alert('Attention', 'Ce numero de bon a deja ete utilise');
                    OComponent.setValue("");
                    return;
                } else {


                }
            },
            failure: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }});
    },
    //code ajouté
    updateVenteByTierpayantAndRemise: function (Ovalue_add_url, Ofirstvalue_param, Osecondvalue_param, Othirdvalue_param, Ofourthvalue_param, Ofifthvalue_param, Osixthvalue_param, Oseventhvalue_param) {
        /*alert(Ovalue_add_url + "-" + Ofirstvalue_param + "-" + Osecondvalue_param + "-" + Othirdvalue_param + "-" + Ofourthvalue_param + "-" + Ofifthvalue_param + "-" + Osixthvalue_param);
         return;*/


        if (Ext.getCmp('lg_TYPE_VENTE_ID').getValue() === null) {
            Ext.MessageBox.alert('Attention', 'Renseignez le type de la vente svp');
            return;
        }
        if (Ext.getCmp('lg_NATURE_VENTE_ID').getValue() === null) {
            Ext.MessageBox.alert('Attention', 'Renseignez la nature de la vente svp');
            return;
        }

        Me_Workflow.SetComponentValue('int_CUST_PART', "");
        Me_dovente.ShowWaitingProcess();
        Ext.Ajax.request({
            url: Ovalue_add_url,
            params: {
                lg_PREENREGISTREMENT_ID: Ofirstvalue_param,
                lg_REMISE_ID: Othirdvalue_param,
                LstTCompteClientTiersPayant: Ofourthvalue_param,
                mode_change: Osecondvalue_param,
                lg_COMPTE_CLIENT_TIERS_PAYANT_ID: Ofifthvalue_param
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                Me_dovente.StopWaitingProcess();
                if (object.errors_code == "0") {
                    //                    Me_dovente.StopWaitingProcess();
                    Ext.MessageBox.alert('Information', object.errors,
                            function (btn) {
                                Ext.getCmp('str_NAME').focus();
                                //Ext.getCmp('str_NAME').setFieldStyle('border: 2px solid #3892d3; background: #F1F1F1;');
                            });
                    return;
                } else {
                    ref = object.ref;
                    var ref_id = object.str_ref_id;
                    var isAvoir = object.isAvoir;
                    //                    alert("isAvoir:"+isAvoir);
                    if (isAvoir == "true") {
                        Ext.getCmp('infoFacture').setTitle("INFOS SUR L'AVOIR");
                        Ext.getCmp('str_FIRST_NAME_FACTURE').setValue("");
                        Ext.getCmp('str_LAST_NAME_FACTURE').setValue("");
                        Ext.getCmp('int_NUMBER_FACTURE').setValue("");
                        Ext.getCmp('infoFacture').show();
                    } else {
                        if (Ext.getCmp('bool_IsACCOUNT') == false) {
                            Ext.getCmp('infoFacture').hide();
                        }
                    }

                    Me_Workflow.SetComponentValue('str_ref_vente_hidden', ref);
                    Me_Workflow.setTitleFrame(object.ref);
                    if (Osecondvalue_param == "delete") {
                        Me_Workflow.SetComponentValue(Osixthvalue_param, "");
                        Oseventhvalue_param.setValue("");
                    }


                    var in_total_vente = Number(object.int_total_vente);
                    var in_total_remise = Number(object.dbl_total_remise);
                    var in_total_cust_part = Number(object.int_cust_part);
                    var in_total_tierspayant_part = Number(object.int_total_tierspayant_part);
                    var dbl_net_apayer = Number(object.dbl_net_apayer);
                    //                    alert("dbl_net_apayer "+dbl_net_apayer);


                    var int_total_product = Number(object.int_total_product);
                    var dbl_net_apayer_formated = Ext.util.Format.number(dbl_net_apayer, '0,000.');
                    var int_total_remise_formated = Ext.util.Format.number(in_total_remise, '0,000.');
                    in_total_cust_part_formated = Ext.util.Format.number(in_total_cust_part, '0,000.');
                    in_total_tierspayant_part_formated = Ext.util.Format.number(in_total_tierspayant_part, '0,000.');
                    int_total_formated = Ext.util.Format.number(in_total_vente, '0,000.');
                    Me_Workflow.SetVenteComponentValue(ref, ref_id, int_total_formated, int_total_remise_formated, int_total_product);
                    Ext.getCmp('int_CUST_PART').setValue(in_total_cust_part_formated + '  CFA');
                    Ext.getCmp('int_TIERSPAYANT_PART').setValue(in_total_tierspayant_part_formated + '  CFA');
                    Ext.getCmp('int_NET_A_PAYER').setValue(dbl_net_apayer_formated + '  CFA');
                    Ext.getCmp('int_NET_A_PAYER_RECAP').setValue(dbl_net_apayer_formated + '  CFA');
                    Ext.getCmp('str_NAME').focus();
                    // Ext.getCmp('str_NAME').setFieldStyle('border: 2px solid #3892d3; background: #F1F1F1;');
                    // return;
                }


            },
            failure: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText,
                        function (btn) {
                            Ext.getCmp('str_NAME').focus();
                            // Ext.getCmp('str_NAME').setFieldStyle('border: 2px solid #3892d3; background: #F1F1F1;');
                        });
            }
        });
    },
    updateVenteByRemise: function (Ovalue_add_url, Ofirstvalue_param, Osecondvalue_param, Othirdvalue_param) {

        if (Ext.getCmp('lg_TYPE_VENTE_ID').getValue() === null) {
            Ext.MessageBox.alert('Attention', 'Renseignez le type de la vente svp');
            return;
        }
        if (Ext.getCmp('lg_NATURE_VENTE_ID').getValue() === null) {
            Ext.MessageBox.alert('Attention', 'Renseignez la nature de la vente svp');
            return;
        }

        // Me_dovente.ShowWaitingProcess();
        Ext.Ajax.request({
            url: Ovalue_add_url,
            params: {
                lg_PREENREGISTREMENT_ID: Ofirstvalue_param,
                lg_REMISE_ID: Othirdvalue_param,
                mode: Osecondvalue_param
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                //  Me_dovente.StopWaitingProcess();


            },
            failure: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText,
                        function (btn) {
                            Ext.getCmp('str_NAME').focus();
                            // Ext.getCmp('str_NAME').setFieldStyle('border: 2px solid #3892d3; background: #F1F1F1;');
                        });
            }
        });
    },
    DoGetTierePayantRO: function (RO, RO_TAUX, lg_COMPTE_CLIENT_TIERS_PAYANT_ID, RO_PLAFOND, RO_CONSO, RO_PLAFOND_CONSO_DIFFERENCE) {
        var str_CODE_ORGANISME = RO;
        var str_TAUX = RO_TAUX;
        var str_CPTE_TP_ID = lg_COMPTE_CLIENT_TIERS_PAYANT_ID;
        //        alert("str_CODE_ORGANISME:"+str_CODE_ORGANISME+"/str_TAUX:"+str_TAUX+"/str_CPTE_TP_ID:"+str_CPTE_TP_ID);
        if (RO_PLAFOND != 0 && RO_PLAFOND_CONSO_DIFFERENCE < 0) {
            Ext.MessageBox.alert('Message d\'erreur', 'Impossible de poursuivre la vente. Le plafond du tiers payant est atteint',
                    function (btn) {
                        Ext.getCmp('lg_CLIENT_ID').focus(true, 100, function () {
                            Ext.getCmp('lg_CLIENT_ID').selectText(0, Ext.getCmp('lg_CLIENT_ID').getValue().length);
                            Ext.getCmp('dbl_PLAFOND_CONSO_DIFFERENCE').setValue(RO_PLAFOND_CONSO_DIFFERENCE);
                            Ext.getCmp('dbl_PLAFOND').setValue(RO_PLAFOND);
                        });
//                                                         

                    });
            return;
        } else {
            Ext.getCmp('dbl_PLAFOND_CONSO_DIFFERENCE').setValue(0);
            Ext.getCmp('dbl_PLAFOND').setValue(0);
        }
        if (str_CODE_ORGANISME == "" || str_CODE_ORGANISME == null) {
            Ext.getCmp('RO').setValue('Aucun tiers payant principal');
        } else {
            Ext.getCmp('RO').setValue(str_CODE_ORGANISME + '--' + str_TAUX + ' %');
            Ext.getCmp('RO_ID').setValue(lg_COMPTE_CLIENT_TIERS_PAYANT_ID);
            if (Ext.getCmp('lg_PREENREGISTREMENT_ID').getValue() != "0") {
                Me_Workflow.addTierspayantToVente(Ext.getCmp('lg_PREENREGISTREMENT_ID').getValue(), lg_COMPTE_CLIENT_TIERS_PAYANT_ID, RO_TAUX, 0);
            } else {
//                Me_Workflow.updateTaux(RO_TAUX); // a decommenter en cas de probleme 19/12/2016
                Me_Workflow.updateTaux();
            }
            Ext.getCmp('REF_RO').show();
            Ext.getCmp('REF_RO').focus(true, 100, function () {
                Ext.getCmp('REF_RO').selectText(0, 1);
            });
        }
        //  Ext.getCmp('RO').setValue(str_CODE_ORGANISME + '--' + str_TAUX + ' %');
        Ext.getCmp('RO_ID').setValue(str_CPTE_TP_ID);
    },
    //code ajouté
    updateAyantdroit: function (Ofirstvalue_param) {
        var Ovalue_add_url = '../webservices/sm_user/detailsvente/ws_transaction.jsp?mode=updateayantdroit';
        if (Ext.getCmp('lg_PREENREGISTREMENT_ID').getValue() != "0") {

            Me_dovente.ShowWaitingProcess();
            Ext.Ajax.request({
                url: Ovalue_add_url,
                params: {
                    lg_AYANTS_DROITS_ID: Ofirstvalue_param.get('lg_AYANTS_DROITS_ID'),
                    lg_PREENREGISTREMENT_ID: Ext.getCmp('lg_PREENREGISTREMENT_ID').getValue()
                },
                success: function (response)
                {

                    var object = Ext.JSON.decode(response.responseText, false);
                    Me_dovente.StopWaitingProcess();
                    if (object.errors_code == "0") {
                        Ext.MessageBox.alert('Erreur', object.errors,
                                function (btn) {
                                    Ext.getCmp('str_NAME').focus();
                                    // Ext.getCmp('str_NAME').setFieldStyle('border: 2px solid #3892d3; background: #F1F1F1;');
                                });
                        return;
                    }
                    Me_Workflow.SetComponentValue('str_FIRST_NAME_AD', Ofirstvalue_param.get('str_FIRST_NAME'));
                    Me_Workflow.SetComponentValue('str_LAST_NAME_AD', Ofirstvalue_param.get('str_LAST_NAME'));
                    Me_Workflow.SetComponentValue('str_NUMERO_SECURITE_SOCIAL_AD', Ofirstvalue_param.get('str_NUMERO_SECURITE_SOCIAL'));
                    Me_Workflow.SetComponentValue('lg_AYANTS_DROITS_ID', Ofirstvalue_param.get('lg_AYANTS_DROITS_ID'));
                    Ext.getCmp('str_NAME').focus(true, 100, function () {
                        Ext.getCmp('str_NAME').selectText(0, 1);
                        // Ext.getCmp('str_NAME').setFieldStyle('border: 2px solid #3892d3; background: #F1F1F1;');
                    });
                },
                failure: function (response)
                {
                    var object = Ext.JSON.decode(response.responseText, false);
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('Error Message', response.responseText,
                            function (btn) {
                                Ext.getCmp('str_NAME').focus();
                                // Ext.getCmp('str_NAME').setFieldStyle('border: 2px solid #3892d3; background: #F1F1F1;');
                            });
                }
            });
        } else {//modifier uniquement la vue
            Me_Workflow.SetComponentValue('str_FIRST_NAME_AD', Ofirstvalue_param.get('str_FIRST_NAME'));
            Me_Workflow.SetComponentValue('str_LAST_NAME_AD', Ofirstvalue_param.get('str_LAST_NAME'));
            Me_Workflow.SetComponentValue('str_NUMERO_SECURITE_SOCIAL_AD', Ofirstvalue_param.get('str_NUMERO_SECURITE_SOCIAL'));
            Me_Workflow.SetComponentValue('lg_AYANTS_DROITS_ID', Ofirstvalue_param.get('lg_AYANTS_DROITS_ID'));
        }

    },
    searchString: function (baseString, searchvalue) {
        return baseString.indexOf(searchvalue); // retourne -1 s'il ne trouve pas "searchvalue" dans "baseString" sinon retourne valeur position de "searchvalue" dans "baseString"
    },
    findColumnByDataIndex: function (grid, columnIndex) {
        var columnFind = grid.headerCt.getHeaderAtIndex(columnIndex);
        return columnFind;
    },
    ResetViewDevis: function () {
        Ext.getCmp('str_NAME').focus();

        Me_dovente.getForm().reset();
        /*var OGrid = Ext.getCmp('gridpanelID_dovente');
         OGrid.getStore().removeAll();
         OGrid.getStore().sync();*/
        Me_dovente.onRechClick();
        Me_Workflow.ReinitializeDisplay();
    },
    ResetView: function () {
        Ext.getCmp('str_NAME').focus();

        Me_dovente.getForm().reset();
        if (Me_dovente.getTitre() != "AU COMPTANT") {
            Me_Workflow.ChangeViewTitle("1");
        }
        Ext.getCmp('btn_loturer').disable();
        // Me_dovente.onRechClick();
        /* var OGrid = Ext.getCmp('gridpanelID_dovente');
         OGrid.getStore().removeAll();
         OGrid.getStore().sync();*/

        Me_dovente.onClearStore();

        Ext.getCmp('str_LIEU').hide();
        Ext.getCmp('str_BANQUE').hide();
        Ext.getCmp('str_NOM').hide();
        Ext.getCmp('int_TAUX_CHANGE').hide();
        Ext.getCmp('str_CODE_MONNAIE').hide();
        Ext.getCmp('infoFacture').hide();
        Ext.getCmp('lg_CLIENT_ID').enable();
        Ext.getCmp('str_FIRST_NAME_FACTURE').enable();
        Ext.getCmp('str_LAST_NAME_FACTURE').enable();
        Ext.getCmp('int_NUMBER_FACTURE').enable();
        Me_Workflow.ReinitializeDisplay();
    },

    updateTaux: function () {
        var int_TAUX = 0;
        var str_ro_add = Ext.getCmp('RO_ID').getValue(), str_rc1_add = Ext.getCmp('RC1_ID').getValue(),
                str_rc2_add = Ext.getCmp('RC2_ID').getValue(), str_rc3_add = Ext.getCmp('RC3_ID').getValue();
        if (str_ro_add !== "" && str_ro_add !== undefined && str_ro_add !== null) {

            int_TAUX += Number(Me_Workflow.onsplitovalueother(Me_Workflow.onsplitovalueother(Ext.getCmp('RO').getValue(), '--', 1), ' ', 0));
        }
        if (str_rc1_add !== "" && str_rc1_add !== undefined && str_rc1_add !== null) {
            int_TAUX += Number(Me_Workflow.onsplitovalueother(Me_Workflow.onsplitovalueother(Ext.getCmp('RC1').getValue(), '--', 1), ' ', 0));
        }
        if (str_rc2_add !== "" && str_rc2_add !== undefined && str_rc2_add !== null) {
            int_TAUX += Number(Me_Workflow.onsplitovalueother(Me_Workflow.onsplitovalueother(Ext.getCmp('RC2').getValue(), '--', 1), ' ', 0));
        }
        if (str_rc3_add !== "" && str_rc3_add !== undefined && str_rc3_add !== null) {
            int_TAUX += Number(Me_Workflow.onsplitovalueother(Me_Workflow.onsplitovalueother(Ext.getCmp('RC3').getValue(), '--', 1), ' ', 0));
        }
        // alert(int_TAUX);
        Ext.getCmp('int_TAUX').setValue(int_TAUX);
        Ext.getCmp('authorize_cloture_vente').setValue('0');
        Ext.getCmp('btn_loturer').disable();
        Ext.getCmp('int_AMOUNT_RECU').setValue(0);
    },
    ShowNetPaid: function (url) {
        var data2Send = [];
        backend = [];
        partTP = 0;
        var str_ro_add = Ext.getCmp('RO_ID').getValue(), str_rc1_add = Ext.getCmp('RC1_ID').getValue(),
                str_rc2_add = Ext.getCmp('RC2_ID').getValue(), str_rc3_add = Ext.getCmp('RC3_ID').getValue();

        if (str_ro_add !== "" && str_ro_add !== undefined && str_ro_add !== null) {

            data2Send.push({"IDCMPT": str_ro_add, "REFBON": Ext.getCmp('REF_RO').getValue(), "TAUX": Number(Me_Workflow.onsplitovalueother(Me_Workflow.onsplitovalueother(Ext.getCmp('RO').getValue(), '--', 1), ' ', 0))});
        }
        if (str_rc1_add !== "" && str_rc1_add !== undefined && str_rc1_add !== null) {

            data2Send.push({"IDCMPT": str_rc1_add, "REFBON": Ext.getCmp('REF_RC1').getValue(), "TAUX": Number(Me_Workflow.onsplitovalueother(Me_Workflow.onsplitovalueother(Ext.getCmp('RC1').getValue(), '--', 1), ' ', 0))});
        }
        if (str_rc2_add !== "" && str_rc2_add !== undefined && str_rc2_add !== null) {

            data2Send.push({"IDCMPT": str_rc2_add, "REFBON": Ext.getCmp('REF_RC2').getValue(), "TAUX": Number(Me_Workflow.onsplitovalueother(Me_Workflow.onsplitovalueother(Ext.getCmp('RC2').getValue(), '--', 1), ' ', 0))});
        }
        if (str_rc3_add !== "" && str_rc3_add !== undefined && str_rc3_add !== null) {

            data2Send.push({"IDCMPT": str_rc3_add, "REFBON": Ext.getCmp('REF_RC3').getValue(), "TAUX": Number(Me_Workflow.onsplitovalueother(Me_Workflow.onsplitovalueother(Ext.getCmp('RC3').getValue(), '--', 1), ' ', 0))});
        }

        if (Ext.getCmp('lg_PREENREGISTREMENT_ID').getValue() !== '0') {
            Ext.Ajax.request({
                url: url,
                params: {
                    lg_PREENREGISTREMENT_ID: Ext.getCmp('lg_PREENREGISTREMENT_ID').getValue(),
                    //int_TAUX: (Ext.getCmp('int_TAUX').getValue() <= 100 ? Ext.getCmp('int_TAUX').getValue() : 100),
                    tierspayants: Ext.encode(data2Send)
                },
                success: function (response)
                {
                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.errors_code == "0") {
                        Ext.MessageBox.alert('Error Message', object.errors);
                        return;
                    }

                    //var Vente = object.results[0];
                    var Vente = object.viewdata;
                    backend = object.backend.data;
                    partTP = object.intPARTTIERSPAYANT;
                    Ext.getCmp('authorize_cloture_vente').setValue('1');
                    Ext.getCmp('int_REMISE').setValue(Ext.util.Format.number(Vente.int_REMISE, '0,000.') + " CFA");
                    Ext.getCmp('int_NET_A_PAYER_RECAP').setValue(Ext.util.Format.number(Vente.int_NET, '0,000.') + " CFA");
                    Ext.getCmp('int_REMISE_DEVIS').setValue(Ext.util.Format.number(Vente.int_REMISE, '0,000.') + " CFA");
                    Ext.getCmp('int_PART_TIERSPAYANT').setValue(Ext.util.Format.number(Vente.int_PART_TIERSPAYANT, '0,000.') + " CFA");
                    if (Vente.int_NET == 0) {
                        Ext.getCmp('int_AMOUNT_RECU').disable();
                        Ext.getCmp('btn_loturer').enable();
                        Ext.getCmp('btn_loturer').focus();
                    } else {
                        Ext.getCmp('int_AMOUNT_RECU').enable();
                        Ext.getCmp('btn_loturer').disable();
                        Ext.getCmp('int_AMOUNT_RECU').focus();
                    }

                    if (object.message.success === 1) {
                        Ext.MessageBox.show({
                            title: 'Information',
                            width: 400,
                            msg: object.message.message,
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.WARNING,
                            fn: function (buttonId) {
                                if (buttonId === "ok") {
                                    Ext.getCmp('int_AMOUNT_RECU').focus(true, 100, function () {
                                    });
                                }
                            }
                        });
                    }
                    var typeRegl = Ext.getCmp('lg_TYPE_REGLEMENT_ID').getValue();
                    if (Vente.b_IS_AVOIR) {
                        Me_Workflow.isCredit(true);
                        if (Ext.getCmp('lg_TYPE_VENTE_ID').getValue() !== "AU COMPTANT" && Ext.getCmp('lg_TYPE_VENTE_ID').getValue() !== "1") {
                            Ext.getCmp('str_FIRST_NAME_FACTURE').setReadOnly(true);
                            Ext.getCmp('str_LAST_NAME_FACTURE').setReadOnly(true);
                            Ext.getCmp('str_FIRST_NAME_FACTURE').setValue(Ext.getCmp('str_FIRST_NAME').getValue());
                            Ext.getCmp('str_LAST_NAME_FACTURE').setValue(Ext.getCmp('str_LAST_NAME').getValue());
                        }

                        Ext.getCmp('infoFacture').show();
                    } else if (typeRegl === '4' && (Ext.getCmp('lg_TYPE_VENTE_ID').getValue() === "AU COMPTANT" && Ext.getCmp('lg_TYPE_VENTE_ID').getValue() === "1")) {
                        Ext.getCmp('int_NUMBER_FACTURE').setReadOnly(true);
                        Ext.getCmp('str_FIRST_NAME_FACTURE').setReadOnly(true);
                        Ext.getCmp('str_LAST_NAME_FACTURE').setReadOnly(true);
                        Ext.getCmp('infoFacture').show();
                    } else {
                        Ext.getCmp('infoFacture').hide();
                    }

                },
                failure: function (response) {
                    var object = Ext.JSON.decode(response.responseText, false);
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('Error Message', response.responseText);
                }
            });
        }

    },
    ReinitializeDisplay: function () {
        Ext.Ajax.request({
            url: '../webservices/sm_user/detailsvente/ws_transaction.jsp?mode=reinitializeDisplay',
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                /*if (object.errors_code == "0") {                  Ext.MessageBox.alert('Error Message', object.errors);     
                 } */
            },
            failure: function (response) {
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    },
    DoAjaxRequest: function (url, id_vente, product, quantite) {

        if (id_vente === "0") {
            var lg_NATURE_VENTE_ID = Ext.getCmp('lg_NATURE_VENTE_ID').getValue(), lg_REMISE_ID = Ext.getCmp('lg_REMISE_ID').getValue(),
                    lg_AYANTS_DROITS_ID = Ext.getCmp('lg_AYANTS_DROITS_ID').getValue(), lg_TYPE_VENTE_ID = Ext.getCmp('lg_TYPE_VENTE_ID').getValue(),
                    lg_USER_VENDEUR_ID = Ext.getCmp('lg_USER_VENDEUR_ID').getValue();
            if (my_view_titre === "Ventes" && (KEY_ACTIVATE_CONTROLE_VENTE_USER === "1") && (Ext.getCmp('lg_USER_VENDEUR_ID').getValue() === undefined ||
                    Ext.getCmp('lg_USER_VENDEUR_ID').getValue() === null || Ext.getCmp('lg_USER_VENDEUR_ID').getValue() === "")) { // code ajoute 10/03/2016
                Ext.MessageBox.alert('Attention', 'Renseignez le vendeur svp', function () {
                    Ext.getCmp('lg_USER_VENDEUR_ID').focus();
                });
                return;
            }
            if (lg_TYPE_VENTE_ID === null) {
                Ext.MessageBox.alert('Attention', 'Renseignez le type de la vente svp', function () {
                    Ext.getCmp('lg_TYPE_VENTE_ID').focus();
                });
                return;
            }
            if (lg_NATURE_VENTE_ID === null) {
                Ext.MessageBox.alert('Attention', 'Renseignez la nature de la vente svp', function () {
                    Ext.getCmp('lg_NATURE_VENTE_ID').focus();
                });
                return;
            }
            if (lg_TYPE_VENTE_ID !== "1" && lg_TYPE_VENTE_ID !== "AU COMPTANT") {
                var str_FIRST_NAME = "", str_LAST_NAME = "", listTiersPayant = "";
                if (lg_TYPE_VENTE_ID === "2") {//
                    str_FIRST_NAME = Ext.getCmp('str_FIRST_NAME_AD').getValue();
                    str_LAST_NAME = Ext.getCmp('str_LAST_NAME_AD').getValue();
                } else {
                    str_FIRST_NAME = Ext.getCmp('str_FIRST_NAME').getValue();
                    str_LAST_NAME = Ext.getCmp('str_LAST_NAME').getValue();
                }
                var str_ro_add = Ext.getCmp('RO_ID').getValue(), str_rc1_add = Ext.getCmp('RC1_ID').getValue(),
                        str_rc2_add = Ext.getCmp('RC2_ID').getValue(), str_rc3_add = Ext.getCmp('RC3_ID').getValue();
                if (str_ro_add !== "" && str_ro_add !== undefined && str_ro_add !== null) {
                    listTiersPayant += str_ro_add + ":" + Ext.getCmp('REF_RO').getValue() + ";";
                }
                if (str_rc1_add !== "" && str_rc1_add !== undefined && str_rc1_add !== null) {
                    listTiersPayant += str_rc1_add + ":" + Ext.getCmp('REF_RC1').getValue() + ";";
                }
                if (str_rc2_add !== "" && str_rc2_add !== undefined && str_rc2_add !== null) {
                    listTiersPayant += str_rc2_add + ":" + Ext.getCmp('REF_RC2').getValue() + ";";
                }
                if (str_rc3_add !== "" && str_rc3_add !== undefined && str_rc3_add !== null) {
                    listTiersPayant += str_rc3_add + ":" + Ext.getCmp('REF_RC3').getValue() + ";";
                }
                url += "&str_FIRST_NAME_FACTURE=" + str_FIRST_NAME + "&str_LAST_NAME_FACTURE=" + str_LAST_NAME + "&LstTCompteClientTiersPayant=" + listTiersPayant;
            }

            url = url + "&lg_NATURE_VENTE_ID=" + lg_NATURE_VENTE_ID + "&lg_REMISE_ID=" + lg_REMISE_ID + "&lg_AYANTS_DROITS_ID=" + lg_AYANTS_DROITS_ID + "&lg_TYPE_VENTE_ID=" + lg_TYPE_VENTE_ID + "&my_view_titre=" + my_view_titre;
        }

        Me_dovente.ShowWaitingProcess();
        Ext.Ajax.request({
            url: url,
            params: {
                lg_FAMILLE_ID: product,
                lg_PREENREGISTREMENT_ID: id_vente,
                int_QUANTITY_SERVED: quantite,
                int_QUANTITY: quantite,
                lg_USER_VENDEUR_ID: lg_USER_VENDEUR_ID,
                int_FREE_PACK_NUMBER: 0
                        //                int_FREE_PACK_NUMBER: int_FREE_PACK_NUMBER //a determiner apres la valeur des unites gratuites
            },
            success: function (response)
            {
                Me_dovente.StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.errors_code == "0") {
                    if (object.results.length > 0 && object.results[0].answer_decondition == true) {
                        Ext.MessageBox.confirm('Message',
                                object.errors,
                                function (btn) {
                                    if (btn == 'yes') {
                                        Me_Workflow.doDeconditionnement("create", url, id_vente, product, quantite);
                                    }
                                });
                    } else {
                        Ext.MessageBox.show({
                            title: "Message d'erreur",
                            width: 320,
                            msg: object.errors,
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.WARNING,
                            fn: function (buttonId) {
                                if (buttonId === "ok") {
                                    Ext.getCmp('int_QUANTITY').focus(false, 100, function () {
                                    });
                                }
                            }
                        });
                    }

                } else {
                    var Vente = object.results[0];
                    Ext.getCmp('int_PRICE').setValue(Ext.util.Format.number(Vente.int_PRICE, '0,000.') + " CFA");
                    if (id_vente === "0") {
                        Ext.getCmp('lg_PREENREGISTREMENT_ID').setValue(Vente.lg_PREENREGISTREMENT_ID);
                    }

                    //code ajouté 01/12/2016
                    Ext.getCmp('authorize_cloture_vente').setValue('0');
                    Ext.getCmp('int_AMOUNT_RECU').setValue(0);
                    Ext.getCmp('btn_loturer').disable();
                    //fin code ajouté 01/12/2016

                    Ext.getCmp('int_NUMBER_AVAILABLE_STOCK').setValue(0);
                    Ext.getCmp('lg_ZONE_GEO_ID').setValue("");
                    Ext.getCmp('str_NAME').setValue("");
                    Ext.getCmp('str_CODE').setValue("");
                    Ext.getCmp('str_NAME').getStore().load();
                    Ext.getCmp('str_CODE').getStore().load();
                    Ext.getCmp('str_NAME').focus(true, 100, function () {
                        Ext.getCmp('lg_FAMILLE_ID_VENTE').reset();
                    });
                    Ext.getCmp('int_QUANTITY').reset();
                    Me_dovente.onRechClick();
                }
            },
            failure: function (response)
            {
                Me_dovente.StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                Ext.MessageBox.show({
                    title: "Message d'erreur",
                    width: 320,
                    msg: response.responseText,
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING,
                    fn: function (buttonId) {
                        if (buttonId === "ok") {
                            Ext.getCmp('str_NAME').focus(false, 100, function () {
                            });
                        }
                    }
                });
            }
        });

    },

    //09062019

    creerUneVenteVNO: function (url, id_vente, product, quantite) {
        var param = {lg_FAMILLE_ID: product,
            lg_PREENREGISTREMENT_ID: id_vente,
            int_QUANTITY: quantite,
           isDevis: my_view_titre
        };
        if (id_vente === "0") {
            var lg_NATURE_VENTE_ID = Ext.getCmp('lg_NATURE_VENTE_ID').getValue(), lg_REMISE_ID = Ext.getCmp('lg_REMISE_ID').getValue(),
                    lg_TYPE_VENTE_ID = Ext.getCmp('lg_TYPE_VENTE_ID').getValue(),
                    lg_USER_VENDEUR_ID = Ext.getCmp('lg_USER_VENDEUR_ID').getValue();
            if (my_view_titre === "Ventes" && (KEY_ACTIVATE_CONTROLE_VENTE_USER === "1") && (Ext.getCmp('lg_USER_VENDEUR_ID').getValue() === undefined ||
                    Ext.getCmp('lg_USER_VENDEUR_ID').getValue() === null || Ext.getCmp('lg_USER_VENDEUR_ID').getValue() === "")) { // code ajoute 10/03/2016
                Ext.MessageBox.alert('Attention', 'Renseignez le vendeur svp', function () {
                    Ext.getCmp('lg_USER_VENDEUR_ID').focus();
                });
                return;
            }
            if (lg_TYPE_VENTE_ID === null) {
                Ext.MessageBox.alert('Attention', 'Renseignez le type de la vente svp', function () {
                    Ext.getCmp('lg_TYPE_VENTE_ID').focus();
                });
                return;
            }
            if (lg_NATURE_VENTE_ID === null) {
                Ext.MessageBox.alert('Attention', 'Renseignez la nature de la vente svp', function () {
                    Ext.getCmp('lg_NATURE_VENTE_ID').focus();
                });
                return;
            }
            param = {lg_FAMILLE_ID: product,
                lg_PREENREGISTREMENT_ID: id_vente,
                int_QUANTITY_SERVED: quantite,
                int_QUANTITY: quantite,
                lg_USER_VENDEUR_ID: lg_USER_VENDEUR_ID,
                lg_NATURE_VENTE_ID: lg_NATURE_VENTE_ID,
                lg_REMISE_ID: lg_REMISE_ID,
                lg_TYPE_VENTE_ID: lg_TYPE_VENTE_ID,
                isDevis: my_view_titre

            };


        }

        Me_dovente.ShowWaitingProcess();
        Ext.Ajax.request({
            url: url,
            params: {
                "mode": (id_vente === "0" ? "CREATE" : "ADDITEM"),
                "venteParams": JSON.stringify(param)
            },
            success: function (response)
            {
                Me_dovente.StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.errors_code === true) {
                    if (object.answer_decondition === true) {
                        Ext.MessageBox.confirm('Message',
                                object.errors,
                                function (btn) {
                                    if (btn == 'yes') {
                                        Me_Workflow.doDeconditionnement("create", url, id_vente, product, quantite);
                                    }
                                });
                    } else {
                        Ext.MessageBox.show({
                            title: "Message d'erreur",
                            width: 320,
                            msg: object.errors,
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.WARNING,
                            fn: function (buttonId) {
                                if (buttonId === "ok") {
                                    Ext.getCmp('int_QUANTITY').focus(false, 100, function () {
                                    });
                                }
                            }
                        });
                    }

                } else {
                    var Vente = object.results[0];
                    Ext.getCmp('int_PRICE').setValue(Ext.util.Format.number(Vente.int_PRICE, '0,000.') + " CFA");
                    if (id_vente === "0") {
                        Ext.getCmp('lg_PREENREGISTREMENT_ID').setValue(Vente.lg_PREENREGISTREMENT_ID);
                    }

                    //code ajouté 01/12/2016
                    Ext.getCmp('authorize_cloture_vente').setValue('0');
                    Ext.getCmp('int_AMOUNT_RECU').setValue(0);
                    Ext.getCmp('btn_loturer').disable();
                    //fin code ajouté 01/12/2016

                    Ext.getCmp('int_NUMBER_AVAILABLE_STOCK').setValue(0);
                    Ext.getCmp('lg_ZONE_GEO_ID').setValue("");
                    Ext.getCmp('str_NAME').setValue("");
                    Ext.getCmp('str_CODE').setValue("");
                    Ext.getCmp('str_NAME').getStore().load();
                    Ext.getCmp('str_CODE').getStore().load();
                    Ext.getCmp('str_NAME').focus(true, 100, function () {
                        Ext.getCmp('lg_FAMILLE_ID_VENTE').reset();
                    });
                    Ext.getCmp('int_QUANTITY').reset();
                    Me_dovente.onRechClick();
                }
            },
            failure: function (response)
            {
                Me_dovente.StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                Ext.MessageBox.show({
                    title: "Message d'erreur",
                    width: 320,
                    msg: response.responseText,
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING,
                    fn: function (buttonId) {
                        if (buttonId === "ok") {
                            Ext.getCmp('str_NAME').focus(false, 100, function () {
                            });
                        }
                    }
                });
            }
        });

    },

    //09062019




    displayFieldSetCreditOrNot: function (lg_TYPE_VENTE_ID) {
        switch (lg_TYPE_VENTE_ID) {
            case "1":
                Ext.getCmp('fieldset_assure').hide();
                Ext.getCmp('fieldset_identification_client').hide();
                Ext.getCmp('fieldset_ayantdroit').hide();
                Ext.getCmp('fieldset_tierpayant').hide();
                break;
            case "2":
                Ext.getCmp('fieldset_assure').show();
                Ext.getCmp('fieldset_identification_client').show();
                Ext.getCmp('fieldset_ayantdroit').show();
                Ext.getCmp('fieldset_tierpayant').show();
                break;
            case "3":
                Ext.getCmp('fieldset_assure').show();
                Ext.getCmp('fieldset_identification_client').show();
                Ext.getCmp('fieldset_ayantdroit').hide();
                Ext.getCmp('fieldset_tierpayant').show();
                break;
        }
    },
    doDeconditionnement: function (task, Ovalue_add_url, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID, int_QUANTITY) {

//        var internal_url = "../webservices/sm_user/famille/ws_transaction.jsp?mode=deconditionarticleToVente";
        var internal_url = "../Deconditionnement";
        Me_dovente.ShowWaitingProcess();
        Ext.Ajax.request({
            url: internal_url,
            params: {
                lg_FAMILLE_ID: lg_FAMILLE_ID,
                int_NUMBER_AVAILABLE: int_QUANTITY
            },
            success: function (response)
            {
                Me_dovente.StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                // alert(object.success);
                if (object.success == "0") {
                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 320,
                        msg: object.errors,
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING, fn: function (buttonId) {
                            if (buttonId === "ok") {
                                Ext.getCmp('str_NAME').focus();
                            }
                        }
                    });
                } else {
                    if (task == "create") {
                        Me_Workflow.DoAjaxRequest(Ovalue_add_url, lg_PREENREGISTREMENT_ID, lg_FAMILLE_ID, int_QUANTITY);
                    } else if (task == "update") {
                        Me_Workflow.OnGridEditor(Ovalue_add_url);
                    }
                }


            },
            failure: function (response)
            {
                Me_dovente.StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText,
                        function (btn) {
                            Ext.getCmp('str_NAME').focus();
                            Ext.getCmp('str_NAME').setFieldStyle('border: 2px solid #3892d3; background: #F1F1F1;');
                        });
            }
        });
    },
    OnGridEditor: function (url) {
        Ext.getCmp('gridpanelID_dovente').on('validateedit', function (editor, e) {

            var plugin2 = Ext.getCmp('gridpanelID_dovente').getPlugin();
            var int_PRICE_DETAIL = Number(e.record.data.int_FAMILLE_PRICE),
                    int_QUANTITY = e.record.data.int_QUANTITY,
                    int_QUANTITY_SERVED = e.record.data.int_QUANTITY_SERVED, OLDVALUE = "";
            if (e.colIdx == 5) {
                OLDVALUE = int_PRICE_DETAIL;
                int_PRICE_DETAIL = e.value;
            } else if (e.colIdx == 3) {
                OLDVALUE = int_QUANTITY;
                int_QUANTITY = e.value;
                int_QUANTITY_SERVED = int_QUANTITY;
            } else if (e.colIdx == 4) {
                OLDVALUE = int_QUANTITY_SERVED;
                int_QUANTITY_SERVED = e.value;
            }

            if (isAvoir == true && e.record.data.int_QUANTITY_SERVED > e.value) {
                // alert(e.record.data.int_QUANTITY_SERVED + "***" + e.value);
                Ext.MessageBox.alert('Erreur', 'QS ne doit pas etre superieur a QS de l\'avoir',
                        function () {
                            e.record.data.int_QUANTITY_SERVED = e.record.data.int_QUANTITY_SERVED;
                            plugin2.startEdit(e.rowIdx, e.colIdx);
                        });
                return;
            }

            if (int_QUANTITY < int_QUANTITY_SERVED) {

                /* alert(e.record.data.int_QUANTITY_SERVED + "***" + e.value);
                 return;*/
                Ext.MessageBox.alert('Erreur', 'QS ne doit pas etre superieur a QD',
                        function () {
                            e.record.data.int_QUANTITY_SERVED = e.record.data.int_QUANTITY_SERVED;
                            plugin2.startEdit(e.rowIdx, e.colIdx);
                        });
                return;
            }

            Ext.Ajax.request({
                url: url,
                params: {
                    lg_PREENREGISTREMENT_DETAIL_ID: e.record.data.lg_PREENREGISTREMENT_DETAIL_ID,
                    lg_PREENREGISTREMENT_ID: e.record.data.lg_PREENREGISTREMENT_ID,
                    int_QUANTITY: int_QUANTITY,
                    int_QUANTITY_SERVED: int_QUANTITY_SERVED,
                    int_PRICE_DETAIL: int_PRICE_DETAIL,
                    lg_FAMILLE_ID: e.record.data.lg_FAMILLE_ID
                },
                success: function (response)
                {
                    var object = Ext.JSON.decode(response.responseText, false);
                    if (object.errors_code == "0") {
                        if (object.results.length > 0 && object.results[0].answer_decondition == true) {
                            Ext.MessageBox.confirm('Message',
                                    object.errors,
                                    function (btn) {
                                        if (btn == 'yes') {
                                            // Me_Workflow.doDeconditionnement("update", url, "", "", 0);
                                            Me_Workflow.doDeconditionnement("update", "../Deconditionnement", "", "", 0);

                                        }
                                    });
                        } else {
                            Ext.MessageBox.show({
                                title: "Message d'erreur",
                                width: 320,
                                msg: object.errors,
                                buttons: Ext.MessageBox.OK,
                                icon: Ext.MessageBox.WARNING,
                                fn: function (buttonId) {
                                    if (buttonId === "ok") {
                                        if (e.colIdx == 5) {
                                            e.record.data.int_FAMILLE_PRICE = OLDVALUE;
                                        } else if (e.colIdx == 3) {
                                            e.record.data.int_QUANTITY = OLDVALUE;
                                        } else if (e.colIdx == 4) {
                                            e.record.data.int_QUANTITY_SERVED = OLDVALUE;
                                        }
                                        plugin2.startEdit(e.rowIdx, e.colIdx);
                                    }
                                }
                            });
                        }

                    } else {
                        var Vente = object.results[0];
                        //code ajouté 01/12/2016
                        if (e.record.data.int_QUANTITY > e.record.data.int_QUANTITY_SERVED) {
                            Me_Workflow.isAvoir = true;
                        } else {
                            Me_Workflow.isAvoir = false;
                        }

                        Ext.getCmp('authorize_cloture_vente').setValue('0');
                        Ext.getCmp('int_AMOUNT_RECU').setValue(0);
                        Ext.getCmp('btn_loturer').disable();
                        //fin code ajouté 01/12/2016
                        Ext.getCmp('int_PRICE').setValue(Ext.util.Format.number(Vente.int_PRICE, '0,000.') + " CFA");
                        Ext.getCmp('str_NAME').focus();
                        Ext.getCmp('int_QUANTITY').reset();
                        Me_dovente.onRechClick();
                    }
                },
                failure: function (response) {
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('Error Message', response.responseText);
                }
            });
        });
    },
    onRemoveClickNew: function (grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmer la suppresssion',
                function (btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: '../webservices/sm_user/detailsvente/ws_transactionNew.jsp?mode=delete',
                            params: {
                                lg_PREENREGISTREMENT_DETAIL_ID: rec.get('lg_PREENREGISTREMENT_DETAIL_ID'),
                                lg_PREENREGISTREMENT_ID: rec.get('lg_PREENREGISTREMENT_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.errors_code == "0") {
                                    Ext.MessageBox.show({
                                        title: "Message d'erreur",
                                        width: 320,
                                        msg: object.errors,
                                        buttons: Ext.MessageBox.OK,
                                        icon: Ext.MessageBox.WARNING, fn: function (buttonId) {
                                            if (buttonId === "ok") {
                                                Ext.getCmp('str_NAME').focus(false, 100, function () {
                                                });
                                            }
                                        }
                                    });
                                    return;
                                }
                                var Vente = object.results[0];
                                Ext.getCmp('int_PRICE').setValue(Ext.util.Format.number(Vente.int_PRICE, '0,000.') + " CFA");
                                //code ajouté 01/12/2016
                                Ext.getCmp('authorize_cloture_vente').setValue('0');
                                Ext.getCmp('int_AMOUNT_RECU').setValue(0);
                                Ext.getCmp('btn_loturer').disable();
                                Ext.getCmp('str_NAME').focus();
                                //fin code ajouté 01/12/2016

                                Me_dovente.onRechClick();
                            },
                            failure: function (response)
                            {

                                var object = Ext.JSON.decode(response.responseText, false);
                                Ext.MessageBox.show({
                                    title: "Message d'erreur",
                                    width: 320,
                                    msg: response.responseText,
                                    buttons: Ext.MessageBox.OK,
                                    icon: Ext.MessageBox.WARNING,
                                    fn: function (buttonId) {
                                        if (buttonId === "ok") {
                                            Ext.getCmp('str_NAME').focus(false, 100, function () {
                                            });
                                        }
                                    }
                                });
                            }
                        });
                        return;
                    }
                });
    },
    onRemoveClick: function (grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmer la suppresssion',
                function (btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: '../webservices/sm_user/detailsvente/ws_transaction.jsp?mode=delete',
                            params: {
                                lg_PREENREGISTREMENT_DETAIL_ID: rec.get('lg_PREENREGISTREMENT_DETAIL_ID')

                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.errors_code == "0") {
                                    Ext.MessageBox.show({
                                        title: "Message d'erreur",
                                        width: 320,
                                        msg: object.errors,
                                        buttons: Ext.MessageBox.OK,
                                        icon: Ext.MessageBox.WARNING, fn: function (buttonId) {
                                            if (buttonId === "ok") {
                                                Ext.getCmp('str_NAME').focus(false, 100, function () {
                                                });
                                            }
                                        }
                                    });
                                    return;
                                }
                                var Vente = object.results[0];
                                Ext.getCmp('int_PRICE').setValue(Ext.util.Format.number(Vente.int_PRICE, '0,000.') + " CFA");
                                //code ajouté 01/12/2016
                                Ext.getCmp('authorize_cloture_vente').setValue('0');
                                Ext.getCmp('int_AMOUNT_RECU').setValue(0);
                                Ext.getCmp('btn_loturer').disable();
                                Ext.getCmp('str_NAME').focus();
                                //fin code ajouté 01/12/2016

                                Me_dovente.onRechClick();
                            },
                            failure: function (response)
                            {

                                var object = Ext.JSON.decode(response.responseText, false);
                                Ext.MessageBox.show({
                                    title: "Message d'erreur",
                                    width: 320,
                                    msg: response.responseText,
                                    buttons: Ext.MessageBox.OK,
                                    icon: Ext.MessageBox.WARNING,
                                    fn: function (buttonId) {
                                        if (buttonId === "ok") {
                                            Ext.getCmp('str_NAME').focus(false, 100, function () {
                                            });
                                        }
                                    }
                                });
                            }
                        });
                        return;
                    }
                });
    },
    updateRemise: function (url, lg_PREENREGISTREMENT_ID, lg_REMISE_ID) {
        Ext.Ajax.request({
            url: url,
            params: {
                lg_PREENREGISTREMENT_ID: lg_PREENREGISTREMENT_ID,
                lg_REMISE_ID: lg_REMISE_ID
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.errors_code == "0") {
                    Ext.MessageBox.show({
                        title: "Message d'erreur",
                        width: 320,
                        msg: object.errors,
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING,
                        fn: function (buttonId) {
                            if (buttonId === "ok") {
                                Ext.getCmp('lg_REMISE_ID').focus(false, 100, function () {
                                });
                            }
                        }});
                }
                //code ajouté 01/12/2016
                Ext.getCmp('authorize_cloture_vente').setValue('0');
                Ext.getCmp('int_AMOUNT_RECU').setValue(0);
                Ext.getCmp('btn_loturer').disable();
                Ext.getCmp('str_NAME').focus();
                //fin code ajouté 01/12/2016
            },
            failure: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                Ext.MessageBox.show({
                    title: "Message d'erreur",
                    width: 320,
                    msg: response.responseText,
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING,
                    fn: function (buttonId) {
                        if (buttonId === "ok") {
                            Ext.getCmp('lg_REMISE_ID').focus(false, 100, function () {
                            });
                        }
                    }
                });
            }
        });
    },
    addTierspayantToVente: function (lg_PREENREGISTREMENT_ID, lg_COMPTE_CLIENT_TIERS_PAYANT_ID, int_TAUX, int_PRICE) {
        Ext.Ajax.request({
            url: '../webservices/sm_user/detailsvente/ws_transaction.jsp?mode=addtierspayant',
            params: {
                lg_PREENREGISTREMENT_ID: lg_PREENREGISTREMENT_ID,
                lg_COMPTE_CLIENT_TIERS_PAYANT_ID: lg_COMPTE_CLIENT_TIERS_PAYANT_ID,
                int_TAUX: int_TAUX,
                int_TAUX_CHANGE: int_PRICE
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.errors_code == "0") {
                    Ext.MessageBox.show({
                        title: "Message d'erreur",
                        width: 320,
                        msg: object.errors,
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING
                    });
                    return;
                }
//                Me_Workflow.updateTaux(int_TAUX);// a decommenter en cas de probleme 19/12/2016
                Me_Workflow.updateTaux();
            },
            failure: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                Ext.MessageBox.show({
                    title: "Message d'erreur",
                    width: 320,
                    msg: response.responseText,
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING
                });
            }
        });
    },
    removeTierspayantToVente: function (lg_PREENREGISTREMENT_ID, id_label_tp, id_compteclient_tp, id_ref_bon) {
        var OComponentLabelTP = Me_Workflow.GetComponentById(id_label_tp),
                OComponentCOMPTECLIENTTP = Me_Workflow.GetComponentById(id_compteclient_tp),
                OComponentRefbon = Me_Workflow.GetComponentById(id_ref_bon);
        if (lg_PREENREGISTREMENT_ID == "0") {
            Me_Workflow.resetTierspayant(OComponentLabelTP, OComponentCOMPTECLIENTTP, OComponentRefbon);
            return;
        }
        Ext.Ajax.request({
            url: '../webservices/sm_user/detailsvente/ws_transaction.jsp?mode=removetierspayant',
            params: {
                lg_PREENREGISTREMENT_ID: lg_PREENREGISTREMENT_ID,
                lg_COMPTE_CLIENT_TIERS_PAYANT_ID: OComponentCOMPTECLIENTTP.getValue()
            },
            success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.errors_code == "0") {
                    Ext.MessageBox.show({
                        title: "Message d'erreur",
                        width: 320,
                        msg: object.errors,
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING
                    });
                    return;
                }
                Me_Workflow.resetTierspayant(OComponentLabelTP, OComponentCOMPTECLIENTTP, OComponentRefbon);
            },
            failure: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                Ext.MessageBox.show({
                    title: "Message d'erreur",
                    width: 320,
                    msg: response.responseText,
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING});
            }
        });
    },
    resetTierspayant: function (OComponentLabelTP, OComponentCOMPTECLIENTTP, OComponentRefbon) {
        var int_TAUX = Me_Workflow.onsplitovalueother(OComponentLabelTP.getValue(), '--', 1);
        int_TAUX = Me_Workflow.onsplitovalueother(int_TAUX, ' ', 0);
        //    alert(Number(Ext.getCmp('int_TAUX').getValue()) + "****" + Number(int_TAUX) + "|||||" +Ext.getCmp('int_TAUX').getValue());
        Ext.getCmp('int_TAUX').setValue(Number(Ext.getCmp('int_TAUX').getValue()) - Number(int_TAUX) >= 0 ? Number(Ext.getCmp('int_TAUX').getValue()) - Number(int_TAUX) : 0);
        //  alert("apres:"+Ext.getCmp('int_TAUX').getValue());
        OComponentLabelTP.reset();
        OComponentCOMPTECLIENTTP.reset();
        OComponentRefbon.reset();
        OComponentRefbon.hide();
    },
    UpdateTypeVente: function (url, lg_PREENREGISTREMENT_ID, lg_TYPE_VENTE_ID) {
        Ext.Ajax.request({
            url: url,
            params: {
                lg_PREENREGISTREMENT_ID: lg_PREENREGISTREMENT_ID,
                lg_TYPE_VENTE_ID: lg_TYPE_VENTE_ID
            }, success: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.errors_code == "0") {
                    Ext.MessageBox.show({
                        title: "Message d'erreur",
                        width: 320,
                        msg: object.errors,
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING
                    });
                    return;
                }
                Me_Workflow.ChangeViewTitle(lg_TYPE_VENTE_ID);
                Ext.getCmp('str_NUMERO_SECURITE_SOCIAL').reset();
                Ext.getCmp('str_FIRST_NAME').reset();
                Ext.getCmp('str_LAST_NAME').reset();
                Ext.getCmp('str_NUMERO_SECURITE_SOCIAL_AD').reset();
                Ext.getCmp('str_FIRST_NAME_AD').reset();
                Ext.getCmp('str_LAST_NAME_AD').reset();
                /* Ajoute le 12/01/2017  */
                Ext.getCmp('RO').reset();
                Ext.getCmp('RC1').reset();
                Ext.getCmp('RC2').reset();
                Ext.getCmp('RC3').reset();
                Ext.getCmp('int_TAUX').reset();
                Ext.getCmp('RO_ID').reset();
                Ext.getCmp('RC1_ID').reset();
                Ext.getCmp('RC2_ID').reset();
                Ext.getCmp('RC3_ID').reset();

                /*   fin 12/01/2017                      */
            },
            failure: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                Ext.MessageBox.show({
                    title: "Message d'erreur",
                    width: 320,
                    msg: response.responseText,
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING
                });
            }
        });
    },
    LoadApp: function (url, lg_PREENREGISTREMENT_ID, record) {

        Me_Workflow.venteTierspayant = [];
        Me_Workflow.tierspayants = [];
        Ext.Ajax.request({
            url: url,
            params: {
                lg_PREENREGISTREMENT_ID: lg_PREENREGISTREMENT_ID
            },
            success: function (response)
            {
                Ext.getCmp('reglementDevis').hide();
                var objectBase = Ext.JSON.decode(response.responseText, false);
                var object = objectBase.results[0];
                console.log(object, url);
                //                alert(record.b_IS_AVOIR + " |||| "+record.lg_TYPE_VENTE_ID);

                Ext.getCmp('lg_PREENREGISTREMENT_ID').setValue(lg_PREENREGISTREMENT_ID);
                Ext.getCmp('lg_USER_VENDEUR_ID').setValue(record.lg_USER_VENDEUR_ID);
                Ext.getCmp('lg_TYPE_REMISE_ID').setValue(object.lg_TYPE_REMISE_ID);
                Ext.getCmp('lg_REMISE_ID').setValue(object.lg_REMISE_ID);
                Ext.getCmp('int_PRICE').setValue(Ext.util.Format.number(object.int_PRICE, '0,000.') + ' CFA');
                if (record.lg_TYPE_VENTE_ID != "1") {


                    Ext.getCmp('str_NUMERO_SECURITE_SOCIAL').setValue(object.str_NUMERO_SECURITE_SOCIAL);
                    Ext.getCmp('str_FIRST_NAME').setValue(object.str_FIRST_NAME);
                    Ext.getCmp('str_LAST_NAME').setValue(object.str_LAST_NAME);
                    Ext.getCmp('lg_COMPTE_CLIENT_ID').setValue(object.lg_COMPTE_CLIENT_ID);
                    Ext.getCmp('lg_CLIENT_ID_FIND').setValue(object.lg_CLIENT_ID);
                    if (record.lg_TYPE_VENTE_ID == "2") {
                        Ext.getCmp('str_FIRST_NAME_AD').setValue(object.str_FIRST_NAME_AD);
                        Ext.getCmp('str_LAST_NAME_AD').setValue(object.str_LAST_NAME_AD);
                        Ext.getCmp('str_NUMERO_SECURITE_SOCIAL_AD').setValue(object.str_NUMERO_SECURITE_SOCIAL_AD);
                        Ext.getCmp('lg_AYANTS_DROITS_ID').setValue(object.lg_AYANTS_DROITS_ID);
                        Ext.getCmp('lg_TYPE_VENTE_ID').setValue("ASSURANCE_MUTUELLE");
                    } else {
                        Ext.getCmp('lg_TYPE_VENTE_ID').setValue("CARNET");
                    }

                    //  alert(object.Tierspayant.length);
                    var Client, int_PRIORITY, int_POURCENTAGE, str_FULLNAME, lg_COMPTE_TIERS_PAYANT_ID;

                    for (var i = 0; i < object.Tierspayant.length; i++) {

                        Client = object.Tierspayant[i];
                        int_PRIORITY = Client.int_PRIORITY;
                        int_POURCENTAGE = Client.int_POURCENTAGE;
                        str_FULLNAME = Client.str_TIERS_PAYANT_NAME;
                        lg_COMPTE_TIERS_PAYANT_ID = Client.lg_COMPTE_TIERS_PAYANT_ID;

                        if (int_PRIORITY == 1) {
                            Ext.getCmp('RO').setValue(str_FULLNAME + '--' + int_POURCENTAGE + ' %');
                            Ext.getCmp('REF_RO').show();
                            Ext.getCmp('RO_ID').setValue(lg_COMPTE_TIERS_PAYANT_ID);
                        } else {

                            Ext.getCmp('RC' + i).setValue(str_FULLNAME + '--' + int_POURCENTAGE + ' %');
                            Ext.getCmp('REF_RC' + i).show();
                            Ext.getCmp('RC' + i + '_ID').setValue(lg_COMPTE_TIERS_PAYANT_ID);
                        }

                    }
                    Me_Workflow.updateTaux();
                    Me_Workflow.displayFieldSetCreditOrNot(record.lg_TYPE_VENTE_ID);
                } else {
                    Ext.getCmp('lg_TYPE_VENTE_ID').setValue("AU COMPTANT");
                    if (record.str_STATUT == "devis") {
                        Ext.getCmp('str_NUMERO_SECURITE_SOCIAL').setValue(object.str_NUMERO_SECURITE_SOCIAL);
                        Ext.getCmp('str_FIRST_NAME').setValue(object.str_FIRST_NAME);
                        Ext.getCmp('str_LAST_NAME').setValue(object.str_LAST_NAME);
                        Ext.getCmp('lg_COMPTE_CLIENT_ID').setValue(object.lg_COMPTE_CLIENT_ID);
                        Ext.getCmp('lg_CLIENT_ID_FIND').setValue(object.lg_CLIENT_ID);
                        Ext.getCmp('fieldset_assure').show();
                        Ext.getCmp('fieldset_assure').setTitle('<span style="color:blue;">CLIENT</span>');
                        Ext.getCmp('reglementDevis').show();
                        Ext.getCmp('int_REMISE_DEVIS').setValue(Ext.util.Format.number(record.int_PRICE_REMISE, '0,000.') + ' CFA');

                    }
                }
                if (record.b_IS_AVOIR == true && record.str_STATUT == "is_Closed") {
                    Me_Workflow.ManageAvoir(object);
                }

                Me_dovente.onRechClick();
                Ext.getCmp('str_NAME').focus();
            },
            failure: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                Ext.MessageBox.alert('Error Message', response.responseText,
                        function (btn) {
                            Ext.getCmp('str_NAME').focus();
                            Ext.getCmp('str_NAME').setFieldStyle('border: 2px solid #3892d3; background: #F1F1F1;');
                        });
            }
        });
    },
    ManageDisplayAvoir: function (display) {
        var disable = false;
        if (display) {
            if (Ext.getCmp('str_FIRST_NAME').getValue() != "1" && Ext.getCmp('str_FIRST_NAME').getValue() == "AU COMPTANT") {
                disable = true;
                Ext.getCmp('int_NUMBER_FACTURE').focus(true, 100, function () {
                    Ext.getCmp('int_NUMBER_FACTURE').setFieldStyle('border: 2px solid #3892d3; background: #F1F1F1;');
                });
            } else {
                Ext.getCmp('str_FIRST_NAME_FACTURE').setValue(Ext.getCmp('str_FIRST_NAME').getValue());
                Ext.getCmp('str_LAST_NAME_FACTURE').setValue(Ext.getCmp('str_LAST_NAME').getValue());
            }
            Ext.getCmp('str_FIRST_NAME_FACTURE').setReadOnly(disable);
            Ext.getCmp('str_LAST_NAME_FACTURE').setReadOnly(disable);
            Ext.getCmp('infoFacture').show();
        } else {
            Ext.getCmp('infoFacture').hide();
        }

    },
    ManageAvoir: function (object) {
        Ext.getCmp('infoFacture').setTitle("INFOS SUR L'AVOIR");
        Ext.getCmp('str_FIRST_NAME_FACTURE').disable();
        Ext.getCmp('str_LAST_NAME_FACTURE').disable();
        Ext.getCmp('int_NUMBER_FACTURE').disable();
        Ext.getCmp('str_FIRST_NAME_FACTURE').setFieldStyle('color: blue;');
        Ext.getCmp('str_LAST_NAME_FACTURE').setFieldStyle('color: blue;');
        Ext.getCmp('int_NUMBER_FACTURE').setFieldStyle('color: blue;');
        Ext.getCmp('str_FIRST_NAME_FACTURE').setValue(object.str_FIRST_NAME);
        Ext.getCmp('str_LAST_NAME_FACTURE').setValue(object.str_LAST_NAME);
        Ext.getCmp('int_NUMBER_FACTURE').setValue(object.str_PHONE);
        Ext.getCmp('str_NAME').disable();
        Ext.getCmp('str_CODE').disable();
        Ext.getCmp('lg_TYPE_VENTE_ID').disable();
        Ext.getCmp('lg_NATURE_VENTE_ID').disable();
        Ext.getCmp('lg_REMISE_ID').disable();
        Ext.getCmp('lg_TYPE_REMISE_ID').disable();
        Ext.getCmp('int_QUANTITY').disable();
        Ext.getCmp('lg_USER_VENDEUR_ID').disable();
        Ext.getCmp('infoFacture').show();
        Ext.getCmp('reglementID').hide();
        Ext.getCmp('btn_loturer').enable();
        Ext.getCmp('fieldset_identification_client').hide();
        Ext.getCmp('btn_modifier_info').hide();
        Ext.getCmp('btn_add_affilie').hide();
        Ext.getCmp('fieldset_tierpayant').hide();
    },
    //gestion du type reglement
    ManagneTypereglement: function (lg_TYPE_REGLEMENT_ID, int_AMOUNT_RECU) {
        Ext.getCmp('int_AMOUNT_REMIS').reset();
        Ext.getCmp('int_AMOUNT_RECU').reset();


        if (lg_TYPE_REGLEMENT_ID !== "1" && lg_TYPE_REGLEMENT_ID !== "Especes") { // différent de espece
            if (lg_TYPE_REGLEMENT_ID === "2" || lg_TYPE_REGLEMENT_ID === "3") {
                Ext.getCmp('str_NOM').show();
                Ext.getCmp('str_BANQUE').show();
                Ext.getCmp('str_LIEU').show();
                Ext.getCmp('str_CODE_MONNAIE').hide();
                Ext.getCmp('str_LIEU').setFieldLabel("LIEU:");
                if (Ext.getCmp('lg_TYPE_VENTE_ID').getValue() === "1" || Ext.getCmp('lg_TYPE_VENTE_ID').getValue() == "AU COMPTANT") {
                    Ext.getCmp('fieldset_identification_client').hide();
                }
                if (Me_Workflow.isAvoir === false) {
                    Ext.getCmp('infoFacture').hide();
                }
            } else if (lg_TYPE_REGLEMENT_ID === "4") {
                Ext.getCmp('str_NOM').hide();
                Ext.getCmp('str_BANQUE').hide();
                Ext.getCmp('str_LIEU').show();
                Ext.getCmp('str_CODE_MONNAIE').hide();
                Ext.getCmp('str_LIEU').setFieldLabel("COMMENTAIRE:");
                if (Ext.getCmp('lg_TYPE_VENTE_ID').getValue() === "1" || Ext.getCmp('lg_TYPE_VENTE_ID').getValue() === "AU COMPTANT") {
                    Ext.getCmp('lg_CLIENT_ID').focus(false, 100, function () {
                        Ext.getCmp('lg_CLIENT_ID').reset();
                        Ext.getCmp('lg_CLIENT_ID').setFieldStyle('border: 2px solid #C0C0C0; background: #FFFFFF;');
                    });
                    Ext.getCmp('fieldset_identification_client').show();
                } else {
                    Ext.getCmp('str_LIEU').focus(false, 100, function () {
                        Ext.getCmp('str_LIEU').reset();
                        Ext.getCmp('str_LIEU').setFieldStyle('border: 2px solid #C0C0C0; background: #FFFFFF;');
                    });
                }
            } else if (lg_TYPE_REGLEMENT_ID === "5") {
                Ext.getCmp('str_NOM').hide();
                Ext.getCmp('str_BANQUE').hide();
                Ext.getCmp('str_LIEU').hide();
                Ext.getCmp('str_CODE_MONNAIE').show();
                if (Ext.getCmp('lg_TYPE_VENTE_ID').getValue() === "1" || Ext.getCmp('lg_TYPE_VENTE_ID').getValue() === "AU COMPTANT") {
                    Ext.getCmp('fieldset_identification_client').hide();
                }
                if (Me_Workflow.isAvoir === false) {
                    Ext.getCmp('infoFacture').hide();
                }
            }
        } else {
            Ext.getCmp('str_NOM').hide();
            Ext.getCmp('str_BANQUE').hide();
            Ext.getCmp('str_LIEU').hide();
            Ext.getCmp('str_CODE_MONNAIE').hide();
            if (Ext.getCmp('lg_TYPE_VENTE_ID').getValue() === "1" || Ext.getCmp('lg_TYPE_VENTE_ID').getValue() === "AU COMPTANT") {
                Ext.getCmp('fieldset_identification_client').hide();
            }
            if (Me_Workflow.isAvoir === false) {
                Ext.getCmp('infoFacture').hide();
            }
        }
        Me_Workflow.CalculateMontantRemis(lg_TYPE_REGLEMENT_ID, int_AMOUNT_RECU);
    },
    CalculateMontantRemis: function (lg_TYPE_REGLEMENT_ID, int_AMOUNT_RECU) {
        var int_RESTE = 0;
        if (lg_TYPE_REGLEMENT_ID === "2" || lg_TYPE_REGLEMENT_ID === "3") {
            Ext.getCmp('int_AMOUNT_RECU').setValue(Me_Workflow.onsplitovalueother(Ext.getCmp('int_NET_A_PAYER_RECAP').getValue().replace(/\./g, ''), ' ', 0));
            Ext.getCmp('int_AMOUNT_RECU').disable();
            Ext.getCmp('btn_loturer').enable();
        } else {
            Ext.getCmp('int_AMOUNT_RECU').enable();
            if (lg_TYPE_REGLEMENT_ID === "4") {
                Ext.getCmp('btn_loturer').enable();
            } else {
                // alert(Me_Workflow.onsplitovalueother(Ext.getCmp('int_NET_A_PAYER_RECAP').getValue().replace('.', ''), ' ', 0) + '|||' + Me_Workflow.onsplitovalueother(Ext.getCmp('int_NET_A_PAYER_RECAP').getValue(), ' ', 1));
                int_RESTE = (int_AMOUNT_RECU * Number(Ext.getCmp('int_TAUX_CHANGE').getValue())) - Number(Me_Workflow.onsplitovalueother(Ext.getCmp('int_NET_A_PAYER_RECAP').getValue().replace(/\./g, ''), ' ', 0));
                //alert(int_RESTE);
                if (int_RESTE >= 0) {
                    Ext.getCmp('btn_loturer').enable();
                } else {
                    Ext.getCmp('btn_loturer').disable();
                }
                Ext.getCmp('int_AMOUNT_REMIS').setValue(int_RESTE < 0 ? 0 : int_RESTE);
            }
        }
    },
    onbtnclotureravoir: function (url, lg_PREENREGISTREMENT_ID) {

        if (Ext.getCmp('str_FIRST_NAME_FACTURE').getValue() === null || Ext.getCmp('str_FIRST_NAME_FACTURE').getValue() === undefined || Ext.getCmp('str_FIRST_NAME_FACTURE').getValue() === "") {
            Ext.MessageBox.show({title: 'Avertissement',
                width: 320,
                msg: 'Veuillez saisir le nom',
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING,
                fn: function (buttonId) {
                    if (buttonId === "ok") {
                        Ext.getCmp('str_FIRST_NAME_FACTURE').focus(false, 100, function () {

                            // Ext.getCmp('str_FIRST_NAME_FACTURE').setFieldStyle('border: 2px solid #C0C0C0; background: #FFFFFF;');
                        });
                    }
                }



            });
            return false;
        }


        ///


        if (Ext.getCmp('str_LAST_NAME_FACTURE').getValue() === null || Ext.getCmp('str_LAST_NAME_FACTURE').getValue() === undefined || Ext.getCmp('str_LAST_NAME_FACTURE').getValue() === "") {
            Ext.MessageBox.show({title: 'Avertissement',
                width: 320,
                msg: 'Veuillez saisir le Prenom',
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING,
                fn: function (buttonId) {
                    if (buttonId === "ok") {
                        Ext.getCmp('str_LAST_NAME_FACTURE').focus(false, 100, function () {

                            Ext.getCmp('str_LAST_NAME_FACTURE').setFieldStyle('border: 2px solid #C0C0C0; background: #FFFFFF;');
                        });
                    }
                }

            });
            return false;
        }
        if (Ext.getCmp('int_NUMBER_FACTURE').getValue() === null || Ext.getCmp('int_NUMBER_FACTURE').getValue() === undefined || Ext.getCmp('int_NUMBER_FACTURE').getValue() === "") {
            Ext.MessageBox.show({title: 'Avertissement',
                width: 320,
                msg: 'Veuillez saisir le numero de telephone',
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING,
                fn: function (buttonId) {
                    if (buttonId === "ok") {
                        Ext.getCmp('int_NUMBER_FACTURE').focus(false, 100, function () {

                            Ext.getCmp('int_NUMBER_FACTURE').setFieldStyle('border: 2px solid #C0C0C0; background: #FFFFFF;');
                        });
                    }
                }

            });
            return false;
        }

        Me_dovente.ShowWaitingProcess();
        Ext.Ajax.request({
            //                url: '../webservices/sm_user/detailsvente/ws_transaction.jsp?mode=clotureravoir',
            url: url,
            params: {
                lg_PREENREGISTREMENT_ID: lg_PREENREGISTREMENT_ID
            },
            success: function (response)
            {
                Me_dovente.StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.errors_code == "0") {
                    Ext.MessageBox.alert('Error Message', object.errors);
                    Ext.getCmp('btn_loturer').enable();
                    return;
                } else {
                    Ext.MessageBox.alert('Information', object.errors, function () {
                        var xtype = "venteavoirmanager";
                        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
                    });
                }
            },
            failure: function (response) {
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    },
    onbtncloturevente: function (url, lg_PREENREGISTREMENT_ID) {
        /* 06/11/2016  */
        if (Me_Workflow.isCREDITTRANSACTION) {
            if (Ext.getCmp('str_FIRST_NAME_FACTURE').getValue() === "") {
                Ext.MessageBox.show({title: 'Avertissement',
                    width: 320,
                    msg: 'Veuillez saisir le nom',
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING,
                    fn: function (buttonId) {
                        if (buttonId === "ok") {
                            Ext.getCmp('str_FIRST_NAME_FACTURE').focus();

                        }
                    }

                });
                return false;
            }

            if (Ext.getCmp('str_LAST_NAME_FACTURE').getValue() === "") {
                Ext.MessageBox.show({title: 'Avertissement',
                    width: 320,
                    msg: 'Veuillez saisir le Prenom',
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING,
                    fn: function (buttonId) {
                        if (buttonId === "ok") {
                            Ext.getCmp('str_LAST_NAME_FACTURE').focus(false, 100, function () {

//                                Ext.getCmp('str_LAST_NAME_FACTURE').setFieldStyle('border: 2px solid #C0C0C0; background: #FFFFFF;');
                            });
                        }
                    }

                });
                return false;
            }
            if (Ext.getCmp('int_NUMBER_FACTURE').getValue() === "") {
                Ext.MessageBox.show({title: 'Avertissement',
                    width: 320,
                    msg: 'Veuillez saisir le numero de telephone',
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING,
                    fn: function (buttonId) {
                        if (buttonId === "ok") {
                            Ext.getCmp('int_NUMBER_FACTURE').focus(false, 100, function () {

//                                Ext.getCmp('int_NUMBER_FACTURE').setFieldStyle('border: 2px solid #C0C0C0; background: #FFFFFF;');
                            });
                        }
                    }

                });
                return false;
            }
        }
        var listTiersPayant = "", lg_TYPE_VENTE_ID = Ext.getCmp('lg_TYPE_VENTE_ID').getValue(),
                lg_USER_VENDEUR_ID = Ext.getCmp('lg_USER_VENDEUR_ID').getValue(),
                lg_TYPE_REGLEMENT_ID = Ext.getCmp('lg_TYPE_REGLEMENT_ID').getValue(),
                str_FIRST_NAME_FACTURE = Ext.getCmp('str_FIRST_NAME_FACTURE').getValue(),
                str_LAST_NAME_FACTURE = Ext.getCmp('str_LAST_NAME_FACTURE').getValue(),
                int_NUMBER_FACTURE = Ext.getCmp('int_NUMBER_FACTURE').getValue(),
                int_AMOUNT_REMIS = Ext.getCmp('int_AMOUNT_REMIS').getValue(),
                int_NET_A_PAYER_RECAP = Number(Me_Workflow.onsplitovalueother(Ext.getCmp('int_NET_A_PAYER_RECAP').getValue().replace(/\./g, ''), ' ', 0)),
//                int_NET_A_PAYER_RECAP = Number(Me_Workflow.onsplitovalue(Ext.getCmp('int_NET_A_PAYER_RECAP').getValue().replace('.', ''), ' ')),
                int_AMOUNT_RECU = 0;

//          return;
        if (Ext.getCmp('authorize_cloture_vente').getValue() == '0') {
            Ext.MessageBox.alert('Erreur', '<span style="color:red;">Veuillez calculer &agrave; nouveau le <b>NET A PAYER</b></span>',
                    function (btn) {
                        Ext.getCmp('str_NAME').focus();
                    });
            return;
        }

        if (Ext.getCmp('int_AMOUNT_RECU').getValue() != null && Ext.getCmp('int_AMOUNT_RECU').getValue() != "") {
            int_AMOUNT_RECU = Number(Ext.getCmp('int_AMOUNT_RECU').getValue());
        }

        if (lg_TYPE_VENTE_ID === null) {
            Ext.MessageBox.alert('Attention', 'Renseignez le type de vente svp',
                    function (btn) {
                        Ext.getCmp('lg_TYPE_VENTE_ID').focus();
                    });
            return;
        }
        if ((KEY_ACTIVATE_CONTROLE_VENTE_USER === "1") && (lg_USER_VENDEUR_ID === undefined ||
                lg_USER_VENDEUR_ID === null || lg_USER_VENDEUR_ID == "")) { // code ajoute 10/03/2016
            Ext.MessageBox.alert('Attention', 'Renseignez le vendeur svp', function () {
                Ext.getCmp('lg_USER_VENDEUR_ID').focus();
            });
            return;
        }
        if (lg_TYPE_REGLEMENT_ID == null) {
            Ext.MessageBox.alert('Attention', 'Renseignez le type de r&egrave;glement svp',
                    function (btn) {
                        Ext.getCmp('lg_TYPE_REGLEMENT_ID').focus();
                    });
            return;
        }
        var comptclientdata = [];
        if (lg_TYPE_VENTE_ID !== "1" && lg_TYPE_VENTE_ID !== "AU COMPTANT") {
            var str_ro_add = Ext.getCmp('RO_ID').getValue(), str_rc1_add = Ext.getCmp('RC1_ID').getValue(),
                    str_rc2_add = Ext.getCmp('RC2_ID').getValue(), str_rc3_add = Ext.getCmp('RC3_ID').getValue();
            if (str_ro_add !== "" && str_ro_add !== undefined && str_ro_add !== null) {
                listTiersPayant += str_ro_add + ":" + Ext.getCmp('REF_RO').getValue() + ";";
                comptclientdata.push({"IDCMPT": str_ro_add, "REFBON": Ext.getCmp('REF_RO').getValue()});
            }
            if (str_rc1_add !== "" && str_rc1_add !== undefined && str_rc1_add !== null) {
                listTiersPayant += str_rc1_add + ":" + Ext.getCmp('REF_RC1').getValue() + ";";
                comptclientdata.push({"IDCMPT": str_rc1_add, "REFBON": Ext.getCmp('REF_RC1').getValue()});
            }
            if (str_rc2_add !== "" && str_rc2_add !== undefined && str_rc2_add !== null) {
                listTiersPayant += str_rc2_add + ":" + Ext.getCmp('REF_RC2').getValue() + ";";
                comptclientdata.push({"IDCMPT": str_rc2_add, "REFBON": Ext.getCmp('REF_RC2').getValue()});
            }
            if (str_rc3_add !== "" && str_rc3_add !== undefined && str_rc3_add !== null) {
                listTiersPayant += str_rc3_add + ":" + Ext.getCmp('REF_RC3').getValue() + ";";
                comptclientdata.push({"IDCMPT": str_rc3_add, "REFBON": Ext.getCmp('REF_RC3').getValue()});
            }
        }

        if (lg_TYPE_REGLEMENT_ID === "4") {
            if ((lg_TYPE_VENTE_ID === "1" || lg_TYPE_VENTE_ID === "AU COMPTANT") && (Ext.getCmp('str_FIRST_NAME').getValue() === "" && Ext.getCmp('str_LAST_NAME').getValue() === "")) {
                Ext.MessageBox.show({
                    title: 'Avertissement',
                    width: 320,
                    msg: 'Veuillez renseigner les informations du clients',
                    buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING,
                    fn: function (buttonId) {
                        if (buttonId === "ok") {
                            Ext.getCmp('lg_CLIENT_ID').focus(false, 100, function () {
//                                Ext.getCmp('lg_CLIENT_ID').setFieldStyle('border: 2px solid #C0C0C0; background: #FFFFFF;');
                            });
                        }
                    }});
                return;
            }
        } else {
            if (int_AMOUNT_RECU < int_NET_A_PAYER_RECAP) {
                Ext.MessageBox.show({
                    title: 'Erreur',
                    width: 320,
                    msg: 'Veuillez saisir montant sup&eacute;rieur au net &agrave; payer',
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING,
                    fn: function (buttonId) {
                        if (buttonId === "ok") {
                            Ext.getCmp('int_AMOUNT_RECU').focus(false, 100, function () {
//                                Ext.getCmp('int_AMOUNT_RECU').setFieldStyle('border: 2px solid #C0C0C0; background: #FFFFFF;');
                            });
                        }
                    }});
                return;
            }
        }

        Me_dovente.ShowWaitingProcess();
        Ext.Ajax.request({
            url: url,
            params: {
                int_TOTAL_VENTE_RECAP: int_NET_A_PAYER_RECAP,
                lg_PREENREGISTREMENT_ID: lg_PREENREGISTREMENT_ID,
                lg_TYPE_REGLEMENT_ID: lg_TYPE_REGLEMENT_ID,
                int_AMOUNT_RECU: Number(Ext.getCmp('int_AMOUNT_RECU').getValue()),
//                int_AMOUNT_REMIS: Number(Me_Workflow.onsplitovalueother(int_AMOUNT_REMIS.replace('.', ''), ' ', 0)),
                int_AMOUNT_REMIS: Number(Me_Workflow.onsplitovalueother(int_AMOUNT_REMIS.replace(/\./g, ''), ' ', 0)),

                lg_COMPTE_CLIENT_ID: Ext.getCmp('lg_COMPTE_CLIENT_ID').getValue(),
                lg_TYPE_VENTE_ID: lg_TYPE_VENTE_ID,
                int_TAUX_CHANGE: Ext.getCmp('int_TAUX_CHANGE').getValue(),
                str_CODE_MONNAIE: Ext.getCmp('str_CODE_MONNAIE').getValue(),
                str_BANQUE: Ext.getCmp('str_BANQUE').getValue(),
                str_LIEU: Ext.getCmp('str_LIEU').getValue(),
                str_NOM: Ext.getCmp('str_NOM').getValue(),
                LstTCompteClientTiersPayant: listTiersPayant,
                tierspayantsData: Ext.encode(comptclientdata),
                lg_AYANTS_DROITS_ID: Ext.getCmp('lg_AYANTS_DROITS_ID').getValue(), str_FIRST_NAME_FACTURE: str_FIRST_NAME_FACTURE,
                str_LAST_NAME_FACTURE: str_LAST_NAME_FACTURE,
                int_NUMBER_FACTURE: int_NUMBER_FACTURE,
                lg_USER_VENDEUR_ID: lg_USER_VENDEUR_ID,
                backend: Ext.encode(backend),
                partTP: partTP,
                b_WITHOUT_BON: Ext.getCmp('b_WITHOUT_BON').getValue(),
                int_TAUX: (Ext.getCmp('int_TAUX').getValue() <= 100 ? Ext.getCmp('int_TAUX').getValue() : 0)
            },
            timeout: 2400000,
            success: function (response)
            {
                Ext.getCmp('str_FIRST_NAME_FACTURE').setReadOnly(false);
                Ext.getCmp('str_LAST_NAME_FACTURE').setReadOnly(false);
                Ext.getCmp('int_NUMBER_FACTURE').setReadOnly(false);
                comptclientdata = [];
                var object = Ext.JSON.decode(response.responseText, false);
                Me_dovente.StopWaitingProcess();
                Me_Workflow.isCREDITTRANSACTION = false;
                if (object.errors_code === "0") {
                    Ext.MessageBox.show({
                        title: "Message d'erreur",
                        width: 320,
                        msg: object.errors,
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING
                    });
                    Ext.getCmp('btn_loturer').enable();
                    return;
                }

                Ext.MessageBox.confirm('Message',
                        'Confirmer l\'impression du ticket',
                        function (btn) {
                            if (btn === 'yes') {
                                Me_Workflow.onPdfClick(lg_PREENREGISTREMENT_ID, str_FIRST_NAME_FACTURE, str_LAST_NAME_FACTURE, int_NUMBER_FACTURE);
                            } else {
                                Me_Workflow.ResetView();
                            }
                            Ext.getCmp('int_AMOUNT_REMIS_LAST').setValue(int_AMOUNT_REMIS);
                        });
            },
            failure: function (response) {
                Me_dovente.StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    },
    onbtncloturer: function () {

        if (Me_dovente.getTitre() !== "AVOIR") {
//            Me_Workflow.onbtncloturevente('../webservices/sm_user/detailsvente/ws_transaction.jsp?mode=cloturer', Ext.getCmp('lg_PREENREGISTREMENT_ID').getValue());
//            Me_Workflow.onbtncloturevente('../venteController?mode=cloturer', Ext.getCmp('lg_PREENREGISTREMENT_ID').getValue());
            Me_Workflow.onbtncloturevente('../venteController?mode=cloturer', Ext.getCmp('lg_PREENREGISTREMENT_ID').getValue());



        } else {
            Me_Workflow.onbtnclotureravoir('../webservices/sm_user/detailsvente/ws_transaction.jsp?mode=clotureravoir', Ext.getCmp('lg_PREENREGISTREMENT_ID').getValue());
        }
        Me_Workflow.venteTierspayant = [];
    },
    updateInfoCustomer: function (lg_CLIENT_ID, lg_TYPE_CLIENT_ID, lg_COMPTE_CLIENT_ID) {
        new testextjs.view.sm_user.dovente.action.add({
            odatasource: lg_CLIENT_ID,
            nameintern: lg_TYPE_CLIENT_ID,
            parentview: this,
            mode: "update",
            titre: "Mise &agrave; jour des informations du client",
            type: lg_COMPTE_CLIENT_ID

        });
    },
    RemoveTiersPayantVente: function (id_label_tp, id_compteclient_tp, id_ref_bon) {
        Ext.MessageBox.confirm('Message',
                'Confirmer la suppression de ' + Ext.getCmp('' + id_label_tp + '').getValue() + ' sur la vente',
                function (btn) {
                    if (btn == 'yes') {

                        var name = Ext.getCmp('' + id_label_tp + '').getValue().substring(0, Ext.getCmp('' + id_label_tp + '').getValue().indexOf('-'));
                        for (var i = 0; Me_Workflow.venteTierspayant.length > i; i += 1) {
                            if (Me_Workflow.venteTierspayant[i].NAME === name) {
                                Me_Workflow.venteTierspayant.splice(i, 1);
                            }
                        }


                        Me_Workflow.removeTierspayantToVente(Ext.getCmp('lg_PREENREGISTREMENT_ID').getValue(), id_label_tp, id_compteclient_tp, id_ref_bon);
                    }
                });
    },
    isCredit: function (is_Credit) {
        if (is_Credit !== "" && is_Credit !== undefined) {

            Me_Workflow.isCREDITTRANSACTION = is_Credit;
        }
        return Me_Workflow.isCREDITTRANSACTION;
    },
    //fin code ajouté
    canContinue: function () {
        var data = Me_Workflow.ClientJSON.RO;
        console.log('data case ', data, data.bCANBEUSE);
        if (!data.bCANBEUSE) {

            Ext.MessageBox.show({
                title: 'Message d\'erreur',
                width: 400,
                msg: data.message,
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
        } else if (!data.bCANBEUSETP) {
            Ext.MessageBox.show({
                title: 'Message d\'erreur',
                width: 400,
                msg: data.messageTP,
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


    },
    canContinue2: function () {
        var data = Me_Workflow.ClientJSON.RO;
        if (!data.bCANBEUSE) {
            Ext.MessageBox.show({
                title: 'Message d\'erreur',
                width: 400,
                msg: data.message,
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING,
                fn: function (buttonId) {
                    if (buttonId === "ok") {
                        Ext.getCmp('lg_CLIENT_ID').focus(true, 100, function () {
                        });
                    }
                }
            });
        } else if (!data.bCANBEUSETP) {

            Ext.MessageBox.show({
                title: 'Message d\'erreur',
                width: 400,
                msg: data.messageTP,
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


    },
    updateventeTierspayant: function (_IDTIERSPAYANT, taux, name) {

        for (var i = 0; Me_Workflow.venteTierspayant.length > i; i += 1) {
            if (Me_Workflow.venteTierspayant[i].IDTIERSPAYANT === _IDTIERSPAYANT) {
                return;
            }
        }
        Me_Workflow.venteTierspayant.push({"IDTIERSPAYANT": _IDTIERSPAYANT, "TAUX": taux, "ID": Ext.getCmp('lg_CLIENT_ID_FIND').getValue(), "NAME": name});
    }, displayDiff: function (rec) {


        Ext.getCmp('infoFacture').setTitle("INFOS SUR LE CLIENT");
        Ext.getCmp('str_FIRST_NAME_FACTURE').setValue(rec.get('str_FIRST_NAME'));
        Ext.getCmp('str_LAST_NAME_FACTURE').setValue(rec.get('str_LAST_NAME'));
        Ext.getCmp('int_NUMBER_FACTURE').setValue(rec.get('str_ADRESSE'));
        Ext.getCmp('str_FIRST_NAME_FACTURE').setReadOnly(true);
        Ext.getCmp('str_LAST_NAME_FACTURE').setReadOnly(true);
        Ext.getCmp('int_NUMBER_FACTURE').setReadOnly(true);
        Ext.getCmp('str_LIEU').focus(true, 100, function () {
            Ext.getCmp('str_LIEU').setFieldStyle('border: 2px solid #3892d3; background: #F1F1F1;');
        });
        Ext.getCmp('infoFacture').show();
    },

    DoAjaxRequestVente: function (url, id_vente, product, quantite) {

        if (id_vente === "0") {
            var lg_NATURE_VENTE_ID = Ext.getCmp('lg_NATURE_VENTE_ID').getValue(), lg_REMISE_ID = Ext.getCmp('lg_REMISE_ID').getValue(),
                    lg_AYANTS_DROITS_ID = Ext.getCmp('lg_AYANTS_DROITS_ID').getValue(), lg_TYPE_VENTE_ID = Ext.getCmp('lg_TYPE_VENTE_ID').getValue(),
                    lg_USER_VENDEUR_ID = Ext.getCmp('lg_USER_VENDEUR_ID').getValue();
            if (my_view_titre === "Ventes" && (KEY_ACTIVATE_CONTROLE_VENTE_USER === "1") && (Ext.getCmp('lg_USER_VENDEUR_ID').getValue() === undefined ||
                    Ext.getCmp('lg_USER_VENDEUR_ID').getValue() === null || Ext.getCmp('lg_USER_VENDEUR_ID').getValue() === "")) { // code ajoute 10/03/2016
                Ext.MessageBox.alert('Attention', 'Renseignez le vendeur svp', function () {
                    Ext.getCmp('lg_USER_VENDEUR_ID').focus();
                });
                return;
            }
            if (lg_TYPE_VENTE_ID === null) {
                Ext.MessageBox.alert('Attention', 'Renseignez le type de la vente svp', function () {
                    Ext.getCmp('lg_TYPE_VENTE_ID').focus();
                });
                return;
            }
            if (lg_NATURE_VENTE_ID === null) {
                Ext.MessageBox.alert('Attention', 'Renseignez la nature de la vente svp', function () {
                    Ext.getCmp('lg_NATURE_VENTE_ID').focus();
                });
                return;
            }
            if (lg_TYPE_VENTE_ID !== "1" && lg_TYPE_VENTE_ID !== "AU COMPTANT") {
                var str_FIRST_NAME = "", str_LAST_NAME = "", listTiersPayant = "";
                if (lg_TYPE_VENTE_ID === "2") {//
                    str_FIRST_NAME = Ext.getCmp('str_FIRST_NAME_AD').getValue();
                    str_LAST_NAME = Ext.getCmp('str_LAST_NAME_AD').getValue();
                } else {
                    str_FIRST_NAME = Ext.getCmp('str_FIRST_NAME').getValue();
                    str_LAST_NAME = Ext.getCmp('str_LAST_NAME').getValue();
                }
                var str_ro_add = Ext.getCmp('RO_ID').getValue(), str_rc1_add = Ext.getCmp('RC1_ID').getValue(),
                        str_rc2_add = Ext.getCmp('RC2_ID').getValue(), str_rc3_add = Ext.getCmp('RC3_ID').getValue();
                if (str_ro_add !== "" && str_ro_add !== undefined && str_ro_add !== null) {
                    listTiersPayant += str_ro_add + ":" + Ext.getCmp('REF_RO').getValue() + ";";
                }
                if (str_rc1_add !== "" && str_rc1_add !== undefined && str_rc1_add !== null) {
                    listTiersPayant += str_rc1_add + ":" + Ext.getCmp('REF_RC1').getValue() + ";";
                }
                if (str_rc2_add !== "" && str_rc2_add !== undefined && str_rc2_add !== null) {
                    listTiersPayant += str_rc2_add + ":" + Ext.getCmp('REF_RC2').getValue() + ";";
                }
                if (str_rc3_add !== "" && str_rc3_add !== undefined && str_rc3_add !== null) {
                    listTiersPayant += str_rc3_add + ":" + Ext.getCmp('REF_RC3').getValue() + ";";
                }
                url += "&str_FIRST_NAME_FACTURE=" + str_FIRST_NAME + "&str_LAST_NAME_FACTURE=" + str_LAST_NAME + "&LstTCompteClientTiersPayant=" + listTiersPayant;
            }

            url = url + "&lg_NATURE_VENTE_ID=" + lg_NATURE_VENTE_ID + "&lg_REMISE_ID=" + lg_REMISE_ID + "&lg_AYANTS_DROITS_ID=" + lg_AYANTS_DROITS_ID + "&lg_TYPE_VENTE_ID=" + lg_TYPE_VENTE_ID + "&my_view_titre=" + my_view_titre;
        }

        Me_dovente.ShowWaitingProcess();
        Ext.Ajax.request({
            url: url,
            method: 'POST',
            params: {
                lg_FAMILLE_ID: product,
                lg_PREENREGISTREMENT_ID: id_vente,
                int_QUANTITY_SERVED: quantite,
                int_QUANTITY: quantite,
                lg_USER_VENDEUR_ID: lg_USER_VENDEUR_ID,
                int_FREE_PACK_NUMBER: 0

            },
            success: function (response)
            {
                Me_dovente.StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.errors_code == "0") {
                    if (object.results.length > 0 && object.results[0].answer_decondition == true) {
                        Ext.MessageBox.confirm('Message',
                                object.errors,
                                function (btn) {
                                    if (btn == 'yes') {
                                        //  Me_Workflow.doDeconditionnement("create", url, id_vente, product, quantite);
                                        Me_Workflow.doDeconditionnement("create", '../Deconditionnement', id_vente, product, quantite);
                                    }
                                });
                    } else {
                        Ext.MessageBox.show({
                            title: "Message d'erreur",
                            width: 320,
                            msg: object.errors,
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.WARNING,
                            fn: function (buttonId) {
                                if (buttonId === "ok") {
                                    Ext.getCmp('int_QUANTITY').focus(false, 100, function () {
                                    });
                                }
                            }
                        });
                    }

                } else {
                    var Vente = object.results[0];
                    Ext.getCmp('int_PRICE').setValue(Ext.util.Format.number(Vente.int_PRICE, '0,000.') + " CFA");
                    Ext.getCmp('int_REMISE_DEVIS').setValue(Ext.util.Format.number(Vente.int_REMISE, '0,000.') + " CFA");
                    if (id_vente === "0") {
                        Ext.getCmp('lg_PREENREGISTREMENT_ID').setValue(Vente.lg_PREENREGISTREMENT_ID);
                    }

                    //code ajouté 01/12/2016
                    Ext.getCmp('authorize_cloture_vente').setValue('0');
                    Ext.getCmp('int_AMOUNT_RECU').setValue(0);
                    Ext.getCmp('btn_loturer').disable();
                    //fin code ajouté 01/12/2016

                    Ext.getCmp('int_NUMBER_AVAILABLE_STOCK').setValue(0);
                    Ext.getCmp('lg_ZONE_GEO_ID').setValue("");
                    Ext.getCmp('str_NAME').setValue("");
                    Ext.getCmp('str_CODE').setValue("");
                    Ext.getCmp('str_NAME').getStore().load();
                    Ext.getCmp('str_CODE').getStore().load();
                    Ext.getCmp('str_NAME').focus(true, 100, function () {
                        Ext.getCmp('lg_FAMILLE_ID_VENTE').reset();
                    });
                    Ext.getCmp('int_QUANTITY').reset();
                    Me_dovente.onRechClick();
                }
            },
            failure: function (response)
            {
                Me_dovente.StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                Ext.MessageBox.show({
                    title: "Message d'erreur",
                    width: 320,
                    msg: response.responseText,
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING,
                    fn: function (buttonId) {
                        if (buttonId === "ok") {
                            Ext.getCmp('str_NAME').focus(false, 100, function () {
                            });
                        }
                    }
                });
            }
        });

    },

}

);
function encodeParameter(value) {
    return encodeURIComponent(value);
}