/* global Ext, PrestigeToast */

/*
 * PARAMETRAGES > « Modèles de ticket » (demande du 02/11). À gauche les tickets de caisse ; au centre le modèle
 * (ancien ou nouveau) et les options du ticket choisi ; à droite l'aperçu, dessiné par le serveur avec le même code
 * que l'impression. Dans l'aperçu, un bloc se déplace à la souris (ou aux flèches du clavier) et s'aligne ou change
 * de taille ; le serveur contrôle chaque disposition (rien ne dépasse du papier, l'en-tête et le code-barres restent
 * en place) et « Enregistrer » ne s'active que sans problème bloquant. Largeur du papier : 80 ou 58 mm, réglée par
 * imprimante. Aucune fenêtre : les confirmations se font dans le bouton. Modification réservée au droit
 * P_SM_MODELES_TICKET ; sinon lecture seule. Routes : ../api/v1/modeles-ticket.
 */
Ext.define('testextjs.view.configmanagement.modeleticket.ModelesTicket', {
    extend: 'Ext.panel.Panel',
    xtype: 'modelesticket',
    layout: 'fit',
    border: false,
    header: false,
    config: {
        nameintern: '',
        titre: '',
        odatasource: ''
    },

    URL: '../api/v1/modeles-ticket',

    OPTIONS: [
        {cle: 'remise', libelle: 'Afficher la remise', aide: 'Si non : ni la remise ni le total avant remise, la remise reste appliquée', pour: ['PREVENTE', 'VENTE', 'VENTE_ASSURANCE', 'VENTE_CARNET', 'VENTE_DEPOT']},
        {cle: 'lot', libelle: 'Afficher le lot vendu', aide: 'Lots lus par GS1 ; place réservée entre « quantité × prix » et le montant', pour: ['VENTE', 'VENTE_ASSURANCE', 'VENTE_CARNET', 'VENTE_DEPOT']},
        {cle: 'recapitulatif', libelle: 'Afficher « articles · boîtes »', aide: 'Pour contrôler le sac au comptoir', pour: ['PREVENTE', 'VENTE', 'VENTE_ASSURANCE', 'VENTE_CARNET', 'VENTE_DEPOT']},
        {cle: 'ccRc', libelle: 'Afficher CC et RC', aide: 'Fiche officine', pour: ['VENTE', 'VENTE_ASSURANCE', 'VENTE_CARNET', 'VENTE_DEPOT', 'REGLEMENT_DIFFERE', 'REGLEMENT_FACTURE', 'REGLEMENT_CARNET_DEPOT', 'MOUVEMENT_CAISSE']},
        {cle: 'commentaires', libelle: 'Commentaires de l\'officine', aide: 'En-tête et commentaires du bas de l\'identification officine', pour: ['VENTE', 'VENTE_ASSURANCE', 'VENTE_CARNET', 'VENTE_DEPOT', 'REGLEMENT_DIFFERE', 'REGLEMENT_FACTURE', 'REGLEMENT_CARNET_DEPOT', 'MOUVEMENT_CAISSE']},
        {cle: 'encoursCarnet', libelle: 'Encours du carnet après la vente', aide: '', pour: ['VENTE_CARNET']},
        {cle: 'signatureClient', libelle: 'Signature du client', aide: 'Preuve quand l\'entreprise conteste un bon', pour: ['VENTE_CARNET']},
        {cle: 'signatures', libelle: 'Signatures caissier et bénéficiaire', aide: 'Pièce justificative', pour: ['MOUVEMENT_CAISSE']},
        {cle: 'signatures', libelle: 'Signatures caissier et responsable', aide: 'Contrôle de la caisse', pour: ['TICKET_Z']}
    ],

    initComponent: function () {
        var me = this;
        me.etat = {largeur: 80, donnees: null, ticket: 'VENTE', brouillons: {}, selection: null, apercu: null, demande: 0};
        me.items = [{xtype: 'component', itemId: 'mtkCorps', autoScroll: true, html: '<div class="mtk"><div class="mtk-attente">Chargement…</div></div>'}];
        me.callParent(arguments);
        me.styles();
        me.on('afterrender', function () {
            me.racine = me.down('#mtkCorps').getEl().dom.querySelector('.mtk');
            me.ecouter();
            me.charger();
        }, me, {single: true});
        me.on('destroy', function () {
            if (me.minuteur) {
                clearTimeout(me.minuteur);
            }
        });
    },

    styles: function () {
        if (Ext.get('modeles-ticket-styles')) {
            return;
        }
        Ext.util.CSS.createStyleSheet(
                '.mtk{font-family:Segoe UI,Arial,sans-serif;font-size:13px;color:#1b2a3a;background:#f3f5f8;min-height:100%;display:flex;flex-direction:column}'
                + '.mtk-attente{padding:30px;color:#64748b}'
                + '.mtk-barre{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:10px 14px;background:#fff;border-bottom:1px solid #e2e8f0}'
                + '.mtk-titre{font-size:16px;font-weight:600;margin-right:10px}'
                + '.mtk-lib{color:#64748b;font-size:12px}'
                + '.mtk-imp{display:inline-flex;align-items:center;gap:4px;font-size:12px;padding:2px 2px 2px 8px;border:1px solid #e2e8f0;border-radius:14px}'
                + '.mtk-lecture{margin-left:auto;color:#9a3412;background:#fff7ed;border:1px solid #fed7aa;border-radius:6px;padding:3px 8px;font-size:12px}'
                + '.mtk-corps{display:grid;grid-template-columns:220px minmax(280px,360px) 1fr;gap:12px;padding:12px 14px;flex:1;align-items:start}'
                + '.mtk-liste,.mtk-reglages,.mtk-apercu{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:8px}'
                + '.mtk-groupe{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#64748b;margin:8px 6px 4px}'
                + '.mtk-ticket{display:block;width:100%;text-align:left;border:0;background:none;border-radius:7px;padding:6px 8px;cursor:pointer;font:inherit;color:inherit}'
                + '.mtk-ticket small{display:block;color:#64748b;font-size:11px}'
                + '.mtk-ticket:hover{background:#f1f5f9}.mtk-ticket.mtk-actif{background:#e0ecff;color:#1d4ed8}'
                + '.mtk-brouillon{color:#ea580c}'
                + '.mtk-champ{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:7px 4px;border-bottom:1px solid #f1f5f9}'
                + '.mtk-champ>span:first-child{flex:1}.mtk-champ small{display:block;color:#64748b;font-size:11px}'
                + '.mtk-choix{display:inline-flex;border:1px solid #cbd5e1;border-radius:7px;overflow:hidden;align-items:center}'
                + '.mtk-choix button{border:0;background:#fff;padding:4px 10px;cursor:pointer;font:inherit;font-size:12px}'
                + '.mtk-choix button+button{border-left:1px solid #cbd5e1}'
                + '.mtk-choix button.mtk-sel{background:#2563eb;color:#fff}.mtk-choix span.mtk-sel{padding:0 8px;font-size:12px;min-width:44px;text-align:center}'
                + '.mtk-choix button:disabled{cursor:default;opacity:.55}'
                + '.mtk-bascule{width:38px;height:22px;border-radius:11px;border:0;background:#cbd5e1;position:relative;cursor:pointer;flex:none;transition:background .15s}'
                + '.mtk-bascule:after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .15s}'
                + '.mtk-bascule.mtk-on{background:#16a34a}.mtk-bascule.mtk-on:after{left:19px}.mtk-bascule:disabled{opacity:.5;cursor:default}'
                + '.mtk-selection{margin-top:10px;padding:8px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0}'
                + '.mtk-discret{color:#64748b;font-size:12px}'
                + '.mtk-controle{margin-top:10px;font-size:12px;line-height:1.5}'
                + '.mtk-ok{color:#15803d}.mtk-ko{color:#b91c1c}.mtk-avert{color:#b45309}'
                + '.mtk-aide{color:#64748b;font-size:12px;margin-bottom:8px}'
                + '.mtk-papier{display:flex;justify-content:center;background:#e2e8f0;border-radius:8px;padding:14px;outline:none;overflow:auto;max-height:calc(100vh - 230px)}'
                + '.mtk-papier:focus{box-shadow:0 0 0 2px #93c5fd}'
                + '.mtk-feuille{position:relative;flex:none;box-shadow:0 2px 10px rgba(15,23,42,.18);background:#fff}'
                + '.mtk-feuille img{display:block;user-select:none;-webkit-user-drag:none}'
                + '.mtk-zone{position:absolute;left:0;right:0;border:1px dashed transparent;border-radius:3px}'
                + '.mtk-zone:not(.mtk-fixe):hover{border-color:#93c5fd;background:rgba(37,99,235,.05)}'
                + '.mtk-zone.mtk-mobile{cursor:grab;touch-action:none}'
                + '.mtk-zone.mtk-choisie{border:2px solid #2563eb;background:rgba(37,99,235,.07)}'
                + '.mtk-zone.mtk-glisse{cursor:grabbing;background:rgba(37,99,235,.15);border-color:#2563eb;z-index:2;opacity:.9}'
                + '.mtk-depot{display:none;position:absolute;left:-6px;right:-6px;height:4px;background:#2563eb;border-radius:2px;pointer-events:none}'
                + '.mtk-boutons{display:flex;flex-wrap:wrap;gap:8px;padding:0 14px 14px}.mtk-espace{flex:1}'
                + '.mtk-btn{border:1px solid #cbd5e1;background:#fff;border-radius:7px;padding:7px 14px;cursor:pointer;font:inherit}'
                + '.mtk-btn:hover:not(:disabled){background:#f1f5f9}.mtk-btn:disabled{opacity:.5;cursor:default}'
                + '.mtk-btn.mtk-prim{background:#2563eb;border-color:#2563eb;color:#fff}.mtk-btn.mtk-prim:hover:not(:disabled){background:#1d4ed8}'
                + '.mtk-btn.mtk-attention{color:#b91c1c;border-color:#fecaca}'
                + '.mtk-btn.mtk-confirme{background:#b91c1c;border-color:#b91c1c;color:#fff}'
                + '@media (max-width:1100px){.mtk-corps{grid-template-columns:1fr}}',
                'modeles-ticket-styles');
    },

    /* ---------- donnees ---------- */

    charger: function () {
        var me = this;
        Ext.Ajax.request({
            url: me.URL, method: 'GET', params: {largeur: me.etat.largeur},
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (!o.success) {
                    me.racine.innerHTML = '<div class="mtk-attente">' + Ext.String.htmlEncode(o.msg || 'Lecture impossible.') + '</div>';
                    return;
                }
                me.etat.donnees = o;
                me.rendre();
                me.demanderApercu();
            },
            failure: function () {
                me.racine.innerHTML = '<div class="mtk-attente">Lecture impossible (serveur injoignable).</div>';
            }
        });
    },

    cle: function (ticket) {
        return this.etat.largeur + ':' + (ticket || this.etat.ticket);
    },

    ticketCourant: function () {
        var me = this;
        return Ext.Array.findBy(me.etat.donnees.tickets, function (t) {
            return t.ticket === me.etat.ticket;
        });
    },

    /** Reglages en cours : le brouillon non enregistre s'il existe, sinon ceux du serveur. */
    reglages: function () {
        var b = this.etat.brouillons[this.cle()];
        return b || this.ticketCourant().reglages;
    },

    modifier: function (f) {
        var me = this, r = Ext.clone(me.reglages());
        f(r);
        me.etat.brouillons[me.cle()] = r;
        me.rendre();
        me.demanderApercu();
    },

    droit: function () {
        return !!(this.etat.donnees && this.etat.donnees.droit);
    },

    /* ---------- affichage ---------- */

    rendre: function () {
        var me = this, d = me.etat.donnees, r = me.reglages(), t = me.ticketCourant(), h = [], groupe = null;
        var enc = Ext.String.htmlEncode;
        h.push('<div class="mtk-barre"><span class="mtk-titre">Modèles de ticket</span>');
        h.push('<span class="mtk-lib">Papier de l\'aperçu</span>' + me.choix('largeur', [{v: 80, l: '80 mm'}, {v: 58, l: '58 mm'}], me.etat.largeur, false));
        if (d.imprimantes.length) {
            h.push('<span class="mtk-lib">Imprimantes</span>');
            d.imprimantes.forEach(function (i) {
                h.push('<span class="mtk-imp" title="Largeur du rouleau de cette caisse">' + enc(i.nom) + ' '
                        + me.choix('imprimante:' + i.id, [{v: 80, l: '80'}, {v: 58, l: '58'}], i.largeur, !me.droit()) + '</span>');
            });
        }
        if (!me.droit()) {
            h.push('<span class="mtk-lecture">Lecture seule : modification réservée au droit « Modèles de ticket »</span>');
        }
        h.push('</div><div class="mtk-corps"><div class="mtk-liste" role="listbox" aria-label="Tickets de caisse">');
        d.tickets.forEach(function (x) {
            if (x.groupe !== groupe) {
                groupe = x.groupe;
                h.push('<div class="mtk-groupe">' + enc(groupe) + '</div>');
            }
            var brouillon = !!me.etat.brouillons[me.etat.largeur + ':' + x.ticket];
            h.push('<button type="button" role="option" class="mtk-ticket' + (x.ticket === me.etat.ticket ? ' mtk-actif' : '') + '" data-ticket="' + x.ticket + '" aria-selected="' + (x.ticket === me.etat.ticket) + '">'
                    + enc(x.libelle) + (brouillon ? ' <span class="mtk-brouillon" title="Modifié, non enregistré">●</span>' : '')
                    + '<small>' + ((brouillon ? me.etat.brouillons[me.etat.largeur + ':' + x.ticket] : x.reglages).modele === 'NOUVEAU' ? 'Nouveau modèle' : 'Ancien modèle') + '</small></button>');
        });
        h.push('</div><div class="mtk-reglages">');
        h.push('<div class="mtk-champ"><span>Modèle<small>' + (t.nouveauDisponible ? '« Ancien » rétablit le ticket d\'avant, à l\'identique' : 'Le nouveau modèle de ce ticket n\'est pas encore disponible') + '</small></span>'
                + me.choix('modele', [{v: 'ANCIEN', l: 'Ancien'}, {v: 'NOUVEAU', l: 'Nouveau'}], r.modele, !me.droit() || !t.nouveauDisponible) + '</div>');
        me.OPTIONS.forEach(function (o) {
            if (o.pour.indexOf(me.etat.ticket) < 0) {
                return;
            }
            h.push('<div class="mtk-champ"><span>' + enc(o.libelle) + (o.aide ? '<small>' + enc(o.aide) + '</small>' : '') + '</span>'
                    + '<button type="button" class="mtk-bascule' + (r[o.cle] ? ' mtk-on' : '') + '" data-option="' + o.cle + '" role="switch" aria-checked="' + !!r[o.cle] + '" aria-label="' + enc(o.libelle) + '"' + (me.droit() && r.modele === 'NOUVEAU' ? '' : ' disabled') + '></button></div>');
        });
        h.push(me.rendreSelection(r));
        h.push('<div class="mtk-controle"></div>');
        h.push('</div><div class="mtk-apercu"><div class="mtk-aide">' + (r.modele === 'NOUVEAU'
                ? (me.droit() ? 'Glissez un bloc pour le déplacer ; cliquez-le pour l\'aligner ou changer sa taille (flèches du clavier : ↑ ↓ déplacer, ← → aligner).' : 'Aperçu du ticket.')
                : 'Ancien modèle : le ticket sort comme avant. Aperçu du nouveau modèle, pour comparer.') + '</div>'
                + '<div class="mtk-papier" tabindex="0" aria-label="Aperçu du ticket"><div class="mtk-attente">Aperçu…</div></div></div></div>');
        var modifie = !!me.etat.brouillons[me.cle()];
        h.push('<div class="mtk-boutons">'
                + '<button type="button" class="mtk-btn" data-action="defaut"' + (me.droit() ? '' : ' disabled') + '>Rétablir la disposition par défaut</button>'
                + '<button type="button" class="mtk-btn" data-action="annuler"' + (modifie ? '' : ' disabled') + '>Annuler les modifications</button>'
                + '<button type="button" class="mtk-btn mtk-prim" data-action="enregistrer" disabled>Enregistrer</button>'
                + '<span class="mtk-espace"></span>'
                + '<button type="button" class="mtk-btn mtk-attention" data-action="ancien"' + (me.droit() ? '' : ' disabled') + '>Revenir à l\'ancien modèle pour tous les tickets</button></div>');
        me.racine.innerHTML = h.join('');
        if (me.etat.apercu) {
            me.afficherApercu(me.etat.apercu);
        }
    },

    rendreSelection: function (r) {
        var me = this, s = me.etat.selection, enc = Ext.String.htmlEncode;
        if (!s || r.modele !== 'NOUVEAU') {
            return '<div class="mtk-selection mtk-discret">Cliquez un bloc de l\'aperçu pour l\'aligner ou changer sa taille.</div>';
        }
        var p = me.position(r, s), bloc = Ext.Array.findBy(me.etat.donnees.blocs, function (b) {
            return b.id === s;
        });
        var max = me.etat.donnees.ecartTailleMax;
        return '<div class="mtk-selection"><b>Bloc choisi : ' + enc(bloc ? bloc.libelle : s) + '</b>'
                + '<div class="mtk-champ"><span>Alignement</span>' + me.choix('alignement', [{v: 'G', l: 'Gauche'}, {v: 'C', l: 'Centre'}, {v: 'D', l: 'Droite'}], p.alignement || 'DEFAUT', !me.droit()) + '</div>'
                + '<div class="mtk-champ"><span>Taille du texte<small>De −' + max + ' à +' + max + ' points autour du modèle</small></span><span class="mtk-choix">'
                + '<button type="button" data-taille="-1"' + (me.droit() && p.taille > -max ? '' : ' disabled') + ' aria-label="Réduire">−</button>'
                + '<span class="mtk-sel">' + (p.taille > 0 ? '+' : '') + p.taille + ' pt</span>'
                + '<button type="button" data-taille="1"' + (me.droit() && p.taille < max ? '' : ' disabled') + ' aria-label="Agrandir">+</button></span></div></div>';
    },

    choix: function (nom, valeurs, courante, inactif) {
        return '<span class="mtk-choix" role="radiogroup">' + valeurs.map(function (x) {
            return '<button type="button" role="radio" data-choix="' + nom + '" data-valeur="' + x.v + '" aria-checked="' + (String(x.v) === String(courante)) + '"'
                    + ' class="' + (String(x.v) === String(courante) ? 'mtk-sel' : '') + '"' + (inactif ? ' disabled' : '') + '>' + x.l + '</button>';
        }).join('') + '</span>';
    },

    /* ---------- disposition ---------- */

    position: function (r, bloc) {
        var p = Ext.Array.findBy(r.disposition || [], function (x) {
            return x.bloc === bloc;
        });
        return p || {bloc: bloc, alignement: '', taille: 0};
    },

    /** Disposition complete dans l'ordre donne (blocs deplacables seulement), en gardant alignements et tailles. */
    disposition: function (r, ordre) {
        var me = this, fixes = me.etat.donnees.blocs.filter(function (b) {
            return b.fixe;
        }).map(function (b) {
            return b.id;
        });
        return ordre.filter(function (id) {
            return fixes.indexOf(id) < 0;
        }).map(function (id) {
            var p = me.position(r, id);
            return {bloc: id, alignement: p.alignement || '', taille: p.taille || 0};
        });
    },

    deplacer: function (bloc, avant) {
        var me = this, ordre = (me.etat.apercu ? me.etat.apercu.ordre : []).slice();
        var i = ordre.indexOf(bloc);
        if (i < 0) {
            return;
        }
        ordre.splice(i, 1);
        var j = avant ? ordre.indexOf(avant) : ordre.length - 1;
        if (j < 0) {
            j = ordre.length - 1;
        }
        ordre.splice(j, 0, bloc);
        me.modifier(function (r) {
            r.disposition = me.disposition(r, ordre);
        });
    },

    /** Deplacement d'un cran (clavier) parmi les blocs presents sur le ticket. */
    deplacerUnCran: function (bloc, sens) {
        var me = this, a = me.etat.apercu;
        if (!a) {
            return;
        }
        var presents = me.blocsMobiles(a);
        var i = presents.indexOf(bloc), cible = presents[i + sens];
        if (i < 0 || !cible) {
            return;
        }
        var ordre = a.ordre.slice();
        ordre.splice(ordre.indexOf(bloc), 1);
        var k = ordre.indexOf(cible);
        ordre.splice(sens > 0 ? k + 1 : k, 0, bloc);
        me.modifier(function (r) {
            r.disposition = me.disposition(r, ordre);
        });
    },

    blocsMobiles: function (a) {
        var me = this;
        return a.ordre.filter(function (id) {
            var b = Ext.Array.findBy(me.etat.donnees.blocs, function (x) {
                return x.id === id;
            });
            return a.zones[id] && b && !b.fixe;
        });
    },

    /* ---------- apercu ---------- */

    demanderApercu: function () {
        var me = this, n = ++me.etat.demande;
        Ext.Ajax.request({
            url: me.URL + '/apercu', method: 'POST', headers: {'Content-Type': 'application/json'},
            jsonData: {ticket: me.etat.ticket, largeur: me.etat.largeur, reglages: Ext.apply({}, {modele: 'NOUVEAU'}, me.reglages())},
            success: function (rep) {
                if (n !== me.etat.demande || me.isDestroyed) {
                    return;
                }
                var o = Ext.decode(rep.responseText, true) || {};
                if (!o.success) {
                    PrestigeToast.afficher(o.msg || 'Aperçu impossible.', {niveau: 'erreur'});
                    return;
                }
                me.etat.apercu = o;
                me.afficherApercu(o);
            }
        });
    },

    afficherApercu: function (o) {
        var me = this, papier = me.racine.querySelector('.mtk-papier'), r = me.reglages();
        if (!papier) {
            return;
        }
        var mobile = me.droit() && r.modele === 'NOUVEAU';
        var h = ['<div class="mtk-feuille" style="width:' + o.largeurImage + 'px;height:' + o.hauteurImage + 'px">',
            '<img alt="Aperçu du ticket" src="data:image/png;base64,' + o.image + '" width="' + o.largeurImage + '" height="' + o.hauteurImage + '">'];
        Object.keys(o.zones).forEach(function (id) {
            var z = o.zones[id], b = Ext.Array.findBy(me.etat.donnees.blocs, function (x) {
                return x.id === id;
            });
            if (!b) {
                return;
            }
            h.push('<div class="mtk-zone' + (b.fixe ? ' mtk-fixe' : '') + (me.etat.selection === id ? ' mtk-choisie' : '') + (mobile && !b.fixe ? ' mtk-mobile' : '')
                    + '" data-bloc="' + id + '" title="' + Ext.String.htmlEncode(b.libelle + (b.fixe ? ' (fixe)' : '')) + '" style="top:' + Math.round(z[0] * o.echelle) + 'px;height:'
                    + Math.max(6, Math.round((z[1] - z[0]) * o.echelle)) + 'px"></div>');
        });
        h.push('<div class="mtk-depot"></div></div>');
        papier.innerHTML = h.join('');
        var c = me.racine.querySelector('.mtk-controle'), lignes = [];
        o.bloquants.forEach(function (x) {
            lignes.push('<div class="mtk-ko">✖ ' + Ext.String.htmlEncode(x) + '</div>');
        });
        o.avertissements.forEach(function (x) {
            lignes.push('<div class="mtk-avert">⚠ ' + Ext.String.htmlEncode(x) + '</div>');
        });
        if (!o.bloquants.length) {
            lignes.unshift('<div class="mtk-ok">✔ Rien ne dépasse de la largeur du papier ; aucun chevauchement.</div>');
        }
        c.innerHTML = '<b>Contrôle de la disposition</b>' + lignes.join('');
        var enr = me.racine.querySelector('[data-action="enregistrer"]');
        enr.disabled = !me.droit() || !me.etat.brouillons[me.cle()] || o.bloquants.length > 0;
    },

    /* ---------- evenements ---------- */

    ecouter: function () {
        var me = this, el = me.racine;
        el.addEventListener('click', function (e) {
            var b = e.target.closest('button');
            if (!b || b.disabled) {
                var zone = e.target.closest('.mtk-zone');
                if (zone && !zone.classList.contains('mtk-fixe') && !(me.glisse && me.glisse.bouge)) {
                    me.etat.selection = zone.getAttribute('data-bloc');
                    me.rendre();
                }
                return;
            }
            if (b.hasAttribute('data-ticket')) {
                me.etat.ticket = b.getAttribute('data-ticket');
                me.etat.selection = null;
                me.etat.apercu = null;
                me.rendre();
                me.demanderApercu();
            } else if (b.hasAttribute('data-choix')) {
                me.choisir(b.getAttribute('data-choix'), b.getAttribute('data-valeur'));
            } else if (b.hasAttribute('data-option')) {
                var cle = b.getAttribute('data-option');
                me.modifier(function (r) {
                    r[cle] = !r[cle];
                });
            } else if (b.hasAttribute('data-taille')) {
                var pas = Number(b.getAttribute('data-taille')), id = me.etat.selection;
                me.modifier(function (r) {
                    var ordre = me.etat.apercu.ordre, d = me.disposition(r, ordre);
                    d.forEach(function (p) {
                        if (p.bloc === id) {
                            p.taille = Math.max(-me.etat.donnees.ecartTailleMax, Math.min(me.etat.donnees.ecartTailleMax, p.taille + pas));
                        }
                    });
                    r.disposition = d;
                });
            } else if (b.hasAttribute('data-action')) {
                me.action(b, b.getAttribute('data-action'));
            }
        });
        el.addEventListener('keydown', function (e) {
            if (!e.target.classList || !e.target.classList.contains('mtk-papier') || !me.etat.selection || !me.droit()) {
                return;
            }
            var al = ['G', 'C', 'D'], p = me.position(me.reglages(), me.etat.selection);
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                me.deplacerUnCran(me.etat.selection, e.key === 'ArrowUp' ? -1 : 1);
                me.refocaliser();
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                var i = al.indexOf(p.alignement || 'G') + (e.key === 'ArrowLeft' ? -1 : 1);
                me.choisir('alignement', al[Math.max(0, Math.min(2, i))]);
                me.refocaliser();
            }
        });
        el.addEventListener('pointerdown', function (e) {
            var zone = e.target.closest('.mtk-zone.mtk-mobile');
            if (!zone || e.button !== 0) {
                return;
            }
            me.glisse = {bloc: zone.getAttribute('data-bloc'), y0: e.clientY, zone: zone, bouge: false};
            zone.setPointerCapture(e.pointerId);
        });
        el.addEventListener('pointermove', function (e) {
            var g = me.glisse;
            if (!g) {
                return;
            }
            var dy = e.clientY - g.y0;
            if (Math.abs(dy) > 4) {
                g.bouge = true;
            }
            if (!g.bouge) {
                return;
            }
            g.zone.classList.add('mtk-glisse');
            g.zone.style.transform = 'translateY(' + dy + 'px)';
            g.avant = me.cibleDepot(e.clientY, g.bloc);
        });
        el.addEventListener('pointerup', function () {
            var g = me.glisse;
            if (!g) {
                return;
            }
            setTimeout(function () {
                me.glisse = null;
            }, 0);
            if (!g.bouge) {
                return;
            }
            me.etat.selection = g.bloc;
            me.deplacer(g.bloc, g.avant);
        });
    },

    /** Bloc devant lequel deposer, selon la hauteur du pointeur ; affiche la ligne de depot. */
    cibleDepot: function (y, bloc) {
        var me = this, a = me.etat.apercu, feuille = me.racine.querySelector('.mtk-feuille');
        var haut = feuille.getBoundingClientRect().top, depot = me.racine.querySelector('.mtk-depot');
        var presents = me.blocsMobiles(a).filter(function (id) {
            return id !== bloc;
        });
        var avant = null, ligne = null;
        for (var i = 0; i < presents.length; i++) {
            var z = a.zones[presents[i]], milieu = haut + (z[0] + z[1]) / 2 * a.echelle;
            if (y < milieu) {
                avant = presents[i];
                ligne = z[0] * a.echelle;
                break;
            }
        }
        if (ligne === null) {
            var dernier = a.zones[presents[presents.length - 1]] || a.zones.PIED;
            ligne = dernier[1] * a.echelle;
        }
        depot.style.display = 'block';
        depot.style.top = (ligne - 2) + 'px';
        /* deposer en dernier : devant le premier bloc absent qui suit le dernier present, sinon a la fin */
        return avant || null;
    },

    refocaliser: function () {
        var me = this;
        setTimeout(function () {
            var p = me.racine.querySelector('.mtk-papier');
            if (p) {
                p.focus();
            }
        }, 50);
    },

    choisir: function (nom, valeur) {
        var me = this;
        if (nom === 'largeur') {
            me.etat.largeur = Number(valeur);
            me.etat.apercu = null;
            me.etat.selection = null;
            me.charger();
        } else if (nom === 'modele') {
            me.modifier(function (r) {
                r.modele = valeur;
            });
        } else if (nom === 'alignement') {
            var id = me.etat.selection;
            me.modifier(function (r) {
                var d = me.disposition(r, me.etat.apercu.ordre);
                d.forEach(function (p) {
                    if (p.bloc === id) {
                        p.alignement = valeur;
                    }
                });
                r.disposition = d;
            });
        } else if (nom.indexOf('imprimante:') === 0) {
            var imp = nom.substring(11);
            Ext.Ajax.request({
                url: me.URL + '/imprimante', method: 'PUT', headers: {'Content-Type': 'application/json'},
                jsonData: {id: imp, largeur: Number(valeur)},
                success: function (rep) {
                    var o = Ext.decode(rep.responseText, true) || {};
                    PrestigeToast.afficher(o.msg || 'Largeur non enregistrée.', {niveau: o.success ? 'ok' : 'erreur'});
                    if (o.success) {
                        me.etat.donnees.imprimantes.forEach(function (i) {
                            if (i.id === imp) {
                                i.largeur = Number(valeur);
                            }
                        });
                        me.rendre();
                    }
                }
            });
        }
    },

    /** Bouton a confirmer : premier clic, le texte devient la question ; second clic dans les 6 s, l'action. */
    confirmer: function (b, question, faire) {
        var me = this;
        if (b.getAttribute('data-confirme') === '1') {
            b.removeAttribute('data-confirme');
            faire();
            return;
        }
        var texte = b.textContent;
        b.setAttribute('data-confirme', '1');
        b.classList.add('mtk-confirme');
        b.textContent = question;
        me.minuteur = setTimeout(function () {
            if (!me.isDestroyed && b.isConnected) {
                b.removeAttribute('data-confirme');
                b.classList.remove('mtk-confirme');
                b.textContent = texte;
            }
        }, 6000);
    },

    action: function (b, action) {
        var me = this;
        if (action === 'enregistrer') {
            b.disabled = true;
            Ext.Ajax.request({
                url: me.URL, method: 'PUT', headers: {'Content-Type': 'application/json'},
                jsonData: {ticket: me.etat.ticket, largeur: me.etat.largeur, reglages: me.reglages()},
                success: function (rep) {
                    var o = Ext.decode(rep.responseText, true) || {};
                    PrestigeToast.afficher(o.msg || 'Non enregistré.', {niveau: o.success ? 'ok' : 'erreur'});
                    if (o.success) {
                        me.ticketCourant().reglages = o.reglages;
                        delete me.etat.brouillons[me.cle()];
                    }
                    me.rendre();
                },
                failure: function () {
                    PrestigeToast.afficher('Non enregistré (serveur injoignable).', {niveau: 'erreur'});
                    me.rendre();
                }
            });
        } else if (action === 'annuler') {
            delete me.etat.brouillons[me.cle()];
            me.rendre();
            me.demanderApercu();
        } else if (action === 'defaut') {
            me.confirmer(b, 'Confirmer : rétablir la disposition par défaut ?', function () {
                me.modifier(function (r) {
                    r.disposition = [];
                });
            });
        } else if (action === 'ancien') {
            me.confirmer(b, 'Confirmer : ancien modèle pour tous les tickets, sur toutes les caisses ?', function () {
                Ext.Ajax.request({
                    url: me.URL + '/ancien-partout', method: 'POST', headers: {'Content-Type': 'application/json'}, jsonData: {},
                    success: function (rep) {
                        var o = Ext.decode(rep.responseText, true) || {};
                        PrestigeToast.afficher(o.msg || 'Non appliqué.', {niveau: o.success ? 'ok' : 'erreur'});
                        me.etat.brouillons = {};
                        me.charger();
                    }
                });
            });
        }
    }
});
