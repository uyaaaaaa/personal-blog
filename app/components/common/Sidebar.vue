<template>
  <aside class="sidebar w-full lg:w-[300px] flex-shrink-0">
    <div class="sticky top-24 space-y-8 max-h-[calc(100vh-6rem)] overflow-y-auto pb-8">
      <!-- TOC Widget -->
      <slot name="toc" />

      <!-- Potential other widgets -->
      <div class="border border-border rounded-lg p-6">
        <h4 class="font-bold text-main mb-4 text-sm">Design Philosophy</h4>
        <p class="text-xs text-sub leading-relaxed">
          Functional Minimalism for Experts.
          Focus on content and readability.
        </p>
      </div>
    </div>
  </aside>
</template>
