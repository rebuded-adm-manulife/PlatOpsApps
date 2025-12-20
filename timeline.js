/* Timeline app v2: separated JS file */
const cannedTexts = {
  "AKS Upgrade": [
    "Pre-check in Azure portal",
    "Logged into the cluster aks-xxx-xxx-xxx and checked the version and cluster-info",
    "Checking PDB - nothing found",
    "Execute validate.sh before for aks-eas-hkg-prd",
    "Setting the parameters in Jenkins",
    "Pipeline started",
    "Pipeline failed",
    "Started re-run the pipeline",
    "AKS upgrade completed for aks-xxx-xxx-xxx",
    "Post-validation completed",
    "xx PDB with xx value, perform the back-up of pdb to yaml file",
    "Deleted the PDBs with 0 value",
    "Apply the deleted PDBs"
  ],
  "Istio Upgrade": [
    "Prevalidation check and download core configs and scripts",
    "Exported the work folder",
    "Pre-upgrade validation commands run",
    "Verify the env vars exported",
    "Scale down error pods",
    "Istio_canary_upgrade.sh executed",
    "Verified the control plane version in logs",
    "Verified all the pods are using new revision",
    "Webhook configuration started",
    "Namespace labeling started",
    "Namespace labeling completed/verification started",
    "Verification completed",
    "Istio upgrade clean-up script started",
    "Scale up error pods"
  ],
  "Config Server (RCS) Upgrade": [
    "Pre-checks done",
    "Started setting parameters to deploy cfg server (aks-xxx-xxx-xxx)",
    "Change start time",
    "Started setting parameters and running build for Release",
    "All build for release got completed",
    "Started setting parameters and running build for network",
    "All build for network got completed",
    "Post verification done",
    "Scaled down the old version",
    "Endpoints Testing Done",
    "Uninstall Old Version",
    "Post verification done"
  ],
  "HBT Upgrade": [
    "Pre_check",
    "Actual change start time",
    "Login to cluster",
    "Add artifactory repo",
    "Helm repo update",
    "Setting Parameter",
    "Set the respective values file",
    "Run upgrade to install hbt app release",
    "Run upgrade to install hbt app network",
    "Version verification",
    "Scaling down the old version",
    "Curl ping returns OK",
    "Clean up started",
    "Post verification after clean up completed",
    "Post check completed",
    "Change Completed"
  ],
  "Certificate Renewal Istio Ingress Gateway": [
    "Pre checks completed",
    "Backup existing certificate and delete the secret",
    "Re-create istio secret (ISTIO_TLS_SECRET) with the newly created cert",
    "Verify ingress pods are running",
    "Post Upgrade Verification",
    "Get the relevant secure ingress host & ports",
    "Port forward and test the connection",
    "Get rsf-hbt-app logs",
    "Unset the variable and perform curl on ext endpoint"
  ],
  "Certificate renewal for APIM": [
    "Pre-checks done",
    "started uploading certs to apim instance in azure portal",
    "Saved the uploaded certs",
    "certs uploaded successfully, expiry date updated in azure portal",
    "Start of post validation",
    "Checking of SSL in websites",
    "Post check Done",
    "Running of pipeline for updating SSL expiry in New Relic. ",
    "Pipeline completed",
    "Post Verification done in Yoda Portal- Checking of SSL expiry in New Relic"
  ]
}

// DOM
const activityType = document.getElementById('activity-type')
const cannedText = document.getElementById('canned-text')
const timezone = document.getElementById('timezone')
const timezonePreview = document.getElementById('timezone-preview')
const customText = document.getElementById('custom-text')
const changeNumber = document.getElementById('change-number')
const addBtn = document.getElementById('add-timeline-btn')
const clearActivityBtn = document.getElementById('clear-activity-btn')
const timelineList = document.getElementById('timeline-list')
const copyBtn = document.getElementById('copy-timeline-btn')
const exportBtn = document.getElementById('export-timeline-btn')
const currentActivityLabel = document.getElementById('current-activity')

const STORAGE_KEY = 'timeline_v2'
let editingId = null

// Helpers
const TZ_MAP = { HKT: 'Asia/Hong_Kong', EST: 'America/New_York', IST: 'Asia/Kolkata' }

function getTimeInTZ(tz){
  const now = new Date()
  let zone = tz
  if(tz === 'local') zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  else if(TZ_MAP[tz]) zone = TZ_MAP[tz]

  try {
    return new Intl.DateTimeFormat('en-US',{hour:'2-digit',minute:'2-digit',hour12:true,timeZone:zone}).format(now)
  }catch(e){
    // fallback to local time if given zone is invalid
    return new Intl.DateTimeFormat('en-US',{hour:'2-digit',minute:'2-digit',hour12:true}).format(now)
  }
}
function todayDate(){
  return new Date().toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'})
}
function uid(){return Math.random().toString(36).slice(2,9)}

