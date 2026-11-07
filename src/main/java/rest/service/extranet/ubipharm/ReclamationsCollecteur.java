package rest.service.extranet.ubipharm;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.ReponseExtranet;
import rest.service.extranet.commun.TransportExtranet;
import rest.service.extranet.commun.TransportExtranet.Attendu;

/**
 * Collecte des reclamations Ubipharm, EN LECTURE SEULE (plan du 07/11, §7, §8). Trois GET, rien d'autre : aucune
 * reclamation n'est creee, repondue ni modifiee. Les parametres sont controles AVANT tout appel.
 */
public final class ReclamationsCollecteur {

    public static final String CHEMIN_LISTE = "/ReturnReclamationsTransmisesJSON";
    public static final String CHEMIN_DETAIL = "/AfficherReclamation";
    public static final String CHEMIN_PDF = "/ReclamationPDF";

    /** Filtres confirmes : ALL (toutes), C (cloturees), V (en traitement). Celui des supprimees est inconnu. */
    public static final Set<String> FILTRES = Collections.unmodifiableSet(new TreeSet<>(List.of("ALL", "C", "V")));

    /** PDF recu : octets d'origine, empreinte, et parametres du lien source. */
    public static final class PdfReclamation {
        private final byte[] octets;
        private final String sha256;
        private final String typeContenu;
        private final Map<String, String> parametres;

        PdfReclamation(byte[] octets, String sha256, String typeContenu, Map<String, String> parametres) {
            this.octets = octets.clone();
            this.sha256 = sha256;
            this.typeContenu = typeContenu;
            this.parametres = Collections.unmodifiableMap(new LinkedHashMap<>(parametres));
        }

        public byte[] octets() {
            return octets.clone();
        }

        public int taille() {
            return octets.length;
        }

        public String sha256() {
            return sha256;
        }

        public String typeContenu() {
            return typeContenu;
        }

        /** id, eta, appl du lien source, dans cet ordre. */
        public Map<String, String> parametres() {
            return parametres;
        }

        public String cheminSource() {
            return CHEMIN_PDF;
        }
    }

    private ReclamationsCollecteur() {
    }

    /** Liste complete d'un filtre (ALL, C ou V). PAGINATION si la liste recue est incomplete. */
    public static List<ReclamationUbipharm> liste(TransportExtranet t, String filtre) throws ExtranetException {
        String f = filtre(filtre);
        Map<String, String> p = new LinkedHashMap<>();
        p.put("filtre", f);
        ReponseExtranet r = t.lire(CHEMIN_LISTE, p, Attendu.JSON, null);
        return ReclamationsParseur.liste(r.texte());
    }

    /** Detail d'une reclamation ; id, eta, appl tels que lus dans le lien de la liste. */
    public static ReclamationUbipharm detail(TransportExtranet t, String id, String eta, String appl)
            throws ExtranetException {
        Map<String, String> p = parametres(id, eta, appl);
        ReponseExtranet r = t.lire(CHEMIN_DETAIL, p, Attendu.HTML, null);
        return ReclamationsParseur.detail(r.texte(), id, eta, appl);
    }

    /**
     * PDF d'une reclamation : octets d'origine et SHA-256. Une page d'erreur ou de connexion (meme annoncee
     * {@code application/pdf}) est refusee par le transport : la signature {@code %PDF-} est exigee.
     */
    public static PdfReclamation pdf(TransportExtranet t, String id, String eta, String appl) throws ExtranetException {
        Map<String, String> p = parametres(id, eta, appl);
        ReponseExtranet r = t.lire(CHEMIN_PDF, p, Attendu.PDF, null);
        if (!r.signaturePdf()) {
            throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE, "PDF de réclamation invalide");
        }
        byte[] o = r.octets();
        return new PdfReclamation(o, sha256(o), r.typeContenu(), p);
    }

    /** Filtre controle ; IllegalArgumentException avant tout appel s'il n'est pas ALL, C ou V. */
    static String filtre(String filtre) {
        if (filtre == null || !FILTRES.contains(filtre)) {
            throw new IllegalArgumentException("Filtre de réclamations refusé (ALL, C ou V attendu)");
        }
        return filtre;
    }

    /** Parametres controles : id en chiffres, eta et appl en lettres et chiffres (1 a 10). */
    static Map<String, String> parametres(String id, String eta, String appl) {
        if (id == null || !ReclamationsParseur.ID.matcher(id).matches()) {
            throw new IllegalArgumentException("Identifiant de réclamation refusé");
        }
        if (eta == null || !ReclamationsParseur.CODE.matcher(eta).matches()) {
            throw new IllegalArgumentException("Établissement (eta) refusé");
        }
        if (appl == null || !ReclamationsParseur.CODE.matcher(appl).matches()) {
            throw new IllegalArgumentException("Application (appl) refusée");
        }
        Map<String, String> p = new LinkedHashMap<>();
        p.put("id", id);
        p.put("eta", eta);
        p.put("appl", appl);
        return p;
    }

    /**
     * Cles (id|eta|appl) des sous-listes absentes de la liste « ALL ». Un ensemble non vide signale une incoherence
     * entre filtres (a ne pas masquer).
     */
    @SafeVarargs
    public static Set<String> absentesDeTout(Collection<ReclamationUbipharm> tout,
            Collection<ReclamationUbipharm>... sousListes) {
        Set<String> cles = new HashSet<>();
        tout.forEach(r -> cles.add(r.cle()));
        Set<String> manquantes = new TreeSet<>();
        for (Collection<ReclamationUbipharm> s : sousListes) {
            for (ReclamationUbipharm r : s) {
                if (r.cle() != null && !cles.contains(r.cle())) {
                    manquantes.add(r.cle());
                }
            }
        }
        return manquantes;
    }

    static String sha256(byte[] o) {
        try {
            byte[] d = MessageDigest.getInstance("SHA-256").digest(o);
            StringBuilder sb = new StringBuilder(64);
            for (byte b : d) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
