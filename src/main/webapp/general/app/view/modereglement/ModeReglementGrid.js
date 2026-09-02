Ext.define('testextjs.view.modereglement.ModeReglementGrid', {
    extend: 'Ext.grid.Panel',
    alias: 'widget.modereglementgrid',
    requires: [
        'Ext.grid.feature.Grouping',
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*'
    ],
    frame: false,

    initComponent: function () {
        const store = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id', type: 'string'},
                        {name: 'name', type: 'string'},
                        {name: 'qrCode', type: 'auto'},
                        {name: 'typeReglementId', type: 'string'},
                        {name: 'mobileMoney', type: 'boolean'},
                        {name: 'clientDefautId', type: 'string'},
                        {name: 'clientDefautNom', type: 'string'}
                    ],
            autoLoad: true,
            pageSize: 20,

            proxy: {
                type: 'ajax',
                url: '../api/v1/modereglement/all',
                reader: {
                    type: 'json',
                    totalProperty: 'total',
                    root: 'data'
                }
            }

        });
        const me = this;
        Ext.applyIf(me, {

            store: store,
            viewConfig: {
                forceFit: true,
                emptyText: '<h1 style="margin:10px 10px 10px 30%;">Pas de donn&eacute;es</h1>'
            },
            columns: [

                {text: 'ID', dataIndex: 'id', hidden: true},
                {text: 'Nom', dataIndex: 'name', flex: 0.5},
                {
                    /* Point 7 : categorie du type (mobile money ou standard) */
                    text: 'Catégorie',
                    dataIndex: 'mobileMoney',
                    width: 120,
                    renderer: function (value) {
                        return value
                                ? '<span style="color:#1e7e34;font-weight:bold;">Mobile money</span>'
                                : 'Standard';
                    }
                },
                {
                    /* Lot 3 : client standard propose en selection rapide a la vente
                     * quand ce mode mobile money est choisi. */
                    text: 'Client par défaut (mobile money)',
                    dataIndex: 'clientDefautNom',
                    flex: 1,
                    renderer: function (value) {
                        return value
                                ? '<span style="color:#1e7e34;font-weight:bold;">' + value + '</span>'
                                : '<span style="color:#999;">aucun</span>';
                    }
                },

                {
                    text: 'QR Code',
                    dataIndex: 'qrCode',
                    flex: 1.5,
                    renderer: function (value) {
                        if (value && Array.isArray(value) && value.length > 0) {
                            const uint8Array = new Uint8Array(value);
                            const blob = new Blob([uint8Array], {type: 'image/png'});
                            const imgId = 'img_' + Math.random().toString(36).substr(2, 9);
                            const reader = new FileReader();
                            reader.onload = function (e) {
                                const imgEl = document.getElementById(imgId);
                                if (imgEl) {
                                    imgEl.src = e.target.result;
                                }
                            };
                            reader.readAsDataURL(blob);
                            return '<img id="' + imgId + '" height="50" style="border-radius:4px;"/>';

                        }
                        return '';
                    }
                },

                {
                    /* Lot 3 : associer/retirer le client standard par defaut du mode */
                    xtype: 'actioncolumn',
                    width: 40,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/add16.gif',
                            tooltip: 'Associer le client par défaut (mobile money)',
                            handler: function (view, rowIndex, colIndex, item, e, rec, row) {
                                const grid = this.up('grid');
                                const storeClients = Ext.create('Ext.data.Store', {
                                    model: 'testextjs.model.caisse.ClientLambda',
                                    autoLoad: false,
                                    pageSize: 20,
                                    proxy: {
                                        type: 'ajax',
                                        url: '../api/v1/client/lambda',
                                        reader: {type: 'json', root: 'data', totalProperty: 'total'}
                                    }
                                });
                                const win = Ext.create('Ext.window.Window', {
                                    title: 'Client par défaut — ' + rec.get('name'),
                                    modal: true,
                                    width: 560,
                                    bodyPadding: 10,
                                    items: [{
                                            xtype: 'combobox',
                                            itemId: 'clientDefautCombo',
                                            fieldLabel: 'Client',
                                            labelWidth: 60,
                                            width: 520,
                                            store: storeClients,
                                            valueField: 'lgCLIENTID',
                                            displayField: 'strFIRSTNAME',
                                            queryMode: 'remote',
                                            queryParam: 'query',
                                            minChars: 2,
                                            emptyText: 'Rechercher un client standard (2 caractères)...',
                                            listConfig: {
                                                getInnerTpl: function () {
                                                    return '<span>{strFIRSTNAME} {strLASTNAME} — {strADRESSE}</span>';
                                                }
                                            },
                                            listeners: {
                                                afterrender: function (cmp) {
                                                    cmp.focus(true, 100);
                                                }
                                            }
                                        }],
                                    buttons: [
                                        {
                                            text: 'Associer',
                                            handler: function () {
                                                const clientId = win.down('#clientDefautCombo').getValue();
                                                if (!clientId) {
                                                    Ext.Msg.alert('Message', 'Veuillez choisir le client');
                                                    return;
                                                }
                                                Ext.Ajax.request({
                                                    method: 'POST',
                                                    url: '../api/v1/modereglement/client-defaut/' + rec.get('id')
                                                            + '?clientId=' + encodeURIComponent(clientId),
                                                    success: function () {
                                                        win.destroy();
                                                        grid.getStore().reload();
                                                    }
                                                });
                                            }
                                        },
                                        {
                                            text: 'Retirer',
                                            hidden: !rec.get('clientDefautId'),
                                            handler: function () {
                                                Ext.Ajax.request({
                                                    method: 'POST',
                                                    url: '../api/v1/modereglement/client-defaut/' + rec.get('id')
                                                            + '?clientId=',
                                                    success: function () {
                                                        win.destroy();
                                                        grid.getStore().reload();
                                                    }
                                                });
                                            }
                                        },
                                        {
                                            text: 'Fermer',
                                            handler: function () {
                                                win.destroy();
                                            }
                                        }
                                    ]
                                });
                                win.show();
                            }
                        }]
                },
                {
                    xtype: 'actioncolumn',
                    width: 60,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/page_white_edit.png',
                            tooltip: 'Ajouter un QR Code',
                            handler: function (view, rowIndex, colIndex, item, e, rec, row) {
                                const grid = this.up('grid');

                                const win = Ext.create('Ext.window.Window', {
                                    title: 'Ajouter un QR Code',
                                    width: 400,
                                    height: 160,
                                    layout: 'fit',
                                    items: [
                                        {
                                            xtype: 'form',
                                            fileUpload: true,
                                            bodyPadding: 15,
                                            items: [
                                                {
                                                    width: '100%',
                                                    xtype: 'filefield',
                                                    name: 'file',
                                                    fieldLabel: 'QR Code',
                                                    allowBlank: false,
                                                    accept: 'image/*',
                                                    buttonText: 'Choisir une image...'
                                                },
                                                {
                                                    xtype: 'hiddenfield',
                                                    name: 'id',
                                                    allowBlank: false,
                                                    value: rec.get('id')


                                                }
                                            ],
                                            buttons: [
                                                {
                                                    xtype: 'button',
                                                    text: 'Annuler',
                                                    handler: function () {
                                                        win.destroy();
                                                    }

                                                },
                                                {
                                                    formBind: true,
                                                    text: 'Envoyer',
                                                    handler: function () {
                                                        const form = this.up('form').getForm();
                                                        if (form.isValid()) {
                                                            form.submit({
                                                                clientValidation: true,
                                                                url: '../modeReglementQrCode',
                                                                scope: this,
                                                                waitMsg: 'Envoi du QR code...',
                                                                success: function (fp, o) {
                                                                    console.log(fp, o);
                                                                    Ext.Msg.alert('Succès', 'QR code ajouté avec succès.');
                                                                    win.close();
                                                                    grid.getStore().reload();
                                                                },
                                                                failure: function (fp, o) {
                                                                    win.close();
                                                                    grid.getStore().reload();
                                                                }
                                                            });
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    ]
                                });
                                win.show();
                            }
                        }
                    ]


                }
            ]

        });
        this.callParent();
    }

});
