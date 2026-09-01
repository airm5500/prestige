/* global Ext */

var Me_Window;

/*
 * L'ecran de saisie de commande, retrouve sans passer par la variable globale.
 *
 * « Me_Window » est partagee par trois ecrans, et la fenetre de creation d'un produit la
 * reaffecte a la fin (« Me_Window = Oview ») - or « Oview » est elle-meme une globale, posee
 * par plus de cent cinquante fichiers. Ouvrir une sous-fenetre depuis la creation d'un produit
 * suffisait donc a faire pointer « Me_Window » ailleurs, et le premier geste suivant echouait
 * sur « Me_Window.onAddNewItem is not a function », plus aucun produit ne pouvant etre ajoute.
 *
 * On remonte desormais a l'ecran par le composant qui declenche l'evenement quand on l'a sous
 * la main, sinon par son type - il n'y en a qu'un d'ouvert a la fois. La globale ne sert plus
 * que de dernier repli.
 */
function ecranCommande(composant) {
    if (composant && composant.up) {
        var parent = composant.up('ordermanagerlist');
        if (parent) {
            return parent;
        }
    }
    return Ext.ComponentQuery.query('ordermanagerlist')[0] || Me_Window;
}
var Omode;
var ref;
var ref_final;
var famille_id_search;
var LaborexWorkFlow;
var int_montant_vente;
var int_montant_achat;
var str_STATUT;
var storerepartiteur;
var store_details_order;
Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';

