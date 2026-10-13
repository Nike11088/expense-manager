<script setup lang="ts">
import { onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Capacitor, SystemBars, SystemBarsStyle, registerPlugin } from "@capacitor/core";
import { App as NativeApp } from "@capacitor/app";
import { useExpenses } from "./store";
import Icon from "./components/Icon.vue";

const store = useExpenses();
const route = useRoute();
const router = useRouter();
const Appearance = registerPlugin<{ apply(options: { dark: boolean }): Promise<void> }>('Appearance');
const tabs = [
  { path: "/history", name: "История", icon: "history" },
  { path: "/overview", name: "Обзор", icon: "home" },
  { path: "/settings", name: "Настройки", icon: "settings" },
];
watch(
  () => store.theme,
  async (theme) => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#303030" : "#fafafa");
    if (Capacitor.isNativePlatform()) {
      try {
        await Appearance.apply({ dark: theme === "dark" });
        await SystemBars.setStyle({
          style:
            theme === "dark" ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
        });
      } catch {
        /* Цвет веб-интерфейса уже применён. */
      }
    }
  },
  { immediate: true },
);
onMounted(async () => {
  await store.init();
  if (Capacitor.isNativePlatform()) {
    await NativeApp.addListener("backButton", () => {
      const dialog = document.querySelector<HTMLDialogElement>("dialog[open]");
      if (dialog) {
        dialog.dispatchEvent(new Event("cancel", { cancelable: true }));
        return;
      }
      if (route.meta.tab) {
        if (route.path !== "/overview") void router.replace("/overview");
        else void NativeApp.exitApp();
      } else if (route.path.startsWith("/settings/categories"))
        void router.push(
          route.params.id ? "/settings/categories" : "/settings",
        );
      else
        void router.push(
          typeof route.query.from === "string" ? route.query.from : "/overview",
        );
    });
  }
});
</script>
<template>
  <div class="app-shell">
    <main v-if="!store.ready" class="startup" aria-live="polite">
      <Icon name="chart" />
      <h1>Менеджер расходов</h1>
      <p>{{ store.error || "Открываем ваши расходы…" }}</p>
      <button v-if="store.error" class="primary-button" @click="store.init">
        Повторить
      </button>
    </main>
    <template v-else>
      <RouterView />
      <nav
        v-if="route.meta.tab"
        class="bottom-nav"
        aria-label="Основная навигация"
      >
        <RouterLink v-for="tab in tabs" :key="tab.path" :to="tab.path"
          ><Icon :name="tab.icon" /><span>{{ tab.name }}</span></RouterLink
        >
      </nav>
    </template>
  </div>
</template>
