<template>
  <div class="flex flex-col gap-2">
    <div v-if="pairs.length" class="flex items-center gap-2">
      <span class="flex-1 text-xs font-medium text-lightInputText dark:text-darkInputText">Key</span>
      <span class="flex-1 text-xs font-medium text-lightInputText dark:text-darkInputText">Value</span>
      <span v-if="!readonly" class="w-7" />
    </div>

    <div
      v-for="(pair, index) in pairs"
      :key="index"
      class="flex items-center gap-2"
    >
      <Input
        type="text"
        v-model="pair.key"
        placeholder="key"
        fullWidth
        :readonly="readonly"
        @update:modelValue="onChanged"
      />
      <Input
        type="text"
        v-model="pair.value"
        placeholder="value"
        fullWidth
        :readonly="readonly"
        @update:modelValue="onChanged"
      />
      <button
        v-if="!readonly"
        type="button"
        @click="removePair(index)"
        class="p-1.5 rounded-default text-lightPrimary dark:text-darkDanger hover:bg-lightDanger/10 dark:hover:bg-darkDanger/10 transition-colors flex-shrink-0"
        title="Remove row"
      >
        <IconTrashBinSolid class="w-5 h-5" />
      </button>
    </div>

    <Button
      v-if="!readonly"
      type="button"
      variant="primary"
      @click="addPair"
      class="self-start mt-1"
    >
      Add row
    </Button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Input, Button } from '@/afcl';
import { IconTrashBinSolid } from '@iconify-prerendered/vue-flowbite';

const props = defineProps<{
  column: any;
  record: any;
  meta: any;
  value: any;
  readonly?: boolean;
}>();

const emit = defineEmits(['update:value', 'update:inValidity', 'update:emptiness']);

interface Pair {
  key: string;
  value: string;
}

function toDisplay(v: any): string {
  if (v === undefined) return '';
  return JSON.stringify(v);
}

function isValidJson(raw: string): boolean {
  if (!raw.trim()) return true;
  try {
    JSON.parse(raw.trim());
    return true;
  } catch {
    return false;
  }
}

function fromDisplay(raw: string): any {
  if (!raw.trim()) return '';
  return JSON.parse(raw.trim());
}

function toPairs(json: any): Pair[] {
  let obj: any;
  if (typeof json === 'string') {
    try { obj = JSON.parse(json); } catch { return []; }
  } else {
    obj = json;
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
  return Object.entries(obj).map(([key, val]) => ({ key, value: toDisplay(val) }));
}

function toObject(): Record<string, any> {
  const result: Record<string, any> = {};
  for (const pair of pairs.value) {
    if (pair.key.trim()) {
      result[pair.key.trim()] = fromDisplay(pair.value);
    }
  }
  return result;
}

function getError(): string | null {
  const keys = pairs.value.map(p => p.key.trim()).filter(Boolean);
  if (new Set(keys).size < keys.length) {
    return 'Duplicate keys are not allowed';
  }
  const badIndex = pairs.value.findIndex((p: Pair) => p.key.trim() && !isValidJson(p.value));
  if (badIndex !== -1) {
    return `Row ${badIndex + 1}: value is not valid JSON`;
  }
  return null;
}

const pairs = ref<Pair[]>(toPairs(props.value));

let skipWatch = false;

function onChanged() {
  const error = getError();
  emit('update:inValidity', error ?? false);
  if (!error) {
    skipWatch = true;
    emit('update:value', JSON.stringify(toObject()));
    emit('update:emptiness', pairs.value.length === 0);
  }
}

function addPair() {
  pairs.value.push({ key: '', value: '' });
  onChanged();
}

function removePair(index: number) {
  pairs.value.splice(index, 1);
  onChanged();
}

watch(
  () => props.value,
  (newVal) => {
    if (skipWatch) { skipWatch = false; return; }
    pairs.value = toPairs(newVal);
  },
);
</script>

