/* ECRAN DUPLIQUE - « vente en depot ».
 *
 * Copie de vente/VenteView.js, orientee « je suis dans le depot ».
 * L'officine a demande que l'ecran de vente de tous les jours ne soit pas touche : cet ecran est
 * donc une duplication, pas une variante. Consequence a connaitre : une correction portee sur
 * vente/VenteView.js doit etre reportee ici.
 *
 * Le xtype est distinct pour que les selecteurs du controleur de l'officine ne rencontrent
 * jamais cet ecran, et inversement.
 */
/* global Ext */

Ext.define('testextjs.view.vente.endepot.VenteEnDepotView', {
    extend: 'Ext.panel.Panel',
    xtype: 'doventeendepot',
    requires: [
        'testextjs.view.vente.VenteVNO'
    ],
    config: {
        data: null
    },
    frame: true,
    /* 99% : évite le scroll horizontal quand l'ascenseur vertical apparaît ;
     * le fond plat unifié rend l'écart invisible */
    width: '99%',
    height: 'auto',
    minHeight: 570,
    cls: 'custompanel vp-shell vp-focus-zone',
    
    title: 'VENTE EN DEPÔT',
    
    header: {
        titlePosition: 0,
        items: [{
            xtype: 'button',
            itemId: 'btnPointMobileMoney',
            text: 'POINT MOBILE MONEY',
            cls: 'btn-primarya',
            tooltip: 'Point du jour des encaissements mobile money + carte bancaire de la caissi&egrave;re connect&eacute;e',
            hidden: true,
            margin: '0 5 0 0',
            handler: function (btn) {
                btn.up('doventeendepot').showPointMobileMoney();
            }
        }, {
            xtype: 'textfield',
            itemId: 'preventeSearchField',
            emptyText: 'N° ticket / scan',
            width: 220,
            enableKeyEvents: true,
            /* contenu présélectionné quand on revient dans le champ
             * (clic ou F3) : la nouvelle saisie écrase l'ancienne */
            selectOnFocus: true,
            listeners: {
                afterrender: function (f) {
                    f.inputEl.on('mouseup', function () {
                        // différé : le mouseup natif replace le curseur et
                        // annulerait une sélection immédiate
                        Ext.defer(function () {
                            if (!f.destroyed) {
                                f.selectText();
                            }
                        }, 10);
                    });
                }
            },
            margin: '0 5 0 0'
        }, /*{
            xtype: 'button',
            itemId: 'preventeSearchBtn',
            text: 'VENTES EN ATTENTE',
            cls: 'btn-primarya',
            scope: this,
            iconCls: 'btn-prevente',
            margin: '0 0 0 5'
        },*/
        {
         xtype: 'button',
         text: 'VENTES EN ATTENTE',
         scope: this,
         itemId: 'preventeSearchBtn',
         cls: 'btn-primarya',
         iconCls: 'searchicon'
        }
    ]
    },

    layout: {
        type: 'vbox',
        align: 'stretch',
        padding: 10
    },
    
    listeners: {
        afterrender: function() {
            this.initKeyboardShortcut();
            this.loadPointMobileMoneyPrivilege();
        },
        destroy: function() {
            this.cleanupKeyboardShortcut();
        }
    },

    // Affiche le bouton 'POINT MOBILE MONEY' uniquement si l'utilisateur detient
    // le privilege 'Autorisation Point mobile money caisse' (controle aussi cote serveur).
    loadPointMobileMoneyPrivilege: function () {
        var me = this;
        Ext.Ajax.request({
            url: '../api/v1/caisse/point-mobile-money/autorisation',
            method: 'GET',
            success: function (response) {
                var o = Ext.JSON.decode(response.responseText, true) || {};
                var btn = me.down('#btnPointMobileMoney');
                if (btn && o.authorize === true) {
                    btn.setVisible(true);
                }
            }
        });
    },

    // Point du jour (utilisateur connecte uniquement) : montants et nombre de
    // ventes par mode mobile money + carte bancaire, avec total general.
    showPointMobileMoney: function () {
        var me = this;
        // A la fermeture du point, le choix produit reprend le focus.
        var focusProduit = function () {
            var f = me.down('#produit');
            if (f) {
                f.focus(true, 100);
            }
        };
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Point mobile money');
        Ext.Ajax.request({
            url: '../api/v1/caisse/point-mobile-money',
            method: 'GET',
            success: function (response) {
                progress.hide();
                var o = Ext.JSON.decode(response.responseText, true) || {};
                if (o.success !== true) {
                    Ext.MessageBox.show({title: 'Point mobile money', width: 420,
                        msg: o.message || 'Impossible de charger le point mobile money.',
                        buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.WARNING, fn: focusProduit});
                    return;
                }
                var fmt = function (v) {
                    return Ext.util.Format.number(v || 0, '0,000.');
                };
                var rows = '';
                Ext.Array.each(o.data || [], function (r) {
                    rows += '<tr><td style="padding:4px 8px;">' + Ext.String.htmlEncode(r.libelle || '') + '</td>'
                            + '<td style="padding:4px 8px;text-align:right;font-weight:bold;">'
                            + fmt(r.montant) + ' fcfa</td>'
                            + '<td style="padding:4px 8px;text-align:right;">' + fmt(r.nbVentes)
                            + ' vente(s)</td></tr>';
                });
                var html = '<table style="width:100%;border-collapse:collapse;font-size:13px;">'
                        + rows
                        + '<tr style="border-top:2px solid #444;"><td style="padding:6px 8px;font-weight:bold;">TOTAL GENERAL</td>'
                        + '<td style="padding:6px 8px;text-align:right;font-weight:bold;">'
                        + fmt(o.totalMontant) + ' fcfa</td>'
                        + '<td style="padding:6px 8px;text-align:right;font-weight:bold;">'
                        + fmt(o.totalVentes) + ' vente(s)</td></tr>'
                        + '</table>';
                Ext.create('Ext.window.Window', {
                    title: 'Point mobile money du jour - ' + Ext.Date.format(new Date(), 'd/m/Y'),
                    modal: true,
                    width: 440,
                    autoShow: true,
                    bodyPadding: 10,
                    html: html,
                    listeners: {
                        close: focusProduit
                    },
                    buttons: [{
                            text: 'Fermer',
                            handler: function (b) {
                                b.up('window').close();
                            }
                        }]
                });
            },
            failure: function () {
                progress.hide();
                Ext.MessageBox.show({title: 'Point mobile money', width: 380, msg: 'Erreur de serveur',
                    buttons: Ext.MessageBox.OK, icon: Ext.MessageBox.ERROR, fn: focusProduit});
            }
        });
    },
    
    initKeyboardShortcut: function() {
        var me = this;
        
        // Fonction pour gérer le raccourci clavier
        me.keyHandler = function(e) {
            // Ctrl+F ou Cmd+F (Mac)
            if ((e.ctrlKey || e.metaKey) && e.keyCode === 70) {
                e.preventDefault();
                e.stopPropagation();
                me.focusSearchField();
                return false;
            }
            // F3
            if (e.keyCode === 114) {
                e.preventDefault();
                e.stopPropagation();
                me.focusSearchField();
                return false;
            }
        };
        
        // Ajouter l'écouteur d'événements au document
        Ext.getDoc().on('keydown', me.keyHandler);
    },
    
    cleanupKeyboardShortcut: function() {
        var me = this;
        if (me.keyHandler) {
            Ext.getDoc().un('keydown', me.keyHandler);
            me.keyHandler = null;
        }
    },
    
    focusSearchField: function() {
        var searchField = this.down('#preventeSearchField');
        if (searchField) {
            searchField.focus(true, true); // focus et sélection du texte
        }
    },
    
    initComponent: function () {
        var natureventeStore = new Ext.data.Store({
            model: 'testextjs.model.caisse.Nature',
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/natures',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        var typeventeStore = new Ext.data.Store({
            model: 'testextjs.model.caisse.TypeVente',
            pageSize: null,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/typeventes',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        var storeUser = new Ext.data.Store({
            model: 'testextjs.model.caisse.User',
            pageSize: 100,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: '../api/v1/common/users',
                extraParams: {excludeAdmin: true},
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            }
        });
        var me = this;
        var data = me.getData();
        if (data.isEdit) {
            var record = data.record;
        } else {
            // L'ecran annonce d'emblee qu'on est en depot : c'est le seul repere visuel entre cet ecran et
            // celui de l'officine, qui lui ressemble trait pour trait. Le controleur y ajoute le nom du
            // depot des qu'il est choisi (resetTitle).
            me.title = 'VENTE EN D\u00c9P\u00d4T \u2013 VENTE AU COMPTANT';
        }
        // Depots d'extension actifs. La ressource ne rend que les emplacements de type depot d'extension :
        // l'officine elle-meme n'y figure pas, on ne peut donc pas « vendre en depot » a l'officine.
        var depotExtensionStore = new Ext.data.Store({
            fields: [
                {name: 'id', type: 'string'},
                {name: 'nom', type: 'string'},
                {name: 'localite', type: 'string'},
                {name: 'responsable', type: 'string'}
            ],
            pageSize: null,
            autoLoad: true,
            proxy: {
                type: 'ajax',
                url: '../api/v1/depot-extension/depots',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            }
        });
        Ext.applyIf(me, {

            items: [
                {
                    xtype: 'fieldset',
                    title: '<span style="color:blue;">CHOISIR LE DÉPÔT, LE TYPE /LA NATURE DE VENTE ET LE VENDEUR</span>',
                    collapsible: false,
                    defaultType: 'textfield',
                    cls: 'background_gray',
                    layout: 'anchor',
                    defaults: {
                        anchor: '100%'
                    },

                    items: [
                        {
                            xtype: 'container',
                            layout: 'hbox',
                            margin: '0 0 5 0',
                            height: 35,
                            style: 'padding-bottom:3px;',
                            defaultType: 'textfield',
                            items: [
                                {
                                    // Depot de la vente. Il est demande AVANT tout le reste : la saisie se joue
                                    // « comme si on etait dans le depot », donc on ne saisit rien tant que le lieu
                                    // n'est pas connu. Il est redemande a chaque vente (choix de l'officine).
                                    xtype: 'combobox',
                                    itemId: 'depotVente',
                                    store: depotExtensionStore,
                                    editable: false,
                                    flex: 2,
                                    margin: '0 15 0 0',
                                    height: 30,
                                    valueField: 'id',
                                    displayField: 'nom',
                                    typeAhead: false,
                                    queryMode: 'local',
                                    allowBlank: false,
                                    fieldStyle: 'font-weight:bold;',
                                    emptyText: 'Choisir le d\u00e9p\u00f4t...',
                                    listConfig: {
                                        getInnerTpl: function () {
                                            return '<tpl for="."><b>{nom}</b>'
                                                    + '<tpl if="localite"> <span style="color:#666;">- {localite}</span></tpl>'
                                                    + '<tpl if="responsable"> <span style="float:right;color:#888;">{responsable}</span></tpl>'
                                                    + '</tpl>';
                                        }
                                    }
                                },
                                {
                                    xtype: 'combobox',
                                    itemId: 'typeVente',
                                    store: typeventeStore,
                                    editable:false,
                                    flex: 2,
                                    margin: '0 15 0 0',
                                    height: 30,
                                    valueField: 'lgTYPEVENTEID',
                                    displayField: 'strNAME',
                                    typeAhead: false,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un type de vente...'

                                },

                                {
                                    xtype: 'combobox',
                                    itemId: 'nature',
                                    store: natureventeStore,
                                    editable:false,
                                    flex: 2,
                                    height: 30,
                                    margin: '0 15 0 0',
                                    valueField: 'lgNATUREVENTEID',
                                    displayField: 'strLIBELLE',
                                    typeAhead: false,
                                    queryMode: 'remote',
                                    emptyText: 'Selectionner la nature ...'

                                },
                                {
                                    xtype: 'combobox',
                                    itemId: 'user',
                                    store: storeUser,
                                    pageSize: null,
                                    valueField: 'lgUSERID',
                                    displayField: 'fullName',
                                    typeAhead: false,
                                    flex: 2,
                                    height: 30,
                                    minChars: 2,
                                    queryMode: 'remote',
                                    emptyText: 'Choisir un vendeur...'

                                }

                            ]
                        }
                    ]
                },

                {
                    xtype: 'container',
                    layout: 'anchor',
                    itemId: 'contenu'

                }

            ]

        });
        me.callParent(arguments);
    }
});