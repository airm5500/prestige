/* global Ext */

/*
 * Fenetre produit des previsions (lecture seule) : ventes mensuelles avec la quantite au-dessus de chaque barre,
 * methodes essayees, et le calcul de la quantite recommandee ligne par ligne.
 * Retours du 10/10 : couleurs (vert = ce qui fait le besoin, rouge doux = ce qui est retranche), origine du delai et de
 * la couverture, stock rayon et reserve detailles, derniere vente avec sa quantite ; ouverte aussi depuis les lignes
 * d'une suggestion et d'une commande (meme fenetre partout).
 * Plan du 21/11, point 15 (reponse du 22/11) : sans defilement en 1366x768 : graphe 24 mois, juste dessous le tableau
 * des unites vendues par mois et de l'indice saisonnier, puis « Méthodes essayées » et « Quantité recommandée »
 * resserres. Le calcul de la valeur prevue est explique (ligne sous le graphe et bulle de la barre orange : les chiffres
 * du calcul du serveur), comme la quantite a commander (phrase « En clair »).
 */
Ext.define('testextjs.view.commandemanagement.analyse.FenetrePrevision', {
    singleton: true,

    METHODES: {MOYENNE: 'Moyenne 3 mois', SAISON: 'Saisonnière', HOLT: 'Tendance (Holt)', HOLT_WINTERS: 'Tendance + saison'},

    /* plan du 21/11, point 15 : ce que fait chaque methode, en mots simples (bulle de la ligne) */
    AIDE_METHODES: {MOYENNE: 'Moyenne des ventes des 3 derniers mois.',
        SAISON: 'Ventes du même mois l\'an dernier, corrigées de la tendance (12 derniers mois comparés aux 12 d\'avant).',
        HOLT: 'Niveau récent des ventes (les derniers mois comptent le plus) plus la tendance (hausse ou baisse par mois).',
        HOLT_WINTERS: 'Niveau récent, tendance, et effet de la saison sur le mois prévu (24 mois d\'historique au moins).'},

    /**
     * Retour du 22/11 : a l'ouverture d'une suggestion ou d'une commande en cours, le serveur calcule les previsions de
     * ses produits qui ne sont pas du jour (ou sans le detail du calcul) : la fenetre du produit les a tout de suite.
     * En arriere-plan et sans message ; sans acces aux previsions, le serveur refuse et rien ne change.
     */
    actualiser: function (type, id) {
        if (!id || id === '0') {
            return;
        }
        Ext.Ajax.request({url: '../api/v1/analyse-commande/actualiser?type=' + encodeURIComponent(type) + '&id=' + encodeURIComponent(id),
            method: 'POST', timeout: 120000, success: Ext.emptyFn, failure: Ext.emptyFn});
    },

    MOIS_COURTS: ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'],

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
     * (la suggestion et la commande retombent alors sur leur detail habituel). cfg.cible : composant qui montre le
     * message d'ouverture. Verrou du double clic (15/10) : une seule fenetre tant que le serveur n'a pas repondu.
     */
    ouvrir: function (familleId, cfg) {
        var me = this;
        cfg = cfg || {};
        var fin = window.PrestigeChargement ? PrestigeChargement.verrou('prevision-produit', cfg.cible, 'Ouverture de la prévision', 125000) : Ext.emptyFn;
        if (!fin) {
            return;
        }
        Ext.Ajax.request({url: '../api/v1/analyse-commande/produit/' + encodeURIComponent(familleId), method: 'GET', timeout: 120000,
            callback: fin,
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
        var l = 856, hgt = 168, haut = 16, n = mois.length + 1, pas = l / n, larg = Math.max(8, Math.floor(pas) - 6), svg = '';
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
        svg += '<rect class="pv-barre-prevue" rx="3" x="' + xp + '" y="' + yp + '" width="' + larg + '" height="' + Math.max(hp, 2)
                + '" fill="#e67e22" stroke="#d35400" stroke-dasharray="3,2" style="cursor:help" data-qtip="' + me.h(me.bulleExplication(o)) + '"></rect>'
                + etiquette(xp, yp - 3, me.dec(o.prevuMois), '#d35400')
                + '<text x="' + (xp - 4) + '" y="' + (hgt - 4) + '" font-size="10" fill="#d35400">prévu</text>';
        return '<svg width="' + l + '" height="' + hgt + '">' + svg + '</svg>';
    },

    /** Bulle de la barre orange : le calcul de la valeur prevue, etape par etape (chiffres du serveur). */
    bulleExplication: function (o) {
        var me = this, e = o.explication;
        if (!e) {
            return '<b>Prévu en ' + me.h(o.prochainMois) + ' : ' + me.h(me.dec(o.prevuMois)) + '</b><br>Le détail du calcul n\'a pas pu être refait pour ce produit.';
        }
        return '<b>Prévu en ' + me.h(o.prochainMois) + ' : ' + me.h(me.dec(e.valeur)) + '</b> — méthode ' + me.h(me.METHODES[e.methode] || e.methode)
                + '<table class="pv-bulle">' + (e.etapes || []).map(function (x) {
            return '<tr><td>' + me.h(x[0]) + '</td><td class="n"><b>' + me.h(x[1]) + '</b></td></tr>';
        }).join('') + '</table>';
    },

    couleurIndice: function (v) {
        if (!v) {
            return '#f4f6f8';
        }
        return v >= 1.3 ? '#a9dfbf' : v >= 1.05 ? '#d5f5e3' : v > 0.95 ? '#ffffff' : v > 0.7 ? '#fdebd0' : '#f5b7b1';
    },

    /** Tableau des unites vendues par mois (une ligne par annee) et de l'indice saisonnier du produit. */
    tableauSaison: function (o) {
        var me = this, annees = o.annees || [], indices = o.indices || [];
        if (!annees.length) {
            return '';
        }
        var html = '<table class="ac-table pv-saison"><tr><th>Année</th>' + me.MOIS_COURTS.map(function (m) {
            return '<th class="n">' + m + '</th>';
        }).join('') + '</tr>';
        annees.forEach(function (a) {
            html += '<tr class="pv-annee"><td><b>' + a.annee + '</b></td>' + a.mois.map(function (v) {
                return '<td class="n">' + (v === null || v === undefined ? '<span style="color:#bbb">·</span>' : v) + '</td>';
            }).join('') + '</tr>';
        });
        html += '<tr class="pv-indice"><td><b>Indice</b></td>' + indices.map(function (v) {
            return '<td class="n" style="background:' + me.couleurIndice(v) + '" data-qtip="Indice saisonnier : ventes moyennes de ce mois ÷ ventes'
                    + ' d\'un mois moyen. 1 = mois normal ; 1,5 = 50 % de plus que la moyenne ; 0,5 = moitié moins.">'
                    + String((v || 0).toFixed(2)).replace('.', ',') + '</td>';
        }).join('') + '</tr></table>';
        return html;
    },

    /** « En clair » : la quantite a commander en une phrase, avec les chiffres du tableau. */
    phraseQuantite: function (o) {
        var me = this, c = o.calcul || {}, stock = o.stock || 0, enCours = o.enCours || 0, eq = o.equivalents || 0;
        if (c.arrondi === undefined) {
            return '';
        }
        var brut = c.arrondi - Math.max(0, stock) - Math.max(0, enCours) - Math.max(0, eq), fin = Math.max(0, brut);
        var t = 'En clair : on prévoit de vendre <b>' + me.dec(c.besoin) + '</b> pendant le délai de livraison (' + c.delai
                + ' j) et la couverture voulue (' + c.couvertureVoulue + ' j), plus <b>' + me.dec(c.securite) + '</b> de sécurité, soit <b>'
                + c.arrondi + '</b> en arrondissant au-dessus ; moins le stock rayon et réserve <b>' + stock + '</b>, moins ce qui est déjà commandé <b>'
                + enCours + '</b>, moins les équivalents en stock <b>' + eq + '</b> : '
                + (brut > 0 ? 'à commander <b class="pv-a-commander">' + fin + '</b>.' : 'rien à commander, le stock suffit (<b class="pv-a-commander">0</b>).');
        if (fin !== o.recommande) {
            t += ' <span class="pv-ecart-calcul">La liste affiche ' + o.recommande + ', calculé avec d\'autres réglages ; « Recalculer maintenant » la met à jour.</span>';
        }
        return '<div class="ac-note pv-phrase">' + t + '</div>';
    },

    afficher: function (o) {
        var me = this, c = o.calcul || {}, mois = o.mois || [];
        var methodes = (o.methodes || []).map(function (m) {
            var aide = (me.AIDE_METHODES[m.methode] || '') + ' Erreur ' + me.dec(m.erreur) + ' % : en moyenne, cette méthode se trompait de '
                    + Math.round(m.erreur) + ' % sur les derniers mois connus (chaque mois prévu sans regarder la suite).'
                    + (m.retenue ? ' C\'est celle qui se trompe le moins : elle est retenue.' : '');
            return '<tr class="pv-methode" data-qtip="' + me.h(aide) + '"' + (m.retenue ? ' style="font-weight:700;background:#fef5e7"' : '') + '><td>'
                    + me.h(me.METHODES[m.methode] || m.methode) + (m.retenue ? ' ✓' : '') + '</td><td class="n">' + me.dec(m.erreur) + ' %</td></tr>';
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
                        'Besoin jusqu\'à la livraison puis pendant la couverture voulue : ' + me.dec(c.parJour) + ' × ' + (c.delai + c.couvertureVoulue)
                        + '. Couverture voulue : nombre de jours de vente que la commande doit couvrir après sa livraison, réglé dans Prévisions › Paramètres.')
                + ligne('pv-plus', '+ stock de sécurité (95 %)', me.dec(c.securite),
                        'Petite réserve en plus pour ne pas manquer si l\'on vend plus que prévu ou si la livraison tarde. Elle est plus grande pour un produit'
                        + ' dont les ventes varient beaucoup d\'un mois à l\'autre. Détail : 1,65 × écart-type mensuel des ventes (' + me.dec(c.ecartType)
                        + ') ÷ √30 × √délai.')
                + ligne('pv-moins', '− stock rayon et réserve' + stockDetail, o.stock, 'Stock de l\'emplacement : rayon + réserve')
                + ligne('pv-moins', '− commandes en cours', o.enCours, 'Quantités commandées et pas encore livrées (lues en direct)')
                + ligne('pv-moins', '− équivalents DCI directs en stock', o.equivalents, 'Stock rayon des produits de même DCI, dosage et forme')
                + '<tr class="pv-total"><td>= à commander (arrondi au-dessus, jamais négatif)</td><td class="n">' + o.recommande + '</td></tr></table>';
        var derniere = o.derniereVente ? me.h(o.derniereVente) + (o.derniereVenteQte ? ' — ' + o.derniereVenteQte + ' unité' + (o.derniereVenteQte > 1 ? 's' : '') : '') : 'jamais';
        var e = o.explication;
        var explication = '<div class="pv-explication" data-qtip="' + me.h(me.bulleExplication(o)) + '"><span class="pv-explication-t">Prévu en '
                + me.h(o.prochainMois) + ' :</span> ' + (e ? me.h(e.formule) : '<b>' + me.dec(o.prevuMois) + '</b> (détail du calcul après le prochain calcul des prévisions)')
                + ' <span class="pv-explication-aide">ⓘ détail</span></div>';
        var html = '<div class="ac-detail pv-detail">'
                + '<div class="ac-bloc-t">Ventes mensuelles (' + mois.length + ' derniers mois complets) et prévision de ' + me.h(o.prochainMois) + '</div>'
                + me.graphique(o) + explication
                + (o.annees && o.annees.length ? '<div class="ac-bloc-t">Unités vendues par mois et indice saisonnier</div>' + me.tableauSaison(o) : '')
                + '<div class="ac-colonnes"><div><div class="ac-bloc-t">Méthodes essayées (erreur sur les derniers mois connus)</div>'
                + '<table class="ac-table pv-methodes"><tr><th>Méthode</th><th class="n">Erreur</th></tr>' + methodes + '</table>'
                + '<div class="ac-note pv-fiabilite" data-qtip="' + me.h('Fiabilité = 100 − erreur de la méthode retenue. 70 % et plus : prévision sûre ; moins de 40 % : ventes irrégulières, à vérifier.')
                + '">Fiabilité retenue : ' + me.fiabilite(o.fiabilite) + '</div>'
                + '<div class="ac-note pv-derniere">Dernière vente : ' + derniere + '</div></div>'
                + '<div><div class="ac-bloc-t">Quantité recommandée : ' + o.recommande + '</div>' + calcul + me.phraseQuantite(o) + '</div></div></div>';
        var vue = Ext.getBody().getViewSize();
        return Ext.create('Ext.window.Window', {
            title: me.h(o.nom) + ' — ' + me.h(o.cip), itemId: 'fenPrevision', cls: 'pv-fenetre', width: Math.min(900, vue.width - 20),
            maxHeight: vue.height - 20, autoScroll: true, modal: true, bodyPadding: '8 12', html: html,
            buttons: [{text: 'Fermer', handler: function (b) {
                        b.up('window').close();
                    }}]
        }).show();
    }
});
