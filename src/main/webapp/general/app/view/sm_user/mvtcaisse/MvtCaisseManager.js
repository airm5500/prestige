
var url_services_data_utilisateur = '../webservices/sm_user/utilisateur/ws_data.jsp';

var Me;

/*
 * Le journal de caisse ne montre que trois natures d'operation : les entrees de caisse, les
 * sorties de caisse et les reglements tiers payant. Tout le reste - fonds de caisse, ventes,
 * acomptes, avoirs, reglements differes - relevait d'autres ecrans et encombrait celui-ci.
 *
 * La reconnaissance se fait sur le LIBELLE et non sur l'identifiant, qui n'est pas garanti d'une
 * officine a l'autre. « 1/3 » distingue les reglements tiers payant des reglements differes, dont
 * le libelle contient aussi le mot « reglement ».
 */
function estTypeDuJournal(libelle) {
    const l = (libelle || '').toLowerCase();
    return (l.indexOf('entree') !== -1 && l.indexOf('caisse') !== -1)
            || (l.indexOf('sortie') !== -1 && l.indexOf('caisse') !== -1)
            || l.indexOf('1/3') !== -1;
}

/*
 * Ce que l'ecran envoie au serveur : le type choisi dans la liste deroulante, ou les trois types
 * du journal quand aucun n'est choisi. Le service accepte une liste separee par des virgules.
 */
function typesDemandes() {
    const combo = Ext.getCmp('typeMvtFiltre');
    if (!combo) {
        return '';
    }
    const choisi = combo.getValue();
    if (choisi) {
        return choisi;
    }
    // Le magasin de la liste deroulante est deja reduit aux trois types du journal : on reprend
    // ses identifiants tels quels. Il est lu depuis le combo, seul point d'acces disponible aux
    // methodes de la vue, qui sont hors de la portee ou le magasin est declare.
    const ids = [];
    combo.getStore().each(function (rec) {
        if (estTypeDuJournal(rec.get('str_NAME'))) {
            ids.push(rec.get('lg_TYPE_MVT_CAISSE_ID'));
        }
    });
    return ids.join(',');
}


Ext.util.Format.decimalSeparator = ',';
Ext.util.Format.thousandSeparator = '.';
function amountformat(val) {
    return Ext.util.Format.number(val, '0,000.');
}

function amountformatbis(val) {
    return amountformat(val) + " F CFA";
}

