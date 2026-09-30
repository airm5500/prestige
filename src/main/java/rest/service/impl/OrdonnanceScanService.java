package rest.service.impl;

import commonTasks.dto.ClientLambdaDTO;
import dal.TClient;
import dal.TUser;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.annotation.Resource;
import javax.ejb.EJB;
import javax.ejb.SessionContext;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.Tuple;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.ClientService;
import rest.service.posos.PososService;

/**
 * SCAN D'UNE ORDONNANCE PAPIER (retour du 30/09) : l'ecran en 3 parties - l'image a gauche, le controle de la
 * delivrance au centre, le patient et son historique a droite.
 *
 * <p>
 * Un scan (photo ou PDF) est depose, puis TRAITE : la lecture automatique (Posos, quand elle est branchee) propose les
 * produits, le pharmacien les controle, et la validation cree l'ordonnance - le scan y est joint comme piece
 * justificative. Sans lecture automatique, l'ecran sert de saisie assistee : l'image est sous les yeux.
 *
 * <p>
 * Un patient introuvable est cree en client STANDARD avec le nom lu (ou saisi). Le fichier est sur disque, dans son
 * propre dossier : la purge des pieces orphelines ne le voit pas.
 */
@Stateless
public class OrdonnanceScanService {

    private static final Logger LOG = Logger.getLogger(OrdonnanceScanService.class.getName());

    /** Dossier des scans sous la racine de stockage, distinct de celui des pieces. */
    static final String DOSSIER = "ordonnances-scans";
    static final String SOURCE_POSTE = "poste";
    static final String SOURCE_MOBILE = "mobile";
    /** En dessous, une ligne lue est a verifier (orange a l'ecran). */
    static final double CONFIANCE_MIN = 0.8;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Resource
    private SessionContext contexte;

    @EJB
    private OrdonnanceClientService ordonnanceService;

    @EJB
    private ClientService clientService;

    @EJB
    private PososService pososService;

    /* ------------------------------------------------------------------ depot */

    /** Scans acceptes : photos et PDF. */
    static String refus(String nom, long taille) {
        String ext = OrdonnancePieces.extension(nom);
        if (!java.util.Arrays.asList("jpg", "jpeg", "png", "pdf").contains(ext)) {
            return "Choisissez une photo (JPG, PNG) ou un PDF.";
        }
        return OrdonnancePieces.refus(nom, taille);
    }

