/* global Ext */

Ext.define('testextjs.controller.CashmovementCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.caisseManager.Cashmovement'],
    refs: [{
            ref: 'cashmovements',
            selector: 'cashmovements'
        },
        {
            ref: 'imprimerBtn',
            selector: 'cashmovements #imprimer'
        },
        {
            ref: 'cashGrid',
            selector: 'cashmovements gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'cashmovements gridpanel pagingtoolbar'
        }

        , {
            ref: 'dtStart',
            selector: 'cashmovements #dtStart'
        }, {
            ref: 'dtEnd',
            selector: 'cashmovements #dtEnd'
        },
        {ref: 'rechercherButton',
            selector: 'cashmovements #rechercher'

        },
        {
            ref: 'user',
            selector: 'cashmovements #user'
        },
        {
            ref: 'typeMvt',
            selector: 'cashmovements #typeMvt'
        }


    ],
    init: function (application) {
        this.control({
            'cashmovements gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'cashmovements #rechercher': {
                click: this.doSearch
            },
            'cashmovements #imprimer': {
                click: this.onPdfClick
            },
            'cashmovements gridpanel': {
                viewready: this.doInitStore
            }, 'cashmovements #user': {
                select: this.doSearch
            }, 'cashmovements #typeMvt': {
                select: this.doSearch
            }
        });
    },
    onQuery: function (field, e, options) {
        if (e.getKey() === e.ENTER) {
            var me = this;
            me.doSearch();
        }
    },
    onPdfClick: function () {
        var me = this;
        var linkUrl = '../BalancePdfServlet?mode=MVT_CAISSE'
                + '&dtStart=' + me.valeurCritere(me.getDtStart(), 'getSubmitValue')
                + '&dtEnd=' + me.valeurCritere(me.getDtEnd(), 'getSubmitValue')
                + '&user=' + me.valeurCritere(me.getUser(), 'getValue')
                + '&typeMvtId=' + me.valeurCritere(me.getTypeMvt(), 'getValue');
        window.open(linkUrl);
    },

    doBeforechange: function (page, currentPage) {
        var me = this;
        var grille = me.getCashGrid();
        if (!grille) {
            return;
        }
        var myProxy = grille.getStore().getProxy();
        myProxy.params = {
            dtEnd: null,
            dtStart: null,
            user: null,
            typeMvtId: null
        };
        myProxy.setExtraParam('user', me.valeurCritere(me.getUser(), 'getValue'));
        myProxy.setExtraParam('typeMvtId', me.valeurCritere(me.getTypeMvt(), 'getValue'));
        myProxy.setExtraParam('dtEnd', me.valeurCritere(me.getDtEnd(), 'getSubmitValue'));
        myProxy.setExtraParam('dtStart', me.valeurCritere(me.getDtStart(), 'getSubmitValue'));
    },
    doInitStore: function () {
        var me = this;
        me.doSearch();
    },
    /**
     * Valeur d'un champ de la barre d'outils, vide s'il est absent.
     *
     * Les criteres sont lus des l'ouverture de l'ecran (viewready -> doSearch). Un seul champ
     * manquant faisait echouer la lecture et l'ecran restait inutilisable, grille vide : c'est ce
     * qui arrivait au filtre de type de mouvement, dont la liste deroulante manquait a la vue.
     * Un critere absent vaut desormais « pas de filtre », la liste s'affiche quand meme.
     */
    valeurCritere: function (champ, methode) {
        if (!champ || typeof champ[methode] !== 'function') {
            return '';
        }
        var valeur = champ[methode]();
        return Ext.isEmpty(valeur) ? '' : valeur;
    },
    doSearch: function () {
        var me = this;
        var grille = me.getCashGrid();
        if (!grille) {
            return;
        }
        grille.getStore().load({
            params: {
                dtStart: me.valeurCritere(me.getDtStart(), 'getSubmitValue'),
                dtEnd: me.valeurCritere(me.getDtEnd(), 'getSubmitValue'),
                user: me.valeurCritere(me.getUser(), 'getValue'),
                typeMvtId: me.valeurCritere(me.getTypeMvt(), 'getValue')
            }
        });
    }

});