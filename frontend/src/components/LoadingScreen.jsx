// frontend/src/components/LoadingScreen.jsx
import logo from '../assets/logo.png'

export default function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="h-screen w-screen bg-dark flex flex-col items-center justify-center gap-8">
      <div className="relative">
        <img
          src={logo}
          alt="MESSA"
          className="w-20 h-20 object-contain"
          style={{ animation: 'pulseDot 2s ease-in-out infinite' }}
        />
        <div
          className="absolute inset-0 rounded-full border-2 border-messa-red/30"
          style={{ animation: 'ringPulse 1.5s ease-out infinite' }}
        />
      </div>

      <div className="flex flex-col items-center gap-3">
        <h1 className="text-2xl font-black text-white tracking-tight">
          MESSA <span className="text-messa-red">TEAMS</span>
        </h1>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 bg-messa-red rounded-full"
              style={{
                animation: `bounceDot 1.4s ease-in-out infinite`,
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
        <p className="text-xs text-text-muted uppercase tracking-widest mt-2">
          {message}
        </p>
      </div>
    </div>
  )
}