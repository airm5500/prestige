package rest.service.paiements;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import commonTasks.dto.ClotureVenteParams;
import commonTasks.dto.SalesParams;
import dal.TPreenregistrement;
import dal.TUser;
import java.io.IOException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.function.Function;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.EJB;
import javax.ejb.Schedule;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.SalesService;
import rest.service.SessionHelperService;
import util.paiements.ConfigPaiements;
import util.paiements.FournisseurPaiement;
import util.paiements.FournisseurPaiement.Etat;
import util.paiements.HttpPaiements;
import util.paiements.Operateur;
import util.paiements.SimulateurPaiement;
import util.paiements.StatutPaiement;
import util.paiements.TransitionsPaiement;

/**
 * B3 (Prestige Mobile) : paiements mobile money par agrégateur (table {@code paiement_mobile}).
 * <ul>
 * <li>création : montant FIXÉ ICI à partir du net de la vente (jamais celui envoyé par le téléphone ; une part
 * inférieure au net est acceptée pour un paiement en deux modes, sans clôture automatique), idempotente par
 * {@code X-Client-Ref} ;</li>
 * <li>confirmation (notification signée, puis statut relu chez le fournisseur ; ou interrogation du statut) : contrôle
 * montant / devise, transitions de {@link TransitionsPaiement}, puis clôture de la vente comptant avec le mode de
 * l'opérateur par le service de clôture existant (qui refuse une double clôture) ;</li>
 * <li>paiement reçu après annulation / expiration, ou second paiement d'une même vente : « à régulariser », jamais de
 * clôture ;</li>
 * <li>expiration automatique (minute par minute) des paiements en attente, après une dernière vérification.</li>
 * </ul>
 * Les secrets du fournisseur ne sont jamais renvoyés ni journalisés.
 */
@Stateless
public class PaiementsMobileService {

    private static final Logger LOG = Logger.getLogger(PaiementsMobileService.class.getName());
    static final String DEVISE = "XOF";
    private static final String COLONNES = "id, client_ref, vente_id, reference_vente, montant, devise, operateur, type_reglement, "
            + "fournisseur, statut, ref_fournisseur, lien, cloture_auto, cloture, message, user_id, created_at, updated_at, expire_at, "
            + "paye_at, verifie_at";

    private static volatile ConfigPaiements config;
    private static volatile FournisseurPaiement fournisseur;
    private static volatile boolean tablePresente;

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;
    @EJB
    private SalesService salesService;
    @EJB
    private SessionHelperService sessionHelperService;

    // -------------------------------------------------------------------------
    // Configuration
    // -------------------------------------------------------------------------

    static synchronized FournisseurPaiement fournisseur() {
        if (config == null) {
            config = ConfigPaiements.systeme();
            fournisseur = config.creerFournisseur(HttpPaiements.java());
            LOG.info("Paiements mobile money : " + config + (fournisseur == null ? " (désactivés)" : " (actifs)"));
        }
        return fournisseur;
    }

    /** Fournisseur pour les tests / la relecture de la configuration. */
    static synchronized void configurer(ConfigPaiements c, FournisseurPaiement f) {
        config = c;
        fournisseur = f;
    }

    public boolean disponible() {
        if (fournisseur() == null) {
            return false;
        }
        if (!tablePresente) {
            try {
                Number n = (Number) em
                        .createNativeQuery("SELECT COUNT(*) FROM information_schema.tables "
                                + "WHERE table_schema = DATABASE() AND table_name = 'paiement_mobile'")
                        .getSingleResult();
                tablePresente = n != null && n.intValue() > 0;
            } catch (RuntimeException e) {
                tablePresente = false;
            }
        }
        return tablePresente;
    }

    /** Capacité annoncée au téléphone (aucun secret). */
    public JSONObject capacites() {
        JSONArray ops = new JSONArray();
        boolean ok = disponible();
        if (ok) {
            for (Operateur o : fournisseur.operateurs()) {
                ops.put(o.code());
            }
        }
        return new JSONObject().put("success", true).put("paiementsMobile", ops)
                .put("paiementsMobileVersion", ok ? 1 : 0).put("fournisseur", ok ? fournisseur.code() : JSONObject.NULL)
                .put("expirationMin", config == null ? 10 : config.expirationMin).put("typesReglement",
                        new JSONObject().put("orange", "7").put("moov", "8").put("mtn", "9").put("wave", "10"));
    }

    private static JSONObject echec(String m) {
        return new JSONObject().put("success", false).put("message", m);
    }

