/* global Ext, testextjs */

/*
 * DISPONIBILITE PHARMAML (plan d'octobre 1.2), commun a la suggestion et a la commande.
 *
 * « Vérifier la disponibilité » interroge le grossiste de la suggestion / commande pour tous ses produits ;
 * « Revérifier les indisponibles » ne reprend que les produits marqués non disponibles (ou « autre ») et demande CHEZ
 * QUEL grossiste vérifier (le code article du produit chez ce grossiste est utilisé s'il existe). Les produits partent
 * par paquets de 50 (maximum du protocole), avec une barre de progression ; l'écran reste utilisable entre deux
 * paquets. Information seulement : aucune commande n'est passée.
 *
 * Colonne « DISPO » : vert = disponible, rouge = non disponible, orange = autre, gris = sans réponse ; l'info-bulle
 * donne le motif, la date et la quantité de mise à disposition, le remplaçant et le grossiste interrogé.
 */
Ext.define('testextjs.view.commandemanagement.disponibilite.DisponibilitePharmaMl', {
    singleton: true,

    COULEURS: {OUI: '#17987e', NON: '#c0392b', AUTRE: '#e08a1e', INCONNU: '#9aa8b6'},
    LIBELLES: {OUI: 'Disponible', NON: 'Non disponible', AUTRE: 'Autre', INCONNU: 'Sans réponse'},

    /** Dernier etat connu par produit : cb(map lg_FAMILLE_ID -> etat). */
    chargerEtat: function (source, id, cb) {
        Ext.Ajax.request({
            method: 'GET', url: '../api/v1/disponibilite/etat', params: {source: source, id: id},
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                cb(o.produits || {});
            },
            failure: function () {
                cb({});
            }
        });
    },

    /** Rendu de la colonne : pastille de couleur + info-bulle. */
    rendu: function (etat, meta) {
        var me = this;
        if (!etat) {
            return '';
        }
        var enc = Ext.String.htmlEncode, info = me.LIBELLES[etat.statut] || etat.statut;
        if (etat.libelle) {
            info += ' : ' + etat.libelle;
        }
        if (etat.dateDispo) {
            info += '<br>Mise à disposition : ' + etat.dateDispo + (etat.quantiteDispo !== null && etat.quantiteDispo !== undefined ? ' (' + etat.quantiteDispo + ')' : '');
        }
        if (etat.remplacant) {
            info += '<br>Remplaçant : ' + etat.remplacant;
        }
        info += '<br>' + (etat.grossiste || '') + ' · ' + (etat.date || '');
        if (meta) {
            meta.tdAttr = 'data-qtip="' + enc(info) + '"';
        }
        return '<span class="dispo-boule" data-dispo="' + etat.statut + '" style="display:inline-block;width:12px;height:12px;border-radius:50%;background:'
                + (me.COULEURS[etat.statut] || '#9aa8b6') + '"></span>';
    },

    /**
     * Lance la verification. cfg : source ('SUGGESTION' | 'COMMANDE'), id, indisponibles (bool), apres(etat).
     */
    verifier: function (cfg) {
        var me = this;
        Ext.Ajax.request({
            method: 'GET', url: '../api/v1/disponibilite/produits',
            params: {source: cfg.source, id: cfg.id, indisponibles: !!cfg.indisponibles},
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (!o.success) {
                    Ext.MessageBox.alert('Disponibilité', o.msg || 'Lecture impossible.');
                    return;
                }
                if (!o.total) {
                    Ext.MessageBox.alert('Disponibilité', cfg.indisponibles ? 'Aucun produit marqué non disponible à revérifier.' : 'Aucun produit à vérifier.');
                    return;
                }
                if (cfg.indisponibles) {
                    me.choisirGrossiste(o.grossisteId, o.total, function (grossisteId) {
                        me.lancer(cfg, o.familles, grossisteId);
                    });
                } else {
                    me.lancer(cfg, o.familles, null);
                }
            }
        });
    },

    choisirGrossiste: function (defaut, total, suite) {
        var store = Ext.create('Ext.data.Store', {
            model: 'testextjs.model.Grossiste', pageSize: 999, autoLoad: true,
            proxy: {type: 'ajax', url: '../api/v1/grossiste/all', reader: {type: 'json', root: 'results', totalProperty: 'total'}}
        });
        var w = Ext.create('Ext.window.Window', {
            title: 'Revérifier les indisponibles', modal: true, width: 440, bodyPadding: 14, cls: 'dispo-choix', itemId: 'dispoChoixGrossiste',
            items: [{xtype: 'displayfield', value: total + ' produit(s) non disponible(s) à revérifier. Chez quel grossiste ?'},
                {xtype: 'combobox', itemId: 'grossiste', store: store, queryMode: 'local', displayField: 'str_LIBELLE',
                    valueField: 'lg_GROSSISTE_ID', editable: false, width: 380, emptyText: 'Choisir un grossiste...', value: defaut || null}],
            buttons: [{text: 'Annuler', handler: function () {
                        w.close();
                    }}, {text: 'Vérifier', itemId: 'ok', handler: function () {
                        var g = w.down('#grossiste').getValue();
                        if (!g) {
                            Ext.MessageBox.alert('Disponibilité', 'Choisissez un grossiste.');
                            return;
                        }
                        w.close();
                        suite(g);
                    }}]
        });
        w.show();
    },

    lancer: function (cfg, familles, grossisteId) {
        var me = this, paquets = [], i, cumul = {oui: 0, non: 0, autre: 0, inconnu: 0}, erreur = null, grossiste = '';
        for (i = 0; i < familles.length; i += 50) {
            paquets.push(familles.slice(i, i + 50));
        }
        Ext.MessageBox.progress('Disponibilité PharmaML', 'Interrogation du grossiste…', '0 / ' + familles.length);
        var suivant = function (n) {
            if (n >= paquets.length || erreur) {
                Ext.MessageBox.hide();
                me.chargerEtat(cfg.source, cfg.id, function (etat) {
                    if (cfg.apres) {
                        cfg.apres(etat);
                    }
                    Ext.MessageBox.alert('Disponibilité PharmaML', erreur ? Ext.String.htmlEncode(erreur)
                            : '<b>' + Ext.String.htmlEncode(grossiste) + '</b> : ' + cumul.oui + ' disponible(s), ' + cumul.non + ' non disponible(s), '
                            + cumul.autre + ' autre(s), ' + cumul.inconnu + ' sans réponse.<br><span style="color:#6b7b8c">Information seulement : aucune commande n\'a été passée.</span>');
                });
                return;
            }
            Ext.Ajax.request({
                method: 'POST', url: '../api/v1/disponibilite/verifier', timeout: 180000,
                jsonData: {source: cfg.source, id: cfg.id, grossisteId: grossisteId, familles: paquets[n]},
                success: function (r) {
                    var o = Ext.decode(r.responseText, true) || {};
                    if (!o.success) {
                        erreur = o.msg || 'Interrogation impossible.';
                    } else {
                        grossiste = o.grossiste;
                        cumul.oui += o.oui;
                        cumul.non += o.non;
                        cumul.autre += o.autre;
                        cumul.inconnu += o.inconnu;
                    }
                    var fait = Math.min(familles.length, (n + 1) * 50);
                    Ext.MessageBox.updateProgress(fait / familles.length, fait + ' / ' + familles.length);
                    suivant(n + 1);
                },
                failure: function () {
                    erreur = 'Le serveur ne répond pas.';
                    suivant(n + 1);
                }
            });
        };
        suivant(0);
    },

    imprimer: function (source, id, reference) {
        window.open('../api/v1/disponibilite/pdf?source=' + encodeURIComponent(source) + '&id=' + encodeURIComponent(id)
                + '&reference=' + encodeURIComponent(reference || ''));
    },

    /** Filtre local de la page affichee : '' (tous), OUI, NON, AUTRE, INCONNU, AUCUN (jamais verifie). */
    filtrer: function (store, etat, valeur) {
        store.clearFilter();
        if (!valeur) {
            return;
        }
        store.filterBy(function (rec) {
            var e = etat[rec.get('lg_FAMILLE_ID')];
            return valeur === 'AUCUN' ? !e : (e && e.statut === valeur);
        });
    },

    /** Combo de filtre a placer dans une barre. */
    comboFiltre: function (itemId, surChoix) {
        return {
            xtype: 'combobox', itemId: itemId, width: 150, editable: false, queryMode: 'local', displayField: 'l', valueField: 'v', value: '',
            store: Ext.create('Ext.data.Store', {fields: ['v', 'l'], data: [{v: '', l: 'Dispo : toutes'}, {v: 'OUI', l: 'Disponibles'},
                    {v: 'NON', l: 'Non disponibles'}, {v: 'AUTRE', l: 'Autre'}, {v: 'INCONNU', l: 'Sans réponse'}, {v: 'AUCUN', l: 'Non vérifiés'}]}),
            listeners: {select: function (c) {
                    surChoix(c.getValue());
                }}
        };
    }
});
