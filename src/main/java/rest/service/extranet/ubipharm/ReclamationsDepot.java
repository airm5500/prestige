package rest.service.extranet.ubipharm;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.sql.Date;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import javax.persistence.EntityManager;
import javax.persistence.Query;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.extranet.commun.SourceExtranet;
import util.StockageDisque;

/**
 * Cache des reclamations Ubipharm (tables {@code extranet_reclamation}, {@code extranet_reclamation_ligne},
 * {@code extranet_document}, migration V7.5.3). Requetes natives parametrees ; transaction tenue par l'appelant.
 *
 * <ul>
 * <li>une liste ne remplace celle du meme filtre qu'une fois la nouvelle COMPLETE (le collecteur ne rend rien d'autre)
 * : insertion d'abord, retrait de l'ancienne ensuite ;</li>
 * <li>un detail remplace le precedent de la meme cle id/eta/appl ;</li>
 * <li>un PDF est ecrit sur disque ({@code StockageDisque.sousDossier("extranet")}, nom tire du SHA-256) ; seule sa
 * trace va en base ;</li>
 * <li>chaque donnee ecrite a son lecteur ({@link #lireListe}, {@link #lireDetail}, {@link #lireDocument}).</li>
 * </ul>
 * Rien n'est journalise ici : ni motif, ni commentaire.
 */
public final class ReclamationsDepot {

    public static final String LISTE = "LISTE";
    public static final String DETAIL = "DETAIL";
    public static final String TYPE_PDF = "RECLAMATION";
    static final String DOSSIER = "extranet";

    private static final String COLONNES_REC = "id, rec_id, eta, appl, reference, numeros_associes, statut,"
            + " date_envoi_brute, date_maj_brute, agence, entetes, collecte_id, collecte_le";
    private static final String COLONNES_LIGNE = "position, cellules, pscode, designation, cip, quantite, prix_brut,"
            + " prix, motif, commentaire";

    private final EntityManager em;

    public ReclamationsDepot(EntityManager em) {
        this.em = em;
    }

    /* ========================================================= ecriture */

    /** Enregistre une liste complete et retire la liste precedente du meme filtre. Rend le nombre de lignes. */
    public int enregistrerListe(String filtre, List<ReclamationUbipharm> liste, Long collecteId) {
        String f = ReclamationsCollecteur.filtre(filtre);
        long avant = maxId();
        int rang = 0;
        for (ReclamationUbipharm r : liste) {
            inserer(r, LISTE, f, rang++, collecteId);
        }
        em.createNativeQuery("DELETE FROM extranet_reclamation WHERE nature = ?1 AND filtre = ?2 AND id <= ?3")
                .setParameter(1, LISTE).setParameter(2, f).setParameter(3, avant).executeUpdate();
        return rang;
    }

    /** Enregistre un detail (et ses lignes), retire le detail precedent de la meme cle. Rend l'id de la ligne. */
    public long enregistrerDetail(ReclamationUbipharm r, Long collecteId) {
        if (r.cle() == null || r.lignes() == null) {
            throw new IllegalArgumentException("Détail sans clé id/eta/appl ou sans lignes");
        }
        long id = inserer(r, DETAIL, null, null, collecteId);
        for (LigneReclamationUbipharm l : r.lignes()) {
            Object[] v = valeursLigne(l);
            Query q = em.createNativeQuery("INSERT INTO extranet_reclamation_ligne (reclamation_id, " + COLONNES_LIGNE
                    + ") VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)").setParameter(1, id);
            for (int i = 0; i < v.length; i++) {
                q.setParameter(i + 2, v[i]);
            }
            q.executeUpdate();
        }
        String anciens = "SELECT id FROM extranet_reclamation WHERE nature = ?1 AND rec_id = ?2 AND eta = ?3"
                + " AND appl = ?4 AND id <> ?5";
        em.createNativeQuery(
                "DELETE FROM extranet_reclamation_ligne WHERE reclamation_id IN (SELECT a.id FROM (" + anciens + ") a)")
                .setParameter(1, DETAIL).setParameter(2, r.id()).setParameter(3, r.eta()).setParameter(4, r.appl())
                .setParameter(5, id).executeUpdate();
        em.createNativeQuery("DELETE FROM extranet_reclamation WHERE nature = ?1 AND rec_id = ?2 AND eta = ?3"
                + " AND appl = ?4 AND id <> ?5").setParameter(1, DETAIL).setParameter(2, r.id())
                .setParameter(3, r.eta()).setParameter(4, r.appl()).setParameter(5, id).executeUpdate();
        return id;
    }

