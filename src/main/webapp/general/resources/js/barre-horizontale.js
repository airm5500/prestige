/* global Ext */
/*
 * Barre de defilement horizontale des grilles (demande du 25/10, option 3 de la maquette D : « flottante en bas de
 * l'ecran »).
 *
 * Seulement quand une grille deborde en largeur (plus de colonnes que de place) : la barre native du bas est cachee et
 * remplacee par une barre toujours visible, collee au bas de la grille, ou au bas de l'ecran quand la grille descend
 * plus bas que l'ecran. Fleches ◀ ▶ (un ecran de colonnes), pouce a faire glisser, clic sur la piste, et la position
 * « Colonnes 4–11 sur 18 ». Maj + molette continue de marcher. Une grille qui tient en largeur n'est pas touchee.
 * Ecrans exclus : liste DEFILEMENT_EXCLUS de correctifs-affichage.js (xtype de la grille ou d'un de ses parents).
 */
(function () {
    'use strict';

    var HAUTEUR = 34;
    var barres = {};
    var demande = false;

    function exclus(vue) {
        var liste = (window.PrestigeAffichage && window.PrestigeAffichage.DEFILEMENT_EXCLUS) || [];
        if (!liste.length || !window.Ext) {
            return false;
        }
        var c = Ext.getCmp(vue.id);
        while (c) {
            if (liste.indexOf(c.xtype) >= 0) {
                return true;
            }
            c = c.ownerCt || (c.up ? c.up() : null);
        }
        return false;
    }

    function colonnes(vue) {
        var c = window.Ext ? Ext.getCmp(vue.id) : null, g = c && (c.ownerCt || c.up('tablepanel'));
        var h = g && g.headerCt, l = h && h.getVisibleGridColumns ? h.getVisibleGridColumns() : [];
        var x = 0;
        return l.map(function (col) {
            var w = col.getWidth(), r = {g: x, d: x + w};
            x += w;
            return r;
        });
    }

    function creer(vue) {
        var b = document.createElement('div');
        b.className = 'pbh-barre';
        b.setAttribute('role', 'scrollbar');
        b.setAttribute('aria-orientation', 'horizontal');
        b.setAttribute('aria-label', 'Défilement des colonnes');
        b.innerHTML = '<button type="button" class="pbh-fl" data-pbh="-1" title="Colonnes précédentes" aria-label="Colonnes précédentes"><i class="fa-solid fa-chevron-left"></i></button>'
                + '<div class="pbh-piste"><div class="pbh-pouce"></div></div>'
                + '<button type="button" class="pbh-fl" data-pbh="1" title="Colonnes suivantes" aria-label="Colonnes suivantes"><i class="fa-solid fa-chevron-right"></i></button>'
                + '<span class="pbh-pos"></span>';
        document.body.appendChild(b);
        var piste = b.querySelector('.pbh-piste'), pouce = b.querySelector('.pbh-pouce'), depart = null;
        b.addEventListener('click', function (e) {
            var f = e.target.closest ? e.target.closest('[data-pbh]') : null;
            if (f) {
                vue.scrollBy({left: Number(f.getAttribute('data-pbh')) * Math.max(80, vue.clientWidth - 120), behavior: 'smooth'});
            }
        });
        pouce.addEventListener('pointerdown', function (e) {
            depart = {x: e.clientX, s: vue.scrollLeft};
            pouce.setPointerCapture(e.pointerId);
            e.preventDefault();
        });
        pouce.addEventListener('pointermove', function (e) {
            if (depart) {
                var l = piste.clientWidth - pouce.offsetWidth, max = vue.scrollWidth - vue.clientWidth;
                vue.scrollLeft = depart.s + (e.clientX - depart.x) * max / Math.max(1, l);
            }
        });
        pouce.addEventListener('pointerup', function () {
            depart = null;
        });
        piste.addEventListener('pointerdown', function (e) {
            if (e.target !== piste) {
                return;
            }
            var r = piste.getBoundingClientRect();
            vue.scrollTo({left: (e.clientX - r.left) / r.width * (vue.scrollWidth - vue.clientWidth), behavior: 'smooth'});
        });
        vue.addEventListener('scroll', planifier, {passive: true});
        vue.classList.add('pbh-vue');
        return {vue: vue, el: b};
    }

    function retirer(id) {
        var x = barres[id];
        if (x) {
            if (x.el.parentNode) {
                x.el.parentNode.removeChild(x.el);
            }
            x.vue.classList.remove('pbh-vue');
            x.vue.removeEventListener('scroll', planifier);
            delete barres[id];
        }
    }

    function zIndex(vue) {
        var f = vue.closest ? vue.closest('.x-window, .x-layer') : null;
        var z = f ? parseInt(getComputedStyle(f).zIndex, 10) : NaN;
        return isNaN(z) ? 900 : z + 1;
    }

    function placer(x) {
        var vue = x.vue, b = x.el, r = vue.getBoundingClientRect();
        var haut = Math.min(r.bottom, window.innerHeight) - HAUTEUR;
        if (!vue.offsetParent || r.width < 120 || haut < r.top + 24) {
            b.style.display = 'none';
            return;
        }
        b.style.display = 'flex';
        b.style.left = r.left + 'px';
        b.style.width = vue.clientWidth + 'px';
        b.style.top = haut + 'px';
        b.style.zIndex = zIndex(vue);
        var max = vue.scrollWidth - vue.clientWidth, s = vue.scrollLeft;
        var piste = b.querySelector('.pbh-piste'), pouce = b.querySelector('.pbh-pouce'), l = piste.clientWidth;
        var w = Math.max(40, l * vue.clientWidth / vue.scrollWidth);
        pouce.style.width = w + 'px';
        pouce.style.left = (max > 0 ? (l - w) * s / max : 0) + 'px';
        var fl = b.querySelectorAll('.pbh-fl');
        fl[0].disabled = s <= 1;
        fl[1].disabled = s >= max - 1;
        var cols = colonnes(vue), a = 0, z = 0;
        /* colonne comptee si au moins la moitie est a l'ecran */
        cols.forEach(function (c, i) {
            var vu = Math.min(c.d - s, vue.clientWidth) - Math.max(c.g - s, 0);
            if (vu >= (c.d - c.g) / 2) {
                a = a || i + 1;
                z = i + 1;
            }
        });
        b.querySelector('.pbh-pos').textContent = cols.length && a ? 'Colonnes ' + a + '–' + z + ' sur ' + cols.length : '';
    }

    function parcourir() {
        demande = false;
        var vus = {};
        var vues = document.querySelectorAll('.x-grid-view');
        for (var i = 0; i < vues.length; i++) {
            var v = vues[i];
            if (!v.id || !v.offsetParent || v.scrollWidth <= v.clientWidth + 2 || exclus(v)) {
                continue;
            }
            vus[v.id] = true;
            if (!barres[v.id] || barres[v.id].vue !== v) {
                retirer(v.id);
                barres[v.id] = creer(v);
            }
            placer(barres[v.id]);
        }
        Object.keys(barres).forEach(function (id) {
            if (!vus[id]) {
                retirer(id);
            }
        });
    }

    function planifier() {
        if (!demande) {
            demande = true;
            window.requestAnimationFrame(parcourir);
        }
    }

    window.PrestigeDefilement = {actualiser: parcourir};
    document.addEventListener('scroll', planifier, {capture: true, passive: true});
    window.addEventListener('resize', planifier);
    /* grilles qui apparaissent, se chargent ou changent de taille : verification reguliere, legere */
    setInterval(planifier, 600);
})();
