/* global Ext */

var url_services_data_famille_famille = '../webservices/sm_user/famille/ws_data.jsp';
var url_services_transaction_famille = '../webservices/sm_user/famille/ws_transaction.jsp?mode=';
var url_services_transaction_app_remise = '../webservices/configmanagement/famillearticle/ws_transaction_maxVente.jsp?mode=';
var url_services_data_max_app_remise = '../webservices/configmanagement/famillearticle/ws_data_maxVente.jsp';
var url_services_data_dci = '../webservices/configmanagement/dci/ws_data.jsp';
var url_services_article_generate_pdf = '../webservices/sm_user/famille/ws_generate_pdf.jsp';
var lg_EMPLACEMENT_ID = "";
var Me_Workflow;

// Champ "neutre" renvoye quand un composant filtre est introuvable (ex: id global
// clobbere par la fermeture d'une fenetre detail qui reutilise le meme id) : evite
// les plantages du type "Ext.getCmp(...) is undefined" sur les actions de la fiche.
var FM_NULL_FIELD = {
    getValue: function () { return ''; },
    getRawValue: function () { return ''; },
    setValue: function () {},
    clearValue: function () {},
    focus: function () {},
    getStore: function () { return {loadPage: function () {}, reload: function () {}}; }
};


Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}


Ext.define('testextjs.view.configmanagement.famille.FamilleManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'famillemanager',
    id: 'famillemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Famille',
        'testextjs.view.configmanagement.famille.action.add',
        'testextjs.view.configmanagement.famille.action.maj_seuil',
        'testextjs.view.configmanagement.famille.action.infogenerale',
        'testextjs.view.configmanagement.famille.action.comptabilite',
        'testextjs.view.configmanagement.famille.action.autreinfos',
        'Ext.ux.ProgressBarPager',
        'testextjs.view.stockmanagement.suivistockvente.action.detailStock',
        'testextjs.view.produits.PrixReference'

    ],
    title: 'Gestion des Articles',
    plain: true,
    maximizable: true,
    closable: false,
    frame: true,
    /* battement du champ actif (vp-focus-beat) : activé sur cet écran */
    cls: 'vp-focus-zone',
    initComponent: function () {
        Me_Workflow = this;
        lg_EMPLACEMENT_ID = loadEmplacement();
        let itemsPerPage = 20;
        
        const store = new Ext.data.Store({
            model: 'testextjs.model.Famille',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit-search/fiche',
                timeout: 60000,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            },
            listeners: {
                beforeload: function (store, operation) {
                    const proxy = store.getProxy();

                    const searchCmp = Me_Workflow.fmField('rechecher');
                    const typeCmp = Me_Workflow.fmField('str_TYPE_TRANSACTION');
                    const dciCmp = Me_Workflow.fmField('lg_DCI_PRINCIPAL_ID');
                    const zoneCmp = Me_Workflow.fmField('lg_ZONE_GEO_ID');
                    const stockOpCmp = Me_Workflow.fmField('stock_operator');
                    const stockValCmp = Me_Workflow.fmField('stock_value');

                    proxy.setExtraParam('search_value', searchCmp ? (searchCmp.getValue() || '') : '');
                    proxy.setExtraParam('str_TYPE_TRANSACTION', typeCmp ? (typeCmp.getValue() || '') : '');
                    proxy.setExtraParam('lg_DCI_ID', dciCmp ? (dciCmp.getValue() || '') : '');
                    proxy.setExtraParam('lg_ZONE_GEO_ID', zoneCmp ? (zoneCmp.getValue() || '') : '');
                    proxy.setExtraParam('stock_operator', stockOpCmp ? (stockOpCmp.getValue() || '') : '');
                    proxy.setExtraParam('stock_value', stockValCmp ? (stockValCmp.getValue() || '') : '');
                }
            }
        });

        const store_dci = new Ext.data.Store({
            model: 'testextjs.model.Dci',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_data_dci,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });


        const store_type = new Ext.data.Store({
            fields: ['str_TYPE_TRANSACTION', 'str_desc'],
            data: [{str_TYPE_TRANSACTION: 'ALL', str_desc: 'Tous'}, {str_TYPE_TRANSACTION: 'DECONDITION', str_desc: 'Les articles deconditionnables'}, {str_TYPE_TRANSACTION: 'DECONDITIONNE', str_desc: 'Les articles deconditionnes'}, {str_TYPE_TRANSACTION: 'SANSEMPLACEMENT', str_desc: 'Les articles sans emplacement'}, {str_TYPE_TRANSACTION: 'RESERVE', str_desc: 'Les articles en reserve'}]
        });

        const store_stock_operator = new Ext.data.Store({
            fields: ['operator', 'str_desc'],
            data: [
                {operator: 'LESS', str_desc: 'Inferieur a'},
                {operator: 'MORE', str_desc: 'Superieur a'},
                {operator: 'EQUAL', str_desc: 'Egal a'},
                {operator: 'LESSOREQUAL', str_desc: 'Inferieur ou egal a'},
                {operator: 'MOREOREQUAL', str_desc: 'Superieur ou egal a'}
            ]
        });


        const rayons = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields: [
                {
                    name: 'id',
                    type: 'string'
                },
                {
                    name: 'libelle',
                    type: 'string'
                }
            ],
            autoLoad: false,
            pageSize: 9999,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/rayons',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });

        Ext.apply(this, {
            width: '98%',
            height: valheight,

            store: store,
            cls: 'my-grid-header',
            id: 'GridArticleID',
            columns: [
                {
                    header: 'lg_FAMILLE_ID',
                    dataIndex: 'lg_FAMILLE_ID',
                    hidden: true,
                    flex: 1
                },
                {

                    header: 'Etat.cmde',
                    dataIndex: 'produitState',
                    renderer: function (v, m, r) {
                        const produitState = r.data.produitState;
                        const enSuggestion = produitState?.enSuggestion;
                        const enCommande = produitState?.enCommande;
                        const entree = produitState?.entree;
                        if (enSuggestion && enSuggestion > 0) {
                            m.style = 'background-color:#73C774;';
                            return 1;
                        } else if (enCommande && enCommande > 0) {
                            m.style = 'background-color:#5fa2dd;';
                            return 2;
                        } else if (entree && entree > 0) {
                            m.style = 'background-color:#ffc107;';
                            return 3;
                        }
                        return null;

                    },
                    width: 35
                },

                {
                    header: 'CIP',
                    dataIndex: 'int_CIP',
                    flex: 0.6,
                    renderer: function (v, m, r) {
                        const stock = r.data.int_NUMBER_AVAILABLE;
                        if (stock == 0) {
                            m.style = 'background-color:#B0F2B6;font-weight:800;';
                        } else if (stock > 0) {
                            m.style = 'font-weight:800;';
                        } else if (stock < 0) {
                            m.style = 'background-color:#F5BCA9;font-weight:800;';
                        }
                        return v;
                    }
                },
                {
                    header: 'Designation',
                    dataIndex: 'str_DESCRIPTION',
                    flex: 2,
                    renderer: function (v, m, r) {

                        const stock = r.data.int_NUMBER_AVAILABLE;
                        if (stock == 0) {
                            m.style = 'background-color:#B0F2B6;font-weight:800;';
                        } else if (stock > 0) {
                            m.style = 'font-weight:800;';
                        } else if (stock < 0) {
                            m.style = 'background-color:#F5BCA9;font-weight:800;';
                        }
                        return v;
                    }
                },
                {
                    header: 'P.Vente',
                    dataIndex: 'int_PRICE',
                    align: 'right',
                    flex: 0.5,
                    renderer: function (v, m, r) {

                        const stock = r.data.int_NUMBER_AVAILABLE;
                        if (stock == 0) {
                            m.style = 'background-color:#B0F2B6;font-weight:800;';
                        } else if (stock > 0) {
                            m.style = 'font-weight:800;';
                        } else if (stock < 0) {
                            m.style = 'background-color:#F5BCA9;font-weight:800;';
                        }
                        return amountformat(v);
                    }
                },

                {
                    header: 'P.Achat',
                    dataIndex: 'int_PAF',
                    align: 'right',
                    flex: 0.5,
                    renderer: function (v, m, r) {

                        const stock = r.data.int_NUMBER_AVAILABLE;
                        if (stock == 0) {
                            m.style = 'background-color:#B0F2B6;font-weight:800;';
                        } else if (stock > 0) {
                            m.style = 'font-weight:800;';
                        } else if (stock < 0) {
                            m.style = 'background-color:#F5BCA9;font-weight:800;';
                        }
                        return amountformat(v);
                    }
                },
                {
                    header: 'Stock',
                    dataIndex: 'int_NUMBER_AVAILABLE',
                    align: 'center',
                    flex: 0.5,
                    renderer: function (v, m, r) {
                        const stock = r.data.int_NUMBER_AVAILABLE;

                        if (stock < 0) {
                            // Valeurs négatives : texte en rouge, fond rosé
                            m.style = 'color:red; font-weight:bold; background-color:#F5BCA9;font-size: 18px;';
                        } else if (stock == 0) {
                            // Valeur zéro : texte en noir, fond verdâtre
                            m.style = 'color:blue; font-weight:bold; background-color:#B0F2B6;font-size: 18px;';
                        } else {
                            // Valeurs positives : texte en bleu
                            m.style = 'color:green; font-weight:bold;font-size: 18px;';
                        }
                        var rayonQte = parseInt(stock, 10);
                        if (isNaN(rayonQte)) { rayonQte = 0; }
                        var reserveQte = parseInt(r.data.int_STOCK_RESERVE, 10);
                        if (isNaN(reserveQte)) { reserveQte = 0; }
                        var totalQte = rayonQte + reserveQte;
                        m.tdAttr = 'data-qtip="<span style=\'color:blue;font-weight:bold;white-space:nowrap;\'>Stock Total : ' + totalQte + '</span>" data-qwidth="160"';
                        return v;
                    }
                }, {
                    header: 'RES',
                    dataIndex: 'int_STOCK_RESERVE',
                    align: 'center',
                    flex: 0.5,
                    hidden: false,
                    renderer: function (v, m, r) {
                        if (!r.data.bool_RESERVE) {
                            return '';
                        }
                        const reserve = v != null ? v : 0;
/*
                        // Appliquer la même mise en forme que Stock
                        if (reserve < 0) {
                            // Valeurs négatives : texte en rouge, fond rosé
                            m.style = 'color:red; font-weight:bold; background-color:#F5BCA9;font-size: 18px;';
                        } else if (reserve == 0) {
                            // Valeur zéro : texte en bleu, fond verdâtre
                            m.style = 'color:blue; font-weight:bold; background-color:#B0F2B6;font-size: 18px;';
                        } else {
                            // Valeurs positives : texte en vert
                            m.style = 'color:green; font-weight:bold;font-size: 18px;';
                        }*/
                        
                        const stock = r.data.int_NUMBER_AVAILABLE;
                        if (stock == 0) {
                            m.style = 'color:#6600cc; font-weight:bold;background-color:#B0F2B6;font-weight:bold;font-size: 18px;';
                        } else if (stock > 0) {
                            m.style = 'color:#6600cc; font-weight:bold;font-weight:bold;font-size: 18px;';
                        } else if (stock < 0) {
                            m.style = 'color:#6600cc; font-weight:bold;background-color:#F5BCA9;font-weight:bold;font-size: 18px;';
                        }

                        var rayonQte = parseInt(stock, 10);
                        if (isNaN(rayonQte)) { rayonQte = 0; }
                        var reserveQte = parseInt(reserve, 10);
                        if (isNaN(reserveQte)) { reserveQte = 0; }
                        var totalQte = rayonQte + reserveQte;
                        m.tdAttr = 'data-qtip="<span style=\'color:blue;font-weight:bold;white-space:nowrap;\'>Stock Total : ' + totalQte + '</span>" data-qwidth="160"';

                        return reserve;
                    }
                }, {
                    header: 'Seuil',
                    dataIndex: 'int_STOCK_REAPROVISONEMENT',
                    align: 'center',
                    flex: 0.5
                    ,
                    renderer: function (v, m, r) {

                        const stock = r.data.int_NUMBER_AVAILABLE;
                        if (stock == 0) {
                            m.style = 'background-color:#B0F2B6;font-weight:800;';
                        } else if (stock > 0) {
                            m.style = 'font-weight:800;';
                        } else if (stock < 0) {
                            m.style = 'background-color:#F5BCA9;font-weight:800;';
                        }
                        return v;
                    }
                }, {
                    header: 'Qte.Reap',
                    dataIndex: 'int_QTE_REAPPROVISIONNEMENT',
                    align: 'center',
                    flex: 0.5
                    ,
                    renderer: function (v, m, r) {

                        const stock = r.data.int_NUMBER_AVAILABLE;
                        if (stock == 0) {
                            m.style = 'background-color:#B0F2B6;font-weight:800;';
                        } else if (stock > 0) {
                            m.style = 'font-weight:800;';
                        } else if (stock < 0) {
                            m.style = 'background-color:#F5BCA9;font-weight:800;';
                        }
                        return v;
                    }
                }, {
                    header: 'Emplacement',
                    dataIndex: 'lg_ZONE_GEO_ID',
                    align: 'center',
                    flex: 1
                    ,
                    renderer: function (v, m, r) {

                        const stock = r.data.int_NUMBER_AVAILABLE;
                        if (stock == 0) {
                            m.style = 'background-color:#B0F2B6;font-weight:800;';
                        } else if (stock > 0) {
                            m.style = 'font-weight:800;';
                        } else if (stock < 0) {
                            m.style = 'background-color:#F5BCA9;font-weight:800;';
                        }
                        return v;
                    }
                },
                {
                    text: 'P',
                    dataIndex: 'checkExpirationdate',
                    flex: 0.4,
                    xtype: 'checkcolumn',
                    listeners: {
                        checkChange: function (column, rowIndex, checked, eOpts) {
                            const record = store.getAt(rowIndex);
                            Ext.Ajax.request({
                                url: '../webservices/sm_user/famille/ws_updateperemptiondate.jsp',
                                params: {
                                    lg_FAMILLE_ID: record.get('lg_FAMILLE_ID'),
                                    checked: checked
                                },
                                success: function (response)
                                {
                                    const object = Ext.JSON.decode(response.responseText, false);
                                    if (object.success === 1) {
                                        record.commit();
                                    }

                                },
                                failure: function (response)
                                {


                                    Ext.MessageBox.alert('Error Message', response.responseText);

                                }
                            });
                        }
                    }
                },

                {
                    text: 'O',
                    dataIndex: 'scheduled',
                    flex: 0.4,
                    xtype: 'checkcolumn',
                    hidden: true,
                    listeners: {
                        checkChange: function (column, rowIndex, checked, eOpts) {
                            const record = store.getAt(rowIndex);
                            Ext.Ajax.request({
                                url: '../api/v1/commande/update/scheduled',
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                params: Ext.JSON.encode({
                                    ref: record.get('lg_FAMILLE_ID'),
                                    scheduled: checked
                                }),
                                success: function (response)
                                {
                                    const result = Ext.JSON.decode(response.responseText, true);
                                    if (result.success) {
                                        record.commit();
                                    }

                                },
                                failure: function (response)
                                {

                                    const object = Ext.JSON.decode(response.responseText, false);

                                    Ext.MessageBox.alert('Error Message', response.responseText);

                                }
                            });
                        }
                    }
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/duplicate_3671686.png',
                            tooltip: 'Gérer les prix de référence',
                            scope: this,
                            handler: function (grid, rowIndex, colIndex) {
                                new testextjs.view.produits.PrixReference({produit: grid.getStore().getAt(rowIndex)});
                                
                            }

                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            iconCls: 'calendar',
                            tooltip: 'Modifier la date de péremption',
                            scope: this,
                            handler: this.addPeremptiondate

                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/recherche.png',
                            tooltip: 'Voir les lots / péremptions',
                            scope: this,
                            handler: this.onViewPerimesClick
                        }]
                },

                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/page_white_edit.png',
                            tooltip: 'Modifier',
                            scope: this,
                            handler: this.onEditClick,
                            getClass: function (value, metadata, record) {
                                if (record.get('P_BT_UPDATE')) {
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
                            icon: 'resources/images/icons/fam/grossiste.png',
                            tooltip: 'Gerer Grossiste',
                            scope: this,
                            handler: this.onAddGrossisteClick,
                            getClass: function (value, metadata, record) {
                                if (record.get('bool_DECONDITIONNE') == "0") {  //read your condition from the record
                                    if (record.get('lg_EMPLACEMENT_ID') == "1") {  //read your condition from the record
                                        return 'x-display-hide'; //affiche l'icone
                                    } else {
                                        return 'x-hide-display'; //cache l'icone
                                    }
                                    //  return 'x-display-hide'; //affiche l'icone
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
                    hidden: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.png',
                            tooltip: 'Supprimer',
                            scope: this,

                            getClass: function (value, metadata, record) {
                                if (record.get('BTNDELETE')) {
                                    if (record.get('lg_EMPLACEMENT_ID') == "1") {  //read your condition from the record
                                        return 'x-display-hide'; //affiche l'icone
                                    } else {
                                        return 'x-hide-display'; //cache l'icone
                                    }

                                } else {

                                    return 'x-hide-display';
                                }
                            },
                            handler: this.onRemoveClick
                        }]
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/connect.png',
                            tooltip: 'Créer detail',
                            scope: this,
                            handler: this.onCreateDeconditionClick,
                            getClass: function (value, metadata, record) {
                                if (record.get('bool_DECONDITIONNE_EXIST') == "0") {  //read your condition from the record
                                    if (record.get('lg_EMPLACEMENT_ID') == "1") {  //read your condition from the record
                                        return 'x-display-hide'; //affiche l'icone
                                    } else {
                                        return 'x-hide-display'; //cache l'icone
                                    }
                                    // return 'x-display-hide'; //affiche l'icone
                                } else {
                                    return 'x-hide-display'; //cache l'icone
                                }
                            }
                        }]
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/cut.png',
                            tooltip: 'Deconditionner l\'article',
                            scope: this,
                            handler: this.onDeconditionClick,
                            getClass: function (value, metadata, record) {
                                if (record.get('bool_DECONDITIONNE') == "0") {  //read your condition from the record
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
                //onDesableClick
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/disable.png',
                            tooltip: 'Désactiver l\'article',
                            scope: this,
                            handler: this.onDesableClick,
                            getClass: function (value, metadata, record) {
                                if (record.get('lg_EMPLACEMENT_ID') === "1" && record.get('ACTION_DESACTIVE_PRODUIT')) {  //read your condition from the record
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
                            iconCls: 'suivimvt',
                            tooltip: 'Suivi de cet Article',
                            scope: this,
                            handler:
                                    function (grid, rowIndex) {
                                        const rec = grid.getStore().getAt(rowIndex);
                                        Me_Workflow.showPeriodeForm(rec.get('lg_FAMILLE_ID'), rec.get('str_NAME'));

                                    }

                        }]
                }



            ],
            selModel: {
                selType: 'cellmodel'
            },
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            text: 'Créer un Article',
                            tooltip: 'Créer un Article',
                            cls: 'btn-primary',
                            scope: this,
                            id: 'btn_add',
                            iconCls: 'addicon',
                            handler: this.onAddClick
                        },
                        '-',
                        {
                            text: 'Importer',
                            tooltip: 'Importer',
                            id: 'btn_import',
                            iconCls: 'importicon',
                            scope: this,
                            handler: this.onbtnimport
                        },
                        '-',
                        {
                            text: 'Recalculer seuils',
                            tooltip: 'Recalculer les seuils/quantités de réappro maintenant, selon le mode actif (sans attendre la fin du mois)',
                            id: 'btn_recalc_seuils',
                            iconCls: 'suggestionreapro',
                            scope: this,
                            handler: this.onRecalculerSeuils
                        },
                        '-',
                        {
                            text: 'MAJ SEUIL',
                            tooltip: 'Mise à jour groupée de Q1/Q2 (seuil/qté réappro) par famille ou emplacement',
                            id: 'btn_maj_seuil',
                            iconCls: 'configuration',
                            scope: this,
                            handler: this.onMajSeuil
                        },
                        '-',
                        {
                            text: 'Verifier l\'importation',
                            tooltip: 'Verifier l\'importation',
                            id: 'btn_checkimport',
                            iconCls: 'check_icon',
                            scope: this,
                            handler: this.onbtncheckimport
                        },
                        '-',
                        {
                            xtype: 'combobox',
                            name: 'stock_operator',
                            id: 'stock_operator',
                            store: store_stock_operator,
                            valueField: 'operator',
                            displayField: 'str_desc',
                            typeAhead: true,
                            queryMode: 'local',
                            width: 150,
                            emptyText: 'Operateur stock...',
                            listeners: {
                                select: function () {
                                    // Au choix d'un operateur : envoyer le focus sur la quantite.
                                    const qte = Me_Workflow.fmField('stock_value');
                                    if (qte) {
                                        qte.focus(true, 100);
                                    }
                                }
                            }
                        },
                        {
                            xtype: 'textfield',
                            id: 'stock_value',
                            name: 'stock_value',
                            width: 90,
                            emptyText: 'Qte.Stock',
                            enableKeyEvents: true,
                            listeners: {
                                specialKey: function (field, e) {
                                    if (e.getKey() === e.ENTER) {
                                        Me_Workflow.onRechClick();
                                    }
                                }
                            }
                        },
                        {
                            text: 'Effacer stock',
                            tooltip: 'Effacer le filtre stock',
                            iconCls: 'cancelicon',
                            scope: this,
                            handler: function () {
                                Me_Workflow.fmField('stock_operator').clearValue();
                                Me_Workflow.fmField('stock_value').setValue('');
                                Me_Workflow.onRechClick();
                            }
                        },
                        '-',
                        {
                            text: 'Importer des articles',
                            tooltip: 'Importer stock',
                            iconCls: 'importicon',
                            scope: this,
                            hidden: (lg_EMPLACEMENT_ID === '1'),
                            handler: function () {

                                const win = new Ext.window.Window({
                                    autoShow: false,
                                    title: 'Importer stock dépôt',
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
                                                bodyPadding: 20,
                                                defaultType: 'filefield',
                                                defaults: {
                                                    anchor: '100%'
                                                },
                                                items: [
                                                    {
                                                        xtype: 'filefield',
                                                        style: 'margin:5px !important;',
                                                        fieldLabel: 'Fichier xls',
                                                        emptyText: 'Fichier xls ',
                                                        name: 'fichier',
                                                        allowBlank: false,
                                                        buttonText: 'Choisir un fichier ',
                                                        width: 400
                                                    }
                                                ]
                                            }]
                                    },
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
                        '->',
                        {
                            text: 'Creer inventaire',
                            tooltip: 'Creer un inventaire a partir du resultat de la recherche courante',
                            iconCls: 'addicon',
                            scope: this,
                            handler: this.onCreateInventaireClick
                        },
                        '-',
                        {
                            text: 'Effacer tous les filtres',
                            tooltip: 'Vider tous les filtres et revenir a la 1ere page',
                            icon: 'resources/images/icons/fam/delete.png',
                            style: 'background-color:#add8e6; border-color:#add8e6;',
                            scope: this,
                            handler: function () {
                                Me_Workflow.fmField('rechecher').setValue('');
                                Me_Workflow.fmField('str_TYPE_TRANSACTION').clearValue();
                                Me_Workflow.fmField('lg_DCI_PRINCIPAL_ID').clearValue();
                                Me_Workflow.fmField('lg_ZONE_GEO_ID').clearValue();
                                Me_Workflow.fmField('stock_operator').clearValue();
                                Me_Workflow.fmField('stock_value').setValue('');
                                Me_Workflow.onRechClick();
                            }
                        },
                        '-',
                        {
                            text: 'Imprimer',
                            tooltip: 'imprimer',
                            iconCls: 'printable',
                            scope: this,
                            handler: this.onPdfClick
                        }
                    ]
                },
                {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            xtype: 'combobox',
                            name: 'str_TYPE_TRANSACTION',
                            id: 'str_TYPE_TRANSACTION',
                            store: store_type,
                            valueField: 'str_TYPE_TRANSACTION',
                            displayField: 'str_desc',
                            typeAhead: true,
                            queryMode: 'local',
                            width: 220,
                            emptyText: 'Filtre article...',
                            listeners: {
                                select: function () {
                                    Me_Workflow.onRechClick();
                                }
                            }
                        },
                        '-',
                        {
                            xtype: 'combobox',
                            name: 'lg_DCI_PRINCIPAL_ID',
                            id: 'lg_DCI_PRINCIPAL_ID',
                            store: store_dci,
                            valueField: 'lg_DCI_ID',
                            pageSize: 20,
                            displayField: 'str_NAME',
                            typeAhead: true,
                            width: 350,
                            minChars: 2,
                            queryMode: 'remote',
                            emptyText: 'Selectionner un DCI...',
                            listeners: {
                                select: function () {
                                    Me_Workflow.onRechClick();
                                }
                            }
                        },
                        '-',
                        {
                            xtype: 'textfield',
                            id: 'rechecher',
                            name: 'user',
                            width: 230,
                            fieldStyle: 'background-color: orange; background-image: none;color:blue;font-weight:bold;font-size:1.3em',
                            emptyText: 'Recherche',
                            listeners: {
                                render: function (cmp) {
                                    cmp.getEl().on('keypress', function (e) {
                                        if (e.getKey() === e.ENTER) {
                                            Me_Workflow.onRechClick();
                                        }
                                    });
                                }
                            }
                        },
                        {
                            text: '',
                            tooltip: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon',
                            handler: this.onRechClick
                        },
                        '-',
                        {
                            xtype: 'combobox',
                            name: 'lg_ZONE_GEO_ID',
                            id: 'lg_ZONE_GEO_ID',
                            store: rayons,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: false,
                            queryMode: 'remote',
                            minChars: 0,
                            pageSize: 9999,
                            width: 260,
                            emptyText: 'Sélectionner un rayon...',
                            forceSelection: true,
                            listeners: {
                                select: function () {
                                    Me_Workflow.onRechClick();
                                }
                            }
                        },
                        {
                            text: 'Effacer rayon',
                            tooltip: 'Effacer le filtre rayon',
                            iconCls: 'cancelicon',
                            scope: this,
                            handler: function () {
                                Me_Workflow.fmField('lg_ZONE_GEO_ID').clearValue();
                                Me_Workflow.onRechClick();
                            }
                        }
                    ]
                }
            ],
            bbar: {
                xtype: 'pagingtoolbar',
                pageSize: itemsPerPage,
                store: store,
                displayInfo: true,
                plugins: new Ext.ux.ProgressBarPager(),
                listeners: {
                    beforechange: function (page, currentPage) {
                        const myProxy = this.store.getProxy();

                        const lg_DCI_PRINCIPAL_ID = Me_Workflow.fmField('lg_DCI_PRINCIPAL_ID').getValue();
                        const str_TYPE_TRANSACTION = Me_Workflow.fmField('str_TYPE_TRANSACTION').getValue();
                        const search_value = Me_Workflow.fmField('rechecher').getValue();
                        const lg_ZONE_GEO_ID = Me_Workflow.fmField('lg_ZONE_GEO_ID').getValue();
                        const stock_operator = Me_Workflow.fmField('stock_operator').getValue();
                        const stock_value = Me_Workflow.fmField('stock_value').getValue();

                        myProxy.setExtraParam('str_TYPE_TRANSACTION', str_TYPE_TRANSACTION || '');
                        myProxy.setExtraParam('lg_DCI_ID', lg_DCI_PRINCIPAL_ID || '');
                        myProxy.setExtraParam('search_value', search_value || '');
                        myProxy.setExtraParam('lg_ZONE_GEO_ID', lg_ZONE_GEO_ID || '');
                        myProxy.setExtraParam('stock_operator', stock_operator || '');
                        myProxy.setExtraParam('stock_value', stock_value || '');
                    }

                }
            },
            listeners: {
                afterrender: function () { // a decommenter apres les tests
                    Me_Workflow.fmField('rechecher').focus();
                    if (lg_EMPLACEMENT_ID == "1") {
                        Ext.getCmp('btn_add').show();
                        Ext.getCmp('btn_import').show();
                        Ext.getCmp('btn_checkimport').show();
                    }
                }
            }
        });
        /*
        this.callParent();
           
        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });*/
        
        this.callParent(arguments);

        this.on('afterrender', function (grid) {
            Ext.defer(function () {
                grid.loadStore();
            }, 300);
        }, this);

    },
    loadStore: function () {
        const grid = this;
        const store = grid.getStore();
        const proxy = store.getProxy();

        proxy.setExtraParam('search_value', '');
        proxy.setExtraParam('str_TYPE_TRANSACTION', '');
        proxy.setExtraParam('lg_DCI_ID', '');
        proxy.setExtraParam('lg_ZONE_GEO_ID', '');
        proxy.setExtraParam('stock_operator', '');
        proxy.setExtraParam('stock_value', '');

        store.loadPage(1, {
            params: {
                search_value: '',
                str_TYPE_TRANSACTION: '',
                lg_DCI_ID: '',
                lg_ZONE_GEO_ID: '',
                stock_operator: '',
                stock_value: ''
            },
            callback: grid.onStoreLoad
        });
    },
    onStoreLoad: function () {

    },

    onMajSeuil: function () {
        new testextjs.view.configmanagement.famille.action.maj_seuil({
            parentview: this,
            titre: 'MAJ SEUIL groupée (Q1/Q2 réappro)'
        });
    },

    onRecalculerSeuils: function () {
        Ext.MessageBox.confirm('Recalcul des seuils',
                'Lancer le recalcul des seuils et quantités de réappro selon le mode actif ?<br>'
                + 'Le traitement peut prendre quelques minutes ....',
                function (btn) {
                    if (btn !== 'yes') { return; }
                    const progress = Ext.MessageBox.wait(
                            'Recalcul des seuils en cours, veuillez patienter . . .', 'Traitement');
                    Ext.Ajax.request({
                        url: '../api/v1/update/compute-reappro',
                        method: 'GET',
                        timeout: 1800000, // 30 min : traitement potentiellement long
                        success: function (resp) {
                            progress.hide();
                            const r = Ext.JSON.decode(resp.responseText, true) || {};
                            Ext.MessageBox.show({
                                title: 'Recalcul des seuils',
                                width: 460,
                                msg: (r.success === false)
                                        ? 'Le recalcul a échoué. Veuillez consulter les logs du serveur.'
                                        : 'Recalcul des seuils terminé. Les seuils et quantités de réappro ont été mis à jour.',
                                buttons: Ext.MessageBox.OK,
                                icon: (r.success === false) ? Ext.MessageBox.ERROR : Ext.MessageBox.INFO
                            });
                        },
                        failure: function (r) {
                            progress.hide();
                            Ext.MessageBox.show({
                                title: 'Erreur',
                                width: 460,
                                msg: 'Échec du recalcul. Code HTTP : ' + r.status,
                                buttons: Ext.MessageBox.OK,
                                icon: Ext.MessageBox.ERROR
                            });
                        }
                    });
                });
    },

    onAddClick: function () {
        new testextjs.view.configmanagement.famille.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter Article",
            type: "famillemanager"
        });
    },
    onbtnimport: function () {
        if (lg_EMPLACEMENT_ID == "1") {
            new testextjs.view.configmanagement.famille.action.importOrder({
                odatasource: 'TABLE_FAMILLE',
                parentview: this,
                mode: "importfile",
                titre: "Importation des differents articles de l'officine"
            });
        } else {
            new testextjs.view.stockmanagement.dodepot.action.importOrder({
                odatasource: 'TABLE_MISEAJOUR_STOCKDEPOT',
                parentview: this,
                mode: "importfile",
                titre: "Importation des differents articles vendus au d&eacute;p&ocirc;t"
            });
        }

    },
    onbtncheckimport: function () {
        new testextjs.view.configmanagement.famille.action.importOrder({
            odatasource: 'TABLE_FAMILLE',
            parentview: this,
            mode: "checkimportfile",
            titre: "Verification de l'importation des differents articles de l'officine"
        });
    },
    onbtnexportCsv: function () {
        var lg_DCI_PRINCIPAL_ID = "", str_TYPE_TRANSACTION = "";
        if (Me_Workflow.fmField('lg_DCI_PRINCIPAL_ID').getValue() != null) {
            lg_DCI_PRINCIPAL_ID = Me_Workflow.fmField('lg_DCI_PRINCIPAL_ID').getValue();
        }
        if (Me_Workflow.fmField('str_TYPE_TRANSACTION').getValue() != null) {
            str_TYPE_TRANSACTION = Me_Workflow.fmField('str_TYPE_TRANSACTION').getValue();
        }
        var liste_param = "search_value:" + Me_Workflow.fmField('rechecher').getValue() + ";str_TYPE_TRANSACTION:" + str_TYPE_TRANSACTION + ";lg_DCI_ID:" + lg_DCI_PRINCIPAL_ID;
        var extension = "csv";
        window.location = '../MigrationServlet?table_name=TABLE_FAMILLE' + "&extension=" + extension + "&liste_param=" + liste_param;
    },
    onbtnexportExcel: function () {
        var lg_DCI_PRINCIPAL_ID = "", str_TYPE_TRANSACTION = "";
        if (Me_Workflow.fmField('lg_DCI_PRINCIPAL_ID').getValue() != null) {
            lg_DCI_PRINCIPAL_ID = Me_Workflow.fmField('lg_DCI_PRINCIPAL_ID').getValue();
        }
        if (Me_Workflow.fmField('str_TYPE_TRANSACTION').getValue() != null) {
            str_TYPE_TRANSACTION = Me_Workflow.fmField('str_TYPE_TRANSACTION').getValue();
        }
        var liste_param = "search_value:" + Me_Workflow.fmField('rechecher').getValue() + ";str_TYPE_TRANSACTION:" + str_TYPE_TRANSACTION + ";lg_DCI_ID:" + lg_DCI_PRINCIPAL_ID;
        var extension = "xls";
        window.location = '../MigrationServlet?table_name=TABLE_FAMILLE' + "&extension=" + extension + "&liste_param=" + liste_param;
    },
    onPdfClick: function () {
    let lg_DCI_PRINCIPAL_ID = "",
            str_TYPE_TRANSACTION = "",
            lg_ZONE_GEO_ID = "",
            stock_operator = "",
            stock_value = "";

    if (Me_Workflow.fmField('lg_DCI_PRINCIPAL_ID').getValue() != null) {
        lg_DCI_PRINCIPAL_ID = Me_Workflow.fmField('lg_DCI_PRINCIPAL_ID').getValue();
    }

    if (Me_Workflow.fmField('str_TYPE_TRANSACTION').getValue() != null) {
        str_TYPE_TRANSACTION = Me_Workflow.fmField('str_TYPE_TRANSACTION').getValue();
    }

    if (Me_Workflow.fmField('lg_ZONE_GEO_ID').getValue() != null) {
        lg_ZONE_GEO_ID = Me_Workflow.fmField('lg_ZONE_GEO_ID').getValue();
    }

    if (Me_Workflow.fmField('stock_operator').getValue() != null) {
        stock_operator = Me_Workflow.fmField('stock_operator').getValue();
    }

    if (Me_Workflow.fmField('stock_value').getValue() != null) {
        stock_value = Me_Workflow.fmField('stock_value').getValue();
    }

    const rayonLabel = Me_Workflow.fmField('lg_ZONE_GEO_ID').getRawValue();
    const search_value = Me_Workflow.fmField('rechecher').getValue();
    const opSymbols = {LESS: '<', MORE: '>', EQUAL: '=', LESSOREQUAL: '<=', MOREOREQUAL: '>='};
    const filtreParts = [];
    if (lg_ZONE_GEO_ID && rayonLabel) {
        filtreParts.push('emplacement ' + rayonLabel);
    }
    if (stock_operator && opSymbols[stock_operator] && stock_value !== '') {
        filtreParts.push('stock ' + opSymbols[stock_operator] + ' ' + stock_value);
    }
    if (search_value) {
        filtreParts.push('recherche "' + search_value + '"');
    }
    const titre_filtre = filtreParts.join(' et ');

    const linkUrl = url_services_article_generate_pdf
            + '?str_TYPE_TRANSACTION=' + str_TYPE_TRANSACTION
            + '&lg_DCI_ID=' + lg_DCI_PRINCIPAL_ID
            + '&lg_ZONE_GEO_ID=' + lg_ZONE_GEO_ID
            + '&stock_operator=' + stock_operator
            + '&stock_value=' + stock_value
            + '&titre_filtre=' + encodeURIComponent(titre_filtre)
            + '&search_value=' + Me_Workflow.fmField('rechecher').getValue();

    window.open(linkUrl);
},

    onRemoveClick: function (grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmer la suppresssion',
                function (btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                        Ext.Ajax.request({
                            method: 'POST',
                            url: '../api/v1/produit/remove-desactive/' + rec.get('lg_FAMILLE_ID'),
                            success: function (response, options) {
                                progress.hide();
                                var result = Ext.JSON.decode(response.responseText, true);
                                if (result.success) {
                                    grid.getStore().reload();
                                } else {
                                    Ext.MessageBox.show({
                                        title: 'Message d\'erreur',
                                        width: 320,
                                        msg: "L'opération a échouée",
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
                });


    },
    onEditClick: function (grid, rowIndex) {
    const rec = grid.getStore().getAt(rowIndex);
    const self = this; // Stocker la référence de 'this' pour l'utiliser dans les callbacks

    if (rec.get('lg_EMPLACEMENT_ID') == "1") {

        Ext.Ajax.request({
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/produit-search/produits/' + rec.data.lg_FAMILLE_ID,
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                const produit = result.data;
                
                // Créer la fenêtre de modification
                new testextjs.view.configmanagement.famille.action.add({
                    odatasource: produit,
                    parentview: self, // Utiliser 'self' au lieu de 'this'
                    mode: "update",
                    type: "famillemanager",
                    titre: "Modification Article [" + rec.get('str_DESCRIPTION') + "]",
                    
                    listeners: {
                        close: function() {
                            Me_Workflow.fmField('rechecher').focus(true, 100, function() {
                            });
                        },
                        afterSave: function() {
                            Me_Workflow.fmField('rechecher').focus(true, 100);
                        }
                    }
                });
                
            },
            failure: function(response, options) {
                // En cas d'erreur, redonner quand même le focus
                Me_Workflow.fmField('rechecher').focus(true, 100);
                Ext.Msg.alert("Erreur", "Impossible de charger les données du produit");
            }
        });

    } else {

        new testextjs.view.configmanagement.famille.action.updatezonegeo({
            odatasource: rec.data,
            parentview: self,
            mode: "update",
            titre: "Modification de l'emplacement de Article [" + rec.get('str_DESCRIPTION') + "]",
            
            listeners: {
                close: function() {
                    Me_Workflow.fmField('rechecher').focus(true, 100);
                },
                
                afterSave: function() {
                    Me_Workflow.fmField('rechecher').focus(true, 100);
                }
            }
        });
        
    }
    
},
    onDetailClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        Ext.Ajax.request({
            method: 'GET',
            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/produit-search/produits/' + rec.data.lg_FAMILLE_ID,
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                const produit = result.data;

                new testextjs.view.configmanagement.famille.action.detailArticle({
                    odatasource: produit,
                    produitId: rec.get('lg_FAMILLE_ID'),
                    parentview: this,
                    mode: "update",
                    titre: "Detail sur l'article [" + rec.get('str_DESCRIPTION') + "]"
                });

            }

        });

    },
    onCreateDeconditionClick: function (grid, rowIndex) {
    const rec = grid.getStore().getAt(rowIndex);
    const self = this; // Sauvegarder la référence de 'this'

    if (rec.get('bool_DECONDITIONNE') == "1") {
        Ext.MessageBox.alert('Alerte Message', 'Ceci est un article deconditionne', function() {
            // Donner le focus après fermeture de l'alerte
            Me_Workflow.fmField('rechecher').focus(true, 100);
        });
        
    } else {
        if (rec.get('bool_DECONDITIONNE_EXIST') == "1") {
            Ext.MessageBox.alert('Alerte Message', 'La version deconditionne existe deja', function() {
                // Donner le focus après fermeture de l'alerte
                Me_Workflow.fmField('rechecher').focus(true, 100);
            });
            
        } else {
            Ext.Ajax.request({
                method: 'GET',
                headers: {'Content-Type': 'application/json'},
                url: '../api/v1/produit-search/produits/' + rec.data.lg_FAMILLE_ID,
                success: function (response, options) {
                    const result = Ext.JSON.decode(response.responseText, true);
                    const produit = result.data;
                    
                    // Créer la fenêtre
                    const deconditionWindow = new testextjs.view.configmanagement.famille.action.add({
                        odatasource: produit,
                        parentview: self, // Utiliser 'self' au lieu de 'this'
                        mode: "decondition",
                        type: 'famillemanager',
                        titre: "Creation Article [" + rec.get('str_DESCRIPTION') + "] DETAIL",
                        
                        // Ajouter des listeners pour le focus
                        listeners: {
                            close: function() {
                                Me_Workflow.fmField('rechecher').focus(true, 100);
                            },
                            
                            // Si votre composant a un événement après création
                            afterSave: function() {
                                Me_Workflow.fmField('rechecher').focus(true, 100);
                                grid.getStore().reload();
                            },
                            
                            created: function() {
                                Me_Workflow.fmField('rechecher').focus(true, 100);
                                grid.getStore().reload();
                            }
                        }
                    });
                    
                },
                failure: function(response, options) {
                    // En cas d'erreur Ajax, donner le focus
                    Ext.MessageBox.alert('Erreur', 'Erreur lors du chargement des données', function() {
                        Me_Workflow.fmField('rechecher').focus(true, 100);
                    });
                }
            });
        }
    }
}, onDeconditionClick: function (grid, rowIndex) {
    const rec = grid.getStore().getAt(rowIndex);
    const self = this; // Stocker la référence pour les callbacks

    if (rec.get('bool_DECONDITIONNE') == "1") {
        Ext.MessageBox.alert('Alerte Message', 'Ceci est un article deconditionné. Il ne peut pas etre deconditionné');
        // Donner le focus après l'alerte
        Me_Workflow.fmField('rechecher').focus(true, 100);
        
    } else {
        if (rec.get('bool_DECONDITIONNE_EXIST') == "0") {
            Ext.MessageBox.alert('Alerte Message', 'Aucun détail existant pour ce produit');
            // Donner le focus après l'alerte
            Me_Workflow.fmField('rechecher').focus(true, 100);
            
        } else {
            if (rec.get('int_NUMBER_AVAILABLE') <= 0) {
                Ext.MessageBox.alert('Alerte Message', 'Stock insuffisant');
                // Donner le focus après l'alerte
                Me_Workflow.fmField('rechecher').focus(true, 100);
                
            } else {
                // Créer la fenêtre de déconditionnement
                const deconditionWindow = new testextjs.view.configmanagement.famille.action.doDecondition({
                    odatasource: rec.data,
                    parentview: self,
                    mode: "deconditionarticle",
                    type: 'famillemanager',
                    titre: "Article [" + rec.get('str_DESCRIPTION_DECONDITION') + "]",
                    
                    // Ajouter des listeners pour gérer le focus
                    listeners: {
                        close: function() {
                            Me_Workflow.fmField('rechecher').focus(true, 100);
                        },
                        
                        // Si votre composant a un événement après déconditionnement
                        afterDecondition: function() {
                            Me_Workflow.fmField('rechecher').focus(true, 100);
                            grid.getStore().reload();
                        },
                        
                        saved: function() {
                            Me_Workflow.fmField('rechecher').focus(true, 100);
                            grid.getStore().reload();
                        }
                    }
                });
                
            }
        }
    }
},
    // Recherche SCOPED d'un champ filtre dans la grille (immunise contre les id
    // globaux dupliques des fenetres detail). Renvoie un champ neutre si absent.
    fmField: function (itemId) {
        const c = Me_Workflow ? Me_Workflow.down('#' + itemId) : null;
        return c || FM_NULL_FIELD;
    },

    onRechClick: function () {
        const val = Me_Workflow.fmField('rechecher');

        Me_Workflow.getStore().loadPage(1, {
            params: {
                search_value: val.getValue() || '',
                str_TYPE_TRANSACTION: Me_Workflow.fmField('str_TYPE_TRANSACTION').getValue() || '',
                lg_DCI_ID: Me_Workflow.fmField('lg_DCI_PRINCIPAL_ID').getValue() || '',
                lg_ZONE_GEO_ID: Me_Workflow.fmField('lg_ZONE_GEO_ID').getValue() || '',
                stock_operator: Me_Workflow.fmField('stock_operator').getValue() || '',
                stock_value: Me_Workflow.fmField('stock_value').getValue() || ''
            }
        });

        Me_Workflow.fmField('rechecher').focus(true, 100, function () {
        });
    },

    // Construit le nom de l'inventaire a partir des filtres actifs (concatenation) + HHmmss.
    buildInventaireName: function () {
        const typeLabels = {
            RESERVE: 'reserve',
            DECONDITION: 'deconditionnables',
            DECONDITIONNE: 'deconditionnes',
            SANSEMPLACEMENT: 'sansemplacement'
        };
        const typeVal = Me_Workflow.fmField('str_TYPE_TRANSACTION').getValue();
        const rayonCmp = Me_Workflow.fmField('lg_ZONE_GEO_ID');
        const parts = [];
        if (typeVal && typeVal !== 'ALL' && typeLabels[typeVal]) {
            parts.push(typeLabels[typeVal]);
        }
        if (rayonCmp.getValue() && rayonCmp.getRawValue()) {
            parts.push(rayonCmp.getRawValue());
        }
        const now = new Date();
        const pad = function (n) {
            return (n < 10 ? '0' : '') + n;
        };
        const hhmmss = pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
        return 'inventaire ' + (parts.length ? parts.join('-') : 'courant') + ' ' + hhmmss;
    },

    onCreateInventaireClick: function () {
        const me = this;
        const baseName = me.buildInventaireName();

        const dlg = Ext.create('Ext.window.Window', {
            title: 'Creer un inventaire',
            modal: true,
            width: 420,
            bodyPadding: 12,
            layout: 'anchor',
            items: [{
                    xtype: 'displayfield',
                    value: 'Sur quel stock voulez-vous creer l\'inventaire&nbsp;?'
                }],
            buttons: [
                {
                    text: 'Stock rayon',
                    handler: function () {
                        dlg.close();
                        me.doCreateInventaire('RAYON', baseName);
                    }
                },
                {
                    text: 'Stock reserve',
                    handler: function () {
                        dlg.close();
                        me.doCreateInventaire('RESERVE', baseName);
                    }
                },
                {
                    text: 'Annuler',
                    handler: function () {
                        dlg.close();
                    }
                }
            ]
        });
        dlg.show();
    },

    doCreateInventaire: function (mode, name) {
        const params = {
            search_value: Me_Workflow.fmField('rechecher').getValue() || '',
            str_TYPE_TRANSACTION: Me_Workflow.fmField('str_TYPE_TRANSACTION').getValue() || '',
            lg_DCI_ID: Me_Workflow.fmField('lg_DCI_PRINCIPAL_ID').getValue() || '',
            lg_ZONE_GEO_ID: Me_Workflow.fmField('lg_ZONE_GEO_ID').getValue() || '',
            stock_operator: Me_Workflow.fmField('stock_operator').getValue() || '',
            stock_value: Me_Workflow.fmField('stock_value').getValue() || '',
            mode: mode,
            name: name
        };
        const progress = Ext.MessageBox.wait('Veuillez patienter...', 'Creation de l\'inventaire');
        Ext.Ajax.request({
            url: '../api/v1/produit-search/create-inventaire',
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            jsonData: params,
            timeout: 600000,
            success: function (response) {
                progress.hide();
                const res = Ext.JSON.decode(response.responseText, true) || {};
                if (res.success) {
                    Ext.MessageBox.alert('Inventaire',
                            'Inventaire cree.<br/>Produits en compte : <b>' + (res.count || 0) + '</b>',
                            function () {
                                testextjs.app.getController('App')
                                        .onLoadNewComponent('inventaire', 'Liste des inventaires', 'inventaire');
                            });
                } else {
                    Ext.MessageBox.alert('Information', res.message || 'Aucun produit a inventorier.');
                }
            },
            failure: function () {
                progress.hide();
                Ext.MessageBox.alert('Erreur', 'La creation de l\'inventaire a echoue.');
            }
        });
    },

    onAddGrossisteClick: function (grid, rowIndex) {

        const rec = grid.getStore().getAt(rowIndex);

        new testextjs.view.configmanagement.famille.action.addgrossiste({
            obtntext: "Grossiste",
            odatasource: rec.data,
            nameintern: "Grossiste",
            parentview: this,
            mode: "detail",
            titre: "Gestion des grossistes du produit [" + rec.get('str_DESCRIPTION') + "]",
            type: "famillemanager"
        });

    },
    onValeurMaxClick: function ()
    {
        new testextjs.view.configmanagement.famille.action.maxVente({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Valeur maximale de vente des produits"
        });
    },

    showPeriodeForm: function (id, str_NAME) {
        var win = Ext.create("Ext.window.Window", {
            title: "Choisir une periode",

            width: 520,
            layout: {
                type: 'fit'
            },
            height: 180,
            items: [{
                    xtype: 'form',
                    id: 'periodeform',
                    type: 'fit',
                    bodyPadding: 5,
                    modelValidation: true,
                    items: [
                        {
                            xtype: 'fieldset',

                            height: 60,
                            title: 'Choisir une periode',
                            layout: 'hbox',
                            defaults: {
                                anchor: '100%',

                                labelAlign: 'left',
                                labelWidth: 20
                            },
                            items: [
                                {
                                    xtype: 'datefield',
                                    fieldLabel: 'Du',
                                    name: 'dt_debut',
                                    id: 'dt_debut',

                                    labelWidth: 20,
                                    allowBlank: false,
                                    submitFormat: 'Y-m-d',
                                    value: new Date(),
                                    maxValue: new Date(),
                                    format: 'd/m/Y',
                                    listeners: {
                                        'change': function (me) {

                                            Ext.getCmp('dt_fin').setMinValue(me.getValue());

                                        }
                                    }
                                }, {
                                    xtype: 'datefield',
                                    fieldLabel: 'Au',
                                    name: 'dt_fin',
                                    id: 'dt_fin',
                                    labelWidth: 20,
                                    style: 'margin-left:25px;',
                                    allowBlank: false,
                                    maxValue: new Date(),
                                    value: new Date(),
                                    submitFormat: 'Y-m-d',
                                    format: 'd/m/Y',
                                    listeners: {
                                        'change': function (me) {

                                            Ext.getCmp('dt_debut').setMaxValue(me.getValue());

                                        }
                                    }
                                }

                            ]}]

                }]
            ,
            dockedItems: [
                {
                    xtype: 'toolbar',
                    dock: 'bottom',
                    ui: 'footer',
                    layout: {
                        pack: 'end', //#22
                        type: 'hbox'
                    },
                    items: [
                        {
                            xtype: 'button',
                            text: 'Valider',
                            listeners: {
                                click: function () {
                                    const form = Ext.getCmp('periodeform');

                                    if (form && form.isValid()) {

                                        let dt_debut = Ext.getCmp('dt_debut').getSubmitValue();
                                        let dt_fin = Ext.getCmp('dt_fin').getSubmitValue();

                                        Me_Workflow.buildDetail(id, dt_debut, dt_fin, str_NAME);


                                        win.close();
                                    }
                                }
                            }
                        },
                        {
                            xtype: 'button',
                            text: 'Annuler',
//                   
                            listeners: {
                                click: function () {
                                    win.close();
                                }

                            }
                        }
                    ]
                }
            ]

        });
        win.show();

    },
    onbtnImporter: function (button) {
        const fenetre = button.up('window');
        const     formulaire = fenetre.down('form');
        if (!formulaire.isValid()) {
            return;
        }
        formulaire.submit({
            url: '../ImportDepot',
            waitMsg: 'Veuillez patienter le temps du telechargemetnt du fichier...',
            timeout: 2400000,
            success: function (formulaire, action) {

                if (action.result.statut === 1) {
                    const grid = Me_Workflow;
                    Ext.MessageBox.alert('Confirmation', action.result.success);
                    grid.getStore().reload();
                } else {
                    Ext.MessageBox.alert('Erreur', action.result.success);
                }


                button.up('window').close();
            },
            failure: function (formulaire, action) {
                Ext.MessageBox.alert('Erreur', 'Erreur  ' + action.result.errors);
            }
        });

    },
    
    onDesableClick: function (grid, rowIndex) {

        var rec = grid.getStore().getAt(rowIndex);

        Ext.MessageBox.confirm('Message',
                "Desactiver ce produit?" + "<br>Stock actuel: " + rec.get('int_NUMBER_AVAILABLE'),
                function (btn) {
                    if (btn === 'yes') {
                        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                        Ext.Ajax.request({
                            method: 'POST',
                            url: '../api/v1/produit/disable-produit/' + rec.get('lg_FAMILLE_ID'),
                            success: function (response, options) {
                                progress.hide();
                                var result = Ext.JSON.decode(response.responseText, true);
                                if (result.success) {
                                    grid.getStore().reload();
                                    Me_Workflow.fmField('rechecher').focus(true, 100, function () {
//                                                      Me_Workflow.fmField('rechecher').selectText(0, 1);
                                    });
                                } else {
                                    Ext.MessageBox.show({
                                        title: 'Message d\'erreur',
                                        width: 320,
                                        msg: "L'opération a échouée",
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
                });


    },

    onViewPerimesClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        const cip = rec.get('int_CIP');
        const designation = rec.get('str_DESCRIPTION') || rec.get('str_NAME') || '';

        if (!cip) {
            Ext.MessageBox.alert('Alerte Message', 'Code CIP introuvable pour ce produit.');
            return;
        }

        const perimeStore = new Ext.data.Store({
            fields: [
                {name: 'lgLOTID', type: 'string'},
                {name: 'datePerement', type: 'string'},
                {name: 'quantiteLot', type: 'int'},
                {name: 'numLot', type: 'string'},
                {name: 'statut', type: 'string'},
                {name: 'codeCip', type: 'string'}
            ],
            data: []
        });

        const printPerimeData = function () {
            const rows = [];

            perimeStore.each(function (record) {
                rows.push(
                        '<tr>' +
                        '<td>' + Ext.String.htmlEncode(record.get('datePerement') || '') + '</td>' +
                        '<td style="text-align:center;">' + Ext.String.htmlEncode(String(record.get('quantiteLot') || 0)) + '</td>' +
                        '<td>' + Ext.String.htmlEncode(record.get('numLot') || '') + '</td>' +
                        '<td>' + Ext.String.htmlEncode(record.get('statut') || '') + '</td>' +
                        '</tr>'
                        );
            });

            const html = '<!DOCTYPE html>' +
                    '<html>' +
                    '<head>' +
                    '<meta charset="UTF-8">' +
                    '<title>Lots / péremptions - ' + Ext.String.htmlEncode(String(cip)) + '</title>' +
                    '<style>' +
                    'body{font-family:Arial,Helvetica,sans-serif;font-size:12px;margin:20px;}' +
                    'h2{font-size:16px;margin:0 0 12px 0;}' +
                    'table{width:100%;border-collapse:collapse;}' +
                    'th,td{border:1px solid #000;padding:6px;}' +
                    'th{background:#f0f0f0;text-align:left;}' +
                    '</style>' +
                    '</head>' +
                    '<body>' +
                    '<h2>' + Ext.String.htmlEncode(String(cip)) + ' - ' + Ext.String.htmlEncode(designation) + '</h2>' +
                    '<table>' +
                    '<thead>' +
                    '<tr>' +
                    '<th>Date péremption</th>' +
                    '<th>Quantité</th>' +
                    '<th>N° Lot</th>' +
                    '<th>Statut</th>' +
                    '</tr>' +
                    '</thead>' +
                    '<tbody>' +
                    (rows.length > 0 ? rows.join('') : '<tr><td colspan="4">Aucune donnée à imprimer</td></tr>') +
                    '</tbody>' +
                    '</table>' +
                    '</body>' +
                    '</html>';

            const printWindow = window.open('', '_blank');
            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        };

        // Chargement (et rechargement) des lots / peremptions du produit.
        const loadPerimes = function (showWin) {
            const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Chargement des lots');
            Ext.Ajax.request({
                method: 'GET',
                url: '../api/v1/fichearticle/perimes',
                params: {
                    nbreMois: 24,
                    query: cip,
                    page: 1,
                    start: 0,
                    limit: 200
                },
                success: function (response) {
                    progress.hide();
                    const result = Ext.JSON.decode(response.responseText, true);
                    const data = result && result.data ? result.data : [];
                    const filteredData = Ext.Array.filter(data, function (item) {
                        return String(item.codeCip) === String(cip);
                    });
                    perimeStore.loadData(filteredData);
                    if (showWin) {
                        win.show();
                    }
                },
                failure: function (response) {
                    progress.hide();
                    Ext.MessageBox.alert('Erreur', response.responseText || 'Impossible de charger les lots du produit.');
                }
            });
        };

        // Modification du numero de lot et/ou de la date de peremption d'une ligne.
        // Reutilise le service de mise a jour du menu "Liste des lots".
        const openEditLot = function (record) {
            const lotId = record.get('lgLOTID');
            if (!lotId) {
                Ext.MessageBox.alert('Alerte Message', 'Identifiant du lot introuvable, modification impossible.');
                return;
            }
            const editWin = Ext.create('Ext.window.Window', {
                title: 'Modifier le lot',
                modal: true,
                width: 400,
                layout: 'fit',
                items: [{
                        xtype: 'form',
                        id: 'editLotForm',
                        bodyPadding: 10,
                        modelValidation: true,
                        items: [{
                                xtype: 'fieldset',
                                bodyPadding: 10,
                                title: cip + ' - ' + designation,
                                layout: 'anchor',
                                defaults: {
                                    anchor: '100%',
                                    labelAlign: 'top'
                                },
                                items: [{
                                        xtype: 'textfield',
                                        fieldLabel: 'Numéro de lot',
                                        name: 'int_NUM_LOT',
                                        allowBlank: false,
                                        value: record.get('numLot')
                                    }, {
                                        xtype: 'datefield',
                                        fieldLabel: 'Date de péremption',
                                        name: 'str_PEREMPTION',
                                        allowBlank: false,
                                        format: 'd/m/Y',
                                        submitFormat: 'Y-m-d',
                                        value: record.get('datePerement')
                                    }]
                            }]
                    }],
                dockedItems: [{
                        xtype: 'toolbar',
                        dock: 'bottom',
                        ui: 'footer',
                        layout: {
                            pack: 'end',
                            type: 'hbox'
                        },
                        items: [{
                                xtype: 'button',
                                text: 'Enregistrer',
                                handler: function () {
                                    const form = Ext.getCmp('editLotForm');
                                    if (form && form.isValid()) {
                                        const vals = form.getValues();
                                        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                                        Ext.Ajax.request({
                                            method: 'POST',
                                            url: '../webservices/commandemanagement/lots/ws_transaction.jsp?mode=update&lg_LOT_ID=' + encodeURIComponent(lotId),
                                            params: {
                                                int_NUM_LOT: vals.int_NUM_LOT,
                                                str_PEREMPTION: vals.str_PEREMPTION
                                            },
                                            success: function (response) {
                                                progress.hide();
                                                const res = Ext.JSON.decode(response.responseText, true);
                                                if (res && res.success === 1) {
                                                    editWin.close();
                                                    loadPerimes(false);
                                                    Ext.MessageBox.alert('Confirmation', 'La modification du lot est effectuée avec succès.');
                                                } else {
                                                    Ext.MessageBox.alert('Échec', 'La modification du lot a échoué.');
                                                }
                                            },
                                            failure: function () {
                                                progress.hide();
                                                Ext.MessageBox.alert('Échec', 'La modification du lot a échoué.');
                                            }
                                        });
                                    }
                                }
                            }, {
                                xtype: 'button',
                                text: 'Annuler',
                                handler: function () {
                                    editWin.close();
                                }
                            }]
                    }]
            });
            editWin.show();
        };

        const win = Ext.create('Ext.window.Window', {
            title: cip + ' - ' + designation,
            modal: true,
            width: 850,
            height: 360,
            layout: 'fit',
            items: [{
                    xtype: 'grid',
                    store: perimeStore,
                    columns: [
                        {
                            text: 'Date péremption',
                            dataIndex: 'datePerement',
                            flex: 1
                        },
                        {
                            text: 'Quantité',
                            dataIndex: 'quantiteLot',
                            align: 'center',
                            flex: 0.7
                        },
                        {
                            text: 'N° Lot',
                            dataIndex: 'numLot',
                            flex: 1
                        },
                        {
                            text: 'Statut',
                            dataIndex: 'statut',
                            flex: 2
                        },
                        {
                            xtype: 'actioncolumn',
                            text: 'Modifier',
                            width: 70,
                            align: 'center',
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/page_white_edit.png',
                                    tooltip: 'Modifier le lot / la date de péremption',
                                    handler: function (grid, rowIndex) {
                                        openEditLot(grid.getStore().getAt(rowIndex));
                                    }
                                }]
                        }
                    ],
                    viewConfig: {
                        emptyText: 'Aucun lot trouvé pour ce produit',
                        deferEmptyText: false
                    }
                }],
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'bottom',
                    ui: 'footer',
                    layout: {
                        pack: 'end',
                        type: 'hbox'
                    },
                    items: [{
                            text: 'Imprimer',
                            iconCls: 'printable',
                            handler: printPerimeData
                        }, {
                            text: 'Fermer',
                            handler: function () {
                                win.close();
                            }
                        }]
                }],
            listeners: {
                close: function () {
                    Me_Workflow.fmField('rechecher').focus(true, 100);
                }
            }
        });

        loadPerimes(true);
    },

addPeremptiondate: function (grid, rowIndex) {
    const rec = grid.getStore().getAt(rowIndex);

    const win = Ext.create("Ext.window.Window", {
        title: "[ " + rec.get('str_NAME') + " ]",
        modal: true,
        width: 420,
        layout: {
            type: 'anchor'
        },
        height: 270,
        // Ajouter listener pour le bouton X
        listeners: {
            close: function() {
                Me_Workflow.fmField('rechecher').focus(true, 100);
            },
            destroy: function() {
                Me_Workflow.fmField('rechecher').focus(true, 100);
            }
            
        },
        items: [{
            xtype: 'form',
            id: 'peremptionform',
            type: 'anchor',
            bodyPadding: 10,
            modelValidation: true,
            
            // Ajouter la gestion des touches Entrée sur le formulaire
            listeners: {
                afterrender: function(form) {
                    // Capturer la touche Entrée sur le formulaire
                    form.getEl().on('keydown', function(e) {
                        if (e.getKey() === e.ENTER) {
                            e.stopEvent();
                            
                            // Trouver le bouton Valider et simuler un clic
                            const validateBtn = win.down('button[text=Valider]');
                            if (validateBtn) {
                                validateBtn.fireHandler();
                            }
                        }
                    });
                }
            },
            
            items: [{
                xtype: 'fieldset',
                bodyPadding: 10,
                anchor: '100%',
                title: 'Ajouter date de péremption',
                layout: 'anchor',
                defaults: {
                    anchor: '100%',
                    labelAlign: 'top'
                },
                items: [
                    {
                        xtype: 'textfield',
                        fieldLabel: 'Numéro de lot',
                        name: 'numLot',
                        id: 'numLot',
                        autofocus: true,
                        allowBlank: false,
                        // Navigation avec Entrée vers datePeremption
                        listeners: {
                            afterrender: function(field) {
                                field.getEl().on('keydown', function(e) {
                                    if (e.getKey() === e.ENTER) {
                                        e.stopEvent();
                                        Ext.getCmp('dt_peremption').focus();
                                    }
                                });
                            }
                        }
                    },
                    {
                        xtype: 'datefield',
                        fieldLabel: 'Date de péremption',
                        name: 'datePeremption',
                        id: 'dt_peremption',
                        allowBlank: false,
                        submitFormat: 'Y-m-d',
                        format: 'd/m/Y',
                        // Navigation avec Entrée vers quantity
                        listeners: {
                            afterrender: function(field) {
                                field.getEl().on('keydown', function(e) {
                                    if (e.getKey() === e.ENTER) {
                                        e.stopEvent();
                                        Ext.getCmp('quantity').focus();
                                    }
                                });
                            }
                        }
                    },
                    {
                        xtype: 'numberfield',
                        fieldLabel: 'Quantité',
                        name: 'quantity',
                        id: 'quantity',
                        // Navigation avec Entrée pour valider
                        listeners: {
                            afterrender: function(field) {
                                field.getEl().on('keydown', function(e) {
                                    if (e.getKey() === e.ENTER) {
                                        e.stopEvent();
                                        // Trouver et déclencher le bouton Valider
                                        const validateBtn = win.down('button[text=Valider]');
                                        if (validateBtn) {
                                            validateBtn.fireHandler();
                                        }
                                    }
                                });
                            }
                        }
                    },
                    {
                        xtype: 'hiddenfield',
                        name: 'produitId',
                        allowBlank: false,
                        value: rec.get('lg_FAMILLE_ID')
                    }
                ]
            }]
        }],
        dockedItems: [{
            xtype: 'toolbar',
            dock: 'bottom',
            ui: 'footer',
            layout: {
                pack: 'end',
                type: 'hbox'
            },
            items: [{
                xtype: 'button',
                text: 'Valider',
                // Donner un id pour faciliter l'accès
                itemId: 'validateBtn',
                listeners: {
                    click: function () {
                        const form = Ext.getCmp('peremptionform');
                        const formValues = form.getValues();
                        if (form && form.isValid()) {
                            const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
                            const value = Number(formValues.quantity);
                            const qty = Number.isNaN(value) ? 1 : value;
                            const datas = {
                                "produitId": formValues.produitId,
                                "numLot": formValues.numLot,
                                "datePeremption": formValues.datePeremption,
                                "quantity": qty > 0 ? qty : 1
                            };

                            Ext.Ajax.request({
                                headers: {'Content-Type': 'application/json'},
                                method: 'POST',
                                url: '../api/v1/fichearticle/add-lot',
                                params: Ext.JSON.encode(datas),
                                success: function (response) {
                                    progress.hide();
                                    win.close();
                                    grid.getStore().reload();
                                    Me_Workflow.fmField('rechecher').focus(true, 100);
                                },
                                failure: function (response) {
                                    progress.hide();
                                    Ext.MessageBox.alert('Error Message', response.responseText);
                                    // Donner le focus au champ recherche même en cas d'erreur
                                    Me_Workflow.fmField('rechecher').focus(true, 100);
                                }
                            });
                        }
                    }
                }
            }, {
                xtype: 'button',
                text: 'Annuler',
                listeners: {
                    click: function () {
                        win.close();
                        // Le focus sera géré par le listener 'close' de la fenêtre
                    }
                }
            }]
        }]
    });
    
    win.show();
    // Focus initial sur le champ numLot
    Ext.getCmp('numLot').focus(true, 100);
},
    buildDetail: function (id, dtStart, dtEnd, libelle) {
        var me = this;
        var storeProduits = new Ext.data.Store({
            fields:
                    [
                        {
                            name: 'dateOp',
                            type: 'string'
                        },
                        {
                            name: 'produitId',
                            type: 'string'
                        },
                        {
                            name: 'cip',
                            type: 'string'
                        },
                        {
                            name: 'produitName',
                            type: 'string'
                        }, {
                            name: 'qtyVente',
                            type: 'number'
                        }, {
                            name: 'stockInit',
                            type: 'number'
                        }, {
                            name: 'stockFinal',
                            type: 'number'
                        }
                        , {
                            name: 'qtyAjust',
                            type: 'number'
                        }, {
                            name: 'qtyAnnulation',
                            type: 'number'
                        }
                        , {
                            name: 'qtyRetour',
                            type: 'number'
                        }, {
                            name: 'qtyRetourDepot',
                            type: 'number'
                        }, {
                            name: 'qtyInv',
                            type: 'number'
                        }, {
                            name: 'qtyPerime',
                            type: 'number'
                        }, {
                            name: 'qtyAjustSortie',
                            type: 'number'
                        }, {
                            name: 'qtyDeconEntrant',
                            type: 'number'
                        }, {
                            name: 'qtyDecondSortant',
                            type: 'number'
                        }, {
                            name: 'qtyEntree',
                            type: 'number'
                        },
                        {
                            name: 'ecartInventaire',
                            type: 'number'
                        }
                    ],
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/produit/monitoringproduct',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total',
                    metaProperty: 'metaData'
                }
            }
        });
        storeProduits.addListener('metachange', function (store, rec) {
//            console.log(form.query('#imprimer'));
            form.query('#qtyEntree')[0].setValue(rec.qtyEntree);
            form.query('#qtyDecondSortant')[0].setValue(rec.qtyDecondSortant);
            form.query('#qtyDeconEntrant')[0].setValue(rec.qtyDeconEntrant);
            form.query('#qtyAjustSortie')[0].setValue(rec.qtyAjustSortie);
            form.query('#qtyVente')[0].setValue(rec.qtyVente);
            form.query('#qtyAjust')[0].setValue(rec.qtyAjust);
            form.query('#qtyAnnulation')[0].setValue(rec.qtyAnnulation);
            form.query('#qtyRetour')[0].setValue(rec.qtyRetour);
            form.query('#qtyRetourDepot')[0].setValue(rec.qtyRetourDepot);
            form.query('#qtyInv')[0].setValue(rec.qtyInv);
            form.query('#qtyPerime')[0].setValue(rec.qtyPerime);

        }, this);
        storeProduits.load({
            params: {
                produitId: id,
                dtStart: dtStart,
                dtEnd: dtEnd
            }
        });
        var form = Ext.create('Ext.window.Window',
                {
                    xtype: 'mvtdetail',
                    alias: 'widget.mvtdetail',
                    autoShow: true,
                    height: 530,
                    width: '80%',
                    modal: true,
                    title: "Détail de l'article [ " + libelle + " ]",
                    closeAction: 'hide',

                    closable: true,
                    maximizable: false,
                    layout: {
                        type: 'fit'

                    },
                    dockedItems: [
                        {
                            xtype: 'toolbar',
                            dock: 'top',
                            items: [
                                {
                                    text: 'imprimer',
                                    itemId: 'imprimer',
                                    iconCls: 'printable',
                                    tooltip: 'imprimer',
                                    scope: this,
                                    handler: function () {

                                        var linkUrl = '../BalancePdfServlet?mode=SUIVIMVT&dtStart=' + dtStart + '&dtEnd=' + dtEnd + "&produitId=" + id;
                                        window.open(linkUrl);
                                    }
                                }
                            ]
                        },
                        {
                            xtype: 'toolbar',
                            dock: 'bottom',
                            items: [
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Vente',
                                    labelWidth: 50,
                                    itemId: 'qtyVente',
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;font-weight:600;",
                                    value: 0

                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Retour Fournisseur',
                                    labelWidth: 120,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;font-weight:600;",
                                    itemId: 'qtyRetour',
                                    value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Périmée',
                                    labelWidth: 55,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;font-weight:600;",
                                    itemId: 'qtyPerime',
                                    value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Entrée en stock',
                                    labelWidth: 100,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;font-weight:600;",
                                    itemId: 'qtyEntree',
                                    value: 0

                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Ajust (+)',
                                    labelWidth: 80,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;font-weight:600;",
                                    itemId: 'qtyAjust',
                                    value: 0

                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Ajust (-)',
                                    labelWidth: 80,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;font-weight:600;",
                                    itemId: 'qtyAjustSortie',
                                    value: 0

                                }
                            ]
                        },

                        {
                            xtype: "toolbar",
                            dock: 'bottom',
                            items: [
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Décond. Detail',
                                    labelWidth: 100,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;font-weight:600;",
                                    itemId: 'qtyDeconEntrant',
                                    value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Décond Boite CH',
                                    labelWidth: 120,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;font-weight:600;",
                                    itemId: 'qtyDecondSortant',
                                    value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Retour Dépôt',
                                    labelWidth: 100,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;font-weight:600;",
                                    itemId: 'qtyRetourDepot'
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Inventaire',
                                    labelWidth: 100,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;font-weight:600;",
                                    itemId: 'qtyInv',
                                    value: 0
                                },
                                {
                                    xtype: 'displayfield',
                                    flex: 1,
                                    fieldLabel: 'Annulation',
                                    labelWidth: 100,
                                    renderer: function (v) {
                                        return Ext.util.Format.number(v, '0,000.');
                                    },
                                    fieldStyle: "color:blue;font-weight:600;",
                                    itemId: 'qtyAnnulation', value: 0
                                }

                            ]
                        }
                    ],
                    items: [
                        {
                            xtype: 'gridpanel',
                            store: storeProduits,
                            viewConfig: {
                                forceFit: true,
                                columnLines: true,
                                enableColumnHide: false

                            },
                            columns: [

                                {
                                    header: 'Date',
                                    sortable: false,
                                    menuDisabled: true,
                                    dataIndex: 'dateOp',
                                    width: 90
                                }, {
                                    text: 'Stock Debut',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'stockInit',
                                    width: 95,
                                    align: 'right',
                                    format: '0,000.'
                                },
                                {
                                    text: 'Sortie',
                                    columns:
                                            [
                                                {
                                                    text: 'Vente',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'qtyVente',
                                                    width: 55,
                                                    align: 'right',
                                                    format: '0,000.'
                                                },
                                                {
                                                    text: 'Retour',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'qtyRetour',
                                                    width: 60,
                                                    align: 'right',
                                                    format: '0,000.'
                                                },
                                                {
                                                    text: 'Périmé',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'qtyPerime',
                                                    width: 60,
                                                    align: 'right',
                                                    format: '0,000.'
                                                },
                                                {
                                                    text: 'Ajust(-)',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'qtyAjustSortie',
                                                    width: 60,
                                                    align: 'right',
                                                    format: '0,000.'
                                                },
                                                {
                                                    text: 'Décon(-)',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'qtyDecondSortant',
                                                    width: 70,
                                                    align: 'right',
                                                    format: '0,000.'
                                                }
                                            ]
                                },
                                {
                                    text: 'Entrée',
                                    columns:
                                            [
                                                {
                                                    text: 'Entrée',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'qtyEntree',
                                                    width: 60,
                                                    align: 'right',
                                                    format: '0,000.'
                                                },
                                                {
                                                    text: 'Ajust(+)',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'qtyAjust',
                                                    width: 60,
                                                    align: 'right',
                                                    format: '0,000.'
                                                },
                                                {
                                                    text: 'Décon(+)',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'qtyDeconEntrant',
                                                    width: 70,
                                                    align: 'right',
                                                    format: '0,000.'
                                                },
                                                {
                                                    text: 'Annulation',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'qtyAnnulation',
                                                    width: 80,
                                                    align: 'right',
                                                    format: '0,000.'
                                                },
                                                {
                                                    text: 'Retour Depot',
                                                    xtype: 'numbercolumn',
                                                    dataIndex: 'qtyRetourDepot',
                                                    width: 100,
                                                    align: 'right',
                                                    format: '0,000.'
                                                }
                                            ]
                                }
                                ,
                                {
                                    text: 'INV',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'qtyInv',
                                    width: 50,
                                    align: 'right',
                                    format: '0,000.'
                                },
                                {
                                    text: 'Ecart INV',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'ecartInventaire',
                                    width: 80,
                                    align: 'right',
                                    format: '0,000.'
                                },
                                {
                                    text: 'Stock Final',
                                    xtype: 'numbercolumn',
                                    dataIndex: 'stockFinal',
                                    width: 90,
                                    align: 'right',
                                    format: '0,000.'
                                }

                            ],

                            bbar: {
                                xtype: 'pagingtoolbar',
                                store: storeProduits,
                                dock: 'bottom',
                                displayInfo: true,
                                beforechange: function (page, currentPage) {
                                    const myProxy = storeProduits.getProxy();
                                    myProxy.params = {
                                        produitId: null,
                                        dtStart: null,
                                        dtEnd: null
                                    };
                                    myProxy.setExtraParam('produitId', rec.get('produitId'));
                                    myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
                                    myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());

                                }
                            }
                        }
                    ]
                });

    }

  
});

function loadEmplacement() {
    return localStorage.getItem("lg_EMPLACEMENT_ID");
}