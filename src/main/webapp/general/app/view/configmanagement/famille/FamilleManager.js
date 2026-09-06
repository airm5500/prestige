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
// Teinte de ligne selon l'etat du stock rayon : un fond vert tres clair a zero,
// rose tres clair en negatif. Remplace le gras applique a chaque cellule, qui
// rendait la grille uniformement lourde et masquait la hierarchie.
function teinteSelonStock(stock, meta) {
    var n = parseInt(stock, 10);
    if (isNaN(n)) { n = 0; }
    if (n === 0) {
        meta.style = 'background-color:#e9f8ec;';
    } else if (n < 0) {
        meta.style = 'background-color:#fdeceb;';
    }
}

function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}


// ---------------------------------------------------------------------------
// Catalogue des actions de ligne de la fiche article.
//
// L'ordre d'affichage et le nombre d'actions presentees en icone viennent du
// parametrage de l'officine (t_parameters). Les suivantes sont regroupees dans
// le menu « ... » en fin de ligne ; si toutes sont en icone, ce menu disparait.
// Les conditions d'affichage sont celles des colonnes d'origine, a l'identique.
// ---------------------------------------------------------------------------
var FA_ICONE_MENU = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjNGE1YjY2Ij48Y2lyY2xlIGN4PSI1IiBjeT0iMTIiIHI9IjIiLz48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIyIi8+PGNpcmNsZSBjeD0iMTkiIGN5PSIxMiIgcj0iMiIvPjwvc3ZnPg==';

var FA_ACTIONS = {
    PRIX: {
        texte: 'Prix de référence',
        icon: 'resources/images/duplicate_3671686.png',
        classe: 'fa-action-prix',
        lancer: function (grid, rowIndex) {
            new testextjs.view.produits.PrixReference({produit: grid.getStore().getAt(rowIndex)});
        }
    },
    CREER_DETAIL: {
        texte: 'Créer le détail',
        icon: 'resources/images/icons/fam/connect.png',
        classe: 'fa-action-detail',
        visible: function (rec) {
            return rec.get('bool_DECONDITIONNE_EXIST') == "0" && rec.get('lg_EMPLACEMENT_ID') == "1";
        },
        lancer: function (grid, rowIndex) {
            Me_Workflow.onCreateDeconditionClick(grid, rowIndex);
        }
    },
    SUIVI: {
        texte: 'Suivi de cet article',
        icon: 'build/KitchenSink/ext-theme-neptune/resources/images/dd/suivmt.png',
        classe: 'fa-action-suivi',
        lancer: function (grid, rowIndex) {
            var rec = grid.getStore().getAt(rowIndex);
            Me_Workflow.showPeriodeForm(rec.get('lg_FAMILLE_ID'), rec.get('str_NAME'));
        }
    },
    MODIFIER: {
        texte: 'Modifier',
        icon: 'resources/images/icons/fam/page_white_edit.png',
        classe: 'fa-action-edit',
        visible: function (rec) {
            return !!rec.get('P_BT_UPDATE');
        },
        lancer: function (grid, rowIndex) {
            Me_Workflow.onEditClick(grid, rowIndex);
        }
    },
    DETAIL: {
        texte: 'Détail sur l\'article',
        icon: 'resources/images/icons/fam/application_view_list.png',
        classe: 'fa-action-plus',
        lancer: function (grid, rowIndex) {
            Me_Workflow.onDetailClick(grid, rowIndex);
        }
    },
    LOTS: {
        texte: 'Voir les lots / péremptions',
        icon: 'resources/images/icons/fam/recherche.png',
        classe: 'fa-action-plus',
        lancer: function (grid, rowIndex) {
            Me_Workflow.onViewPerimesClick(grid, rowIndex);
        }
    },
    DATE_PEREMPTION: {
        texte: 'Modifier la date de péremption',
        icon: 'resources/images/icons/fam/calendar.png',
        classe: 'fa-action-plus',
        lancer: function (grid, rowIndex) {
            Me_Workflow.addPeremptiondate(grid, rowIndex);
        }
    },
    DECONDITIONNER: {
        texte: 'Déconditionner l\'article',
        icon: 'resources/images/icons/fam/cut.png',
        classe: 'fa-action-plus',
        visible: function (rec) {
            return rec.get('bool_DECONDITIONNE') == "0";
        },
        lancer: function (grid, rowIndex) {
            Me_Workflow.onDeconditionClick(grid, rowIndex);
        }
    },
    GROSSISTE: {
        texte: 'Gérer grossiste',
        icon: 'resources/images/icons/fam/grossiste.png',
        classe: 'fa-action-plus',
        visible: function (rec) {
            return rec.get('bool_DECONDITIONNE') == "0" && rec.get('lg_EMPLACEMENT_ID') == "1";
        },
        lancer: function (grid, rowIndex) {
            Me_Workflow.onAddGrossisteClick(grid, rowIndex);
        }
    },
    DESACTIVER: {
        texte: 'Désactiver l\'article',
        icon: 'resources/images/icons/fam/disable.png',
        classe: 'fa-action-plus',
        danger: true,
        visible: function (rec) {
            return rec.get('lg_EMPLACEMENT_ID') === "1" && rec.get('ACTION_DESACTIVE_PRODUIT');
        },
        lancer: function (grid, rowIndex) {
            Me_Workflow.onDesableClick(grid, rowIndex);
        }
    }
};
var FA_ORDRE_DEFAUT = ['PRIX', 'CREER_DETAIL', 'SUIVI', 'MODIFIER', 'DETAIL', 'LOTS',
    'DATE_PEREMPTION', 'DECONDITIONNER', 'GROSSISTE', 'DESACTIVER'];
var FA_NB_ICONES_DEFAUT = 4;

