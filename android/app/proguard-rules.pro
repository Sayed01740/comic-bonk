# Keep Capacitor plugins
-keep public class com.comicbonk.app.SolanaWalletPlugin { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
  @com.getcapacitor.PluginMethod public *;
}

