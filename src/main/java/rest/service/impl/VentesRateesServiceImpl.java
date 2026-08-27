package rest.service.impl;

import commonTasks.dto.VenteRateeDTO;
import commonTasks.dto.VenteRateeFiltres;
import dal.MotifVenteRatee;
import dal.TFamille;
import dal.TUser;
import dal.VenteRatee;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import javax.ejb.Stateless;
import javax.ejb.TransactionAttribute;
import javax.ejb.TransactionAttributeType;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import javax.persistence.Query;
import javax.persistence.TypedQuery;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.VenteRateeRegles;
import rest.service.VentesRateesService;

/**
 * Registre des ventes ratees. Les demandes ne sont jamais fusionnees physiquement : chaque ligne garde son client, son
 * telephone, sa quantite, son motif, son commentaire, son heure et son utilisateur ; les vues regroupees sont calculees
 * a la lecture.
 */
@Stateless
public class VentesRateesServiceImpl implements VentesRateesService {

    private static final String FMT_DATE_HEURE = "dd/MM/yyyy HH:mm";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    @Override
    public List<MotifVenteRatee> motifs() {
        return em.createNamedQuery("MotifVenteRatee.findActifs", MotifVenteRatee.class).getResultList();
    }

    @Override
    public int compteurJour() {
        // Produits DISTINCTS non commandes du jour : un produit connu compte par son identifiant,
        // une saisie libre par sa designation normalisee (voir VenteRateeRegles.cleRegroupement).
        Object n = em
                .createNativeQuery("SELECT COUNT(DISTINCT COALESCE(CONCAT('p:', v.lg_FAMILLE_ID), "
                        + "CONCAT('l:', v.str_DESIGNATION_NORM))) FROM t_vente_ratee v "
                        + "WHERE v.str_STATUT = 'enable' AND v.bool_COMMANDE = 0 AND DATE(v.dt_CREATED) = CURDATE()")
                .getSingleResult();
        return n == null ? 0 : ((Number) n).intValue();
    }

