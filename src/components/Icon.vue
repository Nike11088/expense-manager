<script setup lang="ts">
import { icons } from "../icons";
defineProps<{ name: string }>();
</script>
<template>
  <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <path :d="icons[name] ?? icons.uncategorized" />
  </svg>
</template>
