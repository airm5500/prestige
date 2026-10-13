package rest.service.securite;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class SecuriteAccesServiceTest {

    @Test
    void dureeSessionEnSecondes() {
        assertEquals(43_200, SecuriteAccesService.enSecondes(720));
        assertEquals(60, SecuriteAccesService.enSecondes(1));
        assertEquals(-1, SecuriteAccesService.enSecondes(0), "0 : jamais (ancien comportement)");
        assertEquals(-1, SecuriteAccesService.enSecondes(-5));
        assertEquals(Integer.MAX_VALUE, SecuriteAccesService.enSecondes(Integer.MAX_VALUE));
    }
}
