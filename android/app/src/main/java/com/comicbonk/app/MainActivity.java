package com.comicbonk.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        Log.d("MainActivity", "Registering SolanaWalletPlugin...");
        registerPlugin(SolanaWalletPlugin.class);
        super.onCreate(savedInstanceState);
        Log.d("MainActivity", "SolanaWalletPlugin registration finished and super.onCreate called.");
    }
}
