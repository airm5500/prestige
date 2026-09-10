package rest.service.impl;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TypedQuery;

import org.apache.commons.lang3.StringUtils;

import commonTasks.dto.GardeProduitDTO;
import commonTasks.dto.GardeTrancheDTO;
import commonTasks.dto.GardeVenteLigneDTO;
import dal.Garde;
import rest.service.GardeService;
import rest.service.SaisieRefusee;

@Stateless
public class GardeServiceImpl implements GardeService {

    private static final Logger LOG = Logger.getLogger(GardeServiceImpl.class.getName());

    /** Longueur de la colonne libelle : au-dela, la base tronquerait silencieusement. */
    private static final int LONGUEUR_LIBELLE = 120;

    /**
     * Les lignes de vente de la periode.
     *
     * <p>
     * Les exclusions reprennent MOT POUR MOT celles de la procedure analyse_abc_par_ca : ventes cloturees, non
     * annulees, de montant strictement positif, hors type de vente 5. Un perimetre different ferait diverger le
     * classement de la garde de celui de l'ecran de classification ABC, sans que rien ne le signale.
     * </p>
     */
    private static final String SQL_LIGNES = "SELECT p.lg_PREENREGISTREMENT_ID, f.lg_FAMILLE_ID,"
            + " f.int_CIP, f.str_NAME, p.dt_UPDATED, pd.int_QUANTITY, pd.int_PRICE" + " FROM t_preenregistrement p"
            + " JOIN t_preenregistrement_detail pd ON pd.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
            + " JOIN t_famille f ON f.lg_FAMILLE_ID = pd.lg_FAMILLE_ID"
            + " WHERE p.dt_UPDATED >= ?1 AND p.dt_UPDATED <= ?2"
            + " AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0"
            + " AND p.lg_TYPE_VENTE_ID <> '5'" + " ORDER BY p.dt_UPDATED";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public List<Garde> lister() {
        TypedQuery<Garde> q = em.createQuery("SELECT g FROM Garde g ORDER BY g.dateDebut DESC", Garde.class);
        return q.getResultList();
    }

    @Override
    public Garde parId(String id) {
        return StringUtils.isBlank(id) ? null : em.find(Garde.class, id);
    }

    @Override
    public Garde enregistrer(String id, String libelle, LocalDateTime debut, LocalDateTime fin) {
        String nom = StringUtils.trimToEmpty(libelle);
        if (nom.isEmpty()) {
            throw new SaisieRefusee("Donnez un libellé à la garde.");
        }
        if (nom.length() > LONGUEUR_LIBELLE) {
            throw new SaisieRefusee("Le libellé ne peut pas dépasser " + LONGUEUR_LIBELLE + " caractères.");
        }
        if (debut == null || fin == null) {
            throw new SaisieRefusee("Renseignez la date et l'heure de début et de fin.");
        }
        if (!fin.isAfter(debut)) {
            throw new SaisieRefusee("La fin de la garde doit être postérieure à son début.");
        }
        // Deux gardes couvrant la meme periode exacte donneraient deux fois les memes chiffres
        // dans une comparaison, sans qu'on comprenne d'ou vient le doublon.
        if (periodeDejaPrise(id, debut, fin)) {
            throw new SaisieRefusee("Une garde couvre déjà exactement cette période.");
        }
        Garde garde = StringUtils.isBlank(id) ? null : em.find(Garde.class, id);
        if (garde == null) {
            garde = new Garde();
            garde.setId(StringUtils.isBlank(id) ? UUID.randomUUID().toString() : id);
            garde.setCreatedAt(LocalDateTime.now());
            garde.setLibelle(nom);
            garde.setDateDebut(debut);
            garde.setDateFin(fin);
            em.persist(garde);
            return garde;
        }
        garde.setLibelle(nom);
        garde.setDateDebut(debut);
        garde.setDateFin(fin);
        garde.setUpdatedAt(LocalDateTime.now());
        return em.merge(garde);
    }

    private boolean periodeDejaPrise(String id, LocalDateTime debut, LocalDateTime fin) {
        TypedQuery<Long> q = em.createQuery("SELECT COUNT(g) FROM Garde g WHERE g.dateDebut = :debut"
                + " AND g.dateFin = :fin AND (:id IS NULL OR g.id <> :id)", Long.class);
        q.setParameter("debut", debut).setParameter("fin", fin).setParameter("id", StringUtils.isBlank(id) ? null : id);
        return q.getSingleResult() > 0L;
    }

