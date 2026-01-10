// Simple client-side search/filter for apps
const search = document.getElementById('search');
const appsGrid = document.getElementById('appsGrid');
const cards = Array.from(document.querySelectorAll('.app-card'));

if(search){
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
}

// Cleanup leftover feed-related localStorage keys (run once on page load)
(function(){
  const prefix = 'feed_url_'
  const keysToRemove = []
  for(let i=0;i<localStorage.length;i++){
    const key = localStorage.key(i)
    if(key && key.startsWith(prefix)) keysToRemove.push(key)
  }
  if(keysToRemove.length){
    keysToRemove.forEach(k=>localStorage.removeItem(k))
    console.info('Removed leftover feed settings:', keysToRemove)
  }
})();

// Remove a small set of known saved keys (theme, signature) to ensure defaults
// NOTE: we intentionally DO NOT remove 'signatureName' here so the user's signature persists
(function(){
  const known = ['theme','signature','signature_name','user_signature']
  const removed = []
  known.forEach(k=>{ if(localStorage.getItem(k) !== null){ localStorage.removeItem(k); removed.push(k) } })
  if(removed.length) console.info('Removed saved keys:', removed)
})();

// Remove leftover agent conversation history (cleanup)
(function(){
  const k = 'agent_history'
  if(localStorage.getItem(k) !== null){
    localStorage.removeItem(k)
    console.info('Removed leftover agent_history from localStorage')
  }
})();

// Provide a manual Clear Saved Settings button on pages that include it
(function(){
  const known = ['theme','signatureName','signatureNameList','signatureNameSelected','signatureEmail','signatureEmailList','signatureEmailSelected','signature','signature_name','user_signature']
  document.addEventListener('DOMContentLoaded', ()=>{
    const btn = document.getElementById('clearSavedBtn')
    if(!btn) return
    btn.addEventListener('click', ()=>{
      if(!confirm('Clear saved settings (theme, signature) from your browser?')) return
      known.forEach(k=>localStorage.removeItem(k))
      alert('Saved settings cleared')
    })
  })
})();

