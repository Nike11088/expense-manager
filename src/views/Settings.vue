<script setup lang="ts">
import { ref } from "vue";
import { useExpenses } from "../store";
import type { Theme } from "../domain";
import Icon from "../components/Icon.vue";
const store = useExpenses();
const error = ref("");
const busy = ref(false);
async function changeTheme(theme: Theme) {
  error.value = "";
  busy.value = true;
  try {
    await store.setTheme(theme);
  } catch {
    error.value = "Не удалось сохранить тему. Повторите попытку.";
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <main class="page settings-page">
    <header class="page-heading">
      <h1>Настройки</h1>
      <span class="muted">Всё необходимое, ничего лишнего</span>
    </header>
    <section class="settings-section">
      <h2>Категории</h2>
      <RouterLink to="/settings/categories" class="settings-link"
        ><span class="settings-icon"><Icon name="uncategorized" /></span
        ><span
          ><strong>Управление категориями</strong
          ><small>Создание, иконки и цвета</small></span
        ><Icon name="right"
      /></RouterLink>
    </section>
    <section class="settings-section">
      <h2>Оформление</h2>
      <div class="theme-options" role="group" aria-label="Тема">
        <button
          :disabled="busy"
          :aria-pressed="store.theme === 'light'"
          :class="{ active: store.theme === 'light' }"
          @click="changeTheme('light')"
        >
          <Icon name="sun" /><span>Светлая</span
          ><Icon v-if="store.theme === 'light'" name="check" /></button
        ><button
          :disabled="busy"
          :aria-pressed="store.theme === 'dark'"
          :class="{ active: store.theme === 'dark' }"
          @click="changeTheme('dark')"
        >
          <Icon name="moon" /><span>Тёмная</span
          ><Icon v-if="store.theme === 'dark'" name="check" />
        </button>
      </div>
      <p v-if="error" class="error-message" role="alert">{{ error }}</p>
    </section>
    <p class="settings-footnote">
      Менеджер расходов<span>Рубли · Данные на этом устройстве</span>
    </p>
  </main>
</template>
