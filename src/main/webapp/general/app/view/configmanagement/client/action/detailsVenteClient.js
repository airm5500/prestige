




/* global Ext */

var Oview;
var Omode;
var Me;

var IDVENTE = "";

function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.configmanagement.client.action.detailsVenteClient', {
    extend: 'Ext.window.Window',
    xtype: 'detailsVenteClient',
    id: 'detailsVenteClientID',
    maximizable: true,
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'testextjs.model.DetailsVentesClient'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: ''

    },
    initComponent: function () {


        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;
        
        IDVENTE = this.getOdatasource().IDVENTE;
        var itemsPerPage = 20;

        var ventestore = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.DetailsVentesClient',
            
            pageSize: itemsPerPage,
            proxy: {
                type: 'ajax',
                url: '../webservices/configmanagement/client/ws_ventedetails.jsp?IDVENTE='+IDVENTE,
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }
        }); 
        ventestore.load();

       


        var form = new Ext.form.Panel({
            bodyPadding: 15,
            autoScroll: true,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 150,
                layout: {
                    type: 'vbox',
                    align: 'stretch',
                    padding: 10
                },
                defaults: {
                    flex: 1
                }
               
            },
            items: [
                {
                    xtype: 'fieldset',
                    collapsible: true,
                    layout: 'hbox',
                    title: 'Filtre',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'displayfield',
                            margin: '0 0 5 0',
                            items: [
                               
                                {

                                    xtype: 'textfield',
                                    id: 'rechercheVenteD',
                                    emptyText: 'Recherche',
                                    style: 'margin-left:5px;',
                                    enableKeyEvents: true,
                                    listeners: {
                                        specialKey: function (field, e, options) {
                                            if (e.getKey() === e.ENTER) {
                                                var grid = Ext.getCmp('detailsVenteClientgridID');
                                               

                                                grid.getStore().load({
                                                    params: {
                                                       
                                                        search_value: field.getValue(),
                                                        IDVENTE: IDVENTE
                                                        
                                                    }
                                                });
                                            }
                                        }
                                    }

                                }
                               ,

                               
                                {

                                    // width: 100,
                                    xtype: 'button',
                                    style: 'margin-left:5px;',
                                    iconCls: 'ventesearch',
                                    text: 'Rechercher',
                                    listeners: {
                                        click: function () {
                                            var grid = Ext.getCmp('detailsVenteClientgridID');

                                           
                                            var field = Ext.getCmp('rechercheVenteD').getValue();

                                            grid.getStore().load({
                                                params: {
                                                   
                                                    search_value: field,
                                                    IDVENTE: IDVENTE
                                                }
                                            });
                                        }
                                    }


                                }

                            ]
                        }


                    ]
                },
                {
                    xtype: 'fieldset',
                    collapsible: true,
                    layout: 'hbox',
                    title: 'Les d&eacute;tails  de la vente',
                    defaultType: 'panel',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [{
                            xtype: 'panel',
                            title: 'Les d&eacute;tails  de la vente',
                            width: '100%',
                            margin: '0 5 0 0',
                            border: false,
                            items: [
                                {
                                    xtype: 'grid',
                                    
                                    id: 'detailsVenteClientgridID',
                                    store: ventestore,
                                    columns: [
                                        {
                                            header: 'CIP',
                                            dataIndex: 'CIP',
                                            flex: 1

                                        },

                                        {
                                            header: 'LIBELLE',
                                            dataIndex: 'NAME',
                                            
                                            flex: 2.5
                                        },
                                        {
                                            header: 'QUANTITE',
                                            dataIndex: 'QTY',
                                            renderer: amountformat,
                                            align: 'right',
                                            flex:1
                                        },
                                        
                                        

                                        {
                                            header: 'MONTANT.VENTE',
                                            dataIndex: 'MONTANTVENTE',
                                            renderer: amountformat,
                                            align: 'right',
                                            flex: 1
                                        },

                                        {
                                            header: 'PRIX UNITAIRE',
                                            dataIndex: 'PU',
                                            renderer: amountformat,
                                            align: 'right',
                                            flex:1
                                        },
                                       
                                       
                                       



                                    ],
                                    bbar: {
                                        xtype: 'pagingtoolbar',
                                        store: ventestore, // same store GridPanel is using
                                        dock: 'bottom',
                                        displayInfo: true,
                                        listeners: {
                                            beforechange: function (page, currentPage) {
                                                var myProxy = this.store.getProxy();
                                                myProxy.params = {

                                                    search_value: '',
                                                    IDVENTE: ''
                                                  
                                                };



                                                var search_value = Ext.getCmp('rechercheVenteD').getValue();

                                                myProxy.setExtraParam('search_value', search_value);
                                               
                                                myProxy.setExtraParam('IDVENTE', IDVENTE);
                                            }

                                        }
                                    }
                                }


                            ]
                        }



                    ]



                }



            ]


        });















        var win = new Ext.window.Window({
            autoShow: true, title: this.getTitre(),
            width: '90%',
            height: 600,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            maximizable: true,
            items: form,
            buttons: [{
                    text: 'Fermer',
                    handler: function () {
                        win.close();
                    }
                }],
            listeners: {// controle sur le button fermé en haut de fenetre
                beforeclose: function () {
                    // Ext.getCmp('rechecher').focus();
                }
            }
        });

    }



});