    // -------------------------------------------------------------------------
    // Lecture / écriture de la table
    // -------------------------------------------------------------------------

    private Object[] lire(String id, boolean verrou) {
        @SuppressWarnings("unchecked")
        List<Object[]> l = em
                .createNativeQuery(
                        "SELECT " + COLONNES + " FROM paiement_mobile WHERE id = ?1" + (verrou ? " FOR UPDATE" : ""))
                .setParameter(1, id).getResultList();
        return l.isEmpty() ? null : l.get(0);
    }

    private Object[] parClientRef(String ref) {
        @SuppressWarnings("unchecked")
        List<Object[]> l = em.createNativeQuery("SELECT " + COLONNES + " FROM paiement_mobile WHERE client_ref = ?1")
                .setParameter(1, ref).getResultList();
        return l.isEmpty() ? null : l.get(0);
    }

    static JSONObject versJson(Object[] r) {
        StatutPaiement s = StatutPaiement.de(String.valueOf(r[9]));
        return new JSONObject().put("id", r[0]).put("venteId", r[2]).put("reference", r[3] == null ? "" : r[3])
                .put("montant", ((Number) r[4]).intValue()).put("devise", r[5]).put("operateur", r[6])
                .put("typeReglement", r[7]).put("fournisseur", r[8]).put("statut", s.code)
                .put("lien", r[11] == null ? "" : r[11]).put("clotureAuto", vrai(r[12])).put("cloture", vrai(r[13]))
                .put("message", r[14] == null ? "" : r[14]).put("creeLe", str(r[16])).put("expireLe", str(r[18]))
                .put("payeLe", str(r[19])).put("aRegulariser", s == StatutPaiement.PAYE_APRES_ANNULATION);
    }

    private static boolean vrai(Object o) {
        return o instanceof Boolean ? (Boolean) o : o instanceof Number && ((Number) o).intValue() != 0;
    }

    private static String str(Object o) {
        return o == null ? "" : o.toString();
    }

    private void maj(String id, StatutPaiement s, String message, boolean paye) {
        em.createNativeQuery(
                "UPDATE paiement_mobile SET statut = ?1, message = ?2, updated_at = NOW(), verifie_at = NOW()"
                        + (paye ? ", paye_at = COALESCE(paye_at, NOW())" : "") + " WHERE id = ?3")
                .setParameter(1, s.code).setParameter(2, message == null ? null : tronque(message, 250))
                .setParameter(3, id).executeUpdate();
    }

    private static String tronque(String s, int n) {
        return s.length() > n ? s.substring(0, n) : s;
    }

    // -------------------------------------------------------------------------
    // Création
    // -------------------------------------------------------------------------