    /**
     * Ecrit le PDF sur disque (s'il n'y est pas deja) et enregistre sa trace, a la place de la precedente du meme lien.
     */
    public JSONObject enregistrerPdf(ReclamationsCollecteur.PdfReclamation pdf, Long collecteId) throws IOException {
        Path racine = StockageDisque.racine();
        String fichier = ecrireFichier(StockageDisque.sousDossier(DOSSIER), pdf.octets(), pdf.sha256());
        String relatif = racine.relativize(StockageDisque.sousDossier(DOSSIER).resolve(fichier)).toString()
                .replace('\\', '/');
        String parametres = parametres(pdf.parametres());
        em.createNativeQuery("DELETE FROM extranet_document WHERE source = ?1 AND type_document = ?2"
                + " AND chemin_source = ?3 AND parametres = ?4").setParameter(1, SourceExtranet.UBIPHARM.name())
                .setParameter(2, TYPE_PDF).setParameter(3, pdf.cheminSource()).setParameter(4, parametres)
                .executeUpdate();
        em.createNativeQuery("INSERT INTO extranet_document (source, type_document, chemin_source, parametres,"
                + " type_contenu, taille, sha256, fichier, collecte_id, collecte_le)"
                + " VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, NOW())").setParameter(1, SourceExtranet.UBIPHARM.name())
                .setParameter(2, TYPE_PDF).setParameter(3, pdf.cheminSource()).setParameter(4, parametres)
                .setParameter(5, tronquer(pdf.typeContenu(), 100)).setParameter(6, (long) pdf.taille())
                .setParameter(7, pdf.sha256()).setParameter(8, relatif).setParameter(9, collecteId).executeUpdate();
        return lireDocument(pdf.parametres().get("id"), pdf.parametres().get("eta"), pdf.parametres().get("appl"));
    }