function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.commandemanagement.order.action.add', {
    extend: 'Ext.form.Panel',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.form.*',
        'Ext.layout.container.Column',
        'testextjs.model.Famille',
        'testextjs.controller.LaborexWorkFlow',
        'testextjs.model.Grossiste',
        'testextjs.model.OrderDetail',
        'testextjs.view.configmanagement.famille.action.detailArticle'
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
        orderRef: null,
        prixAchat: null
    },
    xtype: 'ordermanagerlist',
    id: 'ordermanagerlistID',

    title: 'Modifier les informations de la commande',
    bodyStyle: 'background-color: #E5E9EC;',
    /* battement du champ actif (vp-focus-beat) : activé sur cet écran */
    cls: 'vp-focus-zone',
    bodyPadding: 5,
    layout: 'column',
    width: '97%',
    height: 'auto',
    minHeight: 570,
    initComponent: function () {
        Me_Window = this;
        let itemsPerPage = 100;
        let itemsPerPageGrid = 10;
        famille_id_search = "";

        LaborexWorkFlow = Ext.create('testextjs.controller.LaborexWorkFlow', {});
        // Dans initComponent, l'ecran n'est pas encore rendu : « this » est la seule reference
        // sure, aucune recherche par type ne le trouverait encore.
        ref = this.getNameintern();
        if (ref === "0") {
            str_STATUT = this.getOdatasource();
        }
        ref_final = ref;
        /* « titre » etait pose sans « var » : une globale, ecrite par une quinzaine d'ecrans.
         * On la garde locale ici, l'ecran n'a aucune raison de la partager. */
        let titre = this.getTitre();
        this.prixAchat = this.getOdatasource()?.PRIX_ACHAT_TOTAL;
        this.title = titre;
        let produitStore = new Ext.data.Store({
            model: 'testextjs.model.caisse.Produit',
            pageSize: 10,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/vente/search',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        let store = Ext.create('testextjs.store.Search');
        let store_type = new Ext.data.Store({
            fields: ['str_TYPE_TRANSACTION', 'str_desc'],
            data: [

                {str_TYPE_TRANSACTION: 'PRIX_VENTE_DIFF', str_desc: 'PRIX DE VENTE BL DIFFERENT DU PRIX EN MACHINE'},
                {
                    str_TYPE_TRANSACTION: 'PRIX_VENTE_PLUS_30',
                    str_desc: 'PRIX DE VENTE BL DIFFERENT DU PRIX EN MACHINE DE 30F'
                },
                {str_TYPE_TRANSACTION: 'ALL', str_desc: 'Tous'}

            ]
        });

        storerepartiteur = new Ext.data.Store({
            model: 'testextjs.model.Grossiste',
            pageSize: 999,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/grossiste/all',

                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 240000
            }

        });

        store_details_order = new Ext.data.Store({
            model: 'testextjs.model.OrderDetail',
            pageSize: itemsPerPageGrid,
            autoLoad: false,
            proxy: {
                type: 'ajax',

                url: '../api/v1/commande/commande-en-cours-items',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                },
                timeout: 180000
            }

        });
        let int_VENTE = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Valeur Vente ::',
                    labelWidth: 95,
                    name: 'int_VENTE',
                    id: 'int_VENTE',
                    fieldStyle: "color:red;font-weight:bold;font-size:1.5em",
                    margin: '0 15 0 0',
                    value: "0"
                });
        let int_ACHAT = new Ext.form.field.Display(
                {
                    xtype: 'displayfield',
                    fieldLabel: 'Valeur Achat ::',
                    labelWidth: 95,
                    name: 'int_ACHAT',
                    id: 'int_ACHAT',
                    fieldStyle: "color:red;font-weight:bold;font-size:1.5em",
                    margin: '0 15 0 0',
                    value: "0"
                });

        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });
        const me = this;
        Ext.apply(me, {
            width: '98%',
            cls: 'screen-wrap',
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
            // ecran plein page, les cadres du haut devenaient d'immenses cadres vides et le
            // detail de la commande etait ecrase. Les cadres du haut prennent leur hauteur
            // naturelle, le detail recoit la place restante.
            id: 'panelID',
            items: [
                {
                    xtype: 'fieldset',
                    title: 'Infos Generales',
                    collapsible: true,
                    cls: 'ig-card ig-simple',
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
                            items: [{
                                    xtype: 'combobox',
                                    fieldLabel: 'Repartiteur',
                                    allowBlank: false,
                                    name: 'Code.Rep',
                                    margin: '5 15 0 0',
                                    id: 'lgGROSSISTEID',
                                    store: storerepartiteur,
                                    valueField: 'lg_GROSSISTE_ID',
                                    displayField: 'str_LIBELLE',
                                    // typeAhead retire : pre-completait avec le premier resultat
                                    pageSize: 999,
                                    queryMode: 'remote',
                                    width: 450,
                                    emptyText: 'Choisir un repartiteur...',
                                    listeners: {
                                        afterrender: function (field) {
                                            field.focus(true, 50);
                                        },
                                        select: function (cmp) {

                                            /* Ce listener se declenche longtemps apres l'ouverture :
                                             * c'est l'ecran lui-meme qu'on interroge, pas une globale. */
                                            if (ecranCommande(cmp).estModification()) {
                                                ecranCommande(cmp).onchangeGrossiste();
                                            } else {
                                                Ext.getCmp('str_NAME').focus(true, 100, function () {
                                                    Ext.getCmp('str_NAME').selectText(0, 1);
                                                });
                                            }

                                        }
                                    }

                                },

                                int_ACHAT,
                                int_VENTE]
                        }]
                }
                ,
                {
                    xtype: 'fieldset',
                    title: 'Ajout Produit',
                    collapsible: true,
                    defaultType: 'textfield',
                    cls: 'dg-card',
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
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Article',
                                    // id: 'str_NAME',
                                    store: produitStore,
                                    pageSize: 10,
                                    valueField: 'lgFAMILLEID',
                                    displayField: 'strNAME',
                                    width: 600,
                                    margins: '0 10 5 10',
                                    queryMode: 'remote',
                                    autoSelect: true,
                                    typeAhead: false,
                                    typeAheadDelay: 0,
                                    forceSelection: true,
                                    enableKeyEvents: true,
                                    minChars: 3,
                                    queryCaching: false,
//                                    selectOnFocus: true,
                                    hidden: true,
                                    emptyText: 'Choisir un article par Nom ou Cip...',
//                                    triggerAction: 'all',
                                    listConfig: {
                                        loadingText: 'Recherche...',
                                        emptyText: 'Pas de données trouvées.',
                                        getInnerTpl: function () {
                                            return '<tpl for="."><tpl if="intNUMBERAVAILABLE <=0"><span style="color:#17987e;font-weight:bold;"><span style="width:100px;display:inline-block;">{intCIP}</span>{strNAME} <span style="float: right;"> ( {intPRICE} )</span></span><tpl else><span style="font-weight:bold;"><span style="width:100px;display:inline-block;">{intCIP}</span>{strNAME} <span style="float: right; "> ( {intPRICE} )</span></span></tpl></tpl>';

                                        }
                                    },
                                    listeners: {
                                        select: function (cmp) {
                                            let value = cmp.getValue();
                                            let record = cmp.findRecord(cmp.valueField || cmp.displayField, value); //recupere la ligne de l'element selectionné
                                            Ext.getCmp('lg_FAMILLE_ID_VENTE').setValue(record.get('lg_FAMILLE_ID'));
                                            if (value === "0" || value === "Cliquez ici pour créer un nouvel article") {
                                                ecranCommande().onbtnaddArticle();
                                            } else {
                                                Ext.getCmp('int_QUANTITE').focus(true, 100, function () {
                                                    Ext.getCmp('int_QUANTITE').selectText(0, 1);
                                                });
                                            }
                                            Ext.getCmp('btn_detail').enable();

                                        }
                                    }

                                },
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Article',
                                    name: 'str_NAME',
                                    id: 'str_NAME',
                                    store: store,
                                    margins: '0 10 5 10',

                                    valueField: 'CIP',
                                    displayField: 'str_DESCRIPTION',
                                    enableKeyEvents: true,
                                    pageSize: 20,
                                    // typeAhead retire : il pre-completait le champ avec le premier
                                    // resultat et la liste se retrouvait filtree sur ce seul produit
                                    width: 600,
//                                    flex:2
                                    queryMode: 'remote',
                                    minChars: 3,
                                    emptyText: 'Choisir un article par Nom ou Cip...',
                                    listConfig: {
                                        getInnerTpl: function () {
                                            return '<tpl for="."><tpl if="int_NUMBER_AVAILABLE <=0"><span style="color:#17987e;font-weight:bold;"><span style="width:100px;display:inline-block;">{CIP}</span>{str_DESCRIPTION} <span style="float: right;"> ( {int_PAF} ) <span>&nbsp;&nbsp;&nbsp;</span>  <span style="color:red;font-weight:bold;"> ( {int_NUMBER_AVAILABLE} ) </span></span></span><tpl else><span style="font-weight:bold;"><span style="width:100px;display:inline-block;">{CIP}</span>{str_DESCRIPTION} <span style="float: right; "> ( {int_PAF} )<span>&nbsp;&nbsp;&nbsp;</span>  <span style="color:red;font-weight:bold;"> ( {int_NUMBER_AVAILABLE} ) </span></span></span></tpl></tpl>';
                                        }
                                    },
                                    listeners: {
                                        select: function (cmp) {
                                            let value = cmp.getValue();
                                            let record = cmp.findRecord(cmp.valueField || cmp.displayField, value); //recupere la ligne de l'element selectionné
                                            Ext.getCmp('lg_FAMILLE_ID_VENTE').setValue(record.get('lg_FAMILLE_ID'));
                                            if (value === "0" || value === "Cliquez ici pour créer un nouvel article") {
                                                ecranCommande().onbtnaddArticle();
                                            } else {
                                                Ext.getCmp('int_QUANTITE').focus(true, 100, function () {
                                                    Ext.getCmp('int_QUANTITE').selectText(0, 1);
                                                });
                                            }
                                            Ext.getCmp('btn_detail').enable();

                                        }
                                    }
                                },
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
                                    fieldLabel: 'Quantit&eacute;',
                                    emptyText: 'Quantite',
                                    name: 'int_QUANTITE',
                                    id: 'int_QUANTITE',
                                    xtype: 'numberfield',
                                    margin: '0 15 0 10',
                                    minValue: 1,
                                    width: 75,
                                    value: 1,
                                    allowBlank: false,
                                    enableKeyEvents: true,
                                    regex: /[0-9.]/,
                                    listeners: {
                                        specialKey: function (field, e, options) {
                                            if (e.getKey() === e.ENTER) {

                                                if (Ext.getCmp('str_NAME').getValue() !== "") {

                                                    if (Ext.getCmp('int_QUANTITE').getValue() > 0) {
                                                        ecranCommande(field).onAddNewItem();

                                                    } else {
                                                        Ext.MessageBox.alert('Error Message', 'La quantité doit être supérieure à 0 ');
                                                    }

                                                } else {
                                                    Ext.MessageBox.alert('Error Message', 'Verifiez votre selection svp');

                                                }

                                            }
                                        }
                                    }

                                },
                                {
                                    /* Visible en permanence : avant, la creation n'apparaissait que via la
                                     * pseudo-ligne « Cliquez ici pour creer un nouvel article » de la recherche. */
                                    text: 'Cr&eacute;er un produit',
                                    id: 'btn_add_article',
                                    cls: 'btn-primaryb',
                                    iconCls: 'addicon',
                                    tooltip: 'Creer un nouveau produit (grossiste de la commande prerempli)',
                                    margins: '0 0 0 6',
                                    xtype: 'button',
                                    handler: this.onbtnaddArticle
                                },
                                {
                                    text: 'Voir infos produit',
                                    id: 'btn_detail',
                                    cls: 'btn-primary',
                                    margins: '0 0 0 6',
                                    xtype: 'button',
                                    handler: this.onbtndetail,
                                    disabled: true
                                }]
                        }
                    ]
                }
                ,
                {
                    xtype: 'fieldset',
                    title: 'Detail(s) Commandes',
                    collapsible: true,
                    cls: 'dg-card',
                    // seul cadre a recevoir la place restante ; minHeight garde les 370 px
                    // d'origine si l'ecran venait a etre affiche en hauteur automatique
                    flex: 1,
                    minHeight: 370,
                    defaultType: 'textfield',
                    layout: 'fit',
                    items: [
                        {
                            xtype: 'gridpanel',
                            id: 'gridpanelID',
                            cls: 'my-grid-header',
                            plugins: [this.cellEditing],
                            store: store_details_order,
                            columns: [
                                {
                                    xtype: 'rownumberer',
                                    text: '#',
                                    hidden: false,
                                    width: 40,
                                    sortable: true
                                },
                                {
                                    dataIndex: 'prixDiff',
                                    text: '',
                                    width: 40,
                                    renderer: function (v, m, r) {
                                        if (v) {
                                            m.style = 'background-color:#d9534f;';
                                        }
                                        return '';
                                    }
                                },

                                {
                                    text: 'Details Suggestion Id',
                                    flex: 1,
                                    sortable: true,
                                    hidden: true,
                                    dataIndex: 'lg_ORDERDETAIL_ID',
                                    id: 'lg_ORDERDETAIL_ID'
                                }, {
                                    text: 'Famille',
                                    flex: 1,
                                    sortable: true,
                                    hidden: true,
                                    dataIndex: 'lg_FAMILLE_ID'
                                },

                                {
                                    text: 'CIP',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'lg_FAMILLE_CIP'
                                },
                                {
                                    text: 'CODE ARTICLE',
                                    flex: 1,
                                    hidden: true,
                                    sortable: true,
                                    dataIndex: 'str_CODE_ARTICLE'
                                },
                                {
                                    text: 'DESIGNATION',
                                    flex: 2.5,
                                    sortable: true,
                                    dataIndex: 'lg_FAMILLE_NAME'
                                },
                                {
                                    text: 'STOCK',
                                    flex: 0.5,
                                    sortable: true,
                                    renderer: function (value) {
                                        return '<span style="color:purple; font-weight:bold; font-size:1em;">' + amountformat(value) + '</span>';
                                    },
                                    dataIndex: 'lg_FAMILLE_QTE_STOCK',
                                    align: 'right'
                                },

                                {
                                    text: 'PV.MACHINE',
                                    flex: 1,
//                                    hidden: true,
                                    align: 'right',
                                    sortable: true,
                                    dataIndex: 'int_PRICE_MACHINE',
                                    renderer: function (value) {
                                        return '<span style="color:black; font-weight:bold; font-size:1em;">' + amountformat(value) + '</span>';
                                    }

                                },

                                {
                                    text: 'PV IMPORT',
                                    flex: 1,
                                    sortable: true,
                                    align: 'right',
                                    dataIndex: 'lg_FAMILLE_PRIX_VENTE',
                                    renderer: function (value) {
                                        return '<span style="color:blue; font-weight:bold; font-size:1em;">' + amountformat(value) + '</span>';
                                    },
                                    editor: {
                                        xtype: 'numberfield',
                                        minValue: 1,
                                        allowBlank: false,
                                        regex: /[0-9.]/,
                                        selectOnFocus: true,
                                        hideTrigger: true


                                    }

                                },
                                {
                                    text: 'PA.MACHINE',
                                    flex: 1,
                                    align: 'right',
                                    sortable: true,
                                    dataIndex: 'lg_FAMILLE_PRIX_ACHAT',
                                    renderer: function (value) {
                                        return '<span style="color:black; font-weight:bold; font-size:1em;">' + amountformat(value) + '</span>';
                                    }

                                },
                                {
                                    text: 'PA.IMPORT',
                                    flex: 1,
                                    sortable: true,
                                    align: 'right',
                                    dataIndex: 'int_PAF',
                                    renderer: function (value) {
                                        return '<span style="color:blue; font-weight:bold; font-size:1em;">' + amountformat(value) + '</span>';
                                    },
                                    editor: {
                                        xtype: 'numberfield',
                                        minValue: 1,
                                        allowBlank: false,
                                        regex: /[0-9.]/,
                                        selectOnFocus: true,
                                        hideTrigger: true
                                    }
                                },
                                {
                                    text: 'PRIX TIPS',
                                    flex: 1,
                                    sortable: true,
                                    hidden: true,
                                    align: 'right',
                                    renderer: amountformat,
                                    dataIndex: 'int_PRIX_REFERENCE',
                                    editor: {
                                        xtype: 'numberfield',
                                        minValue: 1,
                                        allowBlank: false,
                                        regex: /[0-9.]/
                                    }
                                },
                                {
                                    header: 'QTE',
                                    dataIndex: 'int_NUMBER',
                                    flex: 0.5,
                                    renderer: function (value) {
                                        return '<span style="color:green; font-weight:bold; font-size:1em;">' + amountformat(value) + '</span>';
                                    },
                                    align: 'right',
                                    editor: {
                                        minValue: 1,
                                        xtype: 'numberfield',
                                        allowBlank: false,
                                        selectOnFocus: true,
                                        maskRe: /[0-9.]/
                                    }
                                },

                                {
                                    text: 'MONTANT',
                                    flex: 1,
                                    align: 'right',
                                    renderer: amountformat,
                                    sortable: true,
                                    dataIndex: 'int_PRICE'
                                }, {
                                    header: 'LOTS',
                                    dataIndex: 'lotNums',
                                    flex: 1.1
                                },
                                {
                                    header: 'DATE DE PEREMPTION',

                                    dataIndex: 'datePeremption',
                                    flex: 1.1
                                },

                                {
                                    xtype: 'actioncolumn',
                                    width: 30,
                                    sortable: false,
                                    menuDisabled: true,
                                    items: [{
                                            icon: 'resources/images/duplicate_3671686.png',
                                            tooltip: 'Voir lots',
                                            scope: this,
                                            handler: this.onVoirLots,
                                            getClass: function (value, metadata, record) {
                                                if (record.get('lots').length > 0) {
                                                    return 'x-display-hide'; //affiche l'icone
                                                } else {
                                                    return 'x-hide-display'; //cache l'icone
                                                }
                                            }
                                        }]
                                },
                                {
                                    xtype: 'actioncolumn',
                                    width: 30,
                                    sortable: false,
                                    menuDisabled: true,
                                    items: [{
                                            icon: 'resources/images/icons/fam/application_view_list.png',
                                            tooltip: 'Detail sur l\'article',
                                            scope: this,
                                            handler: this.onDetailClick
                                        }]
                                },
                                {
                                    xtype: 'actioncolumn',
                                    width: 30,
                                    sortable: false,
                                    menuDisabled: true,
                                    items: [{
                                            icon: 'resources/images/icons/fam/grossiste.png',
                                            tooltip: 'Gerer le code article grossiste',
                                            scope: this,
                                            handler: this.onAddGrossisteClick,
                                            getClass: function (value, metadata, record) {
                                                if (record.get('str_CODE_ARTICLE') == "") {
                                                    return 'x-display-hide'; //affiche l'icone
                                                } else {
                                                    return 'x-hide-display'; //cache l'icone
                                                }
                                            }
                                        }]
                                },
                                {
                                    xtype: 'actioncolumn',
                                    width: 30,
                                    sortable: false,
                                    menuDisabled: true,
                                    items: [{
                                            /* Un crayon sur une feuille ne disait pas « code-barres » :
                                             * pictogramme dedie (vente-theme.css). */
                                            iconCls: 'vp-icone-ean',
                                            tooltip: 'Ajouter ou modifier le code EAN de cet article',
                                            scope: this,
                                            handler: this.onMajCodeEanClick
                                        }]
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
                            tbar: [{
                                    xtype: 'textfield',
                                    id: 'rechercherDetail',
                                    name: 'rechercherDetail',
                                    emptyText: 'Recherche',
                                    flex: 1,
                                    listeners: {
                                        'render': function (cmp) {
                                            cmp.getEl().on('keypress', function (e) {
                                                if (e.getKey() === e.ENTER) {
                                                    ecranCommande().onRechClick();
                                                }
                                            });
                                        }
                                    }
                                },
                                '-', {
                                    xtype: 'combobox',
                                    name: 'str_TYPE_TRANSACTION',
                                    margins: '0 0 0 10',
                                    id: 'str_TYPE_TRANSACTION',
                                    store: store_type,
                                    valueField: 'str_TYPE_TRANSACTION',
                                    displayField: 'str_desc',
                                    typeAhead: true,
                                    queryMode: 'local',
                                    emptyText: 'Filtre article...',
                                    value: 'ALL',
                                    flex: 1,
                                    listeners: {
                                        select: function (cmp) {
                                            const value = cmp.getValue();
                                            str_TYPE_TRANSACTION = value;


                                            ecranCommande().onRechClick();
                                        }
                                    }
                                }


                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: itemsPerPageGrid,
                                store: store_details_order,
                                displayInfo: true,
                                plugins: new Ext.ux.ProgressBarPager(),
                                listeners: {
                                    beforechange: function (page, currentPage) {

                                        const myProxy = this.store.getProxy();
                                        const val = Ext.getCmp('rechercherDetail');
                                        const filtre = Ext.getCmp('str_TYPE_TRANSACTION');

                                        myProxy.params = {
                                            query: '',
                                            filtre: 'ALL',
                                            orderId: ecranCommande().getNameintern()

                                        };
                                        myProxy.setExtraParam('query', val.getValue());
                                        myProxy.setExtraParam('filtre', filtre.getValue());
                                        myProxy.setExtraParam('orderId', ecranCommande().getNameintern());
                                    }

                                }

                            },
                            listeners: {
                                scope: this

                            }
                        }

                    ]

                },
                {
                    xtype: 'toolbar',
                    ui: 'footer',
                    dock: 'bottom',
                    border: '0',
                    items: [
                        /* Export CSV de la commande en cours : meme fichier (CIP;QTE) que les
                         * autres exports, telecharge directement au clic. */
                        {
                            text: 'Exporter CSV',
                            id: 'btn_export_cmd_csv',
                            cls: 'btn-primary',
                            iconCls: 'export_csv_icon',
                            tooltip: 'Exporter les lignes de cette commande au format CSV',
                            scope: this,
                            handler: this.onExportCsvCommande
                        },
                        /* Import de la reponse du grossiste : fichier CSV ou Excel, une ligne par
                         * produit. L'import n'ecrit rien tout seul - il rend un compte rendu que
                         * l'officine lit avant de decider, les substitutions etant signalees. */
                        {
                            text: 'Importer la réponse du grossiste',
                            id: 'btn_import_reponse',
                            cls: 'btn-primary',
                            iconCls: 'importicon',
                            tooltip: 'Charger le fichier de réponse (CSV ou Excel) envoyé par le grossiste',
                            scope: this,
                            handler: this.onImporterReponseGrossiste
                        },
                        '->',
                        {
                            text: 'CREER BON DE LIVRAISON',
                            id: 'btn_creerbl',
                            cls: 'btn-primary',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            handler: this.onCreateBLClick
                        },

                        {
                            text: 'Retour',
                            id: 'btn_cancel',
                            cls: 'btn-primary',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            hidden: false,
                            handler: this.onbtncancel
                        }
                    ]
                }
            ]
        });
        this.callParent();
        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });
        if (str_STATUT === "is_Waiting") {
            Ext.getCmp('btn_save').show();
        }

        if (this.estModification()) {
            this.poserRepartiteurDeLaCommande(this.getOdatasource());
            int_montant_achat = Ext.util.Format.number(this.getOdatasource().PRIX_ACHAT_TOTAL, '0,000.');
            int_montant_vente = Ext.util.Format.number(this.getOdatasource().PRIX_VENTE_TOTAL, '0,000.');
            Ext.getCmp('int_VENTE').setValue(int_montant_vente + '  CFA');
            Ext.getCmp('int_ACHAT').setValue(int_montant_achat + '  CFA');
            str_STATUT = this.getOdatasource().str_STATUT;

        }


        Ext.getCmp('gridpanelID').on('edit', function (editor, e) {
            let qte = Number(e.record.data.int_NUMBER);
            let url = '../api/v1/commande/updateorderitem';
            testextjs.app.getController('App').ShowWaitingProcess();
            if (e.field === 'lg_FAMILLE_PRIX_VENTE') {
                url = '../api/v1/commande/orderitem-prix-vente';
            }
            Ext.Ajax.request({
                url: url,
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                params: Ext.JSON.encode({
                    id: e.record.data.lg_ORDERDETAIL_ID,
                    grossisteId: Ext.getCmp('lgGROSSISTEID').getValue(),
                    prixAchat: e.record.data.int_PAF,
                    prixVente: e.record.data.lg_FAMILLE_PRIX_VENTE,
                    stock: qte
                }),
                success: function (response) {
                    testextjs.app.getController('App').StopWaitingProcess();
                    const object = Ext.JSON.decode(response.responseText, true);
                    if (!object.success) {
                        Ext.MessageBox.alert('Error Message', "L'opération a échoué");
                        Ext.getCmp('gridpanelID').getStore().reload();
                        return;
                    }

                    e.record.commit();
                    Ext.getCmp('gridpanelID').getStore().reload();

                    Ext.getCmp('str_NAME').focus(true, 100, function () {
                        Ext.getCmp('str_NAME').setValue("");
                        Ext.getCmp('str_NAME').selectText(0, 1);
                    });

                    ecranCommande().getCommandeAmount(ecranCommande().getNameintern());
                },
                failure: function (response) {
                    testextjs.app.getController('App').StopWaitingProcess();
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('Error Message', response.responseText);
                }
            });
        });
    },
    /*
     * L'ecran sert a DEUX choses : creer une commande, ou modifier une commande existante. Le mode
     * se lisait jusqu'ici en comparant le titre de la fenetre a la chaine « Modifier les informations
     * de la commande » - et ce titre etait range dans une globale partagee par une quinzaine
     * d'ecrans. Ouvrir un autre ecran entre-temps suffisait donc a fausser le test : on choisissait
     * la mauvaise branche sans le moindre message.
     *
     * On se fonde desormais sur ce qui distingue vraiment les deux ouvertures. OrderManager passe
     * l'identifiant de la commande en modification (« onManageDetailsClick ») et la chaine « 0 » en
     * creation (« onAddClick ») ; c'est deja ce que lit le debut de initComponent. Renommer le menu
     * ou traduire le titre ne casse plus rien.
     *
     * A noter : la configuration « mode » n'est pas utilisable ici. Le chargeur generique
     * onLoadNewComponentWithDataSource ne transmet que nameintern, titre et odatasource - « mode »
     * resterait vide et l'ecran croirait etre en creation.
     */
    estModification: function () {
        return this.getNameintern() !== "0";
    },

    /*
     * Repartiteur de la commande rappele a l'ouverture, en modification.
     *
     * L'ecran posait ici le LIBELLE du repartiteur dans une liste dont la valeur est un identifiant.
     * Tant que l'utilisateur ne rouvrait pas la liste, tout ce que l'ecran envoyait ensuite comme
     * « grossisteId » etait donc ce libelle : la creation d'un produit depuis la commande recevait un
     * libelle et ne pouvait pas preselectionner le repartiteur.
     *
     * On pose desormais l'identifiant, apres avoir mis la ligne correspondante dans le magasin - sans
     * elle la liste afficherait l'identifiant brut au lieu du libelle, le magasin n'etant charge qu'au
     * premier deroulement. A defaut d'identifiant on repose le libelle, exactement comme avant : une
     * base qui ne le renverrait pas se comporte comme aujourd'hui plutot que de perdre l'affichage.
     */
    poserRepartiteurDeLaCommande: function (source) {
        var combo = Ext.getCmp('lgGROSSISTEID');
        if (!combo || !source) {
            return;
        }
        var libelle = source.str_GROSSISTE_LIBELLE;
        var identifiant = source.lg_GROSSISTE_ID;
        if (!identifiant) {
            combo.setValue(libelle);
            return;
        }
        var magasin = combo.getStore();
        if (magasin && magasin.findExact('lg_GROSSISTE_ID', identifiant) === -1) {
            magasin.add({lg_GROSSISTE_ID: identifiant, str_LIBELLE: libelle || identifiant});
        }
        combo.setValue(identifiant);
    },

    loadStore: function () {
        ecranCommande().onRechClick();
    },

    onbtndetail: function () {

        new testextjs.view.configmanagement.famille.action.detailArticle({

            produitId: Ext.getCmp('lg_FAMILLE_ID_VENTE').getValue(),
            parentview: this,
            mode: "detail",
            titre: "Detail sur l'article [" + Ext.getCmp('str_NAME').getValue() + "]"
        });
    },
    onchangeGrossiste: function () {
        testextjs.app.getController('App').ShowWaitingProcess();

        Ext.Ajax.request({
            url: '../api/v1/commande/change-grossiste',
            method: 'GET',
            timeout: 2400000,
            params: {
                orderId: ecranCommande().getNameintern(),
                grossisteId: Ext.getCmp('lgGROSSISTEID').getValue()
            },
            success: function (response) {
                testextjs.app.getController('App').StopWaitingProcess();

                Ext.getCmp('str_NAME').focus(true, 100, function () {
                    Ext.getCmp('str_NAME').selectText(0, 1);
                });

            },
            failure: function (response) {

                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
                testextjs.app.getController('App').StopWaitingProcess();
            }
        });
    },
    /* Export CSV des lignes de la commande ouverte : meme format que les autres exports
     * (code produit ; quantite), telecharge directement au clic. */
    onExportCsvCommande: function () {
        if (!ref_final || ref_final === "0") {
            Ext.MessageBox.alert('Message', "Aucune commande ouverte : rien à exporter.");
            return;
        }
        window.location = '../api/v1/commande/export-csv?id=' + encodeURIComponent(ref_final);
    },

    /*
     * Import de la reponse du grossiste.
     *
     * Le fichier - CSV ou classeur Excel, sans ligne d'en-tete - porte une ligne par produit :
     * code envoye ; quantite commandee ; code reponse ; quantite recue ; prix d'achat ; designation
     * (la designation etant facultative).
     *
     * L'import n'ecrit RIEN : le serveur confronte le fichier aux lignes de la commande et rend un
     * compte rendu en trois tas, que cette fenetre affiche. Les lignes ou le grossiste a servi un
     * AUTRE produit ne sont jamais appliquees d'office : porter la quantite d'un produit sur la
     * ligne d'un autre fausserait l'entree en stock. L'officine tranche, dossier en main.
     */
    onImporterReponseGrossiste: function () {
        var me = this;
        if (!ref_final || ref_final === "0") {
            Ext.MessageBox.alert('Message', "Ouvrez d'abord une commande.");
            return;
        }
        var fenetre = Ext.create('Ext.window.Window', {
            title: 'Importer la réponse du grossiste',
            modal: true, width: 560, bodyPadding: 12, layout: 'anchor',
            items: [{
                    xtype: 'form', itemId: 'formImport', border: false,
                    items: [{
                            xtype: 'component',
                            html: '<div style="margin-bottom:10px;color:#333;">Fichier <b>CSV</b> ou'
                                    + ' <b>Excel</b>, une ligne par produit, sans ligne d\'en-tête :<br>'
                                    + '<code>code envoyé ; qté commandée ; code réponse ; qté reçue ;'
                                    + ' prix achat ; désignation</code><br>'
                                    + '<span style="color:#666;">La désignation est facultative.</span></div>'
                        }, {
                            xtype: 'filefield', name: 'fichier', itemId: 'fichier', anchor: '100%',
                            emptyText: 'Choisir le fichier de réponse...', buttonText: 'Parcourir',
                            allowBlank: false
                        }]
                }],
            buttons: [{
                    text: 'Analyser le fichier', itemId: 'btnAnalyser',
                    handler: function (bouton) {
                        var formulaire = fenetre.down('#formImport').getForm();
                        if (!formulaire.isValid()) {
                            return;
                        }
                        bouton.disable();
                        formulaire.submit({
                            url: '../api/v1/order-detail/reponse-grossiste/' + encodeURIComponent(ref_final),
                            waitMsg: 'Lecture du fichier . . .',
                            success: function (form, action) {
                                bouton.enable();
                                fenetre.close();
                                me.afficherCompteRenduReponse(action.result || {});
                            },
                            failure: function (form, action) {
                                bouton.enable();
                                /* ExtJS traite « success:false » comme un echec de formulaire : le
                                 * compte rendu est pourtant dans la reponse, on l'affiche au lieu
                                 * d'un message generique. */
                                var r = action.result || {};
                                if (r.reconnues || r.aArbitrer || r.rejetees) {
                                    fenetre.close();
                                    me.afficherCompteRenduReponse(r);
                                } else {
                                    Ext.MessageBox.alert('Message',
                                            r.message || "Le fichier n'a pas pu être lu.");
                                }
                            }
                        });
                    }
                }, {
                    text: 'Annuler', handler: function () { fenetre.close(); }
                }]
        });
        fenetre.show();
    },

    /*
     * Compte rendu de l'import : trois listes, chacune avec son motif. Rien n'a encore ete ecrit.
     *
     * Le bouton « Appliquer » ne porte QUE sur les lignes reconnues, celles ou le produit, le code et la
     * quantite concordent. Les lignes a arbitrer (substitution, quantite hors commande, produit non servi)
     * restent au jugement de l'officine : elles se traitent a la main dans la grille de la commande.
     */
    afficherCompteRenduReponse: function (resultat) {
        var me = this;
        var lignes = [];
        var ajouter = function (tableau, categorie) {
            Ext.each(tableau || [], function (l) {
                lignes.push(Ext.apply({categorie: categorie}, l));
            });
        };
        var reconnues = resultat.reconnues || [];
        ajouter(reconnues, 'Reconnue');
        ajouter(resultat.aArbitrer, 'À arbitrer');
        ajouter(resultat.rejetees, 'Rejetée');

        var couleur = function (v) {
            if (v === 'Reconnue') { return '<span style="color:#1e7b34;font-weight:bold;">' + v + '</span>'; }
            if (v === 'À arbitrer') { return '<span style="color:#b36b00;font-weight:bold;">' + v + '</span>'; }
            return '<span style="color:#c0392b;font-weight:bold;">' + v + '</span>';
        };
        Ext.create('Ext.window.Window', {
            title: 'Réponse du grossiste — ' + (resultat.commande || '') + ' : ' + (resultat.lues || 0)
                    + ' ligne(s) lue(s), ' + ((resultat.reconnues || []).length) + ' reconnue(s), '
                    + ((resultat.aArbitrer || []).length) + ' à arbitrer, '
                    + ((resultat.rejetees || []).length) + ' rejetée(s)',
            modal: true, width: 1050, height: 520, layout: 'fit',
            items: [{
                    xtype: 'grid',
                    store: new Ext.data.Store({
                        fields: ['categorie', 'ligne', 'cipEnvoye', 'cipReponse', 'produit', 'designation',
                            'qteCommandee', 'qteCommandeeSysteme', 'qteRecue', 'prixAchat', 'motif'],
                        data: lignes
                    }),
                    columns: [
                        {header: 'État', dataIndex: 'categorie', width: 90, renderer: couleur},
                        {header: 'Ligne', dataIndex: 'ligne', width: 55, align: 'center'},
                        {header: 'Code envoyé', dataIndex: 'cipEnvoye', width: 100},
                        {header: 'Code réponse', dataIndex: 'cipReponse', width: 100},
                        {header: 'Produit', dataIndex: 'produit', flex: 1},
                        {header: 'Qté cdée', dataIndex: 'qteCommandee', width: 75, align: 'center'},
                        {header: 'Qté reçue', dataIndex: 'qteRecue', width: 75, align: 'center'},
                        {header: 'Prix achat', dataIndex: 'prixAchat', width: 80, align: 'center'},
                        {header: 'Commande', dataIndex: 'qteCommandeeSysteme', width: 110, align: 'center',
                            renderer: function (v, meta, rec) {
                                /* Ce que l'application va faire de la ligne, en clair. */
                                if (rec.get('categorie') !== 'Reconnue') {
                                    return v === null || v === undefined ? '' : v;
                                }
                                if (v === rec.get('qteRecue')) {
                                    return v + ' <span style="color:#666;">(inchangé)</span>';
                                }
                                return v + ' → <b>' + rec.get('qteRecue') + '</b>';
                            }},
                        {header: 'Observation', dataIndex: 'motif', flex: 1}
                    ]
                }],
            dockedItems: [{
                    xtype: 'toolbar', dock: 'bottom', ui: 'footer',
                    items: [{xtype: 'component', html: '<span style="color:#666;">Rien n\'est écrit tant que'
                                + ' vous n\'avez pas appliqué. Seules les lignes reconnues sont appliquées ;'
                                + ' les lignes à arbitrer restent à traiter dans la commande.</span>'},
                        '->',
                        {
                            text: 'Appliquer les ' + reconnues.length + ' ligne(s) reconnue(s)',
                            disabled: reconnues.length === 0,
                            handler: function (bouton) {
                                me.appliquerReponseGrossiste(reconnues, bouton.up('window'));
                            }
                        },
                        {text: 'Fermer', handler: function (b) { b.up('window').close(); }}]
                }]
        }).show();
    },

    /* Report effectif des quantites servies sur les lignes reconnues, apres confirmation. */
    appliquerReponseGrossiste: function (reconnues, fenetre) {
        var me = this;
        var change = 0;
        Ext.each(reconnues, function (l) {
            if (l.qteRecue !== l.qteCommandeeSysteme) {
                change++;
            }
        });
        Ext.MessageBox.confirm('Confirmation',
                'Appliquer la réponse du grossiste sur ' + reconnues.length + ' ligne(s) ?<br>'
                + change + ' ligne(s) verront leur quantité changer.',
                function (choix) {
                    if (choix !== 'yes') {
                        return;
                    }
                    Ext.Ajax.request({
                        method: 'POST',
                        url: '../api/v1/order-detail/reponse-grossiste/'
                                + encodeURIComponent(ref_final) + '/appliquer',
                        headers: {'Content-Type': 'application/json'},
                        jsonData: Ext.encode(Ext.Array.map(reconnues, function (l) {
                            return {detailId: l.detailId, qteRecue: l.qteRecue};
                        })),
                        success: function (reponse) {
                            var r = Ext.decode(reponse.responseText);
                            Ext.MessageBox.alert('Message', r.message || '');
                            if (r.success) {
                                if (fenetre) {
                                    fenetre.close();
                                }
                                Ext.getCmp('gridpanelID').getStore().reload();
                                /* Les totaux d'achat et de vente de l'entete suivent les quantites. */
                                me.getCommandeAmount(ref_final);
                            }
                        },
                        failure: function () {
                            Ext.MessageBox.alert('Message',
                                    "La mise à jour des quantités n'a pas abouti.");
                        }
                    });
                });
    },

    onbtncancel: function () {

        testextjs.app.getController('App').onLoadNewComponentWithDataSource("i_order_manager", "", "", "");
    },

    updateCip: function (win, formulaire) {
        let me = this;
        if (formulaire.isValid()) {
            let progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/commande/cip',
                params: Ext.JSON.encode(formulaire.getValues()),
                success: function (response, options) {
                    progress.hide();
                    let result = Ext.JSON.decode(response.responseText, true);
                    if (result.success) {
                        win.destroy();
                        me.loadStore();
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
                    win.destroy();
                    progress.hide();
                    Ext.Msg.alert("Message", 'Erreur du système ' + response.status);
                }

            });
        }
    },
    onAddGrossisteClick: function (grid, rowIndex) {
        let me = this;
        let rec = grid.getStore().getAt(rowIndex);
        let fam = rec.get('lg_FAMILLE_NAME');
        let lg_FAMILLE_ID1 = rec.get('lg_FAMILLE_ID');
        let lg_GROSSISTE_LIBELLE = rec.get('lg_GROSSISTE_LIBELLE');
        let win = Ext.create("Ext.window.Window", {
            // « titre » n'est pas une configuration d'ExtJS : la fenetre s'ouvrait sans aucun titre.
            title: "Ajouter un code article  [" + fam + "]",
            modal: true,
            width: 500,
            height: 200,
            maximizable: false,
            defaults: {
                anchor: '100%'
            },
            items: [
                {
                    xtype: 'form',
                    region: 'center',
                    bodyPadding: 10,
                    fieldDefaults: {
                        labelAlign: 'right',
                        labelWidth: 160,
                        msgTarget: 'side',
                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'fieldset',
                            title: 'Information Grossiste',
                            defaultType: 'textfield',
                            defaults: {
                                anchor: '100%'
                            },
                            items: [
                                {
                                    xtype: 'combobox',
                                    fieldLabel: 'Grossiste',
                                    name: 'refParent',
                                    width: 400,
                                    store: storerepartiteur,
                                    valueField: 'lg_GROSSISTE_ID',
                                    displayField: 'str_LIBELLE',
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un grossiste...',
                                    value: lg_GROSSISTE_LIBELLE
                                },
                                {
                                    name: 'description',
                                    fieldLabel: 'Code article',
                                    emptyText: 'Code article',
                                    flex: 1,
                                    allowBlank: false,
                                    enableKeyEvents: true,
                                    listeners: {
                                        afterrender: function (field) {
                                            field.focus(true, 50);
                                        },
                                        specialKey: function (field, e) {
                                            if (e.getKey() === e.ENTER) {
                                                let formulaire = field.up('form');
                                                if (formulaire.isValid()) {
                                                    me.updateCip(win, formulaire);
                                                }

                                            }
                                        }
                                    }
                                },
                                {
                                    name: 'ref',
                                    hidden: true,
                                    value: lg_FAMILLE_ID1,
                                    flex: 1,
                                    allowBlank: false
                                }
                            ]

                        }
                    ],
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
                                    text: 'Ajouter le code',
                                    handler: function (btn) {
                                        let formulaire = btn.up("form");
                                        if (formulaire.isValid()) {
                                            me.updateCip(win, formulaire);

                                        } else {
                                            Ext.Msg.alert('Invalid Data', 'Veuillez saissir.');
                                        }
                                    }
                                },
                                {
                                    text: "Fermer",
                                    handler: function () {
                                        win.hide();
                                    }
                                }
                            ]
                        }

                    ]
                }
            ]

        });
        win.show();


    },
    /**
     * Mise a jour du code EAN de l'article de la ligne cliquee.
     *
     * Le code est ecrit sur le produit ET sur son deconditionne : les deux designent la meme boite et
     * doivent porter le meme code, sans quoi la douchette n'en retrouve qu'un. Le serveur s'en charge,
     * quel que soit celui des deux sur lequel on a clique, et refuse un code deja porte par un autre
     * article en nommant le porteur.
     */
    onMajCodeEanClick: function (grid, rowIndex) {
        let rec = grid.getStore().getAt(rowIndex);
        let familleId = rec.get('lg_FAMILLE_ID');
        let designation = rec.get('lg_FAMILLE_NAME');

        let envoyer = function (win, champ) {
            let code = Ext.String.trim(champ.getValue() || '');
            if (!code) {
                Ext.Msg.alert('Code EAN', 'Saisissez le code avant de valider.');
                return;
            }
            Ext.Ajax.request({
                method: 'PUT',
                // Le code voyage dans l'adresse et non dans le corps : le service n'accepte que du
                // JSON, et un corps de formulaire lui vaudrait un refus « 415 ».
                url: '../api/v1/fichearticle/code-ean/' + familleId + '?ean=' + encodeURIComponent(code),
                success: function (response) {
                    let reponse = Ext.JSON.decode(response.responseText, true) || {};
                    if (reponse.success) {
                        win.close();
                        Ext.Msg.alert('Code EAN', reponse.message || 'Code EAN mis a jour.');
                    } else {
                        /* Le code appartient a un autre article : on garde la fenetre ouverte et on
                         * represente la saisie, ENTIEREMENT SELECTIONNEE. Le focus seul obligeait a
                         * effacer le code a la main avant d'en scanner un autre ; selectionne, il est
                         * remplace d'un coup par la douchette ou par la frappe.
                         * La selection est posee APRES la fermeture du message : tant qu'il est
                         * affiche, il retient le focus et la selection serait perdue. */
                        Ext.Msg.alert('Code EAN', reponse.message || 'La mise a jour a echoue.',
                                function () {
                                    champ.focus(true, 50);
                                    Ext.defer(function () {
                                        champ.selectText();
                                    }, 80);
                                });
                    }
                },
                failure: function (response) {
                    Ext.Msg.alert('Code EAN', 'Le serveur n\'a pas repondu : ' + response.status);
                }
            });
        };

        let win = Ext.create('Ext.window.Window', {
            title: 'Code EAN — ' + designation,
            modal: true,
            width: 520,
            maximizable: false,
            items: [{
                    xtype: 'form',
                    bodyPadding: 10,
                    fieldDefaults: {labelAlign: 'right', labelWidth: 160, msgTarget: 'side', anchor: '100%'},
                    items: [{
                            xtype: 'fieldset',
                            title: 'Nouveau code EAN',
                            defaultType: 'textfield',
                            defaults: {anchor: '100%'},
                            items: [{
                                    name: 'codeEan',
                                    itemId: 'codeEan',
                                    fieldLabel: 'Code EAN',
                                    emptyText: 'Scannez ou saisissez le code',
                                    allowBlank: false,
                                    enableKeyEvents: true,
                                    listeners: {
                                        /* On presente le code actuel s'il en existe un, entierement
                                         * selectionne : la douchette ou la frappe le remplacent d'un
                                         * coup, et Entree seule le revalide - ce qui remet d'accord
                                         * un produit et son detail qui auraient diverge. */
                                        afterrender: function (champ) {
                                            champ.focus(true, 50);
                                            Ext.Ajax.request({
                                                method: 'GET',
                                                url: '../api/v1/fichearticle/code-ean/' + familleId,
                                                success: function (response) {
                                                    let lu = Ext.JSON.decode(response.responseText, true) || {};
                                                    if (!lu.success || !lu.codeEan) {
                                                        /* Aucun code sur l'article : le champ reste vide, mais
                                                         * le curseur doit s'y trouver quand meme - on scanne
                                                         * juste apres avoir clique l'icone. Le focus pose au
                                                         * rendu peut avoir ete perdu entre-temps, cette reponse
                                                         * arrivant apres l'ouverture de la fenetre. */
                                                        champ.focus(true, 50);
                                                        return;
                                                    }
                                                    champ.setValue(lu.codeEan);
                                                    champ.focus(true, 50);
                                                    Ext.defer(function () {
                                                        champ.selectText();
                                                    }, 80);
                                                },
                                                failure: function () {
                                                    // Le code n'a pas pu etre relu : le champ reste
                                                    // saisissable, curseur dedans.
                                                    champ.focus(true, 50);
                                                }
                                            });
                                        },
                                        specialkey: function (champ, e) {
                                            if (e.getKey() === e.ENTER) {
                                                envoyer(win, champ);
                                            }
                                        }
                                    }
                                }]
                        }],
                    dockedItems: [{
                            xtype: 'toolbar',
                            dock: 'bottom',
                            ui: 'footer',
                            layout: {pack: 'end', type: 'hbox'},
                            items: [{
                                    xtype: 'button',
                                    text: 'Mettre a jour',
                                    handler: function (btn) {
                                        envoyer(win, btn.up('form').down('#codeEan'));
                                    }
                                }, {
                                    text: 'Fermer',
                                    handler: function () {
                                        win.close();
                                    }
                                }]
                        }]
                }]
        });
        win.show();
    },

    onbtnaddArticle: function () {
        var grossisteIdValue = Ext.getCmp('lgGROSSISTEID').getValue();
        new testextjs.view.configmanagement.famille.action.add2({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Creer un nouveau produit",
            type: "commande",
            grossisteId: grossisteIdValue
        });
    },
    onRemoveClick: function (grid, rowIndex) {
        let message = "Confirmer la suppresssion";
        Ext.MessageBox.confirm('Message',
                message,
                function (btn) {
                    if (btn === 'yes') {
                        const rec = grid.getStore().getAt(rowIndex);
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            method: 'DELETE',
                            url: '../api/v1/commande/item/' + rec.get('lg_ORDERDETAIL_ID'),
                            success: function (response) {
                                testextjs.app.getController('App').StopWaitingProcess();
                                grid.getStore().reload();
                                Ext.getCmp('str_NAME').focus(true, 100, function () {
                                    Ext.getCmp('str_NAME').selectText(0, 1);
                                });
                                ecranCommande().getCommandeAmount(ecranCommande().getNameintern());

                            },
                            failure: function (response) {
                                testextjs.app.getController('App').StopWaitingProcess();
                                Ext.MessageBox.alert('Error Message', response.responseText);
                            }
                        });


                    }
                });
    },

    onDetailClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.configmanagement.famille.action.detailArticle({
            odatasource: rec.data,
            produitId: rec.get('lg_FAMILLE_ID'),
            parentview: this,
            mode: "detail",
            titre: "Detail sur l'article [" + rec.get('str_DESCRIPTION') + "]"
        });
    },
    onVoirLots: function (grid, rowIndex) {

        const rec = grid.getStore().getAt(rowIndex);

        const achatsStore = Ext.create('Ext.data.Store', {
            fields: [
                {name: 'numeroLot', type: 'string'},
                {name: 'datePeremption', type: 'string'},
                {name: 'quantity', type: 'int'}
            ],
            data: rec.get('lots')


        });


        const form = Ext.create('Ext.window.Window',
                {
                    xtype: 'detailLot',
                    alias: 'widget.detailLot',
                    autoShow: true,
                    height: 400,
                    width: '50%',
                    modal: true,
                    title: '<span style="font-size:14px;"> DETAILS LOTS ' + rec.get('lg_FAMILLE_NAME') + '</span>',

                    closeAction: 'hide',

                    closable: true,
                    maximizable: true,
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
                                    itemId: 'btnCancel',
                                    text: 'Fermer',
                                    handler: function () {
                                        form.destroy();
                                    }

                                }
                            ]
                        }
                    ],
                    items: [
                        {
                            xtype: 'gridpanel',
                            store: achatsStore,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true,
                                enableColumnHide: false

                            },

                            columns: [
                                {
                                    xtype: 'rownumberer',
                                    width: 50
                                },

                                {
                                    header: 'Numéro de lot',
                                    dataIndex: 'numeroLot',
                                    flex: 1,
                                    sortable: false,
                                    menuDisabled: true
                                }, {
                                    header: 'Quantité',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'quantity',
                                    align: 'right',
                                    sortable: false,
                                    menuDisabled: true,
                                    flex: 1,
                                    format: '0,000.'

                                }, {
                                    header: 'Date de péremption',
                                    dataIndex: 'datePeremption',
                                    sortable: false,
                                    menuDisabled: true,
                                    flex: 1
                                }
                            ]


                        }
                    ]
                });

    },
    onRechClick: function () {
        const me = this;
        const val = Ext.getCmp('rechercherDetail');
        const filtre = Ext.getCmp('str_TYPE_TRANSACTION');
        Ext.getCmp('gridpanelID').getStore().load({
            params: {
                query: val.getValue(),
                filtre: filtre.getValue(),
                orderId: me.getNameintern()
            }
        });
    },

    getCommandeAmount: function (id) {
        const me = this;
        Ext.Ajax.request({
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/commande/amount/' + id,
            success: function (response, options) {
                const data = Ext.JSON.decode(response.responseText, true);

                me.updateAmountFields(data);

            }
        });

    },
    updateAmountFields: function (data) {
        const me = this;
        if (data) {
            int_montant_achat = Ext.util.Format.number(data.prixAchat, '0,000.');
            int_montant_vente = Ext.util.Format.number(data.prixVente, '0,000.');
            Ext.getCmp('int_VENTE').setValue(int_montant_vente + '  CFA');
            Ext.getCmp('int_ACHAT').setValue(int_montant_achat + '  CFA');
            me.orderRef = data.orderRef;
            me.prixAchat = data.prixAchat;


        }

    },
    onPdfClick: function () {
        const me = this;
        const linkUrl = '../EditionCommandeServlet?orderId=' + me.getNameintern() + '&refCommande=' + me.getOdatasource().str_REF_ORDER;
        window.open(linkUrl);
    },
    onAddNewItem: function () {
        const  me = this;
        if (Ext.getCmp('lgGROSSISTEID').getValue() === null) {
            Ext.MessageBox.alert('Error Message', 'Renseignez le Grossiste ');
        } else {
            testextjs.app.getController('App').ShowWaitingProcess();
            Ext.Ajax.request({
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/commande/item/add',
                params: Ext.JSON.encode({
                    familleId: Ext.getCmp('lg_FAMILLE_ID_VENTE').getValue(),
                    orderId: me.getNameintern(),
                    grossisteId: Ext.getCmp('lgGROSSISTEID').getValue(),
                    statut: str_STATUT,
                    qte: Ext.getCmp('int_QUANTITE').getValue()
                }),

                success: function (response) {
                    const data = Ext.JSON.decode(response.responseText, true);
                    me.nameintern = data.orderId;

                    testextjs.app.getController('App').StopWaitingProcess();
                    me.onRechClick();
                    Ext.getCmp('int_QUANTITE').setValue(1);
                    Ext.getCmp('str_NAME').focus(true, 100, function () {
                        Ext.getCmp('str_NAME').setValue("");
                        Ext.getCmp('str_NAME').selectText(0, 1);
                        me.getCommandeAmount(data.orderId);
                    });

                },
                failure: function (response) {
                    testextjs.app.getController('App').StopWaitingProcess();
                    Ext.MessageBox.alert('Error Message', response.responseText);
                }
            });
        }
    },
    onCreateBLClick: function () {
        const me = this;//
        const orderId = me.getOdatasource()?.lg_ORDER_ID ? me.getOdatasource().lg_ORDER_ID : me.getNameintern();
        const  montantAchat = me.getPrixAchat();
        const orderRef = me.getOdatasource()?.str_REF_ORDER ? me.getOdatasource().str_REF_ORDER : me.getOrderRef();
        new testextjs.view.commandemanagement.cmde_passees.action.add({
            idOrder: orderId,
            odatasource: orderRef,
            montantachat: montantAchat,
            parentview: this,
            mode: "create",
            titre: "Creation bon de livraison"
        });
    }
});


