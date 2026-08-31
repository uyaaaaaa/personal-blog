<template>
  <aside class="sidebar w-full lg:w-[300px] flex-shrink-0">
    <div class="sticky top-24 flex flex-col gap-8 max-h-[calc(100vh-6rem)] pb-8">
      <div class="min-h-0 flex flex-col">
        <slot name="toc" />
      </div>

      <div class="border border-border rounded-lg p-6 flex-shrink-0">
        <h4 class="font-bold text-main mb-4 text-sm">Design Philosophy</h4>
        <p class="text-xs text-sub leading-relaxed">
          Functional Minimalism for Experts.
          Focus on content and readability.
        </p>
      </div>
    </div>
  </aside>
</template>
