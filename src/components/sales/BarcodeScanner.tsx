import { useEffect, useId, useRef, useState } from "react"
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
} from "html5-qrcode"
import { useI18n } from "../../i18n/I18nContext"

type Props = {
  onDetected: (barcode: string) => void
}

export default function BarcodeScanner({ onDetected }: Props) {
  const { language } = useI18n()
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isStoppingRef = useRef(false)
  const regionId = `barcode-scanner-region-${useId().replace(/:/g, "")}`

  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState("")
  const [lastDetected, setLastDetected] = useState("")

  const text = language === "fr"
    ? {
        noCamera: "Aucune caméra trouvée",
        scannerStartError: "Impossible de démarrer le scanner",
        start: "Démarrer le scanner",
        stop: "Arrêter le scanner",
        lastDetected: "Dernier détecté",
      }
    : {
        noCamera: "No camera found",
        scannerStartError: "Unable to start the scanner",
        start: "Start scanner",
        stop: "Stop scanner",
        lastDetected: "Last detected",
      }

  useEffect(() => {
    return () => {
      void stopScanner()
    }
  }, [])

  async function startScanner() {
    try {
      setError("")
      setLastDetected("")

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(regionId, {
          verbose: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
          ],
          useBarCodeDetectorIfSupported: true,
        })
      }

      const devices = await Html5Qrcode.getCameras()
      if (!devices || devices.length === 0) {
        throw new Error(text.noCamera)
      }

      const cameraId = devices[0].id

      await scannerRef.current.start(
        cameraId,
        {
          fps: 8,
          qrbox: { width: 320, height: 140 },
          aspectRatio: 1.7778,
          disableFlip: false,
        },
        async (decodedText) => {
          if (isStoppingRef.current) return

          setLastDetected(decodedText)
          onDetected(decodedText)
          await stopScanner()
        },
        () => {
          // ignore frame-by-frame failures
        },
      )

      setIsRunning(true)
    } catch (err) {
      console.error("Scanner start error:", err)

      if (typeof err === "string") {
        setError(err)
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(text.scannerStartError)
      }

      setIsRunning(false)
    }
  }

  async function stopScanner() {
    try {
      if (!scannerRef.current) return
      if (!scannerRef.current.isScanning) {
        setIsRunning(false)
        return
      }

      isStoppingRef.current = true
      await scannerRef.current.stop()
      await scannerRef.current.clear()
    } catch (err) {
      console.error(err)
    } finally {
      isStoppingRef.current = false
      setIsRunning(false)
    }
  }

  return (
    <div className="barcode-scanner-card">
      {error && <div className="card error">{error}</div>}

      <div className="scanner-actions">
        {!isRunning ? (
          <button type="button" onClick={startScanner}>
            {text.start}
          </button>
        ) : (
          <button type="button" className="secondary-button" onClick={stopScanner}>
            {text.stop}
          </button>
        )}
      </div>

      {lastDetected && (
        <div className="scanner-last-detected">
          {text.lastDetected}: <strong>{lastDetected}</strong>
        </div>
      )}

      <div id={regionId} className="scanner-region" />
    </div>
  )
}
