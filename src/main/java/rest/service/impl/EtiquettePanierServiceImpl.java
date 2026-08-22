package rest.service.impl;

import dal.TEmplacement;
import dal.TEtiquette;
import dal.TFamille;
import dal.TUser;
import java.util.Date;
import java.util.List;
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
import rest.service.EtiquettePanierService;
import toolkits.parameters.commonparameter;
import util.KeyUtilGen;

/**
 * Panier d'etiquettes : reprise en JPA de ce que faisaient trois pages JSP.
 *
 * <p>
 * Le comportement metier est repris a l'identique. Ce qui change, c'est la facon d'aller le chercher, et c'est de la
 * que vient la lenteur constatee :
 *
 * <ul>
 * <li>la liste des articles executait DEUX fois la meme requete - une fois paginee, une fois entiere pour compter -
 * puis UNE requete de stock par ligne affichee, soit vingt-deux allers-retours pour vingt lignes. Ici, une requete de
 * page et un COUNT, et le stock vient de la meme vue ;</li>
 * <li>le panier chargeait TOUTES les lignes puis les decoupait en Java, en rafraichissant chaque ligne une par une.
 * Ici, la pagination est faite par la base ;</li>
 * <li>la requete des articles etait construite par concatenation de la saisie de l'utilisateur. Les valeurs sont
 * desormais liees.</li>
 * </ul>
 *
 * @author koben
 */
@Stateless
public class EtiquettePanierServiceImpl implements EtiquettePanierService {

    private static final Logger LOG = Logger.getLogger(EtiquettePanierServiceImpl.class.getName());

