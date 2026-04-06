<template>
  <div class="how-to-play-overlay" @click.self="$emit('close')">
    <div class="how-to-play-modal">
      <button data-testid="close-how-to-play" class="close-btn" @click="$emit('close')">&times;</button>
      <h2>How to Play</h2>
      <p>Each round, you are given a <strong>root word</strong> and a set of <strong>offered letters</strong>.</p>
      <p>Add one or more offered letters to the root word and rearrange all letters to form a new valid word.</p>
      <div class="example">
        <div class="example-label">Example</div>
        <div class="example-tiles">
          <span class="tile">R</span>
          <span class="tile">I</span>
          <span class="tile">N</span>
          <span class="tile">D</span>
          <span class="tile offered">G</span>
        </div>
        <div class="example-arrow">&darr;</div>
        <div class="example-answer">GRIND</div>
      </div>
      <ul>
        <li>11 rounds with increasing difficulty</li>
        <li>A new puzzle every day</li>
        <li>Score is based on total letters used</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
defineEmits(['close']);
</script>
