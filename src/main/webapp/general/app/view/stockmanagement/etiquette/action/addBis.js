/* Cet ecran passe par l'API REST. Les pages JSP qu'il appelait restent en place, INTOUCHEES :
 * ws_data_jdbc.jsp sert encore le retour depot, l'ajustement, les achats differes et le retour
 * fournisseur, et ws_data_detail.jsp sert l'ecran principal des etiquettes. */
var url_services_etiquette_panier = '../api/v1/etiquette-panier';
var url_services_pdf_fiche_massiveetiquette = '../webservices/stockmanagement/etiquette/ws_generate_etiquette_pdf.jsp';
/* Servlet d'edition : c'est lui qui applique la bascule KEY_ETIQUETTE_MOTEUR et renvoie, le cas
 * echeant, vers la generation JasperReports historique (url_services_pdf_fiche_massiveetiquette). */
var url_services_etiquette_moteur_massif = '../Etiquete';
var Me;
var LaborexWorkFlow;
var store_famille_dovente = null;
Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}


Ext.define('testextjs.view.stockmanagement.etiquette.action.addBis', {
    extend: 'Ext.form.Panel',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.form.*',
        'Ext.layout.container.Column'
    ],
    config: {
        odatasource: '',
        parentview: '',
        mode: '',
        titre: 'Cr&eacute;tion group&eacute;e d\'&eacute;tiquette',
        plain: true,
        maximizable: true,
        closable: false,
        nameintern: ''
    },
    xtype: 'doEtiquette',
    id: 'doEtiquetteID',
//    iconCls: 'etiquette',
    frame: true,
    titre: 'Cr&eacute;tion group&eacute;e d\'&eacute;tiquette',
    bodyPadding: 5,
    layout: 'column',
    initComponent: function() {

        Me = this;
        this.title = this.getTitre();
        var itemsPerPage = 20;
        LaborexWorkFlow = Ext.create('testextjs.controller.LaborexWorkFlow', {});
//        store_famille_dovente = LaborexWorkFlow.BuildStore('testextjs.model.Famille', itemsPerPage, url_services_data_famille_select_dovente + "?str_TYPE_TRANSACTION=init"); // a decommenter en cas de probleme
        store_famille_dovente = LaborexWorkFlow.BuildStore('testextjs.model.Famille', itemsPerPage,
                url_services_etiquette_panier + '/produits');

        var store_details = new Ext.data.Store({
            model: 'testextjs.model.Etiquette',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_services_etiquette_panier,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });
        Ext.apply(this, {
            width: '98%',
            fieldDefaults: {
                labelAlign: 'left',
                labelWidth: 200,
                anchor: '100%',
                msgTarget: 'side'
            },
            layout: {
                type: 'vbox',
                align: 'stretch',
                padding: 10
            },
            defaults: {
                flex: 1
            },
            id: 'panelID',
            // items: ['rech_prod', 'gridpanelID'], 
            items: [
                {
                    xtype: 'fieldset',
                    title: 'Ajout de produits',
                    collapsible: true,
                    defaultType: 'textfield',
                    layout: 'anchor',
                    defaults: {
//                        anchor: '100%'
                    },
                    items: [
                        {
                            xtype: 'fieldcontainer',
                            layout: 'vbox',
                            combineErrors: true,
                            defaultType: 'textfield',
                            defaults: {
//                                hideLabel: 'true'
                            },
                            items: [
                                {
                                    xtype: 'container',
                                    layout: 'hbox',
                                    margin: '0 0 5 0',
                                    defaultType: 'textfield',
                                    items: [
                                        {
                                            xtype: 'combobox',
                                            fieldLabel: 'Article',
                                            name: 'str_NAME',
                                            id: 'str_NAME',
                                            store: store_famille_dovente,
                                            margins: '0 10 5 10',
//                                    enableKeyEvents: true,
                                            valueField: 'str_DESCRIPTION',
                                            pageSize: 20, //ajout la barre de pagination
                                            displayField: 'str_DESCRIPTION',
                                            typeAhead: true,
                                            width: 600,
                                            flex: 3,
                                            minChars: 3,
                                            queryMode: 'remote',
                                            emptyText: 'Choisir un article par Nom ou Cip...',
                                            listConfig: {
                                                /* La liste deroulante prenait la largeur du champ : les
                                                 * designations longues passaient a la ligne et se
                                                 * melaient a la suivante. Elle est desormais plus large
                                                 * que le champ, et chaque ligne tient sur une seule. */
                                                minWidth: 780,
                                                getInnerTpl: function() {
                                                    return '<div style="display:table;width:100%;table-layout:fixed;">'
                                                            + '<span style="display:table-cell;width:90px;color:#555;">{CIP}</span>'
                                                            + '<span style="display:table-cell;white-space:nowrap;'
                                                            + 'overflow:hidden;text-overflow:ellipsis;">{str_DESCRIPTION}</span>'
                                                            + '<span style="display:table-cell;width:90px;'
                                                            + 'text-align:right;font-weight:600;">({int_PRICE})</span>'
                                                            + '</div>';
                                                }
                                            },
                                            listeners: {
                                                afterrender: function(field) { // a decommenter apres les tests
                                                    field.focus();
                                                    field.setFieldStyle('border: 2px solid #3892d3; background: #F1F1F1;'); //cas plusieurs attribut
                                                },
                                                keypress: function(field, e) {
                                                    if (e.getKey() === e.BACKSPACE || e.getKey() === 46) {
                                                        /*if (field.getValue().length === 1) {
                                                         field.getStore().load();
                                                         }*/
                                                    }
                                                },
                                                select: function(cmp) {
                                                    var value = cmp.getValue();
                                                    var record = cmp.findRecord(cmp.valueField || cmp.displayField, value); //recupere la ligne de l'element selectionné

                                                    Ext.getCmp('lg_FAMILLE_ID_VENTE').setValue(record.get('lg_FAMILLE_ID'));
                                                    cmp.setFieldStyle('border: 1px solid #C0C0C0; background: #FFFFFF;');
                                                    //LaborexWorkFlow.DoAjaxGetStockArticle(record);

                                                    Ext.getCmp('int_QUANTITE').focus(true, 100, function() {
                                                        Ext.getCmp('int_QUANTITE').selectText(0, 1);
                                                    });
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
                                            width: 400,
                                            value: 1,
                                            allowBlank: false,
                                            regex: /[0-9.]/,
                                            enableKeyEvents: true,
                                            listeners: {
                                                specialKey: function(field, e, options) {
                                                    if (e.getKey() === e.ENTER) {
                                                        if (Ext.getCmp('lg_FAMILLE_ID_VENTE').getValue() !== "") {
                                                            Me.onbtnadd();

                                                        } else {
                                                            Ext.MessageBox.alert('Error Message', 'Verifiez votre selection svp');
                                                            return;
                                                        }
                                                    }

                                                }
                                            }
                                        }
                                    ]
                                },
                                {
                                    xtype: 'container',
                                    layout: 'hbox',
                                    margin: '0 0 5 0',
                                    defaultType: 'textfield',
                                    items: [
                                        {
                                            fieldLabel: 'Commencer l\'impression &agrave; partir de:',
                                            name: 'int_NUMBER',
                                            id: 'int_NUMBER',
                                            xtype: 'numberfield',
                                            margin: '0 15 0 10',
                                            fieldStyle: "color:blue;font-size:1.5em;font-weight: bold;",
                                            minValue: 1,
                                            width: 400,
                                            value: 1,
                                            allowBlank: false,
                                            regex: /[0-9.]/
                                        }
                                    ]
                                }

                            ]
                        }
                    ]
                },
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
                            xtype: 'gridpanel',
                            id: 'gridpanelID',
                            margin: '0 0 10 0',
                            plugins: [this.cellEditing],
                            store: store_details,
                            height: 300,
                            columns: [{
                                    text: 'Details Vente Id',
                                    flex: 1,
                                    sortable: true,
                                    hidden: true,
                                    dataIndex: 'lg_ETIQUETTE_ID',
                                    id: 'lg_ETIQUETTE_ID'
                                }, {
                                    xtype: 'rownumberer',
                                    text: 'Ligne',
                                    width: 45,
                                    sortable: true/*,
                                     locked: true*/
                                }, {
                                    text: 'CIP',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_CIP'
                                }, {
                                    text: 'Designation',
                                    flex: 2,
                                    sortable: true,
                                    dataIndex: 'lg_FAMILLE_ID'
                                }, {
                                    header: 'Quantit&eacute;',
                                    dataIndex: 'int_NUMBER',
                                    flex: 1,
                                    editor: {
                                        xtype: 'numberfield',
                                        allowBlank: false,
                                        regex: /[0-9.]/,
                                        selectOnFocus: true,
                                        hideTrigger: true
                                    }
                                }, {
                                    text: 'P.U',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_PRICE',
                                    renderer: amountformat,
                                    align: 'right'
                                }, {
                                    text: 'PAF',
                                    flex: 1,
                                    sortable: true,
                                    dataIndex: 'int_PAF',
                                    renderer: amountformat,
                                    align: 'right'
                                }, {
                                    xtype: 'actioncolumn',
                                    width: 30,
                                    sortable: false,
                                    menuDisabled: true,
                                    items: [{
                                            icon: 'resources/images/icons/fam/delete.png',
                                            tooltip: 'Delete',
                                            scope: this,
                                            handler: this.onRemoveClick
                                        }]
                                }],
                            bbar: {
                                xtype: 'pagingtoolbar',
                                pageSize: itemsPerPage,
                                store: store_details,
                                displayInfo: true,
                                plugins: new Ext.ux.ProgressBarPager()
                            },
                            listeners: {
                                scope: this,
                                // selectionchange: this.onSelectionChange
                            }
                        }]
                },
                {
                    xtype: 'toolbar',
                    ui: 'footer',
                    dock: 'bottom',
                    border: '0',
                    items: ['->', {
                            text: 'Annuler',
                            id: 'btn_back',
                            iconCls: 'icon-clear-group',
                            scope: this,
                            handler: this.onbtnback
                        }, {
                            text: 'Imprimer',
                            id: 'btn_loturer',
                            iconCls: 'printer',
                            scope: this,
                            disabled: true,
                            handler: this.onbtncloturer
                        }]
                }]
        });
        this.callParent();
        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });
        Ext.getCmp('gridpanelID').on('edit', function(editor, e) {

            Ext.Ajax.request({
                method: 'PUT',
                headers: {'Content-Type': 'application/json'},
                url: url_services_etiquette_panier + '/' + encodeURIComponent(e.record.data.lg_ETIQUETTE_ID),
                params: Ext.JSON.encode({quantite: parseInt(e.record.data.int_NUMBER, 10)}),
                success: function(response)
                {
                    var object = Ext.JSON.decode(response.responseText, false);
                    if (!object.success) {
                        Ext.MessageBox.alert('Message', object.msg || 'L\'opération n\'a pas abouti.');
                        return;
                    }
                    e.record.commit();
                    var OGrid = Ext.getCmp('gridpanelID');
                    OGrid.getStore().reload();
                    Ext.getCmp('str_NAME').focus(true, 100, function() {
                        Ext.getCmp('str_NAME').setValue("");
                        Ext.getCmp('int_QUANTITE').setValue(1);
                    });



                }, failure: function(response)
                {
                    console.log("Bug " + response.responseText);
                    Ext.MessageBox.alert('Error Message', response.responseText);
                }
            });
        });
    },
    loadStore: function() {
        Ext.getCmp('gridpanelID').getStore().load({
            callback: this.onStoreLoad
        });
    },
    onStoreLoad: function() {
        var OGrid = Ext.getCmp('gridpanelID');
        // alert("Nombre d'element " + OGrid.getStore().getCount());
        if (OGrid.getStore().getCount() > 0) {
            Ext.getCmp('btn_loturer').enable();
        } else {
            Ext.getCmp('btn_loturer').disable();
        }
    },
    onbtncloturer: function(button) {
        if (parseInt(Ext.getCmp('int_NUMBER').getValue()) > 65 || parseInt(Ext.getCmp('int_NUMBER').getValue()) < 1) {
            Ext.MessageBox.show({
                title: 'Avertissement',
                width: 320,
                msg: 'Veuillez renseigner un nombre inférieur ou égal à 65 et supérieur à 0',
                buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING,
                fn: function(buttonId) {
                    if (buttonId === "ok") {
                        Ext.getCmp('int_NUMBER').focus(false, 100, function() {
                            this.setFieldStyle('border: 2px solid #C0C0C0; background: #FFFFFF;');
                        });
                    }
                }
            });

            return;
        }
        Ext.MessageBox.confirm('Message',
                'Confirmer l\'impression de ces etiquettes',
                function(btn) {
                    if (btn === 'yes') {
                        var linkUrl = url_services_etiquette_moteur_massif + "?etiquettes=EN_PREPARATION&int_NUMBER=" + Ext.getCmp('int_NUMBER').getValue();
                        window.open(linkUrl);
                        Me.onbtnback();
                    }
                });
    },
    onbtnback: function() {
        var xtype = "";
        xtype = "etiquette";
        testextjs.app.getController('App').onLoadNewComponentWithDataSource(xtype, "", "", "");
    },
    onRemoveClick: function(grid, rowIndex) {
        Ext.MessageBox.confirm('Message',
                'Confirmer la suppresssion de la ligne',
                function(btn) {
                    if (btn == 'yes') {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            method: 'DELETE',
                            url: url_services_etiquette_panier + '/' + encodeURIComponent(rec.get('lg_ETIQUETTE_ID')),
                            success: function(response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (!object.success) {
                                    Ext.MessageBox.alert('Message', object.msg || 'L\'opération n\'a pas abouti.');
                                    return;
                                }
                                grid.getStore().reload();

                            },
                            failure: function(response)
                            {

                                var object = Ext.JSON.decode(response.responseText, false);
                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);
                            }
                        });
                        return;
                    }
                });
    },
    /* onSelectionChange: function(model, records) {
     var rec = records[0];
     if (rec) {
     this.getForm().loadRecord(rec);
     }
     },*/
    onbtnadd: function() {
        testextjs.app.getController('App').ShowWaitingProcess();
        Ext.Ajax.request({
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            url: url_services_etiquette_panier,
            params: Ext.JSON.encode({
                produitId: Ext.getCmp('lg_FAMILLE_ID_VENTE').getValue(),
                quantite: parseInt(Ext.getCmp('int_QUANTITE').getValue(), 10)
            }),
            success: function(response)
            {
                testextjs.app.getController('App').StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                if (!object.success) {
                    Ext.MessageBox.alert('Message', object.msg || 'L\'opération n\'a pas abouti.');
                    return;
                }

                var OGrid = Ext.getCmp('gridpanelID');
                OGrid.getStore().reload();
                Ext.getCmp('str_NAME').focus(true, 100, function() {
                    Ext.getCmp('str_NAME').setValue("");
                    Ext.getCmp('int_QUANTITE').setValue(1);
                });
            },
            failure: function(response)
            {
                testextjs.app.getController('App').StopWaitingProcess();
                var object = Ext.JSON.decode(response.responseText, false);
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    }
});