// Persist signatureName and manage signature email dropdown (add/delete/select)
(function(){
  document.addEventListener('DOMContentLoaded', ()=>{
    const sigNameSelect = document.getElementById('signatureName')
    const sigNameInput = document.getElementById('newSignatureName')
    const addSigNameBtn = document.getElementById('addSignatureNameBtn')
    const deleteSigNameBtn = document.getElementById('deleteSignatureNameBtn')
    const sigEmailSelect = document.getElementById('signatureEmail')
    const sigEmailInput = document.getElementById('newSignatureEmail')
    const addSigEmailBtn = document.getElementById('addSignatureEmailBtn')
    const deleteSigEmailBtn = document.getElementById('deleteSignatureEmailBtn')
    const indicator = document.getElementById('signatureSavedIndicator')
    const fields = [
      {el: sigNameSelect, key: 'signatureNameSelected'},
      {el: sigEmailSelect, key: 'signatureEmailSelected'}
    ].filter(f=>f.el)
    if(!fields.length) return

    const loadNameList = ()=>{
      try{ const raw = localStorage.getItem('signatureNameList'); return raw ? JSON.parse(raw) : [] }catch{ return [] }
    }
    const saveNameList = (list)=>localStorage.setItem('signatureNameList', JSON.stringify(list))
    const setSelectedName = (val)=>{
      localStorage.setItem('signatureNameSelected', val || '')
      if(sigNameSelect) sigNameSelect.value = val || ''
    }
    const populateNameOptions = (selected)=>{
      if(!sigNameSelect) return
      const list = loadNameList()
      sigNameSelect.innerHTML = ''
      const placeholder = document.createElement('option')
      placeholder.value = ''
      placeholder.textContent = 'Select signature name…'
      sigNameSelect.appendChild(placeholder)
      list.forEach(name=>{
        const opt = document.createElement('option')
        opt.value = name
        opt.textContent = name
        sigNameSelect.appendChild(opt)
      })
      if(selected && list.includes(selected)) sigNameSelect.value = selected
    }

    const loadEmailList = ()=>{
      try{ const raw = localStorage.getItem('signatureEmailList'); return raw ? JSON.parse(raw) : [] }catch{ return [] }
    }
    const saveEmailList = (list)=>localStorage.setItem('signatureEmailList', JSON.stringify(list))
    const setSelectedEmail = (val)=>{
      localStorage.setItem('signatureEmailSelected', val || '')
      if(sigEmailSelect) sigEmailSelect.value = val || ''
    }
    const populateEmailOptions = (selected)=>{
      if(!sigEmailSelect) return
      const list = loadEmailList()
      sigEmailSelect.innerHTML = ''
      const placeholder = document.createElement('option')
      placeholder.value = ''
      placeholder.textContent = 'Select signature email…'
      sigEmailSelect.appendChild(placeholder)
      list.forEach(email=>{
        const opt = document.createElement('option')
        opt.value = email
        opt.textContent = email
        sigEmailSelect.appendChild(opt)
      })
      if(selected && list.includes(selected)) sigEmailSelect.value = selected
    }

    const updateIndicator = ()=>{
      if(!indicator) return
      const hasSaved = fields.some(({key})=>{
        const stored = localStorage.getItem(key)
        return !!stored
      }) || fields.some(({el})=>el && el.value && el.value.trim())
      if(hasSaved){
        indicator.classList.add('visible')
        indicator.setAttribute('aria-hidden','false')
      }else{
        indicator.classList.remove('visible')
        indicator.setAttribute('aria-hidden','true')
      }
    }

    // hydrate name list & selection; migrate legacy single name
    const storedNameList = loadNameList()
    const legacyName = localStorage.getItem('signatureName')
    if(legacyName && !storedNameList.includes(legacyName)) storedNameList.push(legacyName)
    saveNameList(storedNameList)
    const storedSelectedName = localStorage.getItem('signatureNameSelected') || legacyName || ''
    populateNameOptions(storedSelectedName)
    if(storedSelectedName && sigNameSelect) sigNameSelect.value = storedSelectedName

    // hydrate email list & selection; migrate legacy single email
    const storedList = loadEmailList()
    const legacyEmail = localStorage.getItem('signatureEmail')
    if(legacyEmail && !storedList.includes(legacyEmail)) storedList.push(legacyEmail)
    saveEmailList(storedList)
    const storedSelected = localStorage.getItem('signatureEmailSelected') || legacyEmail || ''
    populateEmailOptions(storedSelected)
    if(storedSelected && sigEmailSelect) sigEmailSelect.value = storedSelected

    // listeners for name/email select save
    fields.forEach(({el,key})=>{
      el.addEventListener('input', ()=>{
        const v = el.value && el.value.trim()
        if(key === 'signatureNameSelected'){
          setSelectedName(v || '')
        }else if(key === 'signatureEmailSelected'){
          setSelectedEmail(v || '')
        }else{
          if(v) { localStorage.setItem(key, v) }
          else { localStorage.removeItem(key) }
        }
        updateIndicator()
      })
    })

    if(sigNameSelect){
      sigNameSelect.addEventListener('change', ()=>{
        setSelectedName(sigNameSelect.value)
        updateIndicator()
        window.dispatchEvent(new CustomEvent('signatureEmailChanged'))
      })
    }

    if(sigEmailSelect){
      sigEmailSelect.addEventListener('change', ()=>{
        setSelectedEmail(sigEmailSelect.value)
        updateIndicator()
        window.dispatchEvent(new CustomEvent('signatureEmailChanged'))
      })
    }

    // add/delete name management
    const addName = ()=>{
      if(!sigNameInput) return
      const val = sigNameInput.value && sigNameInput.value.trim()
      if(!val) return
      const list = loadNameList()
      if(!list.includes(val)){ list.push(val); saveNameList(list) }
      setSelectedName(val)
      populateNameOptions(val)
      updateIndicator()
      sigNameInput.value = ''
      window.dispatchEvent(new CustomEvent('signatureEmailChanged'))
      console.log('Added name:', val)
    }
    const deleteName = ()=>{
      if(!sigNameSelect) return
      const current = sigNameSelect.value
      if(!current) return
      const list = loadNameList().filter(e=>e!==current)
      saveNameList(list)
      setSelectedName('')
      populateNameOptions('')
      updateIndicator()
      window.dispatchEvent(new CustomEvent('signatureEmailChanged'))
      console.log('Deleted name:', current)
    }
    if(addSigNameBtn) addSigNameBtn.addEventListener('click', addName)
    if(deleteSigNameBtn) deleteSigNameBtn.addEventListener('click', deleteName)
    if(sigNameInput){
      sigNameInput.addEventListener('keydown', (e)=>{
        if(e.key === 'Enter'){ e.preventDefault(); addName() }
      })
    }

    // add/delete email management
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const addEmail = ()=>{
      if(!sigEmailInput) return
      const val = sigEmailInput.value && sigEmailInput.value.trim()
      if(!val) return
      if(!emailRegex.test(val)){ alert('Enter a valid email'); return }
      const list = loadEmailList()
      if(!list.includes(val)){ list.push(val); saveEmailList(list) }
      setSelectedEmail(val)
      populateEmailOptions(val)
      updateIndicator()
      sigEmailInput.value = ''
      window.dispatchEvent(new CustomEvent('signatureEmailChanged'))
      console.log('Added email:', val)
    }
    const deleteEmail = ()=>{
      if(!sigEmailSelect) return
      const current = sigEmailSelect.value
      if(!current) return
      const list = loadEmailList().filter(e=>e!==current)
      saveEmailList(list)
      setSelectedEmail('')
      populateEmailOptions('')
      updateIndicator()
      window.dispatchEvent(new CustomEvent('signatureEmailChanged'))
      console.log('Deleted email:', current)
    }
    if(addSigEmailBtn) addSigEmailBtn.addEventListener('click', addEmail)
    if(deleteSigEmailBtn) deleteSigEmailBtn.addEventListener('click', deleteEmail)
    if(sigEmailInput){
      sigEmailInput.addEventListener('keydown', (e)=>{
        if(e.key === 'Enter'){ e.preventDefault(); addEmail() }
      })
    }

    updateIndicator()
  })
})();


