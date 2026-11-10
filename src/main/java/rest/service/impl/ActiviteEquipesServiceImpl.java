package rest.service.impl;

import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import rest.service.ActiviteEquipesService;
import rest.service.dto.ActiviteAnalysesDTO;
import rest.service.dto.ActiviteCompteurDTO;
import rest.service.dto.ActiviteEmployeDTO;
import rest.service.dto.ActiviteFiltreDTO;
import rest.service.dto.ActiviteJournalDTO;
import rest.service.dto.ActiviteLigneDTO;
import rest.service.impl.activite.AgregatsActivite;
import rest.service.impl.activite.SeuilDuree;
import rest.service.impl.activite.AnomalieRegles;
import rest.service.dto.ActiviteAnomaliesDTO;

/**
 * Journal « Activité des équipes » : une branche SQL par type d'action, chacune filtree par la periode et l'employe
 * AVANT la reunion (UNION ALL), puis une page triee par date decroissante.
 *
 * <p>
 * Ce qui est lu : identifiants, dates, references, montants et l'utilisateur de Prestige. Les textes libres
 * (commentaires, descriptions de modification) ne sont pas repris : ils peuvent contenir le nom d'un client.
 */
@Stateless
@TransactionAttribute(TransactionAttributeType.NOT_SUPPORTED)
public class ActiviteEquipesServiceImpl implements ActiviteEquipesService {

    /** Lignes au plus dans un export CSV. */
    static final int EXPORT_MAX = 100000;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    /** Une branche du journal : type, libelle, puis le SELECT (colonnes d, t, u, r, m, x), la date et l'employe. */
    static final class Branche {

        final String type;
        final String libelle;
        final String select;
        final String date;
        final String employe;

        Branche(String type, String libelle, String select, String date, String employe) {
            this.type = type;
            this.libelle = libelle;
            this.select = select;
            this.date = date;
            this.employe = employe;
        }
    }

    static final List<Branche> BRANCHES = List.of(new Branche("VENTE", "Vente encaissée",
            "SELECT p.dt_UPDATED AS d, 'VENTE' AS t, p.lg_USER_CAISSIER_ID AS u, p.str_REF AS r, p.int_PRICE AS m,"
                    + " CONCAT('Vente ', IFNULL(p.str_TYPE_VENTE, '')) AS x FROM t_preenregistrement p"
                    + " WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0",
            "p.dt_UPDATED", "p.lg_USER_CAISSIER_ID"),
            new Branche("VENDEUR", "Vente comme vendeur",
                    "SELECT p.dt_CREATED AS d, 'VENDEUR' AS t, p.lg_USER_VENDEUR_ID AS u, p.str_REF AS r, p.int_PRICE AS m,"
                            + " 'Vente saisie, encaissée par un autre' AS x FROM t_preenregistrement p"
                            + " WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0"
                            + " AND p.lg_USER_VENDEUR_ID <> p.lg_USER_CAISSIER_ID",
                    "p.dt_UPDATED", "p.lg_USER_VENDEUR_ID"),
            new Branche("ANNULATION", "Vente annulée",
                    "SELECT p.dt_ANNULER AS d, 'ANNULATION' AS t, p.lg_USER_ID AS u, p.str_REF AS r, p.int_PRICE AS m,"
                            + " 'Vente annulée' AS x FROM t_preenregistrement p"
                            + " WHERE p.b_IS_CANCEL = 1 AND p.int_PRICE > 0"
                            + " AND NOT EXISTS (SELECT 1 FROM vente_modifiee vm WHERE vm.vente_origine_id = p.lg_PREENREGISTREMENT_ID)",
                    "p.dt_ANNULER", "p.lg_USER_ID"),
            new Branche("MODIFICATION", "Vente modifiée",
                    "SELECT v.mvt_date AS d, 'MODIFICATION' AS t, v.user_id AS u, v.vente_ref AS r, v.montant_apres AS m,"
                            + " CONCAT('Modification : ', IFNULL(v.type_modification, ''), ' (avant ', IFNULL(v.montant_avant, 0), ')') AS x"
                            + " FROM vente_modifiee v WHERE 1 = 1",
                    "v.mvt_date", "v.user_id"),
            new Branche("BL", "Bon de livraison entré",
                    "SELECT b.dt_CREATED AS d, 'BL' AS t, b.lg_USER_ID AS u, b.str_REF_LIVRAISON AS r, b.int_HTTC AS m,"
                            + " CONCAT('BL ', IFNULL(g.str_LIBELLE, '')) AS x FROM t_bon_livraison b"
                            + " LEFT JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID"
                            + " WHERE b.str_STATUT = 'is_Closed'",
                    "b.dt_CREATED", "b.lg_USER_ID"),
            new Branche("COMMANDE", "Commande créée",
                    "SELECT o.dt_CREATED AS d, 'COMMANDE' AS t, o.lg_USER_ID AS u, o.str_REF_ORDER AS r, o.int_PRICE AS m,"
                            + " CONCAT('Commande ', IFNULL(g.str_LIBELLE, ''), ' (', IFNULL(o.int_LINE, 0), ' lignes)') AS x"
                            + " FROM t_order o LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID WHERE 1 = 1",
                    "o.dt_CREATED", "o.lg_USER_ID"),
            /*
             * NULL type (CAST) : filtre sur ce seul type, un NULL nu n'a pas de type JDBC et la requete echouait
             * (retour du 24/10)
             */
            new Branche("AJUSTEMENT", "Ajustement de stock",
                    "SELECT a.dt_CREATED AS d, 'AJUSTEMENT' AS t, a.lg_USER_ID AS u, a.str_NAME AS r, CAST(NULL AS SIGNED) AS m,"
                            + " CONCAT('Ajustement ', IFNULL(a.str_ZONE, '')) AS x FROM t_ajustement a WHERE 1 = 1",
                    "a.dt_CREATED", "a.lg_USER_ID"),
            new Branche("INVENTAIRE", "Inventaire créé",
                    "SELECT i.dt_CREATED AS d, 'INVENTAIRE' AS t, i.lg_USER_ID AS u, i.str_NAME AS r, CAST(NULL AS SIGNED) AS m,"
                            + " 'Inventaire créé' AS x FROM t_inventaire i WHERE 1 = 1",
                    "i.dt_CREATED", "i.lg_USER_ID"),
            new Branche("RETOUR", "Retour fournisseur",
                    "SELECT f.dt_CREATED AS d, 'RETOUR' AS t, f.lg_USER_ID AS u, f.str_REF_RETOUR_FRS AS r, f.dl_AMOUNT AS m,"
                            + " CONCAT('Retour ', IFNULL(g.str_LIBELLE, '')) AS x FROM t_retour_fournisseur f"
                            + " LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = f.lg_GROSSISTE_ID WHERE 1 = 1",
                    "f.dt_CREATED", "f.lg_USER_ID"),
            new Branche("CONNEXION", "Connexion",
                    "SELECT e.dt_CREATED AS d, 'CONNEXION' AS t, e.lg_USER_ID AS u, CAST(NULL AS CHAR(50)) AS r, CAST(NULL AS SIGNED) AS m,"
                            + " e.str_DESCRIPTION AS x FROM t_event_log e WHERE e.str_DESCRIPTION LIKE 'Authentification%'",
                    "e.dt_CREATED", "e.lg_USER_ID"));

