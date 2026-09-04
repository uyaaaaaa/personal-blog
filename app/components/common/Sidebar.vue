<template>
  <aside class="sidebar w-full flex-shrink-0 lg:w-[300px]">
    <div class="sticky top-24 flex max-h-[calc(100vh-6rem)] flex-col gap-8 pb-8">
      <div class="flex min-h-0 flex-col">
        <slot name="toc" />
      </div>

      <div class="flex-shrink-0 rounded-lg border border-border p-6">
        <h4 class="mb-4 text-sm font-bold text-main">Design Philosophy</h4>
        <p class="text-xs leading-relaxed text-sub">
          Functional Minimalism for Experts. Focus on content and readability.
        </p>
      </div>
    </div>
  </aside>
</template>
