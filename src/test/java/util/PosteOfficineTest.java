package util;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class PosteOfficineTest {

    @Test
    void adressesDeLOfficine() {
        assertTrue(PosteOfficine.estLocal("127.0.0.1"));
        assertTrue(PosteOfficine.estLocal("::1"));
        assertTrue(PosteOfficine.estLocal("192.168.1.20"));
        assertTrue(PosteOfficine.estLocal("10.0.0.5"));
        assertTrue(PosteOfficine.estLocal("172.16.4.2"));
        assertTrue(PosteOfficine.estLocal("fd12:3456::1"));
    }

    @Test
    void adressesExterieures() {
        assertFalse(PosteOfficine.estLocal("41.207.12.3"));
        assertFalse(PosteOfficine.estLocal("8.8.8.8"));
        assertFalse(PosteOfficine.estLocal("172.32.0.1"));
        assertFalse(PosteOfficine.estLocal("2001:4860::8888"));
        assertFalse(PosteOfficine.estLocal(null));
        assertFalse(PosteOfficine.estLocal(""));
        assertFalse(PosteOfficine.estLocal("exemple.com"));
    }
}
