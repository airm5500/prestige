<%@page import="toolkits.parameters.commonparameter"%>
<%@page import="dal.TUser"%>
<%@page import="toolkits.utils.jdom"%>
<%@page contentType="text/html" pageEncoding="UTF-8"%>
<%
  jdom.InitRessource();
  jdom.LoadRessource();
  TUser OTUser = (TUser) session.getAttribute(commonparameter.AIRTIME_USER);
  if (OTUser != null) {
%>
<script>
  sessionStorage.setItem("user", '<%=OTUser%>');
  window.location.replace("../general/index.jsp?content=panelInfos.jsp&lng=fr");
</script>
<% } %>
<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><%= jdom.APP_NAME %> · v<%= jdom.APP_VERSION %></title>

  <link rel="shortcut icon" href="../resources/images/favicon.ico"/>
  <link rel="icon" type="image/png" href="../resources/images/favicon.png"/>


  <!-- ton bundle css global -->
  <link rel="stylesheet" href="../resources/css/style.css"/>

  <script src="../lib/jquery-1.4.2.js"></script>
  <script src="../app/controler.js"></script>
  <script src="../app/login.js"></script>
  <script src="../app/toolkits.js"></script>
  <script src="../app/static_data.js"></script>
  <script src="../lib/modernizr-1.5.min.js"></script>
</head>

<body class="pl-body">
  <main class="pl-center">
    <section class="pl-card" role="dialog" aria-labelledby="pl-title">
      <span class="pl-glow pl-glow--primary" aria-hidden="true"></span>
      <span class="pl-glow pl-glow--secondary" aria-hidden="true"></span>

      <div class="pl-grid">
        <aside class="pl-hero" aria-labelledby="pl-title">
          <div class="pl-brand-row">
            <div class="pl-brand">
              <span class="pl-brand__mark" aria-hidden="true">✚</span>
              <span class="pl-brand__text pl-animated-text--brand"><%= jdom.APP_NAME %></span>
            </div>
            <!-- Espace produit : consultation LIBRE, sans compte. S'ouvre en fenetre MODALE
                 par-dessus l'ecran de connexion ; son bouton « Retour » la referme.
                 Meme animation que le bouton d'origine (pl-btn), taille de la pilule voisine. -->
            <a href="espace-produit.html" id="espaceProduit" class="pl-btn pl-btn--compact"
               onclick="prestigeOuvrirEspaceProduit(); return false;"
               style="background:#4C9A46;">
              <span aria-hidden="true">🔎</span><span>Espace produit</span>
            </a>
          </div>

          <div class="pl-pharmacy-stack">
            <img class="pl-pharmacy-logo" src="../resources/images/logo_accueil.png" alt="" aria-hidden="true">
            <div class="pl-pharmacy-card" id="pl-title">
              <span class="pl-pharmacy-card__header">
                <span class="pl-pharmacy-card__icon" aria-hidden="true">🏥</span>
                <span class="pl-pharmacy-card__label">Bienvenu(e) à la :</span>
              </span>
              <strong id="pl-pharma-name" class="pl-animated-text--pharmacy">Chargement…</strong>
            </div>

            <div class="pl-version-badge"><%= jdom.APP_NAME %> · v<%= jdom.APP_VERSION %></div>
          </div>
        </aside>

        <div class="pl-login-panel">
          <div class="pl-panel-header">
            <h2>Connexion</h2>
            <p>Renseignez vos identifiants pour continuer.</p>
          </div>
          <img class="pl-login-pill" src="../resources/images/pill-blue.png" alt="" aria-hidden="true">

          <div class="pl-col pl-col--form">
            <label class="pl-label" for="str_login">Identifiant</label>
            <div class="pl-input">
              <span class="pl-input__icon" aria-hidden="true">👤</span>
              <input id="str_login" name="str_login" type="text" autocomplete="username" autofocus
                     placeholder="Votre identifiant"/>
            </div>

            <label class="pl-label" for="str_password">Mot de passe</label>
            <div class="pl-input">
              <span class="pl-input__icon" aria-hidden="true">🔒</span>
              <input id="str_password" name="str_password" type="password" autocomplete="current-password"
                     placeholder="Votre mot de passe"/>
            </div>

            <button type="button" id="login" name="login" class="pl-btn">
              <span>Se connecter</span>
              <span class="pl-btn__arrow" aria-hidden="true">→</span>
            </button>

            <span class="pl-loader" id="loader" role="status" aria-live="polite" aria-label="Connexion en cours" style="display:none;">
              <span class="pl-loader__card">
                <span class="pl-loader__ring" aria-hidden="true">
                  <span class="pl-loader__ring-core"></span>
                </span>
                <span class="pl-loader__text">Connexion en cours…</span>
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  </main>

  <!-- Espace produit en fenetre modale : la surcouche couvre toute la page de connexion,
       le contenu (espace-produit.html) est charge dans le cadre, et son bouton
       « Retour à la connexion » referme la fenetre (voir espace-produit.html). -->
  <div id="ep-modale" style="display:none;position:fixed;inset:0;z-index:9999;background:rgba(15,32,54,.55);">
    <div style="position:absolute;inset:24px;background:#fff;border-radius:10px;overflow:hidden;
                box-shadow:0 12px 40px rgba(0,0,0,.35);">
      <iframe id="ep-cadre" title="Espace produit"
              style="width:100%;height:100%;border:0;display:block;"></iframe>
    </div>
  </div>
  <script>
    function prestigeOuvrirEspaceProduit() {
      var modale = document.getElementById('ep-modale');
      var cadre = document.getElementById('ep-cadre');
      var premierChargement = !cadre.src;
      if (premierChargement) { cadre.src = 'espace-produit.html'; }
      modale.style.display = 'block';
      // Curseur directement dans le champ de recherche, pret pour la saisie -
      // au premier chargement comme aux reouvertures.
      var focaliserRecherche = function () {
        try {
          cadre.contentWindow.focus();
          cadre.contentWindow.document.getElementById('ep-q').focus();
        } catch (e) { }
      };
      if (premierChargement) {
        cadre.addEventListener('load', focaliserRecherche, { once: true });
      }
      setTimeout(focaliserRecherche, 150);
    }
    function prestigeFermerEspaceProduit() {
      document.getElementById('ep-modale').style.display = 'none';
    }
  </script>

  <!-- Récupération du nom de la pharmacie -->
  <script>

