package rest.service;

import commonTasks.dto.ProduitCodeGeoDTO;
import java.util.List;
import javax.ejb.Local;

/** Produits par code geo (plan d'octobre, section 6) : liste filtree, en lecture seule. */
@Local
public interface ProduitsCodeGeoService {

    /** Filtres : rayon (emplacement), codes geo (debut), « sans code geo », recherche, en stock seulement. */
    class Filtre {

        public String zoneId, codeGeo, codeGeoReserve, recherche, emplacementId;
        /** "" = tous, RAYON = sans code geo rayon, RESERVE = sans code geo reserve. */
        public String sansCode = "";
        public boolean enStock;
    }

    long compter(Filtre f);

    /** limit <= 0 : toutes les lignes (exports). */
    List<ProduitCodeGeoDTO> lister(Filtre f, int start, int limit);
}
