
/* global Ext */

Ext.define('testextjs.controller.VenteCtr', {
    extend: 'Ext.app.Controller',

    /**
     * Remet totalement à zéro le champ de recherche produit (combo) :
     * - clearValue() seul peut laisser le rawValue affiché
     * - ici on force aussi setValue(null) + setRawValue('') + reset() + inputEl
     */
    resetProduitCombo: function (combo) {
        if (!combo) {
            return;
        }
        try {
            // Fermer la liste (évite ENTER en arrière-plan)
            if (combo.isExpanded) {
                combo.collapse();
            }
        } catch (e) {
        }
        try {
            // Deselect dans le picker
            if (combo.getPicker && combo.getPicker()) {
                const sm = combo.getPicker().getSelectionModel && combo.getPicker().getSelectionModel();
                if (sm && sm.deselectAll) {
                    sm.deselectAll();
                }
            }
        } catch (e) {
        }
        try {
            // Vider value + texte affiché
            combo.clearValue();
        } catch (e) {
        }
        try {
            combo.setValue(null);
        } catch (e) {
        }
        try {
            combo.setRawValue('');
        } catch (e) {
        }
        try {
            combo.reset();
        } catch (e) {
        }
        try {
            // Réinitialiser la dernière requête pour forcer une nouvelle recherche
            combo.lastQuery = null;
        } catch (e) {
        }
        try {
            // Enlever tout filtre restant sur le store (sinon la liste conserve l'ancien résultat)
            const st = combo.getStore && combo.getStore();
            if (st && st.clearFilter) {
                st.clearFilter(false);
            }
        } catch (e) {
        }
        try {
            if (combo.inputEl && combo.inputEl.dom) {
                combo.inputEl.dom.value = '';
            }
        } catch (e) {
        }
    },

    // === Protection saisie Montant reçu (anti-scanner + confirmation) ===
    antiBarcodeMaxDigits: 7, // > 5 chiffres => blocage (probable scan code-barres)
    confirmAtMaxDigits: true, // == 5 chiffres => demande confirmation
    suspectInputThreshold: 200000, // confirmation au clic "Terminer" si montant élevé

    maxChangeAllowed: 9500, // monnaie à rendre max avant alerte (anti scan)

    // === Modes de règlement mobile money (cf. typeReglementSelectEvent) ===
    mobileModeIds: ['7', '8', '9', '10', '19', '80', '70'],
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
            ref: 'preventeSearchField',
            selector: 'doventemanager #preventeSearchField'
        },
        {
            ref: 'preventeSearchBtn',
            selector: 'doventemanager #preventeSearchBtn'
        },

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
            ref: 'btnExtraMode',
            selector: 'doventemanager #contenu #btnExtraMode'
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
        , {
            ref: 'preventeSearchWindow',
            selector: 'window[title="RÉSULTATS DE RECHERCHE DES PRÉVENTES"]'
        }
    ],
    init: function () {
        const me = this;
        // Recalcul de la hauteur de la grille au redimensionnement de la
        // fenêtre (portable <-> écran externe). Bufferisé, sans effet hors
        // vente comptant plein écran.
        me._onWinResizeFill = Ext.Function.createBuffered(function () {
            me.refreshGridFill();
        }, 150);
        Ext.on('resize', me._onWinResizeFill);
        this.control(
                {

                    'doventemanager #preventeSearchBtn': {
                        click: this.onPreventeSearchClick
                    },
                    'doventemanager #preventeSearchField': {
                        specialkey: this.onPreventeFieldSpecialKey
                    },

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
                    'doventemanager #contenu #btnExtraMode': {
                        click: this.onBtnExtraModeClick
                    },
                    'doventemanager #contenu #montantExtra': {
                        change: this.montantExtraChangeListener,
                        // Entree dans le champ du 2e mode : en especes + mobile elle
                        // confirme la part mobile et rend la main au montant recu ;
                        // en mobile + mobile elle garde son sens historique (cloture)
                        specialkey: this.onMontantExtraKey
                    },
                    'doventemanager #contenu [xtype=gridpanel] [xtype=actioncolumn]': {
                        click: this.removeItemVno
                    }, 'doventemanager #contenu #typeReglement': {
                        select: this.typeReglementSelectEvent
                    },
                    'clientLambda #btnCancelLambda': {
                        click: this.onCancelClientLambda
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
                        specialkey: this.onClientLambdaKey,
                        keyup: {fn: this.onQueryClientLambdaKeyUp, buffer: 350}

                    },
                    'doventemanager #contenu [xtype=gridpanel]': {
                        edit: this.onGridEdit,
                        afterrender: this.onVenteGridAfterRender
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
                        specialkey: this.onQueryClientAssurance,
                        // buffer : une seule requete en fin de frappe, pas une par touche
                        keyup: {fn: this.onQueryClientAssuranceKeyUp, buffer: 350}
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

    onReady: function (view) {
        const me = this;
        me.markVenteContentPanel(true, view);
        me.goToVenteView();
        me.cheickCaisse();
        me.checkModificationPrixU();
        me.checkShowStock();
        me.oncheckUg();
        me.checkSansBon();
        me.checkParamImpressionTicketCaisse();

    },
    /*
     * Marque le panneau central quand l'écran de vente est actif : la classe
     * vp-vente-mode neutralise (en CSS) la photo de fond du thème UNIQUEMENT
     * ici. Retirée au destroy de la vue pour que les autres écrans gardent
     * leur fond décoratif (pas de régression globale).
     */
    markVenteContentPanel: function (active, view) {
        const cp = Ext.getCmp('content-panel');
        if (cp && cp.getEl()) {
            cp.getEl()[active ? 'addCls' : 'removeCls']('vp-vente-mode');
        }
        if (active && view && view.on) {
            view.on('destroy', function () {
                const p = Ext.getCmp('content-panel');
                if (p && p.getEl()) {
                    p.getEl().removeCls('vp-vente-mode');
                }
            }, null, {single: true});
        }
    },
    /*
     * Relit l'etat de la caisse. Appele a l'ouverture de l'ecran, et de nouveau apres une ouverture
     * de caisse faite depuis la vente : sans cette relecture l'ecran garderait « caisse fermee » en
     * memoire et reposerait la meme question au clic suivant.
     *
     * @param suite fonction appelee avec l'etat relu, pour reprendre ce qui avait ete interrompu.
     */
    cheickCaisse: function (suite) {
        const me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/vente/cheick-caisse',
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.caisse = result.data;
                }
                if (Ext.isFunction(suite)) {
                    suite(me.getCaisse());
                }
            },
            failure: function () {
                // On ne bloque pas la suite sur un echec de relecture : l'appelant decidera.
                if (Ext.isFunction(suite)) {
                    suite(me.getCaisse());
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
        me.setGridFillHeight(true);
    },
    /* Comptant : la grille s'étire jusqu'au bas du panneau (plein écran, pour
     * occuper toute la hauteur quel que soit l'écran). En assurance/carnet le
     * bandeau assuré occupe la place : la grille repasse à 250. */
    setGridFillHeight: function (fill) {
        const me = this, grid = me.getVnogrid && me.getVnogrid();
        if (!grid) {
            return;
        }
        me._gridFillMode = !!fill;
        if (!fill) {
            grid.minHeight = 250;
            grid.updateLayout();
            return;
        }
        me.fitGridToPanel(grid);
    },
    /* Ajuste la hauteur de la grille pour que le bas de l'écran de vente
     * s'aligne juste au-dessus de la zone visible du panneau central : pas de
     * barre de défilement (sinon elle rogne le bouton VENTES EN ATTENTE et les
     * bords), et l'espace est occupé jusqu'en bas.
     *
     * spare = (bas de la zone visible) - (bas réel de l'écran vente). On ajoute
     * spare - RESERVE à la hauteur courante de la grille : si l'écran est trop
     * petit (spare < 0) la grille RÉTRÉCIT (plus de scrollbar) ; s'il reste de
     * la place la grille GRANDIT. getViewRegion exclut la scrollbar → calcul
     * stable. Plancher 250 (comme l'assurance). Idempotent (converge). */
    fitGridToPanel: function (grid) {
        const me = this, FLOOR = 250, RESERVE = 10;
        try {
            const cp = Ext.getCmp('content-panel');
            const view = me.getDoventemanager && me.getDoventemanager();
            if (!cp || !cp.body || !grid.rendered || !view || !view.getEl()) {
                return;
            }
            // On aligne le bas de l'écran vente juste au-dessus de la zone
            // visible : la grille GRANDIT s'il reste de la place (grand écran),
            // RÉTRÉCIT vers 250 si l'écran est petit. getViewRegion exclut la
            // scrollbar → calcul stable, idempotent.
            const bviewBottom = cp.body.getViewRegion().bottom;
            const shellBottom = view.getEl().getRegion().bottom;
            const target = grid.getHeight() + (bviewBottom - shellBottom) - RESERVE;
            const next = Math.max(FLOOR, Math.round(target));
            if (Math.abs(next - grid.minHeight) > 1) {
                grid.minHeight = next;
                grid.updateLayout();
            }
        } catch (e) {
        }
    },
    /* À l'affichage de la grille (vente comptant par défaut) : on l'étire pour
     * remplir la hauteur. Différé pour laisser le layout se poser. */
    onVenteGridAfterRender: function () {
        const me = this;
        // deux passes : la 1re peut faire (dis)paraître la scrollbar, la 2nde
        // stabilise (le calcul est idempotent, il converge)
        Ext.defer(function () {
            if (me.getSafeComboValue('getTypeVenteCombo', '1') === '1') {
                me.setGridFillHeight(true);
                Ext.defer(function () {
                    if (me._gridFillMode) {
                        me.fitGridToPanel(me.getVnogrid());
                    }
                }, 80);
            }
        }, 60);
    },
    /* Recalcul de la hauteur de la grille au redimensionnement de la fenêtre
     * (passage portable <-> écran externe, maximisation). Ne fait rien hors du
     * mode plein écran comptant. */
    refreshGridFill: function () {
        const me = this, grid = me.getVnogrid && me.getVnogrid();
        if (!me._gridFillMode || !grid || !grid.rendered) {
            return;
        }
        me.fitGridToPanel(grid);
    },
    showAssureContainer: function (typevente) {
        const me = this;
        let assureContainer = me.getAssureContainer(), ayantDroyCmp = me.getAyantDroyCmp(),
                montantTp = me.getMontantTp();
        montantTp.show();
        // "Vente sans bon" retiré de l'écran (le paramètre reste à false)
        me.setGridFillHeight(false);
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
        let  typeVente = me.getSafeComboValue('getTypeVenteCombo', '1');
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
        // ✅ recherche sûre du record (store peut être null selon l'état du composant)
        let dsCmp = (cmp.getStore) ? cmp.getStore() : cmp.store;
        const item = dsCmp ? (dsCmp.findRecord("lgFAMILLEID", cmp.getValue(), 0, false, false, true)
                || dsCmp.findRecord("intCIP", cmp.getValue(), 0, false, false, true)) : null;
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
                typeVente = me.getSafeComboValue('getTypeVenteCombo', '1');
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
        const typeVente = me.getSafeComboValue('getTypeVenteCombo', '1');
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
    /**
     * Recherche un produit via douchette (API findone/{code}).
     * - mode classique: renseigne stock/emplacement puis focus quantité
     * - mode autoAdd: si résultat unique => ajoute directement qté=1 (sans passer par la saisie quantité)
     */
    checkDouchette(field, autoAdd) {
        let me = this;
        autoAdd = (autoAdd === true);
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

                    // ✅ Ajout direct si scan => résultat unique
                    if (autoAdd) {
                        try {
                            // On crée un record compatible buildSaleParams (record.get(...))
                            const record = Ext.create('testextjs.model.caisse.Produit', produit);
                            me.addProduitFromScan(record, 1);
                        } catch (e) {
                            // fallback: comportement historique
                            me.getVnoqtyField().focus(true, 100);
                        }
                    } else {
                        me.getVnoqtyField().focus(true, 100);
                    }
                } else {
                    field.focus(true, 100);
                }

            }

        });

    },

    /**
     * Ajout direct d'un produit après scan (résultat unique).
     * Reprend les contrôles de stock/déconditionnement de onQtySpecialKey.
     */
    addProduitFromScan: function (record, qte) {
        const me = this;

        // ✅ IMPORTANT : après un ajout (scan), forcer recalcul net
        me.toRecalculate = true;
        me.netAmountToPay = null;

        // Chemin d'enregistrement : type de vente sécurisé SANS défaut deviné.
        const typeVenteCmp = me.getTypeVenteCombo && me.getTypeVenteCombo();
        if (!typeVenteCmp) {
            me.recoverVenteView();
            return;
        }
        const typeVente = typeVenteCmp.getValue();
        const vente = me.getCurrent();
        const isVno = (typeVente === '1');

        // champs UI
        const qtyField = me.getVnoqtyField();
        const produitCmp = me.getVnoproduitCombo();

        // URL d'ajout
        const url = vente ? '../api/v1/vente/add/item' : isVno ? '../api/v1/vente/add/vno' : '../api/v1/vente/add/assurance';

        if (!record) {
            produitCmp.focus(true, 100);
            return;
        }

        const stock = parseInt(record.get('intNUMBERAVAILABLE'));
        const boolDECONDITIONNE = parseInt(record.get('boolDECONDITIONNE'));
        const lgFAMILLEID = record.get('lgFAMILLEPARENTID');
        qte = parseInt(qte);

        if (qte > 999) {
            Ext.MessageBox.show({
                title: 'Message d\'erreur',
                width: 550,
                msg: "Impossible de saisir une quantit&eacute; sup&eacute;rieure &agrave; 1000",
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING,
                fn: function (buttonId) {
                    if (buttonId === "ok") {
                        produitCmp.focus(true, 100);
                    }
                }
            });
            return;
        }

        if (qte <= stock) {
            if (isVno) {
                me.addVenteVno(me.buildSaleParams(record, qte, typeVente), url, qtyField, produitCmp);
            } else {
                me.addVenteAssuarnce(me.buildSaleParams(record, qte, typeVente), url, qtyField, produitCmp);
            }
            return;
        }

        // qte > stock
        if (boolDECONDITIONNE === 1) {
            me.showYesNoPriority({
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

                                    if (qte < stockParent) {
                                        if (isVno) {
                                            me.addVenteVno(me.buildSaleParams(record, qte, typeVente), url, qtyField, produitCmp);
                                        } else {
                                            me.addVenteAssuarnce(me.buildSaleParams(record, qte, typeVente), url, qtyField, produitCmp);
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
                                                    produitCmp.focus(true, 100);
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
                                                produitCmp.focus(true, 100);
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
                        // annulation: retour champ produit, remise à zéro infos
                        qtyField.setValue(1);
                        me.resetProduitCombo(produitCmp);
                        produitCmp.focus(true, 100);
                        me.updateStockField(0);
                        me.getVnoemplacementField().setValue('');
                    }
                }
            }, [produitCmp, qtyField]);
        } else {
            me.showYesNoPriority({
                title: 'Ajout de produit',
                msg: 'Stock insuffisant, voulez-vous forcer le stock ?',
                buttons: Ext.MessageBox.YESNO,
                fn: function (button) {
                    if ('yes' === button) {
                        if (isVno) {
                            me.addVenteVno(me.buildSaleParams(record, qte, typeVente), url, qtyField, produitCmp);
                        } else {
                            me.addVenteAssuarnce(me.buildSaleParams(record, qte, typeVente), url, qtyField, produitCmp);
                        }
                    } else if ('no' === button) {
                        produitCmp.focus(true, 100);
                    }
                },
                icon: Ext.MessageBox.QUESTION
            }, [produitCmp, qtyField]);
        }
    },
    // Lit la valeur d'un combo de façon sûre : si le composant est
    // momentanément indisponible (ref ExtJS détruite), retourne la valeur par
    // défaut au lieu de lever une exception. À RÉSERVER aux chemins d'affichage
    // (calcul net, navigation) : ne JAMAIS l'utiliser pour décider du type d'une
    // vente qu'on enregistre (risque d'enregistrer le mauvais type).
    getSafeComboValue: function (getterName, defaultValue) {
        const me = this;
        const getter = me[getterName];
        if (!getter) {
            return defaultValue;
        }
        const cmp = getter.call(me);
        if (!cmp || cmp.destroyed || !cmp.getValue) {
            return defaultValue;
        }
        const value = cmp.getValue();
        return (value === null || value === undefined || value === '') ? defaultValue : value;
    },
    // Récupère le record produit déjà sélectionné SANS dépendre du store du
    // combo (qui peut être null). On le cherche dans la sélection courante,
    // puis dans lastSelection / valueModels (ExtJS 4), puis dans les stores
    // disponibles. Évite l'erreur "ds is null" dans findRecord.
    getSelectedProduitRecord: function (produitCmp) {
        if (!produitCmp) {
            return null;
        }
        const value = produitCmp.getValue ? produitCmp.getValue() : null;
        const matchesValue = function (record) {
            if (!record || !record.get) {
                return false;
            }
            return record.get('lgFAMILLEID') === value || record.get('intCIP') === value;
        };
        const selection = produitCmp.getSelection && produitCmp.getSelection();
        if (matchesValue(selection)) {
            return selection;
        }
        if (produitCmp.lastSelection && produitCmp.lastSelection.length && matchesValue(produitCmp.lastSelection[0])) {
            return produitCmp.lastSelection[0];
        }
        if (produitCmp.valueModels && produitCmp.valueModels.length && matchesValue(produitCmp.valueModels[0])) {
            return produitCmp.valueModels[0];
        }

        let stores = [];
        if (produitCmp.getStore && produitCmp.getStore()) {
            stores.push(produitCmp.getStore());
        }
        if (produitCmp.store && stores.indexOf(produitCmp.store) === -1) {
            stores.push(produitCmp.store);
        }
        if (produitCmp.getPicker && produitCmp.getPicker()) {
            const picker = produitCmp.getPicker();
            const pickerStore = picker && picker.getStore ? picker.getStore() : null;
            if (pickerStore && stores.indexOf(pickerStore) === -1) {
                stores.push(pickerStore);
            }
        }

        for (let i = 0; i < stores.length; i++) {
            const store = stores[i];
            if (!store || !store.findRecord) {
                continue;
            }
            const record = store.findRecord('lgFAMILLEID', value, 0, false, false, true)
                    || store.findRecord('intCIP', value, 0, false, false, true);
            if (record) {
                return record;
            }
        }
        return null;
    },
    // Reconstruit la zone de vente (#contenu) en place lorsqu'un combo ou son
    // store a été détruit/perdu. Évite à l'utilisateur de devoir recharger la
    // page ou vider le cache pour que la validation par ENTRÉE refonctionne.
    recoverVenteView: function () {
        const me = this;
        const contenu = me.getContenu && me.getContenu();
        if (!contenu || contenu.destroyed) {
            return false;
        }
        try {
            const vente = me.getCurrent && me.getCurrent();
            contenu.removeAll();
            const vno = Ext.create('testextjs.view.vente.VenteVNO');
            contenu.add(vno);
            if (vente && vente.lgPREENREGISTREMENTID) {
                // Vente en cours : on recharge ses données (le panier est
                // persisté côté serveur, rien n'est perdu).
                me.loadVenteData(vente.lgPREENREGISTREMENTID);
            } else {
                me.updateComboxFields(null, null, null, null, null);
            }
            const produit = me.getVnoproduitCombo && me.getVnoproduitCombo();
            if (produit) {
                produit.focus(true, 200);
            }
            return true;
        } catch (e) {
            return false;
        }
    },
    onProduitSpecialKey: function (combo, e) {
        const me = this;

        // ✅ Sécuriser l'accès au combo Type de vente (évite l'exception
        // "me.getTypeVenteCombo() is undefined" qui bloquait la saisie produit)
        const typeVenteCmp = me.getTypeVenteCombo && me.getTypeVenteCombo();
        if (!typeVenteCmp) {
            me.recoverVenteView();
            return false;
        }
        // contrôle client inchangé
        const typeVente = typeVenteCmp.getValue();
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

        if (e.getKey() !== e.ENTER) {
            return;
        }

        // 1) Si la liste est ouverte, on évite toute validation en arrière plan
        const store = (combo.getStore) ? combo.getStore() : combo.store;

        if (combo.isExpanded && store) {
            const count = store.getCount ? store.getCount() : 0;

            // ✅ si 1 seul résultat, on sélectionne automatiquement
            if (count === 1) {
                e.stopEvent();
                const rec = store.getAt(0);
                combo.select(rec);
                combo.collapse();

                const vnoemplacementId = me.getVnoemplacementField();
                me.updateStockField(rec.get('intNUMBERAVAILABLE'));
                vnoemplacementId.setValue(rec.get('strLIBELLEE'));
                me.getVnoqtyField().focus(true, 100);
                return;
            }

            // ✅ si plusieurs résultats : on laisse l’utilisateur choisir (ne pas basculer en quantité)
            e.stopEvent();
            return;
        }

        // 2) Si vide => compute net (comportement existant)
        const v = combo.getValue();
        if (v === null || String(v).trim() === "") {
            let selection = [];
            try {
                selection = combo.getPicker().getSelectionModel().getSelection();
            } catch (e2) {
            }
            if (!selection || selection.length <= 0) {
                me.onComputeNet();
            }
            return;
        }

        // 3) Si valeur présente, chercher le record dans le store
        const record = store ? (
                store.findRecord("lgFAMILLEID", combo.getValue(), 0, false, false, true)
                || store.findRecord("intCIP", combo.getValue(), 0, false, false, true)
                ) : null;

        if (record) {
            const vnoemplacementId = me.getVnoemplacementField();
            me.updateStockField(record.get('intNUMBERAVAILABLE'));
            vnoemplacementId.setValue(record.get('strLIBELLEE'));
            me.getVnoqtyField().focus(true, 100);
        } else {
            // ✅ si pas trouvé localement => douchette (API)
            me.checkDouchette(combo, true);
        }
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
                if (!produitCmp) {
                    // Combo produit introuvable (zone de vente corrompue) :
                    // on reconstruit la zone en place plutôt que d'imposer
                    // un rechargement de la page.
                    me.recoverVenteView();
                    return;
                }

                // ✅ Récupère le produit déjà sélectionné SANS dépendre du store
                // (évite "ds is null" dans findRecord).
                let record = me.getSelectedProduitRecord(produitCmp);
                if (!record) {
                    // Aucun record récupérable (store ET sélection perdus) :
                    // dernier recours, on reconstruit la zone de vente en place
                    // pour rétablir le fonctionnement SANS recharger la page.
                    me.recoverVenteView();
                    return;
                }

                // ✅ Type de vente : sécurisé SANS défaut deviné. C'est un chemin
                // d'enregistrement : si le combo est perdu, on reconstruit plutôt
                // que de risquer d'enregistrer la vente avec le mauvais type.
                const typeVenteCmp = me.getTypeVenteCombo && me.getTypeVenteCombo();
                if (!typeVenteCmp) {
                    me.recoverVenteView();
                    return;
                }
                const typeVente = typeVenteCmp.getValue();
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
                            me.showYesNoPriority({
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
                            }, [produitCmp, field]);
                        } else {
                            me.showYesNoPriority({
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
                            }, [produitCmp, field]);
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

                    // ✅ IMPORTANT : après ajout article, forcer recalcul net
                    me.toRecalculate = true;
                    me.netAmountToPay = null;

                    me.getTotalField().setValue(me.getCurrent().intPRICE);
                    field.setValue(1);
                    me.resetProduitCombo(comboxProduit);
                    comboxProduit.focus(true, 100, function () {
                    });
                    me.refresh();
                    // comptant : net à payer recalculé automatiquement à chaque ajout
                    me.autoComputeNetVno();
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
    /*
     * Calcul silencieux du net à payer (vente comptant uniquement) : même
     * appel que le bouton AFFICHER NET mais sans popup d'attente ni vol de
     * focus, pour ne pas ralentir la vente au scan. Réapplique ensuite le
     * mode de règlement courant (montant forcé / complément du fractionné).
     */
    autoComputeNetVno: function (onDone) {
        const me = this, vente = me.getCurrent();
        const typeVente = me.getSafeComboValue('getTypeVenteCombo', '1');
        if (typeVente !== '1' || !vente) {
            return;
        }
        const data = {"remiseId": me.getVnoremise().getValue(), "venteId": vente.lgPREENREGISTREMENTID,
            "checkUg": me.getCheckUg()};
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/vente/net/vno',
            params: Ext.JSON.encode(data),
            success: function (response) {
                const result = Ext.JSON.decode(response.responseText, true);
                if (result && result.success) {
                    me.netAmountToPay = result.data;
                    me.toRecalculate = false;
                    const montantNet = me.getNetAmountToPay().montantNet;
                    me.getMontantNet().setValue(montantNet);
                    me.getVnomontantRemise().setValue(me.getNetAmountToPay().remise);
                    if (me.getExtraModeReglementId()) {
                        // fractionné en cours : on recalcule le complément sans
                        // écraser la part principale saisie
                        me.handleExtraAmountInputValue();
                    } else {
                        me.handleMontantField(montantNet);
                    }
                    if (Ext.isFunction(onDone)) {
                        onDone();
                    }
                }
            },
            failure: function () {
                // silencieux : le bouton AFFICHER NET A PAYER reste disponible
            }
        });
    },
    /*
     * Calcul silencieux du net à payer (vente assurance/carnet) : même appel
     * que AFFICHER NET mais sans popup, sans message ni vol de focus. Les
     * contrôles bloquants (n° de bon, tiers-payant) restent portés par le
     * bouton et la clôture : ici on passe simplement si la vente n'est pas
     * prête (pas de tiers-payant).
     */
    autoComputeNetAssurance: function (onDone) {
        const me = this, vente = me.getCurrent();
        const typeVente = me.getSafeComboValue('getTypeVenteCombo', '1');
        if ((typeVente !== '2' && typeVente !== '3') || !vente) {
            return;
        }
        const tierspayants = me.buildAssuranceData();
        if (!tierspayants || tierspayants.length === 0) {
            return;
        }
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/vente/net/assurance',
            params: Ext.JSON.encode({"remiseId": me.getVnoremise().getValue(),
                "venteId": vente.lgPREENREGISTREMENTID, "tierspayants": tierspayants}),
            success: function (response) {
                const result = Ext.JSON.decode(response.responseText, true);
                if (result && result.success) {
                    me.netAmountToPay = result.data;
                    me.toRecalculate = false;
                    const montantNet = me.getNetAmountToPay().montantNet;
                    me.getMontantNet().setValue(montantNet);
                    me.getVnomontantRemise().setValue(me.getNetAmountToPay().remise);
                    me.getMontantTp().setValue(me.getNetAmountToPay().montantTp);
                    me.handleMontantField(montantNet);
                    if (Ext.isFunction(onDone)) {
                        onDone();
                    }
                }
            },
            failure: function () {
                // silencieux : le bouton AFFICHER NET A PAYER reste disponible
            }
        });
    },
    /*
     * Recalcul du net après une modification de la vente dans la grille
     * (prix, quantité, suppression) — dispatch selon le type de vente.
     */
    autoComputeNetAfterChange: function () {
        const me = this;
        const typeVente = me.getSafeComboValue('getTypeVenteCombo', '1');
        if (typeVente === '1') {
            me.autoComputeNetVno();
        } else if (typeVente === '2' || typeVente === '3') {
            me.autoComputeNetAssurance();
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

            // Chemin de clôture (soumission) : si l'un des combos décisifs est
            // perdu, on NE devine PAS de valeur (risque d'enregistrer une vente
            // erronée). On reconstruit la zone de vente et on abandonne la
            // clôture proprement plutôt que de figer ou de soumettre faux.
            const typeVenteCmpC = me.getTypeVenteCombo && me.getTypeVenteCombo();
            const natureCmpC = me.getNatureCombo && me.getNatureCombo();
            const userCmpC = me.getUserCombo && me.getUserCombo();
            if (!typeVenteCmpC || !natureCmpC || !userCmpC) {
                me.recoverVenteView();
                return false;
            }

            let typeVenteCombo = typeVenteCmpC.getValue(),
                    remiseId = me.getVnoremise().getValue(),
                    natureCombo = natureCmpC.getValue(),
                    userCombo = userCmpC.getValue(),
                    montantRecu = me.getMontantRecu().getValue();
            let montantExtra = 0;
            const montantExtraCmp = me.getMontantExtra();
            if (!montantExtraCmp?.hidden) {
                montantExtra = parseInt(montantExtraCmp.getValue());

            }
            montantRecu += montantExtra;
            if (typeRegleId === '1' && parseInt(montantRecu) < parseInt(netTopay)) {
                if (me.getExtraModeReglementId()) {
                    // un second mode est déjà choisi : le total saisi ne couvre pas le net
                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 550,
                        msg: 'Le total espèces + mode mobile est inférieur au net à payer de <span style="color: black; font-size: 1rem;font-weight: 900;">' + Ext.util.Format.number(netTopay, '0,000.') + '</span>',
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR,
                        fn: function (buttonId) {
                            if (buttonId === "ok") {
                                me.getMontantRecu().focus(true, 50);
                            }
                        }
                    });
                    return false;
                }
                me.handleExtraModePayment(netTopay);

                return false;
            } else if (typeRegleId === '1' && me.getExtraModeReglementId()
                    && montantExtra > parseInt(netTopay)) {
                // défensif : jamais de monnaie sur la part mobile
                Ext.MessageBox.show({
                    title: 'Message d\'erreur',
                    width: 550,
                    msg: 'Le montant du mode mobile ne peut pas dépasser le net à payer',
                    buttons: Ext.MessageBox.OK,
                    icon: Ext.MessageBox.ERROR
                });
                return false;
            } else if (typeRegleId === '1' && me.getExtraModeReglementId()
                    && ((parseInt(me.getMontantRecu().getValue(), 10) || 0) <= 0
                            || (montantExtra > 0 && montantExtra >= parseInt(netTopay)))) {
                // Symétrique du contrôle mobile + mobile (les deux parts > 0) :
                // pas de clôture espèces + mobile avec une part espèces nulle —
                // montant reçu vide/0, ou part mobile couvrant tout le net
                // (la part espèces encaissée serait 0 : vente 100% mobile
                // à passer par le mode mobile principal)
                me.showMontantRecuRequisMessage();
                return false;
            } else if (me.isMobileMode(typeRegleId) && me.getExtraModeReglementId()) {
                // Fractionnement mobile + mobile : la somme des deux parts doit
                // couvrir exactement le net à payer (pas de monnaie sur du mobile)
                const partPrincipale = parseInt(me.getMontantRecu().getValue()) || 0;
                if (montantExtra === 0 && partPrincipale === parseInt(netTopay)) {
                    // Le mode principal couvre finalement tout : retour au mono-règlement
                    me.resetExtraModeCmp();
                } else if (partPrincipale <= 0 || montantExtra <= 0
                        || (partPrincipale + montantExtra) !== parseInt(netTopay)) {
                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 550,
                        msg: 'La somme des deux modes de règlement doit être égale au net à payer de <span style="color: black; font-size: 1rem;font-weight: 900;">' + Ext.util.Format.number(netTopay, '0,000.') + '</span>',
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR,
                        fn: function (buttonId) {
                            if (buttonId === "ok") {
                                me.getMontantRecu().focus(true, 50);
                            }
                        }
                    });
                    return false;
                }
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
                        me.openClientLambdaSearchWindow();


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
        // Paiement fractionné mobile + mobile : uniquement pour la vente comptant
        const typeVenteCmp = me.getTypeVenteCombo && me.getTypeVenteCombo();
        if (typeVenteCmp && typeVenteCmp.getValue() === '1') {
            me.getBtnExtraMode()?.show();
        }
    },

    isMobileMode: function (typeRegleId) {
        return this.mobileModeIds.indexOf(typeRegleId) !== -1;
    },

    onBtnExtraModeClick: function () {
        const me = this;
        if (!me.getNetAmountToPay()) {
            Ext.MessageBox.show({
                title: 'Message',
                width: 550,
                msg: 'Veuillez ajouter des produits à la vente avant de fractionner le règlement',
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING,
                fn: function (buttonId) {
                    if (buttonId === "ok") {
                        me.getVnoproduitCombo().focus(true, 100);
                    }
                }
            });
            return;
        }
        const typeRegle = me.getVnotypeReglement().getValue();
        Ext.create('testextjs.view.vente.ReglementGrid', {
            title: 'AJOUTEZ UN AUTRE MODE MOBILE',
            excludeModeId: typeRegle,
            onlyModeIds: me.mobileModeIds
        }).show();
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
                me.openClientLambdaSearchWindow();
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
        const value = field.getValue().trim();
        // Garde-fou : aucun produit dans la vente → on refuse le choix du
        // mode et on revient à la valeur précédente (évite tout plantage)
        if (!me.getCurrent() && value !== '1') {
            field.setValue(me._appliedTypeReglement || '1');
            Ext.MessageBox.show({
                title: 'Message',
                width: 550,
                msg: 'Veuillez ajouter des produits à la vente avant de choisir le mode de règlement',
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING,
                fn: function (buttonId) {
                    if (buttonId === "ok") {
                        me.getVnoproduitCombo().focus(true, 100);
                    }
                }
            });
            return;
        }
        me.resetExtraModeCmp();
        // Si le net n'est pas encore calculé (produits ajoutés sans passer
        // par AFFICHER NET), on le calcule automatiquement puis on réapplique
        // le mode choisi — comptant ET assurance/carnet. _skipAutoNet évite
        // de boucler à la ré-entrée si le calcul est impossible.
        const typeVenteCourant = me.getSafeComboValue('getTypeVenteCombo', '1');
        if (me.getCurrent() && (me.toRecalculate || !me.netAmountToPay) && !me._skipAutoNet) {
            const reApply = function () {
                me._skipAutoNet = true;
                me.typeReglementSelectEvent(field);
                me._skipAutoNet = false;
            };
            if (typeVenteCourant === '1') {
                me.autoComputeNetVno(reApply);
                return;
            }
            if (typeVenteCourant === '2' || typeVenteCourant === '3') {
                me.autoComputeNetAssurance(reApply);
                return;
            }
        }
        // Mode en place avant cette sélection : point de retour du rollback
        me._previousTypeReglement = me._appliedTypeReglement || '1';
        // Cette sélection va-t-elle ouvrir la fenêtre « client lié » ? Si oui
        // et que l'utilisateur clique Annuler, on défera tout (rollback).
        me._pendingModeNeedsClient = Ext.isEmpty(me.getClient())
                && (value === '4' || value === '2' || value === '3' || value === '6' || me.isMobileMode(value));
        if (value === '1') {
            me.getMontantRecu().enable();
            me.getMontantRecu().setReadOnly(false);
            me.showAndHideCbInfos(value);

        } else if (value === '4') {
            me.getMontantRecu().enable();
            me.showAndHideInfosStandardClient(true);
            me.getMontantRecu().setReadOnly(false);
            me.getCbContainer().hide();
        } else if (me.isMobileMode(value)) {
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
        // Mode réellement appliqué : sert de point de retour au garde-fou
        // « sans produit » et au rollback du bouton Annuler (fenêtre client)
        me._appliedTypeReglement = value;
    }
    ,
    // Utilitaire: focus + sélection du texte sur Montant Reçu
    focusSelectMontantRecu: function () {
        const me = this;
        const field = me.getMontantRecu ? me.getMontantRecu() : null;
        if (!field) {
            return;
        }
        field.focus(false, 50);
        Ext.defer(function () {
            try {
                if (field.selectText) {
                    field.selectText();
                } else if (field.inputEl && field.inputEl.dom) {
                    field.inputEl.dom.select();
                }
            } catch (e) {
            }
        }, 80);
    },

    // Utilitaire: après un "Annuler" sur une alerte de sécurité, on empêche toute boucle
    // tant que l'utilisateur n'a pas modifié la valeur du champ.
    // - bloque la validation
    // - garde le focus + sélection
    blockMontantRecuUntilChange: function (rawValue, message) {
        const me = this;
        const field = me.getMontantRecu ? me.getMontantRecu() : null;
        if (!field) {
            return;
        }
        field._blockedSecurityValue = String(rawValue || '');
        if (message) {
            try {
                field.markInvalid(message);
            } catch (e) {
            }
        }
        if (me.getVnobtnCloture) {
            try {
                me.getVnobtnCloture().disable();
            } catch (e) {
            }
        }
        me.focusSelectMontantRecu();
    },

    // Utilitaire: mettre le focus par défaut sur le bouton "Annuler" (NO) d'une MessageBox
    // Objectif: si l'utilisateur appuie sur Entrée par erreur => on annule toujours.
    focusMsgBoxCancelButton: function () {
        Ext.defer(function () {
            try {
                const dlg = Ext.Msg.getDialog ? Ext.Msg.getDialog() : null;
                // Ext.MessageBox expose souvent getButton('no') (plus fiable que query itemId)
                const btn = dlg && dlg.getButton ? (dlg.getButton('no') || dlg.getButton('cancel')) : null;
                const btnFallback = !btn && dlg ? (dlg.down('button[itemId=no]') || dlg.down('button[itemId=cancel]')) : null;
                const target = btn || btnFallback;
                if (target) {
                    target.focus();
                    if (target.el && target.el.dom) {
                        target.el.dom.focus();
                    }
                }
            } catch (e) {
            }
        }, 120);
    },

    // Wrapper: contrôle anti-scan + confirmation à 5 chiffres

    montantRecuChangeListener: function (field, value, options) {
        const me = this;

        // Normalise la saisie (ne garde que les chiffres)
        const raw = String(field.getValue() || '').replace(/\D/g, '');
        const digits = raw.length;

        // Vide => laisse la logique existante gérer (désactivation etc.)
        if (digits === 0) {
            field.clearInvalid();
            field._confirmedMaxDigitsValue = null;
            field._blockedSecurityValue = null;
            return me.montantRecuChangeCore(field, value, options);
        }

        // Fractionnement mobile : plafond ABSOLU au net à payer, appliqué avant
        // toute autre voie (anti-scan, confirmations...) — pas de monnaie sur
        // mobile, seul un retour en espèces permet de dépasser
        if (me.getExtraModeReglementId() && me.isMobileMode(me.getVnotypeReglement().getValue())) {
            const dataSplit = me.getNetAmountToPay ? me.getNetAmountToPay() : null;
            const netSplit = dataSplit && dataSplit.montantNet != null ? parseInt(dataSplit.montantNet, 10) : 0;
            if (netSplit > 0 && (parseInt(raw, 10) || 0) > netSplit) {
                field.setValue(netSplit); // re-déclenche le change avec la valeur plafonnée
                return;
            }
        }

        // Si l'utilisateur a cliqué "Annuler" sur une alerte de sécurité,
        // on ne relance aucune popup tant que la valeur n'a pas changé.
        if (field._blockedSecurityValue && String(field._blockedSecurityValue) === raw) {
            return;
        } else if (field._blockedSecurityValue && String(field._blockedSecurityValue) !== raw) {
            field._blockedSecurityValue = null;
        }

        // Blocage net si > max digits (probable scan code-barres)
        if (digits > me.antiBarcodeMaxDigits) {
            field.markInvalid('Quantité trop grande ! (Code barre scanné ?)');
            if (me.getVnobtnCloture) {
                me.getVnobtnCloture().disable();
            }
            return;
        }

        // 5 digits atteint => demander confirmation (uniquement si la saisie dépasse le montant de la vente)
        const data = me.getNetAmountToPay ? me.getNetAmountToPay() : null;
        const netTopay = data && data.montantNet != null ? parseInt(data.montantNet, 10) : 0;
        const numericValue = parseInt(raw, 10) || 0;
        const exceedsSaleAmount = netTopay > 0 && numericValue > netTopay;

        // ✅ Protection "monnaie à rendre" : si la monnaie dépasse le seuil -> quasi certain scan/erreur
        const monnaieARendre = (netTopay > 0 && numericValue > netTopay) ? (numericValue - netTopay) : 0;
        if (field && monnaieARendre > me.maxChangeAllowed && me._changeConfirmedForValue !== raw) {
            Ext.Msg.show({
                title: 'Alerte',
                msg: '⚠️ Monnaie à rendre anormalement élevée : ' + monnaieARendre + ' (seuil ' + me.maxChangeAllowed + ').\n' +
                        'Montant reçu : ' + raw + ' / Montant vente : ' + netTopay + '.\n' +
                        'Probable scan ou erreur de saisie. Confirmez-vous ?',
                buttons: Ext.Msg.YESNO,
                icon: Ext.Msg.ERROR,
                defaultFocus: 'no',
                buttonText: {yes: 'Confirmer quand même', no: 'Annuler'},
                fn: function (btn) {
                    if (btn === 'yes') {
                        me._changeConfirmedForValue = raw;
                        // Ne pas relancer automatiquement ici (évite boucle de confirmations)
                        me.focusSelectMontantRecu();
                    } else {
                        me._changeConfirmedForValue = null;
                        me.blockMontantRecuUntilChange(raw, 'Saisie annulée. Corrigez le montant reçu.');
                    }
                }
            });
            me.focusMsgBoxCancelButton(); // focus par défaut sur Annuler
            return;
        }

        if (me.confirmAtMaxDigits
                && digits === me.antiBarcodeMaxDigits
                && exceedsSaleAmount
                && field._confirmedMaxDigitsValue !== raw) {
            Ext.Msg.show({
                title: 'Confirmation',
                msg: '⚠️ Montant à 5 chiffres détecté (' + raw + ') et supérieur au montant de la vente (' + netTopay + '). Confirmez-vous ?',
                buttons: Ext.Msg.YESNO,
                icon: Ext.Msg.WARNING,
                defaultFocus: 'no',
                buttonText: {yes: 'Confirmer quand même', no: 'Annuler'},
                fn: function (btn) {
                    if (btn === 'yes') {
                        field._confirmedMaxDigitsValue = raw;
                        field.clearInvalid();
                        // relance la logique existante après confirmation
                        me.montantRecuChangeCore(field, value, options);
                        me.focusSelectMontantRecu();
                    } else {
                        // Pas confirmé => on laisse la valeur pour correction, et on reposera la question si nécessaire
                        field._confirmedMaxDigitsValue = null;
                        me.blockMontantRecuUntilChange(raw, 'Saisie annulée. Corrigez le montant reçu.');
                    }
                }
            });
            me.focusMsgBoxCancelButton(); // focus par défaut sur Annuler
            return;
        }

        // OK => continue
        field.clearInvalid();
        return me.montantRecuChangeCore(field, value, options);
    },

    montantRecuChangeCore: function (field, value, options) {
        const me = this, typeRegle = me.getVnotypeReglement().getValue();
        const montantRecu = parseInt(field.getValue());
        const data = me.getNetAmountToPay();
        // Fractionnement mobile : pas de monnaie possible, la saisie est
        // plafonnée au net à payer (on répartit entre 2 modes, sans dépasser)
        if (me.getExtraModeReglementId() && me.isMobileMode(typeRegle) && data) {
            const netTopay = parseInt(data.montantNet);
            if (montantRecu > netTopay) {
                field.setValue(netTopay); // re-déclenche le change avec la valeur plafonnée
                return;
            }
        }
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
                            emptyText: 'Rechercher un client (2 caractères)',
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
    /*
     * Ouvre la fenêtre « client lié » en mode recherche avec le focus
     * directement dans le champ de saisie : la caissière tape le nom
     * sans avoir à cliquer dans le champ.
     */
    openClientLambdaSearchWindow: function () {
        const me = this;
        const win = Ext.create('testextjs.view.vente.user.ClientLambda');
        win.add(me.buildLambdaClientGrid());
        win.show();
        const queryField = win.down('#queryClientLambda');
        if (queryField) {
            queryField.focus(false, 150);
            // Ceinture et bretelles : certains enchaînements asynchrones
            // (calcul du net, listeners du mode) peuvent reprendre le focus
            // après coup — on le réaffirme une fois la poussière retombée.
            Ext.defer(function () {
                if (!queryField.destroyed && !queryField.hasFocus) {
                    queryField.focus();
                }
            }, 450);
        }
    },
    /*
     * Focus sur la zone d'encaissement.
     * Flux espèces + mobile (comptant), part mobile non confirmée : le focus
     * arrive dans le champ mobile pré-rempli avec le complément — la caissière
     * le valide par Entrée (ou le corrige) ; la part est alors verrouillée et
     * le focus revient dans le montant reçu où la saisie des espèces tendues
     * ne recalcule plus que la monnaie.
     * Tous les autres cas (part déjà confirmée, mobile + mobile...) : montant
     * reçu, comme avant — Entrée y valide la vente.
     */
    focusEncaissement: function () {
        const me = this;
        const montantExtra = me.getMontantExtra();
        if (me.getExtraModeReglementId()
                && me.getVnotypeReglement().getValue() === '1'
                && !me.extraModeManualAmount
                && montantExtra && montantExtra.isVisible() && !montantExtra.readOnly) {
            montantExtra.focus(true, 100);
            return;
        }
        me.getMontantRecu().focus(true, 100);
    },
    /*
     * Après une action sur le client (sélection, création, annulation de la
     * fenêtre) : si un second mode de règlement est engagé on revient à
     * l'encaissement, sinon comportement historique (champ produit).
     */
    focusAfterClientAction: function () {
        const me = this;
        if (me.getExtraModeReglementId()) {
            me.focusEncaissement();
        } else {
            me.getVnoproduitCombo().focus(true, 100);
        }
    },
    onCancelClientLambda: function () {
        const me = this;
        me.closeClientLambdaWindow();
        if (me._pendingModeNeedsClient && Ext.isEmpty(me.getClient())) {
            // Annuler pendant un choix de mode nécessitant un client :
            // on défait tout, comme si le mode n'avait jamais été choisi
            me._pendingModeNeedsClient = false;
            me.rollbackModeSelection();
            return;
        }
        me.focusAfterClientAction();
    },
    /*
     * Retour complet à l'état d'avant la sélection du mode de règlement :
     * combo sur le mode précédent, champ complément mobile masqué et
     * reverrouillé, bloc chèque/CB masqué, bloc client masqué si aucun
     * client, montant reçu déverrouillé.
     */
    rollbackModeSelection: function () {
        const me = this;
        const previous = me._previousTypeReglement || '1';
        const combo = me.getVnotypeReglement();
        combo.suspendEvents(false);
        combo.setValue(previous);
        combo.resumeEvents();
        me._appliedTypeReglement = previous;
        me.resetExtraModeCmp();
        me.getCbContainer().hide();
        me.showAndHideInfosStandardClient(false);
        const recu = me.getMontantRecu();
        recu.enable();
        if (previous === '1' || previous === '4' || previous === '6') {
            recu.setReadOnly(false);
        }
        recu.focus(true, 100);
    },
    updateClientStandard: function (record) {
        const me = this;
        me._pendingModeNeedsClient = false; // un client est choisi : plus de rollback
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
                    // Retour contextuel : encaissement si un second mode de
                    // règlement est engagé, sinon champ produit (historique)
                    me.focusAfterClientAction();

                } else {

                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 550,
                        msg: result.msg,
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR,
                        fn: function (buttonId) {
                            if (buttonId === "ok") {
                                me.focusAfterClientAction();
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
                        me._pendingModeNeedsClient = false; // client créé : plus de rollback
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

    /**
     * Recherche automatique des 2 caracteres saisis dans la fenetre « Ajouter un client a la
     * vente » (mobile money, differe, avoir). Le seuil evite d'interroger le serveur sur une
     * seule lettre, qui ramenerait presque tout le fichier client ; le buffer declare a
     * l'ecoute de l'evenement laisse finir la frappe, pour n'envoyer qu'une requete.
     *
     * En dessous de 2 caracteres on ne fait rien : la grille garde le dernier resultat plutot
     * que de se vider sous les yeux de la caissiere pendant qu'elle corrige sa saisie.
     */
    onQueryClientLambdaKeyUp: function (field, e) {
        if (e.getKey() === e.ENTER) {
            // Deja traite par specialkey : ne pas lancer deux fois la meme recherche.
            return;
        }
        if ((field.getValue() || '').trim().length < 2) {
            return;
        }
        this.queryClientLambda();
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
                                                    me.autoComputeNetAfterChange();
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
                        me.autoComputeNetAfterChange();

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

        // --- Type règlement ---
        const regCmp = me.getVnotypeReglement && me.getVnotypeReglement();
        const _typeReglementId = (typeReglementId ? typeReglementId : '1');
        if (regCmp && !regCmp.destroyed) {
            regCmp.getStore().load({
                scope: me,
                callback: function () {
                    const cmp = me.getVnotypeReglement && me.getVnotypeReglement();
                    if (!cmp || cmp.destroyed) {
                        return;
                    }
                    cmp.setValue(_typeReglementId);
                    me._appliedTypeReglement = _typeReglementId;
                    // setValue ne déclenche pas l'événement select : on
                    // réapplique l'état d'écran du mode restauré (montant
                    // forcé/verrouillé, bloc chèque/CB, bouton mobile...)
                    if (_typeReglementId !== '1' && me.getCurrent()) {
                        me.typeReglementSelectEvent(cmp);
                    }
                }
            });
        }

        // --- Type vente / Nature vente ---
        const _typeVenteId = (lgTYPEVENTEID ? lgTYPEVENTEID : '1');
        const _natureVenteId = (lgNATUREVENTEID ? lgNATUREVENTEID : '1');

        const typeVenteCmp = me.getTypeVenteCombo && me.getTypeVenteCombo();
        if (typeVenteCmp && !typeVenteCmp.destroyed) {
            typeVenteCmp.getStore().load({
                scope: me,
                callback: function () {
                    const cmp = me.getTypeVenteCombo && me.getTypeVenteCombo();
                    if (!cmp || cmp.destroyed) {
                        return;
                    }
                    cmp.setValue(_typeVenteId);
                }
            });
        }

        const natureCmp = me.getNatureCombo && me.getNatureCombo();
        if (natureCmp && !natureCmp.destroyed) {
            natureCmp.getStore().load({
                scope: me,
                callback: function () {
                    const cmp = me.getNatureCombo && me.getNatureCombo();
                    if (!cmp || cmp.destroyed) {
                        return;
                    }
                    cmp.setValue(_natureVenteId);
                }
            });
        }

        // --- Vendeur ---
        const userCmp = me.getUserCombo && me.getUserCombo();
        if (lgUSERVENDEURID) {
            if (userCmp && !userCmp.destroyed) {
                userCmp.getStore().load({
                    scope: me,
                    callback: function () {
                        const cmp = me.getUserCombo && me.getUserCombo();
                        if (!cmp || cmp.destroyed) {
                            return;
                        }
                        cmp.setValue(lgUSERVENDEURID);
                    }
                });
            }
        } else {
            if (userCmp && !userCmp.destroyed) {
                userCmp.clearValue();
                userCmp.setValue(null);
            }
        }

        // --- Remise ---
        const remiseCmp = me.getVnoremise && me.getVnoremise();
        if (lgREMISEID) {
            if (remiseCmp && !remiseCmp.destroyed) {
                remiseCmp.getStore().load({
                    scope: me,
                    callback: function () {
                        const cmp = me.getVnoremise && me.getVnoremise();
                        if (!cmp || cmp.destroyed) {
                            return;
                        }
                        cmp.setValue(lgREMISEID);
                    }
                });
            }
        } else {
            if (remiseCmp && !remiseCmp.destroyed) {
                remiseCmp.clearValue();
                remiseCmp.setValue(null);
            }
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
        // Abandon d'une modification de vente clôturée : la copie en attente est supprimée pour ne pas
        // laisser traîner une vente orpheline qu'un autre utilisateur pourrait reprendre et clôturer.
        // (Le bouton ATTENTE reste le moyen de conserver volontairement la copie.)
        if (me.getCategorie() === 'COPY' && me.current && me.current.lgPREENREGISTREMENTID) {
            const copieId = me.current.lgPREENREGISTREMENTID;
            Ext.Ajax.request({
                method: 'DELETE',
                url: '../api/v1/vente/copie/' + copieId,
                callback: function () {
                    me.resetAll();
                    testextjs.app.getController('App')
                            .onLoadNewComponentWithDataSource('cloturerventemanager', "", "", "");
                }
            });
            return;
        }
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
                    // Vente en attente : pas encore de règlements en base, on
                    // restaure le mode mémorisé à la mise en attente : d'abord
                    // celui persisté côté serveur, sinon celui du poste (localStorage)
                    let typeReglementARestaurer = me.getTypeReglementToDisplay(reglements);
                    if ((!reglements || reglements.length === 0) && typeReglementARestaurer === '1') {
                        typeReglementARestaurer = record.typeReglementAttente
                                || me.getRememberedPreventeMode(record.lgPREENREGISTREMENTID)
                                || typeReglementARestaurer;
                    }
                    me.updateComboxFields(lgTYPEVENTEID, lgNATUREVENTEID, lgUSERVENDEURID, typeReglementARestaurer, lgREMISEID);
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
        me._pendingModeNeedsClient = false;
        me._appliedTypeReglement = '1';
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
    /**
     * Caisse fermee au moment de valider : plutot que d'annoncer l'impasse et de laisser l'operateur
     * quitter la vente pour aller au menu, on propose de l'ouvrir sur place. La reponse "oui" ouvre
     * l'ecran d'ouverture de caisse en fenetre modale, exactement comme si on s'y etait rendu.
     *
     * Meme motif que DoReglement.afficherErreurReglement, qui traitait deja ce cas cote reglement de
     * facture : un seul comportement pour une meme situation.
     */
    /*
     * Finalisation d'une vente, la caisse etant ouverte. Extrait tel quel du gestionnaire du bouton
     * « Terminer la vente » pour pouvoir etre rejoue apres une ouverture de caisse faite depuis la vente.
     */
    finaliserVenteCaisseOuverte: function (typeVenteCombo, typeRegle) {
        const me = this;
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
    },

    proposerOuvertureCaisse: function (suite) {
        const me = this;
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
                items: [{xtype: 'ouverturecaissemanger'}],
                listeners: {
                    /*
                     * La fenetre refermee, la caisse vient peut-etre d'etre ouverte : on relit son
                     * etat avant de reprendre. Sans cela l'ecran de vente gardait « caisse fermee »
                     * en memoire et reposait la meme question a chaque clic sur « Terminer la vente ».
                     */
                    close: function () {
                        me.cheickCaisse(suite);
                    }
                }
            }).show();
        });
    },

    onQueryClientAssurance: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            this.rechercherClientAssurance(field);
        }
    },

    /**
     * Recherche automatique des 2 caracteres saisis. Le seuil evite d'interroger le serveur sur une
     * seule lettre, qui ramenerait presque tout le fichier client ; le buffer declare a l'ecoute de
     * l'evenement laisse finir la frappe, pour n'envoyer qu'une requete.
     *
     * En dessous de 2 caracteres on ne fait rien : la grille garde le dernier resultat plutot que de
     * se vider sous les yeux de la caissiere pendant qu'elle corrige sa saisie.
     */
    onQueryClientAssuranceKeyUp: function (field, e) {
        if (e.getKey() === e.ENTER) {
            // Deja traite par specialkey : ne pas lancer deux fois la meme recherche.
            return;
        }
        if ((field.getValue() || '').trim().length < 2) {
            return;
        }
        this.rechercherClientAssurance(field);
    },

    /** Chemin unique de recherche : bouton, touche Entree et saisie automatique passent tous par ici. */
    rechercherClientAssurance: function (field) {
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
                    text: 'Ajouter une Assurance complémentaire',
                    icon: 'resources/images/icons/fam/add.png',
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
                            fieldStyle: "color:blue;font-weight:bold;",
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
                            fieldStyle: "color:blue;font-weight:bold;",
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
                            fieldLabel: 'Numéro de bon:',
                            allowBlank: true,
                            labelWidth: 100,
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
                            icon: 'resources/images/icons/fam/delete.png',
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

    // Wrapper: confirmation montant élevé + sécurité anti-scan avant clôture
    doCloture: function () {
        const me = this;

        const field = me.getMontantRecu ? me.getMontantRecu() : null;
        const raw = field ? String(field.getValue() || '').replace(/\D/g, '') : '';
        const digits = raw.length;

        // Si un "Annuler" de sécurité est actif pour cette valeur => stop (évite boucle)
        if (field && field._blockedSecurityValue && String(field._blockedSecurityValue) === raw) {
            me.focusSelectMontantRecu();
            return;
        }

        // Si invalide (anti-scan) => stop
        if (field && digits > 0 && digits > me.antiBarcodeMaxDigits) {
            field.markInvalid('Quantité trop grande ! (Code barre scanné ?)');
            return;
        }

        // Si 5 digits et pas confirmé => redemander (au cas où l’utilisateur clique sans repasser par le change)
        // (uniquement si la saisie dépasse le montant de la vente)
        const data = me.getNetAmountToPay ? me.getNetAmountToPay() : null;
        const netTopay = data && data.montantNet != null ? parseInt(data.montantNet, 10) : 0;
        const numericValue = parseInt(raw, 10) || 0;
        const exceedsSaleAmount = netTopay > 0 && numericValue > netTopay;

        if (field && me.confirmAtMaxDigits && digits === me.antiBarcodeMaxDigits && exceedsSaleAmount && field._confirmedMaxDigitsValue !== raw) {
            Ext.Msg.show({
                title: 'Confirmation',
                msg: '⚠️ Montant à 5 chiffres détecté (' + raw + ') et supérieur au montant de la vente (' + netTopay + '). Confirmez-vous ?',
                buttons: Ext.Msg.YESNO,
                icon: Ext.Msg.WARNING,
                defaultFocus: 'no',
                buttonText: {yes: 'Confirmer quand même', no: 'Annuler'},
                fn: function (btn) {
                    if (btn === 'yes') {
                        field._confirmedMaxDigitsValue = raw;
                        me.doCloture(); // relance après confirmation
                    } else {
                        field._confirmedMaxDigitsValue = null;
                        me.blockMontantRecuUntilChange(raw, 'Saisie annulée. Corrigez le montant reçu.');
                    }
                    // Dans tous les cas, revenir sur le champ avec le texte sélectionné
                    me.focusSelectMontantRecu();
                }
            });
            me.focusMsgBoxCancelButton();
            return;
        }

        // Montant suspect => confirmation avant de continuer
        let totalSaisie = 0;
        if (field && raw.length > 0) {
            totalSaisie = parseInt(raw, 10) || 0;
        }
        if (me.getExtraModeReglementId && me.getExtraModeReglementId()) {
            const montantExtraField = me.getMontantExtra ? me.getMontantExtra() : null;
            const extraRaw = montantExtraField ? String(montantExtraField.getValue() || '').replace(/\D/g, '') : '';
            const extra = extraRaw.length ? (parseInt(extraRaw, 10) || 0) : 0;
            totalSaisie += extra;
        }

        // Pas de contrôle "montant élevé" pour les règlements mobile money :
        // le montant est renseigné automatiquement (aucune saisie utilisateur).
        const typeRegleCloture = me.getVnotypeReglement ? me.getVnotypeReglement().getValue() : null;
        const isMobileCloture = typeRegleCloture && me.isMobileMode(typeRegleCloture);

        if (!isMobileCloture && totalSaisie >= me.suspectInputThreshold) {
            Ext.Msg.show({
                title: 'Alerte',
                msg: '⚠️ Montant élevé : vous allez encaisser ' + totalSaisie + '. Confirmez-vous ?',
                buttons: Ext.Msg.YESNO,
                icon: Ext.Msg.ERROR,
                defaultFocus: 'no',
                buttonText: {yes: 'Confirmer quand même', no: 'Annuler'},
                fn: function (btn) {
                    if (btn === 'yes') {
                        me.doClotureCore();
                    } else {
                        // Annuler => on ferme uniquement la confirmation : la vente
                        // reste modifiable (montant et mode de règlement inchangés)
                        // et "Terminer vente" reste actif. La confirmation sera
                        // redemandée au prochain essai de finalisation.
                        if (me.getVnobtnCloture) {
                            try {
                                me.getVnobtnCloture().enable();
                            } catch (e) {
                            }
                        }
                        me.focusSelectMontantRecu();
                    }
                }
            });
            me.focusMsgBoxCancelButton();
            return;
        }

        me.doClotureCore();
    },

    doClotureCore: function () {
        const me = this;

        // ✅ Sécurité finale (au cas où doClotureCore est appelé directement)
        const field = me.getMontantRecu ? me.getMontantRecu() : null;
        const rawTxt = field ? String((field.getRawValue && field.getRawValue()) || field.getValue() || '').replace(/\D/g, '') : '';
        const digits = rawTxt.length;
        const dataNet = me.getNetAmountToPay ? me.getNetAmountToPay() : null;
        const netTopay = dataNet && dataNet.montantNet != null ? parseInt(dataNet.montantNet, 10) : 0;
        const numericValue = parseInt(rawTxt, 10) || 0;
        const monnaieARendre = (netTopay > 0 && numericValue > netTopay) ? (numericValue - netTopay) : 0;

        // Si un "Annuler" de sécurité est actif pour cette valeur => stop (évite boucle)
        if (field && field._blockedSecurityValue && String(field._blockedSecurityValue) === rawTxt) {
            me.focusSelectMontantRecu();
            return;
        }

        if (field && digits > 0 && digits > me.antiBarcodeMaxDigits) {
            field.markInvalid('Quantité trop grande ! (Code barre scanné ?)');
            me.focusSelectMontantRecu();
            return;
        }
        if (field && monnaieARendre > me.maxChangeAllowed && me._changeConfirmedForValue !== rawTxt) {
            Ext.Msg.show({
                title: 'Alerte',
                msg: '⚠️ Monnaie à rendre anormalement élevée : ' + monnaieARendre + ' (seuil ' + me.maxChangeAllowed + ').\\n' +
                        'Montant reçu : ' + rawTxt + ' / Montant vente : ' + netTopay + '.\\n' +
                        'Probable scan ou erreur de saisie. Confirmez-vous ?',
                buttons: Ext.Msg.YESNO,
                icon: Ext.Msg.ERROR,
                defaultFocus: 'no',
                buttonText: {yes: 'Confirmer quand même', no: 'Annuler'},
                fn: function (btn) {
                    if (btn === 'yes') {
                        me._changeConfirmedForValue = rawTxt;
                        me.doClotureCore(); // relance
                    } else {
                        me._changeConfirmedForValue = null;
                        me.blockMontantRecuUntilChange(rawTxt, 'Saisie annulée. Corrigez le montant reçu.');
                    }
                    me.focusSelectMontantRecu();
                }
            });
            me.focusMsgBoxCancelButton();
            return;
        }

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
                    me.finaliserVenteCaisseOuverte(typeVenteCombo, typeRegle);
                } else {
                    /* Caisse fermee : on propose de l'ouvrir sur place, puis on reprend la
                     * finalisation la ou elle s'est arretee — l'utilisateur n'a pas a recliquer
                     * sur « Terminer la vente ». */
                    me.proposerOuvertureCaisse(function (caisseOuverte) {
                        if (caisseOuverte) {
                            me.finaliserVenteCaisseOuverte(typeVenteCombo, typeRegle);
                        }
                    });
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
            if (typeRegleId === '1' && me.getExtraModeReglementId()
                    && ((parseInt(me.getMontantRecu().getValue(), 10) || 0) <= 0
                            || (montantExtra > 0 && montantExtra >= parseInt(netTopay)))) {
                // Même verrou que la clôture VNO : pas de vente espèces + mobile
                // avec une part espèces nulle (vente 100% mobile déguisée) —
                // montant reçu vide/0, ou part mobile couvrant toute la part client
                me.showMontantRecuRequisMessage();
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

                    // ✅ IMPORTANT : après ajout article, forcer recalcul net
                    me.toRecalculate = true;
                    me.netAmountToPay = null;

                    me.getTotalField().setValue(me.getCurrent().intPRICE);
                    field.setValue(1);
                    me.resetProduitCombo(comboxProduit);
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

        // Confirmation implicite de la part mobile (flux espèces + mobile,
        // comptant) : entrer dans le montant reçu alors qu'une répartition
        // espèces (> 0) + part mobile (> 0) est affichée vaut acceptation —
        // même effet qu'Entrée dans le champ mobile (verrou + cadenas). Le
        // focus précède toujours la frappe : les espèces tendues (ex. 2 000 F)
        // ne recalculeront plus la part, seule la monnaie bouge. Si aucune
        // espèce n'a été déclarée (part proposée = tout le net), on ne
        // verrouille pas : le complément automatique et le retour en espèces
        // simple gardent leur comportement historique.
        if (!me.extraModeManualAmount && me.getExtraModeReglementId()
                && me.getVnotypeReglement().getValue() === '1') {
            const montantExtraCmp = me.getMontantExtra();
            const partMobile = (montantExtraCmp && montantExtraCmp.isVisible() && !montantExtraCmp.readOnly)
                    ? (parseInt(montantExtraCmp.getValue(), 10) || 0) : 0;
            const especesDeclarees = parseInt(me.getMontantRecu().getValue(), 10) || 0;
            if (partMobile > 0 && especesDeclarees > 0) {
                me.extraModeManualAmount = true;
                me.updateExtraModeLockIndicator(true);
            }
        }

        // ✅ Anti-scan robuste : capte scan/paste/saisie rapide même si "change" ne déclenche pas correctement
        const field = me.getMontantRecu ? me.getMontantRecu() : null;
        if (field && !field._antiScanBound) {
            field._antiScanBound = true;

            const fireCheck = function () {
                try {
                    // on réutilise la logique de change existante (anti-codebarres + confirmations)
                    me.montantRecuChangeListener(field, field.getValue());
                } catch (e) {
                }
            };

            // listeners Ext + DOM
            Ext.defer(function () {
                try {
                    if (field.inputEl) {
                        field.inputEl.on('input', fireCheck);
                        field.inputEl.on('keyup', fireCheck);
                        field.inputEl.on('paste', fireCheck);
                    }
                } catch (e) {
                }
            }, 50);
        }

        const typeVente = me.getSafeComboValue('getTypeVenteCombo', '1');
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
                                    me.openClientLambdaSearchWindow();
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
                                        me.openClientLambdaSearchWindow();
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
        me.rememberPreventeMode();
        me.saveModeReglementAttente();
        me.resetAll();
        me.getVnoproduitCombo().focus(false, 100, function () {
        });
    },
    /*
     * Persiste cote serveur le mode de reglement au moment de la mise en attente
     * (colonne str_TYPE_REGLEMENT_ATTENTE de t_preenregistrement) afin que le
     * rappel restaure le mode a l'identique (ex: Differe), quel que soit le poste.
     */
    saveModeReglementAttente: function () {
        const me = this, vente = me.getCurrent();
        if (!vente || !vente.lgPREENREGISTREMENTID) {
            return;
        }
        const mode = me.getVnotypeReglement().getValue();
        if (!mode) {
            return;
        }
        Ext.Ajax.request({
            method: 'PUT',
            url: '../api/v1/ventestats/attente/mode-reglement/' + vente.lgPREENREGISTREMENTID + '/' + mode
        });
    },
    /*
     * Le mode de règlement d'une vente mise en attente n'est stocké en base
     * qu'à la clôture (vente_reglement) : on le mémorise donc côté poste
     * (localStorage) pour le restaurer au rappel. Taille bornée à 30 entrées,
     * espèces (défaut) non mémorisé.
     */
    rememberPreventeMode: function () {
        const me = this, vente = me.getCurrent();
        if (!vente) {
            return;
        }
        const mode = me.getVnotypeReglement().getValue();
        if (!mode || mode === '1') {
            return;
        }
        try {
            const map = Ext.JSON.decode(window.localStorage.getItem('prestigeModesAttente') || '{}', true) || {};
            map[vente.lgPREENREGISTREMENTID] = mode;
            const keys = Object.keys(map);
            while (keys.length > 30) {
                delete map[keys.shift()];
            }
            window.localStorage.setItem('prestigeModesAttente', Ext.JSON.encode(map));
        } catch (e) {
        }
    },
    getRememberedPreventeMode: function (venteId) {
        try {
            const map = Ext.JSON.decode(window.localStorage.getItem('prestigeModesAttente') || '{}', true) || {};
            return map[venteId] || null;
        } catch (e) {
            return null;
        }
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

    /*
     * Verrou anti-brèche « espèces = 0 » : le message est bloquant et guide
     * vers le bon geste. Une vente réglée entièrement en mobile money doit
     * passer par le mode mobile choisi comme mode principal — pas par le
     * fractionnement espèces + mobile avec 0 F d'espèces (ligne espèces
     * poubelle en base et mode principal erroné dans les stats).
     */
    showMontantRecuRequisMessage: function () {
        const me = this;
        Ext.MessageBox.show({
            title: 'Message d\'erreur',
            width: 550,
            msg: 'Veuillez saisir un montant reçu en espèces supérieur à 0.<br/>'
                    + 'Si le client règle entièrement en mobile money, choisissez directement ce mode '
                    + 'dans la liste des modes de règlement.',
            buttons: Ext.MessageBox.OK,
            icon: Ext.MessageBox.ERROR,
            fn: function (buttonId) {
                if (buttonId === 'ok') {
                    me.getMontantRecu().focus(true, 50);
                }
            }
        });
    },
    handleExtraModePayment: function (netTopay) {
        const me = this;
        // Le fractionnement suppose des espèces réellement reçues : à 0, on ne
        // propose pas de second mode (verrou : Entrée sur le 0 par défaut puis
        // choix d'un mode mobile = vente 100% mobile déguisée en espèces)
        const especesSaisies = parseInt(me.getMontantRecu().getValue(), 10) || 0;
        if (especesSaisies <= 0) {
            me.showMontantRecuRequisMessage();
            return;
        }
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
        me._extraModeBaseLabel = modeRegelement.libelle.toUpperCase();
        montantExtra.setFieldLabel(me._extraModeBaseLabel);
        if (me.isMobileMode(me.getVnotypeReglement().getValue())) {
            // Fractionnement mobile + mobile : on déverrouille la saisie de la part
            // du mode principal, le complément se calcule dans montantExtra
            const montantRecu = me.getMontantRecu();
            montantRecu.setReadOnly(false);
            montantRecu.setValue(0);
        } else if (me.getVnotypeReglement().getValue() === '1') {
            // Espèces + mobile : le montant mobile devient saisissable
            // (pré-rempli avec le complément), quel que soit le type de vente
            // (comptant, assurance, carnet) — même écran règlement partout.
            // Permet le cas « espèces tendues supérieures à la part due » :
            // la monnaie se rend sur les espèces. Toute la mécanique de
            // confirmation (Entrée, cadenas, verrou implicite) suit ce flag.
            montantExtra.setReadOnly(false);
        }
        me.handleExtraAmountInputValue();
        if (Ext.isEmpty(me.getClient())) {
            // La fenêtre « client lié » vient de s'ouvrir : le focus est dans
            // son champ de recherche ; il reviendra à l'encaissement après le
            // choix du client (focusAfterClientAction). Ne pas voler le focus
            // sous la fenêtre modale.
            return;
        }
        me.focusEncaissement();
    },

    resetExtraModeCmp: function () {
        const me = this;
        const montantExtra = me.getMontantExtra();
        montantExtra.setFieldLabel('');
        me._extraModeBaseLabel = null;
        me._extraAutoSetting = true;
        montantExtra.setValue(null);
        me._extraAutoSetting = false;
        montantExtra.setReadOnly(true); // re-verrouille (saisissable seulement en espèces comptant)
        montantExtra.hide();
        me.extraModeReglementId = null;
        me.extraModeManualAmount = false;
        me.getBtnExtraMode()?.hide();
        // Ne pas voler le focus si la fenêtre « client lié » est ouverte
        // (son champ de recherche doit garder la main)
        if (!Ext.ComponentQuery.query('clientLambda').length) {
            me.getMontantRecu().focus(true, 50);
        }
    },

    handleExtraAmountInputValue: function () {
        const me = this;
        if (me.getExtraModeReglementId()) {
            const data = me.getNetAmountToPay();
            const netTopay = data.montantNet;
            const montantRecu = me.getMontantRecu().getValue();
            // Montant mobile confirmé (flux espèces comptant) : on ne l'écrase
            // plus, on rafraîchit seulement la monnaie affichée. Exception : si
            // le net à payer est repassé SOUS la part mobile (article retiré,
            // remise...), la répartition n'a plus de sens — on la déverrouille
            // et on repasse en complément automatique (nouvelle validation).
            if (me.extraModeManualAmount) {
                const extraConfirme = parseInt(me.getMontantExtra().getValue(), 10) || 0;
                if (!(netTopay > 0 && extraConfirme > parseInt(netTopay, 10))) {
                    const totalSaisie = (parseInt(montantRecu, 10) || 0) + extraConfirme;
                    me.montantRecuHandler(me, me.getVnotypeReglement().getValue(), totalSaisie, data);
                    return;
                }
                me.extraModeManualAmount = false;
                me.updateExtraModeLockIndicator(false);
            }
            const montantExtraValue = netTopay - montantRecu;
            const montantExtra = me.getMontantExtra();
            me._extraAutoSetting = true;
            if (montantExtraValue <= 0) {
                montantExtra.setValue(0);
                montantExtra.hide();
            } else {
                if (!montantExtra.isVisible()) {
                    montantExtra.show();
                }
                montantExtra.setValue(montantExtraValue);

            }
            me._extraAutoSetting = false;

        }

    },
    /*
     * Saisie manuelle du montant du second mode (espèces + mobile, comptant) :
     * le client fixe sa part mobile ; les espèces tendues peuvent dépasser la
     * part due, la monnaie (total - net) se rend en espèces. Le montant mobile
     * est plafonné au net (pas de monnaie sur du mobile).
     */
    montantExtraChangeListener: function (field) {
        const me = this;
        if (me._extraAutoSetting) {
            return; // écriture programmatique (complément automatique)
        }
        if (!me.getExtraModeReglementId() || me.getVnotypeReglement().getValue() !== '1') {
            return; // saisissable uniquement dans le flux espèces
        }
        const data = me.getNetAmountToPay();
        if (!data) {
            return;
        }
        const netTopay = parseInt(data.montantNet, 10) || 0;
        const saisie = parseInt(field.getValue(), 10) || 0;
        if (netTopay > 0 && saisie > netTopay) {
            field.setValue(netTopay); // re-déclenche le change avec la valeur plafonnée
            return;
        }
        me.extraModeManualAmount = true;
        me.updateExtraModeLockIndicator(true);
        // met à jour la monnaie affichée : total saisi (espèces + mobile) vs net
        const totalSaisie = (parseInt(me.getMontantRecu().getValue(), 10) || 0) + saisie;
        me.montantRecuHandler(me, '1', totalSaisie, data);
    },
    /*
     * Entrée dans le champ du 2e mode.
     * Flux espèces + mobile (comptant) : confirme la part mobile proposée (elle
     * ne sera plus recalculée quand les espèces tendues dépasseront le net) et
     * renvoie le focus dans le montant reçu — la caissière y saisit le billet
     * remis (ex. 2 000 F) et la monnaie se calcule sur les espèces uniquement.
     * Autres flux (mobile + mobile...) : comportement historique, même clôture
     * que le bouton « Terminer la vente ».
     */
    onMontantExtraKey: function (field, e, options) {
        const me = this;
        if (e.getKey() !== e.ENTER) {
            return;
        }
        if (me.getExtraModeReglementId() && me.getVnotypeReglement().getValue() === '1'
                && !field.readOnly) {
            const saisie = parseInt(field.getValue(), 10) || 0;
            if (saisie > 0) {
                me.extraModeManualAmount = true;
                me.updateExtraModeLockIndicator(true);
            }
            me.getMontantRecu().focus(true, 50);
            return;
        }
        me.onMontantRecuVnoKey(field, e, options);
    },
    /*
     * Cadenas sur le libellé de la part mobile : signale à la caissière que le
     * montant est confirmé et ne sera plus modifié automatiquement.
     */
    updateExtraModeLockIndicator: function (locked) {
        const me = this;
        const montantExtra = me.getMontantExtra();
        if (!montantExtra || !me._extraModeBaseLabel) {
            return;
        }
        montantExtra.setFieldLabel(me._extraModeBaseLabel + (locked ? ' 🔒' : ''));
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
                // Part espèces réellement due = net - part mobile : si les espèces
                // tendues dépassent (monnaie à rendre), on n'enregistre que la part
                // due — la monnaie est portée par montantRecu/montantRemis.
                // Cas exact (total = net) : partEspeces = montantRecu, comme avant.
                const partEspeces = Math.min(montantRecu, netToPay - montantExtra);

                reglements.push(
                        {
                            "typeReglement": extraModeId,
                            "montant": montantExtra,
                            "montantAttentu": montantExtra,
                            "montantVerse": montantExtra
                        },
                        {
                            "typeReglement": typeReglement,
                            "montant": partEspeces,
                            "montantAttentu": partEspeces,
                            // Montant réellement tendu par le client : c'est lui
                            // qui s'imprime sur le ticket (la monnaie figure en bas).
                            "montantVerse": montantRecu
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
        } else if (me.isMobileMode(typeReglement) && !Ext.isEmpty(me.getExtraModeReglementId())
                && me.getMontantExtra()?.getValue() && me.getTypeVenteCombo().getValue() === '1') {
            // Fractionnement mobile + mobile (vente comptant uniquement) :
            // part du mode principal saisie + complément sur le mode extra
            const extraModeId = me.getExtraModeReglementId();
            const montantExtra = me.getMontantExtra().getValue();
            const montantPrincipal = me.getMontantRecu().getValue();
            reglements.push(
                    {
                        "typeReglement": extraModeId,
                        "montant": montantExtra,
                        "montantAttentu": montantExtra,
                        "montantVerse": montantExtra
                    },
                    {
                        "typeReglement": typeReglement,
                        "montant": montantPrincipal,
                        "montantAttentu": montantPrincipal,
                        "montantVerse": montantPrincipal
                    }
            );
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
    },

    /**
     * Recherche une prévente par N° ticket (strREF) ou UUID et recharge via loadExistantSale(...).
     */
    onPreventeSearchClick: function () {
        var me = this,
                field = me.getPreventeSearchField(),
                value = (field && field.getValue ? Ext.String.trim(field.getValue()) : '');

        if (!value) {
            // Si aucun critère de recherche, ouvrir la fenêtre avec toutes les préventes
            me.openPreventeSearchWindow();
            return;
        }

        // Recherche directe si une valeur est spécifiée
        me.searchAndLoadPrevente(value);
    },

    onPreventeFieldSpecialKey: function (field, e) {
        if (e.getKey() === e.ENTER) {
            this.onPreventeSearchClick();
        }
    },

    searchAndLoadPrevente: function (value) {
        var me = this;

        var isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

        if (isUuid) {
            Ext.Ajax.request({
                method: 'GET',
                url: '../api/v1/ventestats/' + value,
                success: function (response) {
                    var result = Ext.decode(response.responseText, true);
                    if (result && result.data && result.data.lgPREENREGISTREMENTID) {
                        me.loadExistantSale(result.data.lgPREENREGISTREMENTID);
                    } else {
                        Ext.Msg.alert('Info', 'Aucune prévente trouvée pour cet identifiant.');
                    }
                },
                failure: function () {
                    Ext.Msg.alert('Erreur', 'Impossible de récupérer la prévente demandée.');
                }
            });
            return;
        }

        // Recherche par référence
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ventestats/preventes',
            params: {
                statut: 'is_Process',
                query: value,
                page: 1,
                start: 0,
                limit: 50
            },
            success: function (response) {
                var result = Ext.decode(response.responseText, true) || {},
                        data = result.data || [];

                if (!data.length) {
                    Ext.Msg.alert('Info', 'Aucune prévente correspondante.');
                    return;
                }

                if (data.length === 1) {
                    // Si un seul résultat, charger directement
                    me.loadExistantSale(data[0].lgPREENREGISTREMENTID);
                } else {
                    // Si plusieurs résultats, ouvrir la fenêtre de sélection
                    me.openPreventeSearchWindow();
                    // Appliquer le filtre
                    const searchWindow = me.getPreventeSearchWindow();
                    if (searchWindow) {
                        searchWindow.down('#preventeFilterField').setValue(value);
                        me.filterPreventes(value);
                    }
                }
            },
            failure: function () {
                Ext.Msg.alert('Erreur', 'La recherche a échoué.');
            }
        });
    },

    openPreventePicker: function (rows) {
        var me = this;

        var store = Ext.create('Ext.data.Store', {
            fields: [
                'lgPREENREGISTREMENTID', 'strREF', 'userFullName', 'heure', 'intPRICE'
            ],
            data: rows
        });

        var grid = Ext.create('Ext.grid.Panel', {
            store: store,
            border: true,
            columns: [{
                    text: 'N° Ticket',
                    dataIndex: 'strREF',
                    flex: 1
                }, {
                    text: 'Heure',
                    dataIndex: 'heure',
                    width: 100
                }, {
                    text: 'Caissier',
                    dataIndex: 'userFullName',
                    flex: 1
                }, {
                    text: 'Montant',
                    dataIndex: 'intPRICE',
                    width: 110,
                    renderer: function (v) {
                        return Ext.util.Format.number(v, '0,000') + ' F';
                    }
                }],
            listeners: {
                itemdblclick: function (view, rec) {
                    me.loadExistantSale(rec.get('lgPREENREGISTREMENTID'));
                    view.up('window').close();
                }
            }
        });

        var win = Ext.create('Ext.window.Window', {
            title: 'Sélectionnez une prévente',
            modal: true,
            width: 700,
            height: 400,
            layout: 'fit',
            items: [grid],
            buttons: [{
                    text: 'Charger',
                    handler: function () {
                        var rec = grid.getSelectionModel().getSelection()[0];
                        if (rec) {
                            me.loadExistantSale(rec.get('lgPREENREGISTREMENTID'));
                            win.close();
                        } else {
                            Ext.Msg.alert('Info', 'Sélectionnez une ligne.');
                        }
                    }
                }, {
                    text: 'Annuler',
                    handler: function () {
                        win.close();
                    }
                }]
        });
        win.show();
    },

    openPreventeSearchWindow: function () {
        const me = this;

        // Créer la fenêtre de recherche de préventes
        const searchWindow = Ext.create('Ext.window.Window', {
            title: 'RÉSULTATS DE RECHERCHE DES PRÉVENTES',
            layout: 'fit',
            width: 1500, // Plus large pour accommoder les nouvelles colonnes et la zone agrandie
            height: 750, // Légèrement plus haute
            modal: true,
            closable: true,
            maximizable: true,
            items: [{
                    xtype: 'container',
                    layout: 'hbox',
                    padding: 15, // Plus de padding
                    items: [
                        me.buildPreventeListPanel(),
                        me.buildPreventeDetailPanel()
                    ]
                }],
            listeners: {
                afterrender: function () {
                    // Charger les préventes au démarrage
                    me.loadAllPreventes();
                }
            }
        });

        searchWindow.show();
        return searchWindow;
    },

    buildPreventeListPanel: function () {
        const me = this;

        return {
            xtype: 'panel',
            title: 'LISTE DES PRÉVENTES',
            width: 650, // Légèrement plus large pour les nouvelles colonnes
            margin: '0 15 0 0', // Plus de marge à droite
            layout: 'fit',
            items: [{
                    xtype: 'grid',
                    itemId: 'preventeListGrid',
                    selModel: {
                        selType: 'rowmodel',
                        mode: 'SINGLE'
                    },
                    store: Ext.create('Ext.data.Store', {
                        fields: [
                            'lgPREENREGISTREMENTID', 'strREF', 'intPRICE', 'lgTYPEVENTEID', 'strTYPEVENTENAME',
                            'userFullName', 'dtUPDATED', 'heure', 'items', 'userCaissierName'
                        ],
                        pageSize: 20,
                        proxy: {
                            type: 'ajax',
                            url: '../api/v1/ventestats/preventes',
                            reader: {
                                type: 'json',
                                root: 'data',
                                totalProperty: 'total'
                            }
                        },
                        sorters: [{
                                property: 'heure',
                                direction: 'DESC' // ou 'DESC' pour ordre décroissant
                            }]
                    }),
                    columns: [{
                            text: 'N° Ticket',
                            dataIndex: 'strREF',
                            flex: 1
                        }, {
                            text: 'Montant',
                            dataIndex: 'intPRICE',
                            width: 100,
                            renderer: function (v) {
                                return Ext.util.Format.number(v, '0,000') + ' F';
                            }
                        }, {
                            text: 'Type',
                            dataIndex: 'strTYPEVENTENAME',
                            width: 120,
                            renderer: function (v, meta, record) {
                                // Utiliser strTYPEVENTENAME si disponible, sinon mapper lgTYPEVENTEID
                                if (v)
                                    return v;

                                var typeId = record.get('lgTYPEVENTEID');
                                var typeMap = {
                                    '1': 'AU COMPTANT',
                                    '2': 'ASSURANCE_MUTUELLE',
                                    '3': 'CARNET',
                                    '4': 'DEPOT AGRE',
                                    '5': 'DEPOT EXTENSION'
                                };
                                return typeMap[typeId] || typeId;
                            }
                        }, {
                            text: 'Date',
                            dataIndex: 'dtUPDATED',
                            width: 100,
                            renderer: function (v) {
                                if (!v)
                                    return '';
                                // Formater la date si nécessaire
                                return v.length > 10 ? v.substring(0, 10) : v;
                            }
                        }, {
                            text: 'Heure',
                            dataIndex: 'heure',
                            width: 80,
                            sortable: true,
                            renderer: function (v, meta, record) {
                                if (v)
                                    return v;
                                // Extraire l'heure de dtUPDATED si disponible
                                var dateStr = record.get('dtUPDATED');
                                if (dateStr && dateStr.length > 10) {
                                    return dateStr.substring(11, 16); // HH:MM
                                }
                                return '';
                            }
                        }, {
                            text: 'Caissier',
                            dataIndex: 'userFullName',
                            flex: 1
                        }],
                    listeners: {
                        selectionchange: function (selModel, selected) {
                            if (selected.length > 0) {
                                const record = selected[0];
                                console.log('Prévente sélectionnée:', record.data);
                                console.log('ID de la prévente:', record.get('lgPREENREGISTREMENTID'));

                                // VÉRIFICATION AVANT CHARGEMENT
                                const preventeId = record.get('lgPREENREGISTREMENTID');
                                if (!preventeId) {
                                    console.error('ID de prévente non trouvé dans le record:', record.data);
                                    Ext.Msg.alert('Erreur', 'Impossible de récupérer l\'identifiant de la prévente.');
                                    return;
                                }

                                me.loadPreventeDetails(record);
                            }
                        }
                    },
                    dockedItems: [{
                            xtype: 'pagingtoolbar',
                            dock: 'bottom',
                            store: this.store,
                            displayInfo: true
                        }, {
                            xtype: 'toolbar',
                            dock: 'top',
                            items: [{
                                    xtype: 'textfield',
                                    itemId: 'preventeFilterField',
                                    emptyText: 'Rechercher dans les résultats...',
                                    width: 300,
                                    enableKeyEvents: true,
                                    listeners: {
                                        specialkey: function (field, e) {
                                            if (e.getKey() === e.ENTER) {
                                                me.filterPreventes(field.getValue());
                                            }
                                        }
                                    }
                                }, {
                                    xtype: 'button',
                                    text: 'Actualiser',
                                    iconCls: 'refresh',
                                    handler: function () {
                                        me.loadAllPreventes();
                                    }
                                }]
                        }]
                }]
        };
    },

// Dans buildPreventeDetailPanel, modifiez la hauteur et les marges :
    buildPreventeDetailPanel: function () {
        const me = this;

        return {
            xtype: 'panel',
            title: 'DÉTAILS DE LA PRÉVENTE',
            flex: 1.3,
            margin: '0 0 0 10',
            layout: 'fit',
            items: [{
                    xtype: 'container',
                    itemId: 'preventeDetailContainer',
                    layout: {
                        type: 'vbox',
                        align: 'stretch'
                    },
                    // AJOUT: Définir une hauteur fixe avec défilement si nécessaire
                    style: {
                        'max-height': '700px', // Augmenter la hauteur maximale
                        'overflow-y': 'auto'   // Permettre le défilement si nécessaire
                    },
                    items: [{
                            xtype: 'container',
                            layout: 'hbox',
                            height: 250, // AUGMENTER la hauteur pour les informations générales
                            style: {
                                'min-height': '250px' // Garantir une hauteur minimale
                            },
                            items: [{
                                    xtype: 'container',
                                    flex: 1,
                                    layout: 'vbox',
                                    items: [{
                                            xtype: 'fieldset',
                                            title: 'Informations générales',
                                            flex: 1,
                                            width: 350,
                                            margin: '0 5 10 3',
                                            layout: 'anchor',
                                            cls: 'centered-fieldset-title', // Classe pour centrer le titre
                                            defaults: {
                                                anchor: '100%',
                                                labelWidth: 120
                                            },
                                            items: [{
                                                    xtype: 'displayfield',
                                                    itemId: 'preventeIdField',
                                                    fieldLabel: 'Prévente #'
                                                }, {
                                                    xtype: 'displayfield',
                                                    itemId: 'typeField',
                                                    fieldLabel: 'Type'
                                                }, {
                                                    xtype: 'displayfield',
                                                    itemId: 'montantField',
                                                    fieldLabel: 'Montant total'
                                                }, {
                                                    xtype: 'displayfield',
                                                    itemId: 'articlesField',
                                                    fieldLabel: 'Articles'
                                                }, {
                                                    xtype: 'displayfield',
                                                    itemId: 'caissierField',
                                                    fieldLabel: 'Caissier'
                                                }, {
                                                    xtype: 'displayfield',
                                                    itemId: 'heureField',
                                                    fieldLabel: 'Heure'
                                                }]
                                        }]
                                }, {
                                    xtype: 'container',
                                    flex: 1,
                                    layout: 'vbox',
                                    items: [{
                                            xtype: 'fieldset',
                                            title: 'Informations client et assurance',
                                            flex: 1,
                                            width: 350,
                                            margin: '0 5 10 0',
                                            layout: 'anchor',
                                            cls: 'centered-fieldset-title', // Classe pour centrer le titre
                                            style: {
                                                'border-right': '1px solid #B5B8C8' // Forcer l'affichage du bord droit
                                            },
                                            defaults: {
                                                anchor: '100%',
                                                labelWidth: 120
                                            },
                                            items: [{
                                                    xtype: 'displayfield',
                                                    itemId: 'matriculeField',
                                                    fieldLabel: 'Matricule'
                                                }, {
                                                    xtype: 'displayfield',
                                                    itemId: 'clientField',
                                                    fieldLabel: 'Client'
                                                }, {
                                                    xtype: 'displayfield',
                                                    itemId: 'assuranceField',
                                                    fieldLabel: 'Assurance'
                                                }, {
                                                    xtype: 'displayfield',
                                                    itemId: 'pourcentageField',
                                                    fieldLabel: 'Pourcentage'
                                                }, {
                                                    xtype: 'displayfield',
                                                    itemId: 'numBonField',
                                                    fieldLabel: 'N° Bon'
                                                }, {
                                                    xtype: 'displayfield',
                                                    itemId: 'partClientField',
                                                    fieldLabel: 'Part Client'
                                                }, {
                                                    xtype: 'displayfield',
                                                    itemId: 'partTPField',
                                                    fieldLabel: 'Part TP'
                                                }]
                                        }]
                                }]
                        }, {
                            xtype: 'grid',
                            itemId: 'articlesGrid',
                            title: 'Articles de la prévente',
                            flex: 1,
                            margin: '25 0 10 0', // AUGMENTER la marge supérieure pour descendre la grille
                            minHeight: 200, // Hauteur minimale
                            style: {
                                'margin-top': '25px' // Forcer la marge supérieure
                            },
                            store: Ext.create('Ext.data.Store', {
                                fields: [
                                    'intCIP', 'strDESCRIPTION', 'intPRICEUNITAIR',
                                    'intQUANTITY', 'intPRICE', 'produit'
                                ]
                            }),
                            columns: [{
                                    text: 'Code CIP',
                                    dataIndex: 'intCIP',
                                    width: 100,
                                    renderer: function (v, meta, record) {
                                        if (v)
                                            return v;
                                        var produit = record.get('produit');
                                        return produit ? produit.intCIP : '';
                                    }
                                }, {
                                    text: 'Désignation',
                                    dataIndex: 'strDESCRIPTION',
                                    flex: 2,
                                    renderer: function (v, meta, record) {
                                        if (v)
                                            return v;
                                        var produit = record.get('produit');
                                        return produit ? produit.strDESCRIPTION : '';
                                    }
                                }, {
                                    text: 'Prix unitaire',
                                    dataIndex: 'intPRICEUNITAIR',
                                    width: 100,
                                    renderer: function (v) {
                                        return v ? Ext.util.Format.number(v, '0,000') + ' F' : '';
                                    }
                                }, {
                                    text: 'Qté',
                                    dataIndex: 'intQUANTITY',
                                    width: 60
                                }, {
                                    text: 'Total',
                                    dataIndex: 'intPRICE',
                                    width: 100,
                                    renderer: function (v) {
                                        return v ? Ext.util.Format.number(v, '0,000') + ' F' : '';
                                    }
                                }]
                        }, {
                            xtype: 'container',
                            layout: 'hbox',
                            margin: '15 0 0 0', // AUGMENTER la marge supérieure
                            padding: '10 0',
                            items: [{
                                    xtype: 'button',
                                    text: 'Rappeler cette prévente',
                                    itemId: 'recallPreventeBtn',
                                    flex: 1,
                                    margin: '0 5 0 0',
                                    disabled: true,
                                    handler: function () {
                                        me.recallSelectedPrevente();
                                    }
                                }, {
                                    xtype: 'button',
                                    text: 'Fermer',
                                    flex: 1,
                                    margin: '0 0 0 5',
                                    handler: function () {
                                        this.up('window').close();
                                    }
                                }]
                        }]
                }]
        };
    },

    loadAllPreventes: function () {
        const me = this;
        const searchWindow = me.getPreventeSearchWindow();
        if (searchWindow) {
            const grid = searchWindow.down('#preventeListGrid');
            grid.getStore().load({
                params: {
                    statut: 'is_Process',
                    page: 1,
                    start: 0,
                    limit: 20
                },
                callback: function (records, operation, success) {
                    if (success && records.length > 0) {
                        // Assurer l'unicité des préventes
                        const uniquePreventes = [];
                        const seenIds = new Set();

                        records.forEach(function (record) {
                            const preventeId = record.get('lgPREENREGISTREMENTID');
                            if (!seenIds.has(preventeId)) {
                                seenIds.add(preventeId);
                                uniquePreventes.push(record);
                            }
                        });

                        // Recharger le store avec les préventes uniques
                        grid.getStore().loadData(uniquePreventes);
                    }
                }
            });
        }
    },

    filterPreventes: function (query) {
        const me = this;
        const grid = me.getPreventeSearchWindow().down('#preventeListGrid');
        grid.getStore().load({
            params: {
                statut: 'is_Process',
                query: query,
                page: 1,
                start: 0,
                limit: 50 // Augmenter la limite pour mieux gérer les doublons
            },
            callback: function (records, operation, success) {
                if (success && records.length > 0) {
                    // Assurer l'unicité des préventes
                    const uniquePreventes = [];
                    const seenIds = new Set();

                    records.forEach(function (record) {
                        const preventeId = record.get('lgPREENREGISTREMENTID');
                        if (!seenIds.has(preventeId)) {
                            seenIds.add(preventeId);
                            uniquePreventes.push(record);
                        }
                    });

                    // Recharger le store avec les préventes uniques
                    grid.getStore().loadData(uniquePreventes);
                }
            }
        });
    },

    loadPreventeDetails: function (record) {
        const me = this;
        const detailContainer = me.getPreventeSearchWindow().down('#preventeDetailContainer');

        // STOCKER LES DONNÉES BRUTES DU RECORD
        me.selectedPreventeData = record.data;

        console.log('Record sélectionné:', record);
        console.log('Record data:', record.data);
        console.log('ID du record:', record.get('lgPREENREGISTREMENTID'));

        // RÉCUPÉRER L'ID CORRECTEMENT
        const preventeId = record.get('lgPREENREGISTREMENTID'); // ← Déclarer la variable ici

        // Réinitialiser les champs en attendant le chargement
        detailContainer.down('#preventeIdField').setValue('Chargement...');
        detailContainer.down('#typeField').setValue('Chargement...');
        detailContainer.down('#montantField').setValue('Chargement...');
        detailContainer.down('#articlesField').setValue('Chargement...');
        detailContainer.down('#caissierField').setValue('Chargement...');
        detailContainer.down('#heureField').setValue('Chargement...');

        // Réinitialiser les champs client/assurance
        const matriculeField = detailContainer.down('#matriculeField');
        const clientField = detailContainer.down('#clientField');
        const assuranceField = detailContainer.down('#assuranceField');
        const pourcentageField = detailContainer.down('#pourcentageField');
        const numBonField = detailContainer.down('#numBonField');
        const partClientField = detailContainer.down('#partClientField');
        const partTPField = detailContainer.down('#partTPField');

        matriculeField.setValue('');
        clientField.setValue('');
        assuranceField.setValue('');
        pourcentageField.setValue('');
        numBonField.setValue('');
        partClientField.setValue('');
        partTPField.setValue('');

        // UTILISER L'API find-one QUI FONCTIONNE
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ventestats/find-one/' + preventeId, // ← Utiliser la variable déclarée
            success: function (response) {
                const result = Ext.decode(response.responseText, true);
                console.log('Réponse API find-one:', result);

                if (result && result.data) {
                    const preventeData = result.data;
                    me.selectedPreventeData = preventeData;

                    console.log('Données prévente complètes:', preventeData);
                    console.log('Articles reçus:', preventeData.items);

                    // Mettre à jour les informations générales
                    detailContainer.down('#preventeIdField').setValue(preventeData.strREF || '');
                    detailContainer.down('#typeField').setValue(
                            preventeData.typeVente?.libelle ||
                            preventeData.strTYPEVENTE ||
                            'N/A'
                            );
                    detailContainer.down('#montantField').setValue(
                            Ext.util.Format.number(preventeData.intPRICE || 0, '0,000') + ' F'
                            );

                    // Compter le nombre d'articles
                    const articleCount = preventeData.items ? preventeData.items.length : 0;
                    detailContainer.down('#articlesField').setValue(articleCount + ' article(s)');

                    detailContainer.down('#caissierField').setValue(
                            preventeData.caissier?.fullName ||
                            preventeData.user?.fullName ||
                            preventeData.vendeur?.fullName ||
                            ''
                            );

                    detailContainer.down('#heureField').setValue(preventeData.dtUPDATED || '');

                    // UTILISER VOTRE FONCTION QUI FONCTIONNE POUR LES DONNÉES CLIENT/ASSURANCE
                    me.updateClientAssuranceInfo(preventeData, detailContainer);

                    // CHARGEMENT DES ARTICLES
                    const articlesGrid = detailContainer.down('#articlesGrid');
                    if (preventeData.items && preventeData.items.length > 0) {
                        console.log('Articles à charger:', preventeData.items);

                        const articlesData = preventeData.items.map(item => {
                            const produit = item.produit || {};
                            return {
                                intCIP: produit.intCIP ? produit.intCIP.trim() : '',
                                strDESCRIPTION: produit.strDESCRIPTION || produit.strNAME || '',
                                intPRICEUNITAIR: item.intPRICEUNITAIR || 0,
                                intQUANTITY: item.intQUANTITY || 0,
                                intPRICE: item.intPRICE || 0,
                                produit: produit
                            };
                        });

                        console.log('Articles formatés pour la grille:', articlesData);
                        articlesGrid.getStore().loadData(articlesData);
                    } else {
                        console.log('Aucun article trouvé');
                        articlesGrid.getStore().removeAll();
                    }

                    // Activer le bouton rappeler
                    detailContainer.down('#recallPreventeBtn').enable();
                } else {
                    Ext.Msg.alert('Erreur', 'Aucune donnée valide dans la réponse de l\'API.');
                }
            },
            failure: function (response) {
                console.error('Erreur API:', response);
                Ext.Msg.alert('Erreur', 'Impossible de charger les détails de la prévente. Statut: ' + response.status);
            }
        });
    },

// FONCTION AVEC LOGS DÉTAILLÉS POUR DIAGNOSTIQUER
    updateClientAssuranceInfo: function (preventeData, detailContainer) {
        const me = this;

        const matriculeField = detailContainer.down('#matriculeField');
        const clientField = detailContainer.down('#clientField');
        const assuranceField = detailContainer.down('#assuranceField');
        const pourcentageField = detailContainer.down('#pourcentageField');
        const numBonField = detailContainer.down('#numBonField');
        const partClientField = detailContainer.down('#partClientField');
        const partTPField = detailContainer.down('#partTPField');

        console.log('=== DÉBUT updateClientAssuranceInfo ===');
        console.log('Type de vente:', preventeData.strTYPEVENTE, 'ID:', preventeData.lgTYPEVENTEID);
        console.log('Client présent:', !!preventeData.client);
        console.log('Assurances présentes:', preventeData.assurances ? preventeData.assurances.length : 0);

        // Vérifier que les champs existent avant de les utiliser
        if (!matriculeField || !clientField) {
            console.log('Champs manquants - matriculeField:', !!matriculeField, 'clientField:', !!clientField);
            return;
        }

        // Vente assurance (VO) - Type 2
        if (preventeData.strTYPEVENTE === 'VO' || preventeData.lgTYPEVENTEID === '2') {
            console.log('Type VO détecté');

            if (preventeData.client) {
                matriculeField.setValue(preventeData.client.strNUMEROSECURITESOCIAL || '');
                clientField.setValue(preventeData.client.fullName || '');

                // RECHERCHE DÉTAILLÉE DES DONNÉES ASSURANCE
                let tauxPourcentage = 0;
                let nomAssurance = '';
                let numeroBon = '';
                let partTP = 0;

                console.log('=== RECHERCHE ASSURANCE DÉTAILLÉE ===');

                // 1. Chercher dans assurances[0] (NOUVELLE SOURCE)
                if (preventeData.assurances && preventeData.assurances.length > 0) {
                    const assuranceInfo = preventeData.assurances[0];
                    console.log('Données assurances[0] COMPLÈTES:', assuranceInfo);
                    console.log('Structure tiersPayant:', assuranceInfo.tiersPayant);
                    console.log('intPERCENT:', assuranceInfo.intPERCENT);
                    console.log('strREFBON:', assuranceInfo.strREFBON);
                    console.log('intPRICE:', assuranceInfo.intPRICE);

                    // EXTRACTION AVEC FALLBACKS
                    nomAssurance = assuranceInfo.tiersPayant ?
                            (assuranceInfo.tiersPayant.strFULLNAME || assuranceInfo.tiersPayant.strNAME || '') : '';
                    tauxPourcentage = assuranceInfo.intPERCENT || assuranceInfo.taux || 0;
                    numeroBon = assuranceInfo.strREFBON || preventeData.strREFBON || '';
                    partTP = assuranceInfo.intPRICE || 0;

                    console.log('Résultats extraction:');
                    console.log('- Nom Assurance:', nomAssurance);
                    console.log('- Taux:', tauxPourcentage);
                    console.log('- Numéro Bon:', numeroBon);
                    console.log('- Part TP:', partTP);
                } else {
                    console.log('Aucune donnée dans assurances');
                }

                // 2. Fallback sur preenregistrementstp
                if ((!nomAssurance || tauxPourcentage === 0) && preventeData.client.preenregistrementstp && preventeData.client.preenregistrementstp.length > 0) {
                    const assuranceInfo = preventeData.client.preenregistrementstp[0];
                    console.log('Fallback sur preenregistrementstp:', assuranceInfo);

                    if (!nomAssurance)
                        nomAssurance = assuranceInfo.tpFullName || '';
                    if (tauxPourcentage === 0)
                        tauxPourcentage = assuranceInfo.taux || 0;
                    if (!numeroBon)
                        numeroBon = assuranceInfo.numBon || '';
                    if (partTP === 0)
                        partTP = assuranceInfo.tpnet || 0;

                    console.log('Résultats après fallback:');
                    console.log('- Nom Assurance:', nomAssurance);
                    console.log('- Taux:', tauxPourcentage);
                    console.log('- Numéro Bon:', numeroBon);
                    console.log('- Part TP:', partTP);
                }

                console.log('=== FIN RECHERCHE ASSURANCE ===');

                // AFFICHAGE FINAL
                console.log('Valeurs à afficher:');
                console.log('- Assurance:', nomAssurance);
                console.log('- Pourcentage:', tauxPourcentage);
                console.log('- Numéro Bon:', numeroBon);
                console.log('- Part Client:', preventeData.intCUSTPART);
                console.log('- Part TP:', partTP);

                if (assuranceField && pourcentageField && numBonField && partClientField && partTPField) {
                    assuranceField.setValue(nomAssurance);
                    pourcentageField.setValue(tauxPourcentage > 0 ? tauxPourcentage + '%' : '0%');
                    numBonField.setValue(numeroBon);
                    partClientField.setValue(Ext.util.Format.number(preventeData.intCUSTPART || 0, '0,000') + ' F');
                    partTPField.setValue(Ext.util.Format.number(partTP || 0, '0,000') + ' F');

                    console.log('Champs mis à jour avec succès');
                } else {
                    console.log('Champs manquants:', {
                        assuranceField: !!assuranceField,
                        pourcentageField: !!pourcentageField,
                        numBonField: !!numBonField,
                        partClientField: !!partClientField,
                        partTPField: !!partTPField
                    });
                }
            } else {
                console.log('Aucun client trouvé');
            }
        }
        // Vente carnet (Type 3) - Part TP = Montant total
        else if (preventeData.lgTYPEVENTEID === '3') {
            console.log('Type CARNET détecté - Part TP = Montant total');

            if (preventeData.client) {
                matriculeField.setValue(preventeData.client.strNUMEROSECURITESOCIAL || '');
                clientField.setValue(preventeData.client.fullName || '');

                // RECHERCHE DES DONNÉES ASSURANCE POUR CARNET
                let tauxPourcentage = 0;
                let nomAssurance = '';
                let numeroBon = '';
                let partTP = preventeData.intPRICE || 0; // Part TP = Montant total pour carnet

                console.log('=== RECHERCHE ASSURANCE CARNET ===');

                // Chercher dans différentes sources
                if (preventeData.assurances && preventeData.assurances.length > 0) {
                    const assuranceInfo = preventeData.assurances[0];
                    nomAssurance = assuranceInfo.tiersPayant ?
                            (assuranceInfo.tiersPayant.strFULLNAME || assuranceInfo.tiersPayant.strNAME || '') : '';
                    tauxPourcentage = assuranceInfo.intPERCENT || assuranceInfo.taux || 0;
                    numeroBon = assuranceInfo.strREFBON || preventeData.strREFBON || '';
                } else if (preventeData.client && preventeData.client.preenregistrementstp && preventeData.client.preenregistrementstp.length > 0) {
                    const assuranceInfo = preventeData.client.preenregistrementstp[0];
                    nomAssurance = assuranceInfo.tpFullName || '';
                    tauxPourcentage = assuranceInfo.taux || 0;
                    numeroBon = assuranceInfo.numBon || '';
                }

                console.log('Résultats carnet:');
                console.log('- Nom Assurance:', nomAssurance);
                console.log('- Taux:', tauxPourcentage);
                console.log('- Numéro Bon:', numeroBon);
                console.log('- Part TP (montant total):', partTP);

                // AFFICHAGE FINAL POUR CARNET
                if (assuranceField && pourcentageField && numBonField && partClientField && partTPField) {
                    assuranceField.setValue(nomAssurance);
                    pourcentageField.setValue(tauxPourcentage > 0 ? tauxPourcentage + '%' : '100%');
                    numBonField.setValue(numeroBon);
                    partClientField.setValue('0 F'); // Part client = 0 pour carnet
                    partTPField.setValue(Ext.util.Format.number(partTP, '0,000') + ' F');

                    console.log('Champs carnet mis à jour avec succès');
                }
            }
        }
        // Vente au comptant (VNO) avec client - Type 1
        else if (preventeData.client && matriculeField && clientField) {
            console.log('Type VNO détecté');
            matriculeField.setValue(preventeData.client.strNUMEROSECURITESOCIAL || '');
            clientField.setValue(preventeData.client.fullName || '');

            // Vider les champs assurance pour les ventes VNO
            if (assuranceField && pourcentageField && numBonField && partClientField && partTPField) {
                assuranceField.setValue('');
                pourcentageField.setValue('');
                numBonField.setValue('');
                partClientField.setValue('');
                partTPField.setValue('');
            }
        }

        console.log('=== FIN updateClientAssuranceInfo ===');
    },
// FONCTION POUR AFFICHER LES DÉTAILS (séparée pour réutilisation)
    displayPreventeDetails: function (preventeData, detailContainer, fields, apiName) {
        const me = this;

        console.log(`Affichage des détails avec l'API: ${apiName}`, preventeData);

        me.selectedPreventeData = preventeData;

        // Mettre à jour les informations générales
        detailContainer.down('#preventeIdField').setValue(preventeData.strREF || '');
        detailContainer.down('#typeField').setValue(
                preventeData.typeVente?.libelle ||
                preventeData.strTYPEVENTENAME ||
                preventeData.strTYPEVENTE ||
                'N/A'
                );
        detailContainer.down('#montantField').setValue(
                Ext.util.Format.number(preventeData.intPRICE || 0, '0,000') + ' F'
                );

        // RECHERCHER LES ARTICLES DANS DIFFÉRENTES PROPRIÉTÉS
        let articles = [];
        const possibleArticleProperties = ['items', 'articles', 'produits', 'lignes', 'preEnregistrementDetails'];

        for (let prop of possibleArticleProperties) {
            if (preventeData[prop] && Array.isArray(preventeData[prop]) && preventeData[prop].length > 0) {
                articles = preventeData[prop];
                console.log(`Articles trouvés dans "${prop}":`, articles);
                break;
            }
        }

        // Compter le nombre d'articles
        const articleCount = articles.length;
        detailContainer.down('#articlesField').setValue(articleCount + ' article(s)');

        detailContainer.down('#caissierField').setValue(
                preventeData.userCaissierName ||
                preventeData.caissier?.fullName ||
                preventeData.user?.fullName ||
                preventeData.vendeur?.fullName ||
                ''
                );

        detailContainer.down('#heureField').setValue(preventeData.dtUPDATED || '');

        // GESTION DES DONNÉES ASSURANCE
        me.populateAssuranceData(preventeData, fields);

        // CHARGEMENT DES ARTICLES
        const articlesGrid = detailContainer.down('#articlesGrid');
        if (articles.length > 0) {
            console.log('Articles à charger:', articles);

            // Préparer les données selon la structure trouvée
            const articlesData = articles.map(item => {
                const produit = item.produit || {};
                return {
                    // Code CIP
                    intCIP: produit.intCIP ? produit.intCIP.trim() : (item.intCIP || ''),
                    // Description
                    strDESCRIPTION: produit.strDESCRIPTION || produit.strNAME || item.strDESCRIPTION || '',
                    // Prix unitaire
                    intPRICEUNITAIR: item.intPRICEUNITAIR || item.prixUnitaire || 0,
                    // Quantité
                    intQUANTITY: item.intQUANTITY || item.quantite || 0,
                    // Prix total
                    intPRICE: item.intPRICE || item.montant || 0,
                    // Garder l'objet produit
                    produit: produit
                };
            });

            console.log('Articles formatés:', articlesData);
            articlesGrid.getStore().loadData(articlesData);
        } else {
            console.log('Aucun article trouvé dans les données');
            articlesGrid.getStore().removeAll();
        }

        // Activer le bouton rappeler
        detailContainer.down('#recallPreventeBtn').enable();
    },

// FONCTION POUR GÉRER LES DONNÉES ASSURANCE
    populateAssuranceData: function (preventeData, fields) {
        const me = this;
        const {
            matriculeField,
            clientField,
            assuranceField,
            pourcentageField,
            numBonField,
            partClientField,
            partTPField
        } = fields;

        // Vérifier si c'est une vente avec assurance
        const isAssuranceVente = preventeData.strTYPEVENTE === 'VO' ||
                preventeData.lgTYPEVENTEID === '2' ||
                preventeData.lgTYPEVENTEID === '3' ||
                (preventeData.typeVente && preventeData.typeVente.libelle &&
                        preventeData.typeVente.libelle.includes('ASSURANCE'));

        if (!isAssuranceVente) {
            console.log('Vente non-assurance détectée');
            // Pour les ventes non-assurance, vider les champs spécifiques
            assuranceField.setValue('');
            pourcentageField.setValue('');
            numBonField.setValue('');
            partClientField.setValue('');
            partTPField.setValue('');
            return;
        }

        console.log('Vente assurance détectée, recherche des données...');

        // RECHERCHE DES DONNÉES CLIENT
        if (preventeData.client) {
            matriculeField.setValue(preventeData.client.strNUMEROSECURITESOCIAL || '');
            clientField.setValue(preventeData.client.fullName || '');
        } else {
            matriculeField.setValue('');
            clientField.setValue('');
        }

        // RECHERCHE DES DONNÉES ASSURANCE
        let tauxPourcentage = 0;
        let nomAssurance = '';
        let numeroBon = '';
        let partClient = preventeData.intCUSTPART || 0;
        let partTP = (preventeData.intPRICE || 0) - partClient;

        // Chercher dans différentes sources
        if (preventeData.assurances && preventeData.assurances.length > 0) {
            const assuranceInfo = preventeData.assurances[0];
            nomAssurance = assuranceInfo.nom || assuranceInfo.tpFullName || '';
            tauxPourcentage = assuranceInfo.taux || assuranceInfo.intPOURCENTAGE || 0;
            numeroBon = assuranceInfo.numBon || '';
        } else if (preventeData.tierspayants && preventeData.tierspayants.length > 0) {
            const assuranceInfo = preventeData.tierspayants[0];
            nomAssurance = assuranceInfo.tpFullName || '';
            tauxPourcentage = assuranceInfo.taux || 0;
            numeroBon = assuranceInfo.numBon || '';
        } else if (preventeData.client && preventeData.client.tiersPayants && preventeData.client.tiersPayants.length > 0) {
            const assuranceInfo = preventeData.client.tiersPayants[0];
            nomAssurance = assuranceInfo.tpFullName || '';
            tauxPourcentage = assuranceInfo.taux || (preventeData.client.intPOURCENTAGE || 0);
            numeroBon = preventeData.strREFBON || '';
        }

        // AFFICHAGE FINAL
        assuranceField.setValue(nomAssurance);
        pourcentageField.setValue(tauxPourcentage > 0 ? tauxPourcentage + '%' : '');
        numBonField.setValue(numeroBon);
        partClientField.setValue(partClient > 0 ? Ext.util.Format.number(partClient, '0,000') + ' F' : '');
        partTPField.setValue(partTP > 0 ? Ext.util.Format.number(partTP, '0,000') + ' F' : '');

        console.log('Données assurance affichées:', {nomAssurance, tauxPourcentage, numeroBon, partClient, partTP});
    },

// Fallback avec les données de base
    updateWithBasicData: function (record, detailContainer) {
        const preventeData = record.data;

        detailContainer.down('#preventeIdField').setValue(preventeData.strREF || '');
        detailContainer.down('#typeField').setValue(preventeData.strTYPEVENTENAME || 'N/A');
        detailContainer.down('#montantField').setValue(Ext.util.Format.number(preventeData.intPRICE || 0, '0,000') + ' F');
        detailContainer.down('#articlesField').setValue('0 article(s)');
        detailContainer.down('#caissierField').setValue(preventeData.userFullName || '');
        detailContainer.down('#heureField').setValue((preventeData.dtUPDATED || '') + (preventeData.heure ? ' ' + preventeData.heure : ''));

        // Vider la grille d'articles
        detailContainer.down('#articlesGrid').getStore().removeAll();
        detailContainer.down('#recallPreventeBtn').enable();
    },

// Fonction pour mettre à jour l'interface avec les données COMPLÈTES de find-one
    updatePreventeDetails: function (preventeData, detailContainer) {
        const me = this;

        console.log('Mise à jour interface avec données find-one:', preventeData);

        // Mettre à jour les informations générales
        detailContainer.down('#preventeIdField').setValue(preventeData.strREF || 'N/A');
        detailContainer.down('#typeField').setValue(preventeData.strTYPEVENTE || preventeData.typeVente?.libelle || 'N/A');
        detailContainer.down('#montantField').setValue(Ext.util.Format.number(preventeData.intPRICE || 0, '0,000') + ' F');

        // Compter les articles - IMPORTANT: les articles sont dans preventeData.items
        const articleCount = preventeData.items ? preventeData.items.length : 0;
        detailContainer.down('#articlesField').setValue(articleCount + ' article(s)');

        detailContainer.down('#caissierField').setValue(
                preventeData.caissier?.fullName ||
                preventeData.user?.fullName ||
                preventeData.userFullName ||
                'N/A'
                );

        detailContainer.down('#heureField').setValue(preventeData.dtUPDATED || '');

        // Remplir les informations client/assurance
        me.updateClientAssuranceInfo(preventeData, detailContainer);

        // CHARGER LES ARTICLES DANS LA GRILLE - CORRECTION ICI
        const articlesGrid = detailContainer.down('#articlesGrid');
        if (preventeData.items && preventeData.items.length > 0) {
            console.log('Articles trouvés dans find-one:', preventeData.items);
            articlesGrid.getStore().loadData(preventeData.items);
        } else {
            console.log('Aucun article dans find-one');
            articlesGrid.getStore().removeAll();
        }

        // Activer le bouton rappeler
        detailContainer.down('#recallPreventeBtn').enable();
    },

// Nouvelle fonction pour essayer l'API find-one
    tryFindOneAPI: function (preventeId, detailContainer) {
        const me = this;

        console.log('Essai API find-one pour:', preventeId);

        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ventestats/find-one/' + preventeId,
            success: function (response) {
                try {
                    const result = Ext.decode(response.responseText, true);
                    console.log('Réponse API find-one:', result);

                    if (result.success && result.data) {
                        me.selectedPreventeData = result.data;
                        me.updatePreventeDetails(result.data, detailContainer);
                    } else {
                        Ext.Msg.alert('Erreur', 'Aucune donnée trouvée pour cette prévente');
                    }
                } catch (e) {
                    console.error('Erreur parsing JSON find-one:', e);
                    Ext.Msg.alert('Erreur', 'Impossible de charger les détails de la prévente');
                }
            },
            failure: function (response) {
                console.error('Erreur API find-one:', response);
                Ext.Msg.alert('Erreur', 'Impossible de se connecter au serveur');
            }
        });
    },

