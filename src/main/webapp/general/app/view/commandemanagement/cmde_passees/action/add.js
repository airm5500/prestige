/* global Ext */

var url_services_transaction_order_add = '../webservices/commandemanagement/order/ws_transaction.jsp?mode=';
var url_services_data_etatarticle = '../webservices/configmanagement/etatarticle/ws_data.jsp';
var url_services_transaction_etatarticle = '../webservices/configmanagement/etatarticle/ws_transaction.jsp?mode=';

var Oview;
var Omode;
var Me;
var ref;
var montantachat;

Ext.define('testextjs.view.commandemanagement.cmde_passees.action.add', {
    extend: 'Ext.window.Window',
    xtype: 'addbonlivraisonOreder',
    id: 'addbonlivraisonOrederID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.view.commandemanagement.order.EnvoiPharmaMl'
    ],
    config: {
        odatasource: '',
        idOrder: '',
        montantachat: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function () {

        Oview = this.getParentview();
        montantachat = this.getMontantachat();

        Omode = this.getMode();
        var Oodatasource = this.getOdatasource(), idOrder = (Omode == "create" ? this.getIdOrder() : Oodatasource.str_ORDER_REF);
        //alert("idOrder 2  " + idOrder);
        Me = this;




        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 115,
                msgTarget: 'side'
            },
            items: [{
                    /* retours du 08/10 (11) : bon de livraison valorise recu par PharmaML */
                    xtype: 'container', id: 'blvPmlZone', hidden: true, margin: '0 0 8 0', layout: 'anchor',
                    items: [{
                            xtype: 'combo', id: 'cmbBlvPml', fieldLabel: 'BLV PharmaML', labelAlign: 'right', labelWidth: 115, anchor: '100%',
                            queryMode: 'local', editable: false, forceSelection: true, displayField: 'libelle', valueField: 'id',
                            store: Ext.create('Ext.data.Store', {fields: ['id', 'libelle', 'refLivraison', 'date', 'montantHt', 'montantTaxes', 'rattache', 'utilise']}),
                            listeners: {select: function (c, recs) {
                                    Me.appliquerBlv(recs && recs[0] ? recs[0] : null);
                                }}
                        }, {xtype: 'component', id: 'infoBlvPml', cls: 'blv-info', margin: '2 0 0 120'}]
                }, {
                    xtype: 'fieldset',
                    //   width: 55,
                    title: 'Saisie du bon de livraison',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            fieldLabel: 'ID Commande',
                            name: 'lg_ORDER_ID',
                            id: 'lg_ORDER_ID',
                            disabled: true,
                            value: idOrder,
                            hidden: true
                        },
                        {
                            xtype: 'displayfield',
                            fieldLabel: 'REF CMD:',
                            name: 'str_REF_',
                            id: 'str_REF_',
                            fieldStyle: "color:blue;",
                            value: "0"
                        },
                        {
                            fieldLabel: 'NUMERO BL:',
                            emptyText: 'NUMERO BL',
                            name: 'str_REF_LIVRAISON',
                            allowBlank: false,
                            id: 'str_REF_LIVRAISON'
                        },
                        /* retours du 09/10 (5) : N° de sequence client imprime sur le BL, facultatif (pointage) */
                        {
                            fieldLabel: 'N° SÉQUENCE:',
                            emptyText: 'Facultatif (ex. 48)',
                            name: 'str_SEQ_CLIENT',
                            id: 'str_SEQ_CLIENT',
                            allowBlank: true,
                            maxLength: 20,
                            enforceMaxLength: true,
                            maskRe: /[A-Za-z0-9 .\/-]/
                        },
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Date BL',
                            name: 'dt_DATE_LIVRAISON',
                            id: 'dt_DATE_LIVRAISON',
                            submitFormat: 'Y-m-d',
                            allowBlank: false,
                            maxValue: new Date(),
                            value: new Date()

                        },
                        {
                            fieldLabel: 'Montant Hors Taxe',
                            emptyText: 'Montant Hors Taxe',
                            name: 'int_MHT',
                            allowBlank: false,
                            id: 'int_MHT',
                            maskRe: /[0-9.]/,
                            minValue: 0
                        },
                        {
                            fieldLabel: 'Montant TVA',
                            emptyText: 'Montant TVA',
                            name: 'int_TVA',
                            allowBlank: false,
                            id: 'int_TVA',
                            maskRe: /[0-9.]/,
                            minValue: 0
                        }
                    ]
                }]
        });


        if (Omode == "create") {
            Ext.getCmp('str_REF_').setValue(this.getOdatasource());
        } else {
            Ext.getCmp('str_REF_').setValue(Oodatasource.str_ORDER_REF);
            Ext.getCmp('str_REF_LIVRAISON').setValue(Oodatasource.str_BL_REF);
            Ext.getCmp('dt_DATE_LIVRAISON').setValue(Oodatasource.dt_DATE_LIVRAISON);
            Ext.getCmp('int_MHT').setValue(Oodatasource.int_ORDER_PRICE);
            Ext.getCmp('int_TVA').setValue(Oodatasource.int_TVA);
        }


        //Initialisation des valeur

        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 500,
            height: 320,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Enregistrer',
                    handler: this.onbtncreerbl