function loadStore(){
  try{ return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {} }catch(e){return {}}
}
function saveStore(s){ localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) }

// Ensure backward compatible activity data shape: { changeNumber: '', entries: [] }
function getActivityData(store, activity){
  let d = store[activity]
  if(!d){ d = { changeNumber: '', entries: [] }; store[activity] = d }
  else if(Array.isArray(d)){ d = { changeNumber: '', entries: d }; store[activity] = d }
  else {
    if(!('entries' in d)) d.entries = []
    if(!('changeNumber' in d)) d.changeNumber = ''
  }
  return d
}

// UI
function updateCannedOptions(){
  const store = loadStore()
  const data = getActivityData(store, activityType.value)
  const list = cannedTexts[activityType.value] || []
  cannedText.innerHTML = '<option value="">-- choose --</option>'
  list.forEach(t => {
    const opt = document.createElement('option'); opt.value = t; opt.textContent = t; cannedText.appendChild(opt)
  })
  changeNumber.value = data.changeNumber || ''
}

function render(){
  const store = loadStore()
  const data = getActivityData(store, activityType.value)
  currentActivityLabel.textContent = 'Activity: ' + activityType.value + (data.changeNumber ? ' • Change: ' + data.changeNumber : '')
  const entries = data.entries || []

  timelineList.innerHTML = ''
  if(entries.length === 0){ timelineList.innerHTML = '<li class="helper">No entries yet</li>'; return }
  entries.forEach((e, idx)=>{
    const li = document.createElement('li'); li.className = 'timeline-item'; li.dataset.id = e.id

    const meta = document.createElement('div'); meta.className = 'timeline-meta'; meta.innerHTML = `${e.date}<br><strong>${e.time}</strong>`
    const content = document.createElement('div'); content.className = 'timeline-text'

    if (editingId === e.id) {
      const ta = document.createElement('textarea'); ta.className = 'edit-input'; ta.value = e.text; ta.setAttribute('aria-label','Edit timeline entry')
      content.appendChild(ta)

      const editActions = document.createElement('div'); editActions.className = 'edit-actions'
      const save = document.createElement('button'); save.className='icon-btn'; save.textContent='Save'; save.title='Save changes'
      const cancel = document.createElement('button'); cancel.className='icon-btn'; cancel.textContent='Cancel'; cancel.title='Cancel edit'
      editActions.append(save, cancel)

      li.append(meta, content, editActions)

      save.addEventListener('click', ()=> saveEdit(e.id, ta.value))
      cancel.addEventListener('click', ()=> cancelEdit())
      ta.addEventListener('keydown', (ev)=>{ if(ev.key === 'Escape') cancelEdit(); if(ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) saveEdit(e.id, ta.value) })
      setTimeout(()=> ta.focus(), 0)

    } else {
      content.textContent = e.text
      const actions = document.createElement('div'); actions.className = 'timeline-actions'
      const edit = document.createElement('button'); edit.className = 'icon-btn'; edit.textContent = 'Edit'; edit.title='Edit entry'
      const del = document.createElement('button'); del.className = 'icon-btn'; del.textContent = 'Delete'; del.title='Delete entry'
      const up = document.createElement('button'); up.className='icon-btn'; up.textContent='↑'; up.title='Move up'
      const down = document.createElement('button'); down.className='icon-btn'; down.textContent='↓'; down.title='Move down'

      actions.append(up, down, edit, del)
      li.append(meta, content, actions)

      // Event handlers
      edit.addEventListener('click', ()=>{ editEntry(e.id) })
      del.addEventListener('click', ()=>{ deleteEntry(e.id) })
      up.addEventListener('click', ()=>{ moveEntry(e.id,-1) })
      down.addEventListener('click', ()=>{ moveEntry(e.id,1) })

      // click entry to quick edit
      content.addEventListener('dblclick', ()=>{ editEntry(e.id) })
    }

    // append built list item to the list
    timelineList.appendChild(li)
  })
}

