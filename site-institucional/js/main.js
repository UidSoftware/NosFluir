'use strict'

// ── Ano no footer ─────────────────────────────────────────────────────────
document.getElementById('anoFooter').textContent = new Date().getFullYear()

// ── Header scroll ─────────────────────────────────────────────────────────
const header = document.getElementById('header')
window.addEventListener('scroll', () => {
  header.classList.toggle('scrolled', window.scrollY > 40)
}, { passive: true })

// ── Hamburger menu ────────────────────────────────────────────────────────
const hamburger = document.getElementById('hamburger')
const nav       = document.getElementById('nav')

hamburger.addEventListener('click', () => {
  hamburger.classList.toggle('active')
  nav.classList.toggle('open')
})

// Fecha menu ao clicar em link
nav.querySelectorAll('.nav__link').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('active')
    nav.classList.remove('open')
  })
})

// ── Scroll suave + nav link ativo ─────────────────────────────────────────
const sections  = document.querySelectorAll('section[id]')
const navLinks  = document.querySelectorAll('.nav__link[href^="#"]')

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

// ── Animate on scroll ─────────────────────────────────────────────────────
const animElems = document.querySelectorAll(
  '.servico__card, .diferencial, .depoimento, .contato__bloco, .equipe__item'
)

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

// ── Formulário de agendamento ─────────────────────────────────────────────
const form       = document.getElementById('formAgendamento')
const formFields = document.getElementById('formFields')
const formSuccess= document.getElementById('formSuccess')
const btnSubmit  = document.getElementById('btnSubmit')
const btnText    = document.getElementById('btnText')
const btnLoading = document.getElementById('btnLoading')

const API_URL = 'https://nostudiofluir.com.br/api'

form.addEventListener('submit', async (e) => {
  e.preventDefault()

  const data = {
    nome:     form.nome.value.trim(),
    email:    form.email.value.trim(),
    telefone: form.telefone.value.trim(),
    servico:  form.servico.value,
    horario:  form.horario.value,
    mensagem: form.mensagem.value.trim(),
  }

  if (!data.nome || !data.email || !data.telefone || !data.servico) {
    alert('Preencha todos os campos obrigatórios.')
    return
  }

  // Loading
  btnText.style.display    = 'none'
  btnLoading.style.display = 'inline'
  btnSubmit.disabled       = true

  try {
    // Envia para endpoint do agendamento de horário
    const resp = await fetch(`${API_URL}/operacional/agendamentos-horario/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agh_nome:     data.nome,
        agh_email:    data.email,
        agh_telefone: data.telefone,
        agh_horario:  `${data.servico} — ${data.horario || 'A combinar'}`,
        agh_mensagem: data.mensagem || null,
      }),
    })

    if (resp.ok || resp.status === 201) {
      formFields.style.display  = 'none'
      formSuccess.style.display = 'block'
    } else {
      throw new Error('Erro ao enviar')
    }
  } catch {
    // Fallback: abre WhatsApp com a mensagem
    const msg = encodeURIComponent(
      `Olá! Gostaria de agendar uma aula experimental.\n\n` +
      `*Nome:* ${data.nome}\n` +
      `*Modalidade:* ${data.servico}\n` +
      `*Horário:* ${data.horario || 'A combinar'}\n` +
      `*Tel:* ${data.telefone}` +
      (data.mensagem ? `\n\n${data.mensagem}` : '')
    )
    window.open(`https://wa.me/5534998218204?text=${msg}`, '_blank')

    // Mostra sucesso mesmo assim
    formFields.style.display  = 'none'
    formSuccess.style.display = 'block'
  } finally {
    btnText.style.display    = 'inline'
    btnLoading.style.display = 'none'
    btnSubmit.disabled       = false
  }
})

// ── Máscara telefone ──────────────────────────────────────────────────────
document.getElementById('telefone').addEventListener('input', function () {
  let v = this.value.replace(/\D/g, '').slice(0, 11)
  if (v.length >= 11)
    v = v.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  else if (v.length >= 7)
    v = v.replace(/(\d{2})(\d{4,5})(\d{0,4})/, '($1) $2-$3')
  else if (v.length >= 3)
    v = v.replace(/(\d{2})(\d+)/, '($1) $2')
  this.value = v
})
