package com.prestige.etiquettage;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.InetAddress;
import java.net.ServerSocket;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

class InstanceTest {

    @AfterEach
    void remettre() {
        System.clearProperty("server.port");
    }

    @Test
    void portLibrePris() throws Exception {
        int port;
        try (ServerSocket s = new ServerSocket(0, 1, InetAddress.getLoopbackAddress())) {
            port = s.getLocalPort();
        }
        System.setProperty("server.port", Integer.toString(port));
        assertTrue(Instance.choisirPort());
        assertEquals(Integer.toString(port), System.getProperty("server.port"));
    }

    @Test
    void portPrisParUnAutreProgramme() throws Exception {
        try (ServerSocket s = new ServerSocket(0, 1, InetAddress.getLoopbackAddress())) {
            System.setProperty("server.port", Integer.toString(s.getLocalPort()));
            assertFalse(Instance.estEtiquettage(s.getLocalPort()));
            assertTrue(Instance.choisirPort(), "ce lancement continue");
            assertEquals("0", System.getProperty("server.port"), "port libre choisi");
        }
    }
}
