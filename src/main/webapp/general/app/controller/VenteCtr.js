
/* global Ext */

Ext.define('testextjs.controller.VenteCtr', {
    extend: 'Ext.app.Controller',
    models: [
        'testextjs.model.caisse.Nature',
        'testextjs.model.caisse.Reglement',
        'testextjs.model.caisse.TypeRemise',
        'testextjs.model.caisse.Remise',
        'testextjs.model.caisse.TypeVente',
        'testextjs.model.caisse.Produit',
        'testextjs.model.caisse.VenteItem',
        'testextjs.model.caisse.ClientLambda',
        'testextjs.model.caisse.ClientAssurance',
        'testextjs.model.caisse.AyantDroit',
        'testextjs.model.caisse.ClientTiersPayant',
        'testextjs.store.caisse.RechercheClientAss',
        'testextjs.model.caisse.MedecinModel'
    ],
    views: [
        'testextjs.view.vente.VenteView',
        'testextjs.view.vente.user.ClientLambda',
        'testextjs.view.vente.user.ClientGrid',
        'testextjs.view.vente.user.addClientAssurance',
        'testextjs.view.vente.user.AyantDroitGrid',
        'testextjs.view.vente.user.AddCarnet',
        'testextjs.view.vente.user.Medecin',
        'testextjs.view.vente.ReglementGrid'
    ],
    config: {
        current: null,
        netAmountToPay: null,
        client: null,
        canModifyPu: null,
        ayantDroit: null,
        categorie: null,
        venteSansBon: false,
        caisse: false,
        ancienTierspayant: null,
        toRecalculate: true,
        plafondVente: false,
        medecinId: null,
        showStock: false,
        checkUg: false,
        extraModeReglementId: null,
        ticketCaisse: true

    },
    refs: [

        {
            ref: 'doventemanager',
            selector: 'doventemanager'
        },
        {
            ref: 'clientLambda',
            selector: 'clientLambda'
        },
        {
            ref: 'medecin',
            selector: 'medecin'
        },
        {
            ref: 'reglementGrid',
            selector: 'reglementGrid'
        },

        {
            ref: 'addaddclientwindow',
            selector: 'addaddclientwindow'
        }, {
            ref: 'addCarnetwindow',
            selector: 'addCarnetwindow'
        },
        {
            ref: 'nomCarnetClient',
            selector: 'addCarnetwindow form textfield[name=strFIRSTNAME]'
        },
        {
            ref: 'clientCarnetForm',
            selector: 'addCarnetwindow [xtype=form]'
        },
        {
            ref: 'nomAssClient',
            selector: 'addaddclientwindow form textfield[name=strFIRSTNAME]'
        },
        {
            ref: 'nomLambdaClient',
            selector: 'clientLambda form textfield[name=strFIRSTNAME]'
        },

        {
            ref: 'clientAssuranceForm',
            selector: 'addaddclientwindow [xtype=form]'
        },
        {
            ref: 'tpComplementaireGrid',
            selector: 'addaddclientwindow [xtype=grid]'
        },
        {
            ref: 'btnAddClientAssurance',
            selector: 'addaddclientwindow #btnAddClientAssurance'
        },
        {
            ref: 'btnCancelAssClient',
            selector: 'addaddclientwindow #btnCancelAssClient'
        },
        {
            ref: 'btnAddClientCarnet',
            selector: 'addCarnetwindow #btnAddClientAssurance'
        },
        {
            ref: 'btnCancelCarnet',
            selector: 'addCarnetwindow #btnCancelAssClient'
        },
        {
            ref: 'clientLambdaform',
            selector: 'clientLambda form#clientLambdaform'
        },
        {
            ref: 'lambdaClientGrid',
            selector: 'clientLambda #lambdaClientGrid'
        },
        {
            ref: 'btnAjouterClientLambda',
            selector: 'clientLambda #lambdaClientGrid #btnAjouterClientLambda'
        },
        {
            ref: 'btnNewLambda',
            selector: 'clientLambda #btnNewLambda'
        },
        {
            ref: 'btnAddNewLambda',
            selector: 'clientLambda #btnAddNewLambda'
        },
        {
            ref: 'btnCancelLambda',
            selector: 'clientLambda form #btnCancelLambda'
        },
        {
            ref: 'queryClientLambda',
            selector: 'clientLambda [xtype=grid] #queryClientLambda'
        },
        {
            ref: 'btnRechercheLambda',
            selector: 'clientLambda [xtype=grid] #btnRechercheLambda'
        }
        , {
            ref: 'contenu',
            selector: 'doventemanager #contenu'
        },
        {
            ref: 'infosClientStandard',
            selector: 'doventemanager #contenu #infosClientStandard'
        },
        {
            ref: 'clientSearchTextField',
            selector: 'doventemanager #contenu #clientSearchTextField'
        },

        {
            ref: 'encaissement',
            selector: 'doventemanager #contenu #encaissement'
        },
        {
            ref: 'btnClosePrevente',
            selector: 'doventemanager #contenu #btnClosePrevente'
        }
        ,
        {
            ref: 'nomClient',
            selector: 'doventemanager #contenu #infosClientStandard #nomClient'
        }
        , {
            ref: 'prenomClient',
            selector: 'doventemanager #contenu #infosClientStandard #prenomClient'
        }
        , {
            ref: 'telephoneClient',
            selector: 'doventemanager #contenu #infosClientStandard #telephoneClient'
        },
        {
            ref: 'cbContainer',
            selector: 'doventemanager #contenu #cbContainer'
        },
        {
            ref: 'montantTp',
            selector: 'doventemanager #contenu #montantTp'
        },
        {
            ref: 'sansBon',
            selector: 'doventemanager #contenu #sansBon'
        },
        {
            ref: 'refCb',
            selector: 'doventemanager #contenu #cbContainer #refCb'
        },
        {
            ref: 'banque',
            selector: 'doventemanager #contenu #cbContainer #banque'
        },
        {
            ref: 'lieuxBanque',
            selector: 'doventemanager #contenu #cbContainer #lieuxBanque'
        },
        {
            ref: 'totalField',
            selector: 'doventemanager #contenu #totalField'
        },
        {
            ref: 'dernierMonnaie',
            selector: 'doventemanager #contenu #dernierMonnaie'
        },
        {
            ref: 'montantRecu',
            selector: 'doventemanager #contenu #montantRecu'
        },
        {
            ref: 'montantExtra',
            selector: 'doventemanager #contenu #montantExtra'
        },

        {
            ref: 'ventevno',
            selector: 'doventemanager #contenu ventevno'
        },
        {
            ref: 'ventevnoPaging',
            selector: 'doventemanager #contenu pagingtoolbar'
        },
        {
            ref: 'montantNet',
            selector: 'doventemanager #contenu #montantNet'
        },
        {
            ref: 'vnomontantRemise',
            selector: 'doventemanager #contenu [xtype=fieldset] [xtype=container] #montantRemise'
        }, {
            ref: 'monnaie',
            selector: 'doventemanager #contenu [xtype=fieldset] [xtype=container] #montantRemis'
        },

        {
            ref: 'vnotypeReglement',
            selector: 'doventemanager #contenu [xtype=fieldset] [xtype=container] #typeReglement'
        },
        {
            ref: 'vnotypeRemise',
            selector: 'doventemanager #contenu [xtype=container] #typeRemise'
        },
        {
            ref: 'vnoremise',
            selector: 'doventemanager #contenu [xtype=container] #remise'
        },
        {
            ref: 'vnoproduitCombo',
            selector: 'doventemanager #contenu [xtype=fieldcontainer] #produit'
        },
        {
            ref: 'vnoqtyField',
            selector: 'doventemanager #contenu [xtype=fieldcontainer] #qtyField'
        },
        {
            ref: 'vnoemplacementField',
            selector: 'doventemanager #contenu [xtype=container] #emplacementId'
        }
        , {
            ref: 'commentaire',
            selector: 'doventemanager #contenu #commentaire'
        },
        {
            ref: 'vnostockField',
            selector: 'doventemanager #contenu [xtype=container] #stockField'
        }, {
            ref: 'userCombo',
            selector: 'doventemanager #user'
        }, {
            ref: 'natureCombo',
            selector: 'doventemanager #nature'
        },
        {
            ref: 'typeVenteCombo',
            selector: 'doventemanager #typeVente'
        },
        {
            ref: 'vnonetBtn',
            selector: 'doventemanager #contenu [xtype=toolbar] #netBtn'
        },

        {
            ref: 'vnobtnCloture',
            selector: 'doventemanager #contenu [xtype=toolbar] #btnCloture'
        },
        {
            ref: 'vnobtnGoBack',
            selector: 'doventemanager #contenu [xtype=toolbar] #btnGoBack'
        },

        {
            ref: 'vnogrid',
            selector: 'doventemanager #contenu #gridContainer #venteGrid'
        },
        {
            ref: 'vnoactioncolumn',
            selector: 'doventemanager #contenu [xtype=gridpanel] [xtype=actioncolumn]'
        },
        {
            ref: 'queryField',
            selector: 'doventemanager #contenu #gridContainer [xtype=gridpanel] #query'
        },
        {
            ref: 'vnopagingtoolbar',
            selector: 'doventemanager #contenu #gridContainer gridpanel #pagingtoolbar'
        },
        {
            ref: 'detailGrid',
            selector: 'doventemanager #contenu [xtype=gridpanel]'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'doventemanager #contenu [xtype=gridpanel] #pagingtoolbar'
        },
        {
            ref: 'typeReglement',
            selector: 'doventemanager #contenu #typeReglement'
        },
        {
            ref: 'clientSearchTextField',
            selector: 'doventemanager #contenu #clientSearchTextField'
        },
        {
            ref: 'assuranceClient',
            selector: 'assuranceClient'
        },
        {
            ref: 'addBtnClientAssurance',
            selector: 'assuranceClient #addBtnClientAssurance'
        },
        {
            ref: 'gridClientAss',
            selector: 'assuranceClient [xtype=gridpanel]'
        },
        {
            ref: 'queryClientAssurance',
            selector: 'assuranceClient #queryClientAssurance'
        },
        {
            ref: 'ayantdroitView',
            selector: 'ayantdroiGrid'
        },
        {
            ref: 'ayantdroiGrid',
            selector: 'ayantdroiGrid [xtype=gridpanel]'
        },
        {
            ref: 'tpContainer',
            selector: 'doventemanager #contenu #tpContainer'
        },
        {
            ref: 'tpContainerForm',
            selector: 'doventemanager #contenu #tpContainer [xtype=form]'
        },
        {
            ref: 'nomAssure',
            selector: 'doventemanager #contenu #nomAssure'

        },
        {
            ref: 'prenomAssure',
            selector: 'doventemanager #contenu #prenomAssure'

        },
        {
            ref: 'numAssure',
            selector: 'doventemanager #contenu #numAssure'

        },
        {
            ref: 'nomAyantDroit',
            selector: 'doventemanager #contenu #nomAyantDroit'

        },
        {
            ref: 'prenomAyantDroit',
            selector: 'doventemanager #contenu #prenomAyantDroit'

        },
        {
            ref: 'numAyantDroit',
            selector: 'doventemanager #contenu #numAyantDroit'

        },
        {
            ref: 'assureContainer',
            selector: 'doventemanager #contenu #assureContainer'
        },
        {
            ref: 'assureCmp',
            selector: 'doventemanager #contenu #assureCmp'
        },
        {
            ref: 'ayantDroyCmp',
            selector: 'doventemanager #contenu #ayantDroyCmp'
        },
        {
            ref: 'tiersvo',
            selector: 'addaddclientwindow #tiersvo'
        },
        {
            ref: 'carnetVo',
            selector: 'addCarnetwindow #carnetVo'
        },
        {
            ref: 'medecinGrid',
            selector: 'medecin #medecinGrid'
        },
        {
            ref: 'nomMedecin',
            selector: 'medecin form textfield[name=nom]'
        },
        {
            ref: 'medecinform',
            selector: 'medecin form#medecinform'
        },
        {
            ref: 'btnAddNewMedecin',
            selector: 'medecin #btnAddNewMedecin'
        },
        {
            ref: 'btnRechercheMedecin',
            selector: 'medecin [xtype=grid] #btnRechercheMedecin'
        },
        {
            ref: 'queryMedecin',
            selector: 'medecin [xtype=grid] #queryMedecin'
        },
        {
            ref: 'btnNewMedecin',
            selector: 'medecin #btnNewMedecin'
        },
        {
            ref: 'btnCancelMedecin',
            selector: 'medecin #btnCancelMedecin'
        },

        {
            ref: 'btnCancelModeReglement',
            selector: 'reglementGrid #btnCancelModeReglement'
        }
    ],
    init: function () {
        this.control(
                {
                    'doventemanager': {
                        render: this.onReady
                    }, 'doventemanager #user': {
                        select: this.onUserSelect
                    },
                    'doventemanager #contenu [xtype=fieldcontainer] #qtyField': {
                        specialkey: this.onQtySpecialKey
                    },
                    'doventemanager #contenu #produitContainer [xtype=fieldcontainer] #produit': {
                        afterrender: this.produitCmpAfterRender,
                        select: this.produitSelect,
                        specialkey: this.onProduitSpecialKey
                    }
                    ,
                    'doventemanager #contenu #remise': {
                        select: this.updateRemise
                    },
                    'doventemanager #contenu [xtype=gridpanel] pagingtoolbar': {
                        beforechange: this.doBeforechangeVno
                    },
                    'doventemanager #contenu [xtype=gridpanel] #btnRecherche': {
                        click: this.refresh
                    },
                    'doventemanager #contenu [xtype=gridpanel] #query': {
                        specialkey: this.onSpecialSpecialKey
                    },
                    'doventemanager #contenu #montantRecu': {
                        change: this.montantRecuChangeListener,
                        specialkey: this.onMontantRecuVnoKey,
                        focus: this.montantRecuFocus
                    },
                    'doventemanager #contenu [xtype=gridpanel] [xtype=actioncolumn]': {
                        click: this.removeItemVno
                    }, 'doventemanager #contenu #typeReglement': {
                        select: this.typeReglementSelectEvent
                    },
                    'clientLambda #btnCancelLambda': {
                        click: this.closeClientLambdaWindow
                    },
                    'clientLambda #btnAddNewLambda': {
                        click: this.addClientForm
                    },

                    "clientLambda form textfield": {
                        specialkey: this.onClientLambdaSpecialKey
                    },
                    'clientLambda #btnNewLambda': {
                        click: this.registerNewClient
                    },
                    'clientLambda #btnRechercheLambda': {
                        click: this.queryClientLambda
                    },
                    'clientLambda #queryClientLambda': {
                        specialkey: this.onClientLambdaKey

                    },
                    'doventemanager #contenu [xtype=gridpanel]': {
                        edit: this.onGridEdit
                    },
                    'doventemanager #contenu [xtype=toolbar] #btnGoBack': {
                        click: this.goBack
                    },
                    'doventemanager #contenu [xtype=toolbar] #btnStandBy': {
                        click: this.putToStandBy
                    }, 'doventemanager #contenu [xtype=toolbar] #btnClosePrevente': {
                        click: this.closePrevente
                    },

                    'doventemanager #contenu [xtype=toolbar] #btnCloture': {
                        click: this.doCloture
                    },
                    'assuranceClient #btnCancelClient': {
                        click: this.onBtnCancelClient
                    },
                    'doventemanager #contenu #clientSearchTextField': {
                        specialkey: this.onClientSearchTextField
                    }
                    , 'assuranceClient #queryClientAssurance': {
                        specialkey: this.onQueryClientAssurance
                    }, 'assuranceClient [xtype=gridpanel] actioncolumn': {
                        click: this.onBtnClientAssuranceClick
                    }, 'assuranceClient [xtype=gridpanel]': {
                        selectionchange: this.onGridRowSelect
                    },
                    'doventemanager #contenu #btnModifierInfo': {
                        click: this.onbtnModifierInfo
                    }, 'doventemanager #contenu #btnModifierAyant': {
                        click: this.onbtnModifierAyantDroitInfo
                    }

                    , 'addaddclientwindow #btnCancelAssClient': {
                        click: this.onBtnCancelAssClient
                    },
                    'addaddclientwindow [xtype=grid] actioncolumn': {
                        click: this.onRemoveTierspayantCompl
                    },
                    'addaddclientwindow #btnAddClientAssurance': {
                        click: this.onBtnAddClientAssuranceClick
                    },
                    'addaddclientwindow #associertps': {
                        click: this.onAssociertpsClick
                    }, 'ayantdroiGrid #addBtnAyantDroit': {
                        click: this.createAyantDroitForm
                    }, 'ayantdroiGrid #btnCancelBtnAyantDroit': {
                        click: this.onBtnCancelBtnAyantDroit
                    },
                    'ayantdroiGrid [xtype=gridpanel]': {
                        selectionchange: this.onAyantDroitGridRowSelect
                    },
                    'ayantdroiGrid [xtype=gridpanel] actioncolumn': {
                        click: this.onBtnClientAyantDroitClick
                    },
                    'doventemanager #typeVente': {
                        select: this.onTypeVenteSelect
                    }
                    , 'addCarnetwindow #btnCancelAssClient': {
                        click: this.onBtnCancelCarnet
                    },
                    'addCarnetwindow #btnAddClientAssurance': {
                        click: this.onBtnAddClientCarnteClick
                    }, 'doventemanager #contenu [xtype=toolbar] #netBtn': {
                        click: this.onNetBtnClick
                    },

                    'medecin #btnCancelMedecin': {
                        click: this.closeMedecinWindow
                    },
                    'medecin #btnAddNewMedecin': {
                        click: this.addMedecinForm
                    },
                    'medecin #medecinGrid actioncolumn': {
                        click: this.btnAjouterMedecin
                    },
                    "medecin form textfield": {
                        specialkey: this.onMedecinSpecialKey
                    },
                    'medecin #btnNewMedecin': {
                        click: this.registerNewMedecin
                    },
                    'medecin #btnRechercheMedecin': {
                        click: this.queryMedecin
                    },
                    'medecin #queryMedecin': {
                        specialkey: this.onMedecinKey
                    }, 'reglementGrid [xtype=gridpanel]': {
                        selectionchange: this.onModeReglementGridRowSelect
                    },
                    'reglementGrid [xtype=gridpanel] actioncolumn': {
                        click: this.onBtnModeReglementClick
                    },
                    'reglementGrid #btnCancelModeReglement': {
                        click: this.onBtnCancelModeReglement
                    },
                    'clientLambda #lambdaClientGrid actioncolumn': {
                        click: this.btnAjouterClientLambda
                    }

                });
    },

    onReady: function () {
        const me = this;
        me.goToVenteView();
        me.cheickCaisse();
        me.checkModificationPrixU();
        me.checkShowStock();
        me.oncheckUg();
        me.checkSansBon();
        me.checkParamImpressionTicketCaisse();

    },
    cheickCaisse: function () {
        const me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/vente/cheick-caisse',
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.caisse = result.data;
                }
            }

        });
    },
    hideAssureContainer: function () {
        const me = this;
        let assureContainer = me.getAssureContainer(),
                ayantDroyCmp = me.getAyantDroyCmp(), montantTp = me.getMontantTp(), sansBon = me.getSansBon();
        if (assureContainer.isVisible()) {
            me.client = null;
            me.ayantDroit = null;
            me.updateAssurerResetCmp();
            if (ayantDroyCmp.isVisible()) {
                me.updateAyantDroitResetCmp();
            }
            assureContainer.hide();
        }
        montantTp.setValue(0);
        sansBon.setValue(false);
        montantTp.hide();
        sansBon.hide();
    },
    showAssureContainer: function (typevente) {
        const me = this;
        let assureContainer = me.getAssureContainer(), ayantDroyCmp = me.getAyantDroyCmp(),
                montantTp = me.getMontantTp(), sansBon = me.getSansBon();
        montantTp.show();
        sansBon.show();
        me.updateAssurerResetCmp();
        me.updateAyantDroitResetCmp();
        if (typevente === "2") {
            if (!assureContainer.isVisible()) {
                assureContainer.show();
            }
            if (!ayantDroyCmp.isVisible()) {
                ayantDroyCmp.show();
            }
        } else if (typevente === "3") {
            if (!assureContainer.isVisible()) {
                assureContainer.show();
            }
            if (ayantDroyCmp.isVisible()) {
                ayantDroyCmp.hide();
            }
        }
    },
    modifierTypeVente: function (newValue, venteId, field) {
        const me = this;
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/vente/modifiertypevente/' + venteId,
            params: Ext.JSON.encode({typeVenteId: newValue}),
            success: function (response, options) {
                progress.hide();
                const result = Ext.JSON.decode(response.responseText, true);
                const dataRetour = result.typeVenteId;
                if (result.success) {
                    me.showAssureContainer(dataRetour);
                    me.getClientSearchTextField().focus(true, 50);
                } else {
                    Ext.Msg.alert("Message", result.msg);

                }
                field.setValue(dataRetour);
                me.resetTitle(dataRetour);
            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert("Message", 'Un problème s\'est produit avec le server ' + response.status);
            }

        });

    },

    onTypeVenteSelect: function (field) {
        const me = this;
        const value = field.getValue();
        if (me.getCurrent()) {
            me.modifierTypeVente(value, me.getCurrent().lgPREENREGISTREMENTID, field);
        } else {
            me.client = null;
            me.ayantDroit = null;
            me.getTpContainerForm().removeAll();
            if (value === "1") {
                me.getMontantRecu().enable();
                me.getMontantRecu().setReadOnly(false);
                me.hideAssureContainer();
                me.getVnoproduitCombo().focus(true, 100);
            } else {
                me.showAssureContainer(value);
                me.getClientSearchTextField().focus(true, 50);
            }
            me.resetTitle(value);
        }
    },
    closeClientLambdaWindow: function () {
        const me = this;
        me.showAndHideInfosStandardClient(false);
        me.getClientLambda().destroy();
        if (!me.getClient()) {
            me.getTypeReglement().setValue('1');
        }
        me.getVnoproduitCombo().focus(true, 100);
    },
    addClientForm: function () {
        const me = this;
        me.getLambdaClientGrid().setVisible(false);
        me.getClientLambdaform().setVisible(true);
        me.getNomLambdaClient().focus(true, 100);
        me.getBtnNewLambda().enable();
    },
    produitCmpAfterRender: function (cmp) {
        cmp.focus();
    },

    produitSelect: function (cmp, record) {
        const me = this;
        let  typeVente = me.getTypeVenteCombo().getValue();
        if (typeVente !== '1') {
            const client = me.getClient();
            if (!client) {
                cmp.clearValue();
                Ext.MessageBox.show({
                    title: 'Message d\'erreur',
                    width: 550,
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
            }

        }
        const item = cmp.findRecord("lgFAMILLEID" || "intCIP", cmp.getValue());
        if (item) {
            const vnoemplacementId = me.getVnoemplacementField();
            me.updateStockField(item.get('intNUMBERAVAILABLE'));
            vnoemplacementId.setValue(item.get('strLIBELLEE'));
            me.getVnoqtyField().focus(true, 100);
        }

    },
    updateStockField: function (stock) {
        let me = this;
        if (me.getShowStock()) {
            let vnostockField = me.getVnostockField();
            vnostockField.setValue(stock);
        }

    },
    onUserSelect: function (cmp) {
        const me = this;
        let clientSearchBox = me.getClientSearchTextField(),
                typeVente = me.getTypeVenteCombo().getValue();
        if (typeVente === '1') {
            me.getVnoproduitCombo().focus(true, 100);
        } else {
            clientSearchBox.setValue('');
            clientSearchBox.focus(true, 50);
        }

    },
    onTypeRemiseSelect: function () {
        let me = this, combo = me.getVnotypeRemise(), remiseCombo = me.getVnoremise();
        let record = combo.getStore().findRecord('lgTYPEREMISEID', combo.getValue());
        remiseCombo.getStore().loadData(record.get('remises'));
        remiseCombo.focus(false, 100);
    },

    onComputeNet: function () {
        const me = this;
        const typeVente = me.getTypeVenteCombo().getValue();
        if (typeVente === '1') {
            me.showNetPaidVno();
        } else {
            me.showNetPaidAssurance();

        }
    },
    onNetBtnClick: function () {
        const me = this;
        me.onComputeNet();
    },
    checkDouchette(field) {
        let me = this;
        Ext.Ajax.request({
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/vente/findone/' + field.getValue(),
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    let produit = result.data;
                    let vnoemplacementId = me.getVnoemplacementField();
                    me.updateStockField(produit.intNUMBERAVAILABLE);
                    vnoemplacementId.setValue(produit.strLIBELLEE);
                    me.getVnoqtyField().focus(true, 100);
                } else {
                    field.focus(true, 100);
                }

            }

        });

    },
    onProduitSpecialKey: function (field, e) {
        const me = this;

        const typeVente = me.getTypeVenteCombo().getValue();
        if (typeVente !== '1') {
            let client = me.getClient();
            if (!client) {
                Ext.MessageBox.show({
                    title: 'Message d\'erreur',
                    width: 550,
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
            }

        }
        field.suspendEvents();
        let task = new Ext.util.DelayedTask(function (combo, e) {
            if (e.getKey() === e.ENTER) {
                if (combo.getValue() === null || combo.getValue().trim() === "") {
                    let selection = combo.getPicker().getSelectionModel().getSelection();
                    if (selection.length <= 0) {
                        me.onComputeNet();
                    }
                } else {
                    const record = combo.findRecord("lgFAMILLEID" || "intCIP", combo.getValue());
                    if (record) {
                        const vnoemplacementId = me.getVnoemplacementField();
                        me.updateStockField(record.get('intNUMBERAVAILABLE'));
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

    },
    onMontantRecuVnoKey: function (field, e, options) {
        let me = this;
        if (e.getKey() === e.ENTER) {
            let montantVerse = parseInt(field.getValue());
            if (montantVerse >= 0) {
                me.doCloture();

            } else {
                Ext.MessageBox.show({
                    title: 'Message',
                    width: 550,
                    msg: 'Veuillez saisir le montant à payer',
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING,
                    fn: function (buttonId) {
                        if (buttonId === "ok") {
                            field.focus(true, 50);
                        }
                    }
                });
            }

        }

    },
    onSpecialSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            const me = this;
            me.refresh();
        }
    },
    onQtySpecialKey: function (field, e, options) {
        if (field.getValue() > 0) {
            if (e.getKey() === e.ENTER) {
                let me = this;
                me.toRecalculate = true;
                let produitCmp = me.getVnoproduitCombo();
                let record = produitCmp.findRecord("lgFAMILLEID", produitCmp.getValue()),
                        typeVente = me.getTypeVenteCombo().getValue();
                record = record ? record : produitCmp.findRecord("intCIP", produitCmp.getValue());
                const vente = me.getCurrent();
                const isVno = (typeVente === '1') ? true : false;
                let url = vente ? '../api/v1/vente/add/item' : isVno ? '../api/v1/vente/add/vno' : '../api/v1/vente/add/assurance';
                if (record) {
                    const stock = parseInt(record.get('intNUMBERAVAILABLE'));
                    const boolDECONDITIONNE = parseInt(record.get('boolDECONDITIONNE'));
                    const lgFAMILLEID = record.get('lgFAMILLEPARENTID');
                    const qte = parseInt(field.getValue());
                    if (qte > 999) {
                        Ext.MessageBox.show({
                            title: 'Message d\'erreur',
                            width: 550,
                            msg: "Impossible de saisir une quantit&eacute; sup&eacute;rieure &agrave; 1000",
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.WARNING,
                            fn: function (buttonId) {
                                if (buttonId === "ok") {
                                    field.focus(true, 100);

                                }
                            }
                        });
                        return;
                    }
                    if (qte <= stock) {
                        if (isVno) {
                            me.addVenteVno(me.buildSaleParams(record, qte, typeVente), url, field, produitCmp);
                        } else {
                            me.addVenteAssuarnce(me.buildSaleParams(record, qte, typeVente), url, field, produitCmp);
                        }

                    } else if (qte > stock) {
                        if (boolDECONDITIONNE === 1) {
                            Ext.MessageBox.show({
                                title: 'Message d\'erreur',
                                width: 550,
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
                                                const result = Ext.JSON.decode(response.responseText, true);
                                                if (result.success) {
                                                    let produit = result.data;
                                                    let qtyDetail = produit.intNUMBERDETAIL,
                                                            nbreBoite = produit.intNUMBERAVAILABLE;
                                                    let stockParent = (nbreBoite * qtyDetail) + stock;
//
                                                    if (qte < stockParent) {
                                                        if (isVno) {
                                                            me.addVenteVno(me.buildSaleParams(record, qte, typeVente), url, field, produitCmp);
                                                        } else {
                                                            me.addVenteAssuarnce(me.buildSaleParams(record, qte, typeVente), url, field, produitCmp);
                                                        }
                                                    } else {

                                                        Ext.MessageBox.show({
                                                            title: 'Message d\'erreur',
                                                            width: 550,
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
                                                        width: 550,
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
                                        me.updateStockField(0);
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
                                    if ('yes' == button) {
                                        if (isVno) {
                                            me.addVenteVno(me.buildSaleParams(record, qte, typeVente), url, field, produitCmp);
                                        } else {
                                            me.addVenteAssuarnce(me.buildSaleParams(record, qte, typeVente), url, field, produitCmp);
                                        }

                                    } else if ('no' == button) {
                                        field.focus(true, 100, function () {
                                        });
                                    }
                                },
                                icon: Ext.MessageBox.QUESTION
                            });
                        }
                    }

                }
            }
        }
    },

    refresh: function () {
        const me = this;
        let vente = me.getCurrent();
        let venteId = null;
        if (vente) {
            venteId = vente.lgPREENREGISTREMENTID;
        }
        let query = me.getQueryField().getValue();
        let grid = me.getVnogrid();
        grid.getStore()
                .load(
                        {
                            params: {
                                venteId: venteId,
                                query: query,
                                statut: null
                            }
                            ,
                            callback: function (records, operation, successful) {
                                me.getVnoproduitCombo()
                                        .focus(true, 100);
                            }
                        }
                );
    },
    addVenteVno: function (data, url, field, comboxProduit) {
        const me = this;
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: url,
            params: Ext.JSON.encode(data),
            success: function (response, options) {
                progress.hide();
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.updateStockField(0);
                    me.getVnoemplacementField().setValue('');
                    me.current = result.data;
                    me.getTotalField().setValue(me.getCurrent().intPRICE);
                    field.setValue(1);
                    comboxProduit.clearValue();
                    comboxProduit.focus(true, 100, function () {
                    });
                    me.refresh();
                } else {
                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 550,
                        msg: result.msg,
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR,
                        fn: function (buttonId) {
                            if (buttonId === "ok") {
                                field.focus(true, 100, function () {
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
    },
    doBeforechangeVno: function (page, currentPage) {
        const me = this;
        let myProxy = me.getVnogrid().getStore().getProxy();
        let vente = me.getCurrent();
        let venteId = null;
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
        let me = this;
        me.refresh();
    },
    handleMontantField: function (montantNet) {
        let me = this, typeRegle = me.getVnotypeReglement().getValue();
        if (montantNet > 0 && (typeRegle === '1' || typeRegle === '4')) {
            me.getMontantRecu().setReadOnly(false);
        }
        if (typeRegle !== '1' && typeRegle !== '4') {
            me.getMontantRecu().setValue(montantNet);
        }
    },
    showNetPaidVno: function () {
        const me = this;
        let vente = me.getCurrent(), remiseId = me.getVnoremise().getValue();
        if (vente) {
            let venteId = vente.lgPREENREGISTREMENTID;
            let data = {"remiseId": remiseId, "venteId": venteId, "checkUg": me.getCheckUg()};
            let progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/vente/net/vno',
                params: Ext.JSON.encode(data),
                success: function (response, options) {
                    progress.hide();
                    const result = Ext.JSON.decode(response.responseText, true);
                    if (result.success) {
                        me.netAmountToPay = result.data;
                        me.toRecalculate = false;
                        let montantNet = me.getNetAmountToPay().montantNet;
                        me.getMontantNet().setValue(me.getNetAmountToPay().montantNet);
                        me.getVnomontantRemise().setValue(me.getNetAmountToPay().remise);
                        me.handleMontantField(montantNet);
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
    onbtncloturerVnoComptant: function (typeRegleId) {
        const me = this;
        let vente = me.getCurrent();
        let client = me.getClient();
        let clientId = null;
        let commentaire = '';
        const medecinId = me.getMedecinId();
        if (client) {
            clientId = client.get('lgCLIENTID');
            commentaire = me.getCommentaire().getValue();
        }
        let nom = "", banque = "", lieux = "";
        if (typeRegleId !== '1' && typeRegleId !== '4') {
            if (me.getRefCb()) {
                nom = me.getRefCb().getValue();
                banque = me.getBanque().getValue();
                lieux = me.getLieuxBanque().getValue();
            }
        }

        if (vente) {
            let venteId = vente.lgPREENREGISTREMENTID;

            let data = me.getNetAmountToPay();
            let netTopay = data.montantNet;

            let typeVenteCombo = me.getTypeVenteCombo().getValue(),
                    remiseId = me.getVnoremise().getValue(),
                    natureCombo = me.getNatureCombo().getValue(),
                    userCombo = me.getUserCombo().getValue(),
                    montantRecu = me.getMontantRecu().getValue();
            let montantExtra = 0;
            const montantExtraCmp = me.getMontantExtra();
            if (!montantExtraCmp?.hidden) {
                montantExtra = parseInt(montantExtraCmp.getValue());

            }
            montantRecu += montantExtra;
            if (typeRegleId === '1' && parseInt(montantRecu) < parseInt(netTopay)) {
                me.handleExtraModePayment(netTopay);

                return false;
            } else if (typeRegleId === '6' || typeRegleId === '3' || typeRegleId === '2') {
                montantRecu = netTopay;
            }

            let montantRemis = (montantRecu > netTopay) ? montantRecu - netTopay : 0;
            let totalRecap = data.montant;
            let montantPaye = montantRecu - montantRemis;
            let param = {
                "typeVenteId": typeVenteCombo,
                "natureVenteId": natureCombo,
                "devis": false,
                "remiseId": remiseId,
                "venteId": venteId,
                "userVendeurId": userCombo,
                "montantRecu": montantRecu,
                "montantRemis": montantRemis,
                "montantPaye": montantPaye,
                "totalRecap": totalRecap,
                "partTP": 0,
                "typeRegleId": typeRegleId,
                "clientId": clientId,
                "nom": nom,
                "commentaire": commentaire,
                "banque": banque,
                "lieux": lieux,
                "marge": data.marge,
                "medecinId": medecinId,
                "data": data,
                "reglements": me.buildModeReglements(typeRegleId, netTopay)
            };
            if (me.getExtraModeReglementId()) {
                if (Ext.isEmpty(client)) {
                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 550,
                        msg: 'Vous devez ajouter un client à la vente pour continuer',
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR,
                        fn: function (buttonId) {
                            if (buttonId === "ok") {
                                me.showAndHideInfosStandardClient(true);
                            }
                        }
                    });
                } else {
                    me.closeVenteVno(param, montantRemis, typeVenteCombo);
                }

            } else {
                me.closeVenteVno(param, montantRemis, typeVenteCombo);
            }

        }
    },
    closeVenteVno: function (param, montantRemis, typeVenteCombo) {
        const me = this;
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/vente/cloturer/vno',
            params: Ext.JSON.encode(param),
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                progress.hide();
                if (result.success) {
                    if (!me.getTicketCaisse()) {
                        me.onPrintTicket(param, typeVenteCombo);
                        me.resetAll(montantRemis);
                        me.getVnoproduitCombo().focus(false, 100, function () {
                        });
                    } else {
                        Ext.MessageBox.show({
                            title: 'Impression du ticket',
                            msg: 'Voulez-vous imprimer le ticket ?',
                            buttons: Ext.MessageBox.YESNO,
                            fn: function (button) {
                                if ('yes' == button) {
                                    me.onPrintTicket(param, typeVenteCombo);
                                }
                                me.resetAll(montantRemis);
                                me.getVnoproduitCombo().focus(false, 100, function () {
                                });
                            },
                            icon: Ext.MessageBox.QUESTION
                        });
                    }


                } else {
                    let codeError = result.codeError;
                    //il faut ajouter un medecin à la vente 
                    if (codeError === 1) {
                        me.showMedicinWindow();
                    } else if (codeError === 2) {

                        me.getInfosClientStandard().show();
                        const win = Ext.create('testextjs.view.vente.user.ClientLambda');
                        win.add(me.buildLambdaClientGrid());
                        win.show();


                    } else {
                        Ext.MessageBox.show({
                            title: 'Message d\'erreur',
                            width: 550,
                            msg: result.msg,
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.ERROR,
                            fn: function (buttonId) {
                                if (buttonId === "ok") {
                                    me.getMontantRecu().focus(true, 100);
                                }
                            }
                        });
                    }
                }

            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert("Message", 'Erreur du serveur ' + response.status);
            }

        });
    },
    handleMobileMoney: function () {
        const me = this;
        me.getCbContainer().hide();
        if (Ext.isEmpty(me.getClient())) {
            me.showAndHideInfosStandardClient(true);
        }
        if (me.getNetAmountToPay()) {
            me.getMontantRecu().setValue(me.getNetAmountToPay().montantNet);
        }
        me.getMontantRecu().setReadOnly(true);
    },
    showAndHideCbInfos: function (v) {
        const me = this;
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
    showAndHideInfosStandardClient: function (showOrHide) {
        const me = this;
        if (showOrHide) {
            me.getInfosClientStandard().show();
            if (!me.getClient()) {
                const win = Ext.create('testextjs.view.vente.user.ClientLambda');
                win.add(me.buildLambdaClientGrid());
                win.show();

            }

        } else {
            if (!me.getClient())
                me.getInfosClientStandard().hide();
        }


    }
    ,
    removeItemVno: function (grid, rowIndex, colIndex) {
        const me = this;
        me.toRecalculate = true;
        let record = grid.getStore().getAt(colIndex);
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/vente/remove/vno/item/' + record.get('lgPREENREGISTREMENTDETAILID'),
            success: function (response, options) {
                progress.hide();
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.netAmountToPay = result.data;
                    me.getTotalField().setValue(me.getNetAmountToPay().montant);
                    me.getMontantNet().setValue(me.getNetAmountToPay().montantNet);
                    me.getVnomontantRemise().setValue(me.getNetAmountToPay().remise);
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
    typeReglementSelectEvent: function (field) {
        const me = this;
        me.resetExtraModeCmp();
        const value = field.getValue().trim();
        if (value === '1') {
            me.getMontantRecu().enable();
            me.getMontantRecu().setReadOnly(false);
            me.showAndHideCbInfos(value);

        } else if (value === '4') {
            me.getMontantRecu().enable();
            me.showAndHideInfosStandardClient(true);
            me.getMontantRecu().setReadOnly(false);
            me.getCbContainer().hide();
        } else if (value === '7' || value === '8' || value === '9' || value === '10') {
            me.handleMobileMoney();
        } else {
            if (value === '2' || value === '3' || value === '6') {
                me.showAndHideInfosStandardClient(true);
                me.showAndHideCbInfos(value);
                if (me.getNetAmountToPay()) {
                    me.getMontantRecu().setValue(me.getNetAmountToPay().montantNet);
                }
                me.getMontantRecu().disable();

            } else {
                me.getMontantRecu().setValue(0);
                me.getMontantRecu().setReadOnly(false);
                me.getMontantRecu().focus(true);
            }

        }
    }
    ,
    montantRecuChangeListener: function (field, value, options) {
        const me = this, typeRegle = me.getVnotypeReglement().getValue();
        const montantRecu = parseInt(field.getValue());
        const data = me.getNetAmountToPay();
        if (me.getExtraModeReglementId()) {
            me.handleExtraAmountInputValue();
            const montantExtra = me.getMontantExtra();
            let montantExtraValue = 0;
            if (montantExtra) {
                montantExtraValue = parseInt(montantExtra.getValue());
            }
            const totalSaisie = montantRecu + montantExtraValue;
            me.montantRecuHandler(me, typeRegle, totalSaisie, data);
        } else {
            me.montantRecuHandler(me, typeRegle, montantRecu, data);
        }

    },
    montantRecuHandler: function (me, typeRegle, montantRecu, data) {

        let vnomontantRemise = me.getMonnaie();

        let monnais = 0;
        if (montantRecu > 0) {
            let netTopay = data.montantNet;
            me.getVnobtnCloture().enable();
            monnais = (montantRecu > netTopay) ? montantRecu - netTopay : 0;
            vnomontantRemise.setValue(monnais);
        } else if (montantRecu === 0) {
            vnomontantRemise.setValue(0);
            if (typeRegle === '4') {
                me.getVnobtnCloture().enable();
            } else {
                me.getVnobtnCloture().disable();
            }

        }
    }
    ,
    updateRemise: function (cmp) {
        const me = this;
        let vente = me.getCurrent(), remiseId = cmp.getValue();
        if (vente) {
            let venteId = vente.lgPREENREGISTREMENTID;
            let data = {"remiseId": remiseId, "venteId": venteId};
            const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/vente/remise',
                params: Ext.JSON.encode(data),
                success: function (response, options) {
                    progress.hide();
                    me.toRecalculate = true;
                    const result = Ext.JSON.decode(response.responseText, true);
                    if (result.success) {
                        me.getVnoproduitCombo()
                                .focus(false, 100, function () {
                                });
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
        const me = this;
        me.getClientLambdaform().setVisible(false);
        return  {

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
                    header: 'E-mail',
                    dataIndex: 'email',
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

    },
    updateClientStandard: function (record) {
        const me = this;
        me.client = record;
        me.getNomClient().setValue(record.get('strFIRSTNAME'));
        me.getPrenomClient().setValue(record.get('strLASTNAME'));
        me.getTelephoneClient().setValue(record.get('strADRESSE'));
        me.closeClientLambdaWindow();
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        me.updateVenteClient(record.get('lgCLIENTID'), progress);
    },
    btnAjouterClientLambda: function (grid, rowIndex, colIndex) {
        const me = this;
        const record = grid.getStore().getAt(colIndex);
        me.updateClientStandard(record);
        me.client = record;

    },
    onClientLambdaSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            const me = this;
            me.registerNewClient();
        }

    },
    updateClientLambdInfos: function () {
        const me = this;
        const client = me.getClient();
        me.getNomClient().setValue(client.get('strFIRSTNAME'));
        me.getPrenomClient().setValue(client.get('strLASTNAME'));
        me.getTelephoneClient().setValue(client.get('strADRESSE'));
    },
    updateVenteClient: function (clientId, progress) {
        const me = this;
        let venteId = me.getCurrent().lgPREENREGISTREMENTID;
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/vente/update/client',
            params: Ext.JSON.encode({
                "clientId": clientId, "venteId": venteId
            }),
            success: function (response, options) {
                progress.hide();
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.getVnoproduitCombo().focus(true, 100);

                } else {

                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 550,
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
    },
    registerNewClient: function () {
        const me = this, form = me.getClientLambdaform();
        if (form.isValid()) {
            const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/client/add/lambda',
                params: Ext.JSON.encode(form.getValues()),
                success: function (response, options) {
                    const result = Ext.JSON.decode(response.responseText, true);
                    if (result.success) {
                        let clientData = result.data;
                        me.client = new testextjs.model.caisse.ClientLambda(clientData);
                        me.updateClientLambdInfos();
                        me.closeClientLambdaWindow();
                        me.updateVenteClient(clientData.lgCLIENTID, progress);

                    } else {
                        progress.hide();
                        Ext.MessageBox.show({
                            title: 'Message d\'erreur',
                            width: 550,
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
        const me = this, query = me.getQueryClientLambda().getValue();
        if (query && query.trim() !== "") {
            me.getLambdaClientGrid().getStore().load({
                params: {
                    query: query
                }
            });
        }
    },
    onClientLambdaKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            if (field.getValue() && field.getValue().trim() !== "") {
                const me = this;
                me.queryClientLambda();
            }
        }
    },
    updateventeOngrid: function (editor, e, url, params) {
        const me = this;
        let record = e.record;
        let stock = parseInt(record.get('intNUMBERAVAILABLE'));
        let boolDECONDITIONNE = parseInt(record.get('boolDECONDITIONNE'));
        let lgFAMILLEID = record.get('lgFAMILLEPARENTID');
        let qte = parseInt(record.get('intQUANTITY'));
        if (boolDECONDITIONNE === 1 && stock < qte) {
            Ext.MessageBox.show({
                title: 'Message d\'erreur',
                width: 550,
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
                                let result = Ext.JSON.decode(response.responseText, true);
                                if (result.success) {
                                    let produit = result.data;
                                    let qtyDetail = produit.intNUMBERDETAIL, nbreBoite = produit.intNUMBERAVAILABLE;
                                    let stockParent = (nbreBoite * qtyDetail) + stock;
                                    if (qte < stockParent) {
                                        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                                        Ext.Ajax.request({
                                            method: 'POST',
                                            headers: {'Content-Type': 'application/json'},
                                            url: url,
                                            params: Ext.JSON.encode(params),
                                            success: function (response, options) {
                                                me.toRecalculate = true;
                                                progress.hide();
                                                editor.cancelEdit();
                                                e.record.commit();
                                                let result0 = Ext.JSON.decode(response.responseText, true);
                                                if (result0.success) {
                                                    me.current = result0.data;
                                                    me.getTotalField().setValue(me.getCurrent().intPRICE);

                                                    if (e.field === 'intQUANTITYSERVED' && (parseInt(record.get('intQUANTITYSERVED')) < parseInt(record.get('intQUANTITY')))) {
                                                        if (!me.getClient()) {
                                                            me.showAndHideInfosStandardClient(true);
                                                        }
                                                    }
                                                    me.refresh();
                                                }
                                            },
                                            failure: function (response, options) {
                                                me.toRecalculate = true;
                                                editor.cancelEdit();
                                                e.record.commit();
                                                progress.hide();
                                                Ext.Msg.alert("Message", "L'opération a échoué " + response.status);
                                            }

                                        });
                                    } else {

                                        Ext.MessageBox.show({
                                            title: 'Message d\'erreur',
                                            width: 550,
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
                                        width: 550,
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
                        const comboxProduit = me.getVnoproduitCombo();
                        comboxProduit.clearValue();
                        comboxProduit.setValue(null);
                        me.updateStockField(0);
                        me.getVnoemplacementField().setValue('');
                        me.refresh();


                    }
                }
            });

        } else {
            me.toRecalculate = true;
            const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: url,
                params: Ext.JSON.encode(params),
                success: function (response, options) {
                    progress.hide();
                    e.record.commit();
                    let result = Ext.JSON.decode(response.responseText, true);
                    if (result.success) {
                        me.current = result.data;

                        me.getTotalField().setValue(me.getCurrent().intPRICE);

                        if (e.field === 'intQUANTITYSERVED' && (parseInt(record.get('intQUANTITYSERVED')) < parseInt(record.get('intQUANTITY')))) {
                            if (!me.getClient()) {
                                me.showAndHideInfosStandardClient(true);
                            }
                        }
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
        }


    },
    onGridEdit: function (editor, e) {
        const me = this;
        me.toRecalculate = true;
        let record = e.record;
        let params = {};
        let url = '../api/v1/vente/update/item/vno';
        let qteServie = record.get('intQUANTITYSERVED');
        if (e.field === 'intQUANTITY') {
            qteServie = record.get('intQUANTITY');
            params = {
                "itemId": record.get('lgPREENREGISTREMENTDETAILID'),
                "itemPu": record.get('intPRICEUNITAIR'),
                "qte": record.get('intQUANTITY'),
                "qteServie": qteServie,
                "produitId": record.get('lgFAMILLEID')
            };
            me.updateventeOngrid(editor, e, url, params);
        } else if (e.field === 'intQUANTITYSERVED') {
            if (parseInt(record.get('intQUANTITYSERVED')) > parseInt(record.get('intQUANTITY'))) {
                editor.cancelEdit();
                record.commit();
                me.refresh();
                Ext.MessageBox.show({
                    title: 'Message d\'erreur',
                    width: 550,
                    msg: 'La quantité servie ne peut pas être supérieure à la quantité demandée',
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.ERROR,
                    fn: function (buttonId) {

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
                me.updateventeOngrid(editor, e, url, params);

            }


        } else if (e.field === 'intPRICEUNITAIR') {
            if (!me.canModifyPu) {
                editor.cancelEdit();
                record.commit();
                me.refresh();
                Ext.MessageBox.show({
                    title: 'Message d\'erreur',
                    width: 550,
                    msg: "Vous n'êts pas autorisé à modifier le prix de vente",
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.ERROR,
                    fn: function (buttonId) {
                        if (buttonId === "ok") {
                            me.getVnoproduitCombo().focus(true, 100);

                        }
                    }
                });

            } else {
                params = {
                    "itemId": record.get('lgPREENREGISTREMENTDETAILID'),
                    "itemPu": record.get('intPRICEUNITAIR'),
                    "qte": record.get('intQUANTITY'),
                    "qteServie": qteServie,
                    "produitId": record.get('lgFAMILLEID')
                };
                me.updateventeOngrid(editor, e, url, params);

            }

        }

    },
    updateComboxFields: function (lgTYPEVENTEID, lgNATUREVENTEID, lgUSERVENDEURID, typeReglementId, lgREMISEID) {
        const me = this;
        me.getVnotypeReglement().getStore().load(function (records, operation, success) {
            if (typeReglementId) {
                me.getVnotypeReglement().setValue(typeReglementId);
            } else {
                me.getVnotypeReglement().setValue('1');
            }

        });
        let _typeVenteId = (lgTYPEVENTEID ? lgTYPEVENTEID : '1');
        let _natureVenteId = (lgNATUREVENTEID ? lgNATUREVENTEID : '1');
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
        if (lgREMISEID) {
            const remiseCombo = me.getVnoremise();
            remiseCombo.getStore().load(function (records, operation, success) {
                remiseCombo.setValue(lgREMISEID);
            });

        } else {
            me.getVnoremise().clearValue();
            me.getVnoremise().setValue(null);
        }
    },
    updateAmountFields: function (montantNet, remise, total) {
        const me = this;
        me.getMontantNet().setValue(montantNet);
        me.getVnomontantRemise().setValue(remise);
        me.getTotalField().setValue(total);
    },

    goBack: function () {
        const me = this;
        me.resetAll();
        let xtype = 'cloturerventemanager';
        if (me.getCategorie() === 'PREVENTE') {
            xtype = 'preenregistrementmanager';
        }
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
    },
    loadClientAssurance: function (clientData, lgTYPEVENTEID, ayantDroit) {
        const me = this;
        me.client = new testextjs.model.caisse.ClientAssurance(clientData);
        me.showAssureContainer(lgTYPEVENTEID);
        me.buildtierspayantContainer();
        me.updateAssurerCmp();
        me.ayantDroit = ayantDroit;
        if (lgTYPEVENTEID === '2') {
            if (ayantDroit) {
                me.getNomAyantDroit().setValue(ayantDroit.strFIRSTNAME);
                me.getPrenomAyantDroit().setValue(ayantDroit.strLASTNAME);
                me.getNumAyantDroit().setValue(ayantDroit.strNUMEROSECURITESOCIAL);
            } else {
                me.updateAyantDroitCmp();
            }
        }

    },
    getTypeReglementToDisplay: function (reglements) {
        if (reglements && reglements.length > 0) {
            if (reglements.length === 1) {
                return reglements[0].typeReglement;
            } else {
                const hasCach = reglements.find((e) => e.typeReglement === "1");
                if (hasCach) {
                    return '1';
                } else {
                    return reglements[0].typeReglement;
                }
            }
        } else {
            return '1';
        }
    },
    loadVenteData: function (venteId) {
        const me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ventestats/' + venteId,
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    let record = result.data;
                    let lgTYPEVENTEID = record.lgTYPEVENTEID, lgREMISEID = record.lgREMISEID,
                            lgUSERVENDEURID = record.lgUSERVENDEURID;
                    let lgNATUREVENTEID = record.lgNATUREVENTEID, intPRICEREMISE = record.intPRICEREMISE,
                            intPRICE = record.intPRICE,
                            ayantDroit = record.ayantDroit, client = record.client;
                    const reglements = record.reglements;
                    me.current = {
                        'intPRICE': record.intPRICE,
                        'lgPREENREGISTREMENTID': record.lgPREENREGISTREMENTID
                    };
                    me.netAmountToPay = null;
                    me.ayantDroit = ayantDroit;
                    me.updateComboxFields(lgTYPEVENTEID, lgNATUREVENTEID, lgUSERVENDEURID, me.getTypeReglementToDisplay(reglements), lgREMISEID);
                    me.updateAmountFields((parseInt(intPRICE) - parseInt(intPRICEREMISE)), intPRICEREMISE, intPRICE);
                    if (lgTYPEVENTEID === '2' || lgTYPEVENTEID === '3') {
                        me.loadClientAssurance(client, lgTYPEVENTEID, ayantDroit);
                    }
                    if (lgTYPEVENTEID === '1' && client) {
                        me.client = new testextjs.model.caisse.ClientLambda(record.client);
                        me.updateClientLambdInfos();
                        me.showAndHideInfosStandardClient(true);
                    }
                    me.refresh();


                }

            }
        });

    },
    loadExistantSale: function (venteId) {
        const me = this, contenu = me.getContenu();
        contenu.removeAll();
        const vno = Ext.create('testextjs.view.vente.VenteVNO');
        contenu.add(vno);
        me.loadVenteData(venteId);
    },
    resetTitle: function (typeVente) {
        const me = this;
        if (typeVente) {
            if (typeVente === '1') {
                me.getDoventemanager().setTitle('VENTE AU COMPTANT');
            } else if (typeVente === '2') {
                me.getDoventemanager().setTitle('VENTE ASSURANCE');
            } else if (typeVente === '3') {
                me.getDoventemanager().setTitle('VENTE CARNET');
            }
        } else {
            me.getDoventemanager().setTitle('VENTE AU COMPTANT');

        }


    },
    chargerCopieDeVenteAmodifier: function (venteId) {
        const me = this;
        Ext.Ajax.request({
            method: 'PUT',
            url: '../api/v1/vente/modifier-vente-terme/' + venteId,
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    const record = result.data;
                    me.loadExistantSale(record.lgPREENREGISTREMENTID);
                }

            }
        });

    },

    goToVenteView: function () {
        const me = this, view = me.getDoventemanager(), contenu = me.getContenu();
        const data = view.getData();
        if (data) {
            const isEdit = data.isEdit;
            me.categorie = data.categorie;
            if (isEdit && me.getCategorie() === 'VENTE') {
                const record = data.record;
                me.loadExistantSale(record.lgPREENREGISTREMENTID);
            } else if (me.getCategorie() === 'PREVENTE' && !isEdit) {
                me.current = null;
                me.netAmountToPay = null;
                me.client = null;
                contenu.removeAll();
                const vno = Ext.create('testextjs.view.vente.VenteVNO');
                contenu.add(vno);
                me.componentsToHidePresales();
                me.updateComboxFields(null, null, null, null, null);
                me.getVnobtnCloture().hide();
                if (me.getCategorie() === 'PREVENTE') {
                    me.getBtnClosePrevente().show();
                }
            } else if (isEdit && me.getCategorie() === 'PREVENTE') {
                const record = data.record;
                me.loadExistantSale(record.lgPREENREGISTREMENTID);
                me.componentsToHidePresales();
                me.getVnobtnCloture().hide();
                if (me.getCategorie() === 'PREVENTE') {
                    me.getBtnClosePrevente().show();
                }


            } else if (isEdit && me.getCategorie() === 'COPY') {
                const record = data.record;
                me.chargerCopieDeVenteAmodifier(record.lgPREENREGISTREMENTID);


            } else {
                me.current = null;
                me.netAmountToPay = null;
                me.client = null;
                contenu.removeAll();
                const vno = Ext.create('testextjs.view.vente.VenteVNO');
                contenu.add(vno);
                me.updateComboxFields(null, null, null, null, null);
            }
        } else {
            me.current = null;
            me.netAmountToPay = null;
            me.client = null;
            contenu.removeAll();
            const vno = Ext.create('testextjs.view.vente.VenteVNO');
            contenu.add(vno);
            me.updateComboxFields(null, null, null, null, null);
        }
    },
    componentsToHidePresales: function () {
        const me = this, typeRegle = me.getVnotypeReglement(), encaissement = me.getEncaissement();
        typeRegle.hide();
        encaissement.hide();

    },

    checkSansBon: function () {
        let me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/common/vente-sansbon',
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.venteSansBon = result.data;
                }
            }

        });
    },
    checkModificationPrixU: function () {
        let me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/common/autorisation-prix-vente',
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.canModifyPu = result.data;
                }
            }

        });
    },
    checkShowStock: function () {
        let me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/common/autorisations/showstock',
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.showStock = result.data;
                }
            }

        });
    },

    onPrintTicketCopy: function (id) {
        let url = '../api/v1/vente/copy/' + id;
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            headers: {'Content-Type': 'application/json'},
            method: 'POST',
            url: url,
            success: function (response, options) {
                progress.hide();

            },
            failure: function (response, options) {
                progress.hide();
            }

        });
    },
    onPrintTicket: function (params, typeVenteCombo) {
        const me = this;
        let url = (typeVenteCombo === '1' ? '../api/v1/vente/ticket/vno' : '../api/v1/vente/ticket/vo');
        Ext.Ajax.request({
            headers: {'Content-Type': 'application/json'},
            method: 'POST',
            url: url,
            params: Ext.JSON.encode(params),
            success: function (response, options) {

                me.getVnoproduitCombo()
                        .focus(true, 100);
            },
            failure: function (response, options) {
                me.getVnoproduitCombo()
                        .focus(true, 100);
            }

        });
    },
    resetAll: function (montantRemis) {
        const me = this;
        me.current = null;
        me.resetExtraModeCmp();
        if (montantRemis !== undefined) {
            me.getDernierMonnaie().setValue(montantRemis);
        }
        me.getMontantRecu().enable();
        me.getMontantRecu().setReadOnly(false);
        me.getVnogrid().getStore().loadPage(1, {
            params: {
                venteId: null,
                query: null,
                statut: null
            }
        });
        me.netAmountToPay = null;

        me.client = null;
        me.ayantDroit = null;
        me.ancienTierspayant = null;
        me.getMontantNet().setValue(0);
        me.getMonnaie().setValue(0);
        me.getVnomontantRemise().setValue(0);
        me.getTotalField().setValue(0);
        me.getMontantRecu().setValue(0);
        me.getUserCombo().clearValue();
        me.getUserCombo().setValue(null);
        me.getVnobtnCloture().enable();
        if (me.getInfosClientStandard().isVisible()) {
            me.resetClientLambdaInfos();
        }
        if (me.getCbContainer().isVisible()) {
            me.resetCbCompoent();
        }
        me.getTpContainerForm().removeAll();
        me.hideAssureContainer();
        me.updateComboxFields(null, null, null, null, null);
        me.resetTitle(null);
        me.toRecalculate = true;

    },
    resetClientLambdaInfos: function () {
        const me = this;
        me.client = null;
        me.getNomClient().setValue('');
        me.getPrenomClient().setValue('');
        me.getTelephoneClient().setValue('');
        me.getCommentaire().setValue('');
        me.getInfosClientStandard().hide();
        me.toRecalculate = true;
    },
    resetCbCompoent: function () {
        const me = this;
        me.getRefCb().setValue('');
        me.getBanque().setValue('');
        me.getLieuxBanque().setValue('');
        me.getCbContainer().hide();
        me.toRecalculate = true;
    },
    restetRemiseCmb: function (lgREMISEID) {
        const me = this;
        if (lgREMISEID) {
            const remiseCombo = me.getVnoremise();
            remiseCombo.getStore().load(function (records, operation, success) {
                remiseCombo.setValue(lgREMISEID);
            });

        } else {
            me.getVnoremise().clearValue();
            me.getVnoremise().setValue(null);
        }
    },
    onClientSearchTextField: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            const me = this;
            let current = me.getCurrent();
            if (field.getValue() && field.getValue().trim() !== '') {
                if (current) {
                    Ext.Ajax.request({
                        method: 'PUT',
                        headers: {'Content-Type': 'application/json'},
                        url: '../api/v1/vente/retmoveClient/' + current.lgPREENREGISTREMENTID,
                        success: function (response, options) {
                        }
                    });
                    me.getMontantRecu().enable();
                    me.getMontantRecu().setReadOnly(false);

                }
                me.client = null;
                me.restetRemiseCmb(null);
                me.updateAssurerResetCmp();
                me.updateAyantDroitResetCmp();
                let tpContainerForm = me.getTpContainerForm();
                tpContainerForm.removeAll();
                me.loadAssuranceClient(field.getValue());
                field.setValue('');

            }
            field.setValue('');
        }
    },
    onQueryClientAssurance: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            const me = this, grid = me.getGridClientAss();
            let typeVenteId = me.getTypeVenteCombo().getValue();
            let typeClientId = '';
            if (typeVenteId === '2') {
                typeClientId = '1';
            } else if (typeVenteId === '3') {
                typeClientId = '2';
            }
            if (field.getValue() && field.getValue().trim() !== '') {
                grid.getStore().load({
                    params: {
                        'query': field.getValue(),
                        'typeClientId': typeClientId
                    }
                });
            }
        }
    },
    loadAssuranceClient: function (queryString) {
        const me = this;
        const typeVenteId = me.getTypeVenteCombo().getValue();
        if (typeVenteId === "1") {
            return false;
        }
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        let clientStore = Ext.create('testextjs.store.caisse.RechercheClientAss');
        let typeClientId = '';
        if (typeVenteId === '2') {
            typeClientId = '1';
        } else if (typeVenteId === '3') {
            typeClientId = '2';
        }
        clientStore.load(
                {
                    params: {
                        'query': queryString,
                        'typeClientId': typeClientId
                    },
                    callback: function (records, operation, successful) {
                        progress.hide();
                        if (successful) {
                            if (records.length > 1) {
                                Ext.create('testextjs.view.vente.user.ClientGrid', {data: clientStore}).show();
                            } else if (records.length === 1) {
                                me.client = records[0];
                                me.onSelectClientAssurance();
                            } else {
                                Ext.MessageBox.show({
                                    title: 'INFOS',
                                    msg: 'Voulez-vous ajouter un nouveau client ?',
                                    buttons: Ext.MessageBox.YESNO,
                                    fn: function (button) {
                                        if ('yes' == button) {
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
        const me = this;
        me.getAssuranceClient().destroy();
        me.getClientSearchTextField().setValue('');
    },
    onGridRowSelect: function (g, record) {
        const me = this;
        me.client = record[0];
        me.onSelectClientAssurance();
        me.onBtnCancelClient();
    },
    updateCurrentVenteClientData: function (client, tierspayant) {
        const me = this;
        const current = me.getCurrent();
        let ayantDroitId = null;

        const ayantDroits = client.get('ayantDroits');
        Ext.each(ayantDroits, function (item) {
            if (client.get('strNUMEROSECURITESOCIAL') === item.strNUMEROSECURITESOCIAL) {
                ayantDroitId = item.lgAYANTSDROITSID;
            }

        });

        const datas = {
            tierspayants: [tierspayant],
            clientId: client.get('lgCLIENTID'),
            ayantDroitId: ayantDroitId
        };
        Ext.Ajax.request({
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/vente/client/' + current.lgPREENREGISTREMENTID,
            params: Ext.JSON.encode(datas),
            success: function (response, options) {
            }
        });
    },

    onSelectClientAssurance: function () {
        const me = this;
        const typeVenteId = me.getTypeVenteCombo().getValue();
        const client = me.getClient();
        if (client) {
            const tierspayants = client.get('tiersPayants');
            if (me.getCurrent()) {
                me.updateCurrentVenteClientData(client, tierspayants[0]);
            }
            me.updateAssurerResetCmp();
            me.updateAyantDroitResetCmp();
            me.updateAssurerCmp();
            if (typeVenteId === '2') {
                me.updateAyantDroitCmp();
                me.addTpCmp(tierspayants[0]);
                me.buildBtnAddTierspayant();
            } else {
                me.addTpCmp(tierspayants[0]);
                me.restetRemiseCmb(client.get('remiseId'));
            }

        }
    },

    onNewClientAssurance: function () {
        const me = this;
        let client = me.getClient();
        if (client) {
            const tierspayants = client.get('tiersPayants');
            me.updateAssurerCmp();
            me.updateAyantDroitCmp();
            me.addTpCmp(tierspayants[0]);
            me.buildBtnAddTierspayant();
        }

    },
    onClientAssuranceUpdate: function () {
        const me = this;
        const client = me.getClient();
        if (client) {
            const tierspayants = client.get('tiersPayants');
            me.updateAssurerCmp();
            me.addTpCmp(tierspayants[0]);
        }

    },
    updateAssurerCmp: function () {
        const me = this;
        const client = me.getClient();
        if (client) {
            me.getNomAssure().setValue(client.get('strFIRSTNAME'));
            me.getPrenomAssure().setValue(client.get('strLASTNAME'));
            me.getNumAssure().setValue(client.get('strNUMEROSECURITESOCIAL'));
        }
    },
    updateAssurerResetCmp: function () {
        const me = this;
        me.getNomAssure().setValue('');
        me.getPrenomAssure().setValue('');
        me.getNumAssure().setValue('');
    },
    updateAyantDroitResetCmp: function () {
        const me = this;
        me.ayantDroit = null;
        me.getNomAyantDroit().setValue('');
        me.getPrenomAyantDroit().setValue('');
        me.getNumAyantDroit().setValue('');
    },
    updateAyantDroitCmp: function () {
        const me = this;
        const client = me.getClient();
        if (client) {
            let ayantDroits = client.get('ayantDroits'), ayantDroit = null;
            if (ayantDroits.length === 1) {
                ayantDroit = ayantDroits[0];
            } else {
                Ext.each(ayantDroits, function (item) {
                    if ((client.get('strNUMEROSECURITESOCIAL') === item.strNUMEROSECURITESOCIAL) || (client.get('strCODEINTERNE') === item.strCODEINTERNE)
                            || (client.get('fullName') === item.fullName)) {
                        ayantDroit = item;
                        return;
                    }
                });
            }
            me.ayantDroit = ayantDroit;
            if (ayantDroit) {
                me.getNomAyantDroit().setValue(ayantDroit.strFIRSTNAME);
                me.getPrenomAyantDroit().setValue(ayantDroit.strLASTNAME);
                me.getNumAyantDroit().setValue(ayantDroit.strNUMEROSECURITESOCIAL);
            }

        }
    },
    onBtnClientAssuranceClick: function (grid, rowIndex, colIndex) {
        const me = this;
        const record = grid.getStore().getAt(colIndex);
        me.client = record;
        me.onSelectClientAssurance();
        me.onBtnCancelClient();
    },
    addTpCmp: function (record) {
        let me = this, tpContainerForm = me.getTpContainerForm();
        tpContainerForm.removeAll();
        let cmp = me.buildCmp(record);
        tpContainerForm.add(cmp);
    },

    onbtnModifierInfo: function () {
        const me = this;
        let      typeVenteCombo = me.getTypeVenteCombo().getValue();
        let client = me.getClient();
        me.ancienTierspayant = client.get('lgTIERSPAYANTID');

        if (client) {
            let clientwin;
            if (typeVenteCombo === '2') {
                clientwin = Ext.create('testextjs.view.vente.user.addClientAssurance');
                me.getTpComplementaireGrid().getStore().load({
                    params: {"clientId": client.get('lgCLIENTID')}
                });
                me.getClientAssuranceForm().loadRecord(client);
                clientwin.show();
                me.getNomAssClient().focus(false, 50);
//                me.getTiersvo().setReadOnly(true);// Pour la modification du tiers payant à la vente , modifie le 22 02 2020
            } else if (typeVenteCombo === '3') {
                clientwin = Ext.create('testextjs.view.vente.user.AddCarnet');
                me.getClientCarnetForm().loadRecord(client);
                clientwin.show();
                me.getNomCarnetClient().focus(false, 100);
//                me.getCarnetVo().setReadOnly(true);//Pour la modification du tiers payant à la vente , modifie le 22 02 2020
            }
        }
    },
    onbtnClientAssurence: function () {
        let clientwin;
        let me = this,
                typeVenteCombo = me.getTypeVenteCombo().getValue();
        if (typeVenteCombo === '2') {
            clientwin = Ext.create('testextjs.view.vente.user.addClientAssurance');
            clientwin.show();
            me.getNomAssClient().focus(false, 100);
        } else if (typeVenteCombo === '3') {
            clientwin = Ext.create('testextjs.view.vente.user.AddCarnet');
            clientwin.show();
            me.getNomCarnetClient().focus(false, 50);
        }
    },
    onBtnCancelAssClient: function () {
        const me = this, addaddclientwindow = me.getAddaddclientwindow();
        addaddclientwindow.destroy();
    },
    onBtnCancelCarnet: function () {
        const me = this, addCarnetwindow = me.getAddCarnetwindow();
        addCarnetwindow.destroy();
    },
    onRemoveTierspayantCompl: function (grid, rowIndex, colIndex) {
        const me = this;
        const store = grid.getStore();
        store.removeAt(colIndex);
        me.toRecalculate = true;

    },
    onBtnAddClientAssuranceClick: function () {
        const me = this;
        let form = me.getClientAssuranceForm(), grid = me.getTpComplementaireGrid();
        me.toRecalculate = true;
        if (form.isValid()) {
            let client = form.getValues();
            let record = new testextjs.model.caisse.ClientAssurance(client);
            let tiersPayants = [];
            let storeTp = grid.getStore();

            if (storeTp.getRange()) {
                Ext.each(storeTp.getRange(), function (item) {
                    tiersPayants.push({
                        "compteTp": item.get('compteTp'),
                        "lgTIERSPAYANTID": item.get('lgTIERSPAYANTID'),
                        "numSecurity": item.get('numSecurity'),
                        "order": item.get('order'),
                        "taux": item.get('taux'),
                        "bIsAbsolute": item.get('bIsAbsolute'),
                        "dbPLAFONDENCOURS": item.get('dbPLAFONDENCOURS'),
                        "tpFullName": item.get('tpFullName')

                    });
                });
            }
            let datas = {
                "bIsAbsolute": record.get('bIsAbsolute'),
                "dbPLAFONDENCOURS": record.get('dbPLAFONDENCOURS'),
                "dblQUOTACONSOMENSUELLE": record.get('dblQUOTACONSOMENSUELLE'),
                "dtNAISSANCE": record.get('dtNAISSANCE'),
                "intPOURCENTAGE": record.get('intPOURCENTAGE'),
                "intPRIORITY": record.get('intPRIORITY'),
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
                "compteTp": record.get('compteTp'),
                "strNUMEROSECURITESOCIAL": record.get('strNUMEROSECURITESOCIAL'),
                "strSEXE": record.get('strSEXE'),
                "tiersPayants": tiersPayants
            };
            const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/client/add/assurance',
                params: Ext.JSON.encode(datas),
                success: function (response, options) {
                    progress.hide();
                    const result = Ext.JSON.decode(response.responseText, true);
                    if (result.success) {
                        me.onBtnCancelAssClient();
                        let recordR = new testextjs.model.caisse.ClientAssurance(result.data);
                        me.client = recordR;
                        if (me.getCurrent()) {
                            me.removetierspayanttp(me.getAncienTierspayant(), record.get('lgTIERSPAYANTID'));

                        } else {
                            me.onNewClientAssurance();
                        }

                    } else {
                        Ext.MessageBox.show({
                            title: 'Message d\'erreur',
                            width: 550,
                            msg: result.msg,
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.ERROR

                        });
                    }

                },
                failure: function (response, options) {
                    progress.hide();
                    Ext.Msg.alert("Message", 'Erreur du serveur ' + response.status);
                }

            });
        }

    },
    updateClientAssurance: function (clientData) {
        const me = this;
        me.client = new testextjs.model.caisse.ClientAssurance(clientData);
        me.getTpContainerForm().removeAll();
        me.buildtierspayantContainer();
        me.updateAssurerCmp();



    },
    removetierspayanttp: function (tpId, _newTp) {
        const me = this, current = me.getCurrent();
        me.toRecalculate = true;
        if (current) {
            Ext.Ajax.request({
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/vente/tp/' + current.lgPREENREGISTREMENTID,
                params: Ext.JSON.encode({"typeVenteId": tpId,
                    "ayantDroitId": _newTp}),
                success: function (response, options) {
                    const result = Ext.JSON.decode(response.responseText, true);
                    me.updateClientAssurance(result.data);
                }
            });
        }
    },

    onBtnAddClientCarnteClick: function () {
        const me = this;
        let    form = me.getClientCarnetForm();
        if (form.isValid()) {
            const client = form.getValues();
            const record = new testextjs.model.caisse.ClientAssurance(client);
            const pourcentage = parseInt(record.get('intPOURCENTAGE'));
            if (pourcentage !== 0 && pourcentage !== 100) {
                Ext.MessageBox.show({
                    title: 'Message d\'erreur',
                    width: 400,
                    msg: "Vous devez saisir 100 ou 0",
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.ERROR

                });
                return;
            }

            const datas = {
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
                "compteTp": record.get('compteTp'),
                "strNUMEROSECURITESOCIAL": record.get('strNUMEROSECURITESOCIAL'),
                "strSEXE": record.get('strSEXE'),
                "remiseId": record.get('remiseId')

            };
            const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/client/add/carnet',
                params: Ext.JSON.encode(datas),
                success: function (response, options) {
                    progress.hide();
                    const result = Ext.JSON.decode(response.responseText, true);
                    if (result.success) {
                        me.onBtnCancelCarnet();
                        let clientR = new testextjs.model.caisse.ClientAssurance(result.data);
                        me.client = clientR;
                        if (me.getCurrent()) {
                            if (me.getAncienTierspayant() && me.getAncienTierspayant() !== record.get('lgTIERSPAYANTID')) {
                                me.removetierspayanttp(me.getAncienTierspayant(), record.get('lgTIERSPAYANTID'));
                            }
                        }

                        me.onClientAssuranceUpdate();
                    } else {
                        Ext.MessageBox.show({
                            title: 'Message d\'erreur',
                            width: 550,
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
        }

    },
    onAssociertpsClick: function () {
        const me = this;
        let grid = me.getTpComplementaireGrid();
        if (grid.getStore().getCount() <= 3) {
            me.createForm();
        }
    },
    createForm: function () {
        const me = this;
        let grid = me.getTpComplementaireGrid();
        let tierspayantss = new Ext.data.Store({
            idProperty: 'lgTIERSPAYANTID',
            fields: [
                {name: 'lgTIERSPAYANTID', type: 'string'},
                {name: 'strFULLNAME', type: 'string'}
            ],
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/client/tiers-payants',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        let form = Ext.create('Ext.window.Window',
                {

                    autoShow: true,
                    height: 240,
                    width: '60%',
                    modal: true,
                    title: 'Associer tiers-payant',
                    closeAction: 'hide',
                    closable: false,
                    maximizable: false,
                    layout: {
                        type: 'fit'

                    },
                    dockedItems: [
                        {
                            xtype: 'toolbar',
                            dock: 'bottom',
                            ui: 'footer',
                            layout: {
                                pack: 'end',
                                type: 'hbox'
                            },
                            items: [
                                {
                                    xtype: 'button',
                                    text: 'Enregistrer',
                                    handler: function (btn) {
                                        let _this = btn.up('window'), _form = _this.down('form');
                                        if (_form.isValid()) {
                                            grid.getStore().add(_form.getValues());
                                            form.destroy();
                                        }

                                    }
                                },
                                {
                                    xtype: 'button',
                                    iconCls: 'cancelicon',
                                    handler: function (btn) {
                                        form.destroy();
                                    },
                                    text: 'Annuler'

                                }
                            ]
                        }
                    ],
                    items: [{
                            xtype: 'form',
                            bodyPadding: 5,
                            layout: {
                                type: 'fit'

                            },
                            items: [
                                {
                                    xtype: 'fieldset',
                                    layout: {
                                        type: 'vbox',
                                        align: 'stretch'
                                    },
                                    collapsible: false,
                                    title: 'Information tiers-payant complémentaires',
                                    items: [
                                        {
                                            xtype: 'fieldcontainer',
                                            flex: 1, bodyPadding: 5, margin: '0 0 10 0',
                                            layout: {type: 'hbox', align: 'stretch'},
                                            items: [
                                                {
                                                    xtype: 'combobox',
                                                    margin: '0 0 5 0',
                                                    fieldLabel: 'Tiers.Payant',
                                                    name: 'lgTIERSPAYANTID',
                                                    flex: 1,
                                                    minChars: 2,
                                                    forceSelection: true,
                                                    store: tierspayantss,
                                                    valueField: 'lgTIERSPAYANTID',
                                                    displayField: 'strFULLNAME',
                                                    typeAhead: false,
                                                    allowBlank: false,
                                                    queryMode: 'remote',
                                                    emptyText: 'Choisir un tierspayant...',
                                                    listeners: {
                                                        'select': function (cmp) {
                                                            let form = cmp.up('form');
                                                            let tpName = form.query('hiddenfield:first');
                                                            let record = cmp.findRecord("lgTIERSPAYANTID", cmp.getValue());
                                                            tpName[0].setValue(record.get('strFULLNAME'));
                                                        }
                                                    }
                                                }
                                                , {xtype: 'splitter'},
                                                {
                                                    xtype: 'textfield',
                                                    fieldLabel: 'Matricule/SS',
                                                    margin: '0 0 5 0',
                                                    emptyText: 'Numéro de matricule ',
                                                    name: 'numSecurity',
                                                    flex: 1,
                                                    enableKeyEvents: true
                                                },
                                                {
                                                    xtype: 'hiddenfield',
                                                    name: 'tpFullName'
                                                },
                                                {
                                                    xtype: 'hiddenfield',
                                                    name: 'canRemove',
                                                    value: 1
                                                }

                                            ]
                                        },
                                        {
                                            xtype: 'fieldcontainer',
                                            flex: 1, bodyPadding: 5, margin: '0 0 10 0',
                                            layout: {type: 'hbox', align: 'stretch'},
                                            items: [
                                                {
                                                    xtype: 'numberfield',
                                                    flex: 1,
                                                    fieldLabel: 'Pourcentage',
                                                    margin: '0 0 5 0',
                                                    allowDecimals: false,
                                                    hideTrigger: true,
                                                    allowBlank: false,
                                                    name: 'taux', minValue: 0,
                                                    maxValue: 100,
                                                    maskRe: /[0-100.]/,
                                                    emptyText: 'Pourcentage'
                                                }
                                                , {xtype: 'splitter'},
                                                {
                                                    xtype: 'numberfield',
                                                    hideTrigger: true,
                                                    flex: 1,
                                                    margin: '0 0 5 0',
                                                    allowDecimals: false,
                                                    fieldLabel: 'Plafond.Vente',
                                                    name: 'dblQUOTACONSOMENSUELLE', minValue: 0,
                                                    emptyText: 'Plafond.Vente'
                                                }

                                            ]
                                        },
                                        {
                                            xtype: 'fieldcontainer',
                                            flex: 1, bodyPadding: 5, margin: '0 0 10 0',
                                            layout: {type: 'hbox', align: 'stretch'},
                                            items: [
                                                {
                                                    xtype: 'numberfield',
                                                    flex: 1,
                                                    margin: '0 0 5 0',
                                                    hideTrigger: true,
                                                    allowDecimals: false,
                                                    fieldLabel: 'Plafond.Encours',
                                                    name: 'dbPLAFONDENCOURS', minValue: 0,
                                                    maxValue: 100,
                                                    maskRe: /[0-100.]/,
                                                    emptyText: 'Plafond.Encours'
                                                },
                                                {xtype: 'splitter'}, {xtype: 'splitter'}, {xtype: 'splitter'},
                                                {
                                                    xtype: 'checkbox',
                                                    boxLabel: 'Le plafond est-il absolu ?',
                                                    labelAlign: 'right',
                                                    flex: 1,
                                                    height: 30,
                                                    name: 'bIsAbsolute'
//                                                    checked: false

                                                },
                                                {
                                                    xtype: 'numberfield',
                                                    name: 'order',
                                                    minValue: 2,
                                                    maxValue: 4,
                                                    maskRe: /[2-4.]/,
                                                    fieldLabel: 'Priorité',
                                                    value: 2
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }

                    ]
                });
    },

    createAyantDroitForm: function () {
        const me = this, client = me.getClient();
        if (!client) {
            return false;
        }

        const villeStore = new Ext.data.Store({
            idProperty: 'lgVILLEID',
            fields: [
                {name: 'lgVILLEID', type: 'string'},
                {name: 'strName', type: 'string'}
            ],
            pageSize: null,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/villes',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        const form = Ext.create('Ext.window.Window',
                {

                    autoShow: true,
                    height: 340,
                    width: 600,
                    modal: true,
                    title: "Ajout d'ayant droit",
                    closeAction: 'hide',
                    closable: false,
                    maximizable: false,
                    layout: {
                        type: 'fit'

                    },
                    dockedItems: [
                        {
                            xtype: 'toolbar',
                            dock: 'bottom',
                            ui: 'footer',
                            layout: {
                                pack: 'end',
                                type: 'hbox'
                            },
                            items: [
                                {
                                    xtype: 'button',
                                    text: 'Enregistrer',
                                    handler: function (btn) {
                                        const _this = btn.up('window'), _form = _this.down('form');
                                        if (_form.isValid()) {
                                            const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                                            Ext.Ajax.request({
                                                method: 'POST',
                                                headers: {'Content-Type': 'application/json'},
                                                url: '../api/v1/client/ayant-droits/' + client.get('lgCLIENTID'),
                                                params: Ext.JSON.encode(_form.getValues()),
                                                success: function (response, options) {
                                                    progress.hide();
                                                    const result = Ext.JSON.decode(response.responseText, true);
                                                    if (result.success) {
                                                        form.destroy();
                                                        me.onBtnCancelBtnAyantDroit();
                                                        let ayant = result.data;
                                                        me.ayantDroit = ayant;
                                                        me.getNomAyantDroit().setValue(ayant.strFIRSTNAME);
                                                        me.getPrenomAyantDroit().setValue(ayant.strLASTNAME);
                                                        me.getNumAyantDroit().setValue(ayant.strNUMEROSECURITESOCIAL);
                                                    } else {
                                                        Ext.MessageBox.show({
                                                            title: 'Message d\'erreur',
                                                            width: 550,
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


                                    }
                                },
                                {
                                    xtype: 'button',
                                    iconCls: 'cancelicon',
                                    handler: function (btn) {
                                        form.destroy();
                                    },
                                    text: 'Annuler'

                                }
                            ]
                        }
                    ],
                    items: [{
                            xtype: 'form',
                            bodyPadding: 5,
                            layout: {
                                type: 'fit'

                            },
                            items: [
                                {
                                    xtype: 'fieldset',
                                    title: 'Ayant.Droits',
                                    defaultType: 'textfield',
                                    defaults: {
                                        anchor: '100%'
                                    },
                                    items: [
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: 'Nom',
                                            emptyText: 'Nom',
                                            name: 'strFIRSTNAME',
                                            itemId: 'strFIRSTNAME',
                                            height: 30, flex: 1,
                                            allowBlank: false,
                                            enableKeyEvents: true,
                                            listeners: {
                                                afterrender: function (field) {
                                                    field.focus(false, 100);
                                                }
                                            }

                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: 'Prénom',
                                            emptyText: 'Prénom',
                                            name: 'strLASTNAME',
                                            height: 30, flex: 1,
                                            allowBlank: false,
                                            enableKeyEvents: true

                                        },
                                        {
                                            xtype: 'textfield',
                                            fieldLabel: 'Matricule/SS',
                                            emptyText: 'Numéro de matricule ',
                                            name: 'strNUMEROSECURITESOCIAL',
                                            height: 30, flex: 1,
                                            enableKeyEvents: true

                                        },
                                        {
                                            xtype: "radiogroup",
                                            fieldLabel: "Genre",
                                            allowBlank: true,
                                            vertical: true,
                                            flex: 1,
                                            items: [
                                                {boxLabel: 'Féminin', name: 'strSEXE', inputValue: 'F'},
                                                {boxLabel: 'Masculin', name: 'strSEXE', inputValue: 'M'}
                                            ]
                                        },
                                        {
                                            xtype: 'datefield',
                                            fieldLabel: 'Date.Naiss',
                                            emptyText: 'Date de naissance',
                                            name: 'dtNAISSANCE',
                                            height: 30, flex: 1,
                                            submitFormat: 'Y-m-d',
                                            format: 'd/m/Y',
                                            maxValue: new Date(),
                                            enableKeyEvents: true

                                        },
                                        {
                                            xtype: 'combobox',
                                            fieldLabel: 'Ville',
                                            flex: 1,
                                            height: 30,
                                            minChars: 2,
                                            name: 'lgVILLEID',
                                            forceSelection: true,
                                            store: villeStore,
                                            valueField: 'lgVILLEID',
                                            displayField: 'strName',
                                            queryMode: 'remote',
                                            emptyText: 'Choisir une ville...'
                                        }
                                    ]
                                }
                            ]
                        }

                    ]
                });
    },
    onAyantDroitGridRowSelect: function (g, record) {
        const me = this;
        me.ayantDroit = record[0].data;
        me.onSelectAyantDroit();
    },
    onSelectAyantDroit: function () {
        const me = this;
        const ayantDroit = me.getAyantDroit();
        if (ayantDroit) {
            me.getNomAyantDroit().setValue(ayantDroit.strFIRSTNAME);
            me.getPrenomAyantDroit().setValue(ayantDroit.strLASTNAME);
            me.getNumAyantDroit().setValue(ayantDroit.strNUMEROSECURITESOCIAL);
        }

        me.onBtnCancelBtnAyantDroit();
    },
    onBtnClientAyantDroitClick: function (grid, rowIndex, colIndex) {
        const me = this;
        const record = grid.getStore().getAt(colIndex);
        me.ayantDroit = record.data;
        me.onSelectAyantDroit();
    },
    buildRecord: function (array, tp) {
        let e = array;
        Ext.each(array, function (tierpayantRecord) {

            if (tierpayantRecord.lgTIERSPAYANTID === tp) {
                e = Ext.Array.remove(array, tierpayantRecord);
                return false;
            }

        });
        return e;
    },
    buildtierspayantContainer: function () {
        var me = this, tpContainerForm = me.getTpContainerForm(), client = me.getClient();
        var tierspayants = client.get('preenregistrementstp');
        Ext.each(tierspayants, function (item) {
            var cmp = me.buildCmp(item);
            tpContainerForm.add(cmp);
        });
        me.buildBtnAddTierspayant();
    },
    buildBtnAddTierspayant: function () {
        var me = this, tpContainerForm = me.getTpContainerForm(), client = me.getClient(),
                typeVente = me.getTypeVenteCombo().getValue();
        if (typeVente === '2') {
            var tierspayants = client.get('tiersPayants');
            if (tierspayants.length > 1) {

                const btnAddTp = {
                    xtype: 'button',
                    text: 'Autre tiers-payant',
                    margin: '35 5 5 5',
                    style: 'background-color:green !important;border-color:green !important; background:green !important;',
                    handler: function (btn) {
                        let newStore = Array.from(tierspayants);
                        let items = tpContainerForm.items;
                        Ext.each(items.items, function (item) {
                            if (item.items) {
                                let tp = item.items.items[3].getValue();
                                newStore = me.buildRecord(newStore, tp);
                            }


                        });
                        let tpclientStore = new Ext.data.Store({
                            model: 'testextjs.model.caisse.ClientTiersPayant',
                            data: newStore,
                            pageSize: null,
                            autoLoad: false,
                            proxy: {
                                type: 'memory',
                                reader: {
                                    model: 'testextjs.model.caisse.ClientTiersPayant',
                                    type: 'json'
                                }
                            }
                        });
                        let slectedRecord = null;
                        let form = Ext.create('Ext.window.Window',
                                {

                                    autoShow: true,
                                    height: 230,
                                    width: 500,
                                    modal: true,
                                    title: "TIERS-PAYANTS ASSOCIES",
                                    closeAction: 'hide',
                                    closable: true,
                                    maximizable: false,
                                    layout: {
                                        type: 'fit'

                                    },
                                    dockedItems: [
                                        {
                                            xtype: 'toolbar',
                                            dock: 'bottom',
                                            ui: 'footer',
                                            layout: {
                                                pack: 'end',
                                                type: 'hbox'
                                            },
                                            items: [
                                                {
                                                    xtype: 'button',
                                                    handler: function (btn) {
                                                        if (slectedRecord) {
                                                            var parent = btn.up('window');
                                                            var field = parent.down('numberfield');
                                                            slectedRecord.set('taux', field.getValue());
                                                            var record = slectedRecord.data;
                                                            var cmp = me.buildCmp(record);
                                                            tpContainerForm.insert(items.length - 1, cmp);
                                                            me.addtierspayant(slectedRecord.get('compteTp'), field.getValue());
                                                            form.destroy();
                                                        }

                                                    },
                                                    text: 'Valider'

                                                },
                                                {
                                                    xtype: 'button',
                                                    handler: function (btn) {
                                                        form.destroy();
                                                    },
                                                    text: 'Annuler'

                                                }
                                            ]
                                        }
                                    ],
                                    items: [{
                                            xtype: 'form',
                                            bodyPadding: 5,
                                            layout: {
                                                type: 'fit'

                                            },
                                            items: [
                                                {
                                                    xtype: 'fieldset',
                                                    title: 'Tiers-payans',
                                                    defaultType: 'textfield',
                                                    defaults: {
                                                        anchor: '100%'
                                                    },
                                                    items: [
                                                        {
                                                            xtype: 'combobox',
                                                            fieldLabel: 'Tiers-payant',
                                                            flex: 1,
                                                            height: 30,
                                                            minChars: 2,
                                                            forceSelection: true,
                                                            store: tpclientStore,
                                                            name: 'compteTp',
                                                            valueField: 'compteTp',
                                                            displayField: 'tpFullName',
                                                            queryMode: 'remote',
                                                            allowBlank: false,
                                                            emptyText: 'Choisir un tiers-payant...',
                                                            listeners: {
                                                                select: function (field) {
                                                                    const parent = field.up('fieldset');
                                                                    const numberField = parent.down('numberfield');
                                                                    const record = field.findRecord("compteTp", field.getValue());
                                                                    slectedRecord = record;
                                                                    numberField.setValue(record.get('taux'));
                                                                    numberField.focus(false, 50);
                                                                }
                                                            }
                                                        },
                                                        {
                                                            xtype: 'numberfield',
                                                            fieldLabel: 'Pourcentage',
                                                            name: 'taux',
                                                            height: 30, flex: 1,
                                                            allowDecimals: false,
                                                            hideTrigger: true,
                                                            allowBlank: false,
                                                            minValue: 1,
                                                            maxValue: 100,
                                                            maskRe: /[1-100.]/,
                                                            enableKeyEvents: true,
                                                            listeners: {
                                                                specialKey: function (field, e, options) {
                                                                    if (e.getKey() === e.ENTER) {
                                                                        if (slectedRecord) {
                                                                            slectedRecord.set('taux', field.getValue());
                                                                            let record = slectedRecord.data;
                                                                            let cmp = me.buildCmp(record);
                                                                            tpContainerForm.insert(items.length - 1, cmp);
                                                                            me.addtierspayant(slectedRecord.get('compteTp'), field.getValue());
                                                                            form.destroy();
                                                                        }


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
                    }
                };
                tpContainerForm.add(btnAddTp);
            }
        }

    },
    buildCmp: function (record) {
        let percent = '30%';
        let me = this, typeVente = me.getTypeVenteCombo().getValue();
        if (typeVente === '3') {
            percent = '40%';
        }
        const cmp = {
            xtype: 'container',
            width: percent,
            margin: '0 10 0 0',
            layout: {type: 'vbox', align: 'stretch'},
            items: [
                {
                    xtype: 'fieldcontainer',
                    layout: {type: 'hbox', align: 'stretch'},
                    items: [{
                            xtype: 'displayfield',
                            fieldLabel: 'TP' + record.order,
                            flex: 1.5,
                            labelWidth: 30,
                            fieldStyle: "color:blue;",
                            value: record.tpFullName,
                            margin: '0 10 0 0'
                        },
                        {
                            xtype: 'displayfield',
                            fieldLabel: 'Taux:',
                            flex: 0.5,
                            labelWidth: 30,
                            name: 'taux' + record.order,
                            itemId: 'taux' + record.order,
                            fieldStyle: "color:blue;",
                            value: record.taux + '%',
                            margin: '0 10 0 0'
                        }]
                }
                ,
                {
                    xtype: 'fieldcontainer',
                    layout: {type: 'hbox', align: 'stretch'},
                    items: [{
                            xtype: 'textfield',
                            fieldLabel: 'Ref.Bon:',
                            allowBlank: true,
                            labelWidth: 50,
                            name: 'refBon' + record.order,
                            itemId: 'refBon' + record.order,
                            flex: 1,
                            height: 30,
                            margin: '0 10 0 0',
                            value: record.numBon,
                            listeners: {
                                afterrender: function (field) {
                                    field.focus(false, 100);
                                }
                            }
                        },
                        {
                            xtype: 'button',
                            text: 'Retirer',
                            margin: '0 10 0 0',
                            handler: function (btn) {
                                const cp = btn.up('fieldcontainer');
                                const container = cp.up('container');
                                const compteTp = container.query('hiddenfield:first');
                                me.removetierspayant(compteTp[0].value);
                                container.destroy();
                            }
                        }
                    ]
                },
                {
                    xtype: 'hiddenfield',
                    name: 'compteTp' + record.order,
                    itemId: 'compteTp' + record.order,
                    value: record.compteTp
                },
                {
                    xtype: 'hiddenfield',
                    name: 'lgTIERSPAYANTID' + record.order,
                    itemId: 'lgTIERSPAYANTID' + record.order,
                    value: record.lgTIERSPAYANTID
                },

                {
                    xtype: 'numberfield',
                    value: record.taux,
                    hidden: true
                },
                {
                    xtype: 'hiddenfield',
                    name: 'cmu' + record.order,
                    itemId: 'cmu' + record.order,
                    value: record.cmu
                }
            ]
        };
        return cmp;
    },
    closePrevente: function () {
        const me = this;
        let venteId = me.getCurrent().lgPREENREGISTREMENTID;
        let url = '../api/v1/vente/terminerprevente/' + venteId;
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'PUT',
            headers: {'Content-Type': 'application/json'},
            url: url,
            success: function (response, options) {
                progress.hide();
                let result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.resetAll();
                    me.getVnoproduitCombo().focus(false, 100, function () {
                    });
                } else {
                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 550,
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

    },
    doCloture: function () {
        const me = this;
        let typeRegle = me.getVnotypeReglement().getValue(),
                typeVenteCombo = me.getTypeVenteCombo().getValue();

        if (me.getMontantRecu().getValue() != null) {
            if (me.getToRecalculate()) {
                Ext.MessageBox.show({
                    title: 'Message d\'erreur',
                    width: 550,
                    msg: 'Le net à payer sera recalculer',
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.ERROR,
                    fn: function (buttonId) {
                        if (buttonId === "ok") {
                            if (typeVenteCombo === '1') {
                                me.showNetPaidVno();
                            } else {
                                me.showNetPaidAssurance();
                            }
                        }
                    }
                });

            } else {
                if (me.getCaisse()) {
                    if (typeVenteCombo === '1') {
                        if (typeRegle === '1') {
                            me.onbtncloturerVnoComptant(typeRegle);
                        } else {
                            let client = me.getClient();
                            if (client) {
                                me.onbtncloturerVnoComptant(typeRegle);
                            } else {
                                Ext.MessageBox.show({
                                    title: 'Message d\'erreur',
                                    width: 550,
                                    msg: 'Veuillez ajouter un client à la vente',
                                    buttons: Ext.MessageBox.OK,
                                    icon: Ext.MessageBox.ERROR,
                                    fn: function (buttonId) {
                                        if (buttonId === "ok") {
                                            me.showAndHideInfosStandardClient(true);
                                        }
                                    }
                                });
                            }
                        }


                    } else {
                        me.onbtncloturerAssurance(typeRegle);
                    }
                } else {
                    Ext.Msg.alert("Message", "Désolé votre caisse est fermée. Veuillez l'ouvrir avant de proceder à la validation");
                }
            }
        } else {
            Ext.MessageBox.show({
                title: 'Message',
                width: 550,
                msg: 'Veuillez saisir le montant à payer',
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING,
                fn: function (buttonId) {
                    if (buttonId === "ok") {
                        me.getMontantRecu().focus(true, 50);
                    }
                }
            });
        }
    },
    onbtncloturerAssurance: function (typeRegleId) {
        const me = this;
        let sansBon = me.getSansBon().getValue(), montantTp = me.getMontantTp().getValue();
        const vente = me.getCurrent();
        const client = me.getClient();
        let clientId = null;
        let commentaire = '';
        if (client) {
            clientId = client.get('lgCLIENTID');
            commentaire = me.getCommentaire().getValue();
        }
        let nom = "", banque = "", lieux = "";
        if (typeRegleId !== '1' && typeRegleId !== '4') {
            if (me.getRefCb()) {
                nom = me.getRefCb().getValue();
                banque = me.getBanque().getValue();
                lieux = me.getLieuxBanque().getValue();
            }
        }
        if (vente) {
            let venteId = vente.lgPREENREGISTREMENTID;
            let url = '../api/v1/vente/cloturer/assurance';
            const data = me.getNetAmountToPay();
            let netTopay = data.montantNet;
            let typeVenteCombo = me.getTypeVenteCombo().getValue(),
                    remiseId = me.getVnoremise().getValue(),
                    natureCombo = me.getNatureCombo().getValue(),
                    userCombo = me.getUserCombo().getValue(),
                    montantRecu = me.getMontantRecu().getValue();
            let montantExtra = 0;
            const montantExtraCmp = me.getMontantExtra();
            if (!montantExtraCmp?.hidden) {
                montantExtra = parseInt(montantExtraCmp.getValue());
            }
            montantRecu += montantExtra;

            let medecinId = me.getMedecinId();
            if (typeRegleId === '1' && parseInt(montantRecu) < parseInt(netTopay)) {
                me.handleExtraModePayment(netTopay);
                return false;
            }
            let ayantDroit = me.getAyantDroit(), ayantDroitId = null;
            if (ayantDroit) {
                ayantDroitId = ayantDroit.lgAYANTSDROITSID;
            }
            let montantRemis = (montantRecu > netTopay) ? montantRecu - netTopay : 0;
            let totalRecap = data.montant, montantPaye = montantRecu - montantRemis;
            let param = {
                "typeVenteId": typeVenteCombo,
                "ayantDroitId": ayantDroitId,
                "natureVenteId": natureCombo,
                "devis": false,
                "remiseId": remiseId,
                "venteId": venteId,
                "userVendeurId": userCombo,
                "montantRecu": montantRecu,
                "montantRemis": montantRemis,
                "montantPaye": montantPaye,
                "totalRecap": totalRecap,
                "typeRegleId": typeRegleId,
                "clientId": clientId,
                "nom": nom,
                "sansBon": sansBon,
                "commentaire": commentaire,
                "banque": banque,
                "lieux": lieux,
                "tierspayants": data.tierspayants,
                "partTP": montantTp,
                "marge": data.marge,
                "medecinId": medecinId,
                "reglements": me.buildModeReglements(typeRegleId, netTopay)
            };
            const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: url,
                params: Ext.JSON.encode(param),
                success: function (response, options) {
                    let result = Ext.JSON.decode(response.responseText, true);
                    progress.hide();
                    if (result.success) {
                        if (!me.getTicketCaisse()) {
                            me.onPrintTicket(param, typeVenteCombo);
                            me.resetAll(montantRemis);
                            me.getVnoproduitCombo().focus(false, 100, function () {
                            });
                        } else {
                            Ext.MessageBox.show({
                                title: 'Impression du ticket',
                                msg: 'Voulez-vous imprimer le ticket ?',
                                buttons: Ext.MessageBox.YESNO,
                                fn: function (button) {
                                    if ('yes' == button) {
                                        me.onPrintTicket(param, typeVenteCombo);
                                    }
                                    me.resetAll(montantRemis);
                                    me.getVnoproduitCombo().focus(false, 100, function () {
                                    });
                                },
                                icon: Ext.MessageBox.QUESTION
                            });

                        }
                    } else {
                        let codeError = result.codeError;
                        //il faut ajouter un medecin à la vente 
                        if (codeError === 1) {
                            me.showMedicinWindow();
                        } else {
                            Ext.MessageBox.show({
                                title: 'Message d\'erreur',
                                width: 550,
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

                    }

                },
                failure: function (response, options) {
                    progress.hide();
                    Ext.Msg.alert("Message", 'Un problème avec le serveur ' + response.status);
                }

            });
        }
    },
    checkEmptyBonRef: function () {
        const me = this;
        let tpContainerForm = me.getTpContainerForm();
        let items = tpContainerForm.items;
        let result = null;
        let emptyRef = false;
        let numBonField;
        Ext.each(items.items, function (item) {
            if (item.items) {
                numBonField = item.items.items[1].items.items[0];

                if (numBonField.getValue().trim() === '') {
                    emptyRef = true;
                    return;
                }
            }
        });
        if (emptyRef) {
            result = numBonField;

        }

        return result;
    },
    buildAssuranceData: function () {
        let me = this, tpContainerForm = me.getTpContainerForm();
        let items = tpContainerForm.items;
        let tierspayants = [];
        Ext.each(items.items, function (item) {
            if (item.items) {
                const numBonField = item.items.items[1].items.items[0];
                /*tp = item.items.items[3].getValue(),*/
                const taux = item.items.items[4];
                const cmtp = item.items.items[2];
                const cmu = item.items.items[5];
                tierspayants.push(
                        {
                            "compteTp": cmtp.getValue(),
                            "numBon": numBonField.getValue(),
                            "taux": parseInt(taux.getValue()),
                            "cmu": cmu.getValue()
                        }
                );
            }


        });
        return tierspayants;
    },

    showNetPaidAssurance: function () {
        const me = this;
        let sansBon = me.getVenteSansBon();
        let result = me.checkEmptyBonRef();
        if (result && !sansBon) {
            Ext.MessageBox.show({
                title: 'Message',
                width: 550,
                msg: "Veuillez renseigner le numéro de bon",
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING,
                fn: function (buttonId) {
                    if (buttonId === "ok") {
                        result.focus(true, 50);
                    }
                }
            });

        } else {
            if (result && sansBon && !me.getSansBon().getValue()) {
                Ext.MessageBox.show({
                    title: 'Message d\'erreur',
                    width: 550,
                    msg: "Veuillez cocher la vente sans bon ou renseigner le numéro de bon",
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.WARNING,
                    fn: function (buttonId) {
                        if (buttonId === "ok") {
                            result.focus(true, 50);
                        }
                    }
                });
                return;
            } else {
                let vente = me.getCurrent(), remiseId = me.getVnoremise().getValue();
                if (vente) {
                    let venteId = vente.lgPREENREGISTREMENTID;
                    let tierspayants = me.buildAssuranceData();
                    if (tierspayants.length === 0) {
                        Ext.Msg.alert("Message", 'Veuillez ajouter un tiers-payant à la vente');
                        return false;
                    }
                    let data = {
                        "remiseId": remiseId,
                        "venteId": venteId,
                        "tierspayants": tierspayants
                    };
                    const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                    Ext.Ajax.request({
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        url: '../api/v1/vente/net/assurance',
                        params: Ext.JSON.encode(data),
                        success: function (response, options) {
                            progress.hide();
                            const result = Ext.JSON.decode(response.responseText, true);
                            if (result.success) {


                                me.netAmountToPay = result.data;
                                me.toRecalculate = false;
                                let montantNet = me.getNetAmountToPay().montantNet;
                                me.getMontantNet().setValue(me.getNetAmountToPay().montantNet);
                                me.getVnomontantRemise().setValue(me.getNetAmountToPay().remise);
                                me.getMontantTp().setValue(me.getNetAmountToPay().montantTp);
                                if (montantNet === 0) {
                                    me.getMontantRecu().disable();
                                    me.getVnobtnCloture().enable();
                                    me.getVnobtnCloture().focus();
                                } else {
                                    me.getMontantRecu().enable();
                                    me.handleMontantField(montantNet);
                                    me.getMontantRecu().setReadOnly(false);
                                    me.getMontantRecu().focus(true, 50);
                                }
                                const message = result.msg;
                                const restructuring = result.data.restructuring;
                                if (restructuring === true) {
                                    Ext.MessageBox.show({
                                        title: 'Message d\'erreur',
                                        width: 500,
                                        msg: message,
                                        buttons: Ext.MessageBox.OK,
                                        icon: Ext.MessageBox.WARNING,
                                        fn: function (buttonId) {
                                            if (buttonId === "ok") {
                                                me.getMontantRecu().focus(true, 50);
                                            }
                                        }
                                    });
                                }
                            } else {
                                me.getMontantRecu().focus(true, 50);

                            }

                        },
                        failure: function (response, options) {
                            progress.hide();
                            Ext.Msg.alert("Message", 'Un problème s\'est produit avec le server ' + response.status);
                        }

                    });
                }
            }

        }
    },
    buildSaleParams: function (record, qte, typeVente) {
        const me = this;
        let params = null;
        let client = me.getClient();
        let clientId = null;
        if (client) {
            clientId = client.get('lgCLIENTID');
        }
        const vente = me.getCurrent();
        let venteId = null;
        if (vente) {
            venteId = vente.lgPREENREGISTREMENTID;
        }
        if (record) {
            let user = me.getUserCombo().getValue(),
                    nature = me.getNatureCombo().getValue()
                    , remiseId = me.getVnoremise().getValue();
            const isPrevente = me.getCategorie() === 'PREVENTE';
            if (typeVente === '1') {
                params = {
                    "typeVenteId": typeVente,
                    "natureVenteId": nature,
                    "produitId": record.get('lgFAMILLEID'),
                    "itemPu": record.get('intPRICE'),
                    "qte": qte,
                    "qteServie": qte,
                    "devis": false,
                    "remiseId": remiseId,
                    "venteId": venteId,
                    "userVendeurId": user,
                    "prevente": isPrevente
                };
            } else {
                let ayantDroit = me.getAyantDroit(), ayantDroitId = null;
                if (ayantDroit) {
                    ayantDroitId = ayantDroit.lgAYANTSDROITSID;
                }
                let tierspayants = me.buildAssuranceData();
                params = {
                    "typeVenteId": typeVente,
                    "natureVenteId": nature,
                    "produitId": record.get('lgFAMILLEID'),
                    "itemPu": record.get('intPRICE'),
                    "qte": qte,
                    "qteServie": qte,
                    "devis": false,
                    "remiseId": remiseId,
                    "venteId": venteId,
                    "userVendeurId": user,
                    "tierspayants": tierspayants,
                    "clientId": clientId,
                    "ayantDroitId": ayantDroitId,
                    "prevente": isPrevente
                };
            }

        }
        return params;
    },
    addVenteAssuarnce: function (data, url, field, comboxProduit) {
        const me = this;
        let client = me.getClient();
        if (!client) {
            Ext.MessageBox.show({
                title: 'Message d\'erreur',
                width: 550,
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
        }
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: url,
            params: Ext.JSON.encode(data),
            success: function (response, options) {
                progress.hide();
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.updateStockField(0);
                    me.getVnoemplacementField().setValue('');
                    me.current = result.data;
                    me.getTotalField().setValue(me.getCurrent().intPRICE);
                    field.setValue(1);
                    comboxProduit.clearValue();
                    comboxProduit.focus(true, 100);
                    me.refresh();
                } else {
                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 550,
                        msg: result.msg,
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR,
                        fn: function (buttonId) {
                            if (buttonId === "ok") {
                                field.focus(true, 100, function () {
                                });
                            }
                        }
                    });
                }

            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert("Message", 'Un problème avec le serveur');
            }
        });
    },
    removetierspayant: function (compteClientTpId) {
        const me = this;
        let current = me.getCurrent();
        if (current) {
            const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'GET',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/vente/removetp/' + compteClientTpId + '/' + current.lgPREENREGISTREMENTID,
                success: function (response, options) {
                    progress.hide();
                    const result = Ext.JSON.decode(response.responseText, true);
                    if (result.success) {
                        me.getVnoproduitCombo().focus(true, 100);
                    } else {
                        Ext.Msg.alert("Message", 'Le tiers-payant n\'est pas supprimé');
                    }

                },
                failure: function (response, options) {
                    progress.hide();
                    Ext.Msg.alert("Message", 'Un problème avec le serveur');
                }
            });
        }
    },
    addtierspayant: function (compteClientId, taux) {
        const me = this;
        let current = me.getCurrent();
        if (current) {
            const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            let data = {"typeVenteId": compteClientId, "qte": taux};
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/vente/addtp/' + current.lgPREENREGISTREMENTID,
                params: Ext.JSON.encode(data),
                success: function (response, options) {
                    progress.hide();
                    const result = Ext.JSON.decode(response.responseText, true);
                    if (!result.success) {
                        Ext.Msg.alert("Message", 'Le tiers-payant n\'a pas été ajouté');
                    }

                },
                failure: function (response, options) {
                    progress.hide();
                    Ext.Msg.alert("Message", 'Un problème avec le serveur');
                }
            });
        }

    },
    montantRecuFocus: function () {
        const me = this;
        const typeVente = me.getTypeVenteCombo().getValue();
        if (me.getToRecalculate()) {
            if (typeVente === '1') {
                me.showNetPaidVno();
            } else {
                me.showNetPaidAssurance();
            }
        }
    },

    buildMedecinGrid: function () {
        const me = this;
        me.getMedecinform().setVisible(false);
        let grid = {
            xtype: 'grid',
            itemId: 'medecinGrid',
            selModel: {
                selType: 'rowmodel',
                mode: 'SINGLE'
            },
            store: Ext.create('Ext.data.Store', {
                autoLoad: false,
                pageSize: null,
                model: 'testextjs.model.caisse.MedecinModel',
                proxy: {
                    type: 'ajax',
                    url: '../api/v1/medecin/medecins',
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
                    dataIndex: 'id',
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
                    dataIndex: 'nom'
                }, {
                    header: 'Numéro ordre',
                    dataIndex: 'numOrdre',
                    flex: 1

                },
                {
                    header: 'Commentaire',
                    dataIndex: 'commentaire',
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
                            itemId: 'queryMedecin',
                            emptyText: 'Taper ici pour rechercher',
                            width: '70%',
                            height: 45,
                            enableKeyEvents: true
                        }, '-', {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            scope: this,
                            itemId: 'btnRechercheMedecin',
                            iconCls: 'searchicon'

                        },
                        '-', {
                            text: 'Nouveau',
                            scope: this,
                            itemId: 'btnAddNewMedecin',
                            icon: 'resources/images/icons/add16.gif'

                        }
                    ]
                }
            ]


        };
        return grid;
    },
    closeMedecinWindow: function () {
        const me = this;
        me.getMedecin().destroy();

    },
    addMedecinForm: function () {
        const me = this;
        me.getMedecinGrid().setVisible(false);
        me.getMedecinform().setVisible(true);
        me.getNomMedecin().focus(true, 100);
        me.getBtnNewMedecin().enable();
    },
    btnAjouterMedecin: function (grid, rowIndex, colIndex) {
        const me = this;

        const record = grid.getStore().getAt(colIndex);
        me.closeMedecinWindow();
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        me.updateVenteMedecin(record.get('id'), progress);
    },
    updateVenteMedecin: function (medecinId, progress) {
        const me = this;
        let venteId = me.getCurrent().lgPREENREGISTREMENTID;
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/vente/update/medecin',
            params: Ext.JSON.encode({
                "medecinId": medecinId, "venteId": venteId
            }),
            success: function (response, options) {
                progress.hide();
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.medecinId = medecinId;
                    if (!result.clientExist) {
                        Ext.MessageBox.show({
                            title: 'Message ',
                            width: 550,
                            msg: 'Opération effectuée avec succes. Veuillez ajouter le client',
                            buttons: Ext.MessageBox.OK,
                            icon: Ext.MessageBox.INFO,
                            fn: function (buttonId) {
                                if (buttonId === "ok") {
                                    const win = Ext.create('testextjs.view.vente.user.ClientLambda');
                                    win.add(me.buildLambdaClientGrid());
                                    win.show();
                                }
                            }
                        });
                    } else {
                        me.getMontantRecu().focus(true, 50);
                    }

                } else {

                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 550,
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
    },
    onMedecinSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            const me = this;
            me.registerNewMedecin();
        }

    },

    registerNewMedecin: function () {
        const me = this, form = me.getMedecinform();
        if (form.isValid()) {
            const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/vente/add/medecin/' + me.getCurrent().lgPREENREGISTREMENTID,
                params: Ext.JSON.encode(form.getValues()),
                success: function (response, options) {
                    progress.hide();
                    const result = Ext.JSON.decode(response.responseText, true);
                    if (result.success) {
                        me.medecinId = result.medecinId;
                        me.closeMedecinWindow();
                        if (!result.clientExist) {
                            Ext.MessageBox.show({
                                title: 'Message ',
                                width: 550,
                                msg: 'Opération effectuée avec succes. Veuillez ajouter le client',
                                buttons: Ext.MessageBox.OK,
                                icon: Ext.MessageBox.INFO,
                                fn: function (buttonId) {
                                    if (buttonId === "ok") {
                                        const win = Ext.create('testextjs.view.vente.user.ClientLambda');
                                        win.add(me.buildLambdaClientGrid());
                                        win.show();
                                    }
                                }
                            });
                        } else {
                            me.getMontantRecu().focus(true, 50);
                        }


                    } else {

                        Ext.MessageBox.show({
                            title: 'Message d\'erreur',
                            width: 550,
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
    showMedicinWindow: function () {
        const me = this;
        const win = Ext.create('testextjs.view.vente.user.Medecin');
        win.add(me.buildMedecinGrid());
        win.show();
    },

    queryMedecin: function () {
        const me = this, query = me.getQueryMedecin().getValue();
        if (query && query.trim() !== "") {
            me.getMedecinGrid().getStore().load({
                params: {
                    query: query
                }
            });
        }
    },
    onMedecinKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            if (field.getValue() && field.getValue().trim() !== "") {
                const me = this;
                me.queryMedecin();
            }
        }
    },
    putToStandBy: function () {
        const me = this;
        me.resetAll();
        me.getVnoproduitCombo().focus(false, 100, function () {
        });
    },
    oncheckUg: function () {
        const me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/common/checkug',
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.checkUg = result.data;
                }
            }

        });
    },

    checkParamImpressionTicketCaisse: function () {
        const me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/app-params/key/KEY_IMPRIMER_TICKET_CAISSE',
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.ticketCaisse = result.data;
                }
            }

        });
    },

    onbtnModifierAyantDroitInfo: function () {
        const me = this, client = me.getClient();
        if (client) {
            me.loadAyantDroits(client.get('lgCLIENTID'));

        }

    },
    onBtnCancelBtnAyantDroit: function () {
        const me = this;
        const win = me.getAyantdroitView();
        win.destroy();
    },
    loadAyantDroits: function (clientId) {
        const me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/client/ayant-droits',
            params: {"clientId": clientId},
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                const ayantDroitWin = Ext.create('testextjs.view.vente.user.AyantDroitGrid');
                me.getAyantdroiGrid().getStore().loadData(result.data);
                ayantDroitWin.show();
            }

        });
    },

    handleExtraModePayment: function (netTopay) {
        const me = this;
        Ext.MessageBox.show({
            title: 'Avertissement',
            width: 550,
            msg: 'le montant de la vente est de <span style="color: black; font-size: 1rem;font-weight: 900;">' + Ext.util.Format.number(netTopay, '0,000.') + '</span> voulez vous ajouter un autre mode ?',
            buttons: Ext.MessageBox.YESNO,
            icon: Ext.MessageBox.WARNING,
            fn: function (buttonId) {

                if (buttonId === "yes") {
                    Ext.create('testextjs.view.vente.ReglementGrid').show();

                } else {
                    me.getMontantRecu().focus(true, 50);
                }
            }
        });
    },
    onModeReglementGridRowSelect: function (g, record) {
        const me = this;
        const modeRegelement = record[0].data;
        me.onModeReglementSelect(modeRegelement);
    },
    onClientStandarGridRowSelect: function (g, record) {
        const me = this;
        console.warn(record);
        const client = record[0].data;
        me.updateClientStandard(client);

    },

    onModeReglementSelect: function (modeRegelement) {
        const me = this;
        if (Ext.isEmpty(me.getClient())) {
            me.showAndHideInfosStandardClient(true);
        }
        me.extraModeReglementId = modeRegelement.id;
        const montantExtra = me.getMontantExtra();
        montantExtra.show();
        me.onBtnCancelModeReglement();
        montantExtra.labelWidth = modeRegelement.libelle.length + 2;
        montantExtra.setFieldLabel(modeRegelement.libelle.toUpperCase());
        me.handleExtraAmountInputValue();
        me.getMontantRecu().focus(true, 50);
    },

    resetExtraModeCmp: function () {
        const me = this;
        const montantExtra = me.getMontantExtra();
        montantExtra.setFieldLabel('');
        montantExtra.setValue(null);
        montantExtra.hide();
        me.extraModeReglementId = null;
        me.getMontantRecu().focus(true, 50);
    },

    handleExtraAmountInputValue: function () {
        const me = this;
        if (me.getExtraModeReglementId()) {
            const data = me.getNetAmountToPay();
            const netTopay = data.montantNet;
            const montantRecu = me.getMontantRecu().getValue();
            const montantExtraValue = netTopay - montantRecu;
            const montantExtra = me.getMontantExtra();
            if (montantExtraValue <= 0) {
                montantExtra.setValue(0);
                montantExtra.hide();
            } else {
                if (!montantExtra.isVisible()) {
                    montantExtra.show();
                }
                montantExtra.setValue(montantExtraValue);

            }

        }

    },
    onBtnCancelModeReglement: function () {
        const me = this;
        const win = me.getReglementGrid();
        win.destroy();
    },
    onBtnModeReglementClick: function (grid, rowIndex, colIndex) {
        const me = this;
        const modeRegelement = grid.getStore().getAt(colIndex);
        me.onModeReglementSelect(modeRegelement?.data);
    },

    buildModeReglements: function (typeReglement, netToPay) {
        const me = this;
        let reglements = [];
        if (typeReglement === '1') {
            const extraModeId = me.getExtraModeReglementId();
            const montantRecu = me.getMontantRecu().getValue();
            const montantExtra = me.getMontantExtra()?.getValue();
            if (!Ext.isEmpty(extraModeId) && montantExtra) {

                reglements.push(
                        {
                            "typeReglement": extraModeId,
                            "montant": montantExtra,
                            "montantAttentu": montantExtra
                        },
                        {
                            "typeReglement": typeReglement,
                            "montant": montantRecu,
                            "montantAttentu": montantRecu
                        }
                );
            } else {
                reglements.push(
                        {
                            "typeReglement": typeReglement,
                            "montant": montantRecu,
                            "montantAttentu": montantRecu
                        }
                );

            }
        } else {
            reglements.push(
                    {
                        "typeReglement": typeReglement,
                        "montant": netToPay,
                        "montantAttentu": netToPay
                    }
            );
        }

        return reglements;
    }
}
);
