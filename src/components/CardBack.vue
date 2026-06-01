<template>
  <div class="card-back" />
</template>

<style scoped>
.card-back {
  width: 40px;
  height: 56px;
  border-radius: 6px;
  border: 2px solid rgba(0, 0, 0, 0.15);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  background-color: #0d47a1;
  /* diamond mesh: outlined rotated-square tiles repeating across the whole card */
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3Cpolygon points='5,0 10,5 5,10 0,5' fill='none' stroke='%23ffffff' stroke-width='1' stroke-opacity='0.45'/%3E%3C/svg%3E");
  background-size: 10px 10px;
  background-position: center;
}

/* white inner border frame sits above the pattern */
.card-back::before {
  content: '';
  position: absolute;
  inset: 3px;
  border: 1.5px solid rgba(255, 255, 255, 0.55);
  border-radius: 2px;
  pointer-events: none;
}
</style>
