/* global Ext, testextjs */

/**
 * Import de clients standards depuis un fichier (evolution 5, point 3), en trois etapes visibles :
 *
 *   1. CHOISIR le fichier : le serveur en rend les colonnes telles qu'elles sont, avec un echantillon de valeurs ;
 *   2. DESIGNER les colonnes du nom, des prenoms et du telephone, puis controler : chaque ligne est jugee
 *      separement et le rapport s'affiche AVANT toute ecriture ;
 *   3. IMPORTER les seules lignes retenues.
 *
 * L'import historique lisait les colonnes par leur position, figee dans le code, sans aucun controle : un fichier
 * dont les colonnes etaient dans un autre ordre etait importe de travers, et une seule ligne fautive faisait
 * echouer le lot entier. Il reste en place, par le bouton « Importer » ; celui-ci s'ajoute a cote.
 */
Ext.define('testextjs.view.configmanagement.client.action.importClientStandard', {
    extend: 'Ext.window.Window',
    xtype: 'importclientstandard',
    itemId: 'importClientStandard',
    title: 'Importer des clients standards',
    modal: true,
    closable: true,
    closeAction: 'destroy',
    width: 900,
    height: 600,
    layout: 'fit',

    config: {
        parentview: null
    },

    // Colonnes rendues par l'analyse du fichier : {index, libelle, exemples}
    colonnesFichier: null,

    // Jeton rendu par l'analyse : le fichier n'est envoye qu'une fois, les deux etapes suivantes
    // ne transportent plus que ce jeton. Le navigateur vide le champ fichier apres chaque envoi.
    jeton: null,

    initComponent: function () {
        var me = this;
        me.colonnesFichier = [];

        me.rapportStore = Ext.create('Ext.data.Store', {
            fields: ['ligne', 'nom', 'prenoms', 'telephone', 'motif', 'etat'],
            data: []
        });

        Ext.apply(me, {
            items: [{
                    xtype: 'form',
                    itemId: 'formulaire',
                    bodyPadding: 10,
                    layout: { type: 'vbox', align: 'stretch' },
                    // L'envoi de fichier passe par une iframe cachee : c'est le seul moyen en ExtJS 4.
                    fileUpload: true,
                    items: [{
                            xtype: 'fieldset',
                            title: '1. Fichier',
                            items: [{
                                    xtype: 'filefield',
                                    itemId: 'fichier',
                                    name: 'fichier',
                                    fieldLabel: 'Fichier',
                                    labelWidth: 110,
                                    anchor: '100%',
                                    allowBlank: false,
                                    buttonText: 'Parcourir...',
                                    emptyText: 'CSV, TXT, XLS ou XLSX'
                                }, {
                                    xtype: 'checkbox',
                                    itemId: 'entete',
                                    name: 'entete',
                                    fieldLabel: 'Première ligne',
                                    labelWidth: 110,
                                    boxLabel: 'la première ligne contient les titres des colonnes',
                                    checked: true,
                                    inputValue: 'true',
                                    uncheckedValue: 'false'
                                }, {
                                    xtype: 'button',
                                    itemId: 'analyser',
                                    text: 'Lire les colonnes du fichier',
                                    iconCls: 'searchicon',
                                    margin: '4 0 0 110',
                                    handler: function () { me.analyser(); }
                                }]
                        }, {
                            xtype: 'fieldset',
                            itemId: 'zoneColonnes',
                            title: '2. Colonnes',
                            disabled: true,
                            items: [
                                me.comboColonne('colonneNom', 'Nom'),
                                me.comboColonne('colonnePrenoms', 'Prénoms'),
                                me.comboColonne('colonneTelephone', 'Téléphone'),
                                {
                                    xtype: 'button',
                                    itemId: 'controler',
                                    text: 'Contrôler les lignes',
                                    iconCls: 'searchicon',
                                    margin: '4 0 0 110',
                                    handler: function () { me.envoyer('controle'); }
                                }]
                        }, {
                            xtype: 'component',
                            itemId: 'message',
                            style: 'padding:4px 0;font-weight:bold',
                            html: 'Choisissez un fichier, puis lisez ses colonnes.'
                        }, {
                            xtype: 'gridpanel',
                            itemId: 'rapport',
                            flex: 1,
                            store: me.rapportStore,
                            viewConfig: {
                                columnLines: true,
                                deferEmptyText: false,
                                emptyText: '<div style="padding:12px">Aucune ligne contrôlée pour le moment.</div>',
                                getRowClass: function (record) {
                                    var etat = record.get('etat');
                                    return etat === 'Créé' ? 'import-client-cree'
                                            : (etat === 'Retenue' ? '' : 'import-client-rejet');
                                }
                            },
                            columns: [
                                { header: 'Ligne', dataIndex: 'ligne', width: 60, align: 'right' },
                                { header: 'État', dataIndex: 'etat', width: 80 },
                                { header: 'Nom', dataIndex: 'nom', flex: 1 },
                                { header: 'Prénoms', dataIndex: 'prenoms', flex: 1 },
                                { header: 'Téléphone', dataIndex: 'telephone', width: 110 },
                                { header: 'Motif du rejet', dataIndex: 'motif', flex: 2 }
                            ]
                        }]
                }],
            buttons: [{
                    text: 'Importer les lignes retenues',
                    itemId: 'importer',
                    iconCls: 'addicon',
                    disabled: true,
                    handler: function () { me.envoyer('executer'); }
                }, {
                    text: 'Fermer',
                    itemId: 'fermer',
                    iconCls: 'cancelicon',
                    handler: function () { me.close(); }
                }]
        });

        me.callParent(arguments);
        me.show();
    },

    comboColonne: function (itemId, libelle) {
        return {
            xtype: 'combobox',
            itemId: itemId,
            name: itemId,
            fieldLabel: libelle,
            labelWidth: 110,
            anchor: '100%',
            store: Ext.create('Ext.data.Store', {
                fields: ['index', 'libelle', 'exemples', 'affichage'],
                data: []
            }),
            valueField: 'index',
            displayField: 'affichage',
            queryMode: 'local',
            editable: false,
            forceSelection: true,
            emptyText: 'Choisir la colonne...'
        };
    },

    afficherMessage: function (texte) {
        var zone = this.down('#message');
        if (zone) {
            zone.update(Ext.String.htmlEncode(texte || ''));
        }
    },

    /** Etape 1 : envoi du fichier. C'est le seul envoi de fichier de tout le parcours. */
    televerser: function (surReponse) {
        var me = this;
        var formulaire = me.down('#formulaire').getForm();
        if (!me.down('#fichier').getValue()) {
            me.afficherMessage('Choisissez d\'abord un fichier.');
            return;
        }
        me.setLoading('Lecture du fichier...');
        formulaire.submit({
            url: '../api/v1/client/import/analyse',
            success: function (f, action) {
                me.setLoading(false);
                surReponse(me.lireReponse(action));
            },
            failure: function (f, action) {
                me.setLoading(false);
                var resultat = me.lireReponse(action);
                if (resultat) {
                    surReponse(resultat);
                } else {
                    me.afficherMessage('Le serveur n\'a pas répondu. Vérifiez le fichier et réessayez.');
                }
            }
        });
    },

    /** Etapes 2 et 3 : le jeton et la correspondance suffisent, le fichier reste cote serveur. */
    appeler: function (etape, surReponse) {
        var me = this;
        if (!me.jeton) {
            me.afficherMessage('Lisez d\'abord les colonnes du fichier.');
            return;
        }
        me.setLoading(etape === 'executer' ? 'Création des clients...' : 'Contrôle des lignes...');
        Ext.Ajax.request({
            url: '../api/v1/client/import/' + etape,
            method: 'POST',
            params: {
                jeton: me.jeton,
                colonneNom: me.down('#colonneNom').getValue(),
                colonnePrenoms: me.down('#colonnePrenoms').getValue(),
                colonneTelephone: me.down('#colonneTelephone').getValue(),
                entete: me.down('#entete').getValue() ? 'true' : 'false'
            },
            callback: function () {
                if (!me.isDestroyed) {
                    me.setLoading(false);
                }
            },
            success: function (reponse) {
                surReponse(Ext.decode(reponse.responseText, true));
            },
            failure: function () {
                me.afficherMessage('Le serveur n\'a pas répondu. Réessayez.');
            }
        });
    },

    /**
     * La reponse arrive dans une iframe : ExtJS la considere en echec faute d'un champ « success » booleen,
     * alors que le corps est bien la. On relit donc le texte brut dans les deux cas.
     */
    lireReponse: function (action) {
        var brut = action && action.response ? action.response.responseText : null;
        if (!brut) {
            return action && action.result ? action.result : null;
        }
        var debut = brut.indexOf('{');
        var fin = brut.lastIndexOf('}');
        if (debut < 0 || fin < debut) {
            return null;
        }
        return Ext.decode(brut.substring(debut, fin + 1), true);
    },

    analyser: function () {
        var me = this;
        me.televerser(function (r) {
            if (!r || !r.success) {
                me.afficherMessage((r && r.message) || 'Lecture du fichier impossible.');
                return;
            }
            me.colonnesFichier = r.colonnes || [];
            me.jeton = r.jeton || null;
            var donnees = Ext.Array.map(me.colonnesFichier, function (c) {
                return {
                    index: c.index,
                    libelle: c.libelle,
                    exemples: c.exemples,
                    // Le libelle seul ne suffit pas quand le fichier n'a pas d'en-tete : l'echantillon
                    // est ce qui permet de reconnaitre la colonne du telephone.
                    affichage: c.libelle + (c.exemples ? '  —  ' + c.exemples : '')
                };
            });
            Ext.Array.each(['colonneNom', 'colonnePrenoms', 'colonneTelephone'], function (id) {
                var combo = me.down('#' + id);
                combo.getStore().loadData(donnees);
                combo.setValue(null);
            });
            me.preselectionner();
            me.down('#zoneColonnes').setDisabled(false);
            me.down('#importer').setDisabled(true);
            me.rapportStore.loadData([]);
            me.afficherMessage(r.message + (r.separateur ? '  (séparateur « ' + r.separateur + ' »)' : '')
                    + ' — désignez maintenant les trois colonnes.');
        });
    },

    /** Pre-selection d'apres les titres : l'operateur garde la main, mais le cas courant est deja pret. */
    preselectionner: function () {
        var me = this;
        var motifs = {
            colonneNom: /^(nom|nom de famille|last ?name|patronyme)$/i,
            colonnePrenoms: /^(pr[ée]noms?|first ?name)$/i,
            colonneTelephone: /(t[ée]l|phone|mobile|contact|num[ée]ro)/i
        };
        Ext.Object.each(motifs, function (id, motif) {
            var trouvee = Ext.Array.findBy(me.colonnesFichier, function (c) {
                return motif.test((c.libelle || '').trim());
            });
            if (trouvee) {
                me.down('#' + id).setValue(trouvee.index);
            }
        });
    },

    envoyer: function (etape) {
        var me = this;
        var manquante = Ext.Array.findBy(['colonneNom', 'colonnePrenoms', 'colonneTelephone'], function (id) {
            var v = me.down('#' + id).getValue();
            return v === null || v === '';
        });
        if (manquante) {
            me.afficherMessage('Désignez les colonnes du nom, des prénoms et du téléphone.');
            return;
        }
        me.appeler(etape, function (r) {
            if (!r || !r.success) {
                me.afficherMessage((r && r.message) || 'Le contrôle du fichier a échoué.');
                if (r && r.expire) {
                    // Le fichier a ete oublie : on revient a la premiere etape plutot que de
                    // laisser l'operateur cliquer dans le vide.
                    me.jeton = null;
                    me.down('#zoneColonnes').setDisabled(true);
                    me.down('#importer').setDisabled(true);
                }
                return;
            }
            me.rapportStore.loadData(r.lignes || []);
            me.afficherMessage(r.resume);
            // Le bouton d'import ne s'active que s'il y a quelque chose a ecrire, et se desactive
            // apres l'ecriture : on ne peut pas importer deux fois le meme fichier par inadvertance.
            me.down('#importer').setDisabled(!!r.ecrit || !r.retenues);
            if (r.ecrit && me.parentview && me.parentview.getStore) {
                me.parentview.getStore().reload();
            }
        });
    }
});
