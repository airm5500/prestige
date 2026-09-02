/* global Ext, testextjs */

/*
 * Point 3 : chiffre d'affaires par zone geographique / famille d'articles, comparaison de periodes.
 * La reponse du serveur decrit les tranches (colonnes) ; le controleur reconstruit la grille et la
 * courbe a chaque recherche.
 */
Ext.define('testextjs.controller.CaZoneGeoCtr', {
    extend: 'Ext.app.Controller',
    views: ['testextjs.view.cazonegeo.CaZoneGeoManager'],

    // Nombre maximum de lignes tracees sur la courbe (les plus fortes), en plus du total.
    courbesMax: 8,

    refs: [
        {ref: 'ecran', selector: 'cazonegeomanager'},
        {ref: 'grille', selector: 'cazonegeomanager #grille'},
        {ref: 'panneauCourbe', selector: 'cazonegeomanager #panneauCourbe'},
        {ref: 'typePeriode', selector: 'cazonegeomanager #typePeriode'},
        {ref: 'dtStart', selector: 'cazonegeomanager #dtStart'},
        {ref: 'dtEnd', selector: 'cazonegeomanager #dtEnd'},
        {ref: 'zone', selector: 'cazonegeomanager #zone'},
        {ref: 'famille', selector: 'cazonegeomanager #famille'},
        {ref: 'regroupement', selector: 'cazonegeomanager #regroupement'},
        {ref: 'periodeTexte', selector: 'cazonegeomanager #periodeTexte'},
        {ref: 'totalTexte', selector: 'cazonegeomanager #totalTexte'},
        {ref: 'evolutionTexte', selector: 'cazonegeomanager #evolutionTexte'}
    ],

    init: function () {
        this.control({
            'cazonegeomanager': {
                afterrender: this.onAffichage
            },
            'cazonegeomanager #typePeriode': {
                select: this.onTypePeriode
            },
            'cazonegeomanager #btnRechercher': {
                click: this.rechercher
            },
            'cazonegeomanager #btnExcel': {
                click: this.exporterExcel
            },
            'cazonegeomanager #btnPdf': {
                click: this.imprimerPdf
            },
            'cazonegeomanager #zone': {
                select: this.rechercher
            },
            'cazonegeomanager #famille': {
                select: this.rechercher
            },
            'cazonegeomanager #regroupement': {
                select: this.rechercher
            }
        });
    },

    onAffichage: function () {
        this.rechercher();
    },

    onTypePeriode: function (combo) {
        const libre = combo.getValue() === 'LIBRE';
        this.getDtStart().setVisible(libre);
        this.getDtEnd().setVisible(libre);
        this.rechercher();
    },

    parametres: function () {
        const me = this;
        const p = {
            typePeriode: me.getTypePeriode().getValue(),
            regroupement: me.getRegroupement().getValue(),
            zoneId: me.getZone().getValue() || '',
            familleId: me.getFamille().getValue() || ''
        };
        if (p.typePeriode === 'LIBRE') {
            p.dtStart = me.getDtStart().getSubmitValue();
            p.dtEnd = me.getDtEnd().getSubmitValue();
        }
        return p;
    },

    rechercher: function () {
        const me = this;
        const ecran = me.getEcran();
        if (!ecran) {
            return;
        }
        ecran.setLoading('Calcul en cours...');
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ca-zone-geo',
            params: me.parametres(),
            timeout: 600000,
            callback: function (opts, success, response) {
                ecran.setLoading(false);
                let json = {};
                try {
                    json = Ext.decode(response.responseText);
                } catch (e) {
                }
                if (!success || !json.success) {
                    Ext.Msg.alert('Message', json.msg || 'Le calcul du chiffre d\'affaires a échoué');
                    return;
                }
                me.derniereReponse = json;
                me.construireGrille(json);
                me.construireCourbe(json);
                me.afficherTotaux(json);
            }
        });
    },

    formatMontant: function (v) {
        return Ext.util.Format.number(v || 0, '0,000');
    },

    /** Evolution en petit sous le montant : « +12,5 % » vert, « -3,0 % » rouge, « - » quand la tranche precedente est a zero. */
    formatEvolutionPetite: function (v) {
        if (v === null || v === undefined || v === '') {
            return '<div style="font-size:10px;color:#999;">-</div>';
        }
        const couleur = v > 0 ? '#1e7e34' : (v < 0 ? '#c0392b' : '#333');
        return '<div style="font-size:10px;color:' + couleur + ';">' + (v > 0 ? '+' : '')
                + Ext.util.Format.number(v, '0.0') + ' %</div>';
    },

    formatEvolution: function (v) {
        if (v === null || v === undefined || v === '') {
            return '<span style="color:#999;">-</span>';
        }
        const couleur = v > 0 ? '#1e7e34' : (v < 0 ? '#c0392b' : '#333');
        return '<span style="color:' + couleur + ';font-weight:bold;">' + (v > 0 ? '+' : '')
                + Ext.util.Format.number(v, '0.0') + ' %</span>';
    },

    construireGrille: function (json) {
        const me = this;
        const regroupement = json.data && me.getRegroupement().getValue();
        const champs = ['zoneId', 'zone', 'familleId', 'famille', 'libelle', {name: 'total', type: 'number'},
            {name: 'evolution', type: 'auto'}];
        const colonnes = [];
        if (regroupement !== 'FAMILLE') {
            colonnes.push({text: 'Zone géographique', dataIndex: 'zone', flex: 1.2, minWidth: 140,
                summaryRenderer: function () {
                    return '<b>TOTAL</b>';
                }});
        }
        if (regroupement !== 'ZONE') {
            colonnes.push({text: 'Famille d\'articles', dataIndex: 'famille', flex: 1.2, minWidth: 140,
                summaryRenderer: regroupement === 'FAMILLE' ? function () {
                    return '<b>TOTAL</b>';
                } : undefined});
        }
        (json.tranches || []).forEach(function (t, indice) {
            champs.push({name: 't_' + t.cle, type: 'number'});
            champs.push({name: 'e_' + t.cle, type: 'auto'});
            colonnes.push({
                text: t.libelle,
                dataIndex: 't_' + t.cle,
                align: 'right',
                // Largeur selon le libelle : « 09/2026 » tient en 95 px, « S36 (31/08-06/09) » en 130 px.
                width: Math.max(105, 16 + 7 * t.libelle.length),
                // Montant, et dessous l'evolution par rapport a la tranche precedente (de tel mois a tel mois)
                renderer: function (v, meta, rec) {
                    return me.formatMontant(v) + (indice > 0 ? me.formatEvolutionPetite(rec.get('e_' + t.cle)) : '');
                },
                summaryType: 'sum',
                summaryRenderer: function (v) {
                    return '<b>' + me.formatMontant(v) + '</b>'
                            + (indice > 0 ? me.formatEvolutionPetite((json.evolutionsTranches || {})[t.cle]) : '');
                }
            });
        });
        colonnes.push({
            text: 'Total',
            dataIndex: 'total',
            align: 'right',
            width: 115,
            renderer: function (v) {
                return '<b>' + me.formatMontant(v) + '</b>';
            },
            summaryType: 'sum',
            summaryRenderer: function (v) {
                return '<b>' + me.formatMontant(v) + '</b>';
            }
        });
        colonnes.push({
            text: 'Évolution<br/><span style="font-weight:normal;font-size:10px;">1re → dernière tranche</span>',
            dataIndex: 'evolution',
            align: 'right',
            width: 95,
            renderer: me.formatEvolution,
            summaryRenderer: function () {
                return me.formatEvolution(json.evolutionGenerale);
            }
        });
        const store = Ext.create('Ext.data.Store', {fields: champs, data: json.data || []});
        me.getGrille().reconfigure(store, colonnes);
    },

    construireCourbe: function (json) {
        const me = this;
        const panneau = me.getPanneauCourbe();
        const tranches = json.tranches || [];
        const lignes = (json.data || []).slice(0, me.courbesMax);
        panneau.removeAll(true);
        panneau.update('');
        if (!tranches.length) {
            panneau.update('<div style="margin:20px;color:#666;">Aucune vente sur la période.</div>');
            return;
        }
        // Store transpose : une ligne par tranche, un champ par serie (les plus fortes) plus le total.
        const series = lignes.map(function (l, i) {
            return {champ: 's' + i, titre: l.libelle};
        });
        series.push({champ: 'sTotal', titre: 'TOTAL'});
        const champs = ['periode'].concat(series.map(function (s) {
            return {name: s.champ, type: 'number'};
        }));
        const donnees = tranches.map(function (t) {
            const ligne = {periode: t.libelle};
            lignes.forEach(function (l, i) {
                ligne['s' + i] = l['t_' + t.cle] || 0;
            });
            ligne.sTotal = (json.totauxTranches || {})[t.cle] || 0;
            return ligne;
        });
        const store = Ext.create('Ext.data.Store', {fields: champs, data: donnees});
        const chart = Ext.create('Ext.chart.Chart', {
            itemId: 'courbe',
            style: 'background:#fff',
            animate: true,
            insetPadding: 30,
            store: store,
            legend: {position: 'bottom'},
            axes: [{
                    type: 'Numeric',
                    position: 'left',
                    minimum: 0,
                    grid: true,
                    fields: series.map(function (s) {
                        return s.champ;
                    }),
                    title: 'Chiffre d\'affaires',
                    label: {renderer: Ext.util.Format.numberRenderer('0,0')}
                }, {
                    type: 'Category',
                    position: 'bottom',
                    fields: ['periode'],
                    title: false
                }],
            series: series.map(function (s) {
                return {
                    type: 'line',
                    axis: 'left',
                    xField: 'periode',
                    yField: s.champ,
                    title: s.titre,
                    highlight: {size: 6, radius: 6},
                    smooth: false,
                    markerConfig: {type: 'circle', size: 4, radius: 4, 'stroke-width': 0},
                    style: s.champ === 'sTotal' ? {'stroke-width': 3, 'stroke-dasharray': 6} : {'stroke-width': 2},
                    tips: {
                        trackMouse: true,
                        width: 320,
                        height: 34,
                        renderer: function (storeItem) {
                            this.setTitle(s.titre + ' - ' + storeItem.get('periode') + ' : '
                                    + me.formatMontant(storeItem.get(s.champ)));
                        }
                    }
                };
            })
        });
        panneau.add(chart);
    },

    afficherTotaux: function (json) {
        const me = this;
        const fr = function (iso) {
            return iso ? Ext.Date.format(Ext.Date.parse(iso, 'Y-m-d'), 'd/m/Y') : '';
        };
        const nb = (json.tranches || []).length;
        me.getPeriodeTexte().setValue('du ' + fr(json.debut) + ' au ' + fr(json.fin) + ' (' + nb + ' tranche'
                + (nb > 1 ? 's' : '') + ')');
        me.getTotalTexte().setValue(me.formatMontant(json.totalGeneral));
        me.getEvolutionTexte().setValue(me.formatEvolution(json.evolutionGenerale));
    },

    exporterExcel: function () {
        window.open('../api/v1/ca-zone-geo/excel?' + Ext.Object.toQueryString(this.parametres()));
    },

    // Meme methode que les autres editions : le serveur produit le PDF et renvoie son URL, ouverte
    // dans un nouvel onglet.
    imprimerPdf: function () {
        const me = this;
        // L'onglet est ouvert DANS le clic : ouvert plus tard, a l'arrivee de la reponse, le
        // navigateur le prend pour une fenetre surgissante et le bloque des que l'edition dure.
        // Il affiche « Édition en cours... » puis recoit le PDF ; il se ferme si l'edition echoue.
        const onglet = window.PrestigeEditions.ouvrirOnglet();
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ca-zone-geo/pdf',
            params: me.parametres(),
            timeout: 600000,
            callback: function (opts, success, response) {
                let json = {};
                try {
                    json = Ext.decode(response.responseText);
                } catch (e) {
                }
                if (success && json.success && json.msg) {
                    window.PrestigeEditions.afficher(onglet, '..' + json.msg);
                } else {
                    window.PrestigeEditions.fermer(onglet);
                    Ext.Msg.alert('Message', json.msg || 'L\'édition a échoué');
                }
            }
        });
    }
});