    public JSONObject deposer(String nomOrigine, InputStream flux, long taille, String source, TUser operateur) {
        String motif = refus(nomOrigine, taille);
        if (motif != null) {
            return echec(motif);
        }
        try {
            String id = UUID.randomUUID().toString();
            String nom = OrdonnancePieces.assainir(nomOrigine);
            LocalDate jour = LocalDate.now();
            String relatif = String.format("%s/%04d/%02d/%s", DOSSIER, jour.getYear(), jour.getMonthValue(),
                    OrdonnancePieces.nomSurDisque(id, nom));
            Path cible = util.StockageDisque.racine().resolve(relatif);
            Files.createDirectories(cible.getParent());
            long ecrits = Files.copy(flux, cible, StandardCopyOption.REPLACE_EXISTING);
            if (ecrits > OrdonnancePieces.TAILLE_MAX) {
                Files.deleteIfExists(cible);
                return echec("Le fichier dépasse " + OrdonnancePieces.limiteLisible() + ".");
            }
            em.createNativeQuery("INSERT INTO t_ordonnance_scan (lg_SCAN_ID, str_NOM_ORIGINE, str_TYPE_MIME,"
                    + " int_TAILLE, str_CHEMIN, str_SOURCE, lg_USER_ID, dt_CREATED) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)")
                    .setParameter(1, id).setParameter(2, OrdonnanceClientSaisie.tronquer(nom, 150))
                    .setParameter(3, OrdonnancePieces.typeMime(nom)).setParameter(4, ecrits).setParameter(5, relatif)
                    .setParameter(6, SOURCE_MOBILE.equals(source) ? SOURCE_MOBILE : SOURCE_POSTE)
                    .setParameter(7, operateur == null ? null : operateur.getLgUSERID()).setParameter(8, new Date())
                    .executeUpdate();
            return new JSONObject().put("success", true).put("id", id).put("message", "Scan « " + nom + " » reçu.");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "depot d'un scan d'ordonnance", e);
            return echec("Le scan n'a pas pu être enregistré.");
        }
    }

    /* ------------------------------------------------------------------ lecture */

    /** Les scans a traiter, du plus recent au plus ancien (ceux de l'application mobile compris). */
    @SuppressWarnings("unchecked")
    public JSONObject aTraiter() {
        JSONArray data = new JSONArray();
        try {
            for (Tuple t : (List<Tuple>) em
                    .createNativeQuery("SELECT s.lg_SCAN_ID AS id, s.str_NOM_ORIGINE AS nom,"
                            + " s.str_SOURCE AS source, s.str_ETAT_LECTURE AS lecture, s.dt_CREATED AS depose,"
                            + " TRIM(CONCAT(COALESCE(u.str_FIRST_NAME, ''), ' ', COALESCE(u.str_LAST_NAME, ''))) AS par"
                            + " FROM t_ordonnance_scan s LEFT JOIN t_user u ON u.lg_USER_ID = s.lg_USER_ID"
                            + " WHERE s.str_STATUT = 'a_traiter' ORDER BY s.dt_CREATED DESC", Tuple.class)
                    .setMaxResults(50).getResultList()) {
                data.put(new JSONObject().put("id", t.get("id", String.class)).put("nom", t.get("nom", String.class))
                        .put("source", t.get("source", String.class)).put("lecture", t.get("lecture", String.class))
                        .put("depose", String.valueOf(t.get("depose")))
                        .put("par", StringUtils.defaultString(t.get("par", String.class))));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "scans a traiter", e);
            return echec("La liste des scans n'a pas pu être lue.").put("data", new JSONArray());
        }
        return new JSONObject().put("success", true).put("total", data.length()).put("data", data).put("lectureActive",
                pososService.lectureActive());
    }

    /** Un scan : son etat, et ce que la lecture automatique en a deja tire. */
    @SuppressWarnings("unchecked")
    public JSONObject detail(String scanId) {
        List<Tuple> l = em.createNativeQuery("SELECT lg_SCAN_ID AS id, str_NOM_ORIGINE AS nom, str_TYPE_MIME AS type,"
                + " int_TAILLE AS taille, str_SOURCE AS source, str_STATUT AS statut, str_ETAT_LECTURE AS etat,"
                + " str_LECTURE AS lecture, lg_ORDONNANCE_ID AS ordonnanceId FROM t_ordonnance_scan WHERE lg_SCAN_ID = ?1",
                Tuple.class).setParameter(1, StringUtils.defaultString(scanId)).getResultList();
        if (l.isEmpty()) {
            return echec("Scan introuvable.");
        }
        Tuple t = l.get(0);
        String lecture = t.get("lecture", String.class);
        return new JSONObject().put("success", true)
                .put("scan", new JSONObject().put("id", t.get("id", String.class))
                        .put("nom", t.get("nom", String.class)).put("type", t.get("type", String.class))
                        .put("pdf", "application/pdf".equals(t.get("type", String.class)))
                        .put("source", t.get("source", String.class)).put("statut", t.get("statut", String.class))
                        .put("etatLecture", t.get("etat", String.class))
                        .put("ordonnanceId", StringUtils.defaultString(t.get("ordonnanceId", String.class)))
                        .put("lecture", lecture == null ? JSONObject.NULL : new JSONObject(lecture)))
                .put("lectureActive", pososService.lectureActive());
    }

    /** Le fichier du scan, ou null s'il est introuvable ou hors du dossier des scans. */
    public Path fichier(String scanId) {
        try {
            Object chemin = em.createNativeQuery("SELECT str_CHEMIN FROM t_ordonnance_scan WHERE lg_SCAN_ID = ?1")
                    .setParameter(1, StringUtils.defaultString(scanId)).getResultList().stream().findFirst()
                    .orElse(null);
            if (chemin == null) {
                return null;
            }
            Path racine = util.StockageDisque.racine().normalize();
            Path p = racine.resolve(String.valueOf(chemin)).normalize();
            return p.startsWith(racine.resolve(DOSSIER)) && Files.isReadable(p) ? p : null;
        } catch (Exception e) {
            LOG.log(Level.WARNING, "fichier d'un scan", e);
            return null;
        }
    }

    public String nomDuScan(String scanId) {
        Object n = em.createNativeQuery("SELECT str_NOM_ORIGINE FROM t_ordonnance_scan WHERE lg_SCAN_ID = ?1")
                .setParameter(1, StringUtils.defaultString(scanId)).getResultList().stream().findFirst().orElse(null);
        return n == null ? "ordonnance" : String.valueOf(n);
    }

    /**
     * Lecture automatique, puis propositions : chaque produit lu rapproche du catalogue (avec son stock), le patient et
     * le prescripteur retrouves s'ils existent. Une lecture deja faite n'est pas relancee (elle est gardee en base).
     */
    public JSONObject lire(String scanId, String emplacementId, boolean relancer) {
        JSONObject d = detail(scanId);
        if (!d.optBoolean("success")) {
            return d;
        }
        JSONObject scan = d.getJSONObject("scan");
        JSONObject lecture = scan.optJSONObject("lecture");
        if (lecture == null || relancer) {
            Path f = fichier(scanId);
            if (f == null) {
                return echec("Le fichier du scan est introuvable.");
            }
            JSONObject r;
            try {
                r = pososService.lireOrdonnance(Files.readAllBytes(f), scan.optString("type"));
            } catch (Exception e) {
                LOG.log(Level.WARNING, "lecture d'un scan", e);
                r = new JSONObject().put("disponible", false).put("message", "Le scan n'a pas pu être lu.");
            }
            if (!r.optBoolean("disponible")) {
                em.createNativeQuery("UPDATE t_ordonnance_scan SET str_ETAT_LECTURE = 'indisponible', dt_UPDATED = ?1"
                        + " WHERE lg_SCAN_ID = ?2").setParameter(1, new Date()).setParameter(2, scanId).executeUpdate();
                return new JSONObject().put("success", true).put("lu", false).put("message", r.optString("message"));
            }
            lecture = r.getJSONObject("lecture");
            em.createNativeQuery("UPDATE t_ordonnance_scan SET str_ETAT_LECTURE = 'lu', str_LECTURE = ?1,"
                    + " dt_UPDATED = ?2 WHERE lg_SCAN_ID = ?3").setParameter(1, lecture.toString())
                    .setParameter(2, new Date()).setParameter(3, scanId).executeUpdate();
        }
        return new JSONObject().put("success", true).put("lu", true).put("proposition",
                proposer(lecture, emplacementId));
    }

    /** Ce que l'ecran pre-remplit a partir d'une lecture. */
    JSONObject proposer(JSONObject lecture, String emplacementId) {
        JSONArray lignes = new JSONArray();
        JSONArray produits = lecture.optJSONArray("produits");
        for (int i = 0; produits != null && i < produits.length(); i++) {
            JSONObject p = produits.optJSONObject(i);
            if (p == null) {
                continue;
            }
            String texte = p.optString("texte", "");
            JSONObject l = new JSONObject().put("texteLu", texte).put("posologie", p.optString("posologie", ""))
                    .put("duree", p.optString("duree", "")).put("quantite", Math.max(p.optInt("quantite", 1), 1));
            JSONObject article = rapprocherProduit(texte, emplacementId);
            boolean sur = p.has("confiance") && p.optDouble("confiance", 0) >= CONFIANCE_MIN;
            if (article != null) {
                l.put("articleId", article.getString("id")).put("libelle", article.getString("nom"))
                        .put("cip", article.optString("cip")).put("stock", article.optInt("stock"));
            } else {
                l.put("articleId", "").put("libelle", texte.toUpperCase(Locale.FRENCH)).put("stock", JSONObject.NULL);
                sur = false;
            }
            l.put("aVerifier", !sur);
            lignes.put(l);
        }
        JSONObject sortie = new JSONObject().put("lignes", lignes);
        JSONObject patient = lecture.optJSONObject("patient");
        if (patient != null) {
            sortie.put("patient", patient);
            String client = rapprocherClient(patient.optString("nom", ""));
            if (client != null) {
                sortie.put("clientId", client);
            }
        }
        JSONObject prescripteur = lecture.optJSONObject("prescripteur");
        if (prescripteur != null) {
            sortie.put("prescripteur", prescripteur);
            String medecin = rapprocherMedecin(prescripteur.optString("nom", ""));
            if (medecin != null) {
                Object nom = em
                        .createNativeQuery("SELECT TRIM(CONCAT(COALESCE(str_FIRST_NAME, ''), ' ',"
                                + " COALESCE(str_LAST_NAME, ''))) FROM t_medecin WHERE lg_MEDECIN_ID = ?1")
                        .setParameter(1, medecin).getSingleResult();
                sortie.put("medecinId", medecin).put("medecinNom", String.valueOf(nom));
            }
        }
        if (lecture.has("dateOrdonnance")) {
            LocalDate d = OrdonnanceClientSaisie.date(lecture.optString("dateOrdonnance"));
            if (d == null) {
                d = DateNaissance.lire(lecture.optString("dateOrdonnance"));
            }
            if (d != null && !d.isAfter(LocalDate.now())) {
                sortie.put("dateOrdonnance", d.toString());
            }
        }
        return sortie;
    }

    /** Les mots significatifs d'un texte lu (lettres et chiffres, 3 caracteres au moins), en capitales sans accents. */
    static List<String> mots(String texte) {
        String propre = StringUtils.stripAccents(StringUtils.defaultString(texte)).toUpperCase(Locale.FRENCH)
                .replaceAll("[^A-Z0-9,%]+", " ").trim();
        List<String> mots = new ArrayList<>();
        for (String m : propre.split(" ")) {
            if (m.length() >= 3 || (!mots.isEmpty() && m.matches("[0-9]+"))) {
                mots.add(m);
            }
        }
        return mots;
    }

    /** Le produit du catalogue le plus proche du texte lu : meme debut de nom, puis le plus en stock. */
    @SuppressWarnings("unchecked")
    JSONObject rapprocherProduit(String texte, String emplacementId) {
        List<String> mots = mots(texte);
        if (mots.isEmpty()) {
            return null;
        }
        try {
            StringBuilder sql = new StringBuilder("SELECT f.lg_FAMILLE_ID AS id, f.str_NAME AS nom, f.int_CIP AS cip,"
                    + " COALESCE((SELECT SUM(s.int_NUMBER_AVAILABLE) FROM t_famille_stock s WHERE s.lg_FAMILLE_ID ="
                    + " f.lg_FAMILLE_ID" + (emplacementId == null ? "" : " AND s.lg_EMPLACEMENT_ID = :emplacement")
                    + "), 0) AS stock FROM t_famille f WHERE f.str_STATUT = 'enable' AND f.str_NAME LIKE :debut");
            if (mots.size() > 1) {
                sql.append(" AND f.str_NAME LIKE :suite");
            }
            sql.append(" ORDER BY stock DESC, f.str_NAME");
            Query q = em.createNativeQuery(sql.toString(), Tuple.class).setParameter("debut", mots.get(0) + "%");
            if (emplacementId != null) {
                q.setParameter("emplacement", emplacementId);
            }
            if (mots.size() > 1) {
                q.setParameter("suite", "%" + mots.get(1) + "%");
            }
            List<Tuple> r = q.setMaxResults(1).getResultList();
            if (r.isEmpty() && mots.size() > 1) {
                return rapprocherProduit(mots.get(0), emplacementId);
            }
            if (r.isEmpty()) {
                return null;
            }
            Tuple t = r.get(0);
            return new JSONObject().put("id", t.get("id", String.class)).put("nom", t.get("nom", String.class))
                    .put("cip", t.get("cip") == null ? "" : String.valueOf(t.get("cip")))
                    .put("stock", ((Number) t.get("stock")).intValue());
        } catch (Exception e) {
            LOG.log(Level.WARNING, "rapprochement d'un produit lu", e);
            return null;
        }
    }

    /** Un client dont le nom complet est exactement celui lu (dans un sens ou dans l'autre), s'il est seul. */
    @SuppressWarnings("unchecked")
    String rapprocherClient(String nom) {
        String n = StringUtils.normalizeSpace(nom);
        if (n.length() < 3) {
            return null;
        }
        List<String> ids = em.createNativeQuery("SELECT lg_CLIENT_ID FROM t_client WHERE str_STATUT = 'enable' AND"
                + " (UPPER(CONCAT(COALESCE(str_FIRST_NAME, ''), ' ', COALESCE(str_LAST_NAME, ''))) = UPPER(?1)"
                + " OR UPPER(CONCAT(COALESCE(str_LAST_NAME, ''), ' ', COALESCE(str_FIRST_NAME, ''))) = UPPER(?1))")
                .setParameter(1, n).setMaxResults(2).getResultList();
        return ids.size() == 1 ? ids.get(0) : null;
    }

    @SuppressWarnings("unchecked")
    String rapprocherMedecin(String nom) {
        String n = StringUtils.normalizeSpace(nom).replaceAll("(?i)^(dr\\.?|docteur|pr\\.?)\\s+", "");
        if (n.length() < 3) {
            return null;
        }
        List<String> ids = em.createNativeQuery("SELECT lg_MEDECIN_ID FROM t_medecin WHERE str_STATUT = 'enable' AND"
                + " (UPPER(CONCAT(COALESCE(str_FIRST_NAME, ''), ' ', COALESCE(str_LAST_NAME, ''))) = UPPER(?1)"
                + " OR UPPER(CONCAT(COALESCE(str_LAST_NAME, ''), ' ', COALESCE(str_FIRST_NAME, ''))) = UPPER(?1)"
                + " OR UPPER(str_LAST_NAME) = UPPER(?1))").setParameter(1, n).setMaxResults(2).getResultList();
        return ids.size() == 1 ? ids.get(0) : null;
    }

    /* ------------------------------------------------------------------ traitement */

    public JSONObject ecarter(String scanId, TUser operateur) {
        int n = em
                .createNativeQuery("UPDATE t_ordonnance_scan SET str_STATUT = 'ecarte', dt_UPDATED = ?1,"
                        + " lg_USER_ID = COALESCE(lg_USER_ID, ?2) WHERE lg_SCAN_ID = ?3 AND str_STATUT = 'a_traiter'")
                .setParameter(1, new Date()).setParameter(2, operateur == null ? null : operateur.getLgUSERID())
                .setParameter(3, StringUtils.defaultString(scanId)).executeUpdate();
        return n == 0 ? echec("Ce scan n'est plus à traiter.")
                : new JSONObject().put("success", true).put("message", "Scan écarté.");
    }

    /**
     * Validation : cree l'ordonnance (et le client standard s'il est nouveau), y joint le scan, et marque le scan
     * traite. Tout ou rien : un refus a n'importe quelle etape annule l'ensemble.
     */
    public JSONObject valider(String scanId, JSONObject requete, TUser operateur) {
        JSONObject d = detail(scanId);
        if (!d.optBoolean("success")) {
            return d;
        }
        if (!"a_traiter".equals(d.getJSONObject("scan").optString("statut"))) {
            return echec("Ce scan a déjà été traité.");
        }
        Path f = fichier(scanId);
        if (f == null) {
            return echec("Le fichier du scan est introuvable.");
        }
        JSONObject nouveau = requete.optJSONObject("nouveauClient");
        boolean creerClient = StringUtils.isBlank(requete.optString("clientId", null)) && nouveau != null;
        /* Controles de l'ordonnance AVANT de creer un client : un refus ne doit pas laisser un client orphelin. */
        JSONObject essai = new JSONObject(requete.toString());
        if (creerClient) {
            essai.put("clientId", "nouveau");
        }
        List<String> refus = new ArrayList<>(OrdonnanceClientSaisie.valider(essai, LocalDate.now()));
        if (creerClient && StringUtils.isBlank(nouveau.optString("nom", null))) {
            refus.add("Le nom du nouveau client est obligatoire.");
        }
        if (!refus.isEmpty()) {
            return echec(String.join(" ", refus));
        }
        try {
            if (creerClient) {
                ClientLambdaDTO dto = new ClientLambdaDTO(null,
                        StringUtils.normalizeSpace(nouveau.optString("nom")).toUpperCase(Locale.FRENCH),
                        StringUtils.normalizeSpace(nouveau.optString("prenoms", "")).toUpperCase(Locale.FRENCH),
                        StringUtils.trimToEmpty(nouveau.optString("telephone", "")),
                        ClientStandardSaisie.TYPE_CLIENT_STANDARD, null, null);
                dto.setDtNAISSANCE(requete.optString("dateNaissance", null));
                TClient c = clientService.createClient(dto);
                if (c == null) {
                    return echec("Le nouveau client n'a pas pu être créé.");
                }
                requete.put("clientId", c.getLgCLIENTID());
            }
            requete.remove("id");
            JSONObject cree = ordonnanceService.enregistrer(requete, operateur);
            if (!cree.optBoolean("success")) {
                contexte.setRollbackOnly();
                return cree;
            }
            String ordonnanceId = cree.getString("id");
            try (InputStream flux = Files.newInputStream(f)) {
                JSONObject piece = ordonnanceService.ajouterPiece(ordonnanceId, nomDuScan(scanId), flux, Files.size(f),
                        operateur);
                if (!piece.optBoolean("success")) {
                    contexte.setRollbackOnly();
                    return echec("Le scan n'a pas pu être joint : " + piece.optString("message"));
                }
            }
            em.createNativeQuery("UPDATE t_ordonnance_scan SET str_STATUT = 'traite', lg_ORDONNANCE_ID = ?1,"
                    + " dt_UPDATED = ?2 WHERE lg_SCAN_ID = ?3").setParameter(1, ordonnanceId)
                    .setParameter(2, new Date()).setParameter(3, scanId).executeUpdate();
            return cree.put("clientId", requete.getString("clientId")).put("clientCree", creerClient);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "validation d'un scan d'ordonnance", e);
            contexte.setRollbackOnly();
            return echec("L'ordonnance n'a pas pu être créée.");
        }
    }

    /* ------------------------------------------------------------------ historique du patient */

    /**
     * Ce que le patient a deja eu sur ordonnance, du plus recent au plus ancien. {@code articles} : les produits de
     * l'ordonnance en cours ; avec {@code memeDci}, seuls les produits qui partagent une DCI avec eux sont gardes.
     */
    @SuppressWarnings("unchecked")
    public JSONObject historiqueProduits(String clientId, List<String> articles, boolean memeDci) {
        JSONArray data = new JSONArray();
        if (StringUtils.isBlank(clientId)) {
            return new JSONObject().put("success", true).put("data", data);
        }
        boolean filtre = memeDci && articles != null && !articles.isEmpty();
        try {
            Query q = em.createNativeQuery("SELECT d.lg_FAMILLE_ID AS articleId, d.str_LIBELLE AS libelle,"
                    + " d.int_QUANTITE AS quantite, d.int_QTE_SERVIE AS servie, d.str_POSOLOGIE AS posologie,"
                    + " o.dt_ORDONNANCE AS jour, o.str_NUMERO AS numero, o.int_RANG_RENOUVELLEMENT AS rang,"
                    + " COALESCE(orig.int_RENOUVELLEMENTS, o.int_RENOUVELLEMENTS) AS autorises,"
                    + " TRIM(CONCAT(COALESCE(m.str_FIRST_NAME, ''), ' ', COALESCE(m.str_LAST_NAME, ''))) AS medecin"
                    + " FROM t_ordonnance_client_detail d JOIN t_ordonnance_client o ON o.lg_ORDONNANCE_ID = d.lg_ORDONNANCE_ID"
                    + " LEFT JOIN t_ordonnance_client orig ON orig.lg_ORDONNANCE_ID = o.lg_ORDONNANCE_ORIGINE_ID"
                    + " LEFT JOIN t_medecin m ON m.lg_MEDECIN_ID = o.lg_MEDECIN_ID"
                    + " WHERE o.lg_CLIENT_ID = :client AND o.str_STATUT <> 'annulee'"
                    + (filtre ? " AND d.lg_FAMILLE_ID IN (SELECT fd.lg_FAMILLE_ID FROM t_famille_dci fd"
                            + " WHERE fd.lg_DCI_ID IN (SELECT x.lg_DCI_ID FROM t_famille_dci x WHERE x.lg_FAMILLE_ID IN :articles))"
                            : "")
                    + " ORDER BY o.dt_ORDONNANCE DESC, o.dt_CREATED DESC, d.int_ORDRE", Tuple.class)
                    .setParameter("client", clientId);
            if (filtre) {
                q.setParameter("articles", articles);
            }
            for (Tuple t : (List<Tuple>) q.setMaxResults(40).getResultList()) {
                int rang = t.get("rang") == null ? 0 : ((Number) t.get("rang")).intValue();
                int autorises = t.get("autorises") == null ? 0 : ((Number) t.get("autorises")).intValue();
                data.put(new JSONObject().put("articleId", StringUtils.defaultString(t.get("articleId", String.class)))
                        .put("libelle", StringUtils.defaultString(t.get("libelle", String.class)))
                        .put("quantite", t.get("quantite") == null ? 1 : ((Number) t.get("quantite")).intValue())
                        .put("servie",
                                t.get("servie") == null ? JSONObject.NULL : ((Number) t.get("servie")).intValue())
                        .put("posologie", StringUtils.defaultString(t.get("posologie", String.class)))
                        .put("date", String.valueOf(t.get("jour")).substring(0, 10))
                        .put("numero", t.get("numero", String.class))
                        .put("delivrance", rang > 0 ? "Renouv. " + rang + "/" + autorises : "1re délivrance")
                        .put("medecin", StringUtils.defaultString(t.get("medecin", String.class))));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "historique des produits d'un patient", e);
            return echec("L'historique du patient n'a pas pu être lu.").put("data", new JSONArray());
        }
        return new JSONObject().put("success", true).put("total", data.length()).put("data", data);
    }

    private static JSONObject echec(String message) {
        return new JSONObject().put("success", false).put("message", message);
    }
}
