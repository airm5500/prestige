/* global Ext */

/*
 * VENTES EN ATTENTE (preventes), maquette validee le 30/09.
 *
 * Fenetre au dessin du theme commun (classes vc-* et va-*) : a gauche la liste des preventes en cartes (ticket, montant,
 * type, client, heure, caissier), a droite le detail avec des tuiles et les articles. La PREMIERE prevente est ouverte
 * d'office (plus de panneau vide) ; fleches haut / bas pour passer de l'une a l'autre, Entree pour la rappeler, Echap
 * pour fermer.
 *
 * Elle lit les memes services que l'ancienne fenetre (v1/ventestats/preventes et find-one) et ne rappelle rien
 * elle-meme : le controleur de la caisse lui passe {@code surRappel(id)}, qui charge la prevente comme avant. Son titre
 * (non affiche) reste celui de l'ancienne, pour que le code qui la cherche la retrouve.
 */
Ext.define('testextjs.view.vente.VentesAttenteFenetre', {
    extend: 'Ext.window.Window',
    xtype: 'ventesattentefenetre',
    title: 'RÉSULTATS DE RECHERCHE DES PRÉVENTES',
    cls: 'vc-fenetre',
    header: false,
    modal: true,
    resizable: false,
    draggable: false,
    closeAction: 'destroy',
    width: 1180,
    height: 640,
    layout: 'fit',
    bodyPadding: 0,
    /** Appelee avec l'identifiant de la prevente a rappeler. */
    surRappel: null,
    /** Filtre initial (recherche de la caisse qui a trouve plusieurs preventes). */
    filtreInitial: '',

    initComponent: function () {
        var me = this;
        me.preventes = [];
        me.courant = -1;
        me.html = '<div class="vc va"><div class="vc-tete"><div><div class="vc-sur">Ventes en attente</div>'
                + '<div class="vc-nom" data-va="titre">Chargement…</div></div>'
                + '<button type="button" class="vc-croix" data-action="fermer" aria-label="Fermer">&times;</button></div>'
                + '<div class="va-corps"><div class="va-gauche"><div class="va-recherche">'
                + '<input type="search" class="va-champ" data-va="recherche" placeholder="Ticket, client, montant, caissier… (Entrée)"'
                + ' autocomplete="off"></div><div class="va-liste" data-va="liste"></div></div>'
                + '<div class="va-droite" data-va="detail"></div></div></div>';
        me.callParent(arguments);
        me.on('afterrender', function () {
            var el = me.getEl();
            el.on('click', me.surClic, me, {delegate: '[data-action]'});
            me.champ = el.down('[data-va=recherche]');
            me.champ.dom.value = me.filtreInitial || '';
            me.champ.on('keydown', me.surToucheRecherche, me);
            me.champ.on('input', function () {
                me.afficherListe();
            });
            me.cle = new Ext.util.KeyMap({target: Ext.getDoc(), binding: [
                    {key: Ext.EventObject.ESC, fn: me.close, scope: me},
                    {key: Ext.EventObject.UP, fn: function (k, e) {
                            e.stopEvent();
                            me.deplacer(-1);
                        }},
                    {key: Ext.EventObject.DOWN, fn: function (k, e) {
                            e.stopEvent();
                            me.deplacer(1);
                        }},
                    {key: Ext.EventObject.ENTER, fn: function (k, e) {
                            /* Entree dans la recherche : recherche au serveur ; ailleurs : rappel. */
                            if (e.getTarget() === me.champ.dom && me.champ.dom.value !== me.dernierFiltreServeur) {
                                return;
                            }
                            e.stopEvent();
                            me.rappeler();
                        }}
                ]});
            me.charger(me.filtreInitial || '');
            /* Deux fois : l'ecran de vente, derriere, reprend le focus juste apres l'ouverture. */
            Ext.each([150, 700], function (delai) {
                Ext.defer(function () {
                    if (!me.isDestroyed && document.activeElement !== me.champ.dom) {
                        me.champ.dom.focus();
                    }
                }, delai);
            });
        });
        me.on('destroy', function () {
            if (me.cle) {
                me.cle.destroy();
            }
        });
    },

    /**
     * ExtJS rend le focus a la fenetre a chaque affichage et a chaque activation : il va a la recherche, pour que la
     * frappe ne parte jamais dans l'ecran de vente, derriere.
     */
    focus: function () {
        var me = this;
        if (me.champ && me.champ.dom) {
            Ext.defer(function () {
                if (!me.isDestroyed && document.activeElement !== me.champ.dom) {
                    me.champ.dom.focus();
                }
            }, 10);
            return me;
        }
        return me.callParent(arguments);
    },

    zone: function (nom) {
        return this.getEl().down('[data-va=' + nom + ']');
    },

    surToucheRecherche: function (e) {
        if (e.getKey() === e.ENTER && this.champ.dom.value !== this.dernierFiltreServeur) {
            e.stopEvent();
            this.charger(this.champ.dom.value);
        }
    },

    /** Recherche des filtres a la caisse, comme l'ancienne fenetre (sans doublon). */
    filtrer: function (texte) {
        if (this.champ) {
            this.champ.dom.value = texte || '';
        }
        this.charger(texte || '');
    },

    charger: function (query) {
        var me = this;
        me.dernierFiltreServeur = query || '';
        me.zone('liste').update('<div class="va-vide"><div class="rond-chargement"></div></div>');
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ventestats/preventes',
            params: {statut: 'is_Process', query: query || '', page: 1, start: 0, limit: 100},
            success: function (reponse) {
                if (me.isDestroyed) {
                    return;
                }
                var r = Ext.decode(reponse.responseText, true) || {};
                var vus = {};
                me.preventes = Ext.Array.filter(r.data || [], function (p) {
                    var id = p.lgPREENREGISTREMENTID;
                    if (!id || vus[id]) {
                        return false;
                    }
                    vus[id] = true;
                    return true;
                });
                /* Du plus recent au plus ancien : date (JJ/MM/AAAA ou AAAA-MM-JJ) puis heure. */
                var cle = function (p) {
                    var d = String(p.dtUPDATED || '');
                    var m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(d);
                    return (m ? m[3] + '-' + m[2] + '-' + m[1] : d.substring(0, 10)) + ' ' + (p.heure || d.substring(11));
                };
                me.preventes.sort(function (a, b) {
                    return cle(b).localeCompare(cle(a));
                });
                me.courant = -1;
                me.afficherListe();
                /* L'ecran de vente reprend parfois le focus a l'ouverture : on le rend a la recherche. */
                if (me.champ && document.activeElement !== me.champ.dom) {
                    me.champ.dom.focus();
                }
            },
            failure: function () {
                if (!me.isDestroyed) {
                    me.zone('liste').update('<div class="va-vide">La liste n\'a pas pu être lue.</div>');
                }
            }
        });
    },

    /** Les preventes visibles : filtre immediat sur le texte tape (ticket, client, montant, caissier, type). */
    visibles: function () {
        var t = Ext.String.trim(this.champ ? this.champ.dom.value : '').toLowerCase();
        if (!t) {
            return this.preventes;
        }
        return Ext.Array.filter(this.preventes, function (p) {
            return [p.strREF, p.clientFullName, p.userFullName, p.strTYPEVENTENAME, String(p.intPRICE)].join(' ')
                    .toLowerCase().indexOf(t) >= 0;
        });
    },

    afficherListe: function () {
        var me = this;
        var enc = Ext.String.htmlEncode;
        var liste = me.visibles();
        var n = me.preventes.length;
        me.zone('titre').update(n === 0 ? 'Aucune prévente à reprendre' : n + ' prévente' + (n > 1 ? 's' : '')
                + ' à reprendre');
        if (!liste.length) {
            me.zone('liste').update('<div class="va-vide">' + (n ? 'Aucune prévente ne correspond.'
                    : 'Aucune vente en attente.') + '</div>');
            me.courant = -1;
            me.afficherDetail(null);
            return;
        }
        me.zone('liste').update(Ext.Array.map(liste, function (p, i) {
            return '<button type="button" class="va-carte" data-action="choisir" data-index="' + i + '">'
                    + '<span class="va-l1"><b class="va-ticket">' + enc(p.strREF || '') + '</b><b class="va-montant">'
                    + me.montant(p.intPRICE) + '</b></span><span class="va-l2"><span>' + me.pastille(p)
                    + (p.clientFullName ? ' ' + enc(p.clientFullName) : '') + '</span><span>' + enc(me.heure(p))
                    + (p.userFullName ? ' · ' + enc(p.userFullName) : '') + '</span></span></button>';
        }).join(''));
        me.selectionner(Math.max(0, Math.min(me.courant, liste.length - 1)));
    },

    montant: function (v) {
        return Ext.util.Format.number(v || 0, '0,000').replace(/,/g, ' ') + ' F';
    },

    heure: function (p) {
        if (p.heure) {
            return String(p.heure).substring(0, 5);
        }
        var d = String(p.dtUPDATED || '');
        return d.length > 10 ? d.substring(11, 16) : '';
    },

    /** Type de vente en pastille : comptant (vert), assurance (bleu), carnet (ambre), depot (gris). */
    pastille: function (p) {
        var id = String(p.lgTYPEVENTEID || '');
        var libelles = {'1': 'Au comptant', '2': 'Assurance', '3': 'Carnet', '4': 'Dépôt agréé', '5': 'Dépôt extension'};
        var cls = {'1': 'va-p-ok', '2': 'va-p-info', '3': 'va-p-att'}[id] || 'va-p-gris';
        return '<span class="va-pill ' + cls + '">' + Ext.String.htmlEncode(libelles[id] || p.strTYPEVENTENAME || id)
                + '</span>';
    },

    deplacer: function (pas) {
        var n = this.visibles().length;
        if (n) {
            this.selectionner(Math.max(0, Math.min(this.courant + pas, n - 1)));
        }
    },

    selectionner: function (i) {
        var me = this;
        var liste = me.visibles();
        var p = liste[i];
        me.courant = i;
        Ext.each(me.zone('liste').query('.va-carte'), function (c, k) {
            Ext.fly(c)[k === i ? 'addCls' : 'removeCls']('va-carte-active');
            if (k === i && c.scrollIntoView) {
                c.scrollIntoView({block: 'nearest'});
            }
        });
        me.afficherDetail(p || null);
    },

    surClic: function (e, cible) {
        var action = cible.getAttribute('data-action');
        e.preventDefault();
        if (action === 'fermer') {
            this.close();
        } else if (action === 'choisir') {
            this.selectionner(parseInt(cible.getAttribute('data-index'), 10));
        } else if (action === 'rappeler') {
            this.rappeler();
        }
    },

    /** Le detail : d'abord la ligne de la liste (aussitot), puis la prevente complete (articles, client, assurance). */
    afficherDetail: function (p) {
        var me = this;
        var zone = me.zone('detail');
        me.selection = p;
        if (!p) {
            zone.update('<div class="va-vide">Choisissez une prévente dans la liste.</div>');
            return;
        }
        me.dessinerDetail(p, null);
        var id = p.lgPREENREGISTREMENTID;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ventestats/find-one/' + encodeURIComponent(id),
            success: function (reponse) {
                var r = Ext.decode(reponse.responseText, true) || {};
                if (!me.isDestroyed && me.selection && me.selection.lgPREENREGISTREMENTID === id && r.data) {
                    me.dessinerDetail(p, r.data);
                }
            }
        });
    },

    dessinerDetail: function (p, d) {
        var me = this;
        var enc = Ext.String.htmlEncode;
        var articles = d && d.items ? d.items : null;
        var tuile = function (valeur, libelle) {
            return '<div class="vc-tuile"><div class="vc-tuile-valeur">' + valeur + '</div><div class="vc-tuile-libelle">'
                    + libelle + '</div></div>';
        };
        var client = '';
        if (d && d.client && (d.client.fullName || d.client.strFIRSTNAME)) {
            var a = d.assurances && d.assurances.length ? d.assurances[0] : null;
            var nomTp = a && a.tiersPayant ? (a.tiersPayant.strFULLNAME || a.tiersPayant.strNAME || '') : '';
            var taux = a ? (a.intPERCENT || a.taux || 0) : 0;
            client = '<div class="va-client"><b>' + enc(d.client.fullName || ((d.client.strFIRSTNAME || '') + ' '
                    + (d.client.strLASTNAME || ''))) + '</b>'
                    + (d.client.strNUMEROSECURITESOCIAL ? ' <span class="va-mono">' + enc(d.client.strNUMEROSECURITESOCIAL)
                            + '</span>' : '')
                    + (nomTp ? ' · ' + enc(nomTp) + (taux ? ' ' + taux + ' %' : '') : '')
                    + (d.intCUSTPART ? ' · part client ' + me.montant(d.intCUSTPART) : '') + '</div>';
        } else if (p.clientFullName) {
            client = '<div class="va-client"><b>' + enc(p.clientFullName) + '</b></div>';
        }
        var lignes = articles === null ? '<div class="va-vide"><div class="rond-chargement"></div></div>'
                : (articles.length ? '<div class="vc-tableau"><table><thead><tr><th>CIP</th><th>Désignation</th>'
                        + '<th class="vc-n">P.U.</th><th class="vc-n">Qté</th><th class="vc-n">Total</th></tr></thead><tbody>'
                        + Ext.Array.map(articles, function (it) {
                            var pr = it.produit || {};
                            return '<tr><td class="va-mono">' + enc(String(pr.intCIP || '').trim()) + '</td><td>'
                                    + enc(pr.strDESCRIPTION || pr.strNAME || '') + '</td><td class="vc-n">'
                                    + Ext.util.Format.number(it.intPRICEUNITAIR || 0, '0,000') + '</td><td class="vc-n">'
                                    + (it.intQUANTITY || 0) + '</td><td class="vc-n"><b>'
                                    + Ext.util.Format.number(it.intPRICE || 0, '0,000') + '</b></td></tr>';
                        }).join('') + '</tbody></table></div>' : '<div class="va-vide">Aucun article.</div>');
        me.zone('detail').update('<div class="vc-tuiles">' + tuile(me.montant(p.intPRICE), 'montant')
                + tuile(articles === null ? '…' : articles.length, 'article' + (articles && articles.length > 1 ? 's' : ''))
                + tuile(me.pastille(p), 'type') + tuile(enc(me.heure(p)), enc(p.userFullName || '')) + '</div>'
                + client + '<div class="va-articles">' + lignes + '</div>'
                + '<div class="va-pied"><span class="va-aide">↑ ↓ pour changer de prévente · Entrée pour la rappeler'
                + ' · Échap pour fermer</span><span><button type="button" class="vc-bouton vc-bouton-second"'
                + ' data-action="fermer">Fermer</button> <button type="button" class="vc-bouton va-rappeler"'
                + ' data-action="rappeler">Rappeler cette prévente · Entrée</button></span></div>');
    },

    rappeler: function () {
        var p = this.selection;
        if (!p || !p.lgPREENREGISTREMENTID) {
            return;
        }
        var rappel = this.surRappel;
        this.close();
        if (Ext.isFunction(rappel)) {
            rappel(p.lgPREENREGISTREMENTID);
        }
    }
});
