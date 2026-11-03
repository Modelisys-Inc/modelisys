import Link from "next/link"
import { RAPPORT_PATH } from "@/lib/rapport-gestion-content"

const PAGES = [
  {
    src: "/images/rapport/sommaire-suite.png",
    className: "right-[-2%] top-[2%] w-[62%] -rotate-[7deg]",
  },
  {
    src: "/images/rapport/encaisse.png",
    className: "left-[-4%] top-[34%] w-[64%] rotate-[3deg]",
  },
  {
    src: "/images/rapport/valeur-entreprise.png",
    className: "right-[-12%] top-[20%] w-[68%] rotate-[11deg]",
  },
] as const

export function RapportArtifact() {
  return (
    <Link
      href={RAPPORT_PATH}
      aria-label="Voir le diagnostic financier : sommaire exécutif, encaisse et flux de trésorerie, analyse de la valeur d'entreprise"
      className="group relative block h-[24rem] w-full sm:h-[28rem] lg:h-[32rem]"
    >
      {PAGES.map((page) => (
        <img
          key={page.src}
          src={page.src}
          alt=""
          className={`absolute origin-center rounded-[2px] bg-white shadow-[0_28px_50px_-24px_rgba(0,0,0,0.65)] ring-1 ring-black/10 transition duration-300 group-hover:-translate-y-1 ${page.className}`}
        />
      ))}
    </Link>
  )
}
