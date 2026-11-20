package rest.service.impl;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * Plan du 19/11, point 7 : « Modifier infos client » (ventes terminees, liste et pointage des bons) enregistre sans
 * aucun changement. Avant, « Enregistrer » refaisait la vente (annulation, copie, notification, mouchard) meme si rien
 * n'avait change ; desormais rien n'est ecrit et l'ecran le signale, comme la modification de vente (code
 * SANS_CHANGEMENT).
 *
 * Regle : aucun changement si le client, l'ayant droit et les lignes de tiers payant envoyes sont ceux de la vente :
 * memes lignes (identifiant de ligne, aucune ajoutee ni retiree), meme compte, meme numero de bon, meme taux, et aucun
 * compte coche « principal » qui ne l'etait pas deja (decocher le principal ne change rien : la priorite n'est revue
 * que si un principal est designe). Dans le doute (ligne inconnue, compte designe autrement), la modification suit son
 * cours habituel.
 */
final class InfosClientSansChangement {

    private InfosClientSansChangement() {
    }

    /** Une ligne de tiers payant : de la vente (avant) ou envoyee par l'ecran (demande). */
    static final class Ligne {
        final String itemId;
        final String compteTp;
        final String numBon;
        final int taux;
        final boolean principal;

        Ligne(String itemId, String compteTp, String numBon, int taux, boolean principal) {
            this.itemId = itemId;
            this.compteTp = compteTp;
            this.numBon = numBon;
            this.taux = taux;
            this.principal = principal;
        }
    }

    private static String texte(String s) {
        return s == null ? "" : s.trim();
    }

    static boolean memeValeur(String a, String b) {
        return texte(a).equals(texte(b));
    }

    static boolean sansChangement(String clientAvant, String ayantDroitAvant, List<Ligne> avant, String clientDemande,
            String ayantDroitDemande, List<Ligne> demande) {
        if (!memeValeur(clientAvant, clientDemande) || !memeValeur(ayantDroitAvant, ayantDroitDemande)) {
            return false;
        }
        List<Ligne> a = avant == null ? new ArrayList<>() : avant;
        List<Ligne> d = demande == null ? new ArrayList<>() : demande;
        if (a.size() != d.size()) {
            return false;
        }
        Set<String> vues = new HashSet<>();
        for (Ligne l : d) {
            if (l == null || texte(l.itemId).isEmpty() || !vues.add(texte(l.itemId))) {
                return false;
            }
            Ligne origine = a.stream().filter(x -> x != null && Objects.equals(texte(x.itemId), texte(l.itemId)))
                    .findFirst().orElse(null);
            if (origine == null || !memeValeur(origine.compteTp, l.compteTp)
                    || !Objects.equals(origine.numBon == null ? "" : origine.numBon, l.numBon == null ? "" : l.numBon)
                    || origine.taux != l.taux || (l.principal && !origine.principal)) {
                return false;
            }
        }
        return true;
    }
}