function addEntry(){
  try {
    if(!activityType || !cannedText || !customText) { alert('Form elements not found.'); return }
    console.debug('addEntry called', { activity: activityType.value, canned: cannedText.value, custom: customText.value })

    const can = (cannedText.value || '').trim()
    const custom = customText.value.trim()

    if(!can && !custom){ alert('Please choose a canned text or enter custom text'); return }
    if(can && custom){ alert('Choose either canned text or custom text (or leave canned text empty to append custom text)'); return }

    const t = can || custom
    const tz = timezone.value
    const time = getTimeInTZ(tz)
    const entry = { id: uid(), date: todayDate(), time, text: t }

    const store = loadStore()
    const data = getActivityData(store, activityType.value)
    data.entries.push(entry)
    saveStore(store)

    customText.value = ''
    cannedText.value = ''
    render()

    console.debug('entry added', entry)
  } catch (err) {
    console.error('addEntry error', err)
    alert('Add failed: ' + (err && err.message ? err.message : err))
  }
}

function editEntry(id){
  editingId = id
  render()
}

function saveEdit(id, newText){
  const store = loadStore(); const data = getActivityData(store, activityType.value); const list = data.entries || []
  const idx = list.findIndex(x=>x.id===id); if(idx===-1) { editingId = null; return }
  const text = (''+newText).trim()
  if(!text){ alert('Entry cannot be empty'); return }
  list[idx].text = text
  saveStore(store)
  editingId = null
  render()
}

function cancelEdit(){
  editingId = null
  render()
}

function deleteEntry(id){
  if(!confirm('Delete this entry?')) return
  const store = loadStore(); const data = getActivityData(store, activityType.value)
  data.entries = data.entries.filter(x=>x.id!==id); saveStore(store); render()
}

function moveEntry(id,dir){
  const store = loadStore(); const data = getActivityData(store, activityType.value); const list = data.entries || []
  const idx = list.findIndex(x=>x.id===id); if(idx===-1) return
  const newIdx = idx + dir; if(newIdx<0 || newIdx>=list.length) return
  const [item] = list.splice(idx,1); list.splice(newIdx,0,item); saveStore(store); render()
}

function clearActivity(){
  if(!confirm(`Clear timeline for '${activityType.value}'?`)) return
  const store = loadStore(); const data = getActivityData(store, activityType.value); data.entries = []; saveStore(store); render()
}

function copyTimeline(){
  const store = loadStore(); const data = getActivityData(store, activityType.value); const list = data.entries || []
  if(list.length===0){ alert('No content to copy'); return }
  const txt = composeExportText(activityType.value, list)
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(()=> alert('Copied!'), ()=> alert('Copy failed'))
  } else {
    // fallback for older browsers
    const ta = document.createElement('textarea'); ta.value = txt; ta.style.position='fixed'; ta.style.left='-9999px'; document.body.appendChild(ta); ta.select()
    try { document.execCommand('copy'); alert('Copied!') } catch(e){ alert('Copy failed') } finally { document.body.removeChild(ta) }
  }
}

function exportTimeline(){
  const store = loadStore(); const data = getActivityData(store, activityType.value); const list = data.entries || []
  if(list.length===0){ alert('No content to export'); return }
  const txt = composeExportText(activityType.value, list)
  const blob = new Blob([txt], { type: 'text/plain' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
  a.download = `${activityType.value.replace(/[^a-z0-9]+/ig,'_')}_${new Date().toISOString().slice(0,10)}.txt`; a.click()
}

function composeExportText(activity, list){
  const store = loadStore()
  const data = getActivityData(store, activity)
  const changeLine = data.changeNumber ? `Change Number: ${data.changeNumber}\n` : ''
  const header = `Timeline ${todayDate()}\nFor aks-xxx-xxx-xxx ${activity}\n${changeLine}\n`
  const lines = list.map(l=> `${l.time} ${l.text}`)
  return header + lines.join('\n')
}

// Events
activityType.addEventListener('change', ()=>{ updateCannedOptions(); render() })
addBtn.addEventListener('click', addEntry)
clearActivityBtn.addEventListener('click', clearActivity)
copyBtn.addEventListener('click', copyTimeline)
exportBtn.addEventListener('click', exportTimeline)

timezone.addEventListener('change', ()=>{
  const code = timezone.value
  const zone = code === 'local' ? Intl.DateTimeFormat().resolvedOptions().timeZone : (TZ_MAP[code] || code)
  timezonePreview.textContent = `Current: ${Intl.DateTimeFormat('en-US',{hour:'2-digit',minute:'2-digit',hour12:true,timeZone:zone}).format(new Date())} (${zone})`
})

// persist change number per activity when user edits it
changeNumber.addEventListener('input', ()=>{
  const store = loadStore()
  const data = getActivityData(store, activityType.value)
  data.changeNumber = (changeNumber.value || '').trim()
  saveStore(store)
  render()
})

// init
updateCannedOptions(); render(); timezone.dispatchEvent(new Event('change'))

// keyboard: / focuses search input in main dashboard; keep default here for convenience
