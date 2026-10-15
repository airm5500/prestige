package rest.service.impl;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.security.GeneralSecurityException;
import java.util.Arrays;
import org.junit.jupiter.api.Test;

class EmpreinteChiffrementTest {

    private static final byte[] CLE = new byte[32];
    static {
        Arrays.fill(CLE, (byte) 7);
    }

    @Test
    void allerRetour() throws GeneralSecurityException {
        byte[] gabarit = "gabarit-factice-0123456789".getBytes();
        byte[] chiffre = EmpreinteServiceImpl.chiffrer(CLE, gabarit);
        assertEquals(1, chiffre[0]);
        assertEquals(1 + 12 + gabarit.length + 16, chiffre.length);
        assertArrayEquals(gabarit, EmpreinteServiceImpl.dechiffrer(CLE, chiffre));
    }

    @Test
    void deuxChiffrementsDifferents() {
        byte[] g = "meme gabarit".getBytes();
        assertFalse(Arrays.equals(EmpreinteServiceImpl.chiffrer(CLE, g), EmpreinteServiceImpl.chiffrer(CLE, g)));
    }

    @Test
    void donneeAltereeOuAutreCleRefusee() {
        byte[] chiffre = EmpreinteServiceImpl.chiffrer(CLE, "abc".getBytes());
        chiffre[chiffre.length - 1] ^= 1;
        assertThrows(GeneralSecurityException.class, () -> EmpreinteServiceImpl.dechiffrer(CLE, chiffre));
        byte[] autre = new byte[32];
        byte[] bon = EmpreinteServiceImpl.chiffrer(CLE, "abc".getBytes());
        assertThrows(GeneralSecurityException.class, () -> EmpreinteServiceImpl.dechiffrer(autre, bon));
        assertThrows(GeneralSecurityException.class, () -> EmpreinteServiceImpl.dechiffrer(CLE, new byte[5]));
    }
}