// Fonction pour mettre à jour l'interface avec les données
    updatePreventeDetails: function (preventeData, detailContainer) {
        const me = this;

        console.log('Mise à jour interface avec:', preventeData);

        // Mettre à jour les informations générales
        detailContainer.down('#preventeIdField').setValue(preventeData.strREF || 'N/A');
        detailContainer.down('#typeField').setValue(preventeData.strTYPEVENTENAME || preventeData.strTYPEVENTE || 'N/A');
        detailContainer.down('#montantField').setValue(Ext.util.Format.number(preventeData.intPRICE || 0, '0,000') + ' F');

        // Compter les articles
        const articleCount = preventeData.items ? preventeData.items.length : 0;
        detailContainer.down('#articlesField').setValue(articleCount + ' article(s)');

        detailContainer.down('#caissierField').setValue(
                preventeData.userCaissierName ||
                preventeData.caissier?.fullName ||
                preventeData.user?.fullName ||
                preventeData.userFullName ||
                'N/A'
                );

        detailContainer.down('#heureField').setValue(
                (preventeData.dtUPDATED || '') +
                (preventeData.heure ? ' ' + preventeData.heure : '')
                );

        // Remplir les informations client/assurance
        me.updateClientAssuranceInfo(preventeData, detailContainer);

        // Charger les articles dans la grille
        const articlesGrid = detailContainer.down('#articlesGrid');
        if (preventeData.items && preventeData.items.length > 0) {
            console.log('Chargement des articles:', preventeData.items);
            articlesGrid.getStore().loadData(preventeData.items);
        } else {
            console.log('Aucun article à charger');
            articlesGrid.getStore().removeAll();
        }

        // Activer le bouton rappeler
        detailContainer.down('#recallPreventeBtn').enable();
    },

