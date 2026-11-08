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
import rest.service.extranet.commun.ChiffrementExtranet;
import rest.service.extranet.commun.CoffreSessions;
import rest.service.extranet.commun.ComptesExtranet;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.JournalCollecte;
import rest.service.extranet.commun.SessionExtranet;
import rest.service.extranet.commun.SourceExtranet;
import rest.service.extranet.commun.TransportExtranet;
import rest.service.extranet.ubipharm.FicheProduitCollecteur;
import rest.service.extranet.ubipharm.FicheProduitDepot;
import rest.service.extranet.ubipharm.FicheProduitUbipharm;
import rest.service.extranet.ubipharm.ListeUbipharm;
import rest.service.extranet.ubipharm.ListesUbipharmCollecteur;
import rest.service.extranet.ubipharm.ListesUbipharmDepot;
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

    /** Etat des sessions de tous les extranets (jamais leur valeur) et des identifiants (jamais le mot de passe). */
    public JSONObject sessions() {
        JSONArray l = new JSONArray();
        ComptesExtranet comptes = comptes();
        for (SourceExtranet s : SourceExtranet.values()) {
            l.put(CoffreSessions.session(s).publique().put("compte", comptes.publique(s, adresse(s))));
        }
        return new JSONObject().put("success", true).put("data", l);
    }

    /** Adresse de l'extranet selon la configuration du serveur. */
    private static String adresse(SourceExtranet s) {
        return rest.service.extranet.commun.ExtranetConfiguration.duServeur().adresse(s);
    }

    private ComptesExtranet comptes() {
        return new ComptesExtranet(em, ChiffrementExtranet.deLaBase(em));
    }

    /**
     * Donne a la connexion automatique les identifiants enregistres (ou aucun). Appele avant chaque collecte : une
     * modification faite sur un autre poste est prise en compte.
     *
     * @return null si tout va bien, sinon le motif (mot de passe indechiffrable : cle changee)
     */
    private String chargerIdentifiants(SourceExtranet s) {
        try {
            CoffreSessions.connexion(s).identifiants(comptes().identifiants(s, adresse(s)));
            return null;
        } catch (java.security.GeneralSecurityException e) {
            CoffreSessions.connexion(s).identifiants(null);
            LOG.log(Level.WARNING, "Identifiants {0} illisibles ({1})",
                    new Object[] { s, e.getClass().getSimpleName() });
            return "Mot de passe enregistré illisible (clé des extranets changée) : saisissez-le de nouveau";
        }
    }

    /** Corps : identifiant, motDePasse (vide : inchange). Administrateur seulement (controle dans l'API). */
    public JSONObject enregistrerCompte(SourceExtranet s, String identifiant, String motDePasse, String pageConnexion,
            String champIdentifiant, String utilisateur) {
        if (s.passerelle() != null) {
            return new JSONObject().put("success", false).put("msg", s + " s'ouvre par " + s.passerelle()
                    + " : aucun identifiant à saisir, enregistrez ceux de " + s.passerelle());
        }
        String refus;
        try {
            String page = ComptesExtranet.normaliserPage(pageConnexion,
                    rest.service.extranet.commun.ExtranetConfiguration.duServeur().adresse(s));
            String champ = ComptesExtranet.normaliserChamp(champIdentifiant);
            refus = comptes().enregistrer(s, identifiant, motDePasse, page, champ, utilisateur);
        } catch (IllegalArgumentException e) {
            refus = e.getMessage();
        } catch (java.security.GeneralSecurityException e) {
            LOG.log(Level.WARNING, "Chiffrement {0} impossible ({1})",
                    new Object[] { s, e.getClass().getSimpleName() });
            refus = "Chiffrement du mot de passe impossible sur ce serveur";
        }
        if (refus != null) {
            return new JSONObject().put("success", false).put("msg", refus);
        }
        em.flush();
        chargerIdentifiants(s);
        return new JSONObject().put("success", true).put("compte", comptes().publique(s, adresse(s)));
    }

    public JSONObject effacerCompte(SourceExtranet s) {
        comptes().effacer(s);
        CoffreSessions.connexion(s).identifiants(null);
        return new JSONObject().put("success", true).put("compte", comptes().publique(s, adresse(s)));
    }

    /** Connexion maintenant avec les identifiants enregistres (bouton « Se connecter »). */
    public JSONObject seConnecter(SourceExtranet s) {
        if (s.passerelle() != null) {
            chargerIdentifiants(s.passerelle());
        }
        String motif = chargerIdentifiants(s);
        if (motif != null) {
            return new JSONObject().put("success", false).put("msg", motif);
        }
        try {
            CoffreSessions.connexion(s).connecter();
            return new JSONObject().put("success", true).put("session", CoffreSessions.session(s).publique());
        } catch (ExtranetException e) {
            return new JSONObject().put("success", false).put("nature", e.nature().name()).put("msg", e.getMessage())
                    .put("session", CoffreSessions.session(s).publique());
        }
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
        chargerIdentifiants(s);
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
        chargerIdentifiants(s);
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

    /* ============================================================ Ubipharm : listes de l'onglet */

    public JSONObject listesUbipharm() {
        return new JSONObject().put("success", true).put("data", ListeUbipharm.catalogue());
    }

    public JSONObject listeEnCache(String code) {
        ListeUbipharm l = ListeUbipharm.parCode(code);
        if (l == null) {
            return new JSONObject().put("success", false).put("msg", "Liste inconnue");
        }
        return new ListesUbipharmDepot(em).lire(l).put("success", true);
    }

    /**
     * Liste complete. La collecte est fermee COMPLETE avant de retirer les lignes des collectes precedentes (le depot
     * le verifie) ; en cas d'echec, le cache precedent reste.
     */
    public JSONObject collecterListe(String code, String utilisateur) {
        ListeUbipharm l = ListeUbipharm.parCode(code);
        if (l == null) {
            return new JSONObject().put("success", false).put("msg", "Liste inconnue");
        }
        SourceExtranet s = SourceExtranet.UBIPHARM;
        chargerIdentifiants(s);
        JournalCollecte journal = new JournalCollecte(em);
        long id = journal.ouvrir(s, l.module(), null, utilisateur);
        try {
            ListesUbipharmCollecteur.Resultat r = ListesUbipharmCollecteur.lire(CoffreSessions.transport(s), l,
                    rest.service.extranet.commun.ExtranetConfiguration.duServeur().pagesMax(s));
            ListesUbipharmDepot d = new ListesUbipharmDepot(em);
            d.enregistrer(id, l, r.lignes);
            journal.fermer(id, JournalCollecte.COMPLETE, r.annoncees, r.lignes.size(), null);
            d.garderSeulement(l, id);
            return d.lire(l).put("success", true);
        } catch (ExtranetException e) {
            journal.fermer(id, JournalCollecte.ECHEC, null, 0, e.nature() + " : " + e.getMessage());
            return new JSONObject().put("success", false).put("nature", e.nature().name()).put("msg", e.getMessage())
                    .put("collecte", journal.une(id));
        }
    }

    /* ============================================================ TEDIS : listes de l'onglet */

    public JSONObject listesTedis() {
        return new JSONObject().put("success", true).put("data", rest.service.extranet.tedis.ListeTedis.catalogue());
    }

    public JSONObject listeTedisEnCache(String code) {
        rest.service.extranet.tedis.ListeTedis l = rest.service.extranet.tedis.ListeTedis.parCode(code);
        if (l == null) {
            return new JSONObject().put("success", false).put("msg", "Liste inconnue");
        }
        return new rest.service.extranet.commun.DepotListes(em)
                .lire(SourceExtranet.TEDIS, l.name(), l.module(), l.description()).put("success", true);
    }

    /** Comme Ubipharm : collecte fermee COMPLETE avant de retirer l'ancien cache ; un echec garde l'ancien. */
    public JSONObject collecterListeTedis(String code, String utilisateur) {
        rest.service.extranet.tedis.ListeTedis l = rest.service.extranet.tedis.ListeTedis.parCode(code);
        if (l == null) {
            return new JSONObject().put("success", false).put("msg", "Liste inconnue");
        }
        SourceExtranet s = SourceExtranet.TEDIS;
        chargerIdentifiants(s);
        JournalCollecte journal = new JournalCollecte(em);
        long id = journal.ouvrir(s, l.module(), null, utilisateur);
        try {
            rest.service.extranet.tedis.ListesTedisLecteur.Resultat r = rest.service.extranet.tedis.ListesTedisLecteur
                    .lire(CoffreSessions.transport(s), l);
            rest.service.extranet.commun.DepotListes d = new rest.service.extranet.commun.DepotListes(em);
            d.enregistrer(id, l.name(), r.lignes);
            journal.fermer(id, JournalCollecte.COMPLETE, null, r.lignes.size(), null);
            d.garderSeulement(l.name(), l.module(), id);
            return d.lire(s, l.name(), l.module(), l.description()).put("success", true);
        } catch (ExtranetException e) {
            journal.fermer(id, JournalCollecte.ECHEC, null, 0, e.nature() + " : " + e.getMessage());
            return new JSONObject().put("success", false).put("nature", e.nature().name()).put("msg", e.getMessage())
                    .put("collecte", journal.une(id));
        }
    }

    /* ============================================================ Ubipharm : recherche CIP, libelle, DCI */

    /** Recherche en direct sur l'extranet (rien n'est garde) ; le motif n'est jamais journalise. */
    public JSONObject rechercherUbipharm(String motif, String champs, boolean commencePar, boolean enStockSeulement) {
        if (rest.service.extranet.ubipharm.RechercheUbipharm.motif(motif) == null) {
            return new JSONObject().put("success", false).put("msg", "Saisissez de 2 à 60 caractères");
        }
        chargerIdentifiants(SourceExtranet.UBIPHARM);
        try {
            return rest.service.extranet.ubipharm.RechercheUbipharm
                    .rechercher(CoffreSessions.transport(SourceExtranet.UBIPHARM), motif,
                            rest.service.extranet.ubipharm.RechercheUbipharm.Champs.lire(champs), commencePar,
                            enStockSeulement)
                    .put("success", true);
        } catch (ExtranetException e) {
            return new JSONObject().put("success", false).put("nature", e.nature().name()).put("msg", e.getMessage());
        }
    }

    /* ============================================================ Mayite : specialites et monographies */

    /** Recherche dans la liste des specialites Mayite (entree par la session Ubipharm). */
    public JSONObject rechercherMayite(String nom, String dci, String forme, String laboratoire) {
        rest.service.extranet.mayite.RechercheMayite.Criteres c = new rest.service.extranet.mayite.RechercheMayite.Criteres(
                nom, dci, forme, laboratoire);
        String refus = c.refus();
        if (refus != null) {
            return new JSONObject().put("success", false).put("msg", refus);
        }
        chargerIdentifiants(SourceExtranet.UBIPHARM);
        try {
            return rest.service.extranet.mayite.RechercheMayite
                    .rechercher(CoffreSessions.transport(SourceExtranet.MAYITE), c).put("success", true);
        } catch (ExtranetException e) {
            return new JSONObject().put("success", false).put("nature", e.nature().name()).put("msg", e.getMessage());
        }
    }

    /** Monographie Mayite d'une specialite (identifiant tire de la recherche). */
    public JSONObject monographieMayite(String id) {
        chargerIdentifiants(SourceExtranet.UBIPHARM);
        try {
            return rest.service.extranet.mayite.MonographieMayite
                    .lire(CoffreSessions.transport(SourceExtranet.MAYITE), id == null ? "" : id.trim().toLowerCase())
                    .put("success", true);
        } catch (ExtranetException e) {
            return new JSONObject().put("success", false).put("nature", e.nature().name()).put("msg", e.getMessage());
        }
    }

    /* ============================================================ rafraichissement automatique des listes */

    /** Listes que l'on peut rafraichir : {source, code, libelle, module}, Ubipharm puis TEDIS. */
    private static List<String[]> listesRafraichissables() {
        List<String[]> r = new ArrayList<>();
        for (ListeUbipharm l : ListeUbipharm.values()) {
            r.add(new String[] { SourceExtranet.UBIPHARM.name(), l.name(), l.libelle, l.module() });
        }
        for (rest.service.extranet.tedis.ListeTedis l : rest.service.extranet.tedis.ListeTedis.values()) {
            r.add(new String[] { SourceExtranet.TEDIS.name(), l.name(), l.libelle, l.module() });
        }
        return r;
    }

    private static java.time.LocalDateTime date(Object o) {
        if (o == null) {
            return null;
        }
        if (o instanceof java.sql.Timestamp) {
            return ((java.sql.Timestamp) o).toLocalDateTime();
        }
        if (o instanceof java.time.LocalDateTime) {
            return (java.time.LocalDateTime) o;
        }
        return java.time.LocalDateTime.parse(String.valueOf(o).replace(' ', 'T'));
    }

    /** {delai, derniereComplete, dernierEssai, statutDernierEssai} d'une liste. */
    @SuppressWarnings("unchecked")
    private Object[] etatRafraichissement(String source, String code, String module) {
        List<Object> d = em.createNativeQuery("SELECT delai_minutes FROM extranet_rafraichissement WHERE liste = ?1")
                .setParameter(1, code).getResultList();
        int delai = d.isEmpty() ? 0 : ((Number) d.get(0)).intValue();
        Object complete = em
                .createNativeQuery("SELECT MAX(debut) FROM extranet_collecte WHERE source = ?1 AND module = ?2"
                        + " AND statut = 'COMPLETE'")
                .setParameter(1, source).setParameter(2, module).getSingleResult();
        List<Object[]> essai = em
                .createNativeQuery("SELECT debut, statut FROM extranet_collecte WHERE source = ?1"
                        + " AND module = ?2 ORDER BY id DESC LIMIT 1")
                .setParameter(1, source).setParameter(2, module).getResultList();
        return new Object[] { delai, date(complete), essai.isEmpty() ? null : date(essai.get(0)[0]),
                essai.isEmpty() ? null : essai.get(0)[1] };
    }

    public JSONObject rafraichissements() {
        JSONArray a = new JSONArray();
        for (String[] l : listesRafraichissables()) {
            Object[] e = etatRafraichissement(l[0], l[1], l[3]);
            java.time.LocalDateTime p = rest.service.extranet.commun.Rafraichissement.prochaine((Integer) e[0],
                    (java.time.LocalDateTime) e[1], (java.time.LocalDateTime) e[2]);
            a.put(new JSONObject().put("source", l[0]).put("code", l[1]).put("libelle", l[2]).put("delai", e[0])
                    .put("derniereComplete", e[1] == null ? JSONObject.NULL : e[1].toString())
                    .put("dernierEssai", e[2] == null ? JSONObject.NULL : e[2].toString())
                    .put("statutDernierEssai", e[3] == null ? JSONObject.NULL : e[3])
                    .put("prochaine", p == null ? JSONObject.NULL
                            : p.equals(java.time.LocalDateTime.MIN) ? "dès que possible" : p.toString()));
        }
        return new JSONObject().put("success", true).put("data", a).put("delais",
                new JSONArray(rest.service.extranet.commun.Rafraichissement.DELAIS));
    }

    /** Delai d'une liste (0 : jamais) ; une liste inconnue ou un delai hors de la liste proposee est refuse. */
    public JSONObject definirRafraichissement(String code, int delaiMinutes, String utilisateur) {
        String[] liste = null;
        for (String[] l : listesRafraichissables()) {
            if (l[1].equalsIgnoreCase(code == null ? "" : code.trim())) {
                liste = l;
            }
        }
        if (liste == null) {
            return new JSONObject().put("success", false).put("msg", "Liste inconnue");
        }
        if (!rest.service.extranet.commun.Rafraichissement.delaiValide(delaiMinutes)) {
            return new JSONObject().put("success", false).put("msg", "Délai non proposé : " + delaiMinutes + " min");
        }
        em.createNativeQuery("INSERT INTO extranet_rafraichissement (liste, source, delai_minutes, modifie_le,"
                + " modifie_par) VALUES (?1, ?2, ?3, NOW(), ?4) ON DUPLICATE KEY UPDATE delai_minutes = ?3,"
                + " modifie_le = NOW(), modifie_par = ?4").setParameter(1, liste[1]).setParameter(2, liste[0])
                .setParameter(3, delaiMinutes).setParameter(4, utilisateur).executeUpdate();
        return new JSONObject().put("success", true).put("code", liste[1]).put("delai", delaiMinutes);
    }

    /**
     * Listes dont la lecture est due maintenant, pour la tache planifiee. Une source sans identifiant enregistre ni
     * session utilisable est ecartee (rien a lire, aucun essai journalise).
     */
    public List<String[]> listesARafraichir() {
        java.time.LocalDateTime maintenant = java.time.LocalDateTime.now();
        List<String[]> r = new ArrayList<>();
        for (String[] l : listesRafraichissables()) {
            Object[] e = etatRafraichissement(l[0], l[1], l[3]);
            if (!rest.service.extranet.commun.Rafraichissement.echue((Integer) e[0], (java.time.LocalDateTime) e[1],
                    (java.time.LocalDateTime) e[2], maintenant)) {
                continue;
            }
            SourceExtranet s = SourceExtranet.valueOf(l[0]);
            boolean compte = comptes().publique(s, adresse(s)).optBoolean("enregistre");
            if (compte || CoffreSessions.session(s).utilisable()) {
                r.add(new String[] { l[0], l[1] });
            }
        }
        return r;
    }

    /** Lecture d'une liste par la tache planifiee (transaction propre a chaque liste). */
    public JSONObject rafraichir(String source, String code) {
        return SourceExtranet.TEDIS.name().equals(source) ? collecterListeTedis(code, UTILISATEUR_AUTOMATIQUE)
                : collecterListe(code, UTILISATEUR_AUTOMATIQUE);
    }

    public static final String UTILISATEUR_AUTOMATIQUE = "rafraichissement automatique";

    /* ============================================================ Ubipharm : nouveaux produits */

    public JSONObject nouveauxEnCache() {
        return new NouveauxProduitsDepot(em).lire().put("success", true);
    }

    public JSONObject collecterNouveaux(String utilisateur) {
        chargerIdentifiants(SourceExtranet.UBIPHARM);
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
     * modifie aucun article. Ordre : reference Ubipharm de la fiche article (PSCODE), puis CIP / EAN 13.
     */
    public JSONObject rapprocherNouveaux() {
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
        for (RapprochementProduits.Resultat x : new RapprochementProduits(em).rapprocher(demandes)) {
            r.put(x.toJson());
        }
        return new JSONObject().put("success", true).put("data", r);
    }
}
