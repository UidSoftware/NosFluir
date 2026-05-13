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

function initFormAgendamento(form) {
  const formFields = document.getElementById('formFields')
  const formSuccess= document.getElementById('formSuccess')
  const btnSubmit  = document.getElementById('btnSubmit')
  const btnText    = document.getElementById('btnText')
  const btnLoading = document.getElementById('btnLoading')

  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    const modalidade    = form.querySelector('input[name="modalidade"]:checked')?.value
    const nome          = form.nome?.value.trim()
    const telefone      = form.telefone?.value.trim()
    const nascimento    = form.nascimento?.value
    const dataAgendada  = form.data_agendada?.value
    const horaAgendada  = form.hora_agendada?.value

    if (!modalidade)   { alert('Selecione a modalidade de interesse.'); return }
    if (!nome)         { alert('Informe seu nome completo.'); return }
    if (!telefone)     { alert('Informe seu WhatsApp.'); return }
    if (!nascimento)   { alert('Informe sua data de nascimento.'); return }
    if (!dataAgendada) { alert('Informe a data preferida.'); return }
    if (!horaAgendada) { alert('Informe o horário preferido.'); return }

    if (btnText)    btnText.style.display    = 'none'
    if (btnLoading) btnLoading.style.display = 'inline'
    if (btnSubmit)  btnSubmit.disabled       = true

    try {
      const resp = await fetch(`${API_URL}/agendamento-experimental/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        throw new Error(Object.values(err).flat().join(' ') || 'Erro ao enviar.')
      }
    } catch (err) {
      const wppMsg = encodeURIComponent(
        `Olá! Gostaria de agendar uma aula experimental.\n\n` +
        `*Nome:* ${nome}\n*Modalidade:* ${modalidade}\n*Tel:* ${telefone}`
      )
      alert(`Não foi possível agendar agora. Você será redirecionado para o WhatsApp.`)
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
