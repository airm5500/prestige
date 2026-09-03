package rest.service.impl;

import dal.MvtTransaction;
import dal.TPreenregistrement;
import dal.TTypeReglement;
import dal.VenteReglement;
import java.util.Collections;
import java.util.List;

/**
 * Mouvement de caisse de substitution pour l'impression d'un ticket.
 *
 * Une vente terminee doit avoir un mouvement de caisse (MvtTransaction, cle = identifiant de la vente) : c'est lui qui
 * porte le net, la remise, le montant verse et la monnaie imprimes en bas du ticket. Quand la cloture a ete interrompue
 * entre le passage de la vente en « terminee » et la creation de ce mouvement, la vente existe sans lui et le ticket ne
 * pouvait plus etre imprime (NullPointerException a l'impression comme a la reimpression).
 *
 * Ce mouvement est reconstruit a partir de la vente elle-meme et de ses lignes de reglement. Il n'est JAMAIS enregistre
 * : il sert uniquement au recapitulatif du ticket, l'incident restant signale au Centre de Support pour que la caisse
 * soit verifiee.
 */
public final class MouvementCaisseSubstitution {

    private MouvementCaisseSubstitution() {
    }

    /**
     * @param vente
     *            vente terminee sans mouvement de caisse
     *
     * @return mouvement non persiste, dont tous les montants sont renseignes (jamais nuls)
     */
    public static MvtTransaction depuisVente(TPreenregistrement vente) {
        List<VenteReglement> reglements = vente.getVenteReglements() == null ? Collections.emptyList()
                : vente.getVenteReglements();
        int montant = valeur(vente.getIntPRICE());
        int remise = Math.abs(valeur(vente.getIntPRICEREMISE()));
        int net = montant - remise;
        // part reellement due par le client : la part client quand la vente en a une (assurance, carnet),
        // sinon le net de la vente (comptant)
        int aPayer = valeur(vente.getIntCUSTPART()) > 0 ? valeur(vente.getIntCUSTPART()) : net;
        int regle = reglements.stream().mapToInt(r -> valeur(r.getMontant())).sum();
        int verse = reglements.stream().mapToInt(r -> valeur(r.getMontantVerse())).sum();
        if (regle <= 0) {
            regle = Math.max(aPayer, 0);
        }
        if (verse < regle) {
            verse = regle;
        }

        MvtTransaction mouvement = new MvtTransaction();
        mouvement.setPkey(vente.getLgPREENREGISTREMENTID());
        mouvement.setReference(vente.getStrREF());
        mouvement.setPreenregistrement(vente);
        mouvement.setUser(vente.getLgUSERID());
        mouvement.setCaisse(vente.getLgUSERCAISSIERID());
        mouvement.setMagasin(vente.getLgUSERID() != null ? vente.getLgUSERID().getLgEMPLACEMENTID() : null);
        mouvement.setReglement(typeReglement(vente, reglements));
        mouvement.setMontant(montant);
        mouvement.setMontantRemise(remise);
        mouvement.setMontantNet(net);
        mouvement.setMontantPaye(regle);
        mouvement.setMontantRegle(regle);
        mouvement.setMontantVerse(verse);
        mouvement.setMontantRestant(Math.max(aPayer - regle, 0));
        mouvement.setMontantCredit(Math.max(net - aPayer, 0));
        mouvement.setMontantTva(valeur(vente.getMontantTva()));
        mouvement.setMarge(0);
        mouvement.setMontantAcc(valeur(vente.getIntACCOUNT()));
        mouvement.setAvoidAmount(valeur(vente.getIntACCOUNT()));
        mouvement.setMontantttcug(0);
        mouvement.setMontantnetug(0);
        mouvement.setMargeug(0);
        mouvement.setMontantTvaUg(0);
        mouvement.setChecked(Boolean.FALSE);
        return mouvement;
    }

    /**
     * Type de reglement de la vente : celui de sa ligne de reglement quand elle est unique, sinon celui du mode de
     * reglement de la vente, sinon celui de la premiere ligne. {@code null} si rien n'est connu.
     */
    static TTypeReglement typeReglement(TPreenregistrement vente, List<VenteReglement> reglements) {
        if (reglements.size() == 1 && reglements.get(0).getTypeReglement() != null) {
            return reglements.get(0).getTypeReglement();
        }
        if (vente.getLgREGLEMENTID() != null && vente.getLgREGLEMENTID().getLgMODEREGLEMENTID() != null
                && vente.getLgREGLEMENTID().getLgMODEREGLEMENTID().getLgTYPEREGLEMENTID() != null) {
            return vente.getLgREGLEMENTID().getLgMODEREGLEMENTID().getLgTYPEREGLEMENTID();
        }
        for (VenteReglement r : reglements) {
            if (r.getTypeReglement() != null) {
                return r.getTypeReglement();
            }
        }
        return null;
    }

    private static int valeur(Integer i) {
        return i == null ? 0 : i;
    }
}
