/* global Ext, PrestigeToast */

/*
 * PARAMETRAGES > « Modèles de ticket » (demande du 02/11). À gauche les tickets de caisse ; au centre le modèle
 * (ancien ou nouveau) et les options du ticket choisi ; à droite l'aperçu, dessiné par le serveur avec le même code
 * que l'impression. Dans l'aperçu, un bloc se déplace à la souris (ou aux flèches du clavier) et s'aligne ou change
 * de taille ; le serveur contrôle chaque disposition (rien ne dépasse du papier, le code-barres reste
 * en place ; le nom de l'officine se règle et se déplace comme les autres blocs) et « Enregistrer » ne s'active que sans problème bloquant. Largeur du papier : 80 ou 58 mm, réglée par
 * imprimante. Retour du 05/11 : réglages d'alignement, de taille et de largeur juste à gauche de l'aperçu, aperçu
 * à l'échelle de l'écran (sans défilement), réglages communs (police, marge, en-tête, pied) repris sur tous les
 * tickets à l'enregistrement, export et import des réglages (80 et 58 mm).
 * Aucune fenêtre : les confirmations se font dans le bouton. Modification réservée au droit
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

    /* retour du 03/11 : memes polices que ReglagesTicket.POLICES (le serveur envoie la liste) ; Arial Narrow par defaut (05/11) */
    POLICES: ['Segoe UI', 'Arial Narrow', 'Tahoma', 'Calibri', 'Verdana'],
    POLICE_DEFAUT: 'Arial Narrow',
    /* retour du 05/11 : tailles par partie du bloc des articles */
    PARTIES: [{cle: 'section', libelle: 'Titres de section', aide: '« VENTE ASSURANCE », « CAISSIER : »'},
        {cle: 'nom', libelle: 'Désignation', aide: 'Nom du produit'},
        {cle: 'detail', libelle: 'Quantité × prix', aide: 'Et le montant de la ligne'}],

    OPTIONS: [
        {cle: 'remise', libelle: 'Afficher la remise', aide: 'Si non : ni la remise ni le total avant remise, la remise reste appliquée', pour: ['PREVENTE', 'VENTE', 'VENTE_ASSURANCE', 'VENTE_CARNET', 'VENTE_DEPOT', 'VENTE_MIXTE']},
        {cle: 'lot', libelle: 'Afficher le lot vendu', aide: 'Lots lus par GS1 ; place réservée entre « quantité × prix » et le montant', pour: ['VENTE', 'VENTE_ASSURANCE', 'VENTE_CARNET', 'VENTE_DEPOT', 'VENTE_MIXTE']},
        {cle: 'recapitulatif', libelle: 'Afficher « lignes · boîtes »', aide: 'Pour contrôler le sac au comptoir', pour: ['PREVENTE', 'VENTE', 'VENTE_ASSURANCE', 'VENTE_CARNET', 'VENTE_DEPOT', 'VENTE_MIXTE']},
        {cle: 'ccRc', libelle: 'Afficher CC et RC', aide: 'Fiche officine', pour: ['VENTE', 'VENTE_ASSURANCE', 'VENTE_CARNET', 'VENTE_DEPOT', 'VENTE_MIXTE', 'REGLEMENT_DIFFERE', 'REGLEMENT_FACTURE', 'REGLEMENT_CARNET_DEPOT', 'MOUVEMENT_CAISSE']},
        {cle: 'commentaires', libelle: 'Commentaires de l\'officine', aide: 'En-tête et commentaires du bas de l\'identification officine', pour: ['VENTE', 'VENTE_ASSURANCE', 'VENTE_CARNET', 'VENTE_DEPOT', 'VENTE_MIXTE', 'REGLEMENT_DIFFERE', 'REGLEMENT_FACTURE', 'REGLEMENT_CARNET_DEPOT', 'MOUVEMENT_CAISSE']},
        {cle: 'cadreNet', libelle: 'Cadre autour du net à payer', aide: 'Si non : le net reste en gros caractères, sans cadre', pour: ['PREVENTE', 'VENTE', 'VENTE_ASSURANCE', 'VENTE_CARNET', 'VENTE_DEPOT', 'VENTE_MIXTE', 'REGLEMENT_DIFFERE', 'REGLEMENT_FACTURE', 'REGLEMENT_CARNET_DEPOT', 'MOUVEMENT_CAISSE', 'TICKET_Z']},
        {cle: 'net', libelle: 'Afficher le net à payer', aide: 'Retour du 05/11 : non par défaut sur la vente dépôt', pour: ['VENTE_DEPOT']},
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
        me.on('resize', function () {
            if (me.racine && me.etat.apercu) {
                me.afficherApercu(me.etat.apercu);
            }
        });
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
                + '.mtk-corps{display:grid;grid-template-columns:210px minmax(270px,320px) 1fr;gap:12px;padding:12px 14px;flex:1;align-items:start}'
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
                + '.mtk-champ.mtk-police{flex-wrap:wrap}.mtk-police>span:first-child{flex-basis:100%}'
                + '.mtk-police .mtk-choix{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:#cbd5e1;width:100%}'
                + '.mtk-police .mtk-choix button{border:0;font-size:13px;padding:6px 4px;white-space:nowrap}.mtk-police .mtk-choix button:last-child{grid-column:span 2}'
                + '.mtk-bascule{width:38px;height:22px;border-radius:11px;border:0;background:#cbd5e1;position:relative;cursor:pointer;flex:none;transition:background .15s}'
                + '.mtk-bascule:after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .15s}'
                + '.mtk-bascule.mtk-on{background:#16a34a}.mtk-bascule.mtk-on:after{left:19px}.mtk-bascule:disabled{opacity:.5;cursor:default}'
                + '.mtk-selection{margin-top:10px;padding:8px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0}'
                + '.mtk-discret{color:#64748b;font-size:12px}'
                + '.mtk-controle{margin-top:10px;font-size:12px;line-height:1.5}'
                + '.mtk-ok{color:#15803d}.mtk-ko{color:#b91c1c}.mtk-avert{color:#b45309}'
                + '.mtk-aide{color:#64748b;font-size:12px;margin-bottom:8px}'
                + '.mtk-vue{display:flex;gap:10px;align-items:flex-start}'
                + '.mtk-outils{flex:none;width:250px}.mtk-outils .mtk-selection{margin-top:0}'
                + '.mtk-papier{flex:1;min-width:0;display:flex;justify-content:center;background:#e2e8f0;border-radius:8px;padding:14px;outline:none;overflow:hidden}'
                + '.mtk-papier:focus{box-shadow:0 0 0 2px #93c5fd}'
                + '.mtk-feuille{position:relative;flex:none;box-shadow:0 2px 10px rgba(15,23,42,.18);background:#fff}'
                + '.mtk-feuille img{display:block;user-select:none;-webkit-user-drag:none}'
                + '.mtk-zone{position:absolute;left:0;right:0;border:1px dashed transparent;border-radius:3px}'
                + '.mtk-zone:not(.mtk-fixe):hover,.mtk-zone.mtk-reglable:hover{border-color:#93c5fd;background:rgba(37,99,235,.05)}'
                + '.mtk-zone.mtk-reglable{cursor:pointer}'
                + '.mtk-zone.mtk-mobile{cursor:grab;touch-action:none}'
                + '.mtk-zone.mtk-choisie{border:2px solid #2563eb;background:rgba(37,99,235,.07)}'
                + '.mtk-zone.mtk-glisse{cursor:grabbing;background:rgba(37,99,235,.15);border-color:#2563eb;z-index:2;opacity:.9}'
                + '.mtk-depot{display:none;position:absolute;left:-6px;right:-6px;height:4px;background:#2563eb;border-radius:2px;pointer-events:none}'
                + '.mtk-boutons{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:10px}'
                + '.mtk-boutons .mtk-btn{width:100%;text-align:center;padding:6px 8px;white-space:normal;line-height:1.25}'
                + '.mtk-boutons .mtk-large{grid-column:span 2}'
                + '.mtk-commun{color:#1d4ed8;font-size:11px;margin-top:4px}'
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
        /* retour du 03/11 : police du nouveau modele, chaque choix ecrit dans sa police */
        h.push('<div class="mtk-champ mtk-police"><span>Police<small>Arial Narrow par défaut ; commune à tous les tickets ; une police absente du poste imprime en Arial Narrow</small></span>'
                + me.choix('police', (d.polices || me.POLICES).map(function (x) {
                    return {v: x, l: '<span style="font-family:&quot;' + x + '&quot;">' + x + '</span>'};
                }), r.police || me.POLICE_DEFAUT, !me.droit() || r.modele !== 'NOUVEAU') + '</div>');
        /* retour du 05/11 : marge du rouleau, commune a tous les tickets */
        var marge = r.marge || 0, margeMax = d.margeMax || 6, actif = me.droit() && r.modele === 'NOUVEAU';
        h.push('<div class="mtk-champ"><span>Marge du rouleau<small>De chaque côté ; commune à tous les tickets</small></span><span class="mtk-choix">'
                + '<button type="button" data-marge="-1"' + (actif && marge > 0 ? '' : ' disabled') + ' aria-label="Réduire la marge">−</button>'
                + '<span class="mtk-sel" data-valeur-marge="' + marge + '">' + marge + ' mm</span>'
                + '<button type="button" data-marge="1"' + (actif && marge < margeMax ? '' : ' disabled') + ' aria-label="Agrandir la marge">+</button></span></div>');
        me.OPTIONS.forEach(function (o) {
            if (o.pour.indexOf(me.etat.ticket) < 0) {
                return;
            }
            h.push('<div class="mtk-champ"><span>' + enc(o.libelle) + (o.aide ? '<small>' + enc(o.aide) + '</small>' : '') + '</span>'
                    + '<button type="button" class="mtk-bascule' + (r[o.cle] ? ' mtk-on' : '') + '" data-option="' + o.cle + '" role="switch" aria-checked="' + !!r[o.cle] + '" aria-label="' + enc(o.libelle) + '"' + (me.droit() && r.modele === 'NOUVEAU' ? '' : ' disabled') + '></button></div>');
        });
        var modifie = !!me.etat.brouillons[me.cle()];
        /* retour du 05/11 : les boutons remontent dans la place libre, sous les reglages du bloc (a gauche de l'apercu) */
        var boutons = '<div class="mtk-boutons">'
                + '<button type="button" class="mtk-btn mtk-prim mtk-large" data-action="enregistrer" disabled>Enregistrer</button>'
                + '<button type="button" class="mtk-btn" data-action="annuler"' + (modifie ? '' : ' disabled') + '>Annuler les modifications</button>'
                + '<button type="button" class="mtk-btn" data-action="defaut"' + (me.droit() ? '' : ' disabled') + '>Rétablir la disposition par défaut</button>'
                + '<button type="button" class="mtk-btn" data-action="exporter" title="Réglages de tous les tickets, 80 et 58 mm, dans un fichier">Exporter</button>'
                + '<button type="button" class="mtk-btn" data-action="importer"' + (me.droit() ? '' : ' disabled') + ' title="Reprendre un fichier exporté sur un autre poste">Importer</button>'
                + '<input type="file" class="mtk-fichier" accept=".json,application/json" hidden>'
                + '<button type="button" class="mtk-btn mtk-attention mtk-large" data-action="ancien"' + (me.droit() ? '' : ' disabled') + '>Revenir à l\'ancien modèle pour tous les tickets</button></div>';
        h.push('</div><div class="mtk-apercu"><div class="mtk-aide">' + (r.modele === 'NOUVEAU'
                ? (me.droit() ? 'Glissez un bloc pour le déplacer ; cliquez-le pour l\'aligner, changer sa taille ou sa largeur (flèches du clavier : ↑ ↓ déplacer, ← → aligner).' : 'Aperçu du ticket.')
                : 'Ancien modèle : le ticket sort comme avant. Aperçu du nouveau modèle, pour comparer.') + '</div>'
                + '<div class="mtk-vue"><div class="mtk-outils">' + me.rendreSelection(r) + boutons + '<div class="mtk-controle"></div></div>'
                + '<div class="mtk-papier" tabindex="0" aria-label="Aperçu du ticket"><div class="mtk-attente">Aperçu…</div></div></div></div></div>');
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
        var d = me.etat.donnees, max = d.ecartTailleMax, min = d.largeurMin || 30, pied = s === 'PIED';
        var pas = function (attr, valeur, bas, haut, unite, libelle, aide) {
            return '<div class="mtk-champ"><span>' + libelle + (aide ? '<small>' + aide + '</small>' : '') + '</span><span class="mtk-choix">'
                    + '<button type="button" ' + attr + '="-1"' + (me.droit() && valeur > bas ? '' : ' disabled') + ' aria-label="Réduire : ' + libelle + '">−</button>'
                    + '<span class="mtk-sel">' + (unite === 'pt' && valeur > 0 ? '+' : '') + valeur + ' ' + unite + '</span>'
                    + '<button type="button" ' + attr + '="1"' + (me.droit() && valeur < haut ? '' : ' disabled') + ' aria-label="Agrandir : ' + libelle + '">+</button></span></div>';
        };
        var h = '<div class="mtk-selection"><b>Bloc choisi : ' + enc(bloc ? bloc.libelle : s) + '</b>';
        if (!pied) {
            h += '<div class="mtk-champ"><span>Alignement</span>' + me.choix('alignement', [{v: 'G', l: 'Gauche'}, {v: 'C', l: 'Centre'}, {v: 'D', l: 'Droite'}], p.alignement || 'DEFAUT', !me.droit()) + '</div>';
        }
        h += pas('data-taille', p.taille || 0, -max, max, 'pt', pied ? 'Taille du code-barres' : 'Taille du texte', 'De −' + max + ' à +' + max + ' points autour du modèle');
        if (!pied) {
            /* retour du 05/11 : bloc plus etroit, chaque texte sur une ligne termine par « … » */
            h += pas('data-largeur', p.largeur || 100, min, 100, '%', 'Largeur du bloc', 'En dessous de 100 % : une ligne, terminée par « … »');
        }
        if (s === 'CORPS') {
            me.PARTIES.forEach(function (x) {
                h += pas('data-partie="' + x.cle + '" data-pas', p[x.cle] || 0, -max, max, 'pt', x.libelle, x.aide);
            });
        }
        if ((d.blocsCommuns || []).indexOf(s) >= 0) {
            h += '<div class="mtk-commun">Réglage commun : repris sur tous les tickets à l\'enregistrement.</div>';
        }
        return h + '</div>';
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
        return p || {bloc: bloc, alignement: '', taille: 0, largeur: 100};
    },

    copie: function (p) {
        var c = {bloc: p.bloc, alignement: p.alignement || '', taille: p.taille || 0};
        if (p.largeur && p.largeur !== 100) {
            c.largeur = p.largeur;
        }
        if (p.section || p.nom || p.detail) {
            c.section = p.section || 0;
            c.nom = p.nom || 0;
            c.detail = p.detail || 0;
        }
        return c;
    },

    /** Disposition complete dans l'ordre donne (blocs deplacables seulement), en gardant alignements et tailles. */
    disposition: function (r, ordre) {
        var me = this, fixes = me.etat.donnees.blocs.filter(function (b) {
            return b.fixe;
        }).map(function (b) {
            return b.id;
        });
        var d = ordre.filter(function (id) {
            return fixes.indexOf(id) < 0;
        }).map(function (id) {
            return me.copie(me.position(r, id));
        });
        /* retour du 05/11 : le pied (taille du code-barres) se regle, mais reste le dernier */
        var pied = me.position(r, 'PIED');
        if (pied.taille) {
            d.push(me.copie(pied));
        }
        return d;
    },

    /** Change d'un pas un reglage numerique du bloc choisi, dans ses bornes. */
    regler: function (champ, pas, bas, haut, defaut) {
        var me = this, id = me.etat.selection;
        me.modifier(function (r) {
            var d = me.disposition(r, me.etat.apercu.ordre), p = Ext.Array.findBy(d, function (x) {
                return x.bloc === id;
            });
            if (!p) {
                p = me.copie(me.position(r, id));
                d.push(p);
            }
            var v = (p[champ] === undefined ? defaut : p[champ]) + pas;
            p[champ] = Math.max(bas, Math.min(haut, v));
            r.disposition = d.map(function (x) {
                return me.copie(x);
            });
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
        /* retour du 05/11 : l'apercu tient dans la hauteur de l'ecran, reduit au besoin (aucun defilement) */
        var dispo = window.innerHeight - papier.getBoundingClientRect().top - 40;
        var f = Math.max(0.3, Math.min(1, dispo / o.hauteurImage));
        me.etat.facteur = f;
        var l = Math.round(o.largeurImage * f), hh = Math.round(o.hauteurImage * f), ech = o.echelle * f;
        var h = ['<div class="mtk-feuille" style="width:' + l + 'px;height:' + hh + 'px">',
            '<img alt="Aperçu du ticket" src="data:image/png;base64,' + o.image + '" width="' + l + '" height="' + hh + '">'];
        Object.keys(o.zones).forEach(function (id) {
            var z = o.zones[id], b = Ext.Array.findBy(me.etat.donnees.blocs, function (x) {
                return x.id === id;
            });
            if (!b) {
                return;
            }
            h.push('<div class="mtk-zone' + (b.fixe ? ' mtk-fixe' : '') + (id === 'PIED' ? ' mtk-reglable' : '') + (me.etat.selection === id ? ' mtk-choisie' : '') + (mobile && !b.fixe ? ' mtk-mobile' : '')
                    + '" data-bloc="' + id + '" title="' + Ext.String.htmlEncode(b.libelle + (b.fixe ? ' (reste en bas ; taille réglable)' : '')) + '" style="top:' + Math.round(z[0] * ech) + 'px;height:'
                    + Math.max(6, Math.round((z[1] - z[0]) * ech)) + 'px"></div>');
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
                if (zone && (!zone.classList.contains('mtk-fixe') || zone.classList.contains('mtk-reglable')) && !(me.glisse && me.glisse.bouge)) {
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
                var max = me.etat.donnees.ecartTailleMax;
                me.regler('taille', Number(b.getAttribute('data-taille')), -max, max, 0);
            } else if (b.hasAttribute('data-largeur')) {
                me.regler('largeur', 10 * Number(b.getAttribute('data-largeur')), me.etat.donnees.largeurMin || 30, 100, 100);
            } else if (b.hasAttribute('data-partie')) {
                var m = me.etat.donnees.ecartTailleMax;
                me.regler(b.getAttribute('data-partie'), Number(b.getAttribute('data-pas')), -m, m, 0);
            } else if (b.hasAttribute('data-marge')) {
                var pasMarge = Number(b.getAttribute('data-marge'));
                me.modifier(function (r) {
                    r.marge = Math.max(0, Math.min(me.etat.donnees.margeMax || 6, (r.marge || 0) + pasMarge));
                });
            } else if (b.hasAttribute('data-action')) {
                me.action(b, b.getAttribute('data-action'));
            }
        });
        el.addEventListener('change', function (e) {
            if (e.target.classList && e.target.classList.contains('mtk-fichier')) {
                me.lireImport(e.target);
            }
        });
        el.addEventListener('keydown', function (e) {
            if (!e.target.classList || !e.target.classList.contains('mtk-papier') || !me.etat.selection || me.etat.selection === 'PIED' || !me.droit()) {
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
        var ech = a.echelle * (me.etat.facteur || 1);
        var presents = me.blocsMobiles(a).filter(function (id) {
            return id !== bloc;
        });
        var avant = null, ligne = null;
        for (var i = 0; i < presents.length; i++) {
            var z = a.zones[presents[i]], milieu = haut + (z[0] + z[1]) / 2 * ech;
            if (y < milieu) {
                avant = presents[i];
                ligne = z[0] * ech;
                break;
            }
        }
        if (ligne === null) {
            var dernier = a.zones[presents[presents.length - 1]] || a.zones.PIED;
            ligne = dernier[1] * ech;
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
        } else if (nom === 'police') {
            me.modifier(function (r) {
                r.police = valeur;
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

    /** Fichier choisi : la confirmation se fait dans le bouton « Importer » (aucune fenetre). */
    lireImport: function (input) {
        var me = this, f = input.files && input.files[0];
        if (!f) {
            return;
        }
        var lecteur = new FileReader();
        lecteur.onload = function () {
            me.texteImport = String(lecteur.result || '');
            var b = me.racine.querySelector('[data-action="importer"]');
            if (b) {
                me.confirmer(b, 'Confirmer : importer « ' + f.name + ' » ?', function () {
                    me.importer();
                });
            }
        };
        lecteur.readAsText(f);
    },

    importer: function () {
        var me = this;
        Ext.Ajax.request({
            url: me.URL + '/import', method: 'POST', headers: {'Content-Type': 'application/json'},
            rawData: me.texteImport || '{}',
            success: function (rep) {
                var o = Ext.decode(rep.responseText, true) || {};
                PrestigeToast.afficher(o.msg || 'Import impossible.', {niveau: o.success ? 'ok' : 'erreur'});
                if (o.success) {
                    me.etat.brouillons = {};
                    me.charger();
                }
            },
            failure: function () {
                PrestigeToast.afficher('Import impossible (serveur injoignable).', {niveau: 'erreur'});
            }
        });
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
                        if (o.autres) {
                            /* retour du 05/11 : reglages communs reportes sur d'autres tickets */
                            me.charger();
                            return;
                        }
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
                /* retour du 05/11 : la disposition par defaut du ticket (tailles du 05/11 pour un nouveau ticket) */
                var defaut = me.ticketCourant().defaut || {};
                me.modifier(function (r) {
                    r.disposition = Ext.clone(defaut.disposition || []);
                });
            });
        } else if (action === 'exporter') {
            window.location.href = me.URL + '/export';
        } else if (action === 'importer') {
            if (b.getAttribute('data-confirme') === '1') {
                me.confirmer(b, '', function () {
                    me.importer();
                });
            } else {
                var fichier = me.racine.querySelector('.mtk-fichier');
                fichier.value = '';
                fichier.click();
            }
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
