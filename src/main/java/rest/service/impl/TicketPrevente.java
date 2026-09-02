package rest.service.impl;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import util.Constant;
import util.DateConverter;

/**
 * Contenu du ticket synthetique d'une prevente : ce que l'on imprime, sans les produits.
 *
 * <p>
 * Le ticket sert a retrouver la prevente a la caisse : reference, date et heure, vendeur, les montants qui comptent, et
 * un QR code qui encode l'identifiant de la vente. Scanne dans le champ de recherche de prevente de l'ecran de vente,
 * cet identifiant rappelle la vente sans autre saisie.
 *
 * <p>
 * Pour une vente au comptant on rappelle le net a payer. Pour une vente assurance ou carnet, l'organisme, le total de
 * la vente, la part client et la part de l'organisme. La classe ne lit rien en base : elle recoit des valeurs et rend
 * des lignes, ce qui permet de la tester seule. Une ligne porte « libelle;valeur;gras » : c'est le format que le
 * service d'impression lit pour ce type de ticket.
 */
public final class TicketPrevente {

    /** Un tiers payant de la vente : son nom, son taux et sa part. */
    public static final class Organisme {
        final String nom;
        final Integer taux;
        final int montant;

        public Organisme(String nom, Integer taux, int montant) {
            this.nom = nom == null ? "" : nom;
            this.taux = taux;
            this.montant = montant;
        }
    }

    private final String typeVenteId;
    private final String reference;
    private final String dateHeure;
    private final String vendeur;
    private final int total;
    private final int remise;
    private final int partClient;
    private final List<Organisme> organismes;
    /** Vente a credit (assurance, carnet) : le beneficiaire (ayant droit, sinon le client) et son matricule. */
    private String beneficiaire = "";
    private String matricule = "";

    /**
     * @param typeVenteId
     *            1 comptant, 2 assurance, 3 carnet
     * @param reference
     *            reference de la vente (ce que la caissiere lit)
     * @param dateHeure
     *            date et heure de creation deja formatees
     * @param vendeur
     *            nom du vendeur, ou vide
     * @param total
     *            montant total de la vente
     * @param remise
     *            remise accordee, 0 s'il n'y en a pas
     * @param partClient
     *            part restant au client (vente assurance ou carnet)
     * @param organismes
     *            tiers payants de la vente, vide pour une vente au comptant
     */
    public TicketPrevente(String typeVenteId, String reference, String dateHeure, String vendeur, int total, int remise,
            int partClient, List<Organisme> organismes) {
        this.typeVenteId = typeVenteId == null ? Constant.VENTE_COMPTANT_ID : typeVenteId;
        this.reference = reference == null ? "" : reference;
        this.dateHeure = dateHeure == null ? "" : dateHeure;
        this.vendeur = vendeur == null ? "" : vendeur;
        this.total = total;
        this.remise = Math.max(0, remise);
        this.partClient = partClient;
        this.organismes = organismes == null ? Collections.emptyList() : new ArrayList<>(organismes);
    }

    /** Vente assurance ou carnet : le carnet se lit comme une assurance, avec un organisme et une part client. */
    public boolean estTiersPayant() {
        return Constant.VENTE_ASSURANCE_ID.equals(typeVenteId) || Constant.VENTE_AVEC_CARNET.equals(typeVenteId);
    }

    public TicketPrevente avecBeneficiaire(String beneficiaire, String matricule) {
        this.beneficiaire = beneficiaire == null ? "" : beneficiaire.trim();
        this.matricule = matricule == null ? "" : matricule.trim();
        return this;
    }

    /** Titre du ticket, sous l'en-tete de l'officine : en gras, bien visible. */
    public String titre() {
        return "TICKET PREVENTE N° " + reference;
    }

    /** Lignes d'en-tete : date et heure de creation, vendeur, puis beneficiaire et matricule d'une vente a credit. */
    public List<String> enTete() {
        List<String> lignes = new ArrayList<>();
        lignes.add("Date:: " + dateHeure);
        if (!vendeur.isEmpty()) {
            lignes.add("Vendeur:: " + vendeur);
        }
        if (estTiersPayant()) {
            if (!beneficiaire.isEmpty()) {
                lignes.add("Bénéficiaire:: " + beneficiaire);
            }
            if (!matricule.isEmpty()) {
                lignes.add("Matricule:: " + matricule);
            }
        }
        return lignes;
    }

    /**
     * Lignes de montants, au format « libelle;valeur;gras ».
     *
     * <p>
     * Comptant : le net a payer, arrondi au multiple de 5 comme sur le ticket de caisse. Assurance ou carnet :
     * l'organisme (ou les organismes) avec sa part, le total de la vente, la part client, la part de l'organisme.
     */
    public List<String> lignes() {
        List<String> lignes = new ArrayList<>();
        if (!estTiersPayant()) {
            int net = arrondi(total - remise);
            if (remise > 0) {
                lignes.add("Total;" + montant(total) + ";0");
                lignes.add("Remise;(-) " + montant(remise) + ";0");
            }
            lignes.add("Net à payer;" + montant(net) + ";1");
            return lignes;
        }
        String intitule = Constant.VENTE_AVEC_CARNET.equals(typeVenteId) ? "Carnet" : "Assurance";
        int partOrganismes = 0;
        for (Organisme o : organismes) {
            String taux = o.taux == null ? "" : " " + o.taux + "%";
            lignes.add(intitule + taux + ";" + o.nom + ";1");
            partOrganismes += o.montant;
        }
        if (organismes.isEmpty()) {
            lignes.add(intitule + ";;1");
            partOrganismes = total - partClient;
        }
        lignes.add("Total vente;" + montant(total) + ";0");
        if (remise > 0) {
            lignes.add("Remise;(-) " + montant(remise) + ";0");
        }
        lignes.add("Part client;" + montant(arrondi(partClient)) + ";1");
        lignes.add("Part " + intitule.toLowerCase() + ";" + montant(partOrganismes) + ";1");
        return lignes;
    }

    /** Ce que le QR code encode : l'identifiant de la vente, tel que le champ de recherche de prevente l'attend. */
    public static String contenuQrCode(String venteId) {
        return venteId == null ? "" : venteId;
    }

    private static int arrondi(int valeur) {
        if (valeur >= 0) {
            return DateConverter.arrondiModuloOfNumber(valeur, 5);
        }
        return -DateConverter.arrondiModuloOfNumber(-valeur, 5);
    }

    private static String montant(int valeur) {
        return DateConverter.amountFormat(valeur) + " F CFA";
    }
}
