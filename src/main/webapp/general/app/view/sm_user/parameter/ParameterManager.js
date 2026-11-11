var url_services_data_parametre = '../webservices/sm_user/parameter/ws_data_all.jsp';
var url_services_data_parametre_transaction = '../webservices/sm_user/parameter/ws_transaction.jsp';
// REST dedie a cet ecran (memes formats JSON et memes regles de visibilite que la JSP)
var url_rest_data_parametre = '../api/v1/app-params/liste';
// bascule d'un parametre booleen : ne modifie que la valeur, conserve la description
var url_rest_toggle_parametre = '../api/v1/app-params/toggle';
// types proposes dans le filtre : deduits cote serveur des parametres reellement visibles par le profil
var url_rest_data_parametre_types = '../api/v1/app-params/types';

var Me;

/*
 * L'ecran depuis un composant de sa barre d'outils.
 *
 * « Me » est une variable GLOBALE, partagee par plus de deux cents ecrans : chacun l'ecrase en
 * s'ouvrant. Un gestionnaire pose au rendu ou a la frappe s'execute plus tard, quand « Me » peut
 * deja designer un autre ecran - d'ou « Me.onRechClick is not a function ». On remonte donc a la
 * grille par le composant qui declenche l'evenement, ce qui ne depend d'aucune globale.
 */
function ecranDuComposant(composant) {
    return composant && composant.up ? composant.up('parametermanager') : null;
}

/*
 * Retour du 10/11/2026 : explication d'un parametre, a partir de son JSON {regle, titre, entetes, cas, rappels}.
 * Tout le texte est encode : aucune balise venue de la base n'est interpretee.
 */
function Me_parametres_rendreExplication(json) {
    var x = Ext.JSON.decode(json, true);
    if (!x) {
        return '';
    }
    var h = Ext.String.htmlEncode, s = '<div class="param-explication">';
    if (x.regle) {
        s += '<p>' + h(String(x.regle)) + '</p>';
    }
    if (Ext.isArray(x.cas) && x.cas.length) {
        if (x.titre) {
            s += '<div class="param-explication-titre">' + h(String(x.titre)) + '</div>';
        }
        s += '<table>';
        if (Ext.isArray(x.entetes) && x.entetes.length) {
            s += '<tr>' + Ext.Array.map(x.entetes, function (c) {
                return '<th>' + h(String(c)) + '</th>';
            }).join('') + '</tr>';
        }
        Ext.Array.each(x.cas, function (ligne) {
            if (Ext.isArray(ligne)) {
                s += '<tr>' + Ext.Array.map(ligne, function (c) {
                    return '<td>' + h(String(c)) + '</td>';
                }).join('') + '</tr>';
            }
        });
        s += '</table>';
    }
    if (Ext.isArray(x.rappels) && x.rappels.length) {
        s += '<ul>' + Ext.Array.map(x.rappels, function (r) {
            return '<li>' + h(String(r)) + '</li>';
        }).join('') + '</ul>';
    }
    return s + '</div>';
}

function relancerRecherche(composant) {
    var ecran = ecranDuComposant(composant);
    if (ecran) {
        ecran.onRechClick();
    }
}

