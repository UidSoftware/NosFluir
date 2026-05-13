'use strict'

// ── Carrega componentes compartilhados ────────────────────────────────────
async function loadComponent(id, file) {
  try {
    const res = await fetch(file)
    if (!res.ok) return
    const html = await res.text()
    const el = document.getElementById(id)
    if (el) el.innerHTML = html
  } catch (_) { /* silencioso em desenvolvimento local */ }
}

async function initPage() {
  await Promise.all([
    loadComponent('header-placeholder', '/components/header.html'),
    loadComponent('footer-placeholder', '/components/footer.html'),
  ])
  initHeader()
  initFooter()
  initScrollAnimations()

  // Inicializa formulário de agendamento, se existir
  const form = document.getElementById('formAgendamento')
  if (form) initFormAgendamento(form)

  // Mascara telefone, se existir
  const telInput = document.getElementById('telefone')
  if (telInput) initTelMask(telInput)

  // Marca link ativo na nav com base na URL atual
  markActiveNav()
}

// ── Header interatividade ─────────────────────────────────────────────────
function initHeader() {
  const header    = document.getElementById('header')
  const hamburger = document.getElementById('hamburger')
  const nav       = document.getElementById('nav')
  if (!header || !hamburger || !nav) return

  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 40)
  }, { passive: true })

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active')
    nav.classList.toggle('open')
  })

  nav.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active')
      nav.classList.remove('open')
    })
  })

  // Scroll suave + nav link ativo (apenas em single-page com âncoras)
  const navLinks = document.querySelectorAll('.nav__link[href^="#"]')
  if (navLinks.length) {
    const sections = document.querySelectorAll('section[id]')
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          navLinks.forEach(l => l.classList.remove('active'))
          const active = document.querySelector(`.nav__link[href="#${entry.target.id}"]`)
          if (active) active.classList.add('active')
        }
      })
    }, { threshold: 0.4 })
    sections.forEach(s => observer.observe(s))
  }
}

// ── Footer ────────────────────────────────────────────────────────────────
function initFooter() {
  document.querySelectorAll('.ano-footer').forEach(el => {
    el.textContent = new Date().getFullYear()
  })
}

// ── Marca nav link ativo pela URL ─────────────────────────────────────────
function markActiveNav() {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  document.querySelectorAll('.nav__link').forEach(link => {
    const href = link.getAttribute('href')
    if (!href || href.startsWith('#')) return
    const linkPath = href.replace(/\/$/, '') || '/'
    if (linkPath === path || (linkPath !== '/' && path.startsWith(linkPath))) {
      link.classList.add('active')
    }
  })
}

// ── Animate on scroll ─────────────────────────────────────────────────────
function initScrollAnimations() {
  const animElems = document.querySelectorAll(
    '.servico__card, .diferencial, .depoimento, .contato__bloco, .equipe__item, .sobre__card'
  )
  if (!animElems.length) return

  const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.classList.add('animate-in')
        }, i * 80)
        scrollObserver.unobserve(entry.target)
      }
    })
  }, { threshold: 0.1 })

  animElems.forEach(el => scrollObserver.observe(el))
}

// ── Formulário de agendamento experimental ───────────────────────────────
const API_URL = '/api'

const DOW_DIA_SITE = { 1:'seg', 2:'ter', 3:'qua', 4:'qui', 5:'sex' }
const MES_PT_SITE  = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']

function gerarSemanasSite(n) {
  const hoje = new Date(), dow = hoje.getDay()
  const seg  = new Date(hoje)
  seg.setDate(hoje.getDate() - (dow === 0 ? 6 : dow - 1))
  const semanas = []
  for (let w = 0; w < n; w++) {
    const sem = []
    for (let d = 0; d < 5; d++) {
      const dt = new Date(seg)
      dt.setDate(seg.getDate() + w * 7 + d)
      sem.push({ iso: dt.toISOString().slice(0,10), dt, dia: DOW_DIA_SITE[dt.getDay()] })
    }
    semanas.push(sem)
  }
  return semanas
}

