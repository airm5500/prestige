/* global Ext */

var url_services_transaction_inventaire = '../webservices/stockmanagement/inventaire/ws_transactions.jsp?mode=';
var url_services_data_zonegeo_inventaire = '../webservices/configmanagement/zonegeographique/ws_data_inventaire.jsp';
var url_services_data_famillearticle_inventaire = '../webservices/configmanagement/famillearticle/ws_data_inventaire.jsp';
var url_services_data_grossiste_inventaire = '../webservices/configmanagement/grossiste/ws_data_inventaire.jsp';
var url_services_pdf_fiche_inventaire = '../webservices/stockmanagement/inventaire/ws_generate_pdf.jsp';
var url_services_data_parameter = '../webservices/sm_user/parameter/ws_data.jsp';
var url_services_data_utilisateur = '../webservices/sm_user/utilisateur/ws_data.jsp';

var url_services_data_inventaire_famille;
var KEY_MAX_VALUE_INVENTAIRE = 0;
var Me;
var Omode;
var ref;

var my_view_title;
var str_NAME_FILE = "";
var ref_vente;
var columnindex, rowindex, int_NUMBER_INIT;
var firstTime = 0;
var currentrowindex = 0, selectedrowindex;
Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}


Ext.define('testextjs.view.stockmanagement.inventaire.action.editInventaireManager', {
    extend: 'Ext.form.Panel',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.form.*',
        'Ext.layout.container.Column',
        'testextjs.model.Famille',
        'testextjs.controller.LaborexWorkFlow',
        'testextjs.view.configmanagement.client.ClientManager',
        'testextjs.view.sm_user.dovente.action.addtp'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: '',
        plain: true,
        maximizable: true,
//        tools: [{type: "pin"}],
        closable: false,
        nameintern: ''
    },
    xtype: 'editinventaireManager',
    id: 'editinventaireManagerID',
    frame: true,
    title: 'Edition d\'un inventaire',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function () {

        Me = this;
        currentrowindex = 0;
        firstTime = 0;
        rowindex = 0;
        selectedrowindex = 0;
        this.addKeyMap();

        var lg_ZONE_GEO_ID = "";
        var lg_FAMILLEARTICLE_ID = "";
        var lg_GROSSISTE_ID = "";

        ref_vente = "";
        this.title = this.getTitre();

        my_view_title = this.title;

        ref_vente = this.getNameintern();
        if (this.getNameintern() === "0") {
            ref = this.getNameintern();
        } else {
            ref = this.getOdatasource().lg_INVENTAIRE_ID;
        }

        if (my_view_title === "by_cloturer_vente_add") {
            ref = ref_add;
        }



        url_services_data_inventaire_famille = '../webservices/stockmanagement/inventaire/ws_data_inventaire_famille.jsp?lg_INVENTAIRE_ID=' + ref;

        var itemsPerPage = 20;
        var itemsPerPageGrid = 30;


        var store_type = new Ext.data.Store({
            fields: ['str_TYPE', 'str_desc'],
            data: [{str_TYPE: 'ALL', str_desc: 'Tous'}, {str_TYPE: 'MANQUANT', str_desc: 'Articles manquants'}, {str_TYPE: 'SURPLUS', str_desc: 'Articles surplus'}, {str_TYPE: 'MANQUANTSURPLUS', str_desc: 'Tous les ecarts'}, {str_TYPE: 'ALERTE', str_desc: 'Articles alertes'}]
        });

        var store_grossiste = new Ext.data.Store({
            model: 'testextjs.model.Grossiste',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_grossiste_inventaire + "?lg_INVENTAIRE_ID=" + ref,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });

        var store_zonegeo = new Ext.data.Store({
            model: 'testextjs.model.ZoneGeographique',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_zonegeo_inventaire + "?lg_INVENTAIRE_ID=" + ref,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }
//            autoLoad: true

        });

        var store_utilisateur = new Ext.data.Store({
            model: 'testextjs.model.Utilisateur',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_utilisateur,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }
        });


        var store_famillearticle = new Ext.data.Store({
            model: 'testextjs.model.FamilleArticle',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_famillearticle_inventaire + "?lg_INVENTAIRE_ID=" + ref,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'

                }
            }
        });


        var groupChamp = 'lg_ZONE_GEO_ID';
        if (this.getOdatasource().str_TYPE == "famille") {
            groupChamp = 'lg_FAMILLEARTICLE_ID';
        } else if (this.getOdatasource().str_TYPE == "grossiste") {
            groupChamp = 'lg_GROSSISTE_ID';
        }
        //  var itemsPerPage = 20;
        var store_inventaire_famille = new Ext.data.Store({
            model: 'testextjs.model.Famille',
            pageSize: itemsPerPageGrid,
            autoLoad: false,
            groupField: 'groupeby',
            remoteSort: true,
            remoteFilter: true,
//            autoSync : false,
            //remoteGroup:true,

            proxy: {
                type: 'ajax',
                url: url_services_data_inventaire_famille,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                },
                timeout: 180000
            }

        });



        this.CellEditing = new Ext.grid.plugin.CellEditing({
            pluginId: 'inventaireEditor',
            clicksToEdit: 1
        });


        Ext.apply(this, {
            width: '98%',
            height: Ext.getBody().getViewSize().height,
            fieldDefaults: {
                labelAlign: 'left',
                labelWidth: 90,
                anchor: '100%',
                msgTarget: 'side'
            },
            layout: {
                type: 'vbox',
                align: 'stretch',
                padding: 5
            },
            /* defaults: {
             flex: 1
             },*/
            id: 'panelID',
            items: [
                {
                    xtype: 'fieldset',
                    title: 'Liste Produit(s)',
                    collapsible: true,
                    defaultType: 'textfield',
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },
                    items: [
                        {
                            columnWidth: 0.65,
                            xtype: 'grid',
                            id: 'gridpanelInventaireID',
                            plugins: [this.CellEditing],
                            features: [{ftype: 'grouping',
                                    groupHeaderTpl: "{[values.rows[0].data.str_CODE]} :{[values.rows[0].data.groupeby]}",
                                    hideGroupedHeader: true
                                }], //appliquer le groupement
                            store: store_inventaire_famille,
                            height: Ext.getBody().getViewSize().height * 0.8,
                            
                             // AJOUT: Configuration de la vue
                            viewConfig: {
                                stripeRows: false,
                                getRowClass: function(record, rowIndex, rowParams, store) {
                                    // Cette méthode sera gérée via les événements
                                    return '';
                                }
                            },

                            // AJOUT: Listeners pour gérer le style d'édition
                            listeners: {
                                // Au début de l'édition
                                beforeedit: function(editor, context) {
                                    var grid = Ext.getCmp('gridpanelInventaireID');
                                    // Retirer la classe de toutes les lignes
                                    var rows = grid.getView().getEl().query('.x-grid-row');
                                    rows.forEach(function(row) {
                                        Ext.fly(row).removeCls('row-editing-active');
                                    });

                                    // Ajouter la classe à la ligne en cours d'édition
                                    var row = context.row;
                                    Ext.fly(row).addCls('row-editing-active');
                                },

                                // Quand l'édition est annulée
                                canceledit: function(editor, context) {
                                    var row = context.row;
                                    Ext.fly(row).removeCls('row-editing-active');
                                },

                                // Quand l'édition est validée
                                edit: function(editor, context) {
                                    var row = context.row;
                                    Ext.fly(row).removeCls('row-editing-active');

                                    // Si vous voulez garder le style pendant la navigation, retirez la ligne ci-dessus
                                    // et utilisez plutôt cette approche :
                                    // Le style sera retiré automatiquement au début de la prochaine édition
                                },

                                // Nettoyer quand on quitte la grille
                                destroy: function () {
                                    var grid = Ext.getCmp('gridpanelInventaireID');
                                    // PROTECTION : Vérifier que grid existe et a un getView valide
                                    if (grid && grid.getView && grid.getView().getEl) {
                                        try {
                                            var view = grid.getView();
                                            var el = view.getEl();
                                            if (el && !el.destroyed && el.query) {
                                                var rows = el.query('.row-editing-active');
                                                rows.forEach(function (row) {
                                                    Ext.fly(row).removeCls('row-editing-active');
                                                });
                                            }
                                        } catch (e) {
                                            console.warn('Safe cleanup during destruction:', e.message);
                                        }
                                    }
                                }
                            },
                            
                            columns: [{
                                    text: 'lg_INVENTAIRE_FAMILLE_ID',
                                    flex: 1,
                                    hidden: true,
                                    dataIndex: 'lg_INVENTAIRE_FAMILLE_ID',
                                    id: 'lg_INVENTAIRE_FAMILLE_ID'
                                }, {
                                    text: 'lg_INVENTAIRE_ID',
                                    flex: 1,
                                    hidden: true,
                                    dataIndex: 'lg_INVENTAIRE_ID',
                                    id: 'lg_INVENTAIRE_ID'
                                }, {
                                    text: 'lg_FAMILLE_ID',
                                    flex: 1,
                                    hidden: true,
                                    dataIndex: 'lg_FAMILLE_ID',
                                    id: 'lg_FAMILLE_ID'
                                }, {
                                    text: 'CIP',
                                    flex: 0.7,
                                    sortable: true,
                                    dataIndex: 'int_CIP'/*,
                                     editor: {
                                     xtype: 'textfield'
                                     }*/
                                }, {
                                    text: 'str_NAME',
                                    flex: 1,
                                    hidden: true,
                                    sortable: true,
                                    dataIndex: 'str_NAME'
                                }, {
                                    text: 'Designation',
                                    flex: 1.3,
                                    sortable: true,
                                    dataIndex: 'str_DESCRIPTION'/*,
                                     editor: {
                                     xtype: 'textfield'
                                     }*/
                                }, {
                                    text: 'Emplacement',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'lg_ZONE_GEO_ID'
                                }, {
                                    text: 'Famille',
                                    dataIndex: 'lg_FAMILLEARTICLE_ID',
                                    sortable: true,
                                    flex: 1

                                }, {
                                    text: 'Grossiste',
                                    dataIndex: 'lg_GROSSISTE_ID',
                                    sortable: true,
                                    flex: 1

                                }, {
                                    text: 'Prix de vente',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_PRICE',
                                    renderer: amountformat,
                                    align: 'right'
                                }, {
                                    text: 'Prix.Reference',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_PRICE_REF',
                                    hidden: true,
                                    renderer: amountformat,
                                    align: 'right'
                                }, {
                                    text: 'PAF',
                                    dataIndex: 'int_PAF',
                                    sortable: true,
                                    align: 'right',
                                    renderer: amountformat,
                                    flex: 1
                                },
                                {
                                    text: 'Stock Rayon',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_NUMBER_AVAILABLE',
                                    //renderer: amountformat,
                                    align: 'right',
                                    // Modifier la partie navigation dans l'éditeur de "Stock Rayon"
                                    editor: {
                                        xtype: 'textfield',
                                        allowBlank: false,
                                        maskRe: /[0-9.]/,
                                        selectOnFocus: true,
                                        enableKeyEvents: true,
                                        listeners: {
                                            specialKey: function (field, e, options) {
                                                var grid = Ext.getCmp('gridpanelInventaireID');
                                                var position = grid.getSelectionModel().getCurrentPosition();

                                                if (!position) return;

                                                // Navigation standard avec les flèches
                                                if (e.getKey() === e.UP) {
                                                    grid.getPlugin('inventaireEditor').startEdit(Number(position.row) - 1, Number(position.column));
                                                    return;
                                                }
                                                if (e.getKey() === e.DOWN) {
                                                    grid.getPlugin('inventaireEditor').startEdit(Number(position.row) + 1, Number(position.column));
                                                    return;
                                                }

                                                // Gérer la validation avec ENTREE
                                                if (e.getKey() === e.ENTER) {
                                                    // --- VALIDATION DE LA SAISIE ---
                                                    var int_NUMBER = field.getValue();
                                                    if (isNaN(int_NUMBER) || String(int_NUMBER).trim() === '' || Number(int_NUMBER) < 0) {
                                                        //Ext.Msg.alert('Erreur', 'La quantité saisie est invalide.');
                                                        grid.getPlugin('inventaireEditor').startEdit(position.row, position.column);
                                                        return;
                                                    }

                                                    var ajaxUpdateAndNavigate = function () {
                                                        var record = grid.getStore().getAt(position.row);
                                                        var lg_INVENTAIRE_FAMILLE_ID = record.get("lg_INVENTAIRE_FAMILLE_ID");
                                                        var int_NUMBER_INIT = record.get("int_TAUX_MARQUE");

                                                        Ext.Ajax.request({
                                                            url: url_services_transaction_inventaire + 'updateinventairefamille',
                                                            params: {
                                                                lg_INVENTAIRE_FAMILLE_ID: lg_INVENTAIRE_FAMILLE_ID,
                                                                int_NUMBER: Number(int_NUMBER)
                                                            },
                                                            success: function (response) {
                                                                var object = Ext.JSON.decode(response.responseText, false);
                                                                if (object.success === 0) {
                                                                    Ext.MessageBox.alert('Erreur', object.errors);
                                                                    grid.getPlugin('inventaireEditor').startEdit(position.row, position.column);
                                                                    return;
                                                                }

                                                                record.set("int_QTE_SORTIE", Number(int_NUMBER) - int_NUMBER_INIT);
                                                                grid.getStore().commitChanges();

                                                                var totalOnPage = grid.getStore().getCount();
                                                                var currentRowIndex = position.row;

                                                                // DÉTECTION SI RECHERCHE ACTIVE
                                                                var searchValue = Ext.getCmp('rechecher').getValue();
                                                                var isSearchActive = searchValue && searchValue.trim() !== '';

                                                                // CAS SPÉCIAL : Si recherche active et dernier produit de la page
                                                                // Modifier la partie navigation dans l'éditeur de "Stock Rayon" - section DERNIÈRE PAGE de la recherche
                                                                if (isSearchActive && currentRowIndex === totalOnPage - 1) {
                                                                    var pagingToolbar = grid.getDockedItems('toolbar[dock="bottom"]')[0];

                                                                    // Vérifier s'il y a une page suivante
                                                                    if (pagingToolbar && pagingToolbar.down('#next') && !pagingToolbar.down('#next').isDisabled()) {
                                                                        // Il y a une page suivante → on y va
                                                                        pagingToolbar.moveNext();
                                                                        // Après le chargement, on se positionne sur le premier élément
                                                                        grid.getStore().on('load', function() {
                                                                            setTimeout(function() {
                                                                                grid.getPlugin('inventaireEditor').startEdit(0, position.column);
                                                                            }, 100);
                                                                        }, this, {single: true});
                                                                    } else {
                                                                        // DERNIÈRE PAGE de la recherche → 
                                                                        // 1. Retour à la première page des résultats
                                                                        // 2. Focus sur la zone de recherche
                                                                        if (pagingToolbar && pagingToolbar.down('#first')) {
                                                                            pagingToolbar.moveFirst();

                                                                            // Après le retour à la première page, focus sur la recherche
                                                                            grid.getStore().on('load', function() {
                                                                                setTimeout(function() {
                                                                                    var searchField = Ext.getCmp('rechecher');
                                                                                    if (searchField) {
                                                                                        searchField.focus(false, 500); // Augmenter le délai et désactiver le scroll
                                                                                        searchField.selectText();

                                                                                        // Forcer le focus une seconde fois pour s'assurer qu'il reste
                                                                                        setTimeout(function() {
                                                                                            searchField.focus(true, 10);
                                                                                            searchField.selectText();
                                                                                        }, 50);
                                                                                    }
                                                                                }, 150); // Délai augmenté
                                                                            }, this, {single: true});
                                                                        } else {
                                                                            // Fallback si pas de pagination
                                                                            setTimeout(function() {
                                                                                var searchField = Ext.getCmp('rechecher');
                                                                                if (searchField) {
                                                                                    searchField.focus(true, 100);
                                                                                    searchField.selectText();
                                                                                }
                                                                            }, 100);
                                                                        }
                                                                    }
                                                                    return;
                                                                }

                                                                // Navigation normale (pagination sans recherche)
                                                                if (currentRowIndex === totalOnPage - 1) {
                                                                    var pagingToolbar = grid.getDockedItems('toolbar[dock="bottom"]')[0];
                                                                    if (pagingToolbar && pagingToolbar.down('#next') && !pagingToolbar.down('#next').isDisabled()) {
                                                                        pagingToolbar.moveNext();
                                                                    } else {
                                                                        pagingToolbar.moveFirst();
                                                                    }
                                                                } else {
                                                                    grid.getPlugin('inventaireEditor').startEdit(currentRowIndex + 1, position.column);
                                                                }
                                                            },
                                                            failure: function (response) {
                                                                Ext.MessageBox.alert('Erreur', 'Erreur serveur: ' + response.status);
                                                                grid.getPlugin('inventaireEditor').startEdit(position.row, position.column);
                                                            }
                                                        });
                                                    };

                                                    // Gestion alerte quantité
                                                    if (Number(int_NUMBER) > KEY_MAX_VALUE_INVENTAIRE) {
                                                        Ext.MessageBox.show({
                                                            title: 'Alerte Quantité',
                                                            msg: 'Attention, quantité alerte atteinte. Voulez-vous continuer?',
                                                            buttons: Ext.MessageBox.YESNO,
                                                            icon: Ext.MessageBox.QUESTION,
                                                            fn: function (btn) {
                                                                if (btn === 'yes') {
                                                                    ajaxUpdateAndNavigate();
                                                                } else {
                                                                    grid.getPlugin('inventaireEditor').startEdit(position.row, position.column);
                                                                }
                                                            }
                                                        });
                                                    } else {
                                                        ajaxUpdateAndNavigate();
                                                    }
                                                }

                                                // Navigation vers la recherche avec FLÈCHE HAUT sur le premier élément
                                                if (e.getKey() === e.UP && position.row === 0) {
                                                    var searchValue = Ext.getCmp('rechecher').getValue();
                                                    var isSearchActive = searchValue && searchValue.trim() !== '';

                                                    if (isSearchActive) {
                                                        // Vérifier si on est sur la première page
                                                        var pagingToolbar = grid.getDockedItems('toolbar[dock="bottom"]')[0];
                                                        var currentPage = pagingToolbar ? pagingToolbar.getPageData().current : 1;

                                                        if (currentPage === 1) {
                                                            e.stopEvent();
                                                            var searchField = Ext.getCmp('rechecher');
                                                            if (searchField) {
                                                                searchField.focus(true, 100);
                                                                searchField.selectText();
                                                            }
                                                            return;
                                                        } else {
                                                            // Si on n'est pas sur la première page, on y retourne
                                                            e.stopEvent();
                                                            if (pagingToolbar && pagingToolbar.down('#first')) {
                                                                pagingToolbar.moveFirst();
                                                                // Après le retour à la première page, focus sur la recherche
                                                                grid.getStore().on('load', function() {
                                                                    setTimeout(function() {
                                                                        var searchField = Ext.getCmp('rechecher');
                                                                        if (searchField) {
                                                                            searchField.focus(false, 500);
                                                                            searchField.selectText();

                                                                            // Double focus pour assurer la prise
                                                                            setTimeout(function() {
                                                                                searchField.focus(true, 10);
                                                                                searchField.selectText();
                                                                            }, 50);
                                                                        }
                                                                    }, 150);
                                                                }, this, {single: true});
                                                            }
                                                            return;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }, {
                                    text: 'Stock.Machine',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_TAUX_MARQUE',
                                    renderer: amountformat,
                                    align: 'right'
                                },
                                {
                                    header: 'Ecart',
                                    dataIndex: 'int_QTE_SORTIE',
                                    flex: 1,
                                    align: 'right',
                                    renderer: function (v, m, r) {
                                        if (v > 0) {
                                            m.style = 'background-color:#A8D44D;font-weight:900;';
                                        } else if (v === 0) {
                                            // m.style = 'background-color:#73C774;';
                                        } else if (v < 0) {
                                            m.style = 'background-color:#E36159;font-weight:900;';
                                        }
                                        return v;
                                    },

                                    sortable: true}
                            ],
                            tbar: [
                                {
                                    xtype: 'combobox',
                                    name: 'str_TYPE',
                                    margins: '0 0 0 10',
                                    fieldLabel: 'Filtre:',
                                    id: 'str_TYPE',
                                    store: store_type,
                                    valueField: 'str_TYPE',
                                    displayField: 'str_desc',
                                    typeAhead: true,
                                    queryMode: 'local',
                                    emptyText: 'Filtre article...',
                                    listeners: {
                                        select: function (cmp) {
                                            var value = cmp.getValue();

                                            var rechecher = Ext.getCmp('rechecher').getValue();
                                            var lg_GROSSISTE_ID = "";
                                            var lg_FAMILLEARTICLE_ID = "";
                                            var lg_ZONE_GEO_ID = "", lg_USER_ID = "";

                                            if (Ext.getCmp('lg_GROSSISTE_ID').getValue() !== null) {
                                                lg_GROSSISTE_ID = Ext.getCmp('lg_GROSSISTE_ID').getValue();
                                            }
                                            if (Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue() !== null) {
                                                lg_FAMILLEARTICLE_ID = Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue();
                                            }
                                            if (Ext.getCmp('lg_ZONE_GEO_ID').getValue() !== null) {
                                                lg_ZONE_GEO_ID = Ext.getCmp('lg_ZONE_GEO_ID').getValue();
                                            }
                                            if (Ext.getCmp('lg_USER_ID').getValue() !== null) {
                                                lg_USER_ID = Ext.getCmp('lg_USER_ID').getValue();
                                            }

                                            var OGridStore = Ext.getCmp('gridpanelInventaireID').getStore();

                                            OGridStore.getProxy().url = url_services_data_inventaire_famille + "&str_TYPE=" + value + "&search_value=" + rechecher + "&lg_FAMILLEARTICLE_ID=" + lg_FAMILLEARTICLE_ID + "&lg_ZONE_GEO_ID=" + lg_ZONE_GEO_ID + "&lg_GROSSISTE_ID=" + lg_GROSSISTE_ID + "&lg_USER_ID=" + lg_USER_ID;

                                            OGridStore.load();
                                            OGridStore.loadPage(1);
//                                           
                                        }
                                    }
                                }, '-', {
                                    xtype: 'combobox',
                                    name: 'lg_FAMILLEARTICLE_ID',
                                    margins: '0 0 0 10',
                                    id: 'lg_FAMILLEARTICLE_ID',
                                    store: store_famillearticle,
                                    valueField: 'lg_FAMILLEARTICLE_ID',
                                    displayField: 'str_LIBELLE',
                                    pageSize: itemsPerPage, //ajout la barre de pagination
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    flex: 1,
                                    emptyText: 'Selectionner famille article...',
                                    listeners: {
                                        select: function (cmp) {
                                            var value = cmp.getValue();

                                            var rechecher = Ext.getCmp('rechecher').getValue();
                                            var str_TYPE = Ext.getCmp('str_TYPE').getValue();

                                            var lg_GROSSISTE_ID = "";
                                            var lg_ZONE_GEO_ID = "", lg_USER_ID = "";

                                            if (Ext.getCmp('lg_GROSSISTE_ID').getValue() !== null) {
                                                lg_GROSSISTE_ID = Ext.getCmp('lg_GROSSISTE_ID').getValue();
                                            }

                                            if (Ext.getCmp('lg_ZONE_GEO_ID').getValue() !== null) {
                                                lg_ZONE_GEO_ID = Ext.getCmp('lg_ZONE_GEO_ID').getValue();
                                            }
                                            if (Ext.getCmp('lg_USER_ID').getValue() !== null) {
                                                lg_USER_ID = Ext.getCmp('lg_USER_ID').getValue();
                                            }
                                            var OGridStore = Ext.getCmp('gridpanelInventaireID').getStore();
                                            OGridStore.getProxy().url = url_services_data_inventaire_famille + "&str_TYPE=" + str_TYPE + "&search_value=" + rechecher + "&lg_FAMILLEARTICLE_ID=" + value + "&lg_ZONE_GEO_ID=" + lg_ZONE_GEO_ID + "&lg_GROSSISTE_ID=" + lg_GROSSISTE_ID + "&lg_USER_ID=" + lg_USER_ID;
                                            OGridStore.load();
                                            OGridStore.loadPage(1);
                                        }
                                    }
                                }, '-', {
                                    xtype: 'combobox',
                                    name: 'lg_ZONE_GEO_ID',
                                    margins: '0 0 0 10',
                                    id: 'lg_ZONE_GEO_ID',
                                    store: store_zonegeo,
                                    minChars: 2,
//                                    autoSelect: true,
                                    selectOnFocus: true,
                                    valueField: 'lg_ZONE_GEO_ID',
                                    displayField: 'str_LIBELLEE',
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    pageSize: itemsPerPage, //ajout la barre de pagination
                                    flex: 1,
                                    emptyText: 'Sectionner zone geographique...',
                                    listeners: {
                                        select: function (cmp) {
                                            var value = cmp.getValue();

                                            var rechecher = Ext.getCmp('rechecher').getValue();
                                            var str_TYPE = Ext.getCmp('str_TYPE').getValue();

                                            var lg_GROSSISTE_ID = "";
                                            var lg_FAMILLEARTICLE_ID = "", lg_USER_ID = "";

                                            if (Ext.getCmp('lg_GROSSISTE_ID').getValue() !== null) {
                                                lg_GROSSISTE_ID = Ext.getCmp('lg_GROSSISTE_ID').getValue();
                                            }
                                            if (Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue() !== null) {
                                                lg_FAMILLEARTICLE_ID = Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue();
                                            }
                                            if (Ext.getCmp('lg_USER_ID').getValue() !== null) {
                                                lg_USER_ID = Ext.getCmp('lg_USER_ID').getValue();
                                            }
                                            var OGridStore = Ext.getCmp('gridpanelInventaireID').getStore();
                                            OGridStore.getProxy().url = url_services_data_inventaire_famille + "&str_TYPE=" + str_TYPE + "&search_value=" + rechecher + "&lg_FAMILLEARTICLE_ID=" + lg_FAMILLEARTICLE_ID + "&lg_ZONE_GEO_ID=" + value + "&lg_GROSSISTE_ID=" + lg_GROSSISTE_ID + "&lg_USER_ID=" + lg_USER_ID;
                                            OGridStore.load();
                                            OGridStore.loadPage(1);
                                        }
                                    }
                                }, '-', {
                                    xtype: 'combobox',
                                    name: 'lg_GROSSISTE_ID',
                                    margins: '0 0 0 10',
//                                    hidden: true,
                                    id: 'lg_GROSSISTE_ID',
                                    store: store_grossiste,
                                    valueField: 'lg_GROSSISTE_ID',
                                    displayField: 'str_LIBELLE',
                                    pageSize: itemsPerPage, //ajout la barre de pagination
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    flex: 1,
                                    emptyText: 'Sectionner grossiste...',
                                    listeners: {
                                        select: function (cmp) {
                                            var value = cmp.getValue();

                                            var rechecher = Ext.getCmp('rechecher').getValue();
                                            var str_TYPE = Ext.getCmp('str_TYPE').getValue();

                                            var lg_FAMILLEARTICLE_ID = "";
                                            var lg_ZONE_GEO_ID = "", lg_USER_ID = "";

                                            if (Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue() !== null) {
                                                lg_FAMILLEARTICLE_ID = Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue();
                                            }
                                            if (Ext.getCmp('lg_ZONE_GEO_ID').getValue() !== null) {
                                                lg_ZONE_GEO_ID = Ext.getCmp('lg_ZONE_GEO_ID').getValue();
                                            }
                                            if (Ext.getCmp('lg_USER_ID').getValue() !== null) {
                                                lg_USER_ID = Ext.getCmp('lg_USER_ID').getValue();
                                            }
                                            var OGridStore = Ext.getCmp('gridpanelInventaireID').getStore();
                                            OGridStore.getProxy().url = url_services_data_inventaire_famille + "&str_TYPE=" + str_TYPE + "&search_value=" + rechecher + "&lg_FAMILLEARTICLE_ID=" + lg_FAMILLEARTICLE_ID + "&lg_ZONE_GEO_ID=" + lg_ZONE_GEO_ID + "&lg_GROSSISTE_ID=" + value + "&lg_USER_ID=" + lg_USER_ID;
                                            OGridStore.load();
                                            OGridStore.loadPage(1);
                                        }
                                    }
                                }, '-',
                                {
                                    xtype: 'combobox',
                                    name: 'lg_USER_ID',
                                    margins: '0 0 0 10',
//                                    hidden: true,
                                    id: 'lg_USER_ID',
                                    store: store_utilisateur,
                                    valueField: 'lg_USER_ID',
                                    displayField: 'str_FIRST_LAST_NAME',
                                    pageSize: itemsPerPage, //ajout la barre de pagination
                                    typeAhead: true,
                                    queryMode: 'remote',
                                    flex: 1,
                                    emptyText: 'Choisir un utilisateur...',
                                    listeners: {
                                        select: function (cmp) {
                                            var value = cmp.getValue();

                                            var rechecher = Ext.getCmp('rechecher').getValue();
                                            var str_TYPE = Ext.getCmp('str_TYPE').getValue();

                                            var lg_FAMILLEARTICLE_ID = "";
                                            var lg_ZONE_GEO_ID = "", lg_GROSSISTE_ID = "";

                                            if (Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue() !== null) {
                                                lg_FAMILLEARTICLE_ID = Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue();
                                            }
                                            if (Ext.getCmp('lg_ZONE_GEO_ID').getValue() !== null) {
                                                lg_ZONE_GEO_ID = Ext.getCmp('lg_ZONE_GEO_ID').getValue();
                                            }
                                            if (Ext.getCmp('lg_GROSSISTE_ID').getValue() !== null) {
                                                lg_GROSSISTE_ID = Ext.getCmp('lg_GROSSISTE_ID').getValue();
                                            }
                                            var OGridStore = Ext.getCmp('gridpanelInventaireID').getStore();
                                            OGridStore.getProxy().url = url_services_data_inventaire_famille + "&str_TYPE=" + str_TYPE + "&search_value=" + rechecher + "&lg_FAMILLEARTICLE_ID=" + lg_FAMILLEARTICLE_ID + "&lg_ZONE_GEO_ID=" + lg_ZONE_GEO_ID + "&lg_GROSSISTE_ID=" + lg_GROSSISTE_ID + "&lg_USER_ID=" + value;
                                            OGridStore.load();
                                            OGridStore.loadPage(1);
                                        }
                                    }
                                }, '-', 
                                {
                                    xtype: 'textfield',
                                    id: 'rechecher',
                                    name: 'rechecher',
                                    selectOnFocus: true,
                                    emptyText: 'Recherche article',
                                    listeners: {
                                        render: function (cmp) {
                                            cmp.getEl().on('keypress', function (e) {
                                                if (e.getKey() === e.ENTER) {
                                                    var searchValue = cmp.getValue();
                                                    Me.onfiltercheck(searchValue);
                                                }
                                            });
                                        },
                                        // Navigation avec FLÈCHE BAS depuis la recherche
                                        specialkey: function (field, e) {
                                            if (e.getKey() === e.DOWN) {
                                                e.stopEvent();
                                                var grid = Ext.getCmp('gridpanelInventaireID');
                                                if (grid.getStore().getCount() > 0) {
                                                    grid.getPlugin('inventaireEditor').startEdit(0, 7);
                                                }
                                            }
                                        }
                                    }
                                }
                            ],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: itemsPerPageGrid,
                                store: store_inventaire_famille,
                                displayInfo: true,
                                plugins: new Ext.ux.ProgressBarPager(),
                                listeners: {

                                    change: function (item, layout) {
                                        Ext.getCmp('gridpanelInventaireID').getPlugin('inventaireEditor').startEditByPosition({row: Number(currentrowindex), column: 7});
                                        Ext.getCmp('gridpanelInventaireID').getPlugin('inventaireEditor').startEdit(currentrowindex, 7);
                                        return false;
                                    }

                                }
                            }, selModel: {
                                selType: 'cellmodel'
                            }

                        }]
                },
                {
                    xtype: 'toolbar',
                    ui: 'footer',
                    dock: 'bottom',
                    border: '0',
                    items: ['->', 
                        {
                            text: 'Retour',
                            id: 'btn_back',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            handler: this.onbtnback
                        },
                        {
                            text: 'Actualiser le stock',
                            id: 'btn_actualise',
                            icon: 'resources/images/icons/fam/cog_edit.png',
                            scope: this,
                            handler: this.onbtnActualiserStock
                        },

                        {
                            text: 'Cloturer',
                            id: 'btn_loturer',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            handler: this.onbtncloturer
                        }, {
                            text: 'Editer fiche',
                            id: 'btn_devis',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            hidden: false,
                            handler: this.onbtnprint
                        }, {
                            text: 'Imprimer liste des &eacute;carts',
                            id: 'btn_print_ecart',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            hidden: false,
                            handler: this.onbtnprintecart
                        }, {
                            text: 'Imprimer liste des articles alerte',
                            id: 'btn_print_alerte',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            hidden: true,
                            handler: this.onbtnprintalert
                        },
                        {
                            text: 'Importer csv',

                            iconCls: 'icon-clear-group',
                            scope: this,
                            handler: function () {
                                var win = new Ext.window.Window({
                                    autoShow: false,
                                    title: 'Importation de lignes inventaire',
                                    width: 500,
                                    height: 150,
                                    layout: 'fit',
                                    plain: true,
                                    items: {
                                        xtype: 'form',
                                        bodyPadding: 10,
                                        defaults: {
                                            anchor: '100%'
                                        },
                                        items: [{
                                                xtype: 'fieldset',
                                                bodyPadding: 10,
                                                defaultType: 'filefield',
                                                defaults: {
                                                    anchor: '100%'
                                                },
                                                items: [
                                                    {
                                                        xtype: 'filefield',
                                                        fieldLabel: 'Fichier csv,xls',
                                                        emptyText: 'Fichier csv,xls ',
                                                        name: 'str_FILE',
                                                        allowBlank: false,
                                                        buttonText: 'Choisir un fichier ',
                                                        width: 400
                                                    }


                                                ]
                                            }]
                                    }
                                    ,
                                    buttons: [{
                                            text: 'Enregistrer',
                                            handler: this.onbtnImporter
                                        }, {
                                            text: 'Annuler',
                                            handler: function () {
                                                win.close();
                                            }
                                        }]
                                });
                                win.show();
                            }
                        },

                        {
                            text: 'Exporter excel',
                            id: 'btn_export_txt',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            hidden: true,
                            handler: this.onbtnexportExcel
                        }, {
                            text: 'Exporter CSV',
                            id: 'btn_export_cvs',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            hidden: true,
                            handler: this.onbtnexportCsv
                        }

                    ]
                }]
        });
        this.callParent();
        this.loadData();
        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });



        if (my_view_title === "Modification de la fiche d'inventaire") {

            this.title = my_view_title + " ::  " + this.getOdatasource().str_NAME;
            ref = this.getOdatasource().lg_INVENTAIRE_ID;
        }



    },
    loadStore: function () {
        Ext.getCmp('gridpanelInventaireID').getStore().load({
            callback: this.onStoreLoad
        });

    },
    onStoreLoad: function () {

        var grid = Ext.getCmp('gridpanelInventaireID');

        if (grid.getStore().getCount() > 0) {
            var firstRec = grid.getStore().getAt(0);
            if (firstRec.get('is_AUTHORIZE_STOCK') == false) { // cacher le champ stock machine
//                alert("entete " + grid.headerCt.getHeaderAtIndex(8).text);
                Me.findColumnByDataIndex(grid, 8).setVisible(false);
                Me.findColumnByDataIndex(grid, 8).setVisible(false);
            }
        }


    },
    onbtnback: function () {
        var xtype = "";
        xtype = "inventaire";
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
    },
    loadData: function () {
        KEY_MAX_VALUE_INVENTAIRE = "KEY_MAX_VALUE_INVENTAIRE";
        Ext.Ajax.request({
            url: url_services_data_parameter,
            params: {
                str_KEY: KEY_MAX_VALUE_INVENTAIRE
            },
            success: function (response)
            {

                var object = Ext.JSON.decode(response.responseText, false);

                if (object.success !== "0") {
                    KEY_MAX_VALUE_INVENTAIRE = parseInt(object.str_VALUE);

                }

            },
            failure: function (response)
            {
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
            }
        });
    },
    onfiltercheck: function (valeur) {
        var str_TYPE = Ext.getCmp('str_TYPE').getValue();
        var lg_GROSSISTE_ID = "";
        var lg_FAMILLEARTICLE_ID = "";
        var lg_ZONE_GEO_ID = "", lg_USER_ID = "";

        if (Ext.getCmp('lg_GROSSISTE_ID').getValue() !== null) {
            lg_GROSSISTE_ID = Ext.getCmp('lg_GROSSISTE_ID').getValue();
        }
        if (Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue() !== null) {
            lg_FAMILLEARTICLE_ID = Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue();
        }
        if (Ext.getCmp('lg_ZONE_GEO_ID').getValue() !== null) {
            lg_ZONE_GEO_ID = Ext.getCmp('lg_ZONE_GEO_ID').getValue();
        }
        if (Ext.getCmp('lg_USER_ID').getValue() !== null) {
            lg_USER_ID = Ext.getCmp('lg_USER_ID').getValue();
        }

        var OGrid = Ext.getCmp('gridpanelInventaireID');
        var searchField = Ext.getCmp('rechecher');

        OGrid.getStore().getProxy().url = url_services_data_inventaire_famille + "&str_TYPE=" + str_TYPE + "&search_value=" + valeur + "&lg_FAMILLEARTICLE_ID=" + lg_FAMILLEARTICLE_ID + "&lg_ZONE_GEO_ID=" + lg_ZONE_GEO_ID + "&lg_GROSSISTE_ID=" + lg_GROSSISTE_ID + "&lg_USER_ID=" + lg_USER_ID;

        OGrid.getStore().load({
            callback: function (records, operation, success) {
                // COURT DÉLAI pour laisser le temps au store de se mettre à jour
                setTimeout(function () {
                    if (records.length === 0) {
                        // FORCER le focus et la sélection avec plusieurs tentatives
                        if (searchField) {
                            // 1ère tentative
                            searchField.focus(false, 10);
                            searchField.selectText();

                            // 2ème tentative après un court délai
                            setTimeout(function () {
                                searchField.focus(true, 10);
                                searchField.selectText();

                                // 3ème tentative pour s'assurer
                                setTimeout(function () {
                                    searchField.focus(true, 10);
                                    searchField.selectText();
                                }, 50);
                            }, 100);
                        }

                        // Message d'information
                        Ext.toast('Aucun produit trouvé pour: ' + valeur, 3000);

                    } else {
                        // Résultats trouvés - navigation normale
                        setTimeout(function () {
                            OGrid.getPlugin('inventaireEditor').startEdit(0, 7);
                        }, 100);
                    }
                }, 150); // Délai initial
            }
        });
    },
    onbtnprint: function () {
        str_NAME_FILE = "";
        Me.onPdfClick();

    },
    onbtnprintecart: function () {
        str_NAME_FILE = "ecart";
        Me.onPdfClick();

    },
    onbtnprintalert: function () {
        str_NAME_FILE = "alerte";
        Me.onPdfClick();

    },
    onRemoveClick: function (grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmer la suppresssion',
                function (btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_transaction_inventaire + 'deleteInventaireFamille',
                            params: {
                                lg_INVENTAIRE_FAMILLE_ID: rec.get('lg_INVENTAIRE_FAMILLE_ID')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success === 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                }
                                grid.getStore().reload();
                            },
                            failure: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);

                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    }
                });


    }

    ,
    onbtnexportExcel: function () {

        window.location = '../ExportInventaire?lg_INVENTAIRE_ID=' + ref + "&format=Excel";
    },
    onbtnexportCsv: function () {

        window.location = '../ExportInventaire?lg_INVENTAIRE_ID=' + ref + "&format=csv";
    },

    onbtnImporter: function (button) {
        var fenetre = button.up('window'),
                formulaire = fenetre.down('form');
        if (!formulaire.isValid()) {
            return;
        }
        formulaire.submit({
            url: '../ImportInventaire?lg_INVENTAIRE_ID=' + ref,
            waitMsg: 'Veuillez patienter le temps du telechargemetnt du fichier...',
            timeout: 2400000,
            success: function (formulaire, action) {
                const result = Ext.JSON.decode(action.response.responseText, true);
                console.log(result);
                if (result.statut === 1) {

                    Ext.Msg.show({
                        title: 'Confirmation',
                        msg: result.success,
                        buttons: Ext.Msg.OK,
                        icon: Ext.Msg.INFO,
                        fn: function () {
                            // Recharger le store et fermer la fenêtre
                            var OGridStore = Ext.getCmp('gridpanelInventaireID').getStore();
                            OGridStore.load();
                            OGridStore.loadPage(1);
                            fenetre.close();

                            // Vérifier et traiter les lignes ignorées
                            if (result.ignored && result.ignored > 0 && result.ignoredCsv) {
                                setTimeout(function () {
                                    var filename = 'lignes_ignorees_' + new Date().toISOString().slice(0, 10) + '.csv';
                                    var csvContent = result.ignoredCsv;

                                    // Téléchargement automatique
                                    var hiddenElement = document.createElement('a');
                                    hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURI(csvContent);
                                    hiddenElement.target = '_blank';
                                    hiddenElement.download = filename;
                                    hiddenElement.click();

                                }, 500);
                            }
                        }
                    });
                } else {
                    Ext.MessageBox.alert('Erreur', result.success);
                }

                var bouton = button.up('window');
                bouton.close();
            },
            failure: function (formulaire, action) {
                Ext.MessageBox.alert('Erreur', 'Erreur  ' + action.result.errors);
            }
        });

    },
    // Fonction pour télécharger le CSV
    downloadIgnoredCsv: function (csvData, filename) {
        try {
            // Créer un blob à partir des données CSV
            var blob = new Blob(["\uFEFF" + csvData], {type: 'text/csv;charset=utf-8;'});

            // Créer un lien de téléchargement
            var link = document.createElement('a');
            var url = URL.createObjectURL(blob);

            // Configurer le lien
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';

            // Ajouter le lien au DOM et déclencher le clic
            document.body.appendChild(link);
            link.click();

            // Nettoyer
            setTimeout(function () {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 100);
        } catch (e) {
            console.error("Erreur lors du téléchargement du CSV:", e);
            Ext.Msg.alert('Erreur', 'Impossible de générer le fichier des lignes ignorées.');
        }
    }
    ,
    onbtncloturer: function (button) {
        Ext.MessageBox.confirm('Message',
                'Confirmer la cloture de l\'inventare',
                function (btn) {
                    if (btn === 'yes') {
                        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                        Ext.Ajax.request({
                            method: 'PUT',
                            headers: {'Content-Type': 'application/json'},
                            url: '../api/v1/commande/clotureinventaire/' + ref,
                            timeout: 18000000,
                            success: function (response, options) {
                                progress.hide();
                                var result = Ext.JSON.decode(response.responseText, true);
                                if (result.success) {
                                    Ext.MessageBox.show({
                                        title: 'Avertissement',
                                        width: 320,
                                        msg: result.msg,
                                        buttons: Ext.MessageBox.OK,
                                        icon: Ext.MessageBox.WARNING,
                                        fn: function (buttonId) {
                                            if (buttonId === "ok") {
                                                Me.onbtnback();
                                            }
                                        }


                                    });
                                } else {
                                    Ext.MessageBox.show({
                                        title: 'Avertissement',
                                        width: 320,
                                        msg: result.msg,
                                        buttons: Ext.MessageBox.OK,
                                        icon: Ext.MessageBox.ERROR,
                                        fn: function (buttonId) {
                                            if (buttonId === "ok") {
                                                Me.onbtnback();
                                            }
                                        }


                                    });
                                }

                            },
                            failure: function (response, options) {
                                progress.hide();
                                Ext.Msg.alert("Message", 'Erreur du serveur ' + response.status);
                            }

                        });
                    }
                });
    },

    onPdfClick: function () {

        var chaine = location.pathname;
        var reg = new RegExp("[/]+", "g");
        var tableau = chaine.split(reg);
        var sitename = tableau[1];
        var P_ZONE_ID = "", P_GROSSISTE_ID = "", P_FAMILLEARTICLE_ID = "", str_FILTER = "", lg_USER_ID = "";
        ;
        if (Ext.getCmp('lg_GROSSISTE_ID').getValue() !== null) {
            P_GROSSISTE_ID = Ext.getCmp('lg_GROSSISTE_ID').getValue();
        }
        if (Ext.getCmp('str_TYPE').getValue() !== null) {
            str_FILTER = Ext.getCmp('str_TYPE').getValue();
        }
        if (Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue() !== null) {
            P_FAMILLEARTICLE_ID = Ext.getCmp('lg_FAMILLEARTICLE_ID').getValue();
        }
        if (Ext.getCmp('lg_USER_ID').getValue() !== null) {
            lg_USER_ID = Ext.getCmp('lg_USER_ID').getValue();
        }
        if (Ext.getCmp('lg_ZONE_GEO_ID').getValue() !== null) {
            P_ZONE_ID = Ext.getCmp('lg_ZONE_GEO_ID').getValue();
        }
        // alert(str_FILTER);
        // return;
        var linkUrl = url_services_pdf_fiche_inventaire + '?lg_INVENTAIRE_ID=' + ref + "&str_NAME_FILE=" + str_NAME_FILE + '&P_ZONE_ID=' + P_ZONE_ID + '&P_FAMILLEARTICLE_ID=' + P_FAMILLEARTICLE_ID + '&P_GROSSISTE_ID=' + P_GROSSISTE_ID + "&str_FILTER=" + str_FILTER + "&lg_USER_ID=" + lg_USER_ID;
        if (str_NAME_FILE === "alerte") {

            linkUrl = url_services_pdf_fiche_inventaire + '?lg_INVENTAIRE_ID=' + ref + "&str_NAME_FILE=" + str_NAME_FILE + "&P_ALERTE=" + KEY_MAX_VALUE_INVENTAIRE + '&P_ZONE_ID=' + P_ZONE_ID + '&P_FAMILLEARTICLE_ID=' + P_FAMILLEARTICLE_ID + '&P_GROSSISTE_ID=' + P_GROSSISTE_ID + "&lg_USER_ID=" + lg_USER_ID;
        }

//        alert("Ok ca marche " + linkUrl);
//        return;
        window.open(linkUrl);

//        var xtype = "";
//        xtype = "inventaire";
//        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");

    },

    findColumnByDataIndex: function (grid, columnIndex) {

        return  grid.headerCt.getHeaderAtIndex(columnIndex);
    },
    
    // Ajouter cette méthode à la classe
        addKeyMap: function() {
            // Créer un keyMap pour F3
            this.keyMap = new Ext.util.KeyMap({
                target: Ext.getBody(),
                binding: [{
                    key: Ext.EventObject.F3,
                    fn: function() {
                        var searchField = Ext.getCmp('rechecher');
                        if (searchField) {
                            searchField.focus(true, 100);
                            searchField.selectText();
                        }
                        return false; // Empêcher le comportement par défaut de F3
                    },
                    scope: this
                }]
            });
        },

    onbtnActualiserStock: function (button) {
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/inventaire/refreshStockLigneInventaire/' + ref,
            timeout: 18000000,
            success: function (response, options) {
                progress.hide();
                Ext.getCmp('gridpanelInventaireID').getStore().reload();
            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert("Message", 'Erreur du serveur ' + response.status);
            }

        });
    }


});


