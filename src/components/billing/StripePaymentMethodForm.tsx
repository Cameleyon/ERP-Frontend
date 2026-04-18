import { useState } from "react"
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { useI18n } from "../../i18n/I18nContext"

type Props = {
  clientSecret: string
  onSuccess: () => Promise<void> | void
}

export default function StripePaymentMethodForm({ clientSecret, onSuccess }: Props) {
  const { language } = useI18n()
  const stripe = useStripe()
  const elements = useElements()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const text = language === "fr"
    ? {
        stripeNotReady: "Stripe n'est pas encore prêt",
        cardUnavailable: "Le champ de carte n'est pas disponible",
        saveError: "Échec de l'enregistrement de la méthode de paiement",
        saveSuccess: "La méthode de paiement a été enregistrée avec succès",
        saving: "Enregistrement...",
        save: "Enregistrer la carte",
      }
    : {
        stripeNotReady: "Stripe is not ready yet",
        cardUnavailable: "The card field is not available",
        saveError: "Failed to save the payment method",
        saveSuccess: "Payment method saved successfully",
        saving: "Saving...",
        save: "Save card",
      }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!stripe || !elements) {
      setError(text.stripeNotReady)
      return
    }

    const cardElement = elements.getElement(CardElement)

    if (!cardElement) {
      setError(text.cardUnavailable)
      return
    }

    try {
      setSaving(true)
      setError("")
      setSuccess("")

      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      })

      if (result.error) {
        setError(result.error.message || text.saveError)
        return
      }

      setSuccess(text.saveSuccess)
      await onSuccess()
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : text.saveError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="card error">{error}</div>}
      {success && <div className="card success">{success}</div>}

      <div className="card nested-card">
        <CardElement options={{ hidePostalCode: true }} />
      </div>

      <div className="form-actions">
        <button type="submit" disabled={saving || !stripe || !elements}>
          {saving ? text.saving : text.save}
        </button>
      </div>
    </form>
  )
}
