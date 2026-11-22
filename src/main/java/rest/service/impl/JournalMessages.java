package rest.service.impl;

import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.apache.commons.lang3.StringUtils;
import org.json.JSONArray;
import org.json.JSONObject;
import rest.service.impl.whatsapp.OrigineEnvoi;

/**
 * Plan du 21/11, point 8.1 : journal des messages (SMS et WhatsApp), regles sans base.
 *
 * <ul>
 * <li>une ligne par envoi : un message WhatsApp, un SMS a un client (destinataire d'une notification qui n'est pas
 * partie par WhatsApp), un SMS au numero d'administration ;</li>
 * <li>etat : en attente, envoye, distribue, lu (WhatsApp), echec ; memes regles que la liste des avoirs
 * ({@link AvoirMessage#etat(AvoirMessage.Envoi)}) ;</li>
 * <li>compteurs : un lu est aussi distribue et envoye, un distribue aussi envoye (comme les campagnes) ;</li>
 * <li>jamais le texte du message.</li>
 * </ul>
 */
public final class JournalMessages {

    public static final String SMS = "SMS";
    public static final String WHATSAPP = "WHATSAPP";

    /* origines propres au journal (en plus de OrigineEnvoi) */
    public static final String CLOTURE_CAISSE = "CLOTURE_CAISSE";
    public static final String POINT_ACTIVITE = "POINT_ACTIVITE";
    public static final String ADMINISTRATION = "ADMINISTRATION";
    public static final String NOTIFICATION = "NOTIFICATION";

    /** Origines proposees dans le filtre, dans l'ordre de la liste. */
    public static final List<String> ORIGINES = Collections.unmodifiableList(Arrays.asList(OrigineEnvoi.AVIS,
            OrigineEnvoi.AVOIR, OrigineEnvoi.CAMPAGNE, OrigineEnvoi.RAPPEL, OrigineEnvoi.TICKET_Z, CLOTURE_CAISSE,
            POINT_ACTIVITE, OrigineEnvoi.FACTURE, OrigineEnvoi.DISCUSSION, OrigineEnvoi.LIEN, OrigineEnvoi.ESSAI,
            ADMINISTRATION, NOTIFICATION, OrigineEnvoi.NON_PRECISEE));

    public static final List<String> ETATS = Collections.unmodifiableList(Arrays.asList(AvoirMessage.EN_ATTENTE,
            AvoirMessage.ENVOYE, AvoirMessage.DISTRIBUE, AvoirMessage.LU, AvoirMessage.ECHEC));

    /** Periode la plus longue lue en une fois (jours). */
    public static final int JOURS_MAX = 93;

    private JournalMessages() {
    }

    public static String libelleOrigine(String origine) {
        if (origine == null) {
            return "Non précisée";
        }
        switch (origine) {
        case CLOTURE_CAISSE:
            return "Clôture de caisse";
        case POINT_ACTIVITE:
            return "Point d'activité";
        case ADMINISTRATION:
            return "Administration";
        case NOTIFICATION:
            return "Notification";
        default:
            return OrigineEnvoi.libelle(origine);
        }
    }

    /** Origine d'un SMS a un client, selon la categorie de sa notification et son appartenance a une campagne. */
    public static String origineSms(String categorie, boolean deCampagne) {
        if (deCampagne || "CAMPAGNE".equals(categorie)) {
            return OrigineEnvoi.CAMPAGNE;
        }
        if (categorie != null && categorie.startsWith("RAPPEL_")) {
            return OrigineEnvoi.RAPPEL;
        }
        if ("AVOIR_PRODUIT".equals(categorie)) {
            return OrigineEnvoi.AVOIR;
        }
        if ("CLOTURE_DE_CAISSE".equals(categorie)) {
            return CLOTURE_CAISSE;
        }
        return NOTIFICATION;
    }

