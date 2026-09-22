package rest.service.posos;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import javax.ejb.EJB;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Tuple;
import org.apache.commons.lang3.StringUtils;

/**
 * Service d'analyse Posos vu depuis l'officine.
 *
 * <p>
 * Le seul point d'entree metier : il resout les produits en NOMS ({@code t_famille.str_NAME}, le choix de l'officine)
 * et delegue a la passerelle. La configuration est relue a chaque appel, pour qu'un changement cote serveur prenne
 * effet sans redemarrage.
 */
@Stateless
public class PososService {

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @EJB
    private PososClient client;

    /** Etat de la passerelle, sans aucun secret. */
    public Map<String, Object> statut() {
        return client.statut(PososConfiguration.duServeur());
    }

    public boolean estConfiguree() {
        return PososConfiguration.duServeur().estConfiguree();
    }

    /** Analyse d'une demande deja constituee (l'ecran envoie des noms de produits). */
    public PososResultat analyser(PososDemande demande) {
        return client.analyser(PososConfiguration.duServeur(), demande);
    }

    /**
     * Analyse des produits d'une vente. Les noms et les quantites sont relus en base plutot que pris du navigateur : le
     * navigateur peut se tromper de produit, la vente non.
     */
    public PososResultat analyserVente(String venteId, PososDemande.Contexte contexte) {
        if (StringUtils.isBlank(venteId)) {
            return PososResultat.indisponible("Aucune vente à analyser.");
        }
        List<PososDemande.Produit> produits = produitsDeLaVente(venteId);
        if (produits.isEmpty()) {
            return PososResultat
                    .indisponible("Aucune vente trouvée pour « " + venteId + " », ou elle ne porte aucun produit.");
        }
        PososDemande demande = new PososDemande();
        demande.setProduits(produits);
        demande.setContexte(contexte);
        return analyser(demande);
    }

    /** Analyse d'une liste de produits deja relue en base (ordonnance). */
    public PososResultat analyserProduits(List<PososDemande.Produit> produits, PososDemande.Contexte contexte) {
        if (produits == null || produits.isEmpty()) {
            return PososResultat.indisponible("Aucun produit à analyser.");
        }
        PososDemande demande = new PososDemande();
        demande.setProduits(produits);
        demande.setContexte(contexte);
        return analyser(demande);
    }

    /** Un contexte sans aucune information : l'ecran n'a rien saisi. */
    public static boolean estVide(PososDemande.Contexte c) {
        return c == null
                || (c.getAge() == null && StringUtils.isBlank(c.getSexe()) && !Boolean.TRUE.equals(c.getGrossesse())
                        && !Boolean.TRUE.equals(c.getAllaitement()) && !Boolean.TRUE.equals(c.getInsuffisanceRenale())
                        && !Boolean.TRUE.equals(c.getInsuffisanceHepatique()));
    }

    private static final String ORDONNANCE_PAR_REFERENCE = " FROM t_ordonnance_client o"
            + " WHERE (o.str_NUMERO = ?1 OR o.lg_ORDONNANCE_ID = ?1) AND o.str_STATUT <> 'annulee'";

    /**
     * Les produits d'une ORDONNANCE client (par son N° ou son identifiant), avec leur posologie : les deux menus sont
     * lies. Une ordonnance annulee n'est pas analysee.
     */
    public List<PososDemande.Produit> produitsDeLOrdonnance(String reference) {
        List<PososDemande.Produit> produits = new ArrayList<>();
        if (StringUtils.isBlank(reference)) {
            return produits;
        }
        try {
            @SuppressWarnings("unchecked")
            List<Tuple> lignes = em.createNativeQuery("SELECT d.str_LIBELLE AS nom, COALESCE(f.int_CIP, '') AS cip,"
                    + " d.int_QUANTITE AS quantite, d.str_POSOLOGIE AS posologie" + " FROM t_ordonnance_client_detail d"
                    + " JOIN t_ordonnance_client o ON o.lg_ORDONNANCE_ID = d.lg_ORDONNANCE_ID"
                    + " LEFT JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                    + " WHERE (o.str_NUMERO = ?1 OR o.lg_ORDONNANCE_ID = ?1) AND o.str_STATUT <> 'annulee'"
                    + " ORDER BY d.int_ORDRE", Tuple.class).setParameter(1, reference.trim()).getResultList();
            for (Tuple t : lignes) {
                PososDemande.Produit p = new PososDemande.Produit();
                p.setNom(t.get("nom", String.class));
                String cip = t.get("cip") == null ? null : String.valueOf(t.get("cip"));
                p.setCip(StringUtils.isBlank(cip) ? null : cip);
                Object q = t.get("quantite");
                if (q instanceof Number) {
                    p.setQuantite(((Number) q).intValue());
                }
                p.setPosologie(StringUtils.trimToNull(t.get("posologie", String.class)));
                produits.add(p);
            }
        } catch (Exception e) {
            java.util.logging.Logger.getLogger(PososService.class.getName()).log(java.util.logging.Level.WARNING,
                    "Posos : produits de l'ordonnance illisibles");
        }
        return produits;
    }

