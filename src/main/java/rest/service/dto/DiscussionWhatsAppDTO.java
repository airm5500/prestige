package rest.service.dto;

import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;

/**
 * Fils de discussion WhatsApp (demande du 25/10) : la liste des discussions et le fil d'un client. Le texte des
 * messages est exclu de toString : il ne doit jamais finir dans un journal.
 */
@NoArgsConstructor
@AllArgsConstructor
@ToString
@Builder
@Getter
@Setter
public class DiscussionWhatsAppDTO {

    /** Une discussion par numero : le client, le dernier message, les messages recus non lus. */
    @NoArgsConstructor
    @AllArgsConstructor
    @ToString
    @Builder
    @Getter
    @Setter
    public static class Discussion {
        private String numero;
        private String clientId;
        private String client;
        private String nomProfil;
        @ToString.Exclude
        private String dernier;
        private String dernierSens;
        private String date;
        private long nonLus;
        private long total;
        /** le client a demande l'arret (STOP) : on ne peut plus lui ecrire */
        private boolean stop;
    }

    /** Un message du fil. */
    @NoArgsConstructor
    @AllArgsConstructor
    @ToString
    @Builder
    @Getter
    @Setter
    public static class Message {
        private long id;
        private String sens;
        private String type;
        @ToString.Exclude
        private String texte;
        private String pieceNom;
        private String statut;
        private String auteur;
        private String date;
    }

    private Discussion discussion;
    @Builder.Default
    private List<Message> messages = new ArrayList<>();
}
