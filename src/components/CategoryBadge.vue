<script setup lang="ts">
import type { Category } from "../domain";
import Icon from "./Icon.vue";
defineProps<{ category?: Category }>();
</script>
<template>
  <span
    class="category-badge"
    :style="{ background: category?.color ?? '#9e9e9e' }"
    ><Icon :name="category?.icon ?? 'uncategorized'"
  /></span>
</template>
