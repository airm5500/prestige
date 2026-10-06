/* global Ext */

/*
 * EQUIVALENTS DCI D'UNE SUGGESTION (plan d'octobre, 1.1).
 *
 * Ouverte UNIQUEMENT par le bouton « Équivalents DCI » de l'écran de traitement (rien n'est calculé à l'ouverture de
 * la suggestion). Pour chaque produit suggéré : tous ses substituts EN STOCK (même DCI), directs d'abord, puis le
 * plus de stock, la vente la plus récente, le prix. Quantité couverte = stock des équivalents DIRECTS, bornée par la
 * quantité suggérée ; les « à adapter » sont affichés pour information et ne comptent jamais.
 *
 * Action « Retirer les produits couverts » : ligne entièrement couverte → retirée ; ligne couverte en partie → l'écran
 * fait choisir « Garder » ou « Retirer et créer un reliquat » (nouvelle suggestion du même grossiste, commentée
 * « Reliquat substitution »). Récapitulatif et confirmation avant l'envoi ; le serveur recalcule la couverture.
 * Les lignes retirées restent récupérables (bouton « Produits retirés »).
 */
Ext.define('testextjs.view.sm_user.suggerercde.EquivalentsDciFenetre', {
    extend: 'Ext.window.Window',
    xtype: 'equivalentsdcifenetre',
    cls: 'vc-fenetre eq-fenetre',
    header: false,
    modal: true,
    resizable: false,
    draggable: false,
    closeAction: 'destroy',
    /* Retours du 06/10 (4) : aussi large que l'ecran le permet (une ligne par substitut), bouton « agrandir ». */
    width: 1180,
    height: 660,
    bodyPadding: 0,
    layout: 'fit',
    suggestionId: null,
    /** Limite l'affichage a une ligne (clic sur le marqueur de la grille). */
    itemId: null,
    /** Appele apres un retrait reussi (rechargement de la grille). */
    apresRetrait: null,
    /** Appele apres chaque analyse avec les lignes ayant un substitut (marqueurs de la grille). */
    apresAnalyse: null,
    filtre: 'tous',
    recherche: '',

    initComponent: function () {
        var me = this, v = Ext.getBody().getViewSize();
        me.width = Math.max(me.width, Math.min(1560, v.width - 40));
        me.height = Math.max(Math.min(me.height, v.height - 40), Math.min(760, v.height - 40));
        me.html = '<div class="vc"><div class="vc-chargement">Recherche des équivalents DCI en stock…</div></div>';
        me.callParent(arguments);
        me.on('afterrender', function () {
            me.getEl().on('click', me.surClic, me, {delegate: '[data-action]'});
            me.getEl().on('input', me.surSaisie, me, {delegate: 'input[data-filtre]'});
            me.cle = new Ext.util.KeyMap({target: Ext.getDoc(), key: Ext.EventObject.ESC, fn: me.close, scope: me});
            me.charger();
        });
        me.on('destroy', function () {
            if (me.cle) {
                me.cle.destroy();
            }
        });
    },

    charger: function () {
        var me = this;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/suggestion-equivalents/' + encodeURIComponent(me.suggestionId),
            params: me.itemId ? {itemId: me.itemId} : {},
            timeout: 120000,
            success: function (reponse) {
                if (me.isDestroyed) {
                    return;
                }
                var r = Ext.decode(reponse.responseText, true) || {};
                me.donnees = r;
                if (r.success && !me.itemId && me.apresAnalyse) {
                    me.apresAnalyse(r.data || []);
                }
                me.dessiner();
            },
            failure: function () {
                if (!me.isDestroyed) {
                    me.donnees = {success: false, msg: 'L\'analyse n\'a pas pu être faite.'};
                    me.dessiner();
                }
            }
        });
    },

    surSaisie: function (e, cible) {
        this.recherche = (cible.value || '').toUpperCase();
        var pos = cible.selectionStart;
        this.dessiner();
        var champ = this.getEl().dom.querySelector('input[data-filtre]');
        if (champ) {
            champ.focus();
            try {
                champ.setSelectionRange(pos, pos);
            } catch (ex) { /* sans importance */ }
        }
    },

    surClic: function (e, cible) {
        var me = this, action = cible.getAttribute('data-action');
        if (cible.tagName !== 'INPUT' && cible.tagName !== 'SELECT') {
            e.preventDefault();
        }
        if (action === 'fermer') {
            me.close();
        } else if (action === 'agrandir') {
            me.basculerTaille();
        } else if (action === 'imprimer') {
            window.open('../api/v1/suggestion-equivalents/' + encodeURIComponent(me.suggestionId) + '/pdf');
        } else if (action === 'filtre') {
            me.filtre = cible.getAttribute('data-valeur');
            me.dessiner();
        } else if (action === 'tout') {
            var coche = cible.checked;
            Ext.each(me.getEl().dom.querySelectorAll('input[data-ligne]'), function (c) {
                c.checked = coche;
            });
        } else if (action === 'retirer') {
            me.preparerRetrait();
        }
    },

    basculerTaille: function () {
        var me = this, v = Ext.getBody().getViewSize();
        if (!me.tailleNormale) {
            me.tailleNormale = [me.getWidth(), me.getHeight()];
            me.setSize(v.width - 16, v.height - 16);
        } else {
            me.setSize(me.tailleNormale[0], me.tailleNormale[1]);
            me.tailleNormale = null;
        }
        me.center();
        var b = me.getEl().dom.querySelector('[data-action="agrandir"]');
        if (b) {
            b.innerHTML = me.tailleNormale ? '&#x2752;' : '&#x26F6;';
            b.title = me.tailleNormale ? 'Taille normale' : 'Agrandir';
        }
    },

    lignesVisibles: function () {
        var me = this, r = me.donnees || {};
        return Ext.Array.filter(r.data || [], function (l) {
            if (me.recherche && (l.produit.nom + ' ' + l.produit.cip + ' ' + l.produit.dci).toUpperCase().indexOf(me.recherche) < 0) {
                return false;
            }
            if (me.filtre === 'couverts') {
                return l.couverte > 0;
            }
            if (me.filtre === 'adapter') {
                return Ext.Array.some(l.substituts, function (s) {
                    return s.niveau !== 'direct';
                });
            }
            return true;
        });
    },

    dessiner: function () {
        var me = this, r = me.donnees || {}, enc = Ext.String.htmlEncode, fmt = function (n) {
            return Math.round(n || 0).toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ');
        };
        var corps;
        if (r.success === false) {
            corps = '<div class="vc-vide">' + enc(r.msg || 'L\'analyse n\'a pas pu être faite.') + '</div>';
        } else if (!(r.data || []).length) {
            corps = '<div class="vc-vide">Aucun produit de cette suggestion n\'a d\'équivalent DCI en stock.'
                    + (r.tuiles && r.tuiles.sansDci ? '<br>' + r.tuiles.sansDci + ' produit(s) n\'ont pas de DCI renseignée sur leur fiche.' : '') + '</div>';
        } else {
            var t = r.tuiles, tuile = function (v, l) {
                return '<div class="vc-tuile"><div class="vc-tuile-valeur">' + v + '</div><div class="vc-tuile-libelle">' + l + '</div></div>';
            };
            var puce = function (v, l) {
                return '<button type="button" class="vc-puce' + (me.filtre === v ? ' vc-puce-active' : '') + '" data-action="filtre" data-valeur="' + v + '">' + l + '</button>';
            };
            var lignes = me.lignesVisibles();
            corps = (me.itemId ? '' : '<div class="vc-tuiles">' + tuile(t.avecSubstitut + ' / ' + t.lignes, 'produits avec un équivalent')
                    + tuile(t.concernes, 'produits couverts') + tuile(fmt(t.unitesCouvertes), 'unités couvertes')
                    + tuile(fmt(t.valeurCouverteAchat) + '<small style="font-size:12px;color:#6b7b8c"> / ' + fmt(t.valeurCouverteVente) + '</small>', 'valeur couverte achat / vente')
                    + tuile(fmt(t.valeurAvantAchat) + ' → ' + fmt(t.valeurApresAchat), 'suggestion (achat) avant → après') + '</div>')
                    + '<div class="eq-alerte">Aide à la décision : vérifiez la prescription, le dosage, la forme et les contre-indications. '
                    + 'Seuls les équivalents <b>directs</b> en boîte comptent dans la quantité couverte.<br>'
                    + '<span class="eq-niv eq-direct">Direct</span> même DCI, même dosage, même forme · '
                    + '<span class="eq-niv eq-adapter">À adapter</span> même DCI mais dosage ou forme différents (ou non lisibles dans le libellé) : '
                    + 'pour information, il faut adapter la posologie ; ne compte jamais.</div>'
                    + (me.itemId ? '' : '<div class="eq-filtres">' + puce('tous', 'Tous') + puce('couverts', 'Couverts') + puce('adapter', 'Avec « à adapter »')
                            + '<input type="text" data-filtre="1" placeholder="Produit, CIP ou DCI" value="' + enc(me.recherche) + '"></div>')
                    + '<div class="vc-tableau eq-tableau"><table><thead><tr><th style="width:24px"><input type="checkbox" data-action="tout" title="Tout cocher"></th>'
                    + '<th>Produit suggéré</th><th class="vc-n">Stock</th><th class="vc-n">Suggéré</th><th class="vc-n">Couvert</th>'
                    + '<th>Substituts en stock</th></tr></thead><tbody>'
                    + Ext.Array.map(lignes, function (l) {
                        var p = l.produit, couv = l.couverte >= l.qteSuggeree && l.couverte > 0 ? 'eq-couv' : (l.couverte > 0 ? 'eq-partiel' : 'eq-nul');
                        var subs = '<table class="eq-subs">' + Ext.Array.map(l.substituts, function (s) {
                            var niv = s.niveau === 'direct' ? '<span class="eq-niv eq-direct" title="Même DCI, même dosage, même forme">Direct</span>'
                                    : '<span class="eq-niv eq-adapter" title="Même DCI, dosage ou forme différents : posologie à adapter, ne compte pas">À adapter</span>';
                            if (s.dansSuggestion) {
                                niv += ' <span class="eq-niv eq-hors" title="Aussi dans la suggestion : ne compte pas">dans la suggestion</span>';
                            } else if (s.detail) {
                                niv += ' <span class="eq-niv eq-hors" title="Vendu à l\'unité : ne compte pas">à l\'unité</span>';
                            }
                            return '<tr title="' + enc(s.raison) + '"><td>' + niv + '</td><td><b>' + enc(s.nom) + '</b> <span class="vc-cip">' + enc(s.cip) + '</span></td>'
                                    + '<td class="vc-n">stock <span class="vc-stock">' + s.stock + '</span>' + (s.utilise ? ' <span class="eq-utilise">(' + s.utilise + ' retenu' + (s.utilise > 1 ? 's' : '') + ')</span>' : '') + '</td>'
                                    + '<td class="vc-n">' + fmt(s.prix) + '</td>'
                                    + '<td>entrée ' + (s.derniereEntree ? enc(s.derniereEntree) + ' (' + s.qteDerniereEntree + ')' : '—') + '</td>'
                                    + '<td>vente ' + (s.derniereVente ? enc(s.derniereVente) + ' (' + s.qteDerniereVente + ')' : '—') + '</td></tr>';
                        }).join('') + '</table>';
                        return '<tr><td>' + (l.couverte > 0 ? '<input type="checkbox" data-ligne="' + enc(l.itemId) + '">' : '') + '</td>'
                                + '<td><b>' + enc(p.nom) + '</b> <span class="vc-cip">' + enc(p.cip) + '</span><div class="eq-dci">' + enc(p.dci) + '</div>'
                                + '<div class="eq-dci">entrée ' + (p.derniereEntree ? enc(p.derniereEntree) + ' (' + p.qteDerniereEntree + ')' : '—')
                                + ' · vente ' + (p.derniereVente ? enc(p.derniereVente) + ' (' + p.qteDerniereVente + ')' : '—') + ' · prix ' + fmt(p.prix) + '</div></td>'
                                + '<td class="vc-n">' + p.stock + '</td><td class="vc-n"><b>' + l.qteSuggeree + '</b></td>'
                                + '<td class="vc-n"><span class="' + couv + '">' + l.couverte + '</span></td><td>' + subs + '</td></tr>';
                    }).join('') + '</tbody></table></div>';
        }
        var aDesCouverts = r.success && Ext.Array.some(r.data || [], function (l) {
            return l.couverte > 0;
        });
        me.update('<div class="vc">'
                + '<div class="vc-tete"><div><div class="vc-sur">Équivalents DCI en stock · suggestion ' + enc(r.reference || '') + ' · ' + enc(r.grossiste || '') + '</div>'
                + '<div class="vc-nom">Produits déjà couverts par un équivalent en stock</div></div>'
                + '<span><button type="button" class="vc-croix eq-agrandir" data-action="agrandir" title="' + (me.tailleNormale ? 'Taille normale' : 'Agrandir') + '">'
                + (me.tailleNormale ? '&#x2752;' : '&#x26F6;') + '</button> '
                + '<button type="button" class="vc-croix" data-action="fermer" aria-label="Fermer">&times;</button></span></div>'
                + '<div class="vc-corps">' + corps + '</div>'
                + '<div class="vc-pied"><span>Cochez les lignes couvertes à retirer de la suggestion. Elles resteront récupérables.</span>'
                + '<span class="va-boutons">' + (r.success && (r.data || []).length ? '<button type="button" class="vc-bouton vc-bouton-second" data-action="imprimer">Imprimer</button> ' : '')
                + (aDesCouverts ? '<button type="button" class="vc-bouton" data-action="retirer">Retirer les produits couverts…</button> ' : '')
                + '<button type="button" class="vc-bouton vc-bouton-second" data-action="fermer">Fermer</button></span></div></div>');
    },

    /** Recapitulatif : lignes entierement couvertes retirees, lignes partielles a decider (garder / reliquat). */
    preparerRetrait: function () {
        var me = this, enc = Ext.String.htmlEncode;
        var ids = Ext.Array.map(Ext.Array.slice(me.getEl().dom.querySelectorAll('input[data-ligne]:checked')), function (c) {
            return c.getAttribute('data-ligne');
        });
        if (!ids.length) {
            Ext.MessageBox.alert('Équivalents DCI', 'Cochez au moins une ligne couverte.');
            return;
        }
        var choisies = Ext.Array.filter(me.donnees.data, function (l) {
            return Ext.Array.contains(ids, l.itemId);
        });
        var html = '<div class="vc-tableau" style="margin:4px 0"><table><thead><tr><th>Produit</th><th class="vc-n">Suggéré</th><th class="vc-n">Couvert</th><th>Décision</th></tr></thead><tbody>'
                + Ext.Array.map(choisies, function (l) {
                    var decision = l.reste === 0 ? '<b>Retirée</b> (entièrement couverte)'
                            : '<select class="eq-choix" data-reliquat="' + enc(l.itemId) + '"><option value="garder">Garder la ligne telle quelle</option>'
                            + '<option value="reliquat">Retirer et commander le reliquat de ' + l.reste + '</option></select>';
                    return '<tr><td><b>' + enc(l.produit.nom) + '</b></td><td class="vc-n">' + l.qteSuggeree + '</td><td class="vc-n">' + l.couverte + '</td><td>' + decision + '</td></tr>';
                }).join('') + '</tbody></table></div>'
                + (Ext.Array.some(choisies, function (l) {
                    return l.reste > 0;
                }) ? '<div class="eq-alerte">Certaines lignes ne sont couvertes qu\'en partie : vous voulez commander plus que ce que les équivalents couvrent. '
                        + 'Les reliquats iront dans une nouvelle suggestion du même grossiste, commentée « Reliquat substitution ».</div>' : '');
        var w = Ext.create('Ext.window.Window', {
            cls: 'vc-fenetre', header: false, modal: true, width: 760, closeAction: 'destroy', resizable: false, draggable: false,
            html: '<div class="vc"><div class="vc-tete"><div><div class="vc-sur">Récapitulatif</div><div class="vc-nom">Retirer ' + choisies.length + ' ligne(s) de la suggestion</div></div>'
                    + '<button type="button" class="vc-croix" data-action="fermer">&times;</button></div><div class="vc-corps" style="max-height:420px">' + html + '</div>'
                    + '<div class="vc-pied"><span>Confirmez pour appliquer.</span><span class="va-boutons"><button type="button" class="vc-bouton vc-bouton-second" data-action="fermer">Annuler</button> '
                    + '<button type="button" class="vc-bouton" data-action="valider">Confirmer le retrait</button></span></div></div>'
        });
        w.on('afterrender', function () {
            w.getEl().on('click', function (e, c) {
                var a = c.getAttribute('data-action');
                e.preventDefault();
                if (a === 'fermer') {
                    w.close();
                } else if (a === 'valider') {
                    var lignes = [];
                    Ext.each(choisies, function (l) {
                        if (l.reste === 0) {
                            lignes.push({id: l.itemId});
                        } else {
                            var s = w.getEl().dom.querySelector('select[data-reliquat="' + l.itemId + '"]');
                            if (s && s.value === 'reliquat') {
                                lignes.push({id: l.itemId, avecReliquat: true});
                            }
                        }
                    });
                    if (!lignes.length) {
                        w.close();
                        return;
                    }
                    w.close();
                    me.envoyerRetrait(lignes);
                }
            }, null, {delegate: '[data-action]'});
        });
        w.show();
    },

    envoyerRetrait: function (lignes) {
        var me = this;
        testextjs.app.getController('App').ShowWaitingProcess();
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/suggestion-equivalents/' + encodeURIComponent(me.suggestionId) + '/retirer',
            jsonData: {lignes: lignes},
            success: function (reponse) {
                testextjs.app.getController('App').StopWaitingProcess();
                var r = Ext.decode(reponse.responseText, true) || {};
                if (!r.success) {
                    Ext.MessageBox.alert('Équivalents DCI', r.msg || 'Le retrait n\'a pas pu être fait.');
                    return;
                }
                var msg = r.retirees + ' ligne(s) retirée(s) de la suggestion (récupérables par « Produits retirés »).';
                if (r.reliquatRef) {
                    msg += '<br>Reliquat : suggestion <b>' + Ext.String.htmlEncode(r.reliquatRef) + '</b> créée (' + r.reliquatLignes + ' ligne(s)).';
                }
                if (me.apresRetrait) {
                    me.apresRetrait(r);
                }
                Ext.MessageBox.alert('Équivalents DCI', msg);
                if (!me.isDestroyed) {
                    me.charger();
                }
            },
            failure: function () {
                testextjs.app.getController('App').StopWaitingProcess();
                Ext.MessageBox.alert('Équivalents DCI', 'Le retrait n\'a pas pu être fait.');
            }
        });
    }
});