    /**
     * Ecrit les octets sous « sha256.pdf » dans le dossier, par fichier temporaire puis deplacement. Un fichier deja
     * present de meme nom et de meme taille n'est pas reecrit. Rend le nom du fichier.
     */
    static String ecrireFichier(Path dossier, byte[] octets, String sha256) throws IOException {
        if (sha256 == null || !sha256.matches("[0-9a-f]{64}")) {
            throw new IllegalArgumentException("Empreinte SHA-256 invalide");
        }
        if (!sha256.equals(ReclamationsCollecteur.sha256(octets))) {
            throw new IllegalArgumentException("Empreinte différente des octets");
        }
        Files.createDirectories(dossier);
        String nom = sha256 + ".pdf";
        Path cible = dossier.resolve(nom);
        if (Files.exists(cible) && Files.size(cible) == octets.length) {
            return nom;
        }
        Path tmp = Files.createTempFile(dossier, sha256, ".tmp");
        try {
            Files.write(tmp, octets);
            Files.move(tmp, cible, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } finally {
            Files.deleteIfExists(tmp);
        }
        return nom;
    }

    /** Parametres du lien source, dans l'ordre id, eta, appl : « id=1408456&eta=VRI&appl=EXT ». */
    static String parametres(Map<String, String> p) {
        return "id=" + p.get("id") + "&eta=" + p.get("eta") + "&appl=" + p.get("appl");
    }

    private long inserer(ReclamationUbipharm r, String nature, String filtre, Integer rang, Long collecteId) {
        Object[] v = valeursReclamation(r);
        Query q = em.createNativeQuery("INSERT INTO extranet_reclamation (nature, filtre, rang, rec_id, eta, appl,"
                + " reference, numeros_associes, statut, date_envoi_brute, date_envoi, date_maj_brute, date_maj,"
                + " agence, entetes, collecte_id, collecte_le) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11,"
                + " ?12, ?13, ?14, ?15, ?16, NOW())").setParameter(1, nature).setParameter(2, filtre)
                .setParameter(3, rang);
        for (int i = 0; i < v.length; i++) {
            q.setParameter(i + 4, v[i]);
        }
        q.setParameter(16, collecteId);
        q.executeUpdate();
        Object id = em.createNativeQuery("SELECT LAST_INSERT_ID()").getSingleResult();
        return entierLong(id);
    }

    private long maxId() {
        Object o = em.createNativeQuery("SELECT COALESCE(MAX(id), 0) FROM extranet_reclamation").getSingleResult();
        return entierLong(o);
    }

    /**
     * Valeurs des colonnes rec_id .. entetes (12), dans l'ordre de l'INSERT. Les dates lues sont derivees du brut.
     */
    static Object[] valeursReclamation(ReclamationUbipharm r) {
        LocalDate de = r.dateEnvoi(), dm = r.dateMiseAJour();
        return new Object[] { r.id(), r.eta(), r.appl(), tronquer(r.reference(), 60),
                tronquer(r.numerosAssociesBrut(), 500), tronquer(r.statut(), 100), tronquer(r.dateEnvoiBrute(), 40),
                de == null ? null : Date.valueOf(de), tronquer(r.dateMiseAJourBrute(), 40),
                dm == null ? null : Date.valueOf(dm), tronquer(r.agence(), 150),
                r.entetes() == null ? null : new JSONArray(r.entetes()).toString() };
    }

    /** Valeurs des colonnes position .. commentaire (10), dans l'ordre de COLONNES_LIGNE. */
    static Object[] valeursLigne(LigneReclamationUbipharm l) {
        return new Object[] { l.position(), new JSONArray(l.cellules()).toString(), tronquer(l.pscode(), 40),
                tronquer(l.designation(), 255), tronquer(l.cip(), 40), l.quantite(), tronquer(l.prixBrut(), 60),
                l.prix(), tronquer(l.motif(), 500), l.commentaire() };
    }

    /* ========================================================= lecture */

    /** Derniere liste enregistree d'un filtre, avec sa collecte ; reclamations vide si aucune. */
    @SuppressWarnings("unchecked")
    public JSONObject lireListe(String filtre) {
        String f = ReclamationsCollecteur.filtre(filtre);
        List<Object[]> l = em
                .createNativeQuery("SELECT " + COLONNES_REC
                        + " FROM extranet_reclamation WHERE nature = ?1 AND filtre = ?2 ORDER BY rang, id")
                .setParameter(1, LISTE).setParameter(2, f).getResultList();
        JSONArray a = new JSONArray();
        Object collecteId = null, collecteLe = null;
        for (Object[] o : l) {
            a.put(depuisBase(o, null).toJson());
            collecteId = o[11];
            collecteLe = o[12];
        }
        return new JSONObject().put("filtre", f)
                .put("collecteId", collecteId == null ? JSONObject.NULL : entierLong(collecteId))
                .put("collecteLe", collecteLe == null ? JSONObject.NULL : collecteLe.toString())
                .put("nombre", a.length()).put("reclamations", a);
    }

    /**
     * Dernier detail enregistre d'une reclamation, avec ses lignes, sa collecte et la trace de son PDF ; null sinon.
     */
    @SuppressWarnings("unchecked")
    public JSONObject lireDetail(String id, String eta, String appl) {
        ReclamationsCollecteur.parametres(id, eta, appl);
        List<Object[]> l = em
                .createNativeQuery("SELECT " + COLONNES_REC + " FROM extranet_reclamation WHERE nature = ?1"
                        + " AND rec_id = ?2 AND eta = ?3 AND appl = ?4 ORDER BY id DESC LIMIT 1")
                .setParameter(1, DETAIL).setParameter(2, id).setParameter(3, eta).setParameter(4, appl).getResultList();
        if (l.isEmpty()) {
            return null;
        }
        Object[] o = l.get(0);
        List<Object[]> lignes = em
                .createNativeQuery("SELECT " + COLONNES_LIGNE
                        + " FROM extranet_reclamation_ligne WHERE reclamation_id = ?1 ORDER BY position, id")
                .setParameter(1, o[0]).getResultList();
        List<LigneReclamationUbipharm> ls = new ArrayList<>();
        for (Object[] x : lignes) {
            ls.add(ligneDepuisBase(x));
        }
        JSONObject doc = lireDocument(id, eta, appl);
        return depuisBase(o, ls).toJson().put("collecteId", o[11] == null ? JSONObject.NULL : entierLong(o[11]))
                .put("collecteLe", o[12] == null ? JSONObject.NULL : o[12].toString())
                .put("pdf", doc == null ? JSONObject.NULL : doc);
    }

    /** Trace du PDF d'une reclamation (jamais les octets) ; null si aucun. */
    @SuppressWarnings("unchecked")
    public JSONObject lireDocument(String id, String eta, String appl) {
        Map<String, String> p = ReclamationsCollecteur.parametres(id, eta, appl);
        List<Object[]> l = em.createNativeQuery("SELECT id, chemin_source, parametres, type_contenu, taille, sha256,"
                + " fichier, collecte_id, collecte_le FROM extranet_document WHERE source = ?1 AND type_document = ?2"
                + " AND parametres = ?3 ORDER BY id DESC LIMIT 1").setParameter(1, SourceExtranet.UBIPHARM.name())
                .setParameter(2, TYPE_PDF).setParameter(3, parametres(p)).getResultList();
        if (l.isEmpty()) {
            return null;
        }
        Object[] o = l.get(0);
        return new JSONObject().put("id", entierLong(o[0])).put("cheminSource", o[1]).put("parametres", o[2])
                .put("typeContenu", o[3] == null ? JSONObject.NULL : o[3]).put("taille", entierLong(o[4]))
                .put("sha256", o[5]).put("fichier", o[6])
                .put("collecteId", o[7] == null ? JSONObject.NULL : entierLong(o[7]))
                .put("collecteLe", o[8] == null ? JSONObject.NULL : o[8].toString());
    }

    /** Reclamation relue : colonnes COLONNES_REC (id technique en 0, ignore). */
    static ReclamationUbipharm depuisBase(Object[] o, List<LigneReclamationUbipharm> lignes) {
        List<String> entetes = null;
        if (o[10] != null) {
            entetes = new ArrayList<>();
            for (Object e : new JSONArray(o[10].toString())) {
                entetes.add(e == JSONObject.NULL ? null : e.toString());
            }
        }
        return new ReclamationUbipharm(s(o[1]), s(o[2]), s(o[3]), s(o[4]), s(o[5]), s(o[6]), s(o[7]), s(o[8]), s(o[9]),
                entetes, lignes);
    }

    /** Ligne relue : colonnes COLONNES_LIGNE. */
    static LigneReclamationUbipharm ligneDepuisBase(Object[] o) {
        List<String> cellules = new ArrayList<>();
        for (Object c : new JSONArray(o[1].toString())) {
            cellules.add(c == JSONObject.NULL ? null : c.toString());
        }
        return new LigneReclamationUbipharm(((Number) o[0]).intValue(), cellules, s(o[2]), s(o[3]), s(o[4]),
                o[5] == null ? null : ((Number) o[5]).intValue(), s(o[6]), decimal(o[7]), s(o[8]), s(o[9]));
    }

    /** Decimal relu sans zeros de stockage (2736.0000 -> 2736), jamais en notation exponentielle. */
    static BigDecimal decimal(Object o) {
        if (o == null) {
            return null;
        }
        BigDecimal b = o instanceof BigDecimal ? (BigDecimal) o : new BigDecimal(o.toString());
        b = b.stripTrailingZeros();
        return b.scale() < 0 ? b.setScale(0) : b;
    }

    private static String s(Object o) {
        return o == null ? null : o.toString();
    }

    private static long entierLong(Object o) {
        return o instanceof BigInteger ? ((BigInteger) o).longValue() : ((Number) o).longValue();
    }

    static String tronquer(String s, int n) {
        return s == null || s.length() <= n ? s : s.substring(0, n);
    }
}