    static final Map<String, String> LIBELLES = new LinkedHashMap<>();
    static {
        BRANCHES.forEach(b -> LIBELLES.put(b.type, b.libelle));
    }

    @Override
    public List<ActiviteEmployeDTO> employes() {
        @SuppressWarnings("unchecked")
        List<Object[]> l = em
                .createNativeQuery("SELECT u.lg_USER_ID, TRIM(CONCAT(IFNULL(u.str_FIRST_NAME, ''), ' ',"
                        + " IFNULL(u.str_LAST_NAME, ''))), u.str_STATUT = 'enable' FROM t_user u"
                        + " WHERE u.str_STATUT IN ('enable', 'disable') ORDER BY u.str_STATUT = 'enable' DESC, 2")
                .getResultList();
        List<ActiviteEmployeDTO> res = new ArrayList<>();
        for (Object[] r : l) {
            res.add(ActiviteEmployeDTO.builder().id(String.valueOf(r[0])).nom(String.valueOf(r[1]))
                    .actif(r[2] != null && ((Number) r[2]).intValue() == 1).build());
        }
        return res;
    }

    /** Requete reunie : branches retenues (type), chacune filtree par periode et employe. */
    static String reunion(ActiviteFiltreDTO f, List<Object> params, boolean toutesLesBranches) {
        StringBuilder sql = new StringBuilder();
        for (Branche b : BRANCHES) {
            if (!toutesLesBranches && vide(f.getType()) == false && !b.type.equals(f.getType())) {
                continue;
            }
            if (sql.length() > 0) {
                sql.append(" UNION ALL ");
            }
            sql.append(b.select).append(" AND ").append(b.date).append(" >= ?").append(params.size() + 1);
            params.add(Timestamp.valueOf(borneDebut(f)));
            sql.append(" AND ").append(b.date).append(" < ?").append(params.size() + 1);
            params.add(Timestamp.valueOf(borneFin(f)));
            if (!vide(f.getEmployeId())) {
                sql.append(" AND ").append(b.employe).append(" = ?").append(params.size() + 1);
                params.add(f.getEmployeId());
            }
        }
        return sql.toString();
    }

    /** Filtre de recherche sur la reunion (reference ou detail). */
    static String recherche(ActiviteFiltreDTO f, List<Object> params) {
        if (vide(f.getRecherche())) {
            return "";
        }
        String motif = "%" + f.getRecherche().trim() + "%";
        params.add(motif);
        params.add(motif);
        return " WHERE (a.r LIKE ?" + (params.size() - 1) + " OR a.x LIKE ?" + params.size() + ")";
    }

    @Override
    public ActiviteJournalDTO journal(ActiviteFiltreDTO f) {
        /* compteurs par type : toutes les branches, sans le filtre de type (pastilles) */
        List<Object> pc = new ArrayList<>();
        String sqlCompteurs = "SELECT a.t, COUNT(*) FROM (" + reunion(f, pc, true) + ") a" + recherche(f, pc)
                + " GROUP BY a.t";
        Map<String, Long> parType = new LinkedHashMap<>();
        for (Object[] r : liste(sqlCompteurs, pc)) {
            parType.put(String.valueOf(r[0]), ((Number) r[1]).longValue());
        }
        List<ActiviteCompteurDTO> compteurs = new ArrayList<>();
        LIBELLES.forEach((t, l) -> compteurs
                .add(ActiviteCompteurDTO.builder().type(t).libelle(l).nombre(parType.getOrDefault(t, 0L)).build()));
        long total = vide(f.getType()) ? parType.values().stream().mapToLong(Long::longValue).sum()
                : parType.getOrDefault(f.getType(), 0L);

        List<ActiviteLigneDTO> lignes = page(f, Math.max(1, Math.min(f.getLimit(), 500)));
        return ActiviteJournalDTO.builder().total(total).lignes(lignes).compteurs(compteurs).build();
    }

    static final String CLE_SEUIL_OPERATEUR = "KEY_TABLEAU_BORD_SEUIL_VENTE_LONGUE_OP";
    static final String CLE_SEUIL_MINUTES = "KEY_TABLEAU_BORD_SEUIL_VENTE_LONGUE_MIN";

    @Override
    public SeuilDuree seuilEnregistre() {
        List<Object> p = new ArrayList<>();
        p.add(CLE_SEUIL_OPERATEUR);
        p.add(CLE_SEUIL_MINUTES);
        String op = null, min = null;
        for (Object[] r : liste("SELECT t.str_KEY, t.str_VALUE FROM t_parameters t WHERE t.str_KEY IN (?1, ?2)", p)) {
            String v = r[1] == null ? null : r[1].toString();
            if (CLE_SEUIL_OPERATEUR.equals(r[0])) {
                op = v;
            } else {
                min = v;
            }
        }
        return SeuilDuree.lu(op, min);
    }

    /**
     * Plan du 09/11, point 10 : critere demande par l'ecran (essai sans enregistrer), sinon celui enregistre pour tous
     * (onglet principal, onglet Anomalies, carte du tableau de bord).
     */
    SeuilDuree seuil(ActiviteFiltreDTO f) {
        return SeuilDuree.retenu(f.getSeuilOperateur(), f.getSeuilMinutes(), seuilEnregistre());
    }

    /* le service lit sans transaction ; seul l'enregistrement du critere en ouvre une */
    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public Map<String, Object> enregistrerSeuil(String operateur, Integer minutes) {
        Map<String, Object> m = new LinkedHashMap<>();
        String op = operateur == null ? "" : operateur.trim().toUpperCase();
        if (!op.matches("GT|GE|LT|LE") || minutes == null || minutes < 1
                || minutes > util.Constant.ACTIVITE_SEUIL_MINUTES_MAX) {
            m.put("success", false);
            m.put("msg", "Critère invalide : de 1 à " + util.Constant.ACTIVITE_SEUIL_MINUTES_MAX + " minutes.");
            return m;
        }
        ecrireParametre(CLE_SEUIL_OPERATEUR, op,
                "ACTIVITE DES EQUIPES : OPERATEUR DU CRITERE DE DUREE DES VENTES (GT, GE, LT, LE)");
        ecrireParametre(CLE_SEUIL_MINUTES, String.valueOf(minutes),
                "ACTIVITE DES EQUIPES : MINUTES DU CRITERE DE DUREE DES VENTES");
        SeuilDuree s = seuilEnregistre();
        m.put("success", true);
        m.put("seuilOperateur", s.getOperateur());
        m.put("seuilMinutes", s.getMinutes());
        m.put("seuilLibelle", s.libelle());
        m.put("msg", "Critère enregistré pour tous : " + s.libelle().toLowerCase() + ".");
        return m;
    }

