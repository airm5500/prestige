var url_details_vente_update_qte = '../webservices/sm_user/detailsvente/ws_transaction.jsp?mode=create';

var Oview_updateQuantity;
var Omode_updateQuantity;
var Me_updateQuantity;
var LaborexWorkFlow_updateQuantity;
var Object_famille;
var OfamilleId;
var OfamilleName;
var OfamillePrice;
var ref_transac;
var str_from;


Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}


Ext.define('testextjs.view.sm_user.dovente.action.updateQuantity', {
    extend: 'Ext.window.Window',
    xtype: 'updateQuantity',
    id: 'updateQuantityID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.store.Statut',
        'Ext.grid.*',
        'Ext.layout.container.Column',
        'testextjs.view.sm_user.dovente.action.displayArticle'

    ],
    config: {
        odatasource: '',
        o2ndatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        obtntext: '',
        nameintern: '',
        from: ''
    },
    title: 'QUANTITE DEMANDEE',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function () {

        Me_updateQuantity = this;
        Me_updateQuantity.InitializeupdateQuantity();



        var form = new Ext.form.Panel({
            bodyPadding: 5,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 115,
                msgTarget: 'side'
            },
            items: [
                {
                    xtype: 'container',
                    layout: 'vbox',
                    defaultType: 'textfield',
                    //margin: '0 0 15 0',
                    items: [
                        {
                            xtype: 'textfield',
                            allowBlank: false,
                            allowNegative: false,
                            regex: /[0-9.]/,
                            value: 1,
                            name: 'int_QUANTITY',
                            id: 'int_QUANTITY',
                            fieldLabel: 'QD :',
                            flex: 1,
                            emptyText: 'QD',
                            listeners: {


                                'render': function (cmpes) {
                                    cmpes.getEl().on('keypress', function (es) {
                                        var my_key_val = es.getKey();
                                        if (my_key_val === es.ENTER) {
                                              Me_updateQuantity.onbtnsave_updateQuantity();

                                        } 

                                    });
                                }

                            }
                        }
                    ]
                }

            ]
        });
        this.callParent();
        win_updateQuantity = new Ext.window.Window({
            autoShow: true,
            id: 'win_updateQuantityID',
            title: this.getTitre(),
            width: 400,
            height: 140,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'AJOUTER',
                    hidden: true,
                    handler: function () {
                        Me_updateQuantity.onbtnsave_updateQuantity();
                    }
                }, {
                    text: 'Annuler',
                    hidden: true,
                    handler: function () {
                        win_updateQuantity.close();
                    }
                }]

        });
    },
    onbtnsave_updateQuantity: function () {

        if (Ext.getCmp('int_QUANTITY').getValue() === null) {
            Ext.MessageBox.alert('Attention', 'Renseignez la quantite svp');
            return;
        }



        var int_qd = Ext.getCmp('int_QUANTITY').getValue();
        var price_unitaire = Number(OfamillePrice);
        var price_total = LaborexWorkFlow_updateQuantity.DisplayTotal(price_unitaire, int_qd);
        var price_total_final = Number(price_total);
        var oref_vente_qte = Ext.getCmp('str_ref_vente_hidden').getValue();
        LaborexWorkFlow_updateQuantity.onbtnadd_vente(url_details_vente_update_qte, OfamilleId, oref_vente_qte, null, OfamillePrice, int_qd, price_total_final);
       
        
        win_updateQuantity.close();
        Ext.getCmp('displayArtwinID').close();
    },
    InitializeupdateQuantity: function () {
        LaborexWorkFlow_updateQuantity = Ext.create('testextjs.controller.LaborexWorkFlow', {});

       /* Oview_updateQuantity = this.getParentview();
        Omode_updateQuantity = this.getMode();*/

        /* Oview_updateQuantity = this.getParentview();
         Omode_updateQuantity = this.getMode();*/

        str_from = this.getFrom();
        if (str_from === "from_cip") {
            Object_famille = this.getO2ndatasource();
            ref_transac = this.getNameintern();
            OfamilleId = Object_famille.lg_FAMILLE_ID;
            OfamilleName = Object_famille.str_NAME;
            OfamillePrice = Object_famille.int_PRICE;
        } else if (str_from === "from_name") {
            OfamilleId = this.getO2ndatasource();
            OfamillePrice = this.getOdatasource();
            ref_transac = this.getNameintern();
        }
        this.title = this.getTitre();
    }

});