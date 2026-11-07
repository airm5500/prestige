package rest.service.extranet;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.PersistenceContext;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.extranet.commun.CoffreSessions;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.JournalCollecte;
import rest.service.extranet.commun.SessionExtranet;
import rest.service.extranet.commun.SourceExtranet;
import rest.service.extranet.commun.TransportExtranet;
import rest.service.extranet.ubipharm.FicheProduitCollecteur;
import rest.service.extranet.ubipharm.FicheProduitDepot;
import rest.service.extranet.ubipharm.FicheProduitUbipharm;
import rest.service.extranet.ubipharm.ReclamationUbipharm;
import rest.service.extranet.ubipharm.ReclamationsCollecteur;
import rest.service.extranet.ubipharm.ReclamationsDepot;
import rest.service.extranet.ubipharm.NouveauxProduitsCollecteur;
import rest.service.extranet.ubipharm.NouveauxProduitsDepot;
import rest.service.extranet.ubipharm.RapprochementProduits;
import rest.service.extranet.ubipharm.ReapproCollecteur;
import rest.service.extranet.ubipharm.ReapproDepot;
import java.util.ArrayList;

/**
 * Extranets grossistes (plan du 07/11), lecture seule : session de chaque extranet, journal des collectes et modules
 * (fiche produit, reclamations, reapprovisionnements, nouveaux produits et rapprochement avec les articles).
 *
 * <p>
 * Une collecte = une ligne de {@code extranet_collecte} ouverte avant l'appel et fermee COMPLETE ou ECHEC : c'est la
 * date des donnees affichees. En cas d'echec, rien n'est ecrit dans les tables du module (le cache precedent reste). La
 * session est un secret : seul un administrateur la renseigne ou l'efface, et aucune reponse ne la contient.
 */
@Stateless
public class ExtranetService {

    private static final Logger LOG = Logger.getLogger(ExtranetService.class.getName());

    public static final String FICHE = "FICHE_PRODUIT";
    public static final String RECLAMATIONS = "RECLAMATIONS";
    public static final String RECLAMATION_DETAIL = "RECLAMATION_DETAIL";
    public static final String RECLAMATION_PDF = "RECLAMATION_PDF";

    @PersistenceContext(unitName = "JTA_UNIT")
    private EntityManager em;

    public boolean administrateur(String roleId) {
        if (StringUtils.isBlank(roleId)) {
            return false;
        }
        dal.TRole r = em.find(dal.TRole.class, roleId);
        return bll.userManagement.user.estRoleAdmin(r) || bll.userManagement.user.estRoleSuperAdmin(r);
    }

    /* ============================================================ sessions */

    /** Etat des sessions de tous les extranets (jamais leur valeur). */
    public JSONObject sessions() {
        JSONArray l = new JSONArray();
        for (SourceExtranet s : SourceExtranet.values()) {
            l.put(CoffreSessions.session(s).publique());
        }
        return new JSONObject().put("success", true).put("data", l);
    }

    public JSONObject definirSession(SourceExtranet s, String cookies, String utilisateur) {
        SessionExtranet session = CoffreSessions.session(s);
        String refus = session.definir(cookies, utilisateur);
        if (refus != null) {
            return new JSONObject().put("success", false).put("msg", refus);
        }
        return new JSONObject().put("success", true).put("session", session.publique());
    }

    public JSONObject effacerSession(SourceExtranet s) {
        SessionExtranet session = CoffreSessions.session(s);
        session.effacer();
        return new JSONObject().put("success", true).put("session", session.publique());
    }

    /* ============================================================ collectes */

    public JSONObject collectes(SourceExtranet s, String module, int nombre) {
        return new JSONObject().put("success", true).put("data",
                new JournalCollecte(em).dernieres(s, StringUtils.trimToNull(module), nombre));
    }

    public JSONObject collecte(long id) {
        JSONObject c = new JournalCollecte(em).une(id);
        return c == null ? new JSONObject().put("success", false).put("msg", "Collecte introuvable")
                : new JSONObject().put("success", true).put("collecte", c);
    }

    /** Travail d'une collecte : lit l'extranet, ecrit le cache, rend le resultat (lignes annoncees et recues). */
    private interface Travail {
        Resultat faire(TransportExtranet t, long collecteId) throws Exception;
    }

    private static final class Resultat {
        final Integer annoncees;
        final int recues;
        final JSONObject reponse;

        Resultat(Integer annoncees, int recues, JSONObject reponse) {
            this.annoncees = annoncees;
            this.recues = recues;
            this.reponse = reponse;
        }
    }

