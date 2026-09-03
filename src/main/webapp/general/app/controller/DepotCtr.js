
/* global Ext */

Ext.define('testextjs.controller.DepotCtr', {
    extend: 'Ext.app.Controller',
    models: [
        'testextjs.model.caisse.Produit',
        'testextjs.model.caisse.VenteItem'

    ],
    views: [
        'testextjs.view.vente.depot.VenteDepot'

    ],
    config: {
        current: null,
        client: null,
        depotId: null,
        typeDepot: null,
        canModifyPu: null,
        netAmountToPay: null,
        maxiQte: 999,
        caisse: false
    },
    refs: [

        {
            ref: 'ventedepotview',
            selector: 'addventedepotbis'
        }
        , {
            ref: 'contenu',
            selector: 'addventedepotbis #contenu'
        },

        {
            ref: 'totalField',
            selector: 'addventedepotbis #montantTotal'
        },
        {
            ref: 'remiseField',
            selector: 'addventedepotbis #remise'
        },
        {
            ref: 'montantBottom',
            selector: 'addventedepotbis #montantBottom'
        },

        {
            ref: 'ventevno',
            selector: 'addventedepotbis #contenu panel'
        },
        {
            ref: 'ventevnoPaging',
            selector: 'addventedepotbis #contenu pagingtoolbar'
        },

        {ref: 'vnoproduitCombo',
            selector: 'addventedepotbis #contenu [xtype=fieldcontainer] #produit'
        },
        {ref: 'vnoqtyField',
            selector: 'addventedepotbis #contenu [xtype=fieldcontainer] #qtyField'
        },
        {ref: 'vnoemplacementField',
            selector: 'addventedepotbis #contenu [xtype=container] #emplacementId'
        }
        ,
        {ref: 'vnostockField',
            selector: 'addventedepotbis #contenu [xtype=container] #stockField'
        }, {
            ref: 'userCombo',
            selector: 'addventedepotbis #user'
        }, {
            ref: 'gerantName',
            selector: 'addventedepotbis #gerantName'
        },
        {ref: 'typeVenteCombo',
            selector: 'addventedepotbis #typeVente'
        },

        {ref: 'vnobtnCloture',
            selector: 'addventedepotbis #contenu [xtype=toolbar] #btnCloture'
        },
        {ref: 'vnobtnGoBack',
            selector: 'addventedepotbis #contenu [xtype=toolbar] #btnGoBack'
        },
        {ref: 'vnogrid',
            selector: 'addventedepotbis #contenu #gridContainer #venteGrid'
        },
        {ref: 'vnoactioncolumn',
            selector: 'addventedepotbis #contenu [xtype=gridpanel] [xtype=actioncolumn]'
        },
        {ref: 'queryField',
            selector: 'addventedepotbis #contenu #gridContainer [xtype=gridpanel] #query'
        },
        {ref: 'vnopagingtoolbar',
            selector: 'addventedepotbis #contenu #gridContainer gridpanel #pagingtoolbar'
        },
        {ref: 'detailGrid',
            selector: 'addventedepotbis #contenu [xtype=gridpanel]'
        },
        {ref: 'pagingtoolbar',
            selector: 'addventedepotbis #contenu [xtype=gridpanel] #pagingtoolbar'
        },
        {ref: 'refVente',
            selector: 'addventedepotbis #refVente'
        },
        {ref: 'montantNet',
            selector: 'addventedepotbis #montantNet'
        },

        {ref: 'nbreProduits',
            selector: 'addventedepotbis #nbreProduits'
        },
        {ref: 'montantRemise',
            selector: 'addventedepotbis #montantRemise'
        },
        {ref: 'montantRemis',
            selector: 'addventedepotbis #montantRemis'
        },

        {
            ref: 'vnotypeReglement',
            selector: 'addventedepotbis #typeReglement'
        },
        {
            ref: 'montantRecu',
            selector: 'addventedepotbis #montantRecu'
        },
        {
            ref: 'reglementContainer',
            selector: 'addventedepotbis #reglementContainer'
        },
        {
            ref: 'cbContainer',
            selector: 'addventedepotbis #cbContainer'
        }, {
            ref: 'refCb',
            selector: 'addventedepotbis #refCb'
        },
        {
            ref: 'banque',
            selector: 'addventedepotbis #banque'
        },
        {
            ref: 'lieuxBanque',
            selector: 'addventedepotbis #lieuxBanque'
        }

    ],
    init: function () {
        this.control(
                {
                    'addventedepotbis': {
                        render: this.onReady
                    }, 'addventedepotbis #user': {
                        select: this.onUserSelect
                    }, 'addventedepotbis #montantRecu': {
                        change: this.montantRecuChangeListener,
                        specialkey: this.onMontantRecuVnoKey
                    },
                    'addventedepotbis #typeReglement': {
                        select: this.typeReglementSelectEvent
                    },
                    'addventedepotbis #contenu [xtype=fieldcontainer] #qtyField': {
                        specialkey: this.onQtySpecialKey
                    },
                    'addventedepotbis #contenu #produitContainer [xtype=fieldcontainer] #produit': {
//                        afterrender: this.produitCmpAfterRender,
                        select: this.produitSelect,
                        specialkey: this.onProduitSpecialKey
                    }
                    ,

                    'addventedepotbis #remise': {
                        specialkey: this.onRemisepecialKey
//                        keyup: this.updateRemise
                    },
                    'addventedepotbis #contenu [xtype=gridpanel] pagingtoolbar': {
                        beforechange: this.doBeforechangeVno
                    },
                    'addventedepotbis #contenu [xtype=gridpanel] #btnRecherche': {
                        click: this.refresh
                    },
                    'addventedepotbis #contenu [xtype=gridpanel] #query': {
                        specialkey: this.onSpecialSpecialKey
                    },

                    'addventedepotbis #contenu [xtype=gridpanel] [xtype=actioncolumn]': {
                        click: this.removeItemVno
                    },

                    'addventedepotbis #contenu [xtype=gridpanel]': {
                        edit: this.onGridEdit
                    },
                    'addventedepotbis #contenu [xtype=toolbar] #btnGoBack': {
                        click: this.goBack
                    },
                    'addventedepotbis #contenu [xtype=toolbar] #btnCloture': {
                        click: this.doCloture
                    },
                    'addventedepotbis #typeVente': {
                        afterrender: this.produitCmpAfterRender,
                        select: this.onTypeVenteSelect
                    }

                });
    },
    onMontantRecuVnoKey: function (field, e, options) {
        var me = this;
        if (e.getKey() === e.ENTER) {
           if (field.getValue() >= 0) {
                me.doCloture();
            }
        }

    },
    shownetpaydepotAgree: function () {
        var me = this;
        var vente = me.getCurrent(), remise = me.getRemiseField().getValue();
        if (vente) {
            var venteId = vente.lgPREENREGISTREMENTID;
            var data = {"remiseDepot": remise, "venteId": venteId};
            var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/vente/shownetpaydepotAgree',
                params: Ext.JSON.encode(data),
                success: function (response, options) {
                    progress.hide();
                    var result = Ext.JSON.decode(response.responseText, true);
                    if (result.success) {
                        me.netAmountToPay = result.data;
                        var montantNet = me.getNetAmountToPay().montantNet;
                        me.getMontantNet().setValue(me.getNetAmountToPay().montantNet);
                        me.getTotalField().setValue(me.getNetAmountToPay().montant);
                        me.getMontantRemise().setValue(me.getNetAmountToPay().remise);
                        me.getMontantNet().setValue(montantNet);
                        if (montantNet > 0) {
                            me.getMontantRecu().setReadOnly(false);
                        }
                        me.getMontantRecu().focus(true, 50);

                    } else {
                        me.getVnoproduitCombo().focus();

                    }

                },
                failure: function (response, options) {
                    progress.hide();
                    Ext.Msg.alert("Message", 'server-side failure with status code' + response.status);
                }

            });
        }
    },
    showAndHideCbInfos: function (v) {
        var me = this;
        if (v === '2' || v === '3' || v === '6') {
            me.getCbContainer().show();
            if (v !== '6') {
                me.getRefCb().setFieldLabel('NOM');
                me.getMontantRecu().setReadOnly(true);
            } else {
                me.getRefCb().setFieldLabel('REFERENCE');
                me.getMontantRecu().setReadOnly(false);
            }
        } else {

            me.getCbContainer().hide();
        }
    },

    typeReglementSelectEvent: function (field) {
        var me = this;
        //  if (me.getCurrent()) {
        var value = field.getValue().trim();
//            if (value) {
//                me.showAndHideCbInfos(value);
//            }
        if (value === '1') {
            me.getMontantRecu().enable();
            me.getMontantRecu().setReadOnly(false);
            me.getCbContainer().hide();
//            me.showAndHideCbInfos(value);

        } else if (value === '2' || value === '3' || value === '6') {
            me.showAndHideCbInfos(value);
            me.getMontantRecu().setValue(parseInt(me.getMontantNet().getValue()));
//                me.getMontantRecu().setReadOnly(true);
            me.getMontantRecu().disable();
        } else {
            me.getMontantRecu().setValue(0);
            me.getMontantRecu().setReadOnly(false);
            me.getMontantRecu().focus(true);
        }
        // }


    },
    montantRecuChangeListener: function (field, value, options) {
        var me = this,typeRegle = me.getVnotypeReglement().getValue();
        var montantRecu = parseInt(field.getValue());
        var vnomontantRemis = me.getMontantRemis();
        var monnais = 0;
        if (montantRecu > 0) {
            var netTopay = parseInt(me.getMontantNet().getValue());
            me.getVnobtnCloture().enable();
            monnais = (montantRecu > netTopay) ? montantRecu - netTopay : 0;
            vnomontantRemis.setValue(monnais);
        } else if (montantRecu === 0) {
            vnomontantRemis.setValue(0);
            if (typeRegle === '4') {
                me.getVnobtnCloture().enable();
            } else {
                me.getVnobtnCloture().disable();
            }
        }
    },
    onReady: function () {
        var me = this;

        me.gotView();
        me.cheickCaisse();
        me.checkModificationPrixU();
        me.checkMaxiQte();

    },
    onTypeVenteSelect: function (field) {
        var me = this, userCmp = me.getUserCombo();
        if (me.getCurrent()) {
            Ext.MessageBox.show({
                title: 'Message d\'erreur',
                width: 320,
                msg: "Veuillez terminer la vente en cour",
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING,
                fn: function (buttonId) {
                    if (buttonId === "ok") {
                        me.getVnoproduitCombo().focus();

                    }
                }
            });
            return;
        } else {
            var magasin = field.findRecord("lgEMPLACEMENTID", field.getValue());
            if (magasin) {
                me.typeDepot = magasin.get('lgTYPEDEPOTID');
                me.depotId = magasin.get('lgEMPLACEMENTID');
                me.client = magasin.get('lgCLIENTID');
                me.getGerantName().setValue(magasin.get('gerantFullName'));
                if (me.getTypeDepot() == "1") {
                    me.getRemiseField().show();
                    me.getReglementContainer().show();
                } else {
                    me.getRemiseField().hide();
                    me.resetRegleCmp();
                }
            } else {
                me.typeDepot = null;
                me.depotId = null;
                me.client = null;
                me.getGerantName().setValue('');
            }
            userCmp.focus(false, 50);
        }

    },

    produitCmpAfterRender: function (cmp) {
        cmp.focus();
    },
    produitSelect: function (cmp, record) {
        var me = this;
        var client = me.getClient();
        if (!client) {
            cmp.clearValue();
            Ext.MessageBox.show({
                title: 'Message d\'erreur',
                width: 320,
                msg: "Veuillez sélectionnez le dépôt",
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.ERROR,
                fn: function (buttonId) {
                    if (buttonId === "ok") {
                        me.getTypeVenteCombo().focus(true, 50);
                    }
                }
            });
            return false;
        } else {
            var record = cmp.findRecord("lgFAMILLEID" || "intCIP", cmp.getValue());

            if (record) {
                var vnostockField = me.getVnostockField(), vnoemplacementId = me.getVnoemplacementField();
                vnostockField.setValue(record.get('intNUMBERAVAILABLE'));
                vnoemplacementId.setValue(record.get('strLIBELLEE'));
                me.getVnoqtyField().focus(true, 100);
            }
        }


    },
    onUserSelect: function (cmp) {
        var me = this;
        me.getVnoproduitCombo().focus(true, 50);
    },

    onProduitSpecialKey: function (field, e) {
        var me = this;
        var client = me.getClient(), typedepot = me.getTypeDepot();
        if (!client) {
            Ext.MessageBox.show({
                title: 'Message d\'erreur',
                width: 320,
                msg: "Veuillez ajouter un dépôt à la vente",
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.ERROR,
                fn: function (buttonId) {
                    if (buttonId === "ok") {
                        me.getTypeVenteCombo().focus(true, 50);
                    }
                }
            });
            return false;
        } else {
            field.suspendEvents();
            var task = new Ext.util.DelayedTask(function (combo, e) {
                if (e.getKey() === e.ENTER) {
                    if (combo.getValue() === null || combo.getValue().trim() === "") {
                        var selection = combo.getPicker().getSelectionModel().getSelection();
                        if (selection.length <= 0) {
                            if (typedepot === '1') {
                                me.shownetpaydepotAgree();
                            } else {
                                me.getVnobtnCloture().enable();
                                me.getVnobtnCloture().focus();
                            }

                        }
                    } else {
                        var record = combo.findRecord("lgFAMILLEID" || "intCIP", combo.getValue());
                        if (record) {
                            var vnostockField = me.getVnostockField(), vnoemplacementId = me.getVnoemplacementField();
                            vnostockField.setValue(record.get('intNUMBERAVAILABLE'));
                            vnoemplacementId.setValue(record.get('strLIBELLEE'));
                            me.getVnoqtyField().focus(true, 100);
                        } else {
                            me.checkDouchette(combo);
                        }
                    }
                }
                combo.resumeEvents();
            }, this);
            task.delay(10, null, null, arguments);
        }
    },
    checkDouchette(field) {
        var me = this;
        Ext.Ajax.request({
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/vente/findone/' + field.getValue(),
            success: function (response, options) {
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    var produit = result.data;
                    var vnostockField = me.getVnostockField(), vnoemplacementId = me.getVnoemplacementField();
                    vnostockField.setValue(produit.intNUMBERAVAILABLE);
                    vnoemplacementId.setValue(produit.strLIBELLEE);
                    me.getVnoqtyField().focus(true, 100);
                } else {
                    field.focus(true, 100);
                }

            }

        });

    },
    onSpecialSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var me = this;
            me.refresh();
        }
    },
    onRemisepecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var me = this;
            me.updateRemise();
        }
    },

    onQtySpecialKey: function (field, e, options) {
        if (field.getValue() > 0) {
            if (e.getKey() === e.ENTER) {
                var me = this;
                var produitCmp = me.getVnoproduitCombo();
                var record = produitCmp.findRecord("lgFAMILLEID", produitCmp.getValue());
                record = record ? record : produitCmp.findRecord("intCIP", produitCmp.getValue());
                var vente = me.getCurrent();
                var venteId = null;
                if (vente) {
                    venteId = vente.lgPREENREGISTREMENTID;
                }
                var url = vente ? '../api/v1/vente/add/item' : '../api/v1/vente/add/depot';
                if (record) {
                    var stock = parseInt(record.get('intNUMBERAVAILABLE'));
                    var boolDECONDITIONNE = parseInt(record.get('boolDECONDITIONNE'));
                    var lgFAMILLEID = record.get('lgFAMILLEPARENTID');
                    var qte = parseInt(field.getValue());
                    if (qte > me.getMaxiQte()) {
                        Ext.MessageBox.show({
                            title: 'Message d\'avertissement',
                            width: 320,
                            msg: "La quantité saisie est supérieure à la quantité maximale autorisée . Voulez-bous continuer ? " + me.getMaxiQte(),
                            buttons: Ext.MessageBox.OKCANCEL,
                            icon: Ext.MessageBox.WARNING,
                            fn: function (buttonId) {
                                if (buttonId == "ok") {
                                   me.addVenteDepot(me.buildSaleParams(record, qte), url, field, produitCmp);

                                }else{
                                    field.focus(true, 50);  
                                    return;
                                }
                            }
                        });
                       
                    } else {
                        if (qte <= stock) {
                            me.addVenteDepot(me.buildSaleParams(record, qte), url, field, produitCmp);
                        } else if (qte > stock) {
                            if (boolDECONDITIONNE === 1) {
                                Ext.MessageBox.show({
                                    title: 'Message d\'erreur',
                                    width: 320,
                                    msg: "Stock insuffisant. Voulez-vous faire un déconditionnement ?",
                                    buttons: Ext.MessageBox.YESNO,
                                    icon: Ext.MessageBox.WARNING,
                                    fn: function (buttonId) {
                                        if (buttonId === "yes") {
                                            Ext.Ajax.request({
                                                method: 'GET',
                                                headers: {'Content-Type': 'application/json'},
                                                url: '../api/v1/vente/search/' + lgFAMILLEID,
                                                success: function (response, options) {
                                                    var result = Ext.JSON.decode(response.responseText, true);
                                                    if (result.success) {
                                                        var produit = result.data;
                                                        var qtyDetail = produit.intNUMBERDETAIL, nbreBoite = produit.intNUMBERAVAILABLE;
                                                        var stockParent = (nbreBoite * qtyDetail) + stock;
                                                        if (qte < stockParent) {
                                                            me.addVenteDepot(me.buildSaleParams(record, qte), url, field, produitCmp);
                                                        } else {

                                                            Ext.MessageBox.show({
                                                                title: 'Message d\'erreur',
                                                                width: 320,
                                                                msg: "Le stock est insuffisant",
                                                                buttons: Ext.MessageBox.OK,
                                                                icon: Ext.MessageBox.ERROR,
                                                                fn: function (buttonId) {
                                                                    if (buttonId === "ok") {
                                                                        me.getVnoqtyField().focus(true, 100);
                                                                    }
                                                                }
                                                            });
                                                        }
                                                    } else {

                                                        Ext.MessageBox.show({
                                                            title: 'Message d\'erreur',
                                                            width: 320,
                                                            msg: "Impossible de poursuivre",
                                                            buttons: Ext.MessageBox.OK,
                                                            icon: Ext.MessageBox.ERROR,
                                                            fn: function (buttonId) {
                                                                if (buttonId === "ok") {
                                                                    me.getVnoqtyField().focus(true, 100);
                                                                }
                                                            }
                                                        });

                                                    }

                                                },
                                                failure: function (response, options) {

                                                    Ext.Msg.alert("Message", 'Un problème avec le serveur');

                                                }
                                            });

                                        } else {
                                            me.getVnoqtyField().setValue(1);
                                            produitCmp.clearValue();
                                            produitCmp.setValue(null);
                                            produitCmp.focus(true, 100);
                                            me.getVnostockField().setValue(0);
                                            me.getVnoemplacementField().setValue('');

                                        }
                                    }
                                });
                            } else {
                                Ext.MessageBox.show({
                                    title: 'Ajout de produit',
                                    msg: 'Stock insuffisant, voulez-vous forcer le stock ?',
                                    buttons: Ext.MessageBox.YESNO,
                                    fn: function (button) {
                                        if ('yes' == button)
                                        {
                                            me.addVenteDepot(me.buildSaleParams(record, qte), url, field, produitCmp);

                                        } else if ('no' == button)
                                        {
                                            field.focus(true, 50);

                                        }
                                    },
                                    icon: Ext.MessageBox.QUESTION
                                });
                            }
                        }

                    }

//                   
                }
            }
        }
    },
    refresh: function () {
        var me = this;
        var vente = me.getCurrent();
        var venteId = null;
        if (vente) {
            venteId = vente.lgPREENREGISTREMENTID;
        }
        var query = me.getQueryField().getValue();
        var grid = me.getVnogrid();
        grid.getStore()
                .load({
                    params: {
                        venteId: venteId,
                        query: query,
                        statut: null
                    },
                    callback: function (records, operation, successful) {
                        me.getVnoproduitCombo()
                                .focus(true, 100);
                    }
                });
    },
    addVenteDepot: function (data, url, field, comboxProduit) {
        var me = this;
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: url,
            params: Ext.JSON.encode(data),
            success: function (response, options) {
                progress.hide();
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.getVnobtnCloture().enable();
                    me.getVnostockField().setValue(0);
                    me.getVnoemplacementField().setValue('');
                    me.current = result.data;
                    me.updatFields(me.getCurrent().strREF, me.getCurrent().intPRICE - me.getCurrent().intPRICEREMISE, me.getCurrent().intPRICE, me.getCurrent().intPRICEREMISE);
                    field.setValue(1);
                    comboxProduit.clearValue();
                    comboxProduit.focus(true, 50);
                    me.refresh();
                    me.getVenteQte();
                }


            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert("Message", 'server-side failure with status code' + response.status);
            }
        });
    },
    doBeforechangeVno: function (page, currentPage) {
        var me = this;
        var myProxy = me.getVnogrid().getStore().getProxy();
        var vente = me.getCurrent();
        var venteId = null;
        if (vente) {
            venteId = vente.lgPREENREGISTREMENTID;
        }
        var query = me.getQueryField().getValue();
        myProxy.params = {
            venteId: null,
            query: null,
            statut: null

        };
        myProxy.setExtraParam('venteId', venteId);
        myProxy.setExtraParam('query', query);
        myProxy.setExtraParam('statut', null);
    },

    doSearch: function () {
        var me = this;
        me.refresh();
    },
    removeItemVno: function (grid, rowIndex, colIndex) {
        var me = this;
        var record = grid.getStore().getAt(colIndex);
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/vente/remove/vno/item/' + record.get('lgPREENREGISTREMENTDETAILID'),
            success: function (response, options) {
                progress.hide();
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    var data = result.data;
                    me.updatFields(me.getCurrent().strREF, data.montant - data.remise, data.montant, data.remise);
                    me.getVnoproduitCombo()
                            .focus(true, 100);
                    me.getVenteQte();

                } else {
                    // Retrait refuse (vente cloturee entre-temps, ligne disparue) : motif affiche a l'ecran.
                    Ext.Msg.alert('Retrait du produit', result.msg || 'Le produit n\'a pas pu être retiré');
                }
                me.refresh();
            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert('Retrait du produit',
                        'Le serveur n\'a pas répondu (erreur ' + response.status + '). Réessayez.');
            }
        });
    }
    ,
    updateRemise: function () {
        var me = this;
        var vente = me.getCurrent(), remise = me.getRemiseField().getValue();
        if (remise > 0) {
            if (vente) {
                var venteId = vente.lgPREENREGISTREMENTID;
                var data = {"remiseDepot": remise, "venteId": venteId};
                var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                Ext.Ajax.request({
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    url: '../api/v1/vente/remise-depot',
                    params: Ext.JSON.encode(data),
                    success: function (response, options) {
                        progress.hide();
                        var result = Ext.JSON.decode(response.responseText, true);
                        if (result.success) {
                            me.updatFields(me.getCurrent().strREF, result.montantNet, result.montant, result.remise);
                            me.getVnoproduitCombo()
                                    .focus(false, 100);
                        } else {
                            Ext.Msg.alert("Message", "L'opérateur a échouée");
                        }

                    },
                    failure: function (response, options) {
                        progress.hide();
                        Ext.Msg.alert("Message", 'server-side failure with status code' + response.status);
                    }
                });
            }
        }

    }
    ,

    getVenteQte: function () {
        var me = this;
        var vente = me.getCurrent();
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/vente/quantite-vente/' + vente.lgPREENREGISTREMENTID,
            success: function (response, options) {
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.getNbreProduits().setValue(result.data);
                }
            }

        });
    },
    updateventeOnDepotgrid: function (editor, e, url, params) {
        var me = this;
        var record = e.record, grid = e.grid;
        var stock = parseInt(record.get('intNUMBERAVAILABLE'));
        var boolDECONDITIONNE = parseInt(record.get('boolDECONDITIONNE'));
        var lgFAMILLEID = record.get('lgFAMILLEPARENTID');
        var qte = parseInt(record.get('intQUANTITY'));
        if (boolDECONDITIONNE === 1 && stock < qte) {
            Ext.MessageBox.show({
                title: 'Message d\'erreur',
                width: 320,
                msg: "Stock insuffisant. Voulez-vous faire un déconditionnement ?",
                buttons: Ext.MessageBox.YESNO,
                icon: Ext.MessageBox.WARNING,
                fn: function (buttonId) {
                    if (buttonId === "yes") {
                        Ext.Ajax.request({
                            method: 'GET',
                            headers: {'Content-Type': 'application/json'},
                            url: '../api/v1/vente/search/' + lgFAMILLEID,
                            success: function (response, options) {
                                var result = Ext.JSON.decode(response.responseText, true);
                                if (result.success) {
                                    var produit = result.data;
                                    var qtyDetail = produit.intNUMBERDETAIL, nbreBoite = produit.intNUMBERAVAILABLE;
                                    var stockParent = (nbreBoite * qtyDetail) + stock;
                                    if (qte < stockParent) {
                                        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                                        Ext.Ajax.request({
                                            method: 'POST',
                                            headers: {'Content-Type': 'application/json'},
                                            url: url,
                                            params: Ext.JSON.encode(params),
                                            success: function (response, options) {
                                                progress.hide();
                                                editor.cancelEdit();
                                                e.record.commit();
                                                var result = Ext.JSON.decode(response.responseText, true);
                                                me.current = result.data;
                                                me.updatFields(me.getCurrent().strREF, me.getCurrent().intPRICE - me.getCurrent().intPRICEREMISE, me.getCurrent().intPRICE, me.getCurrent().intPRICEREMISE);
                                                me.refresh();
                                            },
                                            failure: function (response, options) {
                                                editor.cancelEdit();
                                                e.record.commit();
                                                progress.hide();
                                                Ext.Msg.alert("Message", "L'opération a échoué " + response.status);
                                            }

                                        });
                                    } else {

                                        Ext.MessageBox.show({
                                            title: 'Message d\'erreur',
                                            width: 320,
                                            msg: "Le stock est insuffisant",
                                            buttons: Ext.MessageBox.OK,
                                            icon: Ext.MessageBox.ERROR,
                                            fn: function (buttonId) {
                                                if (buttonId === "ok") {
                                                    me.getVnoqtyField().focus(true, 100);
                                                }
                                            }
                                        });

                                    }
                                } else {
                                    Ext.MessageBox.show({
                                        title: 'Message d\'erreur',
                                        width: 320,
                                        msg: "Impossible de poursuivre",
                                        buttons: Ext.MessageBox.OK,
                                        icon: Ext.MessageBox.ERROR,
                                        fn: function (buttonId) {
                                            if (buttonId === "ok") {
                                                me.getVnoqtyField().focus(true, 100);
                                            }
                                        }
                                    });

                                }

                            },
                            failure: function (response, options) {

                                Ext.Msg.alert("Message", 'Un problème avec le serveur');
                                me.getVnoqtyField().focus(true, 100);
                            }
                        });

                    } else {
                        editor.cancelEdit();
                        e.record.commit();
                        me.getVnoqtyField().setValue(1);
                        var comboxProduit = me.getVnoproduitCombo();
                        comboxProduit.clearValue();
                        comboxProduit.setValue(null);
                        me.getVnostockField().setValue(0);
                        me.getVnoemplacementField().setValue('');
                        me.refresh();


                    }
                }
            });

        } else {
            var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: url,
                params: Ext.JSON.encode(params),
                success: function (response, options) {
                    progress.hide();
                    e.record.commit();
//                 me.getVnoproduitCombo().focus(true, 100);
                    var result = Ext.JSON.decode(response.responseText, true);
                    me.current = result.data;
                    me.updatFields(me.getCurrent().strREF, me.getCurrent().intPRICE - me.getCurrent().intPRICEREMISE, me.getCurrent().intPRICE, me.getCurrent().intPRICEREMISE);
                    me.refresh();

                },
                failure: function (response, options) {
                    progress.hide();
                    editor.cancelEdit();
                    e.record.commit();
                    Ext.Msg.alert("Message", "L'opération a échoué " + response.status);
                }

            });
        }


    },
    onGridEdit: function (editor, e) {
        var params = {};
        var me = this, grid =
                me.getDetailGrid();
        var record = e.record;
        var url = '../api/v1/vente/update/item/vno';
        var qteServie = record.get('intQUANTITYSERVED');
        if (e.field === 'intQUANTITY') {
            qteServie = record.get('intQUANTITY');
            params = {
                "itemId": record.get('lgPREENREGISTREMENTDETAILID'),
                "itemPu": record.get('intPRICEUNITAIR'),
                "qte": record.get('intQUANTITY'),
                "qteServie": qteServie,
                "produitId": record.get('lgFAMILLEID')
            };
            me.updateventeOnDepotgrid(editor, e, url, params);
        } else if (e.field === 'intQUANTITYSERVED') {
            if (parseInt(record.get('intQUANTITYSERVED')) > parseInt(record.get('intQUANTITY'))) {
                editor.cancelEdit();
                Ext.MessageBox.show({
                    title: 'Message d\'erreur',
                    width: 320,
                    msg: 'La quantité servie ne peut pas être supérieure à la quantité demandée',
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.ERROR,
                    fn: function (buttonId) {
                        if (buttonId === "ok") {
                            me.refresh();
                        }
                    }
                });
                return false;
            } else {
                params = {
                    "itemId": record.get('lgPREENREGISTREMENTDETAILID'),
                    "itemPu": record.get('intPRICEUNITAIR'),
                    "qte": record.get('intQUANTITY'),
                    "qteServie": qteServie,
                    "produitId": record.get('lgFAMILLEID')
                };
                me.updateventeOnDepotgrid(editor, e, url, params);

            }
        } else if (e.field === 'intPRICEUNITAIR') {
            if (!me.canModifyPu) {
                editor.cancelEdit();
                me.refresh();
                Ext.MessageBox.show({
                    title: 'Message d\'erreur',
                    width: 320,
                    msg: "Vous n'êts pas autorisé à modifier le prix de vente",
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.ERROR,
                    fn: function (buttonId) {
                        if (buttonId === "ok") {
                            me.getVnoproduitCombo().focus(true, 50);

                        }
                    }
                });
                return false;
            } else {

                params = {
                    "itemId": record.get('lgPREENREGISTREMENTDETAILID'),
                    "itemPu": record.get('intPRICEUNITAIR'),
                    "qte": record.get('intQUANTITY'),
                    "qteServie": qteServie,
                    "produitId": record.get('lgFAMILLEID')
                };
                me.updateventeOnDepotgrid(editor, e, url, params);

            }

        }

    },

    updateCombox: function (lgEMPLACEMENTID, lgUSERVENDEURID) {
        var me = this;
        me.getVnotypeReglement().getStore().load(function (records, operation, success) {
            me.getVnotypeReglement().setValue('1');
        });
        if (lgEMPLACEMENTID) {
            me.getTypeVenteCombo().getStore().load(function (records, operation, success) {
                me.getTypeVenteCombo().setValue(lgEMPLACEMENTID);
            });
        }
        if (lgUSERVENDEURID) {
            me.getUserCombo().getStore().load(function (records, operation, success) {
                me.getUserCombo().setValue(lgUSERVENDEURID);
            });
        } else {
            me.getUserCombo().clearValue();
            me.getUserCombo().setValue(null);
        }

    },
    updatFields: function (refVente, montantNet, montantTotal, montantRemise) {
        var me = this;
        me.getTotalField().setValue(montantTotal);
        me.getMontantBottom().setValue(montantTotal);
        me.getMontantRemise().setValue(montantRemise);
        me.getMontantNet().setValue(montantNet);
        me.getRefVente().setValue(refVente);
    },
    resetCbCompoent: function () {
        var me = this;
        var cbContainer = me.getCbContainer();
        if (cbContainer.isVisible()) {
            me.getRefCb().setValue('');
            me.getBanque().setValue('');
            me.getLieuxBanque().setValue('');
            cbContainer.hide();
        }
    },
    resetRegleCmp: function () {
        var me = this, regleCmp = me.getReglementContainer();
        if (regleCmp.isVisible()) {
            me.getReglementContainer().hide();
            me.getMontantRecu().setValue(0);
            me.getMontantRemis().setValue(0);
            me.resetCbCompoent();
            regleCmp.hide();
            me.getRemiseField().setValue(0);
            me.getRemiseField().hide();
        }

    },
    resetFields: function () {
        var me = this;
        me.getTotalField().setValue(0);
        me.getMontantRemise().setValue(0);
        me.getMontantNet().setValue(0);
        me.getRefVente().setValue('');
        me.getMontantBottom().setValue(0);

        me.resetRegleCmp();


    },
    goBack: function () {
        var xtype = 'ventedepot';
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
    },
    loadVenteData: function (venteId) {
        var me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ventestats/depot/' + venteId,
            success: function (response, options) {
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    var record = result.data;
                    me.depotId = record.lgEMPLACEMENTID;
                    me.typeDepot = record.lgTYPEDEPOTID;
                    me.client = record.lgCLIENTID;
                    console.log(record);
                    if (record.lgTYPEDEPOTID == "1") {
                        me.getRemiseField().show();
                        me.getReglementContainer().show();
                        me.getRemiseField().setValue(record.remiseDepot);
                    } else {
                        me.getRemiseField().hide();
                        me.resetRegleCmp();

                    }
                    me.getGerantName().setValue(record.gerantFullName);
                    me.updateCombox(record.lgEMPLACEMENTID, record.lgUSERVENDEURID);
                    me.updatFields(record.strREF, record.intPRICE - record.intPRICEREMISE, record.intPRICE, record.intPRICEREMISE);
                }

            }
        });

    },
    loadExistant: function (record) {
        var me = this;
        me.loadVenteData(record.lgPREENREGISTREMENTID);
        me.current = {
            'intPRICE': record.intPRICE,
            'lgPREENREGISTREMENTID': record.lgPREENREGISTREMENTID,
            'intPRICEREMISE': record.intPRICEREMISE
        };
        me.getVenteQte();
        me.refresh();

    },
    gotView: function () {
        var me = this, view = me.getVentedepotview();
        var data = view.getData();
//        console.log(data);
        if (data) {
            var isEdit = data.isEdit;
            if (isEdit) {
                var record = data.record;
                me.loadExistant(record);
            } else {
                me.current = null;
                me.client = null;
                me.depotId = null;
                me.typeDepot = null;
                me.updateCombox(null, null);
            }
        } else {
            me.current = null;
            me.client = null;
            me.depotId = null;
            me.typeDepot = null;
            me.updateCombox(null, null);
        }
    },
    cheickCaisse: function () {
        var me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/vente/cheick-caisse',
            success: function (response, options) {
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.caisse = result.data;
                }
            }

        });
    },
    checkMaxiQte: function () {
        var me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/common/maximun-produit',
            success: function (response, options) {
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.maxiQte = result.data;
                }
            }

        });
    },
    checkModificationPrixU: function () {
        var me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/common/autorisation-prix-vente',
            success: function (response, options) {
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.canModifyPu = result.data;
                }
            }

        });
    },

    resetAlls: function () {
        var me = this;
        me.current = null;
        me.client = null;
        me.depotId = null;
        me.typeDepot = null;
        me.getVnogrid().getStore().load();
        me.getMontantRecu().enable();
        me.getMontantRecu().setReadOnly(false);
        me.getTotalField().setValue(0);
        me.getUserCombo().clearValue();
        me.getUserCombo().setValue(null);
        me.getTypeVenteCombo().clearValue();
        me.getTypeVenteCombo().setValue(null);
        me.getVnobtnCloture().disable();
        me.updateCombox(null, null);
        me.getNbreProduits().setValue(0);
        me.getGerantName().setValue('');
        me.resetFields();

    },
    onPrintTicket: function (params, url) {
        var me = this;
       
        Ext.Ajax.request({
            headers: {'Content-Type': 'application/json'},
            method: 'POST',
            url: url,
            params: Ext.JSON.encode(params),
            success: function (response, options) {
              
                me.getTypeVenteCombo().focus(false, 100);
            },
            failure: function (response, options) {
                me.getTypeVenteCombo()
                        .focus(true, 100);
            }

        });
    },

    clotureVenteDepotAgree: function (typeDepot) {
        var me = this;
        var vente = me.getCurrent();
        var clientId = me.getClient();
        var typeRegleId = me.getVnotypeReglement().getValue();
        var commentaire = '';
        var nom = "", banque = "", lieux = "";
        if (typeRegleId !== '1' && typeRegleId !== '4') {
            if (me.getCbContainer().isVisible()) {
                nom = me.getRefCb().getValue();
                banque = me.getBanque().getValue();
                lieux = me.getLieuxBanque().getValue();
            }
        }
        if (typeRegleId == "4") {
            commentaire = me.getCommentaire().getValue();
        }
        if (vente) {
            var venteId = vente.lgPREENREGISTREMENTID;
            var url = '../api/v1/vente/clotureVenteDepotAgree';
            var netTopay = parseInt(me.getMontantNet().getValue()),
                    userCombo = me.getUserCombo().getValue(),
                    montantRecu = me.getMontantRecu().getValue();
            if (typeRegleId === '1' && parseInt(montantRecu) < netTopay) {
                Ext.MessageBox.show({
                    title: 'Avertissement',
                    width: 320,
                    msg: 'Le montant saisi est inférieur au montant total à payer',
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING,
                    fn: function (buttonId) {
                        if (buttonId === "ok") {
                            me.getMontantRecu().focus(true, 100, function () {
                            });
                        }
                    }
                });
                return false;
            } else if (typeRegleId === '2' || typeRegleId === '3' || typeRegleId === '6') {
                montantRecu = netTopay;
            }
            var montantRemis = (montantRecu > netTopay) ? montantRecu - netTopay : 0;
            var totalRecap = parseInt(me.getTotalField().getValue()), montantPaye = montantRecu - montantRemis;
            var magre = me.getNetAmountToPay().marge;
            var param = {
                "venteId": venteId,
                "userVendeurId": userCombo,
                "montantRecu": montantRecu,
                "montantRemis": montantRemis,
                "montantPaye": montantPaye,
                "totalRecap": totalRecap,
                "typeRegleId": typeRegleId,
                "clientId": clientId,
                "nom": nom,
                "commentaire": commentaire,
                "banque": banque,
                "lieux": lieux,
                "marge": magre
            };
            var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: url,
                params: Ext.JSON.encode(param),
                success: function (response, options) {
                    var result = Ext.JSON.decode(response.responseText, true);
                    progress.hide();
                    if (result.success) {
                        Ext.MessageBox.show({
                            title: 'Impression du ticket',
                            msg: 'Voulez-vous imprimer le ticket ?',
                            buttons: Ext.MessageBox.YESNO,
                            fn: function (button) {
                                if ('yes' == button)
                                {
                                    me.onPrintTicket(param,   '../api/v1/vente/ticket/vno' );
                                }
                                me.resetAlls();
                                me.getTypeVenteCombo().focus(false, 100);
                            },
                            icon: Ext.MessageBox.QUESTION
                        });
                    } else {
                        Ext.MessageBox.show({
                            title: 'Message d\'erreur',
                            width: 320,
                            msg: result.msg,
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.ERROR,
                            fn: function (buttonId) {
                                if (buttonId === "ok") {
                                    me.getMontantRecu().focus(true, 100, function () {
                                    });
                                }
                            }
                        });
                    }

                },
                failure: function (response, options) {
                    progress.hide();
                    Ext.Msg.alert("Message", 'server-side failure with status code' + response.status);
                }

            });
        }
    },

    clotureVenteDepot: function (typeDepot) {
        var me = this;
        var vente = me.getCurrent();
        var clientId = me.getClient();
        if (vente) {
            var venteId = vente.lgPREENREGISTREMENTID;
            var url = '../api/v1/vente/clotureVenteDepot';
            var userCombo = me.getUserCombo().getValue();
            var param = {
                "natureVenteId": "3",
                "venteId": venteId,
                "userVendeurId": userCombo,
                "typeRegleId": "1",
                "clientId": clientId,
                "nom": "",
                "commentaire": "",
                "banque": "",
                "lieux": "lieux"
            };
            var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: url,
                params: Ext.JSON.encode(param),
                success: function (response, options) {
                    var result = Ext.JSON.decode(response.responseText, true);
                    progress.hide();
                    if (result.success) {
                        Ext.MessageBox.show({
                            title: 'Impression du ticket',
                            msg: 'Voulez-vous imprimer le ticket ?',
                            buttons: Ext.MessageBox.YESNO,
                            fn: function (button) {
                                if ('yes' == button)
                                {
                                    
                                    me.onPrintTicket(param, '../api/v1/vente/ticket/depot');
                                }
                                me.resetAlls();

                                me.getTypeVenteCombo().focus(false, 100);
                            },
                            icon: Ext.MessageBox.QUESTION
                        });
                    } else {
                        Ext.MessageBox.show({
                            title: 'Message d\'erreur',
                            width: 320,
                            msg: result.msg,
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.ERROR,
                            fn: function (buttonId) {
                                if (buttonId === "ok") {

                                }
                            }
                        });
                    }

                },
                failure: function (response, options) {
                    progress.hide();
                    Ext.Msg.alert("Message", 'server-side failure with status code' + response.status);
                }

            });
        }


    },
    doCloture: function () {
        var me = this, typeDepot = me.getTypeDepot();
        if (me.getCaisse()) {
            if (typeDepot == "2") {
                me.clotureVenteDepot(typeDepot);
            } else {
                me.clotureVenteDepotAgree(typeDepot);
            }
        } else {
            // Meme traitement que dans la vente : proposer d'ouvrir la caisse sur place plutot que
            // d'annoncer l'impasse et d'obliger a quitter l'ecran pour aller au menu.
            Ext.Msg.confirm('Caisse fermée', 'Votre caisse est fermée, voulez-vous l\'ouvrir ?', function (btn) {
                if (btn !== 'yes') {
                    return;
                }
                Ext.create('Ext.window.Window', {
                    title: 'Ouverture de caisse',
                    modal: true,
                    width: 470,
                    autoScroll: true,
                    layout: 'fit',
                    items: [{xtype: 'ouverturecaissemanger'}]
                }).show();
            });
        }
//        me.resetAlls();

    },

    buildSaleParams: function (record, qte) {
        var me = this, typeDepoId, emplacementId, remiseDepot = 0;
        var params = null;
        var clientId = me.getClient();
        var vente = me.getCurrent();
        var venteId = null;
        if (vente) {
            venteId = vente.lgPREENREGISTREMENTID;
        }

        if (record) {
            var user = me.getUserCombo().getValue(), magasinCmb = me.getTypeVenteCombo();
            var magasin = magasinCmb.findRecord("lgEMPLACEMENTID", magasinCmb.getValue());
            if (magasin) {
                typeDepoId = magasin.get('lgTYPEDEPOTID');
                if (typeDepoId == "1") {
                    var remiseDepotCmp = me.getRemiseField();
                    if (remiseDepotCmp) {
                        remiseDepot = remiseDepotCmp.getValue();
                    }
                }
                emplacementId = magasin.get('lgEMPLACEMENTID');
                params = {
                    "natureVenteId": "3",
                    "typeDepoId": typeDepoId,
                    "emplacementId": emplacementId,
                    "produitId": record.get('lgFAMILLEID'),
                    "itemPu": record.get('intPRICE'),
                    "qte": qte,
                    "qteServie": qte,
                    "devis": false,
                    "depot": true,
                    "remiseDepot": remiseDepot,
                    "venteId": venteId,
                    "userVendeurId": user,
                    "clientId": clientId

                };
            }

        }
        return params;
    }

}
);
