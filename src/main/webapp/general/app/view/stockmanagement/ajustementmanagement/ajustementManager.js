/* global Ext */

var url_services_data_ajustementmanagement = '../webservices/stockmanagement/ajustementmanagement/ws_data.jsp';
var url_services_transaction_ajustementmanagement_base = '../webservices/stockmanagement/ajustementmanagement/ws_transaction.jsp?mode=';
var url_services_pdf_liste_ajustementmanagement = '../webservices/stockmanagement/ajustementmanagement/ws_generate_pdf.jsp';

var Me;
var valdatedebut = "";
var valdatefin = "";

Ext.define('testextjs.view.stockmanagement.ajustementmanagement.ajustementManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'ajustementmanager',
    id: 'ajustementmanagerID',
    frame: true,
//    collapsible: true,
    animCollapse: false,
    title: 'Gestion des ajustements de stock',
    plain: true,
    maximizable: true,
//    tools: [{type: "pin"}],
    closable: false,
    iconCls: 'icon-grid',
    plugins: [{
            ptype: 'rowexpander',
            rowBodyTpl: new Ext.XTemplate(
                    '<p> {str_FAMILLE_ITEM}</p>',
                    {
                        formatChange: function(v) {
                            var color = v >= 0 ? 'green' : 'red';
                            return '<span style="color: ' + color + ';">' + Ext.util.Format.usMoney(v) + '</span>';
                        }
                    })
        }],
    initComponent: function() {

        Me = this;
        var itemsPerPage = 20;
        valdatedebut = "";
        valdatefin = "";
        var store = new Ext.data.Store({
            model: 'testextjs.model.Ajustement',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: url_services_data_ajustementmanagement,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 180000
            }

        });


        Ext.apply(this, {
            width: '98%',
            height: 580,
            id: 'GridPanelID',
            //  plugins: [this.cellEditing],
            store: store,
            columns: [{
                    header: 'lg_AJUSTEMENT_ID',
                    dataIndex: 'lg_AJUSTEMENT_ID',
                    hidden: true,
                    flex: 1
                }, {
                    header: 'Libell&eacute;',
                    dataIndex: 'str_NAME',
                    flex: 1
                }, {
                    header: 'Commentaire',
                    dataIndex: 'str_COMMENTAIRE',
                    flex: 2
                }, {
                    header: 'Utilisateur',
                    dataIndex: 'lg_USER_ID',
                    flex: 1
                }, {
                    header: 'Date',
                    dataIndex: 'dt_CREATED',
                    flex: 1
                }, {
                    header: 'Heure',
                    dataIndex: 'dt_UPDATED',
                    flex: 1
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/page_white_edit.png',
                            tooltip: 'Voir Details',
                            scope: this,
                            handler: this.onManageDetailsClick,
                            getClass: function(value, metadata, record) {
                                if (record.get('str_STATUT') == "enable") {  //read your condition from the record
                                    return 'x-display-hide'; //affiche l'icone
                                } else {
                                    return 'x-hide-display'; //cache l'icone
                                }
                            }
                        }]
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [
                        {
                          
                            scope: this,
                             getClass: function (value, metadata, record) {
                                 
                                if (record.get('BTNDELETE')) {  
                                    return 'unpaid'; 
                                } else {
                                    return 'lock'; 
                                }
                            },getTip: function (v, meta, rec) {
                                
                                    if (rec.get('BTNDELETE')) {
                                        return 'Supprimer';
                                    } else
                                    {
                                       // return ' ';
                                    }

                            }
                            ,
                            handler: this.onRemoveClick
                        }]
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [
                        {
                            icon: 'resources/images/icons/fam/printer.png',
                            tooltip: 'Imprimer une fiche de cet ajustement',
                            scope: this,
                            handler: this.onbtnprint,
                            getClass: function(value, metadata, record) {
                                if (record.get('str_STATUT') == "enable") {  //read your condition from the record
                                    return 'x-display-hide'; //affiche l'icone
                                } else {
                                    return 'x-hide-display'; //cache l'icone
                                }
                            }
                        }
                    
                    ]
                }],
            selModel: {
                selType: 'rowmodel'
            },
            tbar: [
                {
                    text: 'Faire un ajustement',
                    iconCls: 'addicon',
                    scope: this,
                    cls: 'btn-primary',
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    cls: 'btn-primaryb',
                    enableKeyEvents: true,
                    emptyText: 'Rech',
                    listeners: {
                        specialKey: function(field, e, option) {
                            if (e.getKey() === e.ENTER) {
                                Me.onRechClick();
                            }
                        }}
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
                        'change': function(me) {
                            valdatedebut = me.getSubmitValue();
                            Ext.getCmp('datefin').setMinValue(me.getValue());
                            // Ext.getCmp('GridSuiviStockVenteID').getStore().getProxy().url = url_services_data_suivistockvente + "?dt_Date_Debut=" + valdatedebut;
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
                        'change': function(me) {
                            valdatefin = me.getSubmitValue();
                            Ext.getCmp('datedebut').setMaxValue(me.getValue());
                            // Ext.getCmp('GridSuiviStockVenteID').getStore().getProxy().url = url_services_data_suivistockvente + "?dt_Date_Debut=" + valdatedebut + "&dt_Date_Fin=" + valdatefin;

                        }
                    }
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    scope: this,
                    iconCls: 'searchicon',
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
    // Ext.getCmp('GridPanelID').getStore().load();
    loadStore: function() {
       
    },
    onStoreLoad: function() {
    },
    onManageDetailsClick: function(grid, rowIndex) {

        var rec = grid.getStore().getAt(rowIndex);
        //    alert("id "+rec.get('lg_AJUSTEMENT_ID'));
        var xtype = "showdetailajustementmanager";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "by_detail_ajustementmanagement", rec.get('lg_AJUSTEMENT_ID'), rec.data);
    },
    onbtnprint: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        Ext.MessageBox.confirm('Message',
                'Confirmation de l\'impression du detail de cet ajustement',
                function(btn) {
                    if (btn == 'yes') {
                        Me.onPdfClick(rec.get('lg_AJUSTEMENT_ID'));
                        return;
                    }
                });

    },
    onPdfClick: function(lg_AJUSTEMENT_ID) {
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url_services_pdf_liste_ajustementmanagement + "?lg_AJUSTEMENT_ID=" + lg_AJUSTEMENT_ID;
        window.open(linkUrl);
    },
    onRemoveClick: function(grid, rowIndex) {
      
      var rec = grid.getStore().getAt(rowIndex);
      if(rec.get('BTNDELETE')===false){
          return;
      }
        Ext.MessageBox.confirm('Message',
                'Confirmer la suppresssion',
                function(btn) {
                    if (btn == 'yes') {
                        
                        Ext.Ajax.request({
                            url: url_services_transaction_ajustementmanagement_base + 'delete',
                            params: {
                                lg_AJUSTEMENT_ID: rec.get('lg_AJUSTEMENT_ID')
                            },
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                }
                                grid.getStore().reload();
                            },
                            failure: function(response)
                            {

                                var object = Ext.JSON.decode(response.responseText, false);
                                //  alert(object);

                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    }
                });

    },
    onAddClick: function() {
        var xtype = "doajustementmanager";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponent(xtype, "Ajout De Produit(s)", "0");
    },
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');

        this.getStore().load({
            params: {
                search_value: val.getValue(),
                datedebut: valdatedebut,
                datefin: valdatefin
            }
        }, url_services_data_ajustementmanagement);
    }

});