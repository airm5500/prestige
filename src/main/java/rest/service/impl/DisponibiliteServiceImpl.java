package rest.service.impl;

import dal.TUser;
import java.io.File;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Tuple;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.DisponibiliteService;
import rest.service.impl.PharmaMlMessages.Disponibilite;
import rest.service.impl.PharmaMlMessages.Ligne;
import rest.service.impl.PharmaMlMessages.Partenaires;
import util.AppParameters;
import util.Constant;

/**
 * DISPONIBILITE PHARMAML (plan d'octobre 1.2). Une requete REQ_INFO_PRODUIT par appel (50 produits au plus : l'ecran
 * enchaine les paquets et affiche la progression). Code envoye : le code article du produit CHEZ CE GROSSISTE s'il est
 * renseigne (t_famille_grossiste), sinon le CIP, sinon l'EAN13. Chaque echange est archive (I_ = requete, RI_ =
 * reponse) dans le dossier PharmaML, pour l'analyse des essais. Aucun message COMMANDE n'est construit ici.
 */
@Stateless
public class DisponibiliteServiceImpl implements DisponibiliteService {

    private static final Logger LOG = Logger.getLogger(DisponibiliteServiceImpl.class.getName());
    private static final DateTimeFormatter REF = DateTimeFormatter.ofPattern("yyMMddHHmmssSSS");

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    private static boolean sourceValide(String source) {
        return SUGGESTION.equals(source) || COMMANDE.equals(source);
    }

    /** Lignes de la source : produit, quantite. */
    private String requeteLignes(String source) {
        return SUGGESTION.equals(source)
                ? "SELECT d.lg_FAMILLE_ID AS id, SUM(COALESCE(d.int_NUMBER, 1)) AS qte FROM t_suggestion_order_details d"
                        + " WHERE d.lg_SUGGESTION_ORDER_ID = :s GROUP BY d.lg_FAMILLE_ID"
                : "SELECT d.lg_FAMILLE_ID AS id, SUM(COALESCE(d.int_NUMBER, 1)) AS qte FROM t_order_detail d"
                        + " WHERE d.lg_ORDER_ID = :s GROUP BY d.lg_FAMILLE_ID";
    }

    private String grossisteDeLaSource(String source, String sourceId) {
        List<?> r = em
                .createNativeQuery(SUGGESTION.equals(source)
                        ? "SELECT lg_GROSSISTE_ID FROM t_suggestion_order WHERE lg_SUGGESTION_ORDER_ID = :s"
                        : "SELECT lg_GROSSISTE_ID FROM t_order WHERE lg_ORDER_ID = :s")
                .setParameter("s", sourceId).getResultList();
        return r.isEmpty() ? null : (String) r.get(0);
    }

    /** Disponibilite coupee dans la fiche du grossiste de la source (V6.9.98) : bouton et pastille masques. */
    private boolean disponibiliteActive(String source, String sourceId) {
        if (!sourceValide(source)) {
            return true;
        }
        String gid = grossisteDeLaSource(source, sourceId);
        if (gid == null) {
            return true;
        }
        List<?> r = em.createNativeQuery("SELECT int_PHARMAML_DISPO FROM t_grossiste WHERE lg_GROSSISTE_ID = :g")
                .setParameter("g", gid).getResultList();
        return r.isEmpty() || EnvoiPharmaMl.disponibiliteActive(r.get(0));
    }

