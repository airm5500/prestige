package rest.service.impl;

import java.util.ArrayList;
import java.util.List;
import util.Constant;

/**
 * Decoupage de l'ancien ticket Z en travaux d'impression (analyse du 26/11).
 *
 * <p>
 * L'ancien ticket ne dessine qu'une page par travail : au-dela de {@code BREAKING_TICKET_Z} lignes, le corps est envoye
 * en plusieurs travaux, puis le total de l'officine.
 * </p>
 */
final class DecoupageTicketZ {

    /** Nombre de lignes par travail quand le parametre est absent, nul ou negatif. */
    static final int LIGNES_PAR_DEFAUT = 40;

    /** Un travail d'impression : le type de ticket ({@code TICKET_ZZ} ou {@code TICKET_Z}) et ses lignes. */
    static final class Travail {
        final String type;
        final List<String> lignes;

        Travail(String type, List<String> lignes) {
            this.type = type;
            this.lignes = lignes;
        }
    }

    private DecoupageTicketZ() {
    }

    /**
     * Travaux a envoyer, dans l'ordre.
     * <ul>
     * <li>corps et total tiennent dans la limite : un seul travail, comme avant ;</li>
     * <li>sinon : le corps par tranches d'au plus {@code lignesParTravail} lignes, puis le total seul. Chaque ligne du
     * corps sort une fois et une seule (avant le 26/11 : premier travail de tout le corps moins une ligne, dernier
     * travail de tout le corps, donc lignes hors page et corps imprime deux fois).</li>
     * </ul>
     */
    static List<Travail> decouper(List<String> corps, List<String> pied, int lignesParTravail) {
        int limite = lignesParTravail > 0 ? lignesParTravail : LIGNES_PAR_DEFAUT;
        List<Travail> travaux = new ArrayList<>();
        int taille = corps.size();
        if (taille + pied.size() <= limite) {
            List<String> tout = new ArrayList<>(corps);
            tout.addAll(pied);
            travaux.add(new Travail(Constant.TICKET_ZZ, tout));
            return travaux;
        }
        if (taille > 0 && taille <= limite) {
            /* inchange : le corps tient dans un travail, le total suit */
            travaux.add(new Travail(Constant.TICKET_ZZ, new ArrayList<>(corps)));
        } else {
            for (int debut = 0; debut < taille; debut += limite) {
                travaux.add(new Travail(Constant.TICKET_Z,
                        new ArrayList<>(corps.subList(debut, Math.min(taille, debut + limite)))));
            }
        }
        travaux.add(new Travail(Constant.TICKET_Z, new ArrayList<>(pied)));
        return travaux;
    }
}
