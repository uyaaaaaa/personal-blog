<template>
  <!-- 遷移中の待ち時間を上端2pxのバーで示す。色はトークン由来のCSS変数を参照する -->
  <NuxtLoadingIndicator color="var(--color-accent)" :height="2" :throttle="200" />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