    /** Dernier resultat par produit dans cette source. */
    private static final String DERNIERS = "SELECT d.* FROM t_disponibilite_produit d JOIN (SELECT lg_FAMILLE_ID AS f,"
            + " MAX(dt_CREATED) AS dt FROM t_disponibilite_produit WHERE lg_SOURCE_ID = :s GROUP BY lg_FAMILLE_ID) x"
            + " ON x.f = d.lg_FAMILLE_ID AND x.dt = d.dt_CREATED WHERE d.lg_SOURCE_ID = :s";

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject produits(String source, String sourceId, boolean seulementIndisponibles) {
        if (!sourceValide(source)) {
            return new JSONObject().put("success", false).put("msg", "Source inconnue");
        }
        List<Tuple> lignes = em.createNativeQuery(requeteLignes(source), Tuple.class).setParameter("s", sourceId)
                .getResultList();
        Map<String, String> statuts = new HashMap<>();
        if (seulementIndisponibles) {
            for (Object[] r : (List<Object[]>) em
                    .createNativeQuery("SELECT y.lg_FAMILLE_ID, y.str_STATUT FROM (" + DERNIERS + ") y")
                    .setParameter("s", sourceId).getResultList()) {
                statuts.put((String) r[0], (String) r[1]);
            }
        }
        JSONArray ids = new JSONArray();
        for (Tuple t : lignes) {
            String id = (String) t.get("id");
            String st = statuts.get(id);
            if (!seulementIndisponibles || "NON".equals(st) || "AUTRE".equals(st)) {
                ids.put(id);
            }
        }
        return new JSONObject().put("success", true).put("familles", ids).put("total", ids.length()).put("grossisteId",
                StringUtils.defaultString(grossisteDeLaSource(source, sourceId)));
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject verifier(String source, String sourceId, String grossisteId, List<String> familleIds,
            TUser user) {
        if (!sourceValide(source)) {
            return new JSONObject().put("success", false).put("msg", "Source inconnue");
        }
        if (familleIds == null || familleIds.isEmpty() || familleIds.size() > PharmaMlMessages.MAX_LIGNES) {
            return new JSONObject().put("success", false).put("msg",
                    "Entre 1 et " + PharmaMlMessages.MAX_LIGNES + " produits par interrogation");
        }
        String gid = StringUtils.isNotBlank(grossisteId) ? grossisteId : grossisteDeLaSource(source, sourceId);
        List<Tuple> g = em.createNativeQuery("SELECT g.str_LIBELLE AS libelle, g.str_URL_PHARMAML AS url,"
                + " g.str_OFFICINE_ID AS codeOf, g.str_ID_RECEPTEUR_PHARMA AS idOf, g.str_CODE_RECEPTEUR_PHARMA AS codeRe,"
                + " g.idrepartiteur AS idRe, g.str_PHARMAML_VERSION_INFO AS version,"
                + " g.str_URL_PHARMAML_SECOURS AS secours, g.str_CLE_RECEPTEUR AS cle,"
                + " COALESCE(NULLIF(g.str_PHARMAML_CONTROLE, ''), (SELECT p.str_VALUE FROM t_parameters p"
                + " WHERE p.str_KEY = 'KEY_PHARMAML_CONTROLE')) AS controle, g.int_PHARMAML_DISPO AS dispo"
                + " FROM t_grossiste g" + " WHERE g.lg_GROSSISTE_ID = :g", Tuple.class).setParameter("g", gid)
                .getResultList();
        if (g.isEmpty()) {
            return new JSONObject().put("success", false).put("msg", "Grossiste introuvable");
        }
        Tuple gr = g.get(0);
        String url = StringUtils.trimToEmpty((String) gr.get("url"));
        String libelle = StringUtils.defaultString((String) gr.get("libelle"));
        if (!EnvoiPharmaMl.disponibiliteActive(gr.get("dispo"))) {
            return new JSONObject().put("success", false).put("desactivee", true).put("msg", "La disponibilité PharmaML"
                    + " est désactivée pour " + libelle + " (fiche grossiste). La commande n'est pas concernée.");
        }
        if (url.isEmpty()) {
            return new JSONObject().put("success", false).put("msg",
                    "Le grossiste " + libelle + " n'a pas de lien PharmaML (fiche grossiste)");
        }
        String version = PharmaMlMessages.version((String) gr.get("version"));
        /* Produits : code article chez ce grossiste, sinon CIP, sinon EAN13 ; quantite de la source. */
        Map<String, Integer> quantites = new HashMap<>();
        for (Tuple t : (List<Tuple>) em.createNativeQuery(requeteLignes(source), Tuple.class)
                .setParameter("s", sourceId).getResultList()) {
            quantites.put((String) t.get("id"), ((Number) t.get("qte")).intValue());
        }
        List<Tuple> prods = em.createNativeQuery("SELECT f.lg_FAMILLE_ID AS id, f.str_NAME AS nom, f.int_CIP AS cip,"
                + " f.int_EAN13 AS ean, (SELECT fg.str_CODE_ARTICLE FROM t_famille_grossiste fg WHERE fg.lg_FAMILLE_ID ="
                + " f.lg_FAMILLE_ID AND fg.lg_GROSSISTE_ID = :g AND COALESCE(fg.str_CODE_ARTICLE, '') <> ''"
                + " ORDER BY fg.dt_UPDATED DESC LIMIT 1) AS codeArticle FROM t_famille f WHERE f.lg_FAMILLE_ID IN (:ids)",
                Tuple.class).setParameter("g", gid).setParameter("ids", familleIds).getResultList();
        Map<String, Tuple> parId = new HashMap<>();
        prods.forEach(t -> parId.put((String) t.get("id"), t));
        List<Ligne> lignes = new ArrayList<>();
        List<String> ordre = new ArrayList<>();
        for (String id : familleIds) {
            Tuple t = parId.get(id);
            if (t == null) {
                continue;
            }
            String code = premier((String) t.get("codeArticle"), (String) t.get("cip"), (String) t.get("ean"));
            if (StringUtils.isBlank(code)) {
                continue;
            }
            lignes.add(new Ligne(code, (String) t.get("nom"), quantites.getOrDefault(id, 1)));
            ordre.add(id);
        }
        if (lignes.isEmpty()) {
            return new JSONObject().put("success", false).put("msg", "Aucun produit avec un code à interroger");
        }
        Partenaires p = new Partenaires();
        p.codeOfficine = StringUtils.defaultIfBlank((String) gr.get("codeOf"), "00");
        p.idOfficine = StringUtils.defaultString((String) gr.get("idOf"));
        p.nomOfficine = StringUtils.defaultString(nomOfficine());
        p.codeRepartiteur = StringUtils.defaultString((String) gr.get("codeRe"));
        p.idRepartiteur = StringUtils.defaultString((String) gr.get("idRe"));
        p.nomRepartiteur = libelle;
        p.date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss"));
        String reference = "PRS" + LocalDateTime.now().format(REF);
        String xml = PharmaMlMessages.reqInfoProduit(version, p, reference, lignes);
        String fichier = reference + "_" + libelle.replaceAll("[^A-Za-z0-9]", "");
        archiver("I_" + fichier, xml);
        String reponse;
        try {
            /* adresse de secours essayee seulement si la principale est injoignable */
            HttpResponse<String> http = EnvoiPharmaMl.envoyer(EnvoiPharmaMl.adresses(url, (String) gr.get("secours")),
                    xml, (String) gr.get("idOf"), (String) gr.get("cle"), (String) gr.get("controle"),
                    Duration.ofSeconds(20), Duration.ofSeconds(90)).reponse;
            reponse = http.body();
            archiver("RI_" + fichier, reponse == null ? "" : PharmaMlMessages.indenter(reponse));
            if (http.statusCode() != 200) {
                return new JSONObject().put("success", false).put("msg",
                        "Le grossiste " + libelle + " a répondu en erreur (HTTP " + http.statusCode() + ")");
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return new JSONObject().put("success", false).put("msg", "Interrogation interrompue");
        } catch (Exception e) {
            LOG.log(Level.WARNING, "PharmaML information produit : grossiste injoignable ({0})", e.getMessage());
            return new JSONObject().put("success", false).put("msg", "Le grossiste " + libelle + " est injoignable");
        }
        String erreur = PharmaMlMessages.erreurReponse(reponse);
        if (erreur != null) {
            return new JSONObject().put("success", false).put("msg", "Le grossiste " + libelle
                    + " a refusé la demande : « " + erreur + " »."
                    + (PharmaMlMessages.V3.equals(version) && PharmaMlMessages.enveloppeV1Attendue(erreur)
                            ? " Ce grossiste n'accepte pas PharmaML 3.0.0.0 : dans sa fiche, réglez « PharmaML : info"
                                    + " produit » sur 1.0.0.0."
                            : ""));
        }
        List<Disponibilite> lus;
        try {
            lus = PharmaMlMessages.lireReponseInfoProduit(reponse);
        } catch (Exception e) {
            LOG.log(Level.WARNING, "PharmaML information produit : reponse illisible ({0})", e.getMessage());
            return new JSONObject().put("success", false).put("msg",
                    "La réponse du grossiste " + libelle + " est illisible (archivée pour analyse)");
        }
        /* Rapprochement : par numero de ligne, sinon par code. */
        Map<Integer, Disponibilite> parNum = new HashMap<>();
        Map<String, Disponibilite> parCode = new HashMap<>();
        lus.forEach(d -> {
            parNum.putIfAbsent(d.numLigne, d);
            parCode.putIfAbsent(d.code, d);
        });
        int oui = 0, non = 0, autre = 0, inconnu = 0;
        JSONArray data = new JSONArray();
        for (int i = 0; i < ordre.size(); i++) {
            Ligne l = lignes.get(i);
            Disponibilite d = parNum.get(i + 1);
            if (d == null || !(d.code.isEmpty() || d.code.equals(l.code))) {
                d = parCode.get(l.code);
            }
            if (d == null) {
                d = new Disponibilite();
                d.statut = "INCONNU";
                d.libelle = "Pas de réponse pour ce produit";
            }
            switch (d.statut) {
            case "OUI":
                oui++;
                break;
            case "NON":
                non++;
                break;
            case "AUTRE":
                autre++;
                break;
            default:
                inconnu++;
            }
            em.createNativeQuery(
                    "INSERT INTO t_disponibilite_produit (lg_ID, lg_GROSSISTE_ID, lg_FAMILLE_ID, str_SOURCE,"
                            + " lg_SOURCE_ID, str_CODE_ENVOYE, str_STATUT, str_CODE_REPONSE, str_LIBELLE, str_DATE_DISPO,"
                            + " int_QTE_DISPO, str_REMPLACANT_CODE, str_REMPLACANT_NOM, int_PRIX, str_REF_REQUETE, str_VERSION,"
                            + " lg_USER_ID, dt_CREATED) VALUES (:id, :g, :f, :src, :s, :code, :st, :cr, :lib, :dd, :qd, :rc, :rn,"
                            + " :px, :ref, :v, :u, NOW(3))")
                    .setParameter("id", UUID.randomUUID().toString()).setParameter("g", gid)
                    .setParameter("f", ordre.get(i)).setParameter("src", source).setParameter("s", sourceId)
                    .setParameter("code", l.code).setParameter("st", d.statut)
                    .setParameter("cr", StringUtils.left(d.codeReponse, 10))
                    .setParameter("lib", StringUtils.left(premier(d.libelle, d.commentaire, ""), 255))
                    .setParameter("dd", StringUtils.left(d.dateDispo, 20)).setParameter("qd", d.quantiteDispo)
                    .setParameter("rc", StringUtils.left(d.remplacantCode, 20))
                    .setParameter("rn", StringUtils.left(d.remplacantNom, 100)).setParameter("px", d.prix)
                    .setParameter("ref", reference).setParameter("v", version)
                    .setParameter("u", user == null ? null : user.getLgUSERID()).executeUpdate();
            data.put(new JSONObject().put("familleId", ordre.get(i)).put("statut", d.statut));
        }
        JSONObject out = new JSONObject().put("success", true).put("grossiste", libelle).put("version", version)
                .put("reference", reference).put("oui", oui).put("non", non).put("autre", autre).put("inconnu", inconnu)
                .put("data", data);
        if (inconnu == ordre.size() && lus.stream().allMatch(d -> d.code.isEmpty())) {
            /*
             * Retours du 08/10 (fichier RI_ de DPCI) : reponse sans aucune information produit (une ligne vide, code et
             * numero absents). Ce n'est pas « pas de reponse » produit par produit : le grossiste ne fournit pas la
             * disponibilite par PharmaML.
             */
            out.put("reponseVide", true).put("avertissement", libelle + " a répondu sans aucune information produit"
                    + " (ligne vide) : il ne semble pas fournir la disponibilité par PharmaML. Vous pouvez la désactiver"
                    + " dans sa fiche grossiste (« Interroger la disponibilité »).");
        }
        return out;
    }

    private static String premier(String... valeurs) {
        for (String v : valeurs) {
            if (StringUtils.isNotBlank(v)) {
                return v.trim();
            }
        }
        return null;
    }

    private String nomOfficine() {
        List<?> r = em.createNativeQuery("SELECT str_NOM_COMPLET FROM t_officine WHERE lg_OFFICINE_ID = :o")
                .setParameter("o", Constant.OFFICINE).getResultList();
        return r.isEmpty() ? "" : String.valueOf(r.get(0));
    }

    private void archiver(String nom, String contenu) {
        String dossier = AppParameters.getInstance().pharmaMlDir;
        if (StringUtils.isBlank(dossier)) {
            LOG.log(Level.WARNING, "Dossier PharmaML non configure : echange {0} non archive", nom);
            return;
        }
        try {
            Files.write(Paths.get(dossier + File.separator + nom + ".xml"), contenu.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            LOG.log(Level.WARNING, "Archivage PharmaML impossible : {0}", e.getMessage());
        }
    }

    @Override
    @SuppressWarnings("unchecked")
    public JSONObject etat(String source, String sourceId) {
        JSONObject parProduit = new JSONObject();
        List<Tuple> r = em
                .createNativeQuery("SELECT y.lg_FAMILLE_ID AS f, y.str_STATUT AS st, y.str_CODE_REPONSE AS cr,"
                        + " y.str_LIBELLE AS lib, y.str_DATE_DISPO AS dd, y.int_QTE_DISPO AS qd, y.str_REMPLACANT_CODE AS rc,"
                        + " y.str_REMPLACANT_NOM AS rn, y.int_PRIX AS px, g.str_LIBELLE AS grossiste,"
                        + " DATE_FORMAT(y.dt_CREATED, '%d/%m/%Y %H:%i') AS dt FROM (" + DERNIERS + ") y"
                        + " LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = y.lg_GROSSISTE_ID", Tuple.class)
                .setParameter("s", sourceId).getResultList();
        for (Tuple t : r) {
            parProduit.put((String) t.get("f"),
                    new JSONObject().put("statut", t.get("st"))
                            .put("codeReponse", StringUtils.defaultString((String) t.get("cr")))
                            .put("libelle", StringUtils.defaultString((String) t.get("lib")))
                            .put("dateDispo", StringUtils.defaultString((String) t.get("dd")))
                            .put("quantiteDispo", t.get("qd") == null ? JSONObject.NULL : t.get("qd"))
                            .put("remplacant",
                                    StringUtils.trimToEmpty(StringUtils.defaultString((String) t.get("rn")) + " "
                                            + StringUtils.defaultString((String) t.get("rc"))))
                            .put("prix", t.get("px") == null ? JSONObject.NULL : t.get("px"))
                            .put("grossiste", StringUtils.defaultString((String) t.get("grossiste")))
                            .put("date", t.get("dt")));
        }
        return new JSONObject().put("success", true).put("produits", parProduit).put("total", r.size()).put("active",
                disponibiliteActive(source, sourceId));
    }

    @Override
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> lignesImpression(String source, String sourceId) {
        List<Map<String, Object>> sortie = new ArrayList<>();
        List<Tuple> r = em.createNativeQuery("SELECT f.int_CIP AS cip, f.str_NAME AS nom, y.str_STATUT AS st,"
                + " y.str_LIBELLE AS lib, y.str_DATE_DISPO AS dd, y.int_QTE_DISPO AS qd, y.str_REMPLACANT_NOM AS rn,"
                + " g.str_LIBELLE AS grossiste, DATE_FORMAT(y.dt_CREATED, '%d/%m/%Y %H:%i') AS dt FROM (" + DERNIERS
                + ") y JOIN t_famille f ON f.lg_FAMILLE_ID = y.lg_FAMILLE_ID"
                + " LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = y.lg_GROSSISTE_ID"
                + " ORDER BY FIELD(y.str_STATUT, 'NON', 'AUTRE', 'INCONNU', 'OUI'), f.str_NAME", Tuple.class)
                .setParameter("s", sourceId).getResultList();
        Map<String, String> libelles = new LinkedHashMap<>();
        libelles.put("OUI", "Disponible");
        libelles.put("NON", "Non disponible");
        libelles.put("AUTRE", "Autre");
        libelles.put("INCONNU", "Sans réponse");
        for (Tuple t : r) {
            Map<String, Object> m = new HashMap<>();
            m.put("cip", StringUtils.defaultString((String) t.get("cip")));
            m.put("produit", StringUtils.defaultString((String) t.get("nom")));
            m.put("statut", libelles.getOrDefault((String) t.get("st"), (String) t.get("st")));
            m.put("motif", StringUtils.defaultString((String) t.get("lib")));
            m.put("dateDispo", StringUtils.defaultString((String) t.get("dd")));
            m.put("quantiteDispo", t.get("qd") == null ? "" : String.valueOf(t.get("qd")));
            m.put("remplacant", StringUtils.defaultString((String) t.get("rn")));
            m.put("grossiste", StringUtils.defaultString((String) t.get("grossiste")));
            m.put("date", StringUtils.defaultString((String) t.get("dt")));
            sortie.add(m);
        }
        return sortie;
    }
}
