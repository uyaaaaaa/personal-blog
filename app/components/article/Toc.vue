<template>
  <div class="toc-container">
    <h4 class="font-bold text-main mb-4">目次</h4>
    <nav>
      <ul class="space-y-2 relative">
        <!-- Vertical connector line -->
        <div class="absolute left-[3px] top-2 bottom-2 w-[2px] bg-gray-100 -z-10"></div>
        
        <li v-for="link in links" :key="link.id" class="toc-item">
          <a 
            :href="`#${link.id}`" 
            @click.prevent="scrollTo(link.id)"
            class="block pl-4 py-1 text-sm text-sub hover:text-accent focus:text-accent transition-colors duration-200 border-l-2 border-transparent hover:border-accent focus:border-accent focus:outline-none"
          >
            {{ link.text }}
          </a>
          <!-- Nested links (h3) -->
          <ul v-if="link.children && link.children.length > 0" class="ml-2 mt-2 space-y-2">
            <li v-for="child in link.children" :key="child.id">
               <a 
                :href="`#${child.id}`" 
                @click.prevent="scrollTo(child.id)"
                class="block pl-4 py-1 text-xs text-sub hover:text-accent focus:text-accent transition-colors duration-200 focus:outline-none"
              >
                {{ child.text }}
              </a>
            </li>
          </ul>
        </li>
      </ul>
    </nav>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  links: any[]
}>()

const { scrollTo: scrollToAnchor } = useScrollTo()

const scrollTo = (id: string) => {
  const headerOffset = 80 // 64px header + 16px padding
  scrollToAnchor(id, headerOffset)
}
</script>

<style scoped>
</style>
