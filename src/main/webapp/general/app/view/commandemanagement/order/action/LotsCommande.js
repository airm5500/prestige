/* global Ext */

/*
 * Plan du 21/11, point 16.1 : lot et date de peremption en commande en cours (parametre KEY_SAISIE_PEREMPTION_COMMANDE,
 * a 0 par defaut : rien ne change).
 *
 *  - saisie : produit → Entrée → quantité → Entrée → petite fenêtre « N° de lot » puis « Péremption » ; Entrée passe
 *    au champ suivant ; Entrée sur la date valide la ligne (produit, quantité et lot en une seule transaction) ; les
 *    deux champs vides : la ligne est ajoutée sans lot ; Échap : rien n'est ajouté. L'aperçu « 01/27 → 31/01/2027 »
 *    s'affiche pendant la frappe ; une erreur s'affiche sous le champ et la ligne n'est pas validée ;
 *  - un scan DataMatrix dans le champ du lot (lecteur 1D/2D) remplit seulement le lot et la péremption ;
 *  - double-clic sur LOTS / DATE DE PÉREMPTION : les lots de la ligne, un par ligne, modifiables (numéro, date,
 *    quantité), ajout et retrait ; la somme ne dépasse jamais la quantité de la ligne.
 */
Ext.define('testextjs.view.commandemanagement.order.action.LotsCommande', {
    singleton: true,
    requires: ['testextjs.view.commun.PeremptionSaisie'],
    URL: '../api/v1/commande/',
    CLE: 'KEY_SAISIE_PEREMPTION_COMMANDE',

    /** Lit le parametre ; fn(actif). */
    lireParametre: function (fn) {
        Ext.Ajax.request({url: '../api/v1/app-params/value/' + this.CLE, method: 'GET', callback: function (o, ok, rep) {
                var r = Ext.JSON.decode(rep && rep.responseText, true) || {};
                fn(r.success === true && String(r.data).trim() === '1');
            }});
    },

    /** Un code DataMatrix / GS1 plutot qu'un numero de lot tape ? */
    ressembleCode: function (v) {
        var s = String(v || '');
        return s.indexOf('\u001d') >= 0 || /^(\]d2|\]Q3|\]C1)/.test(s) || /^01\d{14}/.test(s) || /^\(01\)/.test(s) || /^17\d{6}10/.test(s);
    },

    apercu: function (fen) {
        var champ = fen.down('#peremption'), t = Ext.String.trim(champ.getValue() || ''), aide = fen.down('#apercu');
        if (!t) {
            aide.update('<span class="lc-gris">Exemples : 01/27 → fin du mois · 010127 → 01/01/2027</span>');
            return null;
        }
        var r = testextjs.view.commun.PeremptionSaisie.lire(t);
        aide.update(r.date ? '<span class="lc-ok">→ ' + r.texte + '</span>' : '<span class="lc-ko">' + Ext.String.htmlEncode(r.motif) + '</span>');
        return r;
    },

    /**
     * Petite fenetre du lot. corps : {familleId, orderId, grossisteId, statut, qte} ; produit : libelle ;
     * sansLot() : ajout habituel ; fini(data) : ligne ajoutee avec son lot ; annule() : Echap.
     */
    ouvrirSaisie: function (corps, produit, sansLot, fini, annule) {
        var me = this, envoi = false;
        var fen = Ext.create('Ext.window.Window', {
            itemId: 'fenSaisieLot', cls: 'lc-fenetre', title: 'Lot et péremption', modal: true, width: 420, resizable: false,
            closeAction: 'destroy', bodyPadding: '10 14', layout: {type: 'vbox', align: 'stretch'},
            items: [
                {xtype: 'component', itemId: 'produit', cls: 'lc-produit', html: '<b>' + Ext.String.htmlEncode(produit || '') + '</b> — qté ' + corps.qte},
                {xtype: 'textfield', itemId: 'lot', fieldLabel: 'N° de lot', labelWidth: 90, maxLength: 200, enforceMaxLength: true, msgTarget: 'under',
                    emptyText: 'Lot, ou scan du DataMatrix', enableKeyEvents: true, validateOnChange: false, validateOnBlur: false},
                {xtype: 'textfield', itemId: 'peremption', fieldLabel: 'Péremption', labelWidth: 90, maxLength: 12, enforceMaxLength: true, msgTarget: 'under',
                    emptyText: '01/27, 010127, 01/01/2027', enableKeyEvents: true, validateOnChange: false, validateOnBlur: false},
                {xtype: 'component', itemId: 'apercu', cls: 'lc-apercu', margin: '0 0 0 95'},
                {xtype: 'component', cls: 'lc-aide', margin: '8 0 0 0',
                    html: 'Entrée : champ suivant · Entrée sur les deux champs vides : valider sans lot · Échap : annuler'}
            ]
        });
        var lot = fen.down('#lot'), per = fen.down('#peremption');
        var fermer = function () {
            envoi = true;
            fen.close();
        };
        var valider = function () {
            if (envoi) {
                return;
            }
            var l = Ext.String.trim(lot.getValue() || ''), d = Ext.String.trim(per.getValue() || '');
            lot.clearInvalid();
            per.clearInvalid();
            if (!l && !d) {
                fermer();
                sansLot();
                return;
            }
            if (!l) {
                lot.markInvalid('Numéro de lot vide : saisissez-le, ou videz aussi la date pour valider sans lot.');
                lot.focus(true);
                return;
            }
            var r = me.apercu(fen);
            if (!d || !r || !r.date) {
                per.markInvalid(!d ? 'Date de péremption vide.' : r.motif);
                per.focus(true);
                return;
            }
            envoi = true;
            fen.setLoading('Enregistrement…');
            Ext.Ajax.request({url: me.URL + 'item/add-lot', method: 'POST', jsonData: Ext.apply({numeroLot: l, peremption: d}, corps), timeout: 60000,
                callback: function (o, ok, rep) {
                    var x = Ext.JSON.decode(rep && rep.responseText, true) || {};
                    if (fen.isDestroyed) {
                        return;
                    }
                    fen.setLoading(false);
                    if (!x.success) {
                        envoi = false;
                        var champ = x.champ === 'lot' ? lot : per;
                        champ.markInvalid(x.message || 'La ligne n\'a pas pu être ajoutée.');
                        champ.focus(true);
                        return;
                    }
                    fermer();
                    fini(x);
                }});
        };
        lot.on('specialkey', function (f, e) {
            if (e.getKey() === e.ENTER) {
                e.stopEvent();
                var v = f.getValue();
                if (me.ressembleCode(v)) {
                    me.lireCode(v, lot, per, fen);
                    return;
                }
                per.focus(true);
            }
        });
        per.on('specialkey', function (f, e) {
            if (e.getKey() === e.ENTER) {
                e.stopEvent();
                valider();
            }
        });
        per.on('change', function () {
            per.clearInvalid();
            me.apercu(fen);
        });
        fen.on('close', function () {
            if (!envoi && annule) {
                annule();
            }
        });
        fen.show();
        me.apercu(fen);
        Ext.defer(function () {
            lot.focus(true);
        }, 60);
        return fen;
    },

    /** Scan dans le champ du lot : le serveur lit le DataMatrix ; seuls le lot et la peremption sont repris. */
    lireCode: function (code, lot, per, fen) {
        var me = this;
        Ext.Ajax.request({url: me.URL + 'lot-depuis-code', method: 'POST', jsonData: {code: code}, callback: function (o, ok, rep) {
                var x = Ext.JSON.decode(rep && rep.responseText, true) || {};
                if (fen.isDestroyed) {
                    return;
                }
                if (!x.success) {
                    lot.markInvalid('Code non lu : saisissez le lot à la main.');
                    lot.focus(true);
                    return;
                }
                lot.setValue(x.lot || '');
                per.setValue(x.peremption || '');
                me.apercu(fen);
                (x.lot ? per : lot).focus(true);
            }});
    },

    /* ======================================================== double-clic : les lots de la ligne, modifiables */

    ouvrirLots: function (itemId, apres) {
        var me = this;
        Ext.Ajax.request({url: me.URL + 'item/' + encodeURIComponent(itemId) + '/lots', method: 'GET', callback: function (o, ok, rep) {
                var x = Ext.JSON.decode(rep && rep.responseText, true) || {};
                if (!x.success) {
                    Ext.MessageBox.alert('Lots', x.message || 'Lots illisibles.');
                    return;
                }
                me.fenetreLots(x, apres);
            }});
    },

    fenetreLots: function (x, apres) {
        var me = this;
        var store = Ext.create('Ext.data.Store', {fields: ['numeroLot', 'datePeremption', {name: 'quantity', type: 'int'}], data: x.lots || []});
        var somme = function () {
            var s = 0;
            store.each(function (r) {
                s += r.get('quantity') || 0;
            });
            return s;
        };
        var etat = function (texte, cls) {
            fen.down('#etatLots').update('<span class="' + (cls || '') + '">' + texte + '</span>');
        };
        var total = function () {
            var s = somme();
            etat('Total des lots : <b>' + s + '</b> sur ' + x.quantite, s > x.quantite ? 'lc-ko' : 'lc-gris');
        };
        var fen = Ext.create('Ext.window.Window', {
            itemId: 'fenLotsLigne', cls: 'lc-fenetre', title: 'Lots — ' + Ext.String.htmlEncode(x.produit || '') + ' (qté ' + x.quantite + ')',
            modal: true, width: 520, height: 330, layout: 'fit', closeAction: 'destroy',
            items: [{xtype: 'gridpanel', itemId: 'grilleLots', store: store, columnLines: true,
                    plugins: [Ext.create('Ext.grid.plugin.CellEditing', {clicksToEdit: 1, listeners: {edit: function () {
                                    total();
                                }}})],
                    viewConfig: {markDirty: false, emptyText: '<div class="lc-gris" style="padding:12px">Aucun lot : « Ajouter un lot ».</div>', deferEmptyText: false},
                    columns: [
                        {text: 'N° de lot', dataIndex: 'numeroLot', flex: 1, editor: {xtype: 'textfield', maxLength: 20}},
                        {text: 'Péremption', dataIndex: 'datePeremption', width: 120, editor: {xtype: 'textfield', maxLength: 12}},
                        {text: 'Quantité', dataIndex: 'quantity', width: 80, align: 'right', editor: {xtype: 'numberfield', minValue: 1, allowDecimals: false}},
                        {xtype: 'actioncolumn', width: 30, items: [{iconCls: 'cmp-retirer', icon: 'resources/images/icons/fam/delete.png', tooltip: 'Retirer ce lot',
                                    handler: function (v, i) {
                                        store.removeAt(i);
                                        total();
                                    }}]}
                    ]}],
            dockedItems: [{xtype: 'toolbar', dock: 'bottom', items: [
                        {xtype: 'button', itemId: 'ajouterLot', text: 'Ajouter un lot', iconCls: 'addicon', handler: function () {
                                var r = store.add({numeroLot: '', datePeremption: '', quantity: Math.max(1, x.quantite - somme())})[0];
                                fen.down('#grilleLots').getPlugins()[0].startEdit(r, 0);
                            }},
                        {xtype: 'component', itemId: 'etatLots', flex: 1, margin: '0 8'},
                        {xtype: 'button', itemId: 'enregistrerLots', text: 'Enregistrer', cls: 'btn-primarya', handler: function (b) {
                                var lots = [];
                                store.each(function (r) {
                                    lots.push({numeroLot: r.get('numeroLot'), datePeremption: r.get('datePeremption'), quantity: r.get('quantity')});
                                });
                                b.disable();
                                Ext.Ajax.request({url: me.URL + 'item/' + encodeURIComponent(x.itemId) + '/lots', method: 'PUT', jsonData: {lots: lots},
                                    callback: function (o, ok, rep) {
                                        var y = Ext.JSON.decode(rep && rep.responseText, true) || {};
                                        if (fen.isDestroyed) {
                                            return;
                                        }
                                        b.enable();
                                        if (!y.success) {
                                            etat(Ext.String.htmlEncode(y.message || 'Lots non enregistrés.'), 'lc-ko');
                                            return;
                                        }
                                        fen.close();
                                        if (apres) {
                                            apres(y);
                                        }
                                    }});
                            }}]}]
        });
        fen.show();
        total();
        return fen;
    }
});
