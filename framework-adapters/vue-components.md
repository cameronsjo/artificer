# Artificer + Vue 3

Vue Single-File Component starters — thin wrappers around Artificer's CSS classes.

**Setup once** (e.g. `main.ts`):

```ts
import 'artificer/artificer.css';
import 'artificer/artificer-theme.js';
import 'artificer/artificer-focus.js';   // only if using Modal
import 'artificer/artificer-icons.js';   // only if using Icon
```

---

## Button.vue

```vue
<script setup lang="ts">
defineProps<{ variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'; size?: 'sm' }>();
</script>

<template>
  <button class="btn" :class="[`btn--${variant ?? 'secondary'}`, size && `btn--${size}`]">
    <slot />
  </button>
</template>
```

## Field.vue

```vue
<script setup lang="ts">
const props = defineProps<{
  id: string; label: string; hint?: string; error?: string;
}>();
const errId  = props.error ? `${props.id}-err`  : undefined;
const hintId = !props.error && props.hint ? `${props.id}-hint` : undefined;
</script>

<template>
  <div class="field" :class="{ 'field--invalid': error }">
    <label class="field__label" :for="id">{{ label }}</label>
    <slot :id="id" :aria-invalid="error ? 'true' : undefined" :aria-describedby="errId || hintId" />
    <p v-if="error" class="field__error" :id="errId">{{ error }}</p>
    <p v-else-if="hint" class="field__hint" :id="hintId">{{ hint }}</p>
  </div>
</template>
```

Use:

```vue
<Field id="email" label="Email" hint="2–32 characters.">
  <template #default="slot">
    <input class="input" type="email" v-bind="slot" />
  </template>
</Field>
```

## Modal.vue

```vue
<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue';

const props = defineProps<{ open: boolean; title: string }>();
const emit  = defineEmits<{ (e: 'close'): void }>();

const modalRef = ref<HTMLDivElement | null>(null);
let trap: { release: () => void } | null = null;

watch(() => props.open, (open) => {
  if (open && modalRef.value && (window as any).ArtificerFocus) {
    trap = (window as any).ArtificerFocus.trap(modalRef.value, { onEscape: () => emit('close') });
  } else if (trap) {
    trap.release(); trap = null;
  }
});
onUnmounted(() => trap?.release());
</script>

<template>
  <div v-if="open" class="scrim" role="presentation" @click.self="emit('close')">
    <div ref="modalRef" class="modal" role="dialog" aria-modal="true" :aria-labelledby="`m-${title}`">
      <h2 :id="`m-${title}`" class="modal__title">{{ title }}</h2>
      <div class="modal__body"><slot /></div>
      <div class="modal__footer"><slot name="footer" /></div>
    </div>
  </div>
</template>
```

## Notification.vue

```vue
<script setup lang="ts">
defineProps<{ tier?: 'urgent' | 'attention' | 'info' | 'background'; title: string }>();
</script>

<template>
  <div class="notif" :class="`notif--${tier ?? 'info'}`" :role="tier === 'urgent' ? 'alert' : 'status'">
    <span class="dot" :class="`dot--${tier ?? 'info'}`" aria-hidden="true"></span>
    <div class="notif__body">
      <p class="notif__title">{{ title }}</p>
      <p v-if="$slots.default" class="notif__msg"><slot /></p>
    </div>
    <slot name="action" />
  </div>
</template>
```

## Icon.vue

```vue
<script setup lang="ts">
defineProps<{ name: string }>();
</script>

<template>
  <i :data-icon="name" aria-hidden="true"></i>
</template>
```

## useTheme.ts

```ts
import { ref, watch } from 'vue';

export function useTheme() {
  const theme = ref<'dark' | 'light'>(
    (document.documentElement.getAttribute('data-theme') as 'dark' | 'light') || 'dark'
  );
  watch(theme, (t) => {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('artificer-theme', t); } catch {}
  });
  return theme;
}
```

---

## Layout — use the CSS utilities directly

Vue doesn't need component wrappers for `.stack`, `.cluster`, `.grid-auto`, `.container`. Just:

```vue
<div class="container container--md">
  <div class="stack stack--lg">
    <h1 class="t-headline-lg">Settings.</h1>
    <Field id="x" label="…"><template #default="s"><input class="input" v-bind="s" /></template></Field>
    <div class="cluster cluster--end">
      <Button variant="ghost">Cancel</Button>
      <Button variant="primary">Save</Button>
    </div>
  </div>
</div>
```
