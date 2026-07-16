package fr.ign.guichet;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Enregistrement du plugin natif local (serveur SPP Bluetooth Classic)
        // avant l'initialisation du bridge Capacitor.
        registerPlugin(SppServerPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
