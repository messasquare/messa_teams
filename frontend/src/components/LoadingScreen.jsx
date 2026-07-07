// frontend/src/components/LoadingScreen.jsx
import logo from '../assets/logo.png'

export default function LoadingScreen() {
  return (
    <div className="h-screen w-screen bg-dark flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <img src={logo} alt="MESSA" className="w-16 h-16 object-contain animate-pulse" />
        <div className="absolute inset-0 rounded-full bg-messa-red/20 animate-ping" />
      </div>
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-2xl font-bold text-white tracking-tight">MESSA TEAMS</h1>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 bg-messa-red rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}