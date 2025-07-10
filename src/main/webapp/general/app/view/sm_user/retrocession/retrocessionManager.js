/* global Ext */

var url_services_data_retrocession = '../webservices/sm_user/retrocession/ws_data.jsp';
var url_services_transaction_retrocession = '../webservices/sm_user/retrocession/ws_transaction.jsp?mode=';
var url_services_pdf_liste_retrocession = '../webservices/sm_user/retrocession/ws_generate_pdf.jsp';

var Me;

Ext.define('testextjs.view.sm_user.retrocession.retrocessionManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'retrocessionmanager',
    id: 'retrocessionmanagerID',
    frame: true,
//    collapsible: true,
    animCollapse: false,
    title: 'Gestion des retrocessions',
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
        //alert("url_services_data_retrocession "+url_services_data_retrocession);
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Retrocession',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_retrocession,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        Ext.apply(this, {
            width: '98%',
            height: valheight,
            id: 'Grid_retrocession_ID',
            //  plugins: [this.cellEditing],
            store: store,
            columns: [{
                    header: 'lg_RETROCESSION_ID',
                    dataIndex: 'lg_RETROCESSION_ID',
                    hidden: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, {
                    header: 'Reference',
                    dataIndex: 'str_REFERENCE',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                }, {
                    header: 'str_COMMENTAIRE',
                    dataIndex: 'str_COMMENTAIRE',
                    flex: 1, 
                    hidden: true/*,
                     editor: {
                     allowBlank: false
                     }*/

                }, {
                    header: 'Montant',
                    dataIndex: 'int_MONTANT_HT',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                }, {
                    header: 'Montant avec remise',
                    dataIndex: 'int_MONTANT_TTC',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                }, {
                    header: 'Confrere',
                    dataIndex: 'lg_CLIENT_ID',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                },{
                    header: 'Remise (%)',
                    dataIndex: 'int_REMISE',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                }, {
                    header: 'Taux Escompte (%)',
                    dataIndex: 'int_ESCOMPTE_SOCIETE',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                }/*, {
                    header: 'TVA',
                    dataIndex: 'lg_TVA_ID',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }
                }*/, {
                    header: 'Date',
                    dataIndex: 'dt_CREATED',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/application_view_list.png',
                            tooltip: 'Voir Details',
                            scope: this,
                            handler: this.onManageDetailsClick
                        }]
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/printer.png',
                            tooltip: 'Re-imprimer',
                            scope: this,
                            handler: this.onPdfClick,
                            getClass: function(value, metadata, record) {
                                if (record.get('str_STATUT') == "enable") {
                                    return 'x-display-hide';
                                } else {
                                    return 'x-hide-display';
                                }
                            }
                        }]
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.png',
                            tooltip: 'Supprimer',
                            scope: this,
                            handler: this.onRemoveClick
                        }]
                }],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    text: 'Vente a un confrere',
                    scope: this,
                    handler: this.onAddClick
                }, '-',{
                    text: 'Imprimer retrocession du jour',
                    id: 'btn_devis',
//                            iconCls: 'icon-clear-group',
                            scope: this,
                            handler: this.onbtnprint
                },'-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'user',
                    emptyText: 'Rech'
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
    loadStore: function() {
        this.getStore().load({
          callback: this.onStoreLoad
        });
    },
    onStoreLoad: function() {
    },
    onManageDetailsClick: function(grid, rowIndex) {
        
        var rec = grid.getStore().getAt(rowIndex);
       // alert("id "+rec.get('lg_RETROCESSION_ID'));
       var xtype = "showdetailretrocessionmanager";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "by_detail_retrocession", rec.get('lg_RETROCESSION_ID'), rec.data);

   /*     new testextjs.view.sm_user.doventeretrocession.ShowDetailRetrocessionManager({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "by_detail_retrocession",
            nameintern: rec.get('lg_RETROCESSION_ID')
        });*/
    },
    onbtnprint: function () {
        Ext.MessageBox.confirm('Message',
                'Confirmation de l\'impression de la liste des produits de la retrocession',
                function (btn) {
                    if (btn == 'yes') {
                        Me.onPdfClick();
                        return;
                    }
                });

    },
    onPdfClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        var linkUrl = url_services_pdf_ticket_retrocession + '?lg_RETROCESSION_ID=' + rec.get('lg_RETROCESSION_ID');
        window.open(linkUrl);
    },
    onRemoveClick: function(grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmer la suppresssion',
                function(btn) {
                    if (btn == 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_retrocession + 'delete',
                            params: {
                                lg_RETROCESSION_ID: rec.get('lg_RETROCESSION_ID')
                            },
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                    grid.getStore().reload();
                                }
                                
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


        //  var rec = grid.getStore().getAt(rowIndex);
        var xtype = "doventeretrocessionmanager";
        var alias = 'widget.' + xtype;
        testextjs.app.getController('App').onLoadNewComponent(xtype, "Ajout De Produit(s)  Pour La retrocession", "0");

    },
    onPrintClick: function() {

        
        window.print();
        body :{
            visibility:visible
        }
        print: {
            visibility:visible
        }


    },
   
    onEditClick: function(grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.sm_user.preenregistrement.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Preenregistrement  [" + rec.get('str_REFERENCE') + "]"
        });



    },
    onRechClick: function() {
        var val = Ext.getCmp('rechecher');
        
        this.getStore().load({
            params: {
                search_value: val.value/*,
                dt_Date_Debut: dt_Date_Debut,
                dt_Date_Fin: dt_Date_Fin*/

            }
        }, url_services_transaction_retrocession);
    }

})