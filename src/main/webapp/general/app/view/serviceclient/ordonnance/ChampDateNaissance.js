/* global Ext */

/*
 * DATE DE NAISSANCE A SAISIE GUIDEE (retour du 30/09).
 *
 * On tape le jour, Entree pose « / » et passe au mois ; le mois, Entree pose « / » et passe a l'annee ; l'annee sur
 * 2 chiffres (26 = 2026, 85 = 1985 : au-dela de l'annee en cours, c'est le siecle precedent) ou sur 4. Les « / »
 * peuvent aussi etre tapes a la main, et une date collee d'un bloc (020385, 02031985) est comprise.
 *
 * Controles : jour 1 a 31, mois 1 a 12, date qui existe (pas de 31/02), pas dans le futur, pas plus de 130 ans.
 *
 * Le champ ne decide pas de ce qui suit la date : l'ecran appelle avancer() a chaque Entree. Elle rend false quand le
 * champ a seulement avance d'une etape (ou signale une erreur), true quand la date est complete ou vide : c'est alors
 * a l'ecran de passer la main. Un seul appel par Entree (un second avancerait d'une etape de plus).
 */
Ext.define('testextjs.view.serviceclient.ordonnance.ChampDateNaissance', {
    extend: 'Ext.form.field.Text',
    xtype: 'champdatenaissance',
    emptyText: 'jj/mm/aa',
    maskRe: /[0-9\/]/,
    enforceMaxLength: true,
    maxLength: 10,
    enableKeyEvents: true,
    validateOnChange: false,
    validateOnBlur: true,
    /** Au-dela, c'est une faute de frappe : meme borne que l'age de l'ordonnance. */
    ageMax: 130,

    statics: {
        /** Annee sur 2 chiffres : au-dela de l'annee en cours (sur 2 chiffres), c'est le siecle precedent. */
        siecle: function (aa, aujourdhui) {
            var courant = (aujourdhui || new Date()).getFullYear();
            var base = courant - courant % 100;
            return aa > courant % 100 ? base - 100 + aa : base + aa;
        },

        /** La date lue dans un texte complet (jj/mm/aa, jj/mm/aaaa, jjmmaa, jjmmaaaa), ou null. */
        lire: function (texte, aujourdhui) {
            var t = Ext.String.trim(texte || '');
            var m = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(t) || /^(\d{2})(\d{2})(\d{2}|\d{4})$/.exec(t);
            if (!m) {
                return null;
            }
            var j = parseInt(m[1], 10);
            var mo = parseInt(m[2], 10);
            var a = m[3].length === 2 ? this.siecle(parseInt(m[3], 10), aujourdhui) : parseInt(m[3], 10);
            var d = new Date(a, mo - 1, j);
            /* Une date impossible (31/02) est « corrigee » par JavaScript : on la refuse si elle a glisse. */
            return d.getFullYear() === a && d.getMonth() === mo - 1 && d.getDate() === j ? d : null;
        },

        /** Age revolu a une date donnee. */
        age: function (naissance, a) {
            var ref = a || new Date();
            var n = ref.getFullYear() - naissance.getFullYear();
            if (ref.getMonth() < naissance.getMonth()
                    || (ref.getMonth() === naissance.getMonth() && ref.getDate() < naissance.getDate())) {
                n--;
            }
            return Math.max(n, 0);
        }
    },

    /**
     * Une etape de la saisie guidee. Rend true si la date est complete (et valide) ou vide : l'ecran peut passer au
     * champ suivant. Rend false si le champ a seulement pose un « / », ou si la saisie est a corriger.
     */
    avancer: function () {
        var me = this;
        var t = Ext.String.trim(me.getRawValue() || '');
        var morceaux = t.split('/');
        var deux = function (n) {
            return (n < 10 ? '0' : '') + n;
        };
        if (!t) {
            me.clearInvalid();
            return true;
        }
        if (morceaux.length === 1 && /^\d{1,2}$/.test(t)) {
            var j = parseInt(t, 10);
            if (j < 1 || j > 31) {
                me.markInvalid('Le jour va de 1 à 31.');
                return false;
            }
            me.poser(deux(j) + '/');
            return false;
        }
        if (morceaux.length === 2 && /^\d{1,2}$/.test(morceaux[1])) {
            var mo = parseInt(morceaux[1], 10);
            if (mo < 1 || mo > 12) {
                me.markInvalid('Le mois va de 1 à 12.');
                return false;
            }
            me.poser(morceaux[0] + '/' + deux(mo) + '/');
            return false;
        }
        var d = me.self.lire(t);
        if (!d) {
            me.markInvalid(morceaux.length === 3 && !morceaux[2] ? 'Saisissez l\'année (2 ou 4 chiffres).'
                    : 'Cette date n\'existe pas.');
            return false;
        }
        me.poser(Ext.Date.format(d, 'd/m/Y'));
        return me.validate();
    },

    /** Pose le texte et laisse le curseur a la fin, pour enchainer la saisie. */
    poser: function (texte) {
        var me = this;
        me.setRawValue(texte);
        me.clearInvalid();
        var dom = me.inputEl && me.inputEl.dom;
        if (dom && dom.setSelectionRange) {
            dom.setSelectionRange(texte.length, texte.length);
        }
    },

    getErrors: function () {
        var erreurs = this.callParent(arguments);
        var t = Ext.String.trim(this.getRawValue() || '');
        if (!t) {
            return erreurs;
        }
        var d = this.self.lire(t);
        if (!d) {
            erreurs.push('Date de naissance incomplète ou impossible (jj/mm/aa).');
        } else if (d > new Date()) {
            erreurs.push('La date de naissance ne peut pas être dans le futur.');
        } else if (this.self.age(d) > this.ageMax) {
            erreurs.push('La date de naissance donne plus de ' + this.ageMax + ' ans.');
        }
        return erreurs;
    },

    /**
     * La date saisie si elle est complete et valide, sinon null. Sans marquer le champ : isValid() le peindrait en
     * erreur a chaque frappe, et remplacerait le message precis pose par avancer().
     */
    getDate: function () {
        var t = Ext.String.trim(this.getRawValue() || '');
        return t && !this.getErrors(t).length ? this.self.lire(t) : null;
    },

    /** AAAA-MM-JJ pour le serveur, ou '' (vide ou invalide). */
    getIso: function () {
        var d = this.getDate();
        return d ? Ext.Date.format(d, 'Y-m-d') : '';
    },

    /** Pose une date recue du serveur (AAAA-MM-JJ, eventuellement suivie de l'heure), ou vide le champ. */
    setIso: function (iso) {
        var d = iso ? Ext.Date.parse(String(iso).substring(0, 10), 'Y-m-d') : null;
        this.setRawValue(d ? Ext.Date.format(d, 'd/m/Y') : '');
        this.clearInvalid();
    }
});
