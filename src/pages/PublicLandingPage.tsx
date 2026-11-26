import { useEffect, useRef, useState } from "react"
import { getPublicPlans, type PublicPlanResponse } from "../api/publicPlansApi"
import { getPublicPromotions, type PublicPromotionResponse } from "../api/publicPromotionsApi"
import logo from "../assets/cameleyon-dynamics-logo.png"
import dashboard from "../assets/homepage-dashboard.png"
import inventory from "../assets/landing-inventory.png"
import sale from "../assets/landing-new-sale.png"
import LanguageSwitcher from "../components/common/LanguageSwitcher"
import SupportContact from "../components/common/SupportContact"
import { useI18n } from "../i18n/I18nContext"
import { homepageCopy } from "../i18n/homepageCopy"
import { publicTerms } from "../i18n/publicTerms"
import "./publicHomepage.css"

type Props = { onGoToSignup: () => void; onGoToLogin: () => void }
const versionNames = ["Basic", "Standard", "Premium"]
const support = "mailto:contact@cameleyondynamics.com"
const icons = ["▤", "▦", "✓", "≡", "≋", "↗"]

function Screenshot({ src, copy, width, height, hero = false }: {
  src: string; copy: readonly [string, string]; width: number; height: number; hero?: boolean
}) {
  return (
    <figure>
      <img src={src} alt={copy[1]} width={width} height={height} loading={hero ? "eager" : "lazy"} decoding="async"
        fetchPriority={hero ? "high" : undefined} />
      <figcaption>{copy[0]}</figcaption>
    </figure>
  )
}

