// Simple client-side search/filter for apps
const search = document.getElementById('search');
const appsGrid = document.getElementById('appsGrid');
const cards = Array.from(document.querySelectorAll('.app-card'));

search.addEventListener('input', (e)=>{
  const q = e.target.value.trim().toLowerCase();
  cards.forEach(card => {
    const name = card.dataset.name.toLowerCase();
    const desc = card.querySelector('p').textContent.toLowerCase();
    const match = !q || name.includes(q) || desc.includes(q);
    card.style.display = match ? '' : 'none';
  });
});

// Keyboard: focus first button when pressing '/' (like quick search shortcut)
document.addEventListener('keydown', (e)=>{
  if(e.key === '/'){
    const active = document.activeElement;
    if(active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
    e.preventDefault();
    search.focus();
  }
});