Ext.define('testextjs.view.configmanagement.famille.FamilleManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'famillemanager',
    id: 'famillemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.menu.Menu',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.Famille',
        'testextjs.view.configmanagement.famille.action.add',
        'testextjs.view.configmanagement.famille.action.maj_seuil',
        'testextjs.view.configmanagement.famille.action.maj_selective',
        'testextjs.view.configmanagement.famille.action.infogenerale',
        'testextjs.view.configmanagement.famille.action.comptabilite',
        'testextjs.view.configmanagement.famille.action.autreinfos',
        'Ext.ux.ProgressBarPager',
        'Ext.grid.plugin.DragDrop',
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
                load: function () {
                    // Nouvelle liste : l'apercu de la ligne precedente n'a plus de sens.
                    var ap = Ext.getCmp('apercu_fiche_article');
                    if (ap) {
                        ap.hide();
                        ap.produitAffiche = null;
                    }
                },
                beforeload: function (store, operation) {
                    const proxy = store.getProxy();

                    const searchCmp = Me_Workflow.fmField('rechecher');
                    const typeCmp = Me_Workflow.fmField('str_TYPE_TRANSACTION');
                    const dciCmp = Me_Workflow.fmField('lg_DCI_PRINCIPAL_ID');
                    const zoneCmp = Me_Workflow.fmField('lg_ZONE_GEO_ID');
                    const stockOpCmp = Me_Workflow.fmField('stock_operator');
                    const stockValCmp = Me_Workflow.fmField('stock_value');
                    const tvaCmp = Me_Workflow.fmField('lg_CODE_TVA_ID_FILTRE');

                    proxy.setExtraParam('search_value', searchCmp ? (searchCmp.getValue() || '') : '');
                    proxy.setExtraParam('str_TYPE_TRANSACTION', typeCmp ? (typeCmp.getValue() || '') : '');
                    proxy.setExtraParam('lg_DCI_ID', dciCmp ? (dciCmp.getValue() || '') : '');
                    proxy.setExtraParam('lg_ZONE_GEO_ID', zoneCmp ? (zoneCmp.getValue() || '') : '');
                    proxy.setExtraParam('stock_operator', stockOpCmp ? (stockOpCmp.getValue() || '') : '');
                    proxy.setExtraParam('stock_value', stockValCmp ? (stockValCmp.getValue() || '') : '');
                    proxy.setExtraParam('lg_CODE_TVA_ID', tvaCmp ? (tvaCmp.getValue() || '') : '');
                }
            }
        });

        const store_dci = new Ext.data.Store({
            model: 'testextjs.model.Dci',
            // C'est le pageSize du STORE qui fixe la limite envoyee au serveur (celui du
            // combo ne pilote que la barre de pagination) : liste chargee en entier, comme
            // le combo rayon.
            pageSize: 9999,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                // service REST rapide (meme format que l'ancienne JSP DCI)
                url: '../api/v1/common/dcis',
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

        const store_codetva = Ext.create('Ext.data.Store', {
            fields: ['lg_CODE_TVA_ID', 'str_NAME', 'int_VALUE'],
            autoLoad: false,
            pageSize: 9999,
            proxy: {
                type: 'ajax',
                // service REST rapide (meme format que l'ancienne JSP ws_data_codetva)
                url: '../api/v1/common/tvas',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }
        });

        Ext.apply(this, {
            width: '98%',
            height: valheight,

            store: store,
            /* vp-grille-survol : survol de ligne bien visible (vente-theme.css) */
            cls: 'my-grid-header vp-grille-survol vp-fiche-article',
            id: 'GridArticleID',
            /* Memorisation des colonnes par poste (voir app.js) : colonnes affichees ou
               masquees, largeurs et ordre sont conserves dans le navigateur. */
            stateful: true,
            stateId: 'grille-fiche-article-v2',
            columns: window.PrestigeEtatColonnes.identifier('article-v2', [
                {
                    header: 'lg_FAMILLE_ID',
                    dataIndex: 'lg_FAMILLE_ID',
                    hidden: true,
                    flex: 1
                },
                {

                    // Pastille de couleur + libelle abrege (Sugg. / Cmde / Entree) : la
                    // couleur seule, sans texte, n'indiquait pas de quoi il s'agissait.
                    // Le libelle complet reste en info-bulle.
                    header: 'État',
                    dataIndex: 'produitState',
                    renderer: function (v, m, r) {
                        const produitState = r.data.produitState;
                        const enSuggestion = produitState?.enSuggestion;
                        const enCommande = produitState?.enCommande;
                        const entree = produitState?.entree;
                        let couleur, abrege, complet;
                        if (enSuggestion && enSuggestion > 0) {
                            couleur = '#2e9e4f';
                            abrege = 'Sugg.';
                            complet = 'Suggestion de réapprovisionnement';
                        } else if (enCommande && enCommande > 0) {
                            couleur = '#1a5f9e';
                            abrege = 'Cmde';
                            complet = 'En commande';
                        } else if (entree && entree > 0) {
                            couleur = '#b25a00';
                            abrege = 'Entrée';
                            complet = 'Entrée en cours';
                        } else {
                            return '';
                        }
                        m.tdAttr = 'data-qtip="' + complet + '"';
                        return '<span style="display:inline-block;white-space:nowrap;font-size:11px;color:#2b2b2b;">'
                                + '<i style="width:9px;height:9px;border-radius:50%;background:' + couleur
                                + ';display:inline-block;vertical-align:middle;margin-right:5px;"></i>'
                                + abrege + '</span>';
                    },
                    width: 82
                },

                {
                    header: 'CIP',
                    dataIndex: 'int_CIP',
                    flex: 0.6,
                    renderer: function (v, m, r) {
                        teinteSelonStock(r.data.int_NUMBER_AVAILABLE, m);
                        return v;
                    }
                },
                {
                    header: 'Designation',
                    dataIndex: 'str_DESCRIPTION',
                    flex: 2,
                    renderer: function (v, m, r) {

                        teinteSelonStock(r.data.int_NUMBER_AVAILABLE, m);
                        return v;
                    }
                },
                {
                    header: 'P.Vente',
                    dataIndex: 'int_PRICE',
                    align: 'right',
                    flex: 0.5,
                    renderer: function (v, m, r) {

                        teinteSelonStock(r.data.int_NUMBER_AVAILABLE, m);
                        return amountformat(v);
                    }
                },

                {
                    header: 'P.Achat',
                    dataIndex: 'int_PAF',
                    align: 'right',
                    flex: 0.5,
                    renderer: function (v, m, r) {

                        teinteSelonStock(r.data.int_NUMBER_AVAILABLE, m);
                        return amountformat(v);
                    }
                },
                {
                    // Stock unifie : le total bien lisible, avec le detail rayon / reserve
                    // juste a cote. Remplace les trois colonnes Stock, RES et Stock total,
                    // qui portaient la meme information et obligeaient a survoler pour la lire.
                    // Le tri porte sur le stock rayon (seul champ trie par le serveur).
                    header: 'Stock (RAY + RES)',
                    dataIndex: 'int_NUMBER_AVAILABLE',
                    itemId: 'stockUnifie',
                    align: 'center',
                    flex: 0.95,
                    tooltip: 'Total = rayon + réserve. Le tri porte sur le stock rayon.',
                    renderer: function (v, m, r) {
                        var rayon = parseInt(r.data.int_NUMBER_AVAILABLE, 10);
                        if (isNaN(rayon)) { rayon = 0; }
                        var reserve = r.data.bool_RESERVE ? parseInt(r.data.int_STOCK_RESERVE, 10) : 0;
                        if (isNaN(reserve)) { reserve = 0; }
                        var total = rayon + reserve;
                        var couleur = '#1c7c1c';
                        if (total < 0) {
                            couleur = '#c0392b';
                            m.style = 'background-color:#fdeceb;';
                        } else if (total === 0) {
                            couleur = '#1a3fc4';
                            m.style = 'background-color:#e9f8ec;';
                        }
                        m.tdAttr = 'data-qtip="Rayon ' + rayon + ' + Réserve ' + reserve
                                + ' = ' + total + '" data-qwidth="180"';
                        var puces = '<span style="border:1px solid #d5dde2;border-radius:5px;padding:0 5px;color:#555;font-weight:800;">RAY '
                                + rayon + '</span>';
                        if (reserve !== 0) {
                            puces += ' <span style="border:1px solid #c9b6e3;border-radius:5px;padding:0 5px;color:#6600cc;font-weight:800;">RES '
                                    + reserve + '</span>';
                        }
                        return '<span style="white-space:nowrap;">'
                                + '<b style="font-size:17px;color:' + couleur + ';vertical-align:middle;">' + total + '</b>'
                                + '<span style="font-size:10px;margin-left:7px;vertical-align:middle;">' + puces + '</span></span>';
                    }
                }, {
                    header: 'Seuil',
                    dataIndex: 'int_STOCK_REAPROVISONEMENT',
                    align: 'center',
                    flex: 0.5
                    ,
                    renderer: function (v, m, r) {

                        teinteSelonStock(r.data.int_NUMBER_AVAILABLE, m);
                        return v;
                    }
                }, {
                    header: 'Qte.Reap',
                    dataIndex: 'int_QTE_REAPPROVISIONNEMENT',
                    align: 'center',
                    flex: 0.5
                    ,
                    renderer: function (v, m, r) {

                        teinteSelonStock(r.data.int_NUMBER_AVAILABLE, m);
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
                        // Une seule ligne par article : un libelle d'emplacement long etait
                        // renvoye a la ligne et cassait la hauteur reguliere des lignes.
                        teinteSelonStock(stock, m);
                        m.style = (m.style || '') + 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
                        if (v) {
                            m.tdAttr = 'data-qtip="' + Ext.String.htmlEncode(String(v)) + '"';
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
                }
            ]),
            /* Selection a la LIGNE : au clic c'est la ligne entiere qui est
               marquee, pas la seule cellule cliquee (retour d'officine). */
            selModel: {
                selType: 'rowmodel'
            },
            viewConfig: {
                listeners: {
                    // Un clic selectionne seulement ; le double-clic ouvre ou referme
                    // l'apercu, pour ne pas interroger le serveur a chaque deplacement
                    // dans la liste.
                    itemdblclick: function (view, record) {
                        Me_Workflow.basculerApercu(record.get('lg_FAMILLE_ID'));
                    }
                }
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
                            // Regroupe 'Importer' et 'Verifier l'importation' sous un seul menu,
                            // controle par le privilege P_BTN_IMPORT_ARTICLE
                            text: 'Importation',
                            tooltip: 'Importer des articles / Verifier l\'importation',
                            id: 'btn_import_menu',
                            iconCls: 'importicon',
                            menu: [
                                {
                                    text: 'Importer',
                                    tooltip: 'Importer',
                                    iconCls: 'importicon',
                                    scope: this,
                                    handler: this.onbtnimport
                                },
                                {
                                    text: 'Verifier l\'importation',
                                    tooltip: 'Verifier l\'importation',
                                    iconCls: 'check_icon',
                                    scope: this,
                                    handler: this.onbtncheckimport
                                }
                            ]
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
                            text: 'MAJ SÉLECTIVE',
                            tooltip: 'Affecter une donnée (grossiste, famille, TVA, code remise, code tableau, '
                                    + 'laboratoire ou gamme) à plusieurs produits d\'un coup',
                            id: 'btn_maj_selective',
                            iconCls: 'configuration',
                            scope: this,
                            handler: this.onMajSelective
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
                        '-',
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
                            text: 'Imprimer',
                            tooltip: 'imprimer',
                            iconCls: 'printable',
                            scope: this,
                            handler: this.onPdfClick
                        },
                        {
                            // Reserve au privilege de parametrage : affiche apres reponse du
                            // serveur (voir chargerConfigActions).
                            id: 'btn_config_actions',
                            tooltip: 'Configurer les actions affichées sur chaque ligne',
                            iconCls: 'configuration',
                            hidden: true,
                            scope: this,
                            handler: this.onConfigurerActions
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
                            // Meme pattern que le combo rayon de cet ecran : liste chargee en
                            // entier (pas de pagination). L'enregistrement selectionne reste
                            // toujours dans le store, ExtJS affiche donc le libelle et plus
                            // jamais l'id brut au reclic sur la fleche.
                            pageSize: 9999,
                            displayField: 'str_NAME',
                            // typeAhead retire : il pre-completait le champ avec le premier
                            // resultat ('beta' -> 'BETA ALANINE') et la liste se retrouvait
                            // filtree sur ce seul produit au lieu de tous les 'beta'.
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
                            enableKeyEvents: true,
                            listeners: {
                                render: function (cmp) {
                                    cmp.getEl().on('keypress', function (e) {
                                        if (e.getKey() === e.ENTER) {
                                            Me_Workflow.onRechClick();
                                        }
                                    });
                                },
                                // Recherche a la frappe : a partir de 3 caracteres, une fois la
                                // saisie posee (buffer) - une seule requete part, pas une par touche.
                                // Le seuil est a 3 car en mode « contient », un motif de 2 lettres
                                // ramene et trie des milliers d'articles pour rien : c'est ce qui
                                // rendait la frappe lourde sur les gros catalogues. Le bouton et la
                                // touche Entree restent utilisables des le premier caractere.
                                // Champ vide a nouveau : on ne recharge que si une recherche a deja
                                // ete lancee, l'ecran restant vide a l'ouverture.
                                // Recherche partie sur une pause de frappe : le texte n'est PAS
                                // reselectionne au retour du focus (sinon la frappe suivante
                                // l'effacerait). Les autres retours dans le champ (bouton, Entree,
                                // fermeture d'une fenetre, enregistrement...) gardent la
                                // preselection du texte.
                                change: {
                                    buffer: 600,
                                    fn: function (field, newValue) {
                                        var texte = (newValue || '').trim();
                                        if (texte.length >= 3) {
                                            Me_Workflow.onRechClick(false);
                                        } else if (texte.length === 0 && Me_Workflow.rechercheDejaLancee) {
                                            Me_Workflow.onRechClick(false);
                                        }
                                    }
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
                        {
                            xtype: 'combobox',
                            name: 'lg_CODE_TVA_ID_FILTRE',
                            id: 'lg_CODE_TVA_ID_FILTRE',
                            store: store_codetva,
                            valueField: 'lg_CODE_TVA_ID',
                            displayField: 'str_NAME',
                            typeAhead: false,
                            queryMode: 'remote',
                            minChars: 0,
                            width: 170,
                            emptyText: 'Filtre TVA...',
                            forceSelection: true,
                            listeners: {
                                select: function () {
                                    Me_Workflow.onRechClick();
                                }
                            }
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
                        '-',
                        '-',
                        {
                            text: 'Réinitialiser',
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
                                Me_Workflow.fmField('lg_CODE_TVA_ID_FILTRE').clearValue();
                                Me_Workflow.onRechClick();
                                Me_Workflow.focusRecherche();
                            }
                        }
                    ]
                },
                {
                    // Apercu de l'article selectionne : consommation des 13 derniers mois,
                    // reperes de gestion et peremptions proches. Rempli au clic sur une ligne.
                    xtype: 'component',
                    dock: 'top',
                    id: 'apercu_fiche_article',
                    hidden: true,
                    cls: 'vp-apercu-barre',
                    html: ''
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
                        const lg_CODE_TVA_ID = Me_Workflow.fmField('lg_CODE_TVA_ID_FILTRE').getValue();

                        myProxy.setExtraParam('str_TYPE_TRANSACTION', str_TYPE_TRANSACTION || '');
                        myProxy.setExtraParam('lg_DCI_ID', lg_DCI_PRINCIPAL_ID || '');
                        myProxy.setExtraParam('search_value', search_value || '');
                        myProxy.setExtraParam('lg_ZONE_GEO_ID', lg_ZONE_GEO_ID || '');
                        myProxy.setExtraParam('stock_operator', stock_operator || '');
                        myProxy.setExtraParam('stock_value', stock_value || '');
                        myProxy.setExtraParam('lg_CODE_TVA_ID', lg_CODE_TVA_ID || '');
                    }

                }
            },
            listeners: {
                afterrender: function () { // a decommenter apres les tests
                    Me_Workflow.fmField('rechecher').focus();
                    if (lg_EMPLACEMENT_ID == "1") {
                        Ext.getCmp('btn_add').show();
                        Ext.getCmp('btn_import_menu').show();
                    }
                    Me_Workflow.chargerPrivilegesBoutons();
                    Me_Workflow.chargerConfigActions();
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

        // L'ecran s'ouvre VIDE : aucune requete au chargement, l'affichage part de la
        // premiere recherche (frappe, Entree, bouton) ou d'un filtre. loadStore reste
        // disponible pour demander explicitement la liste complete.

    },
    /**
     * Apercu de l'article selectionne, au-dessus de la liste : courbe de consommation
     * des 13 derniers mois (les douze precedents plus le mois en cours, pour qu'un
     * debut d'annee garde une annee complete de recul), reperes de gestion et
     * peremptions proches. Un echec masque simplement le bandeau.
     */
    /**
     * Double-clic : ouvre l'apercu, ou le referme s'il montre deja cet article.
     * Le focus revient au champ de recherche pour enchainer une autre saisie.
     */
    basculerApercu: function (produitId) {
        var barre = Ext.getCmp('apercu_fiche_article');
        if (!barre) {
            return;
        }
        if (barre.isVisible() && barre.produitAffiche === produitId) {
            barre.hide();
            barre.produitAffiche = null;
            Me_Workflow.focusRecherche();
            return;
        }
        Me_Workflow.majApercu(produitId);
    },

    /** Retour au champ de recherche, texte preselectionne pour enchainer. */
    focusRecherche: function () {
        var champ = Me_Workflow.fmField('rechecher');
        if (champ && champ.focus) {
            champ.focus(true, 100);
        }
    },

    majApercu: function (produitId) {
        var barre = Ext.getCmp('apercu_fiche_article');
        if (!barre || !produitId) {
            return;
        }
        Ext.Ajax.request({
            url: '../api/v1/produit-search/apercu/' + encodeURIComponent(produitId),
            method: 'GET',
            success: function (reponse) {
                var o = Ext.JSON.decode(reponse.responseText, true) || {};
                if (o.success === false) {
                    barre.hide();
                    return;
                }
                barre.update(Me_Workflow.htmlApercu(o));
                barre.show();
                barre.produitAffiche = produitId;
                // Le curseur doit rester dans le champ produit : la lecture de l'apercu
                // ne doit pas obliger a recliquer pour saisir l'article suivant.
                Me_Workflow.focusRecherche();
            },
            failure: function () {
                barre.hide();
            }
        });
    },

    /**
     * Deux courbes sur la meme periode : les sorties (consommation) et les achats
     * (quantites recues), avec la quantite au sommet de chaque mois. Le trace
     * garde ses proportions : il est dessine a la taille reelle du bandeau plutot
     * qu'etire pour remplir la largeur.
     */
    courbeApercu: function (conso, achats) {
        var L = 1000, H = 180, mg = 30, md = 16, mh = 24, mb = 34;
        var iw = L - mg - md, ih = H - mh - mb, i, max = 0;
        var n = conso.length;
        for (i = 0; i < n; i++) {
            if (conso[i].qte > max) { max = conso[i].qte; }
            if (achats && achats[i] > max) { max = achats[i]; }
        }
        max = max * 1.35 || 1;
        var px = function (k) {
            return mg + (n <= 1 ? iw / 2 : iw * k / (n - 1));
        };
        var py = function (v) {
            return mh + ih - (v / max) * ih;
        };
        // Traces d'abord, etiquettes ensuite : pour chaque mois, la valeur la plus
        // haute est etiquetee au-dessus de son point et l'autre en dessous, afin que
        // les deux series ne se recouvrent jamais. Un mois sans mouvement n'est pas
        // etiquete : aligner des zeros encombre le trace sans rien apprendre.
        var trace = function (valeurs, couleur, aire) {
            var d = '', svg = '';
            for (var k = 0; k < valeurs.length; k++) {
                d += (k ? 'L' : 'M') + px(k) + ' ' + py(valeurs[k]);
            }
            if (aire) {
                svg += '<path d="' + d + 'L' + px(n - 1) + ' ' + (mh + ih) + 'L' + px(0) + ' ' + (mh + ih)
                        + 'Z" fill="' + couleur + '" fill-opacity="0.10"/>';
            }
            svg += '<path d="' + d + '" fill="none" stroke="' + couleur
                    + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>';
            for (var k2 = 0; k2 < valeurs.length; k2++) {
                svg += '<circle cx="' + px(k2) + '" cy="' + py(valeurs[k2]) + '" r="2.8" fill="#ffffff" stroke="'
                        + couleur + '" stroke-width="2"/>';
            }
            return svg;
        };
        var etiquette = function (k, valeur, couleur, dessous) {
            if (!valeur) {
                return '';
            }
            // Lisere blanc derriere le chiffre : la valeur reste lisible meme lorsqu'elle
            // se pose sur le trait de l'autre courbe, la ou les deux series se croisent.
            return '<text x="' + px(k) + '" y="' + (dessous ? py(valeur) + 14 : py(valeur) - 8)
                    + '" text-anchor="middle" font-size="10.5" font-weight="700"'
                    + ' stroke="#ffffff" stroke-width="3.5" stroke-linejoin="round" paint-order="stroke"'
                    + ' fill="' + couleur + '">' + valeur + '</text>';
        };

        var qteConso = [];
        for (i = 0; i < n; i++) {
            qteConso.push(conso[i].qte);
        }
        var mois = '';
        for (i = 0; i < n; i++) {
            mois += '<text x="' + px(i) + '" y="' + (H - 6) + '" text-anchor="middle" font-size="10" fill="'
                    + (i === n - 1 ? '#0d6a74' : '#8296a0') + '" font-weight="' + (i === n - 1 ? '700' : '400') + '">'
                    + conso[i].libelle + '</text>';
        }
        // viewBox sans preserveAspectRatio="none" : le dessin garde ses proportions
        // au lieu d'etre etire horizontalement.
        var aAchats = achats && achats.length;
        var libelles = '';
        for (i = 0; i < n; i++) {
            var va = aAchats ? achats[i] : 0;
            var vc = qteConso[i];
            libelles += etiquette(i, vc, '#0d6a74', aAchats && va > vc);
            if (aAchats) {
                libelles += etiquette(i, va, '#b25a00', va <= vc);
            }
        }
        return '<svg viewBox="0 0 ' + L + ' ' + H + '" width="100%" style="max-width:' + L + 'px;display:block">'
                + '<line x1="' + mg + '" y1="' + (mh + ih) + '" x2="' + (L - md) + '" y2="' + (mh + ih)
                + '" stroke="#dbe2e6" stroke-width="1"/>'
                + (aAchats ? trace(achats, '#b25a00', false) : '')
                + trace(qteConso, '#0d6a74', true)
                + libelles + mois + '</svg>';
    },

    htmlApercu: function (o) {
        var esc = function (v) {
            return Ext.String.htmlEncode(String(v == null ? '' : v));
        };
        var conso = o.conso || [];

        // --- reperes de gestion ---
        var ligne = function (libelle, valeur) {
            return '<div class="vp-ap-ligne"><span class="l">' + libelle + '</span><span class="v">' + valeur + '</span></div>';
        };
        var reperes = '';
        if (o.derniereVente) {
            var j = o.joursSansVente;
            var mention = '';
            if (j === 0) {
                mention = '<em class="ok">(vendu aujourd\'hui)</em>';
            } else if (j > 0) {
                mention = '<em class="alerte">(non vendu depuis ' + j + ' jour' + (j > 1 ? 's' : '') + ')</em>';
            }
            reperes += ligne('Derni\u00e8re vente', esc(o.derniereVente) + (mention ? ' ' + mention : ''));
        } else {
            reperes += ligne('Derni\u00e8re vente', '<em class="alerte">jamais vendu</em>');
        }
        if (o.derniereEntree) {
            var det = [];
            if (o.qteEntree) {
                det.push(esc(o.qteEntree) + ' u.');
            }
            if (o.grossiste) {
                det.push(esc(o.grossiste));
            }
            reperes += ligne('Derni\u00e8re entr\u00e9e',
                    esc(o.derniereEntree) + (det.length ? ' <em>' + det.join(' \u00b7 ') + '</em>' : ''));
        } else {
            reperes += ligne('Derni\u00e8re entr\u00e9e', '<em>aucune entr\u00e9e enregistr\u00e9e</em>');
        }

        var puces = '';
        if (o.classe) {
            puces += '<span class="vp-ap-puce">Classe ' + esc(o.classe) + '</span>';
        }
        if (o.tva) {
            // Le libelle de TVA porte souvent deja la mention ("TVA 0") : ne pas la doubler.
            var tva = String(o.tva);
            puces += '<span class="vp-ap-puce">' + (/tva/i.test(tva) ? esc(tva) : 'TVA ' + esc(tva)) + '</span>';
        }
        // Contenance : seulement si l'article est deconditionnable et qu'elle est renseignee.
        if (o.contenance) {
            puces += '<span class="vp-ap-puce contenance">Contenance ' + esc(o.contenance) + '</span>';
        }
        if (puces) {
            reperes += '<div class="vp-ap-puces">' + puces + '</div>';
        }

        // --- peremptions proches ---
        var lots = o.lots || [];
        var blocLots = '';
        if (lots.length) {
            // Seule la peremption la plus proche : la liste complete allongeait le
            // bandeau au detriment de la courbe, et reste consultable dans le detail.
            var l = lots[0];
            var ton = l.jours < 0 ? 'perime' : (l.jours <= 90 ? 'proche' : 'valide');
            var reste = l.jours < 0 ? 'p\u00e9rim\u00e9' : ('dans ' + l.jours + ' j');
            var suite = lots.length > 1
                    ? '<span class="vp-ap-suite">+ ' + (lots.length - 1) + ' autre'
                        + (lots.length > 2 ? 's' : '') + ' lot' + (lots.length > 2 ? 's' : '') + '</span>'
                    : '';
            blocLots = '<div class="vp-ap-lots"><div class="vp-ap-soustitre">P\u00e9remption la plus proche' + suite + '</div>'
                    + '<ul><li class="' + ton + '"><span class="d">' + esc(l.peremption) + '</span>'
                    + '<span class="q">Lot ' + esc(l.lot) + ' \u00d7 ' + esc(l.qte) + '</span>'
                    + '<span class="r">' + reste + '</span></li></ul></div>';
        }

        return '<div class="vp-apercu">'
                + '<div class="vp-ap-conso">'
                + '<div class="vp-ap-tete"><span class="vp-ap-nom">' + esc(o.nom) + '</span>'
                + '<span class="vp-ap-cip">' + esc(o.cip) + '</span>'
                + '<span class="vp-ap-legende">'
                + '<span class="vp-ap-leg conso"><i></i>Sorties <b>' + amountformat(o.consoTotal || 0) + '</b></span>'
                + '<span class="vp-ap-leg achats"><i></i>Achats <b>' + amountformat(o.achatsTotal || 0) + '</b></span>'
                + '</span></div>'
                + this.courbeApercu(conso, o.achats || [])
                + '</div>'
                + '<div class="vp-ap-cote">' + reperes + blocLots + '</div>'
                + '</div>';
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
        proxy.setExtraParam('lg_CODE_TVA_ID', '');

        store.loadPage(1, {
            params: {
                search_value: '',
                str_TYPE_TRANSACTION: '',
                lg_DCI_ID: '',
                lg_ZONE_GEO_ID: '',
                stock_operator: '',
                stock_value: '',
                lg_CODE_TVA_ID: ''
            },
            callback: grid.onStoreLoad
        });
    },
    onStoreLoad: function () {

    },

    /* Privileges des boutons de l'ecran, lus UNE SEULE FOIS par ouverture :
     * un bouton dont le privilege n'est pas attribue a l'utilisateur est masque
     * (le meme controle est applique cote serveur sur les operations). */
    chargerPrivilegesBoutons: function () {
        Ext.Ajax.request({
            url: '../api/v1/fichearticle/privileges-boutons',
            method: 'GET',
            success: function (response) {
                var o = Ext.JSON.decode(response.responseText, true) || {};
                var masquerSiRefuse = function (idBouton, cle) {
                    var btn = Ext.getCmp(idBouton);
                    if (btn && o[cle] === false) {
                        btn.hide();
                    }
                };
                masquerSiRefuse('btn_add', 'P_BTN_CREER_ARTICLE');
                masquerSiRefuse('btn_recalc_seuils', 'P_BTN_RECALCULER_SEUILS');
                masquerSiRefuse('btn_maj_seuil', 'P_BTN_MAJ_SEUIL');
                // MAJ SELECTIVE suit le meme privilege que MAJ SEUIL : meme nature d'operation,
                // une modification groupee du fichier articles.
                masquerSiRefuse('btn_maj_selective', 'P_BTN_MAJ_SEUIL');
                masquerSiRefuse('btn_import_menu', 'P_BTN_IMPORT_ARTICLE');
            }
        });
    },

    /**
     * Configuration des actions de ligne (officine). Les colonnes ne sont ajoutees
     * qu'a la reponse : en cas d'echec, on retombe sur l'ordre livre par defaut pour
     * que l'ecran reste utilisable.
     */
    chargerConfigActions: function () {
        var grille = this;
        Ext.Ajax.request({
            url: '../api/v1/fichearticle/actions-config',
            method: 'GET',
            success: function (reponse) {
                var o = Ext.JSON.decode(reponse.responseText, true) || {};
                grille.configActions = {
                    ordre: o.ordre || FA_ORDRE_DEFAUT.join(','),
                    nbIcones: (o.nbIcones === undefined || o.nbIcones === null) ? FA_NB_ICONES_DEFAUT : o.nbIcones
                };
                grille.construireColonnesActions(grille.configActions);
                var bouton = Ext.getCmp('btn_config_actions');
                if (bouton && o.modifiable) {
                    bouton.show();
                }
            },
            failure: function () {
                grille.configActions = {ordre: FA_ORDRE_DEFAUT.join(','), nbIcones: FA_NB_ICONES_DEFAUT};
                grille.construireColonnesActions(grille.configActions);
            }
        });
    },

    /**
     * Fenetre de configuration des actions de ligne, reservee au privilege de
     * parametrage. Deux listes : a gauche les actions affichees en icone, dans
     * l'ordre voulu ; a droite celles regroupees dans le menu « ... ». On deplace
     * les actions d'une liste a l'autre et on les reordonne par glisser-deposer.
     * A la validation, l'ordre complet et le nombre d'icones sont enregistres dans
     * t_parameters et l'ecran est reconstruit sans rechargement.
     */
    onConfigurerActions: function () {
        var grille = this;
        var config = grille.configActions || {ordre: FA_ORDRE_DEFAUT.join(','), nbIcones: FA_NB_ICONES_DEFAUT};
        var ordre = String(config.ordre).split(',');
        var retenus = [];
        Ext.Array.each(ordre, function (c) {
            c = Ext.String.trim(c);
            if (FA_ACTIONS[c] && retenus.indexOf(c) < 0) {
                retenus.push(c);
            }
        });
        Ext.Array.each(FA_ORDRE_DEFAUT, function (c) {
            if (retenus.indexOf(c) < 0) {
                retenus.push(c);
            }
        });
        var nb = Math.min(config.nbIcones, retenus.length);

        var enLigne = function (code) {
            return {code: code, libelle: FA_ACTIONS[code].texte, icone: FA_ACTIONS[code].icon};
        };
        var champs = ['code', 'libelle', 'icone'];
        var storeIcones = Ext.create('Ext.data.Store', {fields: champs,
            data: Ext.Array.map(retenus.slice(0, nb), enLigne)});
        var storeMenu = Ext.create('Ext.data.Store', {fields: champs,
            data: Ext.Array.map(retenus.slice(nb), enLigne)});

        var colonnes = [{
                dataIndex: 'icone',
                width: 34,
                sortable: false,
                menuDisabled: true,
                renderer: function (v) {
                    return v ? '<img src="' + v + '" width="16" height="16" style="vertical-align:middle">' : '';
                }
            }, {
                text: 'Action',
                dataIndex: 'libelle',
                flex: 1,
                sortable: false,
                menuDisabled: true
            }];

        var liste = function (titre, store, vide) {
            return {
                xtype: 'gridpanel',
                title: titre,
                flex: 1,
                store: store,
                columns: colonnes,
                hideHeaders: false,
                viewConfig: {
                    plugins: {ptype: 'gridviewdragdrop', dragGroup: 'faActions', dropGroup: 'faActions'},
                    emptyText: '<div style="padding:12px;color:#8296a0;">' + vide + '</div>',
                    deferEmptyText: false
                }
            };
        };

        var fenetre = Ext.create('Ext.window.Window', {
            title: 'Actions affichées sur la fiche article',
            modal: true,
            width: 720,
            height: 430,
            layout: 'fit',
            items: [{
                    xtype: 'container',
                    layout: {type: 'vbox', align: 'stretch'},
                    padding: 10,
                    items: [{
                            xtype: 'component',
                            margin: '0 0 8 0',
                            html: '<div style="color:#3e5761;font-size:12px;">'
                                    + 'Faites glisser les actions d\'une liste à l\'autre, et de haut en bas pour '
                                    + 'choisir leur ordre. Les actions de gauche apparaissent en icône sur chaque '
                                    + 'ligne ; les autres restent accessibles par le bouton « … ». '
                                    + 'Ce réglage vaut pour toute l\'officine.</div>'
                        }, {
                            xtype: 'container',
                            flex: 1,
                            layout: {type: 'hbox', align: 'stretch'},
                            defaults: {margin: '0 5 0 5'},
                            items: [liste('Affichées en icône', storeIcones, 'Aucune icône : toutes les actions seront dans le menu « … »'),
                                liste('Dans le menu « … »', storeMenu, 'Aucune : toutes les actions seront en icône, le menu « … » disparaîtra')]
                        }]
                }],
            buttons: [{
                    text: 'Valider',
                    handler: function () {
                        var codes = [];
                        storeIcones.each(function (r) {
                            codes.push(r.get('code'));
                        });
                        var nbIcones = codes.length;
                        storeMenu.each(function (r) {
                            codes.push(r.get('code'));
                        });
                        var attente = Ext.MessageBox.wait('Enregistrement . . .', 'Veuillez patienter');
                        Ext.Ajax.request({
                            url: '../api/v1/fichearticle/actions-config',
                            method: 'POST',
                            headers: {'Content-Type': 'application/json'},
                            jsonData: {ordre: codes.join(','), nbIcones: nbIcones},
                            success: function (reponse) {
                                attente.hide();
                                var r = Ext.JSON.decode(reponse.responseText, true) || {};
                                if (!r.success) {
                                    Ext.MessageBox.show({title: 'Enregistrement impossible',
                                        msg: r.message || 'Le réglage n\'a pas pu être enregistré.',
                                        width: 460, buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.ERROR});
                                    return;
                                }
                                fenetre.close();
                                // Les colonnes d'action sont refaites sur place : pas besoin
                                // de rouvrir l'ecran pour voir le nouveau reglage.
                                grille.configActions = {ordre: r.ordre, nbIcones: r.nbIcones};
                                grille.retirerColonnesActions();
                                grille.construireColonnesActions(grille.configActions);
                                Me_Workflow.focusRecherche();
                            },
                            failure: function (reponse) {
                                attente.hide();
                                Ext.MessageBox.show({title: 'Erreur',
                                    msg: 'L\'enregistrement a échoué. Code HTTP : ' + reponse.status,
                                    width: 460, buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.ERROR});
                            }
                        });
                    }
                }, {
                    text: 'Annuler',
                    handler: function () {
                        fenetre.close();
                    }
                }],
            listeners: {
                close: function () {
                    Me_Workflow.focusRecherche();
                }
            }
        });
        fenetre.show();
    },

    /** Retire les colonnes d'action avant de les reconstruire. */
    retirerColonnesActions: function () {
        var grille = this;
        var aRetirer = [];
        Ext.Array.each(grille.headerCt.items.items, function (col) {
            if (col.xtype === 'actioncolumn') {
                aRetirer.push(col);
            }
        });
        Ext.Array.each(aRetirer, function (col) {
            grille.headerCt.remove(col);
        });
    },

    onMajSeuil: function () {
        new testextjs.view.configmanagement.famille.action.maj_seuil({
            parentview: this,
            titre: 'MAJ SEUIL groupée (Q1/Q2 réappro)'
        });
    },

    onMajSelective: function () {
        new testextjs.view.configmanagement.famille.action.maj_selective({
            parentview: this,
            titre: 'MAJ SÉLECTIVE (grossiste, famille, TVA, code remise, code tableau, laboratoire, gamme)'
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
            stock_value = "",
            lg_CODE_TVA_ID = "";

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

    if (Me_Workflow.fmField('lg_CODE_TVA_ID_FILTRE').getValue() != null) {
        lg_CODE_TVA_ID = Me_Workflow.fmField('lg_CODE_TVA_ID_FILTRE').getValue();
    }

    const tvaLabel = Me_Workflow.fmField('lg_CODE_TVA_ID_FILTRE').getRawValue();
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
    if (lg_CODE_TVA_ID && tvaLabel) {
        filtreParts.push('TVA ' + tvaLabel);
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
            + '&lg_CODE_TVA_ID=' + lg_CODE_TVA_ID
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
    /**
     * Construit les colonnes d'action a partir du parametrage de l'officine : les
     * premieres actions de l'ordre configure deviennent des icones, les suivantes
     * sont regroupees dans le menu « ... ». Ce menu n'est pas cree lorsque toutes
     * les actions sont deja en icone.
     *
     * Les colonnes sont ajoutees ici, une fois la configuration recue, et non a la
     * construction de la grille : l'ecran s'ouvre vide, il n'y a donc rien a
     * redessiner et l'ordre demande est respecte du premier affichage.
     */
    construireColonnesActions: function (config) {
        var grille = this;
        var ordre = (config && config.ordre) ? String(config.ordre).split(',') : FA_ORDRE_DEFAUT.slice();
        var retenus = [];
        Ext.Array.each(ordre, function (code) {
            code = Ext.String.trim(code);
            if (FA_ACTIONS[code] && retenus.indexOf(code) < 0) {
                retenus.push(code);
            }
        });
        // Une action absente du parametrage reste accessible : elle rejoint la fin de
        // la liste plutot que de disparaitre de l'ecran.
        Ext.Array.each(FA_ORDRE_DEFAUT, function (code) {
            if (retenus.indexOf(code) < 0) {
                retenus.push(code);
            }
        });
        var nb = (config && config.nbIcones >= 0) ? config.nbIcones : FA_NB_ICONES_DEFAUT;
        if (nb > retenus.length) {
            nb = retenus.length;
        }
        grille.actionsMenu = retenus.slice(nb);

        var colonnes = [];
        Ext.Array.each(retenus.slice(0, nb), function (code) {
            var action = FA_ACTIONS[code];
            colonnes.push({
                xtype: 'actioncolumn',
                width: 28,
                sortable: false,
                menuDisabled: true,
                hideable: false,
                items: [{
                        icon: action.icon,
                        tooltip: action.texte,
                        handler: action.lancer,
                        getClass: function (value, metadata, record) {
                            if (action.visible && !action.visible(record)) {
                                return 'x-hide-display';
                            }
                            return 'fa-action ' + action.classe;
                        }
                    }]
            });
        });
        if (grille.actionsMenu.length) {
            colonnes.push({
                xtype: 'actioncolumn',
                width: 32,
                sortable: false,
                menuDisabled: true,
                hideable: false,
                items: [{
                        icon: FA_ICONE_MENU,
                        tooltip: 'Autres actions',
                        scope: grille,
                        getClass: function () {
                            return 'fa-action fa-action-plus';
                        },
                        handler: grille.onAutresActions
                    }]
            });
        }
        grille.headerCt.add(colonnes);
    },

    /**
     * Menu « ... » : les actions qui ne sont pas en icone, dans l'ordre configure.
     * Chaque entree appelle le meme traitement que l'icone correspondante et reprend
     * ses conditions d'affichage.
     */
    onAutresActions: function (view, rowIndex, colIndex, item, e) {
        var grille = this;
        var rec = view.getStore().getAt(rowIndex);
        if (!rec) {
            return;
        }
        var entrees = [];
        Ext.Array.each(grille.actionsMenu || [], function (code) {
            var action = FA_ACTIONS[code];
            if (!action || (action.visible && !action.visible(rec))) {
                return;
            }
            if (action.danger && entrees.length) {
                entrees.push('-');
            }
            entrees.push({
                text: action.texte,
                icon: action.icon,
                handler: function () {
                    action.lancer(view, rowIndex);
                }
            });
        });
        if (!entrees.length) {
            return;
        }
        Ext.create('Ext.menu.Menu', {
            items: entrees,
            listeners: {
                hide: function (menu) {
                    Ext.defer(function () {
                        menu.destroy();
                    }, 20);
                }
            }
        }).showAt(e.getXY());
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

    onRechClick: function (selectionner) {
        const val = Me_Workflow.fmField('rechecher');

        // Une recherche a ete demandee au moins une fois : effacer le champ pourra
        // desormais recharger la liste complete (voir le listener change du champ).
        Me_Workflow.rechercheDejaLancee = true;

        Me_Workflow.getStore().loadPage(1, {
            params: {
                search_value: val.getValue() || '',
                str_TYPE_TRANSACTION: Me_Workflow.fmField('str_TYPE_TRANSACTION').getValue() || '',
                lg_DCI_ID: Me_Workflow.fmField('lg_DCI_PRINCIPAL_ID').getValue() || '',
                lg_ZONE_GEO_ID: Me_Workflow.fmField('lg_ZONE_GEO_ID').getValue() || '',
                stock_operator: Me_Workflow.fmField('stock_operator').getValue() || '',
                stock_value: Me_Workflow.fmField('stock_value').getValue() || '',
                lg_CODE_TVA_ID: Me_Workflow.fmField('lg_CODE_TVA_ID_FILTRE').getValue() || ''
            }
        });

        // selectionner === false : recherche partie pendant la frappe (pause) ; on rend le
        // focus sans selection, curseur en fin, pour que la saisie continue.
        if (selectionner === false) {
            val.focus(false, 100, function () {
                try {
                    var dom = val.inputEl.dom, fin = (dom.value || '').length;
                    dom.setSelectionRange(fin, fin);
                } catch (e) {
                }
            });
            return;
        }
        Me_Workflow.fmField('rechecher').focus(true, 100, function () {
        });
    },

    // Construit le nom de l'inventaire a partir des filtres actifs (concatenation) + HHmmss.
    /**
     * Nom de l'inventaire cree depuis la fiche article.
     *
     * Il porte la ZONE choisie et l'horodatage : INVENTAIRE RESERVE 31072026153000. Le nom
     * etait auparavant construit AVANT le choix du stock, il ne pouvait donc pas le mentionner,
     * et deux inventaires de zones differentes portaient le meme intitule.
     */
    buildInventaireName: function (mode) {
        const now = new Date();
        const pad = function (n) {
            return (n < 10 ? '0' : '') + n;
        };
        const horodatage = pad(now.getDate()) + pad(now.getMonth() + 1) + now.getFullYear()
                + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
        return 'INVENTAIRE ' + (mode === 'RESERVE' ? 'RESERVE' : 'RAYON') + ' ' + horodatage;
    },

    onCreateInventaireClick: function () {
        const me = this;

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
                        me.doCreateInventaire('RAYON', me.buildInventaireName('RAYON'));
                    }
                },
                {
                    text: 'Stock reserve',
                    handler: function () {
                        dlg.close();
                        me.doCreateInventaire('RESERVE', me.buildInventaireName('RESERVE'));
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
            lg_CODE_TVA_ID: Me_Workflow.fmField('lg_CODE_TVA_ID_FILTRE').getValue() || '',
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
        // Une seule fenetre a la fois : le formulaire porte un id fixe
        // ('periodeform'), une seconde instance corromprait le registre ExtJS.
        var winPeriodePrecedente = Ext.getCmp('periodeform');
        if (winPeriodePrecedente) {
            var conteneurPeriode = winPeriodePrecedente.up('window');
            (conteneurPeriode || winPeriodePrecedente).destroy();
        }
        var win = Ext.create("Ext.window.Window", {
            title: "Choisir une periode",
            modal: true,
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
            ],
            listeners: {
                // Fermeture ou annulation de la periode de suivi : le curseur revient
                // dans le champ produit, pret pour la recherche suivante.
                close: function () {
                    Me_Workflow.focusRecherche();
                }
            }

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

        // Impression Jasper (rp_lots_peremptions.jrxml) : donnees de l'impression
        // d'origine + date de saisie, utilisateur et stock actuel du produit.
        const printPerimeData = function () {
            window.open('../webservices/sm_user/famille/ws_lots_peremptions_pdf.jsp'
                    + '?cip=' + encodeURIComponent(String(cip))
                    + '&designation=' + encodeURIComponent(designation)
                    + '&nbreMois=24');
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

        // Suppression d'un lot, sur confirmation. La fenetre est dimensionnee pour que
        // la question tienne en entier : un numero de lot et une date de peremption
        // tronques ne permettraient pas de confirmer en connaissance de cause.
        const supprimerLot = function (record) {
            if (!record) {
                return;
            }
            const lotId = record.get('lgLOTID');
            const numLot = record.get('numLot') || '?';
            const peremption = record.get('datePerement') || 'sans date';
            if (!lotId) {
                Ext.MessageBox.alert('Suppression impossible',
                        'Identifiant du lot introuvable : ce lot ne peut pas être supprimé.');
                return;
            }
            Ext.MessageBox.show({
                title: 'Supprimer le lot',
                msg: 'Êtes-vous sûr de vouloir supprimer le lot <b>' + Ext.String.htmlEncode(String(numLot))
                        + '</b><br>dont la péremption est le <b>' + Ext.String.htmlEncode(String(peremption))
                        + '</b> ?',
                width: 460,
                minWidth: 460,
                buttons: Ext.MessageBox.YESNO,
                buttonText: {yes: 'Oui', no: 'Non'},
                icon: Ext.MessageBox.QUESTION,
                fn: function (btn) {
                    if (btn !== 'yes') {
                        return;
                    }
                    const attente = Ext.MessageBox.wait('Suppression en cours . . .', 'Veuillez patienter');
                    Ext.Ajax.request({
                        method: 'DELETE',
                        url: '../api/v1/lot/' + encodeURIComponent(lotId),
                        success: function (reponse) {
                            attente.hide();
                            const r = Ext.JSON.decode(reponse.responseText, true) || {};
                            if (r.success) {
                                loadPerimes(false);
                            } else {
                                Ext.MessageBox.show({
                                    title: 'Suppression impossible',
                                    msg: r.message || 'La suppression a échoué.',
                                    width: 460,
                                    buttons: Ext.MessageBox.OK,
                                    icon: Ext.MessageBox.ERROR
                                });
                            }
                        },
                        failure: function (reponse) {
                            attente.hide();
                            Ext.MessageBox.show({
                                title: 'Erreur',
                                msg: 'La suppression a échoué. Code HTTP : ' + reponse.status,
                                width: 460,
                                buttons: Ext.MessageBox.OK,
                                icon: Ext.MessageBox.ERROR
                            });
                        }
                    });
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
                        },
                        {
                            xtype: 'actioncolumn',
                            text: 'Supprimer',
                            width: 75,
                            align: 'center',
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    icon: 'resources/images/icons/fam/delete.png',
                                    tooltip: 'Supprimer ce lot',
                                    handler: function (grid, rowIndex) {
                                        supprimerLot(grid.getStore().getAt(rowIndex));
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

    // Un produit a stock 0 ne peut pas recevoir de date de peremption.
    const stockDisponible = Number(rec.get('int_NUMBER_AVAILABLE') || 0);
    if (stockDisponible === 0) {
        Ext.MessageBox.show({
            title: 'Alerte Message',
            width: 440,
            msg: 'Impossible d\'ajouter une date de p&eacute;remption au produit <b>'
                    + Ext.String.htmlEncode(rec.get('str_NAME') || '') + '</b> : son stock est &agrave; <b>0</b>.',
            buttons: Ext.MessageBox.OK,
            icon: Ext.MessageBox.WARNING,
            fn: function () {
                Me_Workflow.fmField('rechecher').focus(true, 100);
            }
        });
        return;
    }

    // Une seule fenetre a la fois : le formulaire porte un id fixe
    // ('peremptionform'), une seconde instance corromprait le registre ExtJS.
    const winPeremptionPrecedente = Ext.getCmp('peremptionform');
    if (winPeremptionPrecedente) {
        const conteneur = winPeremptionPrecedente.up('window');
        (conteneur || winPeremptionPrecedente).destroy();
    }
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