    private JSONObject collecter(SourceExtranet s, String module, String parametres, String utilisateur,
            Travail travail) {
        JournalCollecte journal = new JournalCollecte(em);
        long id = journal.ouvrir(s, module, parametres, utilisateur);
        try {
            Resultat r = travail.faire(CoffreSessions.transport(s), id);
            journal.fermer(id, JournalCollecte.COMPLETE, r.annoncees, r.recues, null);
            return r.reponse.put("success", true).put("collecte", journal.une(id));
        } catch (ExtranetException e) {
            journal.fermer(id, JournalCollecte.ECHEC, null, 0, e.nature() + " : " + e.getMessage());
            return new JSONObject().put("success", false).put("nature", e.nature().name()).put("msg", e.getMessage())
                    .put("collecte", journal.une(id));
        } catch (IllegalArgumentException e) {
            journal.fermer(id, JournalCollecte.ECHEC, null, 0, "Demande invalide");
            return new JSONObject().put("success", false).put("msg", "Demande invalide : " + e.getMessage());
        } catch (Exception e) {
            /* jamais le corps de la reponse dans le journal : seulement la nature de l'erreur */
            LOG.log(Level.WARNING, "Collecte {0} {1} : {2}", new Object[] { s, module, e.getClass().getSimpleName() });
            journal.fermer(id, JournalCollecte.ECHEC, null, 0, "Erreur interne (" + e.getClass().getSimpleName() + ")");
            return new JSONObject().put("success", false).put("msg", "Erreur pendant la collecte").put("collecte",
                    journal.une(id));
        }
    }

    /* ============================================================ Ubipharm : fiche produit */

    public JSONObject ficheEnCache(String pscode) {
        if (!FicheProduitCollecteur.pscodeValide(pscode)) {
            return new JSONObject().put("success", false).put("msg", "Référence produit invalide");
        }
        JSONObject f = new FicheProduitDepot(em).lire(pscode);
        return new JSONObject().put("success", true).put("fiche", f == null ? JSONObject.NULL : f);
    }

    public JSONObject collecterFiche(String pscode, String utilisateur) {
        if (!FicheProduitCollecteur.pscodeValide(pscode)) {
            return new JSONObject().put("success", false).put("msg", "Référence produit invalide");
        }
        return collecter(SourceExtranet.UBIPHARM, FICHE, "pscode=" + pscode, utilisateur, (t, id) -> {
            FicheProduitUbipharm f = new FicheProduitCollecteur().lire(t, pscode);
            FicheProduitDepot d = new FicheProduitDepot(em);
            d.enregistrer(id, f);
            return new Resultat(1, 1, new JSONObject().put("fiche", d.lire(pscode)));
        });
    }

    /* ============================================================ Ubipharm : reclamations */

    public JSONObject reclamationsEnCache(String filtre) {
        try {
            return new ReclamationsDepot(em).lireListe(filtre).put("success", true);
        } catch (IllegalArgumentException e) {
            return new JSONObject().put("success", false).put("msg", "Filtre invalide (ALL, C ou V)");
        }
    }

    public JSONObject collecterReclamations(String filtre, String utilisateur) {
        if (filtre == null || !ReclamationsCollecteur.FILTRES.contains(filtre)) {
            return new JSONObject().put("success", false).put("msg", "Filtre invalide (ALL, C ou V)");
        }
        return collecter(SourceExtranet.UBIPHARM, RECLAMATIONS, "filtre=" + filtre, utilisateur, (t, id) -> {
            List<ReclamationUbipharm> l = ReclamationsCollecteur.liste(t, filtre);
            ReclamationsDepot d = new ReclamationsDepot(em);
            int n = d.enregistrerListe(filtre, l, id);
            return new Resultat(l.size(), n, d.lireListe(filtre));
        });
    }

    public JSONObject reclamationEnCache(String id, String eta, String appl) {
        try {
            JSONObject r = new ReclamationsDepot(em).lireDetail(id, eta, appl);
            return new JSONObject().put("success", true).put("reclamation", r == null ? JSONObject.NULL : r);
        } catch (IllegalArgumentException e) {
            return new JSONObject().put("success", false).put("msg", "Réclamation invalide");
        }
    }

    public JSONObject collecterReclamation(String id, String eta, String appl, String utilisateur) {
        try {
            ReclamationsCollecteur.parametres(id, eta, appl);
        } catch (IllegalArgumentException e) {
            return new JSONObject().put("success", false).put("msg", "Réclamation invalide");
        }
        String p = "id=" + id + "&eta=" + eta + "&appl=" + appl;
        return collecter(SourceExtranet.UBIPHARM, RECLAMATION_DETAIL, p, utilisateur, (t, cid) -> {
            ReclamationUbipharm r = ReclamationsCollecteur.detail(t, id, eta, appl);
            ReclamationsDepot d = new ReclamationsDepot(em);
            d.enregistrerDetail(r, cid);
            int n = r.lignes() == null ? 0 : r.lignes().size();
            return new Resultat(n, n, new JSONObject().put("reclamation", d.lireDetail(id, eta, appl)));
        });
    }

