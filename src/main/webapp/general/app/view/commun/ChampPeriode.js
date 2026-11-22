/* global Ext */

/*
 * Plan du 21/11, point 7.2 : un seul selecteur de periode « 01/11/2026 → 21/11/2026 » a la place des deux champs de
 * date « Du » et « Au ». Pose, comme RaccourcisPeriode, en plugin sur le champ de FIN ; le champ de debut est retrouve
 * par son itemId (ou son id) dans le meme conteneur.
 *
 *  - le champ unique se saisit aussi au clavier : « 01/10/2026 → 31/10/2026 » (ou « - », « au ») ; une seule date =
 *    un seul jour ; « 01/10/2026 → » = fin vide et « → 31/10/2026 » = debut vide (comme un des deux anciens champs
 *    vide) ; vide = les deux dates videes (comme avant avec les deux champs) ; Entree valide et lance la
 *    recherche, Tab valide seulement ;
 *  - le bouton calendrier ouvre un calendrier : premier clic = date de debut, second clic = date de fin (inversees si
 *    besoin) ; raccourcis : Aujourd'hui, Hier, Ce mois, Mois précédent ;
 *  - les deux champs d'origine restent ceux que lisent les controleurs et les tests : masques, ils recoivent les dates
 *    (setValue, puis 'select' sur le champ de fin), et le champ unique suit leurs changements (selecteur « Période »
 *    d'un onglet d'analyse, par exemple) ;
 *  - bornes : celles des champs d'origine (maxValue, minValue) ; une periode hors bornes est signalee en rouge mais
 *    appliquee et envoyee, comme les deux champs d'origine le faisaient.
 * Les ecrans le recoivent un par un, a leur refonte (comme les boutons) : Balance vente caisse 2, État de contrôle des
 * achats, Liste des bons par organisme (reponse du 22/11), puis les ecrans du menu FACTURATION (retour du 22/11).
 *
 * Aide au choix (retour du 22/11 : les utilisateurs sont habitues a deux champs) : en tete du calendrier, deux cases
 * « Du » et « Au » montrent les deux dates, comme les anciens champs. La case en cours de choix est en couleur ; un clic
 * sur « Au » ne change que la date de fin (un seul clic dans le calendrier), un clic sur « Du » reprend au debut. Au
 * survol, la periode qui serait choisie se colore. Un clic dans le champ ouvre aussi le calendrier.
 */
