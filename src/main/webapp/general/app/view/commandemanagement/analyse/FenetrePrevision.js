/* global Ext */

/*
 * Fenetre produit des previsions (lecture seule) : ventes mensuelles avec la quantite au-dessus de chaque barre,
 * methodes essayees, et le calcul de la quantite recommandee ligne par ligne.
 * Retours du 10/10 : couleurs (vert = ce qui fait le besoin, rouge doux = ce qui est retranche), origine du delai et de
 * la couverture, stock rayon et reserve detailles, derniere vente avec sa quantite ; ouverte aussi depuis les lignes
 * d'une suggestion et d'une commande (meme fenetre partout).
 */
Ext.define('testextjs.view.commandemanagement.analyse.FenetrePrevision', {
    singleton: true,

    METHODES: {MOYENNE: 'Moyenne 3 mois', SAISON: 'Saisonnière', HOLT: 'Tendance (Holt)', HOLT_WINTERS: 'Tendance + saison'},

    h: function (s) {
        return Ext.String.htmlEncode(s === null || s === undefined ? '' : String(s));
    },

    dec: function (v) {
        return String(v === null || v === undefined ? '' : v).replace('.', ',');
    },

    fiabilite: function (v) {
        if (v === null || v === undefined) {
            return '<span style="color:#9aa8b6">—</span>';
        }
        var c = v >= 70 ? '#27ae60' : (v >= 40 ? '#e67e22' : '#c0392b');
        return '<span class="ac-fiab"><span style="width:' + Math.max(2, v) + '%;background:' + c + '"></span></span> ' + v + ' %';
    },

    /**
     * Ouvre la fenetre du produit. cfg.siRefus(message) : appele quand l'utilisateur n'a pas acces aux previsions
     * (la suggestion et la commande retombent alors sur leur detail habituel).
     */
    ouvrir: function (familleId, cfg) {
        var me = this;
        cfg = cfg || {};
        Ext.Ajax.request({url: '../api/v1/analyse-commande/produit/' + encodeURIComponent(familleId), method: 'GET', timeout: 120000,
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (o.success === false) {
                    if (Ext.isFunction(cfg.siRefus)) {
                        cfg.siRefus(o.message || o.msg);
                    } else {
                        Ext.MessageBox.alert('Prévision du produit', me.h(o.message || o.msg || 'Indisponible'));
                    }
                    return;
                }
                me.afficher(o);
            },
            failure: function (r) {
                Ext.MessageBox.alert('Prévision du produit', 'Le serveur n\'a pas répondu (' + r.status + ').');
            }});
    },

    graphique: function (o) {
        var me = this, mois = o.mois || [], max = 1;
        mois.forEach(function (m) {
            max = Math.max(max, m.ventes);
        });
        max = Math.max(max, o.prevuMois);
        var l = 760, hgt = 205, haut = 16, n = mois.length + 1, pas = l / n, larg = Math.max(8, Math.floor(pas) - 6), svg = '';
        var etiquette = function (x, y, texte, couleur) {
            return '<text class="pv-qte" x="' + (x + larg / 2) + '" y="' + y + '" text-anchor="middle" font-size="10" font-weight="600" fill="' + couleur + '">' + texte + '</text>';
        };
        mois.forEach(function (m, i) {
            var hh = Math.round(m.ventes / max * (hgt - 34 - haut)), x = i * pas + 3, y = hgt - 18 - hh;
            svg += '<rect rx="3" x="' + x + '" y="' + y + '" width="' + larg + '" height="' + hh + '" fill="#7fb3d5"><title>'
                    + me.h(m.mois) + ' : ' + m.ventes + ' vendu(s)</title></rect>' + etiquette(x, y - 3, m.ventes, '#2c5d82')
                    + (i % 3 === 0 ? '<text x="' + x + '" y="' + (hgt - 4) + '" font-size="10" fill="#7f8c8d">' + me.h(m.mois) + '</text>' : '');
        });
        var hp = Math.round(o.prevuMois / max * (hgt - 34 - haut)), xp = mois.length * pas + 3, yp = hgt - 18 - hp;
        svg += '<rect rx="3" x="' + xp + '" y="' + yp + '" width="' + larg + '" height="' + hp
                + '" fill="#e67e22" stroke="#d35400" stroke-dasharray="3,2"><title>Prévu ' + me.h(o.prochainMois) + ' : '
                + me.dec(o.prevuMois) + '</title></rect>' + etiquette(xp, yp - 3, me.dec(o.prevuMois), '#d35400')
                + '<text x="' + (xp - 4) + '" y="' + (hgt - 4) + '" font-size="10" fill="#d35400">prévu</text>';
        return '<svg width="' + l + '" height="' + hgt + '">' + svg + '</svg>';
    },

    afficher: function (o) {
        var me = this, c = o.calcul || {}, mois = o.mois || [];
        var methodes = (o.methodes || []).map(function (m) {
            return '<tr' + (m.retenue ? ' style="font-weight:700;background:#fef5e7"' : '') + '><td>' + me.h(me.METHODES[m.methode] || m.methode)
                    + (m.retenue ? ' ✓' : '') + '</td><td class="n">' + me.dec(m.erreur) + ' %</td></tr>';
        }).join('') || '<tr><td colspan="2" style="color:#7f8c8d">Pas assez d\'historique pour comparer les méthodes (moins de 4 mois).</td></tr>';
        /* vert = ce qui fait le besoin (s'ajoute) ; rouge doux = ce qui est retranche */
        var ligne = function (cls, libelle, valeur, aide) {
            return '<tr class="' + cls + '" data-qtip="' + me.h(aide) + '"><td>' + libelle + '</td><td class="n">' + valeur + '</td></tr>';
        };
        var stockDetail = o.rayon !== undefined ? ' (RAY = ' + o.rayon + ', RES = ' + o.reserve + ')' : '';
        var calcul = '<table class="ac-table pv-calcul">'
                + ligne('pv-plus', 'Ventes prévues par jour', me.dec(c.parJour), 'Prévision du mois ' + me.dec(o.prevuMois) + ' ÷ 30')
                + ligne('pv-plus', '× (délai ' + c.delai + ' j <span class="pv-origine">' + me.h(o.delaiOrigine || '') + '</span> + couverture '
                        + c.couvertureVoulue + ' j <span class="pv-origine">' + me.h(o.couvertureOrigine || '') + '</span>)', me.dec(c.besoin),
                        'Besoin jusqu\'à la livraison puis pendant la couverture voulue : ' + me.dec(c.parJour) + ' × ' + (c.delai + c.couvertureVoulue))
                + ligne('pv-plus', '+ stock de sécurité (95 %)', me.dec(c.securite),
                        '1,65 × écart-type mensuel des ventes (' + me.dec(c.ecartType) + ') ÷ √30 × √délai : couvre les variations de vente')
                + ligne('pv-moins', '− stock rayon et réserve' + stockDetail, o.stock, 'Stock de l\'emplacement : rayon + réserve')
                + ligne('pv-moins', '− commandes en cours', o.enCours, 'Quantités commandées et pas encore livrées (lues en direct)')
                + ligne('pv-moins', '− équivalents DCI directs en stock', o.equivalents, 'Stock rayon des produits de même DCI, dosage et forme')
                + '<tr class="pv-total"><td>= à commander (arrondi au-dessus, jamais négatif)</td><td class="n">' + o.recommande + '</td></tr></table>';
        var derniere = o.derniereVente ? me.h(o.derniereVente) + (o.derniereVenteQte ? ' — ' + o.derniereVenteQte + ' unité' + (o.derniereVenteQte > 1 ? 's' : '') : '') : 'jamais';
        var html = '<div class="ac-detail">'
                + '<div class="ac-bloc-t">Ventes mensuelles (' + mois.length + ' derniers mois complets) et prévision de ' + me.h(o.prochainMois) + '</div>'
                + me.graphique(o)
                + '<div class="ac-colonnes"><div><div class="ac-bloc-t">Méthodes essayées (erreur sur les derniers mois connus)</div>'
                + '<table class="ac-table"><tr><th>Méthode</th><th class="n">Erreur</th></tr>' + methodes + '</table>'
                + '<div class="ac-note">Fiabilité retenue : ' + me.fiabilite(o.fiabilite) + '</div></div>'
                + '<div><div class="ac-bloc-t">Quantité recommandée : ' + o.recommande + '</div>' + calcul
                + '<div class="ac-note pv-derniere">Dernière vente : ' + derniere + '</div></div></div></div>';
        return Ext.create('Ext.window.Window', {
            title: me.h(o.nom) + ' — ' + me.h(o.cip), itemId: 'fenPrevision', cls: 'pv-fenetre', width: 820,
            maxHeight: Ext.getBody().getViewSize().height - 40, autoScroll: true, modal: true, bodyPadding: 12, html: html,
            buttons: [{text: 'Fermer', handler: function (b) {
                        b.up('window').close();
                    }}]
        }).show();
    }
});
