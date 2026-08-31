
/* global Ext */

Ext.define('testextjs.view.facturation.FactureProvisoire', {
    extend: 'Ext.panel.Panel',
    xtype: 'factureprovisoire',
    frame: true,
    title: 'Factures provisoires',
    requires: ['testextjs.controller.App'],
    scrollable: true,
    width: '98%',
    minHeight: 500,
    cls: 'custompanel',
    layout: {
        type: 'fit'
    },
    initComponent: function () {
        var groupesStore = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },

                        {name: 'libelle',
                            type: 'string'

                        }

                    ],
            autoLoad: false,
            pageSize: 9999,

            proxy: {
                type: 'ajax',
                url: '../api/v1/facturation/groupetierspayant',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        var searchstore = Ext.create('Ext.data.Store', {
            idProperty: 'lgTIERSPAYANTID',
            fields:
                    [
                        {name: 'lgTIERSPAYANTID',
                            type: 'string'

                        },

                        {name: 'strFULLNAME',
                            type: 'string'

                        }

                    ],
            autoLoad: false,
            pageSize: 999,
            proxy: {
                type: 'ajax',
                url: '../api/v1/client/tiers-payants',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        var store = Ext.create('Ext.data.Store', {
            idProperty: 'lgFACTUREID',
            fields:
                    [
                        {name: 'lgFACTUREID',
                            type: 'string'

                        },
                        {name: 'strLIBELLETYPETIERSPAYANT',
                            type: 'string'

                        },

                        {name: 'strCODECOMPTABLE',
                            type: 'string'

                        },
                        {name: 'dtDATEFACTURE',
                            type: 'string'

                        },
                        {name: 'periode',
                            type: 'string'

                        },

                        {name: 'dtDEBUTFACTURE',
                            type: 'string'

                        },
                        {name: 'dtFINFACTURE',
                            type: 'string'

                        },
                        {name: 'strCUSTOMER',
                            type: 'string'

                        },
                        {name: 'strFULLNAME',
                            type: 'string'

                        }, {name: 'dtCREATED',
                            type: 'string'

                        },

                        {name: 'nbDossier',
                            type: 'number'

                        },
                        {name: 'dblMONTANTBrut',
                            type: 'number'

                        },
                        {name: 'dblMONTANTFOFETAIRE',
                            type: 'number'

                        },
                        {name: 'dblMONTANTREMISE',
                            type: 'number'

                        },
                        {name: 'dblMONTANTCMDE',
                            type: 'number'

                        }

                    ],
            autoLoad: true,
            pageSize: 20,

            proxy: {
                type: 'ajax',
                url: '../api/v1/facturation/summary/provisoires',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });
        var me = this;
        Ext.applyIf(me, {
            dockedItems: [
                {xtype: 'toolbar',
                    dock: 'top',
//                padding: '8',
                    items: [
                        {
                            text: 'Créer',
                            scope: this,
                            iconCls: 'addicon',
                            itemId: 'newBtn',
                            handler: function () {
                                var xtype = "oneditfacture";
                                testextjs.app.getController('App').onRedirectTo(xtype, {});

                            }
                        }
                        , '-',

                        {
                            xtype: 'combobox',
                            itemId: 'tpCmb',
                            id: 'tpCmb',
                            flex: 2,
                            store: searchstore,
                            pageSize: 999,
                            valueField: 'lgTIERSPAYANTID',
                            displayField: 'strFULLNAME',
                            minChars: 2,
                            queryMode: 'remote',
                            enableKeyEvents: true,
                            emptyText: 'Selectionner tiers payant...',
                            listeners: {
                                select: me.doSearch

                            }

                        }, '-',
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Groupes tiers-payant ',
                            flex: 1,
                            labelWidth:130,
                            margin: '0 5 0 0',
                            itemId: 'groupTp',
                            id: 'groupTp',
                            store: groupesStore,
                            pageSize: 999,
                            valueField: 'id',
                            displayField: 'libelle',
                            typeAhead: true,
                            queryMode: 'remote',
                            minChars: 2,
                            emptyText: 'Sélectionnez un Groupe',
                            listeners: {
                                select: me.doSearch

                            }
                        }, '-',
                        {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            iconCls: 'searchicon',
                            hidden: true,
                            flex: 0.8,
                            scope: this,
                            itemId: 'btnSearch'
                        },
                        '->',
                        /* Suppression en masse : meme geste que le bouton de la ligne, sur les
                         * factures cochees. Grise tant que rien n'est coche. */
                        {
                            text: 'Supprimer la sélection',
                            id: 'btnSupprimerProvisoires',
                            itemId: 'btnSupprimerProvisoires',
                            iconCls: 'icon-delete',
                            tooltip: 'Supprimer les factures provisoires cochées',
                            disabled: true,
                            scope: this,
                            handler: this.onSupprimerSelection
                        },
                        /* Purge d'une periode entiere : la question annonce le nombre exact avant
                         * toute ecriture. */
                        {
                            text: 'Purger une période',
                            itemId: 'btnPurgerPeriode',
                            iconCls: 'vp-icone-vider',
                            tooltip: 'Supprimer toutes les factures provisoires d\'une période',
                            scope: this,
                            handler: this.onPurgerPeriode
                        }


                    ]
                }

            ],
            items: [
                {
                    xtype: 'gridpanel',
                    id: 'gridFactureProvi',
                    store: store,
                    viewConfig: {
                        forceFit: true,
                        columnLines: true

                    },

                    columns: [
                        {
                            header: 'P&eacute;riode',
                            dataIndex: 'periode',
                            flex: 1.2

                        },

                        {
                            header: 'Organisme',
                            dataIndex: 'strFULLNAME',
                            flex: 1.5
                        },
                        {
                            header: 'Nb dossier',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            dataIndex: 'nbDossier',
                            flex: 0.5
                        },
                        {
                            header: 'Montant Brut',
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right',
                            dataIndex: 'dblMONTANTBrut',
                            flex: 1
                        },
                        {
                            header: 'Montant Remise',
                            dataIndex: 'dblMONTANTREMISE',
                            flex: 0.7,
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right'
                        }, {
                            header: 'Montant Forfaitaire',
                            dataIndex: 'dblMONTANTFOFETAIRE',
                            flex: 0.7,
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right'
                        }, {
                            header: 'Montant.Net',
                            dataIndex: 'dblMONTANTCMDE',
                            flex: 1,
                            xtype: 'numbercolumn',
                            format: '0,000.',
                            align: 'right'
                        },
                        {
                            header: 'Date',
                            dataIndex: 'dtDATEFACTURE',
                            flex: 0.7

                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                icon: 'resources/images/icons/fam/delete.png',
                                tooltip: 'Editer le réglément',
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
                                    icon: 'resources/images/icons/fam/grid.png',
                                    tooltip: 'Detail Bordereau',
                                    scope: this,
                                    handler: this.viewdetailFacture

                                }]
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    getClass: function (v, meta, rec) {
                                        return 'printable';
                                    },
                                    getTip: function (v, meta, rec) {
                                        return 'Imprimer Bordereau ';
                                    },
                                    scope: this,
                                    handler: function (grid, rowIndex) {
                                        var rec = grid.getStore().getAt(rowIndex);
                                        var linkUrl = '../webservices/sm_user/facturation/ws_rp_facture_tiers_payant.jsp?lg_FACTURE_ID=' + rec.get('lgFACTUREID');
                                        me.onPrint(linkUrl, true);
//                                   
                                    }

                                }]
                        },

                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    getClass: function (v, meta, rec) {
                                        return 'excel';
                                    },
                                    getTip: function (v, meta, rec) {
                                        return 'Imprimer au format Excel';
                                    },
                                    scope: this,
                                    handler: function (grid, rowIndex) {
                                        var rec = grid.getStore().getAt(rowIndex);
                                        var linkUrl = '../invoiceServlet?action=exls&lg_FACTURE_ID=' + rec.get('lgFACTUREID');
                                        me.onPrint(linkUrl, false);

                                    }
                                }]
                        },
                        {
                            xtype: 'actioncolumn',
                            width: 30,
                            sortable: false,
                            menuDisabled: true,
                            items: [{
                                    getClass: function (v, meta, rec) {
                                        return 'word';
                                    },
                                    getTip: function (v, meta, rec) {
                                        return 'Imprimer au format Word';
                                    },
                                    scope: this,
                                    handler: function (grid, rowIndex) {
                                        var rec = grid.getStore().getAt(rowIndex);
                                        var linkUrl = '../invoiceServlet?action=docx&lg_FACTURE_ID=' + rec.get('lgFACTUREID');
                                        me.onPrint(linkUrl, false);
//                                        window.open(linkUrl);
                                    }
                                }]
                        }
                    ],
                    /* Cochage multiple pour la suppression en masse. « checkOnly » evite qu'un
                     * clic dans la ligne remplace la selection : on ne coche qu'avec la case.
                     * « pruneRemoved: false » garde les coches au changement de page. */
                    selModel: Ext.create('Ext.selection.CheckboxModel', {
                        mode: 'MULTI',
                        checkOnly: true,
                        pruneRemoved: false,
                        listeners: {
                            selectionchange: function (sm, selection) {
                                var bouton = Ext.getCmp('btnSupprimerProvisoires');
                                if (bouton) {
                                    bouton.setDisabled(!selection || selection.length === 0);
                                    bouton.setText(selection && selection.length
                                            ? 'Supprimer les ' + selection.length + ' sélectionnée(s)'
                                            : 'Supprimer la sélection');
                                }
                            }
                        }
                    }),
                    dockedItems: [

                        {
                            xtype: 'pagingtoolbar',
                            store: store,
                            dock: 'bottom',
                            displayInfo: true,
                            pageSize: 20,
                            listeners: {
                                beforechange: function (page, currentPage) {
                                    var myProxy = this.store.getProxy();
                                    myProxy.params = {
                                        codegroup: null,
                                        typetp: null,
                                        groupTp: null,
                                        tpid: null
                                    };
                                    myProxy.setExtraParam('codegroup', null);
                                    myProxy.setExtraParam('typetp', null);
                                    myProxy.setExtraParam('groupTp', Ext.getCmp('groupTp').getValue());
                                    myProxy.setExtraParam('tpid', Ext.getCmp('tpCmb').getValue());

                                }

                            }
                        }
                    ]

                }
            ]

        });
        me.callParent(arguments);
    },

    onPrint: function (url, modePdf) {
        var storeMODEL = Ext.create('Ext.data.Store', {
            idProperty: 'id',
            fields:
                    [
                        {name: 'id',
                            type: 'string'

                        },

                        {name: 'libelle',
                            type: 'string'

                        },
                        {name: 'valeur',
                            type: 'string'

                        }

                    ],
            autoLoad: true,
            pageSize: null,

            proxy: {
                type: 'ajax',
                url: '../api/v1/facturation/modelfacture',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }

            }

        });


        var form = Ext.create('Ext.window.Window',
                {

                    autoShow: true,
                    height: 150,
                    width: 450,
                    modal: true,
                    title: 'SELECTION DU MODEL  DE FACTURE A IMPRIMER',
                    closeAction: 'hide',
                    closable: true,
                    maximizable: false,
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
                                    text: 'Enregistrer',
                                    handler: function (btn) {
                                        var _this = btn.up('window'), _form = _this.down('form');
                                        if (_form.isValid()) {
                                            var values = _form.getValues();
                                            if (modePdf)
                                                window.open(url + '&modeId=' + values.modelId);
                                            else
                                                window.location = url + '&modeId=' + values.modelId;
                                        }
                                        form.destroy();

                                    }
                                },
                                {
                                    xtype: 'button',
                                    iconCls: 'cancelicon',
                                    handler: function (btn) {
                                        form.destroy();
                                    },
                                    text: 'Annuler'

                                }
                            ]
                        }
                    ],
                    items: [

                        {
                            xtype: 'form',

//                              anchor: '100%',
                            layout: 'fit',
                            items: [
                                {
                                    xtype: 'fieldset',

                                    layout: 'anchor',

                                    collapsible: false,
                                    title: 'Information tiers-payant complémentaires',
                                    items: [
                                        {
                                            xtype: 'combobox',
                                            name: 'modelId',

                                            anchor: '100%',
                                            store: storeMODEL,
                                            pageSize: 999,
                                            valueField: 'id',
                                            displayField: 'libelle',
                                            minChars: 2,
                                            queryMode: 'remote',
                                            enableKeyEvents: true,
                                            emptyText: 'Selectionner le modèle'


                                        }


                                    ]
                                }
                            ]
                        }

                    ]
                });

    },
    viewdetailFacture: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.sm_user.editfacture.action.detailTransactionTiersPayant({
            odatasource: rec.data,
            parentview: this,
            mode: "detail_transaction",
            titre: "Detail Bordereau [" + rec.get('strFULLNAME') + "]"
        });
    },
    doSearch: function () {

        Ext.getCmp('gridFactureProvi').getStore().load({
            params: {
                tpid: Ext.getCmp('tpCmb').getValue(),
                codegroup: null,
                typetp: null,
                groupTp: Ext.getCmp('groupTp').getValue()

            }

        });
    },
    /*
     * Recharge la liste avec les filtres en place, apres une suppression.
     *
     * Le cochage est vide d'abord : « pruneRemoved: false » le garde d'une page a l'autre, ce
     * qui est voulu, mais laisserait sinon accrochees des factures qui n'existent plus - le
     * bouton resterait actif et un second clic porterait sur du vide.
     */
    rechargerListe: function () {
        var grille = Ext.getCmp('gridFactureProvi');
        if (grille) {
            grille.getSelectionModel().deselectAll();
        }
        Ext.getCmp('gridFactureProvi').getStore().load({
            params: {
                tpid: Ext.getCmp('tpCmb').getValue(),
                codegroup: null,
                typetp: null,
                groupTp: Ext.getCmp('groupTp').getValue()
            }
        });
    },

    /*
     * Envoie une liste d'identifiants a supprimer et rend compte.
     *
     * Le serveur verifie chaque facture : une qui n'est plus provisoire est refusee et nommee.
     * On n'annonce donc jamais « supprimees » sans dire ce qui ne l'a pas ete.
     */
    supprimerFactures: function (ids, intitule) {
        var me = this;
        var attente = Ext.MessageBox.wait('Suppression en cours . . .', 'Veuillez patienter');
        Ext.Ajax.request({
            url: '../api/v1/facturation/provisoires/supprimer',
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            jsonData: Ext.encode({ids: ids}),
            success: function (reponse) {
                attente.hide();
                var r = Ext.decode(reponse.responseText, true) || {};
                if (!r.success) {
                    Ext.MessageBox.alert('Message', r.message || 'La suppression a échoué.');
                    return;
                }
                var texte = r.supprimees + ' facture(s) provisoire(s) supprimée(s)' + (intitule || '') + '.';
                var refusees = r.refusees || [];
                if (refusees.length) {
                    texte += '<br><br><b>' + refusees.length + ' non supprimée(s) :</b><ul>';
                    Ext.each(refusees.slice(0, 10), function (f) {
                        texte += '<li>' + (f.code || f.id) + ' — ' + f.motif + '</li>';
                    });
                    if (refusees.length > 10) {
                        texte += '<li>… et ' + (refusees.length - 10) + ' autre(s)</li>';
                    }
                    texte += '</ul>';
                }
                Ext.MessageBox.alert('Message', texte);
                me.rechargerListe();
            },
            failure: function () {
                attente.hide();
                Ext.MessageBox.alert('Message', 'La suppression a échoué.');
            }
        });
    },

    onSupprimerSelection: function () {
        var me = this;
        var grille = Ext.getCmp('gridFactureProvi');
        var lignes = grille.getSelectionModel().getSelection();
        if (!lignes.length) {
            Ext.MessageBox.alert('Message', 'Cochez au moins une facture.');
            return;
        }
        /* La question nomme le nombre ET la periode : c'est ce qui distingue une suppression
         * voulue d'un clic malheureux sur une grille de plusieurs pages. */
        var periodes = {};
        Ext.each(lignes, function (l) {
            periodes[l.get('periode') || '?'] = true;
        });
        var listePeriodes = Ext.Object.getKeys(periodes);
        var quellePeriode = listePeriodes.length === 1
                ? 'période <b>' + listePeriodes[0] + '</b>'
                : listePeriodes.length + ' périodes différentes';
        Ext.MessageBox.confirm('Confirmation',
                'Supprimer <b>' + lignes.length + ' facture(s) provisoire(s)</b> (' + quellePeriode + ')&nbsp;?'
                + '<br><span style="color:#666;">Les bons redeviennent facturables : générer une provisoire'
                + ' ne les engage pas.</span>',
                function (choix) {
                    if (choix !== 'yes') {
                        return;
                    }
                    me.supprimerFactures(Ext.Array.map(lignes, function (l) {
                        return l.get('lgFACTUREID');
                    }), '');
                });
    },

    /*
     * Purge d'une periode : on demande d'abord au serveur COMBIEN de factures elle contient, on
     * annonce ce nombre, et on ne supprime qu'apres confirmation. Les filtres de l'ecran
     * (organisme, groupe) s'appliquent, pour pouvoir purger un seul organisme si on veut.
     */
    onPurgerPeriode: function () {
        var me = this;
        var fenetre = Ext.create('Ext.window.Window', {
            title: 'Purger les factures provisoires d\'une période',
            modal: true, width: 470, bodyPadding: 12, layout: 'anchor',
            items: [{
                    xtype: 'form', itemId: 'formPurge', border: false,
                    items: [{
                            xtype: 'component',
                            html: '<div style="margin-bottom:10px;color:#333;">La purge porte sur les factures'
                                    + ' <b>provisoires</b> dont la période facturée — celle de la colonne'
                                    + ' « Période » — tient entièrement dans les dates ci-dessous, et sur les'
                                    + ' filtres actuellement posés (organisme, groupe).<br>'
                                    + '<span style="color:#666;">Une facture devenue définitive n\'est jamais'
                                    + ' supprimée.</span></div>'
                        }, {
                            xtype: 'datefield', name: 'debut', itemId: 'purgeDebut', anchor: '100%',
                            fieldLabel: 'Du', format: 'd/m/Y', allowBlank: false
                        }, {
                            xtype: 'datefield', name: 'fin', itemId: 'purgeFin', anchor: '100%',
                            fieldLabel: 'Au', format: 'd/m/Y', allowBlank: false
                        }]
                }],
            buttons: [{
                    text: 'Rechercher',
                    handler: function () {
                        var formulaire = fenetre.down('#formPurge').getForm();
                        if (!formulaire.isValid()) {
                            return;
                        }
                        var debut = fenetre.down('#purgeDebut').getValue();
                        var fin = fenetre.down('#purgeFin').getValue();
                        if (debut > fin) {
                            Ext.MessageBox.alert('Message', 'La date de début est postérieure à la date de fin.');
                            return;
                        }
                        var lisible = Ext.Date.format(debut, 'd/m/Y') + ' au ' + Ext.Date.format(fin, 'd/m/Y');
                        Ext.Ajax.request({
                            url: '../api/v1/facturation/provisoires/periode',
                            method: 'GET',
                            params: {
                                dtStart: Ext.Date.format(debut, 'Y-m-d'),
                                dtEnd: Ext.Date.format(fin, 'Y-m-d'),
                                tpid: Ext.getCmp('tpCmb').getValue(),
                                groupTp: Ext.getCmp('groupTp').getValue()
                            },
                            success: function (reponse) {
                                var r = Ext.decode(reponse.responseText, true) || {};
                                if (!r.success) {
                                    Ext.MessageBox.alert('Message', r.message || 'Recherche impossible.');
                                    return;
                                }
                                if (!r.total) {
                                    Ext.MessageBox.alert('Message',
                                            'Aucune facture provisoire du ' + lisible + '.');
                                    return;
                                }
                                Ext.MessageBox.confirm('Confirmation',
                                        'Supprimer <b>' + r.total + ' facture(s) provisoire(s)</b> du <b>'
                                        + lisible + '</b>, soit ' + r.dossiers + ' dossier(s) pour '
                                        + Ext.util.Format.number(r.montant || 0, '0,000') + ' F&nbsp;?',
                                        function (choix) {
                                            if (choix !== 'yes') {
                                                return;
                                            }
                                            fenetre.close();
                                            me.supprimerFactures(r.ids || [], ' du ' + lisible);
                                        });
                            },
                            failure: function () {
                                Ext.MessageBox.alert('Message', 'Recherche impossible.');
                            }
                        });
                    }
                }, {
                    text: 'Annuler', handler: function () { fenetre.close(); }
                }]
        });
        fenetre.show();
    },

    onRemoveClick: function (grid, rowIndex) {
        var me = this;
        Ext.MessageBox.confirm('Message',
            'confirmer la suppresssion',
            function (btn) {
                if (btn === 'yes') {
                    var rec = grid.getStore().getAt(rowIndex);
                    Ext.Ajax.request({
                        url: '../api/v1/facturation/'+rec.get('lgFACTUREID'),
                        method:'DELETE',

                        success: function (response)
                        {
                            // Meme rechargement que la suppression en masse : le cochage est
                            // vide au passage, pour ne pas garder une ligne qui n'existe plus.
                            me.rechargerListe();
                        }

                    });

                }
            });
    }
});


