/* global Ext */

var url_services_data_famille_select_retourfournisseur = '../webservices/sm_user/famille/ws_data_retourfrs.jsp';
var url_services_transaction_retourfournisseur = '../webservices/commandemanagement/retourfournisseur/ws_transaction.jsp?mode=';
var url_services_data_bl_grossiste = '../webservices/commandemanagement/retourfournisseur/ws_data_bl_retour.jsp';
var url_services_data_retourfournisseurdetails = '../webservices/commandemanagement/retourfournisseurdetail/ws_data.jsp?lg_RETOUR_FRS_ID=';
var url_services_transaction_retourfournisseurdetails = '../webservices/commandemanagement/retourfournisseurdetail/ws_transaction.jsp?mode=';
var url_services_data_motifretour = '../webservices/configmanagement/motifretour/ws_data.jsp';
var url_services_data_famille_select_dovente = '../webservices/sm_user/famille/ws_data_jdbc.jsp';
var url_services_data_famille_select_retour = '../webservices/sm_user/famille/ws_data_retourfrs.jsp';
var Me;
var Omode;
var ref;
//var famille_id_search;
var in_total_vente;
var int_total_formated;
var int_montant_vente;
var int_montant_achat;
var LaborexWorkFlow;
var store_famille_dovente = null;
Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.commandemanagement.retourfournisseur.action.add', {
    extend: 'Ext.form.Panel',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.form.*',
        'Ext.layout.container.Column',
        'testextjs.model.Famille',
        'testextjs.controller.LaborexWorkFlow',
        'testextjs.model.BonLivraison',
        'testextjs.model.RetourFournisseurDetail'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        plain: true,
        maximizable: true,
        closable: false,
        nameintern: '',
        current: null
    },
    xtype: 'retourfournisseurmanagerlist',
    id: 'retourfournisseurmanagerlistID',
    frame: true,
    title: 'Ajouter detail retour fournisseur',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function () {
        Me = this;
        const itemsPerPage = 20;
        in_total_vente = 0;
        int_total_formated = 0;
        ref = this.getNameintern();
        titre = this.getTitre();
        /* audit 06 RF-04 : ouvert depuis la liste, le retour affiche est celui recu : ses lignes, et « Ajouter » le complete */
        this.current = ref && ref !== '0' ? ref : null;
        this.blChoisi = null;
        const storebonlivraison = new Ext.data.Store({
            model: 'testextjs.model.BonLivraison',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../RetourFournisseur',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                tiemout: 180000
            }
        });

        const storetypemotif = new Ext.data.Store({
            idProperty: 'lgMOTIFRETOUR',
            fields: [
                {name: 'lgMOTIFRETOUR',
                    type: 'string'

                },
                {name: 'strLIBELLE',
                    type: 'string'

                }
            ],
            pageSize: 999,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/motifs-retour',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });
        const store_famille_retourfrs = new Ext.data.Store({
            model: 'testextjs.model.Famille',
            pageSize: itemsPerPage,
            // remoteFilter: true,
            proxy: {
                type: 'ajax',
                url: "../RetourFourData",
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 1800
            },
            autoLoad: false

        });
        const store_details_retourfournisseur = new Ext.data.Store({
            idProperty: 'lgRETOURFRSDETAIL',
            fields: [
                {name: 'lgRETOURFRSDETAIL',
                    type: 'string'

                },
                {name: 'intCIP',
                    type: 'string'

                },
                {name: 'strNAME',
                    type: 'string'

                },
                {name: 'intSTOCK',
                    type: 'number'

                },
                {name: 'motif',
                    type: 'string'

                },
                {name: 'intNUMBERRETURN',
                    type: 'number'

                }, {name: 'ecart',
                    type: 'number'

                }
            ],
            pageSize: 9999,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/retourfournisseur/retours-items',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }

        });
        /* retours du 08/10 (13) : etat PharmaML du retour a chaque chargement des lignes */
        store_details_retourfournisseur.on('load', function () {
            Me.chargerEtatPml();
        });
        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });
        Ext.apply(this, {
//            width: 1200,
            width: '98%',
            fieldDefaults: {
                labelAlign: 'left',
                labelWidth: 90,
                anchor: '100%',
                msgTarget: 'side'
            },
            layout: {
                type: 'vbox',
                align: 'stretch',
                padding: 10
            },
            // Pas de flex par defaut : il etait pose sur TOUS les enfants, barre de boutons
            // comprise, et les quatre zones se partageaient la hauteur en parts egales. Sur un
            // ecran plein page, les zones du haut devenaient d'immenses cadres vides et le
            // detail du retour etait ecrase. Les zones du haut prennent leur hauteur naturelle,
            // le detail recoit la place restante.
            items: [
                {
                    items: [{
                            xtype: 'fieldset',
                            title: 'Infos Generales',
                            collapsible: true,
                            defaultType: 'textfield',
                            layout: 'anchor',
                            defaults: {
                                anchor: '100%'
                            },
                            items: [
                                {
                                    xtype: 'fieldcontainer',
                                    layout: 'hbox',
                                    combineErrors: true,
                                    defaultType: 'textfield',
                                    defaults: {
                                        hideLabel: 'true'
                                    },
                                    items: [
                                        {
                                            width: 400,
                                            xtype: 'combobox',
                                            fieldLabel: 'Bon de livraison',
                                            name: 'lg_BON_LIVRAISON_ID',
                                            margin: '0 15 0 0',
                                            id: 'lg_BON_LIVRAISON_ID',
                                            store: storebonlivraison,
                                            pageSize: 20,
                                            valueField: 'str_REF_LIVRAISON',
                                            displayField: 'str_REF_LIVRAISON',
//                                            typeAhead: true,
                                            minChars: 2,
                                            queryMode: 'remote',
                                            emptyText: 'N° de BL (une partie suffit)...',
                                            /* audit 06 RF-02 : deux grossistes peuvent avoir le meme numero de BL ; la liste montre le grossiste */
                                            listConfig: {
                                                getInnerTpl: function () {
                                                    return '{str_REF_LIVRAISON} <span style="float: right; color: #555;">{str_GROSSISTE_LIBELLE}</span>';
                                                }
                                            },
                                            listeners: {
                                                select: function (cmp, records) {
                                                    let comboFamille = Ext.getCmp('str_NAME');
                                                    /* la ligne choisie, pas la premiere portant ce numero (RF-02) */
                                                    let record = (Ext.isArray(records) ? records[0] : records) || cmp.findRecord(cmp.valueField || cmp.displayField, cmp.getValue());
                                                    Me.blChoisi = record;
                                                    Ext.getCmp('str_GROSSISTE_LIBELLE').setValue(record.get('str_GROSSISTE_LIBELLE'));
                                                    comboFamille.clearValue();
                                                    comboFamille.getStore().getProxy().url = "../RetourFourData?lg_BON_LIVRAISON_ID=" + cmp.getValue();
                                                    comboFamille.getStore().reload();
                                                    comboFamille.enable();
                                                    Ext.getCmp('str_NAME').focus(true, 100, function () {
                                                        Ext.getCmp('str_NAME').selectText(0, 1);
                                                    });
                                                }
                                            }
                                        },
                                        {
                                            xtype: 'displayfield',
                                            fieldLabel: 'Grossiste',
                                            // labelWidth: 100,
                                            flex: 1,
                                            id: 'str_GROSSISTE_LIBELLE',
                                            fieldStyle: "color:blue;",
                                            margin: '0 5 0 5'
                                        },
                                        {
                                            fieldLabel: 'Commentaire',
                                            emptyText: 'Commentaire',
                                            name: 'str_COMMENTAIRE',
                                            id: 'str_COMMENTAIRE',
                                            flex: 2,
                                            margin: '0 15 0 0'
                                        },
                                        {
                                            fieldLabel: 'Reponse',
                                            emptyText: 'Reponse',
                                            name: 'str_REPONSE_FRS',
                                            id: 'str_REPONSE_FRS',
                                            hidden: true,
                                            flex: 1,
                                            allowBlank: false
                                        }
                                    ]
                                }]
                        }
                    ]

                },
                {
                    items: [{
                            xtype: 'fieldset',
                            title: 'Ajout Produit',
                            collapsible: true,
                            defaultType: 'textfield',
                            layout: 'anchor',
                            defaults: {
                                anchor: '100%'
                            },
                            items: [
                                {
                                    xtype: 'fieldcontainer',
                                    fieldLabel: 'Produit',
                                    layout: 'hbox',
                                    combineErrors: true,
                                    defaultType: 'textfield',
                                    defaults: {
                                        hideLabel: 'true'
                                    },
                                    items: [
                                        //code ajouté
                                        {
                                            xtype: 'displayfield',
                                            fieldLabel: 'Id produit :',
                                            name: 'lg_FAMILLE_ID_VENTE',
                                            id: 'lg_FAMILLE_ID_VENTE',
                                            labelWidth: 120,
                                            hidden: true,
                                            fieldStyle: "color:blue;",
                                            margin: '0 15 0 0'

                                        },
                                        {
                                            xtype: 'combobox',
                                            fieldLabel: 'Article',
                                            name: 'str_NAME',
                                            id: 'str_NAME',
                                            store: store_famille_retourfrs,
                                            margins: '0 10 5 10',
                                            enableKeyEvents: true,
                                            valueField: 'str_DESCRIPTION',
                                            pageSize: 20, //ajout la barre de pagination
                                            displayField: 'str_DESCRIPTION',
                                            // typeAhead retire : pre-completait le champ avec le
                                            // premier resultat et la liste se filtrait sur ce seul produit
                                            width: 450,
                                            queryMode: 'remote',
                                            // recherche des 2 caracteres saisis (4 par defaut en remote)
                                            minChars: 2,
                                            disabled: true,
                                            emptyText: 'Nom ou CIP (une partie suffit)...',
                                            listConfig: {
                                                getInnerTpl: function () {
                                                    return '<span style="width:100px;display:inline-block;">{int_CIP}</span>{str_DESCRIPTION} <span style="float: right; font-weight:600;"> ({int_PAF})</span>';
                                                }
                                            },
                                            listeners: {
                                                keypress: function (field, e) {

                                                    if (e.getKey() === e.BACKSPACE || e.getKey() === 46) {
                                                        if (field.getValue().length === 1) { // a decommenter si demande de reload toute la liste des produits
                                                            field.getStore().load();
                                                        }
                                                    }
                                                },
                                                select: function (cmp) {
                                                    let value = cmp.getValue();
                                                    let record = cmp.findRecord(cmp.valueField || cmp.displayField, value); //recupere la ligne de l'element selectionné

                                                    Ext.getCmp('lg_FAMILLE_ID_VENTE').setValue(record.get('lg_FAMILLE_ID'));
                                                    Ext.getCmp('lg_MOTIF_RETOUR').focus(true, 100, function () {
                                                        Ext.getCmp('lg_MOTIF_RETOUR').selectText(0, 1);
                                                    });
                                                }

                                            }
                                        },
                                        {
                                            xtype: 'combobox',
                                            fieldLabel: 'Motif',
                                            name: 'lg_MOTIF_RETOUR',
                                            id: 'lg_MOTIF_RETOUR',
                                            store: storetypemotif,
                                            valueField: 'lgMOTIFRETOUR',
                                            displayField: 'strLIBELLE',
                                            // typeAhead retire : pre-completait avec le premier resultat
                                            pageSize: 20,
                                            queryMode: 'remote',
                                            // recherche des 2 caracteres saisis (4 par defaut en remote)
                                            minChars: 2,
                                            flex: 1,
                                            emptyText: 'Choisir un Motif...',
                                            listeners: {
                                                select: function (cmp) {

                                                    Ext.getCmp('int_QUANTITE').focus(true, 100, function () {
                                                        Ext.getCmp('int_QUANTITE').selectText(0, 1);
                                                    });
                                                }

                                            }
                                        },
                                        {
                                            fieldLabel: 'Quantit&eacute;',
                                            emptyText: 'Quantite',
                                            name: 'int_QUANTITE',
                                            id: 'int_QUANTITE',
                                            xtype: 'numberfield',
                                            margin: '0 15 0 10',
                                            minValue: 1,
                                            width: 100,
                                            value: 1,
                                            allowBlank: false,
                                            regex: /[0-9.]/,
                                            enableKeyEvents: true,
                                            listeners: {
                                                specialKey: function (field, e, options) {

                                                    if (e.getKey() === e.ENTER) {

                                                        if (Ext.getCmp('lg_FAMILLE_ID_VENTE').getValue() !== "" && Ext.getCmp('int_QUANTITE').getValue() > 0) {
                                                            Me.onbtnadd();
                                                        } else {
                                                            Ext.MessageBox.show({
                                                                title: 'Message d\'erreur',
                                                                width: 320,
                                                                msg: "Verifiez votre saisie svp",
                                                                buttons: Ext.MessageBox.OK,
                                                                icon: Ext.MessageBox.WARNING,
                                                                fn: function (buttonId) {
                                                                    if (buttonId === "ok") {
                                                                        Ext.getCmp('int_QUANTITE').focus(false, 100, function () {
                                                                            this.setFieldStyle('border: 2px solid #C0C0C0; background: #FFFFFF;');
                                                                        });
                                                                    }
                                                                }


                                                            });
                                                        }
                                                    }

                                                }}
                                        }, {
                                            text: 'Ajouter',
                                            id: 'btn_add',
                                            margins: '0 0 0 6',
                                            //  flex: 1,
                                            xtype: 'button',
                                            hidden: true,
                                            handler: this.onbtnadd,
                                            disabled: true
                                        }]
                                }
                            ]
                        }
                    ]
                },
                {
                    xtype: 'fieldset',
                    title: 'Detail(s) retour fournisseur',
                    collapsible: true,
                    // seul cadre a recevoir la place restante ; minHeight garde les 400 px
                    // d'origine si l'ecran venait a etre affiche en hauteur automatique
                    flex: 1,
                    minHeight: 400,
                    defaultType: 'textfield',
                    layout: 'fit',
                    items: [
                        {
                            xtype: 'gridpanel',
                            id: 'gridpanelID',
                            plugins: [this.cellEditing],
                            store: store_details_retourfournisseur,
                            columns: [{
                                    text: 'Details Suggestion Id',
                                    flex: 1,
                                    sortable: true,
                                    hidden: true,
                                    dataIndex: 'lgRETOURFRSDETAIL'

                                }, {
                                    text: 'Famille',
                                    flex: 1,
                                    sortable: true,
                                    hidden: true,
                                    dataIndex: 'produitId'
                                },
                                {
                                    xtype: 'rownumberer',
                                    text: 'LG',
                                    width: 56,
                                    sortable: true/*,
                                     locked: true*/
                                },
                                {
                                    text: 'Cip',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'intCIP'
                                },
                                {
                                    text: 'Description',
                                    flex: 2,
                                    sortable: true,
                                    dataIndex: 'strNAME'
                                },
                                {
                                    text: 'Stock',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'intSTOCK'
                                },
                                {
                                    text: 'Qté Retour',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'intNUMBERRETURN',
                                    MaskRe: /[0-9.]/,
                                    minValue: 1,
                                    editor: {
                                        xtype: 'numberfield',
                                        allowBlank: true,
                                        minValue: 1,
                                        maskRe: /[0-9.]/,
                                        selectOnFocus: true,
                                        hideTrigger: true
                                    }
                                },
                                {
                                    text: 'DIFF',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'ecart'
                                },
                                {
                                    text: 'MOTIF',
                                    flex: 1,
                                    dataIndex: 'motif'
                                },
                                {
                                    /* retours du 08/10 (13) : destination PharmaML de la ligne et reponse du grossiste */
                                    text: 'PharmaML',
                                    itemId: 'colRetourPml',
                                    width: 230,
                                    sortable: false,
                                    dataIndex: 'lgRETOURFRSDETAIL',
                                    renderer: function (v, meta) {
                                        return Me.renduLignePml(v, meta);
                                    }
                                },
                                {
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
                                }
                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: 999,
                                store: store_details_retourfournisseur,
                                displayInfo: true,
                                plugins: new Ext.ux.ProgressBarPager(),
                                listeners: {
                                    beforechange: function (page, currentPage) {

                                        const myProxy = Ext.getCmp('gridpanelID').getStore().getProxy();
                                        myProxy.params = {
                                            retourId: Me.getCurrent()
                                        };
                                        myProxy.setExtraParam('retourId', Me.getCurrent());

                                    }
                                }
                            },
                            listeners: {
                                scope: this


                            }
                        }]
                },
                {
                    xtype: 'toolbar',
                    ui: 'footer',
                    dock: 'bottom',
                    border: '0',
                    items: [{xtype: 'component', id: 'retourPmlEtat', cls: 'retour-pml-etat', flex: 1, html: ''}, '->',
                        {
                            text: 'Envoyer par PharmaML',
                            id: 'btn_retour_pml',
                            cls: 'btn-primary btn-commander-pml',
                            tooltip: 'Demande d\'autorisation de retour et réclamations au grossiste, selon le motif de chaque ligne',
                            disabled: true,
                            scope: this,
                            handler: this.envoyerPharmaMl
                        },
                        /* transmission du 07/11 : refus (motif obligatoire), mise en attente, remise en attente, abandon */
                        {xtype: 'component', id: 'retourRefusInfo', cls: 'retour-refus-info', hidden: true, html: '',
                            style: 'max-width:380px;padding:2px 8px;border-radius:6px;background:#fdecea;color:#8a1c12;font-size:12px'},
                        {xtype: 'textfield', id: 'retourMotifRefus', hidden: true, width: 260, maxLength: 500,
                            emptyText: 'Motif du refus (obligatoire)'},
                        {
                            text: 'Refuser',
                            id: 'btn_refuser',
                            hidden: true,
                            tooltip: 'Refuser le retour en attente : il revient à son auteur ; rien ne sort du stock',
                            scope: this,
                            handler: this.onbtnrefuser
                        },
                        {
                            text: 'Abandonner',
                            id: 'btn_abandonner',
                            hidden: true,
                            tooltip: 'Clore ce retour refusé sans suite ; rien ne sort du stock',
                            scope: this,
                            handler: this.onbtnabandonner
                        },
                        {
                            text: 'Mettre en attente',
                            id: 'btn_attente',
                            hidden: true,
                            tooltip: 'Le retour attend une validation : rien ne sort du stock en attendant',
                            scope: this,
                            handler: this.onbtnattente
                        },
                        {
                            text: 'Valider le retour',
                            id: 'btn_save',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            handler: this.onbtnvalider
                        },
                        {
                            text: 'Retour',
                            id: 'btn_cancel',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            hidden: false,
                            //disabled: true,
                            handler: this.onbtncancel
                        }
                    ]
                }]
        });
        this.callParent();
        Me.peutValider = null;
        Me.chargerDroits();
        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });
        if (titre === "Modification fiche retour fournisseur") {
            /* retour ouvert : ses lignes dans la grille, et « Ajouter » complete ce retour (add-item) au lieu d'en
               creer un autre */
            Me.current = this.getNameintern();

            Ext.getCmp('lg_BON_LIVRAISON_ID').setValue(this.getOdatasource().str_REF_LIVRAISON);
            Ext.getCmp('str_REPONSE_FRS').setValue(this.getOdatasource().str_REPONSE_FRS);
            Ext.getCmp('str_COMMENTAIRE').setValue(this.getOdatasource().str_COMMENTAIRE);
            Ext.getCmp('lg_BON_LIVRAISON_ID').disable();
            Ext.getCmp('str_REPONSE_FRS').show();
            Ext.getCmp('str_GROSSISTE_LIBELLE').setValue(this.getOdatasource().str_GROSSISTE_LIBELLE);
            let comboFamille = Ext.getCmp('str_NAME');
            comboFamille.enable();
            comboFamille.focus();
            comboFamille.getStore().getProxy().url = "../RetourFourData?lg_BON_LIVRAISON_ID=" + this.getOdatasource().str_REF_LIVRAISON;
            comboFamille.getStore().reload();
        }


        /* retours du 08/10 (13) : ouvert depuis l'etat de controle des achats, bon de livraison deja choisi */
        const pre = this.getOdatasource() && this.getOdatasource().blPreselection;
        if (pre && titre !== "Modification fiche retour fournisseur") {
            Me.choisirBl(pre.ref, pre.grossiste);
        }

        Ext.getCmp('gridpanelID').on('edit', function (editor, e) {
            let qte = Number(e.record.data.intNUMBERRETURN);
            let qteStock = Number(e.record.data.intSTOCK);
            if (qte < qteStock) {
                let params = {
                    lgRETOURFRSDETAIL: e.record.data.lgRETOURFRSDETAIL,
                    intNUMBERRETURN: qte
                };
                Ext.Ajax.request({
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    url: '../api/v1/retourfournisseur/update-item',
                    params: Ext.JSON.encode(params),
                    success: function (response)
                    {
                        const result = Ext.JSON.decode(response.responseText, true);
                        if (!result.success) {
                            Ext.MessageBox.alert('Error Message', response.responseText);
                            return;
                        }

                        e.record.commit();
                        Ext.getCmp('gridpanelID').getStore().load({
                            params: {
                                retourId: Me.getCurrent()

                            }
                        });
                        Ext.getCmp('str_NAME').setValue("");
                        Ext.getCmp('lg_MOTIF_RETOUR').setValue("");
                        Ext.getCmp('int_QUANTITE').setValue(1);
                        Ext.getCmp('str_NAME').focus();
                    },
                    failure: function (response)
                    {
                        console.log("Bug " + response.responseText);
                        Ext.MessageBox.alert('Error Message', response.responseText);
                    }
                });
            } else {
                Ext.getCmp('gridpanelID').getStore().load({
                    params: {
                        retourId: Me.getCurrent()

                    }
                });
                Ext.MessageBox.alert('Error Message', 'Verifier la quantite a retourner');
            }

        });
    },
    /* bon de livraison choisi d'office : meme effet qu'un choix dans la liste (grossiste, produits du bon) */
    choisirBl: function (refBl, grossiste) {
        const combo = Ext.getCmp('lg_BON_LIVRAISON_ID');
        combo.getStore().load({
            params: {query: refBl},
            callback: function () {
                const s = combo.getStore();
                /* RF-02 : parmi les BL de ce numero, celui du grossiste indique */
                const i = s.findBy(function (r) {
                    return r.get('str_REF_LIVRAISON') === refBl && (!grossiste || r.get('str_GROSSISTE_LIBELLE') === grossiste);
                });
                const rec = i >= 0 ? s.getAt(i) : s.findRecord('str_REF_LIVRAISON', refBl, 0, false, false, true);
                if (!rec) {
                    return;
                }
                Me.blChoisi = rec;
                combo.setValue(refBl);
                Ext.getCmp('str_GROSSISTE_LIBELLE').setValue(grossiste || combo.findRecord('str_REF_LIVRAISON', refBl).get('str_GROSSISTE_LIBELLE'));
                const comboFamille = Ext.getCmp('str_NAME');
                comboFamille.clearValue();
                comboFamille.getStore().getProxy().url = "../RetourFourData?lg_BON_LIVRAISON_ID=" + encodeURIComponent(refBl);
                comboFamille.getStore().reload();
                comboFamille.enable();
                comboFamille.focus(true, 100);
            }
        });
    },

    loadStore: function () {
        /* transmission du 07/11 (correction d'un retour refuse) : en modification, les lignes du retour ouvert ; sans
           identifiant, la grille restait vide */
        Ext.getCmp('gridpanelID').getStore().getProxy().setExtraParam('retourId', Me.getCurrent() || '');
        Ext.getCmp('gridpanelID').getStore().load({
            params: {
                retourId: Me.idRetour()
            },
            callback: this.onStoreLoad
        });
    },

    /* identifiant du retour affiche (cree dans cet ecran, ou ouvert en modification) */
    idRetour: function () {
        return Me.getCurrent() || (ref && ref !== '0' ? ref : null);
    },

    TYPES_PML: {RETOUR: 'Demande de retour', RECLAMATION: 'Réclamation', AUCUN: 'Non envoyé (motif interne)'},

    renduLignePml: function (id, meta) {
        var enc = Ext.String.htmlEncode, l = (Me.etatPml && Me.etatPml.parLigne || {})[id];
        if (!l) {
            return '';
        }
        var t = l.type || l.typePrevu, txt = (Me.TYPES_PML[t] || t) + (l.code ? ' ' + l.code : ''), cls = 'retour-pml-prevu';
        if (l.acceptee !== null && l.acceptee !== undefined) {
            txt = 'Accepté ' + l.acceptee + ' / ' + l.demandee + (l.dateReprise ? ' · reprise ' + l.dateReprise : '');
            cls = l.acceptee >= l.demandee ? 'blv-ok' : 'blv-ecart';
        } else if (l.type) {
            txt += ' · envoyé';
        }
        meta.tdAttr = 'data-qtip="' + enc(enc(txt + (l.commentaire ? ' — ' + l.commentaire : ''))) + '"';
        return '<span class="' + cls + '">' + enc(txt) + '</span>';
    },

    chargerEtatPml: function () {
        var id = Me.idRetour(), bouton = Ext.getCmp('btn_retour_pml'), etat = Ext.getCmp('retourPmlEtat');
        if (!id || !bouton) {
            return;
        }
        Ext.Ajax.request({
            url: '../api/v1/pharma/retour/' + encodeURIComponent(id), method: 'GET',
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {}, enc = Ext.String.htmlEncode;
                if (!o.success || !Ext.getCmp('btn_retour_pml')) {
                    return;
                }
                o.parLigne = {};
                Ext.each(o.lignes || [], function (l) {
                    o.parLigne[l.id] = l;
                });
                Me.etatPml = o;
                Ext.getCmp('gridpanelID').getView().refresh();
                var libelles = {EN_ATTENTE: 'Envoyé le ' + o.envoi + ' · réponse du grossiste attendue', REPONDU: 'Réponse du grossiste reçue le ' + o.reponse,
                    ENVOYE: 'Envoyé le ' + o.envoi, ERREUR: 'Dernier envoi refusé'};
                etat.update(o.statut ? '<span class="retour-pml-statut ' + o.statut.toLowerCase() + '">' + enc(libelles[o.statut] || o.statut) + '</span> '
                        + '<span class="retour-pml-detail">' + enc(o.detail || '') + '</span>' : '');
                var bloque = o.statut === 'EN_ATTENTE' || o.statut === 'REPONDU', vide = !(o.lignes || []).length;
                bouton.setDisabled(bloque || vide);
                bouton.setText(o.statut === 'REPONDU' ? 'Répondu par PharmaML' : o.statut === 'EN_ATTENTE' ? 'Envoyé (réponse attendue)'
                        : o.statut === 'ERREUR' ? 'Renvoyer par PharmaML' : 'Envoyer par PharmaML');
            }
        });
    },

    envoyerPharmaMl: function () {
        var id = Me.idRetour();
        if (!id) {
            return;
        }
        Ext.MessageBox.confirm('Envoyer par PharmaML', 'Envoyer ce retour au grossiste ?<br>Les lignes partent en demande de retour ou en réclamation selon leur motif.', function (b) {
            if (b !== 'yes') {
                return;
            }
            var attente = Ext.MessageBox.wait('Envoi au grossiste . . .', 'PharmaML');
            Ext.Ajax.request({
                url: '../api/v1/pharma/retour/' + encodeURIComponent(id), method: 'POST', timeout: 240000,
                success: function (r) {
                    attente.hide();
                    var o = Ext.decode(r.responseText, true) || {};
                    Ext.MessageBox.show({title: o.success ? 'Envoi PharmaML' : 'Envoi PharmaML impossible', width: 560,
                        msg: Ext.String.htmlEncode(o.msg || 'Envoi impossible.').replace(/ · /g, '<br>'),
                        buttons: Ext.MessageBox.OK, icon: o.success ? Ext.MessageBox.INFO : Ext.MessageBox.ERROR});
                    Me.chargerEtatPml();
                },
                failure: function (r) {
                    attente.hide();
                    Ext.MessageBox.alert('Envoi PharmaML', 'Erreur du serveur ' + r.status);
                }
            });
        });
    },
    onStoreLoad: function () {

    },
    onbtncancel: function () {

        testextjs.app.getController('App').onLoadNewComponentWithDataSource('retourfrsmanager', "", "", "");
    },
    /*
     * retours du 13/10 (point 1) : un profil qui porte le droit P_VALIDER_RETOUR_FRS valide le retour (sortie du stock) ;
     * sans ce droit, le retour est mis EN ATTENTE de validation (rien ne sort du stock). La confirmation se fait dans
     * le bouton lui-meme (premier clic : « Confirmer… », second clic : envoi), le resultat s'affiche dans le bouton.
     */
    peutValider: null,
    libelleEnregistrer: function () {
        return Me.peutValider === false ? 'Mettre en attente de validation' : 'Valider le retour';
    },
    chargerDroits: function () {
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/retourfournisseur/droits',
            success: function (response) {
                var r = Ext.JSON.decode(response.responseText, true) || {};
                Me.peutValider = r.peutValider === true;
                var b = Ext.getCmp('btn_save');
                if (b && !b.isDestroyed && !b.arme && !b.isDisabled()) {
                    b.setText(Me.libelleEnregistrer());
                    b.setTooltip(Me.peutValider ? 'Les quantités sortent du stock'
                            : 'Le retour attend qu\'un profil autorisé le valide : rien ne sort du stock en attendant');
                }
                Me.afficherBoutonsEtat();
            }
        });
    },
    /*
     * transmission du 07/11 : boutons selon l'etat du retour ouvert et le droit de validation.
     *  - en saisie, avec le droit : « Valider le retour » et « Mettre en attente » ;
     *  - en attente, avec le droit : « Valider le retour » et « Refuser » (motif obligatoire) ;
     *  - refuse (auteur ou valideur) : le motif du dernier refus reste visible ; « Remettre en attente » et
     *    « Abandonner » ; la validation directe n'est pas proposee ;
     *  - sans le droit : « Mettre en attente de validation », comme avant.
     */
    statutRetour: function () {
        var o = this.getOdatasource && this.getOdatasource();
        return (o && o.str_STATUT) || 'is_Process';
    },
    afficherBoutonsEtat: function () {
        var g = function (id) {
            var c = Ext.getCmp(id);
            return c && !c.isDestroyed ? c : null;
        };
        var save = g('btn_save'), att = g('btn_attente'), ref = g('btn_refuser'), ab = g('btn_abandonner'),
                motif = g('retourMotifRefus'), info = g('retourRefusInfo');
        if (!save) {
            return;
        }
        var statut = Me.statutRetour(), o = Me.getOdatasource() || {};
        var refuse = statut === 'is_Refused';
        save.setVisible(!refuse);
        att.setVisible(refuse ? o.peutCorriger !== false : (Me.peutValider === true && statut !== 'is_Waiting'));
        att.setText(refuse ? 'Remettre en attente' : 'Mettre en attente');
        ref.setVisible(Me.peutValider === true && statut === 'is_Waiting');
        motif.setVisible(Me.peutValider === true && statut === 'is_Waiting');
        ab.setVisible(refuse && o.peutCorriger !== false);
        info.setVisible(refuse);
        if (refuse) {
            info.update('<b>Refusé</b>' + (o.refusLe ? ' le ' + Ext.String.htmlEncode(o.refusLe) : '')
                    + (o.refusPar ? ' par ' + Ext.String.htmlEncode(o.refusPar) : '')
                    + ' : ' + Ext.String.htmlEncode(o.motifRefus || ''));
        }
    },
    /* confirmation dans le bouton : premier clic arme (« Confirmer… »), second clic envoie ; 6 s sans clic : desarme */
    armer: function (b, texteConfirmation, texteRepos) {
        if (b.arme) {
            clearTimeout(b.minuteur);
            b.arme = false;
            b.removeCls('prestige-confirmer-bouton');
            b.setText(texteRepos);
            return true;
        }
        b.arme = true;
        b.setText(texteConfirmation);
        b.addCls('prestige-confirmer-bouton');
        b.minuteur = setTimeout(function () {
            if (!b.isDestroyed && b.arme) {
                b.arme = false;
                b.removeCls('prestige-confirmer-bouton');
                b.setText(texteRepos);
            }
        }, 6000);
        return false;
    },
    envoyerEtat: function (b, url, corps, libelleAttente, libelleFait) {
        var fin = PrestigeChargement.occuper(b, libelleAttente);
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: url,
            params: Ext.JSON.encode(corps || {}),
            success: function (response) {
                var object = Ext.JSON.decode(response.responseText, true) || {};
                if (!object.success) {
                    fin(object.msg || 'Échec de l\'opération', false);
                    return;
                }
                Me.current = null;
                fin(libelleFait, true);
                setTimeout(function () {
                    testextjs.app.getController('App').onLoadNewComponentWithDataSource('retourfrsmanager', "", "", "");
                }, 1200);
            },
            failure: function (response) {
                var object = Ext.JSON.decode(response.responseText, true) || {};
                fin(object.msg || ('Le serveur n\'a pas répondu (' + response.status + ')'), false);
            }
        });
    },
    onbtnattente: function (b) {
        b = b || Ext.getCmp('btn_attente');
        var refuse = Me.statutRetour() === 'is_Refused';
        var repos = refuse ? 'Remettre en attente' : 'Mettre en attente';
        if (!Me.armer(b, refuse ? 'Confirmer la remise en attente' : 'Confirmer la mise en attente', repos)) {
            return;
        }
        if (refuse) {
            Me.envoyerEtat(b, '../api/v1/retourfournisseur/remettre-en-attente/' + encodeURIComponent(Me.idRetour()),
                    {}, 'Remise en attente', 'Retour remis en attente de validation');
            return;
        }
        Me.envoyerEtat(b, '../api/v1/retourfournisseur/mettre-en-attente', {"ref": Me.idRetour(),
            "refTwo": Ext.getCmp('str_REPONSE_FRS').getValue(), "description": Ext.getCmp('str_COMMENTAIRE').getValue()},
                'Mise en attente', 'Retour mis en attente de validation');
    },
    onbtnrefuser: function (b) {
        b = b || Ext.getCmp('btn_refuser');
        var champ = Ext.getCmp('retourMotifRefus'), motif = Ext.String.trim(champ.getValue() || '');
        if (!motif) {
            /* le motif est obligatoire : le bouton le dit, sans fenetre */
            b.setText('Motif obligatoire');
            b.addCls('prestige-confirmer-bouton');
            champ.focus();
            setTimeout(function () {
                if (!b.isDestroyed && !b.arme) {
                    b.removeCls('prestige-confirmer-bouton');
                    b.setText('Refuser');
                }
            }, 2500);
            return;
        }
        if (!Me.armer(b, 'Confirmer le refus', 'Refuser')) {
            return;
        }
        Me.envoyerEtat(b, '../api/v1/retourfournisseur/refuser/' + encodeURIComponent(Me.idRetour()), {motif: motif},
                'Refus', 'Retour refusé');
    },
    onbtnabandonner: function (b) {
        b = b || Ext.getCmp('btn_abandonner');
        if (!Me.armer(b, 'Confirmer l\'abandon', 'Abandonner')) {
            return;
        }
        Me.envoyerEtat(b, '../api/v1/retourfournisseur/abandonner/' + encodeURIComponent(Me.idRetour()), {},
                'Abandon', 'Retour abandonné');
    },
    onbtnvalider: function (b) {
        b = b || Ext.getCmp('btn_save');
        if (!b.arme) {
            b.arme = true;
            b.setText(Me.peutValider === false ? 'Confirmer la mise en attente' : 'Confirmer : les quantités sortent du stock');
            b.addCls('prestige-confirmer-bouton');
            b.minuteur = setTimeout(function () {
                if (!b.isDestroyed && b.arme) {
                    b.arme = false;
                    b.removeCls('prestige-confirmer-bouton');
                    b.setText(Me.libelleEnregistrer());
                }
            }, 6000);
            return;
        }
        clearTimeout(b.minuteur);
        b.arme = false;
        b.removeCls('prestige-confirmer-bouton');
        b.setText(Me.libelleEnregistrer());
        var valider = Me.peutValider !== false;
        var fin = PrestigeChargement.occuper(b, valider ? 'Validation du retour' : 'Mise en attente');
        var param = {"ref": Me.idRetour(),
            "refTwo": Ext.getCmp('str_REPONSE_FRS').getValue(),
            "description": Ext.getCmp('str_COMMENTAIRE').getValue()
        };
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: valider ? '../api/v1/produit/validerretourfour' : '../api/v1/retourfournisseur/mettre-en-attente',
            params: Ext.JSON.encode(param),
            success: function (response) {
                var object = Ext.JSON.decode(response.responseText, true) || {};
                if (!object.success) {
                    fin(object.msg || 'Échec de l\'opération', false);
                    return;
                }
                Me.current = null;
                fin(valider ? 'Retour validé' : 'Retour mis en attente de validation', true);
                setTimeout(function () {
                    testextjs.app.getController('App').onLoadNewComponentWithDataSource('retourfrsmanager', "", "", "");
                }, 1200);
            },
            failure: function (response) {
                fin('Le serveur n\'a pas répondu (' + response.status + ')', false);
            }
        });
    },
    onbtnadd: function () {

        if (ref === "" || ref === undefined) {
            ref = null;
        }
        if (Ext.getCmp('lg_BON_LIVRAISON_ID').getValue() === null) {
            Ext.MessageBox.alert('Error Message', 'Renseignez le BonLivraison ');
            return;
        }
        if (Ext.getCmp('lg_MOTIF_RETOUR').getValue() === null) {
            Ext.MessageBox.alert('Error Message', 'Renseignez le motif ');
            return;
        }
        if (Ext.getCmp('str_NAME').getValue() == null || Ext.getCmp('str_NAME').getValue() == "") {
            Ext.MessageBox.alert('Error Message', 'Veuillez selecttionner un article');
            return;
        }
        let url = '../api/v1/retourfournisseur/new';
        let params = {};
        if (Me.getCurrent()) {
            url = '../api/v1/retourfournisseur/add-item';
            params = {
                produitId: Ext.getCmp('lg_FAMILLE_ID_VENTE').getValue(),
                lgRETOURFRSID: Me.getCurrent(),
                lgMOTIFRETOUR: Ext.getCmp('lg_MOTIF_RETOUR').getValue(),
                intNUMBERRETURN: Ext.getCmp('int_QUANTITE').getValue()
            };
        } else {
            params = {
                lgBONLIVRAISONID: Ext.getCmp('lg_BON_LIVRAISON_ID').getValue(),
                /* RF-02 : le BL choisi par son identifiant (le numero seul designe le BL homonyme le plus recent) */
                blId: Me.blChoisi ? Me.blChoisi.get('lg_BON_LIVRAISON_ID') : null,
                strCOMMENTAIRE: Ext.getCmp('str_COMMENTAIRE').getValue(),
                items: [{
                        produitId: Ext.getCmp('lg_FAMILLE_ID_VENTE').getValue(),
                        lgMOTIFRETOUR: Ext.getCmp('lg_MOTIF_RETOUR').getValue(),
                        intNUMBERRETURN: Ext.getCmp('int_QUANTITE').getValue()
                    }]

            };
        }
        ;
        let progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: url,
            params: Ext.JSON.encode(params),
            success: function (response)
            {
                progress.hide();
                let result = Ext.JSON.decode(response.responseText, true);
                if (!result.success) {
                    Ext.MessageBox.alert('Error Message', result.msg);

                } else {
                    let data = result.data;
                    Me.current = data.lgRETOURFRSID;
                    /* decision 17 D7 : meme produit, autre motif -> nouvelle ligne, signalee sans bloquer */
                    if (data.message && window.PrestigeToast) {
                        PrestigeToast.afficher(data.message, {niveau: 'alerte'});
                    }

                    Ext.getCmp('lg_BON_LIVRAISON_ID').disable();
                    Ext.getCmp('str_NAME').setValue("");
                    Ext.getCmp('lg_MOTIF_RETOUR').setValue("");
                    Ext.getCmp('int_QUANTITE').setValue(1);

                    let OComboFamille = Ext.getCmp('str_NAME');
                    OComboFamille.focus();
                    Ext.getCmp('gridpanelID').getStore().load({
                        params: {
                            retourId: data.lgRETOURFRSID

                        }
                    });
                }

            },
            failure: function (response)
            {
                progress.hide();

                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    },
    onRemoveClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'Confirmer la suppresssion', function () {
                        const rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            method: 'DELETE',
                            headers: {'Content-Type': 'application/json'},
                            url: '../api/v1/retourfournisseur/remove-item/' + rec.get('lgRETOURFRSDETAIL'),
                            success: function (response)
                            {
                                let object = Ext.JSON.decode(response.responseText, false);
                                if (!object.success) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                }
                                Ext.getCmp('gridpanelID').getStore().load({
                                    params: {
                                        retourId: Me.getCurrent()

                                    }
                                });
                            },
                            failure: function (response)
                            {

                                Ext.MessageBox.alert('Error Message', response.responseText);
                            }
                        });

                    });
    }
});


