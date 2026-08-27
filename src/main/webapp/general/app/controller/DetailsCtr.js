/* global Ext */

/*
 * Menu Details : chargements, editions PDF, exports Excel et creation d'inventaire.
 * Meme enchainement d'impression que l'analyse tiers payants : le serveur produit le
 * fichier et repond par son URL, que l'ecran ouvre dans un onglet.
 */
Ext.define('testextjs.controller.DetailsCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.produits.DetailsManager'],

    init: function () {
        this.control({
            'detailsmanager': {
                afterrender: this.onEcranAffiche
            },
            'detailsmanager #btnHistoRechercher': {
                click: this.onChargerHistorique
            },
            'detailsmanager #btnHistoImprimer': {
                click: this.onImprimerHistorique
            },
            'detailsmanager #btnHistoExcel': {
                click: this.onExcelHistorique
            },
            'detailsmanager #btnListeRechercher': {
                click: this.onChargerListe
            },
            'detailsmanager #btnListeVider': {
                click: this.onViderFiltres
            },
            'detailsmanager #btnListeImprimer': {
                click: this.onImprimerListe
            },
            'detailsmanager #btnListeExcel': {
                click: this.onExcelListe
            },
            'detailsmanager #btnListeInventaire': {
                click: this.onCreerInventaire
            },
            /* Entree dans un filtre lance la recherche, sans viser le bouton. */
            'detailsmanager #rech': {
                specialkey: this.onToucheEntree
            },
            'detailsmanager #rechContenance': {
                specialkey: this.onToucheEntree
            },
            'detailsmanager #histoRech': {
                specialkey: this.onToucheEntreeHistorique
            }
        });
    },

    ecran: function (composant) {
        return composant.up('detailsmanager');
    },

    onEcranAffiche: function (ecran) {
        this.chargerListe(ecran);
        this.chargerHistorique(ecran);
        // Curseur directement dans la recherche, pret pour la saisie
        Ext.defer(function () {
            var champ = ecran.down('#rech');
            if (champ && champ.rendered) {
                champ.focus();
            }
        }, 400);
    },

    onToucheEntree: function (champ, e) {
        if (e.getKey() === e.ENTER) {
            this.chargerListe(this.ecran(champ));
        }
    },

    onToucheEntreeHistorique: function (champ, e) {
        if (e.getKey() === e.ENTER) {
            this.chargerHistorique(this.ecran(champ));
        }
    },

    chargerListe: function (ecran) {
        var p = ecran.parametresListe();
        var store = ecran.storeProduits;
        store.getProxy().extraParams = p;
        store.loadPage(1);
    },

    chargerHistorique: function (ecran) {
        var p = ecran.parametresHistorique();
        var store = ecran.storeHistorique;
        store.getProxy().extraParams = p;
        store.loadPage(1);
    },

    onChargerListe: function (bouton) {
        this.chargerListe(this.ecran(bouton));
    },

    onChargerHistorique: function (bouton) {
        this.chargerHistorique(this.ecran(bouton));
    },

    onViderFiltres: function (bouton) {
        var ecran = this.ecran(bouton);
        ecran.down('#rech').setValue('');
        ecran.down('#rechContenance').setValue(null);
        this.chargerListe(ecran);
    },

    /*
     * Pas de boite « Génération du PDF » : le modele compile est en cache cote serveur, la
     * reponse est immediate - le PDF s'ouvre directement dans un nouvel onglet (URL relative
     * au contexte, comme les autres editions). On ne parle a l'usager qu'en cas d'echec.
     */
    imprimer: function (url, params) {
        Ext.Ajax.request({
            method: 'GET',
            url: url,
            params: params,
            success: function (response) {
                var r = Ext.JSON.decode(response.responseText, true) || {};
                if (r.success && r.msg) {
                    window.open('..' + r.msg, '_blank');
                } else {
                    Ext.Msg.alert('Message', r.msg || 'Le PDF n\'a pas pu être généré.');
                }
            },
            failure: function () {
                Ext.Msg.alert('Message', 'Le PDF n\'a pas pu être généré.');
            }
        });
    },

    onImprimerListe: function (bouton) {
        this.imprimer('../api/v1/details/produits/print', this.ecran(bouton).parametresListe());
    },

    onImprimerHistorique: function (bouton) {
        this.imprimer('../api/v1/details/historique/print', this.ecran(bouton).parametresHistorique());
    },

    onExcelListe: function (bouton) {
        window.open('../api/v1/details/produits/excel?'
                + Ext.Object.toQueryString(this.ecran(bouton).parametresListe()));
    },

    onExcelHistorique: function (bouton) {
        window.open('../api/v1/details/historique/excel?'
                + Ext.Object.toQueryString(this.ecran(bouton).parametresHistorique()));
    },

    onCreerInventaire: function (bouton) {
        var me = this, ecran = me.ecran(bouton);
        var p = ecran.parametresListe();
        var horodatage = Ext.Date.format(new Date(), 'dmYHis');
        Ext.Msg.confirm('Inventaire',
                'Créer un inventaire avec les produits de la liste filtrée (principaux et détails)&nbsp;?',
                function (choix) {
                    if (choix !== 'yes') {
                        return;
                    }
                    var progress = Ext.MessageBox.wait('Création de l\'inventaire . . .', 'Veuillez patienter');
                    Ext.Ajax.request({
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        url: '../api/v1/details/produits/inventaire',
                        params: Ext.JSON.encode({
                            rech: p.rech, contenance: p.contenance,
                            name: 'INVENTAIRE PRODUITS DETAILLES ' + horodatage
                        }),
                        success: function (response) {
                            progress.hide();
                            var r = Ext.JSON.decode(response.responseText, true) || {};
                            Ext.Msg.alert('Message', r.success
                                    ? 'Inventaire « ' + r.name + ' » créé : ' + r.count + ' produit(s).'
                                    : (r.msg || 'La création a échoué.'));
                        },
                        failure: function () {
                            progress.hide();
                            Ext.Msg.alert('Message', 'La création a échoué.');
                        }
                    });
                });
    }
});
