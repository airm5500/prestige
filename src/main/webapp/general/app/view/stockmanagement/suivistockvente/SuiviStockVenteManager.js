/* global Ext */

var url_services_data_suivistockvente = '../webservices/stockmanagement/suivistockvente/ws_data.jsp';
var url_services_data_article = '../webservices/sm_user/famille/ws_data.jsp';

var url_services_data_famillearticle = "../webservices/configmanagement/famillearticle/ws_data.jsp";
var url_services_data_fabriquant = "../webservices/configmanagement/fabriquant/ws_data.jsp";

var valdatedebut = "";
var valdatefin = "";
var lg_FAMILLEARTICLE_ID = "";
var lg_ZONE_GEO_ID = "";
var lg_FABRIQUANT_ID = "";
var Me;

Ext.define('testextjs.view.stockmanagement.suivistockvente.SuiviStockVenteManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'suivientreevente',
    id: 'suivientreeventeID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    title: 'Suivi mouvement article',
    closable: false,
    frame: true,
    viewConfig: {
        listeners: {
            cellclick: function (view, cell, cellIndex, record, row, rowIndex, e) { //gere le click sur la cellule d'une grid donné

                var clickedDataIndex = view.panel.headerCt.getHeaderAtIndex(cellIndex).dataIndex; //recupere l'index de la colonne sur lequel l'on a cliqué
//                var clickedColumnName = view.panel.headerCt.getHeaderAtIndex(cellIndex).text; //recupere le nom de la colonne sur lequel l'on a cliqué 
//                var clickedCellValue = record.get(clickedDataIndex); //recupere la valeur de la colonne sur lequel l'on a cliqué

                if (clickedDataIndex == "int_NUMBER_VENTE") {
                    new testextjs.view.stockmanagement.suivistockvente.action.detailVente({
                        odatasource: record.get('lg_FAMILLE_ID'),
                        parentview: this,
                        mode: "update",
                        datedebut: valdatedebut,
                        datedin: valdatefin,
                        titre: "Detail sur l'article [" + record.get('str_NAME') + "]"
                    });
                } else if (clickedDataIndex == "int_NUMBER_RETOUR") {
                    new testextjs.view.stockmanagement.suivistockvente.action.detailRetour({
                        odatasource: record.get('lg_FAMILLE_ID'),
                        parentview: this,
                        mode: "update",
                        datedebut: valdatedebut,
                        datedin: valdatefin,
                        titre: "Detail sur l'article [" + record.get('str_NAME') + "]"
                    });
                } else if (clickedDataIndex == "int_NUMBER_PERIME") {
                    new testextjs.view.stockmanagement.suivistockvente.action.detailPerime({
                        odatasource: record.get('lg_FAMILLE_ID'),
                        parentview: this,
                        mode: "update",
                        datedebut: valdatedebut,
                        datedin: valdatefin,
                        titre: "Detail sur l'article [" + record.get('str_NAME') + "]"
                    });
                } else if (clickedDataIndex == "int_NUMBER_AJUSTEMENT_OUT" || clickedDataIndex == "int_NUMBER_AJUSTEMENT_IN") {
                    new testextjs.view.stockmanagement.suivistockvente.action.detailAjustement({
                        odatasource: record.get('lg_FAMILLE_ID'),
                        parentview: this,
                        mode: "update",
                        other: clickedDataIndex,
                        datedebut: valdatedebut,
                        datedin: valdatefin,
                        titre: "Detail sur l'article [" + record.get('str_NAME') + "]"
                    });
                } else if (clickedDataIndex == "int_NUMBER_DECONDITIONNEMENT_IN" || clickedDataIndex == "int_NUMBER_DECONDITIONNEMENT_OUT") {
                    new testextjs.view.stockmanagement.suivistockvente.action.detailOther({
                        odatasource: record.get('lg_FAMILLE_ID'),
                        parentview: this,
                        mode: "update",
                        other: clickedDataIndex,
                        datedebut: valdatedebut,
                        datedin: valdatefin,
                        titre: "Detail sur l'article [" + record.get('str_NAME') + "]"
                    });
                } else if (clickedDataIndex == "int_NUMBER_INVENTAIRE") {
                    new testextjs.view.stockmanagement.suivistockvente.action.detailInventaire({
                        odatasource: record.get('lg_FAMILLE_ID'),
                        parentview: this,
                        mode: "update",
                        datedebut: valdatedebut,
                        datedin: valdatefin,
                        titre: "Detail sur l'article [" + record.get('str_NAME') + "]"
                    });
                } else if (clickedDataIndex == "int_NUMBER_BON") {
                    new testextjs.view.stockmanagement.suivistockvente.action.detailEntree({
                        odatasource: record.get('lg_FAMILLE_ID'),
                        parentview: this,
                        mode: "update",
                        datedebut: valdatedebut,
                        datedin: valdatefin,
                        titre: "Detail sur l'article [" + record.get('str_NAME') + "]"
                    });
                }



                // alert('clickedCellValue '+clickedCellValue + " clickedColumnName " + clickedColumnName + " clickedDataIndex "+clickedDataIndex + " valeur article " + record.get('str_NAME') + " lg_FAMILLE_ID "+ record.get('lg_FAMILLE_ID'));
            }
        }
    },
    initComponent: function () {

        Me = this;
        valdatedebut = "";
        valdatefin = "";
        lg_FAMILLEARTICLE_ID = "";
        lg_ZONE_GEO_ID = "";
        lg_FABRIQUANT_ID = "";
        var itemsPerPage = 20;

        var store = new Ext.data.Store({
            model: 'testextjs.model.FamilleStock',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_suivistockvente,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 18000000
            }

        });

        var store_zonegeo = new Ext.data.Store({
            model: "testextjs.model.ZoneGeographique",
            pageSize: itemsPerPage,
            // autoLoad: false,
            remoteFilter: true,
            proxy: {
                type: "ajax",
                url: '../webservices/configmanagement/zonegeographique/ws_data.jsp',
                reader: {
                    type: "json",
                    root: "results",
                    totalProperty: "total"
                }
            },
            autoLoad: true

        });

        var store_famillearticle = new Ext.data.Store({
            model: "testextjs.model.FamilleArticle",
            pageSize: itemsPerPage,
            // autoLoad: false,
            remoteFilter: true,
            proxy: {
                type: "ajax",
                url: url_services_data_famillearticle,
                reader: {
                    type: "json",
                    root: "results",
                    totalProperty: "total"
                }
            },
            autoLoad: true

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


        var store_famille = new Ext.data.Store({
            model: 'testextjs.model.Famille',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_article,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });


        Ext.apply(this, {
            width: '98%',
            height: 580,
            plugins: [this.cellEditing],
            groupField: 'lg_FAMILLEARTICLE_ID',
            store: store,
            id: 'GridSuiviStockVenteID',
            columns: [{
                    xtype: 'rownumberer',
                    text: 'Num.Ligne',
                    width: 45,
                    hidden: true,
                    sortable: true/*,
                     locked: true*/
                }, {
                    header: 'lg_FAMILLE_ID',
                    dataIndex: 'lg_FAMILLE_ID',
                    hidden: true,
                    flex: 1
                },
                {
                    header: 'CIP',
                    dataIndex: 'int_CIP',
                    flex: 1,
                     renderer: function (v, m, r) {
                        
//                        var Stock = r.data.int_STOCK;
//                        if(Stock===0){
//                          m.style = 'background-color:#B0F2B6;font-weight:800;';  
//                        }
//                          else if(Stock>0) {
//                               m.style = 'font-weight:800;';
//                          }
//                          else if(Stock<0){
//                              m.style = 'background-color:#F5BCA9;font-weight:800;'; 
//                          }
                        return v;
                    }
                },
                {
                    header: 'D&eacute;signation',
                    dataIndex: 'str_NAME',
                    flex: 2,
                     renderer: function (v, m, r) {
                        
//                        var Stock = r.data.int_STOCK;
//                        if(Stock===0){
//                          m.style = 'background-color:#B0F2B6;font-weight:800;';  
//                        }
//                          else if(Stock>0) {
//                               m.style = 'font-weight:800;';
//                          }
//                          else if(Stock<0){
//                              m.style = 'background-color:#F5BCA9;font-weight:800;'; 
//                          }
                        return v;
                    }
                },
                
                {
                    text: 'Sortie',
                    columns: [
                        {
                            text: 'Vente',
                            dataIndex: 'int_NUMBER_VENTE',
                            flex: 0.7,
                            align:'right',
                             renderer: function (v, m, r) {
                        
//                        var Stock = r.data.int_STOCK;
//                        if(Stock===0){
//                          m.style = 'background-color:#B0F2B6;font-weight:800;';  
//                        }
//                          else if(Stock>0) {
//                               m.style = 'font-weight:800;';
//                          }
//                          else if(Stock<0){
//                              m.style = 'background-color:#F5BCA9;font-weight:800;'; 
//                          }
                        return v;
                    }
                        },
                        {
                            text: 'Ret.four',
                            dataIndex: 'int_NUMBER_RETOUR'
                            ,
                            flex: 0.7,
                             align:'right',
                              renderer: function (v, m, r) {
                        
//                        var Stock = r.data.int_STOCK;
//                        if(Stock===0){
//                          m.style = 'background-color:#B0F2B6;font-weight:800;';  
//                        }
//                          else if(Stock>0) {
//                               m.style = 'font-weight:800;';
//                          }
//                          else if(Stock<0){
//                              m.style = 'background-color:#F5BCA9;font-weight:800;'; 
//                          }
                        return v;
                    }
                        },
                        {
                            text: 'Qte.P&eacute;rim',
                            dataIndex: 'int_NUMBER_PERIME',
                             align:'right',
                            flex: 0.7,
                             renderer: function (v, m, r) {
                        
//                        var Stock = r.data.int_STOCK;
//                        if(Stock===0){
//                          m.style = 'background-color:#B0F2B6;font-weight:800;';  
//                        }
//                          else if(Stock>0) {
//                               m.style = 'font-weight:800;';
//                          }
//                          else if(Stock<0){
//                              m.style = 'background-color:#F5BCA9;font-weight:800;'; 
//                          }
                        return v;
                    }
                        },
                        {
                            text: 'Qte.Ajust&eacute;',
                            dataIndex: 'int_NUMBER_AJUSTEMENT_OUT',
                             align:'right',
                            flex: 0.7,
                             renderer: function (v, m, r) {
                        
//                        var Stock = r.data.int_STOCK;
//                        if(Stock===0){
//                          m.style = 'background-color:#B0F2B6;font-weight:800;';  
//                        }
//                          else if(Stock>0) {
//                               m.style = 'font-weight:800;';
//                          }
//                          else if(Stock<0){
//                              m.style = 'background-color:#F5BCA9;font-weight:800;'; 
//                          }
                        return v;
                    }
                        },
                        {
                            text: 'Qte.D&eacute;con',
                            dataIndex: 'int_NUMBER_DECONDITIONNEMENT_OUT',
                             align:'right',
                            flex: 0.7,
                             renderer: function (v, m, r) {
                        
//                        var Stock = r.data.int_STOCK;
//                        if(Stock===0){
//                          m.style = 'background-color:#B0F2B6;font-weight:800;';  
//                        }
//                          else if(Stock>0) {
//                               m.style = 'font-weight:800;';
//                          }
//                          else if(Stock<0){
//                              m.style = 'background-color:#F5BCA9;font-weight:800;'; 
//                          }
                        return v;
                    }
                        }



                    ]
                },
                {
                    text: 'Entr&eacute;e',
                    columns: [
                        {
                            text: 'Qte.Entr&eacute;e',
                            dataIndex: 'int_NUMBER_BON',
                             align:'right',
                            flex: 0.7,
                             renderer: function (v, m, r) {
                        
//                        var Stock = r.data.int_STOCK;
//                        if(Stock===0){
//                          m.style = 'background-color:#B0F2B6;font-weight:800;';  
//                        }
//                          else if(Stock>0) {
//                               m.style = 'font-weight:800;';
//                          }
//                          else if(Stock<0){
//                              m.style = 'background-color:#F5BCA9;font-weight:800;'; 
//                          }
                        return v;
                    }
                        },
                        {
                            text: 'Qte.Ajust&eacute;',
                            dataIndex: 'int_NUMBER_AJUSTEMENT_IN',
                             align:'right',
                            flex: 0.7,
                             renderer: function (v, m, r) {
                        
//                        var Stock = r.data.int_STOCK;
//                        if(Stock===0){
//                          m.style = 'background-color:#B0F2B6;font-weight:800;';  
//                        }
//                          else if(Stock>0) {
//                               m.style = 'font-weight:800;';
//                          }
//                          else if(Stock<0){
//                              m.style = 'background-color:#F5BCA9;font-weight:800;'; 
//                          }
                        return v;
                    }
                        },
                        {
                            text: 'Qte.D&eacute;con',
                            dataIndex: 'int_NUMBER_DECONDITIONNEMENT_IN',
                             align:'right',
                            flex: 0.7,
                             renderer: function (v, m, r) {
                        
//                        var Stock = r.data.int_STOCK;
//                        if(Stock===0){
//                          m.style = 'background-color:#B0F2B6;font-weight:800;';  
//                        }
//                          else if(Stock>0) {
//                               m.style = 'font-weight:800;';
//                          }
//                          else if(Stock<0){
//                              m.style = 'background-color:#F5BCA9;font-weight:800;'; 
//                          }
                        return v;
                    }
                        }
                    ]
                },
                {
                    header: 'Qte.Inv',
                    dataIndex: 'int_NUMBER_INVENTAIRE',
                     align:'right',
                    flex: 1,
                     renderer: function (v, m, r) {
                        
//                        var Stock = r.data.int_STOCK;
//                        if(Stock===0){
//                          m.style = 'background-color:#B0F2B6;font-weight:800;';  
//                        }
//                          else if(Stock>0) {
//                               m.style = 'font-weight:800;';
//                          }
//                          else if(Stock<0){
//                              m.style = 'background-color:#F5BCA9;font-weight:800;'; 
//                          }
                        return v;
                    }
                },
                {
                    text: 'Qte.Cmde',
                    dataIndex: 'int_NUMBER_CMDE',
                     align:'right',
                    hidden: true,
                    flex: 1,
                     renderer: function (v, m, r) {
                        
//                        var Stock = r.data.int_STOCK;
//                        if(Stock===0){
//                          m.style = 'background-color:#B0F2B6;font-weight:800;';  
//                        }
//                          else if(Stock>0) {
//                               m.style = 'font-weight:800;';
//                          }
//                          else if(Stock<0){
//                              m.style = 'background-color:#F5BCA9;font-weight:800;'; 
//                          }
                        return v;
                    }
                },
                {
                    header: 'Stock',
                    dataIndex: 'int_TAUX_MARQUE',
                     align:'right',
                    flex: 1,
                     renderer: function (v, m, r) {
//                        var Stock = r.data.int_STOCK;
//                        if(Stock===0){
//                          m.style = 'background-color:#B0F2B6;font-weight:800;';  
//                        }
//                          else if(Stock>0) {
//                               m.style = 'font-weight:800;';
//                          }
//                          else if(Stock<0){
//                              m.style = 'background-color:#F5BCA9;font-weight:800;'; 
//                          }
                        return v;
                    }
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/application_view_list.png',
                            tooltip: 'Detail sur l\'article',
                            scope: this,
                            handler: this.onDetailClick
                        }]
                }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [{
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
                            lg_FAMILLEARTICLE_ID = cmp.getValue();
                            Ext.getCmp('GridSuiviStockVenteID').getStore().getProxy().url = url_services_data_suivistockvente + "?dt_Date_Debut=" + valdatedebut + "&dt_Date_Fin=" + valdatefin + "&lg_FABRIQUANT_ID=" + lg_FABRIQUANT_ID + "&lg_ZONE_GEO_ID=" + lg_ZONE_GEO_ID + "&lg_FAMILLEARTICLE_ID=" + lg_FAMILLEARTICLE_ID;
                            Me.onRechClick();
                            Ext.getCmp('GridSuiviStockVenteID').getStore().getProxy().url = url_services_data_suivistockvente;

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
                    emptyText: "Sélectionner zone geographique...",
                    listeners: {
                        select: function (cmp) {
                            lg_ZONE_GEO_ID = cmp.getValue();
                            Ext.getCmp('GridSuiviStockVenteID').getStore().getProxy().url = url_services_data_suivistockvente + "?dt_Date_Debut=" + valdatedebut + "&dt_Date_Fin=" + valdatefin + "&lg_FABRIQUANT_ID=" + lg_FABRIQUANT_ID + "&lg_ZONE_GEO_ID=" + lg_ZONE_GEO_ID;
                            Me.onRechClick();
                            Ext.getCmp('GridSuiviStockVenteID').getStore().getProxy().url = url_services_data_suivistockvente;

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
                    emptyText: "Sélectionner fabriquant...",
                    listeners: {
                        select: function (cmp) {
                            lg_FABRIQUANT_ID = cmp.getValue();
                            Ext.getCmp('GridSuiviStockVenteID').getStore().getProxy().url = url_services_data_suivistockvente + "?dt_Date_Debut=" + valdatedebut + "&dt_Date_Fin=" + valdatefin + "&lg_FABRIQUANT_ID=" + lg_FABRIQUANT_ID;
                            Me.onRechClick();
                            Ext.getCmp('GridSuiviStockVenteID').getStore().getProxy().url = url_services_data_suivistockvente;

                        }
                    }
                }, '-', {
                    xtype: 'datefield',
                    id: 'datedebut',
                    name: 'datedebut',
                    emptyText: 'Date debut',
                    submitFormat: 'Y-m-d',
                    maxValue: new Date(),
                    flex: 0.7,
                    format: 'd/m/Y',
                    listeners: {
                        'change': function (me) {
                            valdatedebut = me.getSubmitValue();
                            Ext.getCmp('datefin').setMinValue(me.getValue());
                            Ext.getCmp('GridSuiviStockVenteID').getStore().getProxy().url = url_services_data_suivistockvente + "?dt_Date_Debut=" + valdatedebut;
                        }
                    }
                }, {
                    xtype: 'datefield',
                    id: 'datefin',
                    name: 'datefin',
                    emptyText: 'Date fin',
                    maxValue: new Date(),
                    flex: 0.7,
                    submitFormat: 'Y-m-d',
                    format: 'd/m/Y',
                    listeners: {
                        'change': function (me) {
                            valdatefin = me.getSubmitValue();
                            Ext.getCmp('datedebut').setMaxValue(me.getValue());
                            Ext.getCmp('GridSuiviStockVenteID').getStore().getProxy().url = url_services_data_suivistockvente + "?dt_Date_Debut=" + valdatedebut + "&dt_Date_Fin=" + valdatefin;

                        }
                    }
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'facture',
                    emptyText: 'Rech',
                    enableKeyEvents: true,
                    listeners: {
                        specialKey: function (field, e, options) {
                            if (e.getKey() === e.ENTER) {
                               Ext.getCmp('GridSuiviStockVenteID').getStore().load({
                                    params: {
                                        search_value: field.getValue(),
                                        dt_Date_Debut: valdatedebut,
                                        dt_Date_Fin: valdatefin,
                                        lg_FABRIQUANT_ID: lg_FABRIQUANT_ID,
                                        lg_FAMILLEARTICLE_ID: lg_FAMILLEARTICLE_ID,
                                        lg_ZONE_GEO_ID: lg_ZONE_GEO_ID
                                    }
                                }, url_services_data_suivistockvente);

//                                Me.onRechClick(); 
                            }
                        }

                    }
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    scope: this,
                    handler: this.onRechClick
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                store: store, // same store GridPanel is using
                dock: 'bottom',
                displayInfo: true
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });


    },
    onDetailClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);

        new testextjs.view.stockmanagement.suivistockvente.action.detailStock({
            odatasource: rec.get('lg_FAMILLE_ID'),
            parentview: this,
            mode: "update",
            datedebut: valdatedebut,
            datedin: valdatefin,
            titre: "Detail sur l'article [" + rec.get('str_NAME') + "]"
        });
    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
    },
    onRechClick: function () {
        var val = Ext.getCmp('rechecher');

        if (new Date(valdatedebut) > new Date(valdatefin)) {
            Ext.MessageBox.alert('Erreur au niveau date', 'La date de d&eacute;but doit &ecirc;tre inf&eacute;rieur &agrave; la date fin');
            return;
        }

        this.getStore().load({
            params: {
                search_value: val.getValue(),
                dt_Date_Debut: valdatedebut,
                dt_Date_Fin: valdatefin,
                lg_FABRIQUANT_ID: lg_FABRIQUANT_ID,
                lg_FAMILLEARTICLE_ID: lg_FAMILLEARTICLE_ID,
                lg_ZONE_GEO_ID: lg_ZONE_GEO_ID
            }
        }, url_services_data_suivistockvente);
    }

});