    /** Origine d'un SMS au numero d'administration (valeur enregistree ; inconnue = Administration). */
    public static String origineAdministration(String enregistree) {
        return OrigineEnvoi.TICKET_Z.equals(enregistree) || CLOTURE_CAISSE.equals(enregistree)
                || POINT_ACTIVITE.equals(enregistree) ? enregistree : ADMINISTRATION;
    }

    /** Etat d'un message WhatsApp (OUVERT : lien wa.me ouvert, compte comme envoye). */
    public static String etatWhatsApp(String statut) {
        if (OrigineEnvoi.OUVERT.equals(statut)) {
            return AvoirMessage.ENVOYE;
        }
        return AvoirMessage.etat(new AvoirMessage.Envoi(null, null, null, StringUtils.defaultString(statut), null, null,
                null, null, null, null, null));
    }

    /** Etat d'un SMS a un client. */
    public static String etatSms(String notificationStatut, String smsStatut, String livraison, String codeErreur) {
        return AvoirMessage.etat(new AvoirMessage.Envoi(null, null, notificationStatut, null, null, null, smsStatut,
                livraison, null, codeErreur, null));
    }

    /** Etat d'un SMS au numero d'administration (ENVOYE, ECHEC, NON_ENVOYE). */
    public static String etatAdministration(String statut) {
        return "ENVOYE".equals(statut) ? AvoirMessage.ENVOYE : AvoirMessage.ECHEC;
    }

    /** Une ligne du journal. */
    public static final class Ligne {
        public final String id;
        public final Date date;
        public final String canal;
        public final String origine;
        public final String destinataire;
        public final String numero;
        public final String etat;
        public final String motif;
        public final String utilisateur;

        public Ligne(String id, Date date, String canal, String origine, String destinataire, String numero,
                String etat, String motif, String utilisateur) {
            this.id = id;
            this.date = date;
            this.canal = canal;
            this.origine = origine;
            this.destinataire = destinataire;
            this.numero = numero;
            this.etat = etat;
            this.motif = AvoirMessage.ECHEC.equals(etat) ? StringUtils.defaultIfBlank(motif,
                    SMS.equals(canal) ? "Refusé par le fournisseur SMS" : "Refusé par WhatsApp") : null;
            this.utilisateur = utilisateur;
        }
    }

    /** Filtres de l'ecran (null ou vide : tous). */
    public static final class Filtre {
        public final String canal;
        public final String origine;
        public final String etat;
        public final String recherche;

        public Filtre(String canal, String origine, String etat, String recherche) {
            this.canal = StringUtils.trimToNull(canal);
            this.origine = StringUtils.trimToNull(origine);
            this.etat = StringUtils.trimToNull(etat);
            this.recherche = StringUtils.trimToNull(recherche);
        }

        public boolean garde(Ligne l) {
            if (canal != null && !canal.equalsIgnoreCase(l.canal)) {
                return false;
            }
            if (origine != null && !origine.equals(l.origine)) {
                return false;
            }
            if (etat != null && !etat.equals(l.etat)) {
                return false;
            }
            if (recherche == null) {
                return true;
            }
            String r = sansAccent(recherche);
            String chiffres = recherche.replaceAll("[^0-9]", "");
            return sansAccent(StringUtils.defaultString(l.destinataire)).contains(r) || (chiffres.length() >= 3
                    && StringUtils.defaultString(l.numero).replaceAll("[^0-9]", "").contains(chiffres));
        }
    }

    static String sansAccent(String s) {
        return java.text.Normalizer.normalize(s, java.text.Normalizer.Form.NFD).replaceAll("\\p{M}", "")
                .toLowerCase(Locale.FRENCH).trim();
    }

    /** Lignes gardees par le filtre, de la plus recente a la plus ancienne (puis par identifiant). */
    public static List<Ligne> filtrer(List<Ligne> lignes, Filtre f) {
        List<Ligne> l = new ArrayList<>();
        for (Ligne x : lignes) {
            if (f.garde(x)) {
                l.add(x);
            }
        }
        l.sort(Comparator.comparing((Ligne x) -> x.date, Comparator.nullsFirst(Comparator.naturalOrder()))
                .thenComparing(x -> x.id, Comparator.nullsFirst(Comparator.naturalOrder())).reversed());
        return l;
    }

