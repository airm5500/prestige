package rest.service.extranet.ubipharm;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.ReponseExtranet;
import rest.service.extranet.commun.TransportExtranet;

/**
 * Collecte d'une fiche produit Ubipharm : {@code GET /SavoirPlusJSON?pscode=...} (plan du 07/11, §4, endpoint
 * confirme). Lecture seule : un seul GET par fiche, via {@link TransportExtranet}.
 * <p>
 * Le parametre {@code _} (horodatage anti-cache, §2) n'est pas envoye. Aucun Referer n'est envoye : la page d'origine
 * de l'appel n'est pas documentee et le caractere obligatoire de l'en-tete n'est pas etabli.
 */
public final class FicheProduitCollecteur {

    public static final String CHEMIN = "/SavoirPlusJSON";
    /** Lettres, chiffres, tiret ; 1 a 30 caracteres. */
    static final Pattern PSCODE = Pattern.compile("[A-Za-z0-9-]{1,30}");

    /** true si la reference peut etre envoyee a l'extranet. */
    public static boolean pscodeValide(String pscode) {
        return pscode != null && PSCODE.matcher(pscode).matches();
    }

    /**
     * Lit la fiche d'un produit.
     *
     * @throws IllegalArgumentException
     *             reference invalide : aucun appel n'est fait
     * @throws ExtranetException
     *             session absente ou expiree, transport, reponse inattendue (dont une fiche d'un autre produit)
     */
    public FicheProduitUbipharm lire(TransportExtranet t, String pscode) throws ExtranetException {
        if (!pscodeValide(pscode)) {
            throw new IllegalArgumentException(
                    "Référence produit invalide (lettres, chiffres, tiret, 1 à 30 caractères)");
        }
        Map<String, String> p = new LinkedHashMap<>();
        p.put("pscode", pscode);
        ReponseExtranet r = t.lire(CHEMIN, p, TransportExtranet.Attendu.JSON, null);
        FicheProduitUbipharm f = FicheProduitParseur.lire(r.texte());
        if (!pscode.equalsIgnoreCase(f.pscode())) {
            throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE,
                    "Fiche produit Ubipharm d'une autre référence que celle demandée (" + pscode + ")");
        }
        return f;
    }
}
