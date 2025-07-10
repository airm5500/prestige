package rest.service.dto;

import dal.LigneResumeCaisse;
import dal.TTypeReglement;
import dal.enumeration.TypeLigneResume;
import java.math.BigDecimal;
import javax.persistence.Tuple;

/**
 *
 * @author koben
 */
public class LigneResumeCaisseDTO {

    private final long montant;
    private final String libelleReglement;
    private final String idRegelement;
    private final TypeLigneResume typeLigne;

    public LigneResumeCaisseDTO(LigneResumeCaisse ligneResumeCaisse) {
        this.montant = ligneResumeCaisse.getMontant();
        TTypeReglement reglement = ligneResumeCaisse.getTypeReglement();
        this.libelleReglement = reglement.getStrDESCRIPTION();
        this.idRegelement = reglement.getLgTYPEREGLEMENTID();
        this.typeLigne = ligneResumeCaisse.getTypeLigne();
    }

    public LigneResumeCaisseDTO(long montant, String libelleReglement, String idRegelement, TypeLigneResume typeLigne) {
        this.montant = montant;
        this.libelleReglement = libelleReglement;
        this.idRegelement = idRegelement;
        this.typeLigne = typeLigne;
    }

    public LigneResumeCaisseDTO(Tuple tuple) {
        this.montant = tuple.get("montantRegle", BigDecimal.class).longValue();
        this.idRegelement = tuple.get("type_regelement", String.class);
        this.libelleReglement = null;
        this.typeLigne = null;

    }

    public TypeLigneResume getTypeLigne() {
        return typeLigne;
    }

    public long getMontant() {
        return montant;
    }

    public String getIdRegelement() {
        return idRegelement;
    }

    public String getLibelleReglement() {
        return libelleReglement;
    }

}
