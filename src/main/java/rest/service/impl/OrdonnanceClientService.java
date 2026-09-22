package rest.service.impl;

import dal.TClient;
import dal.TFamille;
import dal.TMedecin;
import dal.TOrdonnanceClient;
import dal.TOrdonnanceClientDetail;
import dal.TOrdonnanceClientPiece;
import dal.TUser;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.Tuple;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.impl.OrdonnanceClientSql.Criteres;

/**
 * Ordonnances des clients (evolution 6, point 2, vague 1) : enregistrement, historique, consultation, annulation.
 *
 * <p>
 * Ce service ne touche a RIEN de la chaine de vente. Il n'ecrit que dans ses trois tables, ne bouge aucun stock, ne
 * cree aucune vente et n'alimente pas l'ordonnancier reglementaire. Une ordonnance est ici un document rattache au
 * dossier du client, conserve tel quel.
 *
 * <p>
 * Un client peut en avoir autant qu'il en presente : chaque enregistrement cree un nouveau document et ne remplace
 * jamais les precedents. Rien ne se supprime : l'annulation garde le document, son motif et son auteur.
 */
@Stateless
public class OrdonnanceClientService {

    private static final Logger LOG = Logger.getLogger(OrdonnanceClientService.class.getName());

    private static final java.time.format.DateTimeFormatter FR_JOUR = java.time.format.DateTimeFormatter
            .ofPattern("dd/MM/yyyy");

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @javax.ejb.EJB
    private rest.report.ReportUtil reportUtil;

    @javax.ejb.EJB
    private rest.service.utils.ReportExcelExportService excelService;

    /**
     * Historique, du plus recent au plus ancien, avec ses filtres.
     *
     * @param start
     *            premiere ligne (pagination)
     * @param limit
     *            nombre de lignes ; 0 pour tout (editions et export)
     */
    @SuppressWarnings("unchecked")
    public JSONObject liste(Criteres criteres, int start, int limit) {
        JSONArray data = new JSONArray();
        long total = 0;
        try {
            Query compte = em.createNativeQuery(OrdonnanceClientSql.compte(criteres));
            OrdonnanceClientSql.lier(compte, criteres);
            total = ((Number) compte.getSingleResult()).longValue();

            Query q = em.createNativeQuery(OrdonnanceClientSql.liste(criteres), Tuple.class);
            OrdonnanceClientSql.lier(q, criteres);
            if (limit > 0) {
                q.setFirstResult(Math.max(0, start)).setMaxResults(limit);
            }
            for (Tuple t : (List<Tuple>) q.getResultList()) {
                data.put(ligne(t));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "historique des ordonnances clients", e);
            return new JSONObject().put("success", false).put("total", 0).put("data", new JSONArray()).put("message",
                    "L'historique des ordonnances n'a pas pu être lu.");
        }
        return new JSONObject().put("success", true).put("total", total).put("data", data);
    }

    private static JSONObject ligne(Tuple t) {
        return new JSONObject().put("id", t.get("id", String.class)).put("numero", t.get("numero", String.class))
                .put("dateOrdonnance", jour(t.get("dateOrdonnance")))
                .put("statut", StringUtils.defaultString(t.get("statut", String.class)))
                .put("motifAnnulation", StringUtils.defaultString(t.get("motifAnnulation", String.class)))
                .put("etablissement", StringUtils.defaultString(t.get("etablissement", String.class)))
                .put("observations", StringUtils.defaultString(t.get("observations", String.class)))
                .put("clientId", StringUtils.defaultString(t.get("clientId", String.class)))
                .put("client", StringUtils.trimToEmpty(t.get("client", String.class)))
                .put("typeClient", StringUtils.defaultString(t.get("typeClient", String.class)))
                .put("telephone", StringUtils.defaultString(t.get("telephone", String.class)))
                .put("medecinId", StringUtils.defaultString(t.get("medecinId", String.class)))
                .put("medecin", StringUtils.trimToEmpty(t.get("medecin", String.class)))
                .put("nbProduits", entier(t.get("nbProduits"))).put("nbPieces", entier(t.get("nbPieces")))
                .put("nbRenseignees", entier(t.get("nbRenseignees"))).put("nbServies", entier(t.get("nbServies")))
                .put("qteServie", entier(t.get("qteServie")))
                .put("etatService",
                        OrdonnanceClientSaisie.etatService(entier(t.get("nbProduits")), entier(t.get("nbRenseignees")),
                                entier(t.get("nbServies")), entier(t.get("qteServie"))))
                .put("agePatient", t.get("agePatient") == null ? JSONObject.NULL : entier(t.get("agePatient")))
                .put("sexePatient", StringUtils.defaultString(t.get("sexePatient", String.class)))
                .put("grossesse", vrai(t.get("grossesse"))).put("allaitement", vrai(t.get("allaitement")))
                .put("insuffisanceRenale", vrai(t.get("insuffisanceRenale")))
                .put("insuffisanceHepatique", vrai(t.get("insuffisanceHepatique")))
                .put("creeLe", horodatage(t.get("creeLe")))
                .put("creePar", StringUtils.trimToEmpty(t.get("creePar", String.class)))
                .put("modifieLe", horodatage(t.get("modifieLe")))
                .put("modifiePar", StringUtils.trimToEmpty(t.get("modifiePar", String.class)));
    }

