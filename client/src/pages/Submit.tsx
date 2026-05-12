import { Resource } from '../types'
import SubmitForm from '../components/SubmitForm'

export default function Submit() {
  function handleSuccess(_resource: Resource) {
    // Success feedback is shown inline in the form
  }

  return (
    <div
      className="min-h-screen pt-24 pb-16 px-6"
      style={{
        background:
          'radial-gradient(ellipse at 15% 60%, rgba(255,107,53,0.07) 0%, transparent 55%), radial-gradient(ellipse at 85% 40%, rgba(123,47,247,0.07) 0%, transparent 55%), #0a0f1e',
      }}
    >
      <div className="max-w-lg mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-white">Submit a Resource</h1>
        <p className="text-white/45 text-sm mb-8">Share something useful with the class.</p>
        <div
          className="rounded-2xl p-8 border border-white/10"
          style={{ background: 'rgba(13, 27, 42, 0.92)' }}
        >
          <SubmitForm onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  )
}