    public JSONObject collecterPdfReclamation(String id, String eta, String appl, String utilisateur) {
        try {
            ReclamationsCollecteur.parametres(id, eta, appl);
        } catch (IllegalArgumentException e) {
            return new JSONObject().put("success", false).put("msg", "Réclamation invalide");
        }
        String p = "id=" + id + "&eta=" + eta + "&appl=" + appl;
        return collecter(SourceExtranet.UBIPHARM, RECLAMATION_PDF, p, utilisateur, (t, cid) -> {
            JSONObject doc = new ReclamationsDepot(em).enregistrerPdf(ReclamationsCollecteur.pdf(t, id, eta, appl),
                    cid);
            return new Resultat(1, 1, new JSONObject().put("pdf", doc));
        });
    }

    /**
     * Fichier PDF deja telecharge d'une reclamation ; null s'il n'existe pas. Le chemin vient de la base et doit rester
     * dans le dossier de stockage.
     */
    public Path fichierPdfReclamation(String id, String eta, String appl) {
        JSONObject doc;
        try {
            doc = new ReclamationsDepot(em).lireDocument(id, eta, appl);
        } catch (IllegalArgumentException e) {
            return null;
        }
        if (doc == null) {
            return null;
        }
        Path racine = util.StockageDisque.racine().toAbsolutePath().normalize();
        Path f = racine.resolve(doc.getString("fichier")).normalize();
        return f.startsWith(racine) && Files.isRegularFile(f) ? f : null;
    }

    /* ============================================================ Ubipharm : reapprovisionnements */

    public JSONObject reapproEnCache(String recherche, String agence, int page, int taille) {
        ReapproDepot.Filtre f = new ReapproDepot.Filtre();
        f.recherche = StringUtils.trimToNull(recherche);
        f.codeAgence = StringUtils.trimToNull(agence);
        return new ReapproDepot(em).lire(f, page, taille).put("success", true);
    }

    /**
     * Liste complete paginee. La collecte est fermee COMPLETE avant de retirer les lignes des collectes precedentes (le
     * depot le verifie) ; en cas d'echec, le cache precedent reste.
     */
    public JSONObject collecterReappro(String utilisateur) {
        JournalCollecte journal = new JournalCollecte(em);
        SourceExtranet s = SourceExtranet.UBIPHARM;
        long id = journal.ouvrir(s, ReapproCollecteur.MODULE, null, utilisateur);
        try {
            ReapproCollecteur.Resultat r = ReapproCollecteur.lire(CoffreSessions.transport(s),
                    rest.service.extranet.commun.ExtranetConfiguration.duServeur().pagesMax(s));
            ReapproDepot d = new ReapproDepot(em);
            d.enregistrer(id, r.lignes);
            journal.fermer(id, JournalCollecte.COMPLETE, r.bilan.recordsFiltered, r.lignes.size(), null);
            d.garderSeulement(id);
            return new JSONObject().put("success", true).put("collecte", journal.une(id));
        } catch (ExtranetException e) {
            journal.fermer(id, JournalCollecte.ECHEC, null, 0, e.nature() + " : " + e.getMessage());
            return new JSONObject().put("success", false).put("nature", e.nature().name()).put("msg", e.getMessage())
                    .put("collecte", journal.une(id));
        }
    }

    /* ============================================================ Ubipharm : nouveaux produits */

    public JSONObject nouveauxEnCache() {
        return new NouveauxProduitsDepot(em).lire().put("success", true);
    }

    public JSONObject collecterNouveaux(String utilisateur) {
        JournalCollecte journal = new JournalCollecte(em);
        try {
            long id = new NouveauxProduitsCollecteur(CoffreSessions.transport(SourceExtranet.UBIPHARM))
                    .collecterEtEnregistrer(journal, new NouveauxProduitsDepot(em), utilisateur);
            return new JSONObject().put("success", true).put("collecte", journal.une(id));
        } catch (ExtranetException e) {
            /* la collecte a deja ete fermee en ECHEC par le collecteur */
            return new JSONObject().put("success", false).put("nature", e.nature().name()).put("msg", e.getMessage());
        }
    }

    /**
     * Rapprochement des nouveaux produits en cache avec les articles de Prestige : propose seulement, ne cree ni ne
     * modifie aucun article.
     *
     * @param grossisteId
     *            grossiste Ubipharm dans Prestige (code article chez ce grossiste), ou null
     */
    public JSONObject rapprocherNouveaux(String grossisteId) {
        JSONArray produits = new NouveauxProduitsDepot(em).lire().optJSONArray("produits");
        List<RapprochementProduits.Demande> demandes = new ArrayList<>();
        for (int i = 0; produits != null && i < produits.length(); i++) {
            JSONObject p = produits.getJSONObject(i);
            String pscode = p.isNull("pscode") ? null : p.getString("pscode");
            List<String> codes = new ArrayList<>();
            if (!p.isNull("cip")) {
                codes.add(p.getString("cip"));
            }
            demandes.add(new RapprochementProduits.Demande(pscode, codes));
        }
        JSONArray r = new JSONArray();
        for (RapprochementProduits.Resultat x : new RapprochementProduits(em).rapprocher(demandes,
                StringUtils.trimToNull(grossisteId))) {
            r.put(x.toJson());
        }
        return new JSONObject().put("success", true).put("data", r);
    }
}
