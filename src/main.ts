import { createApp } from "vue";
import { createPinia } from "pinia";
import { createRouter, createWebHashHistory } from "vue-router";
import App from "./App.vue";
import Overview from "./views/Overview.vue";
import History from "./views/History.vue";
import Settings from "./views/Settings.vue";
import ExpenseEditor from "./views/ExpenseEditor.vue";
import Categories from "./views/Categories.vue";
import CategoryEditor from "./views/CategoryEditor.vue";
import "@fontsource-variable/roboto";
import "./style.css";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", redirect: "/overview" },
    { path: "/overview", component: Overview, meta: { tab: "overview" } },
    { path: "/history", component: History, meta: { tab: "history" } },
    { path: "/settings", component: Settings, meta: { tab: "settings" } },
    { path: "/settings/categories", component: Categories },
    { path: "/settings/categories/:id", component: CategoryEditor },
    { path: "/expense/:id", component: ExpenseEditor },
    { path: "/:pathMatch(.*)*", redirect: "/overview" },
  ],
  scrollBehavior: (_to, _from, saved) => saved ?? { top: 0 },
});
createApp(App).use(createPinia()).use(router).mount("#app");

// Включается только в отдельной инструментальной сборке; исключается из release.
if (import.meta.env.VITE_NATIVE_TESTS === "1") {
  void import("../tests/native/contract").then(({ runNativeChecks }) => {
    Object.assign(window, { runNativeChecks });
  });
}
