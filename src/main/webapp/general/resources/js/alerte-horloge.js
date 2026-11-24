/* global Ext */
/*
 * Rappel « date et heure du systeme fausses » (retours du 25/10, point 2).
 *
 * Employes qui reculent la date pour ressaisir des ventes, pile CMOS faible (date perdue au demarrage), fuseau horaire
 * change : verification a la connexion puis toutes les 5 minutes (GET v1/horloge/etat), pour tous les utilisateurs.
 * Le serveur compare son horloge a l'heure d'Internet, a la derniere operation de caisse et au fuseau attendu.
 * Retour du 02/11 : le controle porte sur le poste qui a le serveur Payara, et lui seul. Un poste relie a ce serveur en
 * depend (c'est le serveur qui date les operations) : l'horloge du navigateur n'est plus comparee, elle ne change rien.
 * Toast pose sur la page, comme celui de WhatsApp (au-dessus de lui s'ils sont la tous les deux) :
 *  - « Mettre a jour » : le serveur se synchronise comme Windows (POST v1/horloge/synchroniser) ; le compte rendu
 *    s'affiche dans le toast, puis la verification est relancee ;
 *  - « Masquer » : jusqu'a la verification suivante (5 minutes).
 * Aucune fenetre.
 *
 * Cahier des charges du 24/11 : si le serveur decide le blocage (o.blocage.bloque : ecart avec Internet, horloge
 * reculee ou partie dans le futur, date pas plausible), une fenetre couvre toute l'application. Elle ne se ferme pas :
 * ni croix, ni Echap, ni clic a cote ; les touches ne vont plus a l'application. Elle porte les causes, l'heure du
 * serveur et l'heure reelle, « Mettre a jour » (tache Windows declenchee par le serveur) et la conduite a tenir sans
 * Internet. Elle se retire seule des que l'heure est juste (verification toutes les 15 s pendant le blocage). Son
 * affichage est trace (poste, utilisateur). Le serveur refuse de son cote toute ecriture (423) pendant le blocage :
 * une reponse 423 relance aussitot la verification. Pendant une regularisation a date passee, bandeau permanent.
 */
