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
const generateEmailBtn = document.getElementById('generateEmailBtn')
const clearFieldsBtn = document.getElementById('clearFieldsBtn')
const toInput = document.getElementById('toEmails')
const managerEmailInput = document.getElementById('managerEmail')
const signatureNameInput = document.getElementById('signatureName')
const signatureEmailInput = document.getElementById('signatureEmail')

let companyIconDataUrl = ''
let companyIconLoadAttempted = false
const companyIconCid = 'companyicon@local'

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

function escapeHtml(str){
  const map = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }
  return (str || '').replace(/[&<>"']/g,s=>map[s])
}

function parseDataUrl(dataUrl){
  const m = /^data:(.*?);base64,(.*)$/.exec(dataUrl || '')
  if(!m) return null
  const mime = m[1] || 'application/octet-stream'
  const base64 = m[2]
  let ext = ''
  if(/png/i.test(mime)) ext = '.png'
  else if(/jpe?g/i.test(mime)) ext = '.jpg'
  else if(/gif/i.test(mime)) ext = '.gif'
  else if(/bmp/i.test(mime)) ext = '.bmp'
  else if(/svg/i.test(mime)) ext = '.svg'
  return { mime, base64, ext }
}

function buildSignaturePlain(name,email){
  const lines=['Regards,','', name || 'Signature Fullname','Platform Operations | GOCC']
  if(email) lines.push(`Email ${email}`)
  return lines.join('\n')
}

function buildSignatureHtml(name,email,icon){
  const safeName = escapeHtml(name || 'Signature Fullname')
  const safeEmail = email ? escapeHtml(email) : ''
  let iconImg = ''
  if(icon && icon.mode === 'cid' && icon.cid){
    iconImg = `<img src="cid:${icon.cid}" alt="Company icon" style="height:48px;width:auto;object-fit:contain;">`
    console.log('Using CID icon:', icon.cid)
  }else if(icon && icon.mode === 'data' && icon.dataUrl){
    iconImg = `<img src="${icon.dataUrl}" alt="Company icon" style="height:48px;width:auto;object-fit:contain;">`
    console.log('Using data URL icon, length:', icon.dataUrl.length)
  }else{
    console.log('No icon available:', icon)
  }
  return `<div style="margin-top:12px;">
    <div style="font-weight:700;">Regards,</div>
    <div style="font-weight:700;margin-top:6px;">${safeName}</div>
    <div>Platform Operations | GOCC</div>
    ${safeEmail ? `<div>Email ${safeEmail}</div>` : ''}
    ${iconImg ? `<div style="margin-top:8px;">${iconImg}</div>` : ''}
  </div>`
}

function buildHtmlBody(mainText,name,email,icon,textColor='#0b1220'){
  const safeMain = escapeHtml(mainText).replace(/\n/g,'<br>')
  const mainHtml = `<div>${safeMain}</div>`
  const signatureHtml = buildSignatureHtml(name,email,icon)
  return `<div style="font-family:'Segoe UI', Arial, sans-serif;font-size:14px;line-height:1.5;color:${textColor};">${mainHtml}${signatureHtml}</div>`
}

function buildBodies(options={}){
  const { iconMode='data', iconDataUrl='', iconCid='', textColor='#0b1220' } = options
  const c = (typeof changeNumber !== 'undefined' && changeNumber && changeNumber.value) ? changeNumber.value.trim() : ''
  const name = signatureNameInput && signatureNameInput.value ? signatureNameInput.value.trim() : ''
  const sigEmail = signatureEmailInput && signatureEmailInput.value ? signatureEmailInput.value.trim() : ''
  const main = buildMsg(ritm.value.trim(), c, requestedFor.value.trim(), avdName.value.trim(), modifyStandardFor.value.trim())
  const plainSig = buildSignaturePlain(name, sigEmail)
  const plainBody = `${main}\n\n${plainSig}`.trim()
  const icon = iconMode === 'cid' && iconCid ? { mode:'cid', cid: iconCid } : { mode:'data', dataUrl: iconDataUrl || companyIconDataUrl }
  console.log('buildBodies icon:', icon.mode, icon.dataUrl ? 'dataUrl length: ' + icon.dataUrl.length : '', icon.cid || '')
  const htmlBody = buildHtmlBody(main, name, sigEmail, icon, textColor)
  return { plainBody, htmlBody }
}

async function loadCompanyIcon(){
  if(companyIconLoadAttempted) return companyIconDataUrl
  companyIconLoadAttempted = true
  try{
    const res = await fetch('company_icon.png')
    if(!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    companyIconDataUrl = await new Promise((resolve,reject)=>{
      const reader = new FileReader()
      reader.onloadend = ()=>resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    console.log('Company icon loaded via fetch, length:', companyIconDataUrl.length)
  }catch(err){
    console.warn('Unable to load company_icon.png via fetch, trying image fallback', err)
    companyIconDataUrl = await loadCompanyIconViaImageFallback()
    console.log('Company icon loaded via fallback, length:', companyIconDataUrl.length)
  }
  return companyIconDataUrl
}

function loadCompanyIconViaImageFallback(){
  return new Promise(resolve=>{
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = ()=>{
      try{
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img,0,0)
        const dataUrl = canvas.toDataURL('image/png')
        resolve(dataUrl)
      }catch(e){
        console.warn('Image fallback failed', e)
        resolve('')
      }
    }
    img.onerror = ()=>resolve('')
    img.src = 'company_icon.png'
  })
}

function buildMsg(r,c,f,a,m){
  const changeLine = c ? `Change Number: ${c}\n` : ''
  return `AVD Modify request has been completed.\n\nRITM number: ${r || 'N/A'}\n${changeLine}Requested for : ${f || ''}\nAVD Name: ${a || ''}\nModify standard for : ${m || ''}`
}

function updatePreview(){
  if(!preview) return
  const { htmlBody } = buildBodies({ iconMode:'data', iconDataUrl: companyIconDataUrl, textColor: '#e6eef8' })
  preview.innerHTML = htmlBody
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
  const { plainBody } = buildBodies()
  try{
    await navigator.clipboard.writeText(plainBody)
    copyBtn.textContent='✅ Copied'
    setTimeout(()=>copyBtn.textContent='📋 Copy',1500)
  }catch(e){
    // fallback
    const ta=document.createElement('textarea'); ta.value = plainBody; ta.style.position='fixed'; ta.style.left='-9999px'; document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); copyBtn.textContent='✅ Copied' } catch(e){ alert('Copy failed') }
    finally{ document.body.removeChild(ta); setTimeout(()=>copyBtn.textContent='📋 Copy',1500) }
  }
})

