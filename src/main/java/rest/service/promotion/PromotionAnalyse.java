package rest.service.promotion;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.function.Function;

/**
 * Plan du 06/11, point 3.5 (demande du 07/11) : ventes en promotion et analyse, sans acces a la base (testees par
 * PromotionAnalyseCoherenceTest).
 * <ul>
 * <li>une ligne : boites payees = quantite - offertes ; remise = prix d'avant x quantite - montant de la ligne (pour
 * des unites gratuites, prix d'avant = prix vendu : remise = valeur des offertes), jamais negative ; inconnue (0) pour
 * une ligne vendue avant que la ligne ne garde son prix d'avant ;</li>
 * <li>regroupements par type, par promotion, par vendeur, par jour : la somme des groupes = le total ;</li>
 * <li>les 10 produits qui rapportent le plus (montant, puis boites).</li>
 * </ul>
 */
public final class PromotionAnalyse {

    public static final int TOP = 10;

    private PromotionAnalyse() {
    }

    /** Une ligne de vente en promotion. */
    public static final class Ligne {

        public final LocalDate jour;
        public final String refVente;
        public final String vendeur;
        public final String cip;
        public final String produit;
        public final String promotion;
        public final String type;
        public final String mode;
        public final Integer seuil;
        public final Integer gratuites;
        public final int quantite;
        public final int offertes;
        public final Integer prixAvant;
        public final int prixVendu;
        public final int montant;
        public final String heure;

        public Ligne(LocalDate jour, String heure, String refVente, String vendeur, String cip, String produit,
                String promotion, String type, String mode, Integer seuil, Integer gratuites, int quantite,
                int offertes, Integer prixAvant, int prixVendu, int montant) {
            this.jour = jour;
            this.heure = heure;
            this.refVente = refVente;
            this.vendeur = vendeur;
            this.cip = cip;
            this.produit = produit;
            this.promotion = promotion;
            this.type = type;
            this.mode = mode;
            this.seuil = seuil;
            this.gratuites = gratuites;
            this.quantite = quantite;
            this.offertes = offertes;
            this.prixAvant = prixAvant;
            this.prixVendu = prixVendu;
            this.montant = montant;
        }

        public int payees() {
            return quantite - offertes;
        }

        /** Remise de la ligne : prix d'avant x quantite - montant ; 0 si le prix d'avant n'est pas connu. */
        public int remise() {
            return prixAvant == null ? 0 : Math.max(0, prixAvant * quantite - montant);
        }

        /** Texte de la promotion, comme sur le ticket. */
        public String mention() {
            return PromotionLigne.mention(type, mode, seuil, gratuites, offertes);
        }
    }

    /** Totaux d'un groupe de lignes. */
    public static final class Groupe {

        public final String cle;
        private final Set<String> refs = new HashSet<>();
        public int lignes;
        public int payees;
        public int offertes;
        public long montant;
        public long remise;

        Groupe(String cle) {
            this.cle = cle;
        }

        void ajouter(Ligne l) {
            refs.add(l.refVente);
            lignes++;
            payees += l.payees();
            offertes += l.offertes;
            montant += l.montant;
            remise += l.remise();
        }

        public int ventes() {
            return refs.size();
        }
    }

    /** Resultat de l'analyse d'une periode. */
    public static final class Resultat {

        public final Groupe total = new Groupe("Total");
        public final List<Groupe> parType;
        public final List<Groupe> parPromotion;
        public final List<Groupe> parVendeur;
        public final List<Groupe> parJour;
        public final List<Groupe> top;

        Resultat(List<Groupe> parType, List<Groupe> parPromotion, List<Groupe> parVendeur, List<Groupe> parJour,
                List<Groupe> top) {
            this.parType = parType;
            this.parPromotion = parPromotion;
            this.parVendeur = parVendeur;
            this.parJour = parJour;
            this.top = top;
        }
    }

    private static List<Groupe> grouper(List<Ligne> lignes, Function<Ligne, String> cle) {
        Map<String, Groupe> m = new LinkedHashMap<>();
        for (Ligne l : lignes) {
            String k = cle.apply(l);
            m.computeIfAbsent(k == null || k.isEmpty() ? "—" : k, Groupe::new).ajouter(l);
        }
        return new ArrayList<>(m.values());
    }

    private static final Comparator<Groupe> PAR_MONTANT = Comparator.comparingLong((Groupe g) -> g.montant).reversed()
            .thenComparing(Comparator.comparingInt((Groupe g) -> g.payees + g.offertes).reversed())
            .thenComparing(g -> g.cle);

    public static Resultat analyser(List<Ligne> lignes) {
        List<Groupe> parType = grouper(lignes, l -> l.type);
        parType.sort(PAR_MONTANT);
        List<Groupe> parPromotion = grouper(lignes, l -> l.promotion);
        parPromotion.sort(PAR_MONTANT);
        List<Groupe> parVendeur = grouper(lignes, l -> l.vendeur);
        parVendeur.sort(PAR_MONTANT);
        Map<String, Groupe> jours = new TreeMap<>();
        for (Ligne l : lignes) {
            jours.computeIfAbsent(String.valueOf(l.jour), Groupe::new).ajouter(l);
        }
        List<Groupe> produits = grouper(lignes, l -> l.cip + " " + l.produit);
        produits.sort(PAR_MONTANT);
        Resultat r = new Resultat(parType, parPromotion, parVendeur, new ArrayList<>(jours.values()),
                new ArrayList<>(produits.subList(0, Math.min(TOP, produits.size()))));
        lignes.forEach(r.total::ajouter);
        return r;
    }
}
