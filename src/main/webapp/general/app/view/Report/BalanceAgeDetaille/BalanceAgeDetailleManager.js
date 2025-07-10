/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

var url_services_data_pdf = '../webservices/Report/ws_reportGeneratePdf.jsp';
var url_services_data_BalanceAgeDetaille = '../webservices/Report/BalanceAgeDetaille/ws_data.jsp';
var url_services_transaction_BalanceAgeDetaille = '../webservices/Report/BalanceAgeDetaille/ws_transaction.jsp?mode=';

var Me;
var Periode;
Ext.define('testextjs.view.Report.BalanceAgeDetaille.BalanceAgeDetailleManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'BalanceAgeDetailleManager',
    id: 'BalanceAgeDetailleID',
    frame: true,
    collapsible: true,
    animCollapse: false,
    title: 'Balance agée des dus (detaille)',
    plain: true,
    maximizable: true,
    tools: [{type: "pin"}],
    closable: true,
    iconCls: 'icon-grid',
    /*plugins: [{
            ptype: 'rowexpander',
            rowBodyTpl: new Ext.XTemplate(
                    '<p> {str_FAMILLE_ITEM}</p>',
                    {
                        formatChange: function(v) {
                            var color = v >= 0 ? 'green' : 'red';
                            return '<span style="color: ' + color + ';">' + Ext.util.Format.usMoney(v) + '</span>';
                        }
                    })
        }],*/
    initComponent: function() {

        Me = this;
        //alert("url_services_data_retrocession "+url_services_data_retrocession);
        url_services_data_pdf = '../webservices/Report/ws_reportGeneratePdf.jsp';
        var itemsPerPage = 20;
        var store = new Ext.data.Store({
            model: 'testextjs.model.BalanceAgeDetaille',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_BalanceAgeDetaille,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        Ext.apply(this, {
            width: 950,
            height: 580,
            id: 'Grid_BalanceAgeDetaille_ID',
            //  plugins: [this.cellEditing],
            store: store,
            columns: [
                {
                    header: 'Type vente',
                    dataIndex: 'type_vente',
                    flex: 1/*,
                     editor: {
                     allowBlank: false
                     }*/
                }
                
                /*{
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/folder_go.png',
                            tooltip: 'Voir Details',
                            scope: this,
                            handler: this.onManageDetailsClick
                        }]
                }
                , {
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
                }*/
            ],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                 /*{
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'user',
                    emptyText: 'Rech'
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    scope: this
                   // handler: this.onRechClick
                },*/
                {
                   
                    xtype: 'combobox',
                    //fieldLabel: 'Indice de Securite',
                    name: 'str_PERIODE',
                    id: 'str_PERIODE',
                    store: ['Jour','Mois','Annee'],
                    valueField: 'str_PERIODE',
                    displayField: 'str_PERIODE',
                    typeAhead: true,
                    queryMode: 'local',
                    emptyText: 'Choisissez la periode...',  
                    listeners: {
                        select: function (p) {
                            Periode = p.getValue(); 
                        }
                    }
                },
                {
                    text: 'Imprimer',
                    scope: this,
                    handler: this.onImprimeClick
                }
            ],
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
        }, url_services_transaction_BalanceAgeDetaille);
    },
    onImprimeClick: function()
    {
        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var linkUrl = url_services_data_pdf + '?lg_periode='+Periode+'&raport=rp_balance_agee_detaille';
        //var linkUrl = url_services_data + '?lg_RETROCESSION_ID=' + ref;
        //alert("periode " + Periode);
        //alert("Ok ca marche " + linkUrl);
        window.open(linkUrl);
    }
    

})






