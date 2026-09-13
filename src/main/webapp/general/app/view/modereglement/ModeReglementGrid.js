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
                        {name: 'clientRequis', type: 'boolean'},
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
                    /* Point 12 : c'est ce reglage, et non plus une liste dans le code de l'ecran de
                     * vente, qui decide si choisir ce mode ouvre le parcours « choisir ou creer un
                     * client ». Un mode mobile money l'exige toujours. */
                    xtype: 'checkcolumn',
                    text: 'Client requis',
                    dataIndex: 'clientRequis',
                    width: 110,
                    listeners: {
                        checkchange: function (colonne, rang, coche) {
                            const enregistrement = colonne.up('grid').getStore().getAt(rang);
                            Ext.Ajax.request({
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                url: '../api/v1/modereglement/client-requis/' + enregistrement.get('id')
                                        + '?requis=' + (coche ? 'true' : 'false'),
                                callback: function (opts, succes, reponse) {
                                    let json = {};
                                    try {
                                        json = Ext.decode(reponse.responseText);
                                    } catch (e) {
                                    }
                                    if (!json.success) {
                                        // La case revient a son etat precedent : elle ne doit pas
                                        // laisser croire a un reglage qui n'a pas ete enregistre.
                                        enregistrement.set('clientRequis', !coche);
                                        enregistrement.commit();
                                        Ext.Msg.alert('Message', json.msg || "L'enregistrement a échoué");
                                    }
                                }
                            });
                        }
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
                                            xtype: 'fieldset',
                                            title: 'Choisir un client existant',
                                            padding: 8,
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
                                        }]
                                        }, {
                                            /*
                                             * Creer le client standard SUR PLACE.
                                             *
                                             * Le client par defaut d'un mode mobile money n'existe
                                             * generalement pas encore quand on cree le mode : il
                                             * fallait sortir d'ici, aller le creer dans un autre
                                             * ecran, puis revenir associer. Les trois champs
                                             * indispensables suffisent, le reste de la fiche
                                             * n'ayant pas de sens pour un client de passage.
                                             */
                                            xtype: 'fieldset',
                                            title: 'ou créer un nouveau client standard',
                                            padding: 8,
                                            defaults: {labelWidth: 60, width: 500},
                                            items: [
                                                {
                                                    xtype: 'textfield', itemId: 'nouveauNom',
                                                    fieldLabel: 'Nom', emptyText: 'NOM de famille'
                                                },
                                                {
                                                    xtype: 'textfield', itemId: 'nouveauPrenoms',
                                                    fieldLabel: 'Prénoms'
                                                },
                                                {
                                                    xtype: 'textfield', itemId: 'nouveauTelephone',
                                                    fieldLabel: 'Téléphone'
                                                },
                                                {
                                                    xtype: 'button', text: 'Créer et associer',
                                                    iconCls: 'addicon', margin: '6 0 0 65',
                                                    handler: function () {
                                                        const nom = (win.down('#nouveauNom').getValue() || '').trim();
                                                        const prenoms = (win.down('#nouveauPrenoms').getValue()
                                                                || '').trim();
                                                        const tel = (win.down('#nouveauTelephone').getValue()
                                                                || '').trim();
                                                        if (!nom) {
                                                            Ext.Msg.alert('Message',
                                                                    'Le nom est obligatoire.');
                                                            return;
                                                        }
                                                        const attente = Ext.MessageBox.wait(
                                                                'Cr&eacute;ation du client . . .',
                                                                'Veuillez patienter');
                                                        Ext.Ajax.request({
                                                            method: 'POST',
                                                            headers: {'Content-Type': 'application/json'},
                                                            url: '../api/v1/client/add/lambda',
                                                            // Le NOM va dans strFIRSTNAME et les
                                                            // PRENOMS dans strLASTNAME : c'est
                                                            // l'ordre de cette base, a l'inverse de
                                                            // ce que les noms de champs suggerent.
                                                            params: Ext.JSON.encode({
                                                                strFIRSTNAME: nom,
                                                                strLASTNAME: prenoms,
                                                                strADRESSE: tel,
                                                                // Type OBLIGATOIRE : sans lui, la
                                                                // creation echoue cote base sur
                                                                // une contrainte de cle etrangere
                                                                // et l'ecran ne recoit qu'un
                                                                // « erreur interne ». 6 est le
                                                                // type du client standard, celui
                                                                // que pose le formulaire de vente.
                                                                lgTYPECLIENTID: '6'
                                                            }),
                                                            callback: function () {
                                                                attente.hide();
                                                            },
                                                            success: function (reponse) {
                                                                const res = Ext.JSON.decode(
                                                                        reponse.responseText, true) || {};
                                                                const cree = (res.data && res.data.length)
                                                                        ? res.data[0] : res.data;
                                                                if (!res.success || !cree
                                                                        || !cree.lgCLIENTID) {
                                                                    Ext.Msg.alert('Message',
                                                                            res.msg || 'La cr&eacute;ation du '
                                                                            + 'client a &eacute;chou&eacute;.');
                                                                    return;
                                                                }
                                                                // Cree PUIS associe, dans la foulee :
                                                                // s'arreter apres la creation
                                                                // obligerait a le rechercher pour
                                                                // faire ce qu'on venait faire.
                                                                Ext.Ajax.request({
                                                                    method: 'POST',
                                                                    headers: {
                                                                        'Content-Type': 'application/json'
                                                                    },
                                                                    url: '../api/v1/modereglement/client-defaut/'
                                                                            + rec.get('id') + '?clientId='
                                                                            + encodeURIComponent(cree.lgCLIENTID),
                                                                    success: function () {
                                                                        win.destroy();
                                                                        grid.getStore().reload();
                                                                    },
                                                                    failure: function () {
                                                                        Ext.Msg.alert('Message',
                                                                                'Le client a &eacute;t&eacute; '
                                                                                + 'cr&eacute;&eacute; mais '
                                                                                + 'l\'association a '
                                                                                + '&eacute;chou&eacute;.');
                                                                    }
                                                                });
                                                            },
                                                            failure: function () {
                                                                Ext.Msg.alert('Message',
                                                                        'La cr&eacute;ation du client a '
                                                                        + '&eacute;chou&eacute;.');
                                                            }
                                                        });
                                                    }
                                                }
                                            ]
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
                                                    headers: {'Content-Type': 'application/json'},
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
                                                    headers: {'Content-Type': 'application/json'},
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
