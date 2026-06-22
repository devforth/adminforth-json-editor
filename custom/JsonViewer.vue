<template>
  <JsonViewerAfcl v-if="parsedValue !== null" :value="parsedValue" :expandDepth="1" />
  <span v-else class="text-lightInputPlaceholderText dark:text-darkInputPlaceholderText text-sm italic">—</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { JsonViewer as JsonViewerAfcl } from '@/afcl';

const props = defineProps<{
  column: any;
  record: any;
  meta: any;
}>();

const parsedValue = computed(() => {
  const raw = props.record?.[props.meta.columnName];
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
});
</script>