Ext.define('testextjs.view.sm_user.mvtcaisse.MvtCaisseManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'mvtcaissemanager',
    id: 'mvtcaissemanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'testextjs.view.sm_user.mvtcaisse.action.Detail',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    title: 'Liste Des Mouvements De Caisse',
    closable: false,
    frame: true,
    initComponent: function () {

        const itemsPerPage = 20;
        Me = this;

        const store = Ext.create('Ext.data.Store', {
            fields: [{name: 'id', type: 'string'},
                {name: 'userAbrName', type: 'string'},
                {name: 'tiket', type: 'string'},
                {name: 'dateOpreration', type: 'string'},
                {name: 'heureOpreration', type: 'string'},
                {name: 'modeReglement', type: 'string'},
                {name: 'montant', type: 'int'},
                {name: 'typeMvtCaisse', type: 'string'},
                {name: 'numCompte', type: 'string'}

            ],
            autoLoad: false,
            pageSize: itemsPerPage,

            proxy: {
                type: 'ajax',
                url: '../api/v1/caisse/mvts-others',
                timeout: 2400000,
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'

                }

            }
        });



        const storeUser = new Ext.data.Store({
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

        const storeTypeMvt = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.TypeEcartMvt',
            autoLoad: true,
            pageSize: 999999,
            proxy: {
                type: 'ajax',
                url: '../api/v1/typeMvtCaisse/list',
                reader: {
                    type: 'json',
                    root: 'data',
                    totalProperty: 'total'
                }
            },
            listeners: {
                /* Le journal ne retient que trois types : entrees de caisse, sorties de caisse et
                 * reglements tiers payant. La liste deroulante ne propose donc qu'eux - laisser
                 * choisir un type que la liste n'affiche pas ne menerait qu'a un ecran vide. */
                load: function (store) {
                    store.filterBy(function (rec) {
                        return estTypeDuJournal(rec.get('str_NAME'));
                    });
                    // Les types ne sont connus qu'apres cet appel : la premiere liste a pu partir
                    // sans filtre, on la redemande une fois - et une seule, le magasin ne se
                    // chargeant qu'a l'ouverture de l'ecran.
                    if (Me && Me.onRechClick) {
                        Me.onRechClick();
                    }
                }
            }
        });


        Ext.apply(this, {
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top', items: [
                        {
                            text: 'Créer',
                            tooltip: 'Cr&eacute;er',
                            scope: this,
                            iconCls: 'addicon',
                            handler: this.onAddClick
                        },
                        {
                            xtype: 'datefield',
                            fieldLabel: 'Du',
                            name: 'dt_debut',
                            id: 'dt_debut_journal',
                            allowBlank: false,
                            margin: '0 10 0 0',
                            submitFormat: 'Y-m-d',
                            flex: 1,
                            labelWidth: 50,
                            maxValue: new Date(),
                            value: new Date(),
                            format: 'd/m/Y'

                        }, {
                            xtype: 'datefield',
                            fieldLabel: 'Au',
                            name: 'dt_fin',
                            id: 'dt_fin_journal',
                            allowBlank: false,
                            labelWidth: 50,
                            flex: 1,
                            maxValue: new Date(),
                            value: new Date(),
                            margin: '0 9 0 0',
                            submitFormat: 'Y-m-d',
                            format: 'd/m/Y'

                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Type',
                            id: 'typeMvtFiltre',
                            labelWidth: 35,
                            flex: 1,
                            margin: '0 9 0 0',
                            store: storeTypeMvt,
                            valueField: 'lg_TYPE_MVT_CAISSE_ID',
                            displayField: 'str_NAME',
                            queryMode: 'local',
                            editable: false,
                            emptyText: 'Tous les types...',
                            listeners: {
                                select: function () {
                                    Me.onRechClick();
                                }
                            }
                        },
                        {
                            xtype: 'combobox',
                            fieldLabel: 'Utilisateur',
                            name: 'lg_USER_ID',
                            id: 'lg_USER_ID',
                            hidden: false,
                            store: storeUser,
                            pageSize: 20, //ajout la barre de pagination
                            valueField: 'lg_USER_ID',
                            displayField: 'str_FIRST_NAME',
                            typeAhead: true,
                            queryMode: 'remote',
                            enableKeyEvents: true,
                            emptyText: 'Choisir un utilisateur...'
                        }, {
                            text: 'rechercher',
                            tooltip: 'rechercher',
                            scope: this,
                            iconCls: 'searchicon',
                            handler: this.onRechClick
                        },

                        , {
                            xtype: 'tbseparator'
                        }


                        ,
                        {
                            width: 100,
                            xtype: 'button',
                            text: 'Imprimer',
                            iconCls: 'printable',

                            handler: this.onPdfPrint

                        }
                    ]
                }],

            width: '98%',
            height: 580,
            id: 'gridmvtcaisseid',

            store: store,
            columns: [{
                    header: 'Type Mouvement',
                    dataIndex: 'typeMvtCaisse',
                    flex: 1
                }, {
                    header: 'Num&eacute;ro Comptable',
                    dataIndex: 'numCompte',
                    flex: 1
                }, {
                    header: 'Reference',
                    dataIndex: 'tiket',
                    flex: 1
                },
                {
                    header: 'Op&eacute;rateur',
                    dataIndex: 'userAbrName',
                    flex: 1
                }, {
                    header: 'Date',
                    dataIndex: 'dateOpreration',
                    flex: 0.7
                }, {
                    header: 'Heure',
                    dataIndex: 'heureOpreration',
                    flex: 0.7

                }, {
                    header: 'Mode.R&egrave;glement',
                    dataIndex: 'modeReglement',
                    flex: 1
                }, {
                    header: 'Montant',
                    dataIndex: 'montant',
                    align: 'right',
                    renderer: function (v, metaData, record) {
                        if (v < 0) {
                            metaData['style'] = 'color:red;';
                            v = Ext.util.Format.number((-1) * v, '0,000.');
                            return '-' + v;
                        } else {

                            return Ext.util.Format.number(v, '0,000.');

                        }

                    },
                    flex: 1
                }, {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
//                    hidden: true,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/paste_plain.png',
                            tooltip: 'Voir le detail',
                            scope: this,

                            handler: this.showDetail,
                            getClass: function (value, metadata, record) {
                                if (record.get('id') != "") {  //read your condition from the record
                                    return 'x-display-hide'; //affiche l'icone
                                } else {
                                    return 'x-hide-display'; //cache l'icone
                                }
                            }
                        }]
                }


            ],
            selModel: {
                selType: 'cellmodel'
            },

            bbar: {

                dock: 'bottom',
                items: [
                    {
                        xtype: 'pagingtoolbar',
                        displayInfo: true,
                        flex: 1,
                        pageSize: itemsPerPage,
                        store: store,
                        listeners: {
                            beforechange: function (page, currentPage) {
                                let myProxy = this.store.getProxy();

                                myProxy.params = {
                                    dtEnd: null,
                                    dtStart: null,
                                    checked: true,
                                    userId: null,
                                    typeMvtId: null
                                };
                                let userId = "";
                                if (Ext.getCmp('lg_USER_ID').getValue()) {
                                    userId = Ext.getCmp('lg_USER_ID').getValue();
                                }
                let typeMvtId = typesDemandes();
                                myProxy.setExtraParam('dtStart', Ext.getCmp('dt_debut_journal').getSubmitValue());
                                myProxy.setExtraParam('dtEnd', Ext.getCmp('dt_fin_journal').getSubmitValue());
                                myProxy.setExtraParam('checked', true);
                                myProxy.setExtraParam('userId', userId);
                                myProxy.setExtraParam('typeMvtId', typeMvtId);
                            }

                        }

                    },
                    {
                        xtype: 'tbseparator'
                    },
                    {
                        xtype: 'fieldcontainer',
                        id: 'summaryCmp',
                        flex: 1,
                        layout: {type: 'hbox', align: 'center'},
                        items: []
                    }

                ]
            }
        });

        this.callParent();

        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        });



    },

    loadStore: function () {
        /* On n'interroge pas la liste tant que les trois types du journal ne sont pas connus :
         * partir sans eux ferait apparaitre une fraction de seconde les operations que cet ecran
         * est justement charge de ne plus montrer. Le magasin des types previent des son
         * chargement (voir son ecouteur load), et c'est lui qui declenche alors la recherche. */
        if (!typesDemandes()) {
            return;
        }
        Me.onRechClick();

    },
    onPdfPrint: function () {

        let userId = "";
        if (Ext.getCmp('lg_USER_ID').getValue()) {
            userId = Ext.getCmp('lg_USER_ID').getValue();
        }
        const typeMvtId = typesDemandes();

        const dtStart = Ext.getCmp('dt_debut_journal').getSubmitValue();
        const dtEnd = Ext.getCmp('dt_fin_journal').getSubmitValue();

        const linkUrl = "../CaisseServlet?dtStart=" + dtStart + "&dtEnd=" + dtEnd + "&userId=" + userId
                + "&checked=true&typeMvtId=" + typeMvtId;
        window.open(linkUrl);


    },
    loadSummary: function () {
        let userId = "";
        if (Ext.getCmp('lg_USER_ID').getValue()) {
            userId = Ext.getCmp('lg_USER_ID').getValue();
        }

        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/caisse/mvts-others-summary',
            params: {
                dtStart: Ext.getCmp('dt_debut_journal').getSubmitValue(),
                dtEnd: Ext.getCmp('dt_fin_journal').getSubmitValue(),
                checked: true,
                userId: userId,
                typeMvtId: typesDemandes()
            },
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                const data = result.data;
                Ext.getCmp('summaryCmp').removeAll();

                if (data?.modes?.length > 0) {
                    Ext.getCmp('summaryCmp').add({
                        xtype: 'displayfield',
                        flex: 1,
                        fieldLabel: 'TOTAL:',
                        labelWidth: 50,
                        renderer: amountformatbis,
                        fieldStyle: "color:blue;",
                        value: data.total
                    });

                    Ext.each(data.modes, function (it) {
                        Ext.getCmp('summaryCmp').add({
                            xtype: 'displayfield',
                            flex: 1,
                            fieldLabel: it.modeReglement,
                            //  labelWidth: it.modeReglement.length + 2,
                            renderer: amountformatbis,
                            fieldStyle: "color:blue;",
                            value: it.montant
                        });

                    });


                }

            }

        });

    },
    onRechClick: function () {
        let userId = "";
        if (Ext.getCmp('lg_USER_ID').getValue()) {
            userId = Ext.getCmp('lg_USER_ID').getValue();
        }
        this.getStore().load({
            params: {
                dtStart: Ext.getCmp('dt_debut_journal').getSubmitValue(),
                dtEnd: Ext.getCmp('dt_fin_journal').getSubmitValue(),
                checked: true,
                userId: userId,
                typeMvtId: typesDemandes()
            }
        });
        Me.loadSummary();
    },

    onAddClick: function () {
        new testextjs.view.sm_user.mvtcaisse.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Effectuer Mouvement de Caisse"
        });
    },
    showDetail: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        Ext.create('testextjs.view.sm_user.mvtcaisse.action.Detail', {data: rec.data}).show();

    },
    modifyClick: function (grid, rowIndex) {
        const rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.sm_user.mvtcaisse.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification Mouvement  [" + rec.get('tiket') + "]"
        });
    }
});