    private void ecrireParametre(String cle, String valeur, String description) {
        int n = em.createNativeQuery("UPDATE t_parameters SET str_VALUE = ?1, dt_UPDATED = NOW() WHERE str_KEY = ?2")
                .setParameter(1, valeur).setParameter(2, cle).executeUpdate();
        if (n == 0) {
            em.createNativeQuery("INSERT INTO t_parameters (str_KEY, str_VALUE, str_DESCRIPTION, str_TYPE, str_STATUT,"
                    + " dt_CREATED, dt_UPDATED) VALUES (?1, ?2, ?3, 'CUSTOMER', 'enable', NOW(), NOW())")
                    .setParameter(1, cle).setParameter(2, valeur).setParameter(3, description).executeUpdate();
        }
    }

    /** Plan du 09/11, point 10 : debut de la plage lue, a l'heure pres si une garde est choisie. */
    static java.time.LocalDateTime borneDebut(ActiviteFiltreDTO f) {
        return f.getDe() != null ? f.getDe() : f.getDebut().atStartOfDay();
    }

    /** Fin (exclue) de la plage lue. */
    static java.time.LocalDateTime borneFin(ActiviteFiltreDTO f) {
        return f.getA() != null ? f.getA() : f.getFin().plusDays(1).atStartOfDay();
    }

    @Override
    public ActiviteAnalysesDTO analyses(ActiviteFiltreDTO f) {
        /*
         * plan du 09/11, point 10 : plage [de, a[ ; une garde (plage a l'heure) se compare a la meme plage 7 jours plus
         * tot, une periode en jours a autant de jours juste avant
         */
        java.time.LocalDateTime de = borneDebut(f), a = borneFin(f), deP, aP;
        if (f.getDe() != null) {
            deP = de.minusWeeks(1);
            aP = a.minusWeeks(1);
        } else {
            long jours = ChronoUnit.DAYS.between(f.getDebut(), f.getFin()) + 1;
            deP = de.minusDays(jours);
            aP = de;
        }
        LocalDate debutP = deP.toLocalDate(), finP = aP.minusSeconds(1).toLocalDate();
        Map<String, String> noms = noms();
        SeuilDuree seuil = seuil(f);
        List<AgregatsActivite.Vente> ventes = ventes(de, a, f.getEmployeId());
        List<AgregatsActivite.Bl> bls = bls(de, a, f.getEmployeId());
        Map<String, Long> annulations = parEmploye(SQL_ANNULATIONS, de, a, f.getEmployeId());
        AgregatsActivite.Totaux t = AgregatsActivite.totaux(ventes, bls, somme(annulations), seuil);
        AgregatsActivite.Totaux p = AgregatsActivite.totaux(ventes(deP, aP, f.getEmployeId()),
                bls(deP, aP, f.getEmployeId()), somme(parEmploye(SQL_ANNULATIONS, deP, aP, f.getEmployeId())), seuil);

        Map<String, Long> ventesParEmploye = new HashMap<>();
        ventes.forEach(v -> ventesParEmploye.merge(v.employeId(), 1L, Long::sum));
        Set<String> actifs = new HashSet<>(ventesParEmploye.keySet());
        bls.forEach(b -> actifs.add(b.employeId()));

        List<ActiviteAnalysesDTO.Heure> heures = AgregatsActivite.heures(ventes);
        List<ActiviteAnalysesDTO.Operateur> operateurs = AgregatsActivite.operateurs(ventes, noms, seuil);
        List<ActiviteAnalysesDTO.Grossiste> grossistes = AgregatsActivite.grossistes(bls);
        List<ActiviteAnalysesDTO.Tranche> retard = AgregatsActivite.retardBl(bls);
        List<ActiviteAnalysesDTO.Sensible> sensibles = AgregatsActivite.sensibles(ventesParEmploye, annulations,
                parEmploye(SQL_MODIFICATIONS, de, a, f.getEmployeId()),
                parEmploye(SQL_REMISES, de, a, f.getEmployeId()), noms);

        List<Object> pr = new ArrayList<>();
        ActiviteFiltreDTO sansType = ActiviteFiltreDTO.builder().debut(f.getDebut()).fin(f.getFin()).de(f.getDe())
                .a(f.getA()).employeId(f.getEmployeId()).build();
        List<Object[]> parType = liste(
                "SELECT a.u AS emp, a.t AS typ, COUNT(*) AS n FROM (" + reunion(sansType, pr, true) + ") a"
                        + " WHERE a.u IS NOT NULL AND a.t <> 'CONNEXION' GROUP BY a.u, a.t",
                pr);

        List<ActiviteAnalysesDTO.Constat> constats = AgregatsActivite.constats(heures, operateurs, grossistes, retard,
                sensibles, t, p, seuil);
        return ActiviteAnalysesDTO.builder().debut(f.getDebut().toString()).fin(f.getFin().toString())
                .debutPrecedent(debutP.toString()).finPrecedent(finP.toString())
                .indicateurs(AgregatsActivite.indicateurs(t, p, actifs.size(), seuil)).constats(constats)
                .resume(AgregatsActivite.resume(t, bls, sensibles, operateurs, constats, seuil))
                .seuilOperateur(seuil.getOperateur()).seuilMinutes(seuil.getMinutes()).seuilLibelle(seuil.libelle())
                .heures(heures).carte(AgregatsActivite.carte(ventes)).jours(AgregatsActivite.jours(ventes, bls))
                .operateurs(operateurs).longues(AgregatsActivite.longues(operateurs, AgregatsActivite.LONGUES_MAX))
                .typesVente(AgregatsActivite.typesVente(ventes, seuil))
                .preventes(AgregatsActivite
                        .preventes(lire(SQL_PREVENTES, "p.lg_USER_VENDEUR_ID", de, a, f.getEmployeId()), noms))
                .vitesseCaissieres(AgregatsActivite.vitesseCaissieres(
                        lire(SQL_CAISSIERES, "p.lg_USER_CAISSIER_ID", de, a, f.getEmployeId()), noms))
                .grossistes(grossistes).retardBl(retard).sensibles(sensibles)
                .repartition(AgregatsActivite.repartition(parType, noms)).build();
    }