    /**
     * Crée le paiement d'une vente. {@code part} : montant d'un paiement en deux modes (inférieur au net), null = tout
     * le net. {@code cloturer} : clôture automatique de la vente comptant à la confirmation (ignorée pour une part ou
     * une vente non comptant : c'est alors le comptoir qui clôture).
     */
    public JSONObject creer(TUser user, String venteId, String operateurCode, Integer part, boolean cloturer,
            String clientRef) {
        if (!disponible()) {
            return echec("Paiement mobile money non configuré sur ce serveur.");
        }
        if (user == null) {
            return echec("Session expirée : reconnectez-vous.");
        }
        Operateur op = Operateur.de(operateurCode);
        if (op == null || !fournisseur.operateurs().contains(op)) {
            return echec("Opérateur non proposé : " + operateurCode);
        }
        String ref = clientRef == null || clientRef.isBlank() ? null : tronque(clientRef.trim(), 64);
        if (ref != null) {
            Object[] deja = parClientRef(ref);
            if (deja != null) {
                return new JSONObject().put("success", true).put("data", versJson(deja)).put("deja", true);
            }
        }
        TPreenregistrement tp = venteId == null ? null : em.find(TPreenregistrement.class, venteId);
        if (tp == null) {
            return echec("Vente introuvable.");
        }
        if ("is_Closed".equals(tp.getStrSTATUT())) {
            return echec("Vente déjà clôturée.");
        }
        boolean comptant = tp.getLgTYPEVENTEID() != null && "1".equals(tp.getLgTYPEVENTEID().getLgTYPEVENTEID());
        int net;
        try {
            if (comptant) {
                JSONObject n = salesService.shownetpayVno(tp);
                JSONObject d = n.optJSONObject("data");
                net = d == null ? -1 : d.optInt("montantNet", -1);
            } else {
                net = tp.getIntCUSTPART() == null ? -1 : tp.getIntCUSTPART();
            }
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "Paiements mobile : net de la vente illisible", e);
            net = -1;
        }
        if (net <= 0) {
            return echec("Net à payer de la vente non calculable : vérifiez la vente.");
        }
        int montant = net;
        boolean auto = cloturer && comptant;
        if (part != null) {
            if (part <= 0 || part > net) {
                return echec("Montant du paiement invalide (1 à " + net + ").");
            }
            montant = part;
            auto = auto && part == net;
        }
        String id = UUID.randomUUID().toString();
        LocalDateTime exp = LocalDateTime.now().plusMinutes(config.expirationMin);
        em.createNativeQuery(
                "INSERT INTO paiement_mobile (id, client_ref, vente_id, reference_vente, montant, devise, operateur, "
                        + "type_reglement, fournisseur, statut, cloture_auto, cloture, user_id, created_at, updated_at, expire_at) "
                        + "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, 0, ?12, NOW(), NOW(), ?13)")
                .setParameter(1, id).setParameter(2, ref).setParameter(3, venteId).setParameter(4, tp.getStrREF())
                .setParameter(5, montant).setParameter(6, DEVISE).setParameter(7, op.code())
                .setParameter(8, op.typeReglement).setParameter(9, fournisseur.code())
                .setParameter(10, StatutPaiement.EN_ATTENTE.code).setParameter(11, auto ? 1 : 0)
                .setParameter(12, user.getLgUSERID()).setParameter(13, Timestamp.valueOf(exp)).executeUpdate();
        String base = config.urlPublique;
        FournisseurPaiement.Demande d = new FournisseurPaiement.Demande(id, montant, DEVISE, op,
                "Pharmacie - vente " + (tp.getStrREF() == null ? "" : tp.getStrREF()),
                base + "/paiements-mobile/notification/" + fournisseur.code(), base + "/paiements-mobile/retour");
        try {
            FournisseurPaiement.Creation c = fournisseur.creer(d);
            em.createNativeQuery(
                    "UPDATE paiement_mobile SET ref_fournisseur = ?1, lien = ?2, updated_at = NOW() WHERE id = ?3")
                    .setParameter(1, tronque(c.refFournisseur, 100)).setParameter(2, c.lien).setParameter(3, id)
                    .executeUpdate();
        } catch (IOException | RuntimeException e) {
            LOG.log(Level.WARNING, "Paiements mobile : création refusée par le fournisseur ({0})", e.getMessage());
            maj(id, StatutPaiement.ECHOUE, "Création refusée par le fournisseur", false);
            return echec("Le service de paiement n'a pas créé la transaction. Réessayez ou payez autrement.");
        }
        return new JSONObject().put("success", true).put("data", versJson(lire(id, false)));
    }

    // -------------------------------------------------------------------------
    // Confirmation
    // -------------------------------------------------------------------------

    /**
     * Statut relu chez le fournisseur et appliqué (ligne verrouillée : notifications simultanées sans effet double).
     */
    private Object[] confirmer(String id) {
        Object[] r = lire(id, true);
        if (r == null) {
            return null;
        }
        StatutPaiement avant = StatutPaiement.de(String.valueOf(r[9]));
        Etat e;
        try {
            e = fournisseur().verifier(id, r[10] == null ? null : r[10].toString());
        } catch (IOException | RuntimeException ex) {
            LOG.log(Level.INFO, "Paiements mobile : vérification impossible ({0})", ex.getMessage());
            return r;
        }
        TransitionsPaiement.Decision dec = TransitionsPaiement.appliquer(avant, ((Number) r[4]).intValue(),
                String.valueOf(r[5]), e);
        StatutPaiement apres = dec.statut;
        // Un second paiement reçu pour une vente déjà payée : jamais deux encaissements.
        if (apres == StatutPaiement.PAYE && avant != StatutPaiement.PAYE && dejaPayee(String.valueOf(r[2]), id)) {
            apres = StatutPaiement.PAYE_APRES_ANNULATION;
        }
        if (apres != avant || dec.anomalie != null) {
            maj(id, apres, dec.anomalie, apres.argentRecu());
            if (dec.anomalie != null) {
                LOG.warning("Paiements mobile : " + dec.anomalie + " (paiement " + id + ")");
            }
        } else {
            em.createNativeQuery("UPDATE paiement_mobile SET verifie_at = NOW() WHERE id = ?1").setParameter(1, id)
                    .executeUpdate();
        }
        r = lire(id, false);
        if (StatutPaiement.de(String.valueOf(r[9])) == StatutPaiement.PAYE && vrai(r[12]) && !vrai(r[13])) {
            cloturer(r);
            r = lire(id, false);
        }
        return r;
    }

    private boolean dejaPayee(String venteId, String autre) {
        Number n = (Number) em
                .createNativeQuery(
                        "SELECT COUNT(*) FROM paiement_mobile WHERE vente_id = ?1 AND id <> ?2 AND statut = 'paye'")
                .setParameter(1, venteId).setParameter(2, autre).getSingleResult();
        return n != null && n.intValue() > 0;
    }

    /**
     * Clôture de la vente comptant avec le mode de l'opérateur, par le service existant, au nom du créateur du
     * paiement.
     */
    private void cloturer(Object[] r) {
        String id = String.valueOf(r[0]);
        String venteId = String.valueOf(r[2]);
        TUser u = em.find(TUser.class, String.valueOf(r[15]));
        TUser avant = sessionHelperService.getCurrentUser();
        String message;
        boolean ok;
        try {
            sessionHelperService.setCurrentUser(u);
            TPreenregistrement tp = em.find(TPreenregistrement.class, venteId);
            JSONObject net = tp == null ? null : salesService.shownetpayVno(tp).optJSONObject("data");
            int montant = ((Number) r[4]).intValue();
            if (net == null || net.optInt("montantNet", -1) != montant) {
                ok = false;
                message = "Net de la vente modifié depuis la demande de paiement : clôture à faire au comptoir";
            } else {
                Operateur op = Operateur.de(String.valueOf(r[6]));
                JSONObject b = new JSONObject().put("banque", "").put("clientId", op.code())
                        .put("commentaire", "Mobile money " + id).put("data", net).put("devis", false).put("lieux", "")
                        .put("marge", net.optInt("marge", 0)).put("montantPaye", montant).put("montantRecu", montant)
                        .put("montantRemis", 0).put("natureVenteId", "1").put("nom", "").put("partTP", 0)
                        .put("reglements",
                                new JSONArray().put(new JSONObject().put("montant", montant)
                                        .put("montantAttentu", montant).put("typeReglement", op.typeReglement)))
                        .put("totalRecap", montant).put("typeRegleId", op.typeReglement).put("typeVenteId", "1")
                        .put("userVendeurId", u == null ? JSONObject.NULL : u.getLgUSERID()).put("venteId", venteId);
                ClotureVenteParams p = new ObjectMapper()
                        .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
                        .readValue(b.toString(), ClotureVenteParams.class);
                JSONObject res = salesService.updateVenteClotureComptant(p);
                ok = res.optBoolean("success", false);
                message = ok ? null : "Clôture refusée : " + res.optString("msg", res.optString("message", ""));
                if (!ok && "is_Closed".equals(tp.getStrSTATUT())) {
                    ok = true; // déjà clôturée (le service refuse une double clôture)
                    message = null;
                }
            }
        } catch (Exception e) {
            ok = false;
            message = "Clôture impossible : " + e.getMessage();
        } finally {
            sessionHelperService.setCurrentUser(avant);
        }
        em.createNativeQuery("UPDATE paiement_mobile SET cloture = ?1, message = ?2, updated_at = NOW() WHERE id = ?3")
                .setParameter(1, ok ? 1 : 0).setParameter(2, message == null ? null : tronque(message, 250))
                .setParameter(3, id).executeUpdate();
    }

    /** Statut (le téléphone interroge toutes les 3 s) : revérifié chez le fournisseur au plus toutes les 3 s. */
    public JSONObject statut(String id) {
        if (!disponible()) {
            return echec("Paiement mobile money non configuré sur ce serveur.");
        }
        Object[] r = lire(id, false);
        if (r == null) {
            return echec("Paiement introuvable.");
        }
        StatutPaiement s = StatutPaiement.de(String.valueOf(r[9]));
        boolean aVerifier = s == StatutPaiement.EN_ATTENTE || (s == StatutPaiement.PAYE && vrai(r[12]) && !vrai(r[13]));
        if (aVerifier && recemment(r[20], 3)) {
            aVerifier = s == StatutPaiement.PAYE; // clôture à retenter
        }
        if (aVerifier) {
            r = confirmer(id);
            s = StatutPaiement.de(String.valueOf(r[9]));
        }
        if (s == StatutPaiement.EN_ATTENTE && r[18] != null
                && ((Timestamp) r[18]).toLocalDateTime().isBefore(LocalDateTime.now())) {
            maj(id, TransitionsPaiement.expirer(s), "Délai de paiement dépassé", false);
            r = lire(id, false);
        }
        return new JSONObject().put("success", true).put("data", versJson(r));
    }

    private static boolean recemment(Object verifie, int secondes) {
        return verifie instanceof Timestamp
                && ((Timestamp) verifie).toLocalDateTime().isAfter(LocalDateTime.now().minusSeconds(secondes));
    }

    /** Annulation par le comptoir / la borne (seulement en attente ; un paiement tardif sera signalé). */
    public JSONObject annuler(String id) {
        Object[] r = lire(id, true);
        if (r == null) {
            return echec("Paiement introuvable.");
        }
        StatutPaiement s = StatutPaiement.de(String.valueOf(r[9]));
        if (s == StatutPaiement.EN_ATTENTE) {
            maj(id, TransitionsPaiement.annuler(s), "Annulé au comptoir", false);
        }
        return new JSONObject().put("success", true).put("data", versJson(lire(id, false)));
    }

    /** Notification du fournisseur (webhook public) : signature, puis revérification ; idempotente. */
    public int notification(String code, String corps, Function<String, String> entete) {
        FournisseurPaiement f = fournisseur();
        if (f == null || !f.code().equals(code) || !disponible()) {
            return 404;
        }
        String id = f.lireNotification(corps, entete);
        if (id == null) {
            LOG.warning("Paiements mobile : notification " + code + " rejetée (signature invalide ou incomplète)");
            return 401;
        }
        if (lire(id, false) == null) {
            return 200; // transaction inconnue : rien à faire, pas de nouvel envoi
        }
        // demande mobile 54 : une clôture ici garde le poste de la vente, pas le nom réseau du fournisseur
        util.ContexteRequete.encaissementSansAppareil(() -> confirmer(id));
        return 200;
    }

    /**
     * Simulateur : le « client » paie ou refuse ; la notification signée passe par le même chemin qu'un vrai webhook.
     */
    public JSONObject simuler(String id, boolean payer, Integer montant) {
        if (!(fournisseur() instanceof SimulateurPaiement)) {
            return echec("Simulateur non actif.");
        }
        SimulateurPaiement sim = (SimulateurPaiement) fournisseur;
        String corps = payer ? sim.payer(id, montant) : sim.refuser(id);
        String sig = sim.signer(corps);
        int code = notification(sim.code(), corps,
                h -> SimulateurPaiement.ENTETE_SIGNATURE.equalsIgnoreCase(h) ? sig : null);
        Object[] r = lire(id, false);
        return new JSONObject().put("success", code == 200 && r != null).put("data",
                r == null ? JSONObject.NULL : versJson(r));
    }

    /** Historique d'un jour (reçus / en attente / échoués). */
    public JSONObject historique(LocalDate jour) {
        if (!disponible()) {
            return echec("Paiement mobile money non configuré sur ce serveur.");
        }
        @SuppressWarnings("unchecked")
        List<Object[]> l = em
                .createNativeQuery(
                        "SELECT " + COLONNES + " FROM paiement_mobile WHERE created_at >= ?1 AND created_at < ?2 "
                                + "ORDER BY created_at DESC")
                .setParameter(1, Timestamp.valueOf(jour.atStartOfDay()))
                .setParameter(2, Timestamp.valueOf(jour.plusDays(1).atStartOfDay())).getResultList();
        JSONArray a = new JSONArray();
        for (Object[] r : l) {
            a.put(versJson(r));
        }
        return new JSONObject().put("success", true).put("data", a).put("total", a.length());
    }

    /** Expiration automatique des paiements en attente (dernière vérification chez le fournisseur avant). */
    @Schedule(minute = "*", hour = "*", persistent = false)
    public void expirer() {
        if (!disponible()) {
            return;
        }
        try {
            @SuppressWarnings("unchecked")
            List<Object> ids = em.createNativeQuery(
                    "SELECT id FROM paiement_mobile WHERE statut = 'en_attente' AND expire_at < NOW() "
                            + "ORDER BY expire_at LIMIT 50")
                    .getResultList();
            for (Object id : ids) {
                Object[] r = confirmer(String.valueOf(id));
                if (r != null && StatutPaiement.de(String.valueOf(r[9])) == StatutPaiement.EN_ATTENTE) {
                    maj(String.valueOf(id), StatutPaiement.EXPIRE, "Délai de paiement dépassé", false);
                }
            }
        } catch (RuntimeException e) {
            LOG.log(Level.WARNING, "Paiements mobile : expiration automatique", e);
        }
    }
}
