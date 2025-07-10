/* global Ext */

var url_services_data_detailentreesortie = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_entree.jsp";

var url_services_data_article = "../webservices/sm_user/famille/ws_data.jsp";
var url_services_data_zonegeo = "../webservices/configmanagement/zonegeographique/ws_data.jsp";
var url_services_data_famillearticle = "../webservices/configmanagement/famillearticle/ws_data.jsp";
var url_services_data_fabriquant = "../webservices/configmanagement/fabriquant/ws_data.jsp";

var valdatedebut;
var valdatefin;
var Me;
Ext.define("testextjs.view.stockmanagement.suivistockvente.SuiviDetailStockVenteManager", {
    extend: "Ext.grid.Panel",
    xtype: "detailentreesortie",
    id: "detailentreesortieID",
    requires: [
        "Ext.selection.CellModel",
        "Ext.grid.*",
        "Ext.window.Window",
        "Ext.data.*",
        "Ext.util.*",
        "Ext.form.*",
        "Ext.JSON.*",
        "Ext.ux.ProgressBarPager",
        "Ext.ux.grid.Printer"

    ],
    title: "Point d&eacute;taill&eacute; &eacute;ntr&eacute;e/sortie",
    plain: true,
    maximizable: true,
//    tools: [{type: "pin"}],
    closable: false,
    frame: true,
    initComponent: function () {

        var itemsPerPage = 20;
        Me = this;
        var store = new Ext.data.Store({
            model: "testextjs.model.FamilleStock",
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: "ajax",
                url: url_services_data_detailentreesortie,
                reader: {
                    type: "json",
                    root: "results",
                    totalProperty: "total"
                },
                timeout: 180000
            }

        });

        var store_zonegeo = new Ext.data.Store({
            model: "testextjs.model.ZoneGeographique",
            pageSize: itemsPerPage,
            autoLoad: false,
//            remoteFilter: true,
            proxy: {
                type: "ajax",
                url: url_services_data_zonegeo,
                reader: {
                    type: "json",
                    root: "results",
                    totalProperty: "total"
                }
            }

        });

        var store_famillearticle = new Ext.data.Store({
            model: "testextjs.model.FamilleArticle",
            pageSize: itemsPerPage,
            autoLoad: false,
//            remoteFilter: true,
            proxy: {
                type: "ajax",
                url: url_services_data_famillearticle,
                reader: {
                    type: "json",
                    root: "results",
                    totalProperty: "total"
                }
            }

        });

        var store_fabriquant = new Ext.data.Store({
            model: "testextjs.model.Fabriquant",
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: "ajax",
                url: url_services_data_fabriquant,
                reader: {
                    type: "json",
                    root: "results",
                    totalProperty: "total"
                }
            }

        });


        var store_type = new Ext.data.Store({
            fields: ["str_TYPE_TRANSACTION", "str_STATUT_TRANSACTION"],
            data: [
                {str_TYPE_TRANSACTION: "Commande", str_STATUT_TRANSACTION: "COMMANDE"},
                {str_TYPE_TRANSACTION: "Entree en stock", str_STATUT_TRANSACTION: "ENTREESTOCK"},
                {str_TYPE_TRANSACTION: "Perime", str_STATUT_TRANSACTION: "PERIME"},
                {str_TYPE_TRANSACTION: "Retour fournisseur", str_STATUT_TRANSACTION: "RETOURFOURNISSEUR"},
                {str_TYPE_TRANSACTION: "Vente", str_STATUT_TRANSACTION: "VENTE"}
            ]
        });

        var store_grossiste = new Ext.data.Store({
            model: "testextjs.model.Grossiste",
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: "ajax",
                   url: '../api/v1/grossiste/all',
                reader: {
                    type: "json",
                    root: "results",
                    totalProperty: "total"
                }
            }

        });


        var store_famille = new Ext.data.Store({
            model: "testextjs.model.Famille",
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: "ajax",
                url: url_services_data_article,
                reader: {
                    type: "json",
                    root: "results",
                    totalProperty: "total"
                }
            }

        });

        Ext.apply(this, {
            width: '98%',
            height: valheight,
            store: store,
            id: "GridSuiviStockVenteID",
            columns: [{
                    xtype: "rownumberer",
                    text: "Num.Ligne",
                    width: 45,
                    sortable: true/*,
                     locked: true*/
                }, {
                    header: "lg_FAMILLE_ID",
                    dataIndex: "lg_FAMILLE_ID",
                    hidden: true,
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                }, {
                    header: "CIP",
                    dataIndex: "int_CIP",
                    flex: 0.7
                },
                {
                    header: "Article",
                    dataIndex: "str_NAME",
                    flex: 2/*,
                     editor: {
                     allowBlank: false
                     }*/
                },
                {
                    header: "Quantite",
                    dataIndex: "int_NUMBER",
                    flex: 0.7
                }, {
                    header: "Operateur",
                    dataIndex: "lg_USER_ID",
                    flex: 1
                }, {
                    header: "Nature.Operation",
                    dataIndex: "str_ACTION",
                    flex: 1
                }, {
                    header: "Date",
                    dataIndex: "dt_UPDATED",
                    flex: 1
                }, {
                    header: "Heure",
                    dataIndex: "dt_LAST_VENTE",
                    flex: 1
                }],
            selModel: {
                selType: "cellmodel"
            },
            tbar: [{
                    xtype: "combobox",
                    name: "str_TYPE_TRANSACTION",
                    margins: "0 0 0 10",
                    id: "str_TYPE_TRANSACTION",
                    store: store_type,
                    valueField: "str_STATUT_TRANSACTION",
                    displayField: "str_TYPE_TRANSACTION",
                    typeAhead: true,
                    queryMode: "remote",
                    flex: 1,
                    emptyText: "Type de transaction...",
                    listeners: {
                        select: function (cmp) {
                            var value = cmp.getValue();
                            // alert("value " + value);
                            var OGrid = Ext.getCmp("GridSuiviStockVenteID");
                            if (value == "ENTREESTOCK") { //affiche entree en stock
//                                Ext.getCmp("lg_GROSSISTE_ID").show();


                                var lg_GROSSISTE_ID = "";

                                var lg_FABRIQUANT_ID = "";
                                var lg_FAMILLEARTICLE_ID = "";
                                var lg_ZONE_GEO_ID = "";
                                var rechecher = Ext.getCmp("rechecher").getValue();


                                if (Ext.getCmp("lg_GROSSISTE_ID").getValue() != null) {
                                    lg_GROSSISTE_ID = Ext.getCmp("lg_GROSSISTE_ID").getValue();
                                }
                                if (Ext.getCmp("lg_FABRIQUANT_ID").getValue() != null) {
                                    lg_FABRIQUANT_ID = Ext.getCmp("lg_FABRIQUANT_ID").getValue();
                                }
                                if (Ext.getCmp("lg_FAMILLEARTICLE_ID").getValue() != null) {
                                    lg_FAMILLEARTICLE_ID = Ext.getCmp("lg_FAMILLEARTICLE_ID").getValue();
                                }
                                if (Ext.getCmp("lg_ZONE_GEO_ID").getValue() != null) {
                                    lg_ZONE_GEO_ID = Ext.getCmp("lg_ZONE_GEO_ID").getValue();
                                }
                                OGrid.getStore().getProxy().url = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_entree.jsp?lg_GROSSISTE_ID=" + lg_GROSSISTE_ID + "&lg_FABRIQUANT_ID=" + lg_FABRIQUANT_ID + "&lg_FAMILLEARTICLE_ID=" + lg_FAMILLEARTICLE_ID + "&lg_ZONE_GEO_ID=" + lg_ZONE_GEO_ID + "&search_value=" + rechecher;
                                OGrid.getStore().reload();
                                OGrid.getStore().getProxy().url = url_services_data_detailentreesortie;
                            } else if (value == "PERIME") { //affiche les perimes
//                                Ext.getCmp("lg_GROSSISTE_ID").show();


                                var lg_GROSSISTE_ID = "";

                                var lg_FABRIQUANT_ID = "";
                                var lg_FAMILLEARTICLE_ID = "";
                                var lg_ZONE_GEO_ID = "";
                                var rechecher = Ext.getCmp("rechecher").getValue();

                                if (Ext.getCmp("lg_GROSSISTE_ID").getValue() != null) {
                                    lg_GROSSISTE_ID = Ext.getCmp("lg_GROSSISTE_ID").getValue();
                                }
                                if (Ext.getCmp("lg_FABRIQUANT_ID").getValue() != null) {
                                    lg_FABRIQUANT_ID = Ext.getCmp("lg_FABRIQUANT_ID").getValue();
                                }
                                if (Ext.getCmp("lg_FAMILLEARTICLE_ID").getValue() != null) {
                                    lg_FAMILLEARTICLE_ID = Ext.getCmp("lg_FAMILLEARTICLE_ID").getValue();
                                }
                                if (Ext.getCmp("lg_ZONE_GEO_ID").getValue() != null) {
                                    lg_ZONE_GEO_ID = Ext.getCmp("lg_ZONE_GEO_ID").getValue();
                                }

                                OGrid.getStore().getProxy().url = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_perime.jsp?lg_GROSSISTE_ID=" + lg_GROSSISTE_ID + "&lg_FABRIQUANT_ID=" + lg_FABRIQUANT_ID + "&lg_FAMILLEARTICLE_ID=" + lg_FAMILLEARTICLE_ID + "&lg_ZONE_GEO_ID=" + lg_ZONE_GEO_ID + "&search_value=" + rechecher;
                                OGrid.getStore().reload();
                                OGrid.getStore().getProxy().url = url_services_data_detailentreesortie;
                            } else if (value == "COMMANDE") { //affiche les commandes
//                                Ext.getCmp("lg_GROSSISTE_ID").show();


                                var lg_GROSSISTE_ID = "";

                                var lg_FABRIQUANT_ID = "";
                                var lg_FAMILLEARTICLE_ID = "";
                                var lg_ZONE_GEO_ID = "";
                                var rechecher = Ext.getCmp("rechecher").getValue();

                                if (Ext.getCmp("lg_GROSSISTE_ID").getValue() != null) {
                                    lg_GROSSISTE_ID = Ext.getCmp("lg_GROSSISTE_ID").getValue();
                                }
                                if (Ext.getCmp("lg_FABRIQUANT_ID").getValue() != null) {
                                    lg_FABRIQUANT_ID = Ext.getCmp("lg_FABRIQUANT_ID").getValue();
                                }
                                if (Ext.getCmp("lg_FAMILLEARTICLE_ID").getValue() != null) {
                                    lg_FAMILLEARTICLE_ID = Ext.getCmp("lg_FAMILLEARTICLE_ID").getValue();
                                }
                                if (Ext.getCmp("lg_ZONE_GEO_ID").getValue() != null) {
                                    lg_ZONE_GEO_ID = Ext.getCmp("lg_ZONE_GEO_ID").getValue();
                                }

                                OGrid.getStore().getProxy().url = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_commande.jsp?lg_GROSSISTE_ID=" + lg_GROSSISTE_ID + "&lg_FABRIQUANT_ID=" + lg_FABRIQUANT_ID + "&lg_FAMILLEARTICLE_ID=" + lg_FAMILLEARTICLE_ID + "&lg_ZONE_GEO_ID=" + lg_ZONE_GEO_ID + "&search_value=" + rechecher;
                                OGrid.getStore().reload();
                                OGrid.getStore().getProxy().url = url_services_data_detailentreesortie;
                            } else if (value == "RETOURFOURNISSEUR") { //affiche les retours fournisseur
//                                Ext.getCmp("lg_GROSSISTE_ID").show();


                                var lg_GROSSISTE_ID = "";

                                var lg_FABRIQUANT_ID = "";
                                var lg_FAMILLEARTICLE_ID = "";
                                var lg_ZONE_GEO_ID = "";
                                var rechecher = Ext.getCmp("rechecher").getValue();


                                if (Ext.getCmp("lg_GROSSISTE_ID").getValue() != null) {
                                    lg_GROSSISTE_ID = Ext.getCmp("lg_GROSSISTE_ID").getValue();
                                }
                                if (Ext.getCmp("lg_FABRIQUANT_ID").getValue() != null) {
                                    lg_FABRIQUANT_ID = Ext.getCmp("lg_FABRIQUANT_ID").getValue();
                                }
                                if (Ext.getCmp("lg_FAMILLEARTICLE_ID").getValue() != null) {
                                    lg_FAMILLEARTICLE_ID = Ext.getCmp("lg_FAMILLEARTICLE_ID").getValue();
                                }
                                if (Ext.getCmp("lg_ZONE_GEO_ID").getValue() != null) {
                                    lg_ZONE_GEO_ID = Ext.getCmp("lg_ZONE_GEO_ID").getValue();
                                }
                                OGrid.getStore().getProxy().url = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_retour.jsp?lg_GROSSISTE_ID=" + lg_GROSSISTE_ID + "&lg_FABRIQUANT_ID=" + lg_FABRIQUANT_ID + "&lg_FAMILLEARTICLE_ID=" + lg_FAMILLEARTICLE_ID + "&lg_ZONE_GEO_ID=" + lg_ZONE_GEO_ID + "&search_value=" + rechecher;
                                OGrid.getStore().reload();
                                OGrid.getStore().getProxy().url = url_services_data_detailentreesortie;
                            } else if (value == "VENTE") { //affiche vente
//                                Ext.getCmp("lg_GROSSISTE_ID").hide();


                                var lg_FABRIQUANT_ID = "";
                                var lg_FAMILLEARTICLE_ID = "";
                                var lg_ZONE_GEO_ID = "";
                                var rechecher = Ext.getCmp("rechecher").getValue();


                                if (Ext.getCmp("lg_FABRIQUANT_ID").getValue() != null) {
                                    lg_FABRIQUANT_ID = Ext.getCmp("lg_FABRIQUANT_ID").getValue();
                                }
                                if (Ext.getCmp("lg_FAMILLEARTICLE_ID").getValue() != null) {
                                    lg_FAMILLEARTICLE_ID = Ext.getCmp("lg_FAMILLEARTICLE_ID").getValue();
                                }
                                if (Ext.getCmp("lg_ZONE_GEO_ID").getValue() != null) {
                                    lg_ZONE_GEO_ID = Ext.getCmp("lg_ZONE_GEO_ID").getValue();
                                }

                                OGrid.getStore().getProxy().url = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_vente.jsp?lg_FABRIQUANT_ID=" + lg_FABRIQUANT_ID + "&lg_FAMILLEARTICLE_ID=" + lg_FAMILLEARTICLE_ID + "&lg_ZONE_GEO_ID=" + lg_ZONE_GEO_ID + "&search_value=" + rechecher;
                                OGrid.getStore().reload();
                                OGrid.getStore().getProxy().url = url_services_data_detailentreesortie;
                            }


                        }
                    }
                }, "-", {
                    xtype: "combobox",
                    name: "lg_FAMILLEARTICLE_ID",
                    margins: "0 0 0 10",
                    id: "lg_FAMILLEARTICLE_ID",
                    store: store_famillearticle,
                    valueField: "lg_FAMILLEARTICLE_ID",
                    displayField: "str_LIBELLE",
                    typeAhead: true,
                    queryMode: "remote",
                    flex: 1,
                    emptyText: "Selectionner famille article...",
                    listeners: {
                        select: function (cmp) {
                            var value = cmp.getValue();
                            var OGrid = Ext.getCmp("GridSuiviStockVenteID");
                            var str_TYPE_TRANSACTION = "ENTREESTOCK";
                            var rechecher = Ext.getCmp("rechecher").getValue();


                            var lg_FABRIQUANT_ID = "";
                            var lg_ZONE_GEO_ID = "";
                            if (Ext.getCmp("str_TYPE_TRANSACTION").getValue() != null) {
                                str_TYPE_TRANSACTION = Ext.getCmp("str_TYPE_TRANSACTION").getValue();
                            }
                            if (Ext.getCmp("lg_FABRIQUANT_ID").getValue() != null) {
                                lg_FABRIQUANT_ID = Ext.getCmp("lg_FABRIQUANT_ID").getValue();
                            }

                            if (Ext.getCmp("lg_ZONE_GEO_ID").getValue() != null) {
                                lg_ZONE_GEO_ID = Ext.getCmp("lg_ZONE_GEO_ID").getValue();
                            }

                            var url_services_data = "";

                            if (str_TYPE_TRANSACTION == "ENTREESTOCK" || str_TYPE_TRANSACTION == "COMMANDE" || str_TYPE_TRANSACTION == "PERIME" || str_TYPE_TRANSACTION == "RETOURFOURNISSEUR") { //affiche entree en stock
//                                Ext.getCmp("lg_GROSSISTE_ID").show();
                                var lg_GROSSISTE_ID = "";

                                if (Ext.getCmp("lg_GROSSISTE_ID").getValue() != null) {
                                    lg_GROSSISTE_ID = Ext.getCmp("lg_GROSSISTE_ID").getValue();
                                }

                                if (str_TYPE_TRANSACTION == "ENTREESTOCK") {
                                    url_services_data = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_entree.jsp";
                                } else if (str_TYPE_TRANSACTION == "COMMANDE") {
                                    url_services_data = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_commande.jsp";
                                } else if (str_TYPE_TRANSACTION == "PERIME") {
                                    url_services_data = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_perime.jsp";
                                } else if (str_TYPE_TRANSACTION == "RETOURFOURNISSEUR") {
                                    url_services_data = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_retour.jsp";
                                }


                                OGrid.getStore().getProxy().url = url_services_data + "?lg_GROSSISTE_ID=" + lg_GROSSISTE_ID + "&lg_FABRIQUANT_ID=" + lg_FABRIQUANT_ID + "&lg_FAMILLEARTICLE_ID=" + value + "&lg_ZONE_GEO_ID=" + lg_ZONE_GEO_ID + "&search_value=" + rechecher;
                                OGrid.getStore().reload();
                            } else if (str_TYPE_TRANSACTION == "VENTE") { //affiche vente
//                                Ext.getCmp("lg_GROSSISTE_ID").hide();
                                var url_services_data = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_vente.jsp";

                                OGrid.getStore().getProxy().url = url_services_data + "?lg_FABRIQUANT_ID=" + lg_FABRIQUANT_ID + "&lg_FAMILLEARTICLE_ID=" + value + "&lg_ZONE_GEO_ID=" + lg_ZONE_GEO_ID + "&search_value=" + rechecher;
                                OGrid.getStore().reload();
                            }
                            OGrid.getStore().getProxy().url = url_services_data_detailentreesortie;
                        }
                    }
                }, "-", {
                    xtype: "combobox",
                    name: "lg_ZONE_GEO_ID",
                    margins: "0 0 0 10",
                    id: "lg_ZONE_GEO_ID",
                    store: store_zonegeo,
                    valueField: "lg_ZONE_GEO_ID",
                    displayField: "str_LIBELLEE",
                    typeAhead: true,
                    queryMode: "remote",
                    flex: 1,
                    emptyText: "Sectionner emplacement...",
                    listeners: {
                        select: function (cmp) {
                            var value = cmp.getValue();

                            var OGrid = Ext.getCmp("GridSuiviStockVenteID");
                            var str_TYPE_TRANSACTION = "ENTREESTOCK";
                            var rechecher = Ext.getCmp("rechecher").getValue();


                            var lg_FABRIQUANT_ID = "";
                            var lg_FAMILLEARTICLE_ID = "";
                            if (Ext.getCmp("str_TYPE_TRANSACTION").getValue() != null) {
                                str_TYPE_TRANSACTION = Ext.getCmp("str_TYPE_TRANSACTION").getValue();
                            }
                            if (Ext.getCmp("lg_FABRIQUANT_ID").getValue() != null) {
                                lg_FABRIQUANT_ID = Ext.getCmp("lg_FABRIQUANT_ID").getValue();
                            }

                            if (Ext.getCmp("lg_FAMILLEARTICLE_ID").getValue() != null) {
                                lg_FAMILLEARTICLE_ID = Ext.getCmp("lg_FAMILLEARTICLE_ID").getValue();
                            }

                            var url_services_data = "";

                            if (str_TYPE_TRANSACTION == "ENTREESTOCK" || str_TYPE_TRANSACTION == "COMMANDE" || str_TYPE_TRANSACTION == "PERIME" || str_TYPE_TRANSACTION == "RETOURFOURNISSEUR") { //affiche entree en stock
//                                Ext.getCmp("lg_GROSSISTE_ID").show();
                                var lg_GROSSISTE_ID = "";

                                if (Ext.getCmp("lg_GROSSISTE_ID").getValue() != null) {
                                    lg_GROSSISTE_ID = Ext.getCmp("lg_GROSSISTE_ID").getValue();
                                }

                                if (str_TYPE_TRANSACTION == "ENTREESTOCK") {
                                    url_services_data = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_entree.jsp";
                                } else if (str_TYPE_TRANSACTION == "COMMANDE") {
                                    url_services_data = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_commande.jsp";
                                } else if (str_TYPE_TRANSACTION == "PERIME") {
                                    url_services_data = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_perime.jsp";
                                } else if (str_TYPE_TRANSACTION == "RETOURFOURNISSEUR") {
                                    url_services_data = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_retour.jsp";
                                }


                                OGrid.getStore().getProxy().url = url_services_data + "?lg_GROSSISTE_ID=" + lg_GROSSISTE_ID + "&lg_FABRIQUANT_ID=" + lg_FABRIQUANT_ID + "&lg_FAMILLEARTICLE_ID=" + lg_FAMILLEARTICLE_ID + "&lg_ZONE_GEO_ID=" + value + "&search_value=" + rechecher;
                                OGrid.getStore().reload();
                            } else if (str_TYPE_TRANSACTION == "VENTE") { //affiche vente
//                                Ext.getCmp("lg_GROSSISTE_ID").hide();
                                var url_services_data = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_vente.jsp";

                                OGrid.getStore().getProxy().url = url_services_data + "?lg_FABRIQUANT_ID=" + lg_FABRIQUANT_ID + "&lg_FAMILLEARTICLE_ID=" + lg_FAMILLEARTICLE_ID + "&lg_ZONE_GEO_ID=" + value + "&search_value=" + rechecher;
                                OGrid.getStore().reload();
                            }
                            OGrid.getStore().getProxy().url = url_services_data_detailentreesortie;
                        }
                    }
                }, "-", {
                    xtype: "combobox",
                    name: "lg_FABRIQUANT_ID",
                    margins: "0 0 0 10",
                    id: "lg_FABRIQUANT_ID",
                    store: store_fabriquant,
                    valueField: "lg_FABRIQUANT_ID",
                    displayField: "str_NAME",
                    typeAhead: true,
                    queryMode: "remote",
                    flex: 1,
                    emptyText: "Sectionner fabriquant...",
                    listeners: {
                        select: function (cmp) {
                            var value = cmp.getValue();

                            var OGrid = Ext.getCmp("GridSuiviStockVenteID");
                            var str_TYPE_TRANSACTION = "ENTREESTOCK";
                            var rechecher = Ext.getCmp("rechecher").getValue();


                            var lg_ZONE_GEO_ID = "";
                            var lg_FAMILLEARTICLE_ID = "";
                            if (Ext.getCmp("str_TYPE_TRANSACTION").getValue() != null) {
                                str_TYPE_TRANSACTION = Ext.getCmp("str_TYPE_TRANSACTION").getValue();
                            }
                            if (Ext.getCmp("lg_ZONE_GEO_ID").getValue() != null) {
                                lg_ZONE_GEO_ID = Ext.getCmp("lg_ZONE_GEO_ID").getValue();
                            }

                            if (Ext.getCmp("lg_FAMILLEARTICLE_ID").getValue() != null) {
                                lg_FAMILLEARTICLE_ID = Ext.getCmp("lg_FAMILLEARTICLE_ID").getValue();
                            }

                            var url_services_data = "";

                            if (str_TYPE_TRANSACTION == "ENTREESTOCK" || str_TYPE_TRANSACTION == "COMMANDE" || str_TYPE_TRANSACTION == "PERIME" || str_TYPE_TRANSACTION == "RETOURFOURNISSEUR") { //affiche entree en stock
//                                Ext.getCmp("lg_GROSSISTE_ID").show();
                                var lg_GROSSISTE_ID = "";

                                if (Ext.getCmp("lg_GROSSISTE_ID").getValue() != null) {
                                    lg_GROSSISTE_ID = Ext.getCmp("lg_GROSSISTE_ID").getValue();
                                }

                                if (str_TYPE_TRANSACTION == "ENTREESTOCK") {
                                    url_services_data = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_entree.jsp";
                                } else if (str_TYPE_TRANSACTION == "COMMANDE") {
                                    url_services_data = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_commande.jsp";
                                } else if (str_TYPE_TRANSACTION == "PERIME") {
                                    url_services_data = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_perime.jsp";
                                } else if (str_TYPE_TRANSACTION == "RETOURFOURNISSEUR") {
                                    url_services_data = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_retour.jsp";
                                }


                                OGrid.getStore().getProxy().url = url_services_data + "?lg_GROSSISTE_ID=" + lg_GROSSISTE_ID + "&lg_FABRIQUANT_ID=" + value + "&lg_FAMILLEARTICLE_ID=" + lg_FAMILLEARTICLE_ID + "&lg_ZONE_GEO_ID=" + lg_ZONE_GEO_ID + "&search_value=" + rechecher;
                                OGrid.getStore().reload();
                            } else if (str_TYPE_TRANSACTION == "VENTE") { //affiche vente
//                                Ext.getCmp("lg_GROSSISTE_ID").hide();
                                var url_services_data = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_vente.jsp";

                                OGrid.getStore().getProxy().url = url_services_data + "?lg_FABRIQUANT_ID=" + value + "&lg_FAMILLEARTICLE_ID=" + lg_FAMILLEARTICLE_ID + "&lg_ZONE_GEO_ID=" + lg_ZONE_GEO_ID + "&search_value=" + rechecher;
                                OGrid.getStore().reload();
                            }
                            OGrid.getStore().getProxy().url = url_services_data_detailentreesortie;
                        }
                    }
                }, "-", {
                    xtype: "combobox",
                    name: "lg_GROSSISTE_ID",
                    margins: "0 0 0 10",
                    id: "lg_GROSSISTE_ID",
                    store: store_grossiste,
                    hidden: true,
                    //disabled: true,
                    valueField: "lg_GROSSISTE_ID",
                    displayField: "str_LIBELLE",
                    typeAhead: true,
                    queryMode: "remote",
                    flex: 1,
                    emptyText: "Selectionner fournisseur...",
                    listeners: {
                        select: function (cmp) {
                            var value = cmp.getValue();
                            var OGrid = Ext.getCmp("GridSuiviStockVenteID");
                            var str_TYPE_TRANSACTION = "ENTREESTOCK";

                            var url_services_data = "";

                            var lg_FABRIQUANT_ID = "";
                            var lg_FAMILLEARTICLE_ID = "";
                            var lg_ZONE_GEO_ID = "";
                            var rechecher = Ext.getCmp("rechecher").getValue();


                            if (Ext.getCmp("str_TYPE_TRANSACTION").getValue() != null) {
                                str_TYPE_TRANSACTION = Ext.getCmp("str_TYPE_TRANSACTION").getValue();
                            }
                            if (Ext.getCmp("lg_FABRIQUANT_ID").getValue() != null) {
                                lg_FABRIQUANT_ID = Ext.getCmp("lg_FABRIQUANT_ID").getValue();
                            }
                            if (Ext.getCmp("lg_FAMILLEARTICLE_ID").getValue() != null) {
                                lg_FAMILLEARTICLE_ID = Ext.getCmp("lg_FAMILLEARTICLE_ID").getValue();
                            }
                            if (Ext.getCmp("lg_ZONE_GEO_ID").getValue() != null) {
                                lg_ZONE_GEO_ID = Ext.getCmp("lg_ZONE_GEO_ID").getValue();
                            }
                            if (str_TYPE_TRANSACTION == "ENTREESTOCK") {
                                url_services_data = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_entree.jsp";
                            } else if (str_TYPE_TRANSACTION == "COMMANDE") {
                                url_services_data = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_commande.jsp";
                            } else if (str_TYPE_TRANSACTION == "PERIME") {
                                url_services_data = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_perime.jsp";
                            } else if (str_TYPE_TRANSACTION == "RETOURFOURNISSEUR") {
                                url_services_data = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_retour.jsp";
                            }


                            OGrid.getStore().getProxy().url = url_services_data + "?lg_GROSSISTE_ID=" + value + "&lg_FABRIQUANT_ID=" + lg_FABRIQUANT_ID + "&lg_FAMILLEARTICLE_ID=" + lg_FAMILLEARTICLE_ID + "&lg_ZONE_GEO_ID=" + lg_ZONE_GEO_ID + "&search_value=" + rechecher;
                            OGrid.getStore().reload();
                            OGrid.getStore().getProxy().url = url_services_data_detailentreesortie;

                        }
                    }
                }, "-", {
                    xtype: "datefield",
                    id: "datedebut",
                    name: "datedebut",
                    emptyText: "Date debut",
                    submitFormat: "Y-m-d",
                    maxValue: new Date(),
                    flex: 0.7,
                    format: "d/m/Y",
                    listeners: {
                        "change": function (me) {
                            // alert(me.getSubmitValue());
                            valdatedebut = me.getSubmitValue();
                            Ext.getCmp("datefin").setMinValue(me.getValue());
                        }
                    }
                }, {
                    xtype: "datefield",
                    id: "datefin",
                    name: "datefin",
                    emptyText: "Date fin",
                    maxValue: new Date(),
                    flex: 0.7,
                    submitFormat: "Y-m-d",
                    format: "d/m/Y",
                    listeners: {
                        "change": function (me) {
                            //alert(me.getSubmitValue());
                            valdatefin = me.getSubmitValue();
                            Ext.getCmp("datedebut").setMaxValue(me.getValue());
                        }
                    }
                }, "-", {
                    xtype: "textfield",
                    id: "rechecher",
                    name: "facture",
                    emptyText: "Recherche",
                    listeners: {
                        'render': function (cmp) {
                            cmp.getEl().on('keypress', function (e) {
                                if (e.getKey() === e.ENTER) {
                                    Me.onRechClick();

                                }
                            });
                        }
                    }
                }, {
                    text: "rechercher",
                    tooltip: "rechercher",
                    iconCls: 'searchicon',
                    scope: this,
                    handler: this.onRechClick
                }],
            bbar: {
                xtype: "pagingtoolbar",
                store: store, // same store GridPanel is using
                dock: "bottom",
                displayInfo: true,
                pageSize: 20,
                listeners: {
                    beforechange: function (page, currentPage) {
                        var myProxy = this.store.getProxy();
                        myProxy.params = {
                            search_value: '',
                            datedebut: '',
                            datefin: '',
                            lg_FABRIQUANT_ID: '',
                            lg_FAMILLEARTICLE_ID: '',
                            lg_ZONE_GEO_ID: ''
                        };

                        var rechQty = Ext.getCmp('rechecher').getValue();
                        var dt_start = Ext.getCmp('datedebut').getSubmitValue();
                        var dt_end = Ext.getCmp('datefin').getSubmitValue();
                        var lg_FABRIQUANT_ID = "";
                        var lg_FAMILLEARTICLE_ID = "";
                        var lg_ZONE_GEO_ID = "";

                        if (Ext.getCmp("lg_ZONE_GEO_ID").getValue() != null) {
                            lg_ZONE_GEO_ID = Ext.getCmp("lg_ZONE_GEO_ID").getValue();
                        }

                        if (Ext.getCmp("lg_FABRIQUANT_ID").getValue() != null) {
                            lg_FABRIQUANT_ID = Ext.getCmp("lg_FABRIQUANT_ID").getValue();
                        }

                        if (Ext.getCmp("lg_FAMILLEARTICLE_ID").getValue() != null) {
                            lg_FAMILLEARTICLE_ID = Ext.getCmp("lg_FAMILLEARTICLE_ID").getValue();
                        }

                        var lg_GROSSISTE_ID = "";

                        if (Ext.getCmp("lg_GROSSISTE_ID").getValue() != null) {
                            lg_GROSSISTE_ID = Ext.getCmp("lg_GROSSISTE_ID").getValue();
                        }

                        myProxy.setExtraParam('lg_FAMILLEARTICLE_ID', lg_FAMILLEARTICLE_ID);
                        myProxy.setExtraParam('datedebut', dt_start);
                        myProxy.setExtraParam('datefin', dt_end);
                        myProxy.setExtraParam('lg_FABRIQUANT_ID', '');
                        myProxy.setExtraParam('lg_ZONE_GEO_ID', lg_ZONE_GEO_ID);
                        myProxy.setExtraParam('search_value', rechQty);

                    }

                }
            }
        });

        this.callParent();

        this.on("afterlayout", this.loadStore, this, {
            delay: 1,
            single: true
        })


    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
    },
    onRechClick: function () {
        var val = Ext.getCmp("rechecher");

        var str_TYPE_TRANSACTION = "ENTREESTOCK";

        var lg_FABRIQUANT_ID = "";
        var lg_FAMILLEARTICLE_ID = "";
        var lg_ZONE_GEO_ID = "";

        if (Ext.getCmp("str_TYPE_TRANSACTION").getValue() != null) {
            str_TYPE_TRANSACTION = Ext.getCmp("str_TYPE_TRANSACTION").getValue();
        }


        if (Ext.getCmp("lg_ZONE_GEO_ID").getValue() != null) {
            lg_ZONE_GEO_ID = Ext.getCmp("lg_ZONE_GEO_ID").getValue();
        }

        if (Ext.getCmp("lg_FABRIQUANT_ID").getValue() != null) {
            lg_FABRIQUANT_ID = Ext.getCmp("lg_FABRIQUANT_ID").getValue();
        }

        if (Ext.getCmp("lg_FAMILLEARTICLE_ID").getValue() != null) {
            lg_FAMILLEARTICLE_ID = Ext.getCmp("lg_FAMILLEARTICLE_ID").getValue();
        }

        var url_services_data = "";

        if (str_TYPE_TRANSACTION == "ENTREESTOCK" || str_TYPE_TRANSACTION == "COMMANDE" || str_TYPE_TRANSACTION == "PERIME" || str_TYPE_TRANSACTION == "RETOURFOURNISSEUR") { //affiche entree en stock
            // Ext.getCmp("lg_GROSSISTE_ID").show();
            var lg_GROSSISTE_ID = "";

            if (Ext.getCmp("lg_GROSSISTE_ID").getValue() != null) {
                lg_GROSSISTE_ID = Ext.getCmp("lg_GROSSISTE_ID").getValue();
            }

            if (str_TYPE_TRANSACTION == "ENTREESTOCK") {
                url_services_data = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_entree.jsp?lg_GROSSISTE_ID=" + lg_GROSSISTE_ID;
            } else if (str_TYPE_TRANSACTION == "COMMANDE") {
                url_services_data = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_commande.jsp?lg_GROSSISTE_ID=" + lg_GROSSISTE_ID;
            } else if (str_TYPE_TRANSACTION == "PERIME") {
                url_services_data = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_perime.jsp?lg_GROSSISTE_ID=" + lg_GROSSISTE_ID;
            } else if (str_TYPE_TRANSACTION == "RETOURFOURNISSEUR") {
                url_services_data = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_retour.jsp?lg_GROSSISTE_ID=" + lg_GROSSISTE_ID;
            }

        } else if (str_TYPE_TRANSACTION == "VENTE") { //affiche vente
//            alert("Je suis dans la vente");
            //  Ext.getCmp("lg_GROSSISTE_ID").hide();
            url_services_data = "../webservices/stockmanagement/suivistockvente/ws_data_mouvement_vente.jsp";

        }

        //alert("url_services_data "+url_services_data);

        if (new Date(valdatedebut) > new Date(valdatefin)) {
            Ext.MessageBox.alert("Erreur au niveau date", "La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin");
            return;
        }
        this.getStore().getProxy().url = url_services_data;
        this.getStore().load({
            params: {
                search_value: val.value,
                datedebut: valdatedebut,
                datefin: valdatefin,
                lg_FABRIQUANT_ID: lg_FABRIQUANT_ID,
                lg_FAMILLEARTICLE_ID: lg_FAMILLEARTICLE_ID,
                lg_ZONE_GEO_ID: lg_ZONE_GEO_ID
            }
        }, url_services_data);
        this.getStore().getProxy().url = url_services_data_detailentreesortie;
    }

});