(function () {
  var el = document.getElementById('pl-pharma-name');
  if (!el) return;

  var loadingText = 'Chargement…';
  var ctx = '<%= request.getContextPath() %>';   // ex: /prestige
  var urls = ['../api/v1/officine/principal', '../api/v1/officine', ctx + '/api/v1/officine/principal', ctx + '/api/v1/officine'];

  function hasClass(target, className) {
    return (' ' + target.className + ' ').indexOf(' ' + className + ' ') > -1;
  }

  function renderAnimatedLetters(target, text, modifier) {
    var safeText = text || '';
    var tokens = safeText.split(/(\s+)/);
    var letterIndex = 0;
    target.innerHTML = '';
    if (modifier && !hasClass(target, modifier)) {
      target.className = (target.className + ' ' + modifier).replace(/\s+/g, ' ');
    }
    for (var i = 0; i < tokens.length; i += 1) {
      if (/^\s+$/.test(tokens[i])) {
        target.appendChild(document.createTextNode(' '));
        continue;
      }
      var word = document.createElement('span');
      word.className = 'pl-animated-word';
      for (var j = 0; j < tokens[i].length; j += 1) {
        var letter = document.createElement('span');
        letter.className = 'pl-animated-letter';
        letter.style.cssText = '--letter-index:' + letterIndex + ';';
        letter.textContent = tokens[i].charAt(j);
        word.appendChild(letter);
        letterIndex += 1;
      }
      target.appendChild(word);
    }
  }

  var brandText = document.querySelector('.pl-brand__text');
  if (brandText) {
    renderAnimatedLetters(brandText, brandText.textContent, 'pl-animated-text--brand');
  }

  function applyPharmacyName(name) {
    var normalizedName = name || loadingText;
    var sizeClass = '';
    if (normalizedName.length > 52) {
      sizeClass = 'is-very-long';
    } else if (normalizedName.length > 34) {
      sizeClass = 'is-long';
    }
    el.className = (sizeClass + ' pl-animated-text--pharmacy').replace(/\s+/g, ' ');
    renderAnimatedLetters(el, normalizedName, 'pl-animated-text--pharmacy');
  }

  function readName(item) {
    if (!item) return '';
    return item.nomComplet || item.nomcomplet || item.fullName || item.fullname || item.name ||
           item.str_NOM_COMPLET || item.str_NOM_ABREGE || item.str_NAME || '';
  }

  function resolveName(data) {
    if (Array.isArray(data)) {
      for (var i = 0; i < data.length; i += 1) {
        var listName = readName(data[i]);
        if (listName) return listName;
      }
      return '';
    }
    return readName(data);
  }

  function setNameFromData(data) {
    try {
      var name = resolveName(data);
      if (name) {
        applyPharmacyName(name);
      } else {
        console.warn('API officine: aucun nom trouvé dans la réponse', data);
        applyPharmacyName(loadingText);
      }
    } catch (e) {
      console.error('Parsing officine KO:', e);
      applyPharmacyName(loadingText);
    }
  }

  function fetchWithJquery(url) {
    if (!(window.jQuery && jQuery.getJSON)) {
      applyPharmacyName(loadingText);
      return;
    }
    var request = jQuery.getJSON(url, function (data) {
      setNameFromData(data);
    });
    if (request && request.fail) {
      request.fail(function (jq, textStatus, errorThrown) {
        console.error('jQuery officine KO:', textStatus || errorThrown);
        applyPharmacyName(loadingText);
      });
    }
  }

  if (!window.fetch) {
    fetchWithJquery(urls[0]);
    return;
  }

  function fetchOfficine(index) {
    if (index >= urls.length) {
      applyPharmacyName(loadingText);
      return;
    }
    fetch(urls[index], { cache: 'no-store', credentials: 'same-origin' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var name = resolveName(data);
        if (name) {
          applyPharmacyName(name);
          return;
        }
        fetchOfficine(index + 1);
      })
      .catch(function (err) {
        console.warn('fetch officine KO:', urls[index], err);
        fetchOfficine(index + 1);
      });
  }

  fetchOfficine(0);
})();
</script>

</body>
</html>