downloadBtn.addEventListener('click', ()=>{
  const { plainBody } = buildBodies()
  const blob=new Blob([plainBody],{type:'text/plain'})
  const url=URL.createObjectURL(blob)
  const a=document.createElement('a'); a.href=url; a.download='AVD-Modify.txt'; a.click(); URL.revokeObjectURL(url)
})

// Generate an .eml file suitable for Outlook (CC, Subject using RITM, body = preview + signature)
if(generateEmailBtn){
  generateEmailBtn.addEventListener('click', async ()=>{
    const r = ritm.value.trim()
    if(!r){ if(!confirm('RITM is empty. Continue with generic subject?')) return }

    const toVal = (toInput && toInput.value) ? toInput.value.trim() : ''
    const managerVal = (managerEmailInput && managerEmailInput.value) ? managerEmailInput.value.trim() : ''
    // base CCs
    const baseCC = ['ETS_Virtual_Connect@manulife.com','GOCC_VDI_Support_Services@manulife.com']
    // include manager(s) if provided (comma/semicolon/space separated)
    if(managerVal){
      managerVal.split(/[;,\s]+/).forEach(e=>{ if(e && !baseCC.includes(e)) baseCC.push(e) })
    }
    const cc = baseCC.join(', ')

    const subject = `${r || 'RITMxxxxxx'} | Upgrade Completed`

    const iconUrl = await loadCompanyIcon()
    const iconInfo = parseDataUrl(iconUrl)
    const useCid = !!iconInfo
    const { htmlBody } = buildBodies({ iconMode: useCid ? 'cid' : 'data', iconCid: companyIconCid, iconDataUrl: iconUrl })

    let eml = ''
    if(useCid){
      const boundary = '=_avd_' + Date.now()
      const base64Body = iconInfo.base64.match(/.{1,76}/g)?.join('\r\n') || iconInfo.base64
      const filename = `company_icon${iconInfo.ext || '.png'}`
      eml = [
        'X-Unsent: 1',
        `Subject: ${subject}`,
        `To: ${toVal}`,
        `CC: ${cc}`,
        'MIME-Version: 1.0',
        `Content-Type: multipart/related; boundary="${boundary}"`,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset="utf-8"',
        'Content-Transfer-Encoding: 8bit',
        '',
        htmlBody,
        `--${boundary}`,
        `Content-Type: ${iconInfo.mime}; name="${filename}"`,
        'Content-Transfer-Encoding: base64',
        `Content-ID: <${companyIconCid}>`,
        `Content-Disposition: inline; filename="${filename}"`,
        '',
        base64Body,
        `--${boundary}--`
      ].join('\r\n')
    }else{
      eml = [
        'X-Unsent: 1',
        `Subject: ${subject}`,
        `To: ${toVal}`,
        `CC: ${cc}`,
        'MIME-Version: 1.0',
        'Content-Type: text/html; charset="utf-8"',
        'Content-Transfer-Encoding: 8bit',
        '',
        htmlBody
      ].join('\r\n')
    }

    const blob2 = new Blob([eml], {type:'message/rfc822;charset=utf-8'})
    const filename = `${(r || 'RITM').replace(/[^\w\-]/g,'')}-Upgrade-Completed.eml`
    const url2 = URL.createObjectURL(blob2)
    const a2 = document.createElement('a'); a2.href = url2; a2.download = filename; a2.click(); URL.revokeObjectURL(url2)
    generateEmailBtn.textContent='✅ Generated'
    setTimeout(()=>generateEmailBtn.textContent='📧 Generate Email (.eml - editable draft)',1500)
  })
}

clearFieldsBtn.addEventListener('click', ()=>{
  ritm.value = requestedFor.value = avdName.value = modifyStandardFor.value = ''
  if(typeof changeNumber !== 'undefined' && changeNumber) changeNumber.value = ''
  updatePreview()
})

// attach input listeners to existing fields
const watchFields = [ritm, requestedFor, avdName, modifyStandardFor]
if(typeof changeNumber !== 'undefined' && changeNumber) watchFields.push(changeNumber)
if(signatureNameInput) watchFields.push(signatureNameInput)
if(signatureEmailInput) watchFields.push(signatureEmailInput)
watchFields.forEach(el => el.addEventListener('input', updatePreview))
if(signatureEmailInput && signatureEmailInput.tagName === 'SELECT'){
  signatureEmailInput.addEventListener('change', updatePreview)
}

// init preview
setTimeout(()=>{
  updatePreview()
  loadCompanyIcon().then(()=>{
    updatePreview()
    console.log('Preview initialized with icon')
  })
}, 100)

// listen for signature email changes from scripts.js
window.addEventListener('signatureEmailChanged', updatePreview)
