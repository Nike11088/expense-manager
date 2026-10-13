<script setup lang="ts">
import { computed, ref } from "vue";
import { useExpenses } from "../store";
import Icon from "../components/Icon.vue";
import CategoryBadge from "../components/CategoryBadge.vue";
const store = useExpenses();
const showArchived = ref(false);
const items = computed(() =>
  store.categories
    .filter((item) => showArchived.value || !item.archived)
    .sort(
      (a, b) => Number(a.archived) - Number(b.archived) || a.order - b.order,
    ),
);
</script>
<template>
  <main class="page categories-page">
    <header class="editor-toolbar">
      <RouterLink
        to="/settings"
        class="icon-button"
        aria-label="Назад в настройки"
        ><Icon name="back"
      /></RouterLink>
      <h1>Категории</h1>
    </header>
    <div class="category-list">
      <RouterLink
        v-for="category in items"
        :key="category.id"
        :to="`/settings/categories/${category.id}`"
        class="category-list-row"
        :class="{ archived: category.archived }"
        ><CategoryBadge :category="category" /><span
          >{{ category.name
          }}<small v-if="category.archived">В архиве</small></span
        ><Icon name="right"
      /></RouterLink>
    </div>
    <label class="archive-toggle"
      ><input v-model="showArchived" type="checkbox" />Показать архивные
      категории</label
    ><RouterLink
      class="fab"
      to="/settings/categories/new"
      aria-label="Создать категорию"
      ><Icon name="plus"
    /></RouterLink>
  </main>
</template>
