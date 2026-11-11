/* Plan du 09/11, point 8 : « A propos » de Prestige 3. Volet a droite, par-dessus l'ecran en cours (rien n'est
 * ferme derriere), deux onglets seulement (retour du 11/11 : « juste l'onglet version et assistance ») :
 *  - Version : version, date de construction, schema de la base, officine, poste, utilisateur, navigateur ;
 *  - Assistance : serveur, base de donnees, derniere sauvegarde, espace disque (vert / orange / rouge), contact.
 * Valeurs lues sur GET ../api/v1/a-propos a chaque ouverture. Couleurs de l'application (bandeau, vert d'eau).
 * Aucune fenetre surgissante : la copie se confirme dans le bouton. Aucun chemin, mot de passe, jeton ni numero. */
Ext.define('testextjs.view.sm_user.about.AboutManager', {
    extend: 'Ext.window.Window',
    xtype: 'aboutmanager',
    id: 'aboutmanagerID',
    cls: 'apropos-volet',
    header: false,
    border: false,
    frame: false,
    shadow: false,
    resizable: false,
    draggable: false,
    constrain: false,
    width: 380,
    height: 600,
    bodyPadding: 0,
    layout: 'fit',

    statics: {
        /* ouvre le volet (ou le recharge s'il est deja ouvert) */
        ouvrir: function () {
            'use strict';
            var w = Ext.getCmp('aboutmanagerID');
            if (w) {
                w.charger();
                return w;
            }
            return Ext.create('testextjs.view.sm_user.about.AboutManager').show();
        },
        style: function () {
            'use strict';
            if (document.getElementById('apropos-style')) {
                return;
            }
            var s = document.createElement('style');
            s.id = 'apropos-style';
            s.textContent = [
                '.apropos-volet{box-shadow:-10px 0 30px rgba(10,20,40,.28)!important;border:0!important;border-radius:0!important;padding:0!important;background:#f6f8fb!important}',
                '.apropos-volet .x-window-body{background:#f6f8fb!important;border:0!important}',
                '.apropos-cadre{display:flex;flex-direction:column;height:100%;font:13px "Segoe UI",Tahoma,sans-serif;color:#1c2541}',
                '.apropos-tete{background:linear-gradient(180deg,var(--nav-bg,#1e3a5f) 0%,var(--nav-header-bg,#152d4e) 100%);color:#fff;padding:16px 16px 0;flex-shrink:0}',
                '.apropos-ligne{display:flex;align-items:center;gap:12px}',
                '.apropos-nom{font-weight:900;font-size:19px;letter-spacing:1px}',
                '.apropos-ver{font-size:12px;color:#48c9b0;font-weight:700}',
                '.apropos-fermer{margin-left:auto;background:none;border:0;color:#fff;font-size:18px;opacity:.8;cursor:pointer;padding:4px 6px}',
                '.apropos-fermer:hover{opacity:1}',
                '.apropos-onglets{display:flex;margin-top:14px}',
                '.apropos-onglet{flex:1;text-align:center;padding:9px 0;font-size:13px;font-weight:700;color:#b8c4dc;background:none;border:0;border-bottom:3px solid transparent;cursor:pointer}',
                '.apropos-onglet.actif{color:#fff;border-bottom-color:#48c9b0}',
                '.apropos-corps{padding:14px 16px;overflow:auto;flex:1}',
                '.apropos-page{display:none}.apropos-page.actif{display:block}',
                '.apropos-info{display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid #e3e8ef}',
                '.apropos-info .apropos-cle{color:#5d6b82;white-space:nowrap}',
                '.apropos-info .apropos-valeur{font-weight:700;text-align:right;word-break:break-word}',
                '.apropos-etat{display:flex;align-items:center;gap:10px;padding:8px 10px;background:#fff;border-radius:10px;margin-bottom:6px;border:1px solid #e3e8ef}',
                '.apropos-pt{width:10px;height:10px;border-radius:5px;flex-shrink:0;background:#aab4c3}',
                '.apropos-pt[data-niveau=VERT]{background:#1e8449}.apropos-pt[data-niveau=ORANGE]{background:#e67e22}.apropos-pt[data-niveau=ROUGE]{background:#c0392b}',
                '.apropos-etat .apropos-t{flex:1}.apropos-etat b{display:block;font-size:12.5px}',
                '.apropos-detail{color:#5d6b82;font-size:11.5px}',
                '.apropos-copier{display:block;width:100%;margin-top:14px;border:0;border-radius:18px;padding:9px 12px;font-weight:700;background:#1a8f7c;color:#fff;cursor:pointer;font-size:13px}',
                '.apropos-copier:hover{background:#17806f}.apropos-copier.fait{background:#1e8449}',
                '.apropos-petit{color:#5d6b82;font-size:11.5px;margin-top:8px;line-height:1.4}',
                '.apropos-erreur{color:#c0392b;font-weight:700;padding:10px 0}'
            ].join('\n');
            document.head.appendChild(s);
        }
    },

    initComponent: function () {
        /* pas de 'use strict' ici : callParent d'ExtJS 4 lit la fonction appelante */
        testextjs.view.sm_user.about.AboutManager.style();
        this.items = [{
            xtype: 'component',
            itemId: 'contenu',
            html: '<div class="apropos-cadre">'
                    + '<div class="apropos-tete"><div class="apropos-ligne">'
                    + '<img class="about-icone" src="../resources/images/icone-prestige/icone-prestige-48.png?v=3" width="48" height="48" alt="">'
                    + '<div><div class="apropos-nom">PRESTIGE 3</div><div class="apropos-ver"></div></div>'
                    + '<button type="button" class="apropos-fermer" title="Fermer (Échap)">✕</button></div>'
                    + '<div class="apropos-onglets"><button type="button" class="apropos-onglet actif" data-onglet="version">Version</button>'
                    + '<button type="button" class="apropos-onglet" data-onglet="assistance">Assistance</button></div></div>'
                    + '<div class="apropos-corps"><div class="apropos-page actif" data-page="version">Chargement…</div>'
                    + '<div class="apropos-page" data-page="assistance"></div></div></div>'
        }];
        this.callParent(arguments);
        this.on('afterrender', this.brancher, this);
        this.on('show', function () {
            this.placer();
            this.charger();
        }, this);
        this.on('beforedestroy', this.debrancher, this);
    },

    /* colle le volet a droite, sous le bandeau, sur toute la hauteur restante */
    placer: function () {
        'use strict';
        var h = document.getElementById('app-header'), haut = 0;
        if (h) {
            haut = Math.max(0, Math.round(h.getBoundingClientRect().bottom));
        }
        var l = Math.min(this.width, window.innerWidth);
        this.setSize(l, Math.max(300, window.innerHeight - haut));
        this.setPosition(window.innerWidth - l, haut);
        this.toFront();
    },

    brancher: function () {
        'use strict';
        var me = this, dom = me.getEl().dom;
        me.clic = function (e) {
            var t = e.target;
            if (t.closest('.apropos-fermer')) {
                me.close();
            } else if (t.closest('.apropos-onglet')) {
                me.onglet(t.closest('.apropos-onglet').getAttribute('data-onglet'));
            } else if (t.closest('.apropos-copier')) {
                me.copier(t.closest('.apropos-copier'));
            }
        };
        me.touche = function (e) {
            if (e.key === 'Escape' || e.keyCode === 27) {
                me.close();
            }
        };
        me.taille = function () {
            me.placer();
        };
        dom.addEventListener('click', me.clic);
        document.addEventListener('keydown', me.touche);
        window.addEventListener('resize', me.taille);
    },

    debrancher: function () {
        'use strict';
        if (this.touche) {
            document.removeEventListener('keydown', this.touche);
        }
        if (this.taille) {
            window.removeEventListener('resize', this.taille);
        }
    },

    onglet: function (nom) {
        'use strict';
        var dom = this.getEl().dom;
        Array.prototype.forEach.call(dom.querySelectorAll('.apropos-onglet'), function (o) {
            o.classList.toggle('actif', o.getAttribute('data-onglet') === nom);
        });
        Array.prototype.forEach.call(dom.querySelectorAll('.apropos-page'), function (p) {
            p.classList.toggle('actif', p.getAttribute('data-page') === nom);
        });
    },

    charger: function () {
        'use strict';
        var me = this;
        Ext.Ajax.request({
            url: '../api/v1/a-propos',
            method: 'GET',
            success: function (r) {
                if (me.isDestroyed) {
                    return;
                }
                var d;
                try {
                    d = Ext.decode(r.responseText);
                } catch (e) {
                    d = null;
                }
                me.afficher(d);
            },
            failure: function () {
                if (!me.isDestroyed) {
                    me.afficher(null);
                }
            }
        });
    },

    /* utilitaires d'affichage */
    esc: function (v) {
        'use strict';
        return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (c) {
            return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c];
        });
    },
    /* « 2026-11-10 23:44[ UTC] » -> « 10/11/2026 23:44[ UTC] » */
    date: function (s) {
        'use strict';
        var m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2})(.*)$/.exec(String(s || ''));
        return m ? m[3] + '/' + m[2] + '/' + m[1] + ' ' + m[4] + m[5] : String(s || '');
    },
    navigateur: function () {
        'use strict';
        var ua = navigator.userAgent, m = /Edg\/(\d+)/.exec(ua), nom = 'Edge';
        if (!m) {
            m = /Firefox\/(\d+)/.exec(ua);
            nom = 'Firefox';
        }
        if (!m) {
            m = /Chrome\/(\d+)/.exec(ua);
            nom = 'Chrome';
        }
        return (m ? nom + ' ' + m[1] : 'Navigateur') + ', ' + screen.width + ' × ' + screen.height;
    },
    textes: function (d) {
        'use strict';
        var a = d.assistance || {}, sv = a.sauvegarde || {}, bd = a.base || {}, dq = a.disque || {}, srv = a.serveur || {};
        return {
            serveur: 'en marche depuis ' + (srv.texte || '?'),
            base: bd.ms >= 0 ? 'répond en ' + bd.ms + ' ms' : 'ne répond pas',
            sauvegarde: sv.derniere ? this.date(sv.derniere) + ' (il y a ' + sv.ageTexte + ')' : 'aucune sauvegarde réussie',
            disque: dq.libreTexte ? dq.libreTexte + ' libres sur ' + dq.totalTexte : 'inconnu',
            poste: (window.PrestigePoste && window.PrestigePoste.lire()) || 'non nommé',
            construction: d.construction ? this.date(d.construction) : 'inconnue'
        };
    },

    afficher: function (d) {
        'use strict';
        var me = this, dom = me.getEl().dom, esc = me.esc;
        var pv = dom.querySelector('[data-page=version]'), pa = dom.querySelector('[data-page=assistance]');
        if (!d || !d.success) {
            pv.innerHTML = pa.innerHTML = '<div class="apropos-erreur apropos-charge">Informations indisponibles pour le moment.</div>';
            return;
        }
        me.donnees = d;
        var t = me.textes(d), a = d.assistance || {};
        dom.querySelector('.apropos-ver').textContent = 'Version ' + (d.version || '?');
        var info = function (cle, libelle, valeur) {
            return '<div class="apropos-info" data-cle="' + cle + '"><span class="apropos-cle">' + esc(libelle)
                    + '</span><span class="apropos-valeur">' + esc(valeur) + '</span></div>';
        };
        var etat = function (cle, libelle, niveau, detail) {
            return '<div class="apropos-etat" data-cle="' + cle + '"><span class="apropos-pt"'
                    + (niveau ? ' data-niveau="' + esc(niveau) + '"' : '') + '></span><div class="apropos-t"><b>'
                    + esc(libelle) + '</b><span class="apropos-detail">' + esc(detail) + '</span></div></div>';
        };
        pv.innerHTML = '<div class="apropos-charge"></div>'
                + info('version', 'Version', d.version || '')
                + info('construction', 'Construite le', t.construction)
                + info('schema', 'Base de données', d.schema || '')
                + info('officine', 'Officine', d.officine || '')
                + info('poste', 'Ce poste', t.poste)
                + info('utilisateur', 'Utilisateur', d.utilisateur || '')
                + info('navigateur', 'Navigateur', me.navigateur())
                + info('editeur', 'Éditeur', 'D.I.C.I')
                + '<button type="button" class="apropos-copier">Copier les informations pour l\'assistance</button>';
        pa.innerHTML = etat('serveur', 'Serveur', (a.serveur || {}).niveau, t.serveur)
                + etat('base', 'Base de données', (a.base || {}).niveau, t.base)
                + etat('sauvegarde', 'Dernière sauvegarde', (a.sauvegarde || {}).niveau, t.sauvegarde)
                + etat('disque', 'Espace disque', (a.disque || {}).niveau, t.disque)
                + info('contact', 'Contact', a.contact || '')
                + '<button type="button" class="apropos-copier">Copier l\'état pour l\'assistance</button>'
                + '<div class="apropos-petit">Vert : normal ; orange : à surveiller ; rouge : à traiter. '
                + 'Aucun chemin de serveur, mot de passe ou jeton n\'est montré.</div>';
    },

    /* texte remis a l'assistance : les valeurs affichees, rien d'autre */
    texteCopie: function () {
        'use strict';
        var d = this.donnees || {}, t = this.textes(d), now = new Date(), p2 = function (n) {
            return (n < 10 ? '0' : '') + n;
        };
        return ['PRESTIGE 3, version ' + (d.version || '?') + ' (construite le ' + t.construction + ')',
            'Base de données : schéma ' + (d.schema || '?'),
            'Officine : ' + (d.officine || ''),
            'Poste : ' + t.poste + ' ; utilisateur : ' + (d.utilisateur || ''),
            'Navigateur : ' + this.navigateur(),
            'Serveur : ' + t.serveur,
            'Base : ' + t.base,
            'Dernière sauvegarde : ' + t.sauvegarde,
            'Espace disque : ' + t.disque,
            'Relevé le ' + p2(now.getDate()) + '/' + p2(now.getMonth() + 1) + '/' + now.getFullYear() + ' '
                    + p2(now.getHours()) + ':' + p2(now.getMinutes())].join('\n');
    },

    /* la copie ne modifie rien : un clic suffit, le bouton confirme lui-meme (« Copié ») */
    copier: function (bouton) {
        'use strict';
        var texte = this.texteCopie(), initial = bouton.getAttribute('data-texte') || bouton.textContent;
        bouton.setAttribute('data-texte', initial);
        var fini = function (ok) {
            bouton.textContent = ok ? 'Copié ✓' : 'Copie impossible : sélectionnez le texte';
            bouton.classList.toggle('fait', ok);
            setTimeout(function () {
                bouton.textContent = initial;
                bouton.classList.remove('fait');
            }, 2500);
        };
        var secours = function () {
            var z = document.createElement('textarea');
            z.value = texte;
            z.style.position = 'fixed';
            z.style.opacity = '0';
            document.body.appendChild(z);
            z.select();
            var ok = false;
            try {
                ok = document.execCommand('copy');
            } catch (e) {
                ok = false;
            }
            document.body.removeChild(z);
            fini(ok);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(texte).then(function () {
                fini(true);
            }, secours);
        } else {
            secours();
        }
    }
});
