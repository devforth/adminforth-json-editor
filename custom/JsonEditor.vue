<template>
  <div class="flex w-full min-w-0 flex-col gap-2">
    <div v-if="pairs.length" class="flex items-center gap-2">
      <span class="w-[200px] flex-shrink-0 text-xs font-medium text-lightInputText dark:text-darkInputText">Key</span>
      <span class="min-w-0 flex-1 text-xs font-medium text-lightInputText dark:text-darkInputText">Value</span>
      <span class="w-10 flex-shrink-0" />
    </div>

    <div
      v-for="(pair, index) in pairs"
      :key="index"
      class="flex items-start gap-2"
    >
      <Input
        type="text"
        v-model="pair.key"
        placeholder="key"
        fullWidth
        class="w-[200px] flex-shrink-0"
        :readonly="readonly || fixedMode"
        @update:modelValue="onChanged"
      />
      <Textarea
        v-model="pair.value"
        v-autogrow
        placeholder="value"
        rows="1"
        class="min-w-0 flex-1"
        :readonly="readonly"
        @update:modelValue="onChanged"
      />
      <button
        v-if="!readonly && !fixedMode"
        type="button"
        @click="removePair(index)"
        class="flex items-center justify-center w-10 h-10 p-1.5 rounded-default dark:text-darkDanger hover:bg-lightDanger/10 dark:hover:bg-darkDanger/10 transition-colors flex-shrink-0"
        title="Remove row"
        variant="secondary"
      >
        <IconTrashBinSolid class="w-6 h-6 text-lightInputIcons dark:text-darkInputIcons" />
      </button>
      <span v-else class="w-10 flex-shrink-0" />
    </div>

    <button
      v-if="!readonly && !fixedMode"
      type="button"
      variant="primary"
      @click="addPair"
      class="flex items-center mt-2 w-20 py-1 px-3 me-2 text-sm font-medium rounded-default text-lightInputText focus:outline-none bg-lightInputBackground rounded border border-lightInputBorder hover:bg-lightInputBackgroundHover hover:text-lightInputTextHover hover:border-lightInputBorderHover focus:z-10 focus:ring-4 focus:ring-lightInputFocusRing dark:focus:ring-darkInputFocusRing dark:bg-darkInputBackground dark:text-darkInputText dark:border-darkInputBorder dark:hover:darkInputTextHover dark:hover:bg-darkInputHover"
    >
      <IconPlusOutline class="w-4 h-4 me-2"/>
      {{ $t('Add') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { Input, Textarea, Button } from '@/afcl';
import { IconTrashBinSolid, IconPlusOutline } from '@iconify-prerendered/vue-flowbite';

function autogrow(el: HTMLTextAreaElement) {
  el.style.height = 'auto';
  // scrollHeight ignores borders, which border-box sizing includes
  const borders = el.offsetHeight - el.clientHeight;
  el.style.height = `${el.scrollHeight + borders}px`;
}

const vAutogrow = {
  mounted(el: HTMLTextAreaElement) {
    el.style.overflowY = 'hidden';
    el.style.resize = 'none';
    el.addEventListener('input', () => autogrow(el));
    nextTick(() => autogrow(el));
  },
  updated(el: HTMLTextAreaElement) {
    nextTick(() => autogrow(el));
  },
};

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
  // strings are shown raw, everything else in its JSON form
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

function fromDisplay(raw: string): any {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

function toPairs(json: any, fixedKeys?: string[]): Pair[] {
  let obj: any;
  if (typeof json === 'string') {
    try { obj = JSON.parse(json); } catch { obj = undefined; }
  } else {
    obj = json;
  }

  const isObject = obj && typeof obj === 'object' && !Array.isArray(obj);
  if (fixedKeys) {
    return fixedKeys.map(key => ({
      key,
      value: isObject && Object.prototype.hasOwnProperty.call(obj, key) ? toDisplay(obj[key]) : '',
    }));
  }

  if (!isObject) return [];
  return Object.entries(obj).map(([key, val]) => ({ key, value: toDisplay(val) }));
}

function toObject(): Record<string, any> {
  const result: Record<string, any> = {};
  for (const pair of pairs.value) {
    const key = fixedMode.value ? pair.key : pair.key.trim();
    if (fixedMode.value || key) {
      result[key] = fromDisplay(pair.value);
    }
  }
  return result;
}

function getError(): string | null {
  for (const pair of pairs.value) {
    const hasKey = !!pair.key.trim();
    const hasValue = !!pair.value.trim();
    if (!hasKey && !hasValue) {
      return 'Empty rows are not allowed';
    }
    if (!hasKey) {
      return 'Value without a key is not allowed';
    }
    if (!hasValue) {
      return 'Key without a value is not allowed';
    }
  }
  const keys = pairs.value.map(p => p.key.trim()).filter(Boolean);
  if (new Set(keys).size < keys.length) {
    return 'Duplicate keys are not allowed';
  }
  return null;
}

const fixedMode = computed(() => Array.isArray(props.meta?.fixedKeys));
const fixedKeys = computed<string[] | undefined>(() => fixedMode.value ? props.meta.fixedKeys : undefined);
const pairs = ref<Pair[]>(toPairs(props.value, fixedKeys.value));

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
    pairs.value = toPairs(newVal, fixedKeys.value);
  },
);
</script>
