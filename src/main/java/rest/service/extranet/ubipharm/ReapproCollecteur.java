package rest.service.extranet.ubipharm;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONException;
import org.json.JSONObject;
import rest.service.extranet.commun.ExtranetException;
import rest.service.extranet.commun.ParcoursDataTables;
import rest.service.extranet.commun.ReponseExtranet;
import rest.service.extranet.commun.TransportExtranet;

/**
 * Collecte complete des reapprovisionnements Ubipharm : GET {@code /ReturnProduitsReapproJSON} page par page (25
 * lignes), referer {@code /ProduitsReappro}, avec les parametres DataTables captures (plan du 07/11, §6), dans l'ordre
 * de la capture. Une version reduite de la requete n'a pas ete testee : on n'en retire rien.
 * <p>
 * Lecture seule. Aucun dedoublonnage (cle metier inconnue). Toute anomalie de pagination arrete la collecte : rien
 * n'est presente comme complet.
 */
public final class ReapproCollecteur {

    public static final String MODULE = "REAPPRO";
    public static final String CHEMIN = "/ReturnProduitsReapproJSON";
    public static final String PAGE_ORIGINE = "/ProduitsReappro";
    public static final int LONGUEUR = 25;
    static final int COLONNES = 6;

    /** Lignes lues et bilan de la lecture paginee. */
    public static final class Resultat {
        public final List<LigneReapproUbipharm> lignes;
        public final ParcoursDataTables.Bilan bilan;

        Resultat(List<LigneReapproUbipharm> lignes, ParcoursDataTables.Bilan bilan) {
            this.lignes = Collections.unmodifiableList(lignes);
            this.bilan = bilan;
        }
    }

    private ReapproCollecteur() {
    }

    public static Resultat lire(TransportExtranet t, int pagesMax) throws ExtranetException {
        if (t == null) {
            throw new IllegalArgumentException("transport");
        }
        return parcourir((start, length, draw) -> {
            ReponseExtranet r = t.lire(CHEMIN, parametres(start, length, draw), TransportExtranet.Attendu.JSON,
                    PAGE_ORIGINE);
            try {
                return new JSONObject(r.texte());
            } catch (JSONException e) {
                throw new ExtranetException(ExtranetException.Nature.REPONSE_INATTENDUE,
                        "Réponse JSON illisible sur " + CHEMIN, e);
            }
        }, pagesMax);
    }

    /**
     * Parcours a partir d'une source de pages quelconque (le transport en production, une liste en memoire en test).
     */
    static Resultat parcourir(ParcoursDataTables.Page page, int pagesMax) throws ExtranetException {
        if (pagesMax <= 0) {
            throw new IllegalArgumentException("pagesMax");
        }
        List<LigneReapproUbipharm> lignes = new ArrayList<>();
        ParcoursDataTables.Bilan bilan = ParcoursDataTables.parcourir(page, LONGUEUR, pagesMax,
                (position, cellules) -> lignes.add(ReapproParseur.ligne(position, cellules)));
        return new Resultat(lignes, bilan);
    }

    /** Parametres captures, dans l'ordre : draw, columns[0..5][...], order, start, length, search. */
    static Map<String, String> parametres(int start, int length, int draw) {
        Map<String, String> p = new LinkedHashMap<>();
        p.put("draw", String.valueOf(draw));
        for (int i = 0; i < COLONNES; i++) {
            String c = "columns[" + i + "]";
            p.put(c + "[data]", String.valueOf(i));
            p.put(c + "[name]", "");
            p.put(c + "[searchable]", String.valueOf(i == 0 || i == 2 || i == 3));
            p.put(c + "[orderable]", String.valueOf(i <= 3));
            p.put(c + "[search][value]", "");
            p.put(c + "[search][regex]", "false");
        }
        p.put("order[0][column]", "1");
        p.put("order[0][dir]", "desc");
        p.put("start", String.valueOf(start));
        p.put("length", String.valueOf(length));
        p.put("search[value]", "");
        p.put("search[regex]", "false");
        return p;
    }
}
