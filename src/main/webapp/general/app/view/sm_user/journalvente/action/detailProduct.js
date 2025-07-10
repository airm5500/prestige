/* global Ext */

var url_services_data_detailsvente = '../webservices/sm_user/detailsvente/ws_data.jsp';
var OCltgridpanelID;
var Oview;
var Omode;
var Me;

var ref;
var cust_name;
var cust_id;
var cust_account_id;
var Ogrid;
var OmyType;
var str_MEDECIN;
var lg_TYPE_VENTE_ID;
var int_total_product;
var OcustGrid;
var lg_CLIENT_ID;
var lg_COMPTE_CLIENT_ID;
var ref_vente;
var lg_TIERS_PAYANT_ID = "";
var valdatedebutDetail;
var valdatefinDetail;

Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.sm_user.journalvente.action.detailProduct', {
    extend: 'Ext.window.Window',
    xtype: 'detailproduct',
    id: 'detailproductID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut',
        'Ext.grid.*',
        'Ext.layout.container.Column',
        'testextjs.model.Famille',
        'testextjs.model.CompteClient',
        'testextjs.view.sm_user.dovente.action.add',
        'Ext.selection.CellModel'

    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        obtntext: '',
        nameintern: ''
    },
    title: 'Choix.Client',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function () {


        Oview = this.getParentview();
        Omode = this.getMode();
        Me = this;
        Ogrid = this.getObtntext();
      
        ref_vente = this.getNameintern();


        let itemsPerPage = 20;

        ref = this.getOdatasource().lg_PREENREGISTREMENT_ID;
//       alert(ref);

        let store = new Ext.data.Store({
            model: 'testextjs.model.DetailsVente',
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: "../webservices/sm_user/detailsvente/ws_data.jsp?lg_PREENREGISTREMENT_ID=" + ref + "&str_STATUT=is_Closed",
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });





        let form = new Ext.form.Panel({
            width: 1050,
            layout: {
                type: 'hbox'
            },
            defaults: {
                flex: 1
            },
            autoHeight: true,
            fieldDefaults: {
                labelAlign: 'left',
                labelWidth: 90,
                anchor: '100%',
                msgTarget: 'side'
            },
            items: [{
                    columnWidth: 0.65,
                    xtype: 'gridpanel',
                    id: 'CltgridpanelID',
                    store: store,
                    height: 400,
                    columns: [{
                            xtype: 'rownumberer',
                            text: 'LG',
                            width: 45,
                            sortable: true
                        }, {
                            text: 'C.CIP',
                            flex: 1,
                            sortable: true,
                            dataIndex: 'int_CIP'
                        }, {
                            text: 'DESIGNATION',
                            flex: 2.5,
                            sortable: true,
                            dataIndex: 'str_FAMILLE_NAME'
                        }, {
                            header: 'QD',
                            dataIndex: 'int_QUANTITY',
                            flex: 1
                        }, {
                            text: 'QS',
                            flex: 1,
                            sortable: true,
                            dataIndex: 'int_QUANTITY_SERVED'
                        }, {
                            text: 'P.U',
                            flex: 1,
                            sortable: true,
                            dataIndex: 'int_FAMILLE_PRICE',
                            renderer: amountformat,
                            align: 'right'
                        }, {
                            text: 'Montant',
                            flex: 1,
                            sortable: true,
                            dataIndex: 'int_PRICE_DETAIL',
                            renderer: amountformat,
                            align: 'right'
                        }],
                    tbar: [

                        {
                            xtype: 'textfield',
                            id: 'rechercher',
                            width: 300,
                            emptyText: 'Rech',
                            enableKeyEvents: true,
                            listeners: {
                                specialKey: function (field, e, options) {
                                    if (e.getKey() === e.ENTER) {

                                        Me.onRechClick
                                    }
                                }


                            }


                        }, {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            iconCls: 'searchicon',
                            scope: this,
                            handler: this.onRechClick
                        }],
                    listeners: {
                        scope: this},
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: store,
                        dock: 'bottom',
                        displayInfo: true, // same store GridPanel is using
                        listeners: {
                            beforechange: function (page, currentPage) {
                                let myProxy = this.store.getProxy();
                                myProxy.params = {
                                    search_value: ''
                                };


                                myProxy.setExtraParam('search_value', Ext.getCmp('rechecher').getValue());

                            }

                        }
                    }
                }]
        });

        this.callParent();

        const win = new Ext.window.Window({
            autoShow: true,
            id: 'cltwinID',
            title: this.getTitre(),
            width: 1200,
            Height: 500,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Fermer',
                    handler: function () {
                        win.close();
                    }
                }]
        });
    },
    onRechClick: function () {

        const val = Ext.getCmp('rechercher');

        Ext.getCmp('CltgridpanelID').getStore().load({
            params: {
                search_value: val.getValue()
            }
        });
    }
});