function renderCalendario(slots) {
  const container   = document.getElementById('calContainer')
  const horariosCnt = document.getElementById('horariosContainer')
  if (!container) return

  const byDia = {}
  slots.forEach(s => { if (!byDia[s.slot_dia_semana]) byDia[s.slot_dia_semana] = []; byDia[s.slot_dia_semana].push(s) })

  const semanas  = gerarSemanasSite(4)
  const hojeStr  = new Date().toISOString().slice(0,10)
  const meses    = [...new Set(semanas.flat().map(c => c.dt.getMonth()))].map(m => MES_PT_SITE[m]).join(' / ')

  let foco = null  // ISO date focado

  function renderGrid() {
    let html = `<div class="cal__grid">
      <div class="cal__header-mes">${meses}</div>
      <div class="cal__dias-header">
        ${['Seg','Ter','Qua','Qui','Sex'].map(d => `<div class="cal__dia-nome">${d}</div>`).join('')}
      </div>`

    semanas.forEach(sem => {
      html += '<div class="cal__semana">'
      sem.forEach(({ iso, dt, dia }) => {
        const temSlot = (byDia[dia] || []).length > 0
        const isPast  = iso < hojeStr
        const isFoco  = foco === iso
        let cls = 'cal__cell'
        if (!isPast && temSlot) cls += ' cal__cell--disponivel'
        if (isFoco) cls += ' cal__cell--foco'
        const attrs = (!isPast && temSlot) ? `data-iso="${iso}"` : ''
        html += `<div class="${cls}" ${attrs}>${dt.getDate()}</div>`
      })
      html += '</div>'
    })
    html += '</div>'
    container.innerHTML = html

    container.querySelectorAll('.cal__cell--disponivel').forEach(cell => {
      cell.addEventListener('click', () => {
        foco = foco === cell.dataset.iso ? null : cell.dataset.iso
        renderGrid()
        renderHorarios()
      })
    })
  }

  function renderHorarios() {
    if (!foco) { horariosCnt.style.display = 'none'; return }
    const diaSel = DOW_DIA_SITE[new Date(foco + 'T00:00').getDay()]
    const slotsDia = byDia[diaSel] || []
    const dtLabel  = new Date(foco + 'T00:00').toLocaleDateString('pt-BR', { weekday:'long', day:'2-digit', month:'long' })
    horariosCnt.style.display = ''
    horariosCnt.innerHTML = `<p style="font-size:.8rem;color:var(--muted);margin-bottom:.5rem">${dtLabel}</p>`
      + slotsDia.map(s => {
        const hora = s.slot_hora.slice(0,5)
        const tagCls = `cal__horario-tag cal__horario-tag--${s.slot_modalidade}`
        const modLabel = { pilates:'Pilates', funcional:'Funcional', ambos:'Ambos' }[s.slot_modalidade]
        const vagas = `${s.vagas_disponiveis} vaga${s.vagas_disponiveis > 1 ? 's' : ''}`
        return `<button type="button" class="cal__horario-btn" data-slot="${s.slot_id}" data-hora="${hora}" data-modalidade="${s.slot_modalidade}">
          <strong>${hora}</strong>
          <span class="${tagCls}">${modLabel}</span>
          <span style="font-size:.7rem;color:var(--muted)">${vagas}</span>
        </button>`
      }).join('')

    horariosCnt.querySelectorAll('.cal__horario-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        horariosCnt.querySelectorAll('.cal__horario-btn').forEach(b => b.classList.remove('cal__horario-btn--sel'))
        btn.classList.add('cal__horario-btn--sel')
        document.getElementById('slot_id').value          = btn.dataset.slot
        document.getElementById('data_agendada').value    = foco
        document.getElementById('hora_agendada').value    = btn.dataset.hora
        document.getElementById('slot_modalidade_val').value = btn.dataset.modalidade
        const confirm = document.getElementById('slotConfirm')
        confirm.style.display = ''
        confirm.textContent   = `✓ ${dtLabel} às ${btn.dataset.hora}`

        // Se slot for 'ambos' → mostrar select de modalidade
        const modSection = document.getElementById('modalidadeSection')
        if (modSection) modSection.style.display = btn.dataset.modalidade === 'ambos' ? '' : 'none'
      })
    })
  }

  renderGrid()
}

