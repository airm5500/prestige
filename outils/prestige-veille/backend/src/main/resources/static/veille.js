/* Prestige Veille : tableau de bord (aucune bibliotheque externe : fonctionne sans internet). */
(function () {
    'use strict';
    var $ = function (id) {
        return document.getElementById(id);
    };
    var etat = {onglet: 'ensemble', cibles: [], minuteur: null};

    function esc(v) {
        return String(v === null || v === undefined ? '' : v).replace(/[&<>"']/g, function (c) {
            return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c];
        });
    }
    function nombre(v, dec) {
        if (v === null || v === undefined || v === '' || isNaN(v)) {
            return '—';
        }
        return Number(v).toLocaleString('fr-FR', {maximumFractionDigits: dec === undefined ? 0 : dec});
    }
    function date(v) {
        return v ? String(v).replace('T', ' ').substring(0, 16) : '';
    }
    function jeton() {
        var m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
        return m ? decodeURIComponent(m[1]) : '';
    }
    function api(methode, chemin, corps) {
        var o = {method: methode, credentials: 'same-origin', headers: {'Content-Type': 'application/json'}};
        if (methode !== 'GET') {
            o.headers['X-XSRF-TOKEN'] = jeton();
        }
        if (corps !== undefined) {
            o.body = JSON.stringify(corps);
        }
        return fetch(chemin, o).then(function (r) {
            return r.text().then(function (t) {
                var d = t ? JSON.parse(t) : {};
                if (r.status === 401) {
                    afficher('connexion');
                    throw new Error(d.message || 'Session expirée');
                }
                if (r.status === 403 && d.motDePasseAChanger) {
                    afficher('changement');
                    throw new Error(d.message);
                }
                if (!r.ok) {
                    throw new Error(d.message || ('Erreur ' + r.status));
                }
                return d;
            });
        });
    }

    function afficher(ecran) {
        ['connexion', 'changement', 'application'].forEach(function (e) {
            $(e).hidden = e !== ecran;
        });
        if (ecran === 'application') {
            demarrer();
        } else if (etat.minuteur) {
            clearInterval(etat.minuteur);
            etat.minuteur = null;
        }
    }

    /* ---------------------------------------------------------------- connexion */
    $('formConnexion').addEventListener('submit', function (e) {
        e.preventDefault();
        $('erreurConnexion').textContent = '';
        api('GET', '/api/etat').then(function () {
            return api('POST', '/api/connexion', {login: $('login').value, motDePasse: $('motDePasse').value});
        }).then(function (moi) {
            afficher(moi.motDePasseAChanger ? 'changement' : 'application');
        }).catch(function (x) {
            $('erreurConnexion').textContent = x.message;
        });
    });
    $('formChangement').addEventListener('submit', function (e) {
        e.preventDefault();
        $('erreurChangement').textContent = '';
        api('POST', '/api/motdepasse', {actuel: $('mdpActuel').value, nouveau: $('mdpNouveau').value}).then(function () {
            afficher('application');
        }).catch(function (x) {
            $('erreurChangement').textContent = x.message;
        });
    });
    $('deconnexion').addEventListener('click', function () {
        api('POST', '/api/deconnexion').finally(function () {
            afficher('connexion');
        });
    });

    /* ---------------------------------------------------------------- onglets */
    $('onglets').addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b) {
            return;
        }
        Array.prototype.forEach.call($('onglets').children, function (x) {
            x.classList.toggle('actif', x === b);
        });
        etat.onglet = b.dataset.onglet;
        document.querySelectorAll('.onglet').forEach(function (s) {
            s.hidden = s.id !== 'onglet-' + etat.onglet;
        });
        charger();
    });

    function demarrer() {
        charger();
        if (!etat.minuteur) {
            etat.minuteur = setInterval(function () {
                if (!document.hidden && ['ensemble', 'courbes', 'experience'].indexOf(etat.onglet) >= 0) {
                    charger();
                }
            }, 30000);
        }
    }

    function charger() {
        api('GET', '/api/tableau').then(tableau).catch(function () {});
        if (etat.onglet === 'courbes') {
            courbes();
        } else if (etat.onglet === 'experience') {
            experience();
        } else if (etat.onglet === 'incidents') {
            incidents();
        } else if (etat.onglet === 'journal') {
            journal();
        } else if (etat.onglet === 'reglages' && !$('formReglages').dataset.charge) {
            reglages();
        }
    }

    /* ---------------------------------------------------------------- vue d'ensemble */
    function tableau(t) {
        etat.cibles = t.cibles;
        $('derniereSonde').textContent = t.derniereSonde ? 'Dernière sonde ' + t.derniereSonde.substring(11) : 'Première sonde en cours…';
        var ko = t.ouverts.filter(function (i) {
            return i.NATURE === 'PANNE';
        }).length, att = t.ouverts.length - ko;
        $('pastilleGlobale').className = 'pastille ' + (ko ? 'ko' : att ? 'attention' : 'ok');
        $('bandeauIncidents').innerHTML = t.ouverts.length
                ? '<div class="bandeau"><b>' + t.ouverts.length + ' incident(s) en cours</b><br>' + t.ouverts.map(function (i) {
                    return esc(date(i.DEBUT)) + ' — ' + esc(i.MESSAGE);
                }).join('<br>') + '</div>'
                : '<div class="bandeau calme">Tout fonctionne. Aucun incident en cours.</div>';
        var seuils = {};
        t.ouverts.forEach(function (i) {
            seuils[i.CIBLE] = i.NATURE;
        });
        $('tuiles').innerHTML = t.cibles.map(function (c) {
            var cls = !c.OK ? 'ko' : seuils[c.CIBLE] ? 'attention' : '';
            var v = [];
            if (c.MS !== null) {
                v.push(['Réponse', nombre(c.MS) + ' ms']);
            }
            if (c.MEMOIRE_PCT !== null) {
                v.push(['Mémoire Java', nombre(c.MEMOIRE_PCT) + ' %']);
            }
            if (c.POOL_MS !== null) {
                v.push(['Pool', c.POOL_MS < 0 ? 'en échec' : nombre(c.POOL_MS) + ' ms']);
            }
            if (c.FILS_HTTP !== null) {
                v.push(['Requêtes en cours', nombre(c.FILS_HTTP)]);
            }
            if (c.BDD_CONNEXIONS !== null) {
                v.push(['Connexions base', nombre(c.BDD_CONNEXIONS) + (c.BDD_PIC !== null ? ' (pic ' + nombre(c.BDD_PIC) + ')' : '')]);
            }
            if (c.APPEL_MOYEN_MS !== null) {
                v.push(['Appel moyen (1 h)', nombre(c.APPEL_MOYEN_MS) + ' ms']);
            }
            if (c.CPU_MACHINE !== null) {
                v.push(['Processeur', nombre(c.CPU_MACHINE) + ' %']);
            }
            if (c.RAM_LIBRE_MO !== null) {
                v.push(['Mémoire libre', nombre(c.RAM_LIBRE_MO) + ' Mo']);
            }
            if (c.DISQUE_LIBRE_MO !== null) {
                v.push(['Disque libre', nombre(c.DISQUE_LIBRE_MO / 1024, 1) + ' Go']);
            }
            return '<div class="tuile ' + cls + '" data-cible="' + esc(c.CIBLE) + '"><div class="nom">' + esc(c.CIBLE)
                    + '<span class="etat">' + (!c.OK ? 'EN PANNE' : seuils[c.CIBLE] ? 'ATTENTION' : 'OK') + '</span></div>'
                    + '<div class="valeurs">' + v.map(function (x) {
                        return '<span>' + x[0] + '<br><b>' + x[1] + '</b></span>';
                    }).join('') + '</div>' + (c.DETAIL ? '<div class="detail">' + esc(c.DETAIL) + '</div>' : '') + '</div>';
        }).join('') || '<p class="discret">Les premières mesures arrivent dans quelques secondes.</p>';
        $('disponibilite').tBodies[0].innerHTML = t.disponibilite24h.map(function (d) {
            var p = Number(d.DISPONIBILITE);
            return '<tr><td>' + esc(d.CIBLE) + '</td><td style="color:' + (p >= 99.5 ? 'var(--vert)' : p >= 95 ? 'var(--orange)' : 'var(--rouge)')
                    + ';font-weight:700">' + nombre(p, 2) + ' %</td><td>' + (d.MS_MOYEN === null ? '—' : nombre(d.MS_MOYEN) + ' ms') + '</td><td>' + nombre(d.MESURES) + '</td></tr>';
        }).join('');
        var sel = $('cibleCourbes'), courante = sel.value;
        sel.innerHTML = t.cibles.map(function (c) {
            return '<option>' + esc(c.CIBLE) + '</option>';
        }).join('');
        if (courante) {
            sel.value = courante;
        }
        $('etatRedemarrageAuto').textContent = 'Redémarrage automatique du service Payara : ' + (t.redemarrageAuto ? 'ACTIVÉ' : 'désactivé (Réglages > Actions)') + '.';
    }
    $('tuiles').addEventListener('click', function (e) {
        var t = e.target.closest('.tuile');
        if (t) {
            $('cibleCourbes').value = t.dataset.cible;
            document.querySelector('[data-onglet="courbes"]').click();
        }
    });

    /* ---------------------------------------------------------------- courbes (SVG) */
    function courbe(titre, unite, points, couleur, options) {
        options = options || {};
        var l = 520, h = 180, g = 46, d = 8, hh = 14, b = 24;
        var valeurs = points.filter(function (p) {
            return p.v !== null && p.v !== undefined && !isNaN(p.v);
        });
        if (!valeurs.length) {
            return '<div class="courbe"><h3>' + esc(titre) + '</h3><div class="vide">Pas de mesure sur la période</div></div>';
        }
        var t0 = points[0].t, t1 = points[points.length - 1].t, dt = Math.max(1, t1 - t0);
        var max = options.max || Math.max.apply(null, valeurs.map(function (p) {
            return p.v;
        }));
        max = max <= 0 ? 1 : max * 1.1;
        var x = function (t) {
            return g + (t - t0) / dt * (l - g - d);
        }, y = function (v) {
            return h - b - v / max * (h - b - hh);
        };
        var s = '<svg viewBox="0 0 ' + l + ' ' + h + '" preserveAspectRatio="none" data-points=\'' + esc(JSON.stringify(points.map(function (p) {
            return [p.t, p.v, p.ok];
        }))) + '\' data-unite="' + esc(unite) + '" data-g="' + g + '" data-d="' + d + '">';
        for (var i = 0; i <= 4; i++) {
            var v = max / 1.1 * i / 4, yy = y(v);
            s += '<line x1="' + g + '" x2="' + (l - d) + '" y1="' + yy + '" y2="' + yy + '" stroke="#eef1f4"/>'
                    + '<text x="' + (g - 4) + '" y="' + (yy + 4) + '" font-size="10" text-anchor="end" fill="#7f8c8d">' + nombre(v, v < 10 ? 1 : 0) + '</text>';
        }
        /* pannes : bandes rouges */
        points.forEach(function (p, k) {
            if (p.ok === false) {
                var x1 = x(p.t), x2 = k + 1 < points.length ? x(points[k + 1].t) : x1 + 3;
                s += '<rect x="' + x1 + '" y="' + hh + '" width="' + Math.max(2, x2 - x1) + '" height="' + (h - b - hh) + '" fill="#fadbd8"/>';
            }
        });
        var chemin = '', debut = true;
        points.forEach(function (p) {
            if (p.v === null || p.v === undefined || isNaN(p.v)) {
                debut = true;
                return;
            }
            chemin += (debut ? 'M' : 'L') + x(p.t).toFixed(1) + ',' + y(p.v).toFixed(1);
            debut = false;
        });
        s += '<path d="' + chemin + '" fill="none" stroke="' + couleur + '" stroke-width="1.8"/>';
        [t0, t0 + dt / 2, t1].forEach(function (t, k) {
            var dd = new Date(t), lib = dt > 48 * 3600e3 ? dd.toLocaleDateString('fr-FR', {day: '2-digit', month: '2-digit'}) + ' ' : '';
            lib += dd.toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'});
            s += '<text x="' + x(t) + '" y="' + (h - 6) + '" font-size="10" fill="#7f8c8d" text-anchor="' + ['start', 'middle', 'end'][k] + '">' + lib + '</text>';
        });
        s += '<line class="curseur" x1="0" x2="0" y1="' + hh + '" y2="' + (h - b) + '" stroke="#5d6d7e" stroke-dasharray="3,3" visibility="hidden"/></svg>';
        var dernier = valeurs[valeurs.length - 1].v, moyenne = valeurs.reduce(function (a, p) {
            return a + p.v;
        }, 0) / valeurs.length;
        return '<div class="courbe"><h3>' + esc(titre) + '<span>actuel ' + nombre(dernier, 1) + ' ' + esc(unite) + ' · moyenne '
                + nombre(moyenne, 1) + ' · pire ' + nombre(max / 1.1, 1) + '</span></h3>' + s + '</div>';
    }

    /* infobulle des courbes */
    document.addEventListener('mousemove', function (e) {
        var svg = e.target.closest && e.target.closest('.courbe svg'), bulle = $('infobulle');
        document.querySelectorAll('.courbe .curseur').forEach(function (c) {
            if (!svg || c.ownerSVGElement !== svg) {
                c.setAttribute('visibility', 'hidden');
            }
        });
        if (!svg) {
            bulle.hidden = true;
            return;
        }
        var pts = JSON.parse(svg.dataset.points), r = svg.getBoundingClientRect(), g = Number(svg.dataset.g), d = Number(svg.dataset.d);
        var fx = ((e.clientX - r.left) / r.width * 520 - g) / (520 - g - d);
        var t0 = pts[0][0], t1 = pts[pts.length - 1][0], t = t0 + fx * (t1 - t0), meilleur = pts[0];
        pts.forEach(function (p) {
            if (Math.abs(p[0] - t) < Math.abs(meilleur[0] - t)) {
                meilleur = p;
            }
        });
        var c = svg.querySelector('.curseur'), cx = g + (meilleur[0] - t0) / Math.max(1, t1 - t0) * (520 - g - d);
        c.setAttribute('x1', cx);
        c.setAttribute('x2', cx);
        c.setAttribute('visibility', 'visible');
        bulle.hidden = false;
        bulle.style.left = (e.clientX + 12) + 'px';
        bulle.style.top = (e.clientY + 12) + 'px';
        bulle.innerHTML = esc(new Date(meilleur[0]).toLocaleString('fr-FR')) + '<br><b>' + (meilleur[2] === false ? 'EN PANNE' : nombre(meilleur[1], 1) + ' ' + esc(svg.dataset.unite)) + '</b>';
    });

    function points(serie, champ, facteur) {
        return serie.map(function (m) {
            var v = m[champ];
            return {t: new Date(String(m.QUAND).replace(' ', 'T')).getTime(), v: v === null || v === undefined ? null : Number(v) * (facteur || 1), ok: m.OK};
        });
    }

    function courbes() {
        var cible = $('cibleCourbes').value;
        if (!cible) {
            return;
        }
        api('GET', '/api/serie?cible=' + encodeURIComponent(cible) + '&heures=' + $('periodeCourbes').value).then(function (s) {
            var h = s.some(function (m) {
                return m.MS !== null;
            }) ? [courbe('Temps de réponse', 'ms', points(s, 'MS'), '#1f6fb2')] : [];
            if (s.some(function (m) {
                return m.MEMOIRE_PCT !== null;
            })) {
                h.push(courbe('Mémoire du serveur Java', '%', points(s, 'MEMOIRE_PCT'), '#7d3c98', {max: 100}),
                        courbe('Pool de connexions (temps d\'obtention)', 'ms', points(s, 'POOL_MS'), '#117a65'),
                        courbe('Requêtes en cours de traitement', '', points(s, 'FILS_HTTP'), '#d68910'),
                        courbe('Processeur du serveur Java', '%', points(s, 'CPU_SERVEUR'), '#c0392b', {max: 100}));
            }
            if (s.some(function (m) {
                return m.BDD_CONNEXIONS !== null;
            })) {
                h.push(courbe('Connexions à la base', '', points(s, 'BDD_CONNEXIONS'), '#2e86c1'),
                        courbe('Pic de connexions (depuis le démarrage de MariaDB)', '', points(s, 'BDD_PIC'), '#5b2c6f'));
            }
            if (s.some(function (m) {
                return m.CPU_MACHINE !== null;
            })) {
                h.push(courbe('Processeur de la machine', '%', points(s, 'CPU_MACHINE'), '#c0392b', {max: 100}),
                        courbe('Mémoire libre de la machine', 'Mo', points(s, 'RAM_LIBRE_MO'), '#1e8449'),
                        courbe('Espace disque libre', 'Go', points(s, 'DISQUE_LIBRE_MO', 1 / 1024), '#7f8c8d'));
            }
            $('courbes').innerHTML = h.join('');
        });
    }
    $('cibleCourbes').addEventListener('change', courbes);
    $('periodeCourbes').addEventListener('change', courbes);

    function experience() {
        api('GET', '/api/serie?cible=' + encodeURIComponent('Prestige (serveur)') + '&heures=' + $('periodeExperience').value).then(function (s) {
            $('courbesExperience').innerHTML = [courbe('Ouverture d\'un écran (moyenne de l\'heure)', 'ms', points(s, 'ECRAN_MOYEN_MS'), '#1f6fb2'),
                courbe('Appel au serveur (moyenne de l\'heure)', 'ms', points(s, 'APPEL_MOYEN_MS'), '#117a65'),
                courbe('Erreurs (appels en échec et erreurs JavaScript, dernière heure)', '', points(s, 'ERREURS'), '#c0392b'),
                courbe('Disponibilité de Prestige (temps de réponse)', 'ms', points(s, 'MS'), '#5d6d7e')].join('');
        });
    }
    $('periodeExperience').addEventListener('change', experience);

    /* ---------------------------------------------------------------- incidents, journal */
    function incidents() {
        api('GET', '/api/incidents?jours=' + $('periodeIncidents').value).then(function (l) {
            $('incidents').tBodies[0].innerHTML = l.map(function (i) {
                var m = Number(i.MINUTES), duree = m >= 60 ? Math.floor(m / 60) + ' h ' + (m % 60) + ' min' : m + ' min';
                return '<tr class="' + (i.FIN ? '' : 'ouvert') + '"><td>' + esc(date(i.DEBUT)) + '</td><td>' + (i.FIN ? esc(date(i.FIN)) : '<b>en cours</b>')
                        + '</td><td>' + duree + '</td><td>' + esc(i.CIBLE) + '</td><td><span class="badge ' + esc(i.GRAVITE) + '">'
                        + (i.NATURE === 'PANNE' ? 'Panne' : 'Seuil') + '</span></td><td>' + esc(i.MESSAGE) + '</td></tr>';
            }).join('') || '<tr><td colspan="6" class="discret">Aucun incident sur la période.</td></tr>';
        });
    }
    $('periodeIncidents').addEventListener('change', incidents);

    function journal() {
        api('GET', '/api/journal').then(function (l) {
            $('journal').tBodies[0].innerHTML = l.map(function (j) {
                return '<tr><td>' + esc(date(j.QUAND)) + '</td><td>' + esc(j.UTILISATEUR) + '</td><td>' + esc(j.ACTION) + '</td><td>' + esc(j.RESULTAT) + '</td></tr>';
            }).join('');
        });
    }

    /* ---------------------------------------------------------------- actions (confirmation dans le bouton) */
    document.querySelectorAll('[data-action]').forEach(function (b) {
        b.dataset.texte = b.textContent;
        b.addEventListener('click', function () {
            if (b.dataset.confirmer && !b.classList.contains('confirmer')) {
                b.classList.add('confirmer');
                b.textContent = b.dataset.confirmer;
                setTimeout(function () {
                    b.classList.remove('confirmer');
                    b.textContent = b.dataset.texte;
                }, 5000);
                return;
            }
            b.classList.remove('confirmer');
            b.textContent = b.dataset.texte;
            b.disabled = true;
            $('resultatAction').textContent = 'En cours…';
            api('POST', '/api/actions/' + b.dataset.action).then(function (r) {
                $('resultatAction').textContent = r.resultat;
            }).catch(function (x) {
                $('resultatAction').textContent = x.message;
            }).finally(function () {
                b.disabled = false;
            });
        });
    });
    $('sonder').addEventListener('click', function () {
        $('sonder').disabled = true;
        api('POST', '/api/sonder').then(tableau).finally(function () {
            $('sonder').disabled = false;
            charger();
        });
    });

    /* ---------------------------------------------------------------- reglages (secrets en ecriture seule) */
    function reglages() {
        api('GET', '/api/reglages').then(function (l) {
            var groupes = {};
            l.forEach(function (r) {
                (groupes[r.groupe] = groupes[r.groupe] || []).push(r);
            });
            $('formReglages').innerHTML = Object.keys(groupes).map(function (g) {
                return '<fieldset><legend>' + esc(g) + '</legend>' + groupes[g].map(function (r) {
                    var id = 'r-' + r.cle.replace(/\./g, '-'), champ = r.cle === 'postes'
                            ? '<textarea id="' + id + '" data-cle="' + esc(r.cle) + '" placeholder="CAISSE1=http://192.168.1.11:8080/prestige">' + esc(r.valeur) + '</textarea>'
                            : '<input id="' + id + '" data-cle="' + esc(r.cle) + '" ' + (r.secret ? 'type="password" autocomplete="new-password" placeholder="'
                                    + (r.renseigne ? '(renseigné : laisser vide pour le garder)' : '(non renseigné)') + '"' : 'value="' + esc(r.valeur) + '"') + '>';
                    return '<div class="ligne"><label for="' + id + '">' + esc(r.libelle) + '</label>' + champ + '</div>';
                }).join('') + '</fieldset>';
            }).join('');
            $('formReglages').dataset.charge = '1';
        });
    }
    $('enregistrerReglages').addEventListener('click', function () {
        var v = {};
        document.querySelectorAll('#formReglages [data-cle]').forEach(function (c) {
            v[c.dataset.cle] = c.value;
        });
        api('PUT', '/api/reglages', v).then(function (r) {
            $('resultatReglages').textContent = r.modifies + ' réglage(s) enregistré(s).';
            delete $('formReglages').dataset.charge;
            reglages();
        }).catch(function (x) {
            $('resultatReglages').textContent = x.message;
        });
    });

    /* ---------------------------------------------------------------- demarrage */
    api('GET', '/api/moi').then(function (moi) {
        afficher(moi.motDePasseAChanger ? 'changement' : 'application');
    }).catch(function () {
        afficher('connexion');
    });
})();