(function () {
    'use strict';

    var URL = '../api/v1/horloge/etat';
    var REGLAGE = {periode: 300000};
    var minuteur = null, arrete = false, masqueeJusqua = 0;
    var BLOCAGE = {periode: 15000};
    var minuteurBlocage = null, blocageTrace = false;
    /* dernier compte rendu de « Mettre a jour » : garde quand le toast est redessine (verification suivante) */
    var compteRendu = null;

    var esc = function (s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c];
        });
    };

    function styles() {
        if (document.getElementById('phr-styles')) {
            return;
        }
        var st = document.createElement('style');
        st.id = 'phr-styles';
        st.textContent = '#phr-toast{position:fixed;right:16px;bottom:16px;z-index:30001;width:460px;max-width:calc(100vw - 32px);animation:phr-arrivee .25s ease-out}'
                + '@keyframes phr-arrivee{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}'
                + '#phr-toast .phr-cadre{display:flex;align-items:flex-start;flex-wrap:wrap;gap:8px 12px;padding:10px 12px 10px 14px;border-radius:10px;'
                + 'box-shadow:0 10px 28px rgba(15,23,42,.22),0 2px 6px rgba(15,23,42,.12);'
                + 'background:#fdecec;border:1px solid #e8a1a1;font:13px "Segoe UI",Arial,sans-serif;color:#8a1c1c}'
                + '#phr-toast .phr-ic{width:30px;height:30px;flex:0 0 30px;border-radius:50%;display:grid;place-items:center;background:#c0392b;color:#fff;font-size:15px}'
                + '#phr-toast .phr-txt{flex:1 1 300px;min-width:0;line-height:1.35}'
                + '#phr-toast .phr-txt ul{margin:4px 0 0 16px;padding:0}#phr-toast .phr-txt li{margin:2px 0}'
                + '#phr-toast .phr-raison{display:block;margin-top:4px;font-size:12px;opacity:.9}'
                + '#phr-toast .phr-actions{display:flex;gap:8px;margin-left:auto;align-self:flex-end}'
                + '#phr-toast button{font:inherit;border-radius:7px;padding:5px 11px;cursor:pointer;white-space:nowrap}'
                + '#phr-toast [data-phr="mettre-a-jour"]{background:#1e3a5f;color:#fff;border:1px solid #1e3a5f;font-weight:600}'
                + '#phr-toast [data-phr="mettre-a-jour"][disabled]{opacity:.7;cursor:default}'
                + '#phr-toast [data-phr="masquer"]{background:transparent;color:inherit;border:1px solid currentColor;opacity:.8}'
                + '#phr-toast button:focus-visible{outline:2px solid #f2b84b;outline-offset:2px}';
        document.head.appendChild(st);
    }

    function retirer() {
        var t = document.getElementById('phr-toast');
        if (t) {
            t.parentNode.removeChild(t);
        }
    }

    /* au-dessus du toast WhatsApp s'il est affiche */
    function placer() {
        var t = document.getElementById('phr-toast'), w = document.getElementById('pwa-banniere');
        if (t) {
            t.style.bottom = (w ? w.getBoundingClientRect().height + 28 : 16) + 'px';
        }
    }

    function raison(t) {
        var r = document.querySelector('#phr-toast .phr-raison');
        if (r) {
            r.textContent = t;
        }
    }

    function afficher(messages, serveur) {
        styles();
        var html = '<div class="phr-cadre" role="alert"><span class="phr-ic"><i class="fa fa-clock-o"></i></span><span class="phr-txt">'
                + '<b>La date ou l\'heure n\'est pas bonne.</b><ul>' + messages.map(function (m) {
                    return '<li>' + esc(m) + '</li>';
                }).join('') + '</ul><span class="phr-raison"></span></span><span class="phr-actions">'
                + '<button type="button" data-phr="mettre-a-jour">Mettre à jour</button>'
                + '<button type="button" data-phr="masquer">Masquer</button></span></div>';
        var t = document.getElementById('phr-toast');
        if (t && t.querySelector('[data-phr="mettre-a-jour"][disabled]')) {
            return; /* synchronisation en cours : le compte rendu reste affiche */
        }
        if (!t) {
            t = document.createElement('div');
            t.id = 'phr-toast';
            document.body.appendChild(t);
            t.addEventListener('click', function (ev) {
                var a = ev.target.closest ? ev.target.closest('[data-phr]') : null;
                if (!a) {
                    return;
                }
                if (a.getAttribute('data-phr') === 'masquer') {
                    masqueeJusqua = Date.now() + REGLAGE.periode - 1000;
                    retirer();
                } else if (!a.disabled) {
                    mettreAJour(a, t.getAttribute('data-serveur') === '1');
                }
            });
        }
        t.innerHTML = html;
        t.setAttribute('data-serveur', serveur ? '1' : '0');
        if (compteRendu && Date.now() - compteRendu.le < REGLAGE.periode) {
            raison(compteRendu.texte);
            if (compteRendu.ok) {
                t.querySelector('[data-phr="mettre-a-jour"]').textContent = 'Mis à jour';
            }
        }
        placer();
    }

    function mettreAJour(bouton, serveur) {
        bouton.disabled = true;
        bouton.textContent = 'Mise à jour…';
        Ext.Ajax.request({url: '../api/v1/horloge/synchroniser', method: 'POST', timeout: 90000,
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                compteRendu = {texte: o.msg || (o.success ? 'Heure synchronisée.' : 'Synchronisation impossible.'), ok: !!o.success, le: Date.now()};
                bouton.disabled = false;
                bouton.textContent = o.success ? 'Mis à jour' : 'Mettre à jour';
                raison(compteRendu.texte);
                setTimeout(verifier, 1500);
            },
            failure: function () {
                bouton.disabled = false;
                bouton.textContent = 'Mettre à jour';
                raison('Synchronisation impossible (serveur injoignable).');
            }});
    }

    function verifier() {
        if (arrete || !window.Ext || !Ext.Ajax) {
            return;
        }
        Ext.Ajax.request({url: URL, method: 'GET', timeout: 20000,
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                if (o.success === false) {
                    arrete = true; /* deconnecte */
                    clearInterval(minuteur);
                    retirer();
                    return;
                }
                var b = o.blocage || {};
                bandeauRegularisation(!!b.regularisation);
                if (b.bloque) {
                    afficherBlocage(b);
                    return;
                }
                retirerBlocage();
                var messages = (o.anomalies || []).map(function (a) {
                    return a.message;
                }), serveur = messages.length > 0;
                if (!messages.length) {
                    retirer();
                    return;
                }
                if (Date.now() < masqueeJusqua) {
                    return;
                }
                afficher(messages, serveur);
            }
        });
    }

    /* ------------------------------------------------------------------ blocage (cahier du 24/11) */

    function stylesBlocage() {
        if (document.getElementById('phb-styles')) {
            return;
        }
        var st = document.createElement('style');
        st.id = 'phb-styles';
        st.textContent = '#phb-voile{position:fixed;inset:0;z-index:2147483000;background:rgba(15,23,42,.72);display:grid;place-items:center;font:14px "Segoe UI",Arial,sans-serif}'
                + '#phb-voile .phb-cadre{width:560px;max-width:calc(100vw - 32px);background:#fff;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,.35);overflow:hidden}'
                + '#phb-voile .phb-titre{background:#c0392b;color:#fff;padding:14px 18px;font-size:17px;font-weight:600;display:flex;gap:10px;align-items:center}'
                + '#phb-voile .phb-corps{padding:16px 18px;color:#1f2937;line-height:1.45}'
                + '#phb-voile .phb-corps ul{margin:6px 0 10px 18px;padding:0}'
                + '#phb-voile .phb-heures{display:grid;grid-template-columns:auto 1fr;gap:2px 12px;margin:8px 0;padding:8px 10px;background:#f3f4f6;border-radius:8px}'
                + '#phb-voile .phb-heures b{font-variant-numeric:tabular-nums}'
                + '#phb-voile .phb-aide{font-size:13px;color:#4b5563}'
                + '#phb-voile .phb-raison{display:block;min-height:18px;margin-top:8px;font-size:13px;color:#8a1c1c}'
                + '#phb-voile .phb-actions{padding:0 18px 16px;display:flex;justify-content:flex-end}'
                + '#phb-voile button{font:inherit;font-weight:600;border-radius:8px;padding:8px 16px;cursor:pointer;background:#1e3a5f;color:#fff;border:1px solid #1e3a5f}'
                + '#phb-voile button[disabled]{opacity:.7;cursor:default}'
                + '#phb-voile button:focus-visible{outline:3px solid #f2b84b;outline-offset:2px}'
                + '#phb-bandeau{position:fixed;top:0;left:0;right:0;z-index:2147482000;background:#b45309;color:#fff;text-align:center;padding:4px 12px;font:600 13px "Segoe UI",Arial,sans-serif;pointer-events:none}';
        document.head.appendChild(st);
    }

    /* touches gardees dans la fenetre : Tab et Entree sur son bouton ; rien ne va a l'application */
    function clavier(ev) {
        var v = document.getElementById('phb-voile');
        if (!v) {
            return;
        }
        var bouton = v.querySelector('button');
        if (ev.key === 'Tab') {
            ev.preventDefault();
            bouton.focus();
        } else if ((ev.key === 'Enter' || ev.key === ' ') && document.activeElement === bouton) {
            return;
        } else {
            ev.preventDefault();
        }
        ev.stopPropagation();
    }

    function afficherBlocage(b) {
        stylesBlocage();
        var v = document.getElementById('phb-voile');
        var contenu = '<div class="phb-cadre" role="alertdialog" aria-modal="true" aria-labelledby="phb-titre">'
                + '<div class="phb-titre" id="phb-titre"><i class="fa fa-clock-o"></i>Prestige est bloqué : la date ou l\'heure du serveur est fausse</div>'
                + '<div class="phb-corps"><ul>' + (b.messages || []).map(function (m) {
                    return '<li>' + esc(m) + '</li>';
                }).join('') + '</ul>'
                + '<div class="phb-heures"><span>Heure du serveur</span><b data-phb="serveur">' + esc(b.serveur) + '</b>'
                + (b.heureReelle ? '<span>Heure réelle</span><b data-phb="reelle">' + esc(b.heureReelle) + '</b>' : '') + '</div>'
                + '<div class="phb-aide">Aucune opération n\'est possible tant que l\'heure n\'est pas juste. Faites « Mettre à jour ». '
                + 'Sans Internet, appelez l\'administrateur : il remet la date et l\'heure dans Windows. '
                + 'Prestige se débloque seul dès que l\'heure est juste.</div>'
                + '<span class="phb-raison" data-phb="raison"></span></div>'
                + '<div class="phb-actions"><button type="button" data-phb="mettre-a-jour">Mettre à jour</button></div></div>';
        if (!v) {
            v = document.createElement('div');
            v.id = 'phb-voile';
            document.body.appendChild(v);
            v.addEventListener('click', function (ev) {
                var a = ev.target.closest ? ev.target.closest('[data-phb="mettre-a-jour"]') : null;
                if (a && !a.disabled) {
                    mettreAJourBlocage(a);
                }
                ev.stopPropagation();
            });
            document.addEventListener('keydown', clavier, true);
            document.addEventListener('keypress', clavier, true);
        } else if (v.querySelector('[data-phb="mettre-a-jour"][disabled]')) {
            return; /* mise a jour en cours */
        }
        var avant = v.querySelector('[data-phb="raison"]');
        avant = avant ? avant.textContent : '';
        v.innerHTML = contenu;
        v.querySelector('[data-phb="raison"]').textContent = avant;
        v.querySelector('button').focus();
        retirer(); /* le toast n'a plus lieu d'etre */
        if (!blocageTrace) {
            blocageTrace = true;
            Ext.Ajax.request({url: '../api/v1/horloge/affichage', method: 'POST'});
        }
        if (!minuteurBlocage) {
            minuteurBlocage = setInterval(verifier, BLOCAGE.periode);
        }
    }

    function retirerBlocage() {
        var v = document.getElementById('phb-voile');
        if (v) {
            v.parentNode.removeChild(v);
            document.removeEventListener('keydown', clavier, true);
            document.removeEventListener('keypress', clavier, true);
        }
        blocageTrace = false;
        if (minuteurBlocage) {
            clearInterval(minuteurBlocage);
            minuteurBlocage = null;
        }
    }

    function mettreAJourBlocage(bouton) {
        var raisonEl = document.querySelector('#phb-voile [data-phb="raison"]');
        bouton.disabled = true;
        bouton.textContent = 'Mise à jour…';
        Ext.Ajax.request({url: '../api/v1/horloge/synchroniser', method: 'POST', timeout: 90000,
            success: function (r) {
                var o = Ext.decode(r.responseText, true) || {};
                bouton.disabled = false;
                bouton.textContent = 'Mettre à jour';
                if (raisonEl) {
                    raisonEl.textContent = o.msg || (o.success ? 'Mise à jour demandée.' : 'Mise à jour impossible.');
                }
                setTimeout(verifier, 1500);
            },
            failure: function () {
                bouton.disabled = false;
                bouton.textContent = 'Mettre à jour';
                if (raisonEl) {
                    raisonEl.textContent = 'Mise à jour impossible (serveur injoignable).';
                }
            }});
    }

    function bandeauRegularisation(actif) {
        var d = document.getElementById('phb-bandeau');
        if (actif && !d) {
            stylesBlocage();
            d = document.createElement('div');
            d.id = 'phb-bandeau';
            d.setAttribute('role', 'status');
            d.textContent = 'Régularisation à date passée en cours : chaque opération saisie est marquée « saisie en régularisation ».';
            document.body.appendChild(d);
        } else if (!actif && d) {
            d.parentNode.removeChild(d);
        }
    }

    /* toute ecriture refusee par le serveur pour l'heure (423) : la fenetre s'affiche aussitot */
    (function ecouter() {
        if (window.Ext && Ext.Ajax && Ext.Ajax.on) {
            Ext.Ajax.on('requestexception', function (conn, response) {
                if (response && response.status === 423) {
                    verifier();
                }
            });
        } else {
            setTimeout(ecouter, 500);
        }
    })();

    /* essai du 24/11 : les ecrans qui appellent fetch (et non Ext.Ajax) doivent aussi reafficher la fenetre */
    if (window.fetch && !window.fetch.phbEcoute) {
        var fetchAvant = window.fetch;
        var fetchEcoute = function () {
            return fetchAvant.apply(this, arguments).then(function (rep) {
                if (rep && rep.status === 423) {
                    setTimeout(verifier, 0);
                }
                return rep;
            });
        };
        fetchEcoute.phbEcoute = true;
        window.fetch = fetchEcoute;
    }

    window.PrestigeAlerteHorloge = {verifier: verifier, reglage: REGLAGE, blocage: BLOCAGE};

    /* apres l'ouverture de l'application, puis toutes les 5 minutes */
    (function attendre() {
        if (window.Ext && Ext.Ajax && window.testextjs && testextjs.app) {
            setTimeout(verifier, 4000);
            minuteur = setInterval(verifier, REGLAGE.periode);
        } else {
            setTimeout(attendre, 500);
        }
    })();
})();