function initFormAgendamento(form) {
  const formFields = document.getElementById('formFields')
  const formSuccess= document.getElementById('formSuccess')
  const btnSubmit  = document.getElementById('btnSubmit')
  const btnText    = document.getElementById('btnText')
  const btnLoading = document.getElementById('btnLoading')

  // Carrega slots e renderiza calendário
  fetch(`${API_URL}/slots-experimentais/?slot_ativo=true`)
    .then(r => r.json())
    .then(json => {
      const ativos = (json.results || []).filter(s => s.vagas_disponiveis > 0)
      const loading = document.getElementById('calLoading')
      if (loading) loading.remove()
      if (ativos.length === 0) {
        const cnt = document.getElementById('calContainer')
        if (cnt) cnt.innerHTML = '<p class="form__note">Nenhum horário disponível. Entre em contato pelo WhatsApp 😊</p>'
        return
      }
      renderCalendario(ativos)
    })
    .catch(() => {
      const cnt = document.getElementById('calContainer')
      if (cnt) cnt.innerHTML = '<p class="form__note">Não foi possível carregar os horários. Tente pelo WhatsApp.</p>'
    })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    const modalidade    = form.querySelector('input[name="modalidade"]:checked')?.value
    const slotId        = document.getElementById('slot_id')?.value
    const dataAgendada  = document.getElementById('data_agendada')?.value
    const horaAgendada  = document.getElementById('hora_agendada')?.value
    const slotMod       = document.getElementById('slot_modalidade_val')?.value
    const nome          = form.nome?.value.trim()
    const telefone      = form.telefone?.value.trim()
    const nascimento    = form.nascimento?.value

    // Modalidade: usa a do slot (se não for 'ambos') ou a escolhida pelo radio
    const modFinal = (slotMod && slotMod !== 'ambos') ? slotMod : modalidade

    if (!slotId)       { alert('Selecione um horário no calendário.'); return }
    if (!modFinal)     { alert('Selecione a modalidade de interesse.'); return }
    if (!nome)         { alert('Informe seu nome completo.'); return }
    if (!telefone)     { alert('Informe seu WhatsApp.'); return }
    if (!nascimento)   { alert('Informe sua data de nascimento.'); return }

    if (btnText)    btnText.style.display    = 'none'
    if (btnLoading) btnLoading.style.display = 'inline'
    if (btnSubmit)  btnSubmit.disabled       = true

    try {
      const resp = await fetch(`${API_URL}/agendamento-experimental/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot:                parseInt(slotId),
          age_nome:            nome,
          age_telefone:        telefone,
          age_nascimento:      nascimento,
          age_modalidade:      modFinal,
          age_problema_saude:  form.problema_saude?.value.trim() || null,
          age_disponibilidade: form.disponibilidade?.value.trim() || null,
          age_data_agendada:   dataAgendada,
          age_hora_agendada:   horaAgendada,
          age_origem:          'site',
        }),
      })

      if (resp.ok || resp.status === 201) {
        if (formFields)  formFields.style.display  = 'none'
        if (formSuccess) formSuccess.style.display = 'block'
      } else {
        const err = await resp.json().catch(() => ({}))
        throw new Error(Object.values(err).flat().join(' ') || 'Erro ao enviar.')
      }
    } catch (err) {
      const wppMsg = encodeURIComponent(
        `Olá! Gostaria de agendar uma aula experimental.\n\n` +
        `*Nome:* ${nome}\n*Modalidade:* ${modFinal || modalidade}\n*Tel:* ${telefone}`
      )
      alert('Não foi possível agendar agora. Você será redirecionado para o WhatsApp.')
      window.open(`https://wa.me/5534998218204?text=${wppMsg}`, '_blank')
    } finally {
      if (btnText)    btnText.style.display    = 'inline'
      if (btnLoading) btnLoading.style.display = 'none'
      if (btnSubmit)  btnSubmit.disabled       = false
    }
  })
}

// ── Máscara telefone ──────────────────────────────────────────────────────
function initTelMask(input) {
  input.addEventListener('input', function () {
    let v = this.value.replace(/\D/g, '').slice(0, 11)
    if (v.length >= 11)
      v = v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
    else if (v.length >= 7)
      v = v.replace(/(\d{2})(\d{4,5})(\d{0,4})/, '($1) $2-$3')
    else if (v.length >= 3)
      v = v.replace(/(\d{2})(\d+)/, '($1) $2')
    this.value = v
  })
}

// ── Inicializar ───────────────────────────────────────────────────────────
initPage()
