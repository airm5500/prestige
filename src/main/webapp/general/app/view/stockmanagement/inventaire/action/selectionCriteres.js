/* global Ext */

// Selection multiple des criteres d'un inventaire, presentee en DEUX VOLETS.
//
//   a gauche  : la liste de l'axe choisi (emplacements, familles ou grossistes), avec recherche
//               et cases a cocher ;
//   a droite  : le panier, qui rappelle en permanence ce qui a ete retenu, meme apres avoir
//               change de recherche - c'est tout l'interet de cette presentation sur un
//               inventaire complet.
//
// L'axe est UNIQUE : on coche plusieurs valeurs d'un meme critere, jamais plusieurs criteres.
// C'est la regle metier existante, et c'est aussi ce que sait faire la procedure qui remplit
// les lignes de l'inventaire.
Ext.define('testextjs.view.stockmanagement.inventaire.action.selectionCriteres', {
    extend: 'Ext.panel.Panel',
    alias: 'widget.inventaireselectioncriteres',
    requires: ['Ext.grid.*', 'Ext.data.*'],

    layout: {type: 'hbox', align: 'stretch'},
    border: false,
    height: 300,

    // Definition des trois axes. Les trois listes viennent d'une API REST : emplacements,
    // grossistes et familles d'article, toutes trois avec recherche "contient" et pagination.
    sources: {
        Emplacement: {
            url: '../api/v1/zones-geographiques',
            champId: 'lg_ZONE_GEO_ID',
            champLibelle: 'str_LIBELLEE',
            champCode: 'str_CODE',
            titre: 'Emplacements',
            recherche: 'Rechercher un emplacement...'
        },
        Grossiste: {
            url: '../api/v1/grossistes',
            champId: 'lg_GROSSISTE_ID',
            champLibelle: 'str_LIBELLE',
            champCode: 'str_CODE',
            titre: 'Grossistes',
            recherche: 'Rechercher un grossiste...'
        },
        Famille: {
            url: '../api/v1/familles-article',
            champId: 'lg_FAMILLEARTICLE_ID',
            champLibelle: 'str_LIBELLE',
            champCode: 'str_CODE_FAMILLE',
            titre: 'Familles d\'article',
            recherche: 'Rechercher une famille...'
        }
    },

    initComponent: function () {
        var me = this;

        // Elements retenus, conserves d'une page et d'une recherche a l'autre.
        me.selection = {};

        // Store alimente a la main : les trois sources n'ont pas les memes noms de champs, ils
        // sont ramenes a id/libelle/code au chargement pour que la grille n'ait pas a s'en
        // preoccuper. Pas de proxy, donc, et une navigation geree explicitement.
        me.storeDisponibles = new Ext.data.Store({
            fields: ['id', 'libelle', 'code'],
            autoLoad: false,
            data: []
        });
        me.storePanier = new Ext.data.Store({fields: ['id', 'libelle', 'code']});

        me.callParent();
        me.add([me.construireVolumeGauche(), me.construireVolumeDroit()]);
        me.changerAxe('Emplacement');
    },

    // ------------------------------------------------------------------ volet gauche
    construireVolumeGauche: function () {
        var me = this;
        return {
            xtype: 'gridpanel',
            itemId: 'gridDisponibles',
            flex: 1.4,
            store: me.storeDisponibles,
            title: 'Emplacements',
            columns: [
                {
                    xtype: 'checkcolumn',
                    dataIndex: 'coche',
                    width: 32,
                    sortable: false,
                    menuDisabled: true,
                    renderer: function (v, meta, record) {
                        return Ext.grid.column.CheckColumn.prototype.renderer.call(this,
                                !!me.selection[record.get('id')], meta);
                    },
                    listeners: {
                        checkchange: function (col, rowIndex) {
                            var rec = me.storeDisponibles.getAt(rowIndex);
                            if (rec) {
                                me.basculer(rec);
                            }
                        }
                    }
                },
                {header: 'Code', dataIndex: 'code', width: 90},
                {header: 'Libell&eacute;', dataIndex: 'libelle', flex: 1}
            ],
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            xtype: 'textfield',
                            itemId: 'champRecherche',
                            flex: 1,
                            emptyText: 'Rechercher un emplacement...',
                            listeners: {
                                specialkey: function (f, e) {
                                    if (e.getKey() === e.ENTER) {
                                        f.dernierTerme = (f.getValue() || '').trim();
                                        me.lancerRecherche();
                                    }
                                },
                                // Meme comportement que les autres zones de recherche : depart
                                // automatique a partir de trois caracteres, apres une pause.
                                change: {
                                    buffer: 800,
                                    fn: function (f, v) {
                                        var terme = (v || '').trim();
                                        if (terme.length > 0 && terme.length < 3) {
                                            return;
                                        }
                                        if (terme === f.dernierTerme) {
                                            return;
                                        }
                                        f.dernierTerme = terme;
                                        me.lancerRecherche();
                                    }
                                }
                            }
                        },
                        {
                            text: 'Effacer',
                            handler: function () {
                                var champ = me.down('#champRecherche');
                                champ.dernierTerme = '';
                                champ.setValue('');
                                me.lancerRecherche();
                            }
                        }
                    ]
                }, {
                    xtype: 'toolbar',
                    dock: 'top',
                    items: [
                        {
                            // Porte sur le RESULTAT AFFICHE, pas sur la totalite : le libelle
                            // rappelle le nombre concerne pour qu'il n'y ait pas d'ambiguite.
                            itemId: 'btnToutCocher',
                            text: 'Tout cocher',
                            handler: function () {
                                me.cocherResultat(true);
                            }
                        },
                        {
                            text: 'Tout d&eacute;cocher',
                            handler: function () {
                                me.cocherResultat(false);
                            }
                        }
                    ]
                }, {
                    // Pagination pilotee a la main : les lignes sont chargees par requete puis
                    // ramenees a id/libelle/code, le store ne passe donc pas par son proxy et une
                    // barre de pagination standard afficherait des compteurs faux.
                    xtype: 'toolbar',
                    dock: 'bottom',
                    items: [
                        {
                            itemId: 'btnPrecedent',
                            text: '&laquo; Pr&eacute;c&eacute;dent',
                            disabled: true,
                            handler: function () {
                                me.chargerPage(Math.max(1, (me.pageCourante || 1) - 1));
                            }
                        },
                        {
                            itemId: 'btnSuivant',
                            text: 'Suivant &raquo;',
                            disabled: true,
                            handler: function () {
                                me.chargerPage((me.pageCourante || 1) + 1);
                            }
                        },
                        '->',
                        {xtype: 'tbtext', itemId: 'infoPage', text: ''}
                    ]
                }],
            viewConfig: {emptyText: 'Aucun r&eacute;sultat.', deferEmptyText: false}
        };
    },

    // ------------------------------------------------------------------- volet droit
    construireVolumeDroit: function () {
        var me = this;
        return {
            xtype: 'gridpanel',
            itemId: 'gridPanier',
            flex: 1,
            margin: '0 0 0 8',
            store: me.storePanier,
            title: 'S&eacute;lection : 0',
            columns: [
                {header: 'Retenu', dataIndex: 'libelle', flex: 1},
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.png',
                            tooltip: 'Retirer de la s&eacute;lection',
                            handler: function (grid, rowIndex) {
                                var rec = me.storePanier.getAt(rowIndex);
                                if (rec) {
                                    delete me.selection[rec.get('id')];
                                    me.rafraichir();
                                }
                            }
                        }]
                }
            ],
            dockedItems: [{
                    xtype: 'toolbar',
                    dock: 'bottom',
                    items: ['->', {
                            text: 'Vider la s&eacute;lection',
                            handler: function () {
                                me.selection = {};
                                me.rafraichir();
                            }
                        }]
                }],
            viewConfig: {
                emptyText: 'Rien de s&eacute;lectionn&eacute;.<br/>Sans s&eacute;lection, '
                        + 'l\'inventaire portera sur <b>tout</b>.',
                deferEmptyText: false
            }
        };
    },

    // --------------------------------------------------------------------- mecanique

    /**
     * Change d'axe. La selection en cours est ABANDONNEE : elle porte sur des identifiants qui
     * n'ont aucun sens sur un autre critere.
     */
    changerAxe: function (type) {
        var me = this;
        var source = me.sources[type];
        if (!source) {
            return;
        }
        me.axe = type;
        me.selection = {};
        me.termeRecherche = '';

        var champ = me.down('#champRecherche');
        if (champ) {
            champ.dernierTerme = '';
            champ.setValue('');
            champ.emptyText = source.recherche;
        }
        var grille = me.down('#gridDisponibles');
        grille.setTitle(source.titre);
        grille.columns[1].setVisible(!!source.champCode);

        me.chargerPage(1);
        me.rafraichir();
    },

    lancerRecherche: function () {
        var champ = this.down('#champRecherche');
        this.termeRecherche = champ ? (champ.getValue() || '').trim() : '';
        this.chargerPage(1);
    },

    /**
     * Charge une page en ramenant les champs de la source a id/libelle/code.
     *
     * <p>
     * Les entrees techniques "Personnalise" (0) et "Tous" (%%) que produisent les anciennes JSP
     * sont ecartees : ici, ne rien cocher signifie deja "tout", il n'y a pas de ligne a cocher
     * pour cela.
     */
    chargerPage: function (page) {
        var me = this;
        var source = me.sources[me.axe];
        Ext.Ajax.request({
            url: source.url,
            params: {
                search_value: me.termeRecherche || '',
                query: me.termeRecherche || '',
                start: (page - 1) * 25,
                page: page,
                limit: 25
            },
            success: function (response) {
                var res = Ext.JSON.decode(response.responseText, true) || {};
                var lignes = res.results || [];
                var donnees = [], i, l, id;
                for (i = 0; i < lignes.length; i++) {
                    l = lignes[i];
                    id = l[source.champId];
                    if (!id || id === '0' || id === '%%') {
                        continue;
                    }
                    donnees.push({
                        id: id,
                        libelle: l[source.champLibelle] || '',
                        code: source.champCode ? (l[source.champCode] || '') : ''
                    });
                }
                me.storeDisponibles.loadData(donnees);
                me.pageCourante = page;
                me.totalSource = parseInt(res.total, 10) || donnees.length;
                me.majNavigation();
                me.majBoutonToutCocher();
            },
            failure: function () {
                me.storeDisponibles.removeAll();
            }
        });
    },

    basculer: function (rec) {
        var id = rec.get('id');
        if (this.selection[id]) {
            delete this.selection[id];
        } else {
            this.selection[id] = {id: id, libelle: rec.get('libelle'), code: rec.get('code')};
        }
        this.rafraichir();
    },

    /** Coche ou decoche les lignes ACTUELLEMENT AFFICHEES, c'est-a-dire le resultat filtre. */
    cocherResultat: function (cocher) {
        var me = this;
        me.storeDisponibles.each(function (rec) {
            var id = rec.get('id');
            if (cocher) {
                me.selection[id] = {id: id, libelle: rec.get('libelle'), code: rec.get('code')};
            } else {
                delete me.selection[id];
            }
        });
        me.rafraichir();
    },

    /** Etat des boutons de navigation et libelle "x - y sur n". */
    majNavigation: function () {
        var me = this;
        var affiches = me.storeDisponibles.getCount();
        var premier = affiches === 0 ? 0 : ((me.pageCourante - 1) * 25) + 1;
        var dernier = ((me.pageCourante - 1) * 25) + affiches;
        var prec = me.down('#btnPrecedent'), suiv = me.down('#btnSuivant'), info = me.down('#infoPage');
        if (prec) {
            prec.setDisabled(me.pageCourante <= 1);
        }
        if (suiv) {
            suiv.setDisabled(dernier >= me.totalSource);
        }
        if (info) {
            info.setText(affiches === 0 ? 'Aucun r&eacute;sultat'
                    : (premier + ' - ' + dernier + ' sur ' + me.totalSource));
        }
    },

    majBoutonToutCocher: function () {
        var btn = this.down('#btnToutCocher');
        if (btn) {
            btn.setText('Tout cocher (' + this.storeDisponibles.getCount() + ' affich&eacute;s)');
        }
    },

    rafraichir: function () {
        var me = this;
        var lignes = [], k;
        for (k in me.selection) {
            if (me.selection.hasOwnProperty(k)) {
                lignes.push(me.selection[k]);
            }
        }
        lignes.sort(function (a, b) {
            return (a.libelle || '').localeCompare(b.libelle || '');
        });
        me.storePanier.loadData(lignes);
        me.down('#gridPanier').setTitle('S&eacute;lection : ' + lignes.length);
        me.majBoutonToutCocher();
        var vue = me.down('#gridDisponibles').getView();
        if (vue && vue.rendered) {
            vue.refresh();
        }
    },

    /** Identifiants retenus. Une liste vide signifie "tout l'axe". */
    getValeurs: function () {
        var ids = [], k;
        for (k in this.selection) {
            if (this.selection.hasOwnProperty(k)) {
                ids.push(k);
            }
        }
        return ids;
    }
});
