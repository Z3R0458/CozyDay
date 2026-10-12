import cinnamorollImage from '../../assets/cinnamoroll.png'

export default function CloudPuppy({ className = '' }) {
  return (
    <div
      className={`relative mx-auto grid aspect-square w-28 place-items-center overflow-visible ${className}`}
      aria-label="Cinnamoroll character illustration"
      role="img"
    >
      <div className="absolute inset-5 rounded-full bg-white/80 shadow-cozy" />
      <img
        src={cinnamorollImage}
        alt=""
        className="relative z-10 h-full w-full object-contain drop-shadow-[0_18px_24px_rgba(23,52,92,0.18)]"
        draggable="false"
      />
    </div>
  )
}
