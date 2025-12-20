/* modify-email.js - improved parser and UI behavior */
const raw = document.getElementById('raw')
const parseBtn = document.getElementById('parseBtn')
const clearRawBtn = document.getElementById('clearRawBtn')
const sampleBtn = document.getElementById('sampleBtn')
const ritm = document.getElementById('ritm')
const changeNumber = document.getElementById('change-number')
const requestedFor = document.getElementById('requestedFor')
const avdName = document.getElementById('avdName')
const modifyStandardFor = document.getElementById('modifyStandardFor')
const preview = document.getElementById('preview')
const copyBtn = document.getElementById('copyBtn')
const downloadBtn = document.getElementById('downloadBtn')
const clearFieldsBtn = document.getElementById('clearFieldsBtn')

function getLines(text){return text.split(/\r?\n/).map(l=>l.trim())}
function nextNonEmpty(lines,i){let j=i+1;while(j<lines.length&&lines[j]==='')j++;return j<lines.length?j:-1}
function isHelper(line){return /^(about|More information|Click to open|Removed Template|\(empty\))|^Show/i.test(line)}

function extractLabel(text,labels){
  const lines=getLines(text)
  for(let i=0;i<lines.length;i++){
    for(let label of labels){
      if(new RegExp(`^${label}\\b`,'i').test(lines[i])){
        const inline=lines[i].match(new RegExp(`^${label}\\s*[:：\\-]?\\s*(.+)$`,'i'))
        if(inline&&inline[1]&&!/^\(ie\./i.test(inline[1]))return inline[1].trim()
        let j=nextNonEmpty(lines,i)
        while(j!==-1&&isHelper(lines[j]))j=nextNonEmpty(lines,j)
        return j!==-1?lines[j]:''
      }
    }
  }
  return ''
}

function extractRITM(text){
  let val=extractLabel(text,['RITM number','Number','Requested Item','Request item','RITM','Request #','Request No'])
  const m=text.match(/\bRITM[-_\s]*\d{4,}\b/i)
  if(m) return m[0].replace(/\s+/g,'')
  const m2=text.match(/\b(REQ|REQM|RITM)[-:\s]*\d{4,}\b/i)
  if(m2) return m2[0].replace(/\s+/g,'')
  return val
}

function extractRequestedFor(text){
  let val=extractLabel(text,['Requested for','Requested For','Requestor','Requester','Requested By','Requested By:'])
  if(val) return val
  const m=text.match(/requested\s+by\s+([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i)
  if(m) return m[1]
  const m2=text.match(/requested\s+by\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/i)
  return m2?m2[1]:''
}

function extractAVDName(text){
  let val=extractLabel(text,['VM HOSTNAME','VM Hostname','Hostname','AVD Name','VM Name','Host Name'])
  if(val) return val
  const m=text.match(/\b[A-Za-z0-9_-]+\.(?:corp|internal|svc|example)\b/i)
  if(m) return m[0]
  const m2=text.match(/\bAZVDP[JDHS][A-Z0-9]+\b/i)
  return m2?m2[0]:''
}

function extractLastSKU(text){
  const lines=getLines(text)
  let start=-1
  for(let i=0;i<lines.length;i++){if(/^VM Size Change\b/i.test(lines[i])||/^VM Size\b/i.test(lines[i])){start=i;break}}
  if(start===-1)return ''
  const skus=[]
  for(let i=start+1;i<lines.length;i++){
    if(isHelper(lines[i]))continue
    if(/^Change unused|^Additional|^Instructions|^Work notes|^Activities/i.test(lines[i]))break
    const m=lines[i].match(/\b([A-Za-z]+\d+[A-Za-z0-9_]*v?\d*)\b/)
    if(m) skus.push(m[1])
  }
  return skus.length?skus[skus.length-1].toUpperCase():''
}

function buildMsg(r,c,f,a,m){
  const changeLine = c ? `Change Number: ${c}\n` : ''
  return `AVD Modify request has been completed.\n\nRITM number: ${r || 'N/A'}\n${changeLine}Requested for : ${f || ''}\nAVD Name: ${a || ''}\nModify standard for : ${m || ''}`
}

function updatePreview(){
  const c = (typeof changeNumber !== 'undefined' && changeNumber && changeNumber.value) ? changeNumber.value.trim() : ''
  preview.textContent = buildMsg(ritm.value.trim(), c, requestedFor.value.trim(), avdName.value.trim(), modifyStandardFor.value.trim())
} 

function parse(){
  const text = (raw.value||'').trim()
  if(!text) return
  ritm.value = extractRITM(text)
  requestedFor.value = extractRequestedFor(text)
  avdName.value = extractAVDName(text)
  modifyStandardFor.value = extractLastSKU(text)
  updatePreview()
}

// UI handlers
parseBtn.addEventListener('click', parse)
clearRawBtn.addEventListener('click', ()=>{ raw.value=''; })
sampleBtn.addEventListener('click', ()=>{
  raw.value = `Request item: RITM-123456\nRequested for: John Doe\nVM Hostname: host01.corp\nVM Size Change\n  StandardA1  \n  StandardB2\nAdditional notes...`;
  parse()
})

// auto-parse on paste
raw.addEventListener('paste', (e)=>{
  setTimeout(()=>{ parse() }, 50)
})

// copy/download helpers with feedback
copyBtn.addEventListener('click', async ()=>{
  try{
    await navigator.clipboard.writeText(preview.textContent)
    copyBtn.textContent='✅ Copied'
    setTimeout(()=>copyBtn.textContent='📋 Copy',1500)
  }catch(e){
    // fallback
    const ta=document.createElement('textarea'); ta.value = preview.textContent; ta.style.position='fixed'; ta.style.left='-9999px'; document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); copyBtn.textContent='✅ Copied' } catch(e){ alert('Copy failed') }
    finally{ document.body.removeChild(ta); setTimeout(()=>copyBtn.textContent='📋 Copy',1500) }
  }
})

downloadBtn.addEventListener('click', ()=>{
  const blob=new Blob([preview.textContent],{type:'text/plain'})
  const url=URL.createObjectURL(blob)
  const a=document.createElement('a'); a.href=url; a.download='AVD-Modify.txt'; a.click(); URL.revokeObjectURL(url)
})

clearFieldsBtn.addEventListener('click', ()=>{
  ritm.value = requestedFor.value = avdName.value = modifyStandardFor.value = ''
  if(typeof changeNumber !== 'undefined' && changeNumber) changeNumber.value = ''
  updatePreview()
})

// attach input listeners to existing fields
const watchFields = [ritm, requestedFor, avdName, modifyStandardFor]
if(typeof changeNumber !== 'undefined' && changeNumber) watchFields.push(changeNumber)
watchFields.forEach(el => el.addEventListener('input', updatePreview))

// init preview
updatePreview()