    /** Une ordonnance et ses produits, pour la fiche de consultation. */
    @SuppressWarnings("unchecked")
    public JSONObject detail(String ordonnanceId) {
        if (StringUtils.isBlank(ordonnanceId)) {
            return new JSONObject().put("success", false).put("message", "Ordonnance inconnue.");
        }
        try {
            Criteres tous = new Criteres(null, null, null, null, null, null, true);
            Query q = em.createNativeQuery(OrdonnanceClientSql.liste(tous).replace(" WHERE 1 = 1 ",
                    " WHERE o.lg_ORDONNANCE_ID = :ordonnance "), Tuple.class);
            q.setParameter("ordonnance", ordonnanceId);
            List<Tuple> entetes = q.getResultList();
            if (entetes.isEmpty()) {
                return new JSONObject().put("success", false).put("message", "Ordonnance inconnue.");
            }
            JSONObject entete = ligne(entetes.get(0));
            JSONArray produits = new JSONArray();
            Query d = em.createNativeQuery(OrdonnanceClientSql.details(), Tuple.class);
            d.setParameter("ordonnance", ordonnanceId);
            for (Tuple t : (List<Tuple>) d.getResultList()) {
                produits.put(new JSONObject().put("id", t.get("id", String.class))
                        .put("articleId", StringUtils.defaultString(t.get("articleId", String.class)))
                        .put("libelle", StringUtils.defaultString(t.get("libelle", String.class)))
                        .put("cip", t.get("cip") == null ? "" : String.valueOf(t.get("cip")))
                        .put("quantite", entier(t.get("quantite")))
                        .put("posologie", StringUtils.defaultString(t.get("posologie", String.class)))
                        .put("duree", StringUtils.defaultString(t.get("duree", String.class)))
                        .put("ordre", entier(t.get("ordre")))
                        .put("qteServie", t.get("qteServie") == null ? JSONObject.NULL : entier(t.get("qteServie"))));
            }
            return new JSONObject().put("success", true).put("ordonnance", entete).put("produits", produits);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "detail d'une ordonnance client", e);
            return new JSONObject().put("success", false).put("message", "L'ordonnance n'a pas pu être lue.");
        }
    }

    /**
     * Enregistre une ordonnance : creation si {@code id} est absent, mise a jour sinon.
     *
     * <p>
     * Les controles de {@link OrdonnanceClientSaisie} sont rejoues ICI et pas seulement dans l'ecran : un controle qui
     * ne vit que dans le navigateur est un controle qu'un appel direct au service contourne.
     *
     * <p>
     * En modification, les produits sont REMPLACES par ceux qui arrivent. C'est le geste attendu (on corrige la
     * prescription telle qu'elle est lue sur le papier), et cela evite un rapprochement ligne a ligne qui laisserait
     * des lignes fantomes au moindre ecart.
     */
    public JSONObject enregistrer(JSONObject requete, TUser operateur) {
        List<String> refus = OrdonnanceClientSaisie.valider(requete, LocalDate.now());
        if (!refus.isEmpty()) {
            return new JSONObject().put("success", false).put("message", String.join(" ", refus));
        }
        try {
            String id = requete.optString("id", null);
            TOrdonnanceClient ordonnance;
            boolean creation = StringUtils.isBlank(id);
            if (creation) {
                ordonnance = new TOrdonnanceClient();
                ordonnance.setLgORDONNANCEID(identifiant());
                ordonnance.setDtCREATED(new Date());
                ordonnance.setLgUSERCREATED(operateur == null ? null : operateur.getLgUSERID());
                ordonnance.setStrSTATUT(TOrdonnanceClient.STATUT_ACTIVE);
            } else {
                ordonnance = em.find(TOrdonnanceClient.class, id);
                if (ordonnance == null) {
                    return new JSONObject().put("success", false).put("message", "Ordonnance inconnue.");
                }
                if (ordonnance.estAnnulee()) {
                    /*
                     * Une ordonnance annulee est un document clos. La modifier reviendrait a recrire l'histoire :
                     * l'officine en saisit une nouvelle.
                     */
                    return new JSONObject().put("success", false).put("message",
                            "Cette ordonnance est annulée : saisissez-en une nouvelle.");
                }
                ordonnance.setLgUSERUPDATED(operateur == null ? null : operateur.getLgUSERID());
                ordonnance.setDtUPDATED(new Date());
            }

            TClient client = em.find(TClient.class, requete.getString("clientId"));
            if (client == null) {
                return new JSONObject().put("success", false).put("message", "Client inconnu.");
            }
            ordonnance.setClient(client);
            LocalDate jour = OrdonnanceClientSaisie.date(requete.optString("dateOrdonnance", null));
            ordonnance.setDtORDONNANCE(java.sql.Date.valueOf(jour));
            String medecinId = requete.optString("medecinId", null);
            ordonnance.setMedecin(StringUtils.isBlank(medecinId) ? null : em.find(TMedecin.class, medecinId));
            ordonnance.setStrETABLISSEMENT(OrdonnanceClientSaisie.tronquer(requete.optString("etablissement", null),
                    OrdonnanceClientSaisie.MAX_ETABLISSEMENT));
            ordonnance.setStrOBSERVATIONS(StringUtils.trimToNull(requete.optString("observations", null)));
            ordonnance.setIntAGEPATIENT(OrdonnanceClientSaisie.agePatient(requete));
            ordonnance.setStrSEXEPATIENT(OrdonnanceClientSaisie.sexePatient(requete));
            ordonnance.setBoolGROSSESSE(requete.optBoolean("grossesse", false));
            ordonnance.setBoolALLAITEMENT(requete.optBoolean("allaitement", false));
            ordonnance.setBoolINSUFRENALE(requete.optBoolean("insuffisanceRenale", false));
            ordonnance.setBoolINSUFHEPATIQUE(requete.optBoolean("insuffisanceHepatique", false));
            if (creation) {
                ordonnance.setStrNUMERO(numeroSuivant(jour));
                em.persist(ordonnance);
            }
            remplacerProduits(ordonnance, requete.optJSONArray("produits"));
            em.flush();
            return new JSONObject().put("success", true).put("id", ordonnance.getLgORDONNANCEID())
                    .put("numero", ordonnance.getStrNUMERO())
                    .put("message", creation ? "Ordonnance " + ordonnance.getStrNUMERO() + " enregistrée."
                            : "Ordonnance " + ordonnance.getStrNUMERO() + " modifiée.");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "enregistrement d'une ordonnance client", e);
            return new JSONObject().put("success", false).put("message", "L'ordonnance n'a pas pu être enregistrée.");
        }
    }

    private void remplacerProduits(TOrdonnanceClient ordonnance, JSONArray produits) {
        /*
         * On VIDE la collection existante et on la remplit, au lieu de lui substituer une nouvelle liste.
         *
         * Hibernate refuse la substitution sur une collection en orphanRemoval (« A collection with
         * cascade=all-delete-orphan was no longer referenced by the owning entity instance ») : la modification d'une
         * ordonnance echouait donc systematiquement. Defaut de ma main, vu a la premiere correction jouee sur le banc.
         *
         * La suppression des anciennes lignes est faite par orphanRemoval, et non par un DELETE en masse : un DELETE en
         * masse ne previent pas le contexte de persistance, qui garderait les lignes effacees en memoire et tenterait
         * de les reecrire au flush.
         */
        if (ordonnance.getDetails() == null) {
            ordonnance.setDetails(new ArrayList<TOrdonnanceClientDetail>());
        }
        ordonnance.getDetails().clear();
        int ordre = 1;
        for (int i = 0; produits != null && i < produits.length(); i++) {
            JSONObject p = produits.optJSONObject(i);
            if (p == null || OrdonnanceClientSaisie.estLigneVide(p)) {
                continue;
            }
            TOrdonnanceClientDetail ligne = new TOrdonnanceClientDetail();
            ligne.setLgDETAILID(identifiant());
            ligne.setOrdonnance(ordonnance);
            String articleId = p.optString("articleId", null);
            TFamille article = StringUtils.isBlank(articleId) ? null : em.find(TFamille.class, articleId);
            ligne.setArticle(article);
            /*
             * Le libelle est recopie meme pour un article reference : le referentiel evolue (renommage, retrait), le
             * document ne doit pas changer de sens des annees apres sa saisie.
             */
            String libelle = OrdonnanceClientSaisie.libelle(p);
            if (StringUtils.isBlank(libelle) && article != null) {
                libelle = article.getStrNAME();
            }
            ligne.setStrLIBELLE(OrdonnanceClientSaisie.tronquer(libelle, OrdonnanceClientSaisie.MAX_LIBELLE));
            ligne.setIntQUANTITE(Math.max(1, p.optInt("quantite", 1)));
            ligne.setStrPOSOLOGIE(OrdonnanceClientSaisie.tronquer(p.optString("posologie", null),
                    OrdonnanceClientSaisie.MAX_POSOLOGIE));
            ligne.setStrDUREE(
                    OrdonnanceClientSaisie.tronquer(p.optString("duree", null), OrdonnanceClientSaisie.MAX_DUREE));
            ligne.setIntQTESERVIE(OrdonnanceClientSaisie.qteServie(p));
            ligne.setIntORDRE(ordre++);
            ordonnance.getDetails().add(ligne);
        }
    }

    /**
     * Annulation : le document reste, avec son motif, son auteur et son horodatage.
     *
     * <p>
     * C'est volontairement la seule sortie possible. Une suppression laisserait un trou dans l'historique d'un patient,
     * et personne ne pourrait dire si le document n'a jamais existe ou s'il a ete efface.
     */
    public JSONObject annuler(String ordonnanceId, String motif, TUser operateur) {
        if (StringUtils.isBlank(motif)) {
            return new JSONObject().put("success", false).put("message", "Indiquez le motif de l'annulation.");
        }
        try {
            TOrdonnanceClient ordonnance = em.find(TOrdonnanceClient.class, ordonnanceId);
            if (ordonnance == null) {
                return new JSONObject().put("success", false).put("message", "Ordonnance inconnue.");
            }
            if (ordonnance.estAnnulee()) {
                return new JSONObject().put("success", true).put("message", "Cette ordonnance était déjà annulée.");
            }
            ordonnance.setStrSTATUT(TOrdonnanceClient.STATUT_ANNULEE);
            ordonnance.setStrMOTIFANNULATION(OrdonnanceClientSaisie.tronquer(motif, OrdonnanceClientSaisie.MAX_MOTIF));
            ordonnance.setLgUSERUPDATED(operateur == null ? null : operateur.getLgUSERID());
            ordonnance.setDtUPDATED(new Date());
            em.flush();
            return new JSONObject().put("success", true).put("message",
                    "Ordonnance " + ordonnance.getStrNUMERO() + " annulée.");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "annulation d'une ordonnance client", e);
            return new JSONObject().put("success", false).put("message", "L'annulation n'a pas pu être enregistrée.");
        }
    }

    /**
     * Numero du mois suivant le dernier attribue. La lecture et l'ecriture sont dans la meme transaction que
     * l'enregistrement : deux saisies simultanees ne peuvent pas obtenir le meme numero, la contrainte d'unicite de la
     * colonne refusant la seconde.
     */
    String numeroSuivant(LocalDate jour) {
        String prefixe = OrdonnanceClientSaisie.numero(jour, 0);
        prefixe = prefixe.substring(0, prefixe.lastIndexOf('-') + 1);
        Object dernier = em
                .createNativeQuery("SELECT MAX(o.str_NUMERO) FROM t_ordonnance_client o WHERE o.str_NUMERO LIKE ?1")
                .setParameter(1, prefixe + "%").getSingleResult();
        return OrdonnanceClientSaisie.numero(jour,
                OrdonnanceClientSaisie.sequenceSuivante(dernier == null ? null : String.valueOf(dernier)));
    }

    /*
     * EDITIONS ET EXPORT (vague 3)
     *
     * « Imprimer la fiche detaillee d'une ordonnance. Imprimer l'historique des ordonnances d'un client ou la liste
     * filtree. Exporter en Excel la liste des ordonnances et les produits prescrits, en tenant compte des filtres
     * selectionnes. »
     *
     * Les editions relisent la MEME requete que l'ecran, avec les MEMES criteres : l'imprime et l'affiche ne peuvent
     * donc pas montrer des lignes differentes. C'est la seule facon de rendre un total imprime defendable devant un
     * controle.
     */

    /** Modeles embarques : aucun fichier a poser sur les sites pour que les editions fonctionnent. */
    public static final String MODELE_FICHE = "ordonnance_fiche";
    public static final String MODELE_HISTORIQUE = "ordonnance_historique";

    /** L'historique sous forme de lignes, pour l'edition : la liste complete, sans pagination. */
    @SuppressWarnings("unchecked")
    public List<rest.service.dto.OrdonnanceLigneDTO> lignesHistorique(Criteres criteres) {
        List<rest.service.dto.OrdonnanceLigneDTO> out = new ArrayList<>();
        try {
            Query q = em.createNativeQuery(OrdonnanceClientSql.liste(criteres), Tuple.class);
            OrdonnanceClientSql.lier(q, criteres);
            for (Tuple t : (List<Tuple>) q.getResultList()) {
                out.add(new rest.service.dto.OrdonnanceLigneDTO(t.get("numero", String.class),
                        jourFr(t.get("dateOrdonnance")), StringUtils.trimToEmpty(t.get("client", String.class)),
                        StringUtils.defaultString(t.get("typeClient", String.class)),
                        StringUtils.trimToEmpty(t.get("medecin", String.class)),
                        StringUtils.defaultString(t.get("etablissement", String.class)), entier(t.get("nbProduits")),
                        entier(t.get("nbPieces")), StringUtils.defaultString(t.get("statut", String.class)),
                        StringUtils.trimToEmpty(t.get("creePar", String.class)))
                                .etatService(OrdonnanceClientSaisie.etatService(entier(t.get("nbProduits")),
                                        entier(t.get("nbRenseignees")), entier(t.get("nbServies")),
                                        entier(t.get("qteServie")))));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "historique des ordonnances pour edition", e);
        }
        return out;
    }

    /**
     * Les produits prescrits des ordonnances retenues, UNE LIGNE PAR PRODUIT.
     *
     * <p>
     * C'est la forme de l'export Excel : l'officine peut trier, filtrer et croiser sur les produits, ce qu'un fichier a
     * une ligne par ordonnance avec les produits concatenes n'aurait pas permis.
     *
     * <p>
     * La jointure sur les produits est LACHE : une ordonnance sans produit - cas theorique, la saisie l'interdit -
     * sortirait quand meme. Mieux vaut une ordonnance visible sans produit qu'une ordonnance absente de l'export.
     */
    @SuppressWarnings("unchecked")
    public List<rest.service.dto.OrdonnanceProduitDTO> produitsHistorique(Criteres criteres) {
        List<rest.service.dto.OrdonnanceProduitDTO> out = new ArrayList<>();
        try {
            String sql = "SELECT o.str_NUMERO AS numero, o.dt_ORDONNANCE AS dateOrdonnance,"
                    + " TRIM(CONCAT(COALESCE(c.str_FIRST_NAME, ''), ' ', COALESCE(c.str_LAST_NAME, ''))) AS client,"
                    + " tc.str_NAME AS typeClient,"
                    + " TRIM(CONCAT(COALESCE(m.str_FIRST_NAME, ''), ' ', COALESCE(m.str_LAST_NAME, ''))) AS medecin,"
                    + " o.str_ETABLISSEMENT AS etablissement, o.str_STATUT AS statut,"
                    + " d.str_LIBELLE AS produit, f.int_CIP AS cip, d.int_QUANTITE AS quantite,"
                    + " d.str_POSOLOGIE AS posologie, d.str_DUREE AS duree, d.int_QTE_SERVIE AS qteServie"
                    + " FROM t_ordonnance_client o" + " JOIN t_client c ON c.lg_CLIENT_ID = o.lg_CLIENT_ID"
                    + " LEFT JOIN t_type_client tc ON tc.lg_TYPE_CLIENT_ID = c.lg_TYPE_CLIENT_ID"
                    + " LEFT JOIN t_medecin m ON m.lg_MEDECIN_ID = o.lg_MEDECIN_ID"
                    + " LEFT JOIN t_user uc ON uc.lg_USER_ID = o.lg_USER_CREATED"
                    + " LEFT JOIN t_user uu ON uu.lg_USER_ID = o.lg_USER_UPDATED"
                    + " LEFT JOIN t_ordonnance_client_detail d ON d.lg_ORDONNANCE_ID = o.lg_ORDONNANCE_ID"
                    + " LEFT JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                    + OrdonnanceClientSql.conditions(criteres)
                    + " ORDER BY o.dt_ORDONNANCE DESC, o.dt_CREATED DESC, d.int_ORDRE ASC";
            Query q = em.createNativeQuery(sql, Tuple.class);
            OrdonnanceClientSql.lier(q, criteres);
            for (Tuple t : (List<Tuple>) q.getResultList()) {
                out.add(new rest.service.dto.OrdonnanceProduitDTO(t.get("numero", String.class),
                        jourFr(t.get("dateOrdonnance")), StringUtils.trimToEmpty(t.get("client", String.class)),
                        StringUtils.defaultString(t.get("typeClient", String.class)),
                        StringUtils.trimToEmpty(t.get("medecin", String.class)),
                        StringUtils.defaultString(t.get("etablissement", String.class)),
                        StringUtils.defaultString(t.get("produit", String.class)),
                        t.get("cip") == null ? "" : String.valueOf(t.get("cip")), entier(t.get("quantite")),
                        StringUtils.defaultString(t.get("posologie", String.class)),
                        StringUtils.defaultString(t.get("duree", String.class)),
                        StringUtils.defaultString(t.get("statut", String.class)))
                                .qteServie(t.get("qteServie") == null ? null : entier(t.get("qteServie"))));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "produits prescrits pour export", e);
        }
        return out;
    }

    /**
     * Rappel des criteres imprime.
     *
     * <p>
     * Une edition qui tait ses filtres laisse croire qu'elle porte sur tout l'historique : celle-ci nomme le client, le
     * type, la periode et le prescripteur tels qu'ils ont ete poses, et dit si les annulees sont comprises.
     */
    public String rappelCriteres(Criteres criteres, String clientLibelle, String typeLibelle, String medecinLibelle) {
        StringBuilder sb = new StringBuilder();
        if (StringUtils.isNotBlank(clientLibelle)) {
            sb.append("Client : ").append(clientLibelle.trim());
        } else {
            sb.append("Tous les clients");
        }
        if (StringUtils.isNotBlank(typeLibelle)) {
            sb.append(" - Type : ").append(typeLibelle.trim());
        }
        if (StringUtils.isNotBlank(medecinLibelle)) {
            sb.append(" - Prescripteur : ").append(medecinLibelle.trim());
        }
        if (criteres.debut != null || criteres.fin != null) {
            sb.append(" - Période du ").append(criteres.debut == null ? "origine" : criteres.debut.format(FR_JOUR))
                    .append(" au ").append(criteres.fin == null ? "aujourd'hui" : criteres.fin.format(FR_JOUR));
        } else {
            sb.append(" - Toutes périodes");
        }
        if (StringUtils.isNotBlank(criteres.recherche)) {
            sb.append(" - Recherche : ").append(criteres.recherche.trim());
        }
        sb.append(criteres.inclureAnnulees ? " - annulées comprises" : " - annulées exclues");
        return sb.toString();
    }

    /** Edition de l'historique : la liste filtree, ou celle d'un seul client - c'est le meme etat. */
    public byte[] pdfHistorique(TUser operateur, Criteres criteres, String clientLibelle, String typeLibelle,
            String medecinLibelle) throws net.sf.jasperreports.engine.JRException {
        String titre = StringUtils.isNotBlank(clientLibelle)
                ? "ORDONNANCES DU CLIENT - " + clientLibelle.trim().toUpperCase()
                : "HISTORIQUE DES ORDONNANCES CLIENTS";
        return editer(operateur, MODELE_HISTORIQUE, titre,
                rappelCriteres(criteres, clientLibelle, typeLibelle, medecinLibelle), lignesHistorique(criteres),
                new HashMap<String, Object>());
    }

    /**
     * Fiche detaillee d'une ordonnance.
     *
     * <p>
     * Les pieces jointes ne sont pas imprimees, seulement comptees : ce sont des scans et des photos, dont l'impression
     * dans une fiche de synthese ne servirait personne. Elles restent consultables et telechargeables dans
     * l'application, comme l'officine l'a demande.
     */
    public byte[] pdfFiche(TUser operateur, String ordonnanceId) throws net.sf.jasperreports.engine.JRException {
        JSONObject detail = detail(ordonnanceId);
        if (!detail.optBoolean("success", false)) {
            throw new net.sf.jasperreports.engine.JRException("Ordonnance introuvable");
        }
        JSONObject o = detail.getJSONObject("ordonnance");
        List<rest.service.dto.OrdonnanceProduitDTO> produits = new ArrayList<>();
        JSONArray lignes = detail.optJSONArray("produits");
        for (int i = 0; lignes != null && i < lignes.length(); i++) {
            JSONObject p = lignes.getJSONObject(i);
            produits.add(new rest.service.dto.OrdonnanceProduitDTO(o.optString("numero"), "", "", "", "", "",
                    p.optString("libelle"), p.optString("cip"), p.optInt("quantite", 1), p.optString("posologie"),
                    p.optString("duree"), o.optString("statut"))
                            .qteServie(p.isNull("qteServie") ? null : p.optInt("qteServie")));
        }
        Map<String, Object> extra = new HashMap<>();
        extra.put("P_CLIENT", o.optString("client"));
        extra.put("P_TYPE_CLIENT", o.optString("typeClient"));
        extra.put("P_TELEPHONE", o.optString("telephone"));
        extra.put("P_DATE", jourFrDepuisIso(o.optString("dateOrdonnance")));
        extra.put("P_PRESCRIPTEUR", StringUtils.defaultIfBlank(o.optString("medecin"), "Non renseigné"));
        extra.put("P_ETABLISSEMENT", StringUtils.defaultIfBlank(o.optString("etablissement"), "Non renseigné"));
        extra.put("P_OBSERVATIONS", StringUtils.defaultIfBlank(o.optString("observations"), "-"));
        int nbPieces = o.optInt("nbPieces", 0);
        extra.put("P_PIECES", nbPieces == 0 ? "Aucune pièce jointe"
                : nbPieces + " pièce(s) jointe(s), consultables dans l'application");
        extra.put("P_ANNULATION", "annulee".equals(o.optString("statut"))
                ? "ORDONNANCE ANNULÉE - " + o.optString("motifAnnulation") : "");
        StringBuilder trace = new StringBuilder("Saisie le ").append(o.optString("creeLe")).append(" par ")
                .append(StringUtils.defaultIfBlank(o.optString("creePar"), "?"));
        if (StringUtils.isNotBlank(o.optString("modifieLe"))) {
            trace.append(" - dernière modification le ").append(o.optString("modifieLe")).append(" par ")
                    .append(StringUtils.defaultIfBlank(o.optString("modifiePar"), "?"));
        }
        extra.put("P_TRACABILITE", trace.toString());
        return editer(operateur, MODELE_FICHE, "ORDONNANCE " + o.optString("numero"),
                "Fiche détaillée - " + o.optString("client"), produits, extra);
    }

    /**
     * Export Excel : une ligne par produit prescrit, les colonnes de l'ordonnance repetees, filtres compris.
     *
     * <p>
     * « Les pieces jointes restent consultables dans l'application ; l'export Excel contient les donnees renseignees. »
     * Le fichier ne porte donc que du texte et des nombres - aucun fichier joint n'y est embarque.
     */
    public byte[] excelHistorique(Criteres criteres) throws java.io.IOException {
        String[] entetes = { "N° ORDONNANCE", "DATE", "CLIENT", "TYPE CLIENT", "PRESCRIPTEUR", "ÉTABLISSEMENT",
                "PRODUIT PRESCRIT", "CIP", "QUANTITÉ", "QTÉ SERVIE", "POSOLOGIE", "DURÉE", "ÉTAT" };
        return excelService.createLandscapeExcelReport("Ordonnances clients", entetes, produitsHistorique(criteres),
                (ligne, p) -> {
                    int c = 0;
                    ligne.createCell(c++).setCellValue(p.getNumero());
                    ligne.createCell(c++).setCellValue(p.getDate());
                    ligne.createCell(c++).setCellValue(p.getClient());
                    ligne.createCell(c++).setCellValue(p.getTypeClient());
                    ligne.createCell(c++).setCellValue(p.getMedecin());
                    ligne.createCell(c++).setCellValue(p.getEtablissement());
                    ligne.createCell(c++).setCellValue(p.getProduit());
                    ligne.createCell(c++).setCellValue(p.getCip());
                    ligne.createCell(c++).setCellValue(p.getQuantite());
                    /* Vide = service non renseigne : une cellule vide, et non 0 qui dirait « non servi ». */
                    if (p.getQteServie() == null) {
                        ligne.createCell(c++).setCellValue("");
                    } else {
                        ligne.createCell(c++).setCellValue(p.getQteServie());
                    }
                    ligne.createCell(c++).setCellValue(p.getPosologie());
                    ligne.createCell(c++).setCellValue(p.getDuree());
                    ligne.createCell(c).setCellValue(p.getEtat());
                });
    }

    /** PDF rendu en memoire : servi en flux dans l'onglet ouvert par le clic, sans fichier temporaire. */
    private byte[] editer(TUser operateur, String modeleNom, String titre, String rappel, List<?> lignes,
            Map<String, Object> extra) throws net.sf.jasperreports.engine.JRException {
        Map<String, Object> parametres = new HashMap<>();
        try {
            parametres.putAll(reportUtil.officineData(operateur));
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "en-tete de l'officine indisponible pour l'edition des ordonnances", e);
        }
        parametres.put("P_TITRE", titre);
        parametres.put("P_CRITERES", rappel);
        parametres.putAll(extra);
        net.sf.jasperreports.engine.JasperReport modele = reportUtil.compileFromClasspath(modeleNom);
        if (modele == null) {
            throw new net.sf.jasperreports.engine.JRException(
                    "Modele embarque " + modeleNom + ".jrxml introuvable dans l'application");
        }
        net.sf.jasperreports.engine.JasperPrint print = net.sf.jasperreports.engine.JasperFillManager.fillReport(modele,
                parametres, new net.sf.jasperreports.engine.data.JRBeanCollectionDataSource(lignes));
        try (java.io.ByteArrayOutputStream sortie = new java.io.ByteArrayOutputStream()) {
            net.sf.jasperreports.engine.export.JRPdfExporter exporteur = new net.sf.jasperreports.engine.export.JRPdfExporter();
            exporteur.setExporterInput(new net.sf.jasperreports.export.SimpleExporterInput(print));
            exporteur.setExporterOutput(new net.sf.jasperreports.export.SimpleOutputStreamExporterOutput(sortie));
            exporteur.exportReport();
            return sortie.toByteArray();
        } catch (java.io.IOException e) {
            throw new net.sf.jasperreports.engine.JRException(e);
        }
    }

    private static String jourFr(Object valeur) {
        if (valeur instanceof java.sql.Date) {
            return ((java.sql.Date) valeur).toLocalDate().format(FR_JOUR);
        }
        return jour(valeur);
    }

    private static String jourFrDepuisIso(String iso) {
        LocalDate jour = OrdonnanceClientSaisie.date(iso);
        return jour == null ? "" : jour.format(FR_JOUR);
    }
    /*
     * ============================================================================================= PIECES
     * JUSTIFICATIVES (vague 2)
     *
     * « Permettre de joindre une ou plusieurs pieces justificatives : images, fichiers PDF ou documents numerises. Ces
     * pieces doivent pouvoir etre visualisees et telechargees depuis la fiche. »
     *
     * Le fichier va sur DISQUE, sous la racine de stockage du logiciel ; seul son chemin relatif est en base. Des scans
     * en base, c'est une sauvegarde qui triple de volume et une base qui ralentit pour tout le monde.
     * =============================================================================================
     */

    /**
     * Depose une piece sur une ordonnance.
     *
     * <p>
     * L'ordre des operations n'est pas indifferent : on ECRIT LE FICHIER D'ABORD, la ligne ensuite. Dans l'autre sens,
     * un disque plein laisserait en base une piece qui n'existe pas, et la fiche afficherait un document introuvable.
     * Ici, le pire cas est un fichier sans ligne - invisible, et que la purge ramasse.
     */
    public JSONObject ajouterPiece(String ordonnanceId, String nomOrigine, java.io.InputStream flux, long taille,
            TUser operateur) {
        String refus = OrdonnancePieces.refus(nomOrigine, taille);
        if (refus != null) {
            return new JSONObject().put("success", false).put("message", refus);
        }
        try {
            TOrdonnanceClient ordonnance = em.find(TOrdonnanceClient.class, ordonnanceId);
            if (ordonnance == null) {
                return new JSONObject().put("success", false).put("message", "Ordonnance inconnue.");
            }
            if (ordonnance.estAnnulee()) {
                return new JSONObject().put("success", false).put("message",
                        "Cette ordonnance est annulée : on n'y joint plus de pièce.");
            }
            String pieceId = identifiant();
            String nomPropre = OrdonnancePieces.assainir(nomOrigine);
            String relatif = OrdonnancePieces.cheminRelatif(java.time.LocalDate.now(),
                    OrdonnancePieces.nomSurDisque(pieceId, nomPropre));
            java.nio.file.Path cible = util.StockageDisque.racine().resolve(relatif);
            java.nio.file.Files.createDirectories(cible.getParent());
            long ecrits = java.nio.file.Files.copy(flux, cible, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            if (ecrits > OrdonnancePieces.TAILLE_MAX) {
                /*
                 * La taille annoncee par le navigateur n'est pas une information de confiance : on revere sur ce qui a
                 * REELLEMENT ete ecrit, et on retire le fichier si la limite est franchie.
                 */
                java.nio.file.Files.deleteIfExists(cible);
                return new JSONObject().put("success", false).put("message",
                        "Le fichier fait " + OrdonnancePieces.mega(ecrits) + " ; la limite est de "
                                + OrdonnancePieces.mega(OrdonnancePieces.TAILLE_MAX) + ".");
            }
            TOrdonnanceClientPiece piece = new TOrdonnanceClientPiece();
            piece.setLgPIECEID(pieceId);
            piece.setOrdonnance(ordonnance);
            piece.setStrNOMORIGINE(OrdonnanceClientSaisie.tronquer(nomPropre, 150));
            piece.setStrTYPEMIME(OrdonnancePieces.typeMime(nomPropre));
            piece.setIntTAILLE(ecrits);
            piece.setStrCHEMIN(relatif);
            piece.setLgUSERID(operateur == null ? null : operateur.getLgUSERID());
            piece.setDtCREATED(new Date());
            em.persist(piece);
            em.flush();
            return new JSONObject().put("success", true).put("id", pieceId).put("nom", nomPropre).put("message",
                    "Pièce « " + nomPropre + " » jointe à l'ordonnance.");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "depot d'une piece d'ordonnance", e);
            return new JSONObject().put("success", false).put("message", "La pièce n'a pas pu être enregistrée.");
        }
    }

    /** Les pieces d'une ordonnance, de la plus ancienne a la plus recente (l'ordre du dossier). */
    @SuppressWarnings("unchecked")
    public JSONObject pieces(String ordonnanceId) {
        JSONArray data = new JSONArray();
        try {
            Query q = em.createNativeQuery("SELECT p.lg_PIECE_ID AS id, p.str_NOM_ORIGINE AS nom,"
                    + " p.str_TYPE_MIME AS type, p.int_TAILLE AS taille, p.dt_CREATED AS deposeeLe,"
                    + " TRIM(CONCAT(COALESCE(u.str_FIRST_NAME, ''), ' ', COALESCE(u.str_LAST_NAME, ''))) AS deposeePar"
                    + " FROM t_ordonnance_client_piece p" + " LEFT JOIN t_user u ON u.lg_USER_ID = p.lg_USER_ID"
                    + " WHERE p.lg_ORDONNANCE_ID = :ordonnance ORDER BY p.dt_CREATED ASC", Tuple.class);
            q.setParameter("ordonnance", ordonnanceId);
            for (Tuple t : (List<Tuple>) q.getResultList()) {
                data.put(new JSONObject().put("id", t.get("id", String.class))
                        .put("nom", StringUtils.defaultString(t.get("nom", String.class)))
                        .put("type", StringUtils.defaultString(t.get("type", String.class)))
                        .put("taille", t.get("taille") == null ? 0 : ((Number) t.get("taille")).longValue())
                        .put("deposeeLe", horodatage(t.get("deposeeLe")))
                        .put("deposeePar", StringUtils.trimToEmpty(t.get("deposeePar", String.class))));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "pieces d'une ordonnance", e);
        }
        return new JSONObject().put("success", true).put("total", data.length()).put("data", data);
    }

    /** La piece elle-meme, pour la consultation et le telechargement ; null si elle n'existe pas. */
    public TOrdonnanceClientPiece piece(String pieceId) {
        if (StringUtils.isBlank(pieceId)) {
            return null;
        }
        try {
            return em.find(TOrdonnanceClientPiece.class, pieceId);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "lecture d'une piece d'ordonnance", e);
            return null;
        }
    }

    /**
     * Fichier d'une piece, ou null si le chemin n'est pas sur ou si le fichier n'est plus la.
     *
     * <p>
     * Le controle du chemin est fait ICI, a chaque lecture, et pas seulement a l'ecriture : une base restauree d'un
     * autre site ou modifiee a la main ne doit pas pouvoir transformer ce service en lecteur de fichiers du serveur.
     */
    public java.nio.file.Path fichierDeLaPiece(TOrdonnanceClientPiece piece) {
        if (piece == null || !OrdonnancePieces.cheminSur(piece.getStrCHEMIN())) {
            return null;
        }
        java.nio.file.Path chemin = util.StockageDisque.racine().resolve(piece.getStrCHEMIN()).normalize();
        if (!chemin.startsWith(util.StockageDisque.racine().normalize())) {
            return null;
        }
        return java.nio.file.Files.isRegularFile(chemin) ? chemin : null;
    }

    /**
     * Retire une piece : la ligne et le fichier.
     *
     * <p>
     * C'est la seule suppression de tout ce menu, et elle est necessaire : une piece jointe au mauvais patient est un
     * probleme de confidentialite, pas une coquille. L'ordonnance, elle, ne se supprime toujours pas.
     */
    public JSONObject retirerPiece(String pieceId, TUser operateur) {
        try {
            TOrdonnanceClientPiece piece = piece(pieceId);
            if (piece == null) {
                return new JSONObject().put("success", false).put("message", "Pièce inconnue.");
            }
            String nom = piece.getStrNOMORIGINE();
            java.nio.file.Path fichier = fichierDeLaPiece(piece);
            em.remove(piece);
            em.flush();
            if (fichier != null) {
                /*
                 * Le fichier est efface APRES la ligne : si l'effacement echoue (fichier verrouille), la piece a malgre
                 * tout disparu de la fiche, et le fichier restant sera ramasse par la purge.
                 */
                java.nio.file.Files.deleteIfExists(fichier);
            }
            LOG.log(Level.INFO, "Piece d''ordonnance retiree : {0} par {1}",
                    new Object[] { nom, operateur == null ? "?" : operateur.getStrLOGIN() });
            return new JSONObject().put("success", true).put("message", "Pièce « " + nom + " » retirée.");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "retrait d'une piece d'ordonnance", e);
            return new JSONObject().put("success", false).put("message", "La pièce n'a pas pu être retirée.");
        }
    }

    /**
     * Purge les fichiers du dossier des pieces qui ne correspondent a aucune ligne en base.
     *
     * <p>
     * Ils peuvent exister : un fichier ecrit juste avant une coupure, ou dont la ligne n'a pas pu etre creee. Sans
     * cette purge, ils resteraient indefiniment sur le disque de l'officine sans que personne sache a quoi ils servent
     * - et personne n'oserait les effacer a la main.
     *
     * <p>
     * Ne touche QUE le dossier des ordonnances, ne suit pas les liens, et ignore les fichiers du jour : un fichier tout
     * juste ecrit peut appartenir a un enregistrement encore en cours.
     */
    @SuppressWarnings("unchecked")
    public JSONObject purgerPiecesOrphelines() {
        int supprimes = 0;
        int examines = 0;
        try {
            java.nio.file.Path racine = util.StockageDisque.racine().resolve(OrdonnancePieces.DOSSIER);
            if (!java.nio.file.Files.isDirectory(racine)) {
                return new JSONObject().put("success", true).put("examines", 0).put("supprimes", 0).put("message",
                        "Aucun dossier de pièces à purger.");
            }
            Set<String> connus = new java.util.HashSet<>();
            for (Object chemin : em.createNativeQuery("SELECT p.str_CHEMIN FROM t_ordonnance_client_piece p")
                    .getResultList()) {
                if (chemin != null) {
                    connus.add(String.valueOf(chemin).replace('\\', '/'));
                }
            }
            long limite = System.currentTimeMillis() - 24L * 3600L * 1000L;
            java.util.List<java.nio.file.Path> aSupprimer = new ArrayList<>();
            try (java.util.stream.Stream<java.nio.file.Path> fichiers = java.nio.file.Files.walk(racine)) {
                for (java.nio.file.Path f : (Iterable<java.nio.file.Path>) fichiers
                        .filter(java.nio.file.Files::isRegularFile)::iterator) {
                    examines++;
                    String relatif = util.StockageDisque.racine().relativize(f).toString().replace('\\', '/');
                    if (connus.contains(relatif)) {
                        continue;
                    }
                    if (f.toFile().lastModified() > limite) {
                        continue;
                    }
                    aSupprimer.add(f);
                }
            }
            for (java.nio.file.Path f : aSupprimer) {
                if (java.nio.file.Files.deleteIfExists(f)) {
                    supprimes++;
                }
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "purge des pieces orphelines", e);
            return new JSONObject().put("success", false).put("message", "La purge n'a pas pu être menée à bien.");
        }
        return new JSONObject().put("success", true).put("examines", examines).put("supprimes", supprimes)
                .put("message", supprimes + " fichier(s) orphelin(s) supprimé(s) sur " + examines + " examiné(s).");
    }

    /**
     * Types de client proposes au filtre : carnet, assurance, standard.
     *
     * <p>
     * Lus en base et non ecrits en dur dans l'ecran : les identifiants de {@code t_type_client} ne sont pas les memes
     * partout, et une liste devinee aurait filtre sur un type inexistant sans rien dire.
     */
    @SuppressWarnings("unchecked")
    public JSONObject typesClient() {
        JSONArray data = new JSONArray();
        try {
            Query q = em.createNativeQuery(
                    "SELECT t.lg_TYPE_CLIENT_ID AS id, t.str_NAME AS nom FROM t_type_client t"
                            + " WHERE t.str_TYPE = 'CLIENT' AND t.str_STATUT = 'enable' ORDER BY t.str_NAME ASC",
                    Tuple.class);
            for (Tuple t : (List<Tuple>) q.getResultList()) {
                data.put(new JSONObject().put("id", t.get("id", String.class)).put("nom",
                        StringUtils.trimToEmpty(t.get("nom", String.class))));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "types de client", e);
        }
        return new JSONObject().put("success", true).put("total", data.length()).put("data", data);
    }

    /** Les prescripteurs actifs, pour le choix de l'ecran : le referentiel medecins existant, pas un nouveau. */
    @SuppressWarnings("unchecked")
    public JSONObject medecins(String query) {
        JSONArray data = new JSONArray();
        try {
            String sql = "SELECT m.lg_MEDECIN_ID AS id,"
                    + " TRIM(CONCAT(COALESCE(m.str_FIRST_NAME, ''), ' ', COALESCE(m.str_LAST_NAME, ''))) AS nom"
                    + " FROM t_medecin m WHERE m.str_STATUT = 'enable'"
                    + (StringUtils.isBlank(query) ? "" : " AND CONCAT(COALESCE(m.str_FIRST_NAME, ''), ' ',"
                            + " COALESCE(m.str_LAST_NAME, '')) LIKE :q")
                    + " ORDER BY nom ASC";
            Query q = em.createNativeQuery(sql, Tuple.class);
            if (StringUtils.isNotBlank(query)) {
                q.setParameter("q", "%" + query.trim() + "%");
            }
            q.setMaxResults(200);
            for (Tuple t : (List<Tuple>) q.getResultList()) {
                data.put(new JSONObject().put("id", t.get("id", String.class)).put("nom",
                        StringUtils.trimToEmpty(t.get("nom", String.class))));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "liste des prescripteurs", e);
        }
        return new JSONObject().put("success", true).put("total", data.length()).put("data", data);
    }

    /**
     * Etablissements deja saisis, proposes a la frappe.
     *
     * <p>
     * Il n'existe pas de referentiel des etablissements de sante dans le logiciel, et en imposer un de plus a alimenter
     * ferait que le champ resterait vide. On propose donc ce que l'officine a deja ecrit : la liste se construit toute
     * seule et les orthographes convergent.
     */
    @SuppressWarnings("unchecked")
    public JSONObject etablissements(String query) {
        JSONArray data = new JSONArray();
        try {
            String sql = "SELECT DISTINCT o.str_ETABLISSEMENT AS nom FROM t_ordonnance_client o"
                    + " WHERE o.str_ETABLISSEMENT IS NOT NULL AND o.str_ETABLISSEMENT <> ''"
                    + (StringUtils.isBlank(query) ? "" : " AND o.str_ETABLISSEMENT LIKE :q") + " ORDER BY nom ASC";
            Query q = em.createNativeQuery(sql, Tuple.class);
            if (StringUtils.isNotBlank(query)) {
                q.setParameter("q", "%" + query.trim() + "%");
            }
            q.setMaxResults(100);
            for (Tuple t : (List<Tuple>) q.getResultList()) {
                data.put(new JSONObject().put("nom", StringUtils.trimToEmpty(t.get("nom", String.class))));
            }
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "liste des etablissements", e);
        }
        return new JSONObject().put("success", true).put("total", data.length()).put("data", data);
    }

    /**
     * Identifiant technique : un UUID tel quel.
     *
     * <p>
     * Et non un {@code substring(0, 40)} : un UUID fait 36 caracteres, la colonne en accepte 40, et la coupe levait
     * donc une exception a chaque enregistrement. Erreur de ma main, vue au premier enregistrement du banc.
     */
    private static String identifiant() {
        return UUID.randomUUID().toString();
    }

    /*
     * ANALYSE DES ORDONNANCES (retour du 22/09).
     */

    /** Synthese, ventilations et produits les plus prescrits, sur les criteres de l'historique. */
    @SuppressWarnings("unchecked")
    public JSONObject analyse(Criteres criteres) {
        try {
            Criteres avecAnnulees = new Criteres(criteres.recherche, criteres.clientId, criteres.typeClientId,
                    criteres.medecinId, criteres.debut, criteres.fin, true);
            Query q = em.createNativeQuery(OrdonnanceClientSql.analyse(avecAnnulees), Tuple.class);
            OrdonnanceClientSql.lier(q, avecAnnulees);
            List<OrdonnanceAnalyse.Ordonnance> ordonnances = new ArrayList<>();
            for (Tuple t : (List<Tuple>) q.getResultList()) {
                ordonnances.add(new OrdonnanceAnalyse.Ordonnance(t.get("statut", String.class),
                        t.get("clientId", String.class), t.get("medecin", String.class),
                        t.get("etablissement", String.class), t.get("typeClient", String.class),
                        entier(t.get("nbLignes")), entier(t.get("nbRenseignees")), entier(t.get("nbServies")),
                        entier(t.get("qteServie"))));
            }
            Query p = em.createNativeQuery(OrdonnanceClientSql.analyseProduits(avecAnnulees), Tuple.class);
            OrdonnanceClientSql.lier(p, avecAnnulees);
            p.setMaxResults(50);
            JSONArray produits = new JSONArray();
            for (Tuple t : (List<Tuple>) p.getResultList()) {
                produits.put(OrdonnanceAnalyse.produit(t.get("produit", String.class), entier(t.get("nbPrescriptions")),
                        entier(t.get("qtePrescrite")), entier(t.get("nbRenseignees")), entier(t.get("nbServies")),
                        entier(t.get("qteServie"))));
            }
            return OrdonnanceAnalyse.analyser(ordonnances, produits);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "analyse des ordonnances clients", e);
            return new JSONObject().put("success", false).put("message", "L'analyse n'a pas pu être calculée.");
        }
    }

    /*
     * SUIVI DE CONSOMMATION DU CLIENT depuis l'ordonnance (retour du 22/09).
     *
     * On REUTILISE le service du suivi de consommation de la gestion des clients : memes achats, memes frequences, meme
     * habitude. On y ajoute seulement le stock disponible de chaque produit, lu sur l'emplacement de l'operateur, pour
     * dire tout de suite si le renouvellement peut etre servi.
     */
    @javax.ejb.EJB
    private rest.service.ClientConsommationService consommationService;

    @SuppressWarnings("unchecked")
    public JSONObject consommationClient(String clientId, String debut, String fin, String emplacementId) {
        if (StringUtils.isBlank(clientId)) {
            return new JSONObject().put("success", false).put("total", 0).put("data", new JSONArray()).put("message",
                    "Client inconnu.");
        }
        JSONObject conso = consommationService.consommation(clientId, debut, fin, null, 0, 0);
        JSONArray lignes = conso.optJSONArray("data");
        if (lignes == null) {
            lignes = new JSONArray();
        }
        List<String> familles = new ArrayList<>();
        for (int i = 0; i < lignes.length(); i++) {
            String f = lignes.getJSONObject(i).optString("familleId", "");
            if (!f.isEmpty()) {
                familles.add(f);
            }
        }
        Map<String, Integer> stocks = new HashMap<>();
        if (!familles.isEmpty()) {
            try {
                Query q = em.createNativeQuery("SELECT s.lg_FAMILLE_ID AS famille,"
                        + " COALESCE(SUM(s.int_NUMBER_AVAILABLE), 0) AS stock FROM t_famille_stock s"
                        + " WHERE s.lg_FAMILLE_ID IN :familles"
                        + (StringUtils.isBlank(emplacementId) ? "" : " AND s.lg_EMPLACEMENT_ID = :emplacement")
                        + " GROUP BY s.lg_FAMILLE_ID", Tuple.class);
                q.setParameter("familles", familles);
                if (StringUtils.isNotBlank(emplacementId)) {
                    q.setParameter("emplacement", emplacementId);
                }
                for (Tuple t : (List<Tuple>) q.getResultList()) {
                    stocks.put(t.get("famille", String.class), entier(t.get("stock")));
                }
            } catch (Exception e) {
                LOG.log(Level.WARNING, "stock des produits du suivi de consommation", e);
            }
        }
        for (int i = 0; i < lignes.length(); i++) {
            JSONObject l = lignes.getJSONObject(i);
            Integer stock = stocks.get(l.optString("familleId", ""));
            l.put("stock", stock == null ? JSONObject.NULL : stock);
        }
        return new JSONObject().put("success", true).put("total", lignes.length()).put("data", lignes);
    }

    private static boolean vrai(Object valeur) {
        if (valeur instanceof Boolean) {
            return (Boolean) valeur;
        }
        return valeur instanceof Number && ((Number) valeur).intValue() != 0;
    }

    private static int entier(Object valeur) {
        return valeur instanceof Number ? ((Number) valeur).intValue() : 0;
    }

    private static String jour(Object valeur) {
        if (valeur == null) {
            return "";
        }
        if (valeur instanceof java.sql.Date) {
            return ((java.sql.Date) valeur).toLocalDate().toString();
        }
        return String.valueOf(valeur);
    }

    private static String horodatage(Object valeur) {
        if (valeur == null) {
            return "";
        }
        if (valeur instanceof Timestamp) {
            return util.DateConverter.convertDateToDD_MM_YYYY_HH_mm(new Date(((Timestamp) valeur).getTime()));
        }
        return String.valueOf(valeur);
    }
}
