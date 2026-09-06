
/* global Ext */

Ext.define('testextjs.controller.DevisCtr', {
    extend: 'Ext.app.Controller',
    models: [
        'testextjs.model.caisse.Nature',
        'testextjs.model.caisse.TypeRemise',
        'testextjs.model.caisse.Remise',
        'testextjs.model.caisse.Produit',
        'testextjs.model.caisse.VenteItem',
        'testextjs.model.caisse.ClientLambda',
        'testextjs.model.caisse.ClientAssurance',
        'testextjs.model.caisse.ClientTiersPayant'
    ],
    views: [
        'testextjs.view.devis.DoDevis',
        'testextjs.view.devis.form.DevisClient',
        'testextjs.view.devis.form.DevisClientGrid',
        'testextjs.view.devis.form.FormCarnet'
    ],
    config: {
        current: null,
        client: null,
        canModifyPu: null
    },
    refs: [

        {
            ref: 'doDevis',
            selector: 'doDevis'
        },
        {
            ref: 'clientLambda',
            selector: 'clientDevis'
        }, {
            ref: 'addCarnetwindow',
            selector: 'formCarnetwindow'
        },
        {
            ref: 'nomCarnetClient',
            selector: 'formCarnetwindow form textfield[name=strFIRSTNAME]'
        },
        {
            ref: 'nomClient',
            selector: 'clientDevis form textfield[name=strFIRSTNAME]'
        },
        {
            ref: 'clientCarnetForm',
            selector: 'formCarnetwindow [xtype=form]'
        },
        {
            ref: 'btnAddClientCarnet',
            selector: 'formCarnetwindow #btnAddClientAssurance'
        },
        {
            ref: 'btnCancelCarnet',
            selector: 'formCarnetwindow #btnCancelAssClient'
        },
        {
            ref: 'clientLambdaform',
            selector: 'clientDevis form#clientLambdaform'
        },
        {
            ref: 'lambdaClientGrid',
            selector: 'clientDevis #lambdaClientGrid'
        },
        {
            ref: 'btnAjouterClientLambda',
            selector: 'clientDevis #lambdaClientGrid #btnAjouterClientLambda'
        },
        {
            ref: 'btnNewLambda',
            selector: 'clientDevis #btnNewLambda'
        },
        {
            ref: 'btnAddNewLambda',
            selector: 'clientDevis #btnAddNewLambda'
        },
        {
            ref: 'btnCancelLambda',
            selector: 'clientDevis form #btnCancelLambda'
        },
        {
            ref: 'queryClientLambda',
            selector: 'clientDevis [xtype=grid] #queryClientLambda'
        },
        {
            ref: 'btnRechercheLambda',
            selector: 'clientDevis [xtype=grid] #btnRechercheLambda'
        }
        , {
            ref: 'contenu',
            selector: 'doDevis #contenu'
        },
        {
            ref: 'infosClientStandard',
            selector: 'doDevis #contenu #infosClientStandard'
        },
        {
            ref: 'clientSearchTextField',
            selector: 'doDevis #contenu #clientSearchTextField'
        }
        ,

        {
            ref: 'totalField',
            selector: 'doDevis #contenu #totalField'
        },
        {
            ref: 'montantRemise',
            selector: 'doDevis #montantRemise'
        },

        {
            ref: 'tpName',
            selector: 'doDevis #contenu #tpName'
        },
        {
            ref: 'taux',
            selector: 'doDevis #contenu #taux'
        },

        {
            ref: 'ventevno',
            selector: 'doDevis #contenu panel'
        },
        {
            ref: 'ventevnoPaging',
            selector: 'doDevis #contenu pagingtoolbar'
        },
        {
            ref: 'tpContainer',
            selector: 'doDevis #contenu #tpContainer'
        },
        {
            ref: 'clientSearchBox',
            selector: 'doDevis #contenu #clientSearchBox'
        },

        {ref: 'vnotypeRemise',
            selector: 'doDevis #contenu [xtype=container] #typeRemise'
        },
        {ref: 'vnoremise',
            selector: 'doDevis #contenu [xtype=container] #remise'
        },
        {ref: 'vnoproduitCombo',
            selector: 'doDevis #contenu [xtype=fieldcontainer] #produit'
        },
        {ref: 'vnoqtyField',
            selector: 'doDevis #contenu [xtype=fieldcontainer] #qtyField'
        },
        {ref: 'vnoemplacementField',
            selector: 'doDevis #contenu [xtype=container] #emplacementId'
        }
        ,
        {ref: 'vnostockField',
            selector: 'doDevis #contenu [xtype=container] #stockField'
        }, {
            ref: 'userCombo',
            selector: 'doDevis #user'
        }, {
            ref: 'natureCombo',
            selector: 'doDevis #nature'
        },
        {ref: 'typeVenteCombo',
            selector: 'doDevis #typeVente'
        },

        {ref: 'vnobtnCloture',
            selector: 'doDevis #contenu [xtype=toolbar] #btnCloture'
        },
        {ref: 'vnobtnGoBack',
            selector: 'doDevis #contenu [xtype=toolbar] #btnGoBack'
        },
        {ref: 'vnogrid',
            selector: 'doDevis #contenu #gridContainer #venteGrid'
        },
        {ref: 'vnoactioncolumn',
            selector: 'doDevis #contenu [xtype=gridpanel] [xtype=actioncolumn]'
        },
        {ref: 'queryField',
            selector: 'doDevis #contenu #gridContainer [xtype=gridpanel] #query'
        },
        {ref: 'vnopagingtoolbar',
            selector: 'doDevis #contenu #gridContainer gridpanel #pagingtoolbar'
        },
        {ref: 'detailGrid',
            selector: 'doDevis #contenu [xtype=gridpanel]'
        },
        {ref: 'pagingtoolbar',
            selector: 'doDevis #contenu [xtype=gridpanel] #pagingtoolbar'
        },

        {
            ref: 'clientSearchTextField',
            selector: 'doDevis #contenu #clientSearchTextField'
        },
        {
            ref: 'assuranceClient',
            selector: 'assuranceDevis'
        },
        {
            ref: 'addBtnClientAssurance',
            selector: 'assuranceDevis #addBtnClientAssurance'
        },
        {
            ref: 'gridClientAss',
            selector: 'assuranceDevis [xtype=gridpanel]'
        },
        {
            ref: 'queryClientAssurance',
            selector: 'assuranceDevis #queryClientAssurance'
        },
        {
            ref: 'refBon',
            selector: 'doDevis #contenu #refBon'

        },
        {
            ref: 'nomAssure',
            selector: 'doDevis #contenu #nomAssure'

        },

        {
            ref: 'prenomAssure',
            selector: 'doDevis #contenu #prenomAssure'

        },
        {
            ref: 'numAssure',
            selector: 'doDevis #contenu #numAssure'

        },

        {
            ref: 'assureContainer',
            selector: 'doDevis #contenu #assureContainer'
        },
        {ref: 'netBtn',
            selector: 'doDevis #netBtn'
        },
        {ref: 'compteTp',
            selector: 'doDevis #compteTp'
        }


    ],
    init: function () {
        this.control(
                {
                    'doDevis': {
                        render: this.onReady
                    }, 'doDevis #user': {
                        select: this.onUserSelect
                    },
                    'doDevis #contenu [xtype=fieldcontainer] #qtyField': {
                        specialkey: this.onQtySpecialKey
                    },
                    'doDevis #contenu #produitContainer [xtype=fieldcontainer] #produit': {
                        afterrender: this.produitCmpAfterRender,
                        select: this.produitSelect,
                        specialkey: this.onProduitSpecialKey
                    }
                    ,
                    'doDevis #contenu #typeRemise': {
                        select: this.onTypeRemiseSelect
                    },
                    'doDevis #contenu #remise': {
                        select: this.updateRemise
                    },
                    'doDevis #contenu [xtype=gridpanel] pagingtoolbar': {
                        beforechange: this.doBeforechangeVno
                    },
                    'doDevis #contenu [xtype=gridpanel] #btnRecherche': {
                        click: this.refresh
                    },
                    'doDevis #contenu [xtype=gridpanel] #query': {
                        specialkey: this.onSpecialSpecialKey
                    },

                    'doDevis #contenu [xtype=gridpanel] [xtype=actioncolumn]': {
                        click: this.removeItemVno
                    },
                    'clientDevis #btnCancelLambda': {
                        click: this.closeClientLambdaWindow
                    },
                    'clientDevis #btnAddNewLambda': {
                        click: this.addClientForm
                    },
                    'clientDevis #lambdaClientGrid actioncolumn': {
                        click: this.btnAjouterClientLambda
                    },
                    "clientDevis form textfield": {
                        specialkey: this.onClientLambdaSpecialKey
                    },
                    'clientDevis #btnNewLambda': {
                        click: this.registerNewClient
                    },
                    'clientDevis #btnRechercheLambda': {
                        click: this.queryClientLambda
                    },
                    'clientDevis #queryClientLambda': {
                        specialkey: this.onClientLambdaKey
                    },
                    'doDevis #contenu [xtype=gridpanel]': {
                        edit: this.onGridEdit
                    },
                    'doDevis #contenu [xtype=toolbar] #btnGoBack': {
                        click: this.goBack
                    },
                    'doDevis #contenu [xtype=toolbar] #btnCloture': {
                        click: this.doCloture
                    },
                    'assuranceDevis #btnCancelClient': {
                        click: this.onBtnCancelClient
                    },
                    'doDevis #contenu #clientSearchTextField': {
                        specialkey: this.onClientSearchTextField
                    }
                    , 'assuranceDevis #queryClientAssurance': {
                        specialkey: this.onQueryClientAssurance
                    }, 'assuranceDevis [xtype=gridpanel] actioncolumn': {
                        click: this.onBtnClientAssuranceClick
                    }, 'assuranceDevis [xtype=gridpanel]': {
                        selectionchange: this.onGridRowSelect
                    },
                    'doDevis #typeVente': {
                        select: this.onTypeVenteSelect
                    }
                    , 'formCarnetwindow #btnCancelAssClient': {
                        click: this.onBtnCancelCarnet
                    },
                    'formCarnetwindow #btnAddClientAssurance': {
                        click: this.onBtnAddClientCarnteClick
                    },
                    'doDevis #netBtn': {
                        click: this.onNetBtn
                    }
                });
    },
    onReady: function () {
        var me = this;
        me.goToVenteView();
        me.checkModificationPrixU();

    },
    onNetBtn: function () {
        var me = this;
        me.showNetPaid();
    },
    showNetPaid: function () {
        var me = this;
        var vente = me.getCurrent(), remiseId = me.getVnoremise().getValue();
        var venteId = vente.lgPREENREGISTREMENTID;
        var data = {"remiseId": remiseId, "venteId": venteId};
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/vente/net/vno',
            params: Ext.JSON.encode(data),
            success: function (response, options) {
                progress.hide();
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    var data = result.data;
                    var montantRemise = data.remise;
                    me.getMontantRemise().setValue(montantRemise);
                }

            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert("Message", 'Erreur du serveur ' + response.status);
            }

        });
    },
    resettpContainer: function () {
        var me = this;
        me.getNomAssure().setValue('');
        me.getPrenomAssure().setValue('');
        me.getNumAssure().setValue('');
    },
    hideAssureContainer: function () {
        var me = this, assureContainer = me.getTpContainer();
        me.resettpContainer();
        if (assureContainer.isVisible()) {
            me.client = null;
            me.resetCarnetTp();
            assureContainer.hide();
        }
    },
    showAssureContainer: function (typevente) {
        var me = this, assureContainer = me.getTpContainer();
        if (!assureContainer.isVisible()) {
            assureContainer.show();
        }
    },
    onTypeVenteSelect: function (field) {
        var me = this, userCmp = me.getUserCombo();
        var value = field.getValue();
        me.client = null;
        if (value === "1") {
            me.hideAssureContainer();
        } else {
            me.showAssureContainer(value);
        }

        userCmp.focus(false, 50);
    },
    closeClientLambdaWindow: function () {
        var me = this;
        me.showAndHideInfosStandardClient(false);
        me.getClientLambda().destroy();
        me.getVnoproduitCombo().focus(true, 100);
    },
    addClientForm: function () {
        var me = this;
        me.getLambdaClientGrid().setVisible(false);
        me.getClientLambdaform().setVisible(true);
        me.getBtnNewLambda().enable();
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
                msg: "Veuillez ajouter un client à la vente",
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.ERROR,
                fn: function (buttonId) {
                    if (buttonId === "ok") {
                        me.getClientSearchTextField().focus(true, 50);
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
        var me = this, clientSearchBox = me.getClientSearchTextField();
        clientSearchBox.focus(false, 50);
    },
    onTypeRemiseSelect: function () {
        var me = this, combo = me.getVnotypeRemise(), remiseCombo = me.getVnoremise();
        var record = combo.getStore().findRecord('lgTYPEREMISEID', combo.getValue());
        remiseCombo.getStore().loadData(record.get('remises'));
        remiseCombo.focus(false, 100);
    },

    onProduitSpecialKey: function (field, e) {
        var me = this;
        var client = me.getClient();
        if (!client) {
            Ext.MessageBox.show({
                title: 'Message d\'erreur',
                width: 320,
                msg: "Veuillez ajouter un client à la vente",
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.ERROR,
                fn: function (buttonId) {
                    if (buttonId === "ok") {
                        me.getClientSearchTextField().focus(true, 50);
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
                            me.showNetPaid();
                        }
                    } else {
                        var record = combo.findRecord("lgFAMILLEID" || "intCIP", combo.getValue());
//                        var record = combo.findRecord("intCIP", combo.getValue());
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

    onSpecialSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var me = this;
            me.refresh();
        }
    },
    onQtySpecialKey: function (field, e, options) {
        if (field.getValue() > 0) {
            if (e.getKey() === e.ENTER) {
                var me = this;
                var produitCmp = me.getVnoproduitCombo();
                var record = produitCmp.findRecord("lgFAMILLEID", produitCmp.getValue()), typeVente = me.getTypeVenteCombo().getValue();
                record = record ? record : produitCmp.findRecord("intCIP", produitCmp.getValue());
                var vente = me.getCurrent();
                var venteId = null;
                if (vente) {
                    venteId = vente.lgPREENREGISTREMENTID;
                }
                var url = vente ? '../api/v1/vente/add/item' : '../api/v1/vente/devis';
                if (record) {
                    var stock = parseInt(record.get('intNUMBERAVAILABLE'));
                    var qte = parseInt(field.getValue());
                    if (qte > 999) {
                        Ext.MessageBox.show({
                            title: 'Message d\'erreur',
                            width: 320,
                            msg: "Impossible de saisir une quantit&eacute; sup&eacute;rieure &agrave; 1000",
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.WARNING,
                            fn: function (buttonId) {
                                if (buttonId === "ok") {
                                    field.focus(true, 50);

                                }
                            }
                        });
                        return;
                    } else {
                        if (qte <= stock) {
                            me.addVenteDevis(me.buildSaleParams(record, qte, typeVente), url, field, produitCmp);


                        } else if (qte > stock) {
                            Ext.MessageBox.show({
                                title: 'Ajout de produit',
                                msg: 'Stock insuffisant, voulez-vous forcer le stock ?',
                                buttons: Ext.MessageBox.YESNO,
                                icon: Ext.MessageBox.QUESTION,
                                fn: function (button) {
                                    if ('yes' == button)
                                    {
                                        me.addVenteDevis(me.buildSaleParams(record, qte, typeVente), url, field, produitCmp);

                                    } else if ('no' == button)
                                    {
                                        field.focus(true, 50);

                                    }
                                }

                            });
                        }

                    }

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
    addVenteDevis: function (data, url, field, comboxProduit) {
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
                    me.getTotalField().setValue(me.getCurrent().intPRICE);
                    field.setValue(1);
                    comboxProduit.clearValue();
                    comboxProduit.focus(true, 50);
                    me.refresh();
                } else {
                    Ext.MessageBox.show({
                        title: 'Ajout de produit',
                        msg: result.msg,
                        buttons: Ext.MessageBox.YESNO,
                        icon: Ext.MessageBox.OK,
                        fn: function (button) {
                            if ('ok' == button)
                            {
                                field.focus(true, 50);

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

    showAndHideInfosStandardClient: function (showOrHide) {
        var me = this, query = me.getClientSearchTextField().getValue();
        if (showOrHide) {
            var win = Ext.create('testextjs.view.devis.form.DevisClient');
            win.add(me.buildLambdaClientGrid());
            me.getLambdaClientGrid().getStore().load({
                params: {
                    query: query
                },
                callback: function (records, operation, successful) {
                    me.getClientSearchTextField().setValue('');
                    if (successful) {
                        if (records.length > 1) {
                            win.show();
                        } else if (records.length === 1) {
                            me.client = records[0];
                            me.updateClientLambdInfos();
                            me.persistClientChangeIfEditing();
                            me.getClientLambda().destroy();
                            me.getVnoproduitCombo().focus(true, 100);
                        } else {
                            Ext.MessageBox.show({
                                title: 'INFOS',
                                msg: 'Voulez-vous ajouter un nouveau client ?',
                                buttons: Ext.MessageBox.YESNO,
                                fn: function (button) {
                                    if ('yes' == button)
                                    {
                                        win.show();
                                        me.addClientForm();
                                        me.getNomClient().focus(100, true);
                                    }


                                },
                                icon: Ext.MessageBox.QUESTION
                            });
                        }

                    } else {
                        me.getClientLambda().destroy();
                    }
                }
            });
        }


    }
    ,
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
                    me.getTotalField().setValue(data.montant);
                    me.getVnoproduitCombo()
                            .focus(false, 100);
                    me.refresh();
                }
            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert("Message", 'server-side failure with status code' + response.status);
            }
        });
    }
    ,
    updateRemise: function (cmp) {
        var me = this;
        var vente = me.getCurrent(), remiseId = cmp.getValue();
        if (vente) {
            var venteId = vente.lgPREENREGISTREMENTID;
            var data = {"remiseId": remiseId, "venteId": venteId};
            var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/vente/remise',
                params: Ext.JSON.encode(data),
                success: function (response, options) {
                    progress.hide();
                    var result = Ext.JSON.decode(response.responseText, true);
                    if (result.success) {
                        var data = result.data;
                        me.getMontantRemise().setValue(data.montantRemise);
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
    ,

    buildLambdaClientGrid: function () {
        var me = this;
        me.getClientLambdaform().setVisible(false);
        var grid = {
            xtype: 'grid',
            itemId: 'lambdaClientGrid',
            selModel: {
                selType: 'rowmodel',
                mode: 'SINGLE'
            },
            store: Ext.create('Ext.data.Store', {
                autoLoad: false,
                pageSize: null,
                model: 'testextjs.model.caisse.ClientLambda',
                proxy: {
                    type: 'ajax',
                    url: '../api/v1/client/lambda',
                    reader: {
                        type: 'json',
                        root: 'data',
                        totalProperty: 'total'
                    }
                }

            }),
            height: 'auto',
            minHeight: 250,
            columns: [
                {
                    text: '#',
                    width: 45,
                    dataIndex: 'lgCLIENTID',
                    hidden: true

                },
                {
                    xtype: 'rownumberer',
                    text: 'LG',
                    width: 45,
                    sortable: true
                }, {
                    text: 'Nom',
                    flex: 1,
                    sortable: true,
                    dataIndex: 'strFIRSTNAME'
                }, {
                    header: 'Prénom(s)',
                    dataIndex: 'strLASTNAME',
                    flex: 1

                },
                {
                    header: 'Téléphone',
                    dataIndex: 'strADRESSE',
                    flex: 1

                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [
                        {
                            icon: 'resources/images/icons/add16.gif',
                            tooltip: 'Ajouter',
                            scope: this

                        }]
                }],
            dockedItems: [

                {
                    xtype: 'toolbar',
                    dock: 'top',
                    ui: 'footer',
                    items: [
                        {
                            xtype: 'textfield',
                            itemId: 'queryClientLambda',
                            emptyText: 'Taper ici pour rechercher',
                            width: '70%',
                            height: 45,
                            enableKeyEvents: true
                        }, '-', {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            scope: this,
                            itemId: 'btnRechercheLambda',
                            iconCls: 'searchicon'

                        },
                        '-', {
                            text: 'Nouveau client',
                            scope: this,
                            itemId: 'btnAddNewLambda',
                            icon: 'resources/images/icons/add16.gif'

                        }
                    ]
                }
            ]
        };
        return grid;
    },
    btnAjouterClientLambda: function (grid, rowIndex, colIndex) {
        var me = this;
        var record = grid.getStore().getAt(colIndex);
        me.client = record;

        me.getNomAssure().setValue(record.get('strFIRSTNAME'));
        me.getPrenomAssure().setValue(record.get('strLASTNAME'));
        me.getNumAssure().setValue(record.get('strADRESSE'));
        me.persistClientChangeIfEditing();
        me.closeClientLambdaWindow();
    },
    onClientLambdaSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var me = this;
            me.registerNewClient();
        }

    },
    updateClientLambdInfos: function () {
        var me = this, client = me.getClient();
        me.getNomAssure().setValue(client.get('strFIRSTNAME'));
        me.getPrenomAssure().setValue(client.get('strLASTNAME'));
        me.getNumAssure().setValue(client.get('strADRESSE'));

    },
    /**
     * Persiste le changement de client lorsqu'on modifie une proforma déjà
     * enregistrée. Sur une nouvelle proforma, le client est rattaché au moment
     * de l'ajout du premier article : on ne fait donc rien tant qu'il n'existe
     * pas de préenregistrement courant.
     */
    persistClientChangeIfEditing: function () {
        var me = this, vente = me.getCurrent(), client = me.getClient();
        if (!vente || !vente.lgPREENREGISTREMENTID || !client) {
            return;
        }
        var data = {
            "venteId": vente.lgPREENREGISTREMENTID,
            "clientId": client.get('lgCLIENTID')
        };
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Mise à jour du client');
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/vente/update/client',
            params: Ext.JSON.encode(data),
            success: function (response, options) {
                progress.hide();
                var result = Ext.JSON.decode(response.responseText, true);
                if (!result.success) {
                    Ext.Msg.alert('Message', result.msg || "La mise à jour du client a échoué");
                }
            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert('Message', 'Erreur serveur ' + response.status);
            }
        });
    },
    registerNewClient: function () {
        var me = this, form = me.getClientLambdaform();
        if (form.isValid()) {
            var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/client/add/lambda',
                params: Ext.JSON.encode(form.getValues()),
                success: function (response, options) {
                    progress.hide();
                    me.getClientSearchTextField().setValue('');
                    var result = Ext.JSON.decode(response.responseText, true);
                    if (result.success) {
                        me.client = new testextjs.model.caisse.ClientLambda(result.data);
                        me.updateClientLambdInfos();
                        me.persistClientChangeIfEditing();
                        me.closeClientLambdaWindow();
                        me.getVnoproduitCombo().focus(true, 50);
                    } else {
                        Ext.MessageBox.show({
                            title: 'Message d\'erreur',
                            width: 320,
                            msg: result.msg,
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.ERROR

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
    queryClientLambda: function () {
        var me = this, query = me.getQueryClientLambda().getValue();
        me.getLambdaClientGrid().getStore().load({
            params: {
                query: query
            }
        });
    },
    onClientLambdaKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var me = this;
            me.queryClientLambda();

        }
    },
    updateventeOnDevisgrid: function (editor, e, url, params) {
        var me = this;
        var record = e.record;
        var qte = parseInt(record.get('intQUANTITY'));
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
                if (result.success) {
                    me.current = result.data;
                    me.getTotalField().setValue(me.getCurrent().intPRICE);
                    me.refresh();
                }
            },
            failure: function (response, options) {
                progress.hide();
                editor.cancelEdit();
                e.record.commit();
                Ext.Msg.alert("Message", "L'opération a échoué " + response.status);
            }

        });



    },
    onGridEdit: function (editor, e) {
        var me = this, grid =
                me.getDetailGrid();
        var record = e.record;
        var qteServie;
        var url = '../api/v1/vente/update/item/vno';
        var qteServie = record.get('intQUANTITYSERVED');
        if (e.field === 'intQUANTITY') {
            qteServie = record.get('intQUANTITY');
            var params = {
                "itemId": record.get('lgPREENREGISTREMENTDETAILID'),
                "itemPu": record.get('intPRICEUNITAIR'),
                "qte": record.get('intQUANTITY'),
                "qteServie": qteServie,
                "produitId": record.get('lgFAMILLEID')
            };
            me.updateventeOnDevisgrid(editor, e, url, params);
        } else if (e.field === 'intQUANTITYSERVED') {
            if (parseInt(record.get('intQUANTITYSERVED')) > parseInt(record.get('intQUANTITY'))) {
                editor.cancelEdit();
                me.refresh();
                Ext.MessageBox.show({
                    title: 'Message d\'erreur',
                    width: 320,
                    msg: 'La quantité servie ne peut pas être supérieure à la quantité demandée',
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.ERROR,
                    fn: function (buttonId) {
                        if (buttonId === "ok") {
//                            e.field.focus(true);
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
                me.updateventeOnDevisgrid(editor, e, url, params);


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
                me.updateventeOnDevisgrid(editor, e, url, params);
            }

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
    updateComboxFields: function (lgTYPEVENTEID, lgNATUREVENTEID, lgUSERVENDEURID, typeRemiseId, lgREMISEID) {
        var me = this;
        var _typeVenteId = (lgTYPEVENTEID ? lgTYPEVENTEID : '1');
        var _natureVenteId = (lgNATUREVENTEID ? lgNATUREVENTEID : '1');
        me.getTypeVenteCombo().getStore().load(function (records, operation, success) {
            me.getTypeVenteCombo().setValue(_typeVenteId);
        });

        me.getNatureCombo().getStore().load(function (records, operation, success) {
            me.getNatureCombo().setValue(_natureVenteId);
        });
        if (lgUSERVENDEURID) {
            me.getUserCombo().getStore().load(function (records, operation, success) {
                me.getUserCombo().setValue(lgUSERVENDEURID);
            });
        } else {
            me.getUserCombo().clearValue();
            me.getUserCombo().setValue(null);
        }
        if (typeRemiseId) {
            var combo = me.getVnotypeRemise(), remiseCombo = me.getVnoremise();
            combo.getStore().load(function (records, operation, success) {
                combo.setValue(typeRemiseId);
                var record = combo.getStore().findRecord('lgTYPEREMISEID', typeRemiseId);
                remiseCombo.getStore().loadData(record.get('remises'));
                if (lgREMISEID) {
                    remiseCombo.setValue(lgREMISEID);
                }
            });
        }
    },
    updateAmountFields: function (total) {
        var me = this;
        me.getTotalField().setValue(total);
    },
    goBack: function () {
        var xtype = 'devismanager';
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
    },
    loadClient: function (clientId, lgTYPEVENTEID, venteId, intPRICE) {
        var me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/client/client-assurance/' + clientId + '/' + venteId,
            success: function (response, options) {
                var result = Ext.JSON.decode(response.responseText, true);
                me.updateAmountFields(intPRICE);
                if (result.success) {
                    me.getClientSearchTextField().setValue('');
                    me.client = new testextjs.model.caisse.ClientAssurance(result.data);
                    me.getVnobtnCloture().enable();
                    if (lgTYPEVENTEID === '1') {
                        me.updateCmp();

                    } else {
                        me.showAssureContainer(lgTYPEVENTEID);
                        me.updateAssurerCmp();
                        me.updateCarnetTp(me.getClient());
                    }


                } else {
                    Ext.Msg.alert("Message", "Impossible de charger les infos du client de cette vente");
                }

            },
            failure: function (response, options) {
                Ext.Msg.alert("Message", 'Problème avec le server');
            }
        });
    },
    loadExistant: function (record) {
        var me = this, clientSearchBox = me.getClientSearchBox();
        var lgTYPEVENTEID = record.lgTYPEVENTEID, lgREMISEID = record.lgREMISEID, lgUSERVENDEURID = record.lgUSERVENDEURID;
        var lgNATUREVENTEID = record.lgNATUREVENTEID, intPRICE = record.intPRICE,
                typeRemiseId = record.typeRemiseId, client = record.client;
        me.updateComboxFields(lgTYPEVENTEID, lgNATUREVENTEID, lgUSERVENDEURID, typeRemiseId, lgREMISEID);

        me.current = {
            'intPRICE': intPRICE,
            'lgPREENREGISTREMENTID': record.lgPREENREGISTREMENTID
        };
        me.refresh();
        me.client = client;
        // On garde le champ de recherche client visible afin de pouvoir
        // modifier le client d'une proforma existante.
        clientSearchBox.show();
        me.loadClient(client.lgCLIENTID, lgTYPEVENTEID, record.lgPREENREGISTREMENTID, intPRICE);


    },
    goToVenteView: function () {
        var me = this, view = me.getDoDevis();
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
                me.updateComboxFields(null, null, null, null, null);
            }
        } else {
            me.current = null;
            me.client = null;
            me.updateComboxFields(null, null, null, null, null);
        }
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
        me.getVnogrid().getStore().load();
        me.getTotalField().setValue(0);
        me.getUserCombo().clearValue();
        me.getUserCombo().setValue(null);
        me.getVnobtnCloture().disable();
        me.hideAssureContainer();
        me.updateComboxFields(null, null, null, null, null);
        me.resetCarnetTp();
        me.getClientSearchTextField().setValue('');
        me.getClientSearchBox().show();
    },

    onClientSearchTextField: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var me = this, typeVenteId = me.getTypeVenteCombo().getValue();
            if (field.getValue() && field.getValue().trim() !== '') {
                // La recherche client fonctionne aussi bien sur une nouvelle
                // proforma que sur une proforma existante (modification du client).
                me.client = null;
                if (typeVenteId === '1') {
                    me.showAndHideInfosStandardClient(true);
                } else {
                    me.loadAssuranceClient(field.getValue());
                }
            }

        }
    },
    onQueryClientAssurance: function (field, e, options) {

        if (e.getKey() === e.ENTER) {
            var me = this, grid = me.getGridClientAss(), typeVenteId = me.getTypeVenteCombo().getValue(), typeClientId = '6';

            if (typeVenteId === '3') {
                typeClientId = '2';
            }
            if (field.getValue() && field.getValue().trim() !== '') {
                grid.getStore().load({
                    params: {
                        'query': field.getValue(),
                        'typeClientId': typeClientId
                    }
                });
                me.resettpContainer();
                me.resetCarnetTp();
            }
        }
    },

    loadAssuranceClient: function (queryString) {
        var me = this;
        var typeVenteId = me.getTypeVenteCombo().getValue();
        if (typeVenteId === "1") {
            return false;
        }
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        var win = Ext.create('testextjs.view.devis.form.DevisClientGrid');
        var grid = me.getGridClientAss(), typeClientId = '';
        if (typeVenteId === '2') {
            typeClientId = '1';
        } else if (typeVenteId === '3') {
            typeClientId = '2';
        }

        grid.getStore().load({
            params: {
                'query': queryString,
                'typeClientId': typeClientId
            },
            callback: function (records, operation, successful) {
                me.getClientSearchTextField().setValue('');
                progress.hide();
                if (successful) {
                    if (records.length > 1) {

                        win.show();
                    } else if (records.length === 1) {
                        me.client = records[0];
                        me.onSelectClientAssurance();
                    } else {
                        Ext.MessageBox.show({
                            title: 'INFOS',
                            msg: 'Voulez-vous ajouter un nouveau client ?',
                            buttons: Ext.MessageBox.YESNO,
                            fn: function (button) {
                                if ('yes' == button)
                                {
                                    me.onbtnClientAssurence();
                                }


                            },
                            icon: Ext.MessageBox.QUESTION
                        });
                    }

                } else {
                    me.onBtnCancelClient();
                }
            }
        });
    },
    onBtnCancelClient: function () {
        var me = this;
        me.getAssuranceClient().destroy();
        me.getClientSearchTextField().setValue('');
    },
    onGridRowSelect: function (g, record) {
        var me = this;
        me.client = record[0];
        me.onSelectClientAssurance();
    },
    onSelectClientAssurance: function () {
        var me = this;
        var client = me.getClient();
        if (client) {
            me.updateAssurerCmp();
        }
        me.updateCarnetTp(client);
        me.persistClientChangeIfEditing();
        me.onBtnCancelClient();
        me.getVnoproduitCombo().focus(true, 100);
    },

    onClientAssuranceUpdate: function () {
        var me = this;
        var client = me.getClient();
        if (client) {
            me.updateAssurerCmp();
            me.persistClientChangeIfEditing();
        }

    },

    updateAssurerCmp: function () {
        var me = this;
        var client = me.getClient();
        if (client) {
            me.getNomAssure().setValue(client.get('strFIRSTNAME'));
            me.getPrenomAssure().setValue(client.get('strLASTNAME'));
            me.getNumAssure().setValue(client.get('strNUMEROSECURITESOCIAL'));
        }
    },
    updateCmp: function () {
        var me = this;
        var client = me.getClient();
        if (client) {
            me.getNomAssure().setValue(client.get('strFIRSTNAME'));
            me.getPrenomAssure().setValue(client.get('strLASTNAME'));
            me.getNumAssure().setValue(client.get('strADRESSE'));
        }
    },

    onBtnClientAssuranceClick: function (grid, rowIndex, colIndex) {
        var me = this;
        var record = grid.getStore().getAt(colIndex);
        me.client = record;
        me.onSelectClientAssurance();
    },

    onbtnClientAssurence: function () {
        var me = this,
                typeVenteCombo = me.getTypeVenteCombo().getValue();
        if (typeVenteCombo === '3') {
            var clientwin = Ext.create('testextjs.view.devis.form.FormCarnet');
            clientwin.show();
            me.getNomCarnetClient().focus(false, 50);
        }
    },

    onBtnCancelCarnet: function () {
        var me = this, addCarnetwindow = me.getAddCarnetwindow();
        addCarnetwindow.destroy();
    },

    onBtnAddClientCarnteClick: function () {
        var me = this, form = me.getClientCarnetForm();
        if (form.isValid()) {
            var client = form.getValues();
            var record = new testextjs.model.caisse.ClientAssurance(client);
            var datas = {
                "bIsAbsolute": record.get('bIsAbsolute'),
                "dbPLAFONDENCOURS": record.get('dbPLAFONDENCOURS'),
                "dblQUOTACONSOMENSUELLE": record.get('dblQUOTACONSOMENSUELLE'),
                "dtNAISSANCE": record.get('dtNAISSANCE'),
                "intPOURCENTAGE": record.get('intPOURCENTAGE'),
                "intPRIORITY": 1,
                "lgCATEGORIEAYANTDROITID": record.get('lgCATEGORIEAYANTDROITID'),
                "lgCLIENTID": record.get('lgCLIENTID'),
                "lgCOMPANYID": record.get('lgCOMPANYID'),
                "lgRISQUEID": record.get('lgRISQUEID'),
                "lgTIERSPAYANTID": record.get('lgTIERSPAYANTID'),
                "lgTYPECLIENTID": record.get('lgTYPECLIENTID'),
                "lgVILLEID": record.get('lgVILLEID'),
                "strADRESSE": record.get('strADRESSE'),
                "strCODEPOSTAL": record.get('strCODEPOSTAL'),
                "strFIRSTNAME": record.get('strFIRSTNAME'),
                "strLASTNAME": record.get('strLASTNAME'),
                "strNUMEROSECURITESOCIAL": record.get('strNUMEROSECURITESOCIAL'),
                "strSEXE": record.get('strSEXE')

            };
            // Envoi nomme, pour pouvoir etre rejoue apres confirmation d'un doublon d'identite.
            var envoyer = function () {
                var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                Ext.Ajax.request({
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    url: '../api/v1/client/add/carnet',
                    params: Ext.JSON.encode(datas),
                    success: function (response, options) {
                        progress.hide();
                        var result = Ext.JSON.decode(response.responseText, true);
                        if (result.success) {
                            me.getClientSearchTextField().setValue('');
                            me.onBtnCancelCarnet();
                            var clientR = new testextjs.model.caisse.ClientAssurance(result.data);
                            me.client = clientR;
                            me.onClientAssuranceUpdate();
                        } else if (result.doublonClient) {
                            me.confirmerDoublonClient(result, datas, envoyer);
                        } else {
                            Ext.MessageBox.show({
                                title: 'Message d\'erreur',
                                width: 320,
                                msg: result.msg,
                                buttons: Ext.MessageBox.OK,
                                icon: Ext.MessageBox.ERROR

                            });
                        }

                    },
                    failure: function (response, options) {
                        progress.hide();
                        Ext.Msg.alert("Message", 'Erreur de création du client');
                    }

                });
            };
            envoyer();
        }

    },
    /**
     * Meme avertissement que sur l'ecran de vente : le serveur a trouve un client actif portant
     * deja cette identite. On le nomme et on demande confirmation avant d'en creer un second.
     */
    confirmerDoublonClient: function (result, datas, renvoyer) {
        var items = (result.doublons || []).map(function (c) {
            var identite = ((c.strLASTNAME || '') + ' ' + (c.strFIRSTNAME || '')).trim();
            var code = c.strCODEINTERNE ? ' (code ' + Ext.String.htmlEncode(c.strCODEINTERNE) + ')' : '';
            return '<li>' + Ext.String.htmlEncode(identite) + code + '</li>';
        }).join('');
        Ext.MessageBox.show({
            title: 'Doublon possible',
            width: 550,
            msg: result.msg + '<ul style="margin: 6px 0 6px 18px;">' + items + '</ul>'
                    + 'Voulez-vous quand même créer un nouveau client ?',
            buttons: Ext.MessageBox.YESNO,
            icon: Ext.MessageBox.QUESTION,
            fn: function (btn) {
                if (btn === 'yes') {
                    datas.forcerCreation = true;
                    renvoyer();
                }
            }
        });
    },
    resetCarnetTp: function () {
        var me = this, tpName = me.getTpName(), taux = me.getTaux(), refBon = me.getRefBon();
        tpName.setValue('');
        refBon.setValue('');
        taux.setValue('');

    },
    updateCarnetTp: function (record) {
        var me = this, tpName = me.getTpName(), taux = me.getTaux(), refBon = me.getRefBon(), compteTp = me.getCompteTp();
//        var tierspay = record.get('tierspayants')[0];
        var tierspay = record.get('tiersPayants')[0];
        if (tierspay) {
            tpName.setValue(tierspay.tpFullName);
            refBon.setValue(tierspay.numBon);
            taux.setValue(tierspay.taux);
            compteTp.setValue(tierspay.lgTIERSPAYANTID);

        }
    },
    doCloture: function () {

        var me = this, vente = me.getCurrent();
        // On mémorise l'identifiant de la proforma enregistrée avant de vider
        // la vue, afin de pouvoir l'imprimer si l'utilisateur le souhaite.
        var venteId = vente ? vente.lgPREENREGISTREMENTID : null;
        me.resetAlls();
        Ext.MessageBox.show({
            title: 'Impression',
            msg: 'Voulez-vous imprimer la proforma ?',
            buttons: Ext.MessageBox.YESNO,
            icon: Ext.MessageBox.QUESTION,
            fn: function (button) {
                if (button === 'yes' && venteId) {
                    // Même action que le bouton "Re-imprimer la proforma" de la liste.
                    window.open('../FacturePdfServlet?mode=DEVIS&venteId=' + venteId);
                }
                me.goBack();
            }
        });

    },

    buildSaleParams: function (record, qte, typeVente) {
        var me = this;
        var params = null;
        var client = me.getClient(), clientId = null;

        if (client) {
            clientId = me.getClient().get('lgCLIENTID');
        }

        var vente = me.getCurrent();
        var venteId = null;
        if (vente) {
            venteId = vente.lgPREENREGISTREMENTID;
        }
        var taux = me.getTaux(), refBon = me.getRefBon(), compteTp = me.getCompteTp();
        var tierspayants = [{
                "compteTp": compteTp.getValue(),
                "numBon": refBon.getValue(),
                "taux": parseInt(taux.getValue())
            }];

        if (typeVente === '1') {
            tierspayants = [];
        }

        if (record) {
            var user = me.getUserCombo().getValue(),
                    nature = me.getNatureCombo().getValue()
                    , remiseId = me.getVnoremise().getValue(), bonRef = me.getRefBon(), bonRefVal = '';
            if (bonRef) {
                bonRefVal = bonRef.getValue();

            }
            params = {
                "typeVenteId": typeVente,
                "natureVenteId": nature,
                "produitId": record.get('lgFAMILLEID'),
                "itemPu": record.get('intPRICE'),
                "qte": qte,
                "qteServie": qte,
                "devis": true,
                "remiseId": remiseId,
                "venteId": venteId,
                "userVendeurId": user,
                "bonRef": bonRefVal,
                "clientId": clientId,
                "tierspayants": tierspayants

            };


        }
        return params;
    }

}
);
