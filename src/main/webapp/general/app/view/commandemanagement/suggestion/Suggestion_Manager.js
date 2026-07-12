/* global Ext */


var url_services_transaction_suggerercmde = '../webservices/sm_user/suggerercde/ws_transaction.jsp?mode=';
var Me;
// Suivi des suggestions cochees (selection conservee a travers les pages) pour "Supprimer"
var suggCheckedIds = [];
var suggHeaderChecked = false;



Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
var _myAppController;
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

Ext.define('testextjs.view.commandemanagement.suggestion.Suggestion_Manager', {
    extend: 'Ext.grid.Panel',
    xtype: 'i_sugg_manager',
    id: 'i_sugg_managerID',
    frame: true,
    animCollapse: false,
    title: 'Liste Suggestion',
    plain: true,
    maximizable: true,
    closable: false,

    initComponent: function () {
        _myAppController = Ext.create('testextjs.controller.App', {});
        Me = this;

        const itemsPerPage = 18;
        const store_suggestion = new Ext.data.Store({

            fields: [
                {
                    name: 'lg_SUGGESTION_ORDER_ID',
                    type: 'string'
                },

                {
                    name: 'str_REF',
                    type: 'string'
                },

                {
                    name: 'int_NOMBRE_ARTICLES',
                    type: 'string'
                },
                {
                    name: 'lg_GROSSISTE_ID',
                    type: 'string'
                },
                {
                    name: 'int_NUMBER',
                    type: 'number'
                },
                {
                    name: 'dt_UPDATED',
                    type: 'string'
                },
                {
                    name: 'str_STATUT',
                    type: 'String'
                },

                {
                    name: 'lg_FAMILLE_PRIX_VENTE',
                    type: 'String'
                },
                {
                    name: 'lg_FAMILLE_PRIX_ACHAT',
                    type: 'string'
                },
                {
                    name: 'dt_CREATED',
                    type: 'String'
                },
                {
                    name: 'str_FAMILLE_ITEM',
                    type: 'string'
                },

                {
                    name: 'int_TOTAL_VENTE',
                    type: 'number'
                },
                {
                    name: 'int_TOTAL_ACHAT',
                    type: 'number'
                },
                {
                    name: 'int_DATE_BUTOIR_ARTICLE',
                    type: 'int'
                },
                {
                    name: 'isChecked',
                    type: 'boolean',
                    defaultValue: false
                }
            ],
            pageSize: itemsPerPage,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/suggestion/list',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            },
            listeners: {
                // Restaure les cases cochees apres chaque (re)chargement (selection multi-pages)
                load: function (st) {
                    st.each(function (rec) {
                        rec.set('isChecked', suggCheckedIds.indexOf(rec.get('lg_SUGGESTION_ORDER_ID')) !== -1);
                    });
                    st.commitChanges();
                }
            }

        });

        Ext.apply(this, {
            width: '98%',
            height: 580,
            store: store_suggestion,
            columns: [
                {
                    header: 'lg_SUGGESTION_ORDER_ID',
                    dataIndex: 'lg_SUGGESTION_ORDER_ID',
                    hidden: true,
                    flex: 1


                },
                {
                    xtype: 'rownumberer',
                    text: 'LG',
                    width: 45


                },

                {
                    header: 'REF',
                    dataIndex: 'str_REF',
                    flex: 1
                },
                {
                    header: 'GROSSISTE',
                    dataIndex: 'lg_GROSSISTE_ID',
                    flex: 1
                },

                {
                    header: 'NOMBRE.LIGNE',
                    dataIndex: 'int_NOMBRE_ARTICLES',
                    flex: 1
                },
                {
                    header: 'QTE.ARTICLES',
                    dataIndex: 'int_NUMBER',
                    flex: 1
                },

                {
                    header: 'STATUT',
                    dataIndex: 'str_STATUT',
                    flex: 1,
                    renderer: function (val, m, r) {


                        if (val === 'is_Process') {
                            val = 'MANUELLE';
                        } else if (val === 'enable') {
                            val = 'COMMANDEE';
                        } else if (val === 'auto') {
                            val = 'AUTO';
                        } else if (val === 'pending') {
                            val = 'CLOTURE';
                            m.style = 'background-color:#73C774;color:#FFF;font-weight:800;';

                        }
                        return val;
                    }
                },
                {
                    header: 'DATE',
                    dataIndex: 'dt_CREATED',
                    flex: 1
                }, {
                    header: 'HEURE',
                    dataIndex: 'dt_UPDATED',
                    flex: 1
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/folder_go.png',
                            tooltip: 'Commander',
                            scope: this,
                            handler: this.onMakeOrderClick
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
                            handler: this.onManageDetailsClick
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.gif',
                            tooltip: 'Supprimer',
                            scope: this,
                            handler: this.onRemoveClick
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/printer.png',
                            tooltip: 'Imprimer une suggession',
                            scope: this,
                            handler: this.onbtnprint
                        }]
                },

                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/excel_csv.png',
                            tooltip: 'Generer le fichier CSV',
                            scope: this,
                            handler: function (grid, rowIndex) {
                                Ext.MessageBox.confirm('Message',
                                        'Voulez-vous generer le fichier CSV ?',
                                        function (btn) {
                                            if (btn === 'yes') {
                                                const rec = grid.getStore().getAt(rowIndex);
                                                window.location = '../api/v1/suggestion/csv?id=' + rec.get('lg_SUGGESTION_ORDER_ID');
                                            }
                                        });
                            }
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/page_copy.png',
                            tooltip: 'Cloner en commande',
                            scope: this,
                            handler: this.onCloneSuggestionClick
                        }]
                },
                {
                    xtype: 'checkcolumn',
                    text: '&#10003;',
                    tooltip: "Cliquer l'entête pour tout cocher / décocher (page courante)",
                    dataIndex: 'isChecked',
                    width: 40,
                    sortable: false,
                    menuDisabled: true,
                    listeners: {
                        checkchange: function (col, rowIndex, checked) {
                            var rec = Me.getStore().getAt(rowIndex);
                            if (!rec) { return; }
                            var id = rec.get('lg_SUGGESTION_ORDER_ID');
                            var idx = suggCheckedIds.indexOf(id);
                            if (checked && idx === -1) {
                                suggCheckedIds.push(id);
                            } else if (!checked && idx !== -1) {
                                suggCheckedIds.splice(idx, 1);
                            }
                        }
                    }
                }
            ],
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [
                {
                    text: 'Suggerer',
                    scope: this,
                    hidden: true,
                    handler: this.onAddClick
                },
                {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'suggestion',
                    emptyText: 'Recherche',
                    listeners: {
                        'render': function (cmp) {
                            cmp.getEl().on('keypress', function (e) {
                                if (e.getKey() === e.ENTER) {
                                    Me.onRechClick();

                                }
                            });
                        }
                    }
                },
                {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    iconCls: 'searchicon',
                    scope: this,
                    handler: this.onRechClick
                },
                '->',
                {
                    xtype: 'numberfield',
                    itemId: 'nxField',
                    width: 80,
                    minValue: 1,
                    allowDecimals: false,
                    emptyText: 'Nx',
                    fieldStyle: 'background-color:#FFA500;color:#000;font-weight:bold;'
                },
                {
                    text: 'Créer suggestion',
                    iconCls: 'suggestionreapro',
                    tooltip: 'Créer une suggestion (réappro) à partir du Top Nx de la classification ABC, sur les 3 derniers mois clôturés',
                    scope: this,
                    handler: this.onCreerSuggestionAbc
                },
                {
                    text: 'Supprimer suggestion',
                    tooltip: 'Supprimer les suggestions cochées (sur une ou plusieurs pages)',
                    scope: this,
                    handler: this.onViderSuggestion
                },
                {
                    text: 'Diagnostic produit',
                    tooltip: 'Rechercher un produit (tous statuts) et voir pourquoi il n\'est pas suggéré en suggestion auto',
                    scope: this,
                    handler: this.onDiagnosticClick
                }
            ],
            bbar: {
                xtype: 'pagingtoolbar',
                pageSize: itemsPerPage,
                store: store_suggestion,
                displayInfo: true,
                plugins: new Ext.ux.ProgressBarPager()
            }
        });

        this.callParent();

        // Tout cocher / decocher en cliquant sur l'entete de la colonne a cocher (page courante)
        this.on('headerclick', function (ct, column) {
            if (!column || column.dataIndex !== 'isChecked') { return; }
            suggHeaderChecked = !suggHeaderChecked;
            var st = Me.getStore();
            st.each(function (rec) {
                rec.set('isChecked', suggHeaderChecked);
                var id = rec.get('lg_SUGGESTION_ORDER_ID');
                var idx = suggCheckedIds.indexOf(id);
                if (suggHeaderChecked && idx === -1) {
                    suggCheckedIds.push(id);
                } else if (!suggHeaderChecked && idx !== -1) {
                    suggCheckedIds.splice(idx, 1);
                }
            });
            st.commitChanges();
            return false;
        });

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });



    },
    loadStore: function () {
        this.getStore();
    },

    onbtnprint: function (grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmation de l\'impression de cette suggestion',
                function (btn) {
                    if (btn == 'yes') {
                        const rec = grid.getStore().getAt(rowIndex);
                        const lg_SUGGESTION_ORDER_ID = rec.get('lg_SUGGESTION_ORDER_ID');
                        Me.onPdfClick(lg_SUGGESTION_ORDER_ID);
                    }
                });

    },
    onPdfClick: function (lg_SUGGESTION_ORDER_ID) {

        let linkUrl = "../webservices/sm_user/suggerercde/ws_generate_pdf.jsp?lg_SUGGESTION_ORDER_ID=" + lg_SUGGESTION_ORDER_ID;
        window.open(linkUrl);
    },
    onMakeOrderClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);

        testextjs.app.getController('App').ShowWaitingProcess();
        Ext.Ajax.request({
            url: '../api/v1/commande/transform-order/' + rec.get('lg_SUGGESTION_ORDER_ID'),
            timeout: 24000000,
            success: function (response)
            {
                testextjs.app.getController('App').StopWaitingProcess();
                Ext.MessageBox.alert('Confirmation', 'Opération terminée');
                grid.getStore().reload();

            },
            failure: function (response)
            {
                testextjs.app.getController('App').StopWaitingProcess();

              
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });
    },
    onManageDetailsClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        const xtype = "suggerercdemanager";

        Ext.Ajax.request({
            url: '../api/v1/suggestion/set-pending/' + rec.get('lg_SUGGESTION_ORDER_ID'),
            success: function (response)
            {
                testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "Suggestion de commande", rec.get('lg_SUGGESTION_ORDER_ID'), rec.data);
            },
            failure: function (response)
            {
                Ext.MessageBox.alert('Error Message', response.responseText);

            }
        });

    },
    onAddClick: function () {
        const xtype = "suggerercdemanager";

        testextjs.app.getController('App').onLoadNewComponent(xtype, "Ajouter detail commande", "0");

    },

    onRemoveClick: function (grid, rowIndex) {

        Ext.MessageBox.confirm('Message',
                'confirm la suppresssion',
                function (btn) {
                    if (btn === 'yes') {
                        const rec = grid.getStore().getAt(rowIndex);
                        _myAppController.ShowWaitingProcess();
                        Ext.Ajax.request({
                            method: 'DELETE',
                            url: '../api/v1/suggestion/suggestion/' + rec.get('lg_SUGGESTION_ORDER_ID'),
                            timeout: 2400000,

                            success: function (response)
                            {
                                _myAppController.StopWaitingProcess();
                               
                                Ext.MessageBox.alert('Confirmation', 'Opération terminée');
                                grid.getStore().reload();
                            },
                            failure: function (response)
                            {
                                _myAppController.StopWaitingProcess();

                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });

                    }
                });


    },
    onEditClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.sm_user.preenregistrement.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Suggestion  [" + rec.get('lg_SUGGESTION_ORDER_ID') + "]"
        });



    },
    onRechClick: function () {
        const val = Ext.getCmp('rechecher');
        this.getStore().load({
            params: {
                query: val.value
            }
        });
    },

    // Diagnostic : pourquoi un produit (tous statuts confondus) n'est-il pas suggéré en suggestion auto ?
    onDiagnosticClick: function () {
        const diagStore = new Ext.data.Store({
            fields: ['lg_FAMILLE_ID', 'int_CIP', 'str_NAME', 'str_STATUT', 'int_SEUIL_MIN', 'int_STOCK',
                'str_GROSSISTE', 'str_DIAGNOSTIC', 'bool_OK'],
            pageSize: 20,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/suggestion/diagnostic',
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }
        });
        const doSearch = function () {
            const field = Ext.getCmp('diagProduitSearch');
            diagStore.getProxy().setExtraParam('manques', '');
            diagStore.getProxy().setExtraParam('query', field ? field.getValue() : '');
            diagStore.loadPage(1);
        };
        // liste serveur des produits au seuil absents de toute suggestion auto active
        const doManques = function () {
            diagStore.getProxy().setExtraParam('query', '');
            diagStore.getProxy().setExtraParam('manques', '1');
            diagStore.loadPage(1);
        };
        Ext.create('Ext.window.Window', {
            title: 'Diagnostic suggestion — pourquoi ce produit n\'est-il pas suggéré ?',
            modal: true,
            width: 1050,
            height: 520,
            layout: 'fit',
            items: [{
                    xtype: 'grid',
                    store: diagStore,
                    columns: [
                        {header: 'CIP', dataIndex: 'int_CIP', width: 110},
                        {header: 'Article', dataIndex: 'str_NAME', flex: 2},
                        {header: 'Statut', dataIndex: 'str_STATUT', width: 70},
                        {header: 'Stock', dataIndex: 'int_STOCK', width: 60, align: 'right'},
                        {header: 'Seuil', dataIndex: 'int_SEUIL_MIN', width: 60, align: 'right'},
                        {header: 'Grossiste', dataIndex: 'str_GROSSISTE', flex: 1},
                        {header: 'Diagnostic', dataIndex: 'str_DIAGNOSTIC', flex: 3,
                            renderer: function (value, meta, record) {
                                meta.style = record.get('bool_OK')
                                        ? 'color:#1a7f37;font-weight:bold;'
                                        : 'color:#b35900;';
                                return value;
                            }}
                    ],
                    tbar: [{
                            xtype: 'textfield',
                            id: 'diagProduitSearch',
                            emptyText: 'CIP ou nom du produit...',
                            width: 320,
                            listeners: {
                                specialkey: function (f, e) {
                                    if (e.getKey() === e.ENTER) {
                                        doSearch();
                                    }
                                }
                            }
                        }, {
                            text: 'rechercher',
                            iconCls: 'searchicon',
                            handler: doSearch
                        }, '-', {
                            text: 'Produits au seuil non suggérés',
                            tooltip: 'Lister tous les produits dont le stock a atteint le seuil et qui ne figurent dans aucune suggestion auto active, avec la cause',
                            handler: doManques
                        }],
                    bbar: {
                        xtype: 'pagingtoolbar',
                        store: diagStore,
                        displayInfo: true
                    }
                }]
        }).show();
    },

    // Cree une suggestion (reappro) a partir du Top Nx de la classification ABC, sur les 3 derniers mois clotures
    onCreerSuggestionAbc: function () {
        const me = this;
        const nxFld = me.down('#nxField');
        const nxRaw = nxFld ? nxFld.getValue() : null;
        // Nx obligatoire et numerique
        if (nxRaw === null || nxRaw === '' || isNaN(nxRaw) || Number(nxRaw) <= 0) {
            Ext.MessageBox.show({
                title: 'Valeur Nx requise',
                width: 420,
                msg: 'Veuillez saisir une valeur <b>numérique</b> dans le champ <b>Nx</b> (nombre de produits les plus importants à suggérer).',
                buttons: Ext.MessageBox.OK,
                icon: Ext.MessageBox.WARNING,
                fn: function () { if (nxFld) { nxFld.focus(true, 100); } }
            });
            return;
        }
        const nx = nxRaw;
        const now = new Date();
        const endPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0); // dernier jour du mois precedent
        const startWindow = new Date(endPrevMonth.getFullYear(), endPrevMonth.getMonth() - 2, 1);
        const dtStart = Ext.Date.format(startWindow, 'Y-m-d');
        const dtEnd = Ext.Date.format(endPrevMonth, 'Y-m-d');
        const params = {dtStart: dtStart, dtEnd: dtEnd, type: 'QTY', classe: 'ALL', stockFilter: 'ALL', isReappro: true};
        if (nx) { params.topN = nx; }
        Ext.MessageBox.confirm('Créer suggestion',
                'Créer une suggestion de réappro à partir du Top ' + (nx || 'tous') + ' produits de la classification ABC'
                + ' (période du ' + dtStart + ' au ' + dtEnd + ') ?',
                function (btn) {
                    if (btn !== 'yes') { return; }
                    const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Création des suggestions');
                    Ext.Ajax.request({
                        url: '../api/v1/articles/abc/suggestion?' + Ext.Object.toQueryString(params),
                        method: 'POST',
                        timeout: 2400000,
                        success: function (resp) {
                            progress.hide();
                            const r = Ext.JSON.decode(resp.responseText, true) || {};
                            Ext.MessageBox.show({
                                title: 'Suggestion',
                                width: 460,
                                msg: r.success
                                        ? ('Suggestions créées pour <b>' + (r.count || 0) + '</b> produit(s).')
                                        : 'Aucune suggestion créée.',
                                buttons: Ext.MessageBox.OK,
                                icon: Ext.MessageBox.INFO
                            });
                            Me.getStore().reload();
                        },
                        failure: function (resp) {
                            progress.hide();
                            Ext.Msg.alert('Erreur', 'Échec. Code HTTP : ' + resp.status);
                        }
                    });
                });
    },

    // Supprime les suggestions cochees (selection multi-pages)
    onViderSuggestion: function () {
        if (!suggCheckedIds.length) {
            Ext.Msg.alert('Information', 'Veuillez cocher au moins une suggestion à supprimer.');
            return;
        }
        Ext.MessageBox.confirm('Vider suggestion',
                'Supprimer ' + suggCheckedIds.length + ' suggestion(s) cochée(s) ?',
                function (btn) {
                    if (btn !== 'yes') { return; }
                    const ids = suggCheckedIds.slice();
                    const progress = Ext.MessageBox.wait('Suppression . . .', 'Veuillez patienter');
                    let remaining = ids.length;
                    const done = function () {
                        remaining--;
                        if (remaining <= 0) {
                            progress.hide();
                            suggCheckedIds = [];
                            Me.getStore().reload();
                            Ext.Msg.alert('Vider suggestion', ids.length + ' suggestion(s) supprimée(s).');
                        }
                    };
                    Ext.each(ids, function (id) {
                        Ext.Ajax.request({
                            url: '../api/v1/suggestion/suggestion/' + id,
                            method: 'DELETE',
                            callback: done
                        });
                    });
                });
    },

    onCloneSuggestionClick: function (grid, rowIndex) {
    const me = this;
    const rec = grid.getStore().getAt(rowIndex);

    if (!rec) {
        Ext.Msg.alert('Erreur', 'Impossible de retrouver la suggestion sélectionnée.');
        return;
    }

    const suggestionId = rec.get('lg_SUGGESTION_ORDER_ID') || rec.get('lgSUGGESTIONORDERID');

    if (!suggestionId) {
        Ext.Msg.alert('Erreur', 'Identifiant de la suggestion introuvable.');
        return;
    }

    Ext.MessageBox.confirm(
            'Confirmation',
            'Voulez-vous cloner cette suggestion en nouvelle commande ?',
            function (btn) {
                if (btn !== 'yes') {
                    return;
                }

                Ext.Ajax.request({
                    url: '../api/v1/commande/clone-suggestion-order/' + suggestionId,
                    method: 'PUT',
                    success: function (response) {
                        let result = {};

                        try {
                            result = Ext.decode(response.responseText);
                        } catch (e) {
                            Ext.Msg.alert('Erreur', 'Réponse serveur invalide.');
                            return;
                        }

                        if (result.success) {
                            const ref = result.data && result.data.str_REF_ORDER
                                    ? result.data.str_REF_ORDER
                                    : '';

                            Ext.Msg.alert(
                                    'Succès',
                                    ref
                                            ? 'Suggestion clonée en commande avec succès. Nouvelle référence : ' + ref
                                            : 'Suggestion clonée en commande avec succès.'
                            );

                            grid.getStore().reload();
                        } else {
                            Ext.Msg.alert('Erreur', result.msg || 'Erreur lors du clonage de la suggestion.');
                        }
                    },
                    failure: function () {
                        Ext.Msg.alert('Erreur', 'Erreur de communication avec le serveur.');
                    }
                });
            }
    );
}

});