
/* global Ext, testextjs, window */

Ext.define('testextjs.controller.ListeAvoirCtr', {
    extend: 'Ext.app.Controller',
    requires: [
        'testextjs.model.caisse.Vente'
    ],
    views: ['testextjs.view.vente.VenteAvoir'],
    refs: [{
            ref: 'venteavoirmanager',
            selector: 'venteavoirmanager'
        },
        {
            ref: 'avoirTabs',
            selector: 'venteavoirmanager #avoirTabs'
        },
        {
            ref: 'gridEnCours',
            selector: 'venteavoirmanager #gridEnCours'
        },
        {
            ref: 'dtStart',
            selector: 'venteavoirmanager #dtStart'
        }, {
            ref: 'dtEnd',
            selector: 'venteavoirmanager #dtEnd'
        }, {
            ref: 'hStart',
            selector: 'venteavoirmanager #hStart'
        }, {
            ref: 'hEnd',
            selector: 'venteavoirmanager #hEnd'
        }, {
            ref: 'queryField',
            selector: 'venteavoirmanager #query'
        }, {
            ref: 'typeVente',
            selector: 'venteavoirmanager #typeVente'
        }, {
            ref: 'caissier',
            selector: 'venteavoirmanager #caissier'
        }, {
            ref: 'printPdf',
            selector: 'venteavoirmanager #printPdf'
        }
    ],
    init: function (application) {
        this.control({
            'venteavoirmanager gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'venteavoirmanager #rechercher': {
                click: this.doSearch
            },
            'venteavoirmanager #typeVente': {
                select: this.doSearch
            },
            'venteavoirmanager #caissier': {
                select: this.doSearch
            },
            'venteavoirmanager #avoirTabs': {
                tabchange: this.onTabChange
            },
            'venteavoirmanager #gridEnCours': {
                viewready: this.doInitStore
            },
            'venteavoirmanager #query': {
                specialkey: this.onSpecialKey
            },
            'venteavoirmanager #printPdf': {
                click: this.printLit
            },
            'venteavoirmanager #exporterExcel': {
                click: this.exporterExcel
            },
            'venteavoirmanager #creerInventaire': {
                click: this.creerInventaire
            }
        });
    },

    /* Les filtres de l'onglet actif, sous forme de chaine de requete : exports et inventaire les reprennent
       EXACTEMENT (retours des tests du 12/09, point 6). */
    filtresActifs: function () {
        var params = this.buildParams(this.activeStatut());
        return Ext.Object.toQueryString({
            query: params.query || '', dtStart: params.dtStart, dtEnd: params.dtEnd,
            hStart: params.hStart || '', hEnd: params.hEnd || '', typeVenteId: params.typeVenteId,
            caissierId: params.caissierId, avoirStatut: params.avoirStatut, onlyAvoir: true, sansBon: false
        });
    },

    exporterExcel: function () {
        window.open('../api/v1/ventestats/excel?' + this.filtresActifs());
    },

    /* Compte d'abord, confirme ensuite : la caissiere sait combien de produits l'inventaire portera. */
    creerInventaire: function () {
        var me = this,
                url = '../api/v1/ventestats/avoirs/inventaire?' + me.filtresActifs(),
                attente = Ext.MessageBox.wait('Veuillez patienter . . .', 'Décompte des produits');
        Ext.Ajax.request({
            url: url + '&controle=true', method: 'POST', timeout: 600000,
            success: function (reponse) {
                attente.hide();
                var objet = Ext.JSON.decode(reponse.responseText, true) || {};
                if (!objet.success || !objet.count) {
                    Ext.MessageBox.alert('Information', objet.msg || 'Aucun produit dans les avoirs affichés.');
                    return;
                }
                Ext.MessageBox.confirm('Confirmation', 'Créer un inventaire de <b>' + objet.count
                        + ' produit(s)</b> issus de <b>' + objet.ventes + ' avoir(s)</b> ?', function (choix) {
                    if (choix !== 'yes') {
                        return;
                    }
                    var creation = Ext.MessageBox.wait('Veuillez patienter . . .', 'Création de l\'inventaire');
                    Ext.Ajax.request({
                        url: url, method: 'POST', timeout: 600000,
                        success: function (rep) {
                            creation.hide();
                            var o = Ext.JSON.decode(rep.responseText, true) || {};
                            Ext.MessageBox.alert(o.success ? 'Information' : 'Message',
                                    o.msg || (o.success ? 'Inventaire créé.' : 'L\'inventaire n\'a pas pu être créé.'));
                        },
                        failure: function () {
                            creation.hide();
                            Ext.MessageBox.alert('Message', 'L\'inventaire n\'a pas pu être créé.');
                        }
                    });
                });
            },
            failure: function () {
                attente.hide();
                Ext.MessageBox.alert('Message', 'Le décompte des produits a échoué.');
            }
        });
    },

    // Statut de l'onglet actuellement affiche (EN_COURS / CLOTURE)
    activeStatut: function () {
        var tabs = this.getAvoirTabs(),
                tab = tabs ? tabs.getActiveTab() : null;
        return (tab && tab.avoirStatut) ? tab.avoirStatut : 'EN_COURS';
    },

    // Parametres de recherche communs, specialises par le statut d'avoir
    buildParams: function (statut) {
        var me = this,
                typeVenteId = me.getTypeVente().getValue(),
                caissierId = me.getCaissier().getValue();
        if (typeVenteId == null) {
            typeVenteId = '';
        }
        if (caissierId == null) {
            caissierId = '';
        }
        return {
            query: me.getQueryField().getValue(),
            dtStart: me.getDtStart().getSubmitValue(),
            dtEnd: me.getDtEnd().getSubmitValue(),
            typeVenteId: typeVenteId,
            caissierId: caissierId,
            hStart: me.getHStart().getSubmitValue(),
            hEnd: me.getHEnd().getSubmitValue(),
            onlyAvoir: true,
            sansBon: false,
            avoirStatut: statut
        };
    },

    // Charge la grille d'un onglet donne
    loadTab: function (tab) {
        if (!tab) {
            return;
        }
        var grid = tab.down('gridpanel');
        if (!grid) {
            return;
        }
        grid.getStore().load({
            params: this.buildParams(tab.avoirStatut)
        });
    },

    printLit: function () {
        var me = this,
                statut = me.activeStatut(),
                query = me.getQueryField().getValue(),
                dtStart = me.getDtStart().getSubmitValue(),
                dtEnd = me.getDtEnd().getSubmitValue(),
                typeVenteId = me.getTypeVente().getValue(),
                caissierId = me.getCaissier().getValue(),
                hStart = me.getHStart().getSubmitValue(),
                hEnd = me.getHEnd().getSubmitValue();
        if (typeVenteId == null) {
            typeVenteId = '';
        }
        if (caissierId == null) {
            caissierId = '';
        }
        var linkUrl = '../BalancePdfServlet?mode=UNITES_AVOIRS&dtStart=' + dtStart + '&dtEnd=' + dtEnd
                + '&hEnd=' + hEnd + '&hStart=' + hStart + '&query=' + query
                + '&typeVenteId=' + typeVenteId + '&caissierId=' + caissierId + '&statutAvoir=' + statut;

        window.open(linkUrl);
    },

    onEdite: function (rec) {
        var data = {'record': rec.data, 'isEdit': true};
        var xtype = "doAvoir";
        testextjs.app.getController('App').onRedirectTo(xtype, data);
    },

    // Affiche le detail d'un avoir : entete (client, type vente, caissiere,
    // ticket) + uniquement les produits en avoir avec leur quantite en avoir.
    showDetails: function (rec) {
        var d = rec.data;
        var detailStore = Ext.create('Ext.data.Store', {
            autoLoad: false,
            fields: [
                {name: 'intCIP', type: 'string'},
                {name: 'strNAME', type: 'string'},
                {name: 'ticketName', type: 'string'},
                {name: 'intAVOIR', type: 'int'},
                {name: 'intPRICEUNITAIR', type: 'number'},
                {name: 'intPRICE', type: 'number'}
            ],
            proxy: {
                type: 'ajax',
                url: '../api/v1/vente/deatails',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}
            },
            listeners: {
                load: function (store) {
                    // Ne conserve que les lignes effectivement en avoir
                    store.filterBy(function (r) {
                        return r.get('intAVOIR') > 0;
                    });
                }
            }
        });

        var infoTpl = new Ext.XTemplate(
                '<div class="avoir-detail-head">',
                '<table style="width:100%;border-collapse:collapse;font-family:\'Segoe UI\',Tahoma,sans-serif;">',
                '<tr>',
                '<td><b>Client :</b> {clientFullName:this.def}</td>',
                '<td><b>Type vente :</b> {strTYPEVENTE:this.def}</td>',
                '</tr>',
                '<tr>',
                '<td><b>Caissi&egrave;re :</b> {userCaissierName:this.def}</td>',
                '<td><b>N&deg; Ticket :</b> {strREFTICKET:this.def}</td>',
                '</tr>',
                '<tr>',
                '<td><b>R&eacute;f&eacute;rence :</b> {strREF:this.def}</td>',
                '<td><b>Montant :</b> {intPRICE} &nbsp;|&nbsp; {dtUPDATED} {heure}</td>',
                '</tr>',
                '</table>',
                '</div>',
                {
                    def: function (v) {
                        return (v === undefined || v === null || v === '') ? '-' : v;
                    }
                }
                );

        var win = Ext.create('Ext.window.Window', {
            title: 'Detail de l\'avoir - ' + (d.strREF || ''),
            modal: true,
            width: 720,
            height: 440,
            layout: 'border',
            bodyPadding: 0,
            items: [
                {
                    region: 'north',
                    xtype: 'panel',
                    height: 110,
                    bodyPadding: 10,
                    border: false,
                    data: d,
                    tpl: infoTpl
                },
                {
                    region: 'center',
                    xtype: 'gridpanel',
                    title: 'Produits en avoir',
                    store: detailStore,
                    viewConfig: {forceFit: true, columnLines: true},
                    columns: [
                        {header: 'CIP', dataIndex: 'intCIP', flex: 0.8, sortable: false, menuDisabled: true},
                        {header: 'Designation', dataIndex: 'ticketName', flex: 2, sortable: false, menuDisabled: true,
                            renderer: function (v, m, r) {
                                return v || r.get('strNAME') || '';
                            }},
                        {header: 'Qte avoir', dataIndex: 'intAVOIR', flex: 0.7, align: 'center', sortable: false,
                            menuDisabled: true,
                            renderer: function (v) {
                                return '<span style="color:#e67e22;font-weight:bold;">' + v + '</span>';
                            }},
                        {header: 'P.U.', dataIndex: 'intPRICEUNITAIR', xtype: 'numbercolumn', format: '0,000.',
                            align: 'right', flex: 0.8, sortable: false, menuDisabled: true},
                        {header: 'Prix', dataIndex: 'intPRICE', xtype: 'numbercolumn', format: '0,000.',
                            align: 'right', flex: 0.8, sortable: false, menuDisabled: true}
                    ]
                }
            ]
        });
        win.show();
        detailStore.load({
            params: {
                venteId: d.lgPREENREGISTREMENTID,
                query: '',
                statut: '',
                page: 1,
                start: 0,
                limit: 500
            }
        });
    },

    doBeforechange: function (pagingtoolbar) {
        var me = this,
                grid = pagingtoolbar.up('gridpanel'),
                tab = grid ? grid.up('panel') : null,
                statut = (tab && tab.avoirStatut) ? tab.avoirStatut : 'EN_COURS',
                proxy = pagingtoolbar.getStore().getProxy(),
                params = me.buildParams(statut);
        Ext.Object.each(params, function (k, v) {
            proxy.setExtraParam(k, v);
        });
    },

    doInitStore: function () {
        var me = this;
        me.applyRedirectParams();
        me.loadTab(me.getAvoirTabs().getActiveTab());
        me.updateTabIndicator();
        me._ready = true;
    },

    // Pastille + libelle sur l'onglet ACTIF pour savoir d'un coup d'oeil
    // ou l'on se trouve (independant du theme ExtJS).
    updateTabIndicator: function () {
        var tabs = this.getAvoirTabs();
        if (!tabs) {
            return;
        }
        var active = tabs.getActiveTab();
        tabs.items.each(function (card) {
            var label = (card.avoirStatut === 'CLOTURE') ? 'Avoir clôturé' : 'Avoir en cours';
            if (card === active) {
                card.setTitle('<span class="avoir-pastille"></span><span class="avoir-tab-on-label">'
                        + label + '</span>');
            } else {
                card.setTitle(label);
            }
        });
    },

    // Lit les parametres transmis depuis une notification / redirection
    // (periode glissante + onglet a activer), puis nettoie pour usage unique.
    applyRedirectParams: function () {
        var me = this,
                p = window.PRESTIGE_AVOIR_PARAMS;
        if (!p) {
            return;
        }
        try {
            if (p.dtStart) {
                me.getDtStart().setValue(Ext.Date.parse(p.dtStart, 'Y-m-d'));
            }
            if (p.dtEnd) {
                me.getDtEnd().setValue(Ext.Date.parse(p.dtEnd, 'Y-m-d'));
            }
            var idx = (p.activeTab === 'CLOTURE') ? 1 : 0;
            me.getAvoirTabs().setActiveTab(idx);
        } catch (e) {
        }
        window.PRESTIGE_AVOIR_PARAMS = null;
    },

    onTabChange: function (tabPanel, newCard) {
        this.updateTabIndicator();
        // Ignore le chargement declenche pendant l'initialisation
        if (!this._ready) {
            return;
        }
        this.loadTab(newCard);
    },

    onSpecialKey: function (field, e) {
        if (e.getKey() === e.ENTER) {
            this.doSearch();
        }
    },

    doSearch: function () {
        this.loadTab(this.getAvoirTabs().getActiveTab());
    }
});