// FONCTION AVEC LOGS DÉTAILLÉS POUR DIAGNOSTIQUER
    updateClientAssuranceInfo: function (preventeData, detailContainer) {
        const me = this;

        const matriculeField = detailContainer.down('#matriculeField');
        const clientField = detailContainer.down('#clientField');
        const assuranceField = detailContainer.down('#assuranceField');
        const pourcentageField = detailContainer.down('#pourcentageField');
        const numBonField = detailContainer.down('#numBonField');
        const partClientField = detailContainer.down('#partClientField');
        const partTPField = detailContainer.down('#partTPField');

        console.log('=== DÉBUT updateClientAssuranceInfo ===');
        console.log('Type de vente:', preventeData.strTYPEVENTE, 'ID:', preventeData.lgTYPEVENTEID);
        console.log('Montant total:', preventeData.intPRICE);
        console.log('Client présent:', !!preventeData.client);
        console.log('Assurances présentes:', preventeData.assurances ? preventeData.assurances.length : 0);
        console.log('Tiers payants présents:', preventeData.tierspayants ? preventeData.tierspayants.length : 0);

        // Vérifier que les champs existent avant de les utiliser
        if (!matriculeField || !clientField) {
            console.log('Champs manquants - matriculeField:', !!matriculeField, 'clientField:', !!clientField);
            return;
        }

        // DÉTECTION DU TYPE DE VENTE - PRIORITÉ À lgTYPEVENTEID
        const typeVenteId = preventeData.lgTYPEVENTEID;
        const typeVenteStr = preventeData.strTYPEVENTE;
        const isCarnet = typeVenteId === '3' || typeVenteStr === 'CARNET';
        const isVO = typeVenteId === '2' || typeVenteStr === 'VO';
        const isVNO = typeVenteId === '1' || typeVenteStr === 'VNO';

        console.log('Détection type:', {typeVenteId, typeVenteStr, isCarnet, isVO, isVNO});

        // Vente carnet (Type 3) - Part TP = Montant total
        if (isCarnet) {
            console.log('Type CARNET détecté - Part TP = Montant total');

            if (preventeData.client) {
                matriculeField.setValue(preventeData.client.strNUMEROSECURITESOCIAL || '');
                clientField.setValue(preventeData.client.fullName || '');

                // POUR CARNET : Part TP = Montant total, Part Client = 0
                const montantTotal = preventeData.intPRICE || 0;
                const partTP = montantTotal; // Part TP = Montant total
                const partClient = 0; // Part client = 0

                // RECHERCHE DES INFORMATIONS ASSURANCE POUR CARNET
                let tauxPourcentage = 100; // Par défaut 100% pour carnet
                let nomAssurance = '';
                let numeroBon = '';

                console.log('=== RECHERCHE ASSURANCE CARNET ===');

                // Chercher dans différentes sources pour le nom de l'assurance
                if (preventeData.assurances && preventeData.assurances.length > 0) {
                    const assuranceInfo = preventeData.assurances[0];
                    nomAssurance = assuranceInfo.tiersPayant ?
                            (assuranceInfo.tiersPayant.strFULLNAME || assuranceInfo.tiersPayant.strNAME || '') :
                            (assuranceInfo.nom || '');
                    tauxPourcentage = assuranceInfo.intPERCENT || assuranceInfo.taux || 100;
                    numeroBon = assuranceInfo.strREFBON || preventeData.strREFBON || '';
                    console.log('Données trouvées dans assurances:', assuranceInfo);
                } else if (preventeData.tierspayants && preventeData.tierspayants.length > 0) {
                    const assuranceInfo = preventeData.tierspayants[0];
                    nomAssurance = assuranceInfo.tpFullName || assuranceInfo.nom || '';
                    tauxPourcentage = assuranceInfo.taux || 100;
                    numeroBon = assuranceInfo.numBon || '';
                    console.log('Données trouvées dans tierspayants:', assuranceInfo);
                } else if (preventeData.client && preventeData.client.tiersPayants && preventeData.client.tiersPayants.length > 0) {
                    const assuranceInfo = preventeData.client.tiersPayants[0];
                    nomAssurance = assuranceInfo.tpFullName || '';
                    tauxPourcentage = assuranceInfo.taux || (preventeData.client.intPOURCENTAGE || 100);
                    numeroBon = preventeData.strREFBON || '';
                    console.log('Données trouvées dans client.tiersPayants:', assuranceInfo);
                } else {
                    // Fallback : utiliser le nom du client comme assurance pour carnet
                    nomAssurance = preventeData.client.fullName || 'CARNET CLIENT';
                    console.log('Utilisation du nom client comme assurance');
                }

                console.log('Résultats carnet:');
                console.log('- Montant total:', montantTotal);
                console.log('- Nom Assurance:', nomAssurance);
                console.log('- Taux:', tauxPourcentage);
                console.log('- Numéro Bon:', numeroBon);
                console.log('- Part TP (montant total):', partTP);
                console.log('- Part Client:', partClient);

                // AFFICHAGE FINAL POUR CARNET
                if (assuranceField && pourcentageField && numBonField && partClientField && partTPField) {
                    assuranceField.setValue(nomAssurance);
                    pourcentageField.setValue(tauxPourcentage + '%');
                    numBonField.setValue(numeroBon);
                    partClientField.setValue(Ext.util.Format.number(partClient, '0,000') + ' F');
                    partTPField.setValue(Ext.util.Format.number(partTP, '0,000') + ' F');

                    console.log('Champs carnet mis à jour avec succès');
                }
            }
        }
        // Vente assurance (VO) - Type 2
        else if (isVO) {
            console.log('Type VO détecté');

            if (preventeData.client) {
                matriculeField.setValue(preventeData.client.strNUMEROSECURITESOCIAL || '');
                clientField.setValue(preventeData.client.fullName || '');

                // RECHERCHE DÉTAILLÉE DES DONNÉES ASSURANCE
                let tauxPourcentage = 0;
                let nomAssurance = '';
                let numeroBon = '';
                let partTP = 0;

                console.log('=== RECHERCHE ASSURANCE DÉTAILLÉE ===');

                // 1. Chercher dans assurances[0] (NOUVELLE SOURCE)
                if (preventeData.assurances && preventeData.assurances.length > 0) {
                    const assuranceInfo = preventeData.assurances[0];
                    console.log('Données assurances[0] COMPLÈTES:', assuranceInfo);

                    // EXTRACTION AVEC FALLBACKS
                    nomAssurance = assuranceInfo.tiersPayant ?
                            (assuranceInfo.tiersPayant.strFULLNAME || assuranceInfo.tiersPayant.strNAME || '') : '';
                    tauxPourcentage = assuranceInfo.intPERCENT || assuranceInfo.taux || 0;
                    numeroBon = assuranceInfo.strREFBON || preventeData.strREFBON || '';

                    // CORRECTION : Si intPRICE = 0, utiliser le calcul basé sur le pourcentage
                    if (assuranceInfo.intPRICE === 0 && tauxPourcentage > 0) {
                        partTP = Math.round((preventeData.intPRICE || 0) * (tauxPourcentage / 100));
                    } else {
                        partTP = assuranceInfo.intPRICE || 0;
                    }

                    console.log('Résultats extraction:');
                    console.log('- Nom Assurance:', nomAssurance);
                    console.log('- Taux:', tauxPourcentage);
                    console.log('- Numéro Bon:', numeroBon);
                    console.log('- Part TP (calculée):', partTP);
                } else {
                    console.log('Aucune donnée dans assurances');
                }

                // 2. Fallback sur preenregistrementstp
                if ((!nomAssurance || tauxPourcentage === 0) && preventeData.client.preenregistrementstp && preventeData.client.preenregistrementstp.length > 0) {
                    const assuranceInfo = preventeData.client.preenregistrementstp[0];
                    console.log('Fallback sur preenregistrementstp:', assuranceInfo);

                    if (!nomAssurance)
                        nomAssurance = assuranceInfo.tpFullName || '';
                    if (tauxPourcentage === 0)
                        tauxPourcentage = assuranceInfo.taux || 0;
                    if (!numeroBon)
                        numeroBon = assuranceInfo.numBon || '';
                    if (partTP === 0)
                        partTP = assuranceInfo.tpnet || 0;

                    console.log('Résultats après fallback:');
                    console.log('- Nom Assurance:', nomAssurance);
                    console.log('- Taux:', tauxPourcentage);
                    console.log('- Numéro Bon:', numeroBon);
                    console.log('- Part TP:', partTP);
                }

                console.log('=== FIN RECHERCHE ASSURANCE ===');

                // AFFICHAGE FINAL
                if (assuranceField && pourcentageField && numBonField && partClientField && partTPField) {
                    assuranceField.setValue(nomAssurance);
                    pourcentageField.setValue(tauxPourcentage > 0 ? tauxPourcentage + '%' : '0%');
                    numBonField.setValue(numeroBon);
                    partClientField.setValue(Ext.util.Format.number(preventeData.intCUSTPART || 0, '0,000') + ' F');
                    partTPField.setValue(Ext.util.Format.number(partTP || 0, '0,000') + ' F');
                }
            }
        }
        // Vente au comptant (VNO) avec client - Type 1
        else if (isVNO && preventeData.client && matriculeField && clientField) {
            console.log('Type VNO détecté');
            matriculeField.setValue(preventeData.client.strNUMEROSECURITESOCIAL || '');
            clientField.setValue(preventeData.client.fullName || '');

            // Vider les champs assurance pour les ventes VNO
            if (assuranceField && pourcentageField && numBonField && partClientField && partTPField) {
                assuranceField.setValue('');
                pourcentageField.setValue('');
                numBonField.setValue('');
                partClientField.setValue('');
                partTPField.setValue('');
            }
        }
        // Aucun client trouvé
        else {
            console.log('Aucun client trouvé pour cette prévente');
            // Vider tous les champs
            if (matriculeField)
                matriculeField.setValue('');
            if (clientField)
                clientField.setValue('');
            if (assuranceField)
                assuranceField.setValue('');
            if (pourcentageField)
                pourcentageField.setValue('');
            if (numBonField)
                numBonField.setValue('');
            if (partClientField)
                partClientField.setValue('');
            if (partTPField)
                partTPField.setValue('');
        }

        console.log('=== FIN updateClientAssuranceInfo ===');
    },

    recallSelectedPrevente: function () {
        const me = this;

        console.log('Données de la prévente sélectionnée:', me.selectedPreventeData);

        if (!me.selectedPreventeData) {
            Ext.Msg.alert('Erreur', 'Aucune prévente sélectionnée.');
            return;
        }

        // Récupérer l'ID depuis différentes sources possibles
        const preventeId = me.selectedPreventeData.lgPREENREGISTREMENTID ||
                me.selectedPreventeData.id ||
                (me.selectedPreventeData.data && me.selectedPreventeData.data.lgPREENREGISTREMENTID);

        console.log('ID récupéré:', preventeId);

        if (!preventeId) {
            // Essayer de récupérer depuis la grille sélectionnée
            const searchWindow = Ext.ComponentQuery.query('window[title="RÉSULTATS DE RECHERCHE DES PRÉVENTES"]')[0];
            if (searchWindow) {
                const grid = searchWindow.down('#preventeListGrid');
                const selected = grid.getSelectionModel().getSelection();
                if (selected.length > 0) {
                    const gridPreventeId = selected[0].get('lgPREENREGISTREMENTID');
                    console.log('ID récupéré depuis la grille:', gridPreventeId);

                    if (gridPreventeId) {
                        // Fermer la fenêtre et charger la prévente
                        searchWindow.close();
                        me.loadExistantSale(gridPreventeId);
                        //Ext.Msg.alert('Succès', 'Prévente rappelée avec succès.');
                        return;
                    }
                }
            }

            Ext.Msg.alert('Erreur', 'ID de prévente invalide. Impossible de rappeler cette prévente.');
            return;
        }

        // Fermer la fenêtre de recherche
        const searchWindow = Ext.ComponentQuery.query('window[title="RÉSULTATS DE RECHERCHE DES PRÉVENTES"]')[0];
        if (searchWindow) {
            searchWindow.close();
        }

        // Charger la prévente dans l'interface principale
        me.loadExistantSale(preventeId);

        //Ext.Msg.alert('Succès', 'Prévente rappelée avec succès.');
    },

    getPreventeSearchWindow: function () {
        return Ext.ComponentQuery.query('window[title="RÉSULTATS DE RECHERCHE DES PRÉVENTES"]')[0];
    }

    ,
    /**
     * MessageBox YES/NO prioritaire :
     * - Empêche la saisie en arrière-plan (ENTER ne déclenche plus le champ produit/qté)
     * - Focus par défaut sur "Oui" (ENTER => Oui)
     * - Désactive temporairement des composants (combo produit, champ qté, etc.)
     */
    showYesNoPriority: function (cfg, toDisable) {
        var me = this;

        // couper le focus clavier derrière
        try {
            if (document && document.activeElement) {
                document.activeElement.blur();
            }
        } catch (e) {
        }

        // désactiver temporairement composants
        var comps = Ext.isArray(toDisable) ? toDisable : (toDisable ? [toDisable] : []);
        Ext.Array.each(comps, function (c) {
            if (c && c.setDisabled) {
                c.setDisabled(true);
            }
        });

        // sécuriser : modal + focus sur YES
        cfg = cfg || {};
        cfg.modal = true;
        cfg.defaultFocus = cfg.defaultFocus || 'yes';
        cfg.buttons = cfg.buttons || Ext.MessageBox.YESNO;

        // wrapper fn pour réactiver
        var userFn = cfg.fn;
        cfg.fn = function (btn) {
            Ext.Array.each(comps, function (c) {
                if (c && c.setDisabled) {
                    c.setDisabled(false);
                }
            });
            if (Ext.isFunction(userFn)) {
                userFn(btn);
            }
        };

        // listeners show/hide : focus + keymap ENTER bloquant arrière-plan
        cfg.listeners = cfg.listeners || {};
        var prevShow = cfg.listeners.show;
        cfg.listeners.show = function (mb) {
            if (Ext.isFunction(prevShow)) {
                prevShow(mb);
            }
            try {
                mb.toFront();
                mb.focus(false, 10);
                if (mb.getEl) {
                    mb.getEl().focus();
                }
            } catch (e) {
            }

            // bloque ENTER sur le body pendant la popup (évite que le champ produit capte ENTER)
            try {
                mb.__prioKeyMap = new Ext.util.KeyMap(Ext.getBody(), [{
                        key: Ext.EventObject.ENTER,
                        fn: function () {
                            return false;
                        },
                        stopEvent: true
                    }]);
            } catch (e) {
            }

            // focus forcé sur le bouton "Oui"
            Ext.defer(function () {
                try {
                    var yesBtn = mb.down && mb.down('button[itemId=yes]');
                    if (yesBtn && yesBtn.focus) {
                        yesBtn.focus(false, 10);
                    }
                } catch (e) {
                }
            }, 80);
        };

        var prevHide = cfg.listeners.hide;
        cfg.listeners.hide = function (mb) {
            if (Ext.isFunction(prevHide)) {
                prevHide(mb);
            }
            // cleanup keymap
            try {
                if (mb && mb.__prioKeyMap) {
                    mb.__prioKeyMap.destroy();
                    mb.__prioKeyMap = null;
                }
            } catch (e) {
            }
            // sécurité réactivation
            Ext.Array.each(comps, function (c) {
                if (c && c.setDisabled) {
                    c.setDisabled(false);
                }
            });
        };

        Ext.MessageBox.show(cfg);
    }

}
);