    @Override
    public List<VenteRateeDTO> lignesDuJour() {
        TypedQuery<VenteRatee> q = em.createQuery("SELECT v FROM VenteRatee v WHERE v.strSTATUT = 'enable' "
                + "AND v.dtCREATED >= ?1 ORDER BY v.dtCREATED DESC", VenteRatee.class);
        q.setParameter(1, debutDuJour());
        return versDTO(q.getResultList());
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public VenteRatee ajouter(VenteRateeDTO demande, TUser auteur) {
        VenteRatee v = new VenteRatee(UUID.randomUUID().toString());
        v.setDtCREATED(new Date());
        v.setLgUSERID(auteur != null ? auteur.getLgUSERID() : null);
        appliquer(v, demande);
        if (StringUtils.isBlank(v.getStrDESIGNATION())) {
            throw new IllegalArgumentException("La designation du produit demande est obligatoire");
        }
        if (StringUtils.isBlank(v.getLgMOTIFID())) {
            throw new IllegalArgumentException("Le motif de la vente ratée est obligatoire");
        }
        em.persist(v);
        return v;
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public VenteRatee modifier(String id, VenteRateeDTO demande, TUser auteur) {
        VenteRatee v = existante(id);
        appliquer(v, demande);
        if (StringUtils.isBlank(v.getLgMOTIFID())) {
            throw new IllegalArgumentException("Le motif de la vente ratée est obligatoire");
        }
        v.setDtUPDATED(new Date());
        return em.merge(v);
    }

    /** Reporte les champs saisis sur la ligne ; copie le CIP et la designation officiels si le produit est connu. */
    private void appliquer(VenteRatee v, VenteRateeDTO d) {
        if (StringUtils.isNotBlank(d.getFamilleId())) {
            TFamille produit = em.find(TFamille.class, d.getFamilleId().trim());
            if (produit != null) {
                v.setLgFAMILLEID(produit.getLgFAMILLEID());
                v.setStrCIP(produit.getIntCIP());
                v.setStrDESIGNATION(produit.getStrNAME());
            }
        } else if (v.getLgFAMILLEID() == null) {
            // saisie libre : le texte et le CIP eventuel sont conserves tels quels
            v.setStrCIP(StringUtils.trimToNull(d.getCip()));
            v.setStrDESIGNATION(StringUtils.trimToEmpty(d.getDesignation()));
        }
        v.setStrDESIGNATIONNORM(VenteRateeRegles.normaliser(v.getStrDESIGNATION()));
        v.setIntQUANTITE(Math.max(1, d.getQuantite()));
        v.setLgCLIENTID(StringUtils.trimToNull(d.getClientId()));
        v.setStrNOMCLIENT(StringUtils.trimToNull(d.getNomClient()));
        v.setStrTELEPHONE(StringUtils.trimToNull(d.getTelephone()));
        if (StringUtils.isNotBlank(d.getMotifId())) {
            MotifVenteRatee motif = em.find(MotifVenteRatee.class, d.getMotifId().trim());
            if (motif != null) {
                v.setLgMOTIFID(motif.getLgMOTIFID());
                v.setStrMOTIF(motif.getStrLIBELLE());
            }
        }
        v.setStrCOMMENTAIRE(StringUtils.trimToNull(d.getCommentaire()));
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public void supprimer(String id, TUser auteur) {
        VenteRatee v = existante(id);
        v.setStrSTATUT("delete");
        v.setDtUPDATED(new Date());
        em.merge(v);
    }

    @Override
    public int[] groupeActif(String id) {
        VenteRatee v = existante(id);
        List<VenteRatee> groupe = demandesActivesDuMemeProduit(v);
        int quantite = 0;
        for (VenteRatee ligne : groupe) {
            quantite += ligne.getIntQUANTITE();
        }
        return new int[] { groupe.size(), quantite };
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public int commander(String id, boolean toutes, TUser auteur) {
        VenteRatee v = existante(id);
        List<VenteRatee> aMarquer = toutes ? demandesActivesDuMemeProduit(v) : List.of(v);
        Date maintenant = new Date();
        int marquees = 0;
        for (VenteRatee ligne : aMarquer) {
            if (ligne.isBoolCOMMANDE()) {
                continue;
            }
            ligne.setBoolCOMMANDE(true);
            ligne.setDtCOMMANDE(maintenant);
            ligne.setLgUSERCOMMANDEID(auteur != null ? auteur.getLgUSERID() : null);
            ligne.setDtUPDATED(maintenant);
            em.merge(ligne);
            marquees++;
        }
        return marquees;
    }

    /** Demandes actives (enable, non commandees) du meme produit que la demande donnee, celle-ci comprise. */
    private List<VenteRatee> demandesActivesDuMemeProduit(VenteRatee v) {
        TypedQuery<VenteRatee> q;
        if (StringUtils.isNotBlank(v.getLgFAMILLEID())) {
            q = em.createQuery("SELECT o FROM VenteRatee o WHERE o.strSTATUT = 'enable' AND o.boolCOMMANDE = FALSE "
                    + "AND o.lgFAMILLEID = ?1", VenteRatee.class).setParameter(1, v.getLgFAMILLEID());
        } else {
            q = em.createQuery("SELECT o FROM VenteRatee o WHERE o.strSTATUT = 'enable' AND o.boolCOMMANDE = FALSE "
                    + "AND o.lgFAMILLEID IS NULL AND o.strDESIGNATIONNORM = ?1", VenteRatee.class)
                    .setParameter(1, v.getStrDESIGNATIONNORM());
        }
        List<VenteRatee> groupe = q.getResultList();
        if (v.isBoolCOMMANDE() && !groupe.contains(v)) {
            groupe.add(v);
        }
        return groupe;
    }

    @Override
    @TransactionAttribute(TransactionAttributeType.REQUIRED)
    public VenteRatee rattacher(String id, String familleId, TUser auteur) {
        VenteRatee v = existante(id);
        TFamille produit = em.find(TFamille.class, StringUtils.trimToEmpty(familleId));
        if (produit == null) {
            throw new IllegalArgumentException("Produit introuvable : " + familleId);
        }
        // Le libelle initialement saisi est conserve (strDESIGNATION intacte) : seul le lien
        // change, pour que la demande participe aux analyses du produit.
        v.setLgFAMILLEID(produit.getLgFAMILLEID());
        if (StringUtils.isBlank(v.getStrCIP())) {
            v.setStrCIP(produit.getIntCIP());
        }
        v.setDtRATTACHEMENT(new Date());
        v.setLgUSERRATTACHEID(auteur != null ? auteur.getLgUSERID() : null);
        v.setDtUPDATED(new Date());
        return em.merge(v);
    }

    private VenteRatee existante(String id) {
        VenteRatee v = em.find(VenteRatee.class, StringUtils.trimToEmpty(id));
        if (v == null || "delete".equals(v.getStrSTATUT())) {
            throw new IllegalArgumentException("Demande introuvable : " + id);
        }
        return v;
    }

    @Override
    public List<VenteRateeDTO> recherche(VenteRateeFiltres f) {
        StringBuilder jpql = new StringBuilder("SELECT v FROM VenteRatee v WHERE v.strSTATUT = 'enable'");
        Map<Integer, Object> params = new LinkedHashMap<>();
        construireFiltres(f, jpql, params);
        jpql.append(" ORDER BY v.dtCREATED DESC");
        TypedQuery<VenteRatee> q = em.createQuery(jpql.toString(), VenteRatee.class).setMaxResults(5000);
        params.forEach(q::setParameter);
        return versDTO(q.getResultList());
    }

    private void construireFiltres(VenteRateeFiltres f, StringBuilder jpql, Map<Integer, Object> params) {
        int i = 1;
        if (StringUtils.isNotBlank(f.getDtStart())) {
            jpql.append(" AND v.dtCREATED >= ?").append(i);
            params.put(i++, java.sql.Timestamp.valueOf(f.getDtStart().trim() + " 00:00:00"));
        }
        if (StringUtils.isNotBlank(f.getDtEnd())) {
            jpql.append(" AND v.dtCREATED <= ?").append(i);
            params.put(i++, java.sql.Timestamp.valueOf(f.getDtEnd().trim() + " 23:59:59"));
        }
        if (StringUtils.isNotBlank(f.getUserId())) {
            jpql.append(" AND v.lgUSERID = ?").append(i);
            params.put(i++, f.getUserId().trim());
        }
        if (StringUtils.isNotBlank(f.getProduit())) {
            jpql.append(" AND (LOWER(v.strDESIGNATION) LIKE ?").append(i).append(" OR v.strCIP LIKE ?").append(i)
                    .append(")");
            params.put(i++, "%" + f.getProduit().trim().toLowerCase() + "%");
        }
        if (StringUtils.isNotBlank(f.getClient())) {
            jpql.append(" AND (LOWER(v.strNOMCLIENT) LIKE ?").append(i).append(" OR v.strTELEPHONE LIKE ?").append(i)
                    .append(")");
            params.put(i++, "%" + f.getClient().trim().toLowerCase() + "%");
        }
        if (StringUtils.isNotBlank(f.getMotifId())) {
            jpql.append(" AND v.lgMOTIFID = ?").append(i);
            params.put(i++, f.getMotifId().trim());
        }
        if ("connu".equals(f.getConnu())) {
            jpql.append(" AND v.lgFAMILLEID IS NOT NULL");
        } else if ("inconnu".equals(f.getConnu())) {
            jpql.append(" AND v.lgFAMILLEID IS NULL");
        }
        if ("oui".equals(f.getCommande())) {
            jpql.append(" AND v.boolCOMMANDE = TRUE");
        } else if ("non".equals(f.getCommande())) {
            jpql.append(" AND v.boolCOMMANDE = FALSE");
        }
        if ("rattache".equals(f.getRattache())) {
            jpql.append(" AND v.dtRATTACHEMENT IS NOT NULL");
        } else if ("arattacher".equals(f.getRattache())) {
            jpql.append(" AND v.lgFAMILLEID IS NULL");
        }
    }

    @Override
    public List<Object[]> rechercherProduits(String q) {
        String texte = StringUtils.trimToEmpty(q);
        if (texte.length() < 2) {
            return List.of();
        }
        String motif = "%" + texte + "%";
        @SuppressWarnings("unchecked")
        List<Object[]> lignes = em.createNativeQuery("SELECT f.lg_FAMILLE_ID AS id, f.int_CIP AS cip, "
                + "f.str_NAME AS designation, COALESCE(fs.int_NUMBER_AVAILABLE, 0) AS stock "
                + "FROM t_famille f LEFT JOIN t_famille_stock fs ON fs.lg_FAMILLE_ID = f.lg_FAMILLE_ID "
                + "WHERE f.str_STATUT = 'enable' AND (f.int_CIP LIKE ?1 OR f.str_NAME LIKE ?1 OR f.int_EAN13 LIKE ?1) "
                + "ORDER BY f.str_NAME LIMIT 20").setParameter(1, motif).getResultList();
        return lignes;
    }

    @Override
    public JSONObject analyse(VenteRateeFiltres f) {
        List<VenteRateeDTO> lignes = recherche(f);

        int nbDemandes = lignes.size();
        int quantiteTotale = 0;
        int commandees = 0;
        int inconnues = 0;
        java.util.Set<String> produits = new java.util.HashSet<>();
        java.util.Set<String> clients = new java.util.HashSet<>();
        Map<String, int[]> parProduit = new LinkedHashMap<>(); // cle -> [demandes, quantite, nonCommandees]
        Map<String, String> libelleProduit = new LinkedHashMap<>();
        Map<String, int[]> parMotif = new LinkedHashMap<>();
        Map<String, int[]> parJour = new java.util.TreeMap<>();
        Map<String, int[]> parUtilisateur = new LinkedHashMap<>();
        Map<String, int[]> libresFrequents = new LinkedHashMap<>();

        for (VenteRateeDTO l : lignes) {
            quantiteTotale += l.getQuantite();
            if (l.isCommande()) {
                commandees++;
            }
            if (!l.isConnu()) {
                inconnues++;
            }
            String cle = VenteRateeRegles.cleRegroupement(l.getFamilleId(),
                    VenteRateeRegles.normaliser(l.getDesignation()));
            produits.add(cle);
            if (StringUtils.isNotBlank(l.getNomClient())) {
                clients.add(l.getNomClient().trim().toLowerCase());
            } else if (StringUtils.isNotBlank(l.getTelephone())) {
                clients.add(l.getTelephone().trim());
            }
            libelleProduit.putIfAbsent(cle, l.getDesignation());
            int[] p = parProduit.computeIfAbsent(cle, k -> new int[3]);
            p[0]++;
            p[1] += l.getQuantite();
            if (!l.isCommande()) {
                p[2]++;
            }
            if (!l.isConnu()) {
                int[] libre = libresFrequents.computeIfAbsent(cle, k -> new int[2]);
                libre[0]++;
                libre[1] += l.getQuantite();
            }
            String motif = StringUtils.defaultIfBlank(l.getMotif(), "(sans motif)");
            int[] m = parMotif.computeIfAbsent(motif, k -> new int[2]);
            m[0]++;
            m[1] += l.getQuantite();
            String jour = l.getDate().length() >= 10 ? l.getDate().substring(0, 10) : l.getDate();
            int[] j = parJour.computeIfAbsent(jour, k -> new int[2]);
            j[0]++;
            j[1] += l.getQuantite();
            String utilisateur = StringUtils.defaultIfBlank(l.getUtilisateur(), "(inconnu)");
            int[] u = parUtilisateur.computeIfAbsent(utilisateur, k -> new int[2]);
            u[0]++;
            u[1] += l.getQuantite();
        }

        JSONObject indicateurs = new JSONObject().put("nbDemandes", nbDemandes).put("quantiteTotale", quantiteTotale)
                .put("produitsDistincts", produits.size()).put("clientsDistincts", clients.size())
                .put("commandees", commandees).put("nonCommandees", nbDemandes - commandees)
                .put("proportionCommandees", nbDemandes == 0 ? 0 : Math.round(commandees * 100.0 / nbDemandes))
                .put("inconnues", inconnues);

        return new JSONObject().put("success", true).put("indicateurs", indicateurs)
                .put("plusDemandes", classement(parProduit, libelleProduit, 0, 10))
                .put("plusGrossesQuantites", classement(parProduit, libelleProduit, 1, 10))
                .put("plusNonCommandes", classement(parProduit, libelleProduit, 2, 10))
                .put("libresFrequents", classement(libresFrequents, libelleProduit, 0, 10))
                .put("parMotif", serie(parMotif)).put("parJour", serie(parJour))
                .put("parUtilisateur", serie(parUtilisateur));
    }

    /** Classement decroissant selon la colonne demandee de la table [demandes, quantite, ...]. */
    private JSONArray classement(Map<String, int[]> table, Map<String, String> libelles, int colonne, int limite) {
        JSONArray resultat = new JSONArray();
        table.entrySet().stream().sorted((a, b) -> Integer.compare(b.getValue()[colonne], a.getValue()[colonne]))
                .filter(e -> e.getValue()[colonne] > 0).limit(limite).forEach(
                        e -> resultat.put(new JSONObject().put("libelle", libelles.getOrDefault(e.getKey(), e.getKey()))
                                .put("demandes", e.getValue()[0]).put("quantite", e.getValue()[1])
                                .put("nonCommandees", e.getValue().length > 2 ? e.getValue()[2] : 0)));
        return resultat;
    }

    private JSONArray serie(Map<String, int[]> table) {
        JSONArray resultat = new JSONArray();
        table.forEach((cle, valeurs) -> resultat
                .put(new JSONObject().put("libelle", cle).put("demandes", valeurs[0]).put("quantite", valeurs[1])));
        return resultat;
    }

    @Override
    public List<Object[]> utilisateurs() {
        @SuppressWarnings("unchecked")
        List<Object[]> lignes = em
                .createNativeQuery("SELECT DISTINCT u.lg_USER_ID AS id, "
                        + "CONCAT(u.str_FIRST_NAME, ' ', u.str_LAST_NAME) AS nom FROM t_vente_ratee v "
                        + "JOIN t_user u ON u.lg_USER_ID = v.lg_USER_ID WHERE v.str_STATUT = 'enable' ORDER BY nom")
                .getResultList();
        return lignes;
    }

    private Date debutDuJour() {
        java.util.Calendar c = java.util.Calendar.getInstance();
        c.set(java.util.Calendar.HOUR_OF_DAY, 0);
        c.set(java.util.Calendar.MINUTE, 0);
        c.set(java.util.Calendar.SECOND, 0);
        c.set(java.util.Calendar.MILLISECOND, 0);
        return c.getTime();
    }

    private List<VenteRateeDTO> versDTO(List<VenteRatee> lignes) {
        SimpleDateFormat format = new SimpleDateFormat(FMT_DATE_HEURE);
        Map<String, String> nomsUtilisateurs = new LinkedHashMap<>();
        Map<String, String> nomsProduits = new LinkedHashMap<>();
        List<VenteRateeDTO> resultat = new ArrayList<>(lignes.size());
        for (VenteRatee v : lignes) {
            VenteRateeDTO dto = new VenteRateeDTO().setId(v.getLgVENTERATEEID()).setFamilleId(v.getLgFAMILLEID())
                    .setCip(StringUtils.defaultString(v.getStrCIP()))
                    .setDesignation(StringUtils.defaultString(v.getStrDESIGNATION())).setQuantite(v.getIntQUANTITE())
                    .setClientId(v.getLgCLIENTID()).setNomClient(StringUtils.defaultString(v.getStrNOMCLIENT()))
                    .setTelephone(StringUtils.defaultString(v.getStrTELEPHONE())).setMotifId(v.getLgMOTIFID())
                    .setMotif(StringUtils.defaultString(v.getStrMOTIF()))
                    .setCommentaire(StringUtils.defaultString(v.getStrCOMMENTAIRE())).setCommande(v.isBoolCOMMANDE())
                    .setConnu(StringUtils.isNotBlank(v.getLgFAMILLEID())).setRattache(v.getDtRATTACHEMENT() != null)
                    .setDate(v.getDtCREATED() != null ? format.format(v.getDtCREATED()) : "")
                    .setUtilisateur(nomUtilisateur(v.getLgUSERID(), nomsUtilisateurs));
            if (v.isBoolCOMMANDE()) {
                dto.setDateCommande(v.getDtCOMMANDE() != null ? format.format(v.getDtCOMMANDE()) : "")
                        .setUtilisateurCommande(nomUtilisateur(v.getLgUSERCOMMANDEID(), nomsUtilisateurs));
            }
            if (v.getDtRATTACHEMENT() != null && StringUtils.isNotBlank(v.getLgFAMILLEID())) {
                dto.setProduitRattache(nomProduit(v.getLgFAMILLEID(), nomsProduits));
            }
            resultat.add(dto);
        }
        return resultat;
    }

    private String nomUtilisateur(String userId, Map<String, String> memo) {
        if (StringUtils.isBlank(userId)) {
            return "";
        }
        return memo.computeIfAbsent(userId, id -> {
            TUser u = em.find(TUser.class, id);
            return u == null ? "" : StringUtils.trimToEmpty(u.getStrFIRSTNAME() + " " + u.getStrLASTNAME());
        });
    }

    private String nomProduit(String familleId, Map<String, String> memo) {
        return memo.computeIfAbsent(familleId, id -> {
            TFamille p = em.find(TFamille.class, id);
            return p == null ? "" : StringUtils.defaultString(p.getStrNAME());
        });
    }
}
