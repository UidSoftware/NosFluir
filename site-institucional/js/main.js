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

const DIA_LABELS  = { seg:'Segunda-feira', ter:'Terça-feira', qua:'Quarta-feira', qui:'Quinta-feira', sex:'Sexta-feira' }

function proximaData(diaSemana) {
  const alvo = { seg:1, ter:2, qua:3, qui:4, sex:5 }[diaSemana]
  if (!alvo) return null
  const hoje = new Date()
  let diff = alvo - hoje.getDay()
  if (diff <= 0) diff += 7
  const d = new Date(hoje)
  d.setDate(hoje.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

async function carregarSlots(modalidade) {
  const container  = document.getElementById('slotsContainer')
  const loading    = document.getElementById('slotsLoading')
  const section    = document.getElementById('slotsSection')
  if (!container) return

  container.innerHTML = '<p id="slotsLoading" class="form__note">Carregando horários...</p>'
  section.style.display = ''

  try {
    const url = `${API_URL}/slots-experimentais/?slot_ativo=true${modalidade !== 'ambos' ? `&slot_modalidade=${modalidade}` : ''}`
    const res  = await fetch(url)
    const json = await res.json()

    // inclui slots com modalidade 'ambos' mesmo quando filtrado por pilates/funcional
    const slots = (json.results || []).filter(s =>
      s.vagas_disponiveis > 0 && (
        s.slot_modalidade === modalidade ||
        s.slot_modalidade === 'ambos' ||
        modalidade === 'ambos'
      )
    )

    if (slots.length === 0) {
      container.innerHTML = '<p class="form__note">Nenhum horário disponível no momento. Entre em contato pelo WhatsApp 😊</p>'
      return
    }

    container.innerHTML = slots.map(s => {
      const dataProxima = proximaData(s.slot_dia_semana)
      const hora        = s.slot_hora.slice(0, 5)
      const diaLabel    = DIA_LABELS[s.slot_dia_semana] || s.slot_dia_semana
      const vagas       = s.vagas_disponiveis
      const vagasLabel  = vagas === 1 ? '1 vaga' : `${vagas} vagas`
      return `
        <label class="form__radio-card form__radio-card--wide">
          <input type="radio" name="slot_id" value="${s.slot_id}"
            data-dia="${s.slot_dia_semana}" data-hora="${hora}"
            data-data="${dataProxima || ''}" data-modalidade="${s.slot_modalidade}" />
          <span>
            <strong>${diaLabel} às ${hora}</strong>
            <small>${vagasLabel} disponível${vagas > 1 ? 'is' : ''}</small>
          </span>
        </label>`
    }).join('')
  } catch {
    container.innerHTML = '<p class="form__note">Erro ao carregar horários. Tente pelo WhatsApp.</p>'
  }
}

function initFormAgendamento(form) {
  const formFields = document.getElementById('formFields')
  const formSuccess= document.getElementById('formSuccess')
  const btnSubmit  = document.getElementById('btnSubmit')
  const btnText    = document.getElementById('btnText')
  const btnLoading = document.getElementById('btnLoading')

  // Carrega slots ao selecionar modalidade
  document.querySelectorAll('input[name="modalidade"]').forEach(radio => {
    radio.addEventListener('change', () => carregarSlots(radio.value))
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    const modalidade  = form.querySelector('input[name="modalidade"]:checked')?.value
    const slotInput   = form.querySelector('input[name="slot_id"]:checked')
    const nome        = form.nome?.value.trim()
    const telefone    = form.telefone?.value.trim()
    const nascimento  = form.nascimento?.value

    if (!modalidade)    { alert('Selecione a modalidade de interesse.'); return }
    if (!slotInput)     { alert('Selecione um horário disponível.'); return }
    if (!nome)          { alert('Informe seu nome completo.'); return }
    if (!telefone)      { alert('Informe seu WhatsApp.'); return }
    if (!nascimento)    { alert('Informe sua data de nascimento.'); return }

    const slotId       = parseInt(slotInput.value)
    const dataAgendada = slotInput.dataset.data
    const horaAgendada = slotInput.dataset.hora

    if (!dataAgendada) { alert('Erro ao calcular a data. Tente novamente.'); return }

    if (btnText)    btnText.style.display    = 'none'
    if (btnLoading) btnLoading.style.display = 'inline'
    if (btnSubmit)  btnSubmit.disabled       = true

    try {
      const resp = await fetch(`${API_URL}/agendamento-experimental/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot:                slotId,
          age_nome:            nome,
          age_telefone:        telefone,
          age_nascimento:      nascimento,
          age_modalidade:      modalidade,
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
        const msg = Object.values(err).flat().join(' ') || 'Erro ao enviar.'
        throw new Error(msg)
      }
    } catch (err) {
      const wppMsg = encodeURIComponent(
        `Olá! Gostaria de agendar uma aula experimental.\n\n` +
        `*Nome:* ${nome}\n` +
        `*Modalidade:* ${modalidade}\n` +
        `*Tel:* ${telefone}`
      )
      alert(`Não foi possível agendar agora (${err.message || 'erro'}). Você será redirecionado para o WhatsApp.`)
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
