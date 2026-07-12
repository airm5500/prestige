/* global Ext, valheight */

// Écran « Point détaillé entrée/sortie » : refonte REST.
// Une seule URL pour la grille (l'ancien basculement d'URL JSP par type de
// transaction est remplacé par le paramètre transactionType), filtres
// factorisés dans getFilters(), exports et créations reprenant les mêmes
// paramètres que la grille.
var url_stock_movements = "../api/v1/stock-movements";

var url_services_data_zonegeo = "../webservices/configmanagement/zonegeographique/ws_data.jsp";
var url_services_data_famillearticle = "../webservices/configmanagement/famillearticle/ws_data.jsp";

var Me;
Ext.define("testextjs.view.stockmanagement.suivistockvente.SuiviDetailStockVenteManager", {
    extend: "Ext.grid.Panel",
    xtype: "detailentreesortie",
    id: "detailentreesortieID",
    requires: [
        "Ext.selection.CheckboxModel",
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
                url: url_stock_movements,
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

        var store_type = new Ext.data.Store({
            fields: ["str_TYPE_TRANSACTION", "str_STATUT_TRANSACTION"],
            data: [
                {str_TYPE_TRANSACTION: "Tous", str_STATUT_TRANSACTION: "TOUS"},
                {str_TYPE_TRANSACTION: "Entree en stock", str_STATUT_TRANSACTION: "ENTREESTOCK"},
                {str_TYPE_TRANSACTION: "Saisie en perimes", str_STATUT_TRANSACTION: "PERIME"},
                {str_TYPE_TRANSACTION: "Retour fournisseur", str_STATUT_TRANSACTION: "RETOURFOURNISSEUR"},
                {str_TYPE_TRANSACTION: "Vente", str_STATUT_TRANSACTION: "VENTE"},
                {str_TYPE_TRANSACTION: "Ajustement", str_STATUT_TRANSACTION: "AJUSTEMENT"}
            ]
        });

        var store_grossiste = new Ext.data.Store({
            model: "testextjs.model.Grossiste",
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: "ajax",
                url: "../api/v1/grossiste/all",
                reader: {
                    type: "json",
                    root: "results",
                    totalProperty: "total"
                }
            }
        });

        Ext.apply(this, {
            width: "98%",
            height: valheight,
            store: store,
            id: "GridSuiviStockVenteID",
            columns: [{
                    xtype: "rownumberer",
                    text: "Num.Ligne",
                    width: 45,
                    sortable: true
                }, {
                    header: "lg_FAMILLE_ID",
                    dataIndex: "lg_FAMILLE_ID",
                    hidden: true,
                    flex: 1
                }, {
                    header: "CIP",
                    dataIndex: "int_CIP",
                    flex: 0.7
                },
                {
                    header: "Article",
                    dataIndex: "str_NAME",
                    flex: 2
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
                selType: "checkboxmodel",
                mode: "SIMPLE",
                checkOnly: true
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
                    queryMode: "local",
                    forceSelection: true,
                    value: "TOUS",
                    flex: 1,
                    emptyText: "Type de transaction...",
                    listeners: {
                        select: function () {
                            Me.reloadGrid();
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
                        select: function () {
                            Me.reloadGrid();
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
                        select: function () {
                            Me.reloadGrid();
                        }
                    }
                }, "-", {
                    xtype: "combobox",
                    name: "lg_GROSSISTE_ID",
                    margins: "0 0 0 10",
                    id: "lg_GROSSISTE_ID",
                    store: store_grossiste,
                    valueField: "lg_GROSSISTE_ID",
                    displayField: "str_LIBELLE",
                    typeAhead: true,
                    queryMode: "remote",
                    flex: 1,
                    emptyText: "Selectionner fournisseur...",
                    listeners: {
                        select: function () {
                            Me.reloadGrid();
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
                        change: function (me) {
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
                        change: function (me) {
                            Ext.getCmp("datedebut").setMaxValue(me.getValue());
                        }
                    }
                }, "-", {
                    xtype: "textfield",
                    id: "rechecher",
                    name: "facture",
                    emptyText: "Recherche",
                    listeners: {
                        render: function (cmp) {
                            cmp.getEl().on("keypress", function (e) {
                                if (e.getKey() === e.ENTER) {
                                    Me.onRechClick();
                                }
                            });
                        }
                    }
                }, {
                    text: "rechercher",
                    tooltip: "rechercher",
                    iconCls: "searchicon",
                    scope: this,
                    handler: this.onRechClick
                }, "-", {
                    text: "Excel",
                    tooltip: "Exporter toutes les lignes filtrees au format Excel",
                    scope: this,
                    handler: function () {
                        this.doExport("xlsx");
                    }
                }, {
                    text: "CSV",
                    tooltip: "Exporter toutes les lignes filtrees au format CSV",
                    scope: this,
                    handler: function () {
                        this.doExport("csv");
                    }
                }, "-", {
                    text: "Inventaire",
                    tooltip: "Creer un inventaire depuis la selection ou tout le resultat filtre",
                    scope: this,
                    handler: function () {
                        this.doCreate("inventory", "Cr&eacute;ation d'inventaire");
                    }
                }, {
                    text: "Suggestion",
                    tooltip: "Creer une suggestion de commande depuis la selection ou tout le resultat filtre",
                    scope: this,
                    handler: function () {
                        this.doCreate("suggestion", "Cr&eacute;ation de suggestion");
                    }
                }],
            bbar: {
                xtype: "pagingtoolbar",
                store: store, // same store GridPanel is using
                dock: "bottom",
                displayInfo: true,
                pageSize: 20,
                listeners: {
                    beforechange: function () {
                        Me.applyFilters();
                    }
                }
            }
        });

        this.callParent();

        this.on("afterlayout", this.loadStore, this, {
            delay: 1,
            single: true
        });
    },
    loadStore: function () {
        this.applyFilters();
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
    },
    // Lit tous les champs de filtre de la barre d'outils.
    getFilters: function () {
        var filters = {
            transactionType: Ext.getCmp("str_TYPE_TRANSACTION").getValue() || "TOUS",
            searchValue: Ext.getCmp("rechecher").getValue() || "",
            dateDebut: Ext.getCmp("datedebut").getSubmitValue() || "",
            dateFin: Ext.getCmp("datefin").getSubmitValue() || "",
            grossisteId: Ext.getCmp("lg_GROSSISTE_ID").getValue() || "",
            familleArticleId: Ext.getCmp("lg_FAMILLEARTICLE_ID").getValue() || "",
            zoneGeoId: Ext.getCmp("lg_ZONE_GEO_ID").getValue() || ""
        };
        return filters;
    },
    checkDates: function () {
        var debut = Ext.getCmp("datedebut").getValue();
        var fin = Ext.getCmp("datefin").getValue();
        if (debut && fin && debut > fin) {
            Ext.MessageBox.alert("Erreur au niveau date",
                    "La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin");
            return false;
        }
        return true;
    },
    // Reporte les filtres courants sur le proxy : la pagination les conserve.
    applyFilters: function () {
        var proxy = this.getStore().getProxy();
        var filters = this.getFilters();
        for (var key in filters) {
            if (filters.hasOwnProperty(key)) {
                proxy.setExtraParam(key, filters[key]);
            }
        }
    },
    reloadGrid: function () {
        if (!this.checkDates()) {
            return;
        }
        this.applyFilters();
        this.getStore().loadPage(1);
    },
    onRechClick: function () {
        Me.reloadGrid();
    },
    buildExportUrl: function (format) {
        return url_stock_movements + "/export." + format + "?" + Ext.Object.toQueryString(this.getFilters());
    },
    doExport: function (format) {
        if (!this.checkDates()) {
            return;
        }
        window.open(this.buildExportUrl(format), "_blank");
    },
    getSelectedProductIds: function () {
        var ids = [];
        Ext.Array.each(this.getSelectionModel().getSelection(), function (record) {
            var id = record.get("lg_FAMILLE_ID");
            if (id && ids.indexOf(id) === -1) {
                ids.push(id);
            }
        });
        return ids;
    },
    // Deux modes : lignes cochees si une selection existe, sinon tout le resultat filtre.
    doCreate: function (action, title) {
        if (!this.checkDates()) {
            return;
        }
        var me = this;
        var selectedIds = this.getSelectedProductIds();
        var scope = selectedIds.length > 0
                ? selectedIds.length + " produit(s) s&eacute;lectionn&eacute;(s)"
                : "tous les produits du r&eacute;sultat filtr&eacute;";
        Ext.MessageBox.confirm(title, "Confirmer la cr&eacute;ation pour " + scope + " ?", function (btn) {
            if (btn !== "yes") {
                return;
            }
            var payload = me.getFilters();
            payload.selectedProductIds = selectedIds;
            Ext.Ajax.request({
                url: url_stock_movements + "/" + action,
                method: "POST",
                jsonData: payload,
                success: function (response) {
                    var result = Ext.decode(response.responseText, true) || {};
                    if (result.success) {
                        Ext.MessageBox.alert(title,
                                (result.count || 0) + " produit(s) pris en compte");
                    } else {
                        Ext.MessageBox.alert(title, result.msg || "L'op&eacute;ration a &eacute;chou&eacute;");
                    }
                },
                failure: function () {
                    Ext.MessageBox.alert(title, "L'op&eacute;ration a &eacute;chou&eacute;");
                }
            });
        });
    }
});
