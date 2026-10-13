/* global Ext */

/*
 * FILTRE MULTIPLE des ecrans d'analyse (maquette validee le 13/10) : rayons, familles et grossistes COCHES, dans
 * n'importe quel ordre, combinables entre axes (un rayon ET une famille...).
 *
 * Deux presentations, au choix de l'utilisateur par le bouton ⇄ (memorise pour lui, preference
 * « filtres.presentation ») :
 *  - B (par defaut) : un seul bouton « Filtres » ; panneau avec un onglet par axe, recherche, « Tout cocher »,
 *    « Tout decocher » et le recapitulatif ; le choix s'affiche en etiquettes sous la barre, chacune se retire d'un clic ;
 *  - A : un bouton par axe (« Rayon : SIROPS, PALU +1 ») ouvrant sa liste a cocher.
 *
 * Utilisation : {xtype: 'filtresmulti', itemId: 'filtres', axes: ['rayon', 'famille', 'grossiste']} dans la barre
 * d'outils ; lecture par getParam('rayon') (identifiants separes par des virgules, vide = tous). Evenement
 * 'change' (filtre, valeurs) a la fermeture du panneau quand le choix a change, et au retrait d'une etiquette.
 */
Ext.define('testextjs.view.commun.FiltresMulti', {
    extend: 'Ext.container.Container',
    alias: 'widget.filtresmulti',
    layout: {type: 'hbox', align: 'middle'},
    cls: 'fm',
    /** Axes proposes par l'ecran, dans l'ordre des onglets. */
    axes: ['rayon', 'famille', 'grossiste'],
    presentation: 'B',

    statics: {
        CLE_PREF: 'filtres.presentation',
        AXES: {
            rayon: {libelle: 'Rayon', pluriel: 'Rayons', url: '../api/v1/common/rayons'},
            famille: {libelle: 'Famille', pluriel: 'Familles', url: '../api/v1/common/famillearticles'},
            grossiste: {libelle: 'Grossiste', pluriel: 'Grossistes', url: '../api/v1/common/grossiste'}
        },
        /** Listes chargees une fois par session : {axe: [{id, libelle}]}. */
        donnees: {},
        attentes: {},
        /**
         * Remplace les listes a choix unique d'un ecran existant (13/10), sans toucher a son code : les listes sont
         * masquees, le filtre multiple prend la place de la premiere, et chaque liste rend desormais la selection de
         * son axe par getValue() (identifiants separes par des virgules ; null si rien) et ses noms par getRawValue().
         * Un changement de selection declenche l'evenement 'select' de la liste de l'axe modifie, comme un choix dans
         * la liste : les recherches automatiques de l'ecran partent donc comme avant.
         *
         * @param ecran composant qui contient les listes
         * @param listes {rayon: '#selecteur', famille: '#selecteur', grossiste: '#selecteur'} (axes presents seulement)
         * @return le filtre multiple cree, ou null si une liste manque (l'ecran reste alors tel quel)
         */
        remplacer: function (ecran, listes) {
            var axes = [], combos = {}, premier = null;
            Ext.each(['rayon', 'famille', 'grossiste'], function (a) {
                if (listes[a]) {
                    var c = Ext.isString(listes[a]) ? ecran.down(listes[a]) : listes[a];
                    if (c) {
                        axes.push(a);
                        combos[a] = c;
                        premier = premier || c;
                    }
                }
            });
            if (!premier || !premier.ownerCt) {
                return null;
            }
            var conteneur = premier.ownerCt;
            var filtre = conteneur.insert(conteneur.items.indexOf(premier), {xtype: 'filtresmulti', itemId: 'filtresMulti',
                axes: axes, margin: premier.margin || '0 5 0 0'});
            Ext.Object.each(combos, function (a, c) {
                c.hide();
                c.filtreMulti = filtre;
                c.getValue = function () {
                    var v = filtre.getParam(a);
                    return v === '' ? null : v;
                };
                c.getSubmitValue = c.getValue;
                c.getRawValue = function () {
                    return Ext.Array.map(filtre.valeurs[a], function (id) {
                        return filtre.libelleDe(a, id);
                    }).join(', ');
                };
                c.setValue = function (v) {
                    var ids = Ext.isArray(v) ? v : (v === null || v === undefined || v === '' ? [] : String(v).split(','));
                    filtre.valeurs[a] = Ext.Array.map(Ext.Array.filter(ids, function (x) {
                        return x !== '' && x !== 'ALL';
                    }), String);
                    filtre.rafraichir();
                    return c;
                };
                c.clearValue = function () {
                    return c.setValue(null);
                };
                c.reset = c.clearValue;
            });
            var avant = filtre.getValeurs();
            filtre.on('change', function () {
                var apres = filtre.getValeurs(), declenche = false;
                Ext.each(axes, function (a) {
                    if (!declenche && Ext.encode(avant[a]) !== Ext.encode(apres[a])) {
                        declenche = true;
                        combos[a].fireEvent('select', combos[a], []);
                    }
                });
                avant = apres;
            });
            return filtre;
        },

        /** Lit la liste d'un axe (une seule requete par axe, partagee par tous les ecrans). */
        charger: function (axe, rappel) {
            var S = this;
            if (S.donnees[axe]) {
                rappel(S.donnees[axe]);
                return;
            }
            if (S.attentes[axe]) {
                S.attentes[axe].push(rappel);
                return;
            }
            S.attentes[axe] = [rappel];
            Ext.Ajax.request({url: S.AXES[axe].url, method: 'GET', params: {limit: 9999},
                callback: function (o, ok, r) {
                    var d = ok ? (Ext.decode(r.responseText, true) || {}).data : null;
                    S.donnees[axe] = Ext.isArray(d) ? Ext.Array.map(d, function (x) {
                        return {id: String(x.id), libelle: x.libelle || ''};
                    }) : [];
                    Ext.each(S.attentes[axe], function (f) {
                        f(S.donnees[axe]);
                    });
                    delete S.attentes[axe];
                }});
        }
    },

    initComponent: function () {
        var me = this;
        me.valeurs = {};
        Ext.each(me.axes, function (a) {
            me.valeurs[a] = [];
        });
        me.items = [];
        me.callParent(arguments);
        me.construire();
        me.on('afterrender', me.preparerEtiquettes, me, {single: true});
        /* la barre d'etiquettes appartient a l'ecran, qui la detruit avec lui */
        me.on('destroy', function () {
            me.fermer(true);
        });
        Ext.each(me.axes, function (a) {
            me.self.charger(a, function () {
                if (!me.isDestroyed) {
                    me.rafraichir();
                }
            });
        });
        Ext.Ajax.request({url: '../api/v1/preferences/' + me.self.CLE_PREF, method: 'GET', success: function (r) {
                var v = (Ext.decode(r.responseText, true) || {}).valeur;
                if (!me.isDestroyed && v && (v.presentation === 'A' || v.presentation === 'B') && v.presentation !== me.presentation) {
                    me.changerPresentation(v.presentation, false);
                }
            }});
    },

    /* ------------------------------------------------------------------ lecture / ecriture */

    getValeurs: function () {
        return Ext.clone(this.valeurs);
    },

    /** Identifiants coches de l'axe, separes par des virgules ; '' = tous. */
    getParam: function (axe) {
        return (this.valeurs[axe] || []).join(',');
    },

    setValeurs: function (v, silencieux) {
        var me = this;
        Ext.each(me.axes, function (a) {
            me.valeurs[a] = Ext.isArray(v && v[a]) ? Ext.Array.map(v[a], String) : [];
        });
        me.rafraichir();
        if (!silencieux) {
            me.fireEvent('change', me, me.getValeurs());
        }
    },

    nombre: function () {
        var me = this, n = 0;
        Ext.each(me.axes, function (a) {
            n += me.valeurs[a].length;
        });
        return n;
    },

    libelleDe: function (axe, id) {
        var l = this.self.donnees[axe] || [], i;
        for (i = 0; i < l.length; i++) {
            if (l[i].id === id) {
                return l[i].libelle;
            }
        }
        return id;
    },

    /* ------------------------------------------------------------------ boutons de la barre */

    construire: function () {
        var me = this;
        me.fermer(true);
        me.removeAll();
        if (me.presentation === 'B') {
            me.add({xtype: 'button', itemId: 'fmOuvrir', cls: 'fm-bouton', text: 'Filtres', handler: function (b) {
                    me.basculerPanneau(b, me.axes[0], true);
                }});
        } else {
            Ext.each(me.axes, function (a) {
                me.add({xtype: 'button', itemId: 'fmAxe-' + a, cls: 'fm-bouton', margin: '0 4 0 0', handler: function (b) {
                        me.basculerPanneau(b, a, false);
                    }});
            });
        }
        me.add({xtype: 'button', itemId: 'fmPresentation', cls: 'fm-presentation', text: '⇄', margin: '0 0 0 4',
            tooltip: me.presentation === 'B' ? 'Afficher une liste par axe (Rayon, Famille, Grossiste)'
                    : 'Afficher un seul bouton « Filtres »',
            handler: function () {
                me.changerPresentation(me.presentation === 'B' ? 'A' : 'B', true);
            }});
        me.rafraichir();
    },

    changerPresentation: function (p, sauver) {
        var me = this;
        me.presentation = p;
        Ext.suspendLayouts();
        me.construire();
        Ext.resumeLayouts(true);
        if (sauver) {
            Ext.Ajax.request({url: '../api/v1/preferences/' + me.self.CLE_PREF, method: 'PUT',
                headers: {'Content-Type': 'application/json'}, jsonData: {presentation: p}});
        }
    },

    resumeAxe: function (a) {
        var me = this, v = me.valeurs[a], lib = me.self.AXES[a].libelle;
        if (!v.length) {
            return lib + ' : tous';
        }
        var noms = Ext.Array.map(v.slice(0, 2), function (id) {
            return me.libelleDe(a, id);
        });
        return lib + ' : ' + noms.join(', ') + (v.length > 2 ? ' +' + (v.length - 2) : '');
    },

    rafraichir: function () {
        var me = this, n = me.nombre();
        if (me.presentation === 'B') {
            var b = me.down('#fmOuvrir');
            if (b) {
                b.setText('Filtres' + (n ? ' <span class="fm-compte">' + n + '</span>' : '') + ' ▾');
            }
        } else {
            Ext.each(me.axes, function (a) {
                var b = me.down('#fmAxe-' + a);
                if (b) {
                    b.setText(Ext.String.htmlEncode(me.resumeAxe(a)) + ' ▾');
                }
            });
        }
        me.dessinerEtiquettes();
        if (me.panneau && !me.panneau.isDestroyed) {
            me.dessinerPanneau();
        }
    },

    /* ------------------------------------------------------------------ etiquettes sous la barre (presentation B) */

    preparerEtiquettes: function () {
        var me = this, barre = me.up('toolbar'), panneau = barre ? barre.ownerCt : null;
        if (!panneau || !panneau.addDocked) {
            return;
        }
        var docks = panneau.getDockedItems(), pos = Ext.Array.indexOf(docks, barre);
        me.barreEtiquettes = panneau.addDocked({xtype: 'component', dock: barre.dock || 'top', cls: 'fm-etiquettes',
            hidden: true, html: ''}, pos + 1)[0];
        me.barreEtiquettes.on('afterrender', function (c) {
            c.getEl().on('click', function (e, t) {
                var x = Ext.fly(t).up('[data-axe]', 3) || Ext.fly(t);
                var axe = x.getAttribute('data-axe'), id = x.getAttribute('data-id');
                if (axe === '*') {
                    me.setValeurs({});
                } else if (axe) {
                    Ext.Array.remove(me.valeurs[axe], id);
                    me.rafraichir();
                    me.fireEvent('change', me, me.getValeurs());
                }
            }, null, {delegate: '.fm-retirer'});
        }, null, {single: true});
        me.dessinerEtiquettes();
    },

    dessinerEtiquettes: function () {
        var me = this, c = me.barreEtiquettes;
        if (!c || c.isDestroyed) {
            return;
        }
        var html = [], n = me.nombre();
        if (me.presentation === 'B' && n) {
            Ext.each(me.axes, function (a) {
                Ext.each(me.valeurs[a], function (id) {
                    html.push('<span class="fm-etiquette"><b>' + me.self.AXES[a].libelle + '</b> '
                            + Ext.String.htmlEncode(me.libelleDe(a, id))
                            + ' <a class="fm-retirer" href="#" role="button" data-axe="' + a + '" data-id="'
                            + Ext.String.htmlEncode(id) + '" title="Retirer">×</a></span>');
                });
            });
            html.push('<a class="fm-retirer fm-tout" href="#" role="button" data-axe="*">Tout retirer</a>');
        }
        c.update(html.join(''));
        c.setVisible(html.length > 0);
    },

    /* ------------------------------------------------------------------ panneau flottant */

    basculerPanneau: function (bouton, axe, complet) {
        var me = this;
        if (me.panneau && !me.panneau.isDestroyed) {
            var memeBouton = me.boutonOuvert === bouton;
            me.fermer();
            if (memeBouton) {
                return;
            }
        }
        me.boutonOuvert = bouton;
        me.axeCourant = axe;
        me.complet = complet;
        me.recherche = '';
        me.avant = Ext.encode(me.valeurs);
        me.panneau = Ext.create('Ext.Component', {floating: true, shadow: false, cls: 'fm-panneau' + (complet ? ' fm-panneau--complet' : ''),
            renderTo: Ext.getBody(), html: ''});
        me.dessinerPanneau();
        me.panneau.show();
        me.panneau.alignTo(bouton, 'tl-bl?', [0, 4]);
        var el = me.panneau.getEl();
        el.on('click', me.surClicPanneau, me);
        el.on('change', me.surCase, me, {delegate: 'input[type=checkbox]'});
        el.on('input', function (e, t) {
            me.recherche = t.value;
            me.dessinerListe();
        }, null, {delegate: 'input.fm-cherche'});
        me.mon(Ext.getDoc(), 'mousedown', me.surClicDehors, me);
        var champ = el.down('input.fm-cherche');
        if (champ) {
            champ.focus(10);
        }
    },

    surClicDehors: function (e) {
        var me = this;
        if (!me.panneau || me.panneau.isDestroyed) {
            return;
        }
        if (!e.within(me.panneau.getEl()) && !(me.boutonOuvert && e.within(me.boutonOuvert.getEl()))) {
            me.fermer();
        }
    },

    /** Ferme le panneau ; signale le changement s'il y en a eu (sauf fermeture silencieuse). */
    fermer: function (silencieux) {
        var me = this;
        me.mun(Ext.getDoc(), 'mousedown', me.surClicDehors, me);
        if (me.panneau && !me.panneau.isDestroyed) {
            me.panneau.destroy();
        }
        me.panneau = null;
        me.boutonOuvert = null;
        if (!silencieux && me.avant !== undefined && me.avant !== Ext.encode(me.valeurs)) {
            me.fireEvent('change', me, me.getValeurs());
        }
        me.avant = undefined;
    },

    dessinerPanneau: function () {
        var me = this, S = me.self, a = me.axeCourant, h = [];
        if (me.complet) {
            h.push('<div class="fm-axes">');
            Ext.each(me.axes, function (x) {
                var n = me.valeurs[x].length;
                h.push('<button type="button" class="fm-axe' + (x === a ? ' fm-axe--actif' : '') + '" data-ouvrir="' + x + '">'
                        + S.AXES[x].libelle + (n ? ' (' + n + ')' : '') + '</button>');
            });
            h.push('</div>');
        }
        h.push('<div class="fm-corps"><div class="fm-colonne">');
        h.push('<input class="fm-cherche" type="text" placeholder="Chercher un ' + S.AXES[a].libelle.toLowerCase()
                + '…" value="' + Ext.String.htmlEncode(me.recherche || '') + '">');
        h.push('<div class="fm-actions"><a href="#" data-action="tout">Tout cocher</a> · <a href="#" data-action="rien">Tout décocher</a>'
                + ' <span class="fm-nb"></span></div>');
        h.push('<div class="fm-liste"></div></div>');
        if (me.complet) {
            h.push('<div class="fm-selection"><div class="fm-titre">Votre sélection</div><div class="fm-recap"></div>'
                    + '<button type="button" class="fm-appliquer" data-action="appliquer">Appliquer</button></div>');
        }
        h.push('</div>');
        me.panneau.update(h.join(''));
        me.dessinerListe();
    },

    /** Lignes de l'axe courant qui correspondent a la recherche. */
    lignesAffichees: function () {
        var me = this, t = (me.recherche || '').trim().toUpperCase();
        return Ext.Array.filter(me.self.donnees[me.axeCourant] || [], function (x) {
            return !t || x.libelle.toUpperCase().indexOf(t) >= 0;
        });
    },

    dessinerListe: function () {
        var me = this, a = me.axeCourant, el = me.panneau && me.panneau.getEl();
        if (!el) {
            return;
        }
        var lignes = me.lignesAffichees(), h = [];
        if (!me.self.donnees[a]) {
            h.push('<div class="fm-vide">Chargement…</div>');
        } else if (!lignes.length) {
            h.push('<div class="fm-vide">Aucun ' + me.self.AXES[a].libelle.toLowerCase() + ' ne contient ce texte.</div>');
        }
        Ext.each(lignes, function (x) {
            var coche = Ext.Array.contains(me.valeurs[a], x.id);
            h.push('<label class="fm-case' + (coche ? ' fm-case--coche' : '') + '"><input type="checkbox" data-id="'
                    + Ext.String.htmlEncode(x.id) + '"' + (coche ? ' checked' : '') + '> <span>'
                    + Ext.String.htmlEncode(x.libelle) + '</span></label>');
        });
        el.down('.fm-liste').update(h.join(''));
        el.down('.fm-nb').update(lignes.length + ' affiché' + (lignes.length > 1 ? 's' : ''));
        var recap = el.down('.fm-recap');
        if (recap) {
            var r = [];
            Ext.each(me.axes, function (x) {
                if (me.valeurs[x].length) {
                    r.push('<div class="fm-groupe"><b>' + me.self.AXES[x].libelle + ' (' + me.valeurs[x].length + ')</b><br>'
                            + Ext.Array.map(me.valeurs[x], function (id) {
                                return Ext.String.htmlEncode(me.libelleDe(x, id));
                            }).join(', ') + '</div>');
                }
            });
            recap.update(r.length ? r.join('') : '<div class="fm-vide">Rien de coché : tous les produits.</div>');
        }
        if (me.complet) {
            Ext.each(el.query('.fm-axe'), function (b) {
                var x = b.getAttribute('data-ouvrir'), n = me.valeurs[x].length;
                b.innerHTML = me.self.AXES[x].libelle + (n ? ' (' + n + ')' : '');
            });
        }
    },

    surCase: function (e, t) {
        var me = this, id = t.getAttribute('data-id'), l = me.valeurs[me.axeCourant];
        if (t.checked) {
            Ext.Array.include(l, id);
        } else {
            Ext.Array.remove(l, id);
        }
        Ext.fly(t).up('label').toggleCls('fm-case--coche', t.checked);
        me.rafraichirSansPanneau();
        me.dessinerListe();
    },

    /** Met a jour boutons et etiquettes sans redessiner le panneau ouvert (la saisie de recherche garde le focus). */
    rafraichirSansPanneau: function () {
        var p = this.panneau;
        this.panneau = null;
        this.rafraichir();
        this.panneau = p;
    },

    surClicPanneau: function (e) {
        var me = this, t = e.getTarget('[data-ouvrir]') || e.getTarget('[data-action]');
        if (!t) {
            return;
        }
        e.preventDefault();
        var ouvrir = t.getAttribute('data-ouvrir'), action = t.getAttribute('data-action');
        if (ouvrir) {
            me.axeCourant = ouvrir;
            me.recherche = '';
            me.dessinerPanneau();
            var champ = me.panneau.getEl().down('input.fm-cherche');
            if (champ) {
                champ.focus();
            }
        } else if (action === 'tout' || action === 'rien') {
            var l = me.valeurs[me.axeCourant];
            Ext.each(me.lignesAffichees(), function (x) {
                if (action === 'tout') {
                    Ext.Array.include(l, x.id);
                } else {
                    Ext.Array.remove(l, x.id);
                }
            });
            me.rafraichirSansPanneau();
            me.dessinerListe();
        } else if (action === 'appliquer') {
            me.fermer();
        }
    }
});