    @Override
    public boolean supprimer(String id) {
        Garde garde = parId(id);
        if (garde == null) {
            return false;
        }
        // Supprimer une garde ne supprime aucune vente : seule la definition de la periode part.
        em.remove(garde);
        return true;
    }

    @Override
    public List<GardeVenteLigneDTO> lignesDeVente(LocalDateTime debut, LocalDateTime fin) {
        if (debut == null || fin == null || !fin.isAfter(debut)) {
            return Collections.emptyList();
        }
        try {
            Query q = em.createNativeQuery(SQL_LIGNES);
            q.setParameter(1, java.sql.Timestamp.valueOf(debut));
            q.setParameter(2, java.sql.Timestamp.valueOf(fin));
            List<GardeVenteLigneDTO> lignes = new ArrayList<>();
            for (Object ligne : q.getResultList()) {
                Object[] c = (Object[]) ligne;
                lignes.add(new GardeVenteLigneDTO(texte(c[0]), texte(c[1]), texte(c[2]), texte(c[3]), instant(c[4]),
                        entier(c[5]), entier(c[6])));
            }
            return lignes;
        } catch (Exception e) {
            LOG.log(Level.SEVERE, "lecture des ventes de la garde", e);
            return Collections.emptyList();
        }
    }

    @Override
    public List<GardeTrancheDTO> tranches(Garde garde, int heuresParTranche) {
        if (garde == null) {
            return Collections.emptyList();
        }
        return AnalyseGarde.tranches(garde.getDateDebut(), garde.getDateFin(),
                lignesDeVente(garde.getDateDebut(), garde.getDateFin()), heuresParTranche);
    }

    @Override
    public List<GardeProduitDTO> abc(Garde garde) {
        if (garde == null) {
            return Collections.emptyList();
        }
        return AnalyseGarde.classifierAbc(lignesDeVente(garde.getDateDebut(), garde.getDateFin()),
                seuil("A", AnalyseGarde.SEUIL_A_DEFAUT), seuil("B", AnalyseGarde.SEUIL_B_DEFAUT));
    }

    /**
     * Le seuil de cumul d'une classe, lu la ou la procedure ABC le lit.
     *
     * <p>
     * Recopier 80 et 95 en dur ferait diverger la garde de l'ecran de classification des que l'officine change ses
     * seuils -- et le classement resterait plausible, donc jamais remis en cause.
     * </p>
     */
    private double seuil(String code, double defaut) {
        try {
            Query q = em.createNativeQuery("SELECT dbl_SEUIL_CUMUL_MAX FROM t_classe_abc"
                    + " WHERE str_CODE = ?1 AND str_STATUT = 'enable' LIMIT 1");
            q.setParameter(1, code);
            List<?> resultat = q.getResultList();
            if (!resultat.isEmpty() && resultat.get(0) instanceof Number) {
                return ((Number) resultat.get(0)).doubleValue();
            }
        } catch (Exception e) {
            LOG.log(Level.WARNING, "seuil ABC " + code + " illisible, valeur par defaut utilisee", e);
        }
        return defaut;
    }

    @Override
    public AnalyseGarde.Indicateurs indicateurs(Garde garde) {
        if (garde == null) {
            return AnalyseGarde.indicateurs(null, null, Collections.emptyList());
        }
        return AnalyseGarde.indicateurs(garde.getDateDebut(), garde.getDateFin(),
                lignesDeVente(garde.getDateDebut(), garde.getDateFin()));
    }

    private static String texte(Object o) {
        return o == null ? "" : String.valueOf(o);
    }

    private static long entier(Object o) {
        return o instanceof Number ? ((Number) o).longValue() : 0L;
    }

    private static LocalDateTime instant(Object o) {
        if (o instanceof java.sql.Timestamp) {
            return ((java.sql.Timestamp) o).toLocalDateTime();
        }
        if (o instanceof java.util.Date) {
            return new java.sql.Timestamp(((java.util.Date) o).getTime()).toLocalDateTime();
        }
        return null;
    }
}