Ext.define('testextjs.view.commun.ChampPeriode', {
    extend: 'Ext.AbstractPlugin',
    alias: 'plugin.champperiode',
    /** itemId (ou id) du champ de debut, dans le meme conteneur que le champ de fin. */
    debut: null,
    /** itemId facultatif d'un bouton du meme conteneur a declencher apres un choix (Rechercher...). */
    declencher: null,
    /** Libelle du champ unique (facultatif). */
    libelle: null,
    /** Largeur du champ unique. */
    largeur: null,
    /** Vrai : le champ unique reprend le flex des deux champs d'origine (barres chargees du menu FACTURATION). */
    souple: false,

    statics: {
        SEPARATEUR: ' → ',
        /** Les raccourcis : [libelle, fonction(aujourd'hui) -> [debut, fin]]. */
        raccourcis: function () {
            var D = Ext.Date;
            return [
                ['Aujourd\'hui', function (j) {
                        return [j, j];
                    }],
                ['Hier', function (j) {
                        var h = D.add(j, D.DAY, -1);
                        return [h, h];
                    }],
                ['Ce mois', function (j) {
                        return [D.getFirstDateOfMonth(j), j];
                    }],
                ['Mois précédent', function (j) {
                        var m = D.add(D.getFirstDateOfMonth(j), D.MONTH, -1);
                        return [m, D.getLastDateOfMonth(m)];
                    }]
            ];
        },

        /**
         * Lit un texte saisi : null si illisible ; [] si vide ; [debut, fin] sinon (une seule date = un jour). Les dates
         * sont au format jj/mm/aaaa (annee sur 2 chiffres acceptee).
         */
        lire: function (texte) {
            var t = String(texte || '').trim();
            if (!t) {
                return [];
            }
            /* « 01/11/2026 → » : fin vide ; « → 21/11/2026 » : debut vide (comme un des deux anciens champs vide) */
            var m = /^(\d{1,2}\/\d{1,2}\/\d{2,4})?\s*(→|->|-|–|au|à|a)?\s*(\d{1,2}\/\d{1,2}\/\d{2,4})?$/i.exec(t);
            if (!m || (!m[1] && !m[3]) || (!m[1] && !m[2])) {
                return null;
            }
            var date = function (s) {
                var p = s.split('/'), a = Number(p[2]) < 100 ? 2000 + Number(p[2]) : Number(p[2]);
                var d = new Date(a, Number(p[1]) - 1, Number(p[0]));
                return d.getFullYear() === a && d.getMonth() === Number(p[1]) - 1 && d.getDate() === Number(p[0]) ? d : null;
            };
            if (!m[1] || !m[3]) {
                if (m[2] && m[1]) {
                    return date(m[1]) ? [date(m[1]), null] : null;
                }
                if (m[2] && m[3]) {
                    return date(m[3]) ? [null, date(m[3])] : null;
                }
            }
            var d1 = date(m[1]), d2 = m[3] ? date(m[3]) : d1;
            if (!d1 || !d2) {
                return null;
            }
            return d1 <= d2 ? [d1, d2] : [d2, d1];
        },

        texte: function (d1, d2) {
            var f = function (d) {
                return d ? Ext.Date.format(d, 'd/m/Y') : '';
            };
            return d1 || d2 ? f(d1) + this.SEPARATEUR + f(d2) : '';
        }
    },

    init: function (fin) {
        var me = this;
        me.fin = fin;
        fin.on('afterrender', me.monter, me, {single: true});
    },

    champDebut: function () {
        var parent = this.fin.ownerCt;
        return parent ? (parent.down('#' + this.debut) || Ext.getCmp(this.debut)) : null;
    },

    monter: function () {
        var me = this, fin = me.fin, parent = fin.ownerCt, debut = me.champDebut();
        if (!parent || !debut || me.champ) {
            return;
        }
        /* comme RaccourcisPeriode : attendre la fin de la mise en page de la barre avant d'y inserer */
        if (!me.barrePrete) {
            me.barrePrete = true;
            parent.on('afterlayout', me.monter, me, {single: true});
            return;
        }
        var cls = me.self;
        /* bornes d'origine des deux champs (pas celles qu'ils se donnent l'un a l'autre, debut <= fin) */
        me.max = fin.initialConfig.maxValue || debut.initialConfig.maxValue || null;
        me.min = debut.initialConfig.minValue || fin.initialConfig.minValue || null;
        var souple = me.souple ? (debut.initialConfig.flex || 0) + (fin.initialConfig.flex || 0) : 0;
        me.champ = parent.insert(parent.items.indexOf(debut), {
            xtype: 'triggerfield', itemId: (fin.itemId || fin.id) + 'Periode', cls: 'champ-periode',
            fieldLabel: me.libelle || undefined, labelWidth: me.libelle ? Math.max(40, me.libelle.length * 7) : undefined,
            /* « souple » : le champ prend la place des deux champs d'origine (leur flex), sans descendre sous 190 px */
            width: souple ? undefined : me.largeur || (me.libelle ? 250 : 200), flex: souple || undefined, minWidth: souple ? 190 : undefined,
            triggerCls: 'x-form-date-trigger', emptyText: 'jj/mm/aaaa → jj/mm/aaaa',
            value: cls.texte(debut.getValue(), fin.getValue()), enableKeyEvents: true,
            /* la validation d'Ext (a chaque frappe) dit l'erreur : un marquage a la main serait efface aussitot */
            validator: function (v) {
                var e = me.erreur(v);
                return e === null ? true : e;
            },
            /* bulle de theme : comment se servir du champ */
            listeners: {
                afterrender: function (c) {
                    Ext.tip.QuickTipManager.register({target: c.inputEl, text: 'Période : tapez « 01/10/2026 → 31/10/2026 » ou ouvrez le calendrier'
                                + ' (premier clic = début, second clic = fin ; cases « Du » et « Au » pour ne changer qu\'une date). Entrée lance la recherche.'});
                    /* habitude des deux champs de date : un clic dans le champ ouvre le calendrier */
                    c.inputEl.on('click', function () {
                        if (!me.panneau || !me.panneau.isVisible()) {
                            me.ouvrir();
                        }
                    });
                },
                specialkey: function (c, e) {
                    /* le calendrier ouvert par un clic dans le champ se ferme au clavier */
                    if ((e.getKey() === e.TAB || e.getKey() === e.ESC || e.getKey() === e.ENTER) && me.panneau && me.panneau.isVisible()) {
                        me.panneau.hide();
                    }
                    if (e.getKey() === e.ENTER) {
                        if (me.valider(c.getValue())) {
                            me.lancer();
                        }
                    } else if (e.getKey() === e.DOWN) {
                        me.ouvrir();
                    }
                },
                blur: function (c) {
                    me.valider(c.getValue());
                }
            },
            onTriggerClick: function () {
                me.ouvrir();
            }
        });
        debut.hide();
        fin.hide();
        /* le separateur « - » d'une barre entre les deux champs n'a plus lieu d'etre */
        var entre = parent.items.getAt(parent.items.indexOf(debut) + 1);
        if (entre && entre !== fin && entre.isXType && entre.isXType('tbseparator')) {
            entre.hide();
        }
        debut.champPeriode = me.champ;
        fin.champPeriode = me.champ;
        debut.rolePeriode = 'debut';
        fin.rolePeriode = 'fin';
        var suivre = function () {
            if (!me.applique && !me.champ.hasFocus) {
                me.champ.setValue(cls.texte(debut.getValue(), fin.getValue()));
                me.champ.clearInvalid();
            }
        };
        debut.on('change', suivre);
        fin.on('change', suivre);
        me.champ.on('destroy', function () {
            if (me.surDocument) {
                Ext.getDoc().un({mousedown: me.surDocument, keydown: me.surDocument});
            }
            if (me.panneau) {
                me.panneau.destroy();
                me.panneau = null;
            }
        });
    },

    /** Erreur d'un texte saisi (null s'il est bon) : illisible, ou hors des bornes d'origine. */
    erreur: function (texte) {
        var dates = this.self.lire(texte);
        if (dates === null) {
            return 'Période attendue : jj/mm/aaaa → jj/mm/aaaa';
        }
        return dates.length ? this.horsBornes(dates) : null;
    },

    /** Applique un texte saisi ; faux (champ en erreur, dates inchangees) s'il est illisible ou hors bornes. */
    valider: function (texte) {
        var me = this, dates = me.self.lire(texte);
        if (dates === null) {
            me.champ.validate();
            return false;
        }
        /* hors des bornes des champs d'origine : comme ceux-ci avant (date signalee en rouge mais envoyee), la periode
           est appliquee et l'avertissement reste sur le champ */
        me.appliquer(dates.length ? dates : [null, null], false);
        if (dates.length && me.horsBornes(dates)) {
            me.champ.validate();
        }
        return true;
    },

    horsBornes: function (dates) {
        var me = this, max = me.max, min = me.min;
        if (max && dates[1] && dates[1] > Ext.Date.clearTime(max, true)) {
            return 'Date de fin au plus tard le ' + Ext.Date.format(max, 'd/m/Y');
        }
        if (min && dates[0] && dates[0] < Ext.Date.clearTime(min, true)) {
            return 'Date de début au plus tôt le ' + Ext.Date.format(min, 'd/m/Y');
        }
        return null;
    },

    /** Pose les dates dans les deux champs d'origine ; « lancer » : puis le bouton de recherche. */
    appliquer: function (dates, lancer) {
        var me = this, debut = me.champDebut(), fin = me.fin;
        me.applique = true;
        try {
            /* des champs qui se bornent l'un l'autre (debut <= fin) : poser d'abord celui qui elargit */
            var finActuelle = fin.getValue();
            if (dates[0] && finActuelle && dates[0] > finActuelle) {
                fin.setValue(dates[1]);
                debut.setValue(dates[0]);
            } else {
                debut.setValue(dates[0]);
                fin.setValue(dates[1]);
            }
            debut.validate();
            fin.validate();
            fin.fireEvent('select', fin, dates[1]);
        } finally {
            me.applique = false;
        }
        me.champ.setValue(me.self.texte(dates[0], dates[1]));
        me.champ.clearInvalid();
        if (lancer) {
            me.lancer();
        }
    },

    lancer: function () {
        var me = this, bouton = null, c = me.declencher ? me.fin.ownerCt : null;
        /* le bouton peut etre sur une autre barre de l'ecran (Suivi des bons) : recherche en remontant */
        while (c && !bouton) {
            bouton = c.down('#' + me.declencher);
            c = c.ownerCt;
        }
        if (bouton && !bouton.disabled) {
            /* comme un vrai clic : evenement « click » (controleurs) puis handler du bouton */
            if (bouton.fireHandler) {
                bouton.fireHandler(Ext.EventObject);
            } else {
                bouton.fireEvent('click', bouton);
            }
        }
    },

    /** Calendrier : premier clic = debut, second clic = fin ; raccourcis a gauche. */
    ouvrir: function () {
        var me = this, debut = me.champDebut(), fin = me.fin;
        if (me.panneau && me.panneau.isVisible()) {
            me.panneau.hide();
            return;
        }
        me.choixDebut = null;
        if (!me.panneau) {
            me.panneau = Ext.create('Ext.container.Container', {
                floating: true, focusOnToFront: false, shadow: 'frame', cls: 'champ-periode-panneau', layout: {type: 'hbox', align: 'stretch'},
                renderTo: Ext.getBody(), hidden: true,
                items: [{xtype: 'container', itemId: 'raccourcis', cls: 'champ-periode-raccourcis', width: 120, layout: {type: 'vbox', align: 'stretch'},
                        items: Ext.Array.map(me.self.raccourcis(), function (r) {
                            return {xtype: 'button', text: r[0], cls: 'champ-periode-raccourci', margin: '0 0 4 0', handler: function () {
                                    var d = r[1](Ext.Date.clearTime(new Date()));
                                    me.panneau.hide();
                                    me.appliquer(d, true);
                                }};
                        })},
                    {xtype: 'container', layout: {type: 'vbox', align: 'stretch'}, items: [
                            {xtype: 'component', itemId: 'bornes', cls: 'champ-periode-bornes', html: '',
                                listeners: {afterrender: function (c) {
                                        c.getEl().on('click', function (e, t) {
                                            me.changerCible(t.getAttribute('data-borne'));
                                        }, null, {delegate: '.champ-periode-case'});
                                    }}},
                            {xtype: 'component', itemId: 'consigne', cls: 'champ-periode-consigne', html: ''},
                            {xtype: 'datepicker', itemId: 'calendrier', showToday: false,
                                /* jamais de focus pose par le calendrier sur un jour (focus(50) d'Ext a chaque mise a jour) : la frappe reste dans le champ */
                                /* doCancelFocus est efface par Ext apres chaque clic sur un jour : remis a chaque mise a jour */
                                doCancelFocus: true, focusOnSelect: false,
                                selectedUpdate: function () {
                                    this.doCancelFocus = true;
                                    return Ext.picker.Date.prototype.selectedUpdate.apply(this, arguments);
                                },
                                handler: function (p, d) {
                                    me.choisir(d);
                                }}]}]
            });
            var picker = me.panneau.down('#calendrier');
            picker.update = Ext.Function.createSequence(picker.update, function () {
                me.marquer();
            });
            /* survol : la periode qui serait choisie se colore */
            var survoler = function () {
                picker.getEl().on('mouseover', function (e, td) {
                    var a = td.firstChild;
                    me.survol = a && a.dateValue ? a.dateValue : null;
                    me.marquer();
                }, null, {delegate: 'td'});
                picker.getEl().on('mouseleave', function () {
                    me.survol = null;
                    me.marquer();
                });
            };
            /* le panneau est dessine des sa creation (renderTo) : le calendrier l'est deja */
            if (picker.rendered) {
                survoler();
            } else {
                picker.on('afterrender', survoler, null, {single: true});
            }
            me.surDocument = function (e) {
                if (!me.panneau || me.panneau.isDestroyed || !me.panneau.isVisible()) {
                    return;
                }
                if (e.type === 'keydown') {
                    /* Echap ferme le calendrier, ou que soit le focus (une recherche peut l'avoir repris) */
                    if (e.getKey() === e.ESC) {
                        me.panneau.hide();
                    }
                } else if (!e.within(me.panneau.getEl()) && !(me.champ.triggerWrap && e.within(me.champ.triggerWrap))) {
                    me.panneau.hide();
                }
            };
            Ext.getDoc().on({mousedown: me.surDocument, keydown: me.surDocument});
        }
        var picker = me.panneau.down('#calendrier');
        picker.setMaxDate(me.max);
        picker.setMinDate(me.min);
        me.survol = null;
        me.panneau.show();
        me.changerCible('debut');
        /* la frappe continue dans le champ : le calendrier ne prend pas le focus */
        if (!me.champ.hasFocus) {
            me.champ.focus();
        }
        picker.setValue(fin.getValue() || debut.getValue() || new Date());
        me.marquer();
        me.panneau.alignTo(me.champ.triggerWrap || me.champ.getEl(), 'tl-bl?', [0, 2]);
    },

    consigne: function (html) {
        this.panneau.down('#consigne').update(html);
    },

    /**
     * Case « Du » ou « Au » : la date que le prochain clic dans le calendrier choisit. « debut » : premier clic = debut,
     * second = fin. « fin » (sans debut en cours de choix) : un seul clic, qui ne change que la fin.
     */
    changerCible: function (cible) {
        var me = this;
        if (cible !== 'debut' && cible !== 'fin') {
            return;
        }
        if (cible === 'debut') {
            me.choixDebut = null;
        }
        me.cible = cible;
        me.dessinerBornes();
        if (cible === 'debut') {
            me.consigne('Cliquez la date de <b>début</b>');
        } else if (me.choixDebut) {
            me.consigne('Début : <b>' + Ext.Date.format(me.choixDebut, 'd/m/Y') + '</b> — cliquez la date de <b>fin</b>');
        } else {
            me.consigne('Cliquez la nouvelle date de <b>fin</b> (le début reste le même)');
        }
        me.marquer();
    },

    /** Les deux cases « Du » et « Au » : dates en cours (ou choisie), case active en couleur. */
    dessinerBornes: function () {
        var me = this, c = me.panneau && me.panneau.down('#bornes');
        if (!c) {
            return;
        }
        var f = function (d) {
            return d ? Ext.Date.format(d, 'd/m/Y') : '—';
        };
        var du = me.choixDebut || me.champDebut().getValue(), au = me.choixDebut ? null : me.fin.getValue();
        var cas = function (role, libelle, d) {
            return '<div class="champ-periode-case' + (me.cible === role ? ' champ-periode-case-active' : '') + '" data-borne="' + role + '"'
                    + ' data-qtip="' + (role === 'debut' ? 'Choisir la période à partir du début' : 'Ne changer que la date de fin') + '">'
                    + '<span data-borne="' + role + '">' + libelle + '</span> <b data-borne="' + role + '">' + f(d) + '</b></div>';
        };
        c.update(cas('debut', 'Du', du) + '<span class="champ-periode-fleche">→</span>' + cas('fin', 'Au', au));
    },

    choisir: function (d) {
        var me = this;
        if (me.cible === 'fin' && !me.choixDebut) {
            /* case « Au » : seule la fin change ; un debut posterieur est remis dans l'ordre */
            var debut = me.champDebut().getValue();
            me.panneau.hide();
            me.appliquer(debut && debut > d ? [d, debut] : [debut || null, d], true);
            return;
        }
        if (!me.choixDebut) {
            me.choixDebut = d;
            me.changerCible('fin');
            return;
        }
        var d1 = me.choixDebut, d2 = d;
        me.choixDebut = null;
        me.panneau.hide();
        me.appliquer(d1 <= d2 ? [d1, d2] : [d2, d1], true);
    },

    /** Met en couleur la periode en cours (ou le debut choisi) dans le calendrier. */
    marquer: function () {
        var me = this, picker = me.panneau && me.panneau.down('#calendrier');
        if (!picker || !picker.cells) {
            return;
        }
        var d1 = me.choixDebut || me.champDebut().getValue(), d2 = me.choixDebut ? (me.survol ? new Date(me.survol) : me.choixDebut) : me.fin.getValue();
        if (!me.choixDebut && me.cible === 'fin' && me.survol) {
            d2 = new Date(me.survol);
        }
        var t1 = d1 ? Ext.Date.clearTime(d1, true).getTime() : null, t2 = d2 ? Ext.Date.clearTime(d2, true).getTime() : null;
        picker.cells.each(function (c) {
            var v = c.dom.firstChild && c.dom.firstChild.dateValue;
            c.removeCls(['champ-periode-dans', 'champ-periode-borne']);
            if (t1 !== null && t2 !== null && v >= Math.min(t1, t2) && v <= Math.max(t1, t2)) {
                c.addCls(v === t1 || v === t2 ? 'champ-periode-borne' : 'champ-periode-dans');
            }
        });
    }
});