Ext.define('testextjs.view.sm_user.parameter.ParameterManager', {
    extend: 'Ext.grid.Panel',
    xtype: 'parametermanager',
    id: 'parametermanagerID',
    requires: [
        'Ext.selection.CellModel',
        'Ext.grid.*',
        'Ext.window.Window',
        'Ext.data.*',
        'Ext.util.*',
        'Ext.form.*',
        'Ext.JSON.*',
        'Ext.ux.ProgressBarPager',
        'Ext.ux.grid.Printer'

    ],
    title: 'Gestion des parametres',
    plain: true,
    maximizable: true,
//    tools: [{type: "pin"}],
    closable: false,
    frame: true,
    initComponent: function () {

        var itemsPerPage = 20;
        Me = this;
        var store = new Ext.data.Store({
            model: 'testextjs.model.Parameter',
            pageSize: itemsPerPage,
            autoLoad: false,
            proxy: {
                type: 'ajax',
                url: url_rest_data_parametre,
                reader: {
                    type: 'json',
                    root: 'results',
                    totalProperty: 'total'
                }
            }

        });
        
        this.cellEditing = new Ext.grid.plugin.CellEditing({
            clicksToEdit: 1
        });


        Ext.apply(this, {
            width: '98%',
            height: 580,
            plugins: [this.cellEditing],
            store: store,
            id: 'GridparametreID',
            // retour du 10/11 : explication depliable sous la ligne (bouton « i »), repliee par defaut, sans fenetre
            features: [{
                    ftype: 'rowbody',
                    getAdditionalData: function (data, idx, record) {
                        var ouverte = !!(record && record.explicationOuverte && record.get('explication'));
                        return {
                            rowBody: ouverte ? Me_parametres_rendreExplication(record.get('explication')) : '',
                            rowBodyCls: ouverte ? 'param-explication-ouverte' : 'param-explication-fermee',
                            rowBodyColspan: this.view.headerCt.getColumnCount()
                        };
                    }
                }],
            columns: [{
                    xtype: 'rownumberer',
                    text: 'Num.Ligne',
                    width: 45,
                    sortable: true/*,
                     locked: true*/
                }, {
                    header: 'str_KEY',
                    dataIndex: 'str_KEY',
                    hidden: true,
                    flex: 0.5
                }, {
                    header: 'Valeur',
                    dataIndex: 'str_VALUE',
                    flex: 0.5
                },
                {
                    /* retours du 13/10 (point 16) */
                    header: 'Rubrique',
                    dataIndex: 'rubriqueLibelle',
                    itemId: 'colRubrique',
                    width: 190,
                    renderer: function (v, m, r) {
                        return v ? '<span class="param-pastille" style="background:' + Ext.String.htmlEncode(r.get('rubriqueCouleur') || '#95a5a6') + '">'
                                + Ext.String.htmlEncode(v) + '</span>' : '';
                    }
                }, {
                    header: 'Description',
                    dataIndex: 'str_DESCRIPTION',
                    flex: 3
                },
                {
                    header: 'Type',
                    dataIndex: 'str_TYPE',
                    flex: 0.6
                },
                {
                    header: 'str_SECTION_KEY',
                    dataIndex: 'str_SECTION_KEY',
                    hidden: true,
                    flex: 1
                },
                {
                    // retour du 10/11 : bouton « i », seulement si le parametre a une explication ; un clic deplie
                    // l'explication sous la ligne, un second la replie
                    header: '',
                    itemId: 'paramInfoColumn',
                    dataIndex: 'explication',
                    width: 34,
                    sortable: false,
                    menuDisabled: true,
                    align: 'center',
                    renderer: function (value, meta, rec) {
                        if (!value) {
                            return '';
                        }
                        meta.tdAttr = 'data-qtip="' + (rec.explicationOuverte ? 'Replier l\'explication' : 'Voir l\'explication et des exemples') + '"';
                        meta.tdStyle = 'cursor:pointer;';
                        return '<span class="param-info' + (rec.explicationOuverte ? ' param-info-ouvert' : '') + '">i</span>';
                    }
                },
                {
                    // Interrupteur pour les parametres booleens (valeur 0 ou 1) : un clic bascule la
                    // valeur sans passer par la fenetre d'edition. Les autres lignes restent vides.
                    header: 'Activation',
                    itemId: 'paramSwitchColumn',
                    dataIndex: 'str_VALUE',
                    width: 80,
                    sortable: false,
                    menuDisabled: true,
                    align: 'center',
                    renderer: function (value, meta, rec) {
                        var v = rec.get('str_VALUE');
                        if (v !== '0' && v !== '1') {
                            return '';
                        }
                        var on = (v === '1');
                        meta.tdAttr = 'data-qtip="' + (on ? 'Cliquer pour d&eacute;sactiver' : 'Cliquer pour activer') + '"';
                        meta.tdStyle = 'cursor:pointer;';
                        return '<span style="display:inline-block;width:36px;height:18px;border-radius:9px;'
                                + 'background-color:' + (on ? '#5cb85c' : '#bbbbbb') + ';position:relative;vertical-align:middle;">'
                                + '<span style="position:absolute;top:2px;' + (on ? 'right:2px;' : 'left:2px;')
                                + 'width:14px;height:14px;border-radius:50%;background-color:#ffffff;"></span>'
                                + '</span>';
                    }
                },
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/page_white_edit.png',
                            tooltip: 'Editer une parametre',
                            scope: this,
                            handler: this.onEditClick
                        }]
                }/*,
                {
                    xtype: 'actioncolumn',
                    width: 30,
                    sortable: false,
                    menuDisabled: true,
                    items: [{
                            icon: 'resources/images/icons/fam/delete.png',
                            tooltip: 'Supprimer une parametre',
                            scope: this,
                            handler: this.onDeleteClick
                        }
                    ]
                }*/],
            listeners: {
                cellclick: this.onCellClick,
                scope: this
            },
            selModel: {
                selType: 'cellmodel'
            },
            tbar: [/*{
                    text: 'Creer',
                    scope: this,
                    handler: this.onAddClick
                }, '-', */{
                    xtype: 'combobox',
                    itemId: 'comboTypeParam',
                    fieldLabel: 'Type',
                    labelWidth: 35,
                    width: 200,
                    emptyText: 'Tous',
                    editable: false,
                    queryMode: 'local',
                    displayField: 'str_TYPE',
                    valueField: 'str_TYPE',
                    // Les types viennent du serveur : ils suivent la visibilite du profil connecte, et
                    // aucun type inaccessible n'est propose. Une liste figee ici se serait desynchronisee.
                    store: new Ext.data.Store({
                        fields: [{name: 'str_TYPE', type: 'string'}],
                        autoLoad: true,
                        proxy: {
                            type: 'ajax',
                            url: url_rest_data_parametre_types,
                            reader: {type: 'json', root: 'results', totalProperty: 'total'}
                        }
                    }),
                    listeners: {
                        change: function(champ) {
                            relancerRecherche(champ);
                        }
                    }
                }, {
                    xtype: 'textfield',
                    id: 'rechecher',
                    name: 'facture',
                    emptyText: 'Rechercher (2 caractères)',
                    // Recherche automatique des 2 caracteres saisis, avec un delai qui laisse finir la
                    // frappe : une seule requete part, pas une par touche.
                    enableKeyEvents: true,
                    listeners: {
                        'render': function(cmp) {
                            cmp.getEl().on('keypress', function(e) {
                                if (e.getKey() === e.ENTER) {
                                    relancerRecherche(cmp);
                                }
                            });
                        },
                        'keyup': {
                            buffer: 350,
                            fn: function(cmp, e) {
                                if (e.getKey() === e.ENTER) {
                                    return;
                                }
                                var valeur = (cmp.getValue() || '').trim();
                                // Champ vide : on recharge la liste complete (annulation du filtre).
                                if (valeur.length >= 2 || valeur.length === 0) {
                                    relancerRecherche(cmp);
                                }
                            }
                        }
                    }
                }, {
                    text: 'Réinitialiser',
                    tooltip: 'Effacer la recherche et le filtre de type',
                    scope: this,
                    handler: function(bouton) {
                        var ecran = ecranDuComposant(bouton);
                        var champ = Ext.getCmp('rechecher');
                        if (champ) {
                            champ.setValue('');
                        }
                        var combo = ecran ? ecran.down('#comboTypeParam') : null;
                        if (combo) {
                            combo.setValue(null);
                        }
                        if (ecran) {
                            ecran.onRechClick();
                        }
                    }
                }, {
                    text: 'rechercher',
                    tooltip: 'rechercher',
                    iconCls: 'searchicon',
                    scope: this,
                    handler: this.onRechClick
                }],
            bbar: {
                xtype: 'pagingtoolbar',
                store: store, // same store GridPanel is using
                dock: 'bottom',
                displayInfo: true
            },
            /* retours du 13/10 (point 16) : les parametres ranges par rubrique ; une rubrique se choisit a gauche */
            dockedItems: [{
                    xtype: 'dataview', dock: 'left', itemId: 'rubriquesParam', width: 235, cls: 'param-rubriques', autoScroll: true,
                    singleSelect: true, trackOver: true, overItemCls: 'param-rubrique-survol', selectedItemCls: 'param-rubrique-choisie',
                    itemSelector: 'div.param-rubrique',
                    store: new Ext.data.Store({
                        fields: ['code', 'libelle', 'couleur', {name: 'nombre', type: 'int'}, {name: 'sansNombre', type: 'boolean'}], autoLoad: true,
                        proxy: {type: 'ajax', url: '../api/v1/app-params/rubriques', reader: {type: 'json', root: 'results', totalProperty: 'total'}},
                        listeners: {
                            /* plan du 09/11, point 7 : rubrique « Poste » (reglage de CE poste, garde dans le navigateur, et
                               postes connus de l'officine) ; elle ne regroupe aucun parametre de la base */
                            load: function (st) {
                                if (st.findExact('code', 'POSTE') < 0) {
                                    st.add({code: 'POSTE', libelle: 'Poste (ce poste et postes connus)', couleur: '#34495e', nombre: 0, sansNombre: true});
                                }
                            }
                        }
                    }),
                    tpl: new Ext.XTemplate('<div class="param-rubriques-titre">Rubriques</div><tpl for=".">'
                            + '<div class="param-rubrique" data-code="{code}" style="border-left-color:{couleur}">'
                            + '<span class="param-rubrique-libelle">{libelle}</span><tpl if="!sansNombre"><span class="param-rubrique-nombre" style="background:{couleur}">{nombre}</span></tpl></div></tpl>'),
                    listeners: {
                        /* premier argument : le modele de selection, pas la vue ; « this » est la vue */
                        selectionchange: function (modele, choix) {
                            var ecran = ecranDuComposant(this);
                            if (ecran) {
                                ecran.rubrique = choix && choix[0] ? choix[0].get('code') : '';
                                ecran.afficherPoste(ecran.rubrique === 'POSTE');
                                if (ecran.rubrique !== 'POSTE') {
                                    ecran.onRechClick();
                                }
                            }
                        },
                        viewready: function (vue) {
                            vue.getStore().on('load', function (st) {
                                if (st.getCount() && !vue.getSelectionModel().hasSelection()) {
                                    vue.getSelectionModel().select(0, false, true);
                                }
                            }, null, {single: true});
                        }
                    }
                }, {
                    /* plan du 09/11, point 7 : nom de CE poste (garde dans le navigateur, meme apres la deconnexion, et
                       envoye a chaque connexion) et postes connus de l'officine (journal des connexions) */
                    xtype: 'panel', dock: 'top', weight: 10, itemId: 'rubriquePoste', hidden: true, border: false, bodyPadding: 10,
                    layout: {type: 'vbox', align: 'stretch'},
                    items: [{
                            xtype: 'component', cls: 'param-poste-aide',
                            html: '<b>Nom de ce poste</b> : gardé sur ce poste, même après la déconnexion, et envoyé à chaque connexion. '
                                    + 'Il figure dans le fichier journal, dans « Ventes terminées » et dans la liste ci-dessous. '
                                    + 'Sans nom, le serveur prend le nom réseau du poste.'
                        }, {
                            xtype: 'container', layout: 'hbox', margin: '8 0 6 0',
                            items: [{
                                    xtype: 'textfield', itemId: 'nomPosteParam', fieldLabel: 'Ce poste', labelWidth: 60, width: 330, maxLength: 60,
                                    enforceMaxLength: true, emptyText: 'Ex. : Caisse 1'
                                }, {
                                    xtype: 'button', itemId: 'btnPosteEnregistrer', text: 'Enregistrer', margin: '0 0 0 8',
                                    tooltip: 'Garder ce nom sur ce poste (confirmation dans le bouton)',
                                    handler: function (b) {
                                        var ecran = ecranDuComposant(b), v = Ext.String.trim(ecran.down('#nomPosteParam').getValue() || '');
                                        if (!v) {
                                            ecran.etatPoste('Saisissez un nom (lettres, chiffres, espace, point, tiret).', true);
                                            return;
                                        }
                                        PrestigeConfirmation.bouton(b, 'Confirmer : enregistrer ?', function () {
                                            /* valeur du champ au moment de la confirmation */
                                            var nom = window.PrestigePoste.ecrire(Ext.String.trim(ecran.down('#nomPosteParam').getValue() || ''));
                                            ecran.down('#nomPosteParam').setValue(window.PrestigePoste.lire());
                                            ecran.etatPoste(nom ? 'Enregistré : « ' + nom + ' ». Il partira avec la prochaine connexion.'
                                                    : 'Nom refusé : lettres, chiffres, espace, point, tiret.', !nom);
                                            ecran.chargerPostes();
                                        });
                                    }
                                }, {
                                    xtype: 'button', itemId: 'btnPosteEffacer', text: 'Effacer', margin: '0 0 0 6',
                                    tooltip: 'Retirer le nom de ce poste : le nom réseau sera utilisé (confirmation dans le bouton)',
                                    handler: function (b) {
                                        var ecran = ecranDuComposant(b);
                                        PrestigeConfirmation.bouton(b, 'Confirmer : effacer ?', function () {
                                            window.PrestigePoste.ecrire('');
                                            ecran.down('#nomPosteParam').setValue('');
                                            ecran.etatPoste('Nom effacé : le nom réseau sera utilisé à la prochaine connexion.', false);
                                            ecran.chargerPostes();
                                        });
                                    }
                                }, {
                                    xtype: 'component', itemId: 'etatPoste', margin: '4 0 0 12', html: ''
                                }]
                        }, {
                            xtype: 'component', margin: '6 0 4 0',
                            html: '<b>Postes connus</b> : connexions des 365 derniers jours, la plus récente en tête.'
                        }, {
                            xtype: 'grid', itemId: 'postesConnus', flex: 1, border: true, columnLines: true,
                            store: new Ext.data.Store({
                                fields: ['poste', 'derniere', 'utilisateur', 'ip', {name: 'connexions', type: 'int'}],
                                proxy: {type: 'ajax', url: '../api/v1/postes/connus', reader: {type: 'json', root: 'data', totalProperty: 'total'}}
                            }),
                            viewConfig: {emptyText: 'Aucune connexion enregistrée.', deferEmptyText: false},
                            columns: [{
                                    header: 'Poste', dataIndex: 'poste', flex: 1,
                                    renderer: function (v) {
                                        var ici = window.PrestigePoste ? window.PrestigePoste.lire() : '';
                                        return Ext.String.htmlEncode(v) + (ici && String(v).toLowerCase() === ici.toLowerCase() ? ' <b>(ce poste)</b>' : '');
                                    }
                                }, {
                                    header: 'Dernière connexion', dataIndex: 'derniere', width: 170,
                                    renderer: function (v) {
                                        return v ? v.substring(8, 10) + '/' + v.substring(5, 7) + '/' + v.substring(0, 4) + ' ' + v.substring(11, 16) : '';
                                    }
                                }, {
                                    header: 'Utilisateur', dataIndex: 'utilisateur', flex: 1, renderer: Ext.String.htmlEncode
                                }, {
                                    header: 'Adresse', dataIndex: 'ip', width: 130, renderer: Ext.String.htmlEncode
                                }, {
                                    header: 'Connexions', dataIndex: 'connexions', width: 95, align: 'right'
                                }]
                        }]
                }]
        });
        if (!Ext.get('param-rubriques-style')) {
            Ext.util.CSS.createStyleSheet('.param-rubriques{background:#f4f6f9;border-right:1px solid #dbe4ec;padding:6px}'
                    + '.param-rubriques-titre{font-weight:bold;color:#1e3a5f;margin:4px 6px 8px;letter-spacing:.5px;text-transform:uppercase;font-size:11px}'
                    + '.param-rubrique{display:flex;align-items:center;justify-content:space-between;padding:7px 8px;margin:0 0 4px;background:#fff;'
                    + 'border:1px solid #e1e8ef;border-left:5px solid #95a5a6;border-radius:6px;cursor:pointer;font-size:12px}'
                    + '.param-rubrique-survol{background:#eef4fb}'
                    + '.param-rubrique-choisie{background:#1e3a5f;color:#fff;border-color:#1e3a5f}'
                    + '.param-rubrique-nombre{color:#fff;border-radius:10px;padding:0 7px;font-size:11px;font-weight:bold;margin-left:6px}'
                    + '.param-pastille{display:inline-block;padding:1px 8px;border-radius:9px;color:#fff;font-size:11px;white-space:nowrap}'
                    + '.param-info{display:inline-block;width:18px;height:18px;line-height:18px;border-radius:50%;background:#2e86c1;color:#fff;font-weight:bold;font-style:italic;font-family:Georgia,serif;font-size:12px;text-align:center}'
                    + '.param-info-ouvert{background:#1e3a5f}'
                    + '.x-grid-rowbody-tr.param-explication-fermee{display:none}'
                    + '.param-explication{margin:2px 8px 8px 50px;padding:8px 12px;background:#f4f8fc;border-left:4px solid #2e86c1;border-radius:4px;font-size:12px;color:#22313f;white-space:normal;line-height:1.45}'
                    + '.param-explication p{margin:0 0 6px}'
                    + '.param-explication-titre{font-weight:bold;margin:6px 0 4px}'
                    + '.param-explication table{border-collapse:collapse;margin:0 0 6px;max-width:100%}'
                    + '.param-explication th,.param-explication td{border:1px solid #cfdbe6;padding:3px 8px;text-align:right}'
                    + '.param-explication th:first-child,.param-explication td:first-child{text-align:left}'
                    + '.param-explication th{background:#e3edf6}'
                    + '.param-explication ul{margin:0;padding-left:18px}', 'param-rubriques-style');
        }

        this.callParent();


        this.on('afterlayout', this.loadStore, this, {
            delay: 1,
            single: true
        })


    },
    /** Plan du 09/11, point 7 : rubrique « Poste » a la place de la liste des parametres. */
    afficherPoste: function (oui) {
        var me = this, panneau = me.down('#rubriquePoste'), haut = me.getDockedItems('toolbar[dock="top"]')[0],
                bas = me.getDockedItems('pagingtoolbar')[0], vue = me.getView(), entetes = me.headerCt;
        if (!panneau || panneau.isVisible() === oui) {
            return;
        }
        if (oui) {
            var h = (vue.getHeight() || 400) + (haut ? haut.getHeight() : 0) + (bas ? bas.getHeight() : 0) + (entetes ? entetes.getHeight() : 0);
            Ext.each([haut, bas, entetes, vue], function (c) {
                if (c) {
                    c.hide();
                }
            });
            panneau.setHeight(Math.max(320, h));
            panneau.show();
            /* un bouton reste arme si l'on a quitte la rubrique avant de confirmer : il revient a son etat */
            Ext.each(['#btnPosteEnregistrer', '#btnPosteEffacer'], function (s) {
                var b = me.down(s), e = b && b.prestigeConfirmation;
                if (e) {
                    clearTimeout(e.minuterie);
                    b.prestigeConfirmation = null;
                    b.setText(e.texte);
                    if (e.infobulle && b.setTooltip) {
                        b.setTooltip(e.infobulle);
                    }
                    PrestigeConfirmation.desarmer(b);
                }
            });
            me.down('#nomPosteParam').setValue(window.PrestigePoste ? window.PrestigePoste.lire() : '');
            me.etatPoste('', false);
            me.chargerPostes();
        } else {
            panneau.hide();
            Ext.each([haut, bas, entetes, vue], function (c) {
                if (c) {
                    c.show();
                }
            });
        }
    },
    chargerPostes: function () {
        var panneau = this.down('#rubriquePoste');
        this.down('#postesConnus').getStore().load({
            callback: function () {
                panneau.__charge = true;
            }
        });
    },
    etatPoste: function (texte, alerte) {
        var c = this.down('#etatPoste');
        if (c) {
            c.update(texte ? '<span style="color:' + (alerte ? '#c0392b' : '#1e8449') + '">' + Ext.String.htmlEncode(texte) + '</span>' : '');
        }
    },
    loadStore: function () {
        this.getStore().load({
            callback: this.onStoreLoad
        });
    },
    onAddClick: function () {

        new testextjs.view.sm_user.parametre.action.add({
            odatasource: "",
            parentview: this,
            mode: "create",
            titre: "Creation d'parametre"
        });
    },
    onCellClick: function (view, td, cellIndex, rec, tr, rowIndex, e) {
        var column = view.getHeaderAtIndex(cellIndex);
        // retour du 10/11 : le bouton « i » deplie ou replie l'explication du parametre
        if (column && column.itemId === 'paramInfoColumn') {
            if (rec.get('explication')) {
                rec.explicationOuverte = !rec.explicationOuverte;
                // la ligne d'explication (rowbody) suit la ligne du parametre : elle est mise a jour sur place, le
                // rafraichissement d'une ligne ne la redessine pas ; un rechargement repasse par getAdditionalData
                var ligne = view.getNode(rec), corps = ligne ? ligne.nextElementSibling : null;
                if (corps && /x-grid-rowbody-tr/.test(corps.className)) {
                    var zone = corps.querySelector('.x-grid-rowbody');
                    if (zone) {
                        zone.innerHTML = rec.explicationOuverte ? Me_parametres_rendreExplication(rec.get('explication')) : '';
                    }
                    Ext.fly(corps).removeCls(['param-explication-ouverte', 'param-explication-fermee']);
                    Ext.fly(corps).addCls(rec.explicationOuverte ? 'param-explication-ouverte' : 'param-explication-fermee');
                }
                var bouton = td ? td.querySelector('.param-info') : null;
                if (bouton) {
                    Ext.fly(bouton)[rec.explicationOuverte ? 'addCls' : 'removeCls']('param-info-ouvert');
                }
                this.updateLayout();
            }
            return;
        }
        if (!column || column.itemId !== 'paramSwitchColumn') {
            return;
        }
        var valeur = rec.get('str_VALUE');
        if (valeur !== '0' && valeur !== '1') {
            return;
        }
        var nouvelleValeur = (valeur === '1') ? '0' : '1';
        var store = this.getStore();
        Ext.Ajax.request({
            url: url_rest_toggle_parametre,
            method: 'POST',
            params: {
                str_KEY: rec.get('str_KEY'),
                str_VALUE: nouvelleValeur
            },
            success: function (response) {
                var object = Ext.JSON.decode(response.responseText, false);
                if (object.success === "0") {
                    Ext.MessageBox.show({
                        title: 'Message d\'erreur',
                        width: 320,
                        msg: object.errors,
                        buttons: Ext.MessageBox.OK,
                        icon: Ext.MessageBox.WARNING
                    });
                    return;
                }
                // recharge pour refleter aussi l'exclusivite SEMOIS_ABC / SEMOIS_PAR_PRODUIT
                store.reload();
            },
            failure: function (response) {
                console.log("Bug " + response.responseText);
                Ext.MessageBox.alert('Error Message', response.responseText);
            }
        });
    },
   onEditClick: function (grid, rowIndex) {
        var rec = grid.getStore().getAt(rowIndex);
        new testextjs.view.sm_user.parameter.action.add({
            odatasource: rec.data,
            parentview: this,
            mode: "update",
            titre: "Modification du parametre  [" + rec.get('str_DESCRIPTION') + "]"
        });
    },
    onDeleteClick: function (grid, rowIndex) {
        PrestigeConfirmation.ligne('Message', 'Confirmer la suppression de l\'parametre', function () {
                        var rec = grid.getStore().getAt(rowIndex);
                        Ext.Ajax.request({
                            url: url_services_data_parametre_transaction + 'delete',
                            params: {
                                str_KEY: rec.get('str_KEY')
                            },
                            success: function (response)
                            {
                                var object = Ext.JSON.decode(response.responseText, false);
                                if (object.success == 0) {
                                    Ext.MessageBox.alert('Error Message', object.errors);
                                    return;
                                } else {
                                    Ext.MessageBox.alert('Confirmation', object.errors);
                                }
                                grid.getStore().reload();
                            },
                            failure: function (response)
                            {
                                // alert("non ok");
                                var object = Ext.JSON.decode(response.responseText, false);
                                //  alert(object);

                                console.log("Bug " + response.responseText);
                                Ext.MessageBox.alert('Error Message', response.responseText);

                            }
                        });
                        return;
                    });


    },
//    testaction: function (Ovalue) {
//        if (Ovalue == "0") {
//            return '';
//        } else if (Ovalue == "1") {
//            return 'x-hide-display';
//        }
//    },
    onRechClick: function () {
        // extraParam persistant : la recherche ET le filtre de type sont conserves quand on change de page
        var val = Ext.getCmp('rechecher');
        // « this » est l'ecran : la methode est appelee sur lui, jamais sur la globale.
        var combo = this.down ? this.down('#comboTypeParam') : null;
        var store = this.getStore();
        store.getProxy().setExtraParam('search_value', val ? val.getValue() : '');
        store.getProxy().setExtraParam('type_filtre', (combo && combo.getValue()) ? combo.getValue() : '');
        store.getProxy().setExtraParam('rubrique', this.rubrique || '');
        store.loadPage(1);
    }

});

