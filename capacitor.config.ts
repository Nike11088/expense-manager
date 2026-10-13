import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.nikita.expenses",
  appName: "Менеджер расходов",
  webDir: "dist",
  plugins: {
    CapacitorSQLite: { androidIsEncryption: false },
    SystemBars: {
      style: "LIGHT",
      insetsHandling: "css",
    },
    Keyboard: { resizeOnFullScreen: true },
  },
};
export default config;