    /** Ventes encaissees de la periode : une ligne par vente (operateur = lg_USER_ID, comme les requetes de mesure). */
    static final String SQL_VENTES = "SELECT p.lg_USER_ID AS emp, p.dt_CREATED AS ouverture, MAX(d.dt_UPDATED) AS derniere,"
            + " COALESCE(p.completion_date, p.dt_UPDATED) AS encaissement, COUNT(d.lg_PREENREGISTREMENT_DETAIL_ID) AS lignes, p.int_PRICE AS montant,"
            + " p.lg_TYPE_VENTE_ID AS typ, p.b_IS_AVOIR AS avoir,"
            + " (p.lg_USER_VENDEUR_ID IS NOT NULL AND p.lg_USER_VENDEUR_ID <> p.lg_USER_CAISSIER_ID) AS reprise"
            + " FROM t_preenregistrement p"
            + " JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
            + " WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'"
            + " AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2 %s GROUP BY p.lg_PREENREGISTREMENT_ID";
    /**
     * Plan avoir du 08/11, point 1 : memes ventes que SQL_VENTES (memes regles), avec la caissiere, le vendeur et
     * l'operateur, pour le rapport employe x tranche horaire x CA.
     */
    static final String SQL_CA_TRANCHES = "SELECT p.lg_USER_CAISSIER_ID AS caissier, p.lg_USER_VENDEUR_ID AS vendeur,"
            + " p.lg_USER_ID AS operateur, COALESCE(p.completion_date, p.dt_UPDATED) AS encaissement, p.int_PRICE AS montant,"
            + " p.dt_CREATED AS ouverture, MAX(d.dt_UPDATED) AS derniere, p.lg_USER_CONSEIL_ID AS conseil FROM t_preenregistrement p"
            + " JOIN t_preenregistrement_detail d ON d.lg_PREENREGISTREMENT_ID = p.lg_PREENREGISTREMENT_ID"
            + " WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'"
            + " AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2 GROUP BY p.lg_PREENREGISTREMENT_ID";