//                    handler: this.onbtnsave
                }, {
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }]
        });
        if (Omode == "create") {
            Me.chargerBlv(idOrder, win);
        }

    },

    /** Retours du 08/10 (11) : BLV recus pour cette commande ; le premier rattache pre-remplit la saisie. */
    chargerBlv: function (idOrder, win) {
        Ext.Ajax.request({
            url: '../api/v1/pharma/blv/commande/' + encodeURIComponent(idOrder),
            method: 'GET',
            success: function (resp) {
                var r = Ext.JSON.decode(resp.responseText, true) || {}, zone = Ext.getCmp('blvPmlZone'), cmb = Ext.getCmp('cmbBlvPml');
                if (!zone || !r.success || !r.data || !r.data.length) {
                    return;
                }
                var E = testextjs.view.commandemanagement.order.EnvoiPharmaMl, data = [{id: '', libelle: 'Aucun (saisie manuelle)'}], choix = null;
                Ext.each(r.data, function (b) {
                    data.push(Ext.apply({libelle: E.libelleBlv(b)}, b));
                    if (!choix && b.rattache && !b.utilise) {
                        choix = b.id;
                    }
                });
                cmb.getStore().loadData(data);
                zone.show();
                win.setHeight(win.getHeight() + 70);
                cmb.setValue(choix || '');
                Me.appliquerBlv(cmb.getStore().findRecord('id', choix || '', 0, false, false, true));
            }
        });
    },

    appliquerBlv: function (rec) {
        var info = Ext.getCmp('infoBlvPml');
        if (!info) {
            return;
        }
        if (!rec || !rec.get('id')) {
            info.update('<span class="blv-muet">Saisie manuelle : les quantités reçues viennent de la réponse du grossiste.</span>');
            return;
        }
        Ext.getCmp('str_REF_LIVRAISON').setValue(rec.get('refLivraison'));
        var d = rec.get('date') ? Ext.Date.parse(rec.get('date'), 'Y-m-d') : null;
        if (d && d <= new Date()) {
            Ext.getCmp('dt_DATE_LIVRAISON').setValue(d);
        }
        if (rec.get('montantHt') !== null && rec.get('montantHt') !== undefined) {
            Ext.getCmp('int_MHT').setValue(rec.get('montantHt'));
        }
        if (rec.get('montantTaxes') !== null && rec.get('montantTaxes') !== undefined) {
            Ext.getCmp('int_TVA').setValue(rec.get('montantTaxes'));
        }
        info.update('Numéro, date, montants et quantités reçues repris du bon de livraison valorisé'
                + (rec.get('rattache') ? '' : ' <b>(non rattaché à cette commande : vérifiez)</b>')
                + ' · <a href="#" class="blv-voir" data-voir-blv="1">Voir le détail et les écarts</a>');
        var lien = info.getEl() && info.getEl().down('[data-voir-blv]');
        if (lien) {
            lien.on('click', function (e) {
                e.stopEvent();
                testextjs.view.commandemanagement.order.EnvoiPharmaMl.voirBlv(rec.get('id'), Ext.getCmp('lg_ORDER_ID').getValue());
            });
        }
    },

    onbtncreerbl: function (button) {
        var today = new Date();
        var dd = today.getDate();
        var mm = today.getMonth() + 1; //January is 0!
        var yyyy = today.getFullYear();

        if (dd < 10) {
            dd = '0' + dd;
        }

        if (mm < 10) {
            mm = '0' + mm;
        }
        today = yyyy + '/' + mm + '/' + dd;
        var url_transaction = url_services_transaction_order_add + (Omode == "create" ? 'createBL' : 'updateBL');
        var int_TVA = 0;
        var str_REF_LIVRAISON = Ext.getCmp('str_REF_LIVRAISON').getValue();
        var dt_DATE_LIVRAISON = Ext.getCmp('dt_DATE_LIVRAISON').getSubmitValue();
        var int_MHT = Ext.getCmp('int_MHT').getValue();
        if (Ext.getCmp('int_TVA').getValue() != null) {
            int_TVA = Ext.getCmp('int_TVA').getValue();
        }

        //var int_HTTC = Ext.getCmp('int_HTTC').getValue();

        //  alert("str_REF_LIVRAISON "+str_REF_LIVRAISON);
        if (str_REF_LIVRAISON === "" || dt_DATE_LIVRAISON === "" || int_MHT === "" || int_TVA === "") {
            Ext.MessageBox.alert('VALIDATION', 'Veuillez renseigner les champs vides svp!');
            return;
        }


        if (Omode == "create") {
            if (int_MHT != montantachat) {
                Ext.MessageBox.confirm('Attention!',
                        'Le prix d\'achat du bon de livraision est different du prix d\'achat machine. Voulez-vous continuer',
                        function (btn) {
                            if (btn == 'yes') {
                                Me.doCreateBL(button, url_transaction, Ext.getCmp('lg_ORDER_ID').getValue(), str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA);
                            }
                        });

            } else {
                Me.doCreateBL(button, url_transaction, Ext.getCmp('lg_ORDER_ID').getValue(), str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA);
            }
        } else {
            Me.doCreateBL(button, url_transaction, Ext.getCmp('lg_ORDER_ID').getValue(), str_REF_LIVRAISON, dt_DATE_LIVRAISON, int_MHT, int_TVA);
        }


    },
    doCreateBL: function (button, Ovalue_add_url, Ofirstvalue_param, Osecondvalue_param, Othirdvalue_param, Ofourthvalue_param, Ofifthvalue_param) {

        testextjs.app.getController('App').ShowWaitingProcess();
        Ext.Ajax.request({
            timeout: 240000,
//            url: Ovalue_add_url,
            url: '../api/v1/commande/creerbl',
            headers: {'Content-Type': 'application/json'},
            method: 'POST',
            params: Ext.JSON.encode({
                refParent: Ofirstvalue_param,
                ref: Osecondvalue_param,
                dtStart: Othirdvalue_param,
                value: Ofourthvalue_param,
                valueTwo: Ofifthvalue_param,
                refTwo: Ext.getCmp('cmbBlvPml') ? (Ext.getCmp('cmbBlvPml').getValue() || null) : null,
                sequence: Ext.getCmp('str_SEQ_CLIENT') ? (Ext.String.trim(Ext.getCmp('str_SEQ_CLIENT').getValue() || '') || null) : null

            }),
            success: function (response)
            {
                testextjs.app.getController('App').StopWaitingProcess();
                const result = Ext.JSON.decode(response.responseText, true);

                Ext.MessageBox.alert('confirmation', result.msg);
                button.up('window').close();

                testextjs.app.getController('App').onLoadNewComponentWithDataSource("bonlivraisonmanager", "", "", "");

            },
            failure: function (response)
            {
                testextjs.app.getController('App').StopWaitingProcess();
                Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });
    }
});