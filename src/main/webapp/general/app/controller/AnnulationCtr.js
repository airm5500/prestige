/* global Ext */

Ext.define('testextjs.controller.AnnulationCtr', {
    extend: 'Ext.app.Controller',
    requires: [
        'testextjs.model.caisse.Vente'
    ],
    views: ['testextjs.view.vente.Removed'],
    refs: [{
            ref: 'venteannulerlist',
            selector: 'venteannuler'
        },
        {
            ref: 'queryBtn',
            selector: 'venteannuler #rechercher'
        },

        {
            ref: 'venteannulerGrid',
            selector: 'venteannuler gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'venteannuler gridpanel pagingtoolbar'
        }

        , {
            ref: 'printPdf',
            selector: 'venteannuler #printPdf'
        }, {
            ref: 'dtStart',
            selector: 'venteannuler #dtStart'
        }, {
            ref: 'dtEnd',
            selector: 'venteannuler #dtEnd'
        },
        {
            ref: 'totalAmount',
            selector: 'venteannuler #totalAmount'
        }

        , {
            ref: 'queryField',
            selector: 'venteannuler #query'
        }


    ],
    init: function (application) {
        this.control({
            'venteannuler gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'venteannuler #rechercher': {
                click: this.doSearch
            },
            'venteannuler gridpanel': {
                viewready: this.doInitStore
            },

            'venteannuler #query': {
                specialkey: this.onSpecialKey
            },

            'venteannuler #printPdf': {
                click: this.printLit
            },
            "venteannuler gridpanel actioncolumn": {
                click: this.handleActionColumn
            }, 'venteannuler #printPlus': {
                click: this.printPlus
            }

        });
    },
    handleActionColumn: function (view, rowIndex, colIndex, item, e, r, row) {
        var me = this;
        var store = me.getVenteannulerGrid().getStore(),
                rec = store.getAt(colIndex);
        if (!rec) {
            return;
        }
        // La colonne d'action emet un seul evenement pour toutes ses icones : c'est « action »
        // qui dit laquelle a ete cliquee. Sans ce test, ouvrir le detail imprimerait un ticket.
        if (item && item.action === 'detail') {
            me.voirDetail(rec);
            return;
        }
        me.onPrintTicket(rec.get('lgPREENREGISTREMENTID'), rec.get('lgTYPEVENTEID'));


    },

    /**
     * Les produits de la vente choisie, charges A LA DEMANDE.
     *
     * L'ecran ouvrait auparavant un (+) par ligne, alimente par un champ que le serveur ne
     * remplit jamais : la zone restait vide. Le detail se demande desormais vente par vente,
     * et seulement quand on le regarde, sans rien alourdir au chargement de la liste.
     */
    voirDetail: function (rec) {
        Ext.create('testextjs.view.vente.DetailProduitsVente', {
            venteId: rec.get('lgPREENREGISTREMENTID'),
            reference: rec.get('strREF'),
            urlDetail: '../api/v1/ventestats/vente/detail/',
            // Le code tableau ne concerne que l'ordonnancier : ici la colonne serait vide.
            avecTableau: false
        });
    },
    onPrintTicket: function (id, lgTYPEVENTEID) {
        var url = (lgTYPEVENTEID === '1') ? '../api/v1/vente/ticket/vno/' + id : '../api/v1/vente/ticket/vo/' + id;
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            headers: {'Content-Type': 'application/json'},
            method: 'POST',
            url: url,
            success: function (response, options) {
                progress.hide();
            },
            failure: function (response, options) {
                progress.hide();
            }

        });
    },
    printLit: function () {
        var me = this,
                query = me.getQueryField().getValue(),
                dtStart = me.getDtStart().getSubmitValue(),
                dtEnd = me.getDtEnd().getSubmitValue();
        var linkUrl = '../FacturePdfServlet?dtStart=' + dtStart + "&dtEnd=" + dtEnd + "&query=" + query + "&mode=VENTE_ANNULEES";

        window.open(linkUrl);
    },

    printPlus: function () {
        var me = this,
                query = me.getQueryField().getValue(),
                dtStart = me.getDtStart().getSubmitValue(),
                dtEnd = me.getDtEnd().getSubmitValue();
        var linkUrl = '../FacturePdfServlet?dtStart=' + dtStart + "&dtEnd=" + dtEnd + "&query=" + query + "&mode=VENTE_ANNULEES_PLUS";
        window.open(linkUrl);
    },
    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getVenteannulerGrid().getStore().getProxy();

        myProxy.params = {
            query: null,
            dtStart: null,
            dtEnd: null

        };

        myProxy.setExtraParam('query', me.getQueryField().getValue());
        myProxy.setExtraParam('dtStart', me.getDtStart().getSubmitValue());
        myProxy.setExtraParam('dtEnd', me.getDtEnd().getSubmitValue());

    },

    doInitStore: function () {
        var me = this;
        me.getVenteannulerGrid().getStore().addListener('metachange', this.doMetachange, this);
        me.doSearch();

    },
    onSpecialKey: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var me = this;
            me.doSearch();
        }
    },
    doSearch: function () {
        var me = this;

        me.getVenteannulerGrid().getStore().load({
            params: {
                "query": me.getQueryField().getValue(),
                "dtStart": me.getDtStart().getSubmitValue(),
                "dtEnd": me.getDtEnd().getSubmitValue()
            }
        });
    },
    doMetachange: function (store, meta) {
        var me = this;
        me.getTotalAmount().setValue(meta);

    }
});