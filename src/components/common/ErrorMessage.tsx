type Props = {
  message: string
}

export default function ErrorMessage({ message }: Props) {
  return <div className="card error">{message}</div>
}