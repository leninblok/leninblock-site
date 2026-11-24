type Props = { className?: string; flip?: boolean };

export function Pigeon({ className = "", flip = false }: Props) {
  return (
    <svg className={className} viewBox="0 0 150 150" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={flip ? "pigeon-b" : "pigeon-a"} x1=".15" y1="0" x2=".85" y2="1">
          <stop stopColor="#20c8ed" /><stop offset=".32" stopColor="#b83d94" /><stop offset=".7" stopColor="#1655a0" /><stop offset="1" stopColor="#10aee3" />
        </linearGradient>
      </defs>
      <g transform={flip ? "translate(150 0) scale(-1 1)" : undefined}>
        <path d="M25 20 Q36 4 50 11 L61 37 L98 50 L111 78 L133 102 Q98 112 57 101 L22 91 Q17 72 25 54 L30 39Z" fill={flip ? "url(#pigeon-b)" : "url(#pigeon-a)"} />
        <path d="M45 23v6 M57 27v6 M49 39l8 -3" stroke="#101014" strokeWidth="5" strokeLinecap="round" />
        <path d="M48 100l-2 24m23-21 2 23M46 123l-11 8m11-8 2 12m-2-12 11 8m14-6-8 10m8-10 3 11m-3-11 12 7" fill="none" stroke="#e41579" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