    @Override
    public Map<String, Object> caTranches(ActiviteFiltreDTO f, Integer taille, String attribution) {
        List<rest.service.impl.activite.CaTranchesEmploye.Vente> l = new ArrayList<>();
        for (Object[] r : lire(SQL_CA_TRANCHES, "", borneDebut(f), borneFin(f), null)) {
            /* memes ventes ecartees que ventes() : ouverture, derniere ligne ou encaissement inconnus */
            if (r[3] == null || r[5] == null || r[6] == null) {
                continue;
            }
            l.add(new rest.service.impl.activite.CaTranchesEmploye.Vente(r[0] == null ? null : String.valueOf(r[0]),
                    r[1] == null ? null : String.valueOf(r[1]), r[2] == null ? null : String.valueOf(r[2]), heure(r[3]),
                    r[4] == null ? 0 : ((Number) r[4]).longValue(), r[7] == null ? null : String.valueOf(r[7])));
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("debut", f.getDebut().toString());
        m.put("fin", f.getFin().toString());
        m.putAll(rest.service.impl.activite.CaTranchesEmploye.calculer(l, taille, attribution, noms(),
                f.getEmployeId()));
        return m;
    }

    /** BL clotures entres sur la periode : une ligne par BL. */
    static final String SQL_BL = "SELECT b.lg_USER_ID AS emp, g.str_LIBELLE AS grossiste, o.dt_CREATED AS commande, b.dt_CREATED AS creation,"
            + " MAX(d.dt_UPDATED) AS fin_saisie, b.dt_DATE_LIVRAISON AS livraison, COUNT(*) AS lignes"
            + " FROM t_bon_livraison b JOIN t_order o ON o.lg_ORDER_ID = b.lg_ORDER_ID LEFT JOIN t_grossiste g ON g.lg_GROSSISTE_ID = o.lg_GROSSISTE_ID"
            + " JOIN t_bon_livraison_detail d ON d.lg_BON_LIVRAISON_ID = b.lg_BON_LIVRAISON_ID"
            + " WHERE b.str_STATUT = 'is_Closed' AND b.dt_CREATED >= ?1 AND b.dt_CREATED < ?2 %s GROUP BY b.lg_BON_LIVRAISON_ID";
    static final String SQL_ANNULATIONS = "SELECT p.lg_USER_ID AS emp, COUNT(*) AS n FROM t_preenregistrement p WHERE p.b_IS_CANCEL = 1 AND p.int_PRICE > 0"
            + " AND p.dt_ANNULER >= ?1 AND p.dt_ANNULER < ?2 %s"
            + " AND NOT EXISTS (SELECT 1 FROM vente_modifiee vm WHERE vm.vente_origine_id = p.lg_PREENREGISTREMENT_ID) GROUP BY p.lg_USER_ID";
    static final String SQL_MODIFICATIONS = "SELECT v.user_id AS emp, COUNT(*) AS n FROM vente_modifiee v WHERE v.mvt_date >= ?1 AND v.mvt_date < ?2 %s"
            + " GROUP BY v.user_id";
    /**
     * Plan du 08/11, point 15.4 : preventes par vendeur, saisies sur la periode. Prevente = vente saisie par un vendeur
     * et encaissee par un autre ; annulee = annulee hors modification ; abandonnee = restee en attente apres le jour de
     * saisie. Lignes comptees sur les encaissees.
     */
    /**
     * Plan du 08/11, point 15.3 : preventes encaissees sur la periode (date d'encaissement), une ligne par vente :
     * caissiere, montant, duree de sa prise en caisse a l'encaissement (null si la prise n'est pas connue).
     */
    static final String SQL_CAISSIERES = "SELECT p.lg_USER_CAISSIER_ID AS emp, p.int_PRICE AS prix,"
            + " TIMESTAMPDIFF(SECOND, pc.pris_le, p.completion_date) AS duree FROM t_preenregistrement p"
            + " LEFT JOIN vente_prise_caisse pc ON pc.vente_id = p.lg_PREENREGISTREMENT_ID AND pc.user_id = p.lg_USER_CAISSIER_ID"
            + " WHERE p.completion_date >= ?1 AND p.completion_date < ?2 AND p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0"
            + " AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5' AND p.lg_USER_VENDEUR_ID IS NOT NULL"
            + " AND p.lg_USER_VENDEUR_ID <> p.lg_USER_CAISSIER_ID %s";
    static final String SQL_PREVENTES = "SELECT p.lg_USER_VENDEUR_ID AS emp,"
            + " SUM(p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.lg_USER_CAISSIER_ID <> p.lg_USER_VENDEUR_ID) AS enc,"
            + " SUM(CASE WHEN p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.lg_USER_CAISSIER_ID <> p.lg_USER_VENDEUR_ID"
            + "   THEN p.int_PRICE ELSE 0 END) AS ca,"
            + " SUM(CASE WHEN p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.lg_USER_CAISSIER_ID <> p.lg_USER_VENDEUR_ID"
            + "   THEN IFNULL(dl.n, 0) ELSE 0 END) AS lignes,"
            + " SUM(p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 1 AND p.lg_USER_CAISSIER_ID <> p.lg_USER_VENDEUR_ID"
            + "   AND NOT EXISTS (SELECT 1 FROM vente_modifiee vm WHERE vm.vente_origine_id = p.lg_PREENREGISTREMENT_ID)) AS annulees,"
            + " SUM(p.str_STATUT IN ('is_Process', 'pending') AND p.dt_UPDATED < CURDATE() AND dl.n > 0) AS abandonnees"
            + " FROM t_preenregistrement p LEFT JOIN (SELECT d.lg_PREENREGISTREMENT_ID AS id, COUNT(*) AS n"
            + "   FROM t_preenregistrement_detail d JOIN t_preenregistrement x ON x.lg_PREENREGISTREMENT_ID = d.lg_PREENREGISTREMENT_ID"
            + "   WHERE x.dt_CREATED >= ?1 AND x.dt_CREATED < ?2 GROUP BY d.lg_PREENREGISTREMENT_ID) dl ON dl.id = p.lg_PREENREGISTREMENT_ID"
            + " WHERE p.dt_CREATED >= ?1 AND p.dt_CREATED < ?2 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5'"
            + " AND p.lg_USER_VENDEUR_ID IS NOT NULL %s GROUP BY p.lg_USER_VENDEUR_ID";
    private static final String HORS_MODIFICATION = " AND NOT EXISTS (SELECT 1 FROM vente_modifiee vm"
            + " WHERE vm.vente_origine_id = p.lg_PREENREGISTREMENT_ID)";
    /** Plan du 08/11, point 15.1 : ventes saisies sur la periode par vendeur, dont annulees ensuite. */
    static final String SQL_ANNULATIONS_VENDEUR = "SELECT p.lg_USER_VENDEUR_ID AS emp, COUNT(*) AS ventes,"
            + " SUM(p.b_IS_CANCEL = 1) AS annulees FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Closed'"
            + " AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID <> '5' AND p.dt_CREATED >= ?1 AND p.dt_CREATED < ?2 %1$s"
            + " AND p.lg_USER_VENDEUR_ID IS NOT NULL" + HORS_MODIFICATION + " GROUP BY p.lg_USER_VENDEUR_ID";
    /**
     * Plan du 08/11, point 15.1 : par caissiere (qui a encaisse la vente), operations faites sur la periode :
     * annulations au comptant, modifications au comptant, modifications a credit (assurance, carnet).
     */
    static final String SQL_ANNULATIONS_CAISSIER = "SELECT p.lg_USER_CAISSIER_ID AS emp, COUNT(*) AS ac, 0 AS mc, 0 AS mk, 0 AS vc, 0 AS vk"
            + " FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 1 AND p.int_PRICE > 0"
            + " AND p.lg_TYPE_VENTE_ID = '1' AND p.dt_ANNULER >= ?1 AND p.dt_ANNULER < ?2 %1$s" + HORS_MODIFICATION
            + " GROUP BY p.lg_USER_CAISSIER_ID"
            + " UNION ALL SELECT p.lg_USER_CAISSIER_ID AS emp, 0 AS ac, SUM(p.lg_TYPE_VENTE_ID = '1') AS mc,"
            + " SUM(p.lg_TYPE_VENTE_ID IN ('2', '3')) AS mk, 0 AS vc, 0 AS vk FROM vente_modifiee vm JOIN t_preenregistrement p"
            + " ON p.lg_PREENREGISTREMENT_ID = COALESCE(vm.vente_origine_id, vm.vente_id)"
            + " WHERE vm.mvt_date >= ?1 AND vm.mvt_date < ?2 %1$s GROUP BY p.lg_USER_CAISSIER_ID"
            /*
             * plan du 09/11, point 10 : ventes encaissees sur la periode, au comptant et a credit (denominateurs des
             * taux)
             */
            + " UNION ALL SELECT p.lg_USER_CAISSIER_ID AS emp, 0 AS ac, 0 AS mc, 0 AS mk, SUM(p.lg_TYPE_VENTE_ID = '1') AS vc,"
            + " SUM(p.lg_TYPE_VENTE_ID IN ('2', '3')) AS vk FROM t_preenregistrement p WHERE p.str_STATUT = 'is_Closed'"
            + " AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID IN ('1', '2', '3') AND COALESCE(p.completion_date, p.dt_UPDATED) >= ?1"
            + " AND COALESCE(p.completion_date, p.dt_UPDATED) < ?2 %1$s" + HORS_MODIFICATION
            + " GROUP BY p.lg_USER_CAISSIER_ID";
    private static final String DETAIL_COLONNES = "SELECT p.str_REF, p.dt_CREATED, p.int_PRICE, %s, vmo.motif_libelle,"
            + " vmo.commentaire, %s, %s, p.lg_TYPE_VENTE_ID, p.lg_USER_CAISSIER_ID FROM ";
    static final String SQL_DETAIL_VENDEUR = String.format(DETAIL_COLONNES, "'Annulation'", "p.lg_USER_ID",
            "p.dt_ANNULER")
            + "t_preenregistrement p LEFT JOIN vente_motif vmo ON vmo.vente_id = p.lg_PREENREGISTREMENT_ID"
            + " AND vmo.type_operation = 'ANNULATION' AND vmo.statut = 'VALIDEE'"
            + " WHERE p.str_STATUT = 'is_Closed' AND p.int_PRICE > 0 AND p.b_IS_CANCEL = 1 AND p.lg_TYPE_VENTE_ID <> '5'"
            + " AND p.dt_CREATED >= ?1 AND p.dt_CREATED < ?2 AND p.lg_USER_VENDEUR_ID = ?3" + HORS_MODIFICATION
            + " ORDER BY 8 DESC LIMIT 300";
    static final String SQL_DETAIL_CAISSIER = String.format(DETAIL_COLONNES, "'Annulation'", "p.lg_USER_ID",
            "p.dt_ANNULER")
            + "t_preenregistrement p LEFT JOIN vente_motif vmo ON vmo.vente_id = p.lg_PREENREGISTREMENT_ID"
            + " AND vmo.type_operation = 'ANNULATION' AND vmo.statut = 'VALIDEE'"
            + " WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 1 AND p.int_PRICE > 0 AND p.lg_TYPE_VENTE_ID = '1'"
            + " AND p.dt_ANNULER >= ?1 AND p.dt_ANNULER < ?2 AND p.lg_USER_CAISSIER_ID = ?3" + HORS_MODIFICATION
            + " UNION ALL "
            + String.format(DETAIL_COLONNES, "CONCAT('Modification (', vm.type_modification, ')')", "vm.user_id",
                    "vm.mvt_date")
            + "vente_modifiee vm JOIN t_preenregistrement p ON p.lg_PREENREGISTREMENT_ID = COALESCE(vm.vente_origine_id, vm.vente_id)"
            + " LEFT JOIN vente_motif vmo ON vmo.vente_id = p.lg_PREENREGISTREMENT_ID AND vmo.type_operation = 'MODIFICATION'"
            + " AND vmo.statut = 'VALIDEE' WHERE vm.mvt_date >= ?1 AND vm.mvt_date < ?2 AND p.lg_USER_CAISSIER_ID = ?3"
            + " AND p.lg_TYPE_VENTE_ID IN ('1', '2', '3') ORDER BY 8 DESC LIMIT 300";
    static final String SQL_REMISES = "SELECT p.lg_USER_CAISSIER_ID AS emp, SUM(p.int_PRICE_REMISE) AS n FROM t_preenregistrement p"
            + " WHERE p.str_STATUT = 'is_Closed' AND p.b_IS_CANCEL = 0 AND p.int_PRICE_REMISE > 0 AND p.dt_UPDATED >= ?1 AND p.dt_UPDATED < ?2 %s"
            + " GROUP BY p.lg_USER_CAISSIER_ID";

    private List<Object[]> lire(String gabarit, String colonneEmploye, LocalDate debut, LocalDate fin,
            String employeId) {
        return lire(gabarit, colonneEmploye, debut.atStartOfDay(), fin.plusDays(1).atStartOfDay(), employeId);
    }

    /** Plan du 09/11, point 10 : lecture sur une plage [de, a[ a l'heure pres. */
    private List<Object[]> lire(String gabarit, String colonneEmploye, java.time.LocalDateTime de,
            java.time.LocalDateTime a, String employeId) {
        List<Object> params = new ArrayList<>();
        params.add(Timestamp.valueOf(de));
        params.add(Timestamp.valueOf(a));
        String filtre = "";
        if (!vide(employeId)) {
            filtre = "AND " + colonneEmploye + " = ?3";
            params.add(employeId);
        }
        return liste(String.format(gabarit, filtre), params);
    }

    @Override
    public Map<String, Object> annulations(ActiviteFiltreDTO f) {
        Map<String, String> noms = noms();
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("debut", f.getDebut().toString());
        m.put("fin", f.getFin().toString());
        m.put("parVendeur", rest.service.impl.activite.AnnulationsAuteurs.parVendeur(
                lire(SQL_ANNULATIONS_VENDEUR, "p.lg_USER_VENDEUR_ID", borneDebut(f), borneFin(f), f.getEmployeId()),
                noms));
        m.put("parCaissier", rest.service.impl.activite.AnnulationsAuteurs.parCaissier(
                lire(SQL_ANNULATIONS_CAISSIER, "p.lg_USER_CAISSIER_ID", borneDebut(f), borneFin(f), f.getEmployeId()),
                noms));
        return m;
    }

    @Override
    public List<Map<String, Object>> detailAnnulations(LocalDate debut, LocalDate fin, String role, String id) {
        Map<String, String> noms = noms();
        List<Object> params = new ArrayList<>();
        params.add(Timestamp.valueOf(debut.atStartOfDay()));
        params.add(Timestamp.valueOf(fin.plusDays(1).atStartOfDay()));
        params.add(id);
        java.time.format.DateTimeFormatter fmt = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
        List<Map<String, Object>> l = new ArrayList<>();
        for (Object[] r : liste("CAISSIER".equals(role) ? SQL_DETAIL_CAISSIER : SQL_DETAIL_VENDEUR, params)) {
            Map<String, Object> x = new java.util.LinkedHashMap<>();
            x.put("reference", r[0] == null ? "" : String.valueOf(r[0]));
            x.put("dateVente", r[1] == null ? "" : heure(r[1]).format(fmt));
            x.put("montant", r[2] == null ? 0 : ((Number) r[2]).longValue());
            x.put("operation", String.valueOf(r[3]));
            x.put("motif", r[4] == null ? "" : String.valueOf(r[4]));
            x.put("commentaire", r[5] == null ? "" : String.valueOf(r[5]));
            x.put("parQui", r[6] == null ? "" : noms.getOrDefault(String.valueOf(r[6]), "?"));
            x.put("quand", r[7] == null ? "" : heure(r[7]).format(fmt));
            x.put("typeVente", AgregatsActivite.typeVente(r[8] == null ? null : String.valueOf(r[8]), false));
            /* plan du 09/11, point 10 : caissiere qui a encaisse la vente */
            x.put("encaissePar", r[9] == null ? "" : noms.getOrDefault(String.valueOf(r[9]), "?"));
            l.add(x);
        }
        return l;
    }

    /** tinyint(1) ou bit : Boolean ou nombre selon le pilote. */
    static boolean vrai(Object o) {
        if (o instanceof Boolean) {
            return (Boolean) o;
        }
        return o instanceof Number && ((Number) o).intValue() == 1;
    }

    private List<AgregatsActivite.Vente> ventes(LocalDate debut, LocalDate fin, String employeId) {
        return ventes(debut.atStartOfDay(), fin.plusDays(1).atStartOfDay(), employeId);
    }

    private List<AgregatsActivite.Vente> ventes(java.time.LocalDateTime de, java.time.LocalDateTime a,
            String employeId) {
        List<AgregatsActivite.Vente> l = new ArrayList<>();
        for (Object[] r : lire(SQL_VENTES, "p.lg_USER_ID", de, a, employeId)) {
            if (r[1] == null || r[2] == null || r[3] == null) {
                continue;
            }
            l.add(new AgregatsActivite.Vente(String.valueOf(r[0]), heure(r[1]), heure(r[2]), heure(r[3]),
                    ((Number) r[4]).longValue(), r[5] == null ? 0 : ((Number) r[5]).longValue(),
                    r[6] == null ? null : String.valueOf(r[6]), vrai(r[7]), vrai(r[8])));
        }
        return l;
    }

    private List<rest.service.impl.activite.ControleGardes.Garde> gardes(java.time.LocalDateTime debut,
            java.time.LocalDateTime fin) {
        List<Object> p = new ArrayList<>();
        p.add(Timestamp.valueOf(fin));
        p.add(Timestamp.valueOf(debut));
        List<rest.service.impl.activite.ControleGardes.Garde> l = new ArrayList<>();
        for (Object[] r : liste("SELECT g.id, g.libelle, g.date_debut, g.date_fin FROM garde g"
                + " WHERE g.date_debut < ?1 AND g.date_fin > ?2 ORDER BY g.date_debut", p)) {
            l.add(new rest.service.impl.activite.ControleGardes.Garde(String.valueOf(r[0]), String.valueOf(r[1]),
                    heure(r[2]), heure(r[3])));
        }
        return l;
    }

    @Override
    public Map<String, Object> controleGardes(LocalDate debut, LocalDate fin) {
        /* la nuit du dernier jour va jusqu'au lendemain 6 h : les ventes sont lues un jour de plus */
        List<java.time.LocalDateTime> ouvertures = new ArrayList<>();
        ventes(debut, fin.plusDays(1), null).forEach(v -> ouvertures.add(v.ouvertureVente()));
        Map<String, Object> m = rest.service.impl.activite.ControleGardes
                .analyser(ouvertures,
                        gardes(debut.atStartOfDay(),
                                fin.plusDays(1).atTime(rest.service.impl.activite.ControleGardes.FIN_NUIT, 0)),
                        debut, fin);
        m.put("debut", debut.toString());
        m.put("fin", fin.toString());
        return m;
    }

    @Override
    public Map<String, Object> carteGarde(String gardeId) {
        List<Object> p = new ArrayList<>();
        p.add(gardeId);
        List<Object[]> g = liste("SELECT g.libelle, g.date_debut, g.date_fin FROM garde g WHERE g.id = ?1", p);
        if (g.isEmpty()) {
            return null;
        }
        java.time.LocalDateTime de = heure(g.get(0)[1]), a = heure(g.get(0)[2]);
        List<AgregatsActivite.Vente> pendant = rest.service.impl.activite.ControleGardes
                .pendant(ventes(de.toLocalDate(), a.toLocalDate(), null), de, a);
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("libelle", String.valueOf(g.get(0)[0]));
        m.put("debut", de.toString());
        m.put("fin", a.toString());
        m.put("ventes", pendant.size());
        m.put("carte", AgregatsActivite.carte(pendant));
        return m;
    }

    @Override
    public Map<String, Object> fenetreGarde(String gardeId) {
        if (vide(gardeId)) {
            return null;
        }
        List<Object> p = new ArrayList<>();
        p.add(gardeId);
        List<Object[]> g = liste("SELECT g.libelle, g.date_debut, g.date_fin FROM garde g WHERE g.id = ?1", p);
        if (g.isEmpty() || g.get(0)[1] == null || g.get(0)[2] == null) {
            return null;
        }
        java.time.LocalDateTime de = heure(g.get(0)[1]), a = heure(g.get(0)[2]);
        if (!a.isAfter(de)) {
            return null;
        }
        Map<String, Object> m = new java.util.LinkedHashMap<>();
        m.put("libelle", String.valueOf(g.get(0)[0]));
        m.put("debut", de);
        m.put("fin", a);
        return m;
    }

    private List<AgregatsActivite.Bl> bls(LocalDate debut, LocalDate fin, String employeId) {
        return bls(debut.atStartOfDay(), fin.plusDays(1).atStartOfDay(), employeId);
    }

    private List<AgregatsActivite.Bl> bls(java.time.LocalDateTime de, java.time.LocalDateTime a, String employeId) {
        List<AgregatsActivite.Bl> l = new ArrayList<>();
        for (Object[] r : lire(SQL_BL, "b.lg_USER_ID", de, a, employeId)) {
            l.add(new AgregatsActivite.Bl(String.valueOf(r[0]), r[1] == null ? null : String.valueOf(r[1]),
                    r[2] == null ? null : heure(r[2]), heure(r[3]), r[4] == null ? null : heure(r[4]),
                    r[5] == null ? null : heure(r[5]).toLocalDate(), ((Number) r[6]).longValue()));
        }
        return l;
    }

    private Map<String, Long> parEmploye(String gabarit, LocalDate debut, LocalDate fin, String employeId) {
        return parEmploye(gabarit, debut.atStartOfDay(), fin.plusDays(1).atStartOfDay(), employeId);
    }

    private Map<String, Long> parEmploye(String gabarit, java.time.LocalDateTime de, java.time.LocalDateTime a,
            String employeId) {
        String colonne = gabarit == SQL_MODIFICATIONS ? "v.user_id"
                : gabarit == SQL_REMISES ? "p.lg_USER_CAISSIER_ID" : "p.lg_USER_ID";
        Map<String, Long> m = new HashMap<>();
        for (Object[] r : lire(gabarit, colonne, de, a, employeId)) {
            if (r[0] != null && r[1] != null) {
                m.put(String.valueOf(r[0]), ((Number) r[1]).longValue());
            }
        }
        return m;
    }

    /* ------------------------------------------------------------------ anomalies (retour du 24/10) */

    @Override
    public ActiviteAnomaliesDTO anomalies(ActiviteFiltreDTO f, String famille) {
        Map<String, String> noms = noms();
        Map<String, ActiviteAnomaliesDTO.Ligne> lignes = new LinkedHashMap<>();
        java.util.function.Function<String, ActiviteAnomaliesDTO.Ligne> ligne = id -> lignes.computeIfAbsent(id,
                k -> ActiviteAnomaliesDTO.Ligne.builder().id(k).nom(noms.getOrDefault(k, "?")).build());
        for (Object[] r : lire(
                "SELECT a.lg_USER_ID, a.famille, COUNT(*) FROM t_anomalie_employe a"
                        + " WHERE a.created_at >= ?1 AND a.created_at < ?2 %s GROUP BY a.lg_USER_ID, a.famille",
                "a.lg_USER_ID", f.getDebut(), f.getFin(), f.getEmployeId())) {
            long n = ((Number) r[2]).longValue();
            if (AnomalieRegles.LOGICIEL.equals(r[1])) {
                ligne.apply(String.valueOf(r[0])).setLogiciel(n);
            } else {
                ligne.apply(String.valueOf(r[0])).setRefus(n);
            }
        }
        parEmploye(SQL_ANNULATIONS, f.getDebut(), f.getFin(), f.getEmployeId())
                .forEach((id, n) -> ligne.apply(id).setAnnulations(n));
        parEmploye(SQL_MODIFICATIONS, f.getDebut(), f.getFin(), f.getEmployeId())
                .forEach((id, n) -> ligne.apply(id).setModifications(n));
        parEmploye(SQL_REMISES, f.getDebut(), f.getFin(), f.getEmployeId())
                .forEach((id, n) -> ligne.apply(id).setRemises(n));
        SeuilDuree seuil = seuil(f);
        for (ActiviteAnalysesDTO.Operateur o : AgregatsActivite
                .operateurs(ventes(f.getDebut(), f.getFin(), f.getEmployeId()), noms, seuil)) {
            ActiviteAnomaliesDTO.Ligne l = ligne.apply(o.getId());
            l.setVentes(o.getVentes());
            l.setVentesLongues(o.getVentesLongues());
        }
        List<ActiviteAnomaliesDTO.Ligne> liste = new ArrayList<>(lignes.values());
        liste.removeIf(l -> l.getRefus() + l.getLogiciel() + l.getAnnulations() + l.getModifications() + l.getRemises()
                + l.getVentesLongues() == 0);
        liste.forEach(l -> l.setPour100(l.getVentes() == 0 ? 0
                : Math.round((l.getRefus() + l.getAnnulations() + l.getModifications()) * 1000.0 / l.getVentes())
                        / 10.0));
        liste.sort((a, b) -> Long.compare(b.getRefus() + b.getAnnulations() + b.getModifications() + b.getLogiciel(),
                a.getRefus() + a.getAnnulations() + a.getModifications() + a.getLogiciel()));

        List<Object> pp = new ArrayList<>();
        pp.add(Timestamp.valueOf(f.getDebut().atStartOfDay()));
        pp.add(Timestamp.valueOf(f.getFin().plusDays(1).atStartOfDay()));
        StringBuilder sql = new StringBuilder(
                "SELECT a.id, a.created_at, a.lg_USER_ID, a.famille, a.code, a.message, a.ecran,"
                        + " a.poste FROM t_anomalie_employe a WHERE a.created_at >= ?1 AND a.created_at < ?2");
        if (!vide(f.getEmployeId())) {
            pp.add(f.getEmployeId());
            sql.append(" AND a.lg_USER_ID = ?").append(pp.size());
        }
        if (!vide(famille)) {
            pp.add(famille.trim().toUpperCase());
            sql.append(" AND a.famille = ?").append(pp.size());
        }
        sql.append(" ORDER BY a.id DESC LIMIT ").append(util.Constant.ANOMALIE_LISTE_MAX);
        List<ActiviteAnomaliesDTO.Element> elements = new ArrayList<>();
        for (Object[] r : liste(sql.toString(), pp)) {
            elements.add(element(r, noms, null));
        }
        return ActiviteAnomaliesDTO.builder().seuilLibelle(seuil.libelle()).seuilOperateur(seuil.getOperateur())
                .seuilMinutes(seuil.getMinutes()).employes(liste).anomalies(elements).build();
    }

    @Override
    public ActiviteAnomaliesDTO.Element anomalie(long id) {
        List<Object> pp = new ArrayList<>();
        pp.add(id);
        List<Object[]> r = liste(
                "SELECT a.id, a.created_at, a.lg_USER_ID, a.famille, a.code, a.message, a.ecran, a.poste,"
                        + " a.fil FROM t_anomalie_employe a WHERE a.id = ?1",
                pp);
        if (r.isEmpty()) {
            return null;
        }
        List<String> fil = new ArrayList<>();
        try {
            org.json.JSONArray a = new org.json.JSONArray(r.get(0)[8] == null ? "[]" : String.valueOf(r.get(0)[8]));
            for (int i = 0; i < a.length(); i++) {
                fil.add(a.optString(i));
            }
        } catch (org.json.JSONException e) {
            /* fil illisible : l'anomalie reste affichee sans fil */
        }
        return element(r.get(0), noms(), fil);
    }

    private static ActiviteAnomaliesDTO.Element element(Object[] r, Map<String, String> noms, List<String> fil) {
        String emp = String.valueOf(r[2]);
        return ActiviteAnomaliesDTO.Element.builder().id(((Number) r[0]).longValue())
                .date(r[1] == null ? "" : new SimpleDateFormat("dd/MM/yyyy HH:mm:ss").format((java.util.Date) r[1]))
                .employeId(emp).employe(noms.getOrDefault(emp, "?")).famille(String.valueOf(r[3]))
                .code(r[4] == null ? "" : String.valueOf(r[4])).message(r[5] == null ? "" : String.valueOf(r[5]))
                .ecran(r[6] == null ? "" : String.valueOf(r[6])).poste(r[7] == null ? "" : String.valueOf(r[7]))
                .fil(fil).build();
    }

    private Map<String, String> noms() {
        Map<String, String> m = new HashMap<>();
        employes().forEach(e -> m.put(e.getId(), e.getNom()));
        return m;
    }

    static long somme(Map<String, Long> m) {
        return m.values().stream().mapToLong(Long::longValue).sum();
    }

    static LocalDateTime heure(Object o) {
        if (o instanceof Timestamp) {
            return ((Timestamp) o).toLocalDateTime();
        }
        if (o instanceof java.sql.Date) {
            return ((java.sql.Date) o).toLocalDate().atStartOfDay();
        }
        if (o instanceof LocalDateTime) {
            return (LocalDateTime) o;
        }
        return new Timestamp(((java.util.Date) o).getTime()).toLocalDateTime();
    }

    @Override
    public List<ActiviteLigneDTO> export(ActiviteFiltreDTO f) {
        f.setStart(0);
        return page(f, EXPORT_MAX);
    }

    /** Lignes du journal, triees par date decroissante, a partir de f.start. */
    private List<ActiviteLigneDTO> page(ActiviteFiltreDTO f, int limite) {
        List<Object> pp = new ArrayList<>();
        String sqlPage = "SELECT a.d, a.t, a.u, TRIM(CONCAT(IFNULL(us.str_FIRST_NAME, ''), ' ', IFNULL(us.str_LAST_NAME, ''))),"
                + " a.r, a.m, a.x FROM (" + reunion(f, pp, false) + ") a LEFT JOIN t_user us ON us.lg_USER_ID = a.u"
                + recherche(f, pp) + " ORDER BY a.d DESC, a.t, a.r LIMIT " + limite + " OFFSET "
                + Math.max(0, f.getStart());
        SimpleDateFormat fmt = new SimpleDateFormat("dd/MM/yyyy HH:mm");
        List<ActiviteLigneDTO> lignes = new ArrayList<>();
        for (Object[] r : liste(sqlPage, pp)) {
            lignes.add(ActiviteLigneDTO.builder().date(r[0] == null ? "" : fmt.format((java.util.Date) r[0]))
                    .type(String.valueOf(r[1])).libelleType(LIBELLES.get(String.valueOf(r[1])))
                    .employeId(r[2] == null ? null : String.valueOf(r[2]))
                    .employe(r[3] == null ? "" : String.valueOf(r[3]))
                    .reference(r[4] == null ? "" : String.valueOf(r[4]))
                    .montant(r[5] == null ? null : ((Number) r[5]).longValue())
                    .detail(r[6] == null ? "" : String.valueOf(r[6])).build());
        }
        return lignes;
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> liste(String sql, List<Object> params) {
        Query q = em.createNativeQuery(sql);
        for (int i = 0; i < params.size(); i++) {
            q.setParameter(i + 1, params.get(i));
        }
        return q.getResultList();
    }

    static boolean vide(String s) {
        return s == null || s.trim().isEmpty() || "ALL".equalsIgnoreCase(s.trim());
    }

    /** Periode bornee : fin par defaut aujourd'hui, debut par defaut le 1er du mois, au plus maxJours. */
    public static LocalDate[] periode(LocalDate debut, LocalDate fin, int maxJours) {
        LocalDate f = fin == null ? LocalDate.now() : fin;
        LocalDate d = debut == null ? f.withDayOfMonth(1) : debut;
        if (d.isAfter(f)) {
            LocalDate x = d;
            d = f;
            f = x;
        }
        if (d.plusDays(maxJours).isBefore(f)) {
            d = f.minusDays(maxJours);
        }
        return new LocalDate[] { d, f };
    }
}
