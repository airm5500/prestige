/* global Ext */

var url_services_transaction_bl_editprice = '../webservices/commandemanagement/bonlivraison/ws_transaction.jsp?mode=';
var url_services_data_etatarticle = '../webservices/configmanagement/etatarticle/ws_data.jsp';
var url_services_transaction_etatarticle = '../webservices/configmanagement/etatarticle/ws_transaction.jsp?mode=';
var url_services_data_zonegeographique = '../webservices/configmanagement/zonegeographique/ws_data.jsp';
var Oview;
var Omode;
var Me;
var ref;
var Oodatasource;
var idOrder;


Ext.define('testextjs.view.commandemanagement.bonlivraison.action.editprice', {
    extend: 'Ext.window.Window',
    xtype: 'editpricebonlivraisonOreder',
    id: 'editpricebonlivraisonOrederID',
    requires: [
        'Ext.form.*',
        'Ext.window.Window',
        'testextjs.model.BonLivraisonDetail'
    ],
    config: {
        odatasource: '',
        idOrder: '',
        parentview: '',
        mode: '',
        titre: ''
    },
    initComponent: function () {

        Oview = this.getParentview();
           
        Oodatasource = this.getOdatasource();
     
        idOrder = this.getIdOrder();
        Omode = this.getMode();

        Me = this;
        var itemsPerPage = 20;

        var storezonegeographique = new Ext.data.Store({
            model: 'testextjs.model.ZoneGeographique',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_zonegeographique,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 240000
            }

        });


        // str_REF_LIVRAISON, dt_DATE_LIVRAISON
        var str_REF_LIVRAISON_i = new Ext.form.field.Display({
            xtype: 'displayfield',
            fieldLabel: 'Ref.LIVRAISON ::',
            labelWidth: 110,
            name: 'str_REF_LIVRAISON',
            id: 'str_REF_LIVRAISON_i',
            fieldStyle: "color:blue;",
            margin: '0 30 0 0',
            value: "0"
        });

        var dt_DATE_LIVRAISON_i = new Ext.form.field.Display({
            xtype: 'displayfield',
            fieldLabel: 'DATE.LIVRAISON ::',
            labelWidth: 130,
            name: 'dt_DATE_LIVRAISON',
            id: 'dt_DATE_LIVRAISON_i',
            fieldStyle: "color:blue;",
            margin: '0 30 0 0',
            value: "0"
        });

        var lg_GROSSISTE_ID = new Ext.form.field.Display({
            xtype: 'displayfield',
            fieldLabel: 'GROSSISTE ::',
            labelWidth: 110,
            name: 'lg_GROSSISTE_ID',
            id: 'lg_GROSSISTE_ID',
            fieldStyle: "color:blue;",
            margin: '0 30 0 0',
            value: "0"
        });

        var str_REF_ORDER = new Ext.form.field.Display({
            xtype: 'displayfield',
            fieldLabel: 'Ref.COMMANDE ::',
            labelWidth: 130,
            name: 'str_REF_ORDER_EDIT',
            id: 'str_REF_ORDER_EDIT',
            fieldStyle: "color:blue;",
            margin: '0 30 0 0',
            value: "0"
        });

        var lg_FAMILLE_CIP = new Ext.form.field.Display({
            xtype: 'displayfield',
            fieldLabel: 'CODE CIP ::',
            labelWidth: 110,
            name: 'lg_FAMILLE_CIP',
            id: 'lg_FAMILLE_CIP',
            fieldStyle: "color:blue;",
            margin: '0 30 0 0',
            value: "0"
        });

        var lg_FAMILLE_NAME = new Ext.form.field.Display({
            xtype: 'displayfield',
            fieldLabel: 'DESIGNATION  ::',
            labelWidth: 130,
            name: 'lg_FAMILLE_NAME',
            id: 'lg_FAMILLE_NAME',
            fieldStyle: "color:blue;",
            margin: '0 30 0 0',
            value: "0"
        });


        var form = new Ext.form.Panel({
            bodyPadding: 10,
            fieldDefaults: {
                labelAlign: 'right',
                labelWidth: 115,
                msgTarget: 'side'
            },
            items: [{
                    xtype: 'fieldset',
                    title: 'Modification de prix',
                    defaultType: 'textfield',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    allowBlank: false,
                                    fieldLabel: 'Prix TIPS',
                                    name: 'lg_BON_LIVRAISON_DETAIL',
                                    id: 'lg_BON_LIVRAISON_DETAIL_i',
                                    hidden: true
                                },
                                str_REF_LIVRAISON_i, dt_DATE_LIVRAISON_i
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                lg_GROSSISTE_ID, str_REF_ORDER
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                lg_FAMILLE_CIP, lg_FAMILLE_NAME
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    fieldLabel: 'PRIX VENTE',
                                    name: 'int_PRIX_VENTE',
                                    id: 'int_PRIX_VENTE',
                                    /* plan du 12/11 : la regle est portee par le champ ; marquee a la main, l'erreur etait effacee aussitot */
                                    allowBlank: false, regex: /^\d+$/, regexText: 'Nombre entier attendu', blankText: 'Nombre entier attendu'
                                },
                                {
                                    fieldLabel: 'PRIX TIPS',
                                    name: 'int_PRIX_REFERENCE',
                                    id: 'int_PRIX_REFERENCE',
                                    /* plan du 12/11 : la regle est portee par le champ ; marquee a la main, l'erreur etait effacee aussitot */
                                    allowBlank: false, regex: /^\d+$/, regexText: 'Nombre entier attendu', blankText: 'Nombre entier attendu'
                                }
                            ]
                        },
                        // int_PAF int_PA_REEL
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    fieldLabel: 'PRIX A. TARIF',
                                    name: 'int_PA_REEL',
                                    id: 'int_PA_REEL',
                                    /* plan du 12/11 : la regle est portee par le champ ; marquee a la main, l'erreur etait effacee aussitot */
                                    allowBlank: false, regex: /^\d+$/, regexText: 'Nombre entier attendu', blankText: 'Nombre entier attendu'
                                },
                                {
                                    fieldLabel: 'PRIX A. FACTURE',
                                    name: 'int_PAF',
                                    id: 'int_PAF',
                                    /* plan du 12/11 : la regle est portee par le champ ; marquee a la main, l'erreur etait effacee aussitot */
                                    allowBlank: false, regex: /^\d+$/, regexText: 'Nombre entier attendu', blankText: 'Nombre entier attendu'
                                }
                            ]
                        },
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            defaultType: 'textfield',
                            margin: '0 0 5 0',
                            items: [
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Zone Geographique',
                                    allowBlank: false,
                                    name: 'lg_ZONE_GEO_ID',
                                    margin: '0 15 0 0',
                                    id: 'lg_ZONE_GEO_ID',
                                    store: storezonegeographique,
                                    valueField: 'lg_ZONE_GEO_ID',
                                    displayField: 'str_LIBELLEE',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir une zone goographique...'
                                }
                            ]
                        },
                        {
                            /* plan du 12/11 : un refus s'affiche ici, sans fenetre surgissante */
                            xtype: 'component',
                            id: 'editprice_erreur',
                            hidden: true,
                            style: 'color:#c62828;font-weight:bold;margin:6px 0 0 120px;'
                        }

                    ]
                }]
        });



        //Initialisation des valeur
        OviewItem = Ext.getCmp('gridpanelID');


        if (Omode === "editprice") {

            ref = this.getOdatasource().lg_BON_LIVRAISON_DETAIL;

            Ext.getCmp('lg_FAMILLE_CIP').setValue(this.getOdatasource().lg_FAMILLE_CIP);
            Ext.getCmp('lg_FAMILLE_NAME').setValue(this.getOdatasource().lg_FAMILLE_NAME);
            Ext.getCmp('lg_GROSSISTE_ID').setValue(this.getOdatasource().lg_GROSSISTE_ID);
            Ext.getCmp('str_REF_ORDER_EDIT').setValue(this.getOdatasource().str_REF_ORDER);
            Ext.getCmp('str_REF_LIVRAISON_i').setValue(this.getOdatasource().str_REF_LIVRAISON);
            Ext.getCmp('dt_DATE_LIVRAISON_i').setValue(this.getOdatasource().dt_DATE_LIVRAISON);
            Ext.getCmp('int_PRIX_VENTE').setValue(this.getOdatasource().int_PRIX_VENTE);
            Ext.getCmp('int_PRIX_REFERENCE').setValue(this.getOdatasource().int_PRIX_REFERENCE);
            Ext.getCmp('int_PAF').setValue(this.getOdatasource().int_PAF);
            Ext.getCmp('int_PA_REEL').setValue(this.getOdatasource().int_PA_REEL);
            
            Ext.getCmp('lg_ZONE_GEO_ID').setValue(this.getOdatasource().lg_ZONE_GEO_NAME);
            Me.zoneInitiale = Ext.getCmp('lg_ZONE_GEO_ID').getValue();

        }
        var win = new Ext.window.Window({
            autoShow: true,
            title: this.getTitre(),
            width: 700,
            height: 400,
            minWidth: 300,
            minHeight: 200,
            layout: 'fit',
            plain: true,
            items: form,
            buttons: [{
                    text: 'Enregistrer',
                    id: 'btn_editprice_enregistrer',
                    handler: this.onbtneditprice
//                    handler: this.onbtnsave
                }, {
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }]
        });

    },
    onbtneditprice: function () {
        /* le serveur lit les quatre prix en nombres entiers : un champ vide ou decimal y levait une erreur 500
           (rapport du 26/10, C5). Le champ fautif est signale, la fenetre reste ouverte, rien n'est envoye. */
        var invalide = false;
        Ext.each(['int_PRIX_VENTE', 'int_PRIX_REFERENCE', 'int_PA_REEL', 'int_PAF'], function (id) {
            if (!Ext.getCmp(id).validate()) {
                invalide = true;
            }
        });
        if (invalide) {
            return;
        }
        /* Plan du 12/11 : l'ancien appel (ws_transaction.jsp?mode=modifproductprice) repondait 500 depuis le 18/10 (classes
           supprimees). Route REST ; la confirmation se fait dans le bouton, un refus s'affiche dans la fenetre. */
        var bouton = Ext.getCmp('btn_editprice_enregistrer'),
                fenetre = bouton.up('window'),
                erreur = Ext.getCmp('editprice_erreur'),
                zone = Ext.getCmp('lg_ZONE_GEO_ID').getValue(),
                entier = function (id) {
                    return Number(Ext.String.trim(String(Ext.getCmp(id).getValue())));
                };
        var refuser = function (texte) {
            erreur.update(Ext.String.htmlEncode(texte));
            erreur.show();
            bouton.setText('Enregistrer');
            bouton.enable();
        };
        erreur.hide();
        bouton.disable();
        bouton.setText('Enregistrement…');
        Ext.Ajax.request({
            url: '../api/v1/commande/bon/item/' + encodeURIComponent(ref) + '/prix',
            method: 'PUT',
            timeout: 240000,
            headers: {'Content-Type': 'application/json'},
            jsonData: {
                prixVente: entier('int_PRIX_VENTE'),
                prixTips: entier('int_PRIX_REFERENCE'),
                prixAchatFacture: entier('int_PAF'),
                prixAchatTarif: entier('int_PA_REEL'),
                zoneId: zone && zone !== Me.zoneInitiale ? zone : null
            },
            success: function (response) {
                var object = Ext.JSON.decode(response.responseText, true) || {};
                if (!object.success) {
                    refuser(object.msg || "Le prix n'a pas été modifié.");
                    return;
                }
                var format = function (v) {
                    return Ext.util.Format.number(v || 0, '0,000.');
                };
                Ext.each([['ig_mht', object.montantHT], ['ig_ttc', object.montantTTC]], function (m) {
                    var el = Ext.fly(m[0]);
                    if (el) {
                        el.setHTML(format(m[1]));
                    }
                });
                if (Oview && Oview.getOdatasource && Oview.getOdatasource()) {
                    Oview.getOdatasource().int_MHT = object.montantHT;
                    Oview.getOdatasource().int_HTTC = object.montantTTC;
                }
                bouton.setText('Prix modifiés ✓');
                if (OviewItem && OviewItem.getStore) {
                    OviewItem.getStore().reload();
                }
                Ext.defer(function () {
                    if (!fenetre.isDestroyed) {
                        fenetre.close();
                    }
                }, 900);
            },
            failure: function (response) {
                var object = Ext.JSON.decode(response.responseText, true) || {};
                refuser(object.msg || ("Le prix n'a pas été modifié : erreur du serveur (HTTP " + response.status + ').'));
            }
        });

    }
});