    /** Le contexte clinique enregistre avec l'ordonnance, ou null. */
    public PososDemande.Contexte contexteDeLOrdonnance(String reference) {
        try {
            @SuppressWarnings("unchecked")
            List<Tuple> lignes = em.createNativeQuery("SELECT o.int_AGE_PATIENT AS age, o.str_SEXE_PATIENT AS sexe,"
                    + " o.bool_GROSSESSE AS grossesse, o.bool_ALLAITEMENT AS allaitement,"
                    + " o.bool_INSUF_RENALE AS renale, o.bool_INSUF_HEPATIQUE AS hepatique" + ORDONNANCE_PAR_REFERENCE,
                    Tuple.class).setParameter(1, reference.trim()).getResultList();
            if (lignes.isEmpty()) {
                return null;
            }
            Tuple t = lignes.get(0);
            PososDemande.Contexte c = new PososDemande.Contexte();
            if (t.get("age") instanceof Number) {
                c.setAge(((Number) t.get("age")).intValue());
            }
            c.setSexe(StringUtils.trimToNull(t.get("sexe", String.class)));
            c.setGrossesse(vrai(t.get("grossesse")));
            c.setAllaitement(vrai(t.get("allaitement")));
            c.setInsuffisanceRenale(vrai(t.get("renale")));
            c.setInsuffisanceHepatique(vrai(t.get("hepatique")));
            return c;
        } catch (Exception e) {
            java.util.logging.Logger.getLogger(PososService.class.getName()).log(java.util.logging.Level.WARNING,
                    "Posos : contexte de l'ordonnance illisible");
            return null;
        }
    }

    private static boolean vrai(Object v) {
        return v instanceof Boolean ? (Boolean) v : v instanceof Number && ((Number) v).intValue() != 0;
    }

    /** Les produits d'une vente, identifies par leur nom. */
    public List<PososDemande.Produit> produitsDeLaVente(String venteId) {
        List<PososDemande.Produit> produits = new ArrayList<>();
        if (StringUtils.isBlank(venteId)) {
            return produits;
        }
        try {
            @SuppressWarnings("unchecked")
            List<Tuple> lignes = em
                    .createNativeQuery("SELECT f.str_NAME AS nom, COALESCE(f.int_CIP, '') AS cip,"
                            + " SUM(d.int_QUANTITY) AS quantite"
                            + " FROM t_preenregistrement_detail d JOIN t_famille f ON f.lg_FAMILLE_ID = d.lg_FAMILLE_ID"
                            + " JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
                            + " WHERE (p.lg_PREENREGISTREMENT_ID = ?1 OR p.str_REF = ?1)"
                            + " AND f.str_NAME IS NOT NULL AND f.str_NAME <> ''"
                            + " GROUP BY f.str_NAME, f.int_CIP ORDER BY f.str_NAME", Tuple.class)
                    .setParameter(1, venteId.trim()).getResultList();
            for (Tuple t : lignes) {
                PososDemande.Produit p = new PososDemande.Produit();
                p.setNom(t.get("nom", String.class));
                String cip = t.get("cip", String.class);
                p.setCip(StringUtils.isBlank(cip) ? null : cip);
                Object q = t.get("quantite");
                if (q instanceof Number) {
                    p.setQuantite(((Number) q).intValue());
                }
                produits.add(p);
            }
        } catch (Exception e) {
            // Rien du corps ni du contenu : seulement le fait que la lecture a echoue.
            java.util.logging.Logger.getLogger(PososService.class.getName()).log(java.util.logging.Level.WARNING,
                    "Posos : produits de la vente illisibles");
        }
        return produits;
    }
}
