import { applyTranslations, t } from './i18n'
import { LIMITS, PRONOUNS, TONES, parseInput, type CalaveritaInput, type Field, type FieldErrors } from './input'

const FIELDS: readonly Field[] = ['name', 'pronouns', 'occupation', 'traits', 'tone']

function choices(name: Field, options: readonly string[], checked?: string): string {
  return options
    .map(
      (value) => `
        <label class="choice">
          <input type="radio" name="${name}" value="${value}"${value === checked ? ' checked' : ''} />
          <span data-i18n="form.${name}.${value}"></span>
        </label>`,
    )
    .join('')
}

function showErrors(form: HTMLFormElement, errors: FieldErrors): void {
  for (const field of FIELDS) {
    const error = form.querySelector<HTMLElement>(`#${field}-error`)
    if (!error) continue
    const key = errors[field]

    form.querySelectorAll(`[name="${field}"]`).forEach((control) => {
      if (key) control.setAttribute('aria-invalid', 'true')
      else control.removeAttribute('aria-invalid')
    })

    if (key) {
      error.dataset.i18n = key
      error.textContent = t(key)
      error.hidden = false
    } else {
      delete error.dataset.i18n
      error.textContent = ''
      error.hidden = true
    }
  }
}

function readForm(form: HTMLFormElement) {
  return parseInput(Object.fromEntries(new FormData(form)))
}

export function renderForm(container: HTMLElement, onSubmit: (input: CalaveritaInput) => void): HTMLFormElement {
  const form = document.createElement('form')
  form.className = 'calaverita-form'
  form.noValidate = true
  form.innerHTML = `
    <div class="field">
      <label for="name" data-i18n="form.name.label"></label>
      <input id="name" name="name" type="text" maxlength="${LIMITS.name}" autocomplete="off"
        required aria-describedby="name-error" />
      <p class="field__error" id="name-error" hidden></p>
    </div>

    <fieldset class="field" aria-describedby="pronouns-error">
      <legend data-i18n="form.pronouns.legend"></legend>
      <div class="choices">${choices('pronouns', PRONOUNS)}</div>
      <p class="field__error" id="pronouns-error" hidden></p>
    </fieldset>

    <div class="field">
      <label for="occupation">
        <span data-i18n="form.occupation.label"></span>
        <span class="field__optional" data-i18n="form.optional"></span>
      </label>
      <p class="field__hint" id="occupation-hint" data-i18n="form.commaHint"></p>
      <input id="occupation" name="occupation" type="text" maxlength="${LIMITS.occupation}" autocomplete="off"
        data-i18n-attr="placeholder:form.occupation.placeholder" aria-describedby="occupation-hint occupation-error" />
      <p class="field__error" id="occupation-error" hidden></p>
    </div>

    <div class="field">
      <label for="traits">
        <span data-i18n="form.traits.label"></span>
        <span class="field__optional" data-i18n="form.optional"></span>
      </label>
      <p class="field__hint" id="traits-hint" data-i18n="form.commaHint"></p>
      <textarea id="traits" name="traits" rows="3" maxlength="${LIMITS.traits}"
        data-i18n-attr="placeholder:form.traits.placeholder" aria-describedby="traits-hint traits-count traits-error"></textarea>
      <p class="field__count" id="traits-count"></p>
      <p class="field__error" id="traits-error" hidden></p>
    </div>

    <fieldset class="field">
      <legend data-i18n="form.tone.legend"></legend>
      <div class="choices">${choices('tone', TONES, 'gentle')}</div>
    </fieldset>

    <button type="submit" class="submit" data-i18n="form.submit"></button>`

  const traits = form.querySelector<HTMLTextAreaElement>('#traits')!
  const count = form.querySelector<HTMLElement>('#traits-count')!
  const updateCount = () => {
    count.textContent = `${traits.value.length} / ${LIMITS.traits}`
  }
  traits.addEventListener('input', updateCount)
  updateCount()

  let attempted = false
  const revalidate = () => {
    if (!attempted) return
    const result = readForm(form)
    showErrors(form, result.ok ? {} : result.errors)
  }
  form.addEventListener('input', revalidate)
  form.addEventListener('change', revalidate)

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    attempted = true
    const result = readForm(form)
    if (!result.ok) {
      showErrors(form, result.errors)
      const first = FIELDS.find((field) => result.errors[field])
      form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    showErrors(form, {})
    onSubmit(result.input)
  })

  applyTranslations(form)
  container.append(form)
  return form
}
