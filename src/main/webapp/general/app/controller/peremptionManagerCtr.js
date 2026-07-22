/* global Ext */

Ext.define('testextjs.controller.peremptionManagerCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.Report.peremptions.peremptionManager'],
    refs: [{
            ref: 'peremptionquery',
            selector: 'peremptionquery'
        },
        {
            ref: 'imprimerBtn',
            selector: 'peremptionquery #imprimer'
        },
        {
            ref: 'peremptionGrid',
            selector: 'peremptionquery gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'peremptionquery gridpanel pagingtoolbar'
        }

        , {
            ref: 'nbreMois',
            selector: 'peremptionquery #nbreMois'
        },
        {ref: 'rechercherButton',
            selector: 'peremptionquery #rechercher'

        },
        {
            ref: 'rayons',
            selector: 'peremptionquery #rayons'
        }, {
            ref: 'dtEnd',
            selector: 'peremptionquery #dtEnd'
        },
        {
            ref: 'dtStart',
            selector: 'peremptionquery #dtStart'
        },

        {
            ref: 'grossiste',
            selector: 'peremptionquery #grossiste'
        },
        {
            ref: 'codeFamile',
            selector: 'peremptionquery #codeFamile'
        },
        {
            ref: 'stock',
            selector: 'peremptionquery #stock'
        },
        {
            ref: 'achat',
            selector: 'peremptionquery #achat'
        },
        {
            ref: 'vente',
            selector: 'peremptionquery #vente'
        },
        {
            ref: 'query',
            selector: 'peremptionquery #query'
        }





    ],
    init: function (application) {
        this.control({
            'peremptionquery gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'peremptionquery #rechercher': {
                click: this.doSearch
            },
            'peremptionquery #imprimer': {
                click: this.onPdfClick
            },
            'peremptionquery #exportCsv': {
                click: this.onExportCsv
            },
            'peremptionquery #exportExcel': {
                click: this.onExportExcel
            },
            'peremptionquery #creerInventaire': {
                click: this.onCreerInventaire
            },
            'peremptionquery #rayons': {
                select: this.doSearch
            },
            'peremptionquery #grossiste': {
                select: this.doSearch
            },
            'peremptionquery #codeFamile': {
                select: this.doSearch
            },
            'peremptionquery #filtre': {
                select: this.doSearch
            }, 'peremptionquery #query': {
                specialkey: this.onQuery
            },

            'peremptionquery gridpanel': {
                viewready: this.doInitStore
            }


        });
    },
    onQuery: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            const me = this;
            me.doSearch();
        }
    },
    onPdfClick: function () {
        let me = this;
        let nbreMois = me.getNbreMois().getValue();
        let codeRayon = me.getRayons().getValue();
        let codeGrossiste = me.getGrossiste().getValue();
        let codeFamile = me.getCodeFamile().getValue();
        let query = me.getQuery().getValue();
        let dtStart = me.getDtStart().getSubmitValue();
        let dtEnd = me.getDtEnd().getSubmitValue();
        if (dtStart == null) {
            dtStart = '';
        }
        if (dtEnd == null) {
            dtEnd = '';
        }
        if (codeFamile == null) {
            codeFamile = '';
        }
        if (codeRayon == null) {
            codeRayon = '';
        }
        if (codeGrossiste == null) {
            codeGrossiste = '';
        }
        const linkUrl = '../BalancePdfServlet?mode=PERIMES&nbre=' + nbreMois + '&query=' + query
                + '&codeGrossiste=' + codeGrossiste + '&codeRayon=' + codeRayon +
                '&codeFamile=' + codeFamile + '&dtEnd=' + dtEnd + '&dtStart=' + dtStart;
        window.open(linkUrl);
    },

    /* filtres actifs de l'ecran, partages par les exports et la creation d'inventaire */
    buildFilterParams: function () {
        const me = this;
        return {
            nbreMois: me.getNbreMois().getValue() == null ? '' : me.getNbreMois().getValue(),
            codeRayon: me.getRayons().getValue() || '',
            codeGrossiste: me.getGrossiste().getValue() || '',
            codeFamile: me.getCodeFamile().getValue() || '',
            query: me.getQuery().getValue() || '',
            dtStart: me.getDtStart().getSubmitValue() || '',
            dtEnd: me.getDtEnd().getSubmitValue() || ''
        };
    },
    onExportCsv: function () {
        window.location = '../api/v1/fichearticle/perimes/csv?'
                + Ext.Object.toQueryString(this.buildFilterParams());
    },
    onExportExcel: function () {
        window.location = '../api/v1/fichearticle/perimes/excel?'
                + Ext.Object.toQueryString(this.buildFilterParams());
    },
    // Creation d'inventaire "Inventaire peremptions proches yyyy-MM-dd HH:mm:ss"
    // avec controle du nombre de produits distincts avant confirmation
    onCreerInventaire: function () {
        const me = this, filters = me.buildFilterParams();
        const progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'Controle des produits');
        Ext.Ajax.request({
            url: '../api/v1/fichearticle/perimes/produits/count',
            method: 'GET',
            params: filters,
            timeout: 600000,
            success: function (resp) {
                progress.hide();
                const r = Ext.JSON.decode(resp.responseText, true);
                const count = (r && r.count) ? r.count : 0;
                if (count === 0) {
                    Ext.MessageBox.alert('Message', 'Aucun produit perime avec ces criteres.');
                    return;
                }
                Ext.MessageBox.confirm('Confirmation',
                        'Vous allez creer un inventaire contenant <b>' + count
                        + '</b> produit(s) distinct(s) de la liste filtree.<br/>Confirmez-vous ?',
                        function (btn) {
                            if (btn !== 'yes') {
                                return;
                            }
                            const prog = Ext.MessageBox.wait('Veuillez patienter...', 'Creation de l\'inventaire');
                            Ext.Ajax.request({
                                // filtres en query string : le endpoint lit des @QueryParam
                                url: '../api/v1/fichearticle/perimes/create-inventaire?'
                                        + Ext.Object.toQueryString(filters),
                                method: 'POST',
                                timeout: 600000,
                                success: function (response) {
                                    prog.hide();
                                    const res = Ext.JSON.decode(response.responseText, true);
                                    if (res && res.success) {
                                        Ext.MessageBox.alert('Inventaire',
                                                'Inventaire cree : <b>' + (res.name || '') + '</b><br/>Produits en compte : <b>'
                                                + (res.count || 0) + '</b>');
                                    } else {
                                        Ext.MessageBox.alert('Erreur',
                                                (res && res.message) ? res.message : "La creation de l'inventaire a echoue.");
                                    }
                                },
                                failure: function () {
                                    prog.hide();
                                    Ext.MessageBox.alert('Erreur',
                                            "La creation de l'inventaire a echoue. Aucun inventaire partiel n'a ete cree.");
                                }
                            });
                        });
            },
            failure: function () {
                progress.hide();
                Ext.MessageBox.alert('Erreur', 'Le controle du nombre de produits a echoue.');
            }
        });
    },
    doBeforechange: function (page, currentPage) {
        const me = this;
        const myProxy = me.getPeremptionGrid().getStore().getProxy();
        myProxy.params = {
            nbreMois: -1,
            codeFamile: null,
            codeRayon: null,
            codeGrossiste: null,
            query: null,
            dtEnd: null,
            dtStart: null

        };
        let nbreMois = me.getNbreMois().getValue();
        let codeRayon = me.getRayons().getValue();
        let codeGrossiste = me.getGrossiste().getValue();
        let codeFamile = me.getCodeFamile().getValue();
        let query = me.getQuery().getValue();
        let dtStart = me.getDtStart().getSubmitValue();
        let dtEnd = me.getDtEnd().getSubmitValue();
        myProxy.setExtraParam('codeRayon', codeRayon);
        myProxy.setExtraParam('codeFamile', codeFamile);
        myProxy.setExtraParam('codeGrossiste', codeGrossiste);
        myProxy.setExtraParam('query', query);
        myProxy.setExtraParam('nbreMois', nbreMois);
        myProxy.setExtraParam('dtStart', dtStart);
        myProxy.setExtraParam('dtEnd', dtEnd);
    },
    doInitStore: function () {
        const me = this;
        me.getPeremptionGrid().getStore().addListener('metachange', this.doMetachange, this);
        // Ouverture depuis la notification "Peremptions proches" : pre-remplir nbreMois
        if (window.PRESTIGE_PERIME_NBMOIS != null) {
            me.getNbreMois().setValue(window.PRESTIGE_PERIME_NBMOIS);
            window.PRESTIGE_PERIME_NBMOIS = null;
        }
        me.doSearch();
    },
    doSearch: function () {
        const me = this;
        let nbreMois = me.getNbreMois().getValue();
        let codeRayon = me.getRayons().getValue();
        let codeGrossiste = me.getGrossiste().getValue();
        let codeFamile = me.getCodeFamile().getValue();
        let query = me.getQuery().getValue();
        let dtStart = me.getDtStart().getSubmitValue();
        let dtEnd = me.getDtEnd().getSubmitValue();
        me.getPeremptionGrid().getStore().load({
            params: {
                nbreMois: nbreMois,
                codeFamile: codeFamile,
                codeRayon: codeRayon,
                codeGrossiste: codeGrossiste,
                query: query,
                dtStart: dtStart,
                dtEnd: dtEnd

            }
        });
    },
    doMetachange: function (store, meta) {
        const me = this;
        me.buildSummary(meta);
    },
    buildSummary: function (rec) {
        const me = this;
        me.getStock().setValue(rec.totalQuantiteLot);
        me.getAchat().setValue(rec.totalValeurAchat);
        me.getVente().setValue(rec.totalValeurVente);
    }
});