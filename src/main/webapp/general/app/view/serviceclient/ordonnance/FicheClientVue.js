/* global Ext */

/*
 * FICHE CLIENT, 2e onglet des ordonnances (retour du 30/09).
 *
 * On choisit un client (nom ou telephone) et on voit son dossier : identite, terrains et allergies (liste
 * parametrable + texte libre), parametres suivis (glycemie, tension, poids...) avec la derniere valeur analysee selon
 * les normes de son age, la courbe d'evolution de chacun, ses mesures, son IMC, et son suivi de consommation.
 *
 * Composant AUTONOME : il parle directement aux services v1/ordonnance-client/... et ne depend pas du controleur des
 * ordonnances (qui n'est pas modifie pour lui). La saisie suit le droit d'ecriture des ordonnances, lu sur l'ecran.
 */
Ext.define('testextjs.view.serviceclient.ordonnance.FicheClientVue', {
    extend: 'Ext.panel.Panel',
    xtype: 'ordofichesclient',
    requires: ['testextjs.view.serviceclient.ordonnance.ChampDateNaissance'],
    itemId: 'vueFicheClient',
    title: 'Fiche client',
    border: false,
    cls: 'fc',
    autoScroll: true,
    bodyPadding: '8 8 12 8',
    layout: {type: 'vbox', align: 'stretch'},
    /** Client affiche, parametre choisi pour la courbe. */
    clientId: null,
    parametreId: null,

    initComponent: function () {
        var me = this;
        var ecran = me.ecran;
        /* Sa propre liste de clients : deux listes deroulantes ne partagent pas un store (meme service de recherche). */
        me.storeClientsFiche = Ext.create('Ext.data.Store', {
            model: ecran.storeClients.model,
            pageSize: 30,
            autoLoad: false,
            proxy: {type: 'ajax', url: '../api/v1/ordonnance-client/clients',
                reader: {type: 'json', root: 'data', totalProperty: 'total'}}
        });
        me.items = [{
                xtype: 'container',
                cls: 'ordo-criteres',
                padding: '10 12',
                margin: '0 0 10 0',
                layout: {type: 'hbox', align: 'bottom'},
                items: [{
                        xtype: 'combobox',
                        itemId: 'fcClient',
                        fieldLabel: 'Client (nom ou téléphone)',
                        labelAlign: 'top',
                        labelSeparator: '',
                        width: 520,
                        store: me.storeClientsFiche,
                        displayField: 'nomComplet',
                        valueField: 'lgCLIENTID',
                        queryParam: 'query',
                        minChars: 2,
                        typeAhead: false,
                        emptyText: 'Chercher le client',
                        listConfig: ecran.listeClients()
                    }, {
                        xtype: 'component', itemId: 'fcMessage', flex: 1, margin: '0 0 6 14', html: ''
                    }]
            }, {
                xtype: 'component',
                itemId: 'fcVide',
                html: '<div class="fc-vide">Choisissez un client pour voir son dossier : terrains, allergies,'
                        + ' paramètres suivis et leur évolution, consommation.</div>'
            }, {
                xtype: 'container',
                itemId: 'fcCorps',
                hidden: true,
                layout: {type: 'hbox', align: 'stretch'},
                items: [{
                        /* Colonne de gauche : identite, terrains et allergies. */
                        xtype: 'container',
                        width: 400,
                        margin: '0 10 0 0',
                        layout: {type: 'vbox', align: 'stretch'},
                        items: [{
                                xtype: 'component', itemId: 'fcIdentite', cls: 'fc-carte', html: ''
                            }, {
                                xtype: 'panel',
                                itemId: 'fcTerrains',
                                title: 'Terrains et allergies',
                                cls: 'ordo-carte',
                                margin: '10 0 0 0',
                                bodyPadding: '10 12',
                                layout: {type: 'vbox', align: 'stretch'},
                                items: [{
                                        xtype: 'component', itemId: 'fcPuces', html: ''
                                    }, {
                                        xtype: 'textareafield',
                                        itemId: 'fcAllergies',
                                        fieldLabel: 'Allergies (texte libre)',
                                        labelAlign: 'top',
                                        labelSeparator: '',
                                        margin: '10 0 0 0',
                                        height: 70,
                                        maxLength: 2000,
                                        emptyText: 'ex. allergie à l\'iode, intolérance au lactose…'
                                    }, {
                                        xtype: 'container',
                                        layout: {type: 'hbox', pack: 'end'},
                                        items: [{
                                                xtype: 'button', itemId: 'fcEnregistrerDossier',
                                                text: 'Enregistrer le dossier', cls: 'ordo-btn-primaire',
                                                icon: 'resources/images/icons/fam/accept.png'
                                            }]
                                    }]
                            }]
                    }, {
                        /* Colonne de droite : parametres suivis, courbe, mesures, consommation. */
                        xtype: 'container',
                        flex: 1,
                        layout: {type: 'vbox', align: 'stretch'},
                        items: [{
                                xtype: 'component', itemId: 'fcTuiles', html: ''
                            }, {
                                xtype: 'panel',
                                itemId: 'fcSuivi',
                                title: 'Évolution',
                                cls: 'ordo-carte',
                                margin: '10 0 0 0',
                                bodyPadding: '10 12',
                                layout: {type: 'vbox', align: 'stretch'},
                                items: [{
                                        /* La courbe s'ouvre desormais dans une fenetre, depuis le bouton de chaque tuile
                                           (retour du 05/10, pour gagner de la place) : elle est dessinee ici, cachee,
                                           puis reprise dans la fenetre. */
                                        xtype: 'component', itemId: 'fcCourbe', html: '', hidden: true
                                    }, {
                                        /* Nouvelle mesure : les champs suivent le genre du parametre choisi. */
                                        xtype: 'container',
                                        itemId: 'fcSaisie',
                                        cls: 'fc-saisie',
                                        margin: '10 0 0 0',
                                        layout: {type: 'hbox', align: 'bottom'},
                                        defaults: {labelAlign: 'top', labelSeparator: '', margin: '0 8 0 0'},
                                        items: [{
                                                xtype: 'datefield', itemId: 'fcDate', fieldLabel: 'Date', width: 120,
                                                format: 'd/m/Y', maxValue: new Date(), value: new Date()
                                            }, {
                                                xtype: 'numberfield', itemId: 'fcValeur', fieldLabel: 'Valeur',
                                                width: 110, hideTrigger: true, decimalSeparator: ','
                                            }, {
                                                xtype: 'container', itemId: 'fcTension', hidden: true,
                                                layout: {type: 'hbox', align: 'bottom'},
                                                defaults: {labelAlign: 'top', labelSeparator: '', width: 74,
                                                    hideTrigger: true, allowDecimals: false, margin: '0 4 0 0'},
                                                items: [
                                                    {xtype: 'numberfield', itemId: 'fcGSys', fieldLabel: 'Gauche sys.'},
                                                    {xtype: 'numberfield', itemId: 'fcGDia', fieldLabel: 'dia.',
                                                        margin: '0 12 0 0'},
                                                    {xtype: 'numberfield', itemId: 'fcDSys', fieldLabel: 'Droit sys.'},
                                                    {xtype: 'numberfield', itemId: 'fcDDia', fieldLabel: 'dia.'}
                                                ]
                                            }, {
                                                xtype: 'textfield', itemId: 'fcCommentaire', fieldLabel: 'Commentaire',
                                                flex: 1, maxLength: 200, emptyText: 'ex. à jeun, après effort…'
                                            }, {
                                                xtype: 'button', itemId: 'fcAjouter', text: 'Enregistrer la mesure',
                                                cls: 'ordo-btn-primaire', icon: 'resources/images/icons/fam/add.png',
                                                margin: 0
                                            }]
                                    }, {
                                        xtype: 'component', itemId: 'fcMesures', margin: '10 0 0 0', html: ''
                                    }]
                            }, {
                                xtype: 'panel',
                                itemId: 'fcConso',
                                title: 'Suivi de consommation et habitudes (12 mois)',
                                cls: 'ordo-carte',
                                margin: '10 0 0 0',
                                bodyPadding: '6 12 10 12',
                                items: [{xtype: 'component', itemId: 'fcConsoCorps', html: ''}]
                            }]
                    }]
            }];
        me.callParent(arguments);
        me.on('afterrender', function () {
            var el = me.getEl();
            el.on('click', me.surClic, me, {delegate: '[data-fc]'});
        });
        me.on('activate', function () {
            me.majDroits();
            if (!me.parametres) {
                me.chargerReferentiels();
            }
        });
    },

    /* Les ecouteurs des champs sont poses apres le rendu (le controleur des ordonnances n'est pas sollicite). */
    afterRender: function () {
        var me = this;
        me.callParent(arguments);
        me.down('#fcClient').on('select', function (c, l) {
            if (l && l.length) {
                me.ouvrir(l[0].get('lgCLIENTID'));
            }
        });
        me.down('#fcEnregistrerDossier').on('click', me.enregistrerDossier, me);
        me.down('#fcAjouter').on('click', me.ajouterMesure, me);
        Ext.each(me.query('#fcSaisie field'), function (f) {
            f.on('specialkey', function (champ, e) {
                if (e.getKey() === e.ENTER) {
                    me.ajouterMesure();
                }
            });
        });
    },

    peutEcrire: function () {
        return !!(this.ecran && this.ecran.peutEcrire);
    },

    majDroits: function () {
        var ecrire = this.peutEcrire();
        this.down('#fcSaisie').setVisible(ecrire && !!this.parametreId);
        this.down('#fcEnregistrerDossier').setVisible(ecrire);
        this.down('#fcAllergies').setReadOnly(!ecrire);
    },

    dire: function (texte, erreur) {
        this.down('#fcMessage').update(texte ? '<span class="' + (erreur ? 'ordo-scan-erreur' : 'fc-ok') + '">'
                + Ext.String.htmlEncode(texte) + '</span>' : '');
    },

    /** Parametres actifs et terrains / allergies de la liste parametrable. */
    chargerReferentiels: function (rappel) {
        var me = this;
        var fait = 0;
        var fin = function () {
            fait++;
            if (fait === 2 && rappel) {
                rappel();
            }
        };
        Ext.Ajax.request({method: 'GET', url: '../api/v1/ordonnance-client/parametres', success: function (r) {
                me.parametres = (Ext.decode(r.responseText, true) || {}).data || [];
                fin();
            }, failure: fin});
        Ext.Ajax.request({method: 'GET', url: '../api/v1/ordonnance-client/terrains', success: function (r) {
                me.terrains = (Ext.decode(r.responseText, true) || {}).data || [];
                fin();
            }, failure: fin});
    },

    /** Ouvre le dossier d'un client (depuis la liste, ou d'un autre ecran). */
    ouvrir: function (clientId) {
        var me = this;
        me.clientId = clientId;
        me.dire('');
        var suite = function () {
            Ext.Ajax.request({
                method: 'GET',
                url: '../api/v1/ordonnance-client/client/' + encodeURIComponent(clientId) + '/dossier',
                success: function (reponse) {
                    var r = Ext.decode(reponse.responseText, true) || {};
                    if (me.clientId !== clientId) {
                        return;
                    }
                    if (r.success !== true) {
                        me.dire(r.message || 'Le dossier n\'a pas pu être lu.', true);
                        return;
                    }
                    me.dossier = r;
                    me.down('#fcVide').hide();
                    me.down('#fcCorps').show();
                    me.afficherIdentite(r);
                    me.afficherTerrains(r);
                    me.afficherTuiles(r);
                    if (!me.parametreId || !Ext.Array.some(r.parametres || [], function (p) {
                        return p.parametreId === me.parametreId;
                    })) {
                        var premier = Ext.Array.findBy(r.parametres || [], function (p) {
                            return p.nbMesures > 0;
                        }) || (r.parametres || [])[0];
                        me.parametreId = premier ? premier.parametreId : null;
                    }
                    me.choisirParametre(me.parametreId);
                    me.chargerConso();
                    me.majDroits();
                }
            });
        };
        if (me.parametres && me.terrains) {
            suite();
        } else {
            me.chargerReferentiels(suite);
        }
    },

    afficherIdentite: function (r) {
        var c = r.client || {};
        var enc = Ext.String.htmlEncode;
        var age = c.age === null || c.age === undefined ? '' : c.age + ' ans';
        var naissance = c.naissance ? Ext.Date.format(Ext.Date.parse(c.naissance, 'Y-m-d'), 'd/m/Y') : '';
        var ligne = function (l, v) {
            return v ? '<div class="fc-ligne"><span>' + l + '</span><b>' + enc(String(v)) + '</b></div>' : '';
        };
        this.down('#fcIdentite').update('<div class="fc-nom">' + enc((c.nom || '') + ' ' + (c.prenoms || '')) + '</div>'
                + '<div class="fc-sous">' + (c.type ? '<span class="ordo-client-type ordo-client-type-' + enc(c.typeId || '')
                        + '">' + enc(c.type) + '</span> ' : '') + enc(c.telephone || '') + '</div>'
                + ligne('Né(e) le', naissance ? naissance + (age ? ' · ' + age : '') : '')
                + (naissance ? '' : ligne('Âge', age ? age + ' (d\'après ses ordonnances)' : ''))
                + ligne('Sexe', c.sexe === 'F' ? 'Féminin' : (c.sexe === 'M' ? 'Masculin' : ''))
                + ligne('Ordonnances', r.nbOrdonnances || '0'));
    },

    /** Puces des terrains et allergies : cochees = celles du dossier ; un clic bascule (si on peut ecrire). */
    afficherTerrains: function (r) {
        var me = this;
        var dossier = r ? r.terrains || [] : me.terrainsCoches || [];
        me.terrainsCoches = dossier.slice();
        var enc = Ext.String.htmlEncode;
        var bloc = function (categorie, titre) {
            var puces = Ext.Array.map(Ext.Array.filter(me.terrains || [], function (t) {
                return (t.categorie || 'terrain') === categorie;
            }), function (t) {
                var on = Ext.Array.contains(me.terrainsCoches, t.id);
                return '<button type="button" class="fc-puce' + (on ? ' fc-puce-on fc-puce-' + categorie : '') + '"'
                        + ' data-fc="terrain" data-id="' + enc(t.id) + '">' + enc(t.libelle) + '</button>';
            });
            return '<div class="ordo-lib">' + titre + '</div><div class="fc-puces">' + (puces.join('')
                    || '<span class="ordo-aide">Aucun dans la liste.</span>') + '</div>';
        };
        me.down('#fcPuces').update(bloc('terrain', 'Terrains') + '<div style="height:8px"></div>'
                + bloc('allergie', 'Allergies'));
        if (r) {
            me.down('#fcAllergies').setValue(r.allergies || '');
        }
    },

    /** Une tuile par parametre : derniere valeur, analyse selon la norme, date ; plus l'IMC. */
    afficherTuiles: function (r) {
        var me = this;
        var enc = Ext.String.htmlEncode;
        var html = Ext.Array.map(r.parametres || [], function (p) {
            var valeur = '—';
            if (p.valeur !== undefined) {
                valeur = me.format(p.valeur, p.decimales) + (p.genre === 'tension' && p.valeur2 !== null
                        ? ' / ' + me.format(p.valeur2, 0) : '');
            }
            var date = p.date ? Ext.Date.format(Ext.Date.parse(p.date, 'Y-m-d\\TH:i'), 'd/m/Y') : '';
            return '<button type="button" class="fc-tuile' + (p.parametreId === me.parametreId ? ' fc-tuile-active' : '')
                    + '" data-fc="parametre" data-id="' + enc(p.parametreId) + '">'
                    + '<span class="fc-tuile-libelle">' + enc(p.libelle) + '</span>'
                    + '<span class="fc-tuile-valeur">' + valeur + ' <small>' + enc(p.valeur !== undefined ? p.unite : '')
                    + (p.cote ? ' · bras ' + (p.cote === 'G' ? 'gauche' : 'droit') : '') + '</small></span>'
                    + '<span class="fc-tuile-pied">' + me.analyseTuile(p, r.imc)
                    + '<span>' + date + '</span></span>'
                    + (p.nbMesures ? '<span class="fc-tuile-courbe" role="button" tabindex="0" data-fc="courbe" data-id="'
                            + enc(p.parametreId) + '" title="Voir la courbe">Courbe</span>' : '')
                    + '</button>';
        });
        if (r.imc) {
            html.push('<div class="fc-tuile fc-tuile-calcul"><span class="fc-tuile-libelle">IMC (calculé)</span>'
                    + '<span class="fc-tuile-valeur">' + me.format(r.imc.valeur, 1) + ' <small>kg/m²</small></span>'
                    + '<span class="fc-tuile-pied"><span class="fc-etat fc-etat-' + r.imc.etat + '">'
                    + enc(r.imc.analyse) + '</span></span></div>');
        }
        me.down('#fcTuiles').update('<div class="fc-tuiles">' + html.join('') + '</div>');
    },

    /**
     * Pied d'une tuile : l'analyse selon la norme. Le poids et la taille n'ont pas de norme propre : c'est l'IMC qui
     * les juge (30/09) ; leur tuile renvoie donc a l'IMC, ou dit ce qui manque pour le calculer.
     */
    analyseTuile: function (p, imc) {
        var enc = Ext.String.htmlEncode;
        if (!p.etat) {
            return '<span class="ordo-aide">aucune mesure</span>';
        }
        if ((p.code === 'POIDS' || p.code === 'TAILLE') && p.etat === 'inconnu') {
            if (imc) {
                return '<span class="fc-etat fc-etat-' + imc.etat + '" title="Poids et taille sont jugés par l\'IMC">'
                        + 'IMC ' + this.format(imc.valeur, 1) + ' · ' + enc(imc.analyse) + '</span>';
            }
            return '<span class="ordo-aide">IMC : saisir ' + (p.code === 'POIDS' ? 'la taille' : 'le poids') + '</span>';
        }
        return '<span class="fc-etat fc-etat-' + p.etat + '">' + enc(p.analyse) + '</span>';
    },

    format: function (v, decimales) {
        if (v === null || v === undefined) {
            return '';
        }
        return Ext.util.Format.number(v, decimales > 0 ? '0.' + Ext.String.repeat('0', decimales) : '0')
                .replace('.', ',');
    },

    surClic: function (e, cible) {
        var me = this;
        var action = cible.getAttribute('data-fc');
        e.preventDefault();
        if (action === 'courbe') {
            e.stopEvent();
            me.ouvrirCourbe(cible.getAttribute('data-id'));
        } else if (action === 'parametre') {
            me.choisirParametre(cible.getAttribute('data-id'));
        } else if (action === 'terrain') {
            if (!me.peutEcrire()) {
                return;
            }
            var id = cible.getAttribute('data-id');
            if (Ext.Array.contains(me.terrainsCoches, id)) {
                Ext.Array.remove(me.terrainsCoches, id);
            } else {
                me.terrainsCoches.push(id);
            }
            me.afficherTerrains(null);
            me.dire('Dossier modifié : pensez à « Enregistrer le dossier ».');
        } else if (action === 'retirer') {
            me.retirerMesure(cible.getAttribute('data-id'));
        }
    },

    enregistrerDossier: function () {
        var me = this;
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/ordonnance-client/client/' + encodeURIComponent(me.clientId) + '/dossier',
            jsonData: {terrains: me.terrainsCoches || [], allergies: me.down('#fcAllergies').getValue() || ''},
            success: function (reponse) {
                var r = Ext.decode(reponse.responseText, true) || {};
                me.dire(r.message || 'Le dossier n\'a pas pu être enregistré.', r.success !== true);
            }
        });
    },

    parametre: function (id) {
        return Ext.Array.findBy(this.parametres || [], function (p) {
            return p.id === id;
        });
    },

    /** Le parametre choisi : sa courbe, ses mesures, et les champs de saisie qui lui correspondent. */
    choisirParametre: function (id, ensuite) {
        var me = this;
        me.parametreId = id;
        if (me.dossier) {
            me.afficherTuiles(me.dossier);
        }
        var p = me.parametre(id);
        me.down('#fcSuivi').setTitle('Évolution' + (p ? ' · ' + Ext.String.htmlEncode(p.libelle)
                + (p.unite ? ' (' + Ext.String.htmlEncode(p.unite) + ')' : '') : ''));
        var tension = !!(p && p.genre === 'tension');
        me.down('#fcValeur').setVisible(!tension);
        me.down('#fcTension').setVisible(tension);
        if (p) {
            me.down('#fcValeur').decimalPrecision = p.decimales || 0;
            me.down('#fcValeur').allowDecimals = (p.decimales || 0) > 0;
        }
        me.majDroits();
        if (!id || !me.clientId) {
            me.down('#fcCourbe').update('');
            me.down('#fcMesures').update('');
            return;
        }
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ordonnance-client/client/' + encodeURIComponent(me.clientId) + '/mesures',
            params: {parametreId: id},
            success: function (reponse) {
                var r = Ext.decode(reponse.responseText, true) || {};
                if (me.parametreId === id) {
                    me.mesures = r.data || [];
                    me.dessinerCourbe(p, me.mesures, r.norme);
                    me.afficherMesures(p, me.mesures);
                    if (ensuite) {
                        ensuite();
                    }
                }
            }
        });
    },

    /** La courbe d'un parametre dans une fenetre (retour du 05/10) : le parametre est choisi, puis sa courbe reprise. */
    ouvrirCourbe: function (id) {
        var me = this;
        me.choisirParametre(id, function () {
            var p = me.parametre(id);
            var deja = Ext.ComponentQuery.query('window[cls~=fc-fenetre-courbe]')[0];
            if (deja) {
                deja.destroy();
            }
            Ext.create('Ext.window.Window', {
                title: 'Évolution' + (p ? ' · ' + Ext.String.htmlEncode(p.libelle) + (p.unite ? ' (' + Ext.String.htmlEncode(p.unite)
                        + ')' : '') : ''),
                cls: 'fc-fenetre-courbe',
                modal: true,
                width: Math.min(900, Ext.getBody().getViewSize().width - 60),
                bodyPadding: '12 16',
                closeAction: 'destroy',
                html: '<div class="fc-courbe-fenetre">' + me.down('#fcCourbe').getEl().dom.innerHTML + '</div>'
            }).show();
        });
    },

    /**
     * Courbe d'evolution en SVG : la bande des valeurs normales (pour l'age du client) en fond, les points colores
     * selon l'analyse. Tension : systolique et diastolique, bras gauche (ronds) et droit (carres).
     */
    dessinerCourbe: function (p, mesures, norme) {
        var me = this;
        var zone = me.down('#fcCourbe');
        if (!mesures.length) {
            zone.update('<div class="fc-vide-petit">Aucune mesure pour ce paramètre.'
                    + (me.peutEcrire() ? ' Saisissez la première ci-dessous.' : '') + '</div>');
            return;
        }
        var L = 760, H = 220, g = 46, d = 16, h = 14, b = 30;
        var tension = p && p.genre === 'tension';
        var temps = Ext.Array.map(mesures, function (m) {
            return Ext.Date.parse(m.date, 'Y-m-d\\TH:i').getTime();
        });
        var valeurs = [];
        Ext.each(mesures, function (m) {
            valeurs.push(m.valeur);
            if (tension && m.valeur2 !== null) {
                valeurs.push(m.valeur2);
            }
        });
        if (norme) {
            Ext.each(['bas', 'haut', 'bas2', 'haut2'], function (k) {
                if (norme[k] !== null && norme[k] !== undefined) {
                    valeurs.push(norme[k]);
                }
            });
        }
        var vmin = Math.min.apply(null, valeurs), vmax = Math.max.apply(null, valeurs);
        var marge = (vmax - vmin) * 0.12 || Math.abs(vmax) * 0.1 || 1;
        vmin -= marge;
        vmax += marge;
        var tmin = Math.min.apply(null, temps), tmax = Math.max.apply(null, temps);
        if (tmax === tmin) {
            tmin -= 86400000;
            tmax += 86400000;
        }
        var x = function (t) {
            return g + (t - tmin) / (tmax - tmin) * (L - g - d);
        };
        var y = function (v) {
            return h + (1 - (v - vmin) / (vmax - vmin)) * (H - h - b);
        };
        var svg = [];
        var bande = function (bas, haut, cls) {
            if (bas === null || bas === undefined || haut === null || haut === undefined) {
                return;
            }
            svg.push('<rect class="' + cls + '" x="' + g + '" y="' + y(haut).toFixed(1) + '" width="' + (L - g - d)
                    + '" height="' + (y(bas) - y(haut)).toFixed(1) + '"></rect>');
        };
        if (norme) {
            bande(norme.bas, norme.haut, 'fc-bande');
            if (tension) {
                bande(norme.bas2, norme.haut2, 'fc-bande fc-bande2');
            }
        }
        /* Graduations : 4 lignes de valeurs, dates de debut et de fin. */
        for (var i = 0; i <= 4; i++) {
            var v = vmin + (vmax - vmin) * i / 4;
            var yy = y(v).toFixed(1);
            svg.push('<line class="fc-grille" x1="' + g + '" x2="' + (L - d) + '" y1="' + yy + '" y2="' + yy + '"></line>'
                    + '<text class="fc-axe" x="' + (g - 6) + '" y="' + yy + '" text-anchor="end" dy="4">'
                    + me.format(v, p && p.decimales ? p.decimales : 0) + '</text>');
        }
        svg.push('<text class="fc-axe" x="' + g + '" y="' + (H - 8) + '">' + Ext.Date.format(new Date(tmin), 'd/m/Y')
                + '</text><text class="fc-axe" x="' + (L - d) + '" y="' + (H - 8) + '" text-anchor="end">'
                + Ext.Date.format(new Date(tmax), 'd/m/Y') + '</text>');
        var serie = function (filtre, lire, cls, carre) {
            var pts = [];
            Ext.each(mesures, function (m, idx) {
                if (filtre(m) && lire(m) !== null && lire(m) !== undefined) {
                    pts.push({x: x(temps[idx]), y: y(lire(m)), m: m, v: lire(m)});
                }
            });
            if (pts.length > 1) {
                svg.push('<polyline class="fc-ligne-courbe ' + cls + '" points="' + Ext.Array.map(pts, function (q) {
                    return q.x.toFixed(1) + ',' + q.y.toFixed(1);
                }).join(' ') + '"></polyline>');
            }
            Ext.each(pts, function (q) {
                var titre = Ext.Date.format(Ext.Date.parse(q.m.date, 'Y-m-d\\TH:i'), 'd/m/Y H:i') + ' : '
                        + me.format(q.v, p && p.decimales ? p.decimales : 0) + (q.m.analyse ? ' — ' + q.m.analyse : '');
                svg.push(carre ? '<rect class="fc-point fc-point-' + q.m.etat + '" x="' + (q.x - 4).toFixed(1) + '" y="'
                        + (q.y - 4).toFixed(1) + '" width="8" height="8"><title>' + Ext.String.htmlEncode(titre)
                        + '</title></rect>'
                        : '<circle class="fc-point fc-point-' + q.m.etat + '" cx="' + q.x.toFixed(1) + '" cy="'
                        + q.y.toFixed(1) + '" r="4.5"><title>' + Ext.String.htmlEncode(titre) + '</title></circle>');
            });
        };
        var legende = '';
        if (tension) {
            var cote = function (c) {
                return function (m) {
                    return (m.cote || 'G') === c;
                };
            };
            serie(cote('G'), function (m) {
                return m.valeur;
            }, 'fc-sys', false);
            serie(cote('G'), function (m) {
                return m.valeur2;
            }, 'fc-dia', false);
            serie(cote('D'), function (m) {
                return m.valeur;
            }, 'fc-sys fc-droit', true);
            serie(cote('D'), function (m) {
                return m.valeur2;
            }, 'fc-dia fc-droit', true);
            legende = '<span><i class="fc-l-sys"></i>systolique</span><span><i class="fc-l-dia"></i>diastolique</span>'
                    + '<span>● bras gauche</span><span>■ bras droit</span>';
        } else {
            serie(function () {
                return true;
            }, function (m) {
                return m.valeur;
            }, 'fc-sys', false);
        }
        zone.update('<svg class="fc-svg" viewBox="0 0 ' + L + ' ' + H + '" role="img" aria-label="Évolution">'
                + svg.join('') + '</svg><div class="fc-legende">' + legende
                + (norme ? '<span><i class="fc-l-bande"></i>valeurs normales' + (norme.plage ? ' (' + Ext.String.htmlEncode(
                        norme.plage) + ')' : '') + '</span><span class="ordo-aide">' + Ext.String.htmlEncode(norme.source || '')
                        + '</span>' : (p && (p.code === 'POIDS' || p.code === 'TAILLE') ? '<span class="ordo-aide">Jugé par l\'IMC'
                        + (me.dossier && me.dossier.imc ? ' : ' + me.format(me.dossier.imc.valeur, 1) + ', '
                                + Ext.String.htmlEncode(me.dossier.imc.analyse) : '') + '.</span>'
                        : '<span class="ordo-aide">Pas de norme pour ce paramètre.</span>')) + '</div>');
    },

    /** Les mesures, de la plus recente a la plus ancienne, avec le retrait d'une mesure erronee. */
    afficherMesures: function (p, mesures) {
        var me = this;
        var enc = Ext.String.htmlEncode;
        if (!mesures.length) {
            me.down('#fcMesures').update('');
            return;
        }
        var ecrire = me.peutEcrire();
        var lignes = Ext.Array.map(mesures.slice().reverse(), function (m) {
            var v = me.format(m.valeur, p && p.decimales) + (m.valeur2 !== null ? ' / ' + me.format(m.valeur2, 0) : '');
            return '<tr><td>' + Ext.Date.format(Ext.Date.parse(m.date, 'Y-m-d\\TH:i'), 'd/m/Y H:i') + '</td>'
                    + '<td class="vc-n"><b>' + v + '</b></td><td>' + (m.cote ? (m.cote === 'G' ? 'gauche' : 'droit') : '')
                    + '</td><td>' + (m.etat === 'inconnu' && p && (p.code === 'POIDS' || p.code === 'TAILLE') ? ''
                            : '<span class="fc-etat fc-etat-' + m.etat + '">' + enc(m.analyse) + '</span>') + '</td>'
                    + '<td>' + enc(m.commentaire || '') + (m.ordonnance ? ' <span class="ordo-aide">(ordonnance '
                            + enc(m.ordonnance) + ')</span>' : '') + '</td><td>' + enc(m.par || '') + '</td>'
                    + '<td>' + (ecrire ? '<button type="button" class="fc-retirer" data-fc="retirer" data-id="'
                            + enc(m.id) + '" title="Retirer cette mesure (erreur de saisie)">✕</button>' : '') + '</td></tr>';
        });
        me.down('#fcMesures').update('<div class="vc-tableau"><table><thead><tr><th>Date</th><th class="vc-n">Valeur</th>'
                + '<th>' + (p && p.genre === 'tension' ? 'Bras' : '') + '</th><th>Analyse</th><th>Commentaire</th>'
                + '<th>Par</th><th></th></tr></thead><tbody>' + lignes.join('') + '</tbody></table></div>');
    },

    ajouterMesure: function () {
        var me = this;
        var p = me.parametre(me.parametreId);
        if (!p || !me.clientId) {
            return;
        }
        var date = me.down('#fcDate').getValue();
        var corps = {parametreId: p.id, commentaire: me.down('#fcCommentaire').getValue() || '',
            date: date ? Ext.Date.format(date, 'Y-m-d') : ''};
        if (p.genre === 'tension') {
            var lire = function (s) {
                var v = me.down(s).getValue();
                return v === null || v === '' ? null : v;
            };
            corps.gauche = {systolique: lire('#fcGSys'), diastolique: lire('#fcGDia')};
            corps.droite = {systolique: lire('#fcDSys'), diastolique: lire('#fcDDia')};
        } else {
            corps.valeur = me.down('#fcValeur').getValue();
        }
        Ext.Ajax.request({
            method: 'POST',
            url: '../api/v1/ordonnance-client/client/' + encodeURIComponent(me.clientId) + '/mesures',
            jsonData: corps,
            success: function (reponse) {
                var r = Ext.decode(reponse.responseText, true) || {};
                me.dire(r.message || 'La mesure n\'a pas pu être enregistrée.', r.success !== true);
                if (r.success === true) {
                    Ext.each(['#fcValeur', '#fcGSys', '#fcGDia', '#fcDSys', '#fcDDia', '#fcCommentaire'], function (s) {
                        me.down(s).setValue(null);
                    });
                    me.ouvrir(me.clientId);
                }
            }
        });
    },

    retirerMesure: function (id) {
        var me = this;
        Ext.Msg.confirm('Retirer la mesure', 'Retirer cette mesure (erreur de saisie) ?', function (b) {
            if (b !== 'yes') {
                return;
            }
            Ext.Ajax.request({
                method: 'POST',
                url: '../api/v1/ordonnance-client/mesures/' + encodeURIComponent(id) + '/retirer',
                success: function (reponse) {
                    var r = Ext.decode(reponse.responseText, true) || {};
                    me.dire(r.message, r.success !== true);
                    me.ouvrir(me.clientId);
                }
            });
        });
    },

    /** Suivi de consommation : les produits achetes sur 12 mois, frequence et habitude. */
    chargerConso: function () {
        var me = this;
        var fin = new Date();
        var clientId = me.clientId;
        Ext.Ajax.request({
            method: 'GET',
            url: '../api/v1/ordonnance-client/client/' + encodeURIComponent(clientId) + '/consommation',
            params: {dtStart: Ext.Date.format(Ext.Date.add(fin, Ext.Date.MONTH, -12), 'Y-m-d'),
                dtEnd: Ext.Date.format(fin, 'Y-m-d')},
            success: function (reponse) {
                if (me.clientId !== clientId) {
                    return;
                }
                var r = Ext.decode(reponse.responseText, true) || {};
                var enc = Ext.String.htmlEncode;
                var lignes = Ext.Array.sort((r.data || []).slice(), function (a, b) {
                    return (b.nbAchats || 0) - (a.nbAchats || 0);
                }).slice(0, 12);
                me.down('#fcConsoCorps').update(lignes.length ? '<div class="vc-tableau"><table><thead><tr><th>Produit</th>'
                        + '<th class="vc-n">Achats</th><th>Fréquence</th><th>Dernier achat</th><th>Habitude</th>'
                        + '<th class="vc-n">Stock</th></tr></thead><tbody>' + Ext.Array.map(lignes, function (l) {
                            return '<tr><td class="vc-produit">' + enc(l.name || '') + '</td><td class="vc-n">'
                                    + (l.nbAchats || 0) + '</td><td>' + (l.nbAchats > 1 && l.frequenceJours
                                    ? 'tous les ' + l.frequenceJours + ' j' : '—') + '</td><td>'
                                    + (l.dernierAchat ? Ext.Date.format(Ext.Date.parse(l.dernierAchat, 'Y-m-d'), 'd/m/Y') : '')
                                    + '</td><td>' + (l.habitude ? '<span class="vc-habitude">' + enc(l.habitude) + '</span>' : '')
                                    + '</td><td class="vc-n">' + (l.stock === null || l.stock === undefined ? '—' : l.stock)
                                    + '</td></tr>';
                        }).join('') + '</tbody></table></div>'
                        : '<div class="fc-vide-petit">Aucun achat de ce client sur les 12 derniers mois.</div>');
            }
        });
    }
});
