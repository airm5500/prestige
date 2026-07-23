/* global Ext */

var url_services_data_zonegeographique = '../webservices/configmanagement/zonegeographique/ws_data.jsp';
var url_services_transaction_zonegeographique = '../webservices/configmanagement/zonegeographique/ws_transaction.jsp?mode=';
// REST dedie a cet ecran (memes formats JSON que les JSP) : liste + create/update/update-count/toggle-statut
var url_rest_data_zone_geo = '../api/v1/zones-geographiques';
var url_services_rest_zone_geo = '../api/v1/zones-geographiques/';
var Me_Workflow;
Ext.define('testextjs.view.configmanagement.zonegeographique.ZoneGeographiqueManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'zonegeographiquemanager',
    id: 'zonegeographiquemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.selection.CheckboxModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.model.ZoneGeographique',
        'testextjs.view.configmanagement.zonegeographique.action.add',
        'Ext.ux.ProgressBarPager',
        'testextjs.view.configmanagement.zonegeographique.action.basculement'

    ],
    title: 'Gestion des emplacements',
    plain: true,
    maximizable: true,
//        tools: [{type: "pin"}],
    closable: false,
    frame: true,
    initComponent: function () {

        Me_Workflow = this;
        // Pas de pagination sur cet ecran : tous les emplacements sont affiches
        var itemsPerPage = 100000;
        var store = new Ext.data.Store({
            model: 'testextjs.model.ZoneGeographique',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_rest_data_zone_geo,
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
            id: 'zonegeographiquegridID',
            enableColumnMove: true,
            plugins: [
                {
                    ptype: "rowediting",
                    clicksToEdit: 2,
                    saveBtnText: 'Enregistrer',
                    cancelBtnText: 'Annuler'

                }],
            store: store,
            columns: [{
                    header: 'lg_ZONE_GEO_ID',
                    dataIndex: 'lg_ZONE_GEO_ID',
                    hidden: true,
                    flex: 1,
                    sortable: false,
                    menuDisabled: true


                }, {
                    header: 'Code',
                    dataIndex: 'str_CODE',
                    sortable: false,
                    menuDisabled: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }, {
                    header: 'Libelle ',
                    dataIndex: 'str_LIBELLEE',
                    sortable: false,
                    menuDisabled: true,
                    flex: 1,
                    editor: {
                        allowBlank: false
                    }
                }
                , 
                {
                    xtype: 'checkcolumn',
                    header: ' ',
                    dataIndex: 'bool_ACCOUNT',
                    width: 30,
                   sortable: false,
                    menuDisabled: true,
                    hidden:true,
                    listeners: {checkchange: function (scr, rowIndex, checked, eOpts) {
                            console.log(scr, rowIndex, checked);
                            var rec = Ext.getCmp('zonegeographiquegridID').getStore().getAt(rowIndex);

                            Ext.Ajax.request({
                                url: url_services_rest_zone_geo + 'update-count',
                                method: 'POST',
                                params: {
                                    lg_ZONE_GEO_ID: rec.get("lg_ZONE_GEO_ID"),
                                    bool_ACCOUNT: checked
                                },
                                success: function (response)
                                {



                                },
                                failure: function (response)
                                {

                                }
                            });
                        }}


                }
                
                ,{
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            iconCls: 'pillsv',
                            tooltip: 'Gestion des articles de l\'emplacement',
                            scope: this,
                            handler: this.onbasculer2

                        }]
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            // La suppression definitive est remplacee par la desactivation
                            // (reversible via le bouton 'Desactives' de la barre d'outils)
                            icon: 'resources/images/icons/fam/disable.png',
                            tooltip: 'D&eacute;sactiver / R&eacute;activer cet emplacement',
                            scope: this,
                            handler: this.onToggleStatutClick
                        }]
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    hidden: true, // bouton 'Supprimer' masque a la demande (fonction conservee)
                    items: [{
                            icon: 'resources/images/icons/fam/delete.gif',
                            tooltip: 'Supprimer',
                            scope: this,
                            handler: this.onRemoveClick
                        }]
                }],
            selModel: {
                // Cases a cocher a gauche du code pour la desactivation en masse.
                // checkOnly : la selection ne se fait que par la case, la modification
                // en ligne (double clic) reste inchangee.
                selType: 'checkboxmodel',
                mode: 'SIMPLE',
                checkOnly: true,
                injectCheckbox: 0
            },
            tbar: [
                {
                    text: 'Créer',
                    scope: this,
                    iconCls: 'addicon',
                    handler: this.onAddClick
                }, '-', {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'zonegeographique',
                    emptyText: 'Rech',
                    listeners: {
                        'render': function (cmp) {
                            cmp.getEl().on('keypress', function (e) {
                                if (e.getKey() === e.ENTER) {
                                    Me_Workflow.onRechClick();

                                }
                            });
                        }
                    }
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    iconCls: 'searchicon',
                    scope: this,
                    handler: this.onRechClick
                }, {
                    text: 'Importer',
                    tooltip: 'Importer',
                    id: 'btn_import',
                    iconCls: 'importicon',
                    scope: this,
                    handler: this.onbtnimport
                }, '-',
                {
                    text: 'Exporter CSV',
                    tooltip: 'EXPORTER CSV',
                    iconCls: 'export_csv_icon',
                    scope: this,
                    handler: this.onbtnexportCsv
                }, '-',
                {
                    text: 'Exporter EXCEL',
                    tooltip: 'EXPORTER EXCEL',
                    iconCls: 'xls',
                    scope: this,
                    handler: this.onbtnexportExcel
                }, '-', {
                    text: 'Basculer',
                    tooltip: 'Selection massive',
                    iconCls: 'pills',
                    scope: this,
                    handler: this.onbasculer
                }, '-', {
                    text: 'Imprimer',
                    tooltip: 'Imprimer la feuille de comptage (portrait)',
                    iconCls: 'printable',
                    scope: this,
                    handler: this.onPrintClick
                }, '-', {
                    text: 'D&eacute;sactiver la s&eacute;lection',
                    id: 'BT_ZONE_GEO_TOGGLE_MASSE',
                    icon: 'resources/images/icons/fam/disable.png',
                    tooltip: 'D&eacute;sactiver (ou r&eacute;activer) tous les emplacements coch&eacute;s',
                    scope: this,
                    handler: this.onToggleMasseClick
                }, '->', {
                    text: 'D&eacute;sactiv&eacute;s',
                    id: 'BT_ZONE_GEO_VOIR_DESACTIVES',
                    enableToggle: true,
                    hidden: true, // visible uniquement pour les profils administrateurs (voir est-admin)
                    icon: 'resources/images/icons/fam/disable.png',
                    tooltip: 'Afficher les emplacements d&eacute;sactiv&eacute;s (pour les r&eacute;activer)',
                    scope: this,
                    toggleHandler: function (btn, pressed) {
                        var store = this.getStore();
                        store.getProxy().setExtraParam('actifs', !pressed);
                        store.loadPage(1);
                        // Le bouton de masse suit la vue : desactiver ou reactiver
                        var masse = Ext.getCmp('BT_ZONE_GEO_TOGGLE_MASSE');
                        if (masse) {
                            masse.setText(pressed ? 'R&eacute;activer la s&eacute;lection'
                                    : 'D&eacute;sactiver la s&eacute;lection');
                        }
                    }
                }

            ],
            listeners: {
                canceledit: function (src, e) {
                    // L'edition en ligne coche la ligne au passage : on la decoche a l'annulation
                    var grid = Ext.getCmp('zonegeographiquegridID');
                    if (grid && e.record) {
                        grid.getSelectionModel().deselect(e.record);
                    }
                },
                edit: function (src, e) {
                    var record = e.record;
                    // L'edition en ligne coche la ligne au passage : on la decoche aussitot
                    var gridZone = Ext.getCmp('zonegeographiquegridID');
                    if (gridZone) {
                        gridZone.getSelectionModel().deselect(record);
                    }
                    Ext.Ajax.request({
                        url: url_services_rest_zone_geo + 'update',
                        method: 'POST',
                        params: {
                            lg_ZONE_GEO_ID: record.get("lg_ZONE_GEO_ID"),
                            str_LIBELLEE: record.get("str_LIBELLEE"),
                            str_CODE: record.get("str_CODE")
                        },
                        success: function (response)
                        {
                            var obj = Ext.decode(response.responseText);

                            if (obj.success === "1") {
                                Ext.MessageBox.alert('Modification de la ligne ' + '[' + record.get("str_CODE") + ']', 'Modification effectu&eacute;e avec succ&egrave;s');
                                e.record.commit();
                            } else {

                                Ext.MessageBox.alert('Modification de la ligne ' + '[' + record.get("str_CODE") + ']', obj.errors);
                            }


                        },
                        failure: function (response)
                        {

                        }
                    });

                }
            },
            // Pas de barre de pagination : tous les emplacements sont affiches d'un bloc
            bbar: {
                xtype: 'toolbar',
                items: [{
                        xtype: 'tbtext',
                        id: 'zone-geo-total-text',
                        text: ''
                    }]
            }
        });

        // Affiche le nombre total d'emplacements en pied de grille
        store.on('load', function (s) {
            var texte = Ext.getCmp('zone-geo-total-text');
            if (texte) {
                texte.setText(s.getTotalCount() + ' emplacement(s)');
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });

        // Le bouton 'Desactives' n'est propose qu'aux profils administrateurs
        Ext.Ajax.request({
            url: '../api/v1/roles/est-admin',
            method: 'GET',
            success: function (response) {
                var object = Ext.JSON.decode(response.responseText, true);
                var bouton = Ext.getCmp('BT_ZONE_GEO_VOIR_DESACTIVES');
                if (object && object.authorize === true && bouton) {
                    bouton.show();
                }
            }
        });

    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function () {
        var grid = Ext.getCmp('zonegeographiquegridID');
        if (grid.getStore().getCount() > 0) {
            var firstRec = grid.getStore().getAt(0);
            // Recherche par dataIndex : la colonne de cochage injectee a gauche
            // decale les index, on ne peut plus utiliser grid.columns[3]
            var colonneComptage = null;
            Ext.Array.each(grid.columns, function (col) {
                if (col.dataIndex === 'bool_ACCOUNT') {
                    colonneComptage = col;
                    return false;
                }
            });
            if (colonneComptage) {
                colonneComptage.setVisible(firstRec.get('KEYINTOACCOUNT') === true);
            }
        }
    },
    onbtnexportCsv: function () {
        var extension = "csv";
        window.location = '../MigrationServlet?table_name=TABLE_ZONE_GEOGRAPHIQUE' + "&extension=" + extension;
    },
    onbtnexportExcel: function () {
        var extension = "xls";
        window.location = '../MigrationServlet?table_name=TABLE_ZONE_GEOGRAPHIQUE' + "&extension=" + extension;
    },
    onbtnimport: function () {
        new testextjs.view.configmanagement.famille.action.importOrder({
            odatasource: 'TABLE_ZONE_GEOGRAPHIQUE',
            parentview: this,
            mode: "importfile",
            titre: "Importation des differents emplacements de l'officine"
        });
    },
    onAddClick: function () {

        new testextjs.view.configmanagement.zonegeographique.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Ajouter un emplacement"
        });
    },
    onEditClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.configmanagement.zonegeographique.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification de l'emplacement  [" + rec.get('str_LIBELLEE') + "]"
        });

    },
    onAssocProductClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);


        new testextjs.view.configmanagement.zonegeographique.action.changeProduitEmplacement({
            odatasource: rec.data,
            parentview: this,
            mode: "changeproduct",
            titre: "G&eacute;rer les produits de l'emplacement [" + rec.get('str_CODE') + "-" + rec.get('str_LIBELLEE') + "]"
        });



    },

    onRemoveClick: function (grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'confirmer la suppression',
                function (btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_transaction_zonegeographique + 'delete',
                            params: {
                                lg_ZONE_GEO_ID: rec.get('lg_ZONE_GEO_ID')
                            },
                            success: function (response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                    grid.getStore().reload();
                                }

                            },
                            failure: function (response)
                            {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                //  alert(object);

                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    }
                });


    },
    onRechClick: function () {
        // extraParam persistant : la recherche est conservee quand on change de page
        var val = Ext.getCmp('rechecher');
        var store = this.getStore();
        store.getProxy().setExtraParam('search_value', val.getValue());
        store.loadPage(1);
    },
    onToggleStatutClick: function (grid, rowIndex) {
        // En vue normale on desactive ; en vue 'Desactives' on reactive
        var enDesactives = Ext.getCmp('BT_ZONE_GEO_VOIR_DESACTIVES')
                && Ext.getCmp('BT_ZONE_GEO_VOIR_DESACTIVES').pressed;
        var actif = enDesactives ? true : false;
        Ext.MessageBox.confirm('Message',
                (actif ? 'R&eacute;activer cet emplacement ?'
                        : 'D&eacute;sactiver cet emplacement ? Il n\'appara&icirc;tra plus dans les listes.'),
                function (btn) {
                    if (btn === 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_rest_zone_geo + 'toggle-statut',
                            method: 'POST',
                            params: {
                                lg_ZONE_GEO_ID: rec.get('lg_ZONE_GEO_ID'),
                                actif: actif
                            },
                            success: function (response) {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == "0") {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                }
                                Ext.MessageBox.alert('Confirmation', object.errors);
                                grid.getStore().reload();
                            },
                            failure: function (response) {
                                testextjs.app.getController('App').StopWaitingProcess();
                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);
                            }
                        });
                    }
                });
    },
    onToggleMasseClick: function () {
        var me = this;
        var enDesactives = Ext.getCmp('BT_ZONE_GEO_VOIR_DESACTIVES')
                && Ext.getCmp('BT_ZONE_GEO_VOIR_DESACTIVES').pressed;
        var actif = enDesactives ? true : false;
        var selection = this.getSelectionModel().getSelection();
        if (!selection || selection.length === 0) {
            Ext.MessageBox.alert('Information', 'Cochez au moins un emplacement dans la premi&egrave;re colonne.');
            return;
        }
        var ids = [];
        Ext.Array.each(selection, function (rec) {
            ids.push(rec.get('lg_ZONE_GEO_ID'));
        });
        Ext.MessageBox.confirm('Message',
                (actif ? 'R&eacute;activer' : 'D&eacute;sactiver') + ' les ' + ids.length
                + ' emplacement(s) coch&eacute;(s) ?',
                function (btn) {
                    if (btn === 'yes') {
                        testextjs.app.getController('App').ShowWaitingProcess();
                        Ext.Ajax.request({
                            url: url_services_rest_zone_geo + 'toggle-statut-masse',
                            method: 'POST',
                            params: {
                                lg_ZONE_GEO_IDS: ids.join(','),
                                actif: actif
                            },
                            success: function (response) {
                                testextjs.app.getController('App').StopWaitingProcess();
                                var object = Ext.JSON.decode(response.responseText, false);
                                Ext.MessageBox.alert(object.success == "0" ? 'Error Message' : 'Confirmation',
                                        object.errors);
                                me.getSelectionModel().deselectAll();
                                me.getStore().reload();
                            },
                            failure: function (response) {
                                testextjs.app.getController('App').StopWaitingProcess();
                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);
                            }
                        });
                    }
                });
    },
    onbasculer: function () {
        new testextjs.view.configmanagement.zonegeographique.action.basculement({
            odatasource: '',

            parentview: this,
            titre: "Gestion des emplacements"
        });
    },
    onbasculer2: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.configmanagement.zonegeographique.action.basculement({
            odatasource: rec.get('lg_ZONE_GEO_ID'),

            parentview: this,
            titre: "Gestion des emplacements"
        });
    },
    // Edition PDF (JasperReports rp_emplacements_comptage.jrxml) : feuille de comptage.
    // Au clic, on demande le tri souhaite : par Code ou par Nom d'emplacement.
    onPrintClick: function () {
        var me = this;
        Ext.Msg.show({
            title: 'Impression - Choix du tri',
            msg: 'Trier la liste des emplacements par :',
            buttons: Ext.Msg.YESNOCANCEL,
            buttonText: {yes: 'Code', no: 'Nom', cancel: 'Annuler'},
            icon: Ext.Msg.QUESTION,
            fn: function (btn) {
                if (btn === 'yes') {
                    me.genererPdfEmplacements('code');
                } else if (btn === 'no') {
                    me.genererPdfEmplacements('nom');
                }
            }
        });
    },
    genererPdfEmplacements: function (tri) {
        // Ouverture directe dans le clic utilisateur (comme les autres impressions PDF) :
        // l'onglet s'ouvre sans blocage de popup et affiche le PDF des qu'il est genere.
        testextjs.app.getController('App').onGeneratePdfFile('../api/v1/emplacements/pdf-direct?tri=' + tri);
    }
});