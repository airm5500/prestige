/* global Ext */

Ext.define('testextjs.controller.PendingCtr', {
    extend: 'Ext.app.Controller',
    requires: [

        'testextjs.model.caisse.Vente', 'testextjs.view.vente.PreventeDetail'


    ],
    views: ['testextjs.view.vente.Pending'],
    refs: [{
            ref: 'pending',
            selector: 'cloturerventemanager'
        },
        {
            ref: 'queryBtn',
            selector: 'cloturerventemanager #rechercher'
        }, {
            ref: 'addBtn',
            selector: 'cloturerventemanager #addBtn'
        },

        {
            ref: 'pendingGrid',
            selector: 'cloturerventemanager gridpanel'
        },
        {
            ref: 'pagingtoolbar',
            selector: 'cloturerventemanager gridpanel pagingtoolbar'
        }

        , {
            ref: 'typeComboField',
            selector: 'cloturerventemanager #typeVente'
        }

        , {
            ref: 'queryField',
            selector: 'cloturerventemanager #query'
        }, {
            ref: 'preventeDetail',
            selector: 'preventeDetail'
        }


    ],
    init: function (application) {
        this.control({
            'cloturerventemanager gridpanel pagingtoolbar': {
                beforechange: this.doBeforechange
            },
            'cloturerventemanager #rechercher': {
                click: this.doSearch
            },
            'cloturerventemanager #typeVente': {
                select: this.doSearch
            },

            'cloturerventemanager gridpanel': {
                viewready: this.doInitStore
            },
            "cloturerventemanager gridpanel actioncolumn": {
                toEdit: this.edit,
                toDelete: this.delete,
                toTrash: this.corbeille,
                goto: this.goto
            },
            'cloturerventemanager #query': {
                specialkey: this.onSpecialKey
            },
            'cloturerventemanager #addBtn': {
                click: this.onAddClick
            },
            'cloturerventemanager #printParVente': {
                click: this.onPrintParVente
            },
            'cloturerventemanager #printListe': {
                click: this.onPrintListe
            },
            'cloturerventemanager #createInventaire': {
                click: this.onCreateInventaire
            },
            /* l'inventaire arme porte sur l'onglet affiche : un changement d'onglet le desarme */
            'cloturerventemanager #ongletsVentes': {
                tabchange: function () {
                    this.desarmerInventaire();
                }
            },
            'preventeDetail #btnCancel': {
                click: this.onClosePreventeDetail
            }
        });
    },
    onClosePreventeDetail: function () {
        const me = this;
        me.getPreventeDetail().destroy();

    },
    edit: function (view, rowIndex, colIndex, item, e, record, row) {
        const me = this;
        me.onEdite(record);
    },
    delete: function (view, rowIndex, colIndex, item, e, record, row) {
        const me = this;
        me.onDelete(record.get('lgPREENREGISTREMENTID'));
    }, corbeille: function (view, rowIndex, colIndex, item, e, record, row) {
        const me = this;
        me.onCorbeille(record.get('lgPREENREGISTREMENTID'));
    },

    handleActionColumn: function (view, rowIndex, colIndex, item, e) {
        var me = this;

        var store = me.getPendingGrid().getStore(),
                rec = store.getAt(colIndex);

        if (parseInt(item) === 9) {
            me.onDelete(rec.get('lgPREENREGISTREMENTID'));
        } else if (parseInt(item) === 7) {
            me.onEdite(rec);
        } else if (parseInt(item) === 8) {
            me.onCorbeille(rec.get('lgPREENREGISTREMENTID'));
        }
    },
    onAddClick: function () {
        var xtype = "doventemanager";
        var data = {'isEdit': false, 'categorie': 'VENTE', 'record': {}};
        testextjs.app.getController('App').onRedirectTo(xtype, data);

    },

    onDelete: function (id) {
        var me = this;
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'POST',
//            headers: {'Content-Type': 'application/json'},
            url: '../api/v1/ventestats/remove/' + id,
//            params: Ext.JSON.encode(params),
            success: function (response, options) {
                progress.hide();
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.doSearch();
                } else {
                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 320,
                        msg: "L'opération a échouée",
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR

                    });
                }
            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert("Message", 'server-side failure with status code' + response.status);
            }

        });
    },
    goto: function (view, rowIndex, colIndex, item, e, rec, row) {
        /* verrou du double clic (15/10) : une seule ouverture tant que le serveur n'a pas repondu */
        const fin = window.PrestigeChargement ? PrestigeChargement.verrou('detail-prevente', view, 'Ouverture du détail') : Ext.emptyFn;
        if (!fin) {
            return;
        }
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ventestats/find-one/' + rec.get('lgPREENREGISTREMENTID'),
            callback: fin,
            success: function (response, options) {
                const result = Ext.JSON.decode(response.responseText, true);
                Ext.create('testextjs.view.vente.PreventeDetail', {vente: result.data}).show();
            }

        });


    },
    onCorbeille: function (id) {
        var me = this;
        var progress = Ext.MessageBox.wait('Veuillez patienter . . .', 'En cours de traitement!');
        Ext.Ajax.request({
            method: 'PUT',
            url: '../api/v1/ventestats/update/' + id + '/is_Trash',
            success: function (response, options) {
                progress.hide();
                var result = Ext.JSON.decode(response.responseText, true);
                if (result.success) {
                    me.doSearch();
                } else {
                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 320,
                        msg: "L'opération a échouée",
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.ERROR

                    });
                }
            },
            failure: function (response, options) {
                progress.hide();
                Ext.Msg.alert("Message", 'server-side failure with status code' + response.status);
            }

        });
    },

    /*
     * Rappel d'une vente en attente (lot 3) : on demande d'abord le verrou au
     * serveur. Si une autre caisse detient deja la vente, on previent et on
     * n'ouvre pas ; si elle a ete validee entre temps, on rafraichit la liste.
     * La protection absolue contre la double validation reste cote serveur, a
     * la cloture.
     */
    onEdite: function (rec) {
        var me = this;
        var venteId = rec.get('lgPREENREGISTREMENTID');
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/vente/rappel/' + venteId,
            success: function (response) {
                var result = Ext.JSON.decode(response.responseText, true) || {};
                if (!result.success) {
                    Ext.MessageBox.show({
                        title: 'Vente déjà rappelée',
                        width: 480,
                        msg: result.msg || 'Cette vente est déjà ouverte sur un autre poste',
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING
                    });
                    if (result.cloturee) {
                        me.doSearch();
                    }
                    return;
                }
                var data = {'isEdit': true, 'record': rec.data, 'isDevis': false, 'categorie': 'VENTE'};
                testextjs.app.getController('App').onRedirectTo("doventemanager", data);
            },
            failure: function () {
                // serveur injoignable : on n'empeche pas le travail, la garde de cloture protege
                var data = {'isEdit': true, 'record': rec.data, 'isDevis': false, 'categorie': 'VENTE'};
                testextjs.app.getController('App').onRedirectTo("doventemanager", data);
            }
        });
    },
    doBeforechange: function (page, currentPage) {
        var me = this;
        var myProxy = me.getPendingGrid().getStore().getProxy();

        myProxy.params = {
            query: null,
            typeVenteId: null,
            statut: 'is_Process'

        };
        myProxy.setExtraParam('statut', 'is_Process');
        myProxy.setExtraParam('query', me.getQueryField().getValue());
        myProxy.setExtraParam('typeVenteId', me.getTypeComboField().getValue());

    },

    doInitStore: function (grille) {
        var me = this;
        /* le tableau de l'onglet « Ventes en cours et interrompues » se charge lui-meme a l'ouverture de l'onglet */
        if (grille && grille !== me.getPendingGrid()) {
            return;
        }
//         me.getPendingGrid().plugins.push({
//                    ptype: 'rowexpander',
//                    rowBodyTpl: new Ext.XTemplate(
//                            '<p>{strREF}</p>'
//
//                            )
//                });
//      

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

        me.getPendingGrid().getStore().load({
            params: {
                "statut": 'is_Process',
                "query": me.getQueryField().getValue(),
                "typeVenteId": me.getTypeComboField().getValue()
            }
        });
        /* retour du 25/11 (point 2) : les memes filtres valent pour l'onglet « Ventes en cours et interrompues » ;
         * gardes sur sa liste (ouverture de l'onglet, « Actualiser », rafraichissement des 15 s) */
        var enCours = me.getPending() ? me.getPending().down('ventesencourssaisie') : null;
        if (enCours) {
            var proxy = enCours.ventes.getProxy();
            proxy.setExtraParam('query', me.getQueryField().getValue() || '');
            proxy.setExtraParam('typeVenteId', me.getTypeComboField().getValue() || '');
            if (me.ongletEnCours()) {
                enCours.ventes.load();
            }
        }
    },
    /** Vrai quand l'onglet « Ventes en cours et interrompues » est affiche. */
    ongletEnCours: function () {
        var p = this.getPending(), t = p ? p.down('#ongletsVentes') : null, a = t ? t.getActiveTab() : null;
        return !!a && a.itemId === 'ongletEnCours';
    },
    /** Adresses et libelles des impressions et de l'inventaire, selon l'onglet affiche. */
    cible: function () {
        if (this.ongletEnCours()) {
            return {pdf: '../api/v1/vente-saisie/en-cours/produits/pdf', count: '../api/v1/vente-saisie/en-cours/produits/count',
                inventaire: '../api/v1/vente-saisie/en-cours/create-inventaire', libelle: 'ventes en cours et interrompues affichées'};
        }
        return {pdf: '../api/v1/ventestats/preventes/produits/pdf', count: '../api/v1/ventestats/preventes/produits/count',
            inventaire: '../api/v1/ventestats/preventes/create-inventaire', libelle: 'ventes en attente affichées'};
    },
    // Filtres actifs de la liste (repris pour les impressions et l'inventaire)
    getActiveFilters: function () {
        var me = this;
        return {
            statut: 'is_Process',
            query: me.getQueryField().getValue() || '',
            typeVenteId: me.getTypeComboField().getValue() || ''
        };
    },
    doPrintProduits: function (mode) {
        var me = this;
        var params = Ext.apply({mode: mode}, me.getActiveFilters());
        var progress = Ext.MessageBox.wait('Generation du PDF . . .', 'Veuillez patienter');
        Ext.Ajax.request({
            url: me.cible().pdf,
            method: 'GET',
            params: params,
            timeout: 600000,
            success: function (resp) {
                progress.hide();
                var r = Ext.JSON.decode(resp.responseText, true);
                if (r && r.success && r.url) {
                    window.open(r.url);
                } else {
                    Ext.MessageBox.alert('Impression',
                            (r && r.message) ? r.message : "La generation du PDF n'a pas abouti.");
                }
            },
            failure: function () {
                progress.hide();
                Ext.MessageBox.alert('Impression', 'La generation du PDF a echoue.');
            }
        });
    },
    onPrintParVente: function () {
        this.doPrintProduits('PAR_VENTE');
    },
    onPrintListe: function () {
        this.doPrintProduits('LISTE');
    },
    /*
     * « Créer un inventaire » avec les produits des ventes affichées de l'onglet (un même produit dans plusieurs ventes
     * = une seule ligne). Retour du 25/11 : aucune fenêtre, la confirmation se fait dans le bouton. 1er clic : le
     * bouton dit combien de produits et demande confirmation (5 s) ; 2e clic : création ; le résultat s'affiche dans
     * le bouton (4 s).
     */
    onCreateInventaire: function (b) {
        var me = this, filters = me.getActiveFilters(), cible = me.cible();
        b = b || me.getPending().down('#createInventaire');
        var dire = function (texte) {
            me.desarmerInventaire(b);
            b.setText(texte);
            me.minuteurInventaire = setTimeout(function () {
                me.desarmerInventaire(b);
            }, 4000);
        };
        if (!b.inventaireArme) {
            me.desarmerInventaire(b);
            b.disable();
            Ext.Ajax.request({
                url: cible.count,
                method: 'GET',
                params: filters,
                success: function (resp) {
                    b.enable();
                    var r = Ext.JSON.decode(resp.responseText, true);
                    var count = (r && r.count) ? r.count : 0;
                    if (count === 0) {
                        dire('Aucun produit dans les ' + cible.libelle);
                        return;
                    }
                    b.inventaireArme = true;
                    b.addCls('psv-arme');
                    b.setText('Confirmer : inventaire de ' + count + ' produit(s)');
                    me.minuteurInventaire = setTimeout(function () {
                        me.desarmerInventaire(b);
                    }, 5000);
                },
                failure: function () {
                    b.enable();
                    dire('Contrôle impossible : réessayez');
                }
            });
            return;
        }
        clearTimeout(me.minuteurInventaire);
        b.inventaireArme = false;
        b.removeCls('psv-arme');
        b.disable();
        b.setText('Création…');
        Ext.Ajax.request({
            // filtres en query string : le endpoint lit des @QueryParam
            url: cible.inventaire + '?' + Ext.Object.toQueryString(filters),
            method: 'POST',
            timeout: 600000,
            success: function (response) {
                b.enable();
                var res = Ext.JSON.decode(response.responseText, true);
                dire(res && res.success ? 'Inventaire créé : ' + (res.count || 0) + ' produit(s)'
                        : ((res && (res.message || res.msg)) || 'Création de l\'inventaire refusée'));
            },
            failure: function () {
                b.enable();
                dire('Échec : aucun inventaire créé');
            }
        });
    },
    /** Bouton « Créer un inventaire » remis à son état de départ (fin du délai, changement d'onglet). */
    desarmerInventaire: function (b) {
        b = b || (this.getPending() ? this.getPending().down('#createInventaire') : null);
        clearTimeout(this.minuteurInventaire);
        if (!b || b.isDestroyed) {
            return;
        }
        b.inventaireArme = false;
        b.removeCls('psv-arme');
        b.setText('Créer un inventaire');
    }
});