export default function PublicLandingPage({ onGoToSignup, onGoToLogin }: Props) {
  const { language } = useI18n()
  const text = homepageCopy[language]
  const terms = publicTerms[language]
  const termsDialog = useRef<HTMLDialogElement>(null)
  const [basic, setBasic] = useState<PublicPlanResponse>()
  const [promotions, setPromotions] = useState<PublicPromotionResponse[]>([])

  useEffect(() => {
    let mounted = true
    // Catalog requests are independent and optional; neither blocks registration.
    void getPublicPlans().then(rows => {
      if (mounted && Array.isArray(rows)) setBasic(rows.find(plan => plan.code.toUpperCase() === "BASIC"))
    }).catch(() => {})
    void getPublicPromotions().then(rows => {
      if (mounted && Array.isArray(rows)) setPromotions(rows)
    }).catch(() => {})
    return () => { mounted = false }
  }, [])

  function goTo(callback: () => void) {
    window.scrollTo(0, 0)
    callback()
  }

  const trialButton = (className = "") => (
    <button className={`home-cta ${className}`.trim()} type="button" onClick={() => goTo(onGoToSignup)}>{text.signup}</button>
  )
  // The normal trial already appears in the hero and on Basic.
  const additionalOffers = promotions.filter(promo =>
    promo.freeTrialDays !== 90 || promo.promoPriceMonthly != null || promo.promoPriceYearly != null
  )

  return (
    <div className="erp-home">
      <header>
        <div className="home-wrap home-bar">
          <a className="home-brand" href={`/${language}`}><img src={logo} width="36" height="36" alt="" />CAMELEYON-ERP</a>
          <nav aria-label={text.navigation}>
            <a href="#features">{text.features}</a>
            <a href="#plans">{text.plans}</a>
            <LanguageSwitcher className="home-languages" linkToHomepage />
            <button className="home-link" type="button" onClick={() => goTo(onGoToLogin)}>{text.login}</button>
            {trialButton("home-header-cta")}
          </nav>
        </div>
      </header>
      <main>
        <section className="home-hero" aria-labelledby="homepage-title">
          <div className="home-wrap home-columns">
            <div>
              <h1 id="homepage-title">{text.headline}</h1>
              <p className="home-lead">{text.lead}</p>
              <div className="home-actions">
                {trialButton()}
                <a className="home-secondary" href="#features">{text.explore}</a>
              </div>
              <p className="home-offer">{text.trial}</p>
            </div>
            <Screenshot src={dashboard} copy={text.dashboard} width={1600} height={737} hero />
          </div>
        </section>
        {additionalOffers.length > 0 && (
          <section className="home-band" aria-labelledby="homepage-offers">
            <div className="home-wrap home-promos">
              <h2 id="homepage-offers">{text.offers}</h2>
              {additionalOffers.map(promo => {
                const name = language === "fr" ? promo.nameFr : language === "en" ? promo.nameEn : null
                const description = language === "fr" ? promo.descriptionFr : language === "en" ? promo.descriptionEn : null
                const offer = promo.freeTrialDays ? text.offerDays(promo.freeTrialDays) : null
                const hasPrice = promo.promoPriceMonthly != null || promo.promoPriceYearly != null
                return (
                  <article key={promo.id}>
                    <h3>{name || offer || (language === "en" ? promo.name : text.offers)}</h3>
                    {description && <p>{description}</p>}
                    {name && offer && <p>{offer}</p>}
                    {hasPrice && <p><a href={support}>{text.pricing}</a></p>}
                  </article>
                )
              })}
              {trialButton()}
            </div>
          </section>
        )}
        <section className="home-wrap home-section" id="features" aria-labelledby="homepage-features">
          <h2 id="homepage-features">{text.benefits}</h2>
          <div className="home-grid home-features">
            {text.featureItems.map(([title, description], index) => (
              <article className="home-tile" key={title}>
                <span aria-hidden="true" className="home-icon">{icons[index]}</span>
                <h3>{title}</h3><p>{description}</p>
              </article>
            ))}
          </div>
          <div className="home-columns home-proof">
            <Screenshot src={inventory} copy={text.inventory} width={780} height={256} />
            <Screenshot src={sale} copy={text.sale} width={780} height={292} />
          </div>
        </section>
        <section className="home-band" aria-labelledby="homepage-journey">
          <div className="home-wrap home-section">
            <h2 id="homepage-journey">{text.journey}</h2>
            <ol className="home-grid home-steps" role="list">
              {text.steps.map(([title, description], index) => (
                <li key={title}><span aria-hidden="true" className="home-step-number">{index + 1}</span><h3>{title}</h3><p>{description}</p></li>
              ))}
            </ol>
          </div>
        </section>
        <section className="home-wrap home-section" id="plans" aria-labelledby="homepage-plans">
          <h2 id="homepage-plans">{text.planTitle}</h2>
          <div className="home-grid home-plans">
            {text.versions.map((version, index) => (
              <article className={`home-plan ${index === 0 ? "home-basic" : ""}`.trim()} key={versionNames[index]}>
                <span className="home-status">{index === 0 ? text.available : text.planned}</span>
                <h3>{versionNames[index]}</h3>
                <p><strong>{version.tagline}</strong></p>
                <p>{version.description}</p>
                <ul>{version.features.map(feature => <li key={feature}>{feature}</li>)}</ul>
                {index === 2 && <p className="home-assistant"><strong>{text.assistant[0]}</strong><br />{text.assistant[1]}</p>}
                {index === 0 && (
                  <div className="home-plan-action">
                    <p className="home-offer">{text.trial}</p>
                    {basic && (basic.monthlyPrice != null || basic.yearlyPrice != null) && <p><a href={support}>{text.pricing}</a></p>}
                    {trialButton()}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
        <section className="home-band" aria-labelledby="homepage-faq">
          <div className="home-wrap home-section home-columns home-questions">
            <div><h2 id="homepage-faq">{text.questions}</h2><p><a href={support}>{text.support}</a></p></div>
            <div>
              {text.faq.map(([question, answer], index) => (
                <details key={question} open={index === 0 || undefined}>
                  <summary>{question}</summary>
                  <p>{answer}{index === text.faq.length - 1 && <> <a href={support}>contact@cameleyondynamics.com</a></>}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
        <section className="home-final" aria-labelledby="homepage-final">
          <div className="home-wrap home-section"><h2 id="homepage-final">{text.final}</h2>{trialButton()}</div>
        </section>
      </main>
      <footer className="home-band">
        <div className="home-wrap home-section">
          <div className="home-footer">
            <div>
              <a className="home-brand" href={`/${language}`}><img src={logo} width="36" height="36" alt="" />CAMELEYON-ERP</a>
              <p>{text.powered}</p>
              <a href="https://www.cameleyondynamics.com/">www.cameleyondynamics.com</a>
            </div>
            <SupportContact />
          </div>
          <div className="home-legal">
            <p>© 2024 CAMELEYON-ERP. {text.rights}</p>
            <nav aria-label={text.navigation}>
              <a href={`/${language}/privacy`}>{text.privacy}</a>
              <button className="home-link" type="button" onClick={() => termsDialog.current?.showModal()}>{text.terms}</button>
              <LanguageSwitcher className="home-languages" linkToHomepage />
            </nav>
          </div>
        </div>
      </footer>
      <dialog ref={termsDialog} className="home-terms" aria-labelledby="homepage-terms">
        <h2 id="homepage-terms">{terms.title}</h2>
        <div className="terms-dialog-body">{terms.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
        <form method="dialog"><button type="submit" className="home-cta">{terms.close}</button></form>
      </dialog>
    </div>
  )
}