    /**
     * Compteurs : total, en attente, envoyes (y compris distribues et lus), distribues (y compris lus), lus, echecs.
     */
    public static Map<String, Integer> compteurs(List<Ligne> lignes) {
        Map<String, Integer> c = new LinkedHashMap<>();
        int attente = 0, envoyes = 0, distribues = 0, lus = 0, echecs = 0;
        for (Ligne l : lignes) {
            switch (l.etat) {
            case AvoirMessage.LU:
                lus++;
                distribues++;
                envoyes++;
                break;
            case AvoirMessage.DISTRIBUE:
                distribues++;
                envoyes++;
                break;
            case AvoirMessage.ENVOYE:
                envoyes++;
                break;
            case AvoirMessage.ECHEC:
                echecs++;
                break;
            default:
                attente++;
            }
        }
        c.put("total", lignes.size());
        c.put("attente", attente);
        c.put("envoyes", envoyes);
        c.put("distribues", distribues);
        c.put("lus", lus);
        c.put("echecs", echecs);
        return c;
    }

    private static String format(Date d) {
        return d == null ? "" : new SimpleDateFormat("dd/MM/yyyy HH:mm:ss").format(d);
    }

    public static JSONObject json(Ligne l) {
        return new JSONObject().put("id", l.id).put("date", format(l.date))
                .put("canal", WHATSAPP.equals(l.canal) ? "WhatsApp" : "SMS").put("origine", l.origine)
                .put("origineLibelle", libelleOrigine(l.origine))
                .put("destinataire", StringUtils.defaultString(l.destinataire))
                .put("numero", StringUtils.defaultString(l.numero)).put("etat", l.etat)
                .put("motif", StringUtils.defaultString(l.motif))
                .put("utilisateur", StringUtils.defaultString(l.utilisateur));
    }

    /** Reponse de l'ecran : une page de lignes et les compteurs de TOUTE la selection. */
    public static JSONObject page(List<Ligne> filtrees, int debut, int limite) {
        JSONArray data = new JSONArray();
        int d = Math.max(0, debut);
        int fin = Math.min(filtrees.size(), d + Math.max(1, limite));
        for (int i = d; i < fin; i++) {
            data.put(json(filtrees.get(i)));
        }
        return new JSONObject().put("success", true).put("total", filtrees.size()).put("data", data).put("compteurs",
                new JSONObject(compteurs(filtrees)));
    }

    static final String ENTETE_CSV = "Date;Canal;Origine;Destinataire;Numéro;État;Motif d'échec;Utilisateur";

    /** Export CSV (UTF-8 avec BOM, « ; ») : les memes lignes que l'ecran, dans le meme ordre, toutes pages. */
    public static byte[] csv(List<Ligne> filtrees) {
        StringBuilder sb = new StringBuilder("﻿").append(ENTETE_CSV).append("\r\n");
        for (Ligne l : filtrees) {
            JSONObject j = json(l);
            sb.append(champ(j.getString("date"))).append(';').append(champ(j.getString("canal"))).append(';')
                    .append(champ(j.getString("origineLibelle"))).append(';').append(champ(j.getString("destinataire")))
                    .append(';').append(champ(j.getString("numero"))).append(';').append(champ(j.getString("etat")))
                    .append(';').append(champ(j.getString("motif"))).append(';')
                    .append(champ(j.getString("utilisateur"))).append("\r\n");
        }
        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    /** Champ CSV entre guillemets ; une valeur qui commence par = + - @ est neutralisee (formule de tableur). */
    static String champ(String v) {
        String s = StringUtils.defaultString(v);
        if (!s.isEmpty() && "=+-@".indexOf(s.charAt(0)) >= 0) {
            s = "'" + s;
        }
        return "\"" + s.replace("\"", "\"\"") + "\"";
    }
}