    /**
     * Meme source et memes filtres que la page JSP : la vue de recherche d'articles, bornee au statut actif et a
     * l'emplacement de l'utilisateur, avec un regroupement par article - la vue en porte un par emplacement et par
     * grossiste.
     */
    private static final String ARTICLES_FROM = " FROM v_article_recherche v WHERE v.str_STATUT = :statut"
            + " AND v.lg_EMPLACEMENT_ID = :emplacement"
            + " AND (v.str_NAME LIKE :motif OR v.str_DESCRIPTION LIKE :motif OR v.int_CIP LIKE :motif"
            + " OR v.int_EAN13 LIKE :motif OR v.str_CODE_ARTICLE LIKE :motif)";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public JSONObject produits(TUser user, String recherche, int start, int limit) {
        JSONObject reponse = new JSONObject();
        try {
            String motif = StringUtils.trimToEmpty(recherche) + "%";
            String emplacement = user.getLgEMPLACEMENTID().getLgEMPLACEMENTID();

            Query compte = em.createNativeQuery("SELECT COUNT(DISTINCT v.lg_FAMILLE_ID)" + ARTICLES_FROM);
            lier(compte, motif, emplacement);
            long total = ((Number) compte.getSingleResult()).longValue();

            Query page = em.createNativeQuery("SELECT v.lg_FAMILLE_ID AS lg_FAMILLE_ID, v.str_NAME AS str_NAME,"
                    + " v.str_DESCRIPTION AS str_DESCRIPTION, v.int_PRICE AS int_PRICE, v.int_PAF AS int_PAF,"
                    + " v.bl_PROMOTED AS bl_PROMOTED, v.int_CIP AS int_CIP,"
                    + " v.int_NUMBER_AVAILABLE AS int_NUMBER_AVAILABLE, v.int_NUMBER AS int_NUMBER" + ARTICLES_FROM
                    + " GROUP BY v.lg_FAMILLE_ID ORDER BY v.str_DESCRIPTION ASC LIMIT :depart, :taille", Tuple.class);
            lier(page, motif, emplacement);
            page.setParameter("depart", Math.max(0, start));
            page.setParameter("taille", limit > 0 ? limit : 20);

            JSONArray lignes = new JSONArray();
            for (Tuple t : (List<Tuple>) page.getResultList()) {
                JSONObject json = new JSONObject();
                String cip = texte(t.get("int_CIP"));
                json.put("lg_FAMILLE_ID", texte(t.get("lg_FAMILLE_ID")));
                json.put("str_NAME", texte(t.get("str_NAME")));
                json.put("str_DESCRIPTION", texte(t.get("str_DESCRIPTION")));
                json.put("int_PRICE", entier(t.get("int_PRICE")));
                json.put("int_PAF", entier(t.get("int_PAF")));
                json.put("bl_PROMOTED", entier(t.get("bl_PROMOTED")) != 0);
                // « CIP » et non « int_CIP » : c'est le nom que porte le modele ExtJS de la liste deroulante.
                json.put("CIP", cip);
                json.put("str_DESCRIPTION_PLUS",
                        cip + " " + texte(t.get("str_DESCRIPTION")) + " (" + entier(t.get("int_PRICE")) + ")");
                json.put("int_NUMBER_AVAILABLE", entier(t.get("int_NUMBER_AVAILABLE")));
                json.put("int_NUMBER", entier(t.get("int_NUMBER")));
                lignes.put(json);
            }
            return reponse.put("total", total).put("results", lignes);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "produits", e);
            return reponse.put("total", 0).put("results", new JSONArray());
        }
    }

    private void lier(Query query, String motif, String emplacement) {
        query.setParameter("statut", commonparameter.statut_enable);
        query.setParameter("emplacement", emplacement);
        query.setParameter("motif", motif);
    }

    @Override
    public JSONObject panier(String recherche, int start, int limit) {
        JSONObject reponse = new JSONObject();
        try {
            String motif = StringUtils.trimToEmpty(recherche) + "%";
            String filtre = " FROM TEtiquette t WHERE t.strSTATUT = :statut"
                    + " AND (t.lgFAMILLEID.intCIP LIKE :motif OR t.lgFAMILLEID.strDESCRIPTION LIKE :motif"
                    + " OR t.lgFAMILLEID.intEAN13 LIKE :motif)";

            long total = em.createQuery("SELECT COUNT(t)" + filtre, Long.class)
                    .setParameter("statut", commonparameter.statut_is_Process).setParameter("motif", motif)
                    .getSingleResult();

            List<TEtiquette> lignes = em
                    .createQuery("SELECT t" + filtre + " ORDER BY t.dtUPDATED DESC", TEtiquette.class)
                    .setParameter("statut", commonparameter.statut_is_Process).setParameter("motif", motif)
                    .setFirstResult(Math.max(0, start)).setMaxResults(limit > 0 ? limit : 20).getResultList();

            JSONArray tableau = new JSONArray();
            for (TEtiquette e : lignes) {
                TFamille produit = e.getLgFAMILLEID();
                JSONObject json = new JSONObject();
                json.put("lg_ETIQUETTE_ID", texte(e.getLgETIQUETTEID()));
                json.put("str_NAME", texte(e.getStrNAME()));
                json.put("str_CODE", texte(e.getStrCODE()));
                json.put("int_CIP", produit != null ? texte(produit.getIntCIP()) : "");
                /*
                 * Oui, « lg_FAMILLE_ID » porte la DESIGNATION et non l'identifiant : c'est ce que faisait la page JSP,
                 * et la colonne « Designation » de la grille lit ce nom-la. Le corriger imposerait de toucher au modele
                 * ExtJS, partage avec l'ecran principal des etiquettes.
                 */
                json.put("lg_FAMILLE_ID", produit != null ? texte(produit.getStrDESCRIPTION()) : "");
                json.put("int_PRICE", produit != null && produit.getIntPRICE() != null ? produit.getIntPRICE() : 0);
                json.put("int_PAF", produit != null && produit.getIntPAF() != null ? produit.getIntPAF() : 0);
                json.put("int_NUMBER", texte(e.getIntNUMBER()));
                tableau.put(json);
            }
            return reponse.put("total", total).put("results", tableau);
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "panier", e);
            return reponse.put("total", 0).put("results", new JSONArray());
        }
    }

    @Override
    public JSONObject ajouter(TUser user, String produitId, int quantite) {
        try {
            TFamille produit = em.find(TFamille.class, produitId);
            if (produit == null) {
                return echec("Echec d'ajout. Article inexistant");
            }
            if (quantite <= 0) {
                return echec("Veuillez saisir une quantité supérieure à zéro.");
            }
            TEtiquette ligne = ligneEnPreparation(produitId);
            if (ligne == null) {
                /*
                 * Meme composition de la ligne que la page JSP : identifiant complexe, code compose du prefixe court,
                 * du CIP, du prix et du nom, et le libelle du type d'etiquette de l'article.
                 */
                KeyUtilGen cle = new KeyUtilGen();
                ligne = new TEtiquette();
                ligne.setLgETIQUETTEID(cle.getComplexId());
                ligne.setStrCODE(cle.getShortId(4) + "-" + produit.getIntCIP() + "-" + produit.getIntPRICE() + "-"
                        + produit.getStrNAME());
                if (produit.getLgTYPEETIQUETTEID() != null) {
                    ligne.setStrNAME(produit.getLgTYPEETIQUETTEID().getStrNAME());
                    ligne.setLgTYPEETIQUETTEID(produit.getLgTYPEETIQUETTEID());
                }
                ligne.setLgFAMILLEID(produit);
                ligne.setStrSTATUT(commonparameter.statut_is_Process);
                ligne.setDtCREATED(new Date());
                ligne.setIntNUMBER("0");
                /*
                 * L'emplacement n'etait pas renseigne par l'ancien chemin de creation, alors que la liste generale des
                 * etiquettes filtre dessus : la ligne n'y apparaissait donc pas. On le pose ici.
                 */
                TEmplacement emplacement = user != null ? user.getLgEMPLACEMENTID() : null;
                if (emplacement != null) {
                    ligne.setLgEMPLACEMENTID(emplacement);
                }
                em.persist(ligne);
            }
            ligne.setIntNUMBER(String.valueOf(quantiteDe(ligne) + quantite));
            ligne.setDtUPDATED(new Date());
            em.merge(ligne);
            return succes("Opération effectuée avec succès");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "ajouter", e);
            return echec("Echec de l'opération");
        }
    }

    /** Ligne deja au panier pour cet article, ou {@code null}. */
    private TEtiquette ligneEnPreparation(String produitId) {
        List<TEtiquette> trouvees = em
                .createQuery("SELECT t FROM TEtiquette t WHERE t.lgFAMILLEID.lgFAMILLEID = :produit"
                        + " AND t.strSTATUT = :statut", TEtiquette.class)
                .setParameter("produit", produitId).setParameter("statut", commonparameter.statut_is_Process)
                .setMaxResults(1).getResultList();
        return trouvees.isEmpty() ? null : trouvees.get(0);
    }

    /** La quantite est stockee en texte : une valeur absente ou illisible vaut zero. */
    private static int quantiteDe(TEtiquette ligne) {
        try {
            return Integer.parseInt(StringUtils.trimToEmpty(ligne.getIntNUMBER()));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    @Override
    public JSONObject modifierQuantite(String etiquetteId, int quantite) {
        try {
            TEtiquette ligne = em.find(TEtiquette.class, etiquetteId);
            if (ligne == null) {
                return echec("Ligne introuvable");
            }
            if (quantite <= 0) {
                return echec("Veuillez saisir une quantité supérieure à zéro.");
            }
            ligne.setIntNUMBER(String.valueOf(quantite));
            ligne.setDtUPDATED(new Date());
            em.merge(ligne);
            return succes("Quantité mise à jour");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "modifierQuantite", e);
            return echec("Echec de mise à jour de la quantité");
        }
    }

    @Override
    public JSONObject supprimer(String etiquetteId) {
        try {
            TEtiquette ligne = em.find(TEtiquette.class, etiquetteId);
            if (ligne == null) {
                return echec("Ligne introuvable");
            }
            // Comme auparavant : la ligne change de statut, elle n'est pas effacee.
            ligne.setStrSTATUT(commonparameter.statut_delete);
            ligne.setDtUPDATED(new Date());
            em.merge(ligne);
            return succes("Ligne retirée");
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "supprimer", e);
            return echec("Echec de la suppression");
        }
    }

    private static JSONObject succes(String message) {
        return new JSONObject().put("success", true).put("msg", message);
    }

    private static JSONObject echec(String message) {
        return new JSONObject().put("success", false).put("msg", message);
    }

    private static String texte(Object valeur) {
        return valeur == null ? "" : String.valueOf(valeur);
    }

    private static int entier(Object valeur) {
        if (valeur instanceof Number) {
            return ((Number) valeur).intValue();
        }
        try {
            return Integer.parseInt(texte(valeur).trim());
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
