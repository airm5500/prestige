/* global Ext */

/*
 * Plan du 21/11, point 8.3 : corriger le numero d'un client directement dans une liste de destinataires (onglets des
 * Campagnes, « Ciblage libre » des Rappels), sans fenetre surgissante.
 *
 *  - la colonne Téléphone porte un crayon ✎ (rouge quand le numero est absent ou invalide), visible seulement pour qui
 *    a le droit P_CLIENT_STANDARD_MAJ (verifie aussi par le serveur a chaque enregistrement) ;
 *  - le crayon transforme la cellule en champ : Entree enregistre, Echap annule, l'erreur s'affiche sur le champ ;
 *  - apres l'enregistrement, la ligne reprend le numero, « joignable » et le motif relus par le serveur, avec le meme
 *    calcul que la liste.
 *
 * Usage : colonne(options) dans la liste des colonnes ; options : width, canal (fonction rendant {canal,
 * accordExplicite} pour la grille, facultative : par defaut, les champs #canal et #accord de l'onglet).
 */
Ext.define('testextjs.view.commun.CrayonTelephone', {
    requires: ['testextjs.view.commun.TelephoneSaisie'],
    singleton: true,
    URL: '../api/v1/client-telephone',
    /** null : pas encore lu ; puis true / false. */
    droit: null,
    attente: [],

    /** Lit le droit une fois ; rappelle fn(droit). */
    lireDroit: function (fn) {
        var me = this;
        if (me.droit !== null) {
            fn(me.droit);
            return;
        }
        me.attente.push(fn);
        if (me.attente.length > 1) {
            return;
        }
        Ext.Ajax.request({url: me.URL + '/droit', method: 'GET', callback: function (o, ok, rep) {
                var r = {};
                try {
                    r = Ext.decode(rep.responseText);
                } catch (e) {
                }
                me.droit = !!(r.success && r.modifier);
                var l = me.attente;
                me.attente = [];
                l.forEach(function (f) {
                    f(me.droit);
                });
            }});
    },

    /** Numero valide selon les regles du serveur (mobile ivoirien, ou etranger avec son indicatif : retour du 22/11) ? */
    valide: function (tel) {
        return testextjs.view.commun.TelephoneSaisie.controler(tel).valide;
    },

    colonne: function (options) {
        var me = this, o = options || {};
        return {
            text: 'Téléphone', dataIndex: 'telephone', width: o.width || 120, tdCls: 'crayon-tel-cellule',
            renderer: function (v) {
                var t = Ext.String.htmlEncode(v || '');
                if (!me.droit) {
                    return t;
                }
                var mauvais = !me.valide(v);
                return '<span class="crayon-tel-numero">' + t + '</span><span class="crayon-tel' + (mauvais ? ' crayon-tel-alerte' : '')
                        + '" data-qtip="' + (mauvais ? 'Numéro absent ou invalide : cliquez pour le corriger' : 'Corriger le numéro')
                        + '">✎</span>';
            },
            listeners: {
                /* la grille s'affiche avant la reponse du droit : elle est redessinee quand il arrive */
                afterrender: function (col) {
                    me.lireDroit(function (d) {
                        var g = col.up('tablepanel');
                        if (d && g && !g.isDestroyed && g.getView().viewReady) {
                            g.getView().refresh();
                        }
                    });
                },
                click: function (view, cell, ligne, colonne, e, record) {
                    if (me.droit && e.getTarget('.crayon-tel')) {
                        e.stopEvent();
                        me.ouvrir(view, cell, record, o, view.up('tablepanel'));
                    }
                }
            }
        };
    },

    /** La cellule devient un champ : Entree enregistre, Echap annule. */
    ouvrir: function (view, cell, record, o, grille) {
        var me = this, enCours = false;
        var editeur = Ext.create('Ext.Editor', {
            cls: 'crayon-tel-editeur', autoSize: {width: 'boundEl'}, completeOnEnter: false, cancelOnEsc: true, revertInvalid: false,
            updateEl: false, allowBlur: false, constrain: true,
            field: {xtype: 'textfield', itemId: 'champTelephone', emptyText: '07 00 00 00 00', enableKeyEvents: true, maxLength: 20,
                msgTarget: 'under', validateOnChange: false, validateOnBlur: false,
                listeners: {
                    specialkey: function (f, e) {
                        if (e.getKey() === e.ENTER) {
                            e.stopEvent();
                            if (!enCours) {
                                enCours = true;
                                me.enregistrer(f, record, o, grille, function (fini) {
                                    enCours = false;
                                    if (fini) {
                                        editeur.cancelEdit();
                                    }
                                });
                            }
                        }
                    },
                    blur: function () {
                        /* sortir du champ sans Entree : rien n'est enregistre */
                        Ext.defer(function () {
                            if (!enCours && !editeur.isDestroyed && editeur.editing) {
                                editeur.cancelEdit();
                            }
                        }, 150);
                    }
                }}
        });
        editeur.on('canceledit', function () {
            Ext.defer(function () {
                editeur.destroy();
            }, 1);
        });
        editeur.startEdit(Ext.fly(cell).down('.x-grid-cell-inner') || cell, record.get('telephone') || '');
        Ext.defer(function () {
            editeur.field.focus(true);
        }, 20);
        return editeur;
    },

    /** Canal de l'onglet : le premier conteneur de la grille qui porte un champ #canal (et #accord). */
    canalDe: function (grille) {
        var p = grille && grille.ownerCt;
        while (p && !(p.down && p.down('#canal'))) {
            p = p.ownerCt;
        }
        return p ? {canal: p.down('#canal').getValue(), accordExplicite: !!(p.down('#accord') && p.down('#accord').getValue())} : {};
    },

    enregistrer: function (champ, record, o, grille, fin) {
        var me = this, c = o.canal ? o.canal(grille) : me.canalDe(grille);
        champ.clearInvalid();
        Ext.Ajax.request({url: me.URL, method: 'POST', jsonData: {clientId: record.get('clientId'), telephone: champ.getValue(),
                canal: c.canal || 'SMS', accordExplicite: !!c.accordExplicite}, timeout: 60000,
            callback: function (op, ok, rep) {
                var r = {};
                try {
                    r = Ext.decode(rep.responseText);
                } catch (e) {
                }
                if (!r.success) {
                    champ.markInvalid(r.message || 'Le numéro n\'a pas pu être enregistré.');
                    champ.focus(false);
                    fin(false);
                    return;
                }
                fin(true);
                var maj = {telephone: r.telephone};
                if (record.fields.containsKey('joignable')) {
                    maj.joignable = r.joignable;
                    maj.motif = r.motif;
                }
                record.set(maj);
                record.commit();
                /* un client devenu injoignable ne reste pas coche */
                var g = grille;
                if (g && !g.isDestroyed && maj.joignable === false && g.getSelectionModel().isSelected(record)) {
                    g.getSelectionModel().deselect(record);
                }
